const Folder = require('../../../models/Folder');
const Document = require('../../../models/Document');
const { logActivity } = require('../../../services/activityService');
const { sendNotification } = require('../../../services/notificationService');
const { createBucket, uploadFile } = require('../../../services/storageService');

// Helper - Matches logic in folderService.js
const getCurrentFinancialYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11
    // If before April, we are in (Year-1)-Year. If after April, Year-(Year+1)
    let startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    return `FY - ${startYear}-${(startYear + 1).toString().slice(-2)}`;
};

// @desc    Get Folder Contents
// @route   POST /api/ca_connect/drive/folder
// @access  Private (Authenticated Client)
exports.getFolderContents = async (req, res) => {
    try {
        const { folderId, category, financialYear } = req.body;
        const clientId = req.client.id; // From authMiddleware

        console.log(`[DriveController] getFolderContents - Client: ${clientId}, Category: ${category || 'None'}, Requested FY: ${financialYear || 'Current'}`);

        if (!clientId) {
            console.error(`[DriveController] Unauthorized - No clientId found in request`);
            return res.status(401).json({ error: 'Unauthorized: No client ID found' });
        }

        // 1. Fetch available FY folders for this client to return to app
        const allYears = await Folder.find({
            clientId,
            parentFolderId: null,
            name: { $regex: /^FY - / },
            isDeleted: { $ne: true }
        }).select('name').lean();

        const availableYears = allYears.map(y => y.name);

        // 2. Determine target FY (Requested OR Current)
        const targetFYName = financialYear || getCurrentFinancialYear();

        let queryFolderId = folderId;

        // 3. Resolve Folder Logic
        if (!queryFolderId) {
            // Find the Root Year Folder (or the requested Year folder)
            const yearFolder = await Folder.findOne({
                clientId,
                name: targetFYName,
                parentFolderId: null,
                isDeleted: { $ne: true }
            });

            if (!yearFolder) {
                console.warn(`[DriveController] No Year Folder found for: ${targetFYName}`);
                return res.json({ folders: [], files: [], availableYears, currentFY: targetFYName });
            }

            if (category) {
                // Find Category Folder INSIDE the Year Folder
                console.log(`[DriveController] Resolving Category ${category} in Year ${targetFYName}`);
                const catFolder = await Folder.findOne({
                    clientId,
                    category: category,
                    parentFolderId: yearFolder._id,
                    isDeleted: { $ne: true }
                });

                if (catFolder) {
                    queryFolderId = catFolder._id;
                } else {
                    console.warn(`[DriveController] No ${category} folder found inside ${targetFYName}`);
                    return res.json({ folders: [], files: [], availableYears, currentFY: targetFYName });
                }
            } else {
                // If no folderId and no category, but a year is specified/defaulted
                // We show the content of that Year folder (Categories)
                queryFolderId = yearFolder._id;
            }
        }

        const [folders, files] = await Promise.all([
            Folder.find({
                clientId,
                parentFolderId: queryFolderId,
                isDeleted: { $ne: true }
            }).select('name _id createdAt').lean(),
            Document.find({
                clientId,
                folderId: queryFolderId,
                isDeleted: { $ne: true }
            }).select('fileName fileUrl fileType fileSize createdAt cloudinaryId category').lean()
        ]);

        console.log(`[DriveController] Data Found - Folders: ${folders.length}, Files: ${files.length}`);

        // Construct Full URLs
        const clientDoc = await require('../../../models/Client').findById(clientId).select('caId');
        let processedFiles = files;
        if (clientDoc && clientDoc.caId) {
            const bucketName = `ca-${clientDoc.caId}`;
            processedFiles = files.map(file => {
                if (file.fileUrl && !file.fileUrl.startsWith('http')) {
                    file.fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${file.fileUrl}`;
                }
                return file;
            });
        }

        res.json({
            folders,
            files: processedFiles,
            availableYears,
            currentFY: targetFYName
        });

    } catch (err) {
        console.error("[DriveController] Drive Fetch Error:", err);
        res.status(500).json({ error: 'Failed to fetch folder contents' });
    }
};

// @desc    Upload File
// @route   POST /api/ca_connect/drive/upload
// @access  Private (Authenticated Client)
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            console.error("[DriveController] Upload attempted without file");
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { folderId, category, financialYear } = req.body;
        const clientId = req.client.id;
        console.log(`[DriveController] uploadFile - Client: ${clientId}, File: ${req.file.originalname}`);

        // Lookup Client and CA info
        const clientDoc = await require('../../../models/Client').findById(clientId).select('caId name');
        if (!clientDoc || !clientDoc.caId) {
            console.error(`[DriveController] Client ${clientId} not found or CA link missing`);
            return res.status(404).json({ error: 'Client not found or linked to CA' });
        }

        let targetFolderId = folderId;

        // Resolve folderId from category + FY if not provided
        if (!targetFolderId && category) {
            const targetFY = financialYear || getCurrentFinancialYear();
            console.log(`[DriveController] Resolving Upload Target - Category: ${category}, FY: ${targetFY}`);

            const yearFolder = await Folder.findOne({
                clientId,
                name: targetFY,
                parentFolderId: null
            });

            if (yearFolder) {
                const catFolder = await Folder.findOne({
                    clientId,
                    category: category,
                    parentFolderId: yearFolder._id
                });
                if (catFolder) {
                    targetFolderId = catFolder._id;
                }
            }
        }

        if (!targetFolderId) {
            console.warn(`[DriveController] Upload blocked - No valid target folder found`);
            return res.status(400).json({ error: 'Target folder or category in financial year not found' });
        }

        const caId = clientDoc.caId;
        const bucketName = `ca-${caId}`;

        // Ensure bucket exists
        await createBucket(bucketName);

        // Construct Path
        const safeCategory = (category || 'GENERAL').toLowerCase();
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = `client_${clientId}/${safeCategory}/${fileName}`;

        console.log(`[DriveController] Uploading to MinIO - Bucket: ${bucketName}, Path: ${filePath}`);

        // Upload to MinIO
        await uploadFile(bucketName, filePath, req.file.buffer, {
            'Content-Type': req.file.mimetype,
            'X-Amz-Meta-UploadedBy': 'CLIENT'
        });

        const fullUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${filePath}`;

        // Save Metadata
        const newDoc = await Document.create({
            clientId,
            folderId: targetFolderId,
            fileName: req.file.originalname,
            fileUrl: fullUrl,
            cloudinaryId: filePath,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: 'CUSTOMER',
            category: category || 'GENERAL'
        });

        console.log(`[DriveController] Metadata saved in MongoDB: ${newDoc._id}`);

        // Log Activity
        await logActivity({
            caId: clientDoc.caId,
            action: 'UPLOAD_FILE',
            details: `Client ${clientDoc.name} uploaded file: ${req.file.originalname}`,
            clientId,
            docId: newDoc._id
        });

        // Notify CA
        await sendNotification(
            'New Document Received',
            `Client ${clientDoc.name} has uploaded a new document: ${req.file.originalname}`,
            clientDoc.caId.toString(),
            {
                clientId: clientId,
                docId: newDoc._id,
                type: 'CLIENT_UPLOAD'
            }
        );

        res.status(201).json(newDoc);

    } catch (err) {
        console.error("[DriveController] Upload Error:", err);
        res.status(500).json({ error: 'Upload failed' });
    }
};

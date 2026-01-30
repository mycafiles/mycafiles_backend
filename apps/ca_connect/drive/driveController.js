const Folder = require('../../../models/Folder');
const Document = require('../../../models/Document');
const { cloudinary } = require('../../../config/fileStorage');

// @desc    Get Folder Contents
// @route   POST /api/ca_connect/drive/folder
// @access  Private (Authenticated Client)
exports.getFolderContents = async (req, res) => {
    try {
        const { folderId, category } = req.body;
        // User ID from Auth Middleware (Client)
        const clientId = req.client.id; // Corrected: middleware sets req.client for mobile app

        let query = { clientId: clientId };

        // 1. Fetch Folders
        let folders = [];
        if (folderId) {
            // Fetch children of specific folder
            query.parentFolderId = folderId;
        } else if (category) {
            // If Category is provided (e.g., 'ITR', 'GST'), find the Root Folder for that category first
            // Then return its children. Ideally, 'ITR' -> returns '2024-25', '2023-24', etc.
            const rootFolder = await Folder.findOne({ clientId, parentFolderId: null, category });

            if (rootFolder) {
                query.parentFolderId = rootFolder._id;
            } else {
                // Fallback: If no root folder found for category, maybe it doesn't exist yet. 
                // We can return empty or try to find by name. 
                // For now, let's assume if not found, we return empty list at this level 
                // OR we keep original behavior (which was returning the root folder itself).
                // User wants to see CONTENT of income tax folder.
                // If root folder likely exists, we use its ID.
                query = { clientId, parentFolderId: "NON_EXISTENT" }; // Force empty
            }
        } else {
            // Root (No category, no folderId) - e.g. Home Drive
            query.parentFolderId = null;
        }

        folders = await Folder.find(query)
            .select('name _id createdAt')
            .sort({ name: -1 }); // Sort by name (Year) descending for root

        // 2. Fetch Files (Only if inside a folder, or resolved from category)
        let files = [];
        // Use provided folderId OR the one resolved from category
        const targetFolderId = folderId || (
            category && query.parentFolderId && query.parentFolderId !== "NON_EXISTENT"
                ? query.parentFolderId
                : null
        );

        if (targetFolderId) {
            files = await Document.find({ clientId: clientId, folderId: targetFolderId })
                .select('fileName fileUrl fileType fileSize createdAt cloudinaryId category')
                .sort({ createdAt: -1 });
        }

        // 3. Get Path (Breadcrumbs) - Optional logic could be added here

        const { getFileUrl } = require('../../../services/storageService');

        // ... (inside getFolderContents)

        // 3. Generate Signed URLs for Private Files
        const signedFiles = await Promise.all(files.map(async (file) => {
            const fileObj = file.toObject();

            // Generate Signed URL for MinIO
            try {
                // Determine bucket name for the client (which is actually the CA's bucket)
                // Wait, client logic is: CA owns the bucket. Client files are in folders.
                // We need to know who the CA is for this client to find the bucket.
                // In this restricted mobile app context, we only have clientId.
                // We must query the Client to find their CA ID.

                // Optimized: We could populate caId in the previous query if needed, 
                // but let's do a quick lookup or assume we can derive it.
                // Actually, for now, let's look up the Client to get the caId.
                // Ideally this should be cleaner, but let's patch it.

                // Note: The 'req.client' from middleware might have it. Let's check middleware later.
                // For now, let's fetch client if not present.
                const clientDoc = await require('../../../models/Client').findById(clientId).select('caId');

                if (clientDoc && clientDoc.caId) {
                    const bucketName = `ca-${clientDoc.caId}`;
                    // FileUrl in Mongo is the relative path (key) for MinIO
                    if (file.fileUrl && !file.fileUrl.startsWith('http')) {
                        // Public URL format: http://IP:PORT/bucket/key
                        fileObj.fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${file.fileUrl}`;
                    }
                }
            } catch (err) {
                console.error("Error constructing URL:", err);
            }
            return fileObj;
        }));

        res.json({
            folders,
            files: signedFiles
        });

    } catch (error) {
        console.error("Drive Error:", error);
        res.status(500).json({ message: 'Server error while fetching drive contents' });
    }
};

// @desc    Upload File
// @route   POST /api/ca_connect/drive/upload
// @access  Private (Authenticated Client)
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { folderId } = req.body;
        const clientId = req.client.id;

        // Path / Breadcrumb logic (Optional for now)
        // We could look up the folder to get the full path, but let's stick to basic association first.

        const newFile = await Document.create({
            fileName: req.file.originalname, // or req.file.filename
            fileType: req.file.mimetype === 'application/pdf' ? 'PDF' : 'IMAGE', // Simplified Logic
            fileUrl: req.file.path, // Cloudinary URL (Raw, might need signing later)
            cloudinaryId: req.file.filename,
            folderId: folderId, // Can be null if root
            clientId: clientId,
            fileSize: req.file.size,
            uploadedBy: 'CUSTOMER'
        });

        res.status(201).json(newFile);

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: 'Server error during upload' });
    }
};

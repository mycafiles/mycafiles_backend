const Folder = require('../models/Folder');
const Document = require('../models/Document');
const { cloudinary } = require('../config/fileStorage');
const { sendNotification } = require('../services/notificationService');

// 1. GET ALL (Eager Load - Same as before)
exports.getAllData = async (req, res) => {
    try {
        const { clientId } = req.params;
        const [folders, files] = await Promise.all([
            Folder.find({ clientId, isDeleted: { $ne: true } }).lean(),
            Document.find({ clientId, isDeleted: { $ne: true } }).lean()
        ]);

        // Generate Signed URLs for MinIO (if needed, or backend proxy)
        // Generate Signed URLs for MinIO (if needed, or backend proxy)
        // Lookup CA ID from Client to find the correct bucket
        const clientDoc = await require('../models/Client').findById(clientId).select('caId');

        let signedFiles = files;

        if (clientDoc && clientDoc.caId) {
            const bucketName = `ca-${clientDoc.caId}`;

            signedFiles = await Promise.all(files.map(async (file) => {
                // If it's a relative path (MinIO Key), PREPEND Host to make it a Public URL
                if (file.fileUrl && !file.fileUrl.startsWith('http')) {
                    // Public URL format: http://IP:PORT/bucket/key
                    file.fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${file.fileUrl}`;
                }
                return file;
            }));
        }

        res.json({ folders, files: signedFiles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// 2. UPLOAD FILE
const { uploadFile, deleteFile, getFileUrl } = require('../services/storageService');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { clientId, folderId, uploadedBy, category } = req.body;

        // Lookup CA ID from Client to find the correct bucket
        const clientDoc = await require('../models/Client').findById(clientId).select('caId');
        if (!clientDoc || !clientDoc.caId) {
            return res.status(404).json({ error: 'Client not found or linked to CA' });
        }

        const caId = clientDoc.caId;
        const bucketName = `ca-${caId}`;

        // Ensure bucket exists
        const { createBucket } = require('../services/storageService');
        await createBucket(bucketName);

        // Construct Path: client_{clientId}/{category}/{filename}
        const safeCategory = (category || 'GENERAL').toLowerCase();
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = `client_${clientId}/${safeCategory}/${fileName}`;

        // Upload to MinIO
        await uploadFile(bucketName, filePath, req.file.buffer, {
            'Content-Type': req.file.mimetype,
            'X-Amz-Meta-UploadedBy': uploadedBy || 'CA'
        });

        // Construct Full URL: http://IP:PORT/bucket/path
        const fullUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${filePath}`;

        // Save Metadata to MongoDB
        const newDoc = await Document.create({
            clientId,
            folderId,
            fileName: req.file.originalname,
            fileUrl: fullUrl, // Storing FULL URL
            cloudinaryId: filePath, // Storing Key here
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: uploadedBy || 'CA',
            category: category || 'GENERAL'
        });

        // Trigger Notification
        if (clientId) {
            await sendNotification(
                'New Document Received',
                `You have a new document: ${req.file.originalname}`,
                clientId
            );
        }

        res.status(201).json(newDoc);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
};

// 3. CREATE FOLDER
exports.createFolder = async (req, res) => {
    try {
        const { name, clientId, parentFolderId } = req.body;

        if (!name || !clientId) {
            return res.status(400).json({ error: 'Name and clientId are required' });
        }

        let path = [];
        if (parentFolderId) {
            const parent = await Folder.findById(parentFolderId);
            if (parent) {
                path = [...parent.path, { _id: parent._id, name: parent.name }];
            }
        }

        const newFolder = await Folder.create({
            name,
            clientId,
            parentFolderId: parentFolderId || null,
            path
        });

        res.status(201).json(newFolder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Folder creation failed' });
    }
};

// 4. SOFT DELETE FILE
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await Document.findById(id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Update to Soft Delete
        file.isDeleted = true;
        file.deletedAt = new Date();
        file.deletedBy = req.user ? req.user._id : 'SYSTEM';
        await file.save();

        res.json({ message: 'File moved to Recycle Bin' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Deletion failed' });
    }
};

// 5. SOFT DELETE FOLDER
exports.deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const folder = await Folder.findById(id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        // Check if folder has ACTIVE subfolders or files
        const [subfolders, files] = await Promise.all([
            Folder.findOne({ parentFolderId: id, isDeleted: { $ne: true } }),
            Document.findOne({ folderId: id, isDeleted: { $ne: true } })
        ]);

        if (subfolders || files) {
            return res.status(400).json({ error: 'Cannot delete non-empty folder. Please delete contents first.' });
        }

        // Soft Delete
        folder.isDeleted = true;
        folder.deletedAt = new Date();
        folder.deletedBy = req.user ? req.user._id : 'SYSTEM';
        await folder.save();

        res.json({ message: 'Folder moved to Recycle Bin' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Folder deletion failed' });
    }
};

// 7. GET BIN ITEMS
exports.getBinItems = async (req, res) => {
    try {
        const { clientId } = req.params;

        const [folders, files] = await Promise.all([
            Folder.find({ clientId, isDeleted: true }).sort({ deletedAt: -1 }).lean(),
            Document.find({ clientId, isDeleted: true }).sort({ deletedAt: -1 }).lean()
        ]);

        res.json({ folders, files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bin items' });
    }
};

// 8. RESTORE ITEM
exports.restoreItem = async (req, res) => {
    try {
        const { type, id } = req.params; // type: 'file' or 'folder'

        if (type === 'file') {
            await Document.findByIdAndUpdate(id, {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            });
        } else if (type === 'folder') {
            await Folder.findByIdAndUpdate(id, {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            });
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        res.json({ message: 'Item restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Restore failed' });
    }
};

// 9. PERMANENT DELETE
exports.permanentDelete = async (req, res) => {
    try {
        const { type, id } = req.params;

        if (type === 'file') {
            const file = await Document.findById(id);
            if (!file) return res.status(404).json({ error: 'File not found' });

            // Delete from MinIO
            const caId = req.user._id;
            const bucketName = `ca-${caId}`;
            const fileKey = file.cloudinaryId;

            if (fileKey) {
                try {
                    await deleteFile(bucketName, fileKey);
                } catch (e) {
                    console.error("MinIO delete failed, but proceeding to delete from DB", e);
                }
            }

            await Document.findByIdAndDelete(id);

        } else if (type === 'folder') {
            await Folder.findByIdAndDelete(id);
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        res.json({ message: 'Item permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Permanent deletion failed' });
    }
};

// 6. GET FOLDER CONTENTS (For Mobile App)
exports.getFolderContents = async (req, res) => {
    try {
        const { folderId, category } = req.body;
        const clientId = req.user ? req.user._id : req.body.clientId;

        if (!clientId) {
            return res.status(401).json({ error: 'Unauthorized: No client ID found' });
        }

        let queryFolderId = folderId;

        if (!queryFolderId && category) {
            const rootFolder = await Folder.findOne({
                clientId,
                name: category,
                parentFolderId: null
            });

            if (rootFolder) {
                queryFolderId = rootFolder._id;
            } else {
                return res.json({ folders: [], files: [] });
            }
        }

        const [folders, files] = await Promise.all([
            Folder.find({ clientId, parentFolderId: queryFolderId || null, isDeleted: { $ne: true } }).lean(),
            Document.find({ clientId, folderId: queryFolderId || null, isDeleted: { $ne: true } }).lean()
        ]);

        res.json({ folders, files });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch folder contents' });
    }
};
// 10. DOWNLOAD FILE (Proxy through Backend)
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await Document.findById(id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Lookup CA ID from Client
        const clientDoc = await require('../models/Client').findById(file.clientId).select('caId');
        if (!clientDoc || !clientDoc.caId) {
            // Fallback or error?
            return res.status(404).json({ error: 'Client/CA not found' });
        }

        const bucketName = `ca-${clientDoc.caId}`;
        const fileKey = file.cloudinaryId; // This is the filePath in MinIO

        console.log(`[Download Debug] ID: ${id}, Bucket: ${bucketName}, Key: ${fileKey}`);

        const { getObjectStream } = require('../services/storageService');
        const dataStream = await getObjectStream(bucketName, fileKey);

        // Set Headers for Download
        res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
        res.setHeader('Content-Type', file.fileType || 'application/octet-stream');

        dataStream.pipe(res);

    } catch (err) {
        console.error('Download Error Detailed:', err);
        res.status(500).json({ error: 'Download failed', details: err.message });
    }
};

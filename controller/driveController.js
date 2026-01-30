const Folder = require('../models/Folder');
const Document = require('../models/Document');
const { cloudinary } = require('../config/fileStorage');
const { sendNotification } = require('../services/notificationService');

// 1. GET ALL (Eager Load - Same as before)
exports.getAllData = async (req, res) => {
    try {
        const { clientId } = req.params;
        const [folders, files] = await Promise.all([
            Folder.find({ clientId }).lean(),
            Document.find({ clientId }).lean()
        ]);
        res.json({ folders, files });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// 2. UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        // ... (existing checks)

        const { clientId, folderId, uploadedBy, category } = req.body;

        const newDoc = await Document.create({
            clientId,
            folderId,
            fileName: req.file.originalname,
            fileUrl: req.file.path,        // Cloudinary URL
            cloudinaryId: req.file.filename, // Cloudinary Public ID
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
                clientId // Targeting User DB ID
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

// 4. DELETE FILE
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await Document.findById(id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from Cloudinary
        if (file.cloudinaryId) {
            await cloudinary.uploader.destroy(file.cloudinaryId);
        }

        // Delete from MongoDB
        await Document.findByIdAndDelete(id);

        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Deletion failed' });
    }
};

// 5. DELETE FOLDER
exports.deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;

        // check if folder exists
        const folder = await Folder.findById(id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        // Check if folder has subfolders or files
        const [subfolders, files] = await Promise.all([
            Folder.findOne({ parentFolderId: id }),
            Document.findOne({ folderId: id })
        ]);

        if (subfolders || files) {
            return res.status(400).json({ error: 'Cannot delete non-empty folder. Please delete contents first.' });
        }

        await Folder.findByIdAndDelete(id);
        res.json({ message: 'Folder deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Folder deletion failed' });
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
            Folder.find({ clientId, parentFolderId: queryFolderId || null }).lean(),
            Document.find({ clientId, folderId: queryFolderId || null }).lean()
        ]);

        res.json({ folders, files });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch folder contents' });
    }
};

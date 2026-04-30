const Folder = require('../models/Folder');
const Document = require('../models/Document');
const Client = require('../models/Client');
const { cloudinary } = require('../config/fileStorage');
const { sendNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');
const { uploadFile: storageUpload, deleteFile: storageDelete, getFileUrl, getObjectStream } = require('../services/storageService');
const { getFinancialYears } = require('../services/folderService');
const archiver = require('archiver');
const { getFileProxyUrl } = require('../utils/urlHelper');

const prisma = require('../config/prisma');
const isCustomerUser = (user) => String(user?.role || '').toUpperCase() === 'CUSTOMER';

const normalizeFileCategory = (cat) => {
    if (!cat) return 'GENERAL';
    const c = String(cat).toUpperCase().trim();
    if (c === 'INCOME TAX') return 'ITR';
    // Ensure it matches Prisma enum values
    const valid = ['GENERAL', 'GST', 'KYC', 'ITR', 'TDS'];
    return valid.includes(c) ? c : 'GENERAL';
};

const FIXED_KYC_DOCUMENT_NAMES = new Set([
    'pan card',
    'adhar card',
    'aadhaar card',
    'udyam number',
    'iec code',
    'gst registration',
    'passport',
    'patnership doc',
    'partnership doc',
    'partnership document',
    'address proof'
]);

const isFixedKycDocument = (file) => {
    const name = String(file.displayName || file.fileName || '').trim().toLowerCase();
    return file.category === 'KYC' && FIXED_KYC_DOCUMENT_NAMES.has(name);
};

const getFiscalMonthSequence = (name) => {
    const match = String(name || '').trim().match(/^(\d{1,2})-/);
    if (!match) return null;
    const monthNumber = parseInt(match[1], 10);
    return monthNumber >= 1 && monthNumber <= 12 ? monthNumber : null;
};

const getFolderPriority = (name) => {
    const lowerName = String(name || '').toLowerCase();
    if (lowerName.includes('sale')) return 1;
    if (lowerName.includes('purchase')) return 2;
    if (lowerName.includes('income')) return 3;
    if (lowerName.includes('bank')) return 4;
    return 99;
};

const compareFiscalFolderNames = (aName, bName) => {
    const aSequence = getFiscalMonthSequence(aName);
    const bSequence = getFiscalMonthSequence(bName);

    if (aSequence !== null || bSequence !== null) {
        if (aSequence === null) return 1;
        if (bSequence === null) return -1;
        if (aSequence !== bSequence) return aSequence - bSequence;
    }

    const priorityDiff = getFolderPriority(aName) - getFolderPriority(bName);
    if (priorityDiff !== 0) return priorityDiff;

    return String(aName || '').localeCompare(String(bName || ''), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
};

const compareFoldersByFiscalSequence = (a, b) => compareFiscalFolderNames(a?.name, b?.name);

// Get all financial years for filters
exports.getFinancialYears = async (req, res) => {
    try {
        const financialYears = getFinancialYears();

        console.log("financialYears", financialYears);
        res.json({
            status: 'success',
            financialYears
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch financial years' });
    }
};

// Get documents for authenticated CA (supports category/date filters)
exports.getDocuments = async (req, res) => {
    try {
        const caId = req.user.id;
        const { category, startDate, endDate } = req.query;

        const where = {
            isDeleted: false,
            client: {
                caId: caId
            },
            fileUrl: {
                not: ''
            }
        };

        if (category) {
            where.category = String(category).toUpperCase();
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                const from = new Date(startDate);
                if (!isNaN(from.getTime())) {
                    where.createdAt.gte = from;
                }
            }
            if (endDate) {
                const to = new Date(endDate);
                if (!isNaN(to.getTime())) {
                    to.setHours(23, 59, 59, 999);
                    where.createdAt.lte = to;
                }
            }
        }

        const documents = await prisma.document.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            status: 'success',
            data: documents.map(doc => ({
                ...doc,
                _id: doc.id,
                fileUrl: doc.cloudinaryId ? getFileProxyUrl(req, doc.id) : ""
            }))
        });
    } catch (err) {
        console.error('getDocuments Error:', err);
        res.status(500).json({ status: 'error', message: 'Failed to fetch documents' });
    }
};

// 1. GET ALL (Eager Load - Same as before)
exports.getAllData = async (req, res) => {
    try {
        const { clientId } = req.params;
        const [folders, files] = await Promise.all([
            prisma.folder.findMany({
                where: { clientId, isDeleted: false }
            }),
            prisma.document.findMany({
                where: { clientId, isDeleted: false }
            })
        ]);

        // Fix property names for frontend compatibility
        const formattedFolders = [...folders]
            .sort(compareFoldersByFiscalSequence)
            .map(f => ({ ...f, _id: f.id }));
        const formattedFiles = files.map(f => ({ ...f, _id: f.id }));

        // Lookup CA ID from Client to find the correct bucket
        const clientDoc = await prisma.client.findUnique({
            where: { id: clientId },
            select: { caId: true }
        });

        let signedFiles = formattedFiles;

        if (clientDoc && clientDoc.caId) {
            signedFiles = formattedFiles.map((file) => {
                // Point fileUrl to the backend view proxy to avoid Mixed Content errors
                file.fileUrl = file.cloudinaryId ? getFileProxyUrl(req, file.id) : "";
                return file;
            });
        }

        res.json({ folders: formattedFolders, files: signedFiles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// 2. UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        const { folderId, uploadedBy, category, documentNumber, docId, fileName: customFileName, clientId: bodyClientId } = req.body;
        const clientId = bodyClientId || req.user.id;

        // Lookup CA ID from Client to find the correct bucket
        const clientDoc = await prisma.client.findUnique({
            where: { id: clientId },
            select: { caId: true, name: true }
        });

        if (!clientDoc || !clientDoc.caId) {
            return res.status(404).json({ error: 'Client not found or linked to CA' });
        }

        const caId = clientDoc.caId;
        const bucketName = `ca-${caId}`;
        let fullUrl, filePath;

        // --- Handle File Upload to Storage if provided ---
        if (req.file) {
            // Ensure bucket exists
            const { createBucket } = require('../services/storageService');
            await createBucket(bucketName);

            // Construct Path: client_{clientId}/{category}/{filename}
            const safeCategory = (category || 'GENERAL').toLowerCase();
            const timestampedName = `${Date.now()}-${req.file.originalname}`;
            filePath = `client_${clientId}/${safeCategory}/${timestampedName}`;

            // Upload to MinIO
            await storageUpload(bucketName, filePath, req.file.buffer, {
                'Content-Type': req.file.mimetype,
                'X-Amz-Meta-UploadedBy': uploadedBy || 'CA'
            });

            // Store relative path (filePath) in DB instead of direct MinIO URL
            // This allows us to generate a proxy URL on the fly in GET requests
            fullUrl = filePath;
        }

        let newDoc;
        if (docId) {
            // --- Update Existing Record ---
            const oldDoc = await prisma.document.findUnique({ where: { id: docId } });
            const updateData = {
                documentNumber: documentNumber || undefined,
                uploadedBy: uploadedBy || 'CA',
                category: category ? normalizeFileCategory(category) : undefined,
                displayName: customFileName || undefined // Just rename if provided
            };

            if (req.file) {
                // Delete old file from storage
                if (oldDoc && oldDoc.cloudinaryId) {
                    try {
                        await storageDelete(bucketName, oldDoc.cloudinaryId);
                    } catch (e) {
                        console.error("Old file deletion failed", e);
                    }
                }

                updateData.fileName = req.file.originalname;
                updateData.fileUrl = fullUrl;
                updateData.cloudinaryId = filePath;
                updateData.fileType = req.file.mimetype;
                updateData.fileSize = req.file.size;
            }

            newDoc = await prisma.document.update({
                where: { id: docId },
                data: updateData
            });

        } else {
            // --- Create New Record ---
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            newDoc = await prisma.document.create({
                data: {
                    client: { connect: { id: clientId } },
                    folder: folderId ? { connect: { id: folderId } } : undefined,
                    fileName: req.file.originalname,
                    displayName: customFileName || req.file.originalname,
                    fileUrl: fullUrl,
                    cloudinaryId: filePath,
                    fileType: req.file.mimetype,
                    fileSize: req.file.size,
                    documentNumber: documentNumber || null,
                    uploadedBy: uploadedBy || 'CA',
                    category: normalizeFileCategory(category)
                }
            });
        }

        await logActivity({
            caId: clientDoc.caId,
            action: docId ? 'UPDATE_FILE' : 'UPLOAD_FILE',
            details: docId ? `Updated document: ${newDoc.displayName || newDoc.fileName}` : `Uploaded file: ${req.file.originalname}`,
            clientId,
            docId: newDoc.id,
            folderId: newDoc.folderId
        });

        // Send Notification
        const isUploadedByCA = req.user
            ? !isCustomerUser(req.user)
            : String(uploadedBy || 'CA').toUpperCase() === 'CA';
        const recipientId = isUploadedByCA ? clientId : (clientDoc.caId ? clientDoc.caId.toString() : null);
        const uploadedFileName = newDoc?.displayName || newDoc?.fileName || req.file?.originalname || 'document';

        if (recipientId) {
            const title = 'New Document Received';
            const body = isUploadedByCA
                ? `Your CA has uploaded a new document: ${uploadedFileName}`
                : `${clientDoc.name || 'A client'} has uploaded a new document: ${uploadedFileName}`;

            await sendNotification(
                title,
                body,
                recipientId,
                {
                    saveToDb: true,
                    senderId: isUploadedByCA ? clientDoc.caId : clientId,
                    recipientType: isUploadedByCA ? 'CLIENT' : 'CA',
                    senderType: isUploadedByCA ? 'CA' : 'CLIENT',
                    type: 'FILE_UPLOAD',
                    metadata: {
                        docId: newDoc.id,
                        folderId: newDoc.folderId,
                        clientId: clientId
                    }
                }
            );
        }

        res.status(201).json({
            ...newDoc,
            _id: newDoc.id,
            fileUrl: newDoc.cloudinaryId ? getFileProxyUrl(req, newDoc.id) : ""
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Upload failed' });
    }
};

// 3. CREATE FOLDER (Now with path logic for nested folders)
exports.createFolder = async (req, res) => {
    try {
        const { name, clientId, parentFolderId } = req.body;

        if (!name || !clientId) {
            return res.status(400).json({ error: 'Name and clientId are required' });
        }

        let path = [];
        let categoryInput = req.body.category || 'GENERAL';
        let category = normalizeFileCategory(categoryInput);

        if (parentFolderId) {
            const parent = await prisma.folder.findUnique({
                where: { id: parentFolderId }
            });
            if (parent) {
                path = [...(parent.path || []), { id: parent.id, name: parent.name }];
                category = parent.category; // Inherit category from parent
            }
        }

        const newFolder = await prisma.folder.create({
            data: {
                name,
                client: { connect: { id: clientId } },
                category,
                parentFolder: parentFolderId ? { connect: { id: parentFolderId } } : undefined,
                path
            }
        });

        if (req.user) {
            const actorIsCA = !isCustomerUser(req.user);
            const caIdForActivity = actorIsCA
                ? req.user.id
                : (await prisma.client.findUnique({
                    where: { id: clientId },
                    select: { caId: true }
                }))?.caId;

            await logActivity({
                caId: caIdForActivity,
                action: 'CREATE_FOLDER',
                details: `Created folder: ${name}`,
                clientId,
                folderId: newFolder.id
            });

            const recipientId = actorIsCA ? clientId : caIdForActivity;
            if (recipientId) {
                await sendNotification(
                    'Folder Created',
                    actorIsCA
                        ? `Your CA created a new folder: ${name}`
                        : `${req.user.name || 'A client'} created a new folder: ${name}`,
                    recipientId,
                    {
                        saveToDb: true,
                        senderId: actorIsCA ? caIdForActivity : clientId,
                        recipientType: actorIsCA ? 'CLIENT' : 'CA',
                        senderType: actorIsCA ? 'CA' : 'CLIENT',
                        type: 'FOLDER_CREATED',
                        metadata: { clientId, folderId: newFolder.id }
                    }
                );
            }
        }

        res.status(201).json({ ...newFolder, _id: newFolder.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Folder creation failed' });
    }
};

// 4. SOFT DELETE FILE
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await prisma.document.findUnique({ where: { id } });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (isFixedKycDocument(file)) {
            const clientDoc = await prisma.client.findUnique({
                where: { id: file.clientId },
                select: { caId: true }
            });

            if (file.cloudinaryId && clientDoc?.caId) {
                try {
                    await storageDelete(`ca-${clientDoc.caId}`, file.cloudinaryId);
                } catch (e) {
                    console.error("KYC file deletion failed", e);
                }
            }

            await prisma.document.update({
                where: { id },
                data: {
                    fileUrl: '',
                    cloudinaryId: '',
                    fileType: null,
                    fileSize: 0,
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                }
            });

            if (req.user) {
                await logActivity({
                    caId: clientDoc?.caId || req.user.id,
                    action: 'DELETE_FILE',
                    details: `Cleared KYC document file: ${file.displayName || file.fileName}`,
                    clientId: file.clientId,
                    docId: file.id,
                    folderId: file.folderId
                });
            }

            return res.json({ message: 'KYC document file cleared' });
        }

        // Update to Soft Delete
        const updatedFile = await prisma.document.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: req.user ? req.user.id : 'SYSTEM'
            }
        });

        if (req.user) {
            await logActivity({
                caId: req.user.id,
                action: 'DELETE_FILE',
                details: `Moved file to recycle bin: ${file.fileName}`,
                clientId: file.clientId,
                docId: file.id,
                folderId: file.folderId
            });
        }

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
        const folder = await prisma.folder.findUnique({ where: { id } });
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        if (folder.isPredefined) {
            return res.status(400).json({ error: 'System defined folders cannot be deleted.' });
        }

        const now = new Date();
        const deletedBy = req.user ? req.user.id : 'SYSTEM';

        // Recursively collect nested folder ids
        const descendants = [];
        const queue = [id];
        while (queue.length) {
            const current = queue.shift();
            descendants.push(current);
            const children = await prisma.folder.findMany({
                where: { parentFolderId: current, isDeleted: false },
                select: { id: true }
            });
            children.forEach((c) => queue.push(c.id));
        }

        // Soft delete all files within folder tree, then folders
        await prisma.document.updateMany({
            where: { folderId: { in: descendants }, isDeleted: false },
            data: { isDeleted: true, deletedAt: now, deletedBy }
        });

        await prisma.folder.updateMany({
            where: { id: { in: descendants }, isDeleted: false },
            data: { isDeleted: true, deletedAt: now, deletedBy }
        });

        if (req.user) {
            const actorIsCA = !isCustomerUser(req.user);
            const clientDoc = await prisma.client.findUnique({
                where: { id: folder.clientId },
                select: { caId: true, name: true }
            });
            const caIdForActivity = actorIsCA ? req.user.id : clientDoc?.caId;

            await logActivity({
                caId: caIdForActivity,
                action: 'DELETE_FOLDER',
                details: `Moved folder to recycle bin: ${folder.name}`,
                clientId: folder.clientId,
                folderId: folder.id
            });

            const recipientId = actorIsCA ? folder.clientId : clientDoc?.caId;
            if (recipientId) {
                await sendNotification(
                    'Folder Deleted',
                    actorIsCA
                        ? `Your CA moved folder to recycle bin: ${folder.name}`
                        : `${req.user.name || clientDoc?.name || 'A client'} moved folder to recycle bin: ${folder.name}`,
                    recipientId,
                    {
                        saveToDb: true,
                        senderId: actorIsCA ? caIdForActivity : folder.clientId,
                        recipientType: actorIsCA ? 'CLIENT' : 'CA',
                        senderType: actorIsCA ? 'CA' : 'CLIENT',
                        type: 'FOLDER_DELETED',
                        metadata: { clientId: folder.clientId, folderId: folder.id }
                    }
                );
            }
        }

        res.json({ message: 'Folder and its contents moved to Recycle Bin' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Folder deletion failed' });
    }
};

// 7. GET BIN ITEMS
exports.getBinItems = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { startDate, endDate } = req.query;
        let query = { isDeleted: true };

        if (clientId === 'all') {
            const clients = await prisma.client.findMany({
                where: { caId: req.user.id },
                select: { id: true }
            });
            const clientIds = clients.map(c => c.id);
            query.clientId = { in: clientIds };
        } else {
            query.clientId = clientId;
        }

        // Add date filtering if provided
        if (startDate || endDate) {
            query.deletedAt = {};
            if (startDate) query.deletedAt.gte = new Date(startDate);
            if (endDate) query.deletedAt.lte = new Date(endDate);
        }

        const [folders, files] = await Promise.all([
            prisma.folder.findMany({
                where: query,
                orderBy: { deletedAt: 'desc' },
                include: { client: { select: { name: true } } }
            }),
            prisma.document.findMany({
                where: query,
                orderBy: { deletedAt: 'desc' },
                include: { client: { select: { name: true } } }
            })
        ]);

        res.json({
            status: 'success',
            folders: folders,
            files: files.map(file => ({
                ...file,
                fileUrl: file.cloudinaryId ? getFileProxyUrl(req, file.id) : ""
            }))
        });

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
            await prisma.document.update({
                where: { id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                }
            });
        } else if (type === 'folder') {
            await prisma.folder.update({
                where: { id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                }
            });
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        if (req.user) {
            const item = type === 'file'
                ? await prisma.document.findUnique({ where: { id } })
                : await prisma.folder.findUnique({ where: { id } });

            await logActivity({
                caId: req.user.id,
                action: type === 'file' ? 'RESTORE_FILE' : 'RESTORE_FOLDER',
                details: `Restored ${type} from recycle bin: ${item?.name || item?.fileName || id}`,
                clientId: item?.clientId,
                [type === 'file' ? 'docId' : 'folderId']: id
            });
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
            const file = await prisma.document.findUnique({ where: { id } });
            if (!file) return res.status(404).json({ error: 'File not found' });

            // Delete from MinIO
            const caId = req.user.id;
            const bucketName = `ca-${caId}`;
            const fileKey = file.cloudinaryId;

            if (fileKey) {
                try {
                    await deleteFile(bucketName, fileKey);
                } catch (e) {
                    console.error("MinIO delete failed, but proceeding to delete from DB", e);
                }
            }

            await prisma.document.delete({ where: { id } });

        } else if (type === 'folder') {
            const folder = await prisma.folder.findUnique({ where: { id } });
            if (!folder) return res.status(404).json({ error: 'Folder not found' });
            if (folder.isPredefined) {
                return res.status(400).json({ error: 'System defined folders cannot be deleted.' });
            }
            await prisma.folder.delete({ where: { id } });
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        if (req.user) {
            await logActivity({
                caId: req.user.id,
                action: type === 'file' ? 'PERMANENT_DELETE_FILE' : 'PERMANENT_DELETE_FOLDER',
                details: `Permanently deleted ${type}: ${id}`,
            });
        }

        res.json({ message: 'Item permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Permanent deletion failed' });
    }
};

// 11. RENAME / UPDATE ITEM
exports.updateItem = async (req, res) => {
    try {
        const { type, id } = req.params; // type: 'file' or 'folder'
        const { name, parentFolderId, folderId } = req.body;

        if (type === 'folder') {
            const folder = await prisma.folder.findUnique({ where: { id } });
            if (!folder) return res.status(404).json({ error: 'Folder not found' });
            if (folder.isPredefined) {
                return res.status(400).json({ error: 'System defined folders cannot be edited.' });
            }
            let updateData = {};
            if (name) updateData.name = name;

            if (parentFolderId !== undefined) {
                updateData.parentFolderId = parentFolderId || null;
                // Update Path if parent changed
                if (parentFolderId) {
                    const parent = await prisma.folder.findUnique({ where: { id: parentFolderId } });
                    if (parent) {
                        updateData.path = [...(parent.path || []), { id: parent.id, name: parent.name }];
                        updateData.category = parent.category;
                    }
                } else {
                    updateData.path = [];
                }
            }

            const updatedFolder = await prisma.folder.update({
                where: { id },
                data: updateData
            });

            if (req.user) {
                const actorIsCA = !isCustomerUser(req.user);
                const clientDoc = await prisma.client.findUnique({
                    where: { id: updatedFolder.clientId },
                    select: { caId: true, name: true }
                });
                const caIdForActivity = actorIsCA ? req.user.id : clientDoc?.caId;

                await logActivity({
                    caId: caIdForActivity,
                    action: 'CREATE_FOLDER',
                    details: `Updated folder: ${updatedFolder.name}`,
                    clientId: updatedFolder.clientId,
                    folderId: id
                });

                const recipientId = actorIsCA ? updatedFolder.clientId : clientDoc?.caId;
                if (recipientId) {
                    await sendNotification(
                        'Folder Updated',
                        actorIsCA
                            ? `Your CA updated a folder: ${updatedFolder.name}`
                            : `${req.user.name || clientDoc?.name || 'A client'} updated a folder: ${updatedFolder.name}`,
                        recipientId,
                        {
                            saveToDb: true,
                            senderId: actorIsCA ? caIdForActivity : updatedFolder.clientId,
                            recipientType: actorIsCA ? 'CLIENT' : 'CA',
                            senderType: actorIsCA ? 'CA' : 'CLIENT',
                            type: 'FOLDER_UPDATED',
                            metadata: { clientId: updatedFolder.clientId, folderId: id }
                        }
                    );
                }
            }

            return res.json({ ...updatedFolder, _id: updatedFolder.id });

        } else if (type === 'file') {
            let updateData = {};
            if (name) updateData.fileName = name;
            if (folderId !== undefined) updateData.folderId = folderId || null;

            const updatedFile = await prisma.document.update({
                where: { id },
                data: {
                    ...updateData,
                    displayName: name || undefined
                }
            });

            if (req.user) {
                await logActivity({
                    caId: req.user.id,
                    action: 'UPLOAD_FILE',
                    details: `Updated file: ${updatedFile.fileName}`,
                    clientId: updatedFile.clientId,
                    docId: id
                });
            }

            return res.json({ ...updatedFile, _id: updatedFile.id });

        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
};

// 6. GET FOLDER CONTENTS (For Mobile App)
exports.getFolderContents = async (req, res) => {
    try {
        const { folderId, category } = req.body;
        const clientId = req.user ? req.user.id : req.body.clientId;

        if (!clientId) {
            return res.status(401).json({ error: 'Unauthorized: No client ID found' });
        }

        let queryFolderId = folderId;

        if (!queryFolderId && category) {
            const rootFolder = await prisma.folder.findFirst({
                where: {
                    clientId,
                    category: category,
                    parentFolderId: null
                }
            });

            if (rootFolder) {
                queryFolderId = rootFolder.id;
            } else {
                return res.json({ folders: [], files: [] });
            }
        }

        const [folders, files] = await Promise.all([
            prisma.folder.findMany({
                where: { clientId, parentFolderId: queryFolderId || null, isDeleted: false }
            }),
            prisma.document.findMany({
                where: { clientId, folderId: queryFolderId || null, isDeleted: false }
            })
        ]);

        res.json({
            folders: folders.map(f => ({ ...f, _id: f.id })),
            files: files.map(f => ({
                ...f,
                _id: f.id,
                fileUrl: f.cloudinaryId ? getFileProxyUrl(req, f.id) : ""
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch folder contents' });
    }
};

// 10. DOWNLOAD FILE (Proxy through Backend)
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = await prisma.document.findUnique({ where: { id } });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Lookup CA ID from Client
        const clientDoc = await prisma.client.findUnique({
            where: { id: file.clientId },
            select: { caId: true }
        });

        if (!clientDoc || !clientDoc.caId) {
            return res.status(404).json({ error: 'Client/CA not found' });
        }

        const bucketName = `ca-${clientDoc.caId}`;
        const fileKey = file.cloudinaryId; // This is the filePath in MinIO

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

// 10.1 VIEW FILE (Proxy through Backend for Preview)
// exports.viewFile = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const file = await prisma.document.findUnique({ where: { id } });

//         if (!file) {
//             return res.status(404).json({ error: 'File not found' });
//         }

//         // Lookup CA ID from Client
//         const clientDoc = await prisma.client.findUnique({
//             where: { id: file.clientId },
//             select: { caId: true }
//         });

//         if (!clientDoc || !clientDoc.caId) {
//             return res.status(404).json({ error: 'Client/CA not found' });
//         }

//         const bucketName = `ca-${clientDoc.caId}`;
//         const fileKey = file.cloudinaryId;

//         const { getObjectStream } = require('../services/storageService');
//         const dataStream = await getObjectStream(bucketName, fileKey);

//         // Set Headers for Preview (Inline)
//         res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
//         res.setHeader('Content-Type', file.fileType || 'application/octet-stream');

//         dataStream.pipe(res);

//     } catch (err) {
//         console.error('View Error:', err);
//         res.status(500).json({ error: 'View failed', details: err.message });
//     }
// };

exports.viewFile = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await prisma.document.findUnique({ where: { id } });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const clientDoc = await prisma.client.findUnique({
            where: { id: file.clientId },
            select: { caId: true }
        });

        const bucketName = `ca-${clientDoc.caId}`;
        const fileKey = file.cloudinaryId;

        const { getObjectStream } = require('../services/storageService');
        const dataStream = await getObjectStream(bucketName, fileKey);

        res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
        res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

        dataStream.pipe(res);

    } catch (err) {
        console.error('View Error:', err);
        res.status(500).json({ error: 'View failed', details: err.message });
    }
};

// 11. Get Bin by CA
exports.getBinByCA = async (req, res) => {
    try {
        const caId = req.user.id;
        const { startDate, endDate, page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    dateFilter.gte = start;
                }
            }
            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    dateFilter.lte = end;
                }
            }
        }

        const where = {
            client: {
                caId: caId
            },
            isDeleted: true
        };

        if (Object.keys(dateFilter).length > 0) {
            where.deletedAt = dateFilter;
        }

        // Fetch deleted files
        const deletedFiles = await prisma.document.findMany({
            where,
            include: {
                client: { select: { name: true } }
            },
            orderBy: { deletedAt: 'desc' },
            skip,
            take
        });

        // Fetch deleted folders
        const deletedFolders = await prisma.folder.findMany({
            where,
            include: {
                client: { select: { name: true } }
            },
            orderBy: { deletedAt: 'desc' },
            skip,
            take
        });

        res.json({
            status: 'success',
            files: deletedFiles,
            folders: deletedFolders,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Failed to fetch bin contents' });
    }
};

// New API to get drive data based on the authenticated client token (no clientId param needed)
exports.getClientDrive = async (req, res) => {
    try {
        const clientId = req.user.id;

        const [folders, files] = await Promise.all([
            prisma.folder.findMany({
                where: { clientId, isDeleted: false },
                orderBy: { name: 'asc' }
            }),
            prisma.document.findMany({
                where: { clientId, isDeleted: false },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const clientDoc = await prisma.client.findUnique({
            where: { id: clientId },
            select: { caId: true }
        });

        if (!clientDoc || !clientDoc.caId) {
            return res.status(404).json({ error: 'Client not found or not linked to a CA.' });
        }

        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const apiBaseUrl = `${protocol}://${req.get('host')}`;

        const formattedFiles = files.map(file => {
            return {
                ...file,
                _id: file.id,
                // Empty KYC placeholders do not have a real object, so do not expose a preview URL.
                fileUrl: file.cloudinaryId ? `${apiBaseUrl}/api/drive/files/view/${file.id}` : ''
            };
        });

        const formattedFolders = folders.map(f => ({ ...f, _id: f.id }));

        // ── ORGANIZE DATA INTO HIERARCHY ──
        const organized = {};
        const categories = ['GST', 'ITR', 'TDS', 'KYC', 'GENERAL'];

        // Helper to get formatted month name with year
        const getMonthLabel = (mFolder, fyName) => {
            const match = fyName.match(/(\d{4})/);
            const startYear = match ? parseInt(match[1]) : 0;
            if (!startYear) return mFolder.name;

            const parts = mFolder.name.split('-');
            const mIdx = parseInt(parts[0]);
            const mRawName = parts[1] || mFolder.name;
            const mName = mRawName.charAt(0).toUpperCase() + mRawName.slice(1).toLowerCase();
            const actualYear = (mIdx >= 1 && mIdx <= 9) ? startYear : startYear + 1;

            return `${mName} ${actualYear}`;
        };

        categories.forEach(cat => {
            if (['GST', 'ITR', 'TDS'].includes(cat)) {
                const yearRoots = formattedFolders.filter(f => !f.parentFolderId && f.name.startsWith('FY - '));

                organized[cat] = yearRoots.map(yr => {
                    const catRoot = formattedFolders.find(f => f.parentFolderId === yr.id && f.category === cat);
                    if (!catRoot) return null;

                    const subFolders = formattedFolders
                        .filter(f => f.parentFolderId === catRoot.id)
                        .sort(compareFoldersByFiscalSequence);

                    // Default display name is folder name
                    // But for GST/TDS we might want specific logic (though ITR specifically needs name)
                    return {
                        year: yr.name,
                        yearId: yr.id,
                        folders: subFolders.map(f => ({
                            ...f,
                            displayName: cat === 'ITR' ? f.name : getMonthLabel(f, yr.name),
                            children: formattedFolders
                                .filter(sf => sf.parentFolderId === f.id)
                                .sort(compareFoldersByFiscalSequence)
                                .map(sf => ({
                                ...sf,
                                files: formattedFiles.filter(file => file.folderId === sf.id)
                            })),
                            files: formattedFiles.filter(file => file.folderId === f.id)
                        })),
                        files: formattedFiles.filter(file => file.folderId === catRoot.id)
                    };
                }).filter(Boolean);
            } else if (cat === 'KYC') {
                organized[cat] = formattedFolders.filter(f => f.category === 'KYC' && !f.parentFolderId).map(f => ({
                    ...f,
                    files: formattedFiles.filter(file => file.folderId === f.id)
                }));
            } else {
                organized[cat] = {
                    folders: formattedFolders.filter(f => f.category === cat),
                    files: formattedFiles.filter(f => f.category === cat)
                };
            }
        });

        res.json({
            status: 'success',
            clientId,
            allFolders: formattedFolders,
            allFiles: formattedFiles,
            categorized: organized
        });

    } catch (err) {
        console.error('getClientDrive Error:', err);
        res.status(500).json({ error: 'Failed to retrieve drive data' });
    }
};

// 12. Restore Item from Bin
exports.restoreItem = async (req, res) => {
    try {
        const { type, id } = req.params;

        if (type === 'file') {
            await prisma.document.update({
                where: { id },
                data: { isDeleted: false, deletedAt: null }
            });
        } else if (type === 'folder') {
            await prisma.folder.update({
                where: { id },
                data: { isDeleted: false, deletedAt: null }
            });
        }

        res.json({ status: 'success', message: 'Item restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Failed to restore item' });
    }
};

// 13. Permanent Delete
exports.permanentDelete = async (req, res) => {
    try {
        const { type, id } = req.params;

        if (type === 'file') {
            await prisma.document.delete({
                where: { id }
            });
        } else if (type === 'folder') {
            await prisma.folder.delete({
                where: { id }
            });
        }

        res.json({ status: 'success', message: 'Item permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Failed to delete item' });
    }
};

// 14. Track Folder Open (Update updatedAt)
exports.trackFolderOpen = async (req, res) => {
    try {
        const { id } = req.params;
        const folder = await prisma.folder.findUnique({
            where: { id },
            select: { id: true, clientId: true, isDeleted: true }
        });

        if (!folder || folder.isDeleted) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const now = new Date();
        const isClient = req.user.role === 'CUSTOMER';

        const folderOpen = isClient
            ? await prisma.folderOpen.upsert({
                where: {
                    folderId_clientId: {
                        folderId: id,
                        clientId: req.user.id
                    }
                },
                update: { lastOpenedAt: now },
                create: {
                    folderId: id,
                    clientId: req.user.id,
                    actorType: 'CLIENT',
                    lastOpenedAt: now
                }
            })
            : await prisma.folderOpen.upsert({
                where: {
                    folderId_caId: {
                        folderId: id,
                        caId: req.user.id
                    }
                },
                update: { lastOpenedAt: now },
                create: {
                    folderId: id,
                    caId: req.user.id,
                    actorType: 'CA',
                    lastOpenedAt: now
                }
            });

        res.json({ success: true, folder: { ...folder, lastOpenedAt: folderOpen.lastOpenedAt } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to track folder open' });
    }
};

// Download all documents for a client as a ZIP file
exports.downloadAllZip = async (req, res) => {
    try {
        const clientId = req.user.id;
        console.log(`[ZIP_REQUEST] Client: ${clientId}, Query:`, req.query);
        const { category, year } = req.query;

        console.log(`[ZIP_START] Client: ${clientId}, Category: ${category}, Year: ${year}`);

        const where = {
            clientId: clientId,
            isDeleted: false,
            fileUrl: { not: '' }
        };

        if (category && category !== 'all') {
            where.category = category.toUpperCase();
        }

        if (year && year !== 'all') {
            const yearFolders = await prisma.folder.findMany({
                where: {
                    clientId,
                    name: { contains: year },
                    isDeleted: false
                }
            });

            if (yearFolders.length > 0) {
                const yearFolderIds = yearFolders.map(f => f.id);
                const allFolders = await prisma.folder.findMany({
                    where: { clientId, isDeleted: false }
                });

                const descendantFolderIds = allFolders
                    .filter(f => {
                        const pathString = JSON.stringify(f.path || []);
                        return yearFolderIds.some(yId => pathString.includes(yId)) || yearFolderIds.includes(f.id);
                    })
                    .map(f => f.id);

                where.folderId = { in: descendantFolderIds };
            } else {
                console.log(`[ZIP_ERROR] No year folders found for ${year}`);
                return res.status(404).json({ error: `No data found for financial year ${year}` });
            }
        }

        const documents = await prisma.document.findMany({
            where,
            include: {
                folder: true
            }
        });

        console.log(`[ZIP_INFO] Found ${documents.length} documents for client ${clientId}`);

        if (documents.length === 0) {
            return res.status(404).json({ error: 'No files found to download' });
        }

        const clientDoc = await prisma.client.findUnique({
            where: { id: clientId },
            select: { caId: true, name: true }
        });

        if (!clientDoc || !clientDoc.caId) {
            console.log(`[ZIP_ERROR] Client or CA not found for ID: ${clientId}`);
            return res.status(404).json({ error: 'Client/CA not found' });
        }

        const bucketName = `ca-${clientDoc.caId}`;
        const zip = archiver('zip', { zlib: { level: 5 } });

        // Safe filename for cross-browser compatibility
        const safeClientName = clientDoc.name.replace(/[^a-z0-9]/gi, '_');
        const zipName = `${safeClientName}_${category || 'all'}_${year || 'docs'}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

        zip.on('error', (err) => {
            console.error('[ZIP_ARCHIVE_ERROR]', err);
        });

        zip.pipe(res);

        for (const doc of documents) {
            try {
                if (!doc.cloudinaryId) {
                    console.log(`[ZIP_SKIP] Skipping file without storage path: ${doc.fileName}`);
                    continue;
                }

                console.log(`[ZIP_ADD] Adding: ${doc.fileName} from bucket: ${bucketName}`);
                const stream = await getObjectStream(bucketName, doc.cloudinaryId);

                let zipPath = '';
                if (doc.folder) {
                    const folderPathArray = Array.isArray(doc.folder.path) ? doc.folder.path : [];
                    zipPath = folderPathArray.map(p => p.name).join('/') + '/' + doc.folder.name + '/';
                }

                zip.append(stream, { name: `${zipPath}${doc.fileName}` });
            } catch (e) {
                console.error(`[ZIP_FILE_ERROR] Failed to stream ${doc.fileName}:`, e.message);
            }
        }

        console.log(`[ZIP_FINISH] Finalizing zip for ${clientId}`);
        await zip.finalize();

    } catch (err) {
        console.error('[ZIP_FATAL_ERROR]', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error during zip generation' });
        }
    }
};

// Get storage usage statistics for a client
exports.getStorageStats = async (req, res) => {
    try {
        const clientId = req.user.id;

        const documents = await prisma.document.findMany({
            where: { clientId, isDeleted: false },
            select: { fileSize: true, fileType: true }
        });

        let totalSize = 0;
        const stats = {
            documents: { size: 0, count: 0 },
            images: { size: 0, count: 0 },
            others: { size: 0, count: 0 }
        };

        documents.forEach(doc => {
            const size = doc.fileSize || 0;
            totalSize += size;
            const type = (doc.fileType || '').toLowerCase();

            if (type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('excel') || type.includes('spreadsheet') || type.includes('officedocument') || type.includes('sheet')) {
                stats.documents.size += size;
                stats.documents.count += 1;
            } else if (type.includes('image')) {
                stats.images.size += size;
                stats.images.count += 1;
            } else {
                stats.others.size += size;
                stats.others.count += 1;
            }
        });

        // 10 GB default limit (can be made dynamic later)
        const limit = 10 * 1024 * 1024 * 1024;

        res.json({
            success: true,
            totalSize,
            limit,
            usedPercentage: totalSize > 0 ? ((totalSize / limit) * 100).toFixed(2) : 0,
            breakdown: [
                {
                    title: "Documents",
                    count: `${stats.documents.count} files`,
                    size: formatSize(stats.documents.size),
                    percent: totalSize > 0 ? Math.round((stats.documents.size / totalSize) * 100) : 0,
                    type: 'doc'
                },
                {
                    title: "Images",
                    count: `${stats.images.count} files`,
                    size: formatSize(stats.images.size),
                    percent: totalSize > 0 ? Math.round((stats.images.size / totalSize) * 100) : 0,
                    type: 'image'
                },
                {
                    title: "Other Files",
                    count: `${stats.others.count} files`,
                    size: formatSize(stats.others.size),
                    percent: totalSize > 0 ? Math.round((stats.others.size / totalSize) * 100) : 0,
                    type: 'other'
                }
            ]
        });
    } catch (err) {
        console.error('getStorageStats Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Helper to format bytes
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

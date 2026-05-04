const prisma = require('../config/prisma');
const catchAsync = require('../utils/catchAsync');
const { uploadFile: storageUpload, deleteFile: storageDelete } = require('../services/storageService');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');
const { getFileProxyUrl } = require('../utils/urlHelper');

exports.getDashboardStats = catchAsync(async (req, res) => {
    const caId = req.user.id;

    // 1. Run all independent database queries in parallel
    const [gstCount, tdsCount, itrCount, kycCount, recentFolderOpens, recentClients] = await Promise.all([
        // GST Count
        prisma.client.count({
            where: {
                caId: caId,
                isActive: true,
                gstNumber: { not: null },
                NOT: { gstNumber: "" }
            }
        }),
        // TDS Count
        prisma.client.count({
            where: {
                caId: caId,
                isActive: true,
                tanNumber: { not: null },
                NOT: { tanNumber: "" }
            }
        }),
        // ITR Count
        prisma.client.count({
            where: {
                caId: caId,
                isActive: true,
                NOT: { panNumber: "" }
            }
        }),
        // KYC Count
        prisma.client.count({
            where: {
                caId: caId,
                isActive: true,
                documents: {
                    some: {
                        category: 'KYC',
                        fileUrl: { not: '' },
                        isDeleted: false
                    }
                }
            }
        }),
        // Recent Folders
        prisma.folderOpen.findMany({
            where: {
                caId,
                folder: {
                    client: { caId: caId },
                    isDeleted: false
                }
            },
            orderBy: { lastOpenedAt: 'desc' },
            take: 9,
            include: {
                folder: {
                    include: {
                        client: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        }),
        // Recent Clients
        prisma.client.findMany({
            where: { caId: caId },
            orderBy: { createdAt: 'desc' },
            take: 10
        })
    ]);

    const stats = {
        GST: gstCount,
        TDS: tdsCount,
        ITR: itrCount,
        KYC: kycCount
    };

    res.json({
        success: true,
        data: {
            stats,
            recentFolders: recentFolderOpens.map(open => ({
                id: open.folder.id,
                name: open.folder.name,
                clientName: open.folder.client.name,
                clientId: open.folder.client.id,
                category: open.folder.category,
                createdAt: open.folder.createdAt,
                updatedAt: open.folder.updatedAt,
                lastOpenedAt: open.lastOpenedAt
            })),
            recentClients: recentClients.map(c => ({
                ...c,
                id: c.id,
                clientId: c.id,
                clientName: c.name,
                tradeName: c.tradeName || '-',
                panNo: c.panNumber,
                groupName: c.groupName || '-',
                mobileNo: c.mobileNumber,
                type: c.type === 'BUSINESS' ? 'Business' : 'Individual',
                status: c.isActive,
                date: c.createdAt.toISOString().split('T')[0]
            })),
            chartData: {
                gst: stats['GST'] || 0,
                tds: stats['TDS'] || 0,
                itr: stats['ITR'] || 0,
                kyc: stats['KYC'] || 0
            }
        }
    });
});

exports.getClientDashboardStats = catchAsync(async (req, res) => {
    // req.user is the client object set by protect middleware
    const clientId = req.user.id;
    const caId = req.user.caId; // Each client belongs to a CA

    // 1. Get Recent Folders opened by this client user only.
    const recentFolderOpens = await prisma.folderOpen.findMany({
        where: {
            clientId,
            folder: {
                clientId: clientId,
                isDeleted: false
            }
        },
        orderBy: {
            lastOpenedAt: 'desc'
        },
        take: 15,
        include: {
            folder: true
        }
    });

    // 2. Get Recent Documents (last 10) for the table
    const recentDocuments = await prisma.document.findMany({
        where: {
            clientId: clientId,
            isDeleted: false
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10,
        include: {
            folder: true
        }
    });

    // 3. Get Notifications for this client
    const notifications = await prisma.notification.findMany({
        where: {
            clientId: clientId
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5
    });

    // 4. Get CA Banners (Announcements)
    const banners = await prisma.banner.findMany({
        where: {
            caId: caId,
            isActive: true
        },
        orderBy: {
            order: 'asc'
        }
    });

    // 5. CA Details
    const ca = await prisma.user.findUnique({
        where: { id: caId },
        select: {
            name: true,
            email: true,
            phone: true
        }
    });

    res.json({
        success: true,
        data: {
            client: req.user,
            ca,
            recentFolders: recentFolderOpens.map(open => ({
                id: open.folder.id,
                name: open.folder.name,
                category: open.folder.category,
                updatedAt: open.folder.updatedAt,
                lastOpenedAt: open.lastOpenedAt
            })),
            recentDocuments: recentDocuments.map(d => ({
                id: d.id,
                name: d.fileName,
                type: d.fileType || 'file',
                size: `${(d.fileSize / (1024 * 1024)).toFixed(2)} MB`,
                category: d.category,
                folderId: d.folderId,
                folderName: d.folder?.name || 'Root',
                date: d.createdAt.toISOString()
            })),
            notifications: notifications.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                time: n.createdAt.toISOString(),
                isRead: n.isRead
            })),
            banners: banners.map(b => ({
                id: b.id,
                title: b.title,
                imageUrl: b.imageUrl,
                isActive: b.isActive
            }))
        }
    });
});

exports.getMobileStats = catchAsync(async (req, res) => {
    // Extract from body since protect middleware is disabled for mobile
    const { clientId } = req.body;

    if (!clientId) {
        return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    // 1. Get Client and CA Details
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
            ca: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                }
            }
        }
    });

    if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const caId = client.caId;

    // 2. Get Recent Notifications (Last 10)
    const notifications = await prisma.notification.findMany({
        where: {
            clientId: clientId
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10
    });

    // 3. Mocking segments/quick tools base counts (or get real counts if needed)
    const quickDocuments = [
        { id: '1', title: 'GST Document', subtitle: 'GST Document Manager', icon: 'percent' },
        { id: '2', title: 'ITR Document', subtitle: 'Download Previous ITR', icon: 'file-text' },
        { id: '3', title: 'Bank Statement', subtitle: 'Manage Bank Statements', icon: 'account-balance' }
    ];

    // 4. FINDING MONTHLY GST FOLDERS (Current & Last Month)
    const MONTHS_LABELS = [
        '1-APRIL', '2-MAY', '3-JUNE', '4-JULY', '5-AUGUST', '6-SEPTEMBER',
        '7-OCTOBER', '8-NOVEMBER', '9-DECEMBER', '10-JANUARY', '11-FEBRUARY', '12-MARCH'
    ];

    const now = new Date();
    const curMonthIdx = (now.getMonth() - 3 + 12) % 12;
    const lastMonthIdx = (curMonthIdx - 1 + 12) % 12;

    const currentMonthLabel = MONTHS_LABELS[curMonthIdx];
    const lastMonthLabel = MONTHS_LABELS[lastMonthIdx];

    // Find the latest Financial Year folder for this client
    const latestFyFolder = await prisma.folder.findFirst({
        where: {
            clientId: clientId,
            parentFolderId: null,
            isDeleted: false,
            name: { startsWith: 'FY -' }
        },
        orderBy: { name: 'desc' }
    });

    const getGstBillFolders = async (monthName) => {
        if (!latestFyFolder) return [];

        // Find the GST category folder inside the latest FY
        const gstCategoryFolder = await prisma.folder.findFirst({
            where: {
                clientId: clientId,
                parentFolderId: latestFyFolder.id,
                name: 'GST',
                isDeleted: false
            }
        });

        if (!gstCategoryFolder) return [];

        // Find the specific Month folder inside that GST folder
        const monthFolder = await prisma.folder.findFirst({
            where: {
                clientId: clientId,
                parentFolderId: gstCategoryFolder.id,
                name: monthName,
                isDeleted: false
            }
        });

        if (!monthFolder) return [];

        // Finally, return the Sale/Purchase bills inside that Month
        return await prisma.folder.findMany({
            where: {
                clientId: clientId,
                parentFolderId: monthFolder.id,
                isDeleted: false,
                name: {
                    in: ['Purchase Bill', 'Sale Bill']
                }
            },
            orderBy: { name: 'asc' }
        });
    };

    const currentMonthGst = await getGstBillFolders(currentMonthLabel);
    const lastMonthGst = await getGstBillFolders(lastMonthLabel);

    // 5. Recent Activities (Folders)
    const recentActivities = await prisma.folder.findMany({
        where: {
            clientId: clientId,
            isDeleted: false
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 6
    });

    // 6. Get CA Banners
    const banners = await prisma.banner.findMany({
        where: {
            caId: caId,
            isActive: true
        },
        orderBy: {
            order: 'asc'
        }
    });

    res.json({
        success: true,
        data: {
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                mobileNumber: client.mobileNumber,
                panNumber: client.panNumber,
                dob: client.dob,
                address: client.address,
                fileNumber: client.fileNumber,
                type: client.type,
                groupName: client.groupName,
                tradeName: client.tradeName,
                gstNumber: client.gstNumber,
                tanNumber: client.tanNumber,
                isActive: client.isActive
            },
            ca: {
                caId: client.caId,
                name: client.ca?.name || 'My CA',
                email: client.ca?.email,
                phone: client.ca?.phone
            },
            notifications: notifications.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                time: n.createdAt,
                isRead: n.isRead
            })),
            banners: banners.map(b => ({
                id: b.id,
                title: b.title,
                imageUrl: b.imageUrl,
                isActive: b.isActive
            })),
            quickDocuments,
            gstSection: {
                title: 'GST Document',
                current: currentMonthGst.map(f => ({
                    id: f.id,
                    name: f.name,
                    updatedAt: f.updatedAt
                })),
                last: lastMonthGst.map(f => ({
                    id: f.id,
                    name: f.name,
                    updatedAt: f.updatedAt
                }))
            },
            recentActivities: recentActivities.map(f => ({
                id: f.id,
                name: f.name,
                updatedAt: f.updatedAt
            }))
        }
    });
});

exports.getMobileFolderStructure = catchAsync(async (req, res) => {
    const { clientId } = req.body;

    // 1. Get ALL root and subfolders for this client (predefined or otherwise)
    const allFolders = await prisma.folder.findMany({
        where: {
            clientId: clientId,
            isDeleted: false
        },
        orderBy: [
            { name: 'desc' } // Newer years first
        ]
    });

    if (!allFolders || allFolders.length === 0) {
        return res.json({ success: true, data: [] });
    }

    // 2. Compute current month name for indicator
    const currentMonthNum = new Date().getMonth();
    const monthMap = {
        3: 'APRIL', 4: 'MAY', 5: 'JUNE', 6: 'JULY', 7: 'AUGUST', 8: 'SEPTEMBER',
        9: 'OCTOBER', 10: 'NOVEMBER', 11: 'DECEMBER', 0: 'JANUARY', 1: 'FEBRUARY', 2: 'MARCH'
    };
    const currentMonthName = monthMap[currentMonthNum];

    // 3. Organise into a simple tree structure (FY -> Category -> Month)
    // Filter root level (Years usually)
    const rootFolders = allFolders.filter(f => f.parentFolderId === null);

    const hierarchy = rootFolders.map(yearFolder => {
        // Find categories inside this Year (GST, ITR, TDS)
        const categories = allFolders.filter(f => f.parentFolderId === yearFolder.id);

        return {
            id: yearFolder.id,
            year: yearFolder.name,
            categories: categories.map(catFolder => {
                // Find items inside this Category (Months or direct folders)
                const children = allFolders.filter(f => f.parentFolderId === catFolder.id);

                return {
                    id: catFolder.id,
                    name: catFolder.name,
                    folders: children.map(month => {
                        // Find items inside this Month (e.g. Purchase Bill, Sale Bill)
                        const subFolders = allFolders.filter(f => f.parentFolderId === month.id);

                        return {
                            id: month.id,
                            name: month.name,
                            updatedAt: month.updatedAt,
                            isCurrentMonth: month.name.includes(currentMonthName),
                            subFolders: subFolders.map(sf => {
                                // ✅ Also include user-created subfolders one level deeper
                                const subSubFolders = allFolders.filter(f => f.parentFolderId === sf.id);
                                return {
                                    id: sf.id,
                                    name: sf.name,
                                    updatedAt: sf.updatedAt,
                                    subFolders: subSubFolders.map(ssf => ({
                                        id: ssf.id,
                                        name: ssf.name,
                                        updatedAt: ssf.updatedAt
                                    }))
                                };
                            })
                        };
                    })
                };
            })
        };
    });

    return res.json({
        success: true,
        data: hierarchy
    });
});

// Mobile Folder CRUD
exports.createMobileFolder = catchAsync(async (req, res) => {
    const { name, clientId, parentFolderId, category } = req.body;

    if (!name || !clientId) {
        return res.status(400).json({ success: false, error: 'Name and clientId are required' });
    }

    let path = [];
    let finalCategory = category || 'GENERAL';

    if (parentFolderId) {
        const parent = await prisma.folder.findUnique({
            where: { id: parentFolderId }
        });
        if (parent) {
            path = [...(parent.path || []), { id: parent.id, name: parent.name }];
            finalCategory = parent.category; // Inherit category from parent
        }
    }

    const newFolder = await prisma.folder.create({
        data: {
            name,
            client: { connect: { id: clientId } },
            category: finalCategory,
            parentFolder: parentFolderId ? { connect: { id: parentFolderId } } : undefined,
            path
        }
    });

    res.status(201).json({
        success: true,
        data: { ...newFolder, _id: newFolder.id }
    });
});

exports.updateMobileFolder = catchAsync(async (req, res) => {
    const { folderId, name, parentFolderId } = req.body;

    if (!folderId) {
        return res.status(400).json({ success: false, error: 'folderId is required' });
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' });

    if (folder.isPredefined) {
        return res.status(400).json({ success: false, error: 'System folders cannot be edited.' });
    }

    let updateData = {};
    if (name) updateData.name = name;

    if (parentFolderId !== undefined) {
        updateData.parentFolderId = parentFolderId || null;
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
        where: { id: folderId },
        data: updateData
    });

    res.json({
        success: true,
        data: { ...updatedFolder, _id: updatedFolder.id }
    });
});

exports.deleteMobileFolder = catchAsync(async (req, res) => {
    const { folderId } = req.body;

    if (!folderId) {
        return res.status(400).json({ success: false, error: 'folderId is required' });
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return res.status(404).json({ success: false, error: 'Folder not found' });

    if (folder.isPredefined) {
        return res.status(400).json({ success: false, error: 'System folders cannot be deleted.' });
    }

    // Check if empty
    const [subfolder, file] = await Promise.all([
        prisma.folder.findFirst({ where: { parentFolderId: folderId, isDeleted: false } }),
        prisma.document.findFirst({ where: { folderId: folderId, isDeleted: false } })
    ]);

    if (subfolder || file) {
        return res.status(400).json({ success: false, error: 'Cannot delete non-empty folder.' });
    }

    // Soft Delete
    await prisma.folder.update({
        where: { id: folderId },
        data: {
            isDeleted: true,
            deletedAt: new Date()
        }
    });

    res.json({
        success: true,
        message: 'Folder moved to Recycle Bin'
    });
});

// Mobile File CRUD
exports.uploadMobileFile = catchAsync(async (req, res) => {
    const { folderId, uploadedBy, category, clientId: bodyClientId, fileName: customFileName, docId } = req.body;
    const clientId = bodyClientId;

    if (!clientId) {
        return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const clientDoc = await prisma.client.findUnique({
        where: { id: clientId },
        select: { caId: true, name: true }
    });

    if (!clientDoc || !clientDoc.caId) {
        return res.status(404).json({ success: false, error: 'Client/CA not found' });
    }

    const bucketName = `ca-${clientDoc.caId}`;
    const safeCategory = (category || 'GENERAL').toLowerCase();
    const timestampedName = `${Date.now()}-${req.file.originalname}`;
    const filePath = `client_${clientId}/${safeCategory}/${timestampedName}`;

    // Upload to Storage (MinIO)
    await storageUpload(bucketName, filePath, req.file.buffer, {
        'Content-Type': req.file.mimetype
    });

    // Store relative path (filePath) in DB instead of direct MinIO URL
    const fullUrl = filePath;

    let document;
    if (docId) {
        // Update existing document (e.g., a KYC placeholder)
        document = await prisma.document.update({
            where: { id: docId },
            data: {
                fileName: req.file.originalname,
                displayName: customFileName || req.file.originalname,
                fileUrl: fullUrl,
                cloudinaryId: filePath,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                uploadedBy: uploadedBy || 'CUSTOMER',
                category: category || undefined,
                folderId: folderId || undefined
            }
        });
    } else {
        // Create new document
        document = await prisma.document.create({
            data: {
                client: { connect: { id: clientId } },
                folder: (folderId && folderId !== "") ? { connect: { id: folderId } } : undefined,
                fileName: req.file.originalname,
                displayName: customFileName || req.file.originalname,
                fileUrl: fullUrl,
                cloudinaryId: filePath,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                uploadedBy: uploadedBy || 'CUSTOMER',
                category: category || 'GENERAL'
            }
        });
    }

    // Log Activity
    await logActivity({
        caId: clientDoc.caId,
        action: docId ? 'UPDATE_FILE' : 'UPLOAD_FILE',
        details: `${docId ? 'Updated' : 'Uploaded'} file via mobile: ${document.displayName}`,
        clientId,
        docId: document.id
    });

    res.status(201).json({
        success: true,
        data: {
            ...document,
            _id: document.id,
            fileUrl: getFileProxyUrl(req, document.id)
        }
    });
});

exports.getFolderDocuments = catchAsync(async (req, res) => {
    const { folderId, clientId } = req.body;

    if (!clientId) {
        return res.status(400).json({ success: false, message: 'clientId is required' });
    }

    const where = {
        clientId,
        isDeleted: false,
    };

    if (folderId && folderId !== "") {
        where.folderId = folderId;
    } else {
        where.folderId = null; // Root documents
    }

    const documents = await prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        success: true,
        data: documents.map(doc => ({
            ...doc,
            _id: doc.id,
            fileUrl: getFileProxyUrl(req, doc.id)
        }))
    });
});

exports.deleteMobileFile = catchAsync(async (req, res) => {
    const { fileId, clientId } = req.body;

    if (!fileId) {
        return res.status(400).json({ success: false, error: 'fileId is required' });
    }

    const file = await prisma.document.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) {
        return res.status(404).json({ success: false, error: 'File not found' });
    }

    await prisma.document.update({
        where: { id: fileId },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: clientId || 'MOBILE'
        }
    });

    res.json({
        success: true,
        message: 'File moved to Recycle Bin'
    });
});

exports.updateMobileProfile = catchAsync(async (req, res) => {
    const { clientId, name, mobileNumber, email, dob, address, tradeName, gstNumber, tanNumber, gstId, gstPassword, groupName, panNumber } = req.body;

    if (!clientId) {
        return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    // 1. Validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (panNumber && !panRegex.test(panNumber)) {
        return res.status(400).json({ success: false, error: 'Invalid PAN number format' });
    }

    if (gstNumber && panNumber) {
        if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
            return res.status(400).json({ success: false, error: 'GST Number does not match PAN Number' });
        }
    }

    // 2. Update Client
    const updatedClient = await prisma.client.update({
        where: { id: clientId },
        data: {
            name,
            mobileNumber,
            email,
            dob: dob ? new Date(dob) : undefined,
            address,
            tradeName,
            gstNumber,
            tanNumber,
            gstId,
            gstPassword,
            groupName,
            panNumber
        }
    });

    // 3. Trigger folder generation check (idempotent)
    const { generateClientFolders } = require('../services/folderService');
    await generateClientFolders(clientId, updatedClient);

    // 4. Log Activity
    await logActivity({
        caId: updatedClient.caId,
        action: 'UPDATE_CLIENT_PROFILE',
        details: `Updated profile for client: ${updatedClient.name} via mobile`,
        clientId: updatedClient.id
    });

    res.json({
        success: true,
        data: { ...updatedClient, _id: updatedClient.id }
    });
});

exports.getMobileClientData = catchAsync(async (req, res) => {
    const { clientId } = req.body;

    if (!clientId) {
        return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    const client = await prisma.client.findUnique({
        where: { id: clientId }
    });

    if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({
        success: true,
        data: {
            ...client,
            _id: client.id
        }
    });
});

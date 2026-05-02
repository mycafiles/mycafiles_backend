const fs = require("fs")
const csv = require("csv-parser")
const path = require('path');
const Client = require("../models/Client")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/AppError")
const prisma = require('../config/prisma');
const logger = require("../utils/logger")
const Folder = require("../models/Folder")
const Document = require("../models/Document")
const { generateClientFolders, deleteFolder: deleteFolderService } = require("../services/folderService")
const { createBucket, createFolder, deleteFolder } = require('../services/storageService');
const { logActivity } = require('../services/activityService');
const XLSX = require('xlsx');
const { getFileProxyUrl } = require('../utils/urlHelper');
const { generate8DigitUniqueId } = require('../utils/idGenerator');
const clientRepository = require('../repositories/clientRepository');
const clientService = require('../services/clientService');

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

exports.createClient = catchAsync(async (req, res, next) => {
    const { name, mobileNumber, panNumber, email, dob, address, type, tradeName, gstNumber, tanNumber, gstId, gstPassword, groupName, customFields } = req.body
    const caId = req.user.id // From auth middleware
    logger.debug(`User ID: ${caId}`);

    // ✅ GST validation
    if (gstNumber && panNumber) {
        if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
            return next(new AppError('GST Number does not match the provided PAN Number', 400));
        }
    }

    // ✅ PAN duplicate check
    const existingClient = await clientRepository.findClientByPan(panNumber);
    if (existingClient) {
        return next(new AppError('Client with this PAN already exists', 400));
    }

    // ✅ File number
    const lastClient = await clientRepository.findLastClientByCa(caId);
    const fileNumber = lastClient && lastClient.fileNumber ? lastClient.fileNumber + 1 : 1;

    const uniqueId = await generate8DigitUniqueId('client');

    let client;
    try {
        const isGstPresent = gstNumber && gstNumber.trim() !== "" && gstNumber.trim() !== "-";
        client = await clientRepository.createClient({
            caId,
            name,
            mobileNumber,
            panNumber,
            email,
            dob: dob ? new Date(dob) : null,
            address,
            type: isGstPresent ? 'BUSINESS' : 'INDIVIDUAL',
            tradeName,
            gstNumber,
            tanNumber,
            gstId,
            gstPassword,
            groupName,
            customFields,
            fileNumber,
            uniqueId
        });
    } catch (err) {
        if (err.code === 'P2002' && err.meta?.target?.includes('panNumber')) {
            return next(new AppError('This PAN is already registered under another CA', 400));
        }
        return next(new AppError(err.message, 500));
    }

    // MinIO: Create Folder for Client (ca-{id}/client_{id}/)
    const bucketName = `ca-${caId}`;
    // Ensure bucket exists (for existing CAs who didn't trigger registration hook)
    const { createBucket } = require('../services/storageService');
    await createBucket(bucketName);

    await createFolder(bucketName, `client_${client.id}`);

    // Background: Create Folder structure for Client (GST, TDS, ITR, etc.)
    generateClientFolders(client.id, client).catch(err => logger.error(`Background folder generation error for client ${client.id}: ${err.message}`));

    await logActivity({
        caId,
        action: 'CREATE_CLIENT',
        details: `Created new client: ${client.name} (${client.panNumber})`,
        clientId: client.id,
        clientName: client.name
    });

    logger.info(`Client created: ${client.id} by CA: ${caId}`)
    res.status(201).json({
        status: 'success',
        data: { ...client, _id: client.id }
    })
})

// @desc    Get All Clients for a CA
// @route   GET /api/client
// @access  Private (CA)
exports.viewClients = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    const clients = await clientRepository.findClientsByCa(caId);
    const formattedClients = clientService.mapClientListWithLegacyId(clients);

    res.status(200).json({
        status: 'success',
        results: formattedClients.length,
        data: formattedClients
    });
});

exports.checkPanExists = catchAsync(async (req, res, next) => {
    const { panNumber } = req.params;

    if (!panNumber) {
        return next(new AppError('PAN Number is required', 400));
    }

    const existingClient = await clientRepository.findClientByPan(panNumber.toUpperCase());

    res.status(200).json({
        status: 'success',
        exists: !!existingClient,
        clientName: existingClient ? existingClient.name : null
    });
});


// @desc    Get All GST Clients for a CA
// @route   GET /api/client/gst
// @access  Private (CA)
exports.getGSTClients = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    const bucketName = `ca-${caId}`;

    const clients = await clientRepository.findCategorizedClients({
        caId,
        gstNumber: { not: null },
        NOT: { gstNumber: "" }
    });
    const formattedClients = clientService.mapCategorizedClients(req, clients);

    res.status(200).json({
        status: 'success',
        results: formattedClients.length,
        data: formattedClients
    });
});

// @desc    Get All ITR Clients for a CA
// @route   GET /api/client/itr
// @access  Private (CA)
exports.getITRClients = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    const bucketName = `ca-${caId}`;

    const clients = await clientRepository.findCategorizedClients({
        caId: caId,
        NOT: { panNumber: "" }
    });
    const formattedClients = clientService.mapCategorizedClients(req, clients);

    res.status(200).json({
        status: 'success',
        results: formattedClients.length,
        data: formattedClients
    });
});

// @desc    Get All TDS Clients for a CA
// @route   GET /api/client/tds
// @access  Private (CA)
exports.getTDSClients = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    const bucketName = `ca-${caId}`;

    const clients = await clientRepository.findCategorizedClients({
        caId,
        tanNumber: { not: null },
        NOT: { tanNumber: "" }
    });
    const formattedClients = clientService.mapCategorizedClients(req, clients);

    res.status(200).json({
        status: 'success',
        results: formattedClients.length,
        data: formattedClients
    });
});

// @desc    Get All KYC Clients for a CA (Clients who have KYC documents)
// @route   GET /api/client/get-kyc-clients
// @access  Private (CA)
exports.getKYCClients = catchAsync(async (req, res, next) => {
    const caId = req.user.id;

    const clients = await clientRepository.findCategorizedClients({
        caId,
        documents: {
            some: {
                category: 'KYC',
                isDeleted: false,
                cloudinaryId: { not: "" },
                fileUrl: { not: "" }
            }
        }
    });
    const formattedClients = clientService.mapCategorizedClients(req, clients);

    res.status(200).json({
        status: 'success',
        results: formattedClients.length,
        data: formattedClients
    });
});

// @desc    Get All Clients in a Specific Group
// @route   GET /api/client/group/:groupName
// @access  Private (CA or Client)
exports.getClientsByGroupName = catchAsync(async (req, res, next) => {
    let { groupName } = req.params;
    logger.debug(`groupName: ${groupName}`);

    // If no groupName in params, we could also check if the current user is a Client 
    // and use their specific groupName if they belong to one
    if (!groupName || groupName === "mygroup") {
        if (req.user.role === 'CUSTOMER') {
            const client = await clientRepository.findClientGroupName(req.user.id);
            groupName = client?.groupName;
        }
    }

    if (!groupName) {
        return res.status(200).json({
            status: 'success',
            results: 0,
            data: []
        });
    }

    const clients = await clientRepository.findClientsByGroupName(groupName);

    const formattedClients = clients.map(c => ({
        ...c,
        _id: c.id,
        avatar: "/users/user1.png" // Mock avatar as per Navbar
    }));

    res.status(200).json({
        status: 'success',
        results: formattedClients.length,
        data: formattedClients
    });
});

// 1. GET ALL (Eager Load - Same as before)
exports.getClientData = async (req, res) => {
    try {
        const { clientId } = req.params;
        const [client, folders, files] = await clientRepository.findClientDataById(clientId);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const payload = clientService.buildClientDataResponse(req, client, folders, files);
        res.json(payload);
    } catch (err) {
        logger.error(`getClientData Error: ${err.message}`);
        res.status(500).json({ error: 'Server Error' });
    }
};



// @desc    Edit Client
// @route   PUT /api/client/:id
// @access  Private (CA)
exports.editClient = catchAsync(async (req, res, next) => {
    const { panNumber } = req.body
    const caId = req.user.id

    if (panNumber && !clientService.isValidPanFormat(panNumber)) {
        return next(new AppError('Invalid PAN number format', 400))
    }

    const updateData = clientService.buildClientUpdatePayload(req.body);

    const client = await clientRepository.updateClientByIdAndCa(req.params.id, caId, updateData);

    if (!client) {
        return next(new AppError('No client found with that ID associated with your account', 404))
    }

    // Trigger folder generation check (idempotent, so only identifies missing folders)
    const { generateClientFolders: generateFoldersBackground } = require('../services/folderService');
    generateFoldersBackground(client.id, client).catch(err => logger.error(`Background folder update error for client ${client.id}: ${err.message}`));


    await logActivity({
        caId,
        action: 'UPDATE_CLIENT',
        details: `Updated details for client: ${client.name}`,
        clientId: client.id,
        clientName: client.name
    });

    logger.info(`Client updated: ${req.params.id} by CA: ${caId}`)
    res.status(200).json({
        status: 'success',
        data: { ...client, _id: client.id }
    })
})

// @desc    Update Client Status
// @route   PUT /api/client/update-status/:id
// @access  Private (CA)
exports.updateClientStatus = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    const clientId = req.params.id;
    const { status } = req.body;

    const client = await clientRepository.updateClientStatus(clientId, caId, status);

    if (!client) {
        return next(new AppError('No client found with that ID associated with your account', 404));
    }

    await logActivity({
        caId,
        action: 'UPDATE_CLIENT',
        details: `Updated status to ${status ? 'Active' : 'Inactive'} for client: ${client.name}`,
        clientId: client.id,
        clientName: client.name
    });

    logger.info(`Client status updated: ${clientId} by CA: ${caId}`);
    res.status(200).json({
        status: 'success',
        data: { ...client, _id: client.id }
    });
});

// @desc    Delete Client
// @route   DELETE /api/client/:id
// @access  Private (CA)
exports.deleteClient = catchAsync(async (req, res, next) => {
    const caId = req.user.id
    const clientId = req.params.id

    // 1. Find Client
    const client = await clientRepository.findClientByIdAndCa(clientId, caId)

    if (!client) {
        return next(new AppError('No client found with that ID associated with your account', 404))
    }

    // 2. Delete Physical Files from MinIO
    // Structure: ca-{caId}/client_{clientId}/
    const bucketName = `ca-${caId}`;
    const clientFolderPath = `client_${clientId}/`;

    try {
        await deleteFolder(bucketName, clientFolderPath);
    } catch (err) {
        logger.error(`Failed to delete client folder from storage: ${err.message}`);
        // Proceed with DB deletion regardless? 
        // Yes, ensuring DB is clean is priority to prevent "ghost" clients.
    }

    // 3. Delete Documents from DB (Prisma will handle this soon, but for now we'll do it explicitly)
    await clientRepository.deleteDocumentsByClient(clientId);

    // 4. Delete Folders from DB
    await clientRepository.deleteFoldersByClient(clientId);

    // 5. Delete Client from DB
    await clientRepository.deleteClientModel(clientId);

    await logActivity({
        caId,
        action: 'DELETE_CLIENT',
        details: `Deleted client (CASCADE): ${client.name}`,
        clientId: client.id,
        clientName: client.name
    });

    logger.info(`Client deleted (CASCADE): ${clientId} by CA: ${caId}`)
    res.status(200).json({
        status: 'success',
        message: 'Client and all associated data deleted successfully'
    })
})

// @desc    Bulk Upload Clients
// @route   POST /api/client/bulk
// @access  Private (CA)
exports.bulkUploadClients = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload a CSV or Excel file', 400))
    }

    const caId = req.user.id
    let clients = []
    const errors = []
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Get last file number for this CA
    const lastClient = await clientRepository.findLastClientByCa(caId);
    let currentFileNumber = lastClient && lastClient.fileNumber ? lastClient.fileNumber : 0;

    try {
        if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' }); // Read dates as strings if possible

            data.forEach((row, index) => {
                const name = row.name || row.Name || 'Unknown';
                const mobileNumber = row.mobileNumber || row['Mobile Number'] || row.mobile || row.Mobile || 'N/A';
                const panNumber = row.panNumber || row['PAN Number'] || row.pan || row.PAN;
                const dob = row.dob || row.DOB || row['Date of Birth'];
                const result_tradeName = row.tradeName || row.tradeNumber || row['Trade Number'] || row['Trade Name'];
                const result_email = row.email || row.Email || row['Email Address'];
                const result_groupName = row.groupName || row['Group Name'] || row.group || row.Group;
                const result_gstId = row.gstId || row['GST ID'] || row['GST User'] || row['GST Username'];
                const result_gstPassword = row.gstPassword || row['GST Password'];
                const result_address = row.address || row.Address;

                const gstNumber = row.gstNumber || row['GST Number'] || row.gst || row.GST;
                const tanNumber = row.tanNumber || row['TAN Number'] || row.tan || row.TAN;

                if (!name || !mobileNumber || !panNumber) {
                    errors.push({
                        row: index + 2,
                        error: 'Missing required fields (name, mobileNumber, panNumber)',
                        clientName: name,
                        panNumber: panNumber || 'N/A',
                        mobileNumber: mobileNumber
                    });
                    return;
                }

                if (!panRegex.test(panNumber)) {
                    errors.push({
                        row: index + 2,
                        error: `Invalid PAN format: ${panNumber}`,
                        clientName: name,
                        panNumber: panNumber,
                        mobileNumber: mobileNumber
                    })
                    return
                }

                // Validation: GST-PAN Match
                if (gstNumber && panNumber) {
                    if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
                        errors.push({
                            row: index + 2,
                            error: `GST Number does not match PAN`,
                            clientName: name,
                            panNumber: panNumber,
                            mobileNumber: mobileNumber,
                            gstNumber: gstNumber
                        });
                        return;
                    }
                }

                currentFileNumber++;

                clients.push({
                    caId,
                    name,
                    mobileNumber: String(mobileNumber),
                    panNumber: panNumber.toUpperCase(),
                    email: result_email,
                    gstNumber,
                    tanNumber,
                    tradeName: result_tradeName,
                    gstId: result_gstId,
                    gstPassword: result_gstPassword,
                    address: result_address,
                    dob: dob ? new Date(dob) : null,
                    groupName: result_groupName,
                    fileNumber: currentFileNumber,
                    type: (gstNumber && gstNumber.trim() !== "" && gstNumber.trim() !== "-") ? 'BUSINESS' : 'INDIVIDUAL',
                    customFields: [],
                    rowNumber: index + 2
                });
            });

            // Clean up file
            fs.unlinkSync(req.file.path);

            if (clients.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'No valid clients found in file',
                    errors
                });
            }

            // Deduplicate within the file itself
            const uniqueClients = [];
            const seenPanInFile = new Set();
            clients.forEach(c => {
                const pan = c.panNumber.toUpperCase().trim();
                if (!seenPanInFile.has(pan)) {
                    seenPanInFile.add(pan);
                    c.panNumber = pan; // Ensure clean PAN
                    uniqueClients.push(c);
                } else {
                    errors.push({
                        row: c.rowNumber,
                        error: 'Duplicate PAN within file',
                        clientName: c.name,
                        panNumber: c.panNumber,
                        mobileNumber: c.mobileNumber
                    });
                }
            });

            // Check for duplicates in DB
            const panNumbers = uniqueClients.map(c => c.panNumber);
            const gstNumbers = uniqueClients.map(c => c.gstNumber).filter(g => g && g.trim() !== "");

            const [existingClientsPan, existingClientsGst] = await Promise.all([
                clientRepository.findExistingClientsByPan(panNumbers),
                gstNumbers.length > 0 ? clientRepository.findExistingClientsByGst(gstNumbers) : Promise.resolve([])
            ]);

            const existingPanSet = new Set(existingClientsPan.map(c => c.panNumber));
            const existingGstSet = new Set(existingClientsGst.map(c => c.gstNumber));

            logger.info(`[BulkUpload] File count: ${clients.length}, Unique in File: ${uniqueClients.length}, Existing Pan in DB: ${existingClientsPan.length}, Existing Gst in DB: ${existingClientsGst.length}`);

            // If a record exists in DB, add to errors and filter out
            const finalClientsToCreate = [];
            uniqueClients.forEach(c => {
                if (existingPanSet.has(c.panNumber)) {
                    errors.push({
                        row: c.rowNumber,
                        error: 'Client with this PAN already exists in database',
                        clientName: c.name,
                        panNumber: c.panNumber,
                        mobileNumber: c.mobileNumber
                    });
                } else if (c.gstNumber && existingGstSet.has(c.gstNumber)) {
                    errors.push({
                        row: c.rowNumber,
                        error: 'Client with this GST Number already exists in database',
                        clientName: c.name,
                        panNumber: c.panNumber,
                        gstNumber: c.gstNumber,
                        mobileNumber: c.mobileNumber
                    });
                } else {
                    finalClientsToCreate.push(c);
                }
            });

            if (finalClientsToCreate.length === 0) {
                return res.status(200).json({
                    status: 'success',
                    message: 'All clients in the file already exist or were invalid.',
                    errors: errors.sort((a, b) => a.row - b.row),
                    count: 0,
                    skipped: clients.length
                });
            }

            const createdClients = [];
            for (const clientData of finalClientsToCreate) {
                try {
                    clientData.uniqueId = await generate8DigitUniqueId('client');
                    const created = await clientRepository.createClient(clientData);
                    createdClients.push(created);
                } catch (createErr) {
                    // ✅ HANDLE DUPLICATE PAN/GST ERROR CLEANLY
                    if (createErr.code === 'P2002') {
                        const target = createErr.meta?.target || [];
                        if (target.includes('panNumber')) {
                            errors.push({
                                row: clientData.rowNumber || 'N/A',
                                error: 'This PAN is already registered in the system',
                                clientName: clientData.name,
                                panNumber: clientData.panNumber,
                                mobileNumber: clientData.mobileNumber
                            });
                        } else if (target.includes('gstNumber')) {
                            errors.push({
                                row: clientData.rowNumber || 'N/A',
                                error: 'This GST Number is already registered in the system',
                                clientName: clientData.name,
                                panNumber: clientData.panNumber,
                                gstNumber: clientData.gstNumber,
                                mobileNumber: clientData.mobileNumber
                            });
                        } else {
                            errors.push({
                                row: clientData.rowNumber || 'N/A',
                                error: `Database Constraint Error: ${target.join(', ')}`,
                                clientName: clientData.name,
                                panNumber: clientData.panNumber,
                                mobileNumber: clientData.mobileNumber
                            });
                        }
                    } else {
                        logger.error(`Error creating client ${clientData.name}: ${createErr.message}`);
                        errors.push({
                            row: clientData.rowNumber || 'N/A',
                            error: `Database Error: ${createErr.message}`,
                            clientName: clientData.name,
                            panNumber: clientData.panNumber,
                            mobileNumber: clientData.mobileNumber
                        });
                    }
                }
            }

            await logActivity({
                caId,
                action: 'CREATE_CLIENT',
                details: `Bulk uploaded ${createdClients.length} clients successfully`,
            });

            // Generate Folders in Background (Batched to prevent overload)
            const batchSize = 50;
            for (let i = 0; i < createdClients.length; i += batchSize) {
                const batch = createdClients.slice(i, i + batchSize);
                // Do not await - allow to run in background
                Promise.all(batch.map(client => generateClientFolders(client.id, client)))
                    .catch(err => logger.error(`Bulk background folder generation error: ${err.message}`));
            }


            return res.status(201).json({
                status: 'success',
                count: createdClients.length,
                skipped: clients.length - createdClients.length,
                errors: errors.length > 0 ? errors.sort((a, b) => a.row - b.row) : undefined,
                data: createdClients.map(c => ({ ...c, _id: c.id }))
            });

        } else {
            // Existing CSV Logic
            let rowNumber = 1
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (row) => {
                    rowNumber++
                    const name = row.name || row.Name || 'Unknown';
                    const mobileNumber = row.mobileNumber || row.mobile || row.Mobile || 'N/A';
                    const panNumber = row.panNumber || row.pan || row.PAN;
                    const dobValue = row.dob || row.DOB || row['Date of Birth'];
                    const result_tradeName = row.tradeName || row.tradeNumber || row['Trade Number'] || row.tradeNumber;
                    const result_email = row.email || row.Email || row['Email Address'];
                    const result_groupName = row.groupName || row['Group Name'] || row.group || row.Group;
                    const result_gstId = row.gstId;
                    const result_gstPassword = row.gstPassword;
                    const result_address = row.address;

                    const gstNumber = row.gstNumber || row.gst;
                    const tanNumber = row.tanNumber || row.tan;

                    if (!name || !mobileNumber || !panNumber) {
                        errors.push({
                            row: rowNumber,
                            error: 'Missing required fields',
                            clientName: name,
                            panNumber: panNumber || 'N/A',
                            mobileNumber: mobileNumber
                        })
                        return
                    }

                    if (!panRegex.test(panNumber)) {
                        errors.push({
                            row: rowNumber,
                            error: `Invalid PAN format: ${panNumber}`,
                            clientName: name,
                            panNumber: panNumber,
                            mobileNumber: mobileNumber
                        })
                        return
                    }

                    // Validation: GST-PAN Match
                    if (gstNumber && panNumber) {
                        if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
                            errors.push({
                                row: rowNumber,
                                error: `GST Number does not match PAN`,
                                clientName: name,
                                panNumber: panNumber,
                                mobileNumber: mobileNumber,
                                gstNumber: gstNumber
                            });
                            return;
                        }
                    }

                    currentFileNumber++;

                    clients.push({
                        caId,
                        name,
                        mobileNumber: String(mobileNumber),
                        panNumber: panNumber.toUpperCase(),
                        email: result_email,
                        gstNumber,
                        tanNumber,
                        tradeName: result_tradeName,
                        gstId: result_gstId,
                        gstPassword: result_gstPassword,
                        address: result_address,
                        dob: dobValue ? new Date(dobValue) : null,
                        groupName: result_groupName,
                        fileNumber: currentFileNumber,
                        type: gstNumber ? 'BUSINESS' : 'INDIVIDUAL',
                        customFields: row.customFields ? JSON.parse(row.customFields) : [],
                        rowNumber: rowNumber
                    })
                })
                .on('end', async () => {
                    try {
                        fs.unlinkSync(req.file.path)

                        if (clients.length === 0) {
                            return res.status(400).json({
                                status: 'fail',
                                message: 'No valid clients found in CSV',
                                errors
                            })
                        }

                        // Deduplicate within the file itself
                        const uniqueClients = [];
                        const seenPanInFile = new Set();
                        clients.forEach(c => {
                            const pan = (c.panNumber || '').toUpperCase().trim();
                            if (!pan) return;
                            if (!seenPanInFile.has(pan)) {
                                seenPanInFile.add(pan);
                                c.panNumber = pan;
                                uniqueClients.push(c);
                            } else {
                                errors.push({
                                    row: c.rowNumber,
                                    error: 'Duplicate PAN within file',
                                    clientName: c.name,
                                    panNumber: c.panNumber,
                                    mobileNumber: c.mobileNumber
                                });
                            }
                        });

                        const csvPanNumbers = uniqueClients.map(c => c.panNumber);
                        const csvGstNumbers = uniqueClients.map(c => c.gstNumber).filter(g => g && g.trim() !== "");

                        const [existingClientsPan, existingClientsGst] = await Promise.all([
                            clientRepository.findExistingClientsByPan(csvPanNumbers),
                            csvGstNumbers.length > 0 ? clientRepository.findExistingClientsByGst(csvGstNumbers) : Promise.resolve([])
                        ]);

                        const existingPanSet = new Set(existingClientsPan.map(c => c.panNumber));
                        const existingGstSet = new Set(existingClientsGst.map(c => c.gstNumber));

                        logger.info(`[BulkUpload-CSV] File: ${clients.length}, Unique: ${uniqueClients.length}, Existing Pan: ${existingClientsPan.length}, Existing Gst: ${existingClientsGst.length}`);

                        const finalClientsToCreate = [];
                        uniqueClients.forEach(c => {
                            if (existingPanSet.has(c.panNumber)) {
                                errors.push({
                                    row: c.rowNumber,
                                    error: 'Client with this PAN already exists in database',
                                    clientName: c.name,
                                    panNumber: c.panNumber,
                                    mobileNumber: c.mobileNumber
                                });
                            } else if (c.gstNumber && existingGstSet.has(c.gstNumber)) {
                                errors.push({
                                    row: c.rowNumber,
                                    error: 'Client with this GST Number already exists in database',
                                    clientName: c.name,
                                    panNumber: c.panNumber,
                                    gstNumber: c.gstNumber,
                                    mobileNumber: c.mobileNumber
                                });
                            } else {
                                finalClientsToCreate.push(c);
                            }
                        });

                        if (finalClientsToCreate.length === 0) {
                            return res.status(200).json({
                                status: 'success',
                                message: 'All clients in the CSV already exist or were invalid.',
                                errors: errors.sort((a, b) => (a.row || 0) - (b.row || 0)),
                                count: 0,
                                skipped: clients.length
                            });
                        }

                        const createdClients = [];
                        for (const clientData of finalClientsToCreate) {
                            try {
                                clientData.uniqueId = await generate8DigitUniqueId('client');
                                const created = await clientRepository.createClient(clientData);
                                createdClients.push(created);
                            } catch (createErr) {
                                // ✅ HANDLE DUPLICATE PAN/GST ERROR CLEANLY
                                if (createErr.code === 'P2002') {
                                    const target = createErr.meta?.target || [];
                                    if (target.includes('panNumber')) {
                                        errors.push({
                                            row: clientData.rowNumber || 'N/A',
                                            error: 'This PAN is already registered in the system',
                                            clientName: clientData.name,
                                            panNumber: clientData.panNumber,
                                            mobileNumber: clientData.mobileNumber
                                        });
                                    } else if (target.includes('gstNumber')) {
                                        errors.push({
                                            row: clientData.rowNumber || 'N/A',
                                            error: 'This GST Number is already registered in the system',
                                            clientName: clientData.name,
                                            panNumber: clientData.panNumber,
                                            gstNumber: clientData.gstNumber,
                                            mobileNumber: clientData.mobileNumber
                                        });
                                    } else {
                                        errors.push({
                                            row: clientData.rowNumber || 'N/A',
                                            error: `Database Constraint Error: ${target.join(', ')}`,
                                            clientName: clientData.name,
                                            panNumber: clientData.panNumber,
                                            mobileNumber: clientData.mobileNumber
                                        });
                                    }
                                } else {
                                    logger.error(`Error creating client ${clientData.name}: ${createErr.message}`);
                                    errors.push({
                                        row: clientData.rowNumber || 'N/A',
                                        error: `Database Error: ${createErr.message}`,
                                        clientName: clientData.name,
                                        panNumber: clientData.panNumber,
                                        mobileNumber: clientData.mobileNumber
                                    });
                                }
                            }
                        }

                        // Generate Folders in Background (Batched to prevent overload)
                        const batchSize = 50;
                        for (let i = 0; i < createdClients.length; i += batchSize) {
                            const batch = createdClients.slice(i, i + batchSize);
                            // Do not await - allow to run in background
                            Promise.all(batch.map(client => generateClientFolders(client.id, client)))
                                .catch(err => logger.error(`Bulk background folder generation error (CSV): ${err.message}`));
                        }


                        logger.info(`Bulk upload (CSV): ${createdClients.length} clients created by CA: ${caId}`);
                        res.status(201).json({
                            status: 'success',
                            count: createdClients.length,
                            skipped: clients.length - createdClients.length,
                            errors: errors.length > 0 ? errors.sort((a, b) => (a.row || 0) - (b.row || 0)) : undefined,
                            data: createdClients.map(c => ({ ...c, _id: c.id }))
                        });
                    } catch (err) {
                        logger.error(`Bulk upload (CSV) error: ${err.message}`);
                        return next(new AppError(`Error processing bulk upload: ${err.message}`, 500));
                    }
                })
                .on('error', (err) => {
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
                    return next(new AppError('Error reading CSV file', 400))
                })
        }
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        logger.error(`Bulk upload critical error: ${err.message}`);

        // Return a more descriptive error if possible
        const errorMessage = err.message.includes('unique constraint')
            ? `Database Error: ${err.message}`
            : 'Error processing bulk upload';

        return next(new AppError(errorMessage, 500));
    }
});

// @desc    Approve Device
// @route   POST /api/client/approve-device/:id
// @access  Private (CA)
exports.approveDevice = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    const client = await clientRepository.findClientByIdAndCaForApproval(req.params.id, caId);

    if (!client) {
        return next(new AppError('Client not found', 404));
    }

    if (!client.deviceId && client.deviceStatus !== 'PENDING') {
        return next(new AppError('No pending device to approve', 400));
    }

    const updatedAllowedDevices = client.allowedDevices || [];
    if (client.deviceId && !updatedAllowedDevices.includes(client.deviceId)) {
        updatedAllowedDevices.push(client.deviceId);
    }

    const updatedClient = await clientRepository.updateApprovedDevice(client.id, updatedAllowedDevices);

    res.status(200).json({
        status: 'success',
        message: 'Device approved successfully',
        data: { ...updatedClient, _id: updatedClient.id }
    });
});
// @desc    Self Delete Account (Client)
// @route   DELETE /api/client/self-delete
// @access  Private (Client)
exports.selfDelete = catchAsync(async (req, res, next) => {
    const clientId = req.user.id;

    // 1. Find the client to get their CA ID (for bucket naming)
    const client = await clientRepository.findClientById(clientId);

    if (!client) {
        return next(new AppError('Account not found.', 404));
    }

    // 2. Delete Physical Files from MinIO
    const bucketName = `ca-${client.caId}`;
    const clientFolderPath = `client_${clientId}/`;

    try {
        await deleteFolder(bucketName, clientFolderPath);
    } catch (err) {
        logger.error(`Failed to delete client folder from storage during self-delete: ${err.message}`);
    }

    // 3. Delete Data from DB (Cascade-like)
    await clientRepository.deleteDocumentsByClient(clientId);
    await clientRepository.deleteFoldersByClient(clientId);
    await clientRepository.deleteNotificationsByClient(clientId);
    await clientRepository.deleteActivityLogsByClient(clientId);

    // 4. Delete the Client record
    await clientRepository.deleteClientById(clientId);

    logger.info(`Client self-deleted their account: ${clientId}`);

    res.status(200).json({
        status: 'success',
        message: 'Your account and all associated data have been permanently deleted.'
    });
});

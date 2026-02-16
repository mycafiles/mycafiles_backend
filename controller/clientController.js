const fs = require("fs")
const csv = require("csv-parser")
const path = require('path');
const Client = require("../models/Client")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/AppError")
const logger = require("../utils/logger")
const Folder = require("../models/Folder")
const Document = require("../models/Document")
const { generateClientFolders, deleteFolder: deleteFolderService } = require("../services/folderService")
const { createBucket, createFolder, deleteFolder } = require('../services/storageService');
const { logActivity } = require('../services/activityService');

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

exports.createClient = catchAsync(async (req, res, next) => {
    const { name, mobileNumber, panNumber, gstNumber, tanNumber, type, customFields, tradeNumber, gstId, gstPassword, address } = req.body
    const caId = req.user._id // From auth middleware

    // Validation: GST Number must contain PAN Number
    if (gstNumber && panNumber) {
        // Extract chars 3-12 from GST and compare with PAN
        // Or simpler: gstNumber.includes(panNumber) if strictly formatted
        // Frontend uses: gstNumber.substring(2, 12).
        if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
            return next(new AppError('GST Number does not match the provided PAN Number', 400));
        }
    }

    // Auto-generate File Number
    const lastClient = await Client.findOne({ caId }).sort({ fileNumber: -1 });
    const fileNumber = lastClient && lastClient.fileNumber ? lastClient.fileNumber + 1 : 1;

    const client = await Client.create({
        caId,
        name,
        mobileNumber,
        panNumber,
        gstNumber,
        tanNumber,
        tradeNumber,
        gstId,
        gstPassword,
        address,
        type,
        customFields,
        dob: req.body.dob, // Added DOB
        fileNumber
    })

    // MinIO: Create Folder for Client (ca-{id}/client_{id}/)
    const bucketName = `ca-${caId}`;
    // Ensure bucket exists (for existing CAs who didn't trigger registration hook)
    const { createBucket } = require('../services/storageService');
    await createBucket(bucketName);

    await createFolder(bucketName, `client_${client._id}`);

    // Pass created client data (including gst/tan) to folder generator
    await generateClientFolders(client._id, client);

    await logActivity({
        caId,
        action: 'CREATE_CLIENT',
        details: `Created new client: ${client.name} (${client.panNumber})`,
        clientId: client._id,
        clientName: client.name
    });

    logger.info(`Client created: ${client._id} by CA: ${caId}`)
    res.status(201).json({
        status: 'success',
        data: client
    })
})

// @desc    Get All Clients for a CA
// @route   GET /api/client
// @access  Private (CA)
exports.viewClients = catchAsync(async (req, res, next) => {
    const caId = req.user._id
    const clients = await Client.find({ caId })

    res.status(200).json({
        status: 'success',
        results: clients.length,
        data: clients
    })
})

// @desc    Edit Client
// @route   PUT /api/client/:id
// @access  Private (CA)
exports.editClient = catchAsync(async (req, res, next) => {
    const { panNumber } = req.body
    const caId = req.user._id

    if (panNumber && !panRegex.test(panNumber)) {
        return next(new AppError('Invalid PAN number format', 400))
    }

    const client = await Client.findOneAndUpdate(
        { _id: req.params.id, caId },
        req.body,
        {
            new: true,
            runValidators: true
        }
    )

    if (!client) {
        return next(new AppError('No client found with that ID associated with your account', 404))
    }

    await logActivity({
        caId,
        action: 'UPDATE_CLIENT',
        details: `Updated details for client: ${client.name}`,
        clientId: client._id,
        clientName: client.name
    });

    logger.info(`Client updated: ${req.params.id} by CA: ${caId}`)
    res.status(200).json({
        status: 'success',
        data: client
    })
})

// @desc    Delete Client
// @route   DELETE /api/client/:id
// @access  Private (CA)
exports.deleteClient = catchAsync(async (req, res, next) => {
    const caId = req.user._id
    const clientId = req.params.id

    // 1. Find Client
    const client = await Client.findOne({ _id: clientId, caId })

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

    // 3. Delete Documents from DB
    await Document.deleteMany({ clientId });

    // 4. Delete Folders from DB
    await Folder.deleteMany({ clientId });

    // 5. Delete Client from DB
    await Client.deleteOne({ _id: clientId });

    await logActivity({
        caId,
        action: 'DELETE_CLIENT',
        details: `Deleted client (CASCADE): ${client.name}`,
        clientId: client._id,
        clientName: client.name
    });

    logger.info(`Client deleted (CASCADE): ${clientId} by CA: ${caId}`)
    res.status(200).json({
        status: 'success',
        message: 'Client and all associated data deleted successfully'
    })
})

const XLSX = require('xlsx');

// @desc    Bulk Upload Clients
// @route   POST /api/client/bulk
// @access  Private (CA)
exports.bulkUploadClients = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload a CSV or Excel file', 400))
    }

    const caId = req.user._id
    let clients = []
    const errors = []
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Get last file number for this CA
    const lastClient = await Client.findOne({ caId }).sort({ fileNumber: -1 });
    let currentFileNumber = lastClient && lastClient.fileNumber ? lastClient.fileNumber : 0;

    try {
        if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' }); // Read dates as strings if possible

            data.forEach((row, index) => {
                const name = row.name || row.Name;
                const mobileNumber = row.mobileNumber || row['Mobile Number'] || row.mobile || row.Mobile;
                const panNumber = row.panNumber || row['PAN Number'] || row.pan || row.PAN;
                const type = row.type || row.Type;
                const dob = row.dob || row.DOB || row['Date of Birth'];
                const result_tradeNumber = row.tradeNumber || row['Trade Number'] || row['Trade Name'];
                const result_gstId = row.gstId || row['GST ID'] || row['GST User'] || row['GST Username'];
                const result_gstPassword = row.gstPassword || row['GST Password'];
                const result_address = row.address || row.Address;

                const gstNumber = row.gstNumber || row['GST Number'] || row.gst || row.GST;
                const tanNumber = row.tanNumber || row['TAN Number'] || row.tan || row.TAN;

                if (!name || !mobileNumber || !panNumber || !type) {
                    errors.push({ row: index + 2, error: 'Missing required fields (name, mobileNumber, panNumber, type)' });
                    return;
                }

                if (!panRegex.test(panNumber)) {
                    errors.push({ row: index + 2, error: `Invalid PAN format: ${panNumber}` })
                    return
                }

                // Validation: GST-PAN Match
                if (gstNumber && panNumber) {
                    if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
                        errors.push({ row: index + 2, error: `GST Number does not match PAN: ${gstNumber} vs ${panNumber}` });
                        return;
                    }
                }

                currentFileNumber++;

                clients.push({
                    caId,
                    name,
                    mobileNumber: String(mobileNumber),
                    panNumber,
                    gstNumber,
                    tanNumber,
                    tradeNumber: result_tradeNumber,
                    gstId: result_gstId,
                    gstPassword: result_gstPassword,
                    address: result_address,
                    dob,
                    fileNumber: currentFileNumber,
                    type: String(type).toUpperCase(),
                    customFields: row.customFields ? (typeof row.customFields === 'string' ? JSON.parse(row.customFields) : row.customFields) : []
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
                }
            });

            // Check for duplicates in DB
            const panNumbers = uniqueClients.map(c => c.panNumber);
            const existingClients = await Client.find({
                caId,
                panNumber: { $in: panNumbers }
            }).select('panNumber');

            const existingPanSet = new Set(existingClients.map(c => c.panNumber));

            console.log(`[BulkUpload] File count: ${clients.length}, Unique in File: ${uniqueClients.length}, Existing in DB: ${existingClients.length}`);

            // Filter out duplicates
            const newClients = uniqueClients.filter(c => !existingPanSet.has(c.panNumber));

            if (newClients.length === 0) {
                return res.status(200).json({
                    status: 'success',
                    message: 'All clients in the file already exist.',
                    errors: errors.length > 0 ? errors : undefined,
                    count: 0,
                    skipped: clients.length
                });
            }

            const createdClients = await Client.insertMany(newClients);

            await logActivity({
                caId,
                action: 'CREATE_CLIENT',
                details: `Bulk uploaded ${createdClients.length} clients successfully`,
            });

            // Generate Folders (Batched to prevent overload)
            const batchSize = 50;
            for (let i = 0; i < createdClients.length; i += batchSize) {
                const batch = createdClients.slice(i, i + batchSize);
                await Promise.all(batch.map(client => generateClientFolders(client._id, client)));
            }

            return res.status(201).json({
                status: 'success',
                count: createdClients.length,
                skipped: clients.length - createdClients.length,
                errors: errors.length > 0 ? errors : undefined,
                data: createdClients
            });

        } else {
            // Existing CSV Logic
            let rowNumber = 1
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (row) => {
                    rowNumber++
                    const { name, mobileNumber, panNumber, type } = row
                    const dob = row.dob || row.DOB || row['Date of Birth'];
                    const result_tradeNumber = row.tradeNumber;
                    const result_gstId = row.gstId;
                    const result_gstPassword = row.gstPassword;
                    const result_address = row.address;

                    const gstNumber = row.gstNumber || row.gst;
                    const tanNumber = row.tanNumber || row.tan;

                    if (!name || !mobileNumber || !panNumber || !type) {
                        errors.push({ row: rowNumber, error: 'Missing required fields' })
                        return
                    }

                    if (!panRegex.test(panNumber)) {
                        errors.push({ row: rowNumber, error: `Invalid PAN format: ${panNumber}` })
                        return
                    }

                    // Validation: GST-PAN Match
                    if (gstNumber && panNumber) {
                        if (gstNumber.length >= 12 && gstNumber.substring(2, 12) !== panNumber) {
                            errors.push({ row: rowNumber, error: `GST Number does not match PAN: ${gstNumber} vs ${panNumber}` });
                            return;
                        }
                    }

                    currentFileNumber++;

                    clients.push({
                        caId,
                        name,
                        mobileNumber,
                        panNumber,
                        gstNumber,
                        tanNumber,
                        tradeNumber: result_tradeNumber,
                        gstId: result_gstId,
                        gstPassword: result_gstPassword,
                        address: result_address,
                        dob,
                        fileNumber: currentFileNumber,
                        type: String(type).toUpperCase(),
                        customFields: row.customFields ? JSON.parse(row.customFields) : []
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
                            const pan = c.panNumber.toUpperCase().trim();
                            if (!seenPanInFile.has(pan)) {
                                seenPanInFile.add(pan);
                                c.panNumber = pan;
                                uniqueClients.push(c);
                            }
                        });


                        const panNumbers = uniqueClients.map(c => c.panNumber);
                        const existingClients = await Client.find({
                            caId,
                            panNumber: { $in: panNumbers }
                        }).select('panNumber');

                        const existingPanSet = new Set(existingClients.map(c => c.panNumber));

                        console.log(`[BulkUpload-CSV] File: ${clients.length}, Unique: ${uniqueClients.length}, Existing: ${existingClients.length}`);

                        const newClients = uniqueClients.filter(c => !existingPanSet.has(c.panNumber));

                        if (newClients.length === 0) {
                            return res.status(200).json({
                                status: 'success',
                                message: 'All clients in the CSV already exist.',
                                errors: errors.length > 0 ? errors : undefined,
                                count: 0,
                                skipped: clients.length
                            })
                        }

                        const createdClients = await Client.insertMany(newClients)

                        // Generate Folders (Batched to prevent overload)
                        const batchSize = 50;
                        for (let i = 0; i < createdClients.length; i += batchSize) {
                            const batch = createdClients.slice(i, i + batchSize);
                            await Promise.all(batch.map(client => generateClientFolders(client._id, client)));
                        }

                        logger.info(`Bulk upload: ${createdClients.length} clients created by CA: ${caId}`)
                        res.status(201).json({
                            status: 'success',
                            count: createdClients.length,
                            skipped: clients.length - createdClients.length,
                            errors: errors.length > 0 ? errors : undefined,
                            data: createdClients
                        })
                    } catch (err) {
                        logger.error(`Bulk upload error: ${err.message}`)
                        return next(new AppError('Error processing bulk upload', 500))
                    }
                })
                .on('error', (err) => {
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
                    return next(new AppError('Error reading CSV file', 400))
                })
        }
    } catch (err) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        logger.error(`Bulk upload error: ${err.message}`);
        return next(new AppError('Error processing bulk upload', 500));
    }
});


// @desc    Approve Device
// @route   POST /api/client/approve-device/:id
// @access  Private (CA)
exports.approveDevice = catchAsync(async (req, res, next) => {
    const caId = req.user._id;
    const client = await Client.findOne({ _id: req.params.id, caId });

    if (!client) {
        return next(new AppError('Client not found', 404));
    }

    if (!client.deviceId && client.deviceStatus !== 'PENDING') {
        return next(new AppError('No pending device to approve', 400));
    }

    client.deviceStatus = 'APPROVED';
    if (client.deviceId && (!client.allowedDevices || !client.allowedDevices.includes(client.deviceId))) {
        if (!client.allowedDevices) client.allowedDevices = [];
        client.allowedDevices.push(client.deviceId);
    }
    await client.save();

    res.status(200).json({
        status: 'success',
        message: 'Device approved successfully',
        data: client
    });
});

const fs = require("fs")
const csv = require("csv-parser")
const path = require('path');
const Client = require("../models/Client")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/AppError")
const logger = require("../utils/logger")
const { generateClientFolders } = require("../services/folderService")

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

// @desc    Create Client
// @route   POST /api/client
// @access  Private (CA)
exports.createClient = catchAsync(async (req, res, next) => {
    const { name, mobileNumber, panNumber, gstNumber, tanNumber, type, customFields } = req.body
    const caId = req.user._id // From auth middleware

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
        type,
        customFields,
        dob: req.body.dob, // Added DOB
        fileNumber
    })

    // Pass created client data (including gst/tan) to folder generator
    await generateClientFolders(client._id, client);

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
    const client = await Client.findOneAndDelete({ _id: req.params.id, caId })

    if (!client) {
        return next(new AppError('No client found with that ID associated with your account', 404))
    }

    logger.info(`Client deleted: ${req.params.id} by CA: ${caId}`)
    res.status(200).json({
        status: 'success',
        message: 'Client deleted successfully'
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

    try {
        if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            data.forEach((row, index) => {
                const name = row.name || row.Name;
                const mobileNumber = row.mobileNumber || row['Mobile Number'] || row.mobile || row.Mobile;
                const panNumber = row.panNumber || row['PAN Number'] || row.pan || row.PAN;
                const type = row.type || row.Type;

                if (!name || !mobileNumber || !panNumber || !type) {
                    errors.push({ row: index + 2, error: 'Missing required fields (name, mobileNumber, panNumber, type)' });
                    return;
                }

                if (!panRegex.test(panNumber)) {
                    errors.push({ row: index + 2, error: `Invalid PAN format: ${panNumber}` })
                    return
                }

                clients.push({
                    caId,
                    name,
                    mobileNumber: String(mobileNumber),
                    panNumber,
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

            const createdClients = await Client.insertMany(clients);
            return res.status(201).json({
                status: 'success',
                count: createdClients.length,
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

                    if (!name || !mobileNumber || !panNumber || !type) {
                        errors.push({ row: rowNumber, error: 'Missing required fields' })
                        return
                    }

                    if (!panRegex.test(panNumber)) {
                        errors.push({ row: rowNumber, error: `Invalid PAN format: ${panNumber}` })
                        return
                    }

                    clients.push({
                        caId,
                        name,
                        mobileNumber,
                        panNumber,
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

                        const createdClients = await Client.insertMany(clients)

                        logger.info(`Bulk upload: ${createdClients.length} clients created by CA: ${caId}`)
                        res.status(201).json({
                            status: 'success',
                            count: createdClients.length,
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

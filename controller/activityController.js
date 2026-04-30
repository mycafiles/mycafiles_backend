const ActivityLog = require('../models/ActivityLog');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/prisma');

/**
 * Get activity logs for the logged-in CA
 */
exports.getLogs = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    console.log(caId, "ca id")

    const { startDate, endDate } = req.query;
    console.log(`[ActivityLog Debug] Received params - startDate: ${startDate}, endDate: ${endDate}`);

    const where = {
        caId
    };

    if (startDate || endDate) {
        const timestampFilter = {};
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                timestampFilter.gte = start;
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                // Ensure we cover the entire end day
                end.setHours(23, 59, 59, 999);
                timestampFilter.lte = end;
            }
        }

        if (Object.keys(timestampFilter).length > 0) {
            where.timestamp = timestampFilter;
        }
    }

    // Fetch logs, include client info if exists
    const logs = await prisma.activityLog.findMany({
        where,
        include: {
            client: {
                select: { id: true, name: true }
            }
        },
        orderBy: { timestamp: 'desc' },
        take: 200
    });

    // Map for frontend compatibility
    const formattedLogs = logs.map(log => ({
        ...log,
        _id: log.id,
        clientId: log.client ? { ...log.client, _id: log.client.id } : log.clientId
    }));

    res.status(200).json({
        status: 'success',
        results: formattedLogs.length,
        data: formattedLogs
    });
});

exports.getClientLogs = catchAsync(async (req, res, next) => {
    const clientId = req.user.id;
    console.log(clientId, "client id")

    const { startDate, endDate } = req.query;
    console.log(`[ActivityLog Debug] Received params - startDate: ${startDate}, endDate: ${endDate}`);

    const where = {
        clientId
    };

    if (startDate || endDate) {
        const timestampFilter = {};
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                timestampFilter.gte = start;
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                // Ensure we cover the entire end day
                end.setHours(23, 59, 59, 999);
                timestampFilter.lte = end;
            }
        }

        if (Object.keys(timestampFilter).length > 0) {
            where.timestamp = timestampFilter;
        }
    }

    // Fetch logs, include client info if exists
    const logs = await prisma.activityLog.findMany({
        where,
        include: {
            client: {
                select: { id: true, name: true }
            }
        },
        orderBy: { timestamp: 'desc' },
        take: 200
    });

    // Map for frontend compatibility
    const formattedLogs = logs.map(log => ({
        ...log,
        _id: log.id,
        clientId: log.client ? { ...log.client, _id: log.client.id } : log.clientId
    }));

    res.status(200).json({
        status: 'success',
        results: formattedLogs.length,
        data: formattedLogs
    });
});
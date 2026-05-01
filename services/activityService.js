const activityRepository = require('../repositories/activityRepository');
const ActivityLog = require('../models/ActivityLog');

function buildDateRange(startDate, endDate) {
    const timestamp = {};

    if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) timestamp.gte = start;
    }

    if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            timestamp.lte = end;
        }
    }

    return Object.keys(timestamp).length ? timestamp : null;
}

function formatLogs(logs) {
    return logs.map((log) => ({
        ...log,
        _id: log.id,
        clientId: log.client ? { ...log.client, _id: log.client.id } : log.clientId
    }));
}

async function getCaLogs(caId, filters = {}) {
    const where = { caId };
    const timestamp = buildDateRange(filters.startDate, filters.endDate);
    if (timestamp) where.timestamp = timestamp;
    const logs = await activityRepository.findLogs(where);
    return formatLogs(logs);
}

async function getClientLogs(clientId, filters = {}) {
    const where = { clientId };
    const timestamp = buildDateRange(filters.startDate, filters.endDate);
    if (timestamp) where.timestamp = timestamp;
    const logs = await activityRepository.findLogs(where);
    return formatLogs(logs);
}

async function logActivity(data) {
    try {
        await ActivityLog.create(data);
    } catch (error) {
        console.error('[ActivityService] Error logging activity:', error);
    }
}

module.exports = {
    getCaLogs,
    getClientLogs,
    logActivity
};

const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const activityService = require('../services/activityService');

/**
 * Get activity logs for the logged-in CA
 */
exports.getLogs = catchAsync(async (req, res, next) => {
    const caId = req.user.id;
    logger.debug(`caId: ${caId}`);

    const { startDate, endDate } = req.query;
    logger.debug(`[ActivityLog Debug] Received params - startDate: ${startDate}, endDate: ${endDate}`);
    const formattedLogs = await activityService.getCaLogs(caId, { startDate, endDate });

    res.status(200).json({
        status: 'success',
        results: formattedLogs.length,
        data: formattedLogs
    });
});

exports.getClientLogs = catchAsync(async (req, res, next) => {
    const clientId = req.user.id;
    logger.debug(`clientId: ${clientId}`);

    const { startDate, endDate } = req.query;
    logger.debug(`[ActivityLog Debug] Received params - startDate: ${startDate}, endDate: ${endDate}`);
    const formattedLogs = await activityService.getClientLogs(clientId, { startDate, endDate });

    res.status(200).json({
        status: 'success',
        results: formattedLogs.length,
        data: formattedLogs
    });
});
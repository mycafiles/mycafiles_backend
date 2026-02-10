const ActivityLog = require('../models/ActivityLog');
const catchAsync = require('../utils/catchAsync');

/**
 * Get activity logs for the logged-in CA
 */
exports.getLogs = catchAsync(async (req, res, next) => {
    const caId = req.user._id;

    // Fetch logs, populate client info if exists
    const logs = await ActivityLog.find({ caId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

    res.status(200).json({
        status: 'success',
        results: logs.length,
        data: logs
    });
});

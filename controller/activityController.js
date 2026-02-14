const ActivityLog = require('../models/ActivityLog');
const catchAsync = require('../utils/catchAsync');

/**
 * Get activity logs for the logged-in CA
 */
exports.getLogs = catchAsync(async (req, res, next) => {
    const caId = req.user._id;

    const { startDate, endDate } = req.query;
    console.log(`[ActivityLog Debug] Received params - startDate: ${startDate}, endDate: ${endDate}`);

    const query = {
        caId
    };

    if (startDate || endDate) {
        const timestampFilter = {};
        if (startDate) {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
                timestampFilter.$gte = start;
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (!isNaN(end.getTime())) {
                // Ensure we cover the entire end day
                end.setHours(23, 59, 59, 999);
                timestampFilter.$lte = end;
            }
        }

        if (Object.keys(timestampFilter).length > 0) {
            query.timestamp = timestampFilter;
        }
        console.log('[ActivityLog Debug] Final Query:', JSON.stringify(query));
    }

    // Fetch logs, populate client info if exists, exclude UPLOAD_FILE
    const logs = await ActivityLog.find(query)
        .populate('clientId', 'name')
        .sort({ timestamp: -1 })
        .limit(200) // Increase limit for filtered results
        .lean();

    res.status(200).json({
        status: 'success',
        results: logs.length,
        data: logs
    });
});

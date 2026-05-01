const catchAsync = require('../utils/catchAsync');
const notificationFacadeService = require('../services/notificationFacadeService');

/**
 * Send a test notification to the logged-in user
 */
exports.sendTestNotification = catchAsync(async (req, res, next) => {
    const result = await notificationFacadeService.sendTest(req.user);

    res.status(200).json({
        status: 'success',
        message: 'Test notification sent successfully',
        data: result
    });
});

/**
 * Get notifications for the logged-in user
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
    const { unreadCount, data } = await notificationFacadeService.getNotifications(req.user);

    res.status(200).json({
        status: 'success',
        unreadCount,
        results: data.length,
        data
    });
});

/**
 * Mark notification as read (now configured to delete on read)
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const deletedCount = await notificationFacadeService.markAsRead(id, req.user);
    if (deletedCount === 0) {
        return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({
        status: 'success',
        message: 'Notification deleted on read'
    });
});

/**
 * Mark all as read (now deletes all)
 */
exports.markAllRead = catchAsync(async (req, res, next) => {
    await notificationFacadeService.markAllRead(req.user);

    res.status(200).json({
        status: 'success',
        message: 'All notifications deleted'
    });
});

/**
 * Delete a notification
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await notificationFacadeService.deleteNotification(id, req.user);

    res.status(204).json({
        status: 'success',
        data: null
    });
});

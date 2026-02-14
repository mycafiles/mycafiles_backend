const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const { sendNotification } = require('../services/notificationService');

/**
 * Get notifications for the logged-in CA
 */
// ... existing getNotifications ...

/**
 * Send a test notification to the logged-in user
 */
exports.sendTestNotification = catchAsync(async (req, res, next) => {
    const recipientId = req.user._id.toString();

    const title = 'Test Notification 🔔';
    const body = 'This is a test notification from your CA Admin panel. If you see this, notifications are working correctly!';

    const result = await sendNotification(title, body, recipientId, {
        saveToDb: true,
        type: 'GENERAL',
        data: {
            url: '/dashboard/home'
        }
    });

    res.status(200).json({
        status: 'success',
        message: 'Test notification sent successfully',
        data: result
    });
});

/**
 * Mark notification as read
 */
// ... (keep the rest of the file)
exports.getNotifications = catchAsync(async (req, res, next) => {
    const recipient = req.user._id;

    const notifications = await Notification.find({ recipient })
        .populate('sender', 'name')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    const unreadCount = await Notification.countDocuments({ recipient, isRead: false });

    res.status(200).json({
        status: 'success',
        unreadCount,
        results: notifications.length,
        data: notifications
    });
});

/**
 * Mark notification as read
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const recipient = req.user._id;

    const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({
        status: 'success',
        data: notification
    });
});

/**
 * Mark all as read
 */
exports.markAllRead = catchAsync(async (req, res, next) => {
    const recipient = req.user._id;

    await Notification.updateMany(
        { recipient, isRead: false },
        { isRead: true }
    );

    res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read'
    });
});

/**
 * Delete a notification
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const recipient = req.user._id;

    await Notification.findOneAndDelete({ _id: id, recipient });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

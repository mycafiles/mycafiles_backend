const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

/**
 * Get notifications for the logged-in CA
 */
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

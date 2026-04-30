const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const { sendNotification } = require('../services/notificationService');
const prisma = require('../config/prisma');

/**
 * Send a test notification to the logged-in user
 */
exports.sendTestNotification = catchAsync(async (req, res, next) => {
    const recipientId = req.user.id.toString();
    const isClient = req.user.role === 'CUSTOMER';

    const title = 'Test Notification 🔔';
    const body = 'This is a test notification from your CA Admin panel. If you see this, notifications are working correctly!';

    const result = await sendNotification(title, body, recipientId, {
        saveToDb: true,
        type: 'GENERAL',
        recipientType: isClient ? 'CLIENT' : 'CA',
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
 * Get notifications for the logged-in user
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const isClient = req.user.role === 'CUSTOMER';

    // Different query based on role
    const where = isClient ? { clientId: userId } : { recipientId: userId };

    const notifications = await prisma.notification.findMany({
        where,
        include: {
            sender: {
                select: { id: true, name: true }
            },
            senderUser: {
                select: { id: true, name: true }
            },
            folder: {
                select: { id: true, clientId: true, category: true }
            },
            document: {
                select: { id: true, clientId: true, folderId: true, category: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    const unreadCount = await prisma.notification.count({
        where: { ...where, isRead: false }
    });

    // Color mapping for UI
    const categoryStyles = {
        GST: { color: "#8B5CF6", bg: "#F5F3FF" },
        TDS: { color: "#F59E0B", bg: "#FFFBEB" },
        ITR: { color: "#3B82F6", bg: "#EFF6FF" },
        KYC: { color: "#EC4899", bg: "#FDF2F8" },
        GENERAL: { color: "#6B7280", bg: "#F3F4F6" }
    };

    // Map for frontend compatibility
    const buildTargetUrl = (notification) => {
        const doc = notification.document;
        const folder = notification.folder;
        const docId = notification.docId || doc?.id || null;
        const folderId = notification.folderId || doc?.folderId || folder?.id || null;
        const clientId = notification.clientId || doc?.clientId || folder?.clientId || null;
        const category = (doc?.category || folder?.category || 'GENERAL').toUpperCase();

        const params = new URLSearchParams();
        if (folderId) params.set('folderId', folderId);
        if (docId) params.set('docId', docId);

        if (isClient) {
            if (category === 'GST') return `/gst?${params.toString()}`;
            if (category === 'TDS') return `/tds?${params.toString()}`;
            if (category === 'ITR') return `/itr?${params.toString()}`;
            return `/documents${params.toString() ? `?${params.toString()}` : ''}`;
        }

        if (!clientId) return '/notifications';

        if (category && category !== 'GENERAL') params.set('category', category);
        if (category === 'KYC') params.set('isKyc', 'true');

        return `/clients/client-profile/${clientId}${params.toString() ? `?${params.toString()}` : ''}`;
    };

    const formattedNotifications = notifications.map(n => {
        // Find the sender display name
        const sender = n.senderUser || n.sender;

        let category = "GENERAL";
        if (n.folder?.category) category = n.folder.category;
        else if (n.document?.category) category = n.document.category;

        const style = categoryStyles[category] || categoryStyles.GENERAL;

        return {
            ...n,
            _id: n.id,
            id: n.id,
            sender: sender ? { ...sender, _id: sender.id } : null,
            name: sender?.name || "System",
            avatar: "/users/user1.png", // Fallback avatar
            message: n.message,
            category: category === "GENERAL" ? "General" : category,
            type: category, // Used for filtering in frontend
            color: style.color,
            bg: style.bg,
            docId: n.docId,
            folderId: n.folderId || n.document?.folderId || null,
            clientId: n.clientId || n.document?.clientId || n.folder?.clientId || null,
            targetUrl: buildTargetUrl(n),
            dateTime: n.createdAt,
            time: new Date(n.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(n.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' }),
            isRead: n.isRead
        };
    });

    res.status(200).json({
        status: 'success',
        unreadCount,
        results: formattedNotifications.length,
        data: formattedNotifications
    });
});

/**
 * Mark notification as read (now configured to delete on read)
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    const isClient = req.user.role === 'CUSTOMER';

    const where = isClient ? { id, clientId: userId } : { id, recipientId: userId };

    const notificationRes = await prisma.notification.deleteMany({
        where
    });

    if (notificationRes.count === 0) {
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
    const userId = req.user.id;
    const isClient = req.user.role === 'CUSTOMER';

    const where = isClient ? { clientId: userId } : { recipientId: userId };

    await prisma.notification.deleteMany({
        where
    });

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
    const userId = req.user.id;
    const isClient = req.user.role === 'CUSTOMER';

    const where = isClient ? { id, clientId: userId } : { id, recipientId: userId };

    await prisma.notification.deleteMany({
        where
    });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

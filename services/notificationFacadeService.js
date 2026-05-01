const { sendNotification } = require('./notificationService');
const notificationRepository = require('../repositories/notificationRepository');

const categoryStyles = {
    GST: { color: '#8B5CF6', bg: '#F5F3FF' },
    TDS: { color: '#F59E0B', bg: '#FFFBEB' },
    ITR: { color: '#3B82F6', bg: '#EFF6FF' },
    KYC: { color: '#EC4899', bg: '#FDF2F8' },
    GENERAL: { color: '#6B7280', bg: '#F3F4F6' }
};

function getRoleContext(user) {
    const isClient = user.role === 'CUSTOMER';
    const where = isClient ? { clientId: user.id } : { recipientId: user.id };
    return { isClient, where };
}

function buildTargetUrl(notification, isClient) {
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
}

function toResponseDto(notification, isClient) {
    const sender = notification.senderUser || notification.sender;
    let category = 'GENERAL';
    if (notification.folder?.category) category = notification.folder.category;
    else if (notification.document?.category) category = notification.document.category;
    const style = categoryStyles[category] || categoryStyles.GENERAL;

    return {
        ...notification,
        _id: notification.id,
        id: notification.id,
        sender: sender ? { ...sender, _id: sender.id } : null,
        name: sender?.name || 'System',
        avatar: '/users/user1.png',
        message: notification.message,
        category: category === 'GENERAL' ? 'General' : category,
        type: category,
        color: style.color,
        bg: style.bg,
        docId: notification.docId,
        folderId: notification.folderId || notification.document?.folderId || null,
        clientId: notification.clientId || notification.document?.clientId || notification.folder?.clientId || null,
        targetUrl: buildTargetUrl(notification, isClient),
        dateTime: notification.createdAt,
        time:
            new Date(notification.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                ? new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(notification.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' }),
        isRead: notification.isRead
    };
}

async function sendTest(user) {
    const recipientId = user.id.toString();
    const isClient = user.role === 'CUSTOMER';
    return sendNotification(
        'Test Notification 🔔',
        'This is a test notification from your CA Admin panel. If you see this, notifications are working correctly!',
        recipientId,
        {
            saveToDb: true,
            type: 'GENERAL',
            recipientType: isClient ? 'CLIENT' : 'CA',
            data: { url: '/dashboard/home' }
        }
    );
}

async function getNotifications(user) {
    const { isClient, where } = getRoleContext(user);
    const [notifications, unreadCount] = await Promise.all([
        notificationRepository.findNotifications(where),
        notificationRepository.countUnread(where)
    ]);
    return {
        unreadCount,
        data: notifications.map((n) => toResponseDto(n, isClient))
    };
}

async function markAsRead(id, user) {
    const { where } = getRoleContext(user);
    const result = await notificationRepository.deleteMany({ ...where, id });
    return result.count;
}

async function markAllRead(user) {
    const { where } = getRoleContext(user);
    await notificationRepository.deleteMany(where);
}

async function deleteNotification(id, user) {
    const { where } = getRoleContext(user);
    await notificationRepository.deleteMany({ ...where, id });
}

module.exports = {
    sendTest,
    getNotifications,
    markAsRead,
    markAllRead,
    deleteNotification
};

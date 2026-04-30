const prisma = require('../config/prisma');

/**
 * Notification Model Wrapper (Prisma)
 */
const Notification = {
    create: async (data) => {
        return await prisma.notification.create({
            data: {
                recipientId: data.recipientType === 'CA' ? data.recipientId : null,
                clientId: data.recipientType === 'CLIENT' ? (data.clientId || data.recipientId) : (data.clientId || null),
                senderId: data.senderType === 'CLIENT' ? data.senderId : null,
                senderUserId: data.senderType === 'CA' ? data.senderId : null,
                title: data.title,
                message: data.message,
                type: data.type || 'GENERAL',
                docId: data.metadata?.docId || null,
                folderId: data.metadata?.folderId || null,
                isRead: false
            }
        });
    },

    find: async (query) => {
        // Map common Mongoose query fields to Prisma
        const where = {};
        if (query.recipient) where.recipientId = query.recipient;
        if (query.isRead !== undefined) where.isRead = query.isRead;
        
        return await prisma.notification.findMany({
            where: { ...where, ...query },
            orderBy: { createdAt: 'desc' }
        });
    },

    updateMany: async (query, update) => {
        const where = {};
        if (query.recipient) where.recipientId = query.recipient;
        
        return await prisma.notification.updateMany({
            where: { ...where, ...query },
            data: update
        });
    }
};

module.exports = Notification;

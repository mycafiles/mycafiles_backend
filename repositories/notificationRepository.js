const prisma = require('../config/prisma');

function findNotifications(where) {
    return prisma.notification.findMany({
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
}

function countUnread(where) {
    return prisma.notification.count({
        where: { ...where, isRead: false }
    });
}

function deleteMany(where) {
    return prisma.notification.deleteMany({ where });
}

module.exports = {
    findNotifications,
    countUnread,
    deleteMany
};

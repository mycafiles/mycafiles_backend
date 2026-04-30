const prisma = require('../config/prisma');

/**
 * ActivityLog Model Wrapper (Prisma)
 */
const ActivityLog = {
    create: async (data) => {
        return await prisma.activityLog.create({
            data: {
                caId: data.caId,
                action: data.action,
                details: data.details,
                clientId: data.clientId,
                clientName: data.clientName,
                docId: data.docId,
                folderId: data.folderId,
                ipAddress: data.ipAddress,
                timestamp: data.timestamp || new Date()
            }
        });
    },

    find: async (query) => {
        return await prisma.activityLog.findMany({
            where: query,
            orderBy: { timestamp: 'desc' }
        });
    }
};

module.exports = ActivityLog;

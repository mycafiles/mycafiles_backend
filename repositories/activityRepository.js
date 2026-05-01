const prisma = require('../config/prisma');

function findLogs(where) {
    return prisma.activityLog.findMany({
        where,
        include: {
            client: {
                select: { id: true, name: true }
            }
        },
        orderBy: { timestamp: 'desc' },
        take: 200
    });
}

module.exports = { findLogs };

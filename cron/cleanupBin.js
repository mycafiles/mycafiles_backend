const cron = require('node-cron');
const prisma = require('../config/prisma');
const { deleteFile } = require('../services/storageService');

// Run every day at midnight
const cleanupBin = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Running 90-day Recycle Bin Cleanup...');

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        try {
            // 1. Find and Delete Documents
            const filesToDelete = await prisma.document.findMany({
                where: {
                    isDeleted: true,
                    deletedAt: { lt: ninetyDaysAgo }
                }
            });

            for (const file of filesToDelete) {
                try {
                    // Delete from Storage (MinIO)
                    if (file.cloudinaryId && file.uploadedBy !== 'SYSTEM') {
                        const client = await prisma.client.findUnique({
                            where: { id: file.clientId },
                            select: { caId: true }
                        });
                        if (client && client.caId) {
                            const bucketName = `ca-${client.caId}`;
                            await deleteFile(bucketName, file.cloudinaryId);
                        }
                    }
                    await prisma.document.delete({ where: { id: file.id } });
                    console.log(`Permanently deleted file: ${file.fileName}`);
                } catch (err) {
                    console.error(`Failed to delete file ${file.id}:`, err);
                }
            }

            // 2. Find and Delete Folders
            const foldersToDelete = await prisma.folder.findMany({
                where: {
                    isDeleted: true,
                    deletedAt: { lt: ninetyDaysAgo }
                }
            });

            for (const folder of foldersToDelete) {
                await prisma.folder.delete({ where: { id: folder.id } });
                console.log(`Permanently deleted folder: ${folder.name}`);
            }

            console.log('Recycle Bin Cleanup Completed.');

        } catch (err) {
            console.error('Error in Recycle Bin Cleanup:', err);
        }
    });
};

module.exports = cleanupBin;

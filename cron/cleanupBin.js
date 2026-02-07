const cron = require('node-cron');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const { deleteFile } = require('../services/storageService');
const mongoose = require('mongoose');

// Run every day at midnight
const cleanupBin = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Running 90-day Recycle Bin Cleanup...');

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        try {
            // 1. Find and Delete Documents
            const filesToDelete = await Document.find({
                isDeleted: true,
                deletedAt: { $lt: ninetyDaysAgo }
            });

            for (const file of filesToDelete) {
                try {
                    // Delete from Storage (MinIO)
                    if (file.cloudinaryId && file.uploadedBy !== 'SYSTEM') {
                        // Need to retrieve bucket name logic here or store it?
                        // Current driveController logic derives bucket from CA ID.
                        // But here we might not have easy access to CA ID without Client lookup.
                        // Optimization: Store bucketName in Document if possible, OR lookup client.

                        const client = await mongoose.model('Client').findById(file.clientId);
                        if (client && client.caId) {
                            const bucketName = `ca-${client.caId}`;
                            await deleteFile(bucketName, file.cloudinaryId);
                        }
                    }
                    await Document.findByIdAndDelete(file._id);
                    console.log(`Permanently deleted file: ${file.fileName}`);
                } catch (err) {
                    console.error(`Failed to delete file ${file._id}:`, err);
                }
            }

            // 2. Find and Delete Folders
            // Delete folders that are marked deleted > 90 days ago
            const foldersToDelete = await Folder.find({
                isDeleted: true,
                deletedAt: { $lt: ninetyDaysAgo }
            });

            for (const folder of foldersToDelete) {
                await Folder.findByIdAndDelete(folder._id);
                console.log(`Permanently deleted folder: ${folder.name}`);
            }

            console.log('Recycle Bin Cleanup Completed.');

        } catch (err) {
            console.error('Error in Recycle Bin Cleanup:', err);
        }
    });
};

module.exports = cleanupBin;

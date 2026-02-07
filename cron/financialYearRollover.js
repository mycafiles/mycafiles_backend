const cron = require('node-cron');
const Client = require('../models/Client');
const { generateClientFolders } = require('../services/folderService');

// Run at 00:00 on April 1st every year
// Cron Format: Minute Hour DayOfMonth Month DayOfWeek
const initFinancialYearRollover = () => {
    cron.schedule('0 0 1 4 *', async () => {
        console.log(`[Cron] Running Financial Year Rollover: Creating new folders for all clients...`);
        try {
            const clients = await Client.find({});
            console.log(`[Cron] Found ${clients.length} clients to process.`);

            for (const client of clients) {
                // generateClientFolders handles the logic to create *new* year folders
                // while leaving existing ones intact.
                await generateClientFolders(client._id, client);
            }

            console.log(`[Cron] specialized Financial Year Rollover completed successfully.`);
        } catch (error) {
            console.error(`[Cron] Error during Financial Year Rollover:`, error);
        }
    });
    console.log('[Cron] Financial Year Rollover job scheduled (April 1st 00:00).');
};

module.exports = initFinancialYearRollover;

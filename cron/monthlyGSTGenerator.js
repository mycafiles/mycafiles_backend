const cron = require('node-cron');
const { generateNextMonthGSTFolders } = require('../services/folderService');

/**
 * Cron Job: Generates GST monthly folders for the NEXT month.
 * Runs every day at 23:55, but only executes logic if today is the LAST day of the month.
 */
const initMonthlyGSTGenerator = () => {
    // Cron Format: Minute Hour DayOfMonth Month DayOfWeek
    cron.schedule('55 23 * * *', async () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Check if tomorrow is the 1st of the next month
        if (tomorrow.getDate() === 1) {
            console.log(`[Cron] Today is the last day of the month. Generating GST folders for next month...`);
            await generateNextMonthGSTFolders();
        }
    });

    console.log('[Cron] Monthly GST Folder Generator scheduled (Daily check at 23:55).');
};

module.exports = initMonthlyGSTGenerator;

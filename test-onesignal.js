require('dotenv').config();
const { sendNotification } = require('./services/notificationService');

const testNotification = async () => {
    // REPLACE THIS with your CA User ID (you can find it in LocalStorage in the browser)
    const targetUserId = process.argv[2];

    if (!targetUserId) {
        console.log('Usage: node test-onesignal.js <USER_ID>');
        process.exit(1);
    }

    console.log(`Sending test notification to user: ${targetUserId}...`);

    const result = await sendNotification(
        '🔔 Test Notification',
        'If you see this, OneSignal is working properly!',
        targetUserId,
        { test: true }
    );

    if (result) {
        console.log('Notification sent successfully!');
    } else {
        console.log('Failed to send notification.');
    }
    process.exit(0);
};

testNotification();

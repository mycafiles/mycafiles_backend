require('dotenv').config();
const { sendNotification } = require('./services/notificationService');

async function test() {
    console.log('Testing notification service...');
    await sendNotification('Test Title', 'Test Body', 'cmnlv8pye0001q7u3kfj2wkxx', { saveToDb: false });
}

test().then(() => process.exit(0)).catch(console.error);

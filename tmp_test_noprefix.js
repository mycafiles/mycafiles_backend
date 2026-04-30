const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/HP/Downloads/2/MRDCO-Prarthana/mycafiles_backend/.env' });

async function testNoPrefix() {
    const appId = process.env.ONESIGNAL_APP_ID?.trim();
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
    
    console.log('Testing No Prefix Key');
    
    const tryUrl = `https://onesignal.com/api/v1/apps/${appId}`;
    
    try {
        const response = await axios.get(tryUrl, {
            headers: {
                'Authorization': apiKey
            }
        });
        console.log('Key works with No Prefix!');
    } catch (e) {
        console.error('Failed with No Prefix:', e.response?.data || e.message);
    }
}

testNoPrefix();

const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/HP/Downloads/2/MRDCO-Prarthana/mycafiles_backend/.env' });

async function testKey() {
    const appId = process.env.ONESIGNAL_APP_ID?.trim();
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
    
    console.log('Testing App ID:', appId);
    
    const tryUrl = `https://onesignal.com/api/v1/apps/${appId}`;
    
    try {
        const response = await axios.get(tryUrl, {
            headers: {
                'Authorization': `Key ${apiKey}`
            }
        });
        console.log('Key works with "Key" prefix!');
    } catch (e) {
        console.error('Failed with "Key" prefix:', e.response?.data || e.message);
        try {
            const response = await axios.get(tryUrl, {
                headers: {
                    'Authorization': `Basic ${apiKey}`
                }
            });
            console.log('Key works with "Basic" prefix!');
        } catch (e2) {
            console.error('Failed with "Basic" prefix:', e2.response?.data || e2.message);
        }
    }
}

testKey();

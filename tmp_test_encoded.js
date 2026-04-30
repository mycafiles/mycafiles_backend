const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/HP/Downloads/2/MRDCO-Prarthana/mycafiles_backend/.env' });

async function testEncoded() {
    const appId = process.env.ONESIGNAL_APP_ID?.trim();
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
    
    console.log('Testing Base64 Encoded Key');
    
    const tryUrl = `https://onesignal.com/api/v1/apps/${appId}`;
    const encoded = Buffer.from(apiKey).toString('base64');
    
    try {
        const response = await axios.get(tryUrl, {
            headers: {
                'Authorization': `Basic ${encoded}`
            }
        });
        console.log('Key works with Base64 prefix!');
    } catch (e) {
        console.error('Failed with Base64:', e.response?.data || e.message);
    }
}

testEncoded();

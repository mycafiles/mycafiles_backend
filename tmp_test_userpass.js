require('dotenv').config({ path: 'c:/Users/HP/Downloads/2/MRDCO-Prarthana/mycafiles_backend/.env' });

async function testUserPass() {
    const appId = process.env.ONESIGNAL_APP_ID?.trim();
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
    
    console.log('Testing Basic Auth with app_id as user');
    
    const encoded = Buffer.from(`${appId}:${apiKey}`).toString('base64');
    
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${encoded}`
        },
        body: JSON.stringify({
            app_id: appId,
            headings: { en: 'Test user/pass' },
            contents: { en: 'Test message' },
            target_channel: 'push',
            include_aliases: {
                external_id: ['test']
            }
        })
    });
    
    const data = await response.json();
    console.log('UserPass Response:', response.status, data);
}

testUserPass();

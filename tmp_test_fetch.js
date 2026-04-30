require('dotenv').config({ path: 'c:/Users/HP/Downloads/2/MRDCO-Prarthana/mycafiles_backend/.env' });

async function testFetch() {
    const appId = process.env.ONESIGNAL_APP_ID?.trim();
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
    
    console.log('Testing with native fetch');
    
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`
        },
        body: JSON.stringify({
            app_id: appId,
            headings: { en: 'Test native' },
            contents: { en: 'Test message native' },
            target_channel: 'push',
            include_aliases: {
                external_id: ['test']
            }
        })
    });
    
    const data = await response.json();
    console.log('Fetch Response:', response.status, data);
}

testFetch();

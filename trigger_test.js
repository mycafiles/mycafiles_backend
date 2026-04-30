const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { id: 'cmn2ol0ae0000d8dbu2s1mv6u', role: 'CAADMIN' },
    'fallback_secret'
);

async function testNotification() {
    try {
        const res = await axios.post('http://localhost:5001/api/notifications/test', {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('API Response:', res.status, res.data);
    } catch (err) {
        console.error('API Error:', err.response?.status, err.response?.data || err.message);
    }
}

testNotification();

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function testErrors() {
    console.log('--- Testing Error Handling and Logging ---');

    // 1. Test 404 Error (Non-existent CA)
    try {
        console.log('\n1. Requesting non-existent CA...');
        await axios.get(`${API_URL}/ca/65916892305a060012345678`); // Assuming this ID doesn't exist
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Body:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }

    // 2. Test Validation Error (Missing fields)
    try {
        console.log('\n2. Creating CA with missing fields...');
        await axios.post(`${API_URL}/ca/create`, {});
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Body:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }

    // 3. Check logs
    console.log('\n3. Checking logs directory...');
    const logsPath = path.join(__dirname, 'logs');
    if (fs.existsSync(logsPath)) {
        const files = fs.readdirSync(logsPath);
        console.log('Log files found:', files);
        files.forEach(file => {
            const content = fs.readFileSync(path.join(logsPath, file), 'utf8');
            console.log(`\n--- ${file} content (last 200 chars) ---`);
            console.log(content.slice(-200));
        });
    } else {
        console.log('Logs directory not found yet. The server might need to write a log first.');
    }
}

testErrors();

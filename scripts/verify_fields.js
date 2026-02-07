const axios = require('axios');
const API_URL = 'http://localhost:5001/api';

async function verifyFields() {
    try {
        const timestamp = Date.now();
        const email = `testca_${timestamp}@example.com`;
        const password = 'password123';
        const name = 'Test CA';

        console.log(`1. Registering new CA: ${email}`);
        let token;
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, { name, email, password });
            token = regRes.data.token;
            console.log('   Registration successful.');
        } catch (err) {
            console.log('   Registration failed (maybe exists), trying login...');
            const loginRes = await axios.post(`${API_URL}/auth/login`, { email, password });
            token = loginRes.data.token;
            console.log('   Login successful.');
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('\n2. Creating Client with new fields...');
        const clientData = {
            name: `Client ${timestamp}`,
            mobileNumber: '9999999999',
            panNumber: 'ABCDE1234F',
            type: 'BUSINESS',
            dob: '1990-01-01',
            tradeNumber: 'TRADE123',
            gstId: 'GSTUSER',
            gstPassword: 'GSTPASS',
            address: '123 Test St'
        };

        const createRes = await axios.post(`${API_URL}/client/create`, clientData, config);
        const createdClient = createRes.data.data;

        const fieldsToCheck = ['tradeNumber', 'gstId', 'gstPassword', 'address'];
        const missing = fieldsToCheck.filter(f => createdClient[f] !== clientData[f]);

        if (missing.length === 0) {
            console.log('   SUCCESS: All new fields saved correctly.');
        } else {
            console.error('   FAILURE: Fields mismatch:', missing);
            process.exit(1);
        }

        console.log('\n3. Updating Client fields...');
        const updateData = {
            tradeNumber: 'TRADE_UPDATED',
            gstId: 'GSTUSER_UPDATED',
            gstPassword: 'GSTPASS_UPDATED',
            address: '456 Updated St'
        };

        const updateRes = await axios.put(`${API_URL}/client/edit/${createdClient._id}`, updateData, config);
        const updatedClient = updateRes.data.data;

        const mismatchUpdate = fieldsToCheck.filter(f => updatedClient[f] !== updateData[f]);

        if (mismatchUpdate.length === 0) {
            console.log('   SUCCESS: All fields updated correctly.');
        } else {
            console.error('   FAILURE: Update mismatch:', mismatchUpdate);
            process.exit(1);
        }

        console.log('\n--- VERIFICATION COMPLETE: ALL CHECKS PASSED ---');

    } catch (error) {
        console.error('Verification Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received (Server might be down or unreachable). Message:', error.message);
        } else {
            console.error('Error Message:', error.message);
        }
        process.exit(1);
    }
}

verifyFields();

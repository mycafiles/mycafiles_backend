const mongoose = require('mongoose');
const Client = require('./models/Client');
const Folder = require('./models/Folder');
const { generateClientFolders } = require('./services/folderService');
require('dotenv').config();

async function testFolderGen() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create a dummy CA if needed, or just use a dummy ID
        const dummyCaId = new mongoose.Types.ObjectId();

        // 2. Create a Mock Individual Client
        const mockClient = {
            _id: new mongoose.Types.ObjectId(),
            caId: dummyCaId,
            name: 'Test Individual',
            mobileNumber: '1234567890',
            panNumber: 'ABCDE1234F',
            dob: new Date('1990-01-01'),
            type: 'INDIVIDUAL',
            fileNumber: 999
        };

        console.log('Testing folder generation for INDIVIDUAL client...');
        await generateClientFolders(mockClient._id, mockClient);

        // 3. Verify folders in DB
        const folders = await Folder.find({ clientId: mockClient._id });
        console.log(`Total folders generated: ${folders.length}`);

        const kycFolder = folders.find(f => f.category === 'KYC');
        if (kycFolder) {
            console.log(`✅ KYC Folder Found: "${kycFolder.name}"`);
        } else {
            console.log('❌ KYC Folder NOT FOUND');
        }

        const yearFolders = folders.filter(f => f.category === 'GENERAL');
        console.log(`Year folders found: ${yearFolders.length}`);

        // Cleanup
        await Folder.deleteMany({ clientId: mockClient._id });
        console.log('Cleanup complete');

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testFolderGen();

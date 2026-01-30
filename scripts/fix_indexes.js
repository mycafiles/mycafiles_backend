const mongoose = require('mongoose');
require('dotenv').config(); // Looks for .env in current cwd (backend/)

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mrdco';

const fixIndexes = async () => {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const collection = mongoose.connection.collection('clients');

        // List indexes to confirm
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes.map(i => i.name));

        // Drop the problematic index
        const indexName = 'fileNumber_1';
        const exists = indexes.find(i => i.name === indexName);

        if (exists) {
            await collection.dropIndex(indexName);
            console.log(`✅ Index '${indexName}' dropped successfully.`);
        } else {
            console.log(`ℹ️ Index '${indexName}' not found. It might have been already dropped.`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit();
    }
};

fixIndexes();

const mongoose = require('mongoose');
const Client = require('../models/Client');
const { generateClientFolders } = require('../services/folderService');
const Folder = require('../models/Folder');
require('dotenv').config();

const regenerateFolders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mrdco');
        console.log('Connected to MongoDB');

        const clients = await Client.find({});
        console.log(`Found ${clients.length} clients.`);

        for (const client of clients) {
            // Check if root folders exist
            const rootFolders = await Folder.find({ clientId: client._id, parentFolderId: null });

            if (rootFolders.length === 0) {
                console.log(`Regenerating folders for client: ${client.name} (${client._id})`);
                await generateClientFolders(client._id, client);
            } else {
                console.log(`Client ${client.name} already has ${rootFolders.length} root folders. Skipping.`);
            }
        }

        console.log('Folder regeneration checks complete.');
        process.exit(0);

    } catch (err) {
        console.error('Error regenerating folders:', err);
        process.exit(1);
    }
};

regenerateFolders();

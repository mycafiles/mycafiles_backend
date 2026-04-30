const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// NOTE: Ensure you add 'firebaseServiceAccount.json' to the config directory
const serviceAccountPath = path.join(__dirname, '..', 'firebaseServiceAccount.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    logger.info('Firebase Admin initialized successfully.');
  } else {
    logger.warn('Firebase Service Account key not found. Firebase features will fail.');
    // Optional: initializeApp() without credentials if the environment supports it (like Google Cloud)
  }
} catch (error) {
  logger.error(`Error initializing Firebase Admin: ${error.message}`);
}

module.exports = admin;

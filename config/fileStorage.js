const multer = require('multer');

// Configure Multer to store files in memory as Buffers
// This allows us to stream them to MinIO manually in the controller
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

module.exports = { upload };
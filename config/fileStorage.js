const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Storage Engine
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Organize files in Cloudinary folders: "mrd-app/CUSTOMER_ID/YEAR"
        // We can get customerId and year from req.body (sent by frontend)
        const clientId = req.body.clientId || 'unknown';
        const year = req.body.financialYear || 'general';

        return {
            folder: `mrd-app/${clientId}/${year}`,
            resource_type: 'auto', // Auto-detect (PDF, Image, etc.)
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`, // Unique filename
        };
    },
});

const upload = multer({ storage: storage });

module.exports = { upload, cloudinary };
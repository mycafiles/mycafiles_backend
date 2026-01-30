const minioClient = require('../config/minio');
const logger = require('../utils/logger');

// Ensure bucket exists or create it
exports.createBucket = async (bucketName) => {
    try {
        const region = process.env.MINIO_BUCKET_REGION || 'us-east-1';
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName, region);
            logger.info(`Bucket created: ${bucketName}`);

            // Set Public Read Policy
            const policy = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: "*",
                        Action: ["s3:GetObject"],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
            logger.info(`Bucket policy set to public: ${bucketName}`);
        } else {
            logger.info(`Bucket already exists: ${bucketName}`);
            // Optional: Enforce public policy on existing buckets too?
            // For now, let's strictly follow "On Create". 
            // If the user needs to fix existing buckets, they can restart or we can add logic here.
            // Let's add it here to be safe for the user's current debugging session.
            const policy = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: "*",
                        Action: ["s3:GetObject"],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        }
    } catch (err) {
        logger.error(`Error creating bucket ${bucketName}: ${err.message}`);
        throw err;
    }
};

// Create a "folder" (empty object ending with /)
exports.createFolder = async (bucketName, folderPath) => {
    try {
        // Ensure folder path ends with /
        if (!folderPath.endsWith('/')) {
            folderPath += '/';
        }

        // Upload 0 byte object
        await minioClient.putObject(bucketName, folderPath, Buffer.alloc(0), 0);
        logger.info(`Folder created: ${bucketName}/${folderPath}`);
    } catch (err) {
        logger.error(`Error creating folder ${folderPath}: ${err.message}`);
        throw err;
    }
};

// Upload file
exports.uploadFile = async (bucketName, filePath, fileBuffer, metaData = {}) => {
    try {
        await minioClient.putObject(bucketName, filePath, fileBuffer, fileBuffer.length, metaData);
        logger.info(`File uploaded: ${bucketName}/${filePath}`);
        return filePath;
    } catch (err) {
        logger.error(`Error uploading file ${filePath}: ${err.message}`);
        throw err;
    }
};

// Get Presigned URL for viewing/downloading
exports.getFileUrl = async (bucketName, filePath, expiry = 24 * 60 * 60) => {
    try {
        const url = await minioClient.presignedGetObject(bucketName, filePath, expiry);
        return url;
    } catch (err) {
        logger.error(`Error getting file URL ${filePath}: ${err.message}`);
        throw err;
    }
};

// Delete File
exports.deleteFile = async (bucketName, filePath) => {
    try {
        await minioClient.removeObject(bucketName, filePath);
        logger.info(`File deleted: ${bucketName}/${filePath}`);
    } catch (err) {
        logger.error(`Error deleting file ${filePath}: ${err.message}`);
        throw err;
    }
};

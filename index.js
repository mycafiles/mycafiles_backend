const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorMiddleware');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());

app.use(helmet());
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}
app.use(express.json());

// Routes
app.use('/api', require('./routes/indexRoute'));
app.use('/api/ca_connect', require('./apps/ca_connect/routes'));

// Global Error Handling Middleware
app.use(errorHandler);

// Database Connection
const minioClient = require('./config/minio');

app.get("/test-minio", async (req, res) => {
    try {
        const buckets = await minioClient.listBuckets()
        res.json({ success: true, buckets })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mrdco';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

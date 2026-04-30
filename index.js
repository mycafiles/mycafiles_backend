require('dotenv').config();
const express = require('express');
const prisma = require('./config/prisma');

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

// Enable trust proxy to correctly detect HTTPS behind a reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: [
        'https://mycafiles.com',
        'https://www.mycafiles.com',
        'https://client.mycafiles.com',
        'http://localhost:3001', // ✅ FIX
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "frame-ancestors": [
                "'self'",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://127.0.0.1:3002",
                "http://127.0.0.1:5173",
                "https://mycafiles.com",
                "https://www.mycafiles.com",
                "https://client.mycafiles.com",
                "https://mycafiles-client.vercel.app",
                "https://mycafiles-next.vercel.app" // ✅ ADD THIS
            ]
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false // Disable X-Frame-Options to allow framing from the allowed origins
}));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
    }));
}

app.use(express.json());

// ✅ ROOT ROUTE (IMPORTANT for Railway)
app.get("/", (req, res) => {
    res.send("API is running 🚀");
});

// Routes
app.use('/api', require('./routes/indexRoute'));

// Global Error Handler
app.use(errorHandler);

// Cron Jobs
require('./cron/cleanupBin')();
require('./cron/financialYearRollover')();
require('./cron/monthlyGSTGenerator')();

// Firebase Admin Initializaton
require('./config/firebase');

// MinIO Test Route
const minioClient = require('./config/minio');
app.get("/test-minio", async (req, res) => {
    try {
        const buckets = await minioClient.listBuckets();
        res.json({ success: true, buckets });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;

// 🚀 Start Server (Railway-safe)
async function startServer() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL');
    } catch (err) {
        console.error('❌ Database connection error:', err);
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

startServer();

module.exports = prisma;

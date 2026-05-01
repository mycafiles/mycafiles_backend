const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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

/** Dedupe CSP frame-ancestor origins (order preserved). */
function uniqueOrigins(origins) {
    const seen = new Set();
    return origins.filter((o) => {
        if (!o || seen.has(o)) return false;
        seen.add(o);
        return true;
    });
}

/** Extra iframe parent origins via env — comma-separated, e.g. https://staging.example.com */
const frameAncestorsFromEnv = (process.env.FRAME_ANCESTOR_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const defaultFrameAncestors = [
    "'self'",
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5173',
    'https://mycafiles.com',
    'https://www.mycafiles.com',
    'https://client.mycafiles.com',
    'https://mycafiles-client.vercel.app',
    'https://mycafiles-next.vercel.app'
];

const frameAncestorsDirective = uniqueOrigins([
    ...defaultFrameAncestors,
    ...frameAncestorsFromEnv
]);

const corsOriginList = uniqueOrigins([
    'https://mycafiles.com',
    'https://www.mycafiles.com',
    'https://client.mycafiles.com',
    'http://localhost:3001',
    'http://localhost:3000',
    ...frameAncestorsFromEnv.filter((o) => /^https?:\/\//i.test(o))
]);

// Middleware
app.use(
    cors({
        origin: corsOriginList.length ? corsOriginList : true,
        credentials: true
    })
);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                'frame-ancestors': frameAncestorsDirective
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        // Disable default X-Frame-Options so only CSP frame-ancestors applies
        frameguard: false
    })
);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev', {
        stream: { write: (message) => logger.http(message.trim()) }
    }));
} else {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.http(message.trim()) }
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
        logger.info('✅ Connected to PostgreSQL');
    } catch (err) {
        logger.error(`❌ Database connection error: ${err.message}`);
    }

    app.listen(PORT, "0.0.0.0", () => {
        logger.info(`🚀 Server running on port ${PORT}`);
    });
}

startServer();

module.exports = prisma;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const http = require('http');
const fs = require('fs');

const pool = require('./config/db');
const { initSocket } = require('./services/socketService');
const apiRoutes = require('./routes');
const { getLocalIP } = require('./utils/helpers');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const uploadDirs = [
    path.join(__dirname, '..', 'public', 'uploads', 'tests'),
    path.join(__dirname, '..', 'public', 'uploads', 'qr')
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Trust reverse proxy in production (Render, Heroku, Nginx, Cloudflare)
if (isProduction || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// CORS configuration (supports Netlify frontend calling Render backend)
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || !corsOrigin || corsOrigin === '*') return callback(null, true);
        const allowed = corsOrigin.split(',').map(s => s.trim());
        if (allowed.includes(origin)) return callback(null, true);
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: isProduction ? '1d' : 0
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'manthan_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 86400000, // 24 hours
        secure: process.env.COOKIE_SECURE === 'true' || (isProduction && process.env.COOKIE_SECURE !== 'false'),
        sameSite: process.env.COOKIE_SAMESITE || (isProduction && process.env.COOKIE_SECURE !== 'false' ? 'none' : 'lax'),
        httpOnly: true
    }
}));

// Health check endpoint for cloud monitoring / Kubernetes / load balancers
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message
        });
    }
});

// API Routes (MVC)
app.use('/api', apiRoutes);

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: isProduction ? 'An internal server error occurred' : err.message
    });
});

// Server Initialization
if (require.main === module) {
    const localIP = getLocalIP();
    (async () => {
        try {
            const { runMigrations } = require('./migrate');
            await runMigrations(pool);
            console.log('✅ Database ready (migrations applied)');
        } catch (e) {
            console.error('❌ Migration warning:', e.message);
        }

        const runningServer = server.listen(PORT, '0.0.0.0', () => {
            console.log(`🏫 Mathan Institute Server running on port ${PORT}`);
            console.log(`   Local:   http://localhost:${PORT}`);
            console.log(`   Network: http://${localIP}:${PORT}`);
        });

        // Graceful shutdown
        const shutdown = (signal) => {
            console.log(`\n${signal} received. Closing HTTP server and DB connections...`);
            runningServer.close(async () => {
                try {
                    await pool.end();
                    console.log('Database pool closed. Process terminated cleanly.');
                    process.exit(0);
                } catch (err) {
                    console.error('Error closing pool:', err.message);
                    process.exit(1);
                }
            });

            // Force close after 10s timeout
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    })();
}

module.exports = { app, server };

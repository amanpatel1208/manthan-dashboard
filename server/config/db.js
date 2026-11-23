require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

// Support both DATABASE_URL (Render, Railway, Supabase, Neon, Heroku) and discrete parameters
const poolConfig = connectionString
    ? {
        connectionString,
        ssl: process.env.DB_SSL === 'false'
            ? false
            : (isProduction || connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false),
        max: parseInt(process.env.DB_POOL_MAX) || 10
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'manthan_institute',
        port: parseInt(process.env.DB_PORT) || 5432,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: parseInt(process.env.DB_POOL_MAX) || 10
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    if (!isProduction) console.log('✅ PostgreSQL Connected');
});
pool.on('error', (err) => console.error('❌ PG Error:', err.message));

module.exports = pool;

require('dotenv').config();
const { Client } = require('pg');

async function setup() {
    const isProduction = process.env.NODE_ENV === 'production';
    const connectionString = process.env.DATABASE_URL;
    const sslConfig = process.env.DB_SSL === 'false'
        ? false
        : (isProduction || (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('neon.tech'))) || process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false);

    // If no DATABASE_URL is provided, try to ensure DB exists locally
    if (!connectionString) {
        try {
            const rootClient = new Client({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || '',
                database: 'postgres',
                port: parseInt(process.env.DB_PORT) || 5432,
                ssl: sslConfig
            });
            await rootClient.connect();
            const dbName = process.env.DB_NAME || 'manthan_institute';
            const exists = await rootClient.query("SELECT 1 FROM pg_database WHERE datname=$1", [dbName]);
            if (exists.rows.length === 0) {
                await rootClient.query('CREATE DATABASE ' + dbName);
                console.log('Created database:', dbName);
            }
            await rootClient.end();
        } catch (e) {
            console.log('Notice: Could not check/create database automatically (often normal on managed cloud databases):', e.message);
        }
    }

    // Connect to target database
    const clientConfig = connectionString
        ? { connectionString, ssl: sslConfig }
        : {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'manthan_institute',
            port: parseInt(process.env.DB_PORT) || 5432,
            ssl: sslConfig
        };

    const db = new Client(clientConfig);
    await db.connect();
    console.log('Connected to target database. Setting up tables...');

    await db.query(`
CREATE TABLE IF NOT EXISTS admin (AdminId SERIAL PRIMARY KEY, Username TEXT UNIQUE, PasswordHash TEXT, FullName TEXT DEFAULT 'Administrator', Email TEXT, CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS teachers (TeacherId SERIAL PRIMARY KEY, Name TEXT NOT NULL, Subject TEXT, Phone TEXT, Email TEXT, Username TEXT UNIQUE, Password TEXT, PhotoPath TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS batches (BatchId SERIAL PRIMARY KEY, BatchName TEXT NOT NULL, Class TEXT NOT NULL, Subject TEXT, Timing TEXT, TeacherId INTEGER, MonthlyFee REAL DEFAULT 0, MaxStudents INTEGER DEFAULT 30, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS students (StudentId SERIAL PRIMARY KEY, FullName TEXT NOT NULL, FatherName TEXT, MotherName TEXT, StudentPhone TEXT, ParentPhone TEXT, Address TEXT, Class TEXT, DateOfBirth TEXT, AdmissionDate TEXT DEFAULT CURRENT_DATE::TEXT, BatchId INTEGER, Username TEXT UNIQUE, Password TEXT, PhotoPath TEXT, Gender TEXT DEFAULT 'Male', BloodGroup TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS attendance (AttendanceId SERIAL PRIMARY KEY, StudentId INTEGER, BatchId INTEGER, Date TEXT, Status TEXT DEFAULT 'Present', MarkedBy INTEGER, Remarks TEXT, CreatedAt TIMESTAMP DEFAULT NOW(), UNIQUE(StudentId, BatchId, Date));
CREATE TABLE IF NOT EXISTS fees (FeeId SERIAL PRIMARY KEY, StudentId INTEGER, Month TEXT, Year INTEGER, TotalFee REAL, PaidAmount REAL DEFAULT 0, PaymentDate TEXT, PaymentMethod TEXT DEFAULT 'Cash', ReceiptNumber TEXT UNIQUE, Status TEXT DEFAULT 'Pending', Remarks TEXT, CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS homework (HomeworkId SERIAL PRIMARY KEY, BatchId INTEGER, TeacherId INTEGER, Title TEXT, Description TEXT, Subject TEXT, UploadDate TEXT DEFAULT CURRENT_DATE::TEXT, DueDate TEXT, FilePath TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tests (TestId SERIAL PRIMARY KEY, BatchId INTEGER, Subject TEXT, TestName TEXT, TestDate TEXT, TestTime TEXT, MaximumMarks INTEGER DEFAULT 100, Duration TEXT, Description TEXT, Status TEXT DEFAULT 'Upcoming', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS results (ResultId SERIAL PRIMARY KEY, StudentId INTEGER, TestId INTEGER, MarksObtained REAL, Grade TEXT, Remarks TEXT, CreatedAt TIMESTAMP DEFAULT NOW(), UNIQUE(StudentId, TestId));
CREATE TABLE IF NOT EXISTS notices (NoticeId SERIAL PRIMARY KEY, Title TEXT, Description TEXT, PublishDate TEXT DEFAULT CURRENT_DATE::TEXT, Audience TEXT DEFAULT 'All', Priority TEXT DEFAULT 'Normal', PostedBy TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS timetable (TimetableId SERIAL PRIMARY KEY, BatchId INTEGER, Day TEXT, Subject TEXT, StartTime TEXT, EndTime TEXT, TeacherId INTEGER, Room TEXT, CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS reminders (ReminderId SERIAL PRIMARY KEY, Type TEXT, Title TEXT, Description TEXT, TargetDate TEXT, TargetId INTEGER, IsRead INTEGER DEFAULT 0, Audience TEXT DEFAULT 'All', CreatedAt TIMESTAMP DEFAULT NOW());
    `);

    // Run migrations for remaining tables & columns
    const { runMigrations } = require('./migrate');
    await runMigrations(db);

    // Bootstrap admin login
    const cnt = await db.query('SELECT COUNT(*) as c FROM admin');
    if (parseInt(cnt.rows[0].c) === 0) {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        await db.query(
            "INSERT INTO admin (Username,PasswordHash,FullName,Email) VALUES ($1,$2,$3,$4)",
            [username, password, 'Administrator', process.env.ADMIN_EMAIL || 'admin@manthaninstitute.com']
        );
        console.log('Created initial admin login: ' + username + ' / ' + password);
    } else {
        console.log('Admin login already exists.');
    }

    await db.end();
    console.log('Database is ready.');
}

if (require.main === module) {
    setup().catch(e => { console.error('Error setting up DB:', e.message); process.exit(1); });
}

module.exports = { setup };

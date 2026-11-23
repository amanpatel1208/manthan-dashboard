const { Server } = require('socket.io');
const pool = require('../config/db');

let io = null;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: (origin, cb) => cb(null, true),
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        socket.on('register', (data) => {
            if (data && data.role) socket.join(data.role);
            if (data && data.id) socket.join('user_' + data.id);
        });
        socket.on('disconnect', () => {});
    });

    return io;
}

function getIO() {
    return io;
}

// Auto-notify helper
async function notify(studentId, type, title, message) {
    try {
        await pool.query(
            'INSERT INTO notifications (StudentId,Type,Title,Message) VALUES ($1,$2,$3,$4)',
            [studentId, type, title, message]
        );
        if (io) {
            io.to('user_' + studentId).emit('notification', { type, title, message });
        }
    } catch (e) {
        console.error('Notify error:', e.message);
    }
}

async function notifyBatch(batchId, type, title, message) {
    try {
        const students = (await pool.query(
            `SELECT DISTINCT s.StudentId FROM students s
             LEFT JOIN student_batches sb ON sb.StudentId=s.StudentId AND sb.BatchId=$1
             WHERE s.Status='Active' AND (sb.BatchId=$1 OR s.BatchId=$1)`,
            [batchId]
        )).rows;

        for (const s of students) {
            await notify(s.studentid, type, title, message);
        }
    } catch (e) {
        console.error('NotifyBatch error:', e.message);
    }
}

// Admin notifications (StudentId = 0) + realtime push
async function notifyAdmin(type, title, message) {
    try {
        await pool.query(
            'INSERT INTO notifications (StudentId,Type,Title,Message) VALUES (0,$1,$2,$3)',
            [type, title, message]
        );
        if (io) {
            io.to('admin').emit('admin_notification', {
                type,
                title,
                message,
                createdAt: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error('NotifyAdmin error:', e.message);
    }
}

module.exports = {
    initSocket,
    getIO,
    notify,
    notifyBatch,
    notifyAdmin
};

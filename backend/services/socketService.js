const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, normalizeRole, isSuperAdminRole } = require('../middleware/auth');
const { createLogger, format, transports } = require('winston');

// Create a dedicated logger for socket events if needed, 
// or accept the main logger passed from server.js. 
// For now, we'll implement a simple internal logger backup.
const internalLogger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [
        new transports.Console()
    ]
});

let io;

const init = (server, allowedOrigins, logger = internalLogger) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        logger.info(`User Connected: ${socket.id}`);

        try {
            const raw = socket.handshake?.auth?.token || socket.handshake?.query?.token;
            const token = Array.isArray(raw) ? raw[0] : raw;
            if (token) {
                const payload = jwt.verify(String(token), JWT_SECRET);
                socket.user = payload;
            }
        } catch { }

        const canJoinRoom = async (roomId) => {
            if (!socket.user) return true;
            const { Conversation } = require('../models');
            const conv = await Conversation.findOne({ where: { roomId } });
            if (!conv) return false;
            const u = socket.user || {};
            const role = normalizeRole(u.role);
            return (
                (role === 'PARENT' && String(conv.parentId || '') === String(u.parentId || '')) ||
                (role === 'TEACHER' && String(conv.teacherId || '') === String(u.teacherId || '')) ||
                (role === 'SCHOOL_ADMIN' && Number(conv.schoolId || 0) === Number(u.schoolId || 0)) ||
                isSuperAdminRole(u.role)
            );
        };

        const tryJoin = async (roomId) => {
            try {
                if (!roomId) return;
                const rid = String(roomId);
                const allowed = await canJoinRoom(rid);
                if (!allowed) return;
                socket.join(rid);
                logger.info(`User ${socket.id} joined room: ${rid}`);
            } catch (e) {
                try { logger.error(`Socket join error: ${e?.message || e}`); } catch { }
            }
        };

        const tryLeave = (roomId) => {
            try {
                if (!roomId) return;
                const rid = String(roomId);
                socket.leave(rid);
                logger.info(`User ${socket.id} left room: ${rid}`);
            } catch { }
        };

        socket.on('join_conversation', (roomId) => { void tryJoin(roomId); });
        socket.on('join_room', (roomId) => { void tryJoin(roomId); });
        socket.on('leave_conversation', (roomId) => { tryLeave(roomId); });
        socket.on('leave_room', (roomId) => { tryLeave(roomId); });

        socket.on('send_message', async (payload) => {
            try {
                const { conversationId, roomId, text, senderId, senderRole } = payload || {};
                if (!conversationId || !roomId || !text || !senderId || !senderRole) return;
                const { Message } = require('../models');
                const sid = socket.user?.id || senderId;
                const srole = normalizeRole(socket.user?.role || senderRole);
                const msg = await Message.create({ id: `msg_${Date.now()}`, conversationId, text, senderId: sid, senderRole: srole });
                const out = { id: msg.id, conversationId, text, senderId: sid, senderRole: srole, timestamp: msg.createdAt };
                io.to(roomId).emit('new_message', out);
                io.to(roomId).emit('receive_message', out);
            } catch (e) {
                try { logger.error(`Socket send_message error: ${e?.message || e}`); } catch { }
            }
        });

        socket.on('disconnect', () => {
            logger.info(`User Disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { init, getIO };

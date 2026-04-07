const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Team debate rooms (Premium feature)
const rooms = new Map();

function setupSocket(io) {
  // Auth middleware — verify JWT before allowing connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.user.name} (${socket.id})`);

    // ─── Create debate room ───
    socket.on('create_room', ({ topic, userStance }) => {
      if (socket.user.plan !== 'premium') {
        socket.emit('error', { message: 'Premium plan required for team rooms.' });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const room = {
        id: roomId,
        topic,
        host: { id: socket.user._id.toString(), name: socket.user.name, stance: userStance },
        participants: [{ id: socket.user._id.toString(), name: socket.user.name, stance: userStance }],
        messages: [],
        status: 'waiting',
        createdAt: new Date()
      };

      rooms.set(roomId, room);
      socket.join(roomId);

      // Track which room this socket is in for disconnect cleanup
      socket.currentRoomId = roomId;

      console.log(`🏠 Room created: ${roomId} by ${socket.user.name}`);
      socket.emit('room_created', { roomId, room });
    });

    // ─── Join debate room ───
    socket.on('join_room', ({ roomId }) => {
      if (socket.user.plan !== 'premium') {
        socket.emit('error', { message: 'Premium plan required for team rooms.' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found. It may have expired or been closed.' });
        return;
      }

      if (room.participants.length >= 4) {
        socket.emit('error', { message: 'Room is full (max 4 participants).' });
        return;
      }

      // Check if user is already in the room
      const alreadyIn = room.participants.some(p => p.id === socket.user._id.toString());
      if (alreadyIn) {
        // Just re-join the socket.io room and send room data
        socket.join(roomId);
        socket.currentRoomId = roomId;
        socket.emit('room_joined', { roomId, room });
        return;
      }

      // Assign opposite stance to the host
      const hostStance = room.host.stance;
      const joinStance = hostStance === 'for' ? 'against' : 'for';

      const participant = {
        id: socket.user._id.toString(),
        name: socket.user.name,
        stance: joinStance
      };

      room.participants.push(participant);
      socket.join(roomId);

      // Track which room this socket is in for disconnect cleanup
      socket.currentRoomId = roomId;

      console.log(`👤 ${socket.user.name} joined room ${roomId} (${joinStance})`);

      // 1. Send room data to the JOINER so they can render the room
      socket.emit('room_joined', { roomId, room });

      // 2. Notify ALL participants (including joiner) about the new user
      io.to(roomId).emit('user_joined', {
        user: { name: socket.user.name, stance: joinStance },
        participants: room.participants
      });
    });

    // ─── Send debate message in room ───
    socket.on('room_message', ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room no longer exists.' });
        return;
      }

      // Verify user is in the room
      const isParticipant = room.participants.some(p => p.id === socket.user._id.toString());
      if (!isParticipant) {
        socket.emit('error', { message: 'You are not in this room.' });
        return;
      }

      const msg = {
        userId: socket.user._id.toString(),
        userName: socket.user.name,
        content: message,
        timestamp: new Date()
      };

      room.messages.push(msg);
      io.to(roomId).emit('new_message', msg);
    });

    // ─── Leave room ───
    socket.on('leave_room', ({ roomId }) => {
      handleLeaveRoom(socket, io, roomId);
    });

    // ─── List available rooms ───
    socket.on('list_rooms', () => {
      const availableRooms = Array.from(rooms.values())
        .filter(r => r.status === 'waiting' && r.participants.length < 4)
        .map(r => ({
          id: r.id,
          topic: r.topic,
          host: r.host.name,
          participants: r.participants.length,
          createdAt: r.createdAt
        }));
      
      socket.emit('rooms_list', { rooms: availableRooms });
    });

    // ─── Disconnect cleanup ───
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.user.name} (${reason})`);
      
      // Clean up from tracked room
      if (socket.currentRoomId) {
        handleLeaveRoom(socket, io, socket.currentRoomId);
      }

      // Also scan all rooms as a safety net
      for (const [roomId, room] of rooms.entries()) {
        const wasIn = room.participants.some(p => p.id === socket.user._id.toString());
        if (wasIn) {
          handleLeaveRoom(socket, io, roomId);
        }
      }
    });
  });
}

function handleLeaveRoom(socket, io, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const userId = socket.user._id.toString();
  const wasIn = room.participants.some(p => p.id === userId);
  if (!wasIn) return;

  room.participants = room.participants.filter(p => p.id !== userId);
  socket.leave(roomId);
  socket.currentRoomId = null;

  console.log(`🚪 ${socket.user.name} left room ${roomId}`);

  if (room.participants.length === 0) {
    rooms.delete(roomId);
    console.log(`🗑️  Room ${roomId} deleted (empty)`);
  } else {
    io.to(roomId).emit('user_left', {
      user: socket.user.name,
      participants: room.participants
    });
  }
}

module.exports = { setupSocket };

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Team debate rooms (Premium feature)
const rooms = new Map();

function setupSocket(io) {
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
    console.log(`✅ User connected: ${socket.user.name}`);

    // Create debate room
    socket.on('create_room', ({ topic, userStance }) => {
      if (socket.user.plan !== 'premium') {
        socket.emit('error', { message: 'Premium plan required' });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      rooms.set(roomId, {
        id: roomId,
        topic,
        host: { id: socket.user._id.toString(), name: socket.user.name, stance: userStance },
        participants: [{ id: socket.user._id.toString(), name: socket.user.name, stance: userStance }],
        messages: [],
        status: 'waiting',
        createdAt: new Date()
      });

      socket.join(roomId);
      socket.emit('room_created', { roomId, room: rooms.get(roomId) });
    });

    // Join debate room
    socket.on('join_room', ({ roomId }) => {
      if (socket.user.plan !== 'premium') {
        socket.emit('error', { message: 'Premium plan required' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.participants.length >= 4) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      const hostStance = room.host.stance;
      const joinStance = hostStance === 'for' ? 'against' : 'for';

      room.participants.push({
        id: socket.user._id.toString(),
        name: socket.user.name,
        stance: joinStance
      });

      socket.join(roomId);
      io.to(roomId).emit('user_joined', {
        user: { name: socket.user.name, stance: joinStance },
        participants: room.participants
      });
    });

    // Send debate message in room
    socket.on('room_message', ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const msg = {
        userId: socket.user._id.toString(),
        userName: socket.user.name,
        content: message,
        timestamp: new Date()
      };

      room.messages.push(msg);
      io.to(roomId).emit('new_message', msg);
    });

    // Leave room
    socket.on('leave_room', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.participants = room.participants.filter(p => p.id !== socket.user._id.toString());
      socket.leave(roomId);

      if (room.participants.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('user_left', {
          user: socket.user.name,
          participants: room.participants
        });
      }
    });

    // List available rooms
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

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);
      // Clean up rooms
      for (const [roomId, room] of rooms.entries()) {
        room.participants = room.participants.filter(p => p.id !== socket.user._id.toString());
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
}

module.exports = { setupSocket };

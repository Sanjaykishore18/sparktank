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
        voiceUsers: [], // track who has voice enabled
        status: 'waiting',
        createdAt: new Date()
      };

      rooms.set(roomId, room);
      socket.join(roomId);
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
        socket.join(roomId);
        socket.currentRoomId = roomId;
        socket.emit('room_joined', { roomId, room });
        return;
      }

      const hostStance = room.host.stance;
      const joinStance = hostStance === 'for' ? 'against' : 'for';

      const participant = {
        id: socket.user._id.toString(),
        name: socket.user.name,
        stance: joinStance
      };

      room.participants.push(participant);
      socket.join(roomId);
      socket.currentRoomId = roomId;

      console.log(`👤 ${socket.user.name} joined room ${roomId} (${joinStance})`);

      // Send room data to the JOINER
      socket.emit('room_joined', { roomId, room });

      // Notify ALL participants about the new user
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

    // ═══════════════════════════════════════════
    // ─── WebRTC Voice Signaling ───
    // ═══════════════════════════════════════════

    // User wants to join voice chat
    socket.on('voice_join', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const userId = socket.user._id.toString();
      if (!room.voiceUsers.includes(userId)) {
        room.voiceUsers.push(userId);
      }

      console.log(`🎤 ${socket.user.name} joined voice in ${roomId}`);

      // Tell everyone in the room about voice state change
      io.to(roomId).emit('voice_users_updated', {
        voiceUsers: room.voiceUsers
      });

      // Tell the joiner which users are already in voice (so they can create offers)
      socket.emit('voice_peers', {
        peers: room.voiceUsers.filter(id => id !== userId)
      });

      // Tell existing voice users about the new voice peer (they should send offers)
      socket.to(roomId).emit('voice_peer_joined', {
        peerId: userId,
        peerName: socket.user.name,
        socketId: socket.id
      });
    });

    // User leaves voice chat
    socket.on('voice_leave', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const userId = socket.user._id.toString();
      room.voiceUsers = room.voiceUsers.filter(id => id !== userId);

      console.log(`🔇 ${socket.user.name} left voice in ${roomId}`);

      io.to(roomId).emit('voice_users_updated', {
        voiceUsers: room.voiceUsers
      });

      socket.to(roomId).emit('voice_peer_left', {
        peerId: userId
      });
    });

    // WebRTC signaling: relay offer to specific peer
    socket.on('webrtc_offer', ({ roomId, targetUserId, offer }) => {
      const fromUserId = socket.user._id.toString();
      // Find the target socket in the room
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (!roomSockets) return;

      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.user._id.toString() === targetUserId) {
          s.emit('webrtc_offer', {
            fromUserId,
            fromName: socket.user.name,
            offer
          });
          break;
        }
      }
    });

    // WebRTC signaling: relay answer to specific peer
    socket.on('webrtc_answer', ({ roomId, targetUserId, answer }) => {
      const fromUserId = socket.user._id.toString();
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (!roomSockets) return;

      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.user._id.toString() === targetUserId) {
          s.emit('webrtc_answer', {
            fromUserId,
            answer
          });
          break;
        }
      }
    });

    // WebRTC signaling: relay ICE candidate to specific peer
    socket.on('webrtc_ice_candidate', ({ roomId, targetUserId, candidate }) => {
      const fromUserId = socket.user._id.toString();
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (!roomSockets) return;

      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.user._id.toString() === targetUserId) {
          s.emit('webrtc_ice_candidate', {
            fromUserId,
            candidate
          });
          break;
        }
      }
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
      
      if (socket.currentRoomId) {
        handleLeaveRoom(socket, io, socket.currentRoomId);
      }

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

  // Remove from voice users
  if (room.voiceUsers.includes(userId)) {
    room.voiceUsers = room.voiceUsers.filter(id => id !== userId);
    io.to(roomId).emit('voice_users_updated', { voiceUsers: room.voiceUsers });
    socket.to(roomId).emit('voice_peer_left', { peerId: userId });
  }

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

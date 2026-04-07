import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import './Debate.css';

// Derive socket URL from API URL (strip /api suffix if present)
const SOCKET_URL = (() => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
})();

export default function TeamDebateSession() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const roomIdRef = useRef(null);

  // Compute invite link from current room
  const currentRoomId = room?.id || (roomId !== 'new' ? roomId : null);
  const inviteLink = currentRoomId ? `${window.location.origin}/debate?room=${currentRoomId}` : '';

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep roomIdRef in sync for cleanup
  useEffect(() => {
    roomIdRef.current = room?.id || null;
  }, [room]);

  // Main socket effect
  useEffect(() => {
    const token = localStorage.getItem('speakx_token');
    if (!token) {
      setError('You must be logged in to join a team room.');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    // ─── Connection established ───
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);

      if (roomId === 'new' && state?.topic) {
        // Creating a new room
        newSocket.emit('create_room', { topic: state.topic, userStance: state.stance });
      } else if (roomId && roomId !== 'new') {
        // Joining an existing room
        newSocket.emit('join_room', { roomId });
      } else {
        setError('Invalid room setup. Please start from the Debate Arena.');
      }
    });

    // ─── Room created (host only) ───
    newSocket.on('room_created', (data) => {
      console.log('🏠 Room created:', data.roomId);
      setRoom(data.room);
      window.history.replaceState(null, '', `/debate/room/${data.roomId}`);
    });

    // ─── Room joined (joiner only) ───
    newSocket.on('room_joined', (data) => {
      console.log('🤝 Joined room:', data.roomId);
      setRoom(data.room);
      // Load any existing messages from the room
      if (data.room.messages && data.room.messages.length > 0) {
        setMessages(data.room.messages);
      }
    });

    // ─── Someone joined the room (everyone) ───
    newSocket.on('user_joined', (data) => {
      setRoom(prev => {
        if (!prev) return prev;
        return { ...prev, participants: data.participants };
      });
      setMessages(prev => [...prev, { 
        isSystem: true, 
        content: `${data.user.name} joined the room (${data.user.stance} the topic).` 
      }]);
    });

    // ─── Someone left the room ───
    newSocket.on('user_left', (data) => {
      setRoom(prev => {
        if (!prev) return prev;
        return { ...prev, participants: data.participants };
      });
      setMessages(prev => [...prev, { 
        isSystem: true, 
        content: `${data.user} left the room.` 
      }]);
    });

    // ─── New chat message ───
    newSocket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // ─── Connection errors ───
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(`Connection failed: ${err.message}`);
    });

    // ─── Server-side errors ───
    newSocket.on('error', (err) => {
      setError(err.message);
    });

    // ─── Cleanup on unmount ───
    return () => {
      if (roomIdRef.current) {
        newSocket.emit('leave_room', { roomId: roomIdRef.current });
      }
      newSocket.disconnect();
    };
  }, [roomId, state]);

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !socket || !room) return;

    socket.emit('room_message', { roomId: room.id, message: input });
    setInput('');
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied!');
  };

  // ─── Error State ───
  if (error) {
    return (
      <div className="debate-session page">
        <div className="container">
          <div className="glass-card" style={{padding: 'var(--space-6)', textAlign: 'center'}}>
            <h2 style={{color: 'var(--error-color)'}}>Error</h2>
            <p>{error}</p>
            <button className="btn btn-primary" style={{marginTop: 'var(--space-4)'}} onClick={() => navigate('/debate')}>
              Back to Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading State ───
  if (!room) {
    return (
      <div className="debate-session page">
        <div className="container">
          <div className="loading-overlay" style={{position: 'relative', height: 400}}>
            <div className="spinner" />
            <p style={{marginTop: 20}}>Connecting to Team Room...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Room UI ───
  return (
    <div className="debate-session page">
      <div className="container">
        
        <div className="session-header glass-card animate-slide-up">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/debate')}>
            ← Leave Room
          </button>
          <div className="topic-display">
            <h2>{room.topic}</h2>
            <div className="room-meta" style={{display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap'}}>
              <span className="badge badge-accent">Room: {room.id}</span>
              <span className="badge badge-primary">Participants: {room.participants.length}/4</span>
              <button className="btn btn-outline btn-sm" onClick={copyInvite}>📋 Copy Invite Link</button>
            </div>
          </div>
        </div>

        <div className="chat-container glass-card animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🤝</span>
                <h3>Waiting for friends</h3>
                <p>Share the invite link to start the debate!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                if (msg.isSystem) {
                  return (
                    <div key={index} className="system-message">
                      <p>{msg.content}</p>
                    </div>
                  );
                }

                const isMe = msg.userId === user?.id;
                
                return (
                  <div key={index} className={`message ${isMe ? 'message-user' : 'message-ai'}`}>
                    <div className="message-bubble">
                      <div className="message-header" style={{fontSize: '0.8rem', opacity: 0.7, marginBottom: 4}}>
                        {isMe ? 'You' : msg.userName}
                      </div>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="input-area" onSubmit={sendMessage}>
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your argument..."
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

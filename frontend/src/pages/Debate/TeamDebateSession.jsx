import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import './Debate.css';

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
  const inviteLink = `${window.location.origin}/debate?room=${roomId === 'new' ? room?.id : roomId}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to socket in the backend URL
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (roomId === 'new' && state?.topic) {
        newSocket.emit('create_room', { topic: state.topic, userStance: state.stance });
      } else if (roomId !== 'new') {
        newSocket.emit('join_room', { roomId });
      } else {
        setError('Invalid room setup. Please start from the Debate Arena.');
      }
    });

    newSocket.on('room_created', (data) => {
      setRoom(data.room);
      // Replace the strict 'new' route with the actual room id in the URL bar
      window.history.replaceState(null, '', `/debate/room/${data.roomId}`);
    });

    newSocket.on('user_joined', (data) => {
      setRoom(prev => {
        if (!prev) return prev;
        return { ...prev, participants: data.participants };
      });
      setMessages(prev => [...prev, { 
        isSystem: true, 
        content: `${data.user.name} joined the room standing ${data.user.stance} the topic.` 
      }]);
    });

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

    newSocket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('error', (err) => {
      setError(err.message);
    });

    return () => {
      if (room?.id) {
        newSocket.emit('leave_room', { roomId: room.id });
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

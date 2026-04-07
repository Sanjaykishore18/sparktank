import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
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

  // Voice chat
  const { 
    isVoiceOn, isMuted, voiceUsers, voiceError,
    joinVoice, leaveVoice, toggleMute 
  } = useVoiceChat(socket, room?.id, user?.id);

  // Convert voice to text
  const {
    isListening, transcript, interimTranscript,
    startListening, stopListening, resetTranscript
  } = useSpeechRecognition();

  // Sync speech recognition with voice state
  useEffect(() => {
    if (isVoiceOn && !isMuted) {
      startListening();
    } else {
      stopListening();
    }
  }, [isVoiceOn, isMuted, startListening, stopListening]);

  // Auto-send transcribed text as a chat message
  useEffect(() => {
    if (transcript && socket && room && isVoiceOn && !isMuted) {
      socket.emit('room_message', { roomId: room.id, message: transcript.trim() });
      resetTranscript();
    }
  }, [transcript, socket, room, isVoiceOn, isMuted, resetTranscript]);

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

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);

      if (roomId === 'new' && state?.topic) {
        newSocket.emit('create_room', { topic: state.topic, userStance: state.stance });
      } else if (roomId && roomId !== 'new') {
        newSocket.emit('join_room', { roomId });
      } else {
        setError('Invalid room setup. Please start from the Debate Arena.');
      }
    });

    newSocket.on('room_created', (data) => {
      console.log('🏠 Room created:', data.roomId);
      setRoom(data.room);
      window.history.replaceState(null, '', `/debate/room/${data.roomId}`);
    });

    newSocket.on('room_joined', (data) => {
      console.log('🤝 Joined room:', data.roomId);
      setRoom(data.room);
      if (data.room.messages && data.room.messages.length > 0) {
        setMessages(data.room.messages);
      }
    });

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

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(`Connection failed: ${err.message}`);
    });

    newSocket.on('error', (err) => {
      setError(err.message);
    });

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

  // Helper to check if a participant is in voice
  const isInVoice = (participantId) => voiceUsers.includes(participantId);

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
        
        {/* Room Header */}
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

        {/* Voice Chat Panel */}
        <div className="voice-panel glass-card animate-slide-up" style={{animationDelay: '0.05s'}}>
          <div className="voice-panel-header">
            <div className="voice-panel-title">
              <span className="voice-icon">🎙️</span>
              <h3>Voice Chat</h3>
              {isVoiceOn && (
                <span className="voice-live-badge">
                  <span className="voice-live-dot" />
                  LIVE
                </span>
              )}
            </div>
            <div className="voice-controls">
              {!isVoiceOn ? (
                <button className="btn btn-success btn-sm" onClick={joinVoice}>
                  🎤 Join Voice
                </button>
              ) : (
                <>
                  <button 
                    className={`btn btn-sm ${isMuted ? 'btn-accent' : 'btn-ghost'}`} 
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? '🔇 Muted' : '🔊 Unmute'}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={leaveVoice} style={{borderColor: 'var(--error-400)', color: 'var(--error-400)'}}>
                    📴 Leave Voice
                  </button>
                </>
              )}
            </div>
          </div>

          {voiceError && (
            <div className="voice-error">
              ⚠️ {voiceError}
            </div>
          )}

          {/* Participants with voice status */}
          <div className="voice-participants">
            {room.participants.map((p) => (
              <div key={p.id} className={`voice-participant ${isInVoice(p.id) ? 'voice-active' : ''}`}>
                <div className="voice-avatar">
                  {p.name.charAt(0).toUpperCase()}
                  {isInVoice(p.id) && (
                    <span className="voice-indicator-dot" />
                  )}
                </div>
                <div className="voice-participant-info">
                  <span className="voice-participant-name">
                    {p.id === user?.id ? `${p.name} (You)` : p.name}
                  </span>
                  <span className={`voice-participant-stance ${p.stance === 'for' ? 'stance-for' : 'stance-against'}`}>
                    {p.stance === 'for' ? '👍 For' : '👎 Against'}
                  </span>
                </div>
                {isInVoice(p.id) && (
                  <div className="voice-wave">
                    <span /><span /><span /><span />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
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

          {interimTranscript && isVoiceOn && !isMuted ? (
            <div className="interim-text" style={{ padding: '0 16px 8px', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
              {interimTranscript}...
            </div>
          ) : null}

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

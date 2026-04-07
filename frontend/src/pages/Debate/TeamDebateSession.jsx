import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useAuth } from '../../context/AuthContext';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import threeService from '../../services/threeService';
import './Debate.css';

// Derive socket URL from API URL (strip /api suffix if present)
const SOCKET_URL = (() => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  return apiUrl.replace(/\/api\/?$/, '') || '/';
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

  const canvasRef = useRef(null);
  const roomRef = useRef(null);
  const animationRef = useRef(null);

  // Voice chat
  const { 
    isVoiceOn, isMuted, isDeafened, voiceUsers, voiceError,
    joinVoice, leaveVoice, toggleMute, toggleDeafen 
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
        newSocket.emit('create_room', { topic: state.topic, userStance: state.stance, maxSize: state.maxSize || 4 });
      } else if (roomId && roomId !== 'new') {
        newSocket.emit('join_room', { roomId, stance: state?.stance || null });
      } else {
        setError('Invalid room setup. Please start from the Debate Arena.');
      }
    });

    newSocket.on('room_created', (data) => {
      setRoom(data.room);
      window.history.replaceState(null, '', `/debate/room/${data.roomId}`);
    });

    newSocket.on('room_joined', (data) => {
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
        content: `${data.user.name} joined the room.` 
      }]);
    });

    newSocket.on('user_updated', (data) => {
      setRoom(prev => {
        if (!prev) return prev;
        return { ...prev, participants: data.participants };
      });
    });

    newSocket.on('user_left', (data) => {
      setRoom(prev => {
        if (!prev) return prev;
        return { ...prev, participants: data.participants };
      });
      setMessages(prev => [...prev, { 
        isSystem: true, 
        content: `${data.user.name || data.user} left the room.` 
      }]);
    });

    newSocket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
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

  // 3D Initialization logic
  useEffect(() => {
    if (!canvasRef.current || !room) return;

    // Clean up
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (roomRef.current?.renderer) roomRef.current.renderer.dispose();

    let userConfig = { skin: 0, hair: 0, hairColor: 0, outfit: 0, outfitColor: 0 };
    try {
      if (user?.avatar) userConfig = typeof user.avatar === 'string' ? JSON.parse(user.avatar) : user.avatar;
    } catch(e) {}

    const { scene, camera, renderer } = threeService.initRoomScene(canvasRef.current, userConfig);
    
    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2; // Don't go below floor

    // Clear all Groups from the scene (removes service-placed avatars/chairs)
    // Must iterate backwards when removing children to avoid skipping elements
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child.type === 'Group') {
        scene.remove(child);
      }
    }

    const CHAIR_Y  = threeService.CHAIR_Y;
    const SEATED_Y = threeService.SEATED_Y;
    const participantMeshes = [];

    room.participants.forEach((p, i) => {
      let pConfig = { skin: i % 5, hair: i % 4, hairColor: 0, outfit: i % 2, outfitColor: 0 };
      try {
        if (p.avatar) pConfig = typeof p.avatar === 'string' ? JSON.parse(p.avatar) : p.avatar;
      } catch(e) {}

      const angle  = (i / Math.max(room.participants.length, 1)) * Math.PI * 2;
      const radius = 3.8;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      // Chair
      const chair = threeService.buildChair();
      chair.position.set(px, CHAIR_Y, pz);
      chair.lookAt(0, CHAIR_Y, 0); 
      chair.rotateY(Math.PI);      // LookAt points +Z to center. Chair back is at +Z. So we flip it to face outward.
      scene.add(chair);

      // Seated avatar
      const mesh = threeService.buildSeatedAvatarMesh(pConfig);
      mesh.position.set(px, SEATED_Y, pz);
      mesh.lookAt(0, SEATED_Y, 0); // Faces toward center naturally
      scene.add(mesh);
      participantMeshes.push(mesh);
    });

    roomRef.current = { scene, camera, renderer, participantMeshes, controls };

    const handleResize = () => {
      if (!canvasRef.current || !renderer) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const time = Date.now() * 0.002;
      participantMeshes.forEach((mesh, i) => {
        mesh.position.y = 0.05 + Math.sin(time + i) * 0.008;
      });
      controls.update();
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [room]);

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
            <button className="btn btn-primary" onClick={() => navigate('/debate')}>Back to Arena</button>
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
            <p>Connecting to Team Room...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Stance Selection ───
  const amIParticipant = room?.participants?.find(p => p.id === user?.id);
  if (room && !amIParticipant?.stance && amIParticipant) {
    return (
      <div className="debate-session page">
        <div className="container">
          <div className="glass-card animate-scale-in" style={{padding: 'var(--space-8)', textAlign: 'center', maxWidth: '600px', margin: '0 auto', marginTop: '10vh'}}>
            <h2>Choose your stance</h2>
            <h3 style={{margin: 'var(--space-4) 0', color: 'var(--text-secondary)', fontWeight: '400'}}>Topic: <strong>{room.topic}</strong></h3>
            <div style={{display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginTop: 'var(--space-6)'}}>
              <button className="btn btn-success btn-lg" onClick={() => socket.emit('set_stance', { roomId: room.id, stance: 'for' })}>👍 I'm For It</button>
              <button className="btn btn-accent btn-lg" onClick={() => socket.emit('set_stance', { roomId: room.id, stance: 'against' })}>👎 I'm Against It</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Room UI (3D Cinematic) ───
  return (
    <div className="debate-room-container page">
      <div className="room-layout">
        <div id="room-canvas-wrap">
          <canvas ref={canvasRef} id="room-canvas" />
          <div className="room-overlay">
            <div className="room-badge">
              <div className="room-dot" />
              {room.topic}
            </div>
          </div>
          <div className="room-controls-overlay">
            <div className="room-meta-pills">
              <span className="badge-pill">Room ID: {room.id}</span>
              <span className="badge-pill">Participants: {room.participants.length}/{room.maxSize || 4}</span>
            </div>
            <div className="voice-toggles">
              {!isVoiceOn ? (
                <button className="btn-circle btn-success" onClick={joinVoice}>🎧</button>
              ) : (
                <>
                  <button className={`btn-circle ${isMuted ? 'btn-danger' : 'btn-primary'}`} onClick={toggleMute}>{isMuted ? '🔇' : '🎙️'}</button>
                  <button className="btn-circle btn-secondary" onClick={leaveVoice}>📴</button>
                </>
              )}
              <button className="btn-circle btn-primary" onClick={copyInvite}>📋</button>
              <button className="btn-circle btn-ghost" onClick={() => navigate('/debate')}>🚪</button>
            </div>
          </div>
        </div>

        <div className="room-sidebar">
          <div className="sidebar-header">
            <h3>Debate Room</h3>
            <span className="participant-count">👥 {room.participants.length}</span>
          </div>
          <div className="sidebar-content">
            <div className="chat-messages-compact">
              {messages.length === 0 ? (
                <div className="empty-sidebar"><p>Waiting for arguments...</p></div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`compact-bubble ${msg.userId === user?.id ? 'compact-bubble-user' : (msg.isSystem ? 'compact-bubble-system' : 'compact-bubble-ai')}`}>
                    {!msg.isSystem && <div className="bubble-user-name">{msg.userId === user?.id ? 'You' : msg.userName}</div>}
                    <div className="bubble-text">{msg.content}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="sidebar-input" onSubmit={sendMessage}>
              <input type="text" placeholder="Type argument..." value={input} onChange={(e) => setInput(e.target.value)} />
              <button type="submit" disabled={!input.trim()}>✦</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

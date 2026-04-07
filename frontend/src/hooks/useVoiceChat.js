import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

/**
 * useVoiceChat — WebRTC mesh voice chat over Socket.IO signaling.
 * 
 * @param {object} socket — connected Socket.IO instance
 * @param {string} roomId — current room ID
 * @param {string} userId — current user's ID
 * @returns voice chat controls and state
 */
export function useVoiceChat(socket, roomId, userId) {
  const [isVoiceOn, setIsVoiceOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [voiceError, setVoiceError] = useState('');

  // Refs to persist across renders
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // userId -> RTCPeerConnection
  const audioElementsRef = useRef(new Map());   // userId -> HTMLAudioElement
  const pendingCandidatesRef = useRef(new Map()); // userId -> RTCIceCandidate[]

  // ─── Cleanup peer connection ───
  const closePeer = useCallback((peerId) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      audioElementsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
  }, []);

  // ─── Create a peer connection for a remote user ───
  const createPeerConnection = useCallback((peerId, isInitiator) => {
    if (!socket || !roomId || !localStreamRef.current) return null;

    closePeer(peerId);

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local audio tracks
    localStreamRef.current.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', {
          roomId,
          targetUserId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`🔊 Got audio track from peer ${peerId}`);
      let audio = audioElementsRef.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        document.body.appendChild(audio);
        audioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = event.streams[0];
      
      // Attempt to play explicitly
      audio.play().catch(err => console.error(`Audio playback error for ${peerId}:`, err));
    };

    pc.onconnectionstatechange = () => {
      console.log(`WebRTC ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        closePeer(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [socket, roomId, closePeer]);

  // Flush queued candidates
  const flushPendingCandidates = useCallback(async (peerId, pc) => {
    const candidates = pendingCandidatesRef.current.get(peerId);
    if (candidates && candidates.length > 0) {
      console.log(`Flushing ${candidates.length} ICE candidates for ${peerId}`);
      for (const c of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.error('Failed to add queued candidate:', e);
        }
      }
      pendingCandidatesRef.current.delete(peerId);
    }
  }, []);

  // ─── Socket event handlers ───
  useEffect(() => {
    if (!socket) return;

    const handleVoiceUsersUpdated = ({ voiceUsers: users }) => {
      setVoiceUsers(users);
    };

    const handleVoicePeerJoined = async ({ peerId, peerName }) => {
      if (!isVoiceOn || !localStreamRef.current) return;
      console.log(`📞 Creating offer for new peer: ${peerName}`);

      const pc = createPeerConnection(peerId, true);
      if (!pc) return;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', {
          roomId,
          targetUserId: peerId,
          offer: pc.localDescription
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    };

    const handleVoicePeerLeft = ({ peerId }) => {
      console.log(`📴 Peer left voice: ${peerId}`);
      closePeer(peerId);
    };

    const handleOffer = async ({ fromUserId, offer }) => {
      if (!isVoiceOn || !localStreamRef.current) return;
      console.log(`📨 Received offer from ${fromUserId}`);

      const pc = createPeerConnection(fromUserId, false);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', {
          roomId,
          targetUserId: fromUserId,
          answer: pc.localDescription
        });
        
        await flushPendingCandidates(fromUserId, pc);
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    };

    const handleAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;
      console.log(`📨 Received answer from ${fromUserId}`);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates(fromUserId, pc);
      } catch (err) {
        console.error('Failed to set remote description:', err);
      }
    };

    const handleIceCandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc || !pc.remoteDescription) {
        // Queue it if pc not ready
        if (!pendingCandidatesRef.current.has(fromUserId)) {
          pendingCandidatesRef.current.set(fromUserId, []);
        }
        pendingCandidatesRef.current.get(fromUserId).push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    socket.on('voice_users_updated', handleVoiceUsersUpdated);
    socket.on('voice_peer_joined', handleVoicePeerJoined);
    socket.on('voice_peer_left', handleVoicePeerLeft);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.off('voice_users_updated', handleVoiceUsersUpdated);
      socket.off('voice_peer_joined', handleVoicePeerJoined);
      socket.off('voice_peer_left', handleVoicePeerLeft);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, roomId, isVoiceOn, createPeerConnection, closePeer, flushPendingCandidates]);

  // ─── Join voice ───
  const joinVoice = useCallback(async () => {
    if (!socket || !roomId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });

      localStreamRef.current = stream;
      setIsVoiceOn(true);
      setIsMuted(false);
      setVoiceError('');

      // Tell the server we're joining voice
      socket.emit('voice_join', { roomId });

    } catch (err) {
      console.error('Microphone access denied:', err);
      setVoiceError('Microphone access denied. Please allow microphone access and try again.');
    }
  }, [socket, roomId]);

  // ─── Leave voice ───
  const leaveVoice = useCallback(() => {
    if (!socket || !roomId) return;

    // Close all peer connections
    for (const peerId of peerConnectionsRef.current.keys()) {
      closePeer(peerId);
    }

    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setIsVoiceOn(false);
    setIsMuted(false);

    socket.emit('voice_leave', { roomId });
  }, [socket, roomId, closePeer]);

  // ─── Toggle mute ───
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      // Close all peers
      for (const peerId of peerConnectionsRef.current.keys()) {
        closePeer(peerId);
      }
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [closePeer]);

  return {
    isVoiceOn,
    isMuted,
    voiceUsers,
    voiceError,
    joinVoice,
    leaveVoice,
    toggleMute
  };
}

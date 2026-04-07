import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import threeService from '../../services/threeService';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AvatarCreator.css';

export default function AvatarCreator() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const canvasRef = useRef(null);
  
  // Avatar state
  const [avatar, setAvatar] = useState({
    skin: 0,
    hair: 0,
    hairColor: 0,
    outfit: 0,
    outfitColor: 0,
    name: user?.name || ''
  });

  const [saving, setSaving] = useState(false);

  // Three.js refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarGroupRef = useRef(null);
  const animationRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene
    const W = canvasRef.current.clientWidth;
    const H = canvasRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12122e); // Deep blue-purple, brighter than before
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 6;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // === BRIGHT LIGHTING SETUP ===
    // Strong ambient — lifts all shadows
    const ambient = new THREE.AmbientLight(0xd0d8ff, 3.0);
    scene.add(ambient);

    // Key light — main warm-white from upper right
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 4.0);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Cool fill from left
    const fillLight = new THREE.DirectionalLight(0x88aaff, 2.5);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    // Front face fill — so avatar face is never in shadow
    const frontFill = new THREE.DirectionalLight(0xffffff, 2.0);
    frontFill.position.set(0, 2, 6);
    scene.add(frontFill);

    // Warm rim from below (bounce light effect)
    const rimLight = new THREE.PointLight(0xff9966, 2.0, 8);
    rimLight.position.set(0, -1, 2);
    scene.add(rimLight);

    // Floor / Pedestal — brighter, slightly reflective
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a2a50, roughness: 0.2, metalness: 0.4 })
    );
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    scene.add(floor);

    // Pedestal glow ring
    const ringGeo = new THREE.TorusGeometry(1.5, 0.03, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Initial build
    updateAvatarMesh();

    // Animation loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    updateAvatarMesh();
  }, [avatar]);

  const updateAvatarMesh = () => {
    if (!sceneRef.current) return;

    if (avatarGroupRef.current) {
      sceneRef.current.remove(avatarGroupRef.current);
    }

    const group = threeService.buildAvatarMesh(avatar);
    avatarGroupRef.current = group;
    sceneRef.current.add(group);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/user/profile', { 
        name: avatar.name,
        avatar: JSON.stringify(avatar) 
      });
      updateUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save avatar:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="avatar-creator-page page">
      <div className="navbar glass-card">
        <div className="nav-logo">Skill<span>Forge</span></div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Cancel</button>
      </div>

      <div className="avatar-layout">
        <div id="avatar-canvas-wrap">
          <canvas ref={canvasRef} id="avatar-canvas"></canvas>
        </div>

        <div className="avatar-panel scroll-hint">
          <div className="avatar-section">
            <h3>Display Name</h3>
            <input 
              type="text" 
              className="input-field" 
              value={avatar.name} 
              onChange={(e) => setAvatar({...avatar, name: e.target.value})}
              placeholder="Enter your name"
            />
          </div>

          <div className="avatar-section">
            <h3>Skin Tone</h3>
            <div className="color-grid">
              {threeService.skinColors.map((color, i) => (
                <div 
                  key={i} 
                  className={`color-swatch ${avatar.skin === i ? 'active' : ''}`}
                  style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                  onClick={() => setAvatar({...avatar, skin: i})}
                />
              ))}
            </div>
          </div>

          <div className="avatar-section">
            <h3>Hair Style</h3>
            <div className="style-grid">
              {['Short', 'Long', 'Bald', 'Curly'].map((style, i) => (
                <div 
                  key={i} 
                  className={`style-btn ${avatar.hair === i ? 'active' : ''}`}
                  onClick={() => setAvatar({...avatar, hair: i})}
                >
                  <span>{style}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="avatar-section">
            <h3>Hair Color</h3>
            <div className="color-grid">
              {threeService.hairColors.map((color, i) => (
                <div 
                  key={i} 
                  className={`color-swatch ${avatar.hairColor === i ? 'active' : ''}`}
                  style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                  onClick={() => setAvatar({...avatar, hairColor: i})}
                />
              ))}
            </div>
          </div>

          <div className="avatar-section">
            <h3>Outfit</h3>
            <div className="style-grid">
              {['Formal', 'Casual', 'Lab', 'Sport'].map((outfit, i) => (
                <div 
                  key={i} 
                  className={`style-btn ${avatar.outfit === i ? 'active' : ''}`}
                  onClick={() => setAvatar({...avatar, outfit: i})}
                >
                  <span>{outfit}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            className="btn btn-primary w-full" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : '✦ Save Avatar & Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

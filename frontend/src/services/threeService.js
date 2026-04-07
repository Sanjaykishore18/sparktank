import * as THREE from 'three';

const CHAIR_Y  = 0.57;   // chair group Y → legs touch floor, seat top ≈ 0.62
const SEATED_Y = 0.62;   // avatar hip world Y → sits on seat

class ThreeService {
  constructor() {
    this.skinColors   = [0xF5CBA7, 0xE8A882, 0xC68642, 0x8D5524, 0x4A2912, 0xFFF5E0];
    this.hairColors   = [0x1a1a1a, 0x4a2c0a, 0x8B4513, 0xDAA520, 0xFF6347, 0xe0e0e0];
    this.outfitColors = [0x1E3A5F, 0x4a0080, 0x0a5e0a, 0x5e1a00, 0x1a1a1a, 0xc0c0c0];
    this.CHAIR_Y  = CHAIR_Y;
    this.SEATED_Y = SEATED_Y;
  }

  // ─────────────────────────────────────────────────────────────
  //  SHARED HELPERS
  // ─────────────────────────────────────────────────────────────
  _makeMats(skinColor, hairColor, outfitColor) {
    const sk = this.skinColors[skinColor || 0];
    const hc = this.hairColors[hairColor  || 0];
    const oc = this.outfitColors[outfitColor || 0];
    return {
      skin:   new THREE.MeshStandardMaterial({ color: sk, roughness: 0.7 }),
      hair:   new THREE.MeshStandardMaterial({ color: hc, roughness: 0.8 }),
      outfit: new THREE.MeshStandardMaterial({ color: oc, roughness: 0.6, metalness: 0.1 }),
      eyes:   new THREE.MeshBasicMaterial({ color: 0xffffff }),
      pupil:  new THREE.MeshBasicMaterial({ color: 0x111111 }),
      lips:   new THREE.MeshStandardMaterial({ color: 0xc0705a, roughness: 0.5 }),
    };
  }

  _addHead(group, m, cfg, yBase /* bottom of body */) {
    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.18, 8), m.skin);
    neck.position.y = yBase + 1.06; group.add(neck);
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m.skin);
    head.scale.set(1, 1.1, 0.95); head.position.y = yBase + 1.44; head.castShadow = true; group.add(head);
    // Eyes + pupils
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), m.eyes);
      eye.position.set(side * 0.11, yBase + 1.49, 0.28); group.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), m.pupil);
      pupil.position.set(side * 0.11, yBase + 1.49, 0.31); group.add(pupil);
    }
    // Mouth
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 10, Math.PI), m.lips);
    mouth.rotation.z = Math.PI; mouth.position.set(0, yBase + 1.32, 0.28); group.add(mouth);
    // Hair
    if (cfg.hair !== 2) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hair);
      cap.position.y = yBase + 1.66; group.add(cap);
    }
    if (cfg.hair === 1) {
      for (const side of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.5, 6), m.hair);
        l.position.set(side * 0.3, yBase + 1.26, 0); group.add(l);
      }
    } else if (cfg.hair === 3) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const curl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), m.hair);
        curl.position.set(Math.cos(a) * 0.28, yBase + 1.74, Math.sin(a) * 0.22); group.add(curl);
      }
    }
  }

  _addSeatedLegs(group, outfitIndex) {
    const mat = new THREE.MeshPhongMaterial({ color: outfitIndex === 0 ? 0x1a1a2e : 0x444466 });
    for (const side of [-1, 1]) {
      // Thigh — horizontal, extends toward center (-Z local)
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.50, 8), mat);
      thigh.rotation.x = Math.PI / 2; thigh.position.set(side * 0.14, -0.05, -0.25);
      thigh.castShadow = true; group.add(thigh);
      // Lower leg — hangs down from knee
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.44, 8), mat);
      lower.position.set(side * 0.14, -0.30, -0.50); group.add(lower);
      // Shoe
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), new THREE.MeshPhongMaterial({ color: 0x222222 }));
      shoe.scale.set(1.3, 0.7, 1.1); shoe.position.set(side * 0.14, -0.54, -0.52); group.add(shoe);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  STANDING AVATAR  (Avatar Creator)
  // ─────────────────────────────────────────────────────────────
  buildAvatarMesh(config) {
    const group = new THREE.Group();
    const m = this._makeMats(config.skin, config.hairColor, config.outfitColor);
    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.0, 12), m.outfit);
    body.position.y = 0.95; body.castShadow = true; group.add(body);
    this._addHead(group, m, config, 0.5); // pass 0.5 so yBase offsets match standing height
    // Standing legs
    const legMat = new THREE.MeshPhongMaterial({ color: config.outfit === 0 ? 0x1a1a2e : 0x444466 });
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.09, 0.70, 8), legMat);
      leg.position.set(side * 0.14, 0.35, 0); group.add(leg);
      const shoeGeo = new THREE.SphereGeometry(0.11, 8, 6);
      shoeGeo.scale(1.4, 0.7, 1);
      const shoe = new THREE.Mesh(shoeGeo, new THREE.MeshPhongMaterial({ color: 0x222222 }));
      shoe.position.set(side * 0.14, 0.08, 0.06); group.add(shoe);
    }
    // Arms
    const armMat = m.outfit;
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.72, 8), armMat);
      arm.position.set(side * 0.42, 1.05, 0); arm.rotation.z = side * 0.25; group.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m.skin);
      hand.position.set(side * 0.51, 0.70, 0); group.add(hand);
    }
    if (config.outfit === 0) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.40, 0.04), new THREE.MeshPhongMaterial({ color: 0x8B0000 }));
      tie.position.set(0, 1.20, 0.28); group.add(tie);
    }
    return group;
  }

  // ─────────────────────────────────────────────────────────────
  //  CONFERENCE CHAIR
  //  Back is at local +Z  (faces outward when lookAt+rotateY(PI) is applied)
  //  Seat top ≈ local Y +0.05 → world Y = CHAIR_Y + 0.05 ≈ 0.62
  // ─────────────────────────────────────────────────────────────
  buildChair() {
    const group = new THREE.Group();
    const wood   = new THREE.MeshStandardMaterial({ color: 0x3d2008, roughness: 0.4, metalness: 0.1 });
    const metal  = new THREE.MeshStandardMaterial({ color: 0x99aabb, roughness: 0.2, metalness: 0.9 });
    const cushion = new THREE.MeshStandardMaterial({ color: 0x1c1050, roughness: 0.9 });

    // Seat cushion (top at +0.05)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.10, 0.56), cushion);
    seat.castShadow = true; group.add(seat);
    const seatFrame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.60), wood);
    seatFrame.position.y = -0.02; group.add(seatFrame);

    // Backrest (+Z = outward)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.72, 0.08), cushion);
    back.position.set(0, 0.41, 0.27); back.castShadow = true; group.add(back);
    const backWood = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.76, 0.04), wood);
    backWood.position.set(0, 0.41, 0.31); group.add(backWood);
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.68, 8), wood);
    topRail.rotation.z = Math.PI / 2; topRail.position.set(0, 0.79, 0.29); group.add(topRail);

    // 4 metal legs
    for (const [x, z] of [[-0.28,-0.22],[0.28,-0.22],[-0.28,0.22],[0.28,0.22]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 6), metal);
      leg.position.set(x, -0.31, z); leg.castShadow = true; group.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6), metal);
      foot.position.set(x, -0.572, z); group.add(foot);
    }
    // Armrests
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 6), metal);
      post.position.set(side * 0.34, 0.08, 0.02); group.add(post);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.40), wood);
      pad.position.set(side * 0.34, 0.21, 0.03); group.add(pad);
    }
    return group;
  }

  // ─────────────────────────────────────────────────────────────
  //  SEATED HUMAN AVATAR
  //  Hip level at local Y = 0  →  place group at world Y = SEATED_Y
  //  Thighs extend in local -Z (toward center)
  // ─────────────────────────────────────────────────────────────
  buildSeatedAvatarMesh(config) {
    const group = new THREE.Group();
    const m = this._makeMats(config.skin, config.hairColor, config.outfitColor);
    // Torso bottom at Y=0
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.0, 12), m.outfit);
    body.position.y = 0.5; body.castShadow = true; group.add(body);
    // Head offset in seated coords (yBase = 0 means body bottom at 0)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.18, 8), m.skin);
    neck.position.y = 1.06; group.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m.skin);
    head.scale.set(1, 1.1, 0.95); head.position.y = 1.44; head.castShadow = true; group.add(head);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), m.eyes);
      eye.position.set(side * 0.11, 1.49, 0.28); group.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), m.pupil);
      pupil.position.set(side * 0.11, 1.49, 0.31); group.add(pupil);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 10, Math.PI), m.lips);
    mouth.rotation.z = Math.PI; mouth.position.set(0, 1.32, 0.28); group.add(mouth);
    if (config.hair !== 2) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hair);
      cap.position.y = 1.66; group.add(cap);
    }
    if (config.hair === 1) {
      for (const side of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.5, 6), m.hair);
        l.position.set(side * 0.3, 1.26, 0); group.add(l);
      }
    } else if (config.hair === 3) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const curl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), m.hair);
        curl.position.set(Math.cos(a) * 0.28, 1.74, Math.sin(a) * 0.22); group.add(curl);
      }
    }
    // Arms angled toward table (+Z direction)
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.48, 8), m.outfit);
      upper.position.set(side * 0.42, 0.60, 0); upper.rotation.z = side * 0.28; group.add(upper);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.44, 8), m.outfit);
      fore.rotation.x = Math.PI / 5; fore.rotation.z = side * 0.12;  // +X tilt = forward
      fore.position.set(side * 0.50, 0.36, 0.10); group.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m.skin);
      hand.position.set(side * 0.53, 0.24, 0.28); group.add(hand);
    }
    this._addSeatedLegs(group, config.outfit);
    if (config.outfit === 0) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.04), new THREE.MeshPhongMaterial({ color: 0x8B0000 }));
      tie.position.set(0, 0.70, 0.28); group.add(tie);
    }
    return group;
  }

  // ─────────────────────────────────────────────────────────────
  //  MANAGER AVATAR  (replaces the robot AI)
  //  Professional human: charcoal suit, white shirt, tie, glasses, badge
  // ─────────────────────────────────────────────────────────────
  buildManagerAvatar() {
    const group = new THREE.Group();
    const skinMat  = new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.7 });
    const suitMat  = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.5, metalness: 0.1 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.9 });
    const hairMat  = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.9 });
    const eyesMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x222233 });
    const lipsMat  = new THREE.MeshStandardMaterial({ color: 0xb07060, roughness: 0.5 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x333344 });
    const tieMat   = new THREE.MeshPhongMaterial({ color: 0x5c1a1a });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.3 });
    const pantsMat = new THREE.MeshPhongMaterial({ color: 0x2d3748 });

    // Torso — shirt collar visible at top
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.0, 12), suitMat);
    body.position.y = 0.50; body.castShadow = true; group.add(body);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.28, 8), shirtMat);
    collar.position.y = 0.93; group.add(collar);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.18, 8), skinMat);
    neck.position.y = 1.06; group.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMat);
    head.scale.set(1, 1.08, 0.95); head.position.y = 1.44; head.castShadow = true; group.add(head);

    // Hair — short professional
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
    hairCap.position.y = 1.65; group.add(hairCap);
    // Side hair
    for (const side of [-1, 1]) {
      const sideH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.24), hairMat);
      sideH.position.set(side * 0.30, 1.46, 0.02); group.add(sideH);
    }

    // Eyes + pupils
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyesMat);
      eye.position.set(side * 0.11, 1.49, 0.28); group.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), pupilMat);
      pupil.position.set(side * 0.11, 1.49, 0.31); group.add(pupil);
      // Glasses frame
      const glassFrame = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.011, 8, 20), glassMat);
      glassFrame.position.set(side * 0.11, 1.49, 0.29); group.add(glassFrame);
    }
    // Glasses bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.012), glassMat);
    bridge.position.set(0, 1.49, 0.30); group.add(bridge);

    // Mouth (slight confident smile)
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 6, 10, Math.PI * 0.7), lipsMat);
    mouth.rotation.z = Math.PI; mouth.position.set(0, 1.31, 0.29); group.add(mouth);

    // Tie
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.38, 0.04), tieMat);
    tie.position.set(0, 0.72, 0.27); group.add(tie);
    const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), tieMat);
    tieKnot.position.set(0, 0.93, 0.27); group.add(tieKnot);

    // Manager badge (gold pin, left lapel)
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.025), badgeMat);
    badge.position.set(-0.18, 0.89, 0.26); group.add(badge);

    // Arms in authoritative resting pose (hands clasped forward on table)
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.50, 8), suitMat);
      upper.position.set(side * 0.42, 0.60, 0); upper.rotation.z = side * 0.26; group.add(upper);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.44, 8), suitMat);
      fore.rotation.x = -Math.PI / 4.5; fore.rotation.z = side * 0.10;
      fore.position.set(side * 0.48, 0.34, -0.12); group.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.092, 8, 6), skinMat);
      hand.position.set(side * 0.50, 0.18, -0.30); group.add(hand);
    }
    // Interlaced-fingers look (small connector between hands)
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.10), skinMat);
    clasp.position.set(0, 0.16, -0.30); group.add(clasp);

    // Seated legs
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.50, 8), pantsMat);
      thigh.rotation.x = Math.PI / 2; thigh.position.set(side * 0.14, -0.05, -0.25);
      thigh.castShadow = true; group.add(thigh);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.44, 8), pantsMat);
      lower.position.set(side * 0.14, -0.30, -0.50); group.add(lower);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), new THREE.MeshPhongMaterial({ color: 0x1a1008 }));
      shoe.scale.set(1.3, 0.7, 1.15); shoe.position.set(side * 0.14, -0.54, -0.52); group.add(shoe);
    }
    return group;
  }

  // ─────────────────────────────────────────────────────────────
  //  COMPATIBILITY — old name still works
  // ─────────────────────────────────────────────────────────────
  buildAIAvatar()       { return this.buildManagerAvatar(); }
  buildSeatedAIAvatar() { return this.buildManagerAvatar(); }

  // ─────────────────────────────────────────────────────────────
  //  ROOM BUILDER
  // ─────────────────────────────────────────────────────────────
  initRoomScene(canvas, userAvatarConfig) {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d28);
    scene.fog = new THREE.FogExp2(0x0d0d28, 0.016);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
    camera.position.set(0, 3.5, 8.0);
    camera.lookAt(0, 1.0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMappingExposure = 1.5;

    // ── LIGHTING ──
    scene.add(new THREE.AmbientLight(0x8090cc, 1.8));

    // 3 ceiling pendant lights with cones
    for (const [x, z, warm] of [[0,0,0xfff5e0],[-4,2,0xffe0c0],[4,-2,0xe0e8ff]]) {
      const pl = new THREE.PointLight(warm, 5.0, 14);
      pl.position.set(x, 5.5, z); pl.castShadow = true; scene.add(pl);
      // Pendant cord + lamp housing
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6),
        new THREE.MeshPhongMaterial({ color: 0x333333 }));
      cord.position.set(x, 5.8, z); scene.add(cord);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.12, 0.22, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x444455, side: THREE.DoubleSide, metalness: 0.7 }));
      lamp.rotation.x = Math.PI; lamp.position.set(x, 5.25, z); scene.add(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshBasicMaterial({ color: warm }));
      bulb.position.set(x, 5.28, z); scene.add(bulb);
    }

    // Key + fill directional
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(3, 6, 5); key.castShadow = true; scene.add(key);
    const fill = new THREE.DirectionalLight(0x7799ff, 1.5);
    fill.position.set(-4, 4, -4); scene.add(fill);

    // ── FLOOR ──
    const floorTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1a1a3a'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#22224a'; ctx.lineWidth = 2;
      for (let i = 0; i <= 256; i += 32) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,256); ctx.stroke(); }
      for (let i = 0; i <= 256; i += 32) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(256,i); ctx.stroke(); }
      return new THREE.CanvasTexture(c);
    })();
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // ── WALLS ──
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e0e2a, roughness: 0.9 });
    const walls = [
      { s: [30, 10, 0.3], p: [0, 5, -12] },          // back wall
      { s: [30, 10, 0.3], p: [0, 5,  12], ry: Math.PI }, // front wall
      { s: [0.3, 10, 30], p: [-12, 5, 0] },           // left
      { s: [0.3, 10, 30], p: [ 12, 5, 0] },           // right
    ];
    for (const { s, p, ry } of walls) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(...s), wallMat);
      w.position.set(...p); if (ry) w.rotation.y = ry;
      w.receiveShadow = true; scene.add(w);
    }
    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0a0a20 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 10; scene.add(ceil);

    // Wall trim strips (horizontal accent lines)
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x3a3a6a });
    for (const z of [-11.5, 11.5]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(28, 0.06, 0.05), trimMat);
      trim.position.set(0, 2.2, z); scene.add(trim);
    }

    // ── PRESENTATION SCREEN (back wall) ──
    const screenW = 7.0, screenH = 4.2;
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(screenW + 0.3, screenH + 0.3, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.6, roughness: 0.3 }));
    screenFrame.position.set(-3.5, 4.8, -11.8); scene.add(screenFrame);

    const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH),
      new THREE.MeshBasicMaterial({ color: 0x1a2a6a }));
    screenGlow.position.set(-3.5, 4.8, -11.73); scene.add(screenGlow);

    // Screen content — gradient logo text emulation
    const screenContent = (() => {
      const c = document.createElement('canvas'); c.width = 700; c.height = 420;
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 700, 420);
      grad.addColorStop(0, '#0a0a30'); grad.addColorStop(1, '#1a1060');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 700, 420);
      // Title
      ctx.font = 'bold 52px sans-serif'; ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.fillText('VoiceCraft', 350, 130);
      ctx.font = '28px sans-serif'; ctx.fillStyle = '#9f7aea';
      ctx.fillText('AI Debate Arena', 350, 185);
      // Divider
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(100, 210); ctx.lineTo(600, 210); ctx.stroke();
      // Subtitle
      ctx.font = '22px sans-serif'; ctx.fillStyle = '#aabbff';
      ctx.fillText('Live Session in Progress', 350, 260);
      // Dots
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(310 + i * 40, 320, 8, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#7c5cff' : '#33334a';
        ctx.fill();
      }
      return new THREE.CanvasTexture(c);
    })();
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW - 0.1, screenH - 0.1),
      new THREE.MeshBasicMaterial({ map: screenContent }));
    screen.position.set(-3.5, 4.8, -11.72); scene.add(screen);

    // Screen light bleed
    const screenLight = new THREE.RectAreaLight !== undefined
      ? new THREE.PointLight(0x3355ff, 1.5, 8)
      : null;
    if (screenLight) { screenLight.position.set(-3.5, 4.8, -10); scene.add(screenLight); }

    // Podium / speaker stand (right side, back)
    const podium = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a3a, roughness: 0.5, metalness: 0.3 }));
    podium.position.set(5, 0.6, -9); scene.add(podium);
    const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a5a, metalness: 0.5 }));
    podiumTop.position.set(5, 1.23, -9); scene.add(podiumTop);

    // ── TABLE ──
    const tableR = 3.2;
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(tableR, tableR, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x3d1f08, roughness: 0.25, metalness: 0.25 }));
    tableTop.position.y = 0.86; tableTop.receiveShadow = true; tableTop.castShadow = true;
    scene.add(tableTop);
    // Table edge trim
    const tableTrim = new THREE.Mesh(new THREE.TorusGeometry(tableR, 0.05, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0x6a3a18, metalness: 0.5, roughness: 0.3 }));
    tableTrim.rotation.x = Math.PI / 2; tableTrim.position.y = 0.86; scene.add(tableTrim);
    // Central pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.28, 0.86, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a1208, roughness: 0.3, metalness: 0.5 }));
    ped.position.y = 0.43; ped.castShadow = true; scene.add(ped);

    // Holographic orb on table
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x7c5cff }));
    orb.position.set(0, 1.08, 0); scene.add(orb);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28 + i * 0.16, 0.012, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.5 - i * 0.12 })
      );
      ring.position.set(0, 1.08, 0); ring.rotation.x = Math.PI / 2; scene.add(ring);
    }

    // ── CHAIRS + AVATARS ──
    // Only the actual user avatar is placed — no manager, no empty chairs.
    // lookAt(center) makes local +Z face toward center, so thighs (+Z) point at the table. ✓
    const avatars = [];
    const radius = 3.9;

    const userAvatar = this.buildSeatedAvatarMesh(userAvatarConfig);
    // Place user at the far side (z = -radius), facing the screen / table center
    const px = 0, pz = -radius;
    userAvatar.position.set(px, SEATED_Y, pz);
    userAvatar.lookAt(0, SEATED_Y, 0); // Faces toward center naturally
    scene.add(userAvatar);
    avatars.push(userAvatar);

    const userChair = this.buildChair();
    userChair.position.set(px, CHAIR_Y, pz);
    userChair.lookAt(0, CHAIR_Y, 0);
    userChair.rotateY(Math.PI); // Backrest is at +Z, flip so it faces outward
    scene.add(userChair);

    return { scene, camera, renderer, avatars };
  }
}

export default new ThreeService();

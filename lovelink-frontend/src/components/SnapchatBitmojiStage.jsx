import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { 
  Heart, Coffee, Shirt, Music, Check, X, RotateCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// ----------------------------------------------------------------------
// WARDROBE CATALOGS FOR SNAPCHAT 3D BITMOJIS
// ----------------------------------------------------------------------
export const WARDROBE_COLLECTIONS = {
  streetwear: {
    id: 'streetwear',
    name: 'Streetwear & Denim',
    emoji: '🧢',
    description: 'Varsity Bomber, Oversized Hoodie & Clean Dunks',
    tag: 'Signature',
    boyTop: 0x2248a8,
    boyBottom: 0x4f709c,
    girlTop: 0xe67b97,
    girlBottom: 0x2e3d50,
    accent: '#38BDF8',
  },
  varsity_college: {
    id: 'varsity_college',
    name: 'College Varsity',
    emoji: '🧥',
    description: 'Royal Navy Varsity & Amber Cropped Bomber',
    tag: 'Campus',
    boyTop: 0x1d2d48,
    boyBottom: 0xb5a083,
    girlTop: 0xd97706,
    girlBottom: 0x1e2029,
    accent: '#2563EB',
  },
  date_night: {
    id: 'date_night',
    name: 'Date Night Velvet',
    emoji: '✨',
    description: 'Midnight Velvet Tuxedo & Rose-Gold Velvet Dress',
    tag: 'Luxury',
    boyTop: 0x181a24,
    boyBottom: 0x111215,
    girlTop: 0x5a1828,
    girlBottom: 0x1e2029,
    accent: '#F43F5E',
  },
  cozy_pajamas: {
    id: 'cozy_pajamas',
    name: 'Midnight Silk Sleepwear',
    emoji: '🛌',
    description: 'Lavender Silk Top & Navy Silk Loungewear',
    tag: 'Cozy',
    boyTop: 0x9d8ec2,
    boyBottom: 0x23262b,
    girlTop: 0xd1c4e9,
    girlBottom: 0xe6e1d5,
    accent: '#C084FC',
  },
  obsidian_cyber: {
    id: 'obsidian_cyber',
    name: 'Cyber Noir Stealth',
    emoji: '🖤',
    description: 'Matte Black Cyber Jackets & Ambient Ultraviolet Glow',
    tag: 'Stealth',
    boyTop: 0x161622,
    boyBottom: 0x141224,
    girlTop: 0x4a1f80,
    girlBottom: 0x141224,
    accent: '#A855F7',
  },
};

export default function SnapchatBitmojiStage({
  action = 'toast',
  actionNonce = 0,
  myName = 'You',
  partnerName = 'Partner',
  partnerHandle = '',
  onEmoteTrigger,
  onOpenCreator,
  className = '',
  isPlayingMusic = false,
}) {
  // DOM & Three.js Refs
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Model & Bone Refs
  const girlModelRef = useRef(null);
  const boyModelRef = useRef(null);
  const girlBonesRef = useRef({ head: null, spine: null, leftArm: null, leftForeArm: null, leftHand: null, rightArm: null, rightForeArm: null, rightHand: null, hips: null });
  const boyBonesRef = useRef({ head: null, spine: null, leftArm: null, leftForeArm: null, leftHand: null, rightArm: null, rightForeArm: null, rightHand: null, hips: null });
  
  // Props & Visual Meshes
  const girlCupRef = useRef(null);
  const boyCupRef = useRef(null);
  const couchGroupRef = useRef(null);
  const heartsGroupRef = useRef(null);
  const musicNotesGroupRef = useRef(null);
  const podiumMeshRef = useRef(null);

  // Fallback Stylized Avatars (renders instantly while GLBs load)
  const girlStylizedGroupRef = useRef(null);
  const boyStylizedGroupRef = useRef(null);
  const isGlbLoadedRef = useRef(false);

  // Interactive UI State
  const [activeEmote, setActiveEmote] = useState(action || 'toast');
  const [activeWardrobe, setActiveWardrobe] = useState('streetwear');
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);

  // Animation Timing Ref
  const animStateRef = useRef({
    currentEmote: action || 'toast',
    emoteStartTime: performance.now(),
    emoteProgress: 0,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
  });

  const isPlayingMusicRef = useRef(isPlayingMusic);
  useEffect(() => {
    isPlayingMusicRef.current = isPlayingMusic;
  }, [isPlayingMusic]);

  // Clean Display Handles
  const cleanPartner = (partnerName || 'Partner').trim();
  const cleanMe = (myName || 'You').trim();
  const displayPartnerHandle = partnerHandle 
    ? `@${partnerHandle.replace(/^@/, '')}` 
    : `@${cleanPartner.toLowerCase().replace(/\s+/g, '_')}`;
  const displayMyHandle = `@${cleanMe.toLowerCase().replace(/\s+/g, '_')}`;

  // Synthesized Web Audio Sound Effects (Spatial & Crisp)
  const playSfx = useCallback((type = 'clink') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1480, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'chime') {
        [587.33, 739.99, 880.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
          gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.04);
          osc.stop(ctx.currentTime + idx * 0.04 + 0.35);
        });
      } else if (type === 'dance') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.06);
          osc.stop(ctx.currentTime + idx * 0.06 + 0.25);
        });
      }
    } catch { }
  }, []);

  // Trigger Action Emote
  const triggerEmote = useCallback((emoteType, notifyParent = true) => {
    const normalized = (emoteType === 'clink' ? 'toast' : emoteType);
    setActiveEmote(normalized);
    animStateRef.current.currentEmote = normalized;
    animStateRef.current.emoteStartTime = performance.now();
    animStateRef.current.emoteProgress = 0;

    if (notifyParent && onEmoteTrigger) {
      onEmoteTrigger(normalized);
    }

    if (normalized === 'toast') {
      playSfx('clink');
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FFFFFF'],
      });
      toast.success('Cheers! Coffee toasted with mugs! ☕🥂');
    } else if (normalized === 'kiss') {
      playSfx('chime');
      confetti({
        particleCount: 55,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF'],
      });
      toast.success(`Sweet romantic kiss with ${cleanPartner}! 💋💕`);
    } else if (normalized === 'hug') {
      playSfx('chime');
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FBBF24', '#FFFFFF'],
      });
      toast.success(`Warm couple hug with ${cleanPartner}! 🤗💖`);
    } else if (normalized === 'couch') {
      playSfx('chime');
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A855F7', '#EC4899', '#F43F5E', '#FBBF24'],
      });
      toast.success(`Cozying up & cuddling on the couch! 🛋️✨`);
    } else if (normalized === 'dance') {
      playSfx('dance');
      confetti({
        particleCount: 55,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B'],
      });
      toast.success('Dancing in sync! 💃🕺🎶');
    } else if (normalized === 'wave') {
      playSfx('chime');
      toast.success(`Waving hello to ${cleanPartner}! 👋✨`);
    }
  }, [cleanPartner, playSfx, onEmoteTrigger]);

  // Synchronize incoming action from parent
  useEffect(() => {
    if (action) {
      const normalized = (action === 'clink' ? 'toast' : action);
      setActiveEmote(normalized);
      animStateRef.current.currentEmote = normalized;
      animStateRef.current.emoteStartTime = performance.now();
      animStateRef.current.emoteProgress = 0;
    }
  }, [action, actionNonce]);

  // Reset OrbitControls camera to standard front angle
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.reset();
      cameraRef.current.position.set(0, 1.15, 3.2);
      controlsRef.current.target.set(0, 0.95, 0);
      controlsRef.current.update();
      toast.success('Camera view reset 📷');
    }
  }, []);

  // Update Wardrobe Materials across active 3D meshes
  const applyWardrobe = useCallback((wardrobeId) => {
    const item = WARDROBE_COLLECTIONS[wardrobeId] || WARDROBE_COLLECTIONS.streetwear;
    
    // 1. Update Girl GLB Materials
    if (girlModelRef.current) {
      girlModelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const n = child.name.toLowerCase();
          // Hide corporate banker items
          if (n.includes('suit') || n.includes('tie') || n.includes('button') || n.includes('eyeglass')) {
            child.visible = false;
          } else if (n.includes('shirt')) {
            const mat = Array.isArray(child.material) ? child.material[0] : child.material;
            mat.color.setHex(item.girlTop);
            mat.needsUpdate = true;
          } else if (n.includes('pants')) {
            const mat = Array.isArray(child.material) ? child.material[0] : child.material;
            mat.color.setHex(item.girlBottom);
            mat.needsUpdate = true;
          }
        }
      });
    }

    // 2. Update Male GLB Materials
    if (boyModelRef.current) {
      boyModelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const n = child.name.toLowerCase();
          if (n.includes('top')) {
            const mat = Array.isArray(child.material) ? child.material[0] : child.material;
            mat.color.setHex(item.boyTop);
            mat.needsUpdate = true;
          } else if (n.includes('bottom')) {
            const mat = Array.isArray(child.material) ? child.material[0] : child.material;
            mat.color.setHex(item.boyBottom);
            mat.needsUpdate = true;
          }
        }
      });
    }

    // 3. Update Stylized Fallback Models
    if (girlStylizedGroupRef.current?.userData?.bodyMesh) {
      girlStylizedGroupRef.current.userData.bodyMesh.material.color.setHex(item.girlTop);
    }
    if (boyStylizedGroupRef.current?.userData?.bodyMesh) {
      boyStylizedGroupRef.current.userData.bodyMesh.material.color.setHex(item.boyTop);
    }
  }, []);

  useEffect(() => {
    applyWardrobe(activeWardrobe);
  }, [activeWardrobe, applyWardrobe]);

  // ----------------------------------------------------------------------
  // THREE.JS 3D WEBGL ENGINE INITIALIZATION
  // ----------------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || 380;
    const height = mount.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.15, 3.2);
    cameraRef.current = camera;

    // 2. Antialiased WebGL Renderer with High Dynamic Range Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 3. Smooth Orbit Controls for 360° Drag & Zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.target.set(0, 0.95, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 4.2;
    controls.minPolarAngle = Math.PI / 2.3;
    controls.maxPolarAngle = Math.PI / 1.85;
    controlsRef.current = controls;

    // 4. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xfffbf5, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
    keyLight.position.set(2.5, 4.0, 2.8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    fillLight.position.set(-2.5, 3.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.8);
    rimLight.position.set(0, 3.0, -2.8);
    scene.add(rimLight);

    // 5. 3D Illuminated Obsidian Circular Podium
    const podiumGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.1, 48);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f18,
      roughness: 0.35,
      metalness: 0.6,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(0, 0, 0);
    podium.receiveShadow = true;
    scene.add(podium);
    podiumMeshRef.current = podium;

    // Neon Rim Trim Ring around Podium
    const ringGeo = new THREE.TorusGeometry(1.52, 0.015, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
    });
    const rimRing = new THREE.Mesh(ringGeo, ringMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.set(0, 0.052, 0);
    scene.add(rimRing);

    // Soft Ground Contact Shadow
    const shadowGeo = new THREE.RingGeometry(0.3, 1.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = Math.PI / 2;
    shadow.position.set(0, 0.055, 0);
    scene.add(shadow);

    // 6. 3D Props: Ceramic Coffee Cups
    const createCup = () => {
      const g = new THREE.Group();
      const cupMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.03, 0.09, 20),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
      );
      g.add(cupMesh);
      const stripeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.041, 0.041, 0.02, 20),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
      );
      stripeMesh.position.y = 0.01;
      g.add(stripeMesh);
      g.visible = false;
      return g;
    };
    const gCup = createCup();
    const bCup = createCup();
    scene.add(gCup);
    scene.add(bCup);
    girlCupRef.current = gCup;
    boyCupRef.current = bCup;

    // 7. 3D Prop: Velvet Couple Couch (renders during couch emote)
    const couchGroup = new THREE.Group();
    couchGroup.position.set(0, 0.28, -0.15);
    const couchSeat = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.3, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x4a154b, roughness: 0.5 })
    );
    couchGroup.add(couchSeat);
    const couchBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x3b113c, roughness: 0.55 })
    );
    couchBack.position.set(0, 0.35, -0.25);
    couchGroup.add(couchBack);
    couchGroup.visible = false;
    scene.add(couchGroup);
    couchGroupRef.current = couchGroup;

    // 8. 3D Prop: Floating Love Hearts
    const heartsGroup = new THREE.Group();
    const heartShape = new THREE.Shape();
    const x0 = 0, y0 = 0;
    heartShape.moveTo(x0 + 0.25, y0 + 0.25);
    heartShape.bezierCurveTo(x0 + 0.25, y0 + 0.25, x0 + 0.2, y0, x0, y0);
    heartShape.bezierCurveTo(x0 - 0.3, y0, x0 - 0.3, y0 + 0.35, x0 - 0.3, y0 + 0.35);
    heartShape.bezierCurveTo(x0 - 0.3, y0 + 0.55, x0 - 0.1, y0 + 0.77, x0 + 0.25, y0 + 0.95);
    heartShape.bezierCurveTo(x0 + 0.6, y0 + 0.77, x0 + 0.8, y0 + 0.55, x0 + 0.8, y0 + 0.35);
    heartShape.bezierCurveTo(x0 + 0.8, y0 + 0.35, x0 + 0.8, y0, x0 + 0.5, y0);
    heartShape.bezierCurveTo(x0 + 0.35, y0, x0 + 0.25, y0 + 0.25, x0 + 0.25, y0 + 0.25);
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.05, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 });
    const heartMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x881337, roughness: 0.25 });
    for (let i = 0; i < 5; i++) {
      const hMesh = new THREE.Mesh(heartGeo, heartMat);
      hMesh.scale.set(0.12, -0.12, 0.12);
      hMesh.position.set((Math.random() - 0.5) * 0.5, 1.2 + i * 0.15, (Math.random() - 0.5) * 0.3);
      heartsGroup.add(hMesh);
    }
    heartsGroup.visible = false;
    scene.add(heartsGroup);
    heartsGroupRef.current = heartsGroup;

    // 9. 3D Prop: Floating Music Notes
    const musicGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const noteMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.04, 0.015, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x581c87, roughness: 0.3 })
      );
      noteMesh.position.set((Math.random() - 0.5) * 0.8, 1.4 + i * 0.18, (Math.random() - 0.5) * 0.4);
      musicGroup.add(noteMesh);
    }
    musicGroup.visible = false;
    scene.add(musicGroup);
    musicNotesGroupRef.current = musicGroup;

    // 10. Instant Stylized 3D Avatars (Standing immediately while GLB loads)
    const createStylizedHuman = (isGirl = false) => {
      const g = new THREE.Group();
      g.position.set(isGirl ? -0.22 : 0.22, 0.06, 0);

      // Shoes
      const shoeMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0xf8fafc : 0xffffff, roughness: 0.3 });
      const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.16), shoeMat);
      shoeL.position.set(-0.08, 0.04, 0.02);
      const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.16), shoeMat);
      shoeR.position.set(0.08, 0.04, 0.02);
      g.add(shoeL);
      g.add(shoeR);

      // Pants / Legs
      const pantsMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0x2e3d50 : 0x4f709c, roughness: 0.6 });
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.56, 16), pantsMat);
      legL.position.set(-0.08, 0.34, 0);
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.56, 16), pantsMat);
      legR.position.set(0.08, 0.34, 0);
      g.add(legL);
      g.add(legR);

      // Torso / Streetwear Jacket
      const bodyMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0xe67b97 : 0x2248a8, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.52, 20), bodyMat);
      body.position.set(0, 0.82, 0);
      g.add(body);
      g.userData.bodyMesh = body;

      // Arms
      const armMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0xe67b97 : 0x2248a8, roughness: 0.4 });
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 12), armMat);
      armL.position.set(-0.21, 0.8, 0);
      armL.rotation.z = 0.15;
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 12), armMat);
      armR.position.set(0.21, 0.8, 0);
      armR.rotation.z = -0.15;
      g.add(armL);
      g.add(armR);

      // Head
      const headG = new THREE.Group();
      headG.position.set(0, 1.25, 0);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.55 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 24, 24), skinMat);
      headG.add(head);

      // Hair
      const hairMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0x3d2314 : 0x1f1f1f, roughness: 0.7 });
      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), hairMat);
      hairTop.position.set(0, 0.04, -0.02);
      headG.add(hairTop);

      if (isGirl) {
        // Long flowing wavy hair strands
        const hairL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 12), hairMat);
        hairL.position.set(-0.13, -0.16, 0.02);
        const hairR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 12), hairMat);
        hairR.position.set(0.13, -0.16, 0.02);
        headG.add(hairL);
        headG.add(hairR);
      } else {
        // Cap & sunglasses
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 20), hairMat);
        cap.position.set(0, 0.06, 0.1);
        cap.rotation.x = 0.15;
        headG.add(cap);

        const shades = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.05, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.8 })
        );
        shades.position.set(0, 0.02, 0.16);
        headG.add(shades);
      }

      g.add(headG);
      g.userData.headGroup = headG;
      g.userData.armL = armL;
      g.userData.armR = armR;
      return g;
    };

    const girlStylized = createStylizedHuman(true);
    const boyStylized = createStylizedHuman(false);
    scene.add(girlStylized);
    scene.add(boyStylized);
    girlStylizedGroupRef.current = girlStylized;
    boyStylizedGroupRef.current = boyStylized;

    // 11. Helper to Map Mixamo/RPM Bones
    const mapJoints = (model, bonesRef) => {
      model.traverse((child) => {
        if (child.isBone) {
          const n = child.name.toLowerCase();
          if (n === 'head') bonesRef.current.head = child;
          if (n === 'spine' || n === 'spine1' || n === 'spine2') {
            if (!bonesRef.current.spine) bonesRef.current.spine = child;
          }
          if (n === 'leftarm') bonesRef.current.leftArm = child;
          if (n === 'leftforearm') bonesRef.current.leftForeArm = child;
          if (n === 'lefthand') bonesRef.current.leftHand = child;
          if (n === 'rightarm') bonesRef.current.rightArm = child;
          if (n === 'rightforearm') bonesRef.current.rightForeArm = child;
          if (n === 'righthand') bonesRef.current.rightHand = child;
          if (n === 'hips') bonesRef.current.hips = child;
        }
      });
    };

    // 12. Load Real 3D Humanoid Models (.GLB)
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const checkReady = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        isGlbLoadedRef.current = true;
        girlStylized.visible = false;
        boyStylized.visible = false;
        applyWardrobe(activeWardrobe);
        setIs3DReady(true);
      }
    };

    // Load Female 3D Avatar (Neha)
    loader.load(
      '/models/female_avatar.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.02, 1.02, 1.02);
        model.position.set(-0.22, 0.08, 0);
        model.rotation.y = 0.16;

        model.traverse((child) => {
          if (child.isMesh) {
            const n = child.name.toLowerCase();
            // CRITICAL: Hide corporate business meshes!
            if (n.includes('suit') || n.includes('tie') || n.includes('button') || n.includes('eyeglass')) {
              child.visible = false;
            } else {
              child.visible = true;
            }

            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material = child.material.map(m => m.clone());
              } else {
                child.material = child.material.clone();
              }
              const mat = Array.isArray(child.material) ? child.material[0] : child.material;
              if (n.includes('body')) {
                mat.color.setHex(0xfff0ea); // Radiant youthful warm peach
                mat.roughness = 0.50;
              }
            }
          }
        });

        mapJoints(model, girlBonesRef);
        // Relax arms naturally at sides
        if (girlBonesRef.current.leftArm) girlBonesRef.current.leftArm.rotation.set(0.958, -1.592, 2.408);
        if (girlBonesRef.current.rightArm) girlBonesRef.current.rightArm.rotation.set(-2.192, -1.592, -0.742);
        if (girlBonesRef.current.leftForeArm) girlBonesRef.current.leftForeArm.rotation.set(0, -0.45, 0);
        if (girlBonesRef.current.rightForeArm) girlBonesRef.current.rightForeArm.rotation.set(0, 0.45, 0);

        scene.add(model);
        girlModelRef.current = model;
        checkReady();
      },
      undefined,
      (err) => {
        console.warn('Female GLB not loaded, using stylized 3D avatar:', err);
        checkReady();
      }
    );

    // Load Male 3D Avatar (Bhavesh)
    loader.load(
      '/models/male_avatar.glb',
      (gltf) => {
        const model = gltf.scene;
        // Scaled to 0.84 to match female height (1.56m vs 1.51m)
        model.scale.set(0.84, 0.84, 0.84);
        model.position.set(0.22, 0.08, 0);
        model.rotation.y = -0.16;

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map(m => m.clone());
            } else {
              child.material = child.material.clone();
            }
            const n = child.name.toLowerCase();
            const mat = Array.isArray(child.material) ? child.material[0] : child.material;
            if (n.includes('head') || n.includes('body')) {
              mat.color.setHex(0xffe2d0);
              mat.roughness = 0.55;
            }
          }
        });

        mapJoints(model, boyBonesRef);
        // Relax arms naturally at sides
        if (boyBonesRef.current.leftArm) boyBonesRef.current.leftArm.rotation.set(1.350, -0.600, -0.100);
        if (boyBonesRef.current.rightArm) boyBonesRef.current.rightArm.rotation.set(1.350, 0.600, 0.100);

        scene.add(model);
        boyModelRef.current = model;
        checkReady();
      },
      undefined,
      (err) => {
        console.warn('Male GLB not loaded, using stylized 3D avatar:', err);
        checkReady();
      }
    );

    // 13. High-Performance WebGL Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const emote = animStateRef.current.currentEmote;
      const progress = Math.min((performance.now() - animStateRef.current.emoteStartTime) / 2800, 1.0);
      animStateRef.current.emoteProgress = progress;

      controls.update();

      const gModel = girlModelRef.current;
      const bModel = boyModelRef.current;
      const gBones = girlBonesRef.current;
      const bBones = boyBonesRef.current;
      const gSty = girlStylizedGroupRef.current;
      const bSty = boyStylizedGroupRef.current;

      const isPlaying = isPlayingMusicRef.current;
      const beatCycle = Math.sin(elapsedTime * 8);
      const musicBob = isPlaying ? Math.abs(beatCycle) * 0.025 : 0;
      const idleBreathing = Math.sin(elapsedTime * 2.2) * 0.005;

      // Props Visibility & Floating
      if (couchGroupRef.current) {
        couchGroupRef.current.visible = (emote === 'couch');
      }
      if (heartsGroupRef.current) {
        heartsGroupRef.current.visible = (emote === 'kiss');
        if (heartsGroupRef.current.visible) {
          heartsGroupRef.current.children.forEach((h, idx) => {
            h.position.y = 1.2 + ((elapsedTime * 0.4 + idx * 0.2) % 0.8);
            h.rotation.y = elapsedTime * 1.5 + idx;
          });
        }
      }
      if (musicNotesGroupRef.current) {
        musicNotesGroupRef.current.visible = isPlaying || (emote === 'dance');
        if (musicNotesGroupRef.current.visible) {
          musicNotesGroupRef.current.children.forEach((n, idx) => {
            n.position.y = 1.3 + ((elapsedTime * 0.3 + idx * 0.25) % 0.7);
            n.rotation.z = Math.sin(elapsedTime * 3 + idx) * 0.4;
          });
        }
      }

      // Smooth Envelope Curve for Emotes
      const env = Math.sin(progress * Math.PI) * (1 - 0.1 * Math.sin(progress * Math.PI * 2));

      // ── INTERACTIVE 3D EMOTES ─────────────────────────────────────
      if (emote === 'toast') {
        // Show Coffee Cups
        if (girlCupRef.current) {
          girlCupRef.current.visible = true;
          girlCupRef.current.position.set(-0.06, 0.96 + Math.sin(elapsedTime * 3) * 0.005, 0.22);
          girlCupRef.current.rotation.z = 0.15 * env;
        }
        if (boyCupRef.current) {
          boyCupRef.current.visible = true;
          boyCupRef.current.position.set(0.06, 0.96 + Math.sin(elapsedTime * 3) * 0.005, 0.22);
          boyCupRef.current.rotation.z = -0.15 * env;
        }

        // Both step forward to toast
        if (gModel) {
          gModel.position.x = THREE.MathUtils.lerp(-0.22, -0.13, env);
          gModel.rotation.y = THREE.MathUtils.lerp(0.16, 0.32, env);
          if (gBones.head) gBones.head.rotation.set(0.08 * env, 0.38 * env, 0);
          if (gBones.leftArm) gBones.leftArm.rotation.set(1.10 * env, -1.45 * env, 1.55 * env);
          if (gBones.leftForeArm) gBones.leftForeArm.rotation.set(-1.40 * env, -0.30 * env, 0.70 * env);
        }
        if (bModel) {
          bModel.position.x = THREE.MathUtils.lerp(0.22, 0.13, env);
          bModel.rotation.y = THREE.MathUtils.lerp(-0.16, -0.32, env);
          if (bBones.head) bBones.head.rotation.set(0.08 * env, -0.38 * env, 0);
          if (bBones.rightArm) bBones.rightArm.rotation.set(1.30 * env, 0.20 * env, -0.30 * env);
          if (bBones.rightForeArm) bBones.rightForeArm.rotation.set(-0.10 * env, 0.20 * env, -0.80 * env);
        }
        if (gSty) {
          gSty.position.x = THREE.MathUtils.lerp(-0.22, -0.13, env);
          gSty.rotation.y = THREE.MathUtils.lerp(0, 0.3, env);
        }
        if (bSty) {
          bSty.position.x = THREE.MathUtils.lerp(0.22, 0.13, env);
          bSty.rotation.y = THREE.MathUtils.lerp(0, -0.3, env);
        }

      } else if (emote === 'kiss') {
        if (girlCupRef.current) girlCupRef.current.visible = false;
        if (boyCupRef.current) boyCupRef.current.visible = false;

        // Intimate step-in to kiss (x -> +-0.055)
        if (gModel) {
          gModel.position.x = THREE.MathUtils.lerp(-0.22, -0.055, env);
          gModel.rotation.y = THREE.MathUtils.lerp(0.16, 0.54, env);
          if (gBones.head) gBones.head.rotation.set(0.14 * env, 0.52 * env, 0.10 * env);
          if (gBones.leftArm) gBones.leftArm.rotation.set(0.40 * env, -0.55 * env, 0.35 * env);
          if (gBones.leftForeArm) gBones.leftForeArm.rotation.set(-1.15 * env, -0.20 * env, 0.55 * env);
        }
        if (bModel) {
          bModel.position.x = THREE.MathUtils.lerp(0.22, 0.055, env);
          bModel.rotation.y = THREE.MathUtils.lerp(-0.16, -0.54, env);
          if (bBones.head) bBones.head.rotation.set(-0.06 * env, -0.52 * env, -0.08 * env);
          if (bBones.rightArm) bBones.rightArm.rotation.set(0.40 * env, 0.55 * env, -0.35 * env);
          if (bBones.rightForeArm) bBones.rightForeArm.rotation.set(-1.05 * env, 0.20 * env, -0.50 * env);
        }
        if (gSty) {
          gSty.position.x = THREE.MathUtils.lerp(-0.22, -0.06, env);
          gSty.rotation.y = THREE.MathUtils.lerp(0, 0.5, env);
        }
        if (bSty) {
          bSty.position.x = THREE.MathUtils.lerp(0.22, 0.06, env);
          bSty.rotation.y = THREE.MathUtils.lerp(0, -0.5, env);
        }

      } else if (emote === 'hug') {
        if (girlCupRef.current) girlCupRef.current.visible = false;
        if (boyCupRef.current) boyCupRef.current.visible = false;

        const squeeze = Math.sin(elapsedTime * 4) * 0.005;

        // Warm embrace (x -> +-0.05)
        if (gModel) {
          gModel.position.x = THREE.MathUtils.lerp(-0.22, -0.05 + squeeze, env);
          gModel.rotation.y = THREE.MathUtils.lerp(0.16, 0.38, env);
          if (gBones.head) gBones.head.rotation.set(0.12 * env, 0.44 * env, 0.22 * env);
          if (gBones.leftArm) gBones.leftArm.rotation.set(0.40 * env, -0.60 * env, 0.25 * env);
          if (gBones.leftForeArm) gBones.leftForeArm.rotation.set(-1.30 * env, -0.20 * env, 0.70 * env);
        }
        if (bModel) {
          bModel.position.x = THREE.MathUtils.lerp(0.22, 0.05 - squeeze, env);
          bModel.rotation.y = THREE.MathUtils.lerp(-0.16, -0.38, env);
          if (bBones.head) bBones.head.rotation.set(0.12 * env, -0.44 * env, -0.22 * env);
          if (bBones.rightArm) bBones.rightArm.rotation.set(0.40 * env, 0.60 * env, -0.25 * env);
          if (bBones.rightForeArm) bBones.rightForeArm.rotation.set(-1.30 * env, 0.20 * env, -0.70 * env);
        }
        if (gSty) {
          gSty.position.x = THREE.MathUtils.lerp(-0.22, -0.05, env);
          gSty.rotation.y = THREE.MathUtils.lerp(0, 0.4, env);
        }
        if (bSty) {
          bSty.position.x = THREE.MathUtils.lerp(0.22, 0.05, env);
          bSty.rotation.y = THREE.MathUtils.lerp(0, -0.4, env);
        }

      } else if (emote === 'couch') {
        if (girlCupRef.current) girlCupRef.current.visible = false;
        if (boyCupRef.current) boyCupRef.current.visible = false;

        // Side-by-side snuggle on couch (y -> 0.03, x -> +-0.11)
        if (gModel) {
          gModel.position.x = THREE.MathUtils.lerp(-0.22, -0.11, env);
          gModel.position.y = THREE.MathUtils.lerp(0.08, 0.03, env);
          gModel.rotation.y = THREE.MathUtils.lerp(0.16, 0.26, env);
          if (gBones.head) gBones.head.rotation.set(0.10 * env, 0.38 * env, 0.14 * env);
        }
        if (bModel) {
          bModel.position.x = THREE.MathUtils.lerp(0.22, 0.11, env);
          bModel.position.y = THREE.MathUtils.lerp(0.08, 0.03, env);
          bModel.rotation.y = THREE.MathUtils.lerp(-0.16, -0.26, env);
          if (bBones.head) bBones.head.rotation.set(-0.04 * env, -0.38 * env, -0.10 * env);
          if (bBones.rightArm) bBones.rightArm.rotation.set(0.35 * env, 0.55 * env, -0.25 * env);
        }
        if (gSty) {
          gSty.position.set(-0.11, 0.02, 0);
          gSty.rotation.y = 0.25;
        }
        if (bSty) {
          bSty.position.set(0.11, 0.02, 0);
          bSty.rotation.y = -0.25;
        }

      } else if (emote === 'dance') {
        if (girlCupRef.current) girlCupRef.current.visible = false;
        if (boyCupRef.current) boyCupRef.current.visible = false;

        const sway = Math.sin(elapsedTime * 6) * 0.08;
        const bounceG = Math.abs(Math.sin(elapsedTime * 8)) * 0.04;
        const bounceB = Math.abs(Math.sin(elapsedTime * 8 + 0.5)) * 0.04;

        if (gModel) {
          gModel.position.x = -0.22;
          gModel.position.y = 0.08 + bounceG;
          gModel.rotation.z = sway;
          if (gBones.leftArm) gBones.leftArm.rotation.z = 1.6 + Math.sin(elapsedTime * 8) * 0.3;
          if (gBones.rightArm) gBones.rightArm.rotation.z = -1.6 - Math.sin(elapsedTime * 8) * 0.3;
          if (gBones.head) gBones.head.rotation.y = Math.sin(elapsedTime * 4) * 0.18;
        }
        if (bModel) {
          bModel.position.x = 0.22;
          bModel.position.y = 0.08 + bounceB;
          bModel.rotation.z = -sway;
          if (bBones.leftArm) bBones.leftArm.rotation.z = -0.4 + Math.sin(elapsedTime * 8) * 0.3;
          if (bBones.rightArm) bBones.rightArm.rotation.z = 0.4 - Math.sin(elapsedTime * 8) * 0.3;
          if (bBones.head) bBones.head.rotation.y = -Math.sin(elapsedTime * 4) * 0.18;
        }
        if (gSty) {
          gSty.position.set(-0.22, 0.06 + bounceG, 0);
          gSty.rotation.z = sway;
        }
        if (bSty) {
          bSty.position.set(0.22, 0.06 + bounceB, 0);
          bSty.rotation.z = -sway;
        }

      } else if (emote === 'wave') {
        if (girlCupRef.current) girlCupRef.current.visible = false;
        if (boyCupRef.current) boyCupRef.current.visible = false;

        const waveCycle = Math.sin(elapsedTime * 14);

        if (gModel) {
          gModel.position.x = -0.22;
          gModel.rotation.y = 0.16;
          if (gBones.rightArm) gBones.rightArm.rotation.set(-0.85 * env, -0.20 * env, -2.10 * env);
          if (gBones.rightForeArm) gBones.rightForeArm.rotation.z = (waveCycle * 0.45) * env;
          if (gBones.head) gBones.head.rotation.set(0, 0.15 * env, 0.08 * env);
        }
        if (bModel) {
          bModel.position.x = 0.22;
          bModel.rotation.y = -0.16;
          if (bBones.leftArm) bBones.leftArm.rotation.set(-0.85 * env, 0.20 * env, 2.10 * env);
          if (bBones.leftForeArm) bBones.leftForeArm.rotation.z = (waveCycle * 0.45) * env;
          if (bBones.head) bBones.head.rotation.set(0, -0.15 * env, -0.08 * env);
        }
        if (gSty?.userData?.armR) {
          gSty.userData.armR.rotation.z = -1.2 + waveCycle * 0.35;
        }
        if (bSty?.userData?.armL) {
          bSty.userData.armL.rotation.z = 1.2 + waveCycle * 0.35;
        }

      } else {
        // IDLE: Living Breathing & Subtle Natural Sway
        if (girlCupRef.current) girlCupRef.current.visible = false;
        if (boyCupRef.current) boyCupRef.current.visible = false;

        if (gModel) {
          gModel.position.x = THREE.MathUtils.lerp(gModel.position.x, -0.22, 0.1);
          gModel.position.y = 0.08 + idleBreathing + musicBob;
          gModel.rotation.y = THREE.MathUtils.lerp(gModel.rotation.y, 0.16, 0.1);
          if (gBones.head) gBones.head.rotation.set(0.04 + musicBob, 0.12, 0);
          if (gBones.leftArm) gBones.leftArm.rotation.set(0.958, -1.592, 2.408);
          if (gBones.rightArm) gBones.rightArm.rotation.set(-2.192, -1.592, -0.742);
        }
        if (bModel) {
          bModel.position.x = THREE.MathUtils.lerp(bModel.position.x, 0.22, 0.1);
          bModel.position.y = 0.08 + Math.sin(elapsedTime * 2.2 + 0.4) * 0.005 + musicBob;
          bModel.rotation.y = THREE.MathUtils.lerp(bModel.rotation.y, -0.16, 0.1);
          if (bBones.head) bBones.head.rotation.set(0.04 + musicBob, -0.12, 0);
          if (bBones.leftArm) bBones.leftArm.rotation.set(1.350, -0.600, -0.100);
          if (bBones.rightArm) bBones.rightArm.rotation.set(1.350, 0.600, 0.100);
        }
        if (gSty) {
          gSty.position.set(-0.22, 0.06 + idleBreathing + musicBob, 0);
          gSty.rotation.y = 0.15;
          if (gSty.userData.armR) gSty.userData.armR.rotation.z = -0.15;
        }
        if (bSty) {
          bSty.position.set(0.22, 0.06 + idleBreathing + musicBob, 0);
          bSty.rotation.y = -0.15;
          if (bSty.userData.armL) bSty.userData.armL.rotation.z = 0.15;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 14. Responsive Viewport Resize Handler
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth || 380;
      const h = mount.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const currentWardrobeObj = WARDROBE_COLLECTIONS[activeWardrobe] || WARDROBE_COLLECTIONS.streetwear;
  const isDancing = activeEmote === 'dance';
  const isKissing = activeEmote === 'kiss';
  const isHugging = activeEmote === 'hug';
  const isCouch = activeEmote === 'couch';
  const isToasting = activeEmote === 'toast';
  const isWaving = activeEmote === 'wave';

  return (
    <div className={`relative flex flex-col items-center w-full max-w-lg mx-auto select-none ${className}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TRUE 3D WEBGL STUDIO VIEWPORT (Obsidian Luxury Dark)       */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[9/12.5] min-h-[430px] sm:min-h-[470px] max-h-[530px] rounded-[32px] overflow-hidden bg-gradient-to-b from-[#0e111a] via-[#090b12] to-[#040508] shadow-[0_25px_80px_rgba(0,0,0,0.85)] border-2 border-white/10 flex flex-col justify-between p-3.5 sm:p-4"
      >
        {/* Holographic light sheen reflection across glass */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }}
        />

        {/* ── TOP BAR: Status & Controls ────────────────────────────── */}
        <div className="relative z-20 flex items-center justify-between w-full">
          {/* Left: 360° Rotate & Camera Reset Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetCamera}
              className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
              title="Reset Front View"
            >
              <RotateCw size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Reset View</span>
            </button>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono hidden md:inline-flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${is3DReady ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping`} />
              <span>{is3DReady ? '360° 3D WebGL' : '3D WebGL Live'}</span>
            </span>
          </div>

          {/* Center: Couple Names Pill */}
          <div className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5 shadow-lg">
            <span className="text-xs font-black tracking-tight">{cleanMe}</span>
            <span className="text-rose-400 text-xs">♥</span>
            <span className="text-xs font-black tracking-tight">{cleanPartner}</span>
            <span className="hidden sm:inline text-[10px] text-gray-400 font-mono ml-1">
              {displayMyHandle} & {displayPartnerHandle}
            </span>
          </div>

          {/* Right Action: Wardrobe Drawer Switcher */}
          <button
            type="button"
            onClick={() => setShowWardrobeModal(!showWardrobeModal)}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 shadow-xl text-xs font-bold text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-1.5"
            title="Switch Streetwear & Outfits"
          >
            <Shirt size={14} className="text-amber-400" />
            <span className="hidden sm:inline">{currentWardrobeObj.name}</span>
            <span className="sm:hidden">Closet</span>
          </button>
        </div>

        {/* ── CENTER: TRUE THREE.JS WEBGL 3D CANVAS ─────────────────── */}
        <div className="relative flex-1 w-full h-full my-auto flex items-center justify-center overflow-hidden">
          {/* Mount Three.js DOM Canvas element */}
          <div 
            ref={mountRef} 
            className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
          />

          {/* 360° Drag Hint Overlay */}
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none opacity-60">
            <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-[10px] text-gray-300 font-medium">
              ✦ Drag to Rotate 360° • Pinch / Scroll to Zoom
            </span>
          </div>
        </div>

        {/* ── MODAL: WARDROBE & STREETWEAR DRAWER ────────────────────── */}
        {showWardrobeModal && (
          <div className="absolute inset-x-3 bottom-3 z-30 p-4 rounded-3xl bg-[#090b12]/95 backdrop-blur-xl border border-white/20 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shirt size={16} className="text-amber-400" />
                <h3 className="text-xs font-black text-white tracking-wide uppercase">Streetwear & Outfits</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWardrobeModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.values(WARDROBE_COLLECTIONS).map((item) => {
                const isSelected = activeWardrobe === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveWardrobe(item.id);
                      setShowWardrobeModal(false);
                      confetti({
                        particleCount: 30,
                        spread: 50,
                        origin: { y: 0.6 },
                        colors: [item.accent, '#FFFFFF'],
                      });
                      toast.success(`Dressed in ${item.name}! ✨`);
                    }}
                    className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white/15 border-white/30 shadow-md ring-1 ring-white/40'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="text-[9px] bg-white/10 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate max-w-[170px]">{item.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REACTION EMOTE DOCK (Responsive, Animated & Synchronized)   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        <button
          type="button"
          onClick={() => triggerEmote('toast')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isToasting
              ? 'bg-amber-400 text-stone-950 scale-105 ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Coffee size={15} className="text-amber-400" />
          <span>Toast Coffee ☕</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('kiss')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isKissing
              ? 'bg-rose-500 text-white scale-105 ring-2 ring-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Heart size={15} className="fill-rose-400 text-rose-400" />
          <span>Kiss 💕</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('hug')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isHugging
              ? 'bg-pink-500 text-white scale-105 ring-2 ring-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🤗</span>
          <span>Warm Hug</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('couch')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isCouch
              ? 'bg-purple-600 text-white scale-105 ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🛋️</span>
          <span>Couch Cuddle</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('dance')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isDancing
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white scale-105 ring-2 ring-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Music size={15} className="text-purple-300" />
          <span>Dance Party 💃</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('wave')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isWaving
              ? 'bg-sky-400 text-stone-950 scale-105 ring-2 ring-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">👋</span>
          <span>Wave Hello</span>
        </button>
      </div>

    </div>
  );
}

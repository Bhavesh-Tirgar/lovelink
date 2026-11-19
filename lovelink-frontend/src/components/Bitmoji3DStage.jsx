import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Sparkles, Heart, Coffee, Music, 
  Shirt, RefreshCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// ----------------------------------------------------------------------
// BITMOJI STYLED WARDROBE CATALOGS
// ----------------------------------------------------------------------
export const BITMOJI_OUTFITS = {
  streetwear: {
    id: 'streetwear',
    name: 'Streetwear & Denim',
    emoji: '🧢',
    boy: {
      jacketColor: 0x18181b, // Noir Varsity Bomber
      sleeveColor: 0x27272a,
      innerColor: 0xf4f4f5, // White Tee
      pantsColor: 0x3b82f6, // Light Street Denim
      shoeColor: 0x18181b,  // Nike Dunk Black
      shoeAccent: 0xffffff,
      hasCap: true,
      hasShades: true,
    },
    girl: {
      jacketColor: 0x8d5b4c, // Caramel Suede Cropped Jacket
      innerColor: 0x18181b,  // Black Crop Top
      pantsColor: 0x18181b,  // High-Rise Black Shorts
      bootColor: 0x111111,   // Chunky Combat Boots
    }
  },
  varsity_college: {
    id: 'varsity_college',
    name: 'College Varsity',
    emoji: '🧥',
    boy: {
      jacketColor: 0x1e3a8a, // Navy Varsity
      sleeveColor: 0xf3f4f6, // Cream Leather
      innerColor: 0xdc2626,  // Red Accent
      pantsColor: 0x1e293b,  // Dark Denim
      shoeColor: 0xffffff,   // White Dunks
      shoeAccent: 0xdc2626,
      hasCap: true,
      hasShades: false,
    },
    girl: {
      jacketColor: 0xd97706, // Amber Varsity
      innerColor: 0xffffff,  // White Top
      pantsColor: 0x2563eb,  // Classic Denim
      bootColor: 0xffffff,   // White Sneakers
    }
  },
  date_night: {
    id: 'date_night',
    name: 'Date Night Velvet',
    emoji: '✨',
    boy: {
      jacketColor: 0x0f131a, // Black Tuxedo
      sleeveColor: 0x181e28,
      innerColor: 0xf43f5e,  // Rose Silk Pocket
      pantsColor: 0x0b0e14,  // Tailored Trousers
      shoeColor: 0x111111,   // Patent Leather
      shoeAccent: 0x222222,
      hasCap: false,
      hasShades: false,
    },
    girl: {
      jacketColor: 0xf43f5e, // Rose Velvet Gown / Blazer
      innerColor: 0xfb7185,
      pantsColor: 0xe11d48,
      bootColor: 0xffe4e6,   // Rose Gold Heels
    }
  },
  cozy_pajamas: {
    id: 'cozy_pajamas',
    name: 'Midnight Silk Pajamas',
    emoji: '🛌',
    boy: {
      jacketColor: 0x1e1b4b, // Deep Navy Silk
      sleeveColor: 0x282467,
      innerColor: 0xe0e7ff,
      pantsColor: 0x1e1b4b,
      shoeColor: 0x312e81,
      shoeAccent: 0xe0e7ff,
      hasCap: false,
      hasShades: false,
    },
    girl: {
      jacketColor: 0x581c87, // Plum Silk Camisole
      innerColor: 0x6b21a8,
      pantsColor: 0x581c87,
      bootColor: 0xfdf4ff,
    }
  }
};

export default function Bitmoji3DStage({
  action = 'couch',
  myName = 'You',
  partnerName = 'Partner',
  onActionTrigger,
  onOpenCreator,
  className = '',
}) {
  const mountRef = useRef(null);
  const [activeOutfit, setActiveOutfit] = useState('streetwear');
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [activeEmote, setActiveEmote] = useState(action);
  const [isLoading, setIsLoading] = useState(true);

  // References to 3D Nodes
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameRef = useRef(null);

  // Character Groups & Bone Joints
  const boyGroupRef = useRef(null);
  const girlGroupRef = useRef(null);
  const boyBonesRef = useRef({});
  const girlBonesRef = useRef({});
  const boyMaterialsRef = useRef({});
  const girlMaterialsRef = useRef({});
  const boyMugRef = useRef(null);
  const girlMugRef = useRef(null);

  // Timing
  const animTimeRef = useRef({
    currentEmote: action,
    startTime: performance.now(),
    duration: 3500,
  });

  // Clean Names
  const cleanPartner = (partnerName || 'Partner').trim();
  const cleanMe = (myName || 'You').trim();

  // Synthesized Sound Effects
  const playSfx = useCallback((type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.22);
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
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + idx * 0.05 + 0.35);
        });
      }
    } catch {}
  }, []);

  // Trigger Emote Animation
  const triggerEmote = useCallback((type = 'clink', notifyParent = true) => {
    animTimeRef.current = {
      currentEmote: type,
      startTime: performance.now(),
      duration: type === 'dance' ? 4500 : type === 'hug' ? 4200 : 3400,
    };
    setActiveEmote(type);

    if (notifyParent && onActionTrigger) {
      onActionTrigger(type);
    }

    if (type === 'clink' || type === 'toast') {
      playSfx('clink');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 }, colors: ['#F59E0B', '#FBBF24', '#FFFFFF'] });
      toast.success('Clink! Coffee toasted with ceramic mugs! ☕');
    } else if (type === 'kiss') {
      playSfx('chime');
      confetti({ particleCount: 45, spread: 75, origin: { y: 0.6 }, colors: ['#EC4899', '#F43F5E', '#FDA4AF'] });
      toast.success(`Sweet romantic kiss with ${cleanPartner}! 💋💕`);
    } else if (type === 'hug') {
      playSfx('chime');
      confetti({ particleCount: 55, spread: 80, origin: { y: 0.6 }, colors: ['#EC4899', '#F43F5E', '#FBBF24'] });
      toast.success(`Warm couple hug with ${cleanPartner}! 🫂💖`);
    } else if (type === 'dance') {
      playSfx('chime');
      confetti({ particleCount: 60, spread: 90, origin: { y: 0.6 }, colors: ['#8B5CF6', '#EC4899', '#3B82F6'] });
      toast.success('Dancing in 3D! 💃🎶');
    }

    setTimeout(() => {
      if (animTimeRef.current.currentEmote === type) {
        animTimeRef.current.currentEmote = null;
        setActiveEmote(null);
      }
    }, animTimeRef.current.duration);
  }, [cleanPartner, onActionTrigger, playSfx]);

  // Sync incoming parent action
  useEffect(() => {
    if (!action) return;
    const map = {
      kiss: 'kiss',
      hug: 'hug',
      toast: 'clink',
      clink: 'clink',
      couch: 'clink',
      dance: 'dance',
      wave: 'wave',
      hand_hold: 'hug',
      spoon: 'hug',
    };
    const target = map[action] || 'clink';
    triggerEmote(target, false);
  }, [action, triggerEmote]);

  // Apply Outfit Colors
  const applyOutfit = useCallback((outfitKey) => {
    setActiveOutfit(outfitKey);
    const theme = BITMOJI_OUTFITS[outfitKey] || BITMOJI_OUTFITS.streetwear;

    // Boy Materials
    if (boyMaterialsRef.current.jacket) boyMaterialsRef.current.jacket.color.setHex(theme.boy.jacketColor);
    if (boyMaterialsRef.current.sleeves) boyMaterialsRef.current.sleeves.color.setHex(theme.boy.sleeveColor);
    if (boyMaterialsRef.current.inner) boyMaterialsRef.current.inner.color.setHex(theme.boy.innerColor);
    if (boyMaterialsRef.current.pants) boyMaterialsRef.current.pants.color.setHex(theme.boy.pantsColor);
    if (boyMaterialsRef.current.shoes) boyMaterialsRef.current.shoes.color.setHex(theme.boy.shoeColor);

    // Girl Materials
    if (girlMaterialsRef.current.jacket) girlMaterialsRef.current.jacket.color.setHex(theme.girl.jacketColor);
    if (girlMaterialsRef.current.inner) girlMaterialsRef.current.inner.color.setHex(theme.girl.innerColor);
    if (girlMaterialsRef.current.pants) girlMaterialsRef.current.pants.color.setHex(theme.girl.pantsColor);
    if (girlMaterialsRef.current.boots) girlMaterialsRef.current.boots.color.setHex(theme.girl.bootColor);

    confetti({ particleCount: 30, spread: 60, origin: { y: 0.65 }, colors: ['#F59E0B', '#EC4899', '#3B82F6'] });
    toast.success(`Dressed in ${theme.name}! ✨`);
  }, []);

  // ----------------------------------------------------------------------
  // THREE.JS SCENE SETUP
  // ----------------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setIsLoading(true);

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0e121b);

    // 2. CAMERA
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.45, 3.4);
    cameraRef.current = camera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 4. CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 5.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(0, 1.15, 0);
    controlsRef.current = controls;

    // 5. LIGHTING (Studio 3-Point Light + Warm Key + Cool Fill + Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.6);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // 6. STAGE PODIUM & CONTACT SHADOW
    const podiumGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.1, 48);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.4,
      metalness: 0.2,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.05;
    podium.receiveShadow = true;
    scene.add(podium);

    const ringGeo = new THREE.RingGeometry(1.58, 1.65, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);

    // ------------------------------------------------------------------
    // 7. BUILD STYLIZED CARTOON BITMOJI CHARACTERS (Pixar / Bitmoji style)
    // ------------------------------------------------------------------
    const toonSkinMat = new THREE.MeshStandardMaterial({
      color: 0xffdfc4,
      roughness: 0.55,
      metalness: 0.05,
    });

    const createEye = () => {
      const eyeGroup = new THREE.Group();
      // Sclera
      const scleraGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.scale.set(1, 1, 0.5);
      eyeGroup.add(sclera);

      // Iris (Large cartoon iris)
      const irisGeo = new THREE.CircleGeometry(0.026, 24);
      const irisMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.2 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.024;
      eyeGroup.add(iris);

      // Pupil
      const pupilGeo = new THREE.CircleGeometry(0.013, 20);
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.025;
      eyeGroup.add(pupil);

      // Double Specular Catchlight (The iconic Pixar / Bitmoji glossy highlight!)
      const glint1 = new THREE.Mesh(new THREE.CircleGeometry(0.007, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glint1.position.set(0.007, 0.008, 0.026);
      eyeGroup.add(glint1);

      const glint2 = new THREE.Mesh(new THREE.CircleGeometry(0.004, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glint2.position.set(-0.006, -0.006, 0.026);
      eyeGroup.add(glint2);

      return eyeGroup;
    };

    // Coffee Mug Factory (White ceramic with sky-blue stripe, like Snapchat couple)
    const createCoffeeMug = () => {
      const mugGroup = new THREE.Group();
      const cupGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.085, 24);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
      const cup = new THREE.Mesh(cupGeo, cupMat);
      mugGroup.add(cup);

      // Blue Stripe
      const stripeGeo = new THREE.CylinderGeometry(0.056, 0.054, 0.02, 24);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 0.01;
      mugGroup.add(stripe);

      // Coffee liquid
      const liquidGeo = new THREE.CircleGeometry(0.05, 20);
      const liquidMat = new THREE.MeshBasicMaterial({ color: 0x3d2010 });
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.rotation.x = -Math.PI / 2;
      liquid.position.y = 0.041;
      mugGroup.add(liquid);

      return mugGroup;
    };

    // ------------------------------------------------------------------
    // A. BOY BITMOJI HIERARCHY
    // ------------------------------------------------------------------
    const boyGroup = new THREE.Group();
    boyGroup.position.set(0.38, 0, 0);
    scene.add(boyGroup);
    boyGroupRef.current = boyGroup;

    // Boy Materials
    const boyJacketMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 });
    const boySleeveMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.45 });
    const boyInnerMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.5 });
    const boyPantsMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
    const boyShoesMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
    boyMaterialsRef.current = {
      jacket: boyJacketMat,
      sleeves: boySleeveMat,
      inner: boyInnerMat,
      pants: boyPantsMat,
      shoes: boyShoesMat,
    };

    // Boy Torso & Bones
    const boySpine = new THREE.Group();
    boySpine.position.y = 0.85;
    boyGroup.add(boySpine);

    const boyTorsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.58, 24), boyJacketMat);
    boySpine.add(boyTorsoMesh);

    // Inner tee strip
    const boyInnerMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.52), boyInnerMat);
    boyInnerMesh.position.set(0, 0, 0.241);
    boySpine.add(boyInnerMesh);

    // Boy Head
    const boyHead = new THREE.Group();
    boyHead.position.set(0, 0.52, 0);
    boySpine.add(boyHead);

    const boyHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 28), toonSkinMat);
    boyHead.add(boyHeadMesh);

    // Boy Eyes
    const bEyeL = createEye();
    bEyeL.position.set(-0.065, 0.02, 0.17);
    boyHead.add(bEyeL);

    const bEyeR = createEye();
    bEyeR.position.set(0.065, 0.02, 0.17);
    boyHead.add(bEyeR);

    // Boy Smile
    const smileCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.055, -0.075, 0.18),
      new THREE.Vector3(-0.02, -0.11, 0.19),
      new THREE.Vector3(0.02, -0.11, 0.19),
      new THREE.Vector3(0.055, -0.075, 0.18)
    );
    const smileGeo = new THREE.TubeGeometry(smileCurve, 16, 0.006, 8, false);
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
    boyHead.add(new THREE.Mesh(smileGeo, smileMat));

    // Boy Cap (Black baseball cap)
    const capGeo = new THREE.SphereGeometry(0.205, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.035;
    boyHead.add(cap);

    const visorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.015, 24, 1, false, -Math.PI / 3, (Math.PI * 2) / 3);
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, 0.035, 0.12);
    visor.rotation.x = 0.2;
    boyHead.add(visor);

    // Boy Sunglasses (Wayfarer style)
    const shadesGroup = new THREE.Group();
    shadesGroup.position.set(0, 0.02, 0.19);
    const glassLensMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.8 });
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.015), glassLensMat);
    lensL.position.x = -0.05;
    shadesGroup.add(lensL);
    const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.015), glassLensMat);
    lensR.position.x = 0.05;
    shadesGroup.add(lensR);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 0.015), glassLensMat);
    shadesGroup.add(bridge);
    boyHead.add(shadesGroup);

    // Boy Arms & Coffee Mug
    const boyArmL = new THREE.Group();
    boyArmL.position.set(-0.25, 0.22, 0);
    boySpine.add(boyArmL);

    const boyArmMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.38, 16), boySleeveMat);
    boyArmMeshL.position.y = -0.19;
    boyArmL.add(boyArmMeshL);

    const boyForeArmL = new THREE.Group();
    boyForeArmL.position.set(0, -0.38, 0);
    boyArmL.add(boyForeArmL);

    const boyForeArmMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.35, 16), boySleeveMat);
    boyForeArmMeshL.position.y = -0.17;
    boyForeArmL.add(boyForeArmMeshL);

    // Boy Mug attached to Left Hand
    const boyMug = createCoffeeMug();
    boyMug.position.set(0, -0.35, 0.08);
    boyForeArmL.add(boyMug);
    boyMugRef.current = boyMug;

    // Boy Right Arm (Outer Arm)
    const boyArmR = new THREE.Group();
    boyArmR.position.set(0.25, 0.22, 0);
    boySpine.add(boyArmR);

    const boyArmMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.38, 16), boySleeveMat);
    boyArmMeshR.position.y = -0.19;
    boyArmR.add(boyArmMeshR);

    const boyForeArmR = new THREE.Group();
    boyForeArmR.position.set(0, -0.38, 0);
    boyArmR.add(boyForeArmR);

    const boyForeArmMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.35, 16), boySleeveMat);
    boyForeArmMeshR.position.y = -0.17;
    boyForeArmR.add(boyForeArmMeshR);

    // Boy Legs & Shoes
    const boyLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.72, 16), boyPantsMat);
    boyLegL.position.set(-0.11, 0.42, 0);
    boyGroup.add(boyLegL);

    const boyLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.72, 16), boyPantsMat);
    boyLegR.position.set(0.11, 0.42, 0);
    boyGroup.add(boyLegR);

    const boyShoeL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.24), boyShoesMat);
    boyShoeL.position.set(-0.11, 0.05, 0.04);
    boyGroup.add(boyShoeL);

    const boyShoeR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.24), boyShoesMat);
    boyShoeR.position.set(0.11, 0.05, 0.04);
    boyGroup.add(boyShoeR);

    boyBonesRef.current = {
      spine: boySpine,
      head: boyHead,
      armL: boyArmL,
      foreArmL: boyForeArmL,
      armR: boyArmR,
      foreArmR: boyForeArmR,
    };

    // ------------------------------------------------------------------
    // B. GIRL BITMOJI HIERARCHY
    // ------------------------------------------------------------------
    const girlGroup = new THREE.Group();
    girlGroup.position.set(-0.38, 0, 0);
    scene.add(girlGroup);
    girlGroupRef.current = girlGroup;

    // Girl Materials
    const girlJacketMat = new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.5 });
    const girlInnerMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
    const girlPantsMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
    const girlBootsMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 });
    girlMaterialsRef.current = {
      jacket: girlJacketMat,
      inner: girlInnerMat,
      pants: girlPantsMat,
      boots: girlBootsMat,
    };

    const girlSpine = new THREE.Group();
    girlSpine.position.y = 0.82;
    girlGroup.add(girlSpine);

    const girlTorsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.19, 0.52, 24), girlJacketMat);
    girlSpine.add(girlTorsoMesh);

    // Inner crop top
    const girlInnerMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.38), girlInnerMat);
    girlInnerMesh.position.set(0, 0, 0.201);
    girlSpine.add(girlInnerMesh);

    // Girl Head
    const girlHead = new THREE.Group();
    girlHead.position.set(0, 0.48, 0);
    girlSpine.add(girlHead);

    const girlHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 28), toonSkinMat);
    girlHead.add(girlHeadMesh);

    // Girl Volumetric Wavy Hair (Iconic Brunette Waves)
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.75 });
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.205, 24, 24), hairMat);
    hairTop.position.set(0, 0.04, -0.02);
    girlHead.add(hairTop);

    // Flowing hair strands down shoulders
    const strandL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.65, 16), hairMat);
    strandL.position.set(-0.16, -0.22, 0.05);
    strandL.rotation.z = 0.15;
    girlHead.add(strandL);

    const strandR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.65, 16), hairMat);
    strandR.position.set(0.16, -0.22, 0.05);
    strandR.rotation.z = -0.15;
    girlHead.add(strandR);

    // Girl Eyes
    const gEyeL = createEye();
    gEyeL.position.set(-0.06, 0.02, 0.16);
    girlHead.add(gEyeL);

    const gEyeR = createEye();
    gEyeR.position.set(0.06, 0.02, 0.16);
    girlHead.add(gEyeR);

    // Girl Open-mouth joyful smile / expression
    const gSmile = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), new THREE.MeshBasicMaterial({ color: 0x27272a }));
    gSmile.position.set(0, -0.075, 0.175);
    girlHead.add(gSmile);

    // Girl Arms & Coffee Mug
    const girlArmR = new THREE.Group();
    girlArmR.position.set(0.22, 0.19, 0);
    girlSpine.add(girlArmR);

    const girlArmMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.35, 16), girlJacketMat);
    girlArmMeshR.position.y = -0.17;
    girlArmR.add(girlArmMeshR);

    const girlForeArmR = new THREE.Group();
    girlForeArmR.position.set(0, -0.35, 0);
    girlArmR.add(girlForeArmR);

    const girlForeArmMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 16), girlJacketMat);
    girlForeArmMeshR.position.y = -0.16;
    girlForeArmR.add(girlForeArmMeshR);

    // Girl Mug attached to Right Hand
    const girlMug = createCoffeeMug();
    girlMug.position.set(0, -0.32, 0.08);
    girlForeArmR.add(girlMug);
    girlMugRef.current = girlMug;

    // Girl Left Arm (Outer Arm)
    const girlArmL = new THREE.Group();
    girlArmL.position.set(-0.22, 0.19, 0);
    girlSpine.add(girlArmL);

    const girlArmMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.35, 16), girlJacketMat);
    girlArmMeshL.position.y = -0.17;
    girlArmL.add(girlArmMeshL);

    const girlForeArmL = new THREE.Group();
    girlForeArmL.position.set(0, -0.35, 0);
    girlArmL.add(girlForeArmL);

    const girlForeArmMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 16), girlJacketMat);
    girlForeArmMeshL.position.y = -0.16;
    girlForeArmL.add(girlForeArmMeshL);

    // Girl Legs & Boots
    const girlLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.68, 16), girlPantsMat);
    girlLegL.position.set(-0.09, 0.40, 0);
    girlGroup.add(girlLegL);

    const girlLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.68, 16), girlPantsMat);
    girlLegR.position.set(0.09, 0.40, 0);
    girlGroup.add(girlLegR);

    const girlBootL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.21), girlBootsMat);
    girlBootL.position.set(-0.09, 0.07, 0.03);
    girlGroup.add(girlBootL);

    const girlBootR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.21), girlBootsMat);
    girlBootR.position.set(0.09, 0.07, 0.03);
    girlGroup.add(girlBootR);

    girlBonesRef.current = {
      spine: girlSpine,
      head: girlHead,
      armR: girlArmR,
      foreArmR: girlForeArmR,
      armL: girlArmL,
      foreArmL: girlForeArmL,
    };

    setIsLoading(false);

    // ------------------------------------------------------------------
    // 8. ANIMATION LOOP & SKELETAL SCRIPT
    // ------------------------------------------------------------------
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      controls.update();

      const { currentEmote, startTime, duration } = animTimeRef.current;
      const progress = Math.min((performance.now() - startTime) / duration, 1.0);

      const boyBones = boyBonesRef.current;
      const girlBones = girlBonesRef.current;

      // Base idle breathing
      const breath = Math.sin(elapsedTime * 2.5) * 0.015;
      if (boyGroupRef.current) boyGroupRef.current.position.y = breath;
      if (girlGroupRef.current) girlGroupRef.current.position.y = breath * 0.9;

      if (currentEmote === 'kiss' && progress < 1.0) {
        // Hide coffee cups
        if (boyMugRef.current) boyMugRef.current.visible = false;
        if (girlMugRef.current) girlMugRef.current.visible = false;

        const env = Math.sin(progress * Math.PI);
        // Step in to touching proximity (+-0.10)
        boyGroup.position.x = THREE.MathUtils.lerp(0.38, 0.10, env);
        girlGroup.position.x = THREE.MathUtils.lerp(-0.38, -0.10, env);

        // Loving head tilts toward each other
        if (boyBones.head) boyBones.head.rotation.set(-0.05 * env, -0.45 * env, -0.1 * env);
        if (girlBones.head) girlBones.head.rotation.set(0.12 * env, 0.45 * env, 0.1 * env);

        // Wrapping arms around back and waist
        if (boyBones.armL) boyBones.armL.rotation.set(0.5 * env, 0.6 * env, -0.4 * env);
        if (boyBones.foreArmL) boyBones.foreArmL.rotation.set(-1.1 * env, 0.2 * env, -0.5 * env);

        if (girlBones.armR) girlBones.armR.rotation.set(0.5 * env, -0.6 * env, 0.4 * env);
        if (girlBones.foreArmR) girlBones.foreArmR.rotation.set(-1.1 * env, -0.2 * env, 0.5 * env);

      } else if (currentEmote === 'hug' && progress < 1.0) {
        if (boyMugRef.current) boyMugRef.current.visible = false;
        if (girlMugRef.current) girlMugRef.current.visible = false;

        const env = Math.sin(progress * Math.PI);
        const squeeze = Math.sin((progress - 0.5) * 8) * 0.008;

        boyGroup.position.x = THREE.MathUtils.lerp(0.38, 0.08 - squeeze, env);
        girlGroup.position.x = THREE.MathUtils.lerp(-0.38, -0.08 + squeeze, env);

        // Heads rest lovingly on shoulders
        if (boyBones.head) boyBones.head.rotation.set(0.1 * env, -0.38 * env, -0.2 * env);
        if (girlBones.head) girlBones.head.rotation.set(0.1 * env, 0.38 * env, 0.2 * env);

        // Full embrace wrapping arms
        if (boyBones.armL) boyBones.armL.rotation.set(0.4 * env, 0.6 * env, -0.3 * env);
        if (boyBones.foreArmL) boyBones.foreArmL.rotation.set(-1.2 * env, 0.2 * env, -0.6 * env);

        if (girlBones.armR) girlBones.armR.rotation.set(0.4 * env, -0.6 * env, 0.3 * env);
        if (girlBones.foreArmR) girlBones.foreArmR.rotation.set(-1.2 * env, -0.2 * env, 0.6 * env);

      } else if (currentEmote === 'dance' && progress < 1.0) {
        if (boyMugRef.current) boyMugRef.current.visible = false;
        if (girlMugRef.current) girlMugRef.current.visible = false;

        const beat = Math.sin(elapsedTime * 7);
        const sway = Math.sin(elapsedTime * 3.5) * 0.09;

        boyGroup.position.x = 0.38 + sway;
        girlGroup.position.x = -0.38 + sway;
        boyGroup.position.y = Math.abs(beat) * 0.035;
        girlGroup.position.y = Math.abs(beat) * 0.035;

        if (boyBones.spine) boyBones.spine.rotation.z = sway * 0.8;
        if (girlBones.spine) girlBones.spine.rotation.z = -sway * 0.8;

      } else {
        // Default: Toast / Idle Standing with Coffee Mugs
        if (boyMugRef.current) boyMugRef.current.visible = true;
        if (girlMugRef.current) girlMugRef.current.visible = true;

        boyGroup.position.x = 0.38;
        girlGroup.position.x = -0.38;

        const clinkEnv = (currentEmote === 'clink' || currentEmote === 'toast') && progress < 1.0
          ? Math.sin(progress * Math.PI) * 0.2
          : 0;

        // Boy holding mug comfortably
        if (boyBones.head) boyBones.head.rotation.set(0, -0.15, 0);
        if (boyBones.armL) boyBones.armL.rotation.set(0.65 + clinkEnv, 0.35, -0.35);
        if (boyBones.foreArmL) boyBones.foreArmL.rotation.set(-0.85 + clinkEnv, 0.1, -0.4);
        if (boyBones.armR) boyBones.armR.rotation.set(0, 0, 0.1);

        // Girl holding mug happily
        if (girlBones.head) girlBones.head.rotation.set(0.05, 0.15, 0.05);
        if (girlBones.armR) girlBones.armR.rotation.set(0.65 + clinkEnv, -0.35, 0.35);
        if (girlBones.foreArmR) girlBones.foreArmR.rotation.set(-0.85 + clinkEnv, -0.1, 0.4);
        if (girlBones.armL) girlBones.armL.rotation.set(0, 0, -0.1);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      controls.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, []);

  return (
    <div className={`relative flex flex-col items-center w-full max-w-lg mx-auto select-none ${className}`}>
      
      {/* 1. THREE.JS 3D VIEWPORT */}
      <div className="relative w-full aspect-[9/14] sm:aspect-[9/13.5] min-h-[520px] sm:min-h-[580px] max-h-[660px] rounded-[38px] overflow-hidden bg-gradient-to-b from-[#141a29] via-[#0d121f] to-[#07090e] border-2 border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        
        {/* Canvas Mount */}
        <div
          ref={mountRef}
          onClick={() => triggerEmote('clink')}
          className="cursor-grab active:cursor-grabbing w-full h-full"
          title="Drag to rotate 360° • Pinch to zoom • Tap to toast"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-md z-30 pointer-events-none">
            <RefreshCw className="animate-spin text-amber-400" size={36} />
            <span className="text-xs font-black text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/15 shadow-md">
              Loading 3D Bitmojis... ✨
            </span>
          </div>
        )}

        {/* Top Header Floating Controls */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-white shadow-xl">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-black tracking-tight">3D Bitmoji Studio</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] font-bold text-slate-200">
              <span>{cleanMe}</span>
              <span className="text-rose-400">♥</span>
              <span>{cleanPartner}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowWardrobe(!showWardrobe)}
              className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold ${
                showWardrobe 
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-stone-950 font-black ring-2 ring-amber-300' 
                  : 'bg-black/60 hover:bg-black/80 text-white'
              }`}
            >
              <Shirt size={14} className={showWardrobe ? 'text-stone-950' : 'text-amber-400'} />
              <span>Wardrobe</span>
            </button>
          </div>
        </div>

        {/* Interaction Hint */}
        <div className="absolute bottom-4 inset-x-0 flex flex-col items-center pointer-events-none z-20">
          <p className="text-[10px] text-slate-400/80 font-medium px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/5">
            Drag to rotate 360° • Pinch to zoom • Tap to toast ☕
          </p>
        </div>

        {/* Wardrobe Outfits Drawer */}
        {showWardrobe && (
          <div className="absolute inset-x-3 bottom-3 z-30 bg-[#10141f]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3 shadow-2xl animate-fadeIn flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Select Couple Outfit
              </span>
              <button 
                type="button" 
                onClick={() => setShowWardrobe(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {Object.values(BITMOJI_OUTFITS).map((outfit) => {
                const isSelected = activeOutfit === outfit.id;
                return (
                  <button
                    key={outfit.id}
                    type="button"
                    onClick={() => applyOutfit(outfit.id)}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 shadow-md ring-1 ring-rose-400'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xl">{outfit.emoji}</span>
                    <span className="text-[11px] font-bold text-white truncate w-full">{outfit.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. REACTION EMOTE DOCK */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        <button
          type="button"
          onClick={() => triggerEmote('clink')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'clink' || activeEmote === 'toast'
              ? 'bg-amber-400 text-stone-950 scale-105 ring-2 ring-amber-300'
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
            activeEmote === 'kiss'
              ? 'bg-rose-500 text-white scale-105 ring-2 ring-rose-400'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Heart size={15} className="fill-rose-400 text-rose-400" />
          <span>Kiss 💋</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('hug')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'hug'
              ? 'bg-pink-500 text-white scale-105 ring-2 ring-pink-300'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🫂</span>
          <span>Warm Hug</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('dance')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'dance'
              ? 'bg-purple-500 text-white scale-105 ring-2 ring-purple-400'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Music size={15} className="text-purple-400" />
          <span>Slow Dance 💃</span>
        </button>
      </div>

    </div>
  );
}

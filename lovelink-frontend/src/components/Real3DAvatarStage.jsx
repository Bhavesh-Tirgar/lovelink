import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  RotateCw, Sparkles, Heart, Coffee, 
  Music
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export default function Real3DAvatarStage({
  myGlbUrl,
  partnerGlbUrl,
  myName = 'Me',
  partnerName = 'Neha',
  onOpenCreator,
  onCustomGlbUpload,
  className = '',
}) {
  const mountRef = useRef(null);
  const [activeEmote, setActiveEmote] = useState(null);
  const [isRotating, setIsRotating] = useState(true);

  // Three.js State References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  
  // Character Mesh References
  const partnerGroupRef = useRef(null);
  const userGroupRef = useRef(null);
  
  // Bone & Joint References for Procedural Animations
  const partnerBonesRef = useRef({ head: null, neck: null, rightArm: null, leftArm: null, spine: null });
  const userBonesRef = useRef({ head: null, neck: null, rightArm: null, leftArm: null, spine: null });
  
  // Mouse & Animation Timing References
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const emoteStateRef = useRef({
    current: null,
    startTime: 0,
    duration: 3000,
  });

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
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'chime') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio muted
    }
  }, []);

  // Trigger Reaction Emote
  const triggerEmote = useCallback((type = 'wave') => {
    emoteStateRef.current = {
      current: type,
      startTime: performance.now(),
      duration: type === 'dance' ? 4500 : 3000,
    };
    setActiveEmote(type);

    if (type === 'clink') {
      playSfx('clink');
      confetti({
        particleCount: 50,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FFFFFF'],
      });
      toast.success('Cheers! Coffee toasted in 3D! ☕');
    } else if (type === 'kiss') {
      playSfx('chime');
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF'],
      });
      toast.success('Sending love! 💕');
    } else if (type === 'dance') {
      playSfx('chime');
      confetti({
        particleCount: 55,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
      });
      toast.success('Grooving together! 💃🎶');
    } else if (type === 'wave') {
      playSfx('chime');
      toast.success('Waving hello! 👋');
    }

    setTimeout(() => {
      if (emoteStateRef.current.current === type) {
        emoteStateRef.current.current = null;
        setActiveEmote(null);
      }
    }, emoteStateRef.current.duration);
  }, [playSfx]);

  // Construct High-Detail Procedural 3D Character
  const buildStylizedCharacterMesh = (isPartner = false) => {
    const root = new THREE.Group();

    // 1. Root & Spine Group
    const spine = new THREE.Group();
    spine.position.y = 0.85;
    root.add(spine);

    // Torso / Jacket
    const jacketColor = isPartner ? 0x935f3d : 0x18181b; // Neha's brown Carhartt vs User's black varsity
    const bodyGeo = new THREE.CylinderGeometry(0.23, 0.27, 0.68, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: jacketColor,
      roughness: 0.45,
      metalness: 0.1,
    });
    const torsoMesh = new THREE.Mesh(bodyGeo, bodyMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    spine.add(torsoMesh);

    // Jacket Zipper / Accent
    const zipperGeo = new THREE.BoxGeometry(0.02, 0.66, 0.05);
    const zipperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
    const zipper = new THREE.Mesh(zipperGeo, zipperMat);
    zipper.position.set(0, 0, 0.25);
    spine.add(zipper);

    // Rolling Loud logo badge for User
    if (!isPartner) {
      const badgeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.02);
      const badgeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.set(-0.12, 0.16, 0.25);
      spine.add(badge);
    }

    // 2. Neck & Head Hierarchy
    const neck = new THREE.Group();
    neck.position.set(0, 0.42, 0);
    spine.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.15, 0);
    neck.add(head);

    // Head Sphere with Stylized Skin Shader
    const skinColor = isPartner ? 0xffdfc8 : 0xf9d4b8;
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.5,
      metalness: 0.05,
    });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), skinMat);
    headMesh.castShadow = true;
    head.add(headMesh);

    if (isPartner) {
      // --- NEHA'S STYLING ---
      // Big expressive cartoon eyes
      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const irisMat = new THREE.MeshBasicMaterial({ color: 0x3d2314 });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

      [-0.065, 0.065].forEach((xPos) => {
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(xPos, 0.02, 0.185);

        const white = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), eyeWhiteMat);
        white.scale.set(1, 1.2, 0.6);
        eyeGroup.add(white);

        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), irisMat);
        iris.position.set(0, 0, 0.018);
        eyeGroup.add(iris);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), pupilMat);
        pupil.position.set(0, 0, 0.028);
        eyeGroup.add(pupil);

        head.add(eyeGroup);
      });

      // Smiling lips with soft blush
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.35 });
      [-0.1, 0.1].forEach((xPos) => {
        const blush = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), blushMat);
        blush.scale.set(1.4, 0.8, 0.2);
        blush.position.set(xPos, -0.04, 0.17);
        head.add(blush);
      });

      // Sculpted Wavy Brunette Hair
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2212, roughness: 0.85 });
      const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 28), hairMat);
      hairCrown.position.set(0, 0.04, -0.03);
      head.add(hairCrown);

      // Long flowing hair strands over shoulders
      [-0.17, 0.17].forEach((xPos) => {
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.6, 20), hairMat);
        strand.position.set(xPos, -0.22, 0.02);
        strand.rotation.z = xPos > 0 ? -0.1 : 0.1;
        strand.castShadow = true;
        head.add(strand);
      });
    } else {
      // --- USER'S STYLING ---
      // Chicago White Sox Black Baseball Cap
      const capMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
      const capCrown = new THREE.Mesh(new THREE.SphereGeometry(0.21, 28, 28), capMat);
      capCrown.position.set(0, 0.06, 0);
      head.add(capCrown);

      const capBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.02, 32, 1, false, 0, Math.PI),
        capMat
      );
      capBrim.rotation.x = 0.25;
      capBrim.position.set(0, 0.04, 0.16);
      capBrim.castShadow = true;
      head.add(capBrim);

      // Dark Rectangular Sunglasses
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.065, 0.04), frameMat);
      glasses.position.set(0, 0.02, 0.2);
      head.add(glasses);

      // Broad smile with teeth
      const smileGeo = new THREE.BoxGeometry(0.12, 0.03, 0.02);
      const smileMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const smile = new THREE.Mesh(smileGeo, smileMat);
      smile.position.set(0, -0.08, 0.18);
      head.add(smile);
    }

    // 3. Right Arm Group (Hierarchical for Waving / Toasting)
    const rightArm = new THREE.Group();
    rightArm.position.set(0.3, 0.25, 0);
    spine.add(rightArm);

    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.35, 16), bodyMat);
    rUpperArm.position.set(0.04, -0.16, 0);
    rightArm.add(rUpperArm);

    // 4. Left Arm Group
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.3, 0.25, 0);
    spine.add(leftArm);

    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.35, 16), bodyMat);
    lUpperArm.position.set(-0.04, -0.16, 0);
    leftArm.add(lUpperArm);

    // 5. Ceramic Coffee Mug
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.12, 20), mugMat);
    mug.castShadow = true;
    
    // Iconic blue stripe on mug
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.025, 20), stripeMat);
    stripe.position.y = 0.02;
    mug.add(stripe);

    if (isPartner) {
      mug.position.set(0.18, -0.1, 0.25);
      rightArm.add(mug);
    } else {
      mug.position.set(-0.18, -0.1, 0.25);
      leftArm.add(mug);
    }

    // 6. Legs & Pants
    const legsGroup = new THREE.Group();
    root.add(legsGroup);

    const pantsColor = isPartner ? 0x18181b : 0x8ebad9; // Neha black shorts vs User denim
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.6 });

    [-0.12, 0.12].forEach((xPos) => {
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.62, 20), pantsMat);
      legMesh.position.set(xPos, 0.38, 0);
      legMesh.castShadow = true;
      legsGroup.add(legMesh);

      // Shoes / Boots
      const shoeColor = isPartner ? 0x111111 : 0xffffff;
      const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.3 });
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), shoeMat);
      shoe.position.set(xPos, 0.08, 0.04);
      shoe.castShadow = true;
      legsGroup.add(shoe);
    });

    return {
      root,
      bones: {
        head,
        neck,
        spine,
        rightArm,
        leftArm,
      },
    };
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || 400;
    const height = mount.clientHeight || 550;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.35, 3.8);
    cameraRef.current = camera;

    // 2. HIGH-PERFORMANCE RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 3. STUDIO 3-POINT LIGHTING
    const ambientLight = new THREE.AmbientLight(0xfffbf0, 1.4);
    scene.add(ambientLight);

    // Key Light (Warm Front-Right)
    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.4);
    keyLight.position.set(2.5, 4.0, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Fill Light (Cool Front-Left)
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.1);
    fillLight.position.set(-2.5, 3.0, 2.5);
    scene.add(fillLight);

    // Rim Backlight (Vibrant Silhouette Edge Glow)
    const rimLight = new THREE.DirectionalLight(0xfff000, 1.6);
    rimLight.position.set(0, 3.5, -3.0);
    scene.add(rimLight);

    // 4. CIRCULAR 3D STUDIO PODIUM & GROUND SHADOW
    const podiumGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.1, 64);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x181e2b,
      roughness: 0.35,
      metalness: 0.2,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(0, 0, 0);
    podium.receiveShadow = true;
    scene.add(podium);

    // Glowing Neon Ring around podium edge
    const ringGeo = new THREE.TorusGeometry(1.52, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.05, 0);
    scene.add(ring);

    // 5. 360° ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableZoom = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 6.0;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 1.0;
    controls.target.set(0, 0.95, 0);
    // Constrain pitch so user cannot flip upside down
    controls.minPolarAngle = Math.PI / 2.3;
    controls.maxPolarAngle = Math.PI / 1.85;

    // 6. BUILD & PLACE THE TWO 3D CHARACTERS
    const loader = new GLTFLoader();
    let isCancelled = false;

    // A. Partner (Left Character)
    if (partnerGlbUrl) {
      loader.load(partnerGlbUrl, (gltf) => {
        if (isCancelled) return;
        const mesh = gltf.scene;
        mesh.position.set(-0.55, 0.05, 0);
        partnerGroupRef.current = mesh;
        scene.add(mesh);
      });
    } else {
      const char = buildStylizedCharacterMesh(true);
      char.root.position.set(-0.5, 0.05, 0);
      partnerGroupRef.current = char.root;
      partnerBonesRef.current = char.bones;
      scene.add(char.root);
    }

    // B. User (Right Character)
    if (myGlbUrl) {
      loader.load(myGlbUrl, (gltf) => {
        if (isCancelled) return;
        const mesh = gltf.scene;
        mesh.position.set(0.55, 0.05, 0);
        userGroupRef.current = mesh;
        scene.add(mesh);
      });
    } else {
      const char = buildStylizedCharacterMesh(false);
      char.root.position.set(0.5, 0.05, 0);
      userGroupRef.current = char.root;
      userBonesRef.current = char.bones;
      scene.add(char.root);
    }

    // 7. MOUSE / TOUCH POINTER TRACKING FOR HEAD-TURNING
    const handlePointerMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = Math.max(-1, Math.min(1, x));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, y));
    };

    mount.addEventListener('pointermove', handlePointerMove);

    // 8. 60FPS ANIMATION LOOP (IDLE BREATHING + EMOTES + HEAD LOOK-AT)
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      controls.update();

      // Smooth interpolation for pointer tracking
      mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, mouseRef.current.targetX, 0.08);
      mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, mouseRef.current.targetY, 0.08);

      const targetYaw = mouseRef.current.x * 0.45;
      const targetPitch = -mouseRef.current.y * 0.25;

      // Natural Breathing Idle Loop
      const breath = Math.sin(elapsedTime * 2.2) * 0.015;

      [partnerBonesRef.current, userBonesRef.current].forEach((bones) => {
        if (!bones.head) return;

        // Head & Neck look at cursor
        bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetYaw, 0.1);
        bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, targetPitch, 0.1);

        if (bones.spine) {
          bones.spine.position.y = 0.85 + breath;
        }
      });

      // Procedural Reaction Emotes
      const currentEmote = emoteStateRef.current.current;
      const emoteTime = (performance.now() - emoteStateRef.current.startTime) / 1000;

      if (currentEmote === 'wave') {
        const wave = Math.sin(emoteTime * 12) * 0.4;
        if (userBonesRef.current.rightArm) {
          userBonesRef.current.rightArm.rotation.z = -1.6 + wave;
        }
        if (partnerBonesRef.current.leftArm) {
          partnerBonesRef.current.leftArm.rotation.z = 1.6 - wave;
        }
      } else if (currentEmote === 'dance') {
        const danceSway = Math.sin(emoteTime * 6) * 0.2;
        const bounce = Math.abs(Math.sin(emoteTime * 6)) * 0.06;
        if (partnerGroupRef.current) {
          partnerGroupRef.current.position.y = 0.05 + bounce;
          partnerGroupRef.current.rotation.z = danceSway;
        }
        if (userGroupRef.current) {
          userGroupRef.current.position.y = 0.05 + bounce;
          userGroupRef.current.rotation.z = -danceSway;
        }
      } else if (currentEmote === 'kiss') {
        // Lean in towards each other
        if (partnerGroupRef.current) {
          partnerGroupRef.current.rotation.z = THREE.MathUtils.lerp(partnerGroupRef.current.rotation.z, 0.15, 0.05);
        }
        if (userGroupRef.current) {
          userGroupRef.current.rotation.z = THREE.MathUtils.lerp(userGroupRef.current.rotation.z, -0.15, 0.05);
        }
      } else if (currentEmote === 'clink') {
        // Raise coffee mugs
        const toastLift = Math.sin(Math.min(emoteTime * 3, Math.PI)) * 0.35;
        if (partnerBonesRef.current.rightArm) {
          partnerBonesRef.current.rightArm.rotation.x = -toastLift;
        }
        if (userBonesRef.current.leftArm) {
          userBonesRef.current.leftArm.rotation.x = -toastLift;
        }
      } else {
        // Reset neutral pose
        if (partnerGroupRef.current) {
          partnerGroupRef.current.rotation.z = THREE.MathUtils.lerp(partnerGroupRef.current.rotation.z, 0, 0.1);
        }
        if (userGroupRef.current) {
          userGroupRef.current.rotation.z = THREE.MathUtils.lerp(userGroupRef.current.rotation.z, 0, 0.1);
        }
        if (userBonesRef.current.rightArm) {
          userBonesRef.current.rightArm.rotation.z = THREE.MathUtils.lerp(userBonesRef.current.rightArm.rotation.z, 0, 0.1);
        }
        if (partnerBonesRef.current.leftArm) {
          partnerBonesRef.current.leftArm.rotation.z = THREE.MathUtils.lerp(partnerBonesRef.current.leftArm.rotation.z, 0, 0.1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);

      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [myGlbUrl, partnerGlbUrl, isRotating]);

  return (
    <div className={`relative flex flex-col items-center w-full max-w-xl mx-auto select-none ${className}`}>
      
      {/* 1. REAL THREE.JS WEBGL CANVAS */}
      <div className="relative w-full aspect-[9/13] sm:aspect-[9/12] min-h-[500px] sm:min-h-[580px] max-h-[640px] rounded-[36px] overflow-hidden bg-gradient-to-b from-[#0b0e17] via-[#121724] to-[#0a0d14] border-2 border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        
        {/* 3D WebGL Canvas Mount */}
        <div
          ref={mountRef}
          onClick={() => triggerEmote('clink')}
          className="cursor-grab active:cursor-grabbing w-full h-full"
          title="Drag to rotate 360° • Pinch to zoom • Tap to toast"
        />

        {/* Top Floating Controls */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-2 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black tracking-tight">3D WebGL Engine</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-full backdrop-blur-md border border-white/15 shadow-xl transition-all ${
                isRotating ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-black/60 text-white'
              }`}
              title={isRotating ? 'Pause Auto-Spin' : 'Auto-Spin 360°'}
            >
              <RotateCw size={14} className={isRotating ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={onOpenCreator}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-xl border border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
              title="Open 3D Avatar Creator to generate a new 3D model from selfie"
            >
              <Sparkles size={13} className="text-yellow-300" />
              <span>3D Studio</span>
            </button>
          </div>
        </div>

        {/* Bottom Character Names Podium Capsule */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-20">
          <div className="flex items-center gap-2.5 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-2xl">
            <span className="text-xs font-black text-amber-300">{partnerName}</span>
            <span className="text-xs text-rose-400">💛</span>
            <span className="text-xs font-black text-amber-300">{myName}</span>
          </div>
        </div>
      </div>

      {/* 2. EMOTE DOCK (BELOW 3D VIEWPORT) */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        <button
          onClick={() => triggerEmote('clink')}
          className={`px-4 py-2 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'clink'
              ? 'bg-amber-400 text-stone-950 scale-105'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Coffee size={14} className="text-amber-400" />
          <span>Toast Coffee ☕</span>
        </button>

        <button
          onClick={() => triggerEmote('wave')}
          className={`px-4 py-2 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'wave'
              ? 'bg-sky-400 text-stone-950 scale-105'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span>👋</span>
          <span>Wave Hello</span>
        </button>

        <button
          onClick={() => triggerEmote('dance')}
          className={`px-4 py-2 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'dance'
              ? 'bg-purple-500 text-white scale-105'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Music size={14} className="text-purple-400" />
          <span>Dance Groove 💃</span>
        </button>

        <button
          onClick={() => triggerEmote('kiss')}
          className={`px-4 py-2 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'kiss'
              ? 'bg-rose-500 text-white scale-105'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Heart size={14} className="fill-rose-400 text-rose-400" />
          <span>Blow Kiss 💕</span>
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-medium text-center mt-3">
        🎮 Real 3D WebGL Canvas • Drag to spin 360° • Characters look toward your cursor • Tap buttons to animate!
      </p>

    </div>
  );
}

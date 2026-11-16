import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { 
  RotateCw, Sparkles, Heart, Coffee, 
  Music, Upload, RefreshCw, Camera, Copy, Check, Box
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export default function Real3DAvatarStage({
  myGlbUrl,
  partnerGlbUrl,
  myName = 'Me',
  partnerName = 'Neha',
  partnerHandle = '@ neha_xmusic',
  onOpenCreator,
  className = '',
}) {
  const mountRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // State
  const [stageMode, setStageMode] = useState('snapchat'); // 'snapchat' | 'glb'
  const [activeEmote, setActiveEmote] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [customPartnerHandle, setCustomPartnerHandle] = useState(partnerHandle);
  const [isEditingHandle, setIsEditingHandle] = useState(false);

  // Custom Local Overrides (if user uploads a .glb file)
  const [localMyGlb, setLocalMyGlb] = useState(null);

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Character Groups in Three.js
  const girlGroupRef = useRef(null);
  const boyGroupRef = useRef(null);
  const glbModelLeftRef = useRef(null);
  const glbModelRightRef = useRef(null);
  const heartsGroupRef = useRef(null);
  const steamGroupRef = useRef(null);

  // Mouse & Animation Timing
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const emoteStateRef = useRef({
    current: null,
    startTime: 0,
    duration: 3000,
  });

  // Sound Effects (Web Audio API Synthesizer)
  const playSfx = useCallback((type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
        // High crystalline coffee cup clink
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1480, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'chime') {
        // Warm romantic chord chime
        [587.33, 739.99, 880.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + idx * 0.05 + 0.35);
        });
      } else if (type === 'dance') {
        // Fun melodic bounce
        [440, 554, 659, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
        });
      }
    } catch {
      // Audio muted or blocked by browser policy
    }
  }, []);

  // Trigger Reaction Emote
  const triggerEmote = useCallback((type = 'clink') => {
    emoteStateRef.current = {
      current: type,
      startTime: performance.now(),
      duration: type === 'dance' ? 4500 : 3200,
    };
    setActiveEmote(type);

    if (type === 'clink') {
      playSfx('clink');
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFFC00', '#FBBF24', '#F59E0B', '#FFFFFF'],
      });
      toast.success('Cheers! Coffee toasted together! ☕💛');
    } else if (type === 'kiss') {
      playSfx('chime');
      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF', '#FFFFFF'],
      });
      toast.success(`Sending love to ${partnerName}! 💕`);
    } else if (type === 'dance') {
      playSfx('dance');
      confetti({
        particleCount: 60,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#FFFC00'],
      });
      toast.success('Dancing groove in 3D! 💃🎶');
    } else if (type === 'wave') {
      playSfx('chime');
      toast.success(`Waving hello to ${partnerName}! 👋✨`);
    }

    setTimeout(() => {
      if (emoteStateRef.current.current === type) {
        emoteStateRef.current.current = null;
        setActiveEmote(null);
      }
    }, emoteStateRef.current.duration);
  }, [partnerName, playSfx]);

  // Handle Custom .glb Model Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      toast.error('Please upload a 3D .glb or .gltf file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalMyGlb(objectUrl);
    setStageMode('glb');
    toast.success(`Loaded 3D Model: ${file.name} ✨`);
  };

  // Handle Copy Partner Handle
  const handleCopyHandle = () => {
    navigator.clipboard?.writeText(customPartnerHandle);
    setCopiedHandle(true);
    toast.success('Snapchat handle copied! 📋');
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  // Screenshot / Snapshot Canvas
  const handleCaptureSnapshot = () => {
    if (!rendererRef.current) return;
    try {
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `lovelink_3d_couple_${Date.now()}.png`;
      a.click();
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.5 } });
      toast.success('Snapshot saved to your device! 📸✨');
    } catch {
      toast.error('Could not capture snapshot');
    }
  };

  // -------------------------------------------------------------
  // THREE.JS SCENE INITIALIZATION & RENDER LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setIsLoading(true);

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Iconic Snapchat yellow background
    scene.background = new THREE.Color(0xfffc00);

    const width = mount.clientWidth || 420;
    const height = mount.clientHeight || 620;

    // 2. PERSPECTIVE CAMERA
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 1.18, 3.45);
    cameraRef.current = camera;

    // 3. WEBGL RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 4. STUDIO LIGHTING
    // Ambient light matching vibrant Snapchat tone
    const ambientLight = new THREE.AmbientLight(0xfffee8, 1.85);
    scene.add(ambientLight);

    // Directional Key Light from top-front
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.4);
    keyLight.position.set(2.0, 3.5, 3.0);
    scene.add(keyLight);

    // Fill Light from left
    const fillLight = new THREE.DirectionalLight(0xfffbe6, 0.9);
    fillLight.position.set(-2.0, 2.8, 2.5);
    scene.add(fillLight);

    // Back Rim Light to give silhouette depth
    const rimLight = new THREE.DirectionalLight(0xfff5cc, 1.1);
    rimLight.position.set(0, 3.2, -2.5);
    scene.add(rimLight);

    // 5. STUDIO FLOOR & HORIZON PLANE
    // Subtle horizon floor matching Snapchat's ground plane
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0xf5e228 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    scene.add(floor);

    // 6. 360° ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableZoom = true;
    controls.minDistance = 2.0;
    controls.maxDistance = 5.2;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 1.2;
    controls.target.set(0, 1.08, 0);
    controls.minPolarAngle = Math.PI / 2.3;
    controls.maxPolarAngle = Math.PI / 1.85;

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();

    // 7. GROUND CONTACT SHADOW
    textureLoader.load(
      '/assets/avatars/contact_shadow.png',
      (shadowTex) => {
        shadowTex.colorSpace = THREE.SRGBColorSpace;
        const shadowGeo = new THREE.PlaneGeometry(2.3, 0.95);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.set(0.02, 0.003, 0);
        scene.add(shadowMesh);
      },
      undefined,
      () => {
        // Fallback procedural soft shadow
        const shadowGeo = new THREE.RingGeometry(0.01, 1.1, 32);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0xd4c21a, transparent: true, opacity: 0.45 });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.set(0, 0.003, 0);
        scene.add(shadowMesh);
      }
    );

    // 8. 3D PARTICLE SYSTEMS (HEARTS & COFFEE STEAM)
    // Heart particles group
    const heartsGroup = new THREE.Group();
    heartsGroupRef.current = heartsGroup;
    scene.add(heartsGroup);

    const heartSprites = [];
    textureLoader.load('/assets/avatars/heart_particle.png', (heartTex) => {
      heartTex.colorSpace = THREE.SRGBColorSpace;
      const heartMat = new THREE.SpriteMaterial({ map: heartTex, transparent: true, opacity: 0 });
      for (let i = 0; i < 18; i++) {
        const sprite = new THREE.Sprite(heartMat.clone());
        sprite.scale.set(0.18, 0.18, 1);
        sprite.visible = false;
        sprite.userData = {
          speedY: 0.012 + Math.random() * 0.016,
          speedX: (Math.random() - 0.5) * 0.008,
          wobbleSpeed: 2 + Math.random() * 3,
          birthTime: 0,
          lifetime: 1800 + Math.random() * 1200,
        };
        heartsGroup.add(sprite);
        heartSprites.push(sprite);
      }
    });

    // Steam particles group
    const steamGroup = new THREE.Group();
    steamGroupRef.current = steamGroup;
    scene.add(steamGroup);

    const steamSprites = [];
    textureLoader.load('/assets/avatars/steam_particle.png', (steamTex) => {
      steamTex.colorSpace = THREE.SRGBColorSpace;
      const steamMat = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0 });
      for (let i = 0; i < 12; i++) {
        const sprite = new THREE.Sprite(steamMat.clone());
        sprite.scale.set(0.14, 0.14, 1);
        sprite.visible = false;
        sprite.userData = {
          speedY: 0.008 + Math.random() * 0.01,
          wobbleSpeed: 1.5 + Math.random() * 2,
          birthTime: 0,
          lifetime: 1400 + Math.random() * 800,
        };
        steamGroup.add(sprite);
        steamSprites.push(sprite);
      }
    });

    // 9. LOAD SNAPCHAT 3D CHARACTERS
    if (stageMode === 'snapchat') {
      // Girl Character (Neha) on Left
      textureLoader.load(
        '/assets/avatars/snap_girl_cutout.png',
        (girlTex) => {
          girlTex.colorSpace = THREE.SRGBColorSpace;
          girlTex.generateMipmaps = true;
          girlTex.minFilter = THREE.LinearMipmapLinearFilter;

          const girlGeo = new THREE.PlaneGeometry(0.96, 2.15, 16, 16);
          // Offset pivot to bottom feet
          girlGeo.translate(0, 1.075, 0);

          const girlMat = new THREE.MeshStandardMaterial({
            map: girlTex,
            transparent: true,
            alphaTest: 0.03,
            roughness: 0.45,
            metalness: 0.05,
            side: THREE.DoubleSide,
          });

          const girlMesh = new THREE.Mesh(girlGeo, girlMat);
          const girlGroup = new THREE.Group();
          girlGroup.position.set(-0.38, 0.005, 0.04);
          girlGroup.add(girlMesh);
          scene.add(girlGroup);
          girlGroupRef.current = girlGroup;

          setIsLoading(false);
        },
        undefined,
        (err) => {
          console.warn('Could not load girl cutout, using couple fallback:', err);
          setIsLoading(false);
        }
      );

      // Boy Character (User) on Right
      textureLoader.load(
        '/assets/avatars/snap_boy_cutout.png',
        (boyTex) => {
          boyTex.colorSpace = THREE.SRGBColorSpace;
          boyTex.generateMipmaps = true;
          boyTex.minFilter = THREE.LinearMipmapLinearFilter;

          const boyGeo = new THREE.PlaneGeometry(0.96, 2.20, 16, 16);
          // Offset pivot to bottom feet
          boyGeo.translate(0, 1.10, 0);

          const boyMat = new THREE.MeshStandardMaterial({
            map: boyTex,
            transparent: true,
            alphaTest: 0.03,
            roughness: 0.45,
            metalness: 0.05,
            side: THREE.DoubleSide,
          });

          const boyMesh = new THREE.Mesh(boyGeo, boyMat);
          const boyGroup = new THREE.Group();
          boyGroup.position.set(0.38, 0.005, -0.04);
          boyGroup.add(boyMesh);
          scene.add(boyGroup);
          boyGroupRef.current = boyGroup;

          setIsLoading(false);
        },
        undefined,
        (err) => {
          console.warn('Could not load boy cutout:', err);
          setIsLoading(false);
        }
      );
    } else {
      // GLB 3D Humanoid Models Mode
      const loader = new GLTFLoader();
      const femaleGlb = partnerGlbUrl || '/models/female_avatar.glb';
      const maleGlb = localMyGlb || myGlbUrl || '/models/male_avatar.glb';

      let loadedCount = 0;
      const onGlbLoaded = () => {
        loadedCount++;
        if (loadedCount >= 2) setIsLoading(false);
      };

      loader.load(
        femaleGlb,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(-0.55, 0.01, 0);
          model.scale.set(1, 1, 1);
          scene.add(model);
          glbModelLeftRef.current = model;
          onGlbLoaded();
        },
        undefined,
        () => onGlbLoaded()
      );

      loader.load(
        maleGlb,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0.55, 0.01, 0);
          model.scale.set(1, 1, 1);
          scene.add(model);
          glbModelRightRef.current = model;
          onGlbLoaded();
        },
        undefined,
        () => onGlbLoaded()
      );
    }

    // 10. MOUSE & TOUCH TRACKING FOR 3D LOOK-AT
    const handlePointerMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = THREE.MathUtils.clamp(x, -1, 1);
      mouseRef.current.targetY = THREE.MathUtils.clamp(y, -1, 1);
    };

    mount.addEventListener('pointermove', handlePointerMove);

    // 11. ANIMATION & RENDER LOOP
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerping
      mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, mouseRef.current.targetX, 0.08);
      mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, mouseRef.current.targetY, 0.08);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      const currentEmote = emoteStateRef.current.current;
      const emoteProgress = currentEmote
        ? (performance.now() - emoteStateRef.current.startTime) / emoteStateRef.current.duration
        : 0;

      // Update Controls
      controls.autoRotate = isRotating;
      controls.update();

      // --- SNAPCHAT CHARACTERS ANIMATION ---
      const girlGroup = girlGroupRef.current;
      const boyGroup = boyGroupRef.current;

      if (girlGroup && boyGroup) {
        // Natural idle breathing physics
        const idleBreathing = Math.sin(elapsedTime * 2.4) * 0.008;
        const idleSwayX = Math.sin(elapsedTime * 1.6) * 0.004;

        // Base transforms
        let gPosX = -0.38 + idleSwayX;
        let gPosY = 0.005 + idleBreathing;
        let gRotZ = 0;
        let gRotY = mouseX * 0.22;
        let gRotX = -mouseY * 0.12;

        let bPosX = 0.38 - idleSwayX;
        let bPosY = 0.005 + Math.sin(elapsedTime * 2.4 + 0.5) * 0.008;
        let bRotZ = 0;
        let bRotY = mouseX * 0.22;
        let bRotX = -mouseY * 0.12;

        // EMOTE OVERRIDES
        if (currentEmote === 'clink' && emoteProgress < 1.0) {
          // Toast: Lean together, cups meet in middle, clink bounce
          const toastEnvelope = Math.sin(emoteProgress * Math.PI);
          gPosX = THREE.MathUtils.lerp(-0.38, -0.22, toastEnvelope);
          bPosX = THREE.MathUtils.lerp(0.38, 0.22, toastEnvelope);
          gRotZ = toastEnvelope * 0.09;
          bRotZ = -toastEnvelope * 0.09;
          gPosY += Math.sin(emoteProgress * Math.PI * 4) * 0.012 * toastEnvelope;
          bPosY += Math.sin(emoteProgress * Math.PI * 4) * 0.012 * toastEnvelope;

          // Steam emission
          steamSprites.forEach((sprite, idx) => {
            if (!sprite.visible && Math.random() < 0.15) {
              sprite.visible = true;
              sprite.material.opacity = 0.6;
              sprite.position.set(
                (Math.random() - 0.5) * 0.3,
                1.05 + Math.random() * 0.05,
                0.1
              );
              sprite.userData.birthTime = performance.now();
            }
          });
        } else if (currentEmote === 'kiss' && emoteProgress < 1.0) {
          // Kiss: Sweet lean & floating 3D hearts
          const kissEnvelope = Math.sin(emoteProgress * Math.PI);
          gPosX = THREE.MathUtils.lerp(-0.38, -0.25, kissEnvelope);
          bPosX = THREE.MathUtils.lerp(0.38, 0.25, kissEnvelope);
          gRotZ = kissEnvelope * 0.07;
          bRotZ = -kissEnvelope * 0.07;

          // Spawn floating hearts
          heartSprites.forEach((sprite) => {
            if (!sprite.visible && Math.random() < 0.12) {
              sprite.visible = true;
              sprite.material.opacity = 0.85;
              sprite.position.set(
                (Math.random() - 0.5) * 0.45,
                1.15 + Math.random() * 0.1,
                (Math.random() - 0.5) * 0.2
              );
              sprite.userData.birthTime = performance.now();
            }
          });
        } else if (currentEmote === 'dance' && emoteProgress < 1.0) {
          // Dance: Rhythmic upbeat bounce & tilt
          const bounce = Math.abs(Math.sin(elapsedTime * 9)) * 0.055;
          const tilt = Math.sin(elapsedTime * 9) * 0.12;
          gPosY += bounce;
          bPosY += Math.abs(Math.sin(elapsedTime * 9 + 0.4)) * 0.055;
          gRotZ = tilt;
          bRotZ = -tilt;
        } else if (currentEmote === 'wave' && emoteProgress < 1.0) {
          // Wave: Cheerful wave tilt
          const waveTilt = Math.sin(elapsedTime * 11) * 0.08;
          bRotZ = waveTilt;
          bPosY += Math.abs(Math.sin(elapsedTime * 5.5)) * 0.02;
        }

        // Apply transforms smoothly
        girlGroup.position.x = THREE.MathUtils.lerp(girlGroup.position.x, gPosX, 0.1);
        girlGroup.position.y = THREE.MathUtils.lerp(girlGroup.position.y, gPosY, 0.1);
        girlGroup.rotation.z = THREE.MathUtils.lerp(girlGroup.rotation.z, gRotZ, 0.12);
        girlGroup.rotation.y = THREE.MathUtils.lerp(girlGroup.rotation.y, gRotY, 0.08);
        girlGroup.rotation.x = THREE.MathUtils.lerp(girlGroup.rotation.x, gRotX, 0.08);

        boyGroup.position.x = THREE.MathUtils.lerp(boyGroup.position.x, bPosX, 0.1);
        boyGroup.position.y = THREE.MathUtils.lerp(boyGroup.position.y, bPosY, 0.1);
        boyGroup.rotation.z = THREE.MathUtils.lerp(boyGroup.rotation.z, bRotZ, 0.12);
        boyGroup.rotation.y = THREE.MathUtils.lerp(boyGroup.rotation.y, bRotY, 0.08);
        boyGroup.rotation.x = THREE.MathUtils.lerp(boyGroup.rotation.x, bRotX, 0.08);
      }

      // --- GLB 3D MODELS ANIMATION (IF IN GLB MODE) ---
      const glbLeft = glbModelLeftRef.current;
      const glbRight = glbModelRightRef.current;
      if (glbLeft && glbRight) {
        const glbBreath = Math.sin(elapsedTime * 2.2) * 0.008;
        glbLeft.position.y = 0.01 + glbBreath;
        glbRight.position.y = 0.01 + Math.sin(elapsedTime * 2.2 + 0.3) * 0.008;

        glbLeft.rotation.y = THREE.MathUtils.lerp(glbLeft.rotation.y, mouseX * 0.3, 0.08);
        glbRight.rotation.y = THREE.MathUtils.lerp(glbRight.rotation.y, mouseX * 0.3, 0.08);
      }

      // --- UPDATE FLOATING 3D HEARTS ---
      const now = performance.now();
      heartSprites.forEach((sprite) => {
        if (sprite.visible) {
          const age = now - sprite.userData.birthTime;
          if (age > sprite.userData.lifetime) {
            sprite.visible = false;
            sprite.material.opacity = 0;
          } else {
            const progress = age / sprite.userData.lifetime;
            sprite.position.y += sprite.userData.speedY;
            sprite.position.x += Math.sin(age * 0.004 * sprite.userData.wobbleSpeed) * 0.003;
            sprite.material.opacity = (1 - progress) * 0.9;
            const scale = 0.18 + Math.sin(progress * Math.PI) * 0.06;
            sprite.scale.set(scale, scale, 1);
          }
        }
      });

      // --- UPDATE COFFEE STEAM PARTICLES ---
      steamSprites.forEach((sprite) => {
        if (sprite.visible) {
          const age = now - sprite.userData.birthTime;
          if (age > sprite.userData.lifetime) {
            sprite.visible = false;
            sprite.material.opacity = 0;
          } else {
            const progress = age / sprite.userData.lifetime;
            sprite.position.y += sprite.userData.speedY;
            sprite.position.x += Math.sin(age * 0.005 * sprite.userData.wobbleSpeed) * 0.002;
            sprite.material.opacity = (1 - progress) * 0.55;
            const scale = 0.14 + progress * 0.12;
            sprite.scale.set(scale, scale, 1);
          }
        }
      });

      // Render Scene
      renderer.render(scene, camera);
    };

    animate();

    // 12. WINDOW RESIZE HANDLER
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 13. CLEANUP ON UNMOUNT
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      mount.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      // Dispose Three.js resources
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });

      controls.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [stageMode, isRotating, partnerGlbUrl, myGlbUrl, localMyGlb]);

  return (
    <div className={`relative w-full flex flex-col items-center select-none ${className}`}>
      
      {/* Hidden File Input for Custom .glb upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. SNAPCHAT 3D COUPLE STAGE VIEWPORT */}
      <div className="relative w-full aspect-[9/14] sm:aspect-[9/13] min-h-[520px] sm:min-h-[580px] max-h-[660px] rounded-[38px] overflow-hidden bg-[#fffc00] border-4 border-yellow-300 shadow-[0_25px_80px_rgba(255,252,0,0.25)] flex flex-col justify-between">
        
        {/* Three.js WebGL Canvas Mount */}
        <div
          ref={mountRef}
          onClick={() => triggerEmote('clink')}
          className="cursor-grab active:cursor-grabbing w-full h-full"
          title="Drag to rotate 360° • Pinch to zoom • Tap to toast coffee"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#fffc00]/80 backdrop-blur-sm z-30 pointer-events-none">
            <RefreshCw className="animate-spin text-stone-900" size={36} />
            <span className="text-xs font-black text-stone-900 bg-white/90 px-4 py-1.5 rounded-full shadow-md">
              Loading 3D Avatars... ✨
            </span>
          </div>
        )}

        {/* Top Floating Controls Dock */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          
          {/* Stage Mode Badge */}
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-white shadow-xl pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs font-black tracking-tight">
              {stageMode === 'snapchat' ? 'Snapchat 3D Duo' : '3D GLB Studio'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            
            {/* Toggle Stage Mode (Snapchat Bitmoji vs. 3D GLB) */}
            <button
              onClick={() => setStageMode(stageMode === 'snapchat' ? 'glb' : 'snapchat')}
              className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 ${
                stageMode === 'glb'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title={stageMode === 'snapchat' ? 'Switch to 3D GLB Mesh Mode' : 'Switch to Snapchat 3D Duo'}
            >
              <Box size={14} className={stageMode === 'glb' ? 'text-yellow-300' : 'text-slate-200'} />
            </button>

            {/* Custom .glb Model Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-xl transition-all active:scale-95"
              title="Upload custom 3D model (.glb)"
            >
              <Upload size={14} className="text-yellow-400" />
            </button>

            {/* 360° Auto-Rotate Toggle */}
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 ${
                isRotating ? 'bg-yellow-400 text-stone-950 font-bold' : 'bg-black/60 text-white'
              }`}
              title={isRotating ? 'Pause Auto-Spin' : 'Auto-Spin 360°'}
            >
              <RotateCw size={14} className={isRotating ? 'animate-spin' : ''} />
            </button>

            {/* Snapshot Camera */}
            <button
              onClick={handleCaptureSnapshot}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-xl transition-all active:scale-95"
              title="Save Snapshot Photo"
            >
              <Camera size={14} className="text-emerald-400" />
            </button>

            {/* 3D Selfie Creator */}
            <button
              onClick={onOpenCreator}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-xl border border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
              title="Take a selfie to generate your personal 3D avatar"
            >
              <Sparkles size={13} className="text-yellow-300" />
              <span className="hidden sm:inline">3D Selfie</span>
            </button>
          </div>
        </div>

        {/* BOTTOM AUTHENTIC SNAPCHAT HANDLE PILL */}
        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center pointer-events-none z-20">
          {isEditingHandle ? (
            <div className="pointer-events-auto flex items-center gap-2 bg-[#9da236]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 shadow-2xl">
              <span className="text-xs font-black text-stone-900">@</span>
              <input
                type="text"
                value={customPartnerHandle.replace(/^@\s*/, '')}
                onChange={(e) => setCustomPartnerHandle(`@ ${e.target.value.trim()}`)}
                className="bg-transparent border-none text-xs font-black text-stone-950 outline-none w-28 text-center"
                autoFocus
                onBlur={() => setIsEditingHandle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingHandle(false)}
              />
              <button
                onClick={() => setIsEditingHandle(false)}
                className="text-stone-900 p-0.5"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleCopyHandle}
              onDoubleClick={() => setIsEditingHandle(true)}
              className="pointer-events-auto group flex items-center gap-2 bg-[#a3a637] hover:bg-[#8f922d] text-stone-950 font-black text-xs px-4 py-2 rounded-full border border-stone-800/10 shadow-lg active:scale-95 transition-all"
              title="Click to copy handle • Double click to edit"
            >
              <span className="text-stone-950/80 font-bold">@</span>
              <span className="tracking-tight">{customPartnerHandle.replace(/^@\s*/, '')}</span>
              {copiedHandle ? (
                <Check size={12} className="text-stone-950" />
              ) : (
                <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-950" />
              )}
            </button>
          )}

          <p className="text-[10px] text-stone-800/60 font-bold mt-1">
            Tap characters to toast • Drag to orbit 360°
          </p>
        </div>
      </div>

      {/* 2. REACTION EMOTE DOCK (INTERACTIVE COUPLE ACTIONS) */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        <button
          onClick={() => triggerEmote('clink')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'clink'
              ? 'bg-amber-400 text-stone-950 scale-105 ring-2 ring-amber-300'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Coffee size={15} className="text-amber-400" />
          <span>Toast Coffee ☕</span>
        </button>

        <button
          onClick={() => triggerEmote('kiss')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'kiss'
              ? 'bg-rose-500 text-white scale-105 ring-2 ring-rose-400'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Heart size={15} className="fill-rose-400 text-rose-400" />
          <span>Blow Kiss 💕</span>
        </button>

        <button
          onClick={() => triggerEmote('dance')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'dance'
              ? 'bg-purple-500 text-white scale-105 ring-2 ring-purple-400'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Music size={15} className="text-purple-400" />
          <span>Dance Party 💃</span>
        </button>

        <button
          onClick={() => triggerEmote('wave')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'wave'
              ? 'bg-sky-400 text-stone-950 scale-105 ring-2 ring-sky-300'
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
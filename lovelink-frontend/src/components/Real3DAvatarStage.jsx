import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { 
  RotateCw, Sparkles, Heart, Coffee, 
  Music, Upload, RefreshCw, Camera, Box, Copy, Check
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
  const [activeEmote, setActiveEmote] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedHandle, setCopiedHandle] = useState(false);

  // Custom Local Overrides (if user uploads a custom .glb file)
  const [localMyGlb, setLocalMyGlb] = useState(null);
  const [localPartnerGlb] = useState(null);

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Character Models and Skeletal Bones
  const leftModelRef = useRef(null);
  const rightModelRef = useRef(null);
  const leftBonesRef = useRef({ 
    head: null, neck: null, leftArm: null, rightArm: null, 
    leftForeArm: null, rightForeArm: null, spine: null, hips: null 
  });
  const rightBonesRef = useRef({ 
    head: null, neck: null, leftArm: null, rightArm: null, 
    leftForeArm: null, rightForeArm: null, spine: null, hips: null 
  });

  // Mouse & Animation Timing
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const emoteStateRef = useRef({
    current: null,
    startTime: 0,
    duration: 3200,
  });

  // Sound Effects
  const playSfx = useCallback((type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
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
      }
    } catch {
      // Audio muted or not allowed without user interaction
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
        colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FFFFFF'],
      });
      toast.success('Cheers! Coffee toasted in 3D! ☕');
    } else if (type === 'kiss') {
      playSfx('chime');
      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF'],
      });
      toast.success(`Sending love to ${partnerName}! 💕`);
    } else if (type === 'dance') {
      playSfx('chime');
      confetti({
        particleCount: 60,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B'],
      });
      toast.success('Dancing in 3D! 💃🎶');
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
    toast.success(`Loaded 3D Model: ${file.name} ✨`);
  };

  // Handle Copy Handle
  const handleCopyHandle = () => {
    navigator.clipboard?.writeText(partnerHandle);
    setCopiedHandle(true);
    toast.success('Handle copied! 📋');
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
  // THREE.JS SCENE SETUP & REAL 3D MODEL LOADING
  // -------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setIsLoading(true);

    // 1. SCENE SETUP - Sleek Luxury Dark Studio Atmosphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || 440;
    const height = mount.clientHeight || 640;

    // 2. PERSPECTIVE CAMERA (Framed to show both characters head-to-toe)
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 1.05, 3.8);
    cameraRef.current = camera;

    // 3. WEBGL RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 4. STUDIO LIGHTING (Warm Key + Cool Fill + Silhouetting Rim)
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    keyLight.position.set(2.5, 4.0, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.1);
    fillLight.position.set(-2.5, 3.0, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfdf4ff, 1.4);
    rimLight.position.set(0, 3.2, -2.5);
    scene.add(rimLight);

    // 5. LUXURY STUDIO CIRCULAR PODIUM & NEON ACCENT RING
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.6, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x121722, roughness: 0.3, metalness: 0.35 })
    );
    podium.position.set(0, 0.04, 0);
    scene.add(podium);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.022, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x6366f1 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.082, 0);
    scene.add(ring);

    // 6. 360° ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableZoom = true;
    controls.minDistance = 2.0;
    controls.maxDistance = 5.5;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 1.2;
    controls.target.set(0, 1.0, 0);
    controls.minPolarAngle = Math.PI / 2.3;
    controls.maxPolarAngle = Math.PI / 1.85;

    // 7. BONE MAPPING HELPER
    const mapBones = (model, bonesRef) => {
      model.traverse((child) => {
        if (child.isBone) {
          const name = child.name.toLowerCase();
          if (name === 'head') bonesRef.current.head = child;
          if (name === 'neck') bonesRef.current.neck = child;
          if (name === 'leftarm') bonesRef.current.leftArm = child;
          if (name === 'rightarm') bonesRef.current.rightArm = child;
          if (name === 'leftforearm') bonesRef.current.leftForeArm = child;
          if (name === 'rightforearm') bonesRef.current.rightForeArm = child;
          if (name === 'spine' || name === 'spine1' || name === 'spine2') {
            if (!bonesRef.current.spine) bonesRef.current.spine = child;
          }
          if (name === 'hips') bonesRef.current.hips = child;
        }
      });
    };

    // 8. LOAD REAL 3D HUMANOID MODELS (.GLB)
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        setIsLoading(false);
      }
    };

    const femaleGlb = localPartnerGlb || partnerGlbUrl || '/models/female_avatar.glb';
    const maleGlb = localMyGlb || myGlbUrl || '/models/male_avatar.glb';

    // Load Left Model (Female Avatar / Neha)
    // Scale: 1.135 -> Height 1.685m (Natural couple proportions: female is ~1.69m, male is ~1.83m)
    // Suit jacket kept 100% visible so arms & hands are fully attached!
    loader.load(
      femaleGlb,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(-0.44, 0.08, 0);
        model.scale.set(1.135, 1.135, 1.135);
        
        model.traverse((child) => {
          if (child.isMesh) {
            const name = child.name.toLowerCase();
            // Hide corporate tie, glasses, and button accessories
            if (name.includes('tie') || name.includes('eyeglass') || name.includes('button')) {
              child.visible = false;
            } else {
              // Keep body, hair, suit jacket, shirt, pants, shoes, earrings VISIBLE!
              child.visible = true;
            }

            // Safe material handling (child.material can be an array for multi-primitive meshes like body)
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material = child.material.map(m => m.clone());
              } else {
                child.material = child.material.clone();
              }

              // Style suit jacket into chic navy/charcoal blazer
              if (name.includes('suit')) {
                const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                mat.color.setHex(0x232733);
                mat.roughness = 0.5;
              }
              // Style inner top into sleek dark top
              if (name.includes('shirt')) {
                const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                mat.color.setHex(0x1a1a20);
                mat.roughness = 0.6;
              }
              // Style pants into sleek dark streetwear trousers
              if (name.includes('pants')) {
                const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                mat.color.setHex(0x1e2029);
                mat.roughness = 0.55;
              }
              // Style shoes into sleek black boots
              if (name.includes('shoes')) {
                const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                mat.color.setHex(0x121215);
                mat.roughness = 0.35;
              }
            }
          }
        });

        mapBones(model, leftBonesRef);

        // Lower arms naturally down from raw T-pose into relaxed idle posture
        if (leftBonesRef.current.leftArm) {
          leftBonesRef.current.leftArm.rotation.z = -1.25;
          leftBonesRef.current.leftArm.rotation.x = 0.15;
        }
        if (leftBonesRef.current.rightArm) {
          leftBonesRef.current.rightArm.rotation.z = 1.25;
          leftBonesRef.current.rightArm.rotation.x = 0.15;
        }

        scene.add(model);
        leftModelRef.current = model;
        checkAllLoaded();
      },
      undefined,
      (err) => {
        console.warn('Could not load female 3D GLB:', err);
        checkAllLoaded();
      }
    );

    // Load Right Model (Male Avatar / User)
    // Scale: 0.98 -> Height 1.825m (Naturally ~14cm taller than female avatar!)
    loader.load(
      maleGlb,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0.44, 0.08, 0);
        model.scale.set(0.98, 0.98, 0.98);

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map(m => m.clone());
            } else {
              child.material = child.material.clone();
            }

            const name = child.name.toLowerCase();
            // Style top into dark charcoal streetwear shirt
            if (name.includes('top')) {
              const mat = Array.isArray(child.material) ? child.material[0] : child.material;
              mat.color.setHex(0x181a24);
              mat.roughness = 0.55;
            }
            // Style bottom into dark indigo denim
            if (name.includes('bottom')) {
              const mat = Array.isArray(child.material) ? child.material[0] : child.material;
              mat.color.setHex(0x2d3e52);
              mat.roughness = 0.65;
            }
            // Style shoes into black streetwear sneakers
            if (name.includes('footwear')) {
              const mat = Array.isArray(child.material) ? child.material[0] : child.material;
              mat.color.setHex(0x141418);
              mat.roughness = 0.4;
            }
          }
        });

        mapBones(model, rightBonesRef);
        scene.add(model);
        rightModelRef.current = model;
        checkAllLoaded();
      },
      undefined,
      (err) => {
        console.warn('Could not load male 3D GLB:', err);
        checkAllLoaded();
      }
    );

    // 9. MOUSE & TOUCH TRACKING FOR 3D HEAD LOOK-AT
    const handlePointerMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = THREE.MathUtils.clamp(x, -1, 1);
      mouseRef.current.targetY = THREE.MathUtils.clamp(y, -1, 1);
    };

    mount.addEventListener('pointermove', handlePointerMove);

    // 10. ANIMATION & RENDER LOOP WITH SKELETAL EMOTE ANIMATIONS
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, mouseRef.current.targetX, 0.08);
      mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, mouseRef.current.targetY, 0.08);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      const currentEmote = emoteStateRef.current.current;
      const emoteProgress = currentEmote
        ? Math.min((performance.now() - emoteStateRef.current.startTime) / emoteStateRef.current.duration, 1.0)
        : 0;

      // Update Controls
      controls.autoRotate = isRotating;
      controls.update();

      const leftModel = leftModelRef.current;
      const rightModel = rightModelRef.current;
      const leftBones = leftBonesRef.current;
      const rightBones = rightBonesRef.current;

      if (leftModel && rightModel) {
        // Natural idle breathing physics
        const idleBreathing = Math.sin(elapsedTime * 2.2) * 0.005;
        const idleSway = Math.sin(elapsedTime * 1.5) * 0.03;

        // -----------------------------------------------------------------
        // SKELETAL EMOTE ANIMATIONS
        // -----------------------------------------------------------------
        if (currentEmote === 'clink' && emoteProgress < 1.0) {
          // Toast Coffee ☕: Step toward center, raise inner arms, bring cups together
          const env = Math.sin(emoteProgress * Math.PI);

          leftModel.position.x = THREE.MathUtils.lerp(-0.44, -0.32, env);
          rightModel.position.x = THREE.MathUtils.lerp(0.44, 0.32, env);
          leftModel.rotation.y = THREE.MathUtils.lerp(0, 0.32, env);
          rightModel.rotation.y = THREE.MathUtils.lerp(0, -0.32, env);

          // Female raises right arm to clink cup
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.x = THREE.MathUtils.lerp(0.15, -1.1, env);
            leftBones.rightArm.rotation.z = THREE.MathUtils.lerp(1.25, 0.55, env);
            leftBones.rightArm.rotation.y = THREE.MathUtils.lerp(0, -0.25, env);
          }
          if (leftBones.rightForeArm) {
            leftBones.rightForeArm.rotation.y = THREE.MathUtils.lerp(0, 0.75, env);
          }
          if (leftBones.head) {
            leftBones.head.rotation.y = THREE.MathUtils.lerp(0, 0.25, env);
            leftBones.head.rotation.x = THREE.MathUtils.lerp(0, 0.1, env);
          }

          // Male raises left arm to clink cup
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.x = THREE.MathUtils.lerp(0, -1.1, env);
            rightBones.leftArm.rotation.z = THREE.MathUtils.lerp(0, -0.55, env);
            rightBones.leftArm.rotation.y = THREE.MathUtils.lerp(0, 0.25, env);
          }
          if (rightBones.leftForeArm) {
            rightBones.leftForeArm.rotation.y = THREE.MathUtils.lerp(0, -0.75, env);
          }
          if (rightBones.head) {
            rightBones.head.rotation.y = THREE.MathUtils.lerp(0, -0.25, env);
            rightBones.head.rotation.x = THREE.MathUtils.lerp(0, 0.1, env);
          }

        } else if (currentEmote === 'kiss' && emoteProgress < 1.0) {
          // Blow Kiss 💕: Female brings hand to lips and reaches; Male puts hand on heart
          const env = Math.sin(emoteProgress * Math.PI);

          leftModel.position.x = THREE.MathUtils.lerp(-0.44, -0.34, env);
          rightModel.position.x = THREE.MathUtils.lerp(0.44, 0.34, env);
          leftModel.rotation.y = THREE.MathUtils.lerp(0, 0.35, env);
          rightModel.rotation.y = THREE.MathUtils.lerp(0, -0.35, env);

          // Female hand to lips then extends kiss
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.x = THREE.MathUtils.lerp(0.15, -1.35, env);
            leftBones.rightArm.rotation.z = THREE.MathUtils.lerp(1.25, 0.35, env);
          }
          if (leftBones.rightForeArm) {
            leftBones.rightForeArm.rotation.x = THREE.MathUtils.lerp(0, -0.9, env);
            leftBones.rightForeArm.rotation.z = THREE.MathUtils.lerp(0, 0.7, env);
          }
          if (leftBones.head) {
            leftBones.head.rotation.z = THREE.MathUtils.lerp(0, 0.18, env);
            leftBones.head.rotation.y = THREE.MathUtils.lerp(0, 0.25, env);
          }

          // Male hand over heart, touched by love
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.x = THREE.MathUtils.lerp(0, -0.95, env);
            rightBones.leftArm.rotation.z = THREE.MathUtils.lerp(0, -0.35, env);
          }
          if (rightBones.leftForeArm) {
            rightBones.leftForeArm.rotation.z = THREE.MathUtils.lerp(0, -0.9, env);
          }
          if (rightBones.spine) {
            rightBones.spine.rotation.x = THREE.MathUtils.lerp(0, -0.1, env);
          }
          if (rightBones.head) {
            rightBones.head.rotation.y = THREE.MathUtils.lerp(0, -0.28, env);
            rightBones.head.rotation.z = THREE.MathUtils.lerp(0, -0.1, env);
          }

        } else if (currentEmote === 'dance' && emoteProgress < 1.0) {
          // Dance Party 💃: Rhythmic beat bounce, spine swaying, dynamic arm pumps
          const beat = Math.sin(elapsedTime * 10);
          const beatCos = Math.cos(elapsedTime * 10);
          const bounce = Math.abs(beat) * 0.04;

          leftModel.position.y = 0.08 + bounce;
          rightModel.position.y = 0.08 + Math.abs(Math.sin(elapsedTime * 10 + 0.5)) * 0.04;

          if (leftBones.spine) leftBones.spine.rotation.z = beat * 0.14;
          if (rightBones.spine) rightBones.spine.rotation.z = -beat * 0.12;

          // Female dance arms
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.z = -1.2 + beat * 0.45;
            leftBones.leftArm.rotation.x = 0.15 + beatCos * 0.35;
          }
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.z = 1.2 - beat * 0.45;
            leftBones.rightArm.rotation.x = 0.15 - beatCos * 0.35;
          }
          if (leftBones.head) {
            leftBones.head.rotation.y = beat * 0.2;
            leftBones.head.rotation.z = -beat * 0.1;
          }

          // Male dance arms
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.x = -0.6 + beatCos * 0.35;
            rightBones.leftArm.rotation.z = -0.5 + beat * 0.3;
          }
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.x = -0.6 - beatCos * 0.35;
            rightBones.rightArm.rotation.z = 0.5 - beat * 0.3;
          }
          if (rightBones.head) {
            rightBones.head.rotation.x = 0.1 + bounce * 2;
          }

        } else if (currentEmote === 'wave' && emoteProgress < 1.0) {
          // Wave Hello 👋: Male waves right arm, Female waves left arm
          const env = Math.sin(emoteProgress * Math.PI);
          const waveCycle = Math.sin(elapsedTime * 14);

          // Male waves right arm
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.z = THREE.MathUtils.lerp(0, -2.35, env);
            rightBones.rightArm.rotation.x = THREE.MathUtils.lerp(0, -0.25, env);
          }
          if (rightBones.rightForeArm) {
            rightBones.rightForeArm.rotation.z = (waveCycle * 0.45) * env;
          }
          if (rightBones.head) {
            rightBones.head.rotation.z = THREE.MathUtils.lerp(0, 0.1, env);
          }

          // Female waves left arm
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.z = THREE.MathUtils.lerp(-1.25, 2.3, env);
            leftBones.leftArm.rotation.x = THREE.MathUtils.lerp(0.15, -0.25, env);
          }
          if (leftBones.leftForeArm) {
            leftBones.leftForeArm.rotation.z = (-Math.sin(elapsedTime * 14 + 0.4) * 0.4) * env;
          }
          if (leftBones.head) {
            leftBones.head.rotation.z = THREE.MathUtils.lerp(0, -0.12, env);
          }

        } else {
          // -----------------------------------------------------------------
          // NATURAL RELAXED IDLE POSTURE & CURSOR TRACKING
          // -----------------------------------------------------------------
          leftModel.position.x = THREE.MathUtils.lerp(leftModel.position.x, -0.44, 0.1);
          rightModel.position.x = THREE.MathUtils.lerp(rightModel.position.x, 0.44, 0.1);
          leftModel.position.y = 0.08 + idleBreathing;
          rightModel.position.y = 0.08 + Math.sin(elapsedTime * 2.2 + 0.4) * 0.005;

          leftModel.rotation.y = THREE.MathUtils.lerp(leftModel.rotation.y, 0, 0.1);
          rightModel.rotation.y = THREE.MathUtils.lerp(rightModel.rotation.y, 0, 0.1);
          leftModel.rotation.z = THREE.MathUtils.lerp(leftModel.rotation.z, 0, 0.1);
          rightModel.rotation.z = THREE.MathUtils.lerp(rightModel.rotation.z, 0, 0.1);

          // Female arms relaxed at sides (lowered down from T-pose)
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.z = THREE.MathUtils.lerp(leftBones.leftArm.rotation.z, -1.25 + idleSway, 0.1);
            leftBones.leftArm.rotation.x = THREE.MathUtils.lerp(leftBones.leftArm.rotation.x, 0.15, 0.1);
            leftBones.leftArm.rotation.y = THREE.MathUtils.lerp(leftBones.leftArm.rotation.y, 0, 0.1);
          }
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.z = THREE.MathUtils.lerp(leftBones.rightArm.rotation.z, 1.25 - idleSway, 0.1);
            leftBones.rightArm.rotation.x = THREE.MathUtils.lerp(leftBones.rightArm.rotation.x, 0.15, 0.1);
            leftBones.rightArm.rotation.y = THREE.MathUtils.lerp(leftBones.rightArm.rotation.y, 0, 0.1);
          }
          if (leftBones.leftForeArm) leftBones.leftForeArm.rotation.set(0, 0, 0);
          if (leftBones.rightForeArm) leftBones.rightForeArm.rotation.set(0, 0, 0);
          if (leftBones.spine) leftBones.spine.rotation.set(0, 0, 0);

          // Male arms in natural rest pose
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.x = THREE.MathUtils.lerp(rightBones.leftArm.rotation.x, 0, 0.1);
            rightBones.leftArm.rotation.y = THREE.MathUtils.lerp(rightBones.leftArm.rotation.y, 0, 0.1);
            rightBones.leftArm.rotation.z = THREE.MathUtils.lerp(rightBones.leftArm.rotation.z, 0, 0.1);
          }
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.x = THREE.MathUtils.lerp(rightBones.rightArm.rotation.x, 0, 0.1);
            rightBones.rightArm.rotation.y = THREE.MathUtils.lerp(rightBones.rightArm.rotation.y, 0, 0.1);
            rightBones.rightArm.rotation.z = THREE.MathUtils.lerp(rightBones.rightArm.rotation.z, 0, 0.1);
          }
          if (rightBones.leftForeArm) rightBones.leftForeArm.rotation.set(0, 0, 0);
          if (rightBones.rightForeArm) rightBones.rightForeArm.rotation.set(0, 0, 0);
          if (rightBones.spine) rightBones.spine.rotation.set(0, 0, 0);

          // Dynamic 3D Head Tracking toward cursor in idle
          if (leftBones.head) {
            leftBones.head.rotation.y = THREE.MathUtils.lerp(
              leftBones.head.rotation.y,
              mouseX * 0.35 + 0.08,
              0.08
            );
            leftBones.head.rotation.x = THREE.MathUtils.lerp(
              leftBones.head.rotation.x,
              -mouseY * 0.2,
              0.08
            );
            leftBones.head.rotation.z = THREE.MathUtils.lerp(leftBones.head.rotation.z, 0, 0.1);
          }

          if (rightBones.head) {
            rightBones.head.rotation.y = THREE.MathUtils.lerp(
              rightBones.head.rotation.y,
              mouseX * 0.35 - 0.08,
              0.08
            );
            rightBones.head.rotation.x = THREE.MathUtils.lerp(
              rightBones.head.rotation.x,
              -mouseY * 0.2,
              0.08
            );
            rightBones.head.rotation.z = THREE.MathUtils.lerp(rightBones.head.rotation.z, 0, 0.1);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. RESIZE HANDLER
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 12. CLEANUP
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      mount.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      controls.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [isRotating, partnerGlbUrl, myGlbUrl, localMyGlb, localPartnerGlb]);

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

      {/* 1. REAL 3D WEBGL STAGE VIEWPORT (Sleek Dark Luxury Studio Atmosphere) */}
      <div className="relative w-full aspect-[9/14] sm:aspect-[9/13] min-h-[520px] sm:min-h-[580px] max-h-[660px] rounded-[38px] overflow-hidden bg-gradient-to-b from-[#141a29] via-[#0d121f] to-[#07090e] border-2 border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        
        {/* Three.js WebGL Canvas Mount */}
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
              Loading Real 3D GLB Characters... ✨
            </span>
          </div>
        )}

        {/* Top Floating Controls Dock */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          
          {/* Badge */}
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-white shadow-xl pointer-events-auto">
            <Box size={14} className="text-amber-400" />
            <span className="text-xs font-black tracking-tight">Real 3D WebGL</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            
            {/* Custom .glb Model Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-xl transition-all active:scale-95"
              title="Upload your custom 3D model (.glb)"
            >
              <Upload size={14} className="text-amber-400" />
            </button>

            {/* 360° Auto-Rotate Toggle */}
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 ${
                isRotating ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-black/60 text-white'
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

            {/* 3D Avatar Creator from Selfie / Scratch */}
            <button
              onClick={onOpenCreator}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-xl border border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
              title="Create custom 3D avatar from selfie or scratch"
            >
              <Sparkles size={13} className="text-yellow-300" />
              <span>Customize 3D</span>
            </button>
          </div>
        </div>

        {/* BOTTOM PILL BADGE (@ neha_xmusic - Click to Copy) */}
        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center pointer-events-none z-20">
          <button
            onClick={handleCopyHandle}
            className="pointer-events-auto group flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-black text-xs px-4 py-2 rounded-full border border-white/20 shadow-2xl active:scale-95 transition-all"
            title="Click to copy handle"
          >
            <span className="text-amber-400">💛</span>
            <span>{partnerHandle}</span>
            {copiedHandle ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300" />
            )}
          </button>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Drag to rotate 360° • Pinch to zoom • Tap to animate
          </p>
        </div>
      </div>

      {/* 2. REACTION EMOTE DOCK */}
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

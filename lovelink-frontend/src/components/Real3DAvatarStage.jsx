import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  RotateCw, Sparkles, Heart, Coffee, 
  Music, Upload, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// High-Quality Default Ready Player Me 3D Humanoid Models (.glb)
const DEFAULT_FEMALE_GLB = 'https://models.readyplayer.me/62ea7bc28a6d28ec134bbcce.glb?meshLod=1&textureAtlas=1024&quality=medium';
const DEFAULT_MALE_GLB = 'https://models.readyplayer.me/646dd3d70cc52f671393b4ff.glb?meshLod=1&textureAtlas=1024&quality=medium';

export default function Real3DAvatarStage({
  myGlbUrl,
  partnerGlbUrl,
  myName = 'Me',
  partnerName = 'Neha',
  onOpenCreator,
  className = '',
}) {
  const mountRef = useRef(null);
  const fileInputRef = useRef(null);
  const [activeEmote, setActiveEmote] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Custom Local Overrides (if user uploads a .glb file)
  const [localMyGlb, setLocalMyGlb] = useState(null);
  const [localPartnerGlb] = useState(null);

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);

  // 3D Models and Bones
  const partnerModelRef = useRef(null);
  const userModelRef = useRef(null);
  const partnerBonesRef = useRef({ head: null, neck: null, rightArm: null, leftArm: null, spine: null });
  const userBonesRef = useRef({ head: null, neck: null, rightArm: null, leftArm: null, spine: null });

  // Mouse & Animation Timing
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const emoteStateRef = useRef({
    current: null,
    startTime: 0,
    duration: 3000,
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
      toast.success('Dancing in 3D! 💃🎶');
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

  // Handle Local .glb Upload
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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setIsLoadingModels(true);

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || 400;
    const height = mount.clientHeight || 550;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.35, 3.8);
    cameraRef.current = camera;

    // 2. HIGH-PERFORMANCE WEBGL RENDERER
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

    // 3. STUDIO LIGHTING (Warm Key + Cool Fill + Rim)
    const ambientLight = new THREE.AmbientLight(0xfffbf0, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.5);
    keyLight.position.set(2.5, 4.0, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
    fillLight.position.set(-2.5, 3.0, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 1.6);
    rimLight.position.set(0, 3.5, -3.0);
    scene.add(rimLight);

    // 4. CIRCULAR 3D STUDIO PODIUM & GROUND SHADOW
    const podiumGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.1, 64);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.35,
      metalness: 0.25,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(0, 0, 0);
    podium.receiveShadow = true;
    scene.add(podium);

    // Neon Accent Ring
    const ringGeo = new THREE.TorusGeometry(1.52, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.05, 0);
    scene.add(ring);

    // 5. 360° ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableZoom = true;
    controls.minDistance = 2.0;
    controls.maxDistance = 5.5;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 1.0;
    controls.target.set(0, 1.0, 0);
    controls.minPolarAngle = Math.PI / 2.3;
    controls.maxPolarAngle = Math.PI / 1.85;

    // Helper to find bones for head tracking & gestures
    const mapCharacterBones = (model, bonesRef) => {
      model.traverse((child) => {
        if (child.isBone) {
          const name = child.name.toLowerCase();
          if (name.includes('head')) bonesRef.current.head = child;
          if (name.includes('neck')) bonesRef.current.neck = child;
          if (name.includes('spine') || name.includes('chest')) bonesRef.current.spine = child;
          if (name.includes('rightarm') || name.includes('rightshoulder')) bonesRef.current.rightArm = child;
          if (name.includes('leftarm') || name.includes('leftshoulder')) bonesRef.current.leftArm = child;
        }
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = Math.max(child.material.roughness || 0.5, 0.35);
          }
        }
      });
    };

    // 6. LOAD REAL 3D HUMAN CHARACTERS (.GLB)
    const loader = new GLTFLoader();
    let isCancelled = false;

    const femaleGlbToLoad = localPartnerGlb || partnerGlbUrl || DEFAULT_FEMALE_GLB;
    const maleGlbToLoad = localMyGlb || myGlbUrl || DEFAULT_MALE_GLB;

    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2 && !isCancelled) {
        setIsLoadingModels(false);
      }
    };

    // Load Female 3D Character (Neha)
    loader.load(
      femaleGlbToLoad,
      (gltf) => {
        if (isCancelled) return;
        const model = gltf.scene;
        model.position.set(-0.55, 0.05, 0);
        model.scale.set(1, 1, 1);
        partnerModelRef.current = model;
        mapCharacterBones(model, partnerBonesRef);
        scene.add(model);
        checkAllLoaded();
      },
      undefined,
      (err) => {
        console.warn('Could not load female 3D model, retrying fallback:', err);
        checkAllLoaded();
      }
    );

    // Load Male 3D Character (User)
    loader.load(
      maleGlbToLoad,
      (gltf) => {
        if (isCancelled) return;
        const model = gltf.scene;
        model.position.set(0.55, 0.05, 0);
        model.scale.set(1, 1, 1);
        userModelRef.current = model;
        mapCharacterBones(model, userBonesRef);
        scene.add(model);
        checkAllLoaded();
      },
      undefined,
      (err) => {
        console.warn('Could not load male 3D model, retrying fallback:', err);
        checkAllLoaded();
      }
    );

    // 7. MOUSE / TOUCH TRACKING FOR 3D HEAD LOOK-AT
    const handlePointerMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = Math.max(-1, Math.min(1, x));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, y));
    };

    mount.addEventListener('pointermove', handlePointerMove);

    // 8. 60FPS ANIMATION LOOP (IDLE BREATHING + GESTURES + HEAD LOOK-AT)
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

        // Both characters smoothly turn head & neck to look at cursor
        bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetYaw, 0.1);
        bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, targetPitch, 0.1);

        if (bones.spine) {
          bones.spine.position.y = breath;
        }
      });

      // Procedural Reaction Emotes
      const currentEmote = emoteStateRef.current.current;
      const emoteTime = (performance.now() - emoteStateRef.current.startTime) / 1000;

      if (currentEmote === 'wave') {
        const waveAngle = Math.sin(emoteTime * 12) * 0.4;
        if (userBonesRef.current.rightArm) {
          userBonesRef.current.rightArm.rotation.z = -1.6 + waveAngle;
        }
        if (partnerBonesRef.current.leftArm) {
          partnerBonesRef.current.leftArm.rotation.z = 1.6 - waveAngle;
        }
      } else if (currentEmote === 'dance') {
        const danceSway = Math.sin(emoteTime * 6) * 0.18;
        const bounce = Math.abs(Math.sin(emoteTime * 6)) * 0.05;
        if (partnerModelRef.current) {
          partnerModelRef.current.position.y = 0.05 + bounce;
          partnerModelRef.current.rotation.z = danceSway;
        }
        if (userModelRef.current) {
          userModelRef.current.position.y = 0.05 + bounce;
          userModelRef.current.rotation.z = -danceSway;
        }
      } else if (currentEmote === 'kiss') {
        // Lean in towards each other
        if (partnerModelRef.current) {
          partnerModelRef.current.rotation.z = THREE.MathUtils.lerp(partnerModelRef.current.rotation.z, 0.12, 0.05);
        }
        if (userModelRef.current) {
          userModelRef.current.rotation.z = THREE.MathUtils.lerp(userModelRef.current.rotation.z, -0.12, 0.05);
        }
      } else if (currentEmote === 'clink') {
        const toastLift = Math.sin(Math.min(emoteTime * 3, Math.PI)) * 0.4;
        if (partnerBonesRef.current.rightArm) {
          partnerBonesRef.current.rightArm.rotation.x = -toastLift;
        }
        if (userBonesRef.current.leftArm) {
          userBonesRef.current.leftArm.rotation.x = -toastLift;
        }
      } else {
        // Reset to neutral pose
        if (partnerModelRef.current) {
          partnerModelRef.current.position.y = 0.05;
          partnerModelRef.current.rotation.z = THREE.MathUtils.lerp(partnerModelRef.current.rotation.z, 0, 0.1);
        }
        if (userModelRef.current) {
          userModelRef.current.position.y = 0.05;
          userModelRef.current.rotation.z = THREE.MathUtils.lerp(userModelRef.current.rotation.z, 0, 0.1);
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
  }, [myGlbUrl, partnerGlbUrl, localMyGlb, localPartnerGlb, isRotating]);

  return (
    <div className={`relative flex flex-col items-center w-full max-w-xl mx-auto select-none ${className}`}>
      
      {/* Hidden File Input for Custom .glb Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. REAL THREE.JS WEBGL 3D VIEWPORT */}
      <div className="relative w-full aspect-[9/13] sm:aspect-[9/12] min-h-[500px] sm:min-h-[580px] max-h-[640px] rounded-[36px] overflow-hidden bg-gradient-to-b from-[#0b0e17] via-[#121724] to-[#0a0d14] border-2 border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        
        {/* 3D WebGL Canvas Mount */}
        <div
          ref={mountRef}
          onClick={() => triggerEmote('clink')}
          className="cursor-grab active:cursor-grabbing w-full h-full"
          title="Drag to rotate 360° • Pinch to zoom • Tap to toast"
        />

        {/* Loading Spinner */}
        {isLoadingModels && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm z-30 pointer-events-none">
            <RefreshCw className="animate-spin text-amber-400" size={32} />
            <span className="text-xs font-bold text-slate-200 bg-black/70 px-3 py-1 rounded-full border border-white/10">
              Loading Real 3D Characters...
            </span>
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-2 bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black tracking-tight">Real 3D WebGL</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Custom .glb Model Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 shadow-xl transition-all active:scale-95"
              title="Upload custom 3D model (.glb)"
            >
              <Upload size={14} className="text-amber-400" />
            </button>

            {/* 360° Auto-Rotate Toggle */}
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-full backdrop-blur-md border border-white/15 shadow-xl transition-all active:scale-95 ${
                isRotating ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-black/60 text-white'
              }`}
              title={isRotating ? 'Pause Auto-Spin' : 'Auto-Spin 360°'}
            >
              <RotateCw size={14} className={isRotating ? 'animate-spin' : ''} />
            </button>

            {/* 3D Selfie Creator */}
            <button
              onClick={onOpenCreator}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-xl border border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
              title="Take a selfie to generate your personal 3D avatar"
            >
              <Sparkles size={13} className="text-yellow-300" />
              <span>3D Selfie</span>
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

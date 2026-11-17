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

  // Custom Local Overrides (if user uploads a .glb file)
  const [localMyGlb, setLocalMyGlb] = useState(null);
  const [localPartnerGlb] = useState(null);

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Character Models and Bones
  const leftModelRef = useRef(null);
  const rightModelRef = useRef(null);
  const leftBonesRef = useRef({ head: null, neck: null, leftArm: null, rightArm: null, spine: null });
  const rightBonesRef = useRef({ head: null, neck: null, leftArm: null, rightArm: null, spine: null });

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
      // Audio muted
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

    // 3. WEBGL RENDERER (Alpha enabled so sleek CSS radial backdrop shines through)
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
          if (name === 'spine' || name === 'spine1' || name === 'spine2') bonesRef.current.spine = child;
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
    // Scale: 1.22 to make equal height with male avatar
    // All meshes visible so arms, jacket, hands, and hair are intact
    loader.load(
      femaleGlb,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(-0.44, 0.08, 0);
        model.scale.set(1.22, 1.22, 1.22);
        
        // Ensure hands, arms, and clothes are 100% visible
        model.traverse((child) => {
          if (child.isMesh) {
            child.visible = true;
            if (child.material) {
              child.material.roughness = Math.max(child.material.roughness || 0.5, 0.35);
            }
          }
        });

        mapBones(model, leftBonesRef);
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
    // Scale: 0.93 to match 1.75m equal height
    loader.load(
      maleGlb,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0.44, 0.08, 0);
        model.scale.set(0.93, 0.93, 0.93);

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.roughness = Math.max(child.material.roughness || 0.5, 0.35);
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

    // 10. ANIMATION & RENDER LOOP
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
        ? (performance.now() - emoteStateRef.current.startTime) / emoteStateRef.current.duration
        : 0;

      // Update Controls
      controls.autoRotate = isRotating;
      controls.update();

      // --- ANIMATE REAL 3D CHARACTERS ---
      const leftModel = leftModelRef.current;
      const rightModel = rightModelRef.current;

      if (leftModel && rightModel) {
        // Natural idle breathing physics
        const idleBreathing = Math.sin(elapsedTime * 2.2) * 0.006;
        leftModel.position.y = 0.08 + idleBreathing;
        rightModel.position.y = 0.08 + Math.sin(elapsedTime * 2.2 + 0.4) * 0.006;

        // Head tracking toward cursor
        if (leftBonesRef.current.head) {
          leftBonesRef.current.head.rotation.y = THREE.MathUtils.lerp(
            leftBonesRef.current.head.rotation.y,
            mouseX * 0.35,
            0.08
          );
          leftBonesRef.current.head.rotation.x = THREE.MathUtils.lerp(
            leftBonesRef.current.head.rotation.x,
            -mouseY * 0.2,
            0.08
          );
        }

        if (rightBonesRef.current.head) {
          rightBonesRef.current.head.rotation.y = THREE.MathUtils.lerp(
            rightBonesRef.current.head.rotation.y,
            mouseX * 0.35,
            0.08
          );
          rightBonesRef.current.head.rotation.x = THREE.MathUtils.lerp(
            rightBonesRef.current.head.rotation.x,
            -mouseY * 0.2,
            0.08
          );
        }

        // EMOTE OVERRIDES
        if (currentEmote === 'clink' && emoteProgress < 1.0) {
          const envelope = Math.sin(emoteProgress * Math.PI);
          leftModel.position.x = THREE.MathUtils.lerp(-0.44, -0.28, envelope);
          rightModel.position.x = THREE.MathUtils.lerp(0.44, 0.28, envelope);
          leftModel.rotation.z = envelope * 0.08;
          rightModel.rotation.z = -envelope * 0.08;
        } else if (currentEmote === 'kiss' && emoteProgress < 1.0) {
          const envelope = Math.sin(emoteProgress * Math.PI);
          leftModel.position.x = THREE.MathUtils.lerp(-0.44, -0.30, envelope);
          rightModel.position.x = THREE.MathUtils.lerp(0.44, 0.30, envelope);
          leftModel.rotation.z = envelope * 0.06;
          rightModel.rotation.z = -envelope * 0.06;
        } else if (currentEmote === 'dance' && emoteProgress < 1.0) {
          const bounce = Math.abs(Math.sin(elapsedTime * 9)) * 0.05;
          const tilt = Math.sin(elapsedTime * 9) * 0.1;
          leftModel.position.y += bounce;
          rightModel.position.y += Math.abs(Math.sin(elapsedTime * 9 + 0.4)) * 0.05;
          leftModel.rotation.z = tilt;
          rightModel.rotation.z = -tilt;
        } else if (currentEmote === 'wave' && emoteProgress < 1.0) {
          if (rightBonesRef.current.rightArm) {
            rightBonesRef.current.rightArm.rotation.z = Math.sin(elapsedTime * 12) * 0.3 - 0.5;
          }
        } else {
          // Reset transforms smoothly
          leftModel.position.x = THREE.MathUtils.lerp(leftModel.position.x, -0.44, 0.1);
          rightModel.position.x = THREE.MathUtils.lerp(rightModel.position.x, 0.44, 0.1);
          leftModel.rotation.z = THREE.MathUtils.lerp(leftModel.rotation.z, 0, 0.1);
          rightModel.rotation.z = THREE.MathUtils.lerp(rightModel.rotation.z, 0, 0.1);
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
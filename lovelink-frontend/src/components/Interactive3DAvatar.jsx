import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Sparkles, RefreshCw, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

// Default Ready Player Me Fallback Models if user has not yet customized their own
const DEFAULT_RPM_AVATAR = 'https://models.readyplayer.me/646dd3d70cc52f671393b4ff.glb?meshLod=1&textureAtlas=1024&quality=medium';

export default function Interactive3DAvatar({
  glbUrl,
  name = 'Avatar',
  size = 280,
  showEmotes = true,
  onOpenCreator,
  className = '',
}) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentReaction, setCurrentReaction] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // References for Three.js state
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const headBoneRef = useRef(null);
  const neckBoneRef = useRef(null);
  const rightArmBoneRef = useRef(null);
  const leftArmBoneRef = useRef(null);
  const spineBoneRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animStateRef = useRef({
    time: 0,
    reaction: null,
    reactionStartTime: 0,
  });

  // Handle direct tap/click on avatar to trigger reaction
  const triggerReaction = useCallback((type = 'wave') => {
    animStateRef.current.reaction = type;
    animStateRef.current.reactionStartTime = performance.now();
    setCurrentReaction(type);

    if (type === 'kiss') {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF'],
      });
    } else if (type === 'dance') {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#3B82F6', '#10B981'],
      });
    } else if (type === 'wave') {
      confetti({
        particleCount: 20,
        spread: 45,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24'],
      });
    }

    setTimeout(() => {
      animStateRef.current.reaction = null;
      setCurrentReaction(null);
    }, 2400);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setLoading(true);
    setLoadError(false);

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || size;
    const height = mount.clientHeight || size * 1.35;

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 2.7);

    // 2. RENDERER with transparent background & soft tone mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 3. STUDIO LIGHTING (Warm Key + Cool Fill + Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(1.5, 2.5, 2.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xebf4ff, 1.0);
    fillLight.position.set(-1.5, 1.8, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe4e6, 1.2);
    rimLight.position.set(0, 2.0, -2.0);
    scene.add(rimLight);

    // 4. ORBIT CONTROLS (Locked to Horizontal Y-Axis Rotation - Snapchat Style)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.0, 0);
    // Lock vertical rotation to eye-level
    controls.minPolarAngle = Math.PI / 2.05;
    controls.maxPolarAngle = Math.PI / 1.95;

    // 5. LOAD READY PLAYER ME 3D MODEL (.GLB)
    const modelToLoad = glbUrl || DEFAULT_RPM_AVATAR;
    const loader = new GLTFLoader();

    let isCancelled = false;

    loader.load(
      modelToLoad,
      (gltf) => {
        if (isCancelled) return;
        const model = gltf.scene;
        modelRef.current = model;

        // Center and scale model
        model.position.set(0, 0, 0);

        // Find bones for head tracking & procedural gestures
        model.traverse((child) => {
          if (child.isBone) {
            const boneName = child.name.toLowerCase();
            if (boneName.includes('head')) headBoneRef.current = child;
            if (boneName.includes('neck')) neckBoneRef.current = child;
            if (boneName.includes('spine') || boneName.includes('chest')) spineBoneRef.current = child;
            if (boneName.includes('rightarm') || boneName.includes('rightshoulder')) rightArmBoneRef.current = child;
            if (boneName.includes('leftarm') || boneName.includes('leftshoulder')) leftArmBoneRef.current = child;
          }
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = Math.max(child.material.roughness, 0.4);
            }
          }
        });

        scene.add(model);
        setLoading(false);
      },
      undefined,
      (error) => {
        if (isCancelled) return;
        console.warn('Could not load 3D GLB model:', error);
        setLoadError(true);
        setLoading(false);
      }
    );

    // 6. HEAD & EYE CURSOR TRACKING
    const handlePointerMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
    };

    const handlePointerLeave = () => {
      mouseRef.current = { x: 0, y: 0 };
    };

    mount.addEventListener('pointermove', handlePointerMove);
    mount.addEventListener('pointerleave', handlePointerLeave);

    // 7. RENDER & PROCEDURAL ANIMATION LOOP
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();
      controls.update();

      // Smooth Head Tracking towards cursor
      const targetHeadYaw = mouseRef.current.x * 0.45; // Turn left/right
      const targetHeadPitch = -mouseRef.current.y * 0.3; // Look up/down

      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = THREE.MathUtils.lerp(
          headBoneRef.current.rotation.y,
          targetHeadYaw,
          0.1
        );
        headBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          headBoneRef.current.rotation.x,
          targetHeadPitch,
          0.1
        );
      }

      if (neckBoneRef.current) {
        neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(
          neckBoneRef.current.rotation.y,
          targetHeadYaw * 0.5,
          0.08
        );
      }

      // Natural Breathing Loop
      const breath = Math.sin(elapsedTime * 2.2) * 0.015;
      if (spineBoneRef.current) {
        spineBoneRef.current.position.y = breath;
      }

      // Procedural Reaction Gestures
      const activeReaction = animStateRef.current.reaction;
      const elapsedReaction = (performance.now() - animStateRef.current.reactionStartTime) / 1000;

      if (activeReaction === 'wave' && rightArmBoneRef.current) {
        // Raise arm and wave
        const waveAngle = Math.sin(elapsedReaction * 10) * 0.35;
        rightArmBoneRef.current.rotation.z = THREE.MathUtils.lerp(
          rightArmBoneRef.current.rotation.z,
          -1.6 + waveAngle,
          0.15
        );
      } else if (activeReaction === 'dance') {
        // Dance bounce & sway
        if (modelRef.current) {
          modelRef.current.position.y = Math.abs(Math.sin(elapsedReaction * 6)) * 0.06;
          modelRef.current.rotation.y = Math.sin(elapsedReaction * 4) * 0.25;
        }
      } else if (activeReaction === 'kiss') {
        // Sweet lean forward
        if (headBoneRef.current) {
          headBoneRef.current.rotation.x = THREE.MathUtils.lerp(
            headBoneRef.current.rotation.x,
            0.25,
            0.1
          );
        }
      } else {
        // Return arms to relaxed neutral position
        if (rightArmBoneRef.current) {
          rightArmBoneRef.current.rotation.z = THREE.MathUtils.lerp(
            rightArmBoneRef.current.rotation.z,
            0,
            0.08
          );
        }
        if (modelRef.current) {
          modelRef.current.position.y = THREE.MathUtils.lerp(
            modelRef.current.position.y,
            0,
            0.1
          );
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. RESIZE HANDLER
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
      mount.removeEventListener('pointerleave', handlePointerLeave);
      cancelAnimationFrame(animationFrameId);

      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [glbUrl, size]);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        onClick={() => triggerReaction(currentReaction === 'wave' ? 'dance' : 'wave')}
        className="cursor-grab active:cursor-grabbing relative overflow-hidden"
        style={{ width: size, height: size * 1.35 }}
        title="Drag to spin 360° • Tap to react"
      />

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <RefreshCw className="animate-spin text-amber-500" size={24} />
          <span className="text-[10px] text-slate-400 font-semibold bg-black/60 px-2 py-0.5 rounded-full">
            Loading 3D Mesh...
          </span>
        </div>
      )}

      {/* Load Fallback Notice */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 rounded-2xl">
          <span className="text-xl mb-1">🧍</span>
          <p className="text-[11px] font-bold text-slate-200">3D Preview</p>
          <button
            onClick={onOpenCreator}
            className="mt-2 px-3 py-1 bg-amber-500 text-stone-900 rounded-full text-[10px] font-bold"
          >
            Create in 3D Studio ✨
          </button>
        </div>
      )}

      {/* 360° Drag Hint Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] text-slate-300 border border-white/10 pointer-events-none">
        <RotateCw size={10} />
        <span>360° Spin</span>
      </div>

      {/* Name Label */}
      <div className="text-center mt-1">
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-stone-900 shadow-sm">
          {name}
        </span>
      </div>

      {/* Quick Snapchat-Style Emote Bar */}
      {showEmotes && (
        <div className="flex items-center gap-1.5 mt-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          <button
            onClick={() => triggerReaction('wave')}
            className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-xs transition-transform active:scale-90"
            title="Wave Hello"
          >
            👋
          </button>
          <button
            onClick={() => triggerReaction('kiss')}
            className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-xs transition-transform active:scale-90"
            title="Blow Sweet Kiss"
          >
            💋
          </button>
          <button
            onClick={() => triggerReaction('dance')}
            className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-xs transition-transform active:scale-90"
            title="Dance"
          >
            💃
          </button>
          <button
            onClick={onOpenCreator}
            className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm active:scale-95"
            title="Customize 3D Outfit & Face"
          >
            <Sparkles size={11} />
            <span>3D Studio</span>
          </button>
        </div>
      )}
    </div>
  );
}

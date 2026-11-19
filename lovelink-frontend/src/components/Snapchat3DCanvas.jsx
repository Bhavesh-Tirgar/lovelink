import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Sparkles, RotateCw, Heart, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Snapchat3DCanvas({
  myGlb,
  partnerGlb,
  myName = 'You',
  partnerName = 'Partner',
  onOpenCreator,
  className = '',
}) {
  const mountRef = useRef(null);
  const [activeReaction, setActiveReaction] = useState(null);
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);

  // Bones for procedural head tracking
  const myBonesRef = useRef({ head: null, neck: null, arm: null, spine: null });
  const partnerBonesRef = useRef({ head: null, neck: null, arm: null, spine: null });
  const mouseRef = useRef({ x: 0, y: 0 });
  const animTimeRef = useRef({ time: 0, reaction: null, reactionStart: 0 });

  // Reaction trigger
  const triggerReaction = useCallback((type = 'wave') => {
    animTimeRef.current.reaction = type;
    animTimeRef.current.reactionStart = performance.now();
    setActiveReaction(type);

    if (type === 'kiss' || type === 'love') {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF', '#FFE4E6'],
      });
    } else if (type === 'dance' || type === 'party') {
      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
      });
    } else if (type === 'wave') {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
      });
    }

    setTimeout(() => {
      animTimeRef.current.reaction = null;
      setActiveReaction(null);
    }, 2500);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mount.clientWidth || 360;
    const height = mount.clientHeight || 480;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 3.4);

    // 2. RENDERER (Antialiased, Transparent alpha for clean stage integration)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 3. STUDIO LIGHTING (Warm Snapchat Key + Soft Fill + Rim + Ground Bounce)
    const ambientLight = new THREE.AmbientLight(0xfffcf0, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(2, 3.5, 2.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
    fillLight.position.set(-2, 2.5, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffed4a, 1.4);
    rimLight.position.set(0, 2.5, -2.5);
    scene.add(rimLight);

    // 4. SNAPCHAT YELLOW 3D CIRCULAR PODIUM
    const podiumGeometry = new THREE.CylinderGeometry(1.4, 1.5, 0.1, 48);
    const podiumMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffc00,
      roughness: 0.25,
      metalness: 0.1,
    });
    const podium = new THREE.Mesh(podiumGeometry, podiumMaterial);
    podium.position.set(0, 0, 0);
    podium.receiveShadow = true;
    scene.add(podium);

    // Soft ground contact shadow ring
    const shadowGeo = new THREE.RingGeometry(0.3, 1.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xb58900,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = Math.PI / 2;
    shadowMesh.position.set(0, 0.055, 0);
    scene.add(shadowMesh);

    // 5. ORBIT CONTROLS (Smooth 360° Horizontal Spin)
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.0, 0);
    controls.minPolarAngle = Math.PI / 2.05;
    controls.maxPolarAngle = Math.PI / 1.95;

    // 6. LOADERS / 3D MODELS
    const loader = new GLTFLoader();
    let isCancelled = false;

    // Helper to find bones
    const mapBones = (model, targetRef) => {
      model.traverse((child) => {
        if (child.isBone) {
          const n = child.name.toLowerCase();
          if (n.includes('head')) targetRef.current.head = child;
          if (n.includes('neck')) targetRef.current.neck = child;
          if (n.includes('spine') || n.includes('chest')) targetRef.current.spine = child;
          if (n.includes('rightarm') || n.includes('rightshoulder')) targetRef.current.arm = child;
        }
        if (child.isMesh && child.material) {
          child.material.roughness = Math.max(child.material.roughness || 0.5, 0.35);
        }
      });
    };

    // Fallback stylized 3D avatar figures standing on the podium
    const createStylizedAvatarMesh = (posX, isPartner = false) => {
      const group = new THREE.Group();
      group.position.set(posX, 0.05, 0);

      // Body (Jacket / Outfit)
      const jacketColor = isPartner ? 0x8d5b4c : 0x18181b; // Partner's warm Carhartt vs User's black varsity
      const bodyGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.65, 24);
      const bodyMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.85;
      group.add(body);

      // Legs (Pants / Shorts)
      const pantsColor = isPartner ? 0x18181b : 0x93c5fd; // Partner black shorts vs User light blue jeans
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 16), new THREE.MeshStandardMaterial({ color: pantsColor }));
      legL.position.set(-0.11, 0.38, 0);
      group.add(legL);

      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 16), new THREE.MeshStandardMaterial({ color: pantsColor }));
      legR.position.set(0.11, 0.38, 0);
      group.add(legR);

      // Shoes / Boots
      const shoeColor = isPartner ? 0x111111 : 0xffffff; // Partner black boots vs User Nike kicks
      const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), new THREE.MeshStandardMaterial({ color: shoeColor }));
      shoeL.position.set(-0.11, 0.08, 0.03);
      group.add(shoeL);

      const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), new THREE.MeshStandardMaterial({ color: shoeColor }));
      shoeR.position.set(0.11, 0.08, 0.03);
      group.add(shoeR);

      // Head
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.35, 0);

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 28), skinMat);
      headGroup.add(headMesh);

      // Hair / Hat
      if (isPartner) {
        // Partner's wavy brown hair
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
        const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 24), hairMat);
        hairTop.position.set(0, 0.04, -0.02);
        headGroup.add(hairTop);

        const hairFlowL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 16), hairMat);
        hairFlowL.position.set(-0.16, -0.22, 0.02);
        headGroup.add(hairFlowL);

        const hairFlowR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 16), hairMat);
        hairFlowR.position.set(0.16, -0.22, 0.02);
        headGroup.add(hairFlowR);
      } else {
        // User's black baseball cap + sunglasses
        const capMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const capCrown = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), capMat);
        capCrown.position.set(0, 0.06, 0);
        headGroup.add(capCrown);

        const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24, 1, false, 0, Math.PI), capMat);
        capBrim.rotation.x = 0.2;
        capBrim.position.set(0, 0.04, 0.14);
        headGroup.add(capBrim);

        // Rectangular sunglasses
        const glassesMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.8 });
        const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.03), glassesMat);
        glasses.position.set(0, 0.02, 0.18);
        headGroup.add(glasses);
      }

      // Coffee Mug held in hands
      const mugMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 16), mugMat);
      mug.position.set(isPartner ? 0.18 : -0.18, 0.95, 0.24);
      group.add(mug);

      // Blue stripe on mug (matching their Snapchat sticker!)
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.025, 16), stripeMat);
      stripe.position.set(isPartner ? 0.18 : -0.18, 0.96, 0.24);
      group.add(stripe);

      group.add(headGroup);

      // Save ref for head tracking
      const targetRef = isPartner ? partnerBonesRef : myBonesRef;
      targetRef.current.head = headGroup;
      targetRef.current.spine = body;

      return group;
    };

    // If custom GLBs are provided, load them; otherwise render the custom stylized couple
    let partnerMesh = null;
    let userMesh = null;

    if (partnerGlb) {
      loader.load(partnerGlb, (gltf) => {
        if (isCancelled) return;
        partnerMesh = gltf.scene;
        partnerMesh.position.set(-0.48, 0.05, 0);
        mapBones(partnerMesh, partnerBonesRef);
        scene.add(partnerMesh);
      });
    } else {
      partnerMesh = createStylizedAvatarMesh(-0.45, true);
      scene.add(partnerMesh);
    }

    if (myGlb) {
      loader.load(myGlb, (gltf) => {
        if (isCancelled) return;
        userMesh = gltf.scene;
        userMesh.position.set(0.48, 0.05, 0);
        mapBones(userMesh, myBonesRef);
        scene.add(userMesh);
      });
    } else {
      userMesh = createStylizedAvatarMesh(0.45, false);
      scene.add(userMesh);
    }

    // 7. MOUSE / TOUCH TRACKING FOR 3D HEAD LOOK-AT
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

    // 8. ANIMATION LOOP (Breathing, head-tracking, gestures)
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      controls.update();

      // Smooth Head Tracking towards cursor
      const targetYaw = mouseRef.current.x * 0.4;
      const targetPitch = -mouseRef.current.y * 0.25;

      // Both avatars track head towards user
      [myBonesRef, partnerBonesRef].forEach((ref) => {
        if (ref.current.head) {
          ref.current.head.rotation.y = THREE.MathUtils.lerp(ref.current.head.rotation.y, targetYaw, 0.1);
          ref.current.head.rotation.x = THREE.MathUtils.lerp(ref.current.head.rotation.x, targetPitch, 0.1);
        }
      });

      // Natural Breathing Idle Loop
      const breath = Math.sin(elapsedTime * 2.5) * 0.012;
      if (myBonesRef.current.spine) {
        myBonesRef.current.spine.position.y = 0.85 + breath;
      }
      if (partnerBonesRef.current.spine) {
        partnerBonesRef.current.spine.position.y = 0.85 + breath;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
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
  }, [myGlb, partnerGlb]);

  return (
    <div className={`relative flex flex-col items-center select-none w-full ${className}`}>
      
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        onClick={() => triggerReaction(activeReaction === 'wave' ? 'dance' : 'wave')}
        className="cursor-grab active:cursor-grabbing relative w-full h-[360px] sm:h-[430px] rounded-3xl overflow-hidden"
        title="Drag to spin 360° around both avatars • Tap to react"
      />

      {/* 360° Drag Hint Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-amber-300 border border-amber-400/30 shadow-lg pointer-events-none">
        <RotateCw size={11} className="animate-spin text-amber-400" />
        <span className="font-bold">360° Spin Drag</span>
      </div>

      {/* Pair Names Pill at bottom of podium */}
      <div className="flex items-center gap-2 -mt-3 z-10 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
        <span className="text-xs font-bold text-amber-300">{partnerName} ☕</span>
        <span className="text-xs text-rose-400">💛</span>
        <span className="text-xs font-bold text-amber-300">{myName} ☕</span>
      </div>

      {/* Emote Toolbar */}
      <div className="flex items-center gap-2 mt-3 flex-wrap justify-center bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
        <button
          onClick={() => triggerReaction('wave')}
          className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-100 flex items-center gap-1 active:scale-95 transition-all"
        >
          <span>👋</span>
          <span>Wave</span>
        </button>

        <button
          onClick={() => triggerReaction('kiss')}
          className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
        >
          <Heart size={12} className="fill-rose-400 text-rose-400" />
          <span>Love</span>
        </button>

        <button
          onClick={() => triggerReaction('dance')}
          className="px-3 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
        >
          <PartyPopper size={12} />
          <span>Dance</span>
        </button>

        <button
          onClick={onOpenCreator}
          className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-900 text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all"
        >
          <Sparkles size={12} />
          <span>3D Studio</span>
        </button>
      </div>
    </div>
  );
}

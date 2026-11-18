import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { 
  RotateCw, Sparkles, Heart, Coffee, 
  Music, Upload, RefreshCw, Camera, Box, Shirt, 
  Check, X, User, Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// -------------------------------------------------------------
// 1. INDIVIDUAL BOY CLOTHING & ACCESSORIES CATALOG
// -------------------------------------------------------------
export const BOY_TOPS = [
  { id: 'noir_street', name: 'Noir Bomber', color: 0x181a24, rough: 0.55, metal: 0.1, swatch: '#181a24', emoji: '🧥' },
  { id: 'caramel_suede', name: 'Caramel Suede', color: 0x8e5431, rough: 0.5, metal: 0.05, swatch: '#8e5431', emoji: '🍂' },
  { id: 'minimal_white', name: 'White Tee', color: 0xf2f5f9, rough: 0.5, metal: 0.05, swatch: '#f2f5f9', emoji: '🤍' },
  { id: 'forest_green', name: 'Evergreen Top', color: 0x1b3b2b, rough: 0.6, metal: 0.1, swatch: '#1b3b2b', emoji: '🌲' },
  { id: 'burgundy_velour', name: 'Burgundy Velvet', color: 0x4a1523, rough: 0.4, metal: 0.25, swatch: '#4a1523', emoji: '🍷' },
  { id: 'cyber_cobalt', name: 'Cyber Cobalt', color: 0x202464, rough: 0.3, metal: 0.5, swatch: '#202464', emoji: '🔮' },
  { id: 'vintage_navy', name: 'Varsity Navy', color: 0x1d2d48, rough: 0.55, metal: 0.1, swatch: '#1d2d48', emoji: '🧢' },
  { id: 'amber_gold', name: 'Sunset Amber', color: 0xd97706, rough: 0.45, metal: 0.15, swatch: '#d97706', emoji: '⚡' },
  { id: 'sage_utility', name: 'Sage Overshirt', color: 0x405244, rough: 0.55, metal: 0.1, swatch: '#405244', emoji: '🌿' },
  { id: 'sand_linen', name: 'Desert Sand Knit', color: 0xc8b69b, rough: 0.6, metal: 0.05, swatch: '#c8b69b', emoji: '🏖️' },
];

export const BOY_BOTTOMS = [
  { id: 'raw_denim', name: 'Indigo Denim', color: 0x2b3d54, rough: 0.65, swatch: '#2b3d54', emoji: '👖' },
  { id: 'jet_black', name: 'Jet Black Jeans', color: 0x111215, rough: 0.55, swatch: '#111215', emoji: '🖤' },
  { id: 'espresso_chinos', name: 'Espresso Chinos', color: 0x36281e, rough: 0.6, swatch: '#36281e', emoji: '☕' },
  { id: 'slate_shorts', name: 'Slate Denim', color: 0x444c57, rough: 0.65, swatch: '#444c57', emoji: '🩶' },
  { id: 'off_white', name: 'Off-White Canvas', color: 0xdcdfe5, rough: 0.5, swatch: '#dcdfe5', emoji: '🤍' },
  { id: 'deep_olive', name: 'Olive Military', color: 0x242d20, rough: 0.65, swatch: '#242d20', emoji: '🪖' },
  { id: 'cyber_carbon', name: 'Cyber Carbon', color: 0x161622, rough: 0.3, swatch: '#161622', emoji: '🔮' },
  { id: 'charcoal_cargos', name: 'Charcoal Cargos', color: 0x23262b, rough: 0.6, swatch: '#23262b', emoji: '🪨' },
  { id: 'khaki_tailored', name: 'Tailored Khaki', color: 0x6e604f, rough: 0.55, swatch: '#6e604f', emoji: '🌾' },
];

export const BOY_SHOES = [
  { id: 'black_runners', name: 'Black Runners', color: 0x141418, rough: 0.4, swatch: '#141418', emoji: '👟' },
  { id: 'white_kicks', name: 'White High-Tops', color: 0xe5eaef, rough: 0.35, swatch: '#e5eaef', emoji: '⚪' },
  { id: 'dark_tan_boots', name: 'Dark Tan Boots', color: 0x2a1e16, rough: 0.4, swatch: '#2a1e16', emoji: '🥾' },
  { id: 'neon_stompers', name: 'Cyber Stompers', color: 0x261633, rough: 0.3, swatch: '#261633', emoji: '🟣' },
  { id: 'retro_court', name: 'Vintage Court 80s', color: 0xd0d5dc, rough: 0.4, swatch: '#d0d5dc', emoji: '🎾' },
  { id: 'olive_sneakers', name: 'Olive Combat Low', color: 0x333b2e, rough: 0.45, swatch: '#333b2e', emoji: '🪖' },
];

// -------------------------------------------------------------
// 2. INDIVIDUAL GIRL CLOTHING & ACCESSORIES CATALOG
// -------------------------------------------------------------
export const GIRL_JACKETS = [
  { id: 'noir_blazer', name: 'Noir Blazer', color: 0x232733, rough: 0.5, metal: 0.1, swatch: '#232733', emoji: '🖤' },
  { id: 'caramel_coat', name: 'Caramel Coat', color: 0x8a4b27, rough: 0.45, metal: 0.15, swatch: '#8a4b27', emoji: '🧥' },
  { id: 'ivory_silk', name: 'Ivory Silk Blazer', color: 0xe6e9ee, rough: 0.45, metal: 0.1, swatch: '#e6e9ee', emoji: '🤍' },
  { id: 'sakura_pink', name: 'Sakura Blush Jacket', color: 0xc97a8e, rough: 0.5, metal: 0.1, swatch: '#c97a8e', emoji: '🌸' },
  { id: 'cyber_violet', name: 'Cyber Violet Jacket', color: 0x4a1f80, rough: 0.25, metal: 0.6, swatch: '#4a1f80', emoji: '🔮' },
  { id: 'velvet_ruby', name: 'Velvet Wine Blazer', color: 0x5a1828, rough: 0.35, metal: 0.3, swatch: '#5a1828', emoji: '🍷' },
  { id: 'regal_emerald', name: 'Emerald Velvet Jacket', color: 0x163828, rough: 0.4, metal: 0.2, swatch: '#163828', emoji: '👑' },
  { id: 'french_navy', name: 'French Navy Blazer', color: 0x1e293b, rough: 0.5, metal: 0.1, swatch: '#1e293b', emoji: '💙' },
  { id: 'pastel_sage', name: 'Sage Cropped Trench', color: 0x5a6b5e, rough: 0.5, metal: 0.1, swatch: '#5a6b5e', emoji: '🌿' },
  { id: 'mocha_leather', name: 'Mocha Moto Jacket', color: 0x4a3328, rough: 0.4, metal: 0.2, swatch: '#4a3328', emoji: '🤎' },
];

export const GIRL_TOPS = [
  { id: 'obsidian_top', name: 'Obsidian Top', color: 0x1a1a20, rough: 0.6, swatch: '#1a1a20', emoji: '🖤' },
  { id: 'vanilla_cream', name: 'Vanilla Cream Top', color: 0xdfd5c4, rough: 0.6, swatch: '#dfd5c4', emoji: '🤍' },
  { id: 'dusty_rose', name: 'Dusty Rose Silk', color: 0xf5e8ed, rough: 0.55, swatch: '#f5e8ed', emoji: '🌸' },
  { id: 'champagne_knit', name: 'Champagne Gold', color: 0xd0ab75, rough: 0.5, swatch: '#d0ab75', emoji: '🪙' },
  { id: 'neon_magenta', name: 'Magenta Club Top', color: 0x941662, rough: 0.4, swatch: '#941662', emoji: '💖' },
  { id: 'slate_contrast', name: 'Cool Slate Top', color: 0x222630, rough: 0.6, swatch: '#222630', emoji: '🩶' },
  { id: 'lavender_silk', name: 'Lavender Silk Cami', color: 0xd1c4e9, rough: 0.5, swatch: '#d1c4e9', emoji: '🪻' },
  { id: 'terracotta_rib', name: 'Terracotta Ribbed', color: 0xc26d55, rough: 0.6, swatch: '#c26d55', emoji: '🏺' },
];

export const GIRL_PANTS = [
  { id: 'noir_trousers', name: 'Jet Black Slacks', color: 0x1e2029, rough: 0.55, swatch: '#1e2029', emoji: '🖤' },
  { id: 'vintage_blue', name: 'Vintage Blue Jeans', color: 0x2e3d50, rough: 0.65, swatch: '#2e3d50', emoji: '👖' },
  { id: 'espresso_wide', name: 'Cocoa Espresso Slacks', color: 0x302018, rough: 0.55, swatch: '#302018', emoji: '☕' },
  { id: 'slate_tailored', name: 'Slate Slacks', color: 0x333b47, rough: 0.55, swatch: '#333b47', emoji: '🩶' },
  { id: 'linen_white', name: 'Off-White Linen', color: 0xdcdfe5, rough: 0.5, swatch: '#dcdfe5', emoji: '🤍' },
  { id: 'cyber_pants', name: 'Cyber Vinyl Pants', color: 0x141224, rough: 0.3, swatch: '#141224', emoji: '🔮' },
  { id: 'khaki_wide', name: 'Wide Pleated Khakis', color: 0x6e604f, rough: 0.55, swatch: '#6e604f', emoji: '🌾' },
  { id: 'sage_tailored', name: 'Tailored Sage Pants', color: 0x48584c, rough: 0.6, swatch: '#48584c', emoji: '🌿' },
];

export const GIRL_SHOES = [
  { id: 'noir_boots', name: 'Black Leather Boots', color: 0x121215, rough: 0.35, swatch: '#121215', emoji: '👢' },
  { id: 'wine_pumps', name: 'Velvet Wine Heels', color: 0x160810, rough: 0.35, swatch: '#160810', emoji: '👠' },
  { id: 'white_boots', name: 'Ivory White Boots', color: 0xe0e4ea, rough: 0.35, swatch: '#e0e4ea', emoji: '⚪' },
  { id: 'cyber_boots', name: 'Purple Neon Combat', color: 0x1b0f30, rough: 0.3, swatch: '#1b0f30', emoji: '🟣' },
  { id: 'nude_stilettos', name: 'Warm Nude Heels', color: 0xb8937b, rough: 0.35, swatch: '#b8937b', emoji: '👡' },
  { id: 'chunky_loafers', name: 'Platform Loafers', color: 0x1a191f, rough: 0.35, swatch: '#1a191f', emoji: '👞' },
];

// -------------------------------------------------------------
// 3. AUTHENTIC HUMAN SKIN TONES (NATURAL MELANIN & WARMTH)
// -------------------------------------------------------------
export const SKIN_TONES = [
  { id: 'fair_warm', name: 'Fair Warm', boyHex: 0xfdebe1, girlHex: 0xe8a98c, swatch: '#e8a98c', emoji: '🌸' },
  { id: 'golden_honey', name: 'Golden Honey', boyHex: 0xf5dac0, girlHex: 0xdf9a75, swatch: '#df9a75', emoji: '🍯' },
  { id: 'warm_almond', name: 'Warm Almond', boyHex: 0xeac2a3, girlHex: 0xd08964, swatch: '#d08964', emoji: '☀️' },
  { id: 'bronze', name: 'Sun-Kissed Bronze', boyHex: 0xd4a682, girlHex: 0xba724e, swatch: '#ba724e', emoji: '🌴' },
  { id: 'chestnut', name: 'Deep Chestnut', boyHex: 0x9f6946, girlHex: 0x8a4e30, swatch: '#8a4e30', emoji: '🌰' },
  { id: 'espresso', name: 'Rich Espresso', boyHex: 0x623e2a, girlHex: 0x542f1d, swatch: '#542f1d', emoji: '☕' },
];

// -------------------------------------------------------------
// 3. HAIR COLOR PRESETS
// -------------------------------------------------------------
export const HAIR_COLORS = [
  { id: 'natural', name: 'Brunette', hex: 0x221712, swatch: '#221712', emoji: '🌰' },
  { id: 'blonde', name: 'Honey Blonde', hex: 0xd6b77c, swatch: '#d6b77c', emoji: '🍯' },
  { id: 'noir', name: 'Jet Noir', hex: 0x0d0d0f, swatch: '#0d0d0f', emoji: '🖤' },
  { id: 'auburn', name: 'Auburn', hex: 0x6e2c18, swatch: '#6e2c18', emoji: '🍂' },
  { id: 'sakura', name: 'Pastel Rose', hex: 0xb56984, swatch: '#b56984', emoji: '🌸' },
  { id: 'silver', name: 'Silver Platinum', hex: 0xc8d0dc, swatch: '#c8d0dc', emoji: '❄️' },
];

// -------------------------------------------------------------
// 4. COORDINATED COUPLE PRESETS (QUICK MATCH)
// -------------------------------------------------------------
export const COUPLE_PRESETS = [
  {
    id: 'streetwear',
    name: 'Streetwear Chic',
    emoji: '⚡',
    themeColor: '#6366f1',
    boy: { top: 'noir_street', bottom: 'raw_denim', shoes: 'black_runners', skin: 'fair_warm', shades: false },
    girl: { jacket: 'noir_blazer', top: 'obsidian_top', pants: 'noir_trousers', shoes: 'noir_boots', skin: 'fair_warm', glasses: false, tie: false },
  },
  {
    id: 'cozy_date',
    name: 'Cozy Autumn Date',
    emoji: '☕',
    themeColor: '#f59e0b',
    boy: { top: 'caramel_suede', bottom: 'espresso_chinos', shoes: 'dark_tan_boots', skin: 'golden_honey', shades: false },
    girl: { jacket: 'caramel_coat', top: 'vanilla_cream', pants: 'espresso_wide', shoes: 'noir_boots', skin: 'golden_honey', glasses: false, tie: false },
  },
  {
    id: 'monochrome',
    name: 'Noir Luxury',
    emoji: '🖤',
    themeColor: '#94a3b8',
    boy: { top: 'noir_street', bottom: 'jet_black', shoes: 'black_runners', skin: 'fair_warm', shades: true },
    girl: { jacket: 'noir_blazer', top: 'obsidian_top', pants: 'noir_trousers', shoes: 'noir_boots', skin: 'fair_warm', glasses: false, tie: false },
  },
  {
    id: 'pastel_love',
    name: 'Sakura Blush',
    emoji: '🌸',
    themeColor: '#f43f5e',
    boy: { top: 'minimal_white', bottom: 'slate_shorts', shoes: 'white_kicks', skin: 'fair_warm', shades: false },
    girl: { jacket: 'sakura_pink', top: 'dusty_rose', pants: 'slate_tailored', shoes: 'white_boots', skin: 'fair_warm', glasses: false, tie: false },
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon 2077',
    emoji: '🔮',
    themeColor: '#a855f7',
    boy: { top: 'cyber_cobalt', bottom: 'cyber_carbon', shoes: 'neon_stompers', skin: 'bronze', shades: true },
    girl: { jacket: 'cyber_violet', top: 'neon_magenta', pants: 'cyber_pants', shoes: 'cyber_boots', skin: 'bronze', glasses: false, tie: false },
  },
  {
    id: 'clean_ivory',
    name: 'Clean Minimalist',
    emoji: '🤍',
    themeColor: '#38bdf8',
    boy: { top: 'minimal_white', bottom: 'slate_shorts', shoes: 'white_kicks', skin: 'fair_warm', shades: false },
    girl: { jacket: 'ivory_silk', top: 'slate_contrast', pants: 'slate_tailored', shoes: 'white_boots', skin: 'fair_warm', glasses: false, tie: false },
  },
  {
    id: 'royal_gala',
    name: 'Royal Gala',
    emoji: '👑',
    themeColor: '#10b981',
    boy: { top: 'forest_green', bottom: 'jet_black', shoes: 'black_runners', skin: 'warm_almond', shades: false },
    girl: { jacket: 'velvet_ruby', top: 'champagne_knit', pants: 'noir_trousers', shoes: 'wine_pumps', skin: 'warm_almond', glasses: false, tie: false },
  },
];

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
  
  // State: Emotes & Stage
  const [activeEmote, setActiveEmote] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Role Enforcement: Boy only control by boy, Girl only by girl
  const detectedRole = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.gender === 'female' || (user.name && user.name.toLowerCase().includes('neha'))) {
        return 'girl';
      }
    } catch {}
    return 'boy';
  })();

  const [activeRole, setActiveRole] = useState(detectedRole);

  // State: Wardrobe Drawer & Active Target Character ('boy' | 'girl' | 'sets')
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [wardrobeTarget, setWardrobeTarget] = useState(detectedRole); // Default to current user's avatar
  const [boySubTab, setBoySubTab] = useState('tops'); // 'tops' | 'pants' | 'shoes' | 'skin' | 'hair' | 'shades'
  const [girlSubTab, setGirlSubTab] = useState('jackets'); // 'jackets' | 'tops' | 'pants' | 'shoes' | 'skin' | 'hair' | 'accessories'

  // Independent Wardrobe State for Boy (with authentic skin tone)
  const [boyWardrobe, setBoyWardrobe] = useState(() => {
    try {
      const saved = localStorage.getItem('lovelink_3d_boy_wardrobe');
      return saved ? JSON.parse(saved) : {
        top: 'noir_street',
        bottom: 'raw_denim',
        shoes: 'black_runners',
        skin: 'fair_warm',
        hair: 'natural',
        shades: false,
      };
    } catch {
      return { top: 'noir_street', bottom: 'raw_denim', shoes: 'black_runners', skin: 'fair_warm', hair: 'natural', shades: false };
    }
  });

  // Independent Wardrobe State for Girl (with authentic skin tone)
  const [girlWardrobe, setGirlWardrobe] = useState(() => {
    try {
      const saved = localStorage.getItem('lovelink_3d_girl_wardrobe');
      return saved ? JSON.parse(saved) : {
        jacket: 'noir_blazer',
        top: 'obsidian_top',
        pants: 'noir_trousers',
        shoes: 'noir_boots',
        skin: 'fair_warm',
        hair: 'natural',
        glasses: false,
        tie: false,
      };
    } catch {
      return { jacket: 'noir_blazer', top: 'obsidian_top', pants: 'noir_trousers', shoes: 'noir_boots', skin: 'fair_warm', hair: 'natural', glasses: false, tie: false };
    }
  });

  // Custom Local Overrides (if user uploads a custom .glb file)
  const [localMyGlb, setLocalMyGlb] = useState(null);
  const [localPartnerGlb] = useState(null);

  // Three.js References
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const ringMeshRef = useRef(null);
  const sunglassesGroupRef = useRef(null);

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
      // Audio muted
    }
  }, []);

  // -------------------------------------------------------------
  // DYNAMIC THREE.JS PBR MATERIAL APPLIER (INDEPENDENT BOY & GIRL)
  // -------------------------------------------------------------
  const applyAllWardrobe = useCallback((boyState, girlState) => {
    // 1. Apply Girl (Left Model)
    if (leftModelRef.current) {
      const jacketItem = GIRL_JACKETS.find(j => j.id === girlState.jacket) || GIRL_JACKETS[0];
      const topItem = GIRL_TOPS.find(t => t.id === girlState.top) || GIRL_TOPS[0];
      const pantsItem = GIRL_PANTS.find(p => p.id === girlState.pants) || GIRL_PANTS[0];
      const shoesItem = GIRL_SHOES.find(s => s.id === girlState.shoes) || GIRL_SHOES[0];
      const hairItem = HAIR_COLORS.find(h => h.id === girlState.hair) || HAIR_COLORS[0];
      const skinItem = SKIN_TONES.find(s => s.id === girlState.skin) || SKIN_TONES[0];

      leftModelRef.current.traverse((child) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();

          // Toggles
          if (name.includes('tie')) child.visible = !!girlState.tie;
          else if (name.includes('eyeglass')) child.visible = !!girlState.glasses;
          else if (name.includes('button')) child.visible = false;
          else child.visible = true;

          if (child.material) {
            const mat = Array.isArray(child.material) ? child.material[0] : child.material;
            if (name.includes('body')) {
              mat.color.setHex(skinItem.girlHex);
              mat.roughness = 0.72; // soft natural skin (no plastic glare)
              mat.metalness = 0.0;
            } else if (name.includes('suit')) {
              mat.color.setHex(jacketItem.color);
              mat.roughness = jacketItem.rough;
              mat.metalness = jacketItem.metal || 0.1;
            } else if (name.includes('shirt')) {
              mat.color.setHex(topItem.color);
              mat.roughness = topItem.rough;
            } else if (name.includes('pants')) {
              mat.color.setHex(pantsItem.color);
              mat.roughness = pantsItem.rough;
            } else if (name.includes('shoes')) {
              mat.color.setHex(shoesItem.color);
              mat.roughness = shoesItem.rough;
            } else if (name.includes('hair') || name.includes('nurbspath')) {
              mat.color.setHex(hairItem.hex);
              mat.roughness = 0.5;
            }
          }
        }
      });
    }

    // 2. Apply Boy (Right Model)
    if (rightModelRef.current) {
      const topItem = BOY_TOPS.find(t => t.id === boyState.top) || BOY_TOPS[0];
      const bottomItem = BOY_BOTTOMS.find(b => b.id === boyState.bottom) || BOY_BOTTOMS[0];
      const shoesItem = BOY_SHOES.find(s => s.id === boyState.shoes) || BOY_SHOES[0];
      const hairItem = HAIR_COLORS.find(h => h.id === boyState.hair) || HAIR_COLORS[0];
      const skinItem = SKIN_TONES.find(s => s.id === boyState.skin) || SKIN_TONES[0];

      rightModelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const name = child.name.toLowerCase();
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          if (name.includes('head') || name.includes('body')) {
            mat.color.setHex(skinItem.boyHex);
            mat.roughness = 0.72; // soft natural skin (no plastic glare)
            mat.metalness = 0.0;
          } else if (name.includes('top')) {
            mat.color.setHex(topItem.color);
            mat.roughness = topItem.rough;
            mat.metalness = topItem.metal || 0.1;
          } else if (name.includes('bottom')) {
            mat.color.setHex(bottomItem.color);
            mat.roughness = bottomItem.rough;
          } else if (name.includes('footwear')) {
            mat.color.setHex(shoesItem.color);
            mat.roughness = shoesItem.rough;
          } else if (name.includes('hair')) {
            mat.color.setHex(hairItem.hex);
            mat.roughness = 0.55;
          }
        }
      });

      // Male Designer Sunglasses
      if (sunglassesGroupRef.current) {
        sunglassesGroupRef.current.visible = !!boyState.shades;
      }
    }
  }, []);

  // Update Boy Item
  const handleUpdateBoy = (slot, value) => {
    const updated = { ...boyWardrobe, [slot]: value };
    setBoyWardrobe(updated);
    try { localStorage.setItem('lovelink_3d_boy_wardrobe', JSON.stringify(updated)); } catch {}
    applyAllWardrobe(updated, girlWardrobe);
    playSfx('chime');
  };

  // Update Girl Item
  const handleUpdateGirl = (slot, value) => {
    const updated = { ...girlWardrobe, [slot]: value };
    setGirlWardrobe(updated);
    try { localStorage.setItem('lovelink_3d_girl_wardrobe', JSON.stringify(updated)); } catch {}
    applyAllWardrobe(boyWardrobe, updated);
    playSfx('chime');
  };

  // Apply Coordinated Preset to Both
  const handleApplyPreset = (presetId) => {
    const preset = COUPLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const newBoy = { ...boyWardrobe, ...preset.boy };
    const newGirl = { ...girlWardrobe, ...preset.girl };

    setBoyWardrobe(newBoy);
    setGirlWardrobe(newGirl);
    try {
      localStorage.setItem('lovelink_3d_boy_wardrobe', JSON.stringify(newBoy));
      localStorage.setItem('lovelink_3d_girl_wardrobe', JSON.stringify(newGirl));
    } catch {}

    applyAllWardrobe(newBoy, newGirl);

    if (ringMeshRef.current) {
      ringMeshRef.current.material.color.set(preset.themeColor);
    }

    playSfx('chime');
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981'],
    });
    toast.success(`Matched: ${preset.name}! ${preset.emoji}`);
  };

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

    // 2. PERSPECTIVE CAMERA
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
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 4. BALANCED SOFT PORTRAIT STUDIO LIGHTING (WARM NATURAL HUMAN SKIN)
    const ambientLight = new THREE.AmbientLight(0xfff8f4, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5eb, 1.0);
    keyLight.position.set(1.8, 3.2, 2.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe4edf8, 0.55);
    fillLight.position.set(-2.0, 2.0, 1.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
    rimLight.position.set(0, 2.5, -2.0);
    scene.add(rimLight);

    // 5. LUXURY STUDIO CIRCULAR PODIUM & NEON ACCENT RING
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.6, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x121722, roughness: 0.35, metalness: 0.25 })
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
    ringMeshRef.current = ring;

    // 6. 360° ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableZoom = true;
    controls.minDistance = 1.8;
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
          child.userData.initialRotation = child.rotation.clone();
          const name = child.name.toLowerCase();
          if (name === 'head') bonesRef.current.head = child;
          if (name === 'neck') bonesRef.current.neck = child;
          if (name === 'leftarm') bonesRef.current.leftArm = child;
          if (name === 'rightarm') bonesRef.current.rightArm = child;
          if (name === 'leftforearm') bonesRef.current.leftForeArm = child;
          if (name === 'rightforearm') bonesRef.current.rightForeArm = child;
          if (name === 'lefthand') bonesRef.current.leftHand = child;
          if (name === 'righthand') bonesRef.current.rightHand = child;
          if (name === 'spine' || name === 'spine1' || name === 'spine2') {
            if (!bonesRef.current.spine) bonesRef.current.spine = child;
          }
          if (name === 'hips') bonesRef.current.hips = child;

          // Finger bones mapping
          const cleanName = child.name;
          bonesRef.current[cleanName] = child;
          const camel = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
          bonesRef.current[camel] = child;
        }
      });
    };

    // 8. HIGH-DEFINITION REALISTIC TEXTURES
    const texLoader = new THREE.TextureLoader();
    const cleanSkinTex = texLoader.load('/models/female_skin_cleaned.png');
    cleanSkinTex.flipY = false;
    cleanSkinTex.colorSpace = THREE.SRGBColorSpace;

    const realisticEyeTex = texLoader.load('/models/female_eye_realistic.png');
    realisticEyeTex.flipY = false;
    realisticEyeTex.colorSpace = THREE.SRGBColorSpace;

    // 9. LOAD REAL 3D HUMANOID MODELS (.GLB)
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        setIsLoading(false);
        applyAllWardrobe(boyWardrobe, girlWardrobe);
      }
    };

    const femaleGlb = localPartnerGlb || partnerGlbUrl || '/models/female_avatar.glb';
    const maleGlb = localMyGlb || myGlbUrl || '/models/male_avatar.glb';

    // Load Left Model (Female Avatar / Neha)
    loader.load(
      femaleGlb,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(-0.38, 0.08, 0);
        model.scale.set(1.135, 1.135, 1.135);
        
        model.traverse((child) => {
          if (child.isMesh) {
            child.visible = true;
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material = child.material.map(m => m.clone());
              } else {
                child.material = child.material.clone();
              }
            }
            const name = child.name.toLowerCase();
            // Upgrade female skin to smooth human complexion (no anime clown blush)
            if (name.includes('body')) {
              const sm = Array.isArray(child.material) ? child.material[0] : child.material;
              sm.map = cleanSkinTex;
              sm.color.setHex(0xe8a98c); // Rich warm natural human skin (harmonized with boy)
              sm.roughness = 0.68;
              sm.metalness = 0.0;
              sm.needsUpdate = true;
            }
            // Upgrade female eyes to realistic depth
            if (name.includes('eye') && !name.includes('eyebrow')) {
              const em = Array.isArray(child.material) ? child.material[0] : child.material;
              em.map = realisticEyeTex;
              em.color.setHex(0xffffff);
              em.roughness = 0.15;
              em.metalness = 0.0;
              em.needsUpdate = true;
            }
          }
        });

        mapBones(model, leftBonesRef);

        if (leftBonesRef.current.leftArm) {
          leftBonesRef.current.leftArm.rotation.set(0.958, -1.592, 2.408);
        }
        if (leftBonesRef.current.rightArm) {
          leftBonesRef.current.rightArm.rotation.set(-2.192, -1.592, -0.742);
        }
        // Forearms: pronate naturally so palms face inward towards thighs
        if (leftBonesRef.current.leftForeArm) leftBonesRef.current.leftForeArm.rotation.set(0, -0.45, 0);
        if (leftBonesRef.current.rightForeArm) leftBonesRef.current.rightForeArm.rotation.set(0, 0.45, 0);
        // Wrists: natural relaxed downward drop
        if (leftBonesRef.current.leftHand) leftBonesRef.current.leftHand.rotation.set(0.05, -0.10, -0.05);
        if (leftBonesRef.current.rightHand) leftBonesRef.current.rightHand.rotation.set(0.05, 0.10, 0.05);

        // Natural graceful human resting finger curve (inverted for Left vs Right to curl toward palm)
        const curlFingers = (side) => {
          const prefix = side === 'left' ? 'leftHand' : 'rightHand';
          const isLeft = side === 'left';
          ['Index', 'Middle', 'Ring', 'Pinky'].forEach((f, idx) => {
            const curlAmt = 0.28 + idx * 0.035;
            for (let j = 1; j <= 3; j++) {
              const b = leftBonesRef.current[`${prefix}${f}${j}`];
              if (b) {
                const factor = j === 1 ? 0.9 : j === 2 ? 1.05 : 0.8;
                b.rotation.x = isLeft ? -curlAmt * factor : curlAmt * factor;
              }
            }
          });
          const t1 = leftBonesRef.current[`${prefix}Thumb1`];
          const t2 = leftBonesRef.current[`${prefix}Thumb2`];
          if (t1) {
            t1.rotation.set(isLeft ? -0.16 : 0.16, isLeft ? 0.12 : -0.12, isLeft ? -0.08 : 0.08);
          }
          if (t2) {
            t2.rotation.x = isLeft ? -0.18 : 0.18;
          }
        };
        curlFingers('left');
        curlFingers('right');

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
    loader.load(
      maleGlb,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0.38, 0.08, 0);
        model.scale.set(0.98, 0.98, 0.98);

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map(m => m.clone());
            } else {
              child.material = child.material.clone();
            }

            const name = child.name.toLowerCase();
            // Male realistic human skin (harmonized with female tone)
            if (name.includes('head') || name.includes('body')) {
              const sm = Array.isArray(child.material) ? child.material[0] : child.material;
              sm.color.setHex(0xfdebe1);
              sm.roughness = 0.68;
              sm.metalness = 0.0;
            }
          }

          // Attach 3D Designer Sunglasses to Male Head Bone
          if (child.isBone && child.name.toLowerCase() === 'head') {
            const glassesGroup = new THREE.Group();
            const glassMat = new THREE.MeshStandardMaterial({ 
              color: 0x0a0c12, 
              roughness: 0.1, 
              metalness: 0.9 
            });
            const frameMat = new THREE.MeshStandardMaterial({ 
              color: 0x181920, 
              roughness: 0.25, 
              metalness: 0.5 
            });

            const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.038, 0.008), glassMat);
            leftLens.position.set(-0.042, 0.085, 0.145);
            glassesGroup.add(leftLens);

            const rightLens = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.038, 0.008), glassMat);
            rightLens.position.set(0.042, 0.085, 0.145);
            glassesGroup.add(rightLens);

            const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.008), frameMat);
            bridge.position.set(0, 0.09, 0.145);
            glassesGroup.add(bridge);

            glassesGroup.visible = !!boyWardrobe.shades;
            child.add(glassesGroup);
            sunglassesGroupRef.current = glassesGroup;
          }
        });

        mapBones(model, rightBonesRef);
        if (rightBonesRef.current.leftArm) {
          rightBonesRef.current.leftArm.rotation.set(1.350, -0.600, -0.100);
        }
        if (rightBonesRef.current.rightArm) {
          rightBonesRef.current.rightArm.rotation.set(1.350, 0.600, 0.100);
        }
        if (rightBonesRef.current.leftForeArm) rightBonesRef.current.leftForeArm.rotation.set(0, 0, 0);
        if (rightBonesRef.current.rightForeArm) rightBonesRef.current.rightForeArm.rotation.set(0, 0, 0);
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

    // 9. MOUSE TRACKING
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
        const idleBreathing = Math.sin(elapsedTime * 2.2) * 0.005;
        const idleSway = Math.sin(elapsedTime * 1.5) * 0.03;

        // EMOTE OVERRIDES - REALISTIC EXPRESSIVE ROMANTIC COUPLE INTERACTIONS
        if (currentEmote === 'clink' && emoteProgress < 1.0) {
          // Smooth cubic ease-in-out curve
          const env = Math.sin(emoteProgress * Math.PI) * (1 - 0.12 * Math.sin(emoteProgress * Math.PI * 2));

          // Both avatars step gently closer together
          leftModel.position.x = THREE.MathUtils.lerp(-0.44, -0.30, env);
          rightModel.position.x = THREE.MathUtils.lerp(0.44, 0.30, env);
          leftModel.rotation.y = THREE.MathUtils.lerp(0, 0.28, env);
          rightModel.rotation.y = THREE.MathUtils.lerp(0, -0.28, env);

          // Torso leans in warmly
          if (leftBones.spine) leftBones.spine.rotation.z = -0.06 * env;
          if (rightBones.spine) rightBones.spine.rotation.z = 0.06 * env;

          // Heads turn to each other with smiling eye contact
          if (leftBones.head) {
            leftBones.head.rotation.y = THREE.MathUtils.lerp(0, 0.38, env);
            leftBones.head.rotation.x = THREE.MathUtils.lerp(0, 0.08, env);
          }
          if (rightBones.head) {
            rightBones.head.rotation.y = THREE.MathUtils.lerp(0, -0.38, env);
            rightBones.head.rotation.x = THREE.MathUtils.lerp(0, 0.08, env);
          }

          // Girl raises INNER arm (LeftArm) forward at 45° to toast
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.x = THREE.MathUtils.lerp(0.958, 0.65, env);
            leftBones.leftArm.rotation.y = THREE.MathUtils.lerp(-1.592, -0.85, env);
            leftBones.leftArm.rotation.z = THREE.MathUtils.lerp(2.408, 0.35, env);
          }
          if (leftBones.leftForeArm) {
            leftBones.leftForeArm.rotation.x = THREE.MathUtils.lerp(0, -0.75, env);
            leftBones.leftForeArm.rotation.y = THREE.MathUtils.lerp(-0.45, -0.30, env);
            leftBones.leftForeArm.rotation.z = THREE.MathUtils.lerp(0, 0.45, env);
          }
          if (leftBones.leftHand) {
            leftBones.leftHand.rotation.set(0.15 * env, -0.20 * env, 0.10 * env);
          }

          // Girl outer arm rests naturally at side
          if (leftBones.rightArm) leftBones.rightArm.rotation.set(-2.192, -1.592, -0.742);
          if (leftBones.rightForeArm) leftBones.rightForeArm.rotation.set(0, 0.45, 0);

          // Boy raises INNER arm (RightArm) forward to meet her cup
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.x = THREE.MathUtils.lerp(1.350, 0.65, env);
            rightBones.rightArm.rotation.y = THREE.MathUtils.lerp(0.600, 0.85, env);
            rightBones.rightArm.rotation.z = THREE.MathUtils.lerp(0.100, -0.35, env);
          }
          if (rightBones.rightForeArm) {
            rightBones.rightForeArm.rotation.x = THREE.MathUtils.lerp(0, -0.75, env);
            rightBones.rightForeArm.rotation.y = THREE.MathUtils.lerp(0, 0.30, env);
            rightBones.rightForeArm.rotation.z = THREE.MathUtils.lerp(0, -0.45, env);
          }
          if (rightBones.rightHand) {
            rightBones.rightHand.rotation.set(0.15 * env, 0.20 * env, -0.10 * env);
          }

          // Boy outer arm rests naturally at side
          if (rightBones.leftArm) rightBones.leftArm.rotation.set(1.350, -0.600, -0.100);
          if (rightBones.leftForeArm) rightBones.leftForeArm.rotation.set(0, 0, 0);

        } else if (currentEmote === 'kiss' && emoteProgress < 1.0) {
          const env = Math.sin(emoteProgress * Math.PI) * (1 - 0.10 * Math.sin(emoteProgress * Math.PI * 2));

          // Romantic close step-in
          leftModel.position.x = THREE.MathUtils.lerp(-0.44, -0.24, env);
          rightModel.position.x = THREE.MathUtils.lerp(0.44, 0.24, env);
          leftModel.rotation.y = THREE.MathUtils.lerp(0, 0.42, env);
          rightModel.rotation.y = THREE.MathUtils.lerp(0, -0.42, env);

          // Romantic spine tilt toward partner
          if (leftBones.spine) leftBones.spine.rotation.z = -0.08 * env;
          if (rightBones.spine) rightBones.spine.rotation.z = 0.08 * env;

          // Romantic head tilt & intimate eye contact
          if (leftBones.head) {
            leftBones.head.rotation.y = THREE.MathUtils.lerp(0, 0.42, env);
            leftBones.head.rotation.z = THREE.MathUtils.lerp(0, 0.12, env);
            leftBones.head.rotation.x = THREE.MathUtils.lerp(0, 0.05, env);
          }
          if (rightBones.head) {
            rightBones.head.rotation.y = THREE.MathUtils.lerp(0, -0.42, env);
            rightBones.head.rotation.z = THREE.MathUtils.lerp(0, -0.12, env);
            rightBones.head.rotation.x = THREE.MathUtils.lerp(0, 0.05, env);
          }

          // Girl brings inner hand towards lips to blow sweet kiss
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.x = THREE.MathUtils.lerp(0.958, 0.50, env);
            leftBones.leftArm.rotation.y = THREE.MathUtils.lerp(-1.592, -0.50, env);
            leftBones.leftArm.rotation.z = THREE.MathUtils.lerp(2.408, 0.40, env);
          }
          if (leftBones.leftForeArm) {
            leftBones.leftForeArm.rotation.x = THREE.MathUtils.lerp(0, -1.10, env);
            leftBones.leftForeArm.rotation.y = THREE.MathUtils.lerp(-0.45, -0.20, env);
            leftBones.leftForeArm.rotation.z = THREE.MathUtils.lerp(0, 0.60, env);
          }

          // Boy extends inner hand gently forward in loving embrace
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.x = THREE.MathUtils.lerp(1.350, 0.40, env);
            rightBones.rightArm.rotation.y = THREE.MathUtils.lerp(0.600, 0.40, env);
            rightBones.rightArm.rotation.z = THREE.MathUtils.lerp(0.100, -0.30, env);
          }
          if (rightBones.rightForeArm) {
            rightBones.rightForeArm.rotation.x = THREE.MathUtils.lerp(0, -0.60, env);
            rightBones.rightForeArm.rotation.y = THREE.MathUtils.lerp(0, 0.20, env);
            rightBones.rightForeArm.rotation.z = THREE.MathUtils.lerp(0, -0.30, env);
          }

          // Outer arms resting naturally
          if (leftBones.rightArm) leftBones.rightArm.rotation.set(-2.192, -1.592, -0.742);
          if (leftBones.rightForeArm) leftBones.rightForeArm.rotation.set(0, 0.45, 0);
          if (rightBones.leftArm) rightBones.leftArm.rotation.set(1.350, -0.600, -0.100);
          if (rightBones.leftForeArm) rightBones.leftForeArm.rotation.set(0, 0, 0);

        } else if (currentEmote === 'dance' && emoteProgress < 1.0) {
          // Romantic rhythm in sync with lofi music
          const beat = Math.sin(elapsedTime * 8);
          const bounce = Math.abs(beat) * 0.035;
          const sway = Math.sin(elapsedTime * 4) * 0.08;

          leftModel.position.y = 0.08 + bounce;
          rightModel.position.y = 0.08 + Math.abs(Math.sin(elapsedTime * 8 + 0.4)) * 0.035;

          // Hips & Spine romantic sway
          if (leftBones.hips) leftBones.hips.rotation.z = sway;
          if (rightBones.hips) rightBones.hips.rotation.z = -sway;
          if (leftBones.spine) leftBones.spine.rotation.z = -sway * 0.8;
          if (rightBones.spine) rightBones.spine.rotation.z = sway * 0.8;

          // Natural arm dancing sways
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.z = 1.4 + Math.sin(elapsedTime * 8) * 0.25;
            leftBones.leftArm.rotation.x = 0.6 + Math.cos(elapsedTime * 8) * 0.2;
          }
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.z = -1.4 - Math.sin(elapsedTime * 8) * 0.25;
            leftBones.rightArm.rotation.x = -1.8 - Math.cos(elapsedTime * 8) * 0.2;
          }
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.z = -0.4 + Math.sin(elapsedTime * 8) * 0.25;
            rightBones.leftArm.rotation.x = 1.0 + Math.cos(elapsedTime * 8) * 0.2;
          }
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.z = 0.4 - Math.sin(elapsedTime * 8) * 0.25;
            rightBones.rightArm.rotation.x = 1.0 - Math.cos(elapsedTime * 8) * 0.2;
          }

          // Cheerful head groove
          if (leftBones.head) {
            leftBones.head.rotation.y = Math.sin(elapsedTime * 4) * 0.15;
            leftBones.head.rotation.x = 0.06 + Math.abs(Math.sin(elapsedTime * 8)) * 0.08;
          }
          if (rightBones.head) {
            rightBones.head.rotation.y = -Math.sin(elapsedTime * 4) * 0.15;
            rightBones.head.rotation.x = 0.06 + Math.abs(Math.sin(elapsedTime * 8 + 0.4)) * 0.08;
          }

        } else if (currentEmote === 'wave' && emoteProgress < 1.0) {
          const env = Math.sin(emoteProgress * Math.PI);
          const waveCycle = Math.sin(elapsedTime * 14);

          // Girl waves outer arm (RightArm)
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.x = THREE.MathUtils.lerp(-2.192, -0.85, env);
            leftBones.rightArm.rotation.y = THREE.MathUtils.lerp(-1.592, -0.20, env);
            leftBones.rightArm.rotation.z = THREE.MathUtils.lerp(-0.742, -2.10, env);
          }
          if (leftBones.rightForeArm) {
            leftBones.rightForeArm.rotation.z = (waveCycle * 0.45) * env;
          }
          if (leftBones.head) {
            leftBones.head.rotation.set(0, 0.15 * env, 0.08 * env);
          }

          // Boy waves outer arm (LeftArm)
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.x = THREE.MathUtils.lerp(1.350, -0.85, env);
            rightBones.leftArm.rotation.y = THREE.MathUtils.lerp(-0.600, 0.20, env);
            rightBones.leftArm.rotation.z = THREE.MathUtils.lerp(-0.100, 2.10, env);
          }
          if (rightBones.leftForeArm) {
            rightBones.leftForeArm.rotation.z = (Math.sin(elapsedTime * 14 + 0.3) * 0.45) * env;
          }
          if (rightBones.head) {
            rightBones.head.rotation.set(0, -0.15 * env, -0.08 * env);
          }

        } else {
          // NATURAL RELAXED IDLE POSTURE (PALMS RESTING INWARD, ZERO HYPEREXTENSION)
          leftModel.position.x = THREE.MathUtils.lerp(leftModel.position.x, -0.44, 0.1);
          rightModel.position.x = THREE.MathUtils.lerp(rightModel.position.x, 0.44, 0.1);
          leftModel.position.y = 0.08 + idleBreathing;
          rightModel.position.y = 0.08 + Math.sin(elapsedTime * 2.2 + 0.4) * 0.005;

          leftModel.rotation.y = THREE.MathUtils.lerp(leftModel.rotation.y, 0, 0.1);
          rightModel.rotation.y = THREE.MathUtils.lerp(rightModel.rotation.y, 0, 0.1);
          leftModel.rotation.z = THREE.MathUtils.lerp(leftModel.rotation.z, 0, 0.1);
          rightModel.rotation.z = THREE.MathUtils.lerp(rightModel.rotation.z, 0, 0.1);

          // Female resting arms and pronated forearms
          if (leftBones.leftArm) {
            leftBones.leftArm.rotation.x = THREE.MathUtils.lerp(leftBones.leftArm.rotation.x, 0.958, 0.1);
            leftBones.leftArm.rotation.y = THREE.MathUtils.lerp(leftBones.leftArm.rotation.y, -1.592, 0.1);
            leftBones.leftArm.rotation.z = THREE.MathUtils.lerp(leftBones.leftArm.rotation.z, 2.408 + idleSway * 0.1, 0.1);
          }
          if (leftBones.rightArm) {
            leftBones.rightArm.rotation.x = THREE.MathUtils.lerp(leftBones.rightArm.rotation.x, -2.192, 0.1);
            leftBones.rightArm.rotation.y = THREE.MathUtils.lerp(leftBones.rightArm.rotation.y, -1.592, 0.1);
            leftBones.rightArm.rotation.z = THREE.MathUtils.lerp(leftBones.rightArm.rotation.z, -0.742 - idleSway * 0.1, 0.1);
          }
          // Forearms: maintain inward pronation towards thighs
          if (leftBones.leftForeArm) leftBones.leftForeArm.rotation.set(0, -0.45, 0);
          if (leftBones.rightForeArm) leftBones.rightForeArm.rotation.set(0, 0.45, 0);
          // Wrists: natural relaxed downward drop
          if (leftBones.leftHand) leftBones.leftHand.rotation.set(0.05, -0.10, -0.05);
          if (leftBones.rightHand) leftBones.rightHand.rotation.set(0.05, 0.10, 0.05);
          if (leftBones.spine) leftBones.spine.rotation.set(0, 0, 0);

          // Male resting arms
          if (rightBones.leftArm) {
            rightBones.leftArm.rotation.x = THREE.MathUtils.lerp(rightBones.leftArm.rotation.x, 1.350, 0.1);
            rightBones.leftArm.rotation.y = THREE.MathUtils.lerp(rightBones.leftArm.rotation.y, -0.600, 0.1);
            rightBones.leftArm.rotation.z = THREE.MathUtils.lerp(rightBones.leftArm.rotation.z, -0.100 + idleSway * 0.1, 0.1);
          }
          if (rightBones.rightArm) {
            rightBones.rightArm.rotation.x = THREE.MathUtils.lerp(rightBones.rightArm.rotation.x, 1.350, 0.1);
            rightBones.rightArm.rotation.y = THREE.MathUtils.lerp(rightBones.rightArm.rotation.y, 0.600, 0.1);
            rightBones.rightArm.rotation.z = THREE.MathUtils.lerp(rightBones.rightArm.rotation.z, 0.100 - idleSway * 0.1, 0.1);
          }
          if (rightBones.leftForeArm) rightBones.leftForeArm.rotation.set(0, 0, 0);
          if (rightBones.rightForeArm) rightBones.rightForeArm.rotation.set(0, 0, 0);
          if (rightBones.spine) rightBones.spine.rotation.set(0, 0, 0);

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
  }, [isRotating, partnerGlbUrl, myGlbUrl, localMyGlb, localPartnerGlb, applyAllWardrobe, boyWardrobe, girlWardrobe]);

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
          
          {/* Badge & Active Wardrobe Toggle */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-white shadow-xl">
              <Box size={14} className="text-amber-400" />
              <span className="text-xs font-black tracking-tight">Real 3D WebGL</span>
            </div>

            {/* Quick Character Indicator */}
            <div className="hidden sm:flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] font-bold text-slate-200">
              <span>{myName}</span>
              <span className="text-rose-400">♥</span>
              <span>{partnerName}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            
            {/* Wardrobe Toggle */}
            <button
              onClick={() => setShowWardrobe(!showWardrobe)}
              className={`px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold ${
                showWardrobe 
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-stone-950 font-black ring-2 ring-amber-300' 
                  : 'bg-black/60 hover:bg-black/80 text-white'
              }`}
              title="Change Clothes, Pants, Jackets & Style"
            >
              <Shirt size={13} className={showWardrobe ? 'text-stone-950' : 'text-amber-400'} />
              <span>Wardrobe</span>
            </button>

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

        {/* Bottom Interaction Hint */}
        <div className="absolute bottom-4 inset-x-0 flex flex-col items-center pointer-events-none z-20">
          <p className="text-[10px] text-slate-400/80 font-medium px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/5">
            Drag to rotate 360° • Pinch to zoom
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* INDEPENDENT BOY & GIRL WARDROBE DRAWER */}
        {/* ------------------------------------------------------------- */}
        {showWardrobe && (
          <div className="absolute inset-x-2.5 bottom-2.5 z-30 bg-[#10141f]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3 shadow-2xl animate-fadeIn flex flex-col gap-2">
            
            {/* Top Bar: Target Selector: [ 🙋‍♂️ Boy's Closet ] [ 🙋‍♀️ Girl's Closet ] [ ⚡ Matching Sets ] */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                
                {/* Boy Closet */}
                <button
                  onClick={() => setWardrobeTarget('boy')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    wardrobeTarget === 'boy'
                      ? 'bg-sky-500 text-stone-950 font-black shadow-md ring-2 ring-sky-300'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <User size={13} />
                  <span>Boy (Me)</span>
                  {activeRole !== 'boy' && <Lock size={10} className="text-slate-400 opacity-70" />}
                </button>

                {/* Girl Closet */}
                <button
                  onClick={() => setWardrobeTarget('girl')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    wardrobeTarget === 'girl'
                      ? 'bg-rose-500 text-white font-black shadow-md ring-2 ring-rose-300'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Heart size={13} className="fill-white" />
                  <span>Girl ({partnerName})</span>
                  {activeRole !== 'girl' && <Lock size={10} className="text-slate-400 opacity-70" />}
                </button>

                {/* Couple Matching Sets */}
                <button
                  onClick={() => setWardrobeTarget('sets')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    wardrobeTarget === 'sets'
                      ? 'bg-amber-400 text-stone-950 font-black shadow-md ring-2 ring-amber-300'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Sparkles size={13} />
                  <span className="hidden sm:inline">Couple</span>
                  <span>Sets</span>
                </button>
              </div>

              {/* Active Role Control & Close Button */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const nextRole = activeRole === 'boy' ? 'girl' : 'boy';
                    setActiveRole(nextRole);
                    setWardrobeTarget(nextRole);
                    playSfx('chime');
                    toast.success(`Active control: ${nextRole === 'boy' ? 'Boy (Me)' : `Girl (${partnerName})`}`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-slate-300 border border-white/15 flex items-center gap-1.5 transition-all"
                  title="Switch between Boy and Girl control"
                >
                  <span className="opacity-75">Control:</span>
                  <span className="font-bold text-white">{activeRole === 'boy' ? '🙋‍♂️ Boy' : '🙋‍♀️ Girl'}</span>
                  <RefreshCw size={10} className="text-amber-400" />
                </button>

                <button
                  onClick={() => setShowWardrobe(false)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                  title="Close Wardrobe"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* BOY WARDROBE CONTROLS */}
            {/* --------------------------------------------------------- */}
            {wardrobeTarget === 'boy' && (
              <div className="flex flex-col gap-2">
                {activeRole !== 'boy' ? (
                  <div className="p-2.5 bg-sky-950/40 border border-sky-500/20 rounded-2xl flex items-center justify-between text-xs text-sky-200">
                    <div className="flex items-center gap-2">
                      <Lock size={13} className="text-sky-400 flex-shrink-0" />
                      <span>Boy's Wardrobe is locked. (Boy only controlled by Boy).</span>
                    </div>
                    <button
                      onClick={() => { setActiveRole('boy'); playSfx('chime'); }}
                      className="px-2.5 py-1 rounded-xl bg-sky-500 text-stone-950 font-bold hover:bg-sky-400 text-[11px] flex-shrink-0 ml-2"
                    >
                      Control as Boy
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Boy Sub-Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'tops', label: `Tops (${BOY_TOPS.length})`, icon: '🧥' },
                        { id: 'pants', label: `Pants (${BOY_BOTTOMS.length})`, icon: '👖' },
                        { id: 'shoes', label: `Shoes (${BOY_SHOES.length})`, icon: '👟' },
                        { id: 'skin', label: `Skin Tone (${SKIN_TONES.length})`, icon: '🌸' },
                        { id: 'hair', label: `Hair (${HAIR_COLORS.length})`, icon: '💇' },
                        { id: 'shades', label: 'Shades 🕶️', icon: '🕶️' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setBoySubTab(tab.id)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                            boySubTab === tab.id
                              ? 'bg-white/20 text-sky-400 border border-sky-400/40'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Boy Items Content */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-white/20">
                      {boySubTab === 'tops' && BOY_TOPS.map((item) => {
                        const isSelected = boyWardrobe.top === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateBoy('top', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-sky-400" />}
                          </button>
                        );
                      })}

                      {boySubTab === 'pants' && BOY_BOTTOMS.map((item) => {
                        const isSelected = boyWardrobe.bottom === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateBoy('bottom', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-sky-400" />}
                          </button>
                        );
                      })}

                      {boySubTab === 'shoes' && BOY_SHOES.map((item) => {
                        const isSelected = boyWardrobe.shoes === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateBoy('shoes', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-sky-400" />}
                          </button>
                        );
                      })}

                      {boySubTab === 'skin' && SKIN_TONES.map((tone) => {
                        const isSelected = (boyWardrobe.skin || 'fair_warm') === tone.id;
                        return (
                          <button
                            key={tone.id}
                            onClick={() => handleUpdateBoy('skin', tone.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: tone.swatch }} />
                            <span className="text-xs font-bold text-white">{tone.name}</span>
                            {isSelected && <Check size={12} className="text-sky-400" />}
                          </button>
                        );
                      })}

                      {boySubTab === 'hair' && HAIR_COLORS.map((hair) => {
                        const isSelected = boyWardrobe.hair === hair.id;
                        return (
                          <button
                            key={hair.id}
                            onClick={() => handleUpdateBoy('hair', hair.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: hair.swatch }} />
                            <span className="text-xs font-bold text-white">{hair.name}</span>
                            {isSelected && <Check size={12} className="text-sky-400" />}
                          </button>
                        );
                      })}

                      {boySubTab === 'shades' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateBoy('shades', !boyWardrobe.shades)}
                            className={`px-4 py-2 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all ${
                              boyWardrobe.shades
                                ? 'bg-sky-500 text-stone-950 border-sky-400 ring-2 ring-sky-300'
                                : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>🕶️ Designer Shades</span>
                            <span className="text-[10px] opacity-80">{boyWardrobe.shades ? 'ENABLED' : 'DISABLED'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* GIRL WARDROBE CONTROLS */}
            {/* --------------------------------------------------------- */}
            {wardrobeTarget === 'girl' && (
              <div className="flex flex-col gap-2">
                {activeRole !== 'girl' ? (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/20 rounded-2xl flex items-center justify-between text-xs text-rose-200">
                    <div className="flex items-center gap-2">
                      <Lock size={13} className="text-rose-400 flex-shrink-0" />
                      <span>{partnerName}'s Wardrobe is locked. (Girl only controlled by Girl).</span>
                    </div>
                    <button
                      onClick={() => { setActiveRole('girl'); playSfx('chime'); }}
                      className="px-2.5 py-1 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 text-[11px] flex-shrink-0 ml-2"
                    >
                      Control as Girl
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Girl Sub-Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'jackets', label: `Jackets (${GIRL_JACKETS.length})`, icon: '🧥' },
                        { id: 'tops', label: `Tops (${GIRL_TOPS.length})`, icon: '👚' },
                        { id: 'pants', label: `Pants (${GIRL_PANTS.length})`, icon: '👖' },
                        { id: 'shoes', label: `Shoes (${GIRL_SHOES.length})`, icon: '👢' },
                        { id: 'skin', label: `Skin Tone (${SKIN_TONES.length})`, icon: '🌸' },
                        { id: 'hair', label: `Hair (${HAIR_COLORS.length})`, icon: '💇' },
                        { id: 'accessories', label: 'Glasses / Tie', icon: '✨' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setGirlSubTab(tab.id)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                            girlSubTab === tab.id
                              ? 'bg-white/20 text-rose-400 border border-rose-400/40'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Girl Items Content */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-white/20">
                      {girlSubTab === 'jackets' && GIRL_JACKETS.map((item) => {
                        const isSelected = girlWardrobe.jacket === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateGirl('jacket', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-rose-400" />}
                          </button>
                        );
                      })}

                      {girlSubTab === 'tops' && GIRL_TOPS.map((item) => {
                        const isSelected = girlWardrobe.top === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateGirl('top', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-rose-400" />}
                          </button>
                        );
                      })}

                      {girlSubTab === 'pants' && GIRL_PANTS.map((item) => {
                        const isSelected = girlWardrobe.pants === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateGirl('pants', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-rose-400" />}
                          </button>
                        );
                      })}

                      {girlSubTab === 'shoes' && GIRL_SHOES.map((item) => {
                        const isSelected = girlWardrobe.shoes === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateGirl('shoes', item.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: item.swatch }} />
                            <span className="text-xs font-bold text-white">{item.name}</span>
                            {isSelected && <Check size={12} className="text-rose-400" />}
                          </button>
                        );
                      })}

                      {girlSubTab === 'skin' && SKIN_TONES.map((tone) => {
                        const isSelected = (girlWardrobe.skin || 'fair_warm') === tone.id;
                        return (
                          <button
                            key={tone.id}
                            onClick={() => handleUpdateGirl('skin', tone.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: tone.swatch }} />
                            <span className="text-xs font-bold text-white">{tone.name}</span>
                            {isSelected && <Check size={12} className="text-rose-400" />}
                          </button>
                        );
                      })}

                      {girlSubTab === 'hair' && HAIR_COLORS.map((hair) => {
                        const isSelected = girlWardrobe.hair === hair.id;
                        return (
                          <button
                            key={hair.id}
                            onClick={() => handleUpdateGirl('hair', hair.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected ? 'bg-rose-500/20 border-rose-400 shadow-md ring-1 ring-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: hair.swatch }} />
                            <span className="text-xs font-bold text-white">{hair.name}</span>
                            {isSelected && <Check size={12} className="text-rose-400" />}
                          </button>
                        );
                      })}

                      {girlSubTab === 'accessories' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateGirl('glasses', !girlWardrobe.glasses)}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                              girlWardrobe.glasses
                                ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-300'
                                : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>👓 Glasses</span>
                            <span className="text-[10px] opacity-80">{girlWardrobe.glasses ? 'ON' : 'OFF'}</span>
                          </button>

                          <button
                            onClick={() => handleUpdateGirl('tie', !girlWardrobe.tie)}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                              girlWardrobe.tie
                                ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-300'
                                : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>👔 Silk Tie</span>
                            <span className="text-[10px] opacity-80">{girlWardrobe.tie ? 'ON' : 'OFF'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* COORDINATED COUPLE PRESETS (QUICK MATCH) */}
            {/* --------------------------------------------------------- */}
            {wardrobeTarget === 'sets' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-white/20">
                {COUPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{preset.name}</span>
                      <span className="text-[10px] text-slate-400">Match Both ✨</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

          </div>
        )}

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

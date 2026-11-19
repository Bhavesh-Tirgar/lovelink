import React from 'react';
import { BITMOJI_SKIN_TONES, BITMOJI_HAIR_COLORS } from './BitmojiAvatar';

export const OUTFIT_THEMES = {
  varsity_jacket: {
    id: 'varsity_jacket',
    name: 'College Varsity & Denim',
    category: 'Casual',
    emoji: '🧥',
    male: {
      jacket: '#1E3A8A',     // Deep Navy Bomber
      sleeves: '#F3F4F6',    // Cream leather sleeves
      accent: '#DC2626',     // Red varsity stripe
      pants: '#1E293B',      // Dark indigo street denim
      shoes: '#FFFFFF',      // Crisp white sneakers
      collar: '#DC2626',
    },
    female: {
      jacket: '#D97706',     // Amber Gold Cropped Varsity
      sleeves: '#FEF3C7',    // Cream sleeves
      accent: '#1E3A8A',     // Navy trim
      pants: '#3B82F6',      // Classic blue high-rise denim
      shoes: '#FFFFFF',
      collar: '#1E3A8A',
    }
  },
  date_night_velvet: {
    id: 'date_night_velvet',
    name: 'Rose-Gold Velvet & Tuxedo',
    category: 'Date Night',
    emoji: '✨',
    male: {
      jacket: '#0F131A',     // Midnight Black Tuxedo
      sleeves: '#151A24',
      accent: '#F43F5E',     // Rose-Gold silk pocket square
      pants: '#0B0E14',      // Tailored dress trousers
      shoes: '#111318',      // Polished patent leather shoes
      collar: '#F43F5E',
    },
    female: {
      jacket: '#F43F5E',     // Rose-Gold velvet / satin gown
      sleeves: '#FB7185',
      accent: '#FFE4E6',     // Shimmer accent
      pants: '#E11D48',      // Long elegant gown drape
      shoes: '#FFE4E6',      // Rose-gold heels
      collar: '#FFE4E6',
    }
  },
  silk_sleepwear: {
    id: 'silk_sleepwear',
    name: 'Midnight Silk Pajamas',
    category: 'Sleepwear',
    emoji: '🛌',
    male: {
      jacket: '#1E1B4B',     // Deep Midnight Navy Silk
      sleeves: '#282467',
      accent: '#E0E7FF',     // White satin piping
      pants: '#1E1B4B',      // Silk lounge trousers
      shoes: '#312E81',      // Plush slippers
      collar: '#E0E7FF',
    },
    female: {
      jacket: '#581C87',     // Royal Plum Silk Camisole
      sleeves: '#6B21A8',
      accent: '#FDF4FF',     // Pearl piping
      pants: '#581C87',      // Matching silk pajama pants
      shoes: '#FDF4FF',
      collar: '#FDF4FF',
    }
  },
  traditional_royal: {
    id: 'traditional_royal',
    name: 'Royal Silk Kurta & Lehenga',
    category: 'Festive',
    emoji: '🥻',
    male: {
      jacket: '#064E3B',     // Emerald Royal Silk Kurta
      sleeves: '#047857',
      accent: '#F59E0B',     // Gold Zari embroidery
      pants: '#FEF3C7',      // Raw silk cream churidar
      shoes: '#B45309',      // Embroidered jutti
      collar: '#F59E0B',
    },
    female: {
      jacket: '#9F1239',     // Regal Crimson Choli
      sleeves: '#BE123C',
      accent: '#FBBF24',     // Heavy gold border
      pants: '#881337',      // Embroidered celebratory lehenga
      shoes: '#F59E0B',
      collar: '#FBBF24',
    }
  },
  summer_resort: {
    id: 'summer_resort',
    name: 'Breezy Linen & Floral Sundress',
    category: 'Vacation',
    emoji: '🏖️',
    male: {
      jacket: '#F8FAFC',     // Crisp White Resort Linen
      sleeves: '#F1F5F9',
      accent: '#0D9488',     // Coastal teal embroidery
      pants: '#D6D3D1',      // Sand linen chinos
      shoes: '#78716C',      // Woven loafers
      collar: '#0D9488',
    },
    female: {
      jacket: '#0D9488',     // Tropical Teal Sundress
      sleeves: '#14B8A6',
      accent: '#CCFBF1',     // Pastel floral motif
      pants: '#0F766E',      // Flared summer dress hem
      shoes: '#FEF08A',      // Straw espadrilles
      collar: '#CCFBF1',
    }
  },
  obsidian_cyber: {
    id: 'obsidian_cyber',
    name: 'Dark Luxury Obsidian Stealth',
    category: 'Signature',
    emoji: '🖤',
    male: {
      jacket: '#111318',     // Matte Obsidian Tech Trench
      sleeves: '#181C24',
      accent: '#F43F5E',     // Neon Rose-Gold cyber seam
      pants: '#090B0E',      // Cyber joggers
      shoes: '#1F242F',      // Sleek tech runners
      collar: '#F43F5E',
    },
    female: {
      jacket: '#161922',     // Obsidian Tech Crop
      sleeves: '#1F2430',
      accent: '#F43F5E',     // Luminous accent
      pants: '#0E1015',      // High-waist tech skirt
      shoes: '#F43F5E',
      collar: '#F43F5E',
    }
  }
};

export default function RomanticCoupleScene({
  action = 'couch',
  myAvatar = {},
  partnerAvatar = {},
  myName = 'You',
  partnerName = 'Partner',
  isNightMode = true,
  onInteract = () => {},
}) {
  const outfitId = myAvatar?.outfit || 'varsity_jacket';
  const outfit = OUTFIT_THEMES[outfitId] || OUTFIT_THEMES.varsity_jacket;

  // Normalize actions
  let activeScene = action;
  if (action === 'sitting_on_couch' || action === 'watching_movie' || action === 'idle') activeScene = 'couch';
  if (action === 'eating') activeScene = 'toast';

  const mSkin = BITMOJI_SKIN_TONES[myAvatar?.skin] || BITMOJI_SKIN_TONES.fair;
  const fSkin = BITMOJI_SKIN_TONES[partnerAvatar?.skin] || BITMOJI_SKIN_TONES.fair;

  const mHair = BITMOJI_HAIR_COLORS[myAvatar?.hair_color] || BITMOJI_HAIR_COLORS.jet_black;
  const fHair = BITMOJI_HAIR_COLORS[partnerAvatar?.hair_color] || BITMOJI_HAIR_COLORS.dark_brown;

  const mOutfit = outfit.male;
  const fOutfit = outfit.female;

  return (
    <div 
      onClick={onInteract}
      className="relative w-full max-w-md mx-auto flex flex-col items-center select-none cursor-pointer group transition-transform duration-300 hover:scale-[1.02]"
    >
      {/* ── Soft Ambient Backlight ── */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-88 h-72 sm:h-88 rounded-full blur-3xl pointer-events-none transition-all duration-700 -z-10 ${
          isNightMode ? 'bg-indigo-600/15' : 'bg-rose-500/20'
        }`} 
      />

      {/* ============================================================= */}
      {/* 1. COUCH SCENE (Lounge Velvet Sofa Cuddle) */}
      {/* ============================================================= */}
      {activeScene === 'couch' && (
        <svg viewBox="0 0 400 320" className="w-full h-auto drop-shadow-[0_20px_45px_rgba(0,0,0,0.6)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sofaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1C212E" />
              <stop offset="60%" stopColor="#141824" />
              <stop offset="100%" stopColor="#0B0E14" />
            </linearGradient>
            <linearGradient id="sofaCushion" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#252C3D" />
              <stop offset="100%" stopColor="#171C28" />
            </linearGradient>
            <linearGradient id="throwPillowRose" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#9F1239" />
            </linearGradient>
            <linearGradient id="throwBlanket" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Floor Shadow */}
          <ellipse cx="200" cy="290" rx="170" ry="16" fill="#000000" fillOpacity="0.45" />

          {/* Luxury Velvet Sofa Backrest */}
          <rect x="50" y="110" width="300" height="130" rx="36" fill="url(#sofaGrad)" stroke="#2B3244" strokeWidth="2" />
          
          {/* Tufted Sofa Seams */}
          <line x1="120" y1="130" x2="120" y2="210" stroke="#2B3244" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <line x1="200" y1="130" x2="200" y2="210" stroke="#2B3244" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <line x1="280" y1="130" x2="280" y2="210" stroke="#2B3244" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

          {/* Sofa Left & Right Rounded Armrests */}
          <rect x="36" y="160" width="40" height="95" rx="20" fill="#202738" stroke="#2E374A" strokeWidth="2" />
          <rect x="324" y="160" width="40" height="95" rx="20" fill="#202738" stroke="#2E374A" strokeWidth="2" />

          {/* Warm Throw Blanket Draped on Left Arm */}
          <path d="M42 180 Q 56 185 58 225 Q 52 250 44 245 Z" fill="url(#throwBlanket)" />
          <line x1="44" y1="242" x2="56" y2="242" stroke="#FEF3C7" strokeWidth="1" strokeDasharray="2 2" />

          {/* Rose-Gold Throw Pillow on Right */}
          <rect x="300" y="180" width="34" height="42" rx="10" transform="rotate(-12 300 180)" fill="url(#throwPillowRose)" stroke="#FDA4AF" strokeWidth="1" opacity="0.9" />

          {/* Sofa Seat Cushions */}
          <rect x="68" y="215" width="128" height="50" rx="16" fill="url(#sofaCushion)" stroke="#2B3244" strokeWidth="1.5" />
          <rect x="204" y="215" width="128" height="50" rx="16" fill="url(#sofaCushion)" stroke="#2B3244" strokeWidth="1.5" />

          {/* Sofa Wooden / Metal Angled Feet */}
          <path d="M70 265 L 62 292" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
          <path d="M330 265 L 338 292" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
          <path d="M195 265 L 195 292" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />

          {/* ── CHARACTERS SEATED TOGETHER ── */}

          {/* GUY (Right Side, Arm Draped Behind Girl) */}
          <g id="guy-seated">
            {/* Guy Arm resting along top of sofa behind partner */}
            <path d="M250 145 C 220 135, 175 145, 155 160" stroke={mOutfit.sleeves} strokeWidth="14" strokeLinecap="round" />
            <circle cx="152" cy="162" r="7" fill={mSkin.base} />

            {/* Guy Legs in street denim/pants */}
            <rect x="235" y="225" width="22" height="55" rx="10" fill={mOutfit.pants} />
            <rect x="265" y="225" width="22" height="55" rx="10" fill={mOutfit.pants} />
            {/* Guy Shoes */}
            <ellipse cx="246" cy="282" rx="13" ry="7" fill={mOutfit.shoes} stroke="#E2E8F0" strokeWidth="1" />
            <ellipse cx="276" cy="282" rx="13" ry="7" fill={mOutfit.shoes} stroke="#E2E8F0" strokeWidth="1" />

            {/* Guy Torso (Jacket / Outfit) */}
            <path d="M225 155 C 225 145, 285 145, 285 155 L 288 230 C 288 235, 222 235, 222 230 Z" fill={mOutfit.jacket} />
            {/* Guy Outfit Accent / Collar */}
            <path d="M245 155 L 255 185 L 265 155" stroke={mOutfit.accent} strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Guy Right Arm in lap */}
            <path d="M285 165 C 298 185, 295 205, 280 220" stroke={mOutfit.sleeves} strokeWidth="12" strokeLinecap="round" />
            <circle cx="278" cy="222" r="6" fill={mSkin.base} />

            {/* Guy Neck */}
            <rect x="248" y="138" width="14" height="18" rx="4" fill={mSkin.shadow} />

            {/* Guy Head */}
            <circle cx="255" cy="120" r="22" fill={mSkin.base} />
            {/* Guy Hair (Styled short fade / textured) */}
            <path d="M233 118 C 233 96, 277 96, 277 118 C 277 106, 268 100, 255 100 C 242 100, 233 106, 233 118 Z" fill={mHair.base} />
            <path d="M238 108 Q 255 98 272 108" stroke={mHair.highlight} strokeWidth="2" strokeLinecap="round" />
            {/* Guy Facial Expression (Affectionate smile looking at partner) */}
            <circle cx="248" cy="118" r="2.5" fill="#1E293B" />
            <circle cx="262" cy="118" r="2.5" fill="#1E293B" />
            <path d="M246 114 Q 250 112 254 114" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M260 114 Q 264 112 268 114" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M250 128 Q 255 133 260 128" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            {/* Subtle Blush */}
            <circle cx="244" cy="123" r="3.5" fill={mSkin.blush} opacity="0.6" />
          </g>

          {/* GIRL (Left Side, Nestled Against Guy) */}
          <g id="girl-seated">
            {/* Girl Back Hair (Flowing waves) */}
            <path d="M125 125 C 115 150, 115 190, 130 215 C 138 215, 142 195, 140 165 Z" fill={fHair.base} />

            {/* Girl Legs tucked comfortably on sofa */}
            <path d="M145 225 Q 165 240 185 245 Q 205 242 225 240" stroke={fOutfit.pants} strokeWidth="20" strokeLinecap="round" />
            {/* Girl Shoes */}
            <ellipse cx="225" cy="240" rx="9" ry="6" fill={fOutfit.shoes} stroke="#E2E8F0" strokeWidth="1" />

            {/* Girl Torso (Dress / Outfit) */}
            <path d="M142 165 C 145 155, 195 155, 198 165 L 202 235 C 202 238, 140 238, 140 235 Z" fill={fOutfit.jacket} />
            {/* Girl Collar / Accent */}
            <path d="M160 165 Q 170 178 180 165" stroke={fOutfit.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Girl Hand resting on Guy's chest / lap */}
            <path d="M185 185 C 205 195, 218 200, 230 205" stroke={fOutfit.sleeves} strokeWidth="10" strokeLinecap="round" />
            <circle cx="232" cy="206" r="5" fill={fSkin.base} />

            {/* Girl Neck */}
            <rect x="162" y="145" width="12" height="16" rx="4" fill={fSkin.shadow} />

            {/* Girl Head (Resting slightly against Guy) */}
            <g transform="rotate(8 168 130)">
              <circle cx="168" cy="130" r="20" fill={fSkin.base} />
              {/* Girl Hair Front / Bangs */}
              <path d="M148 126 C 148 106, 188 106, 188 126 C 188 112, 178 108, 168 108 C 158 108, 148 112, 148 126 Z" fill={fHair.base} />
              <path d="M152 115 Q 168 106 184 115" stroke={fHair.highlight} strokeWidth="2" strokeLinecap="round" />
              
              {/* Girl Eyes (Gently closed with sweet eyelashes) */}
              <path d="M158 128 Q 163 133 167 128" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M172 128 Q 177 133 181 128" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <line x1="166" y1="129" x2="169" y2="126" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="180" y1="129" x2="183" y2="126" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
              
              {/* Sweet smile */}
              <path d="M165 137 Q 170 142 175 137" stroke="#BE123C" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              {/* Romantic Cheerful Blush */}
              <ellipse cx="156" cy="133" rx="4.5" ry="3" fill={fSkin.blush} opacity="0.75" />
              <ellipse cx="182" cy="133" rx="4.5" ry="3" fill={fSkin.blush} opacity="0.75" />
            </g>
          </g>

          {/* Floating Warm Heart */}
          <g className="animate-bounce" style={{ transformOrigin: '200px 90px' }}>
            <path d="M200 85 C 195 75, 180 75, 180 90 C 180 102, 200 112, 200 115 C 200 112, 220 102, 220 90 C 220 75, 205 75, 200 85 Z" fill="#F43F5E" />
            <circle cx="190" cy="83" r="2" fill="#FFE4E6" />
          </g>
        </svg>
      )}

      {/* ============================================================= */}
      {/* 2. WARM HUG SCENE (Intimate Loving Full Embrace) */}
      {/* ============================================================= */}
      {activeScene === 'hug' && (
        <svg viewBox="0 0 360 340" className="w-full h-auto drop-shadow-[0_20px_45px_rgba(244,63,94,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground Contact Shadow */}
          <ellipse cx="180" cy="315" rx="90" ry="14" fill="#000000" fillOpacity="0.5" />

          {/* Pulsing Love Glow */}
          <circle cx="180" cy="160" r="110" fill="#F43F5E" fillOpacity="0.12" className="animate-pulse" />

          {/* Floating Heart Particles */}
          <g className="animate-bounce">
            <path d="M180 35 C 175 25, 160 25, 160 40 C 160 52, 180 62, 180 65 C 180 62, 200 52, 200 40 C 200 25, 185 25, 180 35 Z" fill="#F43F5E" />
            <path d="M130 65 C 127 58, 116 58, 116 68 C 116 76, 130 83, 130 85 C 130 83, 144 76, 144 68 C 144 58, 133 58, 130 65 Z" fill="#FB7185" />
            <path d="M230 65 C 227 58, 216 58, 216 68 C 216 76, 230 83, 230 85 C 230 83, 244 76, 244 68 C 244 58, 233 58, 230 65 Z" fill="#FB7185" />
          </g>

          {/* Lower Bodies & Legs (Naturally Interlaced Standing) */}
          <rect x="145" y="225" width="20" height="75" rx="8" fill={mOutfit.pants} />
          <rect x="175" y="225" width="20" height="75" rx="8" fill={fOutfit.pants} />
          <rect x="195" y="225" width="20" height="75" rx="8" fill={mOutfit.pants} />
          <ellipse cx="155" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />
          <ellipse cx="185" cy="305" rx="11" ry="6" fill={fOutfit.shoes} />
          <ellipse cx="205" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />

          {/* Guy Body (Turned slightly inward) */}
          <path d="M130 145 C 130 135, 185 135, 185 145 L 180 230 C 180 235, 130 235, 130 230 Z" fill={mOutfit.jacket} />
          
          {/* Girl Body (Held close against Guy) */}
          <path d="M165 148 C 165 138, 220 138, 220 148 L 215 230 C 215 235, 165 235, 165 230 Z" fill={fOutfit.jacket} />

          {/* Guy Head (Tilted against her hair) */}
          <circle cx="152" cy="115" r="24" fill={mSkin.base} />
          <path d="M128 112 C 128 90, 174 90, 174 112 C 174 100, 165 94, 152 94 C 139 94, 128 100, 128 112 Z" fill={mHair.base} />
          {/* Guy Eyes Closed in Tender Hug */}
          <path d="M144 116 Q 148 120 152 116" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M143 124 Q 148 128 153 124" stroke="#991B1B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="140" cy="120" r="3.5" fill={mSkin.blush} opacity="0.6" />

          {/* Girl Head (Nestled comfortably on Guy's shoulder) */}
          <g transform="rotate(-8 198 120)">
            <circle cx="198" cy="120" r="23" fill={fSkin.base} />
            {/* Long Hair Flowing Down Her Back */}
            <path d="M178 115 C 178 94, 220 94, 220 115 C 228 140, 232 185, 215 210 C 205 205, 205 170, 205 135 Z" fill={fHair.base} />
            {/* Girl Face Features */}
            <path d="M188 121 Q 193 125 197 121" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M186 128 Q 191 133 196 128" stroke="#BE123C" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="183" cy="123" r="4" fill={fSkin.blush} opacity="0.75" />
          </g>

          {/* ── INTERTWINED EMBRACING ARMS ── */}
          {/* 1. Girl Arm wrapped around Guy's neck/shoulder */}
          <path d="M210 155 C 200 135, 175 135, 150 142" stroke={fOutfit.sleeves} strokeWidth="13" strokeLinecap="round" />
          <circle cx="148" cy="143" r="6" fill={fSkin.base} />

          {/* 2. Guy Arm wrapped securely around Girl's waist & back */}
          <path d="M135 165 C 150 185, 190 185, 222 170" stroke={mOutfit.sleeves} strokeWidth="14" strokeLinecap="round" />
          <circle cx="224" cy="168" r="7" fill={mSkin.base} />

          {/* Romantic Sparkles */}
          <text x="90" y="110" className="text-xl animate-pulse">✨</text>
          <text x="245" y="110" className="text-xl animate-pulse">💖</text>
        </svg>
      )}

      {/* ============================================================= */}
      {/* 3. SWEET KISS SCENE (Tender Forehead & Lip Kiss) */}
      {/* ============================================================= */}
      {activeScene === 'kiss' && (
        <svg viewBox="0 0 360 340" className="w-full h-auto drop-shadow-[0_20px_45px_rgba(244,63,94,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground Shadow */}
          <ellipse cx="180" cy="315" rx="85" ry="14" fill="#000000" fillOpacity="0.5" />

          {/* Kiss Aura Halo */}
          <circle cx="180" cy="130" r="90" fill="#F43F5E" fillOpacity="0.15" className="animate-pulse" />

          {/* Kiss Floating Emojis */}
          <g className="animate-bounce">
            <text x="165" y="45" fontSize="26">💋</text>
            <text x="120" y="70" fontSize="18">✨</text>
            <text x="215" y="70" fontSize="18">💖</text>
          </g>

          {/* Legs & Shoes */}
          <rect x="125" y="220" width="22" height="80" rx="8" fill={mOutfit.pants} />
          <rect x="155" y="220" width="20" height="80" rx="8" fill={mOutfit.pants} />
          <rect x="185" y="220" width="20" height="80" rx="8" fill={fOutfit.pants} />
          <rect x="215" y="220" width="20" height="80" rx="8" fill={fOutfit.pants} />
          <ellipse cx="136" cy="305" rx="13" ry="6" fill={mOutfit.shoes} />
          <ellipse cx="165" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />
          <ellipse cx="195" cy="305" rx="11" ry="6" fill={fOutfit.shoes} />
          <ellipse cx="225" cy="305" rx="11" ry="6" fill={fOutfit.shoes} />

          {/* Guy Torso (Leaning forward toward girl) */}
          <path d="M120 145 C 120 135, 175 135, 175 145 L 175 225 C 175 230, 120 230, 120 225 Z" fill={mOutfit.jacket} />
          <path d="M140 145 L 150 175 L 160 145" stroke={mOutfit.accent} strokeWidth="2.5" fill="none" />

          {/* Girl Torso (Leaning in close) */}
          <path d="M185 145 C 185 135, 240 135, 240 145 L 235 225 C 235 230, 185 230, 185 225 Z" fill={fOutfit.jacket} />
          <path d="M205 145 Q 212 160 220 145" stroke={fOutfit.accent} strokeWidth="2" fill="none" />

          {/* Guy Arm gently touching her waist */}
          <path d="M130 160 C 150 185, 180 185, 205 175" stroke={mOutfit.sleeves} strokeWidth="12" strokeLinecap="round" />
          <circle cx="206" cy="174" r="6" fill={mSkin.base} />

          {/* Girl Arm resting gently on his chest */}
          <path d="M230 165 C 215 185, 185 185, 165 175" stroke={fOutfit.sleeves} strokeWidth="11" strokeLinecap="round" />
          <circle cx="163" cy="174" r="5" fill={fSkin.base} />

          {/* Guy Head Leaning In */}
          <g transform="rotate(10 155 115)">
            <circle cx="155" cy="115" r="23" fill={mSkin.base} />
            <path d="M132 112 C 132 90, 178 90, 178 112 C 178 100, 169 94, 155 94 C 141 94, 132 100, 132 112 Z" fill={mHair.base} />
            {/* Guy closed eyes & blush */}
            <path d="M152 116 Q 157 121 162 116" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="148" cy="121" r="3.5" fill={mSkin.blush} opacity="0.65" />
          </g>

          {/* Girl Head Leaning In (Lips Meeting) */}
          <g transform="rotate(-10 205 115)">
            <circle cx="205" cy="115" r="22" fill={fSkin.base} />
            {/* Flowing Hair */}
            <path d="M185 110 C 185 90, 227 90, 227 110 C 235 135, 238 175, 225 195 C 215 190, 212 160, 212 130 Z" fill={fHair.base} />
            {/* Girl closed eyes with eyelashes & blush */}
            <path d="M198 116 Q 203 121 207 116" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <line x1="206" y1="117" x2="209" y2="114" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="212" cy="120" r="4" fill={fSkin.blush} opacity="0.8" />
          </g>

          {/* Sweet Kiss Meeting Point Glow */}
          <circle cx="180" cy="122" r="5" fill="#FFE4E6" className="animate-ping" />
        </svg>
      )}

      {/* ============================================================= */}
      {/* 4. HOLDING HANDS SCENE (Gentle Walk Together) */}
      {/* ============================================================= */}
      {activeScene === 'hand_hold' && (
        <svg viewBox="0 0 360 340" className="w-full h-auto drop-shadow-[0_20px_45px_rgba(0,0,0,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground Shadows */}
          <ellipse cx="130" cy="315" rx="35" ry="10" fill="#000000" fillOpacity="0.4" />
          <ellipse cx="230" cy="315" rx="35" ry="10" fill="#000000" fillOpacity="0.4" />

          {/* Floating Affection Heart */}
          <g className="animate-bounce">
            <path d="M180 50 C 175 40, 160 40, 160 55 C 160 67, 180 77, 180 80 C 180 77, 200 67, 200 55 C 200 40, 185 40, 180 50 Z" fill="#F43F5E" />
          </g>

          {/* Guy Left Side */}
          <g id="guy-standing">
            <rect x="115" y="215" width="18" height="85" rx="7" fill={mOutfit.pants} />
            <rect x="138" y="215" width="18" height="85" rx="7" fill={mOutfit.pants} />
            <ellipse cx="124" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />
            <ellipse cx="147" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />

            <path d="M105 135 C 105 125, 165 125, 165 135 L 160 220 C 160 225, 110 225, 110 220 Z" fill={mOutfit.jacket} />
            <path d="M125 135 L 135 165 L 145 135" stroke={mOutfit.accent} strokeWidth="2.5" fill="none" />

            {/* Guy Outer Arm (Relaxed) */}
            <path d="M108 145 L 98 200" stroke={mOutfit.sleeves} strokeWidth="11" strokeLinecap="round" />
            <circle cx="98" cy="203" r="5" fill={mSkin.base} />

            {/* Guy Inner Arm (Reaching to hold hand) */}
            <path d="M162 145 C 168 175, 172 195, 176 210" stroke={mOutfit.sleeves} strokeWidth="11" strokeLinecap="round" />
            <circle cx="177" cy="212" r="5.5" fill={mSkin.base} />

            {/* Guy Head */}
            <circle cx="135" cy="100" r="22" fill={mSkin.base} />
            <path d="M113 98 C 113 76, 157 76, 157 98 C 157 86, 148 80, 135 80 C 122 80, 113 86, 113 98 Z" fill={mHair.base} />
            <circle cx="130" cy="98" r="2.5" fill="#1E293B" />
            <circle cx="144" cy="98" r="2.5" fill="#1E293B" />
            <path d="M132 108 Q 137 113 142 108" stroke="#991B1B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="126" cy="103" r="3" fill={mSkin.blush} opacity="0.6" />
          </g>

          {/* Girl Right Side */}
          <g id="girl-standing">
            <rect x="205" y="215" width="16" height="85" rx="7" fill={fOutfit.pants} />
            <rect x="226" y="215" width="16" height="85" rx="7" fill={fOutfit.pants} />
            <ellipse cx="213" cy="305" rx="10" ry="5" fill={fOutfit.shoes} />
            <ellipse cx="234" cy="305" rx="10" ry="5" fill={fOutfit.shoes} />

            <path d="M195 138 C 195 128, 250 128, 250 138 L 245 220 C 245 225, 200 225, 200 220 Z" fill={fOutfit.jacket} />
            <path d="M215 138 Q 222 152 230 138" stroke={fOutfit.accent} strokeWidth="2" fill="none" />

            {/* Girl Inner Arm (Holding hand) */}
            <path d="M200 148 C 194 175, 188 195, 184 210" stroke={fOutfit.sleeves} strokeWidth="10" strokeLinecap="round" />
            <circle cx="183" cy="212" r="5" fill={fSkin.base} />

            {/* Girl Outer Arm (Relaxed) */}
            <path d="M248 148 L 256 198" stroke={fOutfit.sleeves} strokeWidth="10" strokeLinecap="round" />
            <circle cx="257" cy="201" r="5" fill={fSkin.base} />

            {/* Girl Head */}
            <circle cx="225" cy="104" r="20" fill={fSkin.base} />
            <path d="M205 100 C 205 80, 245 80, 245 100 C 252 125, 255 160, 245 180 C 238 175, 235 150, 235 125 Z" fill={fHair.base} />
            <circle cx="220" cy="102" r="2.2" fill="#1E293B" />
            <circle cx="232" cy="102" r="2.2" fill="#1E293B" />
            <path d="M222 111 Q 226 115 230 111" stroke="#BE123C" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="216" cy="106" r="3.5" fill={fSkin.blush} opacity="0.7" />
          </g>

          {/* ── INTERTWINED HANDS CONNECTION POINT ── */}
          <g id="clasped-hands">
            {/* Glowing Connection aura */}
            <circle cx="180" cy="212" r="10" fill="#F43F5E" fillOpacity="0.25" className="animate-ping" />
            {/* Clasping fingers */}
            <ellipse cx="180" cy="212" rx="7" ry="5" fill={mSkin.shadow} />
            <path d="M176 210 Q 180 216 184 210" stroke="#F43F5E" strokeWidth="1.5" />
            <text x="174" y="200" fontSize="11">💖</text>
          </g>
        </svg>
      )}

      {/* ============================================================= */}
      {/* 5. BED SPOON SCENE (Luxury Bed Cuddle & Sleep) */}
      {/* ============================================================= */}
      {activeScene === 'spoon' && (
        <svg viewBox="0 0 400 320" className="w-full h-auto drop-shadow-[0_20px_45px_rgba(99,102,241,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="headboardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#252A38" />
              <stop offset="100%" stopColor="#141722" />
            </linearGradient>
            <linearGradient id="duvetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#312E81" />
              <stop offset="50%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#0F101A" />
            </linearGradient>
          </defs>

          {/* Floor Shadow */}
          <ellipse cx="200" cy="295" rx="160" ry="14" fill="#000000" fillOpacity="0.5" />

          {/* Luxury Padded Headboard */}
          <rect x="50" y="80" width="300" height="110" rx="24" fill="url(#headboardGrad)" stroke="#374151" strokeWidth="2" />
          <line x1="125" y1="85" x2="125" y2="185" stroke="#374151" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <line x1="200" y1="85" x2="200" y2="185" stroke="#374151" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <line x1="275" y1="85" x2="275" y2="185" stroke="#374151" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

          {/* Plush White Pillows */}
          <rect x="75" y="145" width="115" height="45" rx="14" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="210" y="145" width="115" height="45" rx="14" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Sleeping Faces Resting on Pillows */}
          {/* Guy (Behind) */}
          <g transform="rotate(8 245 160)">
            <circle cx="245" cy="155" r="22" fill={mSkin.base} />
            <path d="M225 152 C 225 130, 267 130, 267 152 C 267 140, 258 134, 245 134 C 232 134, 225 140, 225 152 Z" fill={mHair.base} />
            {/* Peaceful Sleeping Eye */}
            <path d="M236 158 Q 242 163 248 158" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="234" cy="163" r="3" fill={mSkin.blush} opacity="0.5" />
          </g>

          {/* Girl (Nestled in Front) */}
          <g transform="rotate(12 185 168)">
            <circle cx="185" cy="165" r="21" fill={fSkin.base} />
            {/* Long Hair spread on pillow */}
            <path d="M155 160 C 155 140, 205 140, 205 160 C 215 185, 215 210, 195 215 C 180 215, 175 190, 175 175 Z" fill={fHair.base} />
            {/* Girl Sleeping Eye with Eyelashes */}
            <path d="M176 168 Q 182 173 188 168" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <line x1="187" y1="169" x2="190" y2="166" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="174" cy="172" r="3.5" fill={fSkin.blush} opacity="0.7" />
          </g>

          {/* Soft Textured Bed Quilt / Duvet covering their bodies */}
          <path d="M55 190 Q 200 178 345 190 L 355 285 C 355 292, 45 292, 45 285 Z" fill="url(#duvetGrad)" stroke="#3730A3" strokeWidth="1.5" />

          {/* Folded Top Sheet Hem (Satin trim) */}
          <path d="M55 190 Q 200 178 345 190 L 343 205 Q 200 193 57 205 Z" fill={fOutfit.collar || '#E0E7FF'} opacity="0.9" />

          {/* Guy Arm resting affectionately over the duvet holding her close */}
          <path d="M260 195 C 240 215, 200 215, 175 208" stroke={mOutfit.sleeves} strokeWidth="13" strokeLinecap="round" />
          <circle cx="172" cy="207" r="6" fill={mSkin.base} />

          {/* Floating Dream Elements */}
          <g className="animate-bounce" style={{ transformOrigin: '280px 70px' }}>
            <text x="270" y="70" fontSize="20">🌙</text>
            <text x="295" y="60" fontSize="14" fill="#A5B4FC" fontFamily="sans-serif" fontWeight="bold">Zzz</text>
            <text x="100" y="80" fontSize="16">✨</text>
          </g>
        </svg>
      )}

      {/* ============================================================= */}
      {/* 6. COFFEE TOAST SCENE (Morning Toast Cheers) */}
      {/* ============================================================= */}
      {activeScene === 'toast' && (
        <svg viewBox="0 0 360 340" className="w-full h-auto drop-shadow-[0_20px_45px_rgba(245,158,11,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground Shadow */}
          <ellipse cx="180" cy="315" rx="85" ry="12" fill="#000000" fillOpacity="0.4" />

          {/* Floating Toast Emojis & Spark */}
          <g className="animate-bounce">
            <text x="168" y="55" fontSize="26">☕</text>
            <text x="120" y="75" fontSize="18">✨</text>
            <text x="215" y="75" fontSize="18">✨</text>
          </g>

          {/* Guy Standing Left */}
          <g id="guy-toast">
            <rect x="110" y="215" width="18" height="85" rx="7" fill={mOutfit.pants} />
            <rect x="132" y="215" width="18" height="85" rx="7" fill={mOutfit.pants} />
            <ellipse cx="119" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />
            <ellipse cx="141" cy="305" rx="12" ry="6" fill={mOutfit.shoes} />

            <path d="M100 135 C 100 125, 155 125, 155 135 L 150 220 C 150 225, 105 225, 105 220 Z" fill={mOutfit.jacket} />
            
            {/* Guy Arm Raising Mug */}
            <path d="M145 155 C 160 170, 168 175, 172 178" stroke={mOutfit.sleeves} strokeWidth="12" strokeLinecap="round" />
            <circle cx="173" cy="179" r="5" fill={mSkin.base} />
            {/* Guy Ceramic Coffee Mug */}
            <rect x="168" y="165" width="14" height="18" rx="3" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M168 169 C 163 169, 163 179, 168 179" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
            <text x="171" y="177" fontSize="7" fill="#FFFFFF" fontWeight="bold">H</text>

            {/* Guy Head */}
            <circle cx="128" cy="100" r="22" fill={mSkin.base} />
            <path d="M106 98 C 106 76, 150 76, 150 98 C 150 86, 141 80, 128 80 C 115 80, 106 86, 106 98 Z" fill={mHair.base} />
            <circle cx="124" cy="98" r="2.5" fill="#1E293B" />
            <circle cx="138" cy="98" r="2.5" fill="#1E293B" />
            <path d="M126 108 Q 131 113 136 108" stroke="#991B1B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="103" r="3" fill={mSkin.blush} opacity="0.6" />
          </g>

          {/* Girl Standing Right */}
          <g id="girl-toast">
            <rect x="210" y="215" width="16" height="85" rx="7" fill={fOutfit.pants} />
            <rect x="232" y="215" width="16" height="85" rx="7" fill={fOutfit.pants} />
            <ellipse cx="218" cy="305" rx="10" ry="5" fill={fOutfit.shoes} />
            <ellipse cx="240" cy="305" rx="10" ry="5" fill={fOutfit.shoes} />

            <path d="M205 138 C 205 128, 260 128, 260 138 L 255 220 C 255 225, 210 225, 210 220 Z" fill={fOutfit.jacket} />
            
            {/* Girl Arm Raising Mug */}
            <path d="M215 158 C 200 170, 192 175, 188 178" stroke={fOutfit.sleeves} strokeWidth="11" strokeLinecap="round" />
            <circle cx="187" cy="179" r="5" fill={fSkin.base} />
            {/* Girl Ceramic Coffee Mug */}
            <rect x="178" y="165" width="14" height="18" rx="3" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M192 169 C 197 169, 197 179, 192 179" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
            <text x="182" y="177" fontSize="7" fill="#FFFFFF" fontWeight="bold">S</text>

            {/* Girl Head */}
            <circle cx="232" cy="104" r="20" fill={fSkin.base} />
            <path d="M212 100 C 212 80, 252 80, 252 100 C 259 125, 262 160, 252 180 C 245 175, 242 150, 242 125 Z" fill={fHair.base} />
            <circle cx="227" cy="102" r="2.2" fill="#1E293B" />
            <circle cx="239" cy="102" r="2.2" fill="#1E293B" />
            <path d="M229 111 Q 233 115 237 111" stroke="#BE123C" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="223" cy="106" r="3.5" fill={fSkin.blush} opacity="0.7" />
          </g>

          {/* Clinking Spark Between Mugs */}
          <circle cx="180" cy="168" r="4" fill="#FBBF24" className="animate-ping" />
          {/* Coffee Steam Rising */}
          <path d="M174 162 Q 172 154 176 148" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <path d="M184 162 Q 186 154 182 148" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </svg>
      )}

      {/* ── Ground Perspective Surface Shadow ── */}
      <div className="w-56 sm:w-72 h-3 bg-black/40 blur-md rounded-full mx-auto -mt-1 mb-2" />
    </div>
  );
}

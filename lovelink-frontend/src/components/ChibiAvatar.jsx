import React from 'react';

export const SKIN_TONES = {
  porcelain: { base: '#FFF0EA', shadow: '#F5D3C8', blush: '#FF9EAA' },
  fair: { base: '#FCD1B6', shadow: '#EAB395', blush: '#FF8A9A' },
  warm_honey: { base: '#E8B382', shadow: '#C99363', blush: '#E57373' },
  olive: { base: '#C68642', shadow: '#A0672F', blush: '#D32F2F' },
  bronze: { base: '#8D5524', shadow: '#6B3C14', blush: '#C2185B' },
  deep: { base: '#4C2818', shadow: '#361A0C', blush: '#880E4F' },
};

export const HAIR_COLORS = {
  jet_black: '#1A181B',
  dark_brown: '#4A3228',
  warm_chestnut: '#6D432A',
  golden_blonde: '#F3C969',
  auburn: '#9E381A',
  pastel_pink: '#F472B6',
  lavender: '#A855F7',
  silver_ash: '#94A3B8',
};

export default function ChibiAvatar({
  skin = 'fair',
  hair_style = 'wavy',
  hair_color = 'dark_brown',
  outfit = 'teddy_hoodie',
  accessory = 'none',
  expression = 'smile',
  className = '',
  size = 110,
  animate = false,
}) {
  const currentSkin = SKIN_TONES[skin] || SKIN_TONES.fair;
  const currentHair = HAIR_COLORS[hair_color] || HAIR_COLORS.dark_brown;

  return (
    <div
      className={`relative inline-block select-none ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{ width: size, height: size * 1.25 }}
    >
      <svg
        viewBox="0 0 100 125"
        className="w-full h-full drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* 1. BACK HAIR (for long styles) */}
        {['long_straight', 'long_wavy', 'ponytail', 'space_buns'].includes(hair_style) && (
          <g id="back-hair" fill={currentHair}>
            {hair_style === 'long_straight' && (
              <path d="M28 42 C 26 65, 24 85, 27 92 C 32 94, 38 88, 38 75 L 38 45 Z" />
            )}
            {hair_style === 'long_straight' && (
              <path d="M72 42 C 74 65, 76 85, 73 92 C 68 94, 62 88, 62 75 L 62 45 Z" />
            )}
            {hair_style === 'long_wavy' && (
              <path d="M26 40 C 22 55, 30 70, 24 85 C 22 92, 34 94, 37 82 C 40 70, 34 55, 38 42 Z" />
            )}
            {hair_style === 'long_wavy' && (
              <path d="M74 40 C 78 55, 70 70, 76 85 C 78 92, 66 94, 63 82 C 60 70, 66 55, 62 42 Z" />
            )}
            {hair_style === 'ponytail' && (
              <path d="M68 28 C 82 25, 92 40, 88 60 C 85 70, 78 68, 80 55 C 82 45, 76 36, 68 33 Z" />
            )}
            {hair_style === 'space_buns' && (
              <>
                <circle cx="25" cy="18" r="10" />
                <circle cx="75" cy="18" r="10" />
              </>
            )}
          </g>
        )}

        {/* 2. BODY / TORSO & OUTFIT */}
        <g id="torso">
          {/* Base Torso */}
          <path d="M38 68 C 38 62, 62 62, 62 68 L 65 105 C 65 108, 35 108, 35 105 Z" fill={currentSkin.shadow} />
          {/* Legs & Shoes */}
          <rect x="38" y="102" width="9" height="18" rx="4" fill="#2B2D42" />
          <rect x="53" y="102" width="9" height="18" rx="4" fill="#2B2D42" />
          <ellipse cx="42" cy="120" rx="6" ry="3.5" fill="#EAECEF" />
          <ellipse cx="58" cy="120" rx="6" ry="3.5" fill="#EAECEF" />

          {/* OUTFITS */}
          {outfit === 'teddy_hoodie' && (
            <g id="outfit-teddy">
              <path d="M30 68 C 30 58, 70 58, 70 68 L 72 103 C 72 106, 28 106, 28 103 Z" fill="#D4A373" />
              {/* Pocket */}
              <rect x="40" y="86" width="20" height="12" rx="4" fill="#C08A56" />
              {/* Drawstrings */}
              <line x1="45" y1="65" x2="45" y2="76" stroke="#FAEDCD" strokeWidth="2" strokeLinecap="round" />
              <line x1="55" y1="65" x2="55" y2="76" stroke="#FAEDCD" strokeWidth="2" strokeLinecap="round" />
              {/* Arms */}
              <path d="M30 66 C 24 73, 22 84, 25 94 C 27 96, 32 93, 31 87 L 34 72 Z" fill="#D4A373" />
              <path d="M70 66 C 76 73, 78 84, 75 94 C 73 96, 68 93, 69 87 L 66 72 Z" fill="#D4A373" />
            </g>
          )}

          {outfit === 'pink_pajamas' && (
            <g id="outfit-pajamas">
              <path d="M32 68 C 32 60, 68 60, 68 68 L 70 102 C 70 105, 30 105, 30 102 Z" fill="#FBCFE8" />
              {/* Stripes */}
              <line x1="33" y1="74" x2="67" y2="74" stroke="#F472B6" strokeWidth="1.5" />
              <line x1="32" y1="82" x2="68" y2="82" stroke="#F472B6" strokeWidth="1.5" />
              <line x1="31" y1="90" x2="69" y2="90" stroke="#F472B6" strokeWidth="1.5" />
              <line x1="30" y1="98" x2="70" y2="98" stroke="#F472B6" strokeWidth="1.5" />
              <circle cx="50" cy="78" r="1.5" fill="#DB2777" />
              <circle cx="50" cy="86" r="1.5" fill="#DB2777" />
              <circle cx="50" cy="94" r="1.5" fill="#DB2777" />
              {/* Arms */}
              <path d="M32 66 C 25 74, 25 85, 27 92 C 30 94, 34 90, 34 84 L 35 72 Z" fill="#FBCFE8" />
              <path d="M68 66 C 75 74, 75 85, 73 92 C 70 94, 66 90, 66 84 L 65 72 Z" fill="#FBCFE8" />
            </g>
          )}

          {outfit === 'heart_sweatshirt' && (
            <g id="outfit-heart">
              <path d="M31 66 C 31 58, 69 58, 69 66 L 71 102 C 71 105, 29 105, 29 102 Z" fill="#E0E7FF" />
              {/* Big Red Heart */}
              <path d="M50 78 C 50 75, 46 72, 43 74 C 40 76, 40 81, 44 85 L 50 90 L 56 85 C 60 81, 60 76, 57 74 C 54 72, 50 75, 50 78 Z" fill="#EF4444" />
              {/* Sleeves */}
              <path d="M31 65 C 24 74, 23 85, 26 94 C 29 96, 33 92, 33 86 L 35 72 Z" fill="#C7D2FE" />
              <path d="M69 65 C 76 74, 77 85, 74 94 C 71 96, 67 92, 67 86 L 65 72 Z" fill="#C7D2FE" />
            </g>
          )}

          {outfit === 'varsity_jacket' && (
            <g id="outfit-varsity">
              <path d="M33 66 C 33 58, 67 58, 67 66 L 68 102 C 68 105, 32 105, 32 102 Z" fill="#1E3A8A" />
              <path d="M47 62 L 47 102 L 53 102 L 53 62 Z" fill="#FFFFFF" />
              {/* Letter L */}
              <text x="37" y="77" fontSize="8" fontWeight="bold" fill="#FBBF24" fontFamily="sans-serif">L</text>
              {/* White Sleeves */}
              <path d="M33 65 C 25 73, 24 84, 26 93 C 28 95, 33 92, 32 86 L 35 71 Z" fill="#F8FAFC" />
              <path d="M67 65 C 75 73, 76 84, 74 93 C 72 95, 67 92, 68 86 L 65 71 Z" fill="#F8FAFC" />
            </g>
          )}

          {outfit === 'turtleneck_coat' && (
            <g id="outfit-turtleneck">
              <path d="M30 68 L 30 106 L 70 106 L 70 68 Z" fill="#8B5E3C" />
              {/* Cream Turtleneck collar */}
              <rect x="42" y="58" width="16" height="10" rx="3" fill="#F5F5DC" />
              {/* Coat Lapels */}
              <path d="M36 68 L 46 86 L 40 86 Z" fill="#6E4426" />
              <path d="M64 68 L 54 86 L 60 86 Z" fill="#6E4426" />
              {/* Sleeves */}
              <path d="M30 66 C 24 74, 23 85, 26 94 C 29 96, 33 92, 33 86 L 34 72 Z" fill="#8B5E3C" />
              <path d="M70 66 C 76 74, 77 85, 74 94 C 71 96, 67 92, 67 86 L 66 72 Z" fill="#8B5E3C" />
            </g>
          )}

          {outfit === 'cat_onesie' && (
            <g id="outfit-cat">
              <path d="M30 66 C 30 58, 70 58, 70 66 L 72 104 C 72 107, 28 107, 28 104 Z" fill="#374151" />
              {/* White Belly */}
              <ellipse cx="50" cy="85" rx="12" ry="14" fill="#F9FAFB" />
              {/* Pink Paw Icon */}
              <circle cx="50" cy="85" r="3" fill="#F472B6" />
              <circle cx="47" cy="80" r="1.2" fill="#F472B6" />
              <circle cx="50" cy="79" r="1.2" fill="#F472B6" />
              <circle cx="53" cy="80" r="1.2" fill="#F472B6" />
              {/* Arms */}
              <path d="M30 65 C 24 73, 23 84, 26 93 C 28 95, 33 92, 32 86 L 34 71 Z" fill="#374151" />
              <path d="M70 65 C 76 73, 77 84, 74 93 C 72 95, 67 92, 68 86 L 66 71 Z" fill="#374151" />
            </g>
          )}

          {outfit === 'chef_apron' && (
            <g id="outfit-chef">
              <path d="M33 66 C 33 58, 67 58, 67 66 L 68 102 C 68 105, 32 105, 32 102 Z" fill="#E2E8F0" />
              {/* Red Apron */}
              <path d="M42 66 L 58 66 L 64 104 L 36 104 Z" fill="#DC2626" />
              <path d="M42 66 L 42 60 L 58 60 L 58 66 Z" fill="none" stroke="#DC2626" strokeWidth="1.5" />
              <rect x="44" y="85" width="12" height="10" rx="2" fill="#B91C1C" />
              {/* Arms */}
              <path d="M33 65 C 26 73, 25 84, 27 93 L 34 71 Z" fill="#E2E8F0" />
              <path d="M67 65 C 74 73, 75 84, 73 93 L 66 71 Z" fill="#E2E8F0" />
            </g>
          )}

          {outfit === 'date_outfit' && (
            <g id="outfit-date">
              <path d="M32 66 C 32 58, 68 58, 68 66 L 70 104 C 70 106, 30 106, 30 104 Z" fill="#831843" />
              {/* Gold Necklace */}
              <path d="M42 62 Q 50 68 58 62" fill="none" stroke="#FBBF24" strokeWidth="1.5" />
              <circle cx="50" cy="67" r="1.5" fill="#FBBF24" />
              {/* Arms */}
              <path d="M32 65 C 25 73, 24 84, 27 93 L 34 71 Z" fill={currentSkin.base} />
              <path d="M68 65 C 75 73, 76 84, 73 93 L 66 71 Z" fill={currentSkin.base} />
            </g>
          )}

          {/* Hands */}
          <circle cx="28" cy="95" r="4.5" fill={currentSkin.base} />
          <circle cx="72" cy="95" r="4.5" fill={currentSkin.base} />
        </g>

        {/* 3. HEAD & FACE */}
        <g id="head" filter="url(#soft-shadow)">
          {/* Neck */}
          <rect x="45" y="52" width="10" height="12" fill={currentSkin.shadow} rx="2" />
          {/* Head Base */}
          <circle cx="50" cy="38" r="22" fill={currentSkin.base} />
          {/* Ears */}
          <circle cx="28" cy="40" r="4" fill={currentSkin.base} />
          <circle cx="72" cy="40" r="4" fill={currentSkin.base} />
          <circle cx="28" cy="40" r="2" fill={currentSkin.shadow} />
          <circle cx="72" cy="40" r="2" fill={currentSkin.shadow} />

          {/* Rosy Cheeks Blush */}
          <ellipse cx="37" cy="44" rx="4" ry="2.2" fill={currentSkin.blush} opacity="0.65" />
          <ellipse cx="63" cy="44" rx="4" ry="2.2" fill={currentSkin.blush} opacity="0.65" />

          {/* EXPRESSIONS */}
          {expression === 'smile' && (
            <g id="expr-smile">
              {/* Eyes */}
              <ellipse cx="40" cy="37" rx="3" ry="4" fill="#1E293B" />
              <ellipse cx="60" cy="37" rx="3" ry="4" fill="#1E293B" />
              {/* Eye sparkle highlights */}
              <circle cx="39" cy="35.5" r="1.2" fill="#FFFFFF" />
              <circle cx="59" cy="35.5" r="1.2" fill="#FFFFFF" />
              {/* Eyebrows */}
              <path d="M36 31 Q 40 29 44 31" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M56 31 Q 60 29 64 31" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              {/* Cute smiling mouth */}
              <path d="M46 44 Q 50 48 54 44" stroke="#881337" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          )}

          {expression === 'wink' && (
            <g id="expr-wink">
              {/* Left eye open */}
              <ellipse cx="40" cy="37" rx="3" ry="4" fill="#1E293B" />
              <circle cx="39" cy="35.5" r="1.2" fill="#FFFFFF" />
              {/* Right eye wink */}
              <path d="M56 38 Q 60 34 64 38" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Mouth with cute tongue */}
              <path d="M46 43 Q 50 49 54 43" stroke="#881337" strokeWidth="1.8" fill="#F43F5E" />
            </g>
          )}

          {expression === 'blush' && (
            <g id="expr-blush">
              {/* Happy closed arched eyes */}
              <path d="M36 38 Q 40 33 44 38" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M56 38 Q 60 33 64 38" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Sweet open smile */}
              <path d="M45 43 Q 50 50 55 43 Z" fill="#BE123C" />
            </g>
          )}

          {expression === 'sleep' && (
            <g id="expr-sleep">
              {/* Peaceful curved eyes */}
              <path d="M37 38 Q 41 42 45 38" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M55 38 Q 59 42 63 38" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Little 'o' mouth */}
              <ellipse cx="50" cy="45" rx="1.8" ry="2.2" fill="#BE123C" />
            </g>
          )}
        </g>

        {/* 4. FRONT HAIR */}
        <g id="front-hair" fill={currentHair}>
          {hair_style === 'short_clean' && (
            <path d="M28 34 C 28 20, 72 20, 72 34 C 68 28, 54 26, 48 30 C 42 26, 32 28, 28 34 Z" />
          )}

          {hair_style === 'messy_waves' && (
            <path d="M26 36 C 24 18, 76 18, 74 36 C 70 26, 62 25, 54 30 C 48 24, 38 25, 33 32 C 30 28, 27 32, 26 36 Z" />
          )}

          {hair_style === 'curly' && (
            <g>
              <circle cx="34" cy="24" r="8" />
              <circle cx="48" cy="20" r="9" />
              <circle cx="62" cy="22" r="8.5" />
              <circle cx="70" cy="30" r="7" />
              <circle cx="28" cy="32" r="7" />
              <circle cx="40" cy="28" r="6" />
              <circle cx="58" cy="28" r="6" />
            </g>
          )}

          {hair_style === 'bob' && (
            <path d="M27 34 C 27 18, 73 18, 73 34 C 75 48, 68 55, 68 55 C 62 38, 56 32, 50 32 C 44 32, 38 38, 32 55 C 32 55, 25 48, 27 34 Z" />
          )}

          {hair_style === 'long_straight' && (
            <path d="M28 34 C 28 18, 72 18, 72 34 C 68 28, 54 26, 50 30 C 46 26, 32 28, 28 34 Z" />
          )}

          {hair_style === 'long_wavy' && (
            <path d="M26 34 C 26 18, 74 18, 74 34 C 68 26, 56 26, 50 31 C 44 26, 32 26, 26 34 Z" />
          )}

          {hair_style === 'ponytail' && (
            <path d="M28 34 C 28 18, 72 18, 72 34 C 67 28, 55 27, 49 31 C 43 27, 33 28, 28 34 Z" />
          )}

          {hair_style === 'space_buns' && (
            <path d="M28 34 C 28 19, 72 19, 72 34 C 67 28, 55 27, 49 31 C 43 27, 33 28, 28 34 Z" />
          )}
        </g>

        {/* 5. ACCESSORIES & GLASSES */}
        {accessory === 'round_glasses' && (
          <g id="acc-glasses" stroke="#D97706" strokeWidth="1.8" fill="rgba(255,255,255,0.2)">
            <circle cx="39" cy="38" r="7.5" />
            <circle cx="61" cy="38" r="7.5" />
            <line x1="46.5" y1="38" x2="53.5" y2="38" strokeWidth="1.8" />
            {/* Bridge to ears */}
            <line x1="31.5" y1="38" x2="28" y2="40" strokeWidth="1.5" />
            <line x1="68.5" y1="38" x2="72" y2="40" strokeWidth="1.5" />
          </g>
        )}

        {accessory === 'black_frames' && (
          <g id="acc-black-frames" stroke="#0F172A" strokeWidth="2.2" fill="none">
            <rect x="32" y="32" width="15" height="11" rx="3" />
            <rect x="53" y="32" width="15" height="11" rx="3" />
            <line x1="47" y1="36" x2="53" y2="36" strokeWidth="2" />
          </g>
        )}

        {accessory === 'cat_ears' && (
          <g id="acc-cat-ears">
            {/* Headband */}
            <path d="M30 27 Q 50 20 70 27" stroke="#1E293B" strokeWidth="2" fill="none" />
            {/* Left Ear */}
            <path d="M31 26 L 25 10 L 40 20 Z" fill="#F472B6" stroke="#1E293B" strokeWidth="1.5" />
            <path d="M31 23 L 28 14 L 37 19 Z" fill="#FDF2F8" />
            {/* Right Ear */}
            <path d="M69 26 L 75 10 L 60 20 Z" fill="#F472B6" stroke="#1E293B" strokeWidth="1.5" />
            <path d="M69 23 L 72 14 L 63 19 Z" fill="#FDF2F8" />
          </g>
        )}

        {accessory === 'beanie' && (
          <g id="acc-beanie">
            <path d="M26 30 C 26 12, 74 12, 74 30 Z" fill="#B91C1C" />
            <rect x="24" y="27" width="52" height="7" rx="3" fill="#991B1B" />
            <circle cx="50" cy="11" r="5" fill="#EF4444" />
          </g>
        )}

        {accessory === 'heart_earrings' && (
          <g id="acc-earrings" fill="#EC4899">
            <path d="M27 46 C 27 44, 25 43, 24 44 C 23 45, 23 47, 25 49 L 27 51 L 29 49 C 31 47, 31 45, 30 44 C 29 43, 27 44, 27 46 Z" />
            <path d="M73 46 C 73 44, 71 43, 70 44 C 69 45, 69 47, 71 49 L 73 51 L 75 49 C 77 47, 77 45, 76 44 C 75 43, 73 44, 73 46 Z" />
          </g>
        )}
      </svg>
    </div>
  );
}

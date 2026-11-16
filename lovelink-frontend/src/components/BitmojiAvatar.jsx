import React from 'react';

// Authentic 3D Bitmoji Deluxe Skin Tones with 3D gradient shading (highlight, base, deep shadow, blush)
export const BITMOJI_SKIN_TONES = {
  porcelain: {
    highlight: '#FFF6F2',
    base: '#FDE4D8',
    shadow: '#E8BFAC',
    deepShadow: '#C89782',
    blush: '#FFAAA6',
    lips: '#E58A8A',
  },
  fair: {
    highlight: '#FFEFE6',
    base: '#F5CCA0',
    shadow: '#D99F6C',
    deepShadow: '#B87A46',
    blush: '#FF8882',
    lips: '#D97373',
  },
  warm_honey: {
    highlight: '#FBE0BE',
    base: '#E09F67',
    shadow: '#B8723B',
    deepShadow: '#8F4E1D',
    blush: '#DE6B6B',
    lips: '#BA5454',
  },
  olive: {
    highlight: '#E4BC8A',
    base: '#B87B40',
    shadow: '#8C5420',
    deepShadow: '#66370E',
    blush: '#CC4C4C',
    lips: '#9E3C3C',
  },
  bronze: {
    highlight: '#B88250',
    base: '#875128',
    shadow: '#613310',
    deepShadow: '#421E06',
    blush: '#B33644',
    lips: '#7A242E',
  },
  deep: {
    highlight: '#6E4024',
    base: '#482512',
    shadow: '#301508',
    deepShadow: '#1F0B03',
    blush: '#8A2038',
    lips: '#541524',
  },
};

// 3D Bitmoji Hair Colors with highlight and depth
export const BITMOJI_HAIR_COLORS = {
  jet_black: { base: '#151517', highlight: '#333338', shadow: '#0A0A0C' },
  dark_brown: { base: '#3B261D', highlight: '#5E3E30', shadow: '#22150E' },
  warm_chestnut: { base: '#6A3B22', highlight: '#8F5333', shadow: '#452211' },
  golden_blonde: { base: '#E2BA65', highlight: '#FCE7A4', shadow: '#A87D2E' },
  auburn: { base: '#8E2E18', highlight: '#B8452B', shadow: '#5E1B0B' },
  pastel_pink: { base: '#E86B98', highlight: '#FCA5C5', shadow: '#B53B68' },
  lavender: { base: '#8E67C9', highlight: '#BA9CE8', shadow: '#623B99' },
  silver_ash: { base: '#7E8896', highlight: '#B4BDC9', shadow: '#4F5866' },
};

// 3D Bitmoji Eye Iris Colors
export const BITMOJI_EYE_COLORS = {
  deep_brown: '#4A2C1D',
  hazel: '#7A622A',
  emerald_green: '#2A6644',
  ocean_blue: '#2B5A8F',
  charcoal_gray: '#3A424D',
  violet: '#68457D',
};

export default function BitmojiAvatar({
  skin = 'fair',
  hair_style = 'wavy_locks',
  hair_color = 'dark_brown',
  eye_color = 'deep_brown',
  outfit = 'streetwear_hoodie',
  accessory = 'none',
  expression = 'smile',
  avatar_url = null, // Support for direct Snapchat avatar image if provided!
  className = '',
  size = 130,
  animate = false,
}) {
  // Unique ID prefix to avoid SVG gradient collisions when multiple avatars are on screen
  const rawId = React.useId();
  const idPrefix = rawId.replace(/:/g, '');

  // If user provided their exact Snapchat Bitmoji URL, render it directly with crisp styling!
  if (avatar_url) {
    return (
      <div className={`relative inline-block select-none ${animate ? 'animate-pulse' : ''} ${className}`} style={{ width: size, height: size * 1.6 }}>
        <img
          src={avatar_url}
          alt="Snapchat Bitmoji"
          className="w-full h-full object-contain drop-shadow-xl"
          onError={(e) => {
            // Fallback to SVG if URL fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  const s = BITMOJI_SKIN_TONES[skin] || BITMOJI_SKIN_TONES.fair;
  const h = BITMOJI_HAIR_COLORS[hair_color] || BITMOJI_HAIR_COLORS.dark_brown;
  const eyeIris = BITMOJI_EYE_COLORS[eye_color] || BITMOJI_EYE_COLORS.deep_brown;

  return (
    <div
      className={`relative inline-block select-none ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{ width: size, height: size * 1.7 }}
    >
      <svg
        viewBox="0 0 100 170"
        className="w-full h-full drop-shadow-lg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 3D Skin Gradients */}
          <linearGradient id={`${idPrefix}-skin-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.highlight} />
            <stop offset="60%" stopColor={s.base} />
            <stop offset="100%" stopColor={s.shadow} />
          </linearGradient>

          <linearGradient id={`${idPrefix}-skin-neck`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.deepShadow} />
            <stop offset="40%" stopColor={s.shadow} />
            <stop offset="100%" stopColor={s.base} />
          </linearGradient>

          <linearGradient id={`${idPrefix}-skin-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={s.base} />
            <stop offset="100%" stopColor={s.shadow} />
          </linearGradient>

          {/* 3D Hair Gradients */}
          <linearGradient id={`${idPrefix}-hair-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={h.highlight} />
            <stop offset="45%" stopColor={h.base} />
            <stop offset="100%" stopColor={h.shadow} />
          </linearGradient>

          {/* Eye Iris Gradient */}
          <radialGradient id={`${idPrefix}-iris`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={eyeIris} />
            <stop offset="80%" stopColor={eyeIris} />
            <stop offset="100%" stopColor="#111111" />
          </radialGradient>

          {/* Soft Shadow Filter for 3D Bitmoji look */}
          <filter id={`${idPrefix}-soft-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* ======================================================== */}
        {/* 1. BACK HAIR (Long Styles, Ponytails, Buns) */}
        {/* ======================================================== */}
        {['wavy_locks', 'long_straight', 'high_pony', 'curtain_bangs'].includes(hair_style) && (
          <g id="back-hair" fill={`url(#${idPrefix}-hair-grad)`}>
            {hair_style === 'wavy_locks' && (
              <>
                {/* Left flowing waves */}
                <path d="M30 30 C 24 45, 20 65, 24 85 C 26 95, 34 92, 34 82 C 34 68, 30 50, 36 36 Z" />
                {/* Right flowing waves */}
                <path d="M70 30 C 76 45, 80 65, 76 85 C 74 95, 66 92, 66 82 C 66 68, 70 50, 64 36 Z" />
              </>
            )}
            {hair_style === 'long_straight' && (
              <>
                <path d="M31 32 C 26 50, 25 75, 27 96 C 31 98, 36 94, 35 80 L 35 38 Z" />
                <path d="M69 32 C 74 50, 75 75, 73 96 C 69 98, 64 94, 65 80 L 65 38 Z" />
              </>
            )}
            {hair_style === 'high_pony' && (
              <path d="M64 22 C 78 18, 88 32, 85 58 C 82 72, 75 74, 76 60 C 78 48, 74 34, 64 26 Z" />
            )}
          </g>
        )}

        {/* ======================================================== */}
        {/* 2. BODY / TORSO & BITMOJI STREETWEAR APPAREL */}
        {/* ======================================================== */}
        <g id="body">
          {/* Natural Neck */}
          <path d="M44 48 L 44 60 C 44 63, 56 63, 56 60 L 56 48 Z" fill={`url(#${idPrefix}-skin-neck)`} />
          {/* Collarbone / Chest Shadow */}
          <path d="M43 59 C 48 63, 52 63, 57 59" stroke={s.shadow} strokeWidth="1" strokeLinecap="round" />

          {/* Natural Slender Bitmoji Legs */}
          <rect x="40" y="116" width="8" height="36" rx="3.5" fill="#242B35" />
          <rect x="52" y="116" width="8" height="36" rx="3.5" fill="#242B35" />
          {/* Distressed Jeans Knees Creases */}
          <line x1="41" y1="130" x2="47" y2="130" stroke="#3D4756" strokeWidth="1" />
          <line x1="53" y1="130" x2="59" y2="130" stroke="#3D4756" strokeWidth="1" />

          {/* Authentic High-Top Sneakers (Air Jordan / Converse style) */}
          <g id="sneakers">
            {/* Left Sneaker */}
            <path d="M38 150 L 49 150 L 49 157 C 49 160, 36 160, 36 157 Z" fill="#EAEAEA" />
            <path d="M37 151 L 49 151 L 49 155 L 37 155 Z" fill="#DC2626" />
            <rect x="36" y="157" width="14" height="3" rx="1.5" fill="#FFFFFF" />
            {/* Right Sneaker */}
            <path d="M51 150 L 62 150 L 62 157 C 62 160, 49 160, 49 157 Z" fill="#EAEAEA" />
            <path d="M51 151 L 63 151 L 63 155 L 51 155 Z" fill="#DC2626" />
            <rect x="50" y="157" width="14" height="3" rx="1.5" fill="#FFFFFF" />
          </g>

          {/* ------------------------------------------------------ */}
          {/* AUTHENTIC SNAPCHAT STREETWEAR OUTFITS */}
          {/* ------------------------------------------------------ */}

          {/* OUTFIT 1: OVERSIZED STREETWEAR HOODIE (Snapchat Iconic) */}
          {outfit === 'streetwear_hoodie' && (
            <g id="outfit-hoodie">
              {/* Torso & Drop Shoulders */}
              <path d="M31 60 C 27 60, 24 72, 23 88 C 22 92, 28 94, 30 89 L 34 76 L 34 116 C 34 118, 66 118, 66 116 L 66 76 L 70 89 C 72 94, 78 92, 77 88 C 76 72, 73 60, 69 60 Z" fill="#D97706" />
              {/* Shadow Layer for 3D volume */}
              <path d="M34 106 L 66 106 L 66 116 L 34 116 Z" fill="#B45309" />
              {/* Kangaroo Pocket with Stitching */}
              <rect x="40" y="94" width="20" height="15" rx="3" fill="#B45309" stroke="#92400E" strokeWidth="0.8" />
              {/* Hood Collar */}
              <path d="M39 57 C 43 66, 57 66, 61 57 C 65 64, 35 64, 39 57 Z" fill="#92400E" />
              {/* Drawstrings with Metal Aglets */}
              <line x1="46" y1="62" x2="45" y2="82" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="54" y1="62" x2="55" y2="82" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="44.2" y="80" width="1.6" height="4" rx="0.8" fill="#FBBF24" />
              <rect x="54.2" y="80" width="1.6" height="4" rx="0.8" fill="#FBBF24" />
            </g>
          )}

          {/* OUTFIT 2: TWO-TONE VARSITY BOMBER JACKET */}
          {outfit === 'varsity_jacket' && (
            <g id="outfit-varsity">
              {/* Leather White Sleeves */}
              <path d="M24 70 L 23 90 C 23 93, 29 93, 30 89 L 34 76" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="0.5" />
              <path d="M76 70 L 77 90 C 77 93, 71 93, 70 89 L 66 76" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="0.5" />
              {/* Navy Wool Torso */}
              <path d="M34 60 C 34 58, 66 58, 66 60 L 66 116 L 34 116 Z" fill="#1E3A8A" />
              {/* Ribbed Striped Hem */}
              <rect x="34" y="112" width="32" height="4" fill="#DC2626" />
              <line x1="34" y1="114" x2="66" y2="114" stroke="#FFFFFF" strokeWidth="1" />
              {/* Snap Buttons */}
              <circle cx="50" cy="74" r="1.5" fill="#E5E7EB" />
              <circle cx="50" cy="85" r="1.5" fill="#E5E7EB" />
              <circle cx="50" cy="96" r="1.5" fill="#E5E7EB" />
              {/* Varsity 'L' Patch on Chest */}
              <text x="39" y="78" fontSize="8" fontWeight="bold" fill="#FBBF24" fontFamily="sans-serif">L</text>
            </g>
          )}

          {/* OUTFIT 3: AUTUMN TURTLENECK & TRENCH COAT */}
          {outfit === 'autumn_coat' && (
            <g id="outfit-coat">
              {/* Warm Black Turtleneck */}
              <path d="M43 54 L 57 54 L 56 68 L 44 68 Z" fill="#1F2937" />
              {/* Camel Wool Coat */}
              <path d="M30 62 C 28 62, 23 72, 23 92 L 31 92 L 34 78 L 34 118 L 66 118 L 66 78 L 69 92 L 77 92 C 77 72, 72 62, 70 62 Z" fill="#A16207" />
              {/* Lapels */}
              <path d="M34 62 L 46 86 L 41 86 L 34 72 Z" fill="#78350F" />
              <path d="M66 62 L 54 86 L 59 86 L 66 72 Z" fill="#78350F" />
            </g>
          )}

          {/* OUTFIT 4: OVERSIZED GRAPHIC HEART SWEATSHIRT */}
          {outfit === 'heart_sweatshirt' && (
            <g id="outfit-heart">
              <path d="M32 60 C 27 60, 24 72, 23 88 C 22 92, 28 94, 30 89 L 34 76 L 34 116 L 66 116 L 66 76 L 70 89 C 72 94, 78 92, 77 88 C 76 72, 73 60, 68 60 Z" fill="#FCE7F3" />
              {/* Embroidered Scarlet Heart */}
              <path d="M50 80 C 50 80, 44 72, 40 75 C 36 78, 38 85, 50 94 C 62 85, 64 78, 60 75 C 56 72, 50 80, 50 80 Z" fill="#E11D48" />
              {/* Ribbed Pink Collar & Hem */}
              <path d="M42 58 C 47 62, 53 62, 58 58" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
              <rect x="34" y="113" width="32" height="3" fill="#F472B6" />
            </g>
          )}

          {/* OUTFIT 5: CHIC SILK PAJAMAS */}
          {outfit === 'silk_pajamas' && (
            <g id="outfit-pajamas">
              <path d="M33 60 L 24 88 L 30 90 L 35 76 L 35 116 L 65 116 L 65 76 L 70 90 L 76 88 L 67 60 Z" fill="#FBCFE8" />
              {/* Black Silk Piping */}
              <path d="M42 58 L 50 78 L 58 58" stroke="#DB2777" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="50" y1="78" x2="50" y2="116" stroke="#DB2777" strokeWidth="1" />
              <circle cx="50" cy="88" r="1.2" fill="#FFFFFF" />
              <circle cx="50" cy="98" r="1.2" fill="#FFFFFF" />
            </g>
          )}

          {/* OUTFIT 6: DATE NIGHT SLIP & DINNER BLAZER */}
          {outfit === 'date_night' && (
            <g id="outfit-date">
              {/* Tailored Black Blazer */}
              <path d="M30 62 L 23 90 L 29 92 L 34 78 L 34 116 L 66 116 L 66 78 L 71 92 L 77 90 L 70 62 Z" fill="#18181B" />
              {/* Emerald Satin Inner Top */}
              <polygon points="44,60 56,60 52,80 48,80" fill="#059669" />
              {/* Gold Pendant Necklace */}
              <path d="M46 62 Q 50 68 54 62" stroke="#FBBF24" strokeWidth="0.8" fill="none" />
              <circle cx="50" cy="68" r="1" fill="#FBBF24" />
            </g>
          )}

          {/* OUTFIT 7: TEDDY SHERPA FLEECE JACKET */}
          {outfit === 'teddy_sherpa' && (
            <g id="outfit-teddy">
              <path d="M31 60 C 27 60, 24 72, 23 88 L 30 89 L 34 76 L 34 116 L 66 116 L 66 76 L 70 89 L 77 88 C 76 72, 73 60, 69 60 Z" fill="#D4A373" />
              <rect x="42" y="74" width="10" height="9" rx="2" fill="#A98467" />
              <line x1="50" y1="60" x2="50" y2="116" stroke="#6C584C" strokeWidth="1.5" />
            </g>
          )}

          {/* OUTFIT 8: CUTE CAT ONESIE */}
          {outfit === 'cat_onesie' && (
            <g id="outfit-onesie">
              <path d="M31 60 L 23 88 L 30 89 L 34 76 L 34 116 L 66 116 L 66 76 L 70 89 L 77 88 L 69 60 Z" fill="#475569" />
              <ellipse cx="50" cy="88" rx="9" ry="12" fill="#F1F5F9" />
              <path d="M47 84 L 53 84 L 50 87 Z" fill="#F472B6" />
            </g>
          )}
        </g>

        {/* ======================================================== */}
        {/* 3. HEAD & 3D BITMOJI SCULPTED FACE */}
        {/* ======================================================== */}
        <g id="head">
          {/* Sculpted 3D Bitmoji Head / Jawline (1:5.5 realistic proportions) */}
          <path
            d="M36 24 C 36 10, 64 10, 64 24 C 64 36, 60 52, 50 56 C 40 52, 36 36, 36 24 Z"
            fill={`url(#${idPrefix}-skin-face)`}
          />

          {/* Ears with Inner Shading */}
          <ellipse cx="35" cy="32" rx="2.5" ry="4.5" fill={s.base} />
          <ellipse cx="35" cy="32" rx="1.5" ry="2.5" fill={s.shadow} />
          <ellipse cx="65" cy="32" rx="2.5" ry="4.5" fill={s.base} />
          <ellipse cx="65" cy="32" rx="1.5" ry="2.5" fill={s.shadow} />

          {/* Soft Cheekbone Blush (Signature Bitmoji 3D glow) */}
          <ellipse cx="40" cy="36" rx="4" ry="2.2" fill={s.blush} opacity="0.5" />
          <ellipse cx="60" cy="36" rx="4" ry="2.2" fill={s.blush} opacity="0.5" />

          {/* 3D Bitmoji Sculpted Nose */}
          <path d="M49 28 L 49 35 C 49 37, 52 37, 52 35" stroke={s.shadow} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <ellipse cx="50" cy="35" rx="1.5" ry="0.8" fill={s.highlight} opacity="0.7" />

          {/* ------------------------------------------------------ */}
          {/* ICONIC 3D BITMOJI EYES (Almond shape, Iris, Dual Catchlights) */}
          {/* ------------------------------------------------------ */}
          {expression !== 'sleep' ? (
            <g id="bitmoji-eyes">
              {/* Left Eye */}
              <ellipse cx="43" cy="28" rx="4.5" ry="3.2" fill="#FFFFFF" />
              <circle cx="43" cy="28" r="2.6" fill={`url(#${idPrefix}-iris)`} />
              <circle cx="43" cy="28" r="1.3" fill="#0A0A0C" />
              {/* Dual Specular Catchlights (The soulful Bitmoji gaze) */}
              <circle cx="42" cy="27" r="0.8" fill="#FFFFFF" />
              <circle cx="44.2" cy="29.2" r="0.4" fill="#FFFFFF" />
              {/* Eyelash Line */}
              <path d="M38.5 27 C 40 24.5, 46 24.5, 47.5 27" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" fill="none" />

              {/* Right Eye */}
              {expression === 'wink' ? (
                // Playful wink for right eye
                <path d="M52.5 28 C 55 25.5, 59 25.5, 61.5 28" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
              ) : (
                <>
                  <ellipse cx="57" cy="28" rx="4.5" ry="3.2" fill="#FFFFFF" />
                  <circle cx="57" cy="28" r="2.6" fill={`url(#${idPrefix}-iris)`} />
                  <circle cx="57" cy="28" r="1.3" fill="#0A0A0C" />
                  <circle cx="56" cy="27" r="0.8" fill="#FFFFFF" />
                  <circle cx="58.2" cy="29.2" r="0.4" fill="#FFFFFF" />
                  <path d="M52.5 27 C 54 24.5, 60 24.5, 61.5 27" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </>
              )}

              {/* Feathered Eyebrows */}
              <path d="M38 23 C 41 21, 46 22, 47.5 23.5" stroke={h.base} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M52.5 23.5 C 54 22, 59 21, 62 23" stroke={h.base} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          ) : (
            // Cozy Sleeping Expression (Eyes peacefully closed)
            <g id="sleeping-eyes">
              <path d="M39 28 C 41 31, 46 31, 47 28" stroke="#18181B" strokeWidth="1.3" strokeLinecap="round" fill="none" />
              <path d="M53 28 C 54 31, 59 31, 61 28" stroke="#18181B" strokeWidth="1.3" strokeLinecap="round" fill="none" />
              <path d="M38 23 C 41 22, 46 22, 47 23.5" stroke={h.base} strokeWidth="1.3" strokeLinecap="round" fill="none" />
              <path d="M53 23.5 C 54 22, 59 22, 62 23" stroke={h.base} strokeWidth="1.3" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* 3D Contoured Bitmoji Lips */}
          <g id="lips">
            {expression === 'smile' || expression === 'wink' ? (
              <>
                <path d="M46 41 C 48 44.5, 52 44.5, 54 41" stroke={s.lips} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                {/* Lower Lip Plump Highlight */}
                <ellipse cx="50" cy="43" rx="2" ry="0.6" fill={s.highlight} opacity="0.6" />
              </>
            ) : expression === 'blush' ? (
              // Sweet romantic smile with fuller blush lips
              <>
                <path d="M45.5 40.5 C 48 45, 52 45, 54.5 40.5" stroke={s.lips} strokeWidth="2" strokeLinecap="round" fill="none" />
                <ellipse cx="50" cy="42.5" rx="2.5" ry="0.8" fill="#FFFFFF" opacity="0.5" />
              </>
            ) : (
              // Peaceful neutral rest
              <path d="M46.5 41 C 48 42, 52 42, 53.5 41" stroke={s.lips} strokeWidth="1.4" strokeLinecap="round" fill="none" />
            )}
          </g>
        </g>

        {/* ======================================================== */}
        {/* 4. 3D FRONT HAIR WITH HIGHLIGHTS & VOLUME */}
        {/* ======================================================== */}
        <g id="front-hair" fill={`url(#${idPrefix}-hair-grad)`}>
          {/* STYLE 1: TEXTURED TAPER FADE (Short Clean Modern) */}
          {hair_style === 'short_fade' && (
            <>
              <path d="M34 24 C 34 10, 66 10, 66 24 C 66 25, 62 17, 50 17 C 38 17, 34 25, 34 24 Z" />
              {/* Textured locks on top */}
              <path d="M37 17 C 44 11, 56 11, 63 17 C 58 13, 42 13, 37 17 Z" fill={h.highlight} />
              {/* Fade sideburns */}
              <path d="M35 24 L 35 30 L 36 28 Z" fill={h.shadow} />
              <path d="M65 24 L 65 30 L 64 28 Z" fill={h.shadow} />
            </>
          )}

          {/* STYLE 2: VOLUMINOUS ROMANTIC WAVES */}
          {hair_style === 'wavy_locks' && (
            <>
              <path d="M33 22 C 33 8, 67 8, 67 22 C 67 28, 62 16, 50 16 C 38 16, 33 28, 33 22 Z" />
              {/* Front side locks framing cheeks */}
              <path d="M34 20 C 31 28, 33 38, 35 44 C 36 38, 35 28, 38 20 Z" />
              <path d="M66 20 C 69 28, 67 38, 65 44 C 64 38, 65 28, 62 20 Z" />
              {/* Glossy wave highlight */}
              <path d="M40 14 C 47 11, 53 11, 60 14 C 54 12, 46 12, 40 14 Z" fill={h.highlight} />
            </>
          )}

          {/* STYLE 3: CURLY AFRO COIL */}
          {hair_style === 'curly_afro' && (
            <g id="curly-afro">
              <circle cx="34" cy="18" r="6" />
              <circle cx="42" cy="13" r="7" />
              <circle cx="50" cy="11" r="7.5" />
              <circle cx="58" cy="13" r="7" />
              <circle cx="66" cy="18" r="6" />
              <circle cx="33" cy="25" r="5" />
              <circle cx="67" cy="25" r="5" />
              <circle cx="50" cy="14" r="5" fill={h.highlight} opacity="0.6" />
            </g>
          )}

          {/* STYLE 4: CHIC SLEEK BOB */}
          {hair_style === 'sleek_bob' && (
            <>
              <path d="M33 24 C 33 8, 67 8, 67 24 L 68 40 C 66 43, 62 36, 62 30 L 62 20 C 56 16, 44 16, 38 20 L 38 30 C 38 36, 34 43, 32 40 Z" />
              <path d="M42 13 C 48 11, 52 11, 58 13 C 54 12, 46 12, 42 13 Z" fill={h.highlight} />
            </>
          )}

          {/* STYLE 5: LONG STRAIGHT WITH LAYERS */}
          {hair_style === 'long_straight' && (
            <>
              <path d="M33 22 C 33 8, 67 8, 67 22 C 67 26, 62 16, 50 16 C 38 16, 33 26, 33 22 Z" />
              <path d="M34 20 L 34 50 C 36 44, 37 32, 38 22 Z" />
              <path d="M66 20 L 66 50 C 64 44, 63 32, 62 22 Z" />
              <path d="M42 13 C 48 11, 52 11, 58 13 Z" fill={h.highlight} />
            </>
          )}

          {/* STYLE 6: HIGH PONYTAIL WITH SCRUNCHIE */}
          {hair_style === 'high_pony' && (
            <>
              <path d="M34 24 C 34 10, 66 10, 66 24 C 66 18, 58 16, 50 16 C 42 16, 34 18, 34 24 Z" />
              {/* Pink Scrunchie at crown */}
              <circle cx="64" cy="18" r="4.5" fill="#EC4899" />
              <circle cx="64" cy="18" r="2.5" fill="#BE185D" />
            </>
          )}

          {/* STYLE 7: CURTAIN BANGS */}
          {hair_style === 'curtain_bangs' && (
            <>
              <path d="M33 22 C 33 8, 67 8, 67 22 C 62 17, 56 18, 50 24 C 44 18, 38 17, 33 22 Z" />
              <path d="M34 22 C 33 32, 35 40, 37 46 C 38 38, 37 30, 42 24 Z" />
              <path d="M66 22 C 67 32, 65 40, 63 46 C 62 38, 63 30, 58 24 Z" />
            </>
          )}
        </g>

        {/* ======================================================== */}
        {/* 5. ACCESSORIES (Glasses, Headband, Beanie, Earrings) */}
        {/* ======================================================== */}
        {accessory === 'gold_glasses' && (
          <g id="accessory-glasses" stroke="#FBBF24" strokeWidth="1.2" fill="none">
            <circle cx="43" cy="28" r="5" />
            <circle cx="57" cy="28" r="5" />
            <line x1="48" y1="28" x2="52" y2="28" />
            <line x1="38" y1="27" x2="35" y2="26" />
            <line x1="62" y1="27" x2="65" y2="26" />
          </g>
        )}

        {accessory === 'black_frames' && (
          <g id="accessory-black-frames" stroke="#18181B" strokeWidth="1.5" fill="none">
            <rect x="38" y="24" width="10" height="8" rx="2" />
            <rect x="52" y="24" width="10" height="8" rx="2" />
            <line x1="48" y1="27" x2="52" y2="27" />
          </g>
        )}

        {accessory === 'cat_ears' && (
          <g id="accessory-cat-ears">
            <path d="M37 14 L 34 5 L 44 10 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="0.8" />
            <path d="M63 14 L 66 5 L 56 10 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="0.8" />
            <path d="M36 14 C 42 8, 58 8, 64 14" stroke="#DB2777" strokeWidth="1.5" fill="none" />
          </g>
        )}

        {accessory === 'cozy_beanie' && (
          <g id="accessory-beanie">
            <path d="M32 18 C 32 6, 68 6, 68 18 Z" fill="#DC2626" />
            <rect x="31" y="16" width="38" height="6" rx="2.5" fill="#991B1B" />
            <circle cx="50" cy="5" r="4" fill="#FEF2F2" />
          </g>
        )}

        {accessory === 'heart_earrings' && (
          <g id="accessory-earrings">
            <path d="M34 37 C 34 37, 32 35, 31 36 C 30 37, 31 38, 34 40 C 37 38, 38 37, 37 36 C 36 35, 34 37, 34 37 Z" fill="#EC4899" />
            <path d="M66 37 C 66 37, 64 35, 63 36 C 62 37, 63 38, 66 40 C 69 38, 70 37, 69 36 C 68 35, 66 37, 66 37 Z" fill="#EC4899" />
          </g>
        )}
      </svg>
    </div>
  );
}

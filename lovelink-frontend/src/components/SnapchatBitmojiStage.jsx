import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Heart, Coffee, Shirt, Music, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// ----------------------------------------------------------------------
// BITMOJI WARDROBE CATALOGS
// ----------------------------------------------------------------------
export const WARDROBE_COLLECTIONS = {
  streetwear: {
    id: 'streetwear',
    name: 'Streetwear & Denim',
    emoji: '🧢',
    description: 'Varsity Bomber, Noir Cropped Jacket & Street Denim',
    tag: 'Classic',
    boyAccent: '#3B82F6',
    girlAccent: '#8D5B4C',
  },
  varsity_college: {
    id: 'varsity_college',
    name: 'College Varsity',
    emoji: '🧥',
    description: 'Deep Navy Varsity, Cream Leather & Dunks',
    tag: 'Campus',
    boyAccent: '#1E3A8A',
    girlAccent: '#D97706',
  },
  date_night: {
    id: 'date_night',
    name: 'Date Night Velvet',
    emoji: '✨',
    description: 'Midnight Tuxedo & Rose-Gold Velvet Dress',
    tag: 'Luxury',
    boyAccent: '#F43F5E',
    girlAccent: '#E11D48',
  },
  cozy_pajamas: {
    id: 'cozy_pajamas',
    name: 'Midnight Silk Sleepwear',
    emoji: '🛌',
    description: 'Plum Silk Camisole & Navy Silk Pajama Pants',
    tag: 'Cozy',
    boyAccent: '#6366F1',
    girlAccent: '#A855F7',
  },
};

export default function SnapchatBitmojiStage({
  action = 'toast',
  myName = 'You',
  partnerName = 'Partner',
  partnerHandle = '',
  onActionTrigger,
  onOpenCreator,
  className = '',
}) {
  // 3D Parallax Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const stageRef = useRef(null);

  // Active Emote & Wardrobe
  const [activeEmote, setActiveEmote] = useState(action || 'toast');
  const [activeWardrobe, setActiveWardrobe] = useState('streetwear');
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);

  // Clean Display Handles
  const cleanPartner = (partnerName || 'Partner').trim();
  const cleanMe = (myName || 'You').trim();
  const displayPartnerHandle = partnerHandle 
    ? `@${partnerHandle.replace(/^@/, '')}` 
    : `@${cleanPartner.toLowerCase().replace(/\s+/g, '_')}`;
  const displayMyHandle = `@${cleanMe.toLowerCase().replace(/\s+/g, '_')}`;

  // Synthesized Web Audio Sound Effects (Spatial & Realistic)
  const playSfx = useCallback((type = 'clink') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
        // High ceramic coffee mug clink with resonant decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.24, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'chime') {
        // Romantic warm chord (F, A, C)
        [587.33, 739.99, 880.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
          gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.04);
          osc.stop(ctx.currentTime + idx * 0.04 + 0.35);
        });
      } else if (type === 'dance') {
        // Upbeat electronic bell
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.25);
        });
      }
    } catch {}
  }, []);

  // Trigger Interaction with Confetti, SFX & Live Synchronization
  const triggerAction = useCallback((act = 'toast', notifyParent = true) => {
    setActiveEmote(act);

    if (notifyParent && onActionTrigger) {
      onActionTrigger(act);
    }

    if (act === 'toast' || act === 'clink') {
      playSfx('clink');
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24', '#FFFFFF']
      });
      toast.success('Clink! Coffee toasted with ceramic mugs! ☕');
    } else if (act === 'kiss') {
      playSfx('chime');
      confetti({
        particleCount: 50,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF']
      });
      toast.success(`Sweet romantic kiss with ${cleanPartner}! 💋💕`);
    } else if (act === 'hug') {
      playSfx('chime');
      confetti({
        particleCount: 55,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#A855F7']
      });
      toast.success(`Warm loving embrace with ${cleanPartner}! 🫂💖`);
    } else if (act === 'couch') {
      playSfx('chime');
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.65 },
        colors: ['#8B5CF6', '#EC4899', '#FBBF24']
      });
      toast.success(`Cozy velvet couch cuddle with ${cleanPartner}! 🛋️✨`);
    } else if (act === 'dance') {
      playSfx('dance');
      confetti({
        particleCount: 60,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#A855F7', '#38BDF8', '#EC4899', '#F59E0B']
      });
      toast.success('Dancing in 3D sync! 💃🎶');
    }
  }, [cleanPartner, onActionTrigger, playSfx]);

  // Sync incoming parent action
  useEffect(() => {
    if (action && action !== activeEmote) {
      setActiveEmote(action);
    }
  }, [action, activeEmote]);

  // 3D Parallax Pointer Event Handlers
  const handlePointerMove = (e) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Calculate gentle tilt angles (-7 to +7 deg)
    const tiltX = ((x - centerX) / centerX) * 7;
    const tiltY = -((y - centerY) / centerY) * 7;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className={`relative flex flex-col items-center w-full max-w-lg mx-auto select-none ${className}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. 3D BITMOJI STUDIO VIEWPORT (Refined Dark Luxury Obsidian) */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={stageRef}
        onPointerMove={(e) => {
          setIsHovered(true);
          handlePointerMove(e);
        }}
        onPointerLeave={handlePointerLeave}
        style={{
          transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(${isHovered ? 1.015 : 1}, ${isHovered ? 1.015 : 1}, 1)`,
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="relative w-full aspect-[9/14] sm:aspect-[9/13.5] min-h-[520px] sm:min-h-[580px] max-h-[660px] rounded-[40px] overflow-hidden bg-gradient-to-b from-[#111728] via-[#0b0e17] to-[#05070c] shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-2 border-white/10 flex flex-col justify-between p-4 sm:p-5"
      >
        {/* Holographic light sheen reflection */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 3}% ${35 - tilt.y * 3}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 65%)`,
          }}
        />

        {/* Studio Top Atmospheric Glow */}
        <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-rose-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        {/* ------------------------------------------------------------- */}
        {/* A. TOP STATUS HEADER (Verified Handles & Wardrobe Trigger) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex items-center justify-between w-full">
          {/* Couple Verified Status Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black tracking-tight">{cleanMe}</span>
              <span className="text-rose-400 text-xs">♥</span>
              <span className="text-xs font-black tracking-tight">{cleanPartner}</span>
              <span className="hidden sm:inline text-[10px] text-gray-400 font-mono ml-1">
                {displayMyHandle} & {displayPartnerHandle}
              </span>
            </div>
          </div>

          {/* Right Action: Wardrobe Drawer Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWardrobeModal(!showWardrobeModal)}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 shadow-xl text-xs font-bold text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Shirt size={14} className="text-amber-400" />
              <span>Wardrobe</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* B. 3D HERO BITMOJI AVATARS (Authentic Snap 3D CGI Cutouts) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative flex-1 flex flex-col items-center justify-end z-10 w-full overflow-hidden">
          
          {/* Stage Glowing Center Podium */}
          <div className="absolute bottom-6 w-64 sm:w-72 h-14 bg-gradient-to-r from-amber-400/20 via-rose-500/20 to-purple-500/20 rounded-full blur-xl pointer-events-none" />
          
          {/* Floor Perspective Shadow Grid */}
          <div 
            className="absolute bottom-2 w-72 sm:w-80 h-10 border border-white/10 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(244,63,94,0.15) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
              transform: 'rotateX(65deg)',
            }}
          />

          {/* Character Container with Dynamic Contact Positioning */}
          <div className="relative flex items-end justify-center w-full h-[88%] sm:h-[92%] pb-2">
            
            {/* 1. SEPARATE 3D BITMOJI AVATARS WITH REAL SKELETAL MOVEMENT */}
            <div className="relative flex items-end justify-center w-full h-full">

              {/* ── GIRL 3D BITMOJI AVATAR (Left / Nestled) ── */}
              <div 
                style={{
                  transform: activeEmote === 'kiss' 
                    ? 'translateX(40px) translateY(-4px) rotate(9deg) scale(1.05)'
                    : activeEmote === 'hug'
                    ? 'translateX(52px) translateY(-6px) scale(1.08)'
                    : activeEmote === 'dance'
                    ? 'translateX(10px) translateY(-8px) rotate(-4deg)'
                    : activeEmote === 'couch'
                    ? 'translateX(25px) translateY(12px) scale(0.96)'
                    : 'translateX(-12px)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'bottom center',
                }}
                className="relative z-10 h-[82%] sm:h-[86%] max-w-[48%] flex items-end justify-center pointer-events-none"
              >
                <img
                  src="/assets/avatars/snap_partner_hd.png"
                  alt={`${cleanPartner}'s 3D Bitmoji`}
                  className="h-full w-auto object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] select-none"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                  }}
                />
              </div>

              {/* ── BOY 3D BITMOJI AVATAR (Right / Embracing) ── */}
              <div 
                style={{
                  transform: activeEmote === 'kiss' 
                    ? 'translateX(-40px) translateY(-4px) rotate(-9deg) scale(1.05)'
                    : activeEmote === 'hug'
                    ? 'translateX(-52px) translateY(-6px) scale(1.08)'
                    : activeEmote === 'dance'
                    ? 'translateX(-10px) translateY(-8px) rotate(4deg)'
                    : activeEmote === 'couch'
                    ? 'translateX(-25px) translateY(12px) scale(0.96)'
                    : 'translateX(12px)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'bottom center',
                }}
                className="relative z-10 h-[84%] sm:h-[88%] max-w-[48%] flex items-end justify-center pointer-events-none"
              >
                <img
                  src="/assets/avatars/snap_me_hd.png"
                  alt={`${cleanMe}'s 3D Bitmoji`}
                  className="h-full w-auto object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] select-none"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                  }}
                />
              </div>

            </div>

            {/* 2. CONTACT SHADOW UNDERNEATH SNEAKERS & BOOTS */}
            <div className="absolute bottom-1 w-60 sm:w-68 h-4 bg-black/60 blur-[3px] rounded-full pointer-events-none" />

            {/* 3. COUCH PROP (Renders when 'couch' action is selected) */}
            {activeEmote === 'couch' && (
              <div className="absolute bottom-2 inset-x-8 h-28 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-purple-950/80 border border-purple-500/30 backdrop-blur-sm -z-0 shadow-2xl flex items-center justify-between px-6 animate-fadeIn">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-lg">
                  🛋️
                </div>
                <span className="text-[11px] font-bold text-purple-200/90 tracking-wide">
                  Cozy Velvet Sanctuary
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-lg">
                  ✨
                </div>
              </div>
            )}

            {/* 4. DYNAMIC INTERACTIVE EMOTE OVERLAYS */}
            {activeEmote === 'kiss' && (
              <div className="absolute top-1/4 inset-x-0 flex items-center justify-center gap-4 pointer-events-none z-30 animate-pulse">
                <span className="text-2xl animate-ping">💋</span>
                <span className="text-3xl animate-bounce">💕</span>
                <span className="text-2xl animate-ping">💋</span>
              </div>
            )}

            {activeEmote === 'hug' && (
              <div className="absolute top-1/3 inset-x-0 flex items-center justify-center gap-3 pointer-events-none z-30 animate-pulse">
                <span className="text-3xl animate-bounce">🫂</span>
                <span className="text-2xl animate-pulse">💖</span>
              </div>
            )}

            {activeEmote === 'dance' && (
              <div className="absolute top-1/4 inset-x-0 flex items-center justify-center gap-6 pointer-events-none z-30 animate-pulse">
                <span className="text-2xl animate-bounce">🎵</span>
                <span className="text-2xl animate-bounce delay-150">💃</span>
                <span className="text-2xl animate-bounce delay-300">🎶</span>
              </div>
            )}

            {(activeEmote === 'toast' || activeEmote === 'clink') && (
              <div className="absolute bottom-36 inset-x-0 flex items-center justify-center gap-3 pointer-events-none z-30 opacity-75">
                <span className="text-xs animate-pulse">♨️</span>
                <span className="text-xs animate-pulse delay-200">♨️</span>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* C. BOTTOM INTERACTION HINT & TAP REACTION */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex items-center justify-center pointer-events-none">
          <p className="text-[10px] text-slate-400/80 font-medium px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/5">
            Tilt device or drag for 3D depth • Tap action to interact
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* D. WARDROBE DRAWER MODAL */}
        {/* ------------------------------------------------------------- */}
        {showWardrobeModal && (
          <div className="absolute inset-x-3 bottom-3 z-30 bg-[#0f1422]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3.5 shadow-2xl animate-fadeIn flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Shirt size={14} className="text-amber-400" />
                <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                  Select Couple Wardrobe
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowWardrobeModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {Object.values(WARDROBE_COLLECTIONS).map((item) => {
                const isSelected = activeWardrobe === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveWardrobe(item.id);
                      confetti({ particleCount: 30, spread: 60, origin: { y: 0.65 } });
                      toast.success(`Dressed in ${item.name}! ✨`);
                      setShowWardrobeModal(false);
                    }}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 shadow-md ring-1 ring-rose-400'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{item.tag}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-rose-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REFINED DARK LUXURY ACTION DOCK */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        <button
          type="button"
          onClick={() => triggerAction('toast')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'toast' || activeEmote === 'clink'
              ? 'bg-amber-400 text-stone-950 scale-105 ring-2 ring-amber-300'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Coffee size={15} className={activeEmote === 'toast' || activeEmote === 'clink' ? 'text-stone-950' : 'text-amber-400'} />
          <span>Toast Coffee ☕</span>
        </button>

        <button
          type="button"
          onClick={() => triggerAction('kiss')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'kiss'
              ? 'bg-rose-500 text-white scale-105 ring-2 ring-rose-400'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Heart size={15} className={`fill-rose-400 ${activeEmote === 'kiss' ? 'text-white' : 'text-rose-400'}`} />
          <span>Kiss 💋</span>
        </button>

        <button
          type="button"
          onClick={() => triggerAction('hug')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'hug'
              ? 'bg-pink-500 text-white scale-105 ring-2 ring-pink-300'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🫂</span>
          <span>Warm Hug</span>
        </button>

        <button
          type="button"
          onClick={() => triggerAction('couch')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'couch'
              ? 'bg-indigo-500 text-white scale-105 ring-2 ring-indigo-300'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🛋️</span>
          <span>Couch Cuddle</span>
        </button>

        <button
          type="button"
          onClick={() => triggerAction('dance')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            activeEmote === 'dance'
              ? 'bg-purple-500 text-white scale-105 ring-2 ring-purple-400'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Music size={15} className={activeEmote === 'dance' ? 'text-white' : 'text-purple-400'} />
          <span>Slow Dance 💃</span>
        </button>
      </div>

    </div>
  );
}

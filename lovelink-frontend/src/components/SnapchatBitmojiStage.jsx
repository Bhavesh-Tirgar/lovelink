import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Heart, Coffee, Shirt, Music, Check, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// ----------------------------------------------------------------------
// WARDROBE CATALOGS FOR SNAPCHAT 3D BITMOJIS
// ----------------------------------------------------------------------
export const WARDROBE_COLLECTIONS = {
  streetwear: {
    id: 'streetwear',
    name: 'Streetwear & Denim',
    emoji: '🧢',
    description: 'SOX Fitted, Rolling Loud Bomber, Carhartt Crop & Dunks',
    tag: 'Signature',
    boyAccent: '#38BDF8',
    girlAccent: '#D97706',
    overlayFilter: 'none',
  },
  varsity_college: {
    id: 'varsity_college',
    name: 'College Varsity',
    emoji: '🧥',
    description: 'Deep Royal Navy Varsity & Amber Cropped Bomber',
    tag: 'Campus',
    boyAccent: '#2563EB',
    girlAccent: '#F59E0B',
    overlayFilter: 'contrast(1.04) saturate(1.15)',
  },
  date_night: {
    id: 'date_night',
    name: 'Date Night Velvet',
    emoji: '✨',
    description: 'Midnight Obsidian Tuxedo & Rose-Gold Velvet Dress',
    tag: 'Luxury',
    boyAccent: '#F43F5E',
    girlAccent: '#FB7185',
    overlayFilter: 'brightness(0.96) contrast(1.1) saturate(1.1)',
  },
  cozy_pajamas: {
    id: 'cozy_pajamas',
    name: 'Midnight Silk Sleepwear',
    emoji: '🛌',
    description: 'Plum Silk Camisole & Navy Silk Pajama Pants',
    tag: 'Cozy',
    boyAccent: '#818CF8',
    girlAccent: '#C084FC',
    overlayFilter: 'brightness(1.02) saturate(0.95)',
  },
  obsidian_cyber: {
    id: 'obsidian_cyber',
    name: 'Cyber Noir Stealth',
    emoji: '🖤',
    description: 'Matte Black Cyber Jackets & Ambient Ultraviolet Glow',
    tag: 'Stealth',
    boyAccent: '#A855F7',
    girlAccent: '#EC4899',
    overlayFilter: 'contrast(1.12) saturate(1.2)',
  },
};

export default function SnapchatBitmojiStage({
  action = 'toast',
  actionNonce = 0,
  myName = 'You',
  partnerName = 'Partner',
  partnerHandle = '',
  onEmoteTrigger,
  onOpenCreator,
  className = '',
  isPlayingMusic = false,
}) {
  // 3D Parallax Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const stageRef = useRef(null);

  // Active Emote & Wardrobe
  const [activeEmote, setActiveEmote] = useState(action || 'toast');
  const [activeWardrobe, setActiveWardrobe] = useState('streetwear');
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [waveCounter, setWaveCounter] = useState(0);

  // Beat pulse timer for music
  const [musicTick, setMusicTick] = useState(0);
  useEffect(() => {
    if (!isPlayingMusic) return;
    const interval = setInterval(() => {
      setMusicTick(t => (t + 1) % 100);
    }, 450); // ~133 BPM beat pulse
    return () => clearInterval(interval);
  }, [isPlayingMusic]);

  // Clean Display Handles
  const cleanPartner = (partnerName || 'Partner').trim();
  const cleanMe = (myName || 'You').trim();
  const displayPartnerHandle = partnerHandle 
    ? `@${partnerHandle.replace(/^@/, '')}` 
    : `@${cleanPartner.toLowerCase().replace(/\s+/g, '_')}`;
  const displayMyHandle = `@${cleanMe.toLowerCase().replace(/\s+/g, '_')}`;

  // Synthesized Web Audio Sound Effects (Spatial & Crisp)
  const playSfx = useCallback((type = 'clink') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
        // High ceramic coffee mug clink with ringing resonance
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1480, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
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
        // Upbeat electronic bells
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.06);
          osc.stop(ctx.currentTime + idx * 0.06 + 0.25);
        });
      }
    } catch { }
  }, []);

  // Trigger Action Emote
  const triggerEmote = useCallback((emoteType, notifyParent = true) => {
    setActiveEmote(emoteType);

    if (notifyParent && onEmoteTrigger) {
      onEmoteTrigger(emoteType);
    }

    if (emoteType === 'toast' || emoteType === 'clink') {
      playSfx('clink');
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FFFFFF'],
      });
      toast.success('Cheers! Coffee toasted with mugs! ☕🥂');
    } else if (emoteType === 'kiss') {
      playSfx('chime');
      confetti({
        particleCount: 55,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FDA4AF'],
      });
      toast.success(`Sweet romantic kiss with ${cleanPartner}! 💋💕`);
    } else if (emoteType === 'hug') {
      playSfx('chime');
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#FBBF24', '#FFFFFF'],
      });
      toast.success(`Warm couple hug with ${cleanPartner}! 🤗💖`);
    } else if (emoteType === 'couch') {
      playSfx('chime');
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A855F7', '#EC4899', '#F43F5E', '#FBBF24'],
      });
      toast.success(`Cozying up & cuddling on the couch! 🛋️✨`);
    } else if (emoteType === 'dance') {
      playSfx('dance');
      confetti({
        particleCount: 55,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#F59E0B'],
      });
      toast.success('Dancing in sync! 💃🕺🎶');
    } else if (emoteType === 'wave') {
      playSfx('chime');
      setWaveCounter(c => c + 1);
      toast.success(`Waving hello to ${cleanPartner}! 👋✨`);
    }
  }, [cleanPartner, playSfx, onEmoteTrigger]);

  // Synchronize incoming action from parent
  useEffect(() => {
    if (action) {
      const normalized = (action === 'clink' ? 'toast' : action);
      setActiveEmote(normalized);
    }
  }, [action, actionNonce]);

  // Mouse / Pointer Parallax Handlers
  const handlePointerMove = (e) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = ((x - centerX) / centerX) * 8;
    const tiltY = -((y - centerY) / centerY) * 8;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const currentWardrobeObj = WARDROBE_COLLECTIONS[activeWardrobe] || WARDROBE_COLLECTIONS.streetwear;
  const isDancing = activeEmote === 'dance';
  const isKissing = activeEmote === 'kiss';
  const isHugging = activeEmote === 'hug';
  const isCouch = activeEmote === 'couch';
  const isToasting = activeEmote === 'toast' || activeEmote === 'clink';
  const isWaving = activeEmote === 'wave';

  // Dynamic beat bounce
  const musicBounce = isPlayingMusic ? (musicTick % 2 === 0 ? -4 : 0) : 0;
  const danceBob = isDancing ? ((musicTick % 2 === 0 ? -12 : 4)) : 0;
  const danceSwayGirl = isDancing ? ((musicTick % 2 === 0 ? -4 : 6)) : 0;
  const danceSwayBoy = isDancing ? ((musicTick % 2 === 0 ? 6 : -4)) : 0;

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
        className="relative w-full aspect-[9/12.5] min-h-[430px] sm:min-h-[470px] max-h-[530px] rounded-[32px] overflow-hidden bg-gradient-to-b from-[#0d101a] via-[#090b12] to-[#040508] shadow-[0_25px_80px_rgba(0,0,0,0.85)] border-2 border-white/10 flex flex-col justify-between p-3.5 sm:p-4"
      >
        {/* Holographic light sheen reflection across glass */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 3}% ${35 - tilt.y * 3}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 65%)`,
          }}
        />

        {/* Ambient Top Glow */}
        <div 
          className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b pointer-events-none transition-colors duration-500"
          style={{
            background: `linear-gradient(to bottom, ${currentWardrobeObj.boyAccent}15, ${currentWardrobeObj.girlAccent}10, transparent)`,
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* A. TOP STATUS HEADER (Verified Handles & Wardrobe Trigger) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex items-center justify-between w-full">
          {/* Couple Verified Status Badge */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black tracking-tight">{cleanMe}</span>
            <span className="text-rose-400 text-xs">♥</span>
            <span className="text-xs font-black tracking-tight">{cleanPartner}</span>
            <span className="hidden sm:inline text-[10px] text-gray-400 font-mono ml-1">
              {displayMyHandle} & {displayPartnerHandle}
            </span>
          </div>

          {/* Right Action: Wardrobe Drawer Switcher */}
          <button
            type="button"
            onClick={() => setShowWardrobeModal(!showWardrobeModal)}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 shadow-xl text-xs font-bold text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-1.5"
            title="Switch Streetwear & Outfits"
          >
            <Shirt size={14} className="text-amber-400" />
            <span className="hidden sm:inline">{currentWardrobeObj.name}</span>
            <span className="sm:hidden">Closet</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* B. 3D HERO BITMOJI AVATARS (Authentic Snap 3D Couple) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative flex-1 flex flex-col items-center justify-end z-10 w-full overflow-hidden">
          
          {/* Glowing Center Stage Podium */}
          <div 
            className="absolute bottom-5 w-68 sm:w-76 h-12 rounded-full blur-xl pointer-events-none transition-colors duration-500"
            style={{
              background: `radial-gradient(ellipse at center, ${currentWardrobeObj.boyAccent}30 0%, ${currentWardrobeObj.girlAccent}25 50%, transparent 80%)`,
            }}
          />
          
          {/* Floor Shadow Oval */}
          <div 
            className="absolute bottom-1 w-64 sm:w-72 h-8 bg-black/60 blur-[3px] rounded-full pointer-events-none"
            style={{ transform: 'rotateX(60deg)' }}
          />

          {/* Floating Music Notes when music is playing */}
          {isPlayingMusic && (
            <div className="absolute top-1/4 inset-x-8 flex justify-between pointer-events-none z-30 opacity-80">
              <span className="text-lg text-purple-400 animate-bounce">🎵</span>
              <span className="text-xl text-rose-400 animate-pulse delay-150">🎶</span>
              <span className="text-lg text-amber-300 animate-bounce delay-300">♪</span>
              <span className="text-base text-pink-400 animate-pulse delay-75">♫</span>
            </div>
          )}

          {/* Character Container with Dynamic Contact Positioning */}
          <div className="relative flex items-end justify-center w-full h-[88%] sm:h-[92%] pb-1">
            
            {/* 1. SEPARATE 3D BITMOJI AVATARS WITH REAL CONTACT INTERACTION */}
            <div className="relative flex items-end justify-center w-full h-full">

              {/* ── GIRL 3D BITMOJI AVATAR (Left / Neha) ── */}
              <div 
                style={{
                  transform: isKissing 
                    ? 'translateX(44px) translateY(-6px) rotate(11deg) scale(1.05)'
                    : isHugging
                    ? 'translateX(54px) translateY(-8px) rotate(6deg) scale(1.08)'
                    : isDancing
                    ? `translateX(16px) translateY(${danceBob}px) rotate(${danceSwayGirl}deg) scale(1.02)`
                    : isCouch
                    ? 'translateX(30px) translateY(16px) rotate(4deg) scale(0.96)'
                    : isWaving
                    ? 'translateX(-6px) translateY(-4px) rotate(-6deg)'
                    : `translateX(-8px) translateY(${musicBounce}px)`,
                  transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'bottom center',
                  filter: currentWardrobeObj.overlayFilter,
                }}
                className="relative z-10 h-[86%] sm:h-[90%] max-w-[48%] flex items-end justify-center pointer-events-none"
              >
                <img
                  src="/assets/avatars/snap_girl_cutout.png"
                  alt={`${cleanPartner}'s 3D Bitmoji`}
                  className="h-full w-auto object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] select-none"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
              </div>

              {/* ── BOY 3D BITMOJI AVATAR (Right / Bhavesh) ── */}
              <div 
                style={{
                  transform: isKissing 
                    ? 'translateX(-44px) translateY(-6px) rotate(-11deg) scale(1.05)'
                    : isHugging
                    ? 'translateX(-54px) translateY(-8px) rotate(-6deg) scale(1.08)'
                    : isDancing
                    ? `translateX(-16px) translateY(${danceBob}px) rotate(${danceSwayBoy}deg) scale(1.02)`
                    : isCouch
                    ? 'translateX(-30px) translateY(16px) rotate(-4deg) scale(0.96)'
                    : isWaving
                    ? `translateX(6px) translateY(-6px) rotate(${waveCounter % 2 === 0 ? 12 : 4}deg)`
                    : `translateX(8px) translateY(${musicBounce}px)`,
                  transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: 'bottom center',
                  filter: currentWardrobeObj.overlayFilter,
                }}
                className="relative z-10 h-[88%] sm:h-[92%] max-w-[48%] flex items-end justify-center pointer-events-none"
              >
                <img
                  src="/assets/avatars/snap_boy_cutout.png"
                  alt={`${cleanMe}'s 3D Bitmoji`}
                  className="h-full w-auto object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] select-none"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
              </div>

            </div>

            {/* 2. COUCH PROP (Renders when 'couch' action is active) */}
            {isCouch && (
              <div className="absolute bottom-2 inset-x-6 h-28 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-purple-950/80 border border-purple-500/30 backdrop-blur-sm -z-0 shadow-2xl flex items-center justify-between px-6 animate-fadeIn">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-lg">
                  🛋️
                </div>
                <span className="text-[11px] font-bold text-purple-200/90 tracking-wide">
                  Cozy Velvet Couple Sanctuary
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-lg">
                  ✨
                </div>
              </div>
            )}

            {/* 3. DYNAMIC INTERACTIVE EMOTE OVERLAYS */}
            {isKissing && (
              <div className="absolute top-1/4 inset-x-0 flex items-center justify-center gap-4 pointer-events-none z-30 animate-pulse">
                <span className="text-3xl animate-ping">💋</span>
                <span className="text-4xl animate-bounce">💕</span>
                <span className="text-3xl animate-ping">💋</span>
              </div>
            )}

            {isHugging && (
              <div className="absolute top-1/3 inset-x-0 flex items-center justify-center gap-3 pointer-events-none z-30 animate-pulse">
                <span className="text-3xl animate-bounce">🫂</span>
                <span className="text-3xl animate-pulse">💖</span>
              </div>
            )}

            {isDancing && (
              <div className="absolute top-1/4 inset-x-0 flex items-center justify-center gap-6 pointer-events-none z-30 animate-pulse">
                <span className="text-2xl animate-bounce">🎵</span>
                <span className="text-2xl animate-bounce delay-150">💃</span>
                <span className="text-2xl animate-bounce delay-300">🕺</span>
                <span className="text-2xl animate-bounce delay-200">🎶</span>
              </div>
            )}

            {isToasting && (
              <div className="absolute bottom-36 inset-x-0 flex items-center justify-center gap-6 pointer-events-none z-30">
                <span className="text-xs text-amber-300 animate-pulse">♨️</span>
                <span className="text-lg">☕✨</span>
                <span className="text-xs text-amber-300 animate-pulse delay-200">♨️</span>
              </div>
            )}

            {isWaving && (
              <div className="absolute top-1/4 right-1/4 pointer-events-none z-30 animate-bounce">
                <span className="text-3xl">👋✨</span>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* C. BOTTOM INTERACTION HINT & TAP REACTION */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex items-center justify-center pointer-events-none">
          <p className="text-[10px] text-slate-400/80 font-medium px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/5">
            Tilt device or drag for 3D depth • Tap action buttons below to interact
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
                  Couple Streetwear & Outfits
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWardrobeModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.values(WARDROBE_COLLECTIONS).map((item) => {
                const isSelected = activeWardrobe === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveWardrobe(item.id);
                      setShowWardrobeModal(false);
                      confetti({
                        particleCount: 30,
                        spread: 50,
                        origin: { y: 0.6 },
                        colors: [item.boyAccent, item.girlAccent, '#FFFFFF'],
                      });
                      toast.success(`Dressed in ${item.name}! ✨`);
                    }}
                    className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white/15 border-white/30 shadow-md ring-1 ring-white/40'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="text-[9px] bg-white/10 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate max-w-[170px]">{item.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REACTION EMOTE DOCK (Responsive, Animated & Synchronized) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        <button
          type="button"
          onClick={() => triggerEmote('toast')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isToasting
              ? 'bg-amber-400 text-stone-950 scale-105 ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Coffee size={15} className="text-amber-400" />
          <span>Toast Coffee ☕</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('kiss')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isKissing
              ? 'bg-rose-500 text-white scale-105 ring-2 ring-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Heart size={15} className="fill-rose-400 text-rose-400" />
          <span>Kiss 💕</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('hug')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isHugging
              ? 'bg-pink-500 text-white scale-105 ring-2 ring-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🤗</span>
          <span>Warm Hug</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('couch')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isCouch
              ? 'bg-purple-600 text-white scale-105 ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <span className="text-sm">🛋️</span>
          <span>Couch Cuddle</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('dance')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isDancing
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white scale-105 ring-2 ring-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          <Music size={15} className="text-purple-300" />
          <span>Dance Party 💃</span>
        </button>

        <button
          type="button"
          onClick={() => triggerEmote('wave')}
          className={`px-4 py-2.5 rounded-full font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
            isWaving
              ? 'bg-sky-400 text-stone-950 scale-105 ring-2 ring-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
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

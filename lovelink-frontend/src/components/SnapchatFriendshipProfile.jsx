import React, { useState, useRef, useCallback } from 'react';
import { 
  Heart, Coffee, Flame, 
  Palette, Check, ArrowLeft,
  RotateCw, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';

export default function SnapchatFriendshipProfile({
  myName = 'Me',
  partnerName = 'Neha',
  onOpenCreator,
  onOpen3DCanvas,
  onBack,
  className = '',
}) {
  // Themes
  const themes = {
    yellow: {
      name: 'Snap Yellow',
      bgClass: 'from-[#fff500] via-[#fffc00] to-[#e6d000]',
      textColor: 'text-stone-900',
      pillBg: 'bg-[#8d8234]/80 text-[#fff9c4]',
      podiumBg: '#e6c800',
    },
    sunset: {
      name: 'Sunset Sky',
      bgClass: 'from-[#ff7e5f] via-[#feb47b] to-[#f89b65]',
      textColor: 'text-stone-900',
      pillBg: 'bg-black/50 text-white',
      podiumBg: '#e27b58',
    },
    neon: {
      name: 'Neon Violet',
      bgClass: 'from-[#4a00e0] via-[#8e2de2] to-[#240b36]',
      textColor: 'text-white',
      pillBg: 'bg-white/20 text-white',
      podiumBg: '#3a086b',
    },
    midnight: {
      name: 'Midnight Star',
      bgClass: 'from-[#0f172a] via-[#1e293b] to-[#020617]',
      textColor: 'text-white',
      pillBg: 'bg-white/15 text-white',
      podiumBg: '#090d16',
    },
  };

  const [currentTheme, setCurrentTheme] = useState('yellow');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // 3D Parallax Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  // Tap Reaction & Speech Bubble State
  const [activeBubble, setActiveBubble] = useState(null); // 'neha', 'me', 'toast', null
  const bubbleTimerRef = useRef(null);

  // Synthesized Web Audio Sound Effects
  const playSfx = useCallback((type = 'clink') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'clink') {
        // High ceramic coffee mug clink
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'chime') {
        // Soft positive chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.22); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'pop') {
        // Playful pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      }
    } catch {
      // Audio autoplay restrictions or muted
    }
  }, []);

  // Parallax Event Handlers
  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: +(x * 14).toFixed(2), // yaw deg
      y: +(-y * 14).toFixed(2), // pitch deg
    });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Trigger Coffee Toast Action
  const triggerCoffeeToast = async () => {
    playSfx('clink');
    setActiveBubble('toast');
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3200);

    confetti({
      particleCount: 50,
      spread: 75,
      origin: { y: 0.55 },
      colors: ['#F59E0B', '#FBBF24', '#EC4899', '#FFFFFF'],
    });

    try {
      await api.post('/room/couple-interaction', { action: 'toast' });
      toast.success('Clink! Coffee toasted with love! ☕✨');
    } catch {
      // Offline fallback still works locally
    }
  };

  // Tap Neha
  const handleTapPartner = () => {
    playSfx('pop');
    setActiveBubble('neha');
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3200);

    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.5, x: 0.4 },
      colors: ['#EC4899', '#FDA4AF'],
    });
  };

  // Tap User
  const handleTapMe = () => {
    playSfx('chime');
    setActiveBubble('me');
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3200);

    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.5, x: 0.6 },
      colors: ['#38BDF8', '#60A5FA', '#FBBF24'],
    });
  };

  const handleLoveBurst = () => {
    playSfx('chime');
    confetti({
      particleCount: 60,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#E11D48', '#F43F5E', '#FB7185', '#FFF1F2'],
    });
    toast.success('Sending infinite love! 💖');
  };

  const themeConfig = themes[currentTheme];

  return (
    <div className={`relative flex flex-col items-center w-full max-w-lg mx-auto select-none ${className}`}>
      
      {/* 1. SNAPCHAT FRIENDSHIP PROFILE CARD WITH 3D PARALLAX */}
      <div
        ref={cardRef}
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
        className={`relative w-full aspect-[9/14] sm:aspect-[9/13.5] min-h-[520px] sm:min-h-[580px] max-h-[660px] rounded-[36px] overflow-hidden bg-gradient-to-b ${themeConfig.bgClass} shadow-[0_30px_70px_rgba(0,0,0,0.45)] border-4 border-white/20 flex flex-col justify-between p-4 sm:p-5`}
      >
        
        {/* Holographic dynamic light sheen overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 2}% ${35 - tilt.y * 2}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 65%)`,
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* A. SNAPCHAT FRIENDSHIP PROFILE HEADER */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex items-center justify-between w-full">
          {/* Back button or ghost */}
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center transition-transform active:scale-90 shadow-md"
                title="Back to Room"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-white shadow-md">
              <span className="text-sm">👻</span>
              <span className="text-xs font-black tracking-tight">Friendship Profile</span>
            </div>
          </div>

          {/* Right utility buttons: Streak Counter + Theme Switcher */}
          <div className="flex items-center gap-1.5">
            {/* Streak Counter Badge */}
            <div 
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md animate-pulse"
              title="Snapstreak: 100 Days together!"
            >
              <Flame size={14} className="fill-white" />
              <span>100</span>
            </div>

            {/* Theme Palette Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="w-9 h-9 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 shadow-md"
                title="Change Stage Theme"
              >
                <Palette size={16} />
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 top-11 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 w-36 animate-fadeIn">
                  {Object.entries(themes).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCurrentTheme(key);
                        setShowThemeMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        currentTheme === key ? 'bg-amber-400 text-stone-900' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>{t.name}</span>
                      {currentTheme === key && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* B. SPEECH BUBBLES ON INTERACTIVE TAP */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-30 w-full flex justify-center -mb-2 pointer-events-none">
          {activeBubble === 'neha' && (
            <div className="bg-white/95 text-stone-900 px-3.5 py-1.5 rounded-2xl rounded-bl-sm shadow-xl border border-amber-300 text-xs font-bold animate-bounce flex items-center gap-1.5 max-w-[85%] text-center">
              <span>☕</span>
              <span>"Coffee date with you is my favorite time! ✨"</span>
            </div>
          )}

          {activeBubble === 'me' && (
            <div className="bg-white/95 text-stone-900 px-3.5 py-1.5 rounded-2xl rounded-br-sm shadow-xl border border-sky-300 text-xs font-bold animate-bounce flex items-center gap-1.5 max-w-[85%] text-center">
              <span>🕶️</span>
              <span>"Rolling Loud vibes with you always! 🔥"</span>
            </div>
          )}

          {activeBubble === 'toast' && (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 px-4 py-2 rounded-2xl shadow-2xl border-2 border-white text-xs font-black animate-pulse flex items-center gap-2">
              <span className="text-base">☕🥂</span>
              <span>"CLINK! Cheers to our endless love story!"</span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* C. HERO BITMOJI AVATARS (FULL-HEIGHT, CRYSTAL-CLEAR, CENTERED) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative flex-1 flex flex-col items-center justify-end z-10 w-full overflow-hidden">
          
          {/* Authentic Stage: Both partners standing proudly side-by-side */}
          <div className="relative flex items-end justify-center w-full h-[82%] sm:h-[86%]">
            
            {/* The Authentic Snapchat Bitmoji Couple Image (Huge, Sharp, High Resolution) */}
            <img
              src="/assets/avatars/snap_friendship_stage.jpg"
              alt="Snapchat Couple"
              className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.3)] transition-transform duration-300 pointer-events-none select-none"
              style={{
                imageRendering: '-webkit-optimize-contrast',
              }}
            />

            {/* Interactive Tap Zones over Left Partner, Right Partner, and Center Coffee Cups */}
            <div 
              onClick={handleTapPartner}
              className="absolute left-0 bottom-12 w-[46%] h-[78%] cursor-pointer group z-20"
              title="Tap Neha to react! ☕"
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-pink-300 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                Tap Neha 💕
              </div>
            </div>

            <div 
              onClick={handleTapMe}
              className="absolute right-0 bottom-12 w-[46%] h-[78%] cursor-pointer group z-20"
              title={`Tap ${myName} to react! 🎧`}
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                Tap {myName} ✨
              </div>
            </div>

            <div 
              onClick={triggerCoffeeToast}
              className="absolute left-1/2 -translate-x-1/2 bottom-28 w-[32%] h-[32%] cursor-pointer group z-30 flex items-center justify-center"
              title="Tap Coffee Mugs to Clink & Toast! ☕🥂"
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-amber-400 text-stone-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg pointer-events-none animate-bounce">
                Toast Mugs! ☕
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* D. SNAPCHAT FRIENDSHIP CAPSULE PILL (AUTHENTIC @neha_xmusic TAG) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex flex-col items-center w-full mt-1">
          <div className={`flex items-center gap-2 ${themeConfig.pillBg} backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-lg`}>
            <span className="text-xs font-black tracking-wide">
              @ neha_xmusic
            </span>
            <span className="text-xs opacity-60">•</span>
            <span className="text-xs font-black tracking-wide">
              @ {myName.toLowerCase().replace(/\s+/g, '_')}
            </span>
            <Heart size={13} className="fill-rose-400 text-rose-400 ml-1 inline animate-pulse" />
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SNAPCHAT ACTION TOOLBAR (BELOW CARD) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 mt-4 flex-wrap justify-center w-full">
        
        {/* Coffee Toast Button */}
        <button
          onClick={triggerCoffeeToast}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Coffee size={14} className="fill-stone-950" />
          <span>Toast Coffee ☕</span>
        </button>

        {/* Love Burst */}
        <button
          onClick={handleLoveBurst}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Heart size={14} className="fill-white" />
          <span>Love Burst 💕</span>
        </button>

        {/* 3D WebGL Canvas Mode Switcher */}
        <button
          onClick={onOpen3DCanvas}
          className="px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 backdrop-blur-md"
          title="Switch to 360° 3D WebGL Mode"
        >
          <RotateCw size={14} className="text-amber-400" />
          <span>3D Spin 🔄</span>
        </button>

        {/* 3D Studio (Selfie-to-3D) */}
        <button
          onClick={onOpenCreator}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
          title="Open Ready Player Me 3D Studio"
        >
          <Sparkles size={14} className="text-yellow-300" />
          <span>3D Studio ✨</span>
        </button>
      </div>

      {/* Helpful Hint */}
      <p className="text-[11px] opacity-60 font-medium text-center mt-2.5">
        💡 Move your cursor or tilt your phone for 3D parallax • Tap avatars or coffee mugs to interact!
      </p>

    </div>
  );
}

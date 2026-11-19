import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Heart, Coffee, Flame, 
  Palette, Check, ArrowLeft,
  RotateCw, Sparkles, Shirt, Music
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';

export default function SnapchatFriendshipProfile({
  action = 'couch',
  myName = 'You',
  partnerName = 'Partner',
  partnerHandle = '',
  onActionTrigger,
  onOpenCreator,
  onOpenWardrobe,
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
      pillBg: 'bg-black/45 text-amber-200 border-amber-300/40',
      podiumBg: '#e6c800',
      accentColor: '#F59E0B',
    },
    sunset: {
      name: 'Sunset Sky',
      bgClass: 'from-[#ff7e5f] via-[#feb47b] to-[#f89b65]',
      textColor: 'text-stone-900',
      pillBg: 'bg-black/50 text-white border-white/20',
      podiumBg: '#e27b58',
      accentColor: '#FB7185',
    },
    neon: {
      name: 'Neon Violet',
      bgClass: 'from-[#4a00e0] via-[#8e2de2] to-[#240b36]',
      textColor: 'text-white',
      pillBg: 'bg-white/20 text-white border-white/25',
      podiumBg: '#3a086b',
      accentColor: '#A855F7',
    },
    midnight: {
      name: 'Midnight Star',
      bgClass: 'from-[#0f172a] via-[#1e293b] to-[#020617]',
      textColor: 'text-white',
      pillBg: 'bg-white/15 text-white border-white/20',
      podiumBg: '#090d16',
      accentColor: '#38BDF8',
    },
  };

  const [currentTheme, setCurrentTheme] = useState('yellow');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // 3D Parallax Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  // Speech Bubble State
  const [activeBubble, setActiveBubble] = useState(null);
  const bubbleTimerRef = useRef(null);

  // Action / Emote Animation state
  const [activeAnimation, setActiveAnimation] = useState(action || 'couch');

  const cleanPartner = (partnerName || 'Partner').trim();
  const cleanMe = (myName || 'You').trim();
  const displayPartnerHandle = partnerHandle ? `@${partnerHandle.replace(/^@/, '')}` : `@${cleanPartner.toLowerCase().replace(/\s+/g, '_')}`;
  const displayMyHandle = `@${cleanMe.toLowerCase().replace(/\s+/g, '_')}`;

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
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'pop') {
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
      // Audio autoplay restrictions
    }
  }, []);

  // Sync incoming action from parent / WebSocket
  useEffect(() => {
    if (!action) return;
    setActiveAnimation(action);

    if (action === 'kiss') {
      playSfx('chime');
      setActiveBubble('kiss');
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#F43F5E', '#EC4899', '#FDA4AF'] });
    } else if (action === 'hug') {
      playSfx('chime');
      setActiveBubble('hug');
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: ['#EC4899', '#FBBF24', '#FFFFFF'] });
    } else if (action === 'toast' || action === 'clink') {
      playSfx('clink');
      setActiveBubble('toast');
      confetti({ particleCount: 45, spread: 70, origin: { y: 0.6 }, colors: ['#F59E0B', '#FBBF24', '#FCD34D'] });
    } else if (action === 'dance') {
      playSfx('chime');
      setActiveBubble('dance');
      confetti({ particleCount: 50, spread: 80, origin: { y: 0.6 }, colors: ['#8B5CF6', '#EC4899', '#3B82F6'] });
    }

    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3500);
  }, [action, playSfx]);

  // Parallax Event Handlers
  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: +(x * 12).toFixed(2),
      y: +(-y * 12).toFixed(2),
    });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Trigger an action and sync to parent / backend
  const handleTriggerAction = async (act) => {
    setActiveAnimation(act);
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3500);

    if (onActionTrigger) {
      onActionTrigger(act);
    } else {
      try {
        await api.post('/room/couple-interaction', { action: act });
      } catch {}
    }

    if (act === 'toast' || act === 'clink') {
      playSfx('clink');
      setActiveBubble('toast');
      confetti({ particleCount: 50, spread: 75, origin: { y: 0.55 }, colors: ['#F59E0B', '#FBBF24', '#EC4899', '#FFFFFF'] });
      toast.success('Clink! Coffee toasted with love! ☕✨');
    } else if (act === 'kiss') {
      playSfx('chime');
      setActiveBubble('kiss');
      confetti({ particleCount: 45, spread: 75, origin: { y: 0.55 }, colors: ['#E11D48', '#F43F5E', '#FDA4AF'] });
      toast.success(`Sweet romantic kiss with ${cleanPartner}! 💋💕`);
    } else if (act === 'hug') {
      playSfx('chime');
      setActiveBubble('hug');
      confetti({ particleCount: 50, spread: 80, origin: { y: 0.55 }, colors: ['#EC4899', '#F43F5E', '#FBBF24'] });
      toast.success(`Warm couple hug with ${cleanPartner}! 🫂💖`);
    } else if (act === 'dance') {
      playSfx('chime');
      setActiveBubble('dance');
      confetti({ particleCount: 55, spread: 85, origin: { y: 0.55 }, colors: ['#8B5CF6', '#EC4899', '#FBBF24'] });
      toast.success('Grooving to the music together! 💃🎶');
    } else if (act === 'hand_hold') {
      playSfx('chime');
      setActiveBubble('hand_hold');
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.55 }, colors: ['#F59E0B', '#FBBF24', '#FFFFFF'] });
      toast.success('Holding hands forever! 🤝✨');
    }
  };

  const themeConfig = themes[currentTheme];

  return (
    <div className={`relative flex flex-col items-center w-full max-w-lg mx-auto select-none ${className}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. SNAPCHAT FRIENDSHIP PROFILE CARD WITH 3D PARALLAX */}
      {/* ------------------------------------------------------------- */}
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
        className={`relative w-full aspect-[9/14] sm:aspect-[9/13.5] min-h-[520px] sm:min-h-[580px] max-h-[660px] rounded-[38px] overflow-hidden bg-gradient-to-b ${themeConfig.bgClass} shadow-[0_30px_80px_rgba(0,0,0,0.5)] border-4 border-white/20 flex flex-col justify-between p-4 sm:p-5`}
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
                type="button"
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-transform active:scale-90 shadow-md"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-white shadow-md">
              <span className="text-sm">👻</span>
              <span className="text-xs font-black tracking-tight">Friendship Profile</span>
            </div>
          </div>

          {/* Right utility buttons: Streak Counter + Theme Switcher */}
          <div className="flex items-center gap-1.5">
            {/* Streak Counter Badge */}
            <div 
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md animate-pulse"
              title="Snapstreak together!"
            >
              <Flame size={14} className="fill-white" />
              <span>100</span>
            </div>

            {/* Theme Palette Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 shadow-md"
                title="Change Stage Theme"
              >
                <Palette size={16} />
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 top-11 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 w-36 animate-fadeIn">
                  {Object.entries(themes).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
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
        <div className="relative z-30 w-full flex justify-center -mb-2 pointer-events-none min-h-[38px]">
          {activeBubble === 'partner' && (
            <div className="bg-white/95 text-stone-900 px-3.5 py-1.5 rounded-2xl rounded-bl-sm shadow-xl border border-amber-300 text-xs font-bold animate-bounce flex items-center gap-1.5 max-w-[85%] text-center">
              <span>☕</span>
              <span>"{cleanPartner}: Coffee date with you is my favorite time! ✨"</span>
            </div>
          )}

          {activeBubble === 'me' && (
            <div className="bg-white/95 text-stone-900 px-3.5 py-1.5 rounded-2xl rounded-br-sm shadow-xl border border-sky-300 text-xs font-bold animate-bounce flex items-center gap-1.5 max-w-[85%] text-center">
              <span>🕶️</span>
              <span>"{cleanMe}: Rolling Loud vibes with you always! 🔥"</span>
            </div>
          )}

          {activeBubble === 'toast' && (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 px-4 py-2 rounded-2xl shadow-2xl border-2 border-white text-xs font-black animate-pulse flex items-center gap-2">
              <span className="text-base">☕🥂</span>
              <span>"CLINK! Cheers to our endless love story!"</span>
            </div>
          )}

          {activeBubble === 'kiss' && (
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-white text-xs font-black animate-bounce flex items-center gap-2">
              <span className="text-base">💋💕</span>
              <span>"Sweet romantic kiss with {cleanPartner}!"</span>
            </div>
          )}

          {activeBubble === 'hug' && (
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-white text-xs font-black animate-bounce flex items-center gap-2">
              <span className="text-base">🫂💖</span>
              <span>"Warm loving embrace together!"</span>
            </div>
          )}

          {activeBubble === 'dance' && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-white text-xs font-black animate-bounce flex items-center gap-2">
              <span className="text-base">💃🎶</span>
              <span>"Dancing to our song in sync!"</span>
            </div>
          )}

          {activeBubble === 'hand_hold' && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-white text-xs font-black animate-bounce flex items-center gap-2">
              <span className="text-base">🤝✨</span>
              <span>"Walking hand in hand forever!"</span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* C. HERO BITMOJI AVATARS (AUTHENTIC 3D BITMOJI COUPLE) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative flex-1 flex flex-col items-center justify-end z-10 w-full overflow-hidden">
          
          <div className="relative flex flex-col items-center justify-end w-full h-[84%] sm:h-[88%]">
            
            {/* The Authentic Snapchat Bitmoji Couple (Clean transparent PNG, NO baked text) */}
            <div className={`relative flex items-center justify-center w-full h-full transition-transform duration-500 ${
              activeAnimation === 'kiss' ? 'scale-105 -translate-y-1' :
              activeAnimation === 'hug' ? 'scale-105' :
              activeAnimation === 'dance' ? 'animate-bounce' : ''
            }`}>
              <img
                src="/assets/avatars/snap_couple_hd.png"
                alt="Snapchat 3D Bitmoji Couple"
                className="w-full h-[90%] object-contain filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.45)] pointer-events-none select-none transition-transform"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                }}
              />

              {/* Floating Emote Particles */}
              {activeAnimation === 'kiss' && (
                <div className="absolute top-1/4 inset-x-0 flex items-center justify-center gap-6 pointer-events-none z-30 animate-pulse">
                  <span className="text-2xl animate-ping">💋</span>
                  <span className="text-3xl">💕</span>
                  <span className="text-2xl animate-ping">💋</span>
                </div>
              )}

              {activeAnimation === 'hug' && (
                <div className="absolute top-1/3 inset-x-0 flex items-center justify-center gap-4 pointer-events-none z-30 animate-pulse">
                  <span className="text-3xl animate-bounce">🫂</span>
                  <span className="text-3xl animate-pulse">💖</span>
                </div>
              )}

              {activeAnimation === 'dance' && (
                <div className="absolute top-1/4 inset-x-0 flex items-center justify-center gap-8 pointer-events-none z-30 animate-pulse">
                  <span className="text-2xl animate-bounce">🎵</span>
                  <span className="text-2xl animate-bounce delay-150">🎶</span>
                  <span className="text-2xl animate-bounce delay-300">💃</span>
                </div>
              )}

              {(activeAnimation === 'toast' || activeAnimation === 'clink' || activeAnimation === 'couch') && (
                <div className="absolute bottom-40 inset-x-0 flex items-center justify-center gap-4 pointer-events-none z-30 opacity-70">
                  <span className="text-xs animate-pulse">♨️</span>
                  <span className="text-xs animate-pulse delay-200">♨️</span>
                </div>
              )}
            </div>

            {/* Soft oval ground shadow underneath their feet */}
            <div className="w-56 sm:w-64 h-3.5 mx-auto bg-black/35 blur-sm rounded-full -mt-2 mb-1" />

            {/* Interactive Tap Zones over Left Partner, Right Partner, and Center Coffee Cups */}
            <div 
              onClick={() => {
                playSfx('pop');
                setActiveBubble('partner');
                clearTimeout(bubbleTimerRef.current);
                bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3200);
                confetti({ particleCount: 25, spread: 50, origin: { y: 0.5, x: 0.4 }, colors: ['#EC4899', '#FDA4AF'] });
              }}
              className="absolute left-0 bottom-12 w-[46%] h-[78%] cursor-pointer group z-20"
              title={`Tap ${cleanPartner} to react! ☕`}
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-pink-300 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none shadow-md">
                Tap {cleanPartner} 💕
              </div>
            </div>

            <div 
              onClick={() => {
                playSfx('chime');
                setActiveBubble('me');
                clearTimeout(bubbleTimerRef.current);
                bubbleTimerRef.current = setTimeout(() => setActiveBubble(null), 3200);
                confetti({ particleCount: 25, spread: 50, origin: { y: 0.5, x: 0.6 }, colors: ['#38BDF8', '#60A5FA', '#FBBF24'] });
              }}
              className="absolute right-0 bottom-12 w-[46%] h-[78%] cursor-pointer group z-20"
              title={`Tap ${cleanMe} to react! 🎧`}
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none shadow-md">
                Tap {cleanMe} ✨
              </div>
            </div>

            <div 
              onClick={() => handleTriggerAction('toast')}
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
        {/* D. SNAPCHAT FRIENDSHIP CAPSULE PILL (100% Dynamic, Zero Hardcoding) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 flex flex-col items-center w-full mt-1">
          <div className={`flex items-center gap-2 ${themeConfig.pillBg} backdrop-blur-md px-4 py-1.5 rounded-full border shadow-lg`}>
            <span className="text-xs font-black tracking-wide">
              {displayPartnerHandle}
            </span>
            <span className="text-xs opacity-60">•</span>
            <span className="text-xs font-black tracking-wide">
              {displayMyHandle}
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
          type="button"
          onClick={() => handleTriggerAction('toast')}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Coffee size={14} className="fill-stone-950" />
          <span>Toast Coffee ☕</span>
        </button>

        {/* Kiss Button */}
        <button
          type="button"
          onClick={() => handleTriggerAction('kiss')}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Heart size={14} className="fill-white" />
          <span>Kiss 💋</span>
        </button>

        {/* Warm Hug Button */}
        <button
          type="button"
          onClick={() => handleTriggerAction('hug')}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span className="text-sm">🫂</span>
          <span>Warm Hug</span>
        </button>

        {/* Slow Dance Button */}
        <button
          type="button"
          onClick={() => handleTriggerAction('dance')}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Music size={14} />
          <span>Slow Dance 💃</span>
        </button>

        {/* Wardrobe Button */}
        <button
          type="button"
          onClick={onOpenWardrobe}
          className="px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 text-amber-300 border border-amber-400/30 font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 backdrop-blur-md"
          title="Change Clothes & Outfits"
        >
          <Shirt size={14} className="text-amber-400" />
          <span>Wardrobe 👕</span>
        </button>

        {/* 3D WebGL Canvas Mode Switcher */}
        {onOpen3DCanvas && (
          <button
            type="button"
            onClick={onOpen3DCanvas}
            className="px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 backdrop-blur-md"
            title="Switch to 360° 3D WebGL Mode"
          >
            <RotateCw size={14} className="text-sky-400" />
            <span>3D Spin 🔄</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SNAPCHAT FRIENDSHIP CHARMS (Authentic Snapchat Feature) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full mt-6 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Friendship Charms
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Snapchat-Style Badges 💛
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Charm 1: Best Friends Forever */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#111520] border border-amber-400/20 shadow-md flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-xl shadow-inner">
              💛
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-amber-300">#1 Best Friends</span>
              <span className="text-[10px] text-slate-400">Mutual Love Link</span>
            </div>
          </div>

          {/* Charm 2: Snapstreak */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#111520] border border-orange-500/20 shadow-md flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-xl shadow-inner animate-pulse">
              🔥
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-orange-400">100+ Streak</span>
              <span className="text-[10px] text-slate-400">Daily connection</span>
            </div>
          </div>

          {/* Charm 3: Astrological Compatibility */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#111520] border border-purple-500/20 shadow-md flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xl shadow-inner">
              ✨
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-purple-300">Soulmates</span>
              <span className="text-[10px] text-slate-400">Stars aligned</span>
            </div>
          </div>

          {/* Charm 4: Coffee Date */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#111520] border border-amber-500/20 shadow-md flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600/15 border border-amber-600/30 flex items-center justify-center text-xl shadow-inner">
              ☕
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-amber-200">Coffee Lovers</span>
              <span className="text-[10px] text-slate-400">Endless chats</span>
            </div>
          </div>

          {/* Charm 5: In Tune */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#111520] border border-pink-500/20 shadow-md flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-xl shadow-inner">
              🎵
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-pink-300">Shared Rhythm</span>
              <span className="text-[10px] text-slate-400">Jukebox in sync</span>
            </div>
          </div>

          {/* Charm 6: Sweet Hearts */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1a1f2e] to-[#111520] border border-rose-500/20 shadow-md flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-xl shadow-inner">
              💖
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-rose-300">Heart Locked</span>
              <span className="text-[10px] text-slate-400">Forever together</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

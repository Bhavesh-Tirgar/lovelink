import React, { useState } from 'react';
import { Heart, Sparkles, Shirt, Moon, Sun } from 'lucide-react';
import confetti from 'canvas-confetti';
import RomanticCoupleScene from './RomanticCoupleScene';
import { WARDROBE_OUTFITS } from '../utils/libmoji';

export default function FriendmojiCouple({
  action = 'couch',
  myAvatar,
  partnerAvatar,
  myName = 'You',
  partnerName = 'Partner',
  isNightMode = true,
  onAvatarClick,
  onActionClick,
  onWardrobeClick,
  onToggleNightMode,
}) {
  const [renderMode, setRenderMode] = useState('studio'); // 'studio' (High-Fidelity SVG Art) | 'classic' (Original Snap sticker)
  const [heartAnim, setHeartAnim] = useState(false);

  const myOutfitId = myAvatar?.outfit || 'varsity_jacket';
  const currentOutfit = WARDROBE_OUTFITS.find(o => o.id === myOutfitId) || WARDROBE_OUTFITS[0];

  const cleanPartnerName = (partnerName || 'Partner').trim();
  const cleanMyName = (myName || 'You').trim();

  const handleTapReaction = (e) => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 800);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#F43F5E', '#EC4899', '#FB7185', '#FBBF24']
    });

    if (onAvatarClick) {
      onAvatarClick(e);
    }
  };

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      
      {/* ── Top Ambient Bar: Day/Night Toggle & Render Mode ── */}
      <div className="w-full flex items-center justify-between px-2 mb-2 z-20">
        {/* Style Mode Switcher */}
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setRenderMode('studio')}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              renderMode === 'studio'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Studio Art ✨
          </button>
          <button
            type="button"
            onClick={() => setRenderMode('classic')}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              renderMode === 'classic'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Classic Snap 📸
          </button>
        </div>

        {/* Ambient Lighting Toggle */}
        <button
          type="button"
          onClick={onToggleNightMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white transition-all shadow-sm"
          title={isNightMode ? 'Switch to Warm Golden Hour' : 'Switch to Romantic Starlight'}
        >
          {isNightMode ? (
            <>
              <Moon size={12} className="text-indigo-400" />
              <span>Starlight</span>
            </>
          ) : (
            <>
              <Sun size={12} className="text-amber-400" />
              <span>Daylight</span>
            </>
          )}
        </button>
      </div>

      {/* ── Main Couple Canvas ── */}
      <div 
        onClick={handleTapReaction}
        className="relative w-full flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
      >
        {/* Floating Heart Burst on Tap */}
        {heartAnim && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none z-30 animate-bounce">
            <span className="text-2xl animate-ping">💖</span>
            <span className="text-4xl drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">❤️</span>
            <span className="text-2xl animate-ping">💕</span>
          </div>
        )}

        {/* 1. STUDIO ART (Primary High-Fidelity Romantic System) */}
        {renderMode === 'studio' ? (
          <RomanticCoupleScene
            action={action}
            myAvatar={myAvatar}
            partnerAvatar={partnerAvatar}
            myName={cleanMyName}
            partnerName={cleanPartnerName}
            isNightMode={isNightMode}
            onInteract={() => {}}
          />
        ) : (
          /* 2. CLASSIC SNAPSHOT MODE */
          <div className="relative flex flex-col items-center py-4">
            <img
              src="/assets/avatars/snap_couple_hd.png"
              alt="Snap Couple"
              className="h-64 sm:h-80 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            />
            <div className="w-56 h-3 bg-black/40 blur-md rounded-full -mt-2" />
          </div>
        )}
      </div>

      {/* ── Dynamic Action & Outfit Badges ── */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2 z-20">
        
        {/* Couple Names / Handles Pill */}
        <div 
          onClick={onActionClick}
          className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-xl cursor-pointer hover:bg-black/90 transition-all group active:scale-95"
          title="Couple Handles"
        >
          <span className="text-xs font-black text-rose-300 group-hover:text-rose-200">
            @{cleanPartnerName}
          </span>
          <Heart size={12} className="text-rose-500 fill-rose-500 animate-pulse" />
          <span className="text-xs font-black text-rose-300 group-hover:text-rose-200">
            @{cleanMyName}
          </span>
          <Sparkles size={11} className="text-yellow-400 ml-0.5 group-hover:rotate-45 transition-transform" />
        </div>

        {/* Wardrobe & Outfit Style Pill */}
        <button 
          type="button"
          onClick={onWardrobeClick}
          className="flex items-center gap-1.5 bg-gradient-to-r from-rose-950/80 to-purple-950/80 hover:from-rose-900 hover:to-purple-900 border border-rose-500/30 px-3.5 py-1.5 rounded-full shadow-lg text-xs font-bold text-rose-200 hover:text-white transition-all active:scale-95"
          title="Change Avatar Clothes & Outfits"
        >
          <Shirt size={13} className="text-rose-400" />
          <span>{currentOutfit.emoji} {currentOutfit.name}</span>
          <span className="text-[9px] bg-rose-500/25 text-rose-300 px-1.5 py-0.5 rounded-full font-bold ml-0.5">
            Wardrobe
          </span>
        </button>

      </div>

    </div>
  );
}

import React from 'react';
import { Heart, Sparkles, Shirt } from 'lucide-react';
import { WARDROBE_OUTFITS } from '../utils/libmoji';

export default function FriendmojiCouple({
  action = 'couch',
  myAvatar,
  partnerAvatar,
  myName = 'You',
  partnerName = 'Partner',
  isNightMode = false,
  onAvatarClick,
  onActionClick,
  onWardrobeClick,
}) {
  const myAvatarSrc = myAvatar?.avatar_url || '/assets/avatars/snap_me_hd.png';
  const partnerAvatarSrc = partnerAvatar?.avatar_url || '/assets/avatars/snap_partner_hd.png';

  const myOutfitId = myAvatar?.outfit || 'varsity_jacket';
  const currentOutfit = WARDROBE_OUTFITS.find(o => o.id === myOutfitId) || WARDROBE_OUTFITS[0];

  const cleanPartnerName = (partnerName || 'partner').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'partner';
  const cleanMyName = (myName || 'you').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'you';

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      
      {/* ── Soft Romantic Ambient Backlight ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-rose-500/15 blur-3xl pointer-events-none -z-10" />

      {/* ------------------------------------------------------------- */}
      {/* 1. INTERACTION SCENE: ROMANTIC HIGH-FIDELITY COMPOSITIONS */}
      {/* ------------------------------------------------------------- */}
      
      {/* A. WARM HUG — Intimate Loving Embrace */}
      {action === 'hug' && (
        <div className="relative flex flex-col items-center">
          {/* Floating Heart Shower */}
          <div className="absolute -top-10 flex items-center gap-3 animate-bounce pointer-events-none z-30">
            <span className="text-xl animate-pulse">💖</span>
            <span className="text-3xl drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">❤️</span>
            <span className="text-xl animate-pulse">💕</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-16 sm:-space-x-20 cursor-pointer hover:scale-105 transition-all duration-300 group"
          >
            {/* Romantic Aura */}
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

            {/* Left Avatar (Partner) embracing close */}
            <div className="flex flex-col items-center z-10 transform rotate-8 translate-x-3 transition-transform duration-300 group-hover:rotate-10">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
            
            {/* Heart between embrace */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-25 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-rose-500/30 backdrop-blur-sm border border-rose-400/40 flex items-center justify-center text-lg animate-ping">
                💖
              </div>
            </div>

            {/* Right Avatar (User) wrapping arms around */}
            <div className="flex flex-col items-center z-20 transform -rotate-8 -translate-x-3 transition-transform duration-300 group-hover:-rotate-10">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* B. SWEET KISS — Tender Forehead & Lip Kiss */}
      {action === 'kiss' && (
        <div className="relative flex flex-col items-center">
          {/* Kiss Marks & Sparkles */}
          <div className="absolute -top-10 flex items-center gap-2 pointer-events-none z-30">
            <span className="text-2xl animate-pulse">💋</span>
            <span className="text-xs font-bold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-400/30">Sweet Kiss ✨</span>
            <span className="text-2xl animate-pulse">💋</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-14 sm:-space-x-18 cursor-pointer hover:scale-105 transition-all duration-300 group"
          >
            {/* Ambient Pink Glow */}
            <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

            <div className="flex flex-col items-center z-10 transform rotate-10 translate-x-2 transition-transform duration-300 group-hover:rotate-12">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
            
            <div className="flex flex-col items-center z-20 transform -rotate-10 -translate-x-2 transition-transform duration-300 group-hover:-rotate-12">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* C. HOLD HANDS — Gentle Romantic Walk */}
      {action === 'hand_hold' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-7 flex items-center gap-2 text-rose-400 animate-pulse pointer-events-none z-30">
            <Heart size={18} className="fill-rose-500 text-rose-500 drop-shadow" />
            <span className="text-xs font-bold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-400/30">Holding Hands 🤝</span>
            <Heart size={18} className="fill-rose-500 text-rose-500 drop-shadow" />
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-6 sm:-space-x-8 cursor-pointer hover:scale-105 transition-all duration-300"
          >
            <div className="flex flex-col items-center z-10 transform rotate-2">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
            
            {/* Glowing Hand Connection Thread */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-25 pointer-events-none flex items-center">
              <span className="text-xs text-rose-400 animate-pulse">💖</span>
            </div>

            <div className="flex flex-col items-center z-20 transform -rotate-2">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* D. BED SPOON & CUDDLE */}
      {action === 'spoon' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-7 flex items-center gap-2 text-indigo-300 pointer-events-none z-30">
            <span className="text-sm">🌙</span>
            <span className="text-xs font-bold bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">Cozy Bed Cuddle 🛌</span>
            <span className="text-xs animate-bounce">💤</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-20 sm:-space-x-24 cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {/* Bedside Moonlight Glow */}
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center z-10 transform -rotate-10">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="flex flex-col items-center z-20 transform -rotate-6">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* E. COFFEE TOAST */}
      {action === 'toast' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-8 flex items-center gap-2 text-amber-400 animate-bounce pointer-events-none z-30">
            <span className="text-base">☕</span>
            <span className="text-xs font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 text-amber-300">Coffee Toast! ✨</span>
            <span className="text-base">☕</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-8 sm:-space-x-12 cursor-pointer hover:scale-105 transition-all duration-300"
          >
            <div className="flex flex-col items-center z-10 transform rotate-3">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="flex flex-col items-center z-20 transform -rotate-3">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* F. COUCH LOUNGE (Default Hero Presentation) */}
      {(action === 'couch' || !action) && (
        <div className="relative flex flex-col items-center">
          <div 
            onClick={onAvatarClick}
            className="relative flex flex-col items-center cursor-pointer hover:scale-105 transition-transform group"
          >
            {/* Full HD Snapchat Couple Image */}
            <img
              src="/assets/avatars/snap_couple_hd.png"
              alt="Couple on Couch"
              className="h-64 sm:h-80 md:h-88 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      )}

      {/* Ground Contact Shadow */}
      <div className="w-56 sm:w-72 h-3.5 bg-black/35 blur-md rounded-full mx-auto -mt-2 mb-3" />

      {/* ── Dynamic Action & Outfit Badges ── */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1 z-20">
        
        {/* Dynamic Handle Pill (No hardcoded names!) */}
        <div 
          onClick={onActionClick}
          className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl cursor-pointer hover:bg-black/90 transition-all group active:scale-95"
          title="Couple Handles"
        >
          <span className="text-[11px] font-black text-amber-300 group-hover:text-amber-200">
            @{cleanPartnerName}
          </span>
          <span className="text-xs text-rose-400">❤️</span>
          <span className="text-[11px] font-black text-amber-300 group-hover:text-amber-200">
            @{cleanMyName}
          </span>
          <Sparkles size={11} className="text-yellow-400 ml-0.5 group-hover:rotate-45 transition-transform" />
        </div>

        {/* Wardrobe & Outfit Style Pill */}
        <button 
          type="button"
          onClick={onWardrobeClick}
          className="flex items-center gap-1.5 bg-gradient-to-r from-rose-950/80 to-purple-950/80 hover:from-rose-900 hover:to-purple-900 border border-rose-500/30 px-3 py-1.5 rounded-full shadow-lg text-[11px] font-bold text-rose-200 hover:text-white transition-all active:scale-95"
          title="Change Avatar Clothes & Outfits"
        >
          <Shirt size={12} className="text-rose-400" />
          <span>{currentOutfit.emoji} {currentOutfit.name}</span>
          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full font-semibold ml-0.5">Wardrobe</span>
        </button>

      </div>

    </div>
  );
}

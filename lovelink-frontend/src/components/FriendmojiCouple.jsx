import React from 'react';
import { Heart, Sparkles } from 'lucide-react';

export default function FriendmojiCouple({
  action = 'couch',
  myAvatar,
  partnerAvatar,
  myName = 'Me',
  partnerName = 'Neha',
  isNightMode = false,
  onAvatarClick,
  onActionClick,
}) {
  const myAvatarSrc = myAvatar?.avatar_url || '/assets/avatars/snap_me_hd.png';
  const partnerAvatarSrc = partnerAvatar?.avatar_url || '/assets/avatars/snap_partner_hd.png';

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. INTERACTION SCENE WITH AUTHENTIC HD SNAPCHAT BITMOJIS */}
      {/* ------------------------------------------------------------- */}
      
      {/* A. WARM HUG */}
      {action === 'hug' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-7 flex items-center gap-3 text-rose-500 animate-bounce pointer-events-none z-30">
            <span className="text-xl">💖</span>
            <span className="text-2xl drop-shadow-md">❤️</span>
            <span className="text-xl">💕</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-12 sm:-space-x-16 cursor-pointer hover:scale-105 transition-transform"
          >
            {/* Left Avatar (Neha) leaning in */}
            <div className="flex flex-col items-center z-10 transform rotate-6">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            {/* Right Avatar (User) leaning in */}
            <div className="flex flex-col items-center z-20 transform -rotate-6">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* B. SWEET KISS */}
      {action === 'kiss' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-8 text-pink-500 animate-ping pointer-events-none z-30">
            <span className="text-2xl">💋</span>
          </div>
          <div className="absolute -top-4 flex items-center gap-3 text-pink-400 pointer-events-none z-30">
            <span className="text-base">✨</span>
            <span className="text-base">✨</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-10 sm:-space-x-14 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="flex flex-col items-center z-10 transform rotate-8">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            <div className="flex flex-col items-center z-20 transform -rotate-8">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* C. HOLD HANDS */}
      {action === 'hand_hold' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-5 text-rose-500 animate-pulse pointer-events-none z-30">
            <Heart size={20} className="fill-rose-500 text-rose-500 drop-shadow" />
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-4 sm:-space-x-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="flex flex-col items-center z-10">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            <div className="flex flex-col items-center z-20">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* D. SLOW DANCE */}
      {action === 'dance' && (
        <div className="relative flex flex-col items-center animate-pulse">
          <div className="absolute -top-7 flex items-center gap-3 text-purple-400 pointer-events-none z-30">
            <span className="text-sm">🎵</span>
            <span className="text-xl">🎶</span>
            <span className="text-sm">✨</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-8 sm:-space-x-12 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="flex flex-col items-center z-10 transform -rotate-4">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            <div className="flex flex-col items-center z-20 transform rotate-4">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* E. SPOON & CUDDLE */}
      {action === 'spoon' && (
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-6 flex items-center gap-2 text-indigo-400 pointer-events-none z-30">
            <span className="text-xs">💤</span>
            <span className="text-sm font-bold">Cuddling...</span>
            <span className="text-xs">💖</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="relative flex items-end justify-center -space-x-14 sm:-space-x-18 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="flex flex-col items-center z-10 transform -rotate-6">
              <img
                src={partnerAvatarSrc}
                alt={partnerName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            <div className="flex flex-col items-center z-20 transform -rotate-3">
              <img
                src={myAvatarSrc}
                alt={myName}
                className="h-56 sm:h-72 md:h-80 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* F. COFFEE TOAST OR COUCH LOUNGE (Default Hero Presentation) */}
      {(action === 'toast' || action === 'couch' || !action) && (
        <div className="relative flex flex-col items-center">
          {action === 'toast' && (
            <div className="absolute -top-7 flex items-center gap-2 text-amber-500 animate-bounce pointer-events-none z-30">
              <span className="text-base">☕</span>
              <span className="text-xs font-bold bg-amber-400/25 px-2.5 py-0.5 rounded-full text-amber-300">Coffee Toast! ✨</span>
              <span className="text-base">☕</span>
            </div>
          )}

          <div 
            onClick={onAvatarClick}
            className="relative flex flex-col items-center cursor-pointer hover:scale-105 transition-transform group"
            title="Click to open 3D Studio"
          >
            {/* Full HD Snapchat Couple Image (Both partners clearly visible) */}
            <img
              src="/assets/avatars/snap_couple_hd.png"
              alt="Snapchat Couple"
              className="h-60 sm:h-76 md:h-84 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105"
            />
            {/* 3D Soft Ground Shadow */}
            <div className="w-48 sm:w-64 h-3.5 mx-auto bg-black/25 blur-sm rounded-full -mt-2 mb-1" />
          </div>
        </div>
      )}

      {/* Ground Contact Shadow */}
      <div className="w-52 sm:w-64 h-3 bg-black/20 blur-sm rounded-full mx-auto -mt-2 mb-2" />

      {/* Authentic Snapchat Handle Pill */}
      <div 
        onClick={onActionClick}
        className="flex items-center gap-2.5 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-xl cursor-pointer hover:bg-black/85 transition-all group active:scale-95"
      >
        <span className="text-xs font-black text-amber-300 group-hover:text-amber-200">
          @ neha_xmusic
        </span>
        <span className="text-xs text-rose-400">❤️</span>
        <span className="text-xs font-black text-amber-300 group-hover:text-amber-200">
          @ {myName.toLowerCase().replace(/\s+/g, '_')}
        </span>
        <Sparkles size={12} className="text-yellow-400 ml-0.5 group-hover:rotate-45 transition-transform" />
      </div>

    </div>
  );
}

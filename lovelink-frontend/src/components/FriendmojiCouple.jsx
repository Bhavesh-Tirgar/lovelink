import React from 'react';
import BitmojiAvatar from './BitmojiAvatar';
import { Heart } from 'lucide-react';

export default function FriendmojiCouple({
  action = 'couch',
  myAvatar,
  partnerAvatar,
  myName = 'Me',
  partnerName = 'Partner',
  isNightMode = false,
  onAvatarClick,
  onActionClick,
}) {
  return (
    <div className="relative flex flex-col items-center select-none">
      
      {/* ======================================================== */}
      {/* 1. WARM HUG (Authentic Snapchat Bitmoji Embrace) */}
      {/* ======================================================== */}
      {action === 'hug' && (
        <div className="relative flex items-center justify-center -space-x-8 mb-2">
          {/* Floating Bitmoji Hearts */}
          <div className="absolute -top-7 flex items-center gap-4 text-rose-500 animate-bounce pointer-events-none z-30">
            <span className="text-xl">💖</span>
            <span className="text-2xl drop-shadow-md">❤️</span>
            <span className="text-xl">💕</span>
          </div>

          {/* Left Avatar wrapping arms in embrace */}
          <div 
            onClick={onAvatarClick}
            className="transform rotate-8 hover:scale-105 transition-transform cursor-pointer relative z-20 flex flex-col items-center"
            title="Click to customize your Bitmoji"
          >
            <BitmojiAvatar {...myAvatar} expression="blush" size={120} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {myName}
            </span>
          </div>

          {/* Right Avatar leaning in tenderly with arms wrapped around waist */}
          <div className="transform -rotate-8 hover:scale-105 transition-transform relative z-10 flex flex-col items-center">
            <BitmojiAvatar {...partnerAvatar} expression="blush" size={120} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {partnerName}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SWEET KISS (Snapchat Friendmoji Romantic Kiss) */}
      {/* ======================================================== */}
      {action === 'kiss' && (
        <div className="relative flex items-center justify-center -space-x-7 mb-2">
          {/* Kiss Sparkle Burst */}
          <div className="absolute -top-8 text-pink-500 animate-ping pointer-events-none z-30">
            <span className="text-2xl">💋</span>
          </div>
          <div className="absolute -top-4 flex items-center gap-3 text-pink-400 pointer-events-none z-30">
            <span className="text-base">✨</span>
            <span className="text-base">✨</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="transform rotate-6 hover:scale-105 transition-transform cursor-pointer z-20 flex flex-col items-center"
            title="Click to customize your Bitmoji"
          >
            <BitmojiAvatar {...myAvatar} expression="blush" size={120} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {myName}
            </span>
          </div>

          <div className="transform -rotate-6 hover:scale-105 transition-transform z-10 flex flex-col items-center">
            <BitmojiAvatar {...partnerAvatar} expression="blush" size={120} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {partnerName}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. HOLD HANDS (Intertwined fingers & gentle gaze) */}
      {/* ======================================================== */}
      {action === 'hand_hold' && (
        <div className="relative flex items-center justify-center -space-x-2 mb-2">
          {/* Pulsing Love Heart between hands */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 text-rose-500 animate-pulse pointer-events-none z-30">
            <Heart size={16} className="fill-rose-500 text-rose-500 drop-shadow" />
          </div>

          <div 
            onClick={onAvatarClick}
            className="hover:scale-105 transition-transform cursor-pointer z-20 flex flex-col items-center"
            title="Click to customize your Bitmoji"
          >
            <BitmojiAvatar {...myAvatar} size={115} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {myName}
            </span>
          </div>

          <div className="hover:scale-105 transition-transform z-10 flex flex-col items-center">
            <BitmojiAvatar {...partnerAvatar} size={115} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {partnerName}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SLOW DANCE (Ballroom / Prom slow dance sway) */}
      {/* ======================================================== */}
      {action === 'dance' && (
        <div className="relative flex items-center justify-center -space-x-3 mb-2 animate-pulse">
          <div className="absolute -top-7 flex items-center gap-3 text-purple-400 pointer-events-none z-30">
            <span className="text-sm">🎵</span>
            <span className="text-xl">🎶</span>
            <span className="text-sm">✨</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="transform -rotate-4 hover:scale-105 transition-transform cursor-pointer z-20 flex flex-col items-center"
            title="Click to customize your Bitmoji"
          >
            <BitmojiAvatar {...myAvatar} expression="smile" size={118} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {myName}
            </span>
          </div>

          <div className="transform rotate-4 hover:scale-105 transition-transform z-10 flex flex-col items-center">
            <BitmojiAvatar {...partnerAvatar} expression="smile" size={118} />
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
              {partnerName}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TUCK IN & CUDDLE / SPOON (Bed scene with plush pillows) */}
      {/* ======================================================== */}
      {action === 'spoon' && (
        <div className="relative flex flex-col items-center mb-2">
          {/* Floating ZZZ and heart */}
          <div className="absolute -top-6 flex items-center gap-2 text-indigo-400 pointer-events-none z-30">
            <span className="text-xs">💤</span>
            <span className="text-sm font-bold">Zzz...</span>
            <span className="text-xs">💖</span>
          </div>

          {/* Bed Duvet & Soft Pillows Backdrop */}
          <div className="relative flex items-center -space-x-4 p-2.5 pt-3 pb-1 rounded-3xl bg-indigo-950/50 border border-indigo-500/30 shadow-inner">
            <div 
              onClick={onAvatarClick}
              className="cursor-pointer flex flex-col items-center z-20"
              title="Click to customize your Bitmoji"
            >
              <BitmojiAvatar {...myAvatar} expression="sleep" size={110} />
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/90 text-indigo-200 mt-0.5">
                {myName}
              </span>
            </div>

            <div className="flex flex-col items-center z-10">
              <BitmojiAvatar {...partnerAvatar} expression="sleep" size={110} />
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/90 text-indigo-200 mt-0.5">
                {partnerName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. COFFEE TOAST (Morning coffee clinking mugs) */}
      {action === 'toast' && (
        <div className="relative flex flex-col items-center justify-center mb-2">
          <div className="absolute -top-6 flex items-center gap-2 text-amber-500 animate-bounce pointer-events-none z-30">
            <span className="text-base">☕</span>
            <span className="text-xs font-bold bg-amber-400/20 px-2 py-0.5 rounded-full text-amber-300">Coffee Toast! ✨</span>
            <span className="text-base">☕</span>
          </div>

          <div 
            onClick={onAvatarClick}
            className="cursor-pointer hover:scale-105 transition-transform flex flex-col items-center"
            title="Click to customize your Bitmoji"
          >
            {/* If users have the default Snap avatars, render the authentic Snapchat coffee toast sticker! */}
            {(myAvatar?.avatar_url === '/assets/avatars/snap_me.png' && partnerAvatar?.avatar_url === '/assets/avatars/snap_partner.png') ? (
              <img
                src="/assets/avatars/snap_couple.png"
                alt="Snapchat Couple"
                className="h-44 sm:h-52 object-contain drop-shadow-xl"
              />
            ) : (
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center z-20">
                  <BitmojiAvatar {...myAvatar} expression="smile" size={115} />
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
                    {myName}
                  </span>
                </div>
                <div className="flex flex-col items-center z-10">
                  <BitmojiAvatar {...partnerAvatar} expression="smile" size={115} />
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
                    {partnerName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. COUCH LOUNGE (Default Casual Seating with Arm Around) */}
      {/* ======================================================== */}
      {(!action || action === 'couch') && (
        <div className="relative flex items-center justify-center -space-x-1 mb-2">
          <div className="absolute -top-3 text-amber-500 animate-bounce pointer-events-none z-30">
            <Heart size={14} className="fill-amber-500 text-amber-500" />
          </div>

          <div 
            onClick={onAvatarClick}
            className="cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
            title="Click to customize your Bitmoji"
          >
            {(myAvatar?.avatar_url === '/assets/avatars/snap_me.png' && partnerAvatar?.avatar_url === '/assets/avatars/snap_partner.png') ? (
              <div className="flex flex-col items-center">
                <img
                  src="/assets/avatars/snap_couple.png"
                  alt="Snapchat Couple"
                  className="h-44 sm:h-52 object-contain drop-shadow-xl"
                />
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
                    {myName}
                  </span>
                  <span className="text-xs text-rose-500">❤️</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
                    {partnerName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center -space-x-1">
                <div className="flex flex-col items-center z-20">
                  <BitmojiAvatar {...myAvatar} size={115} />
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
                    {myName}
                  </span>
                </div>
                <div className="flex flex-col items-center z-10">
                  <BitmojiAvatar {...partnerAvatar} size={115} />
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-900/95 text-slate-200' : 'bg-white/95 text-stone-800 shadow-sm'}`}>
                    {partnerName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Authentic Oatmeal Boucle Couch */}
      <div 
        onClick={onActionClick}
        className={`w-56 sm:w-72 h-14 sm:h-18 rounded-2xl ${isNightMode ? 'bg-[#232834] border border-slate-700 shadow-2xl' : 'bg-[#d8cfc4] border border-stone-300 shadow-lg'} flex items-center justify-between px-3 cursor-pointer group hover:scale-[1.02] transition-transform`}
      >
        <span className="text-xs">🛋️</span>
        <span className="text-[10px] font-semibold tracking-wide opacity-80 group-hover:text-amber-500 transition-colors">
          Tap to Hug, Kiss or Cuddle 💕
        </span>
        <span className="text-xs">🛋️</span>
      </div>
    </div>
  );
}

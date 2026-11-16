import React, { useState } from 'react';
import Interactive3DAvatar from './Interactive3DAvatar';
import FriendmojiCouple from './FriendmojiCouple';
import { Sparkles, Heart, RotateCw, Coffee } from 'lucide-react';

export default function Studio3DStage({
  coupleAction = 'couch',
  myAvatar,
  partnerAvatar,
  myName = 'Me',
  partnerName = 'Partner',
  isNightMode = false,
  onOpenCreator,
  onOpenInteractions,
}) {
  // Default to showing BOTH partners together in full HD (Snapchat Friendship Profile style)
  const [viewMode, setViewMode] = useState('couple_scene'); // 'couple_scene' or '3d_interactive'
  const [active3DUser, setActive3DUser] = useState('me'); // 'me' or 'partner'

  const activeAvatar = active3DUser === 'me' ? myAvatar : partnerAvatar;
  const activeGlb = activeAvatar?.glb_url;
  const activeAvatarUrl = activeAvatar?.avatar_url || (active3DUser === 'me' ? '/assets/avatars/snap_me_hd.png' : '/assets/avatars/snap_partner_hd.png');
  const activeName = active3DUser === 'me' ? myName : partnerName;

  const actionLabels = {
    hug: { label: 'Warm Hug', emoji: '🤗' },
    kiss: { label: 'Sweet Kiss', emoji: '💋' },
    hand_hold: { label: 'Holding Hands', emoji: '🤝' },
    dance: { label: 'Slow Dancing', emoji: '💃' },
    spoon: { label: 'Tucked In & Cuddling', emoji: '🛌' },
    toast: { label: 'Coffee Date', emoji: '☕' },
    couch: { label: 'Our Story', emoji: '💛' },
  };

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-xl mx-auto">
      
      {/* 1. SNAPCHAT FRIENDSHIP PROFILE TOOLBAR */}
      <div className="flex items-center gap-2 mb-2 z-20 flex-wrap justify-center">
        
        {/* Toggle: Both of Us (Hero Couple) vs 3D Interactive Spin */}
        <div className="flex items-center bg-black/65 backdrop-blur-md p-0.5 rounded-full border border-white/10 shadow-xl">
          <button
            onClick={() => setViewMode('couple_scene')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'couple_scene'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-900 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Coffee size={13} />
            <span>Both of Us 💕</span>
          </button>

          <button
            onClick={() => setViewMode('3d_interactive')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === '3d_interactive'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw size={13} />
            <span>3D Spin 🔄</span>
          </button>
        </div>

        {/* In 3D Spin mode: Switch between Me and Partner */}
        {viewMode === '3d_interactive' ? (
          <div className="flex items-center bg-black/65 backdrop-blur-md p-0.5 rounded-full border border-white/10 shadow-lg">
            <button
              onClick={() => setActive3DUser('me')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                active3DUser === 'me'
                  ? 'bg-white/25 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {myName}
            </button>
            <button
              onClick={() => setActive3DUser('partner')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                active3DUser === 'partner'
                  ? 'bg-white/25 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {partnerName}
            </button>
          </div>
        ) : (
          /* In Couple Mode: Quick action trigger buttons */
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenInteractions}
              className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-pink-300 hover:text-white border border-pink-500/30 text-xs font-bold shadow transition-all flex items-center gap-1"
            >
              <Heart size={12} className="fill-pink-400 text-pink-400" />
              <span>{actionLabels[coupleAction]?.label || 'Hug & Kiss'}</span>
            </button>

            <button
              onClick={onOpenCreator}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow transition-all flex items-center gap-1 active:scale-95"
            >
              <Sparkles size={12} />
              <span>3D Studio</span>
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* VIEW A: HERO COUPLE VIEW (BOTH PARTNERS CLEARLY VISIBLE TOGETHER) */}
      {/* ----------------------------------------------------------- */}
      {viewMode === 'couple_scene' && (
        <div className="relative flex flex-col items-center w-full">
          <FriendmojiCouple
            action={coupleAction}
            myAvatar={myAvatar}
            partnerAvatar={partnerAvatar}
            myName={myName}
            partnerName={partnerName}
            isNightMode={isNightMode}
            onAvatarClick={onOpenCreator}
            onActionClick={onOpenInteractions}
          />
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* VIEW B: 3D INTERACTIVE SPIN MODE (Rotate 360°, Head Tracking, Emotes) */}
      {/* ----------------------------------------------------------- */}
      {viewMode === '3d_interactive' && (
        <div className="relative flex flex-col items-center">
          <Interactive3DAvatar
            glbUrl={activeGlb}
            avatarUrl={activeAvatarUrl}
            name={activeName}
            size={270}
            showEmotes={true}
            onOpenCreator={onOpenCreator}
          />
        </div>
      )}
    </div>
  );
}

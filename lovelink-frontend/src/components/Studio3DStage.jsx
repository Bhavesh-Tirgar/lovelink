import React, { useState } from 'react';
import Interactive3DAvatar from './Interactive3DAvatar';
import FriendmojiCouple from './FriendmojiCouple';
import { Sparkles, Heart } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState('3d_interactive'); // '3d_interactive' or 'couple_scene'
  const [active3DUser, setActive3DUser] = useState('me'); // 'me' or 'partner'

  const activeAvatar = active3DUser === 'me' ? myAvatar : partnerAvatar;
  const activeGlb = activeAvatar?.glb_url;
  const activeAvatarUrl = activeAvatar?.avatar_url || (active3DUser === 'me' ? '/assets/avatars/snap_me.png' : '/assets/avatars/snap_partner.png');
  const activeName = active3DUser === 'me' ? myName : partnerName;

  const actionLabels = {
    hug: { label: 'Warm Hug', emoji: '🤗' },
    kiss: { label: 'Sweet Kiss', emoji: '💋' },
    hand_hold: { label: 'Holding Hands', emoji: '🤝' },
    dance: { label: 'Slow Dancing', emoji: '💃' },
    spoon: { label: 'Tucked In & Cuddling', emoji: '🛌' },
    toast: { label: 'Coffee Toast', emoji: '☕' },
    couch: { label: 'Lounging in Studio', emoji: '🛋️' },
  };

  // If a romantic couple action (hug, kiss, dance, spoon, toast) is triggered, show the couple composition scene!
  const isCoupleActing = coupleAction && coupleAction !== 'couch';

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-md mx-auto">
      
      {/* Top Floating Control Bar */}
      <div className="flex items-center gap-2 mb-2 z-20">
        
        {/* Toggle between 3D Interactive View and Romantic Couple Scene */}
        <div className="flex items-center bg-black/60 backdrop-blur-md p-0.5 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setViewMode('3d_interactive')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
              viewMode === '3d_interactive'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-900 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles size={11} />
            <span>3D Interactive</span>
          </button>

          <button
            onClick={() => {
              setViewMode('couple_scene');
              if (onOpenInteractions && !isCoupleActing) {
                onOpenInteractions();
              }
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
              viewMode === 'couple_scene'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Heart size={11} />
            <span>Couple Action</span>
          </button>
        </div>

        {/* If in 3D mode: Switch between My 3D Avatar and Partner's 3D Avatar */}
        {viewMode === '3d_interactive' && (
          <div className="flex items-center bg-black/60 backdrop-blur-md p-0.5 rounded-full border border-white/10 shadow-lg">
            <button
              onClick={() => setActive3DUser('me')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                active3DUser === 'me'
                  ? 'bg-white/25 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {myName}
            </button>
            <button
              onClick={() => setActive3DUser('partner')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                active3DUser === 'partner'
                  ? 'bg-white/25 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {partnerName}
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* VIEW A: REAL-TIME 3D MOVABLE AVATAR (Spin 360°, Head Tracking, Emotes) */}
      {/* ----------------------------------------------------------- */}
      {viewMode === '3d_interactive' && (
        <div className="relative flex flex-col items-center">
          <Interactive3DAvatar
            glbUrl={activeGlb}
            avatarUrl={activeAvatarUrl}
            name={activeName}
            size={240}
            showEmotes={true}
            onOpenCreator={onOpenCreator}
          />
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* VIEW B: ROMANTIC FRIENDMOJI COUPLE INTERACTION SCENE */}
      {/* ----------------------------------------------------------- */}
      {viewMode === 'couple_scene' && (
        <div className="relative flex flex-col items-center">
          {/* Couple Action Status Pill */}
          <div 
            onClick={onOpenInteractions}
            className="mb-2 px-3.5 py-1 rounded-full cursor-pointer group transition-all transform hover:scale-105 flex items-center gap-1.5 shadow-lg border bg-rose-500/90 text-white border-rose-400"
          >
            <span className="text-xs">{actionLabels[coupleAction]?.emoji || '💕'}</span>
            <span className="text-[10px] font-bold">
              {actionLabels[coupleAction]?.label || 'Lounging Together'}
            </span>
            <span className="text-[9px] opacity-80 underline underline-offset-2 ml-1">Change 💕</span>
          </div>

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
    </div>
  );
}

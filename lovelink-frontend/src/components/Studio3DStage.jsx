import React, { useState } from 'react';
import SnapchatFriendshipProfile from './SnapchatFriendshipProfile';
import Snapchat3DCanvas from './Snapchat3DCanvas';
import { RotateCw, Heart } from 'lucide-react';

export default function Studio3DStage({
  coupleAction = 'couch',
  myAvatar,
  partnerAvatar,
  myName = 'You',
  partnerName = 'Partner',
  isNightMode = false,
  onOpenCreator,
  onOpenInteractions,
}) {
  // Modes: 'snap_profile' (Full Snapchat Friendship Profile 💛) vs '3d_webgl' (360° WebGL Three.js Canvas)
  const [stageMode, setStageMode] = useState('snap_profile');

  const myGlb = myAvatar?.glb_url;
  const partnerGlb = partnerAvatar?.glb_url;

  return (
    <div className="relative flex flex-col items-center w-full max-w-xl mx-auto select-none">
      
      {/* 1. TOP SNAPCHAT VIEW SELECTOR */}
      <div className="flex items-center gap-2 mb-3 z-30 flex-wrap justify-center">
        <div className="flex items-center bg-black/75 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-xl">
          
          {/* Mode A: Snapchat Friendship Profile */}
          <button
            onClick={() => setStageMode('snap_profile')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
              stageMode === 'snap_profile'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 shadow-md scale-[1.02]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>💛</span>
            <span>Snapchat Profile</span>
          </button>

          {/* Mode B: 3D WebGL 360° Spin */}
          <button
            onClick={() => setStageMode('3d_webgl')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
              stageMode === '3d_webgl'
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-md scale-[1.02]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw size={13} />
            <span>3D WebGL Spin 🔄</span>
          </button>
        </div>

        {/* Quick action button to trigger couple interactions */}
        <button
          onClick={onOpenInteractions}
          className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-pink-300 hover:text-white border border-pink-500/30 text-xs font-bold shadow transition-all flex items-center gap-1"
        >
          <Heart size={13} className="fill-pink-400 text-pink-400" />
          <span>Couple Actions 💕</span>
        </button>
      </div>

      {/* 2. ACTIVE VIEW */}
      {stageMode === 'snap_profile' ? (
        <SnapchatFriendshipProfile
          myName={myName}
          partnerName={partnerName}
          onOpenCreator={onOpenCreator}
          onOpen3DCanvas={() => setStageMode('3d_webgl')}
        />
      ) : (
        <div className="relative w-full max-w-lg bg-black/40 backdrop-blur-xl p-3 sm:p-4 rounded-[36px] border border-white/10 shadow-2xl flex flex-col items-center">
          <Snapchat3DCanvas
            myGlb={myGlb}
            partnerGlb={partnerGlb}
            myName={myName}
            partnerName={partnerName}
            onOpenCreator={onOpenCreator}
          />
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Sparkles, RefreshCw } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export default function AvatarCreatorModal({
  isOpen,
  onClose,
  onAvatarSaved,
}) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ready Player Me Subdomain
  // Using demo subdomain with frameApi=v1
  const RPM_URL = 'https://demo.readyplayer.me/avatar?frameApi=v1&clearCache';

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const handleMessage = async (event) => {
      // Security check: only accept messages from readyplayer.me
      if (!event.origin.includes('readyplayer.me')) return;

      let json = null;
      try {
        json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!json || json.source !== 'readyplayerme') return;

      // 1. Frame is ready -> subscribe to export event
      if (json.eventName === 'v1.frame.ready') {
        setLoading(false);
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              target: 'readyplayerme',
              type: 'subscribe',
              eventName: 'v1.avatar.exported',
            }),
            '*'
          );
        }
      }

      // 2. User clicked "Done" in Ready Player Me -> capture .glb URL
      if (json.eventName === 'v1.avatar.exported') {
        const rawGlbUrl = json.data?.url;
        if (!rawGlbUrl) return;

        // Apply Ready Player Me optimization parameters (mesh LOD & texture atlas for 60fps mobile)
        const optimizedGlbUrl = `${rawGlbUrl}?meshLod=1&textureAtlas=1024&quality=medium`;
        
        setSaving(true);
        try {
          const payload = {
            avatar_url: optimizedGlbUrl,
            glb_url: optimizedGlbUrl,
          };
          const res = await api.post('/room/avatar/customize', payload);
          if (onAvatarSaved) {
            onAvatarSaved(res.data.avatar);
          }
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#EC4899', '#A855F7', '#3B82F6', '#F59E0B'],
          });
          toast.success('Your 3D Avatar is live in the Studio Apartment! ✨');
          onClose();
        } catch (err) {
          console.error('Failed to save 3D avatar:', err);
          toast.error('Could not save avatar. Please try again.');
        } finally {
          setSaving(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, onAvatarSaved, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl h-[92vh] max-h-[850px] bg-[#12151f] border border-white/10 rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#181c2a]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>3D Avatar Creator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold uppercase tracking-wider">
                  Selfie to 3D
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Snap a selfie or customize face, hair & streetwear</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 top-[60px] z-10 flex flex-col items-center justify-center bg-[#12151f] gap-3">
            <RefreshCw className="animate-spin text-pink-500" size={32} />
            <p className="text-xs text-slate-300 font-medium">Opening 3D Studio...</p>
            <span className="text-[10px] text-slate-500">Camera permission enabled for selfies</span>
          </div>
        )}

        {/* Saving Overlay */}
        {saving && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
            <Sparkles className="animate-bounce text-amber-400" size={36} />
            <h4 className="text-sm font-bold text-white">Importing Your 3D Avatar...</h4>
            <p className="text-xs text-slate-400">Rendering 3D model into the Studio Apartment</p>
          </div>
        )}

        {/* Ready Player Me Iframe with Camera & Microphone permissions */}
        <div className="flex-1 w-full h-full relative bg-[#12151f]">
          <iframe
            ref={iframeRef}
            src={RPM_URL}
            title="3D Avatar Creator"
            className="w-full h-full border-none"
            allow="camera *; microphone *; clipboard-write; display-capture"
            onLoad={() => setLoading(false)}
          />
        </div>

        {/* Bottom Banner */}
        <div className="px-4 py-2 bg-[#181c2a] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Camera size={13} className="text-pink-400" />
            <span>Selfie generates your likeness automatically</span>
          </span>
          <span className="hidden sm:inline text-slate-500">
            Powered by Ready Player Me
          </span>
        </div>
      </div>
    </div>
  );
}

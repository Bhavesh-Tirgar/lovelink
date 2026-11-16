import React from 'react';
import { X, Heart, Sparkles } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const INTERACTIONS = [
  {
    id: 'hug',
    title: 'Warm Hug',
    desc: 'Embrace in a warm, loving hug with floating hearts',
    emoji: '🤗',
    badge: 'Romantic',
    color: 'from-pink-500/20 to-rose-500/20 border-pink-500/40 text-pink-300',
  },
  {
    id: 'kiss',
    title: 'Sweet Kiss',
    desc: 'Plant a sweet kiss with sparkles and rosy blush',
    emoji: '💋',
    badge: 'Affection',
    color: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300',
  },
  {
    id: 'hand_hold',
    title: 'Hold Hands',
    desc: 'Sit closely side-by-side holding each other’s hands',
    emoji: '🤝',
    badge: 'Sweet',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
  },
  {
    id: 'dance',
    title: 'Slow Dance',
    desc: 'Slow dance together in the center of the apartment',
    emoji: '💃',
    badge: 'Vibes',
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
  },
  {
    id: 'spoon',
    title: 'Tuck In & Cuddle',
    desc: 'Cuddle up under the cozy warm duvet in bed',
    emoji: '🛌',
    badge: 'Cozy',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
  },
  {
    id: 'toast',
    title: 'Coffee Toast',
    desc: 'Clink warm mugs of coffee and tea together',
    emoji: '☕',
    badge: 'Morning',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
  },
  {
    id: 'couch',
    title: 'Lounge on Couch',
    desc: 'Chill comfortably side-by-side on the couch',
    emoji: '🛋️',
    badge: 'Chill',
    color: 'from-slate-500/20 to-stone-500/20 border-slate-500/40 text-slate-300',
  },
];

export default function CoupleInteractionsModal({
  isOpen,
  onClose,
  partnerName,
  onInteractionTriggered,
}) {
  if (!isOpen) return null;

  const handleSelect = async (action) => {
    try {
      const res = await api.post('/room/couple-interaction', { action });
      if (onInteractionTriggered) {
        onInteractionTriggered(action);
      }
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F43F5E', '#EC4899', '#A855F7', '#FBBF24'],
      });
      toast.success(res.data.message || `Interacting with ${partnerName || 'Partner'}! 💕`);
      onClose();
    } catch {
      toast.error('Could not initiate interaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#141722] border border-white/10 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-950/30 via-pink-950/20 to-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Heart size={18} className="fill-rose-500 text-rose-500" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Couple Interactions
              </h3>
              <p className="text-xs text-slate-400">
                Interact with {partnerName || 'your partner'} in the studio apartment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* LIST */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
          {INTERACTIONS.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full p-3.5 rounded-2xl border bg-gradient-to-r ${item.color} hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between text-left shadow-sm group`}
            >
              <div className="flex items-center gap-3.5">
                <span className="text-3xl group-hover:scale-110 transition-transform">
                  {item.emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/90 font-medium">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300/80 mt-0.5">{item.desc}</p>
                </div>
              </div>
              <Sparkles size={16} className="text-white/40 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-white/10 bg-slate-900/60 text-center">
          <span className="text-[11px] text-slate-400">
            Animations and sound effects sync to both partners in real time 💖
          </span>
        </div>
      </div>
    </div>
  );
}

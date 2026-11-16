import React, { useState } from 'react';
import ChibiAvatar, { SKIN_TONES, HAIR_COLORS } from './ChibiAvatar';
import { X, Sparkles, Check, Shirt, Smile, Eye, Palette, Scissors } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const HAIR_STYLES = [
  { id: 'short_clean', name: 'Short Taper' },
  { id: 'messy_waves', name: 'Messy Waves' },
  { id: 'curly', name: 'Curly Afro' },
  { id: 'bob', name: 'Chic Bob' },
  { id: 'long_straight', name: 'Long Straight' },
  { id: 'long_wavy', name: 'Romantic Waves' },
  { id: 'ponytail', name: 'High Ponytail' },
  { id: 'space_buns', name: 'Space Buns' },
];

const OUTFITS = [
  { id: 'teddy_hoodie', name: 'Teddy Bear Hoodie', tag: 'Cozy', emoji: '🧸' },
  { id: 'pink_pajamas', name: 'Striped Pajamas', tag: 'Sleepwear', emoji: '🎀' },
  { id: 'heart_sweatshirt', name: 'Heart Sweatshirt', tag: 'Cute', emoji: '❤️' },
  { id: 'varsity_jacket', name: 'Varsity Jacket', tag: 'Streetwear', emoji: '⚾' },
  { id: 'turtleneck_coat', name: 'Autumn Coat', tag: 'Warm', emoji: '🍂' },
  { id: 'cat_onesie', name: 'Cat Onesie', tag: 'Playful', emoji: '🐾' },
  { id: 'chef_apron', name: 'Chef Apron', tag: 'Kitchen', emoji: '🍳' },
  { id: 'date_outfit', name: 'Date Night Fit', tag: 'Glam', emoji: '✨' },
];

const ACCESSORIES = [
  { id: 'none', name: 'None', emoji: '❌' },
  { id: 'round_glasses', name: 'Gold Round Glasses', emoji: '👓' },
  { id: 'black_frames', name: 'Modern Black Frames', emoji: '🕶️' },
  { id: 'cat_ears', name: 'Cat Ears Headband', emoji: '🐱' },
  { id: 'beanie', name: 'Cozy Red Beanie', emoji: '🧶' },
  { id: 'heart_earrings', name: 'Pink Heart Earrings', emoji: '💖' },
];

const EXPRESSIONS = [
  { id: 'smile', name: 'Sweet Smile', emoji: '😊' },
  { id: 'wink', name: 'Playful Wink', emoji: '😉' },
  { id: 'blush', name: 'Heart Blush', emoji: '🥰' },
  { id: 'sleep', name: 'Cozy Nap', emoji: '😴' },
];

export default function AvatarWardrobeModal({
  isOpen,
  onClose,
  initialAvatar,
  onAvatarSaved,
}) {
  const [activeTab, setActiveTab] = useState('outfit');
  const [avatar, setAvatar] = useState(
    initialAvatar || {
      skin: 'fair',
      hair_style: 'wavy',
      hair_color: 'dark_brown',
      outfit: 'teddy_hoodie',
      accessory: 'none',
      expression: 'smile',
    }
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/room/avatar/customize', avatar);
      if (onAvatarSaved) {
        onAvatarSaved(res.data.avatar);
      }
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#A855F7', '#3B82F6', '#F59E0B'],
      });
      toast.success('Wardrobe updated! Looking adorable 💕');
      onClose();
    } catch {
      toast.error('Could not save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#131620] border border-white/10 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-pink-950/30 via-purple-950/20 to-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Wardrobe & Avatar Studio
              </h3>
              <p className="text-xs text-slate-400">
                Dress up your character for the studio apartment
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

        {/* BODY (Split: Mirror Preview + Category Controls) */}
        <div className="flex-1 overflow-y-auto flex flex-col sm:flex-row">
          {/* LEFT: Dressing Room Mirror Preview */}
          <div className="sm:w-56 p-5 flex flex-col items-center justify-center bg-gradient-to-b from-[#181C28] to-[#10131A] border-b sm:border-b-0 sm:border-r border-white/5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-pink-400/80 mb-3 flex items-center gap-1">
              <span>🪞 Dressing Mirror</span>
            </div>

            {/* Glowing Mirror Frame */}
            <div className="relative p-4 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-pink-400/30 shadow-[0_0_30px_rgba(244,114,182,0.15)] flex flex-col items-center">
              <div className="absolute top-2 right-2 text-xs animate-ping">✨</div>
              <ChibiAvatar
                skin={avatar.skin}
                hair_style={avatar.hair_style}
                hair_color={avatar.hair_color}
                outfit={avatar.outfit}
                accessory={avatar.accessory}
                expression={avatar.expression}
                size={140}
              />
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-3 font-medium">
              Live in your cozy apartment
            </p>
          </div>

          {/* RIGHT: Customization Tabs & Options */}
          <div className="flex-1 flex flex-col">
            {/* TABS */}
            <div className="flex border-b border-white/10 px-3 bg-slate-900/60 overflow-x-auto no-scrollbar">
              {[
                { id: 'outfit', label: 'Outfits', icon: Shirt },
                { id: 'hair', label: 'Hair', icon: Scissors },
                { id: 'skin', label: 'Skin', icon: Palette },
                { id: 'accessory', label: 'Accessories', icon: Eye },
                { id: 'expression', label: 'Mood', icon: Smile },
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                      active
                        ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 max-h-[360px]">
              {/* OUTFITS TAB */}
              {activeTab === 'outfit' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {OUTFITS.map(item => {
                    const selected = avatar.outfit === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar(prev => ({ ...prev, outfit: item.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          selected
                            ? 'bg-pink-500/20 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.emoji}</span>
                          <div>
                            <div className="text-xs font-bold text-white">{item.name}</div>
                            <span className="text-[10px] text-pink-400 font-medium">
                              {item.tag}
                            </span>
                          </div>
                        </div>
                        {selected && <Check size={16} className="text-pink-400" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* HAIR TAB */}
              {activeTab === 'hair' && (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 mb-2">Hair Style</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {HAIR_STYLES.map(style => {
                        const selected = avatar.hair_style === style.id;
                        return (
                          <button
                            key={style.id}
                            onClick={() =>
                              setAvatar(prev => ({ ...prev, hair_style: style.id }))
                            }
                            className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                              selected
                                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>{style.name}</span>
                            {selected && <Check size={14} className="text-purple-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-300 mb-2">Hair Color</h5>
                    <div className="flex flex-wrap gap-2.5">
                      {Object.entries(HAIR_COLORS).map(([colorKey, hex]) => {
                        const selected = avatar.hair_color === colorKey;
                        return (
                          <button
                            key={colorKey}
                            onClick={() =>
                              setAvatar(prev => ({ ...prev, hair_color: colorKey }))
                            }
                            style={{ backgroundColor: hex }}
                            className={`w-9 h-9 rounded-full transition-transform border-2 flex items-center justify-center ${
                              selected
                                ? 'scale-110 border-white shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                                : 'border-black/30 hover:scale-105'
                            }`}
                          >
                            {selected && <Check size={14} className="text-white drop-shadow" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SKIN TAB */}
              {activeTab === 'skin' && (
                <div>
                  <h5 className="text-xs font-bold text-slate-300 mb-3">Skin Tone Palette</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(SKIN_TONES).map(([toneKey, colors]) => {
                      const selected = avatar.skin === toneKey;
                      return (
                        <button
                          key={toneKey}
                          onClick={() => setAvatar(prev => ({ ...prev, skin: toneKey }))}
                          className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                            selected
                              ? 'bg-amber-500/20 border-amber-400'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-full border-2 border-white/20 shadow-inner flex items-center justify-center"
                            style={{ backgroundColor: colors.base }}
                          >
                            {selected && <Check size={16} className="text-stone-800" />}
                          </div>
                          <span className="text-[11px] font-medium text-slate-300 capitalize">
                            {toneKey.replace('_', ' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACCESSORIES TAB */}
              {activeTab === 'accessory' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {ACCESSORIES.map(acc => {
                    const selected = avatar.accessory === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setAvatar(prev => ({ ...prev, accessory: acc.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          selected
                            ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{acc.emoji}</span>
                          <span className="text-xs font-bold text-white">{acc.name}</span>
                        </div>
                        {selected && <Check size={16} className="text-sky-400" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* EXPRESSION TAB */}
              {activeTab === 'expression' && (
                <div className="grid grid-cols-2 gap-2.5">
                  {EXPRESSIONS.map(expr => {
                    const selected = avatar.expression === expr.id;
                    return (
                      <button
                        key={expr.id}
                        onClick={() => setAvatar(prev => ({ ...prev, expression: expr.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          selected
                            ? 'bg-pink-500/20 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{expr.emoji}</span>
                          <span className="text-xs font-bold text-white">{expr.name}</span>
                        </div>
                        {selected && <Check size={16} className="text-pink-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/25 flex items-center gap-1.5 transition-all transform active:scale-95"
              >
                <Sparkles size={14} />
                <span>{saving ? 'Saving Outfit...' : 'Wear in Studio Apartment ✨'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import BitmojiAvatar, { 
  BITMOJI_SKIN_TONES, 
  BITMOJI_HAIR_COLORS, 
  BITMOJI_EYE_COLORS 
} from './BitmojiAvatar';
import { X, Sparkles, Check, Shirt, Smile, Palette, Scissors, Link as LinkIcon } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const HAIR_STYLES = [
  { id: 'short_fade', name: 'Textured Taper Fade', emoji: '✂️' },
  { id: 'wavy_locks', name: 'Voluminous Waves', emoji: '🌊' },
  { id: 'curly_afro', name: 'Curly Afro Coils', emoji: '🌀' },
  { id: 'sleek_bob', name: 'Sleek Glossy Bob', emoji: '💇' },
  { id: 'long_straight', name: 'Long Layered Locks', emoji: '✨' },
  { id: 'high_pony', name: 'High Pony & Scrunchie', emoji: '🎀' },
  { id: 'curtain_bangs', name: 'Curtain Bangs', emoji: '💫' },
];

const OUTFITS = [
  { id: 'streetwear_hoodie', name: 'Oversized Streetwear Hoodie', tag: 'Iconic Snap', emoji: '🧥' },
  { id: 'varsity_jacket', name: 'Two-Tone Varsity Bomber', tag: 'Streetwear', emoji: '⚾' },
  { id: 'autumn_coat', name: 'Turtleneck & Wool Trench', tag: 'Aesthetic', emoji: '🍂' },
  { id: 'heart_sweatshirt', name: 'Embroidered Heart Crewneck', tag: 'Cute', emoji: '❤️' },
  { id: 'silk_pajamas', name: 'Chic Silk Pajama Set', tag: 'Sleepwear', emoji: '🎀' },
  { id: 'date_night', name: 'Date Night Slip & Blazer', tag: 'Glam', emoji: '✨' },
  { id: 'teddy_sherpa', name: 'Teddy Sherpa Fleece', tag: 'Cozy', emoji: '🧸' },
  { id: 'cat_onesie', name: 'Plush Cat Onesie', tag: 'Playful', emoji: '🐾' },
];

const ACCESSORIES = [
  { id: 'none', name: 'None', emoji: '❌' },
  { id: 'gold_glasses', name: 'Gold Round Frames', emoji: '👓' },
  { id: 'black_frames', name: 'Modern Black Frames', emoji: '🕶️' },
  { id: 'cat_ears', name: 'Cat Ears Headband', emoji: '🐱' },
  { id: 'cozy_beanie', name: 'Cozy Red Knit Beanie', emoji: '🧶' },
  { id: 'heart_earrings', name: 'Pink Heart Earrings', emoji: '💖' },
];

const EXPRESSIONS = [
  { id: 'smile', name: 'Sweet Soulful Smile', emoji: '😊' },
  { id: 'wink', name: 'Playful Wink', emoji: '😉' },
  { id: 'blush', name: 'Romantic Cheek Blush', emoji: '🥰' },
  { id: 'sleep', name: 'Peaceful Cozy Nap', emoji: '😴' },
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
      hair_style: 'wavy_locks',
      hair_color: 'dark_brown',
      eye_color: 'deep_brown',
      outfit: 'streetwear_hoodie',
      accessory: 'none',
      expression: 'smile',
      avatar_url: '',
    }
  );
  const [customUrl, setCustomUrl] = useState(initialAvatar?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...avatar,
        avatar_url: customUrl.trim() || null,
      };
      const res = await api.post('/room/avatar/customize', payload);
      if (onAvatarSaved) {
        onAvatarSaved(res.data.avatar);
      }
      confetti({
        particleCount: 55,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981'],
      });
      toast.success('Snapchat 3D Bitmoji look updated! ✨');
      onClose();
    } catch {
      toast.error('Could not save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#141722] border border-white/10 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#1b1f2e]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪞</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>Bitmoji Dressing Room</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-stone-900 font-extrabold uppercase tracking-wider">
                  3D Deluxe
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Design your authentic Snapchat 3D Bitmoji</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Mirror Left + Controls Right */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* LEFT: Dressing Room Mirror Live Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-[#1b1f2e] to-[#10131c] border border-white/10 shadow-inner relative overflow-hidden">
            <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              Live Reflection
            </div>

            <div className="py-2 transform transition-all duration-300">
              <BitmojiAvatar
                {...avatar}
                avatar_url={customUrl.trim() || null}
                size={140}
                animate={saving}
              />
            </div>

            <div className="w-full text-center mt-2 pt-2 border-t border-white/5">
              <span className="text-[11px] font-semibold text-slate-300">
                {customUrl ? 'Custom Snapchat Bitmoji' : OUTFITS.find(o => o.id === avatar.outfit)?.name || 'Custom Look'}
              </span>
              <p className="text-[10px] text-slate-500">Semi-realistic 3D human proportions</p>
            </div>
          </div>

          {/* RIGHT: Customization Categories & Wardrobe Items */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            
            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'outfit', label: 'Outfits', icon: Shirt },
                { id: 'hair', label: 'Hair & Eyes', icon: Scissors },
                { id: 'skin', label: 'Skin Tone', icon: Palette },
                { id: 'accessory', label: 'Accessory', icon: Sparkles },
                { id: 'mood', label: 'Expression', icon: Smile },
                { id: 'snap_link', label: 'Snap URL', icon: LinkIcon },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-amber-500 text-stone-900 shadow-lg scale-105'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OUTFITS */}
            {activeTab === 'outfit' && (
              <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {OUTFITS.map(o => {
                  const isSelected = avatar.outfit === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setAvatar(prev => ({ ...prev, outfit: o.id }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 shadow-md ring-1 ring-amber-400/50'
                          : 'border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl">{o.emoji}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                          {o.tag}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{o.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1 font-semibold">
                            <Check size={11} /> Equipped
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 2: HAIR & EYES */}
            {activeTab === 'hair' && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {/* Hair Style */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Hairstyle
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {HAIR_STYLES.map(h => (
                      <button
                        key={h.id}
                        onClick={() => setAvatar(prev => ({ ...prev, hair_style: h.id }))}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          avatar.hair_style === h.id
                            ? 'border-amber-400 bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/50'
                            : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{h.emoji}</span>
                          <span className="truncate">{h.name}</span>
                        </span>
                        {avatar.hair_style === h.id && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Hair Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(BITMOJI_HAIR_COLORS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setAvatar(prev => ({ ...prev, hair_color: key }))}
                        className={`w-8 h-8 rounded-full border-2 transition-transform flex items-center justify-center ${
                          avatar.hair_color === key ? 'scale-125 border-amber-400 ring-2 ring-amber-400/50' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: val.base }}
                        title={key.replace('_', ' ')}
                      >
                        {avatar.hair_color === key && <Check size={14} className="text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eye Color */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Iris Eye Color (3D Catchlights)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(BITMOJI_EYE_COLORS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setAvatar(prev => ({ ...prev, eye_color: key }))}
                        className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                          avatar.eye_color === key ? 'scale-125 border-amber-400 ring-2 ring-amber-400/50' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: val }}
                        title={key.replace('_', ' ')}
                      >
                        {avatar.eye_color === key && <Check size={12} className="text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SKIN TONE */}
            {activeTab === 'skin' && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  3D Shaded Skin Tones
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.entries(BITMOJI_SKIN_TONES).map(([key, val]) => {
                    const isSelected = avatar.skin === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setAvatar(prev => ({ ...prev, skin: key }))}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/50'
                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full border border-white/20 shadow-inner flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${val.highlight} 0%, ${val.base} 50%, ${val.shadow} 100%)`,
                          }}
                        >
                          {isSelected && <Check size={14} className="text-stone-900" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white capitalize">{key.replace('_', ' ')}</h4>
                          <span className="text-[10px] text-slate-400">3D shading & blush</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: ACCESSORIES */}
            {activeTab === 'accessory' && (
              <div className="grid grid-cols-2 gap-2.5">
                {ACCESSORIES.map(a => {
                  const isSelected = avatar.accessory === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAvatar(prev => ({ ...prev, accessory: a.id }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/50'
                          : 'border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{a.emoji}</span>
                      <div className="flex-1 truncate">
                        <h4 className="text-xs font-bold text-white truncate">{a.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <Check size={11} /> Equipped
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 5: EXPRESSION */}
            {activeTab === 'mood' && (
              <div className="grid grid-cols-2 gap-2.5">
                {EXPRESSIONS.map(e => {
                  const isSelected = avatar.expression === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setAvatar(prev => ({ ...prev, expression: e.id }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/50'
                          : 'border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-2xl">{e.emoji}</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{e.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <Check size={11} /> Active
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 6: CUSTOM SNAPCHAT BITMOJI LINK */}
            {activeTab === 'snap_link' && (
              <div className="space-y-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-amber-400">
                  <LinkIcon size={16} />
                  <h4 className="text-xs font-bold text-white">Have a Snapchat Bitmoji URL?</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  If you saved your official Bitmoji sticker or 3D avatar image from Snapchat, paste the image URL below to use your exact personal avatar in LoveLink!
                </p>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://.../my-bitmoji.png"
                  className="w-full bg-[#10131c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                {customUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomUrl('')}
                    className="text-[10px] text-rose-400 underline font-semibold"
                  >
                    Clear URL and use 3D Bitmoji Generator
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#1b1f2e] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-900 font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>{saving ? 'Saving Look...' : 'Save Bitmoji Look'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

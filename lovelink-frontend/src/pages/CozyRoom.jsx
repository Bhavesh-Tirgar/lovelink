import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Sparkles, RefreshCw, 
  Droplets, Plus, Trash2, Camera, Palette, Check, X
} from 'lucide-react';

export default function CozyRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  
  // Interactive Modals
  const [showFridgeModal, setShowFridgeModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDecorModal, setShowDecorModal] = useState(false);
  const [showCuddleMenu, setShowCuddleMenu] = useState(false);

  // New Sticky Note Input
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('yellow');
  const [postingNote, setPostingNote] = useState(false);

  // New Photo Frame Input
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [framingPhoto, setFramingPhoto] = useState(false);

  // Ambient Audio Player
  const [isPlayingLofi, setIsPlayingLofi] = useState(false);
  const audioRef = useRef(null);

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/room');
      setRoom(res.data);
      setIsPlayingLofi(res.data.music_playing);
    } catch (err) {
      console.error('Failed to load cozy room:', err);
      toast.error('Could not open your room');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Sound effects generator via Web Audio API (zero external mp3 file dependencies!)
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'purr') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext muted/unsupported
    }
  };

  const handleWaterPlant = async () => {
    playSound('water');
    try {
      const res = await api.post('/room/water-plant');
      setRoom(prev => ({
        ...prev,
        plant_level: res.data.plant_level,
        plant_watered_by: prev?.my_name,
        plant_watered_at: new Date().toISOString()
      }));
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 }, colors: ['#4ade80', '#22c55e', '#86efac'] });
      toast.success("You watered your love plant! It's thriving 🌱✨");
    } catch {
      toast.error('Failed to water plant');
    }
  };

  const handlePetAnimal = async () => {
    playSound('purr');
    try {
      const res = await api.post('/room/pet');
      setRoom(prev => ({
        ...prev,
        pet_happiness: res.data.pet_happiness
      }));
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: ['#f43f5e', '#ec4899', '#fbcfe8'] });
      toast.success(`You cuddled ${room?.pet_name}! Purrrr... ❤️`);
    } catch {
      toast.error('Failed to pet');
    }
  };

  const handlePostStickyNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setPostingNote(true);
    try {
      const res = await api.post('/room/sticky-note', {
        text: newNoteText,
        color: newNoteColor
      });
      setRoom(prev => ({
        ...prev,
        sticky_notes: [res.data, ...(prev.sticky_notes || [])]
      }));
      setNewNoteText('');
      playSound('chime');
      toast.success('Sticky note posted to the fridge! 📝');
    } catch {
      toast.error('Could not post note');
    } finally {
      setPostingNote(false);
    }
  };

  const handleDeleteStickyNote = async (noteId) => {
    try {
      await api.delete(`/room/sticky-note/${noteId}`);
      setRoom(prev => ({
        ...prev,
        sticky_notes: (prev.sticky_notes || []).filter(n => n.id !== noteId)
      }));
      toast.success('Note removed');
    } catch {
      toast.error('Failed to remove note');
    }
  };

  const handleSetAvatar = async (action) => {
    playSound('chime');
    try {
      await api.post('/room/avatar', { action });
      setRoom(prev => ({ ...prev, my_action: action }));
      setShowCuddleMenu(false);
      toast.success(`You are now ${action}! 💕`);
    } catch {
      toast.error('Could not change pose');
    }
  };

  const handleHangPhoto = async (e) => {
    e.preventDefault();
    if (!photoUrl.trim()) return;
    setFramingPhoto(true);
    try {
      const res = await api.post('/room/wall-photo', {
        url: photoUrl,
        caption: photoCaption || 'Our Special Moment'
      });
      setRoom(prev => ({
        ...prev,
        wall_photos: [res.data, ...(prev.wall_photos || [])]
      }));
      setPhotoUrl('');
      setPhotoCaption('');
      setShowPhotoModal(false);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
      toast.success('Photo framed on our memory wall! 🖼️');
    } catch {
      toast.error('Could not hang photo');
    } finally {
      setFramingPhoto(false);
    }
  };

  const handleChangeTheme = async (themeName) => {
    try {
      await api.post('/room/theme', { theme: themeName });
      setRoom(prev => ({ ...prev, theme: themeName }));
      toast.success(`Room atmosphere updated to ${themeName}! ✨`);
      setShowDecorModal(false);
    } catch {
      toast.error('Failed to change theme');
    }
  };

  const toggleMusic = async () => {
    playSound('chime');
    try {
      const res = await api.post('/room/music-toggle');
      setIsPlayingLofi(res.data.music_playing);
      setRoom(prev => ({ ...prev, music_playing: res.data.music_playing }));
      toast.success(res.data.music_playing ? 'Lo-Fi record spinning 🎵' : 'Jukebox paused');
    } catch {
      toast.error('Failed to toggle music');
    }
  };

  const getThemeBackground = () => {
    switch (room?.theme) {
      case 'starry-night':
        return 'from-[#0b071a] via-[#140b2b] to-[#080314]';
      case 'sakura-blossom':
        return 'from-[#2b101f] via-[#3d132b] to-[#1c0814]';
      case 'cozy-cabin':
        return 'from-[#1c120c] via-[#2d1b11] to-[#120a06]';
      default:
        return 'from-[#1a0b1c] via-[#240e26] to-[#120514]'; // warm-sunset
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${getThemeBackground()} text-gray-100 pb-28 pt-4 px-3 sm:px-6 transition-colors duration-1000 select-none overflow-x-hidden`}>
      {/* Hidden audio element for ambient music */}
      <audio 
        ref={audioRef}
        loop 
        src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3" 
      />

      {/* Header Bar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold border border-white/10"
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 to-rose-300 flex items-center justify-center gap-1.5">
            <span>🏡</span>
            <span>Our Cozy Room</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-pink-200/60 font-medium">A little digital home built just for two</p>
        </div>

        <button
          onClick={() => setShowDecorModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-semibold transition-all"
        >
          <Palette size={15} />
          <span className="hidden sm:inline">Theme</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="animate-spin text-pink-400" size={32} />
          <p className="text-sm text-gray-400">Opening your cozy home...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          {/* THE ROOM CANVAS (Isometric Visual Stage) */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[520px] rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-gradient-to-br from-amber-950/20 via-black/40 to-purple-950/30">
            {/* Ambient Room Lighting Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-400/10 blur-3xl pointer-events-none rounded-full" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-500/10 blur-3xl pointer-events-none rounded-full" />

            {/* Room Back Walls */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {/* Back Wall Border */}
              <div className="h-1/2 w-full border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent relative">
                {/* Window with Stars & Moon */}
                <div className="absolute top-4 sm:top-8 left-6 sm:left-12 w-20 sm:w-32 h-24 sm:h-36 rounded-t-full border-4 border-amber-900/60 bg-[#090414] overflow-hidden shadow-inner flex flex-col items-center justify-center">
                  <div className="text-lg sm:text-2xl animate-pulse">🌙</div>
                  <div className="text-[10px] text-pink-200/50 mt-1">✨ ✨ ✨</div>
                </div>

                {/* Wall Memory Photos */}
                <div className="absolute top-6 sm:top-10 right-8 sm:right-20 flex gap-2 sm:gap-4 pointer-events-auto">
                  {(room?.wall_photos || []).slice(0, 3).map((photo, i) => (
                    <div 
                      key={photo.id || i}
                      onClick={() => setShowPhotoModal(true)}
                      className="cursor-pointer group transform hover:scale-110 transition-transform bg-white p-1 pb-3 rounded-lg shadow-lg rotate-1 hover:rotate-0"
                    >
                      <img 
                        src={photo.url} 
                        alt="memory" 
                        className="w-10 sm:w-16 h-10 sm:h-16 object-cover rounded" 
                      />
                      <div className="text-[7px] text-gray-800 text-center font-bold truncate max-w-[40px] sm:max-w-[64px] mt-0.5">
                        {photo.caption || 'Us 💕'}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowPhotoModal(true)}
                    className="w-10 sm:w-16 h-14 sm:h-22 border-2 border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-pink-400 transition-colors p-1"
                  >
                    <Camera size={14} />
                    <span className="text-[8px] mt-1 text-center font-bold">+Frame</span>
                  </button>
                </div>
              </div>

              {/* Wooden Floor Perspective */}
              <div className="h-1/2 w-full bg-gradient-to-t from-amber-950/40 via-amber-900/10 to-transparent relative">
                {/* Woven Floor Rug */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 sm:w-72 h-24 sm:h-36 rounded-[100%] bg-gradient-to-r from-pink-900/30 via-rose-900/40 to-pink-900/30 border border-pink-500/20 shadow-lg" />
              </div>
            </div>

            {/* ============================================================== */}
            {/* INTERACTIVE STATIONS ON THE FLOOR */}
            {/* ============================================================== */}

            {/* 1. THE CUDDLE COUCH (Center Rug) */}
            <div 
              onClick={() => setShowCuddleMenu(true)}
              className="absolute bottom-16 sm:bottom-24 left-1/2 -translate-x-1/2 cursor-pointer group flex flex-col items-center"
            >
              {/* Couple Avatars sitting together */}
              <div className="flex items-center -space-x-3 mb-1 group-hover:scale-110 transition-transform">
                <div className="relative flex flex-col items-center">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-base sm:text-xl font-bold text-white">
                    {room?.my_name?.[0] || 'A'}
                  </div>
                  <span className="text-[9px] font-bold text-pink-300 bg-black/60 px-1.5 py-0.2 rounded-full mt-0.5">
                    {room?.my_name}
                  </span>
                </div>

                <div className="text-xl animate-bounce">💖</div>

                <div className="relative flex flex-col items-center">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white shadow-md flex items-center justify-center text-base sm:text-xl font-bold text-white">
                    {room?.partner_name?.[0] || 'B'}
                  </div>
                  <span className="text-[9px] font-bold text-rose-300 bg-black/60 px-1.5 py-0.2 rounded-full mt-0.5">
                    {room?.partner_name}
                  </span>
                </div>
              </div>

              {/* The Sofa Asset */}
              <div className="w-36 sm:w-56 h-14 sm:h-20 rounded-2xl bg-gradient-to-b from-rose-900 to-pink-950 border-2 border-pink-700/50 shadow-2xl flex items-center justify-center text-xs font-bold text-pink-200">
                🛋️ Cuddle Sofa
              </div>
              <span className="text-[9px] text-pink-300/80 bg-black/70 px-2 py-0.5 rounded-full mt-1 border border-pink-500/20 group-hover:border-pink-500">
                Tap to Cuddle 💕
              </span>
            </div>

            {/* 2. THE SMART FRIDGE & STICKY NOTES (Right Corner) */}
            <div 
              onClick={() => setShowFridgeModal(true)}
              className="absolute bottom-16 sm:bottom-24 right-4 sm:right-10 cursor-pointer group flex flex-col items-center"
            >
              <div className="w-16 sm:w-24 h-28 sm:h-40 rounded-2xl bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 border-2 border-white/50 shadow-2xl flex flex-col justify-between p-1.5 sm:p-2 group-hover:scale-105 transition-transform">
                {/* Fridge Sticky Notes Preview */}
                <div className="space-y-1">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-yellow-300 text-gray-900 shadow text-[6px] p-0.5 font-bold transform -rotate-3 overflow-hidden">
                    {room?.sticky_notes?.[0]?.text || 'Love u!'}
                  </div>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-pink-300 text-gray-900 shadow text-[6px] p-0.5 font-bold transform rotate-6 overflow-hidden">
                    {room?.sticky_notes?.[1]?.text || 'Snacks 🍫'}
                  </div>
                </div>
                <div className="text-[8px] sm:text-[10px] text-slate-800 font-black text-center">
                  🧊 Fridge
                </div>
              </div>
              <span className="text-[9px] text-yellow-300 bg-black/70 px-2 py-0.5 rounded-full mt-1 border border-yellow-500/20">
                Notes ({room?.sticky_notes?.length || 0}) 📝
              </span>
            </div>

            {/* 3. LOVE PLANT (Left Window Corner) */}
            <div 
              onClick={handleWaterPlant}
              className="absolute bottom-16 sm:bottom-24 left-4 sm:left-10 cursor-pointer group flex flex-col items-center"
            >
              <div className="w-14 sm:w-20 h-20 sm:h-28 flex flex-col items-center justify-end group-hover:scale-110 transition-transform">
                {/* Plant stages */}
                <span className="text-3xl sm:text-5xl animate-pulse">
                  {room?.plant_level >= 8 ? '🌸' : room?.plant_level >= 5 ? '🪴' : room?.plant_level >= 3 ? '🌿' : '🌱'}
                </span>
                <div className="w-10 sm:w-14 h-8 sm:h-10 rounded-b-xl bg-amber-800 border-2 border-amber-900 shadow flex items-center justify-center text-[8px] font-bold text-amber-200">
                  Lvl {room?.plant_level || 1}
                </div>
              </div>
              <button 
                type="button"
                className="mt-1 px-2 py-0.5 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white text-[9px] font-bold flex items-center gap-1 shadow"
              >
                <Droplets size={10} />
                <span>Water</span>
              </button>
            </div>

            {/* 4. VIRTUAL PET (On Rug) */}
            <div 
              onClick={handlePetAnimal}
              className="absolute bottom-6 sm:bottom-10 left-1/3 cursor-pointer group flex flex-col items-center"
            >
              <div className="text-2xl sm:text-4xl group-hover:scale-125 transition-transform animate-bounce">
                🐱
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold text-rose-300 bg-black/60 px-1.5 py-0.2 rounded-full border border-rose-500/20 mt-0.5">
                {room?.pet_name} ({room?.pet_happiness || 70}%)
              </span>
            </div>

            {/* 5. RETRO JUKEBOX / RECORD PLAYER (Bottom Right) */}
            <div 
              onClick={toggleMusic}
              className="absolute bottom-4 sm:bottom-6 right-1/4 cursor-pointer group flex flex-col items-center"
            >
              <div className={`text-2xl sm:text-3xl group-hover:scale-110 transition-transform ${isPlayingLofi ? 'animate-spin' : ''}`}>
                📻
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${isPlayingLofi ? 'bg-pink-500 text-white animate-pulse' : 'bg-black/60 text-gray-400'}`}>
                {isPlayingLofi ? 'Lo-Fi On 🎵' : 'Play Music'}
              </span>
            </div>
          </div>

          {/* QUICK INTERACTIVE ACTION CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={handleWaterPlant}
              className="glass-card p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all group flex flex-col justify-between"
            >
              <span className="text-xl mb-1 group-hover:scale-125 transition-transform">🌱</span>
              <div>
                <h4 className="text-xs font-bold text-white">Water Plant</h4>
                <p className="text-[10px] text-emerald-300">Level {room?.plant_level}/10 Growing</p>
              </div>
            </button>

            <button
              onClick={handlePetAnimal}
              className="glass-card p-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 text-left transition-all group flex flex-col justify-between"
            >
              <span className="text-xl mb-1 group-hover:scale-125 transition-transform">🐾</span>
              <div>
                <h4 className="text-xs font-bold text-white">Pet {room?.pet_name}</h4>
                <p className="text-[10px] text-rose-300">{room?.pet_happiness}% Happiness</p>
              </div>
            </button>

            <button
              onClick={() => setShowFridgeModal(true)}
              className="glass-card p-3 rounded-2xl border border-yellow-500/30 bg-yellow-950/20 hover:bg-yellow-950/40 text-left transition-all group flex flex-col justify-between"
            >
              <span className="text-xl mb-1 group-hover:scale-125 transition-transform">📝</span>
              <div>
                <h4 className="text-xs font-bold text-white">Fridge Notes</h4>
                <p className="text-[10px] text-yellow-300">{room?.sticky_notes?.length || 0} messages</p>
              </div>
            </button>

            <button
              onClick={() => setShowPhotoModal(true)}
              className="glass-card p-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 text-left transition-all group flex flex-col justify-between"
            >
              <span className="text-xl mb-1 group-hover:scale-125 transition-transform">🖼️</span>
              <div>
                <h4 className="text-xs font-bold text-white">Memory Wall</h4>
                <p className="text-[10px] text-purple-300">Frame photos</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. FRIDGE STICKY NOTES MODAL */}
      {/* ============================================================== */}
      {showFridgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-darker border border-yellow-500/30 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧊</span>
                <div>
                  <h3 className="text-base font-bold text-white">Fridge Sticky Notes</h3>
                  <p className="text-[11px] text-yellow-300">Leave sweet reminders & cute notes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFridgeModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Notes Corkboard */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {(!room?.sticky_notes || room.sticky_notes.length === 0) ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No notes yet. Stick the very first love note on your fridge! 👇
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {room.sticky_notes.map((note) => {
                    const colorStyles = {
                      yellow: 'bg-yellow-200 text-yellow-950',
                      pink: 'bg-pink-200 text-pink-950',
                      mint: 'bg-emerald-200 text-emerald-950',
                      lavender: 'bg-purple-200 text-purple-950'
                    }[note.color || 'yellow'];

                    return (
                      <div 
                        key={note.id}
                        className={`p-3 rounded-2xl shadow-lg relative flex flex-col justify-between min-h-[100px] ${colorStyles} transform hover:scale-[1.02] transition-transform`}
                      >
                        <p className="text-xs font-semibold leading-relaxed break-words">
                          {note.text}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[9px] opacity-75">
                          <span>By {note.author}</span>
                          <button
                            onClick={() => handleDeleteStickyNote(note.id)}
                            className="p-1 text-black/50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Post New Note Form */}
            <form onSubmit={handlePostStickyNote} className="pt-3 border-t border-white/10 space-y-3">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write a sweet note for your partner..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                maxLength={120}
                required
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'yellow', bg: 'bg-yellow-300' },
                    { id: 'pink', bg: 'bg-pink-300' },
                    { id: 'mint', bg: 'bg-emerald-300' },
                    { id: 'lavender', bg: 'bg-purple-300' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewNoteColor(c.id)}
                      className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center transition-transform ${newNoteColor === c.id ? 'scale-125 ring-2 ring-white' : ''}`}
                    >
                      {newNoteColor === c.id && <Check size={12} className="text-black" />}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={postingNote || !newNoteText.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>Stick Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CUDDLE & AVATAR POSE MENU */}
      {/* ============================================================== */}
      {showCuddleMenu && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-darker border border-pink-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-1.5">
              <span>🛋️</span> Sofa Cuddles & Actions
            </h3>
            <p className="text-xs text-pink-300/70 mb-4">Choose where to hang out in the room</p>

            <div className="space-y-2">
              {[
                { id: 'couch', label: 'Cuddle on Sofa 💕', desc: 'Sit close and hold hands' },
                { id: 'bed', label: 'Sleep in Bed 🛏️', desc: 'Rest together under the duvet' },
                { id: 'window', label: 'Look at Stars 🌙', desc: 'Stand by the romantic window' },
                { id: 'reading', label: 'Read Cozy Book 📖', desc: 'Quiet peaceful evening' }
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => handleSetAvatar(action.label)}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{action.label}</h4>
                    <p className="text-[10px] text-gray-400">{action.desc}</p>
                  </div>
                  <Sparkles size={14} className="text-pink-400" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCuddleMenu(false)}
              className="mt-4 w-full py-2 rounded-xl bg-white/10 text-gray-300 text-xs font-semibold hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. WALL PHOTO FRAME MODAL */}
      {/* ============================================================== */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-darker border border-purple-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span>🖼️</span> Hang Photo on Wall
            </h3>
            <p className="text-xs text-gray-400 mb-4">Add your favorite memory to your room's wall</p>

            <form onSubmit={handleHangPhoto} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Caption / Title
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g. Sunset in Paris"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  maxLength={30}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={framingPhoto || !photoUrl.trim()}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  {framingPhoto ? <RefreshCw className="animate-spin" size={14} /> : 'Hang Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ROOM THEME & ATMOSPHERE MODAL */}
      {/* ============================================================== */}
      {showDecorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-darker border border-pink-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-1.5">
              <span>🎨</span> Room Atmosphere & Decor
            </h3>
            <p className="text-xs text-gray-400 mb-4">Choose the wallpaper & vibe of your shared home</p>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'warm-sunset', label: 'Warm Sunset 🌇', color: 'from-amber-900/40 to-pink-900/40' },
                { id: 'starry-night', label: 'Starry Night 🌌', color: 'from-indigo-950/60 to-purple-950/60' },
                { id: 'sakura-blossom', label: 'Sakura Petals 🌸', color: 'from-rose-950/60 to-pink-900/40' },
                { id: 'cozy-cabin', label: 'Cozy Cabin 🌲', color: 'from-amber-950/60 to-stone-900/60' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleChangeTheme(t.id)}
                  className={`p-3 rounded-2xl bg-gradient-to-br ${t.color} border text-left transition-all ${room?.theme === t.id ? 'border-pink-400 ring-2 ring-pink-400/30' : 'border-white/10 hover:border-white/30'}`}
                >
                  <h4 className="text-xs font-bold text-white">{t.label}</h4>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDecorModal(false)}
              className="mt-4 w-full py-2 rounded-xl bg-white/10 text-gray-300 text-xs font-semibold hover:bg-white/15"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

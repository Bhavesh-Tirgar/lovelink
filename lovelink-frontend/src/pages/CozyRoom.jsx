import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Sparkles, RefreshCw, 
  Droplets, Plus, Trash2, Camera, Sun, Moon,
  Check, X, Heart
} from 'lucide-react';

export default function CozyRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [isNightMode, setIsNightMode] = useState(false);
  
  // Interactive Modals
  const [showFridgeModal, setShowFridgeModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showCuddleMenu, setShowCuddleMenu] = useState(false);

  // New Sticky Note Input
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('lemon');
  const [postingNote, setPostingNote] = useState(false);

  // New Photo Frame Input
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [framingPhoto, setFramingPhoto] = useState(false);

  // Audio Player
  const [isPlayingLofi, setIsPlayingLofi] = useState(false);
  const audioRef = useRef(null);

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/room');
      setRoom(res.data);
      setIsPlayingLofi(res.data.music_playing);
    } catch (err) {
      console.error('Failed to load room:', err);
      toast.error('Could not load room');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Clean Web Audio sound effects
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio muted
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
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#6ee7b7'] });
      toast.success("Watered the plant! Looking healthy and green 🌿");
    } catch {
      toast.error('Failed to water plant');
    }
  };

  const handlePetAnimal = async () => {
    playSound('chime');
    try {
      const res = await api.post('/room/pet');
      setRoom(prev => ({
        ...prev,
        pet_happiness: res.data.pet_happiness
      }));
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 }, colors: ['#f59e0b', '#fbbf24', '#fef3c7'] });
      toast.success(`Petted ${room?.pet_name}! Happy & purring 🐾`);
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
      toast.success('Note pinned to the fridge! 📌');
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
      toast.success(`You are now ${action}! ✨`);
    } catch {
      toast.error('Could not update action');
    }
  };

  const handleHangPhoto = async (e) => {
    e.preventDefault();
    if (!photoUrl.trim()) return;
    setFramingPhoto(true);
    try {
      const res = await api.post('/room/wall-photo', {
        url: photoUrl,
        caption: photoCaption || 'Our Memory'
      });
      setRoom(prev => ({
        ...prev,
        wall_photos: [res.data, ...(prev.wall_photos || [])]
      }));
      setPhotoUrl('');
      setPhotoCaption('');
      setShowPhotoModal(false);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.5 } });
      toast.success('Memory pinned to the wall! 🖼️');
    } catch {
      toast.error('Could not hang photo');
    } finally {
      setFramingPhoto(false);
    }
  };

  const toggleMusic = async () => {
    playSound('chime');
    try {
      const res = await api.post('/room/music-toggle');
      setIsPlayingLofi(res.data.music_playing);
      setRoom(prev => ({ ...prev, music_playing: res.data.music_playing }));
      toast.success(res.data.music_playing ? 'Lo-fi vinyl playing ☕' : 'Vinyl paused');
    } catch {
      toast.error('Failed to toggle music');
    }
  };

  return (
    <div className={`min-h-screen ${isNightMode ? 'bg-[#0f1115] text-slate-100' : 'bg-[#f7f5f0] text-stone-800'} transition-colors duration-700 pb-28 pt-4 px-3 sm:px-6 select-none`}>
      {/* Audio element for lo-fi */}
      <audio 
        ref={audioRef}
        loop 
        src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3" 
      />

      {/* Clean Aesthetic Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isNightMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300'} transition-all text-xs font-semibold`}
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center justify-center gap-1.5">
            <span>Our Studio Apartment</span>
            <span className="text-amber-500">☕</span>
          </h1>
          <p className="text-[11px] opacity-60 font-medium">A warm, minimalist place for the two of us</p>
        </div>

        <button
          onClick={() => setIsNightMode(!isNightMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isNightMode ? 'bg-amber-400/20 text-amber-300' : 'bg-stone-200/80 text-stone-700'} text-xs font-semibold transition-all`}
        >
          {isNightMode ? <Sun size={15} /> : <Moon size={15} />}
          <span className="hidden sm:inline">{isNightMode ? 'Daylight' : 'Evening'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
          <RefreshCw className="animate-spin text-amber-500" size={28} />
          <p className="text-xs opacity-60">Entering your apartment...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* ============================================================== */}
          {/* THE REAL AESTHETIC STUDIO ROOM (Architectural Perspective) */}
          {/* ============================================================== */}
          <div className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[520px] rounded-3xl overflow-hidden border ${isNightMode ? 'border-white/10 bg-[#161920] shadow-[0_25px_60px_rgba(0,0,0,0.8)]' : 'border-stone-200 bg-[#ede8df] shadow-[0_20px_50px_rgba(0,0,0,0.08)]'}`}>
            
            {/* 1. ROOM ARCHITECTURE (Clean Walls & French Windows) */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              
              {/* Top Half: Soft Matte Wall with Big French Window */}
              <div className={`h-[55%] w-full relative border-b ${isNightMode ? 'border-white/5 bg-[#1b1f29]' : 'border-stone-300/60 bg-[#eae4da]'}`}>
                
                {/* Sun / Night Window Rays */}
                <div className={`absolute top-0 left-12 w-48 h-full ${isNightMode ? 'bg-indigo-400/5' : 'bg-amber-200/20'} -skew-x-12 blur-2xl`} />

                {/* Modern Black-Frame French Window */}
                <div className={`absolute top-4 sm:top-6 left-6 sm:left-12 w-28 sm:w-44 h-32 sm:h-44 rounded-t-xl border-4 ${isNightMode ? 'border-slate-700 bg-gradient-to-b from-[#0a0d14] to-[#121622]' : 'border-stone-700 bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50'} overflow-hidden shadow-md flex flex-col justify-between p-2`}>
                  <div className="flex justify-between items-start">
                    <span className="text-xs">{isNightMode ? '🌙' : '☀️'}</span>
                    <span className="text-[10px] opacity-40">{isNightMode ? '✨ ✨' : '☁️ 🕊️'}</span>
                  </div>
                  {/* Sheer White Curtain drape */}
                  <div className="h-6 w-full border-t border-dashed border-white/30 text-[9px] text-center opacity-40 font-mono">
                    city skyline
                  </div>
                </div>

                {/* FAIRY LIGHTS & POLAROID STRING ON WALL */}
                <div className="absolute top-6 sm:top-8 right-6 sm:right-16 flex items-center gap-2 sm:gap-3 pointer-events-auto">
                  {(room?.wall_photos || []).slice(0, 3).map((photo, idx) => (
                    <div 
                      key={photo.id || idx}
                      onClick={() => setShowPhotoModal(true)}
                      className="group cursor-pointer transform hover:scale-110 transition-transform bg-white p-1.5 pb-3 rounded shadow-md border border-stone-200 rotate-1 hover:rotate-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400/80 mx-auto -mt-2.5 mb-1 shadow-sm" />
                      <img 
                        src={photo.url} 
                        alt="memory" 
                        className="w-12 sm:w-16 h-12 sm:h-16 object-cover rounded-sm" 
                      />
                      <div className="text-[8px] text-stone-800 text-center font-serif truncate max-w-[48px] sm:max-w-[64px] mt-1">
                        {photo.caption || 'Us'}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setShowPhotoModal(true)}
                    className={`w-12 sm:w-16 h-16 sm:h-22 border-2 border-dashed ${isNightMode ? 'border-white/20 text-slate-400 hover:text-white' : 'border-stone-400 text-stone-500 hover:text-stone-800'} rounded flex flex-col items-center justify-center p-1 transition-colors`}
                  >
                    <Camera size={14} />
                    <span className="text-[8px] font-medium mt-1">+Photo</span>
                  </button>
                </div>
              </div>

              {/* Bottom Half: Natural Oak Hardwood Floor */}
              <div className={`h-[45%] w-full relative ${isNightMode ? 'bg-[#12141a]' : 'bg-[#dfd7cc]'}`}>
                {/* Clean Nordic Woven Cream Carpet */}
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 w-64 sm:w-96 h-28 sm:h-40 rounded-2xl ${isNightMode ? 'bg-slate-800/40 border border-white/5' : 'bg-[#f4efe8] border border-stone-300 shadow-sm'}`} />
              </div>
            </div>

            {/* ============================================================== */}
            {/* 2. REALISTIC MINIMALIST FURNITURE */}
            {/* ============================================================== */}

            {/* A. MODERN OATMEAL COUCH (Center Carpet) */}
            <div 
              onClick={() => setShowCuddleMenu(true)}
              className="absolute bottom-12 sm:bottom-20 left-1/2 -translate-x-1/2 cursor-pointer group flex flex-col items-center"
            >
              {/* Couple Avatars sitting together */}
              <div className="flex items-center -space-x-2 mb-2 group-hover:scale-105 transition-transform">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-800 text-white border-2 border-white shadow-md flex items-center justify-center text-xs font-bold">
                    {room?.my_name?.[0] || 'A'}
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1 ${isNightMode ? 'bg-slate-900/90 text-slate-200' : 'bg-white/90 text-stone-800 shadow-sm'}`}>
                    {room?.my_name}
                  </span>
                </div>

                <div className="text-amber-500 text-sm z-10 animate-bounce">
                  <Heart size={14} className="fill-amber-500 text-amber-500" />
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-600 text-white border-2 border-white shadow-md flex items-center justify-center text-xs font-bold">
                    {room?.partner_name?.[0] || 'B'}
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1 ${isNightMode ? 'bg-slate-900/90 text-slate-200' : 'bg-white/90 text-stone-800 shadow-sm'}`}>
                    {room?.partner_name}
                  </span>
                </div>
              </div>

              {/* Realistic Linen/Boucle Couch */}
              <div className={`w-44 sm:w-64 h-16 sm:h-22 rounded-2xl ${isNightMode ? 'bg-[#232834] border border-slate-700 shadow-2xl' : 'bg-[#d8cfc4] border border-stone-300 shadow-lg'} flex items-center justify-center p-2 relative`}>
                <div className="flex items-center justify-between w-full px-2 opacity-60 text-xs">
                  <span>🛋️</span>
                  <span className="text-[10px] font-medium tracking-wide">Cuddle Couch</span>
                  <span>🛋️</span>
                </div>
              </div>
              <span className={`text-[9px] mt-1.5 px-2.5 py-0.5 rounded-full font-medium ${isNightMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-stone-100 text-stone-600 border border-stone-200 shadow-sm'} group-hover:border-amber-500 transition-colors`}>
                Tap to sit or cuddle
              </span>
            </div>

            {/* B. SMEG-STYLE RETRO FRIDGE & STICKY NOTES (Right Side) */}
            <div 
              onClick={() => setShowFridgeModal(true)}
              className="absolute bottom-12 sm:bottom-20 right-4 sm:right-10 cursor-pointer group flex flex-col items-center"
            >
              <div className={`w-18 sm:w-26 h-32 sm:h-44 rounded-2xl ${isNightMode ? 'bg-[#1e2330] border border-slate-600' : 'bg-[#e2ddd5] border-2 border-stone-300'} shadow-xl flex flex-col justify-between p-2 group-hover:scale-105 transition-transform`}>
                {/* Silver Handle */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-[#fef08a] text-stone-900 shadow text-[6px] p-0.5 font-sans font-bold -rotate-3 overflow-hidden">
                      {room?.sticky_notes?.[0]?.text || 'Love you!'}
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-[#fed7aa] text-stone-900 shadow text-[6px] p-0.5 font-sans font-bold rotate-6 overflow-hidden">
                      {room?.sticky_notes?.[1]?.text || 'Groceries'}
                    </div>
                  </div>
                  <div className="w-1.5 h-8 rounded-full bg-stone-400 shadow-sm" />
                </div>

                <div className="text-[9px] text-center font-bold tracking-wider opacity-60">
                  FRIDGE
                </div>
              </div>
              <span className={`text-[9px] mt-1.5 px-2 py-0.5 rounded-full font-semibold ${isNightMode ? 'bg-slate-800 text-amber-300 border border-slate-700' : 'bg-stone-100 text-stone-700 border border-stone-200 shadow-sm'}`}>
                Fridge Notes ({room?.sticky_notes?.length || 0}) 📌
              </span>
            </div>

            {/* C. AESTHETIC MONSTERA PLANT (Left Side in Ceramic Pot) */}
            <div 
              onClick={handleWaterPlant}
              className="absolute bottom-12 sm:bottom-20 left-4 sm:left-10 cursor-pointer group flex flex-col items-center"
            >
              <div className="flex flex-col items-center justify-end group-hover:scale-105 transition-transform">
                <span className="text-3xl sm:text-5xl drop-shadow-sm">
                  {room?.plant_level >= 8 ? '🪴' : room?.plant_level >= 5 ? '🌿' : room?.plant_level >= 3 ? '🌱' : '🪴'}
                </span>
                {/* White Ceramic Pot with Wooden Legs */}
                <div className={`w-10 sm:w-14 h-9 sm:h-12 rounded-b-xl ${isNightMode ? 'bg-slate-300 text-slate-800' : 'bg-white text-stone-700'} border border-stone-300 shadow flex flex-col items-center justify-center text-[8px] font-bold`}>
                  <span>Level {room?.plant_level || 1}</span>
                </div>
              </div>
              <button 
                type="button"
                className="mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold flex items-center gap-1 shadow"
              >
                <Droplets size={10} />
                <span>Water</span>
              </button>
            </div>

            {/* D. GOLDEN RETRIEVER / CAT SLEEPING ON RUG */}
            <div 
              onClick={handlePetAnimal}
              className="absolute bottom-4 sm:bottom-6 left-1/4 cursor-pointer group flex flex-col items-center"
            >
              <div className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                🐕
              </div>
              <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-stone-600 shadow-sm'}`}>
                {room?.pet_name} ({room?.pet_happiness || 70}%)
              </span>
            </div>

            {/* E. MINIMALIST WOODEN RECORD PLAYER */}
            <div 
              onClick={toggleMusic}
              className="absolute bottom-4 sm:bottom-6 right-1/3 cursor-pointer group flex flex-col items-center"
            >
              <div className={`text-2xl sm:text-3xl group-hover:scale-110 transition-transform ${isPlayingLofi ? 'animate-spin' : ''}`}>
                📻
              </div>
              <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${isPlayingLofi ? 'bg-amber-600 text-white' : isNightMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-stone-600 shadow-sm'}`}>
                {isPlayingLofi ? 'Lo-Fi On ☕' : 'Vinyl Player'}
              </span>
            </div>
          </div>

          {/* CLEAN INTERACTIVE HUBS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={handleWaterPlant}
              className={`p-3.5 rounded-2xl ${isNightMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800' : 'bg-white border-stone-200 hover:bg-stone-50 shadow-sm'} border text-left transition-all flex flex-col justify-between`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xl">🌿</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">Lvl {room?.plant_level}/10</span>
              </div>
              <div>
                <h4 className="text-xs font-bold">House Plant</h4>
                <p className="text-[10px] opacity-60">Tap to water today</p>
              </div>
            </button>

            <button
              onClick={handlePetAnimal}
              className={`p-3.5 rounded-2xl ${isNightMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800' : 'bg-white border-stone-200 hover:bg-stone-50 shadow-sm'} border text-left transition-all flex flex-col justify-between`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xl">🐾</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">{room?.pet_happiness}%</span>
              </div>
              <div>
                <h4 className="text-xs font-bold">{room?.pet_name}</h4>
                <p className="text-[10px] opacity-60">Tap to cuddle & pet</p>
              </div>
            </button>

            <button
              onClick={() => setShowFridgeModal(true)}
              className={`p-3.5 rounded-2xl ${isNightMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800' : 'bg-white border-stone-200 hover:bg-stone-50 shadow-sm'} border text-left transition-all flex flex-col justify-between`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xl">📌</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">{room?.sticky_notes?.length || 0}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold">Fridge Notes</h4>
                <p className="text-[10px] opacity-60">Sweet reminders</p>
              </div>
            </button>

            <button
              onClick={() => setShowPhotoModal(true)}
              className={`p-3.5 rounded-2xl ${isNightMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800' : 'bg-white border-stone-200 hover:bg-stone-50 shadow-sm'} border text-left transition-all flex flex-col justify-between`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xl">🖼️</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">Gallery</span>
              </div>
              <div>
                <h4 className="text-xs font-bold">Memory Wall</h4>
                <p className="text-[10px] opacity-60">Pin new polaroids</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. CLEAN FRIDGE BOARD MODAL */}
      {/* ============================================================== */}
      {showFridgeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isNightMode ? 'bg-[#181c24] text-white border-slate-700' : 'bg-[#faf8f5] text-stone-900 border-stone-300'} border rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col`}>
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Fridge Notes</h3>
                  <p className="text-[11px] opacity-60">Reminders, inside jokes & love notes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFridgeModal(false)}
                className="p-1 rounded-full opacity-60 hover:opacity-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Clean Sticky Note Corkboard */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {(!room?.sticky_notes || room.sticky_notes.length === 0) ? (
                <div className="text-center py-8 opacity-50 text-xs">
                  No notes on the fridge yet. Leave a sweet one below!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {room.sticky_notes.map((note) => {
                    const colorStyles = {
                      lemon: 'bg-[#fef08a] text-stone-900 border-[#fde047]',
                      peach: 'bg-[#ffedd5] text-stone-900 border-[#fed7aa]',
                      mint: 'bg-[#d1fae5] text-stone-900 border-[#a7f3d0]',
                      lavender: 'bg-[#ede9fe] text-stone-900 border-[#ddd6fe]'
                    }[note.color || 'lemon'];

                    return (
                      <div 
                        key={note.id}
                        className={`p-3 rounded-xl shadow-sm border ${colorStyles} flex flex-col justify-between min-h-[95px] transform hover:scale-[1.02] transition-transform`}
                      >
                        <p className="text-xs font-medium leading-relaxed break-words font-sans">
                          {note.text}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[9px] opacity-70">
                          <span>{note.author}</span>
                          <button
                            onClick={() => handleDeleteStickyNote(note.id)}
                            className="p-0.5 text-stone-500 hover:text-red-600 transition-colors"
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

            {/* Post Note Form */}
            <form onSubmit={handlePostStickyNote} className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write a little note for your partner..."
                className={`w-full ${isNightMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-stone-300 text-stone-900'} border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500`}
                maxLength={100}
                required
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'lemon', bg: 'bg-[#fef08a]' },
                    { id: 'peach', bg: 'bg-[#ffedd5]' },
                    { id: 'mint', bg: 'bg-[#d1fae5]' },
                    { id: 'lavender', bg: 'bg-[#ede9fe]' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewNoteColor(c.id)}
                      className={`w-6 h-6 rounded-full ${c.bg} border border-stone-300 flex items-center justify-center transition-transform ${newNoteColor === c.id ? 'scale-125 ring-2 ring-stone-700' : ''}`}
                    >
                      {newNoteColor === c.id && <Check size={11} className="text-stone-800" />}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={postingNote || !newNoteText.trim()}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all flex items-center gap-1 shadow"
                >
                  <Plus size={14} />
                  <span>Pin Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CUDDLE & AVATAR POSE MODAL */}
      {/* ============================================================== */}
      {showCuddleMenu && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isNightMode ? 'bg-[#181c24] text-white border-slate-700' : 'bg-white text-stone-900 border-stone-200'} border rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center`}>
            <h3 className="text-sm sm:text-base font-bold mb-1">Cuddle & Room Actions</h3>
            <p className="text-xs opacity-60 mb-4">Choose where to hang out together</p>

            <div className="space-y-2">
              {[
                { id: 'couch', label: 'Cuddle on Couch 💕', desc: 'Relax and talk about your day' },
                { id: 'tea', label: 'Make Hot Tea Together 🍵', desc: 'Cozy kitchen break' },
                { id: 'window', label: 'Watch the View 🕊️', desc: 'Look out the window together' },
                { id: 'reading', label: 'Read Books 📖', desc: 'Quiet peaceful evening' }
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => handleSetAvatar(action.label)}
                  className={`w-full p-3 rounded-2xl ${isNightMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-stone-50 hover:bg-stone-100 border-stone-200'} border text-left transition-all flex items-center justify-between`}
                >
                  <div>
                    <h4 className="text-xs font-bold">{action.label}</h4>
                    <p className="text-[10px] opacity-60">{action.desc}</p>
                  </div>
                  <Sparkles size={14} className="text-amber-500" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCuddleMenu(false)}
              className="mt-4 w-full py-2 rounded-xl bg-stone-200/70 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${isNightMode ? 'bg-[#181c24] text-white border-slate-700' : 'bg-white text-stone-900 border-stone-200'} border rounded-3xl p-6 max-w-sm w-full shadow-2xl`}>
            <h3 className="text-sm sm:text-base font-bold mb-1 flex items-center gap-1.5">
              <span>🖼️</span> Hang Photo on Wall
            </h3>
            <p className="text-xs opacity-60 mb-4">Add a favorite polaroid to your apartment</p>

            <form onSubmit={handleHangPhoto} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold opacity-80 block mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className={`w-full ${isNightMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500`}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold opacity-80 block mb-1">
                  Caption
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g. Vacation in Goa"
                  className={`w-full ${isNightMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500`}
                  maxLength={25}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-200/70 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={framingPhoto || !photoUrl.trim()}
                  className="flex-1 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                >
                  {framingPhoto ? <RefreshCw className="animate-spin" size={14} /> : 'Pin Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, RefreshCw, Sparkles, 
  Settings, StickyNote, Image, Send, Trash2, X, Shirt, Check
} from 'lucide-react';
import useWebSocket from '../hooks/useWebSocket';
import { getWsBaseUrl } from '../utils/wsUrl';
import FriendmojiCouple from '../components/FriendmojiCouple';
import Bitmoji3DStage from '../components/Bitmoji3DStage';
import SnapchatFriendshipProfile from '../components/SnapchatFriendshipProfile';
import { FRIENDMOJI_TEMPLATES, WARDROBE_OUTFITS } from '../utils/libmoji';

export default function CozyRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [currentAction, setCurrentAction] = useState('couch');
  const [stageMode, setStageMode] = useState('3d_bitmoji'); // '3d_bitmoji' (Default 3D Bitmojis) | 'snap_profile' | 'studio_art'
  
  // Interactive Modals
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBitmojiModal, setShowBitmojiModal] = useState(false);
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState('varsity_jacket');
  const [isNightMode, setIsNightMode] = useState(true);

  // Sticky Note Input
  const [newNoteText, setNewNoteText] = useState('');
  const [postingNote, setPostingNote] = useState(false);

  // Photo Frame Input
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [framingPhoto, setFramingPhoto] = useState(false);

  // Custom Bitmoji ID
  const [myBitmojiId, setMyBitmojiId] = useState(
    localStorage.getItem('lovelink_bitmoji_id') || ''
  );



  const coupleId = room?.couple_id || localStorage.getItem('couple_id') || null;
  const WS_URL = getWsBaseUrl();

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/room');
      setRoom(res.data);
      if (res.data?.couple_action) {
        setCurrentAction(res.data.couple_action);
      }
      if (res.data?.my_avatar?.outfit) {
        setSelectedOutfit(res.data.my_avatar.outfit);
      }
    } catch (err) {
      console.error('Failed to load room:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket live synchronizer for instant scene swap, notes & reaction
  const handleWSMessage = useCallback((data) => {
    if (!data) return;

    if (data.type === 'room_update') {
      if (data.action === 'couple_interaction') {
        const nextAction = data.interaction || data.interaction_action || data.sub_action || 'couch';
        setCurrentAction(nextAction);
        
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.55 },
          colors: ['#F43F5E', '#EC4899', '#FB7185', '#FBBF24']
        });
        toast.success(data.message || `Partner switched to ${nextAction}! 💖`);
      } else if (data.action === 'new_sticky_note' && data.note) {
        setRoom(prev => prev ? ({
          ...prev,
          sticky_notes: [data.note, ...(prev.sticky_notes || []).filter(n => n.id !== data.note.id)]
        }) : prev);
        toast.success(data.message || 'Partner posted a new love note! 📌');
      } else if (data.action === 'delete_sticky_note' && data.note_id) {
        setRoom(prev => prev ? ({
          ...prev,
          sticky_notes: (prev.sticky_notes || []).filter(n => n.id !== data.note_id)
        }) : prev);
      } else if (data.action === 'avatar_customized') {
        fetchRoom();
        toast.success(data.message || 'Partner updated their avatar style! ✨');
      }
    }
  }, [fetchRoom]);

  useWebSocket(
    coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
    handleWSMessage
  );

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Switch Couple Scene & broadcast to partner
  const handleSelectScene = async (sceneId) => {
    setCurrentAction(sceneId);
    
    // Play subtle haptic / visual celebration
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#F43F5E', '#EC4899', '#FBBF24']
    });

    try {
      await api.post('/room/couple-interaction', { action: sceneId });
    } catch (err) {
      console.warn('Could not sync scene to backend:', err);
    }
  };

  const handlePostStickyNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setPostingNote(true);
    try {
      const res = await api.post('/room/sticky-note', {
        text: newNoteText.trim(),
        color: 'lemon'
      });
      setRoom(prev => ({
        ...prev,
        sticky_notes: [res.data, ...(prev.sticky_notes || [])]
      }));
      setNewNoteText('');
      confetti({ particleCount: 25, spread: 40, origin: { y: 0.5 } });
      toast.success('Love note posted! 📌');
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
      toast.error('Could not delete note');
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
      toast.success('Memory saved to wall! 🖼️');
    } catch {
      toast.error('Could not save photo');
    } finally {
      setFramingPhoto(false);
    }
  };

  const saveBitmojiId = () => {
    localStorage.setItem('lovelink_bitmoji_id', myBitmojiId.trim());
    setShowBitmojiModal(false);
    toast.success('Bitmoji Avatar ID saved! ✨');
  };

  const handleSelectOutfit = async (outfitId) => {
    setSelectedOutfit(outfitId);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#F43F5E', '#EC4899', '#A855F7', '#FBBF24']
    });
    try {
      await api.post('/room/avatar/customize', { outfit: outfitId });
      setRoom(prev => prev ? ({
        ...prev,
        my_avatar: { ...(prev.my_avatar || {}), outfit: outfitId }
      }) : prev);
      const outfitObj = WARDROBE_OUTFITS.find(o => o.id === outfitId);
      toast.success(`Dressed in ${outfitObj?.name || 'new outfit'}! ✨`);
    } catch (err) {
      console.warn("Failed to sync outfit:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100 pb-28 pt-4 sm:pt-6 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center select-none animate-in fade-in duration-500">
      
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between mb-4 z-30 border-b border-white/5 pb-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all text-xs font-bold shadow-md"
        >
          <ArrowLeft size={15} />
          <span>Dashboard</span>
        </button>

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center justify-center gap-1.5">
            <span>Couple Studio</span>
            <span className="text-rose-400">✨</span>
          </h1>
          <p className="text-[11px] text-gray-400 font-medium">Libmoji Interactive Couple Space</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWardrobeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-950/60 to-purple-950/60 hover:from-rose-900 hover:to-purple-900 border border-rose-500/30 text-rose-200 hover:text-white text-xs font-bold transition-all shadow-md"
            title="Wardrobe Closet & Outfits"
          >
            <Shirt size={14} className="text-rose-400" />
            <span className="hidden sm:inline">Wardrobe</span>
          </button>

          <button
            onClick={() => setShowBitmojiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all shadow-md"
            title="Bitmoji Settings"
          >
            <Settings size={14} className="text-pink-400" />
            <span className="hidden sm:inline">Avatar ID</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <RefreshCw className="animate-spin text-rose-500" size={32} />
          <p className="text-xs text-gray-400 font-semibold">Opening Couple Studio...</p>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-6">
          
          {/* ── Couple Scene Canvas / 3D Bitmoji Stage ────────────── */}
          <div className="w-full max-w-lg flex flex-col items-center">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between w-full mb-3 px-1">
              <div className="flex items-center gap-1.5 bg-[#131722] p-1 rounded-full border border-white/10 shadow-lg">
                <button
                  type="button"
                  onClick={() => setStageMode('3d_bitmoji')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
                    stageMode === '3d_bitmoji'
                      ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 text-white shadow-md scale-[1.02]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={12} className={stageMode === '3d_bitmoji' ? 'text-amber-200' : 'text-gray-400'} />
                  <span>3D Bitmoji ✨</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageMode('snap_profile')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    stageMode === 'snap_profile'
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>💛 Snap Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageMode('studio_art')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    stageMode === 'studio_art'
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>🎨 Art</span>
                </button>
              </div>

              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                {stageMode === '3d_bitmoji' ? 'Stylized 3D Bitmojis ✨' : stageMode === 'snap_profile' ? 'Official 3D Bitmojis 💛' : 'Vector Couple Art'}
              </span>
            </div>

            {stageMode === '3d_bitmoji' ? (
              <Bitmoji3DStage
                action={currentAction}
                myName={room?.my_name || 'You'}
                partnerName={room?.partner_name || 'Partner'}
                onActionTrigger={(act) => handleSelectScene(act)}
                onOpenCreator={() => setShowBitmojiModal(true)}
                className="w-full"
              />
            ) : stageMode === 'snap_profile' ? (
              <SnapchatFriendshipProfile
                action={currentAction}
                myName={room?.my_name || 'You'}
                partnerName={room?.partner_name || 'Partner'}
                onActionTrigger={(act) => handleSelectScene(act)}
                onOpenWardrobe={() => setShowWardrobeModal(true)}
                onOpenCreator={() => setShowBitmojiModal(true)}
                onOpen3DCanvas={() => setStageMode('3d_bitmoji')}
                className="w-full"
              />
            ) : (
              <div className="w-full p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#131722] via-[#0E111A] to-black border border-white/10 shadow-2xl flex flex-col items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 via-transparent to-pink-500/10 pointer-events-none" />
                <FriendmojiCouple
                  action={currentAction}
                  myAvatar={{ ...(room?.my_avatar || {}), outfit: selectedOutfit }}
                  partnerAvatar={room?.partner_avatar}
                  myName={room?.my_name || 'You'}
                  partnerName={room?.partner_name || 'Partner'}
                  isNightMode={isNightMode}
                  onToggleNightMode={() => setIsNightMode(prev => !prev)}
                  onWardrobeClick={() => setShowWardrobeModal(true)}
                />
              </div>
            )}
          </div>

          {/* ── Interactive Scene Picker ──────────────────────────── */}
          <div className="w-full max-w-lg space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Choose Couple Action
              </span>
              <span className="text-[10px] text-rose-400 font-medium">
                Syncs live to partner's screen 💖
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.values(FRIENDMOJI_TEMPLATES).map((tmpl) => {
                const isSelected = currentAction === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectScene(tmpl.id)}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-105'
                        : 'bg-[#131722]/80 hover:bg-[#1a2030] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{tmpl.emoji}</span>
                    <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {tmpl.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Studio Live Wall Decor Preview ── */}
          {((room?.sticky_notes && room.sticky_notes.length > 0) || (room?.wall_photos && room.wall_photos.length > 0)) && (
            <div className="w-full max-w-lg p-3 rounded-2xl bg-[#131722]/80 border border-white/10 flex items-center justify-between gap-3 shadow-md">
              {room?.sticky_notes?.length > 0 && (
                <div 
                  onClick={() => setShowNotesModal(true)}
                  className="flex-1 p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 cursor-pointer hover:bg-amber-400/25 transition-all group"
                  title="Click to view all pinned sticky notes"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 mb-0.5">
                    <span>📌 Pinned Note</span>
                    <span className="text-[9px] text-gray-400">by {room.sticky_notes[0].author || 'Partner'}</span>
                  </div>
                  <p className="text-xs truncate italic">"{room.sticky_notes[0].text}"</p>
                </div>
              )}
              {room?.wall_photos?.length > 0 && (
                <div 
                  onClick={() => setShowPhotoModal(true)}
                  className="p-1 rounded-xl bg-white/10 border border-white/20 cursor-pointer hover:scale-105 transition-all flex items-center gap-2 pr-3"
                  title="Click to view Photo Wall"
                >
                  <img src={room.wall_photos[0].url} alt="Memory" className="w-9 h-9 rounded-lg object-cover" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-white truncate max-w-[90px]">{room.wall_photos[0].caption || 'Framed'}</p>
                    <span className="text-[9px] text-sky-400">🖼️ Photo Wall</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Room Wall Extras (Sticky Notes & Wall Photos) ─────── */}
          <div className="w-full max-w-lg grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setShowNotesModal(true)}
              className="p-4 rounded-2xl bg-[#131722] hover:bg-[#1a2030] border border-white/10 transition-all flex items-center justify-between group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <StickyNote size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white">Sticky Wall</h3>
                  <p className="text-[10px] text-gray-400">{room?.sticky_notes?.length || 0} Notes</p>
                </div>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-amber-300 transition-colors">→</span>
            </button>

            <button
              onClick={() => setShowPhotoModal(true)}
              className="p-4 rounded-2xl bg-[#131722] hover:bg-[#1a2030] border border-white/10 transition-all flex items-center justify-between group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <Image size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white">Photo Wall</h3>
                  <p className="text-[10px] text-gray-400">{room?.wall_photos?.length || 0} Framed</p>
                </div>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-sky-300 transition-colors">→</span>
            </button>
          </div>

        </div>
      )}

      {/* ── Modal 1: Sticky Notes Wall ───────────────────────────── */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#131722] text-white border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <div>
                  <h3 className="text-sm font-bold">Studio Sticky Wall</h3>
                  <p className="text-[11px] text-gray-400">Sweet reminders pinned on our wall</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(!room?.sticky_notes || room.sticky_notes.length === 0) ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No love notes yet. Pin your first one below!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {room.sticky_notes.map((note) => (
                    <div 
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-400/15 via-yellow-400/10 to-amber-500/5 border border-amber-400/30 text-amber-200 relative group flex flex-col justify-between shadow-md min-h-[90px]"
                    >
                      <p className="text-xs font-medium leading-relaxed break-words">{note.text}</p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-amber-400/15 text-[9px] text-amber-400/70 font-mono">
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleDeleteStickyNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-0.5 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handlePostStickyNote} className="pt-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write a sweet reminder..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={postingNote || !newNoteText.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Send size={13} />
                <span>Pin</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Photo Frame Wall ────────────────────────────── */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#131722] text-white border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖼️</span>
                <div>
                  <h3 className="text-sm font-bold">Studio Wall Photos</h3>
                  <p className="text-[11px] text-gray-400">Framed memories hanging in our room</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(!room?.wall_photos || room.wall_photos.length === 0) ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No framed photos yet. Frame one below!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {room.wall_photos.map((photo) => (
                    <div key={photo.id} className="rounded-2xl overflow-hidden border border-white/15 bg-black/40 group relative aspect-square">
                      <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                        <p className="text-[10px] text-white font-medium truncate">{photo.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleHangPhoto} className="pt-3 border-t border-white/10 space-y-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Photo image URL..."
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400 font-mono"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Caption..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  disabled={framingPhoto || !photoUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs transition-all"
                >
                  {framingPhoto ? 'Framing...' : 'Frame Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Bitmoji Avatar ID Config ─────────────────────── */}
      {showBitmojiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#131722] text-white border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-pink-400" />
                <h3 className="text-sm font-bold">Snapchat Bitmoji Setup</h3>
              </div>
              <button 
                onClick={() => setShowBitmojiModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Enter your personal Bitmoji Avatar ID to render your real Bitmoji in all couple scenes. If left blank, romantic HD couple artwork is rendered automatically.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400">My Bitmoji Avatar ID</label>
              <input
                type="text"
                value={myBitmojiId}
                onChange={(e) => setMyBitmojiId(e.target.value)}
                placeholder="e.g. 12345678-aaaa-bbbb-cccc-123456789abc"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowBitmojiModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveBitmojiId}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Save & Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Wardrobe Closet & Avatar Clothes ────────────── */}
      {showWardrobeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-[#161B26] to-[#0B0E14] text-white border border-rose-500/25 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shirt size={18} className="text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Wardrobe Closet</h3>
                  <p className="text-[10px] text-gray-400">Choose outfits & clothes for your avatar</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWardrobeModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {WARDROBE_OUTFITS.map((outfit) => {
                const isEquipped = selectedOutfit === outfit.id;
                return (
                  <button
                    key={outfit.id}
                    type="button"
                    onClick={() => handleSelectOutfit(outfit.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between relative group ${
                      isEquipped 
                        ? 'bg-rose-500/15 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50' 
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${outfit.previewColor} border border-white/20 flex items-center justify-center text-lg shadow-md`}>
                          {outfit.emoji}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isEquipped ? 'text-rose-200' : 'text-white'}`}>
                            {outfit.name}
                          </p>
                          <span className="text-[10px] text-gray-400 font-semibold">{outfit.category}</span>
                        </div>
                      </div>
                      {isEquipped && (
                        <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                      {outfit.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-rose-300/80">
                ✨ Syncs clothes instantly to partner's screen
              </span>
              <button
                type="button"
                onClick={() => setShowWardrobeModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

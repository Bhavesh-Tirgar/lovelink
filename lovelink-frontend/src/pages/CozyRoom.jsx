import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, RefreshCw, 
  Shirt, Heart, StickyNote, Image, Sparkles
} from 'lucide-react';
import useWebSocket from '../hooks/useWebSocket';
import { getWsBaseUrl } from '../utils/wsUrl';
import Real3DAvatarStage from '../components/Real3DAvatarStage';
import AvatarCreatorModal from '../components/AvatarCreatorModal';
import AvatarWardrobeModal from '../components/AvatarWardrobeModal';
import CoupleInteractionsModal from '../components/CoupleInteractionsModal';

export default function CozyRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  
  // Interactive Modals
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [showInteractionsModal, setShowInteractionsModal] = useState(false);
  const [show3DCreatorModal, setShow3DCreatorModal] = useState(false);

  // Avatar & Couple State
  const [myAvatar, setMyAvatar] = useState({
    avatar_url: '/assets/avatars/snap_me_hd.png',
    glb_url: null
  });
  const [partnerAvatar, setPartnerAvatar] = useState({
    avatar_url: '/assets/avatars/snap_partner_hd.png',
    glb_url: null
  });

  // Sticky Note Input
  const [newNoteText, setNewNoteText] = useState('');
  const [postingNote, setPostingNote] = useState(false);

  // Photo Frame Input
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [framingPhoto, setFramingPhoto] = useState(false);

  const myUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.id || null;
    } catch {
      return null;
    }
  })();

  const coupleId = room?.couple_id || localStorage.getItem('couple_id') || null;
  const WS_URL = getWsBaseUrl();

  // WebSocket live synchronizer
  const handleWSMessage = useCallback((data) => {
    if (!data) return;

    if (data.type === 'room_update') {
      if (data.action === 'avatar_customized') {
        const isMe = String(data.user_id) === String(myUserId);
        if (isMe) {
          setMyAvatar(data.avatar);
        } else {
          setPartnerAvatar(data.avatar);
          confetti({ particleCount: 35, spread: 55, origin: { y: 0.6 } });
          toast.success(data.message || 'Your partner updated their 3D Avatar! ✨');
        }
      } else if (data.action === 'couple_interaction') {
        confetti({
          particleCount: 50,
          spread: 75,
          origin: { y: 0.5 },
          colors: ['#F43F5E', '#EC4899', '#A855F7', '#FBBF24']
        });
        toast.success(data.message);
      }
    }
  }, [myUserId]);

  useWebSocket(
    coupleId ? `${WS_URL}/ws/chat/${coupleId}` : null,
    handleWSMessage
  );

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/room');
      setRoom(res.data);

      if (res.data.my_avatar) {
        setMyAvatar(res.data.my_avatar);
      }
      if (res.data.partner_avatar) {
        setPartnerAvatar(res.data.partner_avatar);
      }
    } catch (err) {
      console.error('Failed to load room:', err);
      toast.error('Could not load 3D studio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

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
      toast.success('Memory saved! 🖼️');
    } catch {
      toast.error('Could not save photo');
    } finally {
      setFramingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 pb-20 pt-4 px-3 sm:px-6 select-none flex flex-col items-center">
      
      {/* 1. CLEAN APP HEADER */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3 z-30">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-bold shadow-md"
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center justify-center gap-1.5">
            <span>3D Avatar Studio</span>
            <span className="text-amber-400">✨</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Interactive 3D Characters • 360° View</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShow3DCreatorModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all"
            title="Create 3D Avatar from Selfie"
          >
            <Sparkles size={13} className="text-yellow-300" />
            <span className="hidden sm:inline">3D Selfie</span>
          </button>

          <button
            onClick={() => setShowWardrobeModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all"
            title="Wardrobe"
          >
            <Shirt size={14} />
            <span className="hidden sm:inline">Wardrobe</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="animate-spin text-amber-400" size={32} />
          <p className="text-xs text-slate-400 font-semibold">Initializing 3D WebGL Studio...</p>
        </div>
      ) : (
        <div className="w-full max-w-xl flex flex-col items-center space-y-4">
          
          {/* 2. REAL THREE.JS 3D AVATAR STAGE (NO 2D IMAGES, NO ROOM CLUTTER) */}
          <div className="w-full flex justify-center animate-fadeIn">
            <Real3DAvatarStage
              myGlbUrl={myAvatar?.glb_url}
              partnerGlbUrl={partnerAvatar?.glb_url}
              myName={room?.my_name}
              partnerName={room?.partner_name}
              onOpenCreator={() => setShow3DCreatorModal(true)}
            />
          </div>

          {/* 3. UTILITY ACTION HUBS (LOVE NOTES, MEMORIES, COUPLE ACTIONS) */}
          <div className="grid grid-cols-3 gap-2.5 w-full pt-1">
            <button
              onClick={() => setShowInteractionsModal(true)}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center text-center group active:scale-95"
            >
              <Heart size={20} className="text-rose-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white">Couple Actions</span>
              <span className="text-[10px] text-slate-400">Hug, Kiss, Dance</span>
            </button>

            <button
              onClick={() => setShowNotesModal(true)}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center text-center group active:scale-95"
            >
              <StickyNote size={20} className="text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white">Love Notes</span>
              <span className="text-[10px] text-slate-400">{room?.sticky_notes?.length || 0} Notes</span>
            </button>

            <button
              onClick={() => setShowPhotoModal(true)}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col items-center text-center group active:scale-95"
            >
              <Image size={20} className="text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white">Memories</span>
              <span className="text-[10px] text-slate-400">{room?.wall_photos?.length || 0} Photos</span>
            </button>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: LOVE NOTES MODAL */}
      {/* ============================================================== */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181c24] text-white border border-white/15 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Love Notes</h3>
                  <p className="text-[11px] text-slate-400">Sweet reminders & inside jokes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(!room?.sticky_notes || room.sticky_notes.length === 0) ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No love notes yet. Leave a sweet one below!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {room.sticky_notes.map((note) => (
                    <div 
                      key={note.id}
                      className="p-3 rounded-xl bg-amber-200/90 text-stone-900 border border-amber-300 flex flex-col justify-between min-h-[90px] shadow"
                    >
                      <p className="text-xs font-semibold break-words">{note.text}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[9px] opacity-75">
                        <span>{note.author}</span>
                        <button
                          onClick={() => handleDeleteStickyNote(note.id)}
                          className="text-stone-700 hover:text-red-700 font-bold"
                        >
                          ✕
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
                placeholder="Write a sweet love note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                maxLength={90}
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={postingNote || !newNoteText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 font-bold text-xs rounded-xl hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: MEMORIES / PHOTO MODAL */}
      {/* ============================================================== */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181c24] text-white border border-white/15 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖼️</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Our Memories</h3>
                  <p className="text-[11px] text-slate-400">Captured couple photos & polaroids</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(!room?.wall_photos || room.wall_photos.length === 0) ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No memories saved yet. Add a photo link below!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {room.wall_photos.map((p, idx) => (
                    <div key={p.id || idx} className="bg-white p-1.5 pb-2 rounded-xl shadow-md border border-stone-200 text-stone-900">
                      <img src={p.url} alt={p.caption} className="w-full h-28 object-cover rounded-lg" />
                      <p className="text-[10px] font-bold text-center mt-1 truncate">{p.caption || 'Us'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleHangPhoto} className="pt-3 border-t border-white/10 space-y-2">
              <input
                type="url"
                placeholder="Image URL (e.g. https://...)"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Caption (e.g. Paris Trip)"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={framingPhoto || !photoUrl.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs rounded-xl hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: WARDROBE CUSTOMIZER */}
      {/* ============================================================== */}
      <AvatarWardrobeModal
        isOpen={showWardrobeModal}
        onClose={() => setShowWardrobeModal(false)}
        currentAvatar={myAvatar}
        onAvatarSaved={(saved) => {
          setMyAvatar(saved);
        }}
      />

      {/* ============================================================== */}
      {/* MODAL 4: COUPLE INTERACTIONS */}
      {/* ============================================================== */}
      <CoupleInteractionsModal
        isOpen={showInteractionsModal}
        onClose={() => setShowInteractionsModal(false)}
        partnerName={room?.partner_name}
        onTriggerAction={(action) => {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F43F5E', '#EC4899', '#A855F7', '#FBBF24']
          });
          toast.success(`Triggered ${action} with ${room?.partner_name || 'your partner'}! 💕`);
        }}
      />

      {/* ============================================================== */}
      {/* MODAL 5: 3D CREATOR (READY PLAYER ME SELFIE-TO-3D) */}
      {/* ============================================================== */}
      <AvatarCreatorModal
        isOpen={show3DCreatorModal}
        onClose={() => setShow3DCreatorModal(false)}
        onAvatarSaved={(saved) => {
          setMyAvatar(saved);
        }}
      />

    </div>
  );
}

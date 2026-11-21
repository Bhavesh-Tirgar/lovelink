import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, Heart, Zap, Lock, Unlock, Flame, 
  Send, RefreshCw, Calendar, 
  CheckCircle2, Bell, Compass, Gift, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api';
import useWebSocket from 'react-use-websocket';

const PRESET_STATUSES = [
  "Thinking of you 💭",
  "Need cuddles 🤗",
  "Miss your smile ❤️",
  "Coffee break ☕",
  "Exhausted 🥱",
  "Hard at work 💻",
  "Feeling romantic 🍷",
  "Listening to our songs 🎧"
];

const EMOJI_REACTIONS = ["❤️", "🥺", "🔥", "💋", "😂", "✨"];

const DATE_CATEGORIES = [
  "All",
  "Cozy At Home",
  "Midnight Spontaneous",
  "Foodie & Culinary",
  "Romantic Luxury",
  "Playful & Creative"
];

// Web Audio synthesizer for tactile sound chimes
const playChime = (type = 'chime') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'pulse') {
      // Harmonic uplifting chord
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'unlock') {
      // Sparkle chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // AudioContext blocked or unsupported, silently ignore
  }
};

export default function Spark() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spark'); // 'spark', 'scratch', 'capsule', 'archive'

  // Answer state
  const [myAnswerText, setMyAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Love Battery drawer & pulse
  const [showBatteryModal, setShowBatteryModal] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState(85);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pulsing, setPulsing] = useState(false);

  // Comments & reactions
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Scratch-off state
  const [scratchCategory, setScratchCategory] = useState('All');
  const [scratchIdea, setScratchIdea] = useState(null);
  const [scratchLoading, setScratchLoading] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  // Time capsule state
  const [showCapsuleModal, setShowCapsuleModal] = useState(false);
  const [capsuleTitle, setCapsuleTitle] = useState('');
  const [capsuleMessage, setCapsuleMessage] = useState('');
  const [capsuleDate, setCapsuleDate] = useState('');
  const [capsuleHint, setCapsuleHint] = useState('');
  const [submittingCapsule, setSubmittingCapsule] = useState(false);
  const [activeCapsuleOpen, setActiveCapsuleOpen] = useState(null);

  // Archive state
  const [archive, setArchive] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Initial load
  const loadSparkData = useCallback(async () => {
    try {
      const res = await api.get('/spark');
      setData(res.data);
      if (res.data?.me?.battery) {
        setSelectedBattery(res.data.me.battery);
        setSelectedStatus(res.data.me.status || '');
      }
    } catch {
      toast.error('Unable to load Spark. Please make sure you are linked!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSparkData();
  }, [loadSparkData]);

  // WebSocket for real-time couple events
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = api.defaults.baseURL
    ? api.defaults.baseURL.replace(/^https?:\/\//, '')
    : window.location.host;
  const wsUrl = token ? `${wsProtocol}//${wsHost}/ws/chat?token=${token}` : null;

  useWebSocket(wsUrl, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    onMessage: (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'spark_love_pulse') {
          playChime('pulse');
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.5 },
            colors: ['#F43F5E', '#EC4899', '#FB7185']
          });
          toast(`⚡ ${msg.from_name || 'Partner'} sent you a Love Pulse (+15%)!`, {
            icon: '💖',
            style: { background: '#1c0a1a', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }
          });
          loadSparkData();
        } else if (msg.type === 'spark_unlocked') {
          playChime('unlock');
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#F43F5E', '#FBBF24', '#EC4899']
          });
          toast.success("Both answered today's Spark! The secret is revealed! ✨");
          loadSparkData();
        } else if (msg.type === 'spark_partner_answered') {
          toast(`${msg.by_name || 'Partner'} just answered today's Spark! Answer to reveal! 💌`, {
            icon: '🔒'
          });
          loadSparkData();
        } else if (msg.type === 'spark_battery_updated') {
          loadSparkData();
        } else if (msg.type === 'spark_nudge') {
          toast(`🔔 ${msg.from_name || 'Partner'} is nudging you to answer today's Spark!`, {
            icon: '💌'
          });
        } else if (msg.type === 'spark_reaction' || msg.type === 'spark_comment') {
          loadSparkData();
        } else if (msg.type === 'spark_date_accepted') {
          toast.success('New Date Night Mission Accepted! 🥂');
          loadSparkData();
        }
      } catch {
        // Ignore malformed WS payloads
      }
    }
  });

  // Submit Answer
  const handleAnswerSubmit = async () => {
    if (!myAnswerText.trim()) {
      toast.error('Please write your answer first!');
      return;
    }
    setSubmittingAnswer(true);
    try {
      const res = await api.post('/spark/answer', { answer: myAnswerText.trim() });
      playChime('chime');
      if (res.data.both_answered) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success("Both answered! Unlocked! 🎉");
      } else {
        toast.success("Answer sealed! Waiting for partner to reveal 🔒");
      }
      setMyAnswerText('');
      loadSparkData();
    } catch {
      toast.error('Failed to submit answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Love Pulse Action
  const handleSendLovePulse = async () => {
    if (pulsing) return;
    setPulsing(true);
    playChime('pulse');
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#F43F5E', '#FB7185', '#FDA4AF']
    });

    try {
      await api.post('/spark/pulse');
      toast.success(`Love Pulse sent to ${data?.partner?.name || 'Partner'}! ⚡`, {
        icon: '💖'
      });
      loadSparkData();
    } catch {
      toast.error('Failed to send love pulse.');
    } finally {
      setTimeout(() => setPulsing(false), 800);
    }
  };

  // Nudge Partner Action
  const handleNudgePartner = async () => {
    try {
      await api.post('/spark/nudge');
      toast.success(`Nudge sent to ${data?.partner?.name || 'Partner'}! 🔔`);
    } catch {
      toast.error('Failed to send nudge.');
    }
  };

  // Update Battery Level & Status
  const handleSaveBattery = async () => {
    try {
      await api.post('/spark/battery', {
        battery: selectedBattery,
        status: selectedStatus.trim() || 'Thinking of you 💭'
      });
      toast.success('Love Battery updated! 🔋');
      setShowBatteryModal(false);
      loadSparkData();
    } catch {
      toast.error('Failed to update battery.');
    }
  };

  // Emoji Reaction
  const handleReaction = async (emoji) => {
    playChime('chime');
    try {
      await api.post('/spark/react', { emoji });
      loadSparkData();
    } catch {
      toast.error('Failed to send reaction.');
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post('/spark/comment', { text: commentText.trim() });
      setCommentText('');
      loadSparkData();
    } catch {
      toast.error('Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Scratch-off Logic
  const fetchScratchDate = useCallback(async (cat = scratchCategory) => {
    setScratchLoading(true);
    setIsScratched(false);
    try {
      const res = await api.get('/spark/scratch-date', { params: { category: cat } });
      setScratchIdea(res.data);
    } catch {
      toast.error('Failed to load date idea.');
    } finally {
      setScratchLoading(false);
    }
  }, [scratchCategory]);

  useEffect(() => {
    if (activeTab === 'scratch' && !scratchIdea) {
      fetchScratchDate();
    }
  }, [activeTab, scratchIdea, fetchScratchDate]);

  // Setup HTML5 Scratch Canvas
  useEffect(() => {
    if (activeTab !== 'scratch' || !scratchIdea || isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Draw luxury metallic foil
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.3, '#fbbf24');
    grad.addColorStop(0.5, '#d97706');
    grad.addColorStop(0.8, '#f59e0b');
    grad.addColorStop(1, '#b45309');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative texture & pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < width; i += 24) {
      for (let j = 0; j < height; j += 24) {
        ctx.fillRect(i, j, 12, 12);
      }
    }

    // Centered foil text
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch to Reveal Date ✨', width / 2, height / 2 - 8);
    ctx.font = '12px sans-serif';
    ctx.fillText('Drag your finger or cursor here', width / 2, height / 2 + 14);

    const checkScratchPercentage = () => {
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        let clearCount = 0;
        const total = imgData.data.length / 4;
        for (let i = 3; i < imgData.data.length; i += 16) {
          if (imgData.data[i] === 0) clearCount += 4;
        }
        if (clearCount / total > 0.35) {
          setIsScratched(true);
          playChime('unlock');
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#FBBF24', '#F43F5E']
          });
        }
      } catch {
        // Cross-origin image data fallback
      }
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    };

    const handleStart = (e) => {
      isDrawing.current = true;
      const pos = getPos(e);
      scratch(pos.x, pos.y);
    };

    const handleMove = (e) => {
      if (!isDrawing.current) return;
      const pos = getPos(e);
      scratch(pos.x, pos.y);
      checkScratchPercentage();
    };

    const handleEnd = () => {
      isDrawing.current = false;
      checkScratchPercentage();
    };

    canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [activeTab, scratchIdea, isScratched]);

  // Accept Date Idea
  const handleAcceptDate = async () => {
    if (!scratchIdea) return;
    try {
      await api.post('/spark/accept-date', { date_idea: scratchIdea });
      toast.success('Date Night Mission Accepted! Have fun! 💖');
      loadSparkData();
    } catch {
      toast.error('Failed to accept date idea.');
    }
  };

  // Complete Date Idea
  const handleCompleteDate = async () => {
    try {
      await api.post('/spark/complete-date');
      toast.success('Date Mission completed! Cherish the memory! 🎉');
      loadSparkData();
    } catch {
      toast.error('Failed to complete date.');
    }
  };

  // Create Time Capsule
  const handleCreateCapsule = async () => {
    if (!capsuleTitle.trim() || !capsuleMessage.trim() || !capsuleDate) {
      toast.error('Please enter title, message, and an unlock date!');
      return;
    }
    setSubmittingCapsule(true);
    try {
      await api.post('/spark/capsule', {
        title: capsuleTitle.trim(),
        message: capsuleMessage.trim(),
        unlock_date: capsuleDate,
        hint: capsuleHint.trim() || 'Sealed with love 💌'
      });
      playChime('chime');
      toast.success('Love Letter sealed in Time Capsule! 💌');
      setCapsuleTitle('');
      setCapsuleMessage('');
      setCapsuleDate('');
      setCapsuleHint('');
      setShowCapsuleModal(false);
      loadSparkData();
    } catch {
      toast.error('Failed to seal time capsule.');
    } finally {
      setSubmittingCapsule(false);
    }
  };

  // Open Time Capsule
  const handleOpenCapsule = async (capId) => {
    try {
      await api.post(`/spark/capsule/${capId}/open`);
      playChime('unlock');
      loadSparkData();
    } catch {
      toast.error('Failed to open capsule.');
    }
  };

  // Fetch Archive
  const loadArchive = async () => {
    setArchiveLoading(true);
    try {
      const res = await api.get('/spark/archive');
      setArchive(res.data);
    } catch {
      toast.error('Failed to load archive.');
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'archive') {
      loadArchive();
    }
  }, [activeTab]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080c]">
        <div className="text-center animate-pulse">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            ✨
          </div>
          <p className="text-gray-400 font-semibold tracking-wider text-xs uppercase">Lighting Daily Spark...</p>
        </div>
      </div>
    );
  }

  const { me, partner, question, streak, is_revealed, active_date_idea, time_capsules, reactions, comments } = data;

  return (
    <div className="min-h-screen pb-32 pt-4 sm:pt-6 px-4 sm:px-6 md:px-10 max-w-4xl mx-auto text-gray-100 animate-in fade-in duration-500 select-none">
      
      {/* ── Top Bar & Streak Badge ─────────────────────────────────── */}
      <header className="flex items-center justify-between py-3 mb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Sparkles size={20} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Daily Spark</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                Couples Sanctuary
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              With {partner?.name || 'Partner'} • Deep Daily Connection
            </p>
          </div>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
          <Flame size={16} className="text-amber-400 fill-amber-400 animate-pulse" />
          <span className="text-xs font-black text-amber-300 font-mono tracking-wide">
            {streak} DAY STREAK
          </span>
        </div>
      </header>

      {/* ── Active Date Mission Banner (if accepted) ──────────────── */}
      {active_date_idea && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#0d0f17] to-rose-950/40 border border-amber-500/30 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{active_date_idea.emoji || '🥂'}</span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Active Date Night Mission
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {active_date_idea.title}
              </h4>
              <p className="text-[11px] text-gray-400 truncate">
                Accepted by {active_date_idea.accepted_by} • {active_date_idea.vibe}
              </p>
            </div>
          </div>
          <button
            onClick={handleCompleteDate}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
          >
            <CheckCircle2 size={14} />
            <span>Complete ✓</span>
          </button>
        </div>
      )}

      {/* ── Dual Love Battery Station ──────────────────────────────── */}
      <section className="mb-8 p-5 sm:p-6 rounded-3xl bg-[#0d0f17]/90 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Live Love Battery & Pulse
            </h2>
          </div>
          <button
            onClick={() => setShowBatteryModal(true)}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
          >
            Set My Battery ⚙️
          </button>
        </div>

        {/* Meters Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* User's Battery Meter */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>You</span>
                <span className="text-[10px] text-gray-400 font-normal">({me?.name})</span>
              </span>
              <span className="text-xs font-mono font-bold text-rose-400">
                {me?.battery || 85}%
              </span>
            </div>

            {/* Glowing Charge Bar */}
            <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10 mb-2.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-700 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                style={{ width: `${me?.battery || 85}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="truncate max-w-[180px]">Status: {me?.status || 'Thinking of you 💭'}</span>
              <button 
                onClick={() => setShowBatteryModal(true)}
                className="text-[10px] text-rose-400 hover:underline"
              >
                Change
              </button>
            </div>
          </div>

          {/* Partner's Battery Meter */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{partner?.name || 'Partner'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <span className="text-xs font-mono font-bold text-pink-400">
                {partner?.battery || 85}%
              </span>
            </div>

            {/* Glowing Charge Bar */}
            <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10 mb-2.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-400 transition-all duration-700 shadow-[0_0_12px_rgba(236,72,153,0.6)]"
                style={{ width: `${partner?.battery || 85}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="truncate max-w-[200px]">Status: {partner?.status || 'Thinking of you 💭'}</span>
              <span className="text-[10px] font-mono text-gray-500">Live</span>
            </div>
          </div>
        </div>

        {/* Tactile Send Love Pulse Button */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-center">
          <button
            onClick={handleSendLovePulse}
            disabled={pulsing}
            className={`w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:shadow-[0_0_35px_rgba(244,63,94,0.6)] transition-all duration-300 flex items-center justify-center gap-2 group ${
              pulsing ? 'scale-95 brightness-125' : 'hover:scale-[1.02]'
            }`}
          >
            <Zap size={18} className={`text-amber-300 fill-amber-300 group-hover:rotate-12 transition-transform ${pulsing ? 'animate-bounce' : ''}`} />
            <span>Send Love Pulse to {partner?.name || 'Partner'} (+15%)</span>
            <Heart size={16} className="text-white fill-white group-hover:scale-125 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── Feature Navigation Tabs ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'spark', label: "✨ Today's Spark", icon: Sparkles },
          { id: 'scratch', label: '🎲 Date Scratch-Off', icon: Compass },
          { id: 'capsule', label: '💌 Time Capsule', icon: Gift },
          { id: 'archive', label: '📖 Connection Vault', icon: Calendar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-white border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TODAY'S BLIND-REVEAL SPARK                             */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'spark' && (
        <div className="space-y-6">

          {/* Question Banner Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-950/30 via-[#0d0f17] to-purple-950/30 border border-white/[0.1] shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                ✨ {question?.category || 'Intimacy & Connection'}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Daily Question #{question?.id || 1}
              </span>
            </div>

            <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-white leading-relaxed tracking-tight my-2">
              "{question?.text}"
            </h2>

            <p className="text-xs text-gray-400 mt-2">
              {is_revealed 
                ? "✨ Both of you answered! Read and react to what you each wrote below." 
                : "🔒 Blind Reveal: Your partner's answer remains hidden until you also write yours."}
            </p>
          </div>

          {/* User's Answer Box (Editable if not submitted) */}
          {!me?.has_answered ? (
            <div className="p-6 rounded-3xl bg-[#0d0f17] border border-white/[0.08] shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <span>Your Secret Answer</span>
                  <span className="text-[10px] text-rose-400 font-normal">(Hidden from {partner?.name} until they answer)</span>
                </h3>
                <span className="text-[10px] font-mono text-gray-500">
                  {myAnswerText.length}/2000
                </span>
              </div>

              <textarea
                value={myAnswerText}
                onChange={(e) => setMyAnswerText(e.target.value)}
                placeholder="Write from the heart... What are you honestly thinking or feeling?"
                rows={4}
                className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500/60 transition-colors placeholder:text-gray-600 resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Lock size={12} className="text-rose-400" />
                  <span>Sealed until both partners answer</span>
                </p>

                <button
                  onClick={handleAnswerSubmit}
                  disabled={submittingAnswer || !myAnswerText.trim()}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{submittingAnswer ? 'Sealing...' : 'Submit Answer 💌'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* User's Submitted Answer Card */
            <div className="p-6 rounded-3xl bg-[#0d0f17] border border-white/[0.08] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>Your Answer</span>
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {me?.answered_at ? new Date(me.answered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Submitted'}
                </span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                {me?.answer}
              </p>
            </div>
          )}

          {/* Partner's Answer Card: Blind Frosted Glass or Fully Revealed */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#0d0f17] border border-white/[0.08] shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span>{partner?.name || 'Partner'}'s Answer</span>
                {is_revealed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Revealed ✨
                  </span>
                )}
              </span>

              {is_revealed && partner?.answered_at && (
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(partner.answered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Blind Locked State */}
            {!is_revealed ? (
              <div className="py-8 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-rose-500/30 backdrop-blur-md space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <Lock size={22} className="animate-pulse" />
                </div>
                
                <h4 className="text-sm font-bold text-white">
                  {partner?.has_answered 
                    ? `${partner?.name || 'Partner'} has answered! Submit yours to reveal.`
                    : `Waiting for ${partner?.name || 'Partner'} to answer...`}
                </h4>

                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {me?.has_answered 
                    ? `You've submitted your secret answer! Give ${partner?.name} a nudge so they don't leave you hanging.`
                    : `Answers are locked in a double-blind vault until both of you write what you think.`}
                </p>

                {me?.has_answered && !partner?.has_answered && (
                  <button
                    onClick={handleNudgePartner}
                    className="mt-2 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <Bell size={14} className="text-amber-400" />
                    <span>Nudge {partner?.name} 🔔</span>
                  </button>
                )}
              </div>
            ) : (
              /* Revealed State */
              <div className="space-y-4">
                <p className="text-sm text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                  {partner?.answer}
                </p>

                {/* Emoji Reaction Bar */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 mr-1">React:</span>
                    {EMOJI_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-transform hover:scale-125 ${
                          reactions?.[me?.id] === emoji 
                            ? 'bg-rose-500/30 border border-rose-500/50 scale-110 shadow-[0_0_10px_rgba(244,63,94,0.4)]' 
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {reactions?.[partner?.id] && (
                    <div className="text-xs text-rose-300 font-medium flex items-center gap-1">
                      <span>{partner?.name} reacted:</span>
                      <span className="text-base">{reactions[partner.id]}</span>
                    </div>
                  )}
                </div>

                {/* Couple Discussion Thread */}
                <div className="pt-4 border-t border-white/[0.06] space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Discussion & Laughs
                  </h4>

                  {comments && comments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                            <span className="font-bold text-gray-300">{c.user_name}</span>
                            <span>{c.created_at}</span>
                          </div>
                          <p className="text-gray-200">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No notes yet. Leave a sweet reply below!</p>
                  )}

                  <form onSubmit={handleAddComment} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={`Reply to ${partner?.name}...`}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SCRATCH-OFF DATE NIGHT GENERATOR                      */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'scratch' && (
        <div className="space-y-6">
          <div className="text-center max-w-md mx-auto space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-1.5">
              <span>Scratch-Off Date Night</span>
              <span className="text-amber-400">🎲</span>
            </h3>
            <p className="text-xs text-gray-400">
              Rub your finger or cursor to dissolve the golden foil and unlock tonight's surprise date adventure!
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {DATE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setScratchCategory(cat);
                  fetchScratchDate(cat);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  scratchCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scratch Card Canvas Container */}
          <div className="max-w-md mx-auto p-1 rounded-3xl bg-gradient-to-br from-amber-500/30 via-rose-500/20 to-purple-500/30 shadow-2xl relative">
            <div className="relative rounded-[22px] bg-[#0d0f17] overflow-hidden min-h-[300px] flex flex-col justify-between p-6">
              
              {/* Underlying Secret Date Content */}
              {scratchIdea && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {scratchIdea.category}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                      {scratchIdea.budget}
                    </span>
                  </div>

                  <div className="text-center py-2 space-y-2">
                    <span className="text-4xl">{scratchIdea.emoji}</span>
                    <h4 className="text-lg font-extrabold text-white">
                      {scratchIdea.title}
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {scratchIdea.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-around py-2 rounded-xl bg-black/40 border border-white/5 text-[11px] text-gray-400">
                    <span>⏳ {scratchIdea.prep_time}</span>
                    <span>•</span>
                    <span>🎭 {scratchIdea.vibe}</span>
                  </div>

                  {isScratched && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={handleAcceptDate}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all"
                      >
                        Accept Date Mission 💖
                      </button>
                      <button
                        onClick={() => fetchScratchDate()}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
                        title="Scratch Another"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Holographic Scratch Overlay Canvas */}
              {!isScratched && (
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={320}
                  className="absolute inset-0 w-full h-full cursor-crosshair rounded-[22px] touch-none z-10"
                />
              )}

              {scratchLoading && (
                <div className="absolute inset-0 bg-[#0d0f17] flex items-center justify-center z-20">
                  <RefreshCw size={24} className="text-amber-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* TAB 3: DIGITAL LOVE TIME CAPSULE                              */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'capsule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Love Letters & Time Capsules</span>
                <span className="text-rose-400">💌</span>
              </h3>
              <p className="text-xs text-gray-400">
                Seal heartfelt letters that remain locked until a future anniversary or milestone.
              </p>
            </div>
            <button
              onClick={() => setShowCapsuleModal(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/25 flex items-center gap-1.5"
            >
              <span>+ Seal Letter</span>
            </button>
          </div>

          {/* Capsules List */}
          {time_capsules && time_capsules.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {time_capsules.map((cap) => {
                const isLocked = cap.is_locked;
                return (
                  <div
                    key={cap.id}
                    onClick={() => {
                      if (!isLocked) {
                        if (!cap.is_opened) handleOpenCapsule(cap.id);
                        setActiveCapsuleOpen(cap);
                      } else {
                        toast(`🔒 Locked until ${cap.unlock_date}! No peeking! 😉`, { icon: '⏳' });
                      }
                    }}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isLocked
                        ? 'bg-[#0d0f17]/90 border-white/[0.08] hover:border-amber-500/40'
                        : 'bg-gradient-to-br from-rose-950/30 to-[#0d0f17] border-rose-500/30 hover:border-rose-500/60 shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Lock size={15} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                            <Unlock size={15} />
                          </div>
                        )}
                        <span className="text-xs font-bold text-white group-hover:text-rose-200 transition-colors">
                          {cap.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">
                        {isLocked ? `Unlocks ${cap.unlock_date}` : 'Opened'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2">
                      {isLocked ? `Hint: "${cap.hint || 'Sealed with love 💌'}"` : cap.message}
                    </p>

                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-gray-500 font-mono">
                      <span>Written by {cap.author_name}</span>
                      <span className="text-rose-400 font-bold group-hover:translate-x-1 transition-transform">
                        {isLocked ? 'Locked 🔒' : 'Read Letter →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center rounded-3xl bg-[#0d0f17] border border-white/[0.06] space-y-3">
              <span className="text-3xl">💌</span>
              <h4 className="text-sm font-bold text-white">No Sealed Letters Yet</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Seal a secret love letter to be opened on your next anniversary, birthday, or whenever your partner needs a warm hug.
              </p>
              <button
                onClick={() => setShowCapsuleModal(true)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                Seal Your First Letter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* TAB 4: CONNECTION VAULT (ARCHIVE)                            */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                The Couple Connection Vault
              </h3>
              <p className="text-xs text-gray-400">
                Every revealed spark question and heartfelt answer you two have shared.
              </p>
            </div>
          </div>

          {archiveLoading ? (
            <div className="py-12 text-center">
              <RefreshCw size={24} className="text-rose-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Opening Memory Vault...</p>
            </div>
          ) : archive && archive.length > 0 ? (
            <div className="space-y-4">
              {archive.map((entry) => (
                <div key={entry.id} className="p-5 sm:p-6 rounded-3xl bg-[#0d0f17] border border-white/[0.08] shadow-lg space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-bold border border-rose-500/20 text-[10px]">
                      {entry.question_category}
                    </span>
                    <span className="font-mono text-[11px]">{entry.created_at}</span>
                  </div>

                  <h4 className="text-sm sm:text-base font-extrabold text-white">
                    "{entry.question_text}"
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                        You Wrote:
                      </span>
                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {entry.my_answer}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                        {partner?.name || 'Partner'} Wrote:
                      </span>
                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {entry.partner_answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center rounded-3xl bg-[#0d0f17] border border-white/[0.06] space-y-2">
              <span className="text-3xl">📖</span>
              <h4 className="text-sm font-bold text-white">Vault is Waiting</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Once both of you answer today's Spark question, it will be immortalized here forever!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Set Love Battery & Status ───────────────────────── */}
      {showBatteryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0d0f17] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Zap size={16} className="text-amber-400" />
                <span>Update Your Love Battery</span>
              </div>
              <button
                onClick={() => setShowBatteryModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Slider Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold">Charge Percentage:</span>
                <span className="font-mono text-rose-400 font-extrabold text-sm">{selectedBattery}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={selectedBattery}
                onChange={(e) => setSelectedBattery(Number(e.target.value))}
                className="w-full accent-rose-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>Low (5%)</span>
                <span>Medium (50%)</span>
                <span>Full (100%)</span>
              </div>
            </div>

            {/* Quick Status Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">
                Quick Status Chip:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_STATUSES.map(st => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                      selectedStatus === st
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Status Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400">
                Or Type Custom Status:
              </label>
              <input
                type="text"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                placeholder="What are you feeling right now?"
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              onClick={handleSaveBattery}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all"
            >
              Save Battery State 🔋
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Seal Time Capsule Letter ───────────────────────── */}
      {showCapsuleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0d0f17] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Gift size={16} className="text-rose-400" />
                <span>Seal a Love Letter</span>
              </div>
              <button
                onClick={() => setShowCapsuleModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Letter Title / Occasion:</label>
                <input
                  type="text"
                  value={capsuleTitle}
                  onChange={(e) => setCapsuleTitle(e.target.value)}
                  placeholder="e.g. For Our 1st Anniversary or When You Miss Me"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Unlock Date:</label>
                <input
                  type="date"
                  value={capsuleDate}
                  onChange={(e) => setCapsuleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Secret Love Letter Message:</label>
                <textarea
                  value={capsuleMessage}
                  onChange={(e) => setCapsuleMessage(e.target.value)}
                  placeholder="Pour your heart out... This cannot be opened until the unlock date!"
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Visible Hint for Partner:</label>
                <input
                  type="text"
                  value={capsuleHint}
                  onChange={(e) => setCapsuleHint(e.target.value)}
                  placeholder="e.g. Grab tissues before opening this..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              onClick={handleCreateCapsule}
              disabled={submittingCapsule}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              {submittingCapsule ? 'Sealing in Vault...' : 'Wax-Seal & Lock Letter 💌'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Read Opened Capsule ────────────────────────────── */}
      {activeCapsuleOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0d0f17] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setActiveCapsuleOpen(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Sealed Letter by {activeCapsuleOpen.author_name}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {activeCapsuleOpen.title}
              </h3>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-200 leading-relaxed font-serif whitespace-pre-wrap">
                {activeCapsuleOpen.message}
              </p>
            </div>

            <p className="text-right text-[10px] font-mono text-gray-500">
              Sealed on {activeCapsuleOpen.created_at} • Unlocked {activeCapsuleOpen.unlock_date}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

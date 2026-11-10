import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import DailyQuestion from '../components/DailyQuestion';
import NotificationBell from '../components/NotificationBell';
import TimeWidget from '../components/TimeWidget';
import SnapMap from '../components/SnapMap';

const MOODS = ['😊', '😢', '😍', '😤', '😴', '🥰', '😰', '🎉'];
const MOOD_LABELS = ['Happy', 'Sad', 'In Love', 'Frustrated', 'Tired', 'Grateful', 'Anxious', 'Excited'];

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const [nudging, setNudging] = useState(false);
  const [nudgeSuccess, setNudgeSuccess] = useState(false);
  const [, setMyTime] = useState('');
  const [, setPartnerTime] = useState('');

  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [, setMyMood] = useState(null);
  const [partnerMood, setPartnerMood] = useState(null);
  const [moodSuccess, setMoodSuccess] = useState(false);
  const [savingMood, setSavingMood] = useState(false);
  const [calling, setCalling] = useState(false);
  const [, setUnreadNotes] = useState(0);
  const [nextCountdown, setNextCountdown] = useState(null);
  const [cdNow, setCdNow] = useState(Date.now());
  const [onThisDay, setOnThisDay] = useState([]);

  const [milestoneNotif, setMilestoneNotif] = useState(null);

  const sendNudge = async () => {
    if (nudging || !data?.linked) return;
    setNudging(true);
    try {
      await api.post('/dashboard/nudge');
      setNudgeSuccess(true);
      setTimeout(() => setNudgeSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to send nudge', err);
    } finally {
      setNudging(false);
    }
  };

  const fetchMoods = async () => {
    try {
      const res = await api.get('/mood/today');
      if (res.data.my_mood) {
        setSelectedEmoji(res.data.my_mood.emoji);
        setMoodNote(res.data.my_mood.note || '');
        setMyMood(res.data.my_mood);
      }
      if (res.data.partner_mood) {
        setPartnerMood(res.data.partner_mood);
      }
    } catch (err) {
      console.error('Failed to fetch moods', err);
    }
  };

  const saveMood = async () => {
    if (!selectedEmoji) return;
    setSavingMood(true);
    try {
      await api.post('/mood/checkin', { emoji: selectedEmoji, note: moodNote });
      setMoodSuccess(true);
      setTimeout(() => setMoodSuccess(false), 3000);
      setMoodNote('');
      fetchMoods();
    } catch (err) {
      console.error('Failed to save mood', err);
    } finally {
      setSavingMood(false);
    }
  };

  const startCall = async (callType = 'video') => {
    if (calling || !data?.linked) return;
    setCalling(true);
    try {
      const res = await api.post('/calls/initiate', { call_type: callType });
      navigate(`/call/${res.data.call_id}`, {
        state: {
          token: res.data.token,
          room_id: res.data.room_id,
          zego_app_id: res.data.zego_app_id,
          user_id: res.data.user_id,
          user_name: res.data.user_name,
          partner_id: res.data.partner_id,
          partner_name: res.data.partner_name,
          partner_photo: res.data.partner_photo,
          call_type: callType,
          status: 'initiated'
        }
      });
    } catch (err) {
      console.error("Failed to initiate call:", err);
    } finally {
      setCalling(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setError('');
      setLoading(true);
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
        if (res.data?.couple_id) {
          window.localStorage.setItem('couple_id', res.data.couple_id);
          const userObj = JSON.parse(window.localStorage.getItem('user') || '{}');
          if (!userObj.couple_id) {
            window.localStorage.setItem('user', JSON.stringify({ ...userObj, couple_id: res.data.couple_id }));
          }
        }
        fetchMoods();
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  useEffect(() => {
    // Check for unread milestones specifically for the banner
    api.get('/notifications')
      .then(res => {
        const unreadMilestone = res.data.find(n => n.type === 'milestone' && !n.is_read);
        if (unreadMilestone) setMilestoneNotif(unreadMilestone);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    api.get('/notes/unread-count')
      .then(res => setUnreadNotes(res.data.unread_count || 0))
      .catch(() => { });
  }, []);

  useEffect(() => {
    api.get('/countdowns')
      .then(res => {
        const upcoming = res.data
          .filter(c => new Date(c.target_date) > new Date())
          .sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
        setNextCountdown(upcoming[0] || null);
      })
      .catch(() => { });
  }, []);

  // Tick for countdown widget
  useEffect(() => {
    const id = setInterval(() => setCdNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get('/media/on-this-day')
      .then(res => setOnThisDay(res.data || []))
      .catch(() => { });
  }, []);



  const dismissMilestone = async () => {
    if (!milestoneNotif) return;
    try {
      await api.put(`/notifications/${milestoneNotif.id}/read`);
      setMilestoneNotif(null);
    } catch (err) {
      setMilestoneNotif(null);
    }
  };

  useEffect(() => {
    if (!data) return;

    const tick = () => {
      const fmt = (tz) =>
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date());

      setMyTime(fmt(data.my_user.timezone));
      if (data.partner_user) {
        setPartnerTime(fmt(data.partner_user.timezone));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
            <div className="w-full h-full bg-brand-darker rounded-full flex items-center justify-center text-2xl">💖</div>
          </div>
          <p className="text-gray-400 font-medium tracking-wide text-sm uppercase">Loading LoveLink...</p>
        </div>
      </div>
    );
  }

  const { days_together, linked } = data;

  return (
    <div className="w-full">
      {/* Sleek Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-6 pt-safe mb-2">
        <div className="flex items-center gap-3 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full" />
          <div className="relative w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
            <span className="text-lg">💑</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent tracking-tight">
            LoveLink
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {error && (
          <div className="glass-card bg-red-500/10 border-red-500/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {data && data.linked && (
          <DailyQuestion coupleId={data.couple_id} />
        )}

        {/* Row 1: Dashboard Top Fold */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Welcome User */}
          <div className="glass-card p-6 md:p-8 col-span-1 lg:col-span-2 flex flex-col justify-center min-h-[160px] group">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{data?.my_user?.name || 'there'}</span>! <span className="inline-block group-hover:animate-bounce">👋</span>
            </h1>
            <p className="text-purple-200/60 font-medium">
              Current City: <span className="text-gray-200 ml-1">{data?.my_user?.city}</span>
            </p>
          </div>

          {/* Partner Time Widget */}
          <div className="col-span-1 h-full">
            {data?.partner_user ? (
              <TimeWidget partner={data.partner_user} />
            ) : (
              <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center border-dashed border-white/20">
                <span className="text-3xl mb-3 opacity-50">💔</span>
                <p className="text-sm text-gray-400">
                  Not linked yet. Share your invite code.
                </p>
                <button onClick={() => navigate('/link')} className="mt-4 text-xs font-semibold text-pink-400 hover:text-pink-300 bg-pink-500/10 px-3 py-1.5 rounded-lg transition-colors">Link Partner</button>
              </div>
            )}
          </div>
        </section >

        {/* Quick Features Hub - All Features Visible Instantly */}
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-pink-300 flex items-center gap-2">
              <span>✨ Couple Features Hub</span>
            </h2>
            <span className="text-[11px] text-gray-400">All features at your fingertips</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { title: 'Snap Map', desc: 'Live GPS & Battery', icon: '📍', color: 'from-pink-600/30 to-rose-600/30 border-pink-500/30', path: '/map' },
              { title: 'Cozy Home', desc: 'Our Virtual Room', icon: '🏡', color: 'from-amber-600/30 to-pink-600/30 border-amber-500/30', path: '/room' },
              { title: 'Thumbkiss', desc: 'Heartbeat Touch', icon: '💋', color: 'from-purple-600/30 to-pink-600/30 border-purple-500/30', path: '/touch' },
              { title: 'Period & Care', desc: 'Cycle & Empathy Tips', icon: '🌸', color: 'from-rose-500/30 to-pink-600/30 border-rose-500/30', path: '/cycle' },
              { title: 'Couple Games', desc: 'Chess, Ludo, Uno & More', icon: '🎮', color: 'from-amber-600/30 to-orange-600/30 border-amber-500/30', path: '/games' },
              { title: 'Our Universe', desc: '3D Memory Stars', icon: '🌌', color: 'from-indigo-600/30 to-purple-600/30 border-indigo-500/30', path: '/universe' },
              { title: 'Live Chat', desc: 'Audio & Photos', icon: '💬', color: 'from-blue-600/30 to-cyan-600/30 border-blue-500/30', path: '/chat' },
              { title: 'Call Partner', desc: 'Voice & Video', icon: '📞', color: 'from-emerald-600/30 to-green-600/30 border-emerald-500/30', action: () => startCall('video') },
              { title: 'Love Notes', desc: 'Secret Letters', icon: '💌', color: 'from-rose-600/30 to-pink-600/30 border-rose-500/30', path: '/notes' },
              { title: 'Albums', desc: 'Photos & Videos', icon: '📷', color: 'from-fuchsia-600/30 to-purple-600/30 border-fuchsia-500/30', path: '/album' },
              { title: 'Watch Movies', desc: 'Sync Watch Room', icon: '🎬', color: 'from-red-600/30 to-rose-600/30 border-red-500/30', path: '/movies' },
              { title: 'Doodle Board', desc: 'Draw Together', icon: '🎨', color: 'from-teal-600/30 to-cyan-600/30 border-teal-500/30', path: '/doodle' },
              { title: 'Coupons', desc: 'Romantic Passes', icon: '🎫', color: 'from-yellow-600/30 to-amber-600/30 border-yellow-500/30', path: '/coupons' },
              { title: 'Countdowns', desc: 'Days to Next Date', icon: '⏳', color: 'from-violet-600/30 to-purple-600/30 border-violet-500/30', path: '/countdowns' }
            ].map(item => (
              <button
                key={item.title}
                onClick={() => item.action ? item.action() : navigate(item.path)}
                className={`p-3.5 rounded-2xl bg-gradient-to-br ${item.color} border text-left flex flex-col justify-between group hover:scale-[1.03] transition-all shadow-lg hover:shadow-pink-500/10`}
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{item.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-pink-200 transition-colors">{item.title}</h4>
                  <p className="text-[10px] text-gray-300 leading-tight mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Real-time Snap Map (Live Location, Avatars, Distance, Battery) */}
        {data && data.linked && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <span>📍 Live Couple Snap Map</span>
              </h3>
              <button
                onClick={() => navigate('/map')}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
              >
                <span>Fullscreen Map</span>
                <span>→</span>
              </button>
            </div>
            <SnapMap partner={data.partner_user} coupleId={data.couple_id} />
          </section>
        )}

        {/* Row 2: Mood Check-in */}
        <section className="glass-card p-6 md:p-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💭</span> How are you feeling today?
          </h2>

          <div className="flex flex-wrap gap-2 md:gap-3 mb-6">
            {MOODS.map((emoji, idx) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`text-3xl p-3 md:p-4 rounded-2xl transition-all duration-300 ${selectedEmoji === emoji
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.5),0_8px_16px_rgba(0,0,0,0.2)] scale-110'
                  : 'bg-white/5 hover:bg-white/10 hover:scale-105 border border-white/5'
                  }`}
                title={MOOD_LABELS[idx]}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Add a little note about your mood..."
              className="glass-input flex-1"
            />
            <button
              onClick={saveMood}
              disabled={!selectedEmoji || savingMood}
              className="btn-primary sm:w-auto"
            >
              {savingMood ? 'Saving...' : '💾 Save Mood'}
            </button>
          </div>

          {moodSuccess && (
            <p className="mt-3 text-sm text-green-400 animate-in slide-in-from-top-2">
              Current mood updated! ✨
            </p>
          )}

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-purple-300/70 mb-3">Partner's mood</h3>
            {partnerMood ? (
              <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 flex items-center gap-4 transition-all hover:bg-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-4xl drop-shadow-lg">{partnerMood.emoji}</span>
                <div>
                  <p className="text-gray-200 font-medium">
                    {data?.partner_user?.name || 'Partner'} is feeling <span className="text-white font-bold">{MOOD_LABELS[MOODS.indexOf(partnerMood.emoji)] || 'something'}</span>
                  </p>
                  {partnerMood.note && (
                    <p className="text-gray-400 text-sm mt-1">{partnerMood.note}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                <p className="text-sm text-gray-500 italic">Partner hasn't shared their mood yet today</p>
              </div>
            )}
          </div>
        </section >

        {/* Row 3: Days together + Partner status */}
        < section className="grid gap-6 md:grid-cols-2" >
          <div className="glass-card p-8 bg-gradient-to-br from-purple-900/40 via-fuchsia-900/30 to-pink-900/40 border-pink-500/20 overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <h2 className="text-xs uppercase font-bold tracking-widest text-pink-300 mb-2">
              Journey So Far
            </h2>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-200 drop-shadow-sm">
                {linked ? days_together : 0}
              </span>
              <span className="text-lg font-medium text-pink-200/80">days together</span>
            </div>
            <div className="mt-8 flex items-center gap-3 text-pink-200/80 bg-black/20 rounded-xl p-3 border border-white/5 w-max">
              <span className="animate-pulse text-xl">❤️</span>
              <span className="text-sm font-medium">
                Every day counts.
              </span>
            </div>
          </div>

          <div className="glass-card p-6 md:p-8 flex flex-col justify-between items-center text-center">
            <div className="w-full h-full flex flex-col justify-center">
              <h2 className="text-sm font-medium text-gray-400 mb-6">
                Thinking of {data.partner_user ? data.partner_user.name : "them"}?
              </h2>
              {data.partner_user ? (
                <button
                  onClick={sendNudge}
                  disabled={nudging}
                  className="w-full flex-1 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 hover:from-pink-500/20 hover:to-rose-500/20 border border-pink-500/20 flex flex-col relative overflow-hidden group items-center justify-center transition-all duration-500 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-5xl group-hover:scale-125 transition-transform duration-500 mb-3 filter drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">💖</span>
                  <span className="text-sm text-pink-200 font-semibold uppercase tracking-wider">Send a Nudge</span>
                  {nudgeSuccess && (
                    <div className="absolute inset-0 bg-pink-500/90 backdrop-blur flex items-center justify-center text-white font-bold text-lg animate-in fade-in zoom-in duration-300 z-10">
                      Nudge Sent! ✨
                    </div>
                  )}
                </button>
              ) : (
                <div className="border border-dashed border-white/10 rounded-2xl flex-1 flex items-center justify-center p-6">
                  <p className="text-sm text-gray-500">
                    You're not connected to a partner yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Intimacy & Magic Fold: Heartbeat Touch & Our Universe */}
        {data && data.linked && (
          <section className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* 1. Heartbeat Touch */}
            <div
              onClick={() => navigate('/touch')}
              className="glass-card p-6 md:p-8 cursor-pointer relative overflow-hidden group border-pink-500/30 bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-black/80 hover:border-pink-500/60 transition-all duration-500 hover:scale-[1.01] shadow-xl"
            >
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-pink-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-2xl shadow-lg shadow-pink-500/30 group-hover:rotate-12 transition-transform">
                  💋
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-pink-500/20 text-pink-300 border border-pink-500/30 animate-pulse">
                  Live Haptic
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-pink-200 transition-colors">
                Heartbeat Touch
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                Hold thumbs on screen together. Feel each other's heartbeat and live haptic vibration across any distance.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-pink-400 group-hover:translate-x-1 transition-transform">
                <span>Hold thumbs together</span>
                <span>→</span>
              </div>
            </div>

            {/* 2. Our Universe */}
            <div
              onClick={() => navigate('/universe')}
              className="glass-card p-6 md:p-8 cursor-pointer relative overflow-hidden group border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-black/80 hover:border-purple-500/60 transition-all duration-500 hover:scale-[1.01] shadow-xl"
            >
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-purple-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30 group-hover:rotate-12 transition-transform">
                  🌌
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  3D Cosmos
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-200 transition-colors">
                Our Universe
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                Explore your personal 3D night sky. Name permanent stars after your dates, memories, and secret promises.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>Enter our sky</span>
                <span>→</span>
              </div>
            </div>
          </section>
        )}

        {/* Row 4: Next Countdown Widget */}
        <section
          onClick={() => navigate('/countdowns')}
          className="glass-card p-6 border-purple-500/20 cursor-pointer group hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs uppercase font-bold tracking-widest text-purple-300">⏳ Next Countdown</h2>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
              <span className="text-sm">→</span>
            </div>
          </div>
          {nextCountdown ? (() => {
            const totalSecs = Math.max(0, Math.floor((new Date(nextCountdown.target_date) - new Date(cdNow)) / 1000));
            const days = Math.floor(totalSecs / 86400);
            const hours = Math.floor((totalSecs % 86400) / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;
            const pad = n => String(n).padStart(2, '0');
            return (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                    {nextCountdown.emoji} {nextCountdown.label}
                  </h3>
                  <p className="text-sm text-gray-400">is approaching rapidly...</p>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  {[{ v: days, l: 'Days' }, { v: hours, l: 'Hrs' }, { v: mins, l: 'Mins' }, { v: secs, l: 'Secs' }].map(({ v, l }) => (
                    <div key={l} className="flex flex-col items-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shadow-inner">
                        <span className="text-2xl font-mono font-bold text-white">{pad(v)}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-semibold">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center py-6 text-gray-500 group-hover:text-purple-300 transition-colors">
              <span className="text-3xl mb-3">⏳</span>
              <span className="text-sm font-medium">Add a countdown to look forward to!</span>
            </div>
          )}
        </section>

        {/* Row 5: On This Day */}
        {onThisDay.length > 0 && (
          <section
            onClick={() => navigate('/album')}
            className="glass-card p-6 cursor-pointer group hover:bg-white/10 transition-all duration-300"
          >
            <h2 className="text-xs uppercase font-bold tracking-widest text-pink-300 mb-4 flex items-center justify-between">
              <span>📅 Memories</span>
              <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-pink-500/20 group-hover:text-pink-300 transition-colors">
                <span className="text-sm">→</span>
              </span>
            </h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {onThisDay.slice(0, 5).map(group =>
                group.photos.slice(0, 1).map(p => (
                  <div key={p.id} className="relative flex-shrink-0 group/photo">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10">
                      <img src={p.thumbnail_url || p.file_url} alt="Memory"
                        className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                      <p className="text-[10px] font-bold text-white tracking-widest uppercase">{new Date().getFullYear() - group.year}y ago</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        {/* Quick Actions Component is still intact beneath */}
        <section>
          <h2 className="text-xs uppercase font-bold tracking-widest text-gray-500 mb-4 ml-2">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Action 0: Games */}
            <div
              onClick={() => navigate('/games')}
              className="glass-card p-5 group cursor-pointer hover:-translate-y-1 hover:border-pink-500/50 hover:shadow-[0_10px_30px_rgba(236,72,153,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex flex-col gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-inner">
                  🎮
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 tracking-tight">Couple Games</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Truth/Dare, RPS, TTT</p>
                </div>
              </div>
            </div>
            {/* Action 1: Send Note */}
            <div
              onClick={() => navigate('/notes/write')}
              className="glass-card p-5 group cursor-pointer hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-[0_10px_30px_rgba(155,92,246,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex flex-col gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-inner">
                  💌
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 tracking-tight">Send Note</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Drop a sweet message</p>
                </div>
              </div>
            </div>

            {/* Action 2: Add Countdown */}
            <div
              onClick={() => navigate('/countdowns')}
              className="glass-card p-5 group cursor-pointer hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex flex-col gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                  🗓️
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 tracking-tight">Create Date</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Mark your next event</p>
                </div>
              </div>
            </div>

            {/* Action 3: Upload Photo */}
            <div
              onClick={() => navigate('/album')}
              className="glass-card p-5 group cursor-pointer hover:-translate-y-1 hover:border-green-500/50 hover:shadow-[0_10px_30px_rgba(34,197,94,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex flex-col gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all shadow-inner">
                  📸
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 tracking-tight">Add Photo</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Save a new memory</p>
                </div>
              </div>
            </div>

            {/* Action 4: Voice Call */}
            <div
              onClick={() => startCall('voice')}
              className="glass-card p-5 group cursor-pointer hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex flex-col gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                  📞
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 tracking-tight">Voice Call</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Hear partner's voice</p>
                </div>
              </div>
            </div>

            {/* Action 5: Video Call */}
            <div
              onClick={() => startCall('video')}
              className="glass-card p-5 group cursor-pointer hover:-translate-y-1 hover:border-red-500/50 hover:shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex flex-col gap-3 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner">
                  📹
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 tracking-tight">Video Call</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">See each other now</p>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Milestone Banner Overlay */}
      {milestoneNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-card bg-gradient-to-br from-purple-900/80 to-pink-900/80 border-pink-500/50 p-10 max-w-md w-full text-center shadow-[0_0_80px_rgba(236,72,153,0.4)] animate-in zoom-in-90 duration-500 relative overflow-hidden">
            <div className="absolute -inset-2 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative z-10">
              <span className="text-6xl mb-6 block animate-bounce filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">🎉</span>
              <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                {milestoneNotif.title}
              </h2>
              <p className="text-pink-100 font-medium text-lg mb-8 leading-relaxed">
                {milestoneNotif.body}
              </p>
              <button
                onClick={dismissMilestone}
                className="btn-primary w-full text-lg shadow-[0_0_20px_rgba(236,72,153,0.3)]"
              >
                Let's Celebrate! 💕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import NotificationBell from '../components/NotificationBell';
import confetti from 'canvas-confetti';
import { 
  Heart, MessageCircle, Sparkles, Compass, 
  MapPin, Film, Gamepad2, Camera, 
  Settings, LogOut, Copy, Check, QrCode, Volume2, VolumeX, X
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [partnerTime, setPartnerTime] = useState('');
  const [nextCountdown, setNextCountdown] = useState(null);
  const [cdNow, setCdNow] = useState(Date.now());
  const [recentMemories, setRecentMemories] = useState([]);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('lovelink_sound') !== 'false'
  );
  const [bitmojiId, setBitmojiId] = useState(
    localStorage.getItem('lovelink_bitmoji_id') || ''
  );
  const [savingBitmoji, setSavingBitmoji] = useState(false);

  // Load Dashboard Data
  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      setError('');
      setLoading(true);
      try {
        const res = await api.get('/dashboard');
        if (!isMounted) return;
        setData(res.data);
        if (res.data?.couple_id) {
          window.localStorage.setItem('couple_id', res.data.couple_id);
          const userObj = JSON.parse(window.localStorage.getItem('user') || '{}');
          if (!userObj.couple_id) {
            window.localStorage.setItem('user', JSON.stringify({ ...userObj, couple_id: res.data.couple_id }));
          }
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        if (isMounted) setError('Failed to load your sanctuary. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => { isMounted = false; };
  }, [navigate]);

  // Load Next Countdown
  useEffect(() => {
    api.get('/countdowns')
      .then(res => {
        const upcoming = (res.data || [])
          .filter(c => new Date(c.target_date) > new Date())
          .sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
        setNextCountdown(upcoming[0] || null);
      })
      .catch(() => {});
  }, []);

  // Tick for countdown timer
  useEffect(() => {
    const id = setInterval(() => setCdNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load Recent Memories
  useEffect(() => {
    api.get('/media/on-this-day')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const flat = [];
          res.data.forEach(g => {
            if (Array.isArray(g.photos)) flat.push(...g.photos);
          });
          setRecentMemories(flat.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  // Partner Clock Tick
  useEffect(() => {
    if (!data?.partner_user?.timezone) return;
    const tick = () => {
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: data.partner_user.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date());
        setPartnerTime(fmt);
      } catch {
        setPartnerTime('');
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // Milestone Confetti celebration (100, 365, 500, 1000 days)
  useEffect(() => {
    if (data?.days_together) {
      const milestones = [100, 200, 365, 500, 730, 1000];
      if (milestones.includes(data.days_together)) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F43F5E', '#EC4899', '#FB7185', '#FBBF24']
        });
      }
    }
  }, [data?.days_together]);

  const copyInviteCode = () => {
    const code = data?.my_user?.invite_code || data?.invite_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleLogout = async () => {
    const refreshToken = window.localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      window.localStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  const saveBitmojiSetting = () => {
    localStorage.setItem('lovelink_bitmoji_id', bitmojiId.trim());
    setSavingBitmoji(true);
    setTimeout(() => {
      setSavingBitmoji(false);
      setShowSettings(false);
    }, 400);
  };

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('lovelink_sound', String(nextVal));
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080c]">
        <div className="text-center animate-pulse">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            💖
          </div>
          <p className="text-gray-400 font-semibold tracking-wider text-xs uppercase">Opening LoveLink...</p>
        </div>
      </div>
    );
  }

  const { days_together, linked, partner_user } = data;

  return (
    <div className="min-h-screen pb-28 pt-4 sm:pt-6 px-4 sm:px-6 md:px-10 max-w-5xl mx-auto text-gray-100">
      
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <header className="flex items-center justify-between py-3 mb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Heart size={20} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>LoveLink</span>
            </h1>
            {linked && partner_user ? (
              <p className="text-xs text-rose-300/80 font-medium flex items-center gap-1">
                <span>With {partner_user.name}</span>
                {partnerTime && (
                  <span className="text-gray-400 font-mono text-[11px] ml-1">
                    • {partner_user.city || 'Home'} {partnerTime}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400">Private couple sanctuary</p>
            )}
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setShowSettings(true)}
            title="Settings & Profile"
            className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* ── Unlinked Onboarding State ─────────────────────────────── */}
      {!linked && (
        <section className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-950/40 via-[#131722] to-black border border-rose-500/30 shadow-2xl animate-in fade-in duration-500">
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              💌
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Connect with Your Partner</h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Share your private invite code or scan their QR code to begin your shared digital journey.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Your Invite Code</p>
                <p className="text-xl font-mono font-extrabold text-rose-300 tracking-wider">
                  {data?.my_user?.invite_code || data?.invite_code || '------'}
                </p>
              </div>
              <button
                onClick={copyInviteCode}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate('/link')}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <QrCode size={16} />
                <span>Enter Code or Scan QR</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Main Connected Dashboard ──────────────────────────────── */}
      {linked && (
        <main className="space-y-6">
          
          {/* Hero Card: Journey Milestone */}
          <section className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-950/40 via-[#0d0f17] to-black border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-widest mb-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Journey So Far</span>
                </div>
                
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-rose-100 to-rose-300 tracking-tight drop-shadow">
                    {days_together}
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-rose-200/80">
                    days together
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-2 max-w-sm">
                  Every shared laugh, conversation, and quiet moment counted across eternity.
                </p>
              </div>

              {/* Next Countdown Sneak-Peek */}
              {nextCountdown && (
                <div 
                  onClick={() => navigate('/countdowns')}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-rose-500/30 cursor-pointer transition-all max-w-xs w-full"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    <span>Approaching</span>
                    <span className="text-rose-400">View →</span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">
                    {nextCountdown.emoji} {nextCountdown.label}
                  </h3>
                  {(() => {
                    const totalSecs = Math.max(0, Math.floor((new Date(nextCountdown.target_date) - new Date(cdNow)) / 1000));
                    const days = Math.floor(totalSecs / 86400);
                    const hours = Math.floor((totalSecs % 86400) / 3600);
                    return (
                      <p className="text-xs font-mono text-rose-300 mt-1">
                        {days}d {hours}h remaining
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* Couple Presence & Avatar Studio Widget */}
          <div 
            onClick={() => navigate('/room')}
            className="p-4 rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#0d0f17] to-purple-950/40 border border-white/[0.08] hover:border-rose-500/40 cursor-pointer transition-all flex items-center justify-between group shadow-xl hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner">
                🛋️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-rose-200 transition-colors">
                    Couple Studio & Avatars
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    Live Presence
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hang out with {partner_user?.name || 'Partner'} • Hug, Kiss, Cuddle & Wardrobe
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 group-hover:text-rose-300 group-hover:translate-x-1 transition-all">
              <span>Open Studio</span>
              <span>→</span>
            </div>
          </div>

          {/* Compact Quick Actions Strip */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              Quick Shortcuts
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { title: 'Chat', desc: 'E2EE Messages', icon: MessageCircle, path: '/chat', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                { title: 'Studio', desc: 'Friendmoji Room', icon: Sparkles, path: '/room', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
                { title: 'Games', desc: '1v1 & Solo Bot', icon: Gamepad2, path: '/games', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                { title: 'Watch', desc: 'Sync Movies', icon: Film, path: '/movies', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                { title: 'Snap Map', desc: 'Live Radar', icon: MapPin, path: '/map', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                { title: 'All Hub', desc: 'Explore Features', icon: Compass, path: '/hub', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.path)}
                    className="p-3.5 rounded-2xl bg-[#0d0f17]/90 hover:bg-[#131724] border border-white/[0.08] hover:border-rose-500/30 text-left flex flex-col justify-between group transition-all duration-300 shadow-md"
                  >
                    <div className={`w-8 h-8 rounded-xl ${item.color} border flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-rose-200 transition-colors">{item.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent Memories Strip */}
          {recentMemories.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Camera size={14} className="text-rose-400" />
                  <span>Recent Memories</span>
                </h2>
                <button
                  onClick={() => navigate('/album')}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  View Album →
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {recentMemories.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate('/album')}
                    className="aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-rose-500/40 cursor-pointer group relative bg-black/40"
                  >
                    <img
                      src={p.thumbnail_url || p.file_url}
                      alt="Memory"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-[9px] font-mono text-white truncate">{p.caption || 'Memory'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      )}

      {/* ── Settings & Profile Modal ─────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0d0f17] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Settings size={18} className="text-rose-400" />
                <span>Sanctuary Settings</span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* User Profile Overview */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xl text-rose-300 font-bold">
                {data?.my_user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{data?.my_user?.name || 'User'}</h3>
                <p className="text-xs text-gray-400 truncate">{data?.my_user?.email || data?.my_user?.phone || ''}</p>
                <p className="text-[10px] text-rose-300 font-mono mt-0.5">Code: {data?.my_user?.invite_code}</p>
              </div>
            </div>

            {/* Custom Bitmoji Avatar ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-pink-400" />
                <span>Snapchat Bitmoji Avatar ID (Optional)</span>
              </label>
              <input
                type="text"
                value={bitmojiId}
                onChange={(e) => setBitmojiId(e.target.value)}
                placeholder="Paste your Bitmoji Avatar ID..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
              <p className="text-[10px] text-gray-400">
                Used to personalize your Friendmoji couple in Studio. If blank, romantic presets are used.
              </p>
              <button
                onClick={saveBitmojiSetting}
                disabled={savingBitmoji}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
              >
                {savingBitmoji ? 'Saved!' : 'Save Bitmoji ID'}
              </button>
            </div>

            {/* Sound Effects Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
              <div className="flex items-center gap-2.5">
                {soundEnabled ? <Volume2 size={18} className="text-rose-400" /> : <VolumeX size={18} className="text-gray-500" />}
                <div>
                  <h4 className="text-xs font-bold text-white">Romantic Sound Effects</h4>
                  <p className="text-[10px] text-gray-400">Soft pops, clinks & victory chimes</p>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className={`w-12 h-6 rounded-full transition-colors p-1 ${soundEnabled ? 'bg-rose-500' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Logout Action */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut size={14} />
                <span>Sign Out of LoveLink</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

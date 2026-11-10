import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  Heart, Calendar, Sparkles, Droplets, 
  Coffee, ArrowLeft, RefreshCw, 
  Smile, Flame, CheckCircle
} from 'lucide-react';

export default function CycleTracker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cycleData, setCycleData] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  // Setup form states
  const [lastPeriodDate, setLastPeriodDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  // Daily log states
  const [flow, setFlow] = useState('none');
  const [cramps, setCramps] = useState('none');
  const [mood, setMood] = useState('peaceful');
  const [cravings, setCravings] = useState('');
  const [energy, setEnergy] = useState('normal');
  const [notes, setNotes] = useState('');

  const fetchCycleData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/cycle');
      if (res.data && res.data.has_cycle) {
        setCycleData(res.data);
        setLastPeriodDate(res.data.last_period_date);
        setCycleLength(res.data.cycle_length || 28);
        setPeriodLength(res.data.period_length || 5);

        if (res.data.today_log) {
          setFlow(res.data.today_log.flow || 'none');
          setCramps(res.data.today_log.cramps || 'none');
          setMood(res.data.today_log.mood || 'peaceful');
          setCravings(res.data.today_log.cravings || '');
          setEnergy(res.data.today_log.energy || 'normal');
          setNotes(res.data.today_log.notes || '');
        }
      } else {
        setCycleData(null);
        setShowSetupModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch cycle data:', err);
      toast.error('Could not load cycle data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycleData();
  }, [fetchCycleData]);

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    if (!lastPeriodDate) {
      toast.error('Please choose the start date of the last period');
      return;
    }
    setSavingSetup(true);
    try {
      await api.post('/cycle/setup', {
        last_period_date: lastPeriodDate,
        cycle_length: Number(cycleLength),
        period_length: Number(periodLength)
      });
      toast.success('Cycle tracker updated with love! 🌸');
      setShowSetupModal(false);
      fetchCycleData();
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to save cycle settings');
    } finally {
      setSavingSetup(false);
    }
  };

  const handleSaveLog = async () => {
    setSavingLog(true);
    try {
      await api.post('/cycle/log', {
        flow,
        cramps,
        mood,
        cravings,
        energy,
        notes
      });
      toast.success("Today's symptoms logged! Partner will be notified 💕");
      fetchCycleData();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save log');
    } finally {
      setSavingLog(false);
    }
  };

  const sendCareAction = async (careType, message) => {
    try {
      // Send quick message in chat or trigger comfort alert
      await api.post('/chat/send', {
        content: `Care Alert: ${message}`
      }).catch(() => null);

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#ec4899', '#f59e0b', '#fb7185']
      });
      toast.success(`${careType} sent with warm hugs! 🥰`, { duration: 4000 });
    } catch {
      toast.success(`${careType} sent! 💕`);
    }
  };

  // Helper for Circular Ring
  const currentDay = cycleData?.current_day || 1;
  const totalDays = cycleData?.cycle_length || 28;
  const progressRatio = Math.min(1, Math.max(0, currentDay / totalDays));
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressRatio);

  const getPhaseColor = (code) => {
    switch (code) {
      case 'period': return '#f43f5e';
      case 'follicular': return '#a855f7';
      case 'ovulation': return '#ec4899';
      case 'luteal': return '#f59e0b';
      default: return '#ec4899';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-darker via-[#14061a] to-brand-darker text-gray-100 pb-24 pt-6 px-4 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-sm font-medium border border-white/10"
        >
          <ArrowLeft size={18} />
          <span>Dashboard</span>
        </button>

        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 flex items-center justify-center gap-2">
            <span>🌸</span>
            <span>Couple Cycle & Care</span>
          </h1>
          <p className="text-[11px] text-pink-300/70 font-medium">Synchronized partner awareness & love</p>
        </div>

        <button
          onClick={() => setShowSetupModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-semibold transition-all"
        >
          <Calendar size={15} />
          <span>Adjust</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <RefreshCw className="animate-spin text-pink-400" size={32} />
          <p className="text-sm text-gray-400">Syncing cycle and caring tips...</p>
        </div>
      ) : !cycleData ? (
        <div className="glass-card p-8 text-center max-w-md mx-auto my-12 border border-pink-500/30">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4 text-3xl">
            🌸
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Set Up Couple Period Tracker</h2>
          <p className="text-sm text-gray-300 mb-6">
            Keep both of you informed. Track phases together so your partner knows exactly when you need extra hugs, gentle back rubs, warm tea, or personal space.
          </p>
          <button
            onClick={() => setShowSetupModal(true)}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-white shadow-lg shadow-pink-500/25 hover:scale-[1.02] transition-transform"
          >
            Start Tracking Together ✨
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Dial & Phase Status Hero */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-pink-950/20 via-black/40 to-purple-950/20 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Circular Dial Visualizer */}
              <div className="flex flex-col items-center justify-center relative">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
                    {/* Background track circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="14"
                      fill="transparent"
                    />
                    {/* Glowing active arc */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke={getPhaseColor(cycleData.phase_code)}
                      strokeWidth="14"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                    />
                  </svg>

                  {/* Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      Day {cycleData.current_day}
                    </span>
                    <span className="text-xs text-pink-300 font-medium">of {cycleData.cycle_length} days</span>
                    <span 
                      className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-sm"
                      style={{
                        backgroundColor: `${getPhaseColor(cycleData.phase_code)}22`,
                        borderColor: getPhaseColor(cycleData.phase_code),
                        color: '#fff'
                      }}
                    >
                      {cycleData.badge}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-300">
                  <Calendar size={14} className="text-pink-400" />
                  <span>Next period in <strong className="text-pink-300 font-bold">{cycleData.days_left} days</strong> ({cycleData.next_period_date})</span>
                </div>
              </div>

              {/* Phase Info & Caring Summary */}
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold uppercase tracking-wider">
                  Current Cycle Phase
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {cycleData.phase}
                </h2>

                <p className="text-sm text-gray-300 leading-relaxed bg-black/30 p-4 rounded-2xl border border-white/5">
                  {cycleData.care_tip}
                </p>

                {/* Mini 4-Phase Progress Bar */}
                <div className="pt-2">
                  <div className="text-[11px] text-gray-400 mb-2 flex justify-between font-medium">
                    <span>Period (1-{cycleData.period_length})</span>
                    <span>Follicular</span>
                    <span>Ovulation</span>
                    <span>Luteal (PMS)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-2 rounded-full overflow-hidden bg-white/5 p-0.5">
                    <div className={`h-full rounded-full transition-all ${cycleData.phase_code === 'period' ? 'bg-rose-500 shadow-md shadow-rose-500/50' : 'bg-rose-500/20'}`} />
                    <div className={`h-full rounded-full transition-all ${cycleData.phase_code === 'follicular' ? 'bg-purple-500 shadow-md shadow-purple-500/50' : 'bg-purple-500/20'}`} />
                    <div className={`h-full rounded-full transition-all ${cycleData.phase_code === 'ovulation' ? 'bg-pink-500 shadow-md shadow-pink-500/50' : 'bg-pink-500/20'}`} />
                    <div className={`h-full rounded-full transition-all ${cycleData.phase_code === 'luteal' ? 'bg-amber-500 shadow-md shadow-amber-500/50' : 'bg-amber-500/20'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Care & Empathy Section */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-pink-500/30 bg-gradient-to-r from-pink-950/30 via-black/50 to-rose-950/30 relative shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-xl text-white shadow-md shadow-pink-500/30">
                👑
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Partner Care & Empathy Guide
                  <Sparkles size={16} className="text-yellow-400 animate-pulse" />
                </h3>
                <p className="text-xs text-pink-300/80">Thoughtful actions you can take today to make her feel cherished</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <button
                onClick={() => sendCareAction('Chocolates & Cuddles', '🍫 Sent you a virtual basket of chocolates and super tight warm hugs!')}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">🍫</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Chocolates & Hugs</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Send instant sweet comfort</p>
                </div>
              </button>

              <button
                onClick={() => sendCareAction('Hot Tea & Heat Pad', '🍵 Reminding you to use the hot water bottle, sip warm tea, and take complete rest!')}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">🍵</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Tea & Heat Pad</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Warm reminder & pampering</p>
                </div>
              </button>

              <button
                onClick={() => sendCareAction('Back & Foot Rub', '💆 Relax baby, I promise a soothing back and foot massage as soon as we meet!')}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">💆</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Massage Coupon</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Cramp relief promise</p>
                </div>
              </button>

              <button
                onClick={() => sendCareAction('Endless Love Note', '💌 You are the strongest, most beautiful girl in the entire world. I love you endlessly!')}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">💌</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Love Note</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Emotional boost & warmth</p>
                </div>
              </button>
            </div>
          </div>

          {/* Daily Symptom & Mood Logger */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📝</span> Today's Symptoms & Mood Log
                </h3>
                <p className="text-xs text-gray-400">Share how you're feeling so your partner can care for you better</p>
              </div>
              <button
                onClick={handleSaveLog}
                disabled={savingLog}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {savingLog ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                <span>Save Today's Log</span>
              </button>
            </div>

            {/* 1. Flow */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2 flex items-center gap-1.5">
                <Droplets size={14} className="text-rose-400" />
                <span>Period Flow</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'none', label: 'None', icon: '⚪' },
                  { id: 'spotting', label: 'Spotting', icon: '💧' },
                  { id: 'light', label: 'Light', icon: '🩸' },
                  { id: 'medium', label: 'Medium', icon: '🩸🩸' },
                  { id: 'heavy', label: 'Heavy', icon: '🌊' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFlow(item.id)}
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${
                      flow === item.id 
                        ? 'bg-rose-500/20 border-rose-500 text-white font-bold shadow-md shadow-rose-500/20 scale-[1.02]' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm mb-1">{item.icon}</div>
                    <div className="text-[11px]">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Cramps */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2 flex items-center gap-1.5">
                <Flame size={14} className="text-orange-400" />
                <span>Cramps & Pain</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'No Pain', icon: '😊' },
                  { id: 'mild', label: 'Mild', icon: '⚡' },
                  { id: 'moderate', label: 'Moderate', icon: '😣' },
                  { id: 'severe', label: 'Severe 🆘', icon: '😭' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCramps(item.id)}
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${
                      cramps === item.id 
                        ? 'bg-orange-500/20 border-orange-500 text-white font-bold shadow-md shadow-orange-500/20 scale-[1.02]' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm mb-1">{item.icon}</div>
                    <div className="text-[11px]">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Mood */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2 flex items-center gap-1.5">
                <Smile size={14} className="text-pink-400" />
                <span>Today's Mood</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'peaceful', label: 'Peaceful', icon: '😌' },
                  { id: 'romantic', label: 'In Love', icon: '🥰' },
                  { id: 'sensitive', label: 'Emotional', icon: '🥺' },
                  { id: 'tired', label: 'Exhausted', icon: '😴' },
                  { id: 'irritable', label: 'Sensitive', icon: '😤' },
                  { id: 'happy', label: 'Joyful', icon: '✨' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMood(item.id)}
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${
                      mood === item.id 
                        ? 'bg-pink-500/20 border-pink-500 text-white font-bold shadow-md shadow-pink-500/20 scale-[1.02]' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-base mb-1">{item.icon}</div>
                    <div className="text-[11px]">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Cravings & Energy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2 flex items-center gap-1.5">
                  <Coffee size={14} className="text-amber-400" />
                  <span>Cravings</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Chocolates 🍫', 'Ice Cream 🍨', 'French Fries 🍟', 'Spicy Food 🌶️', 'Hot Tea ☕', 'Warm Hugs 🫂'].map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCravings(cravings === item ? '' : item)}
                      className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        cravings === item 
                          ? 'bg-amber-500/30 border-amber-400 text-white font-bold shadow-sm' 
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  <span>Energy Level</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: 'Energized ⚡' },
                    { id: 'normal', label: 'Normal 🔋' },
                    { id: 'low', label: 'Drained 🪫' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEnergy(item.id)}
                      className={`py-2 px-2 rounded-xl text-center text-xs border transition-all ${
                        energy === item.id 
                          ? 'bg-purple-500/30 border-purple-400 text-white font-bold' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Secret Note to Partner */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2 flex items-center gap-1.5">
                <Heart size={14} className="text-rose-400" />
                <span>Note for Your Partner (Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Need extra warm cuddles today, tummy hurts a little bit..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Adjust / Setup Cycle Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-darker border border-pink-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <span>🌸</span> Configure Cycle Tracker
            </h2>
            <p className="text-xs text-gray-400 mb-6">Enter last period date and normal cycle details</p>

            <form onSubmit={handleSaveSetup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  First Day of Last Period
                </label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-300 mb-1.5">
                  <span>Average Cycle Length</span>
                  <span className="text-pink-400 font-bold">{cycleLength} days</span>
                </div>
                <input
                  type="range"
                  min="21"
                  max="45"
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value)}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>21 days</span>
                  <span>28 days (standard)</span>
                  <span>45 days</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-300 mb-1.5">
                  <span>Period Bleeding Duration</span>
                  <span className="text-rose-400 font-bold">{periodLength} days</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={periodLength}
                  onChange={(e) => setPeriodLength(e.target.value)}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>2 days</span>
                  <span>5 days (average)</span>
                  <span>10 days</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSetup}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {savingSetup ? <RefreshCw className="animate-spin" size={16} /> : 'Save Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

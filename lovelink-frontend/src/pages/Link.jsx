import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const getError = (err) => {
  const d = err.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return 'Something went wrong. Please try again.';
};

function Link() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      setError('');
      setStatus('');
      setLoadingInvite(true);

      try {
        // Step 1: Check if already linked
        const meRes = await api.get('/couples/me');
        if (meRes.data && meRes.data.linked === true) {
          if (meRes.data.couple_id) {
            window.localStorage.setItem('couple_id', meRes.data.couple_id);
            const userObj = JSON.parse(window.localStorage.getItem('user') || '{}');
            window.localStorage.setItem('user', JSON.stringify({ ...userObj, couple_id: meRes.data.couple_id }));
          }
          navigate('/dashboard', { replace: true });
          return;
        }

        // Step 2: Not linked, get invite code
        const inv = await api.post('/couples/generate-invite');
        setInviteCode(inv.data.invite_code);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/', { replace: true });
          return;
        }
        // couples/me failed, still try to get invite code
        try {
          const inv = await api.post('/couples/generate-invite');
          setInviteCode(inv.data.invite_code);
        } catch (e) {
          setError(getError(e));
        }
      } finally {
        setLoadingInvite(false);
      }
    };

    init();
  }, [navigate]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setStatus('Copied!');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setError('Could not copy to clipboard. Please copy manually.');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setJoining(true);

    try {
      const code = partnerCode.trim().toUpperCase();
      if (!code || code.length !== 6) {
        setError("Please enter your partner's 6-character invite code.");
        setJoining(false);
        return;
      }

      const joinRes = await api.post('/couples/join', { invite_code: code });
      if (joinRes.data?.couple_id) {
        window.localStorage.setItem('couple_id', joinRes.data.couple_id);
        const userObj = JSON.parse(window.localStorage.getItem('user') || '{}');
        window.localStorage.setItem('user', JSON.stringify({ ...userObj, couple_id: joinRes.data.couple_id }));
      }
      setStatus('Connected! 💑');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      setError(getError(err));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080612] px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[rgba(155,92,246,0.3)] bg-[rgba(255,255,255,0.05)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-8 text-gray-100">
        <div className="text-center mb-8">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            💑 Connect with your Partner
          </div>
          <p className="text-sm text-gray-400">
            Share your invite code or join your partner using theirs.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {status && !error && (
          <div className="mb-4 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {status}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold mb-3">Your Code</h2>
            <p className="text-xs text-gray-400 mb-3">
              Share this code with your partner.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-16 rounded-xl border border-purple-400/60 bg-[#0f0b20] flex items-center justify-center text-2xl font-mono tracking-[0.6em] uppercase text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.7)]">
                {inviteCode || (loadingInvite ? '------' : '')}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!inviteCode}
                className="h-16 px-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 disabled:from-purple-900 disabled:via-pink-900 disabled:to-rose-900"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Join Partner</h2>
            <p className="text-xs text-gray-400 mb-3">
              Enter the 6-character code your partner shared.
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase tracking-[0.5em] text-center"
                placeholder="ABC123"
              />
              <button
                type="submit"
                disabled={joining}
                className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 disabled:from-purple-900 disabled:via-pink-900 disabled:to-rose-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:brightness-110"
              >
                {joining ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : (
                  'Join Partner'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Link;
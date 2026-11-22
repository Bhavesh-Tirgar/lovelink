import GoogleSignInButton from '../components/GoogleSignInButton';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import AmbientAuraGlow from '../components/ui/AmbientAuraGlow';
import SpotlightCard from '../components/ui/SpotlightCard';
import { Heart } from 'lucide-react';

const getError = (err) => {
  const d = err.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return 'Something went wrong. Please try again.';
};

function Login() {
  const navigate = useNavigate();
  const isNativeApp = typeof window !== 'undefined' && (
    Boolean(window['Capacitor']?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    /Capacitor/i.test(navigator.userAgent)
  );
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState(isNativeApp ? 'otp' : 'password');
  const [otpSent, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const validateEmailOrPhone = (val) => {
    if (!val) return "Please enter your email or phone number";
    if (val.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) return "Please enter a valid email address";
    } else {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      const digitsOnly = val.replace(/\D/g, '');
      if (!phoneRegex.test(val) || digitsOnly.length < 10) return "Please enter a valid 10-digit phone number";
    }
    return "";
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const valErr = validateEmailOrPhone(identifier);
    if (valErr) {
      setError(valErr);
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    let finalIdentifier = identifier.trim();
    if (!finalIdentifier.includes('@') && !finalIdentifier.startsWith('+') && finalIdentifier.replace(/\D/g, '').length === 10) {
      finalIdentifier = `+91${finalIdentifier}`;
    }

    try {
      const res = await api.post('/auth/login', {
        identifier: finalIdentifier,
        password,
      });
      const { access_token, user, couple_id } = res.data;
      const activeCoupleId = couple_id || user?.couple_id;
      window.localStorage.setItem('token', access_token);
      if (res.data.refresh_token) window.localStorage.setItem('refresh_token', res.data.refresh_token);
      window.localStorage.setItem('user', JSON.stringify({ ...user, couple_id: activeCoupleId }));
      if (activeCoupleId) {
        window.localStorage.setItem('couple_id', activeCoupleId);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/link', { replace: true });
      }
    } catch (err) {
      const errMsg = getError(err);
      if (errMsg.includes("Account not verified")) {
        setInfo(errMsg);
        setMode('otp');
        setOtpSent(true);
        setResendSeconds(30);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const valErr = validateEmailOrPhone(identifier);
    if (valErr) {
      setError(valErr);
      return;
    }

    setLoading(true);

    let finalIdentifier = identifier.trim();
    if (!finalIdentifier.includes('@') && !finalIdentifier.startsWith('+') && finalIdentifier.replace(/\D/g, '').length === 10) {
      finalIdentifier = `+91${finalIdentifier}`;
    }

    try {
      const res = await api.post('/auth/login-otp', {
        identifier: finalIdentifier,
      });
      setOtpSent(true);
      setInfo(res.data.message || 'OTP sent successfully');
      setResendSeconds(30);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!otp || otp.trim().length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);

    let finalIdentifier = identifier.trim();
    if (!finalIdentifier.includes('@') && !finalIdentifier.startsWith('+') && finalIdentifier.replace(/\D/g, '').length === 10) {
      finalIdentifier = `+91${finalIdentifier}`;
    }

    try {
      const res = await api.post('/auth/login-verify-otp', {
        identifier: finalIdentifier,
        otp,
      });
      const { access_token, user, couple_id } = res.data;
      const activeCoupleId = couple_id || user?.couple_id;
      window.localStorage.setItem('token', access_token);
      if (res.data.refresh_token) window.localStorage.setItem('refresh_token', res.data.refresh_token);
      window.localStorage.setItem('user', JSON.stringify({ ...user, couple_id: activeCoupleId }));
      if (activeCoupleId) {
        window.localStorage.setItem('couple_id', activeCoupleId);
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/link', { replace: true });
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  // countdown for resend OTP
  React.useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, resendSeconds]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050608] px-4 py-8 relative overflow-hidden select-none">
      <AmbientAuraGlow />

      <SpotlightCard
        spotlightColor="rgba(244, 63, 94, 0.2)"
        borderColor="rgba(244, 63, 94, 0.4)"
        className="w-full max-w-md p-8 sm:p-10 bg-gradient-to-b from-[#0e101a]/90 via-[#07080e]/95 to-black"
      >
        <div className="text-center mb-6">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 6 }}
            className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/30"
          >
            <Heart size={28} className="text-white fill-white" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>LoveLink</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
              SECURE
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Welcome back to your private couple sanctuary</p>
        </div>

        {info && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
            {info}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="you@example.com or +91XXXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 disabled:opacity-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all hover:brightness-110"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Log In 🚀'
              )}
            </motion.button>

            <button
              type="button"
              className="mt-2 w-full text-xs text-rose-300 hover:text-rose-200 font-medium"
              onClick={() => {
                setMode('otp');
                setError('');
                setInfo('');
              }}
            >
              Login with OTP instead
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setOtpSent(false);
                  setInfo('');
                }}
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="you@example.com or +91XXXXXXXXXX"
              />
            </div>

            {!otpSent ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={loading}
                onClick={handleSendOtp}
                className="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 disabled:opacity-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all hover:brightness-110"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP 📩'
                )}
              </motion.button>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    6-Digit Security OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full text-center tracking-[0.4em] rounded-xl bg-black/50 border border-white/10 px-3 py-2.5 text-base font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
                    placeholder="••••••"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                  className="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 disabled:opacity-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all hover:brightness-110"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Enter 🚀'
                  )}
                </motion.button>
                <button
                  type="button"
                  disabled={loading || resendSeconds > 0}
                  onClick={handleSendOtp}
                  className="mt-2 w-full text-xs text-rose-300 hover:text-rose-200 disabled:text-gray-500"
                >
                  {resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : 'Resend OTP'}
                </button>
              </>
            )}

            <button
              type="button"
              className="mt-2 w-full text-xs text-rose-300 hover:text-rose-200 font-medium"
              onClick={() => {
                setMode('password');
                setOtpSent(false);
                setOtp('');
                setError('');
                setInfo('');
              }}
            >
              Login with Password instead
            </button>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#0b0c14] px-2.5 text-gray-400 font-bold tracking-wider">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleSignInButton onError={(msg) => setError(msg)} />

        <p className="mt-5 text-center text-xs text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-bold text-rose-400 hover:text-rose-300 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </SpotlightCard>
    </div>
  );
}

export default Login;

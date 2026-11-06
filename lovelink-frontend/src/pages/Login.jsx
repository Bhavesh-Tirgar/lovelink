import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const getError = (err) => {
  const d = err.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return 'Something went wrong. Please try again.';
};

function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState('password');
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
      window.localStorage.setItem('user', JSON.stringify({ ...user, couple_id: activeCoupleId }));
      if (activeCoupleId) {
        window.localStorage.setItem('couple_id', activeCoupleId);
      }
      navigate('/link');
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
      const res = await api.post('/auth/login', { identifier: finalIdentifier });
      setOtpSent(true);
      setInfo(res.data.message || `OTP sent to ${finalIdentifier}.`);
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

    if (!otp) {
      setError("Please enter the OTP");
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
      window.localStorage.setItem('user', JSON.stringify({ ...user, couple_id: activeCoupleId }));
      if (activeCoupleId) {
        window.localStorage.setItem('couple_id', activeCoupleId);
      }
      navigate('/link');
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
    <div className="min-h-screen flex items-center justify-center bg-[#080612] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(155,92,246,0.3)] bg-[rgba(255,255,255,0.05)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-8">
        <div className="text-center mb-6">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            💑 LoveLink
          </div>
          <p className="text-sm text-gray-400">Welcome back</p>
        </div>

        {info && (
          <div className="mb-3 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {info}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="you@example.com or +91XXXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 disabled:from-purple-900 disabled:via-pink-900 disabled:to-rose-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:brightness-110"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Log In'
              )}
            </button>

            <button
              type="button"
              className="mt-2 w-full text-xs text-purple-300 hover:text-purple-200"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="you@example.com or +91XXXXXXXXXX"
              />
            </div>

            {!otpSent ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleSendOtp}
                className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 disabled:from-purple-900 disabled:via-pink-900 disabled:to-rose-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:brightness-110"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full text-center tracking-[0.5em] rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    placeholder="••••••"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                  className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 disabled:from-purple-900 disabled:via-pink-900 disabled:to-rose-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:brightness-110"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
                <button
                  type="button"
                  disabled={loading || resendSeconds > 0}
                  onClick={handleSendOtp}
                  className="mt-2 w-full text-xs text-purple-300 hover:text-purple-200 disabled:text-gray-500"
                >
                  {resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : 'Resend OTP'}
                </button>
              </>
            )}

            <button
              type="button"
              className="mt-2 w-full text-xs text-purple-300 hover:text-purple-200"
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

        <p className="mt-4 text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-purple-300 hover:text-purple-200"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const getError = (err) => {
  const d = err.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return 'Something went wrong. Please try again.';
};

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const validatePhone = (val) => {
    if (!val) return "";
    const digitsOnly = val.replace(/\D/g, '');
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(val) || digitsOnly.length < 10) return "Please enter a valid 10-digit phone number";
    return "";
  };

  const validateEmail = (val) => {
    if (!val) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) return "Please enter a valid email address";
    return "";
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!city.trim()) {
      setError("Please enter your city");
      return;
    }
    if (!email && !phone) {
      setError('Please provide either email or phone.');
      return;
    }
    const eErr = validateEmail(email);
    if (eErr) {
      setError(eErr);
      return;
    }
    const pErr = validatePhone(phone);
    if (pErr) {
      setError(pErr);
      return;
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    let finalPhone = phone ? phone.trim() : null;
    if (finalPhone && !finalPhone.startsWith('+') && finalPhone.replace(/\D/g, '').length === 10) {
      finalPhone = `+91${finalPhone}`;
    }

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = {
        name: fullName,
        city,
        timezone,
        email: email || null,
        phone: finalPhone,
        password: password || null,
      };
      const res = await api.post('/auth/signup', payload);

      const id = email || finalPhone;
      setIdentifier(id || '');
      setInfo(res.data.message || `OTP sent to ${id}.`);
      setStep(2);
      setOtpSent(true);
      setResendSeconds(30);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await api.post('/auth/send-otp', { identifier });
      setOtpSent(true);
      setInfo(res.data.message || `OTP sent to ${identifier}.`);
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

    try {
      const res = await api.post('/auth/verify-otp', {
        identifier,
        otp,
      });
      const { access_token, user } = res.data;
      window.localStorage.setItem('token', access_token);
      window.localStorage.setItem('user', JSON.stringify(user));
      navigate('/link');
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080612] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(155,92,246,0.3)] bg-[rgba(255,255,255,0.05)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-8">
        <div className="text-center mb-6">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
            💑 LoveLink
          </div>
          <p className="text-sm text-gray-400">Create your account</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-3 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {info}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="Alex Johnson"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="Your City (e.g. Ahmedabad, Jaipur, Mumbai)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="+91XXXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password (optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[#0f0b20] border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="Set a password or use OTP login"
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
                  Creating account...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-sm text-gray-400">
              We sent a 6-digit OTP to <span className="text-purple-300">{identifier}</span>.
            </div>
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
              type="submit"
              disabled={loading}
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
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link
            to="/"
            className="font-medium text-purple-300 hover:text-purple-200"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;


import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

export default function GoogleSignInButton({ onError }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const googleBtnRef = useRef(null);

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

    const handleGoogleResponse = useCallback(async (response) => {
        if (!response.credential) {
            toast.error('Google sign in did not return credentials');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/google', {
                credential: response.credential,
            });

            const { access_token, user, couple_id } = res.data;
            const activeCoupleId = couple_id || user?.couple_id;

            window.localStorage.setItem('token', access_token);
            window.localStorage.setItem('user', JSON.stringify({ ...user, couple_id: activeCoupleId }));
            if (activeCoupleId) {
                window.localStorage.setItem('couple_id', activeCoupleId);
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/link', { replace: true });
            }

            toast.success(`Welcome to LoveLink, ${user.name}! 💖`);
        } catch (err) {
            console.error('Google auth failed:', err);
            const msg = err.response?.data?.detail || 'Google sign-in failed. Please try again.';
            if (onError) onError(msg);
            else toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [navigate, onError]);

    useEffect(() => {
        if (typeof window === 'undefined' || !clientId) return;

        // If Google Identity script is loaded, initialize official button
        const checkGoogle = () => {
            if (window.google?.accounts?.id) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: clientId,
                        callback: handleGoogleResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });

                    if (googleBtnRef.current) {
                        window.google.accounts.id.renderButton(googleBtnRef.current, {
                            theme: 'filled_black',
                            size: 'large',
                            width: '100%',
                            text: 'continue_with',
                            shape: 'pill',
                        });
                    }
                } catch (e) {
                    console.warn('Google Identity initialization error:', e);
                }
            }
        };

        if (window.google?.accounts?.id) {
            checkGoogle();
        } else {
            const timer = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(timer);
                    checkGoogle();
                }
            }, 300);
            return () => clearInterval(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId, handleGoogleResponse]);

    const handleCustomClick = () => {
        if (!clientId) {
            toast.error('Google Client ID not configured. Please add REACT_APP_GOOGLE_CLIENT_ID to .env or sign in with Email / Phone.');
            return;
        }
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* Native Google One-Tap container (hidden if rendering custom styled button) */}
            <div ref={googleBtnRef} className={clientId ? "w-full flex justify-center" : "hidden"} />

            {/* Custom Modern Romantic Google Sign-In Button */}
            {!clientId && (
                <button
                    type="button"
                    onClick={handleCustomClick}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-black/40 group"
                >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
                </button>
            )}
        </div>
    );
}

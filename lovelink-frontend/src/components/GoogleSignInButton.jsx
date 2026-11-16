import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

export default function GoogleSignInButton({ onError }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [gsiLoaded, setGsiLoaded] = useState(false);
    const googleBtnRef = useRef(null);

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

    const handleGoogleResponse = useCallback(async (response) => {
        if (!response || !response.credential) {
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
            if (res.data.refresh_token) window.localStorage.setItem('refresh_token', res.data.refresh_token);
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

    // Handle OAuth2 redirect return (extracts id_token from URL hash)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash;
        if (hash && hash.includes('id_token=')) {
            try {
                const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
                const idToken = params.get('id_token');
                if (idToken) {
                    window.history.replaceState(null, '', window.location.pathname);
                    handleGoogleResponse({ credential: idToken });
                }
            } catch (e) {
                console.error('Failed to parse OAuth redirect hash:', e);
            }
        }
    }, [handleGoogleResponse]);

    // Initialize Google Identity Services
    useEffect(() => {
        if (typeof window === 'undefined' || !clientId) return;

        let checkInterval = null;
        let observer = null;

        const renderGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleBtnRef.current) return;

            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleGoogleResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });

                // Google GSI requires width in pixels: integer between 200 and 400
                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
                const buttonWidth = Math.min(380, Math.max(220, Math.floor(screenWidth - 64)));

                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'filled_black',
                    size: 'large',
                    width: buttonWidth,
                    text: 'continue_with',
                    shape: 'pill',
                });

                // Check if Google successfully injected an iframe / button
                setTimeout(() => {
                    if (googleBtnRef.current && googleBtnRef.current.children.length > 0) {
                        setGsiLoaded(true);
                    }
                }, 400);
            } catch (e) {
                console.warn('Google Identity initialization error:', e);
            }
        };

        if (window.google?.accounts?.id) {
            renderGoogleButton();
        } else {
            checkInterval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(checkInterval);
                    renderGoogleButton();
                }
            }, 300);
        }

        return () => {
            if (checkInterval) clearInterval(checkInterval);
            if (observer) observer.disconnect();
        };
    }, [clientId, handleGoogleResponse]);

    const launchOAuthRedirect = () => {
        if (!clientId) {
            toast.error('Google Client ID not configured. Please use Email / Phone login.');
            return;
        }

        setLoading(true);
        const redirectUri = window.location.origin + window.location.pathname;
        const nonce = Math.random().toString(36).substring(2, 15);
        const scope = encodeURIComponent('openid email profile');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=id_token` +
            `&scope=${scope}` +
            `&nonce=${nonce}` +
            `&prompt=select_account`;

        window.location.href = authUrl;
    };

    const handleCustomClick = () => {
        if (!clientId) {
            toast.error('Google Sign-In is not configured. Please use Email or Phone login.');
            return;
        }

        if (window.google?.accounts?.id) {
            try {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        launchOAuthRedirect();
                    }
                });
                return;
            } catch (e) {
                console.warn('Google prompt failed, falling back to redirect:', e);
            }
        }

        launchOAuthRedirect();
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* Google Identity Services official container */}
            <div
                ref={googleBtnRef}
                className={gsiLoaded ? "w-full flex justify-center min-h-[44px]" : "hidden"}
            />

            {/* Custom Modern Romantic Google Sign-In Button (shown when GSI is loading or in WebView) */}
            {!gsiLoaded && (
                <button
                    type="button"
                    onClick={handleCustomClick}
                    disabled={loading}
                    className="w-full max-w-[360px] flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-black/40 group disabled:opacity-50"
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

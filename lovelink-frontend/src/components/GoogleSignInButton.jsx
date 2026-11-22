import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { auth } from '../utils/firebase';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function GoogleSignInButton({ onError }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [gsiLoaded, setGsiLoaded] = useState(false);
    const googleBtnRef = useRef(null);

    const isNativePlatform = Capacitor.isNativePlatform();
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '1088818591868-a2ktjjk82k2vnv2j3k837lumvaoie79f.apps.googleusercontent.com';

    const handleGoogleResponse = useCallback(async (response) => {
        if (!response || !response.credential) {
            toast.error('Google sign in did not return credentials');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Signing into LoveLink... 💖');

        try {
            console.log('[GoogleAuth] Submitting credential to /auth/google...');
            const res = await api.post('/auth/google', {
                credential: response.credential,
            });

            const { access_token, user, couple_id } = res.data;
            const activeCoupleId = couple_id || user?.couple_id;

            // 1. Always persist credentials in the local session
            window.localStorage.setItem('token', access_token);
            if (res.data.refresh_token) window.localStorage.setItem('refresh_token', res.data.refresh_token);
            window.localStorage.setItem('user', JSON.stringify({ ...user, couple_id: activeCoupleId }));
            if (activeCoupleId) {
                window.localStorage.setItem('couple_id', activeCoupleId);
            }

            // 2. If running in external Chrome Custom Tabs, return to the Native APK via deep-link
            const urlParams = new URLSearchParams(window.location.search);
            const isExternalReturn = !isNativePlatform && (
                response.isCapacitorFlow ||
                urlParams.get('oauth_source') === 'capacitor' ||
                urlParams.get('state') === 'capacitor' ||
                (typeof window !== 'undefined' && window.location.hash.includes('state=capacitor'))
            );

            if (isExternalReturn) {
                toast.success('Authenticated! Returning to app...', { id: toastId });
                const deepLink = `lovelink://auth?token=${access_token}&refresh_token=${res.data.refresh_token || ''}&couple_id=${activeCoupleId || ''}&user=${encodeURIComponent(JSON.stringify(user))}`;
                window.location.href = deepLink;
                return;
            }

            toast.success(`Welcome to LoveLink, ${user.name}! 💖`, { id: toastId });

            // 3. Navigate inside native app or web browser
            if (activeCoupleId) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/link', { replace: true });
            }
        } catch (err) {
            console.error('[GoogleAuth] Failed:', err);
            const msg = err.response?.data?.detail || err.message || 'Google sign-in failed. Please try again.';
            toast.error(msg, { id: toastId });
            if (onError) onError(msg);
        } finally {
            setLoading(false);
        }
    }, [navigate, onError, isNativePlatform]);

    // 1. Listen to Firebase Auth state changes (Web only)
    useEffect(() => {
        if (isNativePlatform) return;
        let isMounted = true;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!isMounted || !currentUser) return;
            if (window.localStorage.getItem('token')) return;
            try {
                const idToken = await currentUser.getIdToken();
                if (idToken) {
                    await handleGoogleResponse({ credential: idToken });
                }
            } catch (e) {
                console.error('Failed to get token from current user:', e);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [handleGoogleResponse, isNativePlatform]);

    // 2. Check for Firebase Redirect Result on mount (Web only)
    useEffect(() => {
        if (isNativePlatform) return;
        let isMounted = true;
        getRedirectResult(auth)
            .then(async (result) => {
                if (!isMounted || !result || !result.user) return;
                try {
                    const idToken = await result.user.getIdToken();
                    if (idToken) {
                        await handleGoogleResponse({ credential: idToken });
                    }
                } catch (e) {
                    console.error('Failed to get ID token from redirect:', e);
                }
            })
            .catch((err) => {
                console.warn('Firebase redirect result check:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [handleGoogleResponse, isNativePlatform]);

    // 3. Handle OAuth2 redirect return (extracts id_token or token from URL hash)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash;
        if (hash && (hash.includes('id_token=') || hash.includes('access_token='))) {
            try {
                const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
                const idToken = params.get('id_token') || params.get('access_token');
                const state = params.get('state');
                if (idToken) {
                    window.history.replaceState(null, '', window.location.pathname);
                    handleGoogleResponse({ 
                        credential: idToken,
                        isCapacitorFlow: state === 'capacitor'
                    });
                }
            } catch (e) {
                console.error('Failed to parse OAuth redirect hash:', e);
            }
        }
    }, [handleGoogleResponse]);

    // 4. Initialize Google Identity Services for Web only
    useEffect(() => {
        if (typeof window === 'undefined' || !clientId || isNativePlatform) return;

        let checkInterval = null;

        const renderGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleBtnRef.current) return;

            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleGoogleResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    itp_support: true,
                });

                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
                const buttonWidth = Math.min(380, Math.max(220, Math.floor(screenWidth - 64)));

                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'filled_black',
                    size: 'large',
                    width: buttonWidth,
                    text: 'continue_with',
                    shape: 'pill',
                });

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
        };
    }, [clientId, handleGoogleResponse, isNativePlatform]);

    // 5. Sign In Action: Handled according to platform (Native Android vs Web)
    const handleGoogleSignInClick = async () => {
        setLoading(true);

        // Native Android APK: Never navigate in-app WebView to accounts.google.com!
        if (isNativePlatform) {
            // 1. Attempt native Google Play Services sign-in if available
            try {
                console.log('[NativeAuth] Initializing @capawesome/capacitor-google-sign-in...');
                const { GoogleSignIn } = await import('@capawesome/capacitor-google-sign-in');
                await GoogleSignIn.initialize({ clientId });
                const result = await GoogleSignIn.signIn();
                console.log('[NativeAuth] GoogleSignIn.signIn result:', result ? 'Received result' : 'null');
                if (result) {
                    const token = result.idToken || result.accessToken;
                    if (token) {
                        await handleGoogleResponse({ credential: token });
                        return;
                    }
                }
            } catch (nativeErr) {
                console.warn('[NativeAuth] Google Play Services sign-in error:', nativeErr);
                // User explicitly dismissed the dialog
                if (nativeErr?.message?.includes('cancel') || nativeErr?.code === '16' || nativeErr?.code === '12501' || nativeErr?.code === 'SIGN_IN_CANCELED') {
                    setLoading(false);
                    return;
                }
            }

            // 2. Fallback: Open external Chrome Custom Tabs via @capacitor/browser.
            try {
                toast('Opening secure Google Sign-In...', { icon: '🌐' });
                const redirectUri = 'https://lovelink-pearl.vercel.app/login';
                const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&state=capacitor&nonce=${Date.now()}`;
                await Browser.open({ url: oauthUrl, windowName: '_system' });
            } catch (browserErr) {
                console.error('[NativeAuth] Failed to open external browser for Google auth:', browserErr);
                toast.error('Unable to open Google sign-in. Please use Email OTP login below!');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Web platform: Use standard Google OAuth 2.0
        try {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        const redirectUri = window.location.origin + '/login';
                        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${Date.now()}`;
                        window.location.href = oauthUrl;
                    }
                });
                return;
            }

            const redirectUri = window.location.origin + '/login';
            const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${Date.now()}`;
            window.location.href = oauthUrl;
        } catch (err) {
            console.error('Web Google auth error:', err);
            toast.error('Google Sign-In unavailable. Please use Email login below!');
            setLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* Google Identity Services official container for web */}
            {!isNativePlatform && (
                <div
                    ref={googleBtnRef}
                    className={gsiLoaded ? "w-full flex justify-center min-h-[44px]" : "hidden"}
                />
            )}

            {/* Custom Modern Romantic Google Sign-In Button */}
            {(isNativePlatform || !gsiLoaded) && (
                <button
                    type="button"
                    onClick={handleGoogleSignInClick}
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

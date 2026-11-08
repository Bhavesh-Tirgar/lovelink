import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already running in standalone mode (installed PWA)
        const checkStandalone = 
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.includes('android-app://');

        if (checkStandalone) {
            setIsStandalone(true);
            return;
        }

        // Check if user dismissed it in the last 24 hours
        const lastDismissed = localStorage.getItem('lovelink_pwa_dismissed');
        if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 24 * 60 * 60 * 1000) {
            setDismissed(true);
        }

        // Detect iOS Safari
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
        if (isIosDevice && isSafari && !checkStandalone) {
            setIsIOS(true);
        }

        // Listen for standard Chromium beforeinstallprompt event
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('lovelink_pwa_dismissed', Date.now().toString());
    };

    // Don't render if already in standalone app or dismissed
    if (isStandalone || dismissed || (!deferredPrompt && !isIOS)) {
        return null;
    }

    return (
        <aside 
            aria-label="Install App Banner"
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40 animate-fade-in"
        >
            <div className="relative overflow-hidden rounded-2xl bg-brand-card/95 backdrop-blur-xl border border-pink-500/30 p-4 shadow-2xl shadow-pink-950/40">
                {/* Glow backdrop */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-500/30">
                        <Smartphone className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                            Install LoveLink App
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                Native
                            </span>
                        </h4>
                        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                            {isIOS 
                                ? <span>Tap <Share className="w-3.5 h-3.5 inline text-pink-400 mx-0.5" /> then select <strong>Add to Home Screen</strong> for full-screen calls.</span>
                                : "Add to home screen for full-screen romantic calls & instant alerts."
                            }
                        </p>

                        {!isIOS && deferredPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20 hover:brightness-110 active:scale-95 transition"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Add to Home Screen
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                        title="Dismiss"
                        aria-label="Dismiss banner"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

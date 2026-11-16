import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, X, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import {
    getLocalPublicKeyJWK,
    calculateSafetyCode,
    initDeviceE2EEKey
} from '../utils/crypto';

export default function SafetyCodeModal({ isOpen, onClose, partnerName = 'Partner' }) {
    const [loading, setLoading] = useState(true);
    const [safetyCode, setSafetyCode] = useState(null);
    const [userJwk, setUserJwk] = useState(null);
    const [partnerJwk, setPartnerJwk] = useState(null);
    const [copied, setCopied] = useState(false);
    const [hasBackup, setHasBackup] = useState(false);

    // PIN Backup state
    const [showPinInput, setShowPinInput] = useState(false);
    const [recoveryPin, setRecoveryPin] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setLoading(true);

        async function loadKeys() {
            try {
                // Ensure local key exists
                let localJwk = await getLocalPublicKeyJWK();
                if (!localJwk) {
                    const initRes = await initDeviceE2EEKey();
                    localJwk = initRes?.publicJwk;
                }
                if (isMounted) setUserJwk(localJwk);

                // Fetch partner key and backup status
                const [partnerRes, backupRes] = await Promise.all([
                    api.get('/couples/partner-key').catch(() => ({ data: {} })),
                    api.get('/auth/e2ee/backup').catch(() => ({ data: {} })),
                ]);

                if (!isMounted) return;

                setHasBackup(Boolean(backupRes.data?.has_backup));

                const partnerRaw = partnerRes.data?.public_key;
                if (partnerRaw) {
                    const parsedPartnerJwk = typeof partnerRaw === 'string' ? JSON.parse(partnerRaw) : partnerRaw;
                    setPartnerJwk(parsedPartnerJwk);

                    if (localJwk) {
                        const code = await calculateSafetyCode(localJwk, parsedPartnerJwk);
                        setSafetyCode(code);
                    }
                }
            } catch (err) {
                console.error('Failed to load safety code data:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadKeys();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (!safetyCode) return;
        const textToCopy = `LoveLink E2EE Safety Code:\nNumbers: ${safetyCode.numeric}\nEmojis: ${safetyCode.emojis}`;
        navigator.clipboard?.writeText(textToCopy);
        setCopied(true);
        toast.success('Safety Code copied to clipboard');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleSetBackupPin = async (e) => {
        e.preventDefault();
        if (recoveryPin.length < 4) {
            toast.error('Recovery PIN must be at least 4 digits');
            return;
        }

        setPinLoading(true);
        try {
            const initRes = await initDeviceE2EEKey(recoveryPin);
            if (initRes) {
                setHasBackup(true);
                setShowPinInput(false);
                setRecoveryPin('');
                toast.success('E2EE Recovery Backup saved! 🔐');
            }
        } catch (err) {
            toast.error('Could not save recovery backup. Please try again.');
        } finally {
            setPinLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl bg-[#0f0a1c] border border-emerald-500/30 p-6 shadow-2xl shadow-emerald-950/50 text-center overflow-hidden">
                {/* Background glow accents */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white tracking-wide">
                    E2EE Safety Code
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                    End-to-End Encryption Verification with <span className="text-emerald-300 font-semibold">{partnerName}</span>
                </p>

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                        <span className="text-xs text-gray-400">Verifying cryptographic keys...</span>
                    </div>
                ) : safetyCode ? (
                    <div className="mt-5 space-y-4">
                        {/* Visual Emojis */}
                        <div className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-4 text-2xl tracking-widest shadow-inner">
                            <span>{safetyCode.emojis}</span>
                        </div>

                        {/* Numerical Fingerprint */}
                        <div className="py-3 px-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
                            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                                12-Digit Identity Fingerprint
                            </span>
                            <span className="text-lg font-mono font-bold text-white tracking-widest">
                                {safetyCode.numeric}
                            </span>
                        </div>

                        {userJwk && partnerJwk && (
                            <div className="text-[10px] text-gray-500 font-mono flex justify-between px-2">
                                <span>My Key: {userJwk.x?.slice(0, 8)}...</span>
                                <span>Partner: {partnerJwk.x?.slice(0, 8)}...</span>
                            </div>
                        )}

                        <p className="text-[11px] text-gray-400 leading-relaxed px-2">
                            Compare these numbers or emojis with {partnerName} on a call or in person. If they match, your connection is guaranteed private with zero risk of interception.
                        </p>

                        <button
                            type="button"
                            onClick={handleCopy}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs transition cursor-pointer"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? 'Copied to Clipboard' : 'Copy Safety Code'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="mt-5 py-6 px-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex flex-col items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                        <span>Waiting for {partnerName} to open the app and generate their device E2EE key.</span>
                    </div>
                )}

                {/* Key Backup / Recovery Section */}
                <div className="mt-6 pt-5 border-t border-white/10 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-semibold text-gray-200">New Device Cloud Recovery</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasBackup ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}>
                            {hasBackup ? 'Backed Up' : 'No Backup'}
                        </span>
                    </div>

                    {!showPinInput ? (
                        <p className="text-[11px] text-gray-400 mt-2">
                            {hasBackup
                                ? 'Your private key is securely wrapped on the server with your Recovery PIN (PBKDF2 310k iterations).'
                                : 'Protect your keys so a new phone can restore your private conversations.'}
                            <button
                                type="button"
                                onClick={() => setShowPinInput(true)}
                                className="block mt-1 text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                            >
                                {hasBackup ? 'Update Recovery PIN' : 'Set Up Recovery PIN'}
                            </button>
                        </p>
                    ) : (
                        <form onSubmit={handleSetBackupPin} className="mt-3 space-y-2">
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={8}
                                value={recoveryPin}
                                onChange={(e) => setRecoveryPin(e.target.value)}
                                placeholder="Enter 4-8 digit Recovery PIN"
                                className="w-full text-center tracking-[0.3em] rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={pinLoading || recoveryPin.length < 4}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-xs hover:brightness-110 disabled:opacity-50 cursor-pointer"
                                >
                                    {pinLoading ? 'Saving...' : 'Save Encrypted Backup'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowPinInput(false); setRecoveryPin(''); }}
                                    className="py-2 px-3 rounded-xl bg-white/10 text-gray-300 text-xs hover:bg-white/15 cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

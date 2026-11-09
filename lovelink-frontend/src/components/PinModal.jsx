import React, { useState } from 'react';
import { Lock, X, KeyRound } from 'lucide-react';
import { setStoredVaultPin } from '../utils/crypto';

export default function PinModal({ isOpen, onClose, onConfirm, title = "Secret Safe", subtitle = "Enter your couple PIN to unlock encrypted notes" }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleNumberClick = (num) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const handleUnlock = () => {
        if (pin.length < 4) {
            setError('Please enter at least 4 digits');
            return;
        }
        setStoredVaultPin(pin);
        onConfirm(pin);
        setPin('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-sm rounded-3xl bg-brand-card border border-pink-500/30 p-6 shadow-2xl shadow-pink-950/50 text-center overflow-hidden">
                {/* Glow accent */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                    <Lock className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1 flex items-center justify-center gap-1.5">
                    {title}
                </h3>
                <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                    {subtitle}
                </p>

                {/* PIN Dots */}
                <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3].map((idx) => (
                        <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                                pin.length > idx
                                    ? 'bg-gradient-to-tr from-pink-500 to-purple-500 scale-110 shadow-[0_0_10px_rgba(236,72,153,0.8)]'
                                    : 'bg-white/10 border border-white/20'
                            }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-xs text-rose-400 mb-4 animate-shake">
                        {error}
                    </p>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleNumberClick(num)}
                            className="h-12 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-lg font-semibold text-white border border-white/10 transition flex items-center justify-center shadow-sm"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setPin('')}
                        className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 active:scale-95 transition flex items-center justify-center"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNumberClick(0)}
                        className="h-12 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-lg font-semibold text-white border border-white/10 transition flex items-center justify-center"
                    >
                        0
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 active:scale-95 transition flex items-center justify-center"
                    >
                        ⌫
                    </button>
                </div>

                <button
                    onClick={handleUnlock}
                    disabled={pin.length < 4}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                    <KeyRound className="w-4 h-4" />
                    Unlock Secret
                </button>
            </div>
        </div>
    );
}

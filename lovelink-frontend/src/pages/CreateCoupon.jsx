import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift } from 'lucide-react';
import api from '../api';

function CreateCoupon() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/dashboard').then(res => {
            if (!res.data.linked) navigate('/dashboard');
        }).catch(() => navigate('/dashboard'));
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        setSaving(true);
        setError('');
        try {
            await api.post('/coupons', {
                title: title.trim(),
                description: description.trim()
            });
            navigate('/coupons');
        } catch (err) {
            console.error(err);
            setError('Failed to create coupon. Try again.');
            setSaving(false);
        }
    };

    const SUGGESTIONS = [
        { t: 'Movie Choice 🍿', d: 'You pick the movie tonight, no questions asked!' },
        { t: '15 Min Massage 💆', d: 'Good for one back or foot rub.' },
        { t: 'Breakfast in Bed 🥞', d: 'I will make and serve you breakfast on a weekend.' },
        { t: "Winner's Choice 🏆", d: 'You decide what we do for our next date!' }
    ];

    return (
        <div className="min-h-screen bg-[#080612] text-white">
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080612]/80 px-4 py-4 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/coupons')} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-semibold">New Coupon 🎟️</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl shadow-xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
                            <Gift size={32} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-8">Send a surprise gift</h2>

                    {error && (
                        <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Title (The short pitch)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Free Coffee Delivery ☕"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-colors"
                                maxLength={100}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description (The fine print)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="I will DoorDash you your favorite coffee order whenever you decide to redeem this!"
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-colors resize-none"
                                maxLength={500}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !title.trim() || !description.trim()}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Creating...' : 'Create & Send Coupon'}
                        </button>
                    </form>

                    <div className="mt-10 border-t border-white/10 pt-8">
                        <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider text-center">Need inspiration?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {SUGGESTIONS.map((s, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setTitle(s.t); setDescription(s.d); }}
                                    className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                >
                                    <h4 className="font-semibold text-pink-300 mb-1">{s.t}</h4>
                                    <p className="text-xs text-gray-400">{s.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CreateCoupon;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle, Circle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api';

export default function BucketList() {
    const [items, setItems] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const fetchItems = async () => {
        try {
            const res = await api.get('/bucket-list');
            setItems(res.data);
        } catch (err) {
            console.error("Failed to fetch bucket list", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await api.post('/bucket-list', { text: inputText.trim() });
            setItems([res.data, ...items]);
            setInputText('');
        } catch (err) {
            console.error("Failed to add bucket list item", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleComplete = async (id) => {
        try {
            // Optimistically update
            setItems(items.map(item =>
                item.id === id ? { ...item, completed: true } : item
            ));

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#ec4899', '#3b82f6']
            });

            await api.put(`/bucket-list/${id}/complete`);
            fetchItems(); // refresh to get real dates/users
        } catch (err) {
            console.error("Failed to complete item", err);
            fetchItems(); // revert on fail
        }
    };

    const handleDelete = async (id) => {
        try {
            setItems(items.filter(item => item.id !== id));
            await api.delete(`/bucket-list/${id}`);
        } catch (err) {
            console.error("Failed to delete item", err);
            fetchItems();
        }
    };

    const activeItems = items.filter(i => !i.completed);
    const completedItems = items.filter(i => i.completed);

    return (
        <div className="min-h-screen bg-[#05080f] text-white p-4 pb-24">
            <div className="max-w-xl mx-auto pt-8">

                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Dashboard
                </button>

                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
                    Our Bucket List 🪣
                </h1>

                {/* Add Item Form */}
                <form onSubmit={handleAdd} className="relative mb-10">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Add a new adventure..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-500"
                        disabled={submitting}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || submitting}
                        className="absolute right-2 top-2 p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={24} />
                    </button>
                </form>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Active Items */}
                        <div className="space-y-3">
                            {activeItems.length === 0 && completedItems.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                    <p className="text-gray-400 text-lg">Add your first adventure together 🌟</p>
                                </div>
                            ) : activeItems.length === 0 ? (
                                <p className="text-center text-gray-500 py-4 italic">No pending adventures. Time to dream up some new ones!</p>
                            ) : (
                                activeItems.map((item) => (
                                    <div key={item.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleComplete(item.id)}>
                                            <button className="text-gray-400 hover:text-purple-400 transition-colors">
                                                <Circle size={24} />
                                            </button>
                                            <span className="text-lg text-gray-200">{item.text}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Completed Items */}
                        {completedItems.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-400 mb-4 flex items-center gap-2">
                                    <CheckCircle size={20} className="text-green-500" />
                                    Done & Dusted
                                </h2>
                                <div className="space-y-3">
                                    {completedItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl opacity-70">
                                            <div className="flex items-center gap-4">
                                                <CheckCircle size={24} className="text-green-500" />
                                                <div>
                                                    <span className="text-lg text-gray-400 line-through decoration-gray-500">{item.text}</span>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Completed {new Date(item.completed_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-gray-600 hover:text-red-400 transition-colors p-2"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

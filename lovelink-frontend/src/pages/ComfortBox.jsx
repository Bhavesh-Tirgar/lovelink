import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music, Image as ImageIcon, MessageCircle, ArrowLeft, Edit2, Check } from 'lucide-react';
import api from '../api';

export default function ComfortBox() {
    const [data, setData] = useState({
        comfort_message: '',
        spotify_url: '',
        pinned_photos: [],
        latest_note: null
    });
    const [loading, setLoading] = useState(true);
    const [, setError] = useState(null);

    // Edit states
    const [isEditingMsg, setIsEditingMsg] = useState(false);
    const [isEditingSpotify, setIsEditingSpotify] = useState(false);
    const [editMessage, setEditMessage] = useState('');
    const [editSpotifyUrl, setEditSpotifyUrl] = useState('');
    const navigate = useNavigate();

    const fetchComfortBox = async () => {
        try {
            const res = await api.get('/comfort');
            setData(res.data);
            setEditMessage(res.data.comfort_message || '');
            setEditSpotifyUrl(res.data.spotify_url || '');
        } catch (err) {
            setError('Failed to load Comfort Box');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComfortBox();
    }, []);

    const saveMessage = async () => {
        try {
            await api.post('/comfort/message', { message: editMessage });
            setData(prev => ({ ...prev, comfort_message: editMessage }));
            setIsEditingMsg(false);
        } catch (err) { }
    };

    const saveSpotify = async () => {
        try {
            await api.post('/comfort/spotify', { url: editSpotifyUrl });
            setData(prev => ({ ...prev, spotify_url: editSpotifyUrl }));
            setIsEditingSpotify(false);
        } catch (err) { }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#110e1b] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
            </div>
        );
    }

    // Extract Spotify iframe src from normal URL, or just use normal URL if they pasted iframe src
    let finalSpotifyUrl = data.spotify_url;
    if (finalSpotifyUrl && finalSpotifyUrl.includes('open.spotify.com')) {
        finalSpotifyUrl = finalSpotifyUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#110e1b] via-[#1a1122] to-[#24132b] text-white p-4 pb-24 relative overflow-hidden">

            {/* Floating gentle background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="max-w-2xl mx-auto pt-8 relative z-10">

                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-purple-300 hover:text-white mb-6 transition-colors font-medium bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/5 inline-flex w-auto"
                >
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Dashboard
                </button>

                <header className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 mb-4 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                        <Heart className="text-white fill-white animate-pulse" size={32} />
                    </div>
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
                        Comfort Box
                    </h1>
                    <p className="text-purple-300/70 mt-2 text-lg">Your safe space for when you miss them most.</p>
                </header>

                <div className="space-y-6">

                    {/* Section 1: Pinned Photos */}
                    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="text-purple-400" size={24} />
                            <h2 className="text-xl font-semibold text-purple-100 font-serif">A Glimpse of Us</h2>
                        </div>

                        {data.pinned_photos.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {data.pinned_photos.map((photo, i) => (
                                    <div key={photo.id} className={`rounded-xl overflow-hidden aspect-square ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                                        <img
                                            src={photo.url}
                                            alt="Comfort memory"
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                onClick={() => navigate('/album')}
                                className="bg-black/20 border border-white/5 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/30 transition-colors"
                            >
                                <p className="text-gray-400">Head to the Album to add some photos.</p>
                                <p className="text-xs text-purple-400 mt-2">Latest photos appear here</p>
                            </div>
                        )}
                    </section>

                    {/* Section 2: Latest Note */}
                    <section className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageCircle className="text-amber-400" size={24} />
                            <h2 className="text-xl font-semibold text-amber-100 font-serif">Latest Love Note</h2>
                        </div>

                        {data.latest_note ? (
                            <div className="relative z-10">
                                <h3 className="text-2xl font-serif text-white mb-2">{data.latest_note.title}</h3>
                                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {data.latest_note.text.length > 150 ? data.latest_note.text.substring(0, 150) + "..." : data.latest_note.text}
                                </p>
                                <button
                                    onClick={() => navigate('/notes')}
                                    className="mt-4 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                                >
                                    Read full note →
                                </button>
                            </div>
                        ) : (
                            <div className="bg-black/20 rounded-xl p-6 text-center">
                                <p className="text-gray-400 italic">No received notes yet.</p>
                            </div>
                        )}
                    </section>

                    {/* Section 3: Comfort Message */}
                    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💌</span>
                                <h2 className="text-xl font-semibold text-pink-100 font-serif">Message for You</h2>
                            </div>
                            {!isEditingMsg ? (
                                <button onClick={() => setIsEditingMsg(true)} className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full">
                                    <Edit2 size={16} />
                                </button>
                            ) : (
                                <button onClick={saveMessage} className="p-2 text-green-400 hover:text-green-300 transition-colors bg-green-500/20 rounded-full">
                                    <Check size={16} />
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-gray-500 mb-6 font-medium tracking-wide">Leave a reassuring message for when your partner opens this box.</p>

                        {isEditingMsg ? (
                            <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                placeholder="E.g., I love you so much. Close your eyes and take a deep breath. I'm right here with you."
                                className="w-full bg-black/30 border border-purple-500/30 rounded-xl p-4 text-white min-h-[120px] focus:outline-none focus:border-purple-500 resize-none font-serif text-lg leading-relaxed shadow-inner"
                            />
                        ) : (
                            <div className="min-h-[120px] flex items-center justify-center bg-black/20 rounded-xl p-6 border border-white/5 shadow-inner">
                                {data.comfort_message ? (
                                    <p className="font-serif text-xl text-center text-pink-100/90 leading-relaxed max-w-lg mx-auto italic">
                                        "{data.comfort_message}"
                                    </p>
                                ) : (
                                    <p className="text-gray-500 text-center">Tap the edit icon to write a comforting message.</p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Section 4: Our Playlist */}
                    <section className="bg-gradient-to-br from-green-500/10 to-teal-500/10 backdrop-blur-xl border border-green-500/20 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Music className="text-green-400" size={24} />
                                <h2 className="text-xl font-semibold text-green-100 font-serif">Our Playlist</h2>
                            </div>
                            {!isEditingSpotify ? (
                                <button onClick={() => setIsEditingSpotify(true)} className="p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full">
                                    <Edit2 size={16} />
                                </button>
                            ) : (
                                <button onClick={saveSpotify} className="p-2 text-green-400 hover:text-green-300 transition-colors bg-green-500/20 rounded-full">
                                    <Check size={16} />
                                </button>
                            )}
                        </div>

                        {isEditingSpotify ? (
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="url"
                                    value={editSpotifyUrl}
                                    onChange={(e) => setEditSpotifyUrl(e.target.value)}
                                    placeholder="Paste Spotify playlist URL..."
                                    className="flex-1 bg-black/30 border border-green-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 text-sm"
                                />
                            </div>
                        ) : null}

                        {finalSpotifyUrl ? (
                            <div className="bg-black/20 rounded-xl overflow-hidden h-[152px]">
                                <iframe
                                    title="Spotify Playlist"
                                    src={finalSpotifyUrl}
                                    width="100%"
                                    height="152"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                    className="border-0"
                                ></iframe>
                            </div>
                        ) : (
                            !isEditingSpotify && (
                                <div className="bg-black/20 border border-white/5 border-dashed rounded-xl p-8 text-center" onClick={() => setIsEditingSpotify(true)}>
                                    <p className="text-gray-400 cursor-pointer hover:text-green-400 transition-colors">Add your Spotify playlist URL</p>
                                </div>
                            )
                        )}
                    </section>

                </div>
            </div>
        </div>
    );
}

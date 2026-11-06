import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Search, Disc, ChevronUp, ChevronDown, Radio, Plus, Sparkles, Heart, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../api';

export default function FloatingMusicPlayer() {
    const {
        channels,
        customPlaylist,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isPlayerOpen,
        setIsPlayerOpen,
        djName,
        isSynced,
        playTrack,
        togglePlay,
        seek,
        changeVolume,
        playNext,
        playPrev,
        addCustomTrack
    } = useMusic();

    const location = useLocation();
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'stations' | 'custom'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const hiddenPaths = ['/login', '/signup', '/link'];
    if (hiddenPaths.includes(location.pathname) || location.pathname.startsWith('/call/')) {
        return null;
    }

    if (!currentTrack) return null;

    const formatTime = (secs) => {
        if (isNaN(secs) || secs < 0) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await api.get(`/music/search?q=${encodeURIComponent(searchQuery)}`);
            setSearchResults(res.data);
        } catch (err) {
            console.warn("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchTrack = (track) => {
        playTrack(track);
    };

    const handleAddToJukebox = async (track, e) => {
        e.stopPropagation();
        try {
            await addCustomTrack({
                title: track.title,
                artist: track.artist,
                videoId: track.videoId,
                url: track.url || '',
                cover: track.cover,
                type: track.type || 'youtube'
            });
            alert(`Added "${track.title}" to Our Jukebox!`);
        } catch (err) {
            alert("Could not add to jukebox.");
        }
    };

    const isYouTube = currentTrack?.type === 'youtube' || Boolean(currentTrack?.videoId);

    return (
        <>
            {/* ── HIDDEN / EMBEDDED YOUTUBE ENGINE WHEN YOUTUBE TRACK IS ACTIVE ── */}
            {isYouTube && currentTrack.videoId && (
                <div className="fixed -bottom-96 -left-96 w-10 h-10 opacity-0 pointer-events-none">
                    <iframe
                        id="yt-music-iframe"
                        title="YouTube Music Player"
                        width="200"
                        height="200"
                        src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&controls=0`}
                        allow="autoplay"
                    />
                </div>
            )}

            {/* ── EXPANDED FULL PLAYER MODAL ── */}
            {isPlayerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
                    <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-900/95 to-purple-950/95 border border-purple-500/30 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]">
                        
                        {/* Background subtle glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

                        {/* Top Bar */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isSynced ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                <span className="text-xs font-medium text-gray-300">
                                    {isSynced ? 'Synced With Partner 🟢' : 'Connecting...'}
                                </span>
                                {djName && (
                                    <span className="text-[11px] text-purple-300 px-2 py-0.5 rounded-full bg-purple-500/20">
                                        🎧 {djName} DJing
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsPlayerOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Center Vinyl & Track Info */}
                        <div className="flex items-center gap-4 my-4 px-2 flex-shrink-0 bg-white/5 p-3 rounded-2xl border border-white/5">
                            <div className={`relative w-20 h-20 rounded-full border-2 border-purple-400/40 shadow-xl overflow-hidden bg-black flex-shrink-0 flex items-center justify-center ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}>
                                <img
                                    src={currentTrack.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'}
                                    alt={currentTrack.title}
                                    className="w-full h-full object-cover opacity-85"
                                />
                                <div className="absolute w-6 h-6 rounded-full bg-gray-950 border border-pink-400 flex items-center justify-center">
                                    <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-white tracking-wide truncate">{currentTrack.title}</h3>
                                <p className="text-xs text-purple-300/80 truncate">{currentTrack.artist}</p>
                                <div className="flex items-center gap-3 mt-3">
                                    <button
                                        onClick={playPrev}
                                        className="p-1 text-gray-300 hover:text-white transition"
                                    >
                                        <SkipBack className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={togglePlay}
                                        className="p-2.5 bg-gradient-to-tr from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-full shadow-md transition active:scale-95"
                                    >
                                        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                                    </button>
                                    <button
                                        onClick={playNext}
                                        className="p-1 text-gray-300 hover:text-white transition"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 flex-shrink-0">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${activeTab === 'search' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Search className="w-3.5 h-3.5" /> Search Any Song
                                </button>
                                <button
                                    onClick={() => setActiveTab('stations')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${activeTab === 'stations' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Radio className="w-3.5 h-3.5" /> Radio
                                </button>
                                <button
                                    onClick={() => setActiveTab('custom')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition ${activeTab === 'custom' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Heart className="w-3.5 h-3.5" /> Jukebox ({customPlaylist.length})
                                </button>
                            </div>
                        </div>

                        {/* TAB CONTENT: SEARCH */}
                        {activeTab === 'search' && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <form onSubmit={handleSearch} className="flex gap-2 mb-3 flex-shrink-0">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search any song (e.g. Ed Sheeran, Arijit Singh)..."
                                            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                        />
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSearching}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition"
                                    >
                                        {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                                    </button>
                                </form>

                                {/* Search Results List */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {searchResults.length === 0 && !isSearching && (
                                        <div className="text-center py-10 text-gray-400 text-xs">
                                            Type any song or artist name above to find and play music together instantly!
                                        </div>
                                    )}

                                    {searchResults.map(song => (
                                        <div
                                            key={song.id}
                                            onClick={() => handleSelectSearchTrack(song)}
                                            className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-purple-600/20 border border-white/5 hover:border-purple-500/30 transition cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                <img
                                                    src={song.cover}
                                                    alt={song.title}
                                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-white truncate group-hover:text-pink-300 transition">{song.title}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{song.artist} • {song.duration_text}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 flex-shrink-0 pl-2">
                                                <button
                                                    onClick={(e) => handleAddToJukebox(song, e)}
                                                    title="Save to Our Jukebox"
                                                    className="p-1.5 text-gray-400 hover:text-pink-400 hover:bg-white/10 rounded-lg transition"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleSelectSearchTrack(song)}
                                                    className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-pink-600 transition"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: RADIO STATIONS */}
                        {activeTab === 'stations' && (
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {channels.map(channel => (
                                    <div key={channel.id} className="space-y-1.5">
                                        <div className="px-1">
                                            <p className="text-xs font-bold text-pink-300">{channel.name}</p>
                                            <p className="text-[10px] text-gray-400">{channel.description}</p>
                                        </div>
                                        {channel.tracks.map(track => (
                                            <div
                                                key={track.id}
                                                onClick={() => playTrack(track)}
                                                className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${currentTrack.id === track.id ? 'bg-purple-600/30 text-white border border-purple-500/50' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                                            >
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <img src={track.cover} alt={track.title} className="w-8 h-8 rounded-lg object-cover" />
                                                    <span className="truncate font-medium">{track.title}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono">{formatTime(track.duration)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* TAB CONTENT: JUKEBOX */}
                        {activeTab === 'custom' && (
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {customPlaylist.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-xs">
                                        Your shared jukebox is empty. Search any song in the **Search** tab and click **+** to save it here!
                                    </div>
                                ) : (
                                    customPlaylist.map(track => (
                                        <div
                                            key={track.id}
                                            onClick={() => playTrack(track)}
                                            className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${currentTrack.id === track.id ? 'bg-purple-600/30 text-white border border-purple-500/50' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <img src={track.cover} alt={track.title} className="w-8 h-8 rounded-lg object-cover" />
                                                <div className="truncate">
                                                    <p className="font-medium text-white truncate">{track.title}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-purple-300 font-mono">By {track.added_by}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* ── MINIMIZED FLOATING PILL (Docked right above bottom navigation) ── */}
            {!isPlayerOpen && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-auto min-w-[280px] max-w-md animate-slide-up">
                    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/70 hover:bg-black/85 backdrop-blur-2xl border border-purple-500/30 hover:border-pink-500/40 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all group">
                        
                        {/* Mini Spinning Album Art */}
                        <div
                            onClick={() => setIsPlayerOpen(true)}
                            className="cursor-pointer flex items-center gap-3 overflow-hidden flex-1"
                        >
                            <div className={`relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-purple-950 border border-purple-400/40 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                <img
                                    src={currentTrack.cover}
                                    alt={currentTrack.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-black border border-white/40" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{currentTrack.title}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-purple-300/80">
                                    <span className="truncate">{currentTrack.artist}</span>
                                    {isSynced && <span className="text-green-400 text-[8px]">● Live Sync</span>}
                                </div>
                            </div>
                        </div>

                        {/* Equalizer Bars Animation when playing */}
                        {isPlaying && (
                            <div className="flex items-end gap-0.5 h-3.5 px-1">
                                <span className="w-0.5 bg-pink-500 animate-[bounce_0.8s_infinite] rounded-full h-3" />
                                <span className="w-0.5 bg-purple-400 animate-[bounce_1.1s_infinite] rounded-full h-3.5" />
                                <span className="w-0.5 bg-pink-400 animate-[bounce_0.6s_infinite] rounded-full h-2" />
                            </div>
                        )}

                        {/* Quick Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={togglePlay}
                                className="p-1.5 text-white hover:text-pink-300 transition active:scale-90"
                            >
                                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                            </button>
                            <button
                                onClick={playNext}
                                className="p-1.5 text-gray-400 hover:text-white transition"
                            >
                                <SkipForward className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsPlayerOpen(true)}
                                className="p-1.5 text-gray-400 hover:text-white transition ml-0.5"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}

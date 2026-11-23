import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { 
    Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, 
    Search, ChevronDown, Radio, Plus, Heart, Loader2, 
    Volume2, VolumeX, Sparkles, Disc, ListMusic, Check
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import toast from 'react-hot-toast';

export default function FloatingMusicPlayer() {
    const {
        channels,
        customPlaylist,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        seek,
        changeVolume,
        isPlayerOpen,
        setIsPlayerOpen,
        djName,
        isSynced,
        isShuffle,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        likedTracks,
        toggleLikeTrack,
        isLiked,
        playTrack,
        togglePlay,
        playNext,
        playPrev,
        addCustomTrack
    } = useMusic();

    const location = useLocation();
    const [activeTab, setActiveTab] = useState('stations'); // 'stations' | 'search' | 'jukebox'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addedId, setAddedId] = useState(null);

    const hiddenPaths = ['/login', '/signup', '/link'];
    if (hiddenPaths.includes(location.pathname) || location.pathname.startsWith('/call/')) {
        return null;
    }

    if (!currentTrack) return null;

    const isChat = location.pathname === '/chat';

    const formatTime = (secs) => {
        if (isNaN(secs) || secs < 0) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const totalDuration = duration || currentTrack.duration || 210;
    const progressPercent = Math.min(100, Math.max(0, (currentTime / (totalDuration || 1)) * 100));

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await api.get(`/music/search?q=${encodeURIComponent(searchQuery)}`);
            setSearchResults(res.data);
        } catch (err) {
            console.warn("Search failed:", err);
            toast.error("Could not search YouTube music");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchTrack = (track) => {
        playTrack(track);
        toast.success(`Playing "${track.title}" 🎵`);
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
            setAddedId(track.id || track.videoId);
            setTimeout(() => setAddedId(null), 2000);
            toast.success(`Added "${track.title}" to Jukebox Queue!`);
        } catch (err) {
            toast.error("Could not add to Jukebox.");
        }
    };

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 1. SPOTIFY MINI PLAYER (STICKY BOTTOM BAR)                        */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {!isPlayerOpen && (
                isChat ? (
                    /* Floating compact pill on /chat page so chat input remains completely unobstructed */
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed top-16 right-3 sm:right-6 z-30"
                    >
                        <div
                            onClick={() => setIsPlayerOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121212]/95 border border-[#1DB954]/30 text-white text-xs shadow-2xl backdrop-blur-xl cursor-pointer hover:bg-[#202020] hover:border-[#1DB954]/60 transition-all select-none"
                        >
                            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 relative">
                                <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
                                {isPlaying && <div className="absolute inset-0 bg-[#1DB954]/20 animate-pulse" />}
                            </div>
                            <span className="truncate max-w-[110px] font-medium text-[11px] text-gray-200">
                                {currentTrack.title}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="w-6 h-6 rounded-full bg-[#1DB954] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                            >
                                {isPlaying ? <Pause size={10} className="fill-black" /> : <Play size={10} className="fill-black ml-0.5" />}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    /* Full Spotify Mini Bar on all regular pages */
                    <div className="fixed bottom-20 sm:bottom-24 left-0 right-0 z-40 px-3 sm:px-4 max-w-xl mx-auto pointer-events-auto">
                        <div
                            onClick={() => setIsPlayerOpen(true)}
                            className="relative flex items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-[#121212]/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)] hover:bg-[#181818] transition-all cursor-pointer overflow-hidden group select-none"
                        >
                            {/* Track Info (Left) */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-[#282828] shadow-md border border-white/5">
                                    <img
                                        src={currentTrack.cover}
                                        alt={currentTrack.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {isPlaying && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                                            <span className="w-0.5 h-3 bg-[#1DB954] animate-[bounce_0.8s_infinite] rounded-full" />
                                            <span className="w-0.5 h-4 bg-[#1DB954] animate-[bounce_1.1s_infinite] rounded-full" />
                                            <span className="w-0.5 h-2 bg-[#1DB954] animate-[bounce_0.6s_infinite] rounded-full" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-bold text-white tracking-tight truncate group-hover:text-[#1DB954] transition-colors">
                                        {currentTrack.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#b3b3b3] truncate mt-0.5">
                                        <span className="truncate">{currentTrack.artist}</span>
                                        <span className="text-[#1DB954] text-[9px] font-bold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                                            <span>{isSynced ? 'Jam Synced' : 'Ready'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Controls (Right) */}
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleLikeTrack(currentTrack); }}
                                    className="p-1.5 text-gray-400 hover:text-white transition active:scale-90"
                                    title="Save to Liked Songs"
                                >
                                    <Heart
                                        size={18}
                                        className={isLiked(currentTrack) ? "text-[#1DB954] fill-[#1DB954] animate-pulse" : ""}
                                    />
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md flex-shrink-0"
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause size={16} className="fill-black" /> : <Play size={16} className="fill-black ml-0.5" />}
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); playNext(); }}
                                    className="p-1.5 text-gray-400 hover:text-white transition active:scale-90"
                                    title="Next Song"
                                >
                                    <SkipForward size={18} />
                                </button>
                            </div>

                            {/* Spotify Real-Time Bottom Progress Line */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10">
                                <div
                                    className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-400 transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 2. SPOTIFY FULL PLAYER (EXPANDED IMMERSIVE DRAWER)                */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isPlayerOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-0 sm:p-4 select-none"
                    >
                        <div className="relative w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-lg bg-gradient-to-b from-[#181818] via-[#121212] to-black sm:border sm:border-white/10 sm:rounded-[32px] p-5 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden">

                            {/* Spotify Header Bar */}
                            <div className="flex items-center justify-between pb-3 flex-shrink-0">
                                <button
                                    onClick={() => setIsPlayerOpen(false)}
                                    className="p-2 text-[#b3b3b3] hover:text-white rounded-full hover:bg-white/10 transition active:scale-90"
                                    title="Minimize Player"
                                >
                                    <ChevronDown size={22} />
                                </button>

                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#b3b3b3]">
                                        PLAYING FROM PLAYLIST
                                    </p>
                                    <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                                        <Sparkles size={12} className="text-[#1DB954]" />
                                        <span>LoveLink Couple Jam</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#1DB954]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                                    <span>{djName ? `DJ: ${djName}` : (isSynced ? 'Jam Synced' : 'Solo')}</span>
                                </div>
                            </div>

                            {/* Album Artwork Section */}
                            <div className="flex-1 flex flex-col justify-center items-center py-4 my-auto min-h-0">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 group"
                                >
                                    <img
                                        src={currentTrack.cover}
                                        alt={currentTrack.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    {/* Spotify Vinyl Center Ring */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-gray-300 font-mono">
                                        <Disc size={12} className={isPlaying ? "animate-spin text-[#1DB954]" : "text-gray-400"} />
                                        <span>{currentTrack.type === 'youtube' ? 'YouTube Master Audio' : 'Studio Stereo'}</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Song Info & Heart Action */}
                            <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                                        {currentTrack.title}
                                    </h2>
                                    <p className="text-sm font-medium text-[#b3b3b3] truncate mt-0.5">
                                        {currentTrack.artist}
                                    </p>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => toggleLikeTrack(currentTrack)}
                                    className="p-2.5 text-gray-400 hover:text-white rounded-full transition flex-shrink-0"
                                    title="Save to Liked Songs"
                                >
                                    <Heart
                                        size={24}
                                        className={isLiked(currentTrack) ? "text-[#1DB954] fill-[#1DB954] drop-shadow-[0_0_10px_rgba(29,185,84,0.6)]" : ""}
                                    />
                                </motion.button>
                            </div>

                            {/* Scrubber Seek Bar */}
                            <div className="flex flex-col gap-1.5 mb-4 flex-shrink-0">
                                <div className="relative flex items-center">
                                    <input
                                        type="range"
                                        min="0"
                                        max={Math.max(totalDuration, 1)}
                                        value={currentTime || 0}
                                        onChange={(e) => seek(Number(e.target.value))}
                                        className="w-full h-1.5 bg-[#404040] rounded-lg appearance-none cursor-pointer accent-[#1DB954] hover:accent-emerald-400 transition"
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-[#b3b3b3] font-mono px-0.5">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(totalDuration)}</span>
                                </div>
                            </div>

                            {/* Main Spotify Controls Row */}
                            <div className="flex items-center justify-between mb-5 px-2 flex-shrink-0">
                                <button
                                    onClick={toggleShuffle}
                                    className={`p-2 transition relative ${isShuffle ? 'text-[#1DB954]' : 'text-[#b3b3b3] hover:text-white'}`}
                                    title={isShuffle ? "Shuffle On" : "Shuffle Off"}
                                >
                                    <Shuffle size={20} />
                                    {isShuffle && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />}
                                </button>

                                <button
                                    onClick={playPrev}
                                    className="p-2 text-[#b3b3b3] hover:text-white active:scale-90 transition"
                                    title="Previous"
                                >
                                    <SkipBack size={26} />
                                </button>

                                <motion.button
                                    whileTap={{ scale: 0.92 }}
                                    whileHover={{ scale: 1.06 }}
                                    onClick={togglePlay}
                                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/10 hover:bg-gray-100 transition-all flex-shrink-0"
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause size={26} className="fill-black" /> : <Play size={26} className="fill-black ml-1" />}
                                </motion.button>

                                <button
                                    onClick={playNext}
                                    className="p-2 text-[#b3b3b3] hover:text-white active:scale-90 transition"
                                    title="Next"
                                >
                                    <SkipForward size={26} />
                                </button>

                                <button
                                    onClick={toggleRepeat}
                                    className={`p-2 transition relative ${repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-[#b3b3b3] hover:text-white'}`}
                                    title={`Repeat Mode: ${repeatMode.toUpperCase()}`}
                                >
                                    {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                                    {repeatMode !== 'off' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />}
                                </button>
                            </div>

                            {/* Secondary Controls Bar: Volume & Navigation Tabs */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-shrink-0 mb-3">
                                <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                                    <button
                                        onClick={() => changeVolume(volume > 0 ? 0 : 0.8)}
                                        className="text-[#b3b3b3] hover:text-white"
                                    >
                                        {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volume}
                                        onChange={(e) => changeVolume(Number(e.target.value))}
                                        className="w-full h-1 bg-[#404040] rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                                    />
                                </div>

                                <div className="flex items-center gap-1 bg-[#242424] p-1 rounded-xl">
                                    {[
                                        { id: 'stations', label: 'Stations', icon: Radio },
                                        { id: 'search', label: 'Search', icon: Search },
                                        { id: 'jukebox', label: 'Jukebox', icon: ListMusic },
                                    ].map(tab => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                                    activeTab === tab.id
                                                        ? 'bg-[#1DB954] text-black shadow'
                                                        : 'text-[#b3b3b3] hover:text-white'
                                                }`}
                                            >
                                                <Icon size={12} />
                                                <span>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tab Drawer Content Area */}
                            <div className="h-44 overflow-y-auto pr-1 custom-scrollbar">
                                {/* TAB 1: CURATED STATIONS */}
                                {activeTab === 'stations' && (
                                    <div className="space-y-2.5">
                                        {channels.map(channel => (
                                            <div key={channel.id} className="space-y-1">
                                                <p className="text-[11px] font-bold text-[#1DB954] uppercase tracking-wider px-1">
                                                    {channel.title || channel.name}
                                                </p>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {channel.tracks?.map(track => {
                                                        const isSelected = (currentTrack.id === track.id) || (track.videoId && track.videoId === currentTrack.videoId);
                                                        return (
                                                            <div
                                                                key={track.id}
                                                                onClick={() => playTrack(track)}
                                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                                                                    isSelected
                                                                        ? 'bg-[#1DB954]/20 border border-[#1DB954]/40 text-white'
                                                                        : 'bg-[#242424]/60 hover:bg-[#282828] text-[#b3b3b3]'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 truncate flex-1">
                                                                    <img src={track.cover} alt={track.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                                                    <div className="truncate">
                                                                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1DB954]' : 'text-white'}`}>
                                                                            {track.title}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-mono text-gray-400 pl-2">
                                                                    {formatTime(track.duration)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* TAB 2: INSTANT YOUTUBE SEARCH */}
                                {activeTab === 'search' && (
                                    <div className="space-y-2">
                                        <form onSubmit={handleSearch} className="flex gap-2 mb-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    placeholder="Search any song (e.g. Arijit Singh, Ed Sheeran, Diljit)..."
                                                    className="w-full pl-8 pr-3 py-1.5 bg-[#242424] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
                                                />
                                                <Search size={14} className="text-gray-400 absolute left-2.5 top-2.5" />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isSearching}
                                                className="px-3 py-1.5 bg-[#1DB954] hover:bg-emerald-400 text-black text-xs font-bold rounded-xl flex items-center gap-1 transition disabled:opacity-50"
                                            >
                                                {isSearching ? <Loader2 size={12} className="animate-spin" /> : 'Search'}
                                            </button>
                                        </form>

                                        {searchResults.length === 0 && !isSearching && (
                                            <p className="text-center text-xs text-gray-400 py-6">
                                                Type any song name above to search Spotify & YouTube in real time!
                                            </p>
                                        )}

                                        <div className="space-y-1">
                                            {searchResults.map(song => (
                                                <div
                                                    key={song.id}
                                                    onClick={() => handleSelectSearchTrack(song)}
                                                    className="flex items-center justify-between p-2 rounded-xl bg-[#242424]/60 hover:bg-[#282828] cursor-pointer transition group"
                                                >
                                                    <div className="flex items-center gap-2.5 truncate flex-1">
                                                        <img src={song.cover} alt={song.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                                        <div className="truncate">
                                                            <p className="text-xs font-semibold text-white truncate group-hover:text-[#1DB954] transition">
                                                                {song.title}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 truncate">{song.artist}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 pl-2 flex-shrink-0">
                                                        <button
                                                            onClick={(e) => handleAddToJukebox(song, e)}
                                                            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                                                            title="Add to Jukebox"
                                                        >
                                                            {addedId === (song.id || song.videoId) ? (
                                                                <Check size={14} className="text-[#1DB954]" />
                                                            ) : (
                                                                <Plus size={14} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSelectSearchTrack(song)}
                                                            className="p-1 bg-[#1DB954] text-black rounded-lg hover:scale-105 transition"
                                                        >
                                                            <Play size={12} className="fill-black" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: COUPLE JUKEBOX QUEUE & LIKED SONGS */}
                                {activeTab === 'jukebox' && (
                                    <div className="space-y-3">
                                        {/* Liked Songs Quick Pill */}
                                        {likedTracks.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-[#1DB954] uppercase tracking-wider px-1 flex items-center gap-1">
                                                    <Heart size={12} className="fill-[#1DB954]" />
                                                    <span>Your Liked Songs ({likedTracks.length})</span>
                                                </p>
                                                <div className="space-y-1">
                                                    {likedTracks.map(track => (
                                                        <div
                                                            key={track.id || track.videoId}
                                                            onClick={() => playTrack(track)}
                                                            className="flex items-center justify-between p-2 rounded-xl bg-[#242424]/60 hover:bg-[#282828] cursor-pointer transition"
                                                        >
                                                            <div className="flex items-center gap-2 truncate flex-1">
                                                                <img src={track.cover} alt={track.title} className="w-8 h-8 rounded-lg object-cover" />
                                                                <p className="text-xs font-medium text-white truncate">{track.title}</p>
                                                            </div>
                                                            <Play size={12} className="text-[#1DB954] fill-[#1DB954]" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom Playlist Queue */}
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                                                Our Jukebox Queue ({customPlaylist?.length || 0})
                                            </p>
                                            {(!customPlaylist || customPlaylist.length === 0) ? (
                                                <p className="text-xs text-gray-500 py-3 text-center">
                                                    No songs added yet. Search any YouTube song to add!
                                                </p>
                                            ) : (
                                                customPlaylist.map(track => (
                                                    <div
                                                        key={track.id}
                                                        onClick={() => playTrack(track)}
                                                        className="flex items-center justify-between p-2 rounded-xl bg-[#242424]/60 hover:bg-[#282828] cursor-pointer transition"
                                                    >
                                                        <div className="flex items-center gap-2 truncate flex-1">
                                                            <img src={track.cover} alt={track.title} className="w-8 h-8 rounded-lg object-cover" />
                                                            <div className="truncate">
                                                                <p className="text-xs font-medium text-white truncate">{track.title}</p>
                                                                <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                                                            </div>
                                                        </div>
                                                        <Play size={12} className="text-white fill-white" />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

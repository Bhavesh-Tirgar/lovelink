import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Trash2, ChevronLeft, ChevronRight, FolderPlus, Play } from 'lucide-react';
import api from '../api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

// ── Lazy Image ────────────────────────────────────────────────────────────────
function LazyImg({ src, alt, className, onClick }) {
    const ref = useRef(null);
    const [loaded, setLoaded] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '200px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div ref={ref} className={`${className} bg-white/5 overflow-hidden`} onClick={onClick}>
            {visible && (
                <img
                    src={src} alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                />
            )}
        </div>
    );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ items, startIndex, myUserId, onClose, onDelete }) {
    const [idx, setIdx] = useState(startIndex);
    const item = items[idx];
    const touchStartX = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, items.length - 1));
            if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [items.length, onClose]);

    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 60) setIdx(i => Math.max(i - 1, 0));
        if (dx < -60) setIdx(i => Math.min(i + 1, items.length - 1));
        touchStartX.current = null;
    };

    if (!item) return null;
    const isMine = String(item.uploaded_by) === String(myUserId);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        >
            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                {isMine && (
                    <button onClick={() => { onDelete(item.id); if (idx >= items.length - 1) setIdx(Math.max(0, idx - 1)); }}
                        className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
                        <Trash2 size={18} />
                    </button>
                )}
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Prev / Next */}
            {idx > 0 && (
                <button onClick={() => setIdx(i => i - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
            )}
            {idx < items.length - 1 && (
                <button onClick={() => setIdx(i => i + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <ChevronRight size={24} />
                </button>
            )}

            {/* Image / Video */}
            <div className="max-w-[90vw] max-h-[80vh] flex items-center justify-center">
                {item.file_type === 'video' ? (
                    <video src={item.file_url} controls className="max-w-full max-h-[80vh] rounded-2xl" />
                ) : (
                    <img src={item.file_url} alt={item.caption || ''} className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
                )}
            </div>

            {/* Caption + counter */}
            <div className="mt-4 text-center px-6">
                {item.caption && <p className="text-white text-sm mb-1">{item.caption}</p>}
                <p className="text-gray-500 text-xs">By {item.uploader_name} · {timeAgo(item.created_at)}</p>
                <p className="text-gray-600 text-xs mt-1">{idx + 1} / {items.length}</p>
            </div>
        </div>
    );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ albums, onClose, onUploaded }) {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [captions, setCaptions] = useState({});
    const [albumId, setAlbumId] = useState('');
    const [takenAt, setTakenAt] = useState('');
    const [progress, setProgress] = useState({});
    const [uploading, setUploading] = useState(false);
    const [done, setDone] = useState([]);
    const dropRef = useRef(null);

    const addFiles = (newFiles) => {
        const arr = Array.from(newFiles);
        setFiles(prev => [...prev, ...arr]);
        arr.forEach(f => {
            const url = URL.createObjectURL(f);
            setPreviews(prev => [...prev, { name: f.name, url, isVideo: f.type.startsWith('video/') }]);
        });
    };

    const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
    const handleDragOver = (e) => e.preventDefault();

    const uploadAll = async () => {
        setUploading(true);
        const uploaded = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const fd = new FormData();
            fd.append('file', f);
            if (captions[i]) fd.append('caption', captions[i]);
            if (albumId) fd.append('album_id', albumId);
            if (takenAt) fd.append('taken_at', new Date(takenAt).toISOString());
            try {
                const res = await api.post('/media/upload', fd, {
                    onUploadProgress: (e) => {
                        const pct = Math.round((e.loaded * 100) / (e.total || 1));
                        setProgress(prev => ({ ...prev, [i]: pct }));
                    },
                });
                uploaded.push(res.data);
                setDone(prev => [...prev, i]);
            } catch (err) {
                console.error(`Upload failed for ${f.name}`, err);
            }
        }
        setUploading(false);
        onUploaded(uploaded);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-lg bg-[#0d0f1a] border border-white/10 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">Upload Memories 📸</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400"><X size={18} /></button>
                </div>

                {/* Drop zone */}
                <div
                    ref={dropRef}
                    onDrop={handleDrop} onDragOver={handleDragOver}
                    onClick={() => document.getElementById('media-file-input').click()}
                    className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors mb-4"
                >
                    <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                    <p className="text-gray-400 text-sm">Drag &amp; drop or click to select</p>
                    <p className="text-gray-600 text-xs mt-1">Images &amp; videos supported</p>
                    <input id="media-file-input" type="file" multiple accept="image/*,video/*" className="hidden"
                        onChange={e => addFiles(e.target.files)} />
                </div>

                {/* Previews */}
                {previews.length > 0 && (
                    <div className="space-y-3 mb-4">
                        {previews.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
                                    {p.isVideo ? <Play size={20} className="text-gray-400" /> :
                                        <img src={p.url} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-400 truncate mb-1">{p.name}</p>
                                    <input
                                        type="text"
                                        placeholder="Caption (optional)"
                                        value={captions[i] || ''}
                                        onChange={e => setCaptions(prev => ({ ...prev, [i]: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none"
                                    />
                                </div>
                                {/* Progress */}
                                {uploading && progress[i] !== undefined && (
                                    <div className="w-10 text-xs text-purple-300 text-right">{done.includes(i) ? '✓' : `${progress[i]}%`}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Options */}
                <div className="flex gap-3 mb-5">
                    <select value={albumId} onChange={e => setAlbumId(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none">
                        <option value="">No album</option>
                        {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input type="date" value={takenAt} onChange={e => setTakenAt(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" />
                </div>

                <button onClick={uploadAll} disabled={uploading || files.length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-50">
                    {uploading ? 'Uploading...' : `Upload ${files.length || ''} file${files.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
}

// ── Masonry Grid ──────────────────────────────────────────────────────────────
function MasonryGrid({ items, myUserId, onPhotoClick }) {
    return (
        <div style={{ columnCount: window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1, columnGap: 8 }}>
            {items.map((item, i) => (
                <div key={item.id} className="mb-2 break-inside-avoid rounded-xl overflow-hidden cursor-pointer relative group"
                    style={{ display: 'inline-block', width: '100%' }}
                    onClick={() => onPhotoClick(i)}>
                    {item.file_type === 'video' ? (
                        <div className="w-full bg-black/40 flex items-center justify-center" style={{ minHeight: 120 }}>
                            {item.thumbnail_url
                                ? <img src={item.thumbnail_url} alt="" className="w-full object-cover" />
                                : <div className="flex flex-col items-center py-10"><Play size={36} className="text-gray-400" /><p className="text-xs text-gray-500 mt-2">Video</p></div>
                            }
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"><Play size={18} className="text-white ml-0.5" /></div>
                            </div>
                        </div>
                    ) : (
                        <LazyImg
                            src={item.thumbnail_url || item.file_url}
                            alt={item.caption || ''}
                            className="w-full rounded-xl"
                        />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-end p-3 opacity-0 group-hover:opacity-100">
                        {item.caption && <p className="text-white text-xs line-clamp-2">{item.caption}</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Albums Tab ────────────────────────────────────────────────────────────────
function AlbumsTab({ albums, myUserId, onAlbumClick, onAlbumDelete, onAlbumCreate }) {
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try { await onAlbumCreate(newName.trim()); setNewName(''); }
        finally { setCreating(false); }
    };

    return (
        <div>
            {/* Create album */}
            <div className="flex gap-2 mb-6">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="New album name..."
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                <button onClick={handleCreate} disabled={creating || !newName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-50">
                    <FolderPlus size={16} /> Create
                </button>
            </div>

            {albums.length === 0 ? (
                <div className="text-center py-16 text-gray-500">No albums yet. Create one above.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {albums.map(album => (
                        <div key={album.id} className="relative rounded-2xl border border-white/10 overflow-hidden cursor-pointer group hover:border-purple-500/30 transition-all"
                            onClick={() => onAlbumClick(album)}>
                            <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
                                {album.cover_url
                                    ? <img src={album.cover_url} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    : <div className="text-4xl">🖼️</div>}
                            </div>
                            <div className="p-3">
                                <p className="font-medium text-gray-200 text-sm">{album.name}</p>
                                <p className="text-xs text-gray-500">{album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}</p>
                            </div>
                            {/* Delete */}
                            {String(album.created_by) === String(myUserId) && (
                                <button onClick={e => { e.stopPropagation(); onAlbumDelete(album.id); }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/30 rounded-lg text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function Album() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('photos');
    const [photos, setPhotos] = useState([]);
    const [videos, setVideos] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [onThisDay, setOnThisDay] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [lightbox, setLightbox] = useState(null); // { items, startIndex }
    const [myUserId, setMyUserId] = useState(null);
    const [activeAlbum, setActiveAlbum] = useState(null);
    const bottomRef = useRef(null);

    const fetchPhotos = useCallback(async (reset = false) => {
        const skip = reset ? 0 : photos.length;
        const res = await api.get(`/media?file_type=photo&skip=${skip}&limit=24${activeAlbum ? `&album_id=${activeAlbum.id}` : ''}`);
        if (reset) setPhotos(res.data); else setPhotos(prev => [...prev, ...res.data]);
        setHasMore(res.data.length === 24);
    }, [photos.length, activeAlbum]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [dashRes, photoRes, videoRes, albumRes, otdRes] = await Promise.all([
                api.get('/dashboard'),
                api.get(`/media?file_type=photo&skip=0&limit=24${activeAlbum ? `&album_id=${activeAlbum.id}` : ''}`),
                api.get('/media?file_type=video&skip=0&limit=24'),
                api.get('/media/albums'),
                api.get('/media/on-this-day'),
            ]);
            setMyUserId(dashRes.data.my_user.id);
            setPhotos(photoRes.data);
            setHasMore(photoRes.data.length === 24);
            setVideos(videoRes.data);
            setAlbums(albumRes.data);
            setOnThisDay(otdRes.data);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate, activeAlbum]);

    useEffect(() => { fetchAll(); }, []);  // initial load only

    // Infinite scroll observer
    useEffect(() => {
        const el = bottomRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(async ([entry]) => {
            if (entry.isIntersecting && hasMore && !loadingMore && tab === 'photos') {
                setLoadingMore(true);
                await fetchPhotos(false);
                setLoadingMore(false);
            }
        }, { rootMargin: '200px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [hasMore, loadingMore, tab, fetchPhotos]);

    const handleDelete = async (mediaId) => {
        try {
            await api.delete(`/media/${mediaId}`);
            setPhotos(prev => prev.filter(p => p.id !== mediaId));
            setVideos(prev => prev.filter(v => v.id !== mediaId));
        } catch (err) { console.error(err); }
    };

    const handleAlbumCreate = async (name) => {
        const res = await api.post('/media/albums', { name });
        setAlbums(prev => [...prev, res.data]);
    };

    const handleAlbumDelete = async (albumId) => {
        await api.delete(`/media/albums/${albumId}`);
        setAlbums(prev => prev.filter(a => a.id !== albumId));
        if (activeAlbum?.id === albumId) setActiveAlbum(null);
    };

    const currentItems = tab === 'videos' ? videos : photos;

    return (
        <div className="min-h-screen bg-[#05080f] text-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-gray-300">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold">Memory Album 🖼️</h1>
                        {activeAlbum && (
                            <button onClick={() => setActiveAlbum(null)} className="text-xs text-purple-400 hover:underline">
                                ← {activeAlbum.name}
                            </button>
                        )}
                    </div>
                </div>
                <button onClick={() => setShowUpload(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium shadow-lg transition-all">
                    <Upload size={15} /> Upload
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 mx-5 mt-5 bg-white/5 rounded-xl p-1 max-w-xs">
                {[['photos', '📷 Photos'], ['videos', '🎥 Videos'], ['albums', '📁 Albums']].map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-white/10 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-24 text-gray-500">Loading...</div>
                ) : (
                    <>
                        {/* On This Day */}
                        {tab === 'photos' && !activeAlbum && onThisDay.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-sm font-medium text-gray-400 mb-3">📅 On This Day</h2>
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {onThisDay.map(group => (
                                        <div key={group.year} className="flex-shrink-0">
                                            <p className="text-xs text-gray-500 mb-2">{new Date().getFullYear() - group.year} year{new Date().getFullYear() - group.year !== 1 ? 's' : ''} ago</p>
                                            <div className="flex gap-2">
                                                {group.photos.slice(0, 4).map(p => (
                                                    <img key={p.id} src={p.thumbnail_url || p.file_url} alt=""
                                                        className="w-20 h-20 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => setLightbox({ items: group.photos, startIndex: 0 })} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {tab === 'albums' ? (
                            <AlbumsTab
                                albums={albums} myUserId={myUserId}
                                onAlbumClick={(a) => { setActiveAlbum(a); setTab('photos'); }}
                                onAlbumDelete={handleAlbumDelete}
                                onAlbumCreate={handleAlbumCreate}
                            />
                        ) : currentItems.length === 0 ? (
                            <div className="text-center py-24">
                                <p className="text-4xl mb-3">📷</p>
                                <p className="text-gray-300 text-lg font-medium mb-2">No memories yet</p>
                                <p className="text-gray-500 text-sm mb-6">Upload your first {tab === 'videos' ? 'video' : 'photo'} together</p>
                                <button onClick={() => setShowUpload(true)}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium transition-all">
                                    <Upload size={16} className="inline mr-2" />Upload
                                </button>
                            </div>
                        ) : (
                            <>
                                <MasonryGrid items={currentItems} myUserId={myUserId}
                                    onPhotoClick={(i) => setLightbox({ items: currentItems, startIndex: i })} />
                                <div ref={bottomRef} className="h-4" />
                                {loadingMore && <div className="text-center py-4 text-gray-500 text-sm">Loading more...</div>}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* Modals */}
            {showUpload && (
                <UploadModal
                    albums={albums}
                    onClose={() => setShowUpload(false)}
                    onUploaded={(newItems) => {
                        setPhotos(prev => [...newItems.filter(i => i.file_type === 'photo'), ...prev]);
                        setVideos(prev => [...newItems.filter(i => i.file_type === 'video'), ...prev]);
                    }}
                />
            )}
            {lightbox && (
                <Lightbox
                    items={lightbox.items}
                    startIndex={lightbox.startIndex}
                    myUserId={myUserId}
                    onClose={() => setLightbox(null)}
                    onDelete={(id) => { handleDelete(id); setLightbox(null); }}
                />
            )}
        </div>
    );
}

export default Album;

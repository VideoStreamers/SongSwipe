import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, ChevronRight, CheckCircle } from 'lucide-react';
import * as SpotifyApi from '../services/spotifyApi';
import './CurationSidebar.css';

const CurationSidebar = ({ isOpen, onToggle, song, user, onActionComplete }) => {
    const [playlists, setPlaylists] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [recentlyAdded, setRecentlyAdded] = useState(null);

    useEffect(() => {
        if (isOpen) {
            SpotifyApi.getUserPlaylists().then(data => {
                setPlaylists(data || []);
            });
        }
    }, [isOpen]);

    const handleAdd = async (playlist) => {
        try {
            await SpotifyApi.addToPlaylist(playlist.id, song.uri);
            setRecentlyAdded(playlist.name);
            onActionComplete({ success: true, message: `Added to ${playlist.name}` });
            setTimeout(() => setRecentlyAdded(null), 3000);
        } catch (e) {
            console.error(e);
            onActionComplete({ success: false, message: "Failed to add" });
        }
    };

    const handleCreate = async () => {
        if (!newPlaylistName.trim() || !user?.id) return;
        try {
            const newPl = await SpotifyApi.createPlaylist(user.id, newPlaylistName);
            await SpotifyApi.addToPlaylist(newPl.id, song.uri);
            setPlaylists(prev => [newPl, ...prev]);
            setIsCreating(false);
            setNewPlaylistName('');
            onActionComplete({ success: true, message: `Created & Added to ${newPl.name}` });
        } catch (e) {
            console.error(e);
            onActionComplete({ success: false, message: "Create Failed" });
        }
    };

    const filtered = playlists.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            {/* FLOATING ACTION TAB (Always visible when sidebar is closed) */}
            <motion.div
                className={`curation-tab ${isOpen ? 'hidden' : ''}`}
                onClick={onToggle}
                whileHover={{ x: -10, backgroundColor: 'var(--vibe-primary)' }}
                initial={false}
            >
                <Plus size={22} color="white" />
            </motion.div>

            <motion.div
                className="curation-container"
                initial={false}
                animate={{
                    x: isOpen ? 0 : 320,
                    opacity: isOpen ? 1 : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
                <div className="curation-header">
                    <motion.div
                        onClick={onToggle}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="curation-toggle"
                    >
                        <ChevronRight size={24} />
                    </motion.div>
                    <h3>Curate Vibe</h3>
                </div>

                {song && (
                    <div className="current-curation-info">
                        <img src={song.album.images[song.album.images.length - 1].url} alt="" />
                        <div className="curation-text">
                            <strong>{song.name}</strong>
                            <span>{song.artists[0].name}</span>
                        </div>
                    </div>
                )}

                <div className="curation-search">
                    <Search size={14} style={{ opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Filter playlists..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="curation-scroll">
                    <div className="curation-create-row" onClick={() => setIsCreating(!isCreating)}>
                        <Plus size={18} />
                        <span>{isCreating ? 'Cancel Creation' : 'Create New Collection'}</span>
                    </div>

                    <AnimatePresence>
                        {isCreating && (
                            <motion.div
                                className="curation-create-input"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                            >
                                <input
                                    autoFocus
                                    placeholder="Enter Vibe Name..."
                                    value={newPlaylistName}
                                    onChange={e => setNewPlaylistName(e.target.value)}
                                />
                                <button onClick={handleCreate}>CREATE</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="curation-divider">CHOOSE DESTINATION</div>

                    {filtered.map(pl => (
                        <motion.div
                            key={pl.id}
                            whileHover={{ scale: 1.02, x: -5 }}
                            className="curation-item"
                            onClick={() => handleAdd(pl)}
                        >
                            {pl.images?.[0] ?
                                <img src={pl.images[0].url} className="curation-thumb" alt="" /> :
                                <div className="curation-placeholder">♫</div>
                            }
                            <div className="curation-info">
                                <span className="curation-name">{pl.name}</span>
                                {recentlyAdded === pl.name && <CheckCircle size={14} color="var(--vibe-primary)" style={{ marginLeft: 'auto' }} />}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </>
    );
};

export default CurationSidebar;

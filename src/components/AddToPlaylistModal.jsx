import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Plus } from 'lucide-react';
import * as SpotifyApi from '../services/spotifyApi';
import './AddToPlaylistModal.css';

const AddToPlaylistModal = ({ isOpen, onClose, song, user }) => {
    const [playlists, setPlaylists] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    useEffect(() => {
        if (isOpen) {
            SpotifyApi.getUserPlaylists().then(data => {
                // Filter ensuring only user's editable playlists typically
                // but for now just show all user owns or follows.
                // Spotify API returns simple playlist objects.
                // We'll show all and try to add.
                setPlaylists(data || []);
            });
        }
    }, [isOpen]);

    const handleAdd = async (playlist) => {
        try {
            await SpotifyApi.addToPlaylist(playlist.id, song.uri);
            onClose({ success: true, message: `Added to ${playlist.name}` });
        } catch (e) {
            console.error(e);
            onClose({ success: false, message: "Failed to add" });
        }
    };

    const handleCreate = async () => {
        if (!newPlaylistName.trim() || !user?.id) return;
        try {
            const newPl = await SpotifyApi.createPlaylist(user.id, newPlaylistName);
            await SpotifyApi.addToPlaylist(newPl.id, song.uri);
            onClose({ success: true, message: `Created & Added to ${newPl.name}` });
        } catch (e) {
            console.error(e);
            onClose({ success: false, message: "Create Failed" });
        }
    };

    const filtered = playlists.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h3>Add to Playlist</h3>
                        <button onClick={() => onClose(null)} className="icon-button"><X size={20} /></button>
                    </div>

                    <div className="search-bar">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Find playlist..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="playlist-scroll">
                        <div className="create-row" onClick={() => setIsCreating(!isCreating)}>
                            <div className="row-icon"><Plus size={20} /></div>
                            <span>Create New Playlist</span>
                        </div>

                        {isCreating && (
                            <div className="create-input-row">
                                <input
                                    autoFocus
                                    placeholder="Playlist Name"
                                    value={newPlaylistName}
                                    onChange={e => setNewPlaylistName(e.target.value)}
                                />
                                <button className="save-btn" onClick={handleCreate}>Save</button>
                            </div>
                        )}

                        {filtered.map(pl => (
                            <div key={pl.id} className="playlist-row" onClick={() => handleAdd(pl)}>
                                {pl.images?.[0] ?
                                    <img src={pl.images[0].url} className="row-thumb" alt="" /> :
                                    <div className="row-placeholder">♫</div>
                                }
                                <div className="row-info">
                                    <span className="row-name">{pl.name}</span>
                                    <span className="row-count">{pl.tracks.total} songs</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AddToPlaylistModal;

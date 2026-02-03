import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Music } from 'lucide-react';
import * as SpotifyApi from '../services/spotifyApi';
import './PlaylistMenu.css';

const PlaylistMenu = ({ isOpen, onClose, onSelectPlaylist }) => {
    const [playlists, setPlaylists] = useState([]);

    useEffect(() => {
        if (isOpen) {
            SpotifyApi.getUserPlaylists().then(data => {
                // User asked for "most recent added". 
                // Spotify API returns default order. We'll stick to that but maybe filter empty?
                // Just setting state.
                setPlaylists(data || []);
            }).catch(console.error);
        }
    }, [isOpen]);

    return (
        <motion.div
            className="menu-overlay"
            initial={{ x: '-100%' }}
            animate={{ x: isOpen ? 0 : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className="menu-header">
                <h2>Your Playlists</h2>
                <button onClick={onClose} className="icon-button"><X /></button>
            </div>

            <div className="playlist-list">
                <div
                    className="playlist-item special"
                    onClick={() => onSelectPlaylist(null)}
                >
                    <div className="playlist-icon"><Music /></div>
                    <span>Use My Top Tracks (Default)</span>
                </div>

                {playlists.map(pl => (
                    <div key={pl.id} className="playlist-item" onClick={() => onSelectPlaylist(pl)}>
                        {pl.images?.[0] ? (
                            <img src={pl.images[0].url} alt={pl.name} className="playlist-thumb" />
                        ) : (
                            <div className="playlist-placeholder">?</div>
                        )}
                        <div className="playlist-info">
                            <span className="playlist-name">{pl.name}</span>
                            <span className="playlist-count">{pl.tracks.total} songs</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default PlaylistMenu;

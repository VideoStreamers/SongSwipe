import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, List, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import * as SpotifyApi from '../services/spotifyApi';
import './PlaylistSidebar.css';

const PlaylistSidebar = ({ onPlaylistSelect, isOpen, onToggle }) => {
    const [playlists, setPlaylists] = useState([]);
    const [selectedId, setSelectedId] = useState('default');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        SpotifyApi.getUserPlaylists().then(data => {
            setPlaylists(data || []);
        });
    }, []);

    const handleSelect = (pl) => {
        if (!pl) {
            setSelectedId('default');
            onPlaylistSelect(null);
        } else {
            setSelectedId(pl.id);
            onPlaylistSelect(pl);
        }
    };

    const filteredPlaylists = playlists.filter(pl =>
        pl.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {/* FLOATING TAB (Always visible when sidebar is closed) */}
            <motion.div
                className={`sidebar-tab ${isOpen ? 'hidden' : ''}`}
                onClick={onToggle}
                whileHover={{ x: 5, backgroundColor: 'var(--accent)' }}
                initial={false}
            >
                <List size={22} color="white" />
            </motion.div>

            <motion.div
                className="sidebar-container"
                initial={false}
                animate={{
                    x: isOpen ? 0 : -320,
                    opacity: isOpen ? 1 : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
                <div className="sidebar-header">
                    <h3>Library</h3>
                    <motion.div
                        onClick={onToggle}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="sidebar-toggle"
                    >
                        <ChevronLeft size={24} />
                    </motion.div>
                </div>

                <div className="sidebar-search">
                    <Search size={14} style={{ opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Search playlists..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="sidebar-scroll">
                    <div
                        className={`sidebar-item ${selectedId === 'default' ? 'active' : ''}`}
                        onClick={() => handleSelect(null)}
                        title="My Top Tracks"
                    >
                        <div className="sidebar-icon"><Music size={20} /></div>
                        <div className="sidebar-info">
                            <span className="sidebar-name">My Top Tracks</span>
                            <span className="sidebar-desc">Default Seed</span>
                        </div>
                    </div>

                    <div className="sidebar-divider">YOUR PLAYLISTS</div>

                    {filteredPlaylists.map(pl => (
                        <motion.div
                            key={pl.id}
                            whileHover={{ x: 5 }}
                            className={`sidebar-item ${selectedId === pl.id ? 'active' : ''}`}
                            onClick={() => handleSelect(pl)}
                            title={pl.name}
                        >
                            {pl.images?.[0] ?
                                <img src={pl.images[0].url} className="sidebar-thumb" /> :
                                <div className="sidebar-placeholder">♫</div>
                            }
                            <div className="sidebar-info">
                                <span className="sidebar-name">{pl.name}</span>
                                <span className="sidebar-desc">{pl.tracks.total} songs</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', marginTop: 'auto' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, letterSpacing: '0.5px' }}>
                        CREATED BY <a href="https://seppedorissen.be" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>SEPPE DORISSEN</a>
                    </div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: 4 }}>EXPERIMENTAL AI BUILD</div>
                </div>
            </motion.div>
        </>
    );
};

export default PlaylistSidebar;

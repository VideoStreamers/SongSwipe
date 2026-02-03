import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Moon, Sun, Monitor, Eye, EyeOff } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, showVisuals, setShowVisuals, user }) => {
    if (!isOpen) return null;

    const handleLogout = () => {
        // Simple logout for now: clear URL or hash and reload?
        // Since we don't persist much, just redirect.
        window.location.href = '/';
    };

    return (
        <AnimatePresence>
            <motion.div
                className="settings-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="settings-content"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="settings-header">
                        <h2>Settings</h2>
                        <button onClick={onClose} className="icon-button"><X size={24} /></button>
                    </div>

                    <div className="section">
                        <h3>Account</h3>
                        <div className="user-row">
                            {user?.images?.[0] ? <img src={user.images[0].url} className="user-thumb" /> : <div className="user-thumb-ph">?</div>}
                            <div className="user-info">
                                <span className="user-name">{user?.display_name || 'Spotify User'}</span>
                                <span className="user-sub">Free / Premium Plans (Managed by Spotify)</span>
                            </div>
                        </div>
                    </div>

                    <div className="section">
                        <h3>Visuals</h3>
                        <div className="setting-row">
                            <div className="setting-label">
                                <span className="label-main">Dynamic Background</span>
                                <span className="label-sub">Show color effects based on album art</span>
                            </div>
                            <button
                                className={`toggle-btn ${showVisuals ? 'active' : ''}`}
                                onClick={() => setShowVisuals(!showVisuals)}
                            >
                                <div className="toggle-thumb" />
                            </button>
                        </div>
                    </div>

                    <div className="section">
                        <h3>App</h3>
                        <button className="logout-btn" onClick={handleLogout}>
                            <LogOut size={16} /> Log Out
                        </button>
                    </div>

                    <div className="footer">
                        Version 1.0.2 • SongSwipe
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SettingsModal;

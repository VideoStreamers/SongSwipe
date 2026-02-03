import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Music2, Play, Pause, Plus, Volume2, VolumeX, BarChart, Calendar, Zap, Info } from 'lucide-react';
import './SongCard.css';

const SongCard = ({ song, onSwipe, index, isFront, isActive, isPaused, forcedSwipe, volume = 1, theme = 'dark', onAdd }) => {
    // Motion Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const [activePreviewUrl, setActivePreviewUrl] = useState(song?.preview_url || null);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);

    // FETCH FALLBACK AUDIO (iTunes) if missing
    useEffect(() => {
        if (isFront && !activePreviewUrl && !isFetchingPreview) {
            const fetchFallback = async () => {
                setIsFetchingPreview(true);
                try {
                    const query = encodeURIComponent(`${song.name} ${song.artists?.[0]?.name}`);
                    const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=1`);
                    const data = await res.json();
                    if (data.results && data.results.length > 0) {
                        setActivePreviewUrl(data.results[0].previewUrl);
                    }
                } catch (e) {
                    // silent fail
                } finally {
                    setIsFetchingPreview(false);
                }
            };
            fetchFallback();
        }
    }, [isFront, song, activePreviewUrl, isFetchingPreview]);

    // React to forced swipe from Parent (keyboard/buttons)
    useEffect(() => {
        if (forcedSwipe) {
            if (forcedSwipe === 'left') x.set(-400);
            if (forcedSwipe === 'right') x.set(400);
            if (forcedSwipe === 'up') y.set(-400);
        }
    }, [forcedSwipe]);

    const rotate = useTransform(x, [-200, 200], [-10, 10]);
    const opacity = useTransform(x, [-300, -200, 0, 200, 300], [0, 1, 1, 1, 0]);

    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioError, setAudioError] = useState(null);

    // Audio Playback Lock
    useEffect(() => {
        if (isActive && activePreviewUrl && !isPaused && !forcedSwipe) {
            setAudioError(null);
            const timer = setTimeout(() => {
                if (audioRef.current && isActive && !isPaused) {
                    audioRef.current.volume = volume * volume;
                    audioRef.current.play()
                        .then(() => setIsPlaying(true))
                        .catch(() => setIsPlaying(false));
                }
            }, 600);
            return () => {
                clearTimeout(timer);
                if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                }
            };
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [isActive, activePreviewUrl, isPaused, forcedSwipe]);

    // Force hard cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    // UPDATE VOLUME when prop changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume * volume;
        }
    }, [volume]);

    const handleAudioError = (e) => {
        setAudioError("Preview Failed");
        setIsPlaying(false);
    };

    const handleDragEnd = useCallback((_, info) => {
        const offsetLeft = info.offset.x;
        const offsetUp = info.offset.y;
        const velocity = info.velocity.x;
        const threshold = 120;

        if (offsetLeft > threshold || velocity > 800) {
            onSwipe('right', song);
        } else if (offsetLeft < -threshold || velocity < -800) {
            onSwipe('left', song);
        } else if (offsetUp < -threshold) {
            onSwipe('up', song);
        }
    }, [onSwipe, song]);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
            else { audioRef.current.play(); setIsPlaying(true); }
        }
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        onAdd();
    };

    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);
    const superOpacity = useTransform(y, [-50, -150], [0, 1]);

    return (
        <motion.div
            style={{ x, y, rotate, opacity, zIndex: isFront ? 100 : 100 - index }}
            drag={isFront}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.7}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 20 }}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{
                x: x.get() > 50 ? 600 : x.get() < -50 ? -600 : (forcedSwipe === 'left' ? -600 : forcedSwipe === 'right' ? 600 : 0),
                y: y.get() < -50 ? -600 : (forcedSwipe === 'up' ? -600 : 0),
                opacity: 0,
                transition: { duration: 0.3 }
            }}
            whileTap={{ cursor: 'grabbing', scale: 1.02 }}
            className={`card-container glass-panel ${theme}-card`}
            onClick={togglePlay}
        >
            {/* Visual Cues */}
            <motion.div className="swipe-badge like" style={{ opacity: likeOpacity }}>LIKE</motion.div>
            <motion.div className="swipe-badge nope" style={{ opacity: nopeOpacity }}>NOPE</motion.div>
            <motion.div className="swipe-badge super" style={{ opacity: superOpacity }}>LIKE + ADD</motion.div>

            <div className="song-image-container">
                <img src={song.album.images[0]?.url} alt={song.name} className="song-image" crossOrigin="anonymous" />
                <div className="gradient-overlay" />

                <div className={`play-overlay ${isPaused || isPlaying ? 'show' : 'hide'}`}>
                    {isPaused ? <Play fill="white" size={32} style={{ marginLeft: 4 }} /> : (isPlaying ? <Pause fill="white" size={32} /> : <Play fill="white" size={32} style={{ marginLeft: 4 }} />)}
                </div>
            </div>

            <div className="info-section">
                <div className="title-row">
                    <h2 className="song-title">{song.name}</h2>
                </div>
                <p className="song-artist">{song.artists.map(a => a.name).join(', ')}</p>

                {/* Metrics Bar - Year and High Energy */}
                <div className="metrics-bar">
                    <div className="metric">
                        <Calendar size={14} />
                        <span>{song.album.release_date?.split('-')[0]}</span>
                    </div>
                    <div className="metric" style={{ background: song.popularity > 50 ? 'rgba(29, 185, 84, 0.1)' : 'transparent', borderRadius: '4px', padding: '0 4px' }}>
                        <Zap size={14} style={{ color: '#FFD700' }} />
                        <span>High Vibe</span>
                    </div>
                </div>

                <div className="meta-row">
                    <span className="meta-item"><Music2 size={14} /> {song.album.name}</span>
                </div>
            </div>

            {activePreviewUrl && (
                <audio
                    ref={audioRef}
                    src={activePreviewUrl}
                    loop
                    onError={handleAudioError}
                    crossOrigin="anonymous"
                />
            )}

            {/* Preload next 2 songs for instant playback */}
            {!isActive && index <= 2 && song.preview_url && (
                <audio
                    preload="auto"
                    src={song.preview_url}
                    style={{ display: 'none' }}
                />
            )}
        </motion.div>
    );
};

export default SongCard;

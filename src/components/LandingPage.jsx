import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Music, Sparkles, Zap, Heart, X, ChevronDown, Globe, Cpu, Headphones, Play, ArrowRight, Volume2, VolumeX, MousePointer, Smartphone, ListMusic, Disc3, Radio, Waves, Disc, Headphones as HeadphonesIcon } from 'lucide-react';
import './LandingPage.css';

// ============================================================================
// SECTION MUSIC ENGINE - Real background music per section
// ============================================================================

// Section to audio file mapping
// Section to audio file mapping - Real Music Tracks
const SECTION_AUDIO = {
    0: 'audio/sections/hero-theme.mp3',
    1: 'audio/sections/how-it-works-beat.mp3',
    2: 'audio/sections/demo-vibe.mp3',
    3: 'audio/sections/genres-ambient.mp3?v=fix', // Ambient track for genres section
    4: 'audio/sections/features-loop.mp3',
    5: 'audio/sections/experience-grand.mp3'
};

class SectionAudioEngine {
    constructor() {
        this.cache = {}; // Cache Audio objects
        this.currentAudio = null;
        this.currentSection = -1;
        this.isEnabled = false;
        this.volume = 0.3;
        this.isDucked = false;
        this.activeFades = new Map();
        this.playingAudios = new Set(); // Track all playing instances
    }

    preloadAll() {
        Object.entries(SECTION_AUDIO).forEach(([index, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto'; // Force buffer
            audio.loop = true;
            audio.volume = 0;
            this.cache[index] = audio;
        });
    }

    async enable() {
        this.isEnabled = true;
        // Ensure cache is ready
        if (Object.keys(this.cache).length === 0) this.preloadAll();

        if (this.currentSection >= 0) {
            this.crossfadeToSection(this.currentSection);
        }
    }

    disable() {
        this.isEnabled = false;
        // Stop all sounds
        this.playingAudios.forEach(audio => {
            this.fadeOut(audio, () => {
                audio.pause();
                this.playingAudios.delete(audio);
            });
        });
        this.currentAudio = null;
    }

    cancelFade(audio) {
        if (this.activeFades.has(audio)) {
            cancelAnimationFrame(this.activeFades.get(audio));
            this.activeFades.delete(audio);
        }
    }

    fadeTo(audio, targetVolume, onComplete) {
        if (!audio) {
            onComplete?.();
            return;
        }

        this.cancelFade(audio);

        const startVolume = audio.volume;
        const diff = targetVolume - startVolume;
        const steps = 12; // 0.2s
        const increment = diff / steps;
        let currentStep = 0;

        const animate = () => {
            currentStep++;
            const newVol = startVolume + (increment * currentStep);
            audio.volume = Math.max(0, Math.min(1, newVol));

            if (currentStep < steps) {
                this.activeFades.set(audio, requestAnimationFrame(animate));
            } else {
                audio.volume = targetVolume;
                this.activeFades.delete(audio);
                onComplete?.();
            }
        };
        this.activeFades.set(audio, requestAnimationFrame(animate));
    }

    duck() {
        this.isDucked = true;
        if (this.currentAudio) {
            this.fadeTo(this.currentAudio, 0); // Mute completely
        }
    }

    unduck() {
        this.isDucked = false;
        if (this.currentAudio) {
            this.fadeTo(this.currentAudio, this.volume);
        }
    }

    setVolume(newVolume) {
        this.volume = Math.max(0, Math.min(1, newVolume));
        if (this.currentAudio) {
            this.fadeTo(this.currentAudio, this.isDucked ? 0 : this.volume);
        }
    }

    fadeOut(audio, onComplete) {
        this.fadeTo(audio, 0, onComplete);
    }

    crossfadeToSection(sectionIndex) {
        if (!this.isEnabled) {
            this.currentSection = sectionIndex;
            return;
        }

        if (sectionIndex === this.currentSection && this.currentAudio) return;
        this.currentSection = sectionIndex;

        const audioPath = SECTION_AUDIO[sectionIndex];

        // 1. Identify valid next audio (or null)
        let newAudio = null;
        if (audioPath) {
            newAudio = this.cache[sectionIndex];
            if (!newAudio) {
                newAudio = new Audio(audioPath);
                newAudio.loop = true;
                newAudio.volume = 0;
                this.cache[sectionIndex] = newAudio;
            }
        }

        // 2. Stop ALL other audios immediately (except the new one if it was already playing)
        this.playingAudios.forEach(audio => {
            if (audio !== newAudio) {
                // Cancel any pending fades on it
                this.cancelFade(audio);
                // Fast fade out or immediate stop? 
                // Immediate stop is safer for "rapid scrolling" to avoid chaos
                // But a very fast fade (0.3s) is nicer. 
                // Let's do a fast fade out to avoid clicks, but force it.
                this.fadeOut(audio, () => {
                    audio.pause();
                    audio.currentTime = 0;
                    this.playingAudios.delete(audio);
                });
            }
        });

        // 3. Play new Audio
        if (newAudio) {
            this.currentAudio = newAudio;
            this.playingAudios.add(newAudio);

            if (newAudio.paused) {
                const playPromise = newAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.fadeTo(newAudio, this.isDucked ? 0 : this.volume);
                    }).catch(e => console.log('Audio play failed', e));
                }
            } else {
                // Was already playing (maybe from previous rapid scroll)
                this.fadeTo(newAudio, this.isDucked ? 0 : this.volume);
            }
        } else {
            this.currentAudio = null;
        }
    }

    // Stubs
    playClick() { }
    playHover() { }
    playSectionTransition() { }
    playSwipe(direction) { }
}


const audioEngine = new SectionAudioEngine();

// ============================================================================
// GENRE PREVIEW MANAGER - Static audio files for genre previews
// ============================================================================

// Genre to static file mapping (files go in /audio/genres/)
const GENRE_AUDIO_FILES = {
    'Indie Pop': 'audio/genres/indie-pop.mp3',
    'Electronic': 'audio/genres/electronic.mp3',
    'Hip-Hop': 'audio/genres/hip-hop.mp3',
    'R&B': 'audio/genres/rnb.mp3',
    'Alternative': 'audio/genres/alternative.mp3',
    'Jazz': 'audio/genres/jazz.mp3',
    'Soul': 'audio/genres/soul.mp3',
    'Lo-Fi': 'audio/genres/lofi.mp3',
    'Funk': 'audio/genres/funk.mp3',
    'Acoustic': 'audio/genres/acoustic.mp3',
    'Synthwave': 'audio/genres/synthwave.mp3',
    'Chill': 'audio/genres/chill.mp3'
};

class GenrePreviewManager {
    constructor() {
        this.cache = {}; // Cache of Audio objects
        this.currentAudio = null;
        this.isEnabled = false;
        this.currentGenre = null;
        this.volume = 0.3;
        this.activeFades = new Map(); // Map<Audio, number> (animationFrameId)
    }

    preloadAll() {
        Object.entries(GENRE_AUDIO_FILES).forEach(([genre, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            audio.volume = 0;
            audio.loop = true;
            this.cache[genre] = audio;
        });
    }

    enable() {
        this.isEnabled = true;
        // Ensure cache is populated if not already
        if (Object.keys(this.cache).length === 0) {
            this.preloadAll();
        }
    }

    disable() {
        this.isEnabled = false;
        this.stopGenrePreview();
    }

    setVolume(vol) {
        this.volume = vol;
        // Update volume of currently playing track
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.volume = vol; // Snap volume
        }
    }

    cancelFade(audio) {
        if (this.activeFades.has(audio)) {
            cancelAnimationFrame(this.activeFades.get(audio));
            this.activeFades.delete(audio);
        }
    }

    fadeIn(audio) {
        if (!audio) return;
        this.cancelFade(audio);

        audio.volume = 0;
        const target = this.volume;
        const step = target / 15; // 15 frames (~0.25s)

        const fade = () => {
            // If volume changed externally (slider), update target dynamic check?
            // For simplicity, fade to *current* this.volume
            const currentTarget = this.volume;

            let nextVol = audio.volume + step;
            if (nextVol < currentTarget) {
                audio.volume = nextVol;
                this.activeFades.set(audio, requestAnimationFrame(fade));
            } else {
                audio.volume = currentTarget;
                this.activeFades.delete(audio);
            }
        };
        this.activeFades.set(audio, requestAnimationFrame(fade));
    }

    fadeOut(audio) {
        if (!audio) return;
        this.cancelFade(audio);

        const step = audio.volume / 15;

        const fade = () => {
            let nextVol = audio.volume - step;
            if (nextVol > 0) {
                audio.volume = nextVol;
                this.activeFades.set(audio, requestAnimationFrame(fade));
            } else {
                audio.volume = 0;
                audio.pause();
                audio.currentTime = 0; // Reset for next play
                this.activeFades.delete(audio);
            }
        };
        this.activeFades.set(audio, requestAnimationFrame(fade));
    }

    playGenrePreview(genre) {
        if (!this.isEnabled) return;

        // Fast switch: update target genre immediately
        this.currentGenre = genre;

        const nextAudio = this.cache[genre];
        if (!nextAudio) {
            // Fallback if cache missing (shouldn't happen if preloaded)
            this.preloadAll(); // Try to recover
            return;
        }

        // Prepare next audio
        // Reset state if it was fading out
        this.cancelFade(nextAudio);

        // If it's already playing (the current one), do nothing
        if (this.currentAudio === nextAudio && !nextAudio.paused) return;

        // Fade out OLD current
        if (this.currentAudio && this.currentAudio !== nextAudio) {
            this.fadeOut(this.currentAudio);
        }

        // Play NEW
        this.currentAudio = nextAudio;
        nextAudio.volume = 0;
        nextAudio.currentTime = 0;

        const playPromise = nextAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.fadeIn(nextAudio);
            }).catch(e => {
                // Auto-play policy or interrupted
                // Check if we switched away while loading
                if (this.currentAudio !== nextAudio) {
                    nextAudio.pause();
                    nextAudio.volume = 0;
                }
            });
        }
    }

    stopGenrePreview() {
        this.currentGenre = null;
        if (this.currentAudio) {
            this.fadeOut(this.currentAudio);
            this.currentAudio = null;
        }
    }
}

const genrePreviewManager = new GenrePreviewManager();

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const GradientOrb = ({ color, size, x, y, delay = 0 }) => (
    <motion.div
        className="gradient-orb"
        style={{
            width: size,
            height: size,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            left: `${x}%`,
            top: `${y}%`,
        }}
        animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
            repeat: Infinity,
            duration: 15 + delay * 2,
            delay: delay,
            ease: "easeInOut"
        }}
    />
);

const FloatingMusicNote = ({ delay, x }) => {
    const noteSize = useMemo(() => 20 + Math.random() * 20, []);
    return (
        <motion.div
            className="floating-note"
            style={{ left: `${x}%` }}
            initial={{ y: '100vh', opacity: 0, rotate: 0 }}
            animate={{
                y: '-100vh',
                opacity: [0, 1, 1, 0],
                rotate: [0, 15, -15, 0]
            }}
            transition={{
                repeat: Infinity,
                duration: 12 + delay * 2,
                delay: delay,
                ease: "linear"
            }}
        >
            <Music size={noteSize} />
        </motion.div>
    );
};

const TypewriterText = ({ text, delay = 0 }) => {
    const [displayText, setDisplayText] = useState('');
    const [showCursor, setShowCursor] = useState(true);

    useEffect(() => {
        let currentIndex = 0;
        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (currentIndex <= text.length) {
                    setDisplayText(text.slice(0, currentIndex));
                    currentIndex++;
                } else {
                    clearInterval(interval);
                    setTimeout(() => setShowCursor(false), 1000);
                }
            }, 80);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, delay]);

    return (
        <span className="typewriter">
            {displayText}
            {showCursor && <span className="cursor">|</span>}
        </span>
    );
};

const HolographicText = ({ children }) => (
    <motion.span
        className="holographic-text"
        animate={{
            backgroundPosition: ['0% 50%', '200% 50%'],
        }}
        transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear"
        }}
    >
        {children}
    </motion.span>
);

const PulseRing = ({ delay = 0, color = 'var(--accent)' }) => (
    <motion.div
        className="pulse-ring"
        style={{ borderColor: color }}
        initial={{ scale: 0.8, opacity: 0.8 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{
            repeat: Infinity,
            duration: 2,
            delay,
            ease: "easeOut"
        }}
    />
);

// Interactive Demo Card
const DemoCard = ({ onSwipe }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
    const likeOpacity = useTransform(x, [0, 100], [0, 1]);
    const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
    const [isGone, setIsGone] = useState(false);
    const [direction, setDirection] = useState(null);

    const handleDragEnd = (_, info) => {
        if (Math.abs(info.offset.x) > 100) {
            const dir = info.offset.x > 0 ? 'right' : 'left';
            setDirection(dir);
            setIsGone(true);
            audioEngine.playSwipe(dir);
            onSwipe?.(dir);
            setTimeout(() => {
                setIsGone(false);
                setDirection(null);
            }, 1500);
        }
    };

    if (isGone) {
        return (
            <motion.div
                className="demo-feedback"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
            >
                {direction === 'right' ? (
                    <>
                        <Heart size={60} color="#00e676" fill="#00e676" />
                        <span style={{ color: '#00e676' }}>Added to vibes!</span>
                    </>
                ) : (
                    <>
                        <X size={60} color="#ff5252" />
                        <span style={{ color: '#ff5252' }}>Next track...</span>
                    </>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            className="demo-card"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            style={{ x, rotate, opacity }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.div className="swipe-label like" style={{ opacity: likeOpacity }}>
                <Heart size={40} /> LIKE
            </motion.div>
            <motion.div className="swipe-label nope" style={{ opacity: nopeOpacity }}>
                <X size={40} /> NOPE
            </motion.div>

            <div className="demo-card-image">
                <div className="demo-album-art">
                    <Disc3 size={60} />
                </div>
                <div className="demo-playing-indicator">
                    {[1, 2, 3, 4].map(i => (
                        <motion.div
                            key={i}
                            className="bar"
                            animate={{ height: [10, 30, 10] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        />
                    ))}
                </div>
            </div>
            <div className="demo-card-info">
                <h3>Your Next Favorite</h3>
                <p>Waiting to be discovered...</p>
            </div>
            <div className="demo-hint">
                <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                <span>Drag to try</span>
                <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
            </div>
        </motion.div>
    );
};

// Waveform Animation
const Waveform = () => {
    const bars = useMemo(() =>
        [...Array(40)].map((_, i) => ({
            duration: 0.8 + Math.random() * 0.4,
            maxHeight: 15 + Math.random() * 35
        })),
        []);

    return (
        <div className="waveform">
            {bars.map((bar, i) => (
                <motion.div
                    key={i}
                    className="wave-bar"
                    animate={{
                        height: [5, bar.maxHeight, 5],
                        backgroundColor: ['var(--accent)', 'var(--mood-hype)', 'var(--accent)']
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: bar.duration,
                        delay: i * 0.02
                    }}
                />
            ))}
        </div>
    );
};

// Step Card for How It Works
const StepCard = ({ number, icon: Icon, title, description, delay = 0 }) => (
    <motion.div
        className="step-card"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay }}
        whileHover={{ scale: 1.02, y: -5 }}
        onHoverStart={() => audioEngine.playHover()}
    >
        <div className="step-number">{number}</div>
        <div className="step-icon">
            <Icon size={32} />
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
    </motion.div>
);

// Feature Card
const FeatureCard = ({ icon: Icon, title, description, color, delay = 0 }) => (
    <motion.div
        className="feature-card"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay }}
        whileHover={{
            y: -10,
            boxShadow: `0 30px 60px -15px ${color}40`,
            borderColor: color
        }}
        onHoverStart={() => audioEngine.playHover()}
    >
        <motion.div
            className="feature-icon"
            style={{ background: `${color}20`, color }}
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        >
            <Icon size={32} />
        </motion.div>
        <h3>{title}</h3>
        <p>{description}</p>
    </motion.div>
);



// Vinyl Record Animation
const VinylRecord = () => (
    <motion.div
        className="vinyl-record"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
    >
        <div className="vinyl-inner">
            <div className="vinyl-label">
                <Music size={24} />
            </div>
        </div>
    </motion.div>
);

// Sound Wave Animation
const SoundWave = () => (
    <div className="sound-wave">
        {[...Array(5)].map((_, i) => (
            <motion.div
                key={i}
                className="sound-wave-bar"
                animate={{
                    scaleY: [0.3, 1, 0.3],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: 'easeInOut'
                }}
            />
        ))}
    </div>
);

// ============================================================================
// WELCOME UNLOCK OVERLAY - Interactive entry point for audio permissions
// ============================================================================

const WelcomeUnlock = ({ onUnlock }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Generate random bars for the soundwave animation
    const bars = useMemo(() =>
        [...Array(24)].map((_, i) => ({
            height: 20 + Math.random() * 60,
            delay: i * 0.05,
            duration: 0.8 + Math.random() * 0.6
        })),
        []);

    const handleUnlock = async () => {
        setIsUnlocking(true);
        // Dramatic unlock animation before revealing
        await new Promise(r => setTimeout(r, 800));
        onUnlock();
    };

    return (
        <motion.div
            className="welcome-unlock-overlay"
            initial={{ opacity: 1 }}
            exit={{
                opacity: 0,
                scale: 1.1,
                filter: 'blur(20px)'
            }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Animated background orbs */}
            <div className="unlock-bg-orbs">
                <motion.div
                    className="unlock-orb unlock-orb-1"
                    animate={{
                        x: [0, 100, -50, 0],
                        y: [0, -80, 40, 0],
                        scale: [1, 1.2, 0.9, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="unlock-orb unlock-orb-2"
                    animate={{
                        x: [0, -80, 60, 0],
                        y: [0, 60, -100, 0],
                        scale: [1, 0.8, 1.3, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="unlock-orb unlock-orb-3"
                    animate={{
                        x: [0, 50, -100, 0],
                        y: [0, -60, 80, 0],
                        scale: [1, 1.4, 0.7, 1]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            {/* Floating particles */}
            <div className="unlock-particles">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="unlock-particle"
                        style={{
                            left: `${5 + Math.random() * 90}%`,
                            top: `${5 + Math.random() * 90}%`,
                            width: 4 + Math.random() * 8,
                            height: 4 + Math.random() * 8,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [1, 1.5, 1]
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: 'easeInOut'
                        }}
                    />
                ))}
            </div>

            <div className="unlock-content">
                {/* Top tagline */}
                <motion.div
                    className="unlock-tagline"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    <span className="unlock-tagline-line"></span>
                    <span>SongSwipe</span>
                    <span className="unlock-tagline-line"></span>
                </motion.div>

                {/* Central unlock button with animations */}
                <motion.div
                    className="unlock-button-container"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                >
                    {/* Outer pulse rings */}
                    <motion.div
                        className="unlock-pulse-ring unlock-pulse-1"
                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.div
                        className="unlock-pulse-ring unlock-pulse-2"
                        animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                    />
                    <motion.div
                        className="unlock-pulse-ring unlock-pulse-3"
                        animate={{ scale: [1, 2.5], opacity: [0.2, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
                    />

                    {/* The main button */}
                    <motion.button
                        className={`unlock-button ${isUnlocking ? 'unlocking' : ''}`}
                        onClick={handleUnlock}
                        onHoverStart={() => setIsHovered(true)}
                        onHoverEnd={() => setIsHovered(false)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={isUnlocking ? {
                            scale: [1, 1.2, 0],
                            rotate: [0, 180, 360],
                            opacity: [1, 1, 0]
                        } : {}}
                        transition={isUnlocking ? { duration: 0.8 } : {}}
                    >
                        <div className="unlock-button-glow"></div>
                        <div className="unlock-button-inner">
                            <motion.div
                                className="unlock-icon"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <Headphones size={56} />
                            </motion.div>
                            <span className="unlock-button-text">TAP TO ENTER</span>
                        </div>
                    </motion.button>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    className="unlock-title"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                >
                    Discover New <span className="unlock-title-accent">Music</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    className="unlock-subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                >
                    Click to unlock sound and enter the experience
                </motion.p>

                {/* Arrow indicator pointing to button */}
                <motion.div
                    className="unlock-arrow-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: [0, -10, 0] }}
                    transition={{ delay: 1.1, duration: 1.5, repeat: Infinity }}
                >
                    <ChevronDown size={32} style={{ transform: 'rotate(180deg)', opacity: 0.7 }} />
                </motion.div>
            </div>
        </motion.div>
    );
};

// ============================================================================
// GENRE DATA & ASSETS
// ============================================================================

const GENRES_DATA = [
    { name: 'Indie Pop', color: '#1DB954', vibe: 'floaty' },
    { name: 'Electronic', color: '#00d2ff', vibe: 'electric' },
    { name: 'Hip-Hop', color: '#FF4B2B', vibe: 'bouncy' },
    { name: 'R&B', color: '#8b5cf6', vibe: 'wavy' },
    { name: 'Alternative', color: '#f59e0b', vibe: 'chaos' },
    { name: 'Jazz', color: '#ec4899', vibe: 'wavy' },
    { name: 'Soul', color: '#10b981', vibe: 'floaty' },
    { name: 'Lo-Fi', color: '#6366f1', vibe: 'calm' },
    { name: 'Funk', color: '#f97316', vibe: 'bouncy' },
    { name: 'Acoustic', color: '#84cc16', vibe: 'calm' },
    { name: 'Synthwave', color: '#a855f7', vibe: 'electric' },
    { name: 'Chill', color: '#22d3ee', vibe: 'calm' }
];

// Immersive Background Effect Component
const GenreBackground = ({ data }) => {
    if (!data) return null;
    const { name, color, vibe } = data;

    // --- Advanced Sub-components for Dynamic Randomization ---

    const GlitchStrip = ({ color }) => {
        const [pos, setPos] = useState({ top: Math.random() * 100, left: Math.random() * 100 });
        useEffect(() => {
            const timer = setInterval(() => {
                setPos({ top: Math.random() * 100, left: Math.random() * 60 + 20 });
            }, 300 + Math.random() * 1000);
            return () => clearInterval(timer);
        }, []);
        return (
            <motion.div
                key={`${pos.top}-${pos.left}`}
                style={{
                    position: 'absolute', top: `${pos.top}%`, left: `${pos.left}%`,
                    width: Math.random() * 200 + 50, height: Math.random() * 3 + 1,
                    background: color, boxShadow: `0 0 15px ${color}`,
                    opacity: 0.8, pointerEvents: 'none', zIndex: 10
                }}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0, 1, 0], scaleX: [0, 1.5, 0] }}
                transition={{ duration: 0.15 }}
            />
        );
    };

    const LightningBolt = ({ color }) => {
        const [pos, setPos] = useState({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
        useEffect(() => {
            const timer = setInterval(() => {
                setPos({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
            }, 1200 + Math.random() * 1000);
            return () => clearInterval(timer);
        }, []);
        return (
            <motion.div
                key={`${pos.x}-${pos.y}`}
                style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0, 1, 0], scale: [1, 1.4, 1.1], rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <Zap size={180} color={color} style={{ filter: `drop-shadow(0 0 35px ${color})`, opacity: 0.9 }} />
            </motion.div>
        );
    };

    const BeatBar = ({ color, i, count }) => (
        <motion.div
            style={{
                width: `${100 / count}%`,
                height: '100%',
                background: `linear-gradient(to top, ${color}40, ${color}10, transparent)`,
                margin: '0 2px',
                borderRadius: '4px 4px 0 0'
            }}
            animate={{
                height: [
                    `${20 + Math.random() * 40}%`,
                    `${40 + Math.random() * 50}%`,
                    `${10 + Math.random() * 30}%`
                ]
            }}
            transition={{
                duration: 0.5 + Math.random() * 0.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );

    const SpraySplatter = ({ color }) => {
        const [pos] = useState(() => ({
            left: Math.random() * 80 + 10,
            top: Math.random() * 80 + 10,
            size: Math.random() * 150 + 100,
            rotate: Math.random() * 360
        }));
        return (
            <motion.div
                style={{
                    position: 'absolute', left: `${pos.left}%`, top: `${pos.top}%`,
                    width: pos.size, height: pos.size, borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                    background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                    filter: 'blur(25px)', transform: `rotate(${pos.rotate}deg)`,
                    mixBlendMode: 'screen'
                }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4 + Math.random() * 4, repeat: Infinity }}
            />
        );
    };

    const AlternativeShape = ({ color }) => {
        const [config, setConfig] = useState(null);
        const generate = useCallback(() => ({
            id: Math.random(),
            left: Math.random() * 90 + 5,
            top: Math.random() * 90 + 5,
            size: Math.random() * 120 + 60,
            isSquare: Math.random() > 0.5,
            duration: Math.random() * 5 + 4,
            rotate: Math.random() * 360,
            driftX: (Math.random() - 0.5) * 150,
            driftY: (Math.random() - 0.5) * 150,
        }), []);

        useEffect(() => {
            setConfig(generate());
            const timer = setInterval(() => {
                setConfig(generate());
            }, 6000 + Math.random() * 3000);
            return () => clearInterval(timer);
        }, [generate]);

        if (!config) return null;

        return (
            <motion.div
                key={config.id}
                initial={{ opacity: 0, scale: 0.2, rotate: config.rotate }}
                animate={{
                    opacity: [0, 0.15, 0.15, 0],
                    scale: [0.7, 1.1, 1.1, 0.8],
                    rotate: config.rotate + 180,
                    x: [0, config.driftX],
                    y: [0, config.driftY]
                }}
                transition={{
                    duration: config.duration,
                    ease: "linear",
                    times: [0, 0.2, 0.8, 1]
                }}
                style={{
                    position: 'absolute', left: `${config.left}%`, top: `${config.top}%`,
                    width: config.size, height: config.size, background: color,
                    clipPath: config.isSquare ? 'none' : 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    boxShadow: `0 0 35px ${color}30`,
                    filter: 'contrast(1.2) brightness(1.1)'
                }}
            />
        );
    };



    const StringRipple = ({ color, top }) => (
        <motion.div
            style={{
                position: 'absolute', left: 0, right: 0, top: top,
                height: '1px', background: color,
                opacity: 0, pointerEvents: 'none',
                boxShadow: `0 0 12px ${color}`
            }}
            animate={{
                opacity: [0, 0.8, 0],
                scaleY: [1, 20, 1],
                y: [-2, 15, -15, 8, -8, 0]
            }}
            transition={{
                duration: 0.8, repeat: Infinity,
                repeatDelay: 1 + Math.random() * 2,
                ease: "easeOut"
            }}
        />
    );

    const SoulFlare = ({ color }) => {
        const [pos] = useState(() => ({
            left: Math.random() * 100,
            top: Math.random() * 100,
            size: Math.random() * 400 + 400,
            delay: Math.random() * 4
        }));
        return (
            <motion.div
                style={{
                    position: 'absolute', left: `${pos.left}%`, top: `${pos.top}%`,
                    width: pos.size, height: pos.size, borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                    filter: 'blur(60px)', mixBlendMode: 'screen',
                    transform: 'translate(-50%, -50%)'
                }}
                animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.2, 1] }}
                transition={{ duration: 8, repeat: Infinity, delay: pos.delay }}
            />
        );
    };

    const CRTOverlay = () => (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.1), rgba(0, 255, 0, 0.05), rgba(0, 0, 255, 0.1))',
                backgroundSize: '100% 6px, 4px 100%',
                opacity: 0.8
            }} />
            <motion.div
                style={{ position: 'absolute', inset: 0, background: 'url(https://grainy-gradients.vercel.app/noise.svg)', opacity: 0.15, mixBlendMode: 'overlay' }}
                animate={{ x: [-2, 2, -1, 1], y: [1, -1, 2, -2] }}
                transition={{ duration: 0.1, repeat: Infinity }}
            />
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 300px rgba(0,0,0,1)' }} />
        </div>
    );

    const CyberFloor = ({ color }) => (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50vh',
            zIndex: 10, pointerEvents: 'none', overflow: 'hidden'
        }}>
            <motion.div
                style={{
                    position: 'absolute', width: '200%', height: '200%',
                    left: '-50%', top: 0,
                    backgroundImage: `
                        linear-gradient(to right, ${color}20 1px, transparent 1px),
                        linear-gradient(to bottom, ${color}20 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                    transform: 'perspective(500px) rotateX(70deg)',
                    transformOrigin: '50% 0%'
                }}
                animate={{ backgroundPosition: ['0px 0px', '0px 100px'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, #000 0%, ${color}10 50%, transparent)` }} />
        </div>
    );

    const RetroSun = ({ color }) => (
        <div style={{
            position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
            width: '600px', height: '600px', pointerEvents: 'none', zIndex: -1
        }}>
            <motion.div
                style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: `linear-gradient(to bottom, ${color} 0%, transparent 98%)`,
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 10%, transparent 11%, black 12%, black 22%, transparent 23%, black 24%, black 34%, transparent 35%, black 36%, black 46%, transparent 47%, black 48%, black 58%, transparent 59%, black 60%, black 70%, transparent 71%, black 72%, black 82%, transparent 83%, black 84%, black 94%, transparent 95%, black 96%)'
                }}
                animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
            />
        </div>
    );

    const getParticleVariants = (i) => {
        const base = {
            opacity: [0.3, 0.6, 0.3],
            boxShadow: `0 0 ${15 + Math.random() * 25}px ${color}`,
        };
        switch (vibe) {
            case 'electric':
                return {
                    ...base,
                    x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
                    y: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
                    opacity: [0, 1, 0, 1, 0],
                    transition: { duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 }
                };
            case 'floaty':
                return {
                    ...base,
                    y: [100, -100],
                    opacity: [0, 0.8, 0],
                    transition: { duration: 4 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" }
                };
            case 'calm':
                return {
                    ...base,
                    x: [0, 40, 0],
                    y: [0, 40, 0],
                    scale: [1, 1.2, 1],
                    transition: { duration: 8 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" }
                };
            default:
                return {
                    ...base,
                    x: [0, 60, -60, 0],
                    y: [0, 40, -40, 0],
                    rotate: [0, 180, 360],
                    transition: { duration: 5 + Math.random() * 5, repeat: Infinity, ease: "easeInOut" }
                };
        }
    };

    const AcousticString = ({ color, i }) => {
        const [isPlucked, setIsPlucked] = useState(false);
        useEffect(() => {
            const pluck = () => {
                setIsPlucked(true);
                setTimeout(() => setIsPlucked(false), 1200);
                setTimeout(pluck, 1800 + Math.random() * 3000);
            };
            const initialDelay = Math.random() * 3000;
            const timer = setTimeout(pluck, initialDelay);
            return () => clearTimeout(timer);
        }, []);

        return (
            <div style={{ position: 'relative', width: '100%', height: '60px', marginBottom: '20px' }}>
                <svg width="100%" height="100%" viewBox="0 0 1000 60" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <motion.path
                        d="M 0 30 Q 500 30 1000 30"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        animate={isPlucked ? {
                            d: [
                                "M 0 30 Q 500 30 1000 30",
                                `M 0 30 Q 500 ${30 + (i % 2 === 0 ? 30 : -30)} 1000 30`,
                                `M 0 30 Q 500 ${30 + (i % 2 === 0 ? -20 : 20)} 1000 30`,
                                `M 0 30 Q 500 ${30 + (i % 2 === 0 ? 10 : -10)} 1000 30`,
                                "M 0 30 Q 500 30 1000 30"
                            ],
                            opacity: [0.3, 1, 0.5, 0.8, 0.3]
                        } : { opacity: 0.3 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                    />
                </svg>
                {/* Pluck Soundwave triggered on pluck */}
                <AnimatePresence>
                    {isPlucked && (
                        <motion.div
                            key="ripple"
                            initial={{ scale: 1, opacity: 0.8, left: '50%', top: '50%' }}
                            animate={{ scale: 30, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            style={{
                                position: 'absolute', width: 10, height: 10, borderRadius: '50%',
                                border: `1.5px solid ${color}`, transform: 'translate(-50%, -50%)',
                                zIndex: -1
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // --- Core Render Logic ---
    const renderThemeElements = () => {
        switch (name) {
            case 'Acoustic':
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '35%', height: '30%', display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: 0.9 }}>
                            {[...Array(6)].map((_, i) => (
                                <AcousticString key={`string-${i}`} color={color} i={i} />
                            ))}
                        </div>
                        {/* Sunbeam Dust */}
                        {[...Array(25)].map((_, i) => (
                            <motion.div
                                key={`dust-${i}`}
                                style={{ position: 'absolute', width: '3px', height: '3px', borderRadius: '50%', background: color, opacity: 0.2 }}
                                animate={{
                                    left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                                    top: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                                    opacity: [0, 0.4, 0]
                                }}
                                transition={{ duration: 6 + Math.random() * 6, repeat: Infinity }}
                            />
                        ))}
                    </div>
                );
            case 'Electronic':
                return (
                    <>
                        <motion.div style={{ position: 'absolute', inset: 0, background: 'white', mixBlendMode: 'overlay', zIndex: 100 }} animate={{ opacity: [0, 0.15, 0, 0, 0.05, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {[...Array(20)].map((_, i) => <GlitchStrip key={i} color={color} />)}
                            {[...Array(3)].map((_, i) => <LightningBolt key={i} color={color} />)}
                        </div>
                    </>
                );
            case 'Synthwave':
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        <RetroSun color={color} />
                        <CyberFloor color={color} />
                        {/* Flying Star Lines */}
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={`starline-${i}`}
                                style={{ position: 'absolute', width: '100px', height: '1px', background: 'white', opacity: 0.5 }}
                                animate={{ x: ['-20%', '120%'], y: [`${Math.random() * 60}%`, `${Math.random() * 60}%`] }}
                                transition={{ duration: 1 + Math.random() * 2, repeat: Infinity, delay: i }}
                            />
                        ))}
                    </div>
                );
            case 'Hip-Hop':
                // BASS IMPACT & SHOCKWAVES (Viewport-Locked Center)
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        {/* Target exactly 50vw/50vh to bypass any container offsets */}
                        <div style={{ position: 'fixed', left: '50vw', top: '50vh', width: 0, height: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Dynamic Speaker Core */}
                            <motion.div
                                style={{
                                    width: 300, height: 300, borderRadius: '50%',
                                    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                                    opacity: 0.5, filter: 'blur(40px)', position: 'absolute'
                                }}
                                animate={{ scale: [0.8, 1.5, 0.8] }}
                                transition={{ duration: 0.4, repeat: Infinity, ease: "easeOut" }}
                            />
                            {/* Radiating Shockwaves */}
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={`wave-${i}`}
                                    style={{
                                        width: 100, height: 100, borderRadius: '50%',
                                        border: `2px solid ${color}40`, position: 'absolute'
                                    }}
                                    animate={{ scale: [1, 18], opacity: [0.8, 0] }}
                                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                                />
                            ))}
                        </div>
                    </div>
                );
            case 'Funk':
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {[...Array(40)].map((_, i) => (
                            <motion.div
                                key={`disco-${i}`}
                                style={{
                                    position: 'absolute', width: '6px', height: '6px',
                                    borderRadius: '50%', background: '#ffcc33',
                                    boxShadow: `0 0 10px #ffcc33, 0 0 20px ${color}40`
                                }}
                                animate={{
                                    left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                                    top: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                                    scale: [0.4, 1.2, 0.4],
                                    opacity: [0, 0.4, 0]
                                }}
                                transition={{ duration: 5 + Math.random() * 5, repeat: Infinity }}
                            />
                        ))}
                    </div>
                );
            case 'R&B':
                // Neon City Stream
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', background: '#050010' }}>
                        {/* Deep Pulsing Background */}
                        <motion.div
                            style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, ${color}30 0%, transparent 80%)` }}
                            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {/* Horizontal Light Streaks */}
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={`streak-${i}`}
                                style={{
                                    position: 'absolute',
                                    height: 2 + Math.random() * 4,
                                    width: '40%',
                                    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                                    top: `${Math.random() * 100}%`,
                                    left: '-50%',
                                    filter: 'blur(4px)',
                                    opacity: 0.8
                                }}
                                animate={{ left: ['-50%', '150%'] }}
                                transition={{
                                    duration: 2 + Math.random() * 3,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                    ease: 'linear'
                                }}
                            />
                        ))}
                        {/* City Light Orbs */}
                        {[...Array(15)].map((_, i) => (
                            <motion.div
                                key={`city-orb-${i}`}
                                style={{
                                    position: 'absolute',
                                    width: 10 + Math.random() * 30,
                                    height: 10 + Math.random() * 30,
                                    background: i % 2 === 0 ? color : '#fff',
                                    borderRadius: '50%',
                                    filter: 'blur(20px)',
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`
                                }}
                                animate={{
                                    x: [0, -100],
                                    opacity: [0, 0.5, 0]
                                }}
                                transition={{
                                    duration: 5 + Math.random() * 5,
                                    repeat: Infinity,
                                    delay: Math.random() * 5,
                                    ease: 'linear'
                                }}
                            />
                        ))}
                    </div>
                );
            case 'Soul':
                // Vintage Warm Atmosphere (Warm Flares & Dusty Bokeh)
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {[...Array(8)].map((_, i) => <SoulFlare key={`soul-flare-${i}`} color={color} />)}
                        {/* Golden Particles */}
                        <div className="soul-bokeh">
                            {[...Array(25)].map((_, i) => (
                                <motion.div
                                    key={`bokeh-${i}`}
                                    style={{
                                        position: 'absolute', width: 20 + Math.random() * 60, height: 20 + Math.random() * 60,
                                        borderRadius: '50%', background: `${color}40`, filter: 'blur(10px)',
                                        left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`
                                    }}
                                    animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.2, 0.8], y: [0, -40, 0] }}
                                    transition={{ duration: 5 + Math.random() * 5, repeat: Infinity }}
                                />
                            ))}
                        </div>
                    </div>
                );
            case 'Jazz':
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4 }}>
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={`jazz-line-${i}`}
                                style={{
                                    position: 'absolute', width: '120%', height: '1px', background: color,
                                    left: '-10%', top: `${45 + i * 3}%`, boxShadow: `0 0 5px ${color}`
                                }}
                                animate={{ y: [0, 20, -20, 0], opacity: [0.2, 0.8, 0.2] }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                            />
                        ))}
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={`jazz-note-${i}`}
                                style={{ position: 'absolute', left: `${10 + (i * 12)}%`, bottom: '-10%' }}
                                animate={{ y: ['0vh', '-120vh'], x: [0, Math.sin(i) * 100, 0], rotate: [0, 45, -45, 0], opacity: [0, 1, 0] }}
                                transition={{ duration: 8 + Math.random() * 5, repeat: Infinity, ease: 'linear', delay: i * 0.8 }}
                            >
                                <Music size={40 + i * 5} color={color} style={{ filter: `drop-shadow(0 0 15px ${color})` }} />
                            </motion.div>
                        ))}
                    </div>
                );
            case 'Chill':
                // Accelerated Bubble Environment
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={`bubble-${i}`}
                                style={{
                                    position: 'absolute', width: 150 + Math.random() * 300, height: 150 + Math.random() * 300,
                                    borderRadius: '50%', background: `radial-gradient(circle, ${color}40, transparent 75%)`,
                                    filter: 'blur(20px)', mixBlendMode: 'screen'
                                }}
                                initial={{ opacity: 0, top: '110%' }}
                                animate={{
                                    left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                                    top: [`${110}%`, `-20%`],
                                    scale: [1, 1.3, 1], opacity: [0, 0.8, 0]
                                }}
                                transition={{ duration: 8 + Math.random() * 6, repeat: Infinity, ease: "linear" }}
                            />
                        ))}
                    </div>
                );
            case 'Lo-Fi':
                // Dreamy Cloudscape
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, #2e2e3e 0%, ${color}15 100%)` }} />

                        {/* Gentle Moon */}
                        <div style={{
                            position: 'absolute', top: '15%', right: '20%', width: 120, height: 120,
                            borderRadius: '50%', background: '#fff',
                            boxShadow: `0 0 60px ${color}60`
                        }} />

                        {/* Drifting Clouds */}
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={`cloud-${i}`}
                                style={{
                                    position: 'absolute',
                                    width: 200 + Math.random() * 200,
                                    height: 100 + Math.random() * 80,
                                    background: `${color}15`,
                                    borderRadius: '50%',
                                    filter: 'blur(40px)',
                                    top: `${20 + Math.random() * 60}%`,
                                    left: '-20%'
                                }}
                                animate={{ x: ['-20vw', '120vw'] }}
                                transition={{
                                    duration: 30 + Math.random() * 20,
                                    repeat: Infinity,
                                    delay: Math.random() * 20,
                                    ease: 'linear'
                                }}
                            />
                        ))}

                        {/* Floating Stars */}
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={`star-${i}`}
                                style={{
                                    position: 'absolute', width: 2, height: 2, background: '#fff',
                                    borderRadius: '50%',
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`
                                }}
                                animate={{ opacity: [0.2, 0.8, 0.2] }}
                                transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
                            />
                        ))}
                    </div>
                );
            case 'Alternative':
                // SCRAPBOOK NOISE - Collage Respawn
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        {[...Array(15)].map((_, i) => <AlternativeShape key={`shape-${i}`} color={color} />)}

                        {/* Jitter Grid */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `linear-gradient(transparent 98%, ${color}20 98%), linear-gradient(90deg, transparent 98%, ${color}20 98%)`,
                            backgroundSize: '30px 30px', opacity: 0.2
                        }} />
                    </div>
                );
            case 'Indie Pop':
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {[...Array(15)].map((_, i) => (
                            <motion.div
                                key={`heart-${i}`}
                                style={{
                                    position: 'absolute', left: `${Math.random() * 100}%`, bottom: '-10%',
                                }}
                                animate={{ y: ['0vh', '-120vh'], scale: [0.5, 1.2, 0.5], rotate: [0, 45, -45, 0], opacity: [0, 0.7, 0] }}
                                transition={{ duration: 10 + Math.random() * 10, repeat: Infinity, delay: i * 0.5 }}
                            >
                                <Heart size={40 + i * 2} color={color} fill={color} style={{ filter: `blur(${Math.random() * 4}px)`, opacity: 0.4 }} />
                            </motion.div>
                        ))}
                    </div>
                );
            case 'Pop':
                return (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={`pop-spark-${i}`}
                                style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                                animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() * 3 }}
                            >
                                <Sparkles size={60 + Math.random() * 60} color={color} style={{ filter: `drop-shadow(0 0 20px ${color})` }} />
                            </motion.div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none',
                // Richer gradient base
                background: `radial-gradient(circle at 50% 50%, ${color}25 0%, #050505 85%)`,
                overflow: 'hidden'
            }}
        >
            {/* 1. Large Fluid Blobs (Background Atmosphere) */}
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, 5, -5, 0],
                    background: `radial-gradient(circle at 50% 50%, ${color}15 0%, transparent 65%)`
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: 'absolute', inset: 0 }}
            />

            {/* 2. Theme Specific Elements (NEW) */}
            {renderThemeElements()}

            {/* 3. Strong Spotlight (Center Focus) */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '70vw', height: '70vw',
                background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                opacity: 0.8,
                filter: 'blur(80px)',
            }} />

            {/* 4. Secondary 'Stardust' Layer (Depth) */}
            <div className="dust-container">
                {Array(30).fill(0).map((_, i) => (
                    <motion.div
                        key={`dust-${i}`}
                        animate={{
                            y: [Math.random() * 100, Math.random() * 100 - 50],
                            opacity: [0, 0.4, 0]
                        }}
                        transition={{
                            duration: 5 + Math.random() * 10,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5
                        }}
                        style={{
                            position: 'absolute',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: '2px',
                            height: '2px',
                            background: '#fff',
                            borderRadius: '50%',
                            boxShadow: `0 0 4px ${color}`
                        }}
                    />
                ))}
            </div>

            {/* 5. Primary Dynamic Particles */}
            <div className="particles-container">
                {Array(25).fill(0).map((_, i) => (
                    <motion.div
                        key={`orb-${i}`}
                        className="genre-particle"
                        animate={getParticleVariants(i)}
                        style={{
                            position: 'absolute',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: 8 + Math.random() * 12, // Larger, softer orbs
                            height: 8 + Math.random() * 12,
                            background: color,
                            borderRadius: '50%',
                            filter: 'blur(4px)', // Increased blur for premium feel
                            mixBlendMode: 'screen'
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );
};

// Component for individual genre pill in the cloud
const ShowcaseGenre = ({ genre, color, delay, onHover }) => (
    <motion.div
        className="showcase-genre"
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay, type: "spring" }}
        whileHover={{ scale: 1.1, zIndex: 10 }}
        onMouseEnter={() => {
            onHover(true);
            genrePreviewManager.playGenrePreview(genre);
            audioEngine.duck();
        }}
        onMouseLeave={() => {
            onHover(false);
            genrePreviewManager.stopGenrePreview();
            audioEngine.unduck();
        }}
        style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
            color: 'white',
            padding: '12px 24px',
            borderRadius: '30px',
            cursor: 'pointer',
            backdropFilter: 'blur(5px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 4px 15px ${color}10`,
            position: 'relative'
        }}
    >
        <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`
        }} />
        <span style={{ fontWeight: 500, letterSpacing: '0.5px' }}>{genre}</span>
    </motion.div>
);

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

const LandingPage = ({ onLogin, isMobile }) => {
    const [audioEnabled, setAudioEnabled] = useState(true); // Keep track of engine status
    const [volume, setVolume] = useState(0.3); // Global Volume
    const [prevVolume, setPrevVolume] = useState(0.3); // For unmute
    const [swipeCount, setSwipeCount] = useState(0);

    const handleVolumeChange = (e) => {
        const newVol = parseFloat(e.target.value);
        setVolume(newVol);
        audioEngine.setVolume(newVol);
        genrePreviewManager.setVolume(newVol);

        if (newVol > 0 && !audioEnabled) {
            setAudioEnabled(true);
            if (!audioEngine.isEnabled) {
                audioEngine.enable();
                genrePreviewManager.enable();
                audioEngine.crossfadeToSection(activeSection);
            }
        } else if (newVol === 0 && audioEnabled) {
            // Optional: Disable engine on mute? No, keep running silent.
        }
    };

    const handleMuteToggle = () => {
        if (volume > 0) {
            setPrevVolume(volume);
            setVolume(0);
            audioEngine.setVolume(0);
            genrePreviewManager.setVolume(0);
        } else {
            const restore = prevVolume || 0.3;
            setVolume(restore);
            audioEngine.setVolume(restore);
            genrePreviewManager.setVolume(restore);

            if (restore > 0 && !audioEngine.isEnabled) { // Changed newVol to restore
                audioEngine.enable();
                genrePreviewManager.enable();
                audioEngine.crossfadeToSection(activeSection);
            }
        }
    };

    // Preload All Audio
    useEffect(() => {
        audioEngine.setVolume(volume);
        audioEngine.preloadAll();
        genrePreviewManager.preloadAll();
    }, []);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false); // New: Track if user has unlocked
    const [hoveredGenreData, setHoveredGenreData] = useState(null); // New: Track hovered genre for bg effect
    const containerRef = useRef(null);
    const lastSectionRef = useRef(0);

    // Handle welcome screen unlock
    const handleUnlock = async () => {
        setIsUnlocked(true);
        setHasInteracted(true);
        if (audioEnabled) {
            await audioEngine.enable();
            await genrePreviewManager.enable();
            audioEngine.crossfadeToSection(0); // Start with hero vibe
        }
    };

    // Auto-enable audio on first user interaction
    useEffect(() => {
        const enableAudioOnInteraction = async () => {
            if (!hasInteracted) {
                setHasInteracted(true);
                if (audioEnabled) {
                    await audioEngine.enable();
                    await genrePreviewManager.enable();
                    audioEngine.crossfadeToSection(0); // Start with hero vibe
                }
            }
        };

        const events = ['click', 'touchstart', 'scroll', 'keydown'];
        events.forEach(event => {
            window.addEventListener(event, enableAudioOnInteraction, { once: true, passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, enableAudioOnInteraction);
            });
        };
    }, [hasInteracted, audioEnabled]);

    // Crossfade audio when section changes
    useEffect(() => {
        if (activeSection !== lastSectionRef.current && hasInteracted && audioEnabled) {
            audioEngine.playSectionTransition();
            audioEngine.crossfadeToSection(activeSection);
            lastSectionRef.current = activeSection;
        }
    }, [activeSection, hasInteracted, audioEnabled]);

    // Scroll progress and section detection
    useEffect(() => {
        const handleScroll = () => {
            const container = containerRef.current;
            if (!container) return;

            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

            setScrollProgress(progress);
            setShowBackToTop(scrollTop > 500);

            // Determine active section
            const sections = container.querySelectorAll('section');
            sections.forEach((section, index) => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                    setActiveSection(index);
                }
            });
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);



    const handleDemoSwipe = (direction) => {
        setSwipeCount(prev => prev + 1);
    };

    const handleCTAClick = () => {
        audioEngine.playClick();
        onLogin();
    };

    const scrollToTop = () => {
        audioEngine.playClick();
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToSection = (index) => {
        const container = containerRef.current;
        if (!container) return;
        const sections = container.querySelectorAll('section');
        if (sections[index]) {
            sections[index].scrollIntoView({ behavior: 'smooth' });
            audioEngine.playHover();
        }
    };

    // Section names for navigation
    const sectionNames = ['Home', 'How It Works', 'Try It', 'Genres', 'Features', 'Start'];

    return (
        <>
            {/* Welcome Unlock Overlay */}
            <AnimatePresence>
                {!isUnlocked && (
                    <WelcomeUnlock onUnlock={handleUnlock} />
                )}
            </AnimatePresence>

            <div className={`landing-page ${!isUnlocked ? 'locked' : ''}`} ref={containerRef}>
                {/* IMMERSIVE GENRE BACKGROUND */}
                <AnimatePresence mode="wait">
                    {hoveredGenreData && <GenreBackground data={hoveredGenreData} key={hoveredGenreData.name} />}
                </AnimatePresence>

                {/* Scroll Progress Bar */}
                <motion.div
                    className="scroll-progress-bar"
                    style={{ scaleX: scrollProgress / 100 }}
                />

                {/* Navigation Dots (Desktop only) */}
                {!isMobile && (
                    <div className="nav-dots">
                        {sectionNames.map((name, i) => (
                            <motion.button
                                key={i}
                                className={`nav-dot ${activeSection === i ? 'active' : ''}`}
                                onClick={() => scrollToSection(i)}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                title={name}
                            >
                                <span className="nav-dot-label">{name}</span>
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Back to Top Button */}
                <AnimatePresence>
                    {showBackToTop && (
                        <motion.button
                            className="back-to-top"
                            onClick={scrollToTop}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ChevronDown size={24} style={{ transform: 'rotate(180deg)' }} />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Aurora Background with Parallax */}
                <motion.div
                    className="aurora-bg"
                    style={{ y: scrollProgress * -0.5 }}
                >
                    <GradientOrb color="rgba(29, 185, 84, 0.4)" size={600} x={10} y={20} delay={0} />
                    <GradientOrb color="rgba(255, 75, 43, 0.3)" size={500} x={70} y={60} delay={2} />
                    <GradientOrb color="rgba(0, 210, 255, 0.3)" size={450} x={30} y={70} delay={4} />
                    <GradientOrb color="rgba(138, 43, 226, 0.25)" size={400} x={80} y={10} delay={1} />
                </motion.div>

                {/* Floating music notes */}
                <div className="floating-notes">
                    {[...Array(8)].map((_, i) => (
                        <FloatingMusicNote key={i} delay={i * 1.5} x={10 + i * 12} />
                    ))}
                </div>

                {/* Grain overlay */}
                <div className="grain-overlay" />

                {/* Audio Toggle Button */}
                {/* Audio Volume Control */}
                <motion.div
                    className="volume-control"
                    initial={{ opacity: 0, width: 50 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    transition={{ delay: 2 }}
                    whileHover={{ scale: 1.05 }}
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        left: '30px',
                        zIndex: 1000,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        padding: '10px 15px',
                        borderRadius: '30px',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        width: 'auto', // Allow flex content to define width
                        minWidth: '160px' // Ensure slider fits
                    }}
                >
                    <div
                        onClick={handleMuteToggle}
                        style={{ cursor: 'pointer', display: 'flex', color: 'white' }}
                        title={volume === 0 ? "Unmute" : "Mute"}
                    >
                        {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        style={{
                            width: '100px',
                            height: '4px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '2px',
                            outline: 'none',
                            cursor: 'pointer',
                            accentColor: 'var(--accent)'
                        }}
                    />
                </motion.div>

                {/* ===== HERO SECTION ===== */}
                <section className="hero-section">
                    <div className="hero-content">
                        <div className="logo-container">
                            <PulseRing delay={0} />
                            <PulseRing delay={0.5} />
                            <PulseRing delay={1} />
                            <motion.div
                                className="logo-icon"
                                animate={{
                                    rotate: [0, 5, -5, 0],
                                    scale: [1, 1.05, 1]
                                }}
                                transition={{ repeat: Infinity, duration: 4 }}
                            >
                                <Music size={isMobile ? 60 : 100} color="var(--accent)" />
                            </motion.div>
                        </div>

                        <motion.h1
                            className="hero-title"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <HolographicText>SongSwipe</HolographicText>
                        </motion.h1>

                        <motion.p
                            className="hero-subtitle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <TypewriterText text="Discover • Swipe • Vibe" delay={800} />
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ delay: 1, duration: 0.8 }}
                        >
                            <Waveform />
                        </motion.div>

                        <motion.button
                            className="cta-button"
                            onClick={handleCTAClick}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="cta-glow" />
                            <Play size={24} fill="black" />
                            <span>Start Discovering</span>
                            <ArrowRight size={20} />
                        </motion.button>

                        <motion.div
                            className="powered-by"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5 }}
                        >
                            <Volume2 size={16} />
                            <span>Powered by Spotify</span>
                        </motion.div>
                    </div>

                    {!isMobile && (
                        <motion.div
                            className="scroll-indicator"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            onClick={() => scrollToSection(1)}
                            style={{ cursor: 'pointer' }}
                        >
                            <span>Explore</span>
                            <ChevronDown size={24} />
                        </motion.div>
                    )}
                </section>

                {/* ===== HOW IT WORKS SECTION ===== */}
                <section className="how-it-works-section">
                    <div className="section-header">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            How It <HolographicText>Works</HolographicText>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            Three simple steps to your next favorite song
                        </motion.p>
                    </div>

                    <div className="steps-grid">
                        <StepCard
                            number="01"
                            icon={ListMusic}
                            title="Pick a Playlist"
                            description="Choose from your Spotify playlists or let us analyze your top tracks for recommendations."
                            delay={0}
                        />
                        <StepCard
                            number="02"
                            icon={MousePointer}
                            title="Swipe to Discover"
                            description="Swipe right to add songs you love, left to skip. It's that simple."
                            delay={0.1}
                        />
                        <StepCard
                            number="03"
                            icon={Headphones}
                            title="Build Your Vibe"
                            description="Your choices train our Algorithm to find even better matches for your taste."
                            delay={0.2}
                        />
                    </div>
                </section>

                {/* ===== DEMO SECTION ===== */}
                {!isMobile && (
                    <section className="demo-section">
                        <div className="section-header">
                            <motion.h2
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                Try It <HolographicText>Now</HolographicText>
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                            >
                                No login required. Just swipe.
                            </motion.p>
                        </div>

                        <div className="demo-layout">
                            <motion.div
                                className="demo-container"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                            >
                                <DemoCard onSwipe={handleDemoSwipe} />
                            </motion.div>

                            <motion.div
                                className="demo-info"
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                            >
                                <VinylRecord />
                                <h3>Feel the Flow</h3>
                                <p>Every swipe teaches us your taste. The more you swipe, the better we get at finding your perfect tracks.</p>
                                {swipeCount > 0 && (
                                    <motion.div
                                        className="swipe-feedback"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        You've swiped {swipeCount} time{swipeCount > 1 ? 's' : ''}! 🎵
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </section>
                )}

                {/* ===== GENRE SHOWCASE SECTION ===== */}
                <section className="genre-section">
                    <div className="section-header">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            Every <HolographicText>Genre</HolographicText>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            From underground indie to global hits
                        </motion.p>
                    </div>

                    <div className="genre-cloud">
                        {GENRES_DATA.map((g, i) => (
                            <ShowcaseGenre
                                key={g.name}
                                genre={g.name}
                                color={g.color}
                                delay={i * 0.05}
                                onHover={(isHovering) => setHoveredGenreData(isHovering ? g : null)}
                            />
                        ))}
                    </div>

                    <motion.div
                        className="genre-visual"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <SoundWave />
                        <span>100M+ tracks from Spotify's library</span>
                        <SoundWave />
                    </motion.div>
                </section>

                {/* ===== FEATURES SECTION ===== */}
                <section className="features-section">
                    <div className="section-header">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            Why <HolographicText>SongSwipe</HolographicText>?
                        </motion.h2>
                    </div>

                    <div className="features-grid">
                        <FeatureCard
                            icon={Zap}
                            title="Lightning Fast"
                            description="Algorithm-powered recommendations that learn your taste in real-time. No waiting, just vibing."
                            color="var(--accent)"
                            delay={0}
                        />
                        <FeatureCard
                            icon={Headphones}
                            title="Instant Preview"
                            description="30-second previews so you never add a song you don't love. Hear before you commit."
                            color="var(--mood-hype)"
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={Globe}
                            title="Global Library"
                            description="Access Spotify's entire catalog. From chart-toppers to hidden gems waiting to be found."
                            color="var(--mood-chill)"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={Sparkles}
                            title="Smart Learning"
                            description="Every swipe makes us smarter. Your taste is unique, and we adapt to it."
                            color="#8b5cf6"
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={Radio}
                            title="Endless Discovery"
                            description="Never run out of new music. Our engine constantly finds fresh tracks for you."
                            color="#f59e0b"
                            delay={0.4}
                        />
                        <FeatureCard
                            icon={Waves}
                            title="Mood Matching"
                            description="Morning coffee or late-night drive? We adjust recommendations to fit your vibe."
                            color="#ec4899"
                            delay={0.5}
                        />
                    </div>
                </section>

                {/* ===== EXPERIENCE SECTION ===== */}
                <section className="experience-section">
                    <motion.div
                        className="experience-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <div className="experience-visual">
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                                className="rotating-disc"
                            >
                                <Disc3 size={120} />
                            </motion.div>
                        </div>
                        <div className="experience-content">
                            <h2>Ready to Find Your Sound?</h2>
                            <p>Join the flow and discover music that actually fits you. No algorithms pushing what's popular—just pure, personalized discovery.</p>
                            <motion.button
                                className="cta-button secondary"
                                onClick={handleCTAClick}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Play size={20} fill="currentColor" />
                                <span>Get Started Free</span>
                            </motion.button>
                        </div>
                    </motion.div>

                    {!isMobile && (
                        <div className="landing-footer-content">
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                            >
                                <p>
                                    Created by{' '}
                                    <a href="https://seppedorissen.be" target="_blank" rel="noopener noreferrer">
                                        Seppe Dorissen
                                    </a>
                                </p>
                                <span className="ai-badge">
                                    <Cpu size={14} />
                                    Experimental Build
                                </span>
                                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '8px' }}>
                                    Music: Josh Woodward, Broke For Free, Kai Engel
                                </p>
                            </motion.div>
                        </div>
                    )}
                </section>

                {/* ===== MOBILE CTA SECTION ===== */}
                {/* ===== CTA / FOOTER SECTION ===== */}
                <section className="mobile-cta-section" style={{ minHeight: '50vh', justifyContent: 'flex-start', paddingTop: '100px' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        {isMobile ? (
                            <>
                                <Smartphone size={48} color="var(--accent)" style={{ margin: '0 auto 20px' }} />
                                <h3>Swipe on the go</h3>
                                <p>Discover new music anywhere, anytime</p>
                            </>
                        ) : (
                            <>
                                <Headphones size={48} color="var(--accent)" style={{ margin: '0 auto 20px' }} />
                                <h3>Ready to Dive In?</h3>
                                <p>Start your discovery journey now</p>
                            </>
                        )}
                        <motion.button
                            className="cta-button"
                            onClick={handleCTAClick}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Play size={20} fill="black" />
                            <span>Start Now</span>
                        </motion.button>
                    </motion.div>

                    <div className="landing-footer-content" style={{ marginTop: 'auto', paddingBottom: '40px' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                        >
                            <p>
                                Created by{' '}
                                <a href="https://seppedorissen.be" target="_blank" rel="noopener noreferrer">
                                    Seppe Dorissen
                                </a>
                            </p>
                            <span className="ai-badge">
                                <Cpu size={14} />
                                Experimental Build
                            </span>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '16px' }}>
                                Music: Josh Woodward, Broke For Free, Kai Engel
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* ===== FOOTER ===== */}

            </div>
        </>
    );
};

export default LandingPage;

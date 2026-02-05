import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Music, Sparkles, Zap, Heart, X, ChevronDown, Globe, Cpu, Headphones, Play, ArrowRight, Volume2, VolumeX, MousePointer, Smartphone, ListMusic, Disc3, Radio, Waves } from 'lucide-react';
import './LandingPage.css';

// ============================================================================
// SPOTIFY-STYLE MINIMALIST AUDIO ENGINE
// Clean, crisp UI sounds with musical "stamps" for section transitions
// ============================================================================

// Musical stamps for each section (short 2-3 note motifs)
const SECTION_STAMPS = {
    0: { notes: [523.25, 659.25], name: 'hero' },           // C5, E5 - bright intro
    1: { notes: [392, 493.88, 587.33], name: 'howItWorks' }, // G4, B4, D5 - curious rising
    2: { notes: [440, 554.37], name: 'demo' },               // A4, C#5 - energetic
    3: { notes: [349.23, 440, 523.25], name: 'genres' },     // F4, A4, C5 - colorful
    4: { notes: [329.63, 415.30, 523.25], name: 'features' }, // E4, G#4, C5 - confident
    5: { notes: [523.25, 659.25, 783.99], name: 'cta' }      // C5, E5, G5 - triumphant major
};

class SectionAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.currentSection = -1;
        this.isEnabled = false;
        this.hasInteracted = false;
    }

    init() {
        if (this.ctx) return true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.ctx.destination);
            return true;
        } catch (e) {
            console.warn('Audio not supported');
            return false;
        }
    }

    async enable() {
        if (!this.init()) return;
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        this.isEnabled = true;
        this.hasInteracted = true;
        this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.2);
    }

    disable() {
        if (!this.ctx) return;
        this.isEnabled = false;
        this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    }

    // Clean pop sound for clicks
    playClick() {
        if (!this.init() || !this.isEnabled) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Soft tick for hover
    playHover() {
        if (!this.init() || !this.isEnabled) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 2400;

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.025);
    }

    // Pleasant swipe sounds
    playSwipe(direction) {
        if (!this.init() || !this.isEnabled) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;

        if (direction === 'right') {
            // Like: bright, happy ascending
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.12, now);
        } else {
            // Nope: softer descending
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
            gain.gain.setValueAtTime(0.08, now);
        }

        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Musical stamp for section transitions (2-3 note motif)
    playSectionTransition() {
        // Handled by crossfadeToSection
    }

    crossfadeToSection(sectionIndex) {
        if (!this.isEnabled || !this.ctx || sectionIndex === this.currentSection) return;

        const stamp = SECTION_STAMPS[sectionIndex] || SECTION_STAMPS[0];
        const now = this.ctx.currentTime;

        // Play musical stamp (quick ascending notes)
        stamp.notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 4000;

            const noteStart = now + (i * 0.06);
            const noteDuration = 0.15;

            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(noteStart);
            osc.stop(noteStart + noteDuration);
        });

        this.currentSection = sectionIndex;
    }
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
        this.audio = null;
        this.isEnabled = false;
        this.currentGenre = null;
        this.hoverTimeout = null;
    }

    init() {
        if (this.audio) return;
        this.audio = new Audio();
        this.audio.volume = 0;
    }

    async enable() {
        this.init();
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
        if (this.audio) {
            this.fadeOut();
            setTimeout(() => this.audio?.pause(), 400);
        }
    }

    fadeIn() {
        if (!this.audio) return;
        let vol = 0;
        this.audio.volume = 0;
        const fade = () => {
            vol += 0.05;
            if (vol < 0.5) {
                this.audio.volume = vol;
                requestAnimationFrame(fade);
            } else {
                this.audio.volume = 0.5;
            }
        };
        requestAnimationFrame(fade);
    }

    fadeOut() {
        if (!this.audio) return;
        let vol = this.audio.volume;
        const fade = () => {
            vol -= 0.05;
            if (vol > 0) {
                this.audio.volume = vol;
                requestAnimationFrame(fade);
            } else {
                this.audio.volume = 0;
            }
        };
        requestAnimationFrame(fade);
    }

    getPreviewUrl(genre) {
        return GENRE_AUDIO_FILES[genre] || null;
    }

    playGenrePreview(genre) {
        if (!this.isEnabled) return;

        // Clear any pending hover timeout
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
        }

        // 300ms delay to prevent accidental triggers
        this.hoverTimeout = setTimeout(async () => {
            if (this.currentGenre === genre) return;

            this.currentGenre = genre;

            // Fade out current audio if playing
            if (this.audio && !this.audio.paused) {
                this.fadeOut();
                await new Promise(r => setTimeout(r, 200));
                this.audio.pause();
            }

            // Get static preview URL
            const previewUrl = this.getPreviewUrl(genre);

            if (previewUrl && this.currentGenre === genre) {
                this.init();
                this.audio.src = previewUrl;
                this.audio.currentTime = 0;

                try {
                    await this.audio.play();
                    this.fadeIn();
                } catch (e) {
                    console.log('Preview play failed:', e);
                }
            }
        }, 300);
    }

    stopGenrePreview() {
        // Clear pending hover
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        this.currentGenre = null;

        // Fade out and stop
        if (this.audio && !this.audio.paused) {
            this.fadeOut();
            setTimeout(() => {
                this.audio?.pause();
            }, 400);
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

// Showcase Card (for the music showcase section)
const ShowcaseGenre = ({ genre, color, delay }) => (
    <motion.div
        className="showcase-genre"
        style={{ '--genre-color': color }}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay, type: 'spring' }}
        whileHover={{ scale: 1.1 }}
        onHoverStart={() => {
            audioEngine.playHover();
            genrePreviewManager.playGenrePreview(genre);
        }}
        onHoverEnd={() => {
            genrePreviewManager.stopGenrePreview();
        }}
    >
        {genre}
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
// MAIN LANDING PAGE COMPONENT
// ============================================================================

const LandingPage = ({ onLogin, isMobile }) => {
    const [audioEnabled, setAudioEnabled] = useState(true); // Auto-enabled
    const [swipeCount, setSwipeCount] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const [hasInteracted, setHasInteracted] = useState(false);
    const containerRef = useRef(null);
    const lastSectionRef = useRef(0);

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

    const handleAudioToggle = async () => {
        const newState = !audioEnabled;
        setAudioEnabled(newState);
        if (newState) {
            await audioEngine.enable();
            await genrePreviewManager.enable();
            audioEngine.crossfadeToSection(activeSection);
        } else {
            audioEngine.disable();
            genrePreviewManager.disable();
        }
    };

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
        <div className="landing-page" ref={containerRef}>
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
            <motion.button
                className="audio-toggle"
                onClick={handleAudioToggle}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
            >
                {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                <span>{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
            </motion.button>

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
                        description="Your choices train our AI to find even better matches for your taste."
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
                    <ShowcaseGenre genre="Indie Pop" color="#1DB954" delay={0} />
                    <ShowcaseGenre genre="Electronic" color="#00d2ff" delay={0.05} />
                    <ShowcaseGenre genre="Hip-Hop" color="#FF4B2B" delay={0.1} />
                    <ShowcaseGenre genre="R&B" color="#8b5cf6" delay={0.15} />
                    <ShowcaseGenre genre="Alternative" color="#f59e0b" delay={0.2} />
                    <ShowcaseGenre genre="Jazz" color="#ec4899" delay={0.25} />
                    <ShowcaseGenre genre="Soul" color="#10b981" delay={0.3} />
                    <ShowcaseGenre genre="Lo-Fi" color="#6366f1" delay={0.35} />
                    <ShowcaseGenre genre="Funk" color="#f97316" delay={0.4} />
                    <ShowcaseGenre genre="Acoustic" color="#84cc16" delay={0.45} />
                    <ShowcaseGenre genre="Synthwave" color="#a855f7" delay={0.5} />
                    <ShowcaseGenre genre="Chill" color="#22d3ee" delay={0.55} />
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
                        description="AI-powered recommendations that learn your taste in real-time. No waiting, just vibing."
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
            </section>

            {/* ===== MOBILE CTA SECTION ===== */}
            {isMobile && (
                <section className="mobile-cta-section">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Smartphone size={48} color="var(--accent)" />
                        <h3>Swipe on the go</h3>
                        <p>Discover new music anywhere, anytime</p>
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
                </section>
            )}

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer">
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
                        Experimental AI Build
                    </span>
                </motion.div>
            </footer>
        </div>
    );
};

export default LandingPage;

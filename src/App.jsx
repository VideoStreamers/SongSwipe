import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { Settings, User, X, Heart, Star, Music, Plus, RotateCcw, Zap, ChevronDown, Sparkles, Globe, Cpu, Volume2, VolumeX } from 'lucide-react';
import SongCard from './components/SongCard';
import PlaylistSidebar from './components/PlaylistSidebar';
import CurationSidebar from './components/CurationSidebar';
import SettingsModal from './components/SettingsModal';
import AnimatedBackground from './components/AnimatedBackground';
import MusicParticles from './components/MusicParticles';
import MusicVisualizer from './components/MusicVisualizer';
import LandingPage from './components/LandingPage';
import './components/AnimatedBackground.css';
import './App.css';
import './AppLayoutBugFix.css';
import { redirectToAuthCodeFlow, getAccessToken } from './services/spotifyAuth';
import * as SpotifyApi from './services/spotifyApi';
import { DiscoveryEngine } from './services/discoveryEngine';
import { UserFlavor } from './services/userFlavor';
import ColorThief from 'colorthief';

// ============================================================================
// STABLE COMPONENTS (Defined outside App to prevent re-mounting on every render)
// ============================================================================

const PhysicsBox = () => {
  const [elements, setElements] = useState([...Array(6)].map((_, i) => ({ id: i, x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 })));
  const scatter = () => {
    setElements(prev => prev.map(el => ({ ...el, x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 })));
  };
  return (
    <div onClick={scatter} style={{ position: 'relative', width: '100%', height: '180px', background: 'rgba(255,255,255,0.03)', borderRadius: '25px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)' }}>
      <div style={{ position: 'absolute', top: 10, left: 15, fontSize: '0.6rem', opacity: 0.4, fontWeight: 900 }}>TAP TO SCATTER</div>
      {elements.map(el => (
        <motion.div
          key={el.id}
          drag
          dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
          animate={{ x: el.x, y: el.y, rotate: [0, 10, -10, 0] }}
          transition={{ type: 'spring', damping: 10, stiffness: 100, rotate: { repeat: Infinity, duration: 2 } }}
          whileHover={{ scale: 1.3, zIndex: 10 }}
          whileDrag={{ scale: 0.9, rotate: 45 }}
          style={{ position: 'absolute', top: '40%', left: '45%', width: 45, height: 45, borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}
        >
          <Music size={22} color="white" />
        </motion.div>
      ))}
    </div>
  );
};

const ColorMixer = () => {
  const [color, setColor] = useState('var(--accent)');
  const handleMove = (e) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    setColor(`hsl(${percent * 360}, 70%, 60%)`);
  };
  return (
    <div onMouseMove={handleMove} style={{ width: '100%', height: '150px', background: color, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s linear', cursor: 'crosshair' }}>
      <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>SCRUB TO EXPLORE VIBE</span>
    </div>
  );
};

const PerspectiveCard = ({ children, className, style, onClick }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const handleMouse = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5; const y = (e.clientY - top) / height - 0.5;
    setRotateX(-y * 20); setRotateY(x * 20);
  };
  return (
    <motion.div className={className} style={{ ...style, perspective: 1000 }} onClick={onClick} onMouseMove={handleMouse} onMouseLeave={() => { setRotateX(0); setRotateY(0); }} animate={{ rotateX, rotateY }} transition={{ type: 'spring', damping: 20, stiffness: 150 }}>
      {children}
    </motion.div>
  );
};

const FrequencyScanner = () => {
  return (
    <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', padding: '20px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: [20, Math.random() * 100 + 20, 20],
            backgroundColor: ['var(--accent)', 'var(--mood-hype)', 'var(--accent)']
          }}
          transition={{
            repeat: Infinity,
            duration: Math.random() * 0.5 + 0.5,
            delay: i * 0.05
          }}
          style={{ width: '8px', borderRadius: '4px', background: 'var(--accent)' }}
        />
      ))}
    </div>
  );
};

const GravityTiles = () => {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', padding: '10px' }}>
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          animate={{
            scale: hovered === i ? 1.2 : 1,
            rotateZ: hovered === i ? 15 : 0,
            backgroundColor: hovered === i ? 'var(--vibe-primary)' : 'rgba(255,255,255,0.05)'
          }}
          style={{ height: '40px', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
        />
      ))}
    </div>
  );
};

const VibePulse = () => (
  <motion.div
    animate={{
      scale: [1, 1.1, 1],
      opacity: [0.3, 0.6, 0.3]
    }}
    transition={{ repeat: Infinity, duration: 2 }}
    style={{
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
      filter: 'blur(20px)',
      position: 'absolute',
      pointerEvents: 'none'
    }}
  />
);

const MagneticButton = ({ children, className, onClick, onMouseEnter, style }) => {
  const btnRef = useRef(null);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const handleMouse = (e) => {
    const { clientX, clientY } = e; const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const centerX = left + width / 2; const centerY = top + height / 2;
    setX((clientX - centerX) * 0.35); setY((clientY - centerY) * 0.35);
  };
  return (
    <motion.button ref={btnRef} className={className} onClick={onClick} onMouseMove={handleMouse} onMouseLeave={() => { setX(0); setY(0); }} onMouseEnter={onMouseEnter} style={style} animate={{ x, y }} transition={{ type: 'spring', damping: 15, stiffness: 150, mass: 0.1 }}>
      {children}
    </motion.button>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  const [token, setToken] = useState(null);
  const [songs, setSongs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [currentSeed, setCurrentSeed] = useState({ type: 'top-tracks', name: 'My Top Tracks', id: null });

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showVisuals, setShowVisuals] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [activeSongId, setActiveSongId] = useState(null);
  const [forcedSwipe, setForcedSwipe] = useState(null);
  const [activeArtistData, setActiveArtistData] = useState(null);
  const [pulseData, setPulseData] = useState({ active: false, color: null });
  const [vibeColor, setVibeColor] = useState('var(--accent)');
  // Mouse Physics
  const mouseX = useSpring(0, { damping: 35, stiffness: 120, mass: 0.6 });
  const mouseY = useSpring(0, { damping: 35, stiffness: 120, mass: 0.6 });
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCurationOpen, setIsCurationOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const volumeNotchRef = useRef(0);

  // Discovery Engine refs for swipe speed tracking
  const swipeStartTimeRef = useRef(null);
  const currentPlaylistTracksRef = useRef([]);

  const triggerPulse = (direction) => {
    let color = 'var(--accent)';
    if (direction === 'left') color = '#ff5252';
    if (direction === 'right' || direction === 'up') color = '#00e676';
    setPulseData({ active: true, color });
    setTimeout(() => setPulseData({ active: false, color: null }), 1200);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Offset by 100px to center the 200px cursor
      mouseX.set(e.clientX - 100);
      mouseY.set(e.clientY - 100);
    };
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (!songs || songs.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft': handleSwipe('left', songs[0]); break;
        case 'ArrowRight': handleSwipe('right', songs[0], true); break;
        case 'ArrowUp': handleSwipe('up', songs[0], true); break;
        case 'Backspace': handleRewind(); break;
        case '+': case '=': handleAddToLibrary(); break;
        case 'm': case 'M': setIsMuted(prev => !prev); break;
        case 'l': case 'L': setTheme(prev => prev === 'dark' ? 'light' : 'dark'); break;
        default: break;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [songs, token, currentSeed, history]);

  const playUISound = (type = 'click') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!window.audioCtx) window.audioCtx = new AudioContext();
      const ctx = window.audioCtx;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      if (type === 'swipe-right' || type === 'swipe-left') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(type === 'swipe-right' ? 150 : 100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'notch') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.start(now); osc.stop(now + 0.02);
      } else if (type === 'hype') {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      }
    } catch (e) { }
  };

  const handleVolumeChange = (newVal) => {
    setVolume(newVal);
    const currentNotch = Math.floor(newVal * 10);
    if (currentNotch !== volumeNotchRef.current) {
      playUISound('notch');
      volumeNotchRef.current = currentNotch;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.pushState({}, null, "/songswipe/");
      getAccessToken(code).then(accessToken => {
        setToken(accessToken);
        SpotifyApi.setAccessToken(accessToken);

        // Start a new Discovery Engine session
        UserFlavor.startSession();
        DiscoveryEngine.startNewSession();

        fetchInitialData();
      });
    }
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const userData = await SpotifyApi.getUserProfile(); setUser(userData);
      const topTracks = await SpotifyApi.getTopTracks();
      const seedIds = topTracks.length > 0 ? topTracks.slice(0, 5).map(t => t.id) : [];
      const recs = await SpotifyApi.getRecommendations(seedIds, [], [], 'discovery');
      setSongs(recs);
      if (recs.length > 0) { updateVibe(recs[0]); setActiveSongId(recs[0].id); }
    } catch (e) {
      console.error("Initial load failed", e);
      const recs = await SpotifyApi.getRecommendations([], [], [], 'discovery'); setSongs(recs);
    }
    setLoading(false);
  };

  // Removed mood dependency as mood selection was deleted
  useEffect(() => { if (token) fetchInitialData(); }, [token]);

  useEffect(() => {
    if (songs.length > 0 && songs[0].id !== activeSongId) {
      setActiveSongId(songs[0].id); updateVibe(songs[0]);
      SpotifyApi.getArtist(songs[0].artists[0].id).then(setActiveArtistData);
    }
  }, [songs]);

  const updateVibe = (song) => {
    if (!song || !showVisuals) return;
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = song.album.images[0].url;
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const color = colorThief.getColor(img);
        const palette = colorThief.getPalette(img, 2);
        const root = document.documentElement;

        // Transform colors for light/dark
        const transformColor = (rgb) => theme === 'light' ? rgb.map(c => Math.round(c + (255 - c) * 0.7)) : rgb;
        const primaryPastel = transformColor(color);
        const secondaryPastel = palette[1] ? transformColor(palette[1]) : transformColor([0, 0, 0]);

        // Update Vibe variables
        const primaryRgb = `rgb(${primaryPastel.join(',')})`;
        root.style.setProperty('--vibe-primary', primaryRgb);
        root.style.setProperty('--vibe-secondary', `rgb(${secondaryPastel.join(',')})`);
        setVibeColor(primaryRgb);

        // Update background dynamics
        if (theme === 'dark') {
          root.style.setProperty('--bg-primary-dynamic', `rgb(${color.map(c => Math.round(c * 0.15)).join(',')})`);
          root.style.setProperty('--bg-secondary-dynamic', `rgb(${color.map(c => Math.round(c * 0.25)).join(',')})`);
        } else {
          root.style.setProperty('--bg-primary-dynamic', `rgb(${color.map(c => Math.round(191 + (c - 191) * 0.25)).join(',')})`);
          root.style.setProperty('--bg-secondary-dynamic', `rgb(${color.map(c => Math.round(220 + (c - 220) * 0.15)).join(',')})`);
        }
      } catch (e) { console.warn("Color extraction failed", e); }
    };
  };

  useEffect(() => {
    // INITIAL LANDING VIBE
    const root = document.documentElement;
    root.style.setProperty('--vibe-primary', '#1DB954');
    root.style.setProperty('--vibe-secondary', '#050505');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (songs.length > 0) updateVibe(songs[0]);
    else {
      if (theme === 'dark') {
        root.style.setProperty('--bg-primary-dynamic', '#050505');
        root.style.setProperty('--bg-secondary-dynamic', '#0f0f0f');
      } else {
        root.style.setProperty('--bg-primary-dynamic', '#fcfdfe');
        root.style.setProperty('--bg-secondary-dynamic', '#ffffff');
      }
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', 'var(--mood-discovery)');

    // Detect mobile on mount
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePlaylistSelect = async (playlist) => {
    setLoading(true); setSongs([]); setHistory([]); setActiveSongId(null); setIsPaused(false);

    try {
      let allRecs = [];

      if (!playlist) {
        // "All Liked Songs" mode - use Discovery Engine for comprehensive analysis
        setCurrentSeed({ type: 'library', name: 'My Liked Songs', id: null });

        // Use the enhanced library-based recommendation
        allRecs = await SpotifyApi.getRecommendationsFromLibrary();
        currentPlaylistTracksRef.current = [];

      } else if (playlist.id === 'top-tracks') {
        // Top Tracks mode
        const top = await SpotifyApi.getTopTracks();
        const seedIds = top.map(t => t.id).slice(0, 5);
        setCurrentSeed({ type: 'top-tracks', name: 'My Top Tracks', id: null });
        allRecs = await SpotifyApi.getRecommendations(seedIds, [], [], 'discovery');
        currentPlaylistTracksRef.current = top;

      } else {
        // Playlist mode - use Discovery Engine for deep analysis
        const tracks = await SpotifyApi.getPlaylistTracks(playlist.id);
        currentPlaylistTracksRef.current = tracks;

        // Use Discovery Engine for comprehensive playlist analysis
        const profile = await DiscoveryEngine.analyzePlaylistVibe(tracks);

        if (profile) {
          // Save genres to UserFlavor
          if (profile.topGenres && profile.topGenres.length > 0) {
            UserFlavor.addGenres(profile.topGenres, 2);
          }

          // Get smart recommendations using the Discovery Engine
          allRecs = await DiscoveryEngine.getSmartRecommendations({
            playlistTracks: tracks,
            seedTracks: profile.topArtistIds || [],
            count: 30,
            diversityFactor: 0.2,
            excludeHistory: true
          });
        }

        // Fallback if Discovery Engine returns few results
        if (allRecs.length < 10) {
          console.log('[App] Discovery Engine returned few results, using fallback...');

          // Sample tracks for seeds
          const sampleSize = Math.min(15, tracks.length);
          const sampledTracks = [];
          const sections = 3;
          const tracksPerSection = Math.floor(sampleSize / sections);

          for (let section = 0; section < sections; section++) {
            const sectionStart = Math.floor((tracks.length / sections) * section);
            const sectionEnd = Math.floor((tracks.length / sections) * (section + 1));
            const sectionSize = sectionEnd - sectionStart;

            for (let i = 0; i < tracksPerSection; i++) {
              const step = Math.floor(sectionSize / tracksPerSection);
              const index = sectionStart + (i * step);
              if (index < tracks.length) sampledTracks.push(tracks[index]);
            }
          }

          // Extract genres
          const genreMap = {};
          const artistIds = [...new Set(sampledTracks.slice(0, 10).map(t => t.artists[0]?.id).filter(Boolean))];

          for (const artistId of artistIds.slice(0, 5)) {
            try {
              const artist = await SpotifyApi.getArtist(artistId);
              if (artist.genres) {
                artist.genres.forEach(g => genreMap[g] = (genreMap[g] || 0) + 1);
              }
            } catch (e) { /* silent */ }
          }

          const topGenres = Object.entries(genreMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([g]) => g);

          // Extract artist names from sampled tracks (avoids getTrack API calls)
          const artistNames = [...new Set(sampledTracks.slice(0, 10)
            .map(t => t.artists?.[0]?.name)
            .filter(Boolean))];

          // Get fallback recommendations using artist names instead of track IDs
          const recPromises = [
            SpotifyApi.getRecommendationsWithFeatures([], topGenres, {}, artistNames)
          ];

          const recResults = await Promise.all(recPromises);
          const fallbackRecs = recResults.flat();

          // Merge with existing recs, dedupe
          const existingIds = new Set(allRecs.map(r => r.id));
          fallbackRecs.forEach(r => {
            if (!existingIds.has(r.id)) {
              allRecs.push(r);
              existingIds.add(r.id);
            }
          });
        }

        setCurrentSeed({ type: 'playlist', name: playlist.name, id: playlist.id });
      }

      // Filter out any songs user has already swiped (cross-session dedup)
      const swipedIds = new Set(UserFlavor.getAllSwipedIds());
      allRecs = allRecs.filter(r => !swipedIds.has(r.id));

      // Shuffle with controlled randomness
      allRecs = allRecs.sort(() => Math.random() - 0.5);

      setSongs(allRecs);
      if (allRecs.length > 0) { updateVibe(allRecs[0]); setActiveSongId(allRecs[0].id); }
    } catch (e) {
      console.error("Failed to load playlist seeds", e);
    }
    setLoading(false);
  };

  // Track when user starts interacting with a card (for swipe speed measurement)
  const handleCardInteractionStart = () => {
    swipeStartTimeRef.current = Date.now();
  };

  const handleSwipe = async (direction, song, isForced = false) => {
    if (isForced) {
      swipeStartTimeRef.current = Date.now(); // Set start time for forced swipes
      setForcedSwipe(direction);
      setTimeout(() => processSwipe(direction, song), 250);
      return;
    }
    processSwipe(direction, song);
  };

  const processSwipe = async (direction, song) => {
    setForcedSwipe(null); setIsPaused(false);
    playUISound(direction === 'right' || direction === 'up' ? 'swipe-right' : 'swipe-left');

    // Calculate swipe speed for confidence tracking
    const swipeSpeed = swipeStartTimeRef.current ? (Date.now() - swipeStartTimeRef.current) : null;
    swipeStartTimeRef.current = null;

    // RECORD TO DISCOVERY ENGINE (comprehensive behavioral tracking)
    try {
      await DiscoveryEngine.recordSwipe(song, direction, swipeSpeed ? Date.now() - swipeSpeed : null);
    } catch (e) { console.warn('[App] Discovery Engine recording failed', e); }

    // RECORD TO USER FLAVOR (legacy + enhanced tracking)
    try {
      if (direction === 'up') {
        UserFlavor.recordSuperLike(song, { swipeSpeed });
      } else if (direction === 'right') {
        UserFlavor.recordLike(song, { swipeSpeed });
      } else if (direction === 'left') {
        UserFlavor.recordDislike(song, { swipeSpeed });
      }
    } catch (e) { console.warn('[App] UserFlavor recording failed', e); }

    // Spotify actions
    if (direction === 'right') {
      if (currentSeed.id) {
        SpotifyApi.addToPlaylist(currentSeed.id, song.uri).catch(e => console.error("Add failed", e));
      } else {
        SpotifyApi.saveTrack(song.id).catch(e => console.error("Save failed", e));
      }
      setLastAction({ text: 'Liked!', id: Date.now() });
    } else if (direction === 'up') {
      SpotifyApi.saveTrack(song.id).catch(e => console.error("Superlike failed", e));
      setLastAction({ text: 'Super Like!', id: Date.now() });
    } else {
      // Left swipe - no toast but still tracked
    }

    // Clear action after delay
    setTimeout(() => setLastAction(null), 2000);
    setHistory(prev => [...prev, song]);
    const newSongs = songs.slice(1);
    setSongs(newSongs);

    if (newSongs.length > 0) {
      updateVibe(newSongs[0]);
      setActiveSongId(newSongs[0].id);
      triggerPulse(direction);
    }

    // Refill queue when running low
    if (newSongs.length < 3) {
      try {
        // Use Discovery Engine for smarter refills
        const more = await DiscoveryEngine.getSmartRecommendations({
          playlistTracks: currentPlaylistTracksRef.current,
          seedTracks: [song.id],
          count: 20,
          diversityFactor: 0.3,
          excludeHistory: true
        });

        // Additional filtering against current queue and session history
        const seenIds = new Set([
          ...newSongs.map(x => x.id),
          ...history.map(x => x.id),
          song.id,
          ...UserFlavor.getAllSwipedIds()
        ]);

        const fresh = more.filter(s => !seenIds.has(s.id));

        if (fresh.length > 0) {
          setSongs(prev => [...prev, ...fresh]);
        } else {
          // Fallback to basic recommendations if Discovery Engine returns nothing new
          const fallbackRecs = await SpotifyApi.getRecommendations([song.id], [], [], 'discovery');
          const fallbackFresh = fallbackRecs.filter(s => !seenIds.has(s.id));
          setSongs(prev => [...prev, ...fallbackFresh]);
        }
      } catch (e) {
        console.warn('[App] Queue refill failed', e);
        // Silent fallback
        const fallback = await SpotifyApi.getRecommendations([song.id], [], [], 'discovery');
        const seenIds = new Set([...newSongs.map(x => x.id), ...history.map(x => x.id), song.id]);
        setSongs(prev => [...prev, ...fallback.filter(s => !seenIds.has(s.id))]);
      }
    }
  };

  const handleRewind = () => {
    if (history.length === 0) return; playUISound('click');
    const lastSong = history[history.length - 1]; setHistory(prev => prev.slice(0, prev.length - 1));
    setSongs(prev => [lastSong, ...prev]); updateVibe(lastSong); setActiveSongId(lastSong.id);
    setLastAction("Rewind!"); setTimeout(() => setLastAction(null), 1500);
  };

  const handleAddToLibrary = () => { if (songs.length > 0) setIsCurationOpen(true); };

  if (!token) {
    return (
      <div className={`app-container ${theme}-theme`}>
        <LandingPage onLogin={redirectToAuthCodeFlow} isMobile={isMobile} />
      </div>
    );
  }

  return (
    <div className={`app-container ${theme}-theme`}>
      <motion.div
        className="liquid-cursor"
        animate={{
          scale: [1, 1.05, 1],
        }}
        style={{
          x: mouseX,
          y: mouseY,
          background: `radial-gradient(circle, ${pulseData.color || vibeColor} 0%, transparent 60%)`,
          mixBlendMode: 'screen', // Lighter blend mode
          filter: 'blur(24px) brightness(1.3)', // Brighter!
        }}
        transition={{
          default: { type: 'spring', damping: 35, stiffness: 120, mass: 0.6 },
          scale: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
        }}
      />
      <AnimatedBackground />
      <MusicParticles color="var(--accent)" />

      {/* BACKGROUND VISUALIZER */}
      <MusicVisualizer
        isActive={!isPaused && songs.length > 0}
        tempo={120}
        color={pulseData.color || vibeColor}
      />

      <PlaylistSidebar onPlaylistSelect={handlePlaylistSelect} currentPlaylist={currentSeed} isOpen={isLibraryOpen} onToggle={() => setIsLibraryOpen(!isLibraryOpen)} />
      <CurationSidebar isOpen={isCurationOpen} onToggle={() => setIsCurationOpen(!isCurationOpen)} song={songs[0]} user={user} onActionComplete={(res) => setLastAction({ text: res.message, id: Date.now() })} />
      <div className="main-content">
        <header className="header">
          <div className="header-left" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Lights {theme === 'dark' ? 'On' : 'Off'}</button>
            <MagneticButton className="control-btn small" onClick={() => setIsSettingsOpen(true)} style={{ width: 44, height: 44 }}><Settings size={20} /></MagneticButton>
          </div>
          <div className="user-avatar">{user?.images?.[0] ? <img src={user.images[0].url} style={{ width: 32, height: 32, borderRadius: '50%' }} /> : <User size={24} />}</div>
        </header>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} showVisuals={showVisuals} setShowVisuals={setShowVisuals} user={user} />
        <AnimatePresence>
          {lastAction && (
            <motion.div
              key={lastAction.id || 'toast'} // Forces re-render on new ID
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="toast-notification"
            >
              {lastAction.text || lastAction}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="main-layout">
          <div className="side-controls left">
            <div className="history-stack" style={{ marginBottom: 40, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <AnimatePresence initial={false}>
                {history.slice(-3).reverse().map((swipedSong, i) => (
                  <motion.div key={swipedSong.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1 - (i * 0.3), x: 0 }} exit={{ opacity: 0 }} style={{ width: 50, height: 50, borderRadius: 12, overflow: 'hidden' }}>
                    <img src={swipedSong.album.images[swipedSong.album.images.length - 1].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="volume-wrapper">
              <div style={{ marginBottom: 12, opacity: 0.6 }}>{isMuted || volume === 0 ? <VolumeX size={18} onClick={() => setIsMuted(!isMuted)} /> : <Volume2 size={18} onClick={() => setIsMuted(!isMuted)} />}</div>
              <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="vertical-slider" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="deck-header" style={{ position: 'relative', zIndex: 200 }}>
              <h1 className="deck-title">SongSwipe</h1>
              <span className="deck-subtitle">{currentSeed.name}</span>
            </div>
            <div className="swipe-deck">
              {pulseData.active && <div className="discovery-pulse pulse-anim" style={{ '--pulse-color': pulseData.color }} />}
              <AnimatePresence mode="popLayout">
                {songs.map((song, index) => (index <= 2 && (<SongCard key={song.id} song={song} index={index} isFront={index === 0} isActive={activeSongId === song.id} isPaused={isPaused} forcedSwipe={index === 0 ? forcedSwipe : null} onSwipe={handleSwipe} volume={isMuted ? 0 : volume} onAdd={handleAddToLibrary} theme={theme} onInteractionStart={handleCardInteractionStart} />)))}
              </AnimatePresence>
            </div>
            <div className="controls">
              <MagneticButton className="control-btn nope" onClick={() => handleSwipe('left', songs[0])} onMouseEnter={() => playUISound('click')}><X size={28} /></MagneticButton>
              <MagneticButton className="control-btn super" onClick={handleRewind} onMouseEnter={() => playUISound('click')}><RotateCcw size={28} /></MagneticButton>
              <MagneticButton className="control-btn like" onClick={() => handleSwipe('right', songs[0])} onMouseEnter={() => playUISound('click')}><Heart size={28} /></MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

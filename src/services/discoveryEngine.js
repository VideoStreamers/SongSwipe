/**
 * 🎵 SONGSWIPE ADAPTIVE DISCOVERY ENGINE
 * 
 * A sophisticated recommendation system that learns from user behavior
 * to deliver highly personalized music suggestions.
 * 
 * Features:
 * - Behavioral tracking (swipe speed, patterns, session history)
 * - Audio feature preference learning (energy, tempo, valence, etc.)
 * - Artist/Genre affinity and blacklisting
 * - Playlist vibe fingerprinting
 * - Cross-session memory via localStorage
 * - Language/Market preference detection
 * - Time-of-day pattern awareness
 * 
 * Created by Seppe Dorissen with Antigravity AI
 */

import * as SpotifyApi from './spotifyApi';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'songswipe_discovery_engine_v2';
const MAX_SWIPED_HISTORY = 500;       // Max songs to remember (prevents unbounded growth)
const MAX_ARTIST_AFFINITY = 100;      // Max artists to track
const MAX_GENRE_TRACKING = 50;        // Max genres to track
const SWIPE_SPEED_THRESHOLD = 1500;   // ms - swipes faster than this are "confident"
const RECENT_WEIGHT_DECAY = 0.95;     // Decay factor for older preferences
const MIN_CONFIDENCE_SCORE = 0.3;     // Minimum confidence to use a preference

// Audio feature bounds for Spotify API
const FEATURE_BOUNDS = {
    energy: { min: 0, max: 1 },
    valence: { min: 0, max: 1 },
    danceability: { min: 0, max: 1 },
    tempo: { min: 40, max: 220 },
    acousticness: { min: 0, max: 1 },
    instrumentalness: { min: 0, max: 1 },
    speechiness: { min: 0, max: 1 },
    loudness: { min: -60, max: 0 }
};

// Valid Spotify genre seeds (official list)
const VALID_GENRE_SEEDS = new Set([
    "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues",
    "bossanova", "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical",
    "club", "comedy", "country", "dance", "dancehall", "death-metal", "deep-house", "detroit-techno", "disco",
    "disney", "drum-and-bass", "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french",
    "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge", "guitar", "happy", "hard-rock",
    "hardcore", "hardstyle", "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie",
    "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin",
    "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age",
    "new-release", "opera", "pagode", "party", "philippines-opm", "piano", "pop", "pop-film", "post-dubstep",
    "power-pop", "progressive-house", "psych-rock", "punk", "punk-rock", "r-n-b", "rainy-day", "reggae",
    "reggaeton", "road-trip", "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo",
    "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter", "soul", "soundtracks", "spanish", "study",
    "summer", "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop", "turkish", "work-out", "world-music"
]);

// Genre fallback mapping for common non-seed genres
const GENRE_FALLBACK_MAP = {
    'phonk': 'electronic', 'drift phonk': 'electronic', 'aggressive phonk': 'electronic',
    'lo-fi': 'chill', 'lofi': 'chill', 'lo fi': 'chill',
    'rap': 'hip-hop', 'trap': 'hip-hop', 'drill': 'hip-hop', 'grime': 'hip-hop',
    'wave': 'electronic', 'future bass': 'electronic', 'melodic bass': 'electronic',
    'bedroom pop': 'indie-pop', 'dream pop': 'indie-pop',
    'post-punk': 'punk', 'art punk': 'punk',
    'neo-soul': 'soul', 'nu jazz': 'jazz',
    'dark ambient': 'ambient', 'drone': 'ambient',
    'shoegaze': 'alternative', 'noise rock': 'rock',
    'synthpop': 'synth-pop', 'darkwave': 'synth-pop',
    'city pop': 'j-pop', 'future funk': 'electronic'
};

// ============================================================================
// DISCOVERY ENGINE STATE
// ============================================================================

const DEFAULT_ENGINE_STATE = {
    // Session & History
    swipedTrackIds: [],           // All swiped track IDs (for dedup)
    sessionStart: Date.now(),     // When current session started

    // Behavioral Tracking
    swipeTimestamps: [],          // Recent swipe timestamps for speed analysis
    likesThisSession: 0,
    dislikesThisSession: 0,

    // Preference Learning
    audioFeaturePrefs: {          // Rolling averages of liked songs' features
        energy: { sum: 0, count: 0, avg: null },
        valence: { sum: 0, count: 0, avg: null },
        danceability: { sum: 0, count: 0, avg: null },
        tempo: { sum: 0, count: 0, avg: null },
        acousticness: { sum: 0, count: 0, avg: null },
        instrumentalness: { sum: 0, count: 0, avg: null },
        speechiness: { sum: 0, count: 0, avg: null }
    },

    // Artist Affinity (positive = liked, negative = disliked)
    artistScores: {},             // { 'artistId': { name, score, lastSeen } }

    // Genre Tracking
    genreScores: {},              // { 'genre': { score, count } }
    blacklistedGenres: [],        // Genres to actively avoid

    // Language/Market Preferences
    preferredMarkets: {},         // { 'US': 5, 'NL': 3 }
    languageHints: {},            // { 'en': 10, 'es': 2 }

    // Time Patterns
    timeOfDayPrefs: {             // Hour buckets (0-5, 6-11, 12-17, 18-23)
        morning: { energy: [], tempo: [] },    // 6-11
        afternoon: { energy: [], tempo: [] },  // 12-17
        evening: { energy: [], tempo: [] },    // 18-23
        night: { energy: [], tempo: [] }       // 0-5
    },

    // Playlist Context
    currentPlaylistProfile: null, // Audio fingerprint of current source

    // Meta
    version: 2,
    lastUpdated: Date.now()
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let engineState = null;

/**
 * Load engine state from localStorage
 */
function loadState() {
    if (engineState) return engineState;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Version migration
            if (parsed.version !== DEFAULT_ENGINE_STATE.version) {
                console.log('[DiscoveryEngine] Migrating from version', parsed.version);
                engineState = { ...DEFAULT_ENGINE_STATE, ...parsed, version: DEFAULT_ENGINE_STATE.version };
            } else {
                engineState = { ...DEFAULT_ENGINE_STATE, ...parsed };
            }
        } else {
            engineState = { ...DEFAULT_ENGINE_STATE };
        }
    } catch (e) {
        console.warn('[DiscoveryEngine] Failed to load state, starting fresh', e);
        engineState = { ...DEFAULT_ENGINE_STATE };
    }

    return engineState;
}

/**
 * Save engine state to localStorage
 */
function saveState() {
    if (!engineState) return;

    try {
        engineState.lastUpdated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(engineState));
    } catch (e) {
        console.warn('[DiscoveryEngine] Failed to save state', e);
    }
}

/**
 * Get current time bucket for time-of-day patterns
 */
function getTimeBucket() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'night';
}

// ============================================================================
// BEHAVIORAL TRACKING
// ============================================================================

/**
 * Record a swipe with timing and direction
 * @param {Object} track - The track being swiped
 * @param {string} direction - 'left', 'right', or 'up'
 * @param {number} swipeStartTime - When the user started the swipe (optional)
 */
export async function recordSwipe(track, direction, swipeStartTime = null) {
    const state = loadState();
    const now = Date.now();

    // Calculate swipe speed if available
    const swipeSpeed = swipeStartTime ? (now - swipeStartTime) : null;
    const isConfidentSwipe = swipeSpeed && swipeSpeed < SWIPE_SPEED_THRESHOLD;

    // Track the swipe timestamp
    state.swipeTimestamps.push({ time: now, speed: swipeSpeed, direction });
    if (state.swipeTimestamps.length > 100) {
        state.swipeTimestamps = state.swipeTimestamps.slice(-100);
    }

    // Add to swiped history (for dedup)
    if (!state.swipedTrackIds.includes(track.id)) {
        state.swipedTrackIds.push(track.id);
        if (state.swipedTrackIds.length > MAX_SWIPED_HISTORY) {
            state.swipedTrackIds = state.swipedTrackIds.slice(-MAX_SWIPED_HISTORY);
        }
    }

    const isLike = direction === 'right' || direction === 'up';

    if (isLike) {
        state.likesThisSession++;

        // Update artist affinity (boost for likes)
        const weight = isConfidentSwipe ? 2 : 1;
        const superLikeBonus = direction === 'up' ? 2 : 1;

        track.artists.forEach(artist => {
            if (!state.artistScores[artist.id]) {
                state.artistScores[artist.id] = { name: artist.name, score: 0, lastSeen: now };
            }
            state.artistScores[artist.id].score += weight * superLikeBonus;
            state.artistScores[artist.id].lastSeen = now;
        });

        // Fetch and record audio features (OPTIONAL - API may be restricted)
        // Skip silently if unavailable
        /* Audio Features API is restricted for many Spotify keys
        try {
            const features = await SpotifyApi.getAudioFeatures([track.id]);
            if (features && features[0]) {
                updateAudioFeaturePrefs(features[0], weight * superLikeBonus);

                // Time-of-day preferences
                const bucket = getTimeBucket();
                state.timeOfDayPrefs[bucket].energy.push(features[0].energy);
                state.timeOfDayPrefs[bucket].tempo.push(features[0].tempo);

                // Trim time prefs
                if (state.timeOfDayPrefs[bucket].energy.length > 20) {
                    state.timeOfDayPrefs[bucket].energy = state.timeOfDayPrefs[bucket].energy.slice(-20);
                    state.timeOfDayPrefs[bucket].tempo = state.timeOfDayPrefs[bucket].tempo.slice(-20);
                }
            }
        } catch (e) {
            // Silent fail - features are optional enhancement
        }
        */

        // Try to extract genres from the first artist
        try {
            const artist = await SpotifyApi.getArtist(track.artists[0].id);
            if (artist && artist.genres) {
                artist.genres.forEach(genre => {
                    const normalized = genre.toLowerCase();
                    if (!state.genreScores[normalized]) {
                        state.genreScores[normalized] = { score: 0, count: 0 };
                    }
                    state.genreScores[normalized].score += weight;
                    state.genreScores[normalized].count++;
                });

                // Trim genre tracking
                const genreEntries = Object.entries(state.genreScores);
                if (genreEntries.length > MAX_GENRE_TRACKING) {
                    const sorted = genreEntries.sort((a, b) => b[1].count - a[1].count);
                    state.genreScores = Object.fromEntries(sorted.slice(0, MAX_GENRE_TRACKING));
                }
            }
        } catch (e) { /* Silent fail */ }

    } else {
        state.dislikesThisSession++;

        // Penalize artist affinity
        const penalty = isConfidentSwipe ? -2 : -1;
        track.artists.forEach(artist => {
            if (!state.artistScores[artist.id]) {
                state.artistScores[artist.id] = { name: artist.name, score: 0, lastSeen: now };
            }
            state.artistScores[artist.id].score += penalty;
            state.artistScores[artist.id].lastSeen = now;
        });

        // If artist score goes very negative, consider blacklisting their genres
        const mainArtistScore = state.artistScores[track.artists[0].id]?.score || 0;
        if (mainArtistScore <= -5) {
            try {
                const artist = await SpotifyApi.getArtist(track.artists[0].id);
                if (artist && artist.genres) {
                    // Check if these genres are consistently disliked
                    artist.genres.forEach(genre => {
                        const normalized = genre.toLowerCase();
                        if (!state.genreScores[normalized]) {
                            state.genreScores[normalized] = { score: 0, count: 0 };
                        }
                        state.genreScores[normalized].score += penalty;
                        state.genreScores[normalized].count++;

                        // Blacklist if score is very negative
                        if (state.genreScores[normalized].score <= -10 &&
                            !state.blacklistedGenres.includes(normalized)) {
                            state.blacklistedGenres.push(normalized);
                            console.log(`[DiscoveryEngine] Blacklisted genre: ${normalized}`);
                        }
                    });
                }
            } catch (e) { /* Silent fail */ }
        }
    }

    // Trim artist scores
    const artistEntries = Object.entries(state.artistScores);
    if (artistEntries.length > MAX_ARTIST_AFFINITY) {
        const sorted = artistEntries.sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score));
        state.artistScores = Object.fromEntries(sorted.slice(0, MAX_ARTIST_AFFINITY));
    }

    saveState();
}

/**
 * Update rolling audio feature preferences
 */
function updateAudioFeaturePrefs(features, weight = 1) {
    const state = loadState();

    ['energy', 'valence', 'danceability', 'tempo', 'acousticness', 'instrumentalness', 'speechiness'].forEach(key => {
        if (features[key] !== undefined && features[key] !== null) {
            state.audioFeaturePrefs[key].sum += features[key] * weight;
            state.audioFeaturePrefs[key].count += weight;
            state.audioFeaturePrefs[key].avg = state.audioFeaturePrefs[key].sum / state.audioFeaturePrefs[key].count;
        }
    });
}

// ============================================================================
// PLAYLIST FINGERPRINTING
// ============================================================================

/**
 * Analyze a playlist or liked songs collection to build a vibe fingerprint
 * @param {Array} tracks - Array of track objects
 * @returns {Object} Playlist profile with audio features, genres, artists, etc.
 */
export async function analyzePlaylistVibe(tracks) {
    if (!tracks || tracks.length === 0) return null;

    const state = loadState();

    // Sample tracks strategically (beginning, middle, end)
    const sampleSize = Math.min(30, tracks.length);
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

    // Fetch audio features for sampled tracks (OPTIONAL - may be restricted)
    const trackIds = sampledTracks.map(t => t.id).filter(Boolean);
    let audioProfile = null;

    /* Audio Features API is restricted for many Spotify keys - skip this
    try {
        const features = await SpotifyApi.getAudioFeatures(trackIds);
        if (features && Array.isArray(features)) {
            const valid = features.filter(Boolean);
            if (valid.length > 0) {
                const avg = (key) => valid.reduce((sum, f) => sum + (f[key] || 0), 0) / valid.length;
                const stdDev = (key, mean) => {
                    const squaredDiffs = valid.map(f => Math.pow((f[key] || mean) - mean, 2));
                    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / valid.length);
                };

                const avgEnergy = avg('energy');
                const avgValence = avg('valence');
                const avgDanceability = avg('danceability');
                const avgTempo = avg('tempo');

                audioProfile = {
                    energy: { avg: avgEnergy, stdDev: stdDev('energy', avgEnergy) },
                    valence: { avg: avgValence, stdDev: stdDev('valence', avgValence) },
                    danceability: { avg: avgDanceability, stdDev: stdDev('danceability', avgDanceability) },
                    tempo: { avg: avgTempo, stdDev: stdDev('tempo', avgTempo) },
                    acousticness: { avg: avg('acousticness') },
                    instrumentalness: { avg: avg('instrumentalness') },
                    speechiness: { avg: avg('speechiness') },
                    popularity: sampledTracks.reduce((sum, t) => sum + (t.popularity || 50), 0) / sampledTracks.length,

                    // Era/Year analysis
                    yearRange: analyzeYearRange(sampledTracks),

                    // Calculate bounds (for recommendation API)
                    bounds: {
                        min_energy: Math.max(0, avgEnergy - stdDev('energy', avgEnergy) * 1.5),
                        max_energy: Math.min(1, avgEnergy + stdDev('energy', avgEnergy) * 1.5),
                        min_valence: Math.max(0, avgValence - stdDev('valence', avgValence) * 1.5),
                        max_valence: Math.min(1, avgValence + stdDev('valence', avgValence) * 1.5),
                        min_tempo: Math.max(40, avgTempo - 30),
                        max_tempo: Math.min(220, avgTempo + 30)
                    }
                };
            }
        }
    } catch (e) {
        console.warn('[DiscoveryEngine] Audio feature extraction failed', e);
    }
    */

    // Build a simpler profile based on popularity
    audioProfile = {
        popularity: sampledTracks.reduce((sum, t) => sum + (t.popularity || 50), 0) / sampledTracks.length,
        yearRange: analyzeYearRange(sampledTracks)
    };

    // Extract genres from artists
    const genreMap = {};
    const artistIds = [...new Set(sampledTracks.map(t => t.artists?.[0]?.id).filter(Boolean))];

    for (const artistId of artistIds.slice(0, 10)) {
        try {
            const artist = await SpotifyApi.getArtist(artistId);
            if (artist && artist.genres) {
                artist.genres.forEach(g => {
                    genreMap[g] = (genreMap[g] || 0) + 1;
                });
            }
        } catch (e) { /* Silent fail */ }
    }

    const topGenres = Object.entries(genreMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([g]) => g);

    // Create playlist profile
    // Also extract artist names for direct search (avoids getTrack API)
    const topArtistNames = [...new Set(sampledTracks
        .map(t => t.artists?.[0]?.name)
        .filter(Boolean))].slice(0, 10);

    const profile = {
        audioProfile,
        topGenres,
        topArtistIds: artistIds.slice(0, 5),
        topArtistNames,  // NEW: Artist names for direct search
        sampleSize: sampledTracks.length,
        totalSize: tracks.length
    };

    // Store as current context
    state.currentPlaylistProfile = profile;
    saveState();

    return profile;
}

/**
 * Analyze the year range of tracks
 */
function analyzeYearRange(tracks) {
    const years = tracks
        .map(t => {
            const dateStr = t.album?.release_date;
            if (dateStr) {
                const year = parseInt(dateStr.substring(0, 4));
                if (!isNaN(year)) return year;
            }
            return null;
        })
        .filter(Boolean);

    if (years.length === 0) return null;

    years.sort((a, b) => a - b);
    return {
        min: years[0],
        max: years[years.length - 1],
        median: years[Math.floor(years.length / 2)],
        preferRecent: years.filter(y => y >= 2020).length > years.length * 0.5
    };
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Get the best possible recommendations based on all available context
 * @param {Object} options - Configuration options
 * @returns {Array} Recommended tracks
 */
export async function getSmartRecommendations(options = {}) {
    const {
        playlistTracks = null,      // Source playlist tracks (if any)
        seedTracks = [],            // Specific seed track IDs
        count = 25,                 // Number of recommendations desired
        diversityFactor = 0.3,      // 0 = strict matching, 1 = maximum diversity
        excludeHistory = true       // Exclude previously swiped songs
    } = options;

    const state = loadState();
    let allRecommendations = [];

    // Strategy 1: If we have playlist context, use its fingerprint
    if (playlistTracks && playlistTracks.length > 0) {
        const profile = await analyzePlaylistVibe(playlistTracks);
        if (profile) {
            const playlistRecs = await getRecommendationsFromProfile(profile, seedTracks);
            allRecommendations.push(...playlistRecs);
        }
    }

    // Strategy 2: Use learned user preferences
    if (hasEnoughPreferenceData()) {
        const prefRecs = await getRecommendationsFromPreferences();
        allRecommendations.push(...prefRecs);
    }

    // Strategy 3: Seed-based recommendations with learned filters
    if (seedTracks.length > 0) {
        const seedRecs = await getRecommendationsFromSeeds(seedTracks);
        allRecommendations.push(...seedRecs);
    }

    // Strategy 4: Diversity injection (explore new territory)
    if (diversityFactor > 0) {
        const diversityRecs = await getDiversityRecommendations(diversityFactor);
        allRecommendations.push(...diversityRecs);
    }

    // Post-processing: Filter, dedupe, score, and sort
    const processed = postProcessRecommendations(allRecommendations, {
        excludeHistory,
        count,
        state
    });

    return processed;
}

/**
 * Check if we have enough preference data to make informed recommendations
 */
function hasEnoughPreferenceData() {
    const state = loadState();
    const hasFeatureData = state.audioFeaturePrefs.energy.count >= 5;
    const hasArtistData = Object.keys(state.artistScores).length >= 3;
    const hasGenreData = Object.keys(state.genreScores).length >= 2;

    return hasFeatureData || hasArtistData || hasGenreData;
}

/**
 * Generate recommendations from a playlist profile
 */
async function getRecommendationsFromProfile(profile, additionalSeeds = []) {
    // No longer rely on audio profile features (API restricted)
    const targetFeatures = {}; // Skip audio-based features

    // Map genres to valid seeds
    const validGenres = mapToValidGenreSeeds(profile.topGenres || []);

    // Use artist names from profile for searching (avoids getTrack API)
    const artistNames = profile.topArtistNames || [];

    try {
        const recs = await SpotifyApi.getRecommendationsWithFeatures(
            [],  // Don't use track IDs (API restricted)
            validGenres.slice(0, 3),
            targetFeatures,
            artistNames.slice(0, 5)  // Pass artist names for search
        );
        return recs || [];
    } catch (e) {
        console.warn('[DiscoveryEngine] Profile-based recs failed', e);
        return [];
    }
}

/**
 * Generate recommendations from learned user preferences
 */
async function getRecommendationsFromPreferences() {
    const state = loadState();

    // Get top liked artists (as names for search)
    const topArtistNames = Object.entries(state.artistScores)
        .filter(([, data]) => data.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([, data]) => data.name)
        .filter(Boolean);

    // Get top genres
    const topGenres = Object.entries(state.genreScores)
        .filter(([, data]) => data.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([genre]) => genre);

    const validGenres = mapToValidGenreSeeds(topGenres);

    // Skip audio feature targeting since API is restricted
    const targetFeatures = {};

    try {
        // Use genres and artist names for search
        const seedGenres = validGenres.slice(0, 4);

        if (seedGenres.length > 0 || topArtistNames.length > 0) {
            const recs = await SpotifyApi.getRecommendationsWithFeatures(
                [],
                seedGenres,
                targetFeatures,
                topArtistNames.slice(0, 3)
            );
            return recs || [];
        }
    } catch (e) {
        console.warn('[DiscoveryEngine] Preference-based recs failed', e);
    }

    return [];
}

/**
 * Generate recommendations from specific seed tracks
 * NOTE: Since getTrack API is restricted, this now falls back to genre/artist search
 */
async function getRecommendationsFromSeeds(seedTrackIds) {
    // Skip audio feature filtering (API restricted)
    const targetFeatures = {};

    // Get learned genres as fallback
    const state = loadState();
    const topGenres = Object.entries(state.genreScores)
        .filter(([, data]) => data.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 3)
        .map(([genre]) => genre);

    const validGenres = mapToValidGenreSeeds(topGenres);

    try {
        const recs = await SpotifyApi.getRecommendationsWithFeatures(
            [],  // Can't use track IDs (getTrack is restricted)
            validGenres.length > 0 ? validGenres : ['pop', 'indie'],
            targetFeatures
        );
        return recs || [];
    } catch (e) {
        console.warn('[DiscoveryEngine] Seed-based recs failed', e);
        return [];
    }
}

/**
 * Generate diversity recommendations to explore new territory
 */
async function getDiversityRecommendations(diversityFactor) {
    const state = loadState();

    // Get genres we haven't explored much
    const exploredGenres = new Set(Object.keys(state.genreScores));
    const blacklisted = new Set(state.blacklistedGenres);

    // Find unexplored but related genres
    const unexplored = [...VALID_GENRE_SEEDS].filter(g =>
        !exploredGenres.has(g) && !blacklisted.has(g)
    );

    if (unexplored.length === 0) return [];

    // Pick random unexplored genre
    const randomGenre = unexplored[Math.floor(Math.random() * unexplored.length)];

    // No audio feature targeting (API restricted)
    const targetFeatures = {};

    try {
        const recs = await SpotifyApi.getRecommendationsWithFeatures(
            [],
            [randomGenre],
            targetFeatures
        );

        // Only return a few diversity picks
        const diversityCount = Math.floor((recs?.length || 0) * diversityFactor * 0.5);
        return (recs || []).slice(0, diversityCount);
    } catch (e) {
        return [];
    }
}

/**
 * Map extracted genres to valid Spotify genre seeds
 */
function mapToValidGenreSeeds(genres) {
    const mapped = [];

    for (const genre of genres) {
        const normalized = genre.toLowerCase().replace(/ /g, '-');

        // Direct match
        if (VALID_GENRE_SEEDS.has(normalized)) {
            mapped.push(normalized);
            continue;
        }

        // Fallback mapping
        const fallback = GENRE_FALLBACK_MAP[normalized] || GENRE_FALLBACK_MAP[genre.toLowerCase()];
        if (fallback && !mapped.includes(fallback)) {
            mapped.push(fallback);
        }
    }

    return mapped;
}

/**
 * Post-process recommendations: filter, dedupe, score, and sort
 */
function postProcessRecommendations(tracks, options) {
    const { excludeHistory, count, state } = options;

    // Dedup by track ID
    const seen = new Set();
    let unique = [];

    for (const track of tracks) {
        if (!seen.has(track.id)) {
            seen.add(track.id);
            unique.push(track);
        }
    }

    // Filter out previously swiped tracks
    if (excludeHistory) {
        const swipedSet = new Set(state.swipedTrackIds);
        unique = unique.filter(t => !swipedSet.has(t.id));
    }

    // Filter out blacklisted genres (soft filter - check artist genres)
    // This is expensive so we'll do it sparingly
    if (state.blacklistedGenres.length > 0) {
        // For now, just filter by artist name patterns (light check)
        // Full genre checking would require additional API calls
    }

    // Score tracks based on artist affinity
    const scored = unique.map(track => {
        let score = track.popularity || 50; // Base score

        // Artist affinity bonus/penalty
        track.artists.forEach(artist => {
            const affinity = state.artistScores[artist.id];
            if (affinity) {
                score += affinity.score * 5; // Significant impact
            }
        });

        // Prefer tracks with previews
        if (track.preview_url) score += 10;

        return { ...track, _discoveryScore: score };
    });

    // Sort by score but inject some randomness
    scored.sort((a, b) => {
        const scoreDiff = (b._discoveryScore || 0) - (a._discoveryScore || 0);
        const randomness = (Math.random() - 0.5) * 20; // ±10 random variance
        return scoreDiff + randomness;
    });

    // Return requested count
    return scored.slice(0, count);
}

// ============================================================================
// UTILITY & STATS FUNCTIONS
// ============================================================================

/**
 * Check if a track has already been swiped
 */
export function hasBeenSwiped(trackId) {
    const state = loadState();
    return state.swipedTrackIds.includes(trackId);
}

/**
 * Get discovery statistics
 */
export function getDiscoveryStats() {
    const state = loadState();

    const topArtists = Object.entries(state.artistScores)
        .filter(([, data]) => data.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([, data]) => data.name);

    const topGenres = Object.entries(state.genreScores)
        .filter(([, data]) => data.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([genre]) => genre);

    const prefs = state.audioFeaturePrefs;

    return {
        totalSwiped: state.swipedTrackIds.length,
        sessionLikes: state.likesThisSession,
        sessionDislikes: state.dislikesThisSession,
        likeRatio: state.likesThisSession / Math.max(1, state.likesThisSession + state.dislikesThisSession),
        topArtists,
        topGenres,
        blacklistedGenres: state.blacklistedGenres,
        audioPreferences: {
            energy: prefs.energy.avg,
            valence: prefs.valence.avg,
            danceability: prefs.danceability.avg,
            tempo: prefs.tempo.avg
        },
        hasEnoughData: hasEnoughPreferenceData()
    };
}

/**
 * Reset all discovery data
 */
export function resetDiscoveryData() {
    engineState = { ...DEFAULT_ENGINE_STATE };
    saveState();
    console.log('[DiscoveryEngine] All discovery data reset');
}

/**
 * Start a new session (keeps history but resets session counters)
 */
export function startNewSession() {
    const state = loadState();
    state.sessionStart = Date.now();
    state.likesThisSession = 0;
    state.dislikesThisSession = 0;
    state.swipeTimestamps = [];
    saveState();
}

// ============================================================================
// EXPORTS FOR INTEGRATION
// ============================================================================

export const DiscoveryEngine = {
    recordSwipe,
    analyzePlaylistVibe,
    getSmartRecommendations,
    hasBeenSwiped,
    getDiscoveryStats,
    resetDiscoveryData,
    startNewSession
};

export default DiscoveryEngine;

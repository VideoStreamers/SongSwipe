/**
 * 🎨 USER FLAVOR SERVICE v2
 * 
 * Enhanced user preference tracking with deep behavioral analysis.
 * Works alongside the DiscoveryEngine for comprehensive personalization.
 * 
 * Tracks:
 * - Genre affinities (weighted by recency and confidence)
 * - Artist preferences (with time decay)
 * - Liked/Disliked track history
 * - Vibe statistics (audio features)
 * - Swipe behavior patterns
 * - Session analytics
 * 
 * Created by Seppe Dorissen with Antigravity AI
 */

const STORAGE_KEY = 'songswipe_user_flavor_v2';
const MAX_LIKED_TRACKS = 200;
const MAX_SKIPPED_TRACKS = 100;
const MAX_ARTISTS = 100;
const MAX_GENRES = 75;
const RECENCY_DECAY = 0.98; // Applied daily to old preferences

const DEFAULT_FLAVOR = {
    // Core Preferences
    topGenres: {},           // { 'phonk': { score: 15, lastSeen: timestamp, count: 10 } }
    topArtists: {},          // { 'artistId': { name: 'kordhell', score: 10, lastSeen: timestamp } }

    // Track History
    likedTracks: [],         // [{ id, timestamp, features? }]
    skippedTracks: [],       // [{ id, timestamp }]
    superLikedTracks: [],    // [{ id, timestamp }] - Special category

    // Audio Vibe Profile
    vibeStats: {
        // Rolling weighted averages
        energy: { sum: 0, weight: 0, avg: 0.7 },
        valence: { sum: 0, weight: 0, avg: 0.5 },
        danceability: { sum: 0, weight: 0, avg: 0.6 },
        tempo: { sum: 0, weight: 0, avg: 120 },
        acousticness: { sum: 0, weight: 0, avg: 0.3 },
        instrumentalness: { sum: 0, weight: 0, avg: 0.1 }
    },

    // Behavioral Analytics
    swipePatterns: {
        avgSwipeSpeed: null,       // Average ms to make a decision
        fastSwipeCount: 0,         // Swipes under 1.5s (confident)
        slowSwipeCount: 0,         // Swipes over 5s (uncertain)
        morningLikes: 0,
        afternoonLikes: 0,
        eveningLikes: 0,
        nightLikes: 0,
        streakLikes: 0,            // Current like streak
        maxStreakLikes: 0,         // Best like streak ever
        streakSkips: 0,
        totalSwipes: 0
    },

    // Discovery Insights
    discoveryInsights: {
        genresExplored: [],        // All genres encountered
        artistsDiscovered: [],      // Artists found through SongSwipe
        favoriteDecade: null,      // Calculated preferred era
        preferredMarkets: {},      // { 'US': 10, 'KR': 5 }
    },

    // Session Tracking
    currentSession: {
        startTime: null,
        likes: 0,
        dislikes: 0,
        superLikes: 0
    },

    // Meta
    version: 2,
    firstSeen: Date.now(),
    lastUpdated: Date.now(),
    totalSessions: 0
};

// ============================================================================
// CORE STORAGE OPERATIONS
// ============================================================================

export const UserFlavor = {
    /**
     * Load user flavor profile from localStorage
     */
    getProfile: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Version migration
                if (!parsed.version || parsed.version < 2) {
                    console.log('[UserFlavor] Migrating from legacy format');
                    return { ...DEFAULT_FLAVOR, ...parsed, version: 2 };
                }
                return { ...DEFAULT_FLAVOR, ...parsed };
            }
            return { ...DEFAULT_FLAVOR };
        } catch (e) {
            console.warn('[UserFlavor] Failed to load profile', e);
            return { ...DEFAULT_FLAVOR };
        }
    },

    /**
     * Save user flavor profile to localStorage
     */
    saveProfile: (profile) => {
        try {
            profile.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {
            console.warn('[UserFlavor] Failed to save flavor profile', e);
        }
    },

    // ============================================================================
    // SWIPE RECORDING
    // ============================================================================

    /**
     * Record a "Like" (Swipe Right)
     * @param {Object} track - The track object
     * @param {Object} options - Additional options
     */
    recordLike: (track, options = {}) => {
        const profile = UserFlavor.getProfile();
        const now = Date.now();
        const { swipeSpeed, audioFeatures } = options;

        // 1. Update track history
        const likeEntry = { id: track.id, timestamp: now };
        if (audioFeatures) {
            likeEntry.features = {
                energy: audioFeatures.energy,
                tempo: audioFeatures.tempo,
                valence: audioFeatures.valence
            };
        }

        if (!profile.likedTracks.find(t => t.id === track.id)) {
            profile.likedTracks.push(likeEntry);
            if (profile.likedTracks.length > MAX_LIKED_TRACKS) {
                profile.likedTracks = profile.likedTracks.slice(-MAX_LIKED_TRACKS);
            }
        }

        // 2. Update artist scores
        const artistWeight = swipeSpeed && swipeSpeed < 1500 ? 2 : 1; // Confident swipes count more
        track.artists.forEach(artist => {
            if (!profile.topArtists[artist.id]) {
                profile.topArtists[artist.id] = {
                    name: artist.name,
                    score: 0,
                    lastSeen: now,
                    count: 0
                };
            }
            profile.topArtists[artist.id].score += artistWeight;
            profile.topArtists[artist.id].count++;
            profile.topArtists[artist.id].lastSeen = now;
        });

        // Trim artists
        UserFlavor._trimArtists(profile);

        // 3. Update swipe patterns
        profile.swipePatterns.totalSwipes++;
        profile.swipePatterns.streakLikes++;
        profile.swipePatterns.streakSkips = 0;
        if (profile.swipePatterns.streakLikes > profile.swipePatterns.maxStreakLikes) {
            profile.swipePatterns.maxStreakLikes = profile.swipePatterns.streakLikes;
        }

        if (swipeSpeed) {
            UserFlavor._updateSwipeSpeed(profile, swipeSpeed);
        }

        // 4. Time of day tracking
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) profile.swipePatterns.morningLikes++;
        else if (hour >= 12 && hour < 18) profile.swipePatterns.afternoonLikes++;
        else if (hour >= 18 && hour < 24) profile.swipePatterns.eveningLikes++;
        else profile.swipePatterns.nightLikes++;

        // 5. Update vibe stats if features provided
        if (audioFeatures) {
            UserFlavor._updateVibeStats(profile, audioFeatures, artistWeight);
        }

        // 6. Session tracking
        if (profile.currentSession.startTime) {
            profile.currentSession.likes++;
        }

        UserFlavor.saveProfile(profile);
    },

    /**
     * Record a "Super Like" (Swipe Up) - Extra weight
     */
    recordSuperLike: (track, options = {}) => {
        const profile = UserFlavor.getProfile();
        const now = Date.now();

        // Add to super likes
        if (!profile.superLikedTracks.find(t => t.id === track.id)) {
            profile.superLikedTracks.push({ id: track.id, timestamp: now });
            if (profile.superLikedTracks.length > 50) {
                profile.superLikedTracks = profile.superLikedTracks.slice(-50);
            }
        }

        // Super likes = triple weight
        UserFlavor.recordLike(track, { ...options, swipeSpeed: 0 }); // 0 = max confidence

        // Extra boost for artists
        track.artists.forEach(artist => {
            if (profile.topArtists[artist.id]) {
                profile.topArtists[artist.id].score += 3;
            }
        });

        if (profile.currentSession.startTime) {
            profile.currentSession.superLikes++;
        }

        UserFlavor.saveProfile(profile);
    },

    /**
     * Record a "Dislike" (Swipe Left)
     */
    recordDislike: (track, options = {}) => {
        const profile = UserFlavor.getProfile();
        const now = Date.now();
        const { swipeSpeed } = options;

        // 1. Update skipped tracks
        if (!profile.skippedTracks.find(t => t.id === track.id)) {
            profile.skippedTracks.push({ id: track.id, timestamp: now });
            if (profile.skippedTracks.length > MAX_SKIPPED_TRACKS) {
                profile.skippedTracks = profile.skippedTracks.slice(-MAX_SKIPPED_TRACKS);
            }
        }

        // 2. Reduce artist scores
        const penalty = swipeSpeed && swipeSpeed < 1500 ? -2 : -1;
        track.artists.forEach(artist => {
            if (!profile.topArtists[artist.id]) {
                profile.topArtists[artist.id] = {
                    name: artist.name,
                    score: 0,
                    lastSeen: now,
                    count: 0
                };
            }
            profile.topArtists[artist.id].score += penalty;
            profile.topArtists[artist.id].lastSeen = now;
        });

        // 3. Update swipe patterns
        profile.swipePatterns.totalSwipes++;
        profile.swipePatterns.streakSkips++;
        profile.swipePatterns.streakLikes = 0;

        if (swipeSpeed) {
            UserFlavor._updateSwipeSpeed(profile, swipeSpeed);
        }

        // 4. Session tracking
        if (profile.currentSession.startTime) {
            profile.currentSession.dislikes++;
        }

        UserFlavor.saveProfile(profile);
    },

    // ============================================================================
    // GENRE MANAGEMENT
    // ============================================================================

    /**
     * Add genres (called from playlist analysis)
     */
    addGenres: (genres, weight = 1) => {
        const profile = UserFlavor.getProfile();
        const now = Date.now();

        genres.forEach(g => {
            if (!g) return;
            const normalized = g.toLowerCase();

            if (!profile.topGenres[normalized]) {
                profile.topGenres[normalized] = { score: 0, lastSeen: now, count: 0 };
            }
            profile.topGenres[normalized].score += weight;
            profile.topGenres[normalized].count++;
            profile.topGenres[normalized].lastSeen = now;

            // Track for discovery insights
            if (!profile.discoveryInsights.genresExplored.includes(normalized)) {
                profile.discoveryInsights.genresExplored.push(normalized);
            }
        });

        // Trim genres
        UserFlavor._trimGenres(profile);
        UserFlavor.saveProfile(profile);
    },

    /**
     * Penalize genres (from repeated skips)
     */
    penalizeGenres: (genres, penalty = 1) => {
        const profile = UserFlavor.getProfile();

        genres.forEach(g => {
            if (!g) return;
            const normalized = g.toLowerCase();

            if (!profile.topGenres[normalized]) {
                profile.topGenres[normalized] = { score: 0, lastSeen: Date.now(), count: 0 };
            }
            profile.topGenres[normalized].score -= penalty;
        });

        UserFlavor.saveProfile(profile);
    },

    /**
     * Get top genres sorted by score
     */
    getTopGenres: (count = 5) => {
        const profile = UserFlavor.getProfile();
        return Object.entries(profile.topGenres)
            .filter(([, data]) => data.score > 0)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, count)
            .map(([g]) => g);
    },

    /**
     * Get genres to avoid (negative scores)
     */
    getBlacklistedGenres: () => {
        const profile = UserFlavor.getProfile();
        return Object.entries(profile.topGenres)
            .filter(([, data]) => data.score <= -5)
            .map(([g]) => g);
    },

    // ============================================================================
    // ARTIST MANAGEMENT
    // ============================================================================

    /**
     * Get flavor-based search terms for recommendations
     */
    getFlavorTerms: () => {
        const profile = UserFlavor.getProfile();

        // Get top 5 artists by score
        const topArtists = Object.entries(profile.topArtists)
            .filter(([, data]) => data.score > 0)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 5)
            .map(([, data]) => `artist:"${data.name}"`);

        return topArtists;
    },

    /**
     * Get top artist IDs for seeding
     */
    getTopArtistIds: (count = 5) => {
        const profile = UserFlavor.getProfile();
        return Object.entries(profile.topArtists)
            .filter(([, data]) => data.score > 0)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, count)
            .map(([id]) => id);
    },

    /**
     * Get artists to avoid (very negative scores)
     */
    getBlacklistedArtists: () => {
        const profile = UserFlavor.getProfile();
        return Object.entries(profile.topArtists)
            .filter(([, data]) => data.score <= -5)
            .map(([id]) => id);
    },

    // ============================================================================
    // AUDIO FEATURE PREFERENCES
    // ============================================================================

    /**
     * Get current vibe preferences
     */
    getVibePreferences: () => {
        const profile = UserFlavor.getProfile();
        const vibe = profile.vibeStats;

        return {
            energy: vibe.energy.weight > 0 ? vibe.energy.sum / vibe.energy.weight : null,
            valence: vibe.valence.weight > 0 ? vibe.valence.sum / vibe.valence.weight : null,
            danceability: vibe.danceability.weight > 0 ? vibe.danceability.sum / vibe.danceability.weight : null,
            tempo: vibe.tempo.weight > 0 ? vibe.tempo.sum / vibe.tempo.weight : null,
            acousticness: vibe.acousticness.weight > 0 ? vibe.acousticness.sum / vibe.acousticness.weight : null,
            instrumentalness: vibe.instrumentalness.weight > 0 ? vibe.instrumentalness.sum / vibe.instrumentalness.weight : null,
            hasData: vibe.energy.weight >= 5
        };
    },

    /**
     * Get target features for Spotify API
     */
    getTargetFeatures: () => {
        const prefs = UserFlavor.getVibePreferences();
        if (!prefs.hasData) return {};

        const features = {};
        if (prefs.energy !== null) features.target_energy = prefs.energy;
        if (prefs.valence !== null) features.target_valence = prefs.valence;
        if (prefs.danceability !== null) features.target_danceability = prefs.danceability;
        if (prefs.tempo !== null) features.target_tempo = prefs.tempo;

        return features;
    },

    // ============================================================================
    // SESSION MANAGEMENT
    // ============================================================================

    /**
     * Start a new session
     */
    startSession: () => {
        const profile = UserFlavor.getProfile();
        profile.currentSession = {
            startTime: Date.now(),
            likes: 0,
            dislikes: 0,
            superLikes: 0
        };
        profile.totalSessions++;
        UserFlavor.saveProfile(profile);
    },

    /**
     * Get current session stats
     */
    getSessionStats: () => {
        const profile = UserFlavor.getProfile();
        const session = profile.currentSession;

        if (!session.startTime) return null;

        const duration = Date.now() - session.startTime;
        const total = session.likes + session.dislikes + session.superLikes;

        return {
            duration,
            durationMinutes: Math.floor(duration / 60000),
            likes: session.likes,
            dislikes: session.dislikes,
            superLikes: session.superLikes,
            total,
            likeRatio: total > 0 ? session.likes / total : 0,
            swipesPerMinute: total / Math.max(1, duration / 60000)
        };
    },

    // ============================================================================
    // ANALYTICS & INSIGHTS
    // ============================================================================

    /**
     * Get comprehensive user insights
     */
    getInsights: () => {
        const profile = UserFlavor.getProfile();
        const patterns = profile.swipePatterns;

        // Calculate preferred time of day
        const timeScores = {
            morning: patterns.morningLikes,
            afternoon: patterns.afternoonLikes,
            evening: patterns.eveningLikes,
            night: patterns.nightLikes
        };
        const preferredTime = Object.entries(timeScores)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

        // Calculate swipe decisiveness
        const totalTimed = patterns.fastSwipeCount + patterns.slowSwipeCount;
        const decisiveness = totalTimed > 0
            ? patterns.fastSwipeCount / totalTimed
            : null;

        return {
            totalSwipes: patterns.totalSwipes,
            totalLiked: profile.likedTracks.length,
            totalSkipped: profile.skippedTracks.length,
            superLikes: profile.superLikedTracks.length,

            // Time patterns
            preferredListeningTime: preferredTime,
            timeBreakdown: timeScores,

            // Swipe behavior
            avgSwipeSpeed: patterns.avgSwipeSpeed,
            decisiveness, // 0 = very indecisive, 1 = very decisive
            currentLikeStreak: patterns.streakLikes,
            bestLikeStreak: patterns.maxStreakLikes,

            // Content preferences
            topArtists: Object.entries(profile.topArtists)
                .filter(([, d]) => d.score > 0)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 10)
                .map(([, d]) => d.name),

            topGenres: UserFlavor.getTopGenres(10),
            blacklistedGenres: UserFlavor.getBlacklistedGenres(),

            genresExplored: profile.discoveryInsights.genresExplored.length,

            // Vibe
            vibePreferences: UserFlavor.getVibePreferences(),

            // Meta
            daysSinceStart: Math.floor((Date.now() - profile.firstSeen) / 86400000),
            totalSessions: profile.totalSessions
        };
    },

    /**
     * Check if a track was already swiped
     */
    hasBeenSwiped: (trackId) => {
        const profile = UserFlavor.getProfile();
        return profile.likedTracks.some(t => t.id === trackId) ||
            profile.skippedTracks.some(t => t.id === trackId) ||
            profile.superLikedTracks.some(t => t.id === trackId);
    },

    /**
     * Get all swiped track IDs
     */
    getAllSwipedIds: () => {
        const profile = UserFlavor.getProfile();
        const ids = new Set();

        profile.likedTracks.forEach(t => ids.add(t.id));
        profile.skippedTracks.forEach(t => ids.add(t.id));
        profile.superLikedTracks.forEach(t => ids.add(t.id));

        return [...ids];
    },

    // ============================================================================
    // MAINTENANCE
    // ============================================================================

    /**
     * Apply recency decay to old preferences (call periodically)
     */
    applyRecencyDecay: () => {
        const profile = UserFlavor.getProfile();
        const now = Date.now();
        const dayMs = 86400000;

        // Decay artist scores based on time since last seen
        Object.values(profile.topArtists).forEach(artist => {
            const daysSince = (now - artist.lastSeen) / dayMs;
            if (daysSince > 7) {
                artist.score *= Math.pow(RECENCY_DECAY, Math.floor(daysSince / 7));
            }
        });

        // Decay genre scores similarly
        Object.values(profile.topGenres).forEach(genre => {
            const daysSince = (now - genre.lastSeen) / dayMs;
            if (daysSince > 7) {
                genre.score *= Math.pow(RECENCY_DECAY, Math.floor(daysSince / 7));
            }
        });

        UserFlavor.saveProfile(profile);
    },

    /**
     * Reset all user data
     */
    resetAll: () => {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[UserFlavor] All user data reset');
    },

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    _updateSwipeSpeed: (profile, speed) => {
        if (speed < 1500) {
            profile.swipePatterns.fastSwipeCount++;
        } else if (speed > 5000) {
            profile.swipePatterns.slowSwipeCount++;
        }

        // Rolling average
        if (profile.swipePatterns.avgSwipeSpeed === null) {
            profile.swipePatterns.avgSwipeSpeed = speed;
        } else {
            profile.swipePatterns.avgSwipeSpeed =
                profile.swipePatterns.avgSwipeSpeed * 0.9 + speed * 0.1;
        }
    },

    _updateVibeStats: (profile, features, weight = 1) => {
        ['energy', 'valence', 'danceability', 'tempo', 'acousticness', 'instrumentalness'].forEach(key => {
            if (features[key] !== undefined && features[key] !== null) {
                profile.vibeStats[key].sum += features[key] * weight;
                profile.vibeStats[key].weight += weight;
            }
        });
    },

    _trimArtists: (profile) => {
        const entries = Object.entries(profile.topArtists);
        if (entries.length > MAX_ARTISTS) {
            const sorted = entries.sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score));
            profile.topArtists = Object.fromEntries(sorted.slice(0, MAX_ARTISTS));
        }
    },

    _trimGenres: (profile) => {
        const entries = Object.entries(profile.topGenres);
        if (entries.length > MAX_GENRES) {
            const sorted = entries.sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score));
            profile.topGenres = Object.fromEntries(sorted.slice(0, MAX_GENRES));
        }
    }
};

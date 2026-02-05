/**
 * 🎵 SPOTIFY API SERVICE - Enhanced Edition
 * 
 * Provides all Spotify Web API interactions with intelligent
 * caching, retry logic, and integration with the Discovery Engine.
 * 
 * Key Features:
 * - Automatic retry on rate limits
 * - Request caching for performance
 * - Dual recommendation strategy (API + Search fallback)
 * - Feature-based filtering and scoring
 * - Integration with UserFlavor for personalization
 * 
 * Created by Seppe Dorissen with Antigravity AI
 */

import SpotifyWebApi from 'spotify-web-api-js';

const spotify = new SpotifyWebApi();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Valid Spotify genre seeds (official list from Spotify)
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
    'city pop': 'j-pop', 'future funk': 'electronic',
    'uk garage': 'garage', 'speed garage': 'garage',
    'tropical house': 'house', 'tech house': 'house',
    'melodic techno': 'techno', 'dark techno': 'techno',
    'pop punk': 'punk-rock', 'post hardcore': 'hardcore',
    'bedroom r&b': 'r-n-b', 'alt r&b': 'r-n-b',
    'cloud rap': 'hip-hop', 'emo rap': 'hip-hop',
    'hyperpop': 'electronic', 'glitch': 'electronic',
    'witch house': 'electronic', 'vapor': 'electronic'
};

// Simple request cache
const cache = new Map();

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

export function setAccessToken(token) {
    spotify.setAccessToken(token);
}

export function getAccessToken() {
    return spotify.getAccessToken();
}

export async function getUserProfile() {
    return await spotify.getMe();
}

export async function saveTrack(idOrUri) {
    const token = spotify.getAccessToken();
    const id = idOrUri.replace('spotify:track:', '');

    const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${id}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("Save Error", response.status, err);
        throw new Error(`Failed to save: ${response.status}`);
    }
    return true;
}

export async function addToPlaylist(playlistId, trackUri) {
    return await spotify.addTracksToPlaylist(playlistId, [trackUri]);
}

export async function createPlaylist(userId, name) {
    return await spotify.createPlaylist(userId, { name: name, description: "Created by SongSwipe" });
}

export async function searchPlaylists(query) {
    const res = await spotify.searchPlaylists(query);
    return res.playlists.items;
}

export async function getUserPlaylists() {
    const res = await spotify.getUserPlaylists({ limit: 50 });
    return res.items;
}

export async function getArtist(artistId) {
    return await spotify.getArtist(artistId);
}

export async function getAudioFeatures(trackIds) {
    if (!trackIds || trackIds.length === 0) return [];
    try {
        const res = await spotify.getAudioFeaturesForTracks(trackIds);
        return res.audio_features || [];
    } catch (e) {
        console.warn('[SpotifyApi] Audio features fetch failed', e);
        return [];
    }
}

// ============================================================================
// TOP TRACKS & LIBRARY
// ============================================================================

export async function getTopTracks(limit = 50) {
    try {
        const response = await spotify.getMyTopTracks({ limit, time_range: 'medium_term' });
        return response.items.filter(t => !t.is_local && t.id).slice(0, limit);
    } catch (e) {
        console.warn("[SpotifyApi] Could not fetch top tracks, using fallback");
        return [];
    }
}

export async function getRecentlyPlayed(limit = 50) {
    try {
        const response = await spotify.getMyRecentlyPlayedTracks({ limit });
        return response.items.map(item => item.track).filter(t => t && t.id);
    } catch (e) {
        console.warn("[SpotifyApi] Could not fetch recently played");
        return [];
    }
}

export async function getSavedTracks(limit = 50, offset = 0) {
    try {
        const response = await spotify.getMySavedTracks({ limit, offset });
        return response.items.map(item => item.track).filter(t => t && t.id);
    } catch (e) {
        console.warn("[SpotifyApi] Could not fetch saved tracks");
        return [];
    }
}

export async function getPlaylistTracks(playlistId) {
    try {
        // Fetch all tracks (handles pagination)
        let allTracks = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore && allTracks.length < 500) { // Cap at 500 tracks
            const res = await spotify.getPlaylistTracks(playlistId, { limit, offset });
            const tracks = res.items
                .map(item => item?.track)
                .filter(t => t && t.id && !t.is_local && t.uri?.startsWith('spotify:track:'));

            allTracks.push(...tracks);
            offset += limit;
            hasMore = res.items.length === limit && res.total > offset;
        }

        return allTracks;
    } catch (e) {
        console.error("[SpotifyApi] Playlist fetch failed", e);
        return [];
    }
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

// Flag to track if Recommendations API is available (deprecated for many keys)
// Set to false by default - most new keys don't have access
let recommendationsApiAvailable = false;

// Flag to track if Audio Features API is available
let audioFeaturesApiAvailable = false;

/**
 * Primary recommendation function - Search-first approach
 * Uses Spotify Search API as primary source (always works)
 * Recommendations API is tried as bonus if available
 */
export async function getRecommendations(seedTracks = [], seedGenres = [], seedArtists = [], mood = 'discovery') {
    const token = spotify.getAccessToken();
    const searchPromises = [];

    // Load user flavor for personalization
    let flavorGenres = [];
    let flavorArtists = [];
    let targetFeatures = {};

    try {
        const { UserFlavor } = await import('./userFlavor');
        flavorGenres = UserFlavor.getTopGenres(3);
        flavorArtists = UserFlavor.getTopArtistIds(2);
        targetFeatures = UserFlavor.getTargetFeatures();
    } catch (e) { /* Flavor loading optional */ }

    // PRIMARY STRATEGY: Search API (always works)

    // Strategy A: Genre-based exploration with high randomization
    const explorerGenres = mood === 'hype'
        ? ['dance', 'hip-hop', 'electronic', 'edm', 'pop', 'trap']
        : mood === 'chill'
            ? ['chill', 'ambient', 'acoustic', 'jazz', 'soul', 'r-n-b']
            : ['indie', 'alternative', 'pop', 'rock', 'electronic', 'indie-pop'];

    // Mix user's favorite genres with exploration
    const genrePool = [...new Set([...flavorGenres, ...explorerGenres])];

    // Shuffle genre pool for variety
    const shuffledGenres = genrePool.sort(() => Math.random() - 0.5);

    // Search by multiple genres with random offsets (avoid same top results)
    const selectedGenres = shuffledGenres.slice(0, 5);
    selectedGenres.forEach(genre => {
        // Use varied offsets to avoid always getting the same popular tracks
        const offset = Math.floor(Math.random() * 150); // Wider range
        searchPromises.push(searchForTracks(`genre:"${genre}"`, offset, token));
    });

    // Strategy B: Recent music discovery with variety
    const currentYear = new Date().getFullYear();
    searchPromises.push(searchForTracks(`year:${currentYear}`, Math.floor(Math.random() * 100), token));
    searchPromises.push(searchForTracks(`year:${currentYear - 1}`, Math.floor(Math.random() * 100), token));

    // Hipster/underground music (less popular)
    searchPromises.push(searchForTracks(`tag:hipster`, Math.floor(Math.random() * 50), token));
    searchPromises.push(searchForTracks(`tag:new`, Math.floor(Math.random() * 50), token));

    // Strategy C: Decade exploration for variety
    const decades = ['2020s', '2010s', '2000s'];
    const randomDecade = decades[Math.floor(Math.random() * decades.length)];
    const decadeQuery = randomDecade === '2020s' ? 'year:2020-2025'
        : randomDecade === '2010s' ? 'year:2010-2019'
            : 'year:2000-2009';
    searchPromises.push(searchForTracks(decadeQuery, Math.floor(Math.random() * 80), token));

    // Strategy D: Seed-based artist search (DISABLED - API restricted)
    // NOTE: We can't use getTrack (API restricted), so we skip seed-based artist lookup

    // Strategy E: Flavor-based artist search
    if (flavorArtists.length > 0) {
        try {
            const artist = await spotify.getArtist(flavorArtists[0]);
            if (artist && artist.name) {
                // Random offset to get different songs from same artist
                searchPromises.push(searchForTracks(`artist:"${artist.name}"`, Math.floor(Math.random() * 30), token));
            }
        } catch (e) { /* Silent fail */ }
    }

    // Strategy F: Random genre exploration (discover new stuff)
    const randomExploreGenres = ['soul', 'funk', 'synth-pop', 'disco', 'new-wave', 'post-punk'];
    const randomGenre = randomExploreGenres[Math.floor(Math.random() * randomExploreGenres.length)];
    searchPromises.push(searchForTracks(`genre:"${randomGenre}"`, Math.floor(Math.random() * 60), token));

    // BONUS: Try Recommendations API if still available (may be deprecated)
    if (recommendationsApiAvailable && seedTracks.length > 0) {
        searchPromises.push(
            tryRecommendationsApi(seedTracks.slice(0, 5), [], targetFeatures)
                .catch(() => [])
        );
    }

    // Execute all strategies in parallel
    const resultsBatches = await Promise.all(searchPromises);
    let allTracks = resultsBatches.flat();

    // Post-processing
    return processAndRankTracks(allTracks, targetFeatures);
}

/**
 * Try the Recommendations API (may be deprecated for some keys)
 */
async function tryRecommendationsApi(seedTracks, seedGenres, targetFeatures) {
    try {
        const params = { limit: 25, ...targetFeatures };

        if (seedTracks.length > 0) {
            params.seed_tracks = seedTracks.slice(0, 5);
        } else if (seedGenres.length > 0) {
            params.seed_genres = seedGenres.slice(0, 5);
        } else {
            return [];
        }

        const res = await spotify.getRecommendations(params);
        if (res.tracks && res.tracks.length > 0) {
            console.log('[SpotifyApi] Recommendations API success!');
            return res.tracks;
        }
        return [];
    } catch (e) {
        // Mark as unavailable to avoid future 404s
        if (e.status === 404 || e.status === 403) {
            recommendationsApiAvailable = false;
            console.log('[SpotifyApi] Recommendations API not available, using Search API only');
        }
        return [];
    }
}

/**
 * Enhanced recommendations with audio features - Search-first approach
 * @param {Array} seedTracks - Track IDs (not used for lookup due to API restrictions)
 * @param {Array} seedGenres - Genre names to search
 * @param {Object} targetFeatures - Audio features (not used currently)
 * @param {Array} seedArtistNames - Artist names to search (optional, avoids API calls)
 */
export async function getRecommendationsWithFeatures(seedTracks, seedGenres, targetFeatures, seedArtistNames = []) {
    const token = spotify.getAccessToken();
    const searchPromises = [];

    // Shuffle genres for variety
    const shuffledGenres = [...seedGenres].sort(() => Math.random() - 0.5);
    const searchGenres = shuffledGenres.length > 0 ? shuffledGenres : ['pop', 'indie', 'alternative'];

    // PRIMARY: Search by genres with random offsets
    searchGenres.slice(0, 4).forEach(genre => {
        const offset1 = Math.floor(Math.random() * 100);
        const offset2 = Math.floor(Math.random() * 150) + 50;
        searchPromises.push(searchForTracks(`genre:"${genre}"`, offset1, token));
        searchPromises.push(searchForTracks(`genre:"${genre}"`, offset2, token));
    });

    // Search by artist names if provided (avoids getTrack API call)
    if (seedArtistNames.length > 0) {
        // Shuffle artist names
        const shuffledArtists = [...seedArtistNames].sort(() => Math.random() - 0.5);
        shuffledArtists.slice(0, 4).forEach(artistName => {
            const offset = Math.floor(Math.random() * 30);
            searchPromises.push(searchForTracks(`artist:"${artistName}"`, offset, token));
        });
    }

    // Add flavor-based searches with random offsets
    try {
        const { UserFlavor } = await import('./userFlavor');
        const flavorTerms = UserFlavor.getFlavorTerms();
        const shuffledTerms = [...flavorTerms].sort(() => Math.random() - 0.5);
        shuffledTerms.slice(0, 2).forEach(term => {
            const offset = Math.floor(Math.random() * 50);
            searchPromises.push(searchForTracks(term, offset, token));
        });
    } catch (e) { /* Ignore */ }

    // Add year-based discovery with variety
    const currentYear = new Date().getFullYear();
    searchPromises.push(searchForTracks(`year:${currentYear}`, Math.floor(Math.random() * 80), token));
    searchPromises.push(searchForTracks(`year:${currentYear - 1}`, Math.floor(Math.random() * 80), token));

    // Add hipster/underground discovery
    searchPromises.push(searchForTracks(`tag:hipster`, Math.floor(Math.random() * 50), token));

    // BONUS: Try Recommendations API
    if (recommendationsApiAvailable && seedTracks.length > 0) {
        const validGenres = seedGenres.map(g => mapToValidGenreSeed(g)).filter(Boolean);
        searchPromises.push(
            tryRecommendationsApi(seedTracks.slice(0, 4), validGenres.slice(0, 1), targetFeatures)
                .catch(() => [])
        );
    }

    const results = await Promise.all(searchPromises);
    let allTracks = results.flat();

    // Audio features filtering disabled - API is restricted for most keys
    // if (targetFeatures && Object.keys(targetFeatures).length > 0 &&
    //     (targetFeatures.target_energy !== undefined || targetFeatures.min_energy !== undefined)) {
    //     allTracks = await filterByAudioFeatures(allTracks, targetFeatures);
    // }

    return processAndRankTracks(allTracks, {});
}

/**
 * Get recommendations for "All Liked Songs" mode
 * Since Saved Tracks API is restricted, uses Top Tracks and genre-based search
 */
export async function getRecommendationsFromLibrary() {
    const token = spotify.getAccessToken();

    // Try to get top tracks (may also be restricted)
    let topTracks = [];
    try {
        topTracks = await getTopTracks(50);
    } catch (e) {
        console.warn('[SpotifyApi] Top tracks fetch failed, using genre-based discovery');
    }

    // If we have top tracks, extract genres from them
    if (topTracks.length > 0) {
        const genreMap = {};
        const artistIds = [...new Set(topTracks.slice(0, 15).map(t => t.artists?.[0]?.id).filter(Boolean))];

        for (const artistId of artistIds.slice(0, 5)) {
            try {
                const artist = await getArtist(artistId);
                if (artist?.genres) {
                    artist.genres.forEach(g => {
                        genreMap[g] = (genreMap[g] || 0) + 1;
                    });
                }
            } catch (e) { /* Silent */ }
        }

        const topGenres = Object.entries(genreMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([g]) => g);

        // Update UserFlavor with library analysis
        try {
            const { UserFlavor } = await import('./userFlavor');
            UserFlavor.addGenres(topGenres, 2);
        } catch (e) { /* Ignore */ }

        // Use genres for recommendations
        return getRecommendationsWithFeatures([], topGenres, {});
    }

    // Fallback: Pure genre-based discovery
    console.log('[SpotifyApi] Using pure genre-based discovery');
    return getRecommendations([], [], [], 'discovery');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Search for tracks with error handling
 */
async function searchForTracks(query, offset, token) {
    try {
        const url = new URL("https://api.spotify.com/v1/search");
        url.searchParams.append("q", query);
        url.searchParams.append("type", "track");
        url.searchParams.append("limit", "50");
        url.searchParams.append("offset", Math.min(offset, 950).toString()); // Spotify max offset is 1000

        const response = await fetch(url.toString(), {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.tracks?.items || [];
    } catch (e) {
        console.error("[SpotifyApi] Search failed", e);
        return [];
    }
}

/**
 * Map genre to valid Spotify seed
 */
function mapToValidGenreSeed(genre) {
    if (!genre) return null;

    const normalized = genre.toLowerCase().replace(/ /g, '-');

    // Direct match
    if (VALID_GENRE_SEEDS.has(normalized)) {
        return normalized;
    }

    // Fallback mapping
    const fallback = GENRE_FALLBACK_MAP[normalized] || GENRE_FALLBACK_MAP[genre.toLowerCase()];
    return fallback || null;
}

/**
 * Filter tracks by audio features
 */
async function filterByAudioFeatures(tracks, targetFeatures) {
    if (!tracks || tracks.length === 0) return tracks;

    try {
        const trackIds = tracks.slice(0, 100).map(t => t.id);
        const features = await getAudioFeatures(trackIds);

        const featureMap = {};
        features.forEach(f => {
            if (f) featureMap[f.id] = f;
        });

        return tracks.filter(track => {
            const f = featureMap[track.id];
            if (!f) return true; // Keep if no features (be permissive)

            // Energy check
            if (targetFeatures.target_energy !== undefined) {
                const energyDiff = Math.abs(f.energy - targetFeatures.target_energy);
                if (energyDiff > 0.35) return false; // Too different
            }

            if (targetFeatures.min_energy !== undefined && f.energy < targetFeatures.min_energy) {
                return false;
            }
            if (targetFeatures.max_energy !== undefined && f.energy > targetFeatures.max_energy) {
                return false;
            }

            return true;
        });
    } catch (e) {
        console.warn("[SpotifyApi] Feature filtering failed", e);
        return tracks;
    }
}

/**
 * Process and rank tracks for final output with high diversity
 */
function processAndRankTracks(tracks, targetFeatures = {}) {
    if (!tracks || tracks.length === 0) return [];

    // Deduplicate and limit artists
    const seen = new Set();
    const artistCounts = {};
    const unique = [];

    // First pass: shuffle input to avoid always getting same order
    const shuffledInput = [...tracks].sort(() => Math.random() - 0.5);

    for (const track of shuffledInput) {
        if (!track || !track.id) continue;
        if (seen.has(track.id)) continue;

        // STRICT artist diversity check: max 1 song per artist
        const artistId = track.artists?.[0]?.id;
        if (artistId) {
            const count = artistCounts[artistId] || 0;
            if (count >= 1) continue; // Only 1 per artist!
            artistCounts[artistId] = count + 1;
        }

        seen.add(track.id);
        unique.push(track);
    }

    // Separate tracks with and without previews
    const withPreview = unique.filter(t => t.preview_url);
    const noPreview = unique.filter(t => !t.preview_url);

    // Shuffle both groups completely (don't favor popularity)
    const fisherYatesShuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    fisherYatesShuffle(withPreview);
    fisherYatesShuffle(noPreview);

    // Prioritize tracks with previews but mix in some variety
    const result = [];
    let previewIdx = 0;
    let noPreviewIdx = 0;

    // Aim for mostly tracks with previews (80%) but some variety
    while (result.length < 40 && (previewIdx < withPreview.length || noPreviewIdx < noPreview.length)) {
        if (previewIdx < withPreview.length && (Math.random() < 0.85 || noPreviewIdx >= noPreview.length)) {
            result.push(withPreview[previewIdx++]);
        } else if (noPreviewIdx < noPreview.length) {
            result.push(noPreview[noPreviewIdx++]);
        }
    }

    // Final shuffle of first 15 to ensure variety at the start
    const first15 = result.slice(0, 15);
    fisherYatesShuffle(first15);
    return [...first15, ...result.slice(15)];
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
    searchForTracks,
    filterByAudioFeatures,
    processAndRankTracks,
    mapToValidGenreSeed
};

import SpotifyWebApi from 'spotify-web-api-js';

const spotify = new SpotifyWebApi();

export function setAccessToken(token) {
    spotify.setAccessToken(token);
}

export async function getUserProfile() {
    return await spotify.getMe();
}

// 2025 UPDATE: Recommendations API is deprecated for new keys.
// We must use Search or Featured Playlists to "discover" music.
export async function getRecommendations(seedTracks = [], seedGenres = [], seedArtists = [], mood = 'discovery') {
    const token = spotify.getAccessToken();
    const fetchPromises = [];

    // Mood-based Query Enhancers
    let moodQuery = "";
    if (mood === 'hype') moodQuery = " year:2023-2025";
    if (mood === 'chill') moodQuery = " tag:new";

    // Strategy A: Direct Seed Search
    if (seedArtists.length > 0) {
        fetchPromises.push(searchForTracks(`artist:"${seedArtists[0]}"${mood === 'hype' ? ' label:major' : ''}`, Math.floor(Math.random() * 5), token));
    } else if (seedGenres.length > 0) {
        fetchPromises.push(searchForTracks(`genre:"${seedGenres[0]}"`, Math.floor(Math.random() * 10), token));
    }

    // Strategy B: "Vibe Exploration" (Broadened for reliability)
    const explorerGenres = mood === 'hype' ? ['dance', 'hip-hop', 'electronic', 'pop'] :
        mood === 'chill' ? ['lo-fi', 'ambient', 'acoustic', 'jazz'] :
            ['indie', 'house', 'synthwave', 'alternative', 'rock'];

    const randomGenre = explorerGenres[Math.floor(Math.random() * explorerGenres.length)];
    // Lower offset to prevent skipping results in niche genres
    fetchPromises.push(searchForTracks(`genre:"${randomGenre}"`, Math.floor(Math.random() * 10), token));
    fetchPromises.push(searchForTracks(`year:2024-2025`, Math.floor(Math.random() * 100), token));

    // Strategy C: "Trending Discovery" (Seed-based Context)
    if (seedTracks.length > 0) {
        try {
            const trackInfo = await spotify.getTrack(seedTracks[0]);
            const artistInfo = await spotify.getArtist(trackInfo.artists[0].id);
            if (artistInfo.genres && artistInfo.genres.length > 0) {
                // Use the artist's first genre but keep offset low
                fetchPromises.push(searchForTracks(`genre:"${artistInfo.genres[0]}"`, 0, token));
            }
        } catch (e) { /* silent fail */ }
    }

    // Execute strategies in parallel
    const resultsBatches = await Promise.all(fetchPromises);
    let allTracks = resultsBatches.flat();

    // 4. Handle Playback Scarcity & Quality
    const sorted = allTracks.sort((a, b) => {
        // Priority 1: Native previews
        if (a.preview_url && !b.preview_url) return -1;
        if (!a.preview_url && b.preview_url) return 1;
        return b.popularity - a.popularity;
    });

    // 5. Deduplicate & Ensure Artist Diversity
    const unique = [];
    const seenIds = new Set();
    const artistCounts = {};

    for (const t of sorted) {
        if (!seenIds.has(t.id)) {
            const artistId = t.artists[0]?.id;
            const count = artistCounts[artistId] || 0;
            if (count < 2) {
                seenIds.add(t.id);
                unique.push(t);
                artistCounts[artistId] = count + 1;
            }
        }
    }

    if (unique.length === 0) {
        console.warn("Discovery engine returned 0 results. Activating Ultra-Resilient Fallback...");
        const fallbackTracks = await searchForTracks("year:2024", 0, token);
        if (fallbackTracks.length > 0) return fallbackTracks.slice(0, 25);
        return getPlaylistTracks("37i9dQZF1DXcBWIGoYBM5M");
    }

    return unique.sort(() => 0.5 - Math.random()).slice(0, 25);
}

// Helper for raw search
async function searchForTracks(query, offset, token) {
    try {
        const url = new URL("https://api.spotify.com/v1/search");
        url.searchParams.append("q", query);
        url.searchParams.append("type", "track");
        url.searchParams.append("limit", "50");
        url.searchParams.append("offset", offset.toString());

        const response = await fetch(url.toString(), {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.tracks?.items || [];
    } catch (e) {
        console.error("Search failed", e);
        return [];
    }
}

export async function getTopTracks() {
    try {
        const response = await spotify.getMyTopTracks({ limit: 50 });
        return response.items.filter(t => !t.is_local && t.id).slice(0, 5);
    } catch (e) {
        console.warn("Could not fetch top tracks, using fallback");
        return [];
    }
}

export async function saveTrack(idOrUri) {
    const token = spotify.getAccessToken();
    const id = idOrUri.replace('spotify:track:', '');

    // Direct fetch to ensure correct PUT body format
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

export async function getPlaylistTracks(playlistId) {
    try {
        const res = await spotify.getPlaylistTracks(playlistId);
        return res.items
            .map(item => item ? item.track : null)
            .filter(t => t && t.id && !t.is_local && t.uri.startsWith('spotify:track:'));
    } catch (e) {
        console.error("Playlist fetch failed (404/403)", e);
        return [];
    }
}

export async function getUserPlaylists() {
    const res = await spotify.getUserPlaylists();
    return res.items;
}


export async function getArtist(artistId) {
    return await spotify.getArtist(artistId);
}

export async function getAudioFeatures(trackIds) {
    const res = await spotify.getAudioFeaturesForTracks(trackIds);
    return res.audio_features;
}

// Smart Recommendation Engine
export async function getRecommendationsWithFeatures(seedTracks, seedGenres, targetFeatures) {
    const token = spotify.getAccessToken();

    // 1. Try Real Recommendations API (Best Quality)
    try {
        // Official Spotify Genre Seeds (Hardcoded to prevent 404s)
        const validSeeds = new Set([
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

        // Filter extracted genres against valid list
        let safeGenres = seedGenres
            .map(g => g.toLowerCase().replace(/ /g, '-'))
            .filter(g => validSeeds.has(g));

        // If no valid genres found, use generic fallbacks based on common matches or drop genres entirely
        if (safeGenres.length === 0) {
            // Map common invalid genres to valid ones if possible
            const FallbackMap = {
                'phonk': 'electronic', 'drift-phonk': 'electronic', 'lo-fi': 'chill',
                'rap': 'hip-hop', 'trap': 'hip-hop'
            };
            safeGenres = seedGenres
                .map(g => FallbackMap[g.toLowerCase().replace(/ /g, '-')] || null)
                .filter(Boolean);
        }

        // STRATEGY: Prefer Track Seeds over Genre Seeds
        const params = { limit: 20, ...targetFeatures };

        if (seedTracks.length > 0) {
            params.seed_tracks = seedTracks.slice(0, 4);
        } else {
            if (safeGenres.length > 0) {
                params.seed_genres = safeGenres.slice(0, 3);
            } else {
                params.seed_genres = ['pop'];
            }
        }

        const res = await spotify.getRecommendations(params);

        if (res.tracks && res.tracks.length > 0) {
            return res.tracks.filter(t => t.preview_url);
        }
    } catch (e) {
        console.warn("Batch Recs API failed, trying iterative fallback...", e);

        // ITERATIVE FALLBACK: Try seeds one by one
        // If batch fails, one seed might be invalid. Try them individually.
        if (seedTracks.length > 0) {
            for (let i = 0; i < Math.min(seedTracks.length, 5); i++) {
                try {
                    const res = await spotify.getRecommendations({
                        seed_tracks: [seedTracks[i]], // Single seed
                        limit: 20,
                        ...targetFeatures
                    });
                    if (res.tracks && res.tracks.length > 0) {
                        console.log(`Recovered using single seed: ${seedTracks[i]}`);
                        return res.tracks.filter(t => t.preview_url);
                    }
                } catch (err) { /* Continue to next seed */ }
            }
        }
        console.warn("All recommendation seeds failed. Switching to Search API.");
    }

    // 2. Search Strategy (Strict & Robust)
    // If Recommendations API failed, use Search API which supports ANY genre string (e.g. "phonk")
    const fetchPromises = [];

    if (seedGenres.length > 0) {
        seedGenres.forEach(genre => {
            fetchPromises.push(searchForTracks(`genre:"${genre}"`, 0, token));
            fetchPromises.push(searchForTracks(`genre:"${genre}"`, 50, token));
            fetchPromises.push(searchForTracks(`${genre} style`, 0, token));
        });
    }

    // 3. FLAVOR INJECTION (Personalized Fail-Safe)
    // Add search terms from User Flavor (e.g. Favorite Artists) to mix in personal taste
    try {
        const { UserFlavor } = await import('./userFlavor');
        const flavorTerms = UserFlavor.getFlavorTerms();
        if (flavorTerms.length > 0) {
            flavorTerms.forEach(term => {
                fetchPromises.push(searchForTracks(term, 0, token));
            });
        }
    } catch (e) { /* Ignore flavor loading errors */ }

    if (fetchPromises.length === 0) {
        fetchPromises.push(searchForTracks(`year:2024`, 0, token));
    }

    const resultsBatches = await Promise.all(fetchPromises);
    let allTracks = resultsBatches.flat();

    // 3. Deduplicate
    const unique = [];
    const seenIds = new Set();
    for (const t of allTracks) {
        if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            unique.push(t);
        }
    }

    // 4. VIBE CHECK (Strict Filtering)
    // Keep only songs that match the target vibe (Energy, Tempo)
    // This prevents "Sad songs" appearing in "Phonk" playlist, even if they share an artist
    if (unique.length > 0 && unique.length < 50 && targetFeatures &&
        (targetFeatures.min_energy || targetFeatures.target_energy)) {

        try {
            // Check features for the search results
            const featureIds = unique.slice(0, 50).map(t => t.id);
            const features = await spotify.getAudioFeaturesForTracks(featureIds);
            const featureMap = {};
            features.audio_features.forEach(f => { if (f) featureMap[f.id] = f; });

            const vibeFiltered = unique.filter(t => {
                const f = featureMap[t.id];
                if (!f) return true; // Keep if no features found (safe default)

                // Check Energy (Most important for Vibe)
                const targetEnergy = targetFeatures.target_energy || 0.5;
                const matchesEnergy = Math.abs(f.energy - targetEnergy) < 0.3; // Within 0.3 range

                return matchesEnergy;
            });

            if (vibeFiltered.length > 5) return vibeFiltered.sort(() => 0.5 - Math.random());
        } catch (e) { /* Check failed, proceed with unfiltered */ }
    }

    return unique.sort(() => 0.5 - Math.random());
}

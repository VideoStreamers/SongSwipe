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
        return res.items.map(item => item ? item.track : null).filter(Boolean);
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

// Smart Recommendation Engine: Tries real API -> Falls back to strict Genre Search
export async function getRecommendationsWithFeatures(seedTracks, seedGenres, targetFeatures) {
    const token = spotify.getAccessToken();

    // 1. Try Real Recommendations API (Best Quality)
    // LIMIT: Max 5 seeds total. Using 2 tracks + 2 genres = 4 seeds (safe)
    try {
        const res = await spotify.getRecommendations({
            seed_tracks: seedTracks.slice(0, 2),
            seed_genres: seedGenres.slice(0, 2).map(g => g.toLowerCase().replace(/ /g, '-')),
            limit: 20,
            ...targetFeatures
        });

        if (res.tracks && res.tracks.length > 0) {
            return res.tracks.filter(t => t.preview_url); // Prefer tracks with previews
        }
    } catch (e) {
        // Fallback if API is restricted/quota exceeded
        console.warn("Standard Recs API failed, switching to Search Strategy...", e);
    }

    // 2. Search Strategy (Strict)
    // ONLY search for the explicit genres from the playlist, no random "discovery" genres
    const fetchPromises = [];

    // Search for the specific genres from the playlist
    if (seedGenres.length > 0) {
        seedGenres.forEach(genre => {
            fetchPromises.push(searchForTracks(`genre:"${genre}"`, 0, token)); // Strict match
            fetchPromises.push(searchForTracks(`genre:"${genre}"`, 50, token)); // Diversity
            // Try combined genre + year for freshness
            fetchPromises.push(searchForTracks(`genre:"${genre}" year:2023-2025`, 0, token));
        });
    } else {
        // Absolute fallback if no genres found
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

    return unique.sort(() => 0.5 - Math.random());
}

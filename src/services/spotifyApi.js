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
        fetchPromises.push(searchForTracks(`artist:"${seedArtists[0]}"${mood === 'hype' ? ' label:major' : ''}`, Math.floor(Math.random() * 20), token));
    } else if (seedGenres.length > 0) {
        fetchPromises.push(searchForTracks(`genre:"${seedGenres[0]}"${moodQuery}`, Math.floor(Math.random() * 50), token));
    }

    // Strategy B: "Vibe Exploration"
    const explorerGenres = mood === 'hype' ? ['dance', 'hip-hop', 'electronic'] :
        mood === 'chill' ? ['lo-fi', 'ambient', 'acoustic'] :
            ['indie', 'indie-pop', 'house', 'synthwave'];
    const randomGenre = explorerGenres[Math.floor(Math.random() * explorerGenres.length)];
    const randomYear = mood === 'hype' ? 2024 : 2010 + Math.floor(Math.random() * 14);
    fetchPromises.push(searchForTracks(`genre:"${randomGenre}" year:${randomYear}`, Math.floor(Math.random() * 50), token));

    // Strategy C: "Trending Discovery" (Seed-based Context)
    if (seedTracks.length > 0) {
        try {
            // Get more details about the first seed track to find better matching genres
            const trackInfo = await spotify.getTrack(seedTracks[0]);
            const artistInfo = await spotify.getArtist(trackInfo.artists[0].id);
            if (artistInfo.genres && artistInfo.genres.length > 0) {
                fetchPromises.push(searchForTracks(`genre:"${artistInfo.genres[0]}"`, Math.floor(Math.random() * 20), token));
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
        // Priority 2: Popularity (reduce generic filler)
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

            // Limit to max 2 tracks per artist to prevent spamming their discography
            if (count < 2) {
                seenIds.add(t.id);
                unique.push(t);
                artistCounts[artistId] = count + 1;
            }
        }
    }

    if (unique.length === 0) {
        console.log("Discovery failed. Using resilient fallback search...");
        const fallbackTracks = await searchForTracks("year:2024", 0, token);
        if (fallbackTracks.length > 0) return fallbackTracks.slice(0, 25);

        // Final ultimate fallback: Get tracks from a guaranteed public playlist
        return getPlaylistTracks("37i9dQZF1DXcBWIGoYBM5M");
    }

    // Final Shuffle & Slice
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

export async function getArtistDetails(artistId) {
    return await spotify.getArtist(artistId);
}

export async function getAudioFeatures(trackId) {
    return await spotify.getAudioFeaturesForTrack(trackId);
}

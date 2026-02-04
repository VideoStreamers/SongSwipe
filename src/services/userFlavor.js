// User Flavor Service
// Persists user preferences and interaction history to localStorage for smarter recommendations

const STORAGE_KEY = 'songswipe_user_flavor_v1';

const DEFAULT_FLAVOR = {
    topGenres: {},       // { 'phonk': 15, 'house': 5 }
    topArtists: {},      // { 'kordhell': 10 }
    likedTracks: [],     // IDs of loved songs
    skippedTracks: [],   // IDs of hated songs
    vibeStats: {         // Rolling average of audio features (manually calculated if API fails)
        energy: 0.7,
        tempo: 120,
        happiness: 0.5
    },
    lastUpdated: Date.now()
};

export const UserFlavor = {
    // Load profile
    getProfile: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : DEFAULT_FLAVOR;
        } catch (e) {
            return DEFAULT_FLAVOR;
        }
    },

    // Save profile
    saveProfile: (profile) => {
        try {
            profile.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {
            console.warn('Failed to save flavor profile', e);
        }
    },

    // Record a "Like" (Swipe Right)
    recordLike: (track) => {
        const profile = UserFlavor.getProfile();

        // 1. Save ID
        if (!profile.likedTracks.includes(track.id)) {
            profile.likedTracks.push(track.id);
            // Keep max 100 liked track IDs to save space
            if (profile.likedTracks.length > 100) profile.likedTracks.shift();
        }

        // 2. Update Artists
        track.artists.forEach(artist => {
            profile.topArtists[artist.name] = (profile.topArtists[artist.name] || 0) + 1;
        });

        // 3. Update Genres (Approximate/Inferred if not provided)
        // We can't always get genres from track object, but we'll try to guess/store later

        UserFlavor.saveProfile(profile);
    },

    // Record a "Dislike" (Swipe Left)
    recordDislike: (track) => {
        const profile = UserFlavor.getProfile();
        if (!profile.skippedTracks.includes(track.id)) {
            profile.skippedTracks.push(track.id);
            if (profile.skippedTracks.length > 50) profile.skippedTracks.shift();
        }
        UserFlavor.saveProfile(profile);
    },

    // Get top search terms based on flavor
    getFlavorTerms: () => {
        const profile = UserFlavor.getProfile();

        // Get top 3 artists
        const topArtists = Object.entries(profile.topArtists)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => `artist:"${name}"`);

        return topArtists;
    },

    // Add genre specifically (called from Playlist Analysis)
    addGenres: (genres) => {
        const profile = UserFlavor.getProfile();
        let changed = false;
        genres.forEach(g => {
            if (g) {
                profile.topGenres[g] = (profile.topGenres[g] || 0) + 1;
                changed = true;
            }
        });
        if (changed) UserFlavor.saveProfile(profile);
    },

    // Get Top Genres sorted
    getTopGenres: () => {
        const profile = UserFlavor.getProfile();
        return Object.entries(profile.topGenres)
            .sort((a, b) => b[1] - a[1]) // Sort desc
            .slice(0, 5)
            .map(([g]) => g);
    }
};

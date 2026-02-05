# 🧠 SongSwipe Discovery Engine

## Overview

The **Adaptive Discovery Engine** is SongSwipe's intelligent recommendation system that learns from your behavior to deliver highly personalized music suggestions. Unlike basic recommendation systems, this engine tracks multiple dimensions of user behavior and persists learning across sessions using localStorage.

---

## 🎯 Core Features

### 1. **Behavioral Tracking**

| Metric | Description | How It's Used |
|--------|-------------|---------------|
| **Swipe Speed** | Time from first touch to swipe completion | Fast swipes (< 1.5s) indicate confident decisions and carry more weight |
| **Swipe Patterns** | Like/dislike ratios, streaks, time-of-day | Optimizes recommendations based on when you're most engaged |
| **Session Memory** | All tracks swiped in current & past sessions | Prevents duplicate recommendations across sessions |
| **Interaction Timing** | When you pause, replay, or skip | Identifies genuine interest vs passive swiping |

### 2. **Audio Feature Learning**

The engine tracks your preferences for these Spotify audio features:

| Feature | Description | Range |
|---------|-------------|-------|
| **Energy** | Intensity and activity | 0.0 - 1.0 |
| **Valence** | Musical positiveness (happy vs sad) | 0.0 - 1.0 |
| **Danceability** | How suitable for dancing | 0.0 - 1.0 |
| **Tempo** | Beats per minute | 40 - 220 BPM |
| **Acousticness** | Acoustic vs electronic | 0.0 - 1.0 |
| **Instrumentalness** | Vocal vs instrumental | 0.0 - 1.0 |
| **Speechiness** | Presence of spoken words | 0.0 - 1.0 |

These are stored as **rolling weighted averages**, with recent likes weighted more heavily.

### 3. **Artist & Genre Affinity**

- **Artist Scores**: Each artist gets a score based on your swipe history
  - Right swipe: +1 to +2 points (confident swipes = more)
  - Super like (up): +4 points
  - Left swipe: -1 to -2 points
  - Very negative scores (-5+) trigger artist avoidance

- **Genre Tracking**: Genres are extracted from artists and scored similarly
  - Genres with scores below -10 are **blacklisted** and actively avoided
  - Top genres are used to seed recommendations

---

## 🔄 Recommendation Strategies

The engine uses a **multi-strategy approach** to ensure high-quality, diverse recommendations:

### Strategy 1: Playlist Profile Matching
When you select a playlist, the engine:
1. Samples tracks from beginning, middle, and end
2. Calculates audio feature averages and standard deviations
3. Extracts genres from artists
4. Builds a "vibe fingerprint" for the playlist
5. Generates recommendations that match this fingerprint

### Strategy 2: Learned Preferences
Uses your accumulated preferences:
- Top liked artists as seeds
- Favorite genres
- Target audio features (energy, tempo, etc.)
- Time-of-day adjustments (morning vs evening preferences)

### Strategy 3: Seed Track Continuation
After each swipe, uses the current song as a seed:
- Applies learned feature constraints
- Filters against blacklisted artists/genres
- Maintains momentum in the current vibe

### Strategy 4: Diversity Injection
Controlled exploration of new territory:
- Picks unexplored but valid genres
- Keeps energy levels similar to your preferences
- Prevents filter bubbles

---

## 💾 Data Persistence

All user data is stored in **localStorage** with the following structure:

### Discovery Engine (`songswipe_discovery_engine_v2`)
```javascript
{
  swipedTrackIds: [],        // Up to 500 track IDs
  audioFeaturePrefs: {},     // Rolling averages
  artistScores: {},          // Artist affinity scores
  genreScores: {},           // Genre preferences
  blacklistedGenres: [],     // Genres to avoid
  timeOfDayPrefs: {},        // Morning/evening patterns
  currentPlaylistProfile: {} // Active playlist fingerprint
}
```

### User Flavor (`songswipe_user_flavor_v2`)
```javascript
{
  topGenres: {},             // Weighted genre preferences
  topArtists: {},            // Artist scores with names
  likedTracks: [],           // Last 200 liked tracks
  skippedTracks: [],         // Last 100 skipped tracks
  superLikedTracks: [],      // Special favorites
  vibeStats: {},             // Audio feature preferences
  swipePatterns: {},         // Behavioral analytics
  discoveryInsights: {}      // Exploration history
}
```

---

## 🔧 API Integration

### Spotify API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/recommendations` | Primary recommendation source |
| `/search` | Fallback when recommendations fail |
| `/audio-features` | Track audio analysis |
| `/artists/{id}` | Genre extraction |
| `/me/tracks` | Saved songs for library mode |
| `/me/top/tracks` | User's top tracks for seeding |

### Rate Limit Handling

- Graceful fallbacks when API calls fail
- Multiple parallel strategies ensure at least one succeeds
- Search API used as ultimate fallback

---

## 🎮 User Controls

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| ← | Nope (left swipe) |
| → | Like (right swipe) |
| ↑ | Super Like (up swipe) |
| Backspace | Rewind to previous |
| + | Open curation menu |
| M | Toggle mute |
| L | Toggle light/dark mode |

### Settings Integration

The Discovery Engine respects user settings and can be:
- Reset via the Settings modal
- Viewed for statistics (coming soon)
- Exported (future feature)

---

## 📊 Algorithm Flow

```
User Selects Playlist/Library
         │
         ▼
┌─────────────────────────────┐
│  Analyze Source Content     │
│  • Sample 30 tracks         │
│  • Extract audio features   │
│  • Identify top genres      │
│  • Build vibe fingerprint   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Apply User Preferences     │
│  • Load learned features    │
│  • Check blacklists         │
│  • Filter swiped tracks     │
│  • Time-of-day adjustment   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Multi-Strategy Generation  │
│  • Profile-based recs       │
│  • Preference-based recs    │
│  • Seed-based recs          │
│  • Diversity injection      │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Post-Processing            │
│  • Deduplicate              │
│  • Score by affinity        │
│  • Artist diversity check   │
│  • Shuffle with bias        │
└─────────────────────────────┘
         │
         ▼
    Recommendations Ready!
```

---

## 🚀 Future Enhancements

Planned improvements for the Discovery Engine:

1. **Collaborative Filtering** - Learn from similar users
2. **Mood Detection** - Infer current mood from listening patterns
3. **Playlist Generation** - Auto-create playlists from preferences
4. **Skip Prediction** - Pre-skip likely dislikes
5. **Export/Import** - Share taste profiles
6. **Visual Analytics** - Show preference insights in UI

---

## 📝 Technical Notes

### Performance Considerations
- All localStorage operations are async-safe
- Feature extraction is batched (max 50 tracks per request)
- Recommendations are pre-fetched when queue runs low
- Audio preview preloading for next 2 songs

### Error Handling
- All API calls have try/catch with graceful degration
- Multiple fallback strategies ensure continuous operation
- Invalid/expired tokens handled automatically

### Privacy
- All data stored locally in browser
- No data sent to external servers (except Spotify API)
- User can clear all data via Settings

---

*Created by Seppe Dorissen with Antigravity AI*

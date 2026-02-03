# 🎵 SongSwipe

**The most tactile music discovery engine on the planet.**

SongSwipe is a high-performance, physics-based music discovery dashboard that turns the Spotify library into a sensory experience. Swipe through recommendations, curate collections in real-time, and feel the "vibe" of every track through dynamic chromatic extraction.

🚀 **View Live Demo:** [seppedorissen.be/songswipe/](https://seppedorissen.be/songswipe/)

---

## ✨ Key Features

### 🎭 Dual-Sidebar discovery Theater
*   **The Library (Left):** Access your entire Spotify collection with a collapsible, off-canvas management system.
*   **The Curation (Right):** A dedicated, high-speed pinning menu to search, create, and add tracks to playlists without leaving the discovery flow.

### 🎮 High-Octane Interactions
*   **Tactile Physics Engine:** Interactive musical elements on the landing page that you can "toss" and scatter.
*   **Chromatic Vibe-Sync:** The entire UI dynamically extracts color palettes from album art in real-time, syncing the ambient background to the song's soul.
*   **Power-User Controls:** Full keyboard navigation support:
    *   `Arrow Left`: Nope
    *   `Arrow Right`: Like
    *   `Arrow Up`: Super Like / Pin
    *   `Backspace`: Rapid Rewind
    *   `+`: Open Curation Menu

### 🧬 Advanced Discovery Logic
*   **Resilient Search Multi-Strategy:** Seamlessly blends seed-based recommendations with trend exploration to ensure zero downtime.
*   **Sonic Visualization:** Real-time frequency scanning and pulse animations that preview the energy of the deck.

---

## 🛠️ Tech Stack

*   **Core:** React.js + Vite
*   **Animations:** Framer Motion (Physics, Spring Dynamics, Off-Canvas Transitions)
*   **Intelligence:** Spotify Web API (Implicit Grant Flow)
*   **Visuals:** ColorThief (Dominant Palette Extraction), Lucide React (Adaptive Iconography)
*   **Styling:** Vanilla CSS3 with Glassmorphism & Backdrop Filters

---

## 🚀 Installation & Build

### 1. Requirements
*   Node.js (LTS)
*   A Spotify Developer Client ID

### 2. Setup
```bash
# Clone the repo
git clone https://github.com/VideoStreamers/SongSwipe.git

# Install dependencies
npm install

# Create .env file
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/
```

### 3. Build for Web
```bash
npm run build
```
Upload the contents of the `dist/` folder to your server.

---

## ⚖️ Legal
This is an experimental project powered by the Spotify Web API. It is intended for non-commercial, personal use and demonstration purposes only. Not affiliated with Spotify AB.

Created by **[Seppe Dorissen](https://seppedorissen.be)**

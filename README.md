[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/VideoStreamers/SongSwipe)

# 🎵 SongSwipe

**The most tactile music discovery engine on the planet.**

SongSwipe transforms Spotify into an immersive, physics-driven discovery experience. Swipe through AI-curated recommendations, build playlists in real-time, and feel every track's vibe through dynamic chromatic extraction and adaptive UI.

🚀 **[Try Live Demo](https://seppedorissen.be/songswipe/)** | ⭐ **Star this repo if you love it!**

> **⚠️ Note:** The live demo requires Spotify whitelist access (app is in Development Mode). To try it yourself, clone the repo and set up your own Spotify Developer app—it's free and takes 5 minutes!

---

## 🤖 Built with Antigravity AI

This project was developed in collaboration with **Antigravity**, an agentic AI coding assistant by **Google DeepMind**. Using advanced agentic workflows, we went from concept to production-ready app in a single high-intensity session—showcasing the power of AI-assisted development.

---

## ✨ Features

### 🎯 **Smart Music Discovery**
- **Multi-Seed Algorithm**: Samples 15 tracks from beginning, middle, and end of playlists for comprehensive vibe matching
- **Adaptive Recommendations**: Dynamically refills queue based on your swipes—never runs out of songs
- **Duplicate Prevention**: Intelligent tracking ensures you never see the same song twice in a session
- **Audio Preloading**: Next 2 songs preload automatically for instant playback

### 🎨 **Immersive Visual Experience**
- **Chromatic Vibe-Sync**: UI colors dynamically extract from album art in real-time
- **Animated Particles**: Mood-reactive particle systems that respond to song energy
- **Glassmorphism Design**: Premium frosted glass effects with backdrop blur
- **Smooth Transitions**: Framer Motion physics for buttery-smooth animations

### 🎮 **Dual-Sidebar Interface**
- **Library Sidebar (Left)**: Browse your entire Spotify collection with smart filtering
- **Curation Sidebar (Right)**: Quick-add songs to playlists without interrupting discovery
- **Mobile Optimized**: Responsive design with touch-friendly controls

### ⌨️ **Power-User Controls**
- `←` Nope (swipe left)
- `→` Like (swipe right, adds to playlist/library)
- `↑` Super Like (saves to Liked Songs + adds to playlist)
- `Space` Play/Pause
- `Ctrl/Cmd + Z` Rewind to previous song
- `+` Open curation menu

### 🎵 **Audio Features**
- **30-Second Previews**: High-quality Spotify preview playback
- **Volume Control**: Smooth volume slider with haptic notches
- **Play/Pause Overlay**: Visual feedback for audio state
- **Sound Effects**: Satisfying UI sounds for swipes and interactions

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, Vite 5 |
| **Animations** | Framer Motion (physics, springs, gestures) |
| **Styling** | Vanilla CSS3, Glassmorphism, CSS Grid/Flexbox |
| **API** | Spotify Web API (OAuth 2.0) |
| **Visuals** | ColorThief (palette extraction), Lucide React (icons) |
| **Particles** | @tsparticles/react |
| **Audio** | HTML5 Audio API |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **Spotify Developer Account** ([Sign up here](https://developer.spotify.com/dashboard))

### 1. Clone the Repository
```bash
git clone https://github.com/VideoStreamers/SongSwipe.git
cd SongSwipe
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URIs:
   - `http://localhost:5173/` (development)
   - `https://yourdomain.com/songswipe/` (production)
4. Copy your **Client ID**

### 4. Configure Environment Variables

Create `.env.development` for local development:
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/
```

Create `.env.production` for deployment:
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=https://yourdomain.com/songswipe/
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build for Production
```bash
npm run build
```
Upload the contents of `dist/` to your web server.

---

## 📱 Mobile Support

SongSwipe is fully optimized for mobile devices:
- ✅ Touch-friendly swipe gestures
- ✅ Responsive card sizing (240px on mobile)
- ✅ Larger tap targets for sidebar controls
- ✅ Optimized performance (particles disabled on mobile)
- ✅ Separate mobile/desktop landing pages

---

## 🎨 Design Philosophy

### **Tactile & Immersive**
Every interaction feels physical—cards respond to drag velocity, buttons have magnetic hover effects, and the UI pulses with color when you swipe.

### **Performance-First**
- Audio preloading for instant playback
- Efficient React rendering with `useCallback` and `useMemo`
- Optimized particle systems
- Smart API batching (3 parallel calls for playlists)

### **Accessible**
- Full keyboard navigation
- High-contrast color modes
- Semantic HTML structure
- ARIA labels for screen readers

---

## 🔧 Configuration

### Vite Config (`vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/songswipe/', // Adjust for subfolder hosting
  server: {
    host: '127.0.0.1',
    port: 5173,
  }
})
```

### Subfolder Hosting
If hosting in a subfolder, ensure:
1. `base: '/yourfolder/'` in `vite.config.js`
2. `.htaccess` in `public/` folder for SPA routing

---

## 🐛 Troubleshooting

### "Invalid Redirect URI" Error
- Ensure your redirect URI in `.env` **exactly matches** what's in your Spotify Developer Dashboard
- Include trailing slashes if present in the dashboard

### "Development Mode" Error (Friends Can't Access)
- Your Spotify app is in Development Mode
- Add users manually in Dashboard → Settings → User Management
- Or request Extended Quota Mode for up to 25 users

### Songs Not Loading
- Check browser console for API errors
- Verify your Spotify Client ID is correct
- Ensure you're using a Spotify Premium account (some features require it)

### Mobile UI Issues
- Clear browser cache and hard refresh (`Ctrl+Shift+R`)
- Ensure you've uploaded the latest `dist/` build

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style (React functional components, hooks)
- Test on both desktop and mobile
- Ensure no console errors
- Update README if adding features

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## ⚖️ Legal & Attribution

### Spotify API Usage
This is an experimental project powered by the Spotify Web API. It is intended for **non-commercial, personal use and demonstration purposes only**. Not affiliated with Spotify AB.

### Credits
- **Created by**: [Seppe Dorissen](https://seppedorissen.be)
- **AI Assistant**: Antigravity (Google DeepMind)
- **Music Data**: Spotify Web API
- **Icons**: Lucide React
- **Particles**: tsParticles

---

## 🌟 Acknowledgments

Special thanks to:
- **Spotify** for their incredible Web API
- **Google DeepMind** for Antigravity AI
- The **React** and **Framer Motion** communities
- Everyone who tested and provided feedback

---

## 📞 Contact

- **Website**: [seppedorissen.be](https://seppedorissen.be)
- **GitHub**: [@VideoStreamers](https://github.com/VideoStreamers)
- **Live Demo**: [seppedorissen.be/songswipe](https://seppedorissen.be/songswipe/)

---

<div align="center">

**Made with ❤️ and AI**

If you found this project helpful, please consider giving it a ⭐!

</div>

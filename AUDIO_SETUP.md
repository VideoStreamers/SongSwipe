# Audio Setup Guide

This application is configured to use premium royalty-free music for an immersive experience. 

## Where to get music?
We recommend **NoCopyrightSounds (NCS)** or similar royalty-free libraries for high-quality tracks that fit the vibe. 

## Required Files
Place your chosen `.mp3` files in `public/audio/sections/` with the following names:

## Placeholder Tracks (Included)
The project currently uses high-quality generated tracks from **SoundHelix** as placeholders. These are free to use for testing but should be replaced for a unique brand identity.

1. **Top Section (Hero)**
   - File: `hero-theme.mp3` (SoundHelix-Song-1)
   
2. **How It Works**
   - File: `how-it-works-beat.mp3` (SoundHelix-Song-3)

3. **Demo Section**
   - File: `demo-vibe.mp3` (SoundHelix-Song-8)

4. **Genres Section (Ambient)**
   - File: `genres-ambient.mp3` (SoundHelix-Song-12)
   - *Note*: This track will automatically lower in volume ("duck") when a user hovers over a genre preview.

5. **Features Section**
   - File: `features-loop.mp3` (SoundHelix-Song-15)

6. **Experience Section (Footer)**
   - File: `experience-grand.mp3` (SoundHelix-Song-16)

## Genre Previews
Place short 10-30s clips for each genre in `public/audio/genres/`:
- `indie-pop.mp3`
- `electronic.mp3`
- `hip-hop.mp3`
- `rnb.mp3`
- `alternative.mp3`
- `jazz.mp3`
- `soul.mp3`
- `lofi.mp3`
- `funk.mp3`
- `acoustic.mp3`
- `synthwave.mp3`
- `chill.mp3`

## Technical Notes
- The audio engine automatically handles crossfading between sections.
- The Genre section features automatic "ducking" where the background music volume lowers to 5% when a genre preview plays.

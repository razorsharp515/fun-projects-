## Description
This project is a browser-based Jujutsu Kaisen inspired hand-sign visualizer.

It uses:
- `MediaPipe Hands` for webcam hand tracking
- `Three.js` for real-time particle-based cursed technique effects
- Post-processing bloom, on-screen status/HUD, and a control panel for runtime tuning

## Features
- Real-time hand landmark detection from webcam input
- 8 technique states with animated particle systems
- Gesture smoothing to reduce flicker (technique changes after stable detection)
- Adaptive quality mode that auto-adjusts particle count based on frame time
- Manual quality override (`Auto`, `Low`, `High`)
- Particle size slider
- Reduce motion toggle
- Startup and dependency failure handling with clear status messages

## Gesture Mapping
- `Pinch (thumb + index)` -> `Secret Technique: Hollow Purple`
- `Index + Pinky Up` -> `Domain Expansion: Coffin of the Iron Mountain`
- `Two Closed Fists` -> `Domain Expansion: Mahoraga`
- `One Closed Fist` -> `Domain Expansion: Blood Manipulation`
- `Open Hand (index + middle + ring + pinky up)` -> `Domain Expansion: Malevolent Shrine`
- `Index + Middle Up` -> `Domain Expansion: Infinite Void`
- `Index Only` -> `Reverse Cursed Technique: Red`
- `No valid sign` -> `Neutral State`

## Controls
- `Quality`: `Auto` / `Low` / `High`
- `Particle Size`: range slider
- `Reduce Motion`: reduces screen shake and effect intensity
- `HUD`: shows FPS, active particle count, and quality mode

## Project Files
- `index.html` - app shell, CDN script loading, UI, control panel
- `styles.css` - styling/layout
- `app.js` - hand-sign classification, particle generation, animation, and runtime controls

## Run
Use a local server (do not open with `file://`).

### Option 1: VS Code Live Server
Open `index.html` with Live Server.

### Option 2: Python HTTP server
```bash
python -m http.server 5500
```
Then open `http://127.0.0.1:5500/`

## Requirements
- Modern browser with WebGL support
- Webcam access permission
- Internet access for CDN dependencies:
  - `three` (module import)
  - `@mediapipe/camera_utils`
  - `@mediapipe/hands`
  - `@mediapipe/drawing_utils`

## Notes
- On slower devices, `Auto` mode lowers particle count to keep performance stable.
- If CDN scripts fail to load, the app reports startup failure in the UI.

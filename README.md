## Description
SAT0RU is a Jujutsu Kaisen-inspired cursed technique visualizer using MediaPipe Hands + Three.js.

## Improvements in this version
- Split codebase into `index.html`, `styles.css`, and `app.js`
- Fixed text encoding (UTF-8) for Japanese title
- Added startup/error handling for camera and CDN failures
- Reduced heavy per-frame work for better FPS
- Added adaptive particle quality (auto scales based on frame time)
- Improved gesture stability with frame-based smoothing
- Resizes tracking canvas only when video dimensions actually change
- Added control panel: quality mode (`Auto/Low/High`), particle size slider, and reduce-motion toggle
- Added live HUD with FPS + particle count + active quality mode
- Added richer background treatment and mobile-safe control panel placement

## Techniques
- `Pinch` (thumb + index): Hollow Purple
- `Open hand`: Malevolent Shrine
- `Index + middle up`: Infinite Void
- `Index only`: Reversal Red

## Run
Use a local server (do not open with `file://`).

### Option 1: VS Code Live Server
Open `index.html` with Live Server.

### Option 2: Python server
```bash
python -m http.server 5500
```
Open: `http://127.0.0.1:5500/`

## Notes
- Webcam permission is required.
- If CDN scripts are blocked, startup will fail with an explicit message.
- For low-end devices, quality will auto-reduce particle count.

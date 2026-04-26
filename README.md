# Star Trail Adventure

A polished 3D platformer adventure built with TypeScript and Three.js. Explore vibrant worlds, conquer fortress stages, discover secrets, and aim for the highest rank!

## Features

- **World Map Navigation:**
  - Five themed worlds, each with unique stages and branching paths.
  - Secret exits and bonus stages to discover.
  - Progression by unlocking new worlds through fortress stages.

- **Player Abilities:**
  - Run, jump, and collect coins and power-ups.
  - Grow in size, gain firepower, and use advanced platformer mechanics (coyote time, jump buffering).
  - Defeat enemies, avoid hazards, and reach stage goals.

- **Stage Types:**
  - Normal, challenge, bonus, secret, vertical, and fortress stages.
  - Each stage has its own palette, difficulty, and unique layout.

- **Replay Value:**
  - Stages are ranked (C, B, A, S) based on coins, time, damage, and secrets.
  - Track completion percent and best scores for each world.

- **Save System:**
  - Automatic saving of progress, unlocked nodes, worlds, and best scores.

- **Modern Stack:**
  - Built with Vite, TypeScript, and Three.js for smooth 3D rendering and fast development.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Controls
- **Arrow Keys / WASD:** Move
- **Enter / Space:** Select / Jump
- **Tab / Q / E:** Switch world on map
- **Run / Fire / Jump:** On-screen buttons for touch devices

## Project Structure
- `src/` — Main source code
  - `game/` — Game loop and flow
  - `entities/` — Player and entities
  - `stage/` — Stage logic and objects
  - `map/` — World map logic
  - `renderer/` — Three.js rendering
  - `ui/` — HUD and UI
  - `audio/` — Audio management
  - `data/` — World and stage data
  - `constants/` — Game constants
  - `types/` — TypeScript types
  - `utils/` — Utility functions
  - `styles/` — CSS

## Credits
- Built with [Three.js](https://threejs.org/), [Vite](https://vitejs.dev/), and TypeScript.
- Fonts: Outfit, Inter (Google Fonts)

## License
MIT
# StarTrailAdventure

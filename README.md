# 3D Dragon Game

A 3D action game where you fly a dragon, shoot fireballs, and battle enemies in a procedurally generated terrain environment. Built with Three.js and Electron for a native desktop experience.

![3D Dragon Game](https://img.shields.io/badge/Three.js-0.162.0-blue) ![Electron](https://img.shields.io/badge/Electron-30.0.0-green) ![Vite](https://img.shields.io/badge/Vite-5.1.6-purple)

## Features

- **3D Dragon Flight**: Control a detailed dragon model with realistic flight mechanics
- **Combat System**: Shoot fireballs at enemy dragons to increase your score
- **Dynamic Terrain**: Procedurally generated landscape with mountains, valleys, and water
- **Health & Score Tracking**: Monitor your health and score as you battle enemies
- **Sound Effects**: Immersive audio for fireballs, hits, and game events
- **Desktop App**: Built with Electron for native desktop experience
- **Responsive Controls**: Keyboard controls for movement, shooting, and camera control

## Technology Stack

- **Three.js**: 3D graphics rendering engine
- **Electron**: Desktop application framework
- **Vite**: Fast build tool and dev server
- **Simplex Noise**: Procedural terrain generation
- **Web Audio API**: Sound effects and audio management

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/zhendershot/3d-dragon-game.git
cd 3d-dragon-game
```

2. Install dependencies:
```bash
npm install
```

## Running the Game

### Development Mode (Browser)
```bash
npm run dev
```
Then open your browser to `http://localhost:5173`

### Electron Development Mode
```bash
npm run electron:dev
```

### Build for Production
```bash
npm run build
```

### Build Electron App
```bash
npm run electron:build
```
The packaged app will be in the `dist` directory

## Debugging

### VS Code
The project includes a `.vscode/launch.json` configuration for debugging in VS Code.

1.  **Web Debugging**: Select "Launch Chrome (Vite)" from the Run and Debug sidebar to launch the game in Chrome with breakpoints enabled.
2.  **Electron Debugging**: Select "Debug Main Process" to debug the Electron main process.

## Controls

| Key | Action |
|-----|--------|
| **W** / **↑** | Move Forward |
| **S** / **↓** | Move Backward |
| **A** / **←** | Turn Left |
| **D** / **→** | Turn Right |
| **Space** | Shoot Fireball |
| **Q** / **Shift** | Descend |
| **E** / **Ctrl** | Ascend |
| **H** | Toggle Controls |
| **Escape** | Pause/Resume |
| **R** | Restart (when game over) |

## Game Objective

- **Goal**: Defeat 5 enemy dragons to win
- **Challenge**: Avoid enemy attacks - you have 3 health points
- **Strategy**: Maneuver your dragon to shoot fireballs while dodging enemy fire

## Sound Files

The game requires the following sound files to be placed in the `/public/sounds/` directory:

- `fireball.mp3` - Sound for shooting a fireball
- `enemy-hit.mp3` - Sound for hitting an enemy
- `player-hit.mp3` - Sound for when player gets hit
- `victory.mp3` - Sound for winning the game
- `defeat.mp3` - Sound for losing the game

You can find suitable sound effects on websites like [freesound.org](https://freesound.org) or create your own.

## Project Structure

```
3d-dragon-game/
├── src/
│   ├── main.js         # Main game loop and initialization
│   ├── player.js       # Player dragon model and controls
│   ├── enemies.js      # Enemy AI and spawning
│   ├── fireballs.js    # Projectile system
│   ├── terrain.js      # Procedural terrain generation
│   ├── collisions.js   # Collision detection
│   └── sounds.js       # Audio system
├── electron/
│   ├── main.js         # Electron main process
│   └── preload.js      # Electron preload script
├── index.html          # HTML entry point
├── vite.config.js      # Vite configuration
└── package.json        # Project dependencies
```

## Development

The game uses a modular architecture with separate files for different game systems:

- **Rendering**: Three.js scene, camera, and renderer setup in `main.js:23-53`
- **Game Loop**: RequestAnimationFrame-based animation loop in `main.js:136-200`
- **Player System**: Dragon model with physics-based movement in `player.js`
- **Enemy System**: AI-controlled enemy dragons with targeting in `enemies.js`
- **Combat System**: Fireball projectiles with collision detection in `fireballs.js` and `collisions.js`
- **Terrain System**: Procedurally generated landscape in `terrain.js`
- **Audio System**: Web Audio API for sound effects in `sounds.js`

## Building for Distribution

The game can be packaged as a desktop application using Electron Builder:

```bash
npm run electron:build
```

This creates platform-specific installers. Configuration is defined in `package.json:24-35`.

### Build Configuration

- **App ID**: `com.dragon3d.game`
- **Product Name**: 3D Dragon Game
- **Mac Target**: DMG installer
- **Category**: Games

## Performance

- **Rendering**: WebGL with shadow mapping enabled
- **Shadow Quality**: 2048x2048 shadow maps
- **Camera Range**: 15000 units for distant landscape views
- **Frame Rate**: Targets 60 FPS with requestAnimationFrame

## License

MIT

## Author

Zach Hendershot

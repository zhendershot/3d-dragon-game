# 3D Dragon Game

A 3D desktop game for macOS where you fly a dragon over procedurally generated terrain and battle against enemy dragons by shooting fireballs.

## Game Features

- Control a 3D dragon with the keyboard
- Shoot fireballs to hit enemy dragons
- Score points for each enemy you hit
- Lose points when enemies hit you
- Win the game by reaching 5 points

## Controls

- W/Up Arrow: Move forward
- S/Down Arrow: Move backward
- A/Left Arrow: Turn left
- D/Right Arrow: Turn right
- Space: Shoot fireball
- Q/Shift: Descend
- E/Control: Ascend
- Escape: Pause game
- H: Toggle controls display
- R: Restart game (after game over)

## Getting Started

### Prerequisites

- Node.js and npm installed

### Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server with Electron: `npm run electron:dev`

### Building for macOS

1. Install dependencies: `npm install`
2. Build the application: `npm run electron:build`
3. The packaged app will be in the `release` directory

## Sound Files

The game requires the following sound files to be placed in the `/public/sounds/` directory:

- `fireball.mp3`: Sound for shooting a fireball
- `enemy-hit.mp3`: Sound for hitting an enemy
- `player-hit.mp3`: Sound for when player gets hit
- `victory.mp3`: Sound for winning the game
- `defeat.mp3`: Sound for losing the game

You can find suitable sound effects on websites like freesound.org or create your own.

## Technologies Used

- Three.js for 3D rendering
- Electron for desktop app packaging
- Vite for bundling and development server

## License

This project is licensed under the MIT License - see the LICENSE file for details.
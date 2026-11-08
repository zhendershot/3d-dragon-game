import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createTerrain } from './terrain.js';
import { createPlayer, updatePlayer } from './player.js';
import { createEnemies, updateEnemies } from './enemies.js';
import { initFireballs, getFireball, updateFireballs } from './fireballs.js';
import { checkCollisions } from './collisions.js';
import { loadSounds, playSoundEffect } from './sounds.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Game state
const gameState = {
  score: 0,
  health: 3,
  player: null,
  enemies: [],
  fireballs: [],
  gameOver: false,
  victory: false,
  paused: false
};

// Create scene
const scene = new THREE.Scene();

// Create camera with increased far plane for distant landscape views
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 15000);
camera.position.set(0, 200, 20);

// Make camera reference available to scene (needed for billboarding)
scene.camera = camera;

// Create renderer with basic settings
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
document.body.appendChild(renderer.domElement);

// Post-processing setup
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.2;
bloomPass.strength = 0.8; // Intensity of glow
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Create basic lighting
// Create broad lighting
const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(ambientLight);

// Main directional sunlight
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(100, 1000, 500); // Higher sun position
directionalLight.castShadow = true;

// Improved shadow settings
directionalLight.shadow.mapSize.width = 2048; // Reduced from 4096
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 3000;
directionalLight.shadow.camera.left = -1500;
directionalLight.shadow.camera.right = 1500;
directionalLight.shadow.camera.top = 1500;
directionalLight.shadow.camera.bottom = -1500;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Initialize photorealistic terrain
const terrain = createTerrain(scene, renderer);

// Store time for shader animations
let time = 0;

// Load sounds
const sounds = loadSounds();

// Loading manager to track progress
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
  document.getElementById('loading').style.display = 'none';

  // Show controls briefly at start
  document.getElementById('controls').style.display = 'block';
  setTimeout(() => {
    document.getElementById('controls').style.display = 'none';
  }, 5000);
};

// Ensure loading screen is removed after a timeout even if onLoad doesn't fire
setTimeout(() => {
  document.getElementById('loading').style.display = 'none';
}, 3000);

// Initialize game
async function initGame() {
  // Create player
  gameState.player = await createPlayer(scene, loadingManager);

  // Create enemies
  gameState.enemies = await createEnemies(scene, 5, loadingManager);

  // Initialize fireballs
  initFireballs(scene);

  // Start the animation loop
  animate();
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Handle keyboard input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  keys[e.key] = true; // Fallback

  // Fire on space
  if (e.code === 'Space' && !gameState.gameOver && !gameState.paused) {
    const fireball = getFireball(gameState.player, scene);
    if (fireball) {
      gameState.fireballs.push(fireball);
      playSoundEffect(sounds.fireball);
    }
  }

  // Pause on Escape
  if (e.key === 'Escape') {
    gameState.paused = !gameState.paused;
    const infoEl = document.getElementById('info');
    if (gameState.paused) {
      infoEl.innerHTML = '<h1>PAUSED</h1> Press ESC to resume';
    } else {
      infoEl.innerHTML = 'Score: <span id="score">' + gameState.score + '</span> | Health: <span id="health">' + gameState.health + '</span>';
    }
  }

  // Toggle controls visibility
  if (e.key === 'h' || e.key === 'H') {
    const controlsEl = document.getElementById('controls');
    controlsEl.style.display = controlsEl.style.display === 'none' ? 'block' : 'none';
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  keys[e.code] = false;
});

// Animation loop
function animate() {
  if (gameState.gameOver) {
    const infoEl = document.getElementById('info');
    infoEl.innerHTML = gameState.victory ?
      '<h1>Victory!</h1> Press R to play again.' :
      '<h1>Game Over!</h1> Press R to play again.';
    infoEl.style.fontSize = '24px';
    infoEl.style.textAlign = 'center';

    // Allow restart with R key
    if (keys['r'] || keys['R']) {
      window.location.reload();
    }

    requestAnimationFrame(animate);
    return;
  }

  requestAnimationFrame(animate);

  // Update time for shader-based effects
  time += 0.01;

  // Don't update if paused
  if (gameState.paused) {
    composer.render();
    return;
  }

  // Update player
  updatePlayer(gameState.player, keys, camera, terrain);

  // Update enemies
  updateEnemies(gameState.enemies, gameState.player.model.position, terrain);

  // Update fireballs
  updateFireballs(gameState.fireballs, scene);

  // Update terrain animations (water, clouds, etc.)
  if (terrain.userData && terrain.userData.update) {
    terrain.userData.update(time);
  }

  // Check collisions
  checkCollisions(gameState, scene, sounds);

  // Update UI
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('health').textContent = gameState.health;

  // Check win/lose conditions
  if (gameState.score >= 5) {
    gameState.gameOver = true;
    gameState.victory = true;
    playSoundEffect(sounds.victory);
  } else if (gameState.health <= 0) {
    gameState.gameOver = true;
    playSoundEffect(sounds.defeat);
  }

  // Apply post-processing effects for better visuals

  // Use composer for rendering
  composer.render();
}

// Handle fullscreen for Electron
if (window.electron) {
  window.electron.onFullscreenChange((isFullscreen) => {
    // Adjust any UI elements if needed
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });
}

// Add error handling
try {
  // Start the game
  initGame();
} catch (error) {
  console.error("Error starting game:", error);
  alert("An error occurred while starting the game. Check the console for details.");
}
// Helper to create and set up an audio element
function createAudio(src, volume = 0.5) {
  const audio = new Audio(src);
  audio.volume = volume;
  
  // Preload audio
  audio.preload = 'auto';
  
  // Handle errors
  audio.onerror = () => {
    console.warn(`Failed to load sound: ${src}`);
  };
  
  return audio;
}

export function loadSounds() {
  // Get base path - for Electron packaged app it might be different
  const basePath = window.electron ? '.' : '';
  
  // Create audio objects
  const sounds = {
    fireball: createAudio(`${basePath}/sounds/fireball.mp3`, 0.5),
    enemyHit: createAudio(`${basePath}/sounds/enemy-hit.mp3`, 0.6),
    playerHit: createAudio(`${basePath}/sounds/player-hit.mp3`, 0.7),
    victory: createAudio(`${basePath}/sounds/victory.mp3`, 0.8),
    defeat: createAudio(`${basePath}/sounds/defeat.mp3`, 0.8)
  };
  
  // Create placeholder sounds if the files fail to load
  for (const key in sounds) {
    sounds[key].addEventListener('error', () => {
      // Create an oscillator as a backup sound if the file fails to load
      sounds[key].play = createFallbackSound(key);
    });
  }
  
  return sounds;
}

// Fallback sound generator using Web Audio API
function createFallbackSound(type) {
  return function() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Different sound types for different events
      switch (type) {
        case 'fireball':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.2);
          break;
          
        case 'enemyHit':
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
          break;
          
        case 'playerHit':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(330, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
          break;
          
        case 'victory':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
          oscillator.frequency.setValueAtTime(554, audioCtx.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.4);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.4);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.6);
          break;
          
        case 'defeat':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
          oscillator.frequency.setValueAtTime(392, audioCtx.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(349, audioCtx.currentTime + 0.4);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.4);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.6);
          break;
      }
      
      return Promise.resolve();
    } catch (e) {
      console.error('Failed to create fallback sound:', e);
      return Promise.resolve();
    }
  };
}

export function playSoundEffect(sound) {
  // Check if sound exists
  if (sound) {
    // Reset to beginning if already playing
    if (sound.currentTime > 0) {
      sound.currentTime = 0;
    }
    
    // Try to play the sound
    sound.play().catch(e => {
      console.log('Error playing sound:', e);
      // If normal play fails, try the fallback if it exists
      if (typeof sound.fallback === 'function') {
        sound.fallback();
      }
    });
  }
}
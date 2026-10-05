// Main entry point for Kura Card Game

import { GameEngine } from './engine.js';
import { UIController } from './ui.js';
import { sounds } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine(['You', 'Kuro', 'Reyy', 'Luna']);
  const ui = new UIController(engine);

  // Initialize audio context on first user interaction
  const initAudio = () => {
    sounds.init();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('keydown', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };

  window.addEventListener('click', initAudio);
  window.addEventListener('keydown', initAudio);
  window.addEventListener('touchstart', initAudio);

  console.log('🎮 Kura Card Game Initialized Successfully!');
});

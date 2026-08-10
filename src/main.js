import { generatePuzzle } from './js/engine.js';
import { initUI } from './js/ui.js';

// Test running the engine in the console to verify it works
const testWords = ["VITE", "PWA", "JAVASCRIPT", "ENGINE"];
const puzzle = generatePuzzle(testWords);

// DEBUG // console.log("Nikki's Word Search Engine Test Initialized:", puzzle);

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    // DEBUG //console.log("Nikki's Word Search Creator UI Initialized Successfully.");

});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Automatically accounts for root vs GitHub Pages subdirectories
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      // DEBUG // .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}
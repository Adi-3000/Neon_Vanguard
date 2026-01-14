import './style.css';
import { Game } from './core/Game';

console.log('[MAIN] Script loaded');
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
console.log('[MAIN] Canvas element:', canvas);

if (canvas) {
  console.log('[MAIN] Creating game instance...');
  const game = new Game(canvas);
  console.log('[MAIN] Game instance created:', game);
  console.log('[MAIN] Starting game...');
  game.start();
  console.log('[MAIN] Game started');
} else {
  console.error("[MAIN] Canvas element not found!");
}

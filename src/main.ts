import './style.css';
import { Game } from './core/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (canvas) {
  const game = new Game(canvas);
  game.start();
} else {
  console.error("Canvas element not found!");
}

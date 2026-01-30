// Main entry point - initializes the game
import { Game } from './game/index.ts';
import { AudioManager, ProgressionManager, DailyRewardsManager } from './core/index.ts';

declare global {
    interface Window {
        game?: Game;
    }
}

// Check if running in development (localhost)
const isDevelopment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
);

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create dependency instances
    const audioManager = new AudioManager();
    const progressionManager = new ProgressionManager();
    const dailyRewardsManager = new DailyRewardsManager();

    // Create game with dependencies
    const game = new Game({
        audioManager,
        progressionManager,
        dailyRewardsManager
    });
    game.init();

    // Expose game instance for debugging (development only)
    if (isDevelopment) {
        window.game = game;
    }
});

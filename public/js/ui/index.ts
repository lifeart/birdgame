// UI module exports
export {
    UIManager,
    generateRandomName,
    loadSavedName,
    saveName,
    loadSavedBird,
    saveBird,
    loadSavedLocation,
    saveLocation
} from './manager.ts';
export { TouchControls, CAMERA_MODES, type CameraMode, type GameInterface } from './touch.ts';

// Components
export { LeaderboardComponent, type LeaderboardEntry } from './components/leaderboard.ts';
export { ChatComponent, type ChatMessage, type ChatCallbacks } from './components/chat.ts';

// Modals
export { LevelUpModal, type LevelUpReward } from './modals/level-up.ts';
export { DailyRewardsModal, type DailyRewardModalCallbacks } from './modals/daily-rewards.ts';

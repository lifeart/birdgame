// Game module type definitions
import type { Bird } from '../bird/index.ts';
import type { AudioManager } from '../core/audio.ts';
import type { ProgressionManager } from '../core/progression.ts';
import type { DailyRewardsManager } from '../core/rewards.ts';

// Re-export types from core/network for use in game module
export type {
    PlayerData,
    WormData,
    FlyData,
    LeaderboardEntry,
    WelcomeData
} from '../core/network.ts';

// Game constants
export const GAME_CONSTANTS = {
    POSITION_UPDATE_INTERVAL: 50,  // ms between position updates to server
    DEFAULT_SPAWN_HEIGHT: 15,      // default Y position for spawning
    COLLISION_RESPAWN_DELAY: 5000, // ms stuck in collision before respawn
    GOLDEN_WORM_SPAWN_INTERVAL: 300000,  // 5 minutes between golden worm spawns
    GOLDEN_WORM_DURATION: 60000,   // 1 minute to catch golden worm
    CONNECTION_TIMEOUT: 10000,     // 10 seconds for WebSocket connection timeout
    MAX_RECONNECT_ATTEMPTS: 5,     // maximum reconnection attempts
    PING_INTERVAL: 30000,          // 30 seconds between ping messages
    MIN_DELTA: 1 / 240,            // 0.004s - Cap for high refresh displays (240Hz+)
    MAX_DELTA: 1 / 30,             // 0.033s - Cap for lag spikes
} as const;

// Input state
export interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;   // Strafe left (GTA-style)
    right: boolean;  // Strafe right (GTA-style)
    up: boolean;
    down: boolean;
    cameraLeft: boolean;
    cameraRight: boolean;
    // Legacy mouse look fields (unused in GTA mode, kept for compatibility)
    mouseDeltaX: number;
    mouseDeltaY: number;
    pointerLocked: boolean;
}

// Camera orbit configuration
export interface CameraOrbitState {
    angle: number;
    pitch: number;
    distance: number;
    targetAngle: number;
    targetPitch: number;
    targetDistance: number;
    minDistance: number;
    maxDistance: number;
    minPitch: number;
    maxPitch: number;
}

// Merged input from keyboard + touch
export interface MergedInput {
    forward: number;
    backward: number;
    left: number;   // Strafe left (GTA-style camera-relative)
    right: number;  // Strafe right (GTA-style camera-relative)
    up: number;
    down: number;
    turnRate: number;  // Legacy field, unused in GTA mode
    mouseDeltaX: number; // Legacy, unused in GTA mode
    mouseDeltaY: number; // Legacy, unused in GTA mode
    isTouch: boolean;
}

// Other player data
export interface OtherPlayer {
    id: string;
    name: string;
    bird: Bird;
    birdType: string;
    score: number;
}

// Bound event handlers for cleanup
export interface BoundHandlers {
    keydown: ((e: KeyboardEvent) => void) | null;
    keyup: ((e: KeyboardEvent) => void) | null;
    mousedown: ((e: MouseEvent) => void) | null;
    mouseup: ((e: MouseEvent) => void) | null;
    mousemove: ((e: MouseEvent) => void) | null;
    wheel: ((e: WheelEvent) => void) | null;
    contextmenu: ((e: Event) => void) | null;
    resize: (() => void) | null;
}

// Game dependencies (global instances)
export interface GameDependencies {
    audioManager: AudioManager;
    progressionManager: ProgressionManager;
    dailyRewardsManager: DailyRewardsManager;
}

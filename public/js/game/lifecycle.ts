// Game lifecycle module - handles game start, location changes, and spawning
import * as THREE from 'three';
import { Bird } from '../bird/index.ts';
import { LOCATIONS } from '../environment/index.ts';
import { DemoNetworkManager } from '../core/demo-network.ts';
import type { AnyNetworkManager } from '../core/index.ts';
import type { WelcomeData } from '../core/network.ts';
import type { AudioManager } from '../core/audio.ts';
import type { ProgressionManager } from '../core/progression.ts';
import type { DailyRewardsManager } from '../core/rewards.ts';
import type { UIManager } from '../ui/manager.ts';
import type { TouchControls } from '../ui/touch.ts';
import type { WormManager, FlyManager } from '../entities/index.ts';
import type { EffectsManager } from '../effects/index.ts';
import type { WeatherSystem } from '../environment/index.ts';
import type { World } from '../world/index.ts';
import type { OtherPlayer, PlayerData, WormData, FlyData, CameraOrbitState } from './types.ts';

// Context interface for lifecycle operations
export interface LifecycleContext {
    // State
    isRunning: boolean;
    score: number;
    currentLocation: string;
    paused: boolean;

    // THREE.js objects
    scene: THREE.Scene | null;

    // Managers
    network: AnyNetworkManager | null;
    ui: UIManager | null;
    audioManager: AudioManager;
    progressionManager: ProgressionManager;
    dailyRewardsManager: DailyRewardsManager;
    wormManager: WormManager | null;
    flyManager: FlyManager | null;
    effectsManager: EffectsManager | null;
    weatherSystem: WeatherSystem | null;
    world: World | null;
    touchControls: TouchControls | null;
    playerBird: Bird | null;
    otherPlayers: Map<string, OtherPlayer>;
    cameraOrbit: CameraOrbitState;

    // Timeouts
    dailyRewardTimeout: ReturnType<typeof setTimeout> | null;
    loadingTimeout: ReturnType<typeof setTimeout> | null;

    // Methods
    setIsRunning: (running: boolean) => void;
    setScore: (score: number) => void;
    setCurrentLocation: (location: string) => void;
    setPaused: (paused: boolean) => void;
    setPlayerBird: (bird: Bird | null) => void;
    setDailyRewardTimeout: (timeout: ReturnType<typeof setTimeout> | null) => void;
    setLoadingTimeout: (timeout: ReturnType<typeof setTimeout> | null) => void;
    updatePlayerList: () => void;
    resetCamera: () => void;
    animate: () => void;
    setNetwork: (network: AnyNetworkManager) => void;
}

/**
 * Shared game initialization logic used by all game start paths
 * (server connect, demo fallback, and WebRTC).
 * Assumes ctx.ui, ctx.scene, and ctx.world are non-null.
 */
export function initGameWithData(
    ctx: LifecycleContext,
    gameData: WelcomeData,
    birdType: string,
    location: string
): void {
    const ui = ctx.ui!;
    const scene = ctx.scene!;
    const world = ctx.world!;

    ui.hideMenu();
    ui.showConnectionStatus('connected');
    ctx.setCurrentLocation(location);
    ui.setLocation(location);

    if (ctx.touchControls && ctx.touchControls.isEnabled()) {
        ctx.touchControls.show();
    }

    loadLocation(ctx, location);

    const playerBird = new Bird(scene, birdType, true);
    ctx.setPlayerBird(playerBird);

    const birdRadius = playerBird.getCollisionRadius();
    const safePos = world.findSafeSpawnPosition(0, 0, 15, birdRadius);
    playerBird.setPosition(safePos.x, safePos.y, safePos.z);

    const score = gameData.player?.score || 0;
    ctx.setScore(score);
    playerBird.setWormCount(score);

    ctx.cameraOrbit.targetDistance = 8 + playerBird.config.size * 2;
    ctx.cameraOrbit.distance = ctx.cameraOrbit.targetDistance;

    if (gameData.worms && ctx.wormManager) {
        ctx.wormManager.addWorms(gameData.worms);
    }

    if (gameData.flies && ctx.flyManager) {
        ctx.flyManager.addFlies(gameData.flies);
    }

    if (gameData.players) {
        gameData.players.forEach((player: PlayerData) => {
            addOtherPlayer(ctx, player);
        });
    }

    ui.updateScore(score);
    ctx.updatePlayerList();

    ui.showLeaderboard();
    if (gameData.leaderboard) {
        const rankedLeaderboard = gameData.leaderboard.map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            score: entry.score
        }));
        ui.updateLeaderboard(rankedLeaderboard, ctx.network!.getPlayerName() ?? '');
    }

    applyUnlockedEffects(ctx);
}

export async function startGame(
    ctx: LifecycleContext,
    playerName: string,
    birdType: string,
    location: string
): Promise<void> {
    if (!ctx.network || !ctx.ui || !ctx.scene || !ctx.world) return;

    // Set isRunning immediately to prevent cleanup race conditions during async connect
    ctx.setIsRunning(true);

    try {
        ctx.ui.showConnectionStatus('connecting');
        const gameData = await ctx.network.connect(playerName, birdType, location);

        // Check if game was cleaned up during async operation
        if (!ctx.ui || !ctx.scene || !ctx.world) {
            ctx.setIsRunning(false);
            return;
        }

        if (!gameData) {
            throw new Error('No game data received');
        }

        initGameWithData(ctx, gameData, birdType, location);

        const score = gameData.player?.score || 0;
        if (gameData.isReturningPlayer && score > 0) {
            ctx.ui.addChatMessage('', `Welcome back! Your score of ${score} has been restored.`, true);
        }

        if (ctx.dailyRewardsManager && ctx.dailyRewardsManager.canClaim()) {
            const timeout = setTimeout(() => {
                ctx.setDailyRewardTimeout(null);
                ctx.ui?.showDailyRewardPopup(ctx.dailyRewardsManager!, ctx.progressionManager);
            }, 1000);
            ctx.setDailyRewardTimeout(timeout);
        }

        ctx.animate();

    } catch (error) {
        console.warn('Server unavailable, starting demo mode:', error);

        // Fall back to demo/offline mode
        const demoNetwork = new DemoNetworkManager();
        ctx.setNetwork(demoNetwork);

        try {
            const gameData = await ctx.network!.connect(playerName, birdType, location);

            if (!ctx.ui || !ctx.scene || !ctx.world) {
                ctx.setIsRunning(false);
                return;
            }

            initGameWithData(ctx, gameData, birdType, location);

            if (ctx.dailyRewardsManager && ctx.dailyRewardsManager.canClaim()) {
                const timeout = setTimeout(() => {
                    ctx.setDailyRewardTimeout(null);
                    ctx.ui?.showDailyRewardPopup(ctx.dailyRewardsManager!, ctx.progressionManager);
                }, 1000);
                ctx.setDailyRewardTimeout(timeout);
            }

            ctx.ui.addChatMessage('', 'Demo mode — playing offline!', true);
            ctx.animate();

        } catch (demoError) {
            ctx.setIsRunning(false);
            console.error('Failed to start demo mode:', demoError);
            const errorMessage = demoError instanceof Error ? demoError.message : 'Unknown error';
            ctx.ui!.showConnectionStatus('failed', { reason: errorMessage });
        }
    }
}

export function applyUnlockedEffects(ctx: LifecycleContext): void {
    if (!ctx.progressionManager || !ctx.playerBird || !ctx.effectsManager) {
        return;
    }

    const unlockedTrails = ctx.progressionManager.getUnlockedByType('trail');
    if (unlockedTrails.length > 0) {
        const latestTrail = unlockedTrails[unlockedTrails.length - 1];
        if (latestTrail.trailId) {
            ctx.effectsManager.createTrail('player', latestTrail.trailId, ctx.playerBird.group);
        }
    }

    const unlockedAuras = ctx.progressionManager.getUnlockedByType('aura');
    if (unlockedAuras.length > 0) {
        const latestAura = unlockedAuras[unlockedAuras.length - 1];
        if (latestAura.auraId) {
            ctx.effectsManager.createAura('player', latestAura.auraId, ctx.playerBird.group);
        }
    }
}

export function loadLocation(ctx: LifecycleContext, location: string): void {
    if (!ctx.world || !ctx.weatherSystem || !ctx.scene || !ctx.ui) return;

    ctx.ui.showLoading(`Loading ${LOCATIONS[location]?.name || location}...`);
    ctx.ui.setLoadingProgress(10);

    ctx.world.clear();
    ctx.ui.setLoadingProgress(20);

    ctx.weatherSystem.clear();
    ctx.ui.setLoadingProgress(30);

    const locationConfig = LOCATIONS[location];
    if (locationConfig) {
        ctx.ui.setLoadingText(`Generating ${locationConfig.name}...`);
        ctx.ui.setLoadingProgress(40);

        locationConfig.generate(ctx.world);
        ctx.world.finalizeWorld();
        ctx.ui.setLoadingProgress(70);

        if (ctx.scene.fog) {
            (ctx.scene.fog as THREE.Fog).color.setHex(locationConfig.skyBottomColor);
        }
        ctx.ui.setLoadingProgress(80);

        ctx.weatherSystem.init(ctx.scene.fog as THREE.Fog);
        ctx.weatherSystem.setTimeOfDay(8 + Math.random() * 8);
        ctx.weatherSystem.randomWeather();
        ctx.ui.setLoadingProgress(100);
    } else {
        console.warn(`Unknown location: ${location}`);
    }

    if (ctx.loadingTimeout) {
        clearTimeout(ctx.loadingTimeout);
    }
    const timeout = setTimeout(() => {
        ctx.setLoadingTimeout(null);
        ctx.ui?.hideLoading();
    }, 300);
    ctx.setLoadingTimeout(timeout);
}

export function changeLocation(
    ctx: LifecycleContext,
    location: string,
    worms: WormData[],
    flies: FlyData[],
    players: PlayerData[]
): void {
    ctx.setCurrentLocation(location);
    ctx.ui?.setLocation(location);

    loadLocation(ctx, location);

    ctx.wormManager?.clear();
    if (worms && ctx.wormManager) {
        ctx.wormManager.addWorms(worms);
    }

    ctx.flyManager?.clear();
    if (flies && ctx.flyManager) {
        ctx.flyManager.addFlies(flies);
    }

    ctx.otherPlayers.forEach(player => player.bird.remove());
    ctx.otherPlayers.clear();

    if (players) {
        players.forEach(player => addOtherPlayer(ctx, player));
    }

    if (ctx.playerBird && ctx.world) {
        const birdRadius = ctx.playerBird.getCollisionRadius();
        const safePos = ctx.world.findSafeSpawnPosition(0, 0, 15, birdRadius);
        ctx.playerBird.setPosition(safePos.x, safePos.y, safePos.z);
        ctx.playerBird.velocity.set(0, 0, 0);
    }

    ctx.ui?.addChatMessage('', `Moved to ${LOCATIONS[location]?.name || location}`, true);
    ctx.updatePlayerList();
    ctx.ui?.hidePauseMenu();
    ctx.setPaused(false);
}

export function respawnPlayer(ctx: LifecycleContext, collisionStartTime: { value: number | null }): void {
    if (!ctx.playerBird || !ctx.world) return;

    collisionStartTime.value = null;

    const currentX = ctx.playerBird.position.x;
    const currentZ = ctx.playerBird.position.z;
    const birdRadius = ctx.playerBird.getCollisionRadius();

    const safePos = ctx.world.findSafeSpawnPosition(currentX, currentZ, 15, birdRadius);

    ctx.playerBird.setPosition(safePos.x, safePos.y, safePos.z);
    ctx.playerBird.velocity.set(0, 0, 0);

    ctx.ui?.addChatMessage('', 'Respawned! (stuck too long)', true);
    ctx.audioManager?.playResume();

    ctx.resetCamera();
}

export function addOtherPlayer(ctx: LifecycleContext, playerData: PlayerData): void {
    if (!playerData || !playerData.id || !ctx.scene) return;

    const birdInstance = new Bird(ctx.scene, playerData.bird, false);
    birdInstance.setPosition(playerData.x || 0, playerData.y || 10, playerData.z || 0);
    birdInstance.setRotation(playerData.rotationY || 0);

    ctx.otherPlayers.set(playerData.id, {
        id: playerData.id,
        name: playerData.name || 'Unknown',
        bird: birdInstance,
        birdType: playerData.bird,
        score: playerData.score || 0
    });
}

// Network callbacks module - handles all network event subscriptions
import type { NetworkManager } from '../core/network.ts';
import type { AudioManager } from '../core/audio.ts';
import type { ProgressionManager } from '../core/progression.ts';
import type { UIManager } from '../ui/manager.ts';
import type { WormManager, FlyManager } from '../entities/index.ts';
import type { EffectsManager } from '../effects/index.ts';
import type { Bird } from '../bird/index.ts';
import type { OtherPlayer, PlayerData, WormData, FlyData } from './types.ts';

// Context interface for network callbacks
export interface NetworkCallbackContext {
    // State
    isRunning: boolean;
    score: number;
    goldenWormAlertShown: boolean;

    // Managers
    network: NetworkManager | null;
    ui: UIManager | null;
    audioManager: AudioManager;
    progressionManager: ProgressionManager;
    wormManager: WormManager | null;
    flyManager: FlyManager | null;
    effectsManager: EffectsManager | null;
    playerBird: Bird | null;
    otherPlayers: Map<string, OtherPlayer>;

    // Methods
    addOtherPlayer: (playerData: PlayerData) => void;
    updatePlayerList: () => void;
    changeLocation: (location: string, worms: WormData[], flies: FlyData[], players: PlayerData[]) => void;
    setScore: (score: number) => void;
    setGoldenWormAlertShown: (shown: boolean) => void;
}

export function setupNetworkCallbacks(ctx: NetworkCallbackContext): void {
    if (!ctx.network) return;

    ctx.network.on('playerJoined', (player: PlayerData) => {
        ctx.addOtherPlayer(player);
        ctx.ui?.addChatMessage('', `${player.name} joined`, true);
        ctx.updatePlayerList();
        ctx.audioManager?.playPlayerJoined();
    });

    ctx.network.on('playerLeft', (playerId: string) => {
        const player = ctx.otherPlayers.get(playerId);
        if (player) {
            ctx.ui?.addChatMessage('', `${player.name} left`, true);
            player.bird.remove();
            ctx.otherPlayers.delete(playerId);
            ctx.updatePlayerList();
            ctx.audioManager?.playPlayerLeft();
        }
    });

    ctx.network.on('playerMoved', (data: { playerId: string; x: number; y: number; z: number; rotationY: number }) => {
        const player = ctx.otherPlayers.get(data.playerId);
        if (player && player.bird) {
            player.bird.setPosition(data.x, data.y, data.z);
            player.bird.setRotation(data.rotationY);
        }
    });

    ctx.network.on('chatMessage', (data: { name: string; message: string }) => {
        ctx.ui?.addChatMessage(data.name, data.message);
        ctx.audioManager?.playChatMessage();
    });

    ctx.network.on('wormSpawned', (worm: WormData | null) => {
        if (worm && ctx.wormManager) {
            ctx.wormManager.addWorm(worm);
        }
    });

    ctx.network.on('wormCollected', (data: { wormId: string; playerId: string; newScore: number; isGolden?: boolean }) => {
        const isGolden = data.isGolden || false;
        ctx.wormManager?.removeWorm(data.wormId);

        // Note: Golden worm alert flag is reset in update.ts when no golden worm exists
        // This prevents double alerts from race conditions

        if (data.playerId === ctx.network?.playerId) {
            ctx.setScore(data.newScore);
            ctx.ui?.updateScore(ctx.score);
            if (ctx.playerBird) {
                ctx.playerBird.setWormCount(ctx.score);
            }

            if (ctx.progressionManager) {
                const xp = isGolden ?
                    ctx.progressionManager.getXPForAction('goldenWorm') :
                    ctx.progressionManager.getXPForAction('worm');
                ctx.progressionManager.addXP(xp, isGolden ? 'goldenWorm' : 'worm');
            }

            if (ctx.effectsManager && ctx.playerBird) {
                ctx.effectsManager.createCollectionBurst(ctx.playerBird.position, isGolden);
            }

            if (isGolden) {
                ctx.audioManager?.playGoldenWorm();
            } else {
                ctx.audioManager?.playWormCollect();
            }
        }
        const player = ctx.otherPlayers.get(data.playerId);
        if (player) {
            player.score = data.newScore;
            ctx.updatePlayerList();
        }
    });

    ctx.network.on('flySpawned', (fly: FlyData | null) => {
        if (fly && ctx.flyManager) {
            ctx.flyManager.addFly(fly);
        }
    });

    ctx.network.on('flyCollected', (data: { flyId: string; playerId: string; newScore: number }) => {
        ctx.flyManager?.removeFly(data.flyId);
        if (data.playerId === ctx.network?.playerId) {
            ctx.setScore(data.newScore);
            ctx.ui?.updateScore(ctx.score);
            if (ctx.playerBird) {
                ctx.playerBird.setWormCount(ctx.score);
            }

            if (ctx.progressionManager) {
                const xp = ctx.progressionManager.getXPForAction('fly');
                ctx.progressionManager.addXP(xp, 'fly');
            }

            if (ctx.effectsManager && ctx.playerBird) {
                ctx.effectsManager.createCollectionBurst(ctx.playerBird.position, false);
            }

            ctx.audioManager?.playWormCollect();
        }
        const player = ctx.otherPlayers.get(data.playerId);
        if (player) {
            player.score = data.newScore;
            ctx.updatePlayerList();
        }
    });

    ctx.network.on('locationChanged', (data: { location: string; worms: WormData[]; flies: FlyData[]; players: PlayerData[] } | null) => {
        if (!ctx.isRunning || !data) return;
        ctx.audioManager?.playLocationChange();
        ctx.changeLocation(data.location, data.worms, data.flies, data.players);
    });

    ctx.network.on('disconnected', () => {
        if (!ctx.isRunning) return;
        ctx.ui?.addChatMessage('', 'Disconnected from server...', true);
        ctx.ui?.showConnectionStatus('disconnected');
    });

    ctx.network.on('reconnecting', (data: { attempt: number; maxAttempts: number }) => {
        if (!ctx.isRunning) return;
        ctx.ui?.addChatMessage('', `Reconnecting... (attempt ${data.attempt}/${data.maxAttempts})`, true);
        ctx.ui?.showConnectionStatus('reconnecting', data);
    });

    ctx.network.on('reconnected', (data: { players?: PlayerData[]; worms?: WormData[]; flies?: FlyData[] } | null) => {
        // Check if game is still running (not cleaned up during async reconnection)
        if (!ctx.isRunning) return;

        ctx.ui?.addChatMessage('', 'Reconnected!', true);
        ctx.ui?.showConnectionStatus('connected');
        if (data && data.players) {
            ctx.otherPlayers.forEach(player => player.bird?.remove());
            ctx.otherPlayers.clear();
            data.players.forEach(player => ctx.addOtherPlayer(player));
            ctx.updatePlayerList();
        }
        if (data && data.worms && ctx.wormManager) {
            ctx.wormManager.clear();
            ctx.wormManager.addWorms(data.worms);
        }
        if (data && data.flies && ctx.flyManager) {
            ctx.flyManager.clear();
            ctx.flyManager.addFlies(data.flies);
        }
    });

    ctx.network.on('connectionFailed', (data: { reason?: string }) => {
        ctx.ui?.addChatMessage('', 'Connection failed. Please refresh the page.', true);
        ctx.ui?.showConnectionStatus('failed', data);
    });

    ctx.network.on('leaderboard', (leaderboard: unknown[]) => {
        // Transform leaderboard entries to include rank (position in array)
        const rankedLeaderboard = (leaderboard as Array<{ name: string; score: number }>).map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            score: entry.score
        }));
        ctx.ui?.updateLeaderboard(rankedLeaderboard, ctx.network?.getPlayerName() ?? '');
    });
}

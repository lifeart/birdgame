// Demo/offline network manager - simulates server locally for GitHub Pages demo
import type {
    PlayerData,
    WormData,
    FlyData,
    LeaderboardEntry,
    WelcomeData,
    NetworkEventMap,
} from './network.ts';

import {
    WORMS_PER_LOCATION,
    MIN_WORMS_BEFORE_RESPAWN,
    WORM_RESPAWN_INTERVAL_MS,
    FLIES_PER_LOCATION_MIN,
    FLIES_PER_LOCATION_MAX,
    MIN_FLIES_BEFORE_RESPAWN,
    FLY_RESPAWN_INTERVAL_MS,
    FLY_HEIGHT_MIN,
    FLY_HEIGHT_MAX,
    WORM_POINTS,
    FLY_POINTS,
    GOLDEN_WORM_POINTS,
    GOLDEN_WORM_DURATION_MS,
    WORLD_SIZE,
    SPAWN_HEIGHT,
    generateRandomName,
} from '../shared/constants.ts';

type NetworkCallback<T = unknown> = (data: T) => void;

export class DemoNetworkManager {
    public playerId: string = 'demo-player';
    public connected: boolean = false;

    private callbacks: { [K in keyof NetworkEventMap]?: NetworkCallback<NetworkEventMap[K]>[] } = {};
    private playerName: string | null = null;
    private birdType: string | null = null;
    private currentLocation: string | null = null;
    private score: number = 0;

    // Local entity state
    private worms: WormData[] = [];
    private flies: FlyData[] = [];
    private idCounter: number = 0;

    // Timers
    private wormRespawnInterval: ReturnType<typeof setInterval> | null = null;
    private flyRespawnInterval: ReturnType<typeof setInterval> | null = null;
    private goldenWormTimer: ReturnType<typeof setTimeout> | null = null;

    private nextId(): string {
        return `demo-${++this.idCounter}`;
    }

    private randomCoord(): number {
        return (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    }

    private generateWorm(isGolden: boolean = false): WormData {
        return {
            id: this.nextId(),
            x: this.randomCoord(),
            y: 1.5,
            z: this.randomCoord(),
            isGolden,
        };
    }

    private generateFly(): FlyData {
        return {
            id: this.nextId(),
            x: this.randomCoord(),
            y: FLY_HEIGHT_MIN + Math.random() * (FLY_HEIGHT_MAX - FLY_HEIGHT_MIN),
            z: this.randomCoord(),
        };
    }

    private generateInitialEntities(): { worms: WormData[]; flies: FlyData[] } {
        const worms: WormData[] = [];
        for (let i = 0; i < WORMS_PER_LOCATION; i++) {
            worms.push(this.generateWorm());
        }

        const flyCount = FLIES_PER_LOCATION_MIN +
            Math.floor(Math.random() * (FLIES_PER_LOCATION_MAX - FLIES_PER_LOCATION_MIN + 1));
        const flies: FlyData[] = [];
        for (let i = 0; i < flyCount; i++) {
            flies.push(this.generateFly());
        }

        return { worms, flies };
    }

    private startRespawnLoops(): void {
        this.stopRespawnLoops();

        // Worm respawn
        this.wormRespawnInterval = setInterval(() => {
            if (this.worms.length < MIN_WORMS_BEFORE_RESPAWN) {
                const worm = this.generateWorm();
                this.worms.push(worm);
                this.triggerCallback('wormSpawned', worm);
            }
        }, WORM_RESPAWN_INTERVAL_MS);

        // Fly respawn
        this.flyRespawnInterval = setInterval(() => {
            if (this.flies.length < MIN_FLIES_BEFORE_RESPAWN) {
                const fly = this.generateFly();
                this.flies.push(fly);
                this.triggerCallback('flySpawned', fly);
            }
        }, FLY_RESPAWN_INTERVAL_MS);

        // Golden worm - spawn every 60s in demo (shorter than 5min server interval)
        this.scheduleGoldenWorm();
    }

    private scheduleGoldenWorm(): void {
        // First golden worm after 60s, then every 60s
        this.goldenWormTimer = setTimeout(() => {
            const goldenWorm = this.generateWorm(true);
            this.worms.push(goldenWorm);
            this.triggerCallback('wormSpawned', goldenWorm);

            // Remove golden worm after duration if not collected
            setTimeout(() => {
                const idx = this.worms.findIndex(w => w.id === goldenWorm.id);
                if (idx !== -1) {
                    this.worms.splice(idx, 1);
                    // Trigger collection removal so the visual disappears
                    this.triggerCallback('wormCollected', {
                        wormId: goldenWorm.id,
                        playerId: '__expired__',
                        playerName: '',
                        newScore: this.score,
                        isGolden: true,
                    });
                }
            }, GOLDEN_WORM_DURATION_MS);

            // Schedule next golden worm
            this.scheduleGoldenWorm();
        }, 60000);
    }

    private stopRespawnLoops(): void {
        if (this.wormRespawnInterval) {
            clearInterval(this.wormRespawnInterval);
            this.wormRespawnInterval = null;
        }
        if (this.flyRespawnInterval) {
            clearInterval(this.flyRespawnInterval);
            this.flyRespawnInterval = null;
        }
        if (this.goldenWormTimer) {
            clearTimeout(this.goldenWormTimer);
            this.goldenWormTimer = null;
        }
    }

    private buildLeaderboard(): LeaderboardEntry[] {
        return [{
            id: this.playerId,
            name: this.playerName || 'Player',
            score: this.score,
        }];
    }

    connect(playerName: string, birdType: string, location: string): Promise<WelcomeData> {
        this.playerName = playerName || generateRandomName();
        this.birdType = birdType;
        this.currentLocation = location;
        this.connected = true;
        this.score = 0;

        const { worms, flies } = this.generateInitialEntities();
        this.worms = worms;
        this.flies = flies;

        this.startRespawnLoops();

        const player: PlayerData = {
            id: this.playerId,
            name: this.playerName,
            bird: birdType,
            x: 0,
            y: SPAWN_HEIGHT,
            z: 0,
            rotationY: 0,
            score: 0,
        };

        return Promise.resolve({
            playerId: this.playerId,
            player,
            worms: [...worms],
            flies: [...flies],
            players: [],
            leaderboard: this.buildLeaderboard(),
            isReturningPlayer: false,
        });
    }

    isConnected(): boolean {
        return this.connected;
    }

    isReconnecting(): boolean {
        return false;
    }

    getPlayerName(): string | null {
        return this.playerName;
    }

    getBirdType(): string | null {
        return this.birdType;
    }

    sendPosition(_x: number, _y: number, _z: number, _rotationY: number): boolean {
        return true; // No-op in demo
    }

    sendChat(message: string): boolean {
        // Echo back to self
        setTimeout(() => {
            this.triggerCallback('chatMessage', {
                playerId: this.playerId,
                name: this.playerName || 'Player',
                message,
            });
        }, 0);
        return true;
    }

    sendWormCollected(wormId: string, isGolden: boolean = false): boolean {
        const idx = this.worms.findIndex(w => w.id === wormId);
        if (idx === -1) return false;

        const worm = this.worms[idx];
        isGolden = isGolden || worm.isGolden || false;
        this.worms.splice(idx, 1);
        this.score += isGolden ? GOLDEN_WORM_POINTS : WORM_POINTS;

        this.triggerCallback('wormCollected', {
            wormId,
            playerId: this.playerId,
            playerName: this.playerName || 'Player',
            newScore: this.score,
            isGolden,
        });

        this.triggerCallback('leaderboard', this.buildLeaderboard());
        return true;
    }

    sendFlyCollected(flyId: string): boolean {
        const idx = this.flies.findIndex(f => f.id === flyId);
        if (idx === -1) return false;

        this.flies.splice(idx, 1);
        this.score += FLY_POINTS;

        this.triggerCallback('flyCollected', {
            flyId,
            playerId: this.playerId,
            playerName: this.playerName || 'Player',
            newScore: this.score,
        });

        this.triggerCallback('leaderboard', this.buildLeaderboard());
        return true;
    }

    changeLocation(location: string): boolean {
        this.currentLocation = location;
        this.stopRespawnLoops();

        const { worms, flies } = this.generateInitialEntities();
        this.worms = worms;
        this.flies = flies;

        this.startRespawnLoops();

        // Fire callback asynchronously to match real server behavior
        setTimeout(() => {
            this.triggerCallback('locationChanged', {
                location,
                worms: [...worms],
                flies: [...flies],
                players: [],
            });
        }, 0);

        return true;
    }

    send(_message: object): boolean {
        return true;
    }

    on<K extends keyof NetworkEventMap>(event: K, callback: NetworkCallback<NetworkEventMap[K]>): void {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event]!.push(callback as NetworkCallback<unknown>);
    }

    off<K extends keyof NetworkEventMap>(event: K, callback: NetworkCallback<NetworkEventMap[K]>): void {
        const callbacks = this.callbacks[event];
        if (callbacks) {
            const index = callbacks.indexOf(callback as NetworkCallback<unknown>);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    removeAllCallbacks(): void {
        this.callbacks = {};
    }

    private triggerCallback<K extends keyof NetworkEventMap>(event: K, data: NetworkEventMap[K]): void {
        if (this.callbacks[event]) {
            this.callbacks[event]!.forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in demo callback for event '${event}':`, e);
                }
            });
        }
    }

    disconnect(): void {
        this.stopRespawnLoops();
        this.connected = false;
        this.playerName = null;
    }
}

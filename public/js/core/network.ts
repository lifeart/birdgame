// WebSocket network client

// Network constants
const NETWORK_CONSTANTS = {
    CONNECTION_TIMEOUT: 10000,     // 10 seconds for WebSocket connection timeout
    MAX_RECONNECT_ATTEMPTS: 5,     // maximum reconnection attempts
    PING_INTERVAL: 30000,          // 30 seconds between ping messages
} as const;

export interface PlayerData {
    id: string;
    name: string;
    bird: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    score: number;
}

export interface WormData {
    id: string;
    x: number;
    y: number;
    z: number;
    isGolden?: boolean;
}

export interface FlyData {
    id: string;
    x: number;
    y: number;
    z: number;
}

export interface LeaderboardEntry {
    id: string;
    name: string;
    score: number;
}

export interface WelcomeData {
    playerId: string;
    player: PlayerData;
    worms: WormData[];
    flies: FlyData[];
    players: PlayerData[];
    leaderboard: LeaderboardEntry[];
    isReturningPlayer?: boolean;
}

export interface PlayerMovedData {
    playerId: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
}

export interface ChatMessageData {
    playerId: string;
    name: string;
    message: string;
}

export interface WormCollectedData {
    wormId: string;
    playerId: string;
    playerName: string;
    newScore: number;
    isGolden?: boolean;
}

export interface FlyCollectedData {
    flyId: string;
    playerId: string;
    playerName: string;
    newScore: number;
}

export interface LocationChangedData {
    location: string;
    worms: WormData[];
    flies: FlyData[];
    players: PlayerData[];
}

export interface ReconnectingData {
    attempt: number;
    maxAttempts: number;
    delay: number;
}

export interface ConnectionFailedData {
    reason: string;
}

type NetworkCallback<T = unknown> = (data: T) => void;

export type NetworkEventMap = {
    disconnected: undefined;
    reconnecting: ReconnectingData;
    reconnected: WelcomeData;
    connectionFailed: ConnectionFailedData;
    playerJoined: PlayerData;
    playerLeft: string;
    playerMoved: PlayerMovedData;
    chatMessage: ChatMessageData;
    wormSpawned: WormData;
    wormCollected: WormCollectedData;
    flySpawned: FlyData;
    flyCollected: FlyCollectedData;
    locationChanged: LocationChangedData;
    leaderboard: LeaderboardEntry[];
};

export class NetworkManager {
    private ws: WebSocket | null = null;
    private callbacks: { [K in keyof NetworkEventMap]?: NetworkCallback<NetworkEventMap[K]>[] } = {};
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private reconnecting: boolean = false;

    // Stored connection info for reconnection
    private playerName: string | null = null;
    private birdType: string | null = null;
    private currentLocation: string | null = null;

    // Promise reject function for connect errors
    private connectReject: ((error: Error) => void) | null = null;

    public playerId: string | null = null;
    public connected: boolean = false;

    // Public getters for connection info
    getPlayerName(): string | null {
        return this.playerName;
    }

    getBirdType(): string | null {
        return this.birdType;
    }

    connect(playerName: string, birdType: string, location: string): Promise<WelcomeData> {
        return new Promise((resolve, reject) => {
            this.clearReconnectTimeout();
            this.connectReject = reject;

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;

            this.ws = new WebSocket(wsUrl);

            this.connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close();
                    this.connectReject = null;
                    reject(new Error('Connection timeout'));
                }
            }, NETWORK_CONSTANTS.CONNECTION_TIMEOUT);

            this.ws.onopen = () => {
                this.connected = true;
                this.reconnectAttempts = 0;
                this.reconnecting = false;

                this.startPing();

                this.send({
                    type: 'join',
                    name: playerName,
                    bird: birdType,
                    location: location
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message, resolve);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };

            this.ws.onclose = () => {
                const wasConnected = this.connected;
                this.connected = false;
                this.clearConnectionTimeout();
                this.stopPing();

                if (wasConnected) {
                    this.triggerCallback('disconnected', undefined);
                }

                if (this.reconnectAttempts < this.maxReconnectAttempts &&
                    this.playerName && this.birdType && this.currentLocation) {
                    this.reconnecting = true;
                    this.reconnectAttempts++;
                    // Exponential backoff with jitter: base * 2^attempts + random jitter
                    const baseDelay = 1000;
                    const maxDelay = 30000;
                    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts);
                    const jitter = Math.random() * 1000;
                    const delay = Math.min(maxDelay, exponentialDelay + jitter);

                    this.triggerCallback('reconnecting', {
                        attempt: this.reconnectAttempts,
                        maxAttempts: this.maxReconnectAttempts,
                        delay: delay
                    });

                    // Store connection info in local variables to avoid race conditions
                    // if disconnect() is called during the timeout
                    const savedPlayerName = this.playerName;
                    const savedBirdType = this.birdType;
                    const savedLocation = this.currentLocation;

                    this.reconnectTimeout = setTimeout(() => {
                        // Verify the values are still valid before reconnecting
                        if (savedPlayerName && savedBirdType && savedLocation) {
                            this.connect(savedPlayerName, savedBirdType, savedLocation)
                                .then(data => {
                                    this.triggerCallback('reconnected', data);
                                })
                                .catch(err => {
                                    console.error('Reconnection failed:', err);
                                });
                        }
                    }, delay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.reconnecting = false;
                    this.triggerCallback('connectionFailed', {
                        reason: 'Max reconnection attempts reached'
                    });
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.clearConnectionTimeout();
                if (this.connectReject) {
                    this.connectReject(new Error('WebSocket connection error'));
                    this.connectReject = null;
                }
            };

            this.playerName = playerName;
            this.birdType = birdType;
            this.currentLocation = location;
        });
    }

    private validateMessage(message: unknown, requiredFields: string[]): boolean {
        if (typeof message !== 'object' || message === null) return false;
        return requiredFields.every(field => field in (message as Record<string, unknown>));
    }

    private validatePlayerMoved(message: Record<string, unknown>): boolean {
        if (!this.validateMessage(message, ['playerId', 'x', 'y', 'z', 'rotationY'])) return false;

        const isValidCoord = (n: unknown): n is number =>
            typeof n === 'number' && isFinite(n) && n >= -500 && n <= 500;
        const isValidRotation = (n: unknown): n is number =>
            typeof n === 'number' && isFinite(n);

        return typeof message.playerId === 'string' &&
               isValidCoord(message.x) &&
               isValidCoord(message.y) &&
               isValidCoord(message.z) &&
               isValidRotation(message.rotationY);
    }

    private validateWormCollected(message: Record<string, unknown>): boolean {
        if (!this.validateMessage(message, ['wormId', 'playerId', 'newScore'])) return false;
        return (typeof message.wormId === 'string' || typeof message.wormId === 'number') &&
               (typeof message.playerId === 'string' || typeof message.playerId === 'number') &&
               typeof message.newScore === 'number' && !isNaN(message.newScore);
    }

    private validateFlyCollected(message: Record<string, unknown>): boolean {
        if (!this.validateMessage(message, ['flyId', 'playerId', 'newScore'])) return false;
        return (typeof message.flyId === 'string' || typeof message.flyId === 'number') &&
               (typeof message.playerId === 'string' || typeof message.playerId === 'number') &&
               typeof message.newScore === 'number' && !isNaN(message.newScore);
    }

    private validateLocationChanged(message: Record<string, unknown>): boolean {
        if (!this.validateMessage(message, ['location', 'worms', 'flies', 'players'])) return false;
        return typeof message.location === 'string' &&
               Array.isArray(message.worms) &&
               Array.isArray(message.flies) &&
               Array.isArray(message.players);
    }

    private handleMessage(message: { type: string; [key: string]: unknown }, resolveConnect?: (data: WelcomeData) => void): void {
        this.clearConnectionTimeout();

        switch (message.type) {
            case 'welcome':
                if (!this.validateMessage(message, ['playerId', 'player', 'worms', 'flies', 'players', 'leaderboard'])) {
                    console.error('Invalid welcome message format');
                    break;
                }
                this.playerId = message.playerId as string;
                this.connectReject = null;  // Clear reject on successful connection
                if (resolveConnect) {
                    resolveConnect({
                        playerId: message.playerId as string,
                        player: message.player as PlayerData,
                        worms: message.worms as WormData[],
                        flies: message.flies as FlyData[],
                        players: message.players as PlayerData[],
                        leaderboard: message.leaderboard as LeaderboardEntry[],
                        isReturningPlayer: message.isReturningPlayer as boolean | undefined
                    });
                }
                break;

            case 'pong':
                break;

            case 'player_joined':
                this.triggerCallback('playerJoined', message.player as PlayerData);
                break;

            case 'player_left':
                this.triggerCallback('playerLeft', message.playerId as string);
                break;

            case 'player_moved':
                if (!this.validatePlayerMoved(message)) {
                    console.error('Invalid player_moved message format');
                    break;
                }
                this.triggerCallback('playerMoved', {
                    playerId: message.playerId as string,
                    x: message.x as number,
                    y: message.y as number,
                    z: message.z as number,
                    rotationY: message.rotationY as number
                });
                break;

            case 'chat':
                this.triggerCallback('chatMessage', {
                    playerId: message.playerId as string,
                    name: message.name as string,
                    message: message.message as string
                });
                break;

            case 'worm_spawned':
                this.triggerCallback('wormSpawned', message.worm as WormData);
                break;

            case 'worm_collected':
                if (!this.validateWormCollected(message)) {
                    console.error('Invalid worm_collected message format', message);
                    break;
                }
                this.triggerCallback('wormCollected', {
                    wormId: message.wormId as string,
                    playerId: message.playerId as string,
                    playerName: message.playerName as string,
                    newScore: message.newScore as number,
                    isGolden: (message.isGolden as boolean | undefined) || false
                });
                break;

            case 'fly_spawned':
                this.triggerCallback('flySpawned', message.fly as FlyData);
                break;

            case 'fly_collected':
                if (!this.validateFlyCollected(message)) {
                    console.error('Invalid fly_collected message format', message);
                    break;
                }
                this.triggerCallback('flyCollected', {
                    flyId: message.flyId as string,
                    playerId: message.playerId as string,
                    playerName: message.playerName as string,
                    newScore: message.newScore as number
                });
                break;

            case 'location_changed':
                if (!this.validateLocationChanged(message)) {
                    console.error('Invalid location_changed message format');
                    break;
                }
                this.currentLocation = message.location as string;
                this.triggerCallback('locationChanged', {
                    location: message.location as string,
                    worms: message.worms as WormData[],
                    flies: message.flies as FlyData[],
                    players: message.players as PlayerData[]
                });
                break;

            case 'leaderboard':
                this.triggerCallback('leaderboard', message.leaderboard as LeaderboardEntry[]);
                break;
        }
    }

    send(message: object): boolean {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    isConnected(): boolean {
        return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    isReconnecting(): boolean {
        return this.reconnecting;
    }

    sendPosition(x: number, y: number, z: number, rotationY: number): boolean {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'position',
            x: x,
            y: y,
            z: z,
            rotationY: rotationY
        });
    }

    sendChat(message: string): boolean {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'chat',
            message: message
        });
    }

    sendWormCollected(wormId: string, isGolden: boolean = false): boolean {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'worm_collected',
            wormId: wormId,
            isGolden: isGolden
        });
    }

    sendFlyCollected(flyId: string): boolean {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'fly_collected',
            flyId: flyId
        });
    }

    changeLocation(location: string): boolean {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'change_location',
            location: location
        });
    }

    private startPing(): void {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'ping' });
            }
        }, NETWORK_CONSTANTS.PING_INTERVAL);
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    private clearConnectionTimeout(): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
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
                    console.error(`Error in callback for event '${event}':`, e);
                }
            });
        }
    }

    disconnect(): void {
        this.clearReconnectTimeout();
        this.clearConnectionTimeout();
        this.stopPing();
        this.reconnecting = false;
        this.playerName = null;

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

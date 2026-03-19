// WebRTC P2P multiplayer network manager using PeerJS
import Peer, { type DataConnection } from 'peerjs';
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

// Room code: 6-char alphanumeric
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Prefix for PeerJS IDs to avoid collisions
const PEER_PREFIX = 'birdgame-';

interface PeerPlayer {
    id: string;
    name: string;
    bird: string;
    location: string;
    score: number;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    conn: DataConnection;
}

// Message types over the data channel (same as WebSocket protocol)
interface P2PMessage {
    type: string;
    [key: string]: unknown;
}

export class WebRTCNetworkManager {
    public playerId: string = '';
    public connected: boolean = false;

    private callbacks: { [K in keyof NetworkEventMap]?: NetworkCallback<NetworkEventMap[K]>[] } = {};
    private playerName: string | null = null;
    private birdType: string | null = null;
    private currentLocation: string | null = null;
    private score: number = 0;

    private peer: Peer | null = null;
    private isHost: boolean = false;
    private roomCode: string | null = null;

    // Host state
    private peers: Map<string, PeerPlayer> = new Map();
    private worms: WormData[] = [];
    private flies: FlyData[] = [];
    private idCounter: number = 0;
    private wormRespawnInterval: ReturnType<typeof setInterval> | null = null;
    private flyRespawnInterval: ReturnType<typeof setInterval> | null = null;
    private goldenWormTimer: ReturnType<typeof setTimeout> | null = null;

    // Client state
    private hostConn: DataConnection | null = null;

    // --- Entity generation (host only) ---

    private nextId(): string {
        return `p2p-${++this.idCounter}`;
    }

    private randomCoord(): number {
        return (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    }

    private generateWorm(isGolden: boolean = false): WormData {
        return { id: this.nextId(), x: this.randomCoord(), y: 1.5, z: this.randomCoord(), isGolden };
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
        for (let i = 0; i < WORMS_PER_LOCATION; i++) worms.push(this.generateWorm());
        const flyCount = FLIES_PER_LOCATION_MIN +
            Math.floor(Math.random() * (FLIES_PER_LOCATION_MAX - FLIES_PER_LOCATION_MIN + 1));
        const flies: FlyData[] = [];
        for (let i = 0; i < flyCount; i++) flies.push(this.generateFly());
        return { worms, flies };
    }

    private startRespawnLoops(): void {
        this.stopRespawnLoops();
        this.wormRespawnInterval = setInterval(() => {
            if (this.worms.length < MIN_WORMS_BEFORE_RESPAWN) {
                const worm = this.generateWorm();
                this.worms.push(worm);
                this.triggerCallback('wormSpawned', worm);
                this.broadcastToAll({ type: 'worm_spawned', worm });
            }
        }, WORM_RESPAWN_INTERVAL_MS);

        this.flyRespawnInterval = setInterval(() => {
            if (this.flies.length < MIN_FLIES_BEFORE_RESPAWN) {
                const fly = this.generateFly();
                this.flies.push(fly);
                this.triggerCallback('flySpawned', fly);
                this.broadcastToAll({ type: 'fly_spawned', fly });
            }
        }, FLY_RESPAWN_INTERVAL_MS);

        this.scheduleGoldenWorm();
    }

    private scheduleGoldenWorm(): void {
        this.goldenWormTimer = setTimeout(() => {
            const goldenWorm = this.generateWorm(true);
            this.worms.push(goldenWorm);
            this.triggerCallback('wormSpawned', goldenWorm);
            this.broadcastToAll({ type: 'worm_spawned', worm: goldenWorm });

            setTimeout(() => {
                const idx = this.worms.findIndex(w => w.id === goldenWorm.id);
                if (idx !== -1) {
                    this.worms.splice(idx, 1);
                    const data = {
                        wormId: goldenWorm.id, playerId: '__expired__',
                        playerName: '', newScore: this.score, isGolden: true,
                    };
                    this.triggerCallback('wormCollected', data);
                    this.broadcastToAll({ type: 'worm_collected', ...data });
                }
            }, GOLDEN_WORM_DURATION_MS);

            this.scheduleGoldenWorm();
        }, 60000);
    }

    private stopRespawnLoops(): void {
        if (this.wormRespawnInterval) { clearInterval(this.wormRespawnInterval); this.wormRespawnInterval = null; }
        if (this.flyRespawnInterval) { clearInterval(this.flyRespawnInterval); this.flyRespawnInterval = null; }
        if (this.goldenWormTimer) { clearTimeout(this.goldenWormTimer); this.goldenWormTimer = null; }
    }

    // --- Leaderboard ---

    private buildLeaderboard(): LeaderboardEntry[] {
        const entries: LeaderboardEntry[] = [{
            id: this.playerId,
            name: this.playerName || 'Player',
            score: this.score,
        }];
        this.peers.forEach(p => {
            entries.push({ id: p.id, name: p.name, score: p.score });
        });
        entries.sort((a, b) => b.score - a.score);
        return entries.slice(0, 10);
    }

    // --- Broadcast helpers (host only) ---

    private broadcastToAll(msg: P2PMessage): void {
        const data = JSON.stringify(msg);
        this.peers.forEach(p => {
            if (p.conn.open) p.conn.send(data);
        });
    }

    private broadcastToOthers(excludeId: string, msg: P2PMessage): void {
        const data = JSON.stringify(msg);
        this.peers.forEach(p => {
            if (p.id !== excludeId && p.conn.open) p.conn.send(data);
        });
    }

    private sendTo(conn: DataConnection, msg: P2PMessage): void {
        if (conn.open) conn.send(JSON.stringify(msg));
    }

    // --- PeerJS initialization ---

    private createPeer(): Promise<Peer> {
        return new Promise((resolve, reject) => {
            const peerId = PEER_PREFIX + (this.isHost ? this.roomCode : generateRoomCode() + '-' + Math.random().toString(36).slice(2, 6));
            const peer = new Peer(peerId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ]
                }
            });

            const timeout = setTimeout(() => {
                reject(new Error('PeerJS connection timeout'));
            }, 15000);

            peer.on('open', () => {
                clearTimeout(timeout);
                resolve(peer);
            });

            peer.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    // --- Host: handle incoming peer connection ---

    private setupHostConnectionHandler(): void {
        if (!this.peer) return;

        this.peer.on('connection', (conn) => {
            conn.on('open', () => {
                // Wait for join message
            });

            conn.on('data', (raw) => {
                const msg: P2PMessage = typeof raw === 'string' ? JSON.parse(raw) : raw as P2PMessage;
                this.handleHostMessage(msg, conn);
            });

            conn.on('close', () => {
                this.handlePeerDisconnect(conn);
            });

            conn.on('error', () => {
                this.handlePeerDisconnect(conn);
            });
        });
    }

    private handleHostMessage(msg: P2PMessage, conn: DataConnection): void {
        switch (msg.type) {
            case 'join': {
                const peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                const peerPlayer: PeerPlayer = {
                    id: peerId,
                    name: (msg.name as string) || generateRandomName(),
                    bird: msg.bird as string,
                    location: msg.location as string,
                    score: 0,
                    x: 0, y: SPAWN_HEIGHT, z: 0, rotationY: 0,
                    conn,
                };
                this.peers.set(peerId, peerPlayer);

                // Build player list for welcome (other connected peers + host)
                const otherPlayers: PlayerData[] = [{
                    id: this.playerId,
                    name: this.playerName || 'Host',
                    bird: this.birdType || 'sparrow',
                    x: 0, y: SPAWN_HEIGHT, z: 0, rotationY: 0,
                    score: this.score,
                }];
                this.peers.forEach(p => {
                    if (p.id !== peerId) {
                        otherPlayers.push({
                            id: p.id, name: p.name, bird: p.bird,
                            x: p.x, y: p.y, z: p.z, rotationY: p.rotationY,
                            score: p.score,
                        });
                    }
                });

                // Send welcome to the new peer
                this.sendTo(conn, {
                    type: 'welcome',
                    playerId: peerId,
                    player: {
                        id: peerId, name: peerPlayer.name, bird: peerPlayer.bird,
                        x: 0, y: SPAWN_HEIGHT, z: 0, rotationY: 0, score: 0,
                    },
                    worms: [...this.worms],
                    flies: [...this.flies],
                    players: otherPlayers,
                    leaderboard: this.buildLeaderboard(),
                });

                // Notify host locally
                const playerData: PlayerData = {
                    id: peerId, name: peerPlayer.name, bird: peerPlayer.bird,
                    x: 0, y: SPAWN_HEIGHT, z: 0, rotationY: 0, score: 0,
                };
                this.triggerCallback('playerJoined', playerData);

                // Notify other peers
                this.broadcastToOthers(peerId, { type: 'player_joined', player: playerData });

                // Update leaderboard
                const lb = this.buildLeaderboard();
                this.triggerCallback('leaderboard', lb);
                this.broadcastToAll({ type: 'leaderboard', leaderboard: lb });
                break;
            }

            case 'position': {
                const peer = this.findPeerByConn(conn);
                if (!peer) return;
                peer.x = msg.x as number;
                peer.y = msg.y as number;
                peer.z = msg.z as number;
                peer.rotationY = msg.rotationY as number;

                // Forward to host's local callbacks
                this.triggerCallback('playerMoved', {
                    playerId: peer.id,
                    x: peer.x, y: peer.y, z: peer.z, rotationY: peer.rotationY,
                });

                // Forward to other peers
                this.broadcastToOthers(peer.id, {
                    type: 'player_moved',
                    playerId: peer.id,
                    x: peer.x, y: peer.y, z: peer.z, rotationY: peer.rotationY,
                });
                break;
            }

            case 'worm_collected': {
                const peer = this.findPeerByConn(conn);
                if (!peer) return;
                const wormId = msg.wormId as string;
                const idx = this.worms.findIndex(w => w.id === wormId);
                if (idx === -1) return; // Already collected

                const worm = this.worms[idx];
                const isGolden = (msg.isGolden as boolean) || worm.isGolden || false;
                this.worms.splice(idx, 1);
                peer.score += isGolden ? GOLDEN_WORM_POINTS : WORM_POINTS;

                const data = {
                    wormId, playerId: peer.id, playerName: peer.name,
                    newScore: peer.score, isGolden,
                };
                this.triggerCallback('wormCollected', data);
                this.broadcastToAll({ type: 'worm_collected', ...data });

                const lb = this.buildLeaderboard();
                this.triggerCallback('leaderboard', lb);
                this.broadcastToAll({ type: 'leaderboard', leaderboard: lb });
                break;
            }

            case 'fly_collected': {
                const peer = this.findPeerByConn(conn);
                if (!peer) return;
                const flyId = msg.flyId as string;
                const idx = this.flies.findIndex(f => f.id === flyId);
                if (idx === -1) return;

                this.flies.splice(idx, 1);
                peer.score += FLY_POINTS;

                const data = {
                    flyId, playerId: peer.id, playerName: peer.name,
                    newScore: peer.score,
                };
                this.triggerCallback('flyCollected', data);
                this.broadcastToAll({ type: 'fly_collected', ...data });

                const lb = this.buildLeaderboard();
                this.triggerCallback('leaderboard', lb);
                this.broadcastToAll({ type: 'leaderboard', leaderboard: lb });
                break;
            }

            case 'chat': {
                const peer = this.findPeerByConn(conn);
                if (!peer) return;
                const chatData = { playerId: peer.id, name: peer.name, message: msg.message as string };
                this.triggerCallback('chatMessage', chatData);
                this.broadcastToOthers(peer.id, { type: 'chat', ...chatData });
                break;
            }

            case 'change_location': {
                const peer = this.findPeerByConn(conn);
                if (!peer) return;
                peer.location = msg.location as string;
                // For simplicity in P2P, we keep everyone in the same entity pool
                // Send them the current entities
                this.sendTo(conn, {
                    type: 'location_changed',
                    location: peer.location,
                    worms: [...this.worms],
                    flies: [...this.flies],
                    players: [],
                });
                break;
            }
        }
    }

    private findPeerByConn(conn: DataConnection): PeerPlayer | undefined {
        for (const [, peer] of this.peers) {
            if (peer.conn === conn) return peer;
        }
        return undefined;
    }

    private handlePeerDisconnect(conn: DataConnection): void {
        const peer = this.findPeerByConn(conn);
        if (!peer) return;

        this.peers.delete(peer.id);
        this.triggerCallback('playerLeft', peer.id);
        this.broadcastToAll({ type: 'player_left', playerId: peer.id });

        const lb = this.buildLeaderboard();
        this.triggerCallback('leaderboard', lb);
        this.broadcastToAll({ type: 'leaderboard', leaderboard: lb });
    }

    // --- Client: handle messages from host ---

    private handleClientMessage(msg: P2PMessage): void {
        switch (msg.type) {
            case 'player_joined':
                this.triggerCallback('playerJoined', msg.player as PlayerData);
                break;
            case 'player_left':
                this.triggerCallback('playerLeft', msg.playerId as string);
                break;
            case 'player_moved':
                this.triggerCallback('playerMoved', {
                    playerId: msg.playerId as string,
                    x: msg.x as number, y: msg.y as number,
                    z: msg.z as number, rotationY: msg.rotationY as number,
                });
                break;
            case 'chat':
                this.triggerCallback('chatMessage', {
                    playerId: msg.playerId as string,
                    name: msg.name as string,
                    message: msg.message as string,
                });
                break;
            case 'worm_spawned':
                this.triggerCallback('wormSpawned', msg.worm as WormData);
                break;
            case 'worm_collected':
                this.triggerCallback('wormCollected', {
                    wormId: msg.wormId as string,
                    playerId: msg.playerId as string,
                    playerName: msg.playerName as string,
                    newScore: msg.newScore as number,
                    isGolden: (msg.isGolden as boolean) || false,
                });
                break;
            case 'fly_spawned':
                this.triggerCallback('flySpawned', msg.fly as FlyData);
                break;
            case 'fly_collected':
                this.triggerCallback('flyCollected', {
                    flyId: msg.flyId as string,
                    playerId: msg.playerId as string,
                    playerName: msg.playerName as string,
                    newScore: msg.newScore as number,
                });
                break;
            case 'location_changed':
                this.triggerCallback('locationChanged', {
                    location: msg.location as string,
                    worms: msg.worms as WormData[],
                    flies: msg.flies as FlyData[],
                    players: msg.players as PlayerData[],
                });
                break;
            case 'leaderboard':
                this.triggerCallback('leaderboard', msg.leaderboard as LeaderboardEntry[]);
                break;
        }
    }

    // --- Public API: Room management ---

    getRoomCode(): string | null {
        return this.roomCode;
    }

    async createRoom(playerName: string, birdType: string, location: string): Promise<WelcomeData> {
        this.isHost = true;
        this.roomCode = generateRoomCode();
        this.playerName = playerName || generateRandomName();
        this.birdType = birdType;
        this.currentLocation = location;
        this.playerId = 'host';
        this.score = 0;

        this.peer = await this.createPeer();
        this.setupHostConnectionHandler();
        this.connected = true;

        const { worms, flies } = this.generateInitialEntities();
        this.worms = worms;
        this.flies = flies;
        this.startRespawnLoops();

        const player: PlayerData = {
            id: this.playerId, name: this.playerName, bird: birdType,
            x: 0, y: SPAWN_HEIGHT, z: 0, rotationY: 0, score: 0,
        };

        return {
            playerId: this.playerId,
            player,
            worms: [...worms],
            flies: [...flies],
            players: [],
            leaderboard: this.buildLeaderboard(),
            isReturningPlayer: false,
        };
    }

    async joinRoom(roomCode: string, playerName: string, birdType: string, _location: string): Promise<WelcomeData> {
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase();
        this.playerName = playerName || generateRandomName();
        this.birdType = birdType;

        this.peer = await this.createPeer();

        return new Promise<WelcomeData>((resolve, reject) => {
            const hostPeerId = PEER_PREFIX + this.roomCode;
            const conn = this.peer!.connect(hostPeerId, { reliable: true });
            this.hostConn = conn;

            const timeout = setTimeout(() => {
                reject(new Error('Connection to room timed out'));
            }, 15000);

            conn.on('open', () => {
                // Send join message
                this.sendTo(conn, {
                    type: 'join',
                    name: this.playerName!,
                    bird: this.birdType!,
                    location: this.currentLocation || 'city',
                });
            });

            const initialHandler = (raw: unknown) => {
                const msg: P2PMessage = typeof raw === 'string' ? JSON.parse(raw) : raw as P2PMessage;

                if (msg.type === 'welcome') {
                    clearTimeout(timeout);
                    this.playerId = msg.playerId as string;
                    this.connected = true;
                    this.currentLocation = (msg.player as PlayerData).bird ? this.currentLocation : 'city';

                    const welcomeData: WelcomeData = {
                        playerId: msg.playerId as string,
                        player: msg.player as PlayerData,
                        worms: msg.worms as WormData[],
                        flies: msg.flies as FlyData[],
                        players: msg.players as PlayerData[],
                        leaderboard: msg.leaderboard as LeaderboardEntry[],
                    };
                    resolve(welcomeData);

                    // Now handle subsequent messages normally
                    conn.off('data', initialHandler);
                    conn.on('data', (raw2: unknown) => {
                        const msg2: P2PMessage = typeof raw2 === 'string' ? JSON.parse(raw2) : raw2 as P2PMessage;
                        this.handleClientMessage(msg2);
                    });
                }
            };
            conn.on('data', initialHandler);

            conn.on('close', () => {
                clearTimeout(timeout);
                this.connected = false;
                this.triggerCallback('disconnected', undefined);
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    // Standard connect - used by startGame. For WebRTC, createRoom/joinRoom should be called instead.
    // This is a fallback that creates a solo room.
    connect(playerName: string, birdType: string, location: string): Promise<WelcomeData> {
        return this.createRoom(playerName, birdType, location);
    }

    // --- Public API: game actions ---

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

    sendPosition(x: number, y: number, z: number, rotationY: number): boolean {
        if (!this.connected) return false;

        if (this.isHost) {
            // Host broadcasts own position to all peers
            this.broadcastToAll({
                type: 'player_moved',
                playerId: this.playerId,
                x, y, z, rotationY,
            });
        } else if (this.hostConn?.open) {
            this.sendTo(this.hostConn, { type: 'position', x, y, z, rotationY });
        }
        return true;
    }

    sendChat(message: string): boolean {
        if (!this.connected) return false;

        if (this.isHost) {
            const chatData = { playerId: this.playerId, name: this.playerName || 'Host', message };
            this.triggerCallback('chatMessage', chatData);
            this.broadcastToAll({ type: 'chat', ...chatData });
        } else if (this.hostConn?.open) {
            this.sendTo(this.hostConn, { type: 'chat', message });
        }
        return true;
    }

    sendWormCollected(wormId: string, isGolden: boolean = false): boolean {
        if (!this.connected) return false;

        if (this.isHost) {
            const idx = this.worms.findIndex(w => w.id === wormId);
            if (idx === -1) return false;

            const worm = this.worms[idx];
            isGolden = isGolden || worm.isGolden || false;
            this.worms.splice(idx, 1);
            this.score += isGolden ? GOLDEN_WORM_POINTS : WORM_POINTS;

            const data = {
                wormId, playerId: this.playerId,
                playerName: this.playerName || 'Host',
                newScore: this.score, isGolden,
            };
            this.triggerCallback('wormCollected', data);
            this.broadcastToAll({ type: 'worm_collected', ...data });

            const lb = this.buildLeaderboard();
            this.triggerCallback('leaderboard', lb);
            this.broadcastToAll({ type: 'leaderboard', leaderboard: lb });
        } else if (this.hostConn?.open) {
            this.sendTo(this.hostConn, { type: 'worm_collected', wormId, isGolden });
        }
        return true;
    }

    sendFlyCollected(flyId: string): boolean {
        if (!this.connected) return false;

        if (this.isHost) {
            const idx = this.flies.findIndex(f => f.id === flyId);
            if (idx === -1) return false;

            this.flies.splice(idx, 1);
            this.score += FLY_POINTS;

            const data = {
                flyId, playerId: this.playerId,
                playerName: this.playerName || 'Host',
                newScore: this.score,
            };
            this.triggerCallback('flyCollected', data);
            this.broadcastToAll({ type: 'fly_collected', ...data });

            const lb = this.buildLeaderboard();
            this.triggerCallback('leaderboard', lb);
            this.broadcastToAll({ type: 'leaderboard', leaderboard: lb });
        } else if (this.hostConn?.open) {
            this.sendTo(this.hostConn, { type: 'fly_collected', flyId });
        }
        return true;
    }

    changeLocation(location: string): boolean {
        if (!this.connected) return false;
        this.currentLocation = location;

        if (this.isHost) {
            this.stopRespawnLoops();
            const { worms, flies } = this.generateInitialEntities();
            this.worms = worms;
            this.flies = flies;
            this.startRespawnLoops();

            setTimeout(() => {
                this.triggerCallback('locationChanged', {
                    location, worms: [...worms], flies: [...flies], players: [],
                });
            }, 0);

            // Notify peers about new entities
            this.broadcastToAll({
                type: 'location_changed',
                location,
                worms: [...worms],
                flies: [...flies],
                players: [],
            });
        } else if (this.hostConn?.open) {
            this.sendTo(this.hostConn, { type: 'change_location', location });
        }
        return true;
    }

    send(_message: object): boolean {
        return true;
    }

    // --- Event system ---

    on<K extends keyof NetworkEventMap>(event: K, callback: NetworkCallback<NetworkEventMap[K]>): void {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event]!.push(callback as NetworkCallback<unknown>);
    }

    off<K extends keyof NetworkEventMap>(event: K, callback: NetworkCallback<NetworkEventMap[K]>): void {
        const cbs = this.callbacks[event];
        if (cbs) {
            const idx = cbs.indexOf(callback as NetworkCallback<unknown>);
            if (idx !== -1) cbs.splice(idx, 1);
        }
    }

    removeAllCallbacks(): void {
        this.callbacks = {};
    }

    private triggerCallback<K extends keyof NetworkEventMap>(event: K, data: NetworkEventMap[K]): void {
        if (this.callbacks[event]) {
            this.callbacks[event]!.forEach(cb => {
                try { cb(data); } catch (e) { console.error(`WebRTC callback error '${event}':`, e); }
            });
        }
    }

    disconnect(): void {
        this.stopRespawnLoops();
        this.connected = false;
        this.playerName = null;

        this.peers.forEach(p => {
            if (p.conn.open) p.conn.close();
        });
        this.peers.clear();

        if (this.hostConn?.open) this.hostConn.close();
        this.hostConn = null;

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }
}

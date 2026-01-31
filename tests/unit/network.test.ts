import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NetworkManager } from '../../public/js/core/network';

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: ((error: Event) => void) | null = null;

    sentMessages: object[] = [];

    constructor(public url: string) {
        // Simulate async connection
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) this.onopen();
        }, 10);
    }

    send(data: string) {
        this.sentMessages.push(JSON.parse(data));
    }

    close() {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }

    // Test helper to simulate receiving a message
    simulateMessage(data: object) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }
}

describe('NetworkManager', () => {
    let manager: NetworkManager;
    let originalWebSocket: typeof WebSocket;

    beforeEach(() => {
        vi.useFakeTimers();
        manager = new NetworkManager();

        // Mock WebSocket globally
        originalWebSocket = (globalThis as any).WebSocket;
        (globalThis as any).WebSocket = MockWebSocket;

        // Mock window.location
        Object.defineProperty(globalThis, 'location', {
            value: {
                protocol: 'http:',
                host: 'localhost:3000'
            },
            writable: true
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        (globalThis as any).WebSocket = originalWebSocket;
        manager.disconnect();
    });

    describe('initialization', () => {
        it('starts disconnected', () => {
            expect(manager.connected).toBe(false);
            expect(manager.playerId).toBeNull();
        });

        it('isConnected returns false initially', () => {
            expect(manager.isConnected()).toBe(false);
        });

        it('isReconnecting returns false initially', () => {
            expect(manager.isReconnecting()).toBe(false);
        });
    });

    describe('connect', () => {
        it('creates WebSocket connection', async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');

            // Advance timers to allow connection
            await vi.advanceTimersByTimeAsync(20);

            // Get the mock WebSocket
            const ws = (manager as any).ws as MockWebSocket;

            // Simulate welcome message
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: { id: '123', name: 'TestPlayer', bird: 'sparrow', x: 0, y: 0, z: 0, rotationY: 0, score: 0 },
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            const result = await connectPromise;

            expect(result.playerId).toBe('123');
            expect(manager.connected).toBe(true);
        });

        it('sends join message after connection', async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');

            await vi.advanceTimersByTimeAsync(20);

            const ws = (manager as any).ws as MockWebSocket;

            expect(ws.sentMessages).toContainEqual({
                type: 'join',
                name: 'TestPlayer',
                bird: 'sparrow',
                location: 'city'
            });

            // Complete the promise
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;
        });

        it('stores player info for reconnection', async () => {
            const connectPromise = manager.connect('TestPlayer', 'crow', 'beach');

            await vi.advanceTimersByTimeAsync(20);

            expect(manager.getPlayerName()).toBe('TestPlayer');
            expect(manager.getBirdType()).toBe('crow');

            const ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;
        });
    });

    describe('send methods', () => {
        let ws: MockWebSocket;

        beforeEach(async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;
            ws.sentMessages = []; // Clear join message
        });

        it('sendPosition sends position message', () => {
            manager.sendPosition(10, 20, 30, 1.5);

            expect(ws.sentMessages).toContainEqual({
                type: 'position',
                x: 10,
                y: 20,
                z: 30,
                rotationY: 1.5
            });
        });

        it('sendChat sends chat message', () => {
            manager.sendChat('Hello world!');

            expect(ws.sentMessages).toContainEqual({
                type: 'chat',
                message: 'Hello world!'
            });
        });

        it('sendWormCollected sends worm_collected message', () => {
            manager.sendWormCollected('worm_1', false);

            expect(ws.sentMessages).toContainEqual({
                type: 'worm_collected',
                wormId: 'worm_1',
                isGolden: false
            });
        });

        it('sendWormCollected sends golden flag', () => {
            manager.sendWormCollected('golden_1', true);

            expect(ws.sentMessages).toContainEqual({
                type: 'worm_collected',
                wormId: 'golden_1',
                isGolden: true
            });
        });

        it('sendFlyCollected sends fly_collected message', () => {
            manager.sendFlyCollected('fly_1');

            expect(ws.sentMessages).toContainEqual({
                type: 'fly_collected',
                flyId: 'fly_1'
            });
        });

        it('changeLocation sends change_location message', () => {
            manager.changeLocation('beach');

            expect(ws.sentMessages).toContainEqual({
                type: 'change_location',
                location: 'beach'
            });
        });

        it('returns false when not connected', () => {
            manager.disconnect();

            expect(manager.sendPosition(0, 0, 0, 0)).toBe(false);
            expect(manager.sendChat('test')).toBe(false);
            expect(manager.sendWormCollected('1', false)).toBe(false);
            expect(manager.sendFlyCollected('1')).toBe(false);
            expect(manager.changeLocation('city')).toBe(false);
        });
    });

    describe('event callbacks', () => {
        let ws: MockWebSocket;

        beforeEach(async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;
        });

        it('triggers playerJoined callback', () => {
            const callback = vi.fn();
            manager.on('playerJoined', callback);

            ws.simulateMessage({
                type: 'player_joined',
                player: { id: '456', name: 'OtherPlayer', bird: 'crow' }
            });

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ id: '456', name: 'OtherPlayer' })
            );
        });

        it('triggers playerLeft callback', () => {
            const callback = vi.fn();
            manager.on('playerLeft', callback);

            ws.simulateMessage({
                type: 'player_left',
                playerId: '456'
            });

            expect(callback).toHaveBeenCalledWith('456');
        });

        it('triggers playerMoved callback', () => {
            const callback = vi.fn();
            manager.on('playerMoved', callback);

            ws.simulateMessage({
                type: 'player_moved',
                playerId: '456',
                x: 10,
                y: 20,
                z: 30,
                rotationY: 1.5
            });

            expect(callback).toHaveBeenCalledWith({
                playerId: '456',
                x: 10,
                y: 20,
                z: 30,
                rotationY: 1.5
            });
        });

        it('triggers chatMessage callback', () => {
            const callback = vi.fn();
            manager.on('chatMessage', callback);

            ws.simulateMessage({
                type: 'chat',
                playerId: '456',
                name: 'OtherPlayer',
                message: 'Hello!'
            });

            expect(callback).toHaveBeenCalledWith({
                playerId: '456',
                name: 'OtherPlayer',
                message: 'Hello!'
            });
        });

        it('triggers wormSpawned callback', () => {
            const callback = vi.fn();
            manager.on('wormSpawned', callback);

            ws.simulateMessage({
                type: 'worm_spawned',
                worm: { id: 'w1', x: 0, y: 1.5, z: 0 }
            });

            expect(callback).toHaveBeenCalledWith({ id: 'w1', x: 0, y: 1.5, z: 0 });
        });

        it('triggers wormCollected callback', () => {
            const callback = vi.fn();
            manager.on('wormCollected', callback);

            ws.simulateMessage({
                type: 'worm_collected',
                wormId: 'w1',
                playerId: '456',
                playerName: 'OtherPlayer',
                newScore: 10,
                isGolden: false
            });

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                wormId: 'w1',
                playerId: '456',
                newScore: 10
            }));
        });

        it('triggers flySpawned callback', () => {
            const callback = vi.fn();
            manager.on('flySpawned', callback);

            ws.simulateMessage({
                type: 'fly_spawned',
                fly: { id: 'f1', x: 0, y: 15, z: 0 }
            });

            expect(callback).toHaveBeenCalledWith({ id: 'f1', x: 0, y: 15, z: 0 });
        });

        it('triggers leaderboard callback', () => {
            const callback = vi.fn();
            manager.on('leaderboard', callback);

            ws.simulateMessage({
                type: 'leaderboard',
                leaderboard: [{ id: '1', name: 'Top', score: 100 }]
            });

            expect(callback).toHaveBeenCalledWith([{ id: '1', name: 'Top', score: 100 }]);
        });

        it('triggers locationChanged callback', () => {
            const callback = vi.fn();
            manager.on('locationChanged', callback);

            ws.simulateMessage({
                type: 'location_changed',
                location: 'beach',
                worms: [],
                flies: [],
                players: []
            });

            expect(callback).toHaveBeenCalledWith({
                location: 'beach',
                worms: [],
                flies: [],
                players: []
            });
        });
    });

    describe('off (remove callback)', () => {
        it('removes callback', async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            const ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;

            const callback = vi.fn();
            manager.on('playerJoined', callback);
            manager.off('playerJoined', callback);

            ws.simulateMessage({
                type: 'player_joined',
                player: { id: '456' }
            });

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('removeAllCallbacks', () => {
        it('removes all callbacks', async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            const ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;

            const callback1 = vi.fn();
            const callback2 = vi.fn();
            manager.on('playerJoined', callback1);
            manager.on('playerLeft', callback2);

            manager.removeAllCallbacks();

            ws.simulateMessage({ type: 'player_joined', player: { id: '456' } });
            ws.simulateMessage({ type: 'player_left', playerId: '456' });

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });
    });

    describe('disconnect', () => {
        it('closes WebSocket connection', async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            const ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;

            manager.disconnect();

            expect(manager.connected).toBe(false);
            expect(ws.readyState).toBe(MockWebSocket.CLOSED);
        });

        it('clears player name', async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            const ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;

            manager.disconnect();

            expect(manager.getPlayerName()).toBeNull();
        });
    });

    describe('message validation', () => {
        let ws: MockWebSocket;

        beforeEach(async () => {
            const connectPromise = manager.connect('TestPlayer', 'sparrow', 'city');
            await vi.advanceTimersByTimeAsync(20);

            ws = (manager as any).ws as MockWebSocket;
            ws.simulateMessage({
                type: 'welcome',
                playerId: '123',
                player: {},
                worms: [],
                flies: [],
                players: [],
                leaderboard: []
            });

            await connectPromise;
        });

        it('rejects invalid player_moved (missing fields)', () => {
            const callback = vi.fn();
            manager.on('playerMoved', callback);

            ws.simulateMessage({
                type: 'player_moved',
                playerId: '456'
                // Missing x, y, z, rotationY
            });

            expect(callback).not.toHaveBeenCalled();
        });

        it('rejects invalid player_moved (out of bounds)', () => {
            const callback = vi.fn();
            manager.on('playerMoved', callback);

            ws.simulateMessage({
                type: 'player_moved',
                playerId: '456',
                x: 1000, // Out of bounds
                y: 20,
                z: 30,
                rotationY: 1.5
            });

            expect(callback).not.toHaveBeenCalled();
        });

        it('rejects invalid worm_collected', () => {
            const callback = vi.fn();
            manager.on('wormCollected', callback);

            ws.simulateMessage({
                type: 'worm_collected',
                // Missing required fields
            });

            expect(callback).not.toHaveBeenCalled();
        });
    });
});

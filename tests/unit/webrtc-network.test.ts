import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock PeerJS before importing WebRTCNetworkManager
const mockPeerOn = vi.fn();
const mockPeerDestroy = vi.fn();
const mockPeerConnect = vi.fn();

vi.mock('peerjs', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            on: mockPeerOn,
            destroy: mockPeerDestroy,
            connect: mockPeerConnect,
            id: 'mock-peer-id',
        })),
    };
});

import { WebRTCNetworkManager } from '../../public/js/core/webrtc-network.ts';
import {
    WORMS_PER_LOCATION,
    FLIES_PER_LOCATION_MIN,
    FLIES_PER_LOCATION_MAX,
    WORM_POINTS,
    FLY_POINTS,
    GOLDEN_WORM_POINTS,
} from '../../public/js/shared/constants.ts';

// Helper: simulate the PeerJS 'open' event so createPeer resolves
function simulatePeerOpen() {
    // The 'open' handler is registered via peer.on('open', callback)
    const openCall = mockPeerOn.mock.calls.find(c => c[0] === 'open');
    if (openCall) {
        openCall[1](); // invoke the 'open' callback
    }
}

describe('WebRTCNetworkManager', () => {
    let manager: WebRTCNetworkManager;

    beforeEach(() => {
        vi.useFakeTimers();
        manager = new WebRTCNetworkManager();
        mockPeerOn.mockClear();
        mockPeerDestroy.mockClear();
        mockPeerConnect.mockClear();
    });

    afterEach(() => {
        manager.disconnect();
        vi.useRealTimers();
    });

    describe('getRoomCode', () => {
        it('returns null before createRoom', () => {
            expect(manager.getRoomCode()).toBeNull();
        });

        it('returns a code after createRoom', async () => {
            const createPromise = manager.createRoom('Host', 'sparrow', 'city');

            // Simulate PeerJS open
            simulatePeerOpen();

            const data = await createPromise;
            expect(manager.getRoomCode()).not.toBeNull();
            expect(manager.getRoomCode()!.length).toBe(6);
        });
    });

    describe('event system (on/off/removeAllCallbacks)', () => {
        it('on registers callback and off removes it', () => {
            const callback = vi.fn();
            manager.on('playerJoined', callback);
            manager.off('playerJoined', callback);

            // Trigger internally would not call the removed callback
            // We verify off does not throw and the callback is no longer in the list
            // by checking that after adding + removing, a second on + trigger works
            const callback2 = vi.fn();
            manager.on('playerJoined', callback2);

            // Access internal trigger via casting to test
            (manager as any).triggerCallback('playerJoined', { id: 'test', name: 'Test', bird: 'sparrow', x: 0, y: 0, z: 0, rotationY: 0, score: 0 });

            expect(callback).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it('removeAllCallbacks clears all registered callbacks', () => {
            const cb1 = vi.fn();
            const cb2 = vi.fn();
            manager.on('playerJoined', cb1);
            manager.on('playerLeft', cb2);

            manager.removeAllCallbacks();

            (manager as any).triggerCallback('playerJoined', { id: 'test', name: 'Test', bird: 'sparrow', x: 0, y: 0, z: 0, rotationY: 0, score: 0 });
            (manager as any).triggerCallback('playerLeft', 'test-id');

            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).not.toHaveBeenCalled();
        });
    });

    describe('host mode: createRoom and game actions', () => {
        let welcomeData: any;

        beforeEach(async () => {
            const createPromise = manager.createRoom('HostPlayer', 'crow', 'park');
            simulatePeerOpen();
            welcomeData = await createPromise;
        });

        it('createRoom returns valid WelcomeData', () => {
            expect(welcomeData.playerId).toBe('host');
            expect(welcomeData.player.name).toBe('HostPlayer');
            expect(welcomeData.player.bird).toBe('crow');
            expect(welcomeData.worms).toHaveLength(WORMS_PER_LOCATION);
            expect(welcomeData.flies.length).toBeGreaterThanOrEqual(FLIES_PER_LOCATION_MIN);
            expect(welcomeData.flies.length).toBeLessThanOrEqual(FLIES_PER_LOCATION_MAX);
            expect(welcomeData.players).toEqual([]);
            expect(manager.isConnected()).toBe(true);
        });

        it('sendWormCollected updates score by WORM_POINTS', () => {
            const wormId = welcomeData.worms[0].id;

            const callback = vi.fn();
            manager.on('wormCollected', callback);

            const result = manager.sendWormCollected(wormId, false);

            expect(result).toBe(true);
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    wormId,
                    playerId: 'host',
                    newScore: WORM_POINTS,
                    isGolden: false,
                })
            );
        });

        it('sendWormCollected with golden worm updates score by GOLDEN_WORM_POINTS', () => {
            const wormId = welcomeData.worms[0].id;

            const callback = vi.fn();
            manager.on('wormCollected', callback);

            manager.sendWormCollected(wormId, true);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    newScore: GOLDEN_WORM_POINTS,
                    isGolden: true,
                })
            );
        });

        it('sendFlyCollected updates score by FLY_POINTS', () => {
            const flyId = welcomeData.flies[0].id;

            const callback = vi.fn();
            manager.on('flyCollected', callback);

            const result = manager.sendFlyCollected(flyId);

            expect(result).toBe(true);
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    flyId,
                    playerId: 'host',
                    newScore: FLY_POINTS,
                })
            );
        });

        it('sendWormCollected returns false for invalid ID', () => {
            const result = manager.sendWormCollected('nonexistent', false);
            expect(result).toBe(false);
        });

        it('sendFlyCollected returns false for invalid ID', () => {
            const result = manager.sendFlyCollected('nonexistent');
            expect(result).toBe(false);
        });

        it('score accumulates across worm and fly collections', () => {
            const callback = vi.fn();
            manager.on('wormCollected', callback);
            manager.on('flyCollected', callback);

            manager.sendWormCollected(welcomeData.worms[0].id, false);
            manager.sendFlyCollected(welcomeData.flies[0].id);

            // Last callback should show accumulated score
            const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
            expect(lastCall.newScore).toBe(WORM_POINTS + FLY_POINTS);
        });

        it('changeLocation generates new entities', () => {
            const callback = vi.fn();
            manager.on('locationChanged', callback);

            manager.changeLocation('beach');

            // locationChanged fires asynchronously
            vi.advanceTimersByTime(10);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    location: 'beach',
                })
            );

            const callData = callback.mock.calls[0][0];
            expect(callData.worms.length).toBe(WORMS_PER_LOCATION);
            expect(callData.flies.length).toBeGreaterThanOrEqual(FLIES_PER_LOCATION_MIN);
            expect(callData.flies.length).toBeLessThanOrEqual(FLIES_PER_LOCATION_MAX);
        });

        it('leaderboard is updated after collection', () => {
            const lbCallback = vi.fn();
            manager.on('leaderboard', lbCallback);

            manager.sendWormCollected(welcomeData.worms[0].id, false);

            expect(lbCallback).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'host',
                        score: WORM_POINTS,
                    }),
                ])
            );
        });
    });

    describe('disconnect', () => {
        it('cleans up properly', async () => {
            const createPromise = manager.createRoom('Host', 'sparrow', 'city');
            simulatePeerOpen();
            await createPromise;

            expect(manager.isConnected()).toBe(true);

            manager.disconnect();

            expect(manager.isConnected()).toBe(false);
            expect(manager.getPlayerName()).toBeNull();
            expect(mockPeerDestroy).toHaveBeenCalled();
        });

        it('returns false for sends after disconnect', async () => {
            const createPromise = manager.createRoom('Host', 'sparrow', 'city');
            simulatePeerOpen();
            await createPromise;

            manager.disconnect();

            expect(manager.sendPosition(0, 0, 0, 0)).toBe(false);
            expect(manager.sendChat('test')).toBe(false);
            expect(manager.changeLocation('city')).toBe(false);
        });
    });

    describe('initialization state', () => {
        it('starts disconnected with empty playerId', () => {
            expect(manager.connected).toBe(false);
            expect(manager.playerId).toBe('');
            expect(manager.isConnected()).toBe(false);
        });

        it('isReconnecting always returns false', () => {
            expect(manager.isReconnecting()).toBe(false);
        });

        it('getPlayerName returns null initially', () => {
            expect(manager.getPlayerName()).toBeNull();
        });

        it('getBirdType returns null initially', () => {
            expect(manager.getBirdType()).toBeNull();
        });
    });
});

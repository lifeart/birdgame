import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoNetworkManager } from '../../public/js/core/demo-network.ts';
import {
    WORMS_PER_LOCATION,
    FLIES_PER_LOCATION_MIN,
    FLIES_PER_LOCATION_MAX,
    WORM_POINTS,
    FLY_POINTS,
    GOLDEN_WORM_POINTS,
    SPAWN_HEIGHT,
    WORM_RESPAWN_INTERVAL_MS,
    MIN_WORMS_BEFORE_RESPAWN,
} from '../../public/js/shared/constants.ts';

describe('DemoNetworkManager', () => {
    let manager: DemoNetworkManager;

    beforeEach(() => {
        vi.useFakeTimers();
        manager = new DemoNetworkManager();
    });

    afterEach(() => {
        manager.disconnect();
        vi.useRealTimers();
    });

    describe('connect', () => {
        it('returns valid WelcomeData with correct player', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            expect(data.playerId).toBe('demo-player');
            expect(data.player.id).toBe('demo-player');
            expect(data.player.name).toBe('TestBird');
            expect(data.player.bird).toBe('sparrow');
            expect(data.player.x).toBe(0);
            expect(data.player.y).toBe(SPAWN_HEIGHT);
            expect(data.player.z).toBe(0);
            expect(data.player.score).toBe(0);
        });

        it('returns correct number of worms', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            expect(data.worms).toHaveLength(WORMS_PER_LOCATION);
        });

        it('returns correct number of flies', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            expect(data.flies.length).toBeGreaterThanOrEqual(FLIES_PER_LOCATION_MIN);
            expect(data.flies.length).toBeLessThanOrEqual(FLIES_PER_LOCATION_MAX);
        });

        it('returns empty players array and leaderboard with self', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            expect(data.players).toEqual([]);
            expect(data.leaderboard).toHaveLength(1);
            expect(data.leaderboard[0].name).toBe('TestBird');
            expect(data.leaderboard[0].score).toBe(0);
        });

        it('generates random name when empty string provided', async () => {
            const data = await manager.connect('', 'sparrow', 'city');
            expect(data.player.name.length).toBeGreaterThan(0);
        });
    });

    describe('isConnected', () => {
        it('returns false before connect', () => {
            expect(manager.isConnected()).toBe(false);
        });

        it('returns true after connect', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');
            expect(manager.isConnected()).toBe(true);
        });

        it('returns false after disconnect', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');
            manager.disconnect();
            expect(manager.isConnected()).toBe(false);
        });
    });

    describe('sendWormCollected', () => {
        it('increments score by WORM_POINTS and triggers callback', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            const wormId = data.worms[0].id;

            const callback = vi.fn();
            manager.on('wormCollected', callback);

            const result = manager.sendWormCollected(wormId, false);

            expect(result).toBe(true);
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    wormId,
                    playerId: 'demo-player',
                    newScore: WORM_POINTS,
                    isGolden: false,
                })
            );
        });

        it('increments score by GOLDEN_WORM_POINTS for golden worm', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            const wormId = data.worms[0].id;

            const callback = vi.fn();
            manager.on('wormCollected', callback);

            // Force the worm to be golden via the isGolden parameter
            manager.sendWormCollected(wormId, true);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    newScore: GOLDEN_WORM_POINTS,
                    isGolden: true,
                })
            );
        });

        it('returns false for invalid worm ID', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');

            const result = manager.sendWormCollected('nonexistent-id', false);
            expect(result).toBe(false);
        });

        it('triggers leaderboard update after collection', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            const wormId = data.worms[0].id;

            const lbCallback = vi.fn();
            manager.on('leaderboard', lbCallback);

            manager.sendWormCollected(wormId, false);

            expect(lbCallback).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ score: WORM_POINTS }),
                ])
            );
        });

        it('accumulates score across multiple collections', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const callback = vi.fn();
            manager.on('wormCollected', callback);

            manager.sendWormCollected(data.worms[0].id, false);
            manager.sendWormCollected(data.worms[1].id, false);

            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback.mock.calls[1][0].newScore).toBe(WORM_POINTS * 2);
        });
    });

    describe('sendFlyCollected', () => {
        it('increments score by FLY_POINTS', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');
            const flyId = data.flies[0].id;

            const callback = vi.fn();
            manager.on('flyCollected', callback);

            const result = manager.sendFlyCollected(flyId);

            expect(result).toBe(true);
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    flyId,
                    playerId: 'demo-player',
                    newScore: FLY_POINTS,
                })
            );
        });

        it('returns false for invalid fly ID', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');

            const result = manager.sendFlyCollected('nonexistent-id');
            expect(result).toBe(false);
        });
    });

    describe('changeLocation', () => {
        it('triggers locationChanged callback with new entities', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');

            const callback = vi.fn();
            manager.on('locationChanged', callback);

            manager.changeLocation('beach');

            // locationChanged fires asynchronously via setTimeout
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
            expect(callData.players).toEqual([]);
        });
    });

    describe('disconnect', () => {
        it('stops respawn loops (no more wormSpawned callbacks)', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');

            // Collect all worms to trigger respawn conditions
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const callback = vi.fn();
            manager.on('wormSpawned', callback);

            manager.disconnect();

            // Advance time past respawn interval
            vi.advanceTimersByTime(WORM_RESPAWN_INTERVAL_MS * 5);

            expect(callback).not.toHaveBeenCalled();
        });

        it('sets connected to false and clears playerName', async () => {
            await manager.connect('TestBird', 'sparrow', 'city');

            manager.disconnect();

            expect(manager.connected).toBe(false);
            expect(manager.getPlayerName()).toBeNull();
        });
    });

    describe('event system (on/off/removeAllCallbacks)', () => {
        it('on registers a callback that receives events', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const callback = vi.fn();
            manager.on('wormCollected', callback);

            manager.sendWormCollected(data.worms[0].id, false);

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('off removes a specific callback', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const callback = vi.fn();
            manager.on('wormCollected', callback);
            manager.off('wormCollected', callback);

            manager.sendWormCollected(data.worms[0].id, false);

            expect(callback).not.toHaveBeenCalled();
        });

        it('removeAllCallbacks clears all callbacks', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const wormCb = vi.fn();
            const lbCb = vi.fn();
            manager.on('wormCollected', wormCb);
            manager.on('leaderboard', lbCb);

            manager.removeAllCallbacks();

            manager.sendWormCollected(data.worms[0].id, false);

            expect(wormCb).not.toHaveBeenCalled();
            expect(lbCb).not.toHaveBeenCalled();
        });

        it('supports multiple callbacks for same event', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const cb1 = vi.fn();
            const cb2 = vi.fn();
            manager.on('wormCollected', cb1);
            manager.on('wormCollected', cb2);

            manager.sendWormCollected(data.worms[0].id, false);

            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });
    });

    describe('respawn loops', () => {
        it('respawns worms when below threshold', async () => {
            const data = await manager.connect('TestBird', 'sparrow', 'city');

            const spawnCallback = vi.fn();
            manager.on('wormSpawned', spawnCallback);

            // Collect worms until below MIN_WORMS_BEFORE_RESPAWN
            const toCollect = WORMS_PER_LOCATION - MIN_WORMS_BEFORE_RESPAWN + 1;
            for (let i = 0; i < toCollect; i++) {
                manager.sendWormCollected(data.worms[i].id, false);
            }

            // Advance time past respawn interval
            vi.advanceTimersByTime(WORM_RESPAWN_INTERVAL_MS + 100);

            expect(spawnCallback).toHaveBeenCalled();
        });
    });
});

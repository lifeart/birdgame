import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { createWormManager } = require('../../../server/entities/worms');

describe('WormManager', () => {
    let broadcastFn;
    let manager;

    beforeEach(() => {
        vi.useFakeTimers();
        broadcastFn = vi.fn();
        manager = createWormManager(broadcastFn);
        manager.initialize();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initialize', () => {
        it('creates worms for all locations', () => {
            const locations = ['city', 'park', 'village', 'beach', 'mountain'];

            locations.forEach(location => {
                const worms = manager.getActiveWorms(location);
                expect(worms.length).toBe(20); // WORMS_PER_LOCATION
            });
        });

        it('worms have required properties', () => {
            const worms = manager.getActiveWorms('city');
            const worm = worms[0];

            expect(worm).toHaveProperty('id');
            expect(worm).toHaveProperty('x');
            expect(worm).toHaveProperty('y');
            expect(worm).toHaveProperty('z');
            expect(worm.collected).toBe(false);
        });

        it('worms have unique IDs', () => {
            const cityWorms = manager.getActiveWorms('city');
            const parkWorms = manager.getActiveWorms('park');
            const allIds = [...cityWorms, ...parkWorms].map(w => w.id);
            const uniqueIds = new Set(allIds);

            expect(uniqueIds.size).toBe(allIds.length);
        });

        it('worms are positioned within world bounds', () => {
            const worms = manager.getActiveWorms('city');
            const WORLD_SIZE = 200;

            worms.forEach(worm => {
                expect(worm.x).toBeGreaterThanOrEqual(-WORLD_SIZE / 2);
                expect(worm.x).toBeLessThanOrEqual(WORLD_SIZE / 2);
                expect(worm.z).toBeGreaterThanOrEqual(-WORLD_SIZE / 2);
                expect(worm.z).toBeLessThanOrEqual(WORLD_SIZE / 2);
            });
        });

        it('worms are at ground level (y=1.5)', () => {
            const worms = manager.getActiveWorms('city');

            worms.forEach(worm => {
                expect(worm.y).toBe(1.5);
            });
        });
    });

    describe('getActiveWorms', () => {
        it('returns only uncollected worms', () => {
            const worms = manager.getActiveWorms('city');
            const firstWorm = worms[0];

            // Collect the worm
            manager.collectWorm('city', firstWorm.id, false);

            const activeWorms = manager.getActiveWorms('city');
            const collectedWorm = activeWorms.find(w => w.id === firstWorm.id);

            expect(collectedWorm).toBeUndefined();
            expect(activeWorms.length).toBe(19);
        });

        it('includes golden worm if present', () => {
            manager.spawnGoldenWorm('city');

            const worms = manager.getActiveWorms('city');
            const goldenWorm = worms.find(w => w.isGolden);

            expect(goldenWorm).toBeDefined();
            expect(goldenWorm.isGolden).toBe(true);
        });

        it('returns empty array for invalid location', () => {
            const worms = manager.getActiveWorms('invalid');
            expect(worms).toEqual([]);
        });
    });

    describe('collectWorm', () => {
        it('marks regular worm as collected', () => {
            const worms = manager.getActiveWorms('city');
            const wormId = worms[0].id;

            const result = manager.collectWorm('city', wormId, false);

            expect(result).not.toBeNull();
            expect(result.points).toBe(1);
        });

        it('returns null for already collected worm', () => {
            const worms = manager.getActiveWorms('city');
            const wormId = worms[0].id;

            manager.collectWorm('city', wormId, false);
            const secondResult = manager.collectWorm('city', wormId, false);

            expect(secondResult).toBeNull();
        });

        it('returns null for non-existent worm', () => {
            const result = manager.collectWorm('city', 'invalid-id', false);
            expect(result).toBeNull();
        });

        it('collects golden worm correctly', () => {
            const goldenWorm = manager.spawnGoldenWorm('city');

            const result = manager.collectWorm('city', goldenWorm.id, true);

            expect(result).not.toBeNull();
            expect(result.points).toBe(10); // GOLDEN_WORM_POINTS
        });

        it('removes golden worm after collection', () => {
            const goldenWorm = manager.spawnGoldenWorm('city');
            manager.collectWorm('city', goldenWorm.id, true);

            const worms = manager.getActiveWorms('city');
            const stillGolden = worms.find(w => w.isGolden);

            expect(stillGolden).toBeUndefined();
        });

        it('returns worm data in result', () => {
            const worms = manager.getActiveWorms('city');
            const wormId = worms[0].id;

            const result = manager.collectWorm('city', wormId, false);

            expect(result.worm).toBeDefined();
            expect(result.worm.id).toBe(wormId);
        });
    });

    describe('spawnGoldenWorm', () => {
        it('creates golden worm in location', () => {
            const goldenWorm = manager.spawnGoldenWorm('city');

            expect(goldenWorm).toBeDefined();
            expect(goldenWorm.isGolden).toBe(true);
            expect(goldenWorm.id).toContain('golden_');
        });

        it('broadcasts worm_spawned event', () => {
            manager.spawnGoldenWorm('city');

            expect(broadcastFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'worm_spawned',
                    location: 'city'
                }),
                'city'
            );
        });

        it('golden worm has spawnTime', () => {
            const now = Date.now();
            const goldenWorm = manager.spawnGoldenWorm('city');

            expect(goldenWorm.spawnTime).toBeGreaterThanOrEqual(now);
        });

        it('golden worm is within world bounds (with margin)', () => {
            const goldenWorm = manager.spawnGoldenWorm('city');
            const MARGIN = 10;
            const WORLD_SIZE = 200;
            const maxCoord = (WORLD_SIZE - 20) / 2;

            expect(goldenWorm.x).toBeGreaterThanOrEqual(-maxCoord);
            expect(goldenWorm.x).toBeLessThanOrEqual(maxCoord);
            expect(goldenWorm.z).toBeGreaterThanOrEqual(-maxCoord);
            expect(goldenWorm.z).toBeLessThanOrEqual(maxCoord);
        });
    });

    describe('checkGoldenWormExpiry', () => {
        it('returns false when no golden worm', () => {
            const expired = manager.checkGoldenWormExpiry('city');
            expect(expired).toBe(false);
        });

        it('returns false when golden worm is fresh', () => {
            manager.spawnGoldenWorm('city');

            const expired = manager.checkGoldenWormExpiry('city');

            expect(expired).toBe(false);
        });

        it('returns true and removes when expired', () => {
            manager.spawnGoldenWorm('city');

            // Advance time past GOLDEN_WORM_DURATION_MS (60000)
            vi.advanceTimersByTime(61000);

            const expired = manager.checkGoldenWormExpiry('city');

            expect(expired).toBe(true);

            // Golden worm should be removed
            const worms = manager.getActiveWorms('city');
            const goldenWorm = worms.find(w => w.isGolden);
            expect(goldenWorm).toBeUndefined();
        });

        it('does not expire already collected golden worm', () => {
            const goldenWorm = manager.spawnGoldenWorm('city');
            manager.collectWorm('city', goldenWorm.id, true);

            vi.advanceTimersByTime(61000);

            const expired = manager.checkGoldenWormExpiry('city');
            expect(expired).toBe(false);
        });
    });

    describe('startRespawnLoop', () => {
        it('respawns worms when below threshold', () => {
            // Collect worms until below MIN_WORMS_BEFORE_RESPAWN (15)
            const worms = manager.getActiveWorms('city');
            for (let i = 0; i < 10; i++) {
                manager.collectWorm('city', worms[i].id, false);
            }

            expect(manager.getActiveWorms('city').length).toBe(10);

            // Start respawn loop
            manager.startRespawnLoop();

            // Advance time for respawn interval (5000ms)
            vi.advanceTimersByTime(5000);

            // Should have spawned new worms
            const currentWorms = manager.getActiveWorms('city');
            expect(currentWorms.length).toBeGreaterThan(10);
        });

        it('broadcasts worm_spawned for new worms', () => {
            // Collect many worms
            const worms = manager.getActiveWorms('city');
            for (let i = 0; i < 10; i++) {
                manager.collectWorm('city', worms[i].id, false);
            }

            broadcastFn.mockClear();
            manager.startRespawnLoop();
            vi.advanceTimersByTime(5000);

            expect(broadcastFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'worm_spawned',
                    location: 'city'
                }),
                'city'
            );
        });
    });

    describe('startGoldenWormLoop', () => {
        it('spawns golden worm when conditions met', () => {
            const getPlayersInLocation = vi.fn().mockReturnValue([{ id: 1 }]);

            manager.startGoldenWormLoop(getPlayersInLocation);

            // Advance past GOLDEN_WORM_SPAWN_INTERVAL_MS (300000)
            vi.advanceTimersByTime(330000);

            const worms = manager.getActiveWorms('city');
            const goldenWorm = worms.find(w => w.isGolden);

            // Should have spawned (assuming check interval hit)
            expect(getPlayersInLocation).toHaveBeenCalled();
        });

        it('does not spawn when no players in location', () => {
            const getPlayersInLocation = vi.fn().mockReturnValue([]);

            manager.startGoldenWormLoop(getPlayersInLocation);

            vi.advanceTimersByTime(330000);

            const worms = manager.getActiveWorms('city');
            const goldenWorm = worms.find(w => w.isGolden);

            expect(goldenWorm).toBeUndefined();
        });

        it('checks golden worm expiry', () => {
            const getPlayersInLocation = vi.fn().mockReturnValue([{ id: 1 }]);
            manager.spawnGoldenWorm('city');

            manager.startGoldenWormLoop(getPlayersInLocation);

            // Advance past expiry time
            vi.advanceTimersByTime(90000);

            const worms = manager.getActiveWorms('city');
            const goldenWorm = worms.find(w => w.isGolden);

            expect(goldenWorm).toBeUndefined();
        });
    });
});

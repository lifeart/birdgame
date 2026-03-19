import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { createFlyManager } = require('../../../server/entities/flies');

describe('FlyManager', () => {
    let broadcastFn;
    let manager;

    beforeEach(() => {
        vi.useFakeTimers();
        broadcastFn = vi.fn();
        manager = createFlyManager(broadcastFn);
        manager.initialize();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initialize', () => {
        it('creates flies for all locations', () => {
            const locations = ['city', 'park', 'village', 'beach', 'mountain'];

            locations.forEach(location => {
                const flies = manager.getActiveFlies(location);
                expect(flies.length).toBeGreaterThanOrEqual(3); // FLIES_PER_LOCATION_MIN
                expect(flies.length).toBeLessThanOrEqual(5);    // FLIES_PER_LOCATION_MAX
            });
        });

        it('flies have required properties', () => {
            const flies = manager.getActiveFlies('city');
            const fly = flies[0];

            expect(fly).toHaveProperty('id');
            expect(fly).toHaveProperty('x');
            expect(fly).toHaveProperty('y');
            expect(fly).toHaveProperty('z');
            expect(fly.collected).toBe(false);
        });

        it('flies have unique IDs', () => {
            const cityFlies = manager.getActiveFlies('city');
            const parkFlies = manager.getActiveFlies('park');
            const allIds = [...cityFlies, ...parkFlies].map(f => f.id);
            const uniqueIds = new Set(allIds);

            expect(uniqueIds.size).toBe(allIds.length);
        });

        it('flies are within world bounds', () => {
            const flies = manager.getActiveFlies('city');
            const maxCoord = (200 - 20) / 2; // (WORLD_SIZE - margin) / 2

            flies.forEach(fly => {
                expect(fly.x).toBeGreaterThanOrEqual(-maxCoord);
                expect(fly.x).toBeLessThanOrEqual(maxCoord);
                expect(fly.z).toBeGreaterThanOrEqual(-maxCoord);
                expect(fly.z).toBeLessThanOrEqual(maxCoord);
            });
        });

        it('flies are at correct height range', () => {
            const flies = manager.getActiveFlies('city');
            const FLY_HEIGHT_MIN = 8;
            const FLY_HEIGHT_MAX = 23;

            flies.forEach(fly => {
                expect(fly.y).toBeGreaterThanOrEqual(FLY_HEIGHT_MIN);
                expect(fly.y).toBeLessThanOrEqual(FLY_HEIGHT_MAX);
            });
        });
    });

    describe('getActiveFlies', () => {
        it('returns only uncollected flies', () => {
            const flies = manager.getActiveFlies('city');
            const firstFly = flies[0];
            const initialCount = flies.length;

            // Collect the fly
            manager.collectFly('city', firstFly.id);

            const activeFlies = manager.getActiveFlies('city');
            const collectedFly = activeFlies.find(f => f.id === firstFly.id);

            expect(collectedFly).toBeUndefined();
            expect(activeFlies.length).toBe(initialCount - 1);
        });

        it('returns empty array for invalid location', () => {
            const flies = manager.getActiveFlies('invalid');
            expect(flies).toEqual([]);
        });
    });

    describe('collectFly', () => {
        it('marks fly as collected', () => {
            const flies = manager.getActiveFlies('city');
            const flyId = flies[0].id;

            const result = manager.collectFly('city', flyId);

            expect(result).not.toBeNull();
            expect(result.points).toBe(2); // FLY_POINTS
        });

        it('returns null for already collected fly', () => {
            const flies = manager.getActiveFlies('city');
            const flyId = flies[0].id;

            manager.collectFly('city', flyId);
            const secondResult = manager.collectFly('city', flyId);

            expect(secondResult).toBeNull();
        });

        it('returns null for non-existent fly', () => {
            const result = manager.collectFly('city', 'invalid-id');
            expect(result).toBeNull();
        });

        it('returns fly data in result', () => {
            const flies = manager.getActiveFlies('city');
            const flyId = flies[0].id;

            const result = manager.collectFly('city', flyId);

            expect(result.fly).toBeDefined();
            expect(result.fly.id).toBe(flyId);
        });

        it('returns correct points value', () => {
            const flies = manager.getActiveFlies('city');
            const flyId = flies[0].id;

            const result = manager.collectFly('city', flyId);

            expect(result.points).toBe(2);
        });
    });

    describe('startRespawnLoop', () => {
        it('respawns flies when below threshold', () => {
            // Collect all flies
            const flies = manager.getActiveFlies('city');
            flies.forEach(fly => {
                manager.collectFly('city', fly.id);
            });

            expect(manager.getActiveFlies('city').length).toBe(0);

            // Start respawn loop
            manager.startRespawnLoop();

            // Advance time for respawn interval (10000ms)
            vi.advanceTimersByTime(10000);

            // Should have spawned new fly
            const currentFlies = manager.getActiveFlies('city');
            expect(currentFlies.length).toBeGreaterThan(0);
        });

        it('broadcasts fly_spawned for new flies', () => {
            // Collect all flies
            const flies = manager.getActiveFlies('city');
            flies.forEach(fly => {
                manager.collectFly('city', fly.id);
            });

            broadcastFn.mockClear();
            manager.startRespawnLoop();
            vi.advanceTimersByTime(10000);

            expect(broadcastFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'fly_spawned',
                    location: 'city'
                }),
                'city'
            );
        });

        it('new flies have correct height range', () => {
            // Collect all flies
            const flies = manager.getActiveFlies('city');
            flies.forEach(fly => {
                manager.collectFly('city', fly.id);
            });

            manager.startRespawnLoop();
            vi.advanceTimersByTime(10000);

            const newFlies = manager.getActiveFlies('city');
            const FLY_HEIGHT_MIN = 8;
            const FLY_HEIGHT_MAX = 23;

            newFlies.forEach(fly => {
                expect(fly.y).toBeGreaterThanOrEqual(FLY_HEIGHT_MIN);
                expect(fly.y).toBeLessThanOrEqual(FLY_HEIGHT_MAX);
            });
        });

        it('does not respawn when above threshold', () => {
            // Initial flies count is between 3-5 (FLIES_PER_LOCATION_MIN to MAX)
            const flies = manager.getActiveFlies('city');
            const initialCount = flies.length;

            // Ensure we are at or above MIN_FLIES_BEFORE_RESPAWN (3)
            expect(initialCount).toBeGreaterThanOrEqual(3);

            broadcastFn.mockClear();
            manager.startRespawnLoop();
            vi.advanceTimersByTime(10000);

            // Should not have spawned since we are at/above threshold
            const respawnCalls = broadcastFn.mock.calls.filter(
                call => call[0].type === 'fly_spawned' && call[1] === 'city'
            );
            expect(respawnCalls.length).toBe(0);
            expect(manager.getActiveFlies('city').length).toBe(initialCount);
        });

        it('runs periodically', () => {
            // Collect all flies
            const flies = manager.getActiveFlies('city');
            flies.forEach(fly => {
                manager.collectFly('city', fly.id);
            });

            broadcastFn.mockClear();
            manager.startRespawnLoop();

            // Advance multiple intervals
            vi.advanceTimersByTime(30000); // 3 intervals

            // Should have multiple broadcasts
            expect(broadcastFn).toHaveBeenCalled();
        });
    });
});

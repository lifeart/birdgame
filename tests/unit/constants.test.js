import { describe, it, expect } from 'vitest';

const constants = require('../../shared/constants');

describe('shared constants', () => {
    describe('LOCATIONS', () => {
        it('has 5 locations', () => {
            expect(constants.LOCATIONS).toHaveLength(5);
        });

        it('contains expected locations', () => {
            expect(constants.LOCATIONS).toContain('city');
            expect(constants.LOCATIONS).toContain('park');
            expect(constants.LOCATIONS).toContain('village');
            expect(constants.LOCATIONS).toContain('beach');
            expect(constants.LOCATIONS).toContain('mountain');
        });
    });

    describe('VALID_BIRDS', () => {
        it('has 5 bird types', () => {
            expect(constants.VALID_BIRDS).toHaveLength(5);
        });

        it('contains expected bird types', () => {
            expect(constants.VALID_BIRDS).toContain('sparrow');
            expect(constants.VALID_BIRDS).toContain('pigeon');
            expect(constants.VALID_BIRDS).toContain('crow');
            expect(constants.VALID_BIRDS).toContain('hummingbird');
            expect(constants.VALID_BIRDS).toContain('penguin');
        });
    });

    describe('entity spawn settings', () => {
        it('has correct worm settings', () => {
            expect(constants.WORMS_PER_LOCATION).toBe(20);
            expect(constants.MIN_WORMS_BEFORE_RESPAWN).toBe(15);
            expect(constants.WORM_RESPAWN_INTERVAL_MS).toBe(5000);
        });

        it('has correct fly settings', () => {
            expect(constants.FLIES_PER_LOCATION_MIN).toBe(3);
            expect(constants.FLIES_PER_LOCATION_MAX).toBe(5);
            expect(constants.MIN_FLIES_BEFORE_RESPAWN).toBe(3);
            expect(constants.FLY_RESPAWN_INTERVAL_MS).toBe(10000);
        });

        it('fly height range is valid', () => {
            expect(constants.FLY_HEIGHT_MIN).toBeLessThan(constants.FLY_HEIGHT_MAX);
            expect(constants.FLY_HEIGHT_MIN).toBeGreaterThan(0);
        });
    });

    describe('points', () => {
        it('worm gives 1 point', () => {
            expect(constants.WORM_POINTS).toBe(1);
        });

        it('fly gives 2 points', () => {
            expect(constants.FLY_POINTS).toBe(2);
        });

        it('golden worm gives 10 points', () => {
            expect(constants.GOLDEN_WORM_POINTS).toBe(10);
        });

        it('golden worm is worth more than regular entities', () => {
            expect(constants.GOLDEN_WORM_POINTS).toBeGreaterThan(constants.WORM_POINTS);
            expect(constants.GOLDEN_WORM_POINTS).toBeGreaterThan(constants.FLY_POINTS);
        });
    });

    describe('golden worm timing', () => {
        it('spawns every 5 minutes', () => {
            expect(constants.GOLDEN_WORM_SPAWN_INTERVAL_MS).toBe(300000);
        });

        it('lasts 1 minute', () => {
            expect(constants.GOLDEN_WORM_DURATION_MS).toBe(60000);
        });

        it('spawn interval is longer than duration', () => {
            expect(constants.GOLDEN_WORM_SPAWN_INTERVAL_MS).toBeGreaterThan(
                constants.GOLDEN_WORM_DURATION_MS
            );
        });
    });

    describe('world bounds', () => {
        it('world size is defined', () => {
            expect(constants.WORLD_SIZE).toBe(200);
        });

        it('spawn height is reasonable', () => {
            expect(constants.SPAWN_HEIGHT).toBe(10);
            expect(constants.SPAWN_HEIGHT).toBeGreaterThan(0);
        });
    });

    describe('leaderboard', () => {
        it('shows top 10 players', () => {
            expect(constants.LEADERBOARD_SIZE).toBe(10);
        });

        it('has debounce for updates', () => {
            expect(constants.LEADERBOARD_DEBOUNCE_MS).toBe(1000);
        });
    });

    describe('input validation limits', () => {
        it('name max length is 20', () => {
            expect(constants.MAX_NAME_LENGTH).toBe(20);
        });

        it('chat max length is 200', () => {
            expect(constants.MAX_CHAT_LENGTH).toBe(200);
        });
    });

    describe('name generator', () => {
        it('has 32 adjectives', () => {
            expect(constants.NAME_ADJECTIVES).toHaveLength(32);
        });

        it('has 32 nouns', () => {
            expect(constants.NAME_NOUNS).toHaveLength(32);
        });

        it('generateRandomName returns valid format', () => {
            const name = constants.generateRandomName();
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
            expect(name.length).toBeLessThanOrEqual(constants.MAX_NAME_LENGTH + 10);
        });

        it('generateRandomName produces varied results', () => {
            const names = new Set();
            for (let i = 0; i < 100; i++) {
                names.add(constants.generateRandomName());
            }
            // Should have significant variety
            expect(names.size).toBeGreaterThan(50);
        });
    });

    describe('profile cleanup', () => {
        it('profiles expire after 24 hours', () => {
            expect(constants.PROFILE_EXPIRY_MS).toBe(24 * 60 * 60 * 1000);
        });

        it('cleanup runs every hour', () => {
            expect(constants.PROFILE_CLEANUP_INTERVAL_MS).toBe(60 * 60 * 1000);
        });
    });
});

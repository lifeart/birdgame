import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressionManager } from '../../public/js/core/progression';

describe('ProgressionManager', () => {
    let manager: ProgressionManager;

    beforeEach(() => {
        manager = new ProgressionManager();
    });

    describe('initialization', () => {
        it('starts at level 1 with 0 XP', () => {
            expect(manager.currentLevel).toBe(1);
            expect(manager.currentXP).toBe(0);
        });

        it('has no unlocked rewards on fresh initialization', () => {
            // On first launch (no localStorage data), no rewards are unlocked yet
            expect(manager.unlockedRewards).toEqual([]);
        });
    });

    describe('XP table generation', () => {
        it('level 1 requires 0 XP', () => {
            expect(manager.getXPForLevel(1)).toBe(0);
        });

        it('level 2 requires 50 XP (50 * 1.15^0 = 50)', () => {
            expect(manager.getXPForLevel(2)).toBe(50);
        });

        it('level 3 requires cumulative XP (50 + 57 = 107)', () => {
            // Level 2: 50 * 1.15^0 = 50
            // Level 3: 50 * 1.15^1 = 57.5 -> 57 (floored)
            // Cumulative: 50 + 57 = 107
            expect(manager.getXPForLevel(3)).toBe(107);
        });

        it('level 50 caps the XP table', () => {
            const lvl50XP = manager.getXPForLevel(50);
            const lvl51XP = manager.getXPForLevel(51);
            expect(lvl51XP).toBe(lvl50XP); // Capped at level 50
        });

        it('returns 0 for level 0 or negative', () => {
            expect(manager.getXPForLevel(0)).toBe(0);
            expect(manager.getXPForLevel(-1)).toBe(0);
        });
    });

    describe('addXP', () => {
        it('increases currentXP', () => {
            manager.addXP(25, 'test');
            expect(manager.currentXP).toBe(25);
        });

        it('increases totalXPEarned', () => {
            manager.addXP(25, 'test');
            expect(manager.totalXPEarned).toBe(25);
        });

        it('triggers level up when threshold reached', () => {
            const leveledUp = manager.addXP(50, 'test');
            expect(leveledUp).toBe(true);
            expect(manager.currentLevel).toBe(2);
        });

        it('does not level up when below threshold', () => {
            const leveledUp = manager.addXP(49, 'test');
            expect(leveledUp).toBe(false);
            expect(manager.currentLevel).toBe(1);
        });

        it('can level up multiple times with large XP gain', () => {
            // Need to gain enough XP to skip multiple levels
            manager.addXP(500, 'test');
            expect(manager.currentLevel).toBeGreaterThan(2);
        });

        it('calls onLevelUp callback when leveling up', () => {
            const callback = vi.fn();
            manager.onLevelUp = callback;
            manager.addXP(50, 'test');
            expect(callback).toHaveBeenCalledWith(1, 2, undefined);
        });

        it('calls onXPGain callback', () => {
            const callback = vi.fn();
            manager.onXPGain = callback;
            manager.addXP(25, 'worm');
            expect(callback).toHaveBeenCalled();
            expect(callback.mock.calls[0][0]).toBe(25); // amount
            expect(callback.mock.calls[0][1]).toBe('worm'); // source
        });

        it('does not add XP at max level', () => {
            // Set to max level
            manager.currentLevel = 50;
            manager.currentXP = manager.getXPForLevel(50);

            const result = manager.addXP(100, 'test');
            expect(result).toBe(false);
        });

        it('saves progress after XP gain', () => {
            manager.addXP(25, 'test');
            // Check localStorage was called
            expect(localStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('getXPForAction', () => {
        it('returns correct XP for worm', () => {
            expect(manager.getXPForAction('worm')).toBe(5);
        });

        it('returns correct XP for fly', () => {
            expect(manager.getXPForAction('fly')).toBe(10);
        });

        it('returns correct XP for goldenWorm', () => {
            expect(manager.getXPForAction('goldenWorm')).toBe(50);
        });

        it('returns correct XP for butterfly', () => {
            expect(manager.getXPForAction('butterfly')).toBe(25);
        });

        it('returns correct XP for achievement', () => {
            expect(manager.getXPForAction('achievement')).toBe(100);
        });
    });

    describe('getXPToNextLevel', () => {
        it('returns correct XP needed at level 1', () => {
            expect(manager.getXPToNextLevel()).toBe(50);
        });

        it('decreases as XP is gained', () => {
            manager.addXP(25, 'test');
            expect(manager.getXPToNextLevel()).toBe(25);
        });

        it('returns 0 at max level', () => {
            manager.currentLevel = 50;
            manager.currentXP = manager.getXPForLevel(50);
            expect(manager.getXPToNextLevel()).toBe(0);
        });
    });

    describe('getXPProgress', () => {
        it('returns 0 at start of level', () => {
            expect(manager.getXPProgress()).toBe(0);
        });

        it('returns 0.5 at midpoint', () => {
            manager.addXP(25, 'test'); // Half way to level 2
            expect(manager.getXPProgress()).toBe(0.5);
        });

        it('returns 1 at max level', () => {
            manager.currentLevel = 50;
            manager.currentXP = manager.getXPForLevel(50);
            expect(manager.getXPProgress()).toBe(1);
        });

        it('is clamped between 0 and 1', () => {
            const progress = manager.getXPProgress();
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(1);
        });
    });

    describe('level rewards', () => {
        it('unlocks reward at level 5', () => {
            // Add enough XP to reach level 5
            manager.currentXP = manager.getXPForLevel(5) - 1;
            manager.currentLevel = 4;
            manager.addXP(100, 'test');

            expect(manager.hasUnlocked('trail', 'basic')).toBe(true);
        });

        it('level 10 unlocks aura', () => {
            manager.currentXP = manager.getXPForLevel(10) - 1;
            manager.currentLevel = 9;
            manager.addXP(200, 'test');

            expect(manager.hasUnlocked('aura', 'soft_glow')).toBe(true);
        });

        it('level 20 unlocks crown accessory', () => {
            manager.currentXP = manager.getXPForLevel(20) - 1;
            manager.currentLevel = 19;
            manager.addXP(500, 'test');

            expect(manager.hasUnlocked('accessory', 'crown')).toBe(true);
        });
    });

    describe('getUnlockedByType', () => {
        it('returns empty array when no unlocks', () => {
            const trails = manager.getUnlockedByType('trail');
            expect(trails).toEqual([]);
        });

        it('filters by type correctly', () => {
            // Manually add unlocked rewards for testing
            manager.unlockedRewards = [
                { level: 5, type: 'trail', trailId: 'basic', description: 'Trail' },
                { level: 10, type: 'aura', auraId: 'soft_glow', description: 'Aura' },
                { level: 15, type: 'trail', trailId: 'sparkle', description: 'Sparkle' }
            ];

            const trails = manager.getUnlockedByType('trail');
            expect(trails.length).toBe(2);
        });
    });

    describe('getNextRewardLevel', () => {
        it('returns 5 at level 1', () => {
            expect(manager.getNextRewardLevel()).toBe(5);
        });

        it('returns 10 at level 5', () => {
            manager.currentLevel = 5;
            expect(manager.getNextRewardLevel()).toBe(10);
        });

        it('returns null at max level', () => {
            manager.currentLevel = 50;
            expect(manager.getNextRewardLevel()).toBe(null);
        });
    });

    describe('getStats', () => {
        it('returns correct stats object', () => {
            manager.addXP(25, 'test');
            const stats = manager.getStats();

            expect(stats).toHaveProperty('level', 1);
            expect(stats).toHaveProperty('currentXP', 25);
            expect(stats).toHaveProperty('xpToNext');
            expect(stats).toHaveProperty('xpProgress');
            expect(stats).toHaveProperty('totalXP', 25);
            expect(stats).toHaveProperty('unlockedCount');
            expect(stats).toHaveProperty('nextRewardLevel');
        });
    });

    describe('reset', () => {
        it('resets all progress', () => {
            manager.addXP(1000, 'test');
            manager.reset();

            expect(manager.currentLevel).toBe(1);
            expect(manager.currentXP).toBe(0);
            expect(manager.totalXPEarned).toBe(0);
        });

        it('preserves level 1 reward after reset', () => {
            manager.addXP(1000, 'test');
            manager.reset();

            expect(manager.unlockedRewards.length).toBe(1);
            expect(manager.unlockedRewards[0].level).toBe(1);
        });
    });
});

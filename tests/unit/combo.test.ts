import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComboManager } from '../../public/js/core/combo';

describe('ComboManager', () => {
    let manager: ComboManager;

    beforeEach(() => {
        manager = new ComboManager();
        vi.restoreAllMocks();
    });

    describe('multiplier thresholds', () => {
        it('returns 1x multiplier for streak < 3', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            expect(manager.getMultiplier()).toBe(1);

            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            expect(manager.getMultiplier()).toBe(1);
        });

        it('returns 1.5x multiplier at streak 3', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(3000);
            const multiplier = manager.registerCollection();
            expect(multiplier).toBe(1.5);
            expect(manager.getStreak()).toBe(3);
        });

        it('returns 2x multiplier at streak 5', () => {
            for (let i = 0; i < 5; i++) {
                vi.spyOn(Date, 'now').mockReturnValue(1000 + i * 1000);
                manager.registerCollection();
            }
            expect(manager.getMultiplier()).toBe(2);
            expect(manager.getStreak()).toBe(5);
        });

        it('returns 3x multiplier at streak 8+', () => {
            for (let i = 0; i < 8; i++) {
                vi.spyOn(Date, 'now').mockReturnValue(1000 + i * 1000);
                manager.registerCollection();
            }
            expect(manager.getMultiplier()).toBe(3);
            expect(manager.getStreak()).toBe(8);
        });

        it('returns 3x multiplier at streak 10 (beyond 8)', () => {
            for (let i = 0; i < 10; i++) {
                vi.spyOn(Date, 'now').mockReturnValue(1000 + i * 1000);
                manager.registerCollection();
            }
            expect(manager.getMultiplier()).toBe(3);
            expect(manager.getStreak()).toBe(10);
        });
    });

    describe('combo window', () => {
        it('resets streak after 5s window expires', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(3000);
            manager.registerCollection();
            expect(manager.getStreak()).toBe(3);

            // More than 5 seconds later
            vi.spyOn(Date, 'now').mockReturnValue(8001);
            manager.registerCollection();
            expect(manager.getStreak()).toBe(1);
            expect(manager.getMultiplier()).toBe(1);
        });

        it('maintains streak within 5s window', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            // Exactly at 5s boundary
            vi.spyOn(Date, 'now').mockReturnValue(6000);
            manager.registerCollection();
            expect(manager.getStreak()).toBe(2);
        });
    });

    describe('golden worm handling', () => {
        it('golden worms return 1x multiplier but increment streak', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(3000);
            const multiplier = manager.registerCollection(true);
            expect(multiplier).toBe(1);
            expect(manager.getStreak()).toBe(3);
            // But getMultiplier still reflects the streak
            expect(manager.getMultiplier()).toBe(1.5);
        });

        it('golden worm at high streak still returns 1x', () => {
            for (let i = 0; i < 7; i++) {
                vi.spyOn(Date, 'now').mockReturnValue(1000 + i * 1000);
                manager.registerCollection();
            }
            vi.spyOn(Date, 'now').mockReturnValue(8000);
            const multiplier = manager.registerCollection(true);
            expect(multiplier).toBe(1);
            expect(manager.getStreak()).toBe(8);
            expect(manager.getMultiplier()).toBe(3);
        });
    });

    describe('reset', () => {
        it('clears state completely', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();

            manager.reset();
            expect(manager.getStreak()).toBe(0);
            expect(manager.getMultiplier()).toBe(1);
            expect(manager.isActive()).toBe(false);
        });
    });

    describe('isActive', () => {
        it('returns false when streak < 3', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            expect(manager.isActive()).toBe(false);
        });

        it('returns true when streak >= 3 and within window', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(3000);
            manager.registerCollection();
            // isActive checks Date.now() against lastCollectionTime
            // lastCollectionTime = 3000, Date.now() still returns 3000
            expect(manager.isActive()).toBe(true);
        });

        it('returns false when streak >= 3 but outside window', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(3000);
            manager.registerCollection();
            expect(manager.getStreak()).toBe(3);

            // Now simulate time passing beyond window
            vi.spyOn(Date, 'now').mockReturnValue(8001);
            expect(manager.isActive()).toBe(false);
        });

        it('returns false after reset', () => {
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            manager.registerCollection();
            vi.spyOn(Date, 'now').mockReturnValue(3000);
            manager.registerCollection();
            expect(manager.isActive()).toBe(true);

            manager.reset();
            expect(manager.isActive()).toBe(false);
        });
    });
});

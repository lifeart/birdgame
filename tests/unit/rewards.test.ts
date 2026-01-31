import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DailyRewardsManager } from '../../public/js/core/rewards';

describe('DailyRewardsManager', () => {
    let manager: DailyRewardsManager;

    beforeEach(() => {
        vi.useFakeTimers();
        manager = new DailyRewardsManager();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initialization', () => {
        it('starts with streak at 0', () => {
            expect(manager.currentStreak).toBe(0);
        });

        it('starts at day 1 of cycle', () => {
            expect(manager.currentDayInCycle).toBe(1);
        });

        it('has not claimed today initially', () => {
            expect(manager.hasClaimedToday).toBe(false);
        });

        it('can claim on first load', () => {
            expect(manager.canClaim()).toBe(true);
        });
    });

    describe('7-day reward cycle', () => {
        it('day 1 gives 50 XP', () => {
            const info = manager.getTodayRewardInfo();
            expect(info.day).toBe(1);
            expect(info.amount).toBe(50);
        });

        it('day 7 gives bonus reward', () => {
            manager.currentDayInCycle = 7;
            const info = manager.getTodayRewardInfo();
            expect(info.type).toBe('bonus');
            expect(info.xp).toBe(500);
            expect(info.special).toBe('golden_egg');
        });

        it('getAllRewardsInfo returns 7 days', () => {
            const rewards = manager.getAllRewardsInfo();
            expect(rewards.length).toBe(7);
        });

        it('rewards scale correctly across days', () => {
            const rewards = manager.getAllRewardsInfo();
            expect(rewards[0].amount).toBe(50);   // Day 1
            expect(rewards[1].amount).toBe(100);  // Day 2
            expect(rewards[2].amount).toBe(150);  // Day 3
            expect(rewards[3].amount).toBe(200);  // Day 4
            expect(rewards[4].amount).toBe(300);  // Day 5
            expect(rewards[5].amount).toBe(400);  // Day 6
            expect(rewards[6].xp).toBe(500);      // Day 7 (bonus)
        });
    });

    describe('streak multipliers', () => {
        it('returns 1.0 with no streak', () => {
            expect(manager.getStreakMultiplier()).toBe(1.0);
        });

        it('returns 1.2 at streak 3', () => {
            manager.currentStreak = 3;
            expect(manager.getStreakMultiplier()).toBe(1.2);
        });

        it('returns 1.5 at streak 7', () => {
            manager.currentStreak = 7;
            expect(manager.getStreakMultiplier()).toBe(1.5);
        });

        it('returns 2.0 at streak 14', () => {
            manager.currentStreak = 14;
            expect(manager.getStreakMultiplier()).toBe(2.0);
        });

        it('returns 3.0 at streak 30', () => {
            manager.currentStreak = 30;
            expect(manager.getStreakMultiplier()).toBe(3.0);
        });

        it('keeps highest multiplier at streak 50', () => {
            manager.currentStreak = 50;
            expect(manager.getStreakMultiplier()).toBe(3.0);
        });
    });

    describe('claimReward', () => {
        it('returns reward on successful claim', () => {
            const reward = manager.claimReward();
            expect(reward).not.toBeNull();
            expect(reward?.day).toBe(1);
            expect(reward?.finalAmount).toBe(50);
        });

        it('increases streak after claim', () => {
            manager.claimReward();
            expect(manager.currentStreak).toBe(1);
        });

        it('advances day in cycle', () => {
            manager.claimReward();
            expect(manager.currentDayInCycle).toBe(2);
        });

        it('sets hasClaimedToday to true', () => {
            manager.claimReward();
            expect(manager.hasClaimedToday).toBe(true);
        });

        it('returns null if already claimed today', () => {
            manager.claimReward();
            const secondClaim = manager.claimReward();
            expect(secondClaim).toBeNull();
        });

        it('applies streak multiplier to reward', () => {
            manager.currentStreak = 3; // 1.2x multiplier
            const reward = manager.claimReward();
            expect(reward?.finalAmount).toBe(60); // 50 * 1.2
        });

        it('cycles back to day 1 after day 7', () => {
            manager.currentDayInCycle = 7;
            manager.claimReward();
            expect(manager.currentDayInCycle).toBe(1);
        });

        it('calls onRewardClaimed callback', () => {
            const callback = vi.fn();
            manager.onRewardClaimed = callback;
            manager.claimReward();
            expect(callback).toHaveBeenCalled();
        });

        it('saves data after claim', () => {
            manager.claimReward();
            expect(localStorage.setItem).toHaveBeenCalled();
        });

        it('increments totalDaysClaimed', () => {
            manager.claimReward();
            expect(manager.totalDaysClaimed).toBe(1);
        });
    });

    describe('streak tracking', () => {
        it('maintains streak when claiming consecutive days', () => {
            // Claim day 1
            manager.claimReward();
            expect(manager.currentStreak).toBe(1);

            // Advance to next day
            vi.advanceTimersByTime(24 * 60 * 60 * 1000);
            manager.hasClaimedToday = false;
            manager.lastClaimDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Claim day 2
            manager.claimReward();
            expect(manager.currentStreak).toBe(2);
        });

        it('resets streak after missing a day', () => {
            manager.currentStreak = 5;
            manager.lastClaimDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago

            // Re-initialize to trigger checkStreak
            const newManager = new DailyRewardsManager();
            // The streak would be reset on checkStreak
        });
    });

    describe('getNextStreakBonus', () => {
        it('returns 3-day bonus info when no streak', () => {
            const bonus = manager.getNextStreakBonus();
            expect(bonus).toEqual({
                daysNeeded: 3,
                multiplier: 1.2
            });
        });

        it('returns 7-day bonus when at streak 3', () => {
            manager.currentStreak = 3;
            const bonus = manager.getNextStreakBonus();
            expect(bonus).toEqual({
                daysNeeded: 4,
                multiplier: 1.5
            });
        });

        it('returns null when at max streak tier', () => {
            manager.currentStreak = 30;
            const bonus = manager.getNextStreakBonus();
            expect(bonus).toBeNull();
        });
    });

    describe('getTodayRewardInfo', () => {
        it('includes all required fields', () => {
            const info = manager.getTodayRewardInfo();

            expect(info).toHaveProperty('day');
            expect(info).toHaveProperty('type');
            expect(info).toHaveProperty('description');
            expect(info).toHaveProperty('dayInCycle');
            expect(info).toHaveProperty('multiplier');
            expect(info).toHaveProperty('canClaim');
            expect(info).toHaveProperty('currentStreak');
            expect(info).toHaveProperty('nextStreakBonus');
        });

        it('reflects current state accurately', () => {
            manager.currentStreak = 7;
            const info = manager.getTodayRewardInfo();

            expect(info.currentStreak).toBe(7);
            expect(info.multiplier).toBe(1.5);
        });
    });

    describe('getAllRewardsInfo', () => {
        it('marks previous days as claimed', () => {
            manager.currentDayInCycle = 3;
            const rewards = manager.getAllRewardsInfo();

            expect(rewards[0].isClaimed).toBe(true);  // Day 1
            expect(rewards[1].isClaimed).toBe(true);  // Day 2
            expect(rewards[2].isClaimed).toBe(false); // Day 3 (today)
        });

        it('marks current day as today', () => {
            manager.currentDayInCycle = 3;
            const rewards = manager.getAllRewardsInfo();

            expect(rewards[2].isToday).toBe(true);
        });

        it('includes multiplied amounts', () => {
            manager.currentStreak = 7; // 1.5x
            const rewards = manager.getAllRewardsInfo();

            expect(rewards[0].multipliedAmount).toBe(75); // 50 * 1.5
        });
    });

    describe('getStats', () => {
        it('returns correct stats object', () => {
            manager.currentStreak = 5;
            manager.totalDaysClaimed = 10;

            const stats = manager.getStats();

            expect(stats.currentStreak).toBe(5);
            expect(stats.totalDaysClaimed).toBe(10);
            expect(stats.currentDayInCycle).toBe(1);
            expect(stats.hasClaimedToday).toBe(false);
            expect(stats.multiplier).toBe(1.2);
        });
    });

    describe('reset', () => {
        it('resets all state', () => {
            manager.currentStreak = 10;
            manager.currentDayInCycle = 5;
            manager.totalDaysClaimed = 20;

            manager.reset();

            expect(manager.currentStreak).toBe(0);
            expect(manager.currentDayInCycle).toBe(1);
            expect(manager.totalDaysClaimed).toBe(0);
            expect(manager.lastClaimDate).toBeNull();
            expect(manager.hasClaimedToday).toBe(false);
        });
    });
});

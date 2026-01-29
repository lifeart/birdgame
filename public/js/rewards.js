// Daily Rewards System
class DailyRewardsManager {
    constructor() {
        // 7-day reward cycle
        this.rewards = [
            { day: 1, type: 'xp', amount: 50, description: '50 XP' },
            { day: 2, type: 'xp', amount: 100, description: '100 XP' },
            { day: 3, type: 'xp', amount: 150, description: '150 XP' },
            { day: 4, type: 'xp', amount: 200, description: '200 XP' },
            { day: 5, type: 'xp', amount: 300, description: '300 XP' },
            { day: 6, type: 'xp', amount: 400, description: '400 XP' },
            { day: 7, type: 'bonus', xp: 500, special: 'golden_egg', description: '500 XP + Golden Egg!' }
        ];

        // Streak bonuses (multiplier for consecutive days)
        this.streakBonuses = {
            3: 1.2,   // 20% bonus after 3 days
            7: 1.5,   // 50% bonus after 7 days
            14: 2.0,  // 100% bonus after 14 days
            30: 3.0   // 200% bonus after 30 days
        };

        this.currentStreak = 0;
        this.lastClaimDate = null;
        this.currentDayInCycle = 1;
        this.totalDaysClaimed = 0;
        this.hasClaimedToday = false;

        this.loadData();

        // Callbacks
        this.onRewardClaimed = null;
        this.onStreakBroken = null;
    }

    loadData() {
        try {
            const saved = localStorage.getItem('birdgame_daily_rewards');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentStreak = data.currentStreak || 0;
                this.lastClaimDate = data.lastClaimDate ? new Date(data.lastClaimDate) : null;
                this.currentDayInCycle = data.currentDayInCycle || 1;
                this.totalDaysClaimed = data.totalDaysClaimed || 0;
            }
        } catch (e) {
            console.warn('Could not load daily rewards data:', e);
        }

        // Check if streak is broken
        this.checkStreak();
    }

    saveData() {
        try {
            const data = {
                currentStreak: this.currentStreak,
                lastClaimDate: this.lastClaimDate ? this.lastClaimDate.toISOString() : null,
                currentDayInCycle: this.currentDayInCycle,
                totalDaysClaimed: this.totalDaysClaimed
            };
            localStorage.setItem('birdgame_daily_rewards', JSON.stringify(data));
        } catch (e) {
            console.warn('Could not save daily rewards data:', e);
        }
    }

    // Get today's date as YYYY-MM-DD
    getTodayString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // Check if it's a new day since last claim
    isNewDay() {
        if (!this.lastClaimDate) return true;

        const lastDateStr = `${this.lastClaimDate.getFullYear()}-${String(this.lastClaimDate.getMonth() + 1).padStart(2, '0')}-${String(this.lastClaimDate.getDate()).padStart(2, '0')}`;
        return this.getTodayString() !== lastDateStr;
    }

    // Check if streak should be reset (more than 1 day since last claim)
    checkStreak() {
        if (!this.lastClaimDate) {
            this.hasClaimedToday = false;
            return;
        }

        const now = new Date();
        const lastClaim = new Date(this.lastClaimDate);
        const diffTime = now.getTime() - lastClaim.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Same day - already claimed
            this.hasClaimedToday = true;
        } else if (diffDays === 1) {
            // Next day - streak continues
            this.hasClaimedToday = false;
        } else if (diffDays > 1) {
            // Streak broken
            if (this.currentStreak > 0 && this.onStreakBroken) {
                this.onStreakBroken(this.currentStreak);
            }
            this.currentStreak = 0;
            this.currentDayInCycle = 1;
            this.hasClaimedToday = false;
            this.saveData();
        }
    }

    // Can claim today's reward?
    canClaim() {
        return !this.hasClaimedToday && this.isNewDay();
    }

    // Get current streak bonus multiplier
    getStreakMultiplier() {
        let multiplier = 1.0;
        const streakLevels = Object.keys(this.streakBonuses).map(Number).sort((a, b) => a - b);

        for (const level of streakLevels) {
            if (this.currentStreak >= level) {
                multiplier = this.streakBonuses[level];
            }
        }

        return multiplier;
    }

    // Claim today's reward
    claimReward() {
        if (!this.canClaim()) {
            return null;
        }

        const reward = this.rewards[this.currentDayInCycle - 1];
        const multiplier = this.getStreakMultiplier();

        // Calculate final reward
        let finalReward = { ...reward };
        if (reward.type === 'xp') {
            finalReward.finalAmount = Math.floor(reward.amount * multiplier);
        } else if (reward.type === 'bonus') {
            finalReward.finalXP = Math.floor(reward.xp * multiplier);
        }
        finalReward.multiplier = multiplier;
        finalReward.streak = this.currentStreak + 1;

        // Update state
        this.currentStreak++;
        this.lastClaimDate = new Date();
        this.hasClaimedToday = true;
        this.totalDaysClaimed++;

        // Advance day in cycle
        this.currentDayInCycle++;
        if (this.currentDayInCycle > 7) {
            this.currentDayInCycle = 1;
        }

        this.saveData();

        // Trigger callback
        if (this.onRewardClaimed) {
            this.onRewardClaimed(finalReward);
        }

        return finalReward;
    }

    // Get info about today's reward (for display)
    getTodayRewardInfo() {
        const reward = this.rewards[this.currentDayInCycle - 1];
        const multiplier = this.getStreakMultiplier();

        return {
            ...reward,
            dayInCycle: this.currentDayInCycle,
            multiplier: multiplier,
            canClaim: this.canClaim(),
            currentStreak: this.currentStreak,
            nextStreakBonus: this.getNextStreakBonus()
        };
    }

    // Get all rewards for display (week view)
    getAllRewardsInfo() {
        const multiplier = this.getStreakMultiplier();

        return this.rewards.map((reward, index) => ({
            ...reward,
            isClaimed: index < this.currentDayInCycle - 1,
            isToday: index === this.currentDayInCycle - 1,
            multipliedAmount: reward.amount ? Math.floor(reward.amount * multiplier) : null,
            multipliedXP: reward.xp ? Math.floor(reward.xp * multiplier) : null
        }));
    }

    getNextStreakBonus() {
        const streakLevels = Object.keys(this.streakBonuses).map(Number).sort((a, b) => a - b);
        for (const level of streakLevels) {
            if (this.currentStreak < level) {
                return {
                    daysNeeded: level - this.currentStreak,
                    multiplier: this.streakBonuses[level]
                };
            }
        }
        return null;
    }

    // Get stats
    getStats() {
        return {
            currentStreak: this.currentStreak,
            totalDaysClaimed: this.totalDaysClaimed,
            currentDayInCycle: this.currentDayInCycle,
            hasClaimedToday: this.hasClaimedToday,
            multiplier: this.getStreakMultiplier()
        };
    }

    // Reset (for testing)
    reset() {
        this.currentStreak = 0;
        this.lastClaimDate = null;
        this.currentDayInCycle = 1;
        this.totalDaysClaimed = 0;
        this.hasClaimedToday = false;
        this.saveData();
    }
}

// Global instance
const dailyRewardsManager = new DailyRewardsManager();

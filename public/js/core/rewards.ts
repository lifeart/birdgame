// Daily Rewards System

export interface DailyReward {
    day: number;
    type: 'xp' | 'bonus';
    amount?: number;
    xp?: number;
    special?: string;
    description: string;
}

export interface ClaimedReward extends DailyReward {
    finalAmount?: number;
    finalXP?: number;
    multiplier: number;
    streak: number;
}

export interface TodayRewardInfo extends DailyReward {
    dayInCycle: number;
    multiplier: number;
    canClaim: boolean;
    currentStreak: number;
    nextStreakBonus: StreakBonus | null;
}

export interface RewardDisplayInfo extends DailyReward {
    isClaimed: boolean;
    isToday: boolean;
    multipliedAmount: number | null;
    multipliedXP: number | null;
}

export interface StreakBonus {
    daysNeeded: number;
    multiplier: number;
}

export interface DailyRewardsStats {
    currentStreak: number;
    totalDaysClaimed: number;
    currentDayInCycle: number;
    hasClaimedToday: boolean;
    multiplier: number;
}

export type RewardClaimedCallback = (reward: ClaimedReward) => void;
export type StreakBrokenCallback = (streak: number) => void;

export class DailyRewardsManager {
    private rewards: DailyReward[] = [
        { day: 1, type: 'xp', amount: 50, description: '50 XP' },
        { day: 2, type: 'xp', amount: 100, description: '100 XP' },
        { day: 3, type: 'xp', amount: 150, description: '150 XP' },
        { day: 4, type: 'xp', amount: 200, description: '200 XP' },
        { day: 5, type: 'xp', amount: 300, description: '300 XP' },
        { day: 6, type: 'xp', amount: 400, description: '400 XP' },
        { day: 7, type: 'bonus', xp: 500, special: 'golden_egg', description: '500 XP + Golden Egg!' }
    ];

    private streakBonuses: Record<number, number> = {
        3: 1.2,
        7: 1.5,
        14: 2.0,
        30: 3.0
    };

    public currentStreak: number = 0;
    public lastClaimDate: Date | null = null;
    public currentDayInCycle: number = 1;
    public totalDaysClaimed: number = 0;
    public hasClaimedToday: boolean = false;

    public onRewardClaimed: RewardClaimedCallback | null = null;
    public onStreakBroken: StreakBrokenCallback | null = null;

    constructor() {
        this.loadData();
        this.checkStreak();
    }

    private loadData(): void {
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
    }

    private saveData(): void {
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

    private getTodayString(): string {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    private isNewDay(): boolean {
        if (!this.lastClaimDate) return true;

        const lastDateStr = `${this.lastClaimDate.getFullYear()}-${String(this.lastClaimDate.getMonth() + 1).padStart(2, '0')}-${String(this.lastClaimDate.getDate()).padStart(2, '0')}`;
        return this.getTodayString() !== lastDateStr;
    }

    private checkStreak(): void {
        if (!this.lastClaimDate) {
            this.hasClaimedToday = false;
            return;
        }

        const now = new Date();
        const lastClaim = new Date(this.lastClaimDate);
        const diffTime = now.getTime() - lastClaim.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            this.hasClaimedToday = true;
        } else if (diffDays === 1) {
            this.hasClaimedToday = false;
        } else if (diffDays > 1) {
            if (this.currentStreak > 0 && this.onStreakBroken) {
                this.onStreakBroken(this.currentStreak);
            }
            this.currentStreak = 0;
            this.currentDayInCycle = 1;
            this.hasClaimedToday = false;
            this.saveData();
        }
    }

    canClaim(): boolean {
        return !this.hasClaimedToday && this.isNewDay();
    }

    getStreakMultiplier(): number {
        let multiplier = 1.0;
        const streakLevels = Object.keys(this.streakBonuses).map(Number).sort((a, b) => a - b);

        for (const level of streakLevels) {
            if (this.currentStreak >= level) {
                multiplier = this.streakBonuses[level];
            }
        }

        return multiplier;
    }

    claimReward(): ClaimedReward | null {
        if (!this.canClaim()) {
            return null;
        }

        const reward = this.rewards[this.currentDayInCycle - 1];
        const multiplier = this.getStreakMultiplier();

        const finalReward: ClaimedReward = {
            ...reward,
            multiplier,
            streak: this.currentStreak + 1
        };

        if (reward.type === 'xp' && reward.amount) {
            finalReward.finalAmount = Math.floor(reward.amount * multiplier);
        } else if (reward.type === 'bonus' && reward.xp) {
            finalReward.finalXP = Math.floor(reward.xp * multiplier);
        }

        this.currentStreak++;
        this.lastClaimDate = new Date();
        this.hasClaimedToday = true;
        this.totalDaysClaimed++;

        this.currentDayInCycle++;
        if (this.currentDayInCycle > 7) {
            this.currentDayInCycle = 1;
        }

        this.saveData();

        if (this.onRewardClaimed) {
            this.onRewardClaimed(finalReward);
        }

        return finalReward;
    }

    getTodayRewardInfo(): TodayRewardInfo {
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

    getAllRewardsInfo(): RewardDisplayInfo[] {
        const multiplier = this.getStreakMultiplier();

        return this.rewards.map((reward, index) => ({
            ...reward,
            isClaimed: index < this.currentDayInCycle - 1,
            isToday: index === this.currentDayInCycle - 1,
            multipliedAmount: reward.amount ? Math.floor(reward.amount * multiplier) : null,
            multipliedXP: reward.xp ? Math.floor(reward.xp * multiplier) : null
        }));
    }

    getNextStreakBonus(): StreakBonus | null {
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

    getStats(): DailyRewardsStats {
        return {
            currentStreak: this.currentStreak,
            totalDaysClaimed: this.totalDaysClaimed,
            currentDayInCycle: this.currentDayInCycle,
            hasClaimedToday: this.hasClaimedToday,
            multiplier: this.getStreakMultiplier()
        };
    }

    reset(): void {
        this.currentStreak = 0;
        this.lastClaimDate = null;
        this.currentDayInCycle = 1;
        this.totalDaysClaimed = 0;
        this.hasClaimedToday = false;
        this.saveData();
    }
}

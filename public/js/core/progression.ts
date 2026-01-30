// Progression System - XP, Levels, and Rewards

export interface LevelReward {
    type: 'start' | 'trail' | 'aura' | 'accessory' | 'legendary';
    description: string;
    trailId?: string;
    auraId?: string;
    accessoryId?: string;
    skinId?: string;
}

export interface UnlockedReward extends LevelReward {
    level: number;
}

export interface ProgressionStats {
    level: number;
    currentXP: number;
    xpToNext: number;
    xpProgress: number;
    totalXP: number;
    unlockedCount: number;
    nextRewardLevel: number | null;
}

export type XPAction = 'worm' | 'fly' | 'goldenWorm' | 'butterfly' | 'powerup' | 'distance100' | 'timeMinute' | 'achievement';

export type XPGainCallback = (amount: number, source: string, currentXP: number, progress: number) => void;
export type LevelUpCallback = (oldLevel: number, newLevel: number, reward: LevelReward | undefined) => void;

export class ProgressionManager {
    private xpTable: number[];
    private levelRewards: Record<number, LevelReward>;

    public currentXP: number = 0;
    public currentLevel: number = 1;
    public totalXPEarned: number = 0;
    public unlockedRewards: UnlockedReward[] = [];

    public onLevelUp: LevelUpCallback | null = null;
    public onXPGain: XPGainCallback | null = null;

    constructor() {
        this.xpTable = this.generateXPTable();

        this.levelRewards = {
            1: { type: 'start', description: 'Welcome to BirdGame!' },
            5: { type: 'trail', trailId: 'basic', description: 'Trail Effect Unlocked!' },
            10: { type: 'aura', auraId: 'soft_glow', description: 'Soft Glow Aura!' },
            15: { type: 'trail', trailId: 'sparkle', description: 'Sparkle Trail!' },
            20: { type: 'accessory', accessoryId: 'crown', description: 'Golden Crown!' },
            25: { type: 'aura', auraId: 'rainbow', description: 'Rainbow Aura!' },
            30: { type: 'trail', trailId: 'fire', description: 'Fire Trail!' },
            35: { type: 'accessory', accessoryId: 'halo', description: 'Angel Halo!' },
            40: { type: 'aura', auraId: 'lightning', description: 'Lightning Aura!' },
            45: { type: 'trail', trailId: 'cosmic', description: 'Cosmic Trail!' },
            50: { type: 'legendary', skinId: 'legendary', description: 'Legendary Bird Skin!' }
        };

        this.loadProgress();
    }

    private generateXPTable(): number[] {
        const table = [0];
        for (let level = 2; level <= 50; level++) {
            const xp = Math.floor(50 * Math.pow(1.15, level - 2));
            table.push(table[table.length - 1] + xp);
        }
        return table;
    }

    getXPForLevel(level: number): number {
        if (level <= 1) return 0;
        if (level > 50) return this.xpTable[49];
        return this.xpTable[level - 1];
    }

    getXPToNextLevel(): number {
        if (this.currentLevel >= 50) return 0;
        return this.getXPForLevel(this.currentLevel + 1) - this.currentXP;
    }

    getXPProgress(): number {
        if (this.currentLevel >= 50) return 1;
        const currentLevelXP = this.getXPForLevel(this.currentLevel);
        const nextLevelXP = this.getXPForLevel(this.currentLevel + 1);
        const progress = (this.currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
        return Math.max(0, Math.min(1, progress));
    }

    addXP(amount: number, source: string = 'unknown'): boolean {
        if (this.currentLevel >= 50) return false;

        const oldLevel = this.currentLevel;
        this.currentXP += amount;
        this.totalXPEarned += amount;

        while (this.currentLevel < 50 && this.currentXP >= this.getXPForLevel(this.currentLevel + 1)) {
            this.currentLevel++;

            if (this.levelRewards[this.currentLevel]) {
                const reward = this.levelRewards[this.currentLevel];
                this.unlockedRewards.push({
                    level: this.currentLevel,
                    ...reward
                });
            }
        }

        this.saveProgress();

        if (this.onXPGain) {
            this.onXPGain(amount, source, this.currentXP, this.getXPProgress());
        }

        if (this.currentLevel > oldLevel && this.onLevelUp) {
            this.onLevelUp(oldLevel, this.currentLevel, this.levelRewards[this.currentLevel]);
        }

        return this.currentLevel > oldLevel;
    }

    getXPForAction(action: XPAction): number {
        const xpValues: Record<XPAction, number> = {
            worm: 5,
            fly: 10,
            goldenWorm: 50,
            butterfly: 25,
            powerup: 15,
            distance100: 2,
            timeMinute: 3,
            achievement: 100
        };
        return xpValues[action] || 0;
    }

    hasUnlocked(type: string, id: string): boolean {
        return this.unlockedRewards.some(r => r.type === type &&
            (r.trailId === id || r.auraId === id || r.accessoryId === id || r.skinId === id));
    }

    getUnlockedByType(type: string): UnlockedReward[] {
        return this.unlockedRewards.filter(r => r.type === type);
    }

    saveProgress(): void {
        try {
            const data = {
                currentXP: this.currentXP,
                currentLevel: this.currentLevel,
                totalXPEarned: this.totalXPEarned,
                unlockedRewards: this.unlockedRewards,
                lastSaved: Date.now()
            };
            localStorage.setItem('birdgame_progression', JSON.stringify(data));
        } catch (e) {
            console.warn('Could not save progression:', e);
        }
    }

    loadProgress(): void {
        try {
            const saved = localStorage.getItem('birdgame_progression');
            if (saved) {
                const data = JSON.parse(saved);

                this.currentXP = typeof data.currentXP === 'number' && data.currentXP >= 0
                    ? Math.floor(data.currentXP) : 0;
                this.currentLevel = typeof data.currentLevel === 'number' &&
                    data.currentLevel >= 1 && data.currentLevel <= 50
                    ? Math.floor(data.currentLevel) : 1;
                this.totalXPEarned = typeof data.totalXPEarned === 'number' && data.totalXPEarned >= 0
                    ? Math.floor(data.totalXPEarned) : 0;
                this.unlockedRewards = Array.isArray(data.unlockedRewards)
                    ? data.unlockedRewards : [];

                const minXPForLevel = this.getXPForLevel(this.currentLevel);
                const maxXPForLevel = this.currentLevel >= 50 ? Infinity : this.getXPForLevel(this.currentLevel + 1);
                if (this.currentXP < minXPForLevel || this.currentXP >= maxXPForLevel) {
                    this.currentLevel = 1;
                    while (this.currentLevel < 50 && this.currentXP >= this.getXPForLevel(this.currentLevel + 1)) {
                        this.currentLevel++;
                    }
                }

                if (!this.unlockedRewards.find(r => r.level === 1)) {
                    this.unlockedRewards.push({
                        level: 1,
                        ...this.levelRewards[1]
                    });
                }
            }
        } catch (e) {
            console.warn('Could not load progression:', e);
            this.currentXP = 0;
            this.currentLevel = 1;
            this.totalXPEarned = 0;
            this.unlockedRewards = [];
        }
    }

    getStats(): ProgressionStats {
        return {
            level: this.currentLevel,
            currentXP: this.currentXP,
            xpToNext: this.getXPToNextLevel(),
            xpProgress: this.getXPProgress(),
            totalXP: this.totalXPEarned,
            unlockedCount: this.unlockedRewards.length,
            nextRewardLevel: this.getNextRewardLevel()
        };
    }

    getNextRewardLevel(): number | null {
        const rewardLevels = Object.keys(this.levelRewards).map(Number).sort((a, b) => a - b);
        return rewardLevels.find(level => level > this.currentLevel) || null;
    }

    reset(): void {
        this.currentXP = 0;
        this.currentLevel = 1;
        this.totalXPEarned = 0;
        this.unlockedRewards = [{
            level: 1,
            ...this.levelRewards[1]
        }];
        this.saveProgress();
    }
}

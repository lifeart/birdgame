// Progression System - XP, Levels, and Rewards
class ProgressionManager {
    constructor() {
        // XP required for each level (exponential curve)
        this.xpTable = this.generateXPTable();

        // Level rewards - what you unlock at each level
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

        // Load saved progress
        this.currentXP = 0;
        this.currentLevel = 1;
        this.totalXPEarned = 0;
        this.unlockedRewards = [];

        this.loadProgress();

        // Callbacks
        this.onLevelUp = null;
        this.onXPGain = null;
    }

    generateXPTable() {
        const table = [0]; // Level 1 = 0 XP
        for (let level = 2; level <= 50; level++) {
            // Exponential curve: each level needs more XP
            // Level 2: 50 XP, Level 10: ~500 XP, Level 50: ~10000 XP
            const xp = Math.floor(50 * Math.pow(1.15, level - 2));
            table.push(table[table.length - 1] + xp);
        }
        return table;
    }

    getXPForLevel(level) {
        if (level <= 1) return 0;
        if (level > 50) return this.xpTable[49];
        return this.xpTable[level - 1];
    }

    getXPToNextLevel() {
        if (this.currentLevel >= 50) return 0;
        return this.getXPForLevel(this.currentLevel + 1) - this.currentXP;
    }

    getXPProgress() {
        if (this.currentLevel >= 50) return 1;
        const currentLevelXP = this.getXPForLevel(this.currentLevel);
        const nextLevelXP = this.getXPForLevel(this.currentLevel + 1);
        const progress = (this.currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
        return Math.max(0, Math.min(1, progress));
    }

    addXP(amount, source = 'unknown') {
        if (this.currentLevel >= 50) return;

        const oldLevel = this.currentLevel;
        this.currentXP += amount;
        this.totalXPEarned += amount;

        // Check for level ups
        while (this.currentLevel < 50 && this.currentXP >= this.getXPForLevel(this.currentLevel + 1)) {
            this.currentLevel++;

            // Check for rewards at this level
            if (this.levelRewards[this.currentLevel]) {
                const reward = this.levelRewards[this.currentLevel];
                this.unlockedRewards.push({
                    level: this.currentLevel,
                    ...reward
                });
            }
        }

        // Save progress
        this.saveProgress();

        // Trigger callbacks
        if (this.onXPGain) {
            this.onXPGain(amount, source, this.currentXP, this.getXPProgress());
        }

        if (this.currentLevel > oldLevel && this.onLevelUp) {
            this.onLevelUp(oldLevel, this.currentLevel, this.levelRewards[this.currentLevel]);
        }

        return this.currentLevel > oldLevel;
    }

    // XP rewards for different actions
    getXPForAction(action) {
        const xpValues = {
            worm: 5,           // Regular worm
            fly: 10,           // Fly (harder to catch)
            goldenWorm: 50,    // Golden worm (rare)
            butterfly: 25,     // Butterfly
            powerup: 15,       // Collecting power-up
            distance100: 2,    // Every 100 meters flown
            timeMinute: 3,     // Every minute played
            achievement: 100   // Achievement unlock
        };
        return xpValues[action] || 0;
    }

    // Check if a reward is unlocked
    hasUnlocked(type, id) {
        return this.unlockedRewards.some(r => r.type === type &&
            (r.trailId === id || r.auraId === id || r.accessoryId === id || r.skinId === id));
    }

    // Get all unlocked items of a type
    getUnlockedByType(type) {
        return this.unlockedRewards.filter(r => r.type === type);
    }

    // Save/Load from localStorage
    saveProgress() {
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

    loadProgress() {
        try {
            const saved = localStorage.getItem('birdgame_progression');
            if (saved) {
                const data = JSON.parse(saved);

                // Validate loaded data
                this.currentXP = typeof data.currentXP === 'number' && data.currentXP >= 0
                    ? Math.floor(data.currentXP) : 0;
                this.currentLevel = typeof data.currentLevel === 'number' &&
                    data.currentLevel >= 1 && data.currentLevel <= 50
                    ? Math.floor(data.currentLevel) : 1;
                this.totalXPEarned = typeof data.totalXPEarned === 'number' && data.totalXPEarned >= 0
                    ? Math.floor(data.totalXPEarned) : 0;
                this.unlockedRewards = Array.isArray(data.unlockedRewards)
                    ? data.unlockedRewards : [];

                // Validate that currentXP matches currentLevel
                const minXPForLevel = this.getXPForLevel(this.currentLevel);
                const maxXPForLevel = this.getXPForLevel(this.currentLevel + 1);
                if (this.currentXP < minXPForLevel || this.currentXP >= maxXPForLevel) {
                    // Recalculate level from XP
                    this.currentLevel = 1;
                    while (this.currentLevel < 50 && this.currentXP >= this.getXPForLevel(this.currentLevel + 1)) {
                        this.currentLevel++;
                    }
                }

                // Ensure level 1 rewards are unlocked
                if (!this.unlockedRewards.find(r => r.level === 1)) {
                    this.unlockedRewards.push({
                        level: 1,
                        ...this.levelRewards[1]
                    });
                }
            }
        } catch (e) {
            console.warn('Could not load progression:', e);
            // Reset to defaults on error
            this.currentXP = 0;
            this.currentLevel = 1;
            this.totalXPEarned = 0;
            this.unlockedRewards = [];
        }
    }

    // Get stats for display
    getStats() {
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

    getNextRewardLevel() {
        const rewardLevels = Object.keys(this.levelRewards).map(Number).sort((a, b) => a - b);
        return rewardLevels.find(level => level > this.currentLevel) || null;
    }

    // Reset progress (for testing)
    reset() {
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

// Global instance
const progressionManager = new ProgressionManager();

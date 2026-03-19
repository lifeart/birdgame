export class ComboManager {
    private streak: number = 0;
    private lastCollectionTime: number = 0;
    private comboWindow: number = 5000; // 5 seconds

    registerCollection(isGolden: boolean = false): number {
        const now = Date.now();
        if (now - this.lastCollectionTime <= this.comboWindow) {
            this.streak++;
        } else {
            this.streak = 1;
        }
        this.lastCollectionTime = now;
        // Golden worms excluded from multiplier (but count toward streak)
        if (isGolden) return 1;
        return this.getMultiplier();
    }

    getMultiplier(): number {
        if (this.streak >= 8) return 3;
        if (this.streak >= 5) return 2;
        if (this.streak >= 3) return 1.5;
        return 1;
    }

    getStreak(): number { return this.streak; }

    isActive(): boolean {
        return this.streak >= 3 && (Date.now() - this.lastCollectionTime) <= this.comboWindow;
    }

    reset(): void {
        this.streak = 0;
        this.lastCollectionTime = 0;
    }
}

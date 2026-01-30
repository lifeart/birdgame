// Daily Rewards Modal Component
import type { DailyRewardsManager } from '../../core/rewards.ts';
import type { ProgressionManager } from '../../core/progression.ts';

export interface DailyRewardModalCallbacks {
    onXPNotification: (amount: number, type: string) => void;
}

export class DailyRewardsModal {
    private popup: HTMLElement | null;
    private calendar: HTMLElement | null;
    private currentReward: HTMLElement | null;
    private streakInfo: HTMLElement | null;
    private claimBtn: HTMLButtonElement | null;
    private closeBtn: HTMLElement | null;

    private boundClaimHandler: EventListener | null = null;
    private boundCloseHandler: EventListener | null = null;

    constructor() {
        this.popup = document.getElementById('dailyRewardPopup');
        this.calendar = document.getElementById('dailyRewardCalendar');
        this.currentReward = document.getElementById('currentReward');
        this.streakInfo = document.getElementById('streakInfo');
        this.claimBtn = document.getElementById('claimRewardBtn') as HTMLButtonElement | null;
        this.closeBtn = document.getElementById('closeDailyPopup');
    }

    show(
        rewardsManager: DailyRewardsManager | null,
        progressionManager: ProgressionManager | null,
        callbacks: DailyRewardModalCallbacks
    ): void {
        if (!this.popup || !rewardsManager) return;

        const updateCalendarUI = (): void => {
            this.updateCalendar(rewardsManager);
            this.updateCurrentReward(rewardsManager);
            this.updateStreakInfo(rewardsManager);
            this.updateClaimButton(rewardsManager);
        };

        updateCalendarUI();
        this.popup.classList.remove('hidden');

        this.setupHandlers(rewardsManager, progressionManager, callbacks, updateCalendarUI);
    }

    hide(): void {
        this.popup?.classList.add('hidden');
    }

    private updateCalendar(rewardsManager: DailyRewardsManager): void {
        if (!this.calendar) return;

        const allRewards = rewardsManager.getAllRewardsInfo();
        this.calendar.innerHTML = allRewards.map((reward) => {
            let dayClass = 'day';
            if (reward.isClaimed) dayClass += ' claimed';
            else if (reward.isToday) dayClass += ' today';
            else dayClass += ' future';

            return `
                <div class="${dayClass}">
                    <div class="day-number">Day ${reward.day}</div>
                    <div class="day-reward">${reward.description}</div>
                </div>
            `;
        }).join('');
    }

    private updateCurrentReward(rewardsManager: DailyRewardsManager): void {
        if (!this.currentReward) return;

        const todayInfo = rewardsManager.getTodayRewardInfo();
        const multiplierText = todayInfo.multiplier > 1
            ? ` (x${todayInfo.multiplier.toFixed(1)} streak bonus!)`
            : '';

        this.currentReward.innerHTML = `
            <div>Today's Reward:</div>
            <div style="font-size: 32px; margin: 10px 0;">${todayInfo.description}${multiplierText}</div>
        `;
    }

    private updateStreakInfo(rewardsManager: DailyRewardsManager): void {
        if (!this.streakInfo) return;

        const todayInfo = rewardsManager.getTodayRewardInfo();
        const nextBonus = todayInfo.nextStreakBonus;

        let streakText = `<span class="streak-count">${todayInfo.currentStreak}</span> day streak!`;
        if (nextBonus) {
            streakText += ` <br><small>${nextBonus.daysNeeded} more days for x${nextBonus.multiplier} bonus</small>`;
        }
        this.streakInfo.innerHTML = streakText;
    }

    private updateClaimButton(rewardsManager: DailyRewardsManager): void {
        if (!this.claimBtn) return;

        const todayInfo = rewardsManager.getTodayRewardInfo();
        this.claimBtn.disabled = !todayInfo.canClaim;
        this.claimBtn.textContent = todayInfo.canClaim ? 'Claim Reward!' : 'Already Claimed';
    }

    private setupHandlers(
        rewardsManager: DailyRewardsManager,
        progressionManager: ProgressionManager | null,
        callbacks: DailyRewardModalCallbacks,
        updateCalendarUI: () => void
    ): void {
        // Remove previous handlers
        if (this.boundClaimHandler && this.claimBtn) {
            this.claimBtn.removeEventListener('click', this.boundClaimHandler);
        }
        if (this.boundCloseHandler && this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.boundCloseHandler);
        }

        const claimHandler = (): void => {
            if (!rewardsManager.canClaim()) return;

            const reward = rewardsManager.claimReward();
            if (reward) {
                const xpAmount = reward.finalAmount || 0;
                if (xpAmount > 0 && progressionManager) {
                    progressionManager.addXP(xpAmount, 'daily_reward');
                }
                callbacks.onXPNotification(xpAmount, 'daily');
                updateCalendarUI();
            }
        };

        const closeHandler = (): void => {
            this.hide();
        };

        this.boundClaimHandler = claimHandler;
        this.boundCloseHandler = closeHandler;

        this.claimBtn?.addEventListener('click', claimHandler);
        this.closeBtn?.addEventListener('click', closeHandler);
    }

    cleanup(): void {
        if (this.boundClaimHandler && this.claimBtn) {
            this.claimBtn.removeEventListener('click', this.boundClaimHandler);
        }
        if (this.boundCloseHandler && this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.boundCloseHandler);
        }
    }
}

// Level Up Modal Component
import type { AudioManager } from '../../core/audio.ts';

export interface LevelUpReward {
    type: string;
    description: string;
}

export class LevelUpModal {
    private popup: HTMLElement | null;
    private newLevelEl: HTMLElement | null;
    private levelRewardEl: HTMLElement | null;
    private closeBtn: HTMLElement | null;
    private boundCloseHandler: EventListener | null = null;

    constructor() {
        this.popup = document.getElementById('levelUpPopup');
        this.newLevelEl = document.getElementById('newLevel');
        this.levelRewardEl = document.getElementById('levelReward');
        this.closeBtn = document.getElementById('closeLevelUp');
    }

    show(
        newLevel: number,
        reward: LevelUpReward | null,
        audioManager: AudioManager | null
    ): void {
        if (!this.popup) return;

        if (this.newLevelEl) {
            this.newLevelEl.textContent = `Level ${newLevel}`;
        }

        if (this.levelRewardEl && reward) {
            const icon = this.getRewardIcon(reward.type);
            this.levelRewardEl.innerHTML = `
                <div class="reward-icon">${icon}</div>
                <div>${reward.description}</div>
            `;
        } else if (this.levelRewardEl) {
            this.levelRewardEl.innerHTML = '<div>Keep collecting to unlock rewards!</div>';
        }

        this.popup.classList.remove('hidden');
        audioManager?.playLevelUp();

        this.setupCloseHandler();
    }

    hide(): void {
        this.popup?.classList.add('hidden');
    }

    private getRewardIcon(type: string): string {
        switch (type) {
            case 'trail': return '✨';
            case 'aura': return '🌟';
            case 'accessory': return '👑';
            case 'legendary': return '🏆';
            default: return '🎉';
        }
    }

    private setupCloseHandler(): void {
        if (this.boundCloseHandler && this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.boundCloseHandler);
        }

        const closeHandler = (): void => {
            this.hide();
        };
        this.boundCloseHandler = closeHandler;

        this.closeBtn?.addEventListener('click', closeHandler);
    }

    cleanup(): void {
        if (this.boundCloseHandler && this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.boundCloseHandler);
        }
    }
}

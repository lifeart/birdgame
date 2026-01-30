// Leaderboard Component

export interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    bird?: string;
}

const LEADERBOARD_STYLES = `
    #leaderboard {
        position: fixed;
        top: 120px;
        left: 15px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        color: white;
        font-size: 12px;
        z-index: 100;
        min-width: 180px;
        max-width: 220px;
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: none;
    }
    #leaderboard.visible { display: block; }
    @media (max-width: 768px) {
        #leaderboard {
            top: auto;
            bottom: 60px;
            left: auto;
            right: 60px;
            min-width: 140px;
            max-width: 160px;
            font-size: 11px;
        }
        .leaderboard-header { padding: 6px 10px; }
        .leaderboard-title { font-size: 12px; }
        .leaderboard-content { max-height: 150px; }
        .leaderboard-list { padding: 6px; }
        .leaderboard-entry { padding: 3px 0; }
        .leaderboard-rank { width: 20px; font-size: 11px; }
    }
    @media (max-height: 500px) and (orientation: landscape) {
        #leaderboard {
            top: auto;
            bottom: 10px;
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            max-height: 100px;
        }
        .leaderboard-content { max-height: 60px; }
    }
    .leaderboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
    }
    .leaderboard-title { font-weight: bold; font-size: 14px; }
    .leaderboard-toggle {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
        transition: transform 0.2s;
    }
    .leaderboard-toggle.collapsed { transform: rotate(-90deg); }
    .leaderboard-content {
        max-height: 300px;
        overflow: hidden;
        transition: max-height 0.3s ease;
    }
    .leaderboard-content.collapsed { max-height: 0; }
    .leaderboard-list { padding: 8px; }
    .leaderboard-entry {
        display: flex;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .leaderboard-entry:last-child { border-bottom: none; }
    .leaderboard-entry.highlight {
        background: rgba(255, 215, 0, 0.2);
        margin: 0 -8px;
        padding: 4px 8px;
        border-radius: 4px;
    }
    .leaderboard-rank { width: 24px; font-weight: bold; color: #888; }
    .leaderboard-rank.gold { color: #ffd700; }
    .leaderboard-rank.silver { color: #c0c0c0; }
    .leaderboard-rank.bronze { color: #cd7f32; }
    .leaderboard-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 8px;
    }
    .leaderboard-score { font-weight: bold; color: #4CAF50; }
    .leaderboard-empty {
        text-align: center;
        color: #888;
        padding: 16px 8px;
        font-style: italic;
    }
`;

export class LeaderboardComponent {
    private element: HTMLElement | null = null;
    private listElement: HTMLElement | null = null;
    private styleElement: HTMLStyleElement | null = null;
    private visible: boolean = false;
    private boundToggleHandler: EventListener | null = null;

    constructor() {
        this.create();
    }

    private create(): void {
        // Create leaderboard element
        this.element = document.createElement('div');
        this.element.id = 'leaderboard';
        this.element.innerHTML = `
            <div class="leaderboard-header">
                <span class="leaderboard-title">Leaderboard</span>
                <button class="leaderboard-toggle" id="leaderboard-toggle">▼</button>
            </div>
            <div class="leaderboard-content" id="leaderboard-content">
                <div class="leaderboard-list" id="leaderboard-list"></div>
            </div>
        `;
        document.body.appendChild(this.element);

        // Create styles
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = LEADERBOARD_STYLES;
        document.head.appendChild(this.styleElement);

        // Cache list element
        this.listElement = document.getElementById('leaderboard-list');

        // Setup toggle handler
        this.setupToggle();
    }

    private setupToggle(): void {
        const header = this.element?.querySelector('.leaderboard-header');
        const toggle = document.getElementById('leaderboard-toggle');
        const content = document.getElementById('leaderboard-content');

        if (header) {
            this.boundToggleHandler = (): void => {
                toggle?.classList.toggle('collapsed');
                content?.classList.toggle('collapsed');
            };
            header.addEventListener('click', this.boundToggleHandler);
        }
    }

    show(): void {
        this.element?.classList.add('visible');
        this.visible = true;
    }

    hide(): void {
        this.element?.classList.remove('visible');
        this.visible = false;
    }

    isVisible(): boolean {
        return this.visible;
    }

    update(entries: LeaderboardEntry[], highlightName?: string): void {
        if (!this.listElement) return;

        if (entries.length === 0) {
            this.listElement.innerHTML = '<div class="leaderboard-empty">No players yet</div>';
            return;
        }

        this.listElement.innerHTML = entries.map(entry => {
            const isHighlighted = highlightName && entry.name === highlightName;
            const rankClass = this.getRankClass(entry.rank);

            return `
                <div class="leaderboard-entry${isHighlighted ? ' highlight' : ''}">
                    <span class="leaderboard-rank ${rankClass}">#${entry.rank}</span>
                    <span class="leaderboard-name">${this.escapeHtml(entry.name)}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                </div>
            `;
        }).join('');
    }

    private getRankClass(rank: number): string {
        switch (rank) {
            case 1: return 'gold';
            case 2: return 'silver';
            case 3: return 'bronze';
            default: return '';
        }
    }

    private escapeHtml(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    cleanup(): void {
        const header = this.element?.querySelector('.leaderboard-header');
        if (this.boundToggleHandler && header) {
            header.removeEventListener('click', this.boundToggleHandler);
        }

        this.element?.remove();
        this.styleElement?.remove();
    }
}

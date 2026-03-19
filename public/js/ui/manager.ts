// UI Manager - handles menus, chat, and HUD
import { BIRD_TYPES, type BirdTypeName } from '../bird/types.ts';
import { AudioManager } from '../core/audio.ts';
import { ProgressionManager } from '../core/progression.ts';
import { DailyRewardsManager } from '../core/rewards.ts';
import {
    STORAGE_KEY_PLAYER_NAME,
    STORAGE_KEY_BIRD_TYPE,
    STORAGE_KEY_LOCATION
} from '../core/constants.ts';
import { generateRandomName } from '../shared/constants.ts';

// Re-export for backward compatibility
export { generateRandomName };

export function loadSavedName(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || '';
    } catch {
        return '';
    }
}

export function saveName(name: string): void {
    try {
        localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);
    } catch {
        // localStorage not available
    }
}

export function loadSavedBird(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_BIRD_TYPE) || 'sparrow';
    } catch {
        return 'sparrow';
    }
}

export function saveBird(bird: string): void {
    try {
        localStorage.setItem(STORAGE_KEY_BIRD_TYPE, bird);
    } catch {
        // localStorage not available
    }
}

export function loadSavedLocation(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_LOCATION) || 'city';
    } catch {
        return 'city';
    }
}

export function saveLocation(location: string): void {
    try {
        localStorage.setItem(STORAGE_KEY_LOCATION, location);
    } catch {
        // localStorage not available
    }
}

interface StartGameData {
    playerName: string;
    bird: string;
    location: string;
}

interface PlayerInfo {
    name: string;
    bird: string;
    score: number;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
}

interface ConnectionStatusData {
    attempt?: number;
    maxAttempts?: number;
    reason?: string;
}

interface CreateRoomData {
    playerName: string;
    bird: string;
    location: string;
}

interface JoinRoomData {
    roomCode: string;
    playerName: string;
    bird: string;
    location: string;
}

// Type-safe UI event map
interface UIEventMap {
    startGame: StartGameData;
    sendChat: string;
    changeLocation: string;
    resumeGame: undefined;
    createRoom: CreateRoomData;
    joinRoom: JoinRoomData;
}

type UICallback<K extends keyof UIEventMap = keyof UIEventMap> = (data: UIEventMap[K]) => void;

export class UIManager {
    private menu: HTMLElement;
    private pauseMenu: HTMLElement;
    private gameUI: HTMLElement;
    private chat: HTMLElement;
    private chatMessages: HTMLElement;
    private chatInput: HTMLInputElement;
    private scoreDisplay: HTMLElement;
    private playerList: HTMLElement;
    private playerNameInput: HTMLInputElement;
    private loadingOverlay: HTMLElement | null;
    private loadingText: HTMLElement | null;
    private loadingProgressBar: HTMLElement | null;

    private selectedBird: string;
    private selectedLocation: string;
    private chatOpen: boolean = false;
    private leaderboardVisible: boolean = false;
    private loadingProgress: number = 0;

    private callbacks: { [K in keyof UIEventMap]?: Array<UICallback<K>> } = {};

    private cameraModeTimeout: ReturnType<typeof setTimeout> | null = null;
    private connectionStatusTimeout: ReturnType<typeof setTimeout> | null = null;
    private xpNotificationTimeout: ReturnType<typeof setTimeout> | null = null;
    private goldenWormTimeout: ReturnType<typeof setTimeout> | null = null;

    // Bound event handlers for cleanup
    private boundMenuHandlers: Array<{ element: Element; handler: EventListener }> = [];
    private boundDailyRewardHandlers: { claim: EventListener | null; close: EventListener | null } = { claim: null, close: null };
    private boundLevelUpCloseHandler: EventListener | null = null;
    private leaderboardStyleElement: HTMLStyleElement | null = null;

    constructor() {
        this.menu = document.getElementById('menu')!;
        this.pauseMenu = document.getElementById('pauseMenu')!;
        this.gameUI = document.getElementById('gameUI')!;
        this.chat = document.getElementById('chat')!;
        this.chatMessages = document.getElementById('chatMessages')!;
        this.chatInput = document.getElementById('chatInput') as HTMLInputElement;
        this.scoreDisplay = document.getElementById('score')!;
        this.playerList = document.getElementById('playerList')!;
        this.playerNameInput = document.getElementById('playerName') as HTMLInputElement;
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = this.loadingOverlay?.querySelector('.loading-text') || null;
        this.loadingProgressBar = this.loadingOverlay?.querySelector('.loading-progress-bar') || null;

        this.selectedBird = loadSavedBird();
        this.selectedLocation = loadSavedLocation();

        this.loadSavedPreferences();
        this.setupMenuEvents();
        this.setupChatEvents();
        this.setupChatToggle();
        this.createLeaderboard();
        this.setupMultiplayerEvents();
    }

    private loadSavedPreferences(): void {
        let savedName = loadSavedName();
        if (!savedName) {
            savedName = generateRandomName();
            saveName(savedName);
        }
        this.playerNameInput.value = savedName;

        document.querySelectorAll('.bird-option').forEach(o => {
            o.classList.toggle('selected', (o as HTMLElement).dataset.bird === this.selectedBird);
        });

        document.querySelectorAll('#menu .location-option').forEach(o => {
            o.classList.toggle('selected', (o as HTMLElement).dataset.location === this.selectedLocation);
        });
    }

    private setupMenuEvents(): void {
        document.querySelectorAll('.bird-option').forEach(option => {
            const handler = (): void => {
                document.querySelectorAll('.bird-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBird = (option as HTMLElement).dataset.bird || 'sparrow';
                saveBird(this.selectedBird);
            };
            option.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: option, handler });
        });

        document.querySelectorAll('#menu .location-option').forEach(option => {
            const handler = (): void => {
                document.querySelectorAll('#menu .location-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedLocation = (option as HTMLElement).dataset.location || 'city';
                saveLocation(this.selectedLocation);
            };
            option.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: option, handler });
        });

        const startGameBtn = document.getElementById('startGame');
        if (startGameBtn) {
            const handler = (): void => {
                let playerName = this.sanitizePlayerName(this.playerNameInput.value);

                if (!playerName) {
                    playerName = generateRandomName();
                    this.playerNameInput.value = playerName;
                }

                saveName(playerName);

                this.triggerCallback('startGame', {
                    playerName: playerName,
                    bird: this.selectedBird,
                    location: this.selectedLocation
                } as StartGameData);
            };
            startGameBtn.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: startGameBtn, handler });
        }

        document.querySelectorAll('.pause-location .location-option').forEach(option => {
            const handler = (): void => {
                document.querySelectorAll('.pause-location .location-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                const location = (option as HTMLElement).dataset.location || 'city';
                this.triggerCallback('changeLocation', location);
            };
            option.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: option, handler });
        });

        const resumeGameBtn = document.getElementById('resumeGame');
        if (resumeGameBtn) {
            const handler = (): void => {
                this.hidePauseMenu();
                this.triggerCallback('resumeGame', undefined);
            };
            resumeGameBtn.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: resumeGameBtn, handler });
        }
    }

    private setupChatToggle(): void {
        const chatHeader = document.getElementById('chat-header');
        const chatToggle = document.getElementById('chat-toggle');
        const chatContent = document.getElementById('chat-content');

        if (chatHeader && chatToggle && chatContent) {
            const handler = (): void => {
                chatToggle.classList.toggle('collapsed');
                chatContent.classList.toggle('collapsed');
            };
            chatHeader.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: chatHeader, handler });
        }
    }

    private setupChatEvents(): void {
        this.chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                const message = this.chatInput.value.trim();
                if (message) {
                    this.triggerCallback('sendChat', message);
                    this.chatInput.value = '';
                }
                this.closeChat();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                this.closeChat();
                e.preventDefault();
            }
        });

        this.chatInput.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });

        this.chatInput.addEventListener('focus', () => {
            this.chatOpen = true;
        });

        this.chatInput.addEventListener('blur', () => {
            this.chatOpen = false;
        });
    }

    showMenu(): void {
        this.menu.classList.remove('hidden');
        this.gameUI.classList.add('hidden');
        this.chat.classList.add('hidden');
        this.pauseMenu.classList.add('hidden');
        this.hideLeaderboard();
    }

    hideMenu(): void {
        this.menu.classList.add('hidden');
        this.gameUI.classList.remove('hidden');
        this.chat.classList.remove('hidden');
    }

    showPauseMenu(): void {
        this.pauseMenu.classList.remove('hidden');
        document.querySelectorAll('.pause-location .location-option').forEach(o => {
            o.classList.toggle('selected', (o as HTMLElement).dataset.location === this.selectedLocation);
        });
    }

    hidePauseMenu(): void {
        this.pauseMenu.classList.add('hidden');
    }

    isPauseMenuOpen(): boolean {
        return !this.pauseMenu.classList.contains('hidden');
    }

    updateScore(score: number): void {
        this.scoreDisplay.textContent = `Worms: ${score}`;
    }

    updatePlayerList(players: PlayerInfo[]): void {
        const existingEntries = new Map<string, HTMLElement>();
        Array.from(this.playerList.children).forEach(child => {
            const name = (child as HTMLElement).dataset.playerName;
            if (name) existingEntries.set(name, child as HTMLElement);
        });

        const currentNames = new Set<string>();

        players.forEach(p => {
            const playerKey = p.name;
            currentNames.add(playerKey);

            const birdName = BIRD_TYPES[p.bird as BirdTypeName]?.name || this.escapeHtml(p.bird);
            const displayText = `${this.escapeHtml(p.name)} (${birdName}) - ${p.score}`;
            const color = this.getBirdColor(p.bird);

            const existing = existingEntries.get(playerKey);
            if (existing) {
                if (existing.textContent !== displayText || existing.style.color !== color) {
                    existing.textContent = displayText;
                    existing.style.color = color;
                }
            } else {
                const div = document.createElement('div');
                div.className = 'player-entry';
                div.dataset.playerName = playerKey;
                div.style.color = color;
                div.textContent = displayText;
                this.playerList.appendChild(div);
            }
        });

        existingEntries.forEach((element, name) => {
            if (!currentNames.has(name)) {
                element.remove();
            }
        });
    }

    private getBirdColor(birdType: string): string {
        const colors: Record<string, string> = {
            sparrow: '#A0826D',
            pigeon: '#A9A9A9',
            crow: '#666666',
            hummingbird: '#00ff88',
            penguin: '#FF6B00',
            owl: '#C9B28F',
            goose: '#F2A33A'
        };
        return colors[birdType] || '#ffffff';
    }

    openChat(): void {
        this.chatOpen = true;
        this.chatInput.focus();
    }

    closeChat(): void {
        this.chatOpen = false;
        this.chatInput.blur();
    }

    isChatOpen(): boolean {
        return this.chatOpen;
    }

    addChatMessage(name: string, message: string, isSystem: boolean = false): void {
        const div = document.createElement('div');
        if (isSystem) {
            div.className = 'system-message';
            div.textContent = message;
        } else {
            div.className = 'chat-message';
            div.innerHTML = `<span class="name">${this.escapeHtml(name)}:</span> ${this.escapeHtml(message)}`;
        }
        this.chatMessages.appendChild(div);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        while (this.chatMessages.children.length > 50) {
            this.chatMessages.removeChild(this.chatMessages.firstChild!);
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private sanitizePlayerName(name: string): string {
        return name
            .trim()
            .slice(0, 20)  // Max 20 characters
            .replace(/[<>&"']/g, '');  // Remove dangerous chars
    }

    setLocation(location: string): void {
        this.selectedLocation = location;
    }

    showLoading(text: string = 'Loading...'): void {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
            if (this.loadingText) {
                this.loadingText.textContent = text;
            }
            this.setLoadingProgress(0);
        }
    }

    hideLoading(): void {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    setLoadingProgress(percent: number): void {
        this.loadingProgress = Math.min(100, Math.max(0, percent));
        if (this.loadingProgressBar) {
            this.loadingProgressBar.style.width = `${this.loadingProgress}%`;
        }
    }

    setLoadingText(text: string): void {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    showCameraMode(modeName: string): void {
        let notification = document.getElementById('camera-mode-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'camera-mode-notification';
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                z-index: 1000;
                pointer-events: none;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = `Camera: ${modeName}`;
        notification.style.opacity = '1';

        if (this.cameraModeTimeout) {
            clearTimeout(this.cameraModeTimeout);
        }

        this.cameraModeTimeout = setTimeout(() => {
            notification!.style.opacity = '0';
        }, 1500);
    }

    showConnectionStatus(status: string, data: ConnectionStatusData = {}): void {
        let indicator = document.getElementById('connection-status');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-status';
            indicator.style.cssText = `
                position: fixed;
                bottom: calc(10px + env(safe-area-inset-bottom, 0px));
                right: calc(10px + env(safe-area-inset-right, 0px));
                left: auto;
                transform: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 80;
                transition: opacity 0.3s, background 0.3s;
            `;
            document.body.appendChild(indicator);
        }

        switch (status) {
            case 'connecting':
                indicator.textContent = 'Connecting...';
                indicator.style.background = 'rgba(255, 165, 0, 0.9)';
                indicator.style.color = '#000';
                indicator.style.opacity = '1';
                break;
            case 'connected':
                indicator.textContent = 'Connected';
                indicator.style.background = 'rgba(0, 200, 0, 0.9)';
                indicator.style.color = '#fff';
                indicator.style.opacity = '1';
                if (this.connectionStatusTimeout) {
                    clearTimeout(this.connectionStatusTimeout);
                }
                this.connectionStatusTimeout = setTimeout(() => {
                    indicator!.style.opacity = '0';
                }, 2000);
                break;
            case 'disconnected':
                indicator.textContent = 'Disconnected';
                indicator.style.background = 'rgba(255, 0, 0, 0.9)';
                indicator.style.color = '#fff';
                indicator.style.opacity = '1';
                break;
            case 'reconnecting':
                indicator.textContent = `Reconnecting (${data.attempt}/${data.maxAttempts})...`;
                indicator.style.background = 'rgba(255, 165, 0, 0.9)';
                indicator.style.color = '#000';
                indicator.style.opacity = '1';
                break;
            case 'failed':
                indicator.textContent = 'Connection Failed';
                indicator.style.background = 'rgba(200, 0, 0, 0.9)';
                indicator.style.color = '#fff';
                indicator.style.opacity = '1';
                break;
        }
    }

    private createLeaderboard(): void {
        const leaderboard = document.createElement('div');
        leaderboard.id = 'leaderboard';
        leaderboard.innerHTML = `
            <div class="leaderboard-header">
                <span class="leaderboard-title">Leaderboard</span>
                <button class="leaderboard-toggle" id="leaderboard-toggle">▼</button>
            </div>
            <div class="leaderboard-content" id="leaderboard-content">
                <div class="leaderboard-list" id="leaderboard-list"></div>
            </div>
        `;
        document.body.appendChild(leaderboard);

        const style = document.createElement('style');
        style.textContent = `
            #leaderboard {
                position: fixed;
                top: 120px;
                left: calc(15px + env(safe-area-inset-left, 0px));
                background: rgba(0, 0, 0, 0.7);
                border-radius: 8px;
                color: white;
                font-size: 12px;
                z-index: 55;
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
                    bottom: calc(60px + env(safe-area-inset-bottom, 0px));
                    left: auto;
                    right: calc(60px + env(safe-area-inset-right, 0px));
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
                    top: 50px;
                    bottom: auto;
                    left: auto;
                    right: calc(10px + env(safe-area-inset-right, 0px));
                    transform: none;
                    max-width: 140px;
                    max-height: 120px;
                }
                .leaderboard-content { max-height: 70px; }
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
        document.head.appendChild(style);
        this.leaderboardStyleElement = style;

        const header = leaderboard.querySelector('.leaderboard-header');
        const toggle = document.getElementById('leaderboard-toggle');
        const content = document.getElementById('leaderboard-content');

        if (header) {
            const handler = (): void => {
                toggle?.classList.toggle('collapsed');
                content?.classList.toggle('collapsed');
            };
            header.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: header, handler });
        }
    }

    showLeaderboard(): void {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.classList.add('visible');
            this.leaderboardVisible = true;
        }
    }

    hideLeaderboard(): void {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.classList.remove('visible');
            this.leaderboardVisible = false;
        }
    }

    updateLeaderboard(entries: LeaderboardEntry[] | null, currentPlayerName: string | null = null): void {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;

        if (!entries || entries.length === 0) {
            list.innerHTML = '<div class="leaderboard-empty">No scores yet</div>';
            return;
        }

        list.innerHTML = entries.map(entry => {
            const rankClass = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : '';
            const isCurrentPlayer = currentPlayerName &&
                entry.name.toLowerCase() === currentPlayerName.toLowerCase();
            const highlightClass = isCurrentPlayer ? 'highlight' : '';
            const escapedName = this.escapeHtml(entry.name);

            return `
                <div class="leaderboard-entry ${highlightClass}">
                    <span class="leaderboard-rank ${rankClass}">#${entry.rank}</span>
                    <span class="leaderboard-name" title="${escapedName}">${escapedName}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                </div>
            `;
        }).join('');
    }

    on<K extends keyof UIEventMap>(event: K, callback: UICallback<K>): void {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        (this.callbacks[event] as Array<UICallback<K>>).push(callback);
    }

    private triggerCallback<K extends keyof UIEventMap>(event: K, data: UIEventMap[K]): void {
        const callbacks = this.callbacks[event] as Array<UICallback<K>> | undefined;
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in UI callback for '${event}':`, e);
                }
            });
        }
    }

    // ==================== MULTIPLAYER UI ====================

    private setupMultiplayerEvents(): void {
        const createRoomBtn = document.getElementById('createRoom');
        const joinRoomBtn = document.getElementById('joinRoom');
        const roomCodeInput = document.getElementById('roomCode') as HTMLInputElement | null;
        const copyRoomCodeBtn = document.getElementById('copyRoomCode');

        if (createRoomBtn) {
            const handler = (): void => {
                let playerName = this.sanitizePlayerName(this.playerNameInput.value);
                if (!playerName) {
                    playerName = generateRandomName();
                    this.playerNameInput.value = playerName;
                }
                saveName(playerName);
                this.triggerCallback('createRoom', {
                    playerName,
                    bird: this.selectedBird,
                    location: this.selectedLocation,
                });
            };
            createRoomBtn.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: createRoomBtn, handler });
        }

        if (joinRoomBtn && roomCodeInput) {
            const handler = (): void => {
                const roomCode = roomCodeInput.value.trim().toUpperCase();
                if (!roomCode || roomCode.length < 4) {
                    roomCodeInput.style.borderColor = '#ff4444';
                    setTimeout(() => { roomCodeInput.style.borderColor = ''; }, 1500);
                    return;
                }
                let playerName = this.sanitizePlayerName(this.playerNameInput.value);
                if (!playerName) {
                    playerName = generateRandomName();
                    this.playerNameInput.value = playerName;
                }
                saveName(playerName);
                this.triggerCallback('joinRoom', {
                    roomCode,
                    playerName,
                    bird: this.selectedBird,
                    location: this.selectedLocation,
                });
            };
            joinRoomBtn.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: joinRoomBtn, handler });
        }

        if (copyRoomCodeBtn) {
            const handler = (): void => {
                const codeDisplay = document.getElementById('roomCodeDisplay');
                if (codeDisplay?.textContent) {
                    navigator.clipboard.writeText(codeDisplay.textContent).catch(() => {});
                    copyRoomCodeBtn.textContent = 'Copied!';
                    setTimeout(() => { copyRoomCodeBtn.textContent = 'Copy'; }, 1500);
                }
            };
            copyRoomCodeBtn.addEventListener('click', handler);
            this.boundMenuHandlers.push({ element: copyRoomCodeBtn, handler });
        }
    }

    showRoomCode(code: string): void {
        const roomInfo = document.getElementById('roomInfo');
        const codeDisplay = document.getElementById('roomCodeDisplay');
        if (roomInfo && codeDisplay) {
            codeDisplay.textContent = code;
            roomInfo.classList.remove('hidden');
        }
        this.addChatMessage('', `Room created! Code: ${code}`, true);
    }

    cleanup(): void {
        // Clear all timeouts
        if (this.cameraModeTimeout) {
            clearTimeout(this.cameraModeTimeout);
            this.cameraModeTimeout = null;
        }
        if (this.connectionStatusTimeout) {
            clearTimeout(this.connectionStatusTimeout);
            this.connectionStatusTimeout = null;
        }
        if (this.xpNotificationTimeout) {
            clearTimeout(this.xpNotificationTimeout);
            this.xpNotificationTimeout = null;
        }
        if (this.goldenWormTimeout) {
            clearTimeout(this.goldenWormTimeout);
            this.goldenWormTimeout = null;
        }

        // Remove all stored event listeners
        this.boundMenuHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.boundMenuHandlers = [];

        // Remove daily reward handlers
        const claimBtn = document.getElementById('claimRewardBtn');
        const closeDailyBtn = document.getElementById('closeDailyPopup');
        if (this.boundDailyRewardHandlers.claim && claimBtn) {
            claimBtn.removeEventListener('click', this.boundDailyRewardHandlers.claim);
        }
        if (this.boundDailyRewardHandlers.close && closeDailyBtn) {
            closeDailyBtn.removeEventListener('click', this.boundDailyRewardHandlers.close);
        }
        this.boundDailyRewardHandlers = { claim: null, close: null };

        // Remove level up handler
        const closeLevelUpBtn = document.getElementById('closeLevelUp');
        if (this.boundLevelUpCloseHandler && closeLevelUpBtn) {
            closeLevelUpBtn.removeEventListener('click', this.boundLevelUpCloseHandler);
        }
        this.boundLevelUpCloseHandler = null;

        // Remove dynamically created elements
        const notification = document.getElementById('camera-mode-notification');
        if (notification) notification.remove();
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) connectionStatus.remove();
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) leaderboard.remove();

        // Remove leaderboard style element
        if (this.leaderboardStyleElement) {
            this.leaderboardStyleElement.remove();
            this.leaderboardStyleElement = null;
        }

        this.callbacks = {};
    }

    // ==================== PROGRESSION UI ====================

    updateLevelDisplay(level: number, xpProgress: number, xpToNext: number): void {
        const levelNumber = document.getElementById('level-number');
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');

        if (levelNumber) {
            levelNumber.textContent = `Lv.${level}`;
        }
        if (xpFill) {
            (xpFill as HTMLElement).style.width = `${xpProgress * 100}%`;
        }
        if (xpText) {
            xpText.textContent = level >= 50 ? 'MAX' : `${xpToNext} XP`;
        }
    }

    showXPNotification(amount: number, _source: string): void {
        const notification = document.getElementById('xpNotification');
        if (!notification) return;

        if (this.xpNotificationTimeout) {
            clearTimeout(this.xpNotificationTimeout);
        }

        notification.textContent = `+${amount} XP`;
        notification.classList.remove('hidden');

        notification.style.animation = 'none';
        notification.offsetHeight; // Trigger reflow
        notification.style.animation = '';

        this.xpNotificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
        }, 2000);
    }

    showLevelUpPopup(
        _oldLevel: number,
        newLevel: number,
        reward: { type: string; description: string } | null,
        audioManager: AudioManager | null
    ): void {
        const popup = document.getElementById('levelUpPopup');
        const newLevelEl = document.getElementById('newLevel');
        const levelRewardEl = document.getElementById('levelReward');
        const closeBtn = document.getElementById('closeLevelUp');

        if (!popup) return;

        if (newLevelEl) {
            newLevelEl.textContent = `Level ${newLevel}`;
        }

        if (levelRewardEl && reward) {
            let icon = '🎉';
            if (reward.type === 'trail') icon = '✨';
            else if (reward.type === 'aura') icon = '🌟';
            else if (reward.type === 'accessory') icon = '👑';
            else if (reward.type === 'legendary') icon = '🏆';

            levelRewardEl.innerHTML = `
                <div class="reward-icon">${icon}</div>
                <div>${reward.description}</div>
            `;
        } else if (levelRewardEl) {
            levelRewardEl.innerHTML = '<div>Keep collecting to unlock rewards!</div>';
        }

        popup.classList.remove('hidden');

        audioManager?.playLevelUp();

        // Remove previous handler to prevent accumulation
        if (this.boundLevelUpCloseHandler && closeBtn) {
            closeBtn.removeEventListener('click', this.boundLevelUpCloseHandler);
        }

        const closeHandler = (): void => {
            popup.classList.add('hidden');
        };
        this.boundLevelUpCloseHandler = closeHandler;

        if (closeBtn) {
            closeBtn.addEventListener('click', closeHandler);
        }
    }

    // ==================== DAILY REWARDS UI ====================

    showDailyRewardPopup(
        rewardsManager: DailyRewardsManager | null,
        progressionManager: ProgressionManager | null
    ): void {
        const popup = document.getElementById('dailyRewardPopup');
        const calendar = document.getElementById('dailyRewardCalendar');
        const currentReward = document.getElementById('currentReward');
        const streakInfo = document.getElementById('streakInfo');
        const claimBtn = document.getElementById('claimRewardBtn') as HTMLButtonElement | null;
        const closeBtn = document.getElementById('closeDailyPopup');

        if (!popup || !rewardsManager) return;

        // Helper to update the calendar UI
        const updateCalendarUI = (): void => {
            const allRewards = rewardsManager.getAllRewardsInfo();
            if (calendar) {
                calendar.innerHTML = allRewards.map((reward) => {
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

            const todayInfo = rewardsManager.getTodayRewardInfo();
            if (currentReward) {
                const multiplierText = todayInfo.multiplier > 1 ?
                    ` (x${todayInfo.multiplier.toFixed(1)} streak bonus!)` : '';
                currentReward.innerHTML = `
                    <div>Today's Reward:</div>
                    <div style="font-size: 32px; margin: 10px 0;">${todayInfo.description}${multiplierText}</div>
                `;
            }

            if (streakInfo) {
                const nextBonus = todayInfo.nextStreakBonus;
                let streakText = `<span class="streak-count">${todayInfo.currentStreak}</span> day streak!`;
                if (nextBonus) {
                    streakText += ` <br><small>${nextBonus.daysNeeded} more days for x${nextBonus.multiplier} bonus</small>`;
                }
                streakInfo.innerHTML = streakText;
            }

            if (claimBtn) {
                claimBtn.disabled = !todayInfo.canClaim;
                claimBtn.textContent = todayInfo.canClaim ? 'Claim Reward!' : 'Already Claimed';
            }
        };

        // Initial UI update
        updateCalendarUI();
        popup.classList.remove('hidden');

        // Remove previous handlers to prevent accumulation
        if (this.boundDailyRewardHandlers.claim && claimBtn) {
            claimBtn.removeEventListener('click', this.boundDailyRewardHandlers.claim);
        }
        if (this.boundDailyRewardHandlers.close && closeBtn) {
            closeBtn.removeEventListener('click', this.boundDailyRewardHandlers.close);
        }

        const claimHandler = (): void => {
            if (!rewardsManager.canClaim()) return;

            const reward = rewardsManager.claimReward();
            if (reward) {
                if (progressionManager) {
                    const xpAmount = reward.finalAmount || 0;
                    if (xpAmount > 0) {
                        progressionManager.addXP(xpAmount, 'daily_reward');
                    }
                }

                this.showXPNotification(reward.finalAmount || 0, 'daily');
                // Update UI inline instead of recursive call
                updateCalendarUI();
            }
        };

        const closeHandler = (): void => {
            popup.classList.add('hidden');
        };

        // Store handlers for cleanup
        this.boundDailyRewardHandlers.claim = claimHandler;
        this.boundDailyRewardHandlers.close = closeHandler;

        claimBtn?.addEventListener('click', claimHandler);
        closeBtn?.addEventListener('click', closeHandler);
    }

    // ==================== GOLDEN WORM ALERT ====================

    showGoldenWormAlert(audioManager: AudioManager | null): void {
        const alert = document.getElementById('goldenWormAlert');
        if (!alert) return;

        alert.classList.remove('hidden');

        audioManager?.playGoldenWorm();

        if (this.goldenWormTimeout) {
            clearTimeout(this.goldenWormTimeout);
        }
        this.goldenWormTimeout = setTimeout(() => {
            this.goldenWormTimeout = null;
            alert.classList.add('hidden');
        }, 3500);
    }
}

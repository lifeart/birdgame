// Random name generator
const NAME_ADJECTIVES = [
    'Swift', 'Brave', 'Mighty', 'Sneaky', 'Happy', 'Lucky', 'Wild', 'Crazy',
    'Flying', 'Speedy', 'Fluffy', 'Tiny', 'Giant', 'Golden', 'Silver', 'Royal',
    'Cosmic', 'Thunder', 'Storm', 'Fire', 'Ice', 'Shadow', 'Sunny', 'Starry',
    'Noble', 'Fierce', 'Gentle', 'Mystic', 'Ancient', 'Young', 'Bold', 'Shy'
];

const NAME_NOUNS = [
    'Bird', 'Eagle', 'Hawk', 'Falcon', 'Owl', 'Robin', 'Sparrow', 'Finch',
    'Wing', 'Feather', 'Talon', 'Beak', 'Nest', 'Sky', 'Cloud', 'Wind',
    'Flyer', 'Glider', 'Swooper', 'Hunter', 'Seeker', 'Watcher', 'Dancer', 'Singer',
    'Pilot', 'Ace', 'Captain', 'Chief', 'Hero', 'Legend', 'Star', 'Champ'
];

function generateRandomName() {
    const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
    const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

function loadSavedName() {
    try {
        return localStorage.getItem('birdgame_playerName') || '';
    } catch (e) {
        return '';
    }
}

function saveName(name) {
    try {
        localStorage.setItem('birdgame_playerName', name);
    } catch (e) {
        // localStorage not available
    }
}

function loadSavedBird() {
    try {
        return localStorage.getItem('birdgame_birdType') || 'sparrow';
    } catch (e) {
        return 'sparrow';
    }
}

function saveBird(bird) {
    try {
        localStorage.setItem('birdgame_birdType', bird);
    } catch (e) {
        // localStorage not available
    }
}

function loadSavedLocation() {
    try {
        return localStorage.getItem('birdgame_location') || 'city';
    } catch (e) {
        return 'city';
    }
}

function saveLocation(location) {
    try {
        localStorage.setItem('birdgame_location', location);
    } catch (e) {
        // localStorage not available
    }
}

// UI Manager - handles menus, chat, and HUD
class UIManager {
    constructor() {
        this.menu = document.getElementById('menu');
        this.pauseMenu = document.getElementById('pauseMenu');
        this.gameUI = document.getElementById('gameUI');
        this.chat = document.getElementById('chat');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.scoreDisplay = document.getElementById('score');
        this.playerList = document.getElementById('playerList');
        this.playerNameInput = document.getElementById('playerName');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = this.loadingOverlay?.querySelector('.loading-text');
        this.loadingProgressBar = this.loadingOverlay?.querySelector('.loading-progress-bar');

        // Load saved preferences or generate defaults
        this.selectedBird = loadSavedBird();
        this.selectedLocation = loadSavedLocation();
        this.chatOpen = false;
        this.leaderboardVisible = false;
        this.loadingProgress = 0;

        this.callbacks = {};

        this.loadSavedPreferences();
        this.setupMenuEvents();
        this.setupChatEvents();
        this.setupChatToggle();
        this.createLeaderboard();
    }

    loadSavedPreferences() {
        // Load or generate player name
        let savedName = loadSavedName();
        if (!savedName) {
            // Generate a unique random name for new players
            savedName = generateRandomName();
            saveName(savedName);
        }
        this.playerNameInput.value = savedName;

        // Apply saved bird selection
        document.querySelectorAll('.bird-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.bird === this.selectedBird);
        });

        // Apply saved location selection
        document.querySelectorAll('#menu .location-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.location === this.selectedLocation);
        });
    }

    setupMenuEvents() {
        // Bird selection
        document.querySelectorAll('.bird-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.bird-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBird = option.dataset.bird;
                saveBird(this.selectedBird);
            });
        });

        // Location selection (main menu)
        document.querySelectorAll('#menu .location-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('#menu .location-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedLocation = option.dataset.location;
                saveLocation(this.selectedLocation);
            });
        });

        // Start game button
        document.getElementById('startGame').addEventListener('click', () => {
            let playerName = this.playerNameInput.value.trim();

            // Generate random name if empty
            if (!playerName) {
                playerName = generateRandomName();
                this.playerNameInput.value = playerName;
            }

            // Save name for next session
            saveName(playerName);

            this.triggerCallback('startGame', {
                playerName: playerName,
                bird: this.selectedBird,
                location: this.selectedLocation
            });
        });

        // Pause menu location selection
        document.querySelectorAll('.pause-location .location-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.pause-location .location-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.triggerCallback('changeLocation', option.dataset.location);
            });
        });

        // Resume button
        document.getElementById('resumeGame').addEventListener('click', () => {
            this.hidePauseMenu();
            this.triggerCallback('resumeGame');
        });
    }

    setupChatToggle() {
        const chatHeader = document.getElementById('chat-header');
        const chatToggle = document.getElementById('chat-toggle');
        const chatContent = document.getElementById('chat-content');

        if (chatHeader && chatToggle && chatContent) {
            chatHeader.addEventListener('click', () => {
                chatToggle.classList.toggle('collapsed');
                chatContent.classList.toggle('collapsed');
            });
        }
    }

    setupChatEvents() {
        this.chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Prevent game controls from triggering while typing
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
            e.stopPropagation(); // Prevent game controls from triggering while typing
        });

        // Track focus state for direct clicks on chat input
        this.chatInput.addEventListener('focus', () => {
            this.chatOpen = true;
        });

        this.chatInput.addEventListener('blur', () => {
            this.chatOpen = false;
        });
    }

    showMenu() {
        this.menu.classList.remove('hidden');
        this.gameUI.classList.add('hidden');
        this.chat.classList.add('hidden');
        this.pauseMenu.classList.add('hidden');
        this.hideLeaderboard();
    }

    hideMenu() {
        this.menu.classList.add('hidden');
        this.gameUI.classList.remove('hidden');
        this.chat.classList.remove('hidden');
    }

    showPauseMenu() {
        this.pauseMenu.classList.remove('hidden');
        // Update current location selection
        document.querySelectorAll('.pause-location .location-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.location === this.selectedLocation);
        });
    }

    hidePauseMenu() {
        this.pauseMenu.classList.add('hidden');
    }

    isPauseMenuOpen() {
        return !this.pauseMenu.classList.contains('hidden');
    }

    updateScore(score) {
        this.scoreDisplay.textContent = `Worms: ${score}`;
    }

    updatePlayerList(players) {
        this.playerList.innerHTML = players.map(p => `
            <div class="player-entry" style="color: ${this.getBirdColor(p.bird)}">
                ${this.escapeHtml(p.name)} (${BIRD_TYPES[p.bird]?.name || this.escapeHtml(p.bird)}) - ${p.score}
            </div>
        `).join('');
    }

    getBirdColor(birdType) {
        const colors = {
            sparrow: '#A0826D',
            pigeon: '#A9A9A9',
            crow: '#666666',
            hummingbird: '#00ff88',
            penguin: '#FF6B00'
        };
        return colors[birdType] || '#ffffff';
    }

    openChat() {
        this.chatOpen = true;
        this.chatInput.focus();
    }

    closeChat() {
        this.chatOpen = false;
        this.chatInput.blur();
    }

    isChatOpen() {
        return this.chatOpen;
    }

    addChatMessage(name, message, isSystem = false) {
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

        // Keep only last 50 messages
        while (this.chatMessages.children.length > 50) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setLocation(location) {
        this.selectedLocation = location;
    }

    showLoading(text = 'Loading...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
            if (this.loadingText) {
                this.loadingText.textContent = text;
            }
            this.setLoadingProgress(0);
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    setLoadingProgress(percent) {
        this.loadingProgress = Math.min(100, Math.max(0, percent));
        if (this.loadingProgressBar) {
            this.loadingProgressBar.style.width = `${this.loadingProgress}%`;
        }
    }

    setLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    showCameraMode(modeName) {
        // Show camera mode notification
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

        // Clear existing timeout
        if (this.cameraModeTimeout) {
            clearTimeout(this.cameraModeTimeout);
        }

        // Hide after 1.5 seconds
        this.cameraModeTimeout = setTimeout(() => {
            notification.style.opacity = '0';
        }, 1500);
    }

    showConnectionStatus(status, data = {}) {
        let indicator = document.getElementById('connection-status');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-status';
            indicator.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
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
                // Hide after 2 seconds when connected
                if (this.connectionStatusTimeout) {
                    clearTimeout(this.connectionStatusTimeout);
                }
                this.connectionStatusTimeout = setTimeout(() => {
                    indicator.style.opacity = '0';
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

    createLeaderboard() {
        // Create leaderboard container
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

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
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

            #leaderboard.visible {
                display: block;
            }

            /* Mobile: position leaderboard on right side, below top UI */
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

                .leaderboard-header {
                    padding: 6px 10px;
                }

                .leaderboard-title {
                    font-size: 12px;
                }

                .leaderboard-content {
                    max-height: 150px;
                }

                .leaderboard-list {
                    padding: 6px;
                }

                .leaderboard-entry {
                    padding: 3px 0;
                }

                .leaderboard-rank {
                    width: 20px;
                    font-size: 11px;
                }
            }

            /* Landscape mode on phones */
            @media (max-height: 500px) and (orientation: landscape) {
                #leaderboard {
                    top: auto;
                    bottom: 10px;
                    left: 50%;
                    right: auto;
                    transform: translateX(-50%);
                    max-height: 100px;
                }

                .leaderboard-content {
                    max-height: 60px;
                }
            }

            .leaderboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                cursor: pointer;
            }

            .leaderboard-title {
                font-weight: bold;
                font-size: 14px;
            }

            .leaderboard-toggle {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 12px;
                padding: 0;
                transition: transform 0.2s;
            }

            .leaderboard-toggle.collapsed {
                transform: rotate(-90deg);
            }

            .leaderboard-content {
                max-height: 300px;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }

            .leaderboard-content.collapsed {
                max-height: 0;
            }

            .leaderboard-list {
                padding: 8px;
            }

            .leaderboard-entry {
                display: flex;
                align-items: center;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .leaderboard-entry:last-child {
                border-bottom: none;
            }

            .leaderboard-entry.highlight {
                background: rgba(255, 215, 0, 0.2);
                margin: 0 -8px;
                padding: 4px 8px;
                border-radius: 4px;
            }

            .leaderboard-rank {
                width: 24px;
                font-weight: bold;
                color: #888;
            }

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

            .leaderboard-score {
                font-weight: bold;
                color: #4CAF50;
            }

            .leaderboard-empty {
                text-align: center;
                color: #888;
                padding: 16px 8px;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);

        // Toggle collapse
        const header = leaderboard.querySelector('.leaderboard-header');
        const toggle = document.getElementById('leaderboard-toggle');
        const content = document.getElementById('leaderboard-content');

        header.addEventListener('click', () => {
            toggle.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
        });
    }

    showLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.classList.add('visible');
            this.leaderboardVisible = true;
        }
    }

    hideLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.classList.remove('visible');
            this.leaderboardVisible = false;
        }
    }

    updateLeaderboard(entries, currentPlayerName = null) {
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

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    triggerCallback(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in UI callback for '${event}':`, e);
                }
            });
        }
    }

    cleanup() {
        // Clear timeouts
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

        // Remove dynamically created elements
        const notification = document.getElementById('camera-mode-notification');
        if (notification) {
            notification.remove();
        }
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.remove();
        }
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.remove();
        }

        // Clear callbacks
        this.callbacks = {};
    }

    // ==================== PROGRESSION UI ====================

    updateLevelDisplay(level, xpProgress, xpToNext) {
        const levelNumber = document.getElementById('level-number');
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');

        if (levelNumber) {
            levelNumber.textContent = `Lv.${level}`;
        }
        if (xpFill) {
            xpFill.style.width = `${xpProgress * 100}%`;
        }
        if (xpText) {
            xpText.textContent = level >= 50 ? 'MAX' : `${xpToNext} XP`;
        }
    }

    showXPNotification(amount, source) {
        const notification = document.getElementById('xpNotification');
        if (!notification) return;

        // Clear previous timeout
        if (this.xpNotificationTimeout) {
            clearTimeout(this.xpNotificationTimeout);
        }

        notification.textContent = `+${amount} XP`;
        notification.classList.remove('hidden');

        // Remove and re-add to restart animation
        notification.style.animation = 'none';
        notification.offsetHeight; // Trigger reflow
        notification.style.animation = null;

        this.xpNotificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
        }, 2000);
    }

    showLevelUpPopup(oldLevel, newLevel, reward) {
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

        // Play level up sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playLevelUp?.();
        }

        const closeHandler = () => {
            popup.classList.add('hidden');
            closeBtn.removeEventListener('click', closeHandler);
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeHandler);
        }
    }

    // ==================== DAILY REWARDS UI ====================

    showDailyRewardPopup(rewardsManager) {
        const popup = document.getElementById('dailyRewardPopup');
        const calendar = document.getElementById('dailyRewardCalendar');
        const currentReward = document.getElementById('currentReward');
        const streakInfo = document.getElementById('streakInfo');
        const claimBtn = document.getElementById('claimRewardBtn');
        const closeBtn = document.getElementById('closeDailyPopup');

        if (!popup || !rewardsManager) return;

        // Build calendar
        const allRewards = rewardsManager.getAllRewardsInfo();
        if (calendar) {
            calendar.innerHTML = allRewards.map((reward, index) => {
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

        // Show current reward
        const todayInfo = rewardsManager.getTodayRewardInfo();
        if (currentReward) {
            const multiplierText = todayInfo.multiplier > 1 ?
                ` (x${todayInfo.multiplier.toFixed(1)} streak bonus!)` : '';
            currentReward.innerHTML = `
                <div>Today's Reward:</div>
                <div style="font-size: 32px; margin: 10px 0;">${todayInfo.description}${multiplierText}</div>
            `;
        }

        // Show streak info
        if (streakInfo) {
            const nextBonus = todayInfo.nextStreakBonus;
            let streakText = `<span class="streak-count">${todayInfo.currentStreak}</span> day streak!`;
            if (nextBonus) {
                streakText += ` <br><small>${nextBonus.daysNeeded} more days for x${nextBonus.multiplier} bonus</small>`;
            }
            streakInfo.innerHTML = streakText;
        }

        // Update claim button
        if (claimBtn) {
            claimBtn.disabled = !todayInfo.canClaim;
            claimBtn.textContent = todayInfo.canClaim ? 'Claim Reward!' : 'Already Claimed';
        }

        popup.classList.remove('hidden');

        // Claim handler
        const claimHandler = () => {
            if (!rewardsManager.canClaim()) return;

            const reward = rewardsManager.claimReward();
            if (reward) {
                // Apply reward
                if (typeof progressionManager !== 'undefined') {
                    const xpAmount = reward.finalAmount || reward.finalXP || 0;
                    if (xpAmount > 0) {
                        progressionManager.addXP(xpAmount, 'daily_reward');
                    }
                }

                // Update UI
                if (claimBtn) {
                    claimBtn.disabled = true;
                    claimBtn.textContent = 'Claimed!';
                }

                // Show notification
                this.showXPNotification(reward.finalAmount || reward.finalXP, 'daily');

                // Update calendar
                this.showDailyRewardPopup(rewardsManager);
            }
        };

        const closeHandler = () => {
            popup.classList.add('hidden');
            claimBtn?.removeEventListener('click', claimHandler);
            closeBtn?.removeEventListener('click', closeHandler);
        };

        claimBtn?.addEventListener('click', claimHandler);
        closeBtn?.addEventListener('click', closeHandler);
    }

    // ==================== GOLDEN WORM ALERT ====================

    showGoldenWormAlert() {
        const alert = document.getElementById('goldenWormAlert');
        if (!alert) return;

        alert.classList.remove('hidden');

        // Play sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playGoldenWorm?.();
        }

        setTimeout(() => {
            alert.classList.add('hidden');
        }, 3500);
    }
}

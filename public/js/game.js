// Camera modes
const CAMERA_MODES = {
    FOLLOW: 'follow',    // Follows behind bird direction
    ORBIT: 'orbit',      // Free orbit around bird
    TOP: 'top',          // Top-down view
    SIDE: 'side'         // Side view
};

// Main game class
class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.world = null;
        this.wormManager = null;
        this.flyManager = null;
        this.weatherSystem = null;
        this.playerBird = null;
        this.otherPlayers = new Map();

        this.network = null;
        this.ui = null;

        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            cameraLeft: false,
            cameraRight: false
        };

        // Camera orbit system
        this.cameraOrbit = {
            angle: 0,              // Horizontal angle around bird
            pitch: 0.25,           // Vertical angle (0=level, 1=top)
            distance: 12,          // Distance from bird
            targetAngle: 0,
            targetPitch: 0.25,
            targetDistance: 12,
            minDistance: 5,
            maxDistance: 30,
            minPitch: -0.1,
            maxPitch: 0.8,
            // Follow mode settings
            maxFollowAngleOffset: Math.PI * 0.25,  // Max 45 degrees from behind bird
            maxRotationRate: 0.015                 // Max camera rotation speed per frame
        };
        this.cameraMode = CAMERA_MODES.FOLLOW;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.score = 0;
        this.currentLocation = 'city';
        this.paused = false;
        this.lastPositionUpdate = 0;
        this.positionUpdateInterval = 50;

        // Collision respawn tracking
        this.collisionStartTime = null;
        this.collisionRespawnDelay = 5000; // 5 seconds

        // Golden worm alert tracking
        this.goldenWormAlertShown = false;

        this.clock = new THREE.Clock();

        // Touch controls (initialized after renderer)
        this.touchControls = null;

        // Animation frame ID for cleanup
        this.animationFrameId = null;
        this.isRunning = false;

        // Store bound event handlers for cleanup
        this.boundHandlers = {
            keydown: null,
            keyup: null,
            mousedown: null,
            mouseup: null,
            mousemove: null,
            wheel: null,
            contextmenu: null,
            resize: null
        };
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 300);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Create managers
        this.world = new World(this.scene);
        this.wormManager = new WormManager(this.scene);
        this.flyManager = new FlyManager(this.scene);
        this.weatherSystem = new WeatherSystem(this.scene);
        this.effectsManager = new EffectsManager(this.scene);
        try {
            this.ambientParticles = new AmbientParticleSystem(this.scene, this.weatherSystem);
        } catch (error) {
            console.warn('Failed to initialize ambient particles:', error);
            this.ambientParticles = null;
        }
        this.network = new NetworkManager();
        this.ui = new UIManager();

        // Setup progression callbacks
        this.setupProgressionCallbacks();

        // Setup input handlers
        this.setupInput();
        this.setupMouseInput();

        // Setup touch controls for mobile
        this.touchControls = new TouchControls(this);

        // Setup UI callbacks
        this.setupUICallbacks();

        // Setup network callbacks
        this.setupNetworkCallbacks();

        // Handle window resize
        this.boundHandlers.resize = () => this.onResize();
        window.addEventListener('resize', this.boundHandlers.resize);

        // Show menu
        this.ui.showMenu();
    }

    setupInput() {
        this.boundHandlers.keydown = (e) => {
            if (this.ui.isChatOpen()) return;

            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.input.forward = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.input.backward = true;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.input.left = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.input.right = true;
                    break;
                case 'Space':
                    this.input.up = true;
                    e.preventDefault();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.input.down = true;
                    break;
                case 'KeyQ':
                    this.input.cameraLeft = true;
                    break;
                case 'KeyE':
                    this.input.cameraRight = true;
                    break;
                case 'KeyC':
                    // Reset camera
                    this.resetCamera();
                    break;
                case 'KeyV':
                    // Cycle camera mode
                    this.cycleCameraMode();
                    break;
                case 'KeyM':
                    // Toggle mute
                    const soundOn = audioManager.toggle();
                    this.ui.showCameraMode(soundOn ? 'Sound ON' : 'Sound OFF');
                    break;
                case 'KeyP':
                    // Change weather
                    if (this.weatherSystem) {
                        const weather = this.weatherSystem.randomWeather();
                        this.ui.showCameraMode(`Weather: ${weather}`);
                    }
                    break;
                case 'KeyT':
                    // Fast forward time
                    if (this.weatherSystem) {
                        this.weatherSystem.setTimeOfDay(this.weatherSystem.timeOfDay + 3);
                        const h = Math.floor(this.weatherSystem.timeOfDay);
                        const m = Math.floor((this.weatherSystem.timeOfDay % 1) * 60);
                        this.ui.showCameraMode(`Time: ${h}:${m.toString().padStart(2, '0')}`);
                    }
                    break;
                case 'KeyL':
                    // Toggle pastel mode
                    if (typeof ColorPalette !== 'undefined') {
                        const isPastel = ColorPalette.toggle();
                        this.ui.showCameraMode(isPastel ? 'Pastel ON' : 'Pastel OFF');
                    }
                    break;
                case 'KeyR':
                    // Manual respawn
                    this.respawnPlayer();
                    break;
                case 'Enter':
                    if (!this.paused) {
                        this.resetInput();
                        this.ui.openChat();
                    }
                    break;
                case 'Escape':
                    if (this.ui.isPauseMenuOpen()) {
                        this.ui.hidePauseMenu();
                        this.paused = false;
                        audioManager.playResume();
                    } else if (!this.paused) {
                        this.ui.showPauseMenu();
                        this.paused = true;
                        audioManager.playPause();
                    }
                    break;
            }
        };

        this.boundHandlers.keyup = (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.input.forward = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.input.backward = false;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.input.left = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.input.right = false;
                    break;
                case 'Space':
                    this.input.up = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.input.down = false;
                    break;
                case 'KeyQ':
                    this.input.cameraLeft = false;
                    break;
                case 'KeyE':
                    this.input.cameraRight = false;
                    break;
            }
        };

        window.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('keyup', this.boundHandlers.keyup);
    }

    resetInput() {
        this.input.forward = false;
        this.input.backward = false;
        this.input.left = false;
        this.input.right = false;
        this.input.up = false;
        this.input.down = false;
        this.input.cameraLeft = false;
        this.input.cameraRight = false;
    }

    setupMouseInput() {
        const canvas = this.renderer.domElement;

        // Right mouse button for camera rotation
        this.boundHandlers.mousedown = (e) => {
            if (e.button === 2) { // Right click
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        };

        this.boundHandlers.mouseup = (e) => {
            if (e.button === 2) {
                this.isDragging = false;
                canvas.style.cursor = 'default';
            }
        };

        this.boundHandlers.mousemove = (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                // Rotate camera horizontally
                this.cameraOrbit.targetAngle -= deltaX * 0.005;

                // Rotate camera vertically
                this.cameraOrbit.targetPitch += deltaY * 0.003;
                this.cameraOrbit.targetPitch = Math.max(
                    this.cameraOrbit.minPitch,
                    Math.min(this.cameraOrbit.maxPitch, this.cameraOrbit.targetPitch)
                );

                // Switch to orbit mode when manually rotating
                if (this.cameraMode === CAMERA_MODES.FOLLOW) {
                    this.cameraMode = CAMERA_MODES.ORBIT;
                    this.ui.showCameraMode('Orbit');
                }

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        };

        // Mouse wheel for zoom
        this.boundHandlers.wheel = (e) => {
            e.preventDefault();
            const zoomSpeed = 0.002;
            this.cameraOrbit.targetDistance += e.deltaY * zoomSpeed * this.cameraOrbit.targetDistance;
            this.cameraOrbit.targetDistance = Math.max(
                this.cameraOrbit.minDistance,
                Math.min(this.cameraOrbit.maxDistance, this.cameraOrbit.targetDistance)
            );
        };

        // Prevent context menu on right click
        this.boundHandlers.contextmenu = (e) => e.preventDefault();

        canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        window.addEventListener('mouseup', this.boundHandlers.mouseup);
        window.addEventListener('mousemove', this.boundHandlers.mousemove);
        canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
        canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    }

    resetCamera() {
        // Reset to behind bird if bird exists
        if (this.playerBird) {
            this.cameraOrbit.targetAngle = -this.playerBird.rotation;
            this.cameraOrbit.angle = -this.playerBird.rotation;
        } else {
            this.cameraOrbit.targetAngle = 0;
            this.cameraOrbit.angle = 0;
        }
        this.cameraOrbit.targetPitch = 0.25;
        this.cameraOrbit.targetDistance = 12;
        this.cameraMode = CAMERA_MODES.FOLLOW;
        this.ui.showCameraMode('Follow');
    }

    cycleCameraMode() {
        const modes = Object.values(CAMERA_MODES);
        const currentIndex = modes.indexOf(this.cameraMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.cameraMode = modes[nextIndex];

        // Set default positions for each mode
        switch (this.cameraMode) {
            case CAMERA_MODES.FOLLOW:
                this.cameraOrbit.targetPitch = 0.25;
                break;
            case CAMERA_MODES.ORBIT:
                // Keep current orbit settings
                break;
            case CAMERA_MODES.TOP:
                this.cameraOrbit.targetPitch = 0.75;
                this.cameraOrbit.targetDistance = 25;
                break;
            case CAMERA_MODES.SIDE:
                this.cameraOrbit.targetAngle = Math.PI / 2;
                this.cameraOrbit.targetPitch = 0.1;
                break;
        }

        // Show mode name
        const modeNames = {
            [CAMERA_MODES.FOLLOW]: 'Follow',
            [CAMERA_MODES.ORBIT]: 'Orbit',
            [CAMERA_MODES.TOP]: 'Top-Down',
            [CAMERA_MODES.SIDE]: 'Side View'
        };
        this.ui.showCameraMode(modeNames[this.cameraMode]);
    }

    setupUICallbacks() {
        this.ui.on('startGame', (data) => {
            // Initialize audio on first user interaction
            audioManager.init();
            audioManager.resume();
            audioManager.playGameStart();
            this.startGame(data.playerName, data.bird, data.location);
        });

        this.ui.on('sendChat', (message) => {
            if (!this.network.sendChat(message)) {
                this.ui.addChatMessage(null, 'Message not sent - disconnected', true);
            }
        });

        this.ui.on('changeLocation', (location) => {
            if (location !== this.currentLocation) {
                // Show loading immediately
                this.ui.showLoading(`Connecting to ${LOCATIONS[location]?.name || location}...`);
                this.ui.setLoadingProgress(10);

                if (!this.network.changeLocation(location)) {
                    this.ui.hideLoading();
                    this.ui.addChatMessage(null, 'Cannot change location - disconnected', true);
                } else {
                    this.ui.setLoadingProgress(30);
                }
            }
        });

        this.ui.on('resumeGame', () => {
            this.paused = false;
            audioManager.playResume();
        });
    }

    setupProgressionCallbacks() {
        // Update UI with initial progression state
        if (typeof progressionManager !== 'undefined') {
            const stats = progressionManager.getStats();
            this.ui.updateLevelDisplay(stats.level, stats.xpProgress, stats.xpToNext);

            // Setup level up callback
            progressionManager.onLevelUp = (oldLevel, newLevel, reward) => {
                this.ui.showLevelUpPopup(oldLevel, newLevel, reward);

                // Apply visual rewards
                if (reward && this.playerBird) {
                    if (reward.type === 'trail' && reward.trailId) {
                        this.effectsManager.createTrail('player', reward.trailId, this.playerBird.group);
                    }
                    if (reward.type === 'aura' && reward.auraId) {
                        this.effectsManager.createAura('player', reward.auraId, this.playerBird.group);
                    }
                }
            };

            // Setup XP gain callback
            progressionManager.onXPGain = (amount, source, totalXP, progress) => {
                this.ui.showXPNotification(amount, source);
                const stats = progressionManager.getStats();
                this.ui.updateLevelDisplay(stats.level, stats.xpProgress, stats.xpToNext);
            };
        }

        // Setup daily rewards callback
        if (typeof dailyRewardsManager !== 'undefined') {
            dailyRewardsManager.onRewardClaimed = (reward) => {
                console.log('Daily reward claimed:', reward);
            };
        }
    }

    setupNetworkCallbacks() {
        this.network.on('playerJoined', (player) => {
            this.addOtherPlayer(player);
            this.ui.addChatMessage(null, `${player.name} joined`, true);
            this.updatePlayerList();
            audioManager.playPlayerJoined();
        });

        this.network.on('playerLeft', (playerId) => {
            const player = this.otherPlayers.get(playerId);
            if (player) {
                this.ui.addChatMessage(null, `${player.name} left`, true);
                player.bird.remove();
                this.otherPlayers.delete(playerId);
                this.updatePlayerList();
                audioManager.playPlayerLeft();
            }
        });

        this.network.on('playerMoved', (data) => {
            const player = this.otherPlayers.get(data.playerId);
            if (player && player.bird) {
                player.bird.setPosition(data.x, data.y, data.z);
                player.bird.setRotation(data.rotationY);
            }
        });

        this.network.on('chatMessage', (data) => {
            this.ui.addChatMessage(data.name, data.message);
            audioManager.playChatMessage();
        });

        this.network.on('wormSpawned', (worm) => {
            if (worm) {
                this.wormManager.addWorm(worm);
            }
        });

        this.network.on('wormCollected', (data) => {
            const isGolden = data.isGolden || false;
            this.wormManager.removeWorm(data.wormId);

            if (data.playerId === this.network.playerId) {
                this.score = data.newScore;
                this.ui.updateScore(this.score);
                // Update bird speed based on worms eaten
                if (this.playerBird) {
                    this.playerBird.setWormCount(this.score);
                }

                // Add XP based on worm type
                if (typeof progressionManager !== 'undefined') {
                    const xp = isGolden ?
                        progressionManager.getXPForAction('goldenWorm') :
                        progressionManager.getXPForAction('worm');
                    progressionManager.addXP(xp, isGolden ? 'goldenWorm' : 'worm');
                }

                // Create collection burst effect
                if (this.effectsManager && this.playerBird) {
                    this.effectsManager.createCollectionBurst(this.playerBird.position, isGolden);
                }

                if (isGolden) {
                    audioManager.playGoldenWorm?.() || audioManager.playWormCollect();
                } else {
                    audioManager.playWormCollect();
                }
            }
            const player = this.otherPlayers.get(data.playerId);
            if (player) {
                player.score = data.newScore;
                this.updatePlayerList();
            }
        });

        this.network.on('flySpawned', (fly) => {
            if (fly) {
                this.flyManager.addFly(fly);
            }
        });

        this.network.on('flyCollected', (data) => {
            this.flyManager.removeFly(data.flyId);
            if (data.playerId === this.network.playerId) {
                this.score = data.newScore;
                this.ui.updateScore(this.score);
                // Update bird speed based on food eaten
                if (this.playerBird) {
                    this.playerBird.setWormCount(this.score);
                }

                // Add XP for fly (more than worm)
                if (typeof progressionManager !== 'undefined') {
                    const xp = progressionManager.getXPForAction('fly');
                    progressionManager.addXP(xp, 'fly');
                }

                // Create collection burst effect
                if (this.effectsManager && this.playerBird) {
                    this.effectsManager.createCollectionBurst(this.playerBird.position, false);
                }

                audioManager.playWormCollect();
            }
            const player = this.otherPlayers.get(data.playerId);
            if (player) {
                player.score = data.newScore;
                this.updatePlayerList();
            }
        });

        this.network.on('locationChanged', (data) => {
            audioManager.playLocationChange();
            this.changeLocation(data.location, data.worms, data.flies, data.players);
        });

        this.network.on('disconnected', () => {
            this.ui.addChatMessage(null, 'Disconnected from server...', true);
            this.ui.showConnectionStatus('disconnected');
        });

        this.network.on('reconnecting', (data) => {
            this.ui.addChatMessage(null, `Reconnecting... (attempt ${data.attempt}/${data.maxAttempts})`, true);
            this.ui.showConnectionStatus('reconnecting', data);
        });

        this.network.on('reconnected', (data) => {
            this.ui.addChatMessage(null, 'Reconnected!', true);
            this.ui.showConnectionStatus('connected');
            // Sync state after reconnection
            if (data && data.players) {
                this.otherPlayers.forEach(player => player.bird.remove());
                this.otherPlayers.clear();
                data.players.forEach(player => this.addOtherPlayer(player));
                this.updatePlayerList();
            }
            if (data && data.worms) {
                this.wormManager.clear();
                this.wormManager.addWorms(data.worms);
            }
            if (data && data.flies) {
                this.flyManager.clear();
                this.flyManager.addFlies(data.flies);
            }
        });

        this.network.on('connectionFailed', (data) => {
            this.ui.addChatMessage(null, 'Connection failed. Please refresh the page.', true);
            this.ui.showConnectionStatus('failed', data);
        });

        this.network.on('leaderboard', (leaderboard) => {
            this.ui.updateLeaderboard(leaderboard, this.network.playerName);
        });
    }

    async startGame(playerName, birdType, location) {
        try {
            this.ui.showConnectionStatus('connecting');
            const gameData = await this.network.connect(playerName, birdType, location);

            // Validate game data
            if (!gameData) {
                throw new Error('No game data received');
            }

            this.ui.hideMenu();
            this.ui.showConnectionStatus('connected');
            this.currentLocation = location;
            this.ui.setLocation(location);

            // Show touch controls on mobile
            if (this.touchControls && this.touchControls.isEnabled()) {
                this.touchControls.show();
            }

            this.loadLocation(location);

            this.playerBird = new Bird(this.scene, birdType, true);
            this.playerBird.setPosition(0, 10, 0);

            // Restore score from server (for returning players)
            this.score = gameData.player?.score || 0;
            this.playerBird.setWormCount(this.score);

            // Set initial camera distance based on bird size
            this.cameraOrbit.targetDistance = 8 + this.playerBird.config.size * 2;
            this.cameraOrbit.distance = this.cameraOrbit.targetDistance;

            if (gameData.worms) {
                this.wormManager.addWorms(gameData.worms);
            }

            if (gameData.flies) {
                this.flyManager.addFlies(gameData.flies);
            }

            if (gameData.players) {
                gameData.players.forEach(player => {
                    this.addOtherPlayer(player);
                });
            }

            this.ui.updateScore(this.score);
            this.updatePlayerList();

            // Show leaderboard
            this.ui.showLeaderboard();
            if (gameData.leaderboard) {
                this.ui.updateLeaderboard(gameData.leaderboard, this.network.playerName);
            }

            // Notify returning player
            if (gameData.isReturningPlayer && this.score > 0) {
                this.ui.addChatMessage(null, `Welcome back! Your score of ${this.score} has been restored.`, true);
            }

            // Apply unlocked visual effects
            this.applyUnlockedEffects();

            // Check for daily rewards
            if (typeof dailyRewardsManager !== 'undefined' && dailyRewardsManager.canClaim()) {
                setTimeout(() => {
                    this.ui.showDailyRewardPopup(dailyRewardsManager);
                }, 1000);
            }

            this.isRunning = true;
            this.animate();

        } catch (error) {
            console.error('Failed to connect:', error);
            this.ui.showConnectionStatus('failed', { reason: error.message });
            alert('Failed to connect to server: ' + error.message);
        }
    }

    applyUnlockedEffects() {
        if (typeof progressionManager === 'undefined' || !this.playerBird || !this.effectsManager) {
            return;
        }

        // Apply unlocked trails
        const unlockedTrails = progressionManager.getUnlockedByType('trail');
        if (unlockedTrails.length > 0) {
            // Use the most recently unlocked trail
            const latestTrail = unlockedTrails[unlockedTrails.length - 1];
            if (latestTrail.trailId) {
                this.effectsManager.createTrail('player', latestTrail.trailId, this.playerBird.group);
            }
        }

        // Apply unlocked auras
        const unlockedAuras = progressionManager.getUnlockedByType('aura');
        if (unlockedAuras.length > 0) {
            // Use the most recently unlocked aura
            const latestAura = unlockedAuras[unlockedAuras.length - 1];
            if (latestAura.auraId) {
                this.effectsManager.createAura('player', latestAura.auraId, this.playerBird.group);
            }
        }
    }

    loadLocation(location) {
        // Show loading indicator
        this.ui.showLoading(`Loading ${LOCATIONS[location]?.name || location}...`);
        this.ui.setLoadingProgress(10);

        this.world.clear();
        this.ui.setLoadingProgress(20);

        this.weatherSystem.clear();
        this.ui.setLoadingProgress(30);

        const locationConfig = LOCATIONS[location];
        if (locationConfig) {
            this.ui.setLoadingText(`Generating ${locationConfig.name}...`);
            this.ui.setLoadingProgress(40);

            locationConfig.generate(this.world);
            this.ui.setLoadingProgress(70);

            this.scene.fog.color.setHex(locationConfig.skyBottomColor);
            this.ui.setLoadingProgress(80);

            // Initialize weather system
            this.weatherSystem.init(this.scene.fog);
            // Random starting time between 8:00 and 16:00
            this.weatherSystem.setTimeOfDay(8 + Math.random() * 8);
            // Random weather (weighted towards clear)
            this.weatherSystem.randomWeather();
            this.ui.setLoadingProgress(100);
        } else {
            console.warn(`Unknown location: ${location}`);
        }

        // Hide loading after a brief delay to show 100%
        setTimeout(() => {
            this.ui.hideLoading();
        }, 300);
    }

    changeLocation(location, worms, flies, players) {
        this.currentLocation = location;
        this.ui.setLocation(location);

        this.loadLocation(location);

        this.wormManager.clear();
        if (worms) {
            this.wormManager.addWorms(worms);
        }

        this.flyManager.clear();
        if (flies) {
            this.flyManager.addFlies(flies);
        }

        this.otherPlayers.forEach(player => player.bird.remove());
        this.otherPlayers.clear();

        if (players) {
            players.forEach(player => this.addOtherPlayer(player));
        }

        if (this.playerBird) {
            this.playerBird.setPosition(0, 10, 0);
        }

        this.ui.addChatMessage(null, `Moved to ${LOCATIONS[location]?.name || location}`, true);
        this.updatePlayerList();
        this.ui.hidePauseMenu();
        this.paused = false;
    }

    respawnPlayer() {
        if (!this.playerBird) return;

        // Reset collision timer
        this.collisionStartTime = null;

        // Respawn at safe height above current position or at spawn point
        const safeY = 15;
        const currentX = this.playerBird.position.x;
        const currentZ = this.playerBird.position.z;

        // Move to a safe position (above current spot or back to spawn)
        this.playerBird.setPosition(currentX, safeY, currentZ);
        this.playerBird.velocity.set(0, 0, 0);

        // Notify player
        this.ui.addChatMessage(null, 'Respawned! (stuck too long)', true);
        audioManager.playResume();

        // Reset camera
        this.resetCamera();
    }

    addOtherPlayer(playerData) {
        if (!playerData || !playerData.id) return;

        const bird = new Bird(this.scene, playerData.bird, false);
        bird.setPosition(playerData.x || 0, playerData.y || 10, playerData.z || 0);
        bird.setRotation(playerData.rotationY || 0);

        this.otherPlayers.set(playerData.id, {
            id: playerData.id,
            name: playerData.name || 'Unknown',
            bird: bird,
            birdType: playerData.bird,
            score: playerData.score || 0
        });
    }

    updatePlayerList() {
        const players = [];

        if (this.playerBird && this.network) {
            players.push({
                name: (this.network.playerName || 'You') + ' (You)',
                bird: this.network.birdType,
                score: this.score
            });
        }

        this.otherPlayers.forEach(player => {
            players.push({
                name: player.name,
                bird: player.birdType,
                score: player.score
            });
        });

        this.ui.updatePlayerList(players);
    }

    update(delta) {
        if (this.paused || !this.playerBird) return;

        const time = this.clock.getElapsedTime();

        // Merge keyboard and touch input
        // Keyboard is boolean (0 or 1), touch is analog (0 to 1)
        const touchInput = this.touchControls ? this.touchControls.getInput() : null;
        const mergedInput = {
            forward: this.input.forward ? 1 : (touchInput ? touchInput.forward : 0),
            backward: this.input.backward ? 1 : (touchInput ? touchInput.backward : 0),
            left: this.input.left ? 1 : (touchInput ? touchInput.left : 0),
            right: this.input.right ? 1 : (touchInput ? touchInput.right : 0),
            up: this.input.up ? 1 : (touchInput ? touchInput.up : 0),
            down: this.input.down ? 1 : (touchInput ? touchInput.down : 0),
            // Direct turn rate from touch joystick (bypasses left/right)
            turnRate: touchInput ? touchInput.turnRate : 0,
            isTouch: touchInput ? touchInput.isTouch : false
        };

        // Update player bird
        this.playerBird.update(mergedInput, delta);

        // Play flap sound when going up
        if (mergedInput.up > 0) {
            audioManager.playFlap();
        }

        // Random chirps occasionally
        if (Math.random() < 0.002) {
            audioManager.playChirp();
        }

        // Check collisions
        const radius = this.playerBird.getCollisionRadius();
        const hitObject = this.world.checkCollision(this.playerBird.position, radius);
        if (hitObject) {
            this.playerBird.position.sub(this.playerBird.velocity);
            this.playerBird.velocity.multiplyScalar(-0.3);
            audioManager.playCollision(hitObject);

            // Track collision duration for respawn
            if (!this.collisionStartTime) {
                this.collisionStartTime = Date.now();
            } else if (Date.now() - this.collisionStartTime > this.collisionRespawnDelay) {
                // Stuck for > 5 seconds, respawn
                this.respawnPlayer();
            }
        } else {
            // Not colliding, reset timer
            this.collisionStartTime = null;
        }

        // Update camera controls from keyboard
        if (this.input.cameraLeft) {
            this.cameraOrbit.targetAngle += 0.03;
            if (this.cameraMode === CAMERA_MODES.FOLLOW) {
                this.cameraMode = CAMERA_MODES.ORBIT;
            }
        }
        if (this.input.cameraRight) {
            this.cameraOrbit.targetAngle -= 0.03;
            if (this.cameraMode === CAMERA_MODES.FOLLOW) {
                this.cameraMode = CAMERA_MODES.ORBIT;
            }
        }

        // Update camera
        this.updateCamera();

        // Check worm collection
        const collectedWorms = this.wormManager.checkCollection(
            this.playerBird.position,
            radius
        );
        collectedWorms.forEach(wormData => {
            // Handle both old format (just ID) and new format (object with id, isGolden, points)
            const wormId = typeof wormData === 'object' ? wormData.id : wormData;
            const isGolden = typeof wormData === 'object' ? wormData.isGolden : false;
            this.network.sendWormCollected(wormId, isGolden);
        });

        // Check fly collection
        const collectedFlies = this.flyManager.checkCollection(
            this.playerBird.position,
            radius
        );
        collectedFlies.forEach(flyId => {
            this.network.sendFlyCollected(flyId);
        });

        // Update animations
        this.wormManager.update(time);
        this.flyManager.update(time);
        this.world.update(time);
        this.weatherSystem.update(delta, time);

        // Update visual effects
        if (this.effectsManager) {
            this.effectsManager.update(delta);
            this.effectsManager.updateParticles(delta);

            // Update player trail if exists
            if (this.playerBird && this.effectsManager.trails.has('player')) {
                this.effectsManager.updateTrail('player', this.playerBird.position, this.playerBird.velocity);
            }
        }

        // Update ambient particles (fireflies, dust, feathers)
        if (this.ambientParticles && this.camera) {
            this.ambientParticles.update(delta, this.camera.position, time);
        }

        // Check for golden worm spawn (client-side visual indicator)
        if (this.wormManager.hasGoldenWorm() && !this.goldenWormAlertShown) {
            this.ui.showGoldenWormAlert();
            this.goldenWormAlertShown = true;
        } else if (!this.wormManager.hasGoldenWorm()) {
            this.goldenWormAlertShown = false;
        }

        // Update other players
        this.otherPlayers.forEach(player => {
            if (player.bird) {
                player.bird.update({ forward: true }, delta);
            }
        });

        // Send position to server (only if connected)
        if (this.network.isConnected()) {
            const now = Date.now();
            if (now - this.lastPositionUpdate > this.positionUpdateInterval) {
                this.network.sendPosition(
                    this.playerBird.position.x,
                    this.playerBird.position.y,
                    this.playerBird.position.z,
                    this.playerBird.rotation
                );
                this.lastPositionUpdate = now;
            }
        }
    }

    updateCamera() {
        if (!this.playerBird) return;

        const orbit = this.cameraOrbit;
        const birdPos = this.playerBird.position;
        const birdRotation = this.playerBird.visualRotation || this.playerBird.rotation;

        // In follow mode, camera stays behind bird with limited rotation
        if (this.cameraMode === CAMERA_MODES.FOLLOW) {
            // Desired angle is directly behind bird
            const behindBirdAngle = -birdRotation;

            // Calculate angle difference (normalized to -PI to PI)
            let angleDiff = behindBirdAngle - orbit.targetAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Clamp the angle difference to max offset (camera won't go beyond this)
            angleDiff = Math.max(-orbit.maxFollowAngleOffset, Math.min(orbit.maxFollowAngleOffset, angleDiff));

            // Limit rotation rate (camera rotates slowly)
            const rotationStep = Math.max(-orbit.maxRotationRate, Math.min(orbit.maxRotationRate, angleDiff * 0.05));

            orbit.targetAngle += rotationStep;
        }

        // Smooth interpolation of camera orbit parameters
        orbit.angle += (orbit.targetAngle - orbit.angle) * 0.12;
        orbit.pitch += (orbit.targetPitch - orbit.pitch) * 0.08;
        orbit.distance += (orbit.targetDistance - orbit.distance) * 0.08;

        // Calculate camera position on orbit sphere
        const horizontalDist = orbit.distance * Math.cos(orbit.pitch * Math.PI / 2);
        const verticalOffset = orbit.distance * Math.sin(orbit.pitch * Math.PI / 2);

        const targetX = birdPos.x + Math.sin(orbit.angle) * horizontalDist;
        const targetY = birdPos.y + verticalOffset + 2;
        const targetZ = birdPos.z + Math.cos(orbit.angle) * horizontalDist;

        // Smooth camera movement
        this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;

        // Look at bird (slightly ahead in follow mode)
        let lookAtX = birdPos.x;
        let lookAtY = birdPos.y;
        let lookAtZ = birdPos.z;

        if (this.cameraMode === CAMERA_MODES.FOLLOW) {
            // Look slightly ahead of bird
            lookAtX += Math.sin(birdRotation) * 3;
            lookAtZ += Math.cos(birdRotation) * 3;
        }

        this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
    }

    animate() {
        if (!this.isRunning) return;

        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }

    stopAnimation() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    cleanup() {
        // Stop animation loop
        this.stopAnimation();

        // Disconnect network
        if (this.network) {
            this.network.disconnect();
        }

        // Remove event listeners
        if (this.boundHandlers.keydown) {
            window.removeEventListener('keydown', this.boundHandlers.keydown);
        }
        if (this.boundHandlers.keyup) {
            window.removeEventListener('keyup', this.boundHandlers.keyup);
        }
        if (this.boundHandlers.mouseup) {
            window.removeEventListener('mouseup', this.boundHandlers.mouseup);
        }
        if (this.boundHandlers.mousemove) {
            window.removeEventListener('mousemove', this.boundHandlers.mousemove);
        }
        if (this.boundHandlers.resize) {
            window.removeEventListener('resize', this.boundHandlers.resize);
        }

        const canvas = this.renderer?.domElement;
        if (canvas) {
            if (this.boundHandlers.mousedown) {
                canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
            }
            if (this.boundHandlers.wheel) {
                canvas.removeEventListener('wheel', this.boundHandlers.wheel);
            }
            if (this.boundHandlers.contextmenu) {
                canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
            }
        }

        // Cleanup touch controls
        if (this.touchControls && this.touchControls.cleanup) {
            this.touchControls.cleanup();
        }

        // Cleanup UI
        if (this.ui && this.ui.cleanup) {
            this.ui.cleanup();
        }

        // Cleanup ambient particles
        if (this.ambientParticles && this.ambientParticles.cleanup) {
            this.ambientParticles.cleanup();
        }

        // Cleanup effects manager
        if (this.effectsManager && this.effectsManager.cleanup) {
            this.effectsManager.cleanup();
        }

        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }

        // Clear other players
        this.otherPlayers.forEach(player => {
            if (player.bird) {
                player.bird.remove();
            }
        });
        this.otherPlayers.clear();

        // Clear world
        if (this.world) {
            this.world.clear();
        }

        // Clear worms
        if (this.wormManager) {
            this.wormManager.clear();
        }

        // Clear flies
        if (this.flyManager) {
            this.flyManager.clear();
        }

        // Clear weather
        if (this.weatherSystem) {
            this.weatherSystem.clear();
        }
    }
}

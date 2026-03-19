// Game module - main game orchestration
import * as THREE from 'three';
import { World } from '../world/index.ts';
import { Bird } from '../bird/index.ts';
import { WormManager, FlyManager } from '../entities/index.ts';
import { WeatherSystem, LOCATIONS } from '../environment/index.ts';
import { EffectsManager, AmbientParticleSystem } from '../effects/index.ts';
import { NetworkManager, DemoNetworkManager, WebRTCNetworkManager, AudioManager, ProgressionManager, DailyRewardsManager, ComboManager, type LevelReward, type ClaimedReward, type AnyNetworkManager } from '../core/index.ts';
import { UIManager, TouchControls, CAMERA_MODES, type CameraMode, type GameInterface } from '../ui/index.ts';

import {
    GAME_CONSTANTS,
    type InputState,
    type CameraOrbitState,
    type OtherPlayer,
    type BoundHandlers,
    type PlayerData,
    type WormData,
    type FlyData,
    type GameDependencies
} from './types.ts';

import {
    createKeydownHandler,
    createKeyupHandler,
    resetInputState,
    createMouseHandlers,
    type MouseHandlerState,
    type InputHandlerCallbacks,
    type InputHandlerDeps
} from './input.ts';

import {
    createDefaultCameraOrbit,
    resetCameraOrbit,
    cycleCameraMode as cycleCameraModeUtil
} from './camera.ts';

import { setupNetworkCallbacks, type NetworkCallbackContext } from './callbacks.ts';
import {
    startGame as startGameLifecycle,
    initGameWithData as initGameWithDataLifecycle,
    changeLocation as changeLocationLifecycle,
    respawnPlayer as respawnPlayerLifecycle,
    addOtherPlayer as addOtherPlayerLifecycle,
    type LifecycleContext
} from './lifecycle.ts';
import { update, animate, stopAnimation, type UpdateContext } from './update.ts';

// Re-export types
export type { InputState, CameraOrbitState, OtherPlayer, GameDependencies } from './types.ts';

// Main game class
export class Game {
    // Dependency injection
    private audioManager: AudioManager;
    private progressionManager: ProgressionManager;
    private dailyRewardsManager: DailyRewardsManager;

    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    // Public for GameInterface (TouchControls)
    public renderer: THREE.WebGLRenderer | null = null;

    private world: World | null = null;
    private wormManager: WormManager | null = null;
    private flyManager: FlyManager | null = null;
    private weatherSystem: WeatherSystem | null = null;
    private playerBird: Bird | null = null;
    private otherPlayers: Map<string, OtherPlayer> = new Map();

    private effectsManager: EffectsManager | null = null;
    private ambientParticles: AmbientParticleSystem | null = null;

    private network: AnyNetworkManager | null = null;
    // Public for GameInterface (TouchControls)
    public ui: UIManager | null = null;

    private input: InputState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        cameraLeft: false,
        cameraRight: false,
        mouseDeltaX: 0,
        mouseDeltaY: 0,
        pointerLocked: false
    };

    // Public for GameInterface (TouchControls)
    public cameraOrbit: CameraOrbitState;
    public cameraMode: CameraMode = CAMERA_MODES.FOLLOW;
    private mouseState: MouseHandlerState = {
        isDragging: false,
        dragButton: null,
        lastMouseX: 0,
        lastMouseY: 0
    };

    private score: number = 0;
    private currentLocation: string = 'city';
    // Public for GameInterface (TouchControls)
    public paused: boolean = false;
    private lastPositionUpdate: number = 0;
    private positionUpdateInterval: number = GAME_CONSTANTS.POSITION_UPDATE_INTERVAL;

    private collisionStartTime: number | null = null;
    private collisionRespawnDelay: number = GAME_CONSTANTS.COLLISION_RESPAWN_DELAY;

    private goldenWormAlertShown: boolean = false;
    private comboManager: ComboManager = new ComboManager();

    private clock: THREE.Clock;

    private touchControls: TouchControls | null = null;

    private animationFrameId: number | null = null;
    private isRunning: boolean = false;

    private dailyRewardTimeout: ReturnType<typeof setTimeout> | null = null;
    private loadingTimeout: ReturnType<typeof setTimeout> | null = null;

    private boundHandlers: BoundHandlers & { blur: (() => void) | null } = {
        keydown: null,
        keyup: null,
        mousedown: null,
        mouseup: null,
        mousemove: null,
        wheel: null,
        contextmenu: null,
        resize: null,
        blur: null
    };

    constructor(deps: GameDependencies) {
        this.audioManager = deps.audioManager;
        this.progressionManager = deps.progressionManager;
        this.dailyRewardsManager = deps.dailyRewardsManager;
        this.cameraOrbit = createDefaultCameraOrbit();
        this.clock = new THREE.Clock();
    }

    init(): void {
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
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const shadowRes = isMobile ? 1024 : 2048;
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = shadowRes;
        directionalLight.shadow.mapSize.height = shadowRes;
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
        // Use DemoNetworkManager on static hosts (GitHub Pages) where WebSocket will never work
        const isStaticHost = window.location.protocol === 'file:' ||
            window.location.hostname.endsWith('.github.io') ||
            window.location.hostname.endsWith('.pages.dev') ||
            window.location.hostname.endsWith('.netlify.app');
        this.network = isStaticHost ? new DemoNetworkManager() : new NetworkManager();
        this.ui = new UIManager();

        // Setup progression callbacks
        this.setupProgressionCallbacks();

        // Setup input handlers
        this.setupInput();
        this.setupMouseInput();

        // Setup touch controls for mobile
        this.touchControls = new TouchControls(this as GameInterface, this.audioManager);

        // Setup UI callbacks
        this.setupUICallbacks();

        // Setup network callbacks
        this.initNetworkCallbacks();

        // Handle window resize
        this.boundHandlers.resize = () => this.onResize();
        window.addEventListener('resize', this.boundHandlers.resize);

        // Handle window blur - reset input state to prevent stuck keys
        this.boundHandlers.blur = () => this.resetInput();
        window.addEventListener('blur', this.boundHandlers.blur);

        // Show menu
        this.ui.showMenu();
    }

    private setupInput(): void {
        if (!this.ui) return;

        const deps: InputHandlerDeps = {
            ui: this.ui,
            weatherSystem: this.weatherSystem,
            audioManager: this.audioManager,
            touchControls: this.touchControls
        };

        const callbacks: InputHandlerCallbacks = {
            resetCamera: () => this.resetCamera(),
            cycleCameraMode: () => this.cycleCameraMode(),
            respawnPlayer: () => this.respawnPlayer(),
            resetInput: () => this.resetInput(),
            onPause: () => {
                this.paused = true;
                this.audioManager?.playPause();
            },
            onResume: () => {
                this.paused = false;
                this.audioManager?.playResume();
            },
            switchToOrbitMode: () => {
                this.cameraMode = CAMERA_MODES.ORBIT;
            }
        };

        this.boundHandlers.keydown = createKeydownHandler(
            this.input,
            deps,
            callbacks,
            () => this.paused,
            () => this.ui?.isPauseMenuOpen() ?? false
        );

        this.boundHandlers.keyup = createKeyupHandler(this.input);

        window.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('keyup', this.boundHandlers.keyup);
    }

    // Public for GameInterface (TouchControls)
    public resetInput(): void {
        resetInputState(this.input);
    }

    private setupMouseInput(): void {
        if (!this.renderer || !this.ui) return;

        const canvas = this.renderer.domElement;
        const cameraModeRef = { current: this.cameraMode };

        // Unified setter for camera mode changes
        const setCameraMode = (mode: CameraMode) => {
            this.cameraMode = mode;
            cameraModeRef.current = mode;
        };

        // Mouse handlers for camera orbit (GTA-style: mouse always orbits camera)
        const handlers = createMouseHandlers(
            canvas,
            this.cameraOrbit,
            this.mouseState,
            cameraModeRef,
            this.ui,
            setCameraMode
        );

        this.boundHandlers.mousedown = handlers.mousedown;
        this.boundHandlers.mouseup = handlers.mouseup;
        this.boundHandlers.mousemove = handlers.mousemove;
        this.boundHandlers.wheel = handlers.wheel;
        this.boundHandlers.contextmenu = handlers.contextmenu;

        canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        window.addEventListener('mouseup', this.boundHandlers.mouseup);
        window.addEventListener('mousemove', this.boundHandlers.mousemove);
        canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
        canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    }

    private resetCamera(): void {
        const birdRotation = this.playerBird ? this.playerBird.rotation : null;
        resetCameraOrbit(this.cameraOrbit, birdRotation);
        // GTA-style: after reset, camera stays independent (ORBIT mode)
        this.cameraMode = CAMERA_MODES.ORBIT;
        this.ui?.showCameraMode('Camera Reset');
    }

    // Public for GameInterface (TouchControls)
    public cycleCameraMode(): void {
        const result = cycleCameraModeUtil(this.cameraMode, this.cameraOrbit);
        this.cameraMode = result.newMode;
        this.ui?.showCameraMode(result.modeName);
    }

    private setupUICallbacks(): void {
        if (!this.ui || !this.network) return;

        this.ui.on('startGame', (data: { playerName: string; bird: string; location: string }) => {
            if (this.audioManager) {
                this.audioManager.init();
                this.audioManager.resume();
                this.audioManager.playGameStart();
            }
            this.startGame(data.playerName, data.bird, data.location);
        });

        this.ui.on('sendChat', (message: string) => {
            if (!this.network?.sendChat(message)) {
                this.ui?.addChatMessage('', 'Message not sent - disconnected', true);
            }
        });

        this.ui.on('changeLocation', (location: string) => {
            if (location !== this.currentLocation) {
                this.ui?.showLoading(`Connecting to ${LOCATIONS[location]?.name || location}...`);
                this.ui?.setLoadingProgress(10);

                if (!this.network?.changeLocation(location)) {
                    this.ui?.hideLoading();
                    this.ui?.addChatMessage('', 'Cannot change location - disconnected', true);
                } else {
                    this.ui?.setLoadingProgress(30);
                }
            }
        });

        this.ui.on('resumeGame', () => {
            this.paused = false;
            this.audioManager?.playResume();
        });

        this.ui.on('createRoom', (data: { playerName: string; bird: string; location: string }) => {
            if (this.audioManager) {
                this.audioManager.init();
                this.audioManager.resume();
                this.audioManager.playGameStart();
            }
            const webrtc = new WebRTCNetworkManager();
            this.setNetwork(webrtc);
            webrtc.createRoom(data.playerName, data.bird, data.location).then((gameData) => {
                this.ui?.showRoomCode(webrtc.getRoomCode() || '');
                const ctx = this.createLifecycleContext();
                this.startGameWithData(ctx, gameData, data.bird, data.location);
            }).catch((err) => {
                console.error('Failed to create room:', err);
                this.isRunning = false;
                this.ui?.showConnectionStatus('failed', { reason: err.message });
                this.ui?.addChatMessage('', `Failed to create room: ${err.message}`, true);
                this.ui?.showMenu();
            });
        });

        this.ui.on('joinRoom', (data: { roomCode: string; playerName: string; bird: string; location: string }) => {
            if (this.audioManager) {
                this.audioManager.init();
                this.audioManager.resume();
                this.audioManager.playGameStart();
            }
            const webrtc = new WebRTCNetworkManager();
            this.setNetwork(webrtc);
            this.ui?.showConnectionStatus('connecting');
            webrtc.joinRoom(data.roomCode, data.playerName, data.bird, data.location).then((gameData) => {
                const ctx = this.createLifecycleContext();
                this.startGameWithData(ctx, gameData, data.bird, data.location);
            }).catch((err) => {
                console.error('Failed to join room:', err);
                this.isRunning = false;
                this.ui?.showConnectionStatus('failed', { reason: err.message });
                this.ui?.addChatMessage('', `Failed to join room: ${err.message}`, true);
                this.ui?.showMenu();
            });
        });
    }

    private setupProgressionCallbacks(): void {
        if (!this.ui) return;

        if (this.progressionManager) {
            const stats = this.progressionManager.getStats();
            this.ui.updateLevelDisplay(stats.level, stats.xpProgress, stats.xpToNext);

            this.progressionManager.onLevelUp = (oldLevel: number, newLevel: number, reward: LevelReward | undefined) => {
                const uiReward = reward ? { type: reward.type, description: reward.description } : null;
                this.ui?.showLevelUpPopup(oldLevel, newLevel, uiReward, this.audioManager);

                if (reward && this.playerBird && this.effectsManager) {
                    if (reward.type === 'trail' && reward.trailId) {
                        this.effectsManager.createTrail('player', reward.trailId, this.playerBird.group);
                    }
                    if (reward.type === 'aura' && reward.auraId) {
                        this.effectsManager.createAura('player', reward.auraId, this.playerBird.group);
                    }
                }
            };

            this.progressionManager.onXPGain = (amount: number, source: string, _totalXP: number, _progress: number) => {
                this.ui?.showXPNotification(amount, source);
                if (this.progressionManager) {
                    const stats = this.progressionManager.getStats();
                    this.ui?.updateLevelDisplay(stats.level, stats.xpProgress, stats.xpToNext);
                }
            };
        }

        if (this.dailyRewardsManager) {
            this.dailyRewardsManager.onRewardClaimed = (_reward: ClaimedReward) => {
                // Reward claimed - could add additional handling here
            };
        }
    }

    private initNetworkCallbacks(): void {
        const ctx: NetworkCallbackContext = {
            isRunning: this.isRunning,
            score: this.score,
            goldenWormAlertShown: this.goldenWormAlertShown,
            network: this.network,
            ui: this.ui,
            audioManager: this.audioManager,
            progressionManager: this.progressionManager,
            wormManager: this.wormManager,
            flyManager: this.flyManager,
            effectsManager: this.effectsManager,
            comboManager: this.comboManager,
            playerBird: this.playerBird,
            otherPlayers: this.otherPlayers,
            addOtherPlayer: (playerData: PlayerData) => this.addOtherPlayer(playerData),
            updatePlayerList: () => this.updatePlayerList(),
            changeLocation: (location: string, worms: WormData[], flies: FlyData[], players: PlayerData[]) =>
                this.changeLocation(location, worms, flies, players),
            setScore: (score: number) => { this.score = score; },
            setGoldenWormAlertShown: (shown: boolean) => { this.goldenWormAlertShown = shown; }
        };

        // Create a proxy to keep context in sync with game state
        const proxyCtx = new Proxy(ctx, {
            get: (target, prop) => {
                switch (prop) {
                    case 'isRunning': return this.isRunning;
                    case 'score': return this.score;
                    case 'goldenWormAlertShown': return this.goldenWormAlertShown;
                    case 'playerBird': return this.playerBird;
                    default: return target[prop as keyof NetworkCallbackContext];
                }
            }
        });

        setupNetworkCallbacks(proxyCtx);
    }

    private setNetwork(network: AnyNetworkManager): void {
        if (this.network) {
            this.network.removeAllCallbacks();
            this.network.disconnect();
        }
        this.network = network;
        this.initNetworkCallbacks();
    }

    async startGame(playerName: string, birdType: string, location: string): Promise<void> {
        const ctx = this.createLifecycleContext();
        await startGameLifecycle(ctx, playerName, birdType, location);
    }

    private startGameWithData(ctx: LifecycleContext, gameData: import('../core/network.ts').WelcomeData, birdType: string, location: string): void {
        if (!ctx.ui || !ctx.scene || !ctx.world) return;

        this.isRunning = true;
        initGameWithDataLifecycle(ctx, gameData, birdType, location);
        this.animateLoop();
    }

    private changeLocation(location: string, worms: WormData[], flies: FlyData[], players: PlayerData[]): void {
        const ctx = this.createLifecycleContext();
        changeLocationLifecycle(ctx, location, worms, flies, players);
    }

    private respawnPlayer(): void {
        const collisionTimeRef = { value: this.collisionStartTime };
        const ctx = this.createLifecycleContext();
        respawnPlayerLifecycle(ctx, collisionTimeRef);
        this.collisionStartTime = collisionTimeRef.value;
    }

    private addOtherPlayer(playerData: PlayerData): void {
        const ctx = this.createLifecycleContext();
        addOtherPlayerLifecycle(ctx, playerData);
    }

    private createLifecycleContext(): LifecycleContext {
        return {
            isRunning: this.isRunning,
            score: this.score,
            currentLocation: this.currentLocation,
            paused: this.paused,
            scene: this.scene,
            network: this.network,
            ui: this.ui,
            audioManager: this.audioManager,
            progressionManager: this.progressionManager,
            dailyRewardsManager: this.dailyRewardsManager,
            wormManager: this.wormManager,
            flyManager: this.flyManager,
            effectsManager: this.effectsManager,
            weatherSystem: this.weatherSystem,
            world: this.world,
            touchControls: this.touchControls,
            playerBird: this.playerBird,
            otherPlayers: this.otherPlayers,
            cameraOrbit: this.cameraOrbit,
            dailyRewardTimeout: this.dailyRewardTimeout,
            loadingTimeout: this.loadingTimeout,
            setIsRunning: (running: boolean) => { this.isRunning = running; },
            setScore: (score: number) => { this.score = score; },
            setCurrentLocation: (location: string) => { this.currentLocation = location; },
            setPaused: (paused: boolean) => { this.paused = paused; },
            setPlayerBird: (bird: Bird | null) => { this.playerBird = bird; },
            setDailyRewardTimeout: (timeout: ReturnType<typeof setTimeout> | null) => { this.dailyRewardTimeout = timeout; },
            setLoadingTimeout: (timeout: ReturnType<typeof setTimeout> | null) => { this.loadingTimeout = timeout; },
            updatePlayerList: () => this.updatePlayerList(),
            resetCamera: () => this.resetCamera(),
            animate: () => this.animateLoop(),
            setNetwork: (network: AnyNetworkManager) => this.setNetwork(network)
        };
    }

    private createUpdateContext(): UpdateContext {
        return {
            paused: this.paused,
            isRunning: this.isRunning,
            goldenWormAlertShown: this.goldenWormAlertShown,
            lastPositionUpdate: this.lastPositionUpdate,
            positionUpdateInterval: this.positionUpdateInterval,
            collisionStartTime: this.collisionStartTime,
            collisionRespawnDelay: this.collisionRespawnDelay,
            input: this.input,
            cameraOrbit: this.cameraOrbit,
            cameraMode: this.cameraMode,
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            clock: this.clock,
            network: this.network,
            ui: this.ui,
            audioManager: this.audioManager,
            wormManager: this.wormManager,
            flyManager: this.flyManager,
            effectsManager: this.effectsManager,
            ambientParticles: this.ambientParticles,
            weatherSystem: this.weatherSystem,
            world: this.world,
            touchControls: this.touchControls,
            playerBird: this.playerBird,
            otherPlayers: this.otherPlayers,
            animationFrameId: this.animationFrameId,
            setCameraMode: (mode: CameraMode) => { this.cameraMode = mode; },
            setGoldenWormAlertShown: (shown: boolean) => { this.goldenWormAlertShown = shown; },
            setLastPositionUpdate: (time: number) => { this.lastPositionUpdate = time; },
            setCollisionStartTime: (time: number | null) => { this.collisionStartTime = time; },
            setAnimationFrameId: (id: number | null) => { this.animationFrameId = id; },
            setIsRunning: (running: boolean) => { this.isRunning = running; },
            respawnPlayer: () => this.respawnPlayer()
        };
    }

    private updatePlayerList(): void {
        const players: Array<{ name: string; bird: string; score: number }> = [];

        if (this.playerBird && this.network) {
            players.push({
                name: (this.network.getPlayerName() || 'You') + ' (You)',
                bird: this.network.getBirdType() ?? 'sparrow',
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

        this.ui?.updatePlayerList(players);
    }

    private animateLoop(): void {
        const baseCtx = this.createUpdateContext();
        // Use proxy to ensure dynamic primitive properties are always read from this
        // Objects are passed by reference and don't need proxying
        const ctx = new Proxy(baseCtx, {
            get: (target, prop) => {
                switch (prop) {
                    case 'paused': return this.paused;
                    case 'isRunning': return this.isRunning;
                    case 'goldenWormAlertShown': return this.goldenWormAlertShown;
                    case 'cameraMode': return this.cameraMode;
                    case 'lastPositionUpdate': return this.lastPositionUpdate;
                    case 'collisionStartTime': return this.collisionStartTime;
                    case 'playerBird': return this.playerBird;
                    default: return target[prop as keyof UpdateContext];
                }
            }
        });
        animate(ctx);
    }

    private onResize(): void {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    cleanup(): void {
        const ctx = this.createUpdateContext();
        stopAnimation(ctx);

        // Clear pending timeouts
        if (this.dailyRewardTimeout) {
            clearTimeout(this.dailyRewardTimeout);
            this.dailyRewardTimeout = null;
        }
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }

        if (this.network) {
            this.network.removeAllCallbacks();
            this.network.disconnect();
        }

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
        if (this.boundHandlers.blur) {
            window.removeEventListener('blur', this.boundHandlers.blur);
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

        this.touchControls?.cleanup();
        this.ui?.cleanup();
        this.ambientParticles?.cleanup();
        this.effectsManager?.cleanup();

        if (this.renderer) {
            this.renderer.dispose();
        }

        this.otherPlayers.forEach(player => {
            if (player.bird) {
                player.bird.remove();
            }
        });
        this.otherPlayers.clear();

        if (this.world) {
            this.world.clear();
        }

        if (this.wormManager) {
            this.wormManager.cleanup();
        }

        if (this.flyManager) {
            this.flyManager.cleanup();
        }

        if (this.weatherSystem) {
            this.weatherSystem.clear();
        }
    }
}

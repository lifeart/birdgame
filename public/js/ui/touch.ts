// Touch Controls Manager for Mobile Devices
import { AudioManager } from '../core/audio.ts';

// Camera modes enum
export const CAMERA_MODES = {
    FOLLOW: 'follow',
    ORBIT: 'orbit',
    TOP: 'top',
    SIDE: 'side'
} as const;

export type CameraMode = typeof CAMERA_MODES[keyof typeof CAMERA_MODES];

interface JoystickState {
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    element: HTMLElement | null;
    knob: HTMLElement | null;
    maxRadius: number;
}

interface CameraTouchState {
    active: boolean;
    lastX: number;
    lastY: number;
    touchId: number | null;
}

interface PinchState {
    active: boolean;
    initialDistance: number;
}

interface ButtonStates {
    up: boolean;
    down: boolean;
}

interface TouchInput {
    forward: number;
    backward: number;
    left: number;
    right: number;
    up: number;
    down: number;
    turnRate: number;
    isTouch: boolean;
}

export interface GameInterface {
    ui: {
        isPauseMenuOpen(): boolean;
        hidePauseMenu(): void;
        showPauseMenu(): void;
        showCameraMode(mode: string): void;
        openChat(): void;
    } | null;
    paused: boolean;
    cycleCameraMode(): void;
    resetInput(): void;
    renderer: { domElement: HTMLCanvasElement } | null;
    cameraMode: CameraMode;
    cameraOrbit: {
        targetDistance: number;
        minDistance: number;
        maxDistance: number;
        targetAngle: number;
        targetPitch: number;
        minPitch: number;
        maxPitch: number;
    };
}

export class TouchControls {
    private game: GameInterface;
    private audioManager: AudioManager | null;
    private enabled: boolean = false;
    private container: HTMLElement | null = null;

    private joystick: JoystickState = {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        element: null,
        knob: null,
        maxRadius: 42
    };
    private joystickTouchId: number | null = null;

    private cameraTouch: CameraTouchState = {
        active: false,
        lastX: 0,
        lastY: 0,
        touchId: null
    };

    // Two-finger camera control (rotation + zoom simultaneously)
    private twoFingerCamera: {
        active: boolean;
        touchIds: [number, number] | null;
        lastCenter: { x: number; y: number };
        lastDistance: number;
        lastAngle: number;
    } = {
        active: false,
        touchIds: null,
        lastCenter: { x: 0, y: 0 },
        lastDistance: 0,
        lastAngle: 0
    };

    private pinch: PinchState = {
        active: false,
        initialDistance: 0
    };

    private buttons: ButtonStates = {
        up: false,
        down: false
    };

    private hintTimeout: ReturnType<typeof setTimeout> | null = null;
    private chatFocusTimeout: ReturnType<typeof setTimeout> | null = null;

    // Cleanup references
    private styleElement: HTMLStyleElement | null = null;
    private canvasTouchHandlers: {
        start: ((e: TouchEvent) => void) | null;
        move: ((e: TouchEvent) => void) | null;
        end: ((e: TouchEvent) => void) | null;
        cancel: ((e: TouchEvent) => void) | null;
    } = { start: null, move: null, end: null, cancel: null };

    // Document-level event handlers for cleanup
    private documentTouchMoveHandler: ((e: TouchEvent) => void) | null = null;
    private documentTouchEndHandler: ((e: TouchEvent) => void) | null = null;
    private documentGestureStartHandler: ((e: Event) => void) | null = null;
    private documentGestureChangeHandler: ((e: Event) => void) | null = null;

    // Button event handlers for cleanup
    private buttonHandlers: Map<string, { element: HTMLElement; handlers: { [event: string]: EventListener } }> = new Map();
    private joystickZoneHandlers: { element: HTMLElement | null; handlers: { [event: string]: EventListener } } = { element: null, handlers: {} };

    constructor(game: GameInterface, audioManager: AudioManager | null) {
        this.game = game;
        this.audioManager = audioManager;
        this.init();
    }

    private init(): void {
        this.enabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (!this.enabled) return;

        this.createUI();
        this.setupEventListeners();
        this.preventDefaults();
    }

    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.innerHTML = `
            <div class="touch-zone touch-zone-left" id="joystick-zone">
                <div class="joystick" id="joystick">
                    <div class="joystick-knob" id="joystick-knob"></div>
                </div>
            </div>
            <div class="touch-zone touch-zone-right" id="button-zone">
                <button class="touch-btn touch-btn-up" id="btn-up">
                    <span class="btn-icon">↑</span>
                    <span class="btn-label">UP</span>
                </button>
                <button class="touch-btn touch-btn-down" id="btn-down">
                    <span class="btn-icon">↓</span>
                    <span class="btn-label">DOWN</span>
                </button>
            </div>
            <div class="touch-zone touch-zone-top" id="top-buttons">
                <button class="touch-btn-small" id="btn-pause">⏸</button>
                <button class="touch-btn-small" id="btn-camera">📷</button>
                <button class="touch-btn-small" id="btn-sound">🔊</button>
                <button class="touch-btn-small" id="btn-chat">💬</button>
            </div>
            <div class="touch-hint" id="touch-hint">
                ← Joystick to move • Buttons for up/down → • Swipe center to look around
            </div>
        `;
        document.body.appendChild(this.container);

        this.joystick.element = document.getElementById('joystick');
        this.joystick.knob = document.getElementById('joystick-knob');

        this.addStyles();
    }

    private addStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            #touch-controls {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 90;
                touch-action: none;
                padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }

            #touch-controls.active {
                display: block;
            }

            .touch-zone {
                position: absolute;
                pointer-events: auto;
            }

            .touch-zone-left {
                left: 0;
                bottom: env(safe-area-inset-bottom, 0);
                width: 35%;
                height: 45%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding-left: 10px;
                padding-bottom: 60px;
            }

            .touch-zone-right {
                right: 0;
                bottom: env(safe-area-inset-bottom, 0);
                width: 25%;
                height: 45%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 15px;
                padding-right: 10px;
                padding-bottom: 20px;
            }

            .touch-zone-top {
                top: 70px;
                right: 10px;
                display: flex;
                gap: 8px;
            }

            .joystick {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.08);
                border: 2px solid rgba(255, 255, 255, 0.15);
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
            }

            .joystick-knob {
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.25);
                border: 1px solid rgba(255, 255, 255, 0.4);
                position: absolute;
                transition: transform 0.05s ease-out;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }

            .joystick.active {
                background: rgba(255, 255, 255, 0.12);
            }

            .joystick.active .joystick-knob {
                background: rgba(72, 219, 251, 0.4);
                border-color: rgba(72, 219, 251, 0.6);
            }

            .touch-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.08);
                color: rgba(255, 255, 255, 0.85);
                font-size: 12px;
                font-weight: 500;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
                transition: all 0.15s ease;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            }

            .touch-btn .btn-icon {
                font-size: 22px;
                line-height: 1;
                opacity: 0.9;
            }

            .touch-btn .btn-label {
                font-size: 9px;
                margin-top: 2px;
                opacity: 0.6;
            }

            .touch-btn:active,
            .touch-btn.pressed {
                background: rgba(72, 219, 251, 0.25);
                border-color: rgba(72, 219, 251, 0.4);
                transform: scale(0.96);
            }

            .touch-btn-up {
                background: rgba(76, 175, 80, 0.1);
                border-color: rgba(76, 175, 80, 0.25);
            }

            .touch-btn-up:active,
            .touch-btn-up.pressed {
                background: rgba(76, 175, 80, 0.3);
                border-color: rgba(76, 175, 80, 0.5);
            }

            .touch-btn-down {
                background: rgba(244, 67, 54, 0.1);
                border-color: rgba(244, 67, 54, 0.25);
            }

            .touch-btn-down:active,
            .touch-btn-down.pressed {
                background: rgba(244, 67, 54, 0.3);
                border-color: rgba(244, 67, 54, 0.5);
            }

            .touch-btn-small {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(0, 0, 0, 0.25);
                color: rgba(255, 255, 255, 0.85);
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
            }

            .touch-btn-small:active {
                background: rgba(255, 255, 255, 0.15);
            }

            .touch-hint {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.5);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.5s ease-out;
            }

            .touch-hint.visible {
                opacity: 0.7;
            }

            .menu:not(.hidden) ~ #touch-controls {
                pointer-events: none;
                opacity: 0.3;
            }

            .popup:not(.hidden) ~ #touch-controls {
                pointer-events: none;
                opacity: 0;
            }

            @media (max-width: 400px) {
                .touch-zone-left {
                    width: 30%;
                    padding-bottom: 50px;
                }
                .touch-zone-right {
                    width: 22%;
                    gap: 10px;
                }
                .joystick {
                    width: 85px;
                    height: 85px;
                }
                .joystick-knob {
                    width: 36px;
                    height: 36px;
                }
                .touch-btn {
                    width: 52px;
                    height: 52px;
                    font-size: 11px;
                }
                .touch-btn .btn-icon {
                    font-size: 18px;
                }
                .touch-btn .btn-label {
                    font-size: 8px;
                }
                .touch-btn-small {
                    width: 35px;
                    height: 35px;
                    font-size: 15px;
                }
                .touch-zone-top {
                    top: 60px;
                    gap: 6px;
                }
            }

            @media (max-height: 450px) and (orientation: landscape) {
                .touch-zone-left {
                    height: 60%;
                    width: 25%;
                    padding-bottom: 10px;
                }
                .touch-zone-right {
                    height: 60%;
                    width: 18%;
                    gap: 8px;
                    padding-bottom: 5px;
                }
                .joystick {
                    width: 80px;
                    height: 80px;
                }
                .joystick-knob {
                    width: 34px;
                    height: 34px;
                }
                .touch-btn {
                    width: 48px;
                    height: 48px;
                }
                .touch-btn .btn-icon {
                    font-size: 16px;
                }
                .touch-btn .btn-label {
                    display: none;
                }
                .touch-zone-top {
                    top: 5px;
                }
                .touch-btn-small {
                    width: 32px;
                    height: 32px;
                    font-size: 14px;
                }
                .touch-hint {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
        this.styleElement = style;
    }

    private setupEventListeners(): void {
        const joystickZone = document.getElementById('joystick-zone');
        const btnUp = document.getElementById('btn-up');
        const btnDown = document.getElementById('btn-down');
        const btnPause = document.getElementById('btn-pause');
        const btnCamera = document.getElementById('btn-camera');
        const btnSound = document.getElementById('btn-sound');
        const btnChat = document.getElementById('btn-chat');

        if (joystickZone) {
            const handlers = {
                touchstart: (e: Event) => this.onJoystickStart(e as TouchEvent),
                touchmove: (e: Event) => this.onJoystickMove(e as TouchEvent),
                touchend: (e: Event) => this.onJoystickEnd(e as TouchEvent),
                touchcancel: (e: Event) => this.onJoystickEnd(e as TouchEvent)
            };
            this.joystickZoneHandlers = { element: joystickZone, handlers };
            joystickZone.addEventListener('touchstart', handlers.touchstart, { passive: false });
            joystickZone.addEventListener('touchmove', handlers.touchmove, { passive: false });
            joystickZone.addEventListener('touchend', handlers.touchend, { passive: false });
            joystickZone.addEventListener('touchcancel', handlers.touchcancel, { passive: false });
        }

        if (btnUp) {
            const handlers: { [event: string]: EventListener } = {
                touchstart: (e: Event) => {
                    e.preventDefault();
                    this.buttons.up = true;
                    btnUp.classList.add('pressed');
                },
                touchend: (e: Event) => {
                    e.preventDefault();
                    this.buttons.up = false;
                    btnUp.classList.remove('pressed');
                }
            };
            this.buttonHandlers.set('btn-up', { element: btnUp, handlers });
            btnUp.addEventListener('touchstart', handlers.touchstart, { passive: false });
            btnUp.addEventListener('touchend', handlers.touchend, { passive: false });
        }

        if (btnDown) {
            const handlers: { [event: string]: EventListener } = {
                touchstart: (e: Event) => {
                    e.preventDefault();
                    this.buttons.down = true;
                    btnDown.classList.add('pressed');
                },
                touchend: (e: Event) => {
                    e.preventDefault();
                    this.buttons.down = false;
                    btnDown.classList.remove('pressed');
                }
            };
            this.buttonHandlers.set('btn-down', { element: btnDown, handlers });
            btnDown.addEventListener('touchstart', handlers.touchstart, { passive: false });
            btnDown.addEventListener('touchend', handlers.touchend, { passive: false });
        }

        if (btnPause) {
            const handlers: { [event: string]: EventListener } = {
                touchend: (e: Event) => {
                    e.preventDefault();
                    if (this.game.ui?.isPauseMenuOpen()) {
                        this.game.ui.hidePauseMenu();
                        this.game.paused = false;
                        this.audioManager?.playResume();
                    } else {
                        this.game.ui?.showPauseMenu();
                        this.game.paused = true;
                        this.audioManager?.playPause();
                    }
                }
            };
            this.buttonHandlers.set('btn-pause', { element: btnPause, handlers });
            btnPause.addEventListener('touchend', handlers.touchend, { passive: false });
        }

        if (btnCamera) {
            const handlers: { [event: string]: EventListener } = {
                touchend: (e: Event) => {
                    e.preventDefault();
                    this.game.cycleCameraMode();
                }
            };
            this.buttonHandlers.set('btn-camera', { element: btnCamera, handlers });
            btnCamera.addEventListener('touchend', handlers.touchend, { passive: false });
        }

        if (btnSound) {
            const handlers: { [event: string]: EventListener } = {
                touchend: (e: Event) => {
                    e.preventDefault();
                    const soundOn = this.audioManager?.toggle();
                    btnSound.textContent = soundOn ? '🔊' : '🔇';
                    this.game.ui?.showCameraMode(soundOn ? 'Sound ON' : 'Sound OFF');
                }
            };
            this.buttonHandlers.set('btn-sound', { element: btnSound, handlers });
            btnSound.addEventListener('touchend', handlers.touchend, { passive: false });
        }

        if (btnChat) {
            const handlers: { [event: string]: EventListener } = {
                touchend: (e: Event) => {
                    e.preventDefault();
                    if (!this.game.paused) {
                        this.game.resetInput();
                        this.game.ui?.openChat();
                        if (this.chatFocusTimeout) {
                            clearTimeout(this.chatFocusTimeout);
                        }
                        this.chatFocusTimeout = setTimeout(() => {
                            this.chatFocusTimeout = null;
                            const chatInput = document.getElementById('chatInput') as HTMLInputElement;
                            chatInput?.focus();
                        }, 100);
                    }
                }
            };
            this.buttonHandlers.set('btn-chat', { element: btnChat, handlers });
            btnChat.addEventListener('touchend', handlers.touchend, { passive: false });
        }

        const canvas = this.game.renderer?.domElement;
        if (canvas) {
            // Store handlers for cleanup
            this.canvasTouchHandlers.start = (e: TouchEvent) => this.onCameraTouchStart(e);
            this.canvasTouchHandlers.move = (e: TouchEvent) => this.onCameraTouchMove(e);
            this.canvasTouchHandlers.end = (e: TouchEvent) => this.onCameraTouchEnd(e);
            this.canvasTouchHandlers.cancel = (e: TouchEvent) => this.onCameraTouchCancel(e);

            canvas.addEventListener('touchstart', this.canvasTouchHandlers.start, { passive: false });
            canvas.addEventListener('touchmove', this.canvasTouchHandlers.move, { passive: false });
            canvas.addEventListener('touchend', this.canvasTouchHandlers.end, { passive: false });
            canvas.addEventListener('touchcancel', this.canvasTouchHandlers.cancel, { passive: false });
        }
    }

    private preventDefaults(): void {
        this.documentTouchMoveHandler = (e: TouchEvent) => {
            if (this.container?.classList.contains('active')) {
                e.preventDefault();
            }
        };
        document.addEventListener('touchmove', this.documentTouchMoveHandler, { passive: false });

        let lastTouchEnd = 0;
        this.documentTouchEndHandler = (e: TouchEvent) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        };
        document.addEventListener('touchend', this.documentTouchEndHandler, { passive: false });

        this.documentGestureStartHandler = (e: Event) => e.preventDefault();
        this.documentGestureChangeHandler = (e: Event) => e.preventDefault();
        document.addEventListener('gesturestart', this.documentGestureStartHandler, { passive: false });
        document.addEventListener('gesturechange', this.documentGestureChangeHandler, { passive: false });
    }

    private onJoystickStart(e: TouchEvent): void {
        e.preventDefault();
        if (!this.joystick.element) return;

        // Find a new touch that started in the joystick zone
        const rect = this.joystick.element.getBoundingClientRect();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            // Check if this touch is in the joystick zone and we don't already have an active joystick
            if (!this.joystick.active && this.isTouchInRect(touch, rect)) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                this.joystick.active = true;
                this.joystickTouchId = touch.identifier;
                this.joystick.startX = centerX;
                this.joystick.startY = centerY;
                this.joystick.currentX = touch.clientX;
                this.joystick.currentY = touch.clientY;
                this.joystick.element.classList.add('active');
                this.updateJoystickVisual();
                break;
            }
        }
    }

    private onJoystickMove(e: TouchEvent): void {
        if (!this.joystick.active || this.joystickTouchId === null) return;
        e.preventDefault();

        // Find our tracked touch by identifier
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            if (touch.identifier === this.joystickTouchId) {
                this.joystick.currentX = touch.clientX;
                this.joystick.currentY = touch.clientY;
                this.updateJoystickVisual();
                break;
            }
        }
    }

    private onJoystickEnd(e: TouchEvent): void {
        e.preventDefault();
        if (this.joystickTouchId === null) return;

        // Check if our tracked touch has ended
        let touchEnded = true;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.joystickTouchId) {
                touchEnded = false;
                break;
            }
        }

        if (touchEnded) {
            this.joystick.active = false;
            this.joystickTouchId = null;
            this.joystick.element?.classList.remove('active');
            if (this.joystick.knob) {
                this.joystick.knob.style.transform = 'translate(0, 0)';
            }
        }
    }

    private isTouchInRect(touch: Touch, rect: DOMRect): boolean {
        return touch.clientX >= rect.left && touch.clientX <= rect.right &&
               touch.clientY >= rect.top && touch.clientY <= rect.bottom;
    }

    private updateJoystickVisual(): void {
        let dx = this.joystick.currentX - this.joystick.startX;
        let dy = this.joystick.currentY - this.joystick.startY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.joystick.maxRadius) {
            const ratio = this.joystick.maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        if (this.joystick.knob) {
            this.joystick.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    private onCameraTouchStart(e: TouchEvent): void {
        const screenWidth = window.innerWidth;

        // Get camera-zone touches (excluding joystick touch)
        const cameraTouches = this.getCameraZoneTouches(e.touches, screenWidth);

        if (cameraTouches.length >= 2) {
            // Two-finger mode: rotation + zoom
            this.startTwoFingerCamera(cameraTouches[0], cameraTouches[1]);
        } else if (cameraTouches.length === 1 && !this.cameraTouch.active && !this.twoFingerCamera.active) {
            // Single-finger camera drag
            const touch = cameraTouches[0];
            this.cameraTouch.active = true;
            this.cameraTouch.touchId = touch.identifier;
            this.cameraTouch.lastX = touch.clientX;
            this.cameraTouch.lastY = touch.clientY;

            if (this.game.cameraMode === CAMERA_MODES.FOLLOW) {
                this.game.cameraMode = CAMERA_MODES.ORBIT;
            }
        }
    }

    private onCameraTouchMove(e: TouchEvent): void {
        const screenWidth = window.innerWidth;
        const cameraTouches = this.getCameraZoneTouches(e.touches, screenWidth);

        if (this.twoFingerCamera.active && cameraTouches.length >= 2) {
            // Two-finger mode: rotation + zoom simultaneously
            const touch1 = this.findTouchById(e.touches, this.twoFingerCamera.touchIds![0]);
            const touch2 = this.findTouchById(e.touches, this.twoFingerCamera.touchIds![1]);

            if (touch1 && touch2) {
                // Calculate current center and distance
                const currentCenter = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
                const currentDistance = this.getTouchDistanceFromTouches(touch1, touch2);
                const currentAngle = Math.atan2(
                    touch2.clientY - touch1.clientY,
                    touch2.clientX - touch1.clientX
                );

                // Apply zoom from distance change
                const scale = currentDistance / this.twoFingerCamera.lastDistance;
                const zoomFactor = 1 + (1 - scale) * 0.5;
                this.game.cameraOrbit.targetDistance *= zoomFactor;
                this.game.cameraOrbit.targetDistance = Math.max(
                    this.game.cameraOrbit.minDistance,
                    Math.min(this.game.cameraOrbit.maxDistance, this.game.cameraOrbit.targetDistance)
                );

                // Apply rotation from center movement
                const deltaX = currentCenter.x - this.twoFingerCamera.lastCenter.x;
                const deltaY = currentCenter.y - this.twoFingerCamera.lastCenter.y;
                this.game.cameraOrbit.targetAngle -= deltaX * 0.006;
                this.game.cameraOrbit.targetPitch += deltaY * 0.004;
                this.game.cameraOrbit.targetPitch = Math.max(
                    this.game.cameraOrbit.minPitch,
                    Math.min(this.game.cameraOrbit.maxPitch, this.game.cameraOrbit.targetPitch)
                );

                // Apply rotation from twist gesture
                const angleDelta = currentAngle - this.twoFingerCamera.lastAngle;
                this.game.cameraOrbit.targetAngle -= angleDelta * 0.5;

                // Update last state
                this.twoFingerCamera.lastCenter = currentCenter;
                this.twoFingerCamera.lastDistance = currentDistance;
                this.twoFingerCamera.lastAngle = currentAngle;

                e.preventDefault();
            }
        } else if (this.cameraTouch.active) {
            // Single-finger camera drag
            const touch = this.findTouchById(e.touches, this.cameraTouch.touchId!);
            if (touch) {
                const deltaX = touch.clientX - this.cameraTouch.lastX;
                const deltaY = touch.clientY - this.cameraTouch.lastY;

                this.game.cameraOrbit.targetAngle -= deltaX * 0.008;
                this.game.cameraOrbit.targetPitch += deltaY * 0.005;
                this.game.cameraOrbit.targetPitch = Math.max(
                    this.game.cameraOrbit.minPitch,
                    Math.min(this.game.cameraOrbit.maxPitch, this.game.cameraOrbit.targetPitch)
                );

                this.cameraTouch.lastX = touch.clientX;
                this.cameraTouch.lastY = touch.clientY;
                e.preventDefault();
            }
        }
    }

    private onCameraTouchEnd(e: TouchEvent): void {
        // Check if two-finger camera touches ended
        if (this.twoFingerCamera.active && this.twoFingerCamera.touchIds) {
            const touch1Exists = this.findTouchById(e.touches, this.twoFingerCamera.touchIds[0]) !== null;
            const touch2Exists = this.findTouchById(e.touches, this.twoFingerCamera.touchIds[1]) !== null;

            if (!touch1Exists || !touch2Exists) {
                this.twoFingerCamera.active = false;
                this.twoFingerCamera.touchIds = null;
                this.pinch.active = false;

                // If one finger remains, start single-finger mode
                const screenWidth = window.innerWidth;
                const cameraTouches = this.getCameraZoneTouches(e.touches, screenWidth);
                if (cameraTouches.length === 1) {
                    const touch = cameraTouches[0];
                    this.cameraTouch.active = true;
                    this.cameraTouch.touchId = touch.identifier;
                    this.cameraTouch.lastX = touch.clientX;
                    this.cameraTouch.lastY = touch.clientY;
                }
            }
        }

        // Check if single-finger camera touch ended
        if (this.cameraTouch.active && this.cameraTouch.touchId !== null) {
            if (!this.findTouchById(e.touches, this.cameraTouch.touchId)) {
                this.cameraTouch.active = false;
                this.cameraTouch.touchId = null;
            }
        }
    }

    private startTwoFingerCamera(touch1: Touch, touch2: Touch): void {
        this.twoFingerCamera.active = true;
        this.twoFingerCamera.touchIds = [touch1.identifier, touch2.identifier];
        this.twoFingerCamera.lastCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        this.twoFingerCamera.lastDistance = this.getTouchDistanceFromTouches(touch1, touch2);
        this.twoFingerCamera.lastAngle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );

        // Disable single-finger mode when switching to two-finger
        this.cameraTouch.active = false;
        this.cameraTouch.touchId = null;
        this.pinch.active = true;

        if (this.game.cameraMode === CAMERA_MODES.FOLLOW) {
            this.game.cameraMode = CAMERA_MODES.ORBIT;
        }
    }

    private getCameraZoneTouches(touches: TouchList, screenWidth: number): Touch[] {
        const result: Touch[] = [];
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            // Camera zone: center area (35% to 75% of screen width)
            // Left zone is 35%, right zone is 25%, leaving 40% center
            // Exclude touches that belong to the joystick
            if (touch.identifier !== this.joystickTouchId &&
                touch.clientX > screenWidth * 0.35 &&
                touch.clientX < screenWidth * 0.75) {
                result.push(touch);
            }
        }
        return result;
    }

    private findTouchById(touches: TouchList, id: number): Touch | null {
        for (let i = 0; i < touches.length; i++) {
            if (touches[i].identifier === id) {
                return touches[i];
            }
        }
        return null;
    }

    private getTouchDistanceFromTouches(touch1: Touch, touch2: Touch): number {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getTouchDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private onCameraTouchCancel(_e: TouchEvent): void {
        // Reset all camera touch states on cancel
        this.cameraTouch.active = false;
        this.cameraTouch.touchId = null;
        this.twoFingerCamera.active = false;
        this.twoFingerCamera.touchIds = null;
        this.pinch.active = false;
    }

    getInput(): TouchInput | null {
        if (!this.enabled || (!this.joystick.active && !this.buttons.up && !this.buttons.down)) {
            return null;
        }

        const input: TouchInput = {
            forward: 0,
            backward: 0,
            left: 0,
            right: 0,
            up: this.buttons.up ? 1 : 0,
            down: this.buttons.down ? 1 : 0,
            turnRate: 0,
            isTouch: true
        };

        if (this.joystick.active) {
            const dx = this.joystick.currentX - this.joystick.startX;
            const dy = this.joystick.currentY - this.joystick.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const deadZone = 10;
            if (distance > deadZone) {
                const normalizedX = Math.max(-1, Math.min(1, dx / this.joystick.maxRadius));
                const normalizedY = Math.max(-1, Math.min(1, dy / this.joystick.maxRadius));

                const smoothY = Math.sign(normalizedY) * Math.pow(Math.abs(normalizedY), 1.5);

                if (smoothY < -0.15) input.forward = Math.abs(smoothY);
                if (smoothY > 0.15) input.backward = smoothY;

                if (Math.abs(normalizedX) > 0.15) {
                    const smoothX = Math.sign(normalizedX) * Math.pow(Math.abs(normalizedX), 1.8);
                    input.turnRate = -smoothX * 0.6;
                }
            }
        }

        return input;
    }

    show(): void {
        if (this.enabled && this.container) {
            this.container.classList.add('active');
            this.showHintTemporarily();
        }
    }

    private showHintTemporarily(): void {
        const hint = document.getElementById('touch-hint');
        if (!hint) return;

        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
        }

        hint.classList.add('visible');

        this.hintTimeout = setTimeout(() => {
            hint.classList.remove('visible');
        }, 4000);
    }

    hide(): void {
        if (this.container) {
            this.container.classList.remove('active');
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    cleanup(): void {
        if (!this.enabled) return;

        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }
        if (this.chatFocusTimeout) {
            clearTimeout(this.chatFocusTimeout);
            this.chatFocusTimeout = null;
        }

        // Remove canvas touch event listeners
        const canvas = this.game.renderer?.domElement;
        if (canvas) {
            if (this.canvasTouchHandlers.start) {
                canvas.removeEventListener('touchstart', this.canvasTouchHandlers.start);
            }
            if (this.canvasTouchHandlers.move) {
                canvas.removeEventListener('touchmove', this.canvasTouchHandlers.move);
            }
            if (this.canvasTouchHandlers.end) {
                canvas.removeEventListener('touchend', this.canvasTouchHandlers.end);
            }
            if (this.canvasTouchHandlers.cancel) {
                canvas.removeEventListener('touchcancel', this.canvasTouchHandlers.cancel);
            }
        }
        this.canvasTouchHandlers = { start: null, move: null, end: null, cancel: null };

        // Remove document-level event listeners
        if (this.documentTouchMoveHandler) {
            document.removeEventListener('touchmove', this.documentTouchMoveHandler);
            this.documentTouchMoveHandler = null;
        }
        if (this.documentTouchEndHandler) {
            document.removeEventListener('touchend', this.documentTouchEndHandler);
            this.documentTouchEndHandler = null;
        }
        if (this.documentGestureStartHandler) {
            document.removeEventListener('gesturestart', this.documentGestureStartHandler);
            this.documentGestureStartHandler = null;
        }
        if (this.documentGestureChangeHandler) {
            document.removeEventListener('gesturechange', this.documentGestureChangeHandler);
            this.documentGestureChangeHandler = null;
        }

        // Remove joystick zone event listeners
        if (this.joystickZoneHandlers.element) {
            Object.entries(this.joystickZoneHandlers.handlers).forEach(([event, handler]) => {
                this.joystickZoneHandlers.element!.removeEventListener(event, handler);
            });
            this.joystickZoneHandlers = { element: null, handlers: {} };
        }

        // Remove button event listeners
        this.buttonHandlers.forEach(({ element, handlers }) => {
            Object.entries(handlers).forEach(([event, handler]) => {
                element.removeEventListener(event, handler);
            });
        });
        this.buttonHandlers.clear();

        // Remove style element
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }

        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        // Reset all touch states
        this.joystick.active = false;
        this.joystickTouchId = null;
        this.cameraTouch.active = false;
        this.cameraTouch.touchId = null;
        this.twoFingerCamera.active = false;
        this.twoFingerCamera.touchIds = null;
        this.pinch.active = false;
        this.buttons.up = false;
        this.buttons.down = false;

        this.enabled = false;
    }
}

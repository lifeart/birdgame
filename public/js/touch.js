// Touch Controls Manager for Mobile Devices
class TouchControls {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.container = null;

        // Joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            element: null,
            knob: null,
            maxRadius: 42
        };

        // Camera touch state
        this.cameraTouch = {
            active: false,
            lastX: 0,
            lastY: 0,
            touchId: null
        };

        // Pinch zoom state
        this.pinch = {
            active: false,
            initialDistance: 0
        };

        // Button states
        this.buttons = {
            up: false,
            down: false
        };

        // Track active touches
        this.activeTouches = new Map();

        // Hint timeout
        this.hintTimeout = null;

        this.init();
    }

    init() {
        // Check if touch device
        this.enabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (!this.enabled) return;

        this.createUI();
        this.setupEventListeners();
        this.preventDefaults();
    }

    createUI() {
        // Main container
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

        // Get references
        this.joystick.element = document.getElementById('joystick');
        this.joystick.knob = document.getElementById('joystick-knob');

        // Add styles
        this.addStyles();
    }

    addStyles() {
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
                /* Safe area for notched devices */
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

            /* Hide touch controls when menu is visible */
            .menu:not(.hidden) ~ #touch-controls {
                pointer-events: none;
                opacity: 0.3;
            }

            /* Hide touch controls when popup is visible */
            .popup:not(.hidden) ~ #touch-controls {
                pointer-events: none;
                opacity: 0;
            }

            /* Small phone adjustments */
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

            /* Landscape mode adjustments */
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
    }

    setupEventListeners() {
        const joystickZone = document.getElementById('joystick-zone');
        const btnUp = document.getElementById('btn-up');
        const btnDown = document.getElementById('btn-down');
        const btnPause = document.getElementById('btn-pause');
        const btnCamera = document.getElementById('btn-camera');
        const btnSound = document.getElementById('btn-sound');
        const btnChat = document.getElementById('btn-chat');

        // Joystick events
        joystickZone.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        joystickZone.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        joystickZone.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
        joystickZone.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });

        // Up/Down buttons
        btnUp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.buttons.up = true;
            btnUp.classList.add('pressed');
        }, { passive: false });

        btnUp.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.buttons.up = false;
            btnUp.classList.remove('pressed');
        }, { passive: false });

        btnDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.buttons.down = true;
            btnDown.classList.add('pressed');
        }, { passive: false });

        btnDown.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.buttons.down = false;
            btnDown.classList.remove('pressed');
        }, { passive: false });

        // Top buttons
        btnPause.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.game.ui.isPauseMenuOpen()) {
                this.game.ui.hidePauseMenu();
                this.game.paused = false;
                audioManager.playResume();
            } else {
                this.game.ui.showPauseMenu();
                this.game.paused = true;
                audioManager.playPause();
            }
        }, { passive: false });

        btnCamera.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.game.cycleCameraMode();
        }, { passive: false });

        btnSound.addEventListener('touchend', (e) => {
            e.preventDefault();
            const soundOn = audioManager.toggle();
            btnSound.textContent = soundOn ? '🔊' : '🔇';
            this.game.ui.showCameraMode(soundOn ? 'Sound ON' : 'Sound OFF');
        }, { passive: false });

        btnChat.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.game.paused) {
                this.game.resetInput();
                this.game.ui.openChat();
                // Focus chat input for mobile keyboard
                setTimeout(() => {
                    document.getElementById('chatInput').focus();
                }, 100);
            }
        }, { passive: false });

        // Camera control - touch on canvas (middle area)
        const canvas = this.game.renderer.domElement;
        canvas.addEventListener('touchstart', (e) => this.onCameraTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onCameraTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onCameraTouchEnd(e), { passive: false });
    }

    preventDefaults() {
        // Prevent default touch behaviors on the game
        document.addEventListener('touchmove', (e) => {
            if (this.container.classList.contains('active')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // Prevent pinch zoom on document (but we'll handle it for camera)
        document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    }

    onJoystickStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.joystick.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        this.joystick.active = true;
        this.joystick.startX = centerX;
        this.joystick.startY = centerY;
        this.joystick.currentX = touch.clientX;
        this.joystick.currentY = touch.clientY;
        this.joystick.element.classList.add('active');

        this.updateJoystickVisual();
    }

    onJoystickMove(e) {
        if (!this.joystick.active) return;
        e.preventDefault();

        const touch = e.touches[0];
        this.joystick.currentX = touch.clientX;
        this.joystick.currentY = touch.clientY;

        this.updateJoystickVisual();
    }

    onJoystickEnd(e) {
        e.preventDefault();
        this.joystick.active = false;
        this.joystick.element.classList.remove('active');
        this.joystick.knob.style.transform = 'translate(0, 0)';
    }

    updateJoystickVisual() {
        let dx = this.joystick.currentX - this.joystick.startX;
        let dy = this.joystick.currentY - this.joystick.startY;

        // Clamp to max radius
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.joystick.maxRadius) {
            const ratio = this.joystick.maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        this.joystick.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    onCameraTouchStart(e) {
        // Only handle touches in the middle area (not on controls)
        const touch = e.touches[0];
        const screenWidth = window.innerWidth;

        // Check if touch is in the middle 30% of screen (camera zone)
        if (touch.clientX > screenWidth * 0.35 && touch.clientX < screenWidth * 0.7) {
            if (e.touches.length === 2) {
                // Pinch zoom start
                this.pinch.active = true;
                this.pinch.initialDistance = this.getTouchDistance(e.touches);
            } else if (e.touches.length === 1 && !this.cameraTouch.active) {
                // Single touch for camera rotation
                this.cameraTouch.active = true;
                this.cameraTouch.touchId = touch.identifier;
                this.cameraTouch.lastX = touch.clientX;
                this.cameraTouch.lastY = touch.clientY;

                // Switch to orbit mode
                if (this.game.cameraMode === CAMERA_MODES.FOLLOW) {
                    this.game.cameraMode = CAMERA_MODES.ORBIT;
                }
            }
        }
    }

    onCameraTouchMove(e) {
        if (this.pinch.active && e.touches.length === 2) {
            // Pinch zoom
            const currentDistance = this.getTouchDistance(e.touches);
            const scale = currentDistance / this.pinch.initialDistance;

            // Adjust camera distance
            const zoomFactor = 1 + (1 - scale) * 0.5;
            this.game.cameraOrbit.targetDistance *= zoomFactor;
            this.game.cameraOrbit.targetDistance = Math.max(
                this.game.cameraOrbit.minDistance,
                Math.min(this.game.cameraOrbit.maxDistance, this.game.cameraOrbit.targetDistance)
            );

            this.pinch.initialDistance = currentDistance;
            e.preventDefault();
        } else if (this.cameraTouch.active) {
            // Find our touch
            for (const touch of e.touches) {
                if (touch.identifier === this.cameraTouch.touchId) {
                    const deltaX = touch.clientX - this.cameraTouch.lastX;
                    const deltaY = touch.clientY - this.cameraTouch.lastY;

                    // Rotate camera
                    this.game.cameraOrbit.targetAngle -= deltaX * 0.008;
                    this.game.cameraOrbit.targetPitch += deltaY * 0.005;
                    this.game.cameraOrbit.targetPitch = Math.max(
                        this.game.cameraOrbit.minPitch,
                        Math.min(this.game.cameraOrbit.maxPitch, this.game.cameraOrbit.targetPitch)
                    );

                    this.cameraTouch.lastX = touch.clientX;
                    this.cameraTouch.lastY = touch.clientY;
                    e.preventDefault();
                    break;
                }
            }
        }
    }

    onCameraTouchEnd(e) {
        // Check if our camera touch ended
        let found = false;
        for (const touch of e.touches) {
            if (touch.identifier === this.cameraTouch.touchId) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.cameraTouch.active = false;
            this.cameraTouch.touchId = null;
        }

        if (e.touches.length < 2) {
            this.pinch.active = false;
        }
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getInput() {
        if (!this.enabled || !this.joystick.active && !this.buttons.up && !this.buttons.down) {
            return null;
        }

        const input = {
            forward: 0,
            backward: 0,
            left: 0,
            right: 0,
            up: this.buttons.up ? 1 : 0,
            down: this.buttons.down ? 1 : 0,
            // Direct turn rate for touch (-1 to 1, negative = right, positive = left)
            turnRate: 0,
            isTouch: true
        };

        if (this.joystick.active) {
            const dx = this.joystick.currentX - this.joystick.startX;
            const dy = this.joystick.currentY - this.joystick.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Dead zone
            const deadZone = 10;
            if (distance > deadZone) {
                // Normalize and clamp to 0-1 range
                const normalizedX = Math.max(-1, Math.min(1, dx / this.joystick.maxRadius));
                const normalizedY = Math.max(-1, Math.min(1, dy / this.joystick.maxRadius));

                // Apply smoothing curve for forward/backward
                const smoothY = Math.sign(normalizedY) * Math.pow(Math.abs(normalizedY), 1.5);

                // Forward/backward (vertical) - analog values
                if (smoothY < -0.15) input.forward = Math.abs(smoothY);
                if (smoothY > 0.15) input.backward = smoothY;

                // Turn rate - direct control (smoothed)
                // Apply dead zone for turning
                if (Math.abs(normalizedX) > 0.15) {
                    const smoothX = Math.sign(normalizedX) * Math.pow(Math.abs(normalizedX), 1.8);
                    input.turnRate = -smoothX * 0.6; // Negative because positive X = turn right
                }
            }
        }

        return input;
    }

    show() {
        if (this.enabled && this.container) {
            this.container.classList.add('active');
            this.showHintTemporarily();
        }
    }

    showHintTemporarily() {
        const hint = document.getElementById('touch-hint');
        if (!hint) return;

        // Clear any existing timeout
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
        }

        // Show hint
        hint.classList.add('visible');

        // Hide after 4 seconds
        this.hintTimeout = setTimeout(() => {
            hint.classList.remove('visible');
        }, 4000);
    }

    hide() {
        if (this.container) {
            this.container.classList.remove('active');
        }
    }

    isEnabled() {
        return this.enabled;
    }

    cleanup() {
        if (!this.enabled) return;

        // Clear hint timeout
        if (this.hintTimeout) {
            clearTimeout(this.hintTimeout);
            this.hintTimeout = null;
        }

        // Remove the container and all its event listeners
        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        // Reset state
        this.joystick.active = false;
        this.cameraTouch.active = false;
        this.pinch.active = false;
        this.buttons.up = false;
        this.buttons.down = false;
        this.activeTouches.clear();

        this.enabled = false;
    }
}

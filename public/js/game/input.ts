// Input handling module
import type { InputState, MergedInput } from './types.ts';
import type { UIManager, TouchControls } from '../ui/index.ts';
import type { AudioManager } from '../core/index.ts';
import { ColorPalette } from '../effects/index.ts';
import { CAMERA_MODES, type CameraMode } from '../ui/index.ts';

// Minimal interface for weather system to avoid private property access
interface WeatherSystemInput {
    randomWeather(): string;
    getTimeOfDay(): number;
    setTimeOfDay(time: number): void;
}

export interface InputHandlerCallbacks {
    resetCamera: () => void;
    cycleCameraMode: () => void;
    respawnPlayer: () => void;
    resetInput: () => void;
    onPause: () => void;
    onResume: () => void;
    switchToOrbitMode: () => void;
}

export interface InputHandlerDeps {
    ui: UIManager;
    weatherSystem: WeatherSystemInput | null;
    audioManager: AudioManager | null;
    touchControls: TouchControls | null;
}

export function createKeydownHandler(
    input: InputState,
    deps: InputHandlerDeps,
    callbacks: InputHandlerCallbacks,
    isPaused: () => boolean,
    isPauseMenuOpen: () => boolean
): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
        if (deps.ui.isChatOpen()) return;

        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                input.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                input.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                input.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                input.right = true;
                break;
            case 'Space':
                input.up = true;
                e.preventDefault();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                input.down = true;
                break;
            case 'KeyQ':
                input.cameraLeft = true;
                break;
            case 'KeyE':
                input.cameraRight = true;
                break;
            case 'KeyC':
                callbacks.resetCamera();
                break;
            case 'KeyV':
                callbacks.cycleCameraMode();
                break;
            case 'KeyM':
                if (deps.audioManager) {
                    const soundOn = deps.audioManager.toggle();
                    deps.ui.showCameraMode(soundOn ? 'Sound ON' : 'Sound OFF');
                }
                break;
            case 'KeyP':
                if (deps.weatherSystem) {
                    const weather = deps.weatherSystem.randomWeather();
                    deps.ui.showCameraMode(`Weather: ${weather}`);
                }
                break;
            case 'KeyT':
                if (deps.weatherSystem) {
                    const currentTime = deps.weatherSystem.getTimeOfDay();
                    deps.weatherSystem.setTimeOfDay(currentTime + 3);
                    const newTime = deps.weatherSystem.getTimeOfDay();
                    const h = Math.floor(newTime);
                    const m = Math.floor((newTime % 1) * 60);
                    deps.ui.showCameraMode(`Time: ${h}:${m.toString().padStart(2, '0')}`);
                }
                break;
            case 'KeyL':
                if (ColorPalette) {
                    const isPastel = ColorPalette.toggle();
                    deps.ui.showCameraMode(isPastel ? 'Pastel ON' : 'Pastel OFF');
                }
                break;
            case 'KeyR':
                callbacks.respawnPlayer();
                break;
            case 'Enter':
                if (!isPaused()) {
                    callbacks.resetInput();
                    deps.ui.openChat();
                }
                break;
            case 'Escape':
                if (isPauseMenuOpen()) {
                    deps.ui.hidePauseMenu();
                    callbacks.onResume();
                } else if (!isPaused()) {
                    deps.ui.showPauseMenu();
                    callbacks.onPause();
                }
                break;
        }
    };
}

export function createKeyupHandler(input: InputState): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                input.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                input.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                input.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                input.right = false;
                break;
            case 'Space':
                input.up = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                input.down = false;
                break;
            case 'KeyQ':
                input.cameraLeft = false;
                break;
            case 'KeyE':
                input.cameraRight = false;
                break;
        }
    };
}

export function resetInputState(input: InputState): void {
    input.forward = false;
    input.backward = false;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.cameraLeft = false;
    input.cameraRight = false;
    input.mouseDeltaX = 0;
    input.mouseDeltaY = 0;
}

export function getMergedInput(
    input: InputState,
    touchControls: TouchControls | null
): MergedInput {
    const touchInput = touchControls ? touchControls.getInput() : null;

    // Mouse look takes priority when pointer is locked
    const useMouseLook = input.pointerLocked && (input.mouseDeltaX !== 0 || input.mouseDeltaY !== 0);

    return {
        forward: input.forward ? 1 : (touchInput ? touchInput.forward : 0),
        backward: input.backward ? 1 : (touchInput ? touchInput.backward : 0),
        left: input.left ? 1 : (touchInput ? touchInput.left : 0),
        right: input.right ? 1 : (touchInput ? touchInput.right : 0),
        up: input.up ? 1 : (touchInput ? touchInput.up : 0),
        down: input.down ? 1 : (touchInput ? touchInput.down : 0),
        // Mouse look overrides touch turn rate
        turnRate: useMouseLook ? 0 : (touchInput ? touchInput.turnRate : 0),
        mouseDeltaX: input.mouseDeltaX,
        mouseDeltaY: input.mouseDeltaY,
        isTouch: touchInput ? touchInput.isTouch : false
    };
}

export interface MouseHandlerState {
    isDragging: boolean;
    dragButton: number | null;
    lastMouseX: number;
    lastMouseY: number;
}

// Pointer lock handlers for Half-Life style mouse look
export function createPointerLockHandlers(
    canvas: HTMLCanvasElement,
    input: InputState,
    ui: UIManager
): {
    click: (e: MouseEvent) => void;
    pointerlockchange: () => void;
    mousemove: (e: MouseEvent) => void;
} {
    const click = (e: MouseEvent) => {
        // Only request pointer lock if clicking on canvas and not on UI
        if (e.target === canvas && !input.pointerLocked) {
            canvas.requestPointerLock();
        }
    };

    const pointerlockchange = () => {
        input.pointerLocked = document.pointerLockElement === canvas;
        if (input.pointerLocked) {
            ui.showCameraMode('Mouse Look (ESC to exit)');
        }
    };

    const mousemove = (e: MouseEvent) => {
        if (input.pointerLocked) {
            // Accumulate mouse movement for this frame
            input.mouseDeltaX += e.movementX;
            input.mouseDeltaY += e.movementY;
        }
    };

    return { click, pointerlockchange, mousemove };
}

export function createMouseHandlers(
    canvas: HTMLCanvasElement,
    cameraOrbit: { targetAngle: number; targetPitch: number; targetDistance: number; minPitch: number; maxPitch: number; minDistance: number; maxDistance: number },
    mouseState: MouseHandlerState,
    cameraMode: { current: CameraMode },
    ui: UIManager,
    setCameraMode?: (mode: CameraMode) => void
): {
    mousedown: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    wheel: (e: WheelEvent) => void;
    contextmenu: (e: Event) => void;
} {
    const mousedown = (e: MouseEvent) => {
        // Support left (0), middle (1), and right (2) click for camera drag
        // Left-click only works when not over UI elements
        if (e.button === 0 || e.button === 1 || e.button === 2) {
            // For left-click, check if target is the canvas (not UI)
            if (e.button === 0 && e.target !== canvas) {
                return;
            }

            mouseState.isDragging = true;
            mouseState.dragButton = e.button;
            mouseState.lastMouseX = e.clientX;
            mouseState.lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';

            // Prevent default for right and middle click
            if (e.button === 1 || e.button === 2) {
                e.preventDefault();
            }
        }
    };

    const mouseup = (e: MouseEvent) => {
        // Release drag if the released button matches the one that started the drag
        if (mouseState.isDragging && mouseState.dragButton === e.button) {
            mouseState.isDragging = false;
            mouseState.dragButton = null;
            canvas.style.cursor = 'default';
        }
    };

    const mousemove = (e: MouseEvent) => {
        if (mouseState.isDragging) {
            const deltaX = e.clientX - mouseState.lastMouseX;
            const deltaY = e.clientY - mouseState.lastMouseY;

            cameraOrbit.targetAngle -= deltaX * 0.005;
            cameraOrbit.targetPitch += deltaY * 0.003;
            cameraOrbit.targetPitch = Math.max(
                cameraOrbit.minPitch,
                Math.min(cameraOrbit.maxPitch, cameraOrbit.targetPitch)
            );

            if (cameraMode.current === CAMERA_MODES.FOLLOW) {
                // Use unified setter if available, otherwise fall back to direct assignment
                if (setCameraMode) {
                    setCameraMode(CAMERA_MODES.ORBIT);
                } else {
                    cameraMode.current = CAMERA_MODES.ORBIT;
                }
                ui.showCameraMode('Orbit');
            }

            mouseState.lastMouseX = e.clientX;
            mouseState.lastMouseY = e.clientY;
        }
    };

    const wheel = (e: WheelEvent) => {
        e.preventDefault();

        // Touchpad pinch-to-zoom detection (ctrlKey is set on pinch gestures)
        if (e.ctrlKey) {
            // Pinch-to-zoom: deltaY is negative for zoom in, positive for zoom out
            const zoomSpeed = 0.01;
            cameraOrbit.targetDistance += e.deltaY * zoomSpeed * cameraOrbit.targetDistance;
            cameraOrbit.targetDistance = Math.max(
                cameraOrbit.minDistance,
                Math.min(cameraOrbit.maxDistance, cameraOrbit.targetDistance)
            );
            return;
        }

        // Handle horizontal scroll (two-finger swipe on touchpad) for camera rotation
        if (Math.abs(e.deltaX) > 0.5) {
            const rotationSpeed = 0.004;
            cameraOrbit.targetAngle -= e.deltaX * rotationSpeed;

            if (cameraMode.current === CAMERA_MODES.FOLLOW) {
                // Use unified setter if available, otherwise fall back to direct assignment
                if (setCameraMode) {
                    setCameraMode(CAMERA_MODES.ORBIT);
                } else {
                    cameraMode.current = CAMERA_MODES.ORBIT;
                }
                ui.showCameraMode('Orbit');
            }
        }

        // Vertical scroll for zoom
        if (Math.abs(e.deltaY) > 0) {
            const zoomSpeed = 0.002;
            cameraOrbit.targetDistance += e.deltaY * zoomSpeed * cameraOrbit.targetDistance;
            cameraOrbit.targetDistance = Math.max(
                cameraOrbit.minDistance,
                Math.min(cameraOrbit.maxDistance, cameraOrbit.targetDistance)
            );
        }
    };

    const contextmenu = (e: Event) => e.preventDefault();

    return { mousedown, mouseup, mousemove, wheel, contextmenu };
}

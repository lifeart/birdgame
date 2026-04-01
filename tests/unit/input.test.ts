import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createMouseHandlers,
    resetInputState,
    getMergedInput,
    createKeydownHandler,
    createKeyupHandler,
    type MouseHandlerState,
    type InputHandlerDeps,
    type InputHandlerCallbacks,
} from '../../public/js/game/input.ts';
import type { InputState, MergedInput } from '../../public/js/game/types.ts';
import { CAMERA_MODES, type CameraMode } from '../../public/js/ui/touch.ts';

// Helper to create a default InputState
function makeInputState(): InputState {
    return {
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
        pointerLocked: false,
    };
}

// Helper to create a default camera orbit state
function makeCameraOrbit() {
    return {
        targetAngle: 0,
        targetPitch: 0.3,
        targetDistance: 15,
        minPitch: -0.5,
        maxPitch: 1.2,
        minDistance: 5,
        maxDistance: 50,
    };
}

// Helper to create a default mouse state
function makeMouseState(): MouseHandlerState {
    return {
        isDragging: false,
        dragButton: null,
        lastMouseX: 0,
        lastMouseY: 0,
    };
}

// Helper to create a minimal UIManager mock
function makeUIMock() {
    return {
        showCameraMode: vi.fn(),
        isChatOpen: vi.fn(() => false),
        openChat: vi.fn(),
        hidePauseMenu: vi.fn(),
        showPauseMenu: vi.fn(),
    } as any;
}

// Helper for InputHandlerCallbacks
function makeCallbacks(): InputHandlerCallbacks {
    return {
        resetCamera: vi.fn(),
        cycleCameraMode: vi.fn(),
        respawnPlayer: vi.fn(),
        resetInput: vi.fn(),
        onPause: vi.fn(),
        onResume: vi.fn(),
        switchToOrbitMode: vi.fn(),
    };
}

// Helper for InputHandlerDeps
function makeDeps(uiOverride?: any): InputHandlerDeps {
    return {
        ui: uiOverride ?? makeUIMock(),
        weatherSystem: null,
        audioManager: null,
        touchControls: null,
    };
}

describe('createMouseHandlers (pointer lock)', () => {
    let canvas: HTMLCanvasElement;
    let cameraOrbit: ReturnType<typeof makeCameraOrbit>;
    let mouseState: MouseHandlerState;
    let cameraMode: { current: CameraMode };
    let ui: ReturnType<typeof makeUIMock>;
    let handlers: ReturnType<typeof createMouseHandlers>;

    // Helper to simulate pointer lock state
    function simulatePointerLock(element: Element | null) {
        Object.defineProperty(document, 'pointerLockElement', {
            value: element,
            writable: true,
            configurable: true,
        });
    }

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.requestPointerLock = vi.fn();
        cameraOrbit = makeCameraOrbit();
        mouseState = makeMouseState();
        cameraMode = { current: CAMERA_MODES.ORBIT };
        ui = makeUIMock();
        handlers = createMouseHandlers(canvas, cameraOrbit, mouseState, cameraMode, ui);
        simulatePointerLock(null);
    });

    describe('mousedown / pointer lock request', () => {
        it('should request pointer lock on left-click on canvas', () => {
            const event = new MouseEvent('mousedown', { button: 0 });
            Object.defineProperty(event, 'target', { value: canvas });
            handlers.mousedown(event);

            expect(canvas.requestPointerLock).toHaveBeenCalled();
        });

        it('should NOT request pointer lock if target is not canvas', () => {
            const event = new MouseEvent('mousedown', { button: 0 });
            // target defaults to null, not canvas
            handlers.mousedown(event);

            expect(canvas.requestPointerLock).not.toHaveBeenCalled();
        });

        it('should NOT request pointer lock if already locked', () => {
            simulatePointerLock(canvas);
            const event = new MouseEvent('mousedown', { button: 0 });
            Object.defineProperty(event, 'target', { value: canvas });
            handlers.mousedown(event);

            expect(canvas.requestPointerLock).not.toHaveBeenCalled();
        });
    });

    describe('pointerLockChange', () => {
        it('should set isDragging to true when pointer is locked', () => {
            simulatePointerLock(canvas);
            handlers.pointerLockChange();
            expect(mouseState.isDragging).toBe(true);
        });

        it('should set isDragging to false when pointer is unlocked', () => {
            mouseState.isDragging = true;
            simulatePointerLock(null);
            handlers.pointerLockChange();
            expect(mouseState.isDragging).toBe(false);
        });
    });

    describe('mousemove with pointer lock', () => {
        it('should update targetAngle and targetPitch when pointer is locked', () => {
            simulatePointerLock(canvas);

            const initialAngle = cameraOrbit.targetAngle;
            const initialPitch = cameraOrbit.targetPitch;

            const move = new MouseEvent('mousemove');
            Object.defineProperty(move, 'movementX', { value: 50 });
            Object.defineProperty(move, 'movementY', { value: 20 });
            handlers.mousemove(move);

            // sensitivity = 0.003
            expect(cameraOrbit.targetAngle).toBeCloseTo(initialAngle - 50 * 0.003, 5);
            expect(cameraOrbit.targetPitch).toBeCloseTo(initialPitch + 20 * 0.003, 5);
        });

        it('should NOT update camera when pointer is NOT locked', () => {
            simulatePointerLock(null);
            const initialAngle = cameraOrbit.targetAngle;
            const initialPitch = cameraOrbit.targetPitch;

            const move = new MouseEvent('mousemove');
            Object.defineProperty(move, 'movementX', { value: 200 });
            Object.defineProperty(move, 'movementY', { value: 200 });
            handlers.mousemove(move);

            expect(cameraOrbit.targetAngle).toBe(initialAngle);
            expect(cameraOrbit.targetPitch).toBe(initialPitch);
        });
    });

    describe('pitch clamping', () => {
        it('should clamp targetPitch to maxPitch', () => {
            simulatePointerLock(canvas);
            cameraOrbit.targetPitch = cameraOrbit.maxPitch - 0.01;
            const move = new MouseEvent('mousemove');
            Object.defineProperty(move, 'movementX', { value: 0 });
            Object.defineProperty(move, 'movementY', { value: -5000 });
            handlers.mousemove(move);

            expect(cameraOrbit.targetPitch).toBeLessThanOrEqual(cameraOrbit.maxPitch);
        });

        it('should clamp targetPitch to minPitch', () => {
            simulatePointerLock(canvas);
            cameraOrbit.targetPitch = cameraOrbit.minPitch + 0.01;
            const move = new MouseEvent('mousemove');
            Object.defineProperty(move, 'movementX', { value: 0 });
            Object.defineProperty(move, 'movementY', { value: 5000 });
            handlers.mousemove(move);

            expect(cameraOrbit.targetPitch).toBeGreaterThanOrEqual(cameraOrbit.minPitch);
        });
    });

    describe('GTA-style: mouse stays in FOLLOW mode', () => {
        it('should NOT switch to ORBIT when mouse moves in FOLLOW mode', () => {
            simulatePointerLock(canvas);
            cameraMode.current = CAMERA_MODES.FOLLOW;
            const setCameraMode = vi.fn();
            handlers = createMouseHandlers(canvas, cameraOrbit, mouseState, cameraMode, ui, setCameraMode);

            const move = new MouseEvent('mousemove');
            Object.defineProperty(move, 'movementX', { value: 10 });
            Object.defineProperty(move, 'movementY', { value: 10 });
            handlers.mousemove(move);

            expect(setCameraMode).not.toHaveBeenCalled();
            expect(cameraMode.current).toBe(CAMERA_MODES.FOLLOW);
        });

        it('should still update camera angles in FOLLOW mode', () => {
            simulatePointerLock(canvas);
            cameraMode.current = CAMERA_MODES.FOLLOW;

            const initialAngle = cameraOrbit.targetAngle;
            const move = new MouseEvent('mousemove');
            Object.defineProperty(move, 'movementX', { value: 50 });
            Object.defineProperty(move, 'movementY', { value: 0 });
            handlers.mousemove(move);

            expect(cameraOrbit.targetAngle).not.toBe(initialAngle);
        });
    });

    describe('wheel zoom', () => {
        it('should adjust targetDistance on scroll', () => {
            const initialDist = cameraOrbit.targetDistance;
            const event = new WheelEvent('wheel', { deltaY: 100 });
            handlers.wheel(event);

            // deltaY=100, zoomSpeed=0.004, dist += 100 * 0.004 * 15 = 6
            expect(cameraOrbit.targetDistance).toBeCloseTo(initialDist + 100 * 0.004 * initialDist, 5);
        });

        it('should clamp targetDistance to maxDistance', () => {
            cameraOrbit.targetDistance = cameraOrbit.maxDistance - 1;
            const event = new WheelEvent('wheel', { deltaY: 5000 });
            handlers.wheel(event);

            expect(cameraOrbit.targetDistance).toBeLessThanOrEqual(cameraOrbit.maxDistance);
        });

        it('should clamp targetDistance to minDistance', () => {
            cameraOrbit.targetDistance = cameraOrbit.minDistance + 1;
            const event = new WheelEvent('wheel', { deltaY: -5000 });
            handlers.wheel(event);

            expect(cameraOrbit.targetDistance).toBeGreaterThanOrEqual(cameraOrbit.minDistance);
        });

        it('should call preventDefault on wheel event', () => {
            const event = new WheelEvent('wheel', { deltaY: 10 });
            const spy = vi.spyOn(event, 'preventDefault');
            handlers.wheel(event);
            expect(spy).toHaveBeenCalled();
        });

        it('should work even without pointer lock (zoom always available)', () => {
            simulatePointerLock(null);
            const initialDist = cameraOrbit.targetDistance;
            const event = new WheelEvent('wheel', { deltaY: 100 });
            handlers.wheel(event);

            expect(cameraOrbit.targetDistance).not.toBe(initialDist);
        });
    });

    describe('contextmenu', () => {
        it('should call preventDefault', () => {
            const event = new Event('contextmenu');
            const spy = vi.spyOn(event, 'preventDefault');
            handlers.contextmenu(event);
            expect(spy).toHaveBeenCalled();
        });
    });
});

describe('resetInputState', () => {
    it('should reset all flags and deltas to default values', () => {
        const input = makeInputState();
        input.forward = true;
        input.backward = true;
        input.left = true;
        input.right = true;
        input.up = true;
        input.down = true;
        input.cameraLeft = true;
        input.cameraRight = true;
        input.mouseDeltaX = 42;
        input.mouseDeltaY = -13;

        resetInputState(input);

        expect(input.forward).toBe(false);
        expect(input.backward).toBe(false);
        expect(input.left).toBe(false);
        expect(input.right).toBe(false);
        expect(input.up).toBe(false);
        expect(input.down).toBe(false);
        expect(input.cameraLeft).toBe(false);
        expect(input.cameraRight).toBe(false);
        expect(input.mouseDeltaX).toBe(0);
        expect(input.mouseDeltaY).toBe(0);
    });
});

describe('getMergedInput', () => {
    it('should map keyboard booleans to numeric values', () => {
        const input = makeInputState();
        input.forward = true;
        input.left = true;

        const merged = getMergedInput(input, null);

        expect(merged.forward).toBe(1);
        expect(merged.left).toBe(1);
        expect(merged.backward).toBe(0);
        expect(merged.right).toBe(0);
    });

    it('should use touch input when keyboard is not pressed', () => {
        const input = makeInputState();
        const touchControls = {
            getInput: vi.fn(() => ({
                forward: 0.5,
                backward: 0.2,
                left: 0.3,
                right: 0,
                up: 0,
                down: 0,
                turnRate: 0.1,
                isTouch: true,
            })),
        } as any;

        const merged = getMergedInput(input, touchControls);

        expect(merged.forward).toBe(0.5);
        expect(merged.backward).toBe(0.2);
        expect(merged.left).toBe(0.3);
        expect(merged.isTouch).toBe(true);
    });

    it('should prefer keyboard over touch when key is pressed', () => {
        const input = makeInputState();
        input.forward = true;
        const touchControls = {
            getInput: vi.fn(() => ({
                forward: 0.5,
                backward: 0,
                left: 0,
                right: 0,
                up: 0,
                down: 0,
                turnRate: 0,
                isTouch: true,
            })),
        } as any;

        const merged = getMergedInput(input, touchControls);

        expect(merged.forward).toBe(1);
    });

    it('should return zeros when no touch controls and no keys pressed', () => {
        const input = makeInputState();
        const merged = getMergedInput(input, null);

        expect(merged.forward).toBe(0);
        expect(merged.backward).toBe(0);
        expect(merged.left).toBe(0);
        expect(merged.right).toBe(0);
        expect(merged.up).toBe(0);
        expect(merged.down).toBe(0);
        expect(merged.turnRate).toBe(0);
        expect(merged.isTouch).toBe(false);
    });
});

describe('createKeydownHandler', () => {
    let input: InputState;
    let deps: InputHandlerDeps;
    let callbacks: InputHandlerCallbacks;
    let handler: (e: KeyboardEvent) => void;

    beforeEach(() => {
        input = makeInputState();
        deps = makeDeps();
        callbacks = makeCallbacks();
        handler = createKeydownHandler(input, deps, callbacks, () => false, () => false);
    });

    it('should set forward on KeyW', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyW' }));
        expect(input.forward).toBe(true);
    });

    it('should set forward on ArrowUp', () => {
        handler(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
        expect(input.forward).toBe(true);
    });

    it('should set backward on KeyS', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyS' }));
        expect(input.backward).toBe(true);
    });

    it('should set left on KeyA', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyA' }));
        expect(input.left).toBe(true);
    });

    it('should set right on KeyD', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyD' }));
        expect(input.right).toBe(true);
    });

    it('should set up on Space', () => {
        handler(new KeyboardEvent('keydown', { code: 'Space' }));
        expect(input.up).toBe(true);
    });

    it('should set down on ShiftLeft', () => {
        handler(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
        expect(input.down).toBe(true);
    });

    it('should set cameraLeft on KeyQ', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyQ' }));
        expect(input.cameraLeft).toBe(true);
    });

    it('should set cameraRight on KeyE', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyE' }));
        expect(input.cameraRight).toBe(true);
    });

    it('should not process keys when chat is open', () => {
        (deps.ui.isChatOpen as ReturnType<typeof vi.fn>).mockReturnValue(true);
        handler(new KeyboardEvent('keydown', { code: 'KeyW' }));
        expect(input.forward).toBe(false);
    });

    it('should call resetCamera on KeyC', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyC' }));
        expect(callbacks.resetCamera).toHaveBeenCalled();
    });

    it('should call cycleCameraMode on KeyV', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyV' }));
        expect(callbacks.cycleCameraMode).toHaveBeenCalled();
    });

    it('should call respawnPlayer on KeyR', () => {
        handler(new KeyboardEvent('keydown', { code: 'KeyR' }));
        expect(callbacks.respawnPlayer).toHaveBeenCalled();
    });
});

describe('createKeyupHandler', () => {
    let input: InputState;
    let handler: (e: KeyboardEvent) => void;

    beforeEach(() => {
        input = makeInputState();
        handler = createKeyupHandler(input);
    });

    it('should clear forward on KeyW release', () => {
        input.forward = true;
        handler(new KeyboardEvent('keyup', { code: 'KeyW' }));
        expect(input.forward).toBe(false);
    });

    it('should clear backward on KeyS release', () => {
        input.backward = true;
        handler(new KeyboardEvent('keyup', { code: 'KeyS' }));
        expect(input.backward).toBe(false);
    });

    it('should clear left on KeyA release', () => {
        input.left = true;
        handler(new KeyboardEvent('keyup', { code: 'KeyA' }));
        expect(input.left).toBe(false);
    });

    it('should clear right on KeyD release', () => {
        input.right = true;
        handler(new KeyboardEvent('keyup', { code: 'KeyD' }));
        expect(input.right).toBe(false);
    });

    it('should clear up on Space release', () => {
        input.up = true;
        handler(new KeyboardEvent('keyup', { code: 'Space' }));
        expect(input.up).toBe(false);
    });

    it('should clear down on ShiftLeft release', () => {
        input.down = true;
        handler(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
        expect(input.down).toBe(false);
    });

    it('should clear cameraLeft on KeyQ release', () => {
        input.cameraLeft = true;
        handler(new KeyboardEvent('keyup', { code: 'KeyQ' }));
        expect(input.cameraLeft).toBe(false);
    });

    it('should clear cameraRight on KeyE release', () => {
        input.cameraRight = true;
        handler(new KeyboardEvent('keyup', { code: 'KeyE' }));
        expect(input.cameraRight).toBe(false);
    });
});

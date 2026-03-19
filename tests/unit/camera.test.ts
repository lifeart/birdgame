import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

import {
    createDefaultCameraOrbit,
    resetCameraOrbit,
    updateCamera,
    handleCameraKeyInput,
    cycleCameraMode,
} from '../../public/js/game/camera.ts';
import type { CameraOrbitState } from '../../public/js/game/types.ts';
import { CAMERA_MODES, type CameraMode } from '../../public/js/ui/touch.ts';

function makeOrbit(overrides: Partial<CameraOrbitState> = {}): CameraOrbitState {
    return { ...createDefaultCameraOrbit(), ...overrides };
}

function makeCamera(): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
}

describe('createDefaultCameraOrbit', () => {
    it('returns correct default values', () => {
        const orbit = createDefaultCameraOrbit();
        expect(orbit.pitch).toBe(0.25);
        expect(orbit.angle).toBe(0);
        expect(orbit.distance).toBe(12);
        expect(orbit.targetPitch).toBe(0.25);
        expect(orbit.targetAngle).toBe(0);
        expect(orbit.targetDistance).toBe(12);
    });

    it('has minPitch=0.05 and maxPitch=0.8', () => {
        const orbit = createDefaultCameraOrbit();
        expect(orbit.minPitch).toBe(0.05);
        expect(orbit.maxPitch).toBe(0.8);
    });

    it('initializes cinematic state to neutral', () => {
        const orbit = createDefaultCameraOrbit();
        expect(orbit.bankAngle).toBe(0);
        expect(orbit.lateralOffset).toBe(0);
        expect(orbit.lookAheadOffset).toBe(2); // MIN_LOOK_AHEAD
    });
});

describe('resetCameraOrbit', () => {
    it('resets pitch to 0.25 and distance to 12', () => {
        const orbit = makeOrbit({ targetPitch: 0.7, targetDistance: 25 });
        resetCameraOrbit(orbit, null);
        expect(orbit.targetPitch).toBe(0.25);
        expect(orbit.targetDistance).toBe(12);
    });

    it('sets angle from bird rotation when provided', () => {
        const orbit = makeOrbit();
        const birdRotation = Math.PI / 4;
        resetCameraOrbit(orbit, birdRotation);
        expect(orbit.targetAngle).toBe(-birdRotation);
        expect(orbit.angle).toBe(-birdRotation);
    });

    it('sets angle to 0 when no bird rotation', () => {
        const orbit = makeOrbit({ angle: 1.5, targetAngle: 1.5 });
        resetCameraOrbit(orbit, null);
        expect(orbit.targetAngle).toBe(0);
        expect(orbit.angle).toBe(0);
    });

    it('resets cinematic state', () => {
        const orbit = makeOrbit({ bankAngle: 0.1, lateralOffset: 2, lookAheadOffset: 6 });
        resetCameraOrbit(orbit, null);
        expect(orbit.bankAngle).toBe(0);
        expect(orbit.lateralOffset).toBe(0);
        expect(orbit.lookAheadOffset).toBe(2); // MIN_LOOK_AHEAD
    });
});

describe('updateCamera', () => {
    it('camera position is behind the bird (not in front)', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Run many iterations so the camera converges toward target
        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        }

        // Bird faces +Z by default (rotation=0), camera should be behind at +Z relative to bird
        // With angle=0, camera offset is sin(0)*h = 0 for x, cos(0)*h > 0 for z
        // So camera.z > bird.z means camera is behind the bird
        expect(camera.position.z).toBeGreaterThan(birdPos.z);
    });

    it('camera Y is above bird position', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        }

        expect(camera.position.y).toBeGreaterThan(birdPos.y);
    });

    it('pitch clamping: targetPitch above maxPitch gets clamped', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({ targetPitch: 1.5 }); // above maxPitch=0.8
        const birdPos = new THREE.Vector3(0, 10, 0);

        updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);

        expect(orbit.targetPitch).toBeLessThanOrEqual(orbit.maxPitch);
        expect(orbit.pitch).toBeLessThanOrEqual(orbit.maxPitch);
    });

    it('pitch clamping: targetPitch below minPitch gets clamped', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({ targetPitch: -0.5 }); // below minPitch=0.05
        const birdPos = new THREE.Vector3(0, 10, 0);

        updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);

        expect(orbit.targetPitch).toBeGreaterThanOrEqual(orbit.minPitch);
        expect(orbit.pitch).toBeGreaterThanOrEqual(orbit.minPitch);
    });

    it('follow mode: camera angle tracks behind bird rotation', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);
        const birdRotation = Math.PI / 2; // bird turned 90 degrees

        // Run many iterations to let the follow converge
        for (let i = 0; i < 500; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, birdRotation);
        }

        // In follow mode, targetAngle should approach -birdRotation
        const expectedAngle = -birdRotation;
        expect(orbit.targetAngle).toBeCloseTo(expectedAngle, 1);
    });

    it('orbit mode: camera angle stays where user put it', () => {
        const camera = makeCamera();
        const userAngle = 1.0;
        const orbit = makeOrbit({ targetAngle: userAngle, angle: userAngle });
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Bird rotates but camera should NOT follow in orbit mode
        for (let i = 0; i < 100; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, Math.PI / 2);
        }

        // targetAngle should remain at userAngle (orbit mode doesn't modify it)
        expect(orbit.targetAngle).toBe(userAngle);
    });

    it('NaN speed input does not crash', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        expect(() => {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0, undefined, NaN, NaN, NaN);
        }).not.toThrow();

        // Camera position should be finite
        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
    });

    it('Infinity speed input does not crash', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        expect(() => {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0, undefined, Infinity, Infinity, Infinity);
        }).not.toThrow();

        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
    });

    it('NaN rotation velocity does not produce NaN in orbit state', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0, undefined, NaN, 1, 2);

        expect(Number.isFinite(orbit.bankAngle)).toBe(true);
        expect(Number.isFinite(orbit.lateralOffset)).toBe(true);
        expect(Number.isFinite(orbit.lookAheadOffset)).toBe(true);
    });
});

describe('handleCameraKeyInput', () => {
    it('Q key (cameraLeft) increases targetAngle', () => {
        const orbit = makeOrbit();
        const initialAngle = orbit.targetAngle;

        handleCameraKeyInput({ cameraLeft: true, cameraRight: false }, orbit, CAMERA_MODES.ORBIT);

        expect(orbit.targetAngle).toBeGreaterThan(initialAngle);
    });

    it('E key (cameraRight) decreases targetAngle', () => {
        const orbit = makeOrbit();
        const initialAngle = orbit.targetAngle;

        handleCameraKeyInput({ cameraLeft: false, cameraRight: true }, orbit, CAMERA_MODES.ORBIT);

        expect(orbit.targetAngle).toBeLessThan(initialAngle);
    });

    it('in Follow mode, Q switches to Orbit mode', () => {
        const orbit = makeOrbit();
        const result = handleCameraKeyInput(
            { cameraLeft: true, cameraRight: false },
            orbit,
            CAMERA_MODES.FOLLOW
        );
        expect(result).toBe(CAMERA_MODES.ORBIT);
    });

    it('in Follow mode, E switches to Orbit mode', () => {
        const orbit = makeOrbit();
        const result = handleCameraKeyInput(
            { cameraLeft: false, cameraRight: true },
            orbit,
            CAMERA_MODES.FOLLOW
        );
        expect(result).toBe(CAMERA_MODES.ORBIT);
    });

    it('in Orbit mode, Q/E stays in Orbit mode', () => {
        const orbit = makeOrbit();
        const resultQ = handleCameraKeyInput(
            { cameraLeft: true, cameraRight: false },
            orbit,
            CAMERA_MODES.ORBIT
        );
        expect(resultQ).toBe(CAMERA_MODES.ORBIT);

        const resultE = handleCameraKeyInput(
            { cameraLeft: false, cameraRight: true },
            orbit,
            CAMERA_MODES.ORBIT
        );
        expect(resultE).toBe(CAMERA_MODES.ORBIT);
    });

    it('no keys pressed returns current mode unchanged', () => {
        const orbit = makeOrbit();
        const result = handleCameraKeyInput(
            { cameraLeft: false, cameraRight: false },
            orbit,
            CAMERA_MODES.FOLLOW
        );
        expect(result).toBe(CAMERA_MODES.FOLLOW);
    });
});

describe('cycleCameraMode', () => {
    it('cycles through all modes in order', () => {
        const orbit = makeOrbit();
        const modes = Object.values(CAMERA_MODES) as CameraMode[];

        let currentMode: CameraMode = modes[0];
        const visited: CameraMode[] = [currentMode];

        for (let i = 0; i < modes.length; i++) {
            const { newMode } = cycleCameraMode(currentMode, orbit);
            currentMode = newMode;
            if (i < modes.length - 1) {
                visited.push(currentMode);
            }
        }

        // After cycling through all modes we should be back at the start
        expect(currentMode).toBe(modes[0]);
        // We visited all modes
        expect(visited.length).toBe(modes.length);
    });

    it('TOP mode sets pitch to 0.75 (within bounds)', () => {
        const orbit = makeOrbit();
        // Cycle from FOLLOW -> ORBIT -> TOP
        let mode: CameraMode = CAMERA_MODES.FOLLOW;
        // Find TOP mode by cycling
        const modes = Object.values(CAMERA_MODES) as CameraMode[];
        for (let i = 0; i < modes.length; i++) {
            const { newMode } = cycleCameraMode(mode, orbit);
            mode = newMode;
            if (mode === CAMERA_MODES.TOP) break;
        }

        expect(mode).toBe(CAMERA_MODES.TOP);
        expect(orbit.targetPitch).toBe(0.75);
        expect(orbit.targetPitch).toBeGreaterThanOrEqual(orbit.minPitch);
        expect(orbit.targetPitch).toBeLessThanOrEqual(orbit.maxPitch);
    });

    it('SIDE mode sets pitch to 0.1 (within bounds)', () => {
        const orbit = makeOrbit();
        let mode: CameraMode = CAMERA_MODES.FOLLOW;
        const modes = Object.values(CAMERA_MODES) as CameraMode[];
        for (let i = 0; i < modes.length; i++) {
            const { newMode } = cycleCameraMode(mode, orbit);
            mode = newMode;
            if (mode === CAMERA_MODES.SIDE) break;
        }

        expect(mode).toBe(CAMERA_MODES.SIDE);
        expect(orbit.targetPitch).toBe(0.1);
        expect(orbit.targetPitch).toBeGreaterThanOrEqual(orbit.minPitch);
        expect(orbit.targetPitch).toBeLessThanOrEqual(orbit.maxPitch);
    });

    it('all mode pitches are within [minPitch, maxPitch]', () => {
        const modes = Object.values(CAMERA_MODES) as CameraMode[];

        for (const startMode of modes) {
            const orbit = makeOrbit();
            const { newMode } = cycleCameraMode(startMode, orbit);
            expect(orbit.targetPitch).toBeGreaterThanOrEqual(orbit.minPitch);
            expect(orbit.targetPitch).toBeLessThanOrEqual(orbit.maxPitch);
        }
    });

    it('returns human-readable mode names', () => {
        const orbit = makeOrbit();
        const { modeName } = cycleCameraMode(CAMERA_MODES.FOLLOW, orbit);
        expect(typeof modeName).toBe('string');
        expect(modeName.length).toBeGreaterThan(0);
    });
});

describe('mouse direction pitch math', () => {
    // Tests for the pitch logic from createMouseHandlers mousemove
    // We replicate the math: targetPitch -= deltaY * 0.003, then clamp

    function applyMouseDragPitch(
        orbit: { targetPitch: number; minPitch: number; maxPitch: number },
        deltaY: number
    ) {
        orbit.targetPitch -= deltaY * 0.003;
        orbit.targetPitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.targetPitch));
    }

    it('positive deltaY (drag down) decreases targetPitch (camera looks down)', () => {
        const orbit = { targetPitch: 0.5, minPitch: 0.05, maxPitch: 0.8 };
        const before = orbit.targetPitch;
        applyMouseDragPitch(orbit, 100); // drag down
        expect(orbit.targetPitch).toBeLessThan(before);
    });

    it('negative deltaY (drag up) increases targetPitch (camera looks up)', () => {
        const orbit = { targetPitch: 0.5, minPitch: 0.05, maxPitch: 0.8 };
        const before = orbit.targetPitch;
        applyMouseDragPitch(orbit, -100); // drag up
        expect(orbit.targetPitch).toBeGreaterThan(before);
    });

    it('pitch stays clamped after drag down past minimum', () => {
        const orbit = { targetPitch: 0.1, minPitch: 0.05, maxPitch: 0.8 };
        applyMouseDragPitch(orbit, 1000); // massive drag down
        expect(orbit.targetPitch).toBe(orbit.minPitch);
    });

    it('pitch stays clamped after drag up past maximum', () => {
        const orbit = { targetPitch: 0.7, minPitch: 0.05, maxPitch: 0.8 };
        applyMouseDragPitch(orbit, -1000); // massive drag up
        expect(orbit.targetPitch).toBe(orbit.maxPitch);
    });
});

describe('pitch safety', () => {
    it('no combination of operations can set pitch outside [0.05, 0.8]', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Extreme targetPitch values
        orbit.targetPitch = 100;
        updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        expect(orbit.targetPitch).toBeLessThanOrEqual(orbit.maxPitch);
        expect(orbit.pitch).toBeLessThanOrEqual(orbit.maxPitch);

        orbit.targetPitch = -100;
        updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        expect(orbit.targetPitch).toBeGreaterThanOrEqual(orbit.minPitch);
        expect(orbit.pitch).toBeGreaterThanOrEqual(orbit.minPitch);
    });

    it('rapid mode switching does not produce out-of-range pitch', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        let mode: CameraMode = CAMERA_MODES.FOLLOW;

        // Rapidly cycle modes and update camera
        for (let i = 0; i < 50; i++) {
            const { newMode } = cycleCameraMode(mode, orbit);
            mode = newMode;
            updateCamera(camera, orbit, mode, birdPos, Math.random() * Math.PI * 2);

            expect(orbit.pitch).toBeGreaterThanOrEqual(orbit.minPitch);
            expect(orbit.pitch).toBeLessThanOrEqual(orbit.maxPitch);
            expect(orbit.targetPitch).toBeGreaterThanOrEqual(orbit.minPitch);
            expect(orbit.targetPitch).toBeLessThanOrEqual(orbit.maxPitch);
        }
    });

    it('combined key input + mode cycling keeps pitch in bounds', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        let mode: CameraMode = CAMERA_MODES.FOLLOW;

        for (let i = 0; i < 30; i++) {
            // Alternate between key input and mode cycling
            mode = handleCameraKeyInput(
                { cameraLeft: i % 2 === 0, cameraRight: i % 2 !== 0 },
                orbit,
                mode
            );
            if (i % 3 === 0) {
                const { newMode } = cycleCameraMode(mode, orbit);
                mode = newMode;
            }
            updateCamera(camera, orbit, mode, birdPos, i * 0.5);

            expect(orbit.pitch).toBeGreaterThanOrEqual(orbit.minPitch);
            expect(orbit.pitch).toBeLessThanOrEqual(orbit.maxPitch);
        }
    });
});

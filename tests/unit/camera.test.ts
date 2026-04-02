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

    it('has minPitch=0.05 and maxPitch=0.75', () => {
        const orbit = createDefaultCameraOrbit();
        expect(orbit.minPitch).toBe(0.05);
        expect(orbit.maxPitch).toBe(0.75);
    });

    it('initializes cinematic state to neutral', () => {
        const orbit = createDefaultCameraOrbit();
        expect(orbit.lateralOffset).toBe(0);
        expect(orbit.lastManualInputTime).toBe(0);
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
        const orbit = makeOrbit({ lateralOffset: 2 });
        resetCameraOrbit(orbit, null);
        expect(orbit.lateralOffset).toBe(0);
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

        expect(Number.isFinite(orbit.lateralOffset)).toBe(true);
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
    // GTA-style: positive movementY (mouse down) increases pitch (camera rises, looks down from above)
    // We replicate the math: targetPitch += deltaY * 0.003, then clamp

    function applyMouseDragPitch(
        orbit: { targetPitch: number; minPitch: number; maxPitch: number },
        deltaY: number
    ) {
        orbit.targetPitch += deltaY * 0.003;
        orbit.targetPitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.targetPitch));
    }

    it('positive deltaY (mouse down) increases targetPitch (camera rises above bird)', () => {
        const orbit = { targetPitch: 0.5, minPitch: 0.05, maxPitch: 0.8 };
        const before = orbit.targetPitch;
        applyMouseDragPitch(orbit, 100); // mouse down
        expect(orbit.targetPitch).toBeGreaterThan(before);
    });

    it('negative deltaY (mouse up) decreases targetPitch (camera lowers toward bird)', () => {
        const orbit = { targetPitch: 0.5, minPitch: 0.05, maxPitch: 0.8 };
        const before = orbit.targetPitch;
        applyMouseDragPitch(orbit, -100); // mouse up
        expect(orbit.targetPitch).toBeLessThan(before);
    });

    it('pitch stays clamped after mouse up past minimum', () => {
        const orbit = { targetPitch: 0.1, minPitch: 0.05, maxPitch: 0.8 };
        applyMouseDragPitch(orbit, -1000); // massive mouse up
        expect(orbit.targetPitch).toBe(orbit.minPitch);
    });

    it('pitch stays clamped after mouse down past maximum', () => {
        const orbit = { targetPitch: 0.7, minPitch: 0.05, maxPitch: 0.8 };
        applyMouseDragPitch(orbit, 1000); // massive mouse down
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

describe('camera orientation stability', () => {
    function getCameraWorldUp(camera: THREE.PerspectiveCamera): THREE.Vector3 {
        return new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    }

    it('camera never flips upside-down at various pitch/angle values', () => {
        const camera = makeCamera();
        const birdPos = new THREE.Vector3(0, 10, 0);

        const pitchValues = [0.05, 0.1, 0.25, 0.5, 0.7];
        const angleValues = [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 3];

        for (const pitch of pitchValues) {
            for (const angle of angleValues) {
                const orbit = makeOrbit({
                    pitch,
                    targetPitch: pitch,
                    angle,
                    targetAngle: angle,
                });

                for (let i = 0; i < 50; i++) {
                    updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, -angle);
                }

                const up = getCameraWorldUp(camera);
                expect(up.y).toBeGreaterThan(0);
            }
        }
    });

    it('camera Y stays above bird at max pitch after many iterations', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        orbit.targetPitch = orbit.maxPitch;
        orbit.pitch = orbit.maxPitch;
        const birdPos = new THREE.Vector3(0, 10, 0);

        for (let i = 0; i < 500; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        }

        expect(camera.position.y).toBeGreaterThan(birdPos.y);
    });

    it('high turn velocity does not cause camera flip in follow mode', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Simulate high turn velocity in follow mode
        for (let i = 0; i < 300; i++) {
            updateCamera(
                camera, orbit, CAMERA_MODES.FOLLOW, birdPos, i * 0.02,
                undefined,
                0.2,  // high rotation velocity
                5,    // bird speed
                10    // max speed
            );
        }

        const up = getCameraWorldUp(camera);
        expect(up.y).toBeGreaterThan(0);
    });

    it('continuous rotation over 500+ frames does not cause camera flip', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        for (let i = 0; i < 600; i++) {
            const birdRotation = i * 0.05; // continuous rotation
            updateCamera(
                camera, orbit, CAMERA_MODES.FOLLOW, birdPos, birdRotation,
                undefined,
                0.05, // moderate rotation velocity
                3,
                10
            );

            const up = getCameraWorldUp(camera);
            expect(up.y).toBeGreaterThan(0);
        }
    });

    it('high pitch + high turn velocity combination remains stable', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        orbit.targetPitch = orbit.maxPitch;
        orbit.pitch = orbit.maxPitch;
        const birdPos = new THREE.Vector3(0, 10, 0);

        // First converge the camera to the high-pitch position with no rotation
        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        }

        // Verify converged position is above bird
        expect(camera.position.y).toBeGreaterThan(birdPos.y);

        // Now apply continuous rotation with high turn velocity and bank
        for (let i = 0; i < 300; i++) {
            updateCamera(
                camera, orbit, CAMERA_MODES.FOLLOW, birdPos, i * 0.03,
                undefined,
                0.15,  // high turn velocity
                8,
                10
            );

            const up = getCameraWorldUp(camera);
            expect(up.y).toBeGreaterThan(0);
        }

        // After settling, camera should still be above bird
        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0);
        }
        expect(camera.position.y).toBeGreaterThan(birdPos.y);
    });

    it('camera has positive horizontalDist at all valid pitches', () => {
        const orbit = makeOrbit();
        const minPitch = orbit.minPitch;
        const maxPitch = orbit.maxPitch;

        // Sample pitches across the full valid range
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
            const pitch = minPitch + (maxPitch - minPitch) * (i / steps);
            const horizontalDist = Math.cos(pitch * Math.PI / 2);
            expect(horizontalDist).toBeGreaterThan(0);
        }
    });

    it('orbit mode with extreme user angles does not flip camera', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({
            targetAngle: 100 * Math.PI,
            angle: 100 * Math.PI,
        });
        const birdPos = new THREE.Vector3(0, 10, 0);

        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
        }

        const up = getCameraWorldUp(camera);
        expect(up.y).toBeGreaterThan(0);
        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
    });

    it('maxPitch guarantees cos(pitch * PI/2) > 0 (never crosses 90 degrees vertical)', () => {
        const orbit = makeOrbit();
        const maxPitch = orbit.maxPitch;

        // maxPitch * PI/2 must be less than PI/2 (i.e., maxPitch < 1.0)
        // so cos(maxPitch * PI/2) > 0
        expect(maxPitch).toBeLessThan(1.0);

        const cosAtMax = Math.cos(maxPitch * Math.PI / 2);
        expect(cosAtMax).toBeGreaterThan(0);

        // Also verify at the boundary: even slightly above maxPitch would still be safe
        // but the key guarantee is that maxPitch itself produces a positive cosine
        expect(cosAtMax).toBeGreaterThan(0.01); // reasonable margin
    });
});

describe('camera roll during full orbit', () => {
    // Measure camera roll: the angle of camera's local X axis projected onto XZ plane
    // relative to what a "zero-roll" orbit camera would have.
    // A simpler metric: camera's world up vector Y component should stay near 1
    // and the angle between camera up and world up should stay consistent.
    function getCameraRollDeg(camera: THREE.PerspectiveCamera): number {
        // Camera's local Y axis in world space = camera "up" direction
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        // Camera's local Z axis in world space = camera "forward" (negated)
        const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        // Project world up onto plane perpendicular to camera forward
        const worldUp = new THREE.Vector3(0, 1, 0);
        const projected = worldUp.clone().addScaledVector(camFwd, -worldUp.dot(camFwd)).normalize();
        // Roll = angle between projected world-up and camera's up, in degrees
        const dot = Math.max(-1, Math.min(1, camUp.dot(projected)));
        return Math.acos(dot) * (180 / Math.PI);
    }

    it('ORBIT mode: zero roll at every angle during full 360° Q/E rotation', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({ angle: 0, targetAngle: 0 });
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Converge camera first
        for (let i = 0; i < 100; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
        }

        const initialRoll = getCameraRollDeg(camera);

        // Simulate Q key: orbit full circle in small steps
        const steps = 120; // full circle
        const angleStep = (2 * Math.PI) / steps;
        let maxRollDeviation = 0;

        for (let i = 0; i < steps; i++) {
            orbit.targetAngle += angleStep;
            // Several sub-frames per step to let smoothing converge
            for (let j = 0; j < 10; j++) {
                updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
            }
            const roll = getCameraRollDeg(camera);
            const deviation = Math.abs(roll - initialRoll);
            maxRollDeviation = Math.max(maxRollDeviation, deviation);
        }

        // Roll deviation should be < 2° at any point during full orbit
        expect(maxRollDeviation).toBeLessThan(2);
    });

    it('ORBIT mode: camera up.y stays near 1 throughout full orbit', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({ angle: 0, targetAngle: 0 });
        const birdPos = new THREE.Vector3(0, 10, 0);

        for (let i = 0; i < 100; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
        }

        const steps = 120;
        const angleStep = (2 * Math.PI) / steps;

        for (let i = 0; i < steps; i++) {
            orbit.targetAngle += angleStep;
            for (let j = 0; j < 10; j++) {
                updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
            }
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            // Camera up Y should remain strongly positive (close to 1, never near 0)
            expect(up.y).toBeGreaterThan(0.5);
        }
    });

    it('FOLLOW mode: bird 360° turn produces no net camera roll', () => {
        const camera = makeCamera();
        const orbit = makeOrbit();
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Converge camera behind bird at rotation=0
        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0, undefined, 0, 5, 10);
        }

        const initialRoll = getCameraRollDeg(camera);

        // Bird rotates full 360° with moderate speed and turn velocity
        const steps = 360;
        let maxRollDeviation = 0;

        for (let i = 0; i < steps; i++) {
            const birdRotation = (i / steps) * Math.PI * 2;
            updateCamera(
                camera, orbit, CAMERA_MODES.FOLLOW, birdPos, birdRotation,
                undefined,
                0.1,  // rotation velocity
                5,    // speed
                10    // max speed
            );
            const roll = getCameraRollDeg(camera);
            maxRollDeviation = Math.max(maxRollDeviation, Math.abs(roll - initialRoll));
        }

        // Converge after full rotation
        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0, undefined, 0, 5, 10);
        }

        const finalRoll = getCameraRollDeg(camera);

        // No net roll after full rotation (< 2°)
        expect(Math.abs(finalRoll - initialRoll)).toBeLessThan(2);
        // Max deviation during rotation should be limited (< 10°)
        expect(maxRollDeviation).toBeLessThan(10);
    });

    it('FOLLOW mode with lateralOffset: no roll from position offset', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({ lateralOffset: 2.5 }); // max lateral offset
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Converge with lateral offset active
        for (let i = 0; i < 200; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.FOLLOW, birdPos, 0, undefined, 0.2, 5, 10);
        }

        const roll = getCameraRollDeg(camera);
        // Even with max lateral offset, roll should be small (< 5°)
        expect(roll).toBeLessThan(5);
    });

    it('camera orientation after 360° matches orientation at start', () => {
        const camera = makeCamera();
        const orbit = makeOrbit({ angle: 0, targetAngle: 0 });
        const birdPos = new THREE.Vector3(0, 10, 0);

        // Converge
        for (let i = 0; i < 100; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
        }

        // Record starting quaternion
        const startQuat = camera.quaternion.clone();

        // Full orbit
        const steps = 120;
        const angleStep = (2 * Math.PI) / steps;
        for (let i = 0; i < steps; i++) {
            orbit.targetAngle += angleStep;
            for (let j = 0; j < 10; j++) {
                updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
            }
        }

        // Converge back at ~same angle (2π ≡ 0)
        for (let i = 0; i < 100; i++) {
            updateCamera(camera, orbit, CAMERA_MODES.ORBIT, birdPos, 0);
        }

        // Quaternions should be nearly identical (dot product close to ±1)
        const dot = Math.abs(startQuat.dot(camera.quaternion));
        expect(dot).toBeGreaterThan(0.99);
    });
});

// Camera control module
import * as THREE from 'three';
import type { CameraOrbitState } from './types.ts';
import { CAMERA_MODES, type CameraMode } from '../ui/index.ts';

// Cinematic camera configuration
const CINEMATIC = {
    // Lateral offset (camera moves to outside of turn)
    MAX_LATERAL_OFFSET: 2.5,        // Max sideways offset
    LATERAL_SMOOTHING: 0.12,        // How fast offset responds (snappier re-centering)

    // Follow lag during turns
    BASE_FOLLOW_RATE: 0.12,         // Normal follow rate (snappier catch-up)
    TURN_LAG_MULTIPLIER: 0.5,       // Reduce follow rate during turns (moderate lag)

    // Speed-based distance adjustment
    SPEED_DISTANCE_FACTOR: 0.5,     // Pull back slightly at high speeds

    // Turn intensity scaling (rotationVelocity typically ranges 0-0.2)
    TURN_VELOCITY_SCALE: 5,         // Multiplier to normalize to -1..1 range
};

export function createDefaultCameraOrbit(): CameraOrbitState {
    return {
        angle: 0,
        pitch: 0.25,
        distance: 12,
        targetAngle: 0,
        targetPitch: 0.25,
        targetDistance: 12,
        minDistance: 5,
        maxDistance: 30,
        minPitch: 0.05,
        maxPitch: 0.75,
        // Cinematic camera state
        lateralOffset: 0,
        lastManualInputTime: 0,
    };
}

export function resetCameraOrbit(
    orbit: CameraOrbitState,
    birdRotation: number | null
): void {
    if (birdRotation !== null) {
        orbit.targetAngle = -birdRotation;
        orbit.angle = -birdRotation;
    } else {
        orbit.targetAngle = 0;
        orbit.angle = 0;
    }
    orbit.targetPitch = 0.25;
    orbit.targetDistance = 12;
    // Reset cinematic state
    orbit.lateralOffset = 0;
}

// Get camera's world-facing angle for GTA-style movement
export function getCameraWorldAngle(orbit: CameraOrbitState): number {
    return orbit.angle;
}

export function cycleCameraMode(
    currentMode: CameraMode,
    orbit: CameraOrbitState
): { newMode: CameraMode; modeName: string } {
    const modes = Object.values(CAMERA_MODES) as CameraMode[];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];

    switch (newMode) {
        case CAMERA_MODES.FOLLOW:
            orbit.targetPitch = 0.25;
            break;
        case CAMERA_MODES.ORBIT:
            break;
        case CAMERA_MODES.TOP:
            orbit.targetPitch = 0.75;
            orbit.targetDistance = 25;
            break;
        case CAMERA_MODES.SIDE:
            orbit.targetAngle = Math.PI / 2;
            orbit.targetPitch = 0.1;
            break;
    }

    const modeNames: Record<CameraMode, string> = {
        [CAMERA_MODES.FOLLOW]: 'Follow',
        [CAMERA_MODES.ORBIT]: 'Orbit',
        [CAMERA_MODES.TOP]: 'Top-Down',
        [CAMERA_MODES.SIDE]: 'Side View'
    };

    return { newMode, modeName: modeNames[newMode] };
}

/** Frame-rate independent smoothing factor: given a per-frame factor tuned for 60fps, returns the correct factor for the current delta. */
function smooth(factor: number, delta: number): number {
    return 1 - Math.pow(1 - factor, delta * 60);
}

export function updateCamera(
    camera: THREE.PerspectiveCamera,
    orbit: CameraOrbitState,
    cameraMode: CameraMode,
    birdPos: THREE.Vector3,
    birdRotation: number,
    birdVisualRotation?: number,
    birdRotationVelocity: number = 0,
    birdSpeed: number = 0,
    birdMaxSpeed: number = 1,
    delta: number = 1 / 60,
    checkCollision?: (pos: THREE.Vector3, radius: number) => string | null
): void {
    const actualBirdRotation = birdVisualRotation ?? birdRotation;
    const isFollowMode = cameraMode === CAMERA_MODES.FOLLOW;

    // Guard against NaN/invalid inputs - use safe defaults
    const safeSpeed = Number.isFinite(birdSpeed) ? birdSpeed : 0;
    const safeMaxSpeed = Number.isFinite(birdMaxSpeed) && birdMaxSpeed > 0 ? birdMaxSpeed : 1;
    const safeRotVel = Number.isFinite(birdRotationVelocity) ? birdRotationVelocity : 0;

    // Normalize speed (0-1)
    const normalizedSpeed = Math.min(1, safeSpeed / safeMaxSpeed);

    // Normalize turn rate (-1 to 1, clamped)
    const turnIntensity = Math.max(-1, Math.min(1, safeRotVel * CINEMATIC.TURN_VELOCITY_SCALE));
    const absTurnIntensity = Math.abs(turnIntensity);

    // GTA-style: Camera behavior depends on mode
    // FOLLOW: Camera gently drifts behind bird with cinematic lag during turns
    // ORBIT/other: Camera stays exactly where user positioned it
    if (isFollowMode) {
        // Auto-center delay: don't start following until ~1s after last manual input
        const timeSinceInput = (Date.now() - orbit.lastManualInputTime) / 1000;
        const autoCenterDelay = 1.0; // seconds

        if (timeSinceInput > autoCenterDelay) {
            const behindBirdAngle = -actualBirdRotation;

            let angleDiff = behindBirdAngle - orbit.targetAngle;
            // Normalize angle to [-PI, PI] with iteration limit for safety
            if (Number.isFinite(angleDiff)) {
                let iterations = 0;
                while (angleDiff > Math.PI && iterations < 4) { angleDiff -= Math.PI * 2; iterations++; }
                while (angleDiff < -Math.PI && iterations < 8) { angleDiff += Math.PI * 2; iterations++; }
            } else {
                angleDiff = 0; // Fallback for NaN/Infinity
            }

            // Cinematic: Slower follow during turns creates tension
            const turnLag = 1 - (absTurnIntensity * (1 - CINEMATIC.TURN_LAG_MULTIPLIER));
            const followRate = CINEMATIC.BASE_FOLLOW_RATE * turnLag;
            orbit.targetAngle += angleDiff * followRate * delta * 60;
        }
    }

    // Update cinematic effects (only in FOLLOW mode, decay to neutral otherwise)
    if (isFollowMode) {
        // Lateral offset (camera moves to outside of turn for better view)
        const targetLateral = turnIntensity * CINEMATIC.MAX_LATERAL_OFFSET * normalizedSpeed;
        orbit.lateralOffset += (targetLateral - orbit.lateralOffset) * smooth(CINEMATIC.LATERAL_SMOOTHING, delta);
    } else {
        // Immediately zero cinematic effects in non-follow modes
        orbit.lateralOffset = 0;
    }

    // Clamp targetPitch to prevent camera from flipping upside-down
    orbit.targetPitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.targetPitch));

    // Smooth interpolation for orbit angles (frame-rate independent)
    orbit.angle += (orbit.targetAngle - orbit.angle) * smooth(0.5, delta);
    orbit.pitch += (orbit.targetPitch - orbit.pitch) * smooth(0.4, delta);
    orbit.distance += (orbit.targetDistance - orbit.distance) * smooth(0.15, delta);

    // Clamp pitch after interpolation as well
    orbit.pitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.pitch));

    // Normalize angles to prevent floating-point drift during long sessions
    if (Math.abs(orbit.angle) > 100) {
        const norm = Math.round(orbit.angle / (2 * Math.PI)) * 2 * Math.PI;
        orbit.angle -= norm;
        orbit.targetAngle -= norm;
    }

    // Calculate camera position on cylinder (GTA-style: fixed horizontal distance, variable height)
    const effectiveDistance = orbit.distance + normalizedSpeed * CINEMATIC.SPEED_DISTANCE_FACTOR;
    const heightOffset = effectiveDistance * orbit.pitch; // pitch 0→0, pitch 0.75→9 units above

    // Base camera position (behind bird)
    let targetX = birdPos.x + Math.sin(orbit.angle) * effectiveDistance;
    let targetY = birdPos.y + heightOffset + 2;
    let targetZ = birdPos.z + Math.cos(orbit.angle) * effectiveDistance;

    // Apply lateral offset (perpendicular to camera direction)
    const perpAngle = orbit.angle + Math.PI / 2;
    targetX += Math.sin(perpAngle) * orbit.lateralOffset;
    targetZ += Math.cos(perpAngle) * orbit.lateralOffset;

    // Spring arm: pull camera forward if it would collide with world geometry
    if (checkCollision) {
        const cameraTarget = new THREE.Vector3(targetX, targetY, targetZ);
        if (checkCollision(cameraTarget, 1.0)) {
            // Binary search for safe distance along bird->camera ray
            const dir = cameraTarget.clone().sub(birdPos).normalize();
            let safeDist = 0;
            let testDist = effectiveDistance;
            for (let i = 0; i < 8; i++) {
                const mid = (safeDist + testDist) / 2;
                const testPos = birdPos.clone().addScaledVector(dir, mid);
                testPos.y = targetY; // keep height
                if (checkCollision(testPos, 1.0)) {
                    testDist = mid;
                } else {
                    safeDist = mid;
                }
            }
            // Use safe position
            const safePos = birdPos.clone().addScaledVector(dir, safeDist);
            targetX = safePos.x;
            targetZ = safePos.z;
            // Don't change targetY — keep camera height
        }

        // Also prevent camera from going below ground
        targetY = Math.max(targetY, birdPos.y - 2);
    }

    // Smooth camera movement (frame-rate independent)
    const moveSmoothFactor = smooth(0.3, delta);
    camera.position.x += (targetX - camera.position.x) * moveSmoothFactor;
    camera.position.y += (targetY - camera.position.y) * moveSmoothFactor;
    camera.position.z += (targetZ - camera.position.z) * moveSmoothFactor;

    // Always look at the bird's center — offset look-ahead caused geometric roll
    // accumulation during orbiting (camera rolled 180° over a full circle)
    camera.up.set(0, 1, 0);
    camera.lookAt(birdPos.x, birdPos.y, birdPos.z);
}

export function handleCameraKeyInput(
    input: { cameraLeft: boolean; cameraRight: boolean },
    orbit: CameraOrbitState,
    cameraMode: CameraMode,
    delta: number = 1 / 60
): CameraMode {
    let newMode = cameraMode;
    const rotSpeed = 0.06 * delta * 60; // 0.06 at 60fps

    if (input.cameraLeft) {
        orbit.targetAngle += rotSpeed;
        orbit.lastManualInputTime = Date.now();
        if (cameraMode === CAMERA_MODES.FOLLOW) {
            newMode = CAMERA_MODES.ORBIT;
        }
    }
    if (input.cameraRight) {
        orbit.targetAngle -= rotSpeed;
        orbit.lastManualInputTime = Date.now();
        if (cameraMode === CAMERA_MODES.FOLLOW) {
            newMode = CAMERA_MODES.ORBIT;
        }
    }

    return newMode;
}

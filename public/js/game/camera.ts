// Camera control module
import * as THREE from 'three';
import type { CameraOrbitState } from './types.ts';
import { CAMERA_MODES, type CameraMode } from '../ui/index.ts';

// Cinematic camera configuration
const CINEMATIC = {
    // Camera banking during turns (roll)
    MAX_BANK_ANGLE: 0.15,           // Max roll in radians (~8.5 degrees)
    BANK_SMOOTHING: 0.08,           // How fast bank responds

    // Lateral offset (camera moves to outside of turn)
    MAX_LATERAL_OFFSET: 2.5,        // Max sideways offset
    LATERAL_SMOOTHING: 0.06,        // How fast offset responds

    // Dynamic look-ahead based on speed
    MIN_LOOK_AHEAD: 2,              // Look-ahead when stationary
    MAX_LOOK_AHEAD: 8,              // Look-ahead at max speed
    LOOK_AHEAD_SMOOTHING: 0.1,      // How fast look-ahead responds

    // Follow lag during turns
    BASE_FOLLOW_RATE: 0.05,         // Normal follow rate
    TURN_LAG_MULTIPLIER: 0.3,       // Reduce follow rate during turns (more lag)

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
        maxPitch: 0.8,
        // Cinematic camera state
        bankAngle: 0,
        lateralOffset: 0,
        lookAheadOffset: CINEMATIC.MIN_LOOK_AHEAD
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
    orbit.bankAngle = 0;
    orbit.lateralOffset = 0;
    orbit.lookAheadOffset = CINEMATIC.MIN_LOOK_AHEAD;
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

export function updateCamera(
    camera: THREE.PerspectiveCamera,
    orbit: CameraOrbitState,
    cameraMode: CameraMode,
    birdPos: THREE.Vector3,
    birdRotation: number,
    birdVisualRotation?: number,
    birdRotationVelocity: number = 0,
    birdSpeed: number = 0,
    birdMaxSpeed: number = 1
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
        orbit.targetAngle += angleDiff * followRate;
    }

    // Update cinematic effects (only in FOLLOW mode, decay to neutral otherwise)
    if (isFollowMode) {
        // 1. Camera bank (roll into the turn like a motorcycle/plane)
        const targetBank = -turnIntensity * CINEMATIC.MAX_BANK_ANGLE * normalizedSpeed;
        orbit.bankAngle += (targetBank - orbit.bankAngle) * CINEMATIC.BANK_SMOOTHING;

        // 2. Lateral offset (camera moves to outside of turn for better view)
        const targetLateral = turnIntensity * CINEMATIC.MAX_LATERAL_OFFSET * normalizedSpeed;
        orbit.lateralOffset += (targetLateral - orbit.lateralOffset) * CINEMATIC.LATERAL_SMOOTHING;

        // 3. Dynamic look-ahead based on speed
        const targetLookAhead = CINEMATIC.MIN_LOOK_AHEAD +
            (CINEMATIC.MAX_LOOK_AHEAD - CINEMATIC.MIN_LOOK_AHEAD) * normalizedSpeed;
        orbit.lookAheadOffset += (targetLookAhead - orbit.lookAheadOffset) * CINEMATIC.LOOK_AHEAD_SMOOTHING;
    } else {
        // Decay cinematic effects to neutral in non-follow modes
        orbit.bankAngle *= 0.9;
        orbit.lateralOffset *= 0.9;
        orbit.lookAheadOffset += (CINEMATIC.MIN_LOOK_AHEAD - orbit.lookAheadOffset) * 0.1;
    }

    // Clamp targetPitch to prevent camera from flipping upside-down
    orbit.targetPitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.targetPitch));

    // Smooth interpolation for orbit angles
    const smoothFactor = 0.12;
    orbit.angle += (orbit.targetAngle - orbit.angle) * smoothFactor;
    orbit.pitch += (orbit.targetPitch - orbit.pitch) * 0.08;
    orbit.distance += (orbit.targetDistance - orbit.distance) * 0.08;

    // Clamp pitch after interpolation as well
    orbit.pitch = Math.max(orbit.minPitch, Math.min(orbit.maxPitch, orbit.pitch));

    // Calculate camera position on orbit sphere
    const effectiveDistance = orbit.distance + normalizedSpeed * CINEMATIC.SPEED_DISTANCE_FACTOR;
    const horizontalDist = effectiveDistance * Math.cos(orbit.pitch * Math.PI / 2);
    const verticalOffset = effectiveDistance * Math.sin(orbit.pitch * Math.PI / 2);

    // Base camera position (behind bird)
    let targetX = birdPos.x + Math.sin(orbit.angle) * horizontalDist;
    let targetY = birdPos.y + verticalOffset + 2;
    let targetZ = birdPos.z + Math.cos(orbit.angle) * horizontalDist;

    // Apply lateral offset (perpendicular to camera direction)
    const perpAngle = orbit.angle + Math.PI / 2;
    targetX += Math.sin(perpAngle) * orbit.lateralOffset;
    targetZ += Math.cos(perpAngle) * orbit.lateralOffset;

    // Smooth camera movement
    const moveFactor = 0.1;
    camera.position.x += (targetX - camera.position.x) * moveFactor;
    camera.position.y += (targetY - camera.position.y) * moveFactor;
    camera.position.z += (targetZ - camera.position.z) * moveFactor;

    // Look at point ahead of bird (dynamic based on speed)
    const lookAtX = birdPos.x + Math.sin(actualBirdRotation) * orbit.lookAheadOffset;
    const lookAtY = birdPos.y;
    const lookAtZ = birdPos.z + Math.cos(actualBirdRotation) * orbit.lookAheadOffset;

    camera.lookAt(lookAtX, lookAtY, lookAtZ);

    // Apply camera roll (bank angle)
    camera.rotation.z = orbit.bankAngle;
}

export function handleCameraKeyInput(
    input: { cameraLeft: boolean; cameraRight: boolean },
    orbit: CameraOrbitState,
    cameraMode: CameraMode
): CameraMode {
    let newMode = cameraMode;

    if (input.cameraLeft) {
        orbit.targetAngle += 0.03;
        if (cameraMode === CAMERA_MODES.FOLLOW) {
            newMode = CAMERA_MODES.ORBIT;
        }
    }
    if (input.cameraRight) {
        orbit.targetAngle -= 0.03;
        if (cameraMode === CAMERA_MODES.FOLLOW) {
            newMode = CAMERA_MODES.ORBIT;
        }
    }

    return newMode;
}

// Camera control module
import * as THREE from 'three';
import type { CameraOrbitState } from './types.ts';
import { CAMERA_MODES, type CameraMode } from '../ui/index.ts';

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
        minPitch: -0.1,
        maxPitch: 0.8
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
    birdVisualRotation?: number
): void {
    const actualBirdRotation = birdVisualRotation ?? birdRotation;

    // GTA-style: Camera behavior depends on mode
    // FOLLOW: Camera gently drifts behind bird
    // ORBIT/other: Camera stays exactly where user positioned it
    if (cameraMode === CAMERA_MODES.FOLLOW) {
        const behindBirdAngle = -actualBirdRotation;

        let angleDiff = behindBirdAngle - orbit.targetAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Gentle follow rate - noticeable but not jarring
        const followRate = 0.05;
        orbit.targetAngle += angleDiff * followRate;
    }

    // Smooth interpolation
    const smoothFactor = 0.12;
    orbit.angle += (orbit.targetAngle - orbit.angle) * smoothFactor;
    orbit.pitch += (orbit.targetPitch - orbit.pitch) * 0.08;
    orbit.distance += (orbit.targetDistance - orbit.distance) * 0.08;

    // Calculate camera position on orbit sphere
    const horizontalDist = orbit.distance * Math.cos(orbit.pitch * Math.PI / 2);
    const verticalOffset = orbit.distance * Math.sin(orbit.pitch * Math.PI / 2);

    const targetX = birdPos.x + Math.sin(orbit.angle) * horizontalDist;
    const targetY = birdPos.y + verticalOffset + 2;
    const targetZ = birdPos.z + Math.cos(orbit.angle) * horizontalDist;

    // Smooth camera movement
    const moveFactor = 0.1;
    camera.position.x += (targetX - camera.position.x) * moveFactor;
    camera.position.y += (targetY - camera.position.y) * moveFactor;
    camera.position.z += (targetZ - camera.position.z) * moveFactor;

    // Look at bird (slightly ahead in bird's facing direction)
    const lookAheadDist = 3;
    const lookAtX = birdPos.x + Math.sin(actualBirdRotation) * lookAheadDist;
    const lookAtY = birdPos.y;
    const lookAtZ = birdPos.z + Math.cos(actualBirdRotation) * lookAheadDist;

    camera.lookAt(lookAtX, lookAtY, lookAtZ);
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

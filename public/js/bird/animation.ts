// Bird animation module - handles visual animations
import * as THREE from 'three';
import { type BirdTypeConfig } from './types.ts';
import { type PhysicsState } from './physics.ts';

// Animation state interface
export interface AnimationState {
    wingAngle: number;
    tailAngle: number;
    breathAngle: number;
    waddleAngle: number;
    visualRotation: number;
    visualTiltX: number;
    visualTiltZ: number;
    baseWingSpeed: number;
    currentWingSpeed: number;
    headBaseY: number;
    headBaseZ: number;
}

// Bird parts interface for animation
export interface BirdParts {
    group: THREE.Group;
    body: THREE.Mesh;
    breast: THREE.Mesh | null;
    head: THREE.Mesh | null;
    lowerBeak: THREE.Mesh | null;
    leftWingGroup: THREE.Group;
    rightWingGroup: THREE.Group;
    tailGroup: THREE.Group;
    leftLegGroup: THREE.Group;
    rightLegGroup: THREE.Group;
}

// Create initial animation state
export function createAnimationState(birdType: string): AnimationState {
    return {
        wingAngle: 0,
        tailAngle: 0,
        breathAngle: 0,
        waddleAngle: 0,
        visualRotation: 0,
        visualTiltX: 0,
        visualTiltZ: 0,
        baseWingSpeed: birdType === 'hummingbird' ? 1.5 : 0.25,
        currentWingSpeed: birdType === 'hummingbird' ? 1.5 : 0.25,
        headBaseY: 0,
        headBaseZ: 0
    };
}

// Update visual rotation and tilts
function updateVisualTransforms(
    anim: AnimationState,
    physics: PhysicsState,
    config: BirdTypeConfig
): void {
    // Smooth visual rotation - use higher interpolation for responsive turning
    // 0.5 makes the bird visually follow the physics rotation quickly
    anim.visualRotation += (physics.rotation - anim.visualRotation) * 0.5;

    // Penguin special: waddle animation instead of flight tilts
    if (config.canFly === false) {
        // Waddle side-to-side when walking
        if (physics.isWaddling) {
            anim.waddleAngle += 0.3;
            const waddleTilt = Math.sin(anim.waddleAngle) * 0.15;
            anim.visualTiltZ = waddleTilt;
            // Slight forward lean when walking
            anim.visualTiltX = 0.1;
        } else if (physics.isJumping) {
            // Lean forward when jumping
            anim.visualTiltX += (0.3 - anim.visualTiltX) * 0.1;
            anim.visualTiltZ *= 0.9;
        } else {
            // Upright when standing
            anim.visualTiltX += (0 - anim.visualTiltX) * 0.1;
            anim.visualTiltZ += (0 - anim.visualTiltZ) * 0.1;
        }
    } else {
        // Normal bird tilts
        const targetTiltX = Math.max(-0.5, Math.min(0.5, physics.velocity.y * 0.4));
        const targetTiltZ = Math.max(-0.6, Math.min(0.6, -physics.rotationVelocity * 8));

        anim.visualTiltX += (targetTiltX - anim.visualTiltX) * 0.1;
        anim.visualTiltZ += (targetTiltZ - anim.visualTiltZ) * 0.1;
    }
}

// Update wing animation
function updateWingAnimation(
    anim: AnimationState,
    physics: PhysicsState,
    parts: BirdParts,
    config: BirdTypeConfig
): void {
    // Penguin flipper animation
    if (config.canFly === false) {
        anim.wingAngle += 0.1;

        if (physics.isFlapping) {
            // Excited flapping when trying to "fly" (pressing space)
            const flipperFlap = Math.sin(anim.wingAngle * 3) * 0.6;
            parts.leftWingGroup.rotation.z = -0.3 - flipperFlap;
            parts.rightWingGroup.rotation.z = 0.3 + flipperFlap;
        } else if (physics.isWaddling) {
            // Swing flippers opposite to waddle
            const flipperSwing = Math.sin(anim.waddleAngle) * 0.3;
            parts.leftWingGroup.rotation.z = -0.3 - flipperSwing;
            parts.rightWingGroup.rotation.z = 0.3 + flipperSwing;
            // Slight forward/back motion
            parts.leftWingGroup.rotation.y = Math.sin(anim.waddleAngle) * 0.2;
            parts.rightWingGroup.rotation.y = -Math.sin(anim.waddleAngle) * 0.2;
        } else {
            // Rest position - flippers at sides
            parts.leftWingGroup.rotation.z += (-0.3 - parts.leftWingGroup.rotation.z) * 0.1;
            parts.rightWingGroup.rotation.z += (0.3 - parts.rightWingGroup.rotation.z) * 0.1;
        }
    } else {
        // Normal bird wing animation
        if (physics.isFlapping) {
            anim.currentWingSpeed += (anim.baseWingSpeed * 2 - anim.currentWingSpeed) * 0.1;
        } else if (physics.isGliding && physics.horizontalSpeed > 0.3) {
            anim.currentWingSpeed += (anim.baseWingSpeed * 0.15 - anim.currentWingSpeed) * 0.05;
        } else if (physics.velocity.y < -0.1) {
            anim.currentWingSpeed += (anim.baseWingSpeed * 0.8 - anim.currentWingSpeed) * 0.1;
        } else {
            anim.currentWingSpeed += (anim.baseWingSpeed - anim.currentWingSpeed) * 0.1;
        }

        anim.wingAngle += anim.currentWingSpeed;

        let wingAmplitude = 0.6;
        if (physics.isGliding && physics.horizontalSpeed > 0.3) {
            wingAmplitude = 0.15;
        } else if (physics.isFlapping) {
            wingAmplitude = 0.8;
        }

        const wingFlap = Math.sin(anim.wingAngle) * wingAmplitude;

        const baseWingAngle = physics.isGliding ? -0.1 : -0.3;
        parts.leftWingGroup.rotation.z = baseWingAngle - wingFlap;
        parts.rightWingGroup.rotation.z = -baseWingAngle + wingFlap;

        const wingForward = Math.sin(anim.wingAngle * 0.5) * 0.1;
        parts.leftWingGroup.rotation.y = wingForward;
        parts.rightWingGroup.rotation.y = -wingForward;
    }
}

// Update tail animation
function updateTailAnimation(
    anim: AnimationState,
    physics: PhysicsState,
    parts: BirdParts,
    config: BirdTypeConfig
): void {
    anim.tailAngle += 0.05;
    const tailWag = Math.sin(anim.tailAngle) * 0.1;
    parts.tailGroup.rotation.y = tailWag + physics.rotationVelocity * 2;

    if (config.canFly === false) {
        // Penguin tail - small wobble when waddling
        if (physics.isWaddling) {
            parts.tailGroup.rotation.y = Math.sin(anim.waddleAngle) * 0.2;
        }
        parts.tailGroup.rotation.x = 0.5; // Fixed upward angle
    } else {
        const tailPitch = 0.2 + (physics.velocity.y > 0 ? 0.3 : -0.15);
        parts.tailGroup.rotation.x += (tailPitch - parts.tailGroup.rotation.x) * 0.1;

        // Tail spread when turning or braking
        const tailSpread = Math.abs(physics.rotationVelocity) * 3 + (physics.velocity.y < -0.1 ? 0.2 : 0);
        parts.tailGroup.scale.x = 1 + tailSpread;
    }
}

// Update leg animation
function updateLegAnimation(
    anim: AnimationState,
    physics: PhysicsState,
    parts: BirdParts,
    config: BirdTypeConfig
): void {
    if (config.canFly === false) {
        // Penguin waddle walk
        if (physics.isWaddling) {
            const walkCycle = Math.sin(anim.waddleAngle);
            // Alternating leg lift
            parts.leftLegGroup.rotation.x = walkCycle * 0.3;
            parts.rightLegGroup.rotation.x = -walkCycle * 0.3;
            // Side sway
            parts.leftLegGroup.position.y = walkCycle > 0 ? 0.05 : 0;
            parts.rightLegGroup.position.y = walkCycle < 0 ? 0.05 : 0;
        } else if (physics.isJumping) {
            // Legs tucked when jumping
            parts.leftLegGroup.rotation.x = 0.5;
            parts.rightLegGroup.rotation.x = 0.5;
        } else {
            // Standing
            parts.leftLegGroup.rotation.x = 0;
            parts.rightLegGroup.rotation.x = 0;
            parts.leftLegGroup.position.y = 0;
            parts.rightLegGroup.position.y = 0;
        }
    } else {
        // Normal bird leg animation
        const legTuck = 0.8 + (physics.horizontalSpeed * 0.3);
        parts.leftLegGroup.rotation.x = legTuck + Math.sin(anim.wingAngle) * 0.1;
        parts.rightLegGroup.rotation.x = legTuck + Math.sin(anim.wingAngle + Math.PI) * 0.1;

        // Legs tucked back more at high speed
        const legBack = physics.horizontalSpeed * 0.15;
        parts.leftLegGroup.rotation.z = legBack;
        parts.rightLegGroup.rotation.z = -legBack;
    }
}

// Update head and breathing animation
function updateHeadAnimation(
    anim: AnimationState,
    physics: PhysicsState,
    parts: BirdParts,
    config: BirdTypeConfig
): void {
    if (parts.head) {
        anim.breathAngle += 0.03;
        const breathScale = 1 + Math.sin(anim.breathAngle) * 0.02;
        parts.body.scale.y = 0.85 * breathScale;
        if (parts.breast) {
            parts.breast.scale.y = 0.75 * breathScale;
        }

        // Gentle head rotation - reduced to avoid jerking
        parts.head.rotation.x = Math.sin(anim.wingAngle * 2) * 0.015;
        parts.head.rotation.y = physics.rotationVelocity * 1.5;

        // Subtle head bob using stored base position
        parts.head.position.y = anim.headBaseY + Math.sin(anim.wingAngle * 2) * config.size * 0.005;
    }

    // Beak animation
    if (parts.lowerBeak) {
        // Slight beak movement synced with breathing
        parts.lowerBeak.rotation.x = Math.sin(anim.breathAngle * 2) * 0.02;
    }
}

// Main animation update function
export function updateAnimation(
    physics: PhysicsState,
    anim: AnimationState,
    parts: BirdParts,
    config: BirdTypeConfig
): void {
    // Update visual transforms
    updateVisualTransforms(anim, physics, config);

    // Apply transforms to group
    parts.group.position.copy(physics.position);
    parts.group.rotation.y = anim.visualRotation;
    parts.group.rotation.x = anim.visualTiltX;
    parts.group.rotation.z = anim.visualTiltZ;

    // Update wing animation
    updateWingAnimation(anim, physics, parts, config);

    // Update tail animation
    updateTailAnimation(anim, physics, parts, config);

    // Update leg animation
    updateLegAnimation(anim, physics, parts, config);

    // Update head and breathing animation
    updateHeadAnimation(anim, physics, parts, config);
}

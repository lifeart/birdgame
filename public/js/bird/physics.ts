// Bird physics module - handles movement and collision physics
import * as THREE from 'three';
import { GRAVITY, AIR_RESISTANCE, ROTATION_DAMPING, type BirdTypeConfig, type BirdInput } from './types.ts';

// Physics state interface
export interface PhysicsState {
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    rotation: number;
    rotationVelocity: number;
    horizontalSpeed: number;
    isFlapping: boolean;
    isGliding: boolean;
    isOnGround: boolean;
    isJumping: boolean;
    isWaddling: boolean;
    currentMaxSpeed: number;
    currentAcceleration: number;
}

// Normalized input for physics calculations
interface NormalizedInput {
    left: number;
    right: number;
    forward: number;
    backward: number;
    up: number;
    down: number;
    turnRate: number | undefined;
    isTouch: boolean;
}

// Normalize input values (support both boolean and analog 0-1)
function normalizeInput(input: BirdInput): NormalizedInput {
    return {
        left: typeof input.left === 'number' ? input.left : (input.left ? 1 : 0),
        right: typeof input.right === 'number' ? input.right : (input.right ? 1 : 0),
        forward: typeof input.forward === 'number' ? input.forward : (input.forward ? 1 : 0),
        backward: typeof input.backward === 'number' ? input.backward : (input.backward ? 1 : 0),
        up: typeof input.up === 'number' ? input.up : (input.up ? 1 : 0),
        down: typeof input.down === 'number' ? input.down : (input.down ? 1 : 0),
        turnRate: input.turnRate,
        isTouch: input.isTouch || false
    };
}

// Update rotation physics
function updateRotation(
    state: PhysicsState,
    input: NormalizedInput,
    config: BirdTypeConfig
): void {
    // Balance: higher speed = lower turn rate (30% turn rate at max speed)
    const minTurnRatio = 0.3;
    const speedRatio = Math.min(1, state.horizontalSpeed / state.currentMaxSpeed);
    const turnMultiplier = 1 - (1 - minTurnRatio) * speedRatio;
    const effectiveTurnSpeed = config.turnSpeed * turnMultiplier;

    if (input.turnRate !== undefined && input.turnRate !== 0) {
        // Touch input: direct turn rate control (joystick position = turn rate)
        // When joystick released, turnRate = 0, so rotation stops immediately
        const targetRotationVelocity = input.turnRate * effectiveTurnSpeed * 1.5;
        // Smooth transition to target
        state.rotationVelocity += (targetRotationVelocity - state.rotationVelocity) * 0.3;
    } else if (input.isTouch) {
        // Touch input but joystick centered - stop rotation smoothly
        state.rotationVelocity *= 0.8;
    } else {
        // Keyboard input: accumulating rotation with inertia
        if (input.left > 0) {
            state.rotationVelocity += effectiveTurnSpeed * 0.15 * input.left;
        }
        if (input.right > 0) {
            state.rotationVelocity -= effectiveTurnSpeed * 0.15 * input.right;
        }
        state.rotationVelocity *= ROTATION_DAMPING;
    }

    // Apply rotation
    state.rotation += state.rotationVelocity;
}

// Update horizontal thrust
function updateHorizontalThrust(
    state: PhysicsState,
    input: NormalizedInput
): void {
    // Forward thrust
    if (input.forward > 0) {
        const accel = state.currentAcceleration * input.forward;
        const forwardX = Math.sin(state.rotation) * accel;
        const forwardZ = Math.cos(state.rotation) * accel;
        state.velocity.x += forwardX;
        state.velocity.z += forwardZ;
    }

    // Backward thrust (slower than forward)
    if (input.backward > 0) {
        const backwardAccel = state.currentAcceleration * 0.5 * input.backward;
        const backwardX = -Math.sin(state.rotation) * backwardAccel;
        const backwardZ = -Math.cos(state.rotation) * backwardAccel;
        state.velocity.x += backwardX;
        state.velocity.z += backwardZ;
    }

    // Calculate horizontal speed
    state.horizontalSpeed = Math.sqrt(
        state.velocity.x * state.velocity.x +
        state.velocity.z * state.velocity.z
    );

    // Clamp to current max speed (based on worms eaten)
    if (state.horizontalSpeed > state.currentMaxSpeed) {
        const ratio = state.currentMaxSpeed / state.horizontalSpeed;
        state.velocity.x *= ratio;
        state.velocity.z *= ratio;
        state.horizontalSpeed = state.currentMaxSpeed;
    }
}

// Update vertical movement for penguin (jumping)
function updatePenguinVertical(
    state: PhysicsState,
    input: NormalizedInput,
    config: BirdTypeConfig
): void {
    state.isFlapping = input.up > 0;
    state.isOnGround = state.position.y <= 2.1;

    // Jump when on ground
    if (input.up > 0 && state.isOnGround && !state.isJumping) {
        state.velocity.y = config.jumpPower || 0.1;
        state.isJumping = true;
    }

    // Reset jump state when landed
    if (state.isOnGround && state.velocity.y <= 0) {
        state.isJumping = false;
    }

    // Stronger gravity for penguin (falls faster)
    state.velocity.y -= GRAVITY * 1.5;

    // Penguin waddle state
    state.isWaddling = state.isOnGround && state.horizontalSpeed > 0.05;
}

// Update vertical movement for flying birds
function updateFlyingVertical(
    state: PhysicsState,
    input: NormalizedInput,
    config: BirdTypeConfig
): void {
    state.isFlapping = input.up > 0;

    // Apply gravity for flying birds
    state.velocity.y -= GRAVITY;

    if (input.up > 0) {
        state.velocity.y += config.liftPower * input.up;
    }

    if (input.down > 0) {
        state.velocity.y -= config.liftPower * 0.5 * input.down;
    }

    // Gliding
    state.isGliding = input.up === 0 && input.down === 0 && state.horizontalSpeed > 0.2;
    if (state.isGliding) {
        const glideLift = state.horizontalSpeed * config.glideEfficiency * 0.02;
        state.velocity.y += glideLift;
    }
}

// Apply bounds to position
function applyBounds(state: PhysicsState): void {
    // Ground bound
    if (state.position.y < 2) {
        state.position.y = 2;
        state.velocity.y = Math.max(0, state.velocity.y);
        state.velocity.x *= 0.9;
        state.velocity.z *= 0.9;
    }

    // Sky bound
    if (state.position.y > 100) {
        state.position.y = 100;
        state.velocity.y = Math.min(0, state.velocity.y);
    }

    // Horizontal bounds
    const bound = 150;
    state.position.x = Math.max(-bound, Math.min(bound, state.position.x));
    state.position.z = Math.max(-bound, Math.min(bound, state.position.z));
}

// Main physics update function
export function updatePhysics(
    input: BirdInput,
    state: PhysicsState,
    config: BirdTypeConfig
): void {
    const normalizedInput = normalizeInput(input);

    // Update rotation
    updateRotation(state, normalizedInput, config);

    // Update horizontal thrust
    updateHorizontalThrust(state, normalizedInput);

    // Update vertical movement based on bird type (gravity applied inside each function)
    if (config.canFly === false) {
        updatePenguinVertical(state, normalizedInput, config);
    } else {
        updateFlyingVertical(state, normalizedInput, config);
    }

    // Clamp vertical velocity
    state.velocity.y = Math.max(-state.currentMaxSpeed, Math.min(state.currentMaxSpeed * 0.8, state.velocity.y));

    // Apply air resistance
    state.velocity.x *= AIR_RESISTANCE;
    state.velocity.z *= AIR_RESISTANCE;

    // Apply velocity to position
    state.position.add(state.velocity);

    // Apply bounds
    applyBounds(state);
}

// Create initial physics state
export function createPhysicsState(config: BirdTypeConfig): PhysicsState {
    return {
        velocity: new THREE.Vector3(),
        position: new THREE.Vector3(0, 10, 0),
        rotation: 0,
        rotationVelocity: 0,
        horizontalSpeed: 0,
        isFlapping: false,
        isGliding: false,
        isOnGround: false,
        isJumping: false,
        isWaddling: false,
        currentMaxSpeed: config.baseMaxSpeed,
        currentAcceleration: config.baseAcceleration
    };
}

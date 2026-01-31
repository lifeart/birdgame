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
    left: number;      // Strafe left (0-1)
    right: number;     // Strafe right (0-1)
    forward: number;   // Forward thrust (0-1)
    backward: number;  // Backward thrust (0-1)
    up: number;        // Ascend/flap (0-1)
    down: number;      // Descend (0-1)
}

// Movement intent in world space
interface MovementIntent {
    x: number;  // World X direction
    z: number;  // World Z direction
    magnitude: number;  // 0-1 input strength
}

// Normalize input values (support both boolean and analog 0-1)
function normalizeInput(input: BirdInput): NormalizedInput {
    return {
        left: typeof input.left === 'number' ? input.left : (input.left ? 1 : 0),
        right: typeof input.right === 'number' ? input.right : (input.right ? 1 : 0),
        forward: typeof input.forward === 'number' ? input.forward : (input.forward ? 1 : 0),
        backward: typeof input.backward === 'number' ? input.backward : (input.backward ? 1 : 0),
        up: typeof input.up === 'number' ? input.up : (input.up ? 1 : 0),
        down: typeof input.down === 'number' ? input.down : (input.down ? 1 : 0)
    };
}

// Compute movement intent in world space based on camera angle
function computeMovementIntent(input: NormalizedInput, cameraAngle: number): MovementIntent {
    // Camera forward and right vectors (in XZ plane)
    // cameraAngle is the camera's orbit angle around the bird
    // Camera looks toward bird, so forward direction is opposite of camera angle
    const forwardAngle = cameraAngle + Math.PI;

    // Optimize: compute sin/cos once and derive right vector mathematically
    const sinFwd = Math.sin(forwardAngle);
    const cosFwd = Math.cos(forwardAngle);

    // Combine inputs into movement direction
    const inputForward = input.forward - input.backward;
    const inputRight = input.right - input.left;

    // World-space movement vector
    // Forward: (sinFwd, cosFwd), Right (90° clockwise): (-cosFwd, sinFwd)
    const moveX = sinFwd * inputForward - cosFwd * inputRight;
    const moveZ = cosFwd * inputForward + sinFwd * inputRight;

    // Magnitude (clamped to 1)
    const magnitude = Math.min(1, Math.sqrt(moveX * moveX + moveZ * moveZ));

    // Normalize if there's movement
    if (magnitude > 0.001) {
        return {
            x: moveX / magnitude,
            z: moveZ / magnitude,
            magnitude
        };
    }

    return { x: 0, z: 0, magnitude: 0 };
}

// Update GTA-style movement - applies thrust in computed direction
function updateGTAMovement(
    state: PhysicsState,
    movement: MovementIntent
): void {
    if (movement.magnitude > 0.001) {
        const accel = state.currentAcceleration * movement.magnitude;
        state.velocity.x += movement.x * accel;
        state.velocity.z += movement.z * accel;
    }

    // Calculate horizontal speed
    state.horizontalSpeed = Math.sqrt(
        state.velocity.x * state.velocity.x +
        state.velocity.z * state.velocity.z
    );

    // Clamp to current max speed
    if (state.horizontalSpeed > state.currentMaxSpeed) {
        const ratio = state.currentMaxSpeed / state.horizontalSpeed;
        state.velocity.x *= ratio;
        state.velocity.z *= ratio;
        state.horizontalSpeed = state.currentMaxSpeed;
    }
}

// Update auto-rotation - bird smoothly rotates toward movement direction
// Only rotates when moving forward (like a car - reverse doesn't turn)
function updateAutoRotation(
    state: PhysicsState,
    movement: MovementIntent,
    config: BirdTypeConfig,
    hasForwardInput: boolean
): void {
    // Only rotate when moving forward (not when reversing or stationary)
    if (movement.magnitude < 0.1 || !hasForwardInput) {
        // When stationary or reversing, just apply damping
        state.rotationVelocity *= ROTATION_DAMPING;
        return;
    }

    // Calculate target rotation from movement direction
    const targetRotation = Math.atan2(movement.x, movement.z);

    // Calculate shortest angle difference
    let angleDiff = targetRotation - state.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Smooth rotation toward target (faster turn speed for GTA feel)
    const turnSpeed = config.turnSpeed * 1.5;
    const maxTurn = turnSpeed * movement.magnitude;

    // Apply rotation
    if (Math.abs(angleDiff) > 0.01) {
        const turnAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff) * 0.15, maxTurn);
        state.rotation += turnAmount;
        // Set rotation velocity for visual banking effect
        state.rotationVelocity = turnAmount * 2;
    } else {
        state.rotation = targetRotation;
    }

    // Apply damping to rotation velocity
    state.rotationVelocity *= ROTATION_DAMPING;
}

// Legacy rotation physics (kept for backward compatibility when no camera angle provided)
function updateRotationLegacy(
    state: PhysicsState,
    input: NormalizedInput,
    config: BirdTypeConfig
): void {
    // Balance: higher speed = lower turn rate (50% turn rate at max speed)
    const minTurnRatio = 0.5;
    const speedRatio = Math.min(1, state.horizontalSpeed / state.currentMaxSpeed);
    const turnMultiplier = 1 - (1 - minTurnRatio) * speedRatio;
    const effectiveTurnSpeed = config.turnSpeed * turnMultiplier;

    // Keyboard A/D turning
    if (input.left > 0) {
        const turnAmount = effectiveTurnSpeed * 0.6 * input.left;
        state.rotation += turnAmount;
        state.rotationVelocity += turnAmount * 1.5;
    }
    if (input.right > 0) {
        const turnAmount = effectiveTurnSpeed * 0.6 * input.right;
        state.rotation -= turnAmount;
        state.rotationVelocity -= turnAmount * 1.5;
    }

    // Always apply damping
    state.rotationVelocity *= ROTATION_DAMPING;
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
// cameraAngle: Optional camera orbit angle for GTA-style movement
export function updatePhysics(
    input: BirdInput,
    state: PhysicsState,
    config: BirdTypeConfig,
    cameraAngle?: number
): void {
    const normalizedInput = normalizeInput(input);

    // GTA-style controls when camera angle is provided
    if (cameraAngle !== undefined) {
        // Compute movement direction relative to camera
        const movement = computeMovementIntent(normalizedInput, cameraAngle);

        // Apply GTA movement
        updateGTAMovement(state, movement);

        // Auto-rotate bird toward movement direction (only when moving forward, like a car)
        const hasForwardInput = normalizedInput.forward > 0;
        updateAutoRotation(state, movement, config, hasForwardInput);
    } else {
        // Legacy mode: bird-relative controls
        updateRotationLegacy(state, normalizedInput, config);
        updateHorizontalThrust(state, normalizedInput);
    }

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

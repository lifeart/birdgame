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
    movement: MovementIntent,
    dt: number
): void {
    if (movement.magnitude > 0.001) {
        const accel = state.currentAcceleration * movement.magnitude * dt;
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
    hasForwardInput: boolean,
    dt: number
): void {
    // Only rotate when moving forward (not when reversing or stationary)
    if (movement.magnitude < 0.1 || !hasForwardInput) {
        // When stationary or reversing, just apply damping
        state.rotationVelocity *= Math.pow(ROTATION_DAMPING, dt);
        return;
    }

    // Calculate target rotation from movement direction
    const targetRotation = Math.atan2(movement.x, movement.z);

    // Calculate shortest angle difference with safety check
    let angleDiff = targetRotation - state.rotation;
    if (Number.isFinite(angleDiff)) {
        let iterations = 0;
        while (angleDiff > Math.PI && iterations < 4) { angleDiff -= Math.PI * 2; iterations++; }
        while (angleDiff < -Math.PI && iterations < 8) { angleDiff += Math.PI * 2; iterations++; }
    } else {
        return; // Skip rotation update if we have invalid data
    }

    // Gradual rotation toward target - slower for more cinematic turns
    // Lower smoothing = more gradual turn
    const turnSmoothFactor = config.turnResponsiveness ?? 0.06;  // How much of the angle difference to cover per frame
    const maxTurn = config.turnSpeed * 0.8 * movement.magnitude * dt;  // Cap turn rate

    // Apply rotation
    if (Math.abs(angleDiff) > 0.01) {
        const turnAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff) * turnSmoothFactor * dt, maxTurn);
        state.rotation += turnAmount;
        // Set rotation velocity for visual banking and camera effects
        // Amplify turnAmount (typically 0-0.05) to useful range for camera (0-0.2)
        state.rotationVelocity = turnAmount * 3;
    } else {
        state.rotation = targetRotation;
        // When aligned, decay rotation velocity for smooth settling
        state.rotationVelocity *= Math.pow(ROTATION_DAMPING, dt);
    }
}

// Legacy rotation physics (kept for backward compatibility when no camera angle provided)
function updateRotationLegacy(
    state: PhysicsState,
    input: NormalizedInput,
    config: BirdTypeConfig,
    dt: number
): void {
    // Balance: higher speed = lower turn rate (50% turn rate at max speed)
    const minTurnRatio = 0.5;
    const safeMaxSpeed = state.currentMaxSpeed > 0 ? state.currentMaxSpeed : 1;
    const speedRatio = Math.min(1, state.horizontalSpeed / safeMaxSpeed);
    const turnMultiplier = 1 - (1 - minTurnRatio) * speedRatio;
    const effectiveTurnSpeed = config.turnSpeed * turnMultiplier;

    // Keyboard A/D turning
    if (input.left > 0) {
        const turnAmount = effectiveTurnSpeed * 0.6 * input.left * dt;
        state.rotation += turnAmount;
        state.rotationVelocity += turnAmount * 1.5;
    }
    if (input.right > 0) {
        const turnAmount = effectiveTurnSpeed * 0.6 * input.right * dt;
        state.rotation -= turnAmount;
        state.rotationVelocity -= turnAmount * 1.5;
    }

    // Always apply damping
    state.rotationVelocity *= Math.pow(ROTATION_DAMPING, dt);
}

// Update horizontal thrust
function updateHorizontalThrust(
    state: PhysicsState,
    input: NormalizedInput,
    dt: number
): void {
    // Forward thrust
    if (input.forward > 0) {
        const accel = state.currentAcceleration * input.forward * dt;
        const forwardX = Math.sin(state.rotation) * accel;
        const forwardZ = Math.cos(state.rotation) * accel;
        state.velocity.x += forwardX;
        state.velocity.z += forwardZ;
    }

    // Backward thrust (slower than forward)
    if (input.backward > 0) {
        const backwardAccel = state.currentAcceleration * 0.5 * input.backward * dt;
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
    config: BirdTypeConfig,
    dt: number
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
    state.velocity.y -= GRAVITY * 1.5 * dt;

    // Penguin waddle state
    state.isWaddling = state.isOnGround && state.horizontalSpeed > 0.05;
}

// Update vertical movement for flying birds
function updateFlyingVertical(
    state: PhysicsState,
    input: NormalizedInput,
    config: BirdTypeConfig,
    dt: number
): void {
    state.isFlapping = input.up > 0;

    // Apply gravity for flying birds (species can tweak weight/floatiness)
    state.velocity.y -= GRAVITY * (config.gravityScale ?? 1) * dt;

    if (input.up > 0) {
        state.velocity.y += config.liftPower * input.up * dt;
    }

    if (input.down > 0) {
        state.velocity.y -= config.liftPower * 0.5 * input.down * dt;
    }

    // Gliding
    state.isGliding = input.up === 0 && input.down === 0 && state.horizontalSpeed > 0.2;
    if (state.isGliding) {
        const glideLift = state.horizontalSpeed * config.glideEfficiency * 0.02 * dt;
        state.velocity.y += glideLift;
    }
}

// Apply bounds to position
function applyBounds(state: PhysicsState, dt: number): void {
    // Ground bound
    if (state.position.y < 2) {
        state.position.y = 2;
        state.velocity.y = Math.max(0, state.velocity.y);
        const groundFriction = Math.pow(0.9, dt);
        state.velocity.x *= groundFriction;
        state.velocity.z *= groundFriction;
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
// delta: Time since last frame in seconds (from clock.getDelta())
export function updatePhysics(
    input: BirdInput,
    state: PhysicsState,
    config: BirdTypeConfig,
    cameraAngle?: number,
    delta?: number
): void {
    // Clamp and normalize delta to 60fps baseline
    // dt=1.0 at 60fps, dt=0.5 at 120fps, dt=2.0 at 30fps
    const safeDelta = (delta !== undefined && delta > 0) ? Math.min(delta, 0.1) : 1 / 60;
    const dt = safeDelta * 60;

    const normalizedInput = normalizeInput(input);

    // GTA-style controls when camera angle is provided
    if (cameraAngle !== undefined) {
        // Compute movement direction relative to camera
        const movement = computeMovementIntent(normalizedInput, cameraAngle);

        // Apply GTA movement
        updateGTAMovement(state, movement, dt);

        // Auto-rotate bird toward movement direction (only when moving forward, like a car)
        const hasForwardInput = normalizedInput.forward > 0;
        updateAutoRotation(state, movement, config, hasForwardInput, dt);
    } else {
        // Legacy mode: bird-relative controls
        updateRotationLegacy(state, normalizedInput, config, dt);
        updateHorizontalThrust(state, normalizedInput, dt);
    }

    // Update vertical movement based on bird type (gravity applied inside each function)
    if (config.canFly === false) {
        updatePenguinVertical(state, normalizedInput, config, dt);
    } else {
        updateFlyingVertical(state, normalizedInput, config, dt);
    }

    // Clamp vertical velocity
    state.velocity.y = Math.max(-state.currentMaxSpeed, Math.min(state.currentMaxSpeed * 0.8, state.velocity.y));

    // Apply air resistance (frame-rate independent: raise to power of dt)
    state.velocity.x *= Math.pow(AIR_RESISTANCE, dt);
    state.velocity.z *= Math.pow(AIR_RESISTANCE, dt);

    // Apply velocity to position (scale by dt for frame-rate independence)
    state.position.addScaledVector(state.velocity, dt);

    // Apply bounds
    applyBounds(state, dt);
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

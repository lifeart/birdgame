import { describe, it, expect } from 'vitest';

import { createPhysicsState, updatePhysics } from '../../public/js/bird/physics.ts';
import { BIRD_TYPES, GRAVITY, AIR_RESISTANCE } from '../../public/js/bird/types.ts';

// Standard delta for 60fps (dt=1.0 after normalization)
const DELTA_60FPS = 1 / 60;

describe('bird physics', () => {
    it('owl gliding still loses altitude at max glide speed', () => {
        const cfg = BIRD_TYPES.owl;
        const state = createPhysicsState(cfg);

        state.currentMaxSpeed = cfg.maxSpeed;
        state.currentAcceleration = cfg.maxAcceleration;
        state.velocity.set(0, 0, cfg.maxSpeed);
        state.horizontalSpeed = cfg.maxSpeed;

        updatePhysics({}, state, cfg, undefined, DELTA_60FPS);

        expect(state.isGliding).toBe(true);
        expect(state.velocity.y).toBeLessThan(0);
    });

    it('produces identical results at 60fps with dt=1/60', () => {
        const cfg = BIRD_TYPES.sparrow;
        const state = createPhysicsState(cfg);

        state.velocity.set(0.1, 0.05, 0.1);
        state.position.set(0, 10, 0);

        const posBefore = state.position.clone();

        updatePhysics({ forward: true }, state, cfg, undefined, DELTA_60FPS);

        // At 60fps, dt=1.0, so physics should behave as before
        // Velocity should have changed due to acceleration and air resistance
        expect(state.position.x).not.toBe(posBefore.x);
        expect(state.position.z).not.toBe(posBefore.z);
    });

    it('frame-rate independent: 2 half-steps approximate 1 full step', () => {
        const cfg = BIRD_TYPES.sparrow;

        // Single step at 60fps
        const state1 = createPhysicsState(cfg);
        state1.velocity.set(0.1, 0, 0.1);
        state1.position.set(0, 10, 0);
        updatePhysics({ forward: true }, state1, cfg, undefined, DELTA_60FPS);

        // Two half-steps at 120fps
        const state2 = createPhysicsState(cfg);
        state2.velocity.set(0.1, 0, 0.1);
        state2.position.set(0, 10, 0);
        const halfDelta = DELTA_60FPS / 2;
        updatePhysics({ forward: true }, state2, cfg, undefined, halfDelta);
        updatePhysics({ forward: true }, state2, cfg, undefined, halfDelta);

        // Positions should be close (not exact due to integration method, but within ~5%)
        const dist = state1.position.distanceTo(state2.position);
        const magnitude = state1.position.length();
        expect(dist / magnitude).toBeLessThan(0.05);
    });

    it('defaults to 1/60 when delta is not provided', () => {
        const cfg = BIRD_TYPES.sparrow;

        const stateWithDelta = createPhysicsState(cfg);
        stateWithDelta.velocity.set(0.1, 0, 0.1);
        stateWithDelta.position.set(0, 10, 0);
        updatePhysics({}, stateWithDelta, cfg, undefined, DELTA_60FPS);

        const stateWithout = createPhysicsState(cfg);
        stateWithout.velocity.set(0.1, 0, 0.1);
        stateWithout.position.set(0, 10, 0);
        updatePhysics({}, stateWithout, cfg);

        expect(stateWithDelta.position.x).toBeCloseTo(stateWithout.position.x, 10);
        expect(stateWithDelta.position.y).toBeCloseTo(stateWithout.position.y, 10);
        expect(stateWithDelta.position.z).toBeCloseTo(stateWithout.position.z, 10);
    });

    describe('delta clamping', () => {
        it('clamps delta > 0.1 to 0.1', () => {
            const cfg = BIRD_TYPES.sparrow;

            // Run with delta = 0.1 (the max)
            const stateClamped = createPhysicsState(cfg);
            stateClamped.velocity.set(0.1, 0, 0.1);
            stateClamped.position.set(0, 10, 0);
            updatePhysics({ forward: true }, stateClamped, cfg, undefined, 0.1);

            // Run with delta = 0.5 (should be clamped to 0.1)
            const stateOver = createPhysicsState(cfg);
            stateOver.velocity.set(0.1, 0, 0.1);
            stateOver.position.set(0, 10, 0);
            updatePhysics({ forward: true }, stateOver, cfg, undefined, 0.5);

            // Both should produce identical results since 0.5 gets clamped to 0.1
            expect(stateOver.position.x).toBeCloseTo(stateClamped.position.x, 10);
            expect(stateOver.position.y).toBeCloseTo(stateClamped.position.y, 10);
            expect(stateOver.position.z).toBeCloseTo(stateClamped.position.z, 10);
        });

        it('uses 1/60 fallback when delta <= 0', () => {
            const cfg = BIRD_TYPES.sparrow;

            const stateDefault = createPhysicsState(cfg);
            stateDefault.velocity.set(0.1, 0, 0.1);
            stateDefault.position.set(0, 10, 0);
            updatePhysics({}, stateDefault, cfg, undefined, DELTA_60FPS);

            const stateNegative = createPhysicsState(cfg);
            stateNegative.velocity.set(0.1, 0, 0.1);
            stateNegative.position.set(0, 10, 0);
            updatePhysics({}, stateNegative, cfg, undefined, -0.01);

            expect(stateNegative.position.x).toBeCloseTo(stateDefault.position.x, 10);
            expect(stateNegative.position.y).toBeCloseTo(stateDefault.position.y, 10);
            expect(stateNegative.position.z).toBeCloseTo(stateDefault.position.z, 10);
        });

        it('uses 1/60 fallback when delta is NaN', () => {
            const cfg = BIRD_TYPES.sparrow;

            const stateDefault = createPhysicsState(cfg);
            stateDefault.velocity.set(0.1, 0, 0.1);
            stateDefault.position.set(0, 10, 0);
            updatePhysics({}, stateDefault, cfg, undefined, DELTA_60FPS);

            const stateNaN = createPhysicsState(cfg);
            stateNaN.velocity.set(0.1, 0, 0.1);
            stateNaN.position.set(0, 10, 0);
            updatePhysics({}, stateNaN, cfg, undefined, NaN);

            expect(stateNaN.position.x).toBeCloseTo(stateDefault.position.x, 10);
            expect(stateNaN.position.y).toBeCloseTo(stateDefault.position.y, 10);
            expect(stateNaN.position.z).toBeCloseTo(stateDefault.position.z, 10);
        });
    });

    describe('gravity with dt scaling', () => {
        it('applies gravity scaled by dt each frame', () => {
            const cfg = BIRD_TYPES.sparrow;
            const state = createPhysicsState(cfg);
            state.velocity.set(0, 0, 0);
            state.position.set(0, 50, 0);

            updatePhysics({}, state, cfg, undefined, DELTA_60FPS);

            // dt = safeDelta * 60 = (1/60)*60 = 1.0
            // Gravity applied: velocity.y -= GRAVITY * gravityScale * dt
            // For sparrow, gravityScale defaults to 1
            // After one frame: velocity.y should be approximately -GRAVITY
            const gravityScale = cfg.gravityScale ?? 1;
            expect(state.velocity.y).toBeCloseTo(-GRAVITY * gravityScale, 4);
        });

        it('applies more gravity over larger dt', () => {
            const cfg = BIRD_TYPES.sparrow;

            // Small dt (120fps)
            const stateSmall = createPhysicsState(cfg);
            stateSmall.velocity.set(0, 0, 0);
            stateSmall.position.set(0, 50, 0);
            updatePhysics({}, stateSmall, cfg, undefined, 1 / 120);

            // Larger dt (30fps)
            const stateLarge = createPhysicsState(cfg);
            stateLarge.velocity.set(0, 0, 0);
            stateLarge.position.set(0, 50, 0);
            updatePhysics({}, stateLarge, cfg, undefined, 1 / 30);

            // The bird with larger dt should have fallen more (more negative velocity.y)
            expect(stateLarge.velocity.y).toBeLessThan(stateSmall.velocity.y);
        });
    });

    describe('air resistance convergence', () => {
        it('applies Math.pow(AIR_RESISTANCE, dt) damping to horizontal velocity', () => {
            const cfg = BIRD_TYPES.sparrow;
            const state = createPhysicsState(cfg);

            // Use a velocity within the baseMaxSpeed to avoid clamping
            const initialVx = cfg.baseMaxSpeed * 0.5;
            state.velocity.set(initialVx, 0, 0);
            state.position.set(0, 50, 0);
            // Set currentMaxSpeed high enough so clamping does not interfere
            state.currentMaxSpeed = cfg.maxSpeed;

            updatePhysics({}, state, cfg, undefined, DELTA_60FPS);

            // After one frame at dt=1.0, velocity.x should be damped by AIR_RESISTANCE^1.0
            const expectedDamping = Math.pow(AIR_RESISTANCE, 1.0); // dt = (1/60)*60 = 1
            expect(state.velocity.x).toBeCloseTo(initialVx * expectedDamping, 4);
        });

        it('produces stronger damping at higher dt', () => {
            const cfg = BIRD_TYPES.sparrow;

            // Small dt
            const stateSmall = createPhysicsState(cfg);
            stateSmall.velocity.set(1.0, 0, 0);
            stateSmall.position.set(0, 50, 0);
            updatePhysics({}, stateSmall, cfg, undefined, 1 / 120);

            // Larger dt
            const stateLarge = createPhysicsState(cfg);
            stateLarge.velocity.set(1.0, 0, 0);
            stateLarge.position.set(0, 50, 0);
            updatePhysics({}, stateLarge, cfg, undefined, 1 / 30);

            // Larger dt should have more damping (lower absolute velocity)
            expect(Math.abs(stateLarge.velocity.x)).toBeLessThan(Math.abs(stateSmall.velocity.x));
        });
    });

    describe('bounds clamping at high delta', () => {
        it('clamps position to ground at high delta', () => {
            const cfg = BIRD_TYPES.sparrow;
            const state = createPhysicsState(cfg);

            // Start near ground with downward velocity
            state.velocity.set(0, -5, 0);
            state.position.set(0, 3, 0);

            // Use maximum clamped delta (0.1s => dt=6)
            updatePhysics({}, state, cfg, undefined, 0.1);

            // Position should be clamped to ground (y >= 2)
            expect(state.position.y).toBeGreaterThanOrEqual(2);
        });

        it('clamps position to sky bound at high delta', () => {
            const cfg = BIRD_TYPES.sparrow;
            const state = createPhysicsState(cfg);

            // Start near sky with upward velocity
            state.velocity.set(0, 5, 0);
            state.position.set(0, 99, 0);

            updatePhysics({ up: true }, state, cfg, undefined, 0.1);

            // Position should be clamped to sky ceiling (y <= 100)
            expect(state.position.y).toBeLessThanOrEqual(100);
        });

        it('clamps horizontal position within bounds at high delta', () => {
            const cfg = BIRD_TYPES.sparrow;
            const state = createPhysicsState(cfg);

            // Start near edge with high velocity
            state.velocity.set(10, 0, 10);
            state.position.set(140, 50, 140);

            updatePhysics({ forward: true }, state, cfg, undefined, 0.1);

            // Position should be clamped within -150..150
            expect(state.position.x).toBeLessThanOrEqual(150);
            expect(state.position.z).toBeLessThanOrEqual(150);
            expect(state.position.x).toBeGreaterThanOrEqual(-150);
            expect(state.position.z).toBeGreaterThanOrEqual(-150);
        });
    });

    describe('penguin physics', () => {
        it('penguin cannot fly (canFly is false)', () => {
            const cfg = BIRD_TYPES.penguin;
            expect(cfg.canFly).toBe(false);
        });

        it('penguin jumps when on ground and up is pressed', () => {
            const cfg = BIRD_TYPES.penguin;
            const state = createPhysicsState(cfg);

            // Place penguin on ground
            state.position.set(0, 2, 0);
            state.velocity.set(0, 0, 0);

            updatePhysics({ up: true }, state, cfg, undefined, DELTA_60FPS);

            // Should have positive y velocity from jump
            expect(state.velocity.y).toBeGreaterThan(0);
            expect(state.isJumping).toBe(true);
        });

        it('penguin experiences stronger gravity (1.5x)', () => {
            const cfg = BIRD_TYPES.penguin;
            const state = createPhysicsState(cfg);
            state.position.set(0, 50, 0);
            state.velocity.set(0, 0, 0);

            updatePhysics({}, state, cfg, undefined, DELTA_60FPS);

            // Penguin gravity: GRAVITY * 1.5 * dt (dt=1)
            // Vertical velocity also gets clamped, but after 1 frame it should be -GRAVITY*1.5
            expect(state.velocity.y).toBeCloseTo(-GRAVITY * 1.5, 4);
        });

        it('penguin falls faster than a sparrow from same height', () => {
            const cfgPenguin = BIRD_TYPES.penguin;
            const cfgSparrow = BIRD_TYPES.sparrow;

            const statePenguin = createPhysicsState(cfgPenguin);
            statePenguin.position.set(0, 50, 0);
            statePenguin.velocity.set(0, 0, 0);

            const stateSparrow = createPhysicsState(cfgSparrow);
            stateSparrow.position.set(0, 50, 0);
            stateSparrow.velocity.set(0, 0, 0);

            // Simulate several frames
            for (let i = 0; i < 10; i++) {
                updatePhysics({}, statePenguin, cfgPenguin, undefined, DELTA_60FPS);
                updatePhysics({}, stateSparrow, cfgSparrow, undefined, DELTA_60FPS);
            }

            // Penguin should be lower (fallen further)
            expect(statePenguin.position.y).toBeLessThan(stateSparrow.position.y);
        });

        it('penguin waddles when moving on ground', () => {
            const cfg = BIRD_TYPES.penguin;
            const state = createPhysicsState(cfg);

            // Place penguin on ground with forward velocity
            state.position.set(0, 2, 0);
            state.velocity.set(0, 0, 0.1);
            state.horizontalSpeed = 0.1;

            updatePhysics({ forward: true }, state, cfg, undefined, DELTA_60FPS);

            expect(state.isWaddling).toBe(true);
        });

        it('penguin gravity scales correctly with dt', () => {
            const cfg = BIRD_TYPES.penguin;

            const stateSmall = createPhysicsState(cfg);
            stateSmall.position.set(0, 50, 0);
            stateSmall.velocity.set(0, 0, 0);
            updatePhysics({}, stateSmall, cfg, undefined, 1 / 120);

            const stateLarge = createPhysicsState(cfg);
            stateLarge.position.set(0, 50, 0);
            stateLarge.velocity.set(0, 0, 0);
            updatePhysics({}, stateLarge, cfg, undefined, 1 / 30);

            // Larger dt means more gravity applied
            expect(stateLarge.velocity.y).toBeLessThan(stateSmall.velocity.y);
        });
    });
});

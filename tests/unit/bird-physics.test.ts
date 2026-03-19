import { describe, it, expect } from 'vitest';

import { createPhysicsState, updatePhysics } from '../../public/js/bird/physics.ts';
import { BIRD_TYPES } from '../../public/js/bird/types.ts';

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
});

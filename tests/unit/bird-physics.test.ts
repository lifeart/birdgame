import { describe, it, expect } from 'vitest';

import { createPhysicsState, updatePhysics } from '../../public/js/bird/physics.ts';
import { BIRD_TYPES } from '../../public/js/bird/types.ts';

describe('bird physics', () => {
    it('owl gliding still loses altitude at max glide speed', () => {
        const cfg = BIRD_TYPES.owl;
        const state = createPhysicsState(cfg);

        state.currentMaxSpeed = cfg.maxSpeed;
        state.currentAcceleration = cfg.maxAcceleration;
        state.velocity.set(0, 0, cfg.maxSpeed);
        state.horizontalSpeed = cfg.maxSpeed;

        updatePhysics({}, state, cfg);

        expect(state.isGliding).toBe(true);
        expect(state.velocity.y).toBeLessThan(0);
    });
});

import { describe, it, expect } from 'vitest';
import { distance, distanceSquared, clamp, lerp } from '../../public/js/core/utils';

describe('utils', () => {
    describe('distanceSquared', () => {
        it('returns 0 for same point', () => {
            const point = { x: 5, y: 10, z: 15 };
            expect(distanceSquared(point, point)).toBe(0);
        });

        it('calculates squared distance correctly', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 3, y: 4, z: 0 };
            // 3^2 + 4^2 + 0^2 = 9 + 16 = 25
            expect(distanceSquared(a, b)).toBe(25);
        });

        it('handles negative coordinates', () => {
            const a = { x: -1, y: -1, z: -1 };
            const b = { x: 1, y: 1, z: 1 };
            // 2^2 + 2^2 + 2^2 = 4 + 4 + 4 = 12
            expect(distanceSquared(a, b)).toBe(12);
        });

        it('is commutative', () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: 5, z: 6 };
            expect(distanceSquared(a, b)).toBe(distanceSquared(b, a));
        });
    });

    describe('distance', () => {
        it('returns 0 for same point', () => {
            const point = { x: 5, y: 10, z: 15 };
            expect(distance(point, point)).toBe(0);
        });

        it('calculates distance correctly for 3-4-5 triangle', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 3, y: 4, z: 0 };
            expect(distance(a, b)).toBe(5);
        });

        it('calculates 3D distance correctly', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 1, y: 2, z: 2 };
            // sqrt(1 + 4 + 4) = sqrt(9) = 3
            expect(distance(a, b)).toBe(3);
        });

        it('handles large distances', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 100, y: 100, z: 100 };
            expect(distance(a, b)).toBeCloseTo(173.205, 2);
        });
    });

    describe('clamp', () => {
        it('returns value when within range', () => {
            expect(clamp(5, 0, 10)).toBe(5);
        });

        it('clamps to min when below range', () => {
            expect(clamp(-5, 0, 10)).toBe(0);
        });

        it('clamps to max when above range', () => {
            expect(clamp(15, 0, 10)).toBe(10);
        });

        it('handles equal min and max', () => {
            expect(clamp(5, 10, 10)).toBe(10);
        });

        it('works with negative ranges', () => {
            expect(clamp(-5, -10, -1)).toBe(-5);
            expect(clamp(-15, -10, -1)).toBe(-10);
            expect(clamp(5, -10, -1)).toBe(-1);
        });

        it('handles floating point values', () => {
            expect(clamp(0.5, 0, 1)).toBe(0.5);
            expect(clamp(1.5, 0, 1)).toBe(1);
            expect(clamp(-0.5, 0, 1)).toBe(0);
        });
    });

    describe('lerp', () => {
        it('returns start value when t=0', () => {
            expect(lerp(0, 100, 0)).toBe(0);
        });

        it('returns end value when t=1', () => {
            expect(lerp(0, 100, 1)).toBe(100);
        });

        it('returns midpoint when t=0.5', () => {
            expect(lerp(0, 100, 0.5)).toBe(50);
        });

        it('works with negative values', () => {
            expect(lerp(-100, 100, 0.5)).toBe(0);
            expect(lerp(-100, 100, 0)).toBe(-100);
            expect(lerp(-100, 100, 1)).toBe(100);
        });

        it('handles t values outside 0-1 range (extrapolation)', () => {
            expect(lerp(0, 100, -0.5)).toBe(-50);
            expect(lerp(0, 100, 1.5)).toBe(150);
        });

        it('handles same start and end', () => {
            expect(lerp(50, 50, 0.5)).toBe(50);
        });
    });
});

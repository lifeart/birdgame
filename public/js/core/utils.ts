// Core utility functions

interface Position3D {
    x: number;
    y: number;
    z: number;
}

/**
 * Calculate the squared distance between two 3D points.
 * Use this when you only need to compare distances (avoids sqrt).
 */
export function distanceSquared(a: Position3D, b: Position3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

/**
 * Calculate the distance between two 3D points.
 */
export function distance(a: Position3D, b: Position3D): number {
    return Math.sqrt(distanceSquared(a, b));
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

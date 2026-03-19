// Bird types and their characteristics - more realistic colors and details
// Initial speeds are 3x lower, increases with worms eaten

import * as THREE from 'three';

export interface BirdTypeConfig {
    name: string;
    baseMaxSpeed: number;
    maxSpeed: number;
    baseAcceleration: number;
    maxAcceleration: number;
    turnSpeed: number;
    size: number;
    liftPower: number;
    glideEfficiency: number;
    bodyColor: number;
    headColor: number;
    bellyColor: number;
    breastColor: number;
    wingColor: number;
    wingPatternColor: number;
    wingCovertsColor: number;
    tailColor: number;
    beakColor: number;
    eyeColor: number;
    irisColor: number;
    legColor: number;
    mantleColor: number;
    // Optional species-specific properties
    neckIridescent?: boolean;
    throatColor?: number;
    iridescent?: boolean;
    cheekColor?: number;
    canFly?: boolean;
    jumpPower?: number;
    gravityScale?: number;
    turnResponsiveness?: number;
    wingBeatSpeed?: number;
    glideWingAmplitude?: number;
    flapWingAmplitude?: number;
}

export type BirdTypeName = 'sparrow' | 'pigeon' | 'crow' | 'hummingbird' | 'penguin' | 'owl' | 'goose';

export const BIRD_TYPES: Record<BirdTypeName, BirdTypeConfig> = {
    sparrow: {
        name: 'Sparrow',
        baseMaxSpeed: 0.4,
        maxSpeed: 1.2,
        baseAcceleration: 0.027,
        maxAcceleration: 0.08,
        turnSpeed: 0.06,
        size: 1.8,
        liftPower: 0.15,
        glideEfficiency: 0.4,
        bodyColor: 0x8B6914,
        headColor: 0x654321,
        bellyColor: 0xD2B48C,
        breastColor: 0xC4A574,
        wingColor: 0x5C4033,
        wingPatternColor: 0xF5DEB3,
        wingCovertsColor: 0x6B4423,
        tailColor: 0x3D2914,
        beakColor: 0x2F2F2F,
        eyeColor: 0x1a1a1a,
        irisColor: 0x3D2914,
        legColor: 0xCD853F,
        mantleColor: 0x7B5B3A
    },
    pigeon: {
        name: 'Pigeon',
        baseMaxSpeed: 0.33,
        maxSpeed: 1.0,
        baseAcceleration: 0.02,
        maxAcceleration: 0.06,
        turnSpeed: 0.05,
        size: 2.4,
        liftPower: 0.12,
        glideEfficiency: 0.5,
        bodyColor: 0x696969,
        headColor: 0x4A6741,
        bellyColor: 0x808080,
        breastColor: 0x9370DB,
        wingColor: 0x505050,
        wingPatternColor: 0x2F2F2F,
        wingCovertsColor: 0x606060,
        tailColor: 0x404040,
        beakColor: 0x2F2F2F,
        eyeColor: 0xFF4500,
        irisColor: 0xFF6347,
        legColor: 0xDC143C,
        mantleColor: 0x556B2F,
        neckIridescent: true
    },
    crow: {
        name: 'Crow',
        baseMaxSpeed: 0.3,
        maxSpeed: 0.9,
        baseAcceleration: 0.017,
        maxAcceleration: 0.05,
        turnSpeed: 0.04,
        size: 3.0,
        liftPower: 0.1,
        glideEfficiency: 0.7,
        bodyColor: 0x0a0a0a,
        headColor: 0x151515,
        bellyColor: 0x1a1a1a,
        breastColor: 0x101010,
        wingColor: 0x050505,
        wingPatternColor: 0x202020,
        wingCovertsColor: 0x181818,
        tailColor: 0x0a0a0a,
        beakColor: 0x1a1a1a,
        eyeColor: 0x2F2F2F,
        irisColor: 0x1a1a1a,
        legColor: 0x1a1a1a,
        mantleColor: 0x0f0f0f
    },
    hummingbird: {
        name: 'Hummingbird',
        baseMaxSpeed: 0.45,
        maxSpeed: 1.4,
        baseAcceleration: 0.035,
        maxAcceleration: 0.10,
        turnSpeed: 0.1,
        size: 1.2,
        liftPower: 0.20,
        glideEfficiency: 0.2,
        bodyColor: 0x228B22,
        headColor: 0x006400,
        bellyColor: 0xF0F0F0,
        breastColor: 0xE8E8E8,
        wingColor: 0x87CEEB,
        wingPatternColor: 0x00CED1,
        wingCovertsColor: 0x32CD32,
        tailColor: 0x2E8B57,
        beakColor: 0x1a1a1a,
        eyeColor: 0x1a1a1a,
        irisColor: 0x2F2F2F,
        legColor: 0x2F4F4F,
        mantleColor: 0x3CB371,
        throatColor: 0xFF1493,
        iridescent: true
    },
    penguin: {
        name: 'Penguin',
        baseMaxSpeed: 0.25,
        maxSpeed: 0.5,
        baseAcceleration: 0.015,
        maxAcceleration: 0.03,
        turnSpeed: 0.08,
        size: 2.8,
        liftPower: 0.0,
        glideEfficiency: 0.0,
        jumpPower: 0.12,
        canFly: false,
        bodyColor: 0x1a1a1a,
        headColor: 0x0a0a0a,
        bellyColor: 0xFFFFF0,
        breastColor: 0xFFFAFA,
        wingColor: 0x1a1a1a,
        wingPatternColor: 0x2a2a2a,
        wingCovertsColor: 0x151515,
        tailColor: 0x1a1a1a,
        beakColor: 0xFF6B00,
        eyeColor: 0x1a1a1a,
        irisColor: 0x3D2914,
        legColor: 0xFF6B00,
        mantleColor: 0x0a0a0a,
        cheekColor: 0xFFD700
    },
    owl: {
        name: 'Owl',
        baseMaxSpeed: 0.31,
        maxSpeed: 0.92,
        baseAcceleration: 0.018,
        maxAcceleration: 0.052,
        turnSpeed: 0.065,
        size: 2.9,
        liftPower: 0.15,
        glideEfficiency: 0.18,
        gravityScale: 0.9,
        turnResponsiveness: 0.055,
        wingBeatSpeed: 0.18,
        glideWingAmplitude: 0.06,
        flapWingAmplitude: 0.58,
        bodyColor: 0x7A6A58,
        headColor: 0x6B5A4A,
        bellyColor: 0xD8C7A6,
        breastColor: 0xC9B28F,
        wingColor: 0x5A4A3B,
        wingPatternColor: 0x3F342B,
        wingCovertsColor: 0x725E4B,
        tailColor: 0x4A3B2F,
        beakColor: 0xC9A44F,
        eyeColor: 0xF4C95D,
        irisColor: 0xF4A300,
        legColor: 0xB78A4A,
        mantleColor: 0x5C4C3D
    },
    goose: {
        name: 'Goose',
        baseMaxSpeed: 0.34,
        maxSpeed: 1.0,
        baseAcceleration: 0.016,
        maxAcceleration: 0.048,
        turnSpeed: 0.032,
        size: 3.2,
        liftPower: 0.12,
        glideEfficiency: 0.55,
        gravityScale: 1.1,
        turnResponsiveness: 0.04,
        wingBeatSpeed: 0.16,
        glideWingAmplitude: 0.1,
        flapWingAmplitude: 0.62,
        bodyColor: 0xDCDCD4,
        headColor: 0x324734,
        bellyColor: 0xF4F3ED,
        breastColor: 0xE8E6DE,
        wingColor: 0xC8C7BD,
        wingPatternColor: 0xB8B7AC,
        wingCovertsColor: 0xAFAE9F,
        tailColor: 0x9A998B,
        beakColor: 0xF2A33A,
        eyeColor: 0x1a1a1a,
        irisColor: 0x4A2F1A,
        legColor: 0xE8892D,
        mantleColor: 0xC0BFB4
    }
};

// Physics constants
export const GRAVITY = 0.004;
export const AIR_RESISTANCE = 0.985;
export const ROTATION_DAMPING = 0.85;

// Input interface for bird update (GTA-style: camera-relative movement)
export interface BirdInput {
    left?: boolean | number;     // Strafe left (camera-relative)
    right?: boolean | number;    // Strafe right (camera-relative)
    forward?: boolean | number;  // Move forward (camera-relative)
    backward?: boolean | number; // Move backward (camera-relative)
    up?: boolean | number;       // Ascend/flap
    down?: boolean | number;     // Descend
    // Legacy fields - kept for interface compatibility but unused
    turnRate?: number;
    mouseDeltaX?: number;
    mouseDeltaY?: number;
    isTouch?: boolean;
}

// Sound recipe configurations for the AudioManager
// These define the parameters for synthesized sounds

/**
 * Oscillator configuration
 */
export interface OscillatorConfig {
    type: OscillatorType;
    frequency: number;
    frequencyRamp?: { value: number; time: number }[];
    detune?: number;
}

/**
 * Gain envelope configuration
 */
export interface GainEnvelope {
    initial: number;
    attack?: { value: number; time: number };
    sustain?: { value: number; time: number };
    release: { value: number; time: number };
}

/**
 * Filter configuration
 */
export interface FilterConfig {
    type: BiquadFilterType;
    frequency: number;
    Q?: number;
}

/**
 * Noise configuration for impact sounds
 */
export interface NoiseConfig {
    duration: number;
    decayPower?: number;
    amplitude?: number;
    filter?: FilterConfig;
}

/**
 * Sound recipe structure
 */
export interface SoundRecipe {
    name: string;
    duration: number;
    oscillators?: Array<OscillatorConfig & { gain: GainEnvelope; delay?: number }>;
    noise?: NoiseConfig & { gain: GainEnvelope };
}

// ============================================
// COLLECTION SOUNDS
// ============================================

export const WORM_COLLECT_RECIPE: SoundRecipe = {
    name: 'wormCollect',
    duration: 0.25,
    oscillators: [
        {
            type: 'sine',
            frequency: 600,
            frequencyRamp: [
                { value: 1200, time: 0.05 },
                { value: 400, time: 0.15 }
            ],
            gain: {
                initial: 0.5,
                release: { value: 0.01, time: 0.2 }
            }
        },
        {
            type: 'triangle',
            frequency: 300,
            frequencyRamp: [
                { value: 800, time: 0.05 },
                { value: 200, time: 0.12 }
            ],
            gain: {
                initial: 0.3,
                release: { value: 0.01, time: 0.15 }
            }
        },
        {
            type: 'sine',
            frequency: 150,
            gain: {
                initial: 0.25,
                release: { value: 0.01, time: 0.18 }
            }
        }
    ]
};

export const FLY_COLLECT_RECIPE: SoundRecipe = {
    name: 'flyCollect',
    duration: 0.3,
    oscillators: [
        {
            type: 'square',
            frequency: 800,
            frequencyRamp: [
                { value: 1600, time: 0.03 },
                { value: 600, time: 0.1 }
            ],
            gain: {
                initial: 0.25,
                release: { value: 0.01, time: 0.15 }
            }
        },
        {
            type: 'sine',
            frequency: 1200,
            frequencyRamp: [{ value: 400, time: 0.2 }],
            gain: {
                initial: 0.35,
                release: { value: 0.01, time: 0.25 }
            }
        }
    ]
};

export const GOLDEN_WORM_RECIPE: SoundRecipe = {
    name: 'goldenWorm',
    duration: 0.6,
    oscillators: [
        {
            type: 'sine',
            frequency: 880,
            frequencyRamp: [
                { value: 1320, time: 0.1 },
                { value: 1760, time: 0.2 }
            ],
            gain: {
                initial: 0.4,
                release: { value: 0.01, time: 0.5 }
            }
        }
    ]
};

// ============================================
// COLLISION SOUNDS
// ============================================

export const BUILDING_HIT_RECIPE: SoundRecipe = {
    name: 'buildingHit',
    duration: 0.3,
    oscillators: [
        {
            type: 'sine',
            frequency: 80,
            frequencyRamp: [{ value: 40, time: 0.2 }],
            gain: {
                initial: 0.6,
                release: { value: 0.01, time: 0.25 }
            }
        }
    ],
    noise: {
        duration: 0.08,
        amplitude: 0.8,
        filter: { type: 'lowpass', frequency: 600 },
        gain: {
            initial: 0.4,
            release: { value: 0.01, time: 0.08 }
        }
    }
};

export const TREE_HIT_RECIPE: SoundRecipe = {
    name: 'treeHit',
    duration: 0.4,
    oscillators: [
        {
            type: 'triangle',
            frequency: 200,
            frequencyRamp: [{ value: 80, time: 0.1 }],
            gain: {
                initial: 0.5,
                release: { value: 0.01, time: 0.15 }
            }
        },
        {
            type: 'sine',
            frequency: 400,
            frequencyRamp: [{ value: 150, time: 0.08 }],
            gain: {
                initial: 0.3,
                release: { value: 0.01, time: 0.1 }
            }
        }
    ],
    noise: {
        duration: 0.3,
        decayPower: 0.5,
        amplitude: 0.3,
        filter: { type: 'highpass', frequency: 2000 },
        gain: {
            initial: 0,
            attack: { value: 0.25, time: 0.05 },
            release: { value: 0.01, time: 0.35 }
        }
    }
};

export const METAL_HIT_RECIPE: SoundRecipe = {
    name: 'metalHit',
    duration: 0.6,
    oscillators: [
        {
            type: 'square',
            frequency: 800,
            frequencyRamp: [{ value: 600, time: 0.3 }],
            gain: {
                initial: 0.15,
                release: { value: 0.01, time: 0.4 }
            }
        },
        {
            type: 'sine',
            frequency: 1200,
            gain: {
                initial: 0.3,
                release: { value: 0.01, time: 0.5 }
            }
        },
        {
            type: 'sine',
            frequency: 2400,
            gain: {
                initial: 0.15,
                release: { value: 0.01, time: 0.3 }
            }
        }
    ]
};

export const STONE_HIT_RECIPE: SoundRecipe = {
    name: 'stoneHit',
    duration: 0.25,
    oscillators: [
        {
            type: 'sine',
            frequency: 100,
            frequencyRamp: [{ value: 50, time: 0.15 }],
            gain: {
                initial: 0.6,
                release: { value: 0.01, time: 0.2 }
            }
        },
        {
            type: 'sawtooth',
            frequency: 300,
            frequencyRamp: [{ value: 100, time: 0.05 }],
            gain: {
                initial: 0.25,
                release: { value: 0.01, time: 0.06 }
            }
        }
    ],
    noise: {
        duration: 0.1,
        decayPower: 2,
        filter: { type: 'bandpass', frequency: 1500, Q: 1 },
        gain: {
            initial: 0.35,
            release: { value: 0.01, time: 0.12 }
        }
    }
};

export const WOOD_HIT_RECIPE: SoundRecipe = {
    name: 'woodHit',
    duration: 0.25,
    oscillators: [
        {
            type: 'triangle',
            frequency: 250,
            frequencyRamp: [{ value: 100, time: 0.1 }],
            gain: {
                initial: 0.5,
                release: { value: 0.01, time: 0.15 }
            }
        },
        {
            type: 'sine',
            frequency: 180,
            frequencyRamp: [{ value: 120, time: 0.15 }],
            gain: {
                initial: 0.35,
                release: { value: 0.01, time: 0.2 }
            }
        },
        {
            type: 'sawtooth',
            frequency: 60,
            delay: 0.05,
            gain: {
                initial: 0.1,
                release: { value: 0.01, time: 0.18 }
            }
        }
    ]
};

// ============================================
// UI/FEEDBACK SOUNDS
// ============================================

export const PLAYER_JOINED_NOTES = [523, 659, 784] as const; // C5, E5, G5
export const PLAYER_LEFT_NOTES = [392, 349, 294] as const; // G4, F4, D4

export const GAME_START_MELODY = [
    { freq: 523, time: 0, dur: 0.1 },
    { freq: 659, time: 0.1, dur: 0.1 },
    { freq: 784, time: 0.2, dur: 0.1 },
    { freq: 1047, time: 0.35, dur: 0.25 }
] as const;

export const LEVEL_UP_MELODY = [
    { freq: 523, time: 0, dur: 0.15 },
    { freq: 659, time: 0.15, dur: 0.15 },
    { freq: 784, time: 0.3, dur: 0.15 },
    { freq: 1047, time: 0.45, dur: 0.3 },
    { freq: 1319, time: 0.75, dur: 0.4 }
] as const;

// ============================================
// ALL RECIPES MAP
// ============================================

export const SOUND_RECIPES = {
    wormCollect: WORM_COLLECT_RECIPE,
    flyCollect: FLY_COLLECT_RECIPE,
    goldenWorm: GOLDEN_WORM_RECIPE,
    buildingHit: BUILDING_HIT_RECIPE,
    treeHit: TREE_HIT_RECIPE,
    metalHit: METAL_HIT_RECIPE,
    stoneHit: STONE_HIT_RECIPE,
    woodHit: WOOD_HIT_RECIPE
} as const;

export type SoundName = keyof typeof SOUND_RECIPES;

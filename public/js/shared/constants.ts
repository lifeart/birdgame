// Shared constants - TypeScript version for client

// Game locations
export const LOCATIONS = ['city', 'park', 'village', 'beach', 'mountain'] as const;
export type LocationName = typeof LOCATIONS[number];

// Valid bird types
export const VALID_BIRDS = ['sparrow', 'pigeon', 'crow', 'hummingbird', 'penguin', 'owl', 'goose'] as const;
export type BirdName = typeof VALID_BIRDS[number];

// Entity spawn settings
export const WORMS_PER_LOCATION = 20;
export const MIN_WORMS_BEFORE_RESPAWN = 15;
export const WORM_RESPAWN_INTERVAL_MS = 5000;

export const FLIES_PER_LOCATION_MIN = 8;
export const FLIES_PER_LOCATION_MAX = 12;
export const MIN_FLIES_BEFORE_RESPAWN = 6;
export const FLY_RESPAWN_INTERVAL_MS = 10000;
export const FLY_HEIGHT_MIN = 8;
export const FLY_HEIGHT_MAX = 23;

// Points
export const WORM_POINTS = 1;
export const FLY_POINTS = 4;
export const GOLDEN_WORM_POINTS = 10;

// Golden worm timing
export const GOLDEN_WORM_SPAWN_INTERVAL_MS = 300000; // 5 minutes
export const GOLDEN_WORM_DURATION_MS = 60000; // 1 minute to catch
export const GOLDEN_WORM_CHECK_INTERVAL_MS = 30000;

// World bounds
export const WORLD_SIZE = 200;
export const SPAWN_HEIGHT = 10;

// Leaderboard
export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_DEBOUNCE_MS = 1000;

// Input validation
export const MAX_NAME_LENGTH = 20;
export const MAX_CHAT_LENGTH = 200;

// Name generator words
export const NAME_ADJECTIVES = [
    'Swift', 'Brave', 'Mighty', 'Sneaky', 'Happy', 'Lucky', 'Wild', 'Crazy',
    'Flying', 'Speedy', 'Fluffy', 'Tiny', 'Giant', 'Golden', 'Silver', 'Royal',
    'Cosmic', 'Thunder', 'Storm', 'Fire', 'Ice', 'Shadow', 'Sunny', 'Starry',
    'Noble', 'Fierce', 'Gentle', 'Mystic', 'Ancient', 'Young', 'Bold', 'Shy'
] as const;

export const NAME_NOUNS = [
    'Bird', 'Eagle', 'Hawk', 'Falcon', 'Owl', 'Robin', 'Sparrow', 'Finch',
    'Wing', 'Feather', 'Talon', 'Beak', 'Nest', 'Sky', 'Cloud', 'Wind',
    'Flyer', 'Glider', 'Swooper', 'Hunter', 'Seeker', 'Watcher', 'Dancer', 'Singer',
    'Pilot', 'Ace', 'Captain', 'Chief', 'Hero', 'Legend', 'Star', 'Champ'
] as const;

export function generateRandomName(): string {
    const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
    const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
}

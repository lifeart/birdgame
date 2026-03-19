// Shared constants between server and client

// Game locations
const LOCATIONS = ['city', 'park', 'village', 'beach', 'mountain'];

// Valid bird types
const VALID_BIRDS = ['sparrow', 'pigeon', 'crow', 'hummingbird', 'penguin', 'owl', 'goose'];

// Entity spawn settings
const WORMS_PER_LOCATION = 20;
const MIN_WORMS_BEFORE_RESPAWN = 15;
const WORM_RESPAWN_INTERVAL_MS = 5000;

const FLIES_PER_LOCATION_MIN = 3;
const FLIES_PER_LOCATION_MAX = 5;
const MIN_FLIES_BEFORE_RESPAWN = 3;
const FLY_RESPAWN_INTERVAL_MS = 10000;
const FLY_HEIGHT_MIN = 8;
const FLY_HEIGHT_MAX = 23;

// Points
const WORM_POINTS = 1;
const FLY_POINTS = 2;
const GOLDEN_WORM_POINTS = 10;

// Golden worm timing
const GOLDEN_WORM_SPAWN_INTERVAL_MS = 300000; // 5 minutes
const GOLDEN_WORM_DURATION_MS = 60000; // 1 minute to catch
const GOLDEN_WORM_CHECK_INTERVAL_MS = 30000;

// World bounds
const WORLD_SIZE = 200;
const SPAWN_HEIGHT = 10;

// Leaderboard
const LEADERBOARD_SIZE = 10;
const LEADERBOARD_DEBOUNCE_MS = 1000;

// Profile cleanup
const PROFILE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const PROFILE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Input validation
const MAX_NAME_LENGTH = 20;
const MAX_CHAT_LENGTH = 200;

// Name generator words
const NAME_ADJECTIVES = [
    'Swift', 'Brave', 'Mighty', 'Sneaky', 'Happy', 'Lucky', 'Wild', 'Crazy',
    'Flying', 'Speedy', 'Fluffy', 'Tiny', 'Giant', 'Golden', 'Silver', 'Royal',
    'Cosmic', 'Thunder', 'Storm', 'Fire', 'Ice', 'Shadow', 'Sunny', 'Starry',
    'Noble', 'Fierce', 'Gentle', 'Mystic', 'Ancient', 'Young', 'Bold', 'Shy'
];

const NAME_NOUNS = [
    'Bird', 'Eagle', 'Hawk', 'Falcon', 'Owl', 'Robin', 'Sparrow', 'Finch',
    'Wing', 'Feather', 'Talon', 'Beak', 'Nest', 'Sky', 'Cloud', 'Wind',
    'Flyer', 'Glider', 'Swooper', 'Hunter', 'Seeker', 'Watcher', 'Dancer', 'Singer',
    'Pilot', 'Ace', 'Captain', 'Chief', 'Hero', 'Legend', 'Star', 'Champ'
];

function generateRandomName() {
    const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
    const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
}

// Export for CommonJS (Node.js server)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LOCATIONS,
        VALID_BIRDS,
        WORMS_PER_LOCATION,
        MIN_WORMS_BEFORE_RESPAWN,
        WORM_RESPAWN_INTERVAL_MS,
        FLIES_PER_LOCATION_MIN,
        FLIES_PER_LOCATION_MAX,
        MIN_FLIES_BEFORE_RESPAWN,
        FLY_RESPAWN_INTERVAL_MS,
        FLY_HEIGHT_MIN,
        FLY_HEIGHT_MAX,
        WORM_POINTS,
        FLY_POINTS,
        GOLDEN_WORM_POINTS,
        GOLDEN_WORM_SPAWN_INTERVAL_MS,
        GOLDEN_WORM_DURATION_MS,
        GOLDEN_WORM_CHECK_INTERVAL_MS,
        WORLD_SIZE,
        SPAWN_HEIGHT,
        LEADERBOARD_SIZE,
        LEADERBOARD_DEBOUNCE_MS,
        PROFILE_EXPIRY_MS,
        PROFILE_CLEANUP_INTERVAL_MS,
        MAX_NAME_LENGTH,
        MAX_CHAT_LENGTH,
        NAME_ADJECTIVES,
        NAME_NOUNS,
        generateRandomName
    };
}

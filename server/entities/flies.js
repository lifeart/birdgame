// Fly entity management
const {
    FLIES_PER_LOCATION_MIN,
    FLIES_PER_LOCATION_MAX,
    MIN_FLIES_BEFORE_RESPAWN,
    FLY_RESPAWN_INTERVAL_MS,
    FLY_HEIGHT_MIN,
    FLY_HEIGHT_MAX,
    FLY_POINTS,
    WORLD_SIZE,
    LOCATIONS
} = require('../../shared/constants.js');

/**
 * Create a fly manager
 * @param {Function} broadcastFn - Function to broadcast to a location
 */
function createFlyManager(broadcastFn) {
    const flies = new Map(); // location -> fly[]
    let flyIdCounter = 0;

    /**
     * Initialize flies for all locations
     */
    function initialize() {
        LOCATIONS.forEach(location => {
            const locationFlies = [];
            const flyCount = FLIES_PER_LOCATION_MIN +
                Math.floor(Math.random() * (FLIES_PER_LOCATION_MAX - FLIES_PER_LOCATION_MIN + 1));

            for (let i = 0; i < flyCount; i++) {
                locationFlies.push({
                    id: flyIdCounter++,
                    x: (Math.random() - 0.5) * (WORLD_SIZE - 20),
                    y: FLY_HEIGHT_MIN + Math.random() * (FLY_HEIGHT_MAX - FLY_HEIGHT_MIN),
                    z: (Math.random() - 0.5) * (WORLD_SIZE - 20),
                    collected: false
                });
            }
            flies.set(location, locationFlies);
        });
    }

    /**
     * Get active flies for a location
     */
    function getActiveFlies(location) {
        const locationFlies = flies.get(location) || [];
        return locationFlies.filter(f => !f.collected);
    }

    /**
     * Collect a fly
     * @returns {Object|null} The collected fly and points, or null
     */
    function collectFly(location, flyId) {
        const locationFlies = flies.get(location);
        const fly = locationFlies?.find(f => f.id === flyId && !f.collected);
        if (fly) {
            fly.collected = true;
            return { fly, points: FLY_POINTS };
        }
        return null;
    }

    /**
     * Start periodic fly respawning
     */
    function startRespawnLoop() {
        setInterval(() => {
            LOCATIONS.forEach(location => {
                const locationFlies = flies.get(location);
                const activeFlies = locationFlies.filter(f => !f.collected);

                if (activeFlies.length < MIN_FLIES_BEFORE_RESPAWN) {
                    const newFly = {
                        id: flyIdCounter++,
                        x: (Math.random() - 0.5) * (WORLD_SIZE - 20),
                        y: FLY_HEIGHT_MIN + Math.random() * (FLY_HEIGHT_MAX - FLY_HEIGHT_MIN),
                        z: (Math.random() - 0.5) * (WORLD_SIZE - 20),
                        collected: false
                    };
                    locationFlies.push(newFly);

                    broadcastFn({
                        type: 'fly_spawned',
                        fly: newFly,
                        location: location
                    }, location);
                }
            });
        }, FLY_RESPAWN_INTERVAL_MS);
    }

    return {
        initialize,
        getActiveFlies,
        collectFly,
        startRespawnLoop
    };
}

module.exports = {
    createFlyManager
};

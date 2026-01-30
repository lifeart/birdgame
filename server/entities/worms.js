// Worm entity management
const {
    WORMS_PER_LOCATION,
    MIN_WORMS_BEFORE_RESPAWN,
    WORM_RESPAWN_INTERVAL_MS,
    WORLD_SIZE,
    GOLDEN_WORM_POINTS,
    GOLDEN_WORM_SPAWN_INTERVAL_MS,
    GOLDEN_WORM_DURATION_MS,
    GOLDEN_WORM_CHECK_INTERVAL_MS,
    LOCATIONS
} = require('../../shared/constants.js');

/**
 * Create a worm manager
 * @param {Function} broadcastFn - Function to broadcast to a location
 */
function createWormManager(broadcastFn) {
    const worms = new Map(); // location -> worm[]
    const goldenWorms = new Map(); // location -> goldenWorm or null
    const lastGoldenWormSpawn = new Map(); // location -> timestamp
    let wormIdCounter = 0;

    /**
     * Initialize worms for all locations
     */
    function initialize() {
        LOCATIONS.forEach(location => {
            const locationWorms = [];
            for (let i = 0; i < WORMS_PER_LOCATION; i++) {
                locationWorms.push({
                    id: wormIdCounter++,
                    x: (Math.random() - 0.5) * WORLD_SIZE,
                    y: 0.5,
                    z: (Math.random() - 0.5) * WORLD_SIZE,
                    collected: false
                });
            }
            worms.set(location, locationWorms);
            goldenWorms.set(location, null);
            lastGoldenWormSpawn.set(location, 0);
        });
    }

    /**
     * Get active worms for a location (including golden worm)
     */
    function getActiveWorms(location) {
        const locationWorms = worms.get(location) || [];
        const activeWorms = locationWorms.filter(w => !w.collected);
        const goldenWorm = goldenWorms.get(location);
        if (goldenWorm && !goldenWorm.collected) {
            activeWorms.push(goldenWorm);
        }
        return activeWorms;
    }

    /**
     * Collect a worm
     * @returns {Object|null} The collected worm and points, or null
     */
    function collectWorm(location, wormId, isGolden) {
        if (isGolden) {
            const goldenWorm = goldenWorms.get(location);
            if (goldenWorm && goldenWorm.id === wormId && !goldenWorm.collected) {
                goldenWorm.collected = true;
                goldenWorms.set(location, null);
                return { worm: goldenWorm, points: GOLDEN_WORM_POINTS };
            }
        } else {
            const locationWorms = worms.get(location);
            const worm = locationWorms?.find(w => w.id === wormId && !w.collected);
            if (worm) {
                worm.collected = true;
                return { worm, points: 1 };
            }
        }
        return null;
    }

    /**
     * Spawn golden worm in a location
     */
    function spawnGoldenWorm(location) {
        const goldenWorm = {
            id: 'golden_' + wormIdCounter++,
            x: (Math.random() - 0.5) * (WORLD_SIZE - 20),
            y: 0.5,
            z: (Math.random() - 0.5) * (WORLD_SIZE - 20),
            isGolden: true,
            spawnTime: Date.now(),
            collected: false
        };
        goldenWorms.set(location, goldenWorm);
        lastGoldenWormSpawn.set(location, Date.now());

        broadcastFn({
            type: 'worm_spawned',
            worm: goldenWorm,
            location: location
        }, location);

        console.log(`Golden Worm spawned in ${location}!`);
        return goldenWorm;
    }

    /**
     * Check and remove expired golden worm
     */
    function checkGoldenWormExpiry(location) {
        const goldenWorm = goldenWorms.get(location);
        if (goldenWorm && !goldenWorm.collected) {
            if (Date.now() - goldenWorm.spawnTime > GOLDEN_WORM_DURATION_MS) {
                goldenWorms.set(location, null);
                console.log(`Golden Worm expired in ${location}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Start periodic worm respawning
     */
    function startRespawnLoop() {
        setInterval(() => {
            LOCATIONS.forEach(location => {
                const locationWorms = worms.get(location);
                const activeWorms = locationWorms.filter(w => !w.collected);
                if (activeWorms.length < MIN_WORMS_BEFORE_RESPAWN) {
                    const newWorm = {
                        id: wormIdCounter++,
                        x: (Math.random() - 0.5) * WORLD_SIZE,
                        y: 0.5,
                        z: (Math.random() - 0.5) * WORLD_SIZE,
                        collected: false
                    };
                    locationWorms.push(newWorm);

                    broadcastFn({
                        type: 'worm_spawned',
                        worm: newWorm,
                        location: location
                    }, location);
                }
            });
        }, WORM_RESPAWN_INTERVAL_MS);
    }

    /**
     * Start golden worm spawn check loop
     * @param {Function} getPlayersInLocation - Function to check if players are in location
     */
    function startGoldenWormLoop(getPlayersInLocation) {
        setInterval(() => {
            LOCATIONS.forEach(location => {
                checkGoldenWormExpiry(location);

                const currentGolden = goldenWorms.get(location);
                const lastSpawn = lastGoldenWormSpawn.get(location) || 0;
                const timeSinceLastSpawn = Date.now() - lastSpawn;

                if (!currentGolden && timeSinceLastSpawn >= GOLDEN_WORM_SPAWN_INTERVAL_MS) {
                    if (getPlayersInLocation(location).length > 0) {
                        spawnGoldenWorm(location);
                    }
                }
            });
        }, GOLDEN_WORM_CHECK_INTERVAL_MS);
    }

    return {
        initialize,
        getActiveWorms,
        collectWorm,
        spawnGoldenWorm,
        checkGoldenWormExpiry,
        startRespawnLoop,
        startGoldenWormLoop
    };
}

module.exports = {
    createWormManager
};

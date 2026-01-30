// Player management
const {
    PROFILE_EXPIRY_MS,
    PROFILE_CLEANUP_INTERVAL_MS
} = require('../shared/constants.js');

/**
 * Create a player manager
 * @param {Map} players - Map of ws -> player
 * @param {Map} playersByLocation - Map of location -> Set<ws>
 * @param {Map} playerProfiles - Map of normalized name -> profile
 */
function createPlayerManager(players, playersByLocation, playerProfiles) {
    let playerIdCounter = 0;

    /**
     * Normalize player name for matching (case-insensitive, trimmed)
     */
    function normalizeName(name) {
        return (name || '').trim().toLowerCase();
    }

    /**
     * Check if name is currently in use by another active player
     */
    function isNameInUse(name, excludeWs = null) {
        const normalizedName = normalizeName(name);
        for (const [ws, player] of players) {
            if (ws !== excludeWs && normalizeName(player.name) === normalizedName) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get or create player profile
     */
    function getOrCreateProfile(name, bird) {
        const normalizedName = normalizeName(name);
        if (playerProfiles.has(normalizedName)) {
            const profile = playerProfiles.get(normalizedName);
            profile.lastSeen = Date.now();
            profile.bird = bird;
            return profile;
        }

        const profile = {
            name: name,
            totalScore: 0,
            lastSeen: Date.now(),
            bird: bird
        };
        playerProfiles.set(normalizedName, profile);
        return profile;
    }

    /**
     * Update profile score
     */
    function updateProfileScore(name, score) {
        const normalizedName = normalizeName(name);
        const profile = playerProfiles.get(normalizedName);
        if (profile) {
            profile.totalScore = Math.max(profile.totalScore, score);
            profile.lastSeen = Date.now();
        }
    }

    /**
     * Add player to location index
     */
    function addPlayerToLocation(ws, location) {
        const locationSet = playersByLocation.get(location);
        if (locationSet) locationSet.add(ws);
    }

    /**
     * Remove player from location index
     */
    function removePlayerFromLocation(ws, location) {
        const locationSet = playersByLocation.get(location);
        if (locationSet) locationSet.delete(ws);
    }

    /**
     * Move player between locations
     */
    function movePlayerLocation(ws, oldLocation, newLocation) {
        removePlayerFromLocation(ws, oldLocation);
        addPlayerToLocation(ws, newLocation);
    }

    /**
     * Get next player ID
     */
    function getNextPlayerId() {
        return playerIdCounter++;
    }

    /**
     * Start periodic profile cleanup
     */
    function startProfileCleanup() {
        setInterval(() => {
            const expiryTime = Date.now() - PROFILE_EXPIRY_MS;
            for (const [name, profile] of playerProfiles) {
                if (profile.lastSeen < expiryTime) {
                    playerProfiles.delete(name);
                }
            }
        }, PROFILE_CLEANUP_INTERVAL_MS);
    }

    return {
        normalizeName,
        isNameInUse,
        getOrCreateProfile,
        updateProfileScore,
        addPlayerToLocation,
        removePlayerFromLocation,
        movePlayerLocation,
        getNextPlayerId,
        startProfileCleanup
    };
}

module.exports = {
    createPlayerManager
};

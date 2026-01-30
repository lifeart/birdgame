// Leaderboard management
const { LEADERBOARD_SIZE, LEADERBOARD_DEBOUNCE_MS } = require('../shared/constants.js');

/**
 * Create a leaderboard manager
 * @param {Map} playerProfiles - Map of normalized name -> profile
 * @param {Function} broadcastFn - Function to broadcast messages
 */
function createLeaderboardManager(playerProfiles, broadcastFn) {
    let leaderboardTimeout = null;
    let leaderboardDirty = false;

    /**
     * Get the current leaderboard (top players)
     */
    function getLeaderboard() {
        const allProfiles = Array.from(playerProfiles.values());
        return allProfiles
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, LEADERBOARD_SIZE)
            .map((p, index) => ({
                rank: index + 1,
                name: p.name,
                score: p.totalScore,
                bird: p.bird
            }));
    }

    /**
     * Schedule a debounced leaderboard broadcast
     */
    function broadcastLeaderboard() {
        leaderboardDirty = true;

        if (!leaderboardTimeout) {
            leaderboardTimeout = setTimeout(() => {
                if (leaderboardDirty) {
                    const leaderboard = getLeaderboard();
                    broadcastFn({ type: 'leaderboard', leaderboard });
                    leaderboardDirty = false;
                }
                leaderboardTimeout = null;
            }, LEADERBOARD_DEBOUNCE_MS);
        }
    }

    /**
     * Immediately broadcast leaderboard (bypasses debounce)
     */
    function broadcastLeaderboardImmediate() {
        if (leaderboardTimeout) {
            clearTimeout(leaderboardTimeout);
            leaderboardTimeout = null;
        }
        leaderboardDirty = false;

        const leaderboard = getLeaderboard();
        broadcastFn({ type: 'leaderboard', leaderboard });
    }

    return {
        getLeaderboard,
        broadcastLeaderboard,
        broadcastLeaderboardImmediate
    };
}

module.exports = {
    createLeaderboardManager
};

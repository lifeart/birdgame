// Broadcast utilities for WebSocket messaging

/**
 * Broadcast a message to players
 * @param {Map} players - Map of ws -> player
 * @param {Map} playersByLocation - Map of location -> Set<ws>
 * @param {Object} message - Message to broadcast
 * @param {string|null} targetLocation - Optional location filter
 */
function broadcast(players, playersByLocation, message, targetLocation = null) {
    const data = JSON.stringify(message);

    if (targetLocation) {
        // O(1) lookup using location index
        const locationPlayers = playersByLocation.get(targetLocation);
        if (locationPlayers) {
            locationPlayers.forEach(ws => {
                if (ws.readyState === 1) {
                    ws.send(data);
                }
            });
        }
    } else {
        // Broadcast to all players
        players.forEach((player, ws) => {
            if (ws.readyState === 1) {
                ws.send(data);
            }
        });
    }
}

/**
 * Broadcast a message to all players except one
 * @param {Map} players - Map of ws -> player
 * @param {Map} playersByLocation - Map of location -> Set<ws>
 * @param {Object} message - Message to broadcast
 * @param {WebSocket} excludeWs - WebSocket to exclude
 * @param {string|null} targetLocation - Optional location filter
 */
function broadcastExcept(players, playersByLocation, message, excludeWs, targetLocation = null) {
    const data = JSON.stringify(message);

    if (targetLocation) {
        // O(1) lookup using location index
        const locationPlayers = playersByLocation.get(targetLocation);
        if (locationPlayers) {
            locationPlayers.forEach(ws => {
                if (ws !== excludeWs && ws.readyState === 1) {
                    ws.send(data);
                }
            });
        }
    } else {
        // Broadcast to all players except one
        players.forEach((player, ws) => {
            if (ws !== excludeWs && ws.readyState === 1) {
                ws.send(data);
            }
        });
    }
}

/**
 * Create a broadcaster with bound state
 * @param {Map} players - Map of ws -> player
 * @param {Map} playersByLocation - Map of location -> Set<ws>
 */
function createBroadcaster(players, playersByLocation) {
    return {
        broadcast: (message, targetLocation = null) =>
            broadcast(players, playersByLocation, message, targetLocation),
        broadcastExcept: (message, excludeWs, targetLocation = null) =>
            broadcastExcept(players, playersByLocation, message, excludeWs, targetLocation)
    };
}

module.exports = {
    broadcast,
    broadcastExcept,
    createBroadcaster
};

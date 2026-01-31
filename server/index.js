// BirdGame Server - Modular architecture
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const {
    LOCATIONS,
    VALID_BIRDS,
    SPAWN_HEIGHT,
    MAX_NAME_LENGTH,
    MAX_CHAT_LENGTH,
    generateRandomName
} = require('../shared/constants.js');

const { createBroadcaster } = require('./broadcast.js');
const { createLeaderboardManager } = require('./leaderboard.js');
const { createPlayerManager } = require('./players.js');
const { createWormManager, createFlyManager } = require('./entities/index.js');
const { sanitizeString } = require('./validation.js');

// Express setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Game state
const players = new Map(); // ws -> player
const playersByLocation = new Map(); // location -> Set<ws>
const playerProfiles = new Map(); // normalized name -> profile

// Initialize location sets
LOCATIONS.forEach(loc => playersByLocation.set(loc, new Set()));

// Create managers
const broadcaster = createBroadcaster(players, playersByLocation);
const playerManager = createPlayerManager(players, playersByLocation, playerProfiles);
const leaderboardManager = createLeaderboardManager(playerProfiles, broadcaster.broadcast);
const wormManager = createWormManager(broadcaster.broadcast);
const flyManager = createFlyManager(broadcaster.broadcast);

// Initialize entities
wormManager.initialize();
flyManager.initialize();

// Start background loops
playerManager.startProfileCleanup();
wormManager.startRespawnLoop();
flyManager.startRespawnLoop();
wormManager.startGoldenWormLoop((location) =>
    Array.from(players.values()).filter(p => p.location === location)
);

// WebSocket connection handling
wss.on('connection', (ws) => {
    const playerId = playerManager.getNextPlayerId();

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;

                case 'join':
                    handleJoin(ws, playerId, message);
                    break;

                case 'position':
                    handlePosition(ws, message);
                    break;

                case 'chat':
                    handleChat(ws, message);
                    break;

                case 'worm_collected':
                    handleWormCollected(ws, message);
                    break;

                case 'fly_collected':
                    handleFlyCollected(ws, message);
                    break;

                case 'change_location':
                    handleChangeLocation(ws, message);
                    break;

                case 'get_leaderboard':
                    ws.send(JSON.stringify({
                        type: 'leaderboard',
                        leaderboard: leaderboardManager.getLeaderboard()
                    }));
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

// Message handlers
function handleJoin(ws, playerId, message) {
    let playerName = sanitizeString(message.name, MAX_NAME_LENGTH);

    // Generate random unique name if not provided
    if (!playerName) {
        do {
            playerName = generateRandomName();
        } while (playerManager.isNameInUse(playerName));
    } else if (playerManager.isNameInUse(playerName)) {
        let suffix = 2;
        while (playerManager.isNameInUse(`${playerName}${suffix}`)) {
            suffix++;
        }
        playerName = `${playerName}${suffix}`;
    }

    // Validate bird type and location
    const birdType = VALID_BIRDS.includes(message.bird) ? message.bird : 'sparrow';
    const location = LOCATIONS.includes(message.location) ? message.location : 'city';

    // Get or create profile
    const profile = playerManager.getOrCreateProfile(playerName, birdType);

    const player = {
        id: playerId,
        name: profile.name,
        bird: birdType,
        location: location,
        x: 0,
        y: SPAWN_HEIGHT,
        z: 0,
        rotationY: 0,
        score: profile.totalScore
    };

    players.set(ws, player);
    playerManager.addPlayerToLocation(ws, player.location);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        playerId: playerId,
        player: player,
        worms: wormManager.getActiveWorms(player.location),
        flies: flyManager.getActiveFlies(player.location),
        players: Array.from(players.values()).filter(p =>
            p.id !== playerId && p.location === player.location
        ),
        leaderboard: leaderboardManager.getLeaderboard(),
        isReturningPlayer: profile.totalScore > 0
    }));

    // Notify other players
    broadcaster.broadcastExcept({
        type: 'player_joined',
        player: player
    }, ws, player.location);

    if (profile.totalScore > 0) {
        leaderboardManager.broadcastLeaderboardImmediate();
    }

    console.log(`Player ${player.name} joined as ${player.bird} in ${player.location} (score: ${player.score})`);
}

function handlePosition(ws, message) {
    const player = players.get(ws);
    if (player) {
        player.x = message.x;
        player.y = message.y;
        player.z = message.z;
        player.rotationY = message.rotationY;

        broadcaster.broadcastExcept({
            type: 'player_moved',
            playerId: player.id,
            x: player.x,
            y: player.y,
            z: player.z,
            rotationY: player.rotationY
        }, ws, player.location);
    }
}

function handleChat(ws, message) {
    const player = players.get(ws);
    if (player) {
        const sanitizedMessage = sanitizeString(message.message, MAX_CHAT_LENGTH);
        if (sanitizedMessage) {
            broadcaster.broadcast({
                type: 'chat',
                playerId: player.id,
                name: player.name,
                message: sanitizedMessage
            }, player.location);
        }
    }
}

function handleWormCollected(ws, message) {
    const collector = players.get(ws);
    if (!collector) return;

    const isGolden = message.isGolden || false;
    const result = wormManager.collectWorm(collector.location, message.wormId, isGolden);

    if (result) {
        collector.score += result.points;
        playerManager.updateProfileScore(collector.name, collector.score);

        if (isGolden) {
            console.log(`${collector.name} collected the Golden Worm! (+${result.points} points)`);
        }

        broadcaster.broadcast({
            type: 'worm_collected',
            wormId: String(result.worm.id),
            playerId: collector.id,
            playerName: collector.name,
            newScore: collector.score,
            isGolden: isGolden,
            points: result.points
        }, collector.location);

        leaderboardManager.broadcastLeaderboard();
    }
}

function handleFlyCollected(ws, message) {
    const collector = players.get(ws);
    if (!collector) return;

    const result = flyManager.collectFly(collector.location, message.flyId);

    if (result) {
        collector.score += result.points;
        playerManager.updateProfileScore(collector.name, collector.score);

        broadcaster.broadcast({
            type: 'fly_collected',
            flyId: String(result.fly.id),
            playerId: collector.id,
            playerName: collector.name,
            newScore: collector.score
        }, collector.location);

        leaderboardManager.broadcastLeaderboard();
    }
}

function handleChangeLocation(ws, message) {
    const player = players.get(ws);
    console.log('[Server] change_location request:', message.location, 'player:', player?.name);

    if (!player) {
        console.log('[Server] Player not found in players map');
        return;
    }

    const oldLocation = player.location;
    const newLocation = message.location;

    console.log('[Server] Location change:', oldLocation, '->', newLocation);

    if (!LOCATIONS.includes(newLocation)) {
        console.log('[Server] Invalid location:', newLocation);
        return;
    }

    if (oldLocation === newLocation) {
        console.log('[Server] Same location, ignoring');
        return;
    }

    // Notify old location
    broadcaster.broadcastExcept({
        type: 'player_left',
        playerId: player.id
    }, ws, oldLocation);

    // Update player location
    playerManager.movePlayerLocation(ws, oldLocation, newLocation);
    player.location = newLocation;
    player.x = 0;
    player.y = SPAWN_HEIGHT;
    player.z = 0;

    // Send new location data
    ws.send(JSON.stringify({
        type: 'location_changed',
        location: newLocation,
        worms: wormManager.getActiveWorms(newLocation),
        flies: flyManager.getActiveFlies(newLocation),
        players: Array.from(players.values()).filter(p =>
            p.id !== player.id && p.location === newLocation
        )
    }));

    // Notify new location
    broadcaster.broadcastExcept({
        type: 'player_joined',
        player: player
    }, ws, newLocation);

    console.log('[Server] Location change complete');
}

function handleDisconnect(ws) {
    const player = players.get(ws);
    if (player) {
        playerManager.updateProfileScore(player.name, player.score);
        playerManager.removePlayerFromLocation(ws, player.location);

        broadcaster.broadcastExcept({
            type: 'player_left',
            playerId: player.id
        }, ws, player.location);

        players.delete(ws);
        console.log(`Player ${player.name} disconnected (score saved: ${player.score})`);
    }
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`BirdGame server running on http://localhost:${PORT}`);
});

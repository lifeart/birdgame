const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const {
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
    generateRandomName
} = require('./shared/constants.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const players = new Map(); // ws -> player (active connections)
const playersByLocation = new Map(); // location -> Set<ws> (for O(1) location broadcasts)
const playerProfiles = new Map(); // normalized name -> { name, totalScore, lastSeen, bird }
const worms = new Map();
const goldenWorms = new Map(); // location -> goldenWorm or null
const flies = new Map(); // Flying flies - give x2 points
let wormIdCounter = 0;
let flyIdCounter = 0;
let playerIdCounter = 0;

// Initialize location sets
LOCATIONS.forEach(loc => playersByLocation.set(loc, new Set()));

// Helper to add player to location index
function addPlayerToLocation(ws, location) {
    const locationSet = playersByLocation.get(location);
    if (locationSet) locationSet.add(ws);
}

// Helper to remove player from location index
function removePlayerFromLocation(ws, location) {
    const locationSet = playersByLocation.get(location);
    if (locationSet) locationSet.delete(ws);
}

// Helper to move player between locations
function movePlayerLocation(ws, oldLocation, newLocation) {
    removePlayerFromLocation(ws, oldLocation);
    addPlayerToLocation(ws, newLocation);
}

// Golden Worm state
const lastGoldenWormSpawn = new Map(); // location -> timestamp

// Normalize player name for matching (case-insensitive, trimmed)
function normalizeName(name) {
    return (name || '').trim().toLowerCase();
}

// Sanitize user input to prevent XSS (defense in depth)
function sanitizeString(str, maxLength = 50) {
    if (!str || typeof str !== 'string') return '';
    // Remove any HTML tags and limit length
    return str
        .replace(/<[^>]*>/g, '')
        .replace(/[<>"'&]/g, char => {
            const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
            return entities[char] || char;
        })
        .trim()
        .substring(0, maxLength);
}

// Get or create player profile
function getOrCreateProfile(name, bird) {
    const normalizedName = normalizeName(name);
    if (playerProfiles.has(normalizedName)) {
        const profile = playerProfiles.get(normalizedName);
        profile.lastSeen = Date.now();
        profile.bird = bird; // Update bird choice
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

// Update profile score
function updateProfileScore(name, score) {
    const normalizedName = normalizeName(name);
    const profile = playerProfiles.get(normalizedName);
    if (profile) {
        profile.totalScore = Math.max(profile.totalScore, score);
        profile.lastSeen = Date.now();
    }
}

// Get leaderboard
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

// Check if name is currently in use by another active player
function isNameInUse(name, excludeWs = null) {
    const normalizedName = normalizeName(name);
    for (const [ws, player] of players) {
        if (ws !== excludeWs && normalizeName(player.name) === normalizedName) {
            return true;
        }
    }
    return false;
}

// Note: VALID_BIRDS and generateRandomName imported from shared/constants.js

// Generate initial worms for each location
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

    // Generate initial flies - flying, give x2 points
    const locationFlies = [];
    const flyCount = FLIES_PER_LOCATION_MIN + Math.floor(Math.random() * (FLIES_PER_LOCATION_MAX - FLIES_PER_LOCATION_MIN + 1));
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

    // Initialize golden worm state
    goldenWorms.set(location, null);
    lastGoldenWormSpawn.set(location, 0);
});

// Spawn golden worm helper
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

    // Notify players in this location
    broadcast({
        type: 'worm_spawned',
        worm: goldenWorm,
        location: location
    }, location);

    console.log(`Golden Worm spawned in ${location}!`);

    return goldenWorm;
}

// Remove expired golden worm
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

// Respawn worms periodically
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

            // Notify players in this location
            broadcast({
                type: 'worm_spawned',
                worm: newWorm,
                location: location
            }, location);
        }
    });
}, WORM_RESPAWN_INTERVAL_MS);

// Respawn flies periodically
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

            // Notify players in this location
            broadcast({
                type: 'fly_spawned',
                fly: newFly,
                location: location
            }, location);
        }
    });
}, FLY_RESPAWN_INTERVAL_MS);

// Golden Worm spawn check
setInterval(() => {
    LOCATIONS.forEach(location => {
        // Check if golden worm expired
        checkGoldenWormExpiry(location);

        // Check if we should spawn a new golden worm
        const currentGolden = goldenWorms.get(location);
        const lastSpawn = lastGoldenWormSpawn.get(location) || 0;
        const timeSinceLastSpawn = Date.now() - lastSpawn;

        // Only spawn if no active golden worm and enough time has passed
        if (!currentGolden && timeSinceLastSpawn >= GOLDEN_WORM_SPAWN_INTERVAL_MS) {
            // Check if there are players in this location
            const playersInLocation = Array.from(players.values()).filter(p => p.location === location);
            if (playersInLocation.length > 0) {
                spawnGoldenWorm(location);
            }
        }
    });
}, GOLDEN_WORM_CHECK_INTERVAL_MS);

// Clean up old profiles
setInterval(() => {
    const expiryTime = Date.now() - PROFILE_EXPIRY_MS;
    for (const [name, profile] of playerProfiles) {
        if (profile.lastSeen < expiryTime) {
            playerProfiles.delete(name);
        }
    }
}, PROFILE_CLEANUP_INTERVAL_MS);

function broadcast(message, targetLocation = null) {
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

function broadcastExcept(message, excludeWs, targetLocation = null) {
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

// Debounced leaderboard broadcast to reduce server load
let leaderboardTimeout = null;
let leaderboardDirty = false;

function broadcastLeaderboard() {
    // Mark leaderboard as needing update
    leaderboardDirty = true;

    // If no pending broadcast, schedule one
    if (!leaderboardTimeout) {
        leaderboardTimeout = setTimeout(() => {
            if (leaderboardDirty) {
                const leaderboard = getLeaderboard();
                broadcast({ type: 'leaderboard', leaderboard });
                leaderboardDirty = false;
            }
            leaderboardTimeout = null;
        }, LEADERBOARD_DEBOUNCE_MS);
    }
}

// Immediate leaderboard broadcast (for new player joins, etc.)
function broadcastLeaderboardImmediate() {
    // Clear any pending debounced broadcast
    if (leaderboardTimeout) {
        clearTimeout(leaderboardTimeout);
        leaderboardTimeout = null;
    }
    leaderboardDirty = false;

    const leaderboard = getLeaderboard();
    broadcast({ type: 'leaderboard', leaderboard });
}

wss.on('connection', (ws) => {
    const playerId = playerIdCounter++;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'ping':
                    // Respond to client ping for connection health check
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;

                case 'join':
                    let playerName = sanitizeString(message.name, MAX_NAME_LENGTH);

                    // Generate random unique name if not provided
                    if (!playerName) {
                        do {
                            playerName = generateRandomName();
                        } while (isNameInUse(playerName));
                    } else if (isNameInUse(playerName)) {
                        // If name is in use by another active player, add a suffix
                        let suffix = 2;
                        while (isNameInUse(`${playerName}${suffix}`)) {
                            suffix++;
                        }
                        playerName = `${playerName}${suffix}`;
                    }

                    // Validate bird type and location
                    const birdType = VALID_BIRDS.includes(message.bird) ? message.bird : 'sparrow';
                    const location = LOCATIONS.includes(message.location) ? message.location : 'city';

                    // Get or create profile (restores score for returning players)
                    const profile = getOrCreateProfile(playerName, birdType);

                    const player = {
                        id: playerId,
                        name: profile.name, // Use profile name (preserves original casing)
                        bird: birdType,
                        location: location,
                        x: 0,
                        y: SPAWN_HEIGHT,
                        z: 0,
                        rotationY: 0,
                        score: profile.totalScore // Restore score from profile
                    };
                    players.set(ws, player);
                    addPlayerToLocation(ws, player.location);

                    // Get all worms including golden worm for this location
                    const locationWormsForWelcome = worms.get(player.location).filter(w => !w.collected);
                    const goldenWormForWelcome = goldenWorms.get(player.location);
                    if (goldenWormForWelcome && !goldenWormForWelcome.collected) {
                        locationWormsForWelcome.push(goldenWormForWelcome);
                    }

                    // Send player their ID and current game state
                    ws.send(JSON.stringify({
                        type: 'welcome',
                        playerId: playerId,
                        player: player,
                        worms: locationWormsForWelcome,
                        flies: flies.get(player.location).filter(f => !f.collected),
                        players: Array.from(players.values()).filter(p =>
                            p.id !== playerId && p.location === player.location
                        ),
                        leaderboard: getLeaderboard(),
                        isReturningPlayer: profile.totalScore > 0
                    }));

                    // Notify other players
                    broadcastExcept({
                        type: 'player_joined',
                        player: player
                    }, ws, player.location);

                    // Update leaderboard for everyone if this is a returning player with score
                    if (profile.totalScore > 0) {
                        broadcastLeaderboardImmediate();
                    }

                    console.log(`Player ${player.name} joined as ${player.bird} in ${player.location} (score: ${player.score})`);
                    break;

                case 'position':
                    const p = players.get(ws);
                    if (p) {
                        p.x = message.x;
                        p.y = message.y;
                        p.z = message.z;
                        p.rotationY = message.rotationY;

                        broadcastExcept({
                            type: 'player_moved',
                            playerId: p.id,
                            x: p.x,
                            y: p.y,
                            z: p.z,
                            rotationY: p.rotationY
                        }, ws, p.location);
                    }
                    break;

                case 'chat':
                    const chatPlayer = players.get(ws);
                    if (chatPlayer) {
                        const sanitizedMessage = sanitizeString(message.message, MAX_CHAT_LENGTH);
                        if (sanitizedMessage) {
                            broadcast({
                                type: 'chat',
                                playerId: chatPlayer.id,
                                name: chatPlayer.name,
                                message: sanitizedMessage
                            }, chatPlayer.location);
                        }
                    }
                    break;

                case 'worm_collected':
                    const collector = players.get(ws);
                    if (collector) {
                        const isGolden = message.isGolden || false;
                        let worm = null;
                        let points = 1;

                        if (isGolden) {
                            // Check golden worm
                            const goldenWorm = goldenWorms.get(collector.location);
                            if (goldenWorm && goldenWorm.id === message.wormId && !goldenWorm.collected) {
                                worm = goldenWorm;
                                points = GOLDEN_WORM_POINTS;
                                goldenWorm.collected = true;
                                goldenWorms.set(collector.location, null);
                                console.log(`${collector.name} collected the Golden Worm! (+${points} points)`);
                            }
                        } else {
                            // Check regular worm
                            const locationWorms = worms.get(collector.location);
                            if (!locationWorms) break;
                            worm = locationWorms.find(w => w.id === message.wormId && !w.collected);
                            if (worm) {
                                worm.collected = true;
                            }
                        }

                        if (worm) {
                            collector.score += points;

                            // Update profile with new high score
                            updateProfileScore(collector.name, collector.score);

                            broadcast({
                                type: 'worm_collected',
                                wormId: worm.id,
                                playerId: collector.id,
                                playerName: collector.name,
                                newScore: collector.score,
                                isGolden: isGolden,
                                points: points
                            }, collector.location);

                            // Broadcast updated leaderboard
                            broadcastLeaderboard();
                        }
                    }
                    break;

                case 'fly_collected':
                    const flyCollector = players.get(ws);
                    if (flyCollector) {
                        const locationFlies = flies.get(flyCollector.location);
                        if (!locationFlies) break;
                        const fly = locationFlies.find(f => f.id === message.flyId && !f.collected);
                        if (fly) {
                            fly.collected = true;
                            flyCollector.score += FLY_POINTS;

                            // Update profile with new high score
                            updateProfileScore(flyCollector.name, flyCollector.score);

                            broadcast({
                                type: 'fly_collected',
                                flyId: fly.id,
                                playerId: flyCollector.id,
                                playerName: flyCollector.name,
                                newScore: flyCollector.score
                            }, flyCollector.location);

                            // Broadcast updated leaderboard
                            broadcastLeaderboard();
                        }
                    }
                    break;

                case 'change_location':
                    const movingPlayer = players.get(ws);
                    if (!movingPlayer) break;

                    const oldLocation = movingPlayer.location;
                    const newLocation = message.location;

                    if (!LOCATIONS.includes(newLocation) || oldLocation === newLocation) {
                        break;
                    }

                    // Notify old location
                    broadcastExcept({
                        type: 'player_left',
                        playerId: movingPlayer.id
                    }, ws, oldLocation);

                    // Update player location and location index
                    movePlayerLocation(ws, oldLocation, newLocation);
                    movingPlayer.location = newLocation;
                    movingPlayer.x = 0;
                    movingPlayer.y = 10;
                    movingPlayer.z = 0;

                    // Get all worms including golden worm for new location (with null checks)
                    const locationWormsArray = worms.get(newLocation) || [];
                    const locationWormsForChange = locationWormsArray.filter(w => !w.collected);
                    const goldenWormForChange = goldenWorms.get(newLocation);
                    if (goldenWormForChange && !goldenWormForChange.collected) {
                        locationWormsForChange.push(goldenWormForChange);
                    }

                    // Get flies for new location (with null check)
                    const locationFliesArray = flies.get(newLocation) || [];
                    const locationFliesForChange = locationFliesArray.filter(f => !f.collected);

                    console.log('[Server] Sending location_changed:', newLocation, 'worms:', locationWormsForChange.length, 'flies:', locationFliesForChange.length);

                    // Send new location data
                    ws.send(JSON.stringify({
                        type: 'location_changed',
                        location: newLocation,
                        worms: locationWormsForChange,
                        flies: locationFliesForChange,
                        players: Array.from(players.values()).filter(p =>
                            p.id !== movingPlayer.id && p.location === newLocation
                        )
                    }));

                    // Notify new location
                    broadcastExcept({
                        type: 'player_joined',
                        player: movingPlayer
                    }, ws, newLocation);
                    break;

                case 'get_leaderboard':
                    ws.send(JSON.stringify({
                        type: 'leaderboard',
                        leaderboard: getLeaderboard()
                    }));
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        const player = players.get(ws);
        if (player) {
            // Save score to profile before removing
            updateProfileScore(player.name, player.score);

            // Remove from location index
            removePlayerFromLocation(ws, player.location);

            broadcastExcept({
                type: 'player_left',
                playerId: player.id
            }, ws, player.location);
            players.delete(ws);
            console.log(`Player ${player.name} disconnected (score saved: ${player.score})`);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`BirdGame server running on http://localhost:${PORT}`);
});

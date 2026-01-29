const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const players = new Map(); // ws -> player (active connections)
const playerProfiles = new Map(); // normalized name -> { name, totalScore, lastSeen, bird }
const worms = new Map();
const flies = new Map(); // Flying flies - give x2 points
let wormIdCounter = 0;
let flyIdCounter = 0;
let playerIdCounter = 0;

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

// Get leaderboard (top 10)
function getLeaderboard() {
    const allProfiles = Array.from(playerProfiles.values());
    return allProfiles
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10)
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

// Valid bird types
const validBirds = ['sparrow', 'pigeon', 'crow', 'hummingbird', 'penguin'];

// Random name generator (same as client for consistency)
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

// Generate initial worms for each location
const locations = ['city', 'park', 'village'];
locations.forEach(location => {
    const locationWorms = [];
    for (let i = 0; i < 20; i++) {
        locationWorms.push({
            id: wormIdCounter++,
            x: (Math.random() - 0.5) * 200,
            y: 0.5,
            z: (Math.random() - 0.5) * 200,
            collected: false
        });
    }
    worms.set(location, locationWorms);

    // Generate initial flies (3-5 per location) - flying, give x2 points
    const locationFlies = [];
    const flyCount = 3 + Math.floor(Math.random() * 3); // 3-5 flies
    for (let i = 0; i < flyCount; i++) {
        locationFlies.push({
            id: flyIdCounter++,
            x: (Math.random() - 0.5) * 180,
            y: 8 + Math.random() * 15, // Flying height 8-23
            z: (Math.random() - 0.5) * 180,
            collected: false
        });
    }
    flies.set(location, locationFlies);
});

// Respawn worms periodically
setInterval(() => {
    locations.forEach(location => {
        const locationWorms = worms.get(location);
        const activeWorms = locationWorms.filter(w => !w.collected);
        if (activeWorms.length < 15) {
            const newWorm = {
                id: wormIdCounter++,
                x: (Math.random() - 0.5) * 200,
                y: 0.5,
                z: (Math.random() - 0.5) * 200,
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
}, 5000);

// Respawn flies periodically (less frequent, keep 3-5 per location)
setInterval(() => {
    locations.forEach(location => {
        const locationFlies = flies.get(location);
        const activeFlies = locationFlies.filter(f => !f.collected);
        if (activeFlies.length < 3) {
            const newFly = {
                id: flyIdCounter++,
                x: (Math.random() - 0.5) * 180,
                y: 8 + Math.random() * 15,
                z: (Math.random() - 0.5) * 180,
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
}, 10000); // Every 10 seconds

// Clean up old profiles (not seen in 24 hours)
setInterval(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [name, profile] of playerProfiles) {
        if (profile.lastSeen < oneDayAgo) {
            playerProfiles.delete(name);
        }
    }
}, 60 * 60 * 1000); // Check every hour

function broadcast(message, targetLocation = null) {
    const data = JSON.stringify(message);
    players.forEach((player, ws) => {
        if (ws.readyState === 1) {
            if (!targetLocation || player.location === targetLocation) {
                ws.send(data);
            }
        }
    });
}

function broadcastExcept(message, excludeWs, targetLocation = null) {
    const data = JSON.stringify(message);
    players.forEach((player, ws) => {
        if (ws !== excludeWs && ws.readyState === 1) {
            if (!targetLocation || player.location === targetLocation) {
                ws.send(data);
            }
        }
    });
}

function broadcastLeaderboard() {
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
                    let playerName = sanitizeString(message.name, 20);

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
                    const birdType = validBirds.includes(message.bird) ? message.bird : 'sparrow';
                    const location = locations.includes(message.location) ? message.location : 'city';

                    // Get or create profile (restores score for returning players)
                    const profile = getOrCreateProfile(playerName, birdType);

                    const player = {
                        id: playerId,
                        name: profile.name, // Use profile name (preserves original casing)
                        bird: birdType,
                        location: location,
                        x: 0,
                        y: 10,
                        z: 0,
                        rotationY: 0,
                        score: profile.totalScore // Restore score from profile
                    };
                    players.set(ws, player);

                    // Send player their ID and current game state
                    ws.send(JSON.stringify({
                        type: 'welcome',
                        playerId: playerId,
                        player: player,
                        worms: worms.get(player.location).filter(w => !w.collected),
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
                        broadcastLeaderboard();
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
                        const sanitizedMessage = sanitizeString(message.message, 200);
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
                        const locationWorms = worms.get(collector.location);
                        const worm = locationWorms.find(w => w.id === message.wormId && !w.collected);
                        if (worm) {
                            worm.collected = true;
                            collector.score++;

                            // Update profile with new high score
                            updateProfileScore(collector.name, collector.score);

                            broadcast({
                                type: 'worm_collected',
                                wormId: worm.id,
                                playerId: collector.id,
                                playerName: collector.name,
                                newScore: collector.score
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
                        const fly = locationFlies.find(f => f.id === message.flyId && !f.collected);
                        if (fly) {
                            fly.collected = true;
                            flyCollector.score += 2; // x2 points for flies!

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
                    if (movingPlayer) {
                        const oldLocation = movingPlayer.location;
                        const newLocation = message.location;

                        if (locations.includes(newLocation) && oldLocation !== newLocation) {
                            // Notify old location
                            broadcastExcept({
                                type: 'player_left',
                                playerId: movingPlayer.id
                            }, ws, oldLocation);

                            // Update player location
                            movingPlayer.location = newLocation;
                            movingPlayer.x = 0;
                            movingPlayer.y = 10;
                            movingPlayer.z = 0;

                            // Send new location data
                            ws.send(JSON.stringify({
                                type: 'location_changed',
                                location: newLocation,
                                worms: worms.get(newLocation).filter(w => !w.collected),
                                flies: flies.get(newLocation).filter(f => !f.collected),
                                players: Array.from(players.values()).filter(p =>
                                    p.id !== movingPlayer.id && p.location === newLocation
                                )
                            }));

                            // Notify new location
                            broadcastExcept({
                                type: 'player_joined',
                                player: movingPlayer
                            }, ws, newLocation);
                        }
                    }
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

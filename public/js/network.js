// WebSocket network client
class NetworkManager {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.callbacks = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = null;
        this.connectionTimeout = null;
        this.pingInterval = null;
        this.reconnecting = false;
    }

    connect(playerName, birdType, location) {
        return new Promise((resolve, reject) => {
            // Clear any pending reconnection
            this.clearReconnectTimeout();

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;

            this.ws = new WebSocket(wsUrl);

            // Connection timeout (10 seconds)
            this.connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);

            this.ws.onopen = () => {
                console.log('Connected to server');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.reconnecting = false;

                // Start ping interval to detect dead connections
                this.startPing();

                // Send join message
                this.send({
                    type: 'join',
                    name: playerName,
                    bird: birdType,
                    location: location
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message, resolve);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('Disconnected from server');
                const wasConnected = this.connected;
                this.connected = false;
                this.clearConnectionTimeout();
                this.stopPing();

                if (wasConnected) {
                    this.triggerCallback('disconnected');
                }

                // Try to reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts && this.playerName) {
                    this.reconnecting = true;
                    this.reconnectAttempts++;
                    const delay = 2000 * this.reconnectAttempts;

                    this.triggerCallback('reconnecting', {
                        attempt: this.reconnectAttempts,
                        maxAttempts: this.maxReconnectAttempts,
                        delay: delay
                    });

                    this.reconnectTimeout = setTimeout(() => {
                        this.connect(this.playerName, this.birdType, this.currentLocation)
                            .then(data => {
                                this.triggerCallback('reconnected', data);
                            })
                            .catch(err => {
                                console.error('Reconnection failed:', err);
                            });
                    }, delay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.reconnecting = false;
                    this.triggerCallback('connectionFailed', {
                        reason: 'Max reconnection attempts reached'
                    });
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.clearConnectionTimeout();
            };

            // Store connection info for reconnection
            this.playerName = playerName;
            this.birdType = birdType;
            this.currentLocation = location;
        });
    }

    handleMessage(message, resolveConnect) {
        // Clear connection timeout on first message
        this.clearConnectionTimeout();

        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                if (resolveConnect) {
                    resolveConnect({
                        playerId: message.playerId,
                        player: message.player,
                        worms: message.worms,
                        flies: message.flies,
                        players: message.players,
                        leaderboard: message.leaderboard,
                        isReturningPlayer: message.isReturningPlayer
                    });
                }
                break;

            case 'pong':
                // Server responded to ping - connection is alive
                break;

            case 'player_joined':
                this.triggerCallback('playerJoined', message.player);
                break;

            case 'player_left':
                this.triggerCallback('playerLeft', message.playerId);
                break;

            case 'player_moved':
                this.triggerCallback('playerMoved', {
                    playerId: message.playerId,
                    x: message.x,
                    y: message.y,
                    z: message.z,
                    rotationY: message.rotationY
                });
                break;

            case 'chat':
                this.triggerCallback('chatMessage', {
                    playerId: message.playerId,
                    name: message.name,
                    message: message.message
                });
                break;

            case 'worm_spawned':
                this.triggerCallback('wormSpawned', message.worm);
                break;

            case 'worm_collected':
                this.triggerCallback('wormCollected', {
                    wormId: message.wormId,
                    playerId: message.playerId,
                    playerName: message.playerName,
                    newScore: message.newScore
                });
                break;

            case 'fly_spawned':
                this.triggerCallback('flySpawned', message.fly);
                break;

            case 'fly_collected':
                this.triggerCallback('flyCollected', {
                    flyId: message.flyId,
                    playerId: message.playerId,
                    playerName: message.playerName,
                    newScore: message.newScore
                });
                break;

            case 'location_changed':
                this.currentLocation = message.location;
                this.triggerCallback('locationChanged', {
                    location: message.location,
                    worms: message.worms,
                    flies: message.flies,
                    players: message.players
                });
                break;

            case 'leaderboard':
                this.triggerCallback('leaderboard', message.leaderboard);
                break;
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    isReconnecting() {
        return this.reconnecting;
    }

    sendPosition(x, y, z, rotationY) {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'position',
            x: x,
            y: y,
            z: z,
            rotationY: rotationY
        });
    }

    sendChat(message) {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'chat',
            message: message
        });
    }

    sendWormCollected(wormId) {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'worm_collected',
            wormId: wormId
        });
    }

    sendFlyCollected(flyId) {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'fly_collected',
            flyId: flyId
        });
    }

    changeLocation(location) {
        if (!this.isConnected()) return false;
        return this.send({
            type: 'change_location',
            location: location
        });
    }

    startPing() {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    triggerCallback(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in callback for event '${event}':`, e);
                }
            });
        }
    }

    disconnect() {
        this.clearReconnectTimeout();
        this.clearConnectionTimeout();
        this.stopPing();
        this.reconnecting = false;
        this.playerName = null; // Prevent auto-reconnect

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { broadcast, broadcastExcept, createBroadcaster } = require('../../../server/broadcast');

describe('Broadcast utilities', () => {
    let players;
    let playersByLocation;
    let mockWs1, mockWs2, mockWs3;

    beforeEach(() => {
        // Create mock WebSockets
        mockWs1 = { readyState: 1, send: vi.fn(), id: 1 };
        mockWs2 = { readyState: 1, send: vi.fn(), id: 2 };
        mockWs3 = { readyState: 1, send: vi.fn(), id: 3 };

        players = new Map([
            [mockWs1, { name: 'Player1', location: 'city' }],
            [mockWs2, { name: 'Player2', location: 'city' }],
            [mockWs3, { name: 'Player3', location: 'park' }]
        ]);

        playersByLocation = new Map([
            ['city', new Set([mockWs1, mockWs2])],
            ['park', new Set([mockWs3])],
            ['village', new Set()],
            ['beach', new Set()],
            ['mountain', new Set()]
        ]);
    });

    describe('broadcast', () => {
        it('sends to all players when no location specified', () => {
            const message = { type: 'test', data: 'hello' };

            broadcast(players, playersByLocation, message);

            expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
            expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
            expect(mockWs3.send).toHaveBeenCalledWith(JSON.stringify(message));
        });

        it('sends only to players in specified location', () => {
            const message = { type: 'test', data: 'city only' };

            broadcast(players, playersByLocation, message, 'city');

            expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
            expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
            expect(mockWs3.send).not.toHaveBeenCalled();
        });

        it('does not send to closed WebSockets', () => {
            mockWs1.readyState = 3; // CLOSED
            const message = { type: 'test' };

            broadcast(players, playersByLocation, message);

            expect(mockWs1.send).not.toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
            expect(mockWs3.send).toHaveBeenCalled();
        });

        it('handles empty location', () => {
            const message = { type: 'test' };

            broadcast(players, playersByLocation, message, 'village');

            expect(mockWs1.send).not.toHaveBeenCalled();
            expect(mockWs2.send).not.toHaveBeenCalled();
            expect(mockWs3.send).not.toHaveBeenCalled();
        });

        it('handles invalid location', () => {
            const message = { type: 'test' };

            // Should not throw
            broadcast(players, playersByLocation, message, 'invalid');

            expect(mockWs1.send).not.toHaveBeenCalled();
        });

        it('serializes message to JSON', () => {
            const message = { type: 'complex', nested: { value: 123 } };

            broadcast(players, playersByLocation, message);

            expect(mockWs1.send).toHaveBeenCalledWith(
                '{"type":"complex","nested":{"value":123}}'
            );
        });
    });

    describe('broadcastExcept', () => {
        it('sends to all except specified WebSocket', () => {
            const message = { type: 'test' };

            broadcastExcept(players, playersByLocation, message, mockWs1);

            expect(mockWs1.send).not.toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
            expect(mockWs3.send).toHaveBeenCalled();
        });

        it('filters by location and excludes', () => {
            const message = { type: 'test' };

            broadcastExcept(players, playersByLocation, message, mockWs1, 'city');

            expect(mockWs1.send).not.toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
            expect(mockWs3.send).not.toHaveBeenCalled(); // Different location
        });

        it('does not send to closed WebSockets', () => {
            mockWs2.readyState = 3; // CLOSED
            const message = { type: 'test' };

            broadcastExcept(players, playersByLocation, message, mockWs1);

            expect(mockWs1.send).not.toHaveBeenCalled(); // Excluded
            expect(mockWs2.send).not.toHaveBeenCalled(); // Closed
            expect(mockWs3.send).toHaveBeenCalled();
        });

        it('handles excluding non-existent WebSocket', () => {
            const nonExistent = { readyState: 1, send: vi.fn() };
            const message = { type: 'test' };

            broadcastExcept(players, playersByLocation, message, nonExistent);

            expect(mockWs1.send).toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
            expect(mockWs3.send).toHaveBeenCalled();
        });
    });

    describe('createBroadcaster', () => {
        it('creates broadcaster with bound state', () => {
            const broadcaster = createBroadcaster(players, playersByLocation);

            expect(broadcaster).toHaveProperty('broadcast');
            expect(broadcaster).toHaveProperty('broadcastExcept');
        });

        it('broadcaster.broadcast works correctly', () => {
            const broadcaster = createBroadcaster(players, playersByLocation);
            const message = { type: 'test' };

            broadcaster.broadcast(message, 'city');

            expect(mockWs1.send).toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
            expect(mockWs3.send).not.toHaveBeenCalled();
        });

        it('broadcaster.broadcastExcept works correctly', () => {
            const broadcaster = createBroadcaster(players, playersByLocation);
            const message = { type: 'test' };

            broadcaster.broadcastExcept(message, mockWs1, 'city');

            expect(mockWs1.send).not.toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
        });

        it('broadcaster uses bound maps', () => {
            const broadcaster = createBroadcaster(players, playersByLocation);

            // Add new player after creating broadcaster
            const mockWs4 = { readyState: 1, send: vi.fn() };
            players.set(mockWs4, { name: 'Player4' });
            playersByLocation.get('city').add(mockWs4);

            broadcaster.broadcast({ type: 'test' }, 'city');

            expect(mockWs4.send).toHaveBeenCalled();
        });
    });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { createPlayerManager } = require('../../../server/players');

describe('PlayerManager', () => {
    let players;
    let playersByLocation;
    let playerProfiles;
    let manager;

    beforeEach(() => {
        vi.useFakeTimers();
        players = new Map();
        playersByLocation = new Map([
            ['city', new Set()],
            ['park', new Set()],
            ['village', new Set()],
            ['beach', new Set()],
            ['mountain', new Set()]
        ]);
        playerProfiles = new Map();
        manager = createPlayerManager(players, playersByLocation, playerProfiles);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('normalizeName', () => {
        it('converts to lowercase', () => {
            expect(manager.normalizeName('TestPlayer')).toBe('testplayer');
        });

        it('trims whitespace', () => {
            expect(manager.normalizeName('  Player  ')).toBe('player');
        });

        it('handles null/undefined', () => {
            expect(manager.normalizeName(null)).toBe('');
            expect(manager.normalizeName(undefined)).toBe('');
        });

        it('handles empty string', () => {
            expect(manager.normalizeName('')).toBe('');
        });
    });

    describe('isNameInUse', () => {
        it('returns false when no players', () => {
            expect(manager.isNameInUse('TestPlayer')).toBe(false);
        });

        it('returns true when name is in use', () => {
            const mockWs = { id: 1 };
            players.set(mockWs, { name: 'TestPlayer' });

            expect(manager.isNameInUse('TestPlayer')).toBe(true);
        });

        it('is case-insensitive', () => {
            const mockWs = { id: 1 };
            players.set(mockWs, { name: 'TestPlayer' });

            expect(manager.isNameInUse('testplayer')).toBe(true);
            expect(manager.isNameInUse('TESTPLAYER')).toBe(true);
        });

        it('excludes specified websocket', () => {
            const mockWs = { id: 1 };
            players.set(mockWs, { name: 'TestPlayer' });

            expect(manager.isNameInUse('TestPlayer', mockWs)).toBe(false);
        });

        it('detects duplicate with multiple players', () => {
            const ws1 = { id: 1 };
            const ws2 = { id: 2 };
            players.set(ws1, { name: 'Player1' });
            players.set(ws2, { name: 'Player2' });

            expect(manager.isNameInUse('Player1', ws2)).toBe(true);
            expect(manager.isNameInUse('Player3')).toBe(false);
        });
    });

    describe('getOrCreateProfile', () => {
        it('creates new profile if not exists', () => {
            const profile = manager.getOrCreateProfile('NewPlayer', 'sparrow');

            expect(profile.name).toBe('NewPlayer');
            expect(profile.totalScore).toBe(0);
            expect(profile.bird).toBe('sparrow');
            expect(profile.lastSeen).toBeDefined();
        });

        it('returns existing profile if exists', () => {
            manager.getOrCreateProfile('ExistingPlayer', 'sparrow');
            const profile = manager.getOrCreateProfile('ExistingPlayer', 'crow');

            expect(profile.name).toBe('ExistingPlayer');
            expect(profile.bird).toBe('crow'); // Updated
        });

        it('is case-insensitive for lookup', () => {
            manager.getOrCreateProfile('TestPlayer', 'sparrow');
            const profile = manager.getOrCreateProfile('testplayer', 'crow');

            expect(playerProfiles.size).toBe(1);
            expect(profile.bird).toBe('crow');
        });

        it('updates lastSeen on retrieval', () => {
            const profile1 = manager.getOrCreateProfile('Player', 'sparrow');
            const firstSeen = profile1.lastSeen;

            // Small delay to ensure time difference
            vi.advanceTimersByTime(100);

            const profile2 = manager.getOrCreateProfile('Player', 'sparrow');
            expect(profile2.lastSeen).toBeGreaterThanOrEqual(firstSeen);
        });

        it('stores profile in playerProfiles map', () => {
            manager.getOrCreateProfile('StoredPlayer', 'pigeon');

            expect(playerProfiles.has('storedplayer')).toBe(true);
        });
    });

    describe('updateProfileScore', () => {
        it('updates score if higher', () => {
            manager.getOrCreateProfile('Player', 'sparrow');
            manager.updateProfileScore('Player', 100);

            const profile = playerProfiles.get('player');
            expect(profile.totalScore).toBe(100);
        });

        it('keeps higher score', () => {
            manager.getOrCreateProfile('Player', 'sparrow');
            manager.updateProfileScore('Player', 100);
            manager.updateProfileScore('Player', 50);

            const profile = playerProfiles.get('player');
            expect(profile.totalScore).toBe(100);
        });

        it('does nothing if profile does not exist', () => {
            manager.updateProfileScore('NonExistent', 100);
            expect(playerProfiles.has('nonexistent')).toBe(false);
        });

        it('updates lastSeen', () => {
            const profile = manager.getOrCreateProfile('Player', 'sparrow');
            const firstSeen = profile.lastSeen;

            vi.advanceTimersByTime(100);
            manager.updateProfileScore('Player', 50);

            expect(profile.lastSeen).toBeGreaterThanOrEqual(firstSeen);
        });
    });

    describe('addPlayerToLocation', () => {
        it('adds player to location set', () => {
            const mockWs = { id: 1 };
            manager.addPlayerToLocation(mockWs, 'city');

            expect(playersByLocation.get('city').has(mockWs)).toBe(true);
        });

        it('handles multiple players in same location', () => {
            const ws1 = { id: 1 };
            const ws2 = { id: 2 };

            manager.addPlayerToLocation(ws1, 'city');
            manager.addPlayerToLocation(ws2, 'city');

            expect(playersByLocation.get('city').size).toBe(2);
        });

        it('does nothing for invalid location', () => {
            const mockWs = { id: 1 };
            manager.addPlayerToLocation(mockWs, 'invalid');
            // Should not throw
        });
    });

    describe('removePlayerFromLocation', () => {
        it('removes player from location set', () => {
            const mockWs = { id: 1 };
            playersByLocation.get('city').add(mockWs);

            manager.removePlayerFromLocation(mockWs, 'city');

            expect(playersByLocation.get('city').has(mockWs)).toBe(false);
        });

        it('handles player not in location', () => {
            const mockWs = { id: 1 };
            manager.removePlayerFromLocation(mockWs, 'city');
            // Should not throw
        });
    });

    describe('movePlayerLocation', () => {
        it('moves player between locations', () => {
            const mockWs = { id: 1 };
            playersByLocation.get('city').add(mockWs);

            manager.movePlayerLocation(mockWs, 'city', 'park');

            expect(playersByLocation.get('city').has(mockWs)).toBe(false);
            expect(playersByLocation.get('park').has(mockWs)).toBe(true);
        });
    });

    describe('getNextPlayerId', () => {
        it('returns incrementing IDs', () => {
            const id1 = manager.getNextPlayerId();
            const id2 = manager.getNextPlayerId();
            const id3 = manager.getNextPlayerId();

            expect(id1).toBe('0');
            expect(id2).toBe('1');
            expect(id3).toBe('2');
        });

        it('returns string type', () => {
            const id = manager.getNextPlayerId();
            expect(typeof id).toBe('string');
        });
    });
});

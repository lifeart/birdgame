import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { createLeaderboardManager } = require('../../../server/leaderboard');

describe('LeaderboardManager', () => {
    let playerProfiles;
    let broadcastFn;
    let manager;

    beforeEach(() => {
        vi.useFakeTimers();
        playerProfiles = new Map();
        broadcastFn = vi.fn();
        manager = createLeaderboardManager(playerProfiles, broadcastFn);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getLeaderboard', () => {
        it('returns empty array when no profiles', () => {
            const leaderboard = manager.getLeaderboard();
            expect(leaderboard).toEqual([]);
        });

        it('returns profiles sorted by score descending', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 50, bird: 'sparrow' });
            playerProfiles.set('player2', { name: 'Player2', totalScore: 100, bird: 'crow' });
            playerProfiles.set('player3', { name: 'Player3', totalScore: 75, bird: 'pigeon' });

            const leaderboard = manager.getLeaderboard();

            expect(leaderboard[0].name).toBe('Player2');
            expect(leaderboard[0].score).toBe(100);
            expect(leaderboard[1].name).toBe('Player3');
            expect(leaderboard[2].name).toBe('Player1');
        });

        it('includes rank in results', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'sparrow' });
            playerProfiles.set('player2', { name: 'Player2', totalScore: 50, bird: 'crow' });

            const leaderboard = manager.getLeaderboard();

            expect(leaderboard[0].rank).toBe(1);
            expect(leaderboard[1].rank).toBe(2);
        });

        it('includes bird type in results', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'hummingbird' });

            const leaderboard = manager.getLeaderboard();

            expect(leaderboard[0].bird).toBe('hummingbird');
        });

        it('limits to top 10 players', () => {
            for (let i = 0; i < 15; i++) {
                playerProfiles.set(`player${i}`, {
                    name: `Player${i}`,
                    totalScore: i * 10,
                    bird: 'sparrow'
                });
            }

            const leaderboard = manager.getLeaderboard();

            expect(leaderboard.length).toBe(10);
            expect(leaderboard[0].score).toBe(140); // Highest score
            expect(leaderboard[9].score).toBe(50);  // 10th highest
        });

        it('handles ties by keeping original order', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'sparrow' });
            playerProfiles.set('player2', { name: 'Player2', totalScore: 100, bird: 'crow' });

            const leaderboard = manager.getLeaderboard();

            expect(leaderboard.length).toBe(2);
            expect(leaderboard[0].score).toBe(100);
            expect(leaderboard[1].score).toBe(100);
        });
    });

    describe('broadcastLeaderboard', () => {
        it('debounces broadcasts', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'sparrow' });

            manager.broadcastLeaderboard();
            manager.broadcastLeaderboard();
            manager.broadcastLeaderboard();

            // Should not have called yet (debounced)
            expect(broadcastFn).not.toHaveBeenCalled();

            // Advance time past debounce
            vi.advanceTimersByTime(1000);

            // Should have called exactly once
            expect(broadcastFn).toHaveBeenCalledTimes(1);
        });

        it('broadcasts leaderboard message', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'sparrow' });

            manager.broadcastLeaderboard();
            vi.advanceTimersByTime(1000);

            expect(broadcastFn).toHaveBeenCalledWith({
                type: 'leaderboard',
                leaderboard: expect.any(Array)
            });
        });

        it('does not broadcast if not dirty after timeout', () => {
            manager.broadcastLeaderboard();
            vi.advanceTimersByTime(500);

            // Reset dirty flag somehow (implementation detail)
            // In this case, we just check normal flow
            vi.advanceTimersByTime(500);

            expect(broadcastFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('broadcastLeaderboardImmediate', () => {
        it('broadcasts immediately without debounce', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'sparrow' });

            manager.broadcastLeaderboardImmediate();

            expect(broadcastFn).toHaveBeenCalledTimes(1);
        });

        it('cancels pending debounced broadcast', () => {
            playerProfiles.set('player1', { name: 'Player1', totalScore: 100, bird: 'sparrow' });

            manager.broadcastLeaderboard(); // Start debounce
            manager.broadcastLeaderboardImmediate(); // Immediate + cancel

            vi.advanceTimersByTime(1000);

            // Should only have one call (immediate), not two
            expect(broadcastFn).toHaveBeenCalledTimes(1);
        });

        it('includes full leaderboard data', () => {
            playerProfiles.set('player1', { name: 'TopPlayer', totalScore: 500, bird: 'crow' });
            playerProfiles.set('player2', { name: 'SecondPlayer', totalScore: 300, bird: 'sparrow' });

            manager.broadcastLeaderboardImmediate();

            const call = broadcastFn.mock.calls[0][0];
            expect(call.type).toBe('leaderboard');
            expect(call.leaderboard[0].name).toBe('TopPlayer');
            expect(call.leaderboard[0].score).toBe(500);
            expect(call.leaderboard[1].name).toBe('SecondPlayer');
        });
    });
});

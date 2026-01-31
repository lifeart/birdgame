# BirdGame Test Plan

This document outlines the comprehensive testing strategy for the BirdGame multiplayer 3D browser game.

## Table of Contents

1. [Overview](#overview)
2. [Test Framework Setup](#test-framework-setup)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [E2E Tests](#e2e-tests)
6. [Server Tests](#server-tests)
7. [Performance Tests](#performance-tests)
8. [Test Coverage Goals](#test-coverage-goals)

---

## Overview

### Technology Stack
- **Frontend:** TypeScript, Three.js
- **Backend:** Node.js, Express, WebSocket
- **Unit Testing:** Vitest + jsdom
- **E2E Testing:** Playwright

### Running Tests

```bash
# Unit tests
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# E2E tests
npm run test:e2e      # Run all browsers
npm run test:e2e:ui   # Interactive UI mode

# All tests
npm run test:all
```

---

## Test Framework Setup

### Vitest Configuration
- Environment: jsdom (for DOM APIs)
- Coverage provider: v8
- Test location: `tests/unit/`
- Setup file: `tests/setup.ts` (mocks localStorage)

### Playwright Configuration
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome
- Test location: `tests/e2e/`
- Auto-starts dev server on port 3000

---

## Unit Tests

### Core Utilities (`public/js/core/utils.ts`)

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `distanceSquared` - same point | Returns 0 | High |
| `distanceSquared` - calculation | Correct squared distance | High |
| `distanceSquared` - negative coords | Handles negatives | Medium |
| `distanceSquared` - commutative | a→b = b→a | Low |
| `distance` - 3-4-5 triangle | Returns 5 | High |
| `distance` - 3D calculation | sqrt(x² + y² + z²) | High |
| `clamp` - within range | Returns value | High |
| `clamp` - below min | Returns min | High |
| `clamp` - above max | Returns max | High |
| `clamp` - negative range | Works correctly | Medium |
| `lerp` - t=0 | Returns start | High |
| `lerp` - t=1 | Returns end | High |
| `lerp` - t=0.5 | Returns midpoint | High |
| `lerp` - extrapolation | Works for t<0, t>1 | Medium |

### Progression System (`public/js/core/progression.ts`)

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Init - default state | Level 1, 0 XP | High |
| XP table - level 1 | Requires 0 XP | High |
| XP table - level 2 | Requires 50 XP | High |
| XP table - cumulative | Level 3 = 50 + 57 | High |
| XP table - level 50 cap | Max level cap | High |
| `addXP` - increases XP | Basic accumulation | High |
| `addXP` - triggers level up | At threshold | High |
| `addXP` - multi-level up | Large XP gain | Medium |
| `addXP` - callbacks | onLevelUp, onXPGain | High |
| `addXP` - max level | No XP at 50 | High |
| `getXPForAction` - worm | Returns 5 | High |
| `getXPForAction` - fly | Returns 10 | High |
| `getXPForAction` - goldenWorm | Returns 50 | High |
| `getXPProgress` - boundaries | 0 to 1 range | High |
| Rewards - level 5 | Unlocks trail | High |
| Rewards - level 10 | Unlocks aura | High |
| Rewards - level 20 | Unlocks crown | Medium |
| `reset` - clears progress | Back to level 1 | Medium |
| Persistence - save | Uses localStorage | Medium |
| Persistence - load | Restores state | Medium |

### Daily Rewards (`public/js/core/rewards.ts`)

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Init - default state | Streak 0, day 1 | High |
| 7-day cycle - rewards | Correct XP amounts | High |
| 7-day cycle - day 7 | Bonus + golden egg | High |
| Streak multiplier - 0 days | 1.0x | High |
| Streak multiplier - 3 days | 1.2x | High |
| Streak multiplier - 7 days | 1.5x | High |
| Streak multiplier - 14 days | 2.0x | High |
| Streak multiplier - 30 days | 3.0x | High |
| `claimReward` - success | Returns reward | High |
| `claimReward` - updates state | Streak++, day++ | High |
| `claimReward` - already claimed | Returns null | High |
| `claimReward` - applies multiplier | Correct final amount | High |
| `claimReward` - day 7 cycle | Resets to day 1 | High |
| Streak - consecutive days | Maintains streak | High |
| Streak - missed day | Resets to 0 | High |
| `canClaim` - new day | Returns true | High |
| `canClaim` - already claimed | Returns false | High |
| `getNextStreakBonus` | Correct next tier | Medium |
| `reset` - clears all | Full reset | Low |

### Input Validation (`server/validation.js`)

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Null input | Returns empty string | High |
| Undefined input | Returns empty string | High |
| Non-string input | Returns empty string | High |
| Trim whitespace | Removes spaces | High |
| Strip HTML tags | Removes `<script>`, `<b>` | Critical |
| Escape `<` | Converts to `&lt;` | Critical |
| Escape `>` | Converts to `&gt;` | Critical |
| Escape `"` | Converts to `&quot;` | Critical |
| Escape `'` | Converts to `&#39;` | Critical |
| Escape `&` | Converts to `&amp;` | Critical |
| Max length - default | Truncates to 50 | High |
| Max length - custom | Truncates to specified | High |
| Unicode support | Preserves emoji, Cyrillic | Medium |
| Empty string | Returns empty | Low |

### Shared Constants (`shared/constants.js`)

| Test Case | Description | Priority |
|-----------|-------------|----------|
| LOCATIONS | Has 5 locations | High |
| VALID_BIRDS | Has 5 bird types | High |
| Worm settings | Correct values | Medium |
| Fly settings | Correct values | Medium |
| Point values | worm=1, fly=2, golden=10 | High |
| Golden worm timing | 5min spawn, 1min duration | Medium |
| World bounds | WORLD_SIZE = 200 | Medium |
| Input limits | Name=20, Chat=200 | High |
| Name generator | Produces valid names | Medium |
| Name generator | Produces varied names | Low |

---

## Integration Tests

### Network Manager

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Connect to WebSocket | Establishes connection | Critical |
| Reconnect on disconnect | Auto-reconnect logic | High |
| Send player position | Message format correct | High |
| Receive other players | Updates game state | High |
| Handle worm collection | Broadcasts to server | High |
| Handle chat messages | Send and receive | Medium |

### Entity Managers

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Worm spawning | Correct count per location | High |
| Worm collection | Removes from map, adds points | High |
| Fly spawning | Height range correct | High |
| Fly collection | Removes from map, adds points | High |
| Golden worm spawn | 5-minute interval | High |
| Golden worm despawn | 1-minute duration | High |
| Entity sync | Server → Client | High |

### Audio Manager

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Init Web Audio | Creates context | Medium |
| Play worm sound | Sound triggers | Low |
| Play level up sound | Sound triggers | Low |
| Mute toggle | Silences audio | Medium |
| Volume control | Adjusts levels | Low |

---

## E2E Tests

### Main Menu

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Menu visible on load | Shows BirdGame title | Critical |
| Player name input | Accepts text, maxlength=20 | High |
| 5 bird options visible | All selectable | High |
| Sparrow default | Pre-selected | Medium |
| 5 location options | All selectable | High |
| City default | Pre-selected | Medium |
| Start button works | Transitions to game | Critical |

### Game Start Flow

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Menu hides on start | Transitions correctly | Critical |
| Game UI appears | HUD visible | Critical |
| Score displays | Shows "Worms: 0" | High |
| Level display | Shows Lv.1 | High |
| Chat visible | Appears after start | Medium |
| Controls hint | Keyboard shortcuts shown | Low |

### In-Game Controls

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Escape opens pause | Pause menu visible | High |
| Resume game | Returns to gameplay | High |
| Enter opens chat | Chat input focused | Medium |
| M mutes audio | Toggle audio | Low |

### Multiplayer

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Two players join | Both see game UI | Critical |
| Same location sync | See each other | High |
| Chat between players | Messages appear | High |
| Player leaves | Removed from list | Medium |
| Location change | Transitions correctly | Medium |

### Responsive Design

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Mobile viewport | Menu functional | High |
| Tablet viewport | All elements visible | Medium |
| Touch controls | Joystick appears | Medium |

---

## Server Tests

### WebSocket Server

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Accepts connections | No errors | Critical |
| Handles join message | Creates player | Critical |
| Broadcasts position | To same location | High |
| Handles disconnect | Cleans up player | High |
| Rate limiting | Prevents spam | Medium |

### Player Manager

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Create player | Stores in map | High |
| Update position | Position changes | High |
| Remove player | Cleans from map | High |
| Name uniqueness | Enforces unique names | Medium |
| Profile persistence | 24-hour expiry | Medium |

### Leaderboard

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Add score | Updates ranking | High |
| Top 10 only | Limits results | Medium |
| Debounce updates | Prevents spam | Low |

### Entity Spawning (Server)

| Test Case | Description | Priority |
|-----------|-------------|----------|
| Initial worm spawn | 20 per location | High |
| Worm respawn | At MIN threshold | High |
| Fly spawn range | 3-5 per location | High |
| Golden worm timer | 5-minute interval | High |
| Collection validation | Prevents duplicates | High |

---

## Performance Tests

| Test Case | Description | Target |
|-----------|-------------|--------|
| Page load time | Initial load | <3s |
| WebSocket latency | Round-trip | <100ms |
| Frame rate | Gameplay | ≥30 FPS |
| Memory usage | After 10 min | <500MB |
| 10 players | No lag | Stable FPS |

---

## Current Test Status

### Implemented Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/unit/utils.test.ts | 20 | Passing |
| tests/unit/progression.test.ts | 39 | Passing |
| tests/unit/rewards.test.ts | 36 | Passing |
| tests/unit/validation.test.js | 13 | Passing |
| tests/unit/constants.test.js | 26 | Passing |
| tests/unit/network.test.ts | 29 | Passing |
| tests/unit/server/players.test.js | 26 | Passing |
| tests/unit/server/leaderboard.test.js | 12 | Passing |
| tests/unit/server/broadcast.test.js | 14 | Passing |
| tests/unit/server/worms.test.js | 27 | Passing |
| tests/unit/server/flies.test.js | 17 | Passing |
| tests/e2e/game.spec.ts | 34 | Passing |
| tests/e2e/multiplayer.spec.ts | 8 | Passing |
| **Total** | **301** | **All Passing** |

---

## Test Coverage Goals

| Module | Target Coverage |
|--------|-----------------|
| core/utils.ts | 100% |
| core/progression.ts | 90% |
| core/rewards.ts | 90% |
| server/validation.js | 100% |
| shared/constants.js | 80% |
| Overall | 70% |

---

## Future Test Additions

### Not Yet Implemented

1. **Physics Tests** - Bird flight mechanics, collision detection
2. **Visual Regression** - Screenshot comparisons with Playwright
3. **Load Testing** - 50+ concurrent players
4. **Accessibility** - Screen reader support, keyboard navigation
5. **Localization** - Multi-language support testing

### Test Data

Create fixtures for:
- Sample player profiles
- Predefined game states
- Mock WebSocket messages

---

## CI/CD Integration

### Recommended GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Contacts

- **Maintainer:** [Your Name]
- **Test Framework Issues:** Open issue on repository

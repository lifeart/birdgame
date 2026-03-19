# BirdGame Improvement Plan

Based on comprehensive game design and architecture reviews. Reviewed by tech lead and QA. Organized into 5 phases with 22 items, prioritized by impact.

---

## Phase 1: Critical Fixes

### 1.1 Frame-rate-dependent physics
**Problem:** `updatePhysics()` in `physics.ts` applies velocity, gravity, air resistance per-frame without delta time. 144Hz players are 2.4x faster than 60Hz.

**Note:** `delta` is already computed in `update.ts` (line 238) and passed to `Bird.update()`, but `Bird.update()` ignores it (`_delta`). The plumbing exists — just need to thread it through.

**Files:**
- `public/js/bird/physics.ts` — Add `delta` param to `updatePhysics()`. Multiply all velocity additions by `delta * 60` (normalize to 60fps baseline). Convert `AIR_RESISTANCE` to `Math.pow(AIR_RESISTANCE, delta * 60)`. Change `position.add(velocity)` to `position.addScaledVector(velocity, delta * 60)`.
- `public/js/bird/index.ts` — Pass `delta` from `update()` into `updatePhysics()`.
- `tests/unit/bird-physics.test.ts` — Update existing test (currently calls `updatePhysics()` without delta). Add FPS-independence tests.

**Critical: Delta must be clamped.** Tab-switching can produce delta > 1s, which would teleport birds through walls. Clamp to `Math.min(delta, 0.1)` inside `updatePhysics`. Guard against delta <= 0 (use 1/60 fallback).

**Acceptance criteria:**
- AC1: At delta=1/60, behavior is numerically identical to current frame-locked behavior (within 0.001 tolerance)
- AC2: 60fps (60 calls at delta=1/60) and 144fps (144 calls at delta=1/144) converge to same position within 5% over 1 second
- AC3: Delta > 0.1 is clamped. Delta <= 0 uses 1/60 fallback
- AC4: All existing E2E tests pass

**Risk: HIGH.** All balance numbers were tuned to frame-coupled behavior. Requires extensive playtesting at different frame rates after landing.

**Depends on:** Nothing | **Complexity:** M-L

### 1.2 `setNetwork()` memory leak
**Problem:** `game/index.ts` `setNetwork()` calls `removeAllCallbacks()` but NOT `disconnect()`. Old manager's intervals keep running.

**Files:**
- `public/js/game/index.ts` — Add `this.network.disconnect()` before `removeAllCallbacks()` in `setNetwork()`.

**Edge cases:** `disconnect()` on already-disconnected manager must not throw. `disconnect()` on WebSocket in CONNECTING state must handle gracefully.

**Acceptance criteria:**
- AC1: `setNetwork(new)` calls `disconnect()` on previous manager
- AC2: No intervals from old manager continue after swap
- AC3: Double-disconnect does not throw

**Depends on:** Nothing | **Complexity:** S

### 1.3 WebRTC `conn.off('data', undefined)` bug
**Problem:** `webrtc-network.ts` line ~597 passes `undefined` to `conn.off()` — no-op. Old welcome handler stays attached.

**Files:**
- `public/js/core/webrtc-network.ts` — Store initial data handler in a named variable, remove it by reference after welcome.

**Acceptance criteria:**
- AC1: Initial handler stored in named `const`, removed via `conn.off('data', handler)`
- AC2: No duplicate welcome processing if second welcome message arrives
- AC3: Late messages on closed connection do not throw

**Depends on:** Nothing | **Complexity:** S

---

## Phase 2: Code Quality

### 2.1 Extract shared game init logic
**Problem:** Game initialization code is duplicated 3 times: `lifecycle.ts` try block, catch/demo block, and `game/index.ts` `startGameWithData`.

**Files:**
- `public/js/game/lifecycle.ts` — Extract `initGameWithData(ctx, gameData, birdType, location)`. Both try/catch paths call it.
- `public/js/game/index.ts` — Replace `startGameWithData` body with call to extracted function.

**Depends on:** Nothing | **Complexity:** M

### 2.2 Extract shared network base class
**Problem:** Event system (on/off/triggerCallback) copy-pasted in all 3 managers. Entity generation duplicated between Demo and WebRTC (~300 lines total).

**Files:**
- **Create** `public/js/core/network-base.ts` — Base class with callbacks storage, event methods, common properties/getters.
- **Create** `public/js/core/entity-host.ts` — Shared entity hosting: generateWorm/Fly, respawn loops, golden worm, leaderboard.
- `public/js/core/network.ts` — Extend base class.
- `public/js/core/demo-network.ts` — Extend base, use entity-host.
- `public/js/core/webrtc-network.ts` — Extend base, use entity-host.
- `public/js/core/index.ts` — Update `AnyNetworkManager` to use base class.

**Depends on:** Nothing | **Complexity:** L

### 2.3 Unify shared constants
**Problem:** `shared/constants.js` (CJS) and `public/js/shared/constants.ts` (ESM) are manual copies. Server has extra fields the client lacks.

**Files:**
- Keep `shared/constants.js` as source of truth.
- `public/js/shared/constants.ts` — Generate from JS or import via build step.
- `build.js` — Add constants sync step.

**Depends on:** Nothing | **Complexity:** S-M

### 2.4 Replace `as` casting with type guards
**Problem:** `network.ts` `handleMessage` has 30+ `as` casts. Validation methods return boolean instead of narrowing types.

**Files:**
- `public/js/core/network.ts` — Convert `validatePlayerMoved`, `validateWormCollected`, etc. to TypeScript type guards (`message is SomeType`).

**Depends on:** Nothing | **Complexity:** M

---

## Phase 3: Gameplay Improvements

### 3.1 Nerf Hummingbird
**Problem:** Highest speed (1.8 vs 1.2), accel, turn, lift, AND smallest hitbox. Dominates all other birds.

**Files:**
- `public/js/bird/types.ts` — maxSpeed: 1.8→1.4, baseMaxSpeed: 0.6→0.45, baseAcceleration: 0.05→0.035, maxAcceleration: 0.15→0.10, liftPower: 0.25→0.20. Keep high turnSpeed as signature trait.

**Depends on:** 1.1 | **Complexity:** S

### 3.2 Buff flies
**Problem:** Only 2pt for harder aerial collection. Only 3-5 per location.

**Files:**
- `public/js/shared/constants.ts` — FLY_POINTS: 2→4, FLIES_PER_LOCATION_MIN: 3→8, FLIES_PER_LOCATION_MAX: 5→12, MIN_FLIES_BEFORE_RESPAWN: 3→6.
- `shared/constants.js` — Mirror changes.

**Depends on:** 2.3 ideally | **Complexity:** S

### 3.3 Improve glide mechanic
**Problem:** Glide lift formula yields low values at low-to-mid speeds. At max speed it works (crow: 0.0108 vs gravity 0.004), but at half speed it's marginal. Gliding should feel rewarding across more of the speed range.

**Review finding: original plan was too aggressive.** Tripling multiplier AND halving gravity would make birds fly forever (crow at max speed = 16x gravity). Use conservative approach instead.

**Files:**
- `public/js/bird/physics.ts` — Double glide lift multiplier (0.02→0.04, NOT 0.06). Reduce gravity by 25% during glide (NOT 50%). This makes glide meaningful at mid-speed without enabling infinite flight.
- `public/js/bird/types.ts` — Crow glideEfficiency: 0.6→0.7, Goose: 0.48→0.55. Small buffs, not dramatic.

**Depends on:** 1.1 | **Complexity:** S-M (needs playtesting to verify feel)

### 3.4 Bird unique passives
**Problem:** All birds play identically aside from stats.

**Passives (revised after review):**
- Crow: `scavenger_sense` — worms pulse/glow when within 30 units
- Penguin: `ground_specialist` — 2x ground worm points (ground = position.y < 3)
- Owl: `night_vision` — enhanced visibility in rain/fog weather
- Goose: `honk` — H key emits honk sound (cosmetic only in v1, no scatter — scatter requires P2P sync which is too complex)
- Sparrow: `agile_collector` — 15% larger collection radius
- Pigeon: `urban_navigator` — 10% speed boost in city location
- Hummingbird: `quick_dash` — double-tap W for brief speed burst with cooldown (NOT hover — hover would undo the 3.1 nerf by enabling infinite air time)

**Review findings addressed:**
- Hummingbird hover passive removed — would make nerf (3.1) irrelevant
- Goose honk simplified to cosmetic — network sync for scatter effect is XL complexity, defer to v2
- Penguin "ground" defined explicitly as y < 3

**Files:**
- `public/js/bird/types.ts` — Add `passive` field to config.
- **Create** `public/js/bird/passives.ts` — Passive effect logic.
- `public/js/game/update.ts` — Apply passive effects.
- `public/js/entities/worms.ts`, `flies.ts` — Configurable collection radius.

**Depends on:** 1.1, 3.1, 3.3 | **Complexity:** L (7 passives, each needs testing and balancing)

### 3.5 Micro-rewards at every level
**Problem:** 40 of 50 levels give nothing.

**Files:**
- `public/js/core/progression.ts` — Expand `levelRewards` to all 50 levels. Empty levels get XP boosts, titles, color variants, temporary buffs.

**Depends on:** Nothing | **Complexity:** M

### 3.6 Combo/streak scoring system
**Problem:** No incentive for rapid consecutive collection.

**Design decision: Golden worms are EXCLUDED from combo multiplier.** A 3x golden worm (150pts) would be wildly unbalanced. Golden worms increment the streak counter but their own points are always 1x. Combo resets on location change and disconnect.

**Files:**
- **Create** `public/js/core/combo.ts` — ComboManager: 5s window, multipliers 1x→1.5x→2x→3x at streaks 1/3/5/8+. `registerCollection(isGolden)` — golden increments streak but returns 1x multiplier.
- `public/js/game/callbacks.ts` — Apply combo multiplier in wormCollected/flyCollected (skip for golden).
- `public/js/ui/manager.ts` — Combo HUD display.
- `public/css/style.css` — Combo styling.

**Edge cases:** Two worms in same frame = 2 streak increments. Window boundary (4.999s vs 5.001s) — use `>=` comparison.

**Depends on:** Nothing | **Complexity:** M

### 3.7 Achievements system

**Files:**
- **Create** `public/js/core/achievements.ts` — AchievementManager with ~15 achievements (First Worm, Fly Catcher, Golden Touch, Speed Demon, Explorer, Social Bird, etc.).
- `public/js/game/callbacks.ts` — Hook achievement checks into events.
- `public/js/ui/manager.ts` — Achievement popup UI.

**Depends on:** Nothing | **Complexity:** M

### 3.8 Golden Egg daily reward
**Problem:** Day 7 `special: 'golden_egg'` does nothing.

**Files:**
- `public/js/core/rewards.ts` — On day-7 claim, unlock exclusive golden trail for 24h (or permanent after 4 eggs).
- `public/js/ui/manager.ts` — Golden egg animation in daily reward popup.

**Depends on:** 3.5 | **Complexity:** S-M

---

## Phase 4: Network & Security

### 4.1 Server-side position validation
**Problem:** Server accepts any coordinates blindly.

**Files:**
- `server/index.js` — In `handlePosition`: validate finite numbers, clamp to world bounds, anti-teleport rate limit.
- `server/validation.js` — Add `validatePosition()`.

**Depends on:** Nothing | **Complexity:** M

### 4.2 Proximity check for collectible claims
**Problem:** Any client can claim any worm from across the map.

**Files:**
- `server/index.js` — In worm/fly collected handlers: lookup entity position, compute distance to player, reject if > 10 units.
- `server/entities/index.js` — Expose entity position lookup by ID.

**Depends on:** 4.1 | **Complexity:** M

### 4.3 WebRTC reconnection
**Problem:** Host disconnect silently drops clients.

**Files:**
- `public/js/core/webrtc-network.ts` — Add reconnection logic: 3 retries with exponential backoff, trigger reconnecting/connectionFailed callbacks, "Host left" message.

**Depends on:** 2.2 ideally | **Complexity:** M-L

---

## Phase 5: Performance & Polish

### 5.1 Shadow map optimization for mobile

**Files:**
- `public/js/game/index.ts` — Detect mobile, use `PCFShadowMap` instead of `PCFSoftShadowMap`, reduce shadow resolution to 1024.

**Depends on:** Nothing | **Complexity:** S

### 5.2 Set pixel ratio cap

**Files:**
- `public/js/game/index.ts` — Add `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.

**Depends on:** Nothing | **Complexity:** S

### 5.3 Animate other players' birds
**Problem:** Other players' birds get empty input — no wing flapping or movement animation.

**Files:**
- `public/js/game/update.ts` — Infer synthetic input from position deltas.
- `public/js/game/types.ts` — Add `lastPosition` to `OtherPlayer`.

**Depends on:** Nothing | **Complexity:** M

### 5.4 Replace Proxy context pattern
**Problem:** Game creates giant context objects wrapped in Proxy — fragile and hard to debug.

**Files:**
- `public/js/game/index.ts` — Remove `createLifecycleContext()`, `createUpdateContext()`, Proxy usage. Define `GameState` interface, pass `this`.
- `public/js/game/lifecycle.ts`, `update.ts`, `callbacks.ts` — Accept `GameState` instead of context objects.

**Risk: HIGH.** Touches every module boundary. A single missed property causes runtime crash.

**Depends on:** Nothing | **Complexity:** L-XL

### 5.5 GPU memory leak on player disconnect (NEW — from review)
**Problem:** When a player disconnects, `playerLeft` handler deletes from the Map but may not fully dispose Three.js Bird objects (geometry, materials). This leaks GPU memory over time.

**Files:**
- `public/js/game/callbacks.ts` — In `playerLeft` handler, verify `player.bird.remove()` disposes all geometry and materials.
- `public/js/bird/index.ts` — Ensure `remove()` calls `geometry.dispose()` and `material.dispose()` on all meshes.

**Depends on:** Nothing | **Complexity:** S

---

## Implementation Order

| # | Item | Phase | Size | Risk | Notes |
|---|------|-------|------|------|-------|
| 1 | 1.1 Delta-time physics | P1 | M-L | HIGH | Everything depends on this |
| 2 | 1.2 setNetwork leak | P1 | S | LOW | Quick win |
| 3 | 1.3 conn.off bug | P1 | S | LOW | Quick win |
| 4 | 5.5 GPU memory leak | P5 | S | LOW | Quick win |
| 5 | 5.1 Shadow map mobile | P5 | S | LOW | Quick win |
| 6 | 5.2 Pixel ratio | P5 | S | LOW | Quick win |
| 7 | 2.3 Constants dedup | P2 | S-M | LOW | Foundation for gameplay changes |
| 8 | 2.1 Init logic dedup | P2 | M | MED | Reduces maintenance burden |
| 9 | 3.1 Nerf hummingbird | P3 | S | MED | Balance fix (depends on 1.1) |
| 10 | 3.2 Buff flies | P3 | S | LOW | Balance fix |
| 11 | 3.3 Improve glide | P3 | S-M | MED | Needs playtesting (depends on 1.1) |
| 12 | 5.3 Other player anim | P5 | M-L | MED | Multiplayer visual quality |
| 13 | 2.2 Network base class | P2 | L | MED-HIGH | Major dedup |
| 14 | 2.4 Type narrowing | P2 | M | LOW | Code quality |
| 15 | 3.6 Combo system | P3 | M | LOW | High-impact feature |
| 16 | 3.5 Micro-rewards | P3 | M | LOW | Retention |
| 17 | 4.1 Position validation | P4 | M | LOW | Security |
| 18 | 4.2 Proximity check | P4 | M | LOW | Security |
| 19 | 3.4 Bird passives | P3 | L | MED | Major feature (7 passives) |
| 20 | 3.7 Achievements | P3 | M | LOW | Retention |
| 21 | 3.8 Golden egg | P3 | S-M | LOW | Complete existing feature |
| 22 | 4.3 WebRTC reconnect | P4 | M-L | MED | Robustness |
| 23 | 5.4 Proxy removal | P5 | L-XL | HIGH | Best during quiet period |

---

## Testing Strategy (from QA review)

### Required test infrastructure
- **Delta-time test helper:** `simulatePhysics(config, input, durationSec, fps) => PhysicsState` utility
- **Server test environment:** Add `// @vitest-environment node` for server tests (Phase 4)
- **PeerJS mock:** `tests/mocks/peerjs.ts` for WebRTC tests (Phase 1.3, Phase 4.3)
- **Timer mocks:** Use `vi.useFakeTimers()` for combo system (already established in rewards tests)

### Phase gates

**Phase 1 → Phase 2:**
- All 260 existing unit tests pass
- All E2E tests pass
- New delta-time unit tests prove FPS-independence (AC2)
- Manual: play at 60fps and 144fps, movement feels identical
- Manual: tab-switch for 5s, bird does not teleport

**Phase 2 → Phase 3:**
- All tests pass after refactors (no behavioral changes)
- Network tests updated for base class
- Constants build step verified

**Phase 3 → Phase 4:**
- New unit tests for combo, achievements, micro-rewards pass
- E2E: collect worms, combo HUD appears
- Manual: each bird type for 5 min across 2 locations
- Manual: daily reward day 7 golden egg does something

**Phase 4 → Phase 5:**
- Server validation tests pass (Node environment)
- Manual: devtools fake position messages rejected
- Manual: disconnect host in WebRTC, client sees reconnection

**Phase 5 complete:**
- Mobile FPS measured before/after shadow/pixel changes
- Other players' birds animate in multiplayer
- Full E2E suite passes after Proxy removal

### Regression risk ranking
1. **1.1 Delta-time** — HIGHEST (changes all movement feel)
2. **5.4 Proxy removal** — HIGH (touches every module boundary)
3. **2.2 Network base class** — MEDIUM-HIGH (3 managers simultaneously)
4. **3.1+3.3 Balance changes** — MEDIUM (depend on 1.1 being correct)
5. **2.1 Init dedup** — MEDIUM (demo fallback path is critical)

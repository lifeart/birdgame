// Game update loop module - handles frame updates and rendering
import * as THREE from 'three';
import type { NetworkManager } from '../core/network.ts';
import type { DemoNetworkManager } from '../core/demo-network.ts';
import type { AudioManager } from '../core/audio.ts';
import type { UIManager } from '../ui/manager.ts';
import type { TouchControls } from '../ui/touch.ts';
import type { WormManager, FlyManager } from '../entities/index.ts';
import type { EffectsManager, AmbientParticleSystem } from '../effects/index.ts';
import type { WeatherSystem } from '../environment/index.ts';
import type { World } from '../world/index.ts';
import type { Bird } from '../bird/index.ts';
import type { InputState, CameraOrbitState, MergedInput, OtherPlayer } from './types.ts';
import type { CameraMode } from '../ui/index.ts';
import { GAME_CONSTANTS } from './types.ts';
import { getMergedInput } from './input.ts';
import { updateCamera, handleCameraKeyInput, getCameraWorldAngle } from './camera.ts';

// Context interface for update operations
export interface UpdateContext {
    // State
    paused: boolean;
    isRunning: boolean;
    goldenWormAlertShown: boolean;
    lastPositionUpdate: number;
    positionUpdateInterval: number;
    collisionStartTime: number | null;
    collisionRespawnDelay: number;

    // Input
    input: InputState;
    cameraOrbit: CameraOrbitState;
    cameraMode: CameraMode;

    // THREE.js objects
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    clock: THREE.Clock;

    // Managers
    network: NetworkManager | DemoNetworkManager | null;
    ui: UIManager | null;
    audioManager: AudioManager;
    wormManager: WormManager | null;
    flyManager: FlyManager | null;
    effectsManager: EffectsManager | null;
    ambientParticles: AmbientParticleSystem | null;
    weatherSystem: WeatherSystem | null;
    world: World | null;
    touchControls: TouchControls | null;
    playerBird: Bird | null;
    otherPlayers: Map<string, OtherPlayer>;

    // Animation
    animationFrameId: number | null;

    // Setters
    setCameraMode: (mode: CameraMode) => void;
    setGoldenWormAlertShown: (shown: boolean) => void;
    setLastPositionUpdate: (time: number) => void;
    setCollisionStartTime: (time: number | null) => void;
    setAnimationFrameId: (id: number | null) => void;
    setIsRunning: (running: boolean) => void;

    // Methods
    respawnPlayer: () => void;
}

export function update(ctx: UpdateContext, delta: number): void {
    if (ctx.paused || !ctx.playerBird) return;

    const time = ctx.clock.getElapsedTime();

    const mergedInput: MergedInput = getMergedInput(ctx.input, ctx.touchControls);

    // Get camera angle for GTA-style movement
    const cameraAngle = getCameraWorldAngle(ctx.cameraOrbit);

    ctx.playerBird.update(mergedInput, delta, cameraAngle);

    // Clear mouse delta (not used in GTA mode, but kept for compatibility)
    ctx.input.mouseDeltaX = 0;
    ctx.input.mouseDeltaY = 0;

    if (mergedInput.up > 0) {
        ctx.audioManager?.playFlap();
    }

    if (Math.random() < 0.002) {
        ctx.audioManager?.playChirp();
    }

    // Check collisions
    if (ctx.world) {
        const radius = ctx.playerBird.getCollisionRadius();
        let hitObject = ctx.world.checkCollision(ctx.playerBird.position, radius);
        if (hitObject) {
            // Store original hit type for audio before potentially clearing it
            const originalHitObject = hitObject;

            // Iterative collision resolution - back up in small steps until clear
            const stepSize = 0.1;
            const maxSteps = 10;
            let steps = 0;
            const velocityLength = ctx.playerBird.velocity.length();

            if (velocityLength > 0.001) {
                // Normal case: back up along velocity direction
                const backupVector = ctx.playerBird.velocity.clone().normalize().multiplyScalar(stepSize);
                while (hitObject && steps < maxSteps) {
                    ctx.playerBird.position.sub(backupVector);
                    hitObject = ctx.world.checkCollision(ctx.playerBird.position, radius);
                    steps++;
                }
            } else {
                // Zero velocity case: move up to escape collision
                while (hitObject && steps < maxSteps) {
                    ctx.playerBird.position.y += stepSize;
                    hitObject = ctx.world.checkCollision(ctx.playerBird.position, radius);
                    steps++;
                }
            }

            ctx.playerBird.velocity.multiplyScalar(-0.3);
            ctx.audioManager?.playCollision(originalHitObject);

            if (!ctx.collisionStartTime) {
                ctx.setCollisionStartTime(Date.now());
            } else if (Date.now() - ctx.collisionStartTime > ctx.collisionRespawnDelay) {
                ctx.respawnPlayer();
            }
        } else {
            ctx.setCollisionStartTime(null);
        }
    }

    // Update camera controls from keyboard
    const newCameraMode = handleCameraKeyInput(ctx.input, ctx.cameraOrbit, ctx.cameraMode);
    ctx.setCameraMode(newCameraMode);

    // Update camera (GTA-style: no pointer lock needed)
    // Pass bird dynamics for cinematic camera during turns
    if (ctx.camera && ctx.playerBird) {
        updateCamera(
            ctx.camera,
            ctx.cameraOrbit,
            ctx.cameraMode,
            ctx.playerBird.position,
            ctx.playerBird.rotation,
            ctx.playerBird.getVisualRotation(),
            ctx.playerBird.rotationVelocity,
            ctx.playerBird.horizontalSpeed,
            ctx.playerBird.currentMaxSpeed
        );
    }

    // Check worm collection
    if (ctx.wormManager && ctx.network) {
        const radius = ctx.playerBird.getCollisionRadius();
        const collectedWorms = ctx.wormManager.checkCollection(
            ctx.playerBird.position,
            radius
        );
        collectedWorms.forEach((wormData) => {
            ctx.network!.sendWormCollected(wormData.id, wormData.isGolden);
        });
    }

    // Check fly collection
    if (ctx.flyManager && ctx.network) {
        const radius = ctx.playerBird.getCollisionRadius();
        const collectedFlies = ctx.flyManager.checkCollection(
            ctx.playerBird.position,
            radius
        );
        collectedFlies.forEach((flyId: string) => {
            ctx.network!.sendFlyCollected(flyId);
        });
    }

    // Update animations
    ctx.wormManager?.update(time);
    ctx.flyManager?.update(time);
    ctx.world?.update(time);
    ctx.weatherSystem?.update(delta, time);

    // Update visual effects
    if (ctx.effectsManager) {
        ctx.effectsManager.update(delta);
        ctx.effectsManager.updateParticles(delta);

        if (ctx.playerBird && ctx.effectsManager.hasTrail('player')) {
            ctx.effectsManager.updateTrail('player', ctx.playerBird.position, ctx.playerBird.velocity);
        }
    }

    // Update ambient particles
    if (ctx.ambientParticles && ctx.camera) {
        ctx.ambientParticles.update(delta, ctx.camera.position, time);
    }

    // Check for golden worm spawn
    if (ctx.wormManager?.hasGoldenWorm() && !ctx.goldenWormAlertShown) {
        ctx.ui?.showGoldenWormAlert(ctx.audioManager);
        ctx.setGoldenWormAlertShown(true);
    } else if (!ctx.wormManager?.hasGoldenWorm()) {
        ctx.setGoldenWormAlertShown(false);
    }

    // Update other players (neutral input - they only need animation updates, not movement)
    ctx.otherPlayers.forEach(player => {
        if (player.bird) {
            player.bird.update({} as MergedInput, delta);
        }
    });

    // Send position to server
    if (ctx.network?.isConnected()) {
        const now = Date.now();
        if (now - ctx.lastPositionUpdate > ctx.positionUpdateInterval) {
            ctx.network.sendPosition(
                ctx.playerBird.position.x,
                ctx.playerBird.position.y,
                ctx.playerBird.position.z,
                ctx.playerBird.rotation
            );
            ctx.setLastPositionUpdate(now);
        }
    }
}

export function animate(ctx: UpdateContext): void {
    if (!ctx.isRunning) return;

    ctx.setAnimationFrameId(requestAnimationFrame(() => animate(ctx)));

    const rawDelta = ctx.clock.getDelta();
    const delta = Math.max(GAME_CONSTANTS.MIN_DELTA, Math.min(GAME_CONSTANTS.MAX_DELTA, rawDelta));
    update(ctx, delta);
    if (ctx.renderer && ctx.scene && ctx.camera) {
        ctx.renderer.render(ctx.scene, ctx.camera);
    }
}

export function stopAnimation(ctx: UpdateContext): void {
    ctx.setIsRunning(false);
    if (ctx.animationFrameId) {
        cancelAnimationFrame(ctx.animationFrameId);
        ctx.setAnimationFrameId(null);
    }
}

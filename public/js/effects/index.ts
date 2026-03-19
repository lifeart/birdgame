// Visual Effects System - Trails, Auras, Particles
import * as THREE from 'three';
import { WeatherSystem } from '../environment/weather.ts';

interface TrailConfig {
    color: number;
    opacity: number;
    width: number;
    length: number;
    fadeSpeed: number;
    particles?: boolean;
    particleColor?: number;
    secondaryColor?: number;
    rainbow?: boolean;
}

interface AuraConfig {
    color?: number;
    colors?: number[];
    opacity: number;
    size: number;
    pulseSpeed: number;
    pulseAmount: number;
    rotateSpeed?: number;
    secondaryColor?: number;
    flickerSpeed?: number;
}

interface TrailPoint {
    x: number;
    y: number;
    z: number;
    age: number;
}

interface TrailParticle {
    mesh: THREE.Mesh;
    life: number;
    velocity: THREE.Vector3;
}

interface Trail {
    type: string;
    config: TrailConfig;
    points: TrailPoint[];
    mesh: THREE.Line;
    particles: TrailParticle[];
    birdGroup: THREE.Group;
}

interface AuraMesh extends THREE.Mesh {
    userData: { baseRotation?: number };
}

interface Aura {
    type: string;
    config: AuraConfig;
    meshes: AuraMesh[];
    birdGroup: THREE.Group;
    time: number;
}

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
}

interface SharedGeometries {
    trailParticle: THREE.SphereGeometry;
    burstParticle: THREE.SphereGeometry;
    burstParticleGolden: THREE.SphereGeometry;
    levelUpParticle: THREE.SphereGeometry;
    auraGlow: THREE.SphereGeometry;
    auraInnerGlow: THREE.SphereGeometry;
}

export class EffectsManager {
    private scene: THREE.Scene;
    private trails: Map<string, Trail> = new Map();
    private auras: Map<string, Aura> = new Map();
    private particles: Particle[] = [];
    private sharedGeometries: SharedGeometries | null = null;
    private trailParticleMaterials: Map<number, THREE.MeshBasicMaterial> = new Map();

    private trailConfigs: Record<string, TrailConfig> = {
        basic: {
            color: 0xFFFFFF,
            opacity: 0.5,
            width: 0.2,
            length: 20,
            fadeSpeed: 0.02
        },
        sparkle: {
            color: 0xFFD700,
            opacity: 0.7,
            width: 0.3,
            length: 25,
            fadeSpeed: 0.015,
            particles: true,
            particleColor: 0xFFFFAA
        },
        fire: {
            color: 0xFF4500,
            secondaryColor: 0xFFAA00,
            opacity: 0.8,
            width: 0.4,
            length: 30,
            fadeSpeed: 0.025,
            particles: true,
            particleColor: 0xFF6600
        },
        cosmic: {
            color: 0x9966FF,
            secondaryColor: 0x00FFFF,
            opacity: 0.6,
            width: 0.35,
            length: 35,
            fadeSpeed: 0.01,
            particles: true,
            particleColor: 0xFFFFFF,
            rainbow: true
        }
    };

    private auraConfigs: Record<string, AuraConfig> = {
        soft_glow: {
            color: 0xFFFFAA,
            opacity: 0.3,
            size: 1.5,
            pulseSpeed: 2,
            pulseAmount: 0.2
        },
        rainbow: {
            colors: [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x9400D3],
            opacity: 0.4,
            size: 2,
            rotateSpeed: 1,
            pulseSpeed: 1.5,
            pulseAmount: 0.15
        },
        lightning: {
            color: 0x00FFFF,
            secondaryColor: 0xFFFFFF,
            opacity: 0.5,
            size: 2.5,
            flickerSpeed: 10,
            pulseSpeed: 3,
            pulseAmount: 0.3
        }
    };

    static MAX_PARTICLES = 100;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this._initSharedGeometries();
    }

    private _initSharedGeometries(): void {
        this.sharedGeometries = {
            trailParticle: new THREE.SphereGeometry(0.1, 6, 6),
            burstParticle: new THREE.SphereGeometry(0.1, 6, 6),
            burstParticleGolden: new THREE.SphereGeometry(0.15, 6, 6),
            levelUpParticle: new THREE.SphereGeometry(0.2, 8, 8),
            auraGlow: new THREE.SphereGeometry(1, 16, 16),
            auraInnerGlow: new THREE.SphereGeometry(0.7, 16, 16)
        };
    }

    private getTrailParticleMaterial(color: number): THREE.MeshBasicMaterial {
        if (!this.trailParticleMaterials.has(color)) {
            this.trailParticleMaterials.set(color, new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0
            }));
        }
        return this.trailParticleMaterials.get(color)!;
    }

    createTrail(birdId: string, trailType: string, birdGroup: THREE.Group): void {
        if (this.trails.has(birdId)) {
            this.removeTrail(birdId);
        }

        const config = this.trailConfigs[trailType];
        if (!config) return;

        const positions = new Float32Array(config.length * 3);
        const colors = new Float32Array(config.length * 4);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            linewidth: 2
        });

        const mesh = new THREE.Line(geometry, material);
        mesh.frustumCulled = false;
        this.scene.add(mesh);

        const trail: Trail = {
            type: trailType,
            config: config,
            points: [],
            mesh: mesh,
            particles: [],
            birdGroup: birdGroup
        };

        if (config.particles && config.particleColor !== undefined) {
            const sharedMaterial = this.getTrailParticleMaterial(config.particleColor);
            for (let i = 0; i < 20; i++) {
                const particle = new THREE.Mesh(this.sharedGeometries!.trailParticle, sharedMaterial);
                particle.visible = false;
                this.scene.add(particle);
                trail.particles.push({
                    mesh: particle,
                    life: 0,
                    velocity: new THREE.Vector3()
                });
            }
        }

        this.trails.set(birdId, trail);
    }

    updateTrail(birdId: string, position: THREE.Vector3, velocity?: THREE.Vector3): void {
        const trail = this.trails.get(birdId);
        if (!trail) return;

        const config = trail.config;

        trail.points.unshift({
            x: position.x,
            y: position.y,
            z: position.z,
            age: 0
        });

        while (trail.points.length > config.length) {
            trail.points.pop();
        }

        const positions = trail.mesh.geometry.attributes.position.array as Float32Array;
        const colors = trail.mesh.geometry.attributes.color.array as Float32Array;

        for (let i = 0; i < config.length; i++) {
            const point = trail.points[i];
            if (point) {
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;

                const fade = 1 - (i / config.length);
                const color = new THREE.Color(config.color);

                if (config.rainbow) {
                    const hue = (i / config.length + Date.now() * 0.001) % 1;
                    color.setHSL(hue, 1, 0.5);
                }

                colors[i * 4] = color.r;
                colors[i * 4 + 1] = color.g;
                colors[i * 4 + 2] = color.b;
                colors[i * 4 + 3] = config.opacity * fade;

                point.age += config.fadeSpeed;
            } else {
                positions[i * 3] = position.x;
                positions[i * 3 + 1] = position.y;
                positions[i * 3 + 2] = position.z;
                colors[i * 4 + 3] = 0;
            }
        }

        trail.mesh.geometry.attributes.position.needsUpdate = true;
        trail.mesh.geometry.attributes.color.needsUpdate = true;

        if (config.particles && velocity) {
            const speed = velocity.length();
            if (speed > 0.1) {
                for (const particle of trail.particles) {
                    if (particle.life <= 0) {
                        particle.mesh.position.copy(position);
                        particle.mesh.visible = true;
                        particle.life = 1;
                        particle.velocity.set(
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1 + 0.05,
                            (Math.random() - 0.5) * 0.1
                        );
                        // Use scale for fade effect since material is shared
                        particle.mesh.scale.setScalar(1);
                        break;
                    }
                }
            }

            for (const particle of trail.particles) {
                if (particle.life > 0) {
                    particle.life -= 0.02;
                    particle.mesh.position.add(particle.velocity);
                    particle.velocity.y -= 0.002;
                    // Use scale for fade effect since material is shared
                    particle.mesh.scale.setScalar(particle.life);

                    if (particle.life <= 0) {
                        particle.mesh.visible = false;
                    }
                }
            }
        }
    }

    hasTrail(birdId: string): boolean {
        return this.trails.has(birdId);
    }

    removeTrail(birdId: string): void {
        const trail = this.trails.get(birdId);
        if (trail) {
            this.scene.remove(trail.mesh);
            trail.mesh.geometry.dispose();
            (trail.mesh.material as THREE.Material).dispose();

            for (const particle of trail.particles) {
                this.scene.remove(particle.mesh);
                // Don't dispose shared materials - they're managed by trailParticleMaterials
            }

            this.trails.delete(birdId);
        }
    }

    createAura(birdId: string, auraType: string, birdGroup: THREE.Group): void {
        if (this.auras.has(birdId)) {
            this.removeAura(birdId);
        }

        const config = this.auraConfigs[auraType];
        if (!config) return;

        const aura: Aura = {
            type: auraType,
            config: config,
            meshes: [],
            birdGroup: birdGroup,
            time: 0
        };

        if (auraType === 'rainbow' && config.colors) {
            for (let i = 0; i < config.colors.length; i++) {
                const ringGeom = new THREE.TorusGeometry(
                    config.size * (0.8 + i * 0.1),
                    0.05,
                    8,
                    32
                );
                const ringMat = new THREE.MeshBasicMaterial({
                    color: config.colors[i],
                    transparent: true,
                    opacity: config.opacity
                });
                const ring = new THREE.Mesh(ringGeom, ringMat) as AuraMesh;
                ring.rotation.x = Math.PI / 2;
                ring.userData.baseRotation = i * (Math.PI / config.colors.length);
                birdGroup.add(ring);
                aura.meshes.push(ring);
            }
        } else {
            const glowMat = new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: config.opacity
            });
            const glow = new THREE.Mesh(this.sharedGeometries!.auraGlow, glowMat) as AuraMesh;
            glow.scale.setScalar(config.size);
            birdGroup.add(glow);
            aura.meshes.push(glow);

            if (config.secondaryColor) {
                const innerGlowMat = new THREE.MeshBasicMaterial({
                    color: config.secondaryColor,
                    transparent: true,
                    opacity: config.opacity * 0.5
                });
                const innerGlow = new THREE.Mesh(this.sharedGeometries!.auraInnerGlow, innerGlowMat) as AuraMesh;
                innerGlow.scale.setScalar(config.size);
                birdGroup.add(innerGlow);
                aura.meshes.push(innerGlow);
            }
        }

        this.auras.set(birdId, aura);
    }

    updateAura(birdId: string, deltaTime: number): void {
        const aura = this.auras.get(birdId);
        if (!aura) return;

        aura.time += deltaTime;
        const config = aura.config;

        if (aura.type === 'rainbow' && config.rotateSpeed !== undefined) {
            aura.meshes.forEach((ring, i) => {
                ring.rotation.z = aura.time * config.rotateSpeed! + (ring.userData.baseRotation || 0);
                const pulse = 1 + Math.sin(aura.time * config.pulseSpeed + i * 0.5) * config.pulseAmount;
                ring.scale.set(pulse, pulse, 1);
            });
        } else if (aura.type === 'lightning') {
            const flicker = Math.random() > 0.9 ? 1.5 : 1;
            const pulse = 1 + Math.sin(aura.time * config.pulseSpeed) * config.pulseAmount;

            aura.meshes.forEach((mesh) => {
                mesh.scale.set(pulse * flicker, pulse * flicker, pulse * flicker);
                (mesh.material as THREE.MeshBasicMaterial).opacity = config.opacity * (0.5 + Math.random() * 0.5);
            });
        } else {
            const pulse = 1 + Math.sin(aura.time * config.pulseSpeed) * config.pulseAmount;
            aura.meshes.forEach(mesh => {
                mesh.scale.set(pulse, pulse, pulse);
            });
        }
    }

    removeAura(birdId: string): void {
        const aura = this.auras.get(birdId);
        if (aura) {
            aura.meshes.forEach(mesh => {
                if (aura.birdGroup) {
                    aura.birdGroup.remove(mesh);
                }
                if (aura.type === 'rainbow' && mesh.geometry) {
                    mesh.geometry.dispose();
                }
                (mesh.material as THREE.Material).dispose();
            });
            this.auras.delete(birdId);
        }
    }

    update(deltaTime: number): void {
        this.auras.forEach((_aura, birdId) => {
            this.updateAura(birdId, deltaTime);
        });
    }

    createCollectionBurst(position: THREE.Vector3, isGolden: boolean = false, birdGroup?: THREE.Group): void {
        const particleCount = isGolden ? 20 : 10;
        const colors = isGolden
            ? [0xFFD700, 0xFFAA00, 0xFFFF88]
            : [0x90EE90, 0x98FB98, 0xAAFFAA];

        while (this.particles.length > EffectsManager.MAX_PARTICLES - particleCount) {
            const oldParticle = this.particles.shift();
            if (oldParticle) {
                this.scene.remove(oldParticle.mesh);
                (oldParticle.mesh.material as THREE.Material).dispose();
            }
        }

        const geom = isGolden ? this.sharedGeometries!.burstParticleGolden : this.sharedGeometries!.burstParticle;

        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particleMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(geom, particleMat);
            particle.position.copy(position);

            // Radial burst pattern for more satisfying feel
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = isGolden ? 0.4 : 0.3;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed * (0.7 + Math.random() * 0.3),
                Math.random() * 0.3 + 0.15,
                Math.sin(angle) * speed * (0.7 + Math.random() * 0.3)
            );

            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                life: isGolden ? 1.2 : 1
            });
        }

        // Scale pulse on bird when collecting
        if (birdGroup) {
            this._scalePulseBird(birdGroup);
        }
    }

    private _scalePulseBird(birdGroup: THREE.Group): void {
        const originalScale = birdGroup.scale.clone();
        const targetScale = 1.1;
        const duration = 200; // ms
        const start = Date.now();

        const pulseTick = () => {
            const elapsed = Date.now() - start;
            const t = Math.min(elapsed / duration, 1);
            // Ease out then back: scale up to 1.1 at t=0.5, back to 1.0 at t=1.0
            const s = t < 0.5
                ? 1 + (targetScale - 1) * (t / 0.5)
                : targetScale - (targetScale - 1) * ((t - 0.5) / 0.5);
            birdGroup.scale.set(
                originalScale.x * s,
                originalScale.y * s,
                originalScale.z * s
            );
            if (t < 1) {
                requestAnimationFrame(pulseTick);
            } else {
                birdGroup.scale.copy(originalScale);
            }
        };
        requestAnimationFrame(pulseTick);
    }

    createLevelUpBurst(position: THREE.Vector3): void {
        const particleCount = 30;
        const colors = [0xFFD700, 0xFFFFFF, 0x00FFFF];

        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particleMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(this.sharedGeometries!.levelUpParticle, particleMat);
            particle.position.copy(position);

            const angle = (i / particleCount) * Math.PI * 2;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * 0.3,
                0.4,
                Math.sin(angle) * 0.3
            );

            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                life: 1.5
            });
        }
    }

    updateParticles(deltaTime: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= deltaTime;

            if (particle.life <= 0) {
                this.scene.remove(particle.mesh);
                (particle.mesh.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
            } else {
                particle.mesh.position.add(particle.velocity);
                particle.velocity.y -= 0.01;
                (particle.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, particle.life);
                particle.mesh.scale.multiplyScalar(0.98);
            }
        }
    }

    cleanup(): void {
        this.trails.forEach((_trail, birdId) => this.removeTrail(birdId));
        this.auras.forEach((_aura, birdId) => this.removeAura(birdId));

        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
            (particle.mesh.material as THREE.Material).dispose();
        });
        this.particles = [];

        // Dispose shared trail particle materials
        this.trailParticleMaterials.forEach(material => material.dispose());
        this.trailParticleMaterials.clear();

        if (this.sharedGeometries) {
            Object.values(this.sharedGeometries).forEach(geom => {
                if (geom && geom.dispose) geom.dispose();
            });
            this.sharedGeometries = null;
        }
    }
}

// ==================== AMBIENT PARTICLE SYSTEM ====================

interface AmbientParticleConfig {
    color: number;
    emissive: boolean;
    size: number;
    speed: number;
    lifespan: number;
    glow: boolean;
    spawnHeight: { min: number; max: number };
    movement: 'float' | 'drift' | 'fall';
}

interface PooledParticle {
    mesh: THREE.Mesh;
    active: boolean;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    type: string | null;
    phase: number;
    baseSize?: number;
}

export class AmbientParticleSystem {
    private scene: THREE.Scene;
    private weatherSystem: WeatherSystem | null;
    private particles: PooledParticle[] = [];
    private particlePool: PooledParticle[] = [];
    private maxParticles: number = 100;
    private currentType: string = 'none';
    private spawnRate: number = 0.15;
    private lastSpawn: number = 0;
    private sharedGeometry: THREE.SphereGeometry | null = null;

    private configs: Record<string, AmbientParticleConfig> = {
        fireflies: {
            color: 0xFFFF88,
            emissive: true,
            size: 0.12,
            speed: 0.4,
            lifespan: 10,
            glow: true,
            spawnHeight: { min: 1, max: 12 },
            movement: 'float'
        },
        dust: {
            color: 0xDDCCAA,
            emissive: false,
            size: 0.06,
            speed: 0.15,
            lifespan: 8,
            glow: false,
            spawnHeight: { min: 0.5, max: 15 },
            movement: 'drift'
        },
        feathers: {
            color: 0xFFFFFF,
            emissive: false,
            size: 0.15,
            speed: 0.25,
            lifespan: 12,
            glow: false,
            spawnHeight: { min: 3, max: 25 },
            movement: 'fall'
        }
    };

    constructor(scene: THREE.Scene, weatherSystem: WeatherSystem | null) {
        this.scene = scene;
        this.weatherSystem = weatherSystem;
        this.initPool();
    }

    private initPool(): void {
        this.sharedGeometry = new THREE.SphereGeometry(1, 6, 6);

        for (let i = 0; i < this.maxParticles; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0
            });
            const mesh = new THREE.Mesh(this.sharedGeometry, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this.particlePool.push({
                mesh: mesh,
                active: false,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1,
                type: null,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    setType(type: string): void {
        if (this.configs[type] || type === 'none') {
            this.currentType = type;
        }
    }

    autoSetType(): void {
        if (!this.weatherSystem) return;

        const time = this.weatherSystem.getTimeOfDay();
        if (typeof time !== 'number' || isNaN(time)) return;

        const isNight = time < 5.5 || time > 20.5;
        const isDusk = (time >= 18 && time <= 20.5) || (time >= 5 && time < 6.5);

        if (isNight) {
            this.setType('fireflies');
        } else if (isDusk) {
            this.setType('dust');
        } else {
            this.setType(Math.random() > 0.6 ? 'feathers' : 'dust');
        }
    }

    spawn(cameraPosition: THREE.Vector3): void {
        const config = this.configs[this.currentType];
        if (!config) return;

        const particle = this.particlePool.find(p => !p.active);
        if (!particle) return;

        particle.active = true;
        particle.mesh.visible = true;
        particle.type = this.currentType;
        particle.life = config.lifespan;
        particle.maxLife = config.lifespan;
        particle.phase = Math.random() * Math.PI * 2;

        (particle.mesh.material as THREE.MeshBasicMaterial).color.setHex(config.color);
        particle.mesh.scale.setScalar(config.size);
        particle.baseSize = config.size;

        const spawnRadius = 25;
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * spawnRadius;
        const spawnX = cameraPosition.x + Math.cos(angle) * dist;
        const spawnZ = cameraPosition.z + Math.sin(angle) * dist;
        const spawnY = config.spawnHeight.min +
            Math.random() * (config.spawnHeight.max - config.spawnHeight.min);

        particle.mesh.position.set(spawnX, spawnY, spawnZ);

        switch (config.movement) {
            case 'float':
                particle.velocity.set(
                    (Math.random() - 0.5) * config.speed,
                    (Math.random() - 0.5) * config.speed * 0.3,
                    (Math.random() - 0.5) * config.speed
                );
                break;
            case 'drift':
                particle.velocity.set(
                    (Math.random() - 0.5) * config.speed,
                    -config.speed * 0.2,
                    (Math.random() - 0.5) * config.speed
                );
                break;
            case 'fall':
                particle.velocity.set(
                    (Math.random() - 0.5) * config.speed * 0.4,
                    -config.speed * 0.4,
                    (Math.random() - 0.5) * config.speed * 0.4
                );
                break;
        }

        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
        this.particles.push(particle);
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, time: number): void {
        if (!cameraPosition) return;
        if (typeof time !== 'number' || isNaN(time)) {
            time = Date.now() / 1000;
        }

        if (Math.random() < 0.005) {
            this.autoSetType();
        }

        if (this.currentType !== 'none' && this.particles.length < this.maxParticles * 0.7) {
            this.lastSpawn += deltaTime;
            if (this.lastSpawn > this.spawnRate) {
                this.spawn(cameraPosition);
                this.lastSpawn = 0;
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const config = particle.type ? this.configs[particle.type] : null;
            if (!config) continue;

            particle.life -= deltaTime;

            if (particle.life <= 0 || particle.mesh.position.y < -1) {
                particle.active = false;
                particle.mesh.visible = false;
                this.particles.splice(i, 1);
                continue;
            }

            particle.mesh.position.x += particle.velocity.x * deltaTime * 60;
            particle.mesh.position.y += particle.velocity.y * deltaTime * 60;
            particle.mesh.position.z += particle.velocity.z * deltaTime * 60;

            switch (config.movement) {
                case 'float':
                    particle.velocity.x += (Math.random() - 0.5) * 0.01;
                    particle.velocity.y += (Math.random() - 0.5) * 0.01;
                    particle.velocity.z += (Math.random() - 0.5) * 0.01;
                    particle.velocity.clampLength(0, config.speed);
                    if (config.glow) {
                        const pulse = 0.4 + Math.sin(time * 4 + particle.phase) * 0.4;
                        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = pulse * (particle.life / particle.maxLife);
                        const scalePulse = 1 + Math.sin(time * 4 + particle.phase) * 0.3;
                        particle.mesh.scale.setScalar((particle.baseSize || config.size) * scalePulse);
                    }
                    break;
                case 'drift':
                    particle.velocity.x = Math.sin(time * 1.5 + particle.phase) * config.speed * 0.4;
                    break;
                case 'fall':
                    particle.velocity.x = Math.sin(time * 1.2 + particle.phase) * config.speed * 0.6;
                    particle.mesh.rotation.z = Math.sin(time * 2 + particle.phase) * 0.4;
                    break;
            }

            const fadeStart = particle.maxLife * 0.25;
            if (particle.life < fadeStart && !config.glow) {
                (particle.mesh.material as THREE.MeshBasicMaterial).opacity = (particle.life / fadeStart) * 0.8;
            }

            const dx = particle.mesh.position.x - cameraPosition.x;
            const dz = particle.mesh.position.z - cameraPosition.z;
            if (dx * dx + dz * dz > 2500) {
                particle.life = 0;
            }
        }
    }

    clear(): void {
        this.particles.forEach(p => {
            p.active = false;
            p.mesh.visible = false;
        });
        this.particles = [];
    }

    cleanup(): void {
        this.particlePool.forEach(p => {
            this.scene.remove(p.mesh);
            (p.mesh.material as THREE.Material).dispose();
        });
        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
            this.sharedGeometry = null;
        }
        this.particlePool = [];
        this.particles = [];
    }
}

// ==================== COLOR PALETTE ====================

export const ColorPalette = {
    pastelMode: false,

    toPastel(hexColor: number): number {
        if (!this.pastelMode) return hexColor;
        if (typeof hexColor !== 'number' || isNaN(hexColor)) return hexColor;

        const r = (hexColor >> 16) & 0xFF;
        const g = (hexColor >> 8) & 0xFF;
        const b = hexColor & 0xFF;

        const pastelFactor = 0.45;
        const newR = Math.round(r + (255 - r) * pastelFactor);
        const newG = Math.round(g + (255 - g) * pastelFactor);
        const newB = Math.round(b + (255 - b) * pastelFactor);

        return (newR << 16) | (newG << 8) | newB;
    },

    applyToColor(color: THREE.Color): THREE.Color {
        if (!this.pastelMode || !color) return color;
        const hex = color.getHex();
        color.setHex(this.toPastel(hex));
        return color;
    },

    toggle(): boolean {
        this.pastelMode = !this.pastelMode;
        return this.pastelMode;
    },

    isEnabled(): boolean {
        return this.pastelMode;
    }
};

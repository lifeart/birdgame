// Visual Effects System - Trails, Auras, Particles
class EffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.trails = new Map(); // Bird ID -> Trail
        this.auras = new Map();  // Bird ID -> Aura
        this.particles = [];     // Global particles

        // Initialize shared geometries for performance
        this._initSharedGeometries();

        // Trail configurations
        this.trailConfigs = {
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

        // Aura configurations
        this.auraConfigs = {
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
    }

    _initSharedGeometries() {
        // Shared geometries for particles to avoid per-particle allocation
        this.sharedGeometries = {
            trailParticle: new THREE.SphereGeometry(0.1, 6, 6),
            burstParticle: new THREE.SphereGeometry(0.1, 6, 6),
            burstParticleGolden: new THREE.SphereGeometry(0.15, 6, 6),
            levelUpParticle: new THREE.SphereGeometry(0.2, 8, 8),
            auraGlow: new THREE.SphereGeometry(1, 16, 16), // Base size, scaled per-aura
            auraInnerGlow: new THREE.SphereGeometry(0.7, 16, 16)
        };
    }

    // Create a trail for a bird
    createTrail(birdId, trailType, birdGroup) {
        if (this.trails.has(birdId)) {
            this.removeTrail(birdId);
        }

        const config = this.trailConfigs[trailType];
        if (!config) return;

        const trail = {
            type: trailType,
            config: config,
            points: [],
            mesh: null,
            particles: [],
            birdGroup: birdGroup
        };

        // Create line geometry for trail
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

        trail.mesh = new THREE.Line(geometry, material);
        trail.mesh.frustumCulled = false;
        this.scene.add(trail.mesh);

        // Create particles if needed - using shared geometry
        if (config.particles) {
            for (let i = 0; i < 20; i++) {
                const particleMat = new THREE.MeshBasicMaterial({
                    color: config.particleColor,
                    transparent: true,
                    opacity: 0
                });
                const particle = new THREE.Mesh(this.sharedGeometries.trailParticle, particleMat);
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

    // Update trail position
    updateTrail(birdId, position, velocity) {
        const trail = this.trails.get(birdId);
        if (!trail) return;

        const config = trail.config;

        // Add new point
        trail.points.unshift({
            x: position.x,
            y: position.y,
            z: position.z,
            age: 0
        });

        // Remove old points
        while (trail.points.length > config.length) {
            trail.points.pop();
        }

        // Update geometry
        const positions = trail.mesh.geometry.attributes.position.array;
        const colors = trail.mesh.geometry.attributes.color.array;

        for (let i = 0; i < config.length; i++) {
            const point = trail.points[i];
            if (point) {
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;

                const fade = 1 - (i / config.length);
                let color = new THREE.Color(config.color);

                // Rainbow effect for cosmic trail
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

        // Update particles
        if (config.particles && velocity) {
            const speed = velocity.length();
            if (speed > 0.1) {
                // Spawn new particle
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
                        particle.mesh.material.opacity = 0.8;
                        break;
                    }
                }
            }

            // Update existing particles
            for (const particle of trail.particles) {
                if (particle.life > 0) {
                    particle.life -= 0.02;
                    particle.mesh.position.add(particle.velocity);
                    particle.velocity.y -= 0.002; // Gravity
                    particle.mesh.material.opacity = particle.life * 0.8;

                    if (particle.life <= 0) {
                        particle.mesh.visible = false;
                    }
                }
            }
        }
    }

    // Remove trail
    removeTrail(birdId) {
        const trail = this.trails.get(birdId);
        if (trail) {
            this.scene.remove(trail.mesh);
            trail.mesh.geometry.dispose();
            trail.mesh.material.dispose();

            // Only dispose materials, geometry is shared
            for (const particle of trail.particles) {
                this.scene.remove(particle.mesh);
                particle.mesh.material.dispose();
            }

            this.trails.delete(birdId);
        }
    }

    // Create aura for a bird
    createAura(birdId, auraType, birdGroup) {
        if (this.auras.has(birdId)) {
            this.removeAura(birdId);
        }

        const config = this.auraConfigs[auraType];
        if (!config) return;

        const aura = {
            type: auraType,
            config: config,
            meshes: [],
            birdGroup: birdGroup,
            time: 0
        };

        if (auraType === 'rainbow') {
            // Create multiple colored rings
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
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.userData.baseRotation = i * (Math.PI / config.colors.length);
                birdGroup.add(ring);
                aura.meshes.push(ring);
            }
        } else {
            // Create simple glow sphere using shared geometry, scale to size
            const glowMat = new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: config.opacity
            });
            const glow = new THREE.Mesh(this.sharedGeometries.auraGlow, glowMat);
            glow.scale.setScalar(config.size);
            birdGroup.add(glow);
            aura.meshes.push(glow);

            // Add secondary glow for lightning using shared geometry
            if (config.secondaryColor) {
                const innerGlowMat = new THREE.MeshBasicMaterial({
                    color: config.secondaryColor,
                    transparent: true,
                    opacity: config.opacity * 0.5
                });
                const innerGlow = new THREE.Mesh(this.sharedGeometries.auraInnerGlow, innerGlowMat);
                innerGlow.scale.setScalar(config.size);
                birdGroup.add(innerGlow);
                aura.meshes.push(innerGlow);
            }
        }

        this.auras.set(birdId, aura);
    }

    // Update aura animation
    updateAura(birdId, deltaTime) {
        const aura = this.auras.get(birdId);
        if (!aura) return;

        aura.time += deltaTime;
        const config = aura.config;

        if (aura.type === 'rainbow') {
            // Rotate rings
            aura.meshes.forEach((ring, i) => {
                ring.rotation.z = aura.time * config.rotateSpeed + ring.userData.baseRotation;
                const pulse = 1 + Math.sin(aura.time * config.pulseSpeed + i * 0.5) * config.pulseAmount;
                ring.scale.set(pulse, pulse, 1);
            });
        } else if (aura.type === 'lightning') {
            // Flicker effect
            const flicker = Math.random() > 0.9 ? 1.5 : 1;
            const pulse = 1 + Math.sin(aura.time * config.pulseSpeed) * config.pulseAmount;

            aura.meshes.forEach((mesh, i) => {
                mesh.scale.set(pulse * flicker, pulse * flicker, pulse * flicker);
                mesh.material.opacity = config.opacity * (0.5 + Math.random() * 0.5);
            });
        } else {
            // Simple pulse
            const pulse = 1 + Math.sin(aura.time * config.pulseSpeed) * config.pulseAmount;
            aura.meshes.forEach(mesh => {
                mesh.scale.set(pulse, pulse, pulse);
            });
        }
    }

    // Remove aura
    removeAura(birdId) {
        const aura = this.auras.get(birdId);
        if (aura) {
            aura.meshes.forEach(mesh => {
                if (aura.birdGroup) {
                    aura.birdGroup.remove(mesh);
                }
                // Only dispose material, geometry may be shared
                // Rainbow auras have their own geometry (torus), others use shared
                if (aura.type === 'rainbow' && mesh.geometry) {
                    mesh.geometry.dispose();
                }
                mesh.material.dispose();
            });
            this.auras.delete(birdId);
        }
    }

    // Update all effects
    update(deltaTime) {
        // Update all auras
        this.auras.forEach((aura, birdId) => {
            this.updateAura(birdId, deltaTime);
        });
    }

    // Maximum particles to prevent memory issues
    static MAX_PARTICLES = 100;

    // Create collection burst effect
    createCollectionBurst(position, isGolden = false) {
        const particleCount = isGolden ? 20 : 10;
        const color = isGolden ? 0xFFD700 : 0x90EE90;

        // Clean up old particles if we're at the limit
        while (this.particles.length > EffectsManager.MAX_PARTICLES - particleCount) {
            const oldParticle = this.particles.shift();
            if (oldParticle) {
                this.scene.remove(oldParticle.mesh);
                // Only dispose material, geometry is shared
                if (oldParticle.mesh.material) oldParticle.mesh.material.dispose();
            }
        }

        // Use shared geometry based on type
        const geom = isGolden ? this.sharedGeometries.burstParticleGolden : this.sharedGeometries.burstParticle;

        for (let i = 0; i < particleCount; i++) {
            const particleMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(geom, particleMat);
            particle.position.copy(position);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.1,
                (Math.random() - 0.5) * 0.3
            );

            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                velocity: velocity,
                life: 1
            });
        }
    }

    // Create level up effect
    createLevelUpBurst(position) {
        const particleCount = 30;
        const colors = [0xFFD700, 0xFFFFFF, 0x00FFFF];

        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particleMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            // Use shared geometry for level up particles
            const particle = new THREE.Mesh(this.sharedGeometries.levelUpParticle, particleMat);
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

    // Update global particles
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= deltaTime;

            if (particle.life <= 0) {
                this.scene.remove(particle.mesh);
                // Only dispose material, geometry is shared
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
            } else {
                particle.mesh.position.add(particle.velocity);
                particle.velocity.y -= 0.01; // Gravity
                particle.mesh.material.opacity = Math.min(1, particle.life);
                particle.mesh.scale.multiplyScalar(0.98); // Shrink
            }
        }
    }

    // Clean up all effects
    cleanup() {
        this.trails.forEach((trail, birdId) => this.removeTrail(birdId));
        this.auras.forEach((aura, birdId) => this.removeAura(birdId));

        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
            // Only dispose material, geometry is shared
            particle.mesh.material.dispose();
        });
        this.particles = [];

        // Dispose shared geometries
        if (this.sharedGeometries) {
            Object.values(this.sharedGeometries).forEach(geom => {
                if (geom && geom.dispose) geom.dispose();
            });
            this.sharedGeometries = null;
        }
    }
}

// ==================== AMBIENT PARTICLE SYSTEM ====================
// Creates atmospheric particles: fireflies, dust, feathers

class AmbientParticleSystem {
    constructor(scene, weatherSystem) {
        this.scene = scene;
        this.weatherSystem = weatherSystem;

        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 100;

        this.currentType = 'none';
        this.spawnRate = 0.15;
        this.lastSpawn = 0;

        // Particle type configurations
        this.configs = {
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

        this.initPool();
    }

    initPool() {
        // Share geometry between all particles for better performance
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

    setType(type) {
        if (this.configs[type] || type === 'none') {
            this.currentType = type;
        }
    }

    autoSetType() {
        if (!this.weatherSystem) return;

        const time = this.weatherSystem.timeOfDay;
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

    spawn(cameraPosition) {
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

        // Set appearance
        particle.mesh.material.color.setHex(config.color);
        particle.mesh.scale.setScalar(config.size);
        particle.baseSize = config.size;

        // Spawn position around camera
        const spawnRadius = 25;
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * spawnRadius;
        const spawnX = cameraPosition.x + Math.cos(angle) * dist;
        const spawnZ = cameraPosition.z + Math.sin(angle) * dist;
        const spawnY = config.spawnHeight.min +
            Math.random() * (config.spawnHeight.max - config.spawnHeight.min);

        particle.mesh.position.set(spawnX, spawnY, spawnZ);

        // Initial velocity
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

        particle.mesh.material.opacity = 0.8;
        this.particles.push(particle);
    }

    update(deltaTime, cameraPosition, time) {
        // Validate parameters
        if (!cameraPosition) return;
        if (typeof time !== 'number' || isNaN(time)) {
            time = Date.now() / 1000;
        }

        // Auto-switch type occasionally
        if (Math.random() < 0.005) {
            this.autoSetType();
        }

        // Spawn new particles
        if (this.currentType !== 'none' && this.particles.length < this.maxParticles * 0.7) {
            this.lastSpawn += deltaTime;
            if (this.lastSpawn > this.spawnRate) {
                this.spawn(cameraPosition);
                this.lastSpawn = 0;
            }
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const config = this.configs[particle.type];
            if (!config) continue;

            particle.life -= deltaTime;

            if (particle.life <= 0 || particle.mesh.position.y < -1) {
                particle.active = false;
                particle.mesh.visible = false;
                this.particles.splice(i, 1);
                continue;
            }

            // Update position
            particle.mesh.position.x += particle.velocity.x * deltaTime * 60;
            particle.mesh.position.y += particle.velocity.y * deltaTime * 60;
            particle.mesh.position.z += particle.velocity.z * deltaTime * 60;

            // Movement-specific updates
            switch (config.movement) {
                case 'float':
                    particle.velocity.x += (Math.random() - 0.5) * 0.01;
                    particle.velocity.y += (Math.random() - 0.5) * 0.01;
                    particle.velocity.z += (Math.random() - 0.5) * 0.01;
                    particle.velocity.clampLength(0, config.speed);
                    if (config.glow) {
                        // Simulate glow with pulsing opacity and scale
                        const pulse = 0.4 + Math.sin(time * 4 + particle.phase) * 0.4;
                        particle.mesh.material.opacity = pulse * (particle.life / particle.maxLife);
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

            // Fade out near end of life
            const fadeStart = particle.maxLife * 0.25;
            if (particle.life < fadeStart && !config.glow) {
                particle.mesh.material.opacity = (particle.life / fadeStart) * 0.8;
            }

            // Remove if too far from camera
            const dx = particle.mesh.position.x - cameraPosition.x;
            const dz = particle.mesh.position.z - cameraPosition.z;
            if (dx * dx + dz * dz > 2500) {
                particle.life = 0;
            }
        }
    }

    clear() {
        this.particles.forEach(p => {
            p.active = false;
            p.mesh.visible = false;
        });
        this.particles = [];
    }

    cleanup() {
        this.particlePool.forEach(p => {
            this.scene.remove(p.mesh);
            // Only dispose material, geometry is shared
            if (p.mesh.material) p.mesh.material.dispose();
        });
        // Dispose shared geometry once
        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
            this.sharedGeometry = null;
        }
        this.particlePool = [];
        this.particles = [];
    }
}

// ==================== COLOR PALETTE ====================
// Pastel mode for softer, more pleasant visuals

const ColorPalette = {
    pastelMode: false,

    // Convert any color to pastel version
    toPastel(hexColor) {
        if (!this.pastelMode) return hexColor;
        if (typeof hexColor !== 'number' || isNaN(hexColor)) return hexColor;

        const r = (hexColor >> 16) & 0xFF;
        const g = (hexColor >> 8) & 0xFF;
        const b = hexColor & 0xFF;

        // Pastel formula: mix with white and reduce saturation
        const pastelFactor = 0.45;
        const newR = Math.round(r + (255 - r) * pastelFactor);
        const newG = Math.round(g + (255 - g) * pastelFactor);
        const newB = Math.round(b + (255 - b) * pastelFactor);

        return (newR << 16) | (newG << 8) | newB;
    },

    // Apply pastel mode to a THREE.Color
    applyToColor(color) {
        if (!this.pastelMode || !color) return color;
        const hex = color.getHex();
        color.setHex(this.toPastel(hex));
        return color;
    },

    toggle() {
        this.pastelMode = !this.pastelMode;
        return this.pastelMode;
    },

    isEnabled() {
        return this.pastelMode;
    }
};

// Make ColorPalette available globally
window.ColorPalette = ColorPalette;

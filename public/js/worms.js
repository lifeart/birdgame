// Worm system - spawning, collection, animation
class WormManager {
    constructor(scene) {
        this.scene = scene;
        this.worms = new Map();
        this.goldenWorms = new Map();

        // Golden worm config
        this.goldenWormSpawnInterval = 300000; // 5 minutes
        this.lastGoldenWormSpawn = 0;
        this.goldenWormDuration = 60000; // 1 minute to catch

        // Initialize shared geometries for performance
        this._initSharedGeometries();
        this._initSharedMaterials();
    }

    _initSharedGeometries() {
        // Shared geometries for regular worms (different segment sizes)
        this.sharedGeometries = {
            // Regular worm segments (5 sizes for tapered body)
            wormSeg0: new THREE.SphereGeometry(0.3, 8, 8),      // size * 1.0
            wormSeg1: new THREE.SphereGeometry(0.27, 8, 8),     // size * 0.9
            wormSeg2: new THREE.SphereGeometry(0.24, 8, 8),     // size * 0.8
            wormSeg3: new THREE.SphereGeometry(0.21, 8, 8),     // size * 0.7
            wormSeg4: new THREE.SphereGeometry(0.18, 8, 8),     // size * 0.6
            // Eyes
            wormEye: new THREE.SphereGeometry(0.08, 6, 6),
            // Golden worm segments (6 sizes, larger)
            goldenSeg0: new THREE.SphereGeometry(0.4, 12, 12),
            goldenSeg1: new THREE.SphereGeometry(0.368, 12, 12),
            goldenSeg2: new THREE.SphereGeometry(0.336, 12, 12),
            goldenSeg3: new THREE.SphereGeometry(0.304, 12, 12),
            goldenSeg4: new THREE.SphereGeometry(0.272, 12, 12),
            goldenSeg5: new THREE.SphereGeometry(0.24, 12, 12),
            goldenEye: new THREE.SphereGeometry(0.1, 8, 8),
            goldenGlow: new THREE.SphereGeometry(1.5, 16, 16),
            goldenSparkle: new THREE.SphereGeometry(0.08, 6, 6)
        };
    }

    _initSharedMaterials() {
        // Shared materials
        this.sharedMaterials = {
            wormBody: new THREE.MeshLambertMaterial({ color: 0xE07070 }),
            wormEye: new THREE.MeshBasicMaterial({ color: 0x000000 }),
            goldenBody: new THREE.MeshPhongMaterial({
                color: 0xFFD700,
                emissive: 0xFFAA00,
                emissiveIntensity: 0.5,
                shininess: 100
            }),
            goldenEye: new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        };
    }

    clear() {
        this.worms.forEach(worm => {
            this.disposeWormMesh(worm.mesh);
            this.scene.remove(worm.mesh);
        });
        this.worms.clear();
        this.goldenWorms.forEach(worm => {
            this.disposeGoldenWormMesh(worm.mesh);
            this.scene.remove(worm.mesh);
        });
        this.goldenWorms.clear();
    }

    addWorm(wormData) {
        if (this.worms.has(wormData.id)) return;

        const isGolden = wormData.isGolden || false;
        const worm = isGolden ?
            this.createGoldenWormMesh(wormData.x, wormData.y, wormData.z) :
            this.createWormMesh(wormData.x, wormData.y, wormData.z);

        worm.userData = { id: wormData.id, isGolden: isGolden };

        const wormEntry = {
            mesh: worm,
            x: wormData.x,
            y: wormData.y,
            z: wormData.z,
            wiggleOffset: Math.random() * Math.PI * 2,
            isGolden: isGolden,
            spawnTime: Date.now()
        };

        if (isGolden) {
            this.goldenWorms.set(wormData.id, wormEntry);
        } else {
            this.worms.set(wormData.id, wormEntry);
        }
        this.scene.add(worm);
    }

    addWorms(wormsData) {
        wormsData.forEach(wormData => this.addWorm(wormData));
    }

    createWormMesh(x, y, z) {
        const group = new THREE.Group();

        // Create worm body from spheres using shared geometries and materials
        const segmentGeoms = [
            this.sharedGeometries.wormSeg0,
            this.sharedGeometries.wormSeg1,
            this.sharedGeometries.wormSeg2,
            this.sharedGeometries.wormSeg3,
            this.sharedGeometries.wormSeg4
        ];
        const segmentSize = 0.3;

        for (let i = 0; i < 5; i++) {
            const segment = new THREE.Mesh(segmentGeoms[i], this.sharedMaterials.wormBody);
            segment.position.x = i * segmentSize * 1.5;
            segment.position.y = Math.sin(i * 0.5) * 0.1;
            group.add(segment);
        }

        // Eyes on the first segment using shared geometries
        const eye1 = new THREE.Mesh(this.sharedGeometries.wormEye, this.sharedMaterials.wormEye);
        eye1.position.set(0.15, 0.15, 0.15);
        group.add(eye1);

        const eye2 = new THREE.Mesh(this.sharedGeometries.wormEye, this.sharedMaterials.wormEye);
        eye2.position.set(0.15, 0.15, -0.15);
        group.add(eye2);

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        return group;
    }

    createGoldenWormMesh(x, y, z) {
        const group = new THREE.Group();

        // Golden worm body using shared geometries
        const segmentGeoms = [
            this.sharedGeometries.goldenSeg0,
            this.sharedGeometries.goldenSeg1,
            this.sharedGeometries.goldenSeg2,
            this.sharedGeometries.goldenSeg3,
            this.sharedGeometries.goldenSeg4,
            this.sharedGeometries.goldenSeg5
        ];
        const segments = 6;
        const segmentSize = 0.4;

        for (let i = 0; i < segments; i++) {
            const segment = new THREE.Mesh(segmentGeoms[i], this.sharedMaterials.goldenBody);
            segment.position.x = i * segmentSize * 1.5;
            segment.position.y = Math.sin(i * 0.5) * 0.15;
            group.add(segment);
        }

        // Sparkle eyes using shared geometries
        const eye1 = new THREE.Mesh(this.sharedGeometries.goldenEye, this.sharedMaterials.goldenEye);
        eye1.position.set(0.2, 0.2, 0.2);
        group.add(eye1);

        const eye2 = new THREE.Mesh(this.sharedGeometries.goldenEye, this.sharedMaterials.goldenEye);
        eye2.position.set(0.2, 0.2, -0.2);
        group.add(eye2);

        // Add glow effect - uses shared geometry, unique material for animation
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(this.sharedGeometries.goldenGlow, glowMat);
        glow.position.x = segments * segmentSize * 0.5;
        group.add(glow);
        group.userData.glow = glow;

        // Add sparkle particles - uses shared geometry, unique materials for animation
        const sparkleGroup = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const sparkleMat = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            });
            const sparkle = new THREE.Mesh(this.sharedGeometries.goldenSparkle, sparkleMat);
            sparkle.userData.angle = (i / 8) * Math.PI * 2;
            sparkle.userData.radius = 1.2;
            sparkle.userData.speed = 2 + Math.random();
            sparkleGroup.add(sparkle);
        }
        sparkleGroup.position.x = segments * segmentSize * 0.5;
        group.add(sparkleGroup);
        group.userData.sparkles = sparkleGroup;

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        return group;
    }

    removeWorm(wormId) {
        // Check regular worms first
        const worm = this.worms.get(wormId);
        if (worm) {
            this.disposeWormMesh(worm.mesh);
            this.scene.remove(worm.mesh);
            this.worms.delete(wormId);
            return;
        }

        // Check golden worms
        const goldenWorm = this.goldenWorms.get(wormId);
        if (goldenWorm) {
            this.disposeGoldenWormMesh(goldenWorm.mesh);
            this.scene.remove(goldenWorm.mesh);
            this.goldenWorms.delete(wormId);
        }
    }

    disposeWormMesh(mesh) {
        // Regular worm uses shared geometries and materials - no disposal needed
        // Just remove from scene (done by caller)
    }

    disposeGoldenWormMesh(mesh) {
        // Dispose ONLY non-shared materials (glow and sparkles have unique materials for animation)
        if (mesh.userData.glow && mesh.userData.glow.material) {
            mesh.userData.glow.material.dispose();
        }

        if (mesh.userData.sparkles) {
            mesh.userData.sparkles.children.forEach(sparkle => {
                if (sparkle.material) sparkle.material.dispose();
            });
        }
        // Shared geometries and body materials are NOT disposed
    }

    update(time) {
        // Animate regular worms (wiggling)
        this.worms.forEach((worm) => {
            const wiggle = Math.sin(time * 5 + worm.wiggleOffset) * 0.1;
            worm.mesh.position.y = worm.y + wiggle;
            worm.mesh.rotation.y += 0.01;
        });

        // Animate golden worms (more dramatic)
        this.goldenWorms.forEach((worm, id) => {
            const wiggle = Math.sin(time * 6 + worm.wiggleOffset) * 0.15;
            worm.mesh.position.y = worm.y + wiggle + Math.sin(time * 3) * 0.3;
            worm.mesh.rotation.y += 0.03;

            // Animate glow pulsing
            if (worm.mesh.userData.glow) {
                const scale = 1 + Math.sin(time * 4) * 0.2;
                worm.mesh.userData.glow.scale.set(scale, scale, scale);
                worm.mesh.userData.glow.material.opacity = 0.2 + Math.sin(time * 5) * 0.15;
            }

            // Animate sparkles orbiting
            if (worm.mesh.userData.sparkles) {
                worm.mesh.userData.sparkles.children.forEach((sparkle) => {
                    const angle = sparkle.userData.angle + time * sparkle.userData.speed;
                    const radius = sparkle.userData.radius;
                    sparkle.position.x = Math.cos(angle) * radius;
                    sparkle.position.y = Math.sin(angle * 0.5) * 0.5;
                    sparkle.position.z = Math.sin(angle) * radius;
                });
            }

            // Check if golden worm expired
            if (Date.now() - worm.spawnTime > this.goldenWormDuration) {
                this.disposeGoldenWormMesh(worm.mesh);
                this.scene.remove(worm.mesh);
                this.goldenWorms.delete(id);
            }
        });
    }

    checkCollection(birdPosition, birdRadius) {
        const collected = [];

        // Check regular worms
        this.worms.forEach((worm, id) => {
            const dx = birdPosition.x - worm.x;
            const dy = birdPosition.y - worm.y;
            const dz = birdPosition.z - worm.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < birdRadius + 1.5) {
                collected.push({ id, isGolden: false, points: 1 });
            }
        });

        // Check golden worms (slightly larger collection radius)
        this.goldenWorms.forEach((worm, id) => {
            const dx = birdPosition.x - worm.x;
            const dy = birdPosition.y - worm.y;
            const dz = birdPosition.z - worm.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < birdRadius + 2.5) {
                collected.push({ id, isGolden: true, points: 10 });
            }
        });

        return collected;
    }

    // Spawn a golden worm at random position in bounds
    spawnGoldenWorm(bounds) {
        const id = 'golden_' + Date.now();
        const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
        const y = 0.5; // Ground level

        this.addWorm({ id, x, y, z, isGolden: true });
        this.lastGoldenWormSpawn = Date.now();

        return { id, x, y, z };
    }

    // Check if it's time to spawn a golden worm
    shouldSpawnGoldenWorm() {
        return this.goldenWorms.size === 0 &&
               Date.now() - this.lastGoldenWormSpawn > this.goldenWormSpawnInterval;
    }

    getWormCount() {
        return this.worms.size;
    }

    getGoldenWormCount() {
        return this.goldenWorms.size;
    }

    hasGoldenWorm() {
        return this.goldenWorms.size > 0;
    }

    // Cleanup shared resources (call when destroying WormManager)
    cleanup() {
        this.clear();

        // Dispose shared geometries
        if (this.sharedGeometries) {
            Object.values(this.sharedGeometries).forEach(geom => {
                if (geom && geom.dispose) geom.dispose();
            });
            this.sharedGeometries = null;
        }

        // Dispose shared materials
        if (this.sharedMaterials) {
            Object.values(this.sharedMaterials).forEach(mat => {
                if (mat && mat.dispose) mat.dispose();
            });
            this.sharedMaterials = null;
        }
    }
}

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

        // Create worm body from spheres
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xE07070 });
        const segments = 5;
        const segmentSize = 0.3;

        for (let i = 0; i < segments; i++) {
            const size = segmentSize * (1 - i * 0.1);
            const segment = new THREE.Mesh(
                new THREE.SphereGeometry(size, 8, 8),
                bodyMat
            );
            segment.position.x = i * segmentSize * 1.5;
            segment.position.y = Math.sin(i * 0.5) * 0.1;
            group.add(segment);
        }

        // Eyes on the first segment
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
        eye1.position.set(0.15, 0.15, 0.15);
        group.add(eye1);

        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
        eye2.position.set(0.15, 0.15, -0.15);
        group.add(eye2);

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        return group;
    }

    createGoldenWormMesh(x, y, z) {
        const group = new THREE.Group();

        // Golden worm body - larger and shiny
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0xFFD700,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        const segments = 6;
        const segmentSize = 0.4;

        for (let i = 0; i < segments; i++) {
            const size = segmentSize * (1 - i * 0.08);
            const segment = new THREE.Mesh(
                new THREE.SphereGeometry(size, 12, 12),
                bodyMat
            );
            segment.position.x = i * segmentSize * 1.5;
            segment.position.y = Math.sin(i * 0.5) * 0.15;
            group.add(segment);
        }

        // Sparkle eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
        eye1.position.set(0.2, 0.2, 0.2);
        group.add(eye1);

        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
        eye2.position.set(0.2, 0.2, -0.2);
        group.add(eye2);

        // Add glow effect - outer sphere
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 16, 16),
            glowMat
        );
        glow.position.x = segments * segmentSize * 0.5;
        group.add(glow);
        group.userData.glow = glow;

        // Add sparkle particles
        const sparkleGroup = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const sparkleMat = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            });
            const sparkle = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 6, 6),
                sparkleMat
            );
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
        // Dispose regular worm mesh children
        mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    disposeGoldenWormMesh(mesh) {
        // Dispose sparkles
        if (mesh.userData.sparkles) {
            mesh.userData.sparkles.children.forEach(sparkle => {
                if (sparkle.geometry) sparkle.geometry.dispose();
                if (sparkle.material) sparkle.material.dispose();
            });
        }

        // Dispose glow
        if (mesh.userData.glow) {
            if (mesh.userData.glow.geometry) mesh.userData.glow.geometry.dispose();
            if (mesh.userData.glow.material) mesh.userData.glow.material.dispose();
        }

        // Dispose main mesh children
        mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
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
}

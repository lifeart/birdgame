// Worm system - spawning, collection, animation
class WormManager {
    constructor(scene) {
        this.scene = scene;
        this.worms = new Map();
    }

    clear() {
        this.worms.forEach(worm => {
            this.scene.remove(worm.mesh);
        });
        this.worms.clear();
    }

    addWorm(wormData) {
        if (this.worms.has(wormData.id)) return;

        const worm = this.createWormMesh(wormData.x, wormData.y, wormData.z);
        worm.userData = { id: wormData.id };
        this.worms.set(wormData.id, {
            mesh: worm,
            x: wormData.x,
            y: wormData.y,
            z: wormData.z,
            wiggleOffset: Math.random() * Math.PI * 2
        });
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

    removeWorm(wormId) {
        const worm = this.worms.get(wormId);
        if (worm) {
            this.scene.remove(worm.mesh);
            this.worms.delete(wormId);
        }
    }

    update(time) {
        // Animate worms (wiggling)
        this.worms.forEach((worm) => {
            const wiggle = Math.sin(time * 5 + worm.wiggleOffset) * 0.1;
            worm.mesh.position.y = worm.y + wiggle;
            worm.mesh.rotation.y += 0.01;
        });
    }

    checkCollection(birdPosition, birdRadius) {
        const collected = [];
        this.worms.forEach((worm, id) => {
            const dx = birdPosition.x - worm.x;
            const dy = birdPosition.y - worm.y;
            const dz = birdPosition.z - worm.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < birdRadius + 1.5) {
                collected.push(id);
            }
        });
        return collected;
    }

    getWormCount() {
        return this.worms.size;
    }
}

// Fly system - flying insects that give x2 points
class FlyManager {
    constructor(scene) {
        this.scene = scene;
        this.flies = new Map();
    }

    clear() {
        this.flies.forEach(fly => {
            this.scene.remove(fly.mesh);
        });
        this.flies.clear();
    }

    addFly(flyData) {
        if (this.flies.has(flyData.id)) return;

        const fly = this.createFlyMesh(flyData.x, flyData.y, flyData.z);
        fly.userData = { id: flyData.id };
        this.flies.set(flyData.id, {
            mesh: fly,
            x: flyData.x,
            y: flyData.y,
            z: flyData.z,
            baseY: flyData.y,
            flyOffset: Math.random() * Math.PI * 2,
            circleOffset: Math.random() * Math.PI * 2
        });
        this.scene.add(fly);
    }

    addFlies(fliesData) {
        if (!fliesData) return;
        fliesData.forEach(flyData => this.addFly(flyData));
    }

    createFlyMesh(x, y, z) {
        const group = new THREE.Group();

        // Body - dark iridescent
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            shininess: 80,
            emissive: 0x0a0a15,
            emissiveIntensity: 0.2
        });

        // Thorax (middle body)
        const thorax = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 12, 10),
            bodyMat
        );
        thorax.scale.set(0.8, 0.7, 1);
        group.add(thorax);

        // Abdomen (back)
        const abdomen = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 10),
            bodyMat
        );
        abdomen.position.z = -0.35;
        abdomen.scale.set(0.7, 0.6, 1.2);
        group.add(abdomen);

        // Head
        const headMat = new THREE.MeshPhongMaterial({
            color: 0x2a2a3e,
            shininess: 60
        });
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 10, 8),
            headMat
        );
        head.position.z = 0.28;
        group.add(head);

        // Compound eyes - large and red
        const eyeMat = new THREE.MeshPhongMaterial({
            color: 0x8B0000,
            shininess: 100,
            emissive: 0x3a0000,
            emissiveIntensity: 0.3
        });

        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 10, 8),
            eyeMat
        );
        leftEye.position.set(0.1, 0.05, 0.35);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 10, 8),
            eyeMat
        );
        rightEye.position.set(-0.1, 0.05, 0.35);
        group.add(rightEye);

        // Wings - transparent and shimmery
        const wingMat = new THREE.MeshPhongMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.4,
            shininess: 150,
            side: THREE.DoubleSide
        });

        // Wing shape
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.quadraticCurveTo(0.4, 0.15, 0.7, 0);
        wingShape.quadraticCurveTo(0.5, -0.1, 0, 0);

        const wingGeom = new THREE.ShapeGeometry(wingShape);

        const leftWing = new THREE.Mesh(wingGeom, wingMat);
        leftWing.position.set(0.1, 0.15, 0);
        leftWing.rotation.y = -0.3;
        leftWing.rotation.x = 0.2;
        leftWing.name = 'leftWing';
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeom, wingMat);
        rightWing.position.set(-0.1, 0.15, 0);
        rightWing.rotation.y = Math.PI + 0.3;
        rightWing.rotation.x = 0.2;
        rightWing.name = 'rightWing';
        group.add(rightWing);

        // Legs (6 legs)
        const legMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        for (let i = 0; i < 3; i++) {
            const zPos = 0.1 - i * 0.15;

            // Left leg
            const leftLeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6),
                legMat
            );
            leftLeg.position.set(0.15, -0.12, zPos);
            leftLeg.rotation.z = -0.8;
            leftLeg.rotation.x = 0.3 * (i - 1);
            group.add(leftLeg);

            // Right leg
            const rightLeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6),
                legMat
            );
            rightLeg.position.set(-0.15, -0.12, zPos);
            rightLeg.rotation.z = 0.8;
            rightLeg.rotation.x = 0.3 * (i - 1);
            group.add(rightLeg);
        }

        // x2 indicator above the fly
        const indicatorGeom = new THREE.PlaneGeometry(0.6, 0.3);
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x2', 32, 16);

        const indicatorTex = new THREE.CanvasTexture(canvas);
        const indicatorMat = new THREE.MeshBasicMaterial({
            map: indicatorTex,
            transparent: true,
            side: THREE.DoubleSide
        });
        const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
        indicator.position.y = 0.6;
        indicator.name = 'indicator';
        group.add(indicator);

        group.position.set(x, y, z);
        group.scale.set(1.5, 1.5, 1.5); // Make flies bigger for visibility

        return group;
    }

    removeFly(flyId) {
        const fly = this.flies.get(flyId);
        if (fly) {
            this.scene.remove(fly.mesh);
            this.flies.delete(flyId);
        }
    }

    update(time) {
        // Animate flies - buzzing around
        this.flies.forEach((fly) => {
            // Vertical bobbing
            const bob = Math.sin(time * 8 + fly.flyOffset) * 0.3;
            fly.mesh.position.y = fly.baseY + bob;

            // Circular movement
            const circleRadius = 1.5;
            const circleSpeed = 2;
            fly.mesh.position.x = fly.x + Math.sin(time * circleSpeed + fly.circleOffset) * circleRadius;
            fly.mesh.position.z = fly.z + Math.cos(time * circleSpeed + fly.circleOffset) * circleRadius;

            // Face direction of movement
            fly.mesh.rotation.y = time * circleSpeed + fly.circleOffset + Math.PI / 2;

            // Wing flapping - very fast
            const wingAngle = Math.sin(time * 50 + fly.flyOffset) * 0.5;
            fly.mesh.children.forEach(child => {
                if (child.name === 'leftWing') {
                    child.rotation.z = wingAngle;
                } else if (child.name === 'rightWing') {
                    child.rotation.z = -wingAngle;
                } else if (child.name === 'indicator') {
                    // Billboard effect - always face camera
                    child.rotation.y = -fly.mesh.rotation.y;
                }
            });
        });
    }

    checkCollection(birdPosition, birdRadius) {
        const collected = [];
        this.flies.forEach((fly, id) => {
            const dx = birdPosition.x - fly.mesh.position.x;
            const dy = birdPosition.y - fly.mesh.position.y;
            const dz = birdPosition.z - fly.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < birdRadius + 1.8) {
                collected.push(id);
            }
        });
        return collected;
    }

    getFlyCount() {
        return this.flies.size;
    }
}

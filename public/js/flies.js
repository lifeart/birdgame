// Fly system - flying insects that give x2 points
class FlyManager {
    constructor(scene) {
        this.scene = scene;
        this.flies = new Map();

        // Initialize shared geometries and materials for performance
        this._initSharedGeometries();
        this._initSharedMaterials();
    }

    _initSharedGeometries() {
        // Shared geometries for fly parts
        this.sharedGeometries = {
            thorax: new THREE.SphereGeometry(0.25, 12, 10),
            abdomen: new THREE.SphereGeometry(0.3, 12, 10),
            head: new THREE.SphereGeometry(0.18, 10, 8),
            eye: new THREE.SphereGeometry(0.1, 10, 8),
            leg: new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6),
            indicator: new THREE.PlaneGeometry(0.6, 0.3)
        };

        // Create wing shape geometry
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.quadraticCurveTo(0.4, 0.15, 0.7, 0);
        wingShape.quadraticCurveTo(0.5, -0.1, 0, 0);
        this.sharedGeometries.wing = new THREE.ShapeGeometry(wingShape);
    }

    _initSharedMaterials() {
        // Shared materials for fly parts
        this.sharedMaterials = {
            body: new THREE.MeshPhongMaterial({
                color: 0x1a1a2e,
                shininess: 80,
                emissive: 0x0a0a15,
                emissiveIntensity: 0.2
            }),
            head: new THREE.MeshPhongMaterial({
                color: 0x2a2a3e,
                shininess: 60
            }),
            eye: new THREE.MeshPhongMaterial({
                color: 0x8B0000,
                shininess: 100,
                emissive: 0x3a0000,
                emissiveIntensity: 0.3
            }),
            wing: new THREE.MeshPhongMaterial({
                color: 0xaaddff,
                transparent: true,
                opacity: 0.4,
                shininess: 150,
                side: THREE.DoubleSide
            }),
            leg: new THREE.MeshPhongMaterial({ color: 0x1a1a1a })
        };

        // Create shared indicator texture and material
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x2', 32, 16);
        this.sharedIndicatorTexture = new THREE.CanvasTexture(canvas);
        this.sharedMaterials.indicator = new THREE.MeshBasicMaterial({
            map: this.sharedIndicatorTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
    }

    clear() {
        this.flies.forEach(fly => {
            this.disposeFlyMesh(fly.mesh);
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

        // Thorax (middle body) - using shared geometry and material
        const thorax = new THREE.Mesh(this.sharedGeometries.thorax, this.sharedMaterials.body);
        thorax.scale.set(0.8, 0.7, 1);
        group.add(thorax);

        // Abdomen (back) - using shared geometry and material
        const abdomen = new THREE.Mesh(this.sharedGeometries.abdomen, this.sharedMaterials.body);
        abdomen.position.z = -0.35;
        abdomen.scale.set(0.7, 0.6, 1.2);
        group.add(abdomen);

        // Head - using shared geometry and material
        const head = new THREE.Mesh(this.sharedGeometries.head, this.sharedMaterials.head);
        head.position.z = 0.28;
        group.add(head);

        // Compound eyes - using shared geometry and material
        const leftEye = new THREE.Mesh(this.sharedGeometries.eye, this.sharedMaterials.eye);
        leftEye.position.set(0.1, 0.05, 0.35);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(this.sharedGeometries.eye, this.sharedMaterials.eye);
        rightEye.position.set(-0.1, 0.05, 0.35);
        group.add(rightEye);

        // Wings - using shared geometry and material
        const leftWing = new THREE.Mesh(this.sharedGeometries.wing, this.sharedMaterials.wing);
        leftWing.position.set(0.1, 0.15, 0);
        leftWing.rotation.y = -0.3;
        leftWing.rotation.x = 0.2;
        leftWing.name = 'leftWing';
        group.add(leftWing);

        const rightWing = new THREE.Mesh(this.sharedGeometries.wing, this.sharedMaterials.wing);
        rightWing.position.set(-0.1, 0.15, 0);
        rightWing.rotation.y = Math.PI + 0.3;
        rightWing.rotation.x = 0.2;
        rightWing.name = 'rightWing';
        group.add(rightWing);

        // Legs (6 legs) - using shared geometry and material
        for (let i = 0; i < 3; i++) {
            const zPos = 0.1 - i * 0.15;

            // Left leg
            const leftLeg = new THREE.Mesh(this.sharedGeometries.leg, this.sharedMaterials.leg);
            leftLeg.position.set(0.15, -0.12, zPos);
            leftLeg.rotation.z = -0.8;
            leftLeg.rotation.x = 0.3 * (i - 1);
            group.add(leftLeg);

            // Right leg
            const rightLeg = new THREE.Mesh(this.sharedGeometries.leg, this.sharedMaterials.leg);
            rightLeg.position.set(-0.15, -0.12, zPos);
            rightLeg.rotation.z = 0.8;
            rightLeg.rotation.x = 0.3 * (i - 1);
            group.add(rightLeg);
        }

        // x2 indicator above the fly - using shared geometry, texture and material
        const indicator = new THREE.Mesh(this.sharedGeometries.indicator, this.sharedMaterials.indicator);
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
            this.disposeFlyMesh(fly.mesh);
            this.scene.remove(fly.mesh);
            this.flies.delete(flyId);
        }
    }

    disposeFlyMesh(mesh) {
        // Fly uses shared geometries and materials - no disposal needed
        // Just remove from scene (done by caller)
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

    // Cleanup shared resources (call when destroying FlyManager)
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

        // Dispose shared texture
        if (this.sharedIndicatorTexture) {
            this.sharedIndicatorTexture.dispose();
            this.sharedIndicatorTexture = null;
        }
    }
}

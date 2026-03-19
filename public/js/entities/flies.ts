// Fly system - flying insects that give x2 points
import * as THREE from 'three';
import type { FlyData } from '../core/network.ts';

// Re-export for consumers
export type { FlyData } from '../core/network.ts';

interface FlyEntry {
    mesh: THREE.Group;
    x: number;
    y: number;
    z: number;
    baseY: number;
    flyOffset: number;
    circleOffset: number;
}

interface SharedGeometries {
    thorax: THREE.SphereGeometry;
    abdomen: THREE.SphereGeometry;
    head: THREE.SphereGeometry;
    eye: THREE.SphereGeometry;
    leg: THREE.CylinderGeometry;
    indicator: THREE.PlaneGeometry;
    wing: THREE.ShapeGeometry;
}

interface SharedMaterials {
    body: THREE.MeshPhongMaterial;
    head: THREE.MeshPhongMaterial;
    eye: THREE.MeshPhongMaterial;
    wing: THREE.MeshPhongMaterial;
    leg: THREE.MeshPhongMaterial;
    indicator: THREE.MeshBasicMaterial;
}

export class FlyManager {
    private scene: THREE.Scene;
    private flies: Map<string, FlyEntry> = new Map();

    private sharedGeometries!: SharedGeometries | null;
    private sharedMaterials!: SharedMaterials | null;
    private sharedIndicatorTexture!: THREE.CanvasTexture | null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this._initSharedGeometries();
        this._initSharedMaterials();
    }

    private _initSharedGeometries(): void {
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.quadraticCurveTo(0.4, 0.15, 0.7, 0);
        wingShape.quadraticCurveTo(0.5, -0.1, 0, 0);

        this.sharedGeometries = {
            thorax: new THREE.SphereGeometry(0.25, 12, 10),
            abdomen: new THREE.SphereGeometry(0.3, 12, 10),
            head: new THREE.SphereGeometry(0.18, 10, 8),
            eye: new THREE.SphereGeometry(0.1, 10, 8),
            leg: new THREE.CylinderGeometry(0.015, 0.01, 0.25, 6),
            indicator: new THREE.PlaneGeometry(0.6, 0.3),
            wing: new THREE.ShapeGeometry(wingShape)
        };
    }

    private _initSharedMaterials(): void {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x2', 32, 16);
        this.sharedIndicatorTexture = new THREE.CanvasTexture(canvas);

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
            leg: new THREE.MeshPhongMaterial({ color: 0x1a1a1a }),
            indicator: new THREE.MeshBasicMaterial({
                map: this.sharedIndicatorTexture,
                transparent: true,
                side: THREE.DoubleSide
            })
        };
    }

    clear(): void {
        this.flies.forEach(fly => {
            this.disposeFlyMesh(fly.mesh);
            this.scene.remove(fly.mesh);
        });
        this.flies.clear();
    }

    addFly(flyData: FlyData): void {
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

    addFlies(fliesData: FlyData[] | null | undefined): void {
        if (!fliesData) return;
        fliesData.forEach(flyData => this.addFly(flyData));
    }

    private createFlyMesh(x: number, y: number, z: number): THREE.Group {
        const group = new THREE.Group();

        const thorax = new THREE.Mesh(this.sharedGeometries!.thorax, this.sharedMaterials!.body);
        thorax.scale.set(0.8, 0.7, 1);
        group.add(thorax);

        const abdomen = new THREE.Mesh(this.sharedGeometries!.abdomen, this.sharedMaterials!.body);
        abdomen.position.z = -0.35;
        abdomen.scale.set(0.7, 0.6, 1.2);
        group.add(abdomen);

        const head = new THREE.Mesh(this.sharedGeometries!.head, this.sharedMaterials!.head);
        head.position.z = 0.28;
        group.add(head);

        const leftEye = new THREE.Mesh(this.sharedGeometries!.eye, this.sharedMaterials!.eye);
        leftEye.position.set(0.1, 0.05, 0.35);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(this.sharedGeometries!.eye, this.sharedMaterials!.eye);
        rightEye.position.set(-0.1, 0.05, 0.35);
        group.add(rightEye);

        const leftWing = new THREE.Mesh(this.sharedGeometries!.wing, this.sharedMaterials!.wing);
        leftWing.position.set(0.1, 0.15, 0);
        leftWing.rotation.y = -0.3;
        leftWing.rotation.x = 0.2;
        leftWing.name = 'leftWing';
        group.add(leftWing);

        const rightWing = new THREE.Mesh(this.sharedGeometries!.wing, this.sharedMaterials!.wing);
        rightWing.position.set(-0.1, 0.15, 0);
        rightWing.rotation.y = Math.PI + 0.3;
        rightWing.rotation.x = 0.2;
        rightWing.name = 'rightWing';
        group.add(rightWing);

        for (let i = 0; i < 3; i++) {
            const zPos = 0.1 - i * 0.15;

            const leftLeg = new THREE.Mesh(this.sharedGeometries!.leg, this.sharedMaterials!.leg);
            leftLeg.position.set(0.15, -0.12, zPos);
            leftLeg.rotation.z = -0.8;
            leftLeg.rotation.x = 0.3 * (i - 1);
            group.add(leftLeg);

            const rightLeg = new THREE.Mesh(this.sharedGeometries!.leg, this.sharedMaterials!.leg);
            rightLeg.position.set(-0.15, -0.12, zPos);
            rightLeg.rotation.z = 0.8;
            rightLeg.rotation.x = 0.3 * (i - 1);
            group.add(rightLeg);
        }

        const indicator = new THREE.Mesh(this.sharedGeometries!.indicator, this.sharedMaterials!.indicator);
        indicator.position.y = 0.6;
        indicator.name = 'indicator';
        group.add(indicator);

        group.position.set(x, y, z);
        group.scale.set(1.5, 1.5, 1.5);

        return group;
    }

    removeFly(flyId: string): void {
        const fly = this.flies.get(flyId);
        if (fly) {
            this.disposeFlyMesh(fly.mesh);
            this.scene.remove(fly.mesh);
            this.flies.delete(flyId);
        }
    }

    private disposeFlyMesh(_mesh: THREE.Group): void {
        // Fly uses shared geometries and materials - no disposal needed
    }

    update(time: number): void {
        // Animate wing material shimmer
        if (this.sharedMaterials?.wing) {
            this.sharedMaterials.wing.opacity = 0.35 + Math.sin(time * 6) * 0.15;
        }
        // Animate eye emissive for subtle glow
        if (this.sharedMaterials?.eye) {
            this.sharedMaterials.eye.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.2;
        }

        this.flies.forEach((fly) => {
            const bob = Math.sin(time * 8 + fly.flyOffset) * 0.3;
            fly.mesh.position.y = fly.baseY + bob;

            const circleRadius = 1.5;
            const circleSpeed = 2;
            fly.mesh.position.x = fly.x + Math.sin(time * circleSpeed + fly.circleOffset) * circleRadius;
            fly.mesh.position.z = fly.z + Math.cos(time * circleSpeed + fly.circleOffset) * circleRadius;

            fly.mesh.rotation.y = time * circleSpeed + fly.circleOffset + Math.PI / 2;

            const wingAngle = Math.sin(time * 50 + fly.flyOffset) * 0.5;
            fly.mesh.children.forEach(child => {
                if (child.name === 'leftWing') {
                    child.rotation.z = wingAngle;
                    // Wing tilt for more visible flapping
                    child.rotation.x = 0.2 + Math.sin(time * 50 + fly.flyOffset) * 0.15;
                } else if (child.name === 'rightWing') {
                    child.rotation.z = -wingAngle;
                    child.rotation.x = 0.2 + Math.sin(time * 50 + fly.flyOffset) * 0.15;
                } else if (child.name === 'indicator') {
                    child.rotation.y = -fly.mesh.rotation.y;
                }
            });
        });
    }

    checkCollection(birdPosition: THREE.Vector3, birdRadius: number): string[] {
        const collected: string[] = [];
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

    getFlyCount(): number {
        return this.flies.size;
    }

    cleanup(): void {
        this.clear();

        if (this.sharedGeometries) {
            Object.values(this.sharedGeometries).forEach(geom => {
                if (geom && geom.dispose) geom.dispose();
            });
            this.sharedGeometries = null;
        }

        if (this.sharedMaterials) {
            Object.values(this.sharedMaterials).forEach(mat => {
                if (mat && mat.dispose) mat.dispose();
            });
            this.sharedMaterials = null;
        }

        if (this.sharedIndicatorTexture) {
            this.sharedIndicatorTexture.dispose();
            this.sharedIndicatorTexture = null;
        }
    }
}

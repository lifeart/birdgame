// Worm system - spawning, collection, animation
import * as THREE from 'three';
import type { WormData } from '../core/network.ts';

// Re-export for consumers
export type { WormData } from '../core/network.ts';

interface WormEntry {
    mesh: THREE.Group;
    x: number;
    y: number;
    z: number;
    wiggleOffset: number;
    isGolden: boolean;
    spawnTime: number;
}

interface CollectedWorm {
    id: string;
    isGolden: boolean;
    points: number;
}

interface SpawnBounds {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

interface SharedGeometries {
    wormSeg0: THREE.SphereGeometry;
    wormSeg1: THREE.SphereGeometry;
    wormSeg2: THREE.SphereGeometry;
    wormSeg3: THREE.SphereGeometry;
    wormSeg4: THREE.SphereGeometry;
    wormEye: THREE.SphereGeometry;
    goldenSeg0: THREE.SphereGeometry;
    goldenSeg1: THREE.SphereGeometry;
    goldenSeg2: THREE.SphereGeometry;
    goldenSeg3: THREE.SphereGeometry;
    goldenSeg4: THREE.SphereGeometry;
    goldenSeg5: THREE.SphereGeometry;
    goldenEye: THREE.SphereGeometry;
    goldenGlow: THREE.SphereGeometry;
    goldenSparkle: THREE.SphereGeometry;
}

interface SharedMaterials {
    wormBody: THREE.MeshLambertMaterial;
    wormEye: THREE.MeshBasicMaterial;
    goldenBody: THREE.MeshPhongMaterial;
    goldenEye: THREE.MeshBasicMaterial;
}

export class WormManager {
    private scene: THREE.Scene;
    private worms: Map<string, WormEntry> = new Map();
    private goldenWorms: Map<string, WormEntry> = new Map();

    private goldenWormSpawnInterval: number = 300000; // 5 minutes
    private lastGoldenWormSpawn: number = 0;

    private sharedGeometries!: SharedGeometries | null;
    private sharedMaterials!: SharedMaterials | null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this._initSharedGeometries();
        this._initSharedMaterials();
    }

    private _initSharedGeometries(): void {
        this.sharedGeometries = {
            wormSeg0: new THREE.SphereGeometry(0.3, 8, 8),
            wormSeg1: new THREE.SphereGeometry(0.27, 8, 8),
            wormSeg2: new THREE.SphereGeometry(0.24, 8, 8),
            wormSeg3: new THREE.SphereGeometry(0.21, 8, 8),
            wormSeg4: new THREE.SphereGeometry(0.18, 8, 8),
            wormEye: new THREE.SphereGeometry(0.08, 6, 6),
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

    private _initSharedMaterials(): void {
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

    clear(): void {
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

    addWorm(wormData: WormData): void {
        if (this.worms.has(wormData.id)) return;

        const isGolden = wormData.isGolden || false;
        const worm = isGolden ?
            this.createGoldenWormMesh(wormData.x, wormData.y, wormData.z) :
            this.createWormMesh(wormData.x, wormData.y, wormData.z);

        worm.userData = { id: wormData.id, isGolden: isGolden };

        const wormEntry: WormEntry = {
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

    addWorms(wormsData: WormData[]): void {
        wormsData.forEach(wormData => this.addWorm(wormData));
    }

    private createWormMesh(x: number, y: number, z: number): THREE.Group {
        const group = new THREE.Group();

        const segmentGeoms = [
            this.sharedGeometries!.wormSeg0,
            this.sharedGeometries!.wormSeg1,
            this.sharedGeometries!.wormSeg2,
            this.sharedGeometries!.wormSeg3,
            this.sharedGeometries!.wormSeg4
        ];
        const segmentSize = 0.3;

        for (let i = 0; i < 5; i++) {
            const segment = new THREE.Mesh(segmentGeoms[i], this.sharedMaterials!.wormBody);
            segment.position.x = i * segmentSize * 1.5;
            segment.position.y = Math.sin(i * 0.5) * 0.1;
            group.add(segment);
        }

        const eye1 = new THREE.Mesh(this.sharedGeometries!.wormEye, this.sharedMaterials!.wormEye);
        eye1.position.set(0.15, 0.15, 0.15);
        group.add(eye1);

        const eye2 = new THREE.Mesh(this.sharedGeometries!.wormEye, this.sharedMaterials!.wormEye);
        eye2.position.set(0.15, 0.15, -0.15);
        group.add(eye2);

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        return group;
    }

    private createGoldenWormMesh(x: number, y: number, z: number): THREE.Group {
        const group = new THREE.Group();

        const segmentGeoms = [
            this.sharedGeometries!.goldenSeg0,
            this.sharedGeometries!.goldenSeg1,
            this.sharedGeometries!.goldenSeg2,
            this.sharedGeometries!.goldenSeg3,
            this.sharedGeometries!.goldenSeg4,
            this.sharedGeometries!.goldenSeg5
        ];
        const segments = 6;
        const segmentSize = 0.4;

        for (let i = 0; i < segments; i++) {
            const segment = new THREE.Mesh(segmentGeoms[i], this.sharedMaterials!.goldenBody);
            segment.position.x = i * segmentSize * 1.5;
            segment.position.y = Math.sin(i * 0.5) * 0.15;
            group.add(segment);
        }

        const eye1 = new THREE.Mesh(this.sharedGeometries!.goldenEye, this.sharedMaterials!.goldenEye);
        eye1.position.set(0.2, 0.2, 0.2);
        group.add(eye1);

        const eye2 = new THREE.Mesh(this.sharedGeometries!.goldenEye, this.sharedMaterials!.goldenEye);
        eye2.position.set(0.2, 0.2, -0.2);
        group.add(eye2);

        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(this.sharedGeometries!.goldenGlow, glowMat);
        glow.position.x = segments * segmentSize * 0.5;
        group.add(glow);
        group.userData.glow = glow;

        const sparkleGroup = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const sparkleMat = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            });
            const sparkle = new THREE.Mesh(this.sharedGeometries!.goldenSparkle, sparkleMat);
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

    removeWorm(wormId: string): void {
        const worm = this.worms.get(wormId);
        if (worm) {
            this.disposeWormMesh(worm.mesh);
            this.scene.remove(worm.mesh);
            this.worms.delete(wormId);
            return;
        }

        const goldenWorm = this.goldenWorms.get(wormId);
        if (goldenWorm) {
            this.disposeGoldenWormMesh(goldenWorm.mesh);
            this.scene.remove(goldenWorm.mesh);
            this.goldenWorms.delete(wormId);
        }
    }

    private disposeWormMesh(_mesh: THREE.Group): void {
        // Regular worm uses shared geometries and materials - no disposal needed
    }

    private disposeGoldenWormMesh(mesh: THREE.Group): void {
        if (mesh.userData.glow && mesh.userData.glow.material) {
            mesh.userData.glow.material.dispose();
        }

        if (mesh.userData.sparkles) {
            mesh.userData.sparkles.children.forEach((sparkle: THREE.Mesh) => {
                if (sparkle.material) (sparkle.material as THREE.Material).dispose();
            });
        }
    }

    update(time: number): void {
        this.worms.forEach((worm) => {
            const wiggle = Math.sin(time * 5 + worm.wiggleOffset) * 0.1;
            worm.mesh.position.y = worm.y + wiggle;
            worm.mesh.rotation.y += 0.01;
        });

        this.goldenWorms.forEach((worm) => {
            const wiggle = Math.sin(time * 6 + worm.wiggleOffset) * 0.15;
            worm.mesh.position.y = worm.y + wiggle + Math.sin(time * 3) * 0.3;
            worm.mesh.rotation.y += 0.03;

            if (worm.mesh.userData.glow) {
                const scale = 1 + Math.sin(time * 4) * 0.2;
                worm.mesh.userData.glow.scale.set(scale, scale, scale);
                worm.mesh.userData.glow.material.opacity = 0.2 + Math.sin(time * 5) * 0.15;
            }

            if (worm.mesh.userData.sparkles) {
                worm.mesh.userData.sparkles.children.forEach((sparkle: THREE.Object3D) => {
                    const angle = sparkle.userData.angle + time * sparkle.userData.speed;
                    const radius = sparkle.userData.radius;
                    sparkle.position.x = Math.cos(angle) * radius;
                    sparkle.position.y = Math.sin(angle * 0.5) * 0.5;
                    sparkle.position.z = Math.sin(angle) * radius;
                });
            }

            // Note: Golden worm expiration is controlled by the server via worm_collected events.
            // Client-side timeout was removed to prevent sync issues.
        });
    }

    checkCollection(birdPosition: THREE.Vector3, birdRadius: number): CollectedWorm[] {
        const collected: CollectedWorm[] = [];

        this.worms.forEach((worm, id) => {
            const dx = birdPosition.x - worm.x;
            // Use animated mesh position for accurate hitbox
            const dy = birdPosition.y - worm.mesh.position.y;
            const dz = birdPosition.z - worm.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < birdRadius + 1.5) {
                collected.push({ id, isGolden: false, points: 1 });
            }
        });

        this.goldenWorms.forEach((worm, id) => {
            const dx = birdPosition.x - worm.x;
            // Use animated mesh position for accurate hitbox
            const dy = birdPosition.y - worm.mesh.position.y;
            const dz = birdPosition.z - worm.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < birdRadius + 2.5) {
                collected.push({ id, isGolden: true, points: 10 });
            }
        });

        return collected;
    }

    spawnGoldenWorm(bounds: SpawnBounds): WormData {
        const id = 'golden_' + Date.now();
        const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
        const y = 0.5;

        this.addWorm({ id, x, y, z, isGolden: true });
        this.lastGoldenWormSpawn = Date.now();

        return { id, x, y, z, isGolden: true };
    }

    shouldSpawnGoldenWorm(): boolean {
        return this.goldenWorms.size === 0 &&
               Date.now() - this.lastGoldenWormSpawn > this.goldenWormSpawnInterval;
    }

    getWormCount(): number {
        return this.worms.size;
    }

    getGoldenWormCount(): number {
        return this.goldenWorms.size;
    }

    hasGoldenWorm(): boolean {
        return this.goldenWorms.size > 0;
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
    }
}

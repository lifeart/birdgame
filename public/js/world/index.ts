// World module - facade class that delegates to generator modules
import * as THREE from 'three';

// Types
import type {
    Collider,
    AnimatedObject,
    SharedMaterials,
    SharedGeometries,
    WorldContext,
    ParticleData
} from './types.ts';

// Infrastructure
import { createSharedMaterials, disposeMaterials } from './materials.ts';
import { createSharedGeometries, disposeGeometries } from './geometries.ts';
import { SpatialGrid } from './collision.ts';
import { AnimationManager } from './animation.ts';

// Generators
import * as terrain from './generators/terrain.ts';
import * as buildings from './generators/buildings.ts';
import * as vegetation from './generators/vegetation.ts';
import * as props from './generators/props.ts';
import * as water from './generators/water.ts';
import * as animals from './generators/animals.ts';
import * as structures from './generators/structures.ts';
import * as beach from './generators/beach.ts';
import * as mountain from './generators/mountain.ts';
import * as particles from './generators/particles.ts';

export class World {
    private scene: THREE.Scene;
    private objects: THREE.Object3D[] = [];
    private colliders: Collider[] = [];
    private animatedObjects: AnimatedObject[] = [];
    private spatialGrid: SpatialGrid;
    private animationManager: AnimationManager;
    private materials: SharedMaterials;
    private geometries: SharedGeometries;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.spatialGrid = new SpatialGrid(20);
        this.animationManager = new AnimationManager();
        this.materials = createSharedMaterials();
        this.geometries = createSharedGeometries();
    }

    private getContext(): WorldContext {
        return {
            scene: this.scene,
            objects: this.objects,
            colliders: this.colliders,
            animatedObjects: this.animatedObjects,
            materials: this.materials,
            geometries: this.geometries
        };
    }

    // Lifecycle
    finalizeWorld(): void {
        this.spatialGrid.rebuild(this.colliders);
    }

    clear(): void {
        // Dispose non-shared materials from objects
        for (const obj of this.objects) {
            if (obj instanceof THREE.Mesh) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach(m => {
                        // Only dispose if not a shared material
                        const isShared = Object.values(this.materials).some(
                            sm => sm === m || (Array.isArray(sm) && sm.includes(m))
                        );
                        if (!isShared && m.dispose) m.dispose();
                    });
                }
            }
            this.scene.remove(obj);
        }
        this.objects = [];
        this.colliders = [];
        this.animatedObjects = [];
        this.spatialGrid.clear();
    }

    update(time: number): void {
        this.animationManager.update(this.animatedObjects, time);
    }

    // Collision detection
    checkCollision(position: THREE.Vector3, radius: number): string | null {
        return this.spatialGrid.checkCollision(position, radius);
    }

    findSafeSpawnPosition(
        startX: number = 0,
        startZ: number = 0,
        safeY: number = 15,
        radius: number = 2
    ): { x: number; y: number; z: number } {
        return this.spatialGrid.findSafeSpawnPosition(startX, startZ, safeY, radius);
    }

    // Terrain
    createGround(color: number = 0x3d5c3d, withGrass: boolean = true): void {
        terrain.createGround(this.getContext(), color, withGrass);
    }

    createSky(topColor: number = 0x87CEEB, bottomColor: number = 0xE0F6FF): void {
        terrain.createSky(this.getContext(), topColor, bottomColor);
    }

    // Buildings
    createBuilding(x: number, z: number, width: number, depth: number, height: number, color: number): void {
        buildings.createBuilding(this.getContext(), x, z, width, depth, height, color);
    }

    createHouse(x: number, z: number, width?: number, depth?: number, height?: number, roofColor?: number): void {
        buildings.createHouse(this.getContext(), x, z, width, depth, height, roofColor);
    }

    createCabin(x: number, z: number): void {
        buildings.createCabin(this.getContext(), x, z);
    }

    // Vegetation
    createTree(x: number, z: number, scale?: number, type?: string): THREE.Group {
        return vegetation.createTree(this.getContext(), x, z, scale, type);
    }

    createBush(x: number, z: number, scale?: number): THREE.Group {
        return vegetation.createBush(this.getContext(), x, z, scale);
    }

    createFlowerPatch(x: number, z: number, radius?: number): void {
        vegetation.createFlowerPatch(this.getContext(), x, z, radius);
    }

    createPalmTree(x: number, z: number, scale?: number): void {
        vegetation.createPalmTree(this.getContext(), x, z, scale);
    }

    // Props
    createBench(x: number, z: number, rotation?: number): void {
        props.createBench(this.getContext(), x, z, rotation);
    }

    createStreetLamp(x: number, z: number): void {
        props.createStreetLamp(this.getContext(), x, z);
    }

    createFountain(x: number, z: number): THREE.Group {
        return props.createFountain(this.getContext(), x, z);
    }

    createCloud(x: number, y: number, z: number, size?: number): THREE.Group {
        return props.createCloud(this.getContext(), x, y, z, size);
    }

    createRock(x: number, z: number, scale?: number): void {
        props.createRock(this.getContext(), x, z, scale);
    }

    // Water
    createWaterPlane(x: number, z: number, width: number, depth: number): void {
        water.createWaterPlane(this.getContext(), x, z, width, depth);
    }

    createPond(x: number, z: number, radius?: number): void {
        water.createPond(this.getContext(), x, z, radius);
    }

    createReeds(x: number, z: number, count?: number): void {
        water.createReeds(this.getContext(), x, z, count);
    }

    createRiver(startX: number, startZ: number, endX: number, endZ: number, width?: number): void {
        water.createRiver(this.getContext(), startX, startZ, endX, endZ, width);
    }

    createBridge(x: number, z: number, rotation?: number, length?: number): void {
        water.createBridge(this.getContext(), x, z, rotation, length);
    }

    createWaterfall(x: number, z: number): void {
        water.createWaterfall(this.getContext(), x, z);
    }

    // Animals
    createPigeon(x: number, z: number, onRoof?: boolean, roofHeight?: number): THREE.Group {
        return animals.createPigeon(this.getContext(), x, z, onRoof, roofHeight);
    }

    createSeagull(x: number, y: number, z: number, flying?: boolean): THREE.Group {
        return animals.createSeagull(this.getContext(), x, y, z, flying);
    }

    createEagle(x: number, y: number, z: number): THREE.Group {
        return animals.createEagle(this.getContext(), x, y, z);
    }

    createDuck(x: number, z: number): THREE.Group {
        return animals.createDuck(this.getContext(), x, z);
    }

    createDeer(x: number, z: number): THREE.Group {
        return animals.createDeer(this.getContext(), x, z);
    }

    // Structures
    createPlayground(x: number, z: number): THREE.Group {
        return structures.createPlayground(this.getContext(), x, z);
    }

    createCarousel(x: number, z: number, scale?: number): THREE.Group {
        return structures.createCarousel(this.getContext(), x, z, scale);
    }

    createWindmill(x: number, z: number, scale?: number): void {
        structures.createWindmill(this.getContext(), x, z, scale);
    }

    createCampfire(x: number, z: number): THREE.Group {
        return structures.createCampfire(this.getContext(), x, z);
    }

    createWell(x: number, z: number): THREE.Group {
        return structures.createWell(this.getContext(), x, z);
    }

    createFarm(x: number, z: number): void {
        structures.createFarm(this.getContext(), x, z);
    }

    createAnimal(x: number, z: number, type?: string): THREE.Group {
        return structures.createAnimal(this.getContext(), x, z, type);
    }

    createHaystack(x: number, z: number, scale?: number): void {
        structures.createHaystack(this.getContext(), x, z, scale);
    }

    // Beach
    createBeachUmbrella(x: number, z: number, rotation?: number): void {
        beach.createBeachUmbrella(this.getContext(), x, z, rotation);
    }

    createBeachChair(x: number, z: number, rotation?: number): void {
        beach.createBeachChair(this.getContext(), x, z, rotation);
    }

    createSeashell(x: number, z: number): void {
        beach.createSeashell(this.getContext(), x, z);
    }

    createSandPatches(): void {
        beach.createSandPatches(this.getContext());
    }

    createSandcastle(x: number, z: number, scale?: number): void {
        beach.createSandcastle(this.getContext(), x, z, scale);
    }

    // Mountain
    createMountainPeak(x: number, z: number, scale?: number): void {
        mountain.createMountainPeak(this.getContext(), x, z, scale);
    }

    createSnowPatch(x: number, z: number): void {
        mountain.createSnowPatch(this.getContext(), x, z);
    }

    createRockyTerrain(): void {
        mountain.createRockyTerrain(this.getContext());
    }

    // Particles
    createAmbientParticles(
        type: string,
        count?: number,
        bounds?: { x: number; y: number; z: number }
    ): ParticleData[] {
        return particles.createAmbientParticles(this.getContext(), type, count, bounds);
    }
}

// Re-export types for external use
export type { Collider, BoxCollider, CylinderCollider, AnimatedObject } from './types.ts';

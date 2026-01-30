// Spatial grid and collision detection system
import * as THREE from 'three';
import type { Collider, BoxCollider, CylinderCollider } from './types.ts';

export class SpatialGrid {
    private grid: Map<string, Collider[]> = new Map();
    private cellSize: number;

    constructor(cellSize: number = 20) {
        this.cellSize = cellSize;
    }

    private getGridKey(x: number, z: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellZ}`;
    }

    private getOccupiedCells(collider: Collider): string[] {
        const cells: string[] = [];
        let minX: number, maxX: number, minZ: number, maxZ: number;

        if (collider.type === 'box') {
            const halfWidth = collider.width / 2;
            const halfDepth = collider.depth / 2;
            minX = collider.x - halfWidth;
            maxX = collider.x + halfWidth;
            minZ = collider.z - halfDepth;
            maxZ = collider.z + halfDepth;
        } else if (collider.type === 'cylinder') {
            minX = collider.x - collider.radius;
            maxX = collider.x + collider.radius;
            minZ = collider.z - collider.radius;
            maxZ = collider.z + collider.radius;
        } else {
            return cells;
        }

        const minCellX = Math.floor(minX / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const minCellZ = Math.floor(minZ / this.cellSize);
        const maxCellZ = Math.floor(maxZ / this.cellSize);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                cells.push(`${cx},${cz}`);
            }
        }
        return cells;
    }

    addCollider(collider: Collider): void {
        const cells = this.getOccupiedCells(collider);
        for (const cellKey of cells) {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey)!.push(collider);
        }
    }

    clear(): void {
        this.grid.clear();
    }

    rebuild(colliders: Collider[]): void {
        this.clear();
        for (const collider of colliders) {
            this.addCollider(collider);
        }
    }

    checkCollision(position: THREE.Vector3, radius: number): string | null {
        // Edge case protection
        if (!position || typeof position.x !== 'number') return null;
        radius = Math.max(0, radius || 0);

        const cellsToCheck = new Set<string>();
        const expandedRadius = radius + this.cellSize * 0.1;

        // Get cells that could contain colliding objects
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const cellX = Math.floor((position.x + dx * expandedRadius) / this.cellSize);
                const cellZ = Math.floor((position.z + dz * expandedRadius) / this.cellSize);
                cellsToCheck.add(`${cellX},${cellZ}`);
            }
        }

        // Check only colliders in relevant cells
        const checkedColliders = new Set<Collider>();
        for (const cellKey of cellsToCheck) {
            const cellColliders = this.grid.get(cellKey);
            if (!cellColliders) continue;

            for (const collider of cellColliders) {
                // Skip if already checked (object may span multiple cells)
                if (checkedColliders.has(collider)) continue;
                checkedColliders.add(collider);

                if (collider.type === 'box') {
                    const halfWidth = collider.width / 2;
                    const halfDepth = collider.depth / 2;

                    // Check XZ bounds with radius padding
                    const inXBounds = position.x > collider.x - halfWidth - radius &&
                                      position.x < collider.x + halfWidth + radius;
                    const inZBounds = position.z > collider.z - halfDepth - radius &&
                                      position.z < collider.z + halfDepth + radius;
                    // Check Y: bird sphere (position.y ± radius) must intersect collider (0 to height)
                    const birdBottom = position.y - radius;
                    const birdTop = position.y + radius;
                    const inYBounds = birdBottom < collider.height && birdTop > 0;

                    if (inXBounds && inZBounds && inYBounds) {
                        return collider.objectType || 'building';
                    }
                } else if (collider.type === 'cylinder') {
                    const dx = position.x - collider.x;
                    const dz = position.z - collider.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // Check Y: bird sphere must intersect collider height range
                    const birdBottom = position.y - radius;
                    const birdTop = position.y + radius;
                    const inYBounds = birdBottom < collider.height && birdTop > 0;

                    if (dist < collider.radius + radius && inYBounds) {
                        return collider.objectType || 'tree';
                    }
                }
            }
        }
        return null;
    }

    findSafeSpawnPosition(
        startX: number = 0,
        startZ: number = 0,
        safeY: number = 15,
        radius: number = 2
    ): { x: number; y: number; z: number } {
        // Check collision at GROUND level (y=1) to avoid spawning above obstacles
        const groundTestPosition = new THREE.Vector3(startX, 1, startZ);

        // First check if the requested position is safe at ground level
        if (!this.checkCollision(groundTestPosition, radius)) {
            return { x: startX, y: safeY, z: startZ };
        }

        // Try positions in expanding circles around the start point
        const offsets = [
            // Inner ring (10 units away)
            { x: 10, z: 0 }, { x: -10, z: 0 }, { x: 0, z: 10 }, { x: 0, z: -10 },
            { x: 7, z: 7 }, { x: -7, z: 7 }, { x: 7, z: -7 }, { x: -7, z: -7 },
            // Second ring (18 units away)
            { x: 18, z: 0 }, { x: -18, z: 0 }, { x: 0, z: 18 }, { x: 0, z: -18 },
            { x: 13, z: 13 }, { x: -13, z: 13 }, { x: 13, z: -13 }, { x: -13, z: -13 },
            // Outer ring (30 units away)
            { x: 30, z: 0 }, { x: -30, z: 0 }, { x: 0, z: 30 }, { x: 0, z: -30 },
            { x: 21, z: 21 }, { x: -21, z: 21 }, { x: 21, z: -21 }, { x: -21, z: -21 }
        ];

        for (const offset of offsets) {
            groundTestPosition.x = startX + offset.x;
            groundTestPosition.z = startZ + offset.z;

            if (!this.checkCollision(groundTestPosition, radius)) {
                return { x: groundTestPosition.x, y: safeY, z: groundTestPosition.z };
            }
        }

        // If all else fails, try increasing heights until safe
        for (let height = 50; height <= 100; height += 10) {
            const testPos = new THREE.Vector3(startX, height, startZ);
            if (!this.checkCollision(testPos, radius)) {
                return { x: startX, y: height, z: startZ };
            }
        }
        // Last resort - highest position
        return { x: startX, y: 100, z: startZ };
    }
}

// Shared geometries for world objects
import * as THREE from 'three';
import type { SharedGeometries } from './types.ts';

export function createSharedGeometries(): SharedGeometries {
    return {
        // Small spheres for eyes
        tinyEye: new THREE.SphereGeometry(0.03, 6, 6),
        smallEye: new THREE.SphereGeometry(0.04, 6, 6),
        mediumEye: new THREE.SphereGeometry(0.06, 6, 6),

        // Common shapes
        smallSphere: new THREE.SphereGeometry(0.1, 6, 6),

        // Chain geometry for swings
        chain: new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4),

        // Swing seat
        swingSeat: new THREE.BoxGeometry(0.8, 0.08, 0.3)
    };
}

export function disposeGeometries(geometries: SharedGeometries): void {
    for (const key in geometries) {
        const geom = geometries[key];
        if (geom && typeof geom.dispose === 'function') {
            geom.dispose();
        }
    }
}

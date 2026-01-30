// Shared materials for world objects
import * as THREE from 'three';
import type { SharedMaterials } from './types.ts';

export function createSharedMaterials(): SharedMaterials {
    return {
        // Bird materials
        pigeonBody: new THREE.MeshPhongMaterial({ color: 0x708090, flatShading: true }),
        pigeonNeck: new THREE.MeshPhongMaterial({ color: 0x4B0082, shininess: 80 }),
        pigeonWing: new THREE.MeshPhongMaterial({ color: 0x5F6A6A, flatShading: true }),
        pigeonBeak: new THREE.MeshPhongMaterial({ color: 0xFFD700 }),
        pigeonFoot: new THREE.MeshPhongMaterial({ color: 0xCC5500 }),

        seagullBody: new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true }),
        seagullWing: new THREE.MeshPhongMaterial({ color: 0xE8E8E8, side: THREE.DoubleSide, flatShading: true }),
        seagullWingTip: new THREE.MeshPhongMaterial({ color: 0x2F4F4F, side: THREE.DoubleSide }),
        seagullBeak: new THREE.MeshPhongMaterial({ color: 0xFFA500 }),

        eagleBody: new THREE.MeshPhongMaterial({ color: 0x3D2314, flatShading: true }),
        eagleHead: new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true }),
        eagleWing: new THREE.MeshPhongMaterial({ color: 0x2F1810, side: THREE.DoubleSide, flatShading: true }),

        duckBody: new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true }),
        duckHead: new THREE.MeshPhongMaterial({ color: 0x006400, flatShading: true, shininess: 60 }),
        duckRing: new THREE.MeshPhongMaterial({ color: 0xFFFFFF }),
        duckTail: new THREE.MeshPhongMaterial({ color: 0x2F4F4F }),

        // Common materials
        blackEye: new THREE.MeshBasicMaterial({ color: 0x000000 }),
        brownEye: new THREE.MeshBasicMaterial({ color: 0x8B4513 }),

        // Tree materials
        trunk: new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true }),
        bark: new THREE.MeshPhongMaterial({ color: 0x3d2817 }),
        pineFoliage: [
            new THREE.MeshPhongMaterial({ color: 0x1a5c1a, flatShading: true }),
            new THREE.MeshPhongMaterial({ color: 0x228B22, flatShading: true }),
            new THREE.MeshPhongMaterial({ color: 0x2d7a2d, flatShading: true })
        ],
        oakFoliage: new THREE.MeshPhongMaterial({ color: 0x2d6b2d, flatShading: true }),

        // Metal and wood
        metal: new THREE.MeshPhongMaterial({ color: 0x888888 }),
        darkMetal: new THREE.MeshPhongMaterial({ color: 0x1a1a1a }),
        wood: new THREE.MeshPhongMaterial({ color: 0x8B4513 }),
        darkWood: new THREE.MeshPhongMaterial({ color: 0x5D3A1A }),

        // Stone
        stone: new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true }),
        darkStone: new THREE.MeshPhongMaterial({ color: 0x696969, flatShading: true }),

        // Playground colors
        playgroundRed: new THREE.MeshPhongMaterial({ color: 0xFF6B6B }),
        playgroundTeal: new THREE.MeshPhongMaterial({ color: 0x4ECDC4 }),
        playgroundYellow: new THREE.MeshPhongMaterial({ color: 0xFFE66D, shininess: 80 }),

        // Water
        water: new THREE.MeshPhongMaterial({ color: 0x4682B4, transparent: true, opacity: 0.75, shininess: 100 })
    };
}

export function disposeMaterials(materials: SharedMaterials): void {
    for (const key in materials) {
        const mat = materials[key];
        if (Array.isArray(mat)) {
            mat.forEach(m => m.dispose());
        } else if (mat && typeof mat.dispose === 'function') {
            mat.dispose();
        }
    }
}

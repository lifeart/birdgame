// Vegetation generators - trees, bushes, flowers, palms
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createTree(
    ctx: WorldContext,
    x: number,
    z: number,
    scale: number = 1,
    type: string = 'pine'
): THREE.Group {
    x = x || 0;
    z = z || 0;
    scale = Math.max(0.1, scale || 1);
    type = type || 'pine';

    const group = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 4 * scale, 8);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 2 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    // Bark details
    for (let i = 0; i < 3; i++) {
        const barkGeom = new THREE.BoxGeometry(0.15 * scale, 0.8 * scale, 0.1 * scale);
        const barkMat = new THREE.MeshPhongMaterial({ color: 0x3d2817 });
        const bark = new THREE.Mesh(barkGeom, barkMat);
        bark.position.set(
            Math.cos(i * 2.1) * 0.45 * scale,
            (1 + i) * scale,
            Math.sin(i * 2.1) * 0.45 * scale
        );
        bark.rotation.y = i * 2.1;
        group.add(bark);
    }

    if (type === 'pine') {
        const foliageColors = [0x1a5c1a, 0x228B22, 0x2d7a2d];
        const layers = [
            { y: 5, radius: 3, height: 4 },
            { y: 8, radius: 2.5, height: 3.5 },
            { y: 10.5, radius: 2, height: 3 },
            { y: 12.5, radius: 1.2, height: 2 }
        ];

        layers.forEach((layer, i) => {
            const foliageGeom = new THREE.ConeGeometry(layer.radius * scale, layer.height * scale, 8);
            const foliageMat = new THREE.MeshPhongMaterial({
                color: foliageColors[i % foliageColors.length],
                flatShading: true
            });
            const foliage = new THREE.Mesh(foliageGeom, foliageMat);
            foliage.position.y = layer.y * scale;
            foliage.castShadow = true;
            group.add(foliage);
        });
    } else if (type === 'oak') {
        const foliageMat = new THREE.MeshPhongMaterial({ color: 0x2d6b2d, flatShading: true });

        for (let i = 0; i < 8; i++) {
            const size = (2 + Math.random()) * scale;
            const foliageGeom = new THREE.DodecahedronGeometry(size, 0);
            const foliage = new THREE.Mesh(foliageGeom, foliageMat);
            foliage.position.set(
                (Math.random() - 0.5) * 3 * scale,
                (6 + Math.random() * 4) * scale,
                (Math.random() - 0.5) * 3 * scale
            );
            foliage.rotation.set(Math.random(), Math.random(), Math.random());
            foliage.castShadow = true;
            group.add(foliage);
        }
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'tree',
        x, z,
        radius: 1 * scale,
        height: 14 * scale
    });

    ctx.animatedObjects.push({
        type: 'tree',
        object: group,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.3,
        swayAmount: 0.02 + Math.random() * 0.01
    });

    return group;
}

export function createBush(ctx: WorldContext, x: number, z: number, scale: number = 1): THREE.Group {
    const group = new THREE.Group();
    const bushColors = [0x2d5c2d, 0x3d6b3d, 0x4a7c4a];

    for (let i = 0; i < 5; i++) {
        const size = (0.5 + Math.random() * 0.5) * scale;
        const bushGeom = new THREE.DodecahedronGeometry(size, 0);
        const bushMat = new THREE.MeshPhongMaterial({
            color: bushColors[Math.floor(Math.random() * bushColors.length)],
            flatShading: true
        });
        const bush = new THREE.Mesh(bushGeom, bushMat);
        bush.position.set(
            (Math.random() - 0.5) * scale,
            size * 0.8,
            (Math.random() - 0.5) * scale
        );
        bush.castShadow = true;
        group.add(bush);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'bush',
        object: group,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.8 + Math.random() * 0.4,
        swayAmount: 0.015 + Math.random() * 0.01
    });

    return group;
}

export function createFlowerPatch(ctx: WorldContext, x: number, z: number, radius: number = 3): void {
    const group = new THREE.Group();
    const flowerColors = [0xff6b6b, 0xffd93d, 0xff85a2, 0xffffff, 0x9b59b6];

    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const fx = Math.cos(angle) * dist;
        const fz = Math.sin(angle) * dist;

        // Stem
        const stemGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.4 + Math.random() * 0.3, 4);
        const stemMat = new THREE.MeshPhongMaterial({ color: 0x228B22 });
        const stem = new THREE.Mesh(stemGeom, stemMat);
        stem.position.set(fx, 0.2, fz);
        group.add(stem);

        // Flower petals
        const petalCount = 4 + Math.floor(Math.random() * 4);
        const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const petalMat = new THREE.MeshPhongMaterial({ color: flowerColor });

        for (let j = 0; j < petalCount; j++) {
            const petalGeom = new THREE.SphereGeometry(0.08, 4, 4);
            petalGeom.scale(1, 0.3, 1);
            const petal = new THREE.Mesh(petalGeom, petalMat);
            const petalAngle = (j / petalCount) * Math.PI * 2;
            petal.position.set(
                fx + Math.cos(petalAngle) * 0.1,
                0.4 + Math.random() * 0.2,
                fz + Math.sin(petalAngle) * 0.1
            );
            group.add(petal);
        }

        // Center
        const centerGeom = new THREE.SphereGeometry(0.06, 6, 6);
        const centerMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
        const center = new THREE.Mesh(centerGeom, centerMat);
        center.position.set(fx, 0.45 + Math.random() * 0.15, fz);
        group.add(center);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);
}

export function createPalmTree(ctx: WorldContext, x: number, z: number, scale: number = 1): void {
    const group = new THREE.Group();
    scale = Math.max(0.1, scale || 1);

    // Curved trunk
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true });
    const trunkHeight = 8 * scale;
    const segments = 6;

    for (let i = 0; i < segments; i++) {
        const segmentHeight = trunkHeight / segments;
        const bottomRadius = (0.5 - i * 0.05) * scale;
        const topRadius = (0.45 - i * 0.05) * scale;

        const segGeom = new THREE.CylinderGeometry(topRadius, bottomRadius, segmentHeight, 8);
        const segment = new THREE.Mesh(segGeom, trunkMat);

        const curve = Math.sin((i / segments) * Math.PI * 0.3) * 0.5 * scale;
        segment.position.set(curve, (i + 0.5) * segmentHeight, 0);
        segment.rotation.z = (i / segments) * 0.15;
        segment.castShadow = true;
        group.add(segment);

        // Trunk rings
        const ringGeom = new THREE.TorusGeometry(bottomRadius + 0.05 * scale, 0.05 * scale, 4, 8);
        const ringMat = new THREE.MeshPhongMaterial({ color: 0x6B4423 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(curve, i * segmentHeight, 0);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }

    // Fronds (palm leaves)
    const frondCount = 10;
    const frondMat = new THREE.MeshPhongMaterial({ color: 0x228B22, side: THREE.DoubleSide });

    for (let i = 0; i < frondCount; i++) {
        const frond = createPalmFrond(scale, frondMat);
        const angle = (i / frondCount) * Math.PI * 2;
        frond.position.set(
            Math.sin((segments / segments) * Math.PI * 0.3) * 0.5 * scale,
            trunkHeight,
            0
        );
        frond.rotation.set(0.5, angle, 0);
        group.add(frond);
    }

    // Coconuts
    const coconutMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    for (let i = 0; i < 3; i++) {
        const coconutGeom = new THREE.SphereGeometry(0.25 * scale, 8, 8);
        const coconut = new THREE.Mesh(coconutGeom, coconutMat);
        const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        coconut.position.set(
            Math.sin((segments / segments) * Math.PI * 0.3) * 0.5 * scale + Math.cos(angle) * 0.4 * scale,
            trunkHeight - 0.3 * scale,
            Math.sin(angle) * 0.4 * scale
        );
        group.add(coconut);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'tree',
        x, z,
        radius: 0.8 * scale,
        height: trunkHeight + 3 * scale
    });

    ctx.animatedObjects.push({
        type: 'tree',
        object: group,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.2,
        swayAmount: 0.03 + Math.random() * 0.02
    });
}

function createPalmFrond(scale: number, material: THREE.Material): THREE.Group {
    const frond = new THREE.Group();
    const stemLength = 3 * scale;

    // Main stem
    const stemGeom = new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, stemLength, 4);
    const stem = new THREE.Mesh(stemGeom, material);
    stem.rotation.x = -Math.PI / 4;
    stem.position.set(0, stemLength * 0.3, stemLength * 0.3);
    frond.add(stem);

    // Leaflets
    for (let i = 0; i < 8; i++) {
        const leafSize = (0.8 - i * 0.08) * scale;
        const leafGeom = new THREE.PlaneGeometry(leafSize, 0.15 * scale);
        const leaf = new THREE.Mesh(leafGeom, material);

        const t = i / 7;
        leaf.position.set(
            0,
            stemLength * 0.1 + t * stemLength * 0.5,
            t * stemLength * 0.5
        );
        leaf.rotation.set(-Math.PI / 4 - t * 0.3, 0, Math.PI / 6);
        frond.add(leaf);

        const leafRight = new THREE.Mesh(leafGeom, material);
        leafRight.position.set(
            0,
            stemLength * 0.1 + t * stemLength * 0.5,
            t * stemLength * 0.5
        );
        leafRight.rotation.set(-Math.PI / 4 - t * 0.3, 0, -Math.PI / 6);
        frond.add(leafRight);
    }

    return frond;
}

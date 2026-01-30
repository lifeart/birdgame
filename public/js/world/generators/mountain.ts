// Mountain generators - peaks, snow, rocky terrain
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createMountainPeak(ctx: WorldContext, x: number, z: number, scale: number = 1): void {
    const group = new THREE.Group();
    scale = Math.max(0.1, scale || 1);

    const rockMat = new THREE.MeshPhongMaterial({ color: 0x696969, flatShading: true });
    const snowMat = new THREE.MeshPhongMaterial({ color: 0xFFFAFA, flatShading: true });

    // Main peak
    const peakGeom = new THREE.ConeGeometry(15 * scale, 30 * scale, 8);
    const peak = new THREE.Mesh(peakGeom, rockMat);
    peak.position.y = 15 * scale;
    peak.castShadow = true;
    group.add(peak);

    // Snow cap
    const snowGeom = new THREE.ConeGeometry(8 * scale, 12 * scale, 8);
    const snow = new THREE.Mesh(snowGeom, snowMat);
    snow.position.y = 24 * scale;
    group.add(snow);

    // Rocky base clusters
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 10 + Math.random() * 8;
        const rockSize = 3 + Math.random() * 4;

        const rockGeom = new THREE.DodecahedronGeometry(rockSize * scale, 0);
        const rock = new THREE.Mesh(rockGeom, rockMat);
        rock.position.set(
            Math.cos(angle) * dist * scale,
            rockSize * 0.5 * scale,
            Math.sin(angle) * dist * scale
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        group.add(rock);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    // Main peak collider
    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'mountain',
        x, z,
        radius: 15 * scale,
        height: 30 * scale
    });
}

export function createSnowPatch(ctx: WorldContext, x: number, z: number): void {
    const size = 3 + Math.random() * 5;
    const patchGeom = new THREE.CircleGeometry(size, 8);
    const patchMat = new THREE.MeshLambertMaterial({ color: 0xFFFAFA });
    const patch = new THREE.Mesh(patchGeom, patchMat);

    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.03, z);

    ctx.scene.add(patch);
    ctx.objects.push(patch);
}

export function createRockyTerrain(ctx: WorldContext): void {
    const rockColors = [0x696969, 0x808080, 0x5a5a5a, 0x4a4a4a];

    for (let i = 0; i < 40; i++) {
        const x = (Math.random() - 0.5) * 250;
        const z = (Math.random() - 0.5) * 250;
        const size = 1 + Math.random() * 3;

        const rockGeom = new THREE.DodecahedronGeometry(size, 0);
        const rockMat = new THREE.MeshPhongMaterial({
            color: rockColors[Math.floor(Math.random() * rockColors.length)],
            flatShading: true
        });
        const rock = new THREE.Mesh(rockGeom, rockMat);

        rock.position.set(x, size * 0.4, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;

        ctx.scene.add(rock);
        ctx.objects.push(rock);

        // Add collider for larger rocks
        if (size > 2) {
            ctx.colliders.push({
                type: 'cylinder',
                objectType: 'rock',
                x, z,
                radius: size * 0.8,
                height: size * 1.5
            });
        }
    }
}

export function createIcicle(ctx: WorldContext, x: number, y: number, z: number): void {
    const icicleGeom = new THREE.ConeGeometry(0.1, 0.5 + Math.random() * 0.5, 6);
    const icicleMat = new THREE.MeshPhongMaterial({
        color: 0xE0FFFF,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    const icicle = new THREE.Mesh(icicleGeom, icicleMat);

    icicle.position.set(x, y, z);
    icicle.rotation.x = Math.PI;

    ctx.scene.add(icicle);
    ctx.objects.push(icicle);
}

export function createFrozenLake(ctx: WorldContext, x: number, z: number, radius: number = 15): void {
    const group = new THREE.Group();

    // Ice surface
    const iceGeom = new THREE.CircleGeometry(radius, 32);
    const iceMat = new THREE.MeshPhongMaterial({
        color: 0xADD8E6,
        transparent: true,
        opacity: 0.9,
        shininess: 100
    });
    const ice = new THREE.Mesh(iceGeom, iceMat);
    ice.rotation.x = -Math.PI / 2;
    ice.position.y = 0.05;
    group.add(ice);

    // Cracks in ice (decorative lines)
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
        const crackLength = radius * 0.3 + Math.random() * radius * 0.5;
        const crackGeom = new THREE.PlaneGeometry(0.1, crackLength);
        const crack = new THREE.Mesh(crackGeom, crackMat);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.6;
        crack.rotation.x = -Math.PI / 2;
        crack.rotation.z = angle;
        crack.position.set(
            Math.cos(angle) * dist,
            0.06,
            Math.sin(angle) * dist
        );
        group.add(crack);
    }

    // Snow around edges
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const snowSize = 1 + Math.random() * 2;
        const snowGeom = new THREE.CircleGeometry(snowSize, 6);
        const snowMat = new THREE.MeshLambertMaterial({ color: 0xFFFAFA });
        const snowPatch = new THREE.Mesh(snowGeom, snowMat);
        snowPatch.rotation.x = -Math.PI / 2;
        snowPatch.position.set(
            Math.cos(angle) * (radius + Math.random() * 3),
            0.02,
            Math.sin(angle) * (radius + Math.random() * 3)
        );
        group.add(snowPatch);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'ice',
        x, z,
        radius: radius + 1,
        height: 0.2
    });
}

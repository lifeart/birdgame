// Props generators - benches, lamps, fountains, clouds, rocks
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createBench(ctx: WorldContext, x: number, z: number, rotation: number = 0): void {
    const group = new THREE.Group();

    const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const metalMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, shininess: 60 });

    // Seat planks
    for (let i = 0; i < 4; i++) {
        const plankGeom = new THREE.BoxGeometry(4, 0.1, 0.3);
        const plank = new THREE.Mesh(plankGeom, woodMat);
        plank.position.set(0, 1, -0.3 + i * 0.25);
        plank.castShadow = true;
        group.add(plank);
    }

    // Back planks
    for (let i = 0; i < 3; i++) {
        const plankGeom = new THREE.BoxGeometry(4, 0.1, 0.25);
        const plank = new THREE.Mesh(plankGeom, woodMat);
        plank.position.set(0, 1.4 + i * 0.3, -0.45);
        plank.rotation.x = 0.15;
        plank.castShadow = true;
        group.add(plank);
    }

    // Metal legs
    const createLeg = (xPos: number) => {
        const legGeom = new THREE.BoxGeometry(0.15, 1, 0.6);
        const leg = new THREE.Mesh(legGeom, metalMat);
        leg.position.set(xPos, 0.5, 0);
        group.add(leg);

        const backSupportGeom = new THREE.BoxGeometry(0.1, 1.2, 0.1);
        const backSupport = new THREE.Mesh(backSupportGeom, metalMat);
        backSupport.position.set(xPos, 1.5, -0.45);
        backSupport.rotation.x = 0.15;
        group.add(backSupport);
    };

    createLeg(-1.7);
    createLeg(1.7);

    // Armrests
    const armrestGeom = new THREE.BoxGeometry(0.15, 0.1, 0.8);
    const leftArm = new THREE.Mesh(armrestGeom, woodMat);
    leftArm.position.set(-1.7, 1.4, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armrestGeom, woodMat);
    rightArm.position.set(1.7, 1.4, 0);
    group.add(rightArm);

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    ctx.scene.add(group);
    ctx.objects.push(group);
}

export function createStreetLamp(ctx: WorldContext, x: number, z: number): void {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

    // Pole
    const poleGeom = new THREE.CylinderGeometry(0.15, 0.2, 6, 8);
    const pole = new THREE.Mesh(poleGeom, metalMat);
    pole.position.y = 3;
    pole.castShadow = true;
    group.add(pole);

    // Decorative base
    const baseGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.5, 8);
    const base = new THREE.Mesh(baseGeom, metalMat);
    base.position.y = 0.25;
    group.add(base);

    // Lamp arm
    const armGeom = new THREE.BoxGeometry(1.5, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeom, metalMat);
    arm.position.set(0.75, 5.8, 0);
    group.add(arm);

    // Lamp housing
    const housingGeom = new THREE.ConeGeometry(0.5, 0.6, 6);
    const housingMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
    const housing = new THREE.Mesh(housingGeom, housingMat);
    housing.position.set(1.5, 5.8, 0);
    housing.rotation.z = Math.PI;
    group.add(housing);

    // Light bulb
    const bulbGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffacd });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.set(1.5, 5.5, 0);
    group.add(bulb);

    // Point light
    const light = new THREE.PointLight(0xfffacd, 0.5, 15);
    light.position.set(1.5, 5.5, 0);
    group.add(light);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'metal',
        x, z,
        radius: 0.3,
        height: 6
    });
}

export function createFountain(ctx: WorldContext, x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });

    // Octagonal base
    const baseGeom = new THREE.CylinderGeometry(6, 7, 1.5, 8);
    const base = new THREE.Mesh(baseGeom, stoneMat);
    base.position.y = 0.75;
    base.castShadow = true;
    group.add(base);

    // Inner rim
    const rimGeom = new THREE.TorusGeometry(5, 0.5, 8, 8);
    const rim = new THREE.Mesh(rimGeom, stoneMat);
    rim.position.y = 1.5;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // Water pool
    const waterGeom = new THREE.CylinderGeometry(4.5, 4.5, 0.8, 16);
    const waterMat = new THREE.MeshPhongMaterial({
        color: 0x4169E1, transparent: true, opacity: 0.7, shininess: 100
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.y = 1.4;
    group.add(water);

    // Center pillar
    const pillarGeom = new THREE.CylinderGeometry(0.6, 0.8, 4, 8);
    const pillar = new THREE.Mesh(pillarGeom, stoneMat);
    pillar.position.y = 3.5;
    pillar.castShadow = true;
    group.add(pillar);

    // Decorative rings
    for (let i = 0; i < 3; i++) {
        const ringGeom = new THREE.TorusGeometry(0.7, 0.15, 6, 8);
        const ring = new THREE.Mesh(ringGeom, stoneMat);
        ring.position.y = 2 + i * 1.2;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }

    // Top bowl
    const bowlGeom = new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeom, stoneMat);
    bowl.position.y = 5.5;
    bowl.rotation.x = Math.PI;
    group.add(bowl);

    // Water in top bowl
    const topWaterGeom = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 12);
    const topWater = new THREE.Mesh(topWaterGeom, waterMat);
    topWater.position.y = 5.2;
    group.add(topWater);

    // Statue on top
    const statueGeom = new THREE.ConeGeometry(0.4, 1.2, 4);
    const statueMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a, shininess: 50 });
    const statue = new THREE.Mesh(statueGeom, statueMat);
    statue.position.y = 6.5;
    group.add(statue);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'stone',
        x, z,
        radius: 7,
        height: 7
    });

    return group;
}

export function createCloud(ctx: WorldContext, x: number, y: number, z: number, size: number = 1): THREE.Group {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });

    const cloudParts = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < cloudParts; i++) {
        const partSize = (2 + Math.random() * 2) * size;
        const cloudGeom = new THREE.DodecahedronGeometry(partSize, 0);
        const cloudPart = new THREE.Mesh(cloudGeom, cloudMat);
        cloudPart.position.set(
            (Math.random() - 0.5) * 8 * size,
            (Math.random() - 0.5) * 2 * size,
            (Math.random() - 0.5) * 4 * size
        );
        group.add(cloudPart);
    }

    group.position.set(x, y, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        object: group,
        type: 'cloud',
        speed: 0.01 + Math.random() * 0.02,
        startX: x
    });

    return group;
}

export function createRock(ctx: WorldContext, x: number, z: number, scale: number = 1): void {
    const group = new THREE.Group();
    const rockColors = [0x696969, 0x808080, 0x5a5a5a];

    // Main rock body
    const mainSize = (1.5 + Math.random()) * scale;
    const rockGeom = new THREE.DodecahedronGeometry(mainSize, 0);
    const rockMat = new THREE.MeshPhongMaterial({
        color: rockColors[Math.floor(Math.random() * rockColors.length)],
        flatShading: true
    });
    const rock = new THREE.Mesh(rockGeom, rockMat);
    rock.position.y = mainSize * 0.5;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    group.add(rock);

    // Smaller rocks around
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        const smallSize = (0.3 + Math.random() * 0.5) * scale;
        const smallGeom = new THREE.DodecahedronGeometry(smallSize, 0);
        const smallMat = new THREE.MeshPhongMaterial({
            color: rockColors[Math.floor(Math.random() * rockColors.length)],
            flatShading: true
        });
        const smallRock = new THREE.Mesh(smallGeom, smallMat);
        smallRock.position.set(
            (Math.random() - 0.5) * mainSize * 2,
            smallSize * 0.4,
            (Math.random() - 0.5) * mainSize * 2
        );
        smallRock.rotation.set(Math.random(), Math.random(), Math.random());
        smallRock.castShadow = true;
        group.add(smallRock);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'rock',
        x, z,
        radius: mainSize * 0.8,
        height: mainSize * 1.5
    });
}

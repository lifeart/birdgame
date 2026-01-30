// Structure generators - playground, carousel, farm, windmill, campfire, well
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createPlayground(ctx: WorldContext, x: number, z: number): THREE.Group {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
    const seatMat = new THREE.MeshPhongMaterial({ color: 0x4ECDC4 });
    const slideMat = new THREE.MeshPhongMaterial({ color: 0xFFE66D, shininess: 80 });

    // Swing set frame
    const swingGroup = new THREE.Group();
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);

    // A-frame supports
    [-2, 2].forEach(xPos => {
        const leftPole = new THREE.Mesh(poleGeom, metalMat);
        leftPole.position.set(xPos, 2, -0.8);
        leftPole.rotation.x = 0.2;
        swingGroup.add(leftPole);

        const rightPole = new THREE.Mesh(poleGeom, metalMat);
        rightPole.position.set(xPos, 2, 0.8);
        rightPole.rotation.x = -0.2;
        swingGroup.add(rightPole);
    });

    // Top bar
    const topBarGeom = new THREE.CylinderGeometry(0.08, 0.08, 5, 8);
    const topBar = new THREE.Mesh(topBarGeom, metalMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.y = 3.8;
    swingGroup.add(topBar);

    // Swings
    const swingSeats: THREE.Object3D[] = [];
    const chainGeom = ctx.geometries.chain || new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4);
    const seatGeom = ctx.geometries.swingSeat || new THREE.BoxGeometry(0.8, 0.08, 0.3);

    [-1, 1].forEach(xOffset => {
        // Chains
        const leftChain = new THREE.Mesh(chainGeom, metalMat);
        leftChain.position.set(xOffset - 0.3, 2.5, 0);
        swingGroup.add(leftChain);

        const rightChain = new THREE.Mesh(chainGeom, metalMat);
        rightChain.position.set(xOffset + 0.3, 2.5, 0);
        swingGroup.add(rightChain);

        // Seat
        const seat = new THREE.Mesh(seatGeom, seatMat);
        seat.position.set(xOffset, 1.2, 0);
        seat.name = 'swingSeat';
        swingGroup.add(seat);
        swingSeats.push(seat);
    });

    swingGroup.position.set(-5, 0, 0);
    group.add(swingGroup);

    // Slide
    const slideGroup = new THREE.Group();

    // Platform
    const platformGeom = new THREE.BoxGeometry(3, 0.2, 3);
    const platform = new THREE.Mesh(platformGeom, metalMat);
    platform.position.y = 3;
    slideGroup.add(platform);

    // Ladder
    for (let i = 0; i < 6; i++) {
        const rungGeom = new THREE.BoxGeometry(1.2, 0.1, 0.1);
        const rung = new THREE.Mesh(rungGeom, metalMat);
        rung.position.set(0, 0.5 + i * 0.5, -1.7);
        slideGroup.add(rung);
    }

    // Slide chute
    const chuteGeom = new THREE.BoxGeometry(1.5, 0.1, 5);
    const chute = new THREE.Mesh(chuteGeom, slideMat);
    chute.position.set(0, 1.5, 2.5);
    chute.rotation.x = 0.3;
    slideGroup.add(chute);

    // Side rails
    const railGeom = new THREE.BoxGeometry(0.1, 0.3, 5);
    [-0.8, 0.8].forEach(xPos => {
        const rail = new THREE.Mesh(railGeom, metalMat);
        rail.position.set(xPos, 1.65, 2.5);
        rail.rotation.x = 0.3;
        slideGroup.add(rail);
    });

    slideGroup.position.set(5, 0, 0);
    group.add(slideGroup);

    // Ground mat
    const groundMatGeom = new THREE.BoxGeometry(20, 0.1, 15);
    const groundMatMesh = new THREE.Mesh(groundMatGeom, new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
    groundMatMesh.position.y = 0.05;
    group.add(groundMatMesh);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'swing',
        object: swingGroup,
        seats: swingSeats,
        phase: Math.random() * Math.PI * 2
    });

    return group;
}

export function createCarousel(ctx: WorldContext, x: number, z: number, scale: number = 1): THREE.Group {
    const group = new THREE.Group();
    scale = Math.max(0.1, scale || 1);

    // Base platform
    const baseGeom = new THREE.CylinderGeometry(5 * scale, 5.5 * scale, 0.5 * scale, 16);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.25 * scale;
    group.add(base);

    // Rotating platform
    const platformGroup = new THREE.Group();

    const platformGeom = new THREE.CylinderGeometry(4.5 * scale, 4.5 * scale, 0.3 * scale, 16);
    const platformMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
    const platform = new THREE.Mesh(platformGeom, platformMat);
    platform.position.y = 0.6 * scale;
    platformGroup.add(platform);

    // Center pole
    const poleGeom = new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 5 * scale, 8);
    const poleMat = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 3 * scale;
    platformGroup.add(pole);

    // Roof
    const roofGeom = new THREE.ConeGeometry(5 * scale, 2 * scale, 16);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 6 * scale;
    platformGroup.add(roof);

    // Horses (simplified)
    const horseColors = [0xFFD700, 0xFF6B6B, 0x4ECDC4, 0x9B59B6];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const horse = createCarouselHorse(ctx, scale * 0.8, horseColors[i % horseColors.length]);
        horse.position.set(
            Math.cos(angle) * 3 * scale,
            1.5 * scale,
            Math.sin(angle) * 3 * scale
        );
        horse.rotation.y = angle + Math.PI / 2;
        horse.name = 'carouselHorse';
        platformGroup.add(horse);
    }

    platformGroup.position.y = 0.5 * scale;
    group.add(platformGroup);
    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'carousel',
        object: platformGroup,
        speed: 0.3,
        phase: Math.random() * Math.PI * 2
    });

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'carousel',
        x, z,
        radius: 5 * scale,
        height: 6 * scale
    });

    return group;
}

export function createCarouselHorse(ctx: WorldContext, scale: number, color: number): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color, flatShading: true });

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.4 * scale, 0.35 * scale, 1.2 * scale, 8);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.3 * scale, 8, 6);
    headGeom.scale(1, 1, 1.4);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.set(0.7 * scale, 0.3 * scale, 0);
    group.add(head);

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.08 * scale, 0.06 * scale, 0.6 * scale, 6);
    [[-0.3, 0.15], [-0.3, -0.15], [0.3, 0.15], [0.3, -0.15]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, bodyMat);
        leg.position.set(lx * scale, -0.5 * scale, lz * scale);
        group.add(leg);
    });

    // Pole
    const poleGeom = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 2 * scale, 6);
    const poleMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 0.8 * scale;
    group.add(pole);

    return group;
}

export function createWindmill(ctx: WorldContext, x: number, z: number, scale: number = 1): void {
    const group = new THREE.Group();
    scale = Math.max(0.1, scale || 1);

    // Tower
    const towerGeom = new THREE.CylinderGeometry(2.5 * scale, 3.5 * scale, 12 * scale, 8);
    const towerMat = new THREE.MeshPhongMaterial({ color: 0xD4C4A8, flatShading: true });
    const tower = new THREE.Mesh(towerGeom, towerMat);
    tower.position.y = 6 * scale;
    tower.castShadow = true;
    group.add(tower);

    // Roof
    const roofGeom = new THREE.ConeGeometry(3 * scale, 3 * scale, 8);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 13.5 * scale;
    roof.castShadow = true;
    group.add(roof);

    // Blades group
    const bladesGroup = new THREE.Group();
    const bladeMat = new THREE.MeshPhongMaterial({ color: 0xF5F5DC, side: THREE.DoubleSide });

    for (let i = 0; i < 4; i++) {
        const bladeGroup = new THREE.Group();

        // Main blade
        const bladeGeom = new THREE.PlaneGeometry(1 * scale, 6 * scale);
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.y = 3 * scale;
        bladeGroup.add(blade);

        // Support
        const supportGeom = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 6 * scale, 4);
        const supportMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const support = new THREE.Mesh(supportGeom, supportMat);
        support.position.y = 3 * scale;
        bladeGroup.add(support);

        bladeGroup.rotation.z = (i * Math.PI) / 2;
        bladesGroup.add(bladeGroup);
    }

    bladesGroup.position.set(0, 11 * scale, 3.5 * scale);
    group.add(bladesGroup);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'windmill',
        object: bladesGroup,
        speed: 0.3 + Math.random() * 0.2
    });

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'stone',
        x, z,
        radius: 4 * scale,
        height: 15 * scale
    });
}

export function createCampfire(ctx: WorldContext, x: number, z: number): THREE.Group {
    const group = new THREE.Group();

    // Wood logs
    const logMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });
    for (let i = 0; i < 5; i++) {
        const logGeom = new THREE.CylinderGeometry(0.15, 0.12, 1.2, 6);
        const log = new THREE.Mesh(logGeom, logMat);
        const angle = (i / 5) * Math.PI * 2;
        log.position.set(Math.cos(angle) * 0.4, 0.1, Math.sin(angle) * 0.4);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = angle;
        group.add(log);
    }

    // Fire
    const fireGeom = new THREE.ConeGeometry(0.4, 1, 6);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xFF4500 });
    const fire = new THREE.Mesh(fireGeom, fireMat);
    fire.position.y = 0.5;
    group.add(fire);

    // Inner fire (brighter)
    const innerFireGeom = new THREE.ConeGeometry(0.25, 0.7, 6);
    const innerFireMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const innerFire = new THREE.Mesh(innerFireGeom, innerFireMat);
    innerFire.position.y = 0.45;
    group.add(innerFire);

    // Light
    const fireLight = new THREE.PointLight(0xFF6600, 1, 10);
    fireLight.position.y = 0.5;
    group.add(fireLight);

    // Smoke particles
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3 });
    for (let i = 0; i < 5; i++) {
        const smokeGeom = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6);
        const smoke = new THREE.Mesh(smokeGeom, smokeMat.clone());
        smoke.position.set(
            (Math.random() - 0.5) * 0.3,
            1 + i * 0.5,
            (Math.random() - 0.5) * 0.3
        );
        smoke.name = 'smoke';
        group.add(smoke);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'campfire',
        object: group,
        fire: fire,
        innerFire: innerFire,
        light: fireLight,
        phase: Math.random() * Math.PI * 2
    });

    return group;
}

export function createWell(ctx: WorldContext, x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

    // Stone base
    const baseGeom = new THREE.CylinderGeometry(1.5, 1.8, 1.5, 8);
    const base = new THREE.Mesh(baseGeom, stoneMat);
    base.position.y = 0.75;
    base.castShadow = true;
    group.add(base);

    // Inner well (dark)
    const innerGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 8);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    inner.position.y = 1.3;
    group.add(inner);

    // Wooden frame
    [-1.2, 1.2].forEach(xPos => {
        const postGeom = new THREE.BoxGeometry(0.2, 3, 0.2);
        const post = new THREE.Mesh(postGeom, woodMat);
        post.position.set(xPos, 2.5, 0);
        post.castShadow = true;
        group.add(post);
    });

    // Roof beam
    const beamGeom = new THREE.BoxGeometry(3, 0.2, 0.2);
    const beam = new THREE.Mesh(beamGeom, woodMat);
    beam.position.y = 4;
    group.add(beam);

    // Roof
    const roofGeom = new THREE.ConeGeometry(1.8, 1.5, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 4.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Crank handle
    const crankGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6);
    const crank = new THREE.Mesh(crankGeom, woodMat);
    crank.rotation.z = Math.PI / 2;
    crank.position.set(1.8, 3.5, 0);
    group.add(crank);

    // Bucket
    const bucketGeom = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8);
    const bucketMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const bucket = new THREE.Mesh(bucketGeom, bucketMat);
    bucket.position.y = 2.5;
    group.add(bucket);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'stone',
        x, z,
        radius: 2,
        height: 5
    });

    return group;
}

export function createFarm(ctx: WorldContext, x: number, z: number): void {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 });

    // Barn
    const barnWidth = 15;
    const barnDepth = 12;
    const barnHeight = 8;

    const wallGeom = new THREE.BoxGeometry(barnWidth, barnHeight, barnDepth);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x8B0000, flatShading: true });
    const walls = new THREE.Mesh(wallGeom, wallMat);
    walls.position.y = barnHeight / 2;
    walls.castShadow = true;
    group.add(walls);

    // Roof
    const roofGeom = new THREE.ConeGeometry(barnWidth * 0.7, 4, 4);
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = barnHeight + 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Barn doors
    const doorGeom = new THREE.BoxGeometry(5, 6, 0.3);
    const door = new THREE.Mesh(doorGeom, woodMat);
    door.position.set(0, 3, barnDepth / 2 + 0.15);
    group.add(door);

    // Fence around farm
    const fenceMat = new THREE.MeshPhongMaterial({ color: 0xD4A574 });
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const fenceX = Math.cos(angle) * 25;
        const fenceZ = Math.sin(angle) * 25;

        // Post
        const postGeom = new THREE.BoxGeometry(0.3, 2, 0.3);
        const post = new THREE.Mesh(postGeom, fenceMat);
        post.position.set(fenceX, 1, fenceZ);
        group.add(post);

        // Rails
        for (let j = 0; j < 2; j++) {
            const railGeom = new THREE.BoxGeometry(0.1, 0.15, 18);
            const rail = new THREE.Mesh(railGeom, fenceMat);
            const nextAngle = ((i + 1) / 8) * Math.PI * 2;
            const midX = (fenceX + Math.cos(nextAngle) * 25) / 2;
            const midZ = (fenceZ + Math.sin(nextAngle) * 25) / 2;
            rail.position.set(midX, 0.5 + j * 0.8, midZ);
            rail.rotation.y = angle + Math.PI / 2 + Math.PI / 8;
            group.add(rail);
        }
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'box',
        objectType: 'building',
        x, z,
        width: barnWidth + 2,
        depth: barnDepth + 2,
        height: barnHeight + 4
    });
}

export function createAnimal(ctx: WorldContext, x: number, z: number, type: string = 'chicken'): THREE.Group {
    const group = new THREE.Group();

    if (type === 'chicken') {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true });

        // Body
        const bodyGeom = new THREE.SphereGeometry(0.25, 8, 6);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.3;
        group.add(body);

        // Head
        const headGeom = new THREE.SphereGeometry(0.12, 8, 6);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0, 0.5, 0.15);
        group.add(head);

        // Comb
        const combGeom = new THREE.ConeGeometry(0.05, 0.12, 4);
        const combMat = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        const comb = new THREE.Mesh(combGeom, combMat);
        comb.position.set(0, 0.62, 0.12);
        group.add(comb);

        // Beak
        const beakGeom = new THREE.ConeGeometry(0.03, 0.08, 4);
        const beakMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
        const beak = new THREE.Mesh(beakGeom, beakMat);
        beak.position.set(0, 0.48, 0.25);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);
    } else if (type === 'cow') {
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true });

        // Body
        const bodyGeom = new THREE.CylinderGeometry(0.5, 0.4, 1.2, 8);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.8;
        group.add(body);

        // Head
        const headGeom = new THREE.BoxGeometry(0.4, 0.35, 0.5);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0.7, 0.9, 0);
        group.add(head);

        // Spots
        const spotMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
        for (let i = 0; i < 3; i++) {
            const spotGeom = new THREE.CircleGeometry(0.15, 6);
            const spot = new THREE.Mesh(spotGeom, spotMat);
            spot.position.set(
                (Math.random() - 0.5) * 0.6,
                0.8 + Math.random() * 0.4,
                0.45
            );
            spot.rotation.y = Math.PI / 2;
            group.add(spot);
        }

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.6, 6);
        const legMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        [[-0.3, 0.3], [-0.3, -0.3], [0.3, 0.3], [0.3, -0.3]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(lx, 0.3, lz);
            group.add(leg);
        });

        group.scale.setScalar(1.5);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'animal',
        object: group,
        animalType: type,
        phase: Math.random() * Math.PI * 2
    });

    return group;
}

export function createHaystack(ctx: WorldContext, x: number, z: number, scale: number = 1): void {
    const group = new THREE.Group();
    scale = Math.max(0.1, scale || 1);

    // Main hay pile
    const hayGeom = new THREE.CylinderGeometry(1.5 * scale, 2 * scale, 2 * scale, 8);
    const hayMat = new THREE.MeshPhongMaterial({ color: 0xDAA520, flatShading: true });
    const hay = new THREE.Mesh(hayGeom, hayMat);
    hay.position.y = 1 * scale;
    hay.castShadow = true;
    group.add(hay);

    // Top
    const topGeom = new THREE.ConeGeometry(1.6 * scale, 1.2 * scale, 8);
    const top = new THREE.Mesh(topGeom, hayMat);
    top.position.y = 2.6 * scale;
    top.castShadow = true;
    group.add(top);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'hay',
        x, z,
        radius: 2 * scale,
        height: 3 * scale
    });
}

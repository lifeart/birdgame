// Animal generators - pigeons, seagulls, eagles, ducks, deer
import * as THREE from 'three';
import type { WorldContext, SharedMaterials, SharedGeometries } from '../types.ts';

export function createPigeon(
    ctx: WorldContext,
    x: number,
    z: number,
    onRoof: boolean = true,
    roofHeight: number = 0
): THREE.Group {
    const group = new THREE.Group();
    const mat = ctx.materials as Record<string, THREE.Material>;

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.3, 8, 6);
    bodyGeom.scale(1, 0.8, 1.3);
    const body = new THREE.Mesh(bodyGeom, mat.pigeonBody);
    body.position.y = 0.3;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.18, 8, 6);
    const head = new THREE.Mesh(headGeom, mat.pigeonBody);
    head.position.set(0, 0.5, 0.25);
    group.add(head);

    // Neck
    const neckGeom = new THREE.SphereGeometry(0.12, 6, 4);
    const neck = new THREE.Mesh(neckGeom, mat.pigeonNeck);
    neck.position.set(0, 0.42, 0.18);
    group.add(neck);

    // Beak
    const beakGeom = new THREE.ConeGeometry(0.05, 0.15, 4);
    const beak = new THREE.Mesh(beakGeom, mat.pigeonBeak);
    beak.position.set(0, 0.48, 0.4);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    // Wings
    const wingGeom = new THREE.SphereGeometry(0.2, 4, 4);
    wingGeom.scale(0.4, 0.2, 1);

    const leftWing = new THREE.Mesh(wingGeom, mat.pigeonWing);
    leftWing.position.set(-0.25, 0.35, 0);
    leftWing.rotation.z = 0.3;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeom.clone(), mat.pigeonWing);
    rightWing.position.set(0.25, 0.35, 0);
    rightWing.rotation.z = -0.3;
    group.add(rightWing);

    // Tail
    const tailGeom = new THREE.ConeGeometry(0.12, 0.3, 4);
    const tail = new THREE.Mesh(tailGeom, mat.pigeonWing);
    tail.position.set(0, 0.25, -0.35);
    tail.rotation.x = -Math.PI / 4;
    group.add(tail);

    // Feet
    const footGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
    [-0.1, 0.1].forEach(offset => {
        const foot = new THREE.Mesh(footGeom, mat.pigeonFoot);
        foot.position.set(offset, 0.07, 0.05);
        group.add(foot);
    });

    const y = onRoof ? roofHeight : 0;
    group.position.set(x, y, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.scale.setScalar(0.8 + Math.random() * 0.3);

    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'pigeon',
        object: group,
        head: head,
        originalHeadY: 0.5,
        phase: Math.random() * Math.PI * 2,
        peckSpeed: 2 + Math.random() * 2
    });

    return group;
}

export function createSeagull(
    ctx: WorldContext,
    x: number,
    y: number,
    z: number,
    flying: boolean = true
): THREE.Group {
    const group = new THREE.Group();
    const mat = ctx.materials as Record<string, THREE.Material>;

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.4, 8, 6);
    bodyGeom.scale(1, 0.7, 1.5);
    const body = new THREE.Mesh(bodyGeom, mat.seagullBody);
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.22, 8, 6);
    const head = new THREE.Mesh(headGeom, mat.seagullBody);
    head.position.set(0, 0.15, 0.45);
    group.add(head);

    // Beak
    const beakGeom = new THREE.ConeGeometry(0.06, 0.25, 4);
    const beak = new THREE.Mesh(beakGeom, mat.seagullBeak);
    beak.position.set(0, 0.1, 0.68);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    // Eyes
    const eyeGeom = (ctx.geometries as Record<string, THREE.BufferGeometry>).smallEye || new THREE.SphereGeometry(0.04, 6, 6);
    [-0.1, 0.1].forEach(offset => {
        const eye = new THREE.Mesh(eyeGeom, mat.blackEye);
        eye.position.set(offset, 0.2, 0.58);
        group.add(eye);
    });

    // Wings
    const wingGeom = new THREE.PlaneGeometry(1.5, 0.5);
    const leftWing = new THREE.Mesh(wingGeom, mat.seagullWing);
    leftWing.position.set(-0.8, 0.1, 0);
    leftWing.rotation.z = flying ? 0.3 : 0.8;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeom, mat.seagullWing);
    rightWing.position.set(0.8, 0.1, 0);
    rightWing.rotation.z = flying ? -0.3 : -0.8;
    group.add(rightWing);

    // Wing tips
    const tipGeom = new THREE.PlaneGeometry(0.3, 0.3);
    const leftTip = new THREE.Mesh(tipGeom, mat.seagullWingTip);
    leftTip.position.set(-1.5, 0.15, 0);
    leftTip.rotation.z = flying ? 0.4 : 0.9;
    group.add(leftTip);

    const rightTip = new THREE.Mesh(tipGeom, mat.seagullWingTip);
    rightTip.position.set(1.5, 0.15, 0);
    rightTip.rotation.z = flying ? -0.4 : -0.9;
    group.add(rightTip);

    // Tail
    const tailGeom = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeom, mat.seagullBody);
    tail.position.set(0, 0, -0.6);
    tail.rotation.x = -Math.PI / 6;
    group.add(tail);

    // Legs (only if not flying)
    if (!flying) {
        const legMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
        const legGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
        [-0.12, 0.12].forEach(offset => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(offset, -0.35, 0.1);
            group.add(leg);
        });
    }

    group.position.set(x, y, z);
    group.rotation.y = Math.random() * Math.PI * 2;

    ctx.scene.add(group);
    ctx.objects.push(group);

    if (flying) {
        ctx.animatedObjects.push({
            type: 'flyingBird',
            object: group,
            leftWing: leftWing,
            rightWing: rightWing,
            phase: Math.random() * Math.PI * 2,
            flapSpeed: 3 + Math.random() * 2,
            circleRadius: 30 + Math.random() * 40,
            circleSpeed: 0.2 + Math.random() * 0.2,
            baseY: y,
            centerX: x,
            centerZ: z
        });
    }

    return group;
}

export function createEagle(ctx: WorldContext, x: number, y: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const mat = ctx.materials as Record<string, THREE.Material>;

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.6, 8, 6);
    bodyGeom.scale(1, 0.6, 1.8);
    const body = new THREE.Mesh(bodyGeom, mat.eagleBody);
    group.add(body);

    // Head (white - bald eagle style)
    const headGeom = new THREE.SphereGeometry(0.3, 8, 6);
    const head = new THREE.Mesh(headGeom, mat.eagleHead);
    head.position.set(0, 0.2, 0.7);
    group.add(head);

    // Beak
    const beakGeom = new THREE.ConeGeometry(0.1, 0.35, 4);
    const beak = new THREE.Mesh(beakGeom, mat.pigeonBeak);
    beak.position.set(0, 0.1, 1);
    beak.rotation.x = Math.PI / 2.5;
    group.add(beak);

    // Eyes
    const eyeGeom = (ctx.geometries as Record<string, THREE.BufferGeometry>).mediumEye || new THREE.SphereGeometry(0.06, 6, 6);
    [-0.12, 0.12].forEach(offset => {
        const eye = new THREE.Mesh(eyeGeom, mat.brownEye);
        eye.position.set(offset, 0.28, 0.85);
        group.add(eye);
    });

    // Wings
    const wingGeom = new THREE.PlaneGeometry(2.5, 0.7);
    const leftWing = new THREE.Mesh(wingGeom, mat.eagleWing);
    leftWing.position.set(-1.3, 0.1, 0);
    leftWing.rotation.z = 0.2;
    leftWing.name = 'leftWing';
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeom, mat.eagleWing);
    rightWing.position.set(1.3, 0.1, 0);
    rightWing.rotation.z = -0.2;
    rightWing.name = 'rightWing';
    group.add(rightWing);

    // Tail
    const tailGeom = new THREE.PlaneGeometry(0.5, 0.8);
    const tail = new THREE.Mesh(tailGeom, mat.eagleWing);
    tail.position.set(0, 0, -0.9);
    tail.rotation.x = -Math.PI / 6;
    group.add(tail);

    group.position.set(x, y, z);
    group.scale.setScalar(1.5);

    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'soaringBird',
        object: group,
        leftWing: leftWing,
        rightWing: rightWing,
        phase: Math.random() * Math.PI * 2,
        soarSpeed: 0.5,
        circleRadius: 50 + Math.random() * 30,
        circleSpeed: 0.1 + Math.random() * 0.1,
        baseY: y,
        centerX: x,
        centerZ: z,
        verticalRange: 10
    });

    return group;
}

export function createDuck(ctx: WorldContext, x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const mat = ctx.materials as Record<string, THREE.Material>;

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.35, 8, 6);
    bodyGeom.scale(1, 0.7, 1.3);
    const body = new THREE.Mesh(bodyGeom, mat.duckBody);
    body.position.y = 0.2;
    group.add(body);

    // Head (green)
    const headGeom = new THREE.SphereGeometry(0.2, 8, 6);
    const head = new THREE.Mesh(headGeom, mat.duckHead);
    head.position.set(0, 0.45, 0.25);
    group.add(head);

    // White ring
    const ringGeom = new THREE.TorusGeometry(0.15, 0.03, 6, 12);
    const ring = new THREE.Mesh(ringGeom, mat.duckRing);
    ring.position.set(0, 0.35, 0.2);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Beak
    const beakGeom = new THREE.BoxGeometry(0.12, 0.05, 0.2);
    const beakMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(0, 0.42, 0.45);
    group.add(beak);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeom = new THREE.SphereGeometry(0.03, 6, 6);
    [-0.08, 0.08].forEach(offset => {
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(offset, 0.5, 0.38);
        group.add(eye);
    });

    // Tail
    const tailGeom = new THREE.ConeGeometry(0.1, 0.2, 4);
    const tail = new THREE.Mesh(tailGeom, mat.duckTail);
    tail.position.set(0, 0.25, -0.35);
    tail.rotation.x = -Math.PI / 3;
    group.add(tail);

    group.position.set(x, 0.1, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.scale.setScalar(0.9 + Math.random() * 0.2);

    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'swimmingBird',
        object: group,
        phase: Math.random() * Math.PI * 2,
        swimSpeed: 0.3 + Math.random() * 0.2,
        swimRadius: 3 + Math.random() * 4,
        centerX: x,
        centerZ: z,
        bobSpeed: 2 + Math.random()
    });

    return group;
}

export function createDeer(ctx: WorldContext, x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true });
    const legMat = new THREE.MeshPhongMaterial({ color: 0x654321 });

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.5, 0.4, 1.5, 8);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 1.2;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 8, 6);
    headGeom.scale(1, 0.9, 1.2);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.set(0, 1.6, 0.8);
    group.add(head);

    // Snout
    const snoutGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 6);
    const snout = new THREE.Mesh(snoutGeom, bodyMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.5, 1.05);
    group.add(snout);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeom = new THREE.SphereGeometry(0.05, 6, 6);
    [-0.12, 0.12].forEach(offset => {
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(offset, 1.68, 0.9);
        group.add(eye);
    });

    // Ears
    const earGeom = new THREE.ConeGeometry(0.08, 0.2, 4);
    [-0.18, 0.18].forEach(offset => {
        const ear = new THREE.Mesh(earGeom, bodyMat);
        ear.position.set(offset, 1.85, 0.7);
        ear.rotation.z = offset > 0 ? -0.3 : 0.3;
        group.add(ear);
    });

    // Antlers
    const antlerMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
    [-0.12, 0.12].forEach(offset => {
        const antlerGroup = new THREE.Group();

        // Main beam
        const beamGeom = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4);
        const beam = new THREE.Mesh(beamGeom, antlerMat);
        beam.rotation.z = offset > 0 ? -0.3 : 0.3;
        beam.position.y = 0.25;
        antlerGroup.add(beam);

        // Tines
        for (let i = 0; i < 2; i++) {
            const tineGeom = new THREE.CylinderGeometry(0.015, 0.02, 0.2, 4);
            const tine = new THREE.Mesh(tineGeom, antlerMat);
            tine.position.set(
                offset > 0 ? 0.1 + i * 0.1 : -0.1 - i * 0.1,
                0.3 + i * 0.15,
                0
            );
            tine.rotation.z = offset > 0 ? -0.5 : 0.5;
            antlerGroup.add(tine);
        }

        antlerGroup.position.set(offset, 1.8, 0.65);
        group.add(antlerGroup);
    });

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.06, 0.04, 0.8, 6);
    const legPositions = [
        [0.25, 0.7], [-0.25, 0.7], [0.25, -0.5], [-0.25, -0.5]
    ];
    legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(lx, 0.4, lz);
        group.add(leg);
    });

    // Tail
    const tailGeom = new THREE.SphereGeometry(0.1, 6, 6);
    tailGeom.scale(1, 1, 1.5);
    const tailMat = new THREE.MeshPhongMaterial({ color: 0xF5F5DC });
    const tail = new THREE.Mesh(tailGeom, tailMat);
    tail.position.set(0, 1.3, -0.8);
    group.add(tail);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;

    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'deer',
        object: group,
        head: head,
        phase: Math.random() * Math.PI * 2
    });

    return group;
}

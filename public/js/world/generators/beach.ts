// Beach generators - umbrella, chair, shells, sand, sandcastle
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createBeachUmbrella(ctx: WorldContext, x: number, z: number, rotation: number = 0): void {
    const group = new THREE.Group();

    const umbrellaColors = [0xFF6B6B, 0xFFD93D, 0x48DBFB, 0xFF85A2, 0x00FF88];
    const umbrellaColor = umbrellaColors[Math.floor(Math.random() * umbrellaColors.length)];

    // Pole
    const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8);
    const poleMat = new THREE.MeshPhongMaterial({ color: 0xDDDDDD });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 2.25;
    pole.castShadow = true;
    group.add(pole);

    // Canopy
    const canopyGeom = new THREE.ConeGeometry(2.5, 1.2, 8);
    const canopyMat = new THREE.MeshPhongMaterial({ color: umbrellaColor, side: THREE.DoubleSide });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.y = 4.5;
    canopy.rotation.x = Math.PI;
    canopy.castShadow = true;
    group.add(canopy);

    // White stripes
    for (let i = 0; i < 8; i += 2) {
        const stripeGeom = new THREE.ConeGeometry(2.52, 1.22, 8, 1, false, i * Math.PI / 4, Math.PI / 4);
        const stripeMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.y = 4.5;
        stripe.rotation.x = Math.PI;
        group.add(stripe);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    ctx.scene.add(group);
    ctx.objects.push(group);
}

export function createBeachChair(ctx: WorldContext, x: number, z: number, rotation: number = 0): void {
    const group = new THREE.Group();

    const frameColor = 0xDDDDDD;
    const fabricColors = [0xFF6B6B, 0x4ECDC4, 0xFFD93D, 0xFF85A2];
    const fabricColor = fabricColors[Math.floor(Math.random() * fabricColors.length)];

    const frameMat = new THREE.MeshPhongMaterial({ color: frameColor });
    const fabricMat = new THREE.MeshPhongMaterial({ color: fabricColor, side: THREE.DoubleSide });

    // Frame legs
    const legGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
    [[-0.5, -0.4], [-0.5, 0.4], [0.5, -0.4], [0.5, 0.4]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, frameMat);
        leg.position.set(lx, 0.6, lz);
        leg.rotation.x = lz > 0 ? 0.2 : -0.2;
        group.add(leg);
    });

    // Seat
    const seatGeom = new THREE.PlaneGeometry(1, 1.2);
    const seat = new THREE.Mesh(seatGeom, fabricMat);
    seat.position.set(0, 0.5, 0);
    seat.rotation.x = -Math.PI / 2 + 0.2;
    group.add(seat);

    // Back
    const backGeom = new THREE.PlaneGeometry(1, 0.8);
    const back = new THREE.Mesh(backGeom, fabricMat);
    back.position.set(0, 0.9, -0.5);
    back.rotation.x = -0.5;
    group.add(back);

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    ctx.scene.add(group);
    ctx.objects.push(group);
}

export function createSeashell(ctx: WorldContext, x: number, z: number): void {
    const shellColors = [0xFFF5EE, 0xFFE4E1, 0xF0E68C, 0xDEB887];
    const shellColor = shellColors[Math.floor(Math.random() * shellColors.length)];

    const shellGeom = new THREE.ConeGeometry(0.15, 0.1, 8, 1, true);
    const shellMat = new THREE.MeshPhongMaterial({ color: shellColor, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(shellGeom, shellMat);

    shell.position.set(x, 0.03, z);
    shell.rotation.x = Math.PI / 2 + Math.random() * 0.3;
    shell.rotation.y = Math.random() * Math.PI * 2;
    shell.scale.setScalar(0.5 + Math.random() * 0.5);

    ctx.scene.add(shell);
    ctx.objects.push(shell);
}

export function createSandPatches(ctx: WorldContext): void {
    const sandColors = [0xF4A460, 0xDEB887, 0xD2B48C, 0xC4A574];

    for (let i = 0; i < 60; i++) {
        const x = (Math.random() - 0.5) * 300;
        const z = (Math.random() - 0.5) * 300;
        const size = 3 + Math.random() * 6;

        const patchGeom = new THREE.CircleGeometry(size, 8);
        const patchMat = new THREE.MeshLambertMaterial({
            color: sandColors[Math.floor(Math.random() * sandColors.length)]
        });
        const patch = new THREE.Mesh(patchGeom, patchMat);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(x, 0.02, z);
        ctx.scene.add(patch);
        ctx.objects.push(patch);
    }
}

export function createSandcastle(ctx: WorldContext, x: number, z: number, scale: number = 1): void {
    const group = new THREE.Group();
    scale = Math.max(0.1, scale || 1);

    const sandMat = new THREE.MeshPhongMaterial({ color: 0xF4A460, flatShading: true });
    const flagMat = new THREE.MeshPhongMaterial({ color: 0xFF0000 });

    // Main base
    const baseGeom = new THREE.CylinderGeometry(2 * scale, 2.5 * scale, 1 * scale, 8);
    const base = new THREE.Mesh(baseGeom, sandMat);
    base.position.y = 0.5 * scale;
    base.castShadow = true;
    group.add(base);

    // Towers
    const towerPositions = [
        [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]
    ];

    towerPositions.forEach(([tx, tz]) => {
        // Tower body
        const towerGeom = new THREE.CylinderGeometry(0.5 * scale, 0.6 * scale, 1.5 * scale, 8);
        const tower = new THREE.Mesh(towerGeom, sandMat);
        tower.position.set(tx * scale, 1.75 * scale, tz * scale);
        tower.castShadow = true;
        group.add(tower);

        // Tower top
        const topGeom = new THREE.ConeGeometry(0.6 * scale, 0.5 * scale, 8);
        const top = new THREE.Mesh(topGeom, sandMat);
        top.position.set(tx * scale, 2.75 * scale, tz * scale);
        top.castShadow = true;
        group.add(top);

        // Flag
        const poleGeom = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.8 * scale, 4);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.set(tx * scale, 3.4 * scale, tz * scale);
        group.add(pole);

        const flagGeom = new THREE.PlaneGeometry(0.4 * scale, 0.25 * scale);
        const flag = new THREE.Mesh(flagGeom, flagMat);
        flag.position.set(tx * scale + 0.2 * scale, 3.65 * scale, tz * scale);
        group.add(flag);
    });

    // Walls between towers
    for (let i = 0; i < 4; i++) {
        const wallGeom = new THREE.BoxGeometry(2.2 * scale, 0.8 * scale, 0.3 * scale);
        const wall = new THREE.Mesh(wallGeom, sandMat);
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        wall.position.set(
            Math.cos(angle) * 1.5 * scale,
            1.4 * scale,
            Math.sin(angle) * 1.5 * scale
        );
        wall.rotation.y = angle + Math.PI / 2;
        wall.castShadow = true;
        group.add(wall);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'sandcastle',
        x, z,
        radius: 3 * scale,
        height: 4 * scale
    });
}

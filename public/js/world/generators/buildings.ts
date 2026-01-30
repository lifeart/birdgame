// Building generators - buildings, houses, cabin
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createBuilding(
    ctx: WorldContext,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    color: number
): void {
    // Edge case protection
    x = x || 0;
    z = z || 0;
    width = Math.max(1, width || 10);
    depth = Math.max(1, depth || 10);
    height = Math.max(1, height || 10);
    color = color || 0x808080;

    const group = new THREE.Group();

    // Main building
    const buildingGeom = new THREE.BoxGeometry(width, height, depth);
    const buildingMat = new THREE.MeshPhongMaterial({ color, flatShading: true });
    const building = new THREE.Mesh(buildingGeom, buildingMat);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);

    // Windows
    const windowGlassMat = new THREE.MeshPhongMaterial({
        color: 0x87CEEB, shininess: 100, transparent: true, opacity: 0.8
    });
    const windowFrameMat = new THREE.MeshPhongMaterial({ color: 0x404040 });

    const windowSize = 1.8;
    const windowCountX = Math.max(1, Math.floor(width / 4));
    const windowCountY = Math.max(1, Math.floor(height / 5));
    const windowSpacingX = width / windowCountX;
    const windowSpacingY = height / windowCountY;

    for (let wx = -width / 2 + windowSpacingX; wx < width / 2 - 1; wx += windowSpacingX) {
        for (let wy = 3; wy < height - 2; wy += windowSpacingY) {
            const frameGeom = new THREE.BoxGeometry(windowSize + 0.3, windowSize * 1.5 + 0.3, 0.15);
            const frame1 = new THREE.Mesh(frameGeom, windowFrameMat);
            frame1.position.set(wx, wy, depth / 2 + 0.08);
            group.add(frame1);

            const glassGeom = new THREE.BoxGeometry(windowSize, windowSize * 1.5, 0.1);
            const glass1 = new THREE.Mesh(glassGeom, windowGlassMat);
            glass1.position.set(wx, wy, depth / 2 + 0.15);
            group.add(glass1);

            const frame2 = new THREE.Mesh(frameGeom, windowFrameMat);
            frame2.position.set(wx, wy, -depth / 2 - 0.08);
            group.add(frame2);

            const glass2 = new THREE.Mesh(glassGeom, windowGlassMat);
            glass2.position.set(wx, wy, -depth / 2 - 0.15);
            group.add(glass2);
        }
    }

    // Roof
    const roofGeom = new THREE.BoxGeometry(width + 1, 1.5, depth + 1);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + 0.75;
    roof.castShadow = true;
    group.add(roof);

    // AC units
    for (let i = 0; i < 2; i++) {
        const acGeom = new THREE.BoxGeometry(2, 1, 2);
        const acMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const ac = new THREE.Mesh(acGeom, acMat);
        ac.position.set((i - 0.5) * width * 0.4, height + 2, 0);
        ac.castShadow = true;
        group.add(ac);
    }

    // Base
    const baseGeom = new THREE.BoxGeometry(width + 0.5, 1, depth + 0.5);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.5;
    group.add(base);

    // Door
    const doorGeom = new THREE.BoxGeometry(3, 4, 0.3);
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x5a3d2b });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, 2, depth / 2 + 0.15);
    group.add(door);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'box',
        objectType: 'building',
        x, z,
        width: width + 2,
        depth: depth + 2,
        height: height + 3
    });
}

export function createHouse(
    ctx: WorldContext,
    x: number,
    z: number,
    width: number = 10,
    depth: number = 8,
    height: number = 6,
    roofColor: number = 0xB22222
): void {
    const group = new THREE.Group();

    // Foundation
    const foundationGeom = new THREE.BoxGeometry(width + 1, 0.5, depth + 1);
    const foundationMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const foundation = new THREE.Mesh(foundationGeom, foundationMat);
    foundation.position.y = 0.25;
    group.add(foundation);

    // Main structure
    const houseGeom = new THREE.BoxGeometry(width, height, depth);
    const houseMat = new THREE.MeshPhongMaterial({ color: 0xF5DEB3, flatShading: true });
    const house = new THREE.Mesh(houseGeom, houseMat);
    house.position.y = height / 2 + 0.5;
    house.castShadow = true;
    house.receiveShadow = true;
    group.add(house);

    // Roof
    const roofSize = Math.max(width, depth) * 0.7;
    const roofGeom = new THREE.ConeGeometry(roofSize, height * 0.5, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = height + height * 0.25 + 0.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Chimney
    const chimneyGeom = new THREE.BoxGeometry(1.5, 3, 1.5);
    const chimneyMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const chimney = new THREE.Mesh(chimneyGeom, chimneyMat);
    chimney.position.set(width * 0.25, height + 2, 0);
    chimney.castShadow = true;
    group.add(chimney);

    // Door with frame
    const doorFrameGeom = new THREE.BoxGeometry(2.5, 4.5, 0.3);
    const doorFrameMat = new THREE.MeshPhongMaterial({ color: 0x3d2817 });
    const doorFrame = new THREE.Mesh(doorFrameGeom, doorFrameMat);
    doorFrame.position.set(0, 2.75, depth / 2 + 0.15);
    group.add(doorFrame);

    const doorGeom = new THREE.BoxGeometry(2, 4, 0.2);
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x5a3d2b });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, 2.5, depth / 2 + 0.25);
    group.add(door);

    // Door handle
    const handleGeom = new THREE.SphereGeometry(0.15, 6, 6);
    const handleMat = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 100 });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.set(0.6, 2.5, depth / 2 + 0.4);
    group.add(handle);

    // Windows with shutters
    const windowPositions = [
        { x: -width / 3, y: height / 2 + 0.5 },
        { x: width / 3, y: height / 2 + 0.5 }
    ];

    windowPositions.forEach(pos => {
        const frameGeom = new THREE.BoxGeometry(2.5, 2.5, 0.2);
        const frameMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const frame = new THREE.Mesh(frameGeom, frameMat);
        frame.position.set(pos.x, pos.y, depth / 2 + 0.1);
        group.add(frame);

        const glassGeom = new THREE.BoxGeometry(2, 2, 0.1);
        const glassMat = new THREE.MeshPhongMaterial({
            color: 0x87CEEB, shininess: 100, transparent: true, opacity: 0.7
        });
        const glass = new THREE.Mesh(glassGeom, glassMat);
        glass.position.set(pos.x, pos.y, depth / 2 + 0.2);
        group.add(glass);

        const shutterGeom = new THREE.BoxGeometry(0.8, 2.2, 0.1);
        const shutterMat = new THREE.MeshPhongMaterial({ color: 0x2d5c3d });

        const leftShutter = new THREE.Mesh(shutterGeom, shutterMat);
        leftShutter.position.set(pos.x - 1.5, pos.y, depth / 2 + 0.15);
        group.add(leftShutter);

        const rightShutter = new THREE.Mesh(shutterGeom, shutterMat);
        rightShutter.position.set(pos.x + 1.5, pos.y, depth / 2 + 0.15);
        group.add(rightShutter);
    });

    // Porch steps
    for (let i = 0; i < 2; i++) {
        const stepGeom = new THREE.BoxGeometry(3, 0.3, 0.8);
        const stepMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const step = new THREE.Mesh(stepGeom, stepMat);
        step.position.set(0, 0.15 + i * 0.3, depth / 2 + 1 + i * 0.8);
        group.add(step);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'box',
        objectType: 'house',
        x, z,
        width: width + 2,
        depth: depth + 4,
        height: height + 5
    });
}

export function createCabin(ctx: WorldContext, x: number, z: number): void {
    const group = new THREE.Group();

    const logColor = 0x8B4513;
    const roofColor = 0x2F4F4F;
    const cabinWidth = 10;
    const cabinDepth = 8;
    const cabinHeight = 5;

    // Main walls
    const wallMat = new THREE.MeshPhongMaterial({ color: logColor, flatShading: true });
    const wallGeom = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinDepth);
    const walls = new THREE.Mesh(wallGeom, wallMat);
    walls.position.y = cabinHeight / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Log texture lines
    const lineMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });
    for (let i = 0; i < 5; i++) {
        const lineGeom = new THREE.BoxGeometry(cabinWidth + 0.3, 0.08, 0.25);
        const line = new THREE.Mesh(lineGeom, lineMat);
        line.position.set(0, i * 1 + 0.5, cabinDepth / 2 + 0.12);
        group.add(line);

        const lineBack = line.clone();
        lineBack.position.z = -cabinDepth / 2 - 0.12;
        group.add(lineBack);
    }

    // Roof
    const roofSize = Math.max(cabinWidth, cabinDepth) * 0.75;
    const roofGeom = new THREE.ConeGeometry(roofSize, 4, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = cabinHeight + 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Chimney
    const chimneyGeom = new THREE.BoxGeometry(1.2, 3, 1.2);
    const chimneyMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 });
    const chimney = new THREE.Mesh(chimneyGeom, chimneyMat);
    chimney.position.set(cabinWidth / 4, cabinHeight + 3.5, 0);
    chimney.castShadow = true;
    group.add(chimney);

    // Door
    const doorGeom = new THREE.BoxGeometry(2, 3.5, 0.25);
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x3D2314 });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, 1.75, cabinDepth / 2 + 0.12);
    group.add(door);

    // Windows
    const windowMat = new THREE.MeshPhongMaterial({
        color: 0x87CEEB, transparent: true, opacity: 0.7, shininess: 100
    });
    const windowPositions: [number, number][] = [
        [-2.5, cabinDepth / 2 + 0.12], [2.5, cabinDepth / 2 + 0.12],
        [-2.5, -cabinDepth / 2 - 0.12], [2.5, -cabinDepth / 2 - 0.12]
    ];
    windowPositions.forEach(([wx, wz]) => {
        const windowGeom = new THREE.BoxGeometry(1.3, 1.3, 0.15);
        const win = new THREE.Mesh(windowGeom, windowMat);
        win.position.set(wx, 3.5, wz);
        group.add(win);
    });

    // Porch
    const porchGeom = new THREE.BoxGeometry(cabinWidth + 1.5, 0.25, 2.5);
    const porchMat = new THREE.MeshPhongMaterial({ color: 0x6B4423 });
    const porch = new THREE.Mesh(porchGeom, porchMat);
    porch.position.set(0, 0.12, cabinDepth / 2 + 1.25);
    group.add(porch);

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'box',
        objectType: 'house',
        x, z,
        width: cabinWidth + 2,
        depth: cabinDepth + 4,
        height: cabinHeight + 6
    });
}

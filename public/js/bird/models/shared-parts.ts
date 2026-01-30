// Shared bird part creation utilities
import * as THREE from 'three';
import type { BirdTypeConfig } from '../types.ts';

/**
 * Bird part references for animation
 */
export interface BirdParts {
    body: THREE.Mesh;
    breast: THREE.Mesh;
    belly: THREE.Mesh;
    head: THREE.Mesh;
    upperBeak: THREE.Mesh;
    lowerBeak: THREE.Mesh;
    leftWingGroup: THREE.Group;
    rightWingGroup: THREE.Group;
    tailGroup: THREE.Group;
    leftLegGroup: THREE.Group;
    rightLegGroup: THREE.Group;
}

/**
 * Create a standard wing with feathers
 */
export function createWing(
    s: number,
    cfg: BirdTypeConfig,
    side: 'left' | 'right'
): THREE.Group {
    const wingGroup = new THREE.Group();
    const flipX = side === 'right' ? -1 : 1;

    // Wing materials
    const primaryMat = new THREE.MeshPhongMaterial({
        color: cfg.wingColor,
        shininess: 30,
        side: THREE.DoubleSide
    });

    const secondaryMat = new THREE.MeshPhongMaterial({
        color: cfg.wingPatternColor || cfg.wingColor,
        shininess: 25,
        side: THREE.DoubleSide
    });

    // Upper arm (shoulder to elbow)
    const upperArmGeom = new THREE.BoxGeometry(s * 0.25, s * 0.04, s * 0.12);
    const upperArm = new THREE.Mesh(upperArmGeom, primaryMat);
    upperArm.position.set(flipX * s * 0.12, 0, 0);
    upperArm.castShadow = true;
    wingGroup.add(upperArm);

    // Forearm (elbow to wrist)
    const forearmGroup = new THREE.Group();
    const forearmGeom = new THREE.BoxGeometry(s * 0.3, s * 0.03, s * 0.1);
    const forearm = new THREE.Mesh(forearmGeom, primaryMat);
    forearm.position.set(flipX * s * 0.15, 0, 0);
    forearm.castShadow = true;
    forearmGroup.add(forearm);

    // Primary feathers (long flight feathers)
    for (let i = 0; i < 7; i++) {
        const featherLen = s * (0.25 - i * 0.02);
        const featherGeom = new THREE.BoxGeometry(s * 0.015, s * 0.01, featherLen);
        const feather = new THREE.Mesh(featherGeom, primaryMat);
        feather.position.set(
            flipX * (s * 0.25 + i * s * 0.015),
            -s * 0.01,
            -featherLen * 0.4
        );
        feather.rotation.x = 0.1;
        feather.castShadow = true;
        forearmGroup.add(feather);
    }

    forearmGroup.position.set(flipX * s * 0.24, 0, 0);
    wingGroup.add(forearmGroup);

    // Secondary feathers
    for (let i = 0; i < 5; i++) {
        const featherLen = s * (0.15 - i * 0.015);
        const featherGeom = new THREE.BoxGeometry(s * 0.025, s * 0.01, featherLen);
        const feather = new THREE.Mesh(featherGeom, secondaryMat);
        feather.position.set(
            flipX * (s * 0.05 + i * s * 0.03),
            -s * 0.01,
            -featherLen * 0.5
        );
        feather.rotation.x = 0.08;
        wingGroup.add(feather);
    }

    // Position wing at body
    wingGroup.position.set(flipX * s * 0.38, s * 0.05, 0);

    return wingGroup;
}

/**
 * Create a standard tail with feathers
 */
export function createTail(s: number, cfg: BirdTypeConfig): THREE.Group {
    const tailGroup = new THREE.Group();

    const tailMat = new THREE.MeshPhongMaterial({
        color: cfg.tailColor,
        shininess: 25,
        side: THREE.DoubleSide
    });

    // Tail base
    const baseGeom = new THREE.SphereGeometry(s * 0.1, 16, 12);
    baseGeom.scale(0.8, 0.5, 1);
    const base = new THREE.Mesh(baseGeom, tailMat);
    tailGroup.add(base);

    // Tail feathers (fan arrangement)
    const featherCount = 7;
    for (let i = 0; i < featherCount; i++) {
        const angle = ((i - (featherCount - 1) / 2) / featherCount) * 0.8;
        const featherLen = s * 0.2;

        const featherGeom = new THREE.BoxGeometry(s * 0.04, s * 0.01, featherLen);
        const feather = new THREE.Mesh(featherGeom, tailMat);

        feather.position.set(
            Math.sin(angle) * s * 0.08,
            0,
            -featherLen * 0.5 - s * 0.05
        );
        feather.rotation.y = angle;
        feather.castShadow = true;
        tailGroup.add(feather);
    }

    tailGroup.position.set(0, 0, -s * 0.55);
    tailGroup.rotation.x = 0.2;

    return tailGroup;
}

/**
 * Create a standard leg with toes
 */
export function createLeg(
    s: number,
    cfg: BirdTypeConfig,
    side: 'left' | 'right'
): THREE.Group {
    const legGroup = new THREE.Group();
    const flipX = side === 'right' ? -1 : 1;

    const legMat = new THREE.MeshPhongMaterial({
        color: cfg.legColor,
        shininess: 30
    });

    // Upper leg (thigh)
    const thighGeom = new THREE.CylinderGeometry(s * 0.035, s * 0.03, s * 0.12, 10);
    const thigh = new THREE.Mesh(thighGeom, legMat);
    thigh.position.y = -s * 0.06;
    thigh.rotation.x = 0.3;
    legGroup.add(thigh);

    // Foot group
    const footGroup = new THREE.Group();

    // Lower leg (tarsus)
    const tarsusGeom = new THREE.CylinderGeometry(s * 0.025, s * 0.02, s * 0.1, 8);
    const tarsus = new THREE.Mesh(tarsusGeom, legMat);
    tarsus.position.y = -s * 0.05;
    footGroup.add(tarsus);

    // Toes (3 forward, 1 back)
    const createToe = (length: number, angle: number, elevation: number = 0) => {
        const toeGeom = new THREE.CylinderGeometry(s * 0.012, s * 0.008, length, 6);
        toeGeom.rotateX(Math.PI / 2 - elevation);
        toeGeom.rotateZ(angle);
        const toe = new THREE.Mesh(toeGeom, legMat);
        toe.position.set(
            Math.sin(angle) * length * 0.4,
            -s * 0.1,
            Math.cos(angle) * length * 0.4
        );
        return toe;
    };

    // Forward toes
    footGroup.add(createToe(s * 0.08, -0.3));
    footGroup.add(createToe(s * 0.09, 0));
    footGroup.add(createToe(s * 0.08, 0.3));
    // Back toe
    footGroup.add(createToe(s * 0.06, Math.PI, 0.2));

    footGroup.position.set(0, -s * 0.12, s * 0.02);
    legGroup.add(footGroup);

    // Position leg at body
    legGroup.position.set(flipX * s * 0.12, -s * 0.15, s * 0.1);

    return legGroup;
}

/**
 * Create a standard beak
 */
export function createBeak(
    s: number,
    cfg: BirdTypeConfig
): { upper: THREE.Mesh; lower: THREE.Mesh } {
    const beakMat = new THREE.MeshPhongMaterial({
        color: cfg.beakColor,
        shininess: 60
    });

    // Upper beak
    const upperGeom = new THREE.ConeGeometry(s * 0.05, s * 0.12, 6);
    upperGeom.rotateX(-Math.PI / 2);
    const upper = new THREE.Mesh(upperGeom, beakMat);
    upper.position.set(0, 0, s * 0.06);

    // Lower beak (smaller)
    const lowerGeom = new THREE.ConeGeometry(s * 0.04, s * 0.08, 5);
    lowerGeom.rotateX(-Math.PI / 2);
    const lower = new THREE.Mesh(lowerGeom, beakMat);
    lower.position.set(0, -s * 0.02, s * 0.04);

    return { upper, lower };
}

/**
 * Create body feather detail texture
 */
export function createBodyFeathers(
    group: THREE.Group,
    s: number,
    cfg: BirdTypeConfig
): void {
    const featherRows = 6;
    const feathersPerRow = 12;

    for (let row = 0; row < featherRows; row++) {
        const rowAngle = (row / featherRows) * Math.PI * 0.6 - Math.PI * 0.3;
        const rowRadius = s * 0.38 + Math.sin(rowAngle) * s * 0.05;
        const y = Math.sin(rowAngle) * s * 0.25;

        for (let i = 0; i < feathersPerRow; i++) {
            const angle = (i / feathersPerRow) * Math.PI * 2;
            const featherGeom = new THREE.SphereGeometry(s * 0.06, 8, 6);
            featherGeom.scale(0.5, 0.3, 1);

            const featherMat = new THREE.MeshPhongMaterial({
                color: row % 2 === 0 ? cfg.bodyColor : cfg.mantleColor,
                shininess: 20
            });

            const feather = new THREE.Mesh(featherGeom, featherMat);
            feather.position.set(
                Math.sin(angle) * rowRadius,
                y,
                Math.cos(angle) * rowRadius * 0.7 - s * 0.1
            );
            feather.rotation.y = angle;
            feather.rotation.x = rowAngle * 0.5;
            group.add(feather);
        }
    }
}

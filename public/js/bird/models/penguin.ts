// Penguin-specific model creation
import * as THREE from 'three';
import type { BirdTypeConfig } from '../types.ts';

export interface PenguinParts {
    body: THREE.Mesh;
    belly: THREE.Mesh;
    breast: THREE.Mesh;
    leftWingGroup: THREE.Group;
    rightWingGroup: THREE.Group;
    tailGroup: THREE.Group;
    leftLegGroup: THREE.Group;
    rightLegGroup: THREE.Group;
}

/**
 * Create penguin body (upright, egg-shaped)
 */
export function createPenguinBody(
    group: THREE.Group,
    s: number,
    cfg: BirdTypeConfig
): { body: THREE.Mesh; belly: THREE.Mesh; breast: THREE.Mesh } {
    // Main body - smooth egg/oval shape
    const bodyGeom = new THREE.SphereGeometry(s * 0.4, 32, 24);
    bodyGeom.scale(1, 1.4, 0.85);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: cfg.bodyColor,
        shininess: 45,
        flatShading: false
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0;
    body.castShadow = true;
    group.add(body);

    // White belly
    const bellyGeom = new THREE.SphereGeometry(s * 0.38, 28, 20);
    bellyGeom.scale(0.9, 1.35, 0.5);
    const bellyMat = new THREE.MeshPhongMaterial({
        color: cfg.bellyColor,
        shininess: 35
    });
    const belly = new THREE.Mesh(bellyGeom, bellyMat);
    belly.position.set(0, 0, s * 0.18);
    group.add(belly);

    // Upper chest
    const chestGeom = new THREE.SphereGeometry(s * 0.32, 24, 18);
    chestGeom.scale(0.85, 0.6, 0.7);
    const chestMat = new THREE.MeshPhongMaterial({
        color: cfg.breastColor,
        shininess: 30
    });
    const breast = new THREE.Mesh(chestGeom, chestMat);
    breast.position.set(0, s * 0.45, s * 0.12);
    group.add(breast);

    return { body, belly, breast };
}

/**
 * Create penguin flippers
 */
export function createPenguinFlippers(
    group: THREE.Group,
    s: number,
    cfg: BirdTypeConfig
): { leftWingGroup: THREE.Group; rightWingGroup: THREE.Group } {
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();

    const flipperMat = new THREE.MeshPhongMaterial({
        color: cfg.wingColor,
        shininess: 50,
        side: THREE.DoubleSide
    });

    const flipperGeom = new THREE.BoxGeometry(s * 0.08, s * 0.4, s * 0.03);
    const tipGeom = new THREE.SphereGeometry(s * 0.04, 12, 8);
    tipGeom.scale(1, 0.4, 0.4);

    // Left flipper
    const leftFlipper = new THREE.Mesh(flipperGeom, flipperMat);
    leftFlipper.castShadow = true;
    leftWingGroup.add(leftFlipper);

    const leftTip = new THREE.Mesh(tipGeom, flipperMat);
    leftTip.position.set(0, -s * 0.2, 0);
    leftWingGroup.add(leftTip);

    // Right flipper
    const rightFlipper = new THREE.Mesh(flipperGeom, flipperMat);
    rightFlipper.castShadow = true;
    rightWingGroup.add(rightFlipper);

    const rightTip = new THREE.Mesh(tipGeom, flipperMat);
    rightTip.position.set(0, -s * 0.2, 0);
    rightWingGroup.add(rightTip);

    // Position and angle
    leftWingGroup.position.set(s * 0.38, s * 0.1, 0);
    rightWingGroup.position.set(-s * 0.38, s * 0.1, 0);
    leftWingGroup.rotation.z = -0.4;
    rightWingGroup.rotation.z = 0.4;

    group.add(leftWingGroup);
    group.add(rightWingGroup);

    return { leftWingGroup, rightWingGroup };
}

/**
 * Create penguin tail
 */
export function createPenguinTail(
    group: THREE.Group,
    s: number,
    cfg: BirdTypeConfig
): THREE.Group {
    const tailGroup = new THREE.Group();

    const tailMat = new THREE.MeshPhongMaterial({
        color: cfg.tailColor,
        shininess: 35
    });

    const tailGeom = new THREE.ConeGeometry(s * 0.1, s * 0.15, 4);
    tailGeom.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(tailGeom, tailMat);
    tailGroup.add(tail);

    tailGroup.position.set(0, -s * 0.4, -s * 0.22);
    tailGroup.rotation.x = 0.3;
    group.add(tailGroup);

    return tailGroup;
}

/**
 * Create penguin feet
 */
export function createPenguinFeet(
    group: THREE.Group,
    s: number,
    cfg: BirdTypeConfig
): { leftLegGroup: THREE.Group; rightLegGroup: THREE.Group } {
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();

    const footMat = new THREE.MeshPhongMaterial({
        color: cfg.legColor,
        shininess: 50
    });

    const createFoot = (): THREE.Group => {
        const footGroup = new THREE.Group();

        // Main foot pad
        const padGeom = new THREE.BoxGeometry(s * 0.18, s * 0.025, s * 0.22);
        const pad = new THREE.Mesh(padGeom, footMat);
        pad.position.y = s * 0.012;
        footGroup.add(pad);

        // Webbed toes
        for (let i = 0; i < 3; i++) {
            const toeAngle = (i - 1) * 0.35;
            const toeGeom = new THREE.BoxGeometry(s * 0.045, s * 0.018, s * 0.1);
            const toe = new THREE.Mesh(toeGeom, footMat);
            toe.position.set(
                Math.sin(toeAngle) * s * 0.07,
                s * 0.01,
                s * 0.14
            );
            toe.rotation.y = toeAngle;
            footGroup.add(toe);
        }

        // Stubby leg
        const legGeom = new THREE.CylinderGeometry(s * 0.035, s * 0.045, s * 0.12, 10);
        const leg = new THREE.Mesh(legGeom, footMat);
        leg.position.set(0, s * 0.08, -s * 0.03);
        footGroup.add(leg);

        return footGroup;
    };

    const leftFoot = createFoot();
    leftFoot.position.set(s * 0.12, -s * 0.52, s * 0.05);
    leftLegGroup.add(leftFoot);

    const rightFoot = createFoot();
    rightFoot.position.set(-s * 0.12, -s * 0.52, s * 0.05);
    rightLegGroup.add(rightFoot);

    group.add(leftLegGroup);
    group.add(rightLegGroup);

    return { leftLegGroup, rightLegGroup };
}

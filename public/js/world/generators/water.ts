// Water feature generators - water planes, ponds, rivers, waterfalls
import * as THREE from 'three';
import type { WorldContext, ParticleData, ParticleConfig } from '../types.ts';

export function createWaterPlane(ctx: WorldContext, x: number, z: number, width: number, depth: number): void {
    const waterGeom = new THREE.PlaneGeometry(width, depth, 24, 24);

    const waterMat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            waterColor: { value: new THREE.Color(0x006994) },
            foamColor: { value: new THREE.Color(0xFFFFFF) }
        },
        vertexShader: `
            uniform float time;
            varying vec2 vUv;
            varying float vWaveHeight;
            void main() {
                vUv = uv;
                vec3 pos = position;
                float wave1 = sin(pos.x * 0.08 + time * 1.5) * 0.6;
                float wave2 = sin(pos.y * 0.1 + time * 1.2) * 0.4;
                pos.z = wave1 + wave2;
                vWaveHeight = pos.z;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 waterColor;
            uniform vec3 foamColor;
            varying vec2 vUv;
            varying float vWaveHeight;
            void main() {
                float foam = smoothstep(0.4, 1.0, vWaveHeight);
                vec3 color = mix(waterColor, foamColor, foam * 0.35);
                float edge = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
                gl_FragColor = vec4(color, 0.85 * edge + 0.5);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.15, z);

    ctx.scene.add(water);
    ctx.objects.push(water);

    ctx.animatedObjects.push({
        object: water,
        type: 'water',
        material: waterMat
    });
}

export function createPond(ctx: WorldContext, x: number, z: number, radius: number = 8): void {
    const group = new THREE.Group();

    // Water surface
    const waterGeom = new THREE.CircleGeometry(radius, 24);
    const waterMat = new THREE.MeshPhongMaterial({
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.1;
    group.add(water);

    // Pond edge rocks
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
        const rockSize = 0.5 + Math.random() * 0.8;
        const rockGeom = new THREE.DodecahedronGeometry(rockSize, 0);
        const rockMat = new THREE.MeshPhongMaterial({
            color: 0x696969,
            flatShading: true
        });
        const rock = new THREE.Mesh(rockGeom, rockMat);
        rock.position.set(
            Math.cos(angle) * (radius - 0.5),
            rockSize * 0.3,
            Math.sin(angle) * (radius - 0.5)
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        group.add(rock);
    }

    // Lily pads
    for (let i = 0; i < 8; i++) {
        const lily = createWaterLily(ctx);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (radius - 2);
        lily.position.set(Math.cos(angle) * dist, 0.12, Math.sin(angle) * dist);
        group.add(lily);
    }

    // Reeds
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        createReeds(ctx, x + Math.cos(angle) * (radius - 0.5), z + Math.sin(angle) * (radius - 0.5));
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'cylinder',
        objectType: 'water',
        x, z,
        radius: radius + 1,
        height: 0.5
    });
}

export function createWaterLily(ctx: WorldContext): THREE.Group {
    const group = new THREE.Group();

    // Lily pad (leaf)
    const padGeom = new THREE.CircleGeometry(0.5, 12);
    const padMat = new THREE.MeshPhongMaterial({ color: 0x228B22, side: THREE.DoubleSide });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.rotation.x = -Math.PI / 2;
    group.add(pad);

    // Flower
    const flowerGroup = new THREE.Group();
    const petalMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });

    for (let i = 0; i < 8; i++) {
        const petalGeom = new THREE.SphereGeometry(0.15, 4, 4);
        petalGeom.scale(1, 0.3, 2);
        const petal = new THREE.Mesh(petalGeom, petalMat);
        const angle = (i / 8) * Math.PI * 2;
        petal.position.set(Math.cos(angle) * 0.15, 0.1, Math.sin(angle) * 0.15);
        petal.rotation.y = angle;
        flowerGroup.add(petal);
    }

    // Center
    const centerGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const centerMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
    const center = new THREE.Mesh(centerGeom, centerMat);
    center.position.y = 0.12;
    flowerGroup.add(center);

    flowerGroup.position.y = 0.05;
    group.add(flowerGroup);

    return group;
}

export function createReeds(ctx: WorldContext, x: number, z: number, count: number = 7): void {
    const group = new THREE.Group();
    const reedMat = new THREE.MeshPhongMaterial({ color: 0x556B2F });

    for (let i = 0; i < count; i++) {
        const height = 1.5 + Math.random() * 1;
        const reedGeom = new THREE.CylinderGeometry(0.02, 0.04, height, 4);
        const reed = new THREE.Mesh(reedGeom, reedMat);
        reed.position.set(
            (Math.random() - 0.5) * 0.8,
            height / 2,
            (Math.random() - 0.5) * 0.8
        );
        reed.rotation.set(
            (Math.random() - 0.5) * 0.2,
            0,
            (Math.random() - 0.5) * 0.2
        );
        group.add(reed);

        // Reed head
        const headGeom = new THREE.CylinderGeometry(0.05, 0.03, 0.2, 6);
        const headMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.set(reed.position.x, height, reed.position.z);
        group.add(head);
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);
}

export function createRiver(
    ctx: WorldContext,
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    width: number = 8
): void {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const riverGeom = new THREE.PlaneGeometry(length, width, 32, 8);
    const riverMat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            waterColor: { value: new THREE.Color(0x4682B4) }
        },
        vertexShader: `
            uniform float time;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec3 pos = position;
                pos.z = sin(pos.x * 0.1 + time * 2.0) * 0.3;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 waterColor;
            varying vec2 vUv;
            void main() {
                float edge = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                gl_FragColor = vec4(waterColor, 0.8 * edge + 0.3);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const river = new THREE.Mesh(riverGeom, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -angle;
    river.position.set((startX + endX) / 2, 0.1, (startZ + endZ) / 2);

    ctx.scene.add(river);
    ctx.objects.push(river);

    ctx.animatedObjects.push({
        object: river,
        type: 'river',
        material: riverMat
    });
}

export function createBridge(ctx: WorldContext, x: number, z: number, rotation: number = 0, length: number = 12): void {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true });

    // Main planks
    const plankCount = Math.floor(length / 0.5);
    for (let i = 0; i < plankCount; i++) {
        const plankGeom = new THREE.BoxGeometry(3, 0.15, 0.4);
        const plank = new THREE.Mesh(plankGeom, woodMat);
        plank.position.set(0, 1, -length / 2 + i * 0.5 + 0.25);
        plank.castShadow = true;
        group.add(plank);
    }

    // Side rails
    const railMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });
    [-1.6, 1.6].forEach(xPos => {
        // Posts
        for (let i = 0; i < 5; i++) {
            const postGeom = new THREE.BoxGeometry(0.15, 1.2, 0.15);
            const post = new THREE.Mesh(postGeom, railMat);
            post.position.set(xPos, 1.6, -length / 2 + i * (length / 4) + length / 8);
            post.castShadow = true;
            group.add(post);
        }

        // Top rail
        const railGeom = new THREE.BoxGeometry(0.1, 0.1, length);
        const rail = new THREE.Mesh(railGeom, railMat);
        rail.position.set(xPos, 2.1, 0);
        group.add(rail);
    });

    // Support beams
    const beamMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    [-1, 1].forEach(xDir => {
        const beamGeom = new THREE.BoxGeometry(0.2, 0.2, length * 1.1);
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.position.set(xDir * 1.2, 0.5, 0);
        group.add(beam);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.colliders.push({
        type: 'box',
        objectType: 'wood',
        x, z,
        width: 4,
        depth: length + 2,
        height: 2.5
    });
}

export function createWaterfall(ctx: WorldContext, x: number, z: number): void {
    const group = new THREE.Group();

    // Cliff/rock face
    const cliffGeom = new THREE.BoxGeometry(8, 12, 4);
    const cliffMat = new THREE.MeshPhongMaterial({ color: 0x696969, flatShading: true });
    const cliff = new THREE.Mesh(cliffGeom, cliffMat);
    cliff.position.set(0, 6, -2);
    cliff.castShadow = true;
    group.add(cliff);

    // Water stream
    const waterGeom = new THREE.PlaneGeometry(3, 12, 8, 24);
    const waterMat = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            waterColor: { value: new THREE.Color(0x87CEEB) }
        },
        vertexShader: `
            uniform float time;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec3 pos = position;
                pos.x += sin(pos.y * 2.0 + time * 5.0) * 0.15;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 waterColor;
            varying vec2 vUv;
            void main() {
                float foam = sin(vUv.y * 20.0) * 0.5 + 0.5;
                vec3 color = mix(waterColor, vec3(1.0), foam * 0.3);
                gl_FragColor = vec4(color, 0.85);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const waterfall = new THREE.Mesh(waterGeom, waterMat);
    waterfall.position.set(0, 6, 0.1);
    group.add(waterfall);

    // Pool at bottom
    const poolGeom = new THREE.CircleGeometry(5, 16);
    const poolMat = new THREE.MeshPhongMaterial({
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8
    });
    const pool = new THREE.Mesh(poolGeom, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.1;
    group.add(pool);

    // Mist particles
    const particles: ParticleData[] = [];
    const particleConfig: ParticleConfig = {
        size: 0.3,
        speed: 0.02,
        drift: 0.01,
        opacity: 0.4,
        minY: -1,
        maxY: 3
    };

    for (let i = 0; i < 20; i++) {
        const particleGeom = new THREE.SphereGeometry(0.2, 4, 4);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3
        });
        const particle = new THREE.Mesh(particleGeom, particleMat);
        particle.position.set(
            (Math.random() - 0.5) * 4,
            Math.random() * 3,
            (Math.random() - 0.5) * 2 + 1
        );
        group.add(particle);

        particles.push({
            mesh: particle,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                Math.random() * 0.03 + 0.01,
                Math.random() * 0.02
            ),
            phase: Math.random() * Math.PI * 2,
            rotationSpeed: new THREE.Vector3(0, 0, 0),
            config: particleConfig,
            bounds: { x: 4, y: 6, z: 3 }
        });
    }

    group.position.set(x, 0, z);
    ctx.scene.add(group);
    ctx.objects.push(group);

    ctx.animatedObjects.push({
        type: 'waterfall',
        object: group,
        material: waterMat,
        particles: particles
    });

    ctx.colliders.push({
        type: 'box',
        objectType: 'rock',
        x, z: z - 2,
        width: 10,
        depth: 6,
        height: 12
    });
}

// Terrain generators - ground, sky, grass
import * as THREE from 'three';
import type { WorldContext } from '../types.ts';

export function createGround(ctx: WorldContext, color: number = 0x3d5c3d, withGrass: boolean = true): void {
    // Main ground
    const groundGeom = new THREE.PlaneGeometry(400, 400, 50, 50);

    // Add slight height variation for terrain
    const vertices = groundGeom.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] += (Math.random() - 0.5) * 0.3;
    }
    groundGeom.computeVertexNormals();

    const groundMat = new THREE.MeshPhongMaterial({
        color: color,
        flatShading: true
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ctx.scene.add(ground);
    ctx.objects.push(ground);

    // Add grass patches
    if (withGrass) {
        addGrassPatches(ctx, color);
    }
}

export function addGrassPatches(ctx: WorldContext, _baseColor: number): void {
    const grassColors = [0x4a7c3d, 0x3d6b32, 0x5a8c4d, 0x2d5c22];

    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        const size = 2 + Math.random() * 4;

        const patchGeom = new THREE.CircleGeometry(size, 6);
        const patchMat = new THREE.MeshLambertMaterial({
            color: grassColors[Math.floor(Math.random() * grassColors.length)]
        });
        const patch = new THREE.Mesh(patchGeom, patchMat);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(x, 0.02, z);
        ctx.scene.add(patch);
        ctx.objects.push(patch);
    }
}

export function createSky(ctx: WorldContext, topColor: number = 0x87CEEB, bottomColor: number = 0xE0F6FF): void {
    const skyGeom = new THREE.SphereGeometry(300, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(topColor) },
            bottomColor: { value: new THREE.Color(bottomColor) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeom, skyMat);
    ctx.scene.add(sky);
    ctx.objects.push(sky);
}

// Particle system generators - ambient particles
import * as THREE from 'three';
import type { WorldContext, ParticleData, ParticleConfig } from '../types.ts';

export const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
    feathers: {
        colors: [0xFFFFFF, 0xFFF8DC, 0xF5F5DC, 0xE8E8E8],
        size: 0.15,
        speed: 0.3,
        drift: 0.02,
        opacity: 0.9,
        minY: -5,
        maxY: 40
    },
    fireflies: {
        colors: [0xFFFF00, 0x7FFF00, 0xADFF2F],
        size: 0.1,
        speed: 0.05,
        drift: 0.03,
        opacity: 1,
        minY: 0,
        maxY: 15,
        emissive: true
    },
    bubbles: {
        colors: [0xADD8E6, 0xB0E0E6, 0x87CEEB],
        size: 0.15,
        speed: 0.08,
        drift: 0.02,
        opacity: 0.5,
        minY: 0,
        maxY: 20
    },
    rain: {
        color: 0x6699CC,
        size: 0.05,
        speed: 0.8,
        drift: 0.01,
        opacity: 0.6,
        minY: -5,
        maxY: 50
    },
    snow: {
        color: 0xFFFFFF,
        size: 0.12,
        speed: 0.15,
        drift: 0.04,
        opacity: 0.9,
        minY: -5,
        maxY: 50
    },
    dust: {
        colors: [0xD2B48C, 0xDEB887, 0xC4A574],
        size: 0.08,
        speed: 0.02,
        drift: 0.01,
        opacity: 0.4,
        minY: 0,
        maxY: 10
    }
};

export function createAmbientParticles(
    ctx: WorldContext,
    type: string,
    count: number = 50,
    bounds: { x: number; y: number; z: number } = { x: 150, y: 40, z: 150 }
): ParticleData[] {
    // Edge case protection
    type = type || 'dust';
    count = Math.max(1, Math.min(500, count || 50));
    bounds = bounds || { x: 150, y: 40, z: 150 };
    bounds.x = Math.max(10, bounds.x || 150);
    bounds.y = Math.max(5, bounds.y || 40);
    bounds.z = Math.max(10, bounds.z || 150);

    const config = PARTICLE_CONFIGS[type] || PARTICLE_CONFIGS.dust;
    const particles: ParticleData[] = [];

    for (let i = 0; i < count; i++) {
        // Determine color
        let color: number;
        if (config.colors && config.colors.length > 0) {
            color = config.colors[Math.floor(Math.random() * config.colors.length)];
        } else {
            color = config.color || 0xFFFFFF;
        }

        // Create mesh
        let geometry: THREE.BufferGeometry;
        if (type === 'rain') {
            geometry = new THREE.CylinderGeometry(config.size * 0.3, config.size * 0.3, config.size * 4, 4);
        } else if (type === 'feathers') {
            geometry = new THREE.PlaneGeometry(config.size, config.size * 2);
        } else {
            geometry = new THREE.SphereGeometry(config.size, 4, 4);
        }

        let material: THREE.Material;
        if (config.emissive) {
            material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: config.opacity
            });
        } else {
            material = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: config.opacity,
                side: THREE.DoubleSide
            });
        }

        const mesh = new THREE.Mesh(geometry, material);

        // Random starting position
        mesh.position.set(
            (Math.random() - 0.5) * bounds.x * 2,
            config.minY + Math.random() * (config.maxY - config.minY),
            (Math.random() - 0.5) * bounds.z * 2
        );

        // Random rotation
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        ctx.scene.add(mesh);
        ctx.objects.push(mesh);

        // Calculate velocity based on type
        let velocity: THREE.Vector3;
        if (type === 'rain') {
            velocity = new THREE.Vector3(
                (Math.random() - 0.5) * config.drift,
                -config.speed,
                (Math.random() - 0.5) * config.drift
            );
        } else if (type === 'snow') {
            velocity = new THREE.Vector3(
                (Math.random() - 0.5) * config.drift,
                -config.speed * (0.5 + Math.random() * 0.5),
                (Math.random() - 0.5) * config.drift
            );
        } else if (type === 'fireflies') {
            velocity = new THREE.Vector3(
                (Math.random() - 0.5) * config.drift,
                (Math.random() - 0.5) * config.speed * 0.5,
                (Math.random() - 0.5) * config.drift
            );
        } else if (type === 'bubbles') {
            velocity = new THREE.Vector3(
                (Math.random() - 0.5) * config.drift,
                config.speed * (0.5 + Math.random() * 0.5),
                (Math.random() - 0.5) * config.drift
            );
        } else {
            // feathers, dust
            velocity = new THREE.Vector3(
                (Math.random() - 0.5) * config.drift,
                -config.speed * (0.3 + Math.random() * 0.7),
                (Math.random() - 0.5) * config.drift
            );
        }

        particles.push({
            mesh: mesh,
            velocity: velocity,
            phase: Math.random() * Math.PI * 2,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ),
            config: config,
            bounds: bounds
        });
    }

    ctx.animatedObjects.push({
        type: 'particles',
        particles: particles,
        particleType: type
    });

    return particles;
}

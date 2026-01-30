// World module type definitions
import * as THREE from 'three';

// Collider types for collision detection
export interface BoxCollider {
    type: 'box';
    objectType: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    height: number;
}

export interface CylinderCollider {
    type: 'cylinder';
    objectType: string;
    x: number;
    z: number;
    radius: number;
    height: number;
}

export type Collider = BoxCollider | CylinderCollider;

// Particle configuration for ambient particles
export interface ParticleConfig {
    color?: number;
    colors?: number[];
    size: number;
    speed: number;
    drift: number;
    opacity: number;
    minY: number;
    maxY: number;
    emissive?: boolean;
}

// Individual particle data
export interface ParticleData {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    phase: number;
    rotationSpeed: THREE.Vector3;
    config: ParticleConfig;
    bounds: { x: number; y: number; z: number };
}

// Animated object - supports various animation types
export interface AnimatedObject {
    type: string;
    object?: THREE.Object3D;
    phase?: number;
    speed?: number;
    startX?: number;

    // Tree/Bush animation
    swaySpeed?: number;
    swayAmount?: number;

    // Shader material animation (water, waterfall, river)
    material?: THREE.ShaderMaterial;

    // Particle systems
    particles?: ParticleData[];
    particleType?: string;

    // Bird animation - wing references
    leftWing?: THREE.Mesh;
    rightWing?: THREE.Mesh;

    // Pigeon/Deer animation - head reference
    head?: THREE.Mesh;
    originalHeadY?: number;
    peckSpeed?: number;

    // Flying bird animation
    flapSpeed?: number;
    circleRadius?: number;
    circleSpeed?: number;
    baseY?: number;
    centerX?: number;
    centerZ?: number;

    // Soaring bird animation
    soarSpeed?: number;
    verticalRange?: number;

    // Swimming bird animation
    swimSpeed?: number;
    swimRadius?: number;
    bobSpeed?: number;

    // Carousel animation
    spinSpeed?: number;

    // Campfire animation
    fire?: THREE.Mesh;
    innerFire?: THREE.Mesh;
    light?: THREE.PointLight;

    // Swing animation
    seats?: THREE.Object3D[];

    // Farm animal animation
    animalType?: string;

    // Allow additional properties for flexibility
    [key: string]: unknown;
}

// Shared materials cache
export interface SharedMaterials {
    [key: string]: THREE.Material | THREE.Material[];
}

// Shared geometries cache
export interface SharedGeometries {
    [key: string]: THREE.BufferGeometry;
}

// World context passed to generator functions
export interface WorldContext {
    scene: THREE.Scene;
    objects: THREE.Object3D[];
    colliders: Collider[];
    animatedObjects: AnimatedObject[];
    materials: SharedMaterials;
    geometries: SharedGeometries;
}

// Animation handler function type
export type AnimationHandler = (item: AnimatedObject, time: number) => void;

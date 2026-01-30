// Animation system for world objects
import * as THREE from 'three';
import type { AnimatedObject, AnimationHandler } from './types.ts';

export class AnimationManager {
    private handlers: Map<string, AnimationHandler>;

    constructor() {
        this.handlers = this.createHandlers();
    }

    private createHandlers(): Map<string, AnimationHandler> {
        return new Map<string, AnimationHandler>([
            ['cloud', (item, time) => this.updateCloud(item, time)],
            ['water', (item, time) => this.updateShaderMaterial(item, time)],
            ['waterfall', (item, time) => this.updateShaderMaterial(item, time)],
            ['river', (item, time) => this.updateShaderMaterial(item, time)],
            ['particles', (item, time) => this.updateParticles(item, time)],
            ['pigeon', (item, time) => this.updatePigeon(item, time)],
            ['flyingBird', (item, time) => this.updateFlyingBird(item, time)],
            ['soaringBird', (item, time) => this.updateSoaringBird(item, time)],
            ['swimmingBird', (item, time) => this.updateSwimmingBird(item, time)],
            ['deer', (item, time) => this.updateDeer(item, time)],
            ['windmill', (item, _time) => this.updateWindmill(item)],
            ['campfire', (item, time) => this.updateCampfire(item, time)],
            ['tree', (item, time) => this.updateTree(item, time)],
            ['bush', (item, time) => this.updateBush(item, time)],
            ['swing', (item, time) => this.updateSwing(item, time)],
            ['carousel', (item, time) => this.updateCarousel(item, time)],
            ['animal', (item, time) => this.updateAnimal(item, time)]
        ]);
    }

    update(animatedObjects: AnimatedObject[], time: number): void {
        const len = animatedObjects.length;
        for (let i = 0; i < len; i++) {
            const item = animatedObjects[i];
            const handler = this.handlers.get(item.type);
            if (handler) {
                handler(item, time);
            }
        }
    }

    private updateCloud(item: AnimatedObject, time: number): void {
        if (item.object && item.startX !== undefined && item.speed !== undefined) {
            item.object.position.x = item.startX + Math.sin(time * item.speed) * 20;
        }
    }

    private updateShaderMaterial(item: AnimatedObject, time: number): void {
        if (item.material && item.material.uniforms && item.material.uniforms.time) {
            item.material.uniforms.time.value = time;
        }
    }

    private updateParticles(item: AnimatedObject, time: number): void {
        if (!item.particles) return;

        item.particles.forEach(p => {
            const config = p.config;
            const bounds = p.bounds;

            // Move particle
            p.mesh.position.x += p.velocity.x + Math.sin(time * 2 + p.phase) * 0.02;
            p.mesh.position.y += p.velocity.y;
            p.mesh.position.z += p.velocity.z + Math.cos(time * 2 + p.phase) * 0.02;

            // Rotate
            p.mesh.rotation.x += p.rotationSpeed.x;
            p.mesh.rotation.y += p.rotationSpeed.y;
            p.mesh.rotation.z += p.rotationSpeed.z;

            // Respawn if out of bounds
            if (p.mesh.position.y < config.minY - 1) {
                p.mesh.position.y = config.maxY;
                p.mesh.position.x = (Math.random() - 0.5) * bounds.x * 2;
                p.mesh.position.z = (Math.random() - 0.5) * bounds.z * 2;
            }

            // Fireflies special glow effect
            if (item.particleType === 'fireflies') {
                const mat = p.mesh.material as THREE.MeshBasicMaterial;
                if (mat && 'opacity' in mat) {
                    const glow = 0.5 + Math.sin(time * 3 + p.phase) * 0.5;
                    mat.opacity = glow;
                }
            }
        });
    }

    private updatePigeon(item: AnimatedObject, time: number): void {
        if (!item.head || item.peckSpeed === undefined || item.phase === undefined) return;

        const peckAmount = Math.sin(time * item.peckSpeed + item.phase);
        if (peckAmount > 0.7) {
            item.head.position.y = 0.45 - (peckAmount - 0.7) * 0.3;
            item.head.rotation.x = (peckAmount - 0.7) * 0.5;
        } else {
            item.head.position.y = 0.5;
            item.head.rotation.x = 0;
        }
    }

    private updateFlyingBird(item: AnimatedObject, time: number): void {
        if (!item.object || item.circleSpeed === undefined || item.phase === undefined ||
            item.centerX === undefined || item.centerZ === undefined ||
            item.circleRadius === undefined || item.baseY === undefined) return;

        const angle = time * item.circleSpeed + item.phase;
        item.object.position.x = item.centerX + Math.cos(angle) * item.circleRadius;
        item.object.position.z = item.centerZ + Math.sin(angle) * item.circleRadius;
        item.object.position.y = item.baseY + Math.sin(time * 0.5) * 3;
        item.object.rotation.y = -angle + Math.PI / 2;

        // Wing flapping
        if (item.leftWing && item.rightWing && item.flapSpeed !== undefined) {
            const flapAngle = Math.sin(time * item.flapSpeed) * 0.4;
            item.leftWing.rotation.z = 0.3 + flapAngle;
            item.rightWing.rotation.z = -0.3 - flapAngle;
        }
    }

    private updateSoaringBird(item: AnimatedObject, time: number): void {
        if (!item.object || item.circleSpeed === undefined || item.phase === undefined ||
            item.centerX === undefined || item.centerZ === undefined ||
            item.circleRadius === undefined || item.baseY === undefined ||
            item.verticalRange === undefined) return;

        const angle = time * item.circleSpeed + item.phase;
        item.object.position.x = item.centerX + Math.cos(angle) * item.circleRadius;
        item.object.position.z = item.centerZ + Math.sin(angle) * item.circleRadius;
        item.object.position.y = item.baseY + Math.sin(time * 0.2) * item.verticalRange;
        item.object.rotation.y = -angle + Math.PI / 2;

        // Gentle wing movement (soaring)
        if (item.leftWing && item.rightWing && item.soarSpeed !== undefined) {
            const soarAngle = Math.sin(time * item.soarSpeed) * 0.1;
            item.leftWing.rotation.z = 0.2 + soarAngle;
            item.rightWing.rotation.z = -0.2 - soarAngle;
        }
    }

    private updateSwimmingBird(item: AnimatedObject, time: number): void {
        if (!item.object || item.swimSpeed === undefined || item.phase === undefined ||
            item.centerX === undefined || item.centerZ === undefined ||
            item.swimRadius === undefined || item.bobSpeed === undefined) return;

        const angle = time * item.swimSpeed + item.phase;
        item.object.position.x = item.centerX + Math.cos(angle) * item.swimRadius;
        item.object.position.z = item.centerZ + Math.sin(angle) * item.swimRadius;
        item.object.rotation.y = -angle + Math.PI / 2;
        item.object.position.y = 0.1 + Math.sin(time * item.bobSpeed) * 0.03;
    }

    private updateDeer(item: AnimatedObject, time: number): void {
        if (!item.head || item.phase === undefined) return;
        const headTilt = Math.sin(time * 0.5 + item.phase) * 0.1;
        item.head.rotation.z = headTilt;
    }

    private updateWindmill(item: AnimatedObject): void {
        if (item.object && item.speed !== undefined) {
            item.object.rotation.z += item.speed * 0.016;
        }
    }

    private updateCampfire(item: AnimatedObject, time: number): void {
        // Fire flickering
        if (item.fire && item.innerFire && item.light && item.phase !== undefined) {
            const flicker = 0.8 + Math.sin(time * 10 + item.phase) * 0.2;
            const flicker2 = 0.9 + Math.sin(time * 15 + item.phase * 2) * 0.1;

            item.fire.scale.setScalar(flicker);
            item.innerFire.scale.setScalar(flicker2);
            item.light.intensity = 1 + Math.sin(time * 8) * 0.5;
        }

        // Animate smoke
        if (item.object && item.object.children) {
            item.object.children.forEach(child => {
                if (child.name === 'smoke') {
                    const mesh = child as THREE.Mesh;
                    const mat = mesh.material as THREE.MeshBasicMaterial;
                    if (mat && 'opacity' in mat) {
                        child.position.y += 0.02;
                        child.position.x += (Math.random() - 0.5) * 0.01;
                        mat.opacity -= 0.002;

                        if (child.position.y > 4 || mat.opacity <= 0) {
                            child.position.y = 0.8;
                            child.position.x = (Math.random() - 0.5) * 0.3;
                            mat.opacity = 0.3;
                        }
                    }
                }
            });
        }
    }

    private updateTree(item: AnimatedObject, time: number): void {
        if (!item.object || item.swaySpeed === undefined ||
            item.phase === undefined || item.swayAmount === undefined) return;

        const sway = Math.sin(time * item.swaySpeed + item.phase) * item.swayAmount;
        item.object.rotation.z = sway;
        item.object.rotation.x = sway * 0.5;
    }

    private updateBush(item: AnimatedObject, time: number): void {
        if (!item.object || item.swaySpeed === undefined ||
            item.phase === undefined || item.swayAmount === undefined) return;

        const sway = Math.sin(time * item.swaySpeed + item.phase) * item.swayAmount;
        item.object.rotation.z = sway;
    }

    private updateSwing(item: AnimatedObject, time: number): void {
        if (item.seats && item.seats.length > 0 && item.phase !== undefined) {
            item.seats.forEach((seat, idx) => {
                if (seat) {
                    const swing = Math.sin(time * 1.5 + item.phase! + idx * Math.PI) * 0.3;
                    seat.rotation.x = swing;
                }
            });
        } else if (item.object && item.object.children && item.phase !== undefined) {
            let seatIdx = 0;
            item.object.children.forEach(child => {
                if (child.name === 'swingSeat') {
                    const swing = Math.sin(time * 1.5 + item.phase! + seatIdx * Math.PI) * 0.3;
                    child.rotation.x = swing;
                    seatIdx++;
                }
            });
        }
    }

    private updateCarousel(item: AnimatedObject, time: number): void {
        if (item.object && item.speed !== undefined) {
            item.object.rotation.y += item.speed * 0.016;
        }

        // Horse bobbing with unique phases
        if (item.object && item.object.children) {
            item.object.children.forEach(child => {
                if (child.name === 'carouselHorse') {
                    const horsePhase = child.rotation.y || 0;
                    const bob = Math.sin(time * 2 + horsePhase * 2) * 0.1;
                    child.position.y = 1.5 + bob;
                }
            });
        }
    }

    private updateAnimal(item: AnimatedObject, time: number): void {
        if (!item.object || item.phase === undefined) return;

        if (item.animalType === 'chicken') {
            const peck = Math.sin(time * 4 + item.phase);
            item.object.rotation.x = peck > 0.8 ? (peck - 0.8) * 0.5 : 0;
        } else if (item.animalType === 'cow' || item.animalType === 'sheep') {
            item.object.rotation.y += Math.sin(time * 0.2 + item.phase) * 0.001;
        }
    }
}

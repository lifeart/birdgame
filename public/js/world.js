// World generation - creates buildings, trees, and environment
class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.colliders = [];
        this.animatedObjects = [];
    }

    clear() {
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
        this.colliders = [];
        this.animatedObjects = [];
    }

    createGround(color = 0x3d5c3d, withGrass = true) {
        // Main ground
        const groundGeom = new THREE.PlaneGeometry(400, 400, 50, 50);

        // Add slight height variation for terrain
        const vertices = groundGeom.attributes.position.array;
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
        this.scene.add(ground);
        this.objects.push(ground);

        // Add grass patches
        if (withGrass) {
            this.addGrassPatches(color);
        }
    }

    addGrassPatches(baseColor) {
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
            this.scene.add(patch);
            this.objects.push(patch);
        }
    }

    createSky(topColor = 0x87CEEB, bottomColor = 0xE0F6FF) {
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
        this.scene.add(sky);
        this.objects.push(sky);
    }

    createBuilding(x, z, width, depth, height, color) {
        const group = new THREE.Group();

        // Main building with slight bevel
        const buildingGeom = new THREE.BoxGeometry(width, height, depth);
        const buildingMat = new THREE.MeshPhongMaterial({
            color: color,
            flatShading: true
        });
        const building = new THREE.Mesh(buildingGeom, buildingMat);
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);

        // Windows with frames
        const windowGlassMat = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        const windowFrameMat = new THREE.MeshPhongMaterial({ color: 0x404040 });

        const windowSize = 1.8;
        const windowSpacingX = width / Math.floor(width / 4);
        const windowSpacingY = height / Math.floor(height / 5);

        for (let wx = -width / 2 + windowSpacingX; wx < width / 2 - 1; wx += windowSpacingX) {
            for (let wy = 3; wy < height - 2; wy += windowSpacingY) {
                // Window frame
                const frameGeom = new THREE.BoxGeometry(windowSize + 0.3, windowSize * 1.5 + 0.3, 0.15);
                const frame1 = new THREE.Mesh(frameGeom, windowFrameMat);
                frame1.position.set(wx, wy, depth / 2 + 0.08);
                group.add(frame1);

                // Glass
                const glassGeom = new THREE.BoxGeometry(windowSize, windowSize * 1.5, 0.1);
                const glass1 = new THREE.Mesh(glassGeom, windowGlassMat);
                glass1.position.set(wx, wy, depth / 2 + 0.15);
                group.add(glass1);

                // Back side
                const frame2 = new THREE.Mesh(frameGeom, windowFrameMat);
                frame2.position.set(wx, wy, -depth / 2 - 0.08);
                group.add(frame2);

                const glass2 = new THREE.Mesh(glassGeom, windowGlassMat);
                glass2.position.set(wx, wy, -depth / 2 - 0.15);
                group.add(glass2);
            }
        }

        // Roof with details
        const roofGeom = new THREE.BoxGeometry(width + 1, 1.5, depth + 1);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.y = height + 0.75;
        roof.castShadow = true;
        group.add(roof);

        // Roof details (AC units, vents)
        for (let i = 0; i < 2; i++) {
            const acGeom = new THREE.BoxGeometry(2, 1, 2);
            const acMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
            const ac = new THREE.Mesh(acGeom, acMat);
            ac.position.set((i - 0.5) * width * 0.4, height + 2, 0);
            ac.castShadow = true;
            group.add(ac);
        }

        // Building base/foundation
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
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'box',
            objectType: 'building',
            x: x,
            z: z,
            width: width + 2,
            depth: depth + 2,
            height: height + 3
        });
    }

    createTree(x, z, scale = 1, type = 'pine') {
        const group = new THREE.Group();

        // Trunk with texture-like color variation
        const trunkGeom = new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 4 * scale, 8);
        const trunkMat = new THREE.MeshPhongMaterial({
            color: 0x5c4033,
            flatShading: true
        });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 2 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // Bark details
        for (let i = 0; i < 3; i++) {
            const barkGeom = new THREE.BoxGeometry(0.15 * scale, 0.8 * scale, 0.1 * scale);
            const barkMat = new THREE.MeshPhongMaterial({ color: 0x3d2817 });
            const bark = new THREE.Mesh(barkGeom, barkMat);
            bark.position.set(
                Math.cos(i * 2.1) * 0.45 * scale,
                (1 + i) * scale,
                Math.sin(i * 2.1) * 0.45 * scale
            );
            bark.rotation.y = i * 2.1;
            group.add(bark);
        }

        if (type === 'pine') {
            // Pine tree foliage (multiple cones)
            const foliageColors = [0x1a5c1a, 0x228B22, 0x2d7a2d];

            const layers = [
                { y: 5, radius: 3, height: 4 },
                { y: 8, radius: 2.5, height: 3.5 },
                { y: 10.5, radius: 2, height: 3 },
                { y: 12.5, radius: 1.2, height: 2 }
            ];

            layers.forEach((layer, i) => {
                const foliageGeom = new THREE.ConeGeometry(layer.radius * scale, layer.height * scale, 8);
                const foliageMat = new THREE.MeshPhongMaterial({
                    color: foliageColors[i % foliageColors.length],
                    flatShading: true
                });
                const foliage = new THREE.Mesh(foliageGeom, foliageMat);
                foliage.position.y = layer.y * scale;
                foliage.castShadow = true;
                group.add(foliage);
            });
        } else if (type === 'oak') {
            // Oak tree - round fluffy foliage
            const foliageMat = new THREE.MeshPhongMaterial({
                color: 0x2d6b2d,
                flatShading: true
            });

            // Main foliage cluster
            for (let i = 0; i < 8; i++) {
                const size = (2 + Math.random()) * scale;
                const foliageGeom = new THREE.DodecahedronGeometry(size, 0);
                const foliage = new THREE.Mesh(foliageGeom, foliageMat);
                foliage.position.set(
                    (Math.random() - 0.5) * 3 * scale,
                    (6 + Math.random() * 4) * scale,
                    (Math.random() - 0.5) * 3 * scale
                );
                foliage.rotation.set(Math.random(), Math.random(), Math.random());
                foliage.castShadow = true;
                group.add(foliage);
            }
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'cylinder',
            objectType: 'tree',
            x: x,
            z: z,
            radius: 1 * scale,
            height: 14 * scale
        });

        return group;
    }

    createBush(x, z, scale = 1) {
        const group = new THREE.Group();
        const bushColors = [0x2d5c2d, 0x3d6b3d, 0x4a7c4a];

        for (let i = 0; i < 5; i++) {
            const size = (0.5 + Math.random() * 0.5) * scale;
            const bushGeom = new THREE.DodecahedronGeometry(size, 0);
            const bushMat = new THREE.MeshPhongMaterial({
                color: bushColors[Math.floor(Math.random() * bushColors.length)],
                flatShading: true
            });
            const bush = new THREE.Mesh(bushGeom, bushMat);
            bush.position.set(
                (Math.random() - 0.5) * scale,
                size * 0.8,
                (Math.random() - 0.5) * scale
            );
            bush.castShadow = true;
            group.add(bush);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);
    }

    createFlowerPatch(x, z, radius = 3) {
        const group = new THREE.Group();
        const flowerColors = [0xff6b6b, 0xffd93d, 0xff85a2, 0xffffff, 0x9b59b6];

        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const fx = Math.cos(angle) * dist;
            const fz = Math.sin(angle) * dist;

            // Stem
            const stemGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4);
            const stemMat = new THREE.MeshPhongMaterial({ color: 0x228B22 });
            const stem = new THREE.Mesh(stemGeom, stemMat);
            stem.position.set(fx, 0.25, fz);
            group.add(stem);

            // Flower head
            const petalCount = 5;
            const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

            for (let p = 0; p < petalCount; p++) {
                const petalGeom = new THREE.SphereGeometry(0.15, 4, 4);
                petalGeom.scale(1, 0.3, 0.5);
                const petalMat = new THREE.MeshPhongMaterial({ color: flowerColor });
                const petal = new THREE.Mesh(petalGeom, petalMat);
                const petalAngle = (p / petalCount) * Math.PI * 2;
                petal.position.set(
                    fx + Math.cos(petalAngle) * 0.15,
                    0.55,
                    fz + Math.sin(petalAngle) * 0.15
                );
                petal.rotation.y = petalAngle;
                group.add(petal);
            }

            // Center
            const centerGeom = new THREE.SphereGeometry(0.1, 6, 6);
            const centerMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
            const center = new THREE.Mesh(centerGeom, centerMat);
            center.position.set(fx, 0.55, fz);
            group.add(center);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);
    }

    createHouse(x, z, width = 10, depth = 8, height = 6, roofColor = 0xB22222) {
        const group = new THREE.Group();

        // Foundation
        const foundationGeom = new THREE.BoxGeometry(width + 1, 0.5, depth + 1);
        const foundationMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const foundation = new THREE.Mesh(foundationGeom, foundationMat);
        foundation.position.y = 0.25;
        group.add(foundation);

        // Main structure with beveled edges
        const houseGeom = new THREE.BoxGeometry(width, height, depth);
        const houseMat = new THREE.MeshPhongMaterial({
            color: 0xF5DEB3,
            flatShading: true
        });
        const house = new THREE.Mesh(houseGeom, houseMat);
        house.position.y = height / 2 + 0.5;
        house.castShadow = true;
        house.receiveShadow = true;
        group.add(house);

        // Roof with overhangs
        const roofWidth = width + 2;
        const roofDepth = depth + 2;
        const roofGeom = new THREE.ConeGeometry(Math.max(roofWidth, roofDepth) * 0.7, height * 0.5, 4);
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
            // Window frame
            const frameGeom = new THREE.BoxGeometry(2.5, 2.5, 0.2);
            const frameMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const frame = new THREE.Mesh(frameGeom, frameMat);
            frame.position.set(pos.x, pos.y, depth / 2 + 0.1);
            group.add(frame);

            // Glass
            const glassGeom = new THREE.BoxGeometry(2, 2, 0.1);
            const glassMat = new THREE.MeshPhongMaterial({
                color: 0x87CEEB,
                shininess: 100,
                transparent: true,
                opacity: 0.7
            });
            const glass = new THREE.Mesh(glassGeom, glassMat);
            glass.position.set(pos.x, pos.y, depth / 2 + 0.2);
            group.add(glass);

            // Shutters
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
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'box',
            objectType: 'house',
            x: x,
            z: z,
            width: width + 2,
            depth: depth + 4,
            height: height + 5
        });
    }

    createBench(x, z, rotation = 0) {
        const group = new THREE.Group();

        const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, shininess: 60 });

        // Seat planks
        for (let i = 0; i < 4; i++) {
            const plankGeom = new THREE.BoxGeometry(4, 0.1, 0.3);
            const plank = new THREE.Mesh(plankGeom, woodMat);
            plank.position.set(0, 1, -0.3 + i * 0.25);
            plank.castShadow = true;
            group.add(plank);
        }

        // Back planks
        for (let i = 0; i < 3; i++) {
            const plankGeom = new THREE.BoxGeometry(4, 0.1, 0.25);
            const plank = new THREE.Mesh(plankGeom, woodMat);
            plank.position.set(0, 1.4 + i * 0.3, -0.45);
            plank.rotation.x = 0.15;
            plank.castShadow = true;
            group.add(plank);
        }

        // Metal legs
        const legShape = (xPos) => {
            const legGeom = new THREE.BoxGeometry(0.15, 1, 0.6);
            const leg = new THREE.Mesh(legGeom, metalMat);
            leg.position.set(xPos, 0.5, 0);
            group.add(leg);

            // Curved back support
            const backSupportGeom = new THREE.BoxGeometry(0.1, 1.2, 0.1);
            const backSupport = new THREE.Mesh(backSupportGeom, metalMat);
            backSupport.position.set(xPos, 1.5, -0.45);
            backSupport.rotation.x = 0.15;
            group.add(backSupport);
        };

        legShape(-1.7);
        legShape(1.7);

        // Armrests
        const armrestGeom = new THREE.BoxGeometry(0.15, 0.1, 0.8);
        const leftArm = new THREE.Mesh(armrestGeom, woodMat);
        leftArm.position.set(-1.7, 1.4, 0);
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armrestGeom, woodMat);
        rightArm.position.set(1.7, 1.4, 0);
        group.add(rightArm);

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        this.scene.add(group);
        this.objects.push(group);
    }

    createStreetLamp(x, z) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });

        // Pole
        const poleGeom = new THREE.CylinderGeometry(0.15, 0.2, 6, 8);
        const pole = new THREE.Mesh(poleGeom, metalMat);
        pole.position.y = 3;
        pole.castShadow = true;
        group.add(pole);

        // Decorative base
        const baseGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.5, 8);
        const base = new THREE.Mesh(baseGeom, metalMat);
        base.position.y = 0.25;
        group.add(base);

        // Lamp arm
        const armGeom = new THREE.BoxGeometry(1.5, 0.1, 0.1);
        const arm = new THREE.Mesh(armGeom, metalMat);
        arm.position.set(0.75, 5.8, 0);
        group.add(arm);

        // Lamp housing
        const housingGeom = new THREE.ConeGeometry(0.5, 0.6, 6);
        const housingMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
        const housing = new THREE.Mesh(housingGeom, housingMat);
        housing.position.set(1.5, 5.8, 0);
        housing.rotation.z = Math.PI;
        group.add(housing);

        // Light bulb (emissive)
        const bulbGeom = new THREE.SphereGeometry(0.25, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffacd });
        const bulb = new THREE.Mesh(bulbGeom, bulbMat);
        bulb.position.set(1.5, 5.5, 0);
        group.add(bulb);

        // Point light
        const light = new THREE.PointLight(0xfffacd, 0.5, 15);
        light.position.set(1.5, 5.5, 0);
        group.add(light);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'cylinder',
            objectType: 'metal',
            x: x,
            z: z,
            radius: 0.3,
            height: 6
        });
    }

    createFountain(x, z) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });

        // Octagonal base
        const baseGeom = new THREE.CylinderGeometry(6, 7, 1.5, 8);
        const base = new THREE.Mesh(baseGeom, stoneMat);
        base.position.y = 0.75;
        base.castShadow = true;
        group.add(base);

        // Inner rim
        const rimGeom = new THREE.TorusGeometry(5, 0.5, 8, 8);
        const rim = new THREE.Mesh(rimGeom, stoneMat);
        rim.position.y = 1.5;
        rim.rotation.x = Math.PI / 2;
        group.add(rim);

        // Water pool
        const waterGeom = new THREE.CylinderGeometry(4.5, 4.5, 0.8, 16);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x4169E1,
            transparent: true,
            opacity: 0.7,
            shininess: 100
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.position.y = 1.4;
        group.add(water);

        // Center pillar with decorations
        const pillarGeom = new THREE.CylinderGeometry(0.6, 0.8, 4, 8);
        const pillar = new THREE.Mesh(pillarGeom, stoneMat);
        pillar.position.y = 3.5;
        pillar.castShadow = true;
        group.add(pillar);

        // Decorative rings on pillar
        for (let i = 0; i < 3; i++) {
            const ringGeom = new THREE.TorusGeometry(0.7, 0.15, 6, 8);
            const ring = new THREE.Mesh(ringGeom, stoneMat);
            ring.position.y = 2 + i * 1.2;
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        }

        // Top bowl
        const bowlGeom = new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const bowl = new THREE.Mesh(bowlGeom, stoneMat);
        bowl.position.y = 5.5;
        bowl.rotation.x = Math.PI;
        group.add(bowl);

        // Water in top bowl
        const topWaterGeom = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 12);
        const topWater = new THREE.Mesh(topWaterGeom, waterMat);
        topWater.position.y = 5.2;
        group.add(topWater);

        // Statue on top (simple bird shape)
        const statueGeom = new THREE.ConeGeometry(0.4, 1.2, 4);
        const statueMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a, shininess: 50 });
        const statue = new THREE.Mesh(statueGeom, statueMat);
        statue.position.y = 6.5;
        group.add(statue);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'cylinder',
            objectType: 'stone',
            x: x,
            z: z,
            radius: 7,
            height: 7
        });
    }

    createCloud(x, y, z, size = 1) {
        const group = new THREE.Group();
        const cloudMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            flatShading: true
        });

        const cloudParts = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < cloudParts; i++) {
            const partSize = (2 + Math.random() * 2) * size;
            const cloudGeom = new THREE.DodecahedronGeometry(partSize, 0);
            const cloudPart = new THREE.Mesh(cloudGeom, cloudMat);
            cloudPart.position.set(
                (Math.random() - 0.5) * 8 * size,
                (Math.random() - 0.5) * 2 * size,
                (Math.random() - 0.5) * 4 * size
            );
            group.add(cloudPart);
        }

        group.position.set(x, y, z);
        this.scene.add(group);
        this.objects.push(group);

        // Add to animated objects for slow drift
        this.animatedObjects.push({
            object: group,
            type: 'cloud',
            speed: 0.01 + Math.random() * 0.02,
            startX: x
        });

        return group;
    }

    createRock(x, z, scale = 1) {
        const group = new THREE.Group();
        const rockColors = [0x696969, 0x808080, 0x5a5a5a];

        const mainRockGeom = new THREE.DodecahedronGeometry(scale, 0);
        const rockMat = new THREE.MeshPhongMaterial({
            color: rockColors[Math.floor(Math.random() * rockColors.length)],
            flatShading: true
        });
        const mainRock = new THREE.Mesh(mainRockGeom, rockMat);
        mainRock.position.y = scale * 0.5;
        mainRock.scale.set(1, 0.6, 1);
        mainRock.rotation.y = Math.random() * Math.PI;
        mainRock.castShadow = true;
        group.add(mainRock);

        // Smaller rocks around
        for (let i = 0; i < 2; i++) {
            const smallRockGeom = new THREE.DodecahedronGeometry(scale * 0.4, 0);
            const smallRock = new THREE.Mesh(smallRockGeom, rockMat);
            smallRock.position.set(
                (Math.random() - 0.5) * scale * 1.5,
                scale * 0.2,
                (Math.random() - 0.5) * scale * 1.5
            );
            smallRock.rotation.set(Math.random(), Math.random(), Math.random());
            smallRock.castShadow = true;
            group.add(smallRock);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);
    }

    update(time) {
        // Animate clouds
        this.animatedObjects.forEach(item => {
            if (item.type === 'cloud') {
                item.object.position.x = item.startX + Math.sin(time * item.speed) * 20;
            }
        });
    }

    checkCollision(position, radius) {
        for (const collider of this.colliders) {
            if (collider.type === 'box') {
                const halfWidth = collider.width / 2;
                const halfDepth = collider.depth / 2;

                if (position.x > collider.x - halfWidth - radius &&
                    position.x < collider.x + halfWidth + radius &&
                    position.z > collider.z - halfDepth - radius &&
                    position.z < collider.z + halfDepth + radius &&
                    position.y < collider.height) {
                    return collider.objectType || 'building';
                }
            } else if (collider.type === 'cylinder') {
                const dx = position.x - collider.x;
                const dz = position.z - collider.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < collider.radius + radius && position.y < collider.height) {
                    return collider.objectType || 'tree';
                }
            }
        }
        return null;
    }
}

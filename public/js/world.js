// World generation - creates buildings, trees, and environment
class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.colliders = [];
        this.animatedObjects = [];

        // Spatial hash grid for O(1) collision detection
        this.spatialGrid = new Map();
        this.gridCellSize = 20; // Each cell is 20x20 units

        // Initialize shared materials cache to prevent memory leaks
        this._initSharedMaterials();
        this._initSharedGeometries();
    }

    // Get grid cell key for a position
    _getGridKey(x, z) {
        const cellX = Math.floor(x / this.gridCellSize);
        const cellZ = Math.floor(z / this.gridCellSize);
        return `${cellX},${cellZ}`;
    }

    // Get all grid cells that an object occupies
    _getOccupiedCells(collider) {
        const cells = [];
        let minX, maxX, minZ, maxZ;

        if (collider.type === 'box') {
            const halfWidth = collider.width / 2;
            const halfDepth = collider.depth / 2;
            minX = collider.x - halfWidth;
            maxX = collider.x + halfWidth;
            minZ = collider.z - halfDepth;
            maxZ = collider.z + halfDepth;
        } else if (collider.type === 'cylinder') {
            minX = collider.x - collider.radius;
            maxX = collider.x + collider.radius;
            minZ = collider.z - collider.radius;
            maxZ = collider.z + collider.radius;
        } else {
            return cells;
        }

        // Find all cells the object overlaps
        const minCellX = Math.floor(minX / this.gridCellSize);
        const maxCellX = Math.floor(maxX / this.gridCellSize);
        const minCellZ = Math.floor(minZ / this.gridCellSize);
        const maxCellZ = Math.floor(maxZ / this.gridCellSize);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                cells.push(`${cx},${cz}`);
            }
        }
        return cells;
    }

    // Add a collider to the spatial grid
    _addToSpatialGrid(collider) {
        const cells = this._getOccupiedCells(collider);
        for (const cellKey of cells) {
            if (!this.spatialGrid.has(cellKey)) {
                this.spatialGrid.set(cellKey, []);
            }
            this.spatialGrid.get(cellKey).push(collider);
        }
    }

    // Rebuild spatial grid (call after adding colliders)
    _rebuildSpatialGrid() {
        this.spatialGrid.clear();
        for (const collider of this.colliders) {
            this._addToSpatialGrid(collider);
        }
    }

    // Call this after world generation is complete to build spatial index
    finalizeWorld() {
        this._rebuildSpatialGrid();
    }

    _initSharedMaterials() {
        // Shared materials - reused across multiple objects
        this.materials = {
            // Bird materials
            pigeonBody: new THREE.MeshPhongMaterial({ color: 0x708090, flatShading: true }),
            pigeonNeck: new THREE.MeshPhongMaterial({ color: 0x4B0082, shininess: 80 }),
            pigeonWing: new THREE.MeshPhongMaterial({ color: 0x5F6A6A, flatShading: true }),
            pigeonBeak: new THREE.MeshPhongMaterial({ color: 0xFFD700 }),
            pigeonFoot: new THREE.MeshPhongMaterial({ color: 0xCC5500 }),

            seagullBody: new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true }),
            seagullWing: new THREE.MeshPhongMaterial({ color: 0xE8E8E8, side: THREE.DoubleSide, flatShading: true }),
            seagullWingTip: new THREE.MeshPhongMaterial({ color: 0x2F4F4F, side: THREE.DoubleSide }),
            seagullBeak: new THREE.MeshPhongMaterial({ color: 0xFFA500 }),

            eagleBody: new THREE.MeshPhongMaterial({ color: 0x3D2314, flatShading: true }),
            eagleHead: new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true }),
            eagleWing: new THREE.MeshPhongMaterial({ color: 0x2F1810, side: THREE.DoubleSide, flatShading: true }),

            duckBody: new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true }),
            duckHead: new THREE.MeshPhongMaterial({ color: 0x006400, flatShading: true, shininess: 60 }),
            duckRing: new THREE.MeshPhongMaterial({ color: 0xFFFFFF }),
            duckTail: new THREE.MeshPhongMaterial({ color: 0x2F4F4F }),

            // Common materials
            blackEye: new THREE.MeshBasicMaterial({ color: 0x000000 }),
            brownEye: new THREE.MeshBasicMaterial({ color: 0x8B4513 }),

            // Tree materials
            trunk: new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true }),
            bark: new THREE.MeshPhongMaterial({ color: 0x3d2817 }),
            pineFoliage: [
                new THREE.MeshPhongMaterial({ color: 0x1a5c1a, flatShading: true }),
                new THREE.MeshPhongMaterial({ color: 0x228B22, flatShading: true }),
                new THREE.MeshPhongMaterial({ color: 0x2d7a2d, flatShading: true })
            ],
            oakFoliage: new THREE.MeshPhongMaterial({ color: 0x2d6b2d, flatShading: true }),

            // Metal and wood
            metal: new THREE.MeshPhongMaterial({ color: 0x888888 }),
            darkMetal: new THREE.MeshPhongMaterial({ color: 0x1a1a1a }),
            wood: new THREE.MeshPhongMaterial({ color: 0x8B4513 }),
            darkWood: new THREE.MeshPhongMaterial({ color: 0x5D3A1A }),

            // Stone
            stone: new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true }),
            darkStone: new THREE.MeshPhongMaterial({ color: 0x696969, flatShading: true }),

            // Playground colors
            playgroundRed: new THREE.MeshPhongMaterial({ color: 0xFF6B6B }),
            playgroundTeal: new THREE.MeshPhongMaterial({ color: 0x4ECDC4 }),
            playgroundYellow: new THREE.MeshPhongMaterial({ color: 0xFFE66D, shininess: 80 }),

            // Water
            water: new THREE.MeshPhongMaterial({ color: 0x4682B4, transparent: true, opacity: 0.75, shininess: 100 })
        };
    }

    _initSharedGeometries() {
        // Shared geometries - reused across multiple objects
        this.geometries = {
            // Small spheres for eyes, etc.
            tinyEye: new THREE.SphereGeometry(0.03, 6, 6),
            smallEye: new THREE.SphereGeometry(0.04, 6, 6),
            mediumEye: new THREE.SphereGeometry(0.06, 6, 6),

            // Common shapes
            smallSphere: new THREE.SphereGeometry(0.1, 6, 6),

            // Chain geometry for swings
            chain: new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4),

            // Swing seat
            swingSeat: new THREE.BoxGeometry(0.8, 0.08, 0.3)
        };
    }

    clear() {
        // Properly dispose all objects to prevent memory leaks
        // Note: shared materials from this.materials are NOT disposed - they are reused
        const sharedMaterials = new Set();
        if (this.materials) {
            Object.values(this.materials).forEach(mat => {
                if (Array.isArray(mat)) {
                    mat.forEach(m => sharedMaterials.add(m));
                } else if (mat) {
                    sharedMaterials.add(mat);
                }
            });
        }

        const sharedGeometries = this.geometries ? new Set(Object.values(this.geometries)) : new Set();

        this.objects.forEach(obj => {
            this.scene.remove(obj);
            // Traverse and dispose non-shared geometries and materials
            obj.traverse((child) => {
                if (child.geometry && !sharedGeometries.has(child.geometry)) {
                    child.geometry.dispose();
                }
                if (child.material && !sharedMaterials.has(child.material)) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (!sharedMaterials.has(m)) m.dispose();
                        });
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        this.objects = [];
        this.colliders = [];
        this.animatedObjects = [];
        this.spatialGrid.clear();
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
        // Edge case protection - ensure valid dimensions
        x = x || 0;
        z = z || 0;
        width = Math.max(1, width || 10);
        depth = Math.max(1, depth || 10);
        height = Math.max(1, height || 10);
        color = color || 0x808080;

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
        // Prevent division by zero for small buildings
        const windowCountX = Math.max(1, Math.floor(width / 4));
        const windowCountY = Math.max(1, Math.floor(height / 5));
        const windowSpacingX = width / windowCountX;
        const windowSpacingY = height / windowCountY;

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
        // Edge case protection
        x = x || 0;
        z = z || 0;
        scale = Math.max(0.1, scale || 1);
        type = type || 'pine';

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

        // Add swaying animation
        this.animatedObjects.push({
            type: 'tree',
            object: group,
            phase: Math.random() * Math.PI * 2,
            swaySpeed: 0.5 + Math.random() * 0.3,
            swayAmount: 0.02 + Math.random() * 0.01
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

        // Add gentle swaying animation for bushes
        this.animatedObjects.push({
            type: 'bush',
            object: group,
            phase: Math.random() * Math.PI * 2,
            swaySpeed: 0.8 + Math.random() * 0.4,
            swayAmount: 0.015 + Math.random() * 0.01
        });
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

    // ==================== BEACH LOCATION METHODS ====================

    createPalmTree(x, z, scale = 1) {
        const group = new THREE.Group();

        const trunkMat = new THREE.MeshPhongMaterial({
            color: 0x8B7355,
            flatShading: true
        });

        // Create curved trunk with segments
        let currentY = 0;
        let currentX = 0;
        const segments = 5;
        for (let i = 0; i < segments; i++) {
            const segHeight = (2.5 + i * 0.4) * scale;
            const radius = (0.4 - i * 0.05) * scale;
            const segGeom = new THREE.CylinderGeometry(radius * 0.8, radius, segHeight, 8);
            const seg = new THREE.Mesh(segGeom, trunkMat);

            currentX += (i * 0.25) * scale;
            seg.position.set(currentX, currentY + segHeight / 2, 0);
            seg.rotation.z = i * 0.08;
            seg.castShadow = true;
            group.add(seg);
            currentY += segHeight * 0.85;
        }

        // Palm fronds
        const frondMat = new THREE.MeshPhongMaterial({
            color: 0x228B22,
            flatShading: true,
            side: THREE.DoubleSide
        });

        const frondCount = 7;
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            const frond = this.createPalmFrond(scale, frondMat);
            frond.position.set(currentX, currentY, 0);
            frond.rotation.y = angle;
            frond.rotation.x = -0.4 - Math.random() * 0.3;
            group.add(frond);
        }

        // Coconuts
        if (Math.random() > 0.4) {
            const coconutMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
            for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                const coconut = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25 * scale, 8, 8),
                    coconutMat
                );
                coconut.position.set(
                    currentX + (Math.random() - 0.5) * 0.4,
                    currentY - 0.5,
                    (Math.random() - 0.5) * 0.4
                );
                group.add(coconut);
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
            radius: 0.6 * scale,
            height: currentY
        });
    }

    createPalmFrond(scale, material) {
        const group = new THREE.Group();

        // Main stem
        const stemGeom = new THREE.CylinderGeometry(0.04 * scale, 0.08 * scale, 3.5 * scale, 6);
        const stem = new THREE.Mesh(stemGeom, material);
        stem.rotation.x = Math.PI / 2;
        stem.position.z = 1.75 * scale;
        group.add(stem);

        // Leaf segments
        for (let i = 0; i < 10; i++) {
            const leafSize = (0.7 - i * 0.05) * scale;
            const leafGeom = new THREE.PlaneGeometry(leafSize, 0.15 * scale);

            const leftLeaf = new THREE.Mesh(leafGeom, material);
            const rightLeaf = new THREE.Mesh(leafGeom, material);

            const zPos = i * 0.32 * scale;
            leftLeaf.position.set(-leafSize / 2, 0, zPos);
            rightLeaf.position.set(leafSize / 2, 0, zPos);
            leftLeaf.rotation.z = 0.25;
            rightLeaf.rotation.z = -0.25;

            group.add(leftLeaf);
            group.add(rightLeaf);
        }

        return group;
    }

    createWaterPlane(x, z, width, depth) {
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

        this.scene.add(water);
        this.objects.push(water);

        this.animatedObjects.push({
            object: water,
            type: 'water',
            material: waterMat
        });
    }

    createBeachUmbrella(x, z, rotation = 0) {
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
        const canopyMat = new THREE.MeshPhongMaterial({
            color: umbrellaColor,
            side: THREE.DoubleSide
        });
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

        // Beach towel
        const towelGeom = new THREE.PlaneGeometry(1.8, 2.8);
        const towelColors = [0x4169E1, 0xFF6347, 0x32CD32, 0xFFD700];
        const towelMat = new THREE.MeshPhongMaterial({
            color: towelColors[Math.floor(Math.random() * towelColors.length)],
            side: THREE.DoubleSide
        });
        const towel = new THREE.Mesh(towelGeom, towelMat);
        towel.rotation.x = -Math.PI / 2;
        towel.position.set(0.4, 0.03, 0.4);
        group.add(towel);

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'cylinder',
            objectType: 'metal',
            x: x,
            z: z,
            radius: 0.15,
            height: 5
        });
    }

    createBeachChair(x, z, rotation = 0) {
        const group = new THREE.Group();

        const frameColor = 0xFFFFFF;
        const fabricColors = [0xFF6B6B, 0x48DBFB, 0xFFD93D, 0x00FF88];
        const fabricColor = fabricColors[Math.floor(Math.random() * fabricColors.length)];

        const legMat = new THREE.MeshPhongMaterial({ color: frameColor });
        const legGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);

        // Legs
        [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(lx, 0.6, lz);
            group.add(leg);
        });

        // Seat fabric
        const seatGeom = new THREE.PlaneGeometry(0.9, 1.3);
        const seatMat = new THREE.MeshPhongMaterial({ color: fabricColor, side: THREE.DoubleSide });
        const seat = new THREE.Mesh(seatGeom, seatMat);
        seat.rotation.x = -Math.PI / 2 + 0.25;
        seat.position.set(0, 1, -0.15);
        group.add(seat);

        // Back rest
        const backGeom = new THREE.PlaneGeometry(0.9, 0.7);
        const back = new THREE.Mesh(backGeom, seatMat);
        back.rotation.x = -0.5;
        back.position.set(0, 1.3, -0.55);
        group.add(back);

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'box',
            objectType: 'furniture',
            x: x,
            z: z,
            width: 1.2,
            depth: 1.2,
            height: 1.5
        });
    }

    createSeashell(x, z) {
        const shellColors = [0xFFF8DC, 0xFFE4C4, 0xFAEBD7, 0xF5DEB3, 0xFFDAB9];
        const shellColor = shellColors[Math.floor(Math.random() * shellColors.length)];

        const shellGeom = new THREE.SphereGeometry(0.12, 8, 4, 0, Math.PI);
        const shellMat = new THREE.MeshPhongMaterial({
            color: shellColor,
            flatShading: true
        });
        const shell = new THREE.Mesh(shellGeom, shellMat);
        shell.position.set(x, 0.06, z);
        shell.rotation.x = Math.PI / 2;
        shell.rotation.y = Math.random() * Math.PI * 2;
        shell.scale.set(1, 0.5, 1);

        this.scene.add(shell);
        this.objects.push(shell);
    }

    createSandPatches() {
        const sandColors = [0xF5DEB3, 0xEDC9AF, 0xDEB887, 0xD2B48C];

        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            const size = 2.5 + Math.random() * 5;

            const patchGeom = new THREE.CircleGeometry(size, 8);
            const patchMat = new THREE.MeshLambertMaterial({
                color: sandColors[Math.floor(Math.random() * sandColors.length)]
            });
            const patch = new THREE.Mesh(patchGeom, patchMat);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(x, 0.015, z);
            this.scene.add(patch);
            this.objects.push(patch);
        }
    }

    // ==================== MOUNTAIN LOCATION METHODS ====================

    createMountainPeak(x, z, scale = 1) {
        const group = new THREE.Group();

        const baseHeight = 50 * scale;
        const baseRadius = 35 * scale;

        // Main mountain
        const baseGeom = new THREE.ConeGeometry(baseRadius, baseHeight, 8);
        const baseMat = new THREE.MeshPhongMaterial({
            color: 0x696969,
            flatShading: true
        });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = baseHeight / 2;
        base.castShadow = true;
        group.add(base);

        // Snow cap
        const snowHeight = baseHeight * 0.28;
        const snowRadius = baseRadius * 0.45;
        const snowGeom = new THREE.ConeGeometry(snowRadius, snowHeight, 8);
        const snowMat = new THREE.MeshPhongMaterial({
            color: 0xFFFAFA,
            flatShading: true
        });
        const snow = new THREE.Mesh(snowGeom, snowMat);
        snow.position.y = baseHeight - snowHeight / 2 + 1;
        group.add(snow);

        // Rock details
        for (let i = 0; i < 8; i++) {
            const rockGeom = new THREE.DodecahedronGeometry(2.5 * scale + Math.random() * 2 * scale, 0);
            const rockMat = new THREE.MeshPhongMaterial({
                color: [0x5A5A5A, 0x4A4A4A, 0x6B6B6B][Math.floor(Math.random() * 3)],
                flatShading: true
            });
            const rock = new THREE.Mesh(rockGeom, rockMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * baseRadius * 0.7;
            const height = (1 - dist / baseRadius) * baseHeight * 0.6;
            rock.position.set(Math.cos(angle) * dist, height, Math.sin(angle) * dist);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(rock);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'cylinder',
            objectType: 'stone',
            x: x,
            z: z,
            radius: baseRadius * 0.85,
            height: baseHeight
        });
    }

    createCabin(x, z) {
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
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.7,
            shininess: 100
        });
        [[-2.5, cabinDepth / 2 + 0.12], [2.5, cabinDepth / 2 + 0.12],
         [-2.5, -cabinDepth / 2 - 0.12], [2.5, -cabinDepth / 2 - 0.12]].forEach(([wx, wz]) => {
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
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'box',
            objectType: 'house',
            x: x,
            z: z,
            width: cabinWidth + 2,
            depth: cabinDepth + 4,
            height: cabinHeight + 6
        });
    }

    createWaterfall(x, z) {
        const group = new THREE.Group();

        // Rock face
        const rockGeom = new THREE.BoxGeometry(7, 18, 3.5);
        const rockMat = new THREE.MeshPhongMaterial({ color: 0x5A5A5A, flatShading: true });
        const rock = new THREE.Mesh(rockGeom, rockMat);
        rock.position.y = 9;
        rock.castShadow = true;
        group.add(rock);

        // Water stream
        const waterGeom = new THREE.PlaneGeometry(2.5, 16, 4, 16);
        const waterMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waterColor: { value: new THREE.Color(0x4169E1) }
            },
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    pos.z = sin(pos.y * 2.5 + time * 6.0) * 0.15;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 waterColor;
                varying vec2 vUv;
                void main() {
                    float foam = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
                    vec3 color = mix(vec3(1.0), waterColor, foam);
                    gl_FragColor = vec4(color, 0.8);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.position.set(0, 9, 2);
        group.add(water);

        // Pool at bottom
        const poolGeom = new THREE.CylinderGeometry(4, 5, 0.8, 16);
        const poolMat = new THREE.MeshPhongMaterial({
            color: 0x4169E1,
            transparent: true,
            opacity: 0.75
        });
        const pool = new THREE.Mesh(poolGeom, poolMat);
        pool.position.y = 0.4;
        group.add(pool);

        // Mist particles
        for (let i = 0; i < 12; i++) {
            const mistGeom = new THREE.SphereGeometry(0.25 + Math.random() * 0.25, 6, 6);
            const mistMat = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.25 + Math.random() * 0.2
            });
            const mist = new THREE.Mesh(mistGeom, mistMat);
            mist.position.set(
                (Math.random() - 0.5) * 3.5,
                Math.random() * 4 + 0.8,
                1.8 + Math.random() * 2
            );
            group.add(mist);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.animatedObjects.push({
            object: water,
            type: 'waterfall',
            material: waterMat
        });

        this.colliders.push({
            type: 'box',
            objectType: 'stone',
            x: x,
            z: z,
            width: 7,
            depth: 5,
            height: 18
        });
    }

    createSnowPatch(x, z) {
        const size = 2.5 + Math.random() * 4;
        const patchGeom = new THREE.CircleGeometry(size, 8);
        const patchMat = new THREE.MeshLambertMaterial({
            color: 0xFFFAFA,
            transparent: true,
            opacity: 0.85
        });
        const patch = new THREE.Mesh(patchGeom, patchMat);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(x, 0.025, z);
        this.scene.add(patch);
        this.objects.push(patch);
    }

    createRockyTerrain() {
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;

            const rockGeom = new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.4, 0);
            const rockMat = new THREE.MeshPhongMaterial({
                color: [0x696969, 0x5A5A5A, 0x4A4A4A][Math.floor(Math.random() * 3)],
                flatShading: true
            });
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.set(x, 0.12, z);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(rock);
            this.objects.push(rock);
        }
    }

    // ==================== ANIMATION HANDLERS ====================

    _updateCloud(item, time) {
        item.object.position.x = item.startX + Math.sin(time * item.speed) * 20;
    }

    _updateShaderMaterial(item, time) {
        if (item.material && item.material.uniforms) {
            item.material.uniforms.time.value = time;
        }
    }

    _updateParticles(item, time) {
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
            if (item.particleType === 'fireflies' && p.mesh.material) {
                const glow = 0.5 + Math.sin(time * 3 + p.phase) * 0.5;
                p.mesh.material.opacity = glow;
            }
        });
    }

    _updatePigeon(item, time) {
        if (!item.head) return;

        const peckAmount = Math.sin(time * item.peckSpeed + item.phase);
        if (peckAmount > 0.7) {
            item.head.position.y = 0.45 - (peckAmount - 0.7) * 0.3;
            item.head.rotation.x = (peckAmount - 0.7) * 0.5;
        } else {
            item.head.position.y = 0.5;
            item.head.rotation.x = 0;
        }
    }

    _updateFlyingBird(item, time) {
        const angle = time * item.circleSpeed + item.phase;
        item.object.position.x = item.centerX + Math.cos(angle) * item.circleRadius;
        item.object.position.z = item.centerZ + Math.sin(angle) * item.circleRadius;
        item.object.position.y = item.baseY + Math.sin(time * 0.5) * 3;
        item.object.rotation.y = -angle + Math.PI / 2;

        // Wing flapping
        if (item.leftWing && item.rightWing) {
            const flapAngle = Math.sin(time * item.flapSpeed) * 0.4;
            item.leftWing.rotation.z = 0.3 + flapAngle;
            item.rightWing.rotation.z = -0.3 - flapAngle;
        }
    }

    _updateSoaringBird(item, time) {
        const angle = time * item.circleSpeed + item.phase;
        item.object.position.x = item.centerX + Math.cos(angle) * item.circleRadius;
        item.object.position.z = item.centerZ + Math.sin(angle) * item.circleRadius;
        item.object.position.y = item.baseY + Math.sin(time * 0.2) * item.verticalRange;
        item.object.rotation.y = -angle + Math.PI / 2;

        // Gentle wing movement (soaring)
        if (item.leftWing && item.rightWing) {
            const soarAngle = Math.sin(time * item.soarSpeed) * 0.1;
            item.leftWing.rotation.z = 0.2 + soarAngle;
            item.rightWing.rotation.z = -0.2 - soarAngle;
        }
    }

    _updateSwimmingBird(item, time) {
        const angle = time * item.swimSpeed + item.phase;
        item.object.position.x = item.centerX + Math.cos(angle) * item.swimRadius;
        item.object.position.z = item.centerZ + Math.sin(angle) * item.swimRadius;
        item.object.rotation.y = -angle + Math.PI / 2;
        item.object.position.y = 0.1 + Math.sin(time * item.bobSpeed) * 0.03;
    }

    _updateDeer(item, time) {
        if (!item.head) return;
        const headTilt = Math.sin(time * 0.5 + item.phase) * 0.1;
        item.head.rotation.z = headTilt;
    }

    _updateWindmill(item) {
        item.object.rotation.z += item.speed * 0.016;
    }

    _updateCampfire(item, time) {
        // Fire flickering
        if (item.fire && item.innerFire && item.light) {
            const flicker = 0.8 + Math.sin(time * 10 + item.phase) * 0.2;
            const flicker2 = 0.9 + Math.sin(time * 15 + item.phase * 2) * 0.1;

            item.fire.scale.setScalar(flicker);
            item.innerFire.scale.setScalar(flicker2);
            item.light.intensity = 1 + Math.sin(time * 8) * 0.5;
        }

        // Animate smoke
        if (item.object && item.object.children) {
            item.object.children.forEach(child => {
                if (child.name === 'smoke' && child.material) {
                    child.position.y += 0.02;
                    child.position.x += (Math.random() - 0.5) * 0.01;
                    child.material.opacity -= 0.002;

                    if (child.position.y > 4 || child.material.opacity <= 0) {
                        child.position.y = 0.8;
                        child.position.x = (Math.random() - 0.5) * 0.3;
                        child.material.opacity = 0.3;
                    }
                }
            });
        }
    }

    _updateTree(item, time) {
        const sway = Math.sin(time * item.swaySpeed + item.phase) * item.swayAmount;
        item.object.rotation.z = sway;
        item.object.rotation.x = sway * 0.5;
    }

    _updateBush(item, time) {
        const sway = Math.sin(time * item.swaySpeed + item.phase) * item.swayAmount;
        item.object.rotation.z = sway;
    }

    _updateSwing(item, time) {
        if (item.seats && item.seats.length > 0) {
            item.seats.forEach((seat, idx) => {
                if (seat) {
                    const swing = Math.sin(time * 1.5 + item.phase + idx * Math.PI) * 0.3;
                    seat.rotation.x = swing;
                }
            });
        } else if (item.object && item.object.children) {
            let seatIdx = 0;
            item.object.children.forEach(child => {
                if (child.name === 'swingSeat') {
                    const swing = Math.sin(time * 1.5 + item.phase + seatIdx * Math.PI) * 0.3;
                    child.rotation.x = swing;
                    seatIdx++;
                }
            });
        }
    }

    _updateCarousel(item, time) {
        if (item.object) {
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

    _updateAnimal(item, time) {
        if (item.animalType === 'chicken') {
            const peck = Math.sin(time * 4 + item.phase);
            item.object.rotation.x = peck > 0.8 ? (peck - 0.8) * 0.5 : 0;
        } else if (item.animalType === 'cow' || item.animalType === 'sheep') {
            item.object.rotation.y += Math.sin(time * 0.2 + item.phase) * 0.001;
        }
    }

    // ==================== MAIN UPDATE LOOP ====================

    // Initialize animation handlers map (called once in constructor)
    _initAnimationHandlers() {
        // Use a Map for O(1) lookup performance
        this._animationHandlers = new Map([
            ['cloud', (item, time) => this._updateCloud(item, time)],
            ['water', (item, time) => this._updateShaderMaterial(item, time)],
            ['waterfall', (item, time) => this._updateShaderMaterial(item, time)],
            ['river', (item, time) => this._updateShaderMaterial(item, time)],
            ['particles', (item, time) => this._updateParticles(item, time)],
            ['pigeon', (item, time) => this._updatePigeon(item, time)],
            ['flyingBird', (item, time) => this._updateFlyingBird(item, time)],
            ['soaringBird', (item, time) => this._updateSoaringBird(item, time)],
            ['swimmingBird', (item, time) => this._updateSwimmingBird(item, time)],
            ['deer', (item, time) => this._updateDeer(item, time)],
            ['windmill', (item, time) => this._updateWindmill(item)],
            ['campfire', (item, time) => this._updateCampfire(item, time)],
            ['tree', (item, time) => this._updateTree(item, time)],
            ['bush', (item, time) => this._updateBush(item, time)],
            ['swing', (item, time) => this._updateSwing(item, time)],
            ['carousel', (item, time) => this._updateCarousel(item, time)],
            ['animal', (item, time) => this._updateAnimal(item, time)]
        ]);
    }

    update(time) {
        // Lazy init handlers if not done yet
        if (!this._animationHandlers) {
            this._initAnimationHandlers();
        }

        // Process all animated objects using cached handlers
        const handlers = this._animationHandlers;
        const items = this.animatedObjects;
        const len = items.length;

        for (let i = 0; i < len; i++) {
            const item = items[i];
            const handler = handlers.get(item.type);
            if (handler) {
                handler(item, time);
            }
        }
    }

    checkCollision(position, radius) {
        // Edge case protection
        if (!position || typeof position.x !== 'number') return null;
        radius = Math.max(0, radius || 0);

        // Use spatial grid for O(1) average lookup
        // Check current cell and neighboring cells to handle objects near cell boundaries
        const cellsToCheck = new Set();
        const expandedRadius = radius + this.gridCellSize * 0.1; // Slight expansion for boundary cases

        // Get cells that could contain colliding objects
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const cellX = Math.floor((position.x + dx * expandedRadius) / this.gridCellSize);
                const cellZ = Math.floor((position.z + dz * expandedRadius) / this.gridCellSize);
                cellsToCheck.add(`${cellX},${cellZ}`);
            }
        }

        // Check only colliders in relevant cells
        const checkedColliders = new Set();
        for (const cellKey of cellsToCheck) {
            const cellColliders = this.spatialGrid.get(cellKey);
            if (!cellColliders) continue;

            for (const collider of cellColliders) {
                // Skip if already checked (object may span multiple cells)
                if (checkedColliders.has(collider)) continue;
                checkedColliders.add(collider);

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
        }
        return null;
    }

    // Find a safe spawn position that doesn't collide with buildings/obstacles
    findSafeSpawnPosition(startX = 0, startZ = 0, safeY = 15, radius = 2) {
        // Check collision at GROUND level (y=1) to avoid spawning above obstacles
        // that the bird would fall onto (like fountains, benches)
        const groundTestPosition = { x: startX, y: 1, z: startZ };

        // First check if the requested position is safe at ground level
        if (!this.checkCollision(groundTestPosition, radius)) {
            return { x: startX, y: safeY, z: startZ };
        }

        // Try positions in expanding circles around the start point
        // First ring at 10 units (clears fountains with radius 7)
        const offsets = [
            // Inner ring (10 units away - clears most small obstacles like fountains)
            { x: 10, z: 0 }, { x: -10, z: 0 }, { x: 0, z: 10 }, { x: 0, z: -10 },
            { x: 7, z: 7 }, { x: -7, z: 7 }, { x: 7, z: -7 }, { x: -7, z: -7 },
            // Second ring (18 units away)
            { x: 18, z: 0 }, { x: -18, z: 0 }, { x: 0, z: 18 }, { x: 0, z: -18 },
            { x: 13, z: 13 }, { x: -13, z: 13 }, { x: 13, z: -13 }, { x: -13, z: -13 },
            // Outer ring (30 units away)
            { x: 30, z: 0 }, { x: -30, z: 0 }, { x: 0, z: 30 }, { x: 0, z: -30 },
            { x: 21, z: 21 }, { x: -21, z: 21 }, { x: 21, z: -21 }, { x: -21, z: -21 }
        ];

        for (const offset of offsets) {
            groundTestPosition.x = startX + offset.x;
            groundTestPosition.z = startZ + offset.z;

            if (!this.checkCollision(groundTestPosition, radius)) {
                return { x: groundTestPosition.x, y: safeY, z: groundTestPosition.z };
            }
        }

        // If all else fails, try higher altitude (above any building)
        return { x: startX, y: 50, z: startZ };
    }

    // ==================== AMBIENT PARTICLES SYSTEM ====================

    createAmbientParticles(type, count = 50, bounds = { x: 150, y: 40, z: 150 }) {
        // Edge case protection
        type = type || 'dust';
        count = Math.max(1, Math.min(500, count || 50)); // Limit to 1-500 particles
        bounds = bounds || { x: 150, y: 40, z: 150 };
        bounds.x = Math.max(10, bounds.x || 150);
        bounds.y = Math.max(5, bounds.y || 40);
        bounds.z = Math.max(10, bounds.z || 150);

        const particleConfigs = {
            feathers: {
                color: 0xFFFFFF,
                colors: [0xFFFFFF, 0xFFF8DC, 0xF5F5DC, 0xE8E8E8],
                size: 0.15,
                speed: 0.3,
                drift: 0.5,
                opacity: 0.8,
                minY: 2,
                maxY: 25
            },
            dust: {
                color: 0xD4C4A8,
                colors: [0xD4C4A8, 0xC4B498, 0xE4D4B8],
                size: 0.08,
                speed: 0.1,
                drift: 0.3,
                opacity: 0.4,
                minY: 1,
                maxY: 15
            },
            fireflies: {
                color: 0xFFFF88,
                colors: [0xFFFF88, 0xAAFF88, 0xFFFFAA],
                size: 0.12,
                speed: 0.4,
                drift: 0.8,
                opacity: 1.0,
                emissive: true,
                minY: 1,
                maxY: 10
            },
            pollen: {
                color: 0xFFFFAA,
                colors: [0xFFFFAA, 0xFFFF88, 0xFFFFC0],
                size: 0.06,
                speed: 0.15,
                drift: 0.4,
                opacity: 0.6,
                minY: 1,
                maxY: 12
            },
            snowflakes: {
                color: 0xFFFFFF,
                colors: [0xFFFFFF, 0xF0F8FF, 0xFAFAFA],
                size: 0.1,
                speed: 0.5,
                drift: 0.2,
                opacity: 0.9,
                minY: 5,
                maxY: 50
            },
            spray: {
                color: 0xADD8E6,
                colors: [0xADD8E6, 0xB0E0E6, 0xFFFFFF],
                size: 0.1,
                speed: 0.8,
                drift: 0.6,
                opacity: 0.5,
                minY: 0,
                maxY: 8
            },
            leaves: {
                color: 0x8B4513,
                colors: [0x8B4513, 0xD2691E, 0xCD853F, 0x228B22],
                size: 0.2,
                speed: 0.4,
                drift: 0.7,
                opacity: 0.9,
                minY: 2,
                maxY: 20
            }
        };

        const config = particleConfigs[type] || particleConfigs.dust;
        const particles = [];

        for (let i = 0; i < count; i++) {
            const color = config.colors[Math.floor(Math.random() * config.colors.length)];
            const size = config.size * (0.7 + Math.random() * 0.6);

            let geometry, material, particle;

            if (type === 'feathers') {
                // Feather shape - elongated ellipsoid
                geometry = new THREE.SphereGeometry(size, 4, 4);
                geometry.scale(1, 0.3, 2);
            } else if (type === 'leaves') {
                // Leaf shape - flat diamond
                geometry = new THREE.PlaneGeometry(size * 2, size);
            } else {
                // Default sphere
                geometry = new THREE.SphereGeometry(size, 6, 6);
            }

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

            particle = new THREE.Mesh(geometry, material);

            // Random starting position
            particle.position.set(
                (Math.random() - 0.5) * bounds.x * 2,
                config.minY + Math.random() * (config.maxY - config.minY),
                (Math.random() - 0.5) * bounds.z * 2
            );

            particle.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            this.scene.add(particle);
            this.objects.push(particle);

            particles.push({
                mesh: particle,
                velocity: {
                    x: (Math.random() - 0.5) * config.drift,
                    y: -config.speed * (0.5 + Math.random() * 0.5),
                    z: (Math.random() - 0.5) * config.drift
                },
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                },
                phase: Math.random() * Math.PI * 2,
                config: config,
                bounds: bounds
            });
        }

        this.animatedObjects.push({
            type: 'particles',
            particles: particles,
            particleType: type
        });

        return particles;
    }

    // ==================== LOCATION-SPECIFIC CREATURES ====================

    createPigeon(x, z, onRoof = true, roofHeight = 0) {
        const group = new THREE.Group();

        // Body - using shared materials
        const bodyGeom = new THREE.SphereGeometry(0.3, 8, 6);
        bodyGeom.scale(1, 0.8, 1.3);
        const body = new THREE.Mesh(bodyGeom, this.materials.pigeonBody);
        body.position.y = 0.3;
        group.add(body);

        // Head
        const headGeom = new THREE.SphereGeometry(0.18, 8, 6);
        const head = new THREE.Mesh(headGeom, this.materials.pigeonBody);
        head.position.set(0, 0.5, 0.25);
        group.add(head);

        // Neck iridescence
        const neckGeom = new THREE.SphereGeometry(0.12, 6, 4);
        const neck = new THREE.Mesh(neckGeom, this.materials.pigeonNeck);
        neck.position.set(0, 0.42, 0.18);
        group.add(neck);

        // Beak
        const beakGeom = new THREE.ConeGeometry(0.05, 0.15, 4);
        const beak = new THREE.Mesh(beakGeom, this.materials.pigeonBeak);
        beak.position.set(0, 0.48, 0.4);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Wings - shared geometry and material
        const wingGeom = new THREE.SphereGeometry(0.2, 4, 4);
        wingGeom.scale(0.4, 0.2, 1);

        const leftWing = new THREE.Mesh(wingGeom, this.materials.pigeonWing);
        leftWing.position.set(-0.25, 0.35, 0);
        leftWing.rotation.z = 0.3;
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeom.clone(), this.materials.pigeonWing);
        rightWing.position.set(0.25, 0.35, 0);
        rightWing.rotation.z = -0.3;
        group.add(rightWing);

        // Tail
        const tailGeom = new THREE.ConeGeometry(0.12, 0.3, 4);
        const tail = new THREE.Mesh(tailGeom, this.materials.pigeonWing);
        tail.position.set(0, 0.25, -0.35);
        tail.rotation.x = -Math.PI / 4;
        group.add(tail);

        // Feet - shared geometry
        const footGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
        [-0.1, 0.1].forEach(offset => {
            const foot = new THREE.Mesh(footGeom, this.materials.pigeonFoot);
            foot.position.set(offset, 0.07, 0.05);
            group.add(foot);
        });

        // Fix: onRoof now properly affects Y position
        const y = onRoof ? roofHeight : 0;
        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        group.scale.setScalar(0.8 + Math.random() * 0.3);

        this.scene.add(group);
        this.objects.push(group);

        // Add pecking animation with direct head reference
        this.animatedObjects.push({
            type: 'pigeon',
            object: group,
            head: head,
            originalHeadY: 0.5,
            phase: Math.random() * Math.PI * 2,
            peckSpeed: 2 + Math.random() * 2
        });

        return group;
    }

    createSeagull(x, y, z, flying = true) {
        const group = new THREE.Group();

        // Body - use shared materials
        const bodyGeom = new THREE.SphereGeometry(0.4, 8, 6);
        bodyGeom.scale(1, 0.7, 1.5);
        const body = new THREE.Mesh(bodyGeom, this.materials.seagullBody);
        group.add(body);

        // Head
        const headGeom = new THREE.SphereGeometry(0.22, 8, 6);
        const head = new THREE.Mesh(headGeom, this.materials.seagullBody);
        head.position.set(0, 0.15, 0.45);
        group.add(head);

        // Beak - use shared material
        const beakGeom = new THREE.ConeGeometry(0.06, 0.25, 4);
        const beak = new THREE.Mesh(beakGeom, this.materials.seagullBeak);
        beak.position.set(0, 0.1, 0.68);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Eyes - use shared material
        [-0.1, 0.1].forEach(offset => {
            const eye = new THREE.Mesh(this.geometries.smallEye, this.materials.blackEye);
            eye.position.set(offset, 0.22, 0.55);
            group.add(eye);
        });

        // Wings - use shared material
        const wingGeom = new THREE.PlaneGeometry(1.2, 0.4);

        const leftWing = new THREE.Mesh(wingGeom, this.materials.seagullWing);
        leftWing.position.set(-0.6, 0.1, 0);
        leftWing.rotation.z = flying ? 0.3 : Math.PI / 6;
        leftWing.name = 'leftWing';
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeom, this.materials.seagullWing);
        rightWing.position.set(0.6, 0.1, 0);
        rightWing.rotation.z = flying ? -0.3 : -Math.PI / 6;
        rightWing.name = 'rightWing';
        group.add(rightWing);

        // Wing tips (dark) - use shared material
        const tipGeom = new THREE.PlaneGeometry(0.3, 0.35);

        const leftTip = new THREE.Mesh(tipGeom, this.materials.seagullWingTip);
        leftTip.position.set(-1.1, 0.1, 0);
        leftTip.rotation.z = leftWing.rotation.z;
        group.add(leftTip);

        const rightTip = new THREE.Mesh(tipGeom, this.materials.seagullWingTip);
        rightTip.position.set(1.1, 0.1, 0);
        rightTip.rotation.z = rightWing.rotation.z;
        group.add(rightTip);

        // Tail - use shared material
        const tailGeom = new THREE.ConeGeometry(0.15, 0.35, 4);
        const tail = new THREE.Mesh(tailGeom, this.materials.seagullBody);
        tail.position.set(0, 0, -0.5);
        tail.rotation.x = -Math.PI / 3;
        group.add(tail);

        // Feet (only if not flying) - use shared material
        if (!flying) {
            [-0.12, 0.12].forEach(offset => {
                const legGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 4);
                const leg = new THREE.Mesh(legGeom, this.materials.seagullBeak);
                leg.position.set(offset, -0.35, 0.1);
                group.add(leg);
            });
        }

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        this.scene.add(group);
        this.objects.push(group);

        if (flying) {
            this.animatedObjects.push({
                type: 'flyingBird',
                object: group,
                leftWing: leftWing,
                rightWing: rightWing,
                phase: Math.random() * Math.PI * 2,
                flapSpeed: 3 + Math.random() * 2,
                circleRadius: 30 + Math.random() * 40,
                circleSpeed: 0.2 + Math.random() * 0.2,
                baseY: y,
                centerX: x,
                centerZ: z
            });
        }

        return group;
    }

    createEagle(x, y, z) {
        const group = new THREE.Group();

        // Body - larger and more majestic - use shared material
        const bodyGeom = new THREE.SphereGeometry(0.6, 8, 6);
        bodyGeom.scale(1, 0.6, 1.8);
        const body = new THREE.Mesh(bodyGeom, this.materials.eagleBody);
        group.add(body);

        // Head - white (bald eagle style) - use shared material
        const headGeom = new THREE.SphereGeometry(0.3, 8, 6);
        const head = new THREE.Mesh(headGeom, this.materials.eagleHead);
        head.position.set(0, 0.2, 0.7);
        group.add(head);

        // Beak - hooked - use shared material (same yellow as pigeon)
        const beakGeom = new THREE.ConeGeometry(0.1, 0.35, 4);
        const beak = new THREE.Mesh(beakGeom, this.materials.pigeonBeak);
        beak.position.set(0, 0.1, 1);
        beak.rotation.x = Math.PI / 2.5;
        group.add(beak);

        // Eyes - fierce - use shared material
        [-0.12, 0.12].forEach(offset => {
            const eye = new THREE.Mesh(this.geometries.mediumEye, this.materials.brownEye);
            eye.position.set(offset, 0.28, 0.85);
            group.add(eye);
        });

        // Wings - large wingspan - use shared material
        const wingGeom = new THREE.PlaneGeometry(2.5, 0.7);

        const leftWing = new THREE.Mesh(wingGeom, this.materials.eagleWing);
        leftWing.position.set(-1.3, 0.1, 0);
        leftWing.rotation.z = 0.2;
        leftWing.name = 'leftWing';
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeom, this.materials.eagleWing);
        rightWing.position.set(1.3, 0.1, 0);
        rightWing.rotation.z = -0.2;
        rightWing.name = 'rightWing';
        group.add(rightWing);

        // Tail feathers - use shared material
        const tailGeom = new THREE.PlaneGeometry(0.5, 0.8);
        const tail = new THREE.Mesh(tailGeom, this.materials.eagleWing);
        tail.position.set(0, 0, -0.9);
        tail.rotation.x = -Math.PI / 6;
        group.add(tail);

        group.position.set(x, y, z);
        group.scale.setScalar(1.5);

        this.scene.add(group);
        this.objects.push(group);

        this.animatedObjects.push({
            type: 'soaringBird',
            object: group,
            leftWing: leftWing,
            rightWing: rightWing,
            phase: Math.random() * Math.PI * 2,
            soarSpeed: 0.5,
            circleRadius: 50 + Math.random() * 30,
            circleSpeed: 0.1 + Math.random() * 0.1,
            baseY: y,
            centerX: x,
            centerZ: z,
            verticalRange: 10
        });

        return group;
    }

    createDuck(x, z) {
        const group = new THREE.Group();

        // Body - use shared material
        const bodyGeom = new THREE.SphereGeometry(0.35, 8, 6);
        bodyGeom.scale(1, 0.7, 1.3);
        const body = new THREE.Mesh(bodyGeom, this.materials.duckBody);
        body.position.y = 0.2;
        group.add(body);

        // Head - green (mallard) - use shared material
        const headGeom = new THREE.SphereGeometry(0.2, 8, 6);
        const head = new THREE.Mesh(headGeom, this.materials.duckHead);
        head.position.set(0, 0.45, 0.3);
        group.add(head);

        // White neck ring - use shared material
        const ringGeom = new THREE.TorusGeometry(0.15, 0.03, 6, 12);
        const ring = new THREE.Mesh(ringGeom, this.materials.duckRing);
        ring.position.set(0, 0.35, 0.25);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Beak - orange - use shared material (same as seagull beak)
        const beakGeom = new THREE.BoxGeometry(0.1, 0.06, 0.2);
        const beak = new THREE.Mesh(beakGeom, this.materials.seagullBeak);
        beak.position.set(0, 0.42, 0.48);
        group.add(beak);

        // Eyes - use shared material and geometry
        [-0.08, 0.08].forEach(offset => {
            const eye = new THREE.Mesh(this.geometries.tinyEye, this.materials.blackEye);
            eye.position.set(offset, 0.5, 0.4);
            group.add(eye);
        });

        // Tail - use shared material
        const tailGeom = new THREE.ConeGeometry(0.1, 0.2, 4);
        const tail = new THREE.Mesh(tailGeom, this.materials.duckTail);
        tail.position.set(0, 0.25, -0.35);
        tail.rotation.x = -Math.PI / 3;
        group.add(tail);

        group.position.set(x, 0.1, z);
        group.rotation.y = Math.random() * Math.PI * 2;

        this.scene.add(group);
        this.objects.push(group);

        // Swimming animation
        this.animatedObjects.push({
            type: 'swimmingBird',
            object: group,
            phase: Math.random() * Math.PI * 2,
            swimSpeed: 0.3 + Math.random() * 0.2,
            swimRadius: 3 + Math.random() * 4,
            centerX: x,
            centerZ: z,
            bobSpeed: 2 + Math.random()
        });

        return group;
    }

    createDeer(x, z) {
        const group = new THREE.Group();
        const bodyColor = 0xCD853F;
        const bodyMat = new THREE.MeshPhongMaterial({ color: bodyColor, flatShading: true });

        // Body
        const bodyGeom = new THREE.CylinderGeometry(0.5, 0.45, 1.8, 8);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.position.y = 1.3;
        group.add(body);

        // Neck
        const neckGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 6);
        const neck = new THREE.Mesh(neckGeom, bodyMat);
        neck.position.set(0, 1.7, 0.7);
        neck.rotation.x = -Math.PI / 4;
        group.add(neck);

        // Head
        const headGeom = new THREE.SphereGeometry(0.25, 8, 6);
        headGeom.scale(1, 0.9, 1.3);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0, 2.1, 1);
        group.add(head);

        // Snout
        const snoutGeom = new THREE.SphereGeometry(0.12, 6, 6);
        snoutGeom.scale(1, 0.8, 1.5);
        const snout = new THREE.Mesh(snoutGeom, bodyMat);
        snout.position.set(0, 2, 1.25);
        group.add(snout);

        // Nose
        const noseGeom = new THREE.SphereGeometry(0.05, 6, 6);
        const noseMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.position.set(0, 2, 1.38);
        group.add(nose);

        // Ears
        const earGeom = new THREE.ConeGeometry(0.1, 0.25, 4);
        const earMat = new THREE.MeshPhongMaterial({ color: 0xDEB887 });
        [-0.2, 0.2].forEach(offset => {
            const ear = new THREE.Mesh(earGeom, earMat);
            ear.position.set(offset, 2.35, 0.9);
            ear.rotation.x = -0.3;
            ear.rotation.z = offset > 0 ? -0.3 : 0.3;
            group.add(ear);
        });

        // Antlers (simple)
        const antlerMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
        [-0.15, 0.15].forEach(offset => {
            const mainAntler = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 4);
            const antler = new THREE.Mesh(mainAntler, antlerMat);
            antler.position.set(offset, 2.45, 0.85);
            antler.rotation.x = -0.2;
            antler.rotation.z = offset > 0 ? -0.4 : 0.4;
            group.add(antler);

            // Branch
            const branchGeom = new THREE.CylinderGeometry(0.02, 0.025, 0.25, 4);
            const branch = new THREE.Mesh(branchGeom, antlerMat);
            branch.position.set(offset * 1.3, 2.6, 0.8);
            branch.rotation.z = offset > 0 ? -0.8 : 0.8;
            group.add(branch);
        });

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
        [-0.1, 0.1].forEach(offset => {
            const eyeGeom = new THREE.SphereGeometry(0.04, 6, 6);
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(offset, 2.12, 1.15);
            group.add(eye);
        });

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.9, 6);
        const legMat = new THREE.MeshPhongMaterial({ color: 0xA0522D });
        const hoofMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });

        [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(lx, 0.45, lz);
            group.add(leg);

            // Hoof
            const hoofGeom = new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6);
            const hoof = new THREE.Mesh(hoofGeom, hoofMat);
            hoof.position.set(lx, 0.05, lz);
            group.add(hoof);
        });

        // Tail
        const tailGeom = new THREE.SphereGeometry(0.12, 6, 6);
        tailGeom.scale(0.8, 1.2, 0.5);
        const tailMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const tail = new THREE.Mesh(tailGeom, tailMat);
        tail.position.set(0, 1.4, -0.85);
        group.add(tail);

        group.position.set(x, 0, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        group.scale.setScalar(0.9 + Math.random() * 0.2);

        this.scene.add(group);
        this.objects.push(group);

        // Idle animation
        this.animatedObjects.push({
            type: 'deer',
            object: group,
            head: head,
            phase: Math.random() * Math.PI * 2
        });

        return group;
    }

    // ==================== LOCATION STRUCTURES ====================

    createWindmill(x, z, scale = 1) {
        const group = new THREE.Group();

        // Base/tower - stone
        const towerGeom = new THREE.CylinderGeometry(2.5 * scale, 3.5 * scale, 12 * scale, 8);
        const towerMat = new THREE.MeshPhongMaterial({ color: 0xD4C4A8, flatShading: true });
        const tower = new THREE.Mesh(towerGeom, towerMat);
        tower.position.y = 6 * scale;
        tower.castShadow = true;
        group.add(tower);

        // Roof
        const roofGeom = new THREE.ConeGeometry(3 * scale, 3 * scale, 8);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.y = 13.5 * scale;
        roof.castShadow = true;
        group.add(roof);

        // Door
        const doorGeom = new THREE.BoxGeometry(1.5 * scale, 3 * scale, 0.3 * scale);
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });
        const door = new THREE.Mesh(doorGeom, doorMat);
        door.position.set(0, 1.5 * scale, 3.3 * scale);
        group.add(door);

        // Windows
        const windowMat = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.7
        });
        [5, 9].forEach(h => {
            const winGeom = new THREE.CircleGeometry(0.5 * scale, 8);
            const win = new THREE.Mesh(winGeom, windowMat);
            win.position.set(0, h * scale, 2.8 * scale);
            group.add(win);
        });

        // Blade hub
        const hubGeom = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, 0.5 * scale, 8);
        const hubMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });
        const hub = new THREE.Mesh(hubGeom, hubMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(0, 10 * scale, 3 * scale);
        group.add(hub);

        // Blades group (for rotation)
        const bladesGroup = new THREE.Group();
        bladesGroup.position.set(0, 10 * scale, 3.3 * scale);

        const bladeMat = new THREE.MeshPhongMaterial({ color: 0xF5DEB3, side: THREE.DoubleSide });
        const bladeFrameMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

        for (let i = 0; i < 4; i++) {
            const bladeGroup = new THREE.Group();

            // Main blade frame
            const frameGeom = new THREE.BoxGeometry(0.3 * scale, 8 * scale, 0.1 * scale);
            const frame = new THREE.Mesh(frameGeom, bladeFrameMat);
            frame.position.y = 4 * scale;
            bladeGroup.add(frame);

            // Sail cloth
            const sailGeom = new THREE.PlaneGeometry(2 * scale, 7 * scale);
            const sail = new THREE.Mesh(sailGeom, bladeMat);
            sail.position.set(0.8 * scale, 4 * scale, 0);
            bladeGroup.add(sail);

            bladeGroup.rotation.z = (i * Math.PI) / 2;
            bladesGroup.add(bladeGroup);
        }

        group.add(bladesGroup);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        // Rotation animation
        this.animatedObjects.push({
            type: 'windmill',
            object: bladesGroup,
            speed: 0.3 + Math.random() * 0.2
        });

        this.colliders.push({
            type: 'cylinder',
            objectType: 'stone',
            x: x,
            z: z,
            radius: 4 * scale,
            height: 15 * scale
        });

        return group;
    }

    createPond(x, z, radius = 8) {
        const group = new THREE.Group();

        // Water
        const waterGeom = new THREE.CircleGeometry(radius, 24);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x4682B4,
            transparent: true,
            opacity: 0.75,
            shininess: 100
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.05;
        group.add(water);

        // Shore/edge
        const shoreGeom = new THREE.RingGeometry(radius, radius + 1, 24);
        const shoreMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
        const shore = new THREE.Mesh(shoreGeom, shoreMat);
        shore.rotation.x = -Math.PI / 2;
        shore.position.y = 0.02;
        group.add(shore);

        // Rocks around edge
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
            const dist = radius + 0.3 + Math.random() * 0.5;
            const rockGeom = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3, 0);
            const rockMat = new THREE.MeshPhongMaterial({
                color: [0x696969, 0x808080, 0x5A5A5A][Math.floor(Math.random() * 3)],
                flatShading: true
            });
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.set(
                Math.cos(angle) * dist,
                0.15,
                Math.sin(angle) * dist
            );
            rock.scale.y = 0.6;
            group.add(rock);
        }

        // Water lilies
        for (let i = 0; i < 6; i++) {
            const lily = this.createWaterLily();
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (radius - 2) + 1;
            lily.position.set(
                Math.cos(angle) * dist,
                0.08,
                Math.sin(angle) * dist
            );
            group.add(lily);
        }

        // Reeds on edges
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = radius - 0.5 + Math.random();
            this.createReeds(
                x + Math.cos(angle) * dist,
                z + Math.sin(angle) * dist,
                3 + Math.floor(Math.random() * 3)
            );
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        return group;
    }

    createWaterLily() {
        const group = new THREE.Group();

        // Leaf (lily pad)
        const padGeom = new THREE.CircleGeometry(0.4, 12);
        const padMat = new THREE.MeshPhongMaterial({ color: 0x228B22, side: THREE.DoubleSide });
        const pad = new THREE.Mesh(padGeom, padMat);
        pad.rotation.x = -Math.PI / 2;
        group.add(pad);

        // Flower
        const flowerColors = [0xFFB6C1, 0xFFFFFF, 0xFFF0F5];
        const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

        for (let i = 0; i < 8; i++) {
            const petalGeom = new THREE.SphereGeometry(0.12, 4, 4);
            petalGeom.scale(1, 0.3, 0.5);
            const petalMat = new THREE.MeshPhongMaterial({ color: flowerColor });
            const petal = new THREE.Mesh(petalGeom, petalMat);
            const angle = (i / 8) * Math.PI * 2;
            petal.position.set(
                Math.cos(angle) * 0.15,
                0.1,
                Math.sin(angle) * 0.15
            );
            petal.rotation.y = angle;
            petal.rotation.x = -0.5;
            group.add(petal);
        }

        // Center
        const centerGeom = new THREE.SphereGeometry(0.08, 8, 8);
        const centerMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
        const center = new THREE.Mesh(centerGeom, centerMat);
        center.position.y = 0.12;
        group.add(center);

        return group;
    }

    createReeds(x, z, count = 5) {
        const group = new THREE.Group();
        const reedMat = new THREE.MeshPhongMaterial({ color: 0x6B8E23 });

        for (let i = 0; i < count; i++) {
            const height = 1.5 + Math.random() * 1;
            const reedGeom = new THREE.CylinderGeometry(0.02, 0.03, height, 4);
            const reed = new THREE.Mesh(reedGeom, reedMat);
            reed.position.set(
                (Math.random() - 0.5) * 0.5,
                height / 2,
                (Math.random() - 0.5) * 0.5
            );
            reed.rotation.x = (Math.random() - 0.5) * 0.1;
            reed.rotation.z = (Math.random() - 0.5) * 0.1;
            group.add(reed);

            // Cattail top
            if (Math.random() > 0.3) {
                const topGeom = new THREE.CylinderGeometry(0.05, 0.04, 0.25, 6);
                const topMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
                const top = new THREE.Mesh(topGeom, topMat);
                top.position.set(reed.position.x, height + 0.1, reed.position.z);
                group.add(top);
            }
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        return group;
    }

    createRiver(startX, startZ, endX, endZ, width = 4) {
        const group = new THREE.Group();

        // Calculate river path
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));
        const angle = Math.atan2(endZ - startZ, endX - startX);

        // River bed
        const bedGeom = new THREE.PlaneGeometry(length, width + 2, 20, 4);
        const bedMat = new THREE.MeshPhongMaterial({ color: 0x5D4E37 });
        const bed = new THREE.Mesh(bedGeom, bedMat);
        bed.rotation.x = -Math.PI / 2;
        bed.position.set((startX + endX) / 2, -0.1, (startZ + endZ) / 2);
        bed.rotation.z = -angle;
        group.add(bed);

        // Water surface with animation
        const waterGeom = new THREE.PlaneGeometry(length, width, 30, 6);
        const waterMat = new THREE.ShaderMaterial({
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
                    pos.z = sin(pos.x * 0.5 + time * 2.0) * 0.1 + sin(pos.y * 0.8 + time * 1.5) * 0.05;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 waterColor;
                varying vec2 vUv;
                void main() {
                    float shine = pow(sin(vUv.x * 20.0) * 0.5 + 0.5, 3.0) * 0.3;
                    vec3 color = waterColor + vec3(shine);
                    gl_FragColor = vec4(color, 0.8);
                }
            `,
            transparent: true
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set((startX + endX) / 2, 0.05, (startZ + endZ) / 2);
        water.rotation.z = -angle;
        group.add(water);

        this.scene.add(group);
        this.objects.push(group);

        this.animatedObjects.push({
            type: 'river',
            material: waterMat
        });

        return group;
    }

    createBridge(x, z, rotation = 0, length = 8) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true });
        const darkWoodMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });

        // Main planks
        for (let i = 0; i < 12; i++) {
            const plankGeom = new THREE.BoxGeometry(2.5, 0.15, 0.5);
            const plank = new THREE.Mesh(plankGeom, woodMat);
            plank.position.set(0, 0.5, -length/2 + 0.3 + i * (length/12));
            plank.castShadow = true;
            group.add(plank);
        }

        // Support beams underneath
        const beamGeom = new THREE.BoxGeometry(0.2, 0.3, length);
        [-1, 1].forEach(side => {
            const beam = new THREE.Mesh(beamGeom, darkWoodMat);
            beam.position.set(side * 0.9, 0.25, 0);
            group.add(beam);
        });

        // Railings
        const railGeom = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
        [-1.2, 1.2].forEach(side => {
            const rail = new THREE.Mesh(railGeom, darkWoodMat);
            rail.rotation.x = Math.PI / 2;
            rail.position.set(side, 1.2, 0);
            group.add(rail);
        });

        // Railing posts
        const postGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6);
        for (let i = 0; i < 5; i++) {
            [-1.2, 1.2].forEach(side => {
                const post = new THREE.Mesh(postGeom, darkWoodMat);
                post.position.set(side, 0.9, -length/2 + 1 + i * (length/5));
                group.add(post);
            });
        }

        // Stone supports at ends
        const stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });
        [-length/2 - 0.5, length/2 + 0.5].forEach(pos => {
            const stoneGeom = new THREE.BoxGeometry(3, 1, 1.5);
            const stone = new THREE.Mesh(stoneGeom, stoneMat);
            stone.position.set(0, 0, pos);
            group.add(stone);
        });

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        this.scene.add(group);
        this.objects.push(group);

        return group;
    }

    createCampfire(x, z) {
        const group = new THREE.Group();

        // Stone ring
        const stoneMat = new THREE.MeshPhongMaterial({ color: 0x696969, flatShading: true });
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const stoneGeom = new THREE.DodecahedronGeometry(0.25, 0);
            const stone = new THREE.Mesh(stoneGeom, stoneMat);
            stone.position.set(
                Math.cos(angle) * 0.8,
                0.15,
                Math.sin(angle) * 0.8
            );
            stone.scale.y = 0.7;
            group.add(stone);
        }

        // Logs
        const logMat = new THREE.MeshPhongMaterial({ color: 0x3D2314 });
        for (let i = 0; i < 4; i++) {
            const logGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6);
            const log = new THREE.Mesh(logGeom, logMat);
            const angle = (i / 4) * Math.PI * 2 + 0.4;
            log.position.set(
                Math.cos(angle) * 0.25,
                0.2,
                Math.sin(angle) * 0.25
            );
            log.rotation.x = Math.PI / 2;
            log.rotation.y = angle;
            group.add(log);
        }

        // Fire glow (emissive sphere)
        const fireGeom = new THREE.SphereGeometry(0.3, 8, 8);
        const fireMat = new THREE.MeshBasicMaterial({
            color: 0xFF6600,
            transparent: true,
            opacity: 0.8
        });
        const fire = new THREE.Mesh(fireGeom, fireMat);
        fire.position.y = 0.4;
        fire.name = 'fireGlow';
        group.add(fire);

        // Inner fire (brighter)
        const innerFireGeom = new THREE.SphereGeometry(0.15, 6, 6);
        const innerFireMat = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.9
        });
        const innerFire = new THREE.Mesh(innerFireGeom, innerFireMat);
        innerFire.position.y = 0.45;
        innerFire.name = 'innerFire';
        group.add(innerFire);

        // Point light
        const fireLight = new THREE.PointLight(0xFF6600, 1.5, 12);
        fireLight.position.y = 0.5;
        group.add(fireLight);

        // Smoke particles (simple spheres going up)
        for (let i = 0; i < 5; i++) {
            const smokeGeom = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 6, 6);
            const smokeMat = new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.3
            });
            const smoke = new THREE.Mesh(smokeGeom, smokeMat);
            smoke.position.set(
                (Math.random() - 0.5) * 0.3,
                1 + i * 0.5,
                (Math.random() - 0.5) * 0.3
            );
            smoke.name = 'smoke';
            group.add(smoke);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.animatedObjects.push({
            type: 'campfire',
            object: group,
            fire: fire,
            innerFire: innerFire,
            light: fireLight,
            phase: Math.random() * Math.PI * 2
        });

        return group;
    }

    createSandcastle(x, z, scale = 1) {
        const group = new THREE.Group();
        const sandMat = new THREE.MeshPhongMaterial({ color: 0xDEB887, flatShading: true });

        // Main tower
        const mainTowerGeom = new THREE.CylinderGeometry(0.6 * scale, 0.8 * scale, 1.2 * scale, 8);
        const mainTower = new THREE.Mesh(mainTowerGeom, sandMat);
        mainTower.position.y = 0.6 * scale;
        mainTower.castShadow = true;
        group.add(mainTower);

        // Tower top
        const topGeom = new THREE.ConeGeometry(0.65 * scale, 0.4 * scale, 8);
        const top = new THREE.Mesh(topGeom, sandMat);
        top.position.y = 1.4 * scale;
        group.add(top);

        // Smaller towers
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const dist = 1 * scale;

            const smallTowerGeom = new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 0.8 * scale, 6);
            const smallTower = new THREE.Mesh(smallTowerGeom, sandMat);
            smallTower.position.set(
                Math.cos(angle) * dist,
                0.4 * scale,
                Math.sin(angle) * dist
            );
            smallTower.castShadow = true;
            group.add(smallTower);

            const smallTopGeom = new THREE.ConeGeometry(0.35 * scale, 0.3 * scale, 6);
            const smallTop = new THREE.Mesh(smallTopGeom, sandMat);
            smallTop.position.set(
                Math.cos(angle) * dist,
                0.95 * scale,
                Math.sin(angle) * dist
            );
            group.add(smallTop);
        }

        // Wall connecting towers
        const wallGeom = new THREE.BoxGeometry(0.15 * scale, 0.4 * scale, 1.4 * scale);
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const wall = new THREE.Mesh(wallGeom, sandMat);
            wall.position.set(
                Math.cos(angle) * 0.7 * scale,
                0.2 * scale,
                Math.sin(angle) * 0.7 * scale
            );
            wall.rotation.y = angle;
            group.add(wall);
        }

        // Flag
        const flagPoleGeom = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.6 * scale, 4);
        const flagPoleMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const flagPole = new THREE.Mesh(flagPoleGeom, flagPoleMat);
        flagPole.position.y = 1.9 * scale;
        group.add(flagPole);

        const flagGeom = new THREE.PlaneGeometry(0.3 * scale, 0.2 * scale);
        const flagMat = new THREE.MeshPhongMaterial({
            color: [0xFF0000, 0x0000FF, 0x00FF00][Math.floor(Math.random() * 3)],
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeom, flagMat);
        flag.position.set(0.15 * scale, 2.1 * scale, 0);
        group.add(flag);

        group.position.set(x, 0, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(group);
        this.objects.push(group);

        return group;
    }

    // ==================== PLAYGROUND STRUCTURES ====================

    createPlayground(x, z) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
        const metalMat2 = new THREE.MeshPhongMaterial({ color: 0x4ECDC4 });
        const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

        // === SWING SET ===
        const swingGroup = new THREE.Group();

        // A-frame supports
        const supportGeom = new THREE.CylinderGeometry(0.08, 0.08, 4, 6);
        [[-1.5, -1], [-1.5, 1], [1.5, -1], [1.5, 1]].forEach(([sx, sz]) => {
            const support = new THREE.Mesh(supportGeom, metalMat);
            support.position.set(sx, 2, sz * 0.8);
            support.rotation.z = sx > 0 ? 0.15 : -0.15;
            support.castShadow = true;
            swingGroup.add(support);
        });

        // Top bar
        const topBarGeom = new THREE.CylinderGeometry(0.06, 0.06, 4, 8);
        const topBar = new THREE.Mesh(topBarGeom, metalMat);
        topBar.rotation.z = Math.PI / 2;
        topBar.position.y = 3.8;
        swingGroup.add(topBar);

        // Swing seats (2 swings) - store direct references for animation
        const swingSeats = [];
        [-0.8, 0.8].forEach((offset, idx) => {
            // Chains - use shared material
            const chainGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4);

            const leftChain = new THREE.Mesh(chainGeom, this.materials.metal);
            leftChain.position.set(offset - 0.3, 2.5, 0);
            swingGroup.add(leftChain);

            const rightChain = new THREE.Mesh(chainGeom, this.materials.metal);
            rightChain.position.set(offset + 0.3, 2.5, 0);
            swingGroup.add(rightChain);

            // Seat - use shared material
            const seat = new THREE.Mesh(
                this.geometries.swingSeat,
                idx === 0 ? this.materials.playgroundTeal : this.materials.playgroundYellow
            );
            seat.position.set(offset, 1.2, 0);
            seat.name = 'swingSeat';
            swingGroup.add(seat);
            swingSeats.push(seat);
        });

        swingGroup.position.set(-4, 0, 0);
        group.add(swingGroup);

        // === SLIDE ===
        const slideGroup = new THREE.Group();

        // Platform
        const platformGeom = new THREE.BoxGeometry(2, 0.15, 2);
        const platform = new THREE.Mesh(platformGeom, woodMat);
        platform.position.y = 2.5;
        platform.castShadow = true;
        slideGroup.add(platform);

        // Platform supports
        const legGeom = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6);
        [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeom, metalMat2);
            leg.position.set(lx, 1.25, lz);
            leg.castShadow = true;
            slideGroup.add(leg);
        });

        // Slide chute
        const slideGeom = new THREE.BoxGeometry(1.2, 0.05, 4);
        const slideMat = new THREE.MeshPhongMaterial({ color: 0xFFE66D, shininess: 80 });
        const slide = new THREE.Mesh(slideGeom, slideMat);
        slide.position.set(0, 1.3, 2.5);
        slide.rotation.x = 0.5;
        slideGroup.add(slide);

        // Slide sides
        const sideGeom = new THREE.BoxGeometry(0.08, 0.3, 4);
        const sideMat = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
        [-0.65, 0.65].forEach(offset => {
            const side = new THREE.Mesh(sideGeom, sideMat);
            side.position.set(offset, 1.4, 2.5);
            side.rotation.x = 0.5;
            slideGroup.add(side);
        });

        // Ladder
        const ladderRungGeom = new THREE.CylinderGeometry(0.04, 0.04, 1, 6);
        for (let i = 0; i < 5; i++) {
            const rung = new THREE.Mesh(ladderRungGeom, metalMat2);
            rung.rotation.z = Math.PI / 2;
            rung.position.set(0, 0.5 + i * 0.5, -1.2);
            slideGroup.add(rung);
        }

        // Ladder sides
        const ladderSideGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6);
        [-0.5, 0.5].forEach(offset => {
            const ladderSide = new THREE.Mesh(ladderSideGeom, metalMat2);
            ladderSide.position.set(offset, 1.4, -1.2);
            slideGroup.add(ladderSide);
        });

        // Safety rails on platform
        const railGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
        const rail1 = new THREE.Mesh(railGeom, metalMat2);
        rail1.rotation.z = Math.PI / 2;
        rail1.position.set(0, 3.1, -0.9);
        slideGroup.add(rail1);

        const rail2 = new THREE.Mesh(railGeom, metalMat2);
        rail2.rotation.z = Math.PI / 2;
        rail2.position.set(0, 3.1, 0);
        slideGroup.add(rail2);

        slideGroup.position.set(4, 0, 0);
        group.add(slideGroup);

        // Ground rubber mat
        const matGeom = new THREE.PlaneGeometry(14, 8);
        const matMaterial = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
        const groundMat = new THREE.Mesh(matGeom, matMaterial);
        groundMat.rotation.x = -Math.PI / 2;
        groundMat.position.y = 0.02;
        group.add(groundMat);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        // Swing animation - include direct seat references
        this.animatedObjects.push({
            type: 'swing',
            object: swingGroup,
            seats: swingSeats,
            phase: Math.random() * Math.PI * 2
        });

        return group;
    }

    createCarousel(x, z, scale = 1) {
        const group = new THREE.Group();

        // Base platform
        const baseGeom = new THREE.CylinderGeometry(4 * scale, 4.2 * scale, 0.4 * scale, 16);
        const baseMat = new THREE.MeshPhongMaterial({ color: 0xCD853F });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.2 * scale;
        base.castShadow = true;
        group.add(base);

        // Rotating platform
        const platformGroup = new THREE.Group();

        // Platform floor with decorative pattern
        const floorGeom = new THREE.CylinderGeometry(3.5 * scale, 3.5 * scale, 0.15 * scale, 16);
        const floorMat = new THREE.MeshPhongMaterial({ color: 0xFFE4B5 });
        const floor = new THREE.Mesh(floorGeom, floorMat);
        floor.position.y = 0.5 * scale;
        platformGroup.add(floor);

        // Decorative ring
        const ringGeom = new THREE.TorusGeometry(3.3 * scale, 0.15 * scale, 8, 24);
        const ringMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.55 * scale;
        platformGroup.add(ring);

        // Center pole
        const poleGeom = new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 4 * scale, 12);
        const poleMat = new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 80 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 2.5 * scale;
        pole.castShadow = true;
        platformGroup.add(pole);

        // Top canopy
        const canopyGeom = new THREE.ConeGeometry(4.5 * scale, 1.5 * scale, 16);
        const canopyMat = new THREE.MeshPhongMaterial({
            color: 0xFF6B6B,
            side: THREE.DoubleSide
        });
        const canopy = new THREE.Mesh(canopyGeom, canopyMat);
        canopy.position.y = 5 * scale;
        canopy.castShadow = true;
        platformGroup.add(canopy);

        // Canopy stripes
        for (let i = 0; i < 8; i++) {
            const stripeGeom = new THREE.ConeGeometry(4.52 * scale, 1.52 * scale, 16, 1, false,
                i * Math.PI / 4, Math.PI / 8);
            const stripeMat = new THREE.MeshPhongMaterial({
                color: 0xFFFFFF,
                side: THREE.DoubleSide
            });
            const stripe = new THREE.Mesh(stripeGeom, stripeMat);
            stripe.position.y = 5 * scale;
            platformGroup.add(stripe);
        }

        // Top ornament
        const ornamentGeom = new THREE.SphereGeometry(0.3 * scale, 12, 12);
        const ornamentMat = new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 100 });
        const ornament = new THREE.Mesh(ornamentGeom, ornamentMat);
        ornament.position.y = 5.8 * scale;
        platformGroup.add(ornament);

        // Carousel horses and seats
        const horseColors = [0xFFFFFF, 0x8B4513, 0x2F2F2F, 0xDEB887];
        const seatColors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x9B59B6];

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 2.5 * scale;
            const px = Math.cos(angle) * radius;
            const pz = Math.sin(angle) * radius;

            if (i % 2 === 0) {
                // Horse
                const horseGroup = this.createCarouselHorse(
                    scale * 0.5,
                    horseColors[Math.floor(i / 2) % horseColors.length]
                );
                horseGroup.position.set(px, 1.5 * scale, pz);
                horseGroup.rotation.y = -angle + Math.PI / 2;
                horseGroup.name = 'carouselHorse';
                platformGroup.add(horseGroup);

                // Pole for horse
                const horsePoleGeom = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 3.5 * scale, 8);
                const horsePoleMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
                const horsePole = new THREE.Mesh(horsePoleGeom, horsePoleMat);
                horsePole.position.set(px, 2.75 * scale, pz);
                platformGroup.add(horsePole);
            } else {
                // Bench seat
                const benchGroup = new THREE.Group();

                const seatGeom = new THREE.BoxGeometry(1 * scale, 0.1 * scale, 0.5 * scale);
                const seatMat = new THREE.MeshPhongMaterial({
                    color: seatColors[Math.floor(i / 2) % seatColors.length]
                });
                const seat = new THREE.Mesh(seatGeom, seatMat);
                benchGroup.add(seat);

                // Back rest
                const backGeom = new THREE.BoxGeometry(1 * scale, 0.6 * scale, 0.08 * scale);
                const back = new THREE.Mesh(backGeom, seatMat);
                back.position.set(0, 0.35 * scale, -0.2 * scale);
                benchGroup.add(back);

                benchGroup.position.set(px, 1.2 * scale, pz);
                benchGroup.rotation.y = -angle;
                platformGroup.add(benchGroup);

                // Pole for bench
                const benchPoleGeom = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 3.5 * scale, 8);
                const benchPoleMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
                const benchPole = new THREE.Mesh(benchPoleGeom, benchPoleMat);
                benchPole.position.set(px, 2.75 * scale, pz);
                platformGroup.add(benchPole);
            }
        }

        // Decorative lights around canopy edge
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const lx = Math.cos(angle) * 4.2 * scale;
            const lz = Math.sin(angle) * 4.2 * scale;

            const lightGeom = new THREE.SphereGeometry(0.1 * scale, 8, 8);
            const lightMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xFFFF00 : 0xFF69B4
            });
            const light = new THREE.Mesh(lightGeom, lightMat);
            light.position.set(lx, 4.3 * scale, lz);
            platformGroup.add(light);
        }

        group.add(platformGroup);
        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        // Rotation animation
        this.animatedObjects.push({
            type: 'carousel',
            object: platformGroup,
            speed: 0.3,
            phase: Math.random() * Math.PI * 2
        });

        this.colliders.push({
            type: 'cylinder',
            objectType: 'carousel',
            x: x,
            z: z,
            radius: 5 * scale,
            height: 6 * scale
        });

        return group;
    }

    createCarouselHorse(scale, color) {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshPhongMaterial({ color: color, flatShading: true });
        const detailMat = new THREE.MeshPhongMaterial({ color: 0xFFD700 });

        // Body
        const bodyGeom = new THREE.CylinderGeometry(0.4 * scale, 0.35 * scale, 1.2 * scale, 8);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Head
        const headGeom = new THREE.SphereGeometry(0.3 * scale, 8, 6);
        headGeom.scale(1, 1, 1.4);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0.7 * scale, 0.3 * scale, 0);
        group.add(head);

        // Snout
        const snoutGeom = new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 0.3 * scale, 6);
        const snout = new THREE.Mesh(snoutGeom, bodyMat);
        snout.rotation.z = Math.PI / 2;
        snout.position.set(1 * scale, 0.2 * scale, 0);
        group.add(snout);

        // Ears
        const earGeom = new THREE.ConeGeometry(0.08 * scale, 0.2 * scale, 4);
        [-0.12, 0.12].forEach(offset => {
            const ear = new THREE.Mesh(earGeom, bodyMat);
            ear.position.set(0.65 * scale, 0.55 * scale, offset * scale);
            group.add(ear);
        });

        // Mane
        const maneGeom = new THREE.BoxGeometry(0.4 * scale, 0.15 * scale, 0.08 * scale);
        const maneMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        for (let i = 0; i < 4; i++) {
            const mane = new THREE.Mesh(maneGeom, maneMat);
            mane.position.set(0.3 * scale - i * 0.15 * scale, 0.45 * scale, 0);
            mane.rotation.z = 0.2;
            group.add(mane);
        }

        // Legs
        const legGeom = new THREE.CylinderGeometry(0.08 * scale, 0.06 * scale, 0.6 * scale, 6);
        [[-0.3, 0.15], [-0.3, -0.15], [0.3, 0.15], [0.3, -0.15]].forEach(([lx, lz], idx) => {
            const leg = new THREE.Mesh(legGeom, bodyMat);
            leg.position.set(lx * scale, -0.5 * scale, lz * scale);
            // Front legs slightly forward
            if (idx < 2) leg.rotation.x = 0.2;
            else leg.rotation.x = -0.2;
            group.add(leg);
        });

        // Tail
        const tailGeom = new THREE.CylinderGeometry(0.03 * scale, 0.08 * scale, 0.4 * scale, 6);
        const tail = new THREE.Mesh(tailGeom, maneMat);
        tail.position.set(-0.7 * scale, 0, 0);
        tail.rotation.z = -0.5;
        group.add(tail);

        // Saddle
        const saddleGeom = new THREE.BoxGeometry(0.5 * scale, 0.1 * scale, 0.4 * scale);
        const saddleMat = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        const saddle = new THREE.Mesh(saddleGeom, saddleMat);
        saddle.position.y = 0.25 * scale;
        group.add(saddle);

        // Decorative bridle
        const bridleGeom = new THREE.TorusGeometry(0.25 * scale, 0.02 * scale, 6, 12);
        const bridle = new THREE.Mesh(bridleGeom, detailMat);
        bridle.position.set(0.7 * scale, 0.3 * scale, 0);
        bridle.rotation.y = Math.PI / 2;
        group.add(bridle);

        return group;
    }

    // ==================== FARM STRUCTURES ====================

    createFarm(x, z) {
        const group = new THREE.Group();

        // Barn
        const barnGroup = new THREE.Group();

        // Barn walls
        const wallMat = new THREE.MeshPhongMaterial({ color: 0xB22222, flatShading: true });
        const wallGeom = new THREE.BoxGeometry(12, 8, 10);
        const walls = new THREE.Mesh(wallGeom, wallMat);
        walls.position.y = 4;
        walls.castShadow = true;
        barnGroup.add(walls);

        // Barn roof
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const roofGeom = new THREE.ConeGeometry(9, 4, 4);
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.y = 10;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        barnGroup.add(roof);

        // Barn door
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x5D3A1A });
        const doorGeom = new THREE.BoxGeometry(4, 6, 0.3);
        const door = new THREE.Mesh(doorGeom, doorMat);
        door.position.set(0, 3, 5.15);
        barnGroup.add(door);

        // X pattern on door
        const xMat = new THREE.MeshPhongMaterial({ color: 0xF5DEB3 });
        const xGeom = new THREE.BoxGeometry(0.2, 5.5, 0.1);
        const x1 = new THREE.Mesh(xGeom, xMat);
        x1.rotation.z = Math.PI / 4;
        x1.position.set(-1, 3, 5.3);
        barnGroup.add(x1);
        const x2 = new THREE.Mesh(xGeom, xMat);
        x2.rotation.z = -Math.PI / 4;
        x2.position.set(1, 3, 5.3);
        barnGroup.add(x2);

        // Hay loft window
        const windowGeom = new THREE.CircleGeometry(1, 6);
        const windowMat = new THREE.MeshPhongMaterial({ color: 0x4a3728 });
        const window = new THREE.Mesh(windowGeom, windowMat);
        window.position.set(0, 7, 5.1);
        barnGroup.add(window);

        barnGroup.position.set(0, 0, -8);
        group.add(barnGroup);

        // Fence enclosure
        const fenceMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
        const fencePostGeom = new THREE.CylinderGeometry(0.15, 0.15, 2, 6);
        const fenceRailGeom = new THREE.BoxGeometry(0.1, 0.15, 4);

        // Create fence posts and rails
        const fencePositions = [];
        for (let i = -3; i <= 3; i++) {
            fencePositions.push({ x: i * 4, z: 8, rotY: 0 });
            fencePositions.push({ x: i * 4, z: -2, rotY: 0 });
        }
        for (let i = 0; i <= 2; i++) {
            fencePositions.push({ x: -12, z: i * 5 - 2, rotY: Math.PI / 2 });
            fencePositions.push({ x: 12, z: i * 5 - 2, rotY: Math.PI / 2 });
        }

        fencePositions.forEach(pos => {
            const post = new THREE.Mesh(fencePostGeom, fenceMat);
            post.position.set(pos.x, 1, pos.z);
            group.add(post);
        });

        // Horizontal rails
        for (let i = -3; i < 3; i++) {
            [0.6, 1.4].forEach(h => {
                const rail = new THREE.Mesh(fenceRailGeom, fenceMat);
                rail.position.set(i * 4 + 2, h, 8);
                rail.rotation.y = Math.PI / 2;
                group.add(rail);

                const rail2 = new THREE.Mesh(fenceRailGeom, fenceMat);
                rail2.position.set(i * 4 + 2, h, -2);
                rail2.rotation.y = Math.PI / 2;
                group.add(rail2);
            });
        }

        // Gate opening (no fence at front center)
        // Side fences
        for (let i = 0; i < 2; i++) {
            [0.6, 1.4].forEach(h => {
                const rail = new THREE.Mesh(fenceRailGeom, fenceMat);
                rail.position.set(-12, h, i * 5);
                group.add(rail);

                const rail2 = new THREE.Mesh(fenceRailGeom, fenceMat);
                rail2.position.set(12, h, i * 5);
                group.add(rail2);
            });
        }

        // Water trough
        const troughGeom = new THREE.BoxGeometry(3, 0.8, 1.2);
        const troughMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const trough = new THREE.Mesh(troughGeom, troughMat);
        trough.position.set(8, 0.4, 3);
        group.add(trough);

        // Water in trough
        const waterGeom = new THREE.BoxGeometry(2.6, 0.3, 0.9);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x4682B4,
            transparent: true,
            opacity: 0.7
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.position.set(8, 0.6, 3);
        group.add(water);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'box',
            objectType: 'building',
            x: x,
            z: z - 8,
            width: 14,
            depth: 12,
            height: 12
        });

        return group;
    }

    createAnimal(x, z, type = 'chicken') {
        const group = new THREE.Group();

        if (type === 'chicken') {
            // Body
            const bodyGeom = new THREE.SphereGeometry(0.25, 8, 6);
            bodyGeom.scale(1, 0.8, 1.2);
            const bodyMat = new THREE.MeshPhongMaterial({
                color: [0xFFFFFF, 0x8B4513, 0xD2691E][Math.floor(Math.random() * 3)],
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.position.y = 0.3;
            group.add(body);

            // Head
            const headGeom = new THREE.SphereGeometry(0.12, 8, 6);
            const head = new THREE.Mesh(headGeom, bodyMat);
            head.position.set(0, 0.45, 0.2);
            group.add(head);

            // Comb
            const combGeom = new THREE.BoxGeometry(0.08, 0.12, 0.15);
            const combMat = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
            const comb = new THREE.Mesh(combGeom, combMat);
            comb.position.set(0, 0.55, 0.2);
            group.add(comb);

            // Beak
            const beakGeom = new THREE.ConeGeometry(0.04, 0.1, 4);
            const beakMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
            const beak = new THREE.Mesh(beakGeom, beakMat);
            beak.rotation.x = Math.PI / 2;
            beak.position.set(0, 0.42, 0.32);
            group.add(beak);

            // Wattle
            const wattleGeom = new THREE.SphereGeometry(0.04, 6, 6);
            const wattle = new THREE.Mesh(wattleGeom, combMat);
            wattle.position.set(0, 0.38, 0.28);
            group.add(wattle);

            // Tail
            const tailGeom = new THREE.ConeGeometry(0.1, 0.25, 4);
            const tail = new THREE.Mesh(tailGeom, bodyMat);
            tail.position.set(0, 0.4, -0.25);
            tail.rotation.x = -0.8;
            group.add(tail);

            // Legs
            const legMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
            [-0.08, 0.08].forEach(offset => {
                const legGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4);
                const leg = new THREE.Mesh(legGeom, legMat);
                leg.position.set(offset, 0.1, 0.05);
                group.add(leg);
            });

            group.scale.setScalar(0.8 + Math.random() * 0.3);

        } else if (type === 'cow') {
            const bodyColor = Math.random() > 0.5 ? 0xFFFFFF : 0x8B4513;
            const bodyMat = new THREE.MeshPhongMaterial({ color: bodyColor, flatShading: true });

            // Body
            const bodyGeom = new THREE.CylinderGeometry(0.6, 0.55, 1.5, 8);
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.9;
            group.add(body);

            // Spots (if white cow)
            if (bodyColor === 0xFFFFFF) {
                const spotMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });
                for (let i = 0; i < 4; i++) {
                    const spotGeom = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6);
                    const spot = new THREE.Mesh(spotGeom, spotMat);
                    spot.position.set(
                        (Math.random() - 0.5) * 0.8,
                        0.9 + (Math.random() - 0.5) * 0.3,
                        (Math.random() - 0.5) * 0.4
                    );
                    spot.scale.y = 0.3;
                    group.add(spot);
                }
            }

            // Head
            const headGeom = new THREE.SphereGeometry(0.35, 8, 6);
            headGeom.scale(1, 0.9, 1.2);
            const head = new THREE.Mesh(headGeom, bodyMat);
            head.position.set(0.9, 1.1, 0);
            group.add(head);

            // Snout
            const snoutGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.2, 8);
            const snoutMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
            const snout = new THREE.Mesh(snoutGeom, snoutMat);
            snout.rotation.z = Math.PI / 2;
            snout.position.set(1.2, 1, 0);
            group.add(snout);

            // Horns
            const hornMat = new THREE.MeshPhongMaterial({ color: 0xF5F5DC });
            [-0.2, 0.2].forEach(offset => {
                const hornGeom = new THREE.ConeGeometry(0.06, 0.25, 6);
                const horn = new THREE.Mesh(hornGeom, hornMat);
                horn.position.set(0.75, 1.4, offset);
                horn.rotation.x = offset > 0 ? 0.3 : -0.3;
                group.add(horn);
            });

            // Ears
            const earGeom = new THREE.SphereGeometry(0.1, 6, 6);
            earGeom.scale(1.5, 0.5, 1);
            [-0.35, 0.35].forEach(offset => {
                const ear = new THREE.Mesh(earGeom, bodyMat);
                ear.position.set(0.7, 1.25, offset);
                group.add(ear);
            });

            // Legs
            const legGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.7, 6);
            const legMat = new THREE.MeshPhongMaterial({ color: bodyColor });
            [[-0.4, 0.2], [-0.4, -0.2], [0.4, 0.2], [0.4, -0.2]].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(legGeom, legMat);
                leg.position.set(lx, 0.35, lz);
                group.add(leg);

                // Hoof
                const hoofGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 6);
                const hoofMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });
                const hoof = new THREE.Mesh(hoofGeom, hoofMat);
                hoof.position.set(lx, 0.05, lz);
                group.add(hoof);
            });

            // Tail
            const tailGeom = new THREE.CylinderGeometry(0.03, 0.02, 0.6, 4);
            const tail = new THREE.Mesh(tailGeom, bodyMat);
            tail.position.set(-0.8, 0.8, 0);
            tail.rotation.z = 0.5;
            group.add(tail);

            // Tail tuft
            const tuftGeom = new THREE.SphereGeometry(0.08, 6, 6);
            const tuftMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });
            const tuft = new THREE.Mesh(tuftGeom, tuftMat);
            tuft.position.set(-1.05, 0.55, 0);
            group.add(tuft);

            // Udder
            const udderGeom = new THREE.SphereGeometry(0.2, 8, 6);
            const udderMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
            const udder = new THREE.Mesh(udderGeom, udderMat);
            udder.position.set(-0.2, 0.4, 0);
            udder.scale.y = 0.7;
            group.add(udder);

            group.scale.setScalar(1.2);

        } else if (type === 'sheep') {
            const woolMat = new THREE.MeshPhongMaterial({ color: 0xFFFFF0, flatShading: true });
            const faceMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });

            // Woolly body
            for (let i = 0; i < 8; i++) {
                const woolGeom = new THREE.SphereGeometry(0.25 + Math.random() * 0.1, 6, 6);
                const wool = new THREE.Mesh(woolGeom, woolMat);
                wool.position.set(
                    (Math.random() - 0.5) * 0.5,
                    0.5 + (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.4
                );
                group.add(wool);
            }

            // Head
            const headGeom = new THREE.SphereGeometry(0.18, 8, 6);
            const head = new THREE.Mesh(headGeom, faceMat);
            head.position.set(0.4, 0.6, 0);
            group.add(head);

            // Ears
            const earGeom = new THREE.SphereGeometry(0.08, 6, 6);
            earGeom.scale(1.5, 0.5, 1);
            [-0.15, 0.15].forEach(offset => {
                const ear = new THREE.Mesh(earGeom, faceMat);
                ear.position.set(0.35, 0.7, offset);
                group.add(ear);
            });

            // Snout
            const snoutGeom = new THREE.SphereGeometry(0.08, 6, 6);
            const snoutMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
            const snout = new THREE.Mesh(snoutGeom, snoutMat);
            snout.position.set(0.55, 0.55, 0);
            group.add(snout);

            // Legs
            const legGeom = new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6);
            const legMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F });
            [[-0.2, 0.1], [-0.2, -0.1], [0.2, 0.1], [0.2, -0.1]].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(legGeom, legMat);
                leg.position.set(lx, 0.2, lz);
                group.add(leg);
            });

            // Tail (small wool puff)
            const tailGeom = new THREE.SphereGeometry(0.1, 6, 6);
            const tail = new THREE.Mesh(tailGeom, woolMat);
            tail.position.set(-0.35, 0.5, 0);
            group.add(tail);

            group.scale.setScalar(0.9 + Math.random() * 0.2);
        }

        group.position.set(x, 0, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(group);
        this.objects.push(group);

        // Add idle animation
        this.animatedObjects.push({
            type: 'animal',
            object: group,
            animalType: type,
            phase: Math.random() * Math.PI * 2
        });

        return group;
    }

    createHaystack(x, z, scale = 1) {
        const group = new THREE.Group();

        // Main hay pile
        const hayGeom = new THREE.CylinderGeometry(1.5 * scale, 2 * scale, 2 * scale, 8);
        const hayMat = new THREE.MeshPhongMaterial({ color: 0xDAA520, flatShading: true });
        const hay = new THREE.Mesh(hayGeom, hayMat);
        hay.position.y = 1 * scale;
        hay.castShadow = true;
        group.add(hay);

        // Top dome
        const topGeom = new THREE.SphereGeometry(1.5 * scale, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        const top = new THREE.Mesh(topGeom, hayMat);
        top.position.y = 2 * scale;
        group.add(top);

        // Hay strands sticking out
        const strandMat = new THREE.MeshPhongMaterial({ color: 0xF0E68C });
        for (let i = 0; i < 12; i++) {
            const strandGeom = new THREE.CylinderGeometry(0.02 * scale, 0.03 * scale, 0.4 * scale, 4);
            const strand = new THREE.Mesh(strandGeom, strandMat);
            const angle = (i / 12) * Math.PI * 2;
            strand.position.set(
                Math.cos(angle) * 1.4 * scale,
                1.5 * scale + Math.random() * 0.5 * scale,
                Math.sin(angle) * 1.4 * scale
            );
            strand.rotation.x = (Math.random() - 0.5) * 0.5;
            strand.rotation.z = (Math.random() - 0.5) * 0.5;
            group.add(strand);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        return group;
    }

    createWell(x, z) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });
        const woodMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

        // Stone base
        const baseGeom = new THREE.CylinderGeometry(1.2, 1.4, 1, 12);
        const base = new THREE.Mesh(baseGeom, stoneMat);
        base.position.y = 0.5;
        base.castShadow = true;
        group.add(base);

        // Inner hole (darker)
        const holeGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 12);
        const holeMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        const hole = new THREE.Mesh(holeGeom, holeMat);
        hole.position.y = 0.8;
        group.add(hole);

        // Water at bottom
        const waterGeom = new THREE.CircleGeometry(0.7, 12);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x4682B4,
            transparent: true,
            opacity: 0.6
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.6;
        group.add(water);

        // Roof supports
        const supportGeom = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6);
        [-0.9, 0.9].forEach(offset => {
            const support = new THREE.Mesh(supportGeom, woodMat);
            support.position.set(offset, 2.25, 0);
            support.castShadow = true;
            group.add(support);
        });

        // Roof beam
        const beamGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6);
        const beam = new THREE.Mesh(beamGeom, woodMat);
        beam.rotation.z = Math.PI / 2;
        beam.position.y = 3.5;
        group.add(beam);

        // Roof
        const roofGeom = new THREE.ConeGeometry(1.5, 1, 4);
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.y = 4.2;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Crank
        const crankGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
        const crank = new THREE.Mesh(crankGeom, woodMat);
        crank.rotation.x = Math.PI / 2;
        crank.position.set(1.2, 3.5, 0);
        group.add(crank);

        // Crank handle
        const handleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4);
        const handle = new THREE.Mesh(handleGeom, woodMat);
        handle.position.set(1.2, 3.5, 0.25);
        group.add(handle);

        // Bucket
        const bucketGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
        const bucketMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const bucket = new THREE.Mesh(bucketGeom, bucketMat);
        bucket.position.set(0, 2.5, 0);
        group.add(bucket);

        // Rope
        const ropeGeom = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
        const ropeMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
        const rope = new THREE.Mesh(ropeGeom, ropeMat);
        rope.position.set(0, 3, 0);
        group.add(rope);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.objects.push(group);

        this.colliders.push({
            type: 'cylinder',
            objectType: 'stone',
            x: x,
            z: z,
            radius: 1.5,
            height: 4.5
        });

        return group;
    }
}

// Location configurations with rich details

// Forward declare World type to avoid circular dependency
export interface WorldInterface {
    createGround(color: number, hasGrass: boolean): void;
    createBuilding(x: number, z: number, width: number, depth: number, height: number, color: number): void;
    createTree(x: number, z: number, scale: number, type?: string): void;
    createStreetLamp(x: number, z: number): void;
    createBench(x: number, z: number, rotation: number): void;
    createBush(x: number, z: number, scale: number): void;
    createFlowerPatch(x: number, z: number, scale: number): void;
    createRock(x: number, z: number, scale: number): void;
    createCloud(x: number, y: number, z: number, scale: number): void;
    createPigeon(x: number, z: number, onRooftop: boolean): void;
    createAmbientParticles(type: string, count: number, bounds: { x: number; y: number; z: number }): void;
    createFountain(x: number, z: number): void;
    createPond(x: number, z: number, radius: number): void;
    createDuck(x: number, z: number): void;
    createPlayground(x: number, z: number): void;
    createCarousel(x: number, z: number, scale: number): void;
    createHouse(x: number, z: number, width: number, depth: number, height: number, roofColor: number): void;
    createWindmill(x: number, z: number, scale: number): void;
    createRiver(x1: number, z1: number, x2: number, z2: number, width: number): void;
    createBridge(x: number, z: number, rotation: number, width: number): void;
    createFarm(x: number, z: number): void;
    createAnimal(x: number, z: number, type: string): void;
    createHaystack(x: number, z: number, scale: number): void;
    createWell(x: number, z: number): void;
    createSandPatches(): void;
    createWaterPlane(x: number, z: number, width: number, depth: number): void;
    createPalmTree(x: number, z: number, scale: number): void;
    createBeachUmbrella(x: number, z: number, rotation: number): void;
    createBeachChair(x: number, z: number, rotation: number): void;
    createSeashell(x: number, z: number): void;
    createSandcastle(x: number, z: number, scale: number): void;
    createSeagull(x: number, y: number, z: number, flying: boolean): void;
    createRockyTerrain(): void;
    createMountainPeak(x: number, z: number, scale: number): void;
    createCabin(x: number, z: number): void;
    createCampfire(x: number, z: number): void;
    createWaterfall(x: number, z: number): void;
    createSnowPatch(x: number, z: number): void;
    createEagle(x: number, y: number, z: number): void;
    createDeer(x: number, z: number): void;
}

export interface LocationConfig {
    name: string;
    groundColor: number;
    skyTopColor: number;
    skyBottomColor: number;
    generate: (world: WorldInterface) => void;
}

export const LOCATIONS: Record<string, LocationConfig> = {
    city: {
        name: 'City',
        groundColor: 0x6B7280,
        skyTopColor: 0x87ACBD,
        skyBottomColor: 0xD4E5ED,
        generate: (world: WorldInterface) => {
            world.createGround(0x6B7280, false);
            // Sky is now managed by WeatherSystem

            // City buildings - various heights and softer colors (pastel palette)
            const buildingColors = [0x9BA8AB, 0xA8B5B8, 0x8B9598, 0xB5C4C7, 0xC4CDD0, 0xBAAFA5, 0xA89F95];

            // Main street buildings - tall
            for (let i = -80; i <= 80; i += 22) {
                const height = 25 + Math.random() * 45;
                const width = 12 + Math.random() * 8;
                const depth = 12 + Math.random() * 8;
                const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
                world.createBuilding(i, -45, width, depth, height, color);
            }

            for (let i = -80; i <= 80; i += 22) {
                const height = 20 + Math.random() * 40;
                const width = 12 + Math.random() * 8;
                const depth = 12 + Math.random() * 8;
                const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
                world.createBuilding(i, 45, width, depth, height, color);
            }

            // Side street buildings
            for (let i = -80; i <= 80; i += 28) {
                const height = 30 + Math.random() * 35;
                const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
                world.createBuilding(-65, i, 14, 14, height, color);
                world.createBuilding(65, i, 14, 14, height, color);
            }

            // Street trees in planters
            for (let i = -70; i <= 70; i += 18) {
                world.createTree(i, -18, 0.8, 'oak');
                world.createTree(i, 18, 0.8, 'oak');
            }

            // Street lamps along the road
            for (let i = -80; i <= 80; i += 25) {
                world.createStreetLamp(i, -22);
                world.createStreetLamp(i, 22);
            }

            // Benches
            world.createBench(-35, 0, Math.PI / 2);
            world.createBench(35, 0, -Math.PI / 2);
            world.createBench(0, -12, 0);
            world.createBench(0, 12, Math.PI);

            // Some bushes near buildings
            for (let i = 0; i < 20; i++) {
                const x = (Math.random() - 0.5) * 120;
                const z = (Math.random() > 0.5 ? -30 : 30) + (Math.random() - 0.5) * 10;
                world.createBush(x, z, 0.8 + Math.random() * 0.5);
            }

            // Flower patches in plaza areas
            world.createFlowerPatch(-25, 0, 2);
            world.createFlowerPatch(25, 0, 2);

            // Rocks decorative
            world.createRock(-40, 5, 0.8);
            world.createRock(42, -8, 1);

            // Clouds
            for (let i = 0; i < 12; i++) {
                world.createCloud(
                    (Math.random() - 0.5) * 300,
                    60 + Math.random() * 40,
                    (Math.random() - 0.5) * 300,
                    0.8 + Math.random() * 0.5
                );
            }

            // === NEW: Pigeons on rooftops ===
            // Pigeons on various building rooftops
            const pigeonSpots = [
                { x: -60, z: -45, count: 4 },
                { x: 20, z: 45, count: 3 },
                { x: -30, z: 45, count: 5 },
                { x: 50, z: -45, count: 3 },
                { x: 0, z: -45, count: 4 }
            ];
            pigeonSpots.forEach(spot => {
                for (let i = 0; i < spot.count; i++) {
                    const offsetX = (Math.random() - 0.5) * 8;
                    const offsetZ = (Math.random() - 0.5) * 8;
                    world.createPigeon(spot.x + offsetX, spot.z + offsetZ, true);
                }
            });

            // Ground pigeons near benches
            world.createPigeon(-33, 3, false);
            world.createPigeon(-36, -2, false);
            world.createPigeon(34, 1, false);
            world.createPigeon(2, -10, false);

            // === NEW: Ambient particles - dust and occasional fireflies ===
            world.createAmbientParticles('dust', 40, { x: 120, y: 50, z: 120 });
            world.createAmbientParticles('fireflies', 15, { x: 100, y: 20, z: 100 });
        }
    },

    park: {
        name: 'Park',
        groundColor: 0x5A8F5A,
        skyTopColor: 0x87CEEB,
        skyBottomColor: 0xE0F6FF,
        generate: (world: WorldInterface) => {
            world.createGround(0x5A8F5A, true);
            // Sky is now managed by WeatherSystem

            // Central fountain
            world.createFountain(0, 0);

            // === NEW: Pond with ducks ===
            world.createPond(45, -35, 10);
            // Add ducks to pond
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 3 + Math.random() * 5;
                world.createDuck(45 + Math.cos(angle) * dist, -35 + Math.sin(angle) * dist);
            }

            // Trees in circular pattern around fountain - mixed types
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 5) {
                const radius = 28;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                world.createTree(x, z, 1.3, angle % 2 === 0 ? 'oak' : 'pine');
            }

            // Outer ring of larger trees
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const radius = 55;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                world.createTree(x, z, 1.6, 'pine');
            }

            // Scattered trees and bushes
            for (let i = 0; i < 40; i++) {
                const x = (Math.random() - 0.5) * 180;
                const z = (Math.random() - 0.5) * 180;
                const distFromCenter = Math.sqrt(x * x + z * z);
                // Avoid pond area
                const distFromPond = Math.sqrt(Math.pow(x - 45, 2) + Math.pow(z + 35, 2));
                if (distFromCenter > 18 && distFromCenter < 70 && distFromPond > 15) {
                    if (Math.random() > 0.5) {
                        world.createTree(x, z, 0.9 + Math.random() * 0.8, Math.random() > 0.5 ? 'oak' : 'pine');
                    } else {
                        world.createBush(x, z, 1 + Math.random() * 0.8);
                    }
                }
            }

            // Forest edge
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 80 + Math.random() * 30;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                world.createTree(x, z, 1.2 + Math.random() * 0.6, Math.random() > 0.3 ? 'pine' : 'oak');
            }

            // Benches around fountain - 8 directions
            const benchAngles = [0, Math.PI/4, Math.PI/2, Math.PI*3/4, Math.PI, Math.PI*5/4, Math.PI*3/2, Math.PI*7/4];
            benchAngles.forEach(angle => {
                const radius = 15;
                world.createBench(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    angle + Math.PI / 2
                );
            });

            // Bench near pond
            world.createBench(35, -22, Math.PI);

            // Flower patches scattered around (pastel colors)
            for (let i = 0; i < 15; i++) {
                const x = (Math.random() - 0.5) * 120;
                const z = (Math.random() - 0.5) * 120;
                const distFromCenter = Math.sqrt(x * x + z * z);
                const distFromPond = Math.sqrt(Math.pow(x - 45, 2) + Math.pow(z + 35, 2));
                if (distFromCenter > 20 && distFromPond > 12) {
                    world.createFlowerPatch(x, z, 2 + Math.random() * 2);
                }
            }

            // Decorative rocks
            for (let i = 0; i < 10; i++) {
                const x = (Math.random() - 0.5) * 140;
                const z = (Math.random() - 0.5) * 140;
                world.createRock(x, z, 0.6 + Math.random() * 1);
            }

            // Path lamps
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
                const radius = 40;
                world.createStreetLamp(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius
                );
            }

            // Fluffy clouds
            for (let i = 0; i < 18; i++) {
                world.createCloud(
                    (Math.random() - 0.5) * 300,
                    70 + Math.random() * 35,
                    (Math.random() - 0.5) * 300,
                    1 + Math.random() * 0.8
                );
            }

            // === NEW: Playground with swings and slide ===
            world.createPlayground(-45, 45);

            // === NEW: Carousel ===
            world.createCarousel(-50, -50, 0.9);

            // === NEW: Ambient particles - pollen, feathers, fireflies ===
            world.createAmbientParticles('pollen', 35, { x: 100, y: 25, z: 100 });
            world.createAmbientParticles('feathers', 20, { x: 120, y: 30, z: 120 });
            world.createAmbientParticles('fireflies', 25, { x: 80, y: 15, z: 80 });
        }
    },

    village: {
        name: 'Village',
        groundColor: 0x7A9F5C,
        skyTopColor: 0x87CEEB,
        skyBottomColor: 0xFFF8DC,
        generate: (world: WorldInterface) => {
            world.createGround(0x7A9F5C, true);
            // Sky is now managed by WeatherSystem

            const roofColors = [0xB22222, 0x8B4513, 0x654321, 0x2F4F4F, 0x556B2F, 0xCD853F, 0xCC8844];

            // === NEW: Windmill ===
            world.createWindmill(-70, -60, 1.2);

            // === NEW: River with bridge ===
            world.createRiver(-90, 20, 90, 30, 5);
            world.createBridge(0, 25, 0, 10);

            // Village houses in a scattered pattern (adjusted to avoid river)
            const housePositions = [
                { x: -45, z: -35 },
                { x: 45, z: -35 },
                { x: -35, z: 50 },
                { x: 35, z: 50 },
                { x: 0, z: -55 },
                { x: -65, z: -15 },
                { x: 65, z: -15 },
                { x: 0, z: 65 },
                { x: -55, z: 70 },
                { x: 55, z: -55 },
                { x: -30, z: -5 },
                { x: 30, z: -10 }
            ];

            housePositions.forEach(pos => {
                const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
                const width = 9 + Math.random() * 5;
                const depth = 7 + Math.random() * 4;
                const height = 5 + Math.random() * 3;
                world.createHouse(pos.x, pos.z, width, depth, height, roofColor);
            });

            // Garden trees near each house
            housePositions.forEach(pos => {
                // 1-3 trees per house
                const treeCount = 1 + Math.floor(Math.random() * 3);
                for (let i = 0; i < treeCount; i++) {
                    const offsetX = (Math.random() - 0.5) * 25;
                    const offsetZ = (Math.random() - 0.5) * 25;
                    if (Math.abs(offsetX) > 8 || Math.abs(offsetZ) > 8) {
                        world.createTree(
                            pos.x + offsetX,
                            pos.z + offsetZ,
                            1 + Math.random() * 0.5,
                            Math.random() > 0.5 ? 'oak' : 'pine'
                        );
                    }
                }
            });

            // Bushes and flowers around houses
            housePositions.forEach(pos => {
                for (let i = 0; i < 3; i++) {
                    const offsetX = (Math.random() - 0.5) * 20;
                    const offsetZ = (Math.random() - 0.5) * 20;
                    if (Math.abs(offsetX) > 6 || Math.abs(offsetZ) > 6) {
                        if (Math.random() > 0.5) {
                            world.createBush(pos.x + offsetX, pos.z + offsetZ, 0.8 + Math.random() * 0.5);
                        } else {
                            world.createFlowerPatch(pos.x + offsetX, pos.z + offsetZ, 1.5 + Math.random());
                        }
                    }
                }
            });

            // Forest surrounding the village
            for (let i = 0; i < 60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 85 + Math.random() * 35;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                world.createTree(x, z, 1.2 + Math.random() * 0.8, Math.random() > 0.4 ? 'pine' : 'oak');
            }

            // Village center with benches
            world.createBench(0, 0, 0);
            world.createBench(8, 8, Math.PI / 4);
            world.createBench(-8, 8, -Math.PI / 4);

            // Central flower garden
            world.createFlowerPatch(0, 12, 4);
            world.createFlowerPatch(0, -12, 4);

            // Decorative rocks along paths
            for (let i = 0; i < 15; i++) {
                const x = (Math.random() - 0.5) * 100;
                const z = (Math.random() - 0.5) * 100;
                // Avoid river area
                if (Math.abs(z - 25) > 8) {
                    world.createRock(x, z, 0.5 + Math.random() * 0.8);
                }
            }

            // A few street lamps near the center
            world.createStreetLamp(-15, 0);
            world.createStreetLamp(15, 0);
            world.createStreetLamp(0, -15);
            world.createStreetLamp(0, 40);

            // Peaceful clouds
            for (let i = 0; i < 15; i++) {
                world.createCloud(
                    (Math.random() - 0.5) * 300,
                    65 + Math.random() * 40,
                    (Math.random() - 0.5) * 300,
                    0.9 + Math.random() * 0.7
                );
            }

            // === NEW: Farm with animals ===
            world.createFarm(70, 55);

            // Animals in the farm area
            // Chickens
            for (let i = 0; i < 6; i++) {
                world.createAnimal(
                    70 + (Math.random() - 0.5) * 20,
                    55 + 5 + Math.random() * 8,
                    'chicken'
                );
            }

            // Cows
            world.createAnimal(75, 60, 'cow');
            world.createAnimal(65, 62, 'cow');

            // Sheep
            world.createAnimal(72, 65, 'sheep');
            world.createAnimal(68, 58, 'sheep');
            world.createAnimal(77, 63, 'sheep');

            // Haystacks near farm
            world.createHaystack(80, 48, 1.2);
            world.createHaystack(58, 52, 0.9);

            // Well in village center
            world.createWell(12, 12);

            // === NEW: Ambient particles - dust, feathers, fireflies ===
            world.createAmbientParticles('dust', 30, { x: 100, y: 30, z: 100 });
            world.createAmbientParticles('feathers', 15, { x: 120, y: 35, z: 120 });
            world.createAmbientParticles('fireflies', 20, { x: 90, y: 15, z: 90 });
        }
    },

    beach: {
        name: 'Beach',
        groundColor: 0xF5DEB3,
        skyTopColor: 0x87CEEB,
        skyBottomColor: 0xFFE4B5,
        generate: (world: WorldInterface) => {
            world.createGround(0xF5DEB3, false);
            world.createSandPatches();

            // Ocean water on one side
            world.createWaterPlane(-100, 0, 180, 180);

            // Palm trees along beach
            for (let i = -55; i <= 55; i += 14) {
                world.createPalmTree(i, 18 + Math.random() * 8, 0.9 + Math.random() * 0.3);
            }

            // More palms scattered
            for (let i = 0; i < 15; i++) {
                const x = (Math.random() - 0.5) * 100;
                const z = 30 + Math.random() * 50;
                world.createPalmTree(x, z, 0.8 + Math.random() * 0.4);
            }

            // Beach umbrellas
            const umbrellaPositions = [
                {x: -35, z: 5}, {x: -15, z: 8}, {x: 10, z: 4},
                {x: 30, z: 9}, {x: 50, z: 6}, {x: -50, z: 7}
            ];
            umbrellaPositions.forEach(pos => {
                world.createBeachUmbrella(pos.x, pos.z, Math.random() * Math.PI);
            });

            // Beach chairs
            for (let i = 0; i < 10; i++) {
                world.createBeachChair(
                    (Math.random() - 0.5) * 90,
                    4 + Math.random() * 15,
                    Math.random() * Math.PI
                );
            }

            // Seashells scattered on sand
            for (let i = 0; i < 35; i++) {
                world.createSeashell(
                    (Math.random() - 0.5) * 110,
                    Math.random() * 25 + 3
                );
            }

            // === NEW: Sandcastles ===
            world.createSandcastle(-20, 12, 1);
            world.createSandcastle(25, 8, 0.8);
            world.createSandcastle(45, 15, 0.6);

            // Rocks near water edge
            for (let i = 0; i < 12; i++) {
                world.createRock(
                    (Math.random() - 0.5) * 130,
                    -8 + Math.random() * 12,
                    0.7 + Math.random() * 1.2
                );
            }

            // Bushes at the back
            for (let i = 0; i < 20; i++) {
                world.createBush(
                    (Math.random() - 0.5) * 150,
                    60 + Math.random() * 30,
                    0.9 + Math.random() * 0.6
                );
            }

            // Fluffy beach clouds
            for (let i = 0; i < 14; i++) {
                world.createCloud(
                    (Math.random() - 0.5) * 300,
                    55 + Math.random() * 45,
                    (Math.random() - 0.5) * 300,
                    0.8 + Math.random() * 0.6
                );
            }

            // === NEW: Seagulls - flying and standing ===
            // Flying seagulls over water
            for (let i = 0; i < 6; i++) {
                world.createSeagull(
                    -60 + Math.random() * 40,
                    15 + Math.random() * 20,
                    (Math.random() - 0.5) * 60,
                    true
                );
            }
            // Standing seagulls on rocks/beach
            world.createSeagull(-45, 0.5, -5, false);
            world.createSeagull(30, 0.5, 2, false);
            world.createSeagull(-10, 0.5, -8, false);

            // === NEW: Ambient particles - spray and feathers ===
            world.createAmbientParticles('spray', 40, { x: 80, y: 10, z: 40 });
            world.createAmbientParticles('feathers', 15, { x: 100, y: 25, z: 100 });
        }
    },

    mountain: {
        name: 'Mountain',
        groundColor: 0x4A5D23,
        skyTopColor: 0x4169E1,
        skyBottomColor: 0x87CEEB,
        generate: (world: WorldInterface) => {
            world.createGround(0x4A5D23, true);
            world.createRockyTerrain();

            // Mountain peaks in background
            world.createMountainPeak(-75, -75, 2.2);
            world.createMountainPeak(85, -65, 1.8);
            world.createMountainPeak(-55, 85, 1.6);
            world.createMountainPeak(70, 75, 1.4);
            world.createMountainPeak(0, -90, 2.5);

            // Dense pine forest
            for (let i = 0; i < 55; i++) {
                const x = (Math.random() - 0.5) * 140;
                const z = (Math.random() - 0.5) * 140;
                const distFromCenter = Math.sqrt(x * x + z * z);
                if (distFromCenter > 18 && distFromCenter < 65) {
                    world.createTree(x, z, 1 + Math.random() * 0.7, 'pine');
                }
            }

            // Forest edge
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 70 + Math.random() * 25;
                world.createTree(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    1.1 + Math.random() * 0.6,
                    'pine'
                );
            }

            // Cabin
            world.createCabin(0, 25);

            // === NEW: Campfire near cabin ===
            world.createCampfire(8, 38);

            // Waterfall
            world.createWaterfall(-35, -25);

            // Large rocks/boulders
            for (let i = 0; i < 22; i++) {
                world.createRock(
                    (Math.random() - 0.5) * 130,
                    (Math.random() - 0.5) * 130,
                    1 + Math.random() * 1.8
                );
            }

            // Snow patches
            for (let i = 0; i < 18; i++) {
                world.createSnowPatch(
                    (Math.random() - 0.5) * 160,
                    (Math.random() - 0.5) * 160
                );
            }

            // Benches near cabin
            world.createBench(-8, 35, Math.PI / 4);
            world.createBench(8, 45, -Math.PI / 4);

            // A few lamps
            world.createStreetLamp(-12, 20);
            world.createStreetLamp(12, 20);

            // Mountain clouds - lower altitude
            for (let i = 0; i < 10; i++) {
                world.createCloud(
                    (Math.random() - 0.5) * 280,
                    45 + Math.random() * 30,
                    (Math.random() - 0.5) * 280,
                    0.65 + Math.random() * 0.5
                );
            }

            // === NEW: Eagles soaring high ===
            world.createEagle(-30, 55, -40);
            world.createEagle(40, 60, 30);
            world.createEagle(0, 70, -60);

            // === NEW: Deer in the forest ===
            world.createDeer(-25, 45);
            world.createDeer(35, -40);
            world.createDeer(-50, -20);

            // === NEW: Ambient particles - snowflakes and leaves ===
            world.createAmbientParticles('snowflakes', 50, { x: 150, y: 60, z: 150 });
            world.createAmbientParticles('leaves', 20, { x: 100, y: 25, z: 100 });
        }
    }
};

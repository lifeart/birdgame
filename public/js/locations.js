// Location configurations with rich details
const LOCATIONS = {
    city: {
        name: 'City',
        groundColor: 0x555555,
        skyTopColor: 0x6B8BA4,
        skyBottomColor: 0xB8C9D4,
        generate: (world) => {
            world.createGround(0x555555, false);
            // Sky is now managed by WeatherSystem

            // City buildings - various heights and colors
            const buildingColors = [0x8B8B8B, 0x9B9B9B, 0x7B7B7B, 0x6B6B6B, 0xABABAB, 0xA08B7B, 0x8B7B6B];

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
        }
    },

    park: {
        name: 'Park',
        groundColor: 0x3d5c3d,
        skyTopColor: 0x87CEEB,
        skyBottomColor: 0xE0F6FF,
        generate: (world) => {
            world.createGround(0x3d5c3d, true);
            // Sky is now managed by WeatherSystem

            // Central fountain
            world.createFountain(0, 0);

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
                if (distFromCenter > 18 && distFromCenter < 70) {
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

            // Flower patches scattered around
            for (let i = 0; i < 15; i++) {
                const x = (Math.random() - 0.5) * 120;
                const z = (Math.random() - 0.5) * 120;
                const distFromCenter = Math.sqrt(x * x + z * z);
                if (distFromCenter > 20) {
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
        }
    },

    village: {
        name: 'Village',
        groundColor: 0x5c7a3d,
        skyTopColor: 0x87CEEB,
        skyBottomColor: 0xFFF8DC,
        generate: (world) => {
            world.createGround(0x5c7a3d, true);
            // Sky is now managed by WeatherSystem

            const roofColors = [0xB22222, 0x8B4513, 0x654321, 0x2F4F4F, 0x556B2F, 0xCD853F];

            // Village houses in a scattered pattern
            const housePositions = [
                { x: -45, z: -35 },
                { x: 45, z: -35 },
                { x: -35, z: 35 },
                { x: 35, z: 35 },
                { x: 0, z: -55 },
                { x: -65, z: 0 },
                { x: 65, z: 0 },
                { x: 0, z: 65 },
                { x: -55, z: 55 },
                { x: 55, z: -55 },
                { x: -30, z: -5 },
                { x: 30, z: 5 }
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
                world.createRock(x, z, 0.5 + Math.random() * 0.8);
            }

            // A few street lamps near the center
            world.createStreetLamp(-15, 0);
            world.createStreetLamp(15, 0);
            world.createStreetLamp(0, -15);
            world.createStreetLamp(0, 15);

            // Peaceful clouds
            for (let i = 0; i < 15; i++) {
                world.createCloud(
                    (Math.random() - 0.5) * 300,
                    65 + Math.random() * 40,
                    (Math.random() - 0.5) * 300,
                    0.9 + Math.random() * 0.7
                );
            }
        }
    }
};

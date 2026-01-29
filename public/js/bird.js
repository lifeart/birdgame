// Bird types and their characteristics - more realistic colors and details
// Initial speeds are 3x lower, increases with worms eaten
const BIRD_TYPES = {
    sparrow: {
        name: 'Sparrow',
        baseMaxSpeed: 0.4,      // Was 1.2, now 3x lower
        maxSpeed: 1.2,          // Max achievable speed
        baseAcceleration: 0.027, // Was 0.08, now 3x lower
        maxAcceleration: 0.08,
        turnSpeed: 0.06,
        size: 1.8,
        liftPower: 0.15,
        glideEfficiency: 0.4,
        bodyColor: 0x8B6914,
        headColor: 0x654321,
        bellyColor: 0xD2B48C,
        breastColor: 0xC4A574,
        wingColor: 0x5C4033,
        wingPatternColor: 0xF5DEB3,
        wingCovertsColor: 0x6B4423,
        tailColor: 0x3D2914,
        beakColor: 0x2F2F2F,
        eyeColor: 0x1a1a1a,
        irisColor: 0x3D2914,
        legColor: 0xCD853F,
        mantleColor: 0x7B5B3A
    },
    pigeon: {
        name: 'Pigeon',
        baseMaxSpeed: 0.33,
        maxSpeed: 1.0,
        baseAcceleration: 0.02,
        maxAcceleration: 0.06,
        turnSpeed: 0.05,
        size: 2.4,
        liftPower: 0.12,
        glideEfficiency: 0.5,
        bodyColor: 0x696969,
        headColor: 0x4A6741,
        bellyColor: 0x808080,
        breastColor: 0x9370DB,
        wingColor: 0x505050,
        wingPatternColor: 0x2F2F2F,
        wingCovertsColor: 0x606060,
        tailColor: 0x404040,
        beakColor: 0x2F2F2F,
        eyeColor: 0xFF4500,
        irisColor: 0xFF6347,
        legColor: 0xDC143C,
        mantleColor: 0x556B2F,
        neckIridescent: true
    },
    crow: {
        name: 'Crow',
        baseMaxSpeed: 0.3,
        maxSpeed: 0.9,
        baseAcceleration: 0.017,
        maxAcceleration: 0.05,
        turnSpeed: 0.04,
        size: 3.0,
        liftPower: 0.1,
        glideEfficiency: 0.6,
        bodyColor: 0x0a0a0a,
        headColor: 0x151515,
        bellyColor: 0x1a1a1a,
        breastColor: 0x101010,
        wingColor: 0x050505,
        wingPatternColor: 0x202020,
        wingCovertsColor: 0x181818,
        tailColor: 0x0a0a0a,
        beakColor: 0x1a1a1a,
        eyeColor: 0x2F2F2F,
        irisColor: 0x1a1a1a,
        legColor: 0x1a1a1a,
        mantleColor: 0x0f0f0f
    },
    hummingbird: {
        name: 'Hummingbird',
        baseMaxSpeed: 0.6,
        maxSpeed: 1.8,
        baseAcceleration: 0.05,
        maxAcceleration: 0.15,
        turnSpeed: 0.1,
        size: 1.2,
        liftPower: 0.25,
        glideEfficiency: 0.2,
        bodyColor: 0x228B22,
        headColor: 0x006400,
        bellyColor: 0xF0F0F0,
        breastColor: 0xE8E8E8,
        wingColor: 0x87CEEB,
        wingPatternColor: 0x00CED1,
        wingCovertsColor: 0x32CD32,
        tailColor: 0x2E8B57,
        beakColor: 0x1a1a1a,
        eyeColor: 0x1a1a1a,
        irisColor: 0x2F2F2F,
        legColor: 0x2F4F4F,
        mantleColor: 0x3CB371,
        throatColor: 0xFF1493,
        iridescent: true
    },
    penguin: {
        name: 'Penguin',
        baseMaxSpeed: 0.25,       // Slow walker
        maxSpeed: 0.5,            // Can't go very fast
        baseAcceleration: 0.015,
        maxAcceleration: 0.03,
        turnSpeed: 0.08,          // Turns well (waddles)
        size: 2.8,                // Chonky boy
        liftPower: 0.0,           // Cannot fly!
        glideEfficiency: 0.0,     // No gliding
        jumpPower: 0.12,          // Can hop instead
        canFly: false,            // Special flag
        bodyColor: 0x1a1a1a,      // Black back
        headColor: 0x0a0a0a,      // Black head
        bellyColor: 0xFFFFF0,     // White belly
        breastColor: 0xFFFAFA,    // White breast
        wingColor: 0x1a1a1a,      // Black flippers
        wingPatternColor: 0x2a2a2a,
        wingCovertsColor: 0x151515,
        tailColor: 0x1a1a1a,
        beakColor: 0xFF6B00,      // Orange beak
        eyeColor: 0x1a1a1a,
        irisColor: 0x3D2914,
        legColor: 0xFF6B00,       // Orange feet
        mantleColor: 0x0a0a0a,
        cheekColor: 0xFFD700      // Yellow cheek patches (emperor penguin style)
    }
};

// Physics constants
const GRAVITY = 0.004;  // Reduced by 3x for floatier flight
const AIR_RESISTANCE = 0.985;
const ROTATION_DAMPING = 0.92;

class Bird {
    constructor(scene, type = 'sparrow', isPlayer = true) {
        this.scene = scene;
        this.type = type;
        this.config = BIRD_TYPES[type] || BIRD_TYPES.sparrow;
        this.isPlayer = isPlayer;

        // Physics state
        this.velocity = new THREE.Vector3();
        this.position = new THREE.Vector3(0, 10, 0);
        this.rotation = 0;
        this.rotationVelocity = 0;

        // Visual rotation (smoothed)
        this.visualRotation = 0;
        this.visualTiltX = 0;
        this.visualTiltZ = 0;

        // Flight state
        this.isFlapping = false;
        this.isGliding = false;
        this.horizontalSpeed = 0;

        // Penguin state
        this.isOnGround = false;
        this.isJumping = false;
        this.isWaddling = false;
        this.waddleAngle = 0;

        // Speed progression (based on worms eaten)
        this.wormCount = 0;
        this.currentMaxSpeed = this.config.baseMaxSpeed;
        this.currentAcceleration = this.config.baseAcceleration;

        // Animation
        this.wingAngle = 0;
        this.baseWingSpeed = type === 'hummingbird' ? 1.5 : 0.25;
        this.currentWingSpeed = this.baseWingSpeed;
        this.tailAngle = 0;
        this.breathAngle = 0;

        // Head position (will be set by species-specific methods)
        this.headBaseY = 0;
        this.headBaseZ = 0;

        this.createModel();
    }

    // Update speed based on worms eaten
    setWormCount(count) {
        this.wormCount = count;
        // Speed increases logarithmically with worms, caps at max
        // At 0 worms: base speed (1/3 of max)
        // At ~20 worms: reaches max speed
        const progress = Math.min(1, Math.log(1 + count * 0.15) / Math.log(4));

        const cfg = this.config;
        this.currentMaxSpeed = cfg.baseMaxSpeed + (cfg.maxSpeed - cfg.baseMaxSpeed) * progress;
        this.currentAcceleration = cfg.baseAcceleration + (cfg.maxAcceleration - cfg.baseAcceleration) * progress;
    }

    createModel() {
        this.group = new THREE.Group();
        const s = this.config.size;
        const cfg = this.config;

        // Penguin has a special upright body
        if (this.type === 'penguin') {
            this.createPenguinBody(s, cfg);
            this.createSpeciesHead(s, cfg);
            this.createPenguinFlippers(s, cfg);
            this.createPenguinTail(s, cfg);
            this.createPenguinFeet(s, cfg);
            this.group.position.copy(this.position);
            this.scene.add(this.group);
            return;
        }

        // === MAIN BODY - High poly ellipsoid ===
        const bodyGeom = new THREE.SphereGeometry(s * 0.42, 32, 24);
        bodyGeom.scale(1, 0.85, 1.5);
        const bodyMat = new THREE.MeshPhongMaterial({
            color: cfg.bodyColor,
            shininess: 35,
            flatShading: false
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.castShadow = true;
        this.group.add(this.body);

        // === BREAST - Curved front ===
        const breastGeom = new THREE.SphereGeometry(s * 0.36, 28, 20);
        breastGeom.scale(0.9, 0.75, 1.1);
        const breastMat = new THREE.MeshPhongMaterial({
            color: cfg.breastColor,
            shininess: 25
        });
        this.breast = new THREE.Mesh(breastGeom, breastMat);
        this.breast.position.set(0, -s * 0.05, s * 0.25);
        this.group.add(this.breast);

        // === BELLY - Smooth underside ===
        const bellyGeom = new THREE.SphereGeometry(s * 0.34, 28, 20);
        bellyGeom.scale(0.85, 0.55, 1.3);
        const bellyMat = new THREE.MeshPhongMaterial({
            color: cfg.bellyColor,
            shininess: 20
        });
        this.belly = new THREE.Mesh(bellyGeom, bellyMat);
        this.belly.position.set(0, -s * 0.15, s * 0.05);
        this.group.add(this.belly);

        // === MANTLE - Back feathers ===
        const mantleGeom = new THREE.SphereGeometry(s * 0.38, 24, 18);
        mantleGeom.scale(0.95, 0.6, 1.2);
        const mantleMat = new THREE.MeshPhongMaterial({
            color: cfg.mantleColor,
            shininess: 30
        });
        const mantle = new THREE.Mesh(mantleGeom, mantleMat);
        mantle.position.set(0, s * 0.12, -s * 0.1);
        this.group.add(mantle);

        // === RUMP - Back end ===
        const rumpGeom = new THREE.SphereGeometry(s * 0.28, 20, 16);
        rumpGeom.scale(0.9, 0.7, 1);
        const rumpMat = new THREE.MeshPhongMaterial({
            color: cfg.bodyColor,
            shininess: 25
        });
        const rump = new THREE.Mesh(rumpGeom, rumpMat);
        rump.position.set(0, s * 0.02, -s * 0.45);
        this.group.add(rump);

        // === BODY FEATHER DETAILS ===
        this.createBodyFeathers(s, cfg);

        // === HEAD - Species-specific anatomy ===
        this.createSpeciesHead(s, cfg);

        // === WINGS - Detailed with feathers ===
        this.createWings(s, cfg);

        // === TAIL - Fan of feathers ===
        this.createTail(s, cfg);

        // === LEGS - Detailed with scales ===
        this.createLegs(s, cfg);

        // === SPECIAL FEATURES ===
        if (this.type === 'crow') {
            this.createCrowCrest(s, cfg);
        }

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    // ============================================
    // PENGUIN BODY - Upright, egg-shaped
    // ============================================
    createPenguinBody(s, cfg) {
        // Main body - smooth egg/oval shape, upright like a bowling pin
        const bodyGeom = new THREE.SphereGeometry(s * 0.4, 32, 24);
        bodyGeom.scale(1, 1.4, 0.85); // Tall oval, slightly flat front-to-back
        const bodyMat = new THREE.MeshPhongMaterial({
            color: cfg.bodyColor,
            shininess: 45,
            flatShading: false
        });
        this.body = new THREE.Mesh(bodyGeom, bodyMat);
        this.body.position.y = 0; // Centered
        this.body.castShadow = true;
        this.group.add(this.body);

        // White belly - covers front half of body
        const bellyGeom = new THREE.SphereGeometry(s * 0.38, 28, 20);
        bellyGeom.scale(0.9, 1.35, 0.5);
        const bellyMat = new THREE.MeshPhongMaterial({
            color: cfg.bellyColor,
            shininess: 35
        });
        this.belly = new THREE.Mesh(bellyGeom, bellyMat);
        this.belly.position.set(0, 0, s * 0.18);
        this.group.add(this.belly);

        // Upper chest - smooth transition to head
        const chestGeom = new THREE.SphereGeometry(s * 0.32, 24, 18);
        chestGeom.scale(0.85, 0.6, 0.7);
        const chestMat = new THREE.MeshPhongMaterial({
            color: cfg.breastColor,
            shininess: 30
        });
        this.breast = new THREE.Mesh(chestGeom, chestMat);
        this.breast.position.set(0, s * 0.45, s * 0.12);
        this.group.add(this.breast);
    }

    createPenguinFlippers(s, cfg) {
        // Flippers - flat paddle shapes attached to sides of body
        this.leftWingGroup = new THREE.Group();
        this.rightWingGroup = new THREE.Group();

        const flipperMat = new THREE.MeshPhongMaterial({
            color: cfg.wingColor,
            shininess: 50,
            side: THREE.DoubleSide
        });

        // Flipper shape - elongated paddle
        const flipperGeom = new THREE.BoxGeometry(s * 0.08, s * 0.4, s * 0.03);

        // Left flipper
        const leftFlipper = new THREE.Mesh(flipperGeom, flipperMat);
        leftFlipper.castShadow = true;
        this.leftWingGroup.add(leftFlipper);

        // Flipper tip - rounded end
        const tipGeom = new THREE.SphereGeometry(s * 0.04, 12, 8);
        tipGeom.scale(1, 0.4, 0.4);
        const leftTip = new THREE.Mesh(tipGeom, flipperMat);
        leftTip.position.set(0, -s * 0.2, 0);
        this.leftWingGroup.add(leftTip);

        // Right flipper
        const rightFlipper = new THREE.Mesh(flipperGeom, flipperMat);
        rightFlipper.castShadow = true;
        this.rightWingGroup.add(rightFlipper);

        const rightTip = new THREE.Mesh(tipGeom, flipperMat);
        rightTip.position.set(0, -s * 0.2, 0);
        this.rightWingGroup.add(rightTip);

        // Position flipper groups at body sides
        this.leftWingGroup.position.set(s * 0.38, s * 0.1, 0);
        this.rightWingGroup.position.set(-s * 0.38, s * 0.1, 0);

        // Angle flippers down and slightly back
        this.leftWingGroup.rotation.z = -0.4;
        this.rightWingGroup.rotation.z = 0.4;

        this.group.add(this.leftWingGroup);
        this.group.add(this.rightWingGroup);
    }

    createPenguinTail(s, cfg) {
        // Penguin tail - small triangular tail
        this.tailGroup = new THREE.Group();

        const tailMat = new THREE.MeshPhongMaterial({
            color: cfg.tailColor,
            shininess: 35
        });

        // Simple wedge-shaped tail
        const tailGeom = new THREE.ConeGeometry(s * 0.1, s * 0.15, 4);
        tailGeom.rotateX(-Math.PI / 2);
        const tail = new THREE.Mesh(tailGeom, tailMat);
        this.tailGroup.add(tail);

        this.tailGroup.position.set(0, -s * 0.4, -s * 0.22);
        this.tailGroup.rotation.x = 0.3;
        this.group.add(this.tailGroup);
    }

    createPenguinFeet(s, cfg) {
        // Big orange webbed feet
        this.leftLegGroup = new THREE.Group();
        this.rightLegGroup = new THREE.Group();

        const footMat = new THREE.MeshPhongMaterial({
            color: cfg.legColor,
            shininess: 50
        });

        const createFoot = () => {
            const footGroup = new THREE.Group();

            // Main foot pad - flat and wide
            const padGeom = new THREE.BoxGeometry(s * 0.18, s * 0.025, s * 0.22);
            const pad = new THREE.Mesh(padGeom, footMat);
            pad.position.y = s * 0.012;
            footGroup.add(pad);

            // Webbed toes (3)
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

            // Short stubby leg
            const legGeom = new THREE.CylinderGeometry(s * 0.035, s * 0.045, s * 0.12, 10);
            const leg = new THREE.Mesh(legGeom, footMat);
            leg.position.set(0, s * 0.08, -s * 0.03);
            footGroup.add(leg);

            return footGroup;
        };

        const leftFoot = createFoot();
        leftFoot.position.set(s * 0.12, -s * 0.52, s * 0.05);
        this.leftLegGroup.add(leftFoot);

        const rightFoot = createFoot();
        rightFoot.position.set(-s * 0.12, -s * 0.52, s * 0.05);
        this.rightLegGroup.add(rightFoot);

        this.group.add(this.leftLegGroup);
        this.group.add(this.rightLegGroup);
    }

    createBodyFeathers(s, cfg) {
        // Subtle feather texture using small overlapping scales
        const featherRows = 6;
        const feathersPerRow = 12;

        for (let row = 0; row < featherRows; row++) {
            const rowAngle = (row / featherRows) * Math.PI * 0.6 - Math.PI * 0.3;
            const rowRadius = s * 0.38 + Math.sin(rowAngle) * s * 0.05;
            const y = Math.sin(rowAngle) * s * 0.25;

            for (let i = 0; i < feathersPerRow; i++) {
                const angle = (i / feathersPerRow) * Math.PI * 2;
                const featherGeom = new THREE.SphereGeometry(s * 0.06, 8, 6);
                featherGeom.scale(0.5, 0.3, 1);

                const featherMat = new THREE.MeshPhongMaterial({
                    color: row % 2 === 0 ? cfg.bodyColor : cfg.mantleColor,
                    shininess: 20
                });

                const feather = new THREE.Mesh(featherGeom, featherMat);
                feather.position.set(
                    Math.sin(angle) * rowRadius,
                    y,
                    Math.cos(angle) * rowRadius * 0.7 - s * 0.1
                );
                feather.rotation.y = angle;
                feather.rotation.x = rowAngle * 0.5;
                this.group.add(feather);
            }
        }
    }

    createSpeciesHead(s, cfg) {
        // Create species-specific head based on bird type
        switch (this.type) {
            case 'sparrow':
                this.createSparrowHead(s, cfg);
                break;
            case 'pigeon':
                this.createPigeonHead(s, cfg);
                break;
            case 'crow':
                this.createCrowHead(s, cfg);
                break;
            case 'hummingbird':
                this.createHummingbirdHead(s, cfg);
                break;
            case 'penguin':
                this.createPenguinHead(s, cfg);
                break;
            default:
                this.createSparrowHead(s, cfg);
        }
    }

    // ============================================
    // SPARROW HEAD - Small, round, large eyes, short conical beak
    // ============================================
    createSparrowHead(s, cfg) {
        const headMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 45 });

        // Store head base position for animation
        this.headBaseY = s * 0.2;
        this.headBaseZ = s * 0.52;

        // Main head - round and compact
        const headGeom = new THREE.SphereGeometry(s * 0.28, 32, 24);
        headGeom.scale(1, 1, 1); // Round shape
        this.head = new THREE.Mesh(headGeom, headMat);
        this.head.position.set(0, this.headBaseY, this.headBaseZ);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Rounded crown
        const crownGeom = new THREE.SphereGeometry(s * 0.2, 24, 16);
        crownGeom.scale(1, 0.7, 1);
        const crown = new THREE.Mesh(crownGeom, headMat);
        crown.position.set(0, s * 0.38, s * 0.48);
        this.group.add(crown);

        // Forehead - slightly pronounced
        const foreheadGeom = new THREE.SphereGeometry(s * 0.15, 16, 12);
        foreheadGeom.scale(1, 0.8, 0.9);
        const forehead = new THREE.Mesh(foreheadGeom, headMat);
        forehead.position.set(0, s * 0.32, s * 0.62);
        this.group.add(forehead);

        // Puffy cheeks - sparrows have rounded cheeks
        const cheekGeom = new THREE.SphereGeometry(s * 0.12, 16, 12);
        const cheekMat = new THREE.MeshPhongMaterial({ color: cfg.bellyColor, shininess: 25 });

        const leftCheek = new THREE.Mesh(cheekGeom, cheekMat);
        leftCheek.position.set(s * 0.16, s * 0.12, s * 0.6);
        leftCheek.scale.set(1, 0.95, 0.85);
        this.group.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeom, cheekMat);
        rightCheek.position.set(-s * 0.16, s * 0.12, s * 0.6);
        rightCheek.scale.set(1, 0.95, 0.85);
        this.group.add(rightCheek);

        // Ear coverts (behind eye area) - darker stripe pattern
        const earCovertGeom = new THREE.SphereGeometry(s * 0.1, 12, 10);
        const earCovertMat = new THREE.MeshPhongMaterial({ color: 0x4A3728, shininess: 20 });

        const leftEar = new THREE.Mesh(earCovertGeom, earCovertMat);
        leftEar.position.set(s * 0.2, s * 0.22, s * 0.48);
        leftEar.scale.set(0.6, 0.8, 1);
        this.group.add(leftEar);

        const rightEar = new THREE.Mesh(earCovertGeom, earCovertMat);
        rightEar.position.set(-s * 0.2, s * 0.22, s * 0.48);
        rightEar.scale.set(0.6, 0.8, 1);
        this.group.add(rightEar);

        // Throat/chin - lighter colored
        const chinGeom = new THREE.SphereGeometry(s * 0.1, 12, 10);
        const chinMat = new THREE.MeshPhongMaterial({ color: cfg.bellyColor, shininess: 20 });
        const chin = new THREE.Mesh(chinGeom, chinMat);
        chin.position.set(0, s * 0.02, s * 0.62);
        chin.scale.set(0.9, 0.7, 0.8);
        this.group.add(chin);

        // Neck - short and thick
        this.createSparrowNeck(s, cfg);

        // Beak - short, conical, seed-crushing
        this.createSparrowBeak(s, cfg);

        // Eyes - relatively large and round
        this.createSparrowEyes(s, cfg);
    }

    createSparrowNeck(s, cfg) {
        const neckGeom = new THREE.CylinderGeometry(s * 0.16, s * 0.2, s * 0.2, 16, 4);
        const neckMat = new THREE.MeshPhongMaterial({ color: cfg.breastColor, shininess: 30 });
        const neck = new THREE.Mesh(neckGeom, neckMat);
        neck.position.set(0, s * 0.05, s * 0.38);
        neck.rotation.x = Math.PI * 0.3;
        this.group.add(neck);
    }

    createSparrowBeak(s, cfg) {
        const beakMat = new THREE.MeshPhongMaterial({ color: cfg.beakColor, shininess: 70 });

        // Upper beak - short, conical, strong for seeds
        const beakLength = s * 0.18;
        const upperGeom = new THREE.ConeGeometry(s * 0.065, beakLength, 10, 4);
        upperGeom.rotateX(Math.PI / 2);

        this.upperBeak = new THREE.Mesh(upperGeom, beakMat);
        this.upperBeak.position.set(0, s * 0.2, s * 0.7 + beakLength * 0.5);
        this.group.add(this.upperBeak);

        // Lower beak
        const lowerLen = s * 0.14;
        const lowerGeom = new THREE.ConeGeometry(s * 0.05, lowerLen, 8, 3);
        lowerGeom.rotateX(Math.PI / 2);
        this.lowerBeak = new THREE.Mesh(lowerGeom, beakMat);
        this.lowerBeak.position.set(0, s * 0.12, s * 0.68 + lowerLen * 0.5);
        this.group.add(this.lowerBeak);
    }

    createSparrowEyes(s, cfg) {
        // Eye socket
        const socketGeom = new THREE.SphereGeometry(s * 0.08, 16, 12);
        const socketMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 10 });

        [-1, 1].forEach(side => {
            const socket = new THREE.Mesh(socketGeom, socketMat);
            socket.position.set(side * s * 0.18, s * 0.26, s * 0.58);
            this.group.add(socket);
        });

        // Eyeball - relatively large
        const eyeGeom = new THREE.SphereGeometry(s * 0.065, 20, 16);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(side * s * 0.2, s * 0.27, s * 0.61);
            this.group.add(eye);
        });

        // Iris - dark brown
        const irisGeom = new THREE.SphereGeometry(s * 0.045, 16, 12);
        const irisMat = new THREE.MeshPhongMaterial({ color: cfg.irisColor, shininess: 80 });

        [-1, 1].forEach(side => {
            const iris = new THREE.Mesh(irisGeom, irisMat);
            iris.position.set(side * s * 0.215, s * 0.28, s * 0.64);
            this.group.add(iris);
        });

        // Pupil
        const pupilGeom = new THREE.SphereGeometry(s * 0.028, 12, 10);
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100 });

        [-1, 1].forEach(side => {
            const pupil = new THREE.Mesh(pupilGeom, pupilMat);
            pupil.position.set(side * s * 0.225, s * 0.29, s * 0.66);
            this.group.add(pupil);
        });

        // Highlights
        const hlGeom = new THREE.SphereGeometry(s * 0.015, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        [-1, 1].forEach(side => {
            const hl = new THREE.Mesh(hlGeom, hlMat);
            hl.position.set(side * s * 0.23, s * 0.31, s * 0.68);
            this.group.add(hl);
        });
    }

    // ============================================
    // PIGEON HEAD - Small relative to body, iridescent neck, cere
    // ============================================
    createPigeonHead(s, cfg) {
        const headMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 50 });

        // Store head base position for animation
        this.headBaseY = s * 0.22;
        this.headBaseZ = s * 0.55;

        // Main head - small and rounded, slightly flattened
        const headGeom = new THREE.SphereGeometry(s * 0.24, 32, 24);
        headGeom.scale(1, 0.9, 1.05);
        this.head = new THREE.Mesh(headGeom, headMat);
        this.head.position.set(0, this.headBaseY, this.headBaseZ);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Flat crown - pigeons have flat-topped heads
        const crownGeom = new THREE.SphereGeometry(s * 0.18, 24, 16);
        crownGeom.scale(1.1, 0.45, 1.1);
        const crown = new THREE.Mesh(crownGeom, headMat);
        crown.position.set(0, s * 0.38, s * 0.52);
        this.group.add(crown);

        // Back of head - slight bulge
        const occiputGeom = new THREE.SphereGeometry(s * 0.14, 16, 12);
        occiputGeom.scale(1, 0.8, 1);
        const occiput = new THREE.Mesh(occiputGeom, headMat);
        occiput.position.set(0, s * 0.28, s * 0.42);
        this.group.add(occiput);

        // Cheeks - subtle
        const cheekGeom = new THREE.SphereGeometry(s * 0.1, 14, 10);
        const cheekMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 30 });

        [-1, 1].forEach(side => {
            const cheek = new THREE.Mesh(cheekGeom, cheekMat);
            cheek.position.set(side * s * 0.14, s * 0.16, s * 0.6);
            cheek.scale.set(0.9, 0.85, 0.75);
            this.group.add(cheek);
        });

        // Neck - with iridescent feathers
        this.createPigeonNeck(s, cfg);

        // Beak - short with prominent cere
        this.createPigeonBeak(s, cfg);

        // Eyes - orange/red with eye ring
        this.createPigeonEyes(s, cfg);
    }

    createPigeonNeck(s, cfg) {
        // Neck base
        const neckGeom = new THREE.CylinderGeometry(s * 0.17, s * 0.22, s * 0.28, 16, 4);
        const neckMat = new THREE.MeshPhongMaterial({
            color: cfg.neckIridescent ? 0x4A6741 : cfg.breastColor,
            shininess: 60
        });
        const neck = new THREE.Mesh(neckGeom, neckMat);
        neck.position.set(0, s * 0.02, s * 0.4);
        neck.rotation.x = Math.PI * 0.32;
        this.group.add(neck);

        // Iridescent neck feathers - multiple rows
        if (cfg.neckIridescent) {
            const colors = [0x9932CC, 0x008B8B, 0x4B0082, 0x006400];
            for (let row = 0; row < 4; row++) {
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2;
                    const featherGeom = new THREE.SphereGeometry(s * 0.04, 8, 6);
                    featherGeom.scale(0.7, 0.5, 1);

                    const featherMat = new THREE.MeshPhongMaterial({
                        color: colors[row % colors.length],
                        shininess: 100,
                        emissive: colors[row % colors.length],
                        emissiveIntensity: 0.15
                    });

                    const feather = new THREE.Mesh(featherGeom, featherMat);
                    feather.position.set(
                        Math.sin(angle) * s * 0.16,
                        s * (0.08 - row * 0.04),
                        s * (0.42 - row * 0.02) + Math.cos(angle) * s * 0.04
                    );
                    feather.rotation.y = angle;
                    this.group.add(feather);
                }
            }
        }
    }

    createPigeonBeak(s, cfg) {
        const beakMat = new THREE.MeshPhongMaterial({ color: cfg.beakColor, shininess: 60 });

        // Cere - fleshy white/pink part at base of beak (distinctive for pigeons)
        const cereGeom = new THREE.SphereGeometry(s * 0.08, 14, 10);
        const cereMat = new THREE.MeshPhongMaterial({ color: 0xE8E8E8, shininess: 40 });
        const cere = new THREE.Mesh(cereGeom, cereMat);
        cere.position.set(0, s * 0.22, s * 0.72);
        cere.scale.set(1.3, 0.9, 0.9);
        this.group.add(cere);

        // Upper beak - short and slightly hooked
        const beakLength = s * 0.2;
        const upperGeom = new THREE.ConeGeometry(s * 0.055, beakLength, 10, 4);
        upperGeom.rotateX(Math.PI / 2);

        this.upperBeak = new THREE.Mesh(upperGeom, beakMat);
        this.upperBeak.position.set(0, s * 0.2, s * 0.72 + beakLength * 0.5);
        this.group.add(this.upperBeak);

        // Lower beak
        const lowerLen = s * 0.16;
        const lowerGeom = new THREE.ConeGeometry(s * 0.04, lowerLen, 8, 3);
        lowerGeom.rotateX(Math.PI / 2);
        this.lowerBeak = new THREE.Mesh(lowerGeom, beakMat);
        this.lowerBeak.position.set(0, s * 0.12, s * 0.7 + lowerLen * 0.5);
        this.group.add(this.lowerBeak);
    }

    createPigeonEyes(s, cfg) {
        // Eye ring - bare skin around eye (pale)
        const ringGeom = new THREE.TorusGeometry(s * 0.07, s * 0.015, 12, 24);
        const ringMat = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess: 30 });

        [-1, 1].forEach(side => {
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.set(side * s * 0.18, s * 0.28, s * 0.6);
            ring.rotation.y = side * Math.PI * 0.15;
            this.group.add(ring);
        });

        // Eyeball
        const eyeGeom = new THREE.SphereGeometry(s * 0.055, 20, 16);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(side * s * 0.19, s * 0.28, s * 0.62);
            this.group.add(eye);
        });

        // Iris - orange/red (distinctive for pigeons)
        const irisGeom = new THREE.SphereGeometry(s * 0.042, 16, 12);
        const irisMat = new THREE.MeshPhongMaterial({ color: cfg.irisColor, shininess: 90 });

        [-1, 1].forEach(side => {
            const iris = new THREE.Mesh(irisGeom, irisMat);
            iris.position.set(side * s * 0.2, s * 0.29, s * 0.65);
            this.group.add(iris);
        });

        // Pupil
        const pupilGeom = new THREE.SphereGeometry(s * 0.025, 12, 10);
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100 });

        [-1, 1].forEach(side => {
            const pupil = new THREE.Mesh(pupilGeom, pupilMat);
            pupil.position.set(side * s * 0.21, s * 0.3, s * 0.67);
            this.group.add(pupil);
        });

        // Highlights
        const hlGeom = new THREE.SphereGeometry(s * 0.012, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        [-1, 1].forEach(side => {
            const hl = new THREE.Mesh(hlGeom, hlMat);
            hl.position.set(side * s * 0.215, s * 0.32, s * 0.69);
            this.group.add(hl);
        });
    }

    // ============================================
    // CROW HEAD - Large, elongated, powerful beak, intelligent look
    // ============================================
    createCrowHead(s, cfg) {
        const headMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 40 });

        // Store head base position for animation
        this.headBaseY = s * 0.2;
        this.headBaseZ = s * 0.5;

        // Main head - elongated, larger relative to body
        const headGeom = new THREE.SphereGeometry(s * 0.3, 32, 24);
        headGeom.scale(1, 0.9, 1.25); // Elongated forward
        this.head = new THREE.Mesh(headGeom, headMat);
        this.head.position.set(0, this.headBaseY, this.headBaseZ);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Flat crown - crows have flat-topped heads
        const crownGeom = new THREE.SphereGeometry(s * 0.22, 24, 16);
        crownGeom.scale(1, 0.4, 1.15);
        const crown = new THREE.Mesh(crownGeom, headMat);
        crown.position.set(0, s * 0.38, s * 0.48);
        this.group.add(crown);

        // Forehead - slopes into beak
        const foreheadGeom = new THREE.SphereGeometry(s * 0.18, 16, 12);
        foreheadGeom.scale(1, 0.75, 1.1);
        const forehead = new THREE.Mesh(foreheadGeom, headMat);
        forehead.position.set(0, s * 0.3, s * 0.62);
        this.group.add(forehead);

        // Pronounced brow ridge
        const browGeom = new THREE.SphereGeometry(s * 0.12, 12, 10);
        browGeom.scale(1.2, 0.5, 0.8);

        [-1, 1].forEach(side => {
            const brow = new THREE.Mesh(browGeom, headMat);
            brow.position.set(side * s * 0.12, s * 0.32, s * 0.62);
            this.group.add(brow);
        });

        // Nasal bristles (feathers covering nostrils) - characteristic of crows
        this.createCrowNasalBristles(s, cfg);

        // Neck
        this.createCrowNeck(s, cfg);

        // Beak - large, powerful, slightly curved
        this.createCrowBeak(s, cfg);

        // Eyes - dark, intelligent
        this.createCrowEyes(s, cfg);
    }

    createCrowNasalBristles(s, cfg) {
        // Nasal bristles - forward-pointing feathers covering nostrils
        const bristleMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 30 });

        for (let i = 0; i < 8; i++) {
            const bristleGeom = new THREE.ConeGeometry(s * 0.015, s * 0.1, 6);
            bristleGeom.rotateX(Math.PI / 2.2); // Point forward

            const bristle = new THREE.Mesh(bristleGeom, bristleMat);
            bristle.position.set(
                (Math.random() - 0.5) * s * 0.08,
                s * 0.22 + Math.random() * s * 0.04,
                s * 0.66 + i * s * 0.015
            );
            bristle.rotation.z = (Math.random() - 0.5) * 0.3;
            this.group.add(bristle);
        }
    }

    createCrowNeck(s, cfg) {
        const neckGeom = new THREE.CylinderGeometry(s * 0.18, s * 0.24, s * 0.26, 16, 4);
        const neckMat = new THREE.MeshPhongMaterial({ color: cfg.bodyColor, shininess: 35 });
        const neck = new THREE.Mesh(neckGeom, neckMat);
        neck.position.set(0, s * 0.02, s * 0.35);
        neck.rotation.x = Math.PI * 0.35;
        this.group.add(neck);

        // Throat hackles (loose feathers)
        for (let i = 0; i < 6; i++) {
            const hackleGeom = new THREE.SphereGeometry(s * 0.05, 8, 6);
            hackleGeom.scale(0.5, 0.4, 1.2);
            const hackleMat = new THREE.MeshPhongMaterial({ color: cfg.bodyColor, shininess: 25 });
            const hackle = new THREE.Mesh(hackleGeom, hackleMat);
            hackle.position.set(
                (Math.random() - 0.5) * s * 0.15,
                s * 0.0 + i * s * 0.02,
                s * 0.38 + Math.random() * s * 0.05
            );
            this.group.add(hackle);
        }
    }

    createCrowBeak(s, cfg) {
        const beakMat = new THREE.MeshPhongMaterial({ color: cfg.beakColor, shininess: 50 });

        // Upper beak - large, powerful
        const beakLength = s * 0.35;
        const upperGeom = new THREE.ConeGeometry(s * 0.085, beakLength, 12, 5);
        upperGeom.rotateX(Math.PI / 2);

        this.upperBeak = new THREE.Mesh(upperGeom, beakMat);
        this.upperBeak.position.set(0, s * 0.2, s * 0.68 + beakLength * 0.5);
        this.group.add(this.upperBeak);

        // Lower beak - strong
        const lowerLen = s * 0.28;
        const lowerGeom = new THREE.ConeGeometry(s * 0.06, lowerLen, 10, 4);
        lowerGeom.rotateX(Math.PI / 2);
        this.lowerBeak = new THREE.Mesh(lowerGeom, beakMat);
        this.lowerBeak.position.set(0, s * 0.1, s * 0.66 + lowerLen * 0.5);
        this.group.add(this.lowerBeak);
    }

    createCrowEyes(s, cfg) {
        // Eye socket - deep set
        const socketGeom = new THREE.SphereGeometry(s * 0.085, 16, 12);
        const socketMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 10 });

        [-1, 1].forEach(side => {
            const socket = new THREE.Mesh(socketGeom, socketMat);
            socket.position.set(side * s * 0.18, s * 0.28, s * 0.55);
            this.group.add(socket);
        });

        // Eyeball - slightly smaller, dark
        const eyeGeom = new THREE.SphereGeometry(s * 0.055, 20, 16);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xF5F5F5, shininess: 100 });

        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(side * s * 0.19, s * 0.29, s * 0.58);
            this.group.add(eye);
        });

        // Iris - dark brown/black (crows have dark eyes)
        const irisGeom = new THREE.SphereGeometry(s * 0.045, 16, 12);
        const irisMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 70 });

        [-1, 1].forEach(side => {
            const iris = new THREE.Mesh(irisGeom, irisMat);
            iris.position.set(side * s * 0.2, s * 0.3, s * 0.61);
            this.group.add(iris);
        });

        // Pupil
        const pupilGeom = new THREE.SphereGeometry(s * 0.03, 12, 10);
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100 });

        [-1, 1].forEach(side => {
            const pupil = new THREE.Mesh(pupilGeom, pupilMat);
            pupil.position.set(side * s * 0.21, s * 0.31, s * 0.63);
            this.group.add(pupil);
        });

        // Subtle highlight
        const hlGeom = new THREE.SphereGeometry(s * 0.012, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        [-1, 1].forEach(side => {
            const hl = new THREE.Mesh(hlGeom, hlMat);
            hl.position.set(side * s * 0.215, s * 0.33, s * 0.65);
            this.group.add(hl);
        });
    }

    // ============================================
    // HUMMINGBIRD HEAD - Tiny, round, extremely long thin beak
    // ============================================
    createHummingbirdHead(s, cfg) {
        const headMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 60 });

        // Store head base position for animation
        this.headBaseY = s * 0.18;
        this.headBaseZ = s * 0.48;

        // Main head - tiny and round
        const headGeom = new THREE.SphereGeometry(s * 0.32, 32, 24);
        headGeom.scale(0.95, 1, 0.95);
        this.head = new THREE.Mesh(headGeom, headMat);
        this.head.position.set(0, this.headBaseY, this.headBaseZ);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Rounded crown
        const crownGeom = new THREE.SphereGeometry(s * 0.22, 24, 16);
        crownGeom.scale(1, 0.65, 1);
        const crown = new THREE.Mesh(crownGeom, headMat);
        crown.position.set(0, s * 0.4, s * 0.45);
        this.group.add(crown);

        // Forehead - meets beak smoothly
        const foreheadGeom = new THREE.SphereGeometry(s * 0.16, 16, 12);
        foreheadGeom.scale(0.9, 0.7, 1);
        const forehead = new THREE.Mesh(foreheadGeom, headMat);
        forehead.position.set(0, s * 0.28, s * 0.6);
        this.group.add(forehead);

        // Throat gorget (iridescent patch) - distinctive for hummingbirds
        this.createHummingbirdGorget(s, cfg);

        // Neck - very short
        this.createHummingbirdNeck(s, cfg);

        // Beak - extremely long and thin
        this.createHummingbirdBeak(s, cfg);

        // Eyes - very large relative to head
        this.createHummingbirdEyes(s, cfg);
    }

    createHummingbirdGorget(s, cfg) {
        if (!cfg.throatColor) return;

        // Gorget - iridescent throat patch
        const gorgetGeom = new THREE.SphereGeometry(s * 0.2, 24, 18);
        gorgetGeom.scale(1.1, 0.8, 0.6);
        const gorgetMat = new THREE.MeshPhongMaterial({
            color: cfg.throatColor,
            shininess: 150,
            emissive: cfg.throatColor,
            emissiveIntensity: 0.3,
            specular: 0xffffff
        });
        const gorget = new THREE.Mesh(gorgetGeom, gorgetMat);
        gorget.position.set(0, s * 0.0, s * 0.52);
        this.group.add(gorget);

        // Individual iridescent feather scales
        for (let row = 0; row < 5; row++) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI - Math.PI * 0.5;
                const scaleGeom = new THREE.CircleGeometry(s * 0.03, 10);
                const scaleMat = new THREE.MeshPhongMaterial({
                    color: cfg.throatColor,
                    shininess: 180,
                    emissive: cfg.throatColor,
                    emissiveIntensity: 0.25 + row * 0.05,
                    side: THREE.DoubleSide
                });
                const scale = new THREE.Mesh(scaleGeom, scaleMat);
                scale.position.set(
                    Math.sin(angle) * s * 0.15,
                    -s * 0.02 - row * s * 0.035,
                    s * 0.54 + Math.cos(angle) * s * 0.05
                );
                scale.rotation.y = angle;
                scale.rotation.x = 0.4;
                this.group.add(scale);
            }
        }
    }

    createHummingbirdNeck(s, cfg) {
        const neckGeom = new THREE.CylinderGeometry(s * 0.14, s * 0.18, s * 0.15, 14, 3);
        const neckMat = new THREE.MeshPhongMaterial({ color: cfg.breastColor, shininess: 35 });
        const neck = new THREE.Mesh(neckGeom, neckMat);
        neck.position.set(0, s * 0.02, s * 0.38);
        neck.rotation.x = Math.PI * 0.3;
        this.group.add(neck);
    }

    createHummingbirdBeak(s, cfg) {
        const beakMat = new THREE.MeshPhongMaterial({ color: cfg.beakColor, shininess: 80 });

        // Upper beak - extremely long and thin (needle-like)
        const beakLength = s * 0.8;
        const upperGeom = new THREE.ConeGeometry(s * 0.035, beakLength, 12, 6);
        upperGeom.rotateX(Math.PI / 2);

        this.upperBeak = new THREE.Mesh(upperGeom, beakMat);
        this.upperBeak.position.set(0, s * 0.22, s * 0.62 + beakLength * 0.5);
        this.group.add(this.upperBeak);

        // Lower beak - equally long
        const lowerLen = beakLength * 0.95;
        const lowerGeom = new THREE.ConeGeometry(s * 0.028, lowerLen, 10, 5);
        lowerGeom.rotateX(Math.PI / 2);
        this.lowerBeak = new THREE.Mesh(lowerGeom, beakMat);
        this.lowerBeak.position.set(0, s * 0.14, s * 0.6 + lowerLen * 0.5);
        this.group.add(this.lowerBeak);
    }

    createHummingbirdEyes(s, cfg) {
        // Large eyes relative to head size
        const socketGeom = new THREE.SphereGeometry(s * 0.095, 16, 12);
        const socketMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 15 });

        [-1, 1].forEach(side => {
            const socket = new THREE.Mesh(socketGeom, socketMat);
            socket.position.set(side * s * 0.2, s * 0.24, s * 0.52);
            this.group.add(socket);
        });

        // Large dark eyes
        const eyeGeom = new THREE.SphereGeometry(s * 0.075, 20, 16);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xF8F8F8, shininess: 100 });

        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(side * s * 0.22, s * 0.26, s * 0.55);
            this.group.add(eye);
        });

        // Iris - very dark
        const irisGeom = new THREE.SphereGeometry(s * 0.058, 16, 12);
        const irisMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 80 });

        [-1, 1].forEach(side => {
            const iris = new THREE.Mesh(irisGeom, irisMat);
            iris.position.set(side * s * 0.235, s * 0.27, s * 0.58);
            this.group.add(iris);
        });

        // Pupil - large
        const pupilGeom = new THREE.SphereGeometry(s * 0.04, 12, 10);
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100 });

        [-1, 1].forEach(side => {
            const pupil = new THREE.Mesh(pupilGeom, pupilMat);
            pupil.position.set(side * s * 0.245, s * 0.28, s * 0.6);
            this.group.add(pupil);
        });

        // Bright highlights
        const hlGeom = new THREE.SphereGeometry(s * 0.018, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        [-1, 1].forEach(side => {
            const hl = new THREE.Mesh(hlGeom, hlMat);
            hl.position.set(side * s * 0.25, s * 0.3, s * 0.62);
            this.group.add(hl);
        });

        // Secondary highlight
        const hl2Geom = new THREE.SphereGeometry(s * 0.01, 6, 6);
        [-1, 1].forEach(side => {
            const hl2 = new THREE.Mesh(hl2Geom, hlMat);
            hl2.position.set(side * s * 0.23, s * 0.26, s * 0.61);
            this.group.add(hl2);
        });
    }

    // ============================================
    // PENGUIN HEAD - Round, with yellow cheek patches
    // ============================================
    createPenguinHead(s, cfg) {
        const headMat = new THREE.MeshPhongMaterial({ color: cfg.headColor, shininess: 50 });

        // Store head base position for animation - sits directly on body
        this.headBaseY = s * 0.65;
        this.headBaseZ = s * 0.1;

        // Main head - round, penguin style
        const headGeom = new THREE.SphereGeometry(s * 0.26, 32, 24);
        headGeom.scale(1, 1, 0.9);
        this.head = new THREE.Mesh(headGeom, headMat);
        this.head.position.set(0, this.headBaseY, this.headBaseZ);
        this.head.castShadow = true;
        this.group.add(this.head);

        // White face/chin area - on front of head
        const faceGeom = new THREE.SphereGeometry(s * 0.2, 24, 18);
        faceGeom.scale(0.8, 0.85, 0.5);
        const faceMat = new THREE.MeshPhongMaterial({ color: cfg.bellyColor, shininess: 40 });
        const face = new THREE.Mesh(faceGeom, faceMat);
        face.position.set(0, s * 0.58, s * 0.28);
        this.group.add(face);

        // Yellow cheek patches (emperor penguin style)
        if (cfg.cheekColor) {
            const cheekGeom = new THREE.SphereGeometry(s * 0.09, 16, 12);
            cheekGeom.scale(1.2, 1.3, 0.5);
            const cheekMat = new THREE.MeshPhongMaterial({
                color: cfg.cheekColor,
                shininess: 60,
                emissive: cfg.cheekColor,
                emissiveIntensity: 0.15
            });

            const leftCheek = new THREE.Mesh(cheekGeom, cheekMat);
            leftCheek.position.set(s * 0.16, s * 0.6, s * 0.22);
            this.group.add(leftCheek);

            const rightCheek = new THREE.Mesh(cheekGeom, cheekMat);
            rightCheek.position.set(-s * 0.16, s * 0.6, s * 0.22);
            this.group.add(rightCheek);
        }

        // Beak (short and orange)
        this.createPenguinBeak(s, cfg);

        // Eyes
        this.createPenguinEyes(s, cfg);
    }

    createPenguinBeak(s, cfg) {
        const beakMat = new THREE.MeshPhongMaterial({ color: cfg.beakColor, shininess: 70 });

        // Upper beak - positioned in front of head (head is at z=0.08, radius ~0.28)
        const beakLength = s * 0.16;
        const upperGeom = new THREE.ConeGeometry(s * 0.045, beakLength, 10, 4);
        upperGeom.rotateX(Math.PI / 2);

        this.upperBeak = new THREE.Mesh(upperGeom, beakMat);
        this.upperBeak.position.set(0, s * 0.6, s * 0.38);
        this.group.add(this.upperBeak);

        // Lower beak
        const lowerLen = s * 0.12;
        const lowerGeom = new THREE.ConeGeometry(s * 0.035, lowerLen, 8, 3);
        lowerGeom.rotateX(Math.PI / 2);
        this.lowerBeak = new THREE.Mesh(lowerGeom, beakMat);
        this.lowerBeak.position.set(0, s * 0.54, s * 0.36);
        this.group.add(this.lowerBeak);

        // Black tip on beak
        const tipGeom = new THREE.ConeGeometry(s * 0.02, s * 0.04, 8);
        tipGeom.rotateX(Math.PI / 2);
        const tipMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 60 });
        const tip = new THREE.Mesh(tipGeom, tipMat);
        tip.position.set(0, s * 0.6, s * 0.44);
        this.group.add(tip);
    }

    createPenguinEyes(s, cfg) {
        // Eyes on head surface - head at z=0.1, radius 0.26
        const eyeY = s * 0.68;
        const eyeZ = s * 0.32; // Front of head sphere

        // Eyeball - white, sits on head surface
        const eyeGeom = new THREE.SphereGeometry(s * 0.035, 20, 16);
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(side * s * 0.1, eyeY, eyeZ);
            this.group.add(eye);
        });

        // Iris - dark brown
        const irisGeom = new THREE.SphereGeometry(s * 0.022, 16, 12);
        const irisMat = new THREE.MeshPhongMaterial({ color: cfg.irisColor, shininess: 80 });

        [-1, 1].forEach(side => {
            const iris = new THREE.Mesh(irisGeom, irisMat);
            iris.position.set(side * s * 0.1, eyeY, eyeZ + s * 0.02);
            this.group.add(iris);
        });

        // Pupil - black
        const pupilGeom = new THREE.SphereGeometry(s * 0.012, 12, 10);
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100 });

        [-1, 1].forEach(side => {
            const pupil = new THREE.Mesh(pupilGeom, pupilMat);
            pupil.position.set(side * s * 0.1, eyeY, eyeZ + s * 0.03);
            this.group.add(pupil);
        });

        // Highlights - match eye position
        const hlGeom = new THREE.SphereGeometry(s * 0.008, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        [-1, 1].forEach(side => {
            const hl = new THREE.Mesh(hlGeom, hlMat);
            hl.position.set(side * s * 0.095, eyeY + s * 0.01, eyeZ + s * 0.035);
            this.group.add(hl);
        });
    }

    createWings(s, cfg) {
        this.leftWingGroup = new THREE.Group();
        this.rightWingGroup = new THREE.Group();

        const wingMat = new THREE.MeshPhongMaterial({
            color: cfg.wingColor,
            shininess: 25,
            side: THREE.DoubleSide
        });
        const covertsMat = new THREE.MeshPhongMaterial({
            color: cfg.wingCovertsColor,
            shininess: 20,
            side: THREE.DoubleSide
        });
        const featherMat = new THREE.MeshPhongMaterial({
            color: cfg.wingPatternColor,
            shininess: 15,
            side: THREE.DoubleSide
        });

        // === WING BASE (Scapulars) ===
        const wingBaseGeom = new THREE.BoxGeometry(s * 0.5, s * 0.1, s * 0.45, 2, 1, 2);

        const leftWingBase = new THREE.Mesh(wingBaseGeom, covertsMat);
        leftWingBase.position.set(s * 0.3, 0, 0);
        leftWingBase.castShadow = true;
        this.leftWingGroup.add(leftWingBase);

        const rightWingBase = new THREE.Mesh(wingBaseGeom, covertsMat);
        rightWingBase.position.set(-s * 0.3, 0, 0);
        rightWingBase.castShadow = true;
        this.rightWingGroup.add(rightWingBase);

        // === GREATER COVERTS ===
        for (let i = 0; i < 8; i++) {
            const covertGeom = new THREE.BoxGeometry(s * 0.15, s * 0.025, s * 0.12, 4, 1, 3);
            const covert = new THREE.Mesh(covertGeom, i % 2 === 0 ? covertsMat : wingMat);

            // Left wing
            const leftCovert = covert.clone();
            leftCovert.position.set(s * 0.35 + i * s * 0.08, -s * 0.02, s * 0.05 - i * s * 0.015);
            leftCovert.rotation.z = -0.05 - i * 0.02;
            this.leftWingGroup.add(leftCovert);

            // Right wing
            const rightCovert = covert.clone();
            rightCovert.position.set(-s * 0.35 - i * s * 0.08, -s * 0.02, s * 0.05 - i * s * 0.015);
            rightCovert.rotation.z = 0.05 + i * 0.02;
            this.rightWingGroup.add(rightCovert);
        }

        // === PRIMARY FEATHERS (Flight feathers at wing tips) ===
        const primaryCount = 10;
        for (let i = 0; i < primaryCount; i++) {
            const featherLength = s * (0.4 + i * 0.08);
            const featherWidth = s * (0.1 - i * 0.005);

            // Create feather shape
            const featherGeom = new THREE.BoxGeometry(featherLength, s * 0.02, featherWidth, 2, 1, 2);
            const feather = new THREE.Mesh(featherGeom, i % 3 === 0 ? featherMat : wingMat);

            // Left wing primaries
            const leftFeather = feather.clone();
            leftFeather.position.set(
                s * 0.5 + featherLength * 0.4,
                -s * 0.03 - i * s * 0.005,
                -s * 0.1 + i * s * 0.06
            );
            leftFeather.rotation.z = -0.08 - i * 0.04;
            leftFeather.rotation.y = i * 0.03;
            leftFeather.castShadow = true;
            this.leftWingGroup.add(leftFeather);

            // Right wing primaries
            const rightFeather = feather.clone();
            rightFeather.position.set(
                -s * 0.5 - featherLength * 0.4,
                -s * 0.03 - i * s * 0.005,
                -s * 0.1 + i * s * 0.06
            );
            rightFeather.rotation.z = 0.08 + i * 0.04;
            rightFeather.rotation.y = -i * 0.03;
            rightFeather.castShadow = true;
            this.rightWingGroup.add(rightFeather);
        }

        // === SECONDARY FEATHERS (Inner flight feathers) ===
        const secondaryCount = 8;
        for (let i = 0; i < secondaryCount; i++) {
            const featherLength = s * (0.35 + i * 0.03);
            const featherGeom = new THREE.BoxGeometry(featherLength, s * 0.025, s * 0.09, 6, 1, 3);

            const feather = new THREE.Mesh(featherGeom, i % 2 === 0 ? wingMat : covertsMat);

            // Left wing
            const leftSec = feather.clone();
            leftSec.position.set(
                s * 0.25 + featherLength * 0.3,
                -s * 0.015,
                -s * 0.2 - i * s * 0.045
            );
            leftSec.rotation.z = -0.05;
            this.leftWingGroup.add(leftSec);

            // Right wing
            const rightSec = feather.clone();
            rightSec.position.set(
                -s * 0.25 - featherLength * 0.3,
                -s * 0.015,
                -s * 0.2 - i * s * 0.045
            );
            rightSec.rotation.z = 0.05;
            this.rightWingGroup.add(rightSec);
        }

        // === ALULA (Thumb feathers) ===
        const alulaGeom = new THREE.ConeGeometry(s * 0.04, s * 0.15, 8);
        alulaGeom.rotateZ(Math.PI / 2);
        const alulaMat = new THREE.MeshPhongMaterial({
            color: cfg.wingColor,
            shininess: 30
        });

        const leftAlula = new THREE.Mesh(alulaGeom, alulaMat);
        leftAlula.position.set(s * 0.6, s * 0.03, s * 0.15);
        this.leftWingGroup.add(leftAlula);

        const rightAlula = new THREE.Mesh(alulaGeom, alulaMat);
        rightAlula.position.set(-s * 0.6, s * 0.03, s * 0.15);
        rightAlula.rotation.z = Math.PI;
        this.rightWingGroup.add(rightAlula);

        // === WING TIP ===
        const wingTipGeom = new THREE.ConeGeometry(s * 0.12, s * 0.35, 8, 4);
        wingTipGeom.rotateZ(Math.PI / 2);

        const leftWingTip = new THREE.Mesh(wingTipGeom, wingMat);
        leftWingTip.position.set(s * 1.1, -s * 0.02, s * 0.2);
        this.leftWingGroup.add(leftWingTip);

        const rightWingTip = new THREE.Mesh(wingTipGeom, wingMat);
        rightWingTip.position.set(-s * 1.1, -s * 0.02, s * 0.2);
        rightWingTip.rotation.z = Math.PI;
        this.rightWingGroup.add(rightWingTip);

        // Position wing groups
        this.leftWingGroup.position.set(s * 0.18, s * 0.08, -s * 0.08);
        this.rightWingGroup.position.set(-s * 0.18, s * 0.08, -s * 0.08);

        this.group.add(this.leftWingGroup);
        this.group.add(this.rightWingGroup);
    }

    createTail(s, cfg) {
        this.tailGroup = new THREE.Group();

        const tailMat = new THREE.MeshPhongMaterial({
            color: cfg.tailColor,
            shininess: 25,
            side: THREE.DoubleSide
        });
        const tailAltMat = new THREE.MeshPhongMaterial({
            color: cfg.wingColor,
            shininess: 20,
            side: THREE.DoubleSide
        });

        // Tail coverts (base of tail)
        const covertGeom = new THREE.SphereGeometry(s * 0.22, 16, 12);
        covertGeom.scale(0.9, 0.5, 1.1);
        const covertMat = new THREE.MeshPhongMaterial({
            color: cfg.bodyColor,
            shininess: 25
        });
        const covert = new THREE.Mesh(covertGeom, covertMat);
        covert.position.set(0, s * 0.06, s * 0.12);
        this.tailGroup.add(covert);

        // Under tail coverts
        const underCovertGeom = new THREE.SphereGeometry(s * 0.18, 14, 10);
        underCovertGeom.scale(0.8, 0.4, 1);
        const underCovertMat = new THREE.MeshPhongMaterial({
            color: cfg.bellyColor,
            shininess: 20
        });
        const underCovert = new THREE.Mesh(underCovertGeom, underCovertMat);
        underCovert.position.set(0, -s * 0.02, s * 0.1);
        this.tailGroup.add(underCovert);

        // Main tail feathers - fan pattern
        const tailFeatherCount = 12;
        for (let i = 0; i < tailFeatherCount; i++) {
            const angle = ((i - (tailFeatherCount - 1) / 2) / tailFeatherCount) * 0.9;
            const featherLen = s * (0.55 + Math.cos(angle * 2) * 0.15);
            const featherWidth = s * 0.08;

            // Create feather
            const featherGeom = new THREE.BoxGeometry(featherWidth, s * 0.015, featherLen, 2, 1, 2);
            const feather = new THREE.Mesh(featherGeom, i % 2 === 0 ? tailMat : tailAltMat);
            feather.position.set(
                Math.sin(angle) * s * 0.12,
                -s * 0.01 + Math.abs(Math.sin(angle)) * s * 0.02,
                -featherLen * 0.35
            );
            feather.rotation.y = angle;
            feather.rotation.x = Math.abs(angle) * 0.15;
            feather.castShadow = true;
            this.tailGroup.add(feather);
        }

        // Central tail feathers (longer)
        for (let i = 0; i < 2; i++) {
            const centralLen = s * 0.65;
            const centralGeom = new THREE.BoxGeometry(s * 0.06, s * 0.012, centralLen, 4, 1, 6);
            const centralFeather = new THREE.Mesh(centralGeom, tailMat);
            centralFeather.position.set(
                (i === 0 ? 1 : -1) * s * 0.03,
                s * 0.01,
                -centralLen * 0.35
            );
            centralFeather.rotation.y = (i === 0 ? 1 : -1) * 0.05;
            this.tailGroup.add(centralFeather);
        }

        this.tailGroup.position.set(0, 0, -s * 0.52);
        this.tailGroup.rotation.x = 0.2;
        this.group.add(this.tailGroup);
    }

    createLegs(s, cfg) {
        const legMat = new THREE.MeshPhongMaterial({
            color: cfg.legColor,
            shininess: 40
        });

        this.leftLegGroup = new THREE.Group();
        this.rightLegGroup = new THREE.Group();

        // === THIGH (Tibiotarsus - upper leg, usually hidden by feathers) ===
        const thighGeom = new THREE.CylinderGeometry(s * 0.05, s * 0.04, s * 0.18, 12, 3);

        const leftThigh = new THREE.Mesh(thighGeom, legMat);
        leftThigh.position.set(0, -s * 0.08, 0);
        leftThigh.rotation.x = 0.4;
        this.leftLegGroup.add(leftThigh);

        const rightThigh = new THREE.Mesh(thighGeom, legMat);
        rightThigh.position.set(0, -s * 0.08, 0);
        rightThigh.rotation.x = 0.4;
        this.rightLegGroup.add(rightThigh);

        // Thigh feathers
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const thighFeatherGeom = new THREE.SphereGeometry(s * 0.03, 6, 4);
            thighFeatherGeom.scale(0.6, 1, 0.8);
            const thighFeatherMat = new THREE.MeshPhongMaterial({ color: cfg.bellyColor });

            const leftTF = new THREE.Mesh(thighFeatherGeom, thighFeatherMat);
            leftTF.position.set(
                Math.sin(angle) * s * 0.04,
                -s * 0.05,
                Math.cos(angle) * s * 0.04
            );
            this.leftLegGroup.add(leftTF);

            const rightTF = new THREE.Mesh(thighFeatherGeom, thighFeatherMat);
            rightTF.position.set(
                Math.sin(angle) * s * 0.04,
                -s * 0.05,
                Math.cos(angle) * s * 0.04
            );
            this.rightLegGroup.add(rightTF);
        }

        // === TARSOMETATARSUS (Lower leg - scaly part) ===
        const lowerLegGeom = new THREE.CylinderGeometry(s * 0.03, s * 0.025, s * 0.22, 10, 6);

        const leftLowerLeg = new THREE.Mesh(lowerLegGeom, legMat);
        leftLowerLeg.position.set(0, -s * 0.24, s * 0.06);
        this.leftLegGroup.add(leftLowerLeg);

        const rightLowerLeg = new THREE.Mesh(lowerLegGeom, legMat);
        rightLowerLeg.position.set(0, -s * 0.24, s * 0.06);
        this.rightLegGroup.add(rightLowerLeg);

        // === ANKLE JOINT ===
        const ankleGeom = new THREE.SphereGeometry(s * 0.03, 10, 8);

        const leftAnkle = new THREE.Mesh(ankleGeom, legMat);
        leftAnkle.position.set(0, -s * 0.35, s * 0.06);
        this.leftLegGroup.add(leftAnkle);

        const rightAnkle = new THREE.Mesh(ankleGeom, legMat);
        rightAnkle.position.set(0, -s * 0.35, s * 0.06);
        this.rightLegGroup.add(rightAnkle);

        // === FOOT AND TOES ===
        const createFoot = () => {
            const foot = new THREE.Group();

            // Forward toes (3)
            for (let i = 0; i < 3; i++) {
                const toeAngle = (i - 1) * 0.45;

                // Toe segments
                const segments = 3;
                let prevEnd = new THREE.Vector3(0, 0, 0);

                for (let seg = 0; seg < segments; seg++) {
                    const segLength = s * (0.08 - seg * 0.015);
                    const segRadius = s * (0.018 - seg * 0.004);

                    const segGeom = new THREE.CylinderGeometry(segRadius, segRadius * 0.8, segLength, 8, 2);
                    segGeom.rotateX(Math.PI / 2 - 0.25 + seg * 0.1);
                    segGeom.rotateY(toeAngle);

                    const segment = new THREE.Mesh(segGeom, legMat);
                    segment.position.set(
                        prevEnd.x + Math.sin(toeAngle) * segLength * 0.5,
                        prevEnd.y - s * 0.01,
                        prevEnd.z + Math.cos(toeAngle) * segLength * 0.5
                    );
                    foot.add(segment);

                    prevEnd.x += Math.sin(toeAngle) * segLength;
                    prevEnd.z += Math.cos(toeAngle) * segLength;

                    // Toe joint
                    if (seg < segments - 1) {
                        const jointGeom = new THREE.SphereGeometry(segRadius * 0.9, 6, 4);
                        const joint = new THREE.Mesh(jointGeom, legMat);
                        joint.position.copy(segment.position);
                        joint.position.z += segLength * 0.4 * Math.cos(toeAngle);
                        joint.position.x += segLength * 0.4 * Math.sin(toeAngle);
                        foot.add(joint);
                    }
                }

                // Claw
                const clawGeom = new THREE.ConeGeometry(s * 0.012, s * 0.04, 6);
                clawGeom.rotateX(Math.PI / 2 - 0.3);
                clawGeom.rotateY(toeAngle);
                const clawMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F, shininess: 60 });
                const claw = new THREE.Mesh(clawGeom, clawMat);
                claw.position.set(
                    prevEnd.x + Math.sin(toeAngle) * s * 0.02,
                    -s * 0.03,
                    prevEnd.z + Math.cos(toeAngle) * s * 0.02
                );
                foot.add(claw);
            }

            // Back toe (hallux)
            const backToeGeom = new THREE.CylinderGeometry(s * 0.015, s * 0.012, s * 0.06, 8);
            backToeGeom.rotateX(Math.PI / 2 + 0.4);
            const backToe = new THREE.Mesh(backToeGeom, legMat);
            backToe.position.set(0, -s * 0.015, -s * 0.03);
            foot.add(backToe);

            // Back claw
            const backClawGeom = new THREE.ConeGeometry(s * 0.01, s * 0.03, 6);
            backClawGeom.rotateX(Math.PI / 2 + 0.5);
            const backClawMat = new THREE.MeshPhongMaterial({ color: 0x2F2F2F, shininess: 60 });
            const backClaw = new THREE.Mesh(backClawGeom, backClawMat);
            backClaw.position.set(0, -s * 0.02, -s * 0.06);
            foot.add(backClaw);

            return foot;
        };

        const leftFoot = createFoot();
        leftFoot.position.set(0, -s * 0.38, s * 0.06);
        this.leftLegGroup.add(leftFoot);

        const rightFoot = createFoot();
        rightFoot.position.set(0, -s * 0.38, s * 0.06);
        this.rightLegGroup.add(rightFoot);

        // Position leg groups
        this.leftLegGroup.position.set(s * 0.12, -s * 0.18, -s * 0.08);
        this.rightLegGroup.position.set(-s * 0.12, -s * 0.18, -s * 0.08);

        this.group.add(this.leftLegGroup);
        this.group.add(this.rightLegGroup);
    }

    createCrowCrest(s, cfg) {
        // Crow's head feathers that stick up slightly
        for (let i = 0; i < 5; i++) {
            const crestGeom = new THREE.ConeGeometry(s * 0.03, s * 0.1, 6);
            const crestMat = new THREE.MeshPhongMaterial({
                color: cfg.headColor,
                shininess: 35
            });
            const crest = new THREE.Mesh(crestGeom, crestMat);
            crest.position.set(
                (i - 2) * s * 0.04,
                s * 0.42 + Math.abs(i - 2) * 0.02,
                s * 0.48 - i * s * 0.03
            );
            crest.rotation.x = -0.3 - i * 0.05;
            crest.rotation.z = (i - 2) * 0.1;
            this.group.add(crest);
        }
    }

    update(input, delta) {
        if (this.isPlayer) {
            const cfg = this.config;

            // Normalize input values (support both boolean and analog 0-1)
            const leftInput = typeof input.left === 'number' ? input.left : (input.left ? 1 : 0);
            const rightInput = typeof input.right === 'number' ? input.right : (input.right ? 1 : 0);
            const forwardInput = typeof input.forward === 'number' ? input.forward : (input.forward ? 1 : 0);
            const backwardInput = typeof input.backward === 'number' ? input.backward : (input.backward ? 1 : 0);
            const upInput = typeof input.up === 'number' ? input.up : (input.up ? 1 : 0);
            const downInput = typeof input.down === 'number' ? input.down : (input.down ? 1 : 0);

            // === ROTATION ===
            // Balance: higher speed = lower turn rate (30% turn rate at max speed)
            const minTurnRatio = 0.3;
            const speedRatio = Math.min(1, this.horizontalSpeed / this.currentMaxSpeed);
            const turnMultiplier = 1 - (1 - minTurnRatio) * speedRatio;
            const effectiveTurnSpeed = cfg.turnSpeed * turnMultiplier;

            if (input.turnRate !== undefined && input.turnRate !== 0) {
                // Touch input: direct turn rate control (joystick position = turn rate)
                // When joystick released, turnRate = 0, so rotation stops immediately
                const targetRotationVelocity = input.turnRate * effectiveTurnSpeed * 1.5;
                // Smooth transition to target
                this.rotationVelocity += (targetRotationVelocity - this.rotationVelocity) * 0.3;
            } else if (input.isTouch) {
                // Touch input but joystick centered - stop rotation smoothly
                this.rotationVelocity *= 0.8;
            } else {
                // Keyboard input: accumulating rotation with inertia
                if (leftInput > 0) {
                    this.rotationVelocity += effectiveTurnSpeed * 0.15 * leftInput;
                }
                if (rightInput > 0) {
                    this.rotationVelocity -= effectiveTurnSpeed * 0.15 * rightInput;
                }
                this.rotationVelocity *= ROTATION_DAMPING;
            }

            // Apply rotation
            this.rotation += this.rotationVelocity;

            // === FORWARD/BACKWARD THRUST (analog) ===
            if (forwardInput > 0) {
                const accel = this.currentAcceleration * forwardInput;
                const forwardX = Math.sin(this.rotation) * accel;
                const forwardZ = Math.cos(this.rotation) * accel;
                this.velocity.x += forwardX;
                this.velocity.z += forwardZ;
            }
            if (backwardInput > 0) {
                // Fly backwards (slower than forward)
                const backwardAccel = this.currentAcceleration * 0.5 * backwardInput;
                const backwardX = -Math.sin(this.rotation) * backwardAccel;
                const backwardZ = -Math.cos(this.rotation) * backwardAccel;
                this.velocity.x += backwardX;
                this.velocity.z += backwardZ;
            }

            // Calculate horizontal speed
            this.horizontalSpeed = Math.sqrt(
                this.velocity.x * this.velocity.x +
                this.velocity.z * this.velocity.z
            );

            // Clamp to current max speed (based on worms eaten)
            if (this.horizontalSpeed > this.currentMaxSpeed) {
                const ratio = this.currentMaxSpeed / this.horizontalSpeed;
                this.velocity.x *= ratio;
                this.velocity.z *= ratio;
                this.horizontalSpeed = this.currentMaxSpeed;
            }

            // === VERTICAL MOVEMENT (LIFT & GRAVITY) (analog) ===
            this.velocity.y -= GRAVITY;

            // Penguin special: can't fly, but can jump when on ground
            if (cfg.canFly === false) {
                this.isFlapping = upInput > 0;
                this.isOnGround = this.position.y <= 2.1;

                // Jump when on ground
                if (upInput > 0 && this.isOnGround && !this.isJumping) {
                    this.velocity.y = cfg.jumpPower || 0.1;
                    this.isJumping = true;
                }

                // Reset jump state when landed
                if (this.isOnGround && this.velocity.y <= 0) {
                    this.isJumping = false;
                }

                // Stronger gravity for penguin (falls faster)
                this.velocity.y -= GRAVITY * 1.5;

                // Penguin waddle state
                this.isWaddling = this.isOnGround && this.horizontalSpeed > 0.05;
            } else {
                // Normal flying birds
                this.isFlapping = upInput > 0;
                if (upInput > 0) {
                    this.velocity.y += cfg.liftPower * upInput;
                }

                if (downInput > 0) {
                    this.velocity.y -= cfg.liftPower * 0.5 * downInput;
                }

                // Gliding
                this.isGliding = upInput === 0 && downInput === 0 && this.horizontalSpeed > 0.2;
                if (this.isGliding) {
                    const glideLift = this.horizontalSpeed * cfg.glideEfficiency * 0.02;
                    this.velocity.y += glideLift;
                }
            }

            // Clamp vertical velocity
            this.velocity.y = Math.max(-this.currentMaxSpeed, Math.min(this.currentMaxSpeed * 0.8, this.velocity.y));

            // === AIR RESISTANCE ===
            this.velocity.x *= AIR_RESISTANCE;
            this.velocity.z *= AIR_RESISTANCE;

            // === APPLY VELOCITY ===
            this.position.add(this.velocity);

            // === BOUNDS ===
            if (this.position.y < 2) {
                this.position.y = 2;
                this.velocity.y = Math.max(0, this.velocity.y);
                this.velocity.x *= 0.9;
                this.velocity.z *= 0.9;
            }
            if (this.position.y > 100) {
                this.position.y = 100;
                this.velocity.y = Math.min(0, this.velocity.y);
            }
            const bound = 150;
            this.position.x = Math.max(-bound, Math.min(bound, this.position.x));
            this.position.z = Math.max(-bound, Math.min(bound, this.position.z));
        }

        // === SMOOTH VISUAL UPDATES ===
        this.visualRotation += (this.rotation - this.visualRotation) * 0.15;

        // Penguin special: waddle animation instead of flight tilts
        if (this.config.canFly === false) {
            // Waddle side-to-side when walking
            if (this.isWaddling) {
                this.waddleAngle = (this.waddleAngle || 0) + 0.3;
                const waddleTilt = Math.sin(this.waddleAngle) * 0.15;
                this.visualTiltZ = waddleTilt;
                // Slight forward lean when walking
                this.visualTiltX = 0.1;
            } else if (this.isJumping) {
                // Lean forward when jumping
                this.visualTiltX += (0.3 - this.visualTiltX) * 0.1;
                this.visualTiltZ *= 0.9;
            } else {
                // Upright when standing
                this.visualTiltX += (0 - this.visualTiltX) * 0.1;
                this.visualTiltZ += (0 - this.visualTiltZ) * 0.1;
            }
        } else {
            // Normal bird tilts
            const targetTiltX = Math.max(-0.5, Math.min(0.5, this.velocity.y * 0.4));
            const targetTiltZ = Math.max(-0.6, Math.min(0.6, -this.rotationVelocity * 8));

            this.visualTiltX += (targetTiltX - this.visualTiltX) * 0.1;
            this.visualTiltZ += (targetTiltZ - this.visualTiltZ) * 0.1;
        }

        this.group.position.copy(this.position);
        this.group.rotation.y = this.visualRotation;
        this.group.rotation.x = this.visualTiltX;
        this.group.rotation.z = this.visualTiltZ;

        // === ADAPTIVE WING ANIMATION ===
        // Penguin flipper animation
        if (this.config.canFly === false) {
            this.wingAngle += 0.1;

            if (this.isFlapping) {
                // Excited flapping when trying to "fly" (pressing space)
                const flipperFlap = Math.sin(this.wingAngle * 3) * 0.6;
                this.leftWingGroup.rotation.z = -0.3 - flipperFlap;
                this.rightWingGroup.rotation.z = 0.3 + flipperFlap;
            } else if (this.isWaddling) {
                // Swing flippers opposite to waddle
                const flipperSwing = Math.sin(this.waddleAngle) * 0.3;
                this.leftWingGroup.rotation.z = -0.3 - flipperSwing;
                this.rightWingGroup.rotation.z = 0.3 + flipperSwing;
                // Slight forward/back motion
                this.leftWingGroup.rotation.y = Math.sin(this.waddleAngle) * 0.2;
                this.rightWingGroup.rotation.y = -Math.sin(this.waddleAngle) * 0.2;
            } else {
                // Rest position - flippers at sides
                this.leftWingGroup.rotation.z += (-0.3 - this.leftWingGroup.rotation.z) * 0.1;
                this.rightWingGroup.rotation.z += (0.3 - this.rightWingGroup.rotation.z) * 0.1;
            }
        } else {
            // Normal bird wing animation
            if (this.isFlapping) {
                this.currentWingSpeed += (this.baseWingSpeed * 2 - this.currentWingSpeed) * 0.1;
            } else if (this.isGliding && this.horizontalSpeed > 0.3) {
                this.currentWingSpeed += (this.baseWingSpeed * 0.15 - this.currentWingSpeed) * 0.05;
            } else if (this.velocity.y < -0.1) {
                this.currentWingSpeed += (this.baseWingSpeed * 0.8 - this.currentWingSpeed) * 0.1;
            } else {
                this.currentWingSpeed += (this.baseWingSpeed - this.currentWingSpeed) * 0.1;
            }

            this.wingAngle += this.currentWingSpeed;

            let wingAmplitude = 0.6;
            if (this.isGliding && this.horizontalSpeed > 0.3) {
                wingAmplitude = 0.15;
            } else if (this.isFlapping) {
                wingAmplitude = 0.8;
            }

            const wingFlap = Math.sin(this.wingAngle) * wingAmplitude;

            const baseWingAngle = this.isGliding ? -0.1 : -0.3;
            this.leftWingGroup.rotation.z = baseWingAngle - wingFlap;
            this.rightWingGroup.rotation.z = -baseWingAngle + wingFlap;

            const wingForward = Math.sin(this.wingAngle * 0.5) * 0.1;
            this.leftWingGroup.rotation.y = wingForward;
            this.rightWingGroup.rotation.y = -wingForward;
        }

        // === TAIL ANIMATION ===
        this.tailAngle += 0.05;
        const tailWag = Math.sin(this.tailAngle) * 0.1;
        this.tailGroup.rotation.y = tailWag + this.rotationVelocity * 2;

        if (this.config.canFly === false) {
            // Penguin tail - small wobble when waddling
            if (this.isWaddling) {
                this.tailGroup.rotation.y = Math.sin(this.waddleAngle) * 0.2;
            }
            this.tailGroup.rotation.x = 0.5; // Fixed upward angle
        } else {
            const tailPitch = 0.2 + (this.velocity.y > 0 ? 0.3 : -0.15);
            this.tailGroup.rotation.x += (tailPitch - this.tailGroup.rotation.x) * 0.1;

            // Tail spread when turning or braking
            const tailSpread = Math.abs(this.rotationVelocity) * 3 + (this.velocity.y < -0.1 ? 0.2 : 0);
            this.tailGroup.scale.x = 1 + tailSpread;
        }

        // === LEG ANIMATION ===
        if (this.config.canFly === false) {
            // Penguin waddle walk
            if (this.isWaddling) {
                const walkCycle = Math.sin(this.waddleAngle);
                // Alternating leg lift
                this.leftLegGroup.rotation.x = walkCycle * 0.3;
                this.rightLegGroup.rotation.x = -walkCycle * 0.3;
                // Side sway
                this.leftLegGroup.position.y = walkCycle > 0 ? 0.05 : 0;
                this.rightLegGroup.position.y = walkCycle < 0 ? 0.05 : 0;
            } else if (this.isJumping) {
                // Legs tucked when jumping
                this.leftLegGroup.rotation.x = 0.5;
                this.rightLegGroup.rotation.x = 0.5;
            } else {
                // Standing
                this.leftLegGroup.rotation.x = 0;
                this.rightLegGroup.rotation.x = 0;
                this.leftLegGroup.position.y = 0;
                this.rightLegGroup.position.y = 0;
            }
        } else {
            // Normal bird leg animation
            const legTuck = 0.8 + (this.horizontalSpeed * 0.3);
            this.leftLegGroup.rotation.x = legTuck + Math.sin(this.wingAngle) * 0.1;
            this.rightLegGroup.rotation.x = legTuck + Math.sin(this.wingAngle + Math.PI) * 0.1;

            // Legs tucked back more at high speed
            const legBack = this.horizontalSpeed * 0.15;
            this.leftLegGroup.rotation.z = legBack;
            this.rightLegGroup.rotation.z = -legBack;
        }

        // === HEAD BOB ===
        if (this.head) {
            this.breathAngle += 0.03;
            const breathScale = 1 + Math.sin(this.breathAngle) * 0.02;
            this.body.scale.y = 0.85 * breathScale;
            if (this.breast) {
                this.breast.scale.y = 0.75 * breathScale;
            }

            // Gentle head rotation - reduced to avoid jerking
            this.head.rotation.x = Math.sin(this.wingAngle * 2) * 0.015;
            this.head.rotation.y = this.rotationVelocity * 1.5;

            // Subtle head bob using stored base position
            this.head.position.y = this.headBaseY + Math.sin(this.wingAngle * 2) * this.config.size * 0.005;
        }

        // === BEAK ANIMATION ===
        if (this.lowerBeak) {
            // Slight beak movement synced with breathing
            this.lowerBeak.rotation.x = Math.sin(this.breathAngle * 2) * 0.02;
        }
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.group.position.copy(this.position);
    }

    setRotation(rotY) {
        this.rotation = rotY;
        this.visualRotation = rotY;
        this.group.rotation.y = rotY;
    }

    getCollisionRadius() {
        // Use body-only radius (excludes wings from hitbox)
        return this.config.size * 0.4;
    }

    remove() {
        this.scene.remove(this.group);
    }
}

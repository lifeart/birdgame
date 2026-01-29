// Weather system - lightweight visual effects
class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];

        // Time of day (0-24)
        this.timeOfDay = 12;
        this.timeSpeed = 0.5; // Hours per real minute

        // Weather state
        this.currentWeather = 'clear'; // clear, rain, fog, aurora
        this.weatherTransition = 0;

        // Sky dome reference (will be set from createSky)
        this.skyMaterial = null;
        this.skyUniforms = null;

        // Sun/Moon
        this.sunMesh = null;
        this.moonMesh = null;
        this.sunLight = null;

        // Effects
        this.rainSystem = null;
        this.rainbow = null;
        this.aurora = null;
        this.godRays = null;
        this.fogObject = null;

        // Performance: reuse geometries and materials
        this.sharedGeometries = {};
        this.sharedMaterials = {};
    }

    init(existingFog) {
        this.fog = existingFog;
        this.createSkyDome();
        this.createSunMoon();
        this.createRainSystem();
        this.createRainbow();
        this.createAurora();
        this.createGodRays();
    }

    createSkyDome() {
        // Enhanced sky shader with day/night cycle
        const skyGeom = new THREE.SphereGeometry(290, 32, 32);

        this.skyUniforms = {
            topColor: { value: new THREE.Color(0x87CEEB) },
            bottomColor: { value: new THREE.Color(0xE0F6FF) },
            sunPosition: { value: new THREE.Vector3(0, 1, 0) },
            timeOfDay: { value: 12.0 },
            auroraIntensity: { value: 0.0 },
            auroraTime: { value: 0.0 }
        };

        this.skyMaterial = new THREE.ShaderMaterial({
            uniforms: this.skyUniforms,
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform vec3 sunPosition;
                uniform float timeOfDay;
                uniform float auroraIntensity;
                uniform float auroraTime;
                varying vec3 vWorldPosition;
                varying vec2 vUv;

                // Simple noise for aurora
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
                        f.y
                    );
                }

                void main() {
                    vec3 direction = normalize(vWorldPosition);
                    float h = direction.y;

                    // Base sky gradient
                    vec3 skyColor = mix(bottomColor, topColor, max(h, 0.0));

                    // Aurora effect (northern lights)
                    if (auroraIntensity > 0.0 && h > 0.2) {
                        float auroraH = (h - 0.2) / 0.8;
                        vec2 auroraUv = vec2(atan(direction.x, direction.z) * 2.0, auroraH * 3.0);

                        float wave1 = sin(auroraUv.x * 3.0 + auroraTime * 0.5) * 0.5 + 0.5;
                        float wave2 = sin(auroraUv.x * 5.0 - auroraTime * 0.3) * 0.5 + 0.5;
                        float n = noise(auroraUv * 2.0 + auroraTime * 0.2);

                        float aurora = wave1 * wave2 * n * auroraH * (1.0 - auroraH * 0.5);

                        vec3 auroraColor1 = vec3(0.1, 0.8, 0.4); // Green
                        vec3 auroraColor2 = vec3(0.3, 0.2, 0.8); // Purple
                        vec3 auroraCol = mix(auroraColor1, auroraColor2, wave1);

                        skyColor = mix(skyColor, auroraCol, aurora * auroraIntensity * 0.7);
                    }

                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeom, this.skyMaterial);
        this.scene.add(sky);
        this.objects.push(sky);
        this.sky = sky;
    }

    createSunMoon() {
        // Sun - simple glowing sphere
        const sunGeom = new THREE.SphereGeometry(8, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xFFFF88,
            transparent: true,
            opacity: 0.9
        });
        this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
        this.scene.add(this.sunMesh);
        this.objects.push(this.sunMesh);

        // Sun glow
        const glowGeom = new THREE.SphereGeometry(12, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFAA,
            transparent: true,
            opacity: 0.3
        });
        this.sunGlow = new THREE.Mesh(glowGeom, glowMat);
        this.sunMesh.add(this.sunGlow);

        // Moon
        const moonGeom = new THREE.SphereGeometry(5, 16, 16);
        const moonMat = new THREE.MeshBasicMaterial({
            color: 0xEEEEFF,
            transparent: true,
            opacity: 0.9
        });
        this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
        this.scene.add(this.moonMesh);
        this.objects.push(this.moonMesh);

        // Directional light (sun/moon light)
        this.sunLight = this.scene.children.find(c => c instanceof THREE.DirectionalLight);
    }

    createRainSystem() {
        // Instanced rain drops for performance
        const dropCount = 2000;
        const dropGeom = new THREE.BufferGeometry();

        // Simple line for each drop
        const positions = new Float32Array(dropCount * 6); // 2 vertices per line
        const velocities = new Float32Array(dropCount);

        for (let i = 0; i < dropCount; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = Math.random() * 100;
            const z = (Math.random() - 0.5) * 200;

            // Start point
            positions[i * 6] = x;
            positions[i * 6 + 1] = y;
            positions[i * 6 + 2] = z;

            // End point (slightly below)
            positions[i * 6 + 3] = x;
            positions[i * 6 + 4] = y - 1.5;
            positions[i * 6 + 5] = z;

            velocities[i] = 0.5 + Math.random() * 0.5;
        }

        dropGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const dropMat = new THREE.LineBasicMaterial({
            color: 0x8888AA,
            transparent: true,
            opacity: 0.4
        });

        this.rainSystem = new THREE.LineSegments(dropGeom, dropMat);
        this.rainSystem.visible = false;
        this.rainVelocities = velocities;
        this.scene.add(this.rainSystem);
        this.objects.push(this.rainSystem);
    }

    createRainbow() {
        // Rainbow arc using a torus segment
        const rainbowGeom = new THREE.TorusGeometry(80, 8, 8, 64, Math.PI);

        const rainbowMat = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            uniforms: {
                opacity: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float opacity;
                varying vec2 vUv;

                void main() {
                    // Rainbow colors based on position
                    float t = vUv.y;
                    vec3 color;

                    if (t < 0.14) color = vec3(0.58, 0.0, 0.83);      // Violet
                    else if (t < 0.28) color = vec3(0.29, 0.0, 0.51); // Indigo
                    else if (t < 0.42) color = vec3(0.0, 0.0, 1.0);   // Blue
                    else if (t < 0.56) color = vec3(0.0, 0.5, 0.0);   // Green
                    else if (t < 0.70) color = vec3(1.0, 1.0, 0.0);   // Yellow
                    else if (t < 0.84) color = vec3(1.0, 0.5, 0.0);   // Orange
                    else color = vec3(1.0, 0.0, 0.0);                  // Red

                    // Fade at edges
                    float fade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

                    gl_FragColor = vec4(color, opacity * fade * 0.5);
                }
            `
        });

        this.rainbow = new THREE.Mesh(rainbowGeom, rainbowMat);
        this.rainbow.position.set(100, 20, -150);
        this.rainbow.rotation.y = Math.PI / 4;
        this.rainbow.rotation.x = Math.PI / 2;
        this.rainbowMaterial = rainbowMat;
        this.scene.add(this.rainbow);
        this.objects.push(this.rainbow);
    }

    createAurora() {
        // Aurora is handled by sky shader, this just stores state
        this.auroraActive = false;
    }

    createGodRays() {
        // God rays - simple transparent planes
        const rayGroup = new THREE.Group();
        const rayCount = 8;

        const rayMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFDD,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.godRayMaterial = rayMat;

        for (let i = 0; i < rayCount; i++) {
            const rayGeom = new THREE.PlaneGeometry(15, 150);
            const ray = new THREE.Mesh(rayGeom, rayMat);

            const angle = (i / rayCount) * Math.PI * 0.6 - Math.PI * 0.3;
            ray.position.x = Math.sin(angle) * 30;
            ray.position.z = Math.cos(angle) * 30;
            ray.position.y = 50;
            ray.rotation.y = angle;
            ray.rotation.z = 0.1 + Math.random() * 0.1;

            rayGroup.add(ray);
        }

        this.godRays = rayGroup;
        this.godRays.visible = false;
        this.scene.add(rayGroup);
        this.objects.push(rayGroup);
    }

    // Set weather type
    setWeather(type) {
        this.currentWeather = type;

        // Update visibility
        this.rainSystem.visible = (type === 'rain');
        this.auroraActive = (type === 'aurora');

        // Fog
        if (type === 'fog') {
            this.fog.near = 10;
            this.fog.far = 80;
        } else if (type === 'rain') {
            this.fog.near = 50;
            this.fog.far = 200;
        } else {
            this.fog.near = 100;
            this.fog.far = 300;
        }
    }

    // Set time of day (0-24)
    setTimeOfDay(hours) {
        this.timeOfDay = hours % 24;
    }

    // Show/hide rainbow
    showRainbow(show) {
        if (this.rainbowMaterial) {
            this.rainbowMaterial.uniforms.opacity.value = show ? 1.0 : 0.0;
        }
    }

    // Show/hide god rays
    showGodRays(show) {
        this.godRays.visible = show;
        if (this.godRayMaterial) {
            this.godRayMaterial.opacity = show ? 0.15 : 0.0;
        }
    }

    update(deltaTime, time) {
        // Update time of day (auto cycle)
        this.timeOfDay += deltaTime * this.timeSpeed / 60;
        if (this.timeOfDay >= 24) this.timeOfDay -= 24;

        const t = this.timeOfDay;

        // Calculate sun position
        const sunAngle = ((t - 6) / 12) * Math.PI; // 6:00 = rise, 18:00 = set
        const sunHeight = Math.sin(sunAngle);
        const sunX = Math.cos(sunAngle) * 200;
        const sunY = sunHeight * 150 + 20;

        // Update sun/moon positions
        if (this.sunMesh) {
            this.sunMesh.position.set(sunX, Math.max(sunY, -50), -100);
            this.sunMesh.visible = sunHeight > -0.2;
        }

        if (this.moonMesh) {
            this.moonMesh.position.set(-sunX, Math.max(-sunY + 40, -50), -100);
            this.moonMesh.visible = sunHeight < 0.2;
        }

        // Update sky colors based on time
        if (this.skyUniforms) {
            let topColor, bottomColor;

            if (t >= 5 && t < 7) {
                // Sunrise
                const st = (t - 5) / 2;
                topColor = this.lerpColor(0x1a1a3a, 0x87CEEB, st);
                bottomColor = this.lerpColor(0x2a2a4a, 0xFFB366, st);
            } else if (t >= 7 && t < 17) {
                // Day
                topColor = 0x87CEEB;
                bottomColor = 0xE0F6FF;
            } else if (t >= 17 && t < 20) {
                // Sunset
                const st = (t - 17) / 3;
                topColor = this.lerpColor(0x87CEEB, 0xFF6B35, st * 0.5);
                bottomColor = this.lerpColor(0xE0F6FF, 0xFF8C42, st);
            } else if (t >= 20 && t < 21) {
                // Dusk
                const st = t - 20;
                topColor = this.lerpColor(0xFF6B35 * 0.5, 0x1a1a3a, st);
                bottomColor = this.lerpColor(0xFF8C42, 0x2a2a4a, st);
            } else {
                // Night
                topColor = 0x0a0a1a;
                bottomColor = 0x1a1a2a;
            }

            this.skyUniforms.topColor.value.setHex(topColor);
            this.skyUniforms.bottomColor.value.setHex(bottomColor);
            this.skyUniforms.timeOfDay.value = t;

            // Aurora at night
            if (this.auroraActive && (t < 5 || t > 21)) {
                this.skyUniforms.auroraIntensity.value = 1.0;
                this.skyUniforms.auroraTime.value = time;
            } else {
                this.skyUniforms.auroraIntensity.value = 0.0;
            }
        }

        // Update sun light
        if (this.sunLight) {
            const intensity = Math.max(0.2, sunHeight * 0.8 + 0.2);
            this.sunLight.intensity = intensity;

            // Warmer light at sunrise/sunset
            if (t >= 5 && t < 8) {
                this.sunLight.color.setHex(0xFFDDAA);
            } else if (t >= 17 && t < 20) {
                this.sunLight.color.setHex(0xFFAA77);
            } else if (t >= 7 && t < 17) {
                this.sunLight.color.setHex(0xFFFFFF);
            } else {
                this.sunLight.color.setHex(0x4444AA);
                this.sunLight.intensity = 0.3;
            }

            // Update light position to match sun
            this.sunLight.position.set(sunX * 0.5, Math.max(sunY, 20), -50);
        }

        // Update fog color for time of day
        if (this.fog) {
            if (t >= 7 && t < 17) {
                this.fog.color.setHex(0x87CEEB);
            } else if (t >= 5 && t < 7 || t >= 17 && t < 20) {
                this.fog.color.setHex(0xCC9966);
            } else {
                this.fog.color.setHex(0x1a1a2a);
            }
        }

        // Update rain
        if (this.rainSystem && this.rainSystem.visible) {
            const positions = this.rainSystem.geometry.attributes.position.array;

            for (let i = 0; i < this.rainVelocities.length; i++) {
                const speed = this.rainVelocities[i] * 2;

                // Move both start and end points down
                positions[i * 6 + 1] -= speed;
                positions[i * 6 + 4] -= speed;

                // Reset if below ground
                if (positions[i * 6 + 1] < 0) {
                    const y = 80 + Math.random() * 20;
                    positions[i * 6 + 1] = y;
                    positions[i * 6 + 4] = y - 1.5;

                    // Randomize x/z
                    const x = (Math.random() - 0.5) * 200;
                    const z = (Math.random() - 0.5) * 200;
                    positions[i * 6] = x;
                    positions[i * 6 + 2] = z;
                    positions[i * 6 + 3] = x;
                    positions[i * 6 + 5] = z;
                }
            }

            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }

        // God rays visibility based on time and weather
        if (this.godRays) {
            const showRays = this.currentWeather === 'clear' && t >= 7 && t < 17 && sunHeight > 0.3;
            this.godRays.visible = showRays;
            if (showRays && this.godRayMaterial) {
                // Animate opacity
                this.godRayMaterial.opacity = 0.08 + Math.sin(time * 0.5) * 0.04;
            }

            // Position god rays from sun
            if (this.sunMesh) {
                this.godRays.position.copy(this.sunMesh.position);
                this.godRays.position.y -= 30;
            }
        }

        // Rainbow after rain (random chance)
        if (this.rainbowMaterial) {
            if (this.currentWeather === 'clear' && t >= 7 && t < 17) {
                // Slowly fade in/out
                const target = (Math.sin(time * 0.1) > 0.7) ? 1.0 : 0.0;
                this.rainbowMaterial.uniforms.opacity.value +=
                    (target - this.rainbowMaterial.uniforms.opacity.value) * 0.01;
            } else {
                this.rainbowMaterial.uniforms.opacity.value *= 0.98;
            }
        }
    }

    lerpColor(c1, c2, t) {
        const r1 = (c1 >> 16) & 0xff;
        const g1 = (c1 >> 8) & 0xff;
        const b1 = c1 & 0xff;

        const r2 = (c2 >> 16) & 0xff;
        const g2 = (c2 >> 8) & 0xff;
        const b2 = c2 & 0xff;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }

    clear() {
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
    }

    // Random weather change
    randomWeather() {
        const weathers = ['clear', 'clear', 'clear', 'rain', 'fog', 'aurora'];
        const weather = weathers[Math.floor(Math.random() * weathers.length)];
        this.setWeather(weather);
        return weather;
    }
}

// Audio Manager - Funny synthesized sounds using Web Audio API
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;

        // Initialize on first user interaction (browser requirement)
        this.initialized = false;

        // Cooldowns to prevent sound spam
        this.lastFlapTime = 0;
        this.flapCooldown = 150;
        this.lastCollisionTime = 0;
        this.collisionCooldown = 500; // 500ms between collision sounds

        // Pre-created buffer pools for frequently-used sounds
        this.flapBufferPool = [];
        this.flapBufferPoolSize = 5;
        this.flapBufferIndex = 0;
    }

    init() {
        if (this.initialized) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;

            // Pre-create flap buffers for better performance
            this._initBufferPools();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Pre-create audio buffers that are used frequently
    _initBufferPools() {
        if (!this.ctx) return;

        // Create pool of flap sound buffers (noise bursts)
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
        for (let p = 0; p < this.flapBufferPoolSize; p++) {
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            // Each buffer has slightly different noise for variety
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            this.flapBufferPool.push(buffer);
        }
    }

    // Ensure audio context is running (needed after user interaction)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // === SOUND GENERATORS ===

    // Wing flap - whooshy sound (uses pre-created buffer pool for performance)
    playFlap() {
        if (!this.enabled || !this.ctx) return;

        const now = Date.now();
        if (now - this.lastFlapTime < this.flapCooldown) return;
        this.lastFlapTime = now;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Use pre-created buffer from pool (cycles through for variety)
        const buffer = this.flapBufferPool[this.flapBufferIndex];
        this.flapBufferIndex = (this.flapBufferIndex + 1) % this.flapBufferPoolSize;

        // If pool isn't initialized yet, skip
        if (!buffer) return;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter for whoosh character
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(400, t + 0.08);
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(t);
        noise.stop(t + 0.1);
    }

    // Collect worm - funny "boing" pop sound
    playWormCollect() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Main "pop" oscillator
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, t);
        osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        osc1.frequency.exponentialRampToValueAtTime(400, t + 0.15);

        // Second oscillator for richness
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, t);
        osc2.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(200, t + 0.12);

        // "Boing" spring effect
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(150, t);
        for (let i = 0; i < 5; i++) {
            osc3.frequency.setValueAtTime(200 - i * 20, t + i * 0.03);
            osc3.frequency.setValueAtTime(100 + i * 10, t + i * 0.03 + 0.015);
        }

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(this.volume * 0.5, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(this.volume * 0.3, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        const gain3 = ctx.createGain();
        gain3.gain.setValueAtTime(this.volume * 0.25, t);
        gain3.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        gain3.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc3.start(t);
        osc1.stop(t + 0.25);
        osc2.stop(t + 0.2);
        osc3.stop(t + 0.2);
    }

    // Collision dispatcher - plays different sounds based on object type
    playCollision(objectType = 'building') {
        if (!this.enabled || !this.ctx) return;

        const now = Date.now();
        if (now - this.lastCollisionTime < this.collisionCooldown) return;
        this.lastCollisionTime = now;

        switch (objectType) {
            case 'tree':
                this.playTreeHit();
                break;
            case 'metal':
                this.playMetalHit();
                break;
            case 'stone':
                this.playStoneHit();
                break;
            case 'house':
                this.playWoodHit();
                break;
            case 'building':
            default:
                this.playBuildingHit();
                break;
        }
    }

    // Building hit - deep concrete thud
    playBuildingHit() {
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Low thud
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(80, t);
        osc1.frequency.exponentialRampToValueAtTime(40, t + 0.2);

        // Impact noise
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.8;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(this.volume * 0.6, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(this.volume * 0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 600;

        osc1.connect(gain1);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        gain1.connect(ctx.destination);
        noiseGain.connect(ctx.destination);

        osc1.start(t);
        noise.start(t);
        osc1.stop(t + 0.3);
        noise.stop(t + 0.15);
    }

    // Tree hit - woody thunk with rustling
    playTreeHit() {
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Woody thunk
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(200, t);
        osc1.frequency.exponentialRampToValueAtTime(80, t + 0.1);

        // Higher wood resonance
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(400, t);
        osc2.frequency.exponentialRampToValueAtTime(150, t + 0.08);

        // Rustling leaves noise
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5) * 0.3;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(this.volume * 0.5, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(this.volume * 0.3, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(this.volume * 0.25, t + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;

        osc1.connect(gain1);
        osc2.connect(gain2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        noiseGain.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        noise.start(t);
        osc1.stop(t + 0.2);
        osc2.stop(t + 0.15);
        noise.stop(t + 0.4);
    }

    // Metal hit - clang with resonance
    playMetalHit() {
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Main clang
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(800, t);
        osc1.frequency.exponentialRampToValueAtTime(600, t + 0.3);

        // High ring
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, t);
        osc2.frequency.setValueAtTime(1180, t + 0.1);
        osc2.frequency.setValueAtTime(1200, t + 0.2);

        // Metallic overtone
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(2400, t);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(this.volume * 0.15, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(this.volume * 0.3, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        const gain3 = ctx.createGain();
        gain3.gain.setValueAtTime(this.volume * 0.15, t);
        gain3.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        gain3.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc3.start(t);
        osc1.stop(t + 0.5);
        osc2.stop(t + 0.6);
        osc3.stop(t + 0.4);
    }

    // Stone hit - heavy thud with crack
    playStoneHit() {
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Deep thud
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(100, t);
        osc1.frequency.exponentialRampToValueAtTime(50, t + 0.15);

        // Crack sound
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(300, t);
        osc2.frequency.exponentialRampToValueAtTime(100, t + 0.05);

        // Stone debris noise
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(this.volume * 0.6, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(this.volume * 0.25, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(this.volume * 0.35, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1500;
        noiseFilter.Q.value = 1;

        osc1.connect(gain1);
        osc2.connect(gain2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        noiseGain.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        noise.start(t);
        osc1.stop(t + 0.25);
        osc2.stop(t + 0.1);
        noise.stop(t + 0.15);
    }

    // Wood/house hit - hollow thunk
    playWoodHit() {
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Hollow wood thunk
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(250, t);
        osc1.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        // Wood resonance
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(180, t);
        osc2.frequency.exponentialRampToValueAtTime(120, t + 0.15);

        // Creak
        const osc3 = ctx.createOscillator();
        osc3.type = 'sawtooth';
        osc3.frequency.setValueAtTime(60, t + 0.05);
        osc3.frequency.linearRampToValueAtTime(80, t + 0.1);
        osc3.frequency.linearRampToValueAtTime(50, t + 0.15);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(this.volume * 0.5, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(this.volume * 0.35, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        const gain3 = ctx.createGain();
        gain3.gain.setValueAtTime(0, t);
        gain3.gain.linearRampToValueAtTime(this.volume * 0.1, t + 0.06);
        gain3.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        const filter3 = ctx.createBiquadFilter();
        filter3.type = 'lowpass';
        filter3.frequency.value = 200;

        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(filter3);
        filter3.connect(gain3);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        gain3.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc3.start(t + 0.05);
        osc1.stop(t + 0.2);
        osc2.stop(t + 0.25);
        osc3.stop(t + 0.2);
    }

    // Player joined - happy chirp
    playPlayerJoined() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Ascending chirps
        const notes = [523, 659, 784]; // C5, E5, G5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            const startTime = t + i * 0.08;
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.setValueAtTime(freq * 1.02, startTime + 0.02);
            osc.frequency.setValueAtTime(freq, startTime + 0.04);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(this.volume * 0.4, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    // Player left - sad descending tone
    playPlayerLeft() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Descending sad notes
        const notes = [392, 349, 294]; // G4, F4, D4

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            const startTime = t + i * 0.12;
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + 0.1);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }

    // Chat message - quick blip
    playChatMessage() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1100, t + 0.03);
        osc.frequency.exponentialRampToValueAtTime(660, t + 0.06);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    // Game start - fanfare
    playGameStart() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Fanfare notes
        const melody = [
            { freq: 523, time: 0, dur: 0.1 },     // C5
            { freq: 659, time: 0.1, dur: 0.1 },   // E5
            { freq: 784, time: 0.2, dur: 0.1 },   // G5
            { freq: 1047, time: 0.35, dur: 0.25 } // C6
        ];

        melody.forEach(note => {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, t + note.time);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t + note.time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.25, t + note.time + 0.01);
            gain.gain.setValueAtTime(this.volume * 0.25, t + note.time + note.dur * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, t + note.time + note.dur);

            // Add some harmonics
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(note.freq * 2, t + note.time);

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, t + note.time);
            gain2.gain.linearRampToValueAtTime(this.volume * 0.1, t + note.time + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + note.time + note.dur);

            osc.connect(gain);
            osc2.connect(gain2);
            gain.connect(ctx.destination);
            gain2.connect(ctx.destination);

            osc.start(t + note.time);
            osc2.start(t + note.time);
            osc.stop(t + note.time + note.dur + 0.1);
            osc2.stop(t + note.time + note.dur + 0.1);
        });
    }

    // Location change - whoosh transition
    playLocationChange() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Sweeping whoosh
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(4000, t + 0.3);
        filter.frequency.exponentialRampToValueAtTime(500, t + 0.6);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, t + 0.15);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, t + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.7);

        // Magic sparkle overlay
        for (let i = 0; i < 5; i++) {
            const sparkle = ctx.createOscillator();
            sparkle.type = 'sine';
            const sparkleTime = t + 0.1 + i * 0.08;
            const freq = 1500 + Math.random() * 1500;
            sparkle.frequency.setValueAtTime(freq, sparkleTime);
            sparkle.frequency.exponentialRampToValueAtTime(freq * 0.5, sparkleTime + 0.1);

            const sparkleGain = ctx.createGain();
            sparkleGain.gain.setValueAtTime(this.volume * 0.15, sparkleTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, sparkleTime + 0.1);

            sparkle.connect(sparkleGain);
            sparkleGain.connect(ctx.destination);

            sparkle.start(sparkleTime);
            sparkle.stop(sparkleTime + 0.15);
        }
    }

    // Pause menu open - soft click
    playPause() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    // Resume - higher pitched click
    playResume() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    // Bird chirp - random cute chirp
    playChirp() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const baseFreq = 1000 + Math.random() * 500;

        const osc = ctx.createOscillator();
        osc.type = 'sine';

        // Random chirp pattern
        const pattern = Math.floor(Math.random() * 3);
        if (pattern === 0) {
            // Rising chirp
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.05);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, t + 0.08);
        } else if (pattern === 1) {
            // Double chirp
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.setValueAtTime(baseFreq * 1.3, t + 0.04);
            osc.frequency.setValueAtTime(baseFreq, t + 0.06);
            osc.frequency.setValueAtTime(baseFreq * 1.3, t + 0.1);
        } else {
            // Trill
            for (let i = 0; i < 4; i++) {
                osc.frequency.setValueAtTime(baseFreq * (i % 2 === 0 ? 1 : 1.2), t + i * 0.025);
            }
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    // Golden Worm collect - special sparkly sound
    playGoldenWorm() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Main golden chime
        const notes = [1047, 1319, 1568, 2093]; // C6, E6, G6, C7

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            const startTime = t + i * 0.06;
            osc.frequency.setValueAtTime(freq, startTime);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(this.volume * 0.4, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            // Add shimmer with second oscillator
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2.01, startTime); // Slight detune for shimmer

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, startTime);
            gain2.gain.linearRampToValueAtTime(this.volume * 0.15, startTime + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

            osc.connect(gain);
            osc2.connect(gain2);
            gain.connect(ctx.destination);
            gain2.connect(ctx.destination);

            osc.start(startTime);
            osc2.start(startTime);
            osc.stop(startTime + 0.35);
            osc2.stop(startTime + 0.3);
        });

        // Sparkle overlay
        for (let i = 0; i < 8; i++) {
            const sparkle = ctx.createOscillator();
            sparkle.type = 'sine';
            const sparkleTime = t + 0.1 + Math.random() * 0.3;
            const freq = 2000 + Math.random() * 2000;
            sparkle.frequency.setValueAtTime(freq, sparkleTime);
            sparkle.frequency.exponentialRampToValueAtTime(freq * 0.7, sparkleTime + 0.08);

            const sparkleGain = ctx.createGain();
            sparkleGain.gain.setValueAtTime(this.volume * 0.1, sparkleTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, sparkleTime + 0.08);

            sparkle.connect(sparkleGain);
            sparkleGain.connect(ctx.destination);

            sparkle.start(sparkleTime);
            sparkle.stop(sparkleTime + 0.1);
        }
    }

    // Level Up - triumphant fanfare
    playLevelUp() {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Victory fanfare
        const melody = [
            { freq: 523, time: 0, dur: 0.1 },      // C5
            { freq: 659, time: 0.1, dur: 0.1 },    // E5
            { freq: 784, time: 0.2, dur: 0.1 },    // G5
            { freq: 1047, time: 0.35, dur: 0.15 }, // C6
            { freq: 988, time: 0.5, dur: 0.1 },    // B5
            { freq: 1047, time: 0.65, dur: 0.35 }  // C6 (sustained)
        ];

        melody.forEach(note => {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, t + note.time);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t + note.time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.3, t + note.time + 0.02);
            gain.gain.setValueAtTime(this.volume * 0.3, t + note.time + note.dur * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, t + note.time + note.dur);

            // Harmonics
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(note.freq * 2, t + note.time);

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, t + note.time);
            gain2.gain.linearRampToValueAtTime(this.volume * 0.15, t + note.time + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.01, t + note.time + note.dur);

            osc.connect(gain);
            osc2.connect(gain2);
            gain.connect(ctx.destination);
            gain2.connect(ctx.destination);

            osc.start(t + note.time);
            osc2.start(t + note.time);
            osc.stop(t + note.time + note.dur + 0.1);
            osc2.stop(t + note.time + note.dur + 0.1);
        });

        // Victory sparkles
        for (let i = 0; i < 10; i++) {
            const sparkle = ctx.createOscillator();
            sparkle.type = 'sine';
            const sparkleTime = t + 0.3 + i * 0.08;
            const freq = 1500 + Math.random() * 1500;
            sparkle.frequency.setValueAtTime(freq, sparkleTime);
            sparkle.frequency.exponentialRampToValueAtTime(freq * 0.6, sparkleTime + 0.1);

            const sparkleGain = ctx.createGain();
            sparkleGain.gain.setValueAtTime(this.volume * 0.12, sparkleTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, sparkleTime + 0.1);

            sparkle.connect(sparkleGain);
            sparkleGain.connect(ctx.destination);

            sparkle.start(sparkleTime);
            sparkle.stop(sparkleTime + 0.12);
        }
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}

// Global audio manager instance
const audioManager = new AudioManager();

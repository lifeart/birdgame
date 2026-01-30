// Audio Manager - Funny synthesized sounds using Web Audio API

// Extend Window interface for webkit AudioContext
declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

export class AudioManager {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.3;
    private initialized: boolean = false;

    // Cooldowns to prevent sound spam
    private lastFlapTime: number = 0;
    private flapCooldown: number = 150;
    private lastCollisionTime: number = 0;
    private collisionCooldown: number = 500;

    // Pre-created buffer pools for frequently-used sounds
    private flapBufferPool: AudioBuffer[] = [];
    private flapBufferPoolSize: number = 5;
    private flapBufferIndex: number = 0;

    init(): void {
        if (this.initialized) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.initialized = true;
                this._initBufferPools();
            }
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    private _initBufferPools(): void {
        if (!this.ctx) return;

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
        for (let p = 0; p < this.flapBufferPoolSize; p++) {
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            this.flapBufferPool.push(buffer);
        }
    }

    resume(): void {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playFlap(): void {
        if (!this.enabled || !this.ctx) return;

        const now = Date.now();
        if (now - this.lastFlapTime < this.flapCooldown) return;
        this.lastFlapTime = now;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const buffer = this.flapBufferPool[this.flapBufferIndex];
        this.flapBufferIndex = (this.flapBufferIndex + 1) % this.flapBufferPoolSize;

        if (!buffer) return;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

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

    playWormCollect(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, t);
        osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        osc1.frequency.exponentialRampToValueAtTime(400, t + 0.15);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, t);
        osc2.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(200, t + 0.12);

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

    playCollision(objectType: string = 'building'): void {
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

    private playBuildingHit(): void {
        const ctx = this.ctx!;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(80, t);
        osc1.frequency.exponentialRampToValueAtTime(40, t + 0.2);

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

    private playTreeHit(): void {
        const ctx = this.ctx!;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(200, t);
        osc1.frequency.exponentialRampToValueAtTime(80, t + 0.1);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(400, t);
        osc2.frequency.exponentialRampToValueAtTime(150, t + 0.08);

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

    private playMetalHit(): void {
        const ctx = this.ctx!;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(800, t);
        osc1.frequency.exponentialRampToValueAtTime(600, t + 0.3);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, t);
        osc2.frequency.setValueAtTime(1180, t + 0.1);
        osc2.frequency.setValueAtTime(1200, t + 0.2);

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

    private playStoneHit(): void {
        const ctx = this.ctx!;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(100, t);
        osc1.frequency.exponentialRampToValueAtTime(50, t + 0.15);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(300, t);
        osc2.frequency.exponentialRampToValueAtTime(100, t + 0.05);

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

    private playWoodHit(): void {
        const ctx = this.ctx!;
        const t = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(250, t);
        osc1.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(180, t);
        osc2.frequency.exponentialRampToValueAtTime(120, t + 0.15);

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

    playPlayerJoined(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

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

    playPlayerLeft(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

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

    playChatMessage(): void {
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

    playGameStart(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const melody = [
            { freq: 523, time: 0, dur: 0.1 },
            { freq: 659, time: 0.1, dur: 0.1 },
            { freq: 784, time: 0.2, dur: 0.1 },
            { freq: 1047, time: 0.35, dur: 0.25 }
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

    playLocationChange(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

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

    playPause(): void {
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

    playResume(): void {
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

    playChirp(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const baseFreq = 1000 + Math.random() * 500;

        const osc = ctx.createOscillator();
        osc.type = 'sine';

        const pattern = Math.floor(Math.random() * 3);
        if (pattern === 0) {
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.05);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, t + 0.08);
        } else if (pattern === 1) {
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.setValueAtTime(baseFreq * 1.3, t + 0.04);
            osc.frequency.setValueAtTime(baseFreq, t + 0.06);
            osc.frequency.setValueAtTime(baseFreq * 1.3, t + 0.1);
        } else {
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

    playGoldenWorm(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

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

            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2.01, startTime);

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

    playLevelUp(): void {
        if (!this.enabled || !this.ctx) return;

        const ctx = this.ctx;
        const t = ctx.currentTime;

        const melody = [
            { freq: 523, time: 0, dur: 0.1 },
            { freq: 659, time: 0.1, dur: 0.1 },
            { freq: 784, time: 0.2, dur: 0.1 },
            { freq: 1047, time: 0.35, dur: 0.15 },
            { freq: 988, time: 0.5, dur: 0.1 },
            { freq: 1047, time: 0.65, dur: 0.35 }
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

    toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setVolume(vol: number): void {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}

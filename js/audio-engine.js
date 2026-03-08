export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioBuffer = null;
        this.gainNode = null;
        this.mediaStreamDest = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
        this.duration = 0;

        // Beat detection state
        this.energyHistory = [];    // rolling window of recent energy values
        this.lastBeatTime = 0;      // prevent double-beats
        this.beatThreshold = 1.4;   // current energy must exceed avg * this
        this.beatCooldown = 0.2;    // minimum seconds between beats

        // Ended callback
        this._onEndedCallback = null;

        // Reusable typed array for frequency data
        this._frequencyData = null;
    }

    async init() {
        // Create AudioContext (lazy, called on first user interaction)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create AnalyserNode with fftSize=2048 for good frequency resolution (1024 bins)
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;

        // Create GainNode
        this.gainNode = this.audioContext.createGain();

        // Create MediaStreamDestination for video recording
        this.mediaStreamDest = this.audioContext.createMediaStreamDestination();

        // Connect: analyser -> gainNode -> destination + mediaStreamDest
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.connect(this.mediaStreamDest);

        // Allocate the frequency data array once
        this._frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    async loadAudio(urlOrFile) {
        if (!this.audioContext) {
            await this.init();
        }

        let arrayBuffer;

        if (urlOrFile instanceof File) {
            // Read File as ArrayBuffer
            arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(urlOrFile);
            });
        } else if (typeof urlOrFile === 'string') {
            // Fetch URL as ArrayBuffer
            const response = await fetch(urlOrFile);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
            }
            arrayBuffer = await response.arrayBuffer();
        } else {
            throw new Error('loadAudio expects a File object or URL string');
        }

        // Decode the audio data
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.duration = this.audioBuffer.duration;

        // Reset playback state
        this.pauseTime = 0;
        this.isPlaying = false;
        this.energyHistory = [];
        this.lastBeatTime = 0;
    }

    play() {
        if (!this.audioBuffer || this.isPlaying) return;

        // Resume AudioContext if suspended (browser autoplay policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Create new BufferSource (they are single-use)
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.analyser);

        // Handle song end
        this.source.onended = () => {
            if (this.isPlaying) {
                this.isPlaying = false;
                this.pauseTime = 0;
                this.source = null;
                if (this._onEndedCallback) {
                    this._onEndedCallback();
                }
            }
        };

        // Start from pauseTime offset
        const offset = this.pauseTime;
        this.startTime = this.audioContext.currentTime;
        this.source.start(0, offset);
        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying || !this.source) return;

        // Record current position
        this.pauseTime = this.getCurrentTime();
        this.isPlaying = false;

        // Stop the source node
        this.source.onended = null; // prevent the ended callback from firing
        this.source.stop();
        this.source = null;
    }

    stop() {
        if (this.source) {
            this.source.onended = null;
            try {
                this.source.stop();
            } catch (e) {
                // Source may already be stopped
            }
            this.source = null;
        }
        this.isPlaying = false;
        this.pauseTime = 0;
    }

    seek(time) {
        // Clamp to valid range
        time = Math.max(0, Math.min(time, this.duration));

        if (this.isPlaying) {
            // Stop current playback and restart from new time
            if (this.source) {
                this.source.onended = null;
                try {
                    this.source.stop();
                } catch (e) {
                    // Source may already be stopped
                }
                this.source = null;
            }
            this.isPlaying = false;
            this.pauseTime = time;
            this.play();
        } else {
            // Just update the pause position
            this.pauseTime = time;
        }
    }

    getCurrentTime() {
        if (this.isPlaying) {
            const elapsed = this.audioContext.currentTime - this.startTime;
            const currentTime = this.pauseTime + elapsed;
            // Clamp to duration
            return Math.min(currentTime, this.duration);
        }
        return this.pauseTime;
    }

    getDuration() {
        return this.duration;
    }

    getAnalysis() {
        // Return silent defaults if not ready
        if (!this.analyser || !this._frequencyData) {
            return { energy: 0, bass: 0, mid: 0, treble: 0, isBeat: false };
        }

        // Get frequency data (0-255 per bin, 1024 bins total)
        this.analyser.getByteFrequencyData(this._frequencyData);

        // Split into frequency bands
        // bass: bins 0-10 (low frequencies, kick drum)
        let bassSum = 0;
        for (let i = 0; i <= 10; i++) {
            bassSum += this._frequencyData[i];
        }
        const bass = bassSum / (11 * 255);

        // lowMid: bins 10-40 (dhol, tabla, tasha — Indian percussion lives here)
        let lowMidSum = 0;
        for (let i = 10; i <= 40; i++) {
            lowMidSum += this._frequencyData[i];
        }
        const lowMid = lowMidSum / (31 * 255);

        // mid: bins 40-100 (vocals, melody)
        let midSum = 0;
        for (let i = 40; i <= 100; i++) {
            midSum += this._frequencyData[i];
        }
        const mid = midSum / (61 * 255);

        // treble: bins 100-512 (hi-hats, cymbals, jhanjh)
        let trebleSum = 0;
        for (let i = 100; i <= 512; i++) {
            trebleSum += this._frequencyData[i];
        }
        const treble = trebleSum / (413 * 255);

        // energy = balanced weighting that works for both Western and Indian music
        // bass + lowMid together capture both kick drums AND dhol/tabla
        const energy = bass * 0.3 + lowMid * 0.3 + mid * 0.25 + treble * 0.15;

        // Multi-band beat detection: detect beats in bass OR lowMid band
        // This catches both kick-drum beats (Western) and dhol/tasha hits (Indian)
        const percussionEnergy = Math.max(bass, lowMid);

        this.energyHistory.push(percussionEnergy);
        if (this.energyHistory.length > 30) {
            this.energyHistory.shift();
        }

        let avgEnergy = 0;
        for (let i = 0; i < this.energyHistory.length; i++) {
            avgEnergy += this.energyHistory[i];
        }
        avgEnergy /= this.energyHistory.length;

        // Beat detection: spike in percussion bands above threshold AND cooldown elapsed
        const currentTime = this.audioContext ? this.audioContext.currentTime : 0;
        const isBeat =
            percussionEnergy > avgEnergy * this.beatThreshold &&
            (currentTime - this.lastBeatTime) > this.beatCooldown &&
            this.energyHistory.length >= 5;

        if (isBeat) {
            this.lastBeatTime = currentTime;
        }

        return { energy, bass, mid, treble, isBeat };
    }

    getMediaStreamDestination() {
        return this.mediaStreamDest;
    }

    onEnded(callback) {
        this._onEndedCallback = callback;
    }
}

import { AudioEngine } from './audio-engine.js';
import { Skeleton } from './skeleton.js';
import { MoveSequencer } from './move-sequencer.js';
import { MinimalTheme } from './themes/minimal.js';
import { StylizedTheme } from './themes/stylized.js';
import { WildTheme } from './themes/wild.js';
import { VideoExporter } from './video-exporter.js';
import { PosePlayer } from './pose-player.js';

class DancerApp {
    constructor() {
        this.canvas = document.getElementById('dance-floor');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioEngine();
        this.skeleton = new Skeleton();
        this.sequencer = new MoveSequencer();
        this.themes = {
            minimal: new MinimalTheme(),
            stylized: new StylizedTheme(),
            wild: new WildTheme()
        };
        this.currentTheme = 'minimal';
        this.isPlaying = false;
        this.songLoaded = false;
        this.exporter = null;
        this.isRecording = false;
        this.isRecordingFullSong = false;
        this.mode = 'freestyle';
        this.posePlayer = new PosePlayer();

        this._bindUI();
        this._animate();
    }

    _bindUI() {
        // THEME TOGGLE
        const themeButtons = document.querySelectorAll('[data-theme]');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const prevTheme = this.currentTheme;
                const newTheme = btn.dataset.theme;

                // Remove active from all, add to clicked
                themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Clear canvas when switching to/from wild theme to avoid trail artifacts
                if (prevTheme === 'wild' || newTheme === 'wild') {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }

                // Tell wild theme to do a full opaque clear on its first frame
                if (newTheme === 'wild') {
                    this.themes.wild.resetClear();
                }

                this.currentTheme = newTheme;
            });
        });

        // MODE TOGGLE
        const modeButtons = document.querySelectorAll('[data-mode]');
        const freestylePanel = document.getElementById('freestyle-panel');
        const choreoPanel = document.getElementById('choreo-panel');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;

                freestylePanel.style.display = this.mode === 'freestyle' ? '' : 'none';
                choreoPanel.style.display = this.mode === 'choreo' ? '' : 'none';

                // Stop playback on mode switch
                if (this.isPlaying) {
                    this.audio.pause();
                    this.isPlaying = false;
                    document.getElementById('play-btn').textContent = 'Play';
                }
            });
        });

        // LEARNT SUB-TOGGLE (Song / Move)
        const learntButtons = document.querySelectorAll('[data-learnt]');
        const songPanel = document.getElementById('song-panel');
        const movePanel = document.getElementById('move-panel');
        learntButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                learntButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                songPanel.style.display = btn.dataset.learnt === 'song' ? '' : 'none';
                movePanel.style.display = btn.dataset.learnt === 'move' ? '' : 'none';

                if (this.isPlaying) {
                    this.audio.pause();
                    this.isPlaying = false;
                    document.getElementById('play-btn').textContent = 'Play';
                }
            });
        });

        // Load move manifest and populate dropdown
        this._loadMoveManifest();

        // SONG SELECT (learnt mode — full songs)
        const songSelect = document.getElementById('song-select');
        songSelect.addEventListener('change', () => {
            const stem = songSelect.value;
            if (stem) this.loadChoreography(stem);
        });

        // MOVE SELECT (learnt mode — individual moves)
        const moveSelect = document.getElementById('move-select');
        moveSelect.addEventListener('change', () => {
            const stem = moveSelect.value;
            if (stem) this.loadChoreography(stem, 'move');
        });

        // PLAY BUTTON
        const playBtn = document.getElementById('play-btn');
        playBtn.addEventListener('click', () => {
            if (!this.isPlaying) {
                this.audio.play();
                this.isPlaying = true;
                playBtn.textContent = 'Pause';
            } else {
                this.audio.pause();
                this.isPlaying = false;
                playBtn.textContent = 'Play';
            }
        });

        // UPLOAD INPUT
        const fileUpload = document.getElementById('file-upload');
        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadSong(file, file.name);
            }
        });

        // PROGRESS BAR
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('click', (e) => {
            if (!this.songLoaded) return;
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = clickX / rect.width;
            const seekTime = ratio * this.audio.getDuration();
            this.audio.seek(seekTime);
        });

        // RECORD BUTTON
        const recordBtn = document.getElementById('record-btn');
        recordBtn.addEventListener('click', async () => {
            if (!this.isRecording) {
                // Start recording
                await this.audio.init();
                this.exporter = new VideoExporter(
                    this.canvas,
                    this.audio.getMediaStreamDestination()
                );
                this.exporter.startRecording();
                this.isRecording = true;
                recordBtn.textContent = 'Stop Recording';
                recordBtn.classList.add('recording');
            } else {
                // Stop recording
                const blob = await this.exporter.stopRecording();
                VideoExporter.download(blob);
                this.isRecording = false;
                this.exporter = null;
                recordBtn.textContent = 'Record';
                recordBtn.classList.remove('recording');
            }
        });

        // RECORD FULL SONG BUTTON
        const recordFullBtn = document.getElementById('record-full-btn');
        recordFullBtn.addEventListener('click', async () => {
            if (this.isRecordingFullSong) return;

            // Stop current playback if playing
            if (this.isPlaying) {
                this.audio.pause();
                this.isPlaying = false;
            }

            // Seek to beginning
            this.audio.seek(0);

            // Set up exporter
            await this.audio.init();
            this.exporter = new VideoExporter(
                this.canvas,
                this.audio.getMediaStreamDestination()
            );

            // Update UI
            this.isRecordingFullSong = true;
            recordFullBtn.textContent = 'Recording...';
            recordFullBtn.disabled = true;
            recordBtn.disabled = true;

            // Set up ended callback to stop recording when song finishes
            this.audio.onEnded(async () => {
                this.isPlaying = false;
                const playBtn = document.getElementById('play-btn');
                playBtn.textContent = 'Play';

                if (this.isRecordingFullSong && this.exporter) {
                    const blob = await this.exporter.stopRecording();
                    VideoExporter.download(blob, 'dancer-claude-full.webm');
                    this.exporter = null;
                    this.isRecordingFullSong = false;

                    // Re-enable buttons
                    recordFullBtn.textContent = 'Record Full Song';
                    recordFullBtn.disabled = false;
                    recordBtn.disabled = false;
                }
            });

            // Start recording and playback
            this.exporter.startRecording();
            this.audio.play();
            this.isPlaying = true;
            document.getElementById('play-btn').textContent = 'Pause';
        });
    }

    async loadSong(file, name) {
        try {
            await this.audio.init();
            await this.audio.loadAudio(file);
        } catch (err) {
            console.error('Failed to load audio:', err);
            document.querySelector('.now-playing').textContent =
                `Failed to load "${name}".`;
            return;
        }

        // Reset sequencer time base for the new song
        this.sequencer._initialized = false;
        this.sequencer.moveStartTime = 0;
        this.sequencer.moveProgress = 0;
        this.sequencer.beatTimes = [];

        // Update UI
        document.querySelector('.now-playing').textContent = `Now playing: ${name}`;
        document.getElementById('play-btn').disabled = false;
        document.getElementById('record-btn').disabled = false;
        document.getElementById('record-full-btn').disabled = false;
        this.songLoaded = true;

        // Set up ended callback (unless we're doing a full-song recording,
        // which sets its own callback)
        if (!this.isRecordingFullSong) {
            this.audio.onEnded(() => {
                this.isPlaying = false;
                document.getElementById('play-btn').textContent = 'Play';
            });
        }
    }

    async _loadMoveManifest() {
        try {
            const resp = await fetch('library/moves/manifest.json');
            if (!resp.ok) return;
            const moves = await resp.json();
            const moveSelect = document.getElementById('move-select');
            for (const move of moves) {
                const opt = document.createElement('option');
                opt.value = move.stem;
                opt.textContent = move.name;
                moveSelect.appendChild(opt);
            }
        } catch {
            // No moves yet — that's fine
        }
    }

    async loadChoreography(stem, source) {
        const basePath = source === 'move' ? 'library/moves' : 'library';
        try {
            const meta = await this.posePlayer.load(`${basePath}/${stem}.json`);
            await this.audio.init();
            await this.audio.loadAudio(`${basePath}/${meta.audio}`);
        } catch (err) {
            console.error('Failed to load choreography:', err);
            document.querySelector('.now-playing').textContent =
                'Failed to load choreography.';
            return;
        }

        // Reset sequencer so freestyle doesn't carry stale state
        this.sequencer._initialized = false;
        this.sequencer.moveStartTime = 0;
        this.sequencer.moveProgress = 0;
        this.sequencer.beatTimes = [];

        // Update UI — show name from the active dropdown
        let displayName;
        if (source === 'move') {
            const moveSelect = document.getElementById('move-select');
            displayName = moveSelect.options[moveSelect.selectedIndex].text;
        } else {
            const songSelect = document.getElementById('song-select');
            displayName = songSelect.options[songSelect.selectedIndex].text;
        }
        document.querySelector('.now-playing').textContent = `Now playing: ${displayName}`;
        document.getElementById('play-btn').disabled = false;
        document.getElementById('record-btn').disabled = false;
        document.getElementById('record-full-btn').disabled = false;
        this.songLoaded = true;

        if (!this.isRecordingFullSong) {
            this.audio.onEnded(() => {
                this.isPlaying = false;
                document.getElementById('play-btn').textContent = 'Play';
            });
        }
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const theme = this.themes[this.currentTheme];
        let analysis = { energy: 0, bass: 0, mid: 0, treble: 0, isBeat: false };

        if (this.isPlaying) {
            analysis = this.audio.getAnalysis();
            const time = this.audio.getCurrentTime();
            this.sequencer.update(analysis, time);
        }

        let pose;
        if (this.mode === 'choreo' && this.posePlayer.isLoaded()) {
            pose = this.posePlayer.getPoseAtTime(this.audio.getCurrentTime());
        } else {
            pose = this.sequencer.getCurrentPose();
        }

        // Draw frame
        theme.drawBackground(this.ctx, this.canvas);
        const style = theme.getSkeletonStyle(analysis);
        this.skeleton.draw(this.ctx, pose, style);
        theme.drawEffects(this.ctx, this.canvas, analysis, pose);

        // Update progress bar and time display
        if (this.songLoaded) {
            const current = this.audio.getCurrentTime();
            const duration = this.audio.getDuration();
            const pct = duration > 0 ? (current / duration) * 100 : 0;
            document.querySelector('.progress-fill').style.width = pct + '%';
            document.querySelector('.time-display').textContent =
                `${this._formatTime(current)} / ${this._formatTime(duration)}`;
        }
    }

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

const app = new DancerApp();

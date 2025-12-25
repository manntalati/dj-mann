import * as Tone from 'tone';
import type { Track } from './types';
import { detectBPM } from './bpmDetection';

export class Deck {
    public player: Tone.Player;
    public meter: Tone.Meter;

    private _track: Track | null = null;
    private _isPlaying: boolean = false;
    private _pausedAt: number = 0; // Offset in seconds within the track
    private _startedAt: number = 0; // Tone.now() when playback started (last resume)

    // Loop state
    private _loopEnabled: boolean = false;
    private _loopStart: number = 0;
    private _loopEnd: number = 0;

    // Hot cues (up to 8)
    private _hotCues: Map<number, number> = new Map(); // index -> time in seconds

    // Audio effects for creative transitions
    public delay: Tone.FeedbackDelay;
    public reverb: Tone.Reverb;
    public filter: Tone.Filter;

    constructor() {
        this.player = new Tone.Player();
        this.meter = new Tone.Meter();

        // Initialize effects (BYPASSED by default for clean playback)
        this.delay = new Tone.FeedbackDelay({
            delayTime: 0.25,
            feedback: 0,
            wet: 0 // CRITICAL: Bypassed during normal playback
        });
        this.reverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0 // CRITICAL: Bypassed during normal playback
        });
        this.filter = new Tone.Filter({
            frequency: 20000, // Fully open (no filtering)
            type: 'lowpass',
            Q: 1
        });

        // Signal chain: Player -> Filter -> Delay -> Reverb -> Meter -> (Output to Mixer)
        // Effects are bypassed (wet=0) so signal passes through cleanly
        this.player.chain(this.filter, this.delay, this.reverb, this.meter);
    }

    /**
     * Load a track into the deck
     */
    async load(track: Track) {
        if (this._isPlaying) this.pause();

        await this.player.load(track.url);

        // Detect BPM if not provided
        if (!track.bpm && this.player.buffer.loaded) {
            try {
                track.bpm = await detectBPM(this.player.buffer.get() as AudioBuffer);
                console.log(`Detected BPM for ${track.title}: ${track.bpm}`);
            } catch (e) {
                console.error("BPM Detection failed", e);
                track.bpm = 120; // fallback
            }
        }

        this._track = track;
        this._pausedAt = 0;
        this.player.playbackRate = 1;
        console.log(`Deck loaded: ${track.title}`);
    }

    /**
     * Unload the current track
     */
    unload() {
        if (this._isPlaying) this.pause();
        this._track = null;
        this._pausedAt = 0;
        this._startedAt = 0;
        console.log('Deck unloaded');
    }

    play() {
        if (this._isPlaying || !this._track || !this.player.loaded) return;

        const now = Tone.now();
        this.player.start(now, this._pausedAt);
        this._startedAt = now;
        this._isPlaying = true;
    }

    /**
     * Start playback at a specific Tone.js scheduled time
     */
    playAt(time: number, offset?: number) {
        if (!this._track || !this.player.loaded) return;

        const startOffset = offset !== undefined ? offset : this._pausedAt;
        this.player.start(time, startOffset);

        // Update state logic for scheduled play
        // Note: _isPlaying refers to logical state, but _startedAt must match Tone clock
        this._startedAt = time;
        this._pausedAt = startOffset;
        this._isPlaying = true;
    }

    pause() {
        if (!this._isPlaying) return;

        const now = Tone.now();
        this.player.stop(now);
        // Calculate current position to resume from
        const elapsed = (now - this._startedAt) * this.player.playbackRate;
        this._pausedAt += elapsed;

        this._isPlaying = false;
    }

    /**
     * Stop playback at a specific Tone.js scheduled time
     */
    stopAt(time: number) {
        if (!this._isPlaying) return;

        this.player.stop(time);

        // We can't easily calculate the exact _pausedAt for a future stop in this way
        // without a more complex state tracker, but for transitions this is usually 
        // followed by a seek(0) or load().
        setTimeout(() => {
            if (Tone.now() >= time) {
                this._isPlaying = false;
            }
        }, (time - Tone.now()) * 1000);
    }

    setSpeed(rate: number) {
        this.player.playbackRate = rate;
    }

    seek(offset: number) {
        const wasPlaying = this._isPlaying;
        if (wasPlaying) {
            this.player.stop();
        }

        this._pausedAt = offset;

        if (wasPlaying) {
            this.player.start(Tone.now(), offset);
            this._startedAt = Tone.now();
        }
    }

    /**
     * Get the current playback time in seconds
     */
    get currentTime() {
        if (!this._isPlaying) return this._pausedAt;
        const elapsed = (Tone.now() - this._startedAt) * this.player.playbackRate;
        return this._pausedAt + elapsed;
    }

    get duration() {
        return this.player.buffer.loaded ? this.player.buffer.duration : 0;
    }

    get isPlaying() {
        return this._isPlaying;
    }

    get track() {
        return this._track;
    }

    /**
     * Connect the deck's output to a destination node
     */
    connect(node: Tone.InputNode) {
        this.meter.connect(node);
    }

    /**
     * Update mix points for the current track
     */
    updateTrackMixPoints(mixPoints: import('./types').MixPoint[]) {
        if (this._track) {
            this._track = { ...this._track, mixPoints };
        }
    }

    // === LOOP CONTROLS ===

    /**
     * Set loop points (in seconds)
     */
    setLoop(start: number, end: number) {
        if (start >= 0 && end > start && end <= this.duration) {
            this._loopStart = start;
            this._loopEnd = end;
            this.player.loop = true;
            this.player.loopStart = start;
            this.player.loopEnd = end;
        }
    }

    /**
     * Enable/disable loop
     */
    toggleLoop(enabled?: boolean) {
        this._loopEnabled = enabled !== undefined ? enabled : !this._loopEnabled;
        this.player.loop = this._loopEnabled;
    }

    /**
     * Set loop based on bar length (assumes 4/4 time)
     */
    setLoopBars(bars: number) {
        if (!this._track?.bpm) return;

        const beatsPerBar = 4;
        const secondsPerBeat = 60 / this._track.bpm;
        const loopLength = bars * beatsPerBar * secondsPerBeat;

        const currentPos = this.currentTime;
        this.setLoop(currentPos, currentPos + loopLength);
        this.toggleLoop(true);
    }

    /**
     * Clear loop
     */
    clearLoop() {
        this._loopEnabled = false;
        this.player.loop = false;
    }

    get loopEnabled() { return this._loopEnabled; }
    get loopStart() { return this._loopStart; }
    get loopEnd() { return this._loopEnd; }

    // === HOT CUES ===

    /**
     * Set a hot cue at current position
     */
    setCue(index: number, time?: number) {
        const cueTime = time !== undefined ? time : this.currentTime;
        this._hotCues.set(index, cueTime);
    }

    /**
     * Jump to a hot cue
     */
    jumpToCue(index: number) {
        const cueTime = this._hotCues.get(index);
        if (cueTime !== undefined) {
            this.seek(cueTime);
        }
    }

    /**
     * Delete a hot cue
     */
    deleteCue(index: number) {
        this._hotCues.delete(index);
    }

    /**
     * Get all hot cues
     */
    get hotCues(): Map<number, number> {
        return new Map(this._hotCues);
    }
}

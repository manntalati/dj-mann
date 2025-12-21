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

    constructor() {
        this.player = new Tone.Player();
        this.meter = new Tone.Meter();
        // Signal chain: Player -> Meter -> (Output to Mixer)
        this.player.connect(this.meter);
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

    play() {
        if (this._isPlaying || !this._track || !this.player.loaded) return;

        this.player.start(Tone.now(), this._pausedAt);
        this._startedAt = Tone.now();
        this._isPlaying = true;
    }

    pause() {
        if (!this._isPlaying) return;

        this.player.stop();
        // Calculate current position to resume from
        const elapsed = (Tone.now() - this._startedAt) * this.player.playbackRate;
        this._pausedAt += elapsed;

        this._isPlaying = false;
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
}

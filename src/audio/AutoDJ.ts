import * as Tone from 'tone';
import { Deck } from './Deck';
import { Mixer } from './Mixer';
import { mixPointAnalyzer } from './mixPointAnalysis';

export class AutoDJ {
    private deckA: Deck;
    private deckB: Deck;
    private mixer: Mixer;

    // Config
    private transitionDuration: number = 8; // Longer for smoother EQ mix
    private autoPilotThreshold: number = 30; // seconds remaining to trigger mix
    private isMixing: boolean = false;
    private _isAutoPilot: boolean = false;
    private _activeDeckId: 'A' | 'B' = 'A';
    private _monitorInterval: any = null;
    private _timeRemaining: number = 0;

    constructor(deckA: Deck, deckB: Deck, mixer: Mixer) {
        this.deckA = deckA;
        this.deckB = deckB;
        this.mixer = mixer;
    }

    public get isAutoPilot() { return this._isAutoPilot; }
    public get timeRemaining() { return this._timeRemaining; }
    public get mixingStatus() { return this.isMixing; }
    public get activeDeckId() { return this._activeDeckId; }

    public toggleAutoPilot() {
        this._isAutoPilot = !this._isAutoPilot;
        console.log(`AutoDJ: Auto-Pilot is now ${this._isAutoPilot ? 'ON' : 'OFF'}`);

        if (this._isAutoPilot) {
            // "One-Click Start" logic:
            if (!this.deckA.isPlaying && !this.deckB.isPlaying) {
                if (this.deckA.track) {
                    this.mixer.setCrossfader(0);
                    this.deckA.play();
                    this._activeDeckId = 'A';
                } else if (this.deckB.track) {
                    this.mixer.setCrossfader(1);
                    this.deckB.play();
                    this._activeDeckId = 'B';
                }
            }
            this.startMonitoring();
        } else {
            this.stopMonitoring();
        }
        return this._isAutoPilot;
    }

    private startMonitoring() {
        if (this._monitorInterval) return;
        this._monitorInterval = setInterval(() => this.monitor(), 500);
    }

    private stopMonitoring() {
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
        }
        this._timeRemaining = 0;
    }

    private monitor() {
        if (!this._isAutoPilot || this.isMixing) return;

        const activeDeck = this._activeDeckId === 'A' ? this.deckA : this.deckB;
        const targetDeckId = this._activeDeckId === 'A' ? 'B' : 'A';
        const targetDeck = targetDeckId === 'A' ? this.deckA : this.deckB;

        if (activeDeck.isPlaying && activeDeck.duration > 0) {
            const currentTime = activeDeck.currentTime;
            const remaining = activeDeck.duration - currentTime;
            this._timeRemaining = Math.max(0, remaining);

            // NEW: Check if we've reached any mix-out points
            const activeTrack = activeDeck.track;
            if (activeTrack?.mixPoints && targetDeck.track) {
                // Debug log every 5 seconds
                if (Math.floor(currentTime) % 5 === 0 && currentTime % 1 < 0.5) {
                    console.log(`[Monitor] t=${currentTime.toFixed(1)}s, ${activeTrack.mixPoints.length} mix points available`);
                }

                // Find the next mix-out point we haven't passed yet
                const nextMixOut = activeTrack.mixPoints.find(mp =>
                    mp.type === 'out' &&
                    mp.pairTrackId === targetDeck.track?.id &&
                    currentTime >= mp.time - 2 && // 2 second window before mix point
                    currentTime <= mp.time + 1 // 1 second after
                );

                if (nextMixOut) {
                    console.log(`[Monitor] Found mix-out at ${nextMixOut.time.toFixed(1)}s (current: ${currentTime.toFixed(1)}s)`);
                    // Find corresponding mix-in point on target track
                    const targetTrack = targetDeck.track;
                    const correspondingMixIn = targetTrack.mixPoints?.find(mp =>
                        mp.type === 'in' &&
                        mp.pairTrackId === activeTrack.id &&
                        Math.abs(mp.score - nextMixOut.score) < 5 // Same quality transition
                    );

                    if (correspondingMixIn) {
                        console.log(`AutoDJ: Triggering mix - OUT at ${nextMixOut.time.toFixed(1)}s, IN at ${correspondingMixIn.time.toFixed(1)}s`);
                        this.startMixPointTransition(targetDeckId, correspondingMixIn.time);
                        return;
                    }
                }
            }

            // FALLBACK: Old behavior if no mix points - trigger at 30 seconds remaining
            if (remaining <= this.autoPilotThreshold && remaining > 0) {
                if (targetDeck.track) {
                    this.startAdvancedTransition(targetDeckId);
                }
            }
        }
    }

    /**
     * Start a transition using discovered mix points
     * Seeks target track to the mix-in point before starting transition
     * ENHANCED: Triggers FX pads during transition for creative mixing
     */
    async startMixPointTransition(targetDeckId: 'A' | 'B', mixInTime: number) {
        if (this.isMixing) return;
        this.isMixing = true;
        console.log(`AutoDJ: Starting Mix Point Transition to ${targetDeckId} at ${mixInTime.toFixed(1)}s`);

        const source = targetDeckId === 'A' ? this.deckB : this.deckA;
        const target = targetDeckId === 'A' ? this.deckA : this.deckB;
        const sourceEq = targetDeckId === 'A' ? this.mixer.eqB : this.mixer.eqA;
        const targetEq = targetDeckId === 'A' ? this.mixer.eqA : this.mixer.eqB;

        const now = Tone.now();
        const duration = this.transitionDuration;
        const halfDur = duration / 2;

        // 1. Prepare Target - Seek to mix-in point
        target.seek(mixInTime);
        target.setSpeed(source.player.playbackRate as number);

        // Kill Target Bass before starting
        targetEq.low.value = -40;
        targetEq.mid.value = 0;
        targetEq.high.value = 0;

        target.play();

        // 2. Initial Crossfader Setup
        const startX = targetDeckId === 'A' ? 1 : 0;
        const endX = targetDeckId === 'A' ? 0 : 1;

        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(startX, now);

        // 3. Phase 1: Bring in Target Highs/Mids + FX
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.5, now + halfDur);

        // ENHANCEMENT: Trigger SNARE at halfway point for rhythmic transition
        if (this.mixer.sampler) {
            setTimeout(() => {
                this.mixer.sampler?.trigger('SNARE');
            }, (halfDur * 1000) - 50); // Slightly early for tightness
        }

        // 4. Phase 2: The Bass Swap + KICK
        sourceEq.low.linearRampToValueAtTime(-40, now + halfDur + 0.5);
        targetEq.low.linearRampToValueAtTime(0, now + halfDur + 0.5);

        // ENHANCEMENT: Trigger KICK when bass drops
        if (this.mixer.sampler) {
            setTimeout(() => {
                this.mixer.sampler?.trigger('KICK');
            }, ((halfDur + 0.5) * 1000));
        }

        // 5. Phase 3: Complete the mix
        this.mixer.crossfader.fade.linearRampToValueAtTime(endX, now + duration);

        // 6. Cleanup
        setTimeout(() => {
            this.isMixing = false;
            this._activeDeckId = targetDeckId;
            source.pause();
            source.seek(0);
            // Reset source EQs
            sourceEq.low.value = 0;
            sourceEq.mid.value = 0;
            sourceEq.high.value = 0;
            console.log(`AutoDJ: Mix Point Transition to ${targetDeckId} complete.`);
        }, duration * 1000 + 500);
    }

    /**
     * Advanced "Smart EQ" Transition (Legacy - used when no mix points available)
     */
    async startAdvancedTransition(targetDeckId: 'A' | 'B') {
        if (this.isMixing) return;
        this.isMixing = true;
        console.log(`AutoDJ: Starting Advanced Transition to ${targetDeckId}`);

        const source = targetDeckId === 'A' ? this.deckB : this.deckA;
        const target = targetDeckId === 'A' ? this.deckA : this.deckB;
        const sourceEq = targetDeckId === 'A' ? this.mixer.eqB : this.mixer.eqA;
        const targetEq = targetDeckId === 'A' ? this.mixer.eqA : this.mixer.eqB;

        const now = Tone.now();
        const duration = this.transitionDuration;
        const halfDur = duration / 2;

        // 1. Prepare Target
        target.setSpeed(source.player.playbackRate as number);

        // Kill Target Bass before starting
        targetEq.low.value = -40;
        targetEq.mid.value = 0;
        targetEq.high.value = 0;

        target.play();

        // 2. Initial Crossfader Setup
        const startX = targetDeckId === 'A' ? 1 : 0;
        const endX = targetDeckId === 'A' ? 0 : 1;

        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(startX, now);

        // 3. Phase 1: Bring in Target Highs/Mids (Slowly move crossfader)
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.5, now + halfDur);

        // 4. Phase 2: The Bass Swap (Drop the Bass on Target, Cut on Source)
        sourceEq.low.linearRampToValueAtTime(-40, now + halfDur + 0.5);
        targetEq.low.linearRampToValueAtTime(0, now + halfDur + 0.5);

        // 5. Phase 3: Complete the mix
        this.mixer.crossfader.fade.linearRampToValueAtTime(endX, now + duration);

        // 6. Cleanup
        setTimeout(() => {
            this.isMixing = false;
            this._activeDeckId = targetDeckId;
            source.pause();
            source.seek(0);
            // Reset source EQs
            sourceEq.low.value = 0;
            sourceEq.mid.value = 0;
            sourceEq.high.value = 0;
            console.log(`AutoDJ: Advanced Transition to ${targetDeckId} complete.`);
        }, duration * 1000 + 500);
    }

    /**
     * Legacy method redirects to advanced
     */
    async startTransition(targetDeck: 'A' | 'B') {
        return this.startAdvancedTransition(targetDeck);
    }

    /**
     * Adjust target deck speed to match source deck BPM
     */
    syncBPM(source: Deck, target: Deck) {
        // Mock BPM if missing (standard house 128)
        const sourceBPM = source.track?.bpm || 128;
        const targetBPM = target.track?.bpm || 128;

        if (sourceBPM === targetBPM) return;

        // Calculate required playback rate
        // rate = sourceBPM / targetBPM
        const rate = sourceBPM / targetBPM;

        console.log(`AutoDJ: Syncing. Source: ${sourceBPM}, Target: ${targetBPM}, New Rate: ${rate.toFixed(2)}`);

        // Ramp playback rate for smooth pitch change? Or instant?
        // Instant for now to lock beat
        target.setSpeed(rate);
    }

    /**
     * Analyze mix points when both tracks are loaded
     * Runs in background and updates track mix points
     */
    async analyzeMixPoints() {
        console.log('=== ANALYZE MIX POINTS CALLED ===');
        const trackA = this.deckA.track;
        const trackB = this.deckB.track;

        console.log(`TrackA: ${trackA?.title}, TrackB: ${trackB?.title}`);

        if (!trackA || !trackB) {
            console.log('AutoDJ: Cannot analyze - need both tracks loaded');
            return;
        }

        // Don't re-analyze if we already have mix points for this pair
        const existingPair = trackA.mixPoints?.find(mp => mp.pairTrackId === trackB.id);
        if (existingPair) {
            console.log('AutoDJ: Mix points already analyzed for this track pair');
            return;
        }

        console.log('AutoDJ: Analyzing mix points in background...');

        try {
            const result = await mixPointAnalyzer.analyzeTracks(
                { ...trackA, duration: this.deckA.duration },
                { ...trackB, duration: this.deckB.duration }
            );

            // Update the tracks with discovered mix points
            this.deckA.updateTrackMixPoints(result.trackA.mixPoints || []);
            this.deckB.updateTrackMixPoints(result.trackB.mixPoints || []);

            console.log(`AutoDJ: Discovered ${result.trackA.mixPoints?.length || 0} mix points for "${trackA.title}"`);
            console.log(`AutoDJ: Discovered ${result.trackB.mixPoints?.length || 0} mix points for "${trackB.title}"`);
        } catch (error) {
            console.error('AutoDJ: Mix point analysis failed:', error);
        }
    }

    /**
     * Simple energy detection or time-remaining check could go here
     */
    update() {
        // Called periodically to check if we need to mix out
    }
}

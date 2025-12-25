import type { Deck } from './Deck';
import type { Mixer } from './Mixer';
import { mixPointAnalyzer } from './mixPointAnalysis';
import { TransitionEngine } from './TransitionEngine';
import { TransitionSelector } from './TransitionSelector';
import type { TransitionParams } from './types';

export class AutoDJ {
    private deckA: Deck;
    private deckB: Deck;
    private mixer: Mixer;

    // Config
    private transitionDuration: number = 8; // Longer for smoother EQ mix
    private autoPilotThreshold: number = 10; // seconds remaining to trigger mix
    public isMixing: boolean = false;
    private _isAutoPilot: boolean = false; // Renamed to _autoPilotEnabled in instruction, but keeping original name for consistency with getters/setters
    private _activeDeckId: 'A' | 'B' = 'A';
    private _monitorInterval: number | null = null; // Changed type from any to number | null
    private _timeRemaining: number = 0;
    private _lastMixInPosition: number = 0; // The track position (seconds) where the current mix-in occurred

    // New: Advanced transition system
    private transitionEngine: TransitionEngine;
    private transitionSelector: TransitionSelector;

    // Debug
    private _lastDebugInterval: number = 0;

    // Track Counting for Session Management
    // REMOVED static counters (_totalTracksToPlay, _tracksPlayed) in favor of dynamic queue checking

    constructor(deckA: Deck, deckB: Deck, mixer: Mixer) {
        this.deckA = deckA;
        this.deckB = deckB;
        this.mixer = mixer;

        // Initialize transition system
        this.transitionEngine = new TransitionEngine(deckA, deckB, mixer);
        this.transitionSelector = new TransitionSelector();
    }

    public get isAutoPilot() { return this._isAutoPilot; }
    public get timeRemaining() { return this._timeRemaining; }
    public get mixingStatus() { return this.isMixing; }
    public get activeDeckId() { return this._activeDeckId; }

    public async toggleAutoPilot() {
        this._isAutoPilot = !this._isAutoPilot;
        console.log(`AutoDJ: Auto-Pilot is now ${this._isAutoPilot ? 'ON' : 'OFF'}`);

        if (this._isAutoPilot) {
            // "One-Click Start" logic:
            if (!this.deckA.isPlaying && !this.deckB.isPlaying) {
                if (this.deckA.track) {
                    this.mixer.setCrossfader(0);
                    this.deckA.play();
                    this._activeDeckId = 'A';
                    this._lastMixInPosition = this.deckA.currentTime;
                } else if (this.deckB.track) {
                    this.mixer.setCrossfader(1);
                    this.deckB.play();
                    this._activeDeckId = 'B';
                    this._lastMixInPosition = this.deckB.currentTime;
                }
            }

            // INITIALIZE TRACK COUNTER
            // REMOVED: No longer relying on static count. We check queue dynamically.
            console.log(`AutoDJ: Session Started. Auto-Pilot Active.`);

            this.mixer.startRecording();
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

    /**
     * Monitor active deck playback for mix points
     */
    private async monitor() {
        if (!this._isAutoPilot || this.isMixing) return;

        const activeDeck = this._activeDeckId === 'A' ? this.deckA : this.deckB;
        const targetDeckId = this._activeDeckId === 'A' ? 'B' : 'A';
        const targetDeck = targetDeckId === 'A' ? this.deckA : this.deckB;

        // Debug logging every 5 seconds
        const debugInterval = Math.floor(Date.now() / 5000);
        if (this._lastDebugInterval !== debugInterval) {
            this._lastDebugInterval = debugInterval;
            console.log(`[Monitor Debug] Active: ${this._activeDeckId}, Playing: ${activeDeck.isPlaying}, Track: ${activeDeck.track?.title || 'none'}, Time: ${activeDeck.currentTime.toFixed(1)}s`);
            console.log(`[Monitor Debug] Target: ${targetDeckId}, Playing: ${targetDeck.isPlaying}, Track: ${targetDeck.track?.title || 'none'}`);
        }

        if (activeDeck.isPlaying && activeDeck.duration > 0) {
            const currentTime = activeDeck.currentTime;
            const playbackDuration = currentTime - this._lastMixInPosition;
            const remaining = activeDeck.duration - currentTime;
            this._timeRemaining = Math.max(0, remaining);

            // GRACE PERIOD: Enforce 15s minimum playback before searching for next mix-out
            const isGracePeriodOver = playbackDuration >= 15;

            // NEW: Check if we've reached any mix-out points
            const activeTrack = activeDeck.track;

            // If no target track (queue empty/unloaded), check if we can load from queue now
            if (!targetDeck.track) {
                try {
                    const { useStore } = await import('../store/useStore');
                    const nextTrack = useStore.getState().popNextFromQueue();
                    if (nextTrack) {
                        console.log(`AutoDJ: Target deck empty, loading late arrival from queue: ${nextTrack.title}`);
                        await targetDeck.load(nextTrack);
                        await this.analyzeMixPoints();
                        return; // Let next monitor loop handle mix points
                    }
                } catch (e) {
                    console.warn('AutoDJ: Lazy queue check failed', e);
                }

                if (remaining < 2) { // 2 seconds before end
                    // END OF SESSION CHECK
                    // If queue is empty AND target deck is empty, we are done.
                    try {
                        const { useStore } = await import('../store/useStore');
                        const queueLength = useStore.getState().queue.length;

                        if (queueLength === 0 && !targetDeck.track) {
                            console.log(`AutoDJ: Queue empty & Target empty. Ending Session.`);
                            // Ensure we finish cleanly
                            this.finishSession();
                        } else {
                            // If we are here, we SHOULD have another track. If monitors failed to transition, force it now.
                            // Only warn if target IS loaded but we missed the mix point
                            if (targetDeck.track) {
                                console.log(`AutoDJ: Track ending. Warning: forcing transition if possible.`);
                                if (!this.isMixing) {
                                    this.triggerManualTransition(this._activeDeckId === 'A' ? 'B' : 'A');
                                }
                            }
                        }
                    } catch (e) {
                        console.error("AutoDJ: Error checking queue state", e);
                    }
                }
                return;
            }

            if (isGracePeriodOver && activeTrack?.mixPoints && targetDeck.track) {
                // Debug log every 5 seconds
                if (Math.floor(currentTime) % 5 === 0 && currentTime % 1 < 0.5) {
                    console.log(`[Monitor] t=${currentTime.toFixed(1)}s. Monitoring for mix points...`);
                }
                // NEW: Check if we've reached any mix-out points
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
                    let correspondingMixIn = targetTrack.mixPoints?.find(mp =>
                        mp.type === 'in' &&
                        mp.pairTrackId === activeTrack.id &&
                        (mp.score !== undefined && nextMixOut.score !== undefined) &&
                        Math.abs(mp.score - nextMixOut.score) < 5 // Same quality transition
                    );

                    if (!correspondingMixIn) {
                        console.warn(`[Monitor] Mix-out found at ${nextMixOut.time}, but NO matching Mix-in for ${activeTrack.id} on target track!`);
                    } else {
                        console.log(`AutoDJ: Triggering mix - OUT at ${nextMixOut.time.toFixed(1)}s, IN at ${correspondingMixIn.time.toFixed(1)}s`);
                        this.isMixing = true;

                        // NEW: Use TransitionEngine with intelligent selection
                        const transitionType = this.transitionSelector.selectTransition(
                            nextMixOut,
                            activeTrack,
                            targetTrack
                        );

                        console.log(`AutoDJ: Selected transition type: ${transitionType}`);

                        const params: TransitionParams = {
                            duration: this.transitionDuration,
                            type: transitionType,
                            mixOutPoint: nextMixOut.time,
                            mixInPoint: correspondingMixIn.time,
                            sourceBpm: activeTrack.bpm || 120,
                            targetBpm: targetTrack.bpm || 120
                        };

                        // CRITICAL: Await transition completion
                        console.log(`AutoDJ: Starting ${transitionType} transition...`);
                        await this.transitionEngine.executeTransition(params, activeDeck, targetDeck);
                        console.log(`AutoDJ: Transition promise resolved`);

                        // Handover to unified handler
                        await this._onTransitionComplete(targetDeckId, params.mixInPoint || 0);
                        return;
                    }
                }
            } else {
                if (Math.floor(currentTime) % 5 === 0 && currentTime % 1 < 0.5) {
                    console.log(`[Monitor] Skipping Check: GracePeriod=${isGracePeriodOver}, HasPoints=${!!activeTrack?.mixPoints}, TargetLoaded=${!!targetDeck.track}`);
                }
            }

            // FALLBACK: Behavior if no mix points - trigger at 30 seconds remaining
            if (remaining <= this.autoPilotThreshold && remaining > 0) {
                if (targetDeck.track && !this.isMixing) {
                    this.isMixing = true;
                    console.log(`AutoDJ: Falling back to standard SLAM_CUT transition (no mix points found)`);

                    const params: TransitionParams = {
                        duration: 4, // Shorter for fallback
                        type: 'SLAM_CUT',
                        mixOutPoint: (activeTrack?.duration || 0) - 4,
                        mixInPoint: 0,
                        sourceBpm: activeTrack?.bpm || 120,
                        targetBpm: targetDeck.track.bpm || 120
                    };

                    (async () => {
                        await this.transitionEngine.executeTransition(params, activeDeck, targetDeck);
                        // Unified completion handler
                        await this._onTransitionComplete(targetDeckId, params.mixInPoint || 0);
                    })();
                }
            }
        }
    }




    /**
     * Trigger a manual transition to a specific deck
     */
    async triggerManualTransition(targetDeckId: 'A' | 'B') {
        if (this.isMixing) return;
        this.isMixing = true;

        const activeDeck = targetDeckId === 'A' ? this.deckB : this.deckA;
        const targetDeck = targetDeckId === 'A' ? this.deckA : this.deckB;
        const activeTrack = activeDeck.track;

        if (!activeTrack || !targetDeck.track) {
            this.isMixing = false;
            return;
        }

        const params: TransitionParams = {
            duration: this.transitionDuration,
            type: 'SLAM_CUT', // Default manual transition
            mixOutPoint: activeDeck.currentTime,
            mixInPoint: 0,
            sourceBpm: activeTrack.bpm || 120,
            targetBpm: targetDeck.track.bpm || 120
        };

        await this.transitionEngine.executeTransition(params, activeDeck, targetDeck);

        // Unified completion handler
        await this._onTransitionComplete(targetDeckId, params.mixInPoint || 0);
    }

    /**
     * Sync BPM between source and target
     */
    syncBPM(source: Deck, target: Deck) {
        if (!source.track || !target.track) return;
        const sourceBpm = source.track.bpm || 128;
        const targetBpm = target.track.bpm || 128;
        target.setSpeed(sourceBpm / targetBpm);
        console.log(`AutoDJ: Synced Deck ${target === this.deckA ? 'A' : 'B'} to ${sourceBpm} BPM`);
    }

    /**
     * Analyze mix points when both tracks are loaded
     * Runs in background and updates track mix points
     */
    async analyzeMixPoints() {
        console.log('=== ANALYZE MIX POINTS CALLED ===');
        const activeDeck = this._activeDeckId === 'A' ? this.deckA : this.deckB;
        const targetDeck = this._activeDeckId === 'A' ? this.deckB : this.deckA;

        const sourceTrack = activeDeck.track;
        const targetTrack = targetDeck.track;

        console.log(`Source: ${sourceTrack?.title}, Target: ${targetTrack?.title}`);

        if (!sourceTrack || !targetTrack) {
            console.log('AutoDJ: Cannot analyze - need both tracks loaded');
            return;
        }

        // Don't re-analyze if we already have mix points for this specific directional pairing
        const existingPair = sourceTrack.mixPoints?.find(mp => mp.pairTrackId === targetTrack.id && mp.type === 'out');
        if (existingPair) {
            console.log('AutoDJ: Mix points already analyzed for this directional pair');
            return;
        }

        console.log(`AutoDJ: Analyzing directional mix points (${this._activeDeckId} -> ${this._activeDeckId === 'A' ? 'B' : 'A'})...`);

        try {
            const result = await mixPointAnalyzer.analyzeTracks(
                { ...sourceTrack, duration: activeDeck.duration },
                { ...targetTrack, duration: targetDeck.duration }
            );

            // Update the tracks with discovered mix points
            activeDeck.updateTrackMixPoints(result.source.mixPoints || []);
            targetDeck.updateTrackMixPoints(result.target.mixPoints || []);

            console.log(`AutoDJ: Discovered ${result.source.mixPoints?.length || 0} mix-out points for "${sourceTrack.title}"`);
            console.log(`AutoDJ: Discovered ${result.target.mixPoints?.length || 0} mix-in points for "${targetTrack.title}"`);
        } catch (error) {
            console.error('AutoDJ: Mix point analysis failed:', error);
        }
    }

    /**
     * UNIFIED HANDLER: Call this after ANY transition (Main, Fallback, Manual) finishes.
     * Handles: State update, Track Counter, Queue Loading, and Unlocking.
     */
    private async _onTransitionComplete(targetDeckId: 'A' | 'B', mixInPoint: number) {
        console.log(`AutoDJ: Transition Complete. Handover to Deck ${targetDeckId}.`);

        // 1. Update Monitor State
        this._activeDeckId = targetDeckId;
        this._lastMixInPosition = mixInPoint;

        // 2. Increment Session Counter
        // this._tracksPlayed++; // Deprecated
        console.log(`AutoDJ: Track Finished. Handshake complete.`);

        // 3. Queue Loading Logic
        try {
            const { useStore } = await import('../store/useStore');
            const queueLength = useStore.getState().queue.length;

            const freeDeck = this._activeDeckId === 'A' ? this.deckB : this.deckA;
            const freeDeckId = this._activeDeckId === 'A' ? 'B' : 'A';

            console.log(`AutoDJ: Transition verification - Active: ${this._activeDeckId}, Free: ${freeDeckId}`);

            // Unload old track immediately
            freeDeck.unload();

            if (queueLength > 0) {
                console.log(`AutoDJ: Queue has ${queueLength} items. Popping next...`);
                const nextTrack = useStore.getState().popNextFromQueue();

                if (nextTrack) {
                    console.log(`AutoDJ: Loading "${nextTrack.title}" onto Free Deck (${freeDeckId})...`);
                    await freeDeck.load(nextTrack);
                    console.log(`AutoDJ: Load Complete. Deck ${freeDeckId} now has "${freeDeck.track?.title}"`);

                    // Trigger analysis for the new pair
                    await this.analyzeMixPoints();
                }
            } else {
                console.log(`AutoDJ: Queue empty. Deck ${freeDeckId} remains awaiting next track.`);
            }
        } catch (e) {
            console.error('AutoDJ: CRITICAL QUEUE ERROR', e);
        }

        // 4. FINALLY: Unlock
        console.log(`AutoDJ: State updated - Active Deck is now ${targetDeckId}, Lock Released.`);
        this.isMixing = false;
    }

    /**
     * Simple energy detection or time-remaining check could go here
     */
    update() {
        // Called periodically to check if we need to mix out
    }

    /**
     * End the Auto-DJ session, stop recording, and save.
     */
    async finishSession() {
        console.log('AutoDJ: Finishing session...');
        this.toggleAutoPilot(); // Off

        // Stop both decks
        this.deckA.pause();
        this.deckB.pause();

        // Download recording
        await this.mixer.downloadRecording('DJ_Mann_Session_Mix.webm');
    }
}

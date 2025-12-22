import * as Tone from 'tone';
import type { Deck } from './Deck';
import type { Mixer } from './Mixer';
import type { TransitionParams } from './types';

export class TransitionEngine {
    private deckA: Deck;
    // deckB stored for future multi-transition support
    private mixer: Mixer;

    constructor(deckA: Deck, _deckB: Deck, mixer: Mixer) {
        this.deckA = deckA;
        this.mixer = mixer;
    }

    /**
     * Execute a transition with the specified parameters
     */
    async executeTransition(params: TransitionParams, sourceDeck: Deck, targetDeck: Deck): Promise<void> {
        console.log(`TransitionEngine: Executing ${params.type} transition`);

        switch (params.type) {
            case 'ECHO_OUT':
                await this.echoOutTransition(params, sourceDeck, targetDeck);
                break;
            case 'LOOP_ROLL':
                await this.loopRollTransition(params, sourceDeck, targetDeck);
                break;
            case 'SLAM_CUT':
                await this.slamCutTransition(params, sourceDeck, targetDeck);
                break;
            case 'SCRATCH':
                await this.scratchTransition(params, sourceDeck, targetDeck);
                break;
            case 'ACAPELLA':
                await this.acapellaTransition(params, sourceDeck, targetDeck);
                break;
            case 'VINYL_BRAKE':
                await this.vinylBrakeTransition(params, sourceDeck, targetDeck);
                break;
            case 'BUILD_CUT':
                await this.buildCutTransition(params, sourceDeck, targetDeck);
                break;
            case 'SMART_EQ':
                // Falls back to existing Smart EQ transition
                console.log('Using Smart EQ transition (legacy)');
                break;
            default:
                console.warn(`Unknown transition type: ${params.type}`);
        }
    }

    /**
     * ECHO OUT: Apply increasing delay/reverb to outgoing track
     */
    private async echoOutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now();
        const duration = params.duration;

        // Prepare target
        target.seek(params.mixInPoint);
        target.play();

        // Phase 1 (0-50%): Gradually add delay to source
        source.delay.wet.setValueAtTime(0, now);
        source.delay.wet.linearRampToValueAtTime(0.6, now + duration * 0.5);
        source.delay.feedback.setValueAtTime(0, now);
        source.delay.feedback.linearRampToValueAtTime(0.7, now + duration * 0.5);

        // Phase 2 (50-100%): Increase feedback, cut dry signal, bring in target
        source.delay.feedback.linearRampToValueAtTime(0.9, now + duration);
        source.player.volume.linearRampToValueAtTime(-40, now + duration);
        target.player.volume.setValueAtTime(-40, now);
        target.player.volume.linearRampToValueAtTime(0, now + duration);

        setTimeout(() => {
            source.pause();
            source.delay.wet.value = 0;
            source.delay.feedback.value = 0;
            source.player.volume.value = 0;
            console.log('Echo Out transition complete');
        }, duration * 1000 + 500);
    }

    /**
     * LOOP ROLL: Progressive loop shortening with filter sweep
     */
    private async loopRollTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now();
        const bpm = params.sourceBpm;
        const beatDuration = 60 / bpm;

        // Calculate loop points (4, 2, 1, 1/2 bar)
        const loopDurations = [beatDuration * 16, beatDuration * 8, beatDuration * 4, beatDuration * 2];
        const intervalDuration = params.duration / 4;

        // Prepare target
        target.seek(params.mixInPoint);

        // Execute progressive loops
        for (let i = 0; i < loopDurations.length; i++) {
            const startTime = now + (i * intervalDuration);
            const loopLength = loopDurations[i];
            const currentPos = source.currentTime;

            // Set loop
            source.setLoop(currentPos, currentPos + loopLength);
            source.toggleLoop(true);

            // Filter sweep (low-pass closing)
            source.filter.frequency.setValueAtTime(20000, startTime);
            source.filter.frequency.exponentialRampToValueAtTime(500, startTime + intervalDuration);

            // Trigger FX sample on loop point
            if (this.mixer.sampler && i < loopDurations.length - 1) {
                setTimeout(() => {
                    this.mixer.sampler?.trigger(i % 2 === 0 ? 'KICK' : 'SNARE');
                }, (i * intervalDuration) * 1000);
            }
        }

        // Final: Hard cut to target with CRASH
        setTimeout(() => {
            source.clearLoop();
            source.pause();
            source.filter.frequency.value = 20000;
            target.play();
            this.mixer.sampler?.trigger('CRASH');
            console.log('Loop Roll transition complete');
        }, params.duration * 1000);
    }

    /**
     * SLAM CUT: Beat-synced instant switch with filter swap
     */
    private async slamCutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now();
        const duration = params.duration;

        // Prepare both tracks
        target.seek(params.mixInPoint);

        // Phase 1 (0-80%): Filter opposing frequencies
        source.filter.type = 'highpass';
        target.filter.type = 'lowpass';

        source.filter.frequency.setValueAtTime(20, now);
        source.filter.frequency.exponentialRampToValueAtTime(800, now + duration * 0.8);

        target.filter.frequency.setValueAtTime(20000, now);
        target.filter.frequency.exponentialRampToValueAtTime(800, now + duration * 0.8);
        target.player.volume.value = 0;

        // Phase 2 (80%): Instant hard cut with CRASH
        setTimeout(() => {
            source.pause();
            source.filter.type = 'lowpass';
            source.filter.frequency.value = 20000;
            target.play();
            target.filter.type = 'lowpass';
            target.filter.frequency.value = 20000;
            this.mixer.sampler?.trigger('CRASH');
            console.log('Slam Cut transition complete');
        }, duration * 0.8 * 1000);
    }

    /**
     * SCRATCH: Simulate turntable scratching with playback rate changes
     */
    private async scratchTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now();
        const duration = params.duration;
        const scratchPattern = [1, 0.5, 2, -0.5, 1, 0.5, 2, 1]; // Chirp pattern
        const scratchInterval = duration / scratchPattern.length;

        // Prepare target
        target.seek(params.mixInPoint);

        // Execute scratch pattern
        scratchPattern.forEach((rate, index) => {
            setTimeout(() => {
                source.player.playbackRate = Math.abs(rate);
                if (rate < 0) {
                    source.player.reverse = true;
                } else {
                    source.player.reverse = false;
                }
            }, (index * scratchInterval) * 1000);
        });

        // Fade in target during scratch
        target.player.volume.setValueAtTime(-40, now);
        target.player.volume.linearRampToValueAtTime(0, now + duration);
        target.play();

        setTimeout(() => {
            source.pause();
            source.player.playbackRate = 1;
            source.player.reverse = false;
            console.log('Scratch transition complete');
        }, duration * 1000 + 100);
    }

    /**
     * ACAPELLA: Isolate vocals on source, blend over target intro
     */
    private async acapellaTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now();
        const duration = params.duration;

        // Prepare target
        target.seek(params.mixInPoint);
        target.play();

        // Phase 1 (0-40%): Isolate vocals with band-pass (300Hz-3kHz)
        source.filter.type = 'bandpass';
        source.filter.frequency.setValueAtTime(1650, now); // Center of vocal range
        source.filter.Q.setValueAtTime(2, now); // Narrow band

        // Phase 2 (40-100%): Gradually open target instrumental, fade vocals
        setTimeout(() => {
            target.player.volume.linearRampToValueAtTime(0, now + duration);
            source.player.volume.linearRampToValueAtTime(-40, now + duration);
        }, duration * 0.4 * 1000);

        setTimeout(() => {
            source.pause();
            source.filter.type = 'lowpass';
            source.filter.frequency.value = 20000;
            source.filter.Q.value = 1;
            source.player.volume.value = 0;
            console.log('Acapella transition complete');
        }, duration * 1000 + 500);
    }

    /**
     * VINYL BRAKE: Exponential spindown simulation
     */
    private async vinylBrakeTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const duration = params.duration;

        // Prepare target
        target.seek(params.mixInPoint);

        // Exponential spindown (not linear!)
        const initialRate = source.player.playbackRate as number;
        source.player.playbackRate = initialRate;

        // Create exponential curve manually with steps
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
            const rate = initialRate * (1 - easedProgress);
            const timeOffset = (duration * progress) * 1000;

            setTimeout(() => {
                source.player.playbackRate = Math.max(0.01, rate);
                // Close filter with spindown
                const filterFreq = 20000 * (1 - easedProgress);
                source.filter.frequency.value = Math.max(80, filterFreq);
            }, timeOffset);
        }

        // Start target at normal speed
        setTimeout(() => {
            target.play();
            target.player.volume.value = 0;
        }, duration * 0.5 * 1000);

        setTimeout(() => {
            source.pause();
            source.player.playbackRate = 1;
            source.filter.frequency.value = 20000;
            console.log('Vinyl Brake transition complete');
        }, duration * 1000 + 500);
    }

    /**
     * BUILD CUT: Use buildup section, drop bass on peak
     */
    private async buildCutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const duration = params.duration;
        const now = Tone.now();

        // Prepare target at buildup section
        target.seek(params.mixInPoint);
        target.play();

        // Kill target bass during buildup
        const targetEq = target === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        targetEq.low.setValueAtTime(-40, now);
        targetEq.high.setValueAtTime(3, now); // Boost highs

        // Cut source at low-energy moment
        source.pause();

        // Drop the bass on peak (80% through transition)
        setTimeout(() => {
            targetEq.low.linearRampToValueAtTime(0, now + duration);
            targetEq.high.linearRampToValueAtTime(0, now + duration);
            this.mixer.sampler?.trigger('KICK');
        }, duration * 0.8 * 1000);

        setTimeout(() => {
            console.log('Build Cut transition complete');
        }, duration * 1000);
    }
}

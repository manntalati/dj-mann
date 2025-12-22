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
        console.log(`TransitionEngine: Executing ${params.type} transition (Liquid Precision 2.0)`);

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
            default:
                console.warn(`Unknown transition type: ${params.type}`);
        }
    }

    /**
     * ECHO OUT: Sample-accurate scheduling for echo tail mix
     */
    private async echoOutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1; // Add tiny buffer for jitter-free start
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. SCHEDULE TARGET START
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. MIX DYNAMICS
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // 3. SOURCE FX AUTOMATION
        source.delay.wet.setValueAtTime(0, now);
        source.delay.wet.linearRampToValueAtTime(0.7, now + duration * 0.4);
        source.delay.feedback.setValueAtTime(0, now);
        source.delay.feedback.linearRampToValueAtTime(0.8, now + duration * 0.4);

        // 4. SOURCE FADE OUT
        source.player.volume.cancelScheduledValues(now);
        source.player.volume.setValueAtTime(source.player.volume.value, now);
        source.player.volume.linearRampToValueAtTime(-40, now + duration * 0.8);
        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.delay.wet.value = 0;
                source.delay.feedback.value = 0;
                source.player.volume.value = 0;
                resolve();
            }, (duration + 1) * 1000);
        });
    }

    /**
     * LOOP ROLL: Synchronized rhythmic loops
     */
    private async loopRollTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const bpm = params.sourceBpm;
        const beatDuration = 60 / bpm;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. GRADUAL CROSSFADE
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.5, now + duration * 0.5);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // 3. PROGRESSIVE ROLL
        const loopDurations = [beatDuration * 16, beatDuration * 8, beatDuration * 4, beatDuration * 2];
        const intervalDuration = duration / 4;

        loopDurations.forEach((loopLength, i) => {
            const timeOffset = i * intervalDuration;
            const scheduledTime = now + timeOffset;

            // Schedule rhythmic samples using Tone.ms for precise trigger
            if (this.mixer.sampler && i < loopDurations.length - 1) {
                this.mixer.sampler.trigger(i % 2 === 0 ? 'KICK' : 'SNARE', scheduledTime);
            }

            // Update loop point at exact scheduled time
            Tone.Draw.schedule(() => {
                const currentPos = source.currentTime;
                source.setLoop(currentPos, currentPos + loopLength);
                source.toggleLoop(true);
            }, scheduledTime);

            // Filter sweep
            source.filter.frequency.exponentialRampToValueAtTime(400, scheduledTime + intervalDuration);
        });

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.clearLoop();
                source.filter.frequency.value = 20000;
                source.seek(0);
                if (this.mixer.sampler) this.mixer.sampler.trigger('CRASH', Tone.now());
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * SLAM CUT: Instant energy handoff
     */
    private async slamCutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. MIX BEFORE SLAM
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.5, now + duration * 0.4);

        // 3. FREQUENCY SEPARATION
        source.filter.type = 'highpass';
        target.filter.type = 'lowpass';
        source.filter.frequency.setValueAtTime(20, now);
        source.filter.frequency.exponentialRampToValueAtTime(1000, now + duration * 0.7);
        target.filter.frequency.setValueAtTime(20000, now);
        target.filter.frequency.exponentialRampToValueAtTime(1000, now + duration * 0.7);

        // 4. THE SLAM
        const slamTime = now + duration * 0.7;
        this.mixer.crossfader.fade.setValueAtTime(targetX, slamTime);
        source.stopAt(slamTime);

        // Reset filters
        source.filter.frequency.setValueAtTime(20000, slamTime);
        target.filter.frequency.setValueAtTime(20000, slamTime);

        if (this.mixer.sampler) this.mixer.sampler.trigger('CRASH', slamTime);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.filter.type = 'lowpass';
                target.filter.type = 'lowpass';
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * SCRATCH: Synchronized rate changes
     */
    private async scratchTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        target.playAt(now, params.mixInPoint);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        const scratchPattern = [1, 0.5, 2, -0.5, 1, 0.5, 2, 1];
        const interval = duration / scratchPattern.length;

        scratchPattern.forEach((rate, i) => {
            const time = now + (i * interval);
            Tone.Draw.schedule(() => {
                source.player.playbackRate = Math.abs(rate);
                source.player.reverse = rate < 0;
            }, time);
        });

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.player.playbackRate = 1;
                source.player.reverse = false;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * ACAPELLA: Precise vocal blend
     */
    private async acapellaTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        target.playAt(now, params.mixInPoint);
        source.filter.type = 'bandpass';
        source.filter.frequency.setValueAtTime(1650, now);
        source.filter.Q.setValueAtTime(2, now);

        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);
        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.filter.type = 'lowpass';
                source.filter.frequency.value = 20000;
                source.filter.Q.value = 1;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * VINYL BRAKE: exponential spindown
     */
    private async vinylBrakeTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        target.playAt(now, params.mixInPoint);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        const initialRate = source.player.playbackRate as number;
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const eased = Math.pow(progress, 2);
            const time = now + (duration * progress);

            Tone.Draw.schedule(() => {
                source.player.playbackRate = Math.max(0.001, initialRate * (1 - eased));
                source.filter.frequency.value = Math.max(100, 20000 * (1 - eased));
            }, time);
        }

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.player.playbackRate = 1;
                source.filter.frequency.value = 20000;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * BUILD CUT: Energy swap on drop
     */
    private async buildCutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        target.playAt(now, params.mixInPoint);
        const targetEq = target === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        targetEq.low.setValueAtTime(-40, now);

        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // Energy drop at 80%
        const dropTime = now + duration * 0.8;
        source.stopAt(dropTime);
        targetEq.low.linearRampToValueAtTime(0, dropTime + 0.1);

        if (this.mixer.sampler) this.mixer.sampler.trigger('KICK', dropTime);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }
}

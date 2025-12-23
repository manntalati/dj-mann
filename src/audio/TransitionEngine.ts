import * as Tone from 'tone';
import type { Deck } from './Deck';
import type { Mixer } from './Mixer';
import type { TransitionParams } from './types';

export class TransitionEngine {
    private deckA: Deck;
    private mixer: Mixer;

    constructor(deckA: Deck, _deckB: Deck, mixer: Mixer) {
        this.deckA = deckA;
        this.mixer = mixer;
    }

    /**
     * Execute a transition with the specified parameters
     */
    async executeTransition(params: TransitionParams, sourceDeck: Deck, targetDeck: Deck): Promise<void> {
        console.log(`TransitionEngine: Executing ${params.type} transition (Enhanced)`);

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
                await this.smartEqTransition(params, sourceDeck, targetDeck);
                break;
            case 'GRADUAL_CROSSFADE':
                await this.gradualCrossfadeTransition(params, sourceDeck, targetDeck);
                break;
            case 'REVERB_WASH':
                await this.reverbWashTransition(params, sourceDeck, targetDeck);
                break;
            case 'PHASER_BUILD':
                await this.phaserBuildTransition(params, sourceDeck, targetDeck);
                break;
            case 'BEAT_MATCHED':
                await this.beatMatchedTransition(params, sourceDeck, targetDeck);
                break;
            default:
                console.warn(`Unknown transition type: ${params.type}`);
        }
    }

    /**
     * ECHO OUT: Enhanced echo tail with smoother feedback curves
     */
    private async echoOutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. SCHEDULE TARGET START
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. GRADUAL CROSSFADE with smoother curve
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        // Use exponential curve for smoother transition
        this.mixer.crossfader.fade.exponentialRampToValueAtTime(targetX, now + duration);

        // 3. ENHANCED SOURCE FX AUTOMATION - smoother curves
        source.delay.wet.setValueAtTime(0, now);
        // Gradual build-up, then hold, then fade
        source.delay.wet.linearRampToValueAtTime(0.5, now + duration * 0.3);
        source.delay.wet.linearRampToValueAtTime(0.8, now + duration * 0.5);
        source.delay.wet.exponentialRampToValueAtTime(0, now + duration * 0.9);
        
        source.delay.feedback.setValueAtTime(0, now);
        source.delay.feedback.linearRampToValueAtTime(0.6, now + duration * 0.3);
        source.delay.feedback.linearRampToValueAtTime(0.85, now + duration * 0.5);
        source.delay.feedback.exponentialRampToValueAtTime(0, now + duration * 0.9);

        // 4. SMOOTHER SOURCE FADE OUT
        source.player.volume.cancelScheduledValues(now);
        source.player.volume.setValueAtTime(source.player.volume.value, now);
        source.player.volume.linearRampToValueAtTime(-20, now + duration * 0.6);
        source.player.volume.exponentialRampToValueAtTime(-60, now + duration);
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
     * LOOP ROLL: Enhanced beat-synced loops with better rhythmic alignment
     */
    private async loopRollTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const bpm = params.sourceBpm;
        const beatDuration = 60 / bpm;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET with volume automation
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);
        target.player.volume.linearRampToValueAtTime(0, now + duration * 0.4);
        target.player.volume.linearRampToValueAtTime(0, now + duration);

        // 2. GRADUAL CROSSFADE with beat-synced timing
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.5, now + duration * 0.5);
        this.mixer.crossfader.fade.exponentialRampToValueAtTime(targetX, now + duration);

        // 3. ENHANCED PROGRESSIVE ROLL - beat-synced
        const loopDurations = [beatDuration * 16, beatDuration * 8, beatDuration * 4, beatDuration * 2, beatDuration];
        const intervalDuration = duration / loopDurations.length;

        loopDurations.forEach((loopLength, i) => {
            const timeOffset = i * intervalDuration;
            const scheduledTime = now + timeOffset;

            // Schedule rhythmic samples
            if (this.mixer.sampler && i < loopDurations.length - 1) {
                this.mixer.sampler.trigger(i % 2 === 0 ? 'KICK' : 'SNARE', scheduledTime);
            }

            // Update loop point at exact scheduled time - aligned to beat
            Tone.Draw.schedule(() => {
                const currentPos = source.currentTime;
                // Snap to beat boundary for cleaner loops
                const snappedPos = Math.floor(currentPos / beatDuration) * beatDuration;
                source.setLoop(snappedPos, snappedPos + loopLength);
                source.toggleLoop(true);
            }, scheduledTime);

            // Enhanced filter sweep with resonance
            source.filter.Q.setValueAtTime(2 + (i * 0.5), scheduledTime);
            source.filter.frequency.exponentialRampToValueAtTime(300 + (i * 50), scheduledTime + intervalDuration);
        });

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.clearLoop();
                source.filter.frequency.value = 20000;
                source.filter.Q.value = 1;
                source.seek(0);
                if (this.mixer.sampler) this.mixer.sampler.trigger('CRASH', Tone.now());
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * SLAM CUT: Enhanced frequency separation with smoother EQ curves
     */
    private async slamCutTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);
        target.player.volume.linearRampToValueAtTime(0, now + duration * 0.7);

        // 2. MIX BEFORE SLAM - smoother curve
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.4, now + duration * 0.3);
        this.mixer.crossfader.fade.linearRampToValueAtTime(0.5, now + duration * 0.6);

        // 3. ENHANCED FREQUENCY SEPARATION with EQ automation
        const sourceEq = source === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        const targetEq = target === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        
        // Source: High-pass with low-end reduction
        source.filter.type = 'highpass';
        source.filter.frequency.setValueAtTime(20, now);
        source.filter.frequency.exponentialRampToValueAtTime(800, now + duration * 0.6);
        source.filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.7);
        
        // Reduce source low-end via EQ
        sourceEq.low.setValueAtTime(0, now);
        sourceEq.low.linearRampToValueAtTime(-12, now + duration * 0.6);
        sourceEq.low.linearRampToValueAtTime(-20, now + duration * 0.7);
        
        // Target: Low-pass initially, then open up
        target.filter.type = 'lowpass';
        target.filter.frequency.setValueAtTime(20000, now);
        target.filter.frequency.setValueAtTime(20000, now + duration * 0.6);
        target.filter.frequency.exponentialRampToValueAtTime(20000, now + duration * 0.7);
        
        // Boost target low-end slightly
        targetEq.low.setValueAtTime(0, now);
        targetEq.low.linearRampToValueAtTime(2, now + duration * 0.7);

        // 4. THE SLAM - more dramatic
        const slamTime = now + duration * 0.7;
        this.mixer.crossfader.fade.setValueAtTime(targetX, slamTime);
        target.player.volume.setValueAtTime(0, slamTime);
        source.stopAt(slamTime);

        // Reset filters and EQ
        source.filter.frequency.setValueAtTime(20000, slamTime);
        target.filter.frequency.setValueAtTime(20000, slamTime);
        sourceEq.low.setValueAtTime(0, slamTime);
        targetEq.low.setValueAtTime(0, slamTime);

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

    /**
     * SMART_EQ: Intelligent EQ automation based on track characteristics
     */
    private async smartEqTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. GRADUAL CROSSFADE
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // 3. INTELLIGENT EQ AUTOMATION
        const sourceEq = source === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        const targetEq = target === this.deckA ? this.mixer.eqA : this.mixer.eqB;

        // Source: Gradually reduce all bands to prevent masking
        sourceEq.low.setValueAtTime(0, now);
        sourceEq.mid.setValueAtTime(0, now);
        sourceEq.high.setValueAtTime(0, now);
        sourceEq.low.linearRampToValueAtTime(-8, now + duration * 0.5);
        sourceEq.mid.linearRampToValueAtTime(-6, now + duration * 0.5);
        sourceEq.high.linearRampToValueAtTime(-4, now + duration * 0.5);
        sourceEq.low.linearRampToValueAtTime(-20, now + duration);
        sourceEq.mid.linearRampToValueAtTime(-20, now + duration);
        sourceEq.high.linearRampToValueAtTime(-20, now + duration);

        // Target: Start neutral, then boost slightly for smooth handoff
        targetEq.low.setValueAtTime(-10, now);
        targetEq.mid.setValueAtTime(-8, now);
        targetEq.high.setValueAtTime(-6, now);
        targetEq.low.linearRampToValueAtTime(0, now + duration * 0.5);
        targetEq.mid.linearRampToValueAtTime(0, now + duration * 0.5);
        targetEq.high.linearRampToValueAtTime(0, now + duration * 0.5);

        // 4. FREQUENCY HANDOFF - prevent low-end clash
        source.filter.type = 'highpass';
        source.filter.frequency.setValueAtTime(20, now);
        source.filter.frequency.exponentialRampToValueAtTime(150, now + duration * 0.5);
        source.filter.frequency.exponentialRampToValueAtTime(500, now + duration);

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.filter.type = 'lowpass';
                source.filter.frequency.value = 20000;
                sourceEq.low.value = 0;
                sourceEq.mid.value = 0;
                sourceEq.high.value = 0;
                targetEq.low.value = 0;
                targetEq.mid.value = 0;
                targetEq.high.value = 0;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * GRADUAL_CROSSFADE: Extended crossfade with EQ matching
     */
    private async gradualCrossfadeTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. EXTENDED GRADUAL CROSSFADE
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        // Very smooth exponential curve
        this.mixer.crossfader.fade.exponentialRampToValueAtTime(0.5, now + duration * 0.6);
        this.mixer.crossfader.fade.exponentialRampToValueAtTime(targetX, now + duration);

        // 3. EQ MATCHING - prevent frequency masking
        const sourceEq = source === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        const targetEq = target === this.deckA ? this.mixer.eqA : this.mixer.eqB;

        // Source: Gentle reduction
        sourceEq.low.setValueAtTime(0, now);
        sourceEq.mid.setValueAtTime(0, now);
        sourceEq.high.setValueAtTime(0, now);
        sourceEq.low.linearRampToValueAtTime(-6, now + duration);
        sourceEq.mid.linearRampToValueAtTime(-4, now + duration);
        sourceEq.high.linearRampToValueAtTime(-2, now + duration);

        // Target: Gentle boost
        targetEq.low.setValueAtTime(-4, now);
        targetEq.mid.setValueAtTime(-3, now);
        targetEq.high.setValueAtTime(-2, now);
        targetEq.low.linearRampToValueAtTime(0, now + duration);
        targetEq.mid.linearRampToValueAtTime(0, now + duration);
        targetEq.high.linearRampToValueAtTime(0, now + duration);

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                sourceEq.low.value = 0;
                sourceEq.mid.value = 0;
                sourceEq.high.value = 0;
                targetEq.low.value = 0;
                targetEq.mid.value = 0;
                targetEq.high.value = 0;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * REVERB_WASH: Reverb-based transition for ambient tracks
     */
    private async reverbWashTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. CROSSFADE
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // 3. REVERB WASH on source
        source.reverb.wet.setValueAtTime(0, now);
        source.reverb.wet.linearRampToValueAtTime(0.8, now + duration * 0.4);
        source.reverb.wet.linearRampToValueAtTime(0.9, now + duration * 0.7);
        source.reverb.wet.exponentialRampToValueAtTime(0, now + duration);
        
        source.reverb.decay = 3.0; // Longer decay for wash effect

        // 4. SOURCE FADE with reverb tail
        source.player.volume.cancelScheduledValues(now);
        source.player.volume.setValueAtTime(source.player.volume.value, now);
        source.player.volume.linearRampToValueAtTime(-30, now + duration * 0.7);
        source.stopAt(now + duration * 0.7); // Stop early to let reverb tail continue

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.reverb.wet.value = 0;
                source.reverb.decay = 1.5;
                source.player.volume.value = 0;
                resolve();
            }, (duration + 1) * 1000);
        });
    }

    /**
     * PHASER_BUILD: Phaser effect buildup before transition
     */
    private async phaserBuildTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. START TARGET
        target.playAt(now, params.mixInPoint);
        target.player.volume.setValueAtTime(0, now);

        // 2. CROSSFADE
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // 3. PHASER BUILDUP using filter modulation (simulating phaser)
        source.filter.type = 'allpass';
        source.filter.frequency.setValueAtTime(1000, now);
        // Create phaser-like sweep
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const time = now + (duration * 0.6 * progress);
            const freq = 1000 + Math.sin(progress * Math.PI * 4) * 800;
            source.filter.frequency.setValueAtTime(freq, time);
        }
        source.filter.frequency.exponentialRampToValueAtTime(20000, now + duration * 0.8);

        // 4. ENERGY BUILD then cut
        const cutTime = now + duration * 0.8;
        source.stopAt(cutTime);

        if (this.mixer.sampler) {
            this.mixer.sampler.trigger('KICK', cutTime);
        }

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                source.filter.type = 'lowpass';
                source.filter.frequency.value = 20000;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }

    /**
     * BEAT_MATCHED: Precise beat-matching with tempo sync
     */
    private async beatMatchedTransition(params: TransitionParams, source: Deck, target: Deck): Promise<void> {
        const now = Tone.now() + 0.1;
        const duration = params.duration;
        const targetDeckId = target === this.deckA ? 'A' : 'B';
        const targetX = targetDeckId === 'A' ? 0 : 1;

        // 1. SYNC BPM FIRST
        const bpmRatio = params.sourceBpm / params.targetBpm;
        target.setSpeed(bpmRatio);

        // 2. START TARGET at beat-aligned position
        const beatDuration = 60 / params.targetBpm;
        const alignedMixIn = Math.floor(params.mixInPoint / beatDuration) * beatDuration;
        target.playAt(now, alignedMixIn);
        target.player.volume.setValueAtTime(0, now);

        // 3. BEAT-SYNCED CROSSFADE
        this.mixer.crossfader.fade.cancelScheduledValues(now);
        this.mixer.crossfader.fade.setValueAtTime(this.mixer.crossfader.fade.value, now);
        
        // Sync crossfade to beats
        const beats = Math.floor(duration / beatDuration);
        for (let i = 1; i <= beats; i++) {
            const beatTime = now + (i * beatDuration);
            const progress = i / beats;
            this.mixer.crossfader.fade.linearRampToValueAtTime(
                this.mixer.crossfader.fade.value + (targetX - this.mixer.crossfader.fade.value) * progress,
                beatTime
            );
        }
        this.mixer.crossfader.fade.linearRampToValueAtTime(targetX, now + duration);

        // 4. MINIMAL EQ ADJUSTMENT - let beats do the work
        const sourceEq = source === this.deckA ? this.mixer.eqA : this.mixer.eqB;
        sourceEq.low.setValueAtTime(0, now);
        sourceEq.low.linearRampToValueAtTime(-4, now + duration);

        source.stopAt(now + duration);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                source.seek(0);
                target.setSpeed(1);
                sourceEq.low.value = 0;
                resolve();
            }, (duration + 0.5) * 1000);
        });
    }
}

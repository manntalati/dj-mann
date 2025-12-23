import type { MixPoint, Track, TransitionType } from './types';

export class TransitionSelector {
    private history: TransitionType[] = [];
    private readonly maxHistorySize = 5;

    /**
     * Select the best transition type based on track characteristics and variety
     */
    selectTransition(
        mixOutPoint: MixPoint,
        mixInPoint: MixPoint,
        sourceTrack: Track,
        targetTrack: Track
    ): TransitionType {
        // Use suggested transition if available
        if (mixOutPoint.suggestedTransition) {
            return this.ensureVariety(mixOutPoint.suggestedTransition);
        }

        // Analyze track characteristics
        const sourceBpm = sourceTrack.bpm || 120;
        const targetBpm = targetTrack.bpm || 120;
        const bpmDiff = Math.abs(sourceBpm - targetBpm);
        const bpmRatio = Math.max(sourceBpm, targetBpm) / Math.min(sourceBpm, targetBpm);
        const score = mixOutPoint.score || 50;
        
        // Calculate track duration ratio (for energy matching)
        const sourceDuration = sourceTrack.duration || 180;
        const targetDuration = targetTrack.duration || 180;
        const durationRatio = Math.max(sourceDuration, targetDuration) / Math.min(sourceDuration, targetDuration);

        // High quality mix point with similar BPM → Beat-matched or Smart EQ
        if (score > 80 && bpmDiff < 3) {
            return this.ensureVariety(Math.random() > 0.5 ? 'BEAT_MATCHED' : 'SMART_EQ');
        }

        // Very similar BPM → Gradual crossfade or Smart EQ
        if (bpmDiff < 2 && score > 60) {
            return this.ensureVariety(Math.random() > 0.4 ? 'GRADUAL_CROSSFADE' : 'SMART_EQ');
        }

        // Moderate BPM difference → Loop Roll or Beat-matched
        if (bpmDiff >= 2 && bpmDiff < 8) {
            return this.ensureVariety(Math.random() > 0.3 ? 'LOOP_ROLL' : 'BEAT_MATCHED');
        }

        // High BPM difference → Slam Cut or Phaser Build
        if (bpmDiff > 10) {
            return this.ensureVariety(Math.random() > 0.5 ? 'SLAM_CUT' : 'PHASER_BUILD');
        }

        // High score with good mix point → Echo Out, Reverb Wash, or Build Cut
        if (score > 75) {
            const options: TransitionType[] = ['ECHO_OUT', 'REVERB_WASH', 'BUILD_CUT'];
            return this.ensureVariety(options[Math.floor(Math.random() * options.length)]);
        }

        // Medium score → Gradual crossfade or Loop Roll
        if (score > 50) {
            return this.ensureVariety(Math.random() > 0.4 ? 'GRADUAL_CROSSFADE' : 'LOOP_ROLL');
        }

        // Lower score → Default to gradual crossfade for safety
        return this.ensureVariety('GRADUAL_CROSSFADE');
    }

    /**
     * Ensure variety by avoiding recent transitions
     */
    private ensureVariety(preferred: TransitionType): TransitionType {
        // If this transition was used in last 2 mixes, pick alternative
        const recentUses = this.history.slice(-2);
        if (recentUses.includes(preferred)) {
            // Pick a different one from all available transitions
            const alternatives: TransitionType[] = [
                'ECHO_OUT', 'LOOP_ROLL', 'SLAM_CUT', 'SCRATCH',
                'ACAPELLA', 'VINYL_BRAKE', 'BUILD_CUT', 'SMART_EQ',
                'GRADUAL_CROSSFADE', 'REVERB_WASH', 'PHASER_BUILD', 'BEAT_MATCHED'
            ];
            const unused = alternatives.filter(t => !recentUses.includes(t));
            if (unused.length > 0) {
                preferred = unused[Math.floor(Math.random() * unused.length)];
            }
        }

        // Add to history
        this.history.push(preferred);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }

        return preferred;
    }

    /**
     * Reset history (e.g., when changing tracks)
     */
    reset() {
        this.history = [];
    }
}

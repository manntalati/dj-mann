import type { MixPoint, Track, TransitionType } from './types';

export class TransitionSelector {
    private history: TransitionType[] = [];
    private readonly maxHistorySize = 5;

    /**
     * Select the best transition type based on track characteristics and variety
     */
    selectTransition(
        mixOutPoint: MixPoint,
        _mixInPoint: MixPoint, // Reserved for future use
        sourceTrack: Track,
        targetTrack: Track
    ): TransitionType {
        // Use suggested transition if available
        if (mixOutPoint.suggestedTransition) {
            return this.ensureVariety(mixOutPoint.suggestedTransition);
        }

        // Otherwise, intelligently select based on characteristics
        const sourceBpm = sourceTrack.bpm || 120;
        const targetBpm = targetTrack.bpm || 120;
        const bpmDiff = Math.abs(sourceBpm - targetBpm);
        const score = mixOutPoint.score || 50;

        // High BPM difference → Vinyl Brake or Build Cut
        if (bpmDiff > 10) {
            return this.ensureVariety(Math.random() > 0.5 ? 'VINYL_BRAKE' : 'BUILD_CUT');
        }

        // High score (>75) → Slam Cut or Echo Out (clean mixes)
        if (score > 75) {
            return this.ensureVariety(Math.random() > 0.5 ? 'SLAM_CUT' : 'ECHO_OUT');
        }

        // Medium score (60-75) → Loop Roll or Acapella
        if (score > 60) {
            return this.ensureVariety(Math.random() > 0.5 ? 'LOOP_ROLL' : 'ACAPELLA');
        }

        // Lower score or experimental → Scratch or Smart EQ
        return this.ensureVariety(Math.random() > 0.7 ? 'SCRATCH' : 'SMART_EQ');
    }

    /**
     * Ensure variety by avoiding recent transitions
     */
    private ensureVariety(preferred: TransitionType): TransitionType {
        // If this transition was used in last 2 mixes, pick alternative
        const recentUses = this.history.slice(-2);
        if (recentUses.includes(preferred)) {
            // Pick a different one
            const alternatives: TransitionType[] = [
                'ECHO_OUT', 'LOOP_ROLL', 'SLAM_CUT', 'SCRATCH',
                'ACAPELLA', 'VINYL_BRAKE', 'BUILD_CUT', 'SMART_EQ'
            ];
            const unused = alternatives.filter(t => !recentUses.includes(t));
            preferred = unused[Math.floor(Math.random() * unused.length)];
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

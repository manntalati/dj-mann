import type { Track, MixPoint } from './types';

/**
 * Analyzes two tracks to find optimal mix points
 * Samples 10-second segments from various positions and scores them
 */
export class MixPointAnalyzer {
    private sampleDuration = 10; // seconds per segment
    private maxSamplesPerTrack = 5; // How many segments to test per track

    /**
     * Analyze directional transition between two tracks (Source -> Target)
     * Returns updated tracks with mixPoints populated
     */
    async analyzeTracks(source: Track, target: Track): Promise<{ source: Track, target: Track }> {
        console.log(`Analyzing directional mix: "${source.title}" (OUT) → "${target.title}" (IN)...`);

        // Generate candidate positions for each track
        const positionsSource = this.generateCandidatePositions(source.duration);
        const positionsTarget = this.generateCandidatePositions(target.duration);

        // Score all combinations
        const mixPointsSource: MixPoint[] = [];
        const mixPointsTarget: MixPoint[] = [];

        for (const posSource of positionsSource) {
            for (const posTarget of positionsTarget) {
                const score = this.scoreTransition(source, target, posSource, posTarget);

                // If score is good enough, save as a mix point
                if (score > 40) {
                    mixPointsSource.push({
                        time: posSource,
                        type: 'out',
                        score,
                        pairTrackId: target.id
                    });

                    mixPointsTarget.push({
                        time: posTarget,
                        type: 'in',
                        score,
                        pairTrackId: source.id
                    });
                }
            }
        }

        // Sort by score and keep top candidates
        mixPointsSource.sort((a, b) => (b.score || 0) - (a.score || 0));
        mixPointsTarget.sort((a, b) => (b.score || 0) - (a.score || 0));

        return {
            source: { ...source, mixPoints: mixPointsSource.slice(0, 3) },
            target: { ...target, mixPoints: mixPointsTarget.slice(0, 3) }
        };
    }

    /**
     * Generate candidate positions throughout the track
     * Avoids very beginning and very end
     */
    private generateCandidatePositions(duration: number): number[] {
        const positions: number[] = [];
        const safeMargin = 20; // seconds from start/end to avoid
        const usableDuration = duration - (safeMargin * 2);

        if (usableDuration < this.sampleDuration) {
            // Track too short, just return middle
            return [duration / 2];
        }

        const step = usableDuration / (this.maxSamplesPerTrack + 1);

        for (let i = 1; i <= this.maxSamplesPerTrack; i++) {
            positions.push(safeMargin + (step * i));
        }

        return positions;
    }

    /**
     * Score how well a transition would work
     * Higher score = better mix point
     * 
     * Factors:
     * - BPM compatibility
     * - Energy level matching
     * - Position in track (prefer middle sections)
     */
    private scoreTransition(trackA: Track, trackB: Track, posA: number, posB: number): number {
        let score = 50; // Base score

        // 1. BPM Compatibility (0-30 points)
        if (trackA.bpm && trackB.bpm) {
            const bpmDiff = Math.abs(trackA.bpm - trackB.bpm);
            const bpmScore = Math.max(0, 30 - (bpmDiff * 2));
            score += bpmScore;
        }

        // 2. Position preference (0-20 points)
        // Prefer positions in the middle 60% of the track
        const relPosA = posA / trackA.duration;
        const relPosB = posB / trackB.duration;

        const posScoreA = this.scorePosition(relPosA);
        const posScoreB = this.scorePosition(relPosB);
        score += (posScoreA + posScoreB) / 2;

        return Math.min(100, score);
    }

    /**
     * Score a relative position (0-1) in the track
     * Prefer middle sections
     */
    private scorePosition(relPos: number): number {
        // Peak score at 0.5 (middle), decay towards edges
        const distFromMiddle = Math.abs(relPos - 0.5);
        return Math.max(0, 20 - (distFromMiddle * 40));
    }
}

export const mixPointAnalyzer = new MixPointAnalyzer();

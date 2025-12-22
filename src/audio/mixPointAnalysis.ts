import type { Track, MixPoint } from './types';

/**
 * Analyzes two tracks to find optimal mix points
 * Samples 10-second segments from various positions and scores them
 */
export class MixPointAnalyzer {
    private sampleDuration = 10; // seconds per segment
    private maxSamplesPerTrack = 5; // How many segments to test per track

    /**
     * Analyze both tracks and discover mix points
     * Returns updated tracks with mixPoints populated
     */
    async analyzeTracks(trackA: Track, trackB: Track): Promise<{ trackA: Track, trackB: Track }> {
        console.log(`Analyzing mix points between "${trackA.title}" and "${trackB.title}"...`);

        // Generate candidate positions for each track
        const positionsA = this.generateCandidatePositions(trackA.duration);
        const positionsB = this.generateCandidatePositions(trackB.duration);

        // Score all combinations
        const mixPointsA: MixPoint[] = [];
        const mixPointsB: MixPoint[] = [];

        for (const posA of positionsA) {
            for (const posB of positionsB) {
                const score = this.scoreTransition(trackA, trackB, posA, posB);
                console.log(`  Mix point test: A@${posA.toFixed(1)}s → B@${posB.toFixed(1)}s = Score ${score.toFixed(0)}`);

                // If score is good enough, save as a mix point (lowered threshold)
                if (score > 40) {
                    mixPointsA.push({
                        time: posA,
                        type: 'out',
                        score,
                        pairTrackId: trackB.id
                    });

                    mixPointsB.push({
                        time: posB,
                        type: 'in',
                        score,
                        pairTrackId: trackA.id
                    });
                }
            }
        }

        // Sort by score and keep top candidates
        mixPointsA.sort((a, b) => (b.score || 0) - (a.score || 0));
        mixPointsB.sort((a, b) => (b.score || 0) - (a.score || 0));

        return {
            trackA: { ...trackA, mixPoints: mixPointsA.slice(0, 3) },
            trackB: { ...trackB, mixPoints: mixPointsB.slice(0, 3) }
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

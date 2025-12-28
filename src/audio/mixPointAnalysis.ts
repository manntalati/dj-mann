import type { Track, MixPoint } from './types';
import AnalysisWorker from './analysis.worker?worker'; // Vite worker import
import type { AnalysisResult } from './analysis.worker';

/**
 * Analyzes tracks using Essentia.js Web Worker + Heuristic Scoring
 */
export class MixPointAnalyzer {
    private worker: Worker;
    private pendingRequests: Map<string, (result: AnalysisResult) => void>;

    constructor() {
        this.worker = new AnalysisWorker();
        this.pendingRequests = new Map();

        this.worker.onmessage = (e) => {
            const { id, result, error } = e.data;
            if (this.pendingRequests.has(id)) {
                if (error) {
                    console.error(`MixPointAnalyzer: Worker error for ${id}`, error);
                    this.pendingRequests.delete(id);
                } else {
                    const resolve = this.pendingRequests.get(id);
                    if (resolve) resolve(result);
                    this.pendingRequests.delete(id);
                }
            }
        };
    }

    /**
     * Analyzes a single track's audio to extract features (BPM, Key, Grid)
     */
    public async analyzeTrackAudio(track: Track, buffer: AudioBuffer): Promise<Track> {
        if (track.key && track.downbeats) {
            return track; // Already analyzed
        }

        console.log(`MixPointAnalyzer: Starting full analysis for "${track.title}" (Downsampled)...`);

        const sampleRate = buffer.sampleRate;
        const targetSampleRate = 11025; // 4x downsample for balance of speed/accuracy
        const downsampleFactor = sampleRate / targetSampleRate;

        const fullData = buffer.getChannelData(0);
        const downsampledLength = Math.floor(fullData.length / downsampleFactor);
        const downsampled = new Float32Array(downsampledLength);

        for (let i = 0; i < downsampledLength; i++) {
            downsampled[i] = fullData[Math.floor(i * downsampleFactor)];
        }

        return new Promise((resolve) => {
            const id = `${track.id}-${Date.now()}`;
            this.pendingRequests.set(id, (result) => {
                const updatedTrack = {
                    ...track,
                    bpm: result.bpm,
                    key: result.key,
                    scale: result.scale,
                    downbeats: result.downbeats,
                    energyProfile: result.energyProfile
                };
                console.log(`MixPointAnalyzer: Analysis complete for "${track.title}" (BPM: ${result.bpm}, Key: ${result.key} ${result.scale})`);
                resolve(updatedTrack);
            });

            this.worker.postMessage({
                id,
                audioData: downsampled,
                sampleRate: targetSampleRate
            });
        });
    }

    /**
     * Finds optimal mix points between two tracks given their analysis data
     */
    public async findMixPoints(source: Track, target: Track): Promise<{ source: Track, target: Track }> {
        console.log(`MixPointAnalyzer: Finding mix points for "${source.title}" -> "${target.title}"`);

        if (!source.downbeats || !target.downbeats) {
            console.warn("MixPointAnalyzer: Missing analysis data, falling back to basic scoring.");
            return this.heuristicFallback(source, target);
        }

        // 1. Identify Candidate Mix-Out Regions
        const sourceCandidates = this.findStructuralCandidates(source, 'out');

        // 2. Identify Candidate Mix-In Regions
        const targetCandidates = this.findStructuralCandidates(target, 'in');

        // 3. Score Combinations
        const candidatePairings: { outPt: number, inPt: number, score: number }[] = [];
        for (const outPt of sourceCandidates) {
            for (const inPt of targetCandidates) {
                const score = this.calculateTransitionScore(source, target, outPt, inPt);
                if (score > 60) {
                    candidatePairings.push({ outPt, inPt, score });
                }
            }
        }

        // Sort by score DESC
        candidatePairings.sort((a, b) => b.score - a.score);

        const mixPointsSource: MixPoint[] = [];
        const mixPointsTarget: MixPoint[] = [];

        // Take top pairings, ensuring we don't have too many near-identical points
        for (const cand of candidatePairings) {
            if (mixPointsSource.length >= 3) break;

            // Basic deduplication: don't pick points too close to ones already picked
            const isDuplicate = mixPointsSource.some(mp => Math.abs(mp.time - cand.outPt) < 10);
            if (isDuplicate) continue;

            mixPointsSource.push({
                time: cand.outPt,
                type: 'out',
                score: cand.score,
                pairTrackId: target.id,
                matchingTime: cand.inPt
            });
            mixPointsTarget.push({
                time: cand.inPt,
                type: 'in',
                score: cand.score,
                pairTrackId: source.id,
                matchingTime: cand.outPt
            });
        }

        // 4. Fallback if no points found
        if (mixPointsSource.length === 0) {
            console.warn(`MixPointAnalyzer: ML found no ideal points for ${source.title} -> ${target.title}. Falling back to heuristic.`);
            return this.heuristicFallback(source, target);
        }

        return {
            source: { ...source, mixPoints: mixPointsSource.slice(0, 3) },
            target: { ...target, mixPoints: mixPointsTarget.slice(0, 3) }
        };
    }

    private async heuristicFallback(source: Track, target: Track): Promise<{ source: Track, target: Track }> {
        // Just return center points
        const outTime = source.duration - 30;
        const inTime = 0;
        return {
            source: { ...source, mixPoints: [{ time: outTime, type: 'out', pairTrackId: target.id, score: 50 }] },
            target: { ...target, mixPoints: [{ time: inTime, type: 'in', pairTrackId: source.id, score: 50 }] }
        };
    }

    private findStructuralCandidates(track: Track, type: 'in' | 'out'): number[] {
        if (!track.downbeats || track.downbeats.length === 0) return [type === 'in' ? 0 : track.duration - 30];

        const candidates: number[] = [];
        const phraseLength = 32; // 8 bars

        // Structural analysis using energy profile
        // Look for points where energy changes significantly (start of drops/breakdowns)
        const energyPoints: number[] = [];
        if (track.energyProfile && track.energyProfile.length > 0) {
            for (let i = 1; i < track.energyProfile.length - 1; i++) {
                const prev = track.energyProfile[i - 1];
                const curr = track.energyProfile[i];

                // Significant change or local peak/trough
                if (Math.abs(curr - prev) > 0.05) {
                    energyPoints.push((i / track.energyProfile.length) * track.duration);
                }
            }
        }

        for (let i = 0; i < track.downbeats.length; i += phraseLength) {
            const time = track.downbeats[i];

            // Only keep phrase boundaries that are near an energy change
            // OR are in the preferred intro/outro regions
            const relativePos = time / track.duration;
            const isNearEnergyChange = energyPoints.some(ep => Math.abs(ep - time) < 4); // within 1 bar usually

            if (type === 'in') {
                if (relativePos < 0.25 || isNearEnergyChange) candidates.push(time);
            } else {
                // Minimum floor: Don't allow mix-out before 20 seconds
                if (time > 20 && (relativePos > 0.70 || isNearEnergyChange)) candidates.push(time);
            }
        }

        // Always include start/end heuristics as safety
        if (type === 'in' && !candidates.includes(track.downbeats[0])) candidates.push(track.downbeats[0]);
        if (type === 'out' && candidates.length === 0) candidates.push(track.duration - 30);

        return candidates;
    }

    private calculateTransitionScore(source: Track, target: Track, outTime: number, inTime: number): number {
        let score = 50;

        // 1. Harmonic Mixing (Camelot Wheel / Key Compatibility)
        if (source.key && target.key) {
            if (source.key === target.key) score += 20;
            else if (source.key === target.key.replace('Major', 'Minor')) score += 10;
        }

        // 2. BPM Match
        if (source.bpm && target.bpm) {
            const diff = Math.abs(source.bpm - target.bpm);
            if (diff < 5) score += 20;
            else if (diff < 10) score += 10;
        }

        // 3. Phrasing & Structure Check
        // Boost points near intro/outro
        if (outTime > source.duration * 0.8) score += 15;
        if (inTime < target.duration * 0.2) score += 15;

        // 4. Energy Profile Match (Transition between similar energy levels)
        if (source.energyProfile && target.energyProfile) {
            const sourceIdx = Math.floor((outTime / source.duration) * source.energyProfile.length);
            const targetIdx = Math.floor((inTime / target.duration) * target.energyProfile.length);

            const sourceEnergy = source.energyProfile[sourceIdx] || 0;
            const targetEnergy = target.energyProfile[targetIdx] || 0;

            const energyDiff = Math.abs(sourceEnergy - targetEnergy);
            if (energyDiff < 0.1) score += 10;
        }

        // penalty for mixing in too late or out too early
        if (outTime < 30) score -= 30; // Absolute floor penalty for very early transitions
        else if (outTime < source.duration * 0.3) score -= 20;

        if (inTime > target.duration * 0.7) score -= 20;

        return Math.max(0, Math.min(100, score));
    }
}

export const mixPointAnalyzer = new MixPointAnalyzer();

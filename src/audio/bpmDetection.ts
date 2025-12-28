/**
 * Simple BPM detection algorithm based on peak detection
 * Adapted from common web audio beat detection techniques
 */
export async function detectBPM(buffer: AudioBuffer): Promise<number> {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    const peaks = getPeaks(data);
    const groups = getIntervals(peaks);
    const topIntervals = groups.sort((a, b) => b.count - a.count).slice(0, 5);

    if (topIntervals.length === 0) return 128;

    const bpm = Math.round(60 / (topIntervals[0].interval / sampleRate));

    if (bpm < 60) return bpm * 2;
    if (bpm > 200) return bpm / 2;

    return bpm;
}

function getPeaks(data: Float32Array) {
    const peaks = [];
    const threshold = 0.8; // Peak threshold
    for (let i = 0; i < data.length; i++) {
        if (data[i] > threshold) {
            peaks.push(i);
            i += 10000;
        }
    }
    return peaks;
}

function getIntervals(peaks: number[]) {
    const groups: { interval: number; count: number }[] = [];
    peaks.forEach((peak, index) => {
        for (let i = 1; i < 10; i++) {
            const interval = peaks[index + i] - peak;
            if (interval) {
                const group = groups.find(g => Math.abs(g.interval - interval) < 1000);
                if (group) {
                    group.count++;
                } else {
                    groups.push({ interval, count: 1 });
                }
            }
        }
    });
    return groups;
}

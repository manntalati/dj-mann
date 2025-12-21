/**
 * Simple BPM detection algorithm based on peak detection
 * Adapted from common web audio beat detection techniques
 */
export async function detectBPM(buffer: AudioBuffer): Promise<number> {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // 1. Filter the data if needed (for better beat detection we usually low-pass filter)
    // For simplicity, we'll just look for peaks in the raw data here

    // 2. Identify peaks
    const peaks = getPeaks(data);
    const groups = getIntervals(peaks);

    // 3. Find the most common interval
    const topIntervals = groups.sort((a, b) => b.count - a.count).slice(0, 5);

    if (topIntervals.length === 0) return 128; // fallback

    // Convert interval (samples) to BPM
    // bpm = 60 / (interval / sampleRate)
    const bpm = Math.round(60 / (topIntervals[0].interval / sampleRate));

    // Usually BPM is between 60 and 200. If it's outside, it might be a multiple.
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
            // Skip a bit to avoid multi-counting the same beat
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

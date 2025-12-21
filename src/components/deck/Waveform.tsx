import React, { useRef, useEffect, useState } from 'react';
import * as Tone from 'tone';
import styles from './Waveform.module.css';

interface WaveformProps {
    buffer: Tone.ToneAudioBuffer | null;
    progress: number; // 0 to 1
    onSeek: (progress: number) => void;
    color: string;
    mixPoints?: import('../../audio/types').MixPoint[]; // Discovered mix points
}

export const Waveform: React.FC<WaveformProps> = ({ buffer, progress, onSeek, color, mixPoints }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [peaks, setPeaks] = useState<Float32Array | null>(null);

    // Analyze buffer on load
    useEffect(() => {
        if (!buffer || !buffer.loaded) {
            setPeaks(null);
            return;
        }

        const channelData = buffer.getChannelData(0); // Left channel
        const samples = 200; // Resolution
        const step = Math.floor(channelData.length / samples);
        const nextPeaks = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            let max = 0;
            // Find max amplitude in the step window
            for (let j = 0; j < step; j++) {
                const val = Math.abs(channelData[(i * step) + j]);
                if (val > max) max = val;
            }
            nextPeaks[i] = max;
        }
        setPeaks(nextPeaks);
    }, [buffer]);

    // Draw Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !peaks) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const duration = buffer?.duration || 1;

        ctx.clearRect(0, 0, width, height);

        // Draw Bars
        const barWidth = width / peaks.length;

        peaks.forEach((peak, index) => {
            const x = index * barWidth;
            const barHeight = peak * height * 0.9; // Scale amplitude

            // Color logic based on progress
            const isPlayed = (index / peaks.length) < progress;
            ctx.fillStyle = isPlayed ? color : 'rgba(255, 255, 255, 0.3)';

            // Draw centered bar
            ctx.fillRect(x, centerY - (barHeight / 2), barWidth - 1, barHeight);
        });

        // Draw playhead line
        const playheadX = progress * width;
        ctx.fillStyle = '#fff';
        ctx.fillRect(playheadX, 0, 2, height);

        // Draw mix point markers
        if (mixPoints && mixPoints.length > 0) {
            mixPoints.forEach(mp => {
                const mpX = (mp.time / duration) * width;

                // Draw marker line
                ctx.strokeStyle = mp.type === 'in' ? '#00ff9d' : '#ffbf00';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.beginPath();
                ctx.moveTo(mpX, 0);
                ctx.lineTo(mpX, height);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw label
                ctx.fillStyle = mp.type === 'in' ? '#00ff9d' : '#ffbf00';
                ctx.font = '10px monospace';
                ctx.fillText(mp.type === 'in' ? 'MIX IN' : 'MIX OUT', mpX + 4, 12);
            });
        }

    }, [peaks, progress, color, mixPoints, buffer]);

    const handleClick = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newProgress = Math.max(0, Math.min(1, x / rect.width));
        onSeek(newProgress);
    };

    return (
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                width={800}
                height={150}
                className={styles.canvas}
                onClick={handleClick}
            />
        </div>
    );
};

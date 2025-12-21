import React, { useState, useRef, useEffect } from 'react';
import styles from './DeckComponent.module.css';
import { Play, Pause, Upload } from 'lucide-react';
import { Deck } from '../../audio/Deck';
import { audioEngine } from '../../audio/AudioEngine';
import type { Track } from '../../audio/types';
import { Waveform } from './Waveform';

interface DeckComponentProps {
    deck: Deck;
    id: 'A' | 'B';
}

export const DeckComponent: React.FC<DeckComponentProps> = ({ deck, id }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [track, setTrack] = useState<Track | null>(null);
    // New state for playback progress
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const rafRef = useRef<number>(0);

    // Sync track state with deck track (for mix points updates)
    useEffect(() => {
        const syncInterval = setInterval(() => {
            if (deck.track && deck.track !== track) {
                setTrack(deck.track);
            }
        }, 1000);
        return () => clearInterval(syncInterval);
    }, [deck, track]);

    // Update progress loop - runs continuously to catch Auto-DJ changes
    useEffect(() => {
        const loop = () => {
            // Sync local state with deck state
            if (deck.isPlaying !== isPlaying) {
                setIsPlaying(deck.isPlaying);
            }

            if (deck.player.loaded) {
                const dur = deck.duration;
                if (dur > 0) {
                    const current = deck.currentTime;
                    const p = Math.min(1, Math.max(0, current / dur));
                    setProgress(p);
                }
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [deck, isPlaying]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const newTrack: Track = {
                id: file.name,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Unknown Artist',
                url,
                duration: 0,
                file
            };
            await deck.load(newTrack);
            setTrack(newTrack); // Trigger re-render
            setIsPlaying(false);
            setProgress(0);

            // Trigger mix point analysis if both tracks are now loaded
            audioEngine.autoDJ.analyzeMixPoints();
        }
    };

    const togglePlay = () => {
        if (!track) return;
        if (isPlaying) {
            deck.pause();
            setIsPlaying(false);
        } else {
            deck.play();
            setIsPlaying(true);
        }
    };

    const handleSeek = (p: number) => {
        if (!track) return;
        const dur = deck.duration;
        const time = p * dur;
        deck.seek(time);
        setProgress(p);
    };

    return (
        <div className={styles.deck}>
            <div className={styles.header}>
                <div className={styles.deckId}>DECK {id}</div>
                <div className={styles.trackInfo}>
                    <h3 className={styles.trackTitle}>{track ? track.title : 'No Track Loaded'}</h3>
                    <div className={styles.metaRow}>
                        <p className={styles.trackArtist}>{track ? track.artist : 'Select a file'}</p>
                        {track?.bpm && <span className={styles.bpmBadge}>{Math.round(track.bpm)} BPM</span>}
                    </div>
                </div>
            </div>

            <div className={styles.visualizer}>
                {track ? (
                    <Waveform
                        buffer={deck.player.buffer}
                        progress={progress}
                        onSeek={handleSeek}
                        color={id === 'A' ? 'var(--accent-primary)' : 'var(--accent-secondary)'}
                        mixPoints={track.mixPoints}
                    />
                ) : (
                    <div className={styles.wavePlaceholder}>
                        <span className={styles.waveText}>Waveform Visualizer</span>
                    </div>
                )}
            </div>

            <div className={styles.controls}>
                <div className={styles.mainControls}>
                    <button
                        className={`${styles.playBtn} ${isPlaying ? styles.active : ''}`}
                        onClick={togglePlay}
                        disabled={!track}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>

                    <button
                        className={styles.syncBtn}
                        onClick={() => {
                            const otherDeck = id === 'A' ? audioEngine.deckB : audioEngine.deckA;
                            audioEngine.autoDJ.syncBPM(otherDeck, deck);
                        }}
                        disabled={!track}
                        title="Sync BPM to other deck"
                    >
                        SYNC
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="audio/*"
                    onChange={handleFileChange}
                />

                <button className={styles.loadBtn} onClick={() => fileInputRef.current?.click()}>
                    <Upload size={18} /> Load Track
                </button>
            </div>
        </div>
    );
};

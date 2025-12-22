import React from 'react';
import type { Track } from '../../audio/types';
import { Trash2, Play } from 'lucide-react';
import styles from './PlaylistQueue.module.css';

interface PlaylistQueueProps {
    tracks: Track[];
    onRemove: (trackId: string) => void;
    onLoadToDeck: (track: Track, deck: 'A' | 'B') => void;
}

export const PlaylistQueue: React.FC<PlaylistQueueProps> = ({ tracks, onRemove, onLoadToDeck }) => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>PLAYLIST QUEUE</h2>
                <span className={styles.count}>{tracks.length} tracks</span>
            </div>

            <div className={styles.trackList}>
                {tracks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Play size={32} />
                        <p>No tracks in queue</p>
                        <span>Add tracks from library to start</span>
                    </div>
                ) : (
                    tracks.map((track, index) => (
                        <div key={track.id} className={styles.trackItem}>
                            <div className={styles.trackNumber}>{index + 1}</div>
                            <div className={styles.trackInfo}>
                                <div className={styles.trackTitle}>{track.title}</div>
                                <div className={styles.trackMeta}>
                                    {track.artist}
                                    {track.bpm && <span className={styles.bpm}>{Math.round(track.bpm)} BPM</span>}
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.deckBtn} ${styles.deckA}`}
                                    onClick={() => onLoadToDeck(track, 'A')}
                                    title="Load to Deck A"
                                >
                                    A
                                </button>
                                <button
                                    className={`${styles.deckBtn} ${styles.deckB}`}
                                    onClick={() => onLoadToDeck(track, 'B')}
                                    title="Load to Deck B"
                                >
                                    B
                                </button>
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => onRemove(track.id)}
                                    title="Remove from queue"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

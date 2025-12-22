import React from 'react';
import styles from './LibraryComponent.module.css';
import { useStore } from '../../store/useStore';
import { libraryManager } from '../../audio/LibraryManager';
import { audioEngine } from '../../audio/AudioEngine';
import type { Track } from '../../audio/types';
import { FolderOpen, Plus } from 'lucide-react';

interface LibraryComponentProps {
    onAddToPlaylist: (track: Track) => void;
}

export const LibraryComponent: React.FC<LibraryComponentProps> = ({ onAddToPlaylist }) => {
    const library = useStore((state) => state.library);
    const isScanning = useStore((state) => state.isScanning);

    const handleOpenFolder = async () => {
        await libraryManager.openDirectory();
    };

    const loadToDeck = async (track: Track, deckId: 'A' | 'B') => {
        const deck = deckId === 'A' ? audioEngine.deckA : audioEngine.deckB;
        await deck.load(track);
    };

    return (
        <div className={styles.library}>
            <div className={styles.header}>
                <span className={styles.title}>MY LIBRARY</span>
                <button
                    className={styles.scanBtn}
                    onClick={handleOpenFolder}
                    disabled={isScanning}
                >
                    {isScanning ? 'Scanning...' : 'Open Folder'}
                </button>
            </div>

            <div className={styles.trackList}>
                {library.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FolderOpen size={48} className={styles.emptyIcon} />
                        <p>No tracks loaded. Open a folder to start mixing.</p>
                    </div>
                ) : (
                    library.map((track) => (
                        <div key={track.id} className={styles.trackRow}>
                            <div className={styles.trackMeta}>
                                <span className={styles.songTitle}>{track.title}</span>
                                <span className={styles.songArtist}>{track.artist}</span>
                            </div>
                            <div className={styles.actions}>
                                <button
                                    className={styles.addQueueBtn}
                                    onClick={() => onAddToPlaylist(track)}
                                    title="Add to Queue"
                                >
                                    <Plus size={16} />
                                </button>
                                <button className={styles.loadBtn} onClick={() => loadToDeck(track, 'A')}>LOAD A</button>
                                <button className={styles.loadBtn} onClick={() => loadToDeck(track, 'B')}>LOAD B</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


import styles from './LibraryComponent.module.css';
import { useStore } from '../../store/useStore';
import { libraryManager } from '../../audio/LibraryManager';
import { audioEngine } from '../../audio/AudioEngine';
import type { Track } from '../../audio/types';
import { FolderOpen, Plus, ListMusic, PlayCircle, Trash2 } from 'lucide-react';

export const LibraryComponent = () => {
    // Store State
    const library = useStore((state) => state.library);
    const playlist = useStore((state) => state.playlist);
    const queue = useStore((state) => state.queue);
    const isScanning = useStore((state) => state.isScanning);

    // Store Actions
    const addToPlaylist = useStore((state) => state.addToPlaylist);
    const removeFromPlaylist = useStore((state) => state.removeFromPlaylist);
    const addToQueue = useStore((state) => state.addToQueue);
    const removeFromQueue = useStore((state) => state.removeFromQueue);

    const handleOpenFolder = async () => {
        await libraryManager.openDirectory();
    };

    const loadToDeck = async (track: Track, deckId: 'A' | 'B') => {
        const deck = deckId === 'A' ? audioEngine.deckA : audioEngine.deckB;
        await deck.load(track);
        // Trigger mix point analysis when both tracks are loaded
        audioEngine.autoDJ.analyzeMixPoints();
    };

    // Helper to format duration
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderTableHeader = () => (
        <div className={styles.tableHeader}>
            <div>Title</div>
            <div>Time</div>
            <div></div>
        </div>
    );

    const renderTrackRow = (track: Track, _index: number, context: 'library' | 'queue' | 'playlist') => (
        <div key={`${context}-${track.id}`} className={styles.trackRow}>
            {/* 1. Title & Artist */}
            <div className={styles.cellTitle}>
                <span className={styles.songTitle}>{track.title}</span>
                <span className={styles.songArtist}>{track.artist}</span>
            </div>

            {/* 2. Time */}
            <div className={styles.cellTime}>
                {formatTime(track.duration)}
            </div>

            {/* 3. Actions - Same as before */}
            <div className={styles.actions}>
                {context === 'library' && (
                    <>
                        <button className={styles.actionBtn} onClick={() => addToPlaylist(track)} title="Add to Playlist">
                            <ListMusic size={14} />
                        </button>
                        <button className={styles.actionBtn} onClick={() => addToQueue(track)} title="Add to Queue">
                            <Plus size={14} />
                        </button>
                    </>
                )}
                {context === 'playlist' && (
                    <>
                        <button className={styles.actionBtn} onClick={() => addToQueue(track)} title="Add to Queue">
                            <Plus size={14} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.removeBtn}`} onClick={() => removeFromPlaylist(track.id)} title="Remove">
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
                {context === 'queue' && (
                    <button className={`${styles.actionBtn} ${styles.removeBtn}`} onClick={() => removeFromQueue(track.id)} title="Remove">
                        <Trash2 size={14} />
                    </button>
                )}
                <button className={`${styles.actionBtn} ${styles.loadBtn}`} onClick={() => loadToDeck(track, 'A')}>A</button>
                <button className={`${styles.actionBtn} ${styles.loadBtn}`} onClick={() => loadToDeck(track, 'B')}>B</button>
            </div>
        </div>
    );

    return (
        <div className={styles.library}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.title}>MEDIA MANAGER</span>
                <button
                    className={styles.scanBtn}
                    onClick={handleOpenFolder}
                    disabled={isScanning}
                >
                    {isScanning ? 'Scanning...' : 'Open Folder'}
                </button>
            </div>

            <div className={styles.panelsContainer}>
                {/* 1. LIVE QUEUE */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <PlayCircle size={14} />
                        Live Queue
                    </div>
                    {queue.length > 0 && renderTableHeader()}
                    <div className={styles.panelContent}>
                        {queue.length === 0 ? (
                            <div className={styles.emptyState}>
                                <PlayCircle size={32} className={styles.emptyIcon} />
                                <p>Queue is empty.</p>
                            </div>
                        ) : (
                            <div className={styles.trackList}>
                                {queue.map((t, i) => renderTrackRow(t, i, 'queue'))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SESSION PLAYLIST */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <ListMusic size={14} />
                        Session Playlist
                    </div>
                    {playlist.length > 0 && renderTableHeader()}
                    <div className={styles.panelContent}>
                        {playlist.length === 0 ? (
                            <div className={styles.emptyState}>
                                <ListMusic size={32} className={styles.emptyIcon} />
                                <p>Playlist is empty.</p>
                            </div>
                        ) : (
                            <div className={styles.trackList}>
                                {playlist.map((t, i) => renderTrackRow(t, i, 'playlist'))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. LIBRARY */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <FolderOpen size={14} />
                        Library
                    </div>
                    {library.length > 0 && renderTableHeader()}
                    <div className={styles.panelContent}>
                        {library.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FolderOpen size={32} className={styles.emptyIcon} />
                                <p>No tracks imported.</p>
                            </div>
                        ) : (
                            <div className={styles.trackList}>
                                {library.map((t, i) => renderTrackRow(t, i, 'library'))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

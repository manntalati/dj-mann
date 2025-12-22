import { create } from 'zustand';
import type { Track } from '../audio/types';

interface AppState {
    // Media Library (Raw imported files)
    library: Track[];
    setLibrary: (tracks: Track[]) => void;
    addTrackToLibrary: (track: Track) => void;

    // Session Playlist (Curated selection for the current gig)
    playlist: Track[];
    setPlaylist: (tracks: Track[]) => void;
    addToPlaylist: (track: Track) => void;
    removeFromPlaylist: (trackId: string) => void;

    // Live Queue (Upcoming tracks, prioritized by Auto-DJ)
    queue: Track[];
    setQueue: (tracks: Track[]) => void;
    addToQueue: (track: Track) => void;
    removeFromQueue: (trackId: string) => void;
    reorderQueue: (newQueue: Track[]) => void;
    popNextFromQueue: () => Track | null;

    // Global Status
    isScanning: boolean;
    setScanning: (isScanning: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
    // Library
    library: [],
    setLibrary: (tracks) => set({ library: tracks }),
    addTrackToLibrary: (track) => set((state) => ({ library: [...state.library, track] })),

    // Playlist
    playlist: [],
    setPlaylist: (tracks) => set({ playlist: tracks }),
    addToPlaylist: (track) => set((state) => {
        if (state.playlist.find(t => t.id === track.id)) return state;
        return { playlist: [...state.playlist, track] };
    }),
    removeFromPlaylist: (trackId) => set((state) => ({
        playlist: state.playlist.filter(t => t.id !== trackId)
    })),

    // Queue
    queue: [],
    setQueue: (tracks) => set({ queue: tracks }),
    addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
    removeFromQueue: (trackId) => set((state) => ({
        queue: state.queue.filter(t => t.id !== trackId)
    })),
    reorderQueue: (newQueue) => set({ queue: newQueue }),
    popNextFromQueue: () => {
        const { queue } = get();
        if (queue.length === 0) return null;
        const next = queue[0];
        set({ queue: queue.slice(1) });
        return next;
    },

    // Scanning
    isScanning: false,
    setScanning: (isScanning) => set({ isScanning })
}));

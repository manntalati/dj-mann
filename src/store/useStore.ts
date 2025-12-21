import { create } from 'zustand';
import type { Track } from '../audio/types';

interface AppState {
    library: Track[];
    addTrackToLibrary: (track: Track) => void;
    setLibrary: (tracks: Track[]) => void;

    // Status
    isScanning: boolean;
    setScanning: (isScanning: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    library: [],
    addTrackToLibrary: (track) => set((state) => ({ library: [...state.library, track] })),
    setLibrary: (tracks) => set({ library: tracks }),

    isScanning: false,
    setScanning: (isScanning) => set({ isScanning })
}));

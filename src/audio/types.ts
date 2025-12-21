export interface Track {
    id: string;
    title: string;
    artist: string;
    url: string;
    bpm?: number;
    duration: number;
    file?: File;
    mixPoints?: MixPoint[]; // Discovered optimal mix-in/out points
}

export interface MixPoint {
    time: number;        // Position in seconds
    type: 'in' | 'out';  // Mix-in or mix-out point
    score: number;       // Quality score 0-100
    pairTrackId?: string; // ID of the paired track this works well with
}

export interface DeckState {
    track: Track | null;
    isPlaying: boolean;
    volume: number;
    speed: number;
    currentTime: number;
}

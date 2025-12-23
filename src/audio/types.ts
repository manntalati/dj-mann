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
    time: number; // Position in seconds
    type: 'in' | 'out'; // Mix in or mix out point
    matchingTime?: number; // Corresponding time on the other track
    score?: number; // Quality score (0-100)
    suggestedTransition?: TransitionType; // AI-suggested transition type
    pairTrackId?: string; // ID of the paired track this works well with
}

// Transition types for creative mixing
export type TransitionType =
    | 'ECHO_OUT'
    | 'LOOP_ROLL'
    | 'SLAM_CUT'
    | 'SCRATCH'
    | 'ACAPELLA'
    | 'VINYL_BRAKE'
    | 'BUILD_CUT'
    | 'SMART_EQ'
    | 'GRADUAL_CROSSFADE'
    | 'REVERB_WASH'
    | 'PHASER_BUILD'
    | 'BEAT_MATCHED';

export interface TransitionParams {
    duration: number; // Total transition length in seconds
    type: TransitionType;
    mixInPoint: number; // Time on target track
    mixOutPoint: number; // Time on source track
    sourceBpm: number;
    targetBpm: number;
}

export interface DeckState {
    track: Track | null;
    isPlaying: boolean;
    volume: number;
    speed: number;
    currentTime: number;
}

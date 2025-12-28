export interface Track {
    id: string;
    title: string;
    artist: string;
    url: string;
    bpm?: number;
    duration: number;
    file?: File;
    album?: string;
    dateAdded?: string;
    mixPoints?: MixPoint[];


    key?: string;
    scale?: string;
    downbeats?: number[];
    energyProfile?: number[];
}

export interface MixPoint {
    time: number;
    type: 'in' | 'out';
    matchingTime?: number;
    score?: number;
    suggestedTransition?: TransitionType;
    pairTrackId?: string;
}


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
    duration: number;
    type: TransitionType;
    mixInPoint: number;
    mixOutPoint: number;
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

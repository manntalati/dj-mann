import * as Tone from 'tone';

export class SamplerEngine {
    private players: Tone.Players;

    constructor() {
        this.players = new Tone.Players({
            'horn': 'https://tonejs.github.io/audio/berklee/gong_1.mp3',
            'crash': 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
            'kick': 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
            'snare': 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3'
        }).toDestination();

        this.players.volume.value = 0;
    }

    trigger(name: string, time?: number) {
        if (this.players.has(name)) {
            const player = this.players.player(name);
            const startTime = time !== undefined ? time : Tone.now();
            player.stop(startTime);
            player.start(startTime);
        }
    }

    get samples() {
        return ['horn', 'crash', 'kick', 'snare'];
    }
}

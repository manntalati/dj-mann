import * as Tone from 'tone';

export class SamplerEngine {
    private players: Tone.Players;

    constructor() {
        this.players = new Tone.Players({
            'horn': 'https://tonejs.github.io/audio/berklee/gong_1.mp3', // Placeholder
            'crash': 'https://tonejs.github.io/audio/drum-samples/CR78/cymbal.mp3',
            'kick': 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
            'snare': 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3'
        }).toDestination();

        // Boost volume a bit
        this.players.volume.value = 0;
    }

    trigger(name: string) {
        if (this.players.has(name)) {
            // Restart if already playing (retrigger capability)
            const player = this.players.player(name);
            player.stop();
            player.start();
        }
    }

    get samples() {
        return ['horn', 'crash', 'kick', 'snare'];
    }
}

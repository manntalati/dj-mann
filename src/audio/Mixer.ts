import * as Tone from 'tone';
import { Deck } from './Deck';

export class Mixer {
    public channelA: Tone.Channel;
    public channelB: Tone.Channel;
    public crossfader: Tone.CrossFade;
    public eqA: Tone.EQ3;
    public eqB: Tone.EQ3;

    constructor() {
        this.channelA = new Tone.Channel();
        this.channelB = new Tone.Channel();
        this.crossfader = new Tone.CrossFade();

        this.eqA = new Tone.EQ3();
        this.eqB = new Tone.EQ3();

        // Signal Chain:
        // Deck Output -> Channel (Vol/Pan/Solo) -> EQ -> Crossfader -> Destination

        this.channelA.chain(this.eqA, this.crossfader.a);
        this.channelB.chain(this.eqB, this.crossfader.b);

        this.crossfader.toDestination();
    }

    bindDecks(deckA: Deck, deckB: Deck) {
        // Decks connect to Channel input
        deckA.connect(this.channelA);
        deckB.connect(this.channelB);
        console.log('Mixer: Decks bound to channels with EQ');
    }

    setCrossfader(value: number) {
        // Value 0.0 (A) to 1.0 (B)
        // Clamp value
        const val = Math.max(0, Math.min(1, value));
        this.crossfader.fade.value = val;
    }

    setChannelVolume(channel: 'A' | 'B', db: number) {
        const target = channel === 'A' ? this.channelA : this.channelB;
        target.volume.value = db;
    }

    setEQ(channel: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) {
        // Value: -Infinity to +Display (usually -20 to +10 dB is good range)
        const targetEQ = channel === 'A' ? this.eqA : this.eqB;
        targetEQ[band].value = value;
    }

    getMeterLevels(): [number, number] {
        // This requires attaching meters to channels if we want visualization
        // For now, returning dummy or todo
        return [0, 0];
    }
}

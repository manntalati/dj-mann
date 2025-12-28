import * as Tone from 'tone';
import { Deck } from './Deck';

export class Mixer {
    public channelA: Tone.Channel;
    public channelB: Tone.Channel;
    public eqA: Tone.EQ3;
    public eqB: Tone.EQ3;
    public gainA: Tone.Gain;
    public gainB: Tone.Gain;
    public crossfader: Tone.CrossFade;
    public master: Tone.Gain;
    public sampler: import('./SamplerEngine').SamplerEngine | null = null;
    private recorder: Tone.Recorder;

    private deckA: Deck | null = null;
    private deckB: Deck | null = null;

    constructor() {
        this.channelA = new Tone.Channel({ volume: 0 });
        this.channelB = new Tone.Channel({ volume: 0 });

        this.eqA = new Tone.EQ3();
        this.eqB = new Tone.EQ3();
        this.gainA = new Tone.Gain(1);
        this.gainB = new Tone.Gain(1);
        this.crossfader = new Tone.CrossFade(0.5);
        this.master = new Tone.Gain(1).toDestination();
        this.recorder = new Tone.Recorder();
        this.master.connect(this.recorder);

        this.channelA.chain(this.gainA, this.eqA, this.crossfader.a);
        this.channelB.chain(this.gainB, this.eqB, this.crossfader.b);
        this.crossfader.connect(this.master);
    }

    bindDecks(deckA: Deck, deckB: Deck) {
        this.deckA = deckA;
        this.deckB = deckB;
        deckA.connect(this.channelA);
        deckB.connect(this.channelB);
        console.log('Mixer: Decks bound');
    }

    setCrossfader(value: number) {
        const val = Math.max(0, Math.min(1, value));
        this.crossfader.fade.value = val;
    }

    setChannelVolume(channel: 'A' | 'B', db: number) {
        const target = channel === 'A' ? this.channelA : this.channelB;
        target.volume.value = db;
    }

    setGain(channel: 'A' | 'B', value: number) {
        // Value: 0 to 100
        const gainNode = channel === 'A' ? this.gainA : this.gainB;
        if (gainNode) {
            // Map 0...100 to 0...2.0 (standard DJ gain allows some boost)
            gainNode.gain.value = (value / 100) * 1.5;
        }
    }

    setFilter(channel: 'A' | 'B', value: number) {
        // Bipolar filter: -100 (LPF) ... 0 (None) ... +100 (HPF)
        const deck = channel === 'A' ? this.deckA : this.deckB;
        if (!deck) return;

        if (value < -5) {
            // Low Pass
            deck.filter.type = 'lowpass';
            // Linear map helper
            const map = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
                (v - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

            deck.filter.frequency.value = map(value, -5, -100, 20000, 200);
        } else if (value > 5) {
            // High Pass
            deck.filter.type = 'highpass';
            const map = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
                (v - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

            deck.filter.frequency.value = map(value, 5, 100, 20, 5000);
        } else {
            // Effectively Bypassed
            deck.filter.type = 'lowpass';
            deck.filter.frequency.value = 20000;
        }
    }

    setEQ(channel: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) {
        const targetEQ = channel === 'A' ? this.eqA : this.eqB;
        targetEQ[band].value = value;
    }

    getMeterLevels(): [number, number] {
        // This requires attaching meters to channels if we want visualization
        // For now, returning dummy or todo
        return [0, 0];
    }



    async startRecording() {
        if (this.recorder.state === 'started') return;
        console.log('Mixer: Starting session recording...');
        await this.recorder.start();
    }

    async stopRecording(): Promise<Blob> {
        if (this.recorder.state !== 'started') {
            console.warn('Mixer: Recorder not started');
            return new Blob();
        }
        console.log('Mixer: Stopping session recording...');
        return await this.recorder.stop();
    }

    async downloadRecording(filename: string = 'DJ_Mann_Session.webm') {
        const blob = await this.stopRecording();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.download = filename;
        anchor.href = url;
        anchor.click();
        console.log(`Mixer: Downloaded recording as ${filename}`);
    }
}


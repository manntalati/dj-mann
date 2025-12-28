import * as Tone from 'tone';
import { Deck } from './Deck';
import { Mixer } from './Mixer';
import { SamplerEngine } from './SamplerEngine';
import { AutoDJ } from './AutoDJ';

class AudioEngine {
    private static instance: AudioEngine;
    private _isReady: boolean = false;

    public mixer: Mixer;
    public deckA: Deck;
    public deckB: Deck;
    public sampler: SamplerEngine;
    public autoDJ: AutoDJ;

    private constructor() {
        this.mixer = new Mixer();
        this.deckA = new Deck();
        this.deckB = new Deck();
        this.sampler = new SamplerEngine();

        this.mixer.bindDecks(this.deckA, this.deckB);
        this.mixer.sampler = this.sampler;
        this.autoDJ = new AutoDJ(this.deckA, this.deckB, this.mixer);
    }

    public static getInstance(): AudioEngine {
        if (!AudioEngine.instance) {
            AudioEngine.instance = new AudioEngine();
        }
        return AudioEngine.instance;
    }

    public async init() {
        if (this._isReady) return;

        await Tone.start();
        console.log('Audio Context Started');
        this._isReady = true;
    }

    public get context() {
        return Tone.getContext();
    }

    public get isReady() {
        return this._isReady;
    }
}

export const audioEngine = AudioEngine.getInstance();

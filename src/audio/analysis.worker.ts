
import { EssentiaWASM, Essentia } from 'essentia.js';

// Define the worker's input interface
interface AnalysisRequest {
    audioData: Float32Array;
    sampleRate: number;
    id: string;
}

export interface AnalysisResult {
    bpm: number;
    key: string;
    scale: string;
    downbeats: number[];
    energyProfile: number[];
}


let essentia: any = null;

// Initialize Essentia
const initEssentia = async () => {
    if (essentia) return;

    // The export structure can vary depending on bundling (UMD/CJS/ESM)
    // EssentiaWASM might be a factory function or an object containing the Module
    let factory = (EssentiaWASM as any).EssentiaWASM || EssentiaWASM;

    // Vite/ESM interop handling
    if (typeof factory !== 'function' && (EssentiaWASM as any).default) {
        factory = (EssentiaWASM as any).default.EssentiaWASM || (EssentiaWASM as any).default;
    }

    let WasmModule: any;
    if (typeof factory === 'function') {
        WasmModule = await factory();
    } else {
        WasmModule = factory;
        // If it's a non-modularized Emscripten object, wait for initialization
        if (!WasmModule.EssentiaJS && !WasmModule.calledRun) {
            await new Promise<void>((resolve) => {
                const checkReady = () => {
                    if (WasmModule.EssentiaJS || WasmModule.calledRun) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 50);
                    }
                };
                checkReady();
            });
        }
    }

    if (!WasmModule || (!WasmModule.EssentiaJS && !WasmModule.calledRun)) {
        throw new Error('EssentiaWASM module could not be initialized');
    }

    essentia = new Essentia(WasmModule, false);
};

self.onmessage = async (e: MessageEvent<AnalysisRequest>) => {
    const { audioData, id } = e.data;

    try {
        await initEssentia();

        // Convert Float32Array to Essentia Vector
        const audioVector = essentia.arrayToVector(audioData);

        // 1. BPM and Beat Detection
        const rhythm = essentia.RhythmExtractor2013(audioVector);
        const bpm = rhythm.bpm;
        const ticks = essentia.vectorToArray(rhythm.ticks);
        const downbeats = ticks;

        // 2. Key Detection
        const keyData = essentia.KeyExtractor(audioVector);
        const key = keyData.key;
        const scale = keyData.scale;

        // 3. Energy Profile for Structure (RMS)
        // Process in 1-second chunks for energy profile
        const rmsProfile: number[] = [];

        // Use RMS for simple energy profile
        for (let i = 0; i < audioData.length; i += 4096) {
            const chunk = audioData.slice(i, i + 4096);
            if (chunk.length === 0) break;
            let sum = 0;
            for (let j = 0; j < chunk.length; j++) {
                sum += chunk[j] * chunk[j];
            }
            rmsProfile.push(Math.sqrt(sum / chunk.length));
        }

        // Cleanup input vector to free memory
        audioVector.delete();

        const result: AnalysisResult = {
            bpm,
            key,
            scale,
            downbeats,
            energyProfile: rmsProfile
        };

        self.postMessage({ id, result });

    } catch (error) {
        console.error("Essentia Worker Error:", error);
        self.postMessage({ id, error: (error as any).message });
    }
};

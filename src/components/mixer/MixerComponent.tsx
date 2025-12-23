import React, { useState } from 'react';
import styles from './MixerComponent.module.css';
import { Mixer } from '../../audio/Mixer';
import { audioEngine } from '../../audio/AudioEngine';
import { SamplerComponent } from '../sampler/SamplerComponent';
import { AutoDJSect } from './AutoDJSect';
import { Knob } from '../shared/Knob';

interface MixerComponentProps {
    mixer: Mixer;
}

export const MixerComponent: React.FC<MixerComponentProps> = ({ mixer }) => {
    const [crossfader, setCrossfader] = useState(0.5);
    const [faderA, setFaderA] = useState(100);
    const [faderB, setFaderB] = useState(100);

    // EQ State - default 0 dB
    const [eqA, setEqA] = useState({ low: 0, mid: 0, high: 0 });
    const [eqB, setEqB] = useState({ low: 0, mid: 0, high: 0 });

    const handleCrossfader = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setCrossfader(val);
        mixer.setCrossfader(val);
    };

    const handleVolume = (channel: 'A' | 'B', value: number) => {
        let db = value === 0 ? -100 : 20 * Math.log10(value / 100);

        if (channel === 'A') {
            setFaderA(value);
            mixer.setChannelVolume('A', db);
        } else {
            setFaderB(value);
            mixer.setChannelVolume('B', db);
        }
    };

    const handleEQ = (channel: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) => {
        // value is -20 to +10 typically
        mixer.setEQ(channel, band, value);
        if (channel === 'A') {
            setEqA(prev => ({ ...prev, [band]: value }));
        } else {
            setEqB(prev => ({ ...prev, [band]: value }));
        }
    };

    return (
        <div className={styles.mixer}>
            <div className={styles.channelsSection}>
                {/* LEFT CHANNEL - DECK A */}
                <div className={styles.channelStrip}>
                    <div className={styles.eqSection}>
                        <Knob label="HIGH" min={-20} max={10} value={eqA.high} onChange={(v) => handleEQ('A', 'high', v)} size={48} />
                        <Knob label="MID" min={-20} max={10} value={eqA.mid} onChange={(v) => handleEQ('A', 'mid', v)} size={48} />
                        <Knob label="LOW" min={-20} max={10} value={eqA.low} onChange={(v) => handleEQ('A', 'low', v)} size={48} />
                    </div>
                    <label className={styles.channelLabel}>VOL A</label>
                    <div className={styles.sliderTrack}>
                        <input
                            type="range"
                            className={`${styles.volumeSlider} ${styles.sliderA}`}
                            min="0" max="100"
                            value={faderA}
                            onChange={(e) => handleVolume('A', parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                {/* CENTER SECTION - FX + AUTO-PILOT + CROSSFADER */}
                <div className={styles.centerSection}>
                    <div className={styles.fxPadsContainer}>
                        <SamplerComponent sampler={audioEngine.sampler} />
                    </div>
                    <div className={styles.autoPilotCompact}>
                        <AutoDJSect />
                    </div>
                    {/* CROSSFADER IN CENTER */}
                    <div className={styles.xfaderSection}>
                        <div className={styles.xfaderLabels}>
                            <span>A</span>
                            <span>B</span>
                        </div>
                        <input
                            type="range"
                            className={styles.crossfader}
                            min="0" max="1" step="0.005"
                            value={crossfader}
                            onChange={handleCrossfader}
                        />
                    </div>
                </div>

                {/* RIGHT CHANNEL - DECK B */}
                <div className={styles.channelStrip}>
                    <div className={styles.eqSection}>
                        <Knob label="HIGH" min={-20} max={10} value={eqB.high} onChange={(v) => handleEQ('B', 'high', v)} size={48} />
                        <Knob label="MID" min={-20} max={10} value={eqB.mid} onChange={(v) => handleEQ('B', 'mid', v)} size={48} />
                        <Knob label="LOW" min={-20} max={10} value={eqB.low} onChange={(v) => handleEQ('B', 'low', v)} size={48} />
                    </div>
                    <label className={styles.channelLabel}>VOL B</label>
                    <div className={styles.sliderTrack}>
                        <input
                            type="range"
                            className={`${styles.volumeSlider} ${styles.sliderB}`}
                            min="0" max="100"
                            value={faderB}
                            onChange={(e) => handleVolume('B', parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import styles from './SamplerComponent.module.css';
import { SamplerEngine } from '../../audio/SamplerEngine';

interface SamplerComponentProps {
    sampler: SamplerEngine;
}

export const SamplerComponent: React.FC<SamplerComponentProps> = ({ sampler }) => {
    return (
        <div className={styles.container}>
            <div className={styles.label}>FX PADS</div>
            <div className={styles.grid}>
                {sampler.samples.map((sample) => (
                    <button
                        key={sample}
                        className={styles.pad}
                        onMouseDown={() => sampler.trigger(sample)}
                    >
                        {sample}
                    </button>
                ))}
            </div>
        </div>
    );
};

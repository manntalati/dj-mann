import React, { useState, useEffect } from 'react';
import styles from './AutoDJSect.module.css';
import { audioEngine } from '../../audio/AudioEngine';
import { ArrowRight, Zap } from 'lucide-react';

export const AutoDJSect: React.FC = () => {
    const [isAutoPilot, setIsAutoPilot] = useState(audioEngine.autoDJ.isAutoPilot);
    const [isMixing, setIsMixing] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [activeDeck, setActiveDeck] = useState(audioEngine.autoDJ.activeDeckId);

    // Sync UI with engine state
    useEffect(() => {
        const interval = setInterval(() => {
            setIsAutoPilot(audioEngine.autoDJ.isAutoPilot);
            setIsMixing(audioEngine.autoDJ.mixingStatus);
            setTimeRemaining(audioEngine.autoDJ.timeRemaining);
            setActiveDeck(audioEngine.autoDJ.activeDeckId);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const toggleAutoPilot = () => {
        const newState = audioEngine.autoDJ.toggleAutoPilot();
        setIsAutoPilot(newState);
    };

    const handleManualMix = async (direction: 'A' | 'B') => {
        if (isMixing) return;
        await audioEngine.autoDJ.startAdvancedTransition(direction);
    };

    // Calculate progress for the timer bar (last 30 seconds)
    const mixThreshold = 30;
    const progress = Math.max(0, Math.min(100, (timeRemaining / mixThreshold) * 100));

    return (
        <div className={styles.container}>
            <div className={styles.topInfo}>
                <div className={styles.label}>AUTO-PILOT SYSTEM</div>
                {isAutoPilot && (
                    <div className={styles.deckStatus}>
                        ACTIVE: <span className={styles.activeDeckLabel}>DECK {activeDeck}</span>
                    </div>
                )}
            </div>

            <button
                className={`${styles.autoPilotBtn} ${isAutoPilot ? styles.active : ''}`}
                onClick={toggleAutoPilot}
            >
                <div className={styles.statusDot}></div>
                {isAutoPilot ? 'AUTO-MIXING ENGAGED' : 'ENGAGE AUTO-MIX'}
            </button>

            {isAutoPilot && (
                <div className={styles.progressSection}>
                    <div className={styles.timerRow}>
                        <span className={styles.timerLabel}>NEXT TRANSITION IN:</span>
                        <span className={styles.timerValue}>{Math.ceil(timeRemaining)}s</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressInner}
                            style={{ width: `${progress}%`, transition: 'width 0.5s linear' }}
                        ></div>
                    </div>
                </div>
            )}

            <div className={styles.footer}>
                <div className={styles.manualActions}>
                    <button
                        className={styles.miniMixBtn}
                        onClick={() => handleManualMix('A')}
                        disabled={isMixing}
                        title="Manual Mix to A"
                    >
                        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <span className={styles.miniLabel}>MIX</span>
                    <button
                        className={styles.miniMixBtn}
                        onClick={() => handleManualMix('B')}
                        disabled={isMixing}
                        title="Manual Mix to B"
                    >
                        <ArrowRight size={14} />
                    </button>
                </div>

                <div className={styles.fxIndicator}>
                    <Zap
                        size={18}
                        className={isMixing ? styles.animatingZap : styles.dimZap}
                    />
                </div>
            </div>
        </div>
    );
};

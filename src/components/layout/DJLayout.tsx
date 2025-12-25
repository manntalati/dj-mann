import React from 'react';
import styles from './DJLayout.module.css';

interface DJLayoutProps {
    leftPanel: React.ReactNode;
    mixer: React.ReactNode;
    rightPanelTop: React.ReactNode;
    rightPanelBottom: React.ReactNode;
}

export const DJLayout: React.FC<DJLayoutProps> = ({
    leftPanel,
    mixer,
    rightPanelTop,
    rightPanelBottom
}) => {
    return (
        <div className={styles.container}>
            {/* LEFT COLUMN - Queue, Playlist, Library */}
            <div className={styles.leftColumn}>
                {leftPanel}
            </div>

            {/* MIDDLE COLUMN - Compact Mixer */}
            <div className={styles.middleColumn}>
                {mixer}
            </div>

            {/* RIGHT COLUMN - Decks */}
            <div className={styles.rightColumn}>
                <div className={styles.deckWrapper}>{rightPanelTop}</div>
                <div className={styles.deckWrapper}>{rightPanelBottom}</div>
            </div>
        </div>
    );
};

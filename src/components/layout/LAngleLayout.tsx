import React from 'react';
import styles from './LAngleLayout.module.css';

interface LAngleLayoutProps {
    sidebar: React.ReactNode;
    bottomPanel: React.ReactNode;
    mixer: React.ReactNode;
    rightPanelTop: React.ReactNode;
    rightPanelBottom: React.ReactNode;
}

export const LAngleLayout: React.FC<LAngleLayoutProps> = ({
    sidebar,
    bottomPanel,
    mixer,
    rightPanelTop,
    rightPanelBottom
}) => {
    return (
        <div className={styles.container}>
            {/* LEFT SIDEBAR - Queue & Playlist */}
            <div className={styles.sidebar}>
                {sidebar}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className={styles.mainContent}>
                {/* TOP ROW: Mixer + Decks */}
                <div className={styles.topRow}>
                    <div className={styles.mixerContainer}>
                        {mixer}
                    </div>
                    <div className={styles.decksContainer}>
                        <div className={styles.deckWrapper}>{rightPanelTop}</div>
                        <div className={styles.deckWrapper}>{rightPanelBottom}</div>
                    </div>
                </div>

                {/* BOTTOM ROW: Library */}
                <div className={styles.bottomRow}>
                    {bottomPanel}
                </div>
            </div>
        </div>
    );
};

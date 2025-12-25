import React from 'react';
import styles from './ThreeColumnLayout.module.css';

interface ThreeColumnLayoutProps {
    leftPanel: React.ReactNode;
    middlePanel: React.ReactNode;
    rightPanelTop: React.ReactNode;
    rightPanelBottom: React.ReactNode;
}

export const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({
    leftPanel,
    middlePanel,
    rightPanelTop,
    rightPanelBottom
}) => {
    return (
        <div className={styles.container}>
            {/* LEFT COLUMN - MEDIA MANAGER */}
            <div className={styles.leftColumn}>
                {leftPanel}
            </div>

            {/* MIDDLE COLUMN - MIXER & CONTROLS */}
            <div className={styles.middleColumn}>
                {middlePanel}
            </div>

            {/* RIGHT COLUMN - DECKS */}
            <div className={styles.rightColumn}>
                <div className={styles.deckWrapper}>
                    {rightPanelTop}
                </div>
                <div className={styles.deckWrapper}>
                    {rightPanelBottom}
                </div>
            </div>
        </div>
    );
};

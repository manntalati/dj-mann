import React from 'react';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    leftDeck: React.ReactNode;
    mixer: React.ReactNode;
    rightDeck: React.ReactNode;
    bottomPanel: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ leftDeck, mixer, rightDeck, bottomPanel }) => {
    return (
        <div className={styles.container}>
            <div className={styles.decksRow}>
                <div className={styles.deckContainer}>{leftDeck}</div>
                <div className={styles.mixerContainer}>{mixer}</div>
                <div className={styles.deckContainer}>{rightDeck}</div>
            </div>
            <div className={styles.bottomRow}>
                <div className={styles.managerContainer}>
                    {bottomPanel}
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    leftDeck: React.ReactNode;
    mixer: React.ReactNode;
    rightDeck: React.ReactNode;
    library: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ leftDeck, mixer, rightDeck, library }) => {
    return (
        <div className={styles.container}>
            <div className={styles.decksRow}>
                <div className={styles.deckContainer}>{leftDeck}</div>
                <div className={styles.mixerContainer}>{mixer}</div>
                <div className={styles.deckContainer}>{rightDeck}</div>
            </div>
            <div className={styles.libraryRow}>
                {library}
            </div>
        </div>
    );
};

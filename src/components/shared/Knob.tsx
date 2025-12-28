import React, { useState, useEffect, useRef } from 'react';
import styles from './Knob.module.css';

interface KnobProps {
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    label: string;
    description?: string;
    size?: number; // Diameter in pixels, default 60
}

export const Knob: React.FC<KnobProps> = ({ min, max, value, onChange, label, size = 60 }) => {
    const [dragging, setDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startVal, setStartVal] = useState(0);
    const knobRef = useRef<HTMLDivElement>(null);

    const percentage = (value - min) / (max - min);
    const rotation = -135 + (percentage * 270);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setStartY(e.clientY);
        setStartVal(value);

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging) return;

            const deltaY = startY - e.clientY;
            const range = max - min;
            const deltaVal = (deltaY / 200) * range;

            let newVal = startVal + deltaVal;
            newVal = Math.max(min, Math.min(max, newVal));

            onChange(newVal);
        };

        const handleMouseUp = () => {
            setDragging(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, startY, startVal, min, max, onChange]);

    return (
        <div className={styles.container}>
            <div
                className={styles.knobOuter}
                onMouseDown={handleMouseDown}
                ref={knobRef}
                style={{ width: `${size}px`, height: `${size}px` }}
            >
                <div
                    className={styles.knobInner}
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className={styles.marker}></div>
                </div>
            </div>
            <span className={styles.label}>{label}</span>
        </div>
    );
};

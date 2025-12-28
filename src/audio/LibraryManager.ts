import { useStore } from '../store/useStore';
import type { Track } from './types';

export class LibraryManager {

    async openDirectory() {
        try {
            // @ts-ignore - File System Access API types might be missing in default TS
            const dirHandle = await window.showDirectoryPicker();
            useStore.getState().setScanning(true);

            const tracks: Track[] = [];

            // Recursive scan
            await this.scanDirectory(dirHandle, tracks);

            useStore.getState().setLibrary(tracks);
            useStore.getState().setScanning(false);
            console.log(`Library scanned: ${tracks.length} tracks found.`);

        } catch (err) {
            console.error('Error opening directory:', err);
            useStore.getState().setScanning(false);
        }
    }

    private async scanDirectory(dirHandle: any, tracks: Track[]) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (this.isAudioFile(entry.name)) {
                    const file = await entry.getFile();
                    const url = URL.createObjectURL(file);

                    tracks.push({
                        id: crypto.randomUUID(),
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        artist: 'Unknown',
                        url: url,
                        duration: 0,
                        file: file
                    });
                }
            } else if (entry.kind === 'directory') {
                await this.scanDirectory(entry, tracks);
            }
        }
    }

    private isAudioFile(filename: string): boolean {
        return /\.(mp3|wav|ogg|m4a|flac)$/i.test(filename);
    }
}

export const libraryManager = new LibraryManager();

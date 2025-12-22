import { useState } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { DeckComponent } from './components/deck/DeckComponent';
import { MixerComponent } from './components/mixer/MixerComponent';
import { MainLayout } from './components/layout/MainLayout';
import { LibraryComponent } from './components/library/LibraryComponent';
import './index.css';

function App() {
  const [ready, setReady] = useState(false);

  const startAudio = async () => {
    await audioEngine.init();
    setReady(true);
  };

  if (!ready) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        color: 'var(--text-main)',
        fontFamily: 'var(--font-main)'
      }}>
        <h1 style={{ marginBottom: '20px', fontSize: '3rem', letterSpacing: '4px' }}>DJ MANN</h1>
        <button
          onClick={startAudio}
          style={{
            padding: '12px 32px',
            fontSize: '1.2rem',
            background: 'var(--accent-primary)',
            color: 'var(--bg-dark)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            fontWeight: 700,
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)'
          }}
        >
          ENTER BOOTH
        </button>
      </div>
    );
  }

  return (
    <MainLayout
      leftDeck={<DeckComponent deck={audioEngine.deckA} id="A" />}
      mixer={<MixerComponent mixer={audioEngine.mixer} />}
      rightDeck={<DeckComponent deck={audioEngine.deckB} id="B" />}
      bottomPanel={<LibraryComponent />}
    />
  );
}

export default App;

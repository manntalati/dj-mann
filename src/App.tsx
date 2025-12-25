import { useState } from 'react';
import { audioEngine } from './audio/AudioEngine';
import { DeckComponent } from './components/deck/DeckComponent';
import { MixerComponent } from './components/mixer/MixerComponent';
import { DJLayout } from './components/layout/DJLayout';
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
        <h1 style={{
          marginBottom: 'var(--spacing-xl)',
          fontSize: '3.5rem',
          letterSpacing: '2px',
          fontWeight: 'var(--font-weight-black)',
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>DJ MANN</h1>
        <button
          onClick={startAudio}
          style={{
            padding: '14px 40px',
            fontSize: '1rem',
            background: 'var(--accent-primary)',
            color: 'var(--bg-dark)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            fontWeight: 'var(--font-weight-bold)',
            boxShadow: 'var(--shadow-lg)',
            transition: 'all var(--transition-fast)',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-primary-hover)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-primary)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ENTER BOOTH
        </button>
      </div>
    );
  }

  return (
    <DJLayout
      leftPanel={<LibraryComponent />}
      mixer={<MixerComponent mixer={audioEngine.mixer} />}
      rightPanelTop={<DeckComponent deck={audioEngine.deckA} id="A" />}
      rightPanelBottom={<DeckComponent deck={audioEngine.deckB} id="B" />}
    />
  );
}

export default App;

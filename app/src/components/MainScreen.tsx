// src/components/MainScreen.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchAllCharacters } from '../api/characterApi';

export const MainScreen: React.FC = () => {
  const navigate = useNavigate();
  const [hasSavedCharacters, setHasSavedCharacters] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkSavedGames = async () => {
      try {
        setIsLoading(true);
        const characters = await fetchAllCharacters();
        if (isMounted) {
          setHasSavedCharacters(characters.length > 0);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error connecting to server');
          setHasSavedCharacters(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSavedGames();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>RPG Realm</h1>

      {error && <p style={styles.errorText}>{error}</p>}

      <div style={styles.buttonContainer}>
        <button
          style={styles.button}
          onClick={() => navigate('/character/new')}
        >
          New Game
        </button>

        <button
          style={{
            ...styles.button,
            ...(!hasSavedCharacters || isLoading ? styles.disabledButton : {}),
          }}
          disabled={!hasSavedCharacters || isLoading}
          onClick={() => navigate('/character/select')}
        >
          {isLoading ? 'Checking saves...' : 'Load Game'}
        </button>
      </div>
    </div>
  );
};

// Inline styles for fast preview
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#ffffff',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '3rem',
    marginBottom: '2rem',
    letterSpacing: '2px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '200px',
  },
  button: {
    padding: '0.8rem 1.5rem',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  disabledButton: {
    backgroundColor: '#374151',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
};
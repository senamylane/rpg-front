// src/components/CreateCharacterScreen.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { createCharacter } from '../api/characterApi';
import type { HeroClass } from '../api/characterApi';

const HERO_CLASSES: { value: HeroClass; label: string }[] = [
  { value: 'Warrior', label: 'Warrior (Guerreiro)' },
  { value: 'Mage', label: 'Mage (Mago)' },
  { value: 'Priest', label: 'Priest (Clérigo)' },
  { value: 'Archer', label: 'Archer (Arqueiro)' },
];

export const CreateCharacterScreen: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [classType, setClassType] = useState<HeroClass>('Warrior');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter a character name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const newCharacter = await createCharacter({
        name: trimmedName,
        classType,
      });

      navigate(`/game/${newCharacter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create Your Hero</h1>

      {error && <p style={styles.errorText}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label} htmlFor="characterName">
            Character Name
          </label>
          <input
            id="characterName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Valerius"
            maxLength={20}
            disabled={isSubmitting}
            style={styles.input}
            autoFocus
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label} htmlFor="heroClass">
            Class
          </label>
          <select
            id="heroClass"
            value={classType}
            onChange={(e) => setClassType(e.target.value as HeroClass)}
            disabled={isSubmitting}
            style={styles.select}
          >
            {HERO_CLASSES.map((cls) => (
              <option key={cls.value} value={cls.value}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            style={{
              ...styles.button,
              ...(!name.trim() || isSubmitting ? styles.disabledButton : {}),
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Character'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            disabled={isSubmitting}
            style={styles.secondaryButton}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
};

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
    fontSize: '2.5rem',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '300px',
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '1rem',
    color: '#d1d5db',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #4b5563',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    outline: 'none',
  },
  select: {
    padding: '0.75rem',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #4b5563',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.75rem',
    fontSize: '1rem',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  disabledButton: {
    backgroundColor: '#374151',
    color: '#6b7280',
    cursor: 'not-allowed',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
};
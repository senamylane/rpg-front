
const API_BASE_URL = 'http://localhost:8080'; 
import type {GameCharacter} from "../types/character"
import type {Battle} from "../types/battle"
import type {ZoneType} from "../types/zone"

export const fetchAllCharacters = async (): Promise<GameCharacter[]> => {
  const response = await fetch(`${API_BASE_URL}/character/all`);
  if (!response.ok) {
    throw new Error(`Failed to fetch characters: ${response.statusText}`);
  }
  return response.json();
};

export const createCharacter = async (name: string): Promise<GameCharacter> => {
  const response = await fetch(`${API_BASE_URL}/character/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create character: ${response.statusText}`);
  }

  return response.json();
};

export const fetchCharacterById = async (characterId: number): Promise<GameCharacter> => {
  const response = await fetch(`${API_BASE_URL}/character/${characterId}`);
  if (!response.ok) throw new Error('Failed to fetch character details');
  return response.json();
};

export const fetchActiveBattle = async (characterId: number): Promise<Battle | null> => {
  const response = await fetch(`${API_BASE_URL}/battle/active/${characterId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to check active battle');
  return response.json();
};

export const changeCharacterZone = async (characterId: number, zone: ZoneType): Promise<GameCharacter> => {
  const response = await fetch(`${API_BASE_URL}/character/change-zone/${zone}?characterId=${characterId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to change zone');
  return response.json();
};
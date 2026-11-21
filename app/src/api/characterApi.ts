import type {GameCharacter} from "../types/character"
import type {Battle} from "../types/battle"
import type {ZoneType} from "../types/zone"
import type {BattlePlayer} from './battleApi'

const API_BASE_URL = 'http://localhost:8080'; 
export type HeroClass = 'Warrior' | 'Mage' | 'Priest' | 'Archer';
export interface CreateCharacterPayload {
  name: string;
  classType: HeroClass;
}

export const fetchAllCharacters = async (): Promise<GameCharacter[]> => {
  const response = await fetch(`${API_BASE_URL}/character/all`);
  if (!response.ok) {
    throw new Error(`Failed to fetch characters: ${response.statusText}`);
  }
  return response.json();
};

export const createCharacter = async (payload: CreateCharacterPayload): Promise<GameCharacter> => {
  const response = await fetch(`${API_BASE_URL}/character/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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

export const changeCharacterZone = async (characterId: number, zone: ZoneType): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/character/${characterId}/change-zone/${zone}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao alterar região: ${response.statusText}`);
  }

  // Como o backend retorna boolean (true/false)
  return response.json();
};

export const takeBreath = async (characterId: number): Promise<BattlePlayer | null> => {
  const response = await fetch(`${API_BASE_URL}/character/${characterId}/take-breath`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Could not take breath');
  return response.json();
};

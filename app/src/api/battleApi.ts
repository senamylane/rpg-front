const API_BASE_URL = 'http://localhost:8080'; 
import type {Battle} from "../types/battle"

export const initBattle = async (characterId: number): Promise<Battle> => {
  const response = await fetch(`${API_BASE_URL}/battle/init?character_id=${characterId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to initialize battle');
  return response.json();
};
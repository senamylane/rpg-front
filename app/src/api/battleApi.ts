// src/api/battleApi.ts

const API_BASE_URL = 'http://localhost:8080';

export interface BattlePlayer {
  id: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  defense: number;
}

export interface BattleEnemy {
  id: number;
  enemy_id: string; // UUID usado para o target_id
  name: string;
  level: number;
  rank: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
}

export interface BattleData {
  id: string; // battle_id
  player: BattlePlayer;
  enemies: BattleEnemy[];
  currentTurn: string;
  finished: boolean;
  status: string;
  turnCount: number;
}

export const initBattle = async (characterId: number): Promise<BattleData> => {
  const response = await fetch(`${API_BASE_URL}/battle/init?character_id=${characterId}`, {
    method: 'POST', 
  });
  if (!response.ok) throw new Error('Falha ao iniciar batalha');
  return response.json();
};

export const playerAttack = async (battleId: string, attackerId: number, targetId: string): Promise<BattleEnemy> => {
  const response = await fetch(`${API_BASE_URL}/battle/player-attack?battle_id=${battleId}&attacker_id=${attackerId}&target_id=${targetId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Falha ao atacar inimigo');
  return response.json();
};

export const endBattle = async (battleId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/battle/end/${battleId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Falha ao encerrar batalha');
};

export const getBattleById = async (battleId: string): Promise<BattleData> => {
  const response = await fetch(`${API_BASE_URL}/battle/${battleId}`);
  if (!response.ok) throw new Error('Falha ao carregar os dados da batalha');
  return response.json();
};

export const enemyAttack = async (battleId: string, attackerId: string, targetId: number): Promise<BattlePlayer> => {
  const response = await fetch(`${API_BASE_URL}/battle/enemy-attack?battle_id=${battleId}&attacker_id=${attackerId}&target_id=${targetId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Falha no ataque do inimigo');
  return response.json(); // Presume-se que o backend retorna os dados atualizados do player
};

export const reviveCharacter = async (characterId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/character/${characterId}/revive`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Falha ao reviver personagem');
};
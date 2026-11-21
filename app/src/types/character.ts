export interface GameCharacter {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  currentZone: string;
  level: number;
  experience: number;
  nextLevelExperience: number;
}
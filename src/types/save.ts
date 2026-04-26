import type { RankType } from './game.ts';

export interface StageRecord {
  unlocked: boolean;
  completed: boolean;
  normalExit: boolean;
  secretExit: boolean;
  rank: RankType | null;
  bestCoins: number;
  maxCoins: number;
  bestTime: number;
  bestScore: number;
  lastExit: 'normal' | 'secret' | null;
}

export interface SaveData {
  version: number;
  bestScore: number;
  totalCoinsLifetime: number;
  unlockedWorlds: string[];
  currentWorld: string;
  currentNode: string;
  stages: Record<string, StageRecord>;
  gameCompleted: boolean;
  started: boolean;
}

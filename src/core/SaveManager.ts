import { SAVE_KEY, RANK_ORDER } from '../constants/game.ts';
import type { SaveData, StageRecord } from '../types/save.ts';
import type { RankType } from '../types/game.ts';
import { NODE_INDEX, WORLD_INDEX } from '../data/worlds.ts';

function defaultSave(): SaveData {
  return {
    version: 1, bestScore: 0, totalCoinsLifetime: 0,
    unlockedWorlds: ['w1'], currentWorld: 'w1', currentNode: 'w1_1',
    stages: {}, gameCompleted: false, started: false,
  };
}

export class SaveManager {
  data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultSave();
  }

  persist(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  wipe(): void {
    this.data = defaultSave();
    this.ensureStageRecord('w1_1').unlocked = true;
    this.persist();
  }

  ensureStageRecord(id: string): StageRecord {
    if (!this.data.stages[id]) {
      this.data.stages[id] = {
        unlocked: false, completed: false,
        normalExit: false, secretExit: false,
        rank: null, bestCoins: 0, maxCoins: 0,
        bestTime: 0, bestScore: 0, lastExit: null,
      };
    }
    return this.data.stages[id]!;
  }

  stageRecord(id: string): StageRecord {
    return this.ensureStageRecord(id);
  }

  unlockNode(id: string): void {
    if (!id) return;
    this.ensureStageRecord(id).unlocked = true;
    const node = NODE_INDEX[id];
    if (node && !this.data.unlockedWorlds.includes(node.world)) {
      this.data.unlockedWorlds.push(node.world);
    }
    this.persist();
  }

  nodeUnlocked(id: string): boolean {
    return !!this.stageRecord(id).unlocked;
  }

  nodeVisible(id: string): boolean {
    const n = NODE_INDEX[id];
    if (!n) return false;
    return !n.hidden || this.nodeUnlocked(id) || this.stageRecord(id).completed;
  }

  rankBetter(a: RankType | null, b: RankType | null): RankType {
    const ra = RANK_ORDER[a ?? 'C'];
    const rb = RANK_ORDER[b ?? 'C'];
    return ra > rb ? (a ?? 'C') : (b ?? 'C');
  }

  worldCompletion(worldId: string) {
    const world = WORLD_INDEX[worldId];
    const visible = world.nodes;
    const completed  = visible.filter(n => this.stageRecord(n.id).completed).length;
    const exitsFound = visible.reduce((a, n) =>
      a + (this.stageRecord(n.id).normalExit ? 1 : 0)
        + (n.secretTo && this.stageRecord(n.id).secretExit ? 1 : 0), 0);
    const exitMax = visible.reduce((a, n) => a + 1 + (n.secretTo ? 1 : 0), 0);
    const highRanks = visible.filter(n => ['A','S'].includes(this.stageRecord(n.id).rank ?? '')).length;
    return { completed, total: visible.length, exitMax, exitsFound, highRanks, rankTotal: visible.length };
  }

  totalCompletionPercent(): number {
    const all = Object.values(NODE_INDEX).filter(n => (n as { playable?: boolean }).playable !== false);
    const done = all.filter(n => this.stageRecord(n.id).completed).length;
    const exitFound = all.reduce((a, n) =>
      a + (this.stageRecord(n.id).normalExit ? 1 : 0)
        + (n.secretTo && this.stageRecord(n.id).secretExit ? 1 : 0), 0);
    const exitTotal = all.reduce((a, n) => a + 1 + (n.secretTo ? 1 : 0), 0);
    const ratio = (done / all.length) * 0.65 + (exitFound / exitTotal) * 0.35;
    return Math.round(ratio * 100);
  }

  initDefaultUnlocks(): void {
    if (!this.data.unlockedWorlds.includes('w1')) this.data.unlockedWorlds.unshift('w1');
    this.ensureStageRecord('w1_1').unlocked = true;
    for (const wId of this.data.unlockedWorlds) {
      const world = WORLD_INDEX[wId];
      if (world) this.unlockNode(world.entry);
    }
  }
}

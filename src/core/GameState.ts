import type { GameMode, CurrentStageInfo, SpawnPoint, MusicMode } from '../types/game.ts';

export class GameState {
  mode:         GameMode = 'title';
  selectedMenu: number   = 0;

  score:  number = 0;
  coins:  number = 0;
  lives:  number = 5;
  power:  number = 0;  // 0=small, 1=big, 2=fire
  starT:  number = 0;  // star invincibility timer
  invT:   number = 0;  // damage invincibility timer
  freezeT:number = 0;
  shakeT: number = 0;
  shakeI: number = 0;

  worldId:          string = 'w1';
  nodeId:           string = 'w1_1';
  selectedNodeId:   string = 'w1_1';

  time:        number = 300;
  noDamage:    boolean = true;
  checkpoint:  SpawnPoint | null = null;
  currentStage: CurrentStageInfo | null = null;

  totalCoins:   number = 0;
  foundCoins:   number = 0;
  totalSecrets: number = 0;
  foundSecrets: number = 0;

  musicMode: MusicMode = 'none';
  finalShown: boolean = false;

  reset(): void {
    this.score = 0; this.coins = 0; this.lives = 5;
    this.power = 0; this.starT = 0; this.invT = 0;
    this.freezeT = 0; this.shakeT = 0; this.shakeI = 0;
    this.noDamage = true; this.checkpoint = null;
  }
}

import type { GameMode, CurrentStageInfo, SpawnPoint, MusicMode } from '../types/game.ts';
import { COMBO } from '../constants/game.ts';

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

  paused:     boolean = false;
  comboCount: number  = 0;  // chained pickups/stomps
  comboT:     number  = 0;  // time left to keep the combo alive
  stompChain: number  = 0;  // consecutive stomps without landing

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
    this.paused = false; this.comboCount = 0; this.comboT = 0; this.stompChain = 0;
  }

  /** Score multiplier derived from the active combo chain. */
  get comboMult(): number {
    for (const [minChain, mult] of COMBO.tiers) {
      if (this.comboCount >= minChain) return mult;
    }
    return 1;
  }

  /** Register a combo event (coin grab, stomp, …) and return the active multiplier. */
  addCombo(): number {
    this.comboCount++;
    this.comboT = COMBO.windowSec;
    return this.comboMult;
  }
}

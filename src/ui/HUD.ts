import { fmtTime, pad } from '../utils/format.ts';
import type { GameState } from '../core/GameState.ts';
import type { SaveManager } from '../core/SaveManager.ts';
import { WORLD_INDEX, NODE_INDEX } from '../data/worlds.ts';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class HUD {
  private readonly hs  = el('hs');
  private readonly hc  = el('hc');
  private readonly hw  = el('hw');
  private readonly ht  = el('ht');
  private readonly hlv = el('hlv');

  private lastScore = -1;
  private lastCoins = -1;
  private lastLives = -1;

  updateStage(gs: GameState): void {
    const score = gs.score;
    const coins = gs.coins;
    const lives = gs.lives;
    const node  = NODE_INDEX[gs.nodeId];
    const label = node?.name.split(' ')[0] ?? '1-1';

    if (score !== this.lastScore) {
      this.hs.textContent = String(score).padStart(6, '0');
      this.bump(this.hs);
      this.lastScore = score;
    }
    if (coins !== this.lastCoins) {
      this.hc.textContent = pad(coins, 2);
      this.bump(this.hc);
      this.lastCoins = coins;
    }
    if (lives !== this.lastLives) {
      this.hlv.textContent = String(Math.max(0, lives));
      this.bump(this.hlv);
      this.lastLives = lives;
    }
    this.hw.textContent = label;
    this.ht.textContent = fmtTime(gs.time);
    this.colorTime(gs.time);
  }

  updateMap(gs: GameState, save: SaveManager): void {
    const world = WORLD_INDEX[gs.worldId];
    if (!world) return;
    const comp  = save.worldCompletion(world.id);
    const stars = (comp.completed === comp.total ? 1 : 0) +
                  (comp.exitsFound === comp.exitMax ? 1 : 0) +
                  (comp.highRanks  === comp.rankTotal ? 1 : 0);

    const wnEl = document.getElementById('mapWorldName');
    const wmEl = document.getElementById('mapWorldMeta');
    const snEl = document.getElementById('mapStageName');
    const smEl = document.getElementById('mapStageMeta');
    if (!wnEl || !wmEl || !snEl || !smEl) return;

    wnEl.textContent = `World ${world.index + 1} - ${world.name}`;
    wmEl.innerHTML   = `${world.subtitle}<br>Stages cleared: ${comp.completed}/${comp.total} &nbsp;|&nbsp; Exits: ${comp.exitsFound}/${comp.exitMax} &nbsp;|&nbsp; Emblems: ${stars}/3`;

    const node = NODE_INDEX[gs.selectedNodeId];
    if (!node) return;
    const rec    = save.stageRecord(node.id);
    const locked = !save.nodeUnlocked(node.id);
    snEl.textContent = node.name;
    smEl.innerHTML   = [
      `Type: ${node.kind.charAt(0).toUpperCase() + node.kind.slice(1)}`,
      `Status: ${locked ? 'Locked' : rec.completed ? 'Cleared' : 'Ready'}`,
      `Rank: ${rec.rank ?? '-'} &nbsp;|&nbsp; Exits: ${rec.normalExit ? 'Normal' : '-'}${node.secretTo ? (rec.secretExit ? ' + Secret' : ' + Hidden') : ''}`,
      node.secretTo ? 'This stage has a secret exit.' : '',
    ].filter(Boolean).join('<br>');
  }

  private bump(el: HTMLElement): void {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  private colorTime(t: number): void {
    this.ht.style.color = t <= 30 ? '#ff4444' : t <= 60 ? '#ffaa22' : '';
  }
}

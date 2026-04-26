import { WORLD_ORDER } from '../constants/game.ts';
import { WORLD_INDEX, NODE_INDEX } from '../data/worlds.ts';
import type { SaveManager } from '../core/SaveManager.ts';
import type { GameState } from '../core/GameState.ts';
import type { AudioManager } from '../audio/AudioManager.ts';
import type { InputManager } from '../input/InputManager.ts';
import type { SceneBackground } from '../renderer/SceneBackground.ts';

export class WorldMapManager {
  private moveCooldown = 0;

  constructor(
    private readonly save: SaveManager,
    private readonly gs: GameState,
    private readonly audio: AudioManager,
    private readonly input: InputManager,
    private readonly bg: SceneBackground,
    private readonly onEnterNode: () => void,
    private readonly onToast: (msg: string, ms?: number) => void,
  ) {}

  update(dt: number): void {
    this.moveCooldown -= dt;
    if (this.moveCooldown <= 0) {
      let dir: { x: number; y: number } | null = null;
      if (this.input.mapAction('left'))  dir = { x: -1, y: 0 };
      else if (this.input.mapAction('right')) dir = { x: 1, y: 0 };
      else if (this.input.mapAction('up'))    dir = { x: 0, y: -1 };
      else if (this.input.mapAction('down'))  dir = { x: 0, y: 1 };
      if (dir) { this.moveSelection(dir); this.moveCooldown = 0.18; }
    }
    if (this.input.mapAction('world') && this.moveCooldown <= 0) {
      this.cycleWorld(1); this.moveCooldown = 0.22;
    }
    if (this.input.mapAction('select')) { this.enterSelectedNode(); this.input.tap.map['select'] = false; }
  }

  handleKeyPress(code: string): void {
    if (code === 'Tab' || code === 'KeyQ' || code === 'KeyE') {
      this.cycleWorld(code === 'KeyQ' ? -1 : 1);
      if (code === 'Tab') this.input.clearKey('Tab');
    }
    if (code === 'Enter' || code === 'Space') this.enterSelectedNode();
  }

  cycleWorld(step: 1 | -1): void {
    const unlocked = WORLD_ORDER.filter(id => this.save.data.unlockedWorlds.includes(id));
    const idx  = unlocked.indexOf(this.gs.worldId as typeof WORLD_ORDER[number]);
    const next = unlocked[(idx + step + unlocked.length) % unlocked.length];
    if (!next) return;
    this.gs.worldId = next;
    const worldNodes = WORLD_INDEX[next]!.nodes.filter(n => this.save.nodeUnlocked(n.id));
    const saved = worldNodes.find(n => n.id === this.save.data.currentNode && NODE_INDEX[n.id]?.world === next);
    this.gs.selectedNodeId = saved?.id ?? worldNodes[0]?.id ?? WORLD_INDEX[next]!.entry;
    this.bg.build(next, 72);
    this.bg.setMapView();
    this.audio.startMusic(('map' + WORLD_INDEX[next]!.index) as import('../types/game.ts').MusicMode, WORLD_INDEX[next]!.index);
  }

  moveSelection(dir: { x: number; y: number }): void {
    const from = NODE_INDEX[this.gs.selectedNodeId];
    if (!from) return;
    const neighbors = from.neighbors
      .map(id => NODE_INDEX[id])
      .filter((n): n is import('../types/game.ts').WorldNode =>
        !!n && (this.save.nodeUnlocked(n.id) || this.save.stageRecord(n.id).completed));
    if (!neighbors.length) { this.onToast('No unlocked path that way'); return; }

    let best: import('../types/game.ts').WorldNode | null = null;
    let bestScore = -999;
    for (const n of neighbors) {
      const vx = n.x - from.x, vy = n.y - from.y;
      const len = Math.hypot(vx, vy) || 1;
      const score = (vx / len) * dir.x + (vy / len) * dir.y - len * 0.0007;
      if (score > bestScore) { bestScore = score; best = n; }
    }
    if (best && bestScore > -0.1) { this.gs.selectedNodeId = best.id; this.onToast(best.name, 700); }
    else this.onToast('Path blocked', 700);
  }

  handleCanvasClick(e: PointerEvent, canvas: HTMLCanvasElement): void {
    if (this.gs.mode !== 'map') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const world  = WORLD_INDEX[this.gs.worldId]!;
    const pad = 34, baseW = 640, baseH = 380;
    const scale = Math.min((innerWidth - pad * 2) / baseW, (innerHeight - pad * 2) / baseH);
    const offX  = (innerWidth  - baseW * scale) / 2;
    const offY  = (innerHeight - baseH * scale) / 2 + 20;
    let hit: import('../types/game.ts').WorldNode | null = null;
    let dist = 1e9;
    for (const node of world.nodes) {
      if (!this.save.nodeVisible(node.id) && node.id !== world.entry) continue;
      const px = offX + node.x * scale, py = offY + node.y * scale;
      const d = Math.hypot(mx - px, my - py);
      if (d < 26 && d < dist) { dist = d; hit = NODE_INDEX[node.id] ?? null; }
    }
    if (hit) {
      if (this.gs.selectedNodeId === hit.id) this.enterSelectedNode();
      else this.gs.selectedNodeId = hit.id;
    }
  }

  enterSelectedNode(): void {
    if (!this.save.nodeUnlocked(this.gs.selectedNodeId)) { this.onToast('Stage locked'); return; }
    this.onEnterNode();
  }
}

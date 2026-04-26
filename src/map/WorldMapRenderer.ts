import { hashString } from '../utils/rng.ts';
import { NODE_COLORS } from '../constants/game.ts';
import type { ThreeSetup } from '../renderer/ThreeSetup.ts';
import type { SaveManager } from '../core/SaveManager.ts';
import type { GameState } from '../core/GameState.ts';
import { WORLD_INDEX, NODE_INDEX } from '../data/worlds.ts';
import type { WorldNode, NodeKind } from '../types/game.ts';

export class WorldMapRenderer {
  private pulse = 0;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    three: ThreeSetup,
    private readonly save: SaveManager,
    private readonly gs: GameState,
  ) {
    this.ctx = three.mapCtx;
  }

  draw(): void {
    this.pulse += 0.016;
    const world  = WORLD_INDEX[this.gs.worldId]!;
    const ctx    = this.ctx;
    const W = innerWidth, H = innerHeight;
    ctx.clearRect(0, 0, W, H);

    const pad = 34, baseW = 640, baseH = 380;
    const scale = Math.min((W - pad * 2) / baseW, (H - pad * 2) / baseH);
    const offX  = (W - baseW * scale) / 2;
    const offY  = (H - baseH * scale) / 2 + 20;
    const p     = world.palette;

    // Sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, p.top); bg.addColorStop(0.5, p.mid); bg.addColorStop(1, p.bot);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Subtle vignette
    const vign = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.85);
    vign.addColorStop(0, 'transparent');
    vign.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);

    this.drawDecor(world.id, offX, offY, scale, W, H);

    // Paths
    ctx.save();
    for (const path of world.paths) {
      const a = NODE_INDEX[path.a]; const b = NODE_INDEX[path.b];
      if (!a || !b) continue;
      const aVis = this.save.nodeVisible(a.id) || a.id === world.entry;
      const bVis = this.save.nodeVisible(b.id) || b.id === world.entry;
      if (!aVis || !bVis) continue;
      const pa = this.nodePos(a, offX, offY, scale);
      const pb = this.nodePos(b, offX, offY, scale);
      const unlocked = this.save.nodeUnlocked(a.id) && this.save.nodeUnlocked(b.id);
      const isSecret = path.mode === 'secret';

      if (unlocked) {
        // Glowing path
        ctx.lineWidth   = isSecret ? 3.5 : 7;
        ctx.setLineDash(isSecret ? [14, 11] : []);
        ctx.shadowBlur  = isSecret ? 10 : 16;
        ctx.shadowColor = isSecret ? 'rgba(220, 170, 255, 0.7)' : 'rgba(255, 240, 160, 0.7)';
        ctx.strokeStyle = isSecret ? 'rgba(220, 185, 255, 0.9)' : 'rgba(255, 245, 185, 0.92)';
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        // Inner bright line
        ctx.lineWidth   = isSecret ? 1.5 : 3;
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = isSecret ? 'rgba(240, 210, 255, 0.7)' : 'rgba(255, 255, 220, 0.65)';
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      } else {
        ctx.lineWidth   = isSecret ? 2.5 : 5;
        ctx.setLineDash(isSecret ? [10, 9] : []);
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = 'rgba(180, 190, 220, 0.2)';
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Nodes
    for (const node of world.nodes) {
      if (!this.save.nodeVisible(node.id) && node.id !== world.entry) continue;
      const rec      = this.save.stageRecord(node.id);
      const unlocked = this.save.nodeUnlocked(node.id);
      const pos      = this.nodePos(node as WorldNode, offX, offY, scale);
      const color    = NODE_COLORS[node.kind as NodeKind] ?? '#fff';
      const pulse    = 1 + Math.sin(this.pulse * 2 + (hashString(node.id) % 20)) * 0.045;

      ctx.save();
      ctx.translate(pos.x, pos.y); ctx.scale(pulse, pulse);

      if (unlocked) {
        // Outer glow ring
        ctx.shadowBlur  = 28;
        ctx.shadowColor = color;
        ctx.fillStyle   = color + '28';
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Node shadow/depth
      ctx.shadowBlur  = 12;
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowOffsetY = 3;

      ctx.fillStyle   = unlocked ? color : 'rgba(90, 95, 120, 0.55)';
      ctx.strokeStyle = unlocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 2.5;
      this.drawNodeShape(node.kind as NodeKind);
      ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.stroke();

      // Rank badge
      if (rec.completed) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = `bold 11px 'Outfit', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rec.rank ?? 'C', 0, 1);
      }

      // Selected ring
      if (node.id === this.gs.selectedNodeId) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 3.5;
        ctx.shadowBlur  = 16;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (node.id === this.gs.nodeId) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();

      // Node label
      const lw = 118;
      const lh = 20;
      const lx = pos.x - lw / 2;
      const ly = pos.y + 22;
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, lx, ly, lw, lh, 6);
      ctx.fillStyle = 'rgba(0, 0, 18, 0.58)';
      ctx.fill();
      ctx.fillStyle = unlocked ? 'rgba(235, 240, 255, 0.95)' : 'rgba(160, 170, 200, 0.65)';
      ctx.font = `500 10px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name.replace(/^\d-\d\s*/, '').slice(0, 20), pos.x, ly + lh / 2);
      ctx.restore();

      if (rec.secretExit) {
        ctx.fillStyle = 'rgba(220, 180, 255, 0.9)';
        ctx.font = `500 9px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Secret', pos.x, ly + lh + 12);
      }
    }

    // Player position marker (animated teardrop arrow)
    const curNode = NODE_INDEX[this.gs.nodeId];
    if (curNode && curNode.world === this.gs.worldId && (this.save.nodeVisible(curNode.id) || curNode.id === world.entry)) {
      const pos = this.nodePos(curNode, offX, offY, scale);
      const bob = Math.sin(this.pulse * 3.2) * 3.5;
      ctx.save();
      ctx.translate(pos.x, pos.y - 36 + bob);
      // Glow
      ctx.shadowBlur  = 18;
      ctx.shadowColor = 'rgba(255, 245, 160, 0.85)';
      // Arrow shape
      ctx.fillStyle = 'rgba(255, 242, 145, 0.98)';
      ctx.strokeStyle = 'rgba(200, 165, 30, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(10, 4); ctx.lineTo(0, 0); ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private nodePos(node: { x: number; y: number }, offX: number, offY: number, scale: number) {
    return { x: offX + node.x * scale, y: offY + node.y * scale };
  }

  private drawNodeShape(kind: NodeKind): void {
    const ctx = this.ctx;
    switch (kind) {
      case 'bonus':
        // 5-pointed star
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5;
          const r = i % 2 === 0 ? 17 : 7;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); break;
      case 'secret':
        // Diamond
        ctx.beginPath();
        ctx.moveTo(0, -17); ctx.lineTo(15, 0); ctx.lineTo(0, 17); ctx.lineTo(-15, 0);
        ctx.closePath(); break;
      case 'challenge':
        // Square with chamfered corners
        ctx.beginPath();
        ctx.moveTo(-14, -10); ctx.lineTo(14, -10); ctx.lineTo(14, 10); ctx.lineTo(-14, 10);
        ctx.closePath(); break;
      case 'vertical':
        // Upward triangle
        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(16, 12); ctx.lineTo(-16, 12);
        ctx.closePath(); break;
      case 'fortress':
        // Wide rectangle (castle gate look)
        ctx.beginPath();
        ctx.moveTo(-20, -13); ctx.lineTo(20, -13); ctx.lineTo(20, 13); ctx.lineTo(-20, 13);
        ctx.closePath(); break;
      default:
        // Circle
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2);
    }
  }

  private drawDecor(worldId: string, offX: number, offY: number, scale: number, W: number, H: number): void {
    const ctx = this.ctx;
    const p = WORLD_INDEX[worldId]!.palette;
    const deco = p.deco;
    const t = this.pulse;

    if (deco === 'meadow') {
      // Fluffy clouds with soft glow
      for (let i = 0; i < 8; i++) {
        const cx = offX + (40 + i * 70 + Math.sin(t * 0.7 + i) * 12) * scale;
        const cy = offY + (55 + (i % 3) * 22) * scale;
        const cs = (14 + (i % 3) * 4) * scale;
        ctx.save();
        ctx.shadowBlur  = 18;
        ctx.shadowColor = 'rgba(255,255,255,0.25)';
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.arc(cx, cy, cs, 0, Math.PI * 2);
        ctx.arc(cx + cs * 1.1, cy + cs * 0.15, cs * 0.9, 0, Math.PI * 2);
        ctx.arc(cx - cs * 1.0, cy + cs * 0.2, cs * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Ground strip
      const gg = ctx.createLinearGradient(0, H - 100, 0, H);
      gg.addColorStop(0, 'rgba(50, 140, 60, 0.88)');
      gg.addColorStop(1, 'rgba(30, 100, 40, 0.95)');
      ctx.fillStyle = gg; ctx.fillRect(0, H - 100, W, 110);
    } else if (deco === 'factory') {
      const fg = ctx.createLinearGradient(0, H - 130, 0, H);
      fg.addColorStop(0, 'rgba(35, 25, 14, 0.7)');
      fg.addColorStop(1, 'rgba(20, 14, 8, 0.95)');
      ctx.fillStyle = fg; ctx.fillRect(0, H - 130, W, 150);
      for (let i = 0; i < 11; i++) {
        const cx = offX + (45 + i * 54) * scale;
        const ch = (40 + ((i * 11) % 40)) * scale;
        ctx.fillStyle = 'rgba(80, 58, 38, 0.92)'; ctx.fillRect(cx, H - 130 - ch, 22 * scale, ch);
        // Smoke puff
        ctx.save();
        ctx.shadowBlur  = 14;
        ctx.shadowColor = 'rgba(160,140,100,0.2)';
        ctx.fillStyle = `rgba(140,125,100,${0.12 + Math.sin(t * 1.2 + i * 0.7) * 0.06})`;
        const sx = cx + 11 * scale;
        const sy = H - 130 - ch - 22 * scale;
        ctx.beginPath(); ctx.arc(sx, sy, 9 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (deco === 'sky') {
      for (let i = 0; i < 10; i++) {
        const cx = offX + (60 + i * 58 + Math.sin(t * 1.0 + i) * 18) * scale;
        const cy = offY + (38 + (i % 4) * 52) * scale;
        const cs = (13 + (i % 3) * 4) * scale;
        ctx.save();
        ctx.shadowBlur  = 20;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, cs, 0, Math.PI * 2);
        ctx.arc(cx + cs * 1.2, cy + cs * 0.25, cs * 1.0, 0, Math.PI * 2);
        ctx.arc(cx - cs * 1.0, cy + cs * 0.3, cs * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (deco === 'crystal') {
      for (let i = 0; i < 22; i++) {
        const cx = offX + (20 + (i * 29) % 620) * scale;
        const cy = offY + (100 + (i * 47) % 240) * scale;
        const cr = (10 + (i % 5) * 3) * scale;
        ctx.save();
        ctx.shadowBlur  = 16;
        ctx.shadowColor = `rgba(${110 + i * 3}, ${160 + i * 2}, 255, 0.7)`;
        ctx.fillStyle   = `rgba(${100 + i * 4}, ${170 + i * 2}, 255, 0.3)`;
        ctx.strokeStyle = `rgba(${140 + i * 3}, ${200 + i * 2}, 255, 0.7)`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - cr * 1.6);
        ctx.lineTo(cx + cr, cy);
        ctx.lineTo(cx, cy + cr * 2);
        ctx.lineTo(cx - cr, cy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      const cg = ctx.createLinearGradient(0, H - 110, 0, H);
      cg.addColorStop(0, 'rgba(42, 18, 78, 0.72)');
      cg.addColorStop(1, 'rgba(22, 8, 48, 0.95)');
      ctx.fillStyle = cg; ctx.fillRect(0, H - 110, W, 120);
    } else if (deco === 'fortress') {
      const dg = ctx.createLinearGradient(0, H - 140, 0, H);
      dg.addColorStop(0, 'rgba(16, 12, 28, 0.85)');
      dg.addColorStop(1, 'rgba(6, 4, 14, 0.98)');
      ctx.fillStyle = dg; ctx.fillRect(0, H - 140, W, 160);
      for (let i = 0; i < 14; i++) {
        const cx = offX + (24 + i * 44) * scale;
        const ch = (30 + (i % 4) * 16) * scale;
        ctx.fillStyle = `rgba(55, 50, 70, 0.94)`;
        ctx.fillRect(cx, H - 140 - ch, 26 * scale, ch + 4);
        // Battlements
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = `rgba(65, 58, 82, 0.94)`;
          ctx.fillRect(cx + b * 9 * scale, H - 140 - ch - 8 * scale, 6 * scale, 8 * scale);
        }
      }
      // Lava glow at bottom
      const lg = ctx.createLinearGradient(0, H - 30, 0, H);
      lg.addColorStop(0, 'transparent');
      lg.addColorStop(0.4, 'rgba(255, 80, 20, 0.22)');
      lg.addColorStop(1, 'rgba(255, 40, 0, 0.45)');
      ctx.fillStyle = lg; ctx.fillRect(0, H - 30, W, 30);
    }
  }
}

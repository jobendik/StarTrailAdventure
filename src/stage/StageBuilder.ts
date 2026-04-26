import { clamp } from '../utils/math.ts';
import { seeded } from '../utils/rng.ts';
import type { WorldNode } from '../types/game.ts';
import type { StageState } from './StageState.ts';
import type { StageObjects } from './StageObjects.ts';
import type { GameState } from '../core/GameState.ts';
import { WORLD_INDEX } from '../data/worlds.ts';

export class StageBuilder {
  build(node: WorldNode, ss: StageState, so: StageObjects, gs: GameState): void {
    const world  = WORLD_INDEX[node.world];
    const rnd    = seeded(node.id);
    const type   = node.kind;

    let mushroomBlocks = 0;
    let fireBlocks = 0;

    const length = Math.round(
      (type === 'bonus' ? 54 : type === 'fortress' ? 108 : type === 'vertical' ? 86 : type === 'challenge' ? 96 : 88)
      + (node.diff || 1) * 4,
    );

    gs.currentStage = { nodeId: node.id, length, worldId: node.world, vertical: type === 'vertical', time: type === 'bonus' ? 170 : type === 'fortress' ? 340 : 300, node };
    gs.totalCoins   = 0; gs.foundCoins = 0;
    gs.totalSecrets = node.secretTo ? 1 : 0; gs.foundSecrets = 0;
    gs.time         = gs.currentStage.time;

    // Ground layout
    const ground: [number, number, number][] = [];
    let cursor = 0, y = 0;
    ground.push([0, 12, 0]); cursor = 13;

    const maxRise    = type === 'vertical' ? 2 : 1;
    const gapChance  = type === 'bonus' ? 0.06 : type === 'challenge' ? 0.18 : type === 'fortress' ? 0.22 : 0.12;
    const riseChance = type === 'vertical' ? 0.82 : 0.22;

    while (cursor < length - 18) {
      const gap = rnd() < gapChance ? 1 + Math.floor(rnd() * 2) : 0;
      cursor += gap;
      if (cursor >= length - 18) break;
      if (rnd() < riseChance) y += Math.floor(rnd() * (maxRise + 1));
      else if (rnd() < 0.2)  y -= 1;
      y = clamp(y, 0, type === 'vertical' ? 10 : 4);
      const segLen = Math.floor(6 + rnd() * (type === 'bonus' ? 5 : 8));
      ground.push([cursor, cursor + segLen, y]);
      cursor += segLen + 1;
    }
    const endY = type === 'vertical' ? Math.max(5, ground[ground.length - 1]![2] + 2) : ground[ground.length - 1]![2];
    ground.push([length - 14, length - 4, endY]);

    for (const [a, b, gy] of ground) so.addGroundSegment(a, b, gy);

    // Pit hazards
    if (type === 'fortress' || node.world === 'w5') {
      for (let i = 0; i < ground.length - 1; i++) {
        const gapStart = ground[i]![1] + 1;
        const gapEnd   = ground[i + 1]![0] - 1;
        if (gapEnd >= gapStart) so.addHazard(gapStart, -0.02, gapEnd - gapStart + 1, 0.32);
      }
    }

    // Per-segment features
    for (let i = 0; i < ground.length; i++) {
      const [a, b, gy] = ground[i]!;
      const segW   = b - a + 1;
      const prev   = ground[i - 1];
      const next   = ground[i + 1];
      const leftGap  = !!prev && a - prev[1] > 1;
      const rightGap = !!next && next[0] - b > 1;
      const safeA = a + (leftGap  || rightGap ? 3 : 2);
      const safeB = b - (leftGap  || rightGap ? 3 : 2);

      // Coins
      if (segW >= 4 && rnd() < 0.75) {
        const coinStart = leftGap ? a + 2.2 : a + 1.2;
        const cCount = clamp(Math.floor((segW - (leftGap ? 1 : 0) - (rightGap ? 1 : 0)) / 2), 2, 5);
        so.addCoinArc(coinStart, gy + 2.2, cCount, 1, 0.7 + rnd() * 1.2);
      }

      // Enemies
      if (segW >= 5 && rnd() < 0.55) {
        const eMin = Math.max(a + 1, leftGap  ? a + 2 : a + 1);
        const eMax = Math.min(b - 1, rightGap ? b - 2 : b - 1);
        if (eMax >= eMin) {
          const ex = eMin + Math.floor(rnd() * (eMax - eMin + 1));
          so.addEnemy(ex, gy, 'goomba');
          if (node.diff > 2 && rnd() < 0.4 && ex + 2 <= eMax)
            so.addEnemy(ex + 2, gy, rnd() < 0.5 ? 'goomba' : 'koopa');
        }
      }

      // Overhead blocks
      if (segW >= 7 && safeB - safeA >= 1 && rnd() < 0.46) {
        const bx = safeA + Math.floor(rnd() * (safeB - safeA + 1));
        const content = rnd() < 0.18 ? 'mush' : rnd() < 0.26 ? 'fire' : rnd() < 0.34 ? 'star' : 'coin';
        if (content === 'mush') mushroomBlocks++;
        if (content === 'fire') fireBlocks++;
        so.addQuestion(bx, gy + 4, content);
        if (rnd() < 0.5 && bx + 1 <= b - 1) so.addSolidBlock(bx + 1, gy + 4, undefined, 'brick');
        if (rnd() < 0.5 && bx - 1 >= a + 1) so.addSolidBlock(bx - 1, gy + 4, undefined, 'brick');
        if (rnd() < 0.22 && !(leftGap || rightGap)) so.addQuestion(bx, gy + 7, rnd() < 0.5 ? '1up' : 'star', true);
      }

      // World-specific features
      const wId = node.world;
      if (wId === 'w1' && rnd() < 0.18 && segW >= 7 && safeB >= safeA) {
        const px = safeA + Math.floor(rnd() * (safeB - safeA + 1));
        so.addPipe(px, gy, 1 + Math.floor(rnd() * 2));
      }
      if (wId === 'w2' && rnd() < 0.24 && segW >= 6)
        so.addMovingPlatform(a + Math.floor(segW / 2), gy + 3, 3, 0, 1.5, 0.9 + rnd() * 0.4);
      if (wId === 'w3' && rnd() < 0.26) {
        so.addMovingPlatform(a + Math.max(2, Math.floor(segW / 2)), gy + 3.4, 3 + rnd() * 2, 1.8, 0, 0.95 + rnd() * 0.5);
        if (rnd() < 0.45) so.addBouncePad(a + 1, gy + 1);
      }
      if (wId === 'w4' && rnd() < 0.24) {
        so.addCrumble(a + Math.floor(segW / 2), gy + 2, 1 + (rnd() < 0.5 ? 1 : 0));
        if (rnd() < 0.3) so.addMovingPlatform(a + Math.floor(segW / 2), gy + 4, 3, 0, 1.6, 1);
      }
      if ((wId === 'w5' || type === 'challenge') && rnd() < 0.22 && segW >= 5)
        so.addBouncePad(a + 2, gy + 1);
    }

    // Garanter minst én sopp i vanlige baner
    if (mushroomBlocks === 0 && node.kind !== 'bonus') {
      const firstSafeSegment = ground.find(([a, b]) => b - a >= 7) ?? ground[0];
      if (firstSafeSegment) {
        const [a, , gy] = firstSafeSegment;
        so.addQuestion(a + 6, gy + 4, 'mush');
        mushroomBlocks++;
      }
    }

    // Garanter minst én fire flower i vanskelige baner
    if (fireBlocks === 0 && node.diff >= 2 && node.kind !== 'bonus') {
      const firstSafeSegment = ground.find(([a, b]) => b - a >= 7) ?? ground[0];
      if (firstSafeSegment) {
        const [a, , gy] = firstSafeSegment;
        so.addQuestion(a + 8, gy + 4, 'fire');
        fireBlocks++;
      }
    }

    // Type-specific specials
    if (type === 'bonus') {
      for (let bx = 8; bx < length - 8; bx += 4) {
        so.addCoinArc(bx, 2 + (bx % 8 === 0 ? 1.2 : 0.5), 4, 1, 1.4);
        if (bx % 12 === 0) so.addQuestion(bx + 1, 5, 'coin');
      }
      if (node.world !== 'w5') so.addQuestion(Math.floor(length * 0.5), 7, '1up', true);
    }

    if (type === 'vertical') {
      let vx = Math.floor(length * 0.32), vy = 3;
      for (let i = 0; i < 7; i++) {
        const w = 3 + (i % 2);

    // Logg ut statistikk for banen
    console.table({
      stage: node.id,
      coins: ss.coins.length,
      enemies: ss.enemies.length,
      powerups: ss.powerups.length,
      questionBlocks: ss.solids.filter(s => s.type === 'question').length,
      hiddenBlocks: ss.solids.filter(s => s.type === 'hidden').length,
      mushroomBlocks,
      fireBlocks,
      starBlocks: ss.solids.filter(s => s.content === 'star').length,
      oneUps: ss.solids.filter(s => s.content === '1up').length,
    });
        for (let k = 0; k < w; k++) so.addSolidBlock(vx + k, vy, undefined, 'brick');
        if (i % 2 === 0) so.addCoinArc(vx, vy + 2, 3, 1, 1);
        if (i === 2 || i === 5) so.addMovingPlatform(vx + w + 2, vy + 1.5, 3, 1.6, 0, 0.9 + i * 0.05);
        vx += 5 - (i % 2 ? 3 : 0);
        vy += 1 + (i % 3 === 0 ? 2 : 1);
      }
      so.addCheckpoint(Math.floor(length * 0.48), Math.max(2, vy - 3));
    }

    if (type === 'challenge') {
      for (let cx = 14; cx < length - 20; cx += 15) {
        so.addCrumble(cx, 3 + ((cx / 5) % 2 | 0), 2);
        so.addCoinArc(cx - 1, 6, 4, 1, 1);
      }
    }

    if (type === 'fortress') {
      for (let fx = 18; fx < length - 16; fx += 18) {
        so.addMovingPlatform(fx, 4 + (fx % 3), 3.4, 2, 0, 1.15);
        so.addHazard(fx + 5, -0.02, 4, 0.32);
        so.addCrumble(fx + 11, 5, 2);
        const gy = ground.find(g => fx >= g[0] && fx <= g[1])?.[2] ?? 0;
        so.addEnemy(fx + 2, gy, 'koopa');
      }
      for (let fx = 10; fx < length - 12; fx += 12) {
        const gy = ground[Math.min(ground.length - 1, Math.floor(fx / 12))]?.[2] ?? 0;
        so.addEnemy(fx, gy, rnd() < 0.5 ? 'goomba' : 'koopa');
      }
    }

    // World 4 crystal decor
    if (node.world === 'w4' && type !== 'bonus') {
      for (let ci = 0; ci < 8; ci++) {
        const cx = 12 + ci * 10;
        so.addCrystalDecor(cx, 2.2 + (ci % 4), -1.1, 1 + (ci % 3) * 0.2);
      }
    }

    // Mid-stage checkpoint
    so.addCheckpoint(Math.floor(length * 0.52), Math.max(ground[Math.floor(ground.length * 0.55)]?.[2] ?? 0, 0));

    // Secret exit
    if (node.secretTo) {
      const sx = Math.floor(length * 0.64);
      const sy = (type === 'vertical' ? 8 : 5) + (world.index % 2);
      for (let si = 0; si < 4; si++) so.addSolidBlock(sx + si, sy + si % 2, undefined, 'brick');
      so.addMovingPlatform(sx - 4, sy - 1, 3, 0, 1.4, 1.05);
      so.addCoinArc(sx - 1, sy + 2, 5, 1, 0.7);
      so.addSecretDoor(sx + 6, sy + 0.5, node.world === 'w3' ? 'pipe' : 'door');
    }

    // Normal exit
    so.addFlagGoal(length - 6, endY, type === 'fortress');

    // Total coin count
    gs.totalCoins = ss.coins.length;
  }
}

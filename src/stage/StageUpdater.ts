import * as THREE from 'three';
import { GRAV } from '../constants/physics.ts';
import { aabb } from '../utils/math.ts';
import type { StageState } from './StageState.ts';
import type { StageObjects } from './StageObjects.ts';
import type { Player } from '../entities/Player.ts';
import type { GameState } from '../core/GameState.ts';
import type { AudioManager } from '../audio/AudioManager.ts';

export class StageUpdater {
  updateAll(
    dt: number, ss: StageState, so: StageObjects,
    player: Player, gs: GameState, audio: AudioManager,
    onPlayerHit: () => void,
  ): void {
    this.updateMovingPlatforms(dt, ss);
    this.updateCoins(dt, ss, so, player, gs, audio);
    this.updatePowerups(dt, ss, so, player, gs, audio);
    this.updateEnemies(dt, ss, so, player, gs, audio, onPlayerHit);
    this.updateFireballs(dt, ss, so);
    this.updateBouncePads(dt, ss);
    this.updateCrumbles(dt, ss, audio);
    this.updateSolidBumps(dt, ss);
    this.updateParticles(dt, ss);
  }

  private updateCoins(dt: number, ss: StageState, so: StageObjects, player: Player, gs: GameState, audio: AudioManager): void {
    const b = player.getBox();
    for (const c of ss.coins) {
      if (c.collected) continue;
      c.mesh.position.y = c.y + Math.sin(performance.now() * 0.003 + c.phase) * 0.17;
      (c.mesh as THREE.Mesh).rotation.y += dt * 4;
      if (aabb(b.x, b.y, b.w, b.h, c.x - 0.3, (c.mesh.position.y) - 0.3, 0.6, 0.6)) {
        c.collected = true;
        c.mesh.removeFromParent();
        so.collectCoinFx(c.x, c.y, gs, audio);
        so.addParticle(c.x, c.y, 0xffdd55, 6, 4);
      }
    }
  }

  private updatePowerups(dt: number, ss: StageState, so: StageObjects, player: Player, gs: GameState, audio: AudioManager): void {
    const b = player.getBox();
    for (let i = ss.powerups.length - 1; i >= 0; i--) {
      const p = ss.powerups[i]!;
      if (p.pending) {
        so.spawnPowerup(p.spawnX!, p.spawnY!, p.type);
        ss.powerups.splice(i, 1);
        continue;
      }
      if (!p.active || !p.mesh) continue;

      if ((p.rise ?? 0) > 0) {
        p.rise! -= dt; p.y += 1.6 * dt;
      } else {
        p.vy = (p.vy ?? 0) + GRAV * dt;
        p.x += (p.vx ?? 0) * dt;
        p.y += p.vy * dt;
        for (const s of ss.solids) {
          if (s.type === 'hidden' || s.falling) continue;
          if (aabb(p.x - 0.3, p.y, 0.6, 0.6, s.x, s.y, s.w, s.h) && p.vy < 0) {
            p.y = s.y + s.h; p.vy = p.type === 'star' ? 8 : 0;
          }
          if (aabb(p.x - 0.3, p.y + 0.1, 0.6, 0.4, s.x, s.y, s.w, s.h)) {
            if (p.type !== 'star' || s.type !== 'moving') p.vx = -(p.vx ?? 2.1);
          }
        }
        if (p.type === 'star') p.mesh.rotation.y += dt * 5;
      }
      p.mesh.position.set(p.x, p.y, 0);

      if (aabb(b.x, b.y, b.w, b.h, p.x - 0.3, p.y, 0.6, 0.6)) {
        p.active = false; p.mesh.removeFromParent(); ss.powerups.splice(i, 1);
        audio.play('pow');
        so.addParticle(p.x, p.y, 0xffd860, 8, 4);
        gs.freezeT = Math.max(gs.freezeT, 0.045);
        gs.shakeT = Math.max(gs.shakeT, 0.11);
        gs.shakeI = Math.max(gs.shakeI, 0.75);
        if (p.type === 'mush')  { gs.power = Math.max(gs.power, 1); gs.score += 1000; so.addFloatingText(p.x, p.y, '1000', '#ffffff'); }
        else if (p.type === '1up') { gs.lives++; so.addFloatingText(p.x, p.y, '1UP', '#71ff7c'); }
        else if (p.type === 'fire') { gs.power = 2; gs.score += 1000; so.addFloatingText(p.x, p.y, '1000', '#ffffff'); }
        else if (p.type === 'star') { gs.starT = 10; gs.score += 1000; so.addFloatingText(p.x, p.y, '1000', '#ffff55'); }
      }
    }
  }

  private updateEnemies(
    dt: number, ss: StageState, so: StageObjects, player: Player,
    gs: GameState, audio: AudioManager, onPlayerHit: () => void,
  ): void {
    const b = player.getBox();
    for (const e of ss.enemies) {
      if (!e.alive && !e.isShell) {
        if (e.squash > 0) {
          e.squash -= dt; e.mesh.scale.y = Math.max(0.1, e.squash * 2.6);
          if (e.squash <= 0) e.mesh.removeFromParent();
        }
        continue;
      }

      if (e.isShell) {
        e.x += e.shellV * dt;
        e.mesh.rotation.z += e.shellV * dt * 3;
        if (Math.abs(e.shellV) > 0.1) {
          for (const other of ss.enemies) {
            if (other === e || (!other.alive && !other.isShell)) continue;
            if (Math.abs(e.x - other.x) < 0.75 && Math.abs(e.y - other.y) < 0.7) {
              other.alive = false; other.squash = 0.02;
              gs.score += 200; so.addParticle(other.x, other.y, 0xff8844, 5, 4);
            }
          }
          for (const s of ss.solids) {
            if (s.type === 'hidden' || s.falling) continue;
            if (aabb(e.x - 0.35, e.y, 0.7, 0.5, s.x, s.y, s.w, s.h)) { e.shellV *= -1; break; }
          }
        }
        if (aabb(b.x, b.y, b.w, b.h, e.x - 0.42, e.y, 0.84, 0.56)) {
          if (Math.abs(e.shellV) < 0.1) { e.shellV = player.face * 12; audio.play('bump'); }
          else if (player.vy < -1 && player.y > e.y + 0.18) { e.shellV = 0; player.vy = 11.8; audio.play('stomp'); so.addParticle(e.x, e.y + 0.3, 0xb8ff78, 7, 4); }
          else if (gs.starT > 0) { e.alive = false; e.isShell = false; gs.score += 200; }
          else { onPlayerHit(); }
        }
        e.mesh.position.set(e.x, e.y, 0);
        continue;
      }

      // Normal enemy
      e.vy += GRAV * dt;
      let ny = e.y + e.vy * dt; let onSurface = false;
      for (const s of ss.solids) {
        if (s.type === 'hidden' || s.falling) continue;
        if (aabb(e.x - 0.32, ny, 0.64, 0.05, s.x, s.y, s.w, s.h)) {
          e.y = s.y + s.h; e.vy = 0; onSurface = true; break;
        }
      }
      if (!onSurface) e.y = ny;
      e.x += e.vx * dt;
      for (const s of ss.solids) {
        if (s.type === 'hidden' || s.falling) continue;
        if (aabb(e.x - 0.32, e.y + 0.05, 0.64, 0.55, s.x, s.y, s.w, s.h)) {
          e.vx *= -1; e.x += e.vx * dt * 2; break;
        }
      }
      if (onSurface) {
        let support = false;
        for (const s of ss.solids) {
          if (s.type === 'hidden' || s.falling) continue;
          if (aabb(e.x + Math.sign(e.vx) * 0.35, e.y - 0.5, 0.2, 0.45, s.x, s.y, s.w, s.h)) { support = true; break; }
        }
        if (!support) e.vx *= -1;
      }
      e.mesh.position.set(e.x, e.y, 0); e.mesh.scale.x = e.vx > 0 ? -1 : 1;

      if (aabb(b.x, b.y, b.w, b.h, e.x - 0.42, e.y, 0.84, 0.82)) {
        if (gs.starT > 0) { e.alive = false; e.squash = 0.02; gs.score += 200; so.addParticle(e.x, e.y, 0xffda55, 6, 4); audio.play('stomp'); }
        else if (player.vy < -1 && player.y > e.y + 0.25) this.stompEnemy(e, player, ss, so, gs, audio);
        else { onPlayerHit(); }
      }
    }
  }

  private stompEnemy(
    e: import('../types/game.ts').EnemyObject, player: Player, _ss: StageState,
    so: StageObjects, gs: GameState, audio: AudioManager,
  ): void {
    e.squash = 0.35; player.vy = 11.8;
    gs.shakeT = 0.16; gs.shakeI = 2;
    audio.play('stomp');
    player.sqy = 0.72; player.sqx = 1.28;
    gs.score += e.type === 'koopa' ? 200 : 100;
    so.addParticle(e.x, e.y + 0.3, e.type === 'koopa' ? 0x44aa55 : 0x8b4c25, 5, 3);
    if (e.type === 'koopa') {
      e.isShell = true; e.alive = true; e.squash = 0; e.shellV = 0;
      e.mesh.scale.y = 0.56;
      e.mesh.children.forEach(c => { if (c.position.y > 0.8) c.visible = false; });
    } else {
      e.alive = false;
    }
  }

  private updateFireballs(dt: number, ss: StageState, so: StageObjects): void {
    for (let i = ss.fireballs.length - 1; i >= 0; i--) {
      const f = ss.fireballs[i]!;
      f.life -= dt; f.vy += GRAV * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (Math.random() < 0.55) so.addParticle(f.x, f.y, 0xff8a22, 1, 1.4);
      let destroyed = false;
      for (const s of ss.solids) {
        if (s.type === 'hidden' || s.falling) continue;
        if (aabb(f.x - 0.1, f.y - 0.1, 0.2, 0.2, s.x, s.y, s.w, s.h)) {
          if (f.vy < 0) { f.y = s.y + s.h + 0.12; f.vy = 6; }
          else {
            so.addParticle(f.x, f.y, 0xff7330, 8, 4);
            destroyed = true;
          }
        }
        if (destroyed) break;
      }
      if (!destroyed) {
        for (const e of ss.enemies) {
          if (!e.alive && !e.isShell) continue;
          if (Math.abs(f.x - e.x) < 0.5 && Math.abs(f.y - e.y) < 0.55) {
            e.alive = false; e.isShell = false; e.squash = 0.02;
            so.addParticle(e.x, e.y + 0.35, 0xffc35a, 10, 4.8);
            destroyed = true;
            break;
          }
        }
      }
      if (destroyed) {
        f.mesh.removeFromParent();
        ss.fireballs.splice(i, 1);
        continue;
      }
      f.mesh.position.set(f.x, f.y, 0);
      f.mesh.rotation.x += dt * 14; f.mesh.rotation.z += dt * 14;
      if (f.life <= 0 || f.y < -3) { f.mesh.removeFromParent(); ss.fireballs.splice(i, 1); }
    }
  }

  private updateBouncePads(dt: number, ss: StageState): void {
    for (const b of ss.bouncePads) {
      if (b.bounce > 0) { b.bounce -= dt; b.mesh.scale.y = Math.max(0.56, 1 - b.bounce * 2.6); }
      else b.mesh.scale.y += (1 - b.mesh.scale.y) * 8 * dt;
    }
  }

  private updateCrumbles(dt: number, ss: StageState, audio: AudioManager): void {
    for (const c of ss.solids) {
      if (c.type !== 'crumble') continue;
      if (c.falling) {
        c.respawn! -= dt;
        if ((c.respawn ?? 0) <= 0) {
          c.falling = false; c.timer = -1;
          if (c.mesh) {
            c.mesh.visible = true;
            c.mesh.position.set(c.homeX!, c.homeY!, 0);
          }
          c.x = (c.homeX ?? 0) - 0.5; c.y = (c.homeY ?? 0) - 0.5;
        }
        continue;
      }
      if ((c.timer ?? -1) > 0) {
        c.timer! -= dt;
        if (c.mesh) c.mesh.position.x = (c.homeX ?? 0) + (Math.random() - 0.5) * 0.08;
        if ((c.timer ?? 0) <= 0) {
          c.falling = true; c.respawn = 4;
          if (c.mesh) c.mesh.visible = false;
          c.x = -999; c.y = -999;
          audio.play('crumble');
        }
      } else if (c.mesh) {
        c.mesh.position.x += ((c.homeX ?? 0) - c.mesh.position.x) * 10 * dt;
      }
    }
  }

  private updateMovingPlatforms(dt: number, ss: StageState): void {
    for (const mp of ss.movingPlatforms) {
      mp.t += dt * mp.speed;
      const nx = mp.ox + Math.sin(mp.t) * mp.rangeX;
      const ny = mp.oy + Math.sin(mp.t) * mp.rangeY;
      mp.dxStep = nx - mp.mesh.position.x;
      mp.dyStep = ny - mp.mesh.position.y;
      mp.mesh.position.set(nx, ny, 0);
      mp.rect.x = nx - mp.w / 2;
      mp.rect.y = ny - 0.18;
    }
  }

  private updateSolidBumps(dt: number, ss: StageState): void {
    for (const s of ss.solids) {
      if ((s.bounce ?? 0) > 0 && s.mesh) {
        s.bounce! -= dt;
        (s.mesh as THREE.Mesh).position.y = (s.homeY ?? 0) + Math.sin(((s.bounce ?? 0) / 0.2) * Math.PI) * 0.34;
        const sign = (s.mesh as THREE.Mesh).userData?.['sign'] as THREE.Object3D | undefined;
        if (sign) sign.position.y = (s.mesh as THREE.Mesh).position.y;
      }
    }
  }

  private updateParticles(dt: number, ss: StageState): void {
    for (let i = ss.particles.length - 1; i >= 0; i--) {
      const p = ss.particles[i]!;
      p.life -= dt;
      if (p.isText) {
        p.mesh.position.y += p.vy * dt;
        (p.mesh as THREE.Sprite).material.opacity = Math.max(0, p.life / 1.2);
      } else {
        p.vy += GRAV * dt * 0.45;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.x += dt * 4; p.mesh.rotation.z += dt * 3;
        const base = Number(p.mesh.userData['baseScale'] ?? 1);
        p.mesh.scale.setScalar(base * Math.max(0.08, Math.min(1, p.life / 0.8)));
        const mesh = p.mesh as THREE.Mesh;
        if (mesh.material instanceof THREE.Material && 'opacity' in mesh.material) {
          mesh.material.opacity = Math.max(0, Math.min(1, p.life / 0.75));
        }
      }
      if (p.life <= 0) { p.mesh.removeFromParent(); ss.particles.splice(i, 1); }
    }
  }
}

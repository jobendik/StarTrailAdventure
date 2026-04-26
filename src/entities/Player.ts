import * as THREE from 'three';
import { PHYS, GRAV, FX } from '../constants/physics.ts';
import { clamp, aabb } from '../utils/math.ts';
import type { GameState } from '../core/GameState.ts';
import type { StageState } from '../stage/StageState.ts';
import type { StageObjects } from '../stage/StageObjects.ts';
import type { AudioManager } from '../audio/AudioManager.ts';
import type { InputManager } from '../input/InputManager.ts';

export interface PlayerBox { x: number; y: number; w: number; h: number; }

export class Player {
  mesh: THREE.Group | null = null;
  x = 2; y = 2; vx = 0; vy = 0;
  w = 0.7; h = 0.92;
  onGround = false;
  face: 1 | -1 = 1;
  state: 'idle' | 'run' | 'jump' | 'fall' | 'dead' = 'idle';
  coyote = 0; jumpBuf = 0;
  sqx = 1; sqy = 1;
  riding: import('../types/game.ts').Solid | null = null;
  lastSpawn = { x: 2, y: 2 };

  private lastJump  = false;
  private lastFire  = false;
  private fireCooldown = 0;

  getBox(nx = this.x, ny = this.y): PlayerBox {
    return { x: nx - this.w / 2, y: ny, w: this.w, h: this.h };
  }

  createMesh(scene: THREE.Group): THREE.Group {
    if (this.mesh) scene.remove(this.mesh);
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0xe84c4c, roughness: 0.38, metalness: 0.08 });
    const suitDark = new THREE.MeshStandardMaterial({ color: 0x2f5ee8, roughness: 0.42, metalness: 0.12 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xf6f8ff, roughness: 0.32, metalness: 0.18 });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x1b284a, roughness: 0.18, metalness: 0.2,
      emissive: new THREE.Color(0x284dff), emissiveIntensity: 0.2,
    });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.34, 6, 14), suit);
    body.name = 'body';
    body.position.y = 0.46;
    body.scale.set(1.08, 1, 0.86);
    g.add(body);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.08, 18), trim);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 0.34, 0.01);
    g.add(belt);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), trim);
    head.position.y = 0.92;
    head.scale.set(1, 0.95, 0.92);
    g.add(head);

    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 10, 0, Math.PI * 2, 0.18, Math.PI * 0.62), visorMat);
    visor.position.set(0, 0.91, 0.2);
    visor.scale.set(1.35, 0.62, 0.34);
    g.add(visor);

    const crest = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), suit);
    crest.position.set(0, 1.12, 0);
    crest.scale.set(1.55, 0.45, 1.1);
    g.add(crest);

    for (const [ox, name] of [[-0.16, 'legL'], [0.16, 'legR']] as [number, string][]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.24, 4, 8), suitDark);
      leg.position.set(ox, 0.13, 0);
      leg.name = name;
      g.add(leg);

      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), new THREE.MeshStandardMaterial({ color: 0x18223f, roughness: 0.5 }));
      boot.position.set(ox, -0.04, 0.04);
      boot.scale.set(1.25, 0.55, 1.4);
      g.add(boot);
    }
    for (const [ox, name] of [[-0.37, 'armL'], [0.37, 'armR']] as [number, string][]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), suit);
      arm.position.set(ox, 0.48, 0);
      arm.rotation.z = ox > 0 ? -0.14 : 0.14;
      arm.name = name;
      g.add(arm);

      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 6), trim);
      glove.position.set(ox * 1.02, 0.27, 0.02);
      glove.scale.set(1.05, 0.9, 1);
      g.add(glove);
    }
    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.015, 8, 32), new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.42 }));
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.02;
    glow.name = 'shadowGlow';
    g.add(glow);
    g.traverse(m => { if (m instanceof THREE.Mesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.mesh = g;
    scene.add(g);
    return g;
  }

  spawn(gs: GameState): void {
    this.x = this.lastSpawn.x; this.y = this.lastSpawn.y;
    this.vx = 0; this.vy = 0;
    this.face = 1; this.state = 'idle'; this.onGround = false;
    this.coyote = 0; this.jumpBuf = 0; this.sqx = 1; this.sqy = 1;
    this.riding = null;
    this.h = gs.power > 0 ? 1.6 : 0.92;
  }

  update(
    dt: number,
    input: InputManager,
    ss: StageState,
    so: StageObjects,
    gs: GameState,
    audio: AudioManager,
    onHit: () => void,
    onClear: (exit: 'normal' | 'secret') => void,
  ): void {
    if (gs.mode === 'dead') {
      this.vy += GRAV * dt;
      this.y += this.vy * dt;
      return;
    }
    if (gs.mode !== 'playing') return;

    this.h = gs.power > 0 ? 1.6 : 0.92;

    // Coyote time
    if (this.onGround) this.coyote = PHYS.coyote;
    else this.coyote -= dt;

    // Jump buffer
    const jumpPressed = input.action('jump');
    if (jumpPressed && !this.lastJump) this.jumpBuf = PHYS.jumpBuf;
    this.jumpBuf  -= dt;
    this.lastJump  = jumpPressed;

    // Horizontal movement
    const run = input.action('run');
    const maxSpeed = run ? PHYS.run : PHYS.walk;
    let target = 0;
    if (input.action('left'))  target = -maxSpeed;
    if (input.action('right')) target =  maxSpeed;

    const accel = this.onGround ? PHYS.acc : PHYS.airAcc;
    if (target !== 0) {
      this.face = target > 0 ? 1 : -1;
      this.vx  += (target - this.vx) * Math.min(1, accel * dt);
    } else {
      this.vx *= Math.max(0, 1 - PHYS.dec * dt);
      if (Math.abs(this.vx) < 0.08) this.vx = 0;
    }
    this.vx = clamp(this.vx, -maxSpeed, maxSpeed);

    // Jump
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = run ? PHYS.highJump : PHYS.jump;
      this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
      this.sqy = 0.78; this.sqx = 1.22;
      audio.play('jump');
      so.addParticle(this.x, this.y, 0xdddddd, 2, 2);
    }

    // Gravity
    let gravMul = 1;
    if (this.vy > 0 && Math.abs(this.vy) < PHYS.apexZone) gravMul = PHYS.apexGrav;
    else if (this.vy < 0) gravMul = PHYS.fallMul;
    else if (this.vy > 0 && !jumpPressed) gravMul = PHYS.lowJumpMul;
    this.vy += GRAV * gravMul * dt;
    this.vy  = Math.max(this.vy, -24);

    // Fireballs
    this.fireCooldown -= dt;
    const firePressed = input.action('fire');
    if (gs.power === 2 && firePressed && !this.lastFire && this.fireCooldown <= 0) {
      this.shootFireball(ss, so);
      this.fireCooldown = 0.28;
    }
    this.lastFire = firePressed;

    // Vertical collision
    this.riding = null;
    let nx = this.x + this.vx * dt;
    let ny = this.y + this.vy * dt;
    const vb = this.getBox(this.x, ny);
    const wasGround = this.onGround;
    const impactVy = this.vy;
    this.onGround = false;

    for (const s of ss.solids) {
      if (s.type === 'hidden' && this.vy <= 0) continue;
      if (s.falling) continue;
      if (aabb(vb.x + 0.08, vb.y, vb.w - 0.16, vb.h, s.x, s.y, s.w, s.h)) {
        if (this.vy <= 0) {
          this.y = s.y + s.h; this.vy = 0; this.onGround = true;
          if (s.type === 'bounce') {
            this.vy = 20; this.onGround = false;
            if (s.bounceRef) s.bounceRef.bounce = 0.2;
            audio.play('bounce');
            gs.shakeT = FX.shake.bounce; gs.shakeI = 1.5;
            this.sqy = 0.66; this.sqx = 1.33;
          } else if (s.type === 'crumble' && (s.timer ?? -1) < 0) {
            s.timer = 0.52;
          }
          if (s.type === 'moving') this.riding = s;
        } else {
          this.y = s.y - this.h; this.vy = 0;
          if (s.type === 'question' && !s.used) this.revealBlock(s, ss, so, gs, audio);
          else if (s.type === 'hidden' && !s.used) this.revealHidden(s, ss, so, gs, audio);
          else if (s.type === 'brick' && gs.power > 0 && s.mesh) this.breakBrick(s, ss, so, gs, audio);
          else { if (s.bounce !== undefined) s.bounce = 0.16; audio.play('bump'); gs.shakeT = FX.shake.brick; gs.shakeI = 1; }
        }
        ny = this.y; break;
      }
    }
    if (!this.onGround) this.y = ny;
    else if (!wasGround && impactVy < -8) {
      const land = Math.min(1, Math.abs(impactVy) / 22);
      this.sqy = 1 - land * 0.22;
      this.sqx = 1 + land * 0.16;
      gs.shakeT = Math.max(gs.shakeT, 0.055 * land);
      gs.shakeI = Math.max(gs.shakeI, 0.45 * land);
      so.addParticle(this.x, this.y + 0.04, 0xe7ecff, 2 + Math.round(land * 4), 1.8 + land * 2.2);
    }

    // Horizontal collision
    const hb = this.getBox(nx, this.y);
    for (const s of ss.solids) {
      if (s.type === 'hidden' || s.falling) continue;
      if (aabb(hb.x, hb.y + 0.05, hb.w, hb.h - 0.1, s.x, s.y, s.w, s.h)) {
        nx = this.x; this.vx = 0; break;
      }
    }
    this.x = nx;

    // Riding moving platform
    if (this.riding) {
      const mp = ss.movingPlatforms.find(p => p.rect === this.riding);
      if (mp) { this.x += mp.dxStep; this.y += mp.dyStep; }
    }

    // Bounds check
    if (this.x < 0.5) { this.x = 0.5; this.vx = 0; }
    if (this.y < -8 || (ss.info && this.x > ss.info.length + 8)) { onHit(); return; }

    // Hazard collision
    const pb = this.getBox();
    for (const hz of ss.hazards) {
      if (aabb(pb.x, pb.y, pb.w, pb.h, hz.x, hz.y, hz.w, hz.h)) { onHit(); return; }
    }

    // Checkpoints
    for (const cp of ss.checkpoints) {
      if (!cp.active && Math.abs(this.x - cp.x) < 0.9 && this.y >= cp.y) {
        cp.active = true;
        cp.flag.material = new THREE.MeshStandardMaterial({ color: 0x45ff7a, roughness: 0.28, emissive: new THREE.Color(0x21ff61), emissiveIntensity: 0.8 });
        gs.checkpoint = { x: cp.x, y: cp.y + 2 };
        audio.play('ckpt');
      }
    }

    // Goals
    if (ss.goalSecret && aabb(pb.x, pb.y, pb.w, pb.h, ss.goalSecret.x, ss.goalSecret.y, ss.goalSecret.w, ss.goalSecret.h)) {
      onClear('secret'); return;
    }
    if (ss.goalNormal && aabb(pb.x, pb.y, pb.w, pb.h, ss.goalNormal.x, ss.goalNormal.y, ss.goalNormal.w, ss.goalNormal.h)) {
      onClear('normal'); return;
    }

    // State
    if (this.onGround && Math.abs(this.vx) > 0.5) this.state = 'run';
    else if (!this.onGround) this.state = this.vy > 0 ? 'jump' : 'fall';
    else this.state = 'idle';

    gs.invT  = Math.max(0, gs.invT  - dt);
    gs.starT = Math.max(0, gs.starT - dt);
  }

  private revealBlock(s: import('../types/game.ts').Solid, _ss: StageState, so: StageObjects, gs: GameState, audio: AudioManager): void {
    s.used = true; s.bounce = 0.2;
    const mesh = s.mesh as THREE.Mesh | undefined;
    if (mesh?.userData['sign']) { (mesh.userData['sign'] as THREE.Object3D).removeFromParent(); }
    if (mesh?.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.color.setHex(0x8b6d3e); mesh.material.roughness = 0.9;
    }
    if (s.content === 'coin') so.collectCoinFx(s.x + 0.5, s.y + 1.5, gs, audio);
    else if (s.content === '1up') { gs.lives++; audio.play('pow'); so.addFloatingText(s.x + 0.5, s.y + 1.2, '1UP', '#71ff7c'); }
    else so.spawnPowerup(s.x + 0.5, s.y + 1.2, (s.content as import('../types/game.ts').PowerType) ?? 'mush');
  }

  private revealHidden(s: import('../types/game.ts').Solid, _ss: StageState, so: StageObjects, gs: GameState, audio: AudioManager): void {
    s.type = 'solid'; s.used = true; s.bounce = 0.2;
    gs.foundSecrets = Math.min(gs.totalSecrets, gs.foundSecrets + 1);
    const mesh = s.mesh as THREE.Mesh | undefined;
    if (mesh?.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.opacity = 1; mesh.material.transparent = false;
      mesh.material.color.setHex(0x8b6d3e);
    }
    audio.play('secret');
    if (s.content === 'coin') so.collectCoinFx(s.x + 0.5, s.y + 1.5, gs, audio);
    else if (s.content === '1up') { gs.lives++; so.addFloatingText(s.x + 0.5, s.y + 1.3, '1UP', '#71ff7c'); }
    else so.spawnPowerup(s.x + 0.5, s.y + 1.2, 'mush');
  }

  private breakBrick(s: import('../types/game.ts').Solid, ss: StageState, so: StageObjects, gs: GameState, audio: AudioManager): void {
    audio.play('bump');
    if (s.mesh) { so.addParticle(s.x + 0.5, s.y + 0.5, 0xc37638, 8, 5); s.mesh.removeFromParent(); }
    ss.solids.splice(ss.solids.indexOf(s), 1);
    gs.score += 50;
    so.addFloatingText(s.x + 0.5, s.y + 0.5, '50', '#ffffff');
  }

  private shootFireball(ss: StageState, so: StageObjects): void {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.3, emissive: new THREE.Color(0xff5500), emissiveIntensity: 1.0 }));
    m.position.set(this.x + this.face * 0.45, this.y + 0.56, 0);
    so['grp'].add(m); ss.meshes.push(m);
    ss.fireballs.push({ mesh: m, x: m.position.x, y: m.position.y, vx: this.face * 11, vy: 2.5, life: 3 });
  }

  updateVisual(dt: number, gs: GameState): void {
    if (!this.mesh) return;
    const sc = gs.power > 0 ? 1.4 : 1;
    this.mesh.scale.set(sc * this.face * this.sqx, sc * this.sqy, sc);
    this.mesh.position.set(this.x, this.y + 0.02, 0);

    const legL = this.mesh.getObjectByName('legL');
    const legR = this.mesh.getObjectByName('legR');
    const armL = this.mesh.getObjectByName('armL');
    const armR = this.mesh.getObjectByName('armR');

    if (this.state === 'run') {
      const t = performance.now() * 0.009 * Math.max(1, Math.abs(this.vx));
      if (legL) legL.rotation.x = Math.sin(t) * 0.65;
      if (legR) legR.rotation.x = Math.sin(t + Math.PI) * 0.65;
      if (armL) armL.rotation.x = Math.sin(t + Math.PI) * 0.45;
      if (armR) armR.rotation.x = Math.sin(t) * 0.45;
      this.mesh.rotation.z = -this.vx * 0.012;
    } else if (this.state === 'jump') {
      if (legL) legL.rotation.x = -0.25; if (legR) legR.rotation.x = 0.25;
      if (armL) armL.rotation.x = -0.8;  if (armR) armR.rotation.x = -0.8;
      this.mesh.rotation.z = 0;
    } else if (this.state === 'fall') {
      if (legL) legL.rotation.x = 0.18;  if (legR) legR.rotation.x = -0.18;
      if (armL) armL.rotation.x = -0.5;  if (armR) armR.rotation.x = -0.5;
      this.mesh.rotation.z = 0;
    } else {
      for (const m of [legL, legR, armL, armR]) { if (m) m.rotation.x += (0 - m.rotation.x) * Math.min(1, 12 * dt); }
      this.mesh.rotation.z += (0 - this.mesh.rotation.z) * Math.min(1, 8 * dt);
    }

    // Invincibility flicker
    this.mesh.visible = gs.invT <= 0 || Math.sin(gs.invT * 22) > 0;

    // Star rainbow
    if (gs.starT > 0) {
      const hue = (performance.now() * 0.002) % 1;
      const col = new THREE.Color().setHSL(hue, 1, 0.55);
      this.mesh.traverse(m => {
        if (m instanceof THREE.Mesh && (m.material as THREE.MeshStandardMaterial).emissive) {
          (m.material as THREE.MeshStandardMaterial).emissive.copy(col);
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
        }
      });
    } else {
      this.mesh.traverse(m => {
        if (m instanceof THREE.Mesh && (m.material as THREE.MeshStandardMaterial).emissive) {
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        }
      });
    }

    // Squash & stretch
    this.sqx += (1 - this.sqx) * Math.min(1, 14 * dt);
    this.sqy += (1 - this.sqy) * Math.min(1, 14 * dt);
  }
}

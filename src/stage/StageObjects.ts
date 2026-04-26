import * as THREE from 'three';
import type { StageState } from './StageState.ts';
import type { Materials } from '../renderer/Materials.ts';
import type { Geometries } from '../renderer/Geometries.ts';
import type { GameState } from '../core/GameState.ts';
import { QTex } from '../renderer/Materials.ts';
import type { AudioManager } from '../audio/AudioManager.ts';

export class StageObjects {
  constructor(
    private readonly ss: StageState,
    private readonly mats: Materials,
    private readonly geos: Geometries,
    private readonly grp: THREE.Group,
  ) {}

  private add<T extends THREE.Object3D>(m: T): T {
    return this.ss.addMesh(m, this.grp) as T;
  }

  addGroundTile(x: number, y: number): void {
    const top = this.add(new THREE.Mesh(this.geos.tile, this.mats.stageTop));
    top.position.set(x, y, 0);
    for (let d = 1; d <= 3; d++) {
      const dirt = this.add(new THREE.Mesh(this.geos.tile, this.mats.stageGround));
      dirt.position.set(x, y - d, 0);
    }
  }

  addGroundSegment(x1: number, x2: number, y: number): void {
    for (let x = Math.round(x1); x <= Math.round(x2); x++) this.addGroundTile(x, y);
    this.ss.solids.push({ x: x1 - 0.5, y: y - 0.5, w: x2 - x1 + 1, h: 1, type: 'ground' });
  }

  addSolidBlock(x: number, y: number, mat?: THREE.MeshStandardMaterial, type: 'solid' | 'brick' = 'solid'): THREE.Mesh {
    const mesh = this.add(new THREE.Mesh(this.geos.tile, (mat ?? this.mats.block).clone()));
    mesh.position.set(x, y, 0);
    this.ss.solids.push({ x: x - 0.5, y: y - 0.5, w: 1, h: 1, type, mesh, used: false, bounce: 0, homeY: y });
    return mesh;
  }

  addQuestion(x: number, y: number, content = 'coin', isHidden = false): void {
    const mat = this.mats.question.clone();
    if (isHidden) { mat.transparent = true; mat.opacity = 0; }
    const mesh = this.add(new THREE.Mesh(this.geos.tile, mat));
    mesh.position.set(x, y, 0);
    if (!isHidden) {
      const sign = this.add(new THREE.Mesh(
        new THREE.PlaneGeometry(0.72, 0.72),
        new THREE.MeshBasicMaterial({ map: QTex, transparent: true }),
      ));
      sign.position.set(x, y, 0.52);
      (mesh as THREE.Mesh & { userData: { sign?: THREE.Mesh } }).userData.sign = sign;
    }
    this.ss.solids.push({ x: x - 0.5, y: y - 0.5, w: 1, h: 1, type: isHidden ? 'hidden' : 'question', mesh, content, used: false, bounce: 0, homeY: y });
  }

  addCoin(x: number, y: number): void {
    const mesh = this.add(new THREE.Mesh(this.geos.coin, this.mats.coin.clone()));
    mesh.position.set(x, y, 0);
    mesh.rotation.x = Math.PI / 2;
    this.ss.coins.push({ mesh, x, y, collected: false, phase: Math.random() * Math.PI * 2 });
  }

  addCoinArc(x: number, y: number, count: number, dx = 1, height = 2): void {
    for (let i = 0; i < count; i++) {
      this.addCoin(x + i * dx, y + Math.sin((i / (count - 1 || 1)) * Math.PI) * height);
    }
  }

  addEnemy(x: number, y: number, type: 'goomba' | 'koopa' = 'goomba'): void {
    const g = new THREE.Group();
    if (type === 'goomba') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), this.mats.goomba);
      body.scale.set(1.08, 0.78, 0.9); body.position.y = 0.42; g.add(body);
      const browMat = new THREE.MeshStandardMaterial({ color: 0x3b1d12, roughness: 0.7 });
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), browMat);
      brow.position.set(0, 0.64, 0.32); brow.rotation.z = -0.04; g.add(brow);
      for (const ox of [-0.16, 0.16]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
        eye.position.set(ox, 0.56, 0.28); g.add(eye);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 5), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }));
        pup.position.set(ox, 0.55, 0.35); g.add(pup);
      }
      for (const ox of [-0.2, 0.2]) {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6), new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: 0.5 }));
        foot.position.set(ox, 0.1, 0.1); foot.scale.set(1, 0.6, 1.4); g.add(foot);
      }
    } else {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), this.mats.shell);
      shell.scale.set(0.95, 0.82, 0.72); shell.position.y = 0.5; g.add(shell);
      const shellBand = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 28), new THREE.MeshStandardMaterial({ color: 0xe4f9d8, roughness: 0.38 }));
      shellBand.rotation.x = Math.PI / 2; shellBand.position.y = 0.5; g.add(shellBand);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), this.mats.koopa);
      head.position.set(0, 0.92, 0.2); g.add(head);
      for (const ox of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
        eye.position.set(ox, 0.97, 0.35); g.add(eye);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        pup.position.set(ox, 0.965, 0.405); g.add(pup);
      }
    }
    g.position.set(x, y + 0.5, 0);
    this.add(g);
    this.ss.enemies.push({ mesh: g, x, y: y + 0.5, vx: -(1.55 + Math.random() * 0.35), vy: 0, type, alive: true, squash: 0, isShell: false, shellV: 0 });
  }

  addPipe(x: number, y: number, h: number): void {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, h, 12), this.mats.pipe);
    body.position.y = h / 2; g.add(body);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.36, 12), this.mats.pipeRim);
    rim.position.y = h + 0.18; g.add(rim);
    g.position.set(x, y + 0.5, 0);
    this.add(g);
    this.ss.solids.push({ x: x - 0.5, y: y + 0.5, w: 1.0, h: h + 0.32, type: 'pipe' });
  }

  addBouncePad(x: number, y: number): void {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.28, 0.84), this.mats.bounce);
    base.position.y = 0.14; g.add(base);
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.36, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd44f, metalness: 0.45, roughness: 0.32 }));
    spring.position.y = 0.45; g.add(spring);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), this.mats.bounce.clone());
    top.position.y = 0.72; g.add(top);
    g.position.set(x, y, 0);
    this.add(g);
    const rec: import('../types/game.ts').BouncePad = { mesh: g, x, y, bounce: 0 };
    this.ss.bouncePads.push(rec);
    this.ss.solids.push({ x: x - 0.42, y: y - 0.08, w: 0.84, h: 0.86, type: 'bounce', bounceRef: rec });
  }

  addMovingPlatform(x: number, y: number, w: number, rangeX: number, rangeY: number, speed: number): void {
    const mesh = this.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.36, 1), this.mats.movingPlat.clone())) as THREE.Mesh;
    mesh.position.set(x, y, 0);
    const rect: import('../types/game.ts').Solid = { x: x - w / 2, y: y - 0.18, w, h: 0.36, type: 'moving' };
    const mp: import('../types/game.ts').MovingPlatform = { mesh, w, ox: x, oy: y, rangeX, rangeY, speed, t: Math.random() * Math.PI * 2, rect, dxStep: 0, dyStep: 0 };
    this.ss.movingPlatforms.push(mp);
    this.ss.solids.push(rect);
  }

  addCrumble(x: number, y: number, w = 1): void {
    for (let i = 0; i < w; i++) {
      const mesh = this.add(new THREE.Mesh(this.geos.tile, this.mats.crumble.clone())) as THREE.Mesh;
      mesh.position.set(x + i, y, 0);
      const rec: import('../types/game.ts').Solid = {
        x: x + i - 0.5, y: y - 0.5, w: 1, h: 1, type: 'crumble',
        mesh, homeX: x + i, homeY: y, timer: -1, falling: false, respawn: 0,
      };
      this.ss.solids.push(rec);
    }
  }

  addCheckpoint(x: number, y: number): void {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), this.mats.checkpoint.clone());
    post.position.y = 1.4; g.add(post);
    const flag = this.add(new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.38), this.mats.checkpoint.clone())) as THREE.Mesh;
    flag.position.set(0.35, 2.4, 0); g.add(flag);
    g.position.set(x, y + 0.5, 0);
    this.add(g);
    this.ss.checkpoints.push({ mesh: g, x, y, flag, active: false });
  }

  addHazard(x: number, y: number, w: number, h = 0.42): void {
    const mesh = this.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), this.mats.hazard.clone())) as THREE.Mesh;
    mesh.position.set(x + w / 2 - 0.5, y + h / 2 - 0.5, 0);
    this.ss.hazards.push({ x: x - 0.5, y: y - 0.5, w, h, type: 'lava', mesh });
  }

  addFlagGoal(x: number, y: number, fortress = false): void {
    if (!fortress) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8.5, 8), this.mats.pole);
      pole.position.y = 4.5; g.add(pole);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), this.mats.star.clone());
      orb.position.y = 8.8; g.add(orb);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.78), this.mats.flag);
      flag.position.set(0.62, 7.8, 0); g.add(flag);
      g.position.set(x, y + 0.5, 0);
      this.add(g);
      this.ss.goalNormal = { x: x - 0.6, y: y + 0.5, w: 1.2, h: 7.8, type: 'goal' };
    } else {
      const g = new THREE.Group();
      const gate = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3, 2.3), this.mats.fortress.clone());
      gate.position.y = 1.5; g.add(gate);
      for (const tx of [-1.5, 1.5]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4.2, 8), this.mats.fortress.clone());
        tower.position.set(tx, 2.1, 0); g.add(tower);
      }
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      door.position.set(0, 0.95, 1.16); g.add(door);
      g.position.set(x + 2, y + 0.5, 0);
      this.add(g);
      this.ss.goalNormal = { x: x + 0.4, y: y + 0.5, w: 2.6, h: 2.8, type: 'goal' };
    }
  }

  addSecretDoor(x: number, y: number, style: 'door' | 'pipe' = 'door'): void {
    const g = new THREE.Group();
    if (style === 'pipe') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.8, 12), this.mats.crystal.clone());
      body.position.y = 0.9; g.add(body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 8, 18), this.mats.crystal.clone());
      ring.rotation.x = Math.PI / 2; ring.position.y = 1.65; g.add(ring);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.36), this.mats.crystal.clone());
      body.position.y = 0.9; g.add(body);
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), this.mats.star.clone());
      crown.position.set(0, 2.05, 0); g.add(crown);
    }
    g.position.set(x, y, 0);
    this.add(g);
    this.ss.goalSecret = { x: x - 0.6, y, w: 1.2, h: 1.9, type: 'secretGoal' };
  }

  addPowerupSpawn(x: number, y: number, type: import('../types/game.ts').PowerType): void {
    this.ss.powerups.push({ pending: true, spawnX: x, spawnY: y, type, active: true, x, y });
  }

  spawnPowerup(x: number, y: number, type: import('../types/game.ts').PowerType): void {
    const g = new THREE.Group();
    if (type === 'mush' || type === '1up') {
      const capColor = type === '1up' ? 0x2aae48 : 0xe53935;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.34, metalness: 0.04 }));
      cap.position.y = 0.32; g.add(cap);
      for (const [px, py, pz] of [[-0.14, 0.42, 0.2],[0.14, 0.42, 0.2],[0, 0.5, 0.11]] as [number,number,number][]) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28 }));
        dot.position.set(px, py, pz); g.add(dot);
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.26, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }));
      stem.position.y = 0.1;
      g.add(stem);
    } else if (type === 'star') {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), this.mats.star.clone());
      star.position.y = 0.4; g.add(star);
    } else if (type === 'fire') {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x29a641 }));
      stem.position.y = 0.15; g.add(stem);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff7220, emissive: new THREE.Color(0xff4a10), emissiveIntensity: 0.7 }));
      bloom.position.y = 0.46; g.add(bloom);
    }
    g.position.set(x, y, 0);
    this.add(g);
    this.ss.powerups.push({ mesh: g, x, y, vx: type === 'star' ? 1.2 : 2.1, vy: 0, type, active: true, rise: 0.28 });
  }

  addParticle(x: number, y: number, color: number, count = 4, spd = 3): void {
    for (let i = 0; i < count; i++) {
      const size = 0.055 + Math.random() * 0.09;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
      );
      m.position.set(x, y, 0);
      m.userData['baseScale'] = 1 + Math.random() * 0.35;
      m.scale.setScalar(m.userData['baseScale']);
      this.grp.add(m); this.ss.meshes.push(m);
      this.ss.particles.push({ mesh: m, life: 0.8 + Math.random() * 0.4, vx: (Math.random() - 0.5) * spd, vy: Math.random() * spd + 1.5, vz: (Math.random() - 0.5) * spd * 0.25 });
    }
  }

  addFloatingText(x: number, y: number, text: string, color = '#ffffff'): void {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.font = "800 58px 'Outfit', 'Inter', Arial, sans-serif";
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(8,12,30,0.86)'; ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(text), 128, 68); ctx.fillText(String(text), 128, 68);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    spr.position.set(x, y + 1, 0.7); spr.scale.set(1.9, 0.95, 1);
    this.grp.add(spr); this.ss.meshes.push(spr);
    this.ss.particles.push({ mesh: spr, life: 1.2, vx: 0, vy: 2.6, vz: 0, isText: true });
  }

  collectCoinFx(x: number, y: number, gameState: GameState, audio: AudioManager): void {
    gameState.coins++;
    gameState.score += 200;
    gameState.foundCoins++;
    if (gameState.coins >= 100) { gameState.coins = 0; gameState.lives++; audio.play('pow'); }
    audio.play('coin');
    this.addFloatingText(x, y, '200', '#ffe36c');
  }

  addCrystalDecor(x: number, y: number, z = -1.1, scale = 1): void {
    const mat = this.mats.crystal.clone();
    mat.emissiveIntensity = 0.42;
    const mesh = this.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.45 * scale, 0), mat));
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
  }
}

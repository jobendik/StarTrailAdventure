import * as THREE from 'three';
import type { ThreeSetup } from './ThreeSetup.ts';
import type { WorldPalette } from '../types/game.ts';
import { WORLD_INDEX } from '../data/worlds.ts';

export class SceneBackground {
  private readonly three: ThreeSetup;
  readonly bgClouds: THREE.Group[] = [];

  constructor(three: ThreeSetup) { this.three = three; }

  build(worldId: string, width = 90): void {
    this.three.clearGroup(this.three.bgGroup);
    this.bgClouds.length = 0;
    const world   = WORLD_INDEX[worldId];
    if (!world) return;
    const palette = world.palette;

    this.makeSky(palette);
    this.makeHills(palette, width);
    this.makeWorldDecor(palette, width);
  }

  private makeSky(p: WorldPalette): void {
    const c = document.createElement('canvas'); c.width = 2; c.height = 512;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, p.top); g.addColorStop(0.48, p.mid); g.addColorStop(1, p.bot);
    x.fillStyle = g; x.fillRect(0, 0, 2, 512);
    const skyTex = new THREE.CanvasTexture(c);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    this.three.scene.background = skyTex;
    this.three.scene.fog = new THREE.FogExp2(new THREE.Color(p.bot).getHex(), 0.0048);
    this.three.ambient.color.setHex(p.ambient);
    this.three.hemi.color.set(new THREE.Color(p.top));
    this.three.hemi.groundColor.set(new THREE.Color(p.bot).offsetHSL(0, -0.08, -0.18));
  }

  private makeHills(p: WorldPalette, width: number): void {
    for (let i = -16; i < width + 18; i += 14) {
      this.addHill(i + Math.random() * 4, 3.8 + Math.random() * 2.6, 2.4 + Math.random() * 2.4, p.hillA, -9);
      this.addHill(i + 6 + Math.random() * 4, 4.5 + Math.random() * 3, 2.8 + Math.random() * 2.3, p.hillB, -11);
    }
  }

  private addHill(x: number, r: number, h: number, colorHex: string, z: number): void {
    const geo = new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.92 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.y = h / r;
    mesh.position.set(x, -0.15, z);
    this.three.bgGroup.add(mesh);
  }

  private addCloud(x: number, y: number, z: number, s: number): void {
    const g = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, transparent: true, opacity: 0.92 });
    const offsets: [number, number, number][] = [[-0.9,0,0],[0,0,0],[0.82,0,0],[-0.35,0.26,0.05],[0.35,0.22,-0.08],[0.05,0.36,0.03]];
    for (const [ox, oy, oz] of offsets) {
      const r = 0.48 + Math.random() * 0.18;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 10),
        cloudMat,
      );
      m.position.set(ox * s, oy * s, oz * s);
      m.scale.y = 0.56 + Math.random() * 0.14;
      g.add(m);
    }
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    this.three.bgGroup.add(g);
    this.bgClouds.push(g);
  }

  private makeWorldDecor(p: WorldPalette, width: number): void {
    const { deco } = p;

    if (deco === 'meadow' || deco === 'sky') {
      const count = deco === 'sky' ? 18 : 13;
      for (let i = 0; i < count; i++) {
        this.addCloud(Math.random() * width, 9 + Math.random() * 6, -8 - Math.random() * 7, 0.9 + Math.random() * 1.2);
      }
    } else if (deco === 'factory') {
      for (let i = 0; i < 10; i++) this.addCloud(Math.random() * width, 11 + Math.random() * 4, -9 - Math.random() * 8, 0.7 + Math.random() * 1);
      // Chimneys
      for (let i = 0; i < 8; i++) {
        const geo = new THREE.CylinderGeometry(0.22, 0.28, 3 + Math.random() * 2, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(10 + i * 9 + Math.random() * 4, -1.5, -10);
        this.three.bgGroup.add(mesh);
      }
    } else if (deco === 'crystal') {
      for (let i = 0; i < 20; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x89fff0, roughness: 0.15, metalness: 0.2, emissive: new THREE.Color(0x46fff0), emissiveIntensity: 0.5 });
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.45 + Math.random() * 0.6, 0), mat);
        mesh.position.set(Math.random() * width, 1.4 + Math.random() * 4, -6 - Math.random() * 3);
        mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        this.three.bgGroup.add(mesh);
      }
    } else if (deco === 'fortress') {
      for (let i = 0; i < 14; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xff7744, emissive: new THREE.Color(0xff4400), emissiveIntensity: 0.6 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat);
        mesh.position.set(Math.random() * width, 2 + Math.random() * 8, -5 - Math.random() * 3);
        this.three.bgGroup.add(mesh);
      }
    }
  }

  updateClouds(dt: number, cameraX: number): void {
    for (const c of this.bgClouds) {
      c.position.x += dt * 0.22;
      if (c.position.x > cameraX + 50) c.position.x -= 100;
    }
  }

  setMapView(): void {
    this.three.camera.position.set(24, 10, 24);
    this.three.camera.lookAt(24, 2, 0);
  }
}

import * as THREE from 'three';

function mat(color: number, roughness = 0.65, metalness = 0, emissive?: number, emissiveIntensity = 0.3): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  if (emissive !== undefined) { m.emissive.setHex(emissive); m.emissiveIntensity = emissiveIntensity; }
  return m;
}

function makeQTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d')!;

  // Warm gold base gradient
  const grad = x.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#ffde7a');
  grad.addColorStop(0.55, '#f5c132');
  grad.addColorStop(1, '#c98f0a');
  x.fillStyle = grad; x.fillRect(0, 0, size, size);

  // Subtle top highlight
  x.fillStyle = 'rgba(255,255,255,0.18)';
  x.fillRect(0, 0, size, 10);

  // Bottom shadow strip
  x.fillStyle = 'rgba(0,0,0,0.22)';
  x.fillRect(0, size - 12, size, 12);

  // Side shadow strips (give depth)
  x.fillStyle = 'rgba(160, 100, 0, 0.28)';
  x.fillRect(0, 0, 6, size);
  x.fillRect(size - 6, 0, 6, size);

  // Thick, centered question mark.
  x.shadowColor = 'rgba(0,0,0,0.6)';
  x.shadowBlur  = 6;
  x.shadowOffsetY = 3;
  x.fillStyle = 'rgba(120, 65, 0, 0.88)';
  x.font = `bold ${size * 0.7}px 'Outfit', 'Inter', Arial, sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('?', size / 2 + 1, size / 2 + 4);
  x.shadowBlur = 0; x.shadowOffsetY = 0;

  // White inner highlight on "?"
  x.fillStyle = 'rgba(255,230,160,0.55)';
  x.font = `bold ${size * 0.68}px 'Outfit', 'Inter', Arial, sans-serif`;
  x.fillText('?', size / 2 - 1, size / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeGrassTexture(grassColor: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d')!;
  const r = (grassColor >> 16) & 0xff;
  const g = (grassColor >> 8) & 0xff;
  const b = grassColor & 0xff;

  // Base color
  x.fillStyle = `rgb(${r},${g},${b})`;
  x.fillRect(0, 0, 64, 64);

  // Subtle noise highlights
  for (let i = 0; i < 14; i++) {
    const px = Math.random() * 60; const py = Math.random() * 60;
    const bright = Math.random() > 0.5;
    x.fillStyle = bright ? `rgba(255,255,255,0.09)` : `rgba(0,0,0,0.07)`;
    x.fillRect(px, py, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  // Top highlight strip (sunlit edge)
  const grad = x.createLinearGradient(0, 0, 0, 8);
  grad.addColorStop(0, `rgba(255,255,255,0.18)`);
  grad.addColorStop(1, 'transparent');
  x.fillStyle = grad; x.fillRect(0, 0, 64, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const QTex: THREE.CanvasTexture = makeQTexture();

export class Materials {
  // Static, world-independent materials.
  readonly player:     THREE.MeshStandardMaterial = mat(0xd93228, 0.42, 0.05);
  readonly skin:       THREE.MeshStandardMaterial = mat(0xffbb96, 0.55);
  readonly pants:      THREE.MeshStandardMaterial = mat(0x1a5fd1, 0.45, 0.08);
  readonly coin:       THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcf40, roughness: 0.12, metalness: 0.9,
    emissive: new THREE.Color(0xcc8800), emissiveIntensity: 1.1,
  });
  readonly goomba:     THREE.MeshStandardMaterial = mat(0x7d3e1c, 0.68);
  readonly koopa:      THREE.MeshStandardMaterial = mat(0x3aa045, 0.5);
  readonly shell:      THREE.MeshStandardMaterial = mat(0x1e6b30, 0.3, 0.28);
  readonly pipe:       THREE.MeshStandardMaterial = mat(0x259932, 0.4, 0.22);
  readonly pipeRim:    THREE.MeshStandardMaterial = mat(0x3ec450, 0.38, 0.22);
  readonly block:      THREE.MeshStandardMaterial = mat(0xb86e30, 0.65);
  readonly question:   THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd060, roughness: 0.32, metalness: 0.28, map: QTex,
    emissive: new THREE.Color(0xffaa00), emissiveIntensity: 0.18,
  });
  readonly bounce:     THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4fa8, roughness: 0.3, metalness: 0.18,
    emissive: new THREE.Color(0xff1a6e), emissiveIntensity: 0.5,
  });
  readonly crumble:    THREE.MeshStandardMaterial = mat(0xa87d5a, 0.88);
  readonly movingPlat: THREE.MeshStandardMaterial = mat(0x5aabff, 0.38, 0.3);
  readonly fortress:   THREE.MeshStandardMaterial = mat(0x787888, 0.82);
  readonly crystal:    THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0x7afff0, roughness: 0.1, metalness: 0.25,
    emissive: new THREE.Color(0x38fff0), emissiveIntensity: 1.0,
  });
  readonly hazard:     THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4422, roughness: 0.28,
    emissive: new THREE.Color(0xff2800), emissiveIntensity: 1.4,
  });
  readonly flag:       THREE.MeshStandardMaterial = mat(0xff3d3d, 0.42);
  readonly pole:       THREE.MeshStandardMaterial = mat(0xd0d0d0, 0.18, 0.85);
  readonly fireball:   THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0xff7200, roughness: 0.22,
    emissive: new THREE.Color(0xff4800), emissiveIntensity: 1.2,
  });
  readonly checkpoint:    THREE.MeshStandardMaterial = mat(0xe0e0e0, 0.32, 0.55);
  readonly checkpointOn:  THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0x40ff80, roughness: 0.24, metalness: 0.22,
    emissive: new THREE.Color(0x18ff58), emissiveIntensity: 0.95,
  });
  readonly cloud:      THREE.MeshStandardMaterial = mat(0xffffff, 0.95);
  readonly star:       THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe060, roughness: 0.14, metalness: 0.45,
    emissive: new THREE.Color(0xffb800), emissiveIntensity: 0.85,
  });

  // Per-stage materials, updated when entering a world.
  stageTop:    THREE.MeshStandardMaterial = mat(0x4db548, 0.78);
  stageGround: THREE.MeshStandardMaterial = mat(0x8a5535, 0.85);

  updateForWorld(grassColor: number, groundColor: number): void {
    this.stageTop.dispose();
    this.stageGround.dispose();
    const grassTex = makeGrassTexture(grassColor);
    this.stageTop    = new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.78, map: grassTex });
    this.stageGround = new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.85 });
  }
}

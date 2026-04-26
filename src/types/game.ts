import type * as THREE from 'three';

export type GameMode = 'title' | 'map' | 'playing' | 'clearing' | 'dead' | 'victory';
export type NodeKind = 'normal' | 'challenge' | 'bonus' | 'secret' | 'vertical' | 'fortress';
export type ExitType = 'normal' | 'secret';
export type PowerType = 'mush' | '1up' | 'star' | 'fire';
export type EnemyType = 'goomba' | 'koopa';
export type WorldDecoType = 'meadow' | 'factory' | 'sky' | 'crystal' | 'fortress';
export type PathMode = 'main' | 'branch' | 'secret';
export type RankType = 'S' | 'A' | 'B' | 'C';
export type MusicMode =
  | 'none' | 'title'
  | 'map0' | 'map1' | 'map2' | 'map3' | 'map4'
  | 'stage0' | 'stage1' | 'stage2' | 'stage3' | 'stage4'
  | 'fortress' | 'victory';

export interface WorldPalette {
  top: string; mid: string; bot: string;
  hillA: string; hillB: string;
  ground: number; grass: number;
  accent: string; mapGround: string; ambient: number;
  deco: WorldDecoType;
}

export interface NodeData {
  id: string; x: number; y: number;
  kind: NodeKind; name: string; label: string; diff: number;
  normalTo?: string[]; secretTo?: string;
  hidden?: boolean; worldUnlock?: string; final?: boolean;
}

export interface WorldNode extends NodeData {
  world: string; worldName: string;
  palette: WorldPalette; neighbors: string[];
}

export interface WorldPath { a: string; b: string; mode: PathMode; }

export interface WorldData {
  id: string; index: number; name: string; subtitle: string; entry: string;
  palette: WorldPalette; nodes: NodeData[]; paths: WorldPath[];
}

export type SolidType =
  | 'ground' | 'solid' | 'brick' | 'question' | 'hidden'
  | 'bounce' | 'moving' | 'crumble' | 'pipe';

export interface Solid {
  x: number; y: number; w: number; h: number;
  type: SolidType;
  mesh?: THREE.Object3D;
  used?: boolean;
  bounce?: number; homeY?: number; homeX?: number;
  content?: string;
  bounceRef?: BouncePad;
  falling?: boolean;
  timer?: number; respawn?: number;
}

export interface CoinObject {
  mesh: THREE.Object3D;
  x: number; y: number;
  collected: boolean; phase: number;
}

export interface EnemyObject {
  mesh: THREE.Group;
  x: number; y: number; vx: number; vy: number;
  type: EnemyType;
  alive: boolean; squash: number;
  isShell: boolean; shellV: number;
}

export interface PowerupObject {
  mesh?: THREE.Group;
  x: number; y: number;
  vx?: number; vy?: number;
  type: PowerType;
  active: boolean; rise?: number;
  pending?: boolean; spawnX?: number; spawnY?: number;
}

export interface FireballObject {
  mesh: THREE.Mesh;
  x: number; y: number; vx: number; vy: number; life: number;
}

export interface ParticleObject {
  mesh: THREE.Object3D;
  life: number; vx: number; vy: number; vz: number;
  isText?: boolean;
}

export interface BouncePad {
  mesh: THREE.Group; x: number; y: number; bounce: number;
}

export interface MovingPlatform {
  mesh: THREE.Mesh; w: number;
  ox: number; oy: number;
  rangeX: number; rangeY: number; speed: number; t: number;
  rect: Solid; dxStep: number; dyStep: number;
}

export interface CheckpointObject {
  mesh: THREE.Group; x: number; y: number;
  flag: THREE.Mesh; active: boolean;
}

export interface HazardObject {
  x: number; y: number; w: number; h: number;
  type: 'lava'; mesh: THREE.Mesh;
}

export interface GoalObject {
  x: number; y: number; w: number; h: number;
  type: 'goal' | 'secretGoal';
}

export interface SpawnPoint { x: number; y: number; }

export interface CurrentStageInfo {
  nodeId: string; length: number; worldId: string;
  vertical: boolean; time: number; node: WorldNode;
}

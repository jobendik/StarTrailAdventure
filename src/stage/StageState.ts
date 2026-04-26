import * as THREE from 'three';
import type {
  Solid, CoinObject, EnemyObject, PowerupObject,
  FireballObject, ParticleObject, BouncePad, MovingPlatform,
  CheckpointObject, HazardObject, GoalObject, CurrentStageInfo,
} from '../types/game.ts';

export class StageState {
  solids:           Solid[]             = [];
  coins:            CoinObject[]        = [];
  enemies:          EnemyObject[]       = [];
  powerups:         PowerupObject[]     = [];
  fireballs:        FireballObject[]    = [];
  particles:        ParticleObject[]    = [];
  hazards:          HazardObject[]      = [];
  bouncePads:       BouncePad[]         = [];
  movingPlatforms:  MovingPlatform[]    = [];
  checkpoints:      CheckpointObject[]  = [];
  goalNormal:       GoalObject | null   = null;
  goalSecret:       GoalObject | null   = null;

  meshes: THREE.Object3D[] = [];
  info:   CurrentStageInfo | null = null;

  clear(scene: THREE.Group): void {
    for (const mesh of this.meshes) scene.remove(mesh);
    this.meshes = [];
    this.solids          = [];
    this.coins           = [];
    this.enemies         = [];
    this.powerups        = [];
    this.fireballs       = [];
    this.particles       = [];
    this.hazards         = [];
    this.bouncePads      = [];
    this.movingPlatforms = [];
    this.checkpoints     = [];
    this.goalNormal      = null;
    this.goalSecret      = null;
  }

  addMesh(object: THREE.Object3D, scene: THREE.Group): THREE.Object3D {
    scene.add(object);
    this.meshes.push(object);
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return object;
  }
}

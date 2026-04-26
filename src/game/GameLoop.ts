import * as THREE from 'three';
import { ThreeSetup }        from '../renderer/ThreeSetup.ts';
import { Materials }         from '../renderer/Materials.ts';
import { Geometries }        from '../renderer/Geometries.ts';
import { SceneBackground }   from '../renderer/SceneBackground.ts';
import { InputManager }      from '../input/InputManager.ts';
import { AudioManager }      from '../audio/AudioManager.ts';
import { SaveManager }       from '../core/SaveManager.ts';
import { GameState }         from '../core/GameState.ts';
import { Player }            from '../entities/Player.ts';
import { StageState }        from '../stage/StageState.ts';
import { StageObjects }      from '../stage/StageObjects.ts';
import { StageBuilder }      from '../stage/StageBuilder.ts';
import { StageUpdater }      from '../stage/StageUpdater.ts';
import { WorldMapRenderer }  from '../map/WorldMapRenderer.ts';
import { WorldMapManager }   from '../map/WorldMapManager.ts';
import { HUD }               from '../ui/HUD.ts';
import { UIManager }         from '../ui/UIManager.ts';
import { GameFlow }          from './GameFlow.ts';
import { NODE_INDEX, WORLD_INDEX } from '../data/worlds.ts';

export class Game {
  readonly three:      ThreeSetup;
  readonly mats:       Materials;
  readonly geos:       Geometries;
  readonly bg:         SceneBackground;
  readonly input:      InputManager;
  readonly audio:      AudioManager;
  readonly save:       SaveManager;
  readonly gs:         GameState;
  readonly player:     Player;
  readonly stageState: StageState;
  readonly so:         StageObjects;
  readonly builder:    StageBuilder;
  readonly updater:    StageUpdater;
  readonly mapRen:     WorldMapRenderer;
  readonly mapMgr:     WorldMapManager;
  readonly hud:        HUD;
  readonly ui:         UIManager;
  readonly flow:       GameFlow;

  constructor() {
    this.three      = new ThreeSetup();
    this.mats       = new Materials();
    this.geos       = new Geometries();
    this.bg         = new SceneBackground(this.three);
    this.input      = new InputManager();
    this.audio      = new AudioManager();
    this.save       = new SaveManager();
    this.gs         = new GameState();
    this.player     = new Player();
    this.stageState = new StageState();
    this.so         = new StageObjects(this.stageState, this.mats, this.geos, this.three.stageGroup);
    this.builder    = new StageBuilder();
    this.updater    = new StageUpdater();
    this.hud        = new HUD();
    this.ui         = new UIManager();
    this.flow       = new GameFlow(this);

    this.mapRen = new WorldMapRenderer(this.three, this.save, this.gs);
    this.mapMgr = new WorldMapManager(
      this.save, this.gs, this.audio, this.input, this.bg,
      () => { void this.flow.enterStage(); },
      (msg, ms) => this.ui.toast(msg, ms),
    );

    this.save.initDefaultUnlocks();

    // Restore last session position
    if (!this.save.nodeUnlocked(this.gs.nodeId)) this.gs.nodeId = 'w1_1';
    if (!this.save.nodeUnlocked(this.gs.selectedNodeId)) this.gs.selectedNodeId = this.gs.nodeId;
    this.gs.worldId       = this.save.data.currentWorld ?? 'w1';
    this.gs.nodeId        = this.save.nodeUnlocked(this.save.data.currentNode) ? this.save.data.currentNode : WORLD_INDEX[this.gs.worldId]!.entry;
    this.gs.selectedNodeId = this.gs.nodeId;

    // Input wiring
    this.input.init();
    this.input.onKeyPress(code => this.handleKeyPress(code));

    // Map canvas click
    const mapCanvas = document.getElementById('mapc') as HTMLCanvasElement;
    mapCanvas.addEventListener('pointerdown', e => this.mapMgr.handleCanvasClick(e, mapCanvas));
  }

  start(): void {
    void this.flow.showTitle();
    this.loop();
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.three.clock.getDelta(), 0.05);
    this.tick(dt);
  };

  private tick(dt: number): void {
    const { gs } = this;

    if (gs.freezeT > 0) { gs.freezeT -= dt; this.three.render(); return; }

    if (gs.mode === 'map') {
      this.mapMgr.update(dt);
    }

    if (gs.mode === 'playing') {
      gs.time -= dt;
      if (gs.time <= 0) { gs.time = 0; this.flow.onPlayerHit(); }

      this.updater.updateAll(
        dt, this.stageState, this.so, this.player, gs, this.audio,
        () => this.flow.onPlayerHit(),
      );
      this.player.update(
        dt, this.input, this.stageState, this.so, gs, this.audio,
        () => this.flow.onPlayerHit(),
        (exit) => { void this.flow.clearStage(exit); },
      );
      this.hud.updateStage(gs);
    }

    if (gs.mode === 'dead') {
      this.player.update(dt, this.input, this.stageState, this.so, gs, this.audio, () => {}, () => {});
    }

    this.player.updateVisual(dt, gs);
    this.bg.updateClouds(dt, this.three.camera.position.x);
    this.updateCamera(dt);

    if (gs.mode === 'map') {
      this.hud.updateMap(gs, this.save);
      this.mapRen.draw();
    }

    this.three.render();
  }

  private handleKeyPress(code: string): void {
    const { gs, ui } = this;
    if (gs.mode === 'title') {
      if (code === 'ArrowUp'   || code === 'KeyW') ui.navigateMenu(-1, this.save);
      if (code === 'ArrowDown' || code === 'KeyS') ui.navigateMenu(1,  this.save);
      if (code === 'Enter'     || code === 'Space') {
        ui.activateMenu(
          this.save,
          () => { void this.flow.continueGame(); },
          () => { void this.flow.newGame(); },
          () => { this.save.wipe(); ui.selectedMenu = 0; ui.toast('Save erased'); void this.flow.showTitle(); },
        );
      }
      ui.rebuildTitleMenu(
        gs, this.save,
        () => { void this.flow.continueGame(); },
        () => { void this.flow.newGame(); },
        () => { this.save.wipe(); ui.selectedMenu = 0; ui.toast('Save erased'); void this.flow.showTitle(); },
      );
      return;
    }
    if (gs.mode === 'map') {
      this.mapMgr.handleKeyPress(code);
    }
  }

  private updateCamera(dt: number): void {
    const { gs, three, player } = this;
    const cam = three.camera;
    if (gs.mode === 'map' || gs.mode === 'title' || gs.mode === 'victory') {
      cam.position.x += (24 - cam.position.x) * 2 * dt;
      cam.position.y += (10 - cam.position.y) * 2 * dt;
      cam.position.z  = 24;
      cam.fov += (50 - cam.fov) * Math.min(1, 3 * dt);
      cam.updateProjectionMatrix();
      cam.lookAt(24, 2, 0);
      return;
    }

    const lookX = player.x + player.vx * 0.35;
    const lookY = Math.max(3, player.y + 3 + (player.vy > 3 ? player.vy * 0.07 : player.vy < -3 ? player.vy * 0.04 : 0));
    const speed01 = Math.min(1, Math.abs(player.vx) / 10.6);
    cam.position.x += (lookX - cam.position.x) * 3.3 * dt;
    cam.position.y += (lookY + 3 - cam.position.y) * 2.6 * dt;
    cam.position.z  = 18;
    cam.fov += ((50 + speed01 * 3.5) - cam.fov) * Math.min(1, 2.8 * dt);
    cam.updateProjectionMatrix();

    // Screen shake
    let sx = 0, sy = 0;
    if (gs.shakeT > 0) {
      gs.shakeT -= dt;
      const intensity = gs.shakeI * (gs.shakeT / 0.24);
      sx = (Math.random() - 0.5) * intensity * 0.08;
      sy = (Math.random() - 0.5) * intensity * 0.06;
      if (gs.shakeT <= 0) gs.shakeI = 0;
    }
    cam.position.x += sx; cam.position.y += sy;
    cam.lookAt(cam.position.x, cam.position.y - 3, 0);

    // Follow sun
    three.sun.position.x = cam.position.x + 18;
    three.sun.target.position.set(cam.position.x, 0, 0);
    three.sun.target.updateMatrixWorld();
    three.rim.position.x = cam.position.x - 10;

    void THREE;
    void NODE_INDEX;
  }
}

import { pad } from '../utils/format.ts';
import { RANK_ORDER, WORLD_ORDER } from '../constants/game.ts';
import { WORLD_INDEX, NODE_INDEX } from '../data/worlds.ts';
import type { ExitType, RankType } from '../types/game.ts';
import type { Game } from './GameLoop.ts';

export class GameFlow {
  constructor(private readonly game: Game) {}

  async showTitle(): Promise<void> {
    const { gs, ui, save, audio, bg } = this.game;
    gs.mode = 'title';
    ui.showTitle();
    bg.build('w1', 72); bg.setMapView();
    audio.startMusic('title', 0);
    ui.rebuildTitleMenu(
      gs, save,
      () => { void this.continueGame(); },
      () => { void this.newGame(); },
      () => { save.wipe(); ui.selectedMenu = 0; ui.toast('Save erased'); void this.showTitle(); },
    );
  }

  async continueGame(): Promise<void> {
    const { gs, save, audio } = this.game;
    audio.init();
    gs.reset();
    gs.worldId        = save.data.currentWorld ?? 'w1';
    gs.selectedNodeId = save.nodeUnlocked(save.data.currentNode)
      ? save.data.currentNode
      : WORLD_INDEX[gs.worldId]!.entry;
    gs.nodeId = gs.selectedNodeId;
    await this.goToMap(false);
  }

  async newGame(): Promise<void> {
    const { gs, save, audio } = this.game;
    audio.init();
    save.wipe();
    save.data.started = true;
    gs.reset();
    save.unlockNode('w1_1');
    this.syncToSave('w1_1');
    save.persist();
    await this.goToMap(false);
  }

  async goToMap(faded = true, message?: string): Promise<void> {
    const { gs, ui, save, audio, bg, three, mapMgr } = this.game;
    if (faded) await ui.fadeIn();
    three.clearGroup(three.stageGroup);
    three.clearGroup(three.bgGroup);
    this.game.stageState.clear(three.stageGroup);
    gs.mode = 'map';
    save.data.started = true;
    if (!save.nodeUnlocked(gs.selectedNodeId)) gs.selectedNodeId = WORLD_INDEX[gs.worldId]!.entry;
    bg.build(gs.worldId, 72); bg.setMapView();
    ui.showMapUI();
    audio.startMusic(('map' + WORLD_INDEX[gs.worldId]!.index) as import('../types/game.ts').MusicMode, WORLD_INDEX[gs.worldId]!.index);
    if (message) ui.toast(message, 1700);
    await ui.fadeOut();
    void mapMgr;
  }

  async enterStage(): Promise<void> {
    const { gs, ui, save, audio, three, mats, bg, player, stageState, builder, so } = this.game;
    const node = NODE_INDEX[gs.selectedNodeId];
    if (!node || !save.nodeUnlocked(node.id)) { ui.toast('Stage locked'); return; }

    audio.init();
    await ui.fadeIn();

    gs.mode = 'playing';
    ui.showStageUI();
    this.syncToSave(node.id);

    // Build stage
    three.clearGroup(three.stageGroup);
    three.clearGroup(three.bgGroup);
    stageState.clear(three.stageGroup);
    mats.updateForWorld(node.palette.grass, node.palette.ground);
    bg.build(node.world, 120);
    builder.build(node, stageState, so, gs);
    stageState.info = gs.currentStage;

    // Spawn player
    player.lastSpawn = { x: 2, y: 2 };
    gs.checkpoint    = null;
    gs.noDamage      = true;
    player.spawn(gs);
    player.createMesh(three.stageGroup);

    // Music
    this.startStageMusic();
    await ui.fadeOut();
  }

  private startStageMusic(): void {
    const { gs, audio } = this.game;
    const node = NODE_INDEX[gs.nodeId];
    const idx  = WORLD_INDEX[gs.worldId]!.index;
    if (node?.kind === 'fortress') audio.startMusic('fortress', idx);
    else audio.startMusic(('stage' + idx) as import('../types/game.ts').MusicMode, idx);
  }

  onPlayerHit(): void {
    const { gs, audio, ui } = this.game;
    if (gs.invT > 0 || gs.mode !== 'playing') return;
    if (gs.power > 0) { gs.power = 0; gs.invT = 2; gs.noDamage = false; audio.play('dmg'); gs.shakeT = 0.22; gs.shakeI = 3; return; }
    gs.noDamage = false;
    audio.play('die');
    gs.lives--;
    gs.mode = 'dead';
    this.game.player.vx = 0;
    this.game.player.vy = 12;
    this.game.player.state = 'dead';
    audio.stopMusic();
    setTimeout(() => {
      if (gs.lives < 0) { void this.gameOver(); return; }
      this.respawn();
    }, 1900);
    void ui;
  }

  private respawn(): void {
    const { gs, player } = this.game;
    gs.mode = 'playing';
    const sp = gs.checkpoint ?? player.lastSpawn;
    player.x = sp.x; player.y = sp.y;
    player.vx = 0; player.vy = 0;
    player.onGround = false; player.state = 'idle';
    gs.invT = 2; gs.power = 0; gs.starT = 0;
    this.startStageMusic();
  }

  async clearStage(exitType: ExitType): Promise<void> {
    const { gs, audio, ui, save } = this.game;
    if (gs.mode !== 'playing') return;
    gs.mode = 'clearing';
    audio.stopMusic();
    audio.play(exitType === 'secret' ? 'secret' : 'clear');

    const node   = NODE_INDEX[gs.nodeId]!;
    const result = this.applyStageResult(node, exitType);
    ui.showRank(result.rank);

    const worldDone = node.kind === 'fortress' && !!node.worldUnlock;
    const finalDone = node.final === true;

    let body = `RANK: ${result.rank}\nCOINS: ${gs.foundCoins}/${gs.totalCoins}\nTIME LEFT: ${Math.ceil(gs.time)}\n`;
    if (exitType === 'secret') body += '\nSECRET ROUTE DISCOVERED!';
    if (result.unlocked.length) {
      body += '\n\nUNLOCKED:';
      result.unlocked.forEach(id => { body += `\n- ${NODE_INDEX[id]?.name ?? id}`; });
      audio.play('unlock');
    }
    if (worldDone) { body += `\n\nNEW WORLD OPENED: ${WORLD_INDEX[node.worldUnlock!]!.name.toUpperCase()}`; audio.play('world'); }
    if (finalDone) { body += '\n\nTHE FINAL FORTRESS HAS FALLEN.'; audio.play('victory'); }

    ui.showCard(exitType === 'secret' ? 'SECRET EXIT!' : 'STAGE CLEAR!', node.name.toUpperCase(), body);

    if (finalDone) {
      save.data.gameCompleted = true; save.persist();
      setTimeout(() => { void this.showFinalVictory(); }, 2300);
      return;
    }

    const nextNode = exitType === 'secret' && node.secretTo
      ? node.secretTo
      : node.normalTo?.[0] ?? node.id;
    if (worldDone) {
      gs.worldId        = node.worldUnlock!;
      gs.selectedNodeId = WORLD_INDEX[node.worldUnlock!]!.entry;
      save.data.currentWorld = gs.worldId;
      save.data.currentNode  = gs.selectedNodeId;
      save.persist();
    } else if (save.nodeUnlocked(nextNode)) {
      gs.selectedNodeId = nextNode;
      save.data.currentNode  = nextNode;
      save.data.currentWorld = NODE_INDEX[nextNode]?.world ?? gs.worldId;
      save.persist();
    }

    setTimeout(() => {
      ui.hideCard();
      void this.goToMap(true, exitType === 'secret' ? 'Secret path appeared on the map' : 'Route updated on the map');
    }, 2200);
  }

  private async showFinalVictory(): Promise<void> {
    const { gs, ui, save, three, stageState } = this.game;
    await ui.fadeIn();
    three.clearGroup(three.stageGroup); three.clearGroup(three.bgGroup);
    stageState.clear(three.stageGroup);
    gs.mode = 'victory';
    ui.hideAllUI();

    const pct = save.totalCompletionPercent();
    const worldLines = WORLD_ORDER.map(id => {
      const c = save.worldCompletion(id);
      const stars = (c.completed === c.total ? 1 : 0) + (c.exitsFound === c.exitMax ? 1 : 0) + (c.highRanks === c.rankTotal ? 1 : 0);
      return `${WORLD_INDEX[id]!.name.toUpperCase()} - EMBLEMS ${stars}/3`;
    }).join('\n');

    ui.showCard(
      'FINAL VICTORY',
      'THE STAR TRAIL IS COMPLETE',
      `TOTAL COMPLETION: ${pct}%\nBEST SCORE: ${pad(Math.max(save.data.bestScore, gs.score), 6)}\n\n${worldLines}\n\nPRESS ENTER ON THE TITLE SCREEN TO PLAY AGAIN.`,
    );
    await this.showTitle();
    await ui.fadeOut();
  }

  async gameOver(): Promise<void> {
    const { gs, save } = this.game;
    save.data.bestScore = Math.max(save.data.bestScore, gs.score);
    save.persist();
    gs.mode = 'title';
    this.game.ui.toast('Game Over', 1600);
    await this.showTitle();
  }

  private syncToSave(nodeId: string): void {
    const { gs, save } = this.game;
    save.data.currentNode  = nodeId;
    save.data.currentWorld = NODE_INDEX[nodeId]?.world ?? gs.worldId;
    gs.nodeId        = nodeId;
    gs.worldId       = save.data.currentWorld;
    gs.selectedNodeId = nodeId;
    save.persist();
  }

  private applyStageResult(node: import('../types/game.ts').WorldNode, exitType: ExitType) {
    const { gs, save } = this.game;
    const rec  = save.stageRecord(node.id);
    rec.unlocked    = true; rec.completed = true;
    rec.normalExit  = rec.normalExit || exitType === 'normal' || exitType === 'secret';
    if (exitType === 'secret') rec.secretExit = true;

    const rank = this.computeRank(node, exitType);
    rec.rank       = rec.rank ? save.rankBetter(rank, rec.rank) : rank;
    rec.bestCoins  = Math.max(rec.bestCoins, gs.foundCoins);
    rec.maxCoins   = Math.max(rec.maxCoins,  gs.totalCoins);
    rec.bestTime   = Math.max(rec.bestTime,  Math.ceil(gs.time));
    rec.bestScore  = Math.max(rec.bestScore, gs.score);
    rec.lastExit   = exitType;

    const unlocked = this.unlockRoutesForExit(node, exitType);
    save.data.bestScore = Math.max(save.data.bestScore, gs.score);
    save.persist();
    return { rank, unlocked };
  }

  private computeRank(node: import('../types/game.ts').WorldNode, exitType: ExitType): RankType {
    const { gs } = this.game;
    const coinPct   = gs.totalCoins ? gs.foundCoins / gs.totalCoins : 1;
    const timePct   = gs.currentStage ? Math.max(0, gs.time / gs.currentStage.time) : 0;
    const safe      = gs.noDamage ? 1 : 0;
    const secretBonus = (exitType === 'secret' || !node.secretTo) ? 1 : 0;
    const score = coinPct * 0.34 + timePct * 0.22 + safe * 0.28 + secretBonus * 0.16;
    return score > 0.91 ? 'S' : score > 0.76 ? 'A' : score > 0.56 ? 'B' : 'C';
  }

  private unlockRoutesForExit(node: import('../types/game.ts').WorldNode, exitType: ExitType): string[] {
    const { save } = this.game;
    const unlocked: string[] = [];
    if (exitType === 'normal' || exitType === 'secret') {
      for (const id of node.normalTo ?? []) {
        const was = save.nodeUnlocked(id); save.unlockNode(id);
        if (!was) unlocked.push(id);
      }
    }
    if (exitType === 'secret' && node.secretTo) {
      const was = save.nodeUnlocked(node.secretTo); save.unlockNode(node.secretTo);
      if (!was) unlocked.push(node.secretTo);
    }
    if (node.worldUnlock && (exitType === 'normal' || exitType === 'secret')) {
      if (!save.data.unlockedWorlds.includes(node.worldUnlock)) {
        save.data.unlockedWorlds.push(node.worldUnlock);
        save.unlockNode(WORLD_INDEX[node.worldUnlock]!.entry);
        unlocked.push(WORLD_INDEX[node.worldUnlock]!.entry);
      }
    }
    save.persist();
    return unlocked;
    void RANK_ORDER;
  }
}

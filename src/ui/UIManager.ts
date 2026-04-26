import { pad } from '../utils/format.ts';
import { TRANSITION_MS, IS_TOUCH, WORLD_ORDER } from '../constants/game.ts';
import type { GameState } from '../core/GameState.ts';
import type { SaveManager } from '../core/SaveManager.ts';
import { WORLD_INDEX } from '../data/worlds.ts';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class UIManager {
  private readonly front    = el('front');
  private readonly menuBtns = el('menuButtons');
  private readonly progress = el('frontProgress');
  private readonly card     = el('card');
  private readonly cardTitle= el('cardTitle');
  private readonly cardSub  = el('cardSub');
  private readonly cardBody = el('cardBody');
  private readonly rankEl   = el('rank');
  private readonly toastEl  = el('toast');
  private readonly toastTxt = el('toastText');
  private readonly fadeEl   = el('fade');
  private readonly hudStage = el('hudStage');
  private readonly hudMap   = el('hudMap');
  private readonly mapCanvas= el('mapc');
  private readonly mcStage  = el('mcStage');
  private readonly mcMap    = el('mcMap');

  // Menu state
  selectedMenu = 0;

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private rankTimeout:  ReturnType<typeof setTimeout> | null = null;

  toast(msg: string, ms = 1500): void {
    this.toastTxt.textContent = msg;
    this.toastEl.classList.remove('hidden');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastEl.classList.add('hidden'), ms);
  }

  showCard(title: string, sub: string, body = ''): void {
    this.cardTitle.textContent = title;
    this.cardSub.textContent   = sub;
    this.cardBody.textContent  = body;
    this.card.classList.remove('hidden');
  }

  hideCard(): void { this.card.classList.add('hidden'); }

  showRank(r: string): void {
    this.rankEl.textContent = r;
    this.rankEl.classList.remove('hidden');
    if (this.rankTimeout) clearTimeout(this.rankTimeout);
    this.rankTimeout = setTimeout(() => this.rankEl.classList.add('hidden'), 1300);
  }

  fadeIn(): Promise<void> {
    return new Promise(res => {
      this.fadeEl.classList.add('on');
      setTimeout(res, TRANSITION_MS);
    });
  }

  fadeOut(): Promise<void> {
    return new Promise(res => {
      this.fadeEl.classList.remove('on');
      setTimeout(res, TRANSITION_MS);
    });
  }

  showTitle(): void {
    this.front.classList.remove('hidden');
    this.hudStage.classList.remove('show');
    this.hudMap.classList.remove('show');
    this.mapCanvas.classList.remove('show');
    this.mcStage.classList.remove('show');
    this.mcMap.classList.remove('show');
    this.hideCard();
  }

  showMapUI(): void {
    this.front.classList.add('hidden');
    this.hudStage.classList.remove('show');
    this.hudMap.classList.add('show');
    this.mapCanvas.classList.add('show');
    if (IS_TOUCH) this.mcMap.classList.add('show');
    this.mcStage.classList.remove('show');
    this.hideCard();
  }

  showStageUI(): void {
    this.front.classList.add('hidden');
    this.hudMap.classList.remove('show');
    this.mapCanvas.classList.remove('show');
    this.mcMap.classList.remove('show');
    this.hudStage.classList.add('show');
    if (IS_TOUCH) this.mcStage.classList.add('show');
  }

  hideStageUI(): void {
    this.hudStage.classList.remove('show');
    this.mcStage.classList.remove('show');
  }

  hideAllUI(): void {
    this.hudStage.classList.remove('show');
    this.hudMap.classList.remove('show');
    this.mapCanvas.classList.remove('show');
    this.mcMap.classList.remove('show');
    this.mcStage.classList.remove('show');
  }

  rebuildTitleMenu(
    gs: GameState,
    save: SaveManager,
    onContinue: () => void,
    onNewGame:  () => void,
    onErase:    () => void,
  ): void {
    const items = this.getMenuItems(save, onContinue, onNewGame, onErase);
    this.selectedMenu = Math.min(this.selectedMenu, items.length - 1);
    this.menuBtns.innerHTML = '';
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = [
        'menuBtn',
        i === this.selectedMenu ? 'sel' : '',
        it.label.includes('Erase') ? 'warn' : it.label.includes('New') ? 'alt' : '',
      ].filter(Boolean).join(' ');
      b.textContent = it.label;
      b.onclick = it.fn;
      this.menuBtns.appendChild(b);
    });

    const pct    = save.totalCompletionPercent();
    const wName  = WORLD_INDEX[save.data.currentWorld ?? 'w1']?.name ?? 'Sunseed Plains';
    const wCount = save.data.unlockedWorlds.length;
    const exitsFound = Object.values(save.data.stages).reduce((a, s) =>
      a + (s.normalExit ? 1 : 0) + (s.secretExit ? 1 : 0), 0);
    const exitMax = Object.values(WORLD_INDEX).flatMap(w => w.nodes).reduce((a, n) => a + 1 + (n.secretTo ? 1 : 0), 0);
    this.progress.innerHTML = [
      `Completion: ${pct}%`,
      `World reached: ${wName}`,
      `Worlds unlocked: ${wCount}/${WORLD_ORDER.length}`,
      `Exits found: ${exitsFound}/${exitMax}`,
      `Best score: ${pad(save.data.bestScore, 6)}`,
    ].join('<br>');
    void gs;
  }

  navigateMenu(dir: -1 | 1, save: SaveManager): void {
    const len = this.getMenuItems(save, ()=>{}, ()=>{}, ()=>{}).length;
    this.selectedMenu = (this.selectedMenu + dir + len) % len;
  }

  activateMenu(save: SaveManager, onContinue: () => void, onNewGame: () => void, onErase: () => void): void {
    const items = this.getMenuItems(save, onContinue, onNewGame, onErase);
    items[this.selectedMenu]?.fn();
  }

  private getMenuItems(
    save: SaveManager,
    onContinue: () => void,
    onNewGame:  () => void,
    onErase:    () => void,
  ): { label: string; fn: () => void }[] {
    const started = save.data.started || save.totalCompletionPercent() > 0 ||
      Object.values(save.data.stages).some(s => s.completed);
    const items: { label: string; fn: () => void }[] = [];
    if (started) {
      items.push({ label: 'Continue',    fn: onContinue });
      items.push({ label: 'New Game',    fn: onNewGame });
      items.push({ label: 'Erase Save',  fn: onErase });
    } else {
      items.push({ label: 'Start Journey', fn: onNewGame });
    }
    return items;
  }
}

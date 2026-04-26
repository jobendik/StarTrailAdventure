export type StageAction = 'left' | 'right' | 'jump' | 'run' | 'fire';
export type MapAction   = 'left' | 'right' | 'up' | 'down' | 'select' | 'world';

export class InputManager {
  private keys: Record<string, boolean> = {};
  readonly tap: { stage: Record<string, boolean>; map: Record<string, boolean> } = {
    stage: { left:false, right:false, jump:false, run:false, fire:false },
    map:   { left:false, right:false, up:false, down:false, select:false, world:false },
  };

  private keyHandlers: ((code: string) => void)[] = [];

  init(): void {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      this.keyHandlers.forEach(h => h(e.code));
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    this.bindMobileButtons();
  }

  onKeyPress(handler: (code: string) => void): void {
    this.keyHandlers.push(handler);
  }

  action(name: StageAction): boolean {
    switch (name) {
      case 'left':  return !!(this.keys['ArrowLeft']  || this.keys['KeyA'] || this.tap.stage['left']);
      case 'right': return !!(this.keys['ArrowRight'] || this.keys['KeyD'] || this.tap.stage['right']);
      case 'jump':  return !!(this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.tap.stage['jump']);
      case 'run':   return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyZ'] || this.tap.stage['run']);
      case 'fire':  return !!(this.keys['KeyX'] || this.keys['ControlLeft'] || this.tap.stage['fire']);
    }
  }

  mapAction(name: MapAction): boolean {
    switch (name) {
      case 'left':   return !!(this.keys['ArrowLeft']  || this.keys['KeyA'] || this.tap.map['left']);
      case 'right':  return !!(this.keys['ArrowRight'] || this.keys['KeyD'] || this.tap.map['right']);
      case 'up':     return !!(this.keys['ArrowUp']    || this.keys['KeyW'] || this.tap.map['up']);
      case 'down':   return !!(this.keys['ArrowDown']  || this.keys['KeyS'] || this.tap.map['down']);
      case 'select': return !!(this.keys['Enter'] || this.keys['Space'] || this.tap.map['select']);
      case 'world':  return !!(this.keys['Tab']  || this.keys['KeyQ'] || this.keys['KeyE'] || this.tap.map['world']);
    }
  }

  clearKey(code: string): void { this.keys[code] = false; }

  private bindHold(el: HTMLElement, obj: Record<string, boolean>, key: string, pulse = false): void {
    const on = (e: Event) => {
      e.preventDefault();
      if (pulse) { obj[key] = true; setTimeout(() => { obj[key] = false; }, 90); }
      else obj[key] = true;
    };
    const off = (e: Event) => { e.preventDefault(); obj[key] = false; };
    ['touchstart', 'mousedown'].forEach(ev => el.addEventListener(ev, on, { passive: false }));
    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => el.addEventListener(ev, off, { passive: false }));
  }

  private bindMobileButtons(): void {
    document.querySelectorAll<HTMLElement>('[data-stage]').forEach(btn => {
      const key = btn.dataset['stage']!;
      this.bindHold(btn, this.tap.stage, key);
    });
    document.querySelectorAll<HTMLElement>('[data-map]').forEach(btn => {
      const key = btn.dataset['map']!;
      const pulse = key === 'world' || key === 'select';
      this.bindHold(btn, this.tap.map, key, pulse);
    });
  }
}

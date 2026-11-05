// Left thumb: virtual joystick. Right side: drag to look. Buttons: interact + jump.
export class TouchControls {
  constructor(root, onInteract) {
    this.el = document.createElement('div');
    this.el.className = 'touch';
    this.el.innerHTML = `
      <div class="touch-stick" aria-hidden="true"><div class="touch-knob"></div></div>
      <div class="touch-look" aria-hidden="true"></div>
      <button class="touch-btn touch-jump" aria-label="Jump">Jump</button>
      <button class="touch-btn touch-use" aria-label="Interact" hidden>Use</button>`;
    root.appendChild(this.el);
    const stick = this.el.querySelector('.touch-stick'), knob = this.el.querySelector('.touch-knob');
    const lookZone = this.el.querySelector('.touch-look');
    this.useBtn = this.el.querySelector('.touch-use');
    let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0, jumpQueued = false;
    const look = { x: 0, y: 0 };
    this.state = {
      move: { x: 0, y: 0 },
      consumeLook: () => { const v = { x: look.x, y: look.y }; look.x = look.y = 0; return v; },
      consumeJump: () => { const j = jumpQueued; jumpQueued = false; return j; },
    };
    const R = 52;
    stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; stickId = t.identifier; const b = stick.getBoundingClientRect(); sx = b.left + b.width / 2; sy = b.top + b.height / 2; e.preventDefault(); }, { passive: false });
    lookZone.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
    addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.state.move.x = dx / R; this.state.move.y = -dy / R;
        } else if (t.identifier === lookId) {
          look.x += t.clientX - lx; look.y += t.clientY - ly; lx = t.clientX; ly = t.clientY;
        }
      }
    }, { passive: true });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.state.move.x = this.state.move.y = 0; knob.style.transform = ''; }
        if (t.identifier === lookId) lookId = null;
      }
    };
    addEventListener('touchend', end); addEventListener('touchcancel', end);
    this.el.querySelector('.touch-jump').addEventListener('touchstart', (e) => { jumpQueued = true; e.preventDefault(); }, { passive: false });
    this.useBtn.addEventListener('click', () => onInteract());
  }
  setVisible(v) { this.el.classList.toggle('on', v); }
  setUse(label) { this.useBtn.hidden = !label; if (label) this.useBtn.textContent = label; }
}

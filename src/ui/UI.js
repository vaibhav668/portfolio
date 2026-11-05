import { renderSection, searchPortfolio, SECTIONS } from '../portfolio/PortfolioUI.js';
import { STATIONS } from '../world/layout.js';
import { profile } from '../portfolio/portfolioData.js';
import { sound } from '../audio/Sound.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export class UI {
  constructor(root, on, { touch }) {
    this.root = root;
    this.on = on;
    this.touch = touch;
    this.build();
  }

  build() {
    const r = this.root;
    // ---------- loading ----------
    this.loadingEl = r.appendChild(h(`
      <div class="loading" role="status" aria-live="polite">
        <svg class="loader-rings" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" class="lr lr1"/><circle cx="60" cy="60" r="42" class="lr lr2"/><circle cx="60" cy="60" r="32" class="lr lr3"/>
          <circle cx="60" cy="60" r="6" class="lr-core"/>
        </svg>
        <p class="loading-title">Initializing Vaibhav’s world</p>
        <p class="loading-step">Preparing terrain</p>
        <div class="loading-bar"><i></i></div>
      </div>`));

    // ---------- intro ----------
    this.introEl = r.appendChild(h(`
      <div class="intro" hidden>
        <div class="intro-card">
          <h1 class="intro-name"><span>Vaibhav</span><span>Pokhriyal</span></h1>
          <p class="intro-tag">Developer. Builder. Explorer.</p>
          <p class="intro-roles">${profile.title} · ${profile.focus.join(' · ')}</p>
          <div class="intro-actions">
            <button class="btn btn-solid btn-lg" data-act="start">Start exploration</button>
            <button class="btn btn-ghost" data-act="browse">Browse without playing</button>
          </div>
          <p class="intro-hint">${this.touch ? 'Left thumb moves, right side looks around.' : 'W A S D to move, mouse to look, E to interact.'}</p>
        </div>
        <button class="btn btn-ghost intro-skip" data-act="skip">Skip intro</button>
      </div>`));
    this.introEl.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'start') this.on.startExploration();
      if (a === 'browse') this.on.browse();
      if (a === 'skip') this.on.skipIntro();
    });

    // ---------- HUD ----------
    this.hudEl = r.appendChild(h(`
      <div class="hud" hidden>
        <div class="hud-id">
          <img class="hud-mark" src="assets/vaibhav.jpg" alt="" aria-hidden="true">
          <div>
            <p class="hud-name">Vaibhav’s island</p>
            <p class="hud-obj"></p>
            <ol class="hud-steps" aria-label="Journey progress">${STATIONS.map((s) => `<li title="${s.name}"></li>`).join('')}</ol>
          </div>
        </div>
        <nav class="hud-nav">
          <button class="btn btn-hud btn-sound" data-act="sound" title="Sound on/off (N)" aria-pressed="true"><span class="snd-on" aria-hidden="true">🔊</span><span class="snd-off" aria-hidden="true">🔇</span><span class="sr-only">Sound</span></button>
          <button class="btn btn-hud" data-act="map" title="Island map (M)">Map</button>
          <button class="btn btn-hud" data-act="sections" aria-expanded="false">Sections</button>
          <div class="menu" hidden>
            ${SECTIONS.map((s) => `<button data-sec="${s.id}">${s.label}</button>`).join('')}
            <hr>
            <button data-act="restart">Restart journey</button>
            <a href="classic/index.html">Classic portfolio</a>
          </div>
        </nav>
        <div class="crosshair" aria-hidden="true"></div>
        <div class="prompt" hidden><kbd>E</kbd><span></span></div>
        <div class="keys" ${this.touch ? 'hidden' : ''}><kbd>WASD</kbd> move <kbd>Shift</kbd> sprint <kbd>Space</kbd> jump <kbd>E</kbd> interact <kbd>M</kbd> map <kbd>N</kbd> sound <kbd>Esc</kbd> free cursor</div>
        <div class="toast" hidden><p class="toast-t"></p><p class="toast-s"></p></div>
      </div>`));
    this.promptEl = $('.prompt', this.hudEl);
    sound.onChange((muted) => { const b = $('.btn-sound', this.hudEl); b.setAttribute('aria-pressed', String(!muted)); b.classList.toggle('muted', muted); });
    this.menuEl = $('.menu', this.hudEl);
    this.hudEl.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act, sec = e.target.closest('[data-sec]')?.dataset.sec;
      if (act === 'sound') sound.toggle();
      if (act === 'map') this.on.toggleMap();
      if (act === 'sections') this.toggleMenu();
      if (act === 'restart') { this.toggleMenu(false); this.on.restart(); }
      if (sec) { this.toggleMenu(false); this.on.openSection(sec); }
    });

    // ---------- speech bubble ----------
    this.bubbleEl = r.appendChild(h(`<div class="bubble" hidden><p></p></div>`));

    // ---------- dialogue ----------
    this.dialogueEl = r.appendChild(h(`
      <div class="dialogue" hidden role="dialog" aria-label="Conversation with Vaibhav">
        <p class="dlg-name"><img src="assets/vaibhav.jpg" alt="">Vaibhav</p>
        <p class="dlg-text"></p>
        <div class="dlg-options"></div>
      </div>`));

    // ---------- panel ----------
    this.panelEl = r.appendChild(h(`
      <aside class="panel" hidden role="dialog" aria-modal="false">
        <header class="panel-head">
          <div><p class="panel-kicker"></p><h2 class="panel-title"></h2></div>
          <button class="panel-close" aria-label="Close panel">Close <kbd>Esc</kbd></button>
        </header>
        <div class="panel-body"></div>
      </aside>`));
    this.panelEl.addEventListener('click', (e) => {
      if (e.target.closest('.panel-close')) return this.on.closeOverlay();
      const proj = e.target.closest('[data-project]');
      if (proj) return this.openPanel('projects', proj.dataset.project);
      const open = e.target.closest('[data-open]');
      if (open) return this.on.openSection(open.dataset.open);
    });

    // ---------- VISOR ----------
    const nodes = SECTIONS.filter((s) => s.id !== 'visor').concat([{ id: 'github', label: 'GitHub' }]);
    this.visorEl = r.appendChild(h(`
      <div class="visor" hidden role="dialog" aria-label="VISOR portfolio interface">
        <div class="visor-ring">
          <svg viewBox="0 0 400 400" class="visor-svg" aria-hidden="true">
            <circle cx="200" cy="200" r="190" class="v-r1"/><circle cx="200" cy="200" r="150" class="v-r2"/>
            <circle cx="200" cy="200" r="104" class="v-r3"/><circle cx="200" cy="200" r="58" class="v-core"/>
          </svg>
          <div class="visor-center"><p class="v-title">VISOR</p><p class="v-sub">Portfolio interface online</p></div>
          ${nodes.map((n, i) => {
            const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            return `<button class="v-node" style="--x:${Math.cos(a).toFixed(3)};--y:${Math.sin(a).toFixed(3)}" data-node="${n.id}">${n.label}</button>`;
          }).join('')}
        </div>
        <div class="visor-search">
          <label for="vq">Search my work</label>
          <input id="vq" type="search" placeholder="Try PyTorch, robotics, RAG, IIT Delhi" autocomplete="off">
          <ul class="v-results"></ul>
          <p class="v-note">Answers come from local portfolio data. No AI service is connected.</p>
        </div>
        <button class="btn btn-ghost visor-close">Close <kbd>Esc</kbd></button>
      </div>`));
    const vq = $('#vq', this.visorEl), vres = $('.v-results', this.visorEl);
    vq.addEventListener('input', () => {
      const res = searchPortfolio(vq.value);
      vres.innerHTML = vq.value.trim().length < 2 ? '' : res.length
        ? res.map((x) => `<li><button data-sec="${x.section}" data-item="${x.item || ''}"><span>${x.label}</span><small>${x.sub}</small></button></li>`).join('')
        : `<li class="empty">Nothing matches “${vq.value.replace(/</g, '')}”. Try a tool name like OpenCV.</li>`;
    });
    this.visorEl.addEventListener('click', (e) => {
      if (e.target.closest('.visor-close')) return this.on.closeOverlay();
      const n = e.target.closest('[data-node]')?.dataset.node;
      if (n === 'github') return window.open('https://github.com/vaibhav668', '_blank', 'noopener');
      if (n) return this.on.openSection(n);
      const s = e.target.closest('[data-sec]');
      if (s) this.on.openSection(s.dataset.sec, s.dataset.item || undefined);
    });

    // ---------- map ----------
    this.mapEl = r.appendChild(h(`
      <div class="map" hidden>
        <div class="map-markers">${STATIONS.map((s, i) => `
          <button class="marker" data-i="${i}"><span class="m-n">${i + 1}</span><span class="m-l">${s.short}</span></button>`).join('')}
        </div>
        <div class="map-card" hidden>
          <p class="mc-n"></p><h3 class="mc-t"></h3>
          <div class="actions"><button class="btn btn-solid" data-mc="open">Open section</button><button class="btn btn-ghost" data-mc="walk">Walk here</button></div>
        </div>
        <div class="map-bar">
          <p>Island overview. Pick a stop to read it or walk there.</p>
          <button class="btn btn-ghost" data-mc="close">Back <kbd>M</kbd></button>
        </div>
      </div>`));
    this.markers = [...this.mapEl.querySelectorAll('.marker')];
    this.mapEl.addEventListener('click', (e) => {
      const m = e.target.closest('.marker');
      if (m) return this.selectMarker(+m.dataset.i);
      const act = e.target.closest('[data-mc]')?.dataset.mc;
      if (act === 'close') this.on.toggleMap();
      if (act === 'open') this.on.openSection(STATIONS[this.mapSel].section);
      if (act === 'walk') this.on.walkTo(this.mapSel);
    });

    // ---------- pause ----------
    this.pauseEl = r.appendChild(h(`
      <div class="pause" hidden>
        <p class="pause-t">Paused</p>
        <button class="btn btn-solid btn-lg" data-p="resume">Continue exploring</button>
        <div class="pause-row"><button class="btn btn-ghost" data-p="map">Island map</button><button class="btn btn-ghost" data-p="visor">Open VISOR</button></div>
      </div>`));
    this.pauseEl.addEventListener('click', (e) => {
      const p = e.target.closest('[data-p]')?.dataset.p;
      if (p === 'resume') this.on.resume();
      if (p === 'map') this.on.toggleMap();
      if (p === 'visor') this.on.openSection('visor');
    });
  }

  // ---------- loading & intro ----------
  setLoading(p, step) {
    $('.loading-bar i', this.loadingEl).style.width = `${Math.round(p * 100)}%`;
    if (step) $('.loading-step', this.loadingEl).textContent = step;
  }
  hideLoading() { this.loadingEl.classList.add('out'); setTimeout(() => this.loadingEl.remove(), 900); }
  showIntro() { this.introEl.hidden = false; }
  revealTitle() { this.introEl.classList.add('reveal'); $('.intro-skip', this.introEl).hidden = true; }
  hideIntro() { this.introEl.classList.add('out'); setTimeout(() => (this.introEl.hidden = true), 600); }

  // ---------- HUD ----------
  showHUD(v) { this.hudEl.hidden = !v; if (v) setTimeout(() => $('.keys', this.hudEl)?.classList.add('fade'), 12000); }
  setObjective(text, visited) {
    $('.hud-obj', this.hudEl).textContent = text;
    [...this.hudEl.querySelectorAll('.hud-steps li')].forEach((li, i) => li.classList.toggle('done', visited.has(i)));
  }
  toggleMenu(force) {
    const open = force ?? this.menuEl.hidden;
    this.menuEl.hidden = !open;
    $('[data-act="sections"]', this.hudEl).setAttribute('aria-expanded', String(open));
    if (open) this.on.menuOpened?.();
  }
  get menuOpen() { return !this.menuEl.hidden; }
  setPrompt(item) {
    this.promptEl.hidden = !item;
    if (item) {
      $('span', this.promptEl).textContent = `${this.touch ? 'Tap Use to' : 'Press E to'} ${item.prompt}`;
      $('kbd', this.promptEl).hidden = this.touch;
    }
  }
  toast(title, sub = '', ms = 3600) {
    const t = $('.toast', this.hudEl);
    $('.toast-t', t).textContent = title; $('.toast-s', t).textContent = sub;
    sound.chime();
    t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => (t.hidden = true), ms);
  }

  // ---------- bubble ----------
  setBubble(text, x, y) {
    if (!text) { this.bubbleEl.hidden = true; return; }
    if ($('p', this.bubbleEl).textContent !== text) $('p', this.bubbleEl).textContent = text;
    this.bubbleEl.hidden = false;
    this.bubbleEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  // ---------- dialogue ----------
  openDialogue(pages, options) {
    this.dialogueEl.hidden = false;
    let i = 0;
    const text = $('.dlg-text', this.dialogueEl), opts = $('.dlg-options', this.dialogueEl);
    const show = () => {
      clearInterval(this._type);
      const full = pages[i]; let n = 0; text.textContent = '';
      this._type = setInterval(() => { n += 2; text.textContent = full.slice(0, n); if (n % 6 === 0 && full[n] !== ' ') sound.blip(); if (n >= full.length) clearInterval(this._type); }, 16);
      const last = i === pages.length - 1;
      opts.innerHTML = last
        ? options.map((o, k) => `<button class="btn ${k ? 'btn-ghost' : 'btn-solid'}" data-k="${k}">${o.label}</button>`).join('')
        : `<button class="btn btn-solid" data-next>Next</button><button class="btn btn-ghost" data-skip>Skip</button>`;
      opts.querySelector('button')?.focus({ preventScroll: true });
    };
    opts.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-next')) { i++; show(); }
      else if (b.hasAttribute('data-skip')) { i = pages.length - 1; show(); }
      else options[+b.dataset.k].action();
    };
    show();
  }
  advanceDialogue() { $('.dlg-options button', this.dialogueEl)?.click(); }
  closeDialogue() { clearInterval(this._type); this.dialogueEl.hidden = true; }
  get dialogueOpen() { return !this.dialogueEl.hidden; }

  // ---------- panel ----------
  openPanel(section, item) {
    const { title, kicker, html } = renderSection(section, item);
    $('.panel-title', this.panelEl).textContent = title;
    $('.panel-kicker', this.panelEl).textContent = kicker;
    const body = $('.panel-body', this.panelEl);
    body.innerHTML = html;
    body.scrollTop = 0;
    this.panelEl.dataset.section = section;
    this.panelEl.hidden = false;
    this.panelEl.classList.remove('in'); void this.panelEl.offsetWidth; this.panelEl.classList.add('in');
    if (item) $(`#ach-${item}`, body)?.scrollIntoView({ block: 'start' });
    $('.panel-close', this.panelEl).focus({ preventScroll: true });
  }
  closePanel() { this.panelEl.hidden = true; }
  get panelOpen() { return !this.panelEl.hidden; }

  // ---------- VISOR ----------
  openVisor() { this.visorEl.hidden = false; this.visorEl.classList.remove('in'); void this.visorEl.offsetWidth; this.visorEl.classList.add('in'); if (!this.touch) $('#vq', this.visorEl).focus({ preventScroll: true }); }
  closeVisor() { this.visorEl.hidden = true; }
  get visorOpen() { return !this.visorEl.hidden; }

  // ---------- map ----------
  openMap() { this.mapEl.hidden = false; this.selectMarker(null); }
  closeMap() { this.mapEl.hidden = true; }
  get mapOpen() { return !this.mapEl.hidden; }
  selectMarker(i) {
    this.mapSel = i;
    const card = $('.map-card', this.mapEl);
    this.markers.forEach((m, k) => m.setAttribute('aria-pressed', String(k === i)));
    if (i === null) { card.hidden = true; return; }
    card.hidden = false;
    $('.mc-n', card).textContent = `Stop ${i + 1} of ${STATIONS.length}`;
    $('.mc-t', card).textContent = STATIONS[i].name;
  }
  placeMarkers(project) {
    this.markers.forEach((m, i) => {
      const p = project(STATIONS[i]);
      m.style.display = p.visible ? '' : 'none';
      m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    });
  }

  // ---------- pause ----------
  showPause(v) { this.pauseEl.hidden = !v; }
}

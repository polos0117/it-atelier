// 단계별 SVG 애니메이션 엔진.
// 주제(topic)는 setup(a)로 무대를 꾸리고, steps[i].run(a)로 한 단계를 움직인다.
// 앞 단계로 돌아가거나 건너뛸 때는 무대를 다시 만들고 앞 단계들을 "즉시 모드"로 빠르게 재생해
// 같은 상태를 만든 다음, 목표 단계만 애니메이션으로 보여 준다.

const NS = 'http://www.w3.org/2000/svg';
export const W = 720, H = 440;
export const COLORS = ['blue', 'green', 'red', 'amber', 'violet', 'teal', 'pink', 'gray'];

class Cancel extends Error {}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Player {
  constructor(svg, { onStep, onState, onCaption } = {}) {
    this.svg = svg;
    this.onStep = onStep || (() => {});
    this.onState = onState || (() => {});
    this.onCaption = onCaption || (() => {});
    this.speed = 1;
    this.paused = false;
    this.auto = false;
    this.clock = 0;
    this.tweens = new Set();
    this.token = 0;
    this.topic = null;
    this.step = -1;
    this.running = false;
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.token++;
    this.tweens.clear();
    clearTimeout(this.autoTimer);
  }

  loop(now) {
    const dt = Math.min(64, now - this.last);
    this.last = now;
    if (!this.paused) {
      this.clock += dt * this.speed;
      for (const tw of [...this.tweens]) {
        if (tw.start == null) tw.start = this.clock;
        const k = Math.min(1, (this.clock - tw.start) / tw.dur);
        try { tw.fn(tw.linear ? k : ease(k)); } catch (err) { console.error('[tween]', err); }
        if (k >= 1) { this.tweens.delete(tw); tw.resolve(); }
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------- 주제 불러오기 ---------- */
  load(topic) {
    this.topic = topic;
    this.auto = false;
    this.paused = false;
    this.started = false;
    this.goto(0, { animate: false });
  }

  /** 무대를 지우고 setup + 앞 단계(0..n-1)를 즉시 재생한 뒤 n단계를 보여 준다. */
  async goto(n, { animate = true } = {}) {
    const steps = this.topic.steps;
    n = Math.max(0, Math.min(steps.length - 1, n));
    const my = ++this.token;
    this.ready = false;
    clearTimeout(this.autoTimer);
    this.tweens.clear();
    this.build();
    const a = this.api(my, true);
    try {
      this.topic.setup(a);
      for (let i = 0; i < n; i++) await steps[i].run(a);
    } catch (err) {
      if (!(err instanceof Cancel)) console.error('[fast-forward]', err);
      if (my !== this.token) return;
    }
    if (my !== this.token) return;
    this.step = n;
    this.onStep(n);
    this.onCaption('');
    if (!animate) {
      this.ready = true;
      this.setRunning(false);
      if (this.auto && !this.started) { this.started = true; this.playStep(my); }
      return;
    }
    this.started = true;
    await this.playStep(my);
  }

  async playStep(my) {
    this.setRunning(true);
    this.ready = false;
    const a = this.api(my, false);
    try {
      await this.topic.steps[this.step].run(a);
    } catch (err) {
      if (!(err instanceof Cancel)) console.error('[step]', err);
      return;
    }
    if (my !== this.token) return;
    this.ready = true;
    this.setRunning(false);
    if (this.auto) {
      if (this.step < this.topic.steps.length - 1) {
        this.autoTimer = setTimeout(() => { if (this.auto && my === this.token) this.goto(this.step + 1); }, 1400 / this.speed);
      } else {
        this.auto = false;
        this.onState();
      }
    }
  }

  setRunning(v) { this.running = v; this.onState(); }

  next() {
    if (!this.started) {
      if (this.ready) { this.started = true; this.playStep(this.token); } else this.goto(0);
      return;
    }
    if (this.step < this.topic.steps.length - 1) this.goto(this.step + 1);
    else this.goto(0);
  }
  prev() { this.goto(this.step - 1); }

  /** 실험 모드: 단계 없이 계속 돌아가는 무대. 반환한 도구(a)로 lab.setup이 흐름을 띄운다. */
  lab() {
    const my = ++this.token;
    clearTimeout(this.autoTimer);
    this.tweens.clear();
    this.auto = false;
    this.paused = false;
    this.step = -1;
    this.build();
    return this.api(my, false);
  }
  replay() { this.goto(this.step); }

  /** 첫 화면(아직 0단계 애니메이션 전)에서 재생을 누르면 0단계를 바로 움직인다. */
  play() {
    this.auto = true;
    this.paused = false;
    if (this.ready && !this.running) {
      if (!this.started) { this.started = true; this.playStep(this.token); }
      else if (this.step < this.topic.steps.length - 1) this.goto(this.step + 1);
      else this.goto(0);
    }
    this.onState();
  }
  pause() { this.auto = false; clearTimeout(this.autoTimer); this.onState(); }
  togglePause() { this.paused = !this.paused; this.onState(); }

  /* ---------- 무대 ---------- */
  build() {
    const s = this.svg;
    s.replaceChildren();
    const defs = el('defs');
    defs.innerHTML = `
      <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" class="ah"/></marker>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" class="dot"/></pattern>`;
    s.append(defs);
    s.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#dots)' }));
    this.layers = {};
    for (const k of ['zone', 'edge', 'node', 'pkt', 'top']) {
      const g = el('g', { class: 'L-' + k });
      s.append(g);
      this.layers[k] = g;
    }
    this.nodes = new Map();
    this.ids = new Map();
  }

  /** 주제 코드가 쓰는 도구 모음. fast=true면 시간이 걸리는 동작이 즉시 끝난다. */
  api(my, fast) {
    const P = this;
    const check = () => { if (my !== P.token) throw new Cancel(); };
    const L = this.layers;

    const tween = (dur, fn, o = {}) => {
      check();
      if (fast || dur <= 0) { fn(1); return Promise.resolve(); }
      return new Promise((resolve, reject) => {
        const tw = { dur, fn, linear: o.linear, start: null, resolve: () => (my === P.token ? resolve() : reject(new Cancel())) };
        P.tweens.add(tw);
      });
    };
    const wait = (ms) => tween(ms, () => {});

    const reg = (id, obj) => { if (id) P.ids.set(id, obj); return obj; };
    const get = (x) => (typeof x === 'string' ? P.ids.get(x) || P.nodes.get(x) : x);
    const pt = (x) => {
      if (Array.isArray(x)) return { x: x[0], y: x[1] };
      const o = get(x);
      if (!o) throw new Error('없는 대상: ' + x);
      return { x: o.x, y: o.y };
    };

    /* ----- 노드(상자) ----- */
    function node(id, x, y, o = {}) {
      const w = o.w || 112, h = o.h || 58, color = o.color || 'gray';
      const g = el('g', { class: `node c-${color} sh-${o.shape || 'rect'}`, transform: `translate(${x} ${y})` });
      let body;
      if (o.shape === 'circle') {
        body = el('circle', { r: w / 2, class: 'body' });
      } else if (o.shape === 'db') {
        const ry = 9;
        body = el('path', { class: 'body', d: `M${-w / 2} ${-h / 2 + ry} a${w / 2} ${ry} 0 0 1 ${w} 0 v${h - 2 * ry} a${w / 2} ${ry} 0 0 1 ${-w} 0 z` });
        g.append(body, el('path', { class: 'rim', d: `M${-w / 2} ${-h / 2 + ry} a${w / 2} ${ry} 0 0 0 ${w} 0` }));
      } else if (o.shape === 'person') {
        body = el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, class: 'body' });
      } else {
        body = el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: o.r ?? 12, class: 'body' });
      }
      if (!g.contains(body)) g.prepend(body);
      const icon = o.icon ? text(0, 0, o.icon, { size: 18, cls: 'icon', par: g }) : null;
      const lab = text(0, 0, o.label ?? '', { size: o.size || 15, weight: 700, par: g, cls: 'lab' });
      const sub = text(0, 0, o.sub ?? '', { size: 11.5, par: g, cls: 'sub' });
      const n = { id, x, y, w, h, g, body, lab, sub, icon, color, shape: o.shape, badgeEl: null };
      n.layout = () => {
        const hasSub = !!sub.textContent, hasIcon = !!icon;
        const lines = (hasIcon ? 1 : 0) + 1 + (hasSub ? 1 : 0);
        let yy = -((lines - 1) * 17) / 2;
        if (hasIcon) { icon.setAttribute('y', yy - 1); yy += 18; }
        lab.setAttribute('y', yy); yy += 17;
        sub.setAttribute('y', yy);
      };
      n.layout();
      L[o.layer || 'node'].append(g);
      P.nodes.set(id, n);
      if (o.hidden) g.style.opacity = 0;
      return n;
    }
    function setNode(id, o = {}) {
      const n = get(id);
      if (o.label != null) n.lab.textContent = o.label;
      if (o.sub != null) n.sub.textContent = o.sub;
      if (o.icon != null && n.icon) n.icon.textContent = o.icon;
      if (o.color) { n.g.classList.replace('c-' + n.color, 'c-' + o.color); n.color = o.color; }
      n.layout();
    }
    function moveNode(id, x, y, dur = 600) {
      const n = get(id), x0 = n.x, y0 = n.y;
      return tween(dur, (t) => {
        n.x = x0 + (x - x0) * t; n.y = y0 + (y - y0) * t;
        n.g.setAttribute('transform', `translate(${n.x} ${n.y})`);
        for (const e of P.ids.values()) if (e.isEdge && (e.a === n || e.b === n)) e.update();
      });
    }

    /* ----- 글자 ----- */
    function text(x, y, s, o = {}) {
      const t = el('text', { x, y, class: 'tx ' + (o.cls || '') + (o.color ? ' tc-' + o.color : ''), 'font-size': o.size || 14, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'central' });
      if (o.weight) t.setAttribute('font-weight', o.weight);
      if (o.mono) t.classList.add('mono');
      t.textContent = s;
      (o.par || L[o.layer || 'top']).append(t);
      if (o.hidden) t.style.opacity = 0;
      return reg(o.id, t);
    }

    /* ----- 선(연결) ----- */
    function border(n, tx, ty) {
      // 노드 중심에서 (tx,ty) 쪽으로 나가는 선이 테두리와 만나는 점
      const dx = tx - n.x, dy = ty - n.y;
      if (!dx && !dy) return { x: n.x, y: n.y };
      if (n.shape === 'circle') { const d = Math.hypot(dx, dy); return { x: n.x + (dx / d) * (n.w / 2 + 2), y: n.y + (dy / d) * (n.w / 2 + 2) }; }
      const sx = (n.w / 2 + 3) / Math.abs(dx || 1e-9), sy = (n.h / 2 + 3) / Math.abs(dy || 1e-9);
      const s = Math.min(sx, sy);
      return { x: n.x + dx * s, y: n.y + dy * s };
    }
    function edge(a, b, o = {}) {
      const A = get(a) || null, B = get(b) || null;
      const path = el('path', { class: 'edge' + (o.dashed ? ' dashed' : '') + (o.color ? ' ec-' + o.color : ''), 'marker-end': o.arrow === false ? null : 'url(#ah)' });
      if (o.both) path.setAttribute('marker-start', 'url(#ah)');
      L.edge.append(path);
      const lab = o.label ? text(0, 0, o.label, { size: 11.5, cls: 'elab', layer: 'edge' }) : null;
      const e = {
        isEdge: true, a: A, b: B, path, lab,
        update() {
          const pa = A && A.w ? A : pt(a), pb = B && B.w ? B : pt(b);
          const p1 = A && A.w ? border(A, pb.x, pb.y) : pa;
          const p2 = B && B.w ? border(B, pa.x, pa.y) : pb;
          const bend = o.bend || 0;
          const mx = (p1.x + p2.x) / 2 - (p2.y - p1.y) * bend, my = (p1.y + p2.y) / 2 + (p2.x - p1.x) * bend;
          path.setAttribute('d', bend ? `M${p1.x} ${p1.y} Q${mx} ${my} ${p2.x} ${p2.y}` : `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`);
          if (lab) { lab.setAttribute('x', mx + (o.lx || 0)); lab.setAttribute('y', my + (o.ly ?? -10)); }
        },
      };
      e.update();
      if (o.hidden) { path.style.opacity = 0; if (lab) lab.style.opacity = 0; }
      return reg(o.id, e);
    }

    /* ----- 영역(점선 상자) ----- */
    function zone(id, x, y, w, h, o = {}) {
      const g = el('g', { class: 'zone' + (o.color ? ' zc-' + o.color : '') });
      g.append(el('rect', { x, y, width: w, height: h, rx: 14 }));
      if (o.label) text(x + 12, y + 14, o.label, { size: 11.5, anchor: 'start', cls: 'zlab', par: g, weight: 700 });
      L.zone.append(g);
      if (o.hidden) g.style.opacity = 0;
      return reg(id, { g, x: x + w / 2, y: y + h / 2 });
    }

    /* ----- 움직이는 패킷 ----- */
    function packet(label, o = {}) {
      const at = pt(o.at || [W / 2, H / 2]);
      const g = el('g', { class: `pkt c-${o.color || 'blue'}`, transform: `translate(${at.x} ${at.y})` });
      const s = String(label ?? '');
      const w = o.w || Math.max(30, s.length * (/[가-힣]/.test(s) ? 13 : 8) + 18);
      const h = o.h || 26;
      g.append(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: o.round ?? h / 2, class: 'body' }));
      const t = el('text', { class: 'tx', 'font-size': o.size || 12.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 700 });
      t.textContent = s;
      g.append(t);
      L[o.layer || 'pkt'].append(g);
      const p = { g, x: at.x, y: at.y, t, w, h, color: o.color || 'blue' };
      p.set = (lbl, c) => {
        if (lbl != null) {
          t.textContent = lbl;
          const need = String(lbl).length ? Math.max(30, String(lbl).length * (/[가-힣]/.test(lbl) ? 13 : 8) + 18) : 0;
          if (need > p.w) { p.w = need; const r = g.querySelector('rect'); r.setAttribute('width', need); r.setAttribute('x', -need / 2); r.setAttribute('rx', h / 2); }
        }
        if (c) { g.classList.replace('c-' + p.color, 'c-' + c); p.color = c; }
      };
      if (o.hidden) g.style.opacity = 0;
      return reg(o.id, p);
    }
    /** 대상(packet/node)을 지점(들)로 옮긴다. to: 노드 id | [x,y] | 경로 배열 */
    function move(p, to, dur = 900, o = {}) {
      p = get(p);
      const pts = (Array.isArray(to) && Array.isArray(to[0]) || (Array.isArray(to) && typeof to[0] === 'string')) ? to.map(pt) : [pt(to)];
      if (o.dy) pts.forEach((q) => (q.y += o.dy));
      if (o.dx) pts.forEach((q) => (q.x += o.dx));
      const all = [{ x: p.x, y: p.y }, ...pts];
      const seg = [];
      let len = 0;
      for (let i = 1; i < all.length; i++) { const l = Math.hypot(all[i].x - all[i - 1].x, all[i].y - all[i - 1].y); seg.push(l); len += l; }
      return tween(dur, (t) => {
        let d = t * len, k = 0;
        while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
        const A = all[k], B = all[k + 1] || A, f = seg[k] ? d / seg[k] : 1;
        p.x = A.x + (B.x - A.x) * f; p.y = A.y + (B.y - A.y) * f;
        p.g.setAttribute('transform', `translate(${p.x} ${p.y})`);
      }, { linear: all.length > 2 });
    }
    /** from 노드에서 to 노드로 패킷을 보낸다. keep=false면 도착 후 사라진다. */
    async function send(from, to, label, o = {}) {
      const p = packet(label, { color: o.color, at: o.fromAt || from, w: o.w, h: o.h });
      if (o.dy) { p.y += o.dy; p.g.setAttribute('transform', `translate(${p.x} ${p.y})`); }
      await move(p, o.via ? [...o.via, to] : to, o.dur || 900, { dy: o.dy });
      if (o.keep) return p;
      await fadeOut(p, 220);
      return p;
    }

    /* ----- 보이기/숨기기/강조 ----- */
    const elOf = (x) => { const o = get(x); return o && (o.g || o.path || o); };
    function setOpacity(x, v) {
      const o = get(x);
      const els = o && o.isEdge ? [o.path, o.lab].filter(Boolean) : [elOf(x)];
      els.forEach((e) => (e.style.opacity = v));
    }
    function fade(x, to = 1, dur = 400) {
      const o = get(x);
      const e0 = o && o.isEdge ? o.path : elOf(x);
      const from = parseFloat(e0.style.opacity === '' ? 1 : e0.style.opacity);
      return tween(dur, (t) => setOpacity(x, from + (to - from) * t));
    }
    const show = (x, dur = 400) => fade(x, 1, dur);
    const hide = (x, dur = 300) => fade(x, 0, dur);
    async function fadeOut(x, dur = 300) { await fade(x, 0, dur); remove(x); }
    function remove(x) {
      const o = get(x);
      if (!o) return;
      if (o.isEdge) { o.path.remove(); o.lab?.remove(); } else (o.g || o).remove();
      for (const [k, v] of P.ids) if (v === o) P.ids.delete(k);
      for (const [k, v] of P.nodes) if (v === o) P.nodes.delete(k);
    }
    function hl(id, on = true, color) {
      const n = get(id);
      const g = n.g || n.path;
      g.classList.toggle('hl', on);
      if (color) { g.dataset.hl = color; } else delete g.dataset.hl;
    }
    async function flash(id, times = 1) {
      const n = get(id);
      for (let i = 0; i < times; i++) {
        await tween(420, (t) => { const s = 1 + Math.sin(t * Math.PI) * 0.09; n.g.setAttribute('transform', `translate(${n.x} ${n.y}) scale(${s})`); });
      }
    }
    function badge(id, s, color = 'amber') {
      const n = get(id);
      if (n.badgeEl) n.badgeEl.remove();
      n.badgeEl = null;
      if (s == null || s === '') return;
      const g = el('g', { class: `badge c-${color}`, transform: `translate(${n.w / 2 - 6} ${-n.h / 2 - 2})` });
      const w = Math.max(22, String(s).length * (/[가-힣]/.test(s) ? 12 : 7.4) + 12);
      g.append(el('rect', { x: -w / 2, y: -11, width: w, height: 22, rx: 11, class: 'body' }));
      const t = el('text', { class: 'tx', 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = s;
      g.append(t);
      n.g.append(g);
      n.badgeEl = g;
    }
    /** 무대 위 말풍선 메모 */
    function note(id, x, y, s, o = {}) {
      const g = el('g', { class: `note c-${o.color || 'amber'}`, transform: `translate(${x} ${y})` });
      const lines = String(s).split('\n');
      const w = o.w || Math.max(...lines.map((l) => l.length * (/[가-힣]/.test(l) ? 13 : 7.6))) + 22;
      const h = lines.length * 18 + 14;
      g.append(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 9, class: 'body' }));
      lines.forEach((l, i) => {
        const t = el('text', { class: 'tx', 'font-size': o.size || 12.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', y: -h / 2 + 16 + i * 18, 'font-weight': o.weight || 600 });
        t.textContent = l;
        g.append(t);
      });
      L.top.append(g);
      if (!fast) { g.style.opacity = 0; }
      const n = reg(id, { g, x, y });
      if (!fast) tween(250, (t) => (g.style.opacity = t)).catch(() => {});
      return n;
    }
    /** 막대(게이지) — 값 0~1 */
    function bar(id, x, y, w, o = {}) {
      const g = el('g', { class: `bar c-${o.color || 'green'}`, transform: `translate(${x} ${y})` });
      g.append(el('rect', { x: 0, y: -6, width: w, height: 12, rx: 6, class: 'track' }));
      const f = el('rect', { x: 0, y: -6, width: 0, height: 12, rx: 6, class: 'fill' });
      g.append(f);
      L.top.append(g);
      const b = reg(id, { g, x, y, w, v: 0, f });
      b.set = (v, dur = 400) => { const v0 = b.v; return tween(dur, (t) => { b.v = v0 + (v - v0) * t; f.setAttribute('width', Math.max(0, Math.min(1, b.v)) * w); }); };
      if (o.value) { b.v = o.value; f.setAttribute('width', o.value * w); }
      return b;
    }
    /** 레이어를 비운다(단계마다 새로 그리는 주제용). 기본: 패킷·메모 */
    function clear(...names) {
      for (const k of names.length ? names : ['pkt', 'top']) L[k].replaceChildren();
      for (const [k, v] of P.ids) { const e = v.g || v.path || v; if (e.isConnected === false) P.ids.delete(k); }
      for (const [k, v] of P.nodes) if (!v.g.isConnected) P.nodes.delete(k);
    }
    const caption = (s) => { if (!fast) P.onCaption(s); };
    /** 기다리지 않는 흐름을 띄운다(실험 모드). 무대가 바뀌어 취소되면 조용히 끝난다. */
    const spawn = (fn) => {
      Promise.resolve().then(fn).catch((err) => { if (!(err instanceof Cancel)) console.error('[lab]', err); });
    };
    /** ms(숫자 또는 함수)마다 fn 실행 — 배속·일시정지를 따른다 */
    const every = (ms, fn) => spawn(async () => {
      for (;;) { await wait(Math.max(16, typeof ms === 'function' ? ms() : ms)); check(); spawn(fn); }
    });
    const now = () => P.clock;
    /** 원시 SVG 요소 (특수한 그림용) */
    const raw = (tag, attrs, layer = 'node') => { const e = el(tag, attrs); (typeof layer === 'string' ? L[layer] : layer).append(e); return e; };

    return {
      W, H, fast, tween, wait, node, setNode, moveNode, text, edge, zone, packet, move, send,
      show, hide, fade, fadeOut, remove, clear, hl, flash, badge, note, bar, caption, raw, get, pt,
      spawn, every, now,
      par: (...ps) => Promise.all(ps),
      setText: (id, s) => { const t = get(id); t.textContent = s; },
    };
  }
}

export function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
}

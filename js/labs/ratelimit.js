// 레이트 리미터 실험실: 요청 속도·버킷 크기·충전 속도·알고리즘을 바꾸며 429가 언제 생기는지 본다
const SLOT = Array.from({ length: 10 }, (_, i) => [310 + (i % 5) * 25, i < 5 ? 314 : 288]); // 버킷 안 토큰 자리
const GATE = [268, 150]; // 리미터 앞에서 판정하는 지점(노드 가장자리 바깥)
const CLI_OUT = [142, 150], LIM_OUT = [444, 150], SRV_IN = [570, 150];
const TL = { x0: 40, x1: 680, y: 404, span: 10000 }; // 아래 타임라인: 최근 10초
const MAXEV = 140;
const winMs = (s) => (s.cap / s.refill) * 1000; // 고정 윈도 칸 길이 = 같은 평균 속도가 되도록 한도 ÷ 충전 속도
const need = (s) => Math.max(s.cap + 2, Math.ceil(s.cap * 1.5)); // 경계 버스트 과제 기준
/** 초당 r번 fn 실행 — 화면 프레임이 느려도 평균 속도가 맞도록 밀린 만큼 한꺼번에 실행 */
const pace = (a, rate, fn) => {
  let due = a.now();
  a.every(40, () => {
    const r = rate(), now = a.now();
    if (r <= 0 || now - due > 1500) { due = now; if (r <= 0) return; }
    while (due <= now) { due += 1000 / r; fn(); }
  });
};
const sec = (ms) => (Math.round(ms / 100) / 10).toFixed(1);

export default {
  id: 'ratelimit',
  title: '레이트 리미터 실험실',
  intro: '클라이언트가 계속 요청을 보내고, 리미터가 토큰이 있을 때만 서버로 통과시켜요. 요청 속도·버킷 크기·충전 속도를 바꾸고 버스트를 보내 보세요. 고정 윈도에서는 초당 요청을 0으로 두고 칸이 바뀌기 직전과 직후에 버스트를 한 번씩 눌러 보세요.',
  controls: [
    { type: 'radio', key: 'algo', label: '알고리즘', options: [['tb', '토큰 버킷'], ['fw', '고정 윈도']] },
    { type: 'range', key: 'rate', label: '초당 요청', min: 0, max: 10, step: 1, unit: '개' },
    { type: 'range', key: 'cap', label: '버킷 크기(한도)', min: 1, max: 10, step: 1, unit: '개' },
    { type: 'range', key: 'refill', label: '충전 속도', min: 0.5, max: 5, step: 0.5, unit: '개/초' },
    { type: 'button', label: '버스트 10개', run: (s) => s.burst() },
  ],
  init: () => ({ algo: 'tb', rate: 3, cap: 5, refill: 2,
    tokens: 5, win: { idx: -1, W: 0, n: 0 }, fly: 0,
    ok: 0, no: 0, okSince: 0, noSince: 0, peakSince: 0,
    passT: [], srvT: [], ev: [], lastBurst: null }),
  onChange(key, s) {
    s.okSince = 0; s.noSince = 0; s.peakSince = 0; s.passT = [];
    if (key === 'cap') s.tokens = Math.min(s.tokens, s.cap);
    s.paint?.();
  },
  setup(a, s) {
    s.tokens = s.cap;

    a.node('cli', 82, 150, { shape: 'person', label: '클라이언트', icon: '🙂', color: 'blue', w: 112, h: 56 });
    a.node('lim', 360, 150, { label: '레이트 리미터', sub: '', icon: '🚦', color: 'teal', w: 160, h: 72 });
    a.node('srv', 636, 150, { label: 'API 서버', sub: '', icon: '🖥️', color: 'green', w: 124, h: 64 });
    a.edge('cli', 'lim');
    a.edge('lim', 'srv');
    a.text(636, 205, '서버 부하', { size: 11.5, cls: 'muted', layer: 'edge' });
    const load = a.bar('load', 580, 222, 112, { color: 'green' });
    // 버킷
    a.raw('path', { d: 'M288 236 L288 318 Q288 334 304 334 L416 334 Q432 334 432 318 L432 236', style: 'fill: color-mix(in srgb, var(--teal) 8%, transparent); stroke: var(--teal); stroke-width: 3; stroke-linecap: round' }, 'zone');
    a.edge('lim', [360, 234], { dashed: true, arrow: false });
    const slots = SLOT.map((p, i) => a.packet('', { id: 'sl' + i, at: p, w: 20, h: 20, color: 'amber' }));
    a.text(360, 352, '', { id: 'cnt', size: 13, weight: 700, layer: 'edge' });
    a.node('fac', 160, 290, { label: '토큰 공장', sub: '', icon: '🏭', color: 'amber', w: 124, h: 66 });
    a.edge('fac', [282, 262], { dashed: true, color: 'amber' });
    // 타임라인
    a.text(TL.x0, 376, '최근 10초 · 위: 통과 · 아래: 429', { size: 11.5, anchor: 'start', cls: 'muted', layer: 'edge' });
    a.text(TL.x1, 376, '지금 →', { size: 11.5, anchor: 'end', cls: 'muted', layer: 'edge' });
    a.raw('line', { x1: TL.x0, y1: TL.y, x2: TL.x1, y2: TL.y, class: 'edge' }, 'edge');
    const tg = a.raw('g', {}, 'edge');
    const bounds = Array.from({ length: 12 }, () => { const l = a.raw('line', { y1: 386, y2: 424, style: 'stroke: var(--amber); stroke-width: 1.5; stroke-dasharray: 3 3', opacity: 0 }, tg); return l; });
    const ticks = Array.from({ length: MAXEV }, () => a.raw('rect', { width: 3, rx: 1.5, opacity: 0 }, tg));

    /* ----- 규칙 ----- */
    const win = () => { // 고정 윈도: 칸이 바뀌면 카운터 리셋
      const W = winMs(s), idx = Math.floor(a.now() / W);
      if (idx !== s.win.idx || W !== s.win.W) { const roll = s.win.idx >= 0 && s.algo === 'fw'; s.win = { idx, W, n: 0 }; if (roll) a.spawn(() => a.flash('lim')); }
      return s.win;
    };
    const take = () => {
      if (s.algo === 'fw') { const w = win(); if (w.n < s.cap) { w.n++; return true; } return false; }
      if (s.tokens > 0) { s.tokens--; return true; }
      return false;
    };
    const loadNow = () => { const t = a.now() - 1000; return s.srvT.filter((x) => x > t).length; };

    s.paint = () => {
      const fw = s.algo === 'fw';
      const W = winMs(s), w = win();
      const have = fw ? s.cap - w.n : s.tokens;
      slots.forEach((p, i) => {
        p.g.style.opacity = i >= s.cap ? 0 : i < have ? 1 : 0.28;
        p.set(null, i < have ? (fw ? 'teal' : 'amber') : 'gray');
      });
      a.setNode('lim', { sub: fw ? `고정 윈도 · ${sec(W)}초에 ${s.cap}개` : `토큰 버킷 · 최대 ${s.cap}개` });
      a.setNode('fac', fw ? { label: '칸 타이머', icon: '⏱️', sub: `${sec(W)}초마다 한도 리셋` } : { label: '토큰 공장', icon: '🏭', sub: `+${s.refill}개 / 초` });
      a.setText('cnt', fw ? `이번 칸 ${w.n}/${s.cap} 사용 · 다음 칸까지 ${sec(W - (a.now() % W))}초` : `토큰 ${s.tokens} / ${s.cap}`);
      const l = loadNow();
      s.load = l;
      a.setNode('srv', { sub: `받는 요청 ${l}개/초`, color: l >= 7 ? 'red' : l >= 4 ? 'amber' : 'green' });
      load.set(Math.min(1, l / 10), 0);
      // 타임라인
      const now = a.now(), px = (t) => TL.x1 - ((now - t) / TL.span) * (TL.x1 - TL.x0);
      ticks.forEach((r, i) => {
        const e = s.ev[i];
        if (!e || now - e.t > TL.span) { r.setAttribute('opacity', 0); return; }
        r.setAttribute('x', px(e.t) - 1.5);
        r.setAttribute('y', e.ok ? TL.y - 18 : TL.y + 4);
        r.setAttribute('height', e.ok ? 16 : 12);
        r.setAttribute('style', `fill: var(--${e.ok ? 'green' : 'red'})`);
        r.setAttribute('opacity', 1);
      });
      const first = Math.ceil((now - TL.span) / W);
      bounds.forEach((ln, i) => {
        const t = (first + i) * W;
        const vis = fw && t <= now && W >= 900;
        ln.setAttribute('opacity', vis ? 0.9 : 0);
        if (vis) { ln.setAttribute('x1', px(t)); ln.setAttribute('x2', px(t)); }
      });
    };
    s.paint();

    const record = (ok, b) => {
      const t = a.now();
      s.ev.push({ t, ok }); if (s.ev.length > MAXEV) s.ev.shift();
      if (b) { b.n++; ok ? b.ok++ : b.no++; }
      if (ok) {
        s.ok++; s.okSince++;
        s.passT.push({ t, b: !!b }); if (s.passT.length > 60) s.passT.shift();
        if (s.algo === 'fw') { // 칸 길이만큼의 구간 안에 통과한 수(버스트가 섞인 구간만 센다)
          const from = t - winMs(s), span = s.passT.filter((x) => x.t > from);
          if (span.some((x) => x.b)) s.peakSince = Math.max(s.peakSince, span.length);
        }
      } else { s.no++; s.noSince++; }
    };

    s.fire = async (b) => {
      if (s.fly >= 70) { if (b) b.n++; return; }
      s.fly++;
      try {
        const p = a.packet('', { at: CLI_OUT, color: b ? 'violet' : 'blue', w: 16, h: 16 });
        await a.move(p, GATE, 440);
        const ok = take();
        record(ok, b);
        s.paint();
        if (ok) {
          p.set(null, 'green');
          await a.move(p, LIM_OUT, 0); // 리미터 안을 건너뛰어 글자를 가리지 않게
          await a.move(p, SRV_IN, 420);
          a.remove(p);
          s.srvT.push(a.now()); if (s.srvT.length > 80) s.srvT.shift();
          s.paint();
        } else {
          a.hl('lim', true, 'red');
          p.set('429', 'red');
          await a.move(p, [140, 116], 520);
          a.hl('lim', false);
          await a.fadeOut(p, 200);
        }
      } finally { s.fly--; }
    };
    s.burst = () => {
      const b = { algo: s.algo, cap: s.cap, full: s.algo === 'tb' && s.tokens >= s.cap, n: 0, ok: 0, no: 0 };
      s.lastBurst = b;
      for (let i = 0; i < 10; i++) a.spawn(() => a.wait(i * 70).then(() => s.fire(b)));
    };

    // 토큰 충전 — 토큰 버킷일 때만
    pace(a, () => (s.algo === 'tb' ? s.refill : 0), () => a.spawn(async () => {
      if (s.algo !== 'tb') return;
      const p = a.packet('', { at: [224, 282], w: 16, h: 16, color: 'amber' });
      await a.move(p, [300, 262], 380);
      if (s.algo === 'tb' && s.tokens < s.cap) { s.tokens++; a.remove(p); s.paint(); return; }
      p.set(null, 'gray'); // 가득 차서 넘침
      await a.par(a.move(p, [268, 232], 300), a.fadeOut(p, 300));
    }));
    // 계속 들어오는 요청
    pace(a, () => s.rate, () => a.spawn(() => s.fire(null)));
    // 화면 갱신(칸 타이머·타임라인·부하)
    a.every(100, () => s.paint());
  },
  stats: (s) => {
    const fw = s.algo === 'fw';
    const rows = [
      ['통과', s.ok, 'green'],
      ['429 거절', s.no, s.no ? 'red' : ''],
      fw ? ['이번 칸 남은 한도', `${Math.max(0, s.cap - s.win.n)} / ${s.cap}`, ''] : ['남은 토큰', `${s.tokens} / ${s.cap}`, s.tokens ? 'amber' : 'red'],
      ['서버 부하', `${s.load || 0}개/초`, s.load >= 7 ? 'red' : ''],
    ];
    if (fw) rows.push(['칸 길이 안 최대 통과', `${s.peakSince}개 (한도 ${s.cap})`, s.peakSince > s.cap ? 'red' : '']);
    return rows;
  },
  tasks: [
    { t: "요청을 줄여 버킷을 가득 채운 뒤 '버스트 10개' — 버킷 크기 정도만 통과하고 나머지는 429가 되나요?", check: (s) => { const b = s.lastBurst; return !!b && b.algo === 'tb' && b.full && b.n >= 10 && b.no >= 1; } },
    { t: '초당 요청을 충전 속도 이하로 맞춰, 429 없이 20개 통과시키기', check: (s) => s.algo === 'tb' && s.rate >= 1 && s.rate <= s.refill && s.okSince >= 20 && s.noSince === 0 },
    { t: "버킷 크기를 1로 줄이고 '버스트 10개' — 버스트가 거의 다 막히나요?", check: (s) => { const b = s.lastBurst; return !!b && b.algo === 'tb' && b.cap === 1 && b.n >= 10 && b.no >= 7; } },
    { t: '고정 윈도에서 칸 경계 직전·직후에 버스트를 보내, 한 칸 길이 안에 한도의 1.5배 이상 통과시키기', check: (s) => s.algo === 'fw' && s.cap >= 3 && s.peakSince >= need(s) },
  ],
};

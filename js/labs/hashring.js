// 일관된 해싱 실험실: % N 방식과 해시 링에서 서버를 넣고 빼며 옮겨 가는 키를 직접 세어 본다
// 해시값은 0~999로 고정해 둔 값(실제로는 해시 함수 결과). 키 40개, 서버 최대 6대.
const KEYS = [618, 133, 347, 51, 518, 134, 175, 665, 456, 255, 851, 532, 636, 369, 810, 724, 337, 171, 641, 877,
  116, 787, 165, 90, 556, 470, 469, 632, 176, 916, 339, 364, 538, 276, 769, 115, 974, 215, 252, 631];
const K = KEYS.length;
const IDS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COL = { A: 'blue', B: 'green', C: 'amber', D: 'violet', E: 'teal', F: 'pink' };
const BASE = { A: 120, B: 420, C: 610, D: 870, E: 260, F: 520 }; // 서버 한 대 = 링 위 한 점
const VN = { // 가상 노드: 서버마다 링 위 6점
  A: [917, 209, 27, 375, 478, 133], B: [940, 100, 672, 699, 318, 959], C: [714, 205, 582, 359, 592, 568],
  D: [874, 544, 930, 495, 10, 982], E: [450, 606, 968, 274, 900, 803], F: [219, 681, 373, 761, 562, 38],
};
const MAXN = 6, MINN = 2;

// 링 기하
const CX = 236, CY = 246, R = 150;
const ang = (h) => (h / 1000) * Math.PI * 2;
const ring = (h, r = R) => [CX + r * Math.sin(ang(h)), CY - r * Math.cos(ang(h))];
const keyR = (i) => R - 24 - (i % 2) * 12; // 키 점은 링 안쪽 두 줄에 번갈아

// % N 칸 배치
const colX = (i) => 66 + i * 117.6;
const slotXY = (i, j) => [colX(i) + ((j % 5) - 2) * 20, 342 - Math.floor(j / 5) * 20];

const points = (N, vn) => IDS.slice(0, N).flatMap((id) => (vn ? VN[id].map((h) => ({ id, h })) : [{ id, h: BASE[id] }])).sort((p, q) => p.h - q.h);
const ringOwner = (h, pts) => (pts.find((x) => x.h >= h) || pts[0]);
const owners = (mode, N, vn) => {
  if (mode === 'mod') return KEYS.map((h) => IDS[h % N]);
  const pts = points(N, vn);
  return KEYS.map((h) => ringOwner(h, pts).id);
};
const countBy = (own, N) => IDS.slice(0, N).map((id) => own.filter((o) => o === id).length);
const pct = (x, n) => Math.round((x / n) * 100);

export default {
  id: 'hashring',
  title: '일관된 해싱 실험실',
  intro: '키 40개가 서버에 나뉘어 있어요. 서버를 넣거나 빼면서 몇 개의 키가 다른 서버로 이사하는지 세어 보세요. % N 방식과 해시 링을 바꿔 가며 비교하고, 해시 링에서는 가상 노드로 몫을 고르게 만들어 보세요.',
  controls: [
    { type: 'radio', key: 'mode', label: '방식', options: [['mod', '나머지 % N'], ['ring', '해시 링']] },
    { type: 'button', label: '서버 추가', run: (s) => s.add() },
    { type: 'button', label: '서버 제거', run: (s) => s.removeOne() },
    { type: 'toggle', key: 'vn', label: '가상 노드 (서버당 6개)' },
    { type: 'toggle', key: 'look', label: '조회 요청 보기' },
  ],
  init: () => ({ mode: 'mod', vn: false, look: true, N: 3, own: [], last: null, movedSum: 0, adds: 0, gen: 0, busyUntil: 0 }),
  onChange(key, s) {
    if (key === 'mode') { s.movedSum = 0; s.adds = 0; s.last = null; s.rebuild(); }
    if (key === 'vn') { s.movedSum = 0; s.adds = 0; s.vnChanged(); }
  },
  setup(a, s) {
    const keyEls = []; // { p, tok }
    let lookIdx = 0, lookBusy = false;
    s.own = owners(s.mode, s.N, s.vn);
    s.slot = []; // % N 칸 번호

    const say = (t) => a.caption(t);
    const setColor = (txt, c) => txt.setAttribute('class', txt.getAttribute('class').replace(/tc-\w+/, 'tc-' + c));

    /* ---------- % N 무대 ---------- */
    const assignSlots = (moved) => {
      const used = IDS.map(() => new Set());
      KEYS.forEach((_, k) => { if (!moved.has(k) && s.slot[k] != null) used[IDS.indexOf(s.own[k])].add(s.slot[k]); });
      KEYS.forEach((_, k) => {
        if (!moved.has(k) && s.slot[k] != null) return;
        const c = IDS.indexOf(s.own[k]);
        let j = 0;
        while (used[c].has(j)) j++;
        used[c].add(j);
        s.slot[k] = j;
      });
    };
    const buildMod = () => {
      a.text(24, 40, '', { id: 'title', size: 18, weight: 800, anchor: 'start', layer: 'edge' });
      a.text(360, 160, '', { id: 'moved', size: 22, weight: 800, layer: 'edge', color: 'gray', mono: true });
      a.text(360, 190, '', { id: 'alt', size: 12.5, layer: 'edge', cls: 'muted' });
      a.text(24, 68, '', { id: 'look', size: 12.5, anchor: 'start', layer: 'edge', cls: 'muted', mono: true });
      IDS.forEach((id, i) => {
        a.node('m' + id, colX(i), 396, { label: `서버 ${id}`, sub: '', color: COL[id], w: 106, h: 50, hidden: i >= s.N });
      });
      s.slot = [];
      assignSlots(new Set());
      KEYS.forEach((h, k) => {
        const [x, y] = slotXY(IDS.indexOf(s.own[k]), s.slot[k]);
        keyEls[k] = { p: a.packet('', { at: [x, y], w: 16, h: 16, round: 4, color: COL[s.own[k]] }), tok: 0 };
      });
    };
    const paintMod = () => {
      a.setText('title', `hash(key) % ${s.N} = 서버 번호`);
      const c = countBy(s.own, s.N);
      IDS.forEach((id, i) => {
        if (i < s.N) a.setNode('m' + id, { sub: `${i}번 · 키 ${c[i]}개` });
      });
    };

    /* ---------- 해시 링 무대 ---------- */
    let arcsG, srvG;
    const arcPath = (h1, h2, r = R) => {
      let d = h2 - h1;
      if (d <= 0) d += 1000;
      const [x1, y1] = ring(h1, r), [x2, y2] = ring(h1 + d, r);
      return `M${x1} ${y1} A${r} ${r} 0 ${d > 500 ? 1 : 0} 1 ${x2} ${y2}`;
    };
    const buildRing = () => {
      a.text(24, 40, '해시 링 — 시계 방향으로 처음 만나는 서버가 담당', { id: 'title', size: 17, weight: 800, anchor: 'start', layer: 'edge' });
      a.text(24, 64, '', { id: 'look', size: 12.5, anchor: 'start', layer: 'edge', cls: 'muted', mono: true });
      a.raw('circle', { cx: CX, cy: CY, r: R, fill: 'none', style: 'stroke: var(--line2); stroke-width: 12; opacity: .55' }, 'zone');
      arcsG = a.raw('g', {}, 'zone');
      a.text(CX, CY - 10, '0 ~ 999', { size: 13, weight: 800, layer: 'edge', mono: true });
      a.text(CX, CY + 12, '시계 방향 ↻', { size: 11.5, cls: 'muted', layer: 'edge' });
      a.text(CX, CY - R + 22, '0', { size: 10.5, cls: 'muted', layer: 'edge', mono: true });
      srvG = a.raw('g', {}, 'node');
      KEYS.forEach((h, k) => {
        const [x, y] = ring(h, keyR(k));
        keyEls[k] = { p: a.packet('', { at: [x, y], w: 10, h: 10, color: COL[s.own[k]] }), tok: 0 };
      });
      // 오른쪽: 서버별 키 개수
      a.text(592, 96, '서버별 키 개수', { size: 13, weight: 800, layer: 'top' });
      IDS.forEach((id, i) => {
        const y = 128 + i * 34;
        a.text(488, y, id, { id: 'rl' + id, size: 14, weight: 800, color: COL[id], layer: 'top' });
        a.bar('rb' + id, 504, y, 120, { color: COL[id] });
        a.text(700, y, '', { id: 'rv' + id, size: 12, weight: 700, anchor: 'end', layer: 'top', mono: true });
      });
      a.text(592, 352, '', { id: 'moved', size: 15, weight: 800, layer: 'top', color: 'gray', mono: true });
      a.text(592, 376, '', { id: 'alt', size: 11.5, layer: 'top', cls: 'muted' });
    };
    const paintRing = () => {
      const pts = points(s.N, s.vn);
      arcsG.replaceChildren();
      pts.forEach((p, i) => {
        const prev = pts[(i - 1 + pts.length) % pts.length];
        a.raw('path', { d: arcPath(prev.h, p.h), fill: 'none', style: `stroke: var(--${COL[p.id]}); stroke-width: 12; opacity: .42` }, arcsG);
      });
      srvG.replaceChildren();
      const r = s.vn ? 9 : 20;
      for (const p of pts) {
        const [x, y] = ring(p.h);
        const g = a.raw('g', { transform: `translate(${x} ${y})` }, srvG);
        a.raw('circle', { r, style: `fill: color-mix(in srgb, var(--${COL[p.id]}) 30%, var(--stage)); stroke: var(--${COL[p.id]}); stroke-width: 2` }, g);
        a.text(0, 0.5, p.id, { size: s.vn ? 10 : 15, weight: 800, par: g });
      }
      const c = countBy(s.own, s.N);
      IDS.forEach((id, i) => {
        const on = i < s.N;
        a.get('rl' + id).style.opacity = on ? 1 : 0.25;
        a.get('rb' + id).g.style.opacity = on ? 1 : 0.25;
        a.get('rb' + id).set(on ? c[i] / 24 : 0, 400).catch(() => {});
        a.setText('rv' + id, on ? `${c[i]}개 · ${pct(c[i], K)}%` : '');
      });
    };

    /* ---------- 공통 ---------- */
    const paintMoved = () => {
      const L = s.last;
      if (!L) { a.setText('moved', '서버를 넣거나 빼 보세요'); a.setText('alt', ''); setColor(a.get('moved'), 'gray'); return; }
      const p = pct(L.moved, L.total);
      a.setText('moved', `방금 이동: ${L.moved} / ${L.total} (${p}%)`);
      setColor(a.get('moved'), p > 50 ? 'red' : p <= 30 ? 'green' : 'amber');
      a.setText('alt', L.alt == null ? '' : `같은 변화를 ${s.mode === 'ring' ? '% N 방식' : '해시 링'}으로 하면 ${L.alt}개`);
    };
    const paint = () => { if (s.mode === 'ring') paintRing(); else paintMod(); paintMoved(); };

    s.rebuild = () => {
      s.gen++;
      a.clear('zone', 'edge', 'node', 'pkt', 'top');
      s.own = owners(s.mode, s.N, s.vn);
      lookBusy = false;
      if (s.mode === 'ring') buildRing(); else buildMod();
      paint();
    };

    // 키를 새 담당 서버로 옮기는 모습
    const flyMod = async (k, delay) => {
      const e = keyEls[k], tok = ++e.tok, gen = s.gen;
      const [x, y] = slotXY(IDS.indexOf(s.own[k]), s.slot[k]);
      const color = COL[s.own[k]];
      e.p.set(null, 'red');
      await a.wait(delay);
      if (e.tok !== tok || gen !== s.gen) return;
      const x0 = e.p.x, y0 = e.p.y;
      await a.tween(700, (t) => {
        if (e.tok !== tok) return;
        e.p.x = x0 + (x - x0) * t; e.p.y = y0 + (y - y0) * t - Math.sin(Math.PI * t) * 46;
        e.p.g.setAttribute('transform', `translate(${e.p.x} ${e.p.y})`);
      });
      if (e.tok === tok) e.p.set(null, color);
    };
    // 해시 링: 키 자리에서 새 담당 서버 바로 앞까지 링을 따라 걷는 점
    const walk = async (h, toH, color, dur, stopShort) => {
      let d = toH - h;
      if (d < 0) d += 1000;
      d = Math.max(0, d - stopShort);
      const [x, y] = ring(h);
      const p = a.packet('', { at: [x, y], w: 14, h: 14, color });
      await a.tween(dur, (t) => {
        const [px, py] = ring(h + d * t);
        p.x = px; p.y = py;
        p.g.setAttribute('transform', `translate(${px} ${py})`);
      });
      await a.fadeOut(p, 160);
    };
    const flyRing = async (k, delay) => {
      const e = keyEls[k], tok = ++e.tok, gen = s.gen;
      const id = s.own[k], color = COL[id];
      e.p.set(null, 'red');
      await a.wait(delay);
      if (e.tok !== tok || gen !== s.gen) return;
      const pts = points(s.N, s.vn), o = ringOwner(KEYS[k], pts);
      await walk(KEYS[k], o.h, color, 650, s.vn ? 11 : 24);
      if (e.tok === tok) e.p.set(null, color);
    };

    const apply = (op) => {
      const before = s.own;
      s.own = owners(s.mode, s.N, s.vn);
      const moved = new Set();
      s.own.forEach((o, k) => { if (o !== before[k]) moved.add(k); });
      let alt = null;
      if (op === 'add' || op === 'remove') {
        const N0 = op === 'add' ? s.N - 1 : s.N + 1;
        const other = s.mode === 'ring' ? 'mod' : 'ring';
        const b2 = owners(other, N0, s.vn), a2 = owners(other, s.N, s.vn);
        alt = a2.filter((o, k) => o !== b2[k]).length;
        s.movedSum += moved.size;
        if (op === 'add') s.adds++;
      }
      s.busyUntil = a.now() + 2600;
      s.last = { op, mode: s.mode, moved: moved.size, total: K, alt };
      // 이번에 안 움직이는 키는 제 색으로(이전 애니메이션이 덜 끝났어도)
      keyEls.forEach((e, k) => { if (!moved.has(k)) { e.tok++; e.p.set(null, COL[s.own[k]]); } });
      const list = [...moved];
      const gap = Math.min(60, 1400 / Math.max(1, list.length));
      if (s.mode === 'mod') {
        assignSlots(moved);
        // 자리에 남는 키 중 이전 애니메이션으로 엉뚱한 곳에 멈춘 것은 바로 제자리로
        keyEls.forEach((e, k) => {
          if (moved.has(k)) return;
          const [x, y] = slotXY(IDS.indexOf(s.own[k]), s.slot[k]);
          e.p.x = x; e.p.y = y; e.p.g.setAttribute('transform', `translate(${x} ${y})`);
        });
        list.forEach((k, i) => a.spawn(() => flyMod(k, 250 + i * gap)));
      } else {
        list.forEach((k, i) => a.spawn(() => flyRing(k, 250 + i * gap)));
      }
      paint();
    };

    s.add = () => {
      if (s.N >= MAXN) { say(`이 실험에서는 서버를 ${MAXN}대까지 둘 수 있어요`); return; }
      s.N++;
      if (s.mode === 'mod') a.spawn(() => a.show('m' + IDS[s.N - 1], 300));
      say(`서버 ${IDS[s.N - 1]} 추가 — ${s.mode === 'mod' ? `이제 % ${s.N}으로 나눠요` : '새 서버 앞 구간의 키만 옮겨 와요'}`);
      apply('add');
    };
    s.removeOne = () => {
      if (s.N <= MINN) { say(`서버는 최소 ${MINN}대는 있어야 해요`); return; }
      const id = IDS[s.N - 1];
      s.N--;
      if (s.mode === 'mod') a.spawn(() => a.wait(900).then(() => { if (s.N <= IDS.indexOf(id)) return a.hide('m' + id, 300); }));
      say(`서버 ${id} 제거 — ${s.mode === 'mod' ? `이제 % ${s.N}으로 나눠요` : `${id}의 몫만 다음 서버가 이어받아요`}`);
      apply('remove');
    };
    s.vnChanged = () => {
      if (s.mode !== 'ring') { say('가상 노드는 해시 링에서 쓰는 방법이에요 — 방식을 해시 링으로 바꿔 보세요'); return; }
      say(s.vn ? '서버마다 링 위 6곳에 분신을 흩뿌려요' : '서버마다 링 위 한 점으로 돌아가요');
      apply('vn');
    };

    s.rebuild();

    // 조회 요청: 키 하나를 골라 어느 서버로 가는지 보여 준다 (한 번에 하나)
    a.every(1500, async () => {
      if (!s.look || lookBusy || a.now() < s.busyUntil) return;
      lookBusy = true;
      const gen = s.gen;
      try {
        lookIdx = (lookIdx + 7) % K;
        const k = lookIdx, h = KEYS[k], id = s.own[k], e = keyEls[k];
        if (s.mode === 'mod') {
          a.setText('look', `get(키 ${k + 1}) → 해시 ${h} % ${s.N} = ${h % s.N} → 서버 ${id}`);
          await a.tween(500, (t) => { if (gen === s.gen) e.p.g.setAttribute('transform', `translate(${e.p.x} ${e.p.y}) scale(${1 + Math.sin(Math.PI * t) * 0.7})`); });
        } else {
          const o = ringOwner(h, points(s.N, s.vn));
          a.setText('look', `get(키 ${k + 1}) → 해시 ${h} → 시계 방향 첫 서버 ${o.id}`);
          await walk(h, o.h, COL[o.id], 700, s.vn ? 11 : 24);
        }
      } finally {
        if (gen === s.gen) lookBusy = false;
      }
    });
  },
  stats: (s) => {
    const c = countBy(s.own, s.N);
    const mx = Math.max(...c), mn = Math.min(...c);
    const L = s.last, p = L ? pct(L.moved, L.total) : 0;
    const ratio = mn ? mx / mn : Infinity;
    return [
      ['서버 수', `${s.N}대`, ''],
      ['방금 이동한 키', L ? `${L.moved} / ${L.total} (${p}%)` : '-', L ? (p > 50 ? 'red' : p <= 30 ? 'green' : 'amber') : ''],
      ['서버별 몫 (최대 · 최소)', `${mx}개 · ${mn}개`, ''],
      ['균형 (최대 ÷ 최소)', Number.isFinite(ratio) ? ratio.toFixed(2) + '배' : '-', ratio <= 1.5 ? 'green' : 'amber'],
      ['누적 이동 (방식 바꾼 뒤)', `${s.movedSum}개`, ''],
    ];
  },
  tasks: [
    { t: '% N 방식에서 서버를 하나 추가하기 — 키의 절반 넘게 이사하나요?', check: (s) => !!s.last && s.last.op === 'add' && s.last.mode === 'mod' && s.last.moved / s.last.total > 0.5 },
    { t: '해시 링으로 바꿔 서버를 추가하기 — 옮겨 가는 키가 30% 이하인가요?', check: (s) => !!s.last && s.last.op === 'add' && s.last.mode === 'ring' && s.last.moved / s.last.total <= 0.3 },
    { t: '해시 링에서 서버 3대 이상일 때, 가상 노드로 최대 몫을 최소 몫의 1.5배 이하로 만들기', check: (s) => { const c = countBy(s.own, s.N); return s.mode === 'ring' && s.vn && s.N >= 3 && Math.max(...c) <= 1.5 * Math.min(...c); } },
    { t: '해시 링에서 서버를 5대까지 늘리기 — 그동안 옮긴 키를 다 합쳐도 전체(40개)보다 적나요?', check: (s) => s.mode === 'ring' && s.N >= 5 && s.adds >= 2 && s.movedSum < K },
  ],
};

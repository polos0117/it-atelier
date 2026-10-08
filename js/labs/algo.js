// 정렬 실험실: 정렬 방식·개수·처음 상태를 바꿔 가며 비교·교환 횟수를 직접 세어 본다
// 막대 값은 1..n의 순열. 같은 시드면 같은 데이터라, 방식만 바꿔 같은 문제를 다시 풀 수 있다.
const ST = {
  base: ['blue', 24], cmp: ['amber', 58], swap: ['red', 52], done: ['green', 42],
  pivot: ['violet', 55], range: ['teal', 30],
};
const NAME = { bubble: '버블 정렬', insert: '삽입 정렬', merge: '병합 정렬', quick: '퀵 정렬' };
const HINT = {
  bubble: (n) => `이웃끼리 비교·교환 · 최악 n(n−1)/2 = ${n * (n - 1) / 2}번`,
  insert: (n) => `앞쪽 정렬된 줄에 끼워 넣기 · 거의 정렬되면 약 n번(${n})`,
  merge: (n) => `반씩 나눠 합치기 · 약 n·log₂n ≈ ${Math.round(n * Math.log2(n))}번`,
  quick: (n) => `피벗(구간 맨 끝 값) 기준으로 나누기 · 평균 약 ${Math.round(1.39 * n * Math.log2(n))}번`,
};
const INIT = { rand: '무작위', near: '거의 정렬됨', rev: '거꾸로' };
const MOVE = { bubble: '교환', insert: '교환', quick: '교환', merge: '이동' };
const X0 = 44, X1 = 676;
const STOP = { stop: true }; // 다시 시작할 때 이전 정렬을 끊는 신호
const rival = (algo) => (algo === 'merge' ? 'bubble' : 'merge');
// 연산 한 번(비교 또는 교환/이동)에 드는 시간(ms) — 개수가 많을수록 짧게. 두 칸이 같은 값을 써서 공정하게 겨룬다
const opMs = (n) => Math.max(18, 200 * Math.pow(8 / n, 1.5));

function rng(seed) { // mulberry32
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function makeData(n, init, seed) {
  const v = Array.from({ length: n }, (_, i) => i + 1);
  if (init === 'rev') return v.reverse();
  const r = rng(seed * 7919 + n * 31 + (init === 'near' ? 17 : 0));
  if (init === 'near') { // 정렬된 줄에서 가까운 몇 쌍만 바꿔 놓기
    for (let k = 0; k < Math.max(1, Math.round(n / 8)); k++) {
      const i = Math.floor(r() * (n - 1)), j = Math.min(n - 1, i + 1 + Math.floor(r() * 2));
      [v[i], v[j]] = [v[j], v[i]];
    }
    return v;
  }
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
  return v;
}
const dataKey = (s) => (s.init === 'rev' ? `rev:${s.n}` : `${s.init}:${s.n}:${s.seed}`);
const fmtT = (ms) => (ms / 1000).toFixed(1) + '초';

export default {
  id: 'algo',
  title: '정렬 실험실',
  intro: '같은 막대를 여러 방식으로 정렬해 보세요. 방식을 바꾸면 같은 데이터로 처음부터 다시 정렬하니, 비교 횟수를 바로 견줄 수 있어요. 개수와 처음 상태(무작위·거의 정렬됨·거꾸로)에 따라 일의 양이 어떻게 달라지는지도 확인해 보세요. 나란히 비교를 켜면 아래 칸에서 병합 정렬(병합을 골랐다면 버블 정렬)이 같은 데이터로 함께 달려요.',
  controls: [
    { type: 'radio', key: 'algo', label: '정렬 방식', options: [['bubble', '버블'], ['insert', '삽입'], ['merge', '병합'], ['quick', '퀵']] },
    { type: 'range', key: 'n', label: '개수', min: 8, max: 40, step: 4, unit: '개' },
    { type: 'radio', key: 'init', label: '처음 상태', options: [['rand', '무작위'], ['near', '거의 정렬됨'], ['rev', '거꾸로']] },
    { type: 'toggle', key: 'vs', label: '두 방식 나란히 비교' },
    { type: 'button', label: '섞기', run: (s) => s.restart(true) },
    { type: 'button', label: '같은 데이터로 다시', run: (s) => s.restart(false) },
  ],
  init: () => ({ algo: 'bubble', n: 16, init: 'rand', vs: false, seed: 1, gen: 0, ar: [], results: [], phase: 'ready' }),
  onChange(key, s) {
    if (['algo', 'n', 'init', 'vs'].includes(key)) s.restart(false);
  },
  setup(a, s) {
    s.clock = () => a.now();
    const G = a.raw('g', {}, 'node');

    const setS = (b, k) => {
      if (b.k === k) return;
      const [c, p] = ST[k];
      b.rect.style.fill = `color-mix(in srgb, var(--${c}) ${p}%, var(--stage))`;
      b.rect.style.stroke = `var(--${c})`;
      b.k = k;
    };
    const paint = (ar, i) => {
      const b = ar.bars[i], v = ar.v[i];
      const h = 6 + (v / ar.n) * ar.maxH;
      b.rect.setAttribute('y', -h);
      b.rect.setAttribute('height', h);
      if (b.t) { b.t.textContent = v; b.t.setAttribute('y', -h - 10); }
      b.g.setAttribute('transform', `translate(${ar.x(i) + (b.off || 0)} ${ar.base})`);
      const inRange = ar.rng && i >= ar.rng[0] && i <= ar.rng[1];
      setS(b, ar.hot.get(i) || (ar.st[i] === 'done' ? 'done' : inRange ? 'range' : 'base'));
    };
    const heat = (ar, list) => {
      const old = [...ar.hot.keys()];
      ar.hot.clear();
      for (const [i, k] of list) ar.hot.set(i, k);
      for (const i of old) paint(ar, i);
      for (const [i] of list) paint(ar, i);
    };
    const setRange = (ar, lo, hi) => {
      const old = ar.rng;
      ar.rng = lo == null ? null : [lo, hi];
      const span = [old, ar.rng].filter(Boolean);
      for (const [l, h] of span) for (let i = l; i <= h; i++) paint(ar, i);
    };
    const showCnt = (ar) => {
      const m = MOVE[ar.algo];
      ar.cntT.textContent = `${ar.t1 != null ? '✓ ' : ''}비교 ${ar.cmp} · ${m} ${ar.mov}`;
    };

    // 연산 한 번 = 시간 한 칸. 늦었으면(화면이 밀렸으면) 기다리지 않고 따라잡는다
    const tick = async (ar) => {
      if (ar.gen !== s.gen) throw STOP;
      ar.t += ar.ms;
      const d = ar.t - a.now();
      if (d > 0) await a.wait(d);
      if (ar.gen !== s.gen) throw STOP;
    };
    const cmp = async (ar, i, j, k = 'cmp') => { // ar.v[i] > ar.v[j] ?
      heat(ar, [[i, k], [j, 'cmp']]);
      ar.cmp++; showCnt(ar);
      await tick(ar);
      return ar.v[i] > ar.v[j];
    };
    const swap = async (ar, i, j, keep = []) => {
      [ar.v[i], ar.v[j]] = [ar.v[j], ar.v[i]];
      ar.mov++; showCnt(ar);
      if (ar.ms >= 60) { // 막대가 적을 땐 자리를 바꾸는 모습이 보이게
        const bi = ar.bars[i], bj = ar.bars[j], dx = ar.x(j) - ar.x(i);
        a.tween(ar.ms * 0.9, (t) => {
          bi.off = dx * (1 - t); bj.off = -dx * (1 - t);
          paint(ar, i); paint(ar, j);
        }).catch(() => {});
      }
      heat(ar, [[i, 'swap'], [j, 'swap'], ...keep]);
      await tick(ar);
    };
    const write = async (ar, k, v) => {
      ar.v[k] = v;
      ar.mov++; showCnt(ar);
      heat(ar, [[k, 'swap']]);
      await tick(ar);
    };
    const done = (ar, i) => { ar.st[i] = 'done'; paint(ar, i); };

    const SORT = {
      async bubble(ar) {
        const n = ar.n;
        for (let p = 0; p < n - 1; p++) {
          let swapped = false;
          for (let i = 0; i < n - 1 - p; i++) {
            if (await cmp(ar, i, i + 1)) { await swap(ar, i, i + 1); swapped = true; }
          }
          done(ar, n - 1 - p);
          if (!swapped) break; // 한 바퀴 동안 교환이 없으면 이미 정렬된 것
        }
      },
      async insert(ar) {
        for (let i = 1; i < ar.n; i++) {
          for (let j = i; j > 0; j--) {
            if (!(await cmp(ar, j - 1, j))) break;
            await swap(ar, j - 1, j);
          }
        }
      },
      async merge(ar) {
        const rec = async (lo, hi) => {
          if (lo >= hi) return;
          const mid = (lo + hi) >> 1;
          await rec(lo, mid);
          await rec(mid + 1, hi);
          setRange(ar, lo, hi);
          const L = ar.v.slice(lo, mid + 1), R = ar.v.slice(mid + 1, hi + 1);
          let i = 0, j = 0, k = lo;
          while (i < L.length && j < R.length) {
            // 두 묶음의 맨 앞끼리 비교: 아직 자리에 남아 있는 막대 위치로 표시
            heat(ar, [[k, 'cmp'], [mid + 1 + j, 'cmp']]);
            ar.cmp++; showCnt(ar);
            await tick(ar);
            await write(ar, k++, L[i] <= R[j] ? L[i++] : R[j++]);
          }
          while (i < L.length) await write(ar, k++, L[i++]);
          while (j < R.length) await write(ar, k++, R[j++]);
          setRange(ar, null);
        };
        await rec(0, ar.n - 1);
      },
      async quick(ar) {
        const rec = async (lo, hi) => {
          if (lo > hi) return;
          if (lo === hi) { done(ar, lo); return; }
          setRange(ar, lo, hi);
          let i = lo - 1;
          for (let j = lo; j < hi; j++) {
            if (!(await cmp(ar, hi, j, 'pivot'))) continue; // pivot > v[j] 이면 왼쪽 무리로
            i++;
            if (i !== j) await swap(ar, i, j, [[hi, 'pivot']]);
          }
          if (i + 1 !== hi) await swap(ar, i + 1, hi);
          done(ar, i + 1);
          setRange(ar, null);
          await rec(lo, i);
          await rec(i + 2, hi);
        };
        await rec(0, ar.n - 1);
      },
    };

    const build = () => {
      G.replaceChildren();
      const vs = s.vs, n = s.n;
      const algos = vs ? [s.algo, rival(s.algo)] : [s.algo];
      const boxes = vs ? [[50, 222], [244, 416]] : [[50, 410]];
      const data = makeData(n, s.init, s.seed);
      const key = dataKey(s);
      const pitch = (X1 - X0) / n, bw = Math.max(6, pitch * 0.74);
      const labels = !vs && n <= 16;
      s.ar = algos.map((algo, ai) => {
        const [top, base] = boxes[ai];
        const ar = {
          algo, n, key, init: s.init, gen: s.gen, v: data.slice(), st: Array(n).fill('base'), hot: new Map(), rng: null,
          cmp: 0, mov: 0, t: 0, t0: a.now(), t1: null, ms: opMs(n), top, base,
          maxH: base - top - 52 - (labels ? 16 : 0), x: (i) => X0 + pitch * (i + 0.5), bars: [],
        };
        const name = `${NAME[algo]}${vs ? (ai ? '  (상대)' : '  (내가 고른 방식)') : ''}`;
        a.text(X0, top - 4, name, { size: 15, weight: 800, anchor: 'start', par: G });
        a.text(X0, top + 16, `${INIT[s.init]} ${n}개 · ${HINT[algo](n)}`, { size: 11.5, anchor: 'start', par: G, cls: 'muted' });
        ar.cntT = a.text(X1, top - 4, '', { size: 14, weight: 700, anchor: 'end', par: G, color: 'amber', mono: true });
        a.raw('line', { x1: X0 - 10, x2: X1 + 10, y1: base + 1, y2: base + 1, style: 'stroke:var(--line2);stroke-width:2;stroke-linecap:round' }, G);
        for (let i = 0; i < n; i++) {
          const g = a.raw('g', {}, G);
          const rect = a.raw('rect', { x: -bw / 2, width: bw, rx: Math.min(5, bw / 3), style: 'stroke-width:1.6' }, g);
          const t = labels ? a.text(0, 0, '', { par: g, size: 12, weight: 700, mono: true }) : null;
          ar.bars.push({ g, rect, t, off: 0, k: null });
        }
        for (let i = 0; i < n; i++) paint(ar, i);
        showCnt(ar);
        return ar;
      });
    };

    const runOne = async (ar) => {
      ar.t0 = a.now(); ar.t = ar.t0;
      await SORT[ar.algo](ar);
      if (ar.gen !== s.gen) throw STOP;
      ar.t1 = a.now();
      heat(ar, []);
      setRange(ar, null);
      showCnt(ar);
      ar.cntT.setAttribute('class', ar.cntT.getAttribute('class').replace(/tc-\w+/, 'tc-green'));
      s.results.push({ algo: ar.algo, n: ar.n, init: ar.init, key: ar.key, cmp: ar.cmp, mov: ar.mov });
      if (s.results.length > 24) s.results.shift();
      if (!s.winner) s.winner = ar.algo;
      // 확정 표시: 왼쪽부터 초록으로 훑기 (횟수에는 넣지 않음)
      for (let i = 0; i < ar.n; i++) {
        ar.st[i] = 'done'; paint(ar, i);
        if (i % 3 === 2) { await a.wait(16); if (ar.gen !== s.gen) throw STOP; }
      }
    };

    s.restart = (reseed) => {
      if (reseed) s.seed++;
      s.gen++;
      s.phase = 'run';
      s.winner = null;
      const my = s.gen;
      build();
      a.spawn(async () => {
        try {
          await a.wait(450);
          if (my !== s.gen) return;
          s.ar.forEach((ar) => { ar.t0 = a.now(); });
          await a.par(...s.ar.map(runOne));
          if (my === s.gen) s.phase = 'done';
        } catch (err) {
          if (err !== STOP) throw err;
        }
      });
    };
    s.restart(false);
  },
  stats: (s) => {
    const A = s.ar || [];
    const vs = A.length > 1;
    const both = (f) => A.map(f).join(' · ');
    const now = s.clock ? s.clock() : 0;
    const status = s.phase === 'done'
      ? (vs ? `완료 — ${NAME[s.winner]} 먼저` : '완료')
      : s.phase === 'run' ? '정렬 중' : '준비';
    return [
      [vs ? '비교 (위 · 아래)' : '비교', both((x) => x.cmp + '회'), 'amber'],
      [vs ? '교환·이동 (위 · 아래)' : (A[0] && MOVE[A[0].algo]) || '교환', both((x) => x.mov + '회'), ''],
      ['경과 시간', both((x) => fmtT((x.t1 ?? (s.phase === 'run' ? now : x.t0)) - x.t0)), ''],
      ['n(n−1)/2', String(s.n * (s.n - 1) / 2), ''],
      ['상태', status, s.phase === 'done' ? 'green' : ''],
    ];
  },
  tasks: [
    {
      t: '32개 이상을 같은 데이터로 버블 정렬과 병합 정렬 둘 다 끝까지 정렬하기 — 비교 횟수가 몇 배 차이 나나요?',
      check: (s) => s.results.some((r) => r.algo === 'bubble' && r.n >= 32 && s.results.some((q) => q.algo === 'merge' && q.key === r.key)),
    },
    {
      t: '16개 이상 "거의 정렬됨" 데이터를 삽입 정렬로 — 비교가 개수의 2배도 안 돼서 끝나나요?',
      check: (s) => s.results.some((r) => r.algo === 'insert' && r.init === 'near' && r.n >= 16 && r.cmp < 2 * r.n),
    },
    {
      t: '16개 이상 "거꾸로" 데이터를 버블 정렬로 — 비교 횟수가 정확히 n(n−1)/2인지 확인하기',
      check: (s) => s.results.some((r) => r.algo === 'bubble' && r.init === 'rev' && r.n >= 16 && r.cmp === r.n * (r.n - 1) / 2),
    },
    {
      t: '퀵 정렬로 무작위 40개와 거꾸로 40개를 각각 정렬 — 거꾸로일 때 왜 훨씬 오래 걸릴까요?',
      check: (s) => ['rand', 'rev'].every((init) => s.results.some((r) => r.algo === 'quick' && r.n === 40 && r.init === init)),
    },
  ],
};

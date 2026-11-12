// 경사하강법 실험실: 점 30개를 두 색으로 가르는 아주 작은 신경망을 브라우저에서 실제로 학습시킨다
// (순전파 → 교차 엔트로피 손실 → 역전파 기울기 → 가중치 수정, 전부 아래의 평범한 JS 계산).
// 데이터·처음 가중치는 시드가 있는 의사 난수로 만들어, 같은 조작이면 늘 같은 결과가 나온다.

/** 시드가 있는 의사 난수(mulberry32) */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp1 = (v) => Math.max(-0.95, Math.min(0.95, v));

/** 데이터: [x, y, 정답(0 = 파랑, 1 = 주황)] — 좌표는 -1~1 */
function makeData(kind) {
  const r = rng(kind === 'easy' ? 11 : kind === 'circle' ? 22 : 33);
  const g = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / Math.sqrt(0.5); }; // 대략 정규분포
  const P = [];
  if (kind === 'easy') { // 거의 직선으로 갈리는 두 무리(+ 반대편에 섞인 점 하나 — 실제 데이터엔 잡음이 있다)
    for (let i = 0; i < 15; i++) P.push([-0.45 + g() * 0.2, 0.35 + g() * 0.2, 0]);
    for (let i = 0; i < 14; i++) P.push([0.45 + g() * 0.2, -0.35 + g() * 0.2, 1]);
    P.push([-0.15, 0.2, 1]);
  } else if (kind === 'circle') { // 안쪽 원(주황)을 바깥 고리(파랑)가 둘러쌈 — 직선 하나로는 못 가른다
    for (let i = 0; i < 14; i++) { const t = (i / 14) * 2 * Math.PI + r() * 0.3, d = 0.12 + r() * 0.3; P.push([d * Math.cos(t), d * Math.sin(t), 1]); }
    for (let i = 0; i < 18; i++) { const t = (i / 18) * 2 * Math.PI + r() * 0.3, d = 0.68 + r() * 0.24; P.push([d * Math.cos(t), d * Math.sin(t), 0]); }
  } else { // 많이 겹치는 두 무리 — 어떤 모델로도 100%가 "정답"은 아니다
    for (let i = 0; i < 15; i++) P.push([-0.25 + g() * 0.33, 0.2 + g() * 0.33, 0]);
    for (let i = 0; i < 15; i++) P.push([0.25 + g() * 0.33, -0.2 + g() * 0.33, 1]);
  }
  return P.map(([x, y, c]) => [clamp1(x), clamp1(y), c]);
}
const DATA = { easy: makeData('easy'), circle: makeData('circle'), overlap: makeData('overlap') };

/* ---------- 신경망 계산 ---------- */
const SC = 3; // 입력 배율: 좌표(-1~1)를 -3~3으로 넣는다
const sig = (z) => 1 / (1 + Math.exp(-z));
function initNet(model, H, seed) {
  const r = rng(seed);
  const u = (k) => (r() * 2 - 1) * k;
  if (model === 'line') return { model, H: 0, w: [u(0.3), u(0.3)], b: 0 };
  return {
    model, H,
    W1: Array.from({ length: H }, () => [u(0.8), u(0.8)]),
    b1: Array.from({ length: H }, () => u(0.3)),
    w2: Array.from({ length: H }, () => u(0.8)),
    b2: 0,
  };
}
const nWeights = (n) => (n.model === 'line' ? 3 : n.H * 4 + 1); // 편향 포함
/** 순전파: 주황(1)일 확률 */
function predict(n, x, y) {
  x *= SC; y *= SC;
  if (n.model === 'line') return sig(n.w[0] * x + n.w[1] * y + n.b);
  let z = n.b2;
  for (let j = 0; j < n.H; j++) z += n.w2[j] * Math.tanh(n.W1[j][0] * x + n.W1[j][1] * y + n.b1[j]);
  return sig(z);
}
/** 한 에포크: 데이터 전체로 손실·정확도를 재고, 평균 기울기로 가중치를 한 번 고친다(전체 배치 경사하강법) */
function epoch(n, data, lr) {
  const N = data.length;
  let L = 0, ok = 0;
  const bce = (p, c) => -(c ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12)));
  if (n.model === 'line') {
    let g0 = 0, g1 = 0, gb = 0;
    for (const [x0, y0, c] of data) {
      const x = x0 * SC, y = y0 * SC, p = sig(n.w[0] * x + n.w[1] * y + n.b);
      L += bce(p, c); ok += (p >= 0.5) === (c === 1);
      const d = p - c; // 시그모이드 + 교차 엔트로피의 기울기 ∂L/∂z
      g0 += d * x; g1 += d * y; gb += d;
    }
    n.w[0] -= (lr * g0) / N; n.w[1] -= (lr * g1) / N; n.b -= (lr * gb) / N;
  } else {
    const H = n.H, h = new Array(H);
    const gW = n.W1.map(() => [0, 0]), gb1 = new Array(H).fill(0), gw2 = new Array(H).fill(0);
    let gb2 = 0;
    for (const [x0, y0, c] of data) {
      const x = x0 * SC, y = y0 * SC;
      let z = n.b2;
      for (let j = 0; j < H; j++) { h[j] = Math.tanh(n.W1[j][0] * x + n.W1[j][1] * y + n.b1[j]); z += n.w2[j] * h[j]; }
      const p = sig(z);
      L += bce(p, c); ok += (p >= 0.5) === (c === 1);
      const d = p - c; // 출력층 오차
      gb2 += d;
      for (let j = 0; j < H; j++) {
        gw2[j] += d * h[j];
        const dh = d * n.w2[j] * (1 - h[j] * h[j]); // 연쇄 법칙: 오차를 은닉층으로 거꾸로 전달
        gW[j][0] += dh * x; gW[j][1] += dh * y; gb1[j] += dh;
      }
    }
    for (let j = 0; j < H; j++) {
      n.W1[j][0] -= (lr * gW[j][0]) / N; n.W1[j][1] -= (lr * gW[j][1]) / N;
      n.b1[j] -= (lr * gb1[j]) / N; n.w2[j] -= (lr * gw2[j]) / N;
    }
    n.b2 -= (lr * gb2) / N;
  }
  return { loss: L / N, acc: ok / N };
}
const finiteNet = (n) => (n.model === 'line' ? [...n.w, n.b] : [...n.W1.flat(), ...n.b1, ...n.w2, n.b2]).every((v) => Number.isFinite(v) && Math.abs(v) < 1e6);

/* ---------- 학습률 슬라이더 ---------- */
// 학습률은 로그 눈금(0.001 … 30). 슬라이더는 눈금 번호(0~9)를 쓰고, 옆 글자는 실제 학습률을 보여 준다.
// app.js는 슬라이더 값을 String()으로, 옆 글자를 `값 + 단위`(+ 연산 → valueOf)로 만들기 때문에 둘을 나눠 줄 수 있다.
const LRS = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30];
// s.lr은 눈금 번호(0..), 실제 학습률은 LRS[번호] — 슬라이더 옆 글자는 fmt로 실제 값을 보여 준다
const lrK = (s) => Math.max(0, Math.min(LRS.length - 1, Math.round(+s.lr || 0)));
const lrOf = (s) => LRS[lrK(s)];

/* ---------- 무대 배치 ---------- */
const PX = 24, PY = 44, PS = 320, G = 20, CS = PS / G; // 왼쪽 산점도
const sx = (x) => PX + ((x + 1) / 2) * PS, sy = (y) => PY + (1 - (y + 1) / 2) * PS;
const KEEP = 300; // 손실 곡선에 남길 에포크 수
const CX0 = 414, CX1 = 692, CY0 = 272, CY1 = 396; // 손실 그래프 영역
const SPIKE = 0.05; // 한 에포크에 손실이 이만큼 넘게 오르면 "튐"
const fmtL = (v) => (Number.isFinite(v) ? (v >= 10 ? v.toFixed(1) : v.toFixed(3)) : '-');

export default {
  id: 'nn',
  title: '경사하강법 실험실',
  intro: '파랑·주황 점 30여 개를 가르는 아주 작은 신경망이 브라우저 안에서 실제로 학습합니다. 한 에포크마다 모든 점으로 손실(교차 엔트로피)을 재고, 역전파로 구한 기울기 쪽으로 가중치를 조금 고쳐요. 배경색은 모델의 예측, 흰 선은 50% 경계예요. 학습률을 바꿔 손실 곡선이 어떻게 내려가는지(혹은 튀는지) 보고, 원형 데이터에서 선 하나와 은닉층의 차이를 비교해 보세요. 겹침 데이터를 뉴런 많은 은닉층으로 오래 돌리면 경계가 구불구불해지며 섞인 점까지 다 맞히는데, 이건 잘 배운 게 아니라 외운 것(과적합)에 가까워요. 이 장난감 문제에서 알맞은 학습률은 0.1~3 정도지만, 알맞은 값은 모델·데이터·옵티마이저마다 달라요(큰 언어 모델은 보통 0.001보다 훨씬 작게 씁니다). 은닉 뉴런 수는 은닉층 모델에서만 쓰여요.',
  controls: [
    { type: 'range', key: 'lr', label: '학습률', min: 0, max: LRS.length - 1, step: 1, fmt: (k) => String(LRS[Math.round(+k)]) },
    { type: 'radio', key: 'data', label: '데이터', options: [['easy', '쉬움'], ['circle', '원형'], ['overlap', '겹침']] },
    { type: 'radio', key: 'model', label: '모델', options: [['line', '선 하나'], ['hidden', '은닉층']] },
    { type: 'range', key: 'hid', label: '은닉 뉴런 수', min: 2, max: 8, step: 1, unit: '개' },
    { type: 'toggle', key: 'run', label: '학습 진행' },
    { type: 'button', label: '가중치 초기화', run: (s) => s.reinit(true) },
  ],
  init: () => ({
    lr: 5, data: 'easy', model: 'line', hid: 4, run: true,
    seed: 1, net: null, epoch: 0, loss: NaN, acc: 0, hist: [], blown: false,
    // 마지막 조작 이후 기록(과제 판정용)
    ep0: 0, spikes: 0, bestAcc: 0,
  }),
  onChange(key, s) {
    if (key === 'data' || key === 'model' || (key === 'hid' && s.model === 'hidden')) s.reinit?.(false);
    else s.since?.();
    s.paint?.();
  },
  setup(a, s) {
    /* --- 왼쪽: 데이터와 결정 경계 --- */
    a.text(PX + PS / 2, 24, '', { id: 'ptT', size: 12.5, weight: 700, cls: 'muted', layer: 'edge' });
    a.raw('rect', { x: PX, y: PY, width: PS, height: PS, rx: 6, style: 'fill: none; stroke: var(--line2); stroke-width: 1.5' }, 'edge');
    const cells = [];
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      cells.push({ el: a.raw('rect', { x: PX + i * CS, y: PY + j * CS, width: CS, height: CS, 'shape-rendering': 'crispEdges', style: 'stroke: none; fill: none' }, 'zone'), q: null });
    }
    const contour = a.raw('path', { d: '', fill: 'none', style: 'stroke: var(--ink); stroke-width: 2.2; stroke-linejoin: round; opacity: .9' }, 'edge');
    const ptG = a.raw('g', {}, 'node');
    let pts = [];
    // 범례
    const LG = [['파랑 = 정답 0', 'blue', 34], ['주황 = 정답 1', 'amber', 140]];
    LG.forEach(([t, c, x]) => {
      a.raw('circle', { cx: x, cy: 384, r: 6, style: `fill: var(--${c}); stroke: var(--stage); stroke-width: 1.5` }, 'edge');
      a.text(x + 11, 384, t, { size: 11.5, anchor: 'start', layer: 'edge' });
    });
    a.raw('circle', { cx: 252, cy: 384, r: 6, style: 'fill: none; stroke: var(--red); stroke-width: 2.6' }, 'edge');
    a.text(263, 384, '틀린 점', { size: 11.5, anchor: 'start', layer: 'edge' });
    a.raw('path', { d: 'M28 408 H52', style: 'stroke: var(--ink); stroke-width: 2.2' }, 'edge');
    a.text(60, 408, '경계: 모델이 반반(50%)이라고 보는 곳', { size: 11.5, anchor: 'start', cls: 'muted', layer: 'edge' });

    const drawPoints = () => {
      ptG.replaceChildren();
      a.setText('ptT', `점 ${DATA[s.data].length}개 · 배경색 = 모델의 예측`);
      pts = DATA[s.data].map(([x, y, c]) => ({ c, x, y, el: a.raw('circle', { cx: sx(x), cy: sy(y), r: 6.5 }, ptG), bad: null }));
    };

    /* --- 오른쪽 위: 모델 그림 --- */
    a.zone('znet', 376, 34, 328, 192, { label: '', color: 'violet' });
    a.text(388, 48, '', { id: 'netT', size: 11.5, anchor: 'start', weight: 700, layer: 'edge' });
    a.text(692, 48, '굵기 = 크기 · 청록 + / 분홍 −', { size: 10.5, anchor: 'end', cls: 'muted', layer: 'edge' });
    const netG = a.raw('g', {}, 'node');
    let wires = [];
    const box = (x, y, label) => {
      a.raw('rect', { x: x - 24, y: y - 13, width: 48, height: 26, rx: 7, style: 'fill: var(--panel2); stroke: var(--violet); stroke-width: 1.5' }, netG);
      a.text(x, y, label, { size: 11.5, weight: 700, par: netG });
    };
    const drawNet = () => {
      netG.replaceChildren();
      wires = [];
      const n = s.net;
      a.setText('netT', `모델 · 가중치 ${nWeights(n)}개 (편향 포함)`);
      const IX = 420, OX = 664, IY = [106, 164], OY = 135;
      const wire = (x1, y1, x2, y2, get) => {
        const el = a.raw('line', { x1, y1, x2, y2, 'stroke-linecap': 'round' }, netG);
        wires.push({ el, get, last: null });
      };
      if (n.model === 'line') {
        IY.forEach((y, k) => wire(IX + 26, y, OX - 26, OY, () => n.w[k]));
        a.text(IX, 213, '입력 2', { size: 11, cls: 'muted', par: netG });
        a.text(OX, 213, '출력 (σ)', { size: 11, cls: 'muted', par: netG });
        a.text((IX + OX) / 2, 196, '뉴런 하나 = 직선 하나로 가르기', { size: 11, cls: 'muted', par: netG });
      } else {
        const HX = 542, H = n.H, gap = Math.min(30, 120 / Math.max(1, H - 1)), r = H > 5 ? 7 : 11;
        const HY = Array.from({ length: H }, (_, j) => OY + (j - (H - 1) / 2) * gap);
        HY.forEach((hy, j) => {
          IY.forEach((y, k) => wire(IX + 26, y, HX - r - 2, hy, () => n.W1[j][k]));
          wire(HX + r + 2, hy, OX - 26, OY, () => n.w2[j]);
        });
        HY.forEach((hy) => a.raw('circle', { cx: HX, cy: hy, r, style: 'fill: var(--panel2); stroke: var(--violet); stroke-width: 1.5' }, netG));
        a.text(IX, 213, '입력 2', { size: 11, cls: 'muted', par: netG });
        a.text(HX, 213, `은닉 ${H} (tanh)`, { size: 11, cls: 'muted', par: netG });
        a.text(OX, 213, '출력 (σ)', { size: 11, cls: 'muted', par: netG });
      }
      box(IX, IY[0], '가로');
      box(IX, IY[1], '세로');
      box(OX, OY, '예측');
    };

    /* --- 오른쪽 아래: 손실 곡선 --- */
    a.zone('zloss', 376, 240, 328, 184, { label: '손실 곡선 · 최근 300 에포크', color: 'gray' });
    a.text(692, 254, '', { id: 'epT', size: 11.5, anchor: 'end', weight: 700, mono: true, layer: 'edge' });
    a.raw('path', { d: `M${CX0} ${CY0 - 4} V${CY1} H${CX1}`, style: 'fill: none; stroke: var(--line2); stroke-width: 1.5' }, 'edge');
    a.text(CX0 - 6, CY1, '0', { size: 10.5, anchor: 'end', cls: 'muted', mono: true, layer: 'edge' });
    a.text(CX0 - 6, CY0, '', { id: 'ymax', size: 10.5, anchor: 'end', cls: 'muted', mono: true, layer: 'edge' });
    const ref = a.raw('path', { d: '', style: 'stroke: var(--gray); stroke-width: 1.2; stroke-dasharray: 4 4; fill: none' }, 'edge');
    a.text(CX1 - 2, 0, '반반 찍기 0.69', { id: 'refT', size: 10.5, anchor: 'end', cls: 'muted', layer: 'edge' });
    const lossP = a.raw('path', { d: '', style: 'fill: none; stroke: var(--violet); stroke-width: 2; stroke-linejoin: round' }, 'node');
    const spikeP = a.raw('path', { d: '', style: 'fill: none; stroke: var(--red); stroke-width: 2.6; stroke-linecap: round' }, 'node');
    a.text(CX0, 412, '', { id: 'stT', size: 11.5, anchor: 'start', weight: 700, layer: 'edge' });
    a.text(CX1, 412, '에포크 →', { size: 10.5, anchor: 'end', cls: 'muted', layer: 'edge' });

    /* --- 상태 바꾸기 --- */
    s.since = () => { s.ep0 = s.epoch; s.spikes = 0; s.bestAcc = 0; };
    const measure = () => { // 가중치를 바꾸지 않고 지금 손실·정확도만 잰다
      const r = epoch(JSON.parse(JSON.stringify(s.net)), DATA[s.data], 0);
      s.loss = r.loss; s.acc = r.acc;
    };
    s.reinit = (next) => {
      if (next) s.seed++;
      s.net = initNet(s.model, s.hid, 1000 + s.seed * 7 + (s.model === 'line' ? 0 : s.hid));
      s.epoch = 0; s.hist = []; s.blown = false;
      measure();
      s.since();
      drawPoints();
      drawNet();
      s.paint();
    };

    /* --- 그리기 --- */
    const V = Array.from({ length: G + 1 }, () => new Array(G + 1));
    s.paint = () => {
      if (!s.net) return;
      const n = s.net, ok = !s.blown;
      // 격자 꼭짓점마다 예측 → 칸 색 + 50% 경계선(마칭 스퀘어)
      for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) V[j][i] = ok ? predict(n, -1 + (2 * i) / G, 1 - (2 * j) / G) : 0.5;
      let d = '';
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const v = [V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]]; // 왼위, 오위, 오아래, 왼아래
        const m = (v[0] + v[1] + v[2] + v[3]) / 4;
        const q = Math.round((m - 0.5) * 16) / 8; // -1 … 1, 1/8 단위
        const c = cells[j * G + i];
        if (c.q !== q) {
          c.q = q;
          c.el.setAttribute('style', q === 0 ? 'stroke: none; fill: none' : `stroke: none; fill: var(--${q > 0 ? 'amber' : 'blue'}); fill-opacity: ${(Math.abs(q) * 0.36).toFixed(3)}`);
        }
        const X = PX + i * CS, Y = PY + j * CS;
        const P = [[X, Y], [X + CS, Y], [X + CS, Y + CS], [X, Y + CS]];
        const cr = [];
        for (let e = 0; e < 4; e++) {
          const a0 = v[e] - 0.5, b0 = v[(e + 1) % 4] - 0.5;
          if ((a0 < 0) !== (b0 < 0)) {
            const t = a0 / (a0 - b0), A = P[e], B = P[(e + 1) % 4];
            cr.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
          }
        }
        for (let k = 0; k + 1 < cr.length; k += 2) d += `M${cr[k][0].toFixed(1)} ${cr[k][1].toFixed(1)}L${cr[k + 1][0].toFixed(1)} ${cr[k + 1][1].toFixed(1)}`;
      }
      contour.setAttribute('d', d);
      // 점: 틀리면 빨간 테두리
      for (const p of pts) {
        const bad = ok && (predict(n, p.x, p.y) >= 0.5) !== (p.c === 1);
        if (p.bad !== bad) {
          p.bad = bad;
          p.el.setAttribute('style', `fill: var(--${p.c ? 'amber' : 'blue'}); stroke: var(--${bad ? 'red' : 'stage'}); stroke-width: ${bad ? 3 : 1.5}`);
        }
      }
      // 가중치 선
      for (const w of wires) {
        const v = ok ? w.get() : 0;
        const k = Math.round(Math.min(7, 0.6 + Math.abs(v) * 0.8) * 4) / 4 * (v < 0 ? -1 : 1);
        if (w.last !== k) {
          w.last = k;
          w.el.setAttribute('style', `stroke: var(--${v < 0 ? 'pink' : 'teal'}); stroke-width: ${Math.abs(k)}; opacity: .85`);
        }
      }
      // 손실 곡선
      const h = s.hist, top = Math.max(1, ...h.map((x) => (Number.isFinite(x) ? x : 0)));
      const ymax = top <= 1 ? 1 : Math.ceil(top);
      const Y = (v) => CY1 - (Math.min(v, ymax) / ymax) * (CY1 - CY0);
      const X = (i) => CX0 + 2 + (i / (KEEP - 1)) * (CX1 - CX0 - 4);
      let lp = '', sp = '';
      h.forEach((v, i) => {
        if (!Number.isFinite(v)) return;
        lp += `${lp ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        if (i && h[i] - h[i - 1] > SPIKE) sp += `M${X(i - 1).toFixed(1)} ${Y(h[i - 1]).toFixed(1)}L${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
      });
      lossP.setAttribute('d', lp);
      spikeP.setAttribute('d', sp);
      a.setText('ymax', ymax >= 10 ? String(ymax) : ymax.toFixed(1));
      const ry = Y(Math.LN2);
      ref.setAttribute('d', `M${CX0} ${ry.toFixed(1)} H${CX1}`);
      a.get('refT').setAttribute('y', ry - 8);
      a.setText('epT', `에포크 ${s.epoch} · 손실 ${fmtL(s.loss)}`);
      const st = a.get('stT');
      const recent = h.slice(-30);
      const jumpy = recent.some((v, i) => i && v - recent[i - 1] > SPIKE);
      const [msg, col] = s.blown ? ['발산! 가중치 초기화를 눌러 주세요', 'red']
        : !s.run ? ['⏸ 학습 멈춤', 'amber']
          : jumpy ? ['손실이 튀어요 — 보폭이 너무 커요', 'red']
            : ['', 'gray'];
      st.textContent = msg;
      st.setAttribute('class', `tx tc-${col}`);
    };

    /* --- 학습 --- */
    const train = () => {
      if (!s.run || s.blown || !s.net) return;
      const r = epoch(s.net, DATA[s.data], lrOf(s));
      const prev = s.hist.length ? s.hist[s.hist.length - 1] : null;
      if (!Number.isFinite(r.loss) || !finiteNet(s.net)) { s.blown = true; s.spikes++; return; }
      if (prev != null && r.loss - prev > SPIKE) s.spikes++;
      s.loss = r.loss; s.acc = r.acc;
      s.bestAcc = Math.max(s.bestAcc, r.acc);
      s.epoch++;
      s.hist.push(r.loss);
      if (s.hist.length > KEEP) s.hist.shift();
    };

    s.reinit(false);
    a.every(50, train); // 배속 1에서 초당 20 에포크
    a.every(100, () => s.paint());
  },
  stats: (s) => {
    const lr = lrOf(s);
    return [
      ['에포크', s.epoch, ''],
      ['손실', s.blown ? '발산' : fmtL(s.loss), s.blown || s.loss > 1 ? 'red' : s.loss < 0.1 ? 'green' : ''],
      ['정확도', Math.round(s.acc * 100) + '%', s.acc >= 0.95 ? 'green' : ''],
      ['학습률', String(lr), lr >= 10 ? 'red' : lr <= 0.003 ? 'amber' : ''],
    ];
  },
  tasks: [
    { t: '학습률을 0.001로 낮추고 가중치 초기화 — 100 에포크가 지나도 손실이 0.4 위에 머무는 것 보기', check: (s) => lrOf(s) <= 0.001 && s.epoch - s.ep0 >= 100 && s.loss > 0.4 },
    { t: '학습률을 10 이상으로 올리고 가중치 초기화 — 손실이 3번 넘게 튀어 오르는 것 보기 (은닉층에서 잘 보여요)', check: (s) => lrOf(s) >= 10 && s.spikes >= 3 },
    { t: '원형 데이터를 "선 하나" 모델로 200 에포크 — 정확도가 90%를 넘지 못하는 것 확인하기', check: (s) => s.data === 'circle' && s.model === 'line' && s.epoch - s.ep0 >= 200 && s.bestAcc < 0.9 },
    { t: '원형 데이터를 "은닉층" 모델로 정확도 95% 이상 만들기', check: (s) => s.data === 'circle' && s.model === 'hidden' && !s.blown && s.acc >= 0.95 },
  ],
};

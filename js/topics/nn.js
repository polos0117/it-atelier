// 신경망 학습: 뉴런 하나 → 층 쌓기(순전파) → 엉터리 예측과 손실 → 경사하강법 → 역전파 → 에포크 반복 → 과적합 → LLM과의 관계
// 단계마다 무대를 새로 그린다. 가중치·확률·곡선 값은 모두 설명용 예시 값(고정)이다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, id: o.id, hidden: o.hidden, layer: o.layer });
}
const sig = (z) => 1 / (1 + Math.exp(-z));

/* ---------- 작은 신경망 그림 (2단계·3단계·5단계 공용) ---------- */
const IN = [[80, 150, '무게', '0.8'], [80, 260, '빨간 정도', '0.9']];
const HX = 260, HY = [100, 170, 240, 310], HR = 20;
const OUT = [[440, 165, '사과'], [440, 245, '귤']];
// 잘 배운 가중치 / 처음(무작위) 가중치 / 역전파로 한 번 고친 가중치
const TR1 = [[1.8, 2.2], [-1.2, 0.4], [0.9, 1.6], [-0.6, -1.9]], TR2 = [[2.1, -0.8, 1.4, -1.6], [-1.9, 0.9, -1.2, 1.5]];
const RN1 = [[0.3, -0.5], [0.6, 0.2], [-0.4, 0.3], [0.2, 0.5]], RN2 = [[-0.3, 0.4, 0.2, -0.5], [0.5, -0.2, 0.3, 0.4]];
const UP1 = [[0.5, -0.2], [0.6, 0.3], [-0.1, 0.6], [0.1, 0.3]], UP2 = [[0.3, 0.3, 0.7, -0.6], [0.0, -0.1, -0.2, 0.6]];
const wStyle = (w) => `stroke: var(--${w < 0 ? 'pink' : 'teal'}); stroke-width: ${(0.8 + Math.abs(w) * 1.7).toFixed(2)}; opacity: .8`;

function drawNet(a, W1, W2, o = {}) {
  a.text(80, 52, '입력층', { size: 12, weight: 700, cls: 'muted' });
  a.text(HX, 52, '은닉층', { size: 12, weight: 700, cls: 'muted' });
  a.text(440, 52, '출력층', { size: 12, weight: 700, cls: 'muted' });
  const e1 = HY.map((hy, j) => IN.map(([x, y], k) => a.raw('line', { x1: x + 54, y1: y, x2: HX - HR - 3, y2: hy, 'stroke-linecap': 'round', style: wStyle(W1[j][k]) }, 'edge')));
  const e2 = OUT.map(([x, y], i) => HY.map((hy, j) => a.raw('line', { x1: HX + HR + 3, y1: hy, x2: x - 52, y2: y, 'stroke-linecap': 'round', style: wStyle(W2[i][j]) }, 'edge')));
  IN.forEach(([x, y, l, v], k) => a.node('i' + k, x, y, { label: l, sub: o.noVal ? '' : v, color: 'blue', w: 104, h: 46, size: 13 }));
  HY.forEach((y, j) => a.node('h' + j, HX, y, { label: '', color: 'violet', shape: 'circle', w: HR * 2, h: HR * 2 }));
  OUT.forEach(([x, y, l], i) => a.node('o' + i, x, y, { label: l, sub: '?', color: 'gray', w: 100, h: 48, size: 13 }));
  a.text(260, 352, '선 굵기 = 가중치 크기 · 청록 + / 분홍 −', { size: 11, cls: 'muted' });
  return { e1, e2 };
}
/** 순전파 점: 입력 → 은닉 → 출력 */
async function forward(a, color = 'blue', dur = 650) {
  const d1 = [];
  HY.forEach((hy) => IN.forEach(([x, y]) => d1.push([chip(a, '', x + 54, y, color, { w: 12, h: 12 }), [HX - HR - 3, hy]])));
  await a.par(...d1.map(([p, to]) => a.move(p, to, dur)));
  d1.forEach(([p]) => a.remove(p));
  HY.forEach((_, j) => a.hl('h' + j, true));
  await a.wait(200);
  const d2 = [];
  OUT.forEach(([x, y]) => HY.forEach((hy) => d2.push([chip(a, '', HX + HR + 3, hy, color, { w: 12, h: 12 }), [x - 52, y]])));
  HY.forEach((_, j) => a.hl('h' + j, false));
  await a.par(...d2.map(([p, to]) => a.move(p, to, dur)));
  d2.forEach(([p]) => a.remove(p));
}
/** 역전파 점: 출력 → 은닉 → 입력 */
async function backward(a, dur = 700) {
  const d2 = [];
  OUT.forEach(([x, y]) => HY.forEach((hy) => d2.push([chip(a, '', x - 52, y, 'red', { w: 12, h: 12 }), [HX + HR + 3, hy]])));
  await a.par(...d2.map(([p, to]) => a.move(p, to, dur)));
  d2.forEach(([p]) => a.remove(p));
  HY.forEach((_, j) => a.hl('h' + j, true, 'red'));
  await a.wait(250);
  const d1 = [];
  HY.forEach((hy) => IN.forEach(([x, y]) => d1.push([chip(a, '', HX - HR - 3, hy, 'red', { w: 12, h: 12 }), [x + 54, y]])));
  HY.forEach((_, j) => a.hl('h' + j, false));
  await a.par(...d1.map(([p, to]) => a.move(p, to, dur)));
  d1.forEach(([p]) => a.remove(p));
}
/** 확률 막대 한 줄 (raw rect) */
function probBar(a, x, y, h, color, scale, v = 0) {
  a.raw('rect', { x, y: y - h / 2, width: scale, height: h, rx: 4, style: 'fill: var(--panel2); opacity: .8' }, 'edge');
  const r = a.raw('rect', { x, y: y - h / 2, width: v * scale, height: h, rx: 4, style: `fill: var(--${color})` }, 'node');
  return { r, set: (k) => r.setAttribute('width', Math.max(0, k * scale)) };
}

/* ---------- 손실 언덕 (4단계) ---------- */
const LW = (w) => 0.25 * (w - 3) * (w - 3) + 0.2; // 손실 L(w)
const GW = (w) => 0.5 * (w - 3); // 기울기 dL/dw
function hill(a, x0, x1, yb, hgt, o = {}) {
  const X = (w) => x0 + ((w + 1) / 8) * (x1 - x0);
  const Y = (L) => yb - (L / 4.4) * hgt;
  let d = '';
  for (let i = 0; i <= 64; i++) { const w = -1 + (8 * i) / 64; d += `${i ? 'L' : 'M'}${X(w).toFixed(1)} ${Y(LW(w)).toFixed(1)}`; }
  a.raw('path', { d, fill: 'none', style: `stroke: var(--${o.color || 'gray'}); stroke-width: ${o.sw || 2.5}` }, 'edge');
  return { X, Y, P: (w) => [X(w), Y(LW(w))] };
}
function ball(a, at, color, r = 9) {
  return a.raw('circle', { cx: at[0], cy: at[1], r, style: `fill: var(--${color}); stroke: var(--stage); stroke-width: 2` }, 'pkt');
}
function rollTo(a, b, from, to, dur) {
  return a.tween(dur, (k) => {
    const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * 14;
    b.setAttribute('cx', x); b.setAttribute('cy', y);
  });
}

/* ---------- 에포크 곡선 (6·7단계) ---------- */
function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const NOISE = (() => { const r = rng(20261111); return Array.from({ length: 51 }, () => r() - 0.5); })();
const trainL = (e) => 0.06 + 1.1 * Math.exp(-e / 9) + NOISE[e] * 0.06 * Math.exp(-e / 25);
const valL = (e) => 0.34 + 0.86 * Math.exp(-e / 8) + Math.max(0, e - 18) * 0.012 + NOISE[50 - e] * 0.03;
const accAt = (e) => 0.5 + 0.47 * (1 - Math.exp(-e / 8));
function chart(a, x0, x1, y0, y1, ymax) {
  a.raw('path', { d: `M${x0} ${y0} V${y1} H${x1}`, style: 'fill: none; stroke: var(--line2); stroke-width: 1.5' }, 'edge');
  a.text(x0 - 8, y1, '0', { size: 11, anchor: 'end', cls: 'muted', mono: true, layer: 'edge' });
  a.text(x0 - 8, y0 + 6, ymax.toFixed(1), { size: 11, anchor: 'end', cls: 'muted', mono: true, layer: 'edge' });
  a.text(x0 - 4, y0 - 14, '손실', { size: 11.5, weight: 700, cls: 'muted', layer: 'edge' });
  a.text(x1, y1 + 20, '에포크 →', { size: 11.5, anchor: 'end', cls: 'muted', layer: 'edge' });
  return { X: (e) => x0 + 4 + (e / 50) * (x1 - x0 - 8), Y: (v) => y1 - (Math.min(v, ymax) / ymax) * (y1 - y0) };
}
function curvePath(c, f, upto) {
  let d = '';
  const n = Math.floor(upto);
  for (let e = 0; e <= n; e++) d += `${e ? 'L' : 'M'}${c.X(e).toFixed(1)} ${c.Y(f(e)).toFixed(1)}`;
  if (upto > n && n < 50) { const t = upto - n, v = f(n) + (f(n + 1) - f(n)) * t; d += `L${c.X(upto).toFixed(1)} ${c.Y(v).toFixed(1)}`; }
  return d;
}

export default {
  id: 'nn',
  level: 3,
  cat: 'AI',
  title: '신경망은 어떻게 배울까 — 틀리고 고치기를 반복',
  sub: '예측하고, 얼마나 틀렸는지 재고, 오차를 거꾸로 보내 가중치를 조금씩 고치는 과정을 수없이 되풀이하는 것',
  analogy: '처음 다트를 던지는 사람을 떠올려 보세요. 던지고(예측), 과녁에서 얼마나 빗나갔는지 보고(손실), 팔 각도를 조금 고쳐 다시 던집니다. 한 번에 확 바꾸면 반대쪽으로 빗나가고, 너무 조금씩 고치면 한참 걸리죠. 신경망도 수많은 숫자(가중치)를 이렇게 조금씩 고치며 배웁니다.',
  keys: [
    '뉴런 하나는 입력마다 가중치를 곱해 더하고(가중합 + 편향) 활성화 함수를 통과시킨다. 이런 뉴런을 층으로 쌓아 앞에서 뒤로 계산하는 것이 순전파다.',
    '학습 전 가중치는 무작위라 예측이 엉터리다. 예측이 정답과 얼마나 다른지를 하나의 숫자, 곧 손실(분류는 주로 교차 엔트로피)로 잰다.',
    '경사하강법은 손실이 줄어드는 방향(기울기의 반대)으로 가중치를 조금 옮긴다. 한 번에 옮기는 정도가 학습률이며, 너무 크면 튕겨 나가고 너무 작으면 느리다.',
    '역전파는 연쇄 법칙으로 오차를 출력에서 입력 쪽으로 거꾸로 보내, 모든 가중치의 기울기를 한 번에 계산한다. 이 과정을 데이터 전체에 걸쳐 여러 에포크 반복한다.',
    '훈련 데이터만 외우면 처음 보는 데이터에서 틀린다(과적합). 검증 손실을 지켜보며 데이터 늘리기·조기 종료·드롭아웃 등으로 막는다. 대형 언어 모델도 같은 원리를 엄청난 규모로 적용한 것이다.',
  ],
  terms: [
    ['가중치·편향', '뉴런이 입력에 곱하는 수(가중치)와 더하는 수(편향). 학습으로 정해지는 모델의 파라미터'],
    ['활성화 함수', '가중합을 비선형으로 바꾸는 함수. ReLU, 시그모이드, tanh 등. 이것이 있어야 층을 쌓는 의미가 생긴다'],
    ['손실 함수', '예측이 정답과 얼마나 다른지를 숫자 하나로 나타내는 함수. 분류엔 교차 엔트로피, 수치 예측엔 평균제곱오차(MSE)를 주로 쓴다'],
    ['경사하강법', '손실의 기울기 반대 방향으로 가중치를 조금씩 옮겨 손실을 줄이는 방법. 데이터 일부씩 쓰면 확률적 경사하강법(SGD)'],
    ['학습률', '한 번에 가중치를 얼마나 크게 옮길지 정하는 보폭. 너무 크면 발산, 너무 작으면 학습이 느리다'],
    ['역전파', '연쇄 법칙으로 출력의 오차를 입력 쪽으로 거슬러 보내며 모든 가중치의 기울기를 효율적으로 구하는 알고리즘'],
    ['에포크', '훈련 데이터 전체를 한 번 다 써서 학습한 단위'],
    ['과적합', '훈련 데이터에만 지나치게 맞춰져 새 데이터에서 성능이 떨어지는 현상'],
  ],
  setup(a) {
    a.text(360, 30, '사과일까, 귤일까? — 뉴런 하나의 계산', { size: 13, weight: 700, cls: 'muted' });
    a.node('in1', 100, 150, { label: '무게', sub: '0.8', color: 'blue', w: 130, h: 54, size: 14 });
    a.node('in2', 100, 290, { label: '빨간 정도', sub: '0.9', color: 'blue', w: 130, h: 54, size: 14 });
    a.node('sum', 340, 220, { label: 'Σ', sub: '가중합', color: 'violet', shape: 'circle', w: 96, size: 22 });
  },
  steps: [
    {
      t: '뉴런 하나 — 곱하고, 더하고, 판정',
      easy: '과일의 무게와 빨간 정도를 숫자로 넣으면, 뉴런은 각 숫자에 "중요도"(가중치)를 곱해 모두 더하고 기준값(편향)을 더합니다. 그 결과를 0~1 사이로 눌러 주면 "사과일 확률"이 돼요. 학습이란 이 중요도와 기준값을 알맞게 찾는 일입니다.',
      deep: '뉴런은 z = w·x + b(가중합 + 편향)를 계산하고 활성화 함수 f(z)를 통과시킵니다. 예시는 z = 2.0×0.8 + 3.0×0.9 − 2.5 = 1.8, 시그모이드 σ(z) = 1/(1+e^(−z)) ≈ 0.86입니다. 은닉층에선 ReLU(max(0, z))를 가장 흔히 쓰고, 활성화가 없으면 층을 아무리 쌓아도 전체가 하나의 선형식이라 직선(평면) 경계밖에 못 만듭니다.',
      async run(a) {
        wipe(a);
        a.text(360, 30, '사과일까, 귤일까? — 뉴런 하나의 계산', { size: 13, weight: 700, cls: 'muted' });
        a.node('in1', 100, 150, { label: '무게', sub: '0.8', color: 'blue', w: 130, h: 54, size: 14 });
        a.node('in2', 100, 290, { label: '빨간 정도', sub: '0.9', color: 'blue', w: 130, h: 54, size: 14 });
        a.text(100, 334, '0~1로 맞춘 값', { size: 11, cls: 'muted' });
        a.node('sum', 340, 220, { label: 'Σ', sub: '가중합', color: 'violet', shape: 'circle', w: 96, size: 22 });
        a.node('b', 340, 84, { label: '편향', sub: '−2.5', color: 'gray', w: 88, h: 44, size: 13 });
        a.node('act', 505, 220, { label: '활성화', sub: '시그모이드', color: 'teal', w: 116, h: 56, size: 14 });
        a.node('out', 640, 220, { label: '?', sub: '사과일 확률', color: 'gray', w: 104, h: 56, size: 16 });
        a.edge('in1', 'sum', { label: '× 2.0 (가중치)', ly: -16 });
        a.edge('in2', 'sum', { label: '× 3.0 (가중치)', ly: 18 });
        a.edge('b', 'sum');
        a.edge('sum', 'act');
        a.edge('act', 'out');
        await a.wait(300);
        // 입력에 가중치를 곱하며 들어간다
        const p1 = chip(a, '0.8', 168, 162, 'blue', { w: 44 });
        const p2 = chip(a, '0.9', 168, 278, 'blue', { w: 44 });
        const pb = chip(a, '−2.5', 340, 110, 'gray', { w: 50 });
        a.caption('가중치가 클수록 그 입력을 더 중요하게 봐요');
        await a.par(a.move(p1, [222, 183], 600), a.move(p2, [222, 257], 600));
        p1.set('1.6', 'violet'); p2.set('2.7', 'violet');
        await a.flash(p1);
        await a.par(a.move(p1, [296, 202], 500), a.move(p2, [296, 238], 500), a.move(pb, [340, 168], 500));
        await a.par(a.fadeOut(p1, 200), a.fadeOut(p2, 200), a.fadeOut(pb, 200));
        a.hl('sum', true);
        a.note('n1', 340, 312, '1.6 + 2.7 − 2.5 = 1.8', { color: 'violet' });
        await a.wait(600);
        // 활성화 → 확률
        const z = chip(a, '1.8', 392, 220, 'violet', { w: 40 });
        await a.move(z, [444, 220], 450);
        await a.fadeOut(z, 150);
        a.hl('sum', false);
        a.hl('act', true);
        await a.wait(250);
        const y = chip(a, '0.86', 566, 220, 'green', { w: 44 });
        await a.move(y, [585, 220], 300);
        await a.fadeOut(y, 150);
        a.hl('act', false);
        a.setNode('out', { label: '0.86', color: 'green' });
        await a.flash('out');
        a.note('n2', 572, 300, 'σ(1.8) ≈ 0.86\n0.5보다 크면 → 사과', { color: 'green' });
        await a.wait(500);
        a.note('n3', 360, 390, '학습 = 이 가중치(2.0, 3.0)와 편향(−2.5)을 알맞게 찾는 일', { color: 'blue' });
        await a.wait(800);
      },
    },
    {
      t: '층을 쌓으면 신경망 — 순전파',
      easy: '뉴런을 여러 개 나란히 놓으면 "층"이 되고, 층을 이어 붙이면 신경망이 됩니다. 입력에서 시작한 계산이 층을 차례로 지나 마지막에 "사과 86%, 귤 14%" 같은 답이 나와요. 이렇게 앞에서 뒤로 흘러가는 계산을 순전파라고 합니다.',
      deep: '한 층의 계산은 행렬 곱 h = f(W·x + b)이고, 이를 층마다 반복하는 것이 순전파(forward pass)입니다. 은닉층이 있으면 직선 하나로는 못 가르는 굽은 경계도 표현할 수 있습니다. 여러 부류를 고를 땐 마지막에 softmax로 점수를 합이 1인 확률로 바꾸며, 이 그림은 입력 2·은닉 4·출력 2개로 가중치와 편향이 모두 22개입니다.',
      async run(a) {
        wipe(a);
        drawNet(a, TR1, TR2);
        a.zone('how', 512, 84, 192, 196, { label: '뉴런마다 하는 일', color: 'violet' });
        const L = ['① 입력 × 가중치를 더하고', '② 편향을 더한 뒤', '③ 활성화 함수 통과', '→ 결과를 다음 층으로'];
        L.forEach((s, i) => a.text(526, 128 + i * 34, s, { size: 12.5, anchor: 'start', weight: i === 3 ? 700 : 500, id: 'how' + i, hidden: true }));
        for (let i = 0; i < 4; i++) await a.show('how' + i, 220);
        a.caption('왼쪽에서 오른쪽으로 계산이 흘러가요 — 순전파');
        await forward(a, 'blue', 700);
        a.setNode('o0', { sub: '0.86', color: 'green' });
        a.setNode('o1', { sub: '0.14', color: 'gray' });
        a.hl('o0', true, 'green');
        await a.flash('o0');
        a.note('n1', 360, 396, '답: 사과 86% · 귤 14% (잘 배운 가중치일 때)', { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '처음엔 엉터리 — 손실로 틀린 정도 재기',
      easy: '막 만든 신경망의 가중치는 아무렇게나 정한 숫자라, 사과를 넣어도 "귤 70%"처럼 엉뚱하게 답해요. 그래서 "얼마나 틀렸나"를 숫자 하나로 재는데, 이것이 손실입니다. 정답에 가까울수록 0에 가까워져요.',
      deep: '가중치는 대칭을 깨기 위해 작은 무작위 값(Xavier·He 초기화 등)으로 시작합니다. 분류의 손실은 교차 엔트로피 L = −Σ yᵢ·log pᵢ로, 정답 클래스의 확률이 0.30이면 −log 0.30 ≈ 1.20, 0.99면 ≈ 0.01입니다. 실제로는 데이터 여러 개의 손실을 평균하며, 숫자를 맞히는 회귀 문제엔 평균제곱오차(MSE)를 주로 씁니다.',
      async run(a) {
        wipe(a);
        drawNet(a, RN1, RN2);
        a.text(260, 374, '가중치를 아무렇게나 정해 둔 상태', { size: 12, weight: 700, color: 'pink' });
        a.zone('cmp', 512, 64, 192, 300, { label: '예측 vs 정답', color: 'red' });
        a.text(526, 104, '사과', { size: 13, weight: 700, anchor: 'start' });
        a.text(526, 168, '귤', { size: 13, weight: 700, anchor: 'start' });
        const b0 = probBar(a, 564, 104, 16, 'amber', 100);
        const b1 = probBar(a, 564, 168, 16, 'amber', 100);
        const t0 = a.text(670, 104, '', { size: 12, mono: true, weight: 700, anchor: 'start' });
        const t1 = a.text(670, 168, '', { size: 12, mono: true, weight: 700, anchor: 'start' });
        a.text(564, 128, '정답 1', { size: 11.5, anchor: 'start', color: 'green', weight: 700 });
        a.text(564, 192, '정답 0', { size: 11.5, anchor: 'start', cls: 'muted', weight: 700 });
        a.caption('사과(무게 0.8, 빨강 0.9)를 넣어 봅니다');
        await forward(a, 'blue', 600);
        a.setNode('o0', { sub: '0.30', color: 'red' });
        a.setNode('o1', { sub: '0.70', color: 'red' });
        await a.tween(700, (k) => { b0.set(0.3 * k); b1.set(0.7 * k); t0.textContent = (0.3 * k).toFixed(2); t1.textContent = (0.7 * k).toFixed(2); });
        a.hl('o1', true, 'red');
        await a.wait(300);
        a.caption('');
        a.text(608, 226, '손실 (교차 엔트로피)', { size: 11.5, weight: 700, cls: 'muted' });
        a.text(608, 254, '−log(0.30) ≈ 1.20', { size: 14, mono: true, weight: 800, color: 'red' });
        const g = a.bar('lg', 530, 288, 156, { color: 'red' });
        await g.set(1.2 / 2.3, 700);
        a.text(530, 312, '0 = 완벽', { size: 11, anchor: 'start', cls: 'muted' });
        a.text(686, 312, '클수록 많이 틀림', { size: 11, anchor: 'end', cls: 'muted' });
        a.note('n1', 608, 400, '목표: 이 숫자를 0에 가깝게', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '손실 언덕 내려가기 — 경사하강법',
      easy: '가중치를 바꿔 가며 손실을 그려 보면 언덕 모양이 돼요. 공을 놓으면 비탈 아래로 굴러가듯, 지금 자리의 기울기를 보고 손실이 줄어드는 쪽으로 가중치를 조금 옮깁니다. 한 번에 옮기는 거리가 "학습률"이에요. 너무 작으면 한참 걸리고, 너무 크면 골짜기를 넘어 튕겨 나가요.',
      deep: '갱신 규칙은 w ← w − η·∂L/∂w이고 η가 학습률입니다. 실제 손실 지형은 수백만~수십억 차원이고 볼록하지 않지만, 고차원에선 나쁜 지역 최소점보다 안장점·평탄 구간이 더 큰 문제로 꼽힙니다. 실무에선 데이터 일부(미니배치)로 기울기를 어림하는 SGD, 모멘텀과 가중치별 보폭 조절을 더한 Adam(흔한 기본 학습률 0.001)을 쓰고, 워밍업 뒤 점점 줄이는 스케줄을 자주 붙입니다.',
      async run(a) {
        wipe(a);
        a.text(250, 40, '손실 언덕 — 알맞은 학습률 (η = 1.0)', { size: 13, weight: 700, color: 'green' });
        const m = hill(a, 50, 450, 370, 280, { color: 'gray', sw: 3 });
        a.text(450, 392, '가중치 w →', { size: 11.5, anchor: 'end', cls: 'muted' });
        a.text(50, 80, '손실 ↑', { size: 11.5, anchor: 'start', cls: 'muted' });
        a.text(m.X(3), 392, '가장 낮은 곳', { size: 11.5, color: 'green', weight: 700 });
        // 알맞은 보폭으로 내려가기
        let w = -0.5;
        const b = ball(a, m.P(w), 'amber', 10);
        const tan = a.raw('line', { style: 'stroke: var(--red); stroke-width: 2.5; stroke-linecap: round; opacity: 0' }, 'pkt');
        const gt = a.text(0, 0, '', { size: 12, mono: true, weight: 700, color: 'red' });
        a.caption('기울기를 보고, 반대쪽으로 한 걸음');
        for (let i = 0; i < 5; i++) {
          const g = GW(w), [px, py] = m.P(w), dx = 34;
          tan.setAttribute('x1', px - dx); tan.setAttribute('x2', px + dx);
          const s = (g * (280 / 4.4)) / ((400) / 8); // 화면 기울기
          tan.setAttribute('y1', py + s * dx); tan.setAttribute('y2', py - s * dx);
          tan.style.opacity = 1;
          gt.setAttribute('x', px + (i === 0 ? 46 : 10)); gt.setAttribute('y', py - 30);
          gt.textContent = i < 3 ? `기울기 ${g.toFixed(2)}` : '';
          await a.wait(i < 2 ? 450 : 200);
          a.raw('circle', { cx: px, cy: py, r: 4, style: 'fill: var(--amber); opacity: .45' }, 'edge');
          const nw = w - 1.0 * g;
          tan.style.opacity = 0;
          await rollTo(a, b, m.P(w), m.P(nw), i < 2 ? 520 : 360);
          w = nw;
        }
        gt.textContent = '';
        a.caption('');
        // 너무 작음 / 너무 큼
        a.zone('zs', 486, 40, 218, 176, { label: '너무 작은 학습률 (η = 0.1)', color: 'amber' });
        a.zone('zb', 486, 232, 218, 176, { label: '너무 큰 학습률 (η = 4.4)', color: 'red' });
        const ms = hill(a, 502, 688, 196, 120);
        const mb = hill(a, 502, 688, 388, 120);
        let ws = -0.5, wb = 1.6;
        const bs = ball(a, ms.P(ws), 'amber', 7);
        const bb = ball(a, mb.P(wb), 'red', 7);
        const run = async (bl, mm, wv, lr, n, dur) => {
          for (let i = 0; i < n; i++) {
            const nw = wv - lr * GW(wv);
            if (nw < -1 || nw > 7) break;
            a.raw('circle', { cx: mm.P(wv)[0], cy: mm.P(wv)[1], r: 3, style: 'fill: var(--muted); opacity: .6' }, 'edge');
            await rollTo(a, bl, mm.P(wv), mm.P(nw), dur);
            wv = nw;
          }
        };
        await a.par(run(bs, ms, ws, 0.1, 8, 300), run(bb, mb, wb, 4.4, 4, 520));
        a.text(595, 72, '한참 걸려요', { size: 12, weight: 700, color: 'amber' });
        a.text(595, 264, '튕기며 점점 멀어져요 (발산)', { size: 12, weight: 700, color: 'red' });
        await a.wait(900);
      },
    },
    {
      t: '오차를 거꾸로 — 역전파',
      easy: '출력에서 생긴 오차를 뒤쪽으로 거슬러 보내면서, 선(가중치) 하나하나가 "이 오차에 내가 얼마나 책임이 있나"를 계산해요. 책임이 큰 가중치일수록 더 많이 고칩니다. 고친 뒤 다시 넣어 보면 사과일 확률이 0.30에서 0.45로 조금 올라가요.',
      deep: '역전파는 연쇄 법칙(∂L/∂w = ∂L/∂ŷ · ∂ŷ/∂h · ∂h/∂w)을 출력층에서 입력 쪽으로 적용해, 모든 가중치의 기울기를 순전파 비용의 몇 배 정도로 한 번에 구합니다. 1986년 Rumelhart·Hinton·Williams의 논문으로 널리 퍼졌고, 지금은 PyTorch 같은 프레임워크의 자동 미분(autograd)이 대신 계산해 줍니다. 깊은 망에선 기울기가 점점 작아지는 문제가 있어 ReLU·잔차 연결·정규화로 완화합니다.',
      async run(a) {
        wipe(a);
        const { e1, e2 } = drawNet(a, RN1, RN2);
        a.setNode('o0', { sub: '0.30', color: 'red' });
        a.setNode('o1', { sub: '0.70', color: 'red' });
        a.zone('fix', 512, 64, 192, 300, { label: '한 번 고친 뒤', color: 'green' });
        a.text(526, 104, '사과일 확률', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        const pt = a.text(608, 134, '0.30', { size: 18, mono: true, weight: 800, color: 'red' });
        a.text(526, 186, '손실', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        const lt = a.text(608, 216, '1.20', { size: 18, mono: true, weight: 800, color: 'red' });
        const err = chip(a, '오차 −0.70', 440, 118, 'red', { h: 24, size: 11.5 });
        await a.flash(err);
        a.caption('오차가 뒤로 흘러가며 가중치마다 책임을 나눠요');
        await backward(a, 750);
        await a.fadeOut(err, 200);
        // 가중치 조금씩 고치기 — 굵기·색이 바뀐다
        a.caption('책임만큼 반대 방향으로 조금씩 수정');
        await a.tween(1000, (k) => {
          HY.forEach((_, j) => IN.forEach((__, i) => e1[j][i].setAttribute('style', wStyle(RN1[j][i] + (UP1[j][i] - RN1[j][i]) * k))));
          OUT.forEach((_, i) => HY.forEach((__, j) => e2[i][j].setAttribute('style', wStyle(RN2[i][j] + (UP2[i][j] - RN2[i][j]) * k))));
        });
        await a.wait(300);
        a.caption('다시 넣어 보면?');
        await forward(a, 'blue', 500);
        a.setNode('o0', { sub: '0.45', color: 'amber' });
        a.setNode('o1', { sub: '0.55', color: 'amber' });
        await a.tween(600, (k) => {
          pt.textContent = (0.3 + 0.15 * k).toFixed(2);
          lt.textContent = (-Math.log(0.3 + 0.15 * k)).toFixed(2);
        });
        pt.setAttribute('class', 'tx tc-amber'); lt.setAttribute('class', 'tx tc-amber');
        a.caption('');
        a.note('n1', 608, 290, '아직 틀렸지만\n조금 나아졌어요', { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '반복, 또 반복 — 에포크',
      easy: '예측 → 손실 재기 → 역전파 → 고치기를 한 바퀴로, 데이터를 바꿔 가며 수없이 되풀이해요. 훈련 데이터 전체를 한 번 다 쓰는 것을 "1 에포크"라고 부릅니다. 반복할수록 손실 그래프가 내려가고 정답률은 올라가요.',
      deep: '보통 데이터를 섞어 미니배치(예: 32~수천 개)로 나누고, 배치마다 한 번씩 가중치를 갱신합니다(1,000개 ÷ 32 ≈ 32번 = 1 에포크). 배치가 바뀔 때마다 기울기 어림이 달라서 손실 곡선은 들쭉날쭉하게 내려갑니다. 작은 문제는 수십~수백 에포크를 돌지만, 대형 언어 모델의 사전학습은 거대한 데이터를 한 번 남짓만 훑는 경우가 많습니다.',
      async run(a) {
        wipe(a);
        const c = chart(a, 70, 460, 74, 350, 1.4);
        a.text(265, 40, '훈련 손실 곡선', { size: 13, weight: 700, cls: 'muted' });
        const path = a.raw('path', { d: '', fill: 'none', style: 'stroke: var(--violet); stroke-width: 2.5; stroke-linejoin: round' }, 'node');
        const dot = a.raw('circle', { r: 5, style: 'fill: var(--violet)' }, 'node');
        // 한 바퀴
        a.zone('loop', 496, 40, 208, 158, { label: '한 바퀴 = 한 번 고치기', color: 'violet' });
        const LOOP = [['예측', 'blue', 548, 92], ['손실', 'red', 652, 92], ['역전파', 'red', 652, 160], ['고치기', 'green', 548, 160]];
        LOOP.forEach(([l, col, x, y], i) => a.node('lp' + i, x, y, { label: l, color: col, w: 76, h: 34, size: 12.5 }));
        a.edge('lp0', 'lp1'); a.edge('lp1', 'lp2'); a.edge('lp2', 'lp3'); a.edge('lp3', 'lp0');
        a.text(520, 234, '에포크', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        a.text(520, 286, '손실', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        a.text(520, 338, '정확도', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        const tE = a.text(690, 234, '0', { size: 18, mono: true, weight: 800, anchor: 'end' });
        const tL = a.text(690, 286, '', { size: 18, mono: true, weight: 800, anchor: 'end', color: 'violet' });
        const tA = a.text(690, 338, '', { size: 18, mono: true, weight: 800, anchor: 'end', color: 'green' });
        a.caption('예측 → 손실 → 역전파 → 고치기, 계속 반복');
        let hop = -1;
        await a.tween(4200, (k) => {
          const e = k * 50, n = Math.floor(e);
          path.setAttribute('d', curvePath(c, trainL, e));
          const v = trainL(n);
          dot.setAttribute('cx', c.X(e)); dot.setAttribute('cy', c.Y(v));
          tE.textContent = String(n);
          tL.textContent = v.toFixed(2);
          tA.textContent = Math.round(accAt(n) * 100) + '%';
          const h = Math.floor(k * 16) % 4;
          if (h !== hop) { if (hop >= 0) a.hl('lp' + hop, false); hop = h; a.hl('lp' + h, true); }
        }, { linear: true });
        if (hop >= 0) a.hl('lp' + hop, false);
        a.caption('');
        a.note('n1', 265, 398, '들쭉날쭉해도 전체적으로 내려가요\n(미니배치마다 기울기가 조금씩 달라서)', { color: 'violet', size: 12 });
        await a.wait(800);
      },
    },
    {
      t: '외우기만 하면 — 과적합',
      easy: '연습 문제의 답만 통째로 외운 학생은 시험에서 처음 보는 문제를 못 풀죠. 신경망도 훈련 데이터만 너무 오래 학습하면 그 데이터는 완벽히 맞히지만, 따로 떼어 둔 검증 데이터에선 오히려 성적이 떨어져요. 그래서 검증 손실이 다시 오르기 시작하면 멈추거나, 데이터를 늘리는 등의 방법을 써요.',
      deep: '데이터를 훈련·검증·테스트로 나누고, 검증 손실이 최저인 지점의 가중치를 고르는 것이 조기 종료입니다. 과적합은 모델의 표현력에 비해 데이터가 적을 때 잘 생기며, 데이터 증강, 가중치 감쇠(L2 정규화), 학습 중 뉴런 일부(예: 10~50%)를 무작위로 끄는 드롭아웃으로 완화합니다. 테스트 데이터는 마지막 평가에만 써야 성능을 부풀리지 않습니다.',
      async run(a) {
        wipe(a);
        const c = chart(a, 70, 460, 74, 350, 1.4);
        a.text(265, 40, '훈련 손실 vs 검증 손실', { size: 13, weight: 700, cls: 'muted' });
        const pT = a.raw('path', { d: '', fill: 'none', style: 'stroke: var(--violet); stroke-width: 2.5; stroke-linejoin: round' }, 'node');
        const pV = a.raw('path', { d: '', fill: 'none', style: 'stroke: var(--amber); stroke-width: 2.5; stroke-linejoin: round' }, 'node');
        a.raw('line', { x1: 300, y1: 96, x2: 324, y2: 96, style: 'stroke: var(--violet); stroke-width: 3' }, 'edge');
        a.text(330, 96, '훈련 데이터', { size: 12, anchor: 'start', weight: 700, layer: 'edge' });
        a.raw('line', { x1: 300, y1: 120, x2: 324, y2: 120, style: 'stroke: var(--amber); stroke-width: 3' }, 'edge');
        a.text(330, 120, '검증 데이터', { size: 12, anchor: 'start', weight: 700, layer: 'edge' });
        await a.tween(3200, (k) => {
          pT.setAttribute('d', curvePath(c, trainL, k * 50));
          pV.setAttribute('d', curvePath(c, valL, k * 50));
        }, { linear: true });
        // 가장 좋은 지점
        let best = 0;
        for (let e = 1; e <= 50; e++) if (valL(e) < valL(best)) best = e;
        const bx = c.X(best), by = c.Y(valL(best));
        a.raw('line', { x1: bx, y1: 140, x2: bx, y2: 350, style: 'stroke: var(--green); stroke-width: 2; stroke-dasharray: 5 5' }, 'edge');
        a.raw('circle', { cx: bx, cy: by, r: 6, style: 'fill: var(--green)' }, 'top');
        a.text(bx + 8, 150, '여기서 멈추기', { size: 12, weight: 800, color: 'green', anchor: 'start' });
        a.text(392, 162, '외우는 중', { size: 12, weight: 800, color: 'red' });
        a.text(392, 180, '검증 손실 ↑', { size: 11.5, color: 'red' });
        a.caption('훈련은 계속 좋아지는데, 처음 보는 데이터에선 나빠져요');
        await a.wait(700);
        a.zone('fx', 496, 40, 208, 330, { label: '막는 방법', color: 'green' });
        const FX = [['데이터 늘리기', '더 많이·더 다양하게'], ['조기 종료', '검증 손실 최저에서'], ['드롭아웃', '뉴런 일부를 꺼 가며']];
        for (let i = 0; i < FX.length; i++) {
          a.node('f' + i, 600, 106 + i * 92, { label: FX[i][0], sub: FX[i][1], color: 'green', w: 176, h: 58, size: 14, hidden: true });
          await a.show('f' + i, 300);
          await a.wait(250);
        }
        a.caption('');
        await a.wait(700);
      },
    },
    {
      t: 'LLM도 같은 원리 — 규모가 다를 뿐',
      easy: 'ChatGPT·Claude 같은 대형 언어 모델(LLM)도 결국 신경망이에요. 사과·귤 대신 "다음에 올 낱말 조각(토큰)"을 맞히고, 틀린 만큼 손실을 재고, 역전파로 가중치를 고칩니다. 다른 점은 가중치가 수십억 개 이상이고, 엄청난 양의 글로 오랫동안 학습한다는 거예요.',
      deep: '사전학습의 목표는 다음 토큰에 대한 교차 엔트로피를 줄이는 것이고, 역전파 + AdamW 같은 경사하강법 계열로 학습합니다. 구조는 트랜스포머이고, 파라미터는 수십억~수천억 개(일부는 조 단위로 추정), 데이터는 수조 토큰 규모이며 GPU 수천 개 이상으로 몇 주~몇 달 학습합니다. 원리는 같지만 이후 지시 학습·선호 학습(RLHF 등)을 더 거치며, 모델이 "이해한다"기보다 거대한 데이터에서 통계적 패턴을 학습한 것이라는 점은 그대로입니다.',
      async run(a) {
        wipe(a);
        a.text(360, 34, '사과·귤 신경망과 대형 언어 모델, 무엇이 같고 다를까', { size: 13, weight: 700, cls: 'muted' });
        a.node('ha', 300, 80, { label: '우리 신경망', sub: '사과·귤 구분', color: 'blue', w: 190, h: 50, size: 14 });
        a.node('hb', 600, 80, { label: '대형 언어 모델', sub: 'LLM', color: 'violet', w: 200, h: 50, size: 14 });
        const ROWS = [
          ['맞히는 것', '사과냐 귤이냐', '다음 토큰', false],
          ['손실', '교차 엔트로피', '교차 엔트로피', true],
          ['고치는 법', '역전파 + 경사하강법', '역전파 + AdamW 등', true],
          ['가중치 수', '22개', '수십억~수천억 개 이상', false],
          ['학습 데이터', '과일 몇 개', '수조 토큰의 글', false],
        ];
        for (let i = 0; i < ROWS.length; i++) {
          const [k, l, r, same] = ROWS[i];
          const y = 146 + i * 50;
          a.raw('line', { x1: 24, y1: y + 25, x2: 696, y2: y + 25, style: 'stroke: var(--line); stroke-width: 1' }, 'edge');
          a.text(36, y, k, { size: 12.5, weight: 700, anchor: 'start', cls: 'muted' });
          const p1 = chip(a, l, 300, y, same ? 'green' : 'blue', { h: 28, hidden: true });
          const p2 = chip(a, r, 600, y, same ? 'green' : 'violet', { h: 28, hidden: true });
          await a.par(a.show(p1, 250), a.show(p2, 250));
          if (same) a.text(450, y, '= 같음', { size: 12, weight: 800, color: 'green' });
          await a.wait(i === 3 ? 500 : 250);
        }
        a.caption('원리는 같고, 규모와 구조가 달라요');
        a.note('n1', 360, 404, '배우는 방법은 똑같이 "틀리고 고치기"의 반복', { color: 'violet' });
        await a.wait(900);
      },
    },
  ],
  quiz: [
    {
      q: '경사하강법에서 학습률(보폭)을 너무 크게 잡으면 어떻게 될까요?',
      c: ['학습이 항상 더 빠르고 정확하게 끝난다', '골짜기를 넘어 튕겨 다니며 손실이 오르내리거나 오히려 커진다', '가중치가 전혀 바뀌지 않는다', '훈련 데이터가 저절로 늘어난다'],
      a: 1,
      why: '한 걸음이 너무 크면 가장 낮은 곳을 지나쳐 반대편으로 넘어갑니다. 그래서 손실이 출렁이거나 점점 커지는(발산) 일이 생겨요. 반대로 너무 작으면 학습이 아주 느립니다.',
      step: 3,
    },
    {
      q: '훈련 손실은 계속 줄어드는데, 검증 손실은 어느 순간부터 다시 올라간다면?',
      c: ['학습률이 너무 작다는 뜻이다', '모델이 아직 하나도 못 배웠다는 뜻이다', '검증 데이터에 정답이 없다는 뜻이다', '훈련 데이터를 외우기 시작한 과적합 신호다'],
      a: 3,
      why: '훈련 데이터에만 지나치게 맞춰지면 처음 보는 데이터(검증)에선 성능이 나빠집니다. 검증 손실이 가장 낮을 때 멈추는 조기 종료, 데이터 늘리기, 드롭아웃 등으로 막아요.',
      step: 6,
    },
    {
      q: '역전파(backpropagation)가 하는 일로 가장 정확한 것은?',
      c: ['연쇄 법칙으로 출력에서 입력 쪽으로 거슬러 가며, 손실에 대한 모든 가중치의 기울기를 구한다', '입력에서 출력으로 예측값을 계산한다', '가장 좋은 학습률을 자동으로 찾아 준다', '가중치를 모두 무작위 값으로 다시 뽑는다'],
      a: 0,
      why: '역전파는 연쇄 법칙(∂L/∂w = ∂L/∂ŷ·∂ŷ/∂h·∂h/∂w)을 출력층부터 거꾸로 적용해 기울기를 효율적으로 계산합니다. 입력→출력 계산은 순전파이고, 그 기울기로 가중치를 실제로 옮기는 것은 경사하강법(옵티마이저)의 몫이에요.',
      step: 4,
    },
  ],
};

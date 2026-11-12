// 뇌와 인공신경망: 부분 대응 → 신호(스파이크 vs 숫자) → 규모·에너지 → 배우는 방식(헵 vs 역전파) → 적은 예시 → 파국적 망각과 재생 → 빌려 온 아이디어·모르는 것
// 단계마다 무대를 새로 그린다. 곡선·점·막대는 설명용 예시 값(고정)이고, 뇌·AI의 숫자는 대략적인 추정치다.
// 그림 말투는 nn.js를 따른다: 인공 뉴런은 보라 원·파랑 입력·청록 가중치 선, 생물 뉴런은 분홍.

const BIO = 'pink', ART = 'violet';

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, id: o.id, hidden: o.hidden, layer: o.layer });
}
const dot = (a, x, y, color, s = 12) => chip(a, '', x, y, color, { w: s, h: s });
const stroke = (c, w) => `fill: none; stroke: var(--${c}); stroke-width: ${w}; stroke-linecap: round; stroke-linejoin: round`;
const softFill = (c, p = 22) => `fill: color-mix(in srgb, var(--${c}) ${p}%, var(--stage)); stroke: var(--${c}); stroke-width: 2`;
/** 퍼져 나가며 사라지는 고리 — 뉴런이 "발화"했다는 표시 */
async function ring(a, x, y, r0, color) {
  const c = a.raw('circle', { cx: x, cy: y, r: r0, style: stroke(color, 2.5) }, 'pkt');
  await a.tween(480, (k) => { c.setAttribute('r', r0 + k * 16); c.style.opacity = 1 - k; });
  c.remove();
}
/** (x,y)에서 원 중심 쪽으로 가다 원 테두리(r)에 닿는 점 */
function toward(x, y, cx, cy, r) {
  const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy);
  return [cx - (dx / d) * r, cy - (dy / d) * r];
}
/** 숨겨 둔 원시 요소들을 한꺼번에 보이게 */
function appear(a, els, dur = 300) {
  const arr = [].concat(els);
  return a.tween(dur, (k) => arr.forEach((e) => (e.style.opacity = k)));
}
const hiddenText = (a, x, y, s, o = {}) => a.text(x, y, s, { ...o, hidden: true });

/* ---------- 1단계: 생물 뉴런 / 인공 뉴런 그림 ---------- */
const SY = 118, AY = 290;
const DEND = [[[64, 74], [122, 96], [176, 110]], [[56, 118], [176, 118]], [[64, 162], [122, 140], [176, 126]]];
const TERM = [[530, 98], [536, 118], [530, 138]];
const NEXT = [[548, 98], [552, 118], [548, 138]];
const INS = [256, 290, 324];
const MAP = [ // [x, 생물 이름, 하는 일, 인공 이름, 인공 설명, 인공 이름 x, 화살표 끝 y]
  [110, '가지돌기', '받기', '입력들', 'x × w', 110, 236],
  [200, '세포체', '모아서 판단', '가중합 + 활성화', 'Σ → f', 241, 258],
  [400, '축삭', '멀리 보내기', '출력 값', '숫자 하나', 400, 276],
  [542, '시냅스', '다음에 건네기', '가중치 w', '연결 세기', 542, 274],
];

function scene1(a) {
  a.text(360, 22, '생물 뉴런과 인공 뉴런 — 부분마다 짝 지어 보기', { size: 13, weight: 700, cls: 'muted' });
  a.text(24, 44, '생물 뉴런', { size: 12.5, weight: 800, anchor: 'start', color: BIO });
  // 가지돌기
  for (const p of DEND) a.raw('polyline', { points: p.map((q) => q.join(',')).join(' '), style: stroke(BIO, 3) }, 'edge');
  for (const d of ['M112 92 L102 68', 'M92 118 L76 100', 'M100 148 L90 162']) a.raw('path', { d, style: stroke(BIO, 2) }, 'edge');
  // 축삭 + 수초 마디
  a.raw('path', { d: `M224 ${SY} L494 ${SY}`, style: stroke(BIO, 4) }, 'edge');
  for (const x of [252, 312, 372, 432]) a.raw('rect', { x, y: SY - 7, width: 40, height: 14, rx: 7, style: softFill(BIO, 26) + '; stroke-width: 1.5' }, 'edge');
  // 축삭 끝 → 시냅스 틈 → 다음 뉴런의 가지돌기
  for (const [x, y] of TERM) {
    a.raw('path', { d: `M494 ${SY} L${x} ${y}`, style: stroke(BIO, 2.5) }, 'edge');
    a.raw('circle', { cx: x, cy: y, r: 5, style: softFill(BIO, 40) + '; stroke-width: 1.5' }, 'node');
  }
  NEXT.forEach(([x, y], i) => a.raw('path', { d: `M${x} ${y} L${622 - (i === 1 ? 4 : 0)} ${SY + (i - 1) * 6}`, style: stroke(BIO, 2.5) }, 'edge'));
  a.raw('path', { d: `M658 ${SY} L700 ${SY}`, style: stroke(BIO, 3) }, 'edge');
  a.raw('circle', { cx: 640, cy: SY, r: 18, style: softFill(BIO) }, 'node');
  a.text(640, 84, '다음 뉴런', { size: 11, cls: 'muted' });
  // 세포체
  a.raw('circle', { cx: 200, cy: SY, r: 24, style: softFill(BIO) }, 'node');
  a.raw('circle', { cx: 200, cy: SY, r: 8, style: `fill: color-mix(in srgb, var(--${BIO}) 55%, var(--stage))` }, 'node');
  // 인공 뉴런 (nn.js와 같은 색)
  a.text(24, 222, '인공 뉴런', { size: 12.5, weight: 800, anchor: 'start', color: ART });
  a.node('sum', 200, AY, { label: 'Σ', color: ART, shape: 'circle', w: 52, size: 20 });
  a.node('f', 282, AY, { label: 'f', sub: '활성화', color: 'teal', w: 64, h: 44, size: 15 });
  a.node('nx', 640, AY, { label: '', color: ART, shape: 'circle', w: 40 });
  a.text(640, 326, '다음 뉴런', { size: 11, cls: 'muted' });
  INS.forEach((y, i) => {
    chip(a, 'x' + '₁₂₃'[i], 70, y, 'blue', { w: 40, h: 26, layer: 'node' });
    a.edge([92, y], 'sum');
  });
  a.edge('sum', 'f');
  a.edge('f', [518, AY]);
  chip(a, '× w', 542, AY, 'amber', { w: 44, h: 26, layer: 'node' });
  a.edge([566, AY], 'nx');
  // 이름표
  for (const [x, bn, bs, an, as, ax] of MAP) {
    a.text(x, 180, bn, { size: 12.5, weight: 800, color: BIO });
    a.text(x, 196, bs, { size: 11, cls: 'muted' });
    a.text(ax, 358, an, { size: 12.5, weight: 800, color: ART });
    a.text(ax, 374, as, { size: 11, cls: 'muted', mono: /[a-zΣ]/.test(as) });
  }
}

/* ---------- 2단계: 스파이크 열 ---------- */
const WEAK = [196, 352, 508], STRONG = [150, 192, 236, 282, 322, 366, 410, 452, 498, 540];
function spikeD(xs, x0, x1, base, h) {
  let d = `M${x0} ${base}`;
  for (const s of xs) d += ` L${s - 3} ${base} L${s} ${base - h} L${s + 3} ${base + 7} L${s + 8} ${base}`;
  return d + ` L${x1} ${base}`;
}

/* ---------- 4단계: 작은 인공 신경망 ---------- */
const N_IN = [[420, 120], [420, 220]], N_H = [[530, 100], [530, 170], [530, 240]], N_OUT = [640, 170];
const V1 = [[0.6, 0.2], [0.3, 0.8], [0.2, 0.5]], V2 = [0.5, 0.3, 0.4];
const U1 = [[0.9, 0.4], [0.1, 1.2], [0.5, 0.2]], U2 = [0.9, 0.1, 0.8];
const wStyle = (w) => `stroke: var(--teal); stroke-width: ${(0.8 + Math.abs(w) * 2.4).toFixed(2)}; opacity: .8; stroke-linecap: round`;

/* ---------- 5단계: 고양이 그림 ---------- */
function cat(a, x, y, s, color, o = {}) {
  const g = a.raw('g', { transform: `translate(${x} ${y}) scale(${s})`, style: o.hidden ? 'opacity: 0' : '' }, o.layer || 'node');
  a.raw('path', { d: 'M-13 -2 L-14 -18 L-5 -10 Q0 -12 5 -10 L14 -18 L13 -2 Q13 12 0 12 Q-13 12 -13 -2 Z', style: `fill: color-mix(in srgb, var(--${color}) 24%, var(--stage)); stroke: var(--${color}); stroke-width: ${2 / s}; stroke-linejoin: round` }, g);
  for (const ex of [-5, 5]) a.raw('circle', { cx: ex, cy: -1, r: 1.7, style: 'fill: var(--node-ink)' }, g);
  a.raw('path', { d: 'M-2 3.5 L2 3.5 L0 5.5 Z', style: `fill: var(--${color})` }, g);
  a.raw('path', { d: 'M-4 6 L-12 5 M-4 7.5 L-12 9.5 M4 6 L12 5 M4 7.5 L12 9.5', style: `stroke: var(--muted); stroke-width: ${0.9 / s}; fill: none` }, g);
  return g;
}

/* ---------- 6단계: 두 과제 정확도 곡선 ---------- */
const A1 = (t) => 0.1 + 0.85 * (1 - Math.exp(-t / 9));
const FORGET = {
  A: (t) => (t <= 50 ? A1(t) : 0.2 + (A1(50) - 0.2) * Math.exp(-(t - 50) / 7)),
  B: (t) => (t <= 50 ? 0.1 : 0.1 + 0.85 * (1 - Math.exp(-(t - 50) / 9))),
};
const REPLAY = {
  A: (t) => (t <= 50 ? A1(t) : A1(50) - 0.09 * (1 - Math.exp(-(t - 50) / 10))),
  B: (t) => (t <= 50 ? 0.1 : 0.1 + 0.75 * (1 - Math.exp(-(t - 50) / 12))),
};
function accChart(a, x0, x1, y0, y1, title, tcolor, phaseB) {
  a.raw('path', { d: `M${x0} ${y0} V${y1} H${x1}`, style: 'fill: none; stroke: var(--line2); stroke-width: 1.5' }, 'edge');
  a.text(x0 - 6, y0 + 4, '100%', { size: 10.5, anchor: 'end', cls: 'muted', mono: true, layer: 'edge' });
  a.text(x0 - 6, y1, '0', { size: 10.5, anchor: 'end', cls: 'muted', mono: true, layer: 'edge' });
  a.text((x0 + x1) / 2, 54, title, { size: 12.5, weight: 800, color: tcolor, layer: 'edge' });
  const X = (t) => x0 + 4 + (t / 100) * (x1 - x0 - 8), Y = (v) => y1 - v * (y1 - y0);
  a.raw('line', { x1: X(50), y1: y0, x2: X(50), y2: y1, style: 'stroke: var(--line2); stroke-width: 1.5; stroke-dasharray: 4 5' }, 'edge');
  a.text(X(25), y1 + 14, 'A만 학습', { size: 11, cls: 'muted', layer: 'edge' });
  a.text(X(75), y1 + 14, phaseB, { size: 11, cls: 'muted', layer: 'edge' });
  const pA = a.raw('path', { d: '', style: stroke('blue', 2.5) }, 'node');
  const pB = a.raw('path', { d: '', style: stroke('amber', 2.5) }, 'node');
  const draw = (fs, upto) => {
    let dA = '', dB = '';
    for (let t = 0; t <= upto; t++) { dA += `${t ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(fs.A(t)).toFixed(1)}`; dB += `${t ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(fs.B(t)).toFixed(1)}`; }
    pA.setAttribute('d', dA); pB.setAttribute('d', dB);
  };
  return { X, Y, draw };
}

export default {
  id: 'brain',
  level: 3,
  cat: 'AI',
  title: '뇌와 인공신경망 — 닮은 점과 다른 점',
  sub: '인공 신경망은 뇌에서 영감을 받았지만 복제품은 아니에요 — 무엇이 닮았고, 무엇이 다르고, 무엇을 아직 모르는지',
  analogy: '새와 비행기를 떠올려 보세요. 사람은 새를 보며 하늘을 나는 꿈을 꾸고 날개라는 아이디어를 빌려 왔지만, 비행기는 날갯짓을 하지 않죠. 인공 신경망도 뇌에서 "연결된 단위들이 연결 세기를 바꾸며 배운다"는 아이디어를 빌려 왔을 뿐, 뇌를 그대로 베낀 것은 아닙니다.',
  keys: [
    '뉴런의 가지돌기·세포체·축삭·시냅스는 인공 뉴런의 입력·가중합과 활성화·출력·가중치와 큰 그림에서 대응한다. 하지만 인공 뉴런은 실제 뉴런을 크게 단순화한 수학 모델이다.',
    '뇌는 크기가 거의 같은 짧은 전기 펄스(스파이크)를 언제·얼마나 자주 보내느냐로 정보를 전하고, 인공 뉴런은 연속적인 숫자 크기로 전한다.',
    '뇌는 뉴런 약 860억 개, 시냅스 약 100조 개 이상(추정)을 약 20W로 움직이고, 큰 AI 학습은 GPU 수천 대 이상과 메가와트급 전력을 쓴다. 다만 시냅스와 가중치는 같은 단위가 아니어서 비교는 거친 어림이다.',
    '뇌는 각 시냅스가 주변 신호만 보고 바뀌는 국소 학습(헵의 규칙, LTP·LTD)을 하고, 인공 신경망은 오차를 뒤로 보내 모든 가중치를 고치는 역전파를 쓴다. 뇌가 경사하강법과 비슷한 일을 하는지는 아직 열린 질문이다.',
    '적은 예시로 배우기, 잊지 않고 계속 배우기는 뇌가 여전히 앞서는 부분이고, AI는 사전학습·경험 재생 등으로 따라가려 한다. AI는 뇌의 복제품이 아니라 뇌에서 영감을 받은 수학이다.',
  ],
  terms: [
    ['뉴런', '신호를 받고 모아 다음 세포로 보내는 신경세포. 사람 뇌에 약 860억 개가 있다고 추정한다'],
    ['시냅스', '뉴런과 뉴런이 만나는 이음매. 주로 화학 물질(신경전달물질)로 신호를 건네며, 그 세기가 바뀌는 것이 학습의 바탕으로 여겨진다'],
    ['스파이크(활동 전위)', '약 1ms 동안 일어나는 짧은 전기 펄스. 문턱을 넘으면 거의 같은 크기로 일어난다'],
    ['시냅스 가소성', '경험에 따라 시냅스의 세기가 강해지거나(LTP, 장기 강화) 약해지는(LTD, 장기 약화) 성질'],
    ['헵의 규칙', '함께 활동하는 뉴런 사이의 연결이 강해진다는 학습 원리(1949). "함께 발화하는 뉴런은 함께 연결된다"로 흔히 요약한다'],
    ['파국적 망각', '인공 신경망을 새 데이터로만 학습시킬 때 이전에 배운 것을 크게 잊어버리는 현상'],
    ['경험 재생', '예전 데이터(경험)를 저장해 두었다가 새 데이터와 섞어 다시 학습하는 방법. 해마의 기억 재생에서 영감을 받았다'],
    ['뉴로모픽 칩', '뇌처럼 스파이크로 계산하도록 설계한 반도체. 특정 작업에서 전력을 크게 줄이는 것이 목표다'],
  ],
  setup(a) {
    scene1(a);
  },
  steps: [
    {
      t: '큰 그림은 닮았다 — 받고, 모으고, 보내기',
      easy: '뇌의 신경세포(뉴런)는 나뭇가지처럼 뻗은 가지돌기로 신호를 받고, 세포체에서 모아 "보낼까 말까"를 정한 뒤, 긴 축삭을 따라 다음 뉴런으로 보냅니다. 인공 뉴런도 입력에 가중치를 곱해 더하고, 활성화 함수를 거쳐 다음으로 넘겨요. 뉴런 사이의 이음매인 시냅스의 세기가 인공 뉴런의 가중치에 해당합니다.',
      deep: '인공 뉴런은 1943년 McCulloch·Pitts의 논리 뉴런 모델과 1958년 Rosenblatt의 퍼셉트론에서 출발했습니다. 다만 이는 큰 단순화예요. 실제 뉴런은 가지돌기 안에서도 국소적인 비선형 계산을 하며, 2021년 한 연구는 피질 뉴런 하나의 입출력을 흉내 내는 데 여러 층짜리 인공 신경망이 필요했다고 보고했습니다. 뉴런 종류도 매우 다양하고, 신경교세포도 신호 처리에 관여한다는 연구가 늘고 있어요.',
      async run(a) {
        wipe(a);
        scene1(a);
        MAP.forEach(([x, , , , , , y2], i) => a.edge([x, 206], [x, y2], { dashed: true, both: true, hidden: true, id: 'm' + i }));
        await a.wait(250);
        // 생물 뉴런: 받고 → 모으고 → 보내기
        a.caption('생물 뉴런: 가지돌기로 받고 → 세포체에서 모으고 → 축삭으로 보내요');
        const ds = DEND.map((p) => [dot(a, p[0][0], p[0][1], BIO, 10), p.slice(1)]);
        await a.par(...ds.map(([p, path]) => a.move(p, path, 700)));
        ds.forEach(([p]) => a.remove(p));
        await ring(a, 200, SY, 24, BIO);
        const sp = dot(a, 226, SY, 'amber', 12);
        await a.move(sp, [494, SY], 600);
        a.remove(sp);
        const ts = TERM.map(([x, y]) => [dot(a, 494, SY, 'amber', 9), [x, y]]);
        await a.par(...ts.map(([p, to]) => a.move(p, to, 300)));
        ts.forEach(([p]) => a.remove(p));
        // 시냅스 틈: 화학 물질이 건너간다
        const ch = TERM.map(([x, y], i) => [dot(a, x + 5, y, 'teal', 6), [NEXT[i][0] - 1, NEXT[i][1]]]);
        await a.par(...ch.map(([p, to]) => a.move(p, to, 350)));
        ch.forEach(([p]) => a.remove(p));
        await ring(a, 640, SY, 18, BIO);
        // 인공 뉴런: 곱하고 → 더하고 → 넘기기
        a.caption('인공 뉴런: 입력 × 가중치를 더하고 → 활성화 → 숫자 하나를 넘겨요');
        const xs = INS.map((y) => [dot(a, 92, y, 'blue', 10), toward(92, y, 200, AY, 30)]);
        await a.par(...xs.map(([p, to]) => a.move(p, to, 600)));
        xs.forEach(([p]) => a.remove(p));
        a.hl('sum', true);
        await a.wait(220);
        a.hl('sum', false);
        a.hl('f', true);
        await a.wait(220);
        a.hl('f', false);
        const y = chip(a, '0.7', 336, AY, 'violet', { w: 40, h: 24 });
        await a.move(y, [496, AY], 600);
        await a.fadeOut(y, 150);
        const yw = dot(a, 566, AY, 'violet', 10);
        await a.move(yw, [616, AY], 300);
        a.remove(yw);
        await ring(a, 640, AY, 20, ART);
        // 짝 짓기
        a.caption('부분마다 짝을 지어 보면');
        for (let i = 0; i < MAP.length; i++) { await a.show('m' + i, 220); }
        a.caption('');
        a.note('n1', 360, 412, '큰 그림만 닮았어요 — 진짜 뉴런은 훨씬 복잡한 계산을 해요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '신호 방식 — 펄스의 리듬 vs 연속 숫자',
      easy: '뇌의 뉴런은 약 1ms(1000분의 1초) 동안 번쩍하는 짧은 전기 펄스, "스파이크"를 보냅니다. 펄스의 크기는 거의 같아서, 정보는 "얼마나 자주, 언제" 보내느냐에 담겨요(뉴런 사이 시냅스에서는 화학 물질이 신호를 건넵니다). 인공 뉴런은 계산할 때마다 0.74 같은 숫자를 그대로 넘깁니다.',
      deep: '활동 전위는 문턱을 넘으면 거의 같은 크기로 일어나는 전부-아니면-전무(all-or-none) 현상이고, 지속 시간은 약 1~2ms입니다. 대부분의 피질 뉴런은 평소 초당 몇 번 이하로 발화하지만, 빠른 뉴런은 초당 수백 번까지 발화합니다. 정보가 발화 빈도(rate code)에 담기는지 정확한 타이밍(temporal code)에 담기는지는 영역과 상황마다 다르다고 보며 지금도 연구 중이에요. 스파이크로 계산하는 스파이킹 신경망(SNN)도 활발한 연구 분야입니다.',
      async run(a) {
        wipe(a);
        a.text(360, 22, '신호를 보내는 방식이 달라요', { size: 13, weight: 700, cls: 'muted' });
        a.zone('zt', 16, 40, 688, 220, { label: '뇌 — 스파이크: 짧은 전기 펄스 (그림은 시간을 크게 늘림)', color: BIO });
        const cp = a.raw('clipPath', { id: 'brain-clip' }, 'edge');
        const cr = a.raw('rect', { x: 126, y: 40, width: 0, height: 220 }, cp);
        const ROWS = [[WEAK, 136, '약한 자극'], [STRONG, 226, '강한 자극']];
        const counts = ROWS.map(([xs, base, l]) => {
          a.text(36, base - 20, l, { size: 12.5, weight: 700, anchor: 'start' });
          a.raw('line', { x1: 130, y1: base, x2: 600, y2: base, style: 'stroke: var(--line2); stroke-width: 1; stroke-dasharray: 3 5' }, 'edge');
          a.raw('path', { d: spikeD(xs, 130, 600, base, 46), 'clip-path': 'url(#brain-clip)', style: stroke(BIO, 2) }, 'node');
          return a.text(688, base - 20, '', { size: 15, weight: 800, anchor: 'end', color: BIO });
        });
        a.text(688, 92, '펄스 수', { size: 11, anchor: 'end', cls: 'muted' });
        a.caption('펄스의 높이는 같고, 개수(리듬)가 달라요');
        await a.tween(3000, (k) => {
          const x = 130 + k * 470;
          cr.setAttribute('width', x - 126);
          ROWS.forEach(([xs], i) => { counts[i].textContent = xs.filter((s) => s <= x).length + '번'; });
        }, { linear: true });
        a.text(206, 80, '← 펄스 하나 ≈ 1ms', { size: 11, anchor: 'start', cls: 'muted' });
        a.text(600, 246, '시간 →', { size: 11, anchor: 'end', cls: 'muted' });
        a.text(330, 246, '시냅스에서는 화학 물질(신경전달물질)이 신호를 건네요', { size: 11, cls: 'muted' });
        // 인공 뉴런: 숫자 그대로
        a.zone('zb', 16, 274, 688, 112, { label: '인공 뉴런 — 계산할 때마다 숫자를 그대로', color: ART });
        a.node('na', 100, 332, { label: '', color: ART, shape: 'circle', w: 40 });
        a.node('nb', 620, 332, { label: '', color: ART, shape: 'circle', w: 40 });
        a.edge('na', 'nb');
        a.text(360, 366, '크기 자체가 정보 — 0.31보다 0.74가 더 센 신호', { size: 11.5, cls: 'muted' });
        a.caption('인공 뉴런은 0과 1 사이 어떤 숫자든 그대로 넘겨요');
        for (const v of ['0.31', '0.74', '0.58']) {
          const p = chip(a, v, 146, 332, 'violet', { w: 48, h: 24 });
          await a.move(p, [570, 332], 650);
          if (v !== '0.58') await a.fadeOut(p, 150);
        }
        a.caption('');
        a.note('n1', 360, 412, '뇌는 "언제·얼마나 자주", 인공 뉴런은 "숫자의 크기"로 세기를 전해요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '규모와 에너지 — 860억 개의 뉴런, 약 20와트',
      easy: '사람 뇌에는 뉴런이 약 860억 개, 그 사이 연결(시냅스)은 대략 100조 개 이상 있다고 추정해요. 그런데도 전구 하나 정도인 약 20W로 돌아갑니다(몸무게의 약 2%인데 몸 에너지의 약 20%를 써요). 큰 AI는 학습에 GPU 수천 대 이상을 몇 주~몇 달 돌리며 메가와트급 전기를 씁니다.',
      deep: '860억은 2009년 Azevedo 연구진의 추정이고, 시냅스 수는 10¹⁴~10¹⁵개 정도로 추정 폭이 넓습니다. 뉴런은 밀리초 단위로 느리지만 엄청나게 병렬로 일하고, GPU는 GHz 클럭으로 빠르지만 데이터를 메모리와 연산 장치 사이로 옮기는 데 에너지를 많이 씁니다. 시냅스 하나는 화학적·시간적 특성을 지닌 복잡한 장치라 가중치 하나와 같지 않아서, "파라미터 수 vs 시냅스 수" 비교는 아주 거친 어림일 뿐이에요.',
      async run(a) {
        wipe(a);
        a.text(360, 22, '규모와 에너지 — 대략의 숫자로 보기', { size: 13, weight: 700, cls: 'muted' });
        a.zone('zl', 16, 40, 336, 240, { label: '뇌 (어른 기준, 추정치)', color: BIO });
        a.zone('zr', 368, 40, 336, 240, { label: '큰 AI 학습 (대략, 모델마다 다름)', color: ART });
        const L = [['뉴런', '약 860억 개'], ['시냅스', '약 100조 개 이상'], ['전력', '약 20W'], ['발화', '초당 수~수백 번']];
        const R = [['가중치', '수십억~수천억 개+'], ['장비', 'GPU 수천 대 이상'], ['전력', '메가와트(MW)급'], ['연산 속도', 'GHz (초당 10억 번대)'], ['기간', '수 주~수 달']];
        const rowEls = (rows, xk, xv, color) => rows.map(([k, v], i) => [
          hiddenText(a, xk, 80 + i * 34, k, { size: 12, weight: 700, anchor: 'start', cls: 'muted' }),
          hiddenText(a, xv, 80 + i * 34, v, { size: 14, weight: 800, anchor: 'end', color }),
        ]);
        const le = rowEls(L, 34, 334, BIO), re = rowEls(R, 386, 686, ART);
        for (let i = 0; i < 5; i++) {
          await a.par(...(le[i] || []).map((e) => a.show(e, 250)), ...re[i].map((e) => a.show(e, 250)));
          await a.wait(180);
        }
        // 몸무게 2% / 에너지 20%
        const mini = [['몸무게 중', 0.02, '약 2%', 222], ['에너지 중', 0.2, '약 20%', 252]];
        const mb = mini.map(([l, v, s, y]) => {
          a.text(34, y, l, { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
          a.text(334, y, s, { size: 13, weight: 800, anchor: 'end', color: BIO });
          return [a.bar('mb' + y, 106, y, 170, { color: BIO }), v];
        });
        await a.par(...mb.map(([b, v]) => b.set(v, 700)));
        // 전력 로그 막대
        a.text(24, 302, '전력 비교 — 로그 눈금 (한 칸마다 1000배)', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        const X = (w) => 132 + Math.log10(w) * 62;
        for (const [w, s] of [[1, '1W'], [1e3, '1kW'], [1e6, '1MW']]) {
          a.raw('line', { x1: X(w), y1: 314, x2: X(w), y2: 380, style: 'stroke: var(--line2); stroke-width: 1; stroke-dasharray: 3 4' }, 'edge');
          a.text(X(w), 390, s, { size: 10.5, cls: 'muted', mono: true });
        }
        const PW = [['뇌', 20, '약 20W', BIO], ['GPU 1대', 700, '수백 W~1kW', ART], ['학습 클러스터', 1e7, '수 MW 이상', ART]];
        a.caption('뇌 하나 vs GPU 한 대 vs 학습용 GPU 수천 대');
        for (let i = 0; i < PW.length; i++) {
          const [l, w, s, c] = PW[i], y = 324 + i * 24;
          a.text(122, y, l, { size: 12, weight: 700, anchor: 'end' });
          const r = a.raw('rect', { x: X(1), y: y - 7, width: 0, height: 14, rx: 4, style: `fill: var(--${c})` }, 'node');
          await a.tween(500, (k) => r.setAttribute('width', (X(w) - X(1)) * k));
          a.text(X(w) + 8, y, s, { size: 12, weight: 800, anchor: 'start', color: c });
        }
        a.caption('');
        a.note('n1', 360, 418, '단위가 달라요 — 시냅스 1개 ≠ 가중치 1개, 대략의 비교일 뿐', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '배우는 방식 — 함께 발화하면 연결된다 vs 역전파',
      easy: '뇌는 시냅스의 세기를 바꾸며 배워요(시냅스 가소성). "함께 발화하는 뉴런은 함께 연결된다"는 헵의 규칙처럼, 각 시냅스는 바로 양옆 뉴런의 신호만 보고 강해지거나 약해집니다. 인공 신경망은 출력에서 생긴 오차를 뒤로 보내(역전파) 모든 가중치를 한꺼번에 고쳐요.',
      deep: '1949년 헵이 제안한 생각은 1973년 해마에서 발견된 장기 강화(LTP)와 장기 약화(LTD)로 뒷받침되었고, 앞뒤 뉴런 발화의 밀리초 순서에 따라 강화·약화가 갈리는 STDP도 알려져 있습니다. 역전파를 뇌가 그대로 쓰기 어렵다고 보는 이유로는 오차를 거꾸로 보낼 때 앞 방향과 똑같은 가중치를 알아야 한다는 "가중치 운반 문제", 계산과 분리된 역방향 단계가 필요하다는 점 등이 꼽힙니다. 무작위 피드백으로도 학습되는 feedback alignment, 예측 부호화 같은 대안이 연구되지만, 뇌가 경사하강법에 가까운 무언가를 하는지는 아직 열린 질문이에요.',
      async run(a) {
        wipe(a);
        a.text(360, 22, '연결 세기를 고치는 방법', { size: 13, weight: 700, cls: 'muted' });
        a.zone('zl', 16, 40, 336, 340, { label: '뇌 — 시냅스 가소성 (국소 학습)', color: BIO });
        a.zone('zr', 368, 40, 336, 340, { label: '인공 신경망 — 역전파 (전체를 한꺼번에)', color: ART });
        // 왼쪽: A·B·C 뉴런
        const ab = a.raw('line', { x1: 106, y1: 130, x2: 254, y2: 130, style: stroke(BIO, 3) }, 'edge');
        const cb = a.raw('line', { x1: 102, y1: 237, x2: 258, y2: 143, style: stroke(BIO, 7) }, 'edge');
        a.node('A', 80, 130, { label: 'A', color: BIO, shape: 'circle', w: 48, size: 16 });
        a.node('B', 280, 130, { label: 'B', color: BIO, shape: 'circle', w: 48, size: 16 });
        a.node('C', 80, 250, { label: 'C', color: BIO, shape: 'circle', w: 48, size: 16 });
        a.text(184, 296, '함께 발화하는 뉴런은 함께 연결된다', { size: 13, weight: 800 });
        a.text(184, 316, '— 헵의 규칙(1949)을 요약한 말', { size: 11, cls: 'muted' });
        a.text(184, 348, '각 시냅스는 양옆 뉴런의 신호만 보고 바뀌어요', { size: 12, weight: 700, color: BIO });
        // 오른쪽: 작은 신경망
        const e1 = N_H.map(([hx, hy], j) => N_IN.map(([x, y], k) => a.raw('line', { x1: x + 18, y1: y, x2: hx - 18, y2: hy, style: wStyle(V1[j][k]) }, 'edge')));
        const e2 = N_H.map(([hx, hy], j) => a.raw('line', { x1: hx + 18, y1: hy, x2: N_OUT[0] - 22, y2: N_OUT[1], style: wStyle(V2[j]) }, 'edge'));
        N_IN.forEach(([x, y], k) => a.node('ni' + k, x, y, { label: '', color: 'blue', shape: 'circle', w: 32 }));
        N_H.forEach(([x, y], j) => a.node('nh' + j, x, y, { label: '', color: ART, shape: 'circle', w: 32 }));
        a.node('no', N_OUT[0], N_OUT[1], { label: '', color: 'green', shape: 'circle', w: 40 });
        a.text(420, 254, '입력', { size: 11, cls: 'muted' });
        a.text(640, 208, '출력', { size: 11, cls: 'muted' });
        a.text(536, 296, '출력의 오차를 뒤로 보내', { size: 13, weight: 800 });
        a.text(536, 316, '모든 가중치를 한꺼번에 고쳐요', { size: 13, weight: 800 });
        a.text(536, 348, '정답과 비교한 오차 + 거꾸로 가는 계산이 필요', { size: 12, weight: 700, color: ART });
        // 헵: A와 B가 함께 발화 → A–B 연결이 굵어진다
        a.caption('A와 B가 함께 발화하면… A–B 연결이 강해져요');
        let wab = 3;
        for (let i = 0; i < 3; i++) {
          a.hl('A', true); a.hl('B', true);
          await a.par(ring(a, 80, 130, 24, BIO), ring(a, 280, 130, 24, BIO));
          a.hl('A', false); a.hl('B', false);
          const w0 = wab; wab += 2;
          await a.tween(260, (k) => ab.style.strokeWidth = w0 + 2 * k);
        }
        a.text(180, 110, '강해짐 (LTP)', { size: 12, weight: 800, color: 'green' });
        a.caption('C는 B와 따로 발화해요… C–B 연결은 약해지기도');
        let wcb = 7;
        for (let i = 0; i < 2; i++) {
          a.hl('C', true);
          await ring(a, 80, 250, 24, BIO);
          a.hl('C', false);
          const w0 = wcb; wcb -= 2.5;
          await a.tween(260, (k) => cb.style.strokeWidth = w0 - 2.5 * k);
        }
        a.text(198, 214, '약해짐 (LTD)', { size: 12, weight: 800, color: 'red', anchor: 'start' });
        // 역전파
        a.caption('인공 신경망: 앞으로 계산하고, 오차를 뒤로 보내요');
        const f1 = [];
        N_H.forEach(([hx, hy]) => N_IN.forEach(([x, y]) => f1.push([dot(a, x + 18, y, 'blue', 10), [hx - 18, hy]])));
        await a.par(...f1.map(([p, to]) => a.move(p, to, 500)));
        f1.forEach(([p]) => a.remove(p));
        const f2 = N_H.map(([hx, hy]) => [dot(a, hx + 18, hy, 'blue', 10), [N_OUT[0] - 22, N_OUT[1]]]);
        await a.par(...f2.map(([p, to]) => a.move(p, to, 450)));
        f2.forEach(([p]) => a.remove(p));
        const err = chip(a, '오차', N_OUT[0], 128, 'red', { h: 24, size: 11.5 });
        await a.flash(err);
        const b2 = N_H.map(([hx, hy]) => [dot(a, N_OUT[0] - 22, N_OUT[1], 'red', 10), [hx + 18, hy]]);
        await a.par(...b2.map(([p, to]) => a.move(p, to, 450)));
        b2.forEach(([p]) => a.remove(p));
        const b1 = [];
        N_H.forEach(([hx, hy]) => N_IN.forEach(([x, y]) => b1.push([dot(a, hx - 18, hy, 'red', 10), [x + 18, y]])));
        await a.par(...b1.map(([p, to]) => a.move(p, to, 500)));
        b1.forEach(([p]) => a.remove(p));
        await a.tween(700, (k) => {
          N_H.forEach((_, j) => {
            N_IN.forEach((__, i) => e1[j][i].setAttribute('style', wStyle(V1[j][i] + (U1[j][i] - V1[j][i]) * k)));
            e2[j].setAttribute('style', wStyle(V2[j] + (U2[j] - V2[j]) * k));
          });
        });
        await a.fadeOut(err, 200);
        a.caption('');
        a.note('n1', 360, 412, '뇌가 역전파 비슷한 일을 하는지는 아직 열린 질문이에요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '적은 예시로 배우기 — 아이와 신경망',
      easy: '아이는 고양이를 몇 번만 보고도 처음 보는 고양이를 알아보는 경우가 많아요. 처음부터 배우는 신경망은 보통 수천~수백만 장의 사진이 필요하고요. 이유로는 진화가 준 타고난 구조, 몸으로 세상을 만지며 배우는 경험, 이미 아는 것 위에 쌓는 능력 등이 꼽힙니다.',
      deep: 'AI도 비슷한 길을 씁니다. 거대한 데이터로 먼저 사전학습한 모델은 예시 몇 개만 보여 줘도(퓨샷) 새 일을 꽤 해내고, 다른 일에서 배운 특징을 옮겨 쓰는 전이 학습도 흔해요(대표 데이터셋 ImageNet의 학습용 사진은 약 128만 장). 다만 비교는 조심해야 합니다. 아이는 깨어 있는 동안 끊임없이 장면을 보며 몇 년에 걸쳐 세상을 경험하므로, 무엇을 "예시 하나"로 세느냐에 따라 결론이 달라져요.',
      async run(a) {
        wipe(a);
        a.text(360, 22, '고양이를 알아보려면 몇 장이 필요할까?', { size: 13, weight: 700, cls: 'muted' });
        a.zone('zl', 16, 40, 336, 240, { label: '아이', color: BIO });
        a.zone('zr', 368, 40, 336, 240, { label: '신경망 (처음부터 학습할 때)', color: ART });
        a.node('kid', 64, 160, { label: '아이', color: BIO, shape: 'person', w: 70, h: 38, size: 14 });
        // 오른쪽 격자(사진 자리)
        const cells = [];
        for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) cells.push(a.raw('rect', { x: 419 + c * 20, y: 74 + r * 18, width: 14, height: 12, rx: 3, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1' }, 'node'));
        const cnt = a.text(536, 204, '0장', { size: 15, weight: 800, color: ART, mono: true });
        a.text(386, 246, '알아보는 정도', { size: 11, weight: 700, anchor: 'start', cls: 'muted' });
        const acc = a.bar('acc', 466, 246, 210, { color: ART });
        // 아이: 세 마리 보고 → 처음 보는 고양이를 알아봄
        a.caption('아이가 고양이를 몇 번 봐요');
        const cats = [[150, 'amber'], [210, 'gray'], [270, 'teal']].map(([x, c]) => cat(a, x, 102, 1.5, c, { hidden: true }));
        for (const g of cats) { await appear(a, g, 300); await a.wait(200); }
        a.text(210, 136, '본 고양이 3마리', { size: 11, cls: 'muted' });
        await a.wait(300);
        const nc = cat(a, 210, 196, 1.7, 'violet', { hidden: true });
        await appear(a, nc, 300);
        a.text(210, 234, '처음 보는 고양이', { size: 11, cls: 'muted' });
        a.hl('kid', true);
        a.note('n0', 66, 214, '고양이다!', { color: 'green' });
        await a.wait(400);
        a.hl('kid', false);
        a.text(184, 262, '몇 번만 봐도 알아보는 경우가 많아요', { size: 12, weight: 700, color: BIO });
        // 신경망: 사진이 엄청 많이 필요
        a.caption('처음부터 배우는 신경망은 훨씬 많은 사진이 필요해요');
        await a.tween(2000, (k) => {
          const n = Math.floor(k * cells.length);
          cells.forEach((c, i) => c.setAttribute('style', i < n ? `fill: color-mix(in srgb, var(--${ART}) 45%, var(--stage)); stroke: var(--${ART}); stroke-width: 1` : 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1'));
          cnt.textContent = Math.round(Math.pow(10, k * 6)).toLocaleString('en-US') + '장';
          acc.f.setAttribute('width', 210 * 0.9 * (1 - Math.exp(-k * 3)) / (1 - Math.exp(-3)));
        }, { linear: true });
        cnt.textContent = '수천~수백만 장';
        // 이유(가설)와 AI 쪽 대응
        a.text(24, 302, '왜 다를까? — 꼽히는 이유 (가설)', { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
        const WHY = [['타고난 구조', '진화가 준 출발점'], ['몸으로 배우기', '만지고 움직이며'], ['쌓아 올리기', '아는 것 위에 새것']];
        for (let i = 0; i < 3; i++) {
          a.node('w' + i, 130 + i * 230, 338, { label: WHY[i][0], sub: WHY[i][1], color: BIO, w: 200, h: 46, size: 13.5, hidden: true });
          await a.show('w' + i, 250);
        }
        a.text(24, 404, 'AI 쪽 대응', { size: 12, weight: 800, anchor: 'start', color: ART });
        const c1 = chip(a, '사전학습 후 적은 예시(퓨샷)', 250, 404, ART, { h: 26, hidden: true });
        const c2 = chip(a, '전이 학습', 446, 404, ART, { h: 26, hidden: true });
        await a.par(a.show(c1, 300), a.show(c2, 300));
        a.caption('');
        await a.wait(900);
      },
    },
    {
      t: '잊지 않고 계속 배우기 — 파국적 망각과 재생',
      easy: '고양이를 잘 알아보던 신경망을 개 사진으로만 계속 학습시키면, 고양이 실력이 크게 무너질 수 있어요. 이를 "파국적 망각"이라고 합니다. 사람은 새것을 배워도 옛 기억이 대체로 남고, 잠자는 동안 해마가 낮의 경험을 되풀이(재생)하며 기억을 정리한다는 연구가 있어요. AI도 옛 데이터를 섞어 다시 보는 방법을 빌려 왔습니다.',
      deep: '파국적 망각은 1989년 McCloskey·Cohen이 보고했고, 여러 과제가 같은 가중치를 공유하다 새 과제 쪽으로 덮어쓰이기 때문에 생깁니다. 쥐의 해마에서는 낮에 지나간 길의 순서대로 활동하던 세포들이 잠잘 때 같은 순서로, 몇 배 빠르게 다시 활동하는 "재생"이 관찰되었어요. 해마가 빨리 배우고 대뇌 피질이 재생을 통해 천천히 통합한다는 보완 학습 시스템 이론(1995)은 유력하지만 여전히 가설입니다. AI에선 경험 재생(2015년 DQN 등), 중요한 가중치는 덜 바꾸게 하는 EWC(2017) 같은 방법을 쓰지만, 계속 학습(continual learning)은 아직 완전히 풀리지 않았습니다.',
      async run(a) {
        wipe(a);
        const L = accChart(a, 64, 334, 76, 236, '새 과제(B)로만 학습', 'red', 'B만 학습');
        const R = accChart(a, 414, 684, 76, 236, '옛 데이터(A)도 섞어 학습', 'green', 'B + 옛 A 조금');
        a.raw('line', { x1: 196, y1: 274, x2: 220, y2: 274, style: stroke('blue', 3) }, 'edge');
        a.text(226, 274, 'A 과제 정확도 (예: 고양이)', { size: 11.5, anchor: 'start', weight: 700 });
        a.raw('line', { x1: 410, y1: 274, x2: 434, y2: 274, style: stroke('amber', 3) }, 'edge');
        a.text(440, 274, 'B 과제 정확도 (예: 개)', { size: 11.5, anchor: 'start', weight: 700 });
        a.caption('A를 배운 뒤 B를 배워요 — 왼쪽은 B만, 오른쪽은 A도 조금씩 섞어서');
        await a.tween(3400, (k) => { L.draw(FORGET, Math.floor(k * 100)); R.draw(REPLAY, Math.floor(k * 100)); }, { linear: true });
        a.text(L.X(78), L.Y(0.2) + 18, 'A를 크게 잊음', { size: 12, weight: 800, color: 'red' });
        a.text(R.X(76), R.Y(0.3), '둘 다 대체로 유지', { size: 12, weight: 800, color: 'green' });
        a.caption('');
        await a.wait(400);
        // 뇌: 해마의 재생
        a.zone('zb', 16, 294, 688, 96, { label: '뇌는? — 잠자는 동안 해마가 낮의 경험을 "재생"', color: BIO });
        a.text(36, 340, '낮: 길을 지나며', { size: 12, weight: 700, anchor: 'start' });
        a.text(380, 340, '잠: 같은 순서를 빠르게', { size: 12, weight: 700, anchor: 'start' });
        const mk = (x0) => [0, 1, 2, 3].map((i) => {
          const c = a.raw('circle', { cx: x0 + i * 32, cy: 340, r: 9, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5' }, 'node');
          a.text(x0 + i * 32, 340, String(i + 1), { size: 10, weight: 700, cls: 'muted', mono: true });
          return c;
        });
        const day = mk(176), night = mk(558);
        const lit = (c, on) => c.setAttribute('style', on ? `fill: var(--${BIO}); stroke: var(--${BIO}); stroke-width: 1.5` : 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5');
        for (const c of day) { lit(c, true); await a.wait(320); lit(c, false); }
        for (let r = 0; r < 2; r++) for (const c of night) { lit(c, true); await a.wait(90); lit(c, false); }
        a.text(360, 372, '같은 순서의 활동이 빠르게 되풀이되는 현상이 관찰돼요 — 기억 정리에 도움을 준다고 봐요(연구 중)', { size: 11, cls: 'muted' });
        a.note('n1', 360, 414, 'AI가 빌려 온 해법: 옛 데이터를 섞어 다시 보기 (경험 재생)', { color: 'green' });
        await a.wait(900);
      },
    },
    {
      t: '빌려 온 아이디어 · 아직 모르는 것',
      easy: '고양이 시각 피질 연구에서 합성곱 신경망이, 해마의 재생에서 경험 재생이 영감을 얻었어요. 반면 트랜스포머의 "어텐션"은 이름만 빌린 수학 계산이지 사람의 주의를 흉내 낸 모델이 아니고, 의식이나 기억의 저장 방식, 뇌의 학습 규칙은 아직 모릅니다. AI는 뇌의 복제품이 아니라 뇌에서 영감을 받은 수학이에요.',
      deep: 'Hubel·Wiesel(1959~62)은 고양이 시각 피질의 뉴런이 시야의 좁은 영역(수용장)에서 특정 방향의 선분에 반응하고 단순 세포 → 복잡 세포로 쌓인다는 것을 밝혀 1981년 노벨상을 받았습니다. 이를 본뜬 후쿠시마의 네오코그니트론(1980)에 LeCun 등이 역전파 학습을 더한 것이 합성곱 신경망(1989~)이에요. 스파이크로 계산하는 뉴로모픽 칩(IBM TrueNorth, Intel Loihi 등)은 특정 작업의 저전력을 노립니다. 기억이 특정 세포 집단(엔그램)에 담긴다는 증거가 쌓이고 있지만 전체 그림은 아직 연구 중입니다.',
      async run(a) {
        wipe(a);
        a.text(170, 46, '뇌 연구에서', { size: 12.5, weight: 800, color: BIO });
        a.text(530, 46, 'AI 기술로', { size: 12.5, weight: 800, color: ART });
        const ROWS = [
          ['시각 피질의 수용장 (1959~)', '합성곱 신경망 (1980~)', false],
          ['해마의 기억 재생', '경험 재생', false],
          ['주의 (attention)', '어텐션 — 이름만 빌림', true],
          ['스파이크 신호', '뉴로모픽 칩 (저전력)', false],
        ];
        a.caption('뇌에서 영감을 받은 아이디어들');
        for (let i = 0; i < ROWS.length; i++) {
          const [l, r, loose] = ROWS[i], y = 76 + i * 38;
          a.node('l' + i, 170, y, { label: l, color: BIO, w: 260, h: 32, size: 12.5, hidden: true });
          a.node('r' + i, 530, y, { label: r, color: loose ? 'gray' : ART, w: 260, h: 32, size: 12.5, hidden: true });
          a.edge('l' + i, 'r' + i, { dashed: loose, id: 'e' + i, hidden: true });
          await a.show('l' + i, 220);
          await a.show('e' + i, 200);
          await a.show('r' + i, 220);
          await a.wait(160);
        }
        a.text(360, 224, '어텐션은 실제 뇌의 주의를 본뜬 모델이 아니라 느슨하게 이름 붙인 수학', { size: 11, cls: 'muted' });
        // 아직 모르는 것
        a.zone('zq', 16, 242, 688, 116, { label: '아직 모르는 것', color: 'amber' });
        const Q = [['의식', '어떻게 생겨날까?'], ['기억의 저장', '어디에, 어떤 형태로?'], ['뇌의 학습 규칙', '역전파와 닮았을까?']];
        a.caption('그리고 아직 풀리지 않은 질문들');
        for (let i = 0; i < Q.length; i++) {
          a.node('q' + i, 130 + i * 230, 304, { label: Q[i][0], sub: Q[i][1], color: 'amber', w: 200, h: 54, size: 14, hidden: true });
          await a.show('q' + i, 280);
          await a.wait(150);
        }
        a.caption('');
        a.note('n1', 360, 400, 'AI는 뇌의 복제품이 아니라 "뇌에서 영감 받은 수학" — 그래도 둘 다 놀라워요', { color: 'violet' });
        await a.wait(1000);
      },
    },
  ],
  quiz: [
    {
      q: '인공 뉴런의 "가중치"에 가장 가깝게 대응하는 뇌의 부분은?',
      c: ['세포체 — 신호를 모으는 곳', '축삭 — 신호를 멀리 보내는 긴 줄기', '시냅스의 세기 — 뉴런과 뉴런 사이 연결이 얼마나 강한지', '뇌 전체의 크기'],
      a: 2,
      why: '가중치는 한 뉴런의 출력이 다음 뉴런에 얼마나 크게 전해질지 정하는 연결 세기이고, 뇌에서는 시냅스의 세기가 이 역할에 가깝습니다. 다만 실제 시냅스는 화학적·시간적 특성을 지닌 복잡한 장치라 숫자 하나와 똑같지는 않아요.',
      step: 0,
    },
    {
      q: '고양이를 잘 알아보던 신경망을 개 사진만으로 계속 학습시켰더니 고양이를 잘 못 알아보게 됐습니다. 이 현상과 흔한 대처로 알맞은 것은?',
      c: ['파국적 망각 — 예전 데이터를 조금씩 섞어 함께 학습한다(경험 재생)', '과적합 — 학습을 처음부터 다시 하면 저절로 해결된다', '환각 — 온도를 낮추면 해결된다', '정상적인 일 — 신경망은 원래 한 번에 한 가지만 기억할 수 있다'],
      a: 0,
      why: '새 데이터로만 학습하면 같은 가중치가 새 과제 쪽으로 덮어쓰여 옛 실력이 크게 무너지는데, 이를 파국적 망각이라고 합니다. 옛 데이터를 섞어 다시 보는 경험 재생, 중요한 가중치를 덜 바꾸게 하는 EWC 같은 방법으로 줄여요. 해마의 재생에서 영감을 받은 아이디어입니다.',
      step: 5,
    },
    {
      q: '역전파를 "뇌가 그대로 쓰는 학습 방법"으로 보기 어렵다는 주장의 근거로 거론되는 것은?',
      c: ['뇌에는 전기 신호가 전혀 없기 때문', '뇌의 시냅스는 한번 생기면 세기가 절대 바뀌지 않기 때문', '역전파는 GPU에서만 실행할 수 있는 알고리즘이기 때문', '오차를 거꾸로 보낼 때 앞 방향과 같은 가중치를 알아야 하고(가중치 운반 문제), 따로 된 역방향 계산 단계가 필요하기 때문'],
      a: 3,
      why: '역전파는 출력 오차를 앞 방향과 똑같은 가중치로 거꾸로 전달하고, 순전파와 분리된 역방향 단계를 거칩니다. 시냅스가 주변 신호만 보고 바뀌는 뇌에서 이것이 그대로 일어난다고 보긴 어려워요. 그래서 feedback alignment 같은 대안이 연구되지만, 뇌가 경사하강법과 비슷한 일을 하는지는 아직 열린 질문입니다.',
      step: 3,
    },
  ],
};

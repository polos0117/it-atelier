// 알고리즘: 버블 정렬 vs 병합 정렬, 빅오 곡선, 선형 탐색 vs 이진 탐색
// 막대 8개(고정 값)를 직접 그려 실제로 자리를 바꾸며 움직인다.
const VALS = [17, 42, 88, 73, 29, 8, 61, 35]; // 버블: 비교 28 · 교환 15, 병합: 비교 14
const TARGET = 73;
const BH = (v) => 20 + v * 2.1; // 막대 높이 (88 → 205)
const BASE = 340, PITCH = 72, BW = 52;
const slotX = (i) => 360 + (i - 3.5) * PITCH; // 108 … 612
const normal = (i) => ({ x: slotX(i), y: BASE, s: 1, w: BW, op: 1 });

// 병합 정렬 무대: 두 줄(위/아래)을 오가며 합친다. d = 나눈 깊이(0~3)
const MP = 60, MW = 40, MS = 0.5, TOPY = 212, BOTY = 380;
const off = (i, d) => (d >= 1 ? 30 * (i >= 4) : 0) + (d >= 2 ? 16 * Math.floor(i / 2) : 0) + (d >= 3 ? 8 * i : 0);
const mx = (i, d) => 360 - (7 * MP + off(7, d)) / 2 + i * MP + off(i, d);
const mpos = (i, d, y) => ({ x: mx(i, d), y, s: MS, w: MW, op: 1 });

// 막대 상태별 색 [색, 섞는 비율 %]
const ST = {
  base: ['blue', 24], cmp: ['amber', 55], swap: ['red', 50], done: ['green', 42],
  teal: ['teal', 40], violet: ['violet', 40], seen: ['gray', 14], found: ['green', 62],
};

// 막대 객체 — setup마다 새로 만든다
let ORD = [];
let LINE = null;
const C = { cmp: 0, swp: 0 };

function setS(b, k) {
  const [c, p] = ST[k];
  b.rect.style.fill = `color-mix(in srgb, var(--${c}) ${p}%, var(--stage))`;
  b.rect.style.stroke = `var(--${c})`;
  b.state = k;
}
function render(b, lift = 0) {
  const h = BH(b.v) * b.s;
  b.g.setAttribute('transform', `translate(${b.x} ${b.y - lift})`);
  b.rect.setAttribute('x', -b.w / 2);
  b.rect.setAttribute('width', b.w);
  b.rect.setAttribute('y', -h);
  b.rect.setAttribute('height', h);
  b.t.setAttribute('y', -h - 11);
  b.g.style.opacity = b.op;
}
/** 막대 하나를 목표 위치·크기로 옮긴다. hop>0이면 위로 살짝 뛰어오르며 이동 */
function anim(a, b, to, dur = 400, hop = 0) {
  const f = { x: b.x, y: b.y, s: b.s, w: b.w, op: b.op };
  const g = { ...f, ...to };
  return a.tween(dur, (t) => {
    for (const k in f) b[k] = f[k] + (g[k] - f[k]) * t;
    render(b, hop ? Math.sin(Math.PI * t) * hop : 0);
  });
}
const arrange = (a, pos, dur = 500, stagger = 0, hop = 0) =>
  a.par(...ORD.map((b, i) => a.wait(i * stagger).then(() => anim(a, b, pos(i), dur, hop))));
const allS = (k) => ORD.forEach((b) => setS(b, k));
const lineTo = (a, op, dur = 300) => { const o0 = +LINE.style.opacity; return a.tween(dur, (t) => (LINE.style.opacity = o0 + (op - o0) * t)); };
const cnt = (a, s, s2) => { a.setText('cnt', s); if (s2 != null) a.setText('cnt2', s2); };
const bubbleCnt = (a) => cnt(a, `비교 ${C.cmp}회 · 교환 ${C.swp}회`);

/** 버블 정렬 한 바퀴(p = 0부터). ptr = 비교 위치 표시 패킷 */
async function pass(a, p, cmpMs, swpMs, ptr) {
  for (let i = 0; i < 7 - p; i++) {
    const L = ORD[i], R = ORD[i + 1];
    setS(L, 'cmp'); setS(R, 'cmp');
    ptr.set(`${L.v} ${L.v > R.v ? '>' : '<'} ${R.v}`, 'amber');
    C.cmp++; bubbleCnt(a);
    await a.par(a.move(ptr, [(slotX(i) + slotX(i + 1)) / 2, BASE + 24], Math.min(160, cmpMs)), a.wait(cmpMs));
    if (L.v > R.v) {
      setS(L, 'swap'); setS(R, 'swap');
      ptr.set('교환!', 'red');
      await a.par(anim(a, L, { x: slotX(i + 1) }, swpMs, 34), anim(a, R, { x: slotX(i) }, swpMs));
      ORD[i] = R; ORD[i + 1] = L;
      C.swp++; bubbleCnt(a);
    }
    setS(ORD[i], 'base'); setS(ORD[i + 1], 'base');
  }
  setS(ORD[7 - p], 'done');
}

/** 병합 한 층: 묶음 두 개씩 합쳐 dstY 줄의 깊이 dstD 자리로 옮긴다 */
async function mergeLevel(a, groups, dstY, dstD, color) {
  const out = [];
  const jobs = [];
  let start = 0;
  for (let g = 0; g < groups.length; g += 2) {
    const L = groups[g], R = groups[g + 1], s = start, merged = [];
    out.push(merged);
    start += L.length + R.length;
    jobs.push((async () => {
      let i = 0, j = 0, k = s;
      while (i < L.length && j < R.length) {
        const pl = L[i].state, pr = R[j].state;
        setS(L[i], 'cmp'); setS(R[j], 'cmp');
        C.cmp++; cnt(a, `비교 ${C.cmp}회`);
        await a.wait(300);
        const leftWins = L[i].v <= R[j].v;
        const take = leftWins ? L[i++] : R[j++];
        const other = leftWins ? R[j] : L[i];
        setS(other, leftWins ? pr : pl);
        setS(take, color);
        await anim(a, take, mpos(k++, dstD, dstY), 380);
        merged.push(take);
      }
      for (const b of [...L.slice(i), ...R.slice(j)]) {
        setS(b, color);
        await anim(a, b, mpos(k++, dstD, dstY), 260);
        merged.push(b);
      }
    })());
  }
  await a.par(...jobs);
  return out;
}

export default {
  id: 'algo',
  level: 2,
  cat: '알고리즘',
  title: '알고리즘 — 정렬과 탐색, 그리고 빅오',
  sub: '같은 문제도 푸는 방법에 따라 일의 양이 천지 차이 — 막대 8개로 보는 정렬·탐색·빅오',
  analogy: '도서관에서 책을 찾는다고 해 봅시다. 책이 아무렇게나 꽂혀 있으면 한 권씩 다 봐야 하지만, 번호순으로 꽂혀 있으면 가운데쯤을 펼쳐 보고 "더 앞이네" 하며 금방 찾습니다. 책을 번호순으로 꽂는 일(정렬)도 요령에 따라 몇 분이 걸리기도, 며칠이 걸리기도 하죠.',
  keys: [
    '알고리즘은 문제를 푸는 절차이며, 같은 문제라도 알고리즘에 따라 필요한 연산 횟수가 크게 다르다.',
    '버블 정렬은 이웃끼리 비교·교환을 반복해 n(n−1)/2번 비교한다 → O(n²).',
    '병합 정렬은 반씩 나눈 뒤 정렬된 묶음끼리 합쳐 O(n log n) — 데이터가 클수록 차이가 폭발적으로 커진다.',
    '빅오 표기는 데이터 크기 n이 커질 때 일이 늘어나는 추세를 나타낸다: O(1) < O(log n) < O(n) < O(n log n) < O(n²).',
    '정렬된 데이터에서는 이진 탐색이 O(log n) — 100만 개도 20번 안에 찾는다. 그래서 자주 찾는 데이터는 정렬(인덱스)해 둔다.',
  ],
  terms: [
    ['알고리즘', '문제를 해결하는 단계별 절차. 같은 입력이면 같은 결과를 낸다'],
    ['정렬', '데이터를 크기·가나다 등 정해진 순서로 줄 세우는 것'],
    ['시간 복잡도', '입력 크기 n이 커질 때 연산 횟수가 얼마나 늘어나는지'],
    ['빅오(O) 표기', '상수와 작은 항을 버리고 증가 추세만 나타내는 표기. 예: O(n log n)'],
    ['분할 정복', '문제를 작게 나눠 풀고 결과를 합치는 전략 (병합 정렬, 퀵 정렬)'],
    ['안정 정렬', '값이 같은 원소들의 원래 순서가 정렬 후에도 유지되는 정렬'],
    ['이진 탐색', '정렬된 데이터에서 가운데와 비교해 범위를 절반씩 줄여 나가는 탐색'],
  ],
  setup(a) {
    ORD = [];
    C.cmp = 0; C.swp = 0;
    LINE = a.raw('line', { x1: 60, x2: 660, y1: BASE + 1, y2: BASE + 1, style: 'stroke:var(--line2);stroke-width:2;stroke-linecap:round' }, 'zone');
    LINE.style.opacity = 1;
    VALS.forEach((v, i) => {
      const g = a.raw('g', {}, 'node');
      const rect = a.raw('rect', { rx: 6, style: 'stroke-width:2' }, g);
      const t = a.text(0, 0, String(v), { par: g, size: 13.5, weight: 700, mono: true });
      const b = { v, g, rect, t, ...normal(i) };
      setS(b, 'base');
      render(b);
      ORD.push(b);
    });
    a.text(24, 30, '정렬 문제: 작은 것부터 줄 세우기', { id: 'title', size: 18, weight: 800, anchor: 'start', layer: 'edge' });
    a.text(696, 30, '', { id: 'cnt', size: 14, weight: 700, anchor: 'end', layer: 'edge', color: 'amber', mono: true });
    a.text(696, 52, '', { id: 'cnt2', size: 12, anchor: 'end', layer: 'edge', cls: 'muted' });
  },
  steps: [
    {
      t: '알고리즘 — 문제를 푸는 레시피',
      easy: '알고리즘은 문제를 푸는 순서, 즉 레시피입니다. 키가 제각각인 막대 8개를 작은 것부터 줄 세우는(정렬) 같은 문제도, 어떤 방법을 쓰느냐에 따라 해야 할 일의 양이 크게 달라져요.',
      deep: '알고리즘의 효율은 실제 걸린 초가 아니라 입력 크기 n에 대해 기본 연산(여기서는 두 값의 비교)이 몇 번 일어나는지로 잽니다. 하드웨어·언어와 상관없이 방법끼리 비교할 수 있기 때문입니다. 정렬은 비교 기반 정렬의 하한이 Ω(n log n)으로 증명된 대표 문제라 차이를 보기 좋습니다.',
      async run(a) {
        a.setText('title', '정렬 문제: 작은 것부터 줄 세우기');
        ORD.forEach((b) => { b.s = 0; render(b); });
        await arrange(a, normal, 520, 90);
        a.note('n1', 360, 80, '같은 문제(정렬)도\n방법에 따라 일의 양이 달라요', { color: 'blue' });
        a.caption('막대 8개 — 키(값)가 제각각');
        await a.wait(900);
      },
    },
    {
      t: '버블 정렬 — 이웃끼리 비교해 큰 것을 뒤로',
      easy: '나란히 선 두 막대를 비교해서 왼쪽이 더 크면 자리를 바꿉니다. 이걸 끝까지 한 번 훑으면 가장 큰 막대가 거품처럼 맨 오른쪽으로 떠오르고, 그 자리는 확정이에요. 두 바퀴를 돌려 봅니다.',
      deep: '한 바퀴(pass)마다 인접한 쌍 (i, i+1)을 비교·교환해 남은 구간의 최댓값을 끝으로 보냅니다. 첫 바퀴는 7번, 둘째 바퀴는 6번처럼 비교 횟수가 하나씩 줄어듭니다. 같은 값의 순서를 바꾸지 않는 안정(stable) 정렬이고 추가 메모리가 거의 필요 없는(in-place) 대신 느립니다.',
      async run(a) {
        a.clear();
        a.setText('title', '버블 정렬 — 이웃끼리 비교');
        C.cmp = 0; C.swp = 0; bubbleCnt(a);
        const ptr = a.packet('', { id: 'ptr', at: [(slotX(0) + slotX(1)) / 2, BASE + 24], color: 'amber', w: 78 });
        for (const p of [0, 1]) {
          a.caption(`${p + 1}번째 바퀴 — 큰 값이 오른쪽 끝으로`);
          await pass(a, p, 300, 420, ptr);
          await a.wait(250);
        }
        await a.fadeOut('ptr', 200);
        a.note('n2', 360, 80, '한 바퀴마다 가장 큰 값이\n맨 끝으로 떠올라 확정돼요', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '버블 정렬 마무리 — 비교 28번',
      easy: '남은 바퀴도 똑같이 반복하면 정렬이 끝납니다. 8개를 정렬하는 데 비교를 28번 했어요. 막대가 2배로 늘면 일은 약 4배로 늘어납니다.',
      deep: '비교 횟수는 7+6+…+1 = n(n−1)/2 = 28로, n²에 비례하는 O(n²)입니다. n=1,000이면 499,500번, n=100만이면 약 5천억 번입니다. "이번 바퀴에 교환이 없으면 멈춤" 최적화를 넣으면 거의 정렬된 입력은 O(n)에 끝나지만, 평균·최악은 여전히 O(n²)입니다.',
      async run(a) {
        a.clear();
        a.setText('title', '버블 정렬 — 남은 바퀴 빨리 감기');
        bubbleCnt(a);
        const ptr = a.packet('', { id: 'ptr', at: [(slotX(0) + slotX(1)) / 2, BASE + 24], color: 'amber', w: 78 });
        a.caption('3~7번째 바퀴 (빨리 감기)');
        for (let p = 2; p < 7; p++) await pass(a, p, 120, 200, ptr);
        setS(ORD[0], 'done');
        await a.fadeOut('ptr', 200);
        a.setText('cnt2', '7+6+5+4+3+2+1');
        a.note('n3', 360, 84, '8개 정렬에 비교 28번 = n(n−1)/2\n1,000개라면 약 50만 번!', { color: 'red' });
        a.caption('n²에 비례 → O(n²)');
        await a.wait(900);
      },
    },
    {
      t: '병합 정렬 — 반으로 나누고, 합치며 정렬',
      easy: '막대들을 반으로, 또 반으로 나눠 한 개씩이 될 때까지 쪼갭니다. 그다음 두 묶음의 맨 앞끼리만 비교해서 작은 것부터 꺼내 합치면, 합칠 때마다 정렬된 묶음이 두 배로 커져요. 비교는 14번, 버블 정렬의 절반입니다.',
      deep: '분할 정복(divide and conquer)입니다. 나누는 깊이가 log₂n(8개면 3층)이고 층마다 합치는 비교가 최대 n번이라 최선·최악 모두 O(n log n)입니다. 이미 정렬된 두 묶음은 맨 앞끼리만 비교하면 되기 때문입니다. 대신 합칠 자리(보조 배열)로 O(n) 메모리가 더 들고, 안정 정렬입니다.',
      async run(a) {
        a.clear();
        a.setText('title', '병합 정렬 — 나누고 합치기');
        C.cmp = 0;
        cnt(a, '비교 0회', '버블 정렬은 28회');
        // 처음 순서로 되돌리기
        const byV = new Map(ORD.map((b) => [b.v, b]));
        ORD = VALS.map((v) => byV.get(v));
        allS('base');
        await arrange(a, normal, 600, 40, 40);
        await a.par(lineTo(a, 0), arrange(a, (i) => mpos(i, 0, TOPY), 500));
        a.note('n4', 360, 64, '① 한 개씩이 될 때까지 반으로 나누기', { color: 'blue' });
        for (const d of [1, 2, 3]) await arrange(a, (i) => mpos(i, d, TOPY), 450);
        await a.wait(250);
        a.remove('n4');
        a.note('n4b', 360, 64, '② 두 묶음의 맨 앞끼리 비교 → 작은 것부터 합치기', { color: 'violet' });
        let groups = ORD.map((b) => [b]);
        groups = await mergeLevel(a, groups, BOTY, 2, 'teal');
        groups = await mergeLevel(a, groups, TOPY, 1, 'violet');
        groups = await mergeLevel(a, groups, BOTY, 0, 'done');
        ORD = groups[0];
        a.remove('n4b');
        await a.par(lineTo(a, 1), arrange(a, normal, 600, 30));
        cnt(a, `비교 ${C.cmp}회`, '버블 정렬은 28회');
        a.note('n4c', 360, 84, `병합 정렬: 비교 ${C.cmp}회\n버블 정렬(28회)의 절반`, { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '빅오 — 데이터가 늘면 일은 얼마나 늘까',
      easy: '막대 8개일 땐 28번과 14번 정도의 차이지만, 100만 개가 되면 이야기가 다릅니다. n²짜리 방법은 1조 번, n log n짜리는 약 2천만 번 일해요. 1초에 1억 번 계산해도 약 3시간과 0.2초의 차이입니다.',
      deep: '빅오(O)는 n이 커질 때 증가 추세의 상한을, 상수와 낮은 차수 항을 버리고 나타낸 것입니다(3n²+5n은 O(n²)). 그래서 n이 작을 때는 상수가 작은 단순한 알고리즘이 오히려 빠를 수 있고(짧은 구간에 삽입 정렬을 쓰는 이유), n이 커지면 차수가 승부를 가릅니다. log의 밑은 상수배 차이라 보통 생략합니다.',
      async run(a) {
        a.clear();
        a.setText('title', '빅오 — n이 커지면?');
        cnt(a, '', '');
        await a.par(lineTo(a, 0, 250), ...ORD.map((b) => anim(a, b, { op: 0 }, 300)));
        // 그래프
        const G = a.raw('g', {}, 'top');
        const X0 = 60, X1 = 400, Y0 = 380, Y1 = 84, NM = 20, VM = 40;
        const gx = (n) => X0 + (n / NM) * (X1 - X0), gy = (v) => Y0 - (v / VM) * (Y0 - Y1);
        a.raw('path', { d: `M${X0} ${Y1 - 8} V${Y0} H${X1 + 8}`, class: 'edge', 'marker-end': 'url(#ah)', 'marker-start': 'url(#ah)' }, G);
        a.text(X1 + 4, Y0 + 18, 'n (개수)', { size: 11.5, cls: 'muted', par: G, anchor: 'end' });
        a.text(X0 + 8, Y1 - 6, '일의 양', { size: 11.5, cls: 'muted', par: G, anchor: 'start' });
        a.raw('line', { x1: gx(8), x2: gx(8), y1: Y0, y2: Y1 + 30, style: 'stroke:var(--line2);stroke-width:1.5;stroke-dasharray:4 4' }, G);
        a.text(gx(8), Y0 + 18, 'n=8', { size: 11, cls: 'muted', par: G, mono: true });
        const CUR = [
          ['O(1)', 'green', () => 1],
          ['O(log n)', 'teal', (n) => Math.log2(n)],
          ['O(n)', 'blue', (n) => n],
          ['O(n log n)', 'amber', (n) => n * Math.log2(n)],
          ['O(n²)', 'red', (n) => n * n],
        ];
        for (const [name, color, f] of CUR) {
          const pts = [];
          let end = null;
          for (let n = 1; n <= NM + 1e-9; n += 0.1) {
            const v = f(n);
            if (v > VM) { end = [gx(n), gy(VM)]; pts.push(end); break; }
            pts.push([gx(n), gy(v)]);
          }
          if (!end) end = pts[pts.length - 1];
          const p = a.raw('path', { d: 'M' + pts.map((q) => q.join(' ')).join(' L'), fill: 'none', pathLength: 1, style: `stroke:var(--${color});stroke-width:3;stroke-linecap:round;stroke-dasharray:1 1;stroke-dashoffset:1` }, G);
          await a.tween(520, (t) => (p.style.strokeDashoffset = 1 - t));
          const top = end[1] <= Y1 + 1;
          a.text(top ? end[0] : end[0] + 6, top ? end[1] - 12 : end[1], name, { size: 12, weight: 800, mono: true, color, par: G, anchor: top ? 'middle' : 'start' });
        }
        // 표: n = 100만일 때
        const TX = 486, TR = 704;
        a.text(TX, 92, 'n = 100만일 때', { size: 14, weight: 800, anchor: 'start', par: G });
        a.text(TX, 114, '연산 횟수 · 1초에 1억 번이면', { size: 11, cls: 'muted', anchor: 'start', par: G });
        const ROWS = [
          ['O(1)', 'green', '1번', '즉시', '배열 칸 바로 읽기'],
          ['O(log n)', 'teal', '20번', '즉시', '이진 탐색'],
          ['O(n)', 'blue', '100만 번', '0.01초', '선형 탐색'],
          ['O(n log n)', 'amber', '약 2천만 번', '0.2초', '병합 정렬'],
          ['O(n²)', 'red', '1조 번', '약 2.8시간', '버블 정렬'],
        ];
        for (let i = 0; i < ROWS.length; i++) {
          const [name, color, cntS, time, ex] = ROWS[i];
          const y = 148 + i * 46;
          const rg = a.raw('g', {}, G);
          if (!a.fast) rg.style.opacity = 0;
          if (i === 4) a.raw('rect', { x: TX - 8, y: y - 16, width: TR - TX + 12, height: 42, rx: 8, style: 'fill:color-mix(in srgb, var(--red) 12%, transparent);stroke:var(--red);stroke-width:1.2' }, rg);
          a.text(TX, y, name, { size: 12.5, weight: 800, mono: true, color, anchor: 'start', par: rg });
          a.text(TX + 120, y, cntS, { size: 12.5, weight: 700, anchor: 'middle', par: rg });
          a.text(TR, y, time, { size: 12.5, weight: 700, anchor: 'end', par: rg, color: i === 4 ? 'red' : null });
          a.text(TX, y + 17, ex, { size: 11, cls: 'muted', anchor: 'start', par: rg });
          await a.tween(260, (t) => (rg.style.opacity = t));
        }
        a.caption('n²은 순식간에 그래프 밖으로 — n이 클수록 차이가 폭발해요');
        await a.wait(700);
      },
    },
    {
      t: '선형 탐색 — 처음부터 하나씩',
      easy: '이제 정렬된 막대에서 73을 찾아봅시다. 가장 단순한 방법은 왼쪽부터 하나씩 "이거 73이야?" 하고 확인하는 거예요. 7번째에서 찾았습니다. 운이 나쁘면 끝까지 다 봐야 해요.',
      deep: '선형 탐색은 정렬 여부와 상관없이 쓸 수 있고 최악·평균 O(n)입니다(평균 약 n/2번). 데이터가 작거나 한 번만 찾을 때는 준비 비용이 없어 가장 실용적이며, CPU 캐시에 연속으로 올라오는 작은 배열에서는 이진 탐색보다 빠르기도 합니다.',
      async run(a) {
        a.clear();
        a.setText('title', '선형 탐색 — 처음부터 하나씩');
        cnt(a, '확인 0회', '');
        allS('base');
        await a.par(lineTo(a, 1), ...ORD.map((b, i) => anim(a, b, normal(i), 400)));
        a.packet(`찾는 값: ${TARGET}`, { id: 'goal', at: [96, 76], color: 'blue' });
        const ptr = a.packet('▲', { id: 'ptr', at: [slotX(0), BASE + 24], color: 'amber', w: 50 });
        for (let i = 0; i < ORD.length; i++) {
          const b = ORD[i];
          await a.move(ptr, [slotX(i), BASE + 24], 160);
          setS(b, 'cmp');
          cnt(a, `확인 ${i + 1}회`);
          await a.wait(300);
          if (b.v === TARGET) { setS(b, 'found'); ptr.set('찾음', 'green'); break; }
          setS(b, 'seen');
        }
        a.note('n6', 330, 80, '7번 확인해서 찾음\n100만 개면 최악 100만 번 → O(n)', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '이진 탐색 — 가운데를 보고 절반 버리기',
      easy: '정렬돼 있다면 더 똑똑하게 찾을 수 있어요. 가운데 값을 보고 73보다 작으면, 왼쪽 절반은 볼 필요가 없으니 통째로 버립니다. 이걸 반복하면 3번 만에 찾아요. 100만 개여도 20번이면 충분합니다.',
      deep: 'low~high 구간의 가운데 mid = ⌊(low+high)/2⌋와 비교해 구간을 절반씩 줄이므로 O(log n)입니다. 2²⁰ ≈ 104만이라 100만 개도 최대 20번이면 끝납니다. 반드시 정렬된 데이터여야 하며, 큰 배열에서 low+high가 정수 범위를 넘치는 버그를 피하려고 low + (high−low)/2로 쓰는 것이 관례입니다.',
      async run(a) {
        a.clear();
        a.setText('title', '이진 탐색 — 절반씩 버리기');
        cnt(a, '확인 0회', '선형 탐색은 7회');
        allS('base');
        ORD.forEach((b, i) => { Object.assign(b, normal(i)); render(b); });
        a.packet(`찾는 값: ${TARGET}`, { id: 'goal', at: [96, 76], color: 'blue' });
        a.text(400, 76, '', { id: 'why', size: 13.5, weight: 700, color: 'amber' });
        let lo = 0, hi = 7, k = 0;
        const pLo = a.packet('low', { id: 'lo', at: [slotX(lo), BASE + 24], color: 'blue', w: 48 });
        const pHi = a.packet('high', { id: 'hi', at: [slotX(hi), BASE + 24], color: 'violet', w: 52 });
        const pMid = a.packet('mid', { id: 'mid', at: [slotX(3), BASE + 54], color: 'amber', w: 48 });
        await a.wait(400);
        while (lo <= hi) {
          const m = Math.floor((lo + hi) / 2), b = ORD[m];
          await a.move(pMid, [slotX(m), BASE + 54], 380);
          setS(b, 'cmp');
          k++; cnt(a, `확인 ${k}회`);
          await a.wait(450);
          if (b.v === TARGET) {
            setS(b, 'found');
            pMid.set('찾음!', 'green');
            a.setText('why', `${b.v} = ${TARGET} → 찾았다!`);
            break;
          }
          if (b.v < TARGET) {
            a.setText('why', `${b.v} < ${TARGET} → 왼쪽 절반 버리기`);
            setS(b, 'seen');
            await a.par(...ORD.slice(lo, m + 1).map((x) => anim(a, x, { op: 0.22 }, 400)));
            lo = m + 1;
            await a.move(pLo, [slotX(lo), BASE + 24], 380);
          } else {
            a.setText('why', `${b.v} > ${TARGET} → 오른쪽 절반 버리기`);
            setS(b, 'seen');
            await a.par(...ORD.slice(m, hi + 1).map((x) => anim(a, x, { op: 0.22 }, 400)));
            hi = m - 1;
            await a.move(pHi, [slotX(hi), BASE + 24], 380);
          }
          await a.wait(250);
        }
        a.note('n7', 330, 118, '단, 정렬돼 있어야 가능!\n100만 개도 최대 20번 → O(log n)', { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '실전에서는 — 하이브리드 정렬과 "미리 정렬"',
      easy: '프로그래밍 언어에 들어 있는 정렬은 여러 방법을 섞은 혼합형이라, 직접 버블 정렬을 짤 일은 거의 없어요. 이미 정렬된 데이터는 한 번 훑고 끝내기도 합니다. 그리고 자주 찾을 데이터라면 미리 정렬해 두는 게 이득인데, 데이터베이스의 "인덱스"가 바로 그 아이디어예요.',
      deep: 'Python·Java(객체 배열)는 이미 정렬된 구간(run)을 찾아 병합하는 Timsort 계열, C++ std::sort는 퀵 정렬에 힙 정렬 안전장치와 삽입 정렬을 섞은 인트로소트, Go(1.19+)와 Rust의 불안정 정렬은 pdqsort 계열을 씁니다. 정렬 비용 O(n log n)을 한 번 내면 이후 탐색이 O(log n)이 되므로 탐색이 많을수록 이득이고, 데이터가 자주 바뀌면 정렬 상태를 유지하는 비용(DB 인덱스의 쓰기 비용)이 따릅니다.',
      async run(a) {
        a.clear();
        a.setText('title', '실전에서는?');
        cnt(a, '', '');
        allS('base');
        await a.par(lineTo(a, 0, 250), arrange(a, (i) => ({ x: slotX(i), y: 196, s: 0.5, w: 44, op: 1 }), 500));
        // Timsort: 이미 정렬된 런을 한 번 훑으면 끝
        let c = 0;
        for (let i = 0; i < 7; i++) {
          setS(ORD[i], 'cmp'); setS(ORD[i + 1], 'cmp');
          c++; cnt(a, `Timsort: 비교 ${c}회`);
          await a.wait(160);
          setS(ORD[i], 'done');
        }
        setS(ORD[7], 'done');
        a.text(360, 222, '이미 정렬된 입력 → 한 번 훑고 끝 (n−1번 비교)', { size: 12.5, weight: 700, color: 'green' });
        await a.wait(300);
        a.text(360, 252, '언어에 내장된 정렬 = 여러 방법을 섞은 하이브리드', { size: 13, weight: 800 });
        const NS = [
          ['ts', 180, 'Timsort', 'Python · Java', 'green'],
          ['intro', 360, '인트로소트', 'C++ std::sort', 'amber'],
          ['pdq', 540, 'pdqsort', 'Go · Rust', 'violet'],
        ];
        for (const [id, x, label, sub, color] of NS) {
          a.node(id, x, 302, { label, sub, color, w: 156, h: 56, layer: 'top', hidden: !a.fast });
          await a.show(id, 260);
        }
        a.note('n8', 360, 378, '자주 찾는 데이터는 미리 정렬 → 이진 탐색  = DB 인덱스의 원리\n대신 데이터가 바뀔 때마다 정렬 상태를 유지하는 비용', { color: 'blue', size: 12 });
        await a.wait(900);
      },
    },
  ],
  quiz: [
    {
      q: '이진 탐색을 쓰려면 데이터가 어떤 상태여야 할까요?',
      c: ['개수가 짝수여야 한다', '모두 숫자여야 한다', '미리 정렬돼 있어야 한다', '같은 값이 없어야 한다'],
      a: 2,
      why: '가운데 값과 비교해 "찾는 값은 이쪽 절반에 없다"고 버릴 수 있는 건 데이터가 순서대로 놓여 있을 때뿐입니다.',
      step: 6,
    },
    {
      q: '데이터가 1,000개에서 100만 개로 1,000배 늘면, O(n²) 알고리즘의 작업량은 대략 몇 배가 될까요?',
      c: ['약 1,000배', '약 100만 배', '약 2배', '약 20배'],
      a: 1,
      why: 'O(n²)은 n이 k배가 되면 일은 k²배가 됩니다. 1,000² = 100만 배라서, 1초 걸리던 일이 약 11일로 늘어납니다.',
      step: 4,
    },
    {
      q: 'Python의 sorted()에 이미 정렬된 리스트를 넣으면 어떻게 될까요?',
      c: ['그래도 항상 n log n번 가까이 비교한다', '퀵 정렬로 바뀌어 최악의 O(n²)이 된다', '정렬을 건너뛰어 비교를 한 번도 하지 않는다', '이미 정렬된 구간(런)을 알아보고 약 n번 비교로 끝낸다'],
      a: 3,
      why: 'Python이 쓰는 Timsort는 먼저 이미 정렬된 구간(run)을 찾습니다. 전체가 하나의 런이면 n−1번 비교로 확인하고 끝나므로 O(n)입니다.',
      step: 7,
    },
  ],
};

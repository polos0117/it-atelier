// 양자컴퓨터: 비트 vs 큐비트 → 측정(샷) → 간섭(H 두 번) → 2ⁿ개의 진폭 → 얽힘 → 그로버 탐색 → 쇼어와 암호 → 현실·오해·신경망 비교
// 단계마다 무대를 새로 그린다. 진폭은 실수만 그린다(0선 위 +는 청록, 아래 −는 분홍). 샷 결과는 시드 고정 난수라 늘 같다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function title(a, s) { a.text(24, 30, s, { size: 17, weight: 800, anchor: 'start' }); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, id: o.id, hidden: o.hidden, layer: o.layer });
}
function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const fmt = (v, d = 2) => (Math.abs(v) < 0.0005 ? '0' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(d));
const pct = (v) => Math.round(v * 100) + '%';

/** 진폭 막대: 0선(zy) 위로는 +(청록), 아래로는 −(분홍). o.color를 주면 색 고정(확률 막대 등) */
function amp(a, x, zy, o = {}) {
  const w = o.w || 32, sc = o.sc || 100, d = o.d ?? 2;
  const r = a.raw('rect', { x: x - w / 2, width: w, style: 'stroke-width: 2' }, o.layer || 'node');
  const t = o.noText ? null : a.text(x, zy, '', { size: o.size || 12, weight: 700, mono: true, layer: 'top' });
  const b = {
    v: 0, x,
    set(v) {
      b.v = v;
      const h = Math.abs(v) * sc, neg = v < -0.0005, c = o.color || (neg ? 'pink' : 'teal');
      r.setAttribute('y', neg ? zy : zy - h);
      r.setAttribute('height', h);
      r.setAttribute('rx', Math.min(5, h / 2));
      r.style.fill = `color-mix(in srgb, var(--${c}) 38%, var(--stage))`;
      r.style.stroke = `var(--${c})`;
      r.style.opacity = h < 0.6 ? 0 : 1;
      if (t) {
        t.setAttribute('y', neg ? zy + h + 11 : zy - h - 11);
        t.textContent = o.hideZero && h < 0.6 ? '' : o.fmt ? o.fmt(v) : fmt(v, d);
        t.setAttribute('class', `tx mono tc-${c}`);
      }
    },
  };
  b.set(o.v ?? 0);
  return b;
}
/** 막대 여러 개를 지금 값에서 목표 값으로 */
function tw(a, bars, to, dur = 600) {
  const fr = bars.map((b) => b.v);
  return a.tween(dur, (k) => bars.forEach((b, i) => b.set(fr[i] + (to[i] - fr[i]) * k)));
}
function zeroLine(a, x1, x2, zy, o = {}) {
  const l = a.raw('line', { x1, x2, y1: zy, y2: zy, style: 'stroke: var(--line2); stroke-width: 2; stroke-linecap: round' }, 'edge');
  if (o.zero !== false) a.text(x1 - 8, zy, '0', { size: 11, cls: 'muted', mono: true, anchor: 'end', layer: 'edge' });
  return l;
}

/* ---------- 2단계: 100번 측정(샷) — 시드 고정, 0이 37번 ---------- */
const SHOTS = (() => { const r = rng(6); return Array.from({ length: 100 }, () => (r() < 0.36 ? 0 : 1)); })();
const ZEROS = SHOTS.filter((x) => x === 0).length; // 37

/* ---------- 5단계: 얽힌 두 큐비트의 측정 결과(00 또는 11) ---------- */
const BELL = [0, 1, 1, 0, 1, 0, 0, 1];

/* ---------- 6단계: 그로버 — 8칸, 정답은 6번 칸(인덱스 5) ---------- */
const ANS = 5;
const oracle = (v) => v.map((x, i) => (i === ANS ? -x : x));
const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const diffuse = (v) => { const m = mean(v); return v.map((x) => 2 * m - x); };

export default {
  id: 'quantum',
  level: 4,
  cat: '컴퓨터 과학',
  title: '양자컴퓨터 — 확률을 간섭시켜 답을 찾는 기계',
  sub: '큐비트의 진폭을 더하고 지워(간섭) 정답이 나올 확률을 키우는 계산 — 무엇이 진짜 빠르고 무엇이 오해인지',
  analogy: '물결 두 개가 만나면 마루와 마루는 더 높아지고, 마루와 골은 서로 지워져 잔잔해집니다. 양자컴퓨터는 계산의 여러 갈래를 이런 물결처럼 겹쳐, 오답 쪽 물결은 지우고 정답 쪽 물결은 키웁니다. 마지막에 한 번 "보면" 결과는 딱 하나만 나오기 때문에, 그 전에 정답이 나올 확률을 높여 두는 것이 기술의 전부예요.',
  keys: [
    '큐비트는 0과 1의 중첩 α|0⟩+β|1⟩이다. 진폭 α, β의 절댓값 제곱이 측정 확률이고 |α|²+|β|²=1이다.',
    '측정하면 결과 하나만 나오고 상태는 그 결과로 바뀐다(붕괴). 진폭은 직접 읽을 수 없고 같은 회로를 여러 번(샷) 돌려 통계로 추정한다.',
    '진폭은 음수(일반적으로 복소수)일 수 있어서 같은 결과로 가는 갈래끼리 지워지거나(상쇄) 커진다(보강). 이 간섭이 양자 계산의 핵심이다.',
    'n큐비트는 2ⁿ개의 진폭을 가지지만 측정은 n비트만 돌려준다. 그래서 간섭을 설계한 알고리즘이 있는 문제(그로버는 제곱 가속, 쇼어는 지수에 가까운 가속)에서만 빠르다.',
    '쇼어 알고리즘은 RSA·ECC를 위협하므로 양자 내성 암호(NIST FIPS 203·204·205, 2024)로 옮겨 가는 중이다. 지금의 기계는 잡음이 커서 오류 정정이 가장 큰 숙제다.',
  ],
  terms: [
    ['큐비트', '0과 1의 중첩 상태를 가질 수 있는 양자 정보의 단위. 초전도 회로·이온·중성 원자·광자 등으로 만든다'],
    ['진폭', '각 결과에 붙은 숫자(일반적으로 복소수). 절댓값을 제곱하면 그 결과가 나올 확률이 된다'],
    ['중첩', '여러 상태의 진폭을 함께 가진 상태. 값이 몰래 정해져 있는데 모르는 것과는 다르다'],
    ['측정', '큐비트를 읽는 일. 확률에 따라 결과 하나가 나오고, 상태는 그 결과로 바뀐다(붕괴)'],
    ['간섭', '같은 결과로 가는 갈래들의 진폭이 더해져 커지거나(보강) 서로 지워지는(상쇄) 현상'],
    ['얽힘', '여러 큐비트의 상태를 하나씩 따로 설명할 수 없게 묶인 상태. 측정 결과 사이에 강한 상관관계가 생긴다'],
    ['결어긋남', '주변 환경과 섞이면서 양자 상태(간섭하는 능력)가 사라지는 현상. 큐비트가 망가지는 주된 원인'],
    ['양자 내성 암호', '양자컴퓨터로도 풀기 어렵다고 여겨지는 수학 문제에 기반한 암호. ML-KEM, ML-DSA, SLH-DSA 등'],
  ],
  setup(a) {
    a.text(360, 196, '|ψ⟩ = α|0⟩ + β|1⟩', { size: 30, weight: 700, mono: true, color: 'violet' });
    a.text(360, 244, '진폭을 더하고 지워서 답을 찾는 계산', { size: 14, cls: 'muted', weight: 700 });
  },
  steps: [
    {
      t: '비트와 큐비트 — 0과 1에 붙은 "진폭"',
      easy: '보통 컴퓨터의 비트는 스위치처럼 언제나 0 아니면 1이에요. 큐비트는 0과 1에 각각 "진폭"이라는 숫자가 붙은 상태(중첩)가 될 수 있고, 진폭을 제곱하면 그 값이 나올 확률이 됩니다. 흔히 "돌고 있는 동전"에 비유하지만 딱 맞지는 않아요. 큐비트의 결과는 몰래 정해져 있는데 모르는 게 아니고, 무엇보다 진폭은 음수도 될 수 있거든요.',
      deep: '한 큐비트의 상태는 |ψ⟩ = α|0⟩ + β|1⟩이고, 진폭 α, β는 일반적으로 복소수이며 |α|² + |β|² = 1(정규화)을 만족합니다. 예시 α = 0.6, β = 0.8이면 0이 나올 확률 0.36, 1이 나올 확률 0.64입니다. 전체 위상을 무시하면 한 큐비트 상태는 블로흐 구(Bloch sphere) 표면의 한 점으로 나타낼 수 있으며, 이 무대에서는 설명을 위해 실수 진폭만 그립니다.',
      async run(a) {
        wipe(a);
        title(a, '비트와 큐비트');
        a.zone('zb', 24, 52, 212, 316, { label: '비트 (보통 컴퓨터)', color: 'blue' });
        a.zone('zq', 252, 52, 444, 316, { label: '큐비트 (양자컴퓨터)', color: 'violet' });
        // 비트: 스위치
        a.raw('rect', { x: 80, y: 150, width: 100, height: 44, rx: 22, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 2' }, 'node');
        const knob = a.raw('circle', { cx: 102, cy: 172, r: 16, style: 'fill: var(--blue)' }, 'node');
        a.text(64, 172, '0', { size: 13, cls: 'muted', mono: true, weight: 700 });
        a.text(196, 172, '1', { size: 13, cls: 'muted', mono: true, weight: 700 });
        const big = a.text(130, 252, '0', { size: 46, weight: 800, mono: true, color: 'blue' });
        a.text(130, 306, '언제나 0 아니면 1', { size: 12.5, cls: 'muted', weight: 700 });
        // 큐비트: 진폭 → 확률
        const ZY = 262;
        a.text(380, 88, '진폭', { size: 13, weight: 800 });
        a.text(600, 88, '확률 = 진폭²', { size: 13, weight: 800 });
        zeroLine(a, 304, 456, ZY);
        a.raw('line', { x1: 524, x2: 676, y1: ZY, y2: ZY, style: 'stroke: var(--line2); stroke-width: 2; stroke-linecap: round' }, 'edge');
        const A = [amp(a, 340, ZY, { w: 40, sc: 150, d: 1 }), amp(a, 420, ZY, { w: 40, sc: 150, d: 1 })];
        const P = [amp(a, 560, ZY, { w: 40, sc: 150, color: 'amber', fmt: pct }), amp(a, 640, ZY, { w: 40, sc: 150, color: 'amber', fmt: pct })];
        [340, 420, 560, 640].forEach((x, i) => a.text(x, 284, i % 2 ? '|1⟩' : '|0⟩', { size: 14, weight: 700, mono: true }));
        a.caption('비트는 스위치처럼 0 또는 1');
        for (const v of [1, 0, 1]) {
          await a.tween(320, (k) => knob.setAttribute('cx', 102 + 56 * (v ? k : 1 - k)));
          big.textContent = String(v);
          await a.wait(220);
        }
        a.caption('큐비트는 0과 1에 각각 진폭이 붙어요');
        await tw(a, A, [0.6, 0.8], 700);
        a.raw('path', { d: 'M470 200 H514', class: 'edge', 'marker-end': 'url(#ah)' }, 'edge');
        a.text(492, 184, '제곱', { size: 12, weight: 700, cls: 'muted' });
        await tw(a, P, [0.36, 0.64], 600);
        a.text(474, 318, '0.6|0⟩ + 0.8|1⟩', { size: 16, weight: 800, mono: true, color: 'violet' });
        a.text(474, 346, '0.6² + 0.8² = 0.36 + 0.64 = 1', { size: 12.5, mono: true, cls: 'muted' });
        await a.wait(300);
        a.note('n1', 360, 406, '"돌고 있는 동전" 비유는 반쪽짜리 — 결과가 몰래 정해져 있지 않고,\n진폭은 음수도 될 수 있어요 (3단계에서 중요해져요)', { color: 'violet', size: 12 });
        await a.wait(900);
      },
    },
    {
      t: '측정 — 보는 순간 하나로 정해진다',
      easy: '큐비트를 읽으면(측정) 0.6, 0.8 같은 진폭이 보이는 게 아니라 0 아니면 1 하나만 나와요. 이 큐비트는 36% 확률로 0, 64% 확률로 1이 나오고, 읽고 나면 상태가 그 결과로 바뀌어 버립니다. 그래서 같은 상태를 새로 만들어 100번 재 보고 비율을 셉니다.',
      deep: '계산 기저로 측정하면 확률 |α|², |β|²로 결과가 정해지고 상태는 |0⟩ 또는 |1⟩로 붕괴합니다. 모르는 양자 상태는 복제할 수 없어서(복제 불가 정리) 진폭을 한 번에 읽어 낼 방법이 없고, 같은 회로를 여러 번 실행한 "샷"의 통계로만 추정합니다. 100샷의 표준오차는 √(0.36×0.64/100) ≈ 4.8%p라, 이번처럼 37%가 나오는 정도의 흔들림은 정상이며 정밀하게 추정하려면 샷 수를 늘려야 합니다.',
      async run(a) {
        wipe(a);
        title(a, '측정 — 보는 순간 하나로');
        a.zone('zs', 24, 52, 230, 300, { label: '큐비트 상태', color: 'violet' });
        const ZY = 250;
        zeroLine(a, 56, 224, ZY);
        const S = [amp(a, 100, ZY, { w: 40, sc: 120, d: 1 }), amp(a, 180, ZY, { w: 40, sc: 120, d: 1 })];
        S[0].set(0.6); S[1].set(0.8);
        a.text(100, 272, '|0⟩', { size: 14, weight: 700, mono: true });
        a.text(180, 272, '|1⟩', { size: 14, weight: 700, mono: true });
        const st = a.text(139, 314, '0.6|0⟩ + 0.8|1⟩', { size: 13.5, weight: 800, mono: true, color: 'violet' });
        a.node('m', 332, 200, { label: '측정', sub: '읽기', color: 'amber', w: 96, h: 56 });
        a.edge([256, 200], 'm');
        // 결과 세기(히스토그램)
        a.zone('zh', 412, 52, 284, 300, { label: '결과 세기', color: 'green' });
        const BY = 318, K = 2.3;
        const cnt = a.text(684, 66, '샷 0 / 100', { size: 13, weight: 800, mono: true, anchor: 'end' });
        a.raw('line', { x1: 440, x2: 676, y1: BY, y2: BY, style: 'stroke: var(--line2); stroke-width: 2; stroke-linecap: round' }, 'edge');
        const H = [amp(a, 500, BY, { w: 64, sc: K, color: 'blue', fmt: (v) => String(Math.round(v)) }), amp(a, 610, BY, { w: 64, sc: K, color: 'green', fmt: (v) => String(Math.round(v)) })];
        [[500, 36], [610, 64]].forEach(([x, p]) => {
          a.raw('line', { x1: x - 44, x2: x + 44, y1: BY - p * K, y2: BY - p * K, style: 'stroke: var(--muted); stroke-width: 1.5; stroke-dasharray: 5 4' }, 'edge');
          a.text(x + 48, BY - p * K, p + '%', { size: 11, cls: 'muted', mono: true, anchor: 'start', layer: 'edge' });
        });
        a.text(500, 336, '0', { size: 15, weight: 800, mono: true, color: 'blue' });
        a.text(610, 336, '1', { size: 15, weight: 800, mono: true, color: 'green' });
        a.text(554, 92, '점선 = 이론값 (36 : 64)', { size: 11, cls: 'muted' });
        const c = [0, 0];
        a.caption('한 번 잴 때마다 0 아니면 1 — 상태도 그 결과로 바뀌어요');
        for (let i = 0; i < 4; i++) {
          const r = SHOTS[i];
          a.hl('m', true);
          await a.tween(260, (k) => { S[0].set(0.6 + ((r ? 0 : 1) - 0.6) * k); S[1].set(0.8 + ((r ? 1 : 0) - 0.8) * k); });
          st.textContent = r ? '|1⟩ (측정 후)' : '|0⟩ (측정 후)';
          const p = chip(a, String(r), 332, 254, r ? 'green' : 'blue', { w: 34 });
          await a.wait(220);
          a.hl('m', false);
          await a.move(p, [r ? 610 : 500, BY - c[r] * K - 30], 380);
          await a.fadeOut(p, 120);
          c[r]++;
          H[r].set(c[r]);
          cnt.textContent = `샷 ${i + 1} / 100`;
          await tw(a, S, [0.6, 0.8], 220);
          st.textContent = '0.6|0⟩ + 0.8|1⟩';
          await a.wait(60);
        }
        a.caption('같은 상태를 새로 만들어 100번 반복');
        const pre = [];
        let z = 0;
        SHOTS.forEach((r, i) => { if (r === 0) z++; pre[i + 1] = z; });
        await a.tween(1500, (k) => {
          const n = Math.round(4 + 96 * k);
          H[0].set(pre[n]); H[1].set(n - pre[n]);
          cnt.textContent = `샷 ${n} / 100`;
        }, { linear: true });
        a.note('n1', 360, 404, `0이 ${ZEROS}번, 1이 ${100 - ZEROS}번 — 이론값 36 : 64에 가까워요\n진폭 자체는 볼 수 없고, 여러 번 재서 비율로 짐작할 뿐이에요`, { color: 'violet', size: 12 });
        await a.wait(700);
      },
    },
    {
      t: '간섭 — 진폭이 서로 지워진다',
      easy: '하다마드(H)라는 연산을 한 번 걸면 |0⟩이 "반반" 상태가 돼요. 동전이라면 한 번 더 던져도 여전히 반반이겠죠. 그런데 H를 한 번 더 걸면 100% |0⟩으로 돌아옵니다. |1⟩로 가는 두 갈래의 진폭이 +0.5와 −0.5라 서로 지워지고, |0⟩으로 가는 두 갈래는 +0.5 + 0.5 = 1로 보태지기 때문이에요.',
      deep: 'H = (1/√2)[[1, 1], [1, −1]]이라 |0⟩ → (|0⟩+|1⟩)/√2, |1⟩ → (|0⟩−|1⟩)/√2이고, H·H = I입니다. 각 갈래의 기여는 0.707 × (±0.707) = ±0.5입니다. 확률은 늘 0 이상이라 더하면 커질 뿐이지만 진폭은 부호(일반적으로 위상)가 있어 상쇄가 가능하고, 양자 알고리즘은 오답 쪽 갈래가 지워지고 정답 쪽이 쌓이도록 게이트 순서를 설계한 것입니다. 빛의 이중 슬릿 간섭 무늬와 같은 원리입니다.',
      async run(a) {
        wipe(a);
        title(a, '간섭 — H를 두 번 걸면?');
        const ZY = 200, SC = 100;
        zeroLine(a, 44, 146, ZY);
        zeroLine(a, 240, 340, ZY, { zero: false });
        zeroLine(a, 500, 688, ZY, { zero: false });
        const gate = (x, id) => {
          a.raw('rect', { x: x - 20, y: 96, width: 40, height: 140, rx: 10, style: 'fill: color-mix(in srgb, var(--violet) 22%, var(--stage)); stroke: var(--violet); stroke-width: 2' }, 'node');
          a.text(x, 166, 'H', { size: 20, weight: 800, mono: true, color: 'violet', id });
        };
        gate(193, 'g1');
        gate(425, 'g2');
        const A0 = [amp(a, 70, ZY, { w: 30, sc: SC, d: 0 }), amp(a, 120, ZY, { w: 30, sc: SC, d: 0 })];
        A0[0].set(1);
        A0[1].set(0);
        const B = [amp(a, 265, ZY, { w: 30, sc: SC, d: 3 }), amp(a, 315, ZY, { w: 30, sc: SC, d: 3 })];
        const fmtS = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1);
        const C = [520, 566, 620, 666].map((x) => amp(a, x, ZY, { w: 22, sc: SC, fmt: fmtS, size: 11, hideZero: true }));
        const SUM = [amp(a, 543, ZY, { w: 34, sc: SC, d: 0, hideZero: true }), amp(a, 643, ZY, { w: 34, sc: SC, d: 0, hideZero: true })];
        [[70, '|0⟩'], [120, '|1⟩'], [265, '|0⟩'], [315, '|1⟩'], [543, '|0⟩'], [643, '|1⟩']].forEach(([x, s]) => a.text(x, 284, s, { size: 13.5, weight: 700, mono: true }));
        a.text(95, 306, '100% · 0%', { size: 11.5, cls: 'muted', mono: true });
        a.text(95, 328, '처음', { size: 12.5, weight: 800 });
        a.caption('H 한 번: |0⟩ → 반반');
        await a.wait(300);
        await tw(a, B, [Math.SQRT1_2, Math.SQRT1_2], 700);
        a.text(290, 306, '50% · 50%', { size: 11.5, cls: 'muted', mono: true });
        a.text(290, 328, 'H 한 번 → 반반', { size: 12.5, weight: 800 });
        await a.wait(400);
        // 네 갈래: (출발 x, 도착 x, 값)
        a.caption('H 한 번 더: 각 결과로 가는 갈래가 두 개씩');
        const PATHS = [[265, 520, 0.5], [315, 566, 0.5], [265, 620, 0.5], [315, 666, -0.5]];
        const top = ZY - Math.SQRT1_2 * SC - 22;
        // 갈래마다 H 게이트를 지나 도착 칸으로
        const ps = [];
        await a.par(...PATHS.map(([x1, x2, v], i) => a.wait(i * 160).then(() => {
          ps[i] = chip(a, fmtS(v), x1, top, v < 0 ? 'pink' : 'teal', { w: 44, h: 24, size: 12 });
          return a.move(ps[i], [[425, 118 + i * 30], [x2, ZY - 84]], 1000);
        })));
        await a.par(...ps.map((p) => a.fadeOut(p, 160)));
        await tw(a, C, PATHS.map((p) => p[2]), 500);
        await a.wait(400);
        a.caption('같은 결과끼리 더하기: +0.5 + 0.5 = 1, +0.5 − 0.5 = 0');
        await a.par(tw(a, C, [0, 0, 0, 0], 700), tw(a, [SUM[0]], [1], 700));
        a.text(543, 64, '보강!', { size: 13, weight: 800, color: 'teal' });
        a.text(643, 180, '상쇄!', { size: 13, weight: 800, color: 'pink' });
        a.text(543, 238, '+0.5+0.5=1', { size: 11.5, mono: true, weight: 700, color: 'teal' });
        a.text(643, 238, '+0.5−0.5=0', { size: 11.5, mono: true, weight: 700, color: 'pink' });
        a.text(593, 306, '100% · 0%', { size: 11.5, mono: true, weight: 700, color: 'green' });
        a.text(593, 328, 'H 두 번 → 다시 |0⟩', { size: 12.5, weight: 800, color: 'green' });
        await a.wait(300);
        a.note('n1', 190, 388, '동전이라면: 두 번 던져도 50 : 50\n확률은 0 이상이라 더해질 뿐, 지워지지 않아요', { color: 'gray', size: 12 });
        a.note('n2', 540, 388, '진폭은 + 와 − 가 있어 서로 지워져요\n→ 이것이 양자 계산의 핵심(간섭)', { color: 'green', size: 12 });
        await a.wait(1000);
      },
    },
    {
      t: '큐비트를 늘리면 — 진폭이 2ⁿ개',
      easy: '큐비트가 하나 늘 때마다 붙는 진폭의 개수가 두 배가 돼요. 10개면 1,024개, 50개면 약 1천조 개입니다. 보통 컴퓨터로 50큐비트를 그대로 흉내 내려면 메모리가 약 18PB(페타바이트)나 필요해요. 하지만 측정하면 0과 1이 50개 나올 뿐이라, 정답 쪽으로 확률이 몰리도록 간섭을 짜는 것이 핵심입니다.',
      deep: 'n큐비트 상태는 2ⁿ차원 복소 벡터이고, 진폭 하나를 복소 배정밀도(16바이트)로 저장하면 50큐비트는 2⁵⁰ × 16B ≈ 1.8×10¹⁶B ≈ 18PB입니다(30큐비트는 16GiB, 40큐비트는 16TiB). 다만 얽힘이 적은 회로는 텐서 네트워크 같은 기법으로 훨씬 싸게 흉내 낼 수 있어서 "50큐비트면 무조건 시뮬레이션 불가"는 아닙니다. 또 홀레보 한계 때문에 n큐비트에서 꺼낼 수 있는 고전 정보는 최대 n비트라, "2ⁿ개를 동시에 계산해 다 읽는다"는 그림은 틀렸습니다.',
      async run(a) {
        wipe(a);
        title(a, '큐비트를 늘리면 — 진폭이 2ⁿ개');
        const X0 = 124, X1 = 424;
        const R = [[1, 84, '2개'], [2, 128, '4개'], [3, 172, '8개'], [10, 216, '1,024개'], [50, 266, '']];
        const rr = rng(7);
        for (const [n, y, s] of R) {
          const g = a.raw('g', {}, 'node');
          if (!a.fast) g.style.opacity = 0;
          a.text(24, y, `큐비트 ${n}개`, { size: 13, weight: 800, anchor: 'start', par: g });
          a.raw('line', { x1: X0, x2: X1, y1: y, y2: y, style: 'stroke: var(--line2); stroke-width: 1' }, g);
          const N = Math.min(1024, 2 ** n);
          const vals = n === 1 ? [0.6, 0.8] : Array.from({ length: N }, () => rr() * 2 - 1);
          if (N <= 8) {
            const pitch = (X1 - X0) / N, bw = Math.min(30, pitch * 0.6);
            vals.forEach((v, i) => {
              const h = Math.max(2, Math.abs(v) * 15), x = X0 + pitch * (i + 0.5), c = v < 0 ? 'pink' : 'teal';
              a.raw('rect', { x: x - bw / 2, y: v < 0 ? y : y - h, width: bw, height: h, rx: 2, style: `fill: color-mix(in srgb, var(--${c}) 45%, var(--stage)); stroke: var(--${c}); stroke-width: 1.2` }, g);
            });
          } else {
            let dp = '', dn = '';
            vals.forEach((v, i) => {
              const x = (X0 + ((X1 - X0) * (i + 0.5)) / N).toFixed(2), h = (Math.abs(v) * 15).toFixed(1);
              if (v < 0) dn += `M${x} ${y}v${h}`; else dp += `M${x} ${y}v-${h}`;
            });
            a.raw('path', { d: dp, style: `stroke: var(--teal); stroke-width: .45; opacity: ${n === 50 ? 0.35 : 0.9}` }, g);
            a.raw('path', { d: dn, style: `stroke: var(--pink); stroke-width: .45; opacity: ${n === 50 ? 0.35 : 0.9}` }, g);
          }
          if (n === 50) {
            a.text(440, y - 9, '1,125,899,906,842,624개', { size: 13.5, weight: 800, mono: true, anchor: 'start', color: 'red', par: g });
            a.text(440, y + 11, '≈ 1천조 개', { size: 11.5, cls: 'muted', anchor: 'start', weight: 700, par: g });
          } else {
            a.text(440, y, s, { size: 13.5, weight: 800, mono: true, anchor: 'start', par: g });
          }
          await a.tween(n === 50 ? 500 : 340, (k) => (g.style.opacity = k));
          if (n === 50) chip(a, '위 줄의 약 1조 배 — 다 그릴 수 없음', (X0 + X1) / 2, y, 'red', { h: 26, size: 12, w: 250, layer: 'node' });
          await a.wait(n >= 10 ? 350 : 150);
        }
        a.caption('큐비트가 하나 늘면 진폭은 두 배');
        await a.wait(400);
        a.zone('zm', 24, 304, 328, 120, { label: '보통 컴퓨터로 흉내 내려면', color: 'red' });
        a.text(188, 340, '진폭 2⁵⁰개 × 16바이트', { size: 13, weight: 700 });
        a.text(188, 372, '≈ 18 PB 메모리', { size: 22, weight: 800, color: 'red' });
        a.text(188, 402, '진폭 하나 = 복소수 하나 = 16바이트', { size: 11.5, cls: 'muted' });
        await a.wait(700);
        a.zone('zr', 368, 304, 328, 120, { label: '그런데 측정하면', color: 'amber' });
        a.text(532, 340, '0 또는 1이 50개 → 50비트만 나와요', { size: 13, weight: 700 });
        a.text(532, 368, '진폭 1천조 개를 다 꺼내 볼 수는 없어요', { size: 12.5, weight: 700, color: 'amber' });
        a.text(532, 400, '→ 간섭으로 정답 확률을 키우는 게 비결', { size: 12.5, weight: 800, color: 'green' });
        a.caption('정보는 많지만, 꺼낼 수 있는 건 n비트뿐');
        await a.wait(1000);
      },
    },
    {
      t: '얽힘 — 따로 보면 무작위, 함께 보면 일치',
      easy: '두 큐비트를 "얽히게" 만들면, 각자 따로 보면 0과 1이 반반 무작위로 나오는데 두 결과를 맞춰 보면 언제나 같아요(00 또는 11). 그래서 한쪽을 재면 다른 쪽 결과를 바로 알 수 있죠. 하지만 이걸로 빛보다 빠르게 메시지를 보낼 수는 없어요. 내 쪽 결과가 무작위라 원하는 내용을 골라 실을 수 없기 때문입니다.',
      deep: '벨 상태 (|00⟩+|11⟩)/√2는 H와 CNOT 두 게이트로 만들며, 큐비트 하나하나의 상태로 쪼개 쓸 수 없습니다. 아인슈타인은 이를 "유령 같은 원격 작용"이라 불렀지만, 벨 부등식 실험은 미리 정해 둔 숨은 값(국소 숨은 변수)으로는 이 상관관계를 설명할 수 없음을 보였고, 그 공로로 아스페·클라우저·차일링거가 2022년 노벨 물리학상을 받았습니다. 무신호 정리에 따라 상대 쪽 결과의 통계는 내가 무엇을 하든 50:50이라, 상관관계를 확인하려면 결국 결과를 보통의 통신으로 주고받아야 합니다.',
      async run(a) {
        wipe(a);
        title(a, '얽힘 — 함께 묶인 두 큐비트');
        a.text(360, 62, '(|00⟩ + |11⟩) / √2', { size: 14.5, weight: 800, mono: true, color: 'violet' });
        const ZY = 160;
        zeroLine(a, 236, 484, ZY);
        const J = [270, 330, 390, 450].map((x) => amp(a, x, ZY, { w: 36, sc: 100, d: 3 }));
        ['00', '01', '10', '11'].forEach((s, i) => a.text(270 + i * 60, 180, s, { size: 13.5, weight: 800, mono: true }));
        ['50%', '0%', '0%', '50%'].forEach((s, i) => a.text(270 + i * 60, 199, s, { size: 11, mono: true, cls: 'muted' }));
        a.node('qa', 100, 300, { label: '큐비트 A', sub: '여기', color: 'blue', w: 124, h: 52 });
        a.node('qb', 620, 300, { label: '큐비트 B', sub: '아주 먼 곳', color: 'violet', w: 124, h: 52 });
        a.raw('path', { d: 'M100 272 Q360 196 620 272', fill: 'none', style: 'stroke: var(--violet); stroke-width: 2; stroke-dasharray: 6 5; opacity: .6' }, 'edge');
        a.text(360, 250, '얽힘', { size: 12, weight: 800, color: 'violet' });
        a.caption('두 큐비트를 얽힌 상태로 준비');
        await tw(a, J, [Math.SQRT1_2, 0, 0, Math.SQRT1_2], 700);
        a.text(196, 288, 'A', { size: 12.5, weight: 800, color: 'blue' });
        a.text(196, 326, 'B', { size: 12.5, weight: 800, color: 'violet' });
        a.caption('각자 측정 → 결과를 나중에 맞춰 봅니다');
        for (let i = 0; i < BELL.length; i++) {
          const r = BELL[i], x = 226 + i * 38, slow = i < 3;
          a.hl('qa', true); a.hl('qb', true);
          await tw(a, J, r ? [0, 0, 0, 1] : [1, 0, 0, 0], slow ? 260 : 140);
          const pa = chip(a, String(r), 164, 300, 'blue', { w: 28, h: 26, size: 13 });
          const pb = chip(a, String(r), 556, 300, 'violet', { w: 28, h: 26, size: 13 });
          await a.par(a.move(pa, [x, 288], slow ? 440 : 280), a.move(pb, [x, 326], slow ? 440 : 280));
          a.hl('qa', false); a.hl('qb', false);
          await tw(a, J, [Math.SQRT1_2, 0, 0, Math.SQRT1_2], slow ? 220 : 120);
          if (slow) await a.wait(60);
        }
        a.text(100, 344, '0이 4번 · 1이 4번', { size: 12, weight: 800 });
        a.text(100, 362, '혼자 보면 무작위', { size: 11.5, cls: 'muted' });
        a.text(620, 344, '0이 4번 · 1이 4번', { size: 12, weight: 800 });
        a.text(620, 362, '혼자 보면 무작위', { size: 11.5, cls: 'muted' });
        a.text(359, 356, '맞춰 보면 8번 모두 A = B', { size: 13, weight: 800, color: 'green' });
        await a.wait(400);
        a.note('n1', 360, 404, '✗ 빛보다 빠른 통신은 불가 — 내 쪽 결과가 무작위라 원하는 메시지를 실을 수 없어요', { color: 'red', size: 12 });
        await a.wait(700);
      },
    },
    {
      t: '그로버 탐색 — 정답의 진폭만 키우기',
      easy: '8칸 중 정답 하나를 찾는다고 해 봅시다. 처음엔 모든 칸이 12.5%로 같아요. ① 정답 칸의 진폭만 음수로 뒤집고 ② 평균을 기준으로 모든 진폭을 뒤집으면, 정답 진폭만 쑥 커집니다. 한 번 하면 78.1%, 두 번 하면 94.5%예요. 하나씩 열어 보면 평균 4~5번 걸리는데, 칸이 많아질수록 차이가 커져요.',
      deep: '오라클은 정답 x*의 부호만 바꾸고(|x*⟩ → −|x*⟩), 확산 연산자 2|s⟩⟨s| − I가 "평균에 대한 반전"을 합니다. 한 바퀴마다 상태가 정답 쪽으로 2θ씩 회전해(sin θ = 1/√N) k바퀴 뒤 정답 확률은 sin²((2k+1)θ)이고, N = 8이면 78.1% → 94.5%입니다. 3바퀴째에는 오히려 약 33%로 떨어지므로 약 (π/4)√N번에서 멈춰야 합니다. 고전 O(N) 대비 O(√N)의 제곱 가속이라 N = 100만이면 평균 50만 번 대 약 800바퀴로, 지수적 가속은 아닙니다.',
      async run(a) {
        wipe(a);
        title(a, '그로버 탐색 — 8칸 중 정답 하나');
        const ZY = 214, SC = 120, bx = (i) => 72 + i * 50;
        zeroLine(a, 46, 444, ZY, { zero: false });
        const op = a.text(245, 64, '', { size: 13, weight: 800, color: 'amber' });
        const bars = Array.from({ length: 8 }, (_, i) => amp(a, bx(i), ZY, { w: 32, sc: SC, size: 11.5 }));
        for (let i = 0; i < 8; i++) a.text(bx(i), 372, String(i + 1), { size: 13.5, weight: 800, mono: true, color: i === ANS ? 'green' : null });
        chip(a, '정답', bx(ANS), 396, 'green', { w: 46, h: 22, size: 11.5, layer: 'node' });
        const ml = a.raw('line', { x1: 50, x2: 440, y1: ZY, y2: ZY, style: 'stroke: var(--amber); stroke-width: 2; stroke-dasharray: 6 4; opacity: 0' }, 'top');
        const mt = a.text(40, ZY, '평균', { size: 11.5, weight: 800, color: 'amber', anchor: 'end' });
        mt.style.opacity = 0;
        // 오른쪽 판
        a.zone('zp', 466, 48, 234, 376, { label: '정답이 나올 확률', color: 'green' });
        const rd = a.text(583, 82, '시작', { size: 14, weight: 800 });
        const pp = a.text(583, 114, '12.5%', { size: 26, weight: 800, mono: true, color: 'green' });
        const pb = a.bar('pb', 488, 146, 190, { color: 'green' });
        const HIST = [['시작', '12.5%'], ['1바퀴', '78.1%'], ['2바퀴', '94.5%']];
        const hist = (i) => {
          a.text(488, 180 + i * 22, HIST[i][0], { size: 12, weight: 700, anchor: 'start', cls: 'muted' });
          a.text(678, 180 + i * 22, HIST[i][1], { size: 12, weight: 800, anchor: 'end', mono: true });
        };
        hist(0);
        let v = Array(8).fill(1 / Math.sqrt(8));
        a.caption('처음엔 모든 칸의 진폭이 같아요 (0.354 → 확률 12.5%)');
        op.textContent = '처음: 모든 칸이 같은 진폭';
        await tw(a, bars, v, 600);
        await pb.set(0.125, 300);
        await a.wait(300);
        for (let k = 1; k <= 2; k++) {
          rd.textContent = `${k}바퀴`;
          op.textContent = '① 정답 칸의 진폭을 뒤집기 (오라클)';
          a.caption(`${k}바퀴 — ① 정답의 부호만 바꿔요`);
          v = oracle(v);
          await tw(a, bars, v, 600);
          await a.wait(150);
          const m = mean(v), my = ZY - m * SC;
          ml.setAttribute('y1', my); ml.setAttribute('y2', my); mt.setAttribute('y', my);
          op.textContent = '② 평균을 기준으로 모두 뒤집기 (확산)';
          a.caption(`${k}바퀴 — ② 평균선을 기준으로 위아래를 뒤집어요`);
          await a.tween(250, (t) => { ml.style.opacity = t; mt.style.opacity = t; });
          v = diffuse(v);
          await tw(a, bars, v, 800);
          await a.tween(200, (t) => { ml.style.opacity = 1 - t; mt.style.opacity = 1 - t; });
          const p = v[ANS] ** 2, p0 = pb.v;
          await a.par(pb.set(p, 450), a.tween(450, (t) => (pp.textContent = ((p0 + (p - p0) * t) * 100).toFixed(1) + '%')));
          hist(k);
          await a.wait(150);
        }
        op.textContent = '두 바퀴 만에 정답 확률 94.5%';
        a.raw('line', { x1: 482, x2: 684, y1: 250, y2: 250, style: 'stroke: var(--line2); stroke-width: 1' }, 'edge');
        const CMP = [['8칸', 274, 'muted'], ['하나씩 열기: 평균 4~5번', 294], ['그로버: 2바퀴', 314], ['100만 칸', 344, 'muted'], ['하나씩 열기: 평균 약 50만 번', 364], ['그로버: 약 800바퀴', 384]];
        CMP.forEach(([s, y, c]) => a.text(482, y, s, { size: c ? 11.5 : 12.5, weight: c ? 700 : 800, anchor: 'start', cls: c || '' }));
        a.text(583, 408, '제곱 가속(√N) — 지수 가속 아님', { size: 12, weight: 800, color: 'violet' });
        a.caption('정답의 진폭을 키워서 측정했을 때 정답이 나올 확률을 높여요');
        await a.wait(800);
      },
    },
    {
      t: '쇼어 알고리즘과 암호 — 그리고 대비',
      easy: 'HTTPS의 열쇠 교환과 전자서명(HTTPS 주제에서 본 그 부분)은 "아주 큰 수를 소인수분해하기 어렵다" 같은 수학 문제에 기대고 있어요. 충분히 크고 오류까지 고칠 수 있는 양자컴퓨터가 생기면 쇼어 알고리즘으로 이걸 빠르게 풀 수 있지만, 지금의 기계로는 어림도 없어요. 그래도 "지금 훔쳐 두고 나중에 푼다"는 위험 때문에, 양자컴퓨터로도 풀기 어려운 새 암호(양자 내성 암호)로 이미 바꾸고 있습니다.',
      deep: '쇼어 알고리즘은 소인수분해와 이산로그를 양자 푸리에 변환을 이용한 주기 찾기로 바꿔 다항 시간에 풉니다. 알려진 최선의 고전 방법(일반 수체 체)은 준지수 시간이라 RSA와 ECC(ECDH·ECDSA)가 위협받습니다. NIST는 2024년 8월 FIPS 203(ML-KEM, 키 캡슐화), FIPS 204(ML-DSA, 서명), FIPS 205(SLH-DSA, 해시 기반 서명)를 표준으로 발표했고, TLS에서는 X25519와 ML-KEM을 함께 쓰는 하이브리드 키 교환이 이미 널리 쓰이기 시작했습니다. AES 같은 대칭키 암호는 그로버로도 제곱 가속뿐이라 키를 충분히 길게(AES-256) 쓰면 됩니다.',
      async run(a) {
        wipe(a);
        title(a, '쇼어 알고리즘과 암호');
        a.zone('z1', 20, 46, 336, 166, { label: '소인수분해: N = p × q', color: 'violet' });
        a.text(36, 86, '15 = 3 × 5', { size: 14, weight: 800, mono: true, anchor: 'start' });
        a.text(340, 86, '바로 풀려요', { size: 12, weight: 700, anchor: 'end', color: 'green' });
        await a.wait(400);
        a.text(36, 114, 'RSA-2048: 617자리 수 = ? × ?', { size: 13, weight: 800, anchor: 'start' });
        await a.wait(400);
        chip(a, '보통 컴퓨터', 96, 150, 'gray', { w: 120, h: 28, size: 12, layer: 'node' });
        a.text(166, 150, '현실적인 시간 안엔 불가능', { size: 12, weight: 700, anchor: 'start' });
        await a.wait(300);
        chip(a, '큰 양자컴퓨터', 96, 186, 'red', { w: 120, h: 28, size: 12, layer: 'node' });
        a.text(166, 186, '쇼어로 빠르게 (아직 없음)', { size: 12, weight: 800, anchor: 'start', color: 'red' });
        a.caption('쇼어 알고리즘: 큰 수의 소인수분해를 빠르게');
        await a.wait(500);
        a.zone('z2', 372, 46, 328, 166, { label: '위험해지는 것: 공개키 암호', color: 'red' });
        a.node('rsa', 442, 104, { label: 'RSA', color: 'red', w: 96, h: 40, size: 14 });
        a.node('ecc', 442, 166, { label: 'ECC', color: 'red', w: 96, h: 40, size: 14 });
        a.node('tls', 612, 136, { label: 'HTTPS', sub: '키 교환 · 서명', color: 'blue', w: 140, h: 56 });
        a.edge('rsa', 'tls');
        a.edge('ecc', 'tls');
        await a.wait(500);
        a.zone('z3', 20, 224, 680, 122, { label: '"지금 수집, 나중에 해독"', color: 'amber' });
        a.node('u', 100, 276, { label: '사용자', color: 'gray', w: 96, h: 38, size: 13 });
        a.node('s', 320, 276, { label: '서버', color: 'gray', w: 96, h: 38, size: 13 });
        a.edge('u', 's');
        a.node('db', 470, 316, { label: '도청 저장소', color: 'amber', shape: 'db', w: 110, h: 50, size: 12.5 });
        a.node('fut', 630, 316, { label: '몇 년 뒤', sub: '큰 양자컴퓨터', color: 'red', w: 120, h: 46, size: 13 });
        a.edge('db', 'fut', { dashed: true });
        a.caption('오늘의 암호문을 저장해 두었다가 나중에 풀 수도 있어요');
        const p = chip(a, '🔒 암호문', 152, 276, 'blue', { w: 78, h: 24, size: 11.5 });
        const cp = chip(a, '🔒 복사', 210, 276, 'amber', { w: 66, h: 24, size: 11.5, hidden: true });
        await a.move(p, [210, 276], 350);
        cp.g.style.opacity = 1;
        await a.par(a.move(p, [268, 276], 350), a.move(cp, [[210, 316], [410, 316]], 700));
        await a.fadeOut(p, 150);
        await a.fadeOut(cp, 150);
        a.badge('db', '쌓임', 'amber');
        const k = chip(a, '🔒', 530, 316, 'amber', { w: 30, h: 24, size: 11 });
        await a.move(k, [566, 316], 400);
        await a.fadeOut(k, 120);
        a.badge('fut', '해독!', 'red');
        await a.flash('fut');
        a.zone('z4', 20, 356, 680, 68, { label: '대비: 양자 내성 암호 — NIST 표준 (2024년 8월)', color: 'green' });
        const PQ = [['ML-KEM · FIPS 203 · 키 교환', 140, 214], ['ML-DSA · FIPS 204 · 서명', 362, 200], ['SLH-DSA · FIPS 205 · 서명', 582, 210]];
        for (const [s, x, w] of PQ) {
          const c = chip(a, s, x, 400, 'green', { w, h: 28, size: 12, layer: 'node', hidden: !a.fast });
          await a.show(c, 220);
        }
        a.caption('이미 새 암호로 옮겨 가는 중 — 지금의 양자컴퓨터로는 RSA를 깨지 못해요');
        await a.wait(900);
      },
    },
    {
      t: '현실과 오해 — 그리고 신경망과 비교',
      easy: '큐비트는 아주 예민해서 열·진동 같은 작은 잡음에도 상태가 금방 망가져요(결어긋남). 그래서 초전도 방식은 절대영도 바로 위인 약 0.01K까지 식히고, 오류를 고치려면 큐비트 여러 개를 묶어 하나처럼 써야 해요. 양자컴퓨터는 모든 답을 한꺼번에 계산해 고르는 기계도, 내 PC를 대신할 기계도 아니고 특정 문제에서만 유리합니다. 신경망과 닮아 보이는 건 둘 다 행렬 계산을 하고 결과를 확률로 읽기 때문인데, 신경망의 확률은 계산된 숫자이고 양자의 확률은 측정할 때 실제로 일어나는 무작위라는 점이 달라요.',
      deep: '초전도 회로(희석 냉동기로 약 10mK), 이온 트랩, 중성 원자, 광자 등이 경쟁하며 결맞음 시간·게이트 정확도·연결성이 서로 다릅니다. 표면 코드 같은 오류 정정은 논리 큐비트 하나에 물리 큐비트가 수십~수천 개 필요하다고 추정되고(물리 오류율과 목표 정확도에 따라 다름), 지금 기계는 물리 큐비트 수백~천여 개 수준으로 회사마다 다르고 빠르게 바뀝니다. 신경망은 비선형 활성화가 핵심이지만 양자 게이트는 측정 전까지 선형·가역(유니터리)이며, 변분 양자 회로(VQE·QAOA 등)는 게이트의 회전 각도를 매개변수로 두고 고전 컴퓨터가 경사하강법 같은 최적화로 학습시키는 양자 머신러닝 방식입니다.',
      async run(a) {
        wipe(a);
        title(a, '현실과 오해 — 그리고 신경망과 비교');
        a.zone('zl', 20, 46, 336, 162, { label: '현실: 아직은 아주 예민해요', color: 'amber' });
        a.zone('zm', 372, 46, 328, 162, { label: '흔한 오해와 진실', color: 'red' });
        const L = [
          '• 잡음·결어긋남 → 상태가 금방 망가짐',
          '• 초전도 방식: 약 0.01 K까지 냉각',
          '• 다른 방식: 이온 트랩 · 중성 원자 · 광자',
          '• 오류 정정: 논리 큐비트 1개에',
          '물리 큐비트 수십~수천 개 (방식마다 다름)',
          '• 지금: 물리 큐비트 수백~천여 개 (빠르게 바뀜)',
        ];
        const M = [
          ['✗', 'red', '모든 답을 동시에 계산해 골라낸다'],
          ['✗', 'red', '모든 일에서 더 빠르다'],
          ['✗', 'red', '곧 내 PC를 대체한다'],
          ['✓', 'green', '특정 문제에서 유리:'],
          ['', null, '소인수분해 · 분자·물질 시뮬레이션'],
          ['', null, '일부 탐색·최적화'],
        ];
        for (let i = 0; i < 6; i++) {
          const y = 80 + i * 21;
          const g = a.raw('g', {}, 'top');
          if (!a.fast) g.style.opacity = 0;
          a.text(i === 4 ? 46 : 34, y, L[i], { size: 12, weight: 600, anchor: 'start', par: g });
          const [mk, c, s] = M[i];
          if (mk) a.text(388, y, mk, { size: 13, weight: 800, color: c, par: g });
          a.text(404, y, s, { size: 12, weight: i >= 3 ? 800 : 600, anchor: 'start', par: g, color: i >= 3 ? 'green' : null });
          await a.tween(220, (k) => (g.style.opacity = k));
          await a.wait(140);
        }
        a.caption('특정 문제에서만 유리한, 아직은 예민한 기계');
        await a.wait(500);
        // 신경망과 비교
        a.text(24, 240, '신경망과 비교', { size: 13, weight: 800, anchor: 'start' });
        chip(a, '신경망', 300, 240, 'blue', { w: 100, h: 26, size: 12.5, layer: 'node' });
        chip(a, '양자컴퓨터', 565, 240, 'violet', { w: 120, h: 26, size: 12.5, layer: 'node' });
        const ROWS = [
          ['공통점', 276, [['행렬 × 벡터(선형대수) · 결과를 확률로 읽음', 432, 440, 'green']]],
          ['확률의 정체', 314, [['계산한 숫자 · 같은 입력 → 같은 값', 300, 236, 'blue'], ['측정할 때 실제로 일어나는 무작위', 565, 250, 'violet']]],
          ['핵심 연산', 352, [['비선형 활성화 함수', 300, 236, 'blue'], ['측정 전까지 선형 · 가역', 565, 250, 'violet']]],
          ['만나는 곳', 392, [['변분 양자 회로: 매개변수를 경사하강법으로 학습 (양자 머신러닝)', 432, 500, 'teal']]],
        ];
        for (const [k, y, cells] of ROWS) {
          a.raw('line', { x1: 20, y1: y - 19, x2: 700, y2: y - 19, style: 'stroke: var(--line); stroke-width: 1' }, 'edge');
          a.text(24, y, k, { size: 12, weight: 800, anchor: 'start', cls: 'muted' });
          const cs = cells.map(([s, x, w, c]) => chip(a, s, x, y, c, { w, h: 28, size: 12, layer: 'node', hidden: !a.fast }));
          await a.par(...cs.map((c) => a.show(c, 260)));
          await a.wait(220);
        }
        a.caption('닮은 건 행렬과 확률 — 확률이 생기는 이유는 전혀 달라요');
        await a.wait(1000);
      },
    },
  ],
  quiz: [
    {
      q: '0.6|0⟩ + 0.8|1⟩ 상태의 큐비트를 한 번 측정하면 어떻게 될까요?',
      c: ['0.6과 0.8이라는 진폭이 그대로 읽힌다', '0 또는 1 중 하나가 나오고, 1이 나올 확률은 64%다', '0과 1이 동시에 나온다', '진폭이 더 큰 1이 항상 나온다'],
      a: 1,
      why: '측정하면 결과는 딱 하나(0 또는 1)만 나오고, 확률은 진폭의 제곱입니다: 0.6² = 36%, 0.8² = 64%. 측정 뒤 상태는 그 결과로 바뀌므로, 진폭은 여러 번 재서 비율로 짐작할 수밖에 없어요.',
      step: 1,
    },
    {
      q: '|0⟩에 H(하다마드)를 한 번 걸면 50:50이 되는데, 한 번 더 걸면 100% |0⟩으로 돌아옵니다. 왜일까요?',
      c: ['두 번째 H는 아무 일도 하지 않기 때문', '측정을 두 번 해서 평균을 냈기 때문', '|1⟩로 가는 두 갈래의 진폭이 +0.5와 −0.5라 서로 지워지기 때문', '동전도 두 번 던지면 원래 면으로 돌아오기 때문'],
      a: 2,
      why: '같은 결과로 가는 갈래들의 진폭을 더하면, |0⟩ 쪽은 +0.5 + 0.5 = 1로 보강되고 |1⟩ 쪽은 +0.5 − 0.5 = 0으로 상쇄됩니다. 확률(늘 0 이상)로만 계산하는 동전은 이렇게 지워질 수 없어서 계속 50:50이에요.',
      step: 2,
    },
    {
      q: '정답이 하나인 N칸 탐색에서 그로버 알고리즘의 이득을 바르게 말한 것은?',
      c: ['약 √N번이면 되는 제곱 가속 — N = 100만이면 약 800바퀴', 'N과 상관없이 단 한 번에 반드시 찾는다', '지수 가속이라 log N번이면 충분하다', '바퀴를 많이 돌릴수록 정답 확률이 계속 올라가므로 많이 돌릴수록 좋다'],
      a: 0,
      why: '그로버는 한 바퀴마다 정답 진폭을 조금씩 키워 약 (π/4)√N바퀴에 정답 확률이 최대가 됩니다. 고전 O(N) 대비 O(√N)인 제곱 가속이고, 그보다 더 돌리면 확률이 다시 떨어집니다(8칸에서 3바퀴째는 약 33%).',
      step: 5,
    },
  ],
};

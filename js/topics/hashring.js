// 일관된 해싱: hash % N 과 해시 링 비교, 서버 추가/제거, 가상 노드
// 키 이름과 해시값(0~99). 링 위치 = 해시값.
const KEYS = [
  ['apple', 6], ['kiwi', 28], ['lime', 39], ['plum', 49],
  ['pear', 65], ['fig', 71], ['yuzu', 76], ['date', 98],
];
const MCOL = ['blue', 'green', 'amber', 'violet'];
const MX = [120, 280, 440, 600];
const slotY = (j) => 306 - j * 38;

// 링 기하
const CX = 268, CY = 230, R = 148;
const SV = { A: { h: 20, color: 'blue' }, B: { h: 55, color: 'green' }, C: { h: 85, color: 'amber' }, D: { h: 44, color: 'violet' } };
const ang = (h) => (h / 100) * Math.PI * 2;
const ring = (h, r = R) => [CX + r * Math.sin(ang(h)), CY - r * Math.cos(ang(h))];

/** 시계 방향으로 h 이상인 첫 서버(없으면 맨 처음으로 돌아감) */
function owner(h, servers) {
  const s = [...servers].sort((p, q) => p.h - q.h);
  return s.find((x) => x.h >= h) || s[0];
}
/** 링 위 from→to 시계 방향 호 경로 */
function arcPath(h1, h2, r = R) {
  let d = h2 - h1;
  if (d <= 0) d += 100;
  const [x1, y1] = ring(h1, r), [x2, y2] = ring(h1 + d, r);
  return `M${x1} ${y1} A${r} ${r} 0 ${d > 50 ? 1 : 0} 1 ${x2} ${y2}`;
}
/** 서버마다 "자기 몫" 구간을 색칠한다 */
function paintArcs(a, g, servers) {
  g.replaceChildren();
  const s = [...servers].sort((p, q) => p.h - q.h);
  s.forEach((x, i) => {
    const prev = s[(i - 1 + s.length) % s.length];
    a.raw('path', { d: arcPath(prev.h, x.h), fill: 'none', style: `stroke: var(--${x.color}); stroke-width: 12; opacity: .42`, 'stroke-linecap': 'butt' }, g);
  });
}
/** 링 무대 그리기. servers: [{id,h,color,label?,w?}] */
function drawRing(a, servers, { keys = true, owned = true, arcs = true } = {}) {
  a.clear('zone', 'edge', 'node', 'pkt', 'top');
  a.raw('circle', { cx: CX, cy: CY, r: R, fill: 'none', style: 'stroke: var(--line2); stroke-width: 12; opacity: .55' }, 'zone');
  const g = a.raw('g', {}, 'zone');
  if (arcs) paintArcs(a, g, servers);
  a.raw('path', { d: arcPath(94, 6, R - 24), fill: 'none', 'marker-end': 'url(#ah)', class: 'edge' }, 'zone');
  a.text(CX, CY - R + 44, '0', { size: 11, cls: 'muted', layer: 'edge', mono: true });
  a.text(CX, CY - 10, '해시 링', { size: 16, weight: 800, layer: 'edge' });
  a.text(CX, CY + 14, '0 ~ 99, 시계 방향', { size: 11.5, cls: 'muted', layer: 'edge' });
  for (const s of servers) {
    const [x, y] = ring(s.h);
    a.node(s.id, x, y, { shape: 'circle', w: s.w || 48, h: s.w || 48, label: s.label || s.id, color: s.color, size: s.w ? 12 : 16 });
  }
  if (keys) {
    for (const [n, h] of KEYS) {
      const c = owned ? owner(h, servers).color : 'gray';
      const [x, y] = ring(h);
      a.packet('', { id: 'k-' + n, at: [x, y], w: 15, h: 15, color: c });
      const [lx, ly] = ring(h, R + 36);
      a.text(lx, ly, `${n}·${h}`, { id: 't-' + n, size: 12, weight: 700, color: c, layer: 'top', mono: true });
    }
  }
  return g;
}
function recolorKey(a, n, c) {
  a.get('k-' + n).set(null, c);
  const t = a.get('t-' + n);
  t.setAttribute('class', t.getAttribute('class').replace(/tc-\w+/, 'tc-' + c));
}
/** 키 위치에서 담당 서버까지 링을 따라 시계 방향으로 걷는 점 */
async function walk(a, h1, h2, color, dur = 900) {
  let d = h2 - h1;
  if (d < 0) d += 100;
  const [x, y] = ring(h1);
  const p = a.packet('', { at: [x, y], w: 11, h: 11, color });
  await a.tween(dur, (t) => {
    const [px, py] = ring(h1 + d * t);
    p.x = px; p.y = py;
    p.g.setAttribute('transform', `translate(${px} ${py})`);
  });
  await a.fadeOut(p, 150);
}
/** 오른쪽 패널: 서버별 담당 비율 막대 */
function shareBars(a, servers, y0 = 250) {
  const s = [...servers].sort((p, q) => p.h - q.h);
  const share = {};
  s.forEach((x, i) => {
    const prev = s[(i - 1 + s.length) % s.length];
    let d = x.h - prev.h;
    if (d <= 0) d += 100;
    const k = x.id[0];
    share[k] = (share[k] || 0) + d;
  });
  return share;
}

export default {
  id: 'hashring',
  level: 4,
  cat: '분산 시스템',
  title: '일관된 해싱 — 서버가 바뀌어도 덜 흔들리게',
  sub: '캐시·DB 서버를 늘리거나 줄일 때, 옮겨야 하는 데이터를 최소로 줄이는 방법',
  analogy: '"번호 % 3"으로 반을 나누면, 반이 하나 늘어나는 순간 거의 모든 학생이 반을 옮겨야 합니다. 일관된 해싱은 학생과 교실을 둥근 운동장 위에 세워 두고 "시계 방향으로 걷다 처음 만나는 교실"로 가게 하는 방식이라, 교실이 하나 생겨도 그 바로 앞 구간 학생들만 옮깁니다.',
  keys: [
    'hash(key) % N 방식은 N이 바뀌면 대부분의 키(약 N/(N+1))가 다른 서버로 옮겨 간다.',
    '해시 링에서는 서버와 키를 같은 원 위에 놓고, 키는 시계 방향으로 처음 만나는 서버가 담당한다.',
    '서버를 추가·제거하면 그 서버 바로 앞 구간의 키만 옮겨진다 — 평균 1/N 만큼.',
    '서버가 적으면 구간 크기가 들쭉날쭉하므로, 서버 하나를 링 위 여러 점(가상 노드)으로 흩뿌려 고르게 만든다.',
  ],
  terms: [
    ['해시 함수', '같은 입력에는 늘 같은 숫자를 내놓되, 결과가 고르게 퍼지는 함수 (예: MurmurHash, xxHash)'],
    ['모듈러(%)', '나눈 나머지. hash % 3은 0, 1, 2 중 하나'],
    ['해시 링', '해시값의 범위(0 ~ 최댓값)를 원처럼 끝과 처음이 이어지게 생각한 것'],
    ['리밸런싱', '서버 구성이 바뀔 때 데이터를 새 담당 서버로 옮기는 작업'],
    ['가상 노드', '물리 서버 하나를 링 위 여러 위치에 배치한 것 (vnode)'],
    ['캐시 미스 폭풍', '키 담당이 대거 바뀌어 캐시가 한꺼번에 비고 DB로 요청이 쏟아지는 상황'],
  ],
  quiz: [
    { q: '해시 링에서 각 키는 어느 서버가 맡을까요?', c: ['시계 방향으로 걷다 처음 만나는 서버', '방향과 상관없이 가장 가까운 서버', '해시값을 서버 수로 나눈 나머지 번호의 서버', '지금 가장 한가한 서버'], a: 0, why: '키의 해시값 자리에서 시계 방향으로 처음 만나는 서버(해시값 이상인 첫 서버, 없으면 맨 처음으로 감음)가 담당합니다.', step: 2 },
    { q: 'hash(key) % 3으로 나누다가 서버를 4대로 늘리면 어떻게 될까요?', c: ['새 서버 몫(약 1/4)만 옮겨 간다', '키의 대부분(약 3/4)이 다른 서버로 옮겨 간다', '아무 키도 옮겨지지 않는다', '정확히 절반이 옮겨 간다'], a: 1, why: 'N이 바뀌면 나머지가 대부분 달라져 약 N/(N+1), 3→4면 약 75%가 이사합니다. 캐시라면 미스 폭풍이 생깁니다.', step: 1 },
    { q: '물리 서버마다 가상 노드(vnode)를 여러 개 두면 얻는 효과로 옳은 것은?', c: ['키 조회가 계산 한 번(O(1))으로 끝난다', '복제본을 따로 둘 필요가 없어진다', '노드가 빠질 때 그 몫이 한 이웃이 아니라 여러 노드로 나뉘어 퍼진다', '서버를 추가해도 어떤 키도 옮겨지지 않는다'], a: 2, why: 'vnode를 흩뿌리면 구간 크기가 고르게 되고, 노드가 빠져도 부하가 여러 노드로 분산됩니다. 성능에 따라 vnode 수로 가중치도 줄 수 있습니다.', step: 5 },
  ],
  setup(a) {
    a.text(360, 30, 'hash(key) % 3 = 서버 번호', { id: 'title', size: 18, weight: 800, layer: 'edge' });
    [0, 1, 2, 3].forEach((i) => a.node('m' + i, MX[i], 384, { label: `서버 ${i}`, color: MCOL[i], w: 128, h: 52, hidden: i === 3 }));
    KEYS.forEach(([n, h], i) => a.packet(`${n}·${h}`, { id: 'p-' + n, at: [62 + i * 85, 92], color: 'gray' }));
  },
  steps: [
    {
      t: '단순한 방법 — hash(key) % 3',
      easy: '데이터(키)를 서버 3대에 나눠 담으려면, 키를 숫자로 바꾼 뒤(해시) 3으로 나눈 나머지를 서버 번호로 쓰면 됩니다. 계산이 간단하고 고르게 잘 나뉩니다.',
      deep: '해시 함수는 키를 균일한 정수로 사상하므로 hash % N은 N개 버킷에 고르게 분배됩니다. memcached 클라이언트나 단순 샤딩에서 흔히 쓰던 방식이며, 조회 시 별도 메타데이터 없이 계산만으로 위치를 찾습니다(O(1)).',
      async run(a) {
        a.caption('예: kiwi → 해시 28 → 28 % 3 = 1 → 서버 1');
        const slots = [0, 0, 0];
        await a.par(...KEYS.map(([n, h], i) => {
          const s = h % 3, j = slots[s]++;
          return a.wait(i * 160).then(async () => {
            a.get('p-' + n).set(null, MCOL[s]);
            await a.move('p-' + n, [MX[s], slotY(j)], 700);
          });
        }));
        a.note('n1', 600, 260, '3대에 골고루\n2 · 3 · 3개', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '서버 하나 추가 → 거의 다 이사',
      easy: '손님이 늘어 서버를 4대로 늘리면 이제 "4로 나눈 나머지"를 써야 합니다. 그런데 나머지가 바뀌는 키가 대부분이라, 8개 중 6개가 다른 서버로 이사해야 합니다.',
      deep: 'N→N+1이면 키의 약 N/(N+1)이 재배치됩니다(3→4에서 약 75%). 캐시 서버라면 그 순간 대부분이 캐시 미스가 되어 원본 DB로 요청이 몰리고(thundering herd), DB 샤드라면 대량 데이터 이동이 필요합니다.',
      async run(a) {
        a.remove('n1');
        a.setText('title', 'hash(key) % 4 = 서버 번호');
        await a.show('m3');
        await a.flash('m3');
        // 이전 칸 위치 계산 → 그대로 남는 키는 제자리, 옮기는 키는 빈칸으로
        const slots3 = [0, 0, 0], old = {};
        for (const [n, h] of KEYS) old[n] = [h % 3, slots3[h % 3]++];
        const used = [new Set(), new Set(), new Set(), new Set()];
        for (const [n, h] of KEYS) if (h % 4 === old[n][0]) used[h % 4].add(old[n][1]);
        let moved = 0;
        const jobs = [];
        for (const [n, h] of KEYS) {
          const s = h % 4;
          if (s === old[n][0]) continue;
          let j = 0;
          while (used[s].has(j)) j++;
          used[s].add(j);
          const k = moved++;
          jobs.push(a.wait(k * 200).then(async () => {
            const p = a.get('p-' + n);
            p.set(null, 'red');
            await a.move(p, [MX[s], slotY(j)], 800);
            p.set(null, MCOL[s]);
          }));
        }
        await a.par(...jobs);
        a.note('n2', 360, 150, `8개 중 ${moved}개가 서버를 옮김!`, { color: 'red' });
        a.caption('나머지가 바뀐 키는 모두 다른 서버로 이사합니다');
        await a.wait(800);
      },
    },
    {
      t: '해시 링 — 원 위에 서버와 키를 함께',
      easy: '이번엔 0~99 숫자를 둥근 시계처럼 이어 붙인 원(링)을 생각합니다. 서버도 키도 해시값 자리에 놓고, 각 키는 시계 방향으로 걷다 처음 만나는 서버에 맡깁니다.',
      deep: '서버 식별자(IP 등)도 같은 해시 함수로 링 위에 배치합니다. 키의 담당 서버는 "해시값 이상인 첫 서버"(없으면 맨 처음으로 감는다)로, 정렬된 서버 위치 배열에서 이진 탐색하면 O(log N)에 찾습니다. Dynamo·Cassandra·Riak, 그리고 여러 캐시 클라이언트가 이 방식을 씁니다.',
      async run(a) {
        const S3 = ['A', 'B', 'C'].map((id) => ({ id, ...SV[id] }));
        const g = drawRing(a, S3, { owned: false, arcs: false });
        a.note('n3', 604, 92, '키는 시계 방향으로\n처음 만나는 서버에', { color: 'amber' });
        await a.par(...KEYS.map(([n, h], i) => a.wait(i * 180).then(async () => {
          const o = owner(h, S3);
          await walk(a, h, o.h, o.color, 800);
          recolorKey(a, n, o.color);
        })));
        if (!a.fast) g.style.opacity = 0;
        paintArcs(a, g, S3);
        await a.tween(400, (t) => (g.style.opacity = t));
        a.note('n3b', 604, 300, '색칠된 구간 =\n그 서버가 맡는 몫', { color: 'blue' });
        await a.wait(500);
      },
    },
    {
      t: '서버 추가 → 한 구간만 이사',
      easy: '서버 D를 링의 44 자리에 추가합니다. D 바로 앞(시계 반대 방향) 구간에 있던 키만 D로 옮기고, 나머지 키는 그대로입니다. 8개 중 2개만 움직였어요.',
      deep: 'D가 들어오면 이전 서버 A(20)와 D(44) 사이 구간 (20, 44]의 키만 B에서 D로 넘어갑니다. 평균적으로 전체 키의 1/(N+1)만 이동하며, 영향을 받는 서버도 이웃 하나(B)뿐입니다.',
      async run(a) {
        const S3 = ['A', 'B', 'C'].map((id) => ({ id, ...SV[id] }));
        const S4 = ['A', 'B', 'C', 'D'].map((id) => ({ id, ...SV[id] }));
        const g = drawRing(a, S3);
        const [x, y] = ring(SV.D.h);
        a.node('D', x, y, { shape: 'circle', w: 48, h: 48, label: 'D', color: 'violet', size: 16, hidden: true });
        await a.show('D');
        await a.flash('D');
        paintArcs(a, g, S4);
        let moved = 0;
        const jobs = [];
        for (const [n, h] of KEYS) {
          if (owner(h, S4).id === owner(h, S3).id) continue;
          moved++;
          jobs.push(walk(a, h, SV.D.h, 'violet', 700).then(() => recolorKey(a, n, 'violet')));
        }
        await a.par(...jobs);
        a.note('n4', 604, 92, `이동한 키: ${moved} / 8`, { color: 'green' });
        a.note('n4b', 604, 300, '% 4 방식은 6 / 8\n링은 D 앞 구간만', { color: 'violet' });
        await a.wait(700);
      },
    },
    {
      t: '서버 제거 → 그 몫만 이웃에게',
      easy: '서버 B가 고장 나서 빠지면, B가 맡던 키만 시계 방향 다음 서버(C)가 이어받습니다. 다른 서버의 키는 전혀 움직이지 않습니다.',
      deep: '제거된 노드의 구간이 후속 노드(successor)에 병합됩니다. 실제 시스템은 데이터를 다음 k개 노드에 복제해 두므로(Dynamo의 preference list), 노드가 빠져도 후속 노드가 이미 복제본을 갖고 있어 즉시 이어받을 수 있습니다.',
      async run(a) {
        const S4 = ['A', 'B', 'C', 'D'].map((id) => ({ id, ...SV[id] }));
        const S3 = ['A', 'C', 'D'].map((id) => ({ id, ...SV[id] }));
        const g = drawRing(a, S4);
        a.setNode('B', { color: 'red', label: '✕' });
        a.hl('B', true, 'red');
        await a.flash('B');
        await a.fadeOut('B', 400);
        paintArcs(a, g, S3);
        let moved = 0;
        const jobs = [];
        for (const [n, h] of KEYS) {
          if (owner(h, S4).id === owner(h, S3).id) continue;
          moved++;
          const o = owner(h, S3);
          jobs.push(walk(a, h, o.h, o.color, 900).then(() => recolorKey(a, n, o.color)));
        }
        await a.par(...jobs);
        a.note('n5', 604, 92, `이동한 키: ${moved} / 8`, { color: 'green' });
        a.note('n5b', 604, 300, 'B의 몫만 C가\n이어받음', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '가상 노드 — 몫을 고르게',
      easy: '서버가 몇 대뿐이면 자리 운에 따라 어떤 서버는 넓은 구간을, 어떤 서버는 좁은 구간을 맡게 됩니다. 그래서 서버 하나를 링 위 여러 자리에 "분신"으로 흩어 놓아 몫을 고르게 합니다.',
      deep: '물리 노드마다 수십~수백 개의 가상 노드(vnode)를 해시해 배치하면 구간 크기의 분산이 줄어듭니다. 성능이 좋은 서버에 vnode를 더 주면 가중치도 줄 수 있고, 노드가 빠질 때 그 부하가 한 이웃이 아니라 여러 노드로 나뉘어 퍼집니다. Cassandra는 num_tokens로 vnode 수를 정합니다.',
      async run(a) {
        const S3 = ['A', 'C', 'D'].map((id) => ({ id, ...SV[id] }));
        const VN = [['A1', 4], ['C1', 15], ['D1', 27], ['A2', 37], ['C2', 50], ['D2', 60], ['A3', 70], ['C3', 81], ['D3', 93]]
          .map(([id, h]) => ({ id, h, color: SV[id[0]].color, w: 38 }));
        const g = drawRing(a, S3, { keys: false });
        const rows = ['A', 'C', 'D'];
        a.text(604, 186, '서버별 담당 몫', { size: 13, weight: 700, layer: 'top' });
        const before = shareBars(a, S3);
        rows.forEach((k, i) => {
          const y = 220 + i * 40;
          a.text(506, y, k, { size: 14, weight: 800, color: SV[k].color, layer: 'top' });
          a.bar('sb' + k, 524, y, 120, { color: SV[k].color, value: before[k] / 100 * 2 });
          a.text(680, y, before[k] + '%', { id: 'sp' + k, size: 12, weight: 700, layer: 'top', mono: true });
        });
        a.note('n6', 604, 92, '구간 크기가 제각각\n(24% ~ 41%)', { color: 'red' });
        await a.wait(900);
        a.remove('n6');
        await a.par(...S3.map((s) => a.fadeOut(s.id, 300)));
        for (const v of VN) {
          const [x, y] = ring(v.h);
          a.node(v.id, x, y, { shape: 'circle', w: 38, h: 38, label: v.id, color: v.color, size: 12, hidden: true });
        }
        await a.par(...VN.map((v, i) => a.wait(i * 90).then(() => a.show(v.id, 300))));
        paintArcs(a, g, VN);
        const after = shareBars(a, VN);
        await a.par(...rows.map((k) => a.get('sb' + k).set(after[k] / 100 * 2, 600)));
        rows.forEach((k) => a.setText('sp' + k, after[k] + '%'));
        a.note('n6b', 604, 92, '서버마다 분신 3개\n→ 31% ~ 35%', { color: 'green' });
        await a.wait(700);
      },
    },
  ],
};

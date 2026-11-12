// RAG(검색 증강 생성): LLM 혼자의 한계 → 청크 → 임베딩·벡터 DB → 유사도 검색 → 프롬프트 조립 → 근거 있는 답 → 잘 안 될 때
// 단계마다 무대를 새로 그린다. 좌표·유사도·토큰 수는 모두 설명용 예시 값(고정)이다.

// 의미 지도 위 조각들: [글, x, y, 색]
const MAP = [
  ['여름휴가 5일', 445, 165, 'blue'], ['연차 15일', 535, 195, 'blue'], ['병가 10일', 420, 225, 'blue'],
  ['재택 주 2회', 420, 330, 'teal'], ['출장 식비', 640, 110, 'amber'], ['숙박비', 655, 190, 'amber'],
  ['노트북 고장', 590, 330, 'violet'], ['비밀번호', 655, 390, 'violet'],
];
const Q = [470, 150]; // 질문 "여름휴가는 며칠?"의 좌표
const sim = (x, y) => 1 - Math.hypot(x - Q[0], y - Q[1]) / 240; // 설명용: 거리 → 유사도
const TOP = [0, 1, 2]; // 가까운 3개

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: o.round ?? 8, h: o.h || 30, w: o.w, size: o.size || 13, id: o.id, hidden: o.hidden, layer: o.layer });
}
function ellipse(a, cx, cy, rx, ry, color) {
  return a.raw('ellipse', { cx, cy, rx, ry, style: `fill: color-mix(in srgb, var(--${color}) 7%, transparent); stroke: color-mix(in srgb, var(--${color}) 55%, transparent); stroke-width: 1.5; stroke-dasharray: 5 5` }, 'zone');
}
function dot(a, x, y, color, r = 5) {
  return a.raw('circle', { cx: x, cy: y, r, style: `fill: var(--${color})` }, 'node');
}
/** 벡터 DB 지도. show=false면 점과 이름을 숨긴 채 만든다(나중에 하나씩 보이기) */
function drawMap(a, show = true) {
  a.zone('map', 320, 34, 384, 392, { label: '벡터 DB · 의미 지도 (2차원으로 단순화)', color: 'gray' });
  ellipse(a, 470, 190, 100, 68, 'blue');
  ellipse(a, 645, 150, 50, 72, 'amber');
  ellipse(a, 420, 335, 64, 34, 'teal');
  ellipse(a, 622, 360, 72, 50, 'violet');
  a.text(388, 112, '휴가', { size: 11, weight: 700, color: 'blue', layer: 'edge' });
  a.text(645, 66, '출장', { size: 11, weight: 700, color: 'amber', layer: 'edge' });
  a.text(368, 300, '근무', { size: 11, weight: 700, color: 'teal', layer: 'edge' });
  a.text(560, 296, 'IT', { size: 11, weight: 700, color: 'violet', layer: 'edge' });
  return MAP.map(([s, x, y, c]) => {
    const d = dot(a, x, y, c);
    const t = a.text(x, y + 15, s, { size: 11, weight: 700, layer: 'node' });
    if (!show) { d.style.opacity = 0; t.style.opacity = 0; }
    return { d, t, x, y, c, s };
  });
}
/** 왼쪽에서 오른쪽으로 늘어나는 막대 조각(raw rect) */
function seg(a, x, y, w, h, color) {
  const r = a.raw('rect', { x, y: y - h / 2, width: 0, height: h, rx: 3, style: `fill: var(--${color})` }, 'node');
  return { r, grow: (dur) => a.tween(dur, (k) => r.setAttribute('width', w * k)) };
}

export default {
  id: 'rag',
  level: 3,
  cat: 'AI',
  title: 'RAG — 찾아보고 답하는 AI',
  sub: '질문과 관련된 문서 조각을 먼저 찾아 LLM에게 함께 건네, 근거와 출처가 있는 답을 받는 방법',
  analogy: '"기억만으로 푸는 시험"과 "오픈북 시험"의 차이와 같아요. 기억만으로는 배운 적 없는 회사 규정을 맞힐 수 없지만, 책을 펼쳐 관련된 쪽을 찾아 읽고 답하면 정확해지고 "몇 쪽에 있었다"고 출처도 댈 수 있죠. RAG는 AI에게 이 오픈북 시험을 보게 하는 방법이에요.',
  keys: [
    'LLM은 학습한 글의 패턴으로만 답하므로 사내 문서·최신 정보처럼 학습에 없던 내용은 모르고, 그럴듯한 오답(환각)을 낼 수 있다.',
    'RAG는 미리 문서를 조각(청크)으로 자르고 각 조각을 임베딩(의미 좌표)으로 바꿔 벡터 DB에 저장해 둔다.',
    '질문이 오면 질문도 같은 모델로 임베딩해, 의미가 가장 가까운 조각 k개(top-k)를 코사인 유사도로 찾는다.',
    '찾은 조각을 질문과 함께 프롬프트에 붙여 LLM에 보내면, 모델은 그 자료를 근거로 답하고 출처를 밝힐 수 있다. 조각이 많을수록 토큰 비용도 늘어난다.',
    '답의 품질은 검색이 좌우한다: 청크 크기, 키워드와 의미를 함께 쓰는 하이브리드 검색, 재순위, 오래된 문서 정리가 핵심 손질 지점이다.',
  ],
  terms: [
    ['RAG', 'Retrieval-Augmented Generation. 검색(Retrieval)으로 찾은 자료를 붙여(Augmented) 답을 생성(Generation)하는 방식'],
    ['청크', '문서를 검색하기 좋은 크기로 자른 조각. 보통 문단 몇 개, 수백 토큰 정도'],
    ['임베딩', '글의 의미를 수백~수천 개의 숫자(벡터)로 나타낸 것. 뜻이 비슷하면 벡터도 가깝다'],
    ['벡터 DB', '임베딩 벡터를 저장하고 "가장 가까운 벡터"를 빠르게 찾아 주는 저장소'],
    ['코사인 유사도', '두 벡터의 방향이 얼마나 같은지 나타내는 값. 1에 가까울수록 뜻이 비슷하다'],
    ['top-k', '유사도가 높은 순으로 가져오는 조각의 개수 k'],
    ['재순위(reranker)', '1차로 찾은 후보를 질문과 한 쌍씩 다시 읽고 점수를 매겨 순서를 고치는 모델'],
    ['하이브리드 검색', '낱말이 정확히 일치하는지 보는 키워드 검색과 의미 검색을 함께 쓰는 방법'],
  ],
  setup(a) {
    a.node('user', 100, 180, { label: '직원', sub: '질문하는 사람', shape: 'person', color: 'blue', w: 136, h: 56 });
  },
  steps: [
    {
      t: 'LLM 혼자서는 — 모르는 건 지어낸다',
      easy: '"우리 회사 여름휴가는 며칠이에요?"라고 AI에게 그냥 물어보면, AI는 회사 규정을 읽어 본 적이 없어서 정답을 알 수 없어요. 그래서 "모른다"고 하거나, 그럴듯하지만 틀린 답을 지어내기도 합니다(환각).',
      deep: 'LLM의 지식은 학습 시점까지 공개된 글에서 가중치에 압축된 패턴뿐이라, 사내 문서·학습 이후 바뀐 규정은 담겨 있지 않습니다. 최근 모델은 "알 수 없다"고 답하도록 다듬어지기도 했지만 여전히 그럴듯한 추측을 내놓을 수 있습니다. 자주 바뀌는 사실을 미세조정(fine-tuning)으로 넣는 건 비싸고 갱신이 느려서, 답할 때마다 자료를 찾아 붙이는 RAG(Lewis 외, 2020)가 널리 쓰입니다.',
      async run(a) {
        wipe(a);
        a.node('user', 100, 180, { label: '직원', sub: '질문하는 사람', shape: 'person', color: 'blue', w: 136, h: 56 });
        a.node('llm', 360, 180, { label: 'LLM', sub: '학습한 글로만 답함', color: 'violet', w: 176, h: 64 });
        a.edge('user', 'llm', { both: true });
        a.zone('docs', 538, 52, 166, 264, { label: '회사 내부 문서', color: 'gray' });
        ['휴가 규정', '출장 규정', 'IT 안내'].forEach((s, i) => {
          a.node('d' + i, 621, 112 + i * 60, { label: '📄 ' + s, color: 'gray', w: 136, h: 40, size: 13 });
          a.get('d' + i).g.style.opacity = 0.5;
        });
        a.text(621, 292, '🔒 학습한 적 없음', { size: 12, weight: 700, cls: 'muted' });
        await a.wait(300);
        await a.send(null, [290, 128], '여름휴가 며칠?', { color: 'blue', dur: 800, fromAt: [150, 128] });
        await a.flash('llm');
        a.edge('llm', [534, 180], { dashed: true, color: 'red', arrow: false, label: '✕ 볼 수 없음', ly: -14 });
        await a.wait(500);
        const ans = await a.send(null, [140, 236], '3일이에요!', { color: 'red', dur: 800, fromAt: [300, 236], keep: true });
        await a.flash(ans);
        a.note('n1', 300, 330, '그럴듯하지만 틀린 답 — 환각\n실제 규정은 연 5일 (휴가 규정 §3)', { color: 'red' });
        a.caption('학습에 없던 정보는 모를 수밖에 없어요');
        await a.wait(900);
      },
    },
    {
      t: '준비 ① 문서를 조각으로 — 청크',
      easy: '먼저 회사 문서를 미리 손질해 둬요. 긴 문서를 통째로 쓰면 찾기 어렵기 때문에, 주제 하나씩 담기도록 알맞은 크기의 조각(청크)으로 자릅니다. 조각마다 어느 문서의 몇 조인지도 함께 적어 둬요.',
      deep: '보통 제목·문단 경계를 따라 자르고(재귀 분할), 조각 크기는 수백 토큰 안팎, 앞뒤 조각과 10~20% 정도 겹치게(overlap) 해서 경계에서 문맥이 끊기는 걸 줄입니다. 문서명·조항·개정일·접근 권한 같은 메타데이터를 함께 저장하면 출처 표시와 필터링에 씁니다. PDF·표·스캔 이미지는 글을 제대로 뽑아내는 전처리가 품질을 크게 좌우합니다.',
      async run(a) {
        wipe(a);
        a.raw('rect', { x: 40, y: 44, width: 230, height: 366, rx: 10, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5' }, 'zone');
        a.text(155, 68, '📄 휴가 규정.pdf', { size: 13, weight: 800, layer: 'edge' });
        const SEC = [['§1 연차', '연차 15일'], ['§2 병가', '병가 연 10일'], ['§3 여름휴가', '여름휴가 5일'], ['§4 경조 휴가', '경조 휴가']];
        const SY = (i) => 92 + i * 78;
        SEC.forEach(([h], i) => {
          a.text(58, SY(i) + 12, h, { size: 12.5, weight: 700, anchor: 'start', layer: 'edge' });
          for (let j = 0; j < 3; j++) a.raw('rect', { x: 58, y: SY(i) + 28 + j * 12, width: 190 - j * 40, height: 6, rx: 3, style: 'fill: var(--line2)' }, 'edge');
        });
        a.text(520, 70, '청크(조각) — 하나에 주제 하나', { size: 12, weight: 700, cls: 'muted' });
        await a.wait(300);
        // 자르는 선
        const cuts = [1, 2, 3].map((i) => {
          const y = SY(i) - 6;
          const l = a.raw('line', { x1: 30, y1: y, x2: 30, y2: y, class: 'edge ec-red dashed' }, 'top');
          a.text(22, y, '✂', { size: 14, color: 'red' });
          return { l, y };
        });
        await a.tween(600, (k) => cuts.forEach((c) => c.l.setAttribute('x2', 30 + 250 * k)));
        a.caption('주제가 바뀌는 곳에서 자릅니다');
        await a.par(...SEC.map(([h, s], i) => a.wait(i * 200).then(async () => {
          const p = chip(a, `${h.split(' ')[0]} ${s}`, 155, SY(i) + 34, 'blue', { w: 200, h: 36 });
          await a.move(p, [500, 112 + i * 66], 700);
          a.text(640, 112 + i * 66, '≈150토큰', { size: 11.5, cls: 'muted', anchor: 'start', weight: 700 });
        })));
        await a.wait(300);
        a.note('n1', 530, 384, '조각마다 문서명·조항·개정일도 함께 저장', { color: 'blue' });
        await a.wait(800);
      },
    },
    {
      t: '준비 ② 의미 좌표로 — 임베딩 · 벡터 DB',
      easy: '조각마다 "의미 좌표"를 계산해 지도에 점으로 찍어 둬요. 뜻이 비슷한 조각은 가까이 모입니다. 휴가 이야기는 휴가끼리, 출장 이야기는 출장끼리 모여요. 이 지도를 보관하는 곳이 벡터 DB예요.',
      deep: '임베딩 모델은 글 하나를 수백~수천 차원 벡터로 바꿉니다(예: 384·768·1,536·3,072차원). 문서와 질문은 반드시 같은 임베딩 모델로 바꿔야 비교할 수 있고, 모델을 바꾸면 전부 다시 임베딩해야 합니다. 저장소로는 pgvector(PostgreSQL)·FAISS·Milvus·Qdrant 같은 벡터 DB/라이브러리를 쓰며, 그림은 고차원 공간을 2차원으로 아주 단순화한 것입니다.',
      async run(a) {
        wipe(a);
        const pts = drawMap(a, false);
        a.node('emb', 236, 224, { label: '임베딩 모델', sub: '글 → 숫자 벡터', color: 'gray', w: 136, h: 58, size: 14 });
        a.text(236, 284, '[0.12, −0.48, 0.33, …]', { size: 11.5, mono: true, weight: 700 });
        a.text(236, 304, '실제로는 수백~수천 차원', { size: 11, cls: 'muted' });
        const cs = MAP.map(([s, , , c], i) => chip(a, s, 82, 70 + i * 44, c, { w: 120, h: 30, size: 12 }));
        await a.wait(250);
        await a.par(...MAP.map((m, i) => a.wait(i * 260).then(async () => {
          const c = cs[i];
          c.g.style.opacity = 0.35;
          const p = chip(a, '', 146, 70 + i * 44, m[3], { w: 12, h: 12, round: 6 });
          await a.move(p, [166, 224], 420);
          await a.move(p, [306, 224], 0);
          await a.move(p, [m[1], m[2]], 520);
          a.remove(p);
          pts[i].d.style.opacity = 1;
          pts[i].t.style.opacity = 1;
        })));
        a.caption('뜻이 비슷한 조각끼리 가까이 모여요');
        await a.wait(900);
      },
    },
    {
      t: '질문도 좌표로 — 가까운 조각 찾기',
      easy: '질문이 오면 질문도 똑같은 방법으로 지도 위 좌표로 바꿔요. 그리고 질문 점에서 가장 가까운 조각 몇 개를 고릅니다. 낱말이 똑같지 않아도 뜻이 가까우면 찾을 수 있어요.',
      deep: '가까움은 보통 코사인 유사도 cos θ = A·B / (|A||B|)로 재며, 벡터를 정규화해 두면 내적과 같습니다. 조각이 수백만 개면 전부 비교(O(N))하기 어려워 HNSW(그래프 기반)·IVF 같은 근사 최근접 이웃(ANN) 색인으로 약간의 정확도를 내주고 밀리초 단위로 찾습니다. top-k는 흔히 3~10개이며, k가 작으면 필요한 조각을 놓치고 크면 잡음과 비용이 늘어납니다.',
      async run(a) {
        wipe(a);
        const pts = drawMap(a);
        a.node('q', 160, 80, { label: '여름휴가는 며칠?', sub: '질문', color: 'pink', w: 230, h: 52, size: 14 });
        a.node('emb', 160, 186, { label: '임베딩 모델', sub: '문서와 같은 모델', color: 'gray', w: 160, h: 52, size: 14 });
        a.edge('q', 'emb');
        await a.wait(250);
        const p = chip(a, '', 243, 186, 'pink', { w: 14, h: 14, round: 7 });
        await a.move(p, Q, 750);
        a.remove(p);
        const qd = a.raw('circle', { cx: Q[0], cy: Q[1], r: 7, style: 'fill: var(--pink); stroke: var(--bg); stroke-width: 2' }, 'top');
        a.text(Q[0] + 30, Q[1] - 12, '질문', { size: 11.5, weight: 800, color: 'pink' });
        const R = Math.hypot(MAP[2][1] - Q[0], MAP[2][2] - Q[1]) + 9;
        const ring = a.raw('circle', { cx: Q[0], cy: Q[1], r: 0, style: 'fill: color-mix(in srgb, var(--pink) 7%, transparent); stroke: var(--pink); stroke-width: 1.5; stroke-dasharray: 6 5' }, 'zone');
        a.caption('질문 점에서 가까운 순서대로 찾아요');
        a.text(30, 262, 'top-k = 3 (가장 가까운 3개)', { size: 12.5, weight: 800, anchor: 'start' });
        a.text(290, 262, '유사도', { size: 11.5, weight: 700, anchor: 'end', cls: 'muted' });
        let found = 0;
        const order = TOP.map((i) => ({ i, d: Math.hypot(MAP[i][1] - Q[0], MAP[i][2] - Q[1]) })).sort((x, y) => x.d - y.d);
        await a.tween(1500, (k) => {
          const r = R * k;
          ring.setAttribute('r', r);
          while (found < order.length && order[found].d <= r) {
            const { i } = order[found];
            const m = MAP[i];
            a.raw('circle', { cx: m[1], cy: m[2], r: 10, style: 'fill: none; stroke: var(--green); stroke-width: 2.5' }, 'top');
            const y = 294 + found * 32;
            a.text(34, y, '①②③'[found], { size: 14, weight: 800, anchor: 'start', color: 'green' });
            a.text(60, y, m[0], { size: 13, weight: 700, anchor: 'start' });
            a.text(290, y, sim(m[1], m[2]).toFixed(2), { size: 13, weight: 700, anchor: 'end', mono: true, color: 'green' });
            found++;
          }
        });
        qd.parentNode.append(qd);
        await a.wait(300);
        a.note('n1', 160, 404, '코사인 유사도: 방향이 같을수록 1', { color: 'blue' });
        await a.wait(800);
      },
    },
    {
      t: '찾은 조각을 붙여 — 프롬프트 만들기',
      easy: '찾은 조각 3개를 질문과 함께 한 장의 글(프롬프트)로 묶어 LLM에게 보내요. "아래 자료만 보고 답하고, 출처를 밝혀 줘"라는 지시도 붙입니다. 붙이는 조각이 많을수록 LLM이 읽을 글이 길어져 비용과 시간이 늘어요.',
      deep: 'LLM이 한 번에 읽는 양은 컨텍스트 창(수천~수십만 토큰)으로 제한되고, 입력 토큰만큼 요금과 지연이 늘어납니다. 그래서 사용 토큰 ≈ 지시문 + k × 청크 크기 + 질문을 염두에 두고 k와 청크 크기를 정합니다. 긴 컨텍스트의 중간에 놓인 정보를 덜 활용하는 경향(lost in the middle)도 보고되어, 중요한 조각을 앞에 두거나 압축하기도 합니다.',
      async run(a) {
        wipe(a);
        a.zone('pz', 20, 36, 440, 296, { label: '프롬프트 = LLM에 보낼 글', color: 'gray' });
        a.text(600, 60, '검색된 top-3', { id: 'hd', size: 12, weight: 700, cls: 'muted' });
        const ROWS = [
          ['지시: 아래 자료만 근거로 답하고, 출처를 밝혀요', 'gray', 76],
          ['[1] 휴가 규정 §3 — 여름휴가 연 5일…', 'blue', 124],
          ['[2] 휴가 규정 §1 — 연차 15일…', 'blue', 168],
          ['[3] 휴가 규정 §2 — 병가 연 10일…', 'blue', 212],
          ['질문: 여름휴가는 며칠이에요?', 'pink', 268],
        ];
        // 막대: 창 2,000토큰 기준
        const BX = 40, BW = 640, BY = 376, WIN = 2000;
        a.text(BX, 354, '컨텍스트 창 (예: 2,000토큰)', { size: 12, weight: 700, anchor: 'start' });
        a.text(BX + BW, 354, '', { id: 'tok', size: 12, weight: 800, anchor: 'end', mono: true });
        a.raw('rect', { x: BX, y: BY - 9, width: BW, height: 18, rx: 5, style: 'fill: var(--panel2); stroke: var(--line2)' }, 'edge');
        const TOKS = [40, 150, 150, 150, 15];
        let used = 0;
        const chips = ROWS.map(([s, c, y], i) => {
          const from = i === 0 ? [240, y] : i === 4 ? [600, 268] : [600, 100 + (i - 1) * 46];
          const p = chip(a, i >= 1 && i <= 3 ? `[${i}] ${['여름휴가 5일', '연차 15일', '병가 10일'][i - 1]}` : s, from[0], from[1], c, { w: i >= 1 && i <= 3 ? 170 : 400, h: 32, size: 12, round: 6, hidden: i === 0 });
          return p;
        });
        await a.wait(300);
        for (let i = 0; i < ROWS.length; i++) {
          const p = chips[i];
          if (i === 0) await a.show(p, 300);
          else {
            const [s, , y] = ROWS[i];
            await a.move(p, [240, y], 600);
            if (i <= 3) { p.set(s); const r = p.g.querySelector('rect'); r.setAttribute('width', 400); r.setAttribute('x', -200); }
          }
          const w = (TOKS[i] / WIN) * BW;
          const sg = seg(a, BX + (used / WIN) * BW, BY, w - 1.5, 14, ROWS[i][1]);
          used += TOKS[i];
          a.setText('tok', `≈ ${used}토큰`);
          await sg.grow(250);
        }
        a.text(BX + (used / WIN) * BW + 10, BY, '← 조각을 늘릴수록 길어져요', { size: 11.5, weight: 700, anchor: 'start', cls: 'muted' });
        a.remove('hd');
        a.node('llm', 600, 184, { label: 'LLM', sub: '자료를 읽고 답함', color: 'violet', w: 160, h: 60, hidden: true });
        await a.show('llm', 300);
        a.edge([462, 184], 'llm');
        await a.send([462, 184], [516, 184], '', { color: 'violet', w: 16, h: 16, dur: 450 });
        await a.flash('llm');
        a.caption('지시 + 자료 + 질문을 한 번에 보냅니다');
        await a.wait(800);
      },
    },
    {
      t: '근거 있는 답 + 출처',
      easy: 'LLM은 붙여 준 자료를 읽고 "여름휴가는 연 5일"이라고 답하며, 어느 문서에서 가져왔는지 출처도 함께 보여 줘요. 출처가 있으니 직원이 원문을 눌러 직접 확인할 수 있어요.',
      deep: '조각마다 [1]·[2] 같은 번호를 달아 주고 "답의 근거 번호를 표시하라"고 지시하면 인용을 붙일 수 있습니다. 그래도 모델이 자료를 잘못 읽거나 자료에 없는 말을 덧붙일 수 있으므로, 답이 자료로 뒷받침되는지(충실성, faithfulness)를 따로 평가합니다. 평가는 보통 검색 단계(recall@k: 필요한 조각이 top-k 안에 들었나)와 생성 단계(충실성·질문 관련성)를 나눠 측정하며, RAGAS 같은 도구나 LLM 채점에 사람 표본 검토를 곁들입니다.',
      async run(a) {
        wipe(a);
        a.node('llm', 110, 120, { label: 'LLM', sub: '자료를 읽고 답함', color: 'violet', w: 160, h: 60 });
        a.zone('card', 232, 50, 472, 152, { label: '답변', color: 'green' });
        a.edge('llm', [228, 120]);
        a.text(256, 94, '', { id: 'l1', size: 17, weight: 800, anchor: 'start' });
        a.text(256, 126, '', { id: 'l2', size: 17, weight: 800, anchor: 'start' });
        await a.send([192, 120], [226, 120], '', { color: 'violet', w: 14, h: 14, dur: 300 });
        const T1 = ['여름휴가는', ' 연', ' 5일이며,'], T2 = ['7~8월', ' 중에', ' 사용합니다.', ' [1]'];
        let s1 = '', s2 = '';
        for (const t of T1) { s1 += t; a.setText('l1', s1); await a.wait(160); }
        for (const t of T2) { s2 += t; a.setText('l2', s2); await a.wait(160); }
        a.text(256, 170, '✓ 문서에 근거한 답', { size: 12.5, weight: 800, anchor: 'start', color: 'green' });
        await a.wait(300);
        a.node('src', 468, 280, { label: '[1] 휴가 규정 §3', sub: '2026.1 개정 · 원문 보기', color: 'blue', w: 236, h: 56, size: 14, hidden: true });
        await a.show('src', 300);
        a.edge([468, 206], 'src', { dashed: true, color: 'blue', label: '출처', lx: 22, ly: 0 });
        a.node('user', 110, 280, { label: '직원', sub: '출처로 확인', shape: 'person', color: 'blue', w: 136, h: 56 });
        a.edge('user', 'src', { dashed: true, label: '🔎 원문 확인' });
        await a.send([180, 280], [348, 280], '', { color: 'blue', w: 14, h: 14, dur: 600 });
        await a.flash('src');
        a.note('n1', 360, 384, 'RAG 없이: "3일" ✗   →   RAG: "5일" ✓ (출처 있음)\n엉뚱한 조각을 찾으면 답도 틀려요 — 그래서 출처를 보여 줘요', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '잘 안 될 때 — 점검할 네 곳',
      easy: 'RAG가 틀린다면 대개 "찾기"가 문제예요. 조각 크기가 안 맞거나, 낱말이 달라 못 찾거나, 순서가 엉망이거나, 오래된 문서가 섞여 있지 않은지 살펴보고 고칩니다.',
      deep: '의미 검색은 제품 코드·오류 번호·사람 이름 같은 정확한 낱말에 약해, BM25 키워드 검색과 합치고 RRF(순위 역수 합) 등으로 순위를 섞는 하이브리드 검색을 씁니다. 재순위 모델(크로스 인코더)은 1차 후보 20~50개를 질문과 한 쌍씩 다시 채점해 상위 3~5개만 남깁니다. 문서가 바뀌면 해당 조각을 다시 임베딩·색인하고 옛 판을 지우며, 날짜·부서·접근 권한 같은 메타데이터 필터로 볼 수 있는 최신 문서만 검색합니다.',
      async run(a) {
        wipe(a);
        const P = [
          [16, 36, '① 조각 크기가 안 맞음', 'amber'], [368, 36, '② 낱말이 달라 못 찾음', 'red'],
          [16, 242, '③ 순서가 애매함', 'violet'], [368, 242, '④ 오래된 문서가 섞임', 'gray'],
        ];
        P.forEach(([x, y, l, c], i) => a.zone('p' + i, x, y, 336, i < 2 ? 190 : 184, { label: l, color: c, hidden: true }));
        const fix = (x, y, s) => chip(a, s, x, y, 'green', { h: 28, size: 12, round: 14, hidden: true });

        // ① 청크 크기
        await a.show('p0', 250);
        a.text(36, 80, '너무 큼', { size: 12, weight: 700, anchor: 'start' });
        const big = [['blue', 70], ['amber', 70], ['violet', 70]].map(([c, w], j) => seg(a, 110 + j * 72, 80, w, 14, c));
        await a.par(...big.map((b) => b.grow(300)));
        a.text(326, 100, '주제가 섞여 좌표가 흐려짐', { size: 11, anchor: 'end', cls: 'muted' });
        a.text(36, 128, '너무 작음', { size: 12, weight: 700, anchor: 'start' });
        const sm = [0, 1, 2, 3, 4, 5].map((j) => seg(a, 110 + j * 36, 128, 30, 14, 'blue'));
        await a.par(...sm.map((b) => b.grow(300)));
        a.text(326, 148, '"7~8월 중 사용" — 무엇을?', { size: 11, anchor: 'end', cls: 'muted' });
        const f0 = fix(184, 192, '→ 문단 단위로 + 앞뒤 조금 겹치기');
        await a.show(f0, 250);
        await a.wait(300);

        // ② 키워드 vs 의미
        await a.show('p1', 250);
        chip(a, '"E-401 오류" 해결법?', 536, 80, 'pink', { h: 28, size: 12 });
        a.text(388, 118, '의미 검색', { size: 12, weight: 700, anchor: 'start' });
        a.text(684, 118, '"오류 해결 일반" ✗', { size: 12, weight: 700, anchor: 'end', color: 'red' });
        await a.wait(250);
        a.text(388, 146, '키워드(BM25)', { size: 12, weight: 700, anchor: 'start' });
        a.text(684, 146, '"E-401 대처" ✓', { size: 12, weight: 700, anchor: 'end', color: 'green' });
        const f1 = fix(536, 192, '→ 하이브리드 검색 (둘 다 쓰기)');
        await a.show(f1, 250);
        await a.wait(300);

        // ③ 재순위
        await a.show('p2', 250);
        const C = [['병가 10일'], ['연차 15일'], ['여름휴가 5일']];
        const ys = [282, 312, 342];
        C.forEach(([s], j) => chip(a, s, 80, ys[j], 'gray', { w: 100, h: 24, size: 11, round: 6 }));
        a.text(80, 366, '1차 검색 순서', { size: 10.5, cls: 'muted' });
        a.node('rr', 185, 312, { label: '재순위', sub: '다시 채점', color: 'violet', w: 92, h: 50, size: 13 });
        a.edge([132, 312], 'rr');
        a.edge('rr', [238, 312]);
        a.text(290, 366, '고친 순서', { size: 10.5, cls: 'muted' });
        await a.flash('rr');
        for (const [j, k] of [[2, 0], [1, 1], [0, 2]]) {
          const p = chip(a, C[j][0], 290, ys[k], k === 0 ? 'green' : 'gray', { w: 100, h: 24, size: 11, round: 6, hidden: true });
          await a.show(p, 220);
          if (k === 2) p.g.style.opacity = 0.5;
        }
        const f2 = fix(184, 398, '→ 재순위(reranker)로 다시 정렬');
        await a.show(f2, 250);
        await a.wait(300);

        // ④ 오래된 문서
        await a.show('p3', 250);
        const o1 = chip(a, '2023판 · 여름휴가 4일', 536, 290, 'gray', { h: 28, size: 12, round: 6 });
        chip(a, '2026판 · 여름휴가 5일', 536, 330, 'green', { h: 28, size: 12, round: 6 });
        await a.wait(250);
        a.raw('line', { x1: 456, y1: 290, x2: 616, y2: 290, style: 'stroke: var(--red); stroke-width: 2' }, 'top');
        o1.g.style.opacity = 0.55;
        a.text(536, 362, '옛 판이 더 가까우면 옛 답이 나와요', { size: 11, cls: 'muted' });
        const f3 = fix(536, 398, '→ 갱신·재색인 + 날짜 필터');
        await a.show(f3, 250);
        a.caption('답이 틀리면 먼저 "무엇을 찾아 왔는지"부터 보세요');
        await a.wait(900);
      },
    },
  ],
  quiz: [
    {
      q: '회사 내부 규정을 RAG 없이 LLM에게만 물으면 어떤 일이 생기기 쉬울까요?',
      c: ['회사 서버에 접속해 규정을 직접 읽어 온다', '질문을 거부하고 아무 답도 하지 않는다', '배운 적 없는 내용이라 그럴듯한 오답을 낼 수 있다', '규정이 바뀐 날짜까지 정확히 알려 준다'],
      a: 2,
      why: 'LLM은 학습한 글의 패턴으로만 답합니다. 사내 문서는 학습에 없었으므로 "모른다"고 하거나 그럴듯한 오답(환각)을 낼 수 있어요.',
      step: 0,
    },
    {
      q: 'RAG에서 질문과 관련된 조각은 어떻게 찾을까요?',
      c: ['질문도 같은 모델로 임베딩해, 의미 좌표가 가까운 조각을 고른다', 'LLM이 문서 전체를 처음부터 끝까지 읽고 고른다', '조각을 무작위로 몇 개 뽑아 본다', '질문과 글자가 똑같은 조각만 고른다'],
      a: 0,
      why: '문서 조각과 질문을 같은 임베딩 모델로 벡터로 바꾸고, 코사인 유사도가 높은(가까운) 조각 top-k개를 가져옵니다. 낱말이 달라도 뜻이 가까우면 찾을 수 있어요.',
      step: 3,
    },
    {
      q: '"E-401" 같은 오류 코드로 물으면 의미 검색이 엉뚱한 조각을 가져옵니다. 가장 알맞은 개선은?',
      c: ['top-k를 50으로 크게 늘려 모두 붙인다', '온도를 높여 답을 다양하게 만든다', '청크를 한 문장 단위로 아주 잘게 자른다', '키워드(BM25) 검색을 함께 쓰는 하이브리드 검색과 재순위를 둔다'],
      a: 3,
      why: '의미 검색은 코드·고유명사 같은 정확한 낱말 일치에 약합니다. 키워드 검색을 합친 하이브리드 검색으로 후보를 넓히고 재순위로 상위만 남기는 게 정석이에요. k만 키우면 비용과 잡음이 늘어납니다.',
      step: 6,
    },
  ],
};

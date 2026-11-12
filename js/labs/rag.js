// RAG 실험실: 사내 규정 조각이 든 벡터 DB에서 top-k를 찾아 LLM에 붙여 답하게 한다.
// RAG 끄기·top-k·청크 크기·오래된 문서·최신본 필터를 바꿔 답이 어떻게 달라지는지 본다.
// 좌표·유사도·토큰 수는 설명용 고정 모형이다(무작위 없음).

const WIN = 2000; // 실험용 작은 컨텍스트 창(토큰)
const BASE = 100; // 지시문 80 + 질문 20
const TOK = { s: 60, m: 150, l: 600 }; // 조각 하나의 토큰
const MAPX = 16, MAPY = 34, MAPW = 376, MAPH = 392;
const COL = { 휴가: 'blue', 복지: 'green', 출장: 'amber', 근무: 'teal', IT: 'violet' };
const FACT = { vac_days: '휴가 일수', vac_when: '사용 기간', meal: '식비 한도', wfh_n: '주 몇 회', wfh_time: '신청 마감', wfh_sys: '신청 창구', it_help: '연락처' };

// 조각: [id, 지도 이름, 분류, x, y, 담긴 사실, 출처, 이름 위치(b 아래·a 위·r 오른쪽·l 왼쪽)]
const C = (id, t, cat, x, y, f, src, at = 'b', stale = false) => ({ id, t, cat, x, y, f, src, at, stale });
const COMMON = [
  C('m2', '연차 15일', '휴가', 165, 165, ['annual'], '휴가 규정 §1'),
  C('m3', '병가 10일', '휴가', 62, 200, ['sick'], '휴가 규정 §2'),
  C('m4', '경조 휴가', '휴가', 112, 252, ['condol'], '휴가 규정 §4'),
  C('m12', '여름 휴양소', '복지', 236, 72, ['resort'], '복지 안내 §2'),
  C('m8', '출장 식비', '출장', 322, 128, ['meal'], '출장 규정 §2'),
  C('m9', '숙박비', '출장', 345, 200, ['hotel'], '출장 규정 §3'),
  C('m7', '출근 시간', '근무', 62, 304, ['commute'], '근무 규정 §1'),
  C('m5', '재택 주 2회', '근무', 102, 358, ['wfh_n'], '근무 규정 §2'),
  C('m11', '비밀번호', 'IT', 330, 380, ['pw'], 'IT 안내 §2'),
];
const CHUNKS = {
  m: [
    C('m1', '여름휴가 5일', '휴가', 92, 112, ['vac_days', 'vac_when'], '휴가 규정 §3'),
    ...COMMON,
    C('m6', '재택 신청 방법', '근무', 190, 386, ['wfh_time', 'wfh_sys'], '근무 규정 §3'),
    C('m10', '노트북 고장', 'IT', 300, 300, ['it_help'], 'IT 안내 §1'),
    C('o1', '여름휴가 4일(옛)', '휴가', 140, 102, ['vac_days_old', 'vac_when'], '휴가 규정 2023년판', 'r', true),
    C('o2', '식비 2만(옛)', '출장', 296, 104, ['meal_old'], '출장 규정 2024년판', 'r', true),
  ],
  s: [
    C('a1', '여름휴가 5일', '휴가', 92, 112, ['vac_days'], '휴가 규정 §3'),
    C('a2', '7~8월 중 사용', '휴가', 262, 158, ['vac_when'], '휴가 규정 §3'),
    ...COMMON,
    C('b2', '전날 18시 신청', '근무', 190, 386, ['wfh_time'], '근무 규정 §3'),
    C('b3', '근태 시스템', '근무', 248, 330, ['wfh_sys'], '근무 규정 §3'),
    C('c1', '노트북 고장 시', 'IT', 300, 300, [], 'IT 안내 §1'),
    C('c2', '헬프데스크 1234', 'IT', 325, 240, ['it_help'], 'IT 안내 §1'),
    C('o1', '여름휴가 4일(옛)', '휴가', 140, 102, ['vac_days_old'], '휴가 규정 2023년판', 'r', true),
    C('o2', '식비 2만(옛)', '출장', 296, 104, ['meal_old'], '출장 규정 2024년판', 'r', true),
  ],
  l: [
    C('L1', '휴가 규정 전체', '휴가', 108, 180, ['annual', 'sick', 'vac_days', 'vac_when', 'condol'], '휴가 규정'),
    C('L5', '복지 안내 전체', '복지', 196, 100, ['resort'], '복지 안내'),
    C('L3', '출장 규정 전체', '출장', 330, 168, ['meal', 'hotel'], '출장 규정'),
    C('L2', '근무 규정 전체', '근무', 120, 340, ['commute', 'wfh_n', 'wfh_time', 'wfh_sys'], '근무 규정'),
    C('L4', 'IT 안내 전체', 'IT', 312, 336, ['it_help', 'pw'], 'IT 안내'),
    C('O1', '휴가 규정(옛)', '휴가', 76, 140, ['annual', 'sick', 'vac_days_old', 'vac_when', 'condol'], '휴가 규정 2023년판', 'b', true),
    C('O3', '출장 규정(옛)', '출장', 300, 140, ['meal_old', 'hotel'], '출장 규정 2024년판', 'a', true),
  ],
};
// 질문: 지도 위 좌표, 필요한 사실, 답들
const QS = {
  q1: { q: '여름휴가는 며칠, 언제 써요?', x: 118, y: 76, internal: true, need: ['vac_days', 'vac_when'], old: 'vac_days_old', fresh: 'vac_days',
    ok: ['여름휴가는 연 5일이고,', '7~8월 중에 쓰면 돼요.'], hallu: ['여름휴가는 3일이고,', '아무 때나 쓸 수 있어요.'], staleAns: ['여름휴가는 연 4일이고,', '7~8월 중에 쓰면 돼요.'] },
  q2: { q: '출장 식비 하루 한도는?', x: 300, y: 84, internal: true, need: ['meal'], old: 'meal_old', fresh: 'meal',
    ok: ['출장 식비는 하루', '3만 원까지예요.'], hallu: ['출장 식비는 보통', '하루 5만 원까지예요.'], staleAns: ['출장 식비는 하루', '2만 원까지예요.'] },
  q3: { q: '재택근무 몇 번, 어떻게 신청?', x: 138, y: 352, internal: true, need: ['wfh_n', 'wfh_time', 'wfh_sys'],
    ok: ['재택은 주 2회까지예요.', '전날 18시까지 근태 시스템에 신청.'], hallu: ['재택은 주 3회까지고,', '팀장에게 메일로 신청해요.'] },
  q4: { q: '노트북 고장 나면 어디에?', x: 282, y: 278, la: 'l', internal: true, need: ['it_help'],
    ok: ['IT 헬프데스크', '(내선 1234)로 연락하세요.'], hallu: ['제조사 서비스센터에', '직접 맡기면 돼요.'] },
  q5: { q: 'HTTP 404는 무슨 뜻?', x: 214, y: 236, internal: false, need: [],
    ok: ['요청한 페이지(자원)를', '서버가 찾지 못했다는 뜻이에요.'] },
};
const dist = (c, q) => Math.hypot(c.x - q.x, c.y - q.y);

/** 지금 설정으로 묻는다면 무엇을 찾고 어떻게 답하는지(순수 계산) */
export function solve(s) {
  const Q = QS[s.q];
  if (!s.rag) {
    return { rag: false, top: [], tokens: BASE, over: 0, hit: null,
      kind: Q.internal ? 'halluc' : 'ok', lines: Q.internal ? Q.hallu : Q.ok,
      src: Q.internal ? '출처 없음 — 기억으로 지어냄' : '출처 없음 — 학습한 일반 지식' };
  }
  const per = TOK[s.size];
  const pool = CHUNKS[s.size].filter((c) => !c.stale || s.stale);
  const cand = pool.filter((c) => !(c.stale && s.filter))
    .map((c) => ({ c, d: dist(c, Q) })).sort((x, y) => x.d - y.d);
  const top = cand.slice(0, s.k).map((r) => ({ ...r, sim: Math.max(0, 1 - r.d / 240) }));
  let tokens = BASE, over = 0;
  for (const r of top) { if (tokens + per > WIN) { r.cut = true; over++; } else tokens += per; }
  const used = top.filter((r) => !r.cut);
  const facts = new Set(used.flatMap((r) => r.c.f));
  const missing = Q.need.filter((f) => !facts.has(f));
  const res = { rag: true, top, tokens, over, R: top.length ? top[top.length - 1].d : 0, hit: Q.internal ? !missing.length : null };
  if (!Q.internal) return { ...res, kind: 'ok', lines: Q.ok, src: '찾은 조각엔 답이 없음 — 학습한 일반 지식' };
  if (Q.old && facts.has(Q.old)) {
    const iOld = used.findIndex((r) => r.c.f.includes(Q.old)), iNew = used.findIndex((r) => r.c.f.includes(Q.fresh));
    if (iNew < 0 || iOld < iNew) return { ...res, kind: 'stale', lines: Q.staleAns, src: '출처: ' + used[iOld].c.src };
  }
  if (!missing.length) {
    const srcs = [...new Set(used.filter((r) => r.c.f.some((f) => Q.need.includes(f))).map((r) => r.c.src))];
    return { ...res, kind: 'ok', lines: Q.ok, src: '출처: ' + srcs.join(' · ') };
  }
  const got = Q.need.length - missing.length;
  return { ...res, kind: 'partial', lines: [got ? '찾은 자료에 답이 일부만 있어요.' : '찾은 자료에 답이 없어요.', '빠진 내용: ' + missing.map((f) => FACT[f]).join(', ')],
    src: '찾은 조각: ' + ([...new Set(used.map((r) => r.c.src))].slice(0, 2).join(' · ') || '없음') };
}

const KIND = {
  ok: ['✓ 근거 있는 정답', 'green'], halluc: ['✗ 환각 — 그럴듯한 오답', 'red'],
  stale: ['✗ 옛 규정으로 답함', 'red'], partial: ['△ 근거 부족', 'amber'],
};
const RX = 404, RW = 300; // 오른쪽 칸
const rowY = (i) => 112 + i * 21;
const BAR_Y = 266, LLM_Y = 304, CARD_Y = 328;

export default {
  id: 'rag',
  title: 'RAG 실험실',
  intro: '사내 규정을 자른 조각들이 의미 지도(벡터 DB)에 들어 있어요. 질문을 고르면 질문도 좌표로 바꿔 가까운 조각 k개를 찾고, 그 조각을 붙여 LLM에 물어요(몇 초마다 다시 물어요). RAG를 끄거나 top-k·청크 크기를 바꾸고, 오래된 문서를 섞어 답이 어떻게 달라지는지 보세요. 좌표·유사도·토큰 수는 설명용 모형이고, 컨텍스트 창은 실험용으로 2,000토큰으로 작게 잡았어요.',
  controls: [
    { type: 'radio', key: 'q', label: '질문', options: [['q1', '여름휴가'], ['q2', '출장 식비'], ['q3', '재택근무'], ['q4', '노트북 고장'], ['q5', 'HTTP 404(일반)']] },
    { type: 'toggle', key: 'rag', label: 'RAG 켜기' },
    { type: 'range', key: 'k', label: 'top-k', min: 1, max: 6, step: 1, unit: '개' },
    { type: 'radio', key: 'size', label: '청크 크기', options: [['s', '작게'], ['m', '알맞게'], ['l', '크게']] },
    { type: 'toggle', key: 'stale', label: '오래된 문서 섞기' },
    { type: 'toggle', key: 'filter', label: '최신본만 검색(메타데이터 필터)' },
    { type: 'button', label: '지금 질문하기', run: (s) => s.askNow?.() },
  ],
  init: () => ({ q: 'q1', rag: true, k: 3, size: 'm', stale: false, filter: false,
    live: 0, busy: false, nextAt: 0, asked: 0, hall: 0, hist: [], okQs: [],
    k1Fail: false, kFixed: false, staleSeen: false, fixSince: 0, last: null }),
  onChange(key, s) {
    s.fixSince = 0;
    s.askNow?.();
  },
  solve,
  setup(a, s) {
    /* ---------- 고정 무대 ---------- */
    a.zone('map', MAPX, MAPY, MAPW, MAPH, { label: '벡터 DB · 의미 지도 (2D로 단순화)', color: 'gray' });
    const clip = a.raw('clipPath', { id: 'rag-clip' }, 'zone');
    a.raw('rect', { x: MAPX + 1, y: MAPY + 1, width: MAPW - 2, height: MAPH - 2, rx: 13 }, clip);
    const gRing = a.raw('g', { 'clip-path': 'url(#rag-clip)' }, 'edge');
    const gMap = a.raw('g', {}, 'node');
    const gMark = a.raw('g', {}, 'node');
    a.text(MAPX + MAPW - 12, MAPY + 14, '', { id: 'mapinfo', size: 11, anchor: 'end', cls: 'muted', layer: 'edge' });

    a.node('qb', RX + RW / 2, 54, { label: '', color: 'pink', w: RW, h: 38, size: 13.5 });
    a.text(RX + 2, 88, '', { id: 'lhd', size: 12, weight: 800, anchor: 'start', layer: 'edge' });
    a.text(RX + RW, 88, '유사도 · 토큰', { size: 11, weight: 700, anchor: 'end', cls: 'muted', layer: 'edge' });
    const gList = a.raw('g', {}, 'node');
    a.text(RX + 2, BAR_Y - 16, `컨텍스트 창 ${WIN.toLocaleString()}토큰`, { size: 11.5, weight: 700, anchor: 'start', layer: 'edge' });
    a.text(RX + RW, BAR_Y - 16, '', { id: 'tok', size: 11.5, weight: 800, anchor: 'end', mono: true, layer: 'edge' });
    a.raw('rect', { x: RX, y: BAR_Y - 7, width: RW, height: 14, rx: 4, style: 'fill: var(--panel2); stroke: var(--line2)' }, 'edge');
    const gBar = a.raw('g', {}, 'node');
    a.node('llm', RX + RW / 2, LLM_Y, { label: 'LLM', sub: '', color: 'violet', w: 196, h: 34, size: 13 });
    const gCard = a.raw('g', {}, 'node');

    const ns = (tag, attrs, par) => a.raw(tag, attrs, par);
    const txt = (par, x, y, str, o = {}) => a.text(x, y, str, { size: o.size || 12, weight: o.weight, anchor: o.anchor || 'start', color: o.color, cls: o.cls, mono: o.mono, par });

    /* ---------- 지도 ---------- */
    s.paintMap = () => {
      gMap.replaceChildren();
      const list = CHUNKS[s.size].filter((c) => !c.stale || s.stale);
      for (const c of list) {
        const col = COL[c.cat];
        const g = ns('g', {}, gMap);
        ns('circle', { cx: c.x, cy: c.y, r: 5, style: `fill: var(--${col})` }, g);
        if (c.stale) ns('circle', { cx: c.x, cy: c.y, r: 9, style: 'fill: none; stroke: var(--amber); stroke-width: 1.5; stroke-dasharray: 3 3' }, g);
        const [lx, ly, an] = c.at === 'a' ? [c.x, c.y - 14, 'middle'] : c.at === 'r' ? [c.x + 13, c.y, 'start'] : c.at === 'l' ? [c.x - 13, c.y, 'end'] : [c.x, c.y + 14, 'middle'];
        txt(g, lx, ly, c.t, { size: 10.5, weight: 700, anchor: an, color: c.stale ? 'amber' : undefined });
        if (c.stale && s.filter) { g.style.opacity = 0.3; txt(g, c.x, c.y, '✕', { size: 13, weight: 800, anchor: 'middle', color: 'red' }); }
      }
      gMap.style.opacity = s.rag ? 1 : 0.35;
      a.setText('mapinfo', `조각 ${list.length}개 · ≈${TOK[s.size]}토큰씩`);
    };

    const clearAsk = () => {
      a.clear('pkt');
      gRing.replaceChildren(); gMark.replaceChildren(); gList.replaceChildren(); gBar.replaceChildren(); gCard.replaceChildren();
      a.setText('tok', '');
      a.setText('lhd', '');
    };
    const drawCard = (r) => {
      const [title, col] = KIND[r.kind];
      const t2 = r.kind === 'ok' && !QS[s.q].internal ? (r.rag ? '✓ 자료와 무관 → 일반 지식으로 답' : '✓ 일반 지식으로 정답') : title;
      ns('rect', { x: RX, y: CARD_Y, width: RW, height: 96, rx: 10, style: `fill: color-mix(in srgb, var(--${col}) 13%, var(--panel)); stroke: var(--${col}); stroke-width: 1.5` }, gCard);
      txt(gCard, RX + 12, CARD_Y + 17, t2, { size: 13, weight: 800, color: col });
      txt(gCard, RX + 12, CARD_Y + 40, r.lines[0], { size: 12.5, weight: 700 });
      txt(gCard, RX + 12, CARD_Y + 60, r.lines[1], { size: 12.5, weight: 700 });
      txt(gCard, RX + 12, CARD_Y + 81, r.src, { size: 11, cls: 'muted' });
    };
    const record = (r) => {
      const Q = QS[s.q];
      s.asked++;
      s.last = r;
      if (r.kind === 'halluc') s.hall++;
      s.hist.push({ ok: r.kind === 'ok', tok: r.tokens, hit: r.hit });
      if (s.hist.length > 10) s.hist.shift();
      if (r.kind === 'ok') { if (s.rag && Q.internal && !s.okQs.includes(s.q)) s.okQs.push(s.q); } else s.okQs = [];
      if (s.q === 'q3' && s.rag && s.k === 1 && r.kind === 'partial') s.k1Fail = true;
      if (s.q === 'q3' && s.rag && s.k >= 2 && r.kind === 'ok' && s.k1Fail) s.kFixed = true;
      if (r.kind === 'stale') s.staleSeen = true;
      if (s.stale && s.filter && Q.old && r.kind === 'ok') s.fixSince++;
    };

    /* ---------- 한 번 묻기 ---------- */
    const ask = async (id) => {
      const alive = () => s.live === id;
      const Q = QS[s.q];
      const r = solve(s);
      clearAsk();
      a.setNode('qb', { label: 'Q. ' + Q.q });
      a.setNode('llm', { sub: '' });
      if (!r.rag) {
        a.setText('lhd', 'RAG 꺼짐 — 검색 없이 기억으로 답해요');
        const sg = ns('rect', { x: RX, y: BAR_Y - 7, width: 0, height: 14, rx: 4, style: 'fill: var(--gray)' }, gBar);
        a.setText('tok', `${r.tokens} / ${WIN}`);
        const p = a.packet('', { at: [RX + RW / 2, 74], color: 'pink', w: 16, h: 16 });
        await a.par(a.move(p, [RX + RW / 2, LLM_Y - 19], 800), a.tween(500, (k) => sg.setAttribute('width', (r.tokens / WIN) * RW * k)));
        if (!alive()) return;
        a.remove(p);
      } else {
        a.setText('lhd', `찾은 조각 · top-k ${s.k}`);
        // 질문 → 지도 좌표
        const p = a.packet('', { at: [RX - 2, 54], color: 'pink', w: 16, h: 16 });
        await a.move(p, [Q.x, Q.y], 650);
        if (!alive()) return;
        a.remove(p);
        const ring = ns('circle', { cx: Q.x, cy: Q.y, r: 0, style: 'fill: color-mix(in srgb, var(--pink) 8%, transparent); stroke: var(--pink); stroke-width: 1.5; stroke-dasharray: 6 5' }, gRing);
        ns('circle', { cx: Q.x, cy: Q.y, r: 6.5, style: 'fill: var(--pink); stroke: var(--bg); stroke-width: 2' }, gMark);
        if (Q.la === 'l') txt(gMark, Q.x - 12, Q.y, '질문', { size: 11, weight: 800, anchor: 'end', color: 'pink' });
        else txt(gMark, Q.x, Q.y - 15, '질문', { size: 11, weight: 800, anchor: 'middle', color: 'pink' });
        const R = r.R + 9;
        let found = 0;
        const flights = [];
        await a.tween(700, (k) => {
          ring.setAttribute('r', R * k);
          while (found < r.top.length && r.top[found].d <= R * k) {
            const it = r.top[found], i = found++;
            ns('circle', { cx: it.c.x, cy: it.c.y, r: 10, style: `fill: none; stroke: var(--${it.cut ? 'red' : 'pink'}); stroke-width: 2.5` }, gMark);
            flights.push(i);
          }
        });
        if (!alive()) return;
        // 찾은 조각을 목록으로
        let used = BASE;
        a.setText('tok', `${used} / ${WIN}`);
        const base = ns('rect', { x: RX, y: BAR_Y - 7, width: (BASE / WIN) * RW, height: 14, rx: 4, style: 'fill: var(--gray)' }, gBar);
        base.style.opacity = 0.9;
        for (let i = 0; i < r.top.length; i++) {
          const it = r.top[i], y = rowY(i);
          const dot = a.packet('', { at: [it.c.x, it.c.y], color: it.c.stale ? 'amber' : 'pink', w: 12, h: 12 });
          await a.move(dot, [RX - 4, y], 280);
          if (!alive()) return;
          a.remove(dot);
          const col = it.cut ? 'red' : it.c.stale ? 'amber' : undefined;
          txt(gList, RX + 4, y, '①②③④⑤⑥'[i], { size: 12.5, weight: 800, color: it.cut ? 'red' : 'pink' });
          const lab = txt(gList, RX + 24, y, it.c.t, { size: 12, weight: 700, color: col });
          if (it.cut) lab.style.textDecoration = 'line-through';
          txt(gList, RX + 236, y, it.sim.toFixed(2), { size: 11.5, mono: true, weight: 700, anchor: 'end', color: col });
          txt(gList, RX + RW, y, it.cut ? '잘림' : String(TOK[s.size]), { size: 11, mono: !it.cut, weight: 700, anchor: 'end', color: it.cut ? 'red' : undefined, cls: it.cut ? '' : 'muted' });
          if (!it.cut) {
            const x0 = RX + (used / WIN) * RW;
            const w = (TOK[s.size] / WIN) * RW;
            const sg = ns('rect', { x: x0 + 1, y: BAR_Y - 6, width: 0, height: 12, rx: 3, style: `fill: var(--${it.c.stale ? 'amber' : 'blue'})` }, gBar);
            used += TOK[s.size];
            a.setText('tok', `${used} / ${WIN}`);
            await a.tween(160, (k) => sg.setAttribute('width', Math.max(0, (w - 2) * k)));
          } else {
            a.setText('tok', `${used} / ${WIN} · ${r.over}개 넘침`);
            await a.wait(120);
          }
          if (!alive()) return;
        }
        if (r.over) ns('rect', { x: RX + RW - 3, y: BAR_Y - 10, width: 4, height: 20, rx: 2, style: 'fill: var(--red)' }, gBar);
        // 프롬프트를 LLM으로
        const pp = a.packet('', { at: [RX + RW / 2, BAR_Y + 9], color: 'violet', w: 14, h: 14 });
        await a.move(pp, [RX + RW / 2, LLM_Y - 19], 260);
        if (!alive()) return;
        a.remove(pp);
      }
      a.setNode('llm', { sub: '' });
      await a.flash('llm');
      if (!alive()) return;
      drawCard(r);
      record(r);
    };

    s.askNow = () => {
      s.live++;
      s.busy = false;
      s.nextAt = a.now() + 150;
      s.paintMap();
    };
    s.paintMap();
    a.every(100, () => {
      if (s.busy || a.now() < s.nextAt) return;
      const id = ++s.live;
      s.busy = true;
      a.spawn(async () => {
        try { await ask(id); } finally {
          if (s.live === id) { s.busy = false; s.nextAt = a.now() + 1800; }
        }
      });
    });
  },
  stats: (s) => {
    const n = s.hist.length;
    const ok = s.hist.filter((h) => h.ok).length;
    const tok = n ? Math.round(s.hist.reduce((x, h) => x + h.tok, 0) / n) : 0;
    const hs = s.hist.filter((h) => h.hit != null);
    const hit = hs.length ? hs.filter((h) => h.hit).length / hs.length : null;
    const acc = n ? ok / n : null;
    return [
      ['정답률 (최근 10)', acc == null ? '-' : Math.round(acc * 100) + '%', acc == null ? '' : acc >= 0.8 ? 'green' : acc < 0.5 ? 'red' : 'amber'],
      ['평균 사용 토큰', n ? tok.toLocaleString() : '-', tok > 1200 ? 'red' : ''],
      ['환각 답', s.hall, s.hall ? 'red' : ''],
      ['검색 적중 (최근)', hit == null ? '-' : Math.round(hit * 100) + '%', hit == null ? '' : hit >= 0.8 ? 'green' : 'amber'],
      ['물어본 횟수', s.asked, ''],
    ];
  },
  tasks: [
    { t: 'RAG를 끄고 회사 규정을 물어 보기 — 환각 답이 나오나요?', check: (s) => s.hall >= 1 },
    { t: 'RAG를 켠 채 서로 다른 회사 규정 질문 3개를 연달아 맞히기', check: (s) => s.rag && s.okQs.length >= 3 },
    { t: '재택근무 질문: top-k 1에서 근거가 빠지는 걸 보고, k를 늘려 맞히기', check: (s) => s.kFixed },
    { t: '오래된 문서를 섞어 옛 답을 본 뒤, 최신본 필터로 2번 맞히기', check: (s) => s.staleSeen && s.stale && s.filter && s.fixSince >= 2 },
  ],
};

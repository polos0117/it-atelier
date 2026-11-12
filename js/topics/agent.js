// AI 에이전트: 챗봇 vs 에이전트 → 도구 정의 → 에이전트 루프 → 실제 한 바퀴씩 → 쌓이는 컨텍스트 → 멈춤 조건 → 안전장치 → MCP·여러 에이전트
// 단계마다 무대를 새로 그린다. 일정·이름·숫자는 모두 설명용 예시(고정)다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, id: o.id, hidden: o.hidden, layer: o.layer });
}
/** 여러 줄 글 상자. lines: 문자열 또는 [문자열, {weight,color,cls,size,mono}] */
function card(a, x, y, w, h, color, lines, o = {}) {
  const g = a.raw('g', { class: `c-${color}`, transform: `translate(${x} ${y})` }, o.layer || 'node');
  const box = a.raw('rect', {
    x: -w / 2, y: -h / 2, width: w, height: h, rx: o.r ?? 10,
    style: `fill: color-mix(in srgb, var(--c) ${o.tint ?? 12}%, var(--stage)); stroke: var(--c); stroke-width: 1.5`,
  }, g);
  const lh = o.lh || 18;
  const y0 = -((lines.length - 1) * lh) / 2;
  const ts = lines.map((ln, i) => {
    const [s0, st = {}] = Array.isArray(ln) ? ln : [ln];
    // SVG는 앞 공백을 접으므로 들여쓰기는 줄바꿈 없는 공백으로
    const s = s0.replace(/^ +/, (m) => '\u00a0'.repeat(m.length));
    return a.text(o.center ? 0 : -w / 2 + 12, y0 + i * lh, s, {
      par: g, size: st.size || o.size || 12.5, anchor: o.center ? 'middle' : 'start',
      weight: st.weight, color: st.color, cls: st.cls, mono: st.mono ?? o.mono,
    });
  });
  const c = { g, box, x, y, w, h, ts, color };
  c.recolor = (to) => { g.classList.replace('c-' + c.color, 'c-' + to); c.color = to; };
  if (o.hidden) g.style.opacity = 0;
  return c;
}
function dot(a, x, y, color = 'gray') { return chip(a, '', x, y, color, { w: 14, h: 14 }); }
async function pulse(a, from, to, color, dur = 500) {
  const d = dot(a, from[0], from[1], color);
  await a.move(d, to, dur);
  a.remove(d);
}
function setPos(p, x, y) { p.x = x; p.y = y; p.g.setAttribute('transform', `translate(${x} ${y})`); }
const REQ = '다음 주 화요일 오후에 회의실 잡고 참석자에게 알려 줘';

export default {
  id: 'agent',
  level: 3,
  cat: 'AI',
  title: 'AI 에이전트 — 스스로 계획하고 도구를 쓰는 AI',
  sub: '목표를 받은 언어 모델이 도구를 부르고, 결과를 보고, 다음 행동을 정하기를 반복하는 구조',
  analogy: '유능한 비서에게 "다음 주 회의 잡아 줘"라고 맡기는 것과 비슷해요. 비서는 일정표를 확인하고, 빈 회의실을 예약하고, 참석자에게 알린 뒤 "다 됐어요"라고 보고합니다. 헷갈리면 되묻고, 법인카드 결제처럼 중요한 일은 먼저 허락을 받지요. 에이전트도 이렇게 움직이도록 만든 프로그램입니다.',
  keys: [
    '에이전트는 언어 모델이 목표를 받아 도구를 호출하고, 결과를 보고, 다음 행동을 정하는 일을 반복하는 시스템이다. 모델은 그대로이고 "도구 + 반복"이 더해진 것이다.',
    '앱은 도구마다 이름·설명·입력 형식(JSON 스키마)을 모델에게 알려 준다. 모델은 어떤 도구를 어떤 값으로 부를지 요청만 하고, 실제 실행은 앱이 한 뒤 결과를 대화에 다시 넣는다.',
    '반복할수록 도구 결과가 컨텍스트에 쌓여 비용·시간이 늘고 창 한계에 다가간다. 요약·정리·메모 같은 관리가 필요하다.',
    '목표 달성 확인, 최대 반복 수, 막히면 사람에게 묻기 같은 멈춤 조건이 있어야 한다. 단계가 많을수록 작은 실수가 쌓이기 쉽다.',
    '돈·삭제·외부 전송처럼 되돌리기 어려운 동작은 사람 승인을 받고, 권한은 최소로, 실행은 샌드박스에서 한다. 도구는 MCP 같은 표준으로 연결할 수 있다.',
  ],
  terms: [
    ['에이전트', '언어 모델이 도구를 쓰며 목표를 이룰 때까지 스스로 다음 단계를 정하는 시스템'],
    ['도구 호출(함수 호출)', '모델이 "이 도구를 이 값으로 실행해 달라"는 요청을 내고, 앱이 실행해 결과를 돌려주는 방식'],
    ['JSON 스키마', '도구 입력의 모양(필드 이름, 자료형, 필수 여부)을 적는 표준 형식'],
    ['에이전트 루프', '생각 → 도구 호출 → 결과 관찰 → 다시 생각을 목표 달성까지 되풀이하는 흐름'],
    ['ReAct', '추론(Reasoning)과 행동(Acting)을 번갈아 하게 하는 에이전트 설계 패턴'],
    ['컨텍스트 압축', '쌓인 대화·도구 결과를 요약하거나 지워서 컨텍스트 창 안에 맞추는 일'],
    ['사람 승인(human-in-the-loop)', '중요한 동작 직전에 사람이 확인하고 허락하는 단계'],
    ['MCP', 'AI 앱이 외부 도구·데이터에 같은 방식으로 연결하게 해 주는 공개 표준(Model Context Protocol)'],
  ],
  setup(a) {
    a.node('req', 360, 62, { label: REQ, color: 'gray', w: 470, h: 44, size: 13.5 });
  },
  steps: [
    {
      t: '말하는 챗봇, 움직이는 에이전트',
      easy: '챗봇에게 "회의실 잡아 줘"라고 하면 방법을 말로 알려 줄 뿐, 실제 예약은 내가 해야 해요. 에이전트는 같은 부탁을 "목표"로 받아 캘린더를 확인하고, 회의실을 예약하고, 메일까지 보냅니다. 같은 언어 모델에 "도구"와 "반복"을 붙인 것이에요.',
      deep: '에이전트라는 말은 넓게 쓰이지만, 보통 LLM이 도구를 쓰며 스스로 다음 단계를 정하는 루프를 가리킵니다. 순서가 정해진 일은 코드로 단계를 고정한 워크플로(예: 요약 → 번역 → 저장)가 더 싸고 예측 가능하므로, 경로를 미리 정하기 어려운 열린 작업에 에이전트를 씁니다. 에이전트도 같은 언어 모델이라 틀릴 수 있고, 그 실수가 말이 아니라 실제 행동으로 남는다는 점이 다릅니다.',
      async run(a) {
        wipe(a);
        a.node('req', 360, 62, { label: REQ, color: 'gray', w: 470, h: 44, size: 13.5 });
        a.zone('zl', 16, 104, 336, 320, { label: '챗봇 — 방법을 말로 안내', color: 'gray' });
        a.zone('zr', 368, 104, 336, 320, { label: '에이전트 — 직접 처리', color: 'violet' });
        a.node('bot', 184, 170, { label: '챗봇', color: 'blue', w: 120, h: 44 });
        a.node('ag', 536, 170, { label: '에이전트', color: 'violet', w: 130, h: 44 });
        a.edge([226, 86], 'bot');
        a.edge([500, 86], 'ag');
        const T = [['cal', 446, '캘린더', 'amber'], ['room', 536, '회의실', 'teal'], ['mail', 626, '메일', 'blue']];
        for (const [id, x, l, c] of T) { a.node(id, x, 270, { label: l, color: c, w: 80, h: 40, size: 13 }); a.edge('ag', id); }
        await a.par(pulse(a, [226, 88], [196, 146], 'gray', 500), pulse(a, [500, 88], [526, 146], 'gray', 500));
        a.hl('bot', true);
        a.hl('ag', true);
        const ans = card(a, 184, 314, 300, 136, 'blue', [
          ['답변 (말로 안내)', { weight: 800 }],
          '1. 캘린더에서 빈 시간 확인하기',
          '2. 예약 시스템에서 회의실 잡기',
          '3. 참석자에게 메일 보내기',
          ['→ 실제 일은 내가 해야 해요', { color: 'red', weight: 700 }],
        ], { hidden: true });
        await a.show(ans, 400);
        a.hl('bot', false);
        for (const [id, x, , c] of T) {
          await pulse(a, [536 + (x - 536) * 0.22, 194], [x, 248], c, 320);
          await a.flash(id);
          a.badge(id, '✓', 'green');
        }
        a.hl('ag', false);
        const r = chip(a, '✓ 화 14시 B실 예약·메일 발송', 536, 330, 'green', { hidden: true, h: 30 });
        await a.show(r, 300);
        a.text(536, 390, '언어 모델 + 도구 + 반복', { size: 13, weight: 800, color: 'violet' });
        a.caption('에이전트는 같은 모델에 "도구"와 "반복"을 붙인 것이에요');
        await a.wait(900);
      },
    },
    {
      t: '도구 설명서 — 이름·설명·입력 형식',
      easy: '에이전트를 만드는 앱은 쓸 수 있는 도구 목록을 모델에게 먼저 알려 줘요. 도구마다 이름, 무엇을 하는지(설명), 어떤 값을 넣어야 하는지(입력 형식)가 적혀 있습니다. 모델은 이 설명서만 보고 언제 어떤 도구를 쓸지 고릅니다.',
      deep: 'API에서는 도구마다 name, description, input_schema(JSON 스키마)를 요청에 함께 보냅니다. 도구 정의도 토큰으로 컨텍스트를 차지하고, 모델은 설명문을 보고 도구를 고르므로 "언제 쓰는지·무엇을 돌려주는지·제약"을 분명히 적는 것이 성능에 직접 영향을 줍니다. 모델이 스키마와 다른 값을 낼 수도 있으니 앱은 실행 전에 입력을 검증하고, 비슷한 도구가 너무 많으면 고르기가 어려워집니다.',
      async run(a) {
        wipe(a);
        a.text(130, 50, '앱이 준비한 도구 목록', { size: 12, weight: 700, cls: 'muted' });
        const TL = [['get_calendar', '참석자 일정 조회', 'amber'], ['book_room', '회의실 예약', 'teal'], ['send_email', '메일 보내기', 'blue']];
        const tc = [];
        for (let i = 0; i < TL.length; i++) {
          const [n, d, c] = TL[i];
          const k = card(a, 130, 96 + i * 66, 220, 52, c, [[n, { mono: true, weight: 800, size: 13 }], d], { hidden: true });
          tc.push(k);
          await a.show(k, 220);
        }
        await a.wait(200);
        await a.flash(tc[1]);
        const J = [
          '{',
          '  "name": "book_room",',
          '  "description": "회의실을 예약한다",',
          '  "input_schema": {',
          '    "type": "object",',
          '    "properties": {',
          '      "room":   { "type": "string" },',
          '      "start":  { "type": "string" },',
          '      "people": { "type": "integer" }',
          '    },',
          '    "required": ["room", "start"]',
          '  }',
          '}',
        ];
        const js = card(a, 462, 196, 320, 256, 'gray', J.map((s) => [s, { mono: true, size: 12 }]), { lh: 18, tint: 6, hidden: true });
        a.edge([242, 162], [300, 162], { color: 'teal' });
        await a.show(js, 450);
        const BANDS = [[1, 1, 'amber', '이름'], [2, 2, 'teal', '설명'], [3, 11, 'blue', '입력 형식']];
        for (const [l0, l1, c, lab] of BANDS) {
          const top = -((J.length - 1) * 18) / 2 + l0 * 18 - 9, h = (l1 - l0 + 1) * 18;
          const band = a.raw('rect', { x: -152, y: top, width: 304, height: h, rx: 4, style: `fill: var(--${c}); opacity: 0` }, js.g);
          js.g.insertBefore(band, js.ts[0]);
          const t = a.text(632, 196 + top + h / 2, lab, { size: 11, weight: 800, color: c, anchor: 'start' });
          t.style.opacity = 0;
          await a.tween(300, (k) => { band.style.opacity = 0.2 * k; t.style.opacity = k; });
          await a.wait(150);
        }
        a.node('llm', 130, 352, { label: '언어 모델', sub: '설명서를 읽고 도구 고르기', color: 'violet', w: 220, h: 54 });
        await a.par(...tc.map((k, i) => a.wait(i * 120).then(() => pulse(a, [130, 120 + i * 66], [130, 322], k.color, 450))));
        await a.flash('llm');
        a.note('n1', 462, 372, '모델은 설명만 읽어요 — 실행은 앱이 합니다', { color: 'violet' });
        await a.wait(900);
      },
    },
    {
      t: '에이전트 루프 — 생각·행동·관찰',
      easy: '에이전트는 한 번에 끝내지 않고 고리를 돕니다. 지금 상황을 보고 할 일을 정하고(생각), 도구를 부르고(행동), 결과를 확인한(관찰) 뒤 다시 생각해요. 더 할 일이 없으면 고리를 빠져나와 최종 답을 냅니다.',
      deep: '모델 응답이 글 대신 tool_use 블록(호출 id, 도구 이름, 인자 JSON)으로 끝나면, 앱이 그 도구를 실행하고 결과를 같은 id의 tool_result로 대화에 붙여 모델을 다시 호출합니다. 모델이 도구 호출 없이 답하면 루프가 끝납니다. 추론과 행동을 번갈아 하는 이 패턴을 ReAct(2022년 논문)라 부르며, 서로 무관한 도구는 한 번에 여러 개를 병렬로 요청할 수도 있습니다.',
      async run(a) {
        wipe(a);
        const CX = 290, CY = 236, R = 128, D = 36;
        const P = (deg) => [CX + R * Math.cos((deg * Math.PI) / 180), CY + R * Math.sin((deg * Math.PI) / 180)];
        a.raw('circle', { cx: CX, cy: CY, r: R, style: 'fill: none; stroke: var(--line); stroke-width: 10; opacity: .5' }, 'zone');
        const arc = (d1, d2, c) => {
          const [x1, y1] = P(d1), [x2, y2] = P(d2);
          a.raw('path', { d: `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`, class: 'edge ec-' + c, 'marker-end': 'url(#ah)' }, 'edge');
        };
        arc(-90 + D, 30 - D, 'violet');
        arc(30 + D, 150 - D, 'amber');
        arc(150 + D, 270 - D, 'teal');
        const N = [['th', -90, '생각', '다음에 할 일 정하기', 'violet'], ['act', 30, '행동', '도구 호출 요청', 'amber'], ['obs', 150, '관찰', '결과를 기록에 추가', 'teal']];
        for (const [id, deg, l, s, c] of N) { const [x, y] = P(deg); a.node(id, x, y, { label: l, sub: s, color: c, w: 132, h: 52 }); }
        a.text(CX, 220, '반복', { size: 12, weight: 700, cls: 'muted' });
        a.text(CX, 248, '0회차', { id: 'cnt', size: 20, weight: 800 });
        a.node('done', 590, 108, { label: '최종 답', sub: '더 할 일이 없을 때', color: 'green', w: 160, h: 52 });
        a.edge('th', 'done', { dashed: true, color: 'green', label: '목표 달성' });
        const api = card(a, 590, 300, 210, 140, 'gray', [
          ['모델 → 앱', { weight: 800, color: 'amber' }],
          ['tool_use: get_calendar', { mono: true, size: 11.5 }],
          ['  input: {"day": "화"}', { mono: true, size: 11.5 }],
          ['앱 → 모델', { weight: 800, color: 'teal' }],
          ['tool_result:', { mono: true, size: 11.5 }],
          ['  "14–15시 비어 있음"', { mono: true, size: 11.5 }],
        ], { lh: 19, tint: 6, hidden: true });
        const d = dot(a, ...P(-90 + D), 'violet');
        d.g.style.opacity = 0;
        const travel = async (d1, d2, dur) => {
          d.g.style.opacity = 1;
          await a.tween(dur, (k) => setPos(d, ...P(d1 + (d2 - d1) * k)), { linear: true });
          d.g.style.opacity = 0;
        };
        for (let it = 1; it <= 3; it++) {
          const f = it === 1 ? 1 : 0.6;
          a.setText('cnt', `${it}회차`);
          a.hl('th', true);
          await a.wait(250 * f);
          a.hl('th', false);
          if (it === 3) break;
          d.set(null, 'violet');
          await travel(-90 + D, 30 - D, 550 * f);
          a.hl('act', true);
          if (it === 1) await a.show(api, 300);
          await a.wait(200 * f);
          a.hl('act', false);
          d.set(null, 'amber');
          await travel(30 + D, 150 - D, 550 * f);
          a.hl('obs', true);
          await a.wait(200 * f);
          a.hl('obs', false);
          d.set(null, 'teal');
          await travel(150 + D, 270 - D, 550 * f);
        }
        a.remove(d);
        await pulse(a, [358, 108], [508, 108], 'green', 450);
        a.hl('done', true);
        a.caption('도구를 더 부르지 않고 답하면 고리를 빠져나옵니다');
        await a.wait(900);
      },
    },
    {
      t: '한 바퀴씩 — 실제로 회의 잡기',
      easy: '실제로는 이렇게 돌아요. ① 캘린더를 조회하고 ② 결과를 보고 모두 비는 14시를 찾아 회의실을 예약하고 ③ 참석자에게 메일을 보낸 뒤 ④ 더 할 일이 없으니 "다 했어요"라고 답합니다. 호출과 결과는 하나도 빠짐없이 대화 기록에 쌓이고, 모델은 매번 이 기록 전체를 다시 읽어요.',
      deep: '왼쪽 기록이 실제로 모델에 들어가는 메시지 목록입니다(호출은 assistant 쪽 tool_use, 결과는 user 쪽 tool_result). 도구가 실패하면 예외로 루프를 끊기보다 오류 내용을 tool_result로 돌려주어(is_error) 모델이 다른 값이나 다른 도구로 다시 시도하게 하는 것이 오류 복구의 기본입니다. 단계가 많은 작업은 먼저 할 일 목록(계획)을 세우고 진행하며 갱신하게 하면 길을 잃는 일이 줄어듭니다.',
      async run(a) {
        wipe(a);
        a.zone('log', 16, 36, 352, 388, { label: '대화 기록 — 모델이 매번 다시 읽음', color: 'gray' });
        const EY = (i) => 80 + i * 38;
        const E = [
          ['사용자: 화요일 오후 회의 잡고 알려 줘', 'gray'],
          ['호출: get_calendar(화요일, 4명)', 'amber'],
          ['결과: 김 13–14시, 이 15–17시 일정 있음', 'teal'],
          ['생각: 14–15시가 모두 비어 있다', 'violet'],
          ['호출: book_room(B실, 화 14:00)', 'amber'],
          ['결과: B실 예약 완료', 'teal'],
          ['호출: send_email(참석자 3명)', 'amber'],
          ['결과: 3명에게 발송 완료', 'teal'],
          ['답: 화 14시 B실 잡고 메일 보냈어요', 'green'],
        ];
        const ent = E.map(([s, c], i) => card(a, 192, EY(i), 328, 30, c, [[s, { size: 12, weight: i === 8 ? 800 : 600 }]], { r: 8, hidden: true }));
        ent[0].g.style.opacity = 1;
        a.node('m', 540, 86, { label: '언어 모델', sub: '다음 행동 결정', color: 'violet', w: 180, h: 52 });
        a.node('app', 540, 210, { label: '앱 (실행기)', sub: '도구를 실제로 실행', color: 'gray', w: 180, h: 52 });
        a.edge('m', 'app', { label: 'tool_use', lx: 36, ly: 0 });
        const TL = [['cal', 448, '캘린더', 'amber'], ['room', 540, '회의실', 'teal'], ['mail', 632, '메일', 'blue']];
        for (const [id, x, l, c] of TL) { a.node(id, x, 324, { label: l, color: c, w: 80, h: 40, size: 13 }); a.edge('app', id); }
        a.text(540, 392, '', { id: 'cnt', size: 12.5, weight: 800, cls: 'muted' });
        const IT = [
          { tool: 'cal', x: 448, call: 1, res: 2 },
          { tool: 'room', x: 540, call: 4, res: 5, think: 3 },
          { tool: 'mail', x: 632, call: 6, res: 7 },
        ];
        for (let k = 0; k < IT.length; k++) {
          const it = IT[k];
          const f = k === 0 ? 0.85 : 0.5;
          a.setText('cnt', `반복 ${k + 1}회차`);
          await pulse(a, [370, 230], [448, 100], 'violet', 300 * f);
          a.hl('m', true);
          if (it.think) {
            await pulse(a, [450, 86], [356, EY(it.think)], 'violet', 350 * f);
            await a.show(ent[it.think], 150);
          }
          const c = chip(a, E[it.call][0].split('(')[0].replace('호출: ', ''), 540, 112, 'amber', { h: 24, size: 11.5 });
          a.hl('m', false);
          await a.par(a.move(c, [540, 180], 300 * f), a.show(ent[it.call], 300 * f));
          await a.fadeOut(c, 120);
          a.hl('app', true);
          await pulse(a, [540 + (it.x - 540) * 0.3, 236], [it.x, 302], 'amber', 280 * f);
          a.badge(it.tool, '✓', 'green');
          const r = chip(a, '결과', it.x, 302, 'teal', { h: 24, size: 11.5 });
          await a.move(r, [540, 238], 280 * f);
          a.hl('app', false);
          await a.move(r, [356, EY(it.res)], 380 * f);
          a.remove(r);
          await a.show(ent[it.res], 150);
        }
        a.setText('cnt', '반복 4회차 — 도구 호출 없이 답 → 끝');
        await pulse(a, [370, 230], [448, 100], 'violet', 300);
        await a.flash('m');
        await pulse(a, [450, 92], [356, EY(8)], 'green', 450);
        await a.show(ent[8], 250);
        await a.wait(600);
      },
    },
    {
      t: '쌓이는 기록 — 컨텍스트 관리',
      easy: '도구를 부를 때마다 호출과 결과가 기록에 더해져, 반복할수록 AI가 읽어야 할 글이 늘어납니다. 일정 목록이나 문서처럼 큰 결과가 오면 금방 컨텍스트 창이 가득 차요. 그래서 오래된 결과를 지우거나, 앞부분을 요약하거나, 중요한 사실을 메모 파일에 따로 적어 둡니다.',
      deep: '반복마다 지금까지의 전체 기록을 다시 입력으로 보내므로, 반복 n번의 누적 입력 토큰은 대략 n²에 비례해 늘어나 비용과 지연이 함께 커집니다. 프롬프트 캐싱으로 반복되는 앞부분의 재처리 비용을 줄이고, 오래된 도구 결과 지우기·요약(압축)·메모 파일 기록·하위 에이전트에게 맡기고 요약만 받기 같은 방법으로 창을 관리합니다. 도구 쪽에서도 긴 문서나 수백 행 표를 통째로 돌려주지 말고 필요한 부분만 골라 주도록 설계하는 것이 효과적입니다.',
      async run(a) {
        wipe(a);
        a.zone('win', 24, 52, 250, 372, { color: 'amber' });
        a.text(149, 34, '컨텍스트 창', { size: 12.5, weight: 800, color: 'amber' });
        const LIM = 96, BOT = 412, BX = 149, BW = 220, GAP = 4, CAP = BOT - LIM;
        a.raw('line', { x1: 32, y1: LIM, x2: 266, y2: LIM, style: 'stroke: var(--red); stroke-width: 2; stroke-dasharray: 6 4' }, 'edge');
        a.text(280, LIM, '한계', { size: 11, weight: 800, color: 'red', anchor: 'start' });
        a.text(500, 56, '반복할수록 기록이 쌓여요', { size: 13.5, weight: 800 });
        a.text(312, 118, '사용률', { size: 12, weight: 700, cls: 'muted', anchor: 'start' });
        const bar = a.bar('tok', 366, 118, 270, { color: 'amber' });
        const tv = a.text(646, 118, '0%', { size: 12.5, weight: 800, mono: true, anchor: 'start' });
        const B = [['지시·도구 설명', 44, 'violet'], ['요청', 22, 'gray'], ['호출 1', 20, 'amber'], ['결과 1: 일정 목록', 70, 'teal'],
          ['호출 2', 20, 'amber'], ['결과 2', 26, 'teal'], ['호출 3', 20, 'amber'], ['결과 3: 메일 목록', 56, 'teal']];
        let top = BOT;
        const bs = [];
        const setUse = (used, dur) => { tv.textContent = Math.round((used / CAP) * 100) + '%'; return bar.set(used / CAP, dur); };
        for (const [l, h, c] of B) {
          const y = top - h / 2;
          const b = card(a, BX, y - 14, BW, h, c, [[l, { size: 11.5, weight: 700 }]], { center: true, r: 6, hidden: true });
          bs.push(b);
          await a.par(a.show(b, 140), a.move(b, [BX, y], 200), setUse(BOT - (top - h), 200));
          top -= h + GAP;
        }
        // 넘침
        const big = card(a, BX, top - 22, BW, 44, 'red', [['결과 4: 문서 본문', { size: 11.5, weight: 700 }]], { center: true, r: 6, hidden: true });
        await a.show(big, 250);
        tv.textContent = '넘침!';
        tv.classList.add('tc-red');
        a.caption('새 결과가 창 한계를 넘었어요');
        await a.flash(big);
        // 전략
        const S = [['① 오래된 도구 결과 지우기', 'gray'], ['② 앞부분 요약(압축)', 'violet'], ['③ 메모 파일에 따로 적기', 'teal']];
        const sc = S.map(([s, c], i) => card(a, 500, 180 + i * 52, 340, 38, c, [[s, { weight: 700 }]], { hidden: true }));
        for (const c of sc) await a.show(c, 200);
        // 요약 + 메모
        await a.par(...bs.slice(1).map((b) => a.fadeOut(b, 400)));
        const sumY = BOT - 44 - GAP - 20;
        const sm = card(a, BX, sumY, BW, 40, 'violet', [['요약: 화 14시 B실, 메일 보냄', { size: 11.5, weight: 700 }]], { center: true, r: 6, hidden: true });
        await a.par(a.show(sm, 300), a.flash(sc[1]));
        await pulse(a, [262, sumY], [328, 284], 'teal', 450);
        await a.flash(sc[2]);
        big.recolor('teal');
        tv.classList.remove('tc-red');
        await a.par(a.move(big, [BX, sumY - 20 - GAP - 22], 500), setUse(44 + 40 + 44 + 2 * GAP, 500));
        a.caption('');
        a.note('n1', 500, 366, '매 반복마다 쌓인 기록 전체를 다시 읽어요\n→ 반복이 많을수록 비용·시간 증가', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '멈출 때를 아는 것',
      easy: '에이전트는 언제 멈출지도 알아야 해요. 목표를 이뤘는지 확인되면 끝내고, 같은 실패가 계속되면 정해 둔 횟수에서 멈춰 상황을 보고하며, 정보가 모자라거나 애매하면 짐작하지 말고 사람에게 물어봐야 합니다.',
      deep: '기본 종료 조건은 모델이 도구 호출 없이 최종 답을 내는 것이지만, 이것만 믿으면 무한 반복과 비용 폭주가 생길 수 있어 최대 반복 수·토큰 예산·시간 제한을 함께 둡니다. 단계마다 95% 맞더라도 10단계를 모두 맞힐 확률은 약 60%(0.95¹⁰)라서, 중간 확인과 사람에게 묻는 지점이 중요합니다. 에이전트 평가는 실제와 비슷한 과제 세트로 성공률뿐 아니라 반복 수·비용·실패 유형까지 함께 측정합니다.',
      async run(a) {
        wipe(a);
        const CX = 150, CY = 210, R = 64;
        a.raw('circle', { cx: CX, cy: CY, r: R, style: 'fill: color-mix(in srgb, var(--violet) 10%, var(--stage)); stroke: var(--violet); stroke-width: 2; stroke-dasharray: 6 5' }, 'zone');
        a.text(CX, CY - 14, '에이전트 루프', { size: 12.5, weight: 800, color: 'violet' });
        a.text(CX, CY + 12, '반복 0 / 10', { id: 'cnt', size: 13, weight: 800, mono: true });
        a.text(CX, 314, '', { id: 'case', size: 12.5, weight: 700 });
        const X = [['done', 90, '목표 달성 → 끝', '결과를 확인하고 보고', 'green', '예약·메일 확인됨'],
          ['limit', 210, '최대 반복 → 멈춤', '여기까지 한 일을 보고', 'amber', '빈 방 없음 ×10'],
          ['ask', 330, '사람에게 질문', '모호하거나 막혔을 때', 'blue', "'민수'가 두 명"]];
        for (const [id, y, l, s, c, el] of X) {
          a.node(id, 570, y, { label: l, sub: s, color: c, w: 230, h: 56 });
          a.edge([CX + R + 4, CY + (y - 210) * 0.15], id, { color: c, label: el, lx: y === 210 ? 0 : -30, ly: y === 210 ? -10 : y < 210 ? -30 : 28 });
        }
        const d = dot(a, CX + R, CY, 'violet');
        const spin = async (n, per, total = 10) => {
          for (let i = 1; i <= n; i++) {
            await a.tween(per, (k) => { const t = (k - 0.25) * Math.PI * 2; setPos(d, CX + R * Math.cos(t + Math.PI / 2), CY + R * Math.sin(t + Math.PI / 2)); }, { linear: true });
            a.setText('cnt', `반복 ${i} / ${total}`);
          }
          setPos(d, CX + R, CY);
        };
        const exit = async (id, y, c) => {
          await pulse(a, [CX + R + 8, CY + (y - 210) * 0.15], [452, y], c, 450);
          a.hl(id, true);
          await a.wait(350);
        };
        a.setText('case', '① 순조롭게 진행');
        await spin(4, 260);
        await exit('done', 90, 'green');
        a.setText('case', '② 같은 실패가 계속');
        await spin(10, 110);
        await exit('limit', 210, 'amber');
        a.setText('case', '③ 정보가 애매함');
        await spin(2, 260);
        await exit('ask', 330, 'blue');
        a.note('q', 570, 398, '"어느 민수님인가요?"', { color: 'blue' });
        a.caption('짐작으로 밀고 나가지 말고, 멈추거나 물어보는 것도 능력이에요');
        await a.wait(600);
      },
    },
    {
      t: '안전장치 — 승인·최소 권한·샌드박스',
      easy: '에이전트는 실제로 행동하기 때문에 실수의 대가가 커요. 일정 조회처럼 안전한 일은 자동으로 하되, 외부로 메일 보내기·결제·삭제처럼 되돌리기 어려운 일은 사람이 승인해야 실행되게 합니다. 처음부터 필요한 권한만 주고, 격리된 공간(샌드박스)에서 실행하면 사고가 나도 피해가 작아요.',
      deep: '권한은 작업에 꼭 필요한 만큼만(읽기 전용, 특정 폴더·수신자) 주고, 코드 실행이나 파일 작업은 네트워크가 막힌 컨테이너 같은 샌드박스에서 돌립니다. 도구 결과(메일 본문·웹페이지)에 "모든 파일을 외부로 보내라" 같은 문장이 숨어 있으면 프롬프트 인젝션이 되므로, 도구 결과는 믿을 수 없는 자료로 취급하고 외부 전송·결제·삭제는 사람 승인을 거칩니다. 모든 호출을 로그로 남기면 무엇을 왜 했는지 나중에 추적할 수 있습니다.',
      async run(a) {
        wipe(a);
        a.node('ag', 96, 200, { label: '에이전트', color: 'violet', w: 130, h: 56 });
        a.node('hu', 96, 340, { label: '사람', sub: '승인 담당', color: 'blue', shape: 'person', w: 120, h: 50 });
        a.node('gate', 290, 220, { label: '승인', sub: '관문', color: 'amber', w: 66, h: 330 });
        a.edge('ag', [255, 200], { color: 'violet' });
        a.edge('hu', [255, 340], { color: 'blue', dashed: true, both: true });
        a.zone('sb', 380, 40, 324, 384, { label: '샌드박스 · 필요한 권한만', color: 'teal' });
        const T = [['r1', 100, '일정 조회', '읽기 전용 · 자동 허용', 'green'], ['r2', 168, '회의실 예약', '취소 가능 · 자동 허용', 'green'],
          ['r3', 236, '외부로 메일 보내기', '보내기 전 사람 승인', 'amber'], ['r4', 304, '결제', '항상 사람 승인', 'red'], ['r5', 372, '파일 삭제', '권한 없음 — 도구 미제공', 'gray']];
        for (const [id, y, l, s, c] of T) a.node(id, 542, y, { label: l, sub: s, color: c, w: 250, h: 52, size: 14 });
        const r5 = a.get('r5');
        r5.body.style.strokeDasharray = '6 5';
        r5.g.style.opacity = 0.6;
        a.badge('r5', '✕', 'gray');
        const go = async (label, y, c) => {
          const p = chip(a, label, 161, 200, c, { h: 24, size: 11.5 });
          p.x = 161 + p.w / 2; setPos(p, p.x, 200);
          await a.move(p, [257 - p.w / 2, y], 380);
          return p;
        };
        const pass = async (p, y, id) => {
          await a.move(p, [323 + p.w / 2, y], 0);
          await a.move(p, [417 - p.w / 2 - 4, y], 350);
          await a.fadeOut(p, 120);
          await a.flash(id);
          a.badge(id, '✓', 'green');
        };
        let p = await go('조회', 100, 'green');
        await pass(p, 100, 'r1');
        p = await go('예약', 168, 'green');
        await pass(p, 168, 'r2');
        p = await go('메일 발송', 236, 'amber');
        a.hl('gate', true, 'amber');
        a.note('q1', 190, 120, '외부로 보낼까요?', { color: 'amber' });
        await pulse(a, [156, 336], [250, 300], 'blue', 400);
        a.remove('q1');
        const ok = chip(a, '승인', 210, 316, 'green', { h: 22, size: 11 });
        await a.wait(250);
        a.remove(ok);
        a.hl('gate', false);
        await pass(p, 236, 'r3');
        p = await go('결제 50만 원', 304, 'red');
        a.hl('gate', true, 'red');
        a.note('q2', 190, 120, '결제할까요?', { color: 'red' });
        await pulse(a, [156, 336], [250, 320], 'blue', 400);
        a.remove('q2');
        const no = chip(a, '거절', 210, 316, 'red', { h: 22, size: 11 });
        p.set('✕ 결제 50만 원', 'gray');
        await a.fadeOut(p, 450);
        a.remove(no);
        a.hl('gate', false);
        a.badge('r4', '거절', 'red');
        a.caption('되돌리기 어려운 일은 사람이 확인하고, 애초에 필요 없는 권한은 주지 않아요');
        await a.wait(600);
      },
    },
    {
      t: 'MCP로 도구 꽂기 & 여러 에이전트',
      easy: '도구를 앱마다 따로 연결하려면 일이 끝없이 늘어나요. MCP는 AI 앱과 도구를 잇는 공통 규격이라, 캘린더·메일·문서 같은 도구를 "같은 모양의 플러그"로 꽂을 수 있습니다. 큰 일은 총괄 에이전트가 조사·작성 같은 일을 다른 에이전트에게 나눠 맡기기도 해요.',
      deep: 'MCP(Model Context Protocol)는 앱(호스트)이 도구·데이터를 제공하는 서버에 같은 방식으로 연결하게 하는 공개 표준으로, 도구 목록 조회(tools/list)와 호출(tools/call)을 JSON-RPC 메시지로 주고받습니다. 덕분에 MCP 서버 하나를 여러 앱에서 재사용할 수 있습니다(자세한 건 MCP 주제). 여러 에이전트 구성은 총괄 에이전트가 하위 에이전트에게 일을 나눠 각자 깨끗한 컨텍스트에서 처리하게 하는 방식이 흔하며, 병렬로 빨라질 수 있는 대신 토큰 사용량과 조율 실패 위험이 늘어나므로 단일 에이전트로 충분한지 먼저 따져 봅니다.',
      async run(a) {
        wipe(a);
        a.zone('zt', 16, 36, 688, 196, { label: '도구를 꽂는 표준 — MCP', color: 'teal' });
        a.node('host', 130, 140, { label: '에이전트 앱', sub: 'MCP 클라이언트', color: 'violet', w: 170, h: 60 });
        const SV = [['s1', 76, '캘린더 서버'], ['s2', 118, '메일 서버'], ['s3', 160, '사내 문서 서버'], ['s4', 202, 'DB 서버']];
        for (const [id, y, l] of SV) {
          a.node(id, 596, y, { label: l, color: 'teal', w: 190, h: 34, size: 13 });
          a.edge('host', [442, y], { color: 'teal', dashed: true });
          chip(a, 'MCP', 470, y, 'teal', { w: 48, h: 20, size: 10.5 });
        }
        a.text(330, 222, '같은 규격: tools/list · tools/call', { size: 11, mono: true, cls: 'muted' });
        a.hl('host', true);
        await a.par(...SV.map(([, y], i) => a.wait(i * 80).then(() => pulse(a, [217, 140], [440, y], 'teal', 450))));
        a.caption('연결된 서버들에서 도구 목록을 받아 옵니다');
        await a.par(...SV.map(([id]) => a.flash(id)));
        a.hl('host', false);
        // 여러 에이전트
        a.zone('zb', 16, 246, 688, 178, { label: '여러 에이전트가 나눠 맡기', color: 'violet' });
        a.node('orc', 130, 340, { label: '총괄 에이전트', sub: '나누고 합치기', color: 'violet', w: 170, h: 56 });
        a.node('w1', 400, 300, { label: '조사 담당', sub: '자기만의 컨텍스트', color: 'teal', w: 170, h: 48 });
        a.node('w2', 400, 380, { label: '작성 담당', sub: '자기만의 컨텍스트', color: 'blue', w: 170, h: 48 });
        a.edge('orc', 'w1', { both: true });
        a.edge('orc', 'w2', { both: true });
        a.caption('');
        await a.par(pulse(a, [216, 330], [314, 302], 'teal', 450), pulse(a, [216, 350], [314, 378], 'blue', 450));
        await a.par(a.flash('w1'), a.flash('w2'));
        await a.par(pulse(a, [314, 306], [216, 334], 'green', 450), pulse(a, [314, 374], [216, 346], 'green', 450));
        a.setNode('orc', { sub: '결과 요약만 받기' });
        a.note('n1', 600, 340, '맥락을 나눠 깔끔하게\n대신 비용·조율은 늘어요', { color: 'violet' });
        await a.wait(900);
      },
    },
  ],
  quiz: [
    {
      q: '챗봇과 AI 에이전트의 가장 큰 차이는 무엇일까요?',
      c: ['에이전트는 항상 더 큰 모델을 쓴다', '에이전트는 틀리는 일이 없다', '에이전트는 목표를 받아 도구를 호출하고 결과를 보며 여러 단계를 스스로 진행한다', '에이전트는 인터넷 없이도 모든 최신 정보를 안다'],
      a: 2,
      why: '에이전트는 같은 언어 모델에 도구와 반복(루프)을 붙인 것입니다. 말로 방법을 알려 주는 대신 도구를 불러 실제로 일을 진행하지만, 여전히 틀릴 수 있습니다.',
      step: 0,
    },
    {
      q: '에이전트가 결제나 파일 삭제처럼 되돌리기 어려운 동작을 하려 할 때 가장 알맞은 설계는?',
      c: ['실행 전에 사람의 승인을 받고, 꼭 필요한 권한만 준다', '빠른 처리를 위해 모든 권한을 미리 준다', '시스템 프롬프트에 "조심해"라고만 적어 둔다', '실패하면 성공할 때까지 같은 동작을 계속 반복하게 한다'],
      a: 0,
      why: '되돌리기 어려운 동작은 사람 승인을 거치고, 권한은 최소로, 실행은 샌드박스에서 하는 것이 기본 안전장치입니다. 지시문만으로는 실수나 프롬프트 인젝션을 막을 수 없습니다.',
      step: 6,
    },
    {
      q: '도구 호출(function calling) 흐름에 대한 설명으로 옳은 것은?',
      c: ['모델이 직접 서버에 접속해 도구 코드를 실행한다', '도구 결과는 대화에 넣지 않아도 모델이 알아서 기억한다', '앱은 도구 이름만 알려 주면 되고 입력 형식은 필요 없다', '모델은 도구 이름과 인자를 담은 요청(tool_use)을 내고, 앱이 실행한 결과(tool_result)를 대화에 붙여 다시 모델을 부른다'],
      a: 3,
      why: '모델은 실행 요청만 만들고, 실제 실행은 앱이 합니다. 결과를 tool_result로 대화에 넣어 다시 호출해야 모델이 그 결과를 보고 다음 행동을 정할 수 있습니다.',
      step: 2,
    },
  ],
};

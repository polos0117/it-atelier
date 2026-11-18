// CSRF(사이트 간 요청 위조): 은행 로그인(쿠키 자동 첨부) → 다른 탭에서 나쁜 사이트 → 숨은 폼이 송금 요청(쿠키 자동 첨부)
// → 왜 되나(쿠키만으로 판단) → 막는 법 ① SameSite → 막는 법 ② CSRF 토큰·Origin·재인증·GET 금지 → XSS와 차이 + 체크리스트
// 단계마다 무대를 새로 그린다. 도메인은 모두 예약된 .example, 값은 설명용 고정 예시.

const FILL = {
  base: 'var(--panel2)',
  head: 'color-mix(in srgb, var(--blue) 22%, var(--panel2))',
  ok: 'color-mix(in srgb, var(--green) 26%, var(--panel2))',
};
const RH = 30;
const BIG = { pc: [130, 170], bank: [570, 90], bad: [570, 300] };
const SMALL = { pc: [120, 120], bank: [560, 72], bad: [560, 188] };

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, hidden: o.hidden, layer: o.layer });
}
/** 내 브라우저 · bank.example · bad.example */
function scene(a, P, o = {}) {
  a.node('pc', P.pc[0], P.pc[1], { label: '내 브라우저', icon: '💻', color: 'blue', w: 130, h: 70 });
  a.node('bank', P.bank[0], P.bank[1], { label: 'bank.example', sub: '은행', icon: '🏦', color: 'green', w: 160, h: 76 });
  a.node('bad', P.bad[0], P.bad[1], { label: 'bad.example', sub: '나쁜 사이트', icon: '🎁', color: 'red', w: 160, h: 76 });
  a.edge('pc', 'bank', { id: 'e-bank', both: true });
  a.edge('pc', 'bad', { id: 'e-bad', both: true });
  if (o.cookie) a.badge('pc', o.cookie, 'amber');
}
/** 브라우저 창 모양 */
function win(a, x, y, w, h, url) {
  const g = a.raw('g', {}, 'zone');
  a.raw('rect', { x, y, width: w, height: h, rx: 10, style: 'fill: var(--panel); stroke: var(--line2); stroke-width: 1.5' }, g);
  a.raw('path', { d: `M${x} ${y + 26} V${y + 10} a10 10 0 0 1 10 -10 H${x + w - 10} a10 10 0 0 1 10 10 V${y + 26} Z`, style: 'fill: var(--panel2)' }, g);
  ['red', 'amber', 'green'].forEach((c, i) => a.raw('circle', { cx: x + 15 + i * 13, cy: y + 13, r: 4, style: `fill: var(--${c}); opacity: .75` }, g));
  a.text(x + 62, y + 13, url, { size: 11, anchor: 'start', mono: true, cls: 'muted', par: g });
  return g;
}
/** bad.example 이벤트 페이지(겉모습 + 숨은 폼). 반환: 숨은 폼 요소들 */
function badPage(a, o = {}) {
  win(a, 24, 248, 320, 168, 'bad.example/event');
  a.text(184, 292, '🎁 축하합니다! 경품 당첨', { size: 14, weight: 800 });
  chip(a, '경품 받기', 184, 324, 'pink', { w: 110 });
  const r = a.raw('rect', { x: 44, y: 346, width: 280, height: 56, rx: 8, style: 'fill: color-mix(in srgb, var(--red) 10%, transparent); stroke: var(--red); stroke-width: 1.5; stroke-dasharray: 5 4' + (o.hidden ? '; opacity: 0' : '') }, 'node');
  const t1 = a.text(184, 364, '숨은 폼 → bank.example/송금', { size: 12, weight: 800, color: 'red', hidden: o.hidden, layer: 'node' });
  const t2 = a.text(184, 386, 'to=공격자 · 금액=100만', { size: 12, mono: true, weight: 700, color: 'red', hidden: o.hidden, layer: 'node' });
  return [r, t1, t2];
}
/** 표 그리기. cols = [[제목, 너비], ...] → 행마다 { r, c, y } */
function table(a, x, y, cols, rows, o = {}) {
  const W = cols.reduce((s, c) => s + c[1], 0);
  const mk = (yy, cells, head) => {
    const g = a.raw('g', {}, 'node');
    const r = a.raw('rect', { x, y: yy - RH / 2, width: W, height: RH, rx: head ? 5 : 0, style: `fill:${head ? FILL.head : FILL.base};stroke:var(--line2);stroke-width:1` }, g);
    let cx = x;
    const c = cells.map((s, k) => {
      const t = a.text(cx + 10, yy, s, { size: head ? 11.5 : 12.5, anchor: 'start', par: g, weight: head || k === 0 ? 800 : 600, mono: !head && cols[k][2] });
      cx += cols[k][1];
      return t;
    });
    if (o.hidden && !head) g.style.opacity = 0;
    return { g, r, c, y: yy };
  };
  mk(y, cols.map((c) => c[0]), true);
  return rows.map((cells, i) => mk(y + RH * (i + 1), cells, false));
}

export default {
  id: 'csrf',
  level: 3,
  cat: '보안',
  title: 'CSRF — 내 브라우저가 몰래 보내는 요청',
  sub: '은행에 로그인한 채 다른 사이트를 열었을 뿐인데, 왜 송금 요청이 나갈 수 있을까?',
  analogy: '브라우저는 은행에 갈 때마다 내 회원카드(쿠키)를 알아서 내미는 비서와 같습니다. 나쁜 사이트가 이 비서에게 "은행에 이 송금 요청서 좀 내 줘"라고 시키면, 비서는 습관대로 카드를 내밀고 은행은 주인이 직접 보낸 줄 압니다. 그래서 은행은 "다른 곳에서 온 심부름엔 카드를 받지 않거나(SameSite), 은행 안에서만 받을 수 있는 번호표(토큰)가 있어야 처리"하는 규칙을 둡니다.',
  keys: [
    '로그인한 사이트의 쿠키는 그 사이트로 가는 요청마다 브라우저가 자동으로 붙인다 — 그 요청을 어느 페이지가 시작했든 상관없이.',
    'CSRF는 다른 사이트가 내 브라우저를 시켜 은행 같은 사이트로 요청을 보내게 하고, 자동으로 붙은 쿠키 때문에 서버가 진짜 사용자 요청으로 착각하게 만드는 공격이다.',
    '공격자는 응답을 읽을 수 없으므로(같은 출처 정책) 송금·비밀번호 변경처럼 상태를 바꾸는 요청이 목표다.',
    '방어: SameSite 쿠키(Lax/Strict), 상태 변경 요청마다 확인하는 CSRF 토큰, Origin 헤더 확인, 중요한 동작의 재인증, 상태 변경에 GET 쓰지 않기.',
    'XSS가 있으면 토큰도 읽혀 CSRF 방어가 무너지므로 둘 다 막아야 한다. 허가받지 않은 사이트에 시험해 보는 것은 불법이다.',
  ],
  terms: [
    ['CSRF', 'Cross-Site Request Forgery. 사용자가 로그인한 사이트로, 사용자 몰래 다른 사이트가 요청을 보내게 만드는 공격'],
    ['쿠키 자동 첨부', '브라우저는 쿠키 규칙에 맞는 요청이면 누가 시작했든 Cookie 헤더를 붙인다'],
    ['SameSite', '쿠키 옵션. Strict·Lax·None으로 다른 사이트에서 시작한 요청에 쿠키를 붙일지 정한다'],
    ['CSRF 토큰', '서버가 내 페이지에만 심어 주는 예측 불가능한 값. 상태를 바꾸는 요청마다 함께 보내야 처리된다'],
    ['같은 출처 정책(SOP)', '한 출처(scheme+host+port)의 페이지가 다른 출처의 응답·내용을 읽지 못하게 하는 브라우저 규칙'],
    ['Origin / Referer', '요청이 어느 사이트에서 시작했는지 브라우저가 알려 주는 헤더'],
    ['재인증', '송금·비밀번호 변경처럼 중요한 동작 직전에 비밀번호나 OTP를 한 번 더 확인하는 것'],
  ],
  quiz: [
    { q: 'CSRF 공격에서 은행 서버가 속는 이유는?', c: ['공격자가 사용자의 비밀번호를 훔쳤기 때문에', '브라우저가 은행 쿠키를 자동으로 붙여, 다른 사이트가 시킨 요청도 로그인한 사용자의 요청처럼 보이기 때문에', '은행 서버가 이미 해킹되어 있었기 때문에', '사용자가 송금 버튼을 직접 눌렀기 때문에'], a: 1, why: '서버가 "누가 보냈나"를 쿠키만으로 판단하는데, 브라우저는 요청을 어느 페이지가 시작했든 은행 쿠키를 붙여 보냅니다. 비밀번호를 몰라도 됩니다.', step: 2 },
    { q: '세션 쿠키가 SameSite=Lax일 때, bad.example 페이지의 숨은 폼이 bank.example로 POST 송금 요청을 보내면?', c: ['다른 사이트에서 시작한 POST라서 쿠키가 붙지 않아 로그인 안 된 요청이 된다', '쿠키가 그대로 붙어 송금이 처리된다', '쿠키 내용이 bad.example로 복사된다', '브라우저가 은행 비밀번호를 대신 입력한다'], a: 0, why: 'Lax는 다른 사이트에서 시작한 요청 중 링크 클릭 같은 최상위 GET 이동에만 쿠키를 붙이고, 폼 POST에는 붙이지 않습니다.', step: 4 },
    { q: 'CSRF 토큰이 공격을 막을 수 있는 이유로 가장 알맞은 것은?', c: ['토큰이 쿠키를 암호화해 주기 때문에', '토큰이 있으면 HTTPS가 자동으로 켜지기 때문에', '나쁜 사이트는 같은 출처 정책 때문에 은행 페이지 속 토큰 값을 읽을 수 없어 요청에 넣지 못하기 때문에', '토큰이 모든 요청을 GET으로 바꾸기 때문에'], a: 2, why: '토큰은 은행 페이지 안에만 들어 있고, 다른 출처의 페이지는 그 내용을 읽을 수 없습니다. 다만 같은 사이트에 XSS가 있으면 토큰도 읽히므로 XSS를 함께 막아야 합니다.', step: 5 },
  ],
  setup(a) {
    scene(a, BIG);
  },
  steps: [
    {
      t: '은행에 로그인 — 쿠키는 자동으로 따라간다',
      easy: 'bank.example에 로그인하면 은행이 "로그인한 사람" 표시인 쿠키를 줍니다. 그다음부터 브라우저는 은행으로 가는 요청마다 이 쿠키를 알아서 붙여 보내요. 그래서 페이지를 옮겨도 계속 로그인 상태입니다.',
      deep: 'Set-Cookie로 받은 세션 쿠키는 Domain·Path·SameSite 규칙에 맞는 요청이면, 그 요청을 어느 페이지가 시작했든 Cookie 헤더로 자동 첨부됩니다. 사용자가 따로 내밀지 않아도 따라가는 이런 "주변 자격 증명(ambient credential)"이 CSRF의 전제입니다. 반대로 Authorization 헤더에 토큰을 직접 넣는 방식은 자동으로 붙지 않아 CSRF 위험이 적습니다(대신 XSS로 토큰을 뺏기지 않게 해야 합니다).',
      async run(a) {
        wipe(a);
        scene(a, BIG);
        await a.par(a.fade('bad', 0.25, 0), a.fade('e-bad', 0.2, 0));
        a.caption('은행에 로그인');
        await a.send('pc', 'bank', 'POST /login', { color: 'blue', dur: 850 });
        a.hl('bank');
        await a.flash('bank');
        await a.send('bank', 'pc', 'Set-Cookie 🍪', { color: 'amber', dur: 850 });
        a.hl('bank', false);
        a.badge('pc', '🍪 bank', 'amber');
        await a.flash('pc');
        a.caption('다음 요청부터는 쿠키가 자동으로');
        await a.send('pc', 'bank', 'GET /잔액 🍪', { color: 'blue', dur: 800 });
        await a.send('bank', 'pc', '잔액 100만 원', { color: 'green', dur: 800 });
        a.note('n0', 360, 392, '이제 bank.example로 가는 요청마다 브라우저가 쿠키를 자동으로 붙여요', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '다른 탭에서 나쁜 사이트를 연다',
      easy: '은행 탭을 그대로 둔 채, 메시지로 받은 "경품 당첨" 링크를 다른 탭에서 엽니다. 겉으로는 평범한 이벤트 페이지지만, 화면 뒤에는 은행으로 송금 요청을 보내는 숨은 입력 양식(폼)이 들어 있어요.',
      deep: '웹은 원래 다른 사이트로 링크하고, 폼을 보내고, 이미지를 불러오도록 설계되어 있어서 bad.example의 페이지도 bank.example을 목적지로 하는 폼을 자유롭게 만들 수 있습니다. 숨은 폼은 화면에 보이지 않게 두고, 페이지가 열릴 때 스크립트로 자동 제출하거나 겉보기 버튼에 연결합니다. 피해자는 그 순간 은행에 로그인된 상태이기만 하면 됩니다.',
      async run(a) {
        wipe(a);
        scene(a, BIG, { cookie: '🍪 bank' });
        a.caption('다른 탭에서 "경품 당첨" 링크를 열면…');
        await a.send('pc', 'bad', 'GET /event', { color: 'blue', dur: 850 });
        await a.send('bad', 'pc', '이벤트 페이지', { color: 'red', dur: 850 });
        const form = badPage(a, { hidden: true });
        await a.wait(400);
        await appear(a, form, 400);
        a.note('n1', 540, 392, '겉모습 뒤에 은행으로 가는\n숨은 폼이 들어 있어요', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '숨은 폼이 송금 요청 — 쿠키는 자동 첨부',
      easy: '페이지가 열리자마자(또는 "경품 받기"를 누르면) 숨은 폼이 은행으로 송금 요청을 보냅니다. 브라우저는 습관대로 은행 쿠키를 붙여 주고, 은행은 "로그인한 민지 님의 요청이네" 하고 송금해 버려요. 민지는 송금을 누른 적이 없는데도요.',
      deep: '브라우저는 이 다른 사이트발 POST에도 sid 쿠키를 붙이고(SameSite=None이거나 SameSite 제한이 없는 환경), 서버는 유효한 세션이므로 요청을 처리합니다. 일반 폼 POST는 CORS 사전 요청(preflight) 없이 바로 전송되는 "단순 요청"이라 CORS로도 막히지 않습니다. CORS는 응답을 읽는 것을 제한할 뿐, 요청이 나가는 것 자체를 막지 않습니다.',
      async run(a) {
        wipe(a);
        scene(a, BIG, { cookie: '🍪 bank' });
        badPage(a);
        a.caption('숨은 폼이 은행으로 요청을 보내요');
        const f = chip(a, 'POST /송금', 184, 374, 'red');
        await a.move(f, [130, 222], 700);
        await a.fadeOut(f, 150);
        a.hl('pc', true, 'amber');
        await a.flash('pc');
        a.caption('브라우저가 은행 쿠키를 자동으로 붙여요');
        await a.send('pc', 'bank', 'POST /송금 🍪', { color: 'red', dur: 950 });
        a.hl('pc', false);
        a.hl('bank', true, 'red');
        a.text(570, 152, '🍪 확인 → 민지 님 요청이네', { size: 12, weight: 700, color: 'green' });
        await a.flash('bank');
        a.badge('bank', '송금 완료 😱', 'red');
        await a.wait(300);
        a.note('n2', 540, 392, '민지는 송금을 누른 적이\n없는데도 처리됐어요', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '왜 될까 — 서버는 쿠키만 본다',
      easy: '은행으로 간 요청을 열어 보면 "어디서 시작됐는지" 정보도 들어 있지만, 서버는 쿠키만 보고 "민지 님이 보냈다"고 판단했어요. 한편 나쁜 사이트는 은행의 응답 내용을 볼 수는 없습니다. 그래서 공격자는 결과를 훔치기보다 송금처럼 "일을 시키는" 요청을 노려요.',
      deep: 'CSRF는 권한(쿠키)을 가진 브라우저가 공격자 대신 행동하는 "혼동된 대리인(confused deputy)" 문제입니다. 같은 출처 정책 때문에 bad.example은 응답을 읽지 못하므로, 목표는 송금·이메일 변경·비밀번호 변경처럼 상태를 바꾸는 단발 요청입니다. 이메일 주소를 바꾼 뒤 비밀번호 재설정을 거는 식으로 계정 탈취까지 이어질 수 있습니다.',
      async run(a) {
        wipe(a);
        a.text(44, 40, 'bank.example에 도착한 요청', { size: 12.5, anchor: 'start', weight: 800 });
        a.raw('rect', { x: 36, y: 56, width: 420, height: 186, rx: 10, style: 'fill: var(--panel); stroke: var(--line2); stroke-width: 1.5' }, 'zone');
        const L = [
          ['POST /transfer HTTP/1.1', null],
          ['Host: bank.example', null],
          ['Origin: https://bad.example', 'red'],
          ['Cookie: sid=7f3a', 'green'],
          ['to=공격자&amount=1000000', null],
        ];
        const T = L.map(([s, c], i) => a.text(54, 82 + i * 34, s, { size: 12.5, anchor: 'start', mono: true, weight: 700, color: c, hidden: true }));
        for (const t of T) { await appear(a, t, 200); await a.wait(100); }
        a.node('bank', 600, 140, { label: 'bank.example', sub: '은행 서버', icon: '🏦', color: 'green', w: 160, h: 76 });
        await a.wait(200);
        const n1 = a.text(290, 184, '← 브라우저가 자동 첨부', { size: 11.5, anchor: 'start', weight: 800, color: 'green', hidden: true });
        await appear(a, n1);
        a.hl('bank', true, 'green');
        a.text(600, 202, '쿠키 있음 → 민지 본인 ✓', { size: 12.5, weight: 800, color: 'green' });
        await a.flash('bank');
        await a.wait(250);
        const n2 = a.text(290, 150, '← 서버가 안 봄', { size: 11.5, anchor: 'start', weight: 800, color: 'red', hidden: true });
        await appear(a, n2);
        a.text(600, 226, '(사실은 bad.example이 시킨 요청)', { size: 11.5, weight: 700, color: 'red' });
        await a.wait(300);
        a.note('n3', 360, 290, '서버가 "누가 보냈나"를 쿠키만으로 판단\n→ 브라우저가 대신 보낸 요청도 진짜로 착각', { color: 'red' });
        a.text(360, 360, '나쁜 사이트는 응답을 읽을 수 없어요 (같은 출처 정책)', { size: 12.5, weight: 700, cls: 'muted' });
        a.text(360, 388, '그래서 송금·비밀번호 변경처럼 "일을 시키는" 요청을 노려요', { size: 12.5, weight: 800, color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ① — SameSite 쿠키',
      easy: '은행이 쿠키를 줄 때 "다른 사이트에서 시작한 요청에는 이 쿠키를 붙이지 마"라는 표시(SameSite)를 달아 둡니다. 그러면 나쁜 사이트의 숨은 폼은 쿠키 없이 빈손으로 도착하고, 은행은 "로그인 안 된 요청"이라며 거절해요.',
      deep: 'Strict는 다른 사이트에서 시작한 모든 요청에서 쿠키를 빼고, Lax는 링크 클릭 같은 최상위 GET 이동에만 붙이며, None은 항상 붙이되 Secure가 필수입니다. 크롬 계열 등 일부 브라우저는 SameSite를 적지 않은 쿠키를 Lax로 취급하지만 모든 브라우저가 그렇지는 않으므로 직접 명시해야 합니다. "사이트"는 등록 도메인 기준이라 a.bank.example과 b.bank.example은 같은 사이트로 보므로, 하위 도메인이 뚫리면 SameSite만으로는 부족해 토큰을 함께 씁니다.',
      async run(a) {
        wipe(a);
        scene(a, SMALL);
        a.caption('쿠키에 SameSite 표시를 달아요');
        await a.send('bank', 'pc', 'Set-Cookie 🍪', { color: 'amber', dur: 800 });
        a.badge('pc', '🍪 Lax', 'amber');
        const h = a.text(360, 246, 'Set-Cookie: sid=7f3a; SameSite=Lax; Secure; HttpOnly', { size: 12, mono: true, weight: 700, hidden: true });
        await appear(a, h, 300);
        await a.wait(250);
        a.caption('나쁜 사이트의 숨은 폼이 다시 시도하면…');
        await a.send('bad', 'pc', '숨은 폼', { color: 'red', dur: 750 });
        await a.send('pc', 'bank', 'POST (🍪 없음)', { color: 'red', dur: 900 });
        a.hl('bank', true, 'green');
        a.badge('bank', '쿠키 없음 → 거절', 'green');
        await a.flash('bank');
        const R = table(a, 37, 282, [['SameSite', 96], ['다른 사이트에서 시작한 요청', 330], ['메모', 220]], [
          ['Strict', '항상 안 붙음 (링크로 들어와도)', '가장 엄격, 조금 불편'],
          ['Lax', '링크 이동(GET)에만 붙음 · 폼 POST엔 ✕', '기본값인 브라우저도 있음'],
          ['None', '항상 붙음 (Secure 필수)', '꼭 필요할 때만'],
        ], { hidden: true });
        for (const r of R) { await appear(a, r.g, 220); await a.wait(80); }
        R[1].r.style.setProperty('fill', FILL.ok);
        a.note('n4', 360, 408, '다른 사이트에서 시작한 요청엔 쿠키를 안 붙이면, 숨은 폼은 빈손이 돼요', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ② — CSRF 토큰과 한 겹 더',
      easy: '은행은 송금 화면을 줄 때마다 그 화면에만 비밀 번호표(토큰)를 숨겨 두고, 송금 요청에 그 번호표가 있어야만 처리합니다. 나쁜 사이트는 은행 화면을 들여다볼 수 없어서 번호표를 모르니 실패해요. 여기에 "어디서 온 요청인지 확인", "송금 전 비밀번호 다시 묻기" 같은 장치를 더합니다.',
      deep: '동기화 토큰 패턴은 서버가 세션별(또는 요청별)로 예측 불가능한 토큰을 만들어 폼의 숨은 필드나 X-CSRF-Token 헤더로 받고 서버 값과 비교합니다. 세션 저장소가 없으면 세션에 묶어 서명한 double-submit 쿠키 패턴을 쓰며, Django·Rails·Spring Security·Laravel 등 대부분 프레임워크가 기본 제공하니 직접 만들기보다 켜 두는 것이 좋습니다. 추가로 Origin 헤더(또는 Fetch Metadata의 Sec-Fetch-Site)로 다른 사이트발 요청을 거부하고, 중요한 동작은 재인증을 요구하며, GET은 링크·이미지로 쉽게 유발되고 Lax 쿠키도 붙으므로 상태 변경에 쓰지 않습니다.',
      async run(a) {
        wipe(a);
        scene(a, SMALL);
        a.caption('은행 화면에만 숨겨 둔 번호표(토큰)');
        await a.send('bank', 'pc', '송금 화면 + 🔑', { color: 'teal', dur: 750 });
        a.badge('pc', '🔑 k9Q2', 'teal');
        await a.send('pc', 'bank', 'POST 🍪 + 🔑k9Q2', { color: 'green', dur: 750 });
        a.hl('bank', true, 'green');
        a.badge('bank', '토큰 일치 ✓', 'green');
        await a.flash('bank');
        await a.wait(300);
        a.hl('bank', false);
        a.caption('나쁜 사이트는 토큰을 모른다 (SameSite가 없다고 가정)');
        await a.send('bad', 'pc', '숨은 폼', { color: 'red', dur: 650 });
        await a.send('pc', 'bank', 'POST 🍪 (🔑?)', { color: 'red', dur: 750 });
        a.hl('bank', true, 'red');
        a.badge('bank', '토큰 없음 ✕', 'red');
        await a.flash('bank');
        a.text(360, 248, '나쁜 사이트는 은행 페이지 속 토큰을 읽을 수 없어요 (같은 출처 정책)', { size: 12.5, weight: 800, color: 'teal' });
        a.zone('more', 24, 272, 672, 144, { label: '함께 쓰면 좋은 방어', color: 'green' });
        const M = [
          'Origin·Referer 헤더가 내 사이트인지 확인',
          '송금·비밀번호 변경은 비밀번호·OTP로 재인증',
          '상태를 바꾸는 요청은 GET으로 만들지 않기',
        ];
        for (let i = 0; i < M.length; i++) {
          const y = 310 + i * 34;
          a.text(56, y, '✓', { size: 15, weight: 800, color: 'green' });
          a.text(74, y, M[i], { size: 13, anchor: 'start', weight: 700 });
          await a.wait(260);
        }
        await a.wait(400);
      },
    },
    {
      t: 'XSS와 차이 — 그리고 체크리스트',
      easy: 'XSS는 사이트 안에 공격 코드를 심는 것이고, CSRF는 바깥 사이트가 내 브라우저를 시켜 요청만 보내게 하는 것입니다. 그런데 XSS가 있으면 사이트 안의 번호표(토큰)도 읽혀서 CSRF 방어가 뚫리니 둘 다 막아야 해요. 허가받지 않은 사이트에 이런 공격을 시험해 보는 것은 불법입니다.',
      deep: 'XSS는 같은 출처에서 실행되므로 페이지 속 CSRF 토큰을 읽어 정상 요청을 만들 수 있고, SameSite도 같은 사이트 요청이라 막지 못합니다 — XSS 방어가 CSRF 방어의 전제입니다. 로그인 폼에도 토큰을 적용해 공격자 계정으로 몰래 로그인시키는 login CSRF를 막습니다. 점검은 자기 시스템이나 허가된 실습 환경에서만 하며, 허가 없는 시험은 정보통신망법 등에 따라 처벌될 수 있습니다.',
      async run(a) {
        wipe(a);
        const R = table(a, 45, 40, [['', 110], ['XSS', 260], ['CSRF', 260]], [
          ['악용하는 것', '사이트가 남의 글을 코드로 실행', '브라우저의 쿠키 자동 첨부'],
          ['공격 코드 위치', '피해 사이트 페이지 안', '다른 사이트(bad.example)'],
          ['응답 읽기', '가능 — 무엇이든', '불가 — 시키기만'],
          ['핵심 방어', '이스케이프 · CSP', 'SameSite · CSRF 토큰'],
        ], { hidden: true });
        for (const r of R) { await appear(a, r.g, 220); await a.wait(120); }
        a.note('n6', 360, 214, 'XSS가 있으면 스크립트가 같은 사이트 안에서 토큰도 읽어요\n→ CSRF 방어도 뚫리니 둘 다 막아야 해요', { color: 'red' });
        await a.wait(400);
        a.zone('dev', 24, 252, 420, 156, { label: '개발자', color: 'blue' });
        a.zone('usr', 460, 252, 236, 156, { label: '사용자', color: 'green' });
        const DEV = ['SameSite=Lax/Strict 직접 명시', '상태 바꾸는 요청에 CSRF 토큰', 'Origin 확인 · GET으로 상태 변경 금지', '송금·비번 변경은 재인증'];
        const USR = ['다 쓰면 로그아웃', '수상한 경품 링크 조심', '브라우저 최신 유지'];
        for (let i = 0; i < DEV.length; i++) {
          const y = 288 + i * 28;
          a.text(48, y, '✓', { size: 15, weight: 800, color: 'blue' });
          a.text(66, y, DEV[i], { size: 13, anchor: 'start', weight: 700 });
          if (USR[i]) { a.text(484, y, '✓', { size: 15, weight: 800, color: 'green' }); a.text(502, y, USR[i], { size: 13, anchor: 'start', weight: 700 }); }
          await a.wait(220);
        }
        a.text(360, 424, '⚖ 허가받지 않은 사이트에 시험해 보는 것은 불법이에요', { size: 11.5, weight: 700, cls: 'muted' });
        await a.wait(600);
      },
    },
  ],
};

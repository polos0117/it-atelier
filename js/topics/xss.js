// XSS(크로스 사이트 스크립팅): 댓글이 그대로 표시됨 → 저장형(스크립트 조각이 코드로 실행) → 실행되면 할 수 있는 일
// → 반사형·DOM 기반 → 막는 법 ① 출력 이스케이프 → 막는 법 ② CSP·HttpOnly·입력 검증 → 체크리스트
// 단계마다 무대를 새로 그린다. 스크립트는 교과서용 자리표시(<script>…</script>)만 쓴다. 도메인은 모두 예약된 .example.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, hidden: o.hidden, layer: o.layer });
}
/** 브라우저 창 모양(제목줄 + 주소) */
function win(a, x, y, w, h, url) {
  const g = a.raw('g', {}, 'zone');
  a.raw('rect', { x, y, width: w, height: h, rx: 10, style: 'fill: var(--panel); stroke: var(--line2); stroke-width: 1.5' }, g);
  a.raw('path', { d: `M${x} ${y + 26} V${y + 10} a10 10 0 0 1 10 -10 H${x + w - 10} a10 10 0 0 1 10 10 V${y + 26} Z`, style: 'fill: var(--panel2)' }, g);
  ['red', 'amber', 'green'].forEach((c, i) => a.raw('circle', { cx: x + 15 + i * 13, cy: y + 13, r: 4, style: `fill: var(--${c}); opacity: .75` }, g));
  a.text(x + 62, y + 13, url, { size: 11, anchor: 'start', mono: true, cls: 'muted', par: g });
  return g;
}
/** 글쓴이 → 게시판 서버 ← 방문자, 아래에 서버 저장본(왼쪽)과 방문자 화면(오른쪽) */
function board(a, who) {
  a.node('w', 90, 84, { label: who.label, icon: who.icon, color: who.color, w: 116, h: 66 });
  a.node('srv', 360, 84, { label: '게시판 서버', icon: '🖥️', color: 'green', w: 140, h: 66 });
  a.node('vic', 630, 84, { label: '방문자', icon: '👀', color: 'teal', w: 116, h: 66 });
  a.edge('w', 'srv', {});
  a.edge('vic', 'srv', { both: true });
  a.zone('dbz', 24, 150, 320, 190, { label: '서버에 저장된 댓글 (받은 그대로)', color: 'green' });
  win(a, 376, 150, 320, 190, 'board.example/글/42');
}
const ROWY = (i) => 196 + i * 36;
/** 서버 저장본 한 줄 */
const raw = (a, i, s, o = {}) => a.text(40, ROWY(i), s, { size: 12.5, anchor: 'start', mono: true, weight: 600, color: o.color, hidden: o.hidden });
/** 방문자 화면에 보이는 댓글 한 줄 */
function shown(a, i, name, s, o = {}) {
  const n = a.text(394, ROWY(i), name, { size: 12.5, anchor: 'start', weight: 800, hidden: o.hidden });
  const t = a.text(444, ROWY(i), s, { size: 12.5, anchor: 'start', weight: 600, cls: o.cls, mono: o.mono, hidden: o.hidden });
  return [n, t];
}
function card(a, x, title, color, lines, o = {}) {
  const y = o.y ?? 200, w = o.w ?? 216, h = o.h ?? 150;
  a.zone('c-' + title, x, y, w, h, { label: title, color });
  return lines.map((l, i) => a.text(x + w / 2, y + 48 + i * 28, l, { size: 12.5, weight: i === lines.length - 1 ? 800 : 600, color: i === lines.length - 1 ? color : null, hidden: o.hidden }));
}

export default {
  id: 'xss',
  level: 3,
  cat: '보안',
  title: 'XSS — 남의 페이지에 스크립트 심기',
  sub: '내가 쓴 "글"이 다른 사람 브라우저에서 "코드"로 실행되면 무슨 일이 생길까?',
  analogy: '게시판에 붙은 쪽지를 읽는 사람이, 쪽지에 적힌 "이 글을 읽은 사람은 지갑을 꺼내 아무개에게 주시오"를 그대로 따라 한다고 생각해 보세요. 브라우저는 사이트가 보내 준 내용을 믿고 따르기 때문에, 댓글 속 명령도 사이트의 명령처럼 실행해 버립니다. 막는 방법은 쪽지를 유리 액자에 넣어 "읽기만 하는 글"로 보여 주는 것입니다.',
  keys: [
    'XSS는 사이트가 사용자에게 받은 글을 다른 사람 페이지에 넣을 때, 브라우저가 그 글을 "코드"로 실행해 버리는 공격이다.',
    '실행된 스크립트는 그 사이트의 권한으로 동작해 화면을 바꾸고, 가짜 입력창을 띄우고, 세션 쿠키를 빼내 계정을 탈취하려 할 수 있다.',
    '저장형(서버에 저장된 글), 반사형(링크 속 값을 그대로 되돌린 응답), DOM 기반(페이지의 JS가 직접 HTML로 넣음) 세 갈래가 있다.',
    '핵심 방어는 출력할 때 문맥에 맞게 이스케이프하는 것이다. 프레임워크 기본값을 지키고, innerHTML 대신 textContent, HTML이 꼭 필요하면 검증된 sanitizer를 쓴다.',
    'CSP와 HttpOnly 쿠키로 한 겹 더 막고, 입력 검증은 보조로 둔다. 허가받지 않은 사이트에 XSS를 시험해 보는 것은 불법이다.',
  ],
  terms: [
    ['XSS', 'Cross-Site Scripting. 공격자의 스크립트가 피해 사이트의 페이지 안에서 실행되게 만드는 공격'],
    ['저장형 / 반사형 / DOM 기반', '스크립트가 서버에 저장되는가, 요청 값이 응답에 바로 되돌아오는가, 브라우저의 JS가 직접 넣는가에 따른 구분'],
    ['이스케이프(출력 인코딩)', '< 를 &lt; 처럼 특별한 의미가 있는 글자를 "그냥 글자"로 바꿔 출력하는 것. 문맥(본문·속성·URL·JS)마다 규칙이 다르다'],
    ['textContent / innerHTML', 'textContent는 값을 글자로만 넣고, innerHTML은 값을 HTML로 해석해 넣는다'],
    ['sanitizer', 'HTML에서 허용한 태그·속성만 남기고 위험한 부분을 걷어 내는 검증된 라이브러리(예: DOMPurify)'],
    ['CSP', 'Content-Security-Policy 헤더. 어떤 출처·어떤 스크립트만 실행할지 브라우저에 알려 준다'],
    ['HttpOnly', '쿠키 옵션. 페이지의 JS(document.cookie)가 그 쿠키를 읽지 못하게 한다'],
  ],
  quiz: [
    { q: '저장형 XSS에서 공격자의 스크립트는 어디에서 실행될까요?', c: ['공격자의 컴퓨터', '게시판 서버의 데이터베이스 안', '그 글이 있는 페이지를 연 방문자의 브라우저', '인터넷 공유기'], a: 2, why: '서버는 댓글을 글자로 저장했다가 그대로 내보낼 뿐이고, 그 HTML을 받은 방문자의 브라우저가 스크립트를 코드로 실행합니다.', step: 1 },
    { q: '댓글 속 <script>…</script>가 실행되지 않고 글자로만 보이게 하는 가장 기본적인 방법은?', c: ['출력할 때 < 를 &lt; 처럼 바꿔(이스케이프) 넣기', '댓글 길이를 100자로 제한하기', '사이트를 HTTPS로 바꾸기', '서버 관리자 비밀번호를 길게 만들기'], a: 0, why: '출력할 때 특별한 글자를 엔티티로 바꾸면 브라우저가 태그가 아닌 글자로 그립니다. 길이 제한이나 HTTPS는 XSS를 막지 못합니다.', step: 4 },
    { q: '세션 쿠키에 HttpOnly를 붙였을 때의 효과로 옳은 것은?', c: ['XSS 자체가 완전히 불가능해진다', '스크립트가 document.cookie로 세션 쿠키를 읽지 못해 세션 번호 탈취는 어려워지지만, 이미 실행된 스크립트가 그 페이지에서 하는 다른 일은 막지 못한다', '쿠키가 암호화되어 서버만 내용을 볼 수 있다', '쿠키가 HTTPS 연결에서만 전송된다'], a: 1, why: 'HttpOnly는 JS에서 쿠키를 숨길 뿐입니다. 스크립트가 피해자 브라우저에서 같은 사이트로 요청을 보내는 것 등은 여전히 가능하므로, 이스케이프와 CSP가 먼저입니다. HTTPS 전용은 Secure 옵션입니다.', step: 5 },
  ],
  setup(a) {
    board(a, { label: '민지', icon: '🙂', color: 'blue' });
  },
  steps: [
    {
      t: '게시판 댓글 — 받은 글을 그대로 보여 준다',
      easy: '게시판에 댓글을 쓰면 서버가 저장해 두었다가, 다른 사람이 그 글을 열 때 화면에 함께 보여 줍니다. 서버는 받은 글자를 그대로 웹 페이지(HTML) 안에 끼워 넣어요.',
      deep: '서버는 템플릿에 DB의 댓글을 끼워 HTML 문서를 만들고, 브라우저는 그 문서 전체를 한 덩어리로 해석합니다. 브라우저 입장에서는 어디까지가 사이트가 쓴 마크업이고 어디부터가 사용자가 쓴 데이터인지 구분할 방법이 없습니다. 그래서 신뢰할 수 없는 데이터가 처리 없이 HTML에 들어가는 순간 "데이터가 코드가 되는" 인젝션이 가능해집니다.',
      async run(a) {
        wipe(a);
        board(a, { label: '민지', icon: '🙂', color: 'blue' });
        raw(a, 0, '서준: 저도 궁금했어요');
        shown(a, 0, '서준', '저도 궁금했어요');
        a.caption('댓글을 쓰면 서버가 저장했다가 다른 사람에게 보여 줘요');
        await a.send('w', 'srv', '좋은 글이네요!', { color: 'blue', dur: 850 });
        a.hl('srv');
        await a.flash('srv');
        await appear(a, raw(a, 1, '민지: 좋은 글이네요!', { hidden: true }));
        a.hl('srv', false);
        await a.wait(250);
        await a.send('vic', 'srv', 'GET /글/42', { color: 'teal', dur: 700 });
        await a.send('srv', 'vic', 'HTML(댓글 포함)', { color: 'green', dur: 800 });
        await appear(a, shown(a, 1, '민지', '좋은 글이네요!', { hidden: true }));
        a.note('n0', 360, 392, '서버는 받은 글자를 그대로 다른 사람의 화면(HTML)에 끼워 넣어요', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '저장형 XSS — 글 대신 스크립트를 저장',
      easy: '공격자가 댓글에 평범한 글 대신 <script>…</script> 같은 "명령 조각"을 써서 저장합니다. 이 글을 연 방문자의 브라우저는 그걸 글자로 보여 주는 게 아니라 명령으로 알아듣고 실행해 버려요.',
      deep: '저장형(Stored) XSS는 페이로드가 DB에 저장되어 그 페이지를 여는 모든 사용자에게 전달되므로 피해 범위가 가장 넓습니다. 게시판·프로필·리뷰·채팅처럼 남의 입력을 다시 보여 주는 곳이 대상입니다. 점검할 때는 alert(1) 같은 무해한 예로 실행 여부만 확인하며, "script라는 글자만 지우는" 필터는 다른 태그·속성 경로가 많아 방어가 되지 못합니다.',
      async run(a) {
        wipe(a);
        board(a, { label: '공격자', icon: '🦹', color: 'red' });
        raw(a, 0, '서준: 저도 궁금했어요');
        raw(a, 1, '민지: 좋은 글이네요!');
        shown(a, 0, '서준', '저도 궁금했어요');
        shown(a, 1, '민지', '좋은 글이네요!');
        a.caption('글 대신 스크립트 조각을 댓글로');
        await a.send('w', 'srv', '<script>…', { color: 'red', dur: 850 });
        a.hl('srv');
        await a.flash('srv');
        await appear(a, raw(a, 2, 'guest: <script>…</script>', { hidden: true, color: 'red' }));
        a.hl('srv', false);
        await a.wait(250);
        await a.send('vic', 'srv', 'GET /글/42', { color: 'teal', dur: 700 });
        await a.send('srv', 'vic', 'HTML(댓글 포함)', { color: 'green', dur: 800 });
        await appear(a, shown(a, 2, 'guest', '(빈칸처럼 보임)', { hidden: true, cls: 'muted' }));
        const x = chip(a, '⚙ 코드 실행!', 628, ROWY(2), 'red', { hidden: true });
        await a.show(x, 250);
        a.hl('vic', true, 'red');
        await a.flash('vic');
        a.note('n1', 360, 392, '브라우저는 <script>를 "글"이 아니라 "코드"로 읽고 실행해요 — 저장형 XSS', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '실행되면 — 그 사이트의 이름으로 무엇이든',
      easy: '심어진 스크립트는 "그 사이트가 보낸 코드"로 취급됩니다. 그래서 화면 내용을 바꾸거나, 진짜처럼 보이는 가짜 비밀번호 창을 띄우거나, 로그인 상태를 담은 쿠키를 공격자에게 몰래 보내려 할 수 있어요. 쿠키를 손에 넣으면 공격자가 방문자 행세를 할 수 있습니다.',
      deep: '스크립트는 피해 사이트의 출처(origin) 권한으로 실행되어 DOM을 읽고 고치고, 사용자 쿠키가 자동으로 붙는 같은 출처 요청을 보내고, localStorage의 토큰을 읽을 수 있습니다. 세션 쿠키에 HttpOnly가 없으면 document.cookie로 읽어 외부로 보낼 수 있고, 공격자는 그 세션 ID로 로그인 없이 접속합니다(세션 하이재킹). 즉 XSS 한 번은 "그 사용자가 그 사이트에서 할 수 있는 모든 일"로 이어질 수 있습니다.',
      async run(a) {
        wipe(a);
        win(a, 24, 40, 400, 300, 'board.example/글/42');
        a.node('evil', 590, 110, { label: 'bad.example', sub: '공격자 서버', icon: '🦹', color: 'red', w: 160, h: 76 });
        a.node('srvb', 590, 282, { label: '게시판 서버', icon: '🖥️', color: 'green', w: 150, h: 66 });
        a.edge('evil', 'srvb', { dashed: true, color: 'red' });
        a.caption('방문자 브라우저에서 스크립트가 실행되면…');
        // ① 화면 바꾸기
        const t1 = a.text(44, 86, '① 화면 내용 바꾸기', { size: 12, anchor: 'start', weight: 800, color: 'amber', hidden: true });
        const b1 = a.raw('rect', { x: 44, y: 100, width: 360, height: 32, rx: 6, style: 'fill: color-mix(in srgb, var(--red) 22%, var(--panel)); stroke: var(--red); opacity: 0' }, 'node');
        const b1t = a.text(224, 116, '⚠ 점검 중 — 아래에서 다시 로그인하세요', { size: 12.5, weight: 700, color: 'red', hidden: true, layer: 'node' });
        await appear(a, [t1, b1, b1t], 300);
        await a.wait(400);
        // ② 가짜 입력창
        const t2 = a.text(44, 154, '② 진짜처럼 보이는 가짜 입력창', { size: 12, anchor: 'start', weight: 800, color: 'amber', hidden: true });
        const box = a.raw('rect', { x: 44, y: 168, width: 360, height: 72, rx: 8, style: 'fill: var(--panel2); stroke: var(--line2); opacity: 0' }, 'node');
        const bt = a.text(60, 186, '보안을 위해 비밀번호를 다시 입력하세요', { size: 12, anchor: 'start', weight: 600, hidden: true, layer: 'node' });
        const inp = a.raw('rect', { x: 60, y: 202, width: 230, height: 26, rx: 5, style: 'fill: var(--panel); stroke: var(--line2); opacity: 0' }, 'node');
        const it = a.text(72, 215, '●●●●●●', { size: 12, anchor: 'start', cls: 'muted', hidden: true, layer: 'node' });
        const btn = chip(a, '확인', 342, 215, 'blue', { w: 70, h: 26, hidden: true, layer: 'node' });
        await appear(a, [t2, box, bt, inp, it, btn.g], 300);
        await a.wait(400);
        // ③ 쿠키 몰래 보내기
        const t3 = a.text(44, 264, '③ 쿠키(세션 번호) 몰래 보내기 시도', { size: 12, anchor: 'start', weight: 800, color: 'amber', hidden: true });
        await appear(a, t3, 250);
        const ck = chip(a, '🍪 sid=7f3a', 120, 300, 'amber');
        await a.wait(250);
        await a.move(ck, [[430, 300], [520, 140]], 1000);
        await a.fadeOut(ck, 200);
        a.text(60, 296, '🍪 sid=7f3a → bad.example 으로 전송', { size: 12, anchor: 'start', mono: true, weight: 700, color: 'red' });
        a.badge('evil', '🍪 7f3a', 'amber');
        a.hl('evil', true, 'red');
        await a.flash('evil');
        await a.send('evil', 'srvb', '🍪7f3a로 접속', { color: 'red', dur: 800 });
        a.hl('srvb', true, 'red');
        a.text(590, 332, '방문자로 인식 😱', { size: 12.5, weight: 800, color: 'red' });
        await a.flash('srvb');
        a.note('n2', 360, 392, '그 사이트의 코드로 취급돼서, 방문자가 그 사이트에서 할 수 있는 일은 다 할 수 있어요\n→ 쿠키를 빼앗기면 계정 탈취', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '반사형·DOM 기반 — 저장하지 않아도',
      easy: '꼭 서버에 저장해야만 되는 건 아닙니다. 공격자가 스크립트를 심은 링크를 메일이나 메신저로 보내고, 사이트가 링크 속 검색어를 그대로 화면에 되돌려 주면, 링크를 누른 사람의 브라우저에서 실행됩니다(반사형). 페이지 속 자바스크립트가 주소창 값을 바로 화면에 넣는 경우도 있어요(DOM 기반).',
      deep: '반사형(Reflected)은 요청 파라미터가 응답 HTML에 그대로 반영될 때 생기며, 피해자가 조작된 URL을 열어야 하므로 피싱과 함께 쓰입니다. DOM 기반은 location.search·location.hash 같은 입력(source)을 innerHTML·document.write·eval 같은 위험한 출력(sink)에 넘길 때 브라우저 안에서만 일어나며, # 뒤 값은 서버로 전송되지 않아 서버 쪽 필터·로그로는 보이지 않을 수 있습니다. 세 가지 모두 "신뢰할 수 없는 값이 코드 문맥에 들어간다"는 같은 뿌리입니다.',
      async run(a) {
        wipe(a);
        a.node('atk', 90, 84, { label: '공격자', icon: '🦹', color: 'red', w: 116, h: 66 });
        a.node('vic', 360, 84, { label: '방문자', icon: '👀', color: 'teal', w: 116, h: 66 });
        a.node('srv', 630, 84, { label: '사이트 서버', icon: '🖥️', color: 'green', w: 130, h: 66 });
        a.edge('atk', 'vic', {});
        a.edge('vic', 'srv', { both: true });
        a.caption('스크립트를 심은 링크를 보내면…');
        await a.send('atk', 'vic', '🔗 수상한 링크', { color: 'red', dur: 850 });
        const url = a.text(360, 140, 'board.example/search?q=<script>…', { size: 11.5, mono: true, weight: 700, color: 'red', hidden: true });
        await appear(a, url);
        await a.send('vic', 'srv', 'q=<script>…', { color: 'teal', dur: 800 });
        a.hl('srv');
        await a.send('srv', 'vic', '검색어 그대로', { color: 'green', dur: 800 });
        a.hl('srv', false);
        a.hl('vic', true, 'red');
        a.badge('vic', '실행!', 'red');
        await a.flash('vic');
        await a.wait(200);
        const C = [
          [24, '저장형', 'red', ['서버에 저장된 글이', '보는 사람마다 실행', '피해: 방문자 모두']],
          [252, '반사형', 'amber', ['링크 속 값을 서버가', '응답에 그대로 되돌림', '피해: 링크 누른 사람']],
          [480, 'DOM 기반', 'violet', ['페이지의 JS가 주소 값을', 'HTML로 바로 넣음', '서버를 안 거칠 수도']],
        ];
        for (const [x, t, c, lines] of C) {
          card(a, x, t, c, lines, { y: 186, h: 132 });
          await a.wait(350);
        }
        a.note('n3', 360, 392, '뿌리는 같아요: 믿을 수 없는 값이 "코드" 자리에 들어간다', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ① — 출력할 때 이스케이프',
      easy: '가장 중요한 방어는 화면에 내보낼 때 특별한 글자를 바꿔 주는 것입니다. < 를 &lt; 로 바꾸면 브라우저는 그것을 "태그의 시작"이 아니라 "작은 꺾쇠 글자"로 그려요. 같은 댓글이 이제 아무 일도 못 하고 글자로만 보입니다.',
      deep: 'OWASP 권장대로 출력 문맥별로 인코딩합니다: HTML 본문은 엔티티 인코딩, 속성 값은 따옴표로 감싸고 속성 인코딩, URL은 퍼센트 인코딩과 함께 http/https 같은 허용 스킴만 통과, JS 코드 안에는 신뢰할 수 없는 값을 직접 넣지 않습니다. React JSX·Vue 템플릿·Django/Jinja2 등은 기본으로 자동 이스케이프하므로 dangerouslySetInnerHTML·v-html·|safe 같은 탈출구를 쓸 때가 위험 지점입니다. 마크다운·리치 텍스트처럼 HTML을 꼭 허용해야 하면 직접 만든 정규식 대신 DOMPurify 같은 검증된 sanitizer를 씁니다.',
      async run(a) {
        wipe(a);
        a.node('esc', 360, 76, { label: '이스케이프', sub: '출력할 때', icon: '🛡️', color: 'violet', w: 140, h: 70 });
        chip(a, '<script>…</script>', 130, 76, 'red');
        a.text(130, 106, '저장된 댓글', { size: 11.5, weight: 700, cls: 'muted' });
        a.edge([210, 76], 'esc', {});
        a.edge('esc', [520, 76], {});
        const p = chip(a, '<script>…</script>', 130, 76, 'red');
        a.caption('내보내기 직전에 특별한 글자를 바꿔요');
        await a.wait(300);
        await a.move(p, 'esc', 700);
        await a.fadeOut(p, 150);
        await a.flash('esc');
        const q = chip(a, '&lt;script&gt;…', 360, 76, 'green');
        await a.move(q, [596, 76], 700);
        a.text(596, 106, '화면에 내보내는 값', { size: 11.5, weight: 700, cls: 'muted' });
        const MAP = ['< → &lt;', '> → &gt;', '& → &amp;', '" → &quot;', "' → &#x27;"];
        for (let i = 0; i < MAP.length; i++) {
          const c = chip(a, MAP[i], 96 + i * 132, 142, 'gray', { hidden: true, w: 104, size: 12 });
          await a.show(c, 160);
        }
        await a.wait(200);
        win(a, 24, 180, 330, 168, 'board.example/글/42');
        const R = [['서준', '저도 궁금했어요'], ['민지', '좋은 글이네요!']];
        R.forEach(([n, s], i) => { a.text(40, 222 + i * 30, n, { size: 12.5, anchor: 'start', weight: 800 }); a.text(88, 222 + i * 30, s, { size: 12.5, anchor: 'start', weight: 600 }); });
        a.text(40, 282, 'guest', { size: 12.5, anchor: 'start', weight: 800 });
        const lit = a.text(88, 282, '<script>…</script>', { size: 12.5, anchor: 'start', mono: true, weight: 600, cls: 'muted', hidden: true });
        await appear(a, lit, 300);
        const ok = a.text(189, 322, '글자로만 보여요 — 실행 안 됨 ✓', { size: 12.5, weight: 800, color: 'green', hidden: true });
        await appear(a, ok, 250);
        const TIP = [
          ['✓', '프레임워크 기본 이스케이프 그대로 쓰기', 'green'],
          ['✓', 'el.textContent = 댓글', 'green'],
          ['✕', 'el.innerHTML = 댓글', 'red'],
          ['✓', 'HTML 허용은 검증된 sanitizer로', 'green'],
        ];
        for (let i = 0; i < TIP.length; i++) {
          const [m, s, c] = TIP[i];
          const y = 202 + i * 32;
          a.text(384, y, m, { size: 15, weight: 800, color: c });
          a.text(402, y, s, { size: 12.5, anchor: 'start', weight: 700, mono: i === 1 || i === 2 });
          await a.wait(220);
        }
        a.text(536, 334, '문맥마다 규칙이 달라요: 본문·속성·URL·JS', { size: 11.5, weight: 700, cls: 'muted' });
        a.note('n4', 360, 396, '같은 댓글이 "코드"가 아니라 "글자"가 되면 끝 — 출력할 때 바꾸는 게 핵심', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ② — CSP와 HttpOnly 쿠키',
      easy: '혹시 한 군데를 놓쳐도 피해를 줄이는 장치를 더합니다. CSP는 "이 사이트가 허락한 스크립트만 실행해"라고 브라우저에 알려 주는 규칙이고, HttpOnly는 "이 쿠키는 스크립트가 못 읽게 해"라는 표시예요. 입력할 때 형식을 검사하는 것도 도움이 되지만, 그것만으로는 부족합니다.',
      deep: 'CSP는 nonce·hash 기반의 엄격한 정책(예: script-src \'nonce-…\' \'strict-dynamic\'; object-src \'none\'; base-uri \'none\')이 권장되며, 응답마다 새 nonce를 붙인 스크립트만 실행되고 끼워 넣은 인라인 스크립트는 차단됩니다. 먼저 Content-Security-Policy-Report-Only로 위반 보고를 받아 보며 적용하는 것이 일반적이고, CSP는 심층 방어일 뿐 이스케이프를 대신하지 않습니다. HttpOnly는 세션 ID 탈취를 막지만, 이미 실행된 스크립트가 피해자 브라우저에서 요청을 보내는 것은 막지 못합니다. 입력 검증은 숫자·이메일처럼 형식이 정해진 값에 허용 목록으로 적용하는 보조 수단입니다.',
      async run(a) {
        wipe(a);
        a.zone('za', 24, 36, 672, 160, { label: 'CSP — 허락한 스크립트만 실행', color: 'teal' });
        a.text(360, 68, "Content-Security-Policy: script-src 'nonce-k3Q9'", { size: 12, mono: true, weight: 700 });
        a.caption('서버가 응답 헤더로 규칙을 알려 줘요');
        const s1 = chip(a, '<script nonce=k3Q9>', 90, 112, 'green');
        await a.move(s1, [210, 112], 600);
        a.text(330, 112, '✓ 실행 — 서버가 준 nonce와 일치', { size: 12.5, anchor: 'start', weight: 800, color: 'green' });
        await a.wait(300);
        const s2 = chip(a, '<script>…</script>', 90, 160, 'red');
        await a.move(s2, [210, 160], 600);
        a.text(330, 160, '✕ 차단 — 몰래 끼워 넣은 코드', { size: 12.5, anchor: 'start', weight: 800, color: 'red' });
        await a.wait(400);
        a.zone('zb', 24, 212, 672, 132, { label: 'HttpOnly 쿠키 — 스크립트가 쿠키를 못 읽음', color: 'violet' });
        a.text(360, 244, 'Set-Cookie: sid=7f3a; HttpOnly; Secure; SameSite=Lax', { size: 12, mono: true, weight: 700 });
        const s3 = chip(a, 'document.cookie', 90, 284, 'amber');
        await a.move(s3, [210, 284], 600);
        a.text(330, 284, '→ "" (sid가 안 보여요)', { size: 12.5, anchor: 'start', weight: 800, color: 'green' });
        a.text(360, 320, '단, 이미 실행된 스크립트가 그 페이지에서 하는 다른 일은 못 막아요', { size: 11.5, weight: 700, cls: 'muted' });
        await a.wait(400);
        a.note('n5', 360, 394, '입력 검증은 보조: 형식 검사(숫자·이메일)로 줄이되\n출력 이스케이프를 대신하지는 못해요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '체크리스트 — 개발자와 사용자',
      easy: '개발자는 "출력할 때 이스케이프"를 기본으로 지키고 CSP·HttpOnly로 한 겹 더 막습니다. 사용자는 브라우저를 최신으로 두고, 수상한 링크와 갑자기 뜨는 로그인 창을 의심하면 됩니다. 허가받지 않은 사이트에 이런 공격을 시험해 보는 것은 불법이에요.',
      deep: '코드 리뷰에서 innerHTML·document.write·eval·dangerouslySetInnerHTML·v-html·|safe 같은 위험 지점을 찾아보고, 정적·동적 보안 점검(SAST/DAST)과 의존성 업데이트를 꾸준히 합니다. 지원하는 브라우저에서는 Trusted Types로 DOM 기반 XSS가 생기는 위험한 API 사용 자체를 강제로 막을 수 있습니다. 연습은 자기 컴퓨터나 OWASP Juice Shop처럼 일부러 취약하게 만든 실습 환경에서만 합니다.',
      async run(a) {
        wipe(a);
        a.zone('dev', 24, 34, 420, 296, { label: '개발자', color: 'blue' });
        a.zone('usr', 460, 34, 236, 296, { label: '사용자', color: 'green' });
        const DEV = [
          '출력할 때 문맥에 맞게 이스케이프',
          '프레임워크 자동 이스케이프 끄지 않기',
          'innerHTML 대신 textContent',
          'HTML 허용은 검증된 sanitizer로',
          'CSP(nonce 기반) 적용',
          '세션 쿠키는 HttpOnly · Secure',
          '입력 검증은 보조로 함께',
        ];
        const USR = ['브라우저 최신으로 유지', '수상한 링크 열지 않기', '갑자기 뜬 로그인 창 의심', '다 쓰면 로그아웃'];
        for (let i = 0; i < Math.max(DEV.length, USR.length); i++) {
          const y = 76 + i * 38;
          if (DEV[i]) { a.text(48, y, '✓', { size: 15, weight: 800, color: 'blue' }); a.text(66, y, DEV[i], { size: 13, anchor: 'start', weight: 700 }); }
          if (USR[i]) { a.text(484, y, '✓', { size: 15, weight: 800, color: 'green' }); a.text(502, y, USR[i], { size: 13, anchor: 'start', weight: 700 }); }
          await a.wait(240);
        }
        a.note('n6', 360, 394, '⚖ 허가받지 않은 사이트에 시험해 보는 것은 불법 — 연습은 내 컴퓨터·실습 환경에서', { color: 'gray' });
        await a.wait(700);
      },
    },
  ],
};

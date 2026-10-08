// HTTP 요청과 응답: 메시지 구조, 메서드, 상태 코드, 무상태성
const CL = [140, 70], SV = [580, 70];  // 메시지가 오가는 길(위쪽)
const LX = 170, CW = 7.8;              // 패널 글자 시작 x, 고정폭 글자 너비(13px)
const ly = (i) => 162 + i * 24;
const cx = (from, len) => LX + (from + len / 2) * CW;  // 글자 범위의 가운데 x

function panel(a, title, color = 'blue') {
  a.clear();
  a.text(166, 132, title, { id: 'ptitle', size: 12.5, weight: 800, anchor: 'start', color });
}
/** 패널에 한 줄 쓰기. type=true면 타자 치듯 */
async function ln(a, i, s, o = {}) {
  const t = a.text(o.x ?? LX, ly(i), o.type ? '' : s, { id: o.id, size: 13, anchor: 'start', mono: true, color: o.color, cls: o.muted ? 'muted' : '' });
  if (o.ann) a.text(556, ly(i), o.ann, { size: 11, anchor: 'end', cls: 'muted' });
  if (o.type) await a.tween(Math.max(250, s.length * 28), (k) => (t.textContent = s.slice(0, Math.round(k * s.length))), { linear: true });
  return t;
}
/** 첫 줄 아래 작은 이름표들 */
function tags(a, i, list) {
  for (const [x, s, c] of list) a.text(x, ly(i) + 18, s, { size: 10.5, weight: 700, color: c });
}
const req = (a, l, c = 'blue', dur = 900) => a.send(CL, SV, l, { color: c, dur });
const res = (a, l, c = 'green', dur = 900) => a.send(SV, CL, l, { color: c, dur });

export default {
  id: 'http',
  level: 2,
  cat: '웹',
  title: 'HTTP 요청과 응답 — 웹의 대화법',
  sub: '브라우저와 서버는 정해진 형식의 글(메시지)을 주고받으며 대화한다.',
  analogy: 'HTTP는 식당 주문서와 영수증 양식입니다. 주문서(요청)에는 "무엇을 할지(메서드)·어떤 메뉴(경로)·요청 사항(헤더)·자세한 내용(본문)"을 적고, 주방은 "결과 코드(200 성공, 404 없음…)"가 적힌 영수증(응답)과 함께 음식을 내줍니다. 다만 이 식당은 손님 얼굴을 기억하지 못합니다.',
  keys: [
    '요청 = 요청 줄(메서드·경로·버전) + 헤더 + 빈 줄 + 본문(선택).',
    '메서드는 하고 싶은 동작이다: GET 조회, POST 생성, PUT 수정(교체), DELETE 삭제.',
    '응답 = 상태 줄(버전·상태 코드·이유) + 헤더 + 빈 줄 + 본문.',
    '상태 코드: 2xx 성공, 3xx 다른 곳으로, 4xx 요청 쪽 잘못, 5xx 서버 쪽 잘못.',
    'HTTP는 무상태(stateless)다. 서버는 이전 요청을 기억하지 않으므로 쿠키·토큰으로 매번 누구인지 알려야 한다.',
  ],
  terms: [
    ['메서드', '요청의 동작 종류. GET, POST, PUT, PATCH, DELETE 등'],
    ['경로', '서버 안에서 원하는 자원의 위치. 예: /orders/42'],
    ['헤더', '이름: 값 형태의 부가 정보. Host, Content-Type, Cookie 등'],
    ['본문(Body)', '실제로 보내는 데이터. POST·PUT 요청이나 응답의 HTML·JSON'],
    ['상태 코드', '요청 결과를 나타내는 세 자리 숫자. 200, 301, 404, 500 등'],
    ['무상태', '서버가 요청 사이의 상태를 기억하지 않는 성질. 요청마다 필요한 정보를 다 담아야 한다'],
  ],
  quiz: [
    { q: '없는 페이지를 요청했을 때 받는 404는 무엇을 뜻할까요?', c: ['서버 프로그램이 고장 났다', '요청이 성공했다', '요청한 쪽의 잘못 — 그런 페이지가 없다', '페이지가 다른 주소로 이사했다'], a: 2, why: '4로 시작하는 코드는 요청 쪽 문제입니다. 서버 고장은 5xx(예: 500), 이사는 3xx(301·302), 성공은 2xx입니다.', step: 6 },
    { q: 'HTTP는 무상태(stateless)인데 로그인 상태가 계속 유지되는 이유는?', c: ['서버가 TCP 연결마다 사용자를 기억해 두어서', '브라우저가 쿠키(또는 토큰)를 요청마다 함께 보내서', '같은 IP에서 온 요청은 같은 사용자로 보아서', 'HTTP/1.1부터 서버가 이전 요청을 기억하게 되어서'], a: 1, why: '서버는 요청 사이를 기억하지 않으므로, 브라우저가 Set-Cookie로 받은 세션 ID나 토큰을 요청마다 보내 누구인지 알려 줍니다.', step: 7 },
    { q: '여러 번 보내면 결과가 달라질 수 있어(멱등이 아님) 재시도할 때 중복을 조심해야 하는 메서드는?', c: ['GET', 'PUT', 'DELETE', 'POST'], a: 3, why: 'GET·PUT·DELETE는 멱등이지만 POST는 아닙니다. 그래서 주문 같은 POST는 Idempotency-Key 등으로 중복 처리를 막습니다.', step: 2 },
  ],
  setup(a) {
    a.node('cli', 76, 70, { label: '브라우저', icon: '💻', color: 'blue', w: 110, h: 64 });
    a.node('srv', 644, 70, { label: '서버', icon: '🖥️', color: 'green', w: 110, h: 64 });
    a.edge('cli', 'srv', { dashed: true, arrow: false });
    a.raw('rect', { x: 150, y: 112, width: 420, height: 312, rx: 12, style: 'fill: var(--panel); stroke: var(--line2); stroke-width: 1.5; stroke-dasharray: none' }, 'zone');
    a.node('jar', 76, 176, { label: '쿠키 보관함', sub: '비어 있음', icon: '🍪', color: 'amber', w: 116, h: 64, hidden: true });
    a.node('mem', 644, 176, { label: '서버 기억', sub: '비어 있음', icon: '🧠', color: 'violet', w: 116, h: 64, hidden: true });
  },
  steps: [
    {
      t: '요청 줄 — 무엇을, 어디에',
      easy: 'HTTP 요청은 정해진 형식의 짧은 글입니다. 첫 줄에 "무엇을 할지(POST = 새로 만들기)", "어디에(/orders = 주문 목록)", "어떤 규칙 버전으로(HTTP/1.1)"를 씁니다.',
      deep: '요청 줄은 Method SP Request-Target SP HTTP-Version CRLF 형식입니다. HTTP/1.x는 사람이 읽을 수 있는 텍스트지만, HTTP/2·3는 같은 의미를 바이너리 프레임과 :method·:path 의사 헤더로 보냅니다.',
      async run(a) {
        panel(a, '요청 메시지 (주문서)', 'blue');
        a.hl('cli');
        await ln(a, 0, 'POST /orders HTTP/1.1', { type: true, color: 'blue', ann: '← 요청 줄' });
        tags(a, 0, [[cx(0, 4), '메서드', 'amber'], [cx(5, 7), '경로', 'teal'], [cx(13, 8), '버전', 'gray']]);
        a.hl('cli', false);
        await a.wait(600);
      },
    },
    {
      t: '헤더와 본문 — 부가 정보와 내용물',
      easy: '이어서 "이름: 값" 형식으로 부가 정보(헤더)를 적습니다. 어느 사이트인지, 보내는 내용이 어떤 형식인지 등이죠. 빈 줄 하나로 헤더가 끝났음을 알리고, 그 아래에 실제 내용(본문)을 씁니다.',
      deep: 'Host는 HTTP/1.1에서 필수 헤더라 한 IP에서 여러 사이트를 구분할 수 있습니다(가상 호스트). Content-Type과 Content-Length(또는 Transfer-Encoding: chunked)로 본문 형식과 길이를 알립니다. GET 요청은 보통 본문이 없습니다.',
      async run(a) {
        await ln(a, 2, 'Host: shop.example.com', { type: true });
        await ln(a, 3, 'Content-Type: application/json', { type: true, ann: '← 헤더' });
        await ln(a, 4, 'Content-Length: 24', { type: true });
        await ln(a, 5, 'User-Agent: Chrome/129', { type: true });
        await ln(a, 6, '(빈 줄)', { muted: true, ann: '← 헤더 끝' });
        await ln(a, 7, '{"menu":"pasta","qty":2}', { type: true, color: 'pink', ann: '← 본문' });
        a.caption('주문서 완성 → 서버로!');
        await req(a, 'POST /orders', 'blue', 1000);
        a.hl('srv');
        await a.flash('srv');
        a.hl('srv', false);
      },
    },
    {
      t: '메서드 — 하고 싶은 동작',
      easy: '첫 단어(메서드)는 "무엇을 하고 싶은지"입니다. GET은 보기, POST는 새로 만들기, PUT은 고치기(통째로 바꾸기), DELETE는 지우기예요.',
      deep: 'GET·HEAD는 안전(서버 상태를 바꾸지 않음)하고, GET·PUT·DELETE는 멱등(여러 번 보내도 결과가 같음)입니다. POST는 멱등이 아니라 재시도 시 중복 주문이 생길 수 있어 Idempotency-Key 같은 기법을 씁니다. 부분 수정은 PATCH를 씁니다.',
      async run(a) {
        panel(a, '메서드 = 하고 싶은 동작', 'amber');
        const rows = [
          ['GET', '/orders/42', '보기 (조회)', 'blue', '200 OK'],
          ['POST', '/orders', '만들기 (생성)', 'green', '201 Created'],
          ['PUT', '/orders/42', '고치기 (교체)', 'amber', '200 OK'],
          ['DELETE', '/orders/42', '지우기 (삭제)', 'red', '204 No Content'],
        ];
        for (let i = 0; i < rows.length; i++) {
          const [m, path, mean, c, code] = rows[i];
          const y = 176 + i * 58;
          a.packet(m, { at: [214, y], color: c, w: 76, round: 6 });
          a.text(262, y, path, { size: 13, anchor: 'start', mono: true });
          a.text(552, y, mean, { size: 13, anchor: 'end', weight: 700, color: c });
          await req(a, m + ' ' + path, c, 650);
          await res(a, code, 'gray', 550);
        }
      },
    },
    {
      t: '응답 메시지 — 상태 줄, 헤더, 본문',
      easy: '서버는 같은 형식으로 답장을 씁니다. 첫 줄에 결과 번호(201 = 잘 만들었어요)를 쓰고, 헤더에 부가 정보, 본문에 결과 내용을 담아 보냅니다.',
      deep: '상태 줄은 HTTP-Version SP Status-Code SP Reason-Phrase입니다. 201 Created는 새 자원의 위치를 Location 헤더로 알려 주는 것이 관례입니다. 응답에는 Cache-Control, Set-Cookie, Content-Encoding 같은 헤더도 자주 붙습니다.',
      async run(a) {
        panel(a, '응답 메시지 (영수증)', 'green');
        a.hl('srv');
        await ln(a, 0, 'HTTP/1.1 201 Created', { type: true, color: 'green', ann: '← 상태 줄' });
        tags(a, 0, [[cx(0, 8), '버전', 'gray'], [cx(9, 3), '상태 코드', 'amber'], [cx(13, 7), '이유', 'teal']]);
        await ln(a, 2, 'Content-Type: application/json', { type: true });
        await ln(a, 3, 'Location: /orders/42', { type: true, ann: '← 헤더' });
        await ln(a, 4, '(빈 줄)', { muted: true });
        await ln(a, 5, '{"id":42,"status":"received"}', { type: true, color: 'pink', ann: '← 본문' });
        a.hl('srv', false);
        await res(a, '201 Created', 'green', 1000);
        a.badge('cli', '주문 #42', 'green');
        await a.flash('cli');
      },
    },
    {
      t: '상태 코드 — 첫 숫자만 봐도 안다',
      easy: '결과 번호는 첫 숫자만 봐도 뜻을 압니다. 2로 시작하면 성공, 3은 "다른 곳으로 가세요", 4는 "요청하신 쪽이 잘못했어요", 5는 "서버에 문제가 생겼어요"입니다.',
      deep: '1xx는 정보(100 Continue, 101 Switching Protocols). 304 Not Modified는 캐시 재검증 응답으로 본문이 없습니다. 401은 인증 필요, 403은 권한 없음, 429는 요청 과다, 502·503·504는 게이트웨이·과부하·타임아웃 계열입니다.',
      async run(a) {
        a.badge('cli', null);
        panel(a, '상태 코드 가족', 'violet');
        const fam = [
          ['2xx', '성공', '200 OK · 201 Created', 'green'],
          ['3xx', '다른 곳으로', '301 · 302 · 304', 'blue'],
          ['4xx', '요청 쪽 잘못', '400 · 401 · 403 · 404', 'amber'],
          ['5xx', '서버 쪽 잘못', '500 · 502 · 503', 'red'],
        ];
        for (let i = 0; i < fam.length; i++) {
          const [k, mean, ex, c] = fam[i];
          const y = 176 + i * 60;
          const p = a.packet(k, { at: [212, y], color: c, w: 64, h: 32, round: 8, size: 14 });
          p.g.style.opacity = 0;
          await a.fade(p, 1, 250);
          a.text(262, y - 9, mean, { size: 14, weight: 800, anchor: 'start', color: c });
          a.text(262, y + 11, ex, { size: 12, anchor: 'start', mono: true, cls: 'muted' });
          await a.wait(350);
        }
        await a.wait(500);
      },
    },
    {
      t: '3xx 리다이렉트 — "저쪽으로 가세요"',
      easy: '옛 주소로 요청하면 서버가 "그 페이지는 이사 갔어요, 새 주소는 여기예요"라고 답합니다. 브라우저는 알아서 새 주소로 다시 요청해요. 사용자는 거의 눈치채지 못합니다.',
      deep: '301(영구)/308은 검색엔진이 새 URL로 색인을 옮기고, 302/307은 임시 이동입니다. 브라우저는 Location 헤더를 따라 자동으로 재요청합니다. 307/308은 원래 메서드와 본문을 유지해야 하고, 301/302는 역사적으로 POST가 GET으로 바뀔 수 있습니다.',
      async run(a) {
        panel(a, '리다이렉트', 'blue');
        await ln(a, 0, 'GET /old-menu', { color: 'blue', ann: '① 옛 주소 요청' });
        await req(a, 'GET /old-menu', 'blue', 800);
        await ln(a, 1, 'HTTP/1.1 301 Moved Permanently', { color: 'blue' });
        await ln(a, 2, 'Location: /new-menu', { color: 'amber', ann: '② 새 주소 알림' });
        await res(a, '301 → /new-menu', 'blue', 800);
        a.badge('cli', '자동으로 다시!', 'amber');
        await a.flash('cli');
        await ln(a, 4, 'GET /new-menu', { color: 'blue', ann: '③ 새 주소로 재요청' });
        await req(a, 'GET /new-menu', 'blue', 800);
        await ln(a, 5, 'HTTP/1.1 200 OK', { color: 'green', ann: '④ 성공' });
        await res(a, '200 OK', 'green', 800);
        a.badge('cli', '/new-menu', 'green');
      },
    },
    {
      t: '4xx·5xx — 누구의 잘못일까',
      easy: '없는 페이지를 달라고 하면 404(그런 거 없어요) — 요청한 쪽의 실수입니다. 반대로 요청은 멀쩡한데 서버 프로그램이 고장 나면 500(서버 내부 오류) — 서버 쪽 문제예요.',
      deep: '4xx는 같은 요청을 그대로 다시 보내도 대개 실패하므로 요청을 고쳐야 하고, 5xx는 일시적일 수 있어 지수 백오프로 재시도하는 것이 일반적입니다. 500은 처리 중 예외, 502는 프록시 뒤 서버의 잘못된 응답, 503은 과부하·점검 중을 뜻합니다.',
      async run(a) {
        a.badge('cli', null);
        panel(a, '오류 응답', 'red');
        await ln(a, 0, 'GET /menu/999', { color: 'blue' });
        await req(a, 'GET /menu/999', 'blue', 800);
        a.badge('srv', '그런 메뉴 없음', 'amber');
        await ln(a, 1, 'HTTP/1.1 404 Not Found', { color: 'amber', ann: '← 요청 쪽 잘못' });
        await res(a, '404 Not Found', 'amber', 800);
        a.badge('srv', null);
        await ln(a, 3, 'GET /menu', { color: 'blue' });
        await req(a, 'GET /menu', 'blue', 800);
        a.hl('srv', true, 'red');
        a.setNode('srv', { color: 'red' });
        a.badge('srv', '💥 버그', 'red');
        await a.flash('srv', 2);
        await ln(a, 4, 'HTTP/1.1 500 Internal Server Error', { color: 'red', ann: '← 서버 쪽 잘못' });
        await res(a, '500 Error', 'red', 800);
        a.hl('srv', false);
        a.setNode('srv', { color: 'green' });
        a.badge('srv', null);
      },
    },
    {
      t: '무상태 — 서버는 기억하지 않는다',
      easy: 'HTTP 서버는 금붕어 같아요. 방금 "나 철수야"라고 로그인해도, 다음 요청에서는 누구인지 잊어버립니다. 그래서 브라우저는 입장권(쿠키)을 받아 두었다가 요청할 때마다 함께 보여 줍니다.',
      deep: '각 요청은 독립적이고, 서버는 요청 사이에 연결 상태를 기억하지 않습니다. 덕분에 아무 서버나 요청을 처리할 수 있어 수평 확장이 쉽습니다. 로그인 상태는 Set-Cookie로 준 세션 ID나 Authorization 헤더의 토큰(JWT 등)을 요청마다 보내 유지합니다.',
      async run(a) {
        panel(a, '무상태 (Stateless)', 'violet');
        await a.par(a.show('jar'), a.show('mem'));
        await ln(a, 0, '① POST /login  (철수)', { color: 'blue' });
        await req(a, '로그인: 철수', 'blue', 800);
        a.setNode('mem', { sub: '철수 ✓' });
        await a.flash('mem');
        await res(a, '200 반가워요', 'green', 700);
        await ln(a, 1, '→ 200 OK', { x: LX + 22, color: 'green' });
        a.caption('응답을 보내고 나면… 잊어버림');
        a.setNode('mem', { sub: '비어 있음' });
        await a.flash('mem');
        await ln(a, 3, '② GET /cart', { color: 'blue' });
        await req(a, 'GET /cart', 'blue', 700);
        await res(a, '401 누구세요?', 'amber', 700);
        await ln(a, 4, '→ 401 Unauthorized', { x: LX + 22, color: 'amber', ann: '누군지 모름' });
        a.caption('그래서 로그인 때 받은 입장권(쿠키)을 매번 함께 보내요');
        a.setNode('jar', { sub: 'sid=a1b2' });
        a.badge('jar', '입장권', 'amber');
        await ln(a, 6, '③ GET /cart', { color: 'blue' });
        await ln(a, 7, 'Cookie: sid=a1b2', { x: LX + 22, color: 'amber', ann: '매번 증명!' });
        await req(a, 'GET /cart + 🍪', 'amber', 800);
        await res(a, '200 철수님 것', 'green', 700);
        await ln(a, 8, '→ 200 OK', { x: LX + 22, color: 'green' });
      },
    },
  ],
};

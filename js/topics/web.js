// 주소창에 엔터를 치고 웹페이지가 화면에 그려지기까지의 전체 여정
const B = [258, 220];            // 브라우저 창 오른쪽 출구
const URL = 'https://shop.example.com/menu';
const SRC = ['<html>', '<link href="style.css">', '<h1>오늘의 메뉴</h1>', '<img src="photo.jpg">', '<script src="app.js">'];

function status(a, s) { a.setText('status', s); }

/** 브라우저 안 작은 사각형 */
function box(a, x, y, w, h, style, layer = 'pkt') {
  return a.raw('rect', { x, y, width: w, height: h, rx: 4, style }, layer);
}

export default {
  id: 'web',
  level: 1,
  cat: '웹',
  title: '주소창에 엔터를 치면 — 웹페이지가 열리기까지',
  sub: '주소를 치고 엔터를 누른 뒤 1초 남짓 동안 벌어지는 일을 따라가 봅니다.',
  analogy: '식당에 음식을 주문하는 것과 비슷합니다. 가게 이름으로 주소를 찾고(DNS), 가게 문을 열고 들어가(연결), 메뉴를 주문하면(요청), 주방이 창고에서 재료를 꺼내 요리하고(서버·DB), 음식이 나오면(응답) 접시에 예쁘게 담아(렌더링) 먹습니다.',
  keys: [
    '브라우저는 주소(URL)를 프로토콜·도메인·경로로 나눠 읽는다.',
    'DNS로 도메인을 IP 주소로 바꾼 뒤, TCP와 TLS로 서버와 안전한 연결을 맺는다.',
    'HTTP 요청을 받은 서버는 필요하면 DB를 조회해 HTML을 만들어 응답한다.',
    '브라우저는 HTML을 읽다가 CSS·JS·이미지가 필요하면 추가로 요청한다.',
    'HTML로 DOM을 만들고, 위치·크기를 계산(레이아웃)한 뒤 픽셀을 칠해(페인트) 화면에 보여 준다.',
  ],
  terms: [
    ['URL', '인터넷 자원의 주소. https://도메인/경로 형태'],
    ['DNS', '도메인 이름을 IP 주소로 바꿔 주는 인터넷 전화번호부'],
    ['TCP / TLS', 'TCP는 믿을 수 있는 연결, TLS는 그 연결을 암호화하는 자물쇠(https의 s)'],
    ['HTTP', '브라우저와 서버가 요청·응답을 주고받는 약속(프로토콜)'],
    ['HTML', '웹페이지의 뼈대(제목, 문단, 이미지 위치 등)를 적은 문서'],
    ['DOM', '브라우저가 HTML을 읽어 만든 나무 모양의 구조. JS로 바꿀 수 있다'],
    ['렌더링', 'DOM·CSS를 바탕으로 화면에 픽셀을 그려 내는 과정'],
  ],
  quiz: [
    { q: '주소창에 엔터를 친 뒤 "DNS 조회" 단계에서 하는 일은?', c: ['서버와 주고받을 내용을 암호화한다', '웹페이지를 화면에 그린다', '도메인 이름(shop.example.com)을 숫자 주소(IP)로 바꾼다', '서버가 DB에서 메뉴를 꺼내 HTML을 만든다'], a: 2, why: '컴퓨터는 이름이 아니라 IP 주소로 찾아가므로, 먼저 DNS라는 전화번호부에서 도메인의 IP를 알아냅니다.', step: 1 },
    { q: '브라우저가 받은 HTML을 화면에 보여 주는 순서로 옳은 것은?', c: ['페인트 → 레이아웃 → DOM 만들기', 'DOM 만들기 → 레이아웃 → 페인트', '레이아웃 → DOM 만들기 → 페인트', 'DOM 만들기 → 페인트 → 레이아웃'], a: 1, why: '먼저 HTML로 DOM(나무 구조)을 만들고, 각 요소의 위치·크기를 계산(레이아웃)한 뒤, 색과 글자를 칠합니다(페인트).', step: 7 },
    { q: 'HTML을 읽다가 defer나 async가 없는 <script>를 만나면 브라우저는 어떻게 할까요?', c: ['페이지를 다 그린 뒤에야 스크립트를 내려받는다', '스크립트를 병렬로 받으면서 HTML 파싱은 그대로 계속한다', 'CSS가 모두 도착할 때까지 그 스크립트를 건너뛴다', 'HTML 파싱을 멈추고 스크립트를 받아 실행한 뒤 이어서 파싱한다'], a: 3, why: '일반 <script>는 파서를 막습니다(parser-blocking). 파싱을 멈추지 않으려면 defer나 async를 붙입니다.', step: 6 },
  ],
  setup(a) {
    // 브라우저 창
    a.raw('rect', { x: 16, y: 24, width: 240, height: 400, rx: 14, style: 'fill: var(--panel); stroke: var(--line2); stroke-width: 2; stroke-dasharray: none' }, 'zone');
    a.raw('rect', { x: 28, y: 36, width: 216, height: 26, rx: 13, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1; stroke-dasharray: none' }, 'zone');
    a.text(40, 49, '', { id: 'url', size: 10.5, anchor: 'start', mono: true, layer: 'edge' });
    a.text(136, 408, '빈 페이지', { id: 'status', size: 11, cls: 'muted', layer: 'edge' });
    a.node('net', 420, 220, { label: '인터넷', icon: '🌐', color: 'gray', shape: 'circle', w: 78 });
    a.node('dns', 596, 70, { label: 'DNS 서버', sub: '이름 → IP', icon: '📒', color: 'violet', w: 136, h: 62 });
    a.node('web', 596, 220, { label: '웹 서버', sub: 'shop.example.com', icon: '🖥️', color: 'green', w: 144, h: 70 });
    a.node('db', 596, 368, { label: 'DB', sub: '메뉴 데이터', icon: '🗄️', color: 'amber', shape: 'db', w: 132, h: 74 });
    a.edge(B, 'net', { arrow: false });
    a.edge('net', 'dns', { dashed: true, arrow: false });
    a.edge('net', 'web', { id: 'e-web', dashed: true, arrow: false });
    a.edge('web', 'db', { both: true });
  },
  steps: [
    {
      t: 'URL 해석 — 주소를 읽어 보기',
      easy: '주소창에 주소를 치고 엔터! 브라우저는 먼저 주소를 세 조각으로 나눠 읽습니다. "어떤 방식으로(https)", "어느 가게에(shop.example.com)", "무슨 페이지를(/menu)".',
      deep: 'URL은 scheme://host:port/path?query#fragment 구조입니다. https면 기본 포트 443을 씁니다. 검색어처럼 URL이 아니면 기본 검색엔진으로 보내고, HSTS 목록에 있는 도메인은 http로 쳐도 https로 바꿔 접속합니다.',
      async run(a) {
        a.caption('주소 입력 중…');
        await a.tween(1200, (t) => a.setText('url', URL.slice(0, Math.round(t * URL.length))), { linear: true });
        status(a, '엔터!');
        a.note('n-proto', 136, 110, 'https → 안전한 방식으로', { color: 'blue', w: 206 });
        await a.wait(350);
        a.note('n-host', 136, 152, 'shop.example.com → 가게 이름', { color: 'green', w: 206 });
        await a.wait(350);
        a.note('n-path', 136, 194, '/menu → 보고 싶은 페이지', { color: 'amber', w: 206 });
        await a.wait(700);
      },
    },
    {
      t: 'DNS 조회 — 가게 이름으로 주소 찾기',
      easy: '컴퓨터는 이름이 아니라 숫자 주소(IP)로 찾아갑니다. 그래서 DNS라는 전화번호부에 "shop.example.com 번호가 뭐야?" 하고 물어봐요. (자세한 과정은 DNS 주제에서!)',
      deep: '브라우저·OS 캐시를 먼저 보고, 없으면 재귀 리졸버에 질의합니다(보통 UDP 53, 또는 DoH). 결과 A/AAAA 레코드는 TTL 동안 캐시됩니다. 첫 방문의 DNS 조회는 수십~수백 ms가 걸릴 수 있습니다.',
      async run(a) {
        a.clear();
        status(a, 'DNS 조회 중…');
        await a.send(B, 'dns', '이 이름 IP는?', { via: ['net'], color: 'blue', dur: 1000 });
        a.hl('dns');
        await a.flash('dns');
        await a.send('dns', B, '203.0.113.7', { via: ['net'], color: 'violet', dur: 1000 });
        a.badge('dns', '203.0.113.7', 'violet');
        a.hl('dns', false);
        a.note('n-ip', 136, 130, 'shop.example.com\n= 203.0.113.7', { color: 'violet', w: 190 });
        await a.wait(500);
      },
    },
    {
      t: 'TCP·TLS 연결 — 길을 트고 자물쇠 채우기',
      easy: '주소를 알았으니 서버에 "연결해도 될까요?" 하고 인사를 주고받아 길을 틉니다(TCP). 이어서 남이 엿보지 못하게 암호 열쇠를 나눠 갖습니다(TLS). 주소창의 자물쇠 🔒가 이것이에요.',
      deep: 'TCP 3-way handshake(SYN → SYN-ACK → ACK)로 1 RTT, TLS 1.3 핸드셰이크(ClientHello → ServerHello+인증서+Finished)로 1 RTT가 더 듭니다. 브라우저는 서버 인증서가 도메인과 맞는지, 믿을 수 있는 CA가 서명했는지 검증합니다.',
      async run(a) {
        a.clear();
        status(a, '연결 중…');
        const go = (l, c) => a.send(B, 'web', l, { via: ['net'], color: c, dur: 650 });
        const back = (l, c) => a.send('web', B, l, { via: ['net'], color: c, dur: 650 });
        a.caption('TCP: 연결 인사');
        await go('SYN', 'gray');
        await back('SYN-ACK', 'gray');
        await go('ACK', 'gray');
        a.caption('TLS: 암호 열쇠 나누기');
        await go('ClientHello', 'teal');
        await back('인증서 + 열쇠', 'teal');
        a.hl('e-web');
        a.badge('web', '🔒 연결됨', 'teal');
        a.setText('url', '🔒 ' + URL.replace('https://', ''));
        status(a, '안전하게 연결됨');
        await a.wait(400);
      },
    },
    {
      t: 'HTTP 요청 — "메뉴 페이지 주세요"',
      easy: '이제 연결된 길로 진짜 주문서를 보냅니다. "GET /menu" — 메뉴 페이지를 달라는 뜻이에요. 주문서에는 내가 쓰는 브라우저 종류, 받을 수 있는 언어 같은 정보도 함께 적혀 있습니다.',
      deep: '요청 라인(GET /menu HTTP/1.1 또는 HTTP/2의 :method/:path 의사 헤더)과 Host, User-Agent, Accept, Accept-Language, Cookie 같은 헤더가 TLS로 암호화되어 전송됩니다.',
      async run(a) {
        a.clear();
        status(a, '요청 보냄…');
        a.note('n-req', 136, 140, 'GET /menu\nHost: shop.example.com\nAccept: text/html', { color: 'blue', w: 206 });
        await a.wait(500);
        await a.send(B, 'web', 'GET /menu', { via: ['net'], color: 'blue', dur: 1100 });
        a.hl('web');
        await a.flash('web');
        await a.wait(300);
      },
    },
    {
      t: '서버가 HTML을 만든다 — DB 조회',
      easy: '주문을 받은 서버는 주방장처럼 일합니다. 오늘의 메뉴를 창고(DB)에서 꺼내 와서, 그 내용을 채워 넣은 HTML 문서를 만들어요.',
      deep: '웹 서버(Nginx 등)가 요청을 애플리케이션 서버(Node, Spring, Django…)로 넘기고, 앱은 라우팅 → 비즈니스 로직 → SQL 질의(SELECT * FROM menu …) → 템플릿 렌더링 순으로 HTML을 생성합니다. 이 서버 처리 시간이 TTFB(첫 바이트까지 시간)의 큰 부분입니다.',
      async run(a) {
        a.clear();
        status(a, '응답 기다리는 중…');
        a.badge('web', '처리 중…', 'amber');
        await a.send([548, 260], [548, 330], '메뉴 목록?', { color: 'green', dur: 700 });
        a.hl('db', true, 'amber');
        await a.flash('db');
        await a.send([648, 330], [648, 260], '12개 메뉴', { color: 'amber', dur: 700 });
        a.hl('db', false);
        a.badge('web', 'HTML 완성', 'green');
        a.note('n-tpl', 450, 300, '메뉴를 끼워 넣어 HTML 생성', { color: 'green', w: 190 });
        await a.flash('web');
        await a.wait(400);
      },
    },
    {
      t: '응답 도착 — 200 OK와 HTML',
      easy: '서버가 "잘 처리했어요(200 OK)"라는 표시와 함께 HTML 문서를 보내 줍니다. 브라우저는 받자마자 위에서부터 한 줄씩 읽기 시작해요.',
      deep: '응답은 상태 줄(HTTP/1.1 200 OK) + 헤더(Content-Type: text/html; charset=utf-8, Cache-Control, Content-Encoding: gzip/br 등) + 본문입니다. 브라우저는 다 받기 전부터 스트리밍으로 파싱을 시작합니다.',
      async run(a) {
        a.clear();
        a.hl('web', false);
        a.badge('web', '🔒 연결됨', 'teal');
        await a.send('web', B, '200 OK · HTML', { via: ['net'], color: 'green', dur: 1100 });
        status(a, 'HTML 읽는 중…');
        for (let i = 0; i < SRC.length; i++) {
          a.text(36, 96 + i * 24, SRC[i], { id: 'src' + i, size: 10.5, anchor: 'start', mono: true, layer: 'pkt' });
          await a.wait(160);
        }
        await a.wait(400);
      },
    },
    {
      t: '추가 요청 — CSS·JS·이미지',
      easy: 'HTML을 읽다 보니 "꾸미기 파일(CSS)", "동작 파일(JS)", "사진"이 더 필요하다고 적혀 있네요. 브라우저는 이것들을 서버에 한꺼번에 추가로 요청합니다.',
      deep: '프리로드 스캐너가 <link>, <script>, <img>를 미리 찾아 병렬로 요청합니다(HTTP/2면 한 연결에서 멀티플렉싱). CSS는 렌더링을 막고(render-blocking), defer/async가 없는 <script>는 HTML 파싱을 멈추게 합니다.',
      async run(a) {
        for (const i of [1, 3, 4]) a.get('src' + i).setAttribute('class', 'tx mono tc-amber');
        a.caption('추가로 필요한 파일 3개 발견!');
        status(a, '파일 3개 더 받는 중…');
        const files = [['style.css', 'violet', -30], ['app.js', 'amber', 0], ['photo.jpg', 'pink', 30]];
        await a.par(...files.map(([f, c, dy], i) => a.wait(i * 180).then(() => a.send(B, 'web', 'GET ' + f, { via: ['net'], color: 'blue', dy, dur: 900 }))));
        await a.flash('web');
        await a.par(...files.map(([f, c, dy], i) => a.wait(i * 180).then(() => a.send('web', B, f, { via: ['net'], color: c, dy, dur: 900 }))));
        for (const i of [1, 3, 4]) a.get('src' + i).setAttribute('class', 'tx mono tc-green');
        status(a, '모든 파일 도착 ✓');
        await a.wait(300);
      },
    },
    {
      t: '렌더링 — DOM, 레이아웃, 페인트',
      easy: '이제 그림을 그릴 차례입니다. ① HTML로 나무 모양 구조(DOM)를 만들고, ② 각 요소의 위치와 크기를 정한 뒤(레이아웃), ③ 색과 글자를 칠합니다(페인트). 드디어 페이지가 보여요!',
      deep: 'HTML → DOM, CSS → CSSOM을 만들어 합친 렌더 트리로 레이아웃(reflow)에서 박스의 좌표·크기를 계산하고, 페인트로 레이어별 그리기 명령을 만든 뒤 GPU가 합성(composite)합니다. 이후 JS가 DOM을 바꾸면 레이아웃·페인트가 다시 일어날 수 있습니다.',
      async run(a) {
        a.clear();
        status(a, '그리는 중…');
        // ① DOM 트리
        a.text(30, 84, '① DOM', { size: 11, weight: 700, anchor: 'start', color: 'blue', layer: 'pkt' });
        const T = [['html', 136, 98], ['head', 86, 134], ['body', 186, 134], ['h1', 144, 170], ['img', 186, 170], ['p', 228, 170]];
        const links = [[0, 1], [0, 2], [2, 3], [2, 4], [2, 5]];
        for (const [p, c] of links) a.raw('line', { x1: T[p][1], y1: T[p][2], x2: T[c][1], y2: T[c][2], class: 'edge' }, 'pkt');
        for (const [l, x, y] of T) {
          a.packet(l, { at: [x, y], color: 'blue', w: 36, h: 20, size: 10.5, round: 6 });
          await a.wait(110);
        }
        // ② 레이아웃
        a.text(30, 200, '② 레이아웃 → ③ 페인트', { size: 11, weight: 700, anchor: 'start', color: 'amber', layer: 'pkt' });
        const outline = 'fill: none; stroke: var(--muted); stroke-width: 1.2; stroke-dasharray: 4 3';
        const L = [[36, 214, 200, 28], [36, 252, 92, 80], [138, 254, 98, 10], [138, 272, 80, 10], [138, 290, 92, 10], [36, 344, 96, 26], [36, 380, 200, 10]];
        const boxes = L.map(([x, y, w, h]) => box(a, x, y, w, h, outline));
        await a.wait(700);
        // ③ 페인트
        const fills = ['var(--violet)', 'var(--pink)', 'var(--muted)', 'var(--muted)', 'var(--muted)', 'var(--green)', 'var(--muted)'];
        await a.tween(900, (t) => boxes.forEach((b, i) => b.setAttribute('style', `fill: ${fills[i]}; fill-opacity: ${(i === 0 || i === 1 || i === 5 ? 0.85 : 0.5) * t}; stroke: var(--muted); stroke-opacity: ${1 - t}; stroke-width: 1.2; stroke-dasharray: 4 3`)));
        a.text(136, 228, '오늘의 메뉴', { size: 12, weight: 800, layer: 'pkt' });
        a.text(82, 292, '🍝', { size: 26, layer: 'pkt' });
        a.text(84, 357, '주문하기', { size: 11, weight: 700, layer: 'pkt' });
        status(a, '완료 ✓ 약 1초');
        a.caption('페이지 완성!');
        await a.wait(600);
      },
    },
  ],
};

// REST API와 JSON: API란? → 자원은 URL로 → 동사는 메서드로 → JSON 펼쳐 보기 → 쿼리 파라미터
// → 상태 코드와 에러 본문 → 인증 헤더와 버전 → 멱등성과 재시도. 단계마다 무대를 새로 그린다.

const M_COLOR = { GET: 'blue', POST: 'green', PUT: 'amber', PATCH: 'violet', DELETE: 'red' };

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 26, w: o.w, size: o.size || 12, id: o.id, hidden: o.hidden, layer: o.layer });
}
/** 색이 섞인 한 줄 글자. parts = [[글자, 색|null], ...] */
function rich(a, x, y, parts, o = {}) {
  const t = a.text(x, y, '', { size: o.size || 14, mono: o.mono ?? true, anchor: o.anchor || 'start', weight: o.weight || 700, layer: o.layer, id: o.id });
  for (const [s, c] of parts) {
    const sp = a.raw('tspan', c ? { class: 'tc-' + c } : {}, t);
    sp.textContent = s;
  }
  return t;
}
/** 여러 줄 고정폭 글자 묶음 */
function lines(a, x, y, arr, o = {}) {
  return arr.map((l, i) => {
    const t = a.text(x, y + i * (o.lh || 21), l, { size: o.size || 13, mono: true, anchor: 'start', weight: o.weight || 600, color: o.color, hidden: o.hidden });
    t.style.whiteSpace = 'pre';
    return t;
  });
}
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));

// 2단계: 메서드 표
const MROWS = [
  ['GET', '/orders', '목록 보기', '200 [#6, #7]'],
  ['GET', '/orders/7', '하나 보기', '200 {#7}'],
  ['POST', '/orders', '새로 만들기', '201 + Location'],
  ['PUT', '/orders/7', '통째로 바꾸기', '200 전체 교체'],
  ['PATCH', '/orders/7', '일부만 고치기', '200 일부 수정'],
  ['DELETE', '/orders/8', '지우기', '204 내용 없음'],
];
// 3단계: JSON 줄과 설명 [줄, 설명, 색]
const JSON_LINES = [
  ['{', '{ } 객체 — "이름": 값 묶음', 'violet'],
  ['  "id": 7,', '숫자 — 따옴표 없음', 'blue'],
  ['  "status": "paid",', '문자열 — "큰따옴표"', 'green'],
  ['  "paid": true,', '불리언 — true / false', 'amber'],
  ['  "total": 25000,', '', ''],
  ['  "items": [', '[ ] 배열 — 순서 있는 목록', 'teal'],
  ['    { "name": "커피", "qty": 2 },', '배열 안에 객체도 OK', 'violet'],
  ['    { "name": "쿠키", "qty": 1 }', '', ''],
  ['  ],', '', ''],
  ['  "coupon": null', 'null — 값 없음', 'gray'],
  ['}', '', ''],
];
// 4단계: 주문 10개 (true = 결제됨)
const ORDERS = [true, false, true, true, false, true, true, false, true, true];

export default {
  id: 'rest',
  level: 2,
  cat: '웹',
  title: 'REST API와 JSON — 프로그램끼리의 주문서',
  sub: '앱은 서버에게 화면이 아니라 "데이터"를 주문한다. 그 주문서의 약속이 REST API다.',
  analogy: 'API는 식당의 메뉴판과 주문 창구입니다. 주방 안을 몰라도 메뉴판에 적힌 대로 "2번 테이블, 커피 2잔"이라고 주문하면 정해진 모양의 음식이 나오죠. REST는 그 주문서를 "어떤 것(주소)에 무엇을 할지(메서드)"로 쓰자는 약속이고, 음식 대신 JSON이라는 데이터가 나옵니다.',
  keys: [
    'API는 프로그램끼리 데이터를 주고받는 창구다. 앱·웹·다른 회사 서비스가 같은 API를 함께 쓴다.',
    'REST에서는 다룰 대상(자원)을 명사형 URL로 나타내고(/users/42/orders), 할 일은 HTTP 메서드(GET·POST·PUT·PATCH·DELETE)로 나타낸다.',
    '데이터는 주로 JSON으로 주고받는다: 객체 { }, 배열 [ ], 문자열, 숫자, true/false, null 여섯 가지로 거의 모든 것을 표현한다.',
    '목록은 쿼리 파라미터(?status=paid&page=2)로 거르고 나누며, 결과는 상태 코드와 에러 본문으로 알려 준다.',
    '인증은 헤더(API 키·토큰)로, 호환성은 버전(/v1)으로 지킨다. 재시도해도 안전한지(멱등성)도 설계해야 한다.',
  ],
  terms: [
    ['API', 'Application Programming Interface. 프로그램이 다른 프로그램의 기능·데이터를 쓰는 약속된 창구'],
    ['REST', '자원을 URL로, 동작을 HTTP 메서드로, 상태를 표준 상태 코드로 표현하는 API 설계 스타일'],
    ['자원(resource)', 'API가 다루는 대상. 회원, 주문, 상품처럼 명사로 부를 수 있는 것'],
    ['JSON', 'JavaScript Object Notation. 사람도 읽을 수 있는 텍스트 데이터 형식'],
    ['쿼리 파라미터', 'URL의 ? 뒤에 이름=값 을 &로 이어 붙인 조건. 거르기·정렬·페이지에 쓴다'],
    ['멱등성', '같은 요청을 여러 번 보내도 결과(서버 상태)가 한 번 보낸 것과 같은 성질'],
  ],
  quiz: [
    { q: 'REST API에서 새 주문을 "만들" 때 주로 쓰는 메서드는?', c: ['GET', 'DELETE', 'POST', 'PATCH'], a: 2, why: '새 자원 생성은 POST /orders로 보내고, 성공하면 201 Created와 새 주문 주소(Location)를 돌려받습니다.', step: 2 },
    { q: 'GET /orders?status=paid&page=2 에서 ? 뒤의 부분은 무슨 역할일까요?', c: ['서버 주소의 일부라서 바꾸면 다른 서버로 간다', '목록을 거르고 나누는 조건(쿼리 파라미터)이다', '로그인을 위한 비밀번호다', '서버가 돌려줄 JSON 응답 본문이다'], a: 1, why: '? 뒤는 쿼리 파라미터로, status=paid는 결제된 것만, page=2는 나눈 결과의 둘째 쪽을 달라는 조건입니다.', step: 4 },
    { q: '응답이 중간에 사라져 앱이 같은 요청을 그대로 다시 보냈습니다. 중복 처리될 위험이 가장 큰 것은?', c: ['PUT /orders/7', 'DELETE /orders/7', 'GET /orders/7', 'POST /orders'], a: 3, why: 'GET·PUT·DELETE는 멱등이라 여러 번 보내도 서버 상태가 같지만, POST는 보낼 때마다 새 주문을 만들 수 있어 Idempotency-Key 같은 장치가 필요합니다.', step: 7 },
  ],
  setup(a) {
    a.node('app', 110, 190, { label: '날씨 앱', sub: '스마트폰', icon: '📱', color: 'blue', w: 130, h: 80 });
    a.node('srv', 610, 190, { label: '날씨 서버', sub: 'API', icon: '🖥️', color: 'violet', w: 130, h: 80 });
  },
  steps: [
    {
      t: 'API — 프로그램을 위한 주문 창구',
      easy: '날씨 앱은 서버에게 "완성된 화면"을 받지 않아요. "서울 날씨 데이터 주세요"라고 주문해서 숫자와 글자만 받아 오고, 화면은 앱이 직접 그립니다. 이렇게 프로그램끼리 주문을 주고받는 창구가 API예요.',
      deep: '웹페이지 요청은 HTML(화면)을 받지만 API 요청은 JSON 같은 데이터만 받아, 같은 API를 앱·웹·워치·외부 서비스가 함께 씁니다. REST는 HTTP 위에서 자원·메서드·상태 코드를 활용하는 설계 스타일이고, 대안으로 필요한 필드만 골라 받는 GraphQL(단일 엔드포인트, 쿼리 언어), 사내 서비스 간 고성능 통신에 쓰는 gRPC(HTTP/2 + Protocol Buffers 바이너리, 스키마 기반 코드 생성)가 있습니다. 공개 API·캐시 활용에는 REST, 화면마다 필요한 데이터가 다양하면 GraphQL, 내부 마이크로서비스 간 지연·처리량이 중요하면 gRPC가 흔한 선택입니다.',
      async run(a) {
        wipe(a);
        a.node('app', 110, 190, { label: '날씨 앱', sub: '스마트폰', icon: '📱', color: 'blue', w: 130, h: 80 });
        a.node('srv', 610, 190, { label: '날씨 서버', sub: 'API', icon: '🖥️', color: 'violet', w: 130, h: 80 });
        a.edge('app', 'srv', { dashed: true, arrow: false });
        a.text(360, 54, '앱은 완성된 화면 대신 "데이터"만 받아 가요', { size: 14, weight: 700 });
        a.caption('API = 프로그램끼리 주고받는 주문 창구');
        await a.wait(300);
        await a.send('app', 'srv', 'GET /weather', { color: 'blue', dy: -18, dur: 1000 });
        await a.flash('srv');
        await a.send('srv', 'app', '{ JSON }', { color: 'green', dy: 18, dur: 1000 });
        const J = lines(a, 290, 268, ['{', '  "city": "서울",', '  "temp": 18,', '  "sky": "맑음"', '}'], { hidden: true, size: 13.5 });
        await appear(a, J, 350);
        a.setNode('app', { sub: '18° 맑음 ☀' });
        await a.flash('app');
        a.text(110, 252, '화면은 앱이 직접 그림', { size: 11.5, cls: 'muted' });
        a.text(610, 252, '웹·워치도 같은 창구 사용', { size: 11.5, cls: 'muted' });
        a.note('n0', 360, 404, '메뉴판(API 문서)대로 주문하면 약속된 모양의 데이터가 와요', { color: 'blue' });
        await a.wait(700);
      },
    },
    {
      t: '자원은 URL로 — 명사로 주소 짓기',
      easy: 'REST에서는 다룰 대상을 "주소"로 부릅니다. /users는 회원 전체, /users/42는 42번 회원, /users/42/orders는 그 회원의 주문들이에요. 폴더 안의 폴더를 여는 것처럼 왼쪽에서 오른쪽으로 좁혀 갑니다.',
      deep: '자원은 복수형 명사 컬렉션(/orders)과 그 안의 개별 항목(/orders/7)으로 표현하고, 소속 관계는 경로 중첩(/users/42/orders)으로 나타냅니다. 동사를 경로에 넣는 /getUserOrders 같은 RPC식 이름은 피하고, 동작은 메서드로 표현합니다. 너무 깊은 중첩(3단계 이상)은 /orders?userId=42나 /orders/7처럼 평평하게 푸는 편이 다루기 쉽습니다.',
      async run(a) {
        wipe(a);
        rich(a, 360, 52, [['https://api.shop.example', null], ['/users/42/orders/7', 'blue']], { anchor: 'middle', size: 14.5 });
        const SEG = [['users', '회원 전체', 'blue'], ['42', '42번 회원', 'violet'], ['orders', '그 회원의 주문들', 'teal'], ['7', '그중 7번 주문', 'green']];
        const X = [130, 283, 436, 589];
        for (let i = 0; i < SEG.length; i++) {
          const [s, d, c] = SEG[i];
          if (i) a.text(X[i] - 76, 128, '/', { size: 22, weight: 800, cls: 'muted' });
          const p = chip(a, s, X[i], 128, c, { w: 104, h: 36, size: 15, hidden: true });
          await a.show(p, 250);
          a.text(X[i], 166, d, { size: 12, weight: 700, color: c });
          await a.wait(220);
        }
        const U = [['/users', '회원 목록'], ['/users/42', '42번 회원 한 명'], ['/users/42/orders', '42번의 주문 목록'], ['/users/42/orders/7', '그중 7번 주문 하나']];
        U.forEach(([u, d], i) => {
          a.text(150, 220 + i * 28, u, { size: 13.5, mono: true, anchor: 'start', weight: 700 });
          a.text(400, 220 + i * 28, '→ ' + d, { size: 12.5, anchor: 'start', cls: 'muted' });
        });
        await a.wait(400);
        rich(a, 120, 362, [['✕ ', 'red'], ['/getUserOrders?id=42', 'red']], { size: 13.5 });
        a.text(400, 362, '주소에 동사를 넣지 않아요', { size: 12.5, anchor: 'start', color: 'red', weight: 700 });
        await a.wait(300);
        rich(a, 120, 396, [['✓ ', 'green'], ['GET ', 'blue'], ['/users/42/orders', null]], { size: 13.5 });
        a.text(400, 396, '주소는 "무엇", 메서드는 "어떻게"', { size: 12.5, anchor: 'start', color: 'green', weight: 700 });
        await a.wait(600);
      },
    },
    {
      t: '동사는 HTTP 메서드로 — GET·POST·PUT·PATCH·DELETE',
      easy: '같은 주소라도 앞에 붙는 "동사"에 따라 하는 일이 달라요. GET은 보기, POST는 새로 만들기, PUT·PATCH는 고치기, DELETE는 지우기입니다. 아래 주문 카드가 어떻게 바뀌는지 보세요.',
      deep: 'GET은 읽기 전용(안전)이고, POST로 생성하면 201 Created와 새 자원 주소를 Location 헤더로 돌려줍니다. PUT은 자원 전체를 보낸 내용으로 교체하므로 빠진 필드는 지워질 수 있고, PATCH는 바꿀 필드만 보냅니다(JSON Merge Patch 등). DELETE 성공은 본문 없는 204 No Content가 흔하며, GET·PUT·DELETE는 멱등이지만 POST는 아닙니다(PATCH는 구현에 따라 다름).',
      async run(a) {
        wipe(a);
        a.text(74, 60, '메서드', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(128, 60, '주소', { size: 11.5, cls: 'muted', weight: 700, anchor: 'start' });
        a.text(290, 60, '뜻', { size: 11.5, cls: 'muted', weight: 700, anchor: 'start' });
        a.text(450, 60, '응답', { size: 11.5, cls: 'muted', weight: 700, anchor: 'start' });
        a.zone('dz', 30, 304, 660, 120, { label: '서버의 주문 데이터', color: 'gray' });
        a.node('c6', 150, 372, { label: '#6', sub: '커피 · 배송중', color: 'blue', w: 140, h: 58 });
        a.node('c7', 340, 372, { label: '#7', sub: '쿠키 · 결제됨', color: 'blue', w: 140, h: 58 });
        a.node('c8', 530, 372, { label: '#8', sub: '빵 · 새 주문', color: 'green', w: 140, h: 58, hidden: true });
        const ACT = [
          async () => { a.hl('c6'); a.hl('c7'); await a.wait(350); a.hl('c6', false); a.hl('c7', false); },
          async () => { a.hl('c7'); await a.flash('c7'); a.hl('c7', false); },
          async () => { await a.show('c8', 300); await a.flash('c8'); },
          async () => { a.setNode('c7', { sub: '케이크 · 결제됨', color: 'amber' }); await a.flash('c7'); },
          async () => { a.setNode('c7', { sub: '케이크 · 배송중', color: 'violet' }); await a.flash('c7'); },
          async () => { a.hl('c8', true, 'red'); await a.wait(200); await a.fadeOut('c8', 350); },
        ];
        for (let i = 0; i < MROWS.length; i++) {
          const [m, p, d, r] = MROWS[i];
          const y = 92 + i * 34;
          const c = M_COLOR[m];
          const els = [chip(a, m, 74, y, c, { w: 74, h: 24, size: 11.5 }).g,
            a.text(128, y, p, { size: 13, mono: true, anchor: 'start', weight: 700 }),
            a.text(290, y, d, { size: 12.5, anchor: 'start', weight: 600 }),
            a.text(450, y, r, { size: 12.5, mono: true, anchor: 'start', weight: 700, color: c })];
          els.forEach((e) => (e.style.opacity = 0));
          await appear(a, els.slice(0, 3), 200);
          await ACT[i]();
          await appear(a, els[3], 200);
          await a.wait(120);
        }
        a.caption('PUT은 통째로 교체, PATCH는 바꿀 칸만');
        await a.wait(500);
      },
    },
    {
      t: 'JSON — 응답을 한 줄씩 펼치면',
      easy: '서버가 보내 주는 데이터는 보통 JSON이라는 글자 형식이에요. 중괄호 { } 안에 "이름": 값 을 나열하고, 값으로는 숫자·글자·참/거짓·목록 [ ]·또 다른 { }를 넣을 수 있어요.',
      deep: 'JSON 값의 타입은 object, array, string, number, boolean(true/false), null 여섯 가지뿐입니다. 키는 반드시 큰따옴표 문자열이고, 끝에 붙는 쉼표(trailing comma)·주석·작은따옴표는 허용되지 않습니다. 날짜 타입이 없어 보통 ISO 8601 문자열("2026-10-08T09:00:00Z")로 보내고, 금액·큰 ID는 부동소수점 정밀도 문제(2^53 초과) 때문에 정수 최소 단위나 문자열로 보내기도 합니다. 응답에는 Content-Type: application/json 헤더가 붙습니다.',
      async run(a) {
        wipe(a);
        a.text(40, 34, 'GET /orders/7 의 응답 본문', { size: 12.5, anchor: 'start', weight: 700, cls: 'muted' });
        const Y0 = 66, LH = 30;
        const L = lines(a, 40, Y0, JSON_LINES.map((r) => r[0]), { lh: LH, size: 14, hidden: true });
        for (let i = 0; i < JSON_LINES.length; i++) {
          const [, d, c] = JSON_LINES[i];
          await appear(a, L[i], 160);
          if (d) {
            const y = Y0 + i * LH;
            const x0 = 40 + L[i].getComputedTextLength() + 14;
            a.raw('line', { x1: x0, y1: y, x2: 440, y2: y, class: 'edge ec-' + c, style: 'stroke-dasharray:3 4;stroke-width:1.5' }, 'edge');
            const t = a.text(448, y, d, { size: 12.5, anchor: 'start', weight: 700, color: c === 'gray' ? null : c, cls: c === 'gray' ? 'muted' : '' });
            t.style.opacity = 0;
            await appear(a, t, 220);
            await a.wait(260);
          } else {
            await a.wait(80);
          }
        }
        a.note('n3', 560, 404, '키(이름)는 언제나 "큰따옴표"', { color: 'blue' });
        await a.wait(600);
      },
    },
    {
      t: '쿼리 파라미터 — 거르고, 나눠서',
      easy: '주문이 수천 개면 한꺼번에 받기엔 너무 많아요. 주소 뒤에 ? 를 붙이고 "결제된 것만(status=paid)", "3개씩 나눈 2쪽(page=2&size=3)"처럼 조건을 적으면 원하는 만큼만 받아요.',
      deep: '쿼리 파라미터는 필터(status=paid), 정렬(sort=-createdAt), 페이지네이션에 씁니다. offset 방식(page·size 또는 offset·limit)은 쪽 번호로 바로 이동할 수 있지만, 뒤쪽으로 갈수록 DB가 앞 행을 건너뛰느라 느려지고 그사이 새 행이 끼면 항목이 중복·누락될 수 있습니다. cursor 방식(?after=ord_9&limit=3)은 마지막으로 본 항목 다음부터 인덱스로 이어 읽어 대량·실시간 목록에 안정적이지만 임의의 쪽으로 점프하기는 어렵습니다.',
      async run(a) {
        wipe(a);
        rich(a, 360, 50, [['GET /orders', null], ['?', 'pink'], ['status=paid', 'amber'], ['&', 'pink'], ['page=2&size=3', 'blue']], { anchor: 'middle', size: 15 });
        a.text(360, 80, '? 뒤에 조건(이름=값)을 & 로 이어 붙여요', { size: 12, cls: 'muted' });
        const X = (i) => 63 + i * 66;
        const ps = ORDERS.map((paid, i) => chip(a, '#' + (i + 1), X(i), 140, paid ? 'green' : 'gray', { w: 52, h: 32, size: 13 }));
        a.text(360, 176, '초록 = 결제됨(paid) · 회색 = 대기', { size: 11.5, cls: 'muted' });
        await a.wait(500);
        // 1) 거르기
        a.caption('status=paid → 결제된 주문만');
        await a.par(...ps.map((p, i) => (ORDERS[i] ? a.wait(0) : a.fade(p, 0.15, 400))));
        a.text(360, 206, 'status=paid → 7개 남음', { size: 12.5, weight: 700, color: 'amber' });
        await a.wait(400);
        // 2) 나누기
        const paid = ORDERS.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        const PX = (k) => 140 + k * 220;
        [0, 1, 2].forEach((k) => a.zone('pg' + k, PX(k) - 98, 236, 196, 80, { label: `${k + 1}쪽`, color: k === 1 ? 'blue' : 'gray' }));
        await a.par(...paid.map((oi, j) => a.wait(j * 70).then(() => a.move(ps[oi], [PX(Math.floor(j / 3)) + (j % 3 - 1) * 60, 284], 650))));
        a.text(360, 334, 'size=3 → 3개씩 · page=2 → 둘째 쪽', { size: 12.5, weight: 700, color: 'blue' });
        await a.wait(300);
        await a.par(...paid.filter((_, j) => Math.floor(j / 3) !== 1).map((oi) => a.fade(ps[oi], 0.35, 300)));
        lines(a, 170, 370, ['{ "page": 2, "size": 3, "total": 7,', '  "items": [ #6, #7, #9 ] }'], { size: 13.5, lh: 24 });
        await a.wait(700);
      },
    },
    {
      t: '상태 코드와 에러 본문 — 무엇이 잘못됐는지',
      easy: '주문 수량을 -1개로 보내면 서버는 "400 — 요청이 잘못됐어요"라고 답해요. 숫자는 프로그램이 읽고, 함께 오는 에러 내용은 개발자와 사용자가 읽고 고칠 수 있게 도와줍니다.',
      deep: '2xx는 성공, 4xx는 요청 쪽 문제(400 형식 오류, 401 인증 없음, 403 권한 없음, 404 없음, 409 상태 충돌, 422 검증 실패, 429 요청 과다), 5xx는 서버 쪽 문제입니다. 에러 본문은 기계가 분기할 수 있는 고정 code와 사람이 읽을 message를 함께 주는 것이 좋고, RFC 9457(Problem Details, application/problem+json)이 표준 형식을 정의합니다. 200 OK에 {"error": ...}를 담는 식으로 상태 코드를 무시하면 캐시·재시도·모니터링이 모두 헷갈립니다.',
      async run(a) {
        wipe(a);
        a.node('cli', 100, 100, { label: '앱', icon: '📱', color: 'blue', w: 110, h: 70 });
        a.node('srv', 620, 100, { label: 'API 서버', icon: '🖥️', color: 'violet', w: 120, h: 70 });
        a.edge('cli', 'srv', { dashed: true, arrow: false });
        rich(a, 360, 150, [['POST /orders  ', 'green'], ['{"qty": -1}', 'red']], { anchor: 'middle', size: 13.5 });
        await a.send('cli', 'srv', 'POST /orders', { color: 'green', dy: -14, dur: 900 });
        a.hl('srv', true, 'red');
        await a.flash('srv');
        await a.send('srv', 'cli', '400', { color: 'red', dy: 14, dur: 900 });
        a.hl('srv', false);
        a.hl('cli', true, 'red');
        const E = lines(a, 40, 200, ['HTTP/1.1 400 Bad Request', '{', '  "error": {', '    "code": "INVALID_QTY",', '    "message": "qty는 1 이상이어야 해요"', '  }', '}'], { size: 12.5, lh: 22, hidden: true });
        E[0].classList.add('tc-red');
        await appear(a, E, 350);
        const G = [['2xx 성공', '200 · 201 · 204', 'green'], ['4xx 요청 쪽 문제', '400 · 401 · 403 · 404 · 429', 'amber'], ['5xx 서버 쪽 문제', '500 · 502 · 503', 'red']];
        for (let i = 0; i < G.length; i++) {
          const [h, codes, c] = G[i];
          a.text(440, 206 + i * 52, h, { size: 12.5, anchor: 'start', weight: 800, color: c });
          a.text(440, 228 + i * 52, codes, { size: 12.5, anchor: 'start', mono: true, weight: 600 });
          await a.wait(220);
        }
        a.note('n5', 360, 400, '상태 코드는 프로그램이, message는 사람이 읽어요', { color: 'blue' });
        await a.wait(700);
      },
    },
    {
      t: '인증 헤더와 버전 — 누가, 어느 판으로',
      easy: '아무나 내 주문을 볼 수 있으면 안 되니, 요청마다 "열쇠"(API 키나 로그인 토큰)를 헤더에 붙여 보내요. 또 API를 크게 바꿀 땐 /v2 같은 새 판을 열어, 옛날 앱은 /v1을 계속 쓸 수 있게 해 줍니다.',
      deep: '사용자 대신 호출할 때는 OAuth 2.0 액세스 토큰을 Authorization: Bearer <token>으로, 서버 간 호출에는 API 키를 헤더(예: X-API-Key)로 보내며, URL 쿼리에 키를 넣으면 로그·브라우저 기록에 남아 위험합니다. 인증이 없거나 틀리면 401, 신원은 맞지만 권한이 없으면 403입니다. 필드 추가처럼 하위 호환되는 변경은 같은 버전에서 하고, 필드 삭제·의미 변경 같은 깨지는 변경만 /v2(또는 헤더 기반 버전)로 내며 옛 버전은 Deprecation·Sunset 헤더로 종료를 예고합니다.',
      async run(a) {
        wipe(a);
        a.node('cli', 100, 100, { label: '앱', icon: '📱', color: 'blue', w: 110, h: 70 });
        a.node('srv', 620, 100, { label: 'API 서버', icon: '🖥️', color: 'violet', w: 120, h: 70 });
        a.edge('cli', 'srv', { dashed: true, arrow: false });
        a.text(360, 160, 'GET /v1/orders', { size: 13.5, mono: true, weight: 700 });
        const H = a.text(360, 184, 'Authorization: Bearer eyJhbGciOi…', { size: 12.5, mono: true, weight: 700, color: 'green' });
        H.style.opacity = 0;
        await a.send('cli', 'srv', 'GET /v1/orders', { color: 'blue', dy: -14, dur: 800 });
        await a.send('srv', 'cli', '401', { color: 'red', dy: 14, dur: 800 });
        a.badge('cli', '401 누구세요?', 'red');
        await a.wait(400);
        await appear(a, H, 300);
        a.caption('요청마다 열쇠(토큰)를 헤더에 붙여요');
        await a.send('cli', 'srv', 'GET + 토큰', { color: 'green', dy: -14, dur: 800 });
        await a.send('srv', 'cli', '200 OK', { color: 'green', dy: 14, dur: 800 });
        a.badge('cli', '200 OK', 'green');
        await a.wait(300);
        a.text(24, 262, '버전 — 크게 바꿀 땐 새 판을 열고, 옛 판도 한동안 유지', { size: 12.5, anchor: 'start', weight: 700 });
        a.node('old', 120, 318, { label: '옛날 앱', color: 'gray', w: 120, h: 44 });
        a.node('new', 120, 390, { label: '새 앱', color: 'blue', w: 120, h: 44 });
        a.node('v1', 560, 318, { label: '/v1/orders', color: 'gray', w: 150, h: 44, size: 13.5 });
        a.node('v2', 560, 390, { label: '/v2/orders', color: 'green', w: 150, h: 44, size: 13.5 });
        a.edge('old', 'v1', { color: 'gray' });
        a.edge('new', 'v2', { color: 'green' });
        await a.par(
          a.send('old', 'v1', 'v1', { color: 'gray', dur: 800 }),
          a.send('new', 'v2', 'v2', { color: 'green', dur: 800 }),
        );
        await a.wait(500);
      },
    },
    {
      t: '멱등성 — 다시 보내도 괜찮을까',
      easy: '주문 버튼을 눌렀는데 답이 안 와서 앱이 한 번 더 보냈어요. 그냥 다시 보내면 주문이 두 번 들어갈 수 있죠. 요청에 "주문표 번호(키)"를 붙이면 서버가 "이건 이미 처리했어요"라며 같은 결과만 돌려줘요.',
      deep: '멱등(idempotent) 메서드는 여러 번 보내도 서버 상태가 한 번 보낸 것과 같습니다: GET·HEAD·PUT·DELETE는 멱등, POST는 아닙니다. 네트워크 타임아웃은 "요청이 처리 안 됨"과 "처리됐는데 응답만 유실"을 구분할 수 없으므로, 결제 같은 POST에는 클라이언트가 만든 Idempotency-Key 헤더를 붙이고 서버가 키별 결과를 일정 기간 저장해 중복 요청에 같은 응답을 돌려줍니다. 재시도는 지수 백오프와 지터를 섞어 서버가 몰리지 않게 합니다.',
      async run(a) {
        wipe(a);
        // 위: 그냥 재시도
        a.text(24, 52, 'POST를 그대로 다시 보내면', { size: 13, anchor: 'start', weight: 800, color: 'red' });
        a.node('ac', 90, 116, { label: '앱', color: 'blue', w: 90, h: 50 });
        a.node('as', 400, 116, { label: '서버', color: 'violet', w: 100, h: 50 });
        a.edge('ac', 'as', { dashed: true, arrow: false });
        await a.send('ac', 'as', 'POST /orders', { color: 'green', dur: 650 });
        a.node('a8', 535, 116, { label: '#8', sub: '커피 2잔', color: 'green', w: 86, h: 50 });
        await a.flash('a8');
        let p = a.packet('201', { at: 'as', color: 'green' });
        await a.move(p, [245, 116], 450);
        p.set('✕', 'red');
        a.text(245, 146, '응답 유실', { size: 11.5, weight: 700, color: 'red' });
        await a.fadeOut(p, 250);
        a.text(90, 160, '⏱ 시간 초과 → 다시!', { size: 11.5, weight: 700, color: 'amber' });
        await a.send('ac', 'as', 'POST /orders', { color: 'green', dur: 650 });
        a.node('a9', 640, 116, { label: '#9', sub: '커피 2잔', color: 'red', w: 86, h: 50 });
        await a.flash('a9');
        a.text(588, 162, '같은 주문이 2개!', { size: 12, weight: 800, color: 'red' });
        await a.wait(250);
        // 아래: 멱등 키
        a.text(24, 222, 'Idempotency-Key를 붙여 다시 보내면', { size: 13, anchor: 'start', weight: 800, color: 'green' });
        a.node('bc', 90, 286, { label: '앱', color: 'blue', w: 90, h: 50 });
        a.node('bs', 400, 286, { label: '서버', sub: '키 기록', color: 'violet', w: 100, h: 50 });
        a.edge('bc', 'bs', { dashed: true, arrow: false });
        await a.send('bc', 'bs', 'POST 키=a1', { color: 'green', dur: 650 });
        a.node('b8', 535, 286, { label: '#8', sub: '커피 2잔', color: 'green', w: 86, h: 50 });
        a.setNode('bs', { sub: 'a1 → #8' });
        await a.flash('b8');
        p = a.packet('201', { at: 'bs', color: 'green' });
        await a.move(p, [245, 286], 450);
        p.set('✕', 'red');
        a.text(245, 316, '응답 유실', { size: 11.5, weight: 700, color: 'red' });
        await a.fadeOut(p, 250);
        await a.send('bc', 'bs', 'POST 키=a1', { color: 'green', dur: 650 });
        a.badge('bs', '이미 처리', 'amber');
        await a.flash('bs');
        await a.send('bs', 'bc', '201 #8', { color: 'green', dur: 650 });
        a.text(640, 286, '주문 1개 ✓', { size: 12.5, weight: 800, color: 'green' });
        a.note('n7', 360, 402, 'GET·PUT·DELETE는 원래 여러 번 보내도 결과가 같아요 (멱등)', { color: 'blue' });
        await a.wait(700);
      },
    },
  ],
};

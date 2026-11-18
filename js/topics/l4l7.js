// L4 · L7 스위치: 현장 이름(L4 스위치 = 로드밸런서) → L4가 보는 것(IP·포트) → L7이 보는 것(경로·헤더·쿠키)
// → 세션 유지 → TLS 종료 → 헬스 체크 → 비교 표와 실무 이름들
// 로드밸런서 주제(분배 알고리즘·헬스 체크 기본)를 바탕으로 "무엇을 보고 나누나"에 집중한다. 단계마다 무대를 새로 그린다.
// 주소는 모두 문서용·사설 대역(203.0.113.x, 198.51.100.x, 10.x)이다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
/** 글자 폭 대략 계산(한글·이모지 13, 나머지 7.4) — 엔진 기본값은 한글이 섞이면 너무 넓게 잡는다 */
const textW = (s) => [...String(s)].reduce((w, ch) => w + (/[\u0000-\u024f•·]/.test(ch) ? 7.4 : 13), 0);
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w || Math.round(textW(label) + 26), size: o.size || 12.5, hidden: o.hidden, id: o.id, layer: o.layer });
}
const vis = (x) => x.g || x;
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (vis(e).style.opacity = k))));

const RH = 28;
/** 작은 표. cols = [[제목, 너비], ...]. 반환: 본문 줄(g) 배열 — 처음엔 숨김 */
function table(a, x, y, cols, rows, head = 'violet') {
  const W = cols.reduce((s, c) => s + c[1], 0);
  const mk = (yy, cells, isHead) => {
    const g = a.raw('g', {}, 'node');
    const fill = isHead ? `color-mix(in srgb, var(--${head}) 20%, var(--panel2))` : 'var(--panel2)';
    a.raw('rect', { x, y: yy - RH / 2, width: W, height: RH, rx: isHead ? 5 : 0, style: `fill:${fill};stroke:var(--line2);stroke-width:1` }, g);
    let cx = x;
    cells.forEach((s, k) => {
      a.text(cx + 10, yy, s, { size: isHead ? 11.5 : 12.5, anchor: 'start', par: g, weight: isHead || k === 0 ? 800 : 600 });
      cx += cols[k][1];
    });
    if (!isHead) g.style.opacity = 0;
    return g;
  };
  mk(y, cols.map((c) => c[0]), true);
  return rows.map((cells, i) => mk(y + RH * (i + 1), cells, false));
}

// 0단계: 통신의 층(계층) 사다리 — [id, 이름, 다루는 것]
const LAYERS = [['ly7', 'L7 응용', 'HTTP 내용'], ['ly4', 'L4 전송', '포트 번호'], ['ly3', 'L3 네트워크', 'IP 주소'], ['ly2', 'L2 연결', 'MAC 주소'], ['ly1', 'L1 물리', '전선·전파']];
const SY3 = [110, 220, 330];

export default {
  id: 'l4l7',
  level: 3,
  cat: '네트워크',
  title: 'L4 · L7 스위치 — 무엇을 보고 나눠 주나',
  sub: '"L4 스위치"라는 장비의 정체와, 봉투 겉면만 보는 L4와 봉투를 열어 보는 L7의 차이',
  analogy: '은행 안내 데스크를 떠올려 보세요. L4 안내원은 봉투 겉면의 주소와 문 번호만 보고 "3번 창구로 가세요" 하고 바로 보냅니다. L7 안내원은 봉투를 열어 용건을 읽고 "대출은 3층, 카드는 2층으로 가세요" 하고 알맞은 곳으로 보냅니다. 겉면만 보면 빠르고, 열어 보면 똑똑합니다.',
  keys: [
    '한국 현장에서 "L4 스위치"라고 부르는 장비는 대개 로드밸런서다. 계층의 4번째 층(L4)까지 보고 판단한다는 뜻이다.',
    'L4는 IP 주소와 포트(TCP/UDP)만 보고 연결 단위로 나눈다. 내용을 안 보니 빠르고 단순하지만, URL에 따라 나눌 수는 없다.',
    'L7은 HTTP 요청을 열어 경로·헤더·쿠키를 보고 요청마다 다른 서버 묶음으로 보낸다. 대신 HTTPS라면 암호를 풀어야 하므로 장비에 인증서와 개인 키를 둔다.',
    '세션 유지는 L4면 출발 IP, L7이면 쿠키로 하고, 헬스 체크는 L4면 포트가 열렸는지, L7이면 응답 내용까지 확인한다.',
    '실무에서는 하드웨어 장비, 소프트웨어 리버스 프록시, 클라우드의 네트워크(L4)·애플리케이션(L7) 로드밸런서로 만나고, 데이터센터를 고르는 일은 DNS 기반 GSLB가 맡는다.',
  ],
  terms: [
    ['L4 스위치', '한국 현장에서 로드밸런서를 부르는 말. IP·포트(4계층)까지 보고 서버에 나눠 준다'],
    ['L7 스위치', 'HTTP 내용(주소 경로·헤더·쿠키, 7계층)까지 보고 나눠 주는 로드밸런서. ADC라고도 부른다'],
    ['포트', '한 컴퓨터 안의 "문 번호". 웹(HTTPS)은 보통 443, 웹(HTTP)은 80'],
    ['VIP', '가상 IP. 사용자가 접속하는 로드밸런서의 대표 주소. 뒤의 실제 서버 주소는 숨겨진다'],
    ['스티키 세션', '같은 사용자를 계속 같은 서버로 보내는 것. L4는 출발 IP, L7은 쿠키로 기억한다'],
    ['TLS 종료', 'HTTPS 암호를 로드밸런서에서 풀어 내용을 보는 것. SSL 오프로딩이라고도 부른다'],
    ['헬스 체크', '서버가 정상인지 주기적으로 확인하는 것. 실패한 서버는 분배 대상에서 뺀다'],
    ['GSLB', '여러 데이터센터(지역) 중 어디로 보낼지 DNS 응답으로 고르는 광역 부하 분산'],
  ],
  quiz: [
    { q: '주소가 /images로 시작하는 요청만 이미지 서버로 보내고 싶어요. 어떤 장비가 필요할까요?', c: ['L4 스위치 — IP와 포트만 보면 충분하다', 'L7 스위치 — 요청 속 주소 경로를 봐야 한다', 'L2 스위치 — 같은 층 컴퓨터끼리 잇는 장비', '집 공유기 — 인터넷을 나눠 쓰는 장치'], a: 1, why: '/images 같은 주소 경로는 HTTP 요청 "내용" 안에 들어 있습니다. 봉투 겉면(IP·포트)만 보는 L4는 이걸 모르고, 봉투를 여는 L7만 경로를 보고 나눌 수 있습니다.', step: 2 },
    { q: '서버 2의 프로그램이 멈춰 오류(500)만 돌려주는데, 포트는 여전히 열려 있습니다. 이 서버를 자동으로 빼려면 어떤 헬스 체크가 필요할까요?', c: ['포트가 열렸는지만 확인하는 L4 헬스 체크', '분배 방식을 라운드 로빈에서 최소 연결로 바꾸기', 'GET /health를 보내 응답 코드·내용까지 확인하는 L7 헬스 체크', '스티키 세션을 켜서 사용자를 고정하기'], a: 2, why: 'L4 검사는 TCP 연결이 맺어지면 정상으로 봅니다. 프로그램이 멈춰도 포트가 열려 있으면 통과해 버리죠. L7 검사는 실제 HTTP 요청을 보내 200 응답(과 내용)을 확인하므로 이런 "반쯤 죽은" 서버를 걸러냅니다.', step: 5 },
    { q: 'L7 로드밸런서에서 TLS를 종료(오프로딩)할 때의 설명으로 옳은 것은?', c: ['TLS를 종료하면 로드밸런서와 서버 사이도 자동으로 암호화된다', 'TLS 패스스루(통과) 방식이어도 로드밸런서가 URL 경로로 라우팅할 수 있다', '로드밸런서가 암호를 풀면 서버는 원래 사용자 IP를 알 방법이 전혀 없다', '인증서와 개인 키를 로드밸런서에 두어야 하고, 안쪽 구간을 평문으로 둘지 재암호화할지 따로 정해야 한다'], a: 3, why: '암호를 풀려면 장비에 인증서·개인 키가 있어야 합니다. 안쪽 구간은 자동으로 암호화되지 않으므로 평문으로 둘지 재암호화(또는 mTLS)할지 정책으로 정합니다. 패스스루면 장비가 내용을 못 보니 경로 라우팅은 불가능하고, 원래 사용자 IP는 X-Forwarded-For 같은 헤더로 서버에 전달합니다.', step: 4 },
  ],
  setup() {},
  steps: [
    {
      t: '"L4 스위치"의 정체 — 로드밸런서',
      easy: '회사에서 "L4 스위치"라고 부르는 장비는 사실 로드밸런서 주제에서 본 그 "안내원"입니다. 이름에 스위치가 붙었지만 컴퓨터 몇 대를 이어 주는 보통 스위치와 달리, 손님(요청)을 여러 서버에 나눠 줘요. "L4"는 인터넷 통신 규칙의 층(계층) 가운데 4번째 층, 즉 문 번호(포트)까지 보고 판단한다는 뜻입니다.',
      deep: '국내에서는 하드웨어 로드밸런서를 관행적으로 "L4 스위치", HTTP까지 보는 기능이 있으면 "L7 스위치"라 부릅니다. 해외 문서에서는 load balancer 또는 ADC(Application Delivery Controller)라는 말이 더 흔합니다. 클라이언트는 VIP(가상 IP)로 접속하고 장비가 뒤의 실서버(real server) 풀로 분배하며, 분배 알고리즘·헬스 체크의 기본은 로드밸런서 주제와 같습니다.',
      async run(a) {
        wipe(a);
        a.text(110, 66, '통신의 층(계층)', { size: 13, weight: 800, layer: 'edge' });
        LAYERS.forEach(([id, n, s], i) => a.node(id, 110, 104 + i * 46, { label: n, sub: s, color: 'gray', w: 156, h: 40, size: 13, hidden: true }));
        a.node('u', 300, 220, { label: '사용자', icon: '🙂', color: 'blue', w: 92, h: 54 });
        a.node('l4', 460, 220, { label: 'L4 스위치', sub: '= 로드밸런서', icon: '⚖️', color: 'amber', w: 132, h: 78 });
        SY3.forEach((y, i) => a.node('s' + i, 640, y, { label: `서버 ${i + 1}`, icon: '🖥️', color: 'green', w: 104, h: 58 }));
        a.edge('u', 'l4');
        SY3.forEach((_, i) => a.edge('l4', 's' + i));
        a.caption('현장에서 말하는 "L4 스위치" = 손님을 나눠 주는 로드밸런서');
        await appear(a, LAYERS.map(([id]) => a.get(id)), 300);
        a.setNode('ly4', { color: 'amber' });
        a.setNode('ly3', { color: 'amber' });
        a.hl('ly4', true, 'amber');
        a.text(198, 150, '◀ L4는', { size: 12.5, anchor: 'start', color: 'amber', weight: 800, layer: 'edge' });
        a.text(198, 168, '여기까지', { size: 12.5, anchor: 'start', color: 'amber', weight: 800, layer: 'edge' });
        await a.flash('l4');
        for (let i = 0; i < 3; i++) {
          const p = await a.send('u', 'l4', `요청 ${i + 1}`, { color: 'blue', dur: 450, keep: true });
          a.hl('s' + i);
          await a.move(p, 's' + i, 450);
          await a.fadeOut(p, 120);
          a.hl('s' + i, false);
        }
        a.setNode('ly7', { color: 'violet' });
        a.text(198, 104, '◀ L7은 내용까지', { size: 12.5, anchor: 'start', color: 'violet', weight: 800, layer: 'edge' });
        a.badge('l4', 'VIP 하나', 'amber');
        a.note('n0', 460, 386, '이름은 "스위치"지만 하는 일은 분배(로드밸런싱)', { color: 'amber' });
        await a.wait(500);
      },
    },
    {
      t: 'L4가 보는 것 — 봉투 겉면의 주소와 문 번호',
      easy: 'L4는 봉투 겉면만 봅니다. 받는 주소(IP), 문 번호(포트, 웹은 443번), 보낸 사람 주소까지만 확인하고 "3번 창구로" 하고 바로 넘겨요. 봉투 속 용건은 열어 보지 않으니 아주 빠르지만, 무슨 일로 왔는지는 모릅니다. 그래서 같은 일을 하는 서버 여러 대에 고르게 나누는 데 씁니다.',
      deep: 'L4 로드밸런서는 패킷 헤더의 5-튜플(출발·목적 IP, 출발·목적 포트, 프로토콜)로 연결(커넥션) 단위로 서버를 정하고, 그 연결의 나머지 패킷은 같은 서버로 보냅니다. 동작 방식은 목적지 주소를 실서버로 바꾸는 NAT 방식, 응답이 장비를 거치지 않는 DSR(Direct Server Return) 등이 있습니다. 페이로드를 해석하지 않아 처리량이 크고 지연이 작으며 TCP뿐 아니라 UDP(DNS·게임·영상)도 다루지만, HTTPS 내용은 암호화된 채 그대로 지나갑니다.',
      async run(a) {
        wipe(a);
        a.raw('rect', { x: 30, y: 84, width: 270, height: 184, rx: 10, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5' }, 'zone');
        a.raw('path', { d: 'M30 84 L165 140 L300 84', style: 'fill: none; stroke: var(--line2); stroke-width: 1.5' }, 'zone');
        a.text(165, 66, '✉️ 요청 봉투 — 겉면(헤더)', { size: 13, weight: 800, layer: 'edge' });
        const f = [
          chip(a, '받는 곳 IP 203.0.113.10', 165, 166, 'blue', { hidden: true }),
          chip(a, '문 번호 443 · TCP', 165, 202, 'amber', { hidden: true }),
          chip(a, '보낸 곳 198.51.100.7:51234', 165, 238, 'gray', { hidden: true }),
        ];
        chip(a, '🙈 속 내용(용건)은 안 봄', 165, 302, 'gray', { id: 'inner' });
        a.get('inner').g.style.opacity = 0.55;
        a.node('l4', 450, 200, { label: 'L4 스위치', sub: 'VIP :443', icon: '⚖️', color: 'amber', w: 128, h: 74 });
        SY3.forEach((y, i) => a.node('s' + i, 628, y - 10, { label: `웹 서버 ${i + 1}`, sub: `10.0.0.1${i + 1}`, color: 'green', w: 112, h: 56 }));
        SY3.forEach((_, i) => a.edge('l4', 's' + i, { id: 'e' + i }));
        a.edge([300, 200], 'l4', { id: 'ein' });
        a.caption('L4는 겉면의 주소·문 번호만 읽습니다');
        for (const c of f) { await appear(a, c, 220); await a.flash('l4'); }
        a.hl('l4', true, 'amber');
        a.caption('같은 일을 하는 서버들에 연결 단위로 나눠 줍니다');
        for (let i = 0; i < 3; i++) {
          const p = chip(a, `✉️ 연결 ${i + 1}`, 300, 200, 'blue');
          await a.move(p, [384, 200], 380);
          a.hl('s' + i);
          await a.move(p, [570, SY3[i] - 10], 420);
          await a.fadeOut(p, 120);
          a.hl('s' + i, false);
        }
        a.hl('l4', false);
        a.note('n1', 450, 386, '겉면만 보고 바로 넘김 → 빠르고 단순\n대신 "무슨 용건인지"는 모름', { color: 'amber' });
        await a.wait(500);
      },
    },
    {
      t: 'L7이 보는 것 — 봉투를 열어 용건대로',
      easy: 'L7은 봉투를 열어 용건을 읽습니다. 주소창의 경로가 /api로 시작하면 API 서버로, /images면 이미지 서버로, 모바일 앱에서 온 요청이면 모바일 전용 서버로 보내요. "대출은 3층, 카드는 2층"처럼 일의 종류에 맞는 서버 묶음으로 안내하는 거예요.',
      deep: 'L7 로드밸런서는 사실상 리버스 프록시입니다. 클라이언트와 TCP(+TLS) 연결을 직접 맺고 HTTP 요청을 해석한 뒤, 서버 쪽으로 따로 연결을 맺어 전달합니다. 그래서 경로·Host 헤더·쿠키·메서드로 라우팅하고(규칙은 우선순위 순서로 평가), 같은 연결 안의 요청(HTTP/2는 스트림)마다 다른 서버로 보낼 수 있으며, 헤더 추가·압축·캐시·WAF 연동도 이 자리에서 합니다. 대신 연결을 두 번 맺고 내용을 파싱하니 L4보다 CPU를 많이 씁니다.',
      async run(a) {
        wipe(a);
        a.node('web', 80, 120, { label: '브라우저', icon: '💻', color: 'blue', w: 104, h: 56 });
        a.node('mob', 80, 300, { label: '모바일 앱', icon: '📱', color: 'pink', w: 104, h: 56 });
        a.node('l7', 310, 210, { label: 'L7 스위치', sub: '봉투를 열어 봄', icon: '📬', color: 'violet', w: 134, h: 78 });
        const pools = [['api', 'API 서버', '/api/*', 'violet', 90], ['img', '이미지 서버', '/images/*', 'teal', 210], ['mp', '모바일 전용', '앱 헤더', 'pink', 330]];
        for (const [id, l, s, c, y] of pools) a.node(id, 616, y, { label: l, sub: s, color: c, w: 132, h: 60 });
        a.edge('web', 'l7');
        a.edge('mob', 'l7');
        for (const [id] of pools) a.edge('l7', id, { id: 'e-' + id });
        a.note('rules', 310, 344, '분배 규칙(위에서부터)\n① 앱 헤더 → 모바일\n② /api/* → API\n③ /images/* → 이미지', { color: 'violet', size: 12 });
        const reqs = [['web', '/api/orders', 'api', '② 경로가 /api'], ['web', '/images/1', 'img', '③ 경로가 /images'], ['mob', '앱 · /home', 'mp', '① 모바일 앱 헤더']];
        for (const [from, path, to, why] of reqs) {
          const p = await a.send(from, 'l7', '✉️ 요청', { color: 'blue', dur: 520, keep: true });
          a.hl('l7', true, 'violet');
          await a.flash('l7');
          p.set(path, 'amber');
          a.caption(`봉투를 열어 보니 ${why} → 해당 서버 묶음으로`);
          a.hl(to);
          a.hl('e-' + to, true);
          await a.move(p, to, 560);
          await a.fadeOut(p, 140);
          a.hl(to, false);
          a.hl('e-' + to, false);
          a.hl('l7', false);
        }
        a.caption('같은 주소(도메인)로 와도 용건에 따라 다른 서버로');
        await a.wait(400);
      },
    },
    {
      t: '세션 유지 — 같은 손님은 같은 창구로',
      easy: '장바구니처럼 서버가 손님을 기억해야 할 때는 같은 손님을 계속 같은 서버로 보내야 합니다(스티키 세션). L4는 보낸 사람 주소(IP)로 기억하는데, 회사 공유기 뒤의 직원 100명은 바깥에서 주소가 하나로 보여서 한 서버에 몰릴 수 있어요. L7은 손님 손에 번호표(쿠키)를 쥐여 주고 그걸 보고 기억합니다.',
      deep: 'L4는 출발 IP 기반 퍼시스턴스(시간 제한이 있는 매핑 표)를 쓰는데, NAT·CGNAT 뒤 다수 사용자의 쏠림, 모바일에서 IP가 바뀌면 끊김 같은 한계가 있습니다. L7은 장비가 Set-Cookie로 서버 표시 쿠키를 넣거나 애플리케이션 세션 쿠키를 보고 고정합니다. 다만 스티키는 서버 장애·배포 때 세션을 잃으므로, 근본적으로는 세션을 공유 저장소(예: 인메모리 DB)나 토큰으로 서버 밖에 두어 서버를 무상태로 만드는 편이 낫습니다(세션 주제).',
      async run(a) {
        wipe(a);
        a.zone('zA', 16, 30, 688, 180, { label: 'L4 — 보낸 곳 IP로 기억', color: 'amber' });
        a.zone('zB', 16, 226, 688, 190, { label: 'L7 — 번호표(쿠키)로 기억', color: 'violet' });
        a.node('ua', 100, 124, { label: '사용자 A', sub: '198.51.100.7', icon: '🙂', color: 'blue', w: 132, h: 62 });
        a.node('lb4', 330, 124, { label: 'L4', sub: 'IP 기억표', icon: '⚖️', color: 'amber', w: 112, h: 62 });
        a.node('ub', 100, 324, { label: '사용자 B', sub: '🍪 없음', icon: '🙂', color: 'blue', w: 132, h: 62 });
        a.node('lb7', 330, 324, { label: 'L7', sub: '쿠키 확인', icon: '📬', color: 'violet', w: 112, h: 62 });
        const AY = [74, 124, 174], BY = [272, 324, 376];
        AY.forEach((y, i) => a.node('a' + i, 610, y, { label: `서버 ${i + 1}`, color: 'green', w: 110, h: 38, size: 13.5 }));
        BY.forEach((y, i) => a.node('b' + i, 610, y, { label: `서버 ${i + 1}`, color: 'green', w: 110, h: 38, size: 13.5 }));
        a.edge('ua', 'lb4');
        a.edge('ub', 'lb7');
        AY.forEach((_, i) => a.edge('lb4', 'a' + i));
        BY.forEach((_, i) => a.edge('lb7', 'b' + i));
        // L4: 같은 IP는 계속 서버 2로
        a.caption('L4: 198.51.100.7은 서버 2로 — 이 IP는 계속 서버 2');
        a.badge('lb4', '.7 → 서버2', 'amber');
        for (let i = 0; i < 2; i++) {
          const p = await a.send('ua', 'lb4', '보낸 곳 .7', { color: 'blue', dur: 350, keep: true });
          a.hl('a1');
          await a.move(p, 'a1', 350);
          await a.fadeOut(p, 100);
          a.hl('a1', false);
        }
        a.setNode('ua', { label: '회사 100명', sub: '바깥 IP는 1개' });
        a.caption('공유기(NAT) 뒤 100명은 바깥에서 IP 하나 → 전부 서버 2로');
        await a.par(...[0, 1, 2, 3].map((k) => a.wait(k * 120).then(() => a.send('ua', 'a1', '.7', { color: 'blue', dur: 560, via: ['lb4'] }))));
        a.setNode('a1', { color: 'red' });
        a.badge('a1', '쏠림!', 'red');
        // L7: 첫 요청에 쿠키를 받아 계속 서버 3으로
        a.caption('L7: 첫 요청에 번호표(쿠키)를 쥐여 주고, 다음부터는 그걸 보고 같은 서버로');
        const p0 = await a.send('ub', 'lb7', '첫 요청', { color: 'blue', dur: 350, keep: true });
        a.hl('b2');
        await a.move(p0, 'b2', 350);
        await a.fadeOut(p0, 100);
        a.hl('b2', false);
        await a.send('lb7', 'ub', '🍪 SRV=3', { color: 'amber', dur: 420, dy: 22 });
        a.setNode('ub', { sub: '🍪 SRV=3' });
        for (let i = 0; i < 2; i++) {
          const p = await a.send('ub', 'lb7', '🍪 SRV=3', { color: 'amber', dur: 350, keep: true });
          a.hl('b2');
          await a.move(p, 'b2', 350);
          await a.fadeOut(p, 100);
          a.hl('b2', false);
        }
        a.badge('lb7', '사람마다 따로', 'violet');
        a.badge('b2', 'B 담당', 'violet');
        await a.wait(400);
      },
    },
    {
      t: 'SSL/TLS 종료 — 잠긴 봉투를 열려면 열쇠가 필요',
      easy: 'HTTPS 요청은 봉투가 자물쇠로 잠겨 있습니다. L7이 용건을 읽으려면 장비가 그 자물쇠의 열쇠(인증서와 개인 키)를 갖고 대신 열어야 해요. 덕분에 서버들은 자물쇠를 여는 수고를 덜지만(오프로딩), 장비 안쪽 구간을 다시 잠가서 보낼지는 따로 정해야 합니다. 열쇠가 없는 L4는 잠긴 봉투를 그대로 통과시킵니다.',
      deep: 'TLS 종료 시 인증서·개인 키를 LB에 두므로 키 보호(접근 통제, HSM·키 관리 서비스)와 인증서 갱신을 한곳에서 관리하게 됩니다. 요즘 서버 CPU는 AES 명령어 가속이 있어 대칭 암호화 부담 자체는 크지 않아, 오프로딩의 실익은 주로 핸드셰이크 처리·인증서 관리 집중과 L7 기능(라우팅·WAF)입니다. 내부 구간도 제로 트러스트나 금융·개인정보 규정 때문에 재암호화(TLS 브리징)나 mTLS를 쓰는 경우가 많고, 서버는 원래 사용자 IP를 X-Forwarded-For 헤더로 받습니다.',
      async run(a) {
        wipe(a);
        a.zone('zn', 16, 40, 280, 180, { label: '인터넷 구간 — 늘 잠금', color: 'blue' });
        a.zone('zi', 424, 40, 280, 180, { label: '데이터센터 안쪽 구간', color: 'gray' });
        a.node('u', 100, 136, { label: '사용자', icon: '🙂', color: 'blue', w: 96, h: 56 });
        a.node('l7', 360, 136, { label: 'L7 스위치', sub: '인증서·키 보관', icon: '🔑', color: 'violet', w: 124, h: 76 });
        a.node('s', 604, 136, { label: '웹 서버', icon: '🖥️', color: 'green', w: 108, h: 58 });
        a.edge('u', 'l7');
        a.edge('l7', 's');
        const rows = table(a, 95, 262, [['방식', 200], ['장비가 내용을 봄?', 170], ['안쪽 구간', 160]], [
          ['TLS 종료(오프로딩)', '봄 ✓', '평문 (잠금 없음)'],
          ['재암호화', '봄 ✓', '다시 잠금 🔒'],
          ['통과(패스스루)', '못 봄 — L4 방식', '잠긴 채, 서버가 풂'],
        ]);
        // 1) 종료: 장비에서 열고, 안쪽은 평문
        a.caption('잠긴 봉투가 도착 → 장비가 열쇠로 열어 용건 확인');
        let p = await a.send('u', 'l7', '🔒 ••••••', { color: 'blue', dur: 600, keep: true });
        await a.flash('l7');
        p.set('🔓 GET /api', 'amber');
        await a.move(p, 's', 600);
        await a.fadeOut(p, 140);
        a.badge('s', '풀 일 없음', 'green');
        await appear(a, rows[0]);
        // 2) 재암호화: 열어 보고 다시 잠가서 보냄
        a.caption('안쪽도 잠가야 한다면: 열어 보고 다시 잠가서 서버로');
        a.badge('s', null);
        p = await a.send('u', 'l7', '🔒 ••••••', { color: 'blue', dur: 520, keep: true });
        await a.flash('l7');
        p.set('🔓 GET /api', 'amber');
        await a.wait(300);
        p.set('🔒 다시 잠금', 'violet');
        await a.move(p, 's', 560);
        await a.fadeOut(p, 140);
        await appear(a, rows[1]);
        // 3) 패스스루: L4는 못 열고 그대로 통과
        a.setNode('l7', { label: 'L4 스위치', sub: '열쇠 없음', icon: '⚖️', color: 'amber' });
        a.caption('열쇠가 없는 L4: 잠긴 봉투를 그대로 통과 — 서버가 직접 엽니다');
        p = await a.send('u', 'l7', '🔒 ••••••', { color: 'blue', dur: 480, keep: true });
        await a.move(p, 's', 520);
        await a.fadeOut(p, 140);
        a.badge('s', '서버가 풂', 'amber');
        await appear(a, rows[2]);
        await a.wait(400);
      },
    },
    {
      t: '헬스 체크 — 문만 열려 있으면 괜찮은 걸까?',
      easy: '안내원은 수시로 서버들이 괜찮은지 확인합니다. L4는 "문(포트)이 열려 있나?"만 확인해요. 그런데 서버 프로그램이 멈춰서 오류만 내도 문은 열려 있을 수 있죠. L7은 "건강 상태 알려 주세요(GET /health)"라고 실제로 물어보고 대답 내용까지 확인해서, 이런 서버를 찾아 손님을 보내지 않습니다.',
      deep: 'L4 헬스 체크는 TCP 연결 성립(SYN→SYN-ACK)이나 UDP 응답만 봅니다. L7 헬스 체크는 GET /health 같은 요청의 상태 코드(200)와 본문 문자열까지 확인하고, 보통 간격 5~30초·연속 2~3회 실패 시 제외 같은 임계값을 둡니다. /health가 DB 같은 의존성까지 검사하면 DB 장애 하나로 모든 서버가 동시에 빠질 수 있어, 얕은(liveness) 검사와 깊은(readiness) 검사를 구분해 설계합니다.',
      async run(a) {
        wipe(a);
        a.node('u', 80, 220, { label: '사용자', icon: '🙂', color: 'blue', w: 96, h: 56 });
        a.node('lb', 300, 220, { label: '로드밸런서', sub: 'L4 검사: 포트', icon: '⚖️', color: 'amber', w: 136, h: 76 });
        SY3.forEach((y, i) => a.node('s' + i, 604, y, { label: `서버 ${i + 1}`, sub: '정상', icon: '🖥️', color: 'green', w: 128, h: 62 }));
        a.edge('u', 'lb', { id: 'eu' });
        SY3.forEach((_, i) => a.edge('lb', 's' + i, { id: 'e' + i }));
        a.setNode('s1', { sub: '앱 멈춤 😵', color: 'amber' });
        a.note('n-s2', 300, 372, '서버 2: 프로그램은 멈췄는데\n문(포트 443)은 열려 있음', { color: 'amber' });
        // L4 검사
        a.caption('L4 검사: "문 열려 있나요?" — 셋 다 열림');
        await a.par(...[0, 1, 2].map((i) => a.send('lb', 's' + i, '문 열림?', { color: 'teal', dur: 430 })));
        await a.par(...[0, 1, 2].map((i) => a.send('s' + i, 'lb', '열림 ✓', { color: 'green', dur: 430 })));
        a.badge('lb', '모두 정상?', 'amber');
        a.caption('그래서 서버 2에도 손님을 보냈더니…');
        const p = await a.send('u', 'lb', '요청', { color: 'blue', dur: 360, keep: true });
        await a.move(p, 's1', 360);
        p.set('500 오류', 'red');
        await a.move(p, ['lb', 'u'], 560);
        await a.fadeOut(p, 140);
        a.badge('u', '😡', 'red');
        a.remove('n-s2');
        // L7 검사
        a.setNode('lb', { sub: 'L7 검사: /health' });
        a.badge('lb', null);
        a.caption('L7 검사: GET /health로 실제 대답 내용까지 확인');
        await a.par(...[0, 1, 2].map((i) => a.send('lb', 's' + i, 'GET /health', { color: 'teal', dur: 430 })));
        await a.par(...[0, 1, 2].map((i) => a.send('s' + i, 'lb', i === 1 ? '500 ✕' : '200 OK', { color: i === 1 ? 'red' : 'green', dur: 430 })));
        a.setNode('s1', { sub: '풀에서 뺌', color: 'red' });
        a.hl('s1', true, 'red');
        await a.par(a.fade('s1', 0.45, 300), a.fade('e1', 0.15, 300));
        a.badge('lb', '풀: 1, 3', 'green');
        a.badge('u', null);
        const q = await a.send('u', 'lb', '요청', { color: 'blue', dur: 360, keep: true });
        await a.move(q, 's0', 360);
        q.set('200 OK', 'green');
        await a.move(q, ['lb', 'u'], 560);
        await a.fadeOut(q, 140);
        a.badge('u', '🙂', 'green');
        a.note('n-hc', 300, 372, '문만 보는 L4 검사는 "반쯤 죽은" 서버를 놓친다', { color: 'violet' });
        await a.wait(400);
      },
    },
    {
      t: '한눈에 비교 — 그리고 현장에서 만나는 이름들',
      easy: '정리하면 L4는 겉면만 보고 빠르게, L7은 속까지 보고 똑똑하게 나눕니다. 그래서 실제로는 앞단에서 L4로 빠르게 받고 뒤에서 L7로 세밀하게 나누는 식으로 함께 쓰는 경우도 많아요. 회사에서는 전용 장비, 서버에 까는 프로그램, 클라우드 서비스 형태로 만나고, 여러 지역 데이터센터 중 어디로 보낼지는 DNS 단계에서 정하기도 합니다.',
      deep: '형태는 ① 전용 하드웨어 어플라이언스(ADC), ② 소프트웨어 LB·리버스 프록시(오픈소스 프록시 서버, 쿠버네티스 인그레스 등), ③ 클라우드의 네트워크 로드밸런서(L4)와 애플리케이션 로드밸런서(L7)가 대표적입니다. 그 위에서 GSLB는 DNS 응답으로 지역·센터를 고르는데(헬스·지연·지리 기준), DNS 캐시(TTL) 때문에 전환이 즉시 반영되지 않으므로 애니캐스트와 함께 쓰기도 합니다. 선택 기준은 "내용을 봐야 하나(L7) 아니면 대량 트래픽을 싸고 빠르게 넘기면 되나(L4)"입니다.',
      async run(a) {
        wipe(a);
        const rows = table(a, 30, 40, [['', 120], ['L4 (봉투 겉면)', 270], ['L7 (봉투 속 용건)', 270]], [
          ['보는 것', 'IP · 포트 (TCP/UDP)', '주소 경로 · 헤더 · 쿠키'],
          ['나누는 단위', '연결마다', '요청마다'],
          ['세션 유지', '보낸 곳 IP 기준', '쿠키 기준'],
          ['HTTPS', '잠긴 채 통과', '열어서 봄 (인증서 필요)'],
          ['헬스 체크', '문(포트) 열림 확인', '/health 대답 내용까지'],
          ['속도 · 부담', '빠르고 가벼움', '똑똑하지만 더 무거움'],
        ]);
        a.caption('L4와 L7, 한눈에 비교');
        for (const r of rows) await appear(a, r, 260);
        a.text(360, 244, '현장에서 만나는 이름', { size: 13.5, weight: 800, layer: 'edge' });
        const chips = [
          ['하드웨어 장비 (어플라이언스)', 196, 280, 'amber'],
          ['소프트웨어 (리버스 프록시)', 524, 280, 'violet'],
          ['클라우드 네트워크 LB = L4', 196, 320, 'amber'],
          ['클라우드 애플리케이션 LB = L7', 524, 320, 'violet'],
          ['GSLB · DNS 분산 = 어느 데이터센터로?', 360, 360, 'teal'],
        ].map(([l, x, y, c]) => chip(a, l, x, y, c, { hidden: true, size: 12.5, h: 30 }));
        a.caption('같은 원리가 장비 · 프로그램 · 클라우드 서비스로 나옵니다');
        for (const c of chips) await appear(a, c, 220);
        a.note('n-end', 360, 402, '여러 지역 중 가까운·살아 있는 센터 주소를 DNS가 알려 줌', { color: 'teal', size: 11.5 });
        await a.wait(500);
      },
    },
  ],
};

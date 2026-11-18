// OSI 7계층: 층으로 나누는 이유 → 7층 표와 TCP/IP 4계층 → 보낼 때 헤더 붙이기 → 받을 때 벗기기
// → 장비마다 보는 층 → L4 vs L7 로드밸런서 → "몇 계층 문제?"로 점검하기
// 단계마다 무대를 새로 그린다. 주소·포트는 모두 설명용 예시(문서용 대역)다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 7, h: o.h || 28, w: o.w, size: o.size || 12.5, id: o.id, hidden: o.hidden });
}
function setPos(p, x, y) { p.x = x; p.y = y; p.g.setAttribute('transform', `translate(${x} ${y})`); }

// [층 번호, 이름, 하는 일(예), 색(TCP/IP 4계층 묶음 색)]
const OSI = [
  [7, '응용', 'HTTP · DNS · 메일', 'blue'],
  [6, '표현', '암호화 · 압축 · 글자 형식', 'blue'],
  [5, '세션', '대화 시작 · 유지 · 끝내기', 'blue'],
  [4, '전송', '포트 번호 · TCP/UDP', 'amber'],
  [3, '네트워크', 'IP 주소 · 길 찾기', 'green'],
  [2, '데이터링크', 'MAC 주소 · 옆 장비까지', 'violet'],
  [1, '물리', '전기 · 빛 · 전파 신호', 'violet'],
];
const oy = (n) => 84 + (7 - n) * 46;

// 캡슐화 조각: [글자, 너비, 색]
const PIECE = {
  data: ['HTTP 요청', 104, 'blue'],
  tcp: ['포트 443', 88, 'amber'],
  ip: ['IP 192.0.2.10', 120, 'green'],
  mac: ['MAC 주소', 96, 'violet'],
};
const ROWY = [70, 140, 210, 280, 350];
const GAP = 4;
/** 오른쪽(right)에 맞춰 늘어놓을 때 조각별 가운데 x */
function alignRight(list, right) {
  const out = {};
  let x = right;
  for (let i = list.length - 1; i >= 0; i--) { const w = PIECE[list[i]][1]; out[list[i]] = x - w / 2; x -= w + GAP; }
  return out;
}
/** 왼쪽(left)에 맞춰 늘어놓을 때 조각별 가운데 x */
function alignLeft(list, left) {
  const out = {};
  let x = left;
  for (const k of list) { const w = PIECE[k][1]; out[k] = x + w / 2; x += w + GAP; }
  return out;
}
const piece = (a, k, x, y, o = {}) => chip(a, PIECE[k][0], x, y, PIECE[k][2], { w: PIECE[k][1], hidden: o.hidden });

// 장비별 시야: [이름, 아래 설명, 볼 수 있는 가장 높은 층, 색, 판단 근거]
const DEV = [
  ['허브', 'L1까지', 1, 'gray', '신호 복사'],
  ['스위치', 'L2까지', 2, 'violet', 'MAC 주소'],
  ['라우터', 'L3까지', 3, 'green', 'IP 주소'],
  ['L4 스위치', 'L4까지', 4, 'amber', '포트 번호'],
  ['L7 장비', '웹 방화벽 등', 7, 'blue', 'URL · 내용'],
];
const TY = (n) => 92 + (7 - n) * 48;
const DX = (i) => 196 + i * 112;

export default {
  id: 'osi',
  level: 2,
  cat: '네트워크',
  title: "OSI 7계층 — L2·L4·L7의 'L'은 뭘까",
  sub: '통신을 7개 층으로 나눠 보는 지도. "L4 장비", "L7 로드밸런서"의 L은 이 층(Layer) 번호다.',
  analogy: '택배를 보낼 때 물건을 상자에 넣고, 송장을 붙이고, 트럭에 싣는 일을 서로 다른 담당자가 나눠 맡는 것과 같습니다. 받는 쪽에서는 트럭에서 내리고, 송장을 확인하고, 상자를 뜯어 물건을 꺼내는 순서로 거꾸로 풀어요. 각 담당자는 자기 일만 알면 되고, 트럭 회사가 바뀌어도 포장 방법은 그대로입니다.',
  keys: [
    '네트워크 통신은 여러 층으로 나뉘고, 각 층은 자기 일만 하면서 바로 아래층에 나머지를 맡긴다.',
    'OSI 7계층은 7 응용 · 6 표현 · 5 세션 · 4 전송 · 3 네트워크 · 2 데이터링크 · 1 물리로 이루어진 교과서 지도이고, 실제 인터넷은 이를 4층으로 묶은 TCP/IP 방식으로 돈다.',
    '보낼 때는 층을 내려가며 머리표(헤더)를 하나씩 붙이고(캡슐화), 받을 때는 아래층부터 하나씩 벗겨 올라간다.',
    '장비 이름의 L 숫자는 그 장비가 몇 층까지 들여다보고 판단하는지를 뜻한다. 스위치는 L2(MAC), 라우터는 L3(IP), L4 장비는 포트, L7 장비는 URL·내용까지 본다.',
    '문제가 생기면 "몇 계층 문제인가?"로 나눠 케이블 → IP → 포트 → 앱 순서로 아래부터 점검한다.',
  ],
  terms: [
    ['OSI 7계층', '통신 과정을 7개 층으로 나눈 국제 표준 참조 모델. 장비·문제를 설명하는 공통 언어로 쓰인다'],
    ['TCP/IP 4계층', '실제 인터넷이 쓰는 구조. 응용 · 전송 · 인터넷 · 네트워크 접근(링크)의 4층'],
    ['헤더(머리표)', '각 층이 데이터 앞에 붙이는 정보. 주소, 포트, 순서 번호 등이 들어 있다'],
    ['캡슐화', '내려가며 층마다 헤더를 덧붙여 포장하는 것. 받는 쪽에서 벗기는 것은 역캡슐화'],
    ['MAC 주소', '네트워크 카드마다 붙은 하드웨어 주소. 같은 동네(같은 망) 안에서 바로 옆 장비를 찾을 때 쓴다(L2)'],
    ['IP 주소', '인터넷 전체에서 기기를 찾아가는 주소. 라우터가 이걸 보고 길을 고른다(L3)'],
    ['포트', '한 컴퓨터 안에서 어느 프로그램에게 줄지 정하는 문 번호. 웹은 보통 443(L4)'],
    ['L4 / L7', 'L4는 IP·포트까지만 보고 판단, L7은 URL·헤더·쿠키 같은 내용까지 보고 판단'],
  ],
  quiz: [
    {
      q: '"L4 로드밸런서"에서 L4는 무슨 뜻일까요?',
      c: ['4세대 제품이라는 뜻', 'OSI 7계층 중 4층(전송 계층)의 정보, 즉 IP·포트까지 보고 판단한다는 뜻', '서버 4대를 묶어 쓴다는 뜻', '4번 포트를 쓴다는 뜻'],
      a: 1,
      why: 'L은 Layer(층)입니다. L4 장비는 4층 전송 계층의 포트 번호와 3층 IP 주소를 보고 어디로 보낼지 정합니다.',
      step: 1,
    },
    {
      q: '스위치(L2 스위치)가 받은 데이터를 어느 칸(포트)으로 내보낼지 정할 때 보는 것은?',
      c: ['도착지 IP 주소', '요청한 URL 경로', '도착지 MAC 주소', '프로그램의 포트 번호'],
      a: 2,
      why: '스위치는 2층 장비라 프레임의 MAC 주소만 보고, 어느 칸에 그 MAC이 있는지 적어 둔 표(MAC 주소 테이블)로 보냅니다. IP는 라우터(L3)가 봅니다.',
      step: 4,
    },
    {
      q: 'HTTPS 요청을 받는 L7 로드밸런서가 URL 경로(/cart 등)를 보고 서버를 나누려면 무엇이 필요할까요?',
      c: ['그 장비에서 TLS를 종료(복호화)할 수 있도록 인증서와 개인 키를 두어야 한다', '포트 번호만 443으로 맞추면 된다', '서버의 MAC 주소만 알면 된다', '아무것도 필요 없다 — HTTPS여도 URL 경로는 그대로 보인다'],
      a: 0,
      why: 'HTTPS에서는 URL 경로·헤더·쿠키가 모두 암호화돼 있습니다. L7 장비는 TLS를 직접 풀어야(종료) 내용을 볼 수 있고, 그래서 인증서·키를 장비에 둡니다. L4는 암호문을 그대로 넘깁니다.',
      step: 5,
    },
  ],
  setup(a) {
    a.text(360, 34, '통신을 7개 층으로 나눠 보는 지도', { size: 14, weight: 800 });
    OSI.forEach(([n, name, , c]) => a.node('cv' + n, 360, 70 + (7 - n) * 50, { label: `${n}층 ${name}`, color: c, w: 240, h: 40, size: 14 }));
    a.badge('cv7', 'L7', 'blue');
    a.badge('cv4', 'L4', 'amber');
  },
  steps: [
    {
      t: '왜 층으로 나눌까',
      easy: '택배를 보낼 때 물건 넣기, 상자 포장, 송장 붙이기, 트럭 운송은 담당이 따로 있어요. 각자 자기 일만 하고 나머지는 다음 담당에게 넘기죠. 받는 쪽은 거꾸로 트럭에서 내리고, 송장을 보고, 상자를 뜯습니다. 네트워크도 이렇게 일을 층(레이어)으로 나눠서 처리해요.',
      deep: '계층화의 핵심은 "아래층이 무엇이든 위층은 그대로"라는 분리입니다. 와이파이든 유선 이더넷이든 그 위의 IP·TCP·HTTP는 바뀌지 않고, 브라우저는 케이블 종류를 몰라도 됩니다. 같은 층끼리 지키는 약속을 프로토콜이라 하고, 바로 위·아래 층과는 정해진 창구(인터페이스)로만 주고받습니다. OSI 참조 모델은 ISO가 1984년에 표준으로 정리했습니다.',
      async run(a) {
        wipe(a);
        a.text(150, 40, '보내는 쪽 ↓ 포장', { size: 13, weight: 800, color: 'blue' });
        a.text(570, 40, '받는 쪽 ↑ 풀기', { size: 13, weight: 800, color: 'green' });
        const C = ['blue', 'amber', 'green', 'violet'];
        const Y = [92, 166, 240, 314];
        const S = [['물건 넣기', '무엇을 보낼까'], ['상자 포장', '깨지지 않게'], ['송장 붙이기', '어디로 갈까'], ['트럭 운송', '실제로 옮기기']];
        const R = [['물건 꺼내기', '내용 확인'], ['상자 뜯기', '포장 풀기'], ['송장 확인', '내 것 맞나?'], ['트럭 하차', '받아서 내리기']];
        for (let i = 0; i < 4; i++) {
          a.node('s' + i, 150, Y[i], { label: S[i][0], sub: S[i][1], color: C[i], w: 170, h: 50, hidden: true });
          a.node('r' + i, 570, Y[i], { label: R[i][0], sub: R[i][1], color: C[i], w: 170, h: 50, hidden: true });
        }
        a.edge('s3', 'r3', { id: 'road', label: '도로 (케이블·전파)', ly: 24, hidden: true });
        for (let i = 0; i < 4; i++) await a.show('s' + i, 110);
        for (let i = 3; i >= 0; i--) await a.show('r' + i, 110);
        await a.show('road', 200);
        const p = chip(a, '🎁 물건', 292, Y[0], 'pink', { w: 92 });
        const down = [[0, '🎁 물건'], [1, '📦 상자'], [2, '📦+송장'], [3, '🚚 운송']];
        for (const [i, l] of down) {
          a.hl('s' + i);
          p.set(l);
          if (i < 3) { await a.wait(180); await a.move(p, [292, Y[i + 1]], 320); }
          else await a.wait(180);
          a.hl('s' + i, false);
        }
        await a.move(p, [428, Y[3]], 600);
        const up = [[3, '📦+송장'], [2, '📦 상자'], [1, '🎁 물건'], [0, '🎁 도착!']];
        for (const [i, l] of up) {
          a.hl('r' + i);
          p.set(l);
          await a.wait(200);
          a.hl('r' + i, false);
          if (i > 0) await a.move(p, [428, Y[i - 1]], 320);
        }
        await a.fadeOut(p, 250);
        for (let i = 0; i < 3; i++) a.edge('s' + i, 'r' + i, { dashed: true, arrow: false, color: C[i], label: i === 0 ? '같은 층끼리의 약속 = 프로토콜' : null });
        a.note('n0', 360, 398, '층마다 자기 일만 하고 나머지는 아래층에 맡겨요', { color: 'amber' });
        a.caption('네트워크도 이렇게 일을 층으로 나눠요');
        await a.wait(700);
      },
    },
    {
      t: '7개 층 지도 — L4는 4층, L7은 7층',
      easy: 'OSI 7계층은 통신을 7층 건물처럼 나눈 지도예요. 맨 아래 1층은 전기 신호, 맨 위 7층은 우리가 쓰는 앱(웹 브라우저)입니다. 장비 이름의 "L4"는 4층(전송: 포트 번호를 다루는 층), "L7"은 7층(응용: 웹 요청 내용을 다루는 층)이라는 뜻이에요. 실제 인터넷은 이 7층을 4층으로 묶은 TCP/IP 방식으로 돕니다.',
      deep: 'OSI는 설명용 참조 모델이고, 실제 인터넷은 TCP/IP 스택(링크 · 인터넷 · 전송 · 응용)으로 동작합니다. 5층(세션)·6층(표현)의 일은 대부분 앱이나 라이브러리 안에 흡수되어 따로 장비가 없고, TLS처럼 TCP 위·HTTP 아래에 끼는 프로토콜은 어느 층이라 딱 잘라 말하기 애매합니다. 그래도 현업에서는 "L2 스위치, L3 라우팅, L4 로드밸런서, L7 방화벽"처럼 OSI 번호로 말하는 것이 공통어입니다.',
      async run(a) {
        wipe(a);
        a.text(170, 36, 'OSI 7계층 (교과서 지도)', { size: 13, weight: 800 });
        a.text(560, 36, 'TCP/IP 4계층 (실제 인터넷)', { size: 13, weight: 800 });
        for (const [n, name, ex, c] of OSI) {
          a.node('L' + n, 92, oy(n), { label: `${n}층 ${name}`, color: c, w: 150, h: 40, size: 14, hidden: true });
          a.text(180, oy(n), ex, { size: 12.5, anchor: 'start', cls: 'muted', id: 'x' + n, hidden: true });
        }
        for (let n = 1; n <= 7; n++) {
          await a.par(a.show('L' + n, 170), a.show('x' + n, 170));
        }
        const T = [
          ['t-app', 130, 130, '응용', 'HTTP · DNS · TLS', 'blue'],
          ['t-tr', 222, 40, '전송', 'TCP · UDP', 'amber'],
          ['t-in', 268, 40, '인터넷', 'IP', 'green'],
          ['t-ln', 337, 88, '네트워크 접근', '이더넷 · 와이파이', 'violet'],
        ];
        for (const [id, y, h, l, s, c] of T) a.node(id, 560, y, { label: l, sub: s, color: c, w: 210, h, hidden: true, size: 14 });
        OSI.forEach(([n, , , c]) => a.edge([398, oy(n)], [452, oy(n)], { id: 'k' + n, dashed: true, arrow: false, color: c, hidden: true }));
        for (const [id] of T) await a.show(id, 220);
        await a.par(...OSI.map(([n]) => a.show('k' + n, 300)));
        a.hl('L4', true, 'amber');
        a.badge('L4', 'L4', 'amber');
        const c4 = chip(a, 'L4 = 4층(전송) · 포트 · TCP/UDP', 190, 412, 'amber', { w: 290, hidden: true });
        await a.show(c4, 300);
        await a.flash('L4');
        a.hl('L7', true);
        a.badge('L7', 'L7', 'blue');
        const c7 = chip(a, 'L7 = 7층(응용) · HTTP 등', 540, 412, 'blue', { w: 230, hidden: true });
        await a.show(c7, 300);
        await a.flash('L7');
        a.caption('장비 이름의 L 숫자 = 이 지도의 층 번호');
        await a.wait(700);
      },
    },
    {
      t: '보낼 때 — 층마다 머리표를 붙이며 내려간다',
      easy: '브라우저가 만든 웹 요청(HTTP)이 아래층으로 내려가면서 머리표(헤더)가 하나씩 붙어요. 4층은 "몇 번 문(포트)으로 갈지", 3층은 "어느 기기(IP 주소)로 갈지", 2층은 "바로 옆 어느 장비(MAC 주소)에게 줄지"를 적습니다. 마지막 1층에서 전부 전기·빛 신호로 바뀌어 케이블을 탑니다.',
      deep: '층마다 단위를 다르게 부릅니다: TCP 세그먼트(UDP는 데이터그램), IP 패킷, 이더넷 프레임. 헤더 크기는 TCP·IPv4가 각각 최소 20바이트, 이더넷은 14바이트 헤더에 4바이트 FCS(오류 검사)가 꼬리로 붙습니다. 한 프레임에 실을 수 있는 IP 패킷 크기(MTU)는 보통 1,500바이트라 TCP 데이터는 약 1,460바이트(MSS)씩 나뉘고, VPN·터널은 헤더를 더 붙여 MTU를 줄이므로 MSS 조정이 필요해집니다. 5·6층은 대개 앱 안에서 처리되어 그림에서 생략했습니다.',
      async run(a) {
        wipe(a);
        a.text(400, 24, '보내는 쪽 — 한 층 내려갈 때마다 머리표(헤더)를 하나씩', { size: 13, weight: 700, cls: 'muted' });
        const LAY = [['L7 응용', 'HTTP'], ['L4 전송', '포트 · TCP'], ['L3 네트워크', 'IP 주소'], ['L2 데이터링크', 'MAC 주소'], ['L1 물리', '전기 · 빛 신호']];
        const LC = ['blue', 'amber', 'green', 'violet', 'teal'];
        LAY.forEach(([l, s], i) => a.node('e' + i, 76, ROWY[i], { label: l, sub: s, color: LC[i], w: 128, h: 48, size: 14 }));
        for (let i = 0; i < 4; i++) a.edge('e' + i, 'e' + (i + 1));
        const SEQ = [['data'], ['tcp', 'data'], ['ip', 'tcp', 'data'], ['mac', 'ip', 'tcp', 'data']];
        const R = 688;
        a.hl('e0');
        a.caption('브라우저가 웹 요청을 만들어요');
        const d0 = piece(a, 'data', 170, ROWY[0]);
        await a.move(d0, [alignRight(SEQ[0], R).data, ROWY[0]], 500);
        a.hl('e0', false);
        for (let r = 1; r < 4; r++) {
          const pos = alignRight(SEQ[r], R);
          const fresh = SEQ[r][0];
          a.hl('e' + r);
          const moves = SEQ[r - 1].map((k) => { const p = piece(a, k, pos[k], ROWY[r - 1]); return a.move(p, [pos[k], ROWY[r]], 450); });
          const h = piece(a, fresh, 190, ROWY[r]);
          a.caption(['4층: 포트 번호를 적은 TCP 헤더', '3층: 받는 기기 IP 주소를 적은 IP 헤더', '2층: 바로 옆 장비 MAC 주소를 적은 이더넷 헤더'][r - 1]);
          await a.par(...moves, a.move(h, [pos[fresh], ROWY[r]], 600));
          await a.flash(h);
          await a.wait(250);
          a.hl('e' + r, false);
        }
        a.hl('e4');
        const ghost = SEQ[3].map((k) => piece(a, k, alignRight(SEQ[3], R)[k], ROWY[3]));
        await a.par(...ghost.map((p) => a.move(p, [p.x, ROWY[4]], 450)));
        const sig = chip(a, '0 1 1 0 1 0 0 1 1 0 1 1 0 0 1 0 1 …', R - 214, ROWY[4], 'teal', { w: 428, hidden: true });
        await a.par(...ghost.map((p) => a.fadeOut(p, 300)), a.show(sig, 300));
        a.caption('1층: 모두 전기·빛 신호가 되어 케이블로');
        await a.flash(sig);
        a.text(400, 412, '안쪽(HTTP)부터 감싸고, 바깥(MAC)이 맨 앞에', { size: 12.5, weight: 700, color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '받을 때 — 아래에서부터 하나씩 벗긴다',
      easy: '받는 쪽은 거꾸로 1층부터 올라가며 머리표를 하나씩 확인하고 떼어 냅니다. 2층은 "내 MAC 주소 맞나?", 3층은 "내 IP 주소 맞나?", 4층은 "443번 문 → 웹 서버 프로그램에게"를 확인해요. 마지막에 7층의 웹 서버 프로그램이 요청 내용만 받아 읽습니다.',
      deep: '네트워크 카드는 도착 MAC이 자기 것(또는 브로드캐스트·멀티캐스트)인지와 FCS를 확인하고, 이더넷 헤더의 EtherType(0x0800 = IPv4)으로 다음 층을 고릅니다. IP 층은 목적지 IP를 확인하고 프로토콜 번호(6 = TCP, 17 = UDP)로 넘기며, TCP는 목적지 포트로 어느 소켓(프로그램)인지 찾습니다. 이렇게 헤더의 "다음 층 정보"를 보고 위로 나눠 주는 일을 역다중화라고 합니다.',
      async run(a) {
        wipe(a);
        a.text(320, 24, '받는 쪽 — 아래층부터 머리표를 확인하고 떼어 내기', { size: 13, weight: 700, cls: 'muted' });
        const LAY = [['L7 응용', '웹 서버 앱'], ['L4 전송', '포트 확인'], ['L3 네트워크', 'IP 확인'], ['L2 데이터링크', 'MAC 확인'], ['L1 물리', '신호 → 0과 1']];
        const LC = ['blue', 'amber', 'green', 'violet', 'teal'];
        LAY.forEach(([l, s], i) => a.node('d' + i, 644, ROWY[i], { label: l, sub: s, color: LC[i], w: 128, h: 48, size: 14 }));
        for (let i = 4; i > 0; i--) a.edge('d' + i, 'd' + (i - 1));
        const L = 30;
        a.hl('d4');
        const sig = chip(a, '0 1 1 0 1 0 0 1 1 0 1 1 0 0 1 0 1 …', 20, ROWY[4], 'teal', { w: 428 });
        await a.move(sig, [L + 214, ROWY[4]], 600);
        a.caption('1층: 케이블의 신호를 0과 1로 되돌려요');
        await a.wait(150);
        a.hl('d4', false);
        const SEQ = [['mac', 'ip', 'tcp', 'data'], ['ip', 'tcp', 'data'], ['tcp', 'data'], ['data']];
        const CHECK = ['내 MAC 맞나? ✓', '내 IP 맞나? ✓', '443번 문 → 웹 서버', '요청 내용을 읽음'];
        const CAP = ['2층: 내 MAC 주소 맞네 → 이더넷 헤더 떼기', '3층: 내 IP 주소 맞네 → IP 헤더 떼기', '4층: 443번 문 → 웹 서버 프로그램에게', '7층: 웹 서버가 요청만 받아 읽어요'];
        let prev = [sig], prevPos = null;
        for (let k = 0; k < 4; k++) {
          const row = 3 - k, y = ROWY[row], yPrev = ROWY[row + 1];
          const list = SEQ[k];
          const pos = alignLeft(list, L);
          const cur = list.map((name) => piece(a, name, prevPos ? prevPos[name] : pos[name], yPrev));
          a.hl('d' + row);
          await a.par(...cur.map((p, i) => a.move(p, [pos[list[i]], y], 400)), ...prev.map((p) => a.fade(p, 0.28, 300)));
          a.caption(CAP[k]);
          const t = a.text(512, y, CHECK[k], { size: 12, weight: 700, color: LC[row], hidden: true });
          await a.show(t, 200);
          await a.flash(k < 3 ? cur[0] : 'd0');
          if (k < 3) await a.fade(cur[0], 0.12, 220);
          await a.wait(100);
          a.hl('d' + row, false);
          prev = cur.slice(k < 3 ? 1 : 0);
          prevPos = pos;
        }
        a.text(250, 412, '바깥(MAC)부터 벗기고, 마지막에 HTTP 요청만 남아요', { size: 12.5, weight: 700, color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '장비는 몇 층까지 볼까',
      easy: '네트워크 장비 이름의 숫자는 그 장비가 몇 층까지 들여다보는지예요. 허브는 신호를 그냥 복사만 하고(1층), 스위치는 MAC 주소(2층), 라우터는 IP 주소(3층), L4 스위치는 포트 번호(4층), 웹 방화벽 같은 L7 장비는 웹 주소(URL)와 내용(7층)까지 보고 판단합니다. 높이 볼수록 똑똑하지만 할 일도 많아요.',
      deep: '허브는 받은 신호를 모든 포트로 되풀이하는 장비라 지금은 거의 쓰지 않고, 스위치는 MAC 주소 테이블을 학습해 해당 포트로만 보냅니다. 라우터는 라우팅 테이블에서 목적지 IP의 최장 접두사 일치로 다음 홉을 고르고, 홉마다 L2 헤더를 새로 씁니다. 사내망·데이터센터에서 VLAN 사이를 빠르게 라우팅하려고 스위치 칩에 라우팅 기능을 넣은 것이 "L3 스위치"이고, 국내에서 "L4 스위치"는 보통 L4 로드밸런서(ADC)를 뜻합니다. 차세대 방화벽(NGFW)처럼 L3~L7을 함께 보는 장비도 많아 실제 경계는 칼같지 않습니다.',
      async run(a) {
        wipe(a);
        for (let n = 1; n <= 7; n++) {
          const o = OSI[7 - n];
          a.node('tl' + n, 70, TY(n), { label: `L${n} ${o[1]}`, color: 'gray', w: 104, h: 40, size: n === 2 ? 12.5 : 13.5 });
        }
        DEV.forEach(([name, sub, , c], i) => {
          a.node('dv' + i, DX(i), 40, { label: name, sub, color: c, w: 100, h: 46, size: 14 });
          for (let n = 1; n <= 7; n++) {
            a.node(`cl${i}-${n}`, DX(i), TY(n), { label: '', color: 'gray', w: 96, h: 40, size: 12.5 });
            a.get(`cl${i}-${n}`).g.style.opacity = 0.22;
          }
        });
        a.caption('위로 올라갈수록 더 많이 들여다봐요');
        for (let i = 0; i < DEV.length; i++) {
          const [, , top, c, why] = DEV[i];
          a.hl('dv' + i);
          for (let n = 1; n <= top; n++) {
            a.setNode(`cl${i}-${n}`, { color: c });
            await a.fade(`cl${i}-${n}`, n === top ? 1 : 0.6, 90);
          }
          a.setNode(`cl${i}-${top}`, { label: why });
          a.hl(`cl${i}-${top}`, true);
          await a.flash(`cl${i}-${top}`);
          await a.wait(150);
          a.hl('dv' + i, false);
        }
        a.caption('L 숫자가 클수록 더 높이(더 자세히) 보고 판단해요');
        await a.wait(800);
      },
    },
    {
      t: 'L4 로드밸런서 vs L7 로드밸런서',
      easy: '같은 웹 요청이라도 장비마다 보는 게 달라요. L4 로드밸런서(손님을 여러 서버로 나눠 주는 장비)는 주소와 문 번호(포트)만 보고 "443번 손님이니 서버들에게 차례로" 나눠요. L7 로드밸런서는 요청 내용까지 열어 보고 "장바구니(/cart) 요청은 장바구니 서버로"처럼 나눕니다. 로드밸런서 주제에서 본 그 장치예요.',
      deep: 'L4 LB는 출발·목적지 IP와 포트, 프로토콜(5-튜플)로 연결 단위로 분배합니다. HTTP를 해석하지 않아 빠르고 프로토콜에 상관없으며, TLS를 풀지 않고 그대로 넘길(패스스루) 수 있습니다. L7 LB는 TCP 연결을 받아 직접 끝내는 프록시로 동작하고, TLS를 종료(복호화)한 뒤 Host·경로·헤더·쿠키로 라우팅하거나 헤더를 고치고 쿠키 기반 고정 세션을 만듭니다. 그만큼 CPU를 더 쓰고 인증서·키를 장비에 두어야 하며, 요즘 제품은 두 방식을 함께 지원하는 경우가 많습니다.',
      async run(a) {
        wipe(a);
        a.text(360, 22, '같은 요청 하나', { size: 12.5, weight: 700, cls: 'muted' });
        const REQ = [['IP 192.0.2.10', 122, 'green'], ['포트 443', 86, 'amber'], ['GET /cart', 100, 'blue'], ['Host·쿠키', 100, 'blue']];
        let x = 360 - (REQ.reduce((s, r) => s + r[1], 0) + 3 * 6) / 2;
        const top = REQ.map(([l, w, c]) => { const p = chip(a, l, x + w / 2, 52, c, { w, hidden: true }); x += w + 6; return p; });
        for (const p of top) await a.show(p, 140);
        a.zone('z4', 16, 86, 336, 338, { label: 'L4 로드밸런서 — IP·포트만 봄', color: 'amber' });
        a.zone('z7', 368, 86, 336, 338, { label: 'L7 로드밸런서 — 내용까지 봄', color: 'blue' });
        a.node('lb4', 184, 140, { label: 'L4 LB', color: 'amber', w: 120, h: 44 });
        a.node('lb7', 536, 140, { label: 'L7 LB', color: 'blue', w: 120, h: 44 });
        const S4 = [['a1', 74, '서버 1'], ['a2', 184, '서버 2'], ['a3', 294, '서버 3']];
        const S7 = [['b1', 426, '이미지'], ['b2', 536, '장바구니'], ['b3', 646, '회원']];
        for (const [id, sx, l] of S4) { a.node(id, sx, 330, { label: l, color: 'gray', w: 92, h: 44, size: 14 }); a.edge([184, 266], id, { id: 'e' + id }); }
        for (const [id, sx, l] of S7) { a.node(id, sx, 330, { label: l, sub: id === 'b1' ? '/img' : id === 'b2' ? '/cart' : '/login', color: 'gray', w: 92, h: 44, size: 14 }); a.edge([536, 266], id, { id: 'e' + id }); }
        await a.par(
          a.send([360, 70], [184, 112], 'GET /cart', { color: 'blue', w: 100, dur: 600 }),
          a.send([360, 70], [536, 112], 'GET /cart', { color: 'blue', w: 100, dur: 600 }),
        );
        // 각 장비가 "보는 것"
        const SEE = [['IP', 44, 'green'], ['443', 52, 'amber'], ['GET /cart', 96, 'blue'], ['Host·쿠키', 92, 'blue']];
        const row = (cx, blind) => {
          let xx = cx - (SEE.reduce((s, r) => s + r[1], 0) + 3 * 5) / 2;
          return SEE.map(([l, w, c], i) => {
            const hidden = blind && i >= 2;
            const p = chip(a, hidden ? '??? 안 봄' : l, xx + w / 2, 200, hidden ? 'gray' : c, { w, hidden: true, size: hidden ? 11.5 : 12.5 });
            xx += w + 5;
            return p;
          });
        };
        const r4 = row(184, true), r7 = row(536, false);
        await a.par(...r4.map((p, i) => a.fade(p, i >= 2 ? 0.45 : 1, 300)), ...r7.map((p) => a.show(p, 300)));
        const d4 = a.text(184, 244, '443번 손님 → 서버들에게 차례로', { size: 12.5, weight: 700, color: 'amber', hidden: true });
        const d7 = a.text(536, 244, '/cart → 장바구니 서버로', { size: 12.5, weight: 700, color: 'blue', hidden: true });
        await a.par(a.show(d4, 300), a.show(d7, 300));
        a.hl('a2'); a.hl('b2');
        a.hl('ea2'); a.hl('eb2');
        await a.par(
          a.send([184, 262], [184, 290], '연결 #2', { color: 'amber', w: 72, dur: 700 }),
          a.send([536, 262], [536, 290], '/cart', { color: 'blue', w: 60, dur: 700 }),
        );
        await a.par(a.flash('a2'), a.flash('b2'));
        a.text(184, 396, '내용을 안 열어 보니 빠르고 단순', { size: 12, cls: 'muted', weight: 700 });
        a.text(536, 396, '똑똑하지만 일이 더 많음 (암호 풀기)', { size: 12, cls: 'muted', weight: 700 });
        a.caption('같은 요청을 L4는 겉봉투만, L7은 편지 내용까지 봐요');
        await a.wait(900);
      },
    },
    {
      t: '정리 — "몇 계층 문제야?"',
      easy: '"사이트가 안 열려요"라는 문제가 생기면 아래층부터 차례로 확인해요. 1층: 선이 꽂혀 있나·와이파이에 붙었나 → 3층: IP 주소를 받았고 공유기까지 닿나 → 4층: 서버의 443번 문이 열려 있나 → 7층: 서버 프로그램이 제대로 답하나. 이 예시에서는 4층에서 막혀서, 방화벽 규칙을 먼저 보면 된다는 걸 알 수 있어요.',
      deep: '현업의 기본 순서는 링크 상태(케이블·무선 연결) → IP 설정·ARP·게이트웨이 ping → DNS 해석 → 포트 연결(nc -vz, PowerShell의 Test-NetConnection -Port) → 앱 응답(curl -v, HTTP 상태 코드)입니다. ping은 ICMP를 막아 둔 곳이 많아 실패해도 "서버가 죽었다"는 뜻은 아니고, 포트 연결이 거부(RST)되면 프로그램이 안 떠 있는 것, 시간 초과면 중간 방화벽이 버리는 경우가 흔합니다. 작은 페이지는 열리는데 큰 응답만 멈추면 MTU 문제를 의심합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 30, '🤔 "사이트가 안 열려요" — 몇 계층 문제일까?', { size: 14, weight: 800 });
        const CK = [
          ['k1', 360, 'L1 연결', '케이블 · 와이파이', '링크 불빛 · 와이파이 연결됨', 'green', '✓ 정상'],
          ['k3', 278, 'L3 주소', 'IP · 게이트웨이', 'IP 받음 · 게이트웨이 ping 응답', 'green', '✓ 정상'],
          ['k4', 196, 'L4 포트', '문이 열렸나', 'nc -vz 192.0.2.10 443 → 시간 초과', 'red', '✗ 막힘'],
          ['k7', 114, 'L7 앱', '서버 프로그램', '아래가 막혀서 볼 필요 없음', 'gray', '— 보류'],
        ];
        for (const [id, y, l, s] of CK) a.node(id, 120, y, { label: l, sub: s, color: 'gray', w: 152, h: 52, size: 14 });
        a.edge([28, 384], [28, 92], { color: 'teal' });
        a.text(120, 410, '↑ 아래층부터 차례로 점검', { size: 12, weight: 700, color: 'teal' });
        for (const [id, y, , , how, c, res] of CK) {
          a.hl(id);
          const t = a.text(212, y, how, { size: 12.5, anchor: 'start', mono: id === 'k4', hidden: true });
          await a.show(t, 250);
          await a.wait(250);
          a.setNode(id, { color: c });
          chip(a, res, 610, y, c, { w: 92 });
          if (id === 'k4') { a.hl(id, true, 'red'); await a.flash(id); } else a.hl(id, false);
          await a.wait(250);
        }
        a.note('n-fw', 548, 410, '→ 4층 문제! 방화벽 규칙(443)부터 확인', { color: 'red', w: 290 });
        a.caption('아래층부터 확인하면 어디서 막혔는지 빨리 찾아요');
        await a.wait(1000);
      },
    },
  ],
};

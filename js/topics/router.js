// 라우터: 스위치와의 차이 → 라우팅 테이블 → 가장 자세한 줄 우선·기본 경로 → 여러 홉·TTL·traceroute
// → 정적/동적 경로(OSPF·BGP) → 집 공유기 분해 → L3 스위치와 정리
// 장면이 단계마다 바뀌므로 각 장면 함수가 무대를 통째로 비우고 다시 그린다(빨리감기에도 같은 결과).
// 주소는 설명용 예시(사설 대역, 203.0.113.x·198.51.100.x 문서용 대역)다.

const ALL = ['zone', 'edge', 'node', 'pkt', 'top'];
const wipe = (a) => a.clear(...ALL);

/* ---------- 라우팅 테이블(2·3단계 공용) ---------- */
const ROWS = [
  ['192.168.1.0/24', '직접 연결', '문0', '우리 사무실', 'blue'],
  ['10.0.0.0/8', '라우터 B 172.16.0.2', '문1', '10.x.x.x 전부', 'violet'],
  ['10.1.2.0/24', '라우터 C 172.16.1.2', '문2', '10.1.2.x만', 'teal'],
  ['0.0.0.0/0', '통신사 203.0.113.1', '문3', '나머지 전부 (기본 경로)', 'green'],
];
const TY = [350, 372, 394, 416];
const TX = [32, 190, 380, 450];
const TB = { g: null, rows: [] };

function sceneTable(a) {
  wipe(a);
  TB.rows = [];
  a.node('me', 60, 140, { label: '내 PC', sub: '192.168.1.10', color: 'blue', w: 92, h: 52, size: 14 });
  a.node('rt', 260, 140, { label: '라우터', icon: '🔀', color: 'amber', w: 100, h: 66 });
  a.node('nbB', 450, 50, { label: '라우터 B', sub: '172.16.0.2', color: 'gray', w: 100, h: 48, size: 14 });
  a.node('nbC', 450, 140, { label: '라우터 C', sub: '172.16.1.2', color: 'gray', w: 100, h: 48, size: 14, hidden: true });
  a.node('isp', 450, 230, { label: '통신사', sub: '203.0.113.1', color: 'gray', w: 100, h: 48, size: 14, hidden: true });
  a.node('hq', 628, 50, { label: '본사망', sub: '10.x.x.x', color: 'violet', w: 124, h: 48, size: 14 });
  a.node('lab', 628, 140, { label: '연구소망', sub: '10.1.2.x', color: 'teal', w: 124, h: 48, size: 14, hidden: true });
  a.node('inet', 628, 230, { label: '🌐 인터넷', sub: '그 밖의 모든 곳', color: 'green', w: 124, h: 48, size: 14, hidden: true });
  a.edge('me', 'rt', { arrow: false, label: '문0', ly: -12 });
  a.edge('rt', 'nbB', { arrow: false, label: '문1', id: 'e1' });
  a.edge('rt', 'nbC', { arrow: false, label: '문2', id: 'e2', hidden: true });
  a.edge('rt', 'isp', { arrow: false, label: '문3', id: 'e3', hidden: true, ly: 12 });
  a.edge('nbB', 'hq', { arrow: false });
  a.edge('nbC', 'lab', { arrow: false, id: 'e2b', hidden: true });
  a.edge('isp', 'inet', { arrow: false, id: 'e3b', hidden: true });
  TB.g = a.raw('g', {}, 'edge');
  a.raw('rect', { x: 16, y: 290, width: 688, height: 140, rx: 12, style: 'fill: color-mix(in srgb, var(--amber) 5%, transparent); stroke: color-mix(in srgb, var(--amber) 55%, transparent); stroke-width: 1.5' }, TB.g);
  a.text(30, 306, '라우터의 길 안내표 (라우팅 테이블)', { par: TB.g, size: 12.5, weight: 800, anchor: 'start', color: 'amber' });
  ['목적지 대역', '다음 홉 (넘겨줄 곳)', '나가는 문', '뜻'].forEach((s, k) => a.text(TX[k], 327, s, { par: TB.g, size: 11.5, anchor: 'start', cls: 'muted' }));
  a.text(668, 327, '맞나?', { par: TB.g, size: 11.5, cls: 'muted' });
}
function addRow(a, i) {
  const [dst, hop, door, mean, color] = ROWS[i];
  const g = a.raw('g', {}, TB.g);
  const bg = a.raw('rect', { x: 24, y: TY[i] - 10, width: 672, height: 20, rx: 6, style: 'fill: color-mix(in srgb, var(--amber) 24%, transparent); opacity: 0' }, g);
  a.text(TX[0], TY[i], dst, { par: g, size: 12.5, mono: true, anchor: 'start', weight: 700, color });
  a.text(TX[1], TY[i], hop, { par: g, size: 12.5, anchor: 'start', weight: 600 });
  a.text(TX[2], TY[i], door, { par: g, size: 12.5, anchor: 'start', weight: 700 });
  a.text(TX[3], TY[i], mean, { par: g, size: 12, anchor: 'start', cls: 'muted' });
  const mark = a.text(668, TY[i], '', { par: g, size: 13, weight: 800 });
  g.style.opacity = 0;
  TB.rows[i] = { g, bg, mark };
  return a.tween(300, (k) => (g.style.opacity = k));
}
function rowBg(a, i, v, color = 'amber', dur = 160) {
  const bg = TB.rows[i].bg, v0 = parseFloat(bg.style.opacity) || 0;
  bg.style.fill = `color-mix(in srgb, var(--${color}) 24%, transparent)`;
  return a.tween(dur, (k) => (bg.style.opacity = v0 + (v - v0) * k));
}
function setMark(i, s, color) {
  const m = TB.rows[i].mark;
  m.textContent = s;
  m.setAttribute('class', 'tx' + (color ? ' tc-' + color : ' muted'));
}
function resetRows(a) {
  TB.rows.forEach((r, i) => { if (r) { r.bg.style.opacity = 0; setMark(i, ''); } });
}
/** 표를 위에서부터 훑으며 맞는 줄에 ✓, 아닌 줄에 ✗ */
async function scan(a, n, hits) {
  for (let i = 0; i < n; i++) {
    await rowBg(a, i, 1, 'amber', 150);
    await a.wait(90);
    setMark(i, hits.includes(i) ? '✓' : '✗', hits.includes(i) ? 'green' : null);
    await rowBg(a, i, hits.includes(i) ? 0.45 : 0, 'amber', 120);
  }
}

/* ---------- 홉·TTL 장면 ---------- */
const HOPS = [['R1', 210, '192.168.1.1'], ['R2', 360, '198.51.100.1'], ['R3', 510, '198.51.100.9']];
const LY = 130;

/* ---------- 공유기 분해 ---------- */
const PARTS = [
  ['pRt', '라우터', '🔀', '집 밖으로 길 잇기', 'amber'],
  ['pSw', '스위치', '🔌', '유선 포트 나누기', 'blue'],
  ['pNat', 'NAT', '🏷️', '주소 바꿔 적기', 'violet'],
  ['pDhcp', 'DHCP', '🎫', '주소 나눠 주기', 'teal'],
  ['pAp', '와이파이 AP', '📶', '무선으로 연결', 'green'],
];
const PX = [80, 220, 360, 500, 640];

export default {
  id: 'router',
  level: 2,
  cat: '네트워크',
  title: '라우터 — 네트워크와 네트워크를 잇는 교차로 (L3)',
  sub: '도착 주소를 보고 길 안내표에서 다음 갈 곳을 고르는 장비, 라우터가 길을 정하는 방법',
  analogy: '라우터는 큰 택배 허브의 분류 담당자와 같습니다. 상자에 적힌 주소를 보고 분류표에서 "서울 강남구는 3번 레일, 서울 나머지는 2번 레일, 그 밖은 전부 1번 레일"처럼 가장 자세히 맞는 줄을 찾아 다음 허브로 보내요. 목적지까지의 길 전체를 아는 게 아니라, 다음 허브까지만 정합니다.',
  keys: [
    '스위치는 같은 네트워크 안에서, 라우터는 서로 다른 네트워크 사이에서 패킷을 넘겨 준다. 라우터는 IP 주소를 보는 3계층(L3) 장비다.',
    '라우터는 라우팅 테이블에서 목적지 대역을 찾아 다음 홉(넘겨줄 라우터)과 나가는 문(인터페이스)을 고른다. 전체 경로가 아니라 다음 한 칸만 정한다.',
    '여러 줄이 맞으면 가장 자세한 줄(/숫자가 가장 큰 줄)을 고르고, 아무 줄도 맞지 않으면 기본 경로(0.0.0.0/0)로 보낸다.',
    '라우터를 지날 때마다 TTL이 1씩 줄고 0이 되면 버려진다. 길이 꼬여 생기는 무한 루프를 막는 장치이자 traceroute의 원리다.',
    '경로는 사람이 적어 두거나(정적 경로) 라우터끼리 알려 준다(동적 경로: 조직 안은 OSPF, 통신사·조직 사이는 BGP).',
  ],
  terms: [
    ['라우터', '서로 다른 네트워크를 잇고, 패킷의 도착 IP를 보고 다음으로 보낼 곳을 정하는 장비 (3계층)'],
    ['라우팅 테이블', '"이 대역으로 가려면 → 누구에게(다음 홉), 어느 문(인터페이스)으로"를 적은 길 안내표'],
    ['다음 홉', '패킷을 넘겨줄 바로 다음 라우터의 주소. 라우터는 여기까지만 정한다'],
    ['기본 경로', '0.0.0.0/0. 어떤 줄과도 맞지 않을 때 쓰는 "나머지는 전부 이쪽" 길. PC에서는 이 길의 다음 홉을 기본 게이트웨이라 부른다'],
    ['최장 일치', '여러 줄이 맞으면 /숫자가 가장 큰, 즉 가장 자세한 줄을 고르는 규칙'],
    ['TTL', '패킷이 더 지날 수 있는 라우터 수. 홉마다 1씩 줄고 0이 되면 버려진다'],
    ['OSPF · BGP', 'OSPF는 한 조직 안에서, BGP는 통신사·조직(AS) 사이에서 경로를 자동으로 주고받는 규칙'],
    ['L3 스위치', '라우팅 기능을 넣은 스위치. 회사 안 네트워크(VLAN) 사이를 하드웨어로 빠르게 라우팅한다'],
  ],
  quiz: [
    { q: '같은 사무실(같은 네트워크)에 있는 PC A가 PC B에게 파일을 보낼 때, 둘 사이에서 전달을 맡는 장비는?', c: ['라우터', '스위치', '통신사 장비', 'DNS 서버'], a: 1, why: '같은 네트워크 안에서는 스위치가 바로 전달합니다. 라우터는 다른 네트워크로 넘어갈 때 거칩니다.', step: 0 },
    { q: '라우팅 테이블에 10.0.0.0/8 → 본사, 10.1.2.0/24 → 연구소, 0.0.0.0/0 → 통신사가 있습니다. 10.1.2.7로 가는 패킷은 어디로 갈까요?', c: ['본사 — 표 위쪽에 있는 줄이 먼저라서', '통신사 — 기본 경로가 항상 우선이라서', '연구소 — 가장 자세하게(/24) 맞는 줄이 이겨서', '세 곳 모두에 복사해서 보낸다'], a: 2, why: '세 줄이 모두 맞지만, 라우터는 가장 자세한 줄(접두사가 가장 긴 /24)을 고릅니다. 기본 경로(/0)는 다른 줄이 하나도 맞지 않을 때만 쓰여요.', step: 2 },
    { q: 'traceroute가 경로 위 라우터들의 주소를 하나씩 알아내는 방법은?', c: ['TTL을 1, 2, 3…으로 늘려 보내고, TTL이 0이 된 라우터가 돌려보내는 ICMP 시간 초과 메시지의 출발 주소를 기록한다', '각 라우터에 로그인해 라우팅 테이블을 읽어 온다', '목적지 서버가 지나온 라우터 목록을 응답에 담아 보내 준다', 'DNS에 물어 경로 위 라우터 이름을 받아 온다'], a: 0, why: 'TTL이 0이 된 라우터는 패킷을 버리고 ICMP Time Exceeded를 출발지로 보냅니다. 그 응답의 출발 주소가 곧 n번째 홉의 주소예요. 응답을 막아 둔 라우터는 * * *로 표시됩니다.', step: 3 },
  ],
  setup(a) {
    TB.g = null;
    TB.rows = [];
    a.zone('z1', 16, 60, 272, 236, { label: '1층 네트워크 · 192.168.1.0/24', color: 'blue' });
    a.zone('z2', 432, 60, 272, 236, { label: '2층 네트워크 · 192.168.2.0/24', color: 'green' });
    a.node('pcA', 84, 122, { label: 'PC A', sub: '192.168.1.10', color: 'blue', w: 112, h: 52, size: 14 });
    a.node('pcB', 84, 236, { label: 'PC B', sub: '192.168.1.11', color: 'blue', w: 112, h: 52, size: 14 });
    a.node('sw1', 224, 179, { label: '스위치', color: 'blue', w: 84, h: 46, size: 14 });
    a.node('rt', 360, 179, { label: '라우터', icon: '🔀', color: 'amber', w: 100, h: 66 });
    a.node('sw2', 496, 179, { label: '스위치', color: 'green', w: 84, h: 46, size: 14 });
    a.node('pcC', 636, 122, { label: 'PC C', sub: '192.168.2.20', color: 'green', w: 112, h: 52, size: 14 });
    a.node('pcD', 636, 236, { label: 'PC D', sub: '192.168.2.21', color: 'green', w: 112, h: 52, size: 14 });
    for (const [p, q] of [['pcA', 'sw1'], ['pcB', 'sw1'], ['sw1', 'rt'], ['rt', 'sw2'], ['sw2', 'pcC'], ['sw2', 'pcD']]) a.edge(p, q, { arrow: false });
    a.text(360, 234, '왼쪽 문 192.168.1.1', { size: 11, cls: 'muted' });
    a.text(360, 251, '오른쪽 문 192.168.2.1', { size: 11, cls: 'muted' });
    a.text(360, 30, '층마다 네트워크(주소 대역)가 다른 회사', { size: 13, weight: 700, cls: 'muted' });
  },
  steps: [
    {
      t: '스위치는 같은 동네, 라우터는 동네와 동네 사이',
      easy: '1층 PC끼리는 스위치(같은 네트워크 안에서 전달해 주는 장비)만 거치면 바로 닿아요. 하지만 2층처럼 다른 네트워크로 가려면 둘 사이에 놓인 라우터를 꼭 지나야 합니다. PC는 "우리 층 밖으로 가는 건 일단 라우터에게"라고 미리 알고 있어요(기본 게이트웨이).',
      deep: '스위치는 2계층 장비로 MAC 주소를 보고 같은 서브넷(같은 VLAN) 안에서 프레임을 전달합니다. PC는 자기 IP와 서브넷 마스크로 목적지가 같은 대역인지 계산해, 다르면 기본 게이트웨이(여기선 192.168.1.1)의 MAC으로 프레임을 보냅니다(ARP로 조회). 라우터는 인터페이스마다 다른 서브넷에 속하고, 받은 프레임을 벗겨 IP 헤더를 본 뒤 나가는 쪽 이더넷 프레임으로 다시 씌워 보냅니다.',
      async run(a) {
        a.caption('같은 층 안: 스위치가 바로 전달');
        a.hl('sw1');
        await a.send('pcA', 'pcB', 'B에게', { via: ['sw1'], color: 'blue', dur: 1100 });
        a.hl('sw1', false);
        a.badge('pcB', '받음 ✓', 'green');
        await a.wait(300);
        a.caption('다른 층으로: 라우터가 넘겨 줘요');
        const p = a.packet('C에게', { at: 'pcA', color: 'amber' });
        await a.move(p, ['sw1', [310, 179]], 900);
        a.hl('rt');
        await a.flash('rt');
        await a.move(p, [[410, 179], 'sw2', 'pcC'], 900);
        await a.fadeOut(p, 200);
        a.hl('rt', false);
        a.badge('pcC', '받음 ✓', 'green');
        a.note('n0', 360, 360, '스위치: 같은 네트워크 안에서 전달 (MAC 주소, 2계층)\n라우터: 다른 네트워크로 넘겨 줌 (IP 주소, 3계층)', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '라우팅 테이블 — 안내표를 보고 다음 길을 고른다',
      easy: '라우터 안에는 "이 주소로 가는 패킷은 → 누구에게(다음 홉) → 몇 번 문으로(나가는 문)"가 적힌 안내표가 있어요. 10.5.0.9로 가는 패킷이 오자, 표에서 "10으로 시작하는 곳은 라우터 B에게"라는 줄을 찾아 1번 문으로 내보냅니다. 라우터는 끝까지의 길을 다 아는 게 아니라 다음 한 칸만 정해요.',
      deep: '라우팅 테이블의 한 줄은 목적지 접두사(prefix), 다음 홉 주소, 출력 인터페이스, 메트릭으로 이뤄집니다. 직접 연결된 서브넷은 인터페이스에 주소를 주는 순간 자동으로 들어갑니다(connected). 실제 장비는 이 표(RIB)에서 고른 결과를 포워딩 테이블(FIB)로 만들어 하드웨어에서 패킷마다 조회하고, 리눅스에서는 ip route 명령으로 볼 수 있습니다. 다음 라우터는 자기 표로 다시 독립적으로 판단합니다(hop-by-hop).',
      async run(a) {
        sceneTable(a);
        await addRow(a, 0);
        await addRow(a, 1);
        a.caption('도착 주소 10.5.0.9 — 표에서 찾아볼까요?');
        const p = a.packet('10.5.0.9', { at: 'me', color: 'violet' });
        await a.move(p, [168, 140], 700);
        a.hl('rt');
        await scan(a, 2, [1]);
        await rowBg(a, 1, 1, 'violet', 200);
        a.caption('"10.x.x.x는 라우터 B에게, 문1로"');
        await a.move(p, [310, 140], 0);
        await a.move(p, ['nbB', [566, 50]], 1000);
        await a.fadeOut(p, 200);
        a.hl('rt', false);
        a.badge('hq', '도착 ✓', 'green');
        a.note('n1', 190, 246, '라우터는 "다음 한 칸"만 정해요\n그다음은 라우터 B가 자기 표를 봐요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '가장 자세한 길이 우선, 나머지는 기본 경로',
      easy: '이번엔 10.1.2.7로 가는 패킷이에요. "10으로 시작하면 본사로", "10.1.2로 시작하면 연구소로", "나머지 전부는 통신사로" 세 줄이 모두 맞습니다. 이럴 땐 가장 자세하게 적힌 줄(10.1.2.x)이 이겨서 연구소로 가요. 어느 줄에도 안 맞는 인터넷 주소는 "나머지 전부" 줄, 즉 기본 경로를 따라 통신사로 갑니다.',
      deep: '최장 접두사 일치(longest prefix match): /24는 앞 24비트, /8은 앞 8비트가 같아야 하므로 /24가 더 구체적인 경로입니다. 0.0.0.0/0은 비교할 비트가 0개라 모든 주소와 맞는 "최후의 경로"입니다. 맞는 줄도 기본 경로도 없으면 패킷을 버리고 ICMP 목적지 도달 불가(Destination Unreachable)를 돌려보낼 수 있습니다. 메트릭·관리 거리는 같은 접두사를 놓고 고를 때 쓰이며, 접두사 길이 비교가 먼저입니다.',
      async run(a) {
        a.remove('n1');
        a.badge('hq', null);
        resetRows(a);
        await a.par(...['nbC', 'isp', 'lab', 'inet', 'e2', 'e3', 'e2b', 'e3b'].map((id) => a.show(id)));
        await addRow(a, 2);
        await addRow(a, 3);
        a.caption('도착 주소 10.1.2.7 — 맞는 줄이 여러 개!');
        const p = a.packet('10.1.2.7', { at: 'me', color: 'teal' });
        await a.move(p, [168, 140], 650);
        a.hl('rt');
        await scan(a, 4, [1, 2, 3]);
        a.caption('가장 자세한 줄(/24)이 이겨요');
        await rowBg(a, 2, 1, 'teal', 220);
        await a.move(p, [310, 140], 0);
        await a.move(p, ['nbC', [566, 140]], 900);
        await a.fadeOut(p, 200);
        a.badge('lab', '도착 ✓', 'green');
        resetRows(a);
        a.caption('198.51.100.20 — 10.으로 시작하지도 않아요');
        const q = a.packet('198.51.100.20', { at: 'me', color: 'green', w: 108, size: 11.5 });
        await a.move(q, [156, 140], 650);
        await scan(a, 4, [3]);
        a.caption('나머지 전부 → 기본 경로로');
        await rowBg(a, 3, 1, 'green', 220);
        await a.move(q, [310, 150], 0);
        await a.move(q, ['isp', [566, 230]], 900);
        await a.fadeOut(q, 200);
        a.hl('rt', false);
        a.badge('inet', '도착 ✓', 'green');
        a.note('n2', 182, 250, '여러 줄이 맞으면 가장 자세한 줄\n아무것도 안 맞으면 기본 경로', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '여러 라우터를 지나는 여정 — TTL과 traceroute',
      easy: '인터넷의 웹서버까지는 라우터 여러 개를 차례로 거쳐요(한 번 거치는 걸 "홉"이라 해요). 패킷에는 "앞으로 몇 번 더 거칠 수 있는지"를 뜻하는 숫자 TTL이 적혀 있고, 라우터를 지날 때마다 1씩 줄어요. 0이 되면 버려지니 길이 꼬여 빙빙 돌아도 영원히 떠돌지 않고, 이 성질로 경로를 한 칸씩 알아내는 도구가 traceroute입니다.',
      deep: 'IPv4 TTL(IPv6는 Hop Limit)은 8비트이고, 시작 값은 리눅스·macOS가 보통 64, 윈도우가 128입니다. TTL이 0이 된 라우터는 패킷을 버리고 ICMP Time Exceeded(유형 11)를 출발지로 돌려보냅니다. traceroute는 TTL을 1, 2, 3…으로 늘려 보내며 이 응답의 출발 주소와 왕복 시간을 기록합니다(리눅스 traceroute는 기본 UDP, 윈도우 tracert는 ICMP Echo, 홉마다 보통 3번). 응답을 막아 둔 라우터는 * * *로 표시됩니다.',
      async run(a) {
        wipe(a);
        a.node('src', 60, LY, { label: '내 PC', sub: '192.168.1.10', color: 'blue', w: 96, h: 52, size: 14 });
        for (const [id, x, ip] of HOPS) {
          a.node(id, x, LY, { label: id, icon: '🔀', color: 'gray', shape: 'circle', w: 58, size: 13 });
          a.text(x, LY + 44, ip, { size: 11, cls: 'muted', mono: true });
        }
        a.node('srv', 656, LY, { label: '웹서버', sub: '203.0.113.80', color: 'green', w: 96, h: 52, size: 14 });
        ['src', 'R1', 'R2', 'R3', 'srv'].reduce((p, q) => (a.edge(p, q, { arrow: false }), q));
        a.text(360, 40, '홉(라우터)을 지날 때마다 TTL −1', { size: 13, weight: 700, cls: 'muted' });
        const start = [138, LY];
        // ① TTL이 줄어드는 모습
        a.caption('TTL 64로 출발');
        const p = a.packet('TTL 64', { at: start, color: 'blue', w: 60, size: 12 });
        let ttl = 64;
        for (const [id, x] of HOPS) {
          await a.move(p, [x - 60, LY], 300);
          a.hl(id);
          ttl--;
          p.set(`TTL ${ttl}`);
          await a.wait(160);
          a.hl(id, false);
          await a.move(p, [x + 60, LY], 0);
        }
        await a.move(p, [578, LY], 200);
        a.badge('srv', 'TTL 61로 도착', 'green');
        await a.wait(350);
        await a.fadeOut(p, 200);
        a.badge('srv', null);
        // ② traceroute
        a.caption('traceroute: TTL을 1, 2, 3…으로 보내 보기');
        const box = a.raw('g', {}, 'edge');
        a.raw('rect', { x: 130, y: 210, width: 460, height: 132, rx: 12, style: 'fill: color-mix(in srgb, var(--violet) 6%, transparent); stroke: color-mix(in srgb, var(--violet) 50%, transparent); stroke-width: 1.5' }, box);
        a.text(146, 228, 'traceroute 203.0.113.80 결과', { par: box, size: 12.5, weight: 800, anchor: 'start', color: 'violet' });
        const res = [['R1', '192.168.1.1', '1 ms'], ['R2', '198.51.100.1', '6 ms'], ['R3', '198.51.100.9', '9 ms'], ['웹서버', '203.0.113.80', '11 ms']];
        for (let k = 1; k <= 4; k++) {
          const pr = a.packet(`TTL ${k}`, { at: start, color: 'violet', w: 60, size: 12 });
          let t = k, stopX = 578, who = 'srv';
          for (const [id, x] of HOPS) {
            await a.move(pr, [x - 60, LY], 220);
            t--;
            pr.set(`TTL ${t}`);
            if (t === 0) { stopX = x - 60; who = id; break; }
            await a.move(pr, [x + 60, LY], 0);
          }
          if (who === 'srv') await a.move(pr, [578, LY], 160);
          if (who !== 'srv') { pr.set(null, 'red'); a.hl(who, true, 'red'); }
          await a.wait(120);
          await a.fadeOut(pr, 120);
          const back = a.packet(who === 'srv' ? '응답' : '시간 초과', { at: [stopX, LY], color: who === 'srv' ? 'green' : 'red', size: 11.5 });
          await a.move(back, start, 380);
          await a.fadeOut(back, 120);
          if (who !== 'srv') a.hl(who, false);
          const y = 228 + k * 24;
          const [name, ip, ms] = res[k - 1];
          a.text(160, y, String(k), { size: 13, weight: 800, mono: true, color: 'violet', layer: 'edge' });
          a.text(196, y, ip, { size: 12.5, anchor: 'start', mono: true, weight: 600, layer: 'edge' });
          a.text(360, y, ms, { size: 12.5, anchor: 'start', mono: true, layer: 'edge' });
          a.text(430, y, k === 4 ? `${name} 도착!` : `${name} (시간 초과 응답)`, { size: 12, anchor: 'start', cls: k === 4 ? '' : 'muted', color: k === 4 ? 'green' : null, layer: 'edge' });
        }
        a.note('n3', 360, 394, '길이 꼬여 빙빙 돌아도 TTL이 0이 되면 버려져요 (무한 루프 방지)', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '길은 어떻게 알까 — 정적 경로와 동적 경로',
      easy: '안내표를 사람이 직접 적어 두는 것을 정적 경로라고 해요. 단순하지만 길이 끊겨도 표가 그대로라 계속 막힌 길로 보냅니다. 그래서 큰 네트워크에서는 라우터끼리 "나는 여기와 이어져 있어" 하고 소식을 주고받아 표를 자동으로 고치는 동적 경로를 써요. 회사 안에서는 OSPF, 인터넷의 통신사끼리는 BGP라는 규칙이 대표적입니다.',
      deep: '정적 경로는 작은 지점의 기본 경로나 특정 대역 지정에 흔하고, 장애에 따라 바꾸려면 BFD·경로 추적 같은 별도 장치가 필요합니다. OSPF는 링크 상태 방식으로 각 라우터가 같은 지도를 모아 다익스트라 알고리즘으로 최단 경로를 계산하며, 기본 타이머(Hello 10초·Dead 40초)만으로는 장애 감지에 수십 초가 걸릴 수 있어 BFD로 1초 이내로 줄이기도 합니다. BGP는 자율 시스템(AS) 사이에서 "이 대역은 우리 쪽으로"를 광고하는 경로 벡터 방식이고, 인터넷 전체 IPv4 경로는 대략 100만 개 규모입니다. 잘못된 광고나 설정 실수 하나로 대형 서비스가 몇 시간 끊기거나 트래픽이 엉뚱한 곳으로 샌 사고가 실제로 여러 번 있었고, RPKI 경로 검증 같은 대책이 퍼지고 있습니다.',
      async run(a) {
        wipe(a);
        const R = [['A', 90, 170], ['B', 250, 80], ['C', 250, 260], ['D', 410, 170]];
        for (const [k, x, y] of R) a.node('r' + k, x, y, { label: '라우터 ' + k, color: 'gray', w: 92, h: 46, size: 14 });
        a.node('dst', 590, 170, { label: '목적지망', sub: '10.9.0.0/16', color: 'violet', w: 120, h: 50, size: 14 });
        for (const [p, q] of [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']]) a.edge('r' + p, 'r' + q, { arrow: false, id: 'e' + p + q });
        a.edge('rD', 'dst', { arrow: false });
        a.caption('정적 경로: 사람이 "B로 가라"고 적어 둠');
        a.note('tA', 120, 372, '라우터 A의 표 (사람이 적음)\n10.9.0.0/16 → B로', { color: 'gray' });
        const p = a.packet('데이터', { at: 'rA', color: 'blue' });
        await a.move(p, ['rB', 'rD', [500, 170]], 1300);
        await a.fadeOut(p, 200);
        a.caption('B–D 사이 선이 끊어졌어요');
        const eBD = a.get('eBD').path;
        eBD.classList.add('dashed', 'ec-red');
        a.text(330, 125, '✕', { size: 22, weight: 800, color: 'red', id: 'xBD' });
        await a.flash('rB');
        const q = a.packet('데이터', { at: 'rA', color: 'blue' });
        await a.move(q, ['rB', [300, 105]], 800);
        q.set('✕ 막힘', 'red');
        a.caption('정적 경로는 고장을 몰라서 계속 B로 보내요');
        await a.wait(400);
        await a.fadeOut(q, 300);
        a.caption('동적 경로: 라우터끼리 소식을 주고받아요 (OSPF)');
        await a.par(
          a.send('rD', 'rC', '소식', { color: 'teal', dur: 600 }),
          a.send('rC', 'rA', '소식', { color: 'teal', dur: 600 }),
          a.send('rB', 'rA', 'D 끊김', { color: 'teal', dur: 600 }),
        );
        a.remove('tA');
        a.note('tA', 120, 372, '라우터 A의 표 (자동 갱신)\n10.9.0.0/16 → C로', { color: 'green' });
        await a.flash('rA');
        const r = a.packet('데이터', { at: 'rA', color: 'green' });
        await a.move(r, ['rC', 'rD', [500, 170]], 1300);
        await a.fadeOut(r, 200);
        a.badge('dst', '도착 ✓', 'green');
        a.note('n4', 572, 330, '회사 안: OSPF\n통신사끼리: BGP\n⚠ BGP 실수 → 큰 장애도', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '집 공유기를 열어 보면 — 다섯 장비가 한 몸에',
      easy: '공유기·NAT 주제에서 본 집 공유기는 사실 여러 장비를 한 상자에 담은 것이에요. 집과 인터넷을 잇는 라우터, 유선 포트를 나눠 주는 스위치, 주소를 바꿔 적는 NAT, 주소를 나눠 주는 DHCP, 무선으로 이어 주는 와이파이 AP(무선 접속 장치)까지요. 회사에서는 이 역할들을 각각 따로 된 장비가 맡습니다.',
      deep: '가정용 라우터는 보통 WAN 포트 1개와 LAN 스위치 포트 몇 개, NAPT, DHCP 서버, DNS 중계, 상태 기반 방화벽, 802.11 AP를 칩 하나에 담습니다. 기업망은 이를 엣지 라우터, L2/L3 스위치, 방화벽(NAT 포함), DHCP·DNS 서버, 무선 AP와 컨트롤러로 나눠 성능·이중화·관리를 따로 챙깁니다. 공유기를 "AP 모드(브리지 모드)"로 바꾸면 라우터·NAT·DHCP가 꺼지고 스위치 + AP로만 동작합니다.',
      async run(a) {
        wipe(a);
        a.node('box', 360, 116, { label: '집 공유기', icon: '📦', sub: '상자 하나', color: 'amber', w: 200, h: 92 });
        for (const [id, label, icon, sub, color] of PARTS) a.node(id, 360, 116, { label, icon, sub, color, w: 124, h: 74, size: 14, hidden: true });
        PARTS.forEach(([id]) => a.edge('box', id, { id: 'e-' + id, arrow: false, dashed: true, hidden: true }));
        a.caption('뚜껑을 열면…');
        await a.flash('box');
        await a.par(...PARTS.map(([id], i) => a.wait(i * 160).then(() => a.par(a.moveNode(id, PX[i], 286, 800), a.show(id, 500)))));
        a.setNode('box', { sub: '다섯 역할이 한 몸에' });
        await a.par(...PARTS.map(([id]) => a.show('e-' + id, 300)));
        a.caption('회사에서는 각각 따로 된 장비로');
        a.note('n5', 360, 390, '회사에서는 이 역할을 각각 따로 된 장비가 맡아요 (+ 방화벽)', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '정리 — 그리고 L3 스위치',
      easy: '회사 건물은 부서마다 네트워크를 나눠 두는데, 그 사이를 오가는 길 찾기는 일반 라우터 대신 "L3 스위치"가 맡는 경우가 많아요. 스위치처럼 포트가 많고 빠르면서, 라우터처럼 길도 찾아 주는 장비예요. 회사 바깥(인터넷·지사)으로 나가는 길은 여전히 라우터가 맡습니다.',
      deep: 'L3 스위치는 VLAN마다 가상 인터페이스(SVI)를 두고 VLAN 간 라우팅을 ASIC·TCAM 하드웨어로 처리해 포트 속도 그대로 전달합니다. 보통 코어·분배 계층에 두고 OSPF 정도는 돌리지만, 인터넷 전체 BGP 경로·다양한 WAN 회선·대규모 NAT·VPN은 라우터나 방화벽이 맡는 경우가 많습니다. 현장에서 말하는 "L3"는 3계층(IP)을 다룬다는 뜻이고, 장비 간 경계는 점점 흐려지고 있습니다.',
      async run(a) {
        wipe(a);
        const F = [['f1', '영업팀', 'VLAN 10 · 10.0.10.x', 80], ['f2', '개발팀', 'VLAN 20 · 10.0.20.x', 180], ['f3', '서버실', 'VLAN 30 · 10.0.30.x', 280]];
        for (const [id, label, sub, y] of F) a.node(id, 94, y, { label, sub, color: 'blue', w: 150, h: 54, size: 14 });
        a.node('l3', 330, 180, { label: 'L3 스위치', icon: '⚡', sub: '안쪽 망 사이', color: 'teal', w: 128, h: 76 });
        a.node('rt', 520, 180, { label: '라우터', icon: '🔀', sub: '바깥으로', color: 'amber', w: 104, h: 76 });
        a.node('inet', 652, 180, { label: '🌐 인터넷', sub: '지사·통신사', color: 'green', w: 96, h: 54, size: 14 });
        for (const [id] of F) a.edge(id, 'l3', { arrow: false });
        a.edge('l3', 'rt', { arrow: false });
        a.edge('rt', 'inet', { arrow: false });
        a.caption('영업팀 → 서버실: L3 스위치가 빠르게 라우팅');
        a.hl('l3');
        await a.send('f1', 'f3', '영업→서버', { via: ['l3'], color: 'teal', dur: 1200 });
        a.badge('l3', '하드웨어로 빠르게', 'teal');
        a.hl('l3', false);
        await a.wait(300);
        a.caption('회사 밖으로는 라우터가');
        a.hl('rt');
        await a.send('f2', 'inet', '인터넷으로', { via: ['l3', 'rt'], color: 'amber', dur: 1400 });
        a.hl('rt', false);
        a.note('n6', 360, 384, '스위치 = 같은 네트워크 안 · 라우터 = 네트워크와 네트워크 사이\n라우터는 표를 보고 다음 홉만 정해요 (가장 자세한 줄 우선)\nL3 스위치 = 스위치처럼 빠르게, 회사 안 망 사이를 라우팅', { color: 'teal' });
        await a.wait(900);
      },
    },
  ],
};

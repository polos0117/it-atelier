// 공유기와 와이파이: 공인 IP 하나 → DHCP로 사설 IP 나눠 주기 → NAT(나갈 때 주소 바꿔 적기·표에 기록)
// → 응답 되돌려 주기 → 포트로 여러 기기 구분 → 밖에서 먼저 오면 차단·포트포워딩 → 와이파이는 무선 구간
// 주소는 설명용 예시(203.0.113.x, 198.51.100.x는 문서용 주소 대역)다.
const R = { x: 282, y: 158 };
const PUB = '203.0.113.7';
const DEV = [
  ['phone', '📱 폰', 76, '192.168.0.10'],
  ['laptop', '💻 노트북', 158, '192.168.0.11'],
  ['tv', '📺 TV', 240, '192.168.0.12'],
];
const CARD = { x: 466, y: 50 };
const TY = [360, 384, 408]; // 표의 행 y
const TC = [34, 252, 446]; // 표의 열 x

// 변환표(NAT 테이블) — setup마다 새로 만든다
const T = { g: null, rows: [] };

function card(a, l1, l2) {
  const g = a.raw('g', { class: 'note c-teal', transform: `translate(${CARD.x} ${CARD.y})` }, 'top');
  a.raw('rect', { x: -102, y: -27, width: 204, height: 54, rx: 9, class: 'body' }, g);
  const t1 = a.text(-90, -11, l1, { par: g, size: 12.5, mono: true, anchor: 'start', weight: 600 });
  const t2 = a.text(-90, 12, l2, { par: g, size: 12.5, mono: true, anchor: 'start', weight: 600 });
  g.style.opacity = 0;
  return { g, t1, t2, show: () => a.tween(250, (k) => (g.style.opacity = k)) };
}
/** 봉투 한 줄을 고쳐 쓴다(깜빡 사라졌다가 새 글자로) */
async function rewrite(a, t, s, color) {
  await a.tween(220, (k) => (t.style.opacity = 1 - k));
  t.textContent = s;
  t.setAttribute('class', 'tx mono' + (color ? ' tc-' + color : ''));
  await a.tween(260, (k) => (t.style.opacity = k));
}
function addRow(a, i, cells, color) {
  const g = a.raw('g', {}, T.g);
  const bg = a.raw('rect', { x: 24, y: TY[i] - 11, width: 672, height: 22, rx: 6, style: `fill: color-mix(in srgb, var(--${color}) 22%, transparent); opacity: 0` }, g);
  cells.forEach((c, k) => a.text(TC[k], TY[i], c, { par: g, size: 12.5, mono: k > 0, anchor: 'start', weight: 600, color: k === 1 ? color : null }));
  a.text(TC[1] - 14, TY[i], '↔', { par: g, size: 14, cls: 'muted' });
  a.text(TC[2] - 14, TY[i], '↔', { par: g, size: 14, cls: 'muted' });
  g.style.opacity = 0;
  T.rows[i] = { g, bg };
  return a.tween(350, (k) => (g.style.opacity = k));
}
const rowHl = (a, i, on, dur = 250) => {
  const bg = T.rows[i].bg, v0 = parseFloat(bg.style.opacity) || 0;
  return a.tween(dur, (k) => (bg.style.opacity = v0 + ((on ? 1 : 0) - v0) * k));
};
const lookFlash = async (a, i) => { await rowHl(a, i, true, 220); await a.wait(260); };

export default {
  id: 'nat',
  level: 1,
  cat: '네트워크',
  title: '공유기와 와이파이 — 집 안의 작은 인터넷',
  sub: '폰·노트북·TV가 주소 하나로 동시에 인터넷을 쓰는 비밀, 공유기의 주소 변환(NAT)',
  analogy: '공유기는 아파트 경비실과 같습니다. 바깥에서 보이는 주소는 "○○아파트" 하나뿐이고, 집집마다의 호수는 안에서만 통합니다. 주민이 편지를 보내면 경비실이 "답장은 경비실 몇 번 칸으로" 하고 장부에 적어 두었다가, 답장이 오면 장부를 보고 그 집에 전해 줍니다. 장부에 없는 낯선 우편은 받아 주지 않아요.',
  keys: [
    '통신사는 집에 공인 IP를 보통 하나만 준다. 인터넷 쪽에서 보이는 우리 집 주소는 이것 하나다.',
    '공유기는 DHCP로 집 안 기기마다 사설 IP(192.168.0.x 등)를 나눠 준다. 사설 IP는 집 안에서만 통한다.',
    '기기가 밖으로 보낼 때 공유기는 출발지 주소를 "공인 IP:포트"로 바꿔 적고 변환표(NAT 테이블)에 기록한다. 응답은 표를 보고 원래 기기로 돌려준다.',
    '여러 기기가 동시에 요청해도 바깥 포트 번호가 달라서 구분된다. 밖에서 먼저 들어오는 요청은 표에 없어서 막히므로, 받으려면 포트포워딩이 필요하다.',
    '와이파이는 기기와 공유기 사이의 무선 구간일 뿐이다. 2.4GHz는 멀리 가고, 5GHz는 빠르지만 가까이서만 잘 된다.',
  ],
  terms: [
    ['공인 IP', '인터넷 전체에서 하나뿐인 주소. 통신사가 집(공유기)에 준다'],
    ['사설 IP', '집·회사 안에서만 쓰는 주소(192.168.x.x, 10.x.x.x 등). 다른 집과 겹쳐도 된다'],
    ['DHCP', '새로 들어온 기기에 IP 주소·게이트웨이·DNS 정보를 자동으로 나눠 주는 규칙'],
    ['NAT', '공유기가 사설 주소를 공인 주소로 바꿔 적고, 돌아온 응답을 원래 기기로 되돌리는 주소 변환'],
    ['포트', '한 주소 안에서 대화(연결)를 구분하는 번호(0~65535). 웹은 보통 443번'],
    ['포트포워딩', '"바깥 몇 번 포트로 오면 집 안 이 기기로" 미리 정해 두는 고정 규칙'],
    ['와이파이', '기기와 공유기(무선 AP)를 전파로 잇는 기술. 2.4GHz·5GHz·6GHz 대역을 쓴다'],
  ],
  quiz: [
    { q: '공유기가 집 안 기기들에 나눠 주는 192.168.0.x 같은 주소는 무엇일까요?', c: ['인터넷 어디서나 통하는 공인 IP', '집 안에서만 통하는 사설 IP', '통신사가 기기마다 따로 준 고유 주소', '와이파이 비밀번호로 만든 임시 주소'], a: 1, why: '192.168.x.x는 사설 IP라서 집 안에서만 쓰입니다. 다른 집에서도 똑같은 주소를 쓰고, 인터넷에 나갈 때는 공유기가 공인 IP로 바꿔 적어요.', step: 1 },
    { q: '폰과 노트북이 동시에 같은 웹사이트에 요청했습니다. 돌아온 응답을 공유기는 어떻게 제 주인에게 보낼까요?', c: ['응답 내용을 열어 보고 누구 것인지 짐작한다', '먼저 요청한 기기에 먼저 보낸다', '집 안 모든 기기에 똑같이 복사해 보낸다', '응답이 도착한 바깥 포트 번호(40001, 40002)를 변환표에서 찾는다'], a: 3, why: '나갈 때 기기마다 다른 바깥 포트를 붙여 표에 적어 두었기 때문에, 응답의 도착 포트만 보면 어느 기기 것인지 알 수 있습니다(PAT).', step: 4 },
    { q: '통신사가 CGNAT를 써서 공유기의 바깥 주소가 100.64.x.x인 집에서, 공유기에 포트포워딩을 설정하면 어떻게 될까요?', c: ['정상적으로 외부 접속이 들어온다', '공유기가 자동으로 IPv6로 바꿔 받아 준다', '통신사 NAT에 해당 규칙이 없어 외부에서 먼저 오는 연결은 여전히 막힌다', '포트포워딩은 DHCP가 처리하므로 아무 영향이 없다'], a: 2, why: 'CGNAT에서는 공유기 바깥 주소도 공인 IP가 아니라 통신사 NAT 안쪽 주소입니다. 바깥 연결은 통신사 NAT에서 먼저 막히므로 집 공유기의 포트포워딩만으로는 받을 수 없습니다.', step: 5 },
  ],
  setup(a) {
    T.g = null;
    T.rows = [];
    a.zone('home', 16, 16, 344, 278, { label: '우리 집 · 사설망', color: 'blue' });
    a.node('router', R.x, R.y, { label: '공유기', icon: '📶', sub: '', w: 124, h: 72, color: 'amber' });
    for (const [id, label, y] of DEV) {
      a.node(id, 82, y, { label, sub: '주소 없음', w: 116, h: 52, size: 14, color: 'blue' });
      a.edge(id, 'router', { id: 'e-' + id, arrow: false });
    }
    a.node('net', 466, R.y, { label: '🌐 인터넷', w: 104, h: 50, size: 14, color: 'gray' });
    a.node('web', 644, 96, { label: '🌍 웹사이트', sub: '198.51.100.20', w: 112, h: 54, size: 14, color: 'green' });
    a.node('str', 644, 236, { label: '👤 낯선 기기', sub: '198.51.100.99', w: 112, h: 54, size: 14, color: 'red', hidden: true });
    a.edge('router', 'net', { id: 'e-up', arrow: false });
    a.edge('net', 'web', { arrow: false });
    a.edge('net', 'str', { id: 'e-str', arrow: false, hidden: true });
    // 변환표(처음엔 숨김)
    T.g = a.raw('g', { style: 'opacity: 0' }, 'edge');
    a.raw('rect', { x: 16, y: 302, width: 688, height: 124, rx: 12, style: 'fill: color-mix(in srgb, var(--amber) 5%, transparent); stroke: color-mix(in srgb, var(--amber) 55%, transparent); stroke-width: 1.5' }, T.g);
    a.text(30, 316, '공유기의 변환표 (NAT 테이블)', { par: T.g, size: 12.5, weight: 800, anchor: 'start', color: 'amber' });
    ['집 안 기기 (사설 IP:포트)', '바깥에 보이는 주소', '상대'].forEach((s, k) => a.text(TC[k], 337, s, { par: T.g, size: 11.5, anchor: 'start', cls: 'muted' }));
  },
  steps: [
    {
      t: '공유기 하나, 바깥 주소도 하나',
      easy: '집에는 폰·노트북·TV가 있고, 공유기 하나가 이들을 인터넷과 이어 줍니다. 통신사는 우리 집에 인터넷용 주소(공인 IP)를 딱 하나만 줘요. 바깥 세상에서 보면 우리 집 주소는 이것 하나뿐입니다.',
      deep: '통신사는 공유기의 WAN 포트에 DHCP나 PPPoE로 공인 IPv4 주소 하나를 할당합니다. IPv4 주소는 32비트, 약 43억 개뿐이라 2011년 IANA의 주소 풀이 바닥났고, 가정마다 기기 수만큼 공인 주소를 줄 수 없습니다. 그래서 집 안은 사설 주소를 쓰고 공유기가 주소를 변환합니다.',
      async run(a) {
        a.caption('통신사가 우리 집에 주소를 하나 줘요');
        await a.flash('router');
        a.hl('router');
        await a.send('net', 'router', '공인 IP', { color: 'amber', dur: 800 });
        a.setNode('router', { sub: '공인 ' + PUB });
        await a.flash('router');
        a.hl('router', false);
        a.note('n1', 360, 360, `바깥에서 보이는 우리 집 주소는 ${PUB} 하나뿐\n그런데 기기는 셋 — 어떻게 같이 쓸까요?`, { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: 'DHCP — 집 안 주소 나눠 주기',
      easy: '기기가 와이파이에 연결되면 공유기에 "저 주소 좀 주세요" 하고 외칩니다. 공유기는 192.168.0.10, .11, .12처럼 집 안에서만 쓰는 번호(사설 IP)를 하나씩 나눠 줘요. 아파트의 호수 같은 번호라 옆집과 겹쳐도 괜찮습니다.',
      deep: 'DHCP는 Discover → Offer → Request → Ack(DORA) 4단계로 UDP 67/68번 포트를 쓰며, 처음엔 주소가 없으니 브로드캐스트로 묻습니다. IP와 함께 서브넷 마스크(255.255.255.0), 기본 게이트웨이(공유기 192.168.0.1), DNS 서버, 임대 시간도 받습니다. RFC 1918 사설 대역은 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16이며 인터넷에서는 라우팅되지 않습니다.',
      async run(a) {
        a.clear();
        a.caption('"주소 주세요!" — 기기마다 하나씩');
        await a.par(...DEV.map(([id, , , ip], i) => a.wait(i * 420)
          .then(() => a.send(id, 'router', '주소 주세요', { color: 'blue', dur: 650 }))
          .then(() => a.send('router', id, ip, { color: 'amber', dur: 650 }))
          .then(() => { a.setNode(id, { sub: ip }); return a.flash(id); })));
        a.note('n2', 360, 360, '192.168.x.x = 집 안에서만 통하는 주소 (사설 IP)\n공유기 자신은 192.168.0.1', { color: 'blue' });
        await a.wait(600);
      },
    },
    {
      t: '나가는 길 — 출발지 주소를 바꿔 적기',
      easy: '폰이 웹사이트에 요청을 보냅니다. 그런데 "보낸 곳: 192.168.0.10"은 집 밖에서는 통하지 않는 주소예요. 그래서 공유기가 봉투의 보낸 곳을 우리 집 공인 주소와 번호표(포트 40001)로 고쳐 적고, 이 사실을 변환표에 적어 둡니다.',
      deep: '가정용 공유기의 NAT는 정확히는 NAPT(PAT)입니다. 출발지 IP뿐 아니라 출발지 포트도 바꾸고, IP·TCP/UDP 체크섬을 다시 계산합니다. 매핑은 (프로토콜, 내부 IP:포트) ↔ 외부 포트, 상대 주소로 연결 추적 테이블(conntrack)에 저장됩니다. 웹사이트 쪽에서는 요청이 203.0.113.7:40001에서 온 것으로만 보입니다.',
      async run(a) {
        a.clear();
        await a.fade(T.g, 1, 350).catch(() => {});
        a.hl('phone');
        const p = await a.send('phone', 'router', '요청', { color: 'blue', dur: 700, keep: true });
        const c = card(a, '출발 192.168.0.10:5000', '도착 웹사이트:443');
        await c.show();
        a.caption('이 주소로는 밖에서 답장을 못 보내요');
        await a.wait(500);
        a.hl('router');
        await a.flash('router');
        await rewrite(a, c.t1, `출발 ${PUB}:40001`, 'amber');
        a.caption('보낸 곳을 고쳐 적고, 표에 기록!');
        await addRow(a, 0, ['📱 192.168.0.10:5000', `${PUB}:40001`, '웹사이트:443'], 'amber');
        p.set(null, 'amber');
        await a.move(p, ['net', 'web'], 900);
        await a.fadeOut(p, 200);
        await a.flash('web');
        a.hl('phone', false);
        a.hl('router', false);
        await a.wait(300);
      },
    },
    {
      t: '돌아오는 길 — 표를 보고 되돌려 주기',
      easy: '웹사이트는 "203.0.113.7의 40001번"으로 답장을 보냅니다. 공유기는 변환표에서 40001번을 찾아보고 "아, 폰(192.168.0.10)이 보낸 거구나" 하고 도착 주소를 고쳐 폰에게 넘겨 줘요.',
      deep: '역방향 패킷의 목적지(공인 IP:40001)로 매핑을 찾아 목적지를 192.168.0.10:5000으로 되돌립니다(de-NAT). 매핑에는 유효 시간이 있어서 UDP는 보통 수십 초~몇 분, TCP는 연결이 끝나거나 오래 조용하면 지워집니다. 그래서 오래 열어 두는 연결은 주기적으로 keepalive를 보내 매핑을 살려 둡니다.',
      async run(a) {
        a.clear();
        const p = a.packet('응답', { at: 'web', color: 'green' });
        await a.move(p, ['net', 'router'], 900);
        const c = card(a, '출발 웹사이트:443', `도착 ${PUB}:40001`);
        await c.show();
        a.hl('router');
        a.caption('40001번… 표를 찾아보면?');
        await lookFlash(a, 0);
        await rewrite(a, c.t2, '도착 192.168.0.10:5000', 'blue');
        a.caption('폰이 보낸 요청의 답장이네요');
        await a.move(p, 'phone', 700);
        await a.fadeOut(p, 200);
        a.hl('router', false);
        a.hl('phone', true, 'green');
        a.badge('phone', '받음 ✓', 'green');
        await a.flash('phone');
        await rowHl(a, 0, false);
        a.hl('phone', false);
        await a.wait(300);
      },
    },
    {
      t: '동시에 요청해도 — 포트 번호로 구분',
      easy: '이번엔 노트북도 같은 웹사이트에 요청합니다. 공유기는 노트북에는 다른 번호표(40002)를 붙여요. 답장이 동시에 와도 40001은 폰, 40002는 노트북으로 정확히 나눠 줄 수 있습니다.',
      deep: '공인 IP 하나에 바깥 포트 1024~65535를 나눠 쓰므로 프로토콜마다 수만 개의 동시 연결을 구분할 수 있습니다(PAT). 두 기기의 내부 포트가 똑같이 5000이어도 바깥 포트가 달라 충돌하지 않습니다. 같은 내부 주소·포트에는 상대가 달라도 같은 바깥 포트를 주는 방식(endpoint-independent mapping)이 P2P 연결에 유리합니다.',
      async run(a) {
        a.clear();
        a.badge('phone', null);
        a.hl('laptop');
        const p = await a.send('laptop', 'router', '요청', { color: 'blue', dur: 650, keep: true });
        const c = card(a, '출발 192.168.0.11:5000', '도착 웹사이트:443');
        await c.show();
        a.caption('안쪽 포트는 폰과 똑같이 5000!');
        await a.wait(300);
        await rewrite(a, c.t1, `출발 ${PUB}:40002`, 'violet');
        await addRow(a, 1, ['💻 192.168.0.11:5000', `${PUB}:40002`, '웹사이트:443'], 'violet');
        p.set(null, 'violet');
        await a.move(p, ['net', 'web'], 800);
        await a.fadeOut(p, 200);
        a.hl('laptop', false);
        a.caption('답장 두 개가 한꺼번에 도착하면?');
        const r1 = a.packet(':40001', { at: 'web', color: 'amber' });
        const r2 = a.packet(':40002', { at: 'web', color: 'violet' });
        await a.par(a.move(r1, ['net', [R.x + 70, R.y - 16]], 800), a.move(r2, ['net', [R.x + 70, R.y + 16]], 800));
        await a.par(lookFlash(a, 0), lookFlash(a, 1));
        await a.par(a.move(r1, 'phone', 700), a.move(r2, 'laptop', 700));
        await a.par(a.fadeOut(r1, 200), a.fadeOut(r2, 200));
        a.badge('phone', '✓', 'green');
        a.badge('laptop', '✓', 'green');
        await a.par(rowHl(a, 0, false), rowHl(a, 1, false));
        a.caption('바깥 포트가 달라서 헷갈리지 않아요');
        await a.wait(400);
      },
    },
    {
      t: '밖에서 먼저 오면 — 차단과 포트포워딩',
      easy: '이번엔 낯선 기기가 먼저 우리 집 주소로 들어오려고 합니다. 변환표에 해당 번호가 없으니 공유기는 누구에게 줄지 몰라 버려요. 그래서 집에서 게임 서버나 NAS를 열려면 "8080번으로 오면 노트북으로"처럼 포트포워딩 규칙을 미리 적어 둬야 합니다.',
      deep: '매핑이 없는 인바운드 패킷은 버려지므로 NAT는 결과적으로 기본 방화벽처럼 동작합니다. 포트포워딩은 고정 DNAT 규칙이고, UPnP IGD·NAT-PMP·PCP로 앱이 자동 등록하기도 합니다. 양쪽 다 NAT 뒤인 P2P·화상통화는 STUN으로 바깥 주소를 알아내 홀 펀칭을 하고, 실패하면 TURN 중계를 씁니다(ICE). 통신사가 CGNAT(100.64.0.0/10)를 쓰면 공유기 바깥도 사설 주소라 포트포워딩이 통하지 않습니다.',
      async run(a) {
        a.clear();
        a.badge('phone', null);
        a.badge('laptop', null);
        await a.par(a.show('str'), a.show('e-str'));
        const p = a.packet('접속?', { at: 'str', color: 'red' });
        await a.move(p, ['net', 'router'], 900);
        const c = card(a, '출발 198.51.100.99:3333', `도착 ${PUB}:8080`);
        await c.show();
        a.hl('router', true, 'red');
        a.caption('8080번? 표에 없어요');
        await a.wait(500);
        p.set('✕ 버림', 'red');
        await a.flash('router');
        await a.fadeOut(p, 400);
        a.hl('router', false);
        a.caption('미리 규칙을 적어 두면 — 포트포워딩');
        await addRow(a, 2, ['💻 192.168.0.11:8080', `${PUB}:8080`, '누구든 (고정 규칙)'], 'green');
        await rowHl(a, 2, true);
        const q = a.packet('접속', { at: 'str', color: 'green' });
        await a.move(q, ['net', 'router'], 800);
        await rewrite(a, c.t2, '도착 192.168.0.11:8080', 'green');
        await a.move(q, 'laptop', 600);
        await a.fadeOut(q, 200);
        a.hl('laptop', true, 'green');
        a.badge('laptop', '게임 서버', 'green');
        await a.flash('laptop');
        a.hl('laptop', false);
        await a.wait(300);
      },
    },
    {
      t: '와이파이 — 공유기까지의 무선 구간',
      easy: '와이파이는 기기와 공유기 사이를 선 대신 전파로 이어 주는 부분일 뿐이에요. 공유기에서 바깥 인터넷까지는 통신사 회선(유선)으로 이어집니다. 2.4GHz는 멀리·벽 너머까지 닿지만 느리고, 5GHz는 빠르지만 가까이에서만 잘 됩니다.',
      deep: '가정용 "공유기"는 라우터(NAT·DHCP)·스위치·무선 AP·방화벽을 한 상자에 담은 것이고, 와이파이(IEEE 802.11)는 그중 기기–AP 사이의 물리·링크 계층만 담당합니다. 2.4GHz는 겹치지 않는 채널이 3개(1·6·11)뿐이고 블루투스·전자레인지와 간섭하지만 멀리 갑니다. 5GHz는 채널이 많고 80/160MHz로 넓게 묶어 빠르며, Wi-Fi 6E/7은 6GHz도 씁니다. IPv6에서는 기기마다 공인 주소를 받을 수 있어 NAT가 필요 없지만, 공유기는 여전히 방화벽으로 밖에서 먼저 오는 연결을 막습니다.',
      async run(a) {
        a.clear();
        a.badge('laptop', null);
        await a.par(a.fade(T.g, 0, 400), a.hide('str'), a.hide('e-str'));
        a.caption('기기 ↔ 공유기: 전파(와이파이)');
        const arc = (r) => {
          const c = Math.cos((140 * Math.PI) / 180) * r, s = Math.sin((140 * Math.PI) / 180) * r;
          return `M${R.x + c} ${R.y + s} A${r} ${r} 0 0 1 ${R.x + c} ${R.y - s}`;
        };
        const waves = [0, 1, 2].map(() => a.raw('path', { class: 'edge ec-teal', style: 'stroke-width: 3; opacity: 0' }, 'pkt'));
        await a.par(...waves.map((w, i) => a.wait(i * 300).then(() => a.tween(1100, (k) => {
          w.setAttribute('d', arc(70 + k * 120));
          w.style.opacity = 1 - k;
        }))));
        waves.forEach((w) => w.remove());
        for (const [id] of DEV) {
          const e = a.get('e-' + id).path;
          e.classList.add('dashed', 'ec-teal');
          e.style.strokeWidth = 3;
        }
        a.text(150, 284, '무선 (와이파이)', { size: 12, weight: 700, color: 'teal', layer: 'top' });
        a.text(379, 140, '유선', { size: 12, weight: 700, cls: 'muted', layer: 'top' });
        a.caption('공유기 ↔ 인터넷: 통신사 회선(유선)');
        await a.wait(500);
        a.note('n24', 190, 362, '2.4GHz\n멀리·벽 너머까지 닿음\n대신 느리고 붐빔', { color: 'blue', w: 230 });
        await a.wait(300);
        a.note('n5', 530, 362, '5GHz\n빠르고 덜 붐빔\n대신 가까이서만 잘 됨', { color: 'teal', w: 230 });
        await a.wait(700);
      },
    },
  ],
};

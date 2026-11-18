// 스위치: MAC 주소 → 허브(모두에게 복사) → 스위치의 학습(MAC 주소 표) → 플러딩과 학습 → ARP → VLAN → 실무(PoE·미러링·루프와 STP)
// MAC은 문서용 예시 대역(00:00:5E:00:53:xx, RFC 7042), IP는 사설 대역 예시다.
const MACS = { A: '00:00:5E:00:53:0A', B: '00:00:5E:00:53:0B', C: '00:00:5E:00:53:0C', D: '00:00:5E:00:53:0D' };
const PCS = [
  ['A', 110, 86, 1, 'ec-blue', 'blue'],
  ['B', 370, 86, 2, 'ec-green', 'green'],
  ['C', 110, 354, 3, 'ec-blue', 'blue'],
  ['D', 370, 354, 4, 'ec-green', 'green'],
];
const PORT_OF = { A: 1, B: 2, C: 3, D: 4 };
const TX = 482, TW = 222; // 오른쪽 표 자리
const ROWY = [92, 118, 144, 170];

// 스위치의 MAC 주소 표 — setup마다 새로 만든다
const T = { g: null, rows: [], empty: null, n: 0 };

/** 노드 테두리 바깥(패킷이 글자를 가리지 않는 자리) — from 노드에서 to 쪽으로 */
function bp(a, from, to, pad = 16) {
  const n = a.get(from), t = a.get(to);
  const dx = t.x - n.x, dy = t.y - n.y;
  const s = Math.min((n.w / 2 + pad) / Math.abs(dx || 1e-9), (n.h / 2 + pad) / Math.abs(dy || 1e-9));
  return [n.x + dx * s, n.y + dy * s];
}
/** from PC → 스위치 가장자리까지 (packet을 남겨 둔다) */
async function toSw(a, from, label, color, dur = 700) {
  const p = a.packet(label, { at: bp(a, from, 'sw'), color });
  await a.move(p, bp(a, 'sw', from), dur);
  return p;
}
/** 스위치 가장자리 → PC (복사본을 하나 만들어 보낸다) */
async function fromSw(a, to, label, color, dur = 700) {
  const p = a.packet(label, { at: bp(a, 'sw', to), color });
  await a.move(p, bp(a, to, 'sw'), dur);
  return p;
}

function addRow(a, who, color = 'teal') {
  const i = T.n++;
  const g = a.raw('g', {}, T.g);
  const bg = a.raw('rect', { x: TX + 8, y: ROWY[i] - 11, width: TW - 16, height: 22, rx: 6, style: `fill: color-mix(in srgb, var(--${color}) 24%, transparent); opacity: 0` }, g);
  a.text(TX + 16, ROWY[i], MACS[who], { par: g, size: 12, mono: true, anchor: 'start', weight: 600 });
  a.text(TX + 190, ROWY[i], String(PORT_OF[who]), { par: g, size: 13, weight: 800, color });
  if (T.empty) T.empty.style.opacity = 0;
  g.style.opacity = 0;
  T.rows[who] = { g, bg };
  return a.tween(350, (k) => { g.style.opacity = k; bg.style.opacity = k; });
}
const rowHl = (a, who, on, dur = 250) => {
  const bg = T.rows[who].bg, v0 = parseFloat(bg.style.opacity) || 0;
  return a.tween(dur, (k) => (bg.style.opacity = v0 + ((on ? 1 : 0) - v0) * k));
};
const showTable = (a, v = 1) => { const g = T.g, v0 = parseFloat(g.style.opacity) || 0; return a.tween(350, (k) => (g.style.opacity = v0 + (v - v0) * k)); };
const unbadge = (a) => PCS.forEach(([id]) => a.badge(id, null));

export default {
  id: 'switch',
  level: 2,
  cat: '네트워크',
  title: '스위치 — 같은 층 안에서 정확히 배달하기 (L2)',
  sub: '같은 네트워크 안에서 데이터가 정확히 그 컴퓨터에만 가는 원리 — MAC 주소, 학습, ARP, VLAN',
  analogy: '사무실 층의 우편 담당을 떠올려 보세요. 허브는 편지가 오면 주소도 보지 않고 모든 책상에 복사해서 뿌리는 사람이고, 스위치는 누가 어느 자리에 앉는지 외워 두었다가 그 자리에만 정확히 갖다주는 사람입니다. 처음 보는 이름이면 한 번은 층 전체에 돌리지만, 답장이 오면 그 자리를 외워요.',
  keys: [
    'MAC 주소는 랜카드마다 붙은 고유 번호다. 같은 네트워크(같은 층) 안에서 배달할 때는 IP가 아니라 MAC을 보고 보낸다.',
    '허브는 받은 신호를 모든 포트로 복사해 뿌린다. 선이 붐비고, 충돌이 나고, 남의 데이터를 엿볼 수 있다.',
    '스위치는 들어온 프레임의 보낸 MAC과 들어온 포트를 MAC 주소 표에 적어 두고, 다음부터 받는 사람의 포트로만 보낸다. 표에 없는 목적지는 한 번 모두에게 보낸다(플러딩).',
    'IP만 알고 MAC을 모르면 ARP로 "이 IP 쓰는 분 누구세요?"를 모두에게 물어 알아낸다.',
    'VLAN은 스위치 하나를 설정만으로 여러 네트워크로 나눈다. 서로 다른 VLAN끼리는 라우터(L3)를 거쳐야만 통한다.',
  ],
  terms: [
    ['MAC 주소', '랜카드마다 붙은 48비트 고유 번호. 예: 00:00:5E:00:53:0A'],
    ['프레임', '같은 네트워크 안에서 오가는 데이터 봉투. 받는 MAC·보낸 MAC이 적혀 있다'],
    ['허브', '받은 신호를 모든 포트로 복사해 뿌리는 옛 장비(L1)'],
    ['스위치', 'MAC 주소 표를 보고 받는 사람이 있는 포트로만 보내는 장비(L2)'],
    ['MAC 주소 테이블', '"어느 MAC이 몇 번 포트에 있다"를 적어 둔 스위치의 장부'],
    ['플러딩', '목적지를 모를 때 들어온 포트를 뺀 모든 포트로 복사해 보내는 것'],
    ['ARP', 'IP 주소로 그 기기의 MAC 주소를 알아내는 질문·응답 규칙'],
    ['VLAN', '스위치 하나를 설정으로 여러 개의 독립된 네트워크로 나누는 기술'],
  ],
  quiz: [
    { q: '허브와 스위치의 가장 큰 차이는 무엇일까요?', c: ['스위치가 훨씬 멀리까지 신호를 보낸다', '허브는 무선, 스위치는 유선 장비다', '스위치는 MAC 주소 표를 보고 받는 사람이 있는 포트로만 보낸다', '허브는 IP 주소를, 스위치는 도메인 이름을 본다'], a: 2, why: '허브는 받은 걸 모든 포트로 복사하지만, 스위치는 보낸 사람의 MAC과 포트를 외워 두었다가 받는 사람이 있는 포트로만 보냅니다. 그래서 선이 덜 붐비고 남이 엿보기도 어렵습니다.', step: 3 },
    { q: 'PC A가 192.168.0.20과 처음 통신하려는데 그 기기의 MAC 주소를 모릅니다. 가장 먼저 일어나는 일은?', c: ['A가 "192.168.0.20 누구세요?" ARP 요청을 모두에게(브로드캐스트) 보낸다', '스위치가 MAC 주소 표에서 IP를 찾아 A에게 알려 준다', 'A가 DNS 서버에 MAC 주소를 물어본다', 'MAC 없이 IP만 적어 보내면 스위치가 알아서 배달한다'], a: 0, why: 'MAC은 ARP로 알아냅니다. 요청은 받는 MAC이 FF:FF:FF:FF:FF:FF인 브로드캐스트라 모두가 받고, 그 IP를 쓰는 기기만 답합니다. 스위치의 MAC 표에는 IP가 없고, DNS는 이름을 IP로 바꿀 뿐입니다.', step: 4 },
    { q: '스위치 두 대를 잇는 선 하나로 VLAN 10과 VLAN 20의 프레임을 함께 나르려면 그 포트를 어떻게 설정할까요?', c: ['두 VLAN 모두 액세스 포트로 설정한다', '프레임에 802.1Q 태그를 붙여 나르는 트렁크 포트로 설정한다', 'STP를 꺼서 두 길을 모두 열어 둔다', '포트 미러링으로 한쪽 VLAN을 복사해 보낸다'], a: 1, why: '트렁크 포트는 프레임마다 4바이트 802.1Q 태그(VLAN 번호)를 붙여 여러 VLAN을 한 선으로 나릅니다. 액세스 포트는 VLAN 하나만 싣고, 미러링은 분석용 복사일 뿐입니다.', step: 5 },
  ],
  setup(a) {
    T.g = null; T.rows = {}; T.empty = null; T.n = 0;
    a.zone('floor', 16, 16, 452, 408, { label: '3층 사무실', color: 'teal' });
    a.node('sw', 240, 220, { label: '허브', icon: '📢', sub: '', w: 140, h: 68, color: 'gray' });
    a.node('rt', 240, 52, { label: '라우터', icon: '🔀', sub: 'L3', w: 104, h: 46, size: 13, color: 'violet', hidden: true });
    a.edge('rt', 'sw', { id: 'e-rt', arrow: false, hidden: true });
    for (const [id, x, y, port] of PCS) {
      a.node(id, x, y, { label: 'PC ' + id, icon: '💻', sub: '', w: 124, h: 58, size: 14, color: 'blue' });
      const left = x < 240, top = y < 220;
      a.edge(id, 'sw', { id: 'e-' + id, arrow: false, label: '포트 ' + port, lx: left ? -34 : 34, ly: top ? 8 : -8 });
    }
    // MAC 주소 표(처음엔 숨김)
    T.g = a.raw('g', { style: 'opacity: 0' }, 'edge');
    a.raw('rect', { x: TX, y: 24, width: TW, height: 176, rx: 12, style: 'fill: color-mix(in srgb, var(--teal) 6%, transparent); stroke: color-mix(in srgb, var(--teal) 55%, transparent); stroke-width: 1.5' }, T.g);
    a.text(TX + 14, 42, '스위치의 MAC 주소 표', { par: T.g, size: 12.5, weight: 800, anchor: 'start', color: 'teal' });
    a.text(TX + 16, 66, 'MAC 주소', { par: T.g, size: 11.5, anchor: 'start', cls: 'muted' });
    a.text(TX + 190, 66, '포트', { par: T.g, size: 11.5, cls: 'muted' });
    T.empty = a.text(TX + TW / 2, 118, '(아직 비어 있음)', { par: T.g, size: 12, cls: 'muted' });
  },
  steps: [
    {
      t: 'MAC 주소 — 기기마다 박힌 번호',
      easy: '같은 층 사무실의 컴퓨터 4대가 가운데 장비 하나에 랜선으로 꽂혀 있어요. 컴퓨터마다 랜카드(랜선을 꽂는 부품)에 공장에서 정해 준 고유 번호가 있는데, 이것이 MAC 주소예요. IP 주소가 "몇 동 몇 호" 같은 사는 곳이라면, MAC 주소는 주민번호처럼 그 기기 자체에 붙은 번호입니다.',
      deep: 'MAC 주소는 48비트(16진수 12자리)이고 앞 24비트는 제조사 코드(OUI)입니다. 같은 LAN(L2) 안에서 프레임을 배달할 때 쓰이며, 라우터를 지날 때마다 프레임의 MAC은 구간별로 새로 바뀌지만 IP는 끝까지 유지됩니다. 고유 번호라고 해도 소프트웨어로 바꿀 수 있고, 요즘 폰·노트북은 사생활 보호를 위해 와이파이마다 무작위 MAC을 쓰기도 합니다. 그림의 MAC은 문서용 예시 대역입니다.',
      async run(a) {
        a.caption('컴퓨터마다 랜카드에 고유 번호가 있어요');
        for (const [id] of PCS) {
          a.setNode(id, { sub: 'MAC …:' + MACS[id].slice(-2) });
          await a.flash(id);
        }
        a.hl('A');
        a.note('n-id', 593, 112, 'PC A의 주소는 두 가지\nIP 192.168.0.10\n→ 사는 곳(동·호수)\nMAC 00:00:5E:00:53:0A\n→ 랜카드의 고유 번호', { color: 'blue', w: 214 });
        await a.wait(900);
        a.note('n-fr', 593, 300, '같은 층에서 오가는 봉투\n= 이더넷 프레임\n받는 MAC …:0B\n보낸 MAC …:0A\n데이터 ▦▦▦', { color: 'teal', w: 214 });
        a.caption('같은 층 안에서는 MAC을 적어 배달해요');
        await a.wait(1100);
        a.hl('A', false);
      },
    },
    {
      t: '허브 — 모두에게 복사해서 뿌리기',
      easy: '옛날 장비인 허브는, 편지를 받으면 주소도 보지 않고 모든 책상에 복사해서 돌리는 우편 담당과 같아요. B에게 보낸 편지가 C와 D에게도 가니 선은 붐비고, 마음먹으면 남의 편지를 엿볼 수 있습니다. 두 사람이 동시에 보내면 신호가 부딪혀(충돌) 둘 다 다시 보내야 해요.',
      deep: '허브는 L1 장비(멀티포트 리피터)라 전기 신호를 모든 포트로 되풀이할 뿐 주소를 읽지 않습니다. 모든 포트가 하나의 충돌 도메인을 이루고 반이중으로 동작해 CSMA/CD로 충돌을 감지·재전송하며, 대역폭도 포트들이 나눠 씁니다. 랜카드를 무차별(promiscuous) 모드로 두면 남의 프레임이 그대로 잡혀서, 지금은 허브를 거의 쓰지 않습니다.',
      async run(a) {
        a.clear();
        a.caption('A가 B에게 보내면…');
        const p = await toSw(a, 'A', '→B', 'blue');
        a.remove(p);
        a.hl('sw');
        await a.flash('sw');
        a.caption('허브는 모든 자리에 복사해요');
        const cs = await a.par(...['B', 'C', 'D'].map((x) => fromSw(a, x, '→B', 'blue')));
        a.hl('sw', false);
        a.badge('B', '내 거!', 'green');
        a.badge('C', '버림', 'gray');
        a.badge('D', '엿봄 👀', 'red');
        a.hl('D', true, 'red');
        await a.par(...cs.map((c) => a.fadeOut(c, 250)));
        a.note('n-hub', 593, 112, '허브는 주소를 안 봐요\n모든 포트로 복사 →\n선은 붐비고\n남의 편지도 보여요', { color: 'amber', w: 214 });
        await a.wait(1000);
        unbadge(a);
        a.hl('D', false);
        a.caption('A와 D가 동시에 보내면?');
        const [p1, p2] = await a.par(toSw(a, 'A', '→C', 'blue', 650), toSw(a, 'D', '→B', 'pink', 650));
        p1.set('충돌!', 'red'); p2.set('충돌!', 'red');
        a.hl('sw', true, 'red');
        await a.flash('sw');
        a.note('n-col', 593, 300, '둘이 동시에 말하면 충돌\n→ 잠깐 기다렸다 다시', { color: 'red', w: 214 });
        await a.par(a.fadeOut(p1, 500), a.fadeOut(p2, 500));
        a.hl('sw', false);
        await a.wait(500);
      },
    },
    {
      t: '스위치는 보낸 사람의 자리를 외운다',
      easy: '이번엔 허브 대신 스위치를 둡니다. 스위치는 똑똑한 우편 담당이에요. 편지가 들어오면 봉투의 "보낸 사람 MAC"과 그 편지가 들어온 구멍(포트) 번호를 장부에 적어 둡니다. 이 장부가 MAC 주소 표예요. "A는 1번 자리"를 이렇게 배웁니다.',
      deep: '스위치는 L2 장비로, 들어온 포트와 출발지 MAC을 MAC 주소 테이블(CAM 테이블)에 기록합니다. 따로 설정하지 않아도 저절로 학습하며, 한동안 소식이 없는 항목은 지웁니다(에이징, 기본 300초인 경우가 흔함). 조회와 전달은 전용 칩(ASIC)이 하드웨어로 처리하고, 포트마다 전이중으로 동작해 포트 하나하나가 따로 충돌 도메인이므로 충돌이 사실상 없습니다.',
      async run(a) {
        a.clear();
        a.setNode('sw', { label: '스위치', icon: '🎯', color: 'teal' });
        await a.flash('sw');
        await showTable(a);
        a.caption('A가 B에게 보내면…');
        const p = await toSw(a, 'A', '→B', 'blue');
        p.set('→B ?');
        a.hl('A');
        a.caption('보낸 사람 A(…:0A)가 1번 포트로 들어왔네 — 적어 두자');
        await addRow(a, 'A', 'blue');
        await a.flash('sw');
        a.note('n-learn', 593, 300, '들어온 프레임의\n보낸 MAC + 들어온 포트\n= 표에 한 줄', { color: 'teal', w: 214 });
        await a.wait(600);
        await rowHl(a, 'A', false);
        a.hl('A', false);
        a.caption('그런데 받는 사람 B는 몇 번 포트일까요?');
        await a.wait(800);
        await a.fadeOut(p, 250);
      },
    },
    {
      t: '모르면 모두에게, 답장으로 배운다',
      easy: '받는 사람 B가 장부에 아직 없으면, 스위치도 이번 한 번은 모든 자리에 돌립니다(플러딩). C와 D는 자기 것이 아니라 버려요. B가 답장을 보내는 순간 스위치는 "B는 2번 자리"를 배우고, 그다음부터는 B 앞으로 온 편지를 2번 자리에만 정확히 줍니다.',
      deep: '목적지가 표에 없는 unknown unicast, 브로드캐스트, (IGMP 스누핑이 없을 때의) 멀티캐스트는 같은 VLAN의 다른 모든 포트로 플러딩됩니다. 표가 채워지면 해당 포트로만 포워딩하고, 목적지가 들어온 포트와 같으면 버립니다(필터링). 공격자가 가짜 MAC을 대량으로 흘려 표를 넘치게 하면 스위치가 플러딩만 하게 되므로(MAC 플러딩 공격), 포트 보안으로 포트당 MAC 개수를 제한합니다.',
      async run(a) {
        a.clear();
        a.caption('B는 표에 없어요 → 이번만 모두에게(플러딩)');
        const cs = await a.par(...['B', 'C', 'D'].map((x) => fromSw(a, x, '→B', 'amber', 750)));
        a.badge('B', '내 거!', 'green');
        a.badge('C', '버림', 'gray');
        a.badge('D', '버림', 'gray');
        await a.par(...cs.map((c) => a.fadeOut(c, 250)));
        await a.wait(300);
        unbadge(a);
        a.caption('B가 답장 → "B는 2번 포트"를 배워요');
        const r = await toSw(a, 'B', '→A', 'green', 650);
        a.remove(r);
        await addRow(a, 'B', 'green');
        await rowHl(a, 'B', false, 200);
        await rowHl(a, 'A', true, 200);
        a.caption('A는 1번 — 표를 보고 1번 포트로만');
        const r2 = await fromSw(a, 'A', '→A', 'green', 650);
        await a.par(a.fadeOut(r2, 200), rowHl(a, 'A', false, 200));
        a.caption('이제 A → B도 2번 포트로만 가요');
        const p = await toSw(a, 'A', '→B', 'blue', 600);
        a.remove(p);
        await rowHl(a, 'B', true, 200);
        const p2 = await fromSw(a, 'B', '→B', 'blue', 600);
        a.badge('B', '✓', 'green');
        await a.par(a.fadeOut(p2, 200), rowHl(a, 'B', false, 200));
        a.caption('C와 D가 한 번씩 말하면 표가 다 차요');
        const [q1, q2] = await a.par(toSw(a, 'C', '→A', 'pink', 500), toSw(a, 'D', '→B', 'violet', 500));
        a.remove(q1); a.remove(q2);
        await addRow(a, 'C', 'pink');
        await addRow(a, 'D', 'violet');
        await a.par(rowHl(a, 'C', false, 200), rowHl(a, 'D', false, 200));
        a.badge('B', null);
        a.note('n-flood', 593, 300, '처음 보는 목적지\n→ 모두에게(플러딩)\n답장으로 자리를 배우면\n다음부턴 그 포트로만', { color: 'amber', w: 214 });
        await a.wait(800);
      },
    },
    {
      t: 'ARP — IP로 MAC 알아내기',
      easy: '그런데 A는 처음에 B의 IP(192.168.0.20)만 알았어요. 봉투에는 MAC을 써야 하니, A는 층 전체에 "192.168.0.20 쓰는 분 누구세요?" 하고 외칩니다(브로드캐스트, 모두에게 보내기). B만 "저예요, 제 MAC은 …:0B" 하고 답하고, A는 이 답을 메모(ARP 캐시)해 두었다가 다음부터 바로 씁니다.',
      deep: 'ARP 요청은 받는 MAC이 FF:FF:FF:FF:FF:FF인 브로드캐스트라 스위치가 항상 플러딩하고, 응답은 유니캐스트입니다. 결과는 OS의 ARP 캐시에 보통 수십 초~몇 분 저장됩니다. 상대가 다른 서브넷이면 상대가 아니라 기본 게이트웨이(라우터)의 MAC을 묻습니다. ARP에는 인증이 없어 가짜 응답으로 끼어드는 ARP 스푸핑이 가능하고(중간자 공격 주제), 관리형 스위치는 DAI 같은 기능으로 막습니다. IPv6는 ARP 대신 NDP를 씁니다.',
      async run(a) {
        a.clear();
        a.hl('A');
        a.note('n-arp', 593, 262, 'A가 아는 건 IP뿐\n192.168.0.20의 MAC은?', { color: 'amber', w: 214 });
        await a.wait(500);
        a.caption('받는 MAC = FF:FF:FF:FF:FF:FF (모두에게)');
        const p = await toSw(a, 'A', '.20 누구?', 'amber', 700);
        a.remove(p);
        await a.flash('sw');
        a.caption('브로드캐스트는 표와 상관없이 모든 포트로');
        const cs = await a.par(...['B', 'C', 'D'].map((x) => fromSw(a, x, '.20 누구?', 'amber', 700)));
        a.badge('C', '내 IP 아님', 'gray');
        a.badge('D', '내 IP 아님', 'gray');
        a.badge('B', '저예요!', 'green');
        await a.par(...cs.map((c) => a.fadeOut(c, 250)));
        a.caption('B만 답해요 — 이번엔 A에게만');
        const r = await toSw(a, 'B', '…:0B예요', 'green', 650);
        a.remove(r);
        await rowHl(a, 'A', true, 200);
        const r2 = await fromSw(a, 'A', '…:0B예요', 'green', 650);
        await a.par(a.fadeOut(r2, 200), rowHl(a, 'A', false, 200));
        unbadge(a);
        a.badge('A', 'ARP 메모', 'amber');
        a.note('n-cache', 593, 364, 'A의 ARP 캐시\n192.168.0.20 = …:0B', { color: 'green', w: 214 });
        a.hl('A', false);
        await a.wait(900);
      },
    },
    {
      t: 'VLAN — 스위치 하나를 두 네트워크로',
      easy: '한 층에 영업팀과 개발팀이 같이 있어도, 스위치 설정만으로 둘을 서로 다른 네트워크로 나눌 수 있어요. 이것이 VLAN(가상 랜)입니다. 영업팀의 "모두에게" 외침은 영업팀에만 들리고 개발팀 자리로는 아예 가지 않아요. 다른 팀에 보내려면 층 사이 안내 데스크 같은 라우터를 거쳐야 합니다.',
      deep: 'VLAN(IEEE 802.1Q)은 포트마다 VLAN 번호(1~4094)를 붙여 브로드캐스트 도메인을 나눕니다. PC가 꽂힌 포트는 액세스 포트, 스위치끼리·라우터와 잇는 포트는 4바이트 태그를 붙여 여러 VLAN을 함께 나르는 트렁크 포트입니다. MAC 표도 VLAN별로 따로 관리됩니다. 보통 VLAN 하나에 서브넷 하나를 짝지으며(서브넷 주제), VLAN 사이 통신은 라우터나 L3 스위치가 맡고 그 자리에서 ACL·방화벽 정책을 겁니다(라우터·방화벽 주제).',
      async run(a) {
        a.clear();
        a.badge('A', null);
        a.caption('설정으로 포트를 두 팀으로 나눠요');
        for (const [id, , , , ec, col] of PCS) {
          a.setNode(id, { sub: col === 'blue' ? 'VLAN 10 영업' : 'VLAN 20 개발', color: col });
          a.get('e-' + id).path.classList.add(ec);
        }
        a.setNode('sw', { sub: 'VLAN 10 · 20' });
        await a.flash('sw');
        a.note('n-vlan', 593, 262, '스위치 하나 = 네트워크 둘\n영업(10) ↔ 개발(20)\n서로 못 봐요', { color: 'teal', w: 214 });
        a.caption('A의 "모두에게"는 같은 VLAN(C)에만');
        const p = await toSw(a, 'A', '모두에게', 'amber', 650);
        a.remove(p);
        const c = await fromSw(a, 'C', '모두에게', 'amber', 650);
        a.badge('C', '받음', 'blue');
        a.badge('B', '조용', 'gray');
        a.badge('D', '조용', 'gray');
        await a.fadeOut(c, 250);
        await a.wait(300);
        unbadge(a);
        a.caption('A → B는? 다른 VLAN이라 스위치가 넘겨 주지 않아요');
        const q = await toSw(a, 'A', '→B', 'blue', 650);
        q.set('✕ 막힘', 'red');
        await a.flash('sw');
        await a.fadeOut(q, 400);
        a.caption('넘어가려면 라우터(L3)를 거쳐야 해요');
        await a.par(a.show('rt'), a.show('e-rt'));
        const r = await toSw(a, 'A', '→B', 'blue', 600);
        await a.move(r, bp(a, 'sw', 'rt'), 0);
        await a.move(r, bp(a, 'rt', 'sw', 14), 500);
        await a.flash('rt');
        r.set(null, 'violet');
        await a.move(r, bp(a, 'sw', 'rt'), 500);
        await a.move(r, bp(a, 'sw', 'B'), 0);
        await a.move(r, bp(a, 'B', 'sw'), 600);
        await a.fadeOut(r, 200);
        a.badge('B', '✓ 라우터로', 'violet');
        a.note('n-l3', 593, 370, '다른 VLAN으로는\n라우터(L3)를 거쳐야 해요', { color: 'violet', w: 214 });
        await a.wait(800);
      },
    },
    {
      t: '실무 — 관리형, PoE, 미러링, 루프',
      easy: '집처럼 꽂기만 하면 되는 스위치는 비관리형, VLAN 같은 설정을 할 수 있는 회사용은 관리형이에요. PoE 스위치는 랜선으로 전기까지 보내 와이파이 장비·CCTV를 콘센트 없이 켭니다. 케이블을 잘못 꽂아 길이 빙 도는 고리(루프)가 생기면 "모두에게" 편지가 끝없이 불어나 층 전체가 마비되는데, STP가 고리를 찾아 한 길을 막아 줍니다.',
      deep: '관리형 스위치는 웹·CLI·SNMP로 VLAN, 포트 보안, 링크 묶음(LACP), 포트 미러링(SPAN: 특정 포트의 복사본을 IDS·패킷 분석 장비로 보내기)을 설정합니다. PoE는 802.3af(포트당 약 15W)·at(약 30W)·bt(최대 약 90W)로 무선 AP·IP 카메라·IP 전화에 전원을 줍니다. L2 프레임에는 TTL이 없어 루프가 생기면 브로드캐스트가 끝없이 돌며 불어나므로(브로드캐스트 폭풍) STP/RSTP로 중복 경로 하나를 차단 상태로 둡니다. 업계에서 말하는 "L3 스위치"는 라우팅까지 하는 스위치, "L4 스위치"는 사실상 로드밸런서입니다(L4·L7 주제).',
      async run(a) {
        a.clear();
        unbadge(a);
        a.caption('실수로 케이블 양 끝을 같은 스위치에 꽂으면…');
        const loop = a.raw('path', { d: 'M312 206 C 392 166, 392 274, 312 234', class: 'edge dashed ec-red', style: 'stroke-width: 3; opacity: 0', fill: 'none' }, 'pkt');
        await a.tween(300, (k) => (loop.style.opacity = k));
        const lab = a.text(392, 220, '루프!', { size: 12, weight: 800, color: 'red' });
        const ring = [[316, 204], [350, 188], [376, 204], [378, 236], [350, 252], [316, 236]];
        a.caption('"모두에게" 프레임이 고리를 끝없이 돌며 불어나요');
        for (let round = 0; round < 3; round++) {
          const n = 2 ** (round + 1);
          const dots = Array.from({ length: n }, (_, i) => a.packet('', { at: ring[i % ring.length], color: 'amber', w: 14, h: 14 }));
          await a.par(...dots.map((d, i) => a.move(d, [...ring.slice((i % 6) + 1), ...ring.slice(0, (i % 6) + 1)], 700)));
          dots.forEach((d) => a.remove(d));
        }
        a.hl('sw', true, 'red');
        a.badge('sw', '폭풍!', 'red');
        await a.flash('sw');
        a.caption('STP가 고리를 찾아 한쪽 포트를 막아요');
        loop.setAttribute('class', 'edge dashed ec-gray');
        lab.textContent = '✕ STP 차단';
        lab.setAttribute('class', 'tx tc-gray');
        lab.setAttribute('x', 400);
        a.hl('sw', false);
        a.badge('sw', null);
        await a.flash('sw');
        a.note('n-sum', 593, 300, '실무에서 보는 것\n관리형: VLAN·미러링 설정\nPoE: 랜선으로 전기까지\n미러링: 복사본을 분석 장비로\nSTP: 루프를 찾아 한 길 막기', { color: 'teal', w: 222 });
        a.caption('스위치 = 자리를 외워서 그 자리에만');
        await a.wait(1200);
      },
    },
  ],
};

// 패킷: 데이터를 조각내고, 서로 다른 길로 보내고, 순서대로 다시 합치기
const ROUTERS = [['R1', 210, 120], ['R2', 210, 320], ['R3', 360, 220], ['R4', 510, 120], ['R5', 510, 320]];
const LINKS = [['pc', 'R1'], ['pc', 'R2'], ['R1', 'R3'], ['R2', 'R3'], ['R1', 'R4'], ['R2', 'R5'], ['R3', 'R4'], ['R3', 'R5'], ['R4', 'dst'], ['R5', 'dst']];
const SLOT_Y = [292, 324, 356, 388];
const sendSlot = (i) => [70, SLOT_Y[i]];
const recvSlot = (i) => [640, SLOT_Y[i]];
const COLORS = ['blue', 'teal', 'pink', 'violet'];

export default {
  id: 'packet',
  level: 1,
  cat: '네트워크',
  title: '패킷 — 데이터는 조각나서 여행한다',
  sub: '사진 한 장을 보내면 인터넷 속에서는 작은 조각들이 각자 길을 찾아 이동한다.',
  analogy: '큰 가구를 택배로 보낼 때 여러 상자로 나눠 포장하고, 상자마다 "보내는 사람·받는 사람·3번 중 1번" 송장을 붙이는 것과 같습니다. 상자들은 서로 다른 트럭을 타고 도착 순서도 제각각이지만, 받는 사람이 번호를 보고 다시 조립합니다.',
  keys: [
    '큰 데이터는 작은 조각(패킷)으로 나뉘어 전송된다. 이더넷에서 한 번에 보통 최대 1,500바이트.',
    '각 패킷에는 출발·도착 주소와 순서 번호가 담긴 헤더가 붙는다.',
    '라우터는 패킷마다 도착 주소를 보고 다음 길을 고른다. 그래서 조각마다 길과 도착 순서가 다를 수 있다.',
    '사라진 조각은 다시 보내고(재전송), 받는 쪽은 순서 번호대로 다시 맞춘다. 이 일은 TCP가 맡는다.',
    '데이터는 TCP → IP → 이더넷 순서로 겹겹이 포장(캡슐화)되고, 받는 쪽에서 반대로 벗겨진다.',
  ],
  terms: [
    ['패킷', '네트워크로 보내는 데이터 한 조각. 헤더(꼬리표) + 데이터로 구성'],
    ['헤더', '패킷 앞에 붙는 정보. 출발·도착 주소, 순서 번호, 길이 등'],
    ['라우터', '패킷의 도착 주소를 보고 다음으로 보낼 길을 정하는 장비'],
    ['재전송', '도착하지 못한 패킷을 보내는 쪽이 다시 보내는 것'],
    ['캡슐화', '데이터에 계층별 헤더를 차례로 덧붙여 포장하는 것'],
    ['MTU', '한 번에 보낼 수 있는 최대 크기. 이더넷은 보통 1,500바이트'],
  ],
  quiz: [
    { q: '조각(패킷)들이 #2, #4, #1 순서로 뒤죽박죽 도착해도 원래 사진으로 맞출 수 있는 이유는?', c: ['라우터가 도착 직전에 순서대로 줄을 세워 줘서', '조각마다 꼬리표(헤더)에 순서 번호가 적혀 있어서', '모든 조각이 반드시 같은 길로만 이동해서', '앞 조각이 도착해야만 다음 조각을 보내서'], a: 1, why: '헤더에 순서 번호가 있어서 받는 쪽이 번호대로 다시 맞춥니다. 실제 TCP의 순서 번호는 바이트 오프셋입니다.', step: 3 },
    { q: '보내는 쪽에서 데이터를 포장(캡슐화)하는 순서로 옳은 것은? (안쪽 봉투부터)', c: ['이더넷 → IP → TCP', 'IP → TCP → 이더넷', 'TCP → 이더넷 → IP', 'TCP → IP → 이더넷'], a: 3, why: '데이터를 TCP 세그먼트에 담고, 그걸 IP 패킷에, 다시 이더넷 프레임에 넣습니다. 받는 쪽은 반대 순서로 벗겨 냅니다.', step: 6 },
    { q: 'TCP 송신자가 RTO 타이머 만료를 기다리지 않고 바로 재전송(빠른 재전송)하는 계기는?', c: ['같은 확인 번호의 중복 ACK를 3개 받았을 때', '라우터가 패킷 손실 알림을 보내 줬을 때', 'IP 헤더의 TTL이 0이 되었을 때', '수신자가 별도의 NAK(못 받음) 메시지를 보냈을 때'], a: 0, why: '중복 ACK 3개는 중간 조각이 빠졌다는 신호라 곧바로 재전송합니다. IP와 라우터는 손실을 복구하거나 알려 주지 않습니다(best effort).', step: 4 },
  ],
  setup(a) {
    a.node('photo', 80, 62, { label: '사진 1장', sub: '6MB', icon: '🏞️', color: 'pink', w: 120, h: 70 });
    a.node('pc', 70, 220, { label: '보내는 쪽', icon: '💻', color: 'blue', w: 104, h: 62 });
    a.node('dst', 640, 220, { label: '받는 쪽', icon: '📱', color: 'green', w: 104, h: 62 });
    a.node('photo2', 636, 62, { label: '사진 1장', sub: '완성!', icon: '🏞️', color: 'pink', w: 120, h: 70, hidden: true });
    for (const [id, x, y] of ROUTERS) a.node(id, x, y, { label: id, icon: '🔀', color: 'gray', shape: 'circle', w: 58, size: 13 });
    LINKS.forEach(([p, q], i) => a.edge(p, q, { id: 'm' + i, arrow: false }));
  },
  steps: [
    {
      t: '큰 데이터는 조각으로 나눈다',
      easy: '사진 한 장은 생각보다 커서 통째로 보낼 수 없어요. 그래서 작은 조각(패킷) 여러 개로 잘라서 보냅니다. 실제로는 수천 조각이지만, 여기서는 4조각으로 볼게요.',
      deep: '이더넷 MTU는 보통 1,500바이트이고, IP·TCP 헤더(각 20바이트 이상)를 빼면 한 세그먼트의 데이터(MSS)는 약 1,460바이트입니다. 6MB 사진이면 약 4,300개 세그먼트로 나뉩니다. 분할은 주로 TCP가 하며, 요즘 TCP는 DF 플래그와 경로 MTU 탐색으로 단편화를 피하고, IPv6에서는 라우터가 단편화하지 않습니다.',
      async run(a) {
        a.hl('photo');
        a.caption('통째로 보내기엔 너무 커요');
        await a.flash('photo');
        const ps = [0, 1, 2, 3].map((i) => a.packet(`#${i + 1}`, { id: 'p' + (i + 1), at: 'photo', color: COLORS[i], w: 52 }));
        await a.par(...ps.map((p, i) => a.wait(i * 150).then(() => a.move(p, sendSlot(i), 700))));
        a.setNode('photo', { sub: '→ 4조각' });
        a.hl('photo', false);
        a.note('n-mtu', 210, 400, '실제로는 한 조각 ≈ 1,500바이트', { color: 'amber', w: 220 });
        await a.wait(600);
      },
    },
    {
      t: '조각마다 꼬리표(헤더)를 붙인다',
      easy: '조각마다 택배 송장 같은 꼬리표를 붙입니다. "누가 보냈는지(출발 주소)", "누구에게 가는지(도착 주소)", "몇 번째 조각인지(순서 번호)"가 적혀 있어요.',
      deep: 'IP 헤더에는 출발지·목적지 IP, TTL, 프로토콜 번호 등이, TCP 헤더에는 출발·목적지 포트와 순서 번호(sequence number), 확인 번호(ACK), 체크섬이 들어갑니다. 실제 순서 번호는 조각 번호가 아니라 바이트 오프셋입니다.',
      async run(a) {
        a.remove('n-mtu');
        a.hl('p2');
        const parts = [['출발 198.51.100.7', 136, 'blue'], ['도착 203.0.113.9', 136, 'green'], ['순서 #2', 70, 'amber'], ['데이터 ▦▦', 92, 'teal']];
        let x = 360 - parts.reduce((s, p) => s + p[1], 0) / 2;
        for (let i = 0; i < parts.length; i++) {
          const [l, w, c] = parts[i];
          const p = a.packet(l, { at: [70, SLOT_Y[1]], color: c, w, round: 5, id: 'h' + i });
          await a.move(p, [x + w / 2, 400], 450);
          x += w;
        }
        a.text(314, 372, '헤더 = 꼬리표', { id: 'ht0', size: 12, weight: 700, color: 'amber' });
        a.text(531, 372, '사진 조각', { id: 'ht1', size: 12, weight: 700, color: 'teal' });
        a.caption('모든 조각에 같은 출발·도착 주소, 다른 순서 번호');
        await a.wait(900);
      },
    },
    {
      t: '각자 다른 길로 여행한다',
      easy: '조각들은 줄지어 같은 길로 가지 않아요. 갈림길마다 있는 라우터가 도착 주소를 보고 다음 길을 골라 줍니다. 길이 고장 나거나 바뀌면 다른 길로 돌아가기도 해서, 조각들이 서로 다른 길로 갈 수 있어요. 그러다 너무 붐비는 라우터에서 조각 하나가 사라졌어요!',
      deep: '라우터는 패킷의 목적지 IP를 라우팅 테이블과 비교(최장 접두사 일치)해 다음 홉을 고릅니다. 경로는 BGP·OSPF 같은 라우팅 프로토콜로 계속 갱신되고, ECMP 부하 분산은 보통 흐름(연결) 단위로 해시해서 한 TCP 연결의 패킷은 대개 같은 길로 가지만, 경로 변경·장애 때는 길이 바뀌고 순서가 뒤섞일 수 있습니다(그림은 이를 과장해 보여 줍니다). 라우터 큐가 가득 차면 패킷을 그냥 버립니다(tail drop).',
      async run(a) {
        for (const id of ['h0', 'h1', 'h2', 'h3', 'ht0', 'ht1']) a.remove(id);
        a.hl('p2', false);
        const routes = [
          ['p1', ['pc', 'R1', 'R4', 'dst', recvSlot(2)], 0, 2600],
          ['p2', ['pc', 'R2', 'R5', 'dst', recvSlot(0)], 250, 1800],
          ['p3', ['pc', 'R1', 'R3'], 500, 1200],
          ['p4', ['pc', 'R2', 'R3', 'R4', 'dst', recvSlot(1)], 750, 2000],
        ];
        a.caption('라우터마다 다음 길을 골라요');
        await a.par(...routes.map(([id, path, delay, dur]) => a.wait(delay).then(async () => {
          await a.move(id, path, dur);
          if (id === 'p3') {
            a.get('p3').set('#3 ✕', 'red');
            a.badge('R3', '꽉 참', 'red');
            a.hl('R3', true, 'red');
            await a.fadeOut('p3', 500);
          }
        })));
        a.caption('#3은 어디 갔지?');
        a.text(640, 267, '도착 순서', { size: 11.5, cls: 'muted', id: 'arr' });
        await a.wait(600);
      },
    },
    {
      t: '도착 순서는 뒤죽박죽',
      easy: '받는 쪽에는 #2, #4, #1 순서로 도착했어요. 순서 번호가 적혀 있으니 걱정 없습니다. 번호대로 자리를 맞추면… 3번 자리가 비어 있네요.',
      deep: '수신 TCP는 순서가 어긋난 세그먼트를 버퍼에 보관하고(out-of-order queue), 비어 있는 구간이 채워질 때까지 애플리케이션에 넘기지 않습니다. 이때 받은 마지막 연속 바이트에 대한 중복 ACK를 보내 빈 구간을 알립니다.',
      async run(a) {
        a.hl('R3', false);
        a.badge('R3', null);
        await a.wait(300);
        a.setText('arr', '번호순 정렬');
        await a.par(a.move('p1', recvSlot(0), 600), a.move('p2', recvSlot(1), 600), a.move('p4', recvSlot(3), 600));
        a.packet('#3 ?', { id: 'hole', at: recvSlot(2), color: 'gray', w: 52 });
        a.get('hole').g.style.opacity = 0.5;
        a.note('n-hole', 520, 400, '3번이 없어요!', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '사라진 조각은 다시 보낸다',
      easy: '받는 쪽이 "3번 못 받았어요"라고 알려 주면, 보내는 쪽은 보관해 둔 3번 조각을 다시 보냅니다. 이번엔 다른 길로 무사히 도착!',
      deep: 'TCP 송신자는 ACK를 받기 전까지 데이터를 재전송 버퍼에 보관합니다. 중복 ACK 3개를 받으면 빠른 재전송(fast retransmit)을, 아무 응답이 없으면 RTO 타이머 만료 후 재전송합니다. IP 자체는 손실을 복구하지 않습니다(best effort).',
      async run(a) {
        a.remove('n-hole');
        await a.send('dst', 'pc', '3번 다시!', { via: ['R4', 'R1'], color: 'red', dur: 1300 });
        a.hl('pc');
        await a.flash('pc');
        a.hl('pc', false);
        const p3 = a.packet('#3', { id: 'p3', at: 'pc', color: COLORS[2], w: 52 });
        a.caption('#3 재전송 (다른 길로)');
        await a.move(p3, ['R2', 'R5', 'dst', recvSlot(2)], 1700);
        a.remove('hole');
        await a.flash('dst');
        await a.wait(200);
      },
    },
    {
      t: '순서대로 다시 합치기',
      easy: '1, 2, 3, 4번이 모두 모였으니 번호 순서대로 이어 붙입니다. 원래 사진이 그대로 다시 만들어졌어요!',
      deep: '빈 구간이 채워지면 TCP는 연속된 바이트 스트림을 애플리케이션 소켓 버퍼로 넘기고, 누적 ACK로 송신자에게 수신 완료를 알립니다. 애플리케이션(브라우저·메신저)은 이 바이트 스트림을 파일로 해석합니다.',
      async run(a) {
        a.setText('arr', '');
        a.badge('dst', '4/4 ✓', 'green');
        await a.wait(300);
        const ids = ['p1', 'p2', 'p3', 'p4'];
        await a.par(...ids.map((id, i) => a.wait(i * 120).then(() => a.move(id, [636, 62], 700))));
        await a.par(...ids.map((id) => a.fadeOut(id, 250)), a.show('photo2', 400));
        a.hl('photo2', true, 'green');
        await a.flash('photo2');
        a.hl('photo2', false);
        await a.wait(300);
      },
    },
    {
      t: '겹겹이 포장 — 캡슐화',
      easy: '사실 조각 하나에도 포장지가 여러 겹입니다. 사진 조각을 "순서 담당(TCP)" 봉투에 넣고, 그걸 "주소 담당(IP)" 봉투에, 다시 "옆 장비까지 배달(이더넷)" 상자에 넣어요. 받는 쪽은 반대로 하나씩 벗겨 냅니다.',
      deep: 'TCP 세그먼트(포트·순서 번호) → IP 패킷(출발·목적지 IP, TTL) → 이더넷 프레임(출발·목적지 MAC, 끝에 FCS 오류 검출)으로 캡슐화됩니다. 라우터는 홉마다 이더넷 프레임을 새로 씌우지만 IP 주소는 끝까지 유지됩니다(NAT 제외).',
      async run(a) {
        a.clear();
        a.badge('dst', null);
        await a.par(...ROUTERS.map(([id]) => a.fade(id, 0.05, 400)), ...LINKS.map((_, i) => a.fade('m' + i, 0.08, 400)));
        const Y = 210;
        const parts = [
          ['data', '사진 조각', 110, 473, 'teal', '데이터', '앱이 보낸 내용'],
          ['tcp', 'TCP 헤더', 90, 373, 'amber', '4계층', '포트·순서 번호'],
          ['ip', 'IP 헤더', 100, 278, 'green', '3계층', '출발·도착 IP'],
          ['eth', '이더넷', 80, 188, 'blue', '2계층', 'MAC 주소'],
        ];
        for (let i = 0; i < parts.length; i++) {
          const [id, l, w, x, c, layer, desc] = parts[i];
          a.caption(i === 0 ? '원래 데이터' : `${l} 덧붙이기`);
          const p = a.packet(l, { id: 'L-' + id, at: [x, Y - 70], color: c, w, h: 34, round: 5 });
          p.g.style.opacity = 0;
          await a.par(a.move(p, [x, Y], 450), a.fade(p, 1, 450));
          if (id === 'eth') {
            const f = a.packet('FCS', { id: 'L-fcs', at: [550, Y - 70], color: 'blue', w: 44, h: 34, round: 5 });
            await a.move(f, [550, Y], 350);
          }
          a.text(x, Y - 30, layer, { size: 11.5, weight: 700, color: c });
          a.text(x, Y + 32, desc, { size: 11, cls: 'muted' });
          await a.wait(300);
        }
        a.note('n-frame', 360, 300, '받는 쪽은 바깥부터 하나씩 벗겨 내요 (역캡슐화)', { color: 'violet', w: 340 });
        await a.wait(800);
      },
    },
  ],
};

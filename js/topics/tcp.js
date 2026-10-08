// TCP: 3-way handshake, 순서 번호/ACK, 손실과 재전송, 흐름 제어, 연결 종료, UDP 비교
// 시간은 위에서 아래로 흐른다(사다리 그림). 단계마다 새로 그린다.
const CX = 110, SX = 610;

function title(a, s) { a.setText('title', s); }

/** 사다리 메시지 한 줄. dir: 1 = 클라이언트→서버, -1 = 서버→클라이언트 */
async function msg(a, dir, y0, y1, label, color, o = {}) {
  const xa = dir > 0 ? CX : SX, xb = dir > 0 ? SX : CX;
  const f = o.lost ? 0.55 : 1;
  const ex = xa + (xb - xa) * f, ey = y0 + (y1 - y0) * f;
  const line = a.raw('line', { x1: xa, y1: y0, x2: xa, y2: y0, class: 'edge ec-' + color, 'marker-end': o.lost ? null : 'url(#ah)' }, 'pkt');
  if (o.dashed) line.classList.add('dashed');
  // 글자 위치: 기본은 선 가운데, at:'start'면 출발점 근처
  let tx, ty, anchor;
  if (o.at === 'start') { tx = xa + dir * 10; ty = y0 - 8; anchor = dir > 0 ? 'start' : 'end'; }
  else { tx = (xa + xb) / 2; ty = (y0 + y1) / 2 - 14; anchor = 'middle'; }
  const t = a.text(tx, ty, label, { size: 11, mono: true, color, anchor, weight: 600 });
  t.style.opacity = 0;
  const p = a.packet(o.pk ?? '', { at: [xa, y0], color, w: o.pk ? undefined : 14, h: o.pk ? 20 : 14, size: 10.5 });
  await a.tween(o.dur || 750, (k) => {
    const x = xa + (ex - xa) * k, y = y0 + (ey - y0) * k;
    line.setAttribute('x2', x); line.setAttribute('y2', y);
    p.x = x; p.y = y; p.g.setAttribute('transform', `translate(${x} ${y})`);
    t.style.opacity = Math.min(1, k * 2);
  });
  if (o.lost) {
    p.set('✕', 'red');
    a.text(ex, ey + 16, '손실', { size: 11, color: 'red', weight: 700 });
    await a.fadeOut(p, 300);
  } else {
    await a.fadeOut(p, 150);
  }
}
/** 옆에 상태 글자 쓰기 */
function st(a, side, y, s, color) {
  return a.text(side < 0 ? CX - 10 : SX + 10, y, s, { size: 10.5, mono: true, anchor: side < 0 ? 'end' : 'start', color, cls: color ? '' : 'muted', weight: 700 });
}

export default {
  id: 'tcp',
  level: 2,
  cat: '네트워크',
  title: 'TCP — 믿을 수 있는 연결',
  sub: '길에서 패킷이 사라지거나 순서가 뒤바뀌어도, TCP는 빠짐없이 순서대로 전달한다.',
  analogy: 'TCP는 등기 우편과 같습니다. 보내기 전에 "받을 준비 됐어요?"를 확인하고, 편지마다 번호를 매겨 보내며, 받는 사람은 "몇 번까지 잘 받았어요"라고 답장합니다. 답장이 안 오면 다시 보내고, 받는 사람 우편함이 꽉 차면 잠깐 기다립니다.',
  keys: [
    'TCP는 데이터를 보내기 전에 3-way handshake(SYN → SYN-ACK → ACK)로 연결을 맺는다.',
    '모든 바이트에 순서 번호(seq)가 붙고, 받는 쪽은 "다음에 받을 번호"를 ACK로 알려 준다.',
    'ACK가 오지 않으면(타임아웃) 또는 같은 ACK가 3번 더 오면(중복 ACK) 재전송한다.',
    '받는 쪽은 남은 버퍼 크기(rwnd)를 알려 주고, 보내는 쪽은 그만큼만 보낸다(흐름 제어·슬라이딩 윈도우).',
    'UDP는 연결·순서·재전송이 없는 대신 빠르고 가볍다. 게임·영상통화·DNS·QUIC이 쓴다.',
  ],
  terms: [
    ['SYN / ACK / FIN', '연결 시작 / 받았음 확인 / 연결 끝을 알리는 TCP 헤더의 깃발(플래그)'],
    ['seq (순서 번호)', '이 세그먼트의 첫 바이트가 전체 데이터에서 몇 번째인지'],
    ['ack (확인 번호)', '"여기까지 받았으니 이 번호부터 보내 줘" — 다음에 받을 바이트 번호'],
    ['RTO', '재전송 타임아웃. ACK를 이 시간 안에 못 받으면 다시 보낸다'],
    ['윈도우(rwnd)', '받는 쪽이 지금 더 받을 수 있는 양. 보내는 쪽은 이만큼까지 ACK 없이 보낸다'],
    ['UDP', '연결 없이 데이터그램을 그냥 보내는 전송 프로토콜. 헤더 8바이트'],
  ],
  quiz: [
    { q: 'TCP가 연결을 맺을 때 주고받는 3-way handshake의 순서는?', c: ['SYN → SYN-ACK → ACK', 'ACK → SYN → FIN', 'SYN → ACK → FIN', 'SYN-ACK → SYN → ACK'], a: 0, why: '"연결할래요(SYN)" → "좋아요, 저도요(SYN-ACK)" → "확인!(ACK)" 순서입니다. FIN은 연결을 끊을 때 씁니다.', step: 0 },
    { q: '601 세그먼트가 사라진 뒤, 받는 쪽이 701·801·901을 받고도 계속 ack=601을 보내는 이유는?', c: ['601 세그먼트를 잘 받았다는 확인이라서', '받는 쪽 버퍼(rwnd)가 가득 찼다는 신호라서', '601부터의 데이터가 아직 안 와서, 다음에 받을 번호가 여전히 601이라서', '뒤에 온 701·801·901이 손상되어 버렸기 때문에'], a: 2, why: 'ack는 누적 확인으로 "다음에 기대하는 바이트 번호"입니다. 빈 구간이 채워질 때까지 같은 ack가 반복되고, 이것이 빠른 재전송의 신호가 됩니다.', step: 3 },
    { q: 'TCP 송신자가 ACK 없이 한 번에 보낼 수 있는 데이터 양은 어떻게 정해질까요?', c: ['rwnd와 cwnd 중 작은 값(min)', 'rwnd와 cwnd를 더한 값', 'rwnd만 따른다(cwnd는 UDP용 값)', 'cwnd만 따른다(rwnd는 참고용 값)'], a: 0, why: '받는 쪽 여유(rwnd)와 네트워크 혼잡을 고려한 혼잡 윈도우(cwnd)를 모두 넘지 않도록 min(rwnd, cwnd)만큼 보냅니다.', step: 4 },
  ],
  setup(a) {
    a.node('cli', CX, 34, { label: '클라이언트', color: 'blue', w: 128, h: 42, size: 14 });
    a.node('srv', SX, 34, { label: '서버', color: 'green', w: 128, h: 42, size: 14 });
    a.raw('line', { x1: CX, y1: 58, x2: CX, y2: 430, class: 'edge dashed' }, 'edge');
    a.raw('line', { x1: SX, y1: 58, x2: SX, y2: 430, class: 'edge dashed' }, 'edge');
    a.text(360, 30, '', { id: 'title', size: 15, weight: 800, layer: 'edge' });
    a.text(360, 50, '시간 ↓', { id: 'tdown', size: 10.5, cls: 'muted', layer: 'edge' });
  },
  steps: [
    {
      t: '3-way handshake — 연결 맺기',
      easy: '데이터를 보내기 전에 세 번 인사합니다. "연결할래요(SYN)" → "좋아요, 저도요(SYN-ACK)" → "확인!(ACK)". 이때 서로 "내 번호는 여기서부터 시작해요"라는 시작 번호도 알려 줘요.',
      deep: '클라이언트가 임의의 초기 순서 번호(ISN, 여기선 100)로 SYN을 보내고, 서버는 자기 ISN(300)과 ack=101로 SYN-ACK, 클라이언트가 ack=301로 마무리합니다. ISN을 무작위로 정하는 건 이전 연결의 패킷 혼동과 위조를 막기 위해서입니다. 1 RTT가 든 뒤에야 데이터를 보낼 수 있습니다.',
      async run(a) {
        a.clear('pkt', 'top');
        title(a, '연결 맺기 (3-way handshake)');
        st(a, -1, 70, 'CLOSED');
        st(a, 1, 70, 'LISTEN');
        await msg(a, 1, 90, 140, 'SYN  seq=100', 'blue', { pk: 'SYN' });
        st(a, -1, 90, 'SYN_SENT', 'blue');
        st(a, 1, 140, 'SYN_RCVD', 'green');
        await msg(a, -1, 150, 200, 'SYN-ACK  seq=300 ack=101', 'green', { pk: 'SYN-ACK' });
        st(a, -1, 200, 'ESTABLISHED', 'teal');
        await msg(a, 1, 210, 260, 'ACK  ack=301', 'blue', { pk: 'ACK' });
        st(a, 1, 260, 'ESTABLISHED', 'teal');
        a.note('n1', 360, 340, '서로의 시작 번호를 확인했어요\n이제 데이터를 보낼 수 있습니다', { color: 'teal', w: 260 });
        await a.wait(500);
      },
    },
    {
      t: '데이터 전송 — 순서 번호와 확인 응답',
      easy: '보내는 데이터에는 "몇 번째 바이트부터"라는 번호(seq)가 붙습니다. 받는 쪽은 "200번까지 받았으니 201번부터 주세요(ack=201)"처럼 답해요. 이렇게 빠짐없이 받았는지 확인합니다.',
      deep: 'seq는 세그먼트 첫 바이트의 번호이고, ack는 누적(cumulative) 확인으로 "다음에 기대하는 바이트 번호"입니다. 실제로는 ACK를 기다리지 않고 윈도우만큼 연달아 보내며, 수신 측은 지연 ACK(delayed ACK)로 두 세그먼트마다 한 번 확인하기도 합니다.',
      async run(a) {
        a.clear('pkt', 'top');
        title(a, '데이터 전송 (seq / ack)');
        const plan = [[101, 201], [201, 301], [301, 401]];
        for (let i = 0; i < plan.length; i++) {
          const [s, k] = plan[i];
          const y = 80 + i * 112;
          await msg(a, 1, y, y + 50, `seq=${s}  (100바이트)`, 'blue', { pk: '데이터', dur: 650 });
          st(a, 1, y + 50, `${k - 101}B 받음`, 'green');
          await msg(a, -1, y + 56, y + 106, `ack=${k}`, 'green', { pk: 'ACK', dur: 600 });
        }
        a.caption('ack = "다음엔 이 번호부터 보내 주세요"');
        await a.wait(300);
      },
    },
    {
      t: '패킷 손실 — 타임아웃 후 재전송',
      easy: '보낸 데이터가 길에서 사라지면 확인 답장(ACK)도 오지 않겠죠. 보내는 쪽은 타이머를 켜 두었다가, 시간이 다 되도록 답이 없으면 같은 데이터를 다시 보냅니다.',
      deep: 'RTO는 측정한 RTT의 평균과 편차로 계산하며(RFC 6298, 최소 1초 권장, 리눅스는 200ms), 재전송할 때마다 RTO를 두 배로 늘립니다(지수 백오프). 타임아웃은 혼잡의 강한 신호로 보아 혼잡 윈도우를 1 MSS로 줄입니다.',
      async run(a) {
        a.clear('pkt', 'top');
        title(a, '손실 → 타임아웃 → 재전송');
        await msg(a, 1, 84, 134, 'seq=401', 'blue', { pk: '데이터', lost: true, at: 'start' });
        a.text(62, 116, 'RTO 타이머', { size: 10.5, weight: 700, cls: 'muted' });
        const b = a.bar('rto', 22, 134, 80, { color: 'amber' });
        a.caption('ACK가… 안 오네?');
        await b.set(1, 1600);
        st(a, -1, 160, '⏰ 시간 초과', 'red');
        await msg(a, 1, 176, 226, '재전송 seq=401', 'amber', { pk: '데이터' });
        st(a, 1, 226, '받음 ✓', 'green');
        await msg(a, -1, 232, 282, 'ack=501', 'green', { pk: 'ACK' });
        await b.set(0, 200);
        a.note('n3', 360, 350, '확인(ACK)이 안 오면 → 기다렸다가 다시 보낸다', { color: 'amber', w: 320 });
        await a.wait(400);
      },
    },
    {
      t: '중복 ACK — 빠른 재전송',
      easy: '여러 개를 연달아 보냈는데 중간 하나(601)가 사라졌어요. 받는 쪽은 뒤의 것을 받을 때마다 "아직 601 기다려요!"를 반복합니다. 같은 답이 세 번 더 오면, 타이머를 기다리지 않고 바로 다시 보냅니다.',
      deep: '수신 측은 순서가 어긋난 세그먼트(701·801·901)를 버퍼에 두고 마지막 연속 지점 ack=601을 반복 전송합니다. 송신 측은 중복 ACK 3개에 빠른 재전송(fast retransmit)을 하고, 빠른 회복(fast recovery)으로 혼잡 윈도우를 절반으로만 줄입니다. 재전송된 601이 도착하면 ack=1001로 한 번에 확인됩니다. SACK 옵션을 쓰면 어떤 구간을 받았는지도 알려 줄 수 있습니다.',
      async run(a) {
        a.clear('pkt', 'top');
        title(a, '중복 ACK 3개 → 빠른 재전송');
        const segs = [[501], [601, true], [701], [801], [901]];
        const flights = segs.map(([sq, lost], i) => a.wait(i * 200).then(() =>
          msg(a, 1, 76 + i * 22, 126 + i * 22, `seq=${sq}`, lost ? 'red' : 'blue', { lost, at: 'start', dur: 700 })));
        // ACK: 501에 대한 정상 ACK 1개 + 701·801·901마다 중복 ACK
        const ackY = [128, 172, 194, 216];
        const ackL = ['ack=601', 'ack=601 중복1', 'ack=601 중복2', 'ack=601 중복3'];
        const acks = ackY.map((y, i) => a.wait([700, 1100, 1300, 1500][i]).then(() => {
          st(a, 1, y, ackL[i], i ? 'amber' : 'green');
          return msg(a, -1, y, y + 50, '', i ? 'amber' : 'green', { dur: 700 });
        }));
        await a.par(...flights, ...acks);
        st(a, 1, 150, '601 안 옴!', 'red');
        st(a, -1, 268, 'ACK 3중복!', 'amber');
        await a.wait(300);
        await msg(a, 1, 280, 330, '601 재전송 (타이머 X)', 'amber', { pk: '601' });
        await msg(a, -1, 336, 386, 'ack=1001  (한 번에 확인)', 'green', { pk: 'ACK' });
        a.caption('701~901은 이미 받아 두었으니 한 번에 확인');
        await a.wait(400);
      },
    },
    {
      t: '흐름 제어 — 슬라이딩 윈도우',
      easy: '받는 쪽 우편함(버퍼)이 꽉 차면 더 보내 봐야 넘칩니다. 그래서 받는 쪽은 "지금 몇 개 더 받을 수 있어요"를 알려 주고, 보내는 쪽은 딱 그만큼만 보내요. 보낼 수 있는 범위(창)가 앞으로 미끄러지듯 움직여서 "슬라이딩 윈도우"라고 합니다.',
      deep: 'ACK마다 수신 윈도우(rwnd, 16비트 + window scale 옵션)를 실어 보냅니다. rwnd=0이면 송신자는 멈추고 주기적으로 window probe를 보냅니다. 실제 전송량은 min(rwnd, cwnd)로, 네트워크 혼잡을 고려한 혼잡 윈도우(cwnd, slow start·AIMD·CUBIC/BBR)도 함께 적용됩니다.',
      async run(a) {
        a.clear('pkt', 'top');
        title(a, '흐름 제어 (슬라이딩 윈도우)');
        const bx = (i) => 192 + i * 46;   // 상자 i(0~7)의 가운데 x
        const RY = 140;
        a.text(bx(0) - 24, RY - 34, '보낼 데이터', { size: 11, anchor: 'start', cls: 'muted' });
        for (let i = 0; i < 8; i++) a.packet(String(i + 1), { id: 'b' + i, at: [bx(i), RY], color: 'gray', w: 38, h: 30, round: 6 });
        const win = a.raw('rect', { x: bx(0) - 23, y: RY - 21, width: 46 * 4, height: 42, rx: 9, style: 'fill: none; stroke: var(--amber); stroke-width: 2.5' }, 'pkt');
        const wl = a.text(bx(0) - 23 + 92, RY + 36, '창 = 4개', { size: 12, weight: 800, color: 'amber' });
        const setWin = (from, n, dur = 500) => {
          const x0 = +win.getAttribute('x'), w0 = +win.getAttribute('width');
          const x1 = bx(from) - 23, w1 = Math.max(6, 46 * n);
          return a.tween(dur, (k) => {
            win.setAttribute('x', x0 + (x1 - x0) * k); win.setAttribute('width', w0 + (w1 - w0) * k);
            wl.setAttribute('x', x0 + (x1 - x0) * k + (w0 + (w1 - w0) * k) / 2);
          });
        };
        [['● 확인 받음', 'green'], ['● 보냄(확인 대기)', 'blue'], ['● 아직', 'gray']].forEach(([l, c], i) =>
          a.text(bx(0) - 22 + [0, 92, 222][i], RY + 72, l, { size: 11, anchor: 'start', color: c, weight: 700 }));
        a.text(SX, 262, '수신 버퍼', { size: 11, weight: 700, cls: 'muted' });
        const buf = a.bar('buf', SX - 62, 282, 124, { color: 'green' });
        const rw = a.text(SX, 302, 'rwnd = 4', { size: 11, mono: true, weight: 700, color: 'green' });
        // 1~4 보내기
        await a.par(...[0, 1, 2, 3].map((i) => a.wait(i * 180).then(async () => {
          a.get('b' + i).set(null, 'blue');
          await a.send([bx(i), RY + 18], [SX, 270], String(i + 1), { color: 'blue', dur: 800, w: 30 });
          await buf.set((i + 1) / 4, 150);
        })));
        rw.textContent = 'rwnd = 0';
        a.setNode('srv', { color: 'red' });
        await a.send([SX, 300], [CX, 300], 'ack=5, rwnd=0', { color: 'red', dur: 800 });
        for (let i = 0; i < 4; i++) a.get('b' + i).set(null, 'green');
        wl.textContent = '창 = 0 (멈춤)';
        await setWin(4, 0);
        a.caption('버퍼가 꽉 참 → 보내는 쪽은 잠깐 대기');
        await a.wait(500);
        // 앱이 2개 읽어 감
        a.text(SX, 326, '앱이 2개 읽어 감', { size: 10.5, cls: 'muted' });
        await buf.set(0.5, 500);
        rw.textContent = 'rwnd = 2';
        a.setNode('srv', { color: 'green' });
        await a.send([SX, 350], [CX, 350], 'rwnd=2', { color: 'green', dur: 700 });
        wl.textContent = '창 = 2';
        await setWin(4, 2);
        await a.par(...[4, 5].map((i, j) => a.wait(j * 180).then(async () => {
          a.get('b' + i).set(null, 'blue');
          await a.send([bx(i), RY + 18], [SX, 270], String(i + 1), { color: 'blue', dur: 800, w: 30 });
          await buf.set(0.5 + (j + 1) / 4, 150);
        })));
        rw.textContent = 'rwnd = 0';
        await a.wait(300);
      },
    },
    {
      t: '연결 끊기 — 4-way handshake',
      easy: '다 보냈으면 "이제 그만 보낼게요(FIN)" → "알겠어요(ACK)" 하고, 상대도 남은 것을 마저 보낸 뒤 "저도 끝(FIN)" → "확인(ACK)"을 합니다. 양쪽이 각자 끝을 알리니 네 번입니다.',
      deep: 'TCP는 양방향이 독립적이라 한쪽만 먼저 닫을 수 있습니다(half-close). 먼저 닫은 쪽은 마지막 ACK가 유실될 경우를 대비해 TIME_WAIT 상태로 2MSL(보통 1~4분, 리눅스 60초) 기다립니다. 서버에 CLOSE_WAIT가 쌓이면 애플리케이션이 소켓을 안 닫는 버그일 때가 많습니다.',
      async run(a) {
        a.clear('pkt', 'top');
        a.setNode('srv', { color: 'green' });
        title(a, '연결 끊기 (4-way handshake)');
        st(a, -1, 70, 'ESTABLISHED', 'teal');
        st(a, 1, 70, 'ESTABLISHED', 'teal');
        await msg(a, 1, 90, 140, 'FIN', 'blue', { pk: 'FIN' });
        st(a, -1, 90, 'FIN_WAIT_1', 'blue');
        st(a, 1, 140, 'CLOSE_WAIT', 'green');
        await msg(a, -1, 146, 196, 'ACK', 'green', { pk: 'ACK' });
        st(a, -1, 196, 'FIN_WAIT_2', 'blue');
        await msg(a, -1, 202, 252, '남은 데이터', 'gray', { pk: '데이터', dashed: true });
        await msg(a, -1, 258, 308, 'FIN', 'green', { pk: 'FIN' });
        st(a, 1, 258, 'LAST_ACK', 'green');
        st(a, -1, 308, 'TIME_WAIT', 'amber');
        await msg(a, 1, 314, 364, 'ACK', 'blue', { pk: 'ACK' });
        st(a, 1, 364, 'CLOSED', 'gray');
        await a.wait(400);
        st(a, -1, 404, 'CLOSED', 'gray');
        a.text(CX + 12, 384, '2MSL 기다린 뒤 닫힘', { size: 10.5, anchor: 'start', cls: 'muted' });
        await a.wait(300);
      },
    },
    {
      t: 'UDP와 비교 — 일단 던지고 본다',
      easy: 'UDP는 인사도, 번호 확인도, 다시 보내기도 없습니다. 그냥 던져요! 하나가 사라져도 아무도 다시 보내지 않지만, 그만큼 빠르고 가볍습니다. 조금 끊겨도 실시간이 중요한 게임·영상통화에 어울립니다.',
      deep: 'UDP 헤더는 포트·길이·체크섬뿐인 8바이트입니다. 핸드셰이크가 없어 첫 패킷부터 데이터를 보내고, HOL 블로킹도 없습니다. 신뢰성이 필요하면 애플리케이션이 직접 구현하며, QUIC(HTTP/3)은 UDP 위에 재전송·순서·혼잡 제어·TLS를 얹은 대표적인 예입니다.',
      async run(a) {
        a.clear('pkt', 'top');
        title(a, 'UDP — 연결 없이 그냥 보내기');
        st(a, -1, 70, '인사 없음', 'amber');
        const d = [1, 2, 3, 4];
        await a.par(...d.map((n, i) => a.wait(i * 200).then(() =>
          msg(a, 1, 86 + i * 24, 136 + i * 24, `데이터그램 #${n}`, n === 2 ? 'red' : 'amber', { lost: n === 2, at: 'start', dur: 700 }))));
        st(a, 1, 136, '#1 ✓', 'green');
        st(a, 1, 184, '#3 ✓', 'green');
        st(a, 1, 208, '#4 ✓', 'green');
        st(a, 1, 232, '#2 ✕ 없음', 'red');
        await a.wait(300);
        a.note('n-tcp', 240, 320, 'TCP: 연결 · 순서 보장 · 재전송\n흐름/혼잡 제어 · 헤더 20바이트+', { color: 'blue', w: 232 });
        a.note('n-udp', 480, 320, 'UDP: 연결·순서·재전송 없음\n빠르고 가벼움 · 헤더 8바이트', { color: 'amber', w: 232 });
        a.text(360, 392, 'TCP: 웹·메일·파일  /  UDP: 게임·통화·DNS·QUIC', { size: 12, weight: 700, cls: 'muted' });
        await a.wait(800);
      },
    },
  ],
};

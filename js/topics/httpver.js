// HTTP/1.0 → 1.1 → 2 → 3 비교
const CX = 92, SX = 628;

/** 클라이언트-서버 사이에 연결 통로(파이프)를 그린다 */
function pipe(a, id, y, label, color = 'gray') {
  a.zone(id, CX + 62, y - 20, SX - CX - 124, 40, { color });
  if (label) a.text(CX + 70, y - 28, label, { size: 11, anchor: 'start', cls: 'muted', layer: 'zone' });
}
async function handshake(a, y, labels = ['SYN', 'SYN-ACK', 'ACK']) {
  for (let i = 0; i < labels.length; i++) {
    const fwd = i % 2 === 0;
    await a.send(fwd ? [CX + 70, y] : [SX - 70, y], fwd ? [SX - 70, y] : [CX + 70, y], labels[i], { color: 'gray', dur: 520 });
  }
}
async function req(a, y, name, color, big = false) {
  await a.send([CX + 70, y], [SX - 70, y], 'GET ' + name, { color, dur: 650 });
  await a.send([SX - 70, y], [CX + 70, y], name + (big ? ' (큰 파일)' : ''), { color, dur: big ? 1700 : 650 });
}

export default {
  id: 'httpver',
  level: 3,
  cat: '웹',
  title: 'HTTP 버전 비교 — 1.0부터 3까지',
  sub: '같은 웹페이지를 받아도 HTTP 버전에 따라 기다리는 시간이 다르다.',
  analogy: 'HTTP/1.0은 물건 하나 살 때마다 가게 문을 열고 닫는 것, 1.1은 문을 열어 둔 채 한 줄로 계산하는 것, 2는 계산대 하나에서 여러 손님 물건을 섞어 처리하는 것, 3은 길이 막혀도 다른 손님은 계속 지나가는 전용 차선입니다.',
  keys: [
    'HTTP/1.0: 요청마다 TCP 연결을 새로 맺는다 → 핸드셰이크 비용이 반복된다.',
    'HTTP/1.1: Keep-Alive로 연결을 재사용하지만, 한 연결에서는 응답이 순서대로만 온다(HOL 블로킹).',
    'HTTP/2: 하나의 연결에서 여러 스트림을 프레임 단위로 섞어 보낸다(멀티플렉싱) + 헤더 압축(HPACK).',
    'HTTP/2도 TCP 위라서 패킷 하나가 손실되면 모든 스트림이 기다린다.',
    'HTTP/3: UDP 기반 QUIC 위에서 스트림별로 독립 전달 → 손실이 다른 스트림을 막지 않고, 연결 수립도 빠르다.',
  ],
  terms: [
    ['RTT', 'Round Trip Time. 요청이 갔다가 돌아오는 왕복 시간'],
    ['Keep-Alive', '응답 후에도 TCP 연결을 닫지 않고 재사용하는 방식'],
    ['HOL 블로킹', 'Head-of-Line. 앞의 것이 늦으면 뒤의 것도 줄줄이 기다리는 현상'],
    ['멀티플렉싱', '한 연결 안에 여러 요청/응답을 잘게 나눠 섞어 보내는 것'],
    ['QUIC', 'UDP 위에 신뢰성·암호화(TLS 1.3)·스트림을 직접 구현한 전송 프로토콜'],
  ],
  quiz: [
    { q: 'HTTP/1.1이 HTTP/1.0보다 나아진 점은 무엇일까요?', c: ['파일을 조각내 여러 파일을 한 통로에 섞어 보낸다', 'UDP를 써서 인사 없이 바로 보낸다', '조각 하나가 사라져도 다른 파일은 계속 도착한다', '파일마다 새로 연결하지 않고 한 번 맺은 연결을 계속 쓴다'], a: 3, why: 'HTTP/1.1은 Keep-Alive로 연결을 재사용합니다. 섞어 보내기는 HTTP/2, UDP와 스트림 독립은 HTTP/3의 특징입니다.', step: 1 },
    { q: 'HTTP/2 연결에서 TCP 패킷 하나가 손실되면 어떻게 될까요?', c: ['손실된 패킷이 속한 스트림만 멈추고 나머지는 계속 간다', '연결을 끊고 HTTP/1.1로 다시 접속한다', '재전송될 때까지 그 연결의 모든 스트림이 기다린다', '손실된 조각은 버리고 나머지만 화면에 그린다'], a: 2, why: 'TCP는 바이트 순서를 보장해야 해서 빈 곳이 채워질 때까지 뒤 데이터를 넘기지 않습니다(TCP 수준 HOL 블로킹). 스트림별로 독립인 건 HTTP/3(QUIC)입니다.', step: 4 },
    { q: 'Wi-Fi에서 LTE로 바뀌어 IP가 달라져도 HTTP/3 연결이 유지될 수 있는 이유는?', c: ['QUIC이 IP·포트가 아니라 Connection ID로 연결을 식별해서', 'TCP Keep-Alive가 새 IP로 자동 재연결해서', 'DNS가 바뀐 IP를 서버에 알려 줘서', '서버 푸시로 새 IP에 연결을 다시 열어 줘서'], a: 0, why: 'TCP 연결은 IP·포트 4튜플로 식별되어 IP가 바뀌면 끊기지만, QUIC은 Connection ID로 식별해 연결을 옮길 수 있습니다.', step: 5 },
  ],
  setup(a) {
    a.node('cli', CX, 220, { label: '브라우저', icon: '💻', color: 'blue', h: 300, w: 104 });
    a.node('srv', SX, 220, { label: '서버', icon: '🖥️', color: 'green', h: 300, w: 104 });
    a.text(360, 30, '', { id: 'title', size: 20, weight: 800, layer: 'edge' });
    a.text(360, 410, '', { id: 'foot', size: 12.5, cls: 'muted', layer: 'edge' });
  },
  steps: [
    {
      t: 'HTTP/1.0 — 요청마다 새 연결',
      easy: '파일 하나를 받을 때마다 "안녕하세요(연결) → 주세요 → 받았어요 → 안녕히(끊기)"를 반복합니다. 파일이 3개면 인사도 3번 합니다.',
      deep: '매 요청마다 TCP 3-way handshake(1 RTT)가 필요하고, 연결 직후에는 TCP 혼잡 제어의 slow start 때문에 전송 속도도 느립니다. HTML + CSS + JS를 차례로 받으면 6 RTT(병렬 연결을 써도 HTML 뒤에 연결을 또 맺어야 해서 약 4 RTT).',
      async run(a) {
        a.clear('pkt', 'zone', 'top');
        a.setText('title', 'HTTP/1.0');
        a.setText('foot', '연결 → 요청 → 응답 → 끊기, 파일마다 반복');
        const files = [['index.html', 'blue'], ['style.css', 'violet'], ['app.js', 'amber']];
        for (let i = 0; i < files.length; i++) {
          const y = 120 + i * 100;
          pipe(a, 'p' + i, y, `연결 #${i + 1}`);
          await handshake(a, y);
          await req(a, y, files[i][0], files[i][1]);
          a.text(SX - 140, y + 30, '연결 종료 ✕', { size: 11, color: 'red', layer: 'pkt' });
        }
      },
    },
    {
      t: 'HTTP/1.1 — 연결 재사용(Keep-Alive)',
      easy: '한 번 연결하면 끊지 않고 계속 씁니다. 인사는 한 번만! 하지만 한 줄로 서서 차례대로만 받을 수 있어요.',
      deep: 'Connection: keep-alive가 기본입니다. 파이프라이닝도 명세에 있지만 응답은 반드시 요청 순서대로 와야 해서 사실상 쓰이지 않았습니다.',
      async run(a) {
        a.clear('pkt', 'zone', 'top');
        a.setText('title', 'HTTP/1.1');
        a.setText('foot', '핸드셰이크 1번, 이후 같은 연결에서 순서대로');
        pipe(a, 'p0', 220, '연결 #1 (유지)', 'blue');
        await handshake(a, 220);
        await req(a, 220, 'index.html', 'blue');
        await req(a, 220, 'style.css', 'violet');
        await req(a, 220, 'app.js', 'amber');
      },
    },
    {
      t: 'HTTP/1.1의 문제 — 줄 맨 앞이 막히면',
      easy: '앞사람이 큰 짐을 받느라 오래 걸리면, 뒤의 작은 파일들도 다 기다려야 합니다. 그래서 브라우저는 줄을 여러 개(연결 6개) 만들어 버티었죠.',
      deep: 'HTTP 수준 HOL 블로킹. 브라우저는 출처당 최대 6개 TCP 연결을 병렬로 열고, 개발자들은 도메인 샤딩·스프라이트·번들링 같은 우회책을 썼습니다.',
      async run(a) {
        a.clear('pkt', 'zone', 'top');
        a.setText('title', 'HTTP/1.1 — HOL 블로킹');
        a.setText('foot', '큰 이미지 하나 때문에 뒤의 CSS·JS가 대기');
        pipe(a, 'p0', 220, '연결 #1', 'blue');
        const wait1 = a.packet('style.css 대기…', { at: [CX + 110, 270], color: 'violet' });
        const wait2 = a.packet('app.js 대기…', { at: [CX + 110, 304], color: 'amber' });
        await req(a, 220, 'hero.png', 'red', true);
        await a.move(wait1, [CX + 110, 220], 300);
        await a.fadeOut(wait1, 150);
        await req(a, 220, 'style.css', 'violet');
        await a.move(wait2, [CX + 110, 220], 300);
        await a.fadeOut(wait2, 150);
        await req(a, 220, 'app.js', 'amber');
      },
    },
    {
      t: 'HTTP/2 — 한 연결에 여러 스트림을 섞어서',
      easy: '파일을 작은 조각(프레임)으로 잘라 한 통로에 섞어 보냅니다. 큰 파일이 있어도 작은 파일 조각이 사이사이 끼어 먼저 도착해요.',
      deep: '바이너리 프레이밍 + 스트림 ID로 멀티플렉싱합니다. HPACK 헤더 압축, 스트림 우선순위, 서버 푸시(현재는 대부분 폐기)가 추가됐습니다. 보통 TLS(ALPN h2) 위에서 동작합니다.',
      async run(a) {
        a.clear('pkt', 'zone', 'top');
        a.setText('title', 'HTTP/2 — 멀티플렉싱');
        a.setText('foot', '스트림 1·3·5의 프레임이 한 연결 안에서 섞여 흐른다');
        pipe(a, 'p0', 220, '연결 #1 (TCP + TLS)', 'blue');
        await handshake(a, 220, ['SYN', 'SYN-ACK', 'ACK+TLS']);
        await a.send([CX + 70, 220], [SX - 70, 220], 'GET ×3 (한 번에)', { color: 'blue', dur: 650 });
        const seq = [['png 1/3', 'red'], ['css', 'violet'], ['png 2/3', 'red'], ['js', 'amber'], ['png 3/3', 'red']];
        const flights = seq.map(([l, c], i) => a.wait(i * 260).then(() => a.send([SX - 70, 220], [CX + 70, 220], l, { color: c, dur: 1100 })));
        await a.par(...flights);
        a.note('n1', 360, 300, 'CSS·JS가 큰 이미지보다 먼저 끝남!', { color: 'green' });
        await a.wait(900);
      },
    },
    {
      t: 'HTTP/2의 한계 — TCP 패킷 손실',
      easy: '하지만 통로 자체(TCP)는 하나라서, 조각 하나가 길에서 사라지면 다시 올 때까지 모든 파일이 멈춥니다.',
      deep: 'TCP는 바이트 순서를 보장해야 하므로 세그먼트 하나가 손실되면 뒤의 세그먼트를 애플리케이션에 넘기지 않습니다(TCP 수준 HOL 블로킹). 손실률이 높은 모바일망에서는 HTTP/1.1보다 느려지기도 합니다.',
      async run(a) {
        a.clear('pkt', 'zone', 'top');
        a.setText('title', 'HTTP/2 — TCP HOL 블로킹');
        a.setText('foot', '패킷 1개 손실 → 재전송될 때까지 모든 스트림 정지');
        pipe(a, 'p0', 220, '연결 #1 (TCP)', 'blue');
        const lost = a.packet('png 1/3', { at: [SX - 70, 220], color: 'red' });
        const others = [a.packet('css', { at: [SX - 70, 220], color: 'violet' }), a.packet('js', { at: [SX - 70, 220], color: 'amber' })];
        await a.par(a.move(lost, [360, 220], 700), a.move(others[0], [470, 220], 500), a.move(others[1], [540, 220], 400));
        lost.set('손실 ✕', 'gray');
        await a.par(a.move(lost, [360, 290], 400), a.fade(lost, 0.4, 400));
        await a.par(a.move(others[0], [220, 220], 500), a.move(others[1], [270, 220], 500));
        a.note('n2', 245, 172, '받았지만 앞 순서가 없어서 대기', { color: 'red' });
        await a.wait(900);
        a.remove(lost);
        await a.send([SX - 70, 220], [170, 220], 'png 1/3 (재전송)', { color: 'red', dur: 900, keep: true });
        await a.par(a.fadeOut(others[0]), a.fadeOut(others[1]));
      },
    },
    {
      t: 'HTTP/3 — QUIC: 스트림이 서로 독립',
      easy: 'HTTP/3는 통로를 새로 설계했습니다. 조각 하나가 사라져도 그 파일만 기다리고, 다른 파일은 그대로 도착합니다. 처음 연결도 더 빠릅니다.',
      deep: 'QUIC은 UDP 위에서 스트림별 순서 보장을 하므로 손실이 해당 스트림만 막습니다. TLS 1.3이 내장돼 연결 수립이 1-RTT(재방문 시 0-RTT)이고, Connection ID 덕분에 Wi-Fi→LTE로 IP가 바뀌어도 연결이 유지됩니다.',
      async run(a) {
        a.clear('pkt', 'zone', 'top');
        a.setText('title', 'HTTP/3 — QUIC (UDP)');
        a.setText('foot', '손실은 그 스트림만 기다림, 연결 수립 1-RTT');
        pipe(a, 's1', 150, '스트림 png', 'red');
        pipe(a, 's2', 220, '스트림 css', 'violet');
        pipe(a, 's3', 290, '스트림 js', 'amber');
        await handshake(a, 220, ['Initial+TLS', 'Handshake 완료']);
        const lost = a.packet('png', { at: [SX - 70, 150], color: 'red' });
        const done = a.par(
          a.send([SX - 70, 220], [CX + 70, 220], 'css', { color: 'violet', dur: 1000 }),
          a.send([SX - 70, 290], [CX + 70, 290], 'js', { color: 'amber', dur: 1000 }),
        );
        await a.move(lost, [380, 150], 600);
        lost.set('손실 ✕', 'gray');
        await a.fade(lost, 0.4, 300);
        await done;
        a.note('n3', 230, 360, 'css·js는 이미 도착 ✓', { color: 'green' });
        a.remove(lost);
        await a.send([SX - 70, 150], [CX + 70, 150], 'png (재전송)', { color: 'red', dur: 900 });
      },
    },
  ],
};

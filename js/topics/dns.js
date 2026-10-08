// DNS: 이름(example.com)을 IP 주소로 바꾸는 과정
export default {
  id: 'dns',
  level: 1,
  cat: '네트워크',
  title: 'DNS — 이름을 주소로 바꾸기',
  sub: 'example.com을 입력하면 컴퓨터는 어떻게 서버의 위치를 찾을까?',
  analogy: 'DNS는 인터넷의 전화번호부입니다. 사람은 "피자집"이라는 이름을 기억하고, 전화기는 번호로 겁니다. 번호를 모르면 안내 센터(리졸버)에 묻고, 안내 센터는 지역별 전화번호부를 차례로 찾아봅니다.',
  keys: [
    '컴퓨터끼리는 이름이 아니라 IP 주소(숫자)로 통신한다. DNS는 이름 → IP 변환 서비스다.',
    '리졸버는 루트 → TLD(.com) → 권한 네임서버 순서로 물어 답을 찾는다.',
    '찾은 답은 TTL(유효 시간) 동안 캐시에 저장되어, 다음 조회는 훨씬 빠르다.',
    'DNS 조회가 끝나야 실제 웹 서버 접속(TCP/TLS/HTTP)이 시작된다.',
  ],
  terms: [
    ['IP 주소', '인터넷에서 기기를 찾는 숫자 주소. 예: 93.184.216.34 (IPv4, 이 그림의 예시 주소)'],
    ['리졸버', '내 대신 DNS 서버들을 돌아다니며 답을 찾아 주는 서버. 보통 통신사나 8.8.8.8, 1.1.1.1'],
    ['TLD', '최상위 도메인. .com, .kr, .org 같은 맨 끝 부분'],
    ['권한 네임서버', '그 도메인의 진짜 정답(레코드)을 가지고 있는 서버'],
    ['TTL', 'Time To Live. 답을 캐시에 보관해도 되는 시간(초)'],
    ['A 레코드', '도메인 → IPv4 주소 정보. IPv6는 AAAA 레코드'],
  ],
  quiz: [
    { q: '같은 사이트에 두 번째로 접속하면 DNS 단계가 훨씬 빠른 이유는?', c: ['처음 알아낸 IP를 캐시(메모장)에 적어 두어 다시 묻지 않아도 되어서', 'DNS 서버가 두 번째 요청을 우선 처리해 주어서', '루트 서버가 답을 미리 브라우저에 보내 두어서', '웹 서버가 내 컴퓨터 가까이로 옮겨 와서'], a: 0, why: '브라우저·OS·리졸버가 답을 TTL 동안 캐시해 두므로, 캐시 hit이면 아무에게도 묻지 않고 바로 접속합니다.', step: 7 },
    { q: '리졸버가 처음 듣는 이름(example.com)의 답을 찾을 때 묻는 순서로 옳은 것은?', c: ['TLD(.com) → 루트 → 권한 네임서버', '권한 네임서버 → TLD(.com) → 루트', '루트 → 권한 네임서버 → TLD(.com)', '루트 → TLD(.com) → 권한 네임서버'], a: 3, why: '꼭대기인 루트가 .com 담당을, .com TLD 서버가 example.com 담당을 알려 주고, 마지막으로 권한 네임서버가 진짜 IP를 답합니다.', step: 2 },
    { q: 'DNS 질의 방식에 대한 설명으로 옳은 것은?', c: ['클라이언트→리졸버, 리졸버→각 서버 모두 재귀 질의다', '클라이언트→리졸버는 반복 질의, 리졸버→각 서버는 재귀 질의다', '클라이언트→리졸버는 재귀 질의, 리졸버→각 서버는 반복 질의다', '클라이언트→리졸버, 리졸버→각 서버 모두 반복 질의다'], a: 2, why: '클라이언트는 리졸버에게 최종 답을 책임지고 달라고(재귀) 하고, 리졸버는 루트·TLD·권한 서버에 차례로 물어 referral을 따라갑니다(반복).', step: 1 },
  ],
  setup(a) {
    a.zone('z-net', 470, 18, 236, 404, { label: 'DNS 서버 계층', color: 'violet' });
    a.node('pc', 92, 150, { label: '내 브라우저', icon: '💻', color: 'blue', h: 70 });
    a.node('res', 300, 150, { label: '리졸버', sub: '통신사 / 8.8.8.8', icon: '📒', color: 'amber', w: 128, h: 70 });
    a.node('root', 588, 80, { label: '루트 서버', sub: '.', icon: '🌐', color: 'violet', w: 150 });
    a.node('tld', 588, 220, { label: 'TLD 서버', sub: '.com 담당', icon: '🏷️', color: 'violet', w: 150 });
    a.node('auth', 588, 360, { label: '권한 네임서버', sub: 'example.com 담당', icon: '📜', color: 'violet', w: 150 });
    a.node('web', 92, 360, { label: '웹 서버', sub: '93.184.216.34', icon: '🖥️', color: 'green', h: 70, hidden: true });
    a.edge('pc', 'res', { both: true, dashed: true });
    a.edge('res', 'root', { both: true, dashed: true });
    a.edge('res', 'tld', { both: true, dashed: true });
    a.edge('res', 'auth', { both: true, dashed: true });
    a.edge('pc', 'web', { id: 'e-web', hidden: true, label: 'IP로 직접 접속', lx: 52, ly: 0 });
  },
  steps: [
    {
      t: '주소창에 이름을 입력',
      easy: '주소창에 example.com을 치면, 브라우저는 먼저 "이 이름의 번호를 내가 이미 알고 있나?" 하고 자기 메모장(캐시)을 봅니다. 처음이라 모릅니다.',
      deep: '브라우저 DNS 캐시 → OS 캐시(hosts 파일 포함) 순으로 확인합니다. 모두 miss이면 OS의 stub resolver가 설정된 재귀 리졸버(DHCP로 받은 주소 또는 8.8.8.8 등)로 UDP 53번 포트 질의를 보냅니다.',
      async run(a) {
        a.hl('pc');
        a.caption('example.com … 주소가 뭐였더라?');
        const q = a.packet('example.com ?', { at: 'pc', color: 'blue', id: 'q' });
        await a.move(q, [92, 96], 500);
        a.badge('pc', '캐시 없음', 'red');
        await a.wait(700);
        await a.fadeOut('q');
        a.hl('pc', false);
      },
    },
    {
      t: '리졸버에게 물어보기',
      easy: '모르니까 안내 센터 역할을 하는 "리졸버"에게 물어봅니다. 리졸버도 처음 듣는 이름이라 직접 찾아 나섭니다.',
      deep: '클라이언트 → 리졸버는 "재귀 질의(recursive query)"입니다. 리졸버는 최종 답을 돌려줄 책임을 지고, 그 뒤로는 각 서버에 "반복 질의(iterative query)"를 합니다.',
      async run(a) {
        await a.send('pc', 'res', 'example.com ?', { color: 'blue' });
        a.hl('res');
        a.badge('res', '캐시 없음', 'red');
        await a.wait(400);
      },
    },
    {
      t: '루트 서버: ".com은 저기 가 보세요"',
      easy: '리졸버는 가장 꼭대기인 루트 서버에 묻습니다. 루트는 답을 모르지만 ".com 담당 서버는 저기야"라고 알려 줍니다.',
      deep: '루트 서버는 전 세계 13개 이름(a~m.root-servers.net)이지만 애니캐스트로 수천 대가 운영됩니다. 응답은 .com TLD 서버들의 NS 레코드(referral)입니다.',
      async run(a) {
        await a.send('res', 'root', 'example.com ?', { color: 'amber' });
        a.hl('root');
        await a.flash('root');
        await a.send('root', 'res', '.com → TLD로', { color: 'violet' });
        a.hl('root', false);
      },
    },
    {
      t: 'TLD 서버: "example.com 담당은 저기"',
      easy: '.com 서버도 정확한 번호는 모르지만, example.com을 관리하는 서버가 어디인지는 압니다.',
      deep: 'TLD 서버(Verisign 운영 .com)는 도메인 등록 정보에 따라 example.com의 권한 네임서버 NS 레코드를 돌려줍니다.',
      async run(a) {
        await a.send('res', 'tld', 'example.com ?', { color: 'amber' });
        a.hl('tld');
        await a.flash('tld');
        await a.send('tld', 'res', 'ns.example.com', { color: 'violet' });
        a.hl('tld', false);
      },
    },
    {
      t: '권한 네임서버: 정답!',
      easy: '드디어 example.com의 진짜 주인이 정답을 알려 줍니다: 93.184.216.34',
      deep: '권한 네임서버가 A 레코드(93.184.216.34, TTL 3600)를 응답합니다. 응답에 AA(Authoritative Answer) 플래그가 붙습니다.',
      async run(a) {
        await a.send('res', 'auth', 'example.com ?', { color: 'amber' });
        a.hl('auth', true, 'green');
        await a.flash('auth');
        await a.send('auth', 'res', '93.184.216.34', { color: 'green' });
        a.hl('auth', false);
      },
    },
    {
      t: '저장하고 알려 주기',
      easy: '리졸버는 이 답을 메모해 두고(캐시), 브라우저에게 알려 줍니다. 브라우저도 메모해 둡니다.',
      deep: '리졸버와 브라우저/OS 모두 TTL 동안 결과를 캐시합니다. TTL이 길면 빠르지만, IP를 바꿨을 때 전 세계에 반영되는 데 오래 걸립니다(DNS 전파).',
      async run(a) {
        a.badge('res', 'TTL 3600s', 'green');
        await a.send('res', 'pc', '93.184.216.34', { color: 'green' });
        a.badge('pc', '93.184.216.34', 'green');
        a.hl('res', false);
      },
    },
    {
      t: '이제 진짜 서버로 접속',
      easy: '번호를 알았으니 이제 웹 서버에 바로 연결합니다. DNS는 여기서 할 일이 끝났습니다.',
      deep: '이후 TCP 3-way handshake → TLS 핸드셰이크 → HTTP 요청이 이어집니다. DNS 조회 시간은 웹 성능 지표에서 "DNS lookup"으로 따로 측정됩니다.',
      async run(a) {
        await a.par(a.show('web'), a.show('e-web'));
        await a.send('pc', 'web', 'GET /', { color: 'blue' });
        a.hl('web', true, 'green');
        await a.send('web', 'pc', '200 OK', { color: 'green' });
        a.hl('web', false);
      },
    },
    {
      t: '두 번째 방문은 즉시',
      easy: '다시 방문하면 메모장에 번호가 있으니 아무에게도 묻지 않고 바로 접속합니다. 그래서 두 번째는 빠릅니다.',
      deep: '캐시 hit 시 DNS 왕복이 0이 됩니다. 브라우저는 <link rel="dns-prefetch">로 미리 조회해 두기도 하고, DoH(DNS over HTTPS)로 질의를 암호화하기도 합니다.',
      async run(a) {
        a.badge('pc', '캐시 HIT', 'green');
        await a.flash('pc');
        await a.send('pc', 'web', 'GET /', { color: 'blue', dur: 600 });
        await a.send('web', 'pc', '200 OK', { color: 'green', dur: 600 });
      },
    },
  ],
};

// VPN: 집에서 사내망에 닿지 않는 문제 → 인증·터널·사내 주소 → 캡슐화+암호화(패킷 안의 패킷)
// → 원격 접속 vs 사이트 간 → IPsec·TLS·WireGuard → 한계와 위험 → 제로 트러스트(ZTNA)와 정리
// 장면이 크게 바뀌는 단계는 무대를 통째로 비우고 다시 그린다(빨리감기에도 같은 결과).
// 주소는 설명용 예시(사설 대역, 203.0.113.x·198.51.100.x 문서용 대역)다.

const ALL = ['zone', 'edge', 'node', 'pkt', 'top'];
const wipe = (a) => a.clear(...ALL);
const HOME_PUB = '198.51.100.7';
const GW_PUB = '203.0.113.10';
const TY = 190; // 터널 높이(1~3단계)

/** 두 점 사이에 굵고 반투명한 터널을 그린다(점점 늘어나며) */
function tube(a, x1, y1, x2, y2, color = 'teal', dur = 600, width = 22) {
  const p = a.raw('path', { d: `M${x1} ${y1} L${x1} ${y1}`, style: `fill: none; stroke: var(--${color}); stroke-width: ${width}; stroke-linecap: round; opacity: .28` }, 'edge');
  return a.tween(dur, (k) => p.setAttribute('d', `M${x1} ${y1} L${x1 + (x2 - x1) * k} ${y1 + (y2 - y1) * k}`)).then(() => p);
}
/** 선 위의 비율 t 지점 */
const lerp = (x1, y1, x2, y2, t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];

/* ---------- 기술 카드(5단계) ---------- */
const CARDS = [
  { x: 128, title: 'IPsec', color: 'blue', sub: 'IP 패킷째 보호하는 표준', stack: [['IP', 34, 'gray'], ['ESP', 46, 'amber'], ['🔒 원래 패킷', 112, 'violet']], lines: ['국제 표준, 역사가 깊음', '장비끼리(사이트 간)에 많이', '설정 항목이 많은 편'] },
  { x: 360, title: 'SSL/TLS VPN', color: 'teal', sub: 'HTTPS 기술을 응용', stack: [['IP', 30, 'gray'], ['TCP 443', 66, 'amber'], ['🔒 TLS 안 패킷', 96, 'violet']], lines: ['웹 자물쇠와 같은 TLS 암호', '443번이라 어디서든 잘 통과', '직원 원격 접속에 흔함'] },
  { x: 592, title: 'WireGuard', color: 'green', sub: '작고 빠른 최신형', stack: [['IP', 34, 'gray'], ['UDP', 46, 'amber'], ['🔒 원래 패킷', 112, 'violet']], lines: ['2020년 리눅스에 들어간 신예', '코드가 짧고 설정이 단순', '최신 암호만 골라 씀'] },
];

/* ---------- 제로 트러스트 확인 항목(7단계) ---------- */
const CHECKS = ['① 누구? (2단계 인증)', '② 기기 안전? (업데이트)', '③ 이 앱 쓸 권한?'];

export default {
  id: 'vpn',
  level: 3,
  cat: '네트워크',
  title: 'VPN — 인터넷 위에 만든 보이지 않는 전용 터널',
  sub: '집이나 카페에서도 회사 안에 있는 것처럼, 공용 인터넷 위에 암호화된 통로를 만드는 기술',
  analogy: 'VPN은 모두가 다니는 공용 도로 위를 달리는 "창문이 불투명한 전용 차량"과 같습니다. 밖에서는 차가 어디서 어디로 가는지만 보일 뿐 안에 누가 무엇을 싣고 있는지는 보이지 않고, 회사 정문(VPN 장비)에 도착해야 비로소 문이 열려 짐이 안으로 들어갑니다.',
  keys: [
    '회사 안 시스템은 사설 주소라 인터넷에서 바로 닿지 않고, 인터넷에 그대로 열어 두면 누구나 공격을 시도할 수 있다.',
    'VPN은 인증(아이디·비밀번호 + 2단계 인증)을 거친 뒤 내 기기와 회사 VPN 장비 사이에 암호화된 터널을 만들고, 내 기기에 사내망 주소를 하나 더 준다.',
    '원래 패킷을 통째로 암호화해 다른 패킷 안에 넣는다(캡슐화). 중간에서는 "집 → 회사 VPN 장비"라는 겉봉투만 보이고 내용은 보이지 않는다.',
    '사람이 회사에 붙는 원격 접속 VPN과 본사·지사를 장비끼리 늘 잇는 사이트 간 VPN이 있고, 기술로는 IPsec, SSL/TLS VPN, WireGuard가 대표적이다.',
    'VPN 장비는 인터넷에 노출된 공격 대상이라 패치·2단계 인증·최소 권한이 중요하며, 요즘은 앱마다 매번 확인하는 제로 트러스트(ZTNA)로 옮겨 가는 추세다.',
  ],
  terms: [
    ['VPN', 'Virtual Private Network. 공용 인터넷 위에 암호화된 가상의 전용 통로를 만드는 기술'],
    ['터널', '두 지점 사이에서 패킷을 다른 패킷 안에 넣어(캡슐화) 실어 나르는 통로'],
    ['캡슐화', '원래 패킷을 통째로 새 패킷의 내용물로 넣는 것. VPN은 넣기 전에 암호화한다'],
    ['VPN 장비(게이트웨이)', '회사 입구에서 터널을 받아 주고, 포장을 풀어 사내망으로 넘겨 주는 장비'],
    ['2단계 인증', '비밀번호에 더해 휴대폰 승인·인증 코드 같은 두 번째 증거로 본인을 확인하는 것'],
    ['사이트 간 VPN', '본사와 지사처럼 네트워크와 네트워크를 장비끼리 상시 연결하는 VPN'],
    ['제로 트러스트(ZTNA)', '망 안에 있다고 믿지 않고, 앱에 접근할 때마다 사람·기기·권한을 확인하는 방식'],
  ],
  quiz: [
    { q: '카페 와이파이에서 회사 VPN을 켜고 인사 시스템에 접속했어요. 같은 와이파이에서 엿보는 사람에게는 무엇이 보일까요?', c: ['인사 시스템에 입력한 내용 전부', '"이 기기가 회사 VPN 장비와 통신 중"이라는 것과 알아볼 수 없는 암호문', '아무것도 — 통신했다는 사실까지 완전히 숨겨진다', '사내 주소 192.168.10.20과 요청 내용'], a: 1, why: '원래 패킷은 통째로 암호화되어 겉봉투(집 → 회사 VPN 장비) 안에 들어갑니다. 겉봉투의 주소와 패킷 크기·시점은 보이지만, 사내 주소와 내용은 보이지 않아요.', step: 2 },
    { q: '본사와 지사의 네트워크를 양쪽 VPN 장비끼리 늘 이어 두어, 지사 직원이 아무것도 켜지 않아도 본사 시스템을 쓰게 하는 방식은?', c: ['원격 접속 VPN', '개인용 VPN 서비스', '포트포워딩', '사이트 간 VPN'], a: 3, why: '사이트 간 VPN은 사람 대신 양쪽 입구 장비끼리 터널을 상시 맺고, 두 네트워크 사이를 라우팅합니다. 사람이 앱을 켜고 붙는 것은 원격 접속 VPN이에요.', step: 3 },
    { q: '원격 접속 VPN에서 사내 대역으로 가는 트래픽만 터널로 보내고, 나머지 인터넷은 집 회선으로 바로 나가게 하는 설정은?', c: ['스플릿 터널링', '풀 터널', '사이트 간 VPN', '포트포워딩'], a: 0, why: '스플릿 터널링은 회사 VPN 장비의 부담과 지연을 줄이지만, 인터넷으로 가는 트래픽은 회사 보안 장비를 거치지 않는다는 점을 감안해야 합니다. 모든 트래픽을 터널로 보내는 것은 풀 터널입니다.', step: 1 },
  ],
  setup(a) {
    a.zone('zh', 16, 40, 172, 300, { label: '집 · 카페', color: 'blue' });
    a.zone('zi', 200, 40, 244, 300, { label: '인터넷 (모두가 쓰는 길)', color: 'gray' });
    a.zone('zc', 456, 40, 248, 300, { label: '회사 사내망 192.168.10.x', color: 'violet' });
    a.node('pc', 102, TY, { label: '내 노트북', icon: '💻', sub: '집 192.168.0.5', color: 'blue', w: 144, h: 70 });
    a.node('gw', 520, TY, { label: 'VPN 장비', icon: '🛡️', sub: GW_PUB, color: 'teal', w: 100, h: 70, hidden: true });
    a.node('hr', 642, 110, { label: '인사 시스템', sub: '192.168.10.20', color: 'violet', w: 112, h: 50, size: 14 });
    a.node('fs', 642, 270, { label: '파일 서버', sub: '192.168.10.30', color: 'violet', w: 112, h: 50, size: 14 });
    a.edge('gw', 'hr', { id: 'e-hr', arrow: false, hidden: true });
    a.edge('gw', 'fs', { id: 'e-fs', arrow: false, hidden: true });
    a.node('bad', 322, 100, { label: '낯선 사람', icon: '🕵️', color: 'red', w: 112, h: 58, size: 14, hidden: true });
    a.edge('bad', 'hr', { id: 'e-bad', arrow: false, dashed: true, color: 'red', hidden: true });
    a.node('spy', 322, 100, { label: '엿보는 사람', icon: '👀', color: 'red', w: 124, h: 58, size: 14, hidden: true });
  },
  steps: [
    {
      t: '집에서 회사 시스템에 들어가려면?',
      easy: '재택근무 중에 회사 인사 시스템(사내 주소 192.168.10.20)에 들어가야 해요. 그런데 이 주소는 회사 안에서만 통하는 사설 주소라(공유기·NAT 주제 참고) 인터넷에서는 찾아갈 길이 없습니다. 그렇다고 인사 시스템을 인터넷에 그대로 열어 두면, 전 세계 누구나 문을 두드리며 비밀번호를 맞혀 보려 할 거예요.',
      deep: '사설 대역(RFC 1918)은 인터넷에서 라우팅되지 않으므로 외부에서 내부 서버로 직접 갈 길이 없습니다. 내부 관리 화면·원격 데스크톱(RDP 3389)·DB 포트를 인터넷에 노출하면 인터넷 전체를 훑는 자동 스캐너에 금세 발견되어 무차별 대입과 취약점 공격을 받는 것이 흔합니다. 그래서 내부 시스템은 닫아 두고, 인증된 사람만 들어올 통로를 따로 만듭니다.',
      async run(a) {
        a.caption('사내 주소로 그냥 보내 보면…');
        const p = a.packet('→ 192.168.10.20', { at: 'pc', color: 'blue' });
        await a.move(p, [322, TY], 900);
        p.set('✕ 길 없음', 'red');
        a.note('n0a', 322, 262, '사설 주소는\n인터넷에서 길이 없어요', { color: 'red' });
        await a.wait(800);
        await a.fadeOut(p, 300);
        a.remove('n0a');
        a.caption('그렇다고 인터넷에 그대로 열면?');
        await a.par(a.show('bad'), a.show('e-bad'));
        await a.par(...[0, 1, 2].map((i) => a.wait(i * 300).then(() => a.send('bad', 'hr', '비번 대입', { color: 'red', dur: 700 }))));
        a.hl('hr', true, 'red');
        a.badge('hr', '공격 중!', 'red');
        await a.flash('hr');
        a.note('n0', 360, 386, '안쪽 시스템을 인터넷에 그대로 열면 누구나 문을 두드려요', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: 'VPN 연결 — 확인하고, 터널을 만들고, 주소를 받는다',
      easy: '노트북의 VPN 앱을 켜면 먼저 회사 입구의 VPN 장비에 아이디·비밀번호를 보내고, 휴대폰으로 한 번 더 승인합니다(2단계 인증). 확인이 끝나면 노트북과 VPN 장비 사이에 보이지 않는 터널이 생기고, 노트북은 사내망 주소(192.168.10.201)를 하나 더 받아요. 이제 노트북은 회사 안에 있는 것처럼 사내 주소로 통신합니다.',
      deep: '연결은 대개 ① 장비 확인(서버 인증서로 진짜 회사 장비인지 검증) ② 사용자 인증(SSO·SAML/OIDC나 RADIUS + MFA) ③ 키 교환(IPsec은 IKEv2, TLS VPN은 TLS 핸드셰이크) ④ 가상 인터페이스 생성과 주소·DNS·경로 배포 순서로 진행됩니다. 모든 트래픽을 터널로 보내는 풀 터널과, 사내 대역만 터널로 보내고 나머지는 바로 인터넷으로 나가는 스플릿 터널링 중 정책으로 고릅니다.',
      async run(a) {
        a.remove('n0');
        a.badge('hr', null);
        a.hl('hr', false);
        await a.par(a.hide('bad'), a.hide('e-bad'));
        await a.par(a.show('gw'), a.show('e-hr'), a.show('e-fs'));
        a.caption('① 아이디·비밀번호');
        await a.send('pc', 'gw', '아이디·비번', { color: 'blue', dur: 900 });
        a.caption('② 휴대폰으로 한 번 더 (2단계 인증)');
        await a.send('gw', 'pc', '2단계 확인?', { color: 'teal', dur: 800 });
        a.badge('pc', '📱 승인', 'amber');
        await a.wait(300);
        await a.send('pc', 'gw', '승인 ✓', { color: 'green', dur: 800 });
        a.badge('pc', null);
        a.hl('gw', true, 'green');
        a.caption('③ 보이지 않는 터널 만들기');
        await tube(a, 174, TY, 470, TY, 'teal', 700);
        a.text(322, TY + 34, '🔒 VPN 터널', { size: 12.5, weight: 800, color: 'teal', layer: 'edge' });
        a.hl('gw', false);
        a.caption('④ 사내 주소 하나 더 받기');
        await a.send('gw', 'pc', '주소 .10.201', { color: 'teal', dur: 800 });
        a.setNode('pc', { sub: 'VPN 192.168.10.201' });
        a.text(102, TY + 50, '(집 주소 192.168.0.5도 그대로)', { size: 11, cls: 'muted', id: 'homeip' });
        await a.flash('pc');
        a.note('n1', 360, 386, '이제 노트북은 회사 안에 있는 것처럼 사내 주소로 통신해요', { color: 'teal' });
        await a.wait(700);
      },
    },
    {
      t: '캡슐화 + 암호화 — 패킷 안의 패킷',
      easy: '노트북이 인사 시스템으로 보내는 원래 패킷(사내 주소끼리)을 통째로 자물쇠로 잠근 뒤, 겉에 "우리 집 → 회사 VPN 장비"라고 적힌 새 봉투에 넣어요. 카페 와이파이에서 누가 엿봐도 보이는 건 겉봉투와 알아볼 수 없는 암호문뿐입니다. VPN 장비가 겉봉투를 벗기고 자물쇠를 풀어 원래 패킷을 사내망으로 넘겨 줘요.',
      deep: `터널 모드 IPsec ESP나 WireGuard는 원래 IP 패킷 전체(안쪽 헤더 포함)를 AES-GCM·ChaCha20-Poly1305 같은 인증 암호로 감싸 엿보기와 위변조를 함께 막습니다. 바깥 헤더는 공인 주소(여기선 ${HOME_PUB} → ${GW_PUB})라 경로 위에서도 누가 VPN 장비와 통신한다는 사실과 패킷 크기·시점은 보입니다. 헤더가 늘어난 만큼(보통 수십 바이트) 실을 수 있는 크기가 줄어, 단편화를 피하려고 터널 MTU·TCP MSS를 낮춰 잡습니다.`,
      async run(a) {
        a.remove('n1');
        await a.show('spy');
        const Y = 404;
        a.caption('원래 패킷: 사내 주소끼리');
        const i1 = a.packet('.10.201 → .10.20', { at: [420, Y - 30], color: 'blue', w: 170, h: 30, round: 5, size: 12 });
        const i2 = a.packet('요청 내용', { at: [555, Y - 30], color: 'pink', w: 100, h: 30, round: 5, size: 12 });
        i1.g.style.opacity = 0;
        i2.g.style.opacity = 0;
        await a.par(a.move(i1, [420, Y], 400), a.fade(i1, 1, 400), a.move(i2, [555, Y], 400), a.fade(i2, 1, 400));
        a.text(470, Y - 26, '원래 패킷', { size: 11.5, weight: 700, color: 'blue', id: 'lab-in' });
        await a.wait(500);
        a.caption('통째로 암호화 🔒');
        const lock = a.packet('🔒 ▒▒▒▒ 암호문 ▒▒▒▒', { at: [470, Y], color: 'violet', w: 270, h: 30, round: 5, size: 12 });
        lock.g.style.opacity = 0;
        await a.par(a.fadeOut(i1, 350), a.fadeOut(i2, 350), a.fade(lock, 1, 350));
        a.setText('lab-in', '안쪽: 원래 패킷 (잠김)');
        a.get('lab-in').setAttribute('class', 'tx tc-violet');
        a.caption('겉봉투: 집 공인 주소 → 회사 VPN 장비');
        const outer = a.packet(`${HOME_PUB} → ${GW_PUB}`, { at: [60, Y], color: 'amber', w: 220, h: 30, round: 5, size: 12 });
        outer.g.style.opacity = 0;
        await a.par(a.move(outer, [225, Y], 450), a.fade(outer, 1, 300));
        a.text(225, Y - 26, '겉봉투 (밖에서 보임)', { size: 11.5, weight: 700, color: 'amber' });
        await a.wait(400);
        a.caption('터널을 지나는 동안 — 엿봐도 암호문뿐');
        const p = a.packet('🔒 암호문', { at: [174, TY], color: 'violet', w: 84 });
        await a.move(p, [322, TY], 600);
        a.hl('spy', true, 'red');
        a.note('n2', 322, 156, '보이는 건 암호문뿐 🔒', { color: 'violet' });
        await a.flash('spy');
        await a.move(p, [428, TY], 500);
        await a.fadeOut(p, 150);
        a.hl('spy', false);
        a.caption('VPN 장비가 겉봉투를 벗기고 풀어서 전달');
        a.hl('gw');
        await a.flash('gw');
        await a.send('gw', 'hr', '요청', { color: 'blue', dur: 700 });
        a.hl('gw', false);
        a.badge('hr', '받음 ✓', 'green');
        await a.wait(600);
      },
    },
    {
      t: '두 가지 쓰임 — 원격 접속 VPN과 사이트 간 VPN',
      easy: '재택·출장 직원처럼 사람이 앱을 켜고 회사로 들어오는 것이 원격 접속 VPN이에요. 한편 본사와 지사는 양쪽 입구의 VPN 장비끼리 터널을 늘 이어 두는데, 이게 사이트 간 VPN입니다. 지사 직원은 아무것도 켜지 않아도 본사 시스템을 바로 쓸 수 있어요.',
      deep: '원격 접속(client-to-site)은 전용 클라이언트나 운영체제 내장 클라이언트로 사용자마다 터널을 만들고, 사이트 간(site-to-site)은 보통 IPsec으로 라우터·방화벽끼리 상시 터널을 맺어 양쪽 대역을 라우팅합니다. 지점이 많으면 전용 회선 대신 인터넷 회선 + IPsec을 중앙에서 묶어 관리하는 SD-WAN으로 운영하는 경우가 많습니다. 양쪽 사설 대역이 겹치면 NAT 같은 추가 설정이 필요하므로 처음부터 지점별 대역을 나눠 계획합니다.',
      async run(a) {
        wipe(a);
        a.zone('hq', 456, 20, 248, 400, { label: '본사', color: 'violet' });
        a.node('hqgw', 520, 210, { label: 'VPN 장비', icon: '🛡️', color: 'teal', w: 96, h: 64, size: 14 });
        a.node('sys', 644, 210, { label: '사내 시스템', color: 'violet', w: 104, h: 50, size: 14 });
        a.edge('hqgw', 'sys', { arrow: false });
        a.node('home', 96, 70, { label: '재택 직원', icon: '🏠', color: 'blue', w: 132, h: 54, size: 14, shape: 'person' });
        a.node('trip', 96, 160, { label: '출장 직원', icon: '🧳', color: 'blue', w: 132, h: 54, size: 14, shape: 'person' });
        a.zone('br', 16, 240, 300, 180, { label: '지사 — 직원은 아무것도 안 켬', color: 'green' });
        a.node('brgw', 236, 330, { label: '지사 VPN', icon: '🛡️', color: 'teal', w: 100, h: 64, size: 14 });
        a.node('bp1', 86, 293, { label: '지사 PC', color: 'green', w: 100, h: 40, size: 13 });
        a.node('bp2', 86, 372, { label: '지사 PC', color: 'green', w: 100, h: 40, size: 13 });
        a.edge('bp1', 'brgw', { arrow: false });
        a.edge('bp2', 'brgw', { arrow: false });
        const T1 = [162, 70, 472, 194], T2 = [162, 160, 472, 210], T3 = [286, 330, 472, 228];
        a.caption('원격 접속 VPN: 사람이 앱을 켜고 회사로');
        a.badge('home', 'VPN 켬', 'teal');
        await tube(a, ...T1, 'teal', 500, 16);
        a.badge('trip', 'VPN 켬', 'teal');
        await tube(a, ...T2, 'teal', 500, 16);
        a.text(330, 46, '원격 접속 VPN', { size: 13, weight: 800, color: 'teal' });
        a.text(330, 63, '사람마다 앱으로 연결', { size: 11, cls: 'muted' });
        const p = a.packet('🔒', { at: T1.slice(0, 2), color: 'violet', w: 34 });
        await a.move(p, lerp(...T1, 0.97), 800);
        await a.fadeOut(p, 150);
        await a.send('hqgw', 'sys', '요청', { color: 'blue', dur: 500 });
        a.caption('사이트 간 VPN: 본사 ↔ 지사, 장비끼리 늘 연결');
        await tube(a, ...T3, 'green', 600, 16);
        a.badge('brgw', '상시 연결', 'green');
        a.text(390, 300, '사이트 간 VPN', { size: 13, weight: 800, color: 'green' });
        a.text(390, 317, '장비끼리 늘 연결', { size: 11, cls: 'muted' });
        await a.send('bp1', 'brgw', '요청', { color: 'green', dur: 600 });
        const q = a.packet('🔒', { at: T3.slice(0, 2), color: 'violet', w: 34 });
        await a.move(q, lerp(...T3, 0.95), 700);
        await a.fadeOut(q, 150);
        await a.send('hqgw', 'sys', '요청', { color: 'green', dur: 500 });
        await a.wait(700);
      },
    },
    {
      t: '기술 이름 — IPsec, SSL/TLS VPN, WireGuard',
      easy: 'VPN을 만드는 방법에도 몇 가지가 있어요. 오래되고 널리 쓰이는 표준인 IPsec, 웹사이트 자물쇠(HTTPS)와 같은 기술을 쓰는 SSL/TLS VPN, 그리고 최근에 나와 단순하고 빠른 WireGuard가 대표적입니다. 모두 "암호화해서 다른 패킷 안에 넣는다"는 원리는 같고, 포장 방법과 잘 맞는 쓰임새가 달라요.',
      deep: 'IPsec은 IKEv2(UDP 500, NAT 뒤에서는 UDP 4500)로 키를 맞추고 ESP(IP 프로토콜 50)로 암호화하며, 장비 간 호환성이 좋아 사이트 간 VPN의 사실상 표준입니다. SSL/TLS VPN은 이름에 SSL이 남아 있지만 실제로는 TLS를 쓰고, TCP 443으로 붙어 방화벽·프록시를 잘 통과하며 성능을 위해 DTLS(UDP)를 함께 쓰기도 합니다. WireGuard는 수천 줄 규모의 작은 코드에 Curve25519·ChaCha20-Poly1305 등 고정된 최신 암호만 쓰는 UDP 기반 방식으로, 2020년 리눅스 커널 5.6에 들어갔습니다.',
      async run(a) {
        wipe(a);
        for (let i = 0; i < CARDS.length; i++) {
          const c = CARDS[i];
          a.caption(c.title);
          const g = a.raw('g', { style: 'opacity: 0' }, 'zone');
          a.raw('rect', { x: c.x - 108, y: 24, width: 216, height: 290, rx: 14, style: `fill: color-mix(in srgb, var(--${c.color}) 7%, transparent); stroke: color-mix(in srgb, var(--${c.color}) 55%, transparent); stroke-width: 1.5` }, g);
          a.text(c.x, 56, c.title, { par: g, size: 19, weight: 800, color: c.color });
          a.text(c.x, 82, c.sub, { par: g, size: 11.5, cls: 'muted' });
          a.text(c.x, 116, '포장 모양', { par: g, size: 11, cls: 'muted' });
          c.lines.forEach((l, k) => a.text(c.x - 92, 196 + k * 30, '• ' + l, { par: g, size: 12.5, anchor: 'start', weight: 600 }));
          await a.tween(300, (k) => (g.style.opacity = k));
          const total = c.stack.reduce((s, x) => s + x[1], 0);
          let x = c.x - total / 2;
          const drops = c.stack.map(([l, w, col], k) => {
            const px = x + w / 2;
            x += w;
            const pk = a.packet(l, { at: [px, 120], color: col, w, h: 30, round: 5, size: 11.5 });
            pk.g.style.opacity = 0;
            return a.wait(k * 120).then(() => a.par(a.move(pk, [px, 148], 350), a.fade(pk, 1, 300)));
          });
          await a.par(...drops);
          await a.wait(350);
        }
        a.caption('원리는 같고, 포장 방식이 달라요');
        a.note('n4', 360, 372, '셋 다 원리는 같아요: 암호화 + 다른 패킷 안에 넣기\n다른 건 포장 방식과 잘 맞는 쓰임새', { color: 'violet' });
        await a.wait(800);
      },
    },
    {
      t: '한계와 위험 — VPN도 만능은 아니다',
      easy: 'VPN 장비는 인터넷에 열려 있는 회사 정문이라 공격자가 가장 먼저 노려요. 프로그램의 허점을 제때 고치지(패치) 않거나 훔친 비밀번호만으로 들어올 수 있으면, 한번 들어온 공격자에게 사내망 전체가 보이기도 해서 2단계 인증과 "필요한 시스템만 열어 주기(최소 권한)"가 중요합니다. 개인용 VPN 서비스도 "카페 ~ VPN 회사" 구간만 감춰 줄 뿐, VPN 회사와 접속한 사이트는 여전히 볼 수 있어요.',
      deep: '최근 몇 년간 여러 제조사의 VPN 장비에서 인증 없이 침입할 수 있는 취약점이 잇따라 발견되어 실제 랜섬웨어·국가 배후 공격에 쓰였고, 보안 당국도 긴급 패치를 거듭 권고해 왔습니다. VPN 사용자 대역을 내부 전체에 열지 말고 방화벽 정책으로 필요한 서버·포트만 허용하며, 관리 화면은 인터넷에 노출하지 않고 접속 기록을 모니터링합니다. 개인 VPN을 켜면 웹사이트가 보는 출발지 IP는 VPN 서버 주소가 되지만, 로그인·쿠키·브라우저 지문으로는 여전히 식별되고 VPN 사업자는 접속 기록을 볼 수 있는 위치에 있습니다.',
      async run(a) {
        wipe(a);
        a.text(24, 22, '① VPN 장비가 뚫리면', { size: 13, weight: 800, anchor: 'start', color: 'red' });
        a.node('atk', 80, 120, { label: '공격자', icon: '🕵️', color: 'red', w: 100, h: 58, size: 14 });
        a.node('vgw', 300, 120, { label: 'VPN 장비', icon: '🛡️', sub: '패치 안 함', color: 'amber', w: 120, h: 72, size: 14 });
        const S = [['s1', '인사 시스템', 56], ['s2', '파일 서버', 120], ['s3', '회계 시스템', 184]];
        for (const [id, label, y] of S) {
          a.node(id, 600, y, { label, color: 'violet', w: 116, h: 40, size: 13 });
          a.edge('vgw', id, { id: 'e' + id, arrow: false });
        }
        a.edge('atk', 'vgw', { arrow: false, dashed: true, color: 'red' });
        a.raw('path', { d: 'M16 228 L704 228', class: 'edge dashed' }, 'edge');
        a.text(24, 248, '② 개인용 VPN 서비스가 감춰 주는 구간', { size: 13, weight: 800, anchor: 'start', color: 'teal' });
        a.node('me', 80, 330, { label: '나 (카페)', icon: '☕', color: 'blue', w: 108, h: 58, size: 14 });
        a.node('vs', 340, 330, { label: 'VPN 회사', icon: '🏢', sub: '', color: 'amber', w: 120, h: 72, size: 14 });
        a.node('site', 620, 330, { label: '웹사이트', icon: '🌍', color: 'green', w: 112, h: 58, size: 14 });
        a.edge('vs', 'site', { arrow: false, id: 'e-vs', label: '여기부터는 보통 인터넷', hidden: true });

        a.caption('허점 + 훔친 비밀번호로 침입');
        const p = a.packet('훔친 비번', { at: 'atk', color: 'red' });
        await a.move(p, [205, 120], 700);
        a.hl('vgw', true, 'red');
        await a.fadeOut(p, 150);
        a.caption('한번 들어오면 사내망 전체가 보여요');
        await a.par(...S.map(([id], i) => a.wait(i * 120).then(() => a.send('vgw', id, '접근', { color: 'red', dur: 600 })).then(() => a.hl(id, true, 'red'))));
        await a.wait(400);
        a.caption('대책: 패치 · 2단계 인증 · 최소 권한');
        S.forEach(([id]) => a.hl(id, false));
        a.hl('vgw', false);
        a.setNode('vgw', { sub: '패치 ✓ 2단계 ✓', color: 'teal' });
        const q = a.packet('훔친 비번', { at: 'atk', color: 'red' });
        await a.move(q, [205, 120], 600);
        q.set('✕ 2단계 실패');
        await a.wait(250);
        await a.fadeOut(q, 250);
        await a.par(a.fade('es2', 0.15, 300), a.fade('es3', 0.15, 300), a.fade('s2', 0.4, 300), a.fade('s3', 0.4, 300));
        a.badge('s1', '필요한 것만', 'teal');
        a.caption('개인용 VPN: 카페 ~ VPN 회사 구간만 감춰요');
        await tube(a, 134, 330, 280, 330, 'teal', 500, 20);
        a.text(207, 368, '🔒 카페·통신사엔 안 보임', { size: 11.5, weight: 700, color: 'teal' });
        const r = a.packet('🔒', { at: [134, 330], color: 'violet', w: 34 });
        await a.move(r, [262, 330], 500);
        await a.fadeOut(r, 120);
        await a.show('e-vs', 250);
        await a.send('vs', 'site', '요청', { color: 'blue', dur: 600 });
        a.setNode('vs', { sub: '👀 다 볼 수 있음' });
        a.text(620, 376, '로그인하면 누군지 앎', { size: 11.5, cls: 'muted' });
        await a.wait(800);
      },
    },
    {
      t: '요즘 흐름 — 제로 트러스트(ZTNA)와 정리',
      easy: '기존 VPN은 "성문을 통과하면 성 안은 자유"에 가까웠어요. 제로 트러스트는 망 안에 있다는 것만으로 믿지 않고, 앱에 들어갈 때마다 "누구인지, 기기는 안전한지, 이 앱을 쓸 권한이 있는지"를 확인한 뒤 그 앱 하나만 연결해 줍니다. 회사 건물에 들어온 뒤에도 방마다 출입증을 찍는 것과 같아요.',
      deep: 'ZTNA(Zero Trust Network Access)는 NIST SP 800-207의 제로 트러스트 원칙을 원격 접속에 적용한 것으로, 사용자·기기 상태(업데이트·보안 소프트웨어)·위치 등을 근거로 앱 단위 접근을 매번 판단하고 내부 망 전체를 노출하지 않습니다. 앱 쪽 커넥터가 안에서 바깥의 중개 서비스로 연결을 맺는 구조가 많아 인터넷에 열어 둘 포트도 줄어듭니다. 다만 오래된 시스템 때문에 VPN과 함께 쓰며 단계적으로 옮겨 가는 경우가 많습니다.',
      async run(a) {
        wipe(a);
        a.node('u', 90, 170, { label: '직원 노트북', icon: '💻', color: 'blue', w: 120, h: 64, size: 14 });
        a.node('zt', 330, 170, { label: '확인 관문', icon: '🪪', sub: '앱마다 · 매번', color: 'teal', w: 128, h: 76 });
        const APPS = [['ap1', '인사 시스템', 70], ['ap2', '메일', 170], ['ap3', '회계 시스템', 270]];
        for (const [id, label, y] of APPS) {
          a.node(id, 612, y, { label, color: 'violet', w: 120, h: 46, size: 14 });
          a.edge('zt', id, { id: 'e-' + id, arrow: false, dashed: true });
        }
        a.edge('u', 'zt', { arrow: false });
        CHECKS.forEach((s, i) => a.text(330, 232 + i * 21, s, { id: 'ck' + i, size: 12, cls: 'muted' }));
        const runChecks = async (res) => {
          for (let i = 0; i < CHECKS.length; i++) {
            const t = a.get('ck' + i);
            t.textContent = CHECKS[i] + ' …';
            t.setAttribute('class', 'tx muted');
          }
          for (let i = 0; i < CHECKS.length; i++) {
            await a.wait(260);
            const t = a.get('ck' + i);
            t.textContent = CHECKS[i] + (res[i] ? ' ✓' : ' ✕');
            t.setAttribute('class', 'tx ' + (res[i] ? 'tc-green' : 'tc-red'));
            t.setAttribute('font-weight', 700);
          }
        };
        a.caption('인사 시스템에 들어가려면 — 그때마다 확인');
        const p = a.packet('인사 시스템?', { at: 'u', color: 'blue' });
        await a.move(p, [218, 170], 600);
        await a.fadeOut(p, 120);
        a.hl('zt');
        await runChecks([true, true, true]);
        const e1 = a.get('e-ap1').path;
        e1.classList.remove('dashed');
        e1.classList.add('ec-green');
        await a.send('zt', 'ap1', '연결', { color: 'green', dur: 600 });
        a.badge('ap1', '이 앱만 ✓', 'green');
        a.hl('zt', false);
        a.caption('회계 시스템은? 권한이 없으면 거절');
        const q = a.packet('회계 시스템?', { at: 'u', color: 'blue' });
        await a.move(q, [218, 170], 600);
        a.hl('zt');
        await runChecks([true, true, false]);
        q.set('✕ 거절', 'red');
        await a.wait(300);
        await a.fadeOut(q, 250);
        a.hl('zt', false);
        a.note('n6', 360, 380, 'VPN = 공용 인터넷 위에 만든 암호화 터널 (캡슐화 + 암호화)\n원격 접속 · 사이트 간 / 장비 패치 · 2단계 인증 · 최소 권한\n요즘은 제로 트러스트: 망이 아니라 앱 단위로, 매번 확인', { color: 'teal' });
        await a.wait(900);
      },
    },
  ],
};

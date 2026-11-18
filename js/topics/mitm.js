// 중간자 공격(MITM): 가짜 와이파이 → 엿보기·바꿔치기 → 길 속이기(ARP)·가짜 DNS → HTTPS가 막는 이유
// → 위험한 순간(경고 무시, http:// 첫 접속 = SSL 스트리핑)과 HSTS → VPN의 범위와 운영 쪽 방어 → 체크리스트
// 도메인은 예약된 .example, IP는 문서용 대역(203.0.113.0/24)만 쓴다. 공격 도구·절차는 다루지 않는다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
const title = (a, s) => a.text(360, 26, s, { size: 15, weight: 800 });
/** 색이 살짝 들어간 판(카드) */
function box(a, x, y, w, h, color) {
  return a.raw('rect', { x, y, width: w, height: h, rx: 12, style: `fill: color-mix(in srgb, var(--${color}) 8%, var(--panel2)); stroke: color-mix(in srgb, var(--${color}) 55%, transparent); stroke-width: 1.5` }, 'zone');
}
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 26, w: o.w, size: o.size || 12, hidden: o.hidden, id: o.id });
}
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
/** 노드 테두리 위의 점(상대 노드 쪽) */
function rim(n, tx, ty) {
  const dx = tx - n.x, dy = ty - n.y;
  const s = Math.min((n.w / 2 + 4) / Math.abs(dx || 1e-9), (n.h / 2 + 4) / Math.abs(dy || 1e-9));
  return [n.x + dx * s, n.y + dy * s];
}
/** 노드 테두리에서 테두리로 칩을 보낸다(가운데 글자를 가리지 않게) */
async function hop(a, from, to, label, color, o = {}) {
  const A = a.get(from), B = a.get(to);
  const p = chip(a, label, ...rim(A, B.x, B.y), color, { w: o.w });
  await a.move(p, rim(B, A.x, A.y), o.dur || 800);
  if (o.keep) return p;
  await a.fadeOut(p, 180);
  return p;
}
/** 체크리스트 한 칸: ✓ + 글 (처음엔 숨김) */
function item(a, x, y, s) {
  const c = a.text(x, y, '✓', { size: 14, weight: 800, color: 'green', anchor: 'start', hidden: true });
  const t = a.text(x + 20, y, s, { size: 12.5, weight: 600, anchor: 'start', hidden: true });
  return [c, t];
}

export default {
  id: 'mitm',
  level: 2,
  cat: '보안',
  title: '중간자 공격 — 대화 사이에 끼어든 사람',
  sub: '나와 서버 사이에 몰래 끼어들어 내용을 엿보거나 바꾸는 공격과, HTTPS·HSTS가 이를 막는 방법',
  analogy: '편지를 우체부에게 맡겼는데, 그 우체부가 사실은 가짜라고 생각해 보세요. 봉투를 열어 읽고, "이 계좌로 보내 주세요"의 숫자를 고친 다음 다시 붙여 배달할 수 있습니다. HTTPS는 아무나 열 수 없는 금고에 편지를 넣고, 받는 사람의 신분증까지 확인하는 방법이라 가짜 우체부가 손댈 수 없게 만듭니다.',
  keys: [
    '중간자 공격(MITM)은 공격자가 나와 서버 사이의 길목에 끼어들어, 오가는 내용을 엿보거나(도청) 몰래 바꾸는(변조) 공격이다.',
    '길목을 차지하는 방법은 여러 가지다: 같은 이름의 가짜 와이파이, 같은 망 안에서 길 속이기(ARP 스푸핑), 가짜 DNS 응답 등.',
    'HTTPS는 내용을 암호화하고, 인증서로 "정말 bank.example인지" 확인한다. 그래서 끼어들어도 내용을 못 읽고, 사칭하면 브라우저가 경고한다.',
    '위험한 순간은 인증서 경고를 무시하고 "계속"을 누를 때와 첫 접속이 http://로 시작할 때다. HSTS가 브라우저를 처음부터 https로만 접속하게 해 이를 막는다.',
    'VPN은 와이파이 구간을 보호할 뿐 만능이 아니다. 허락받지 않은 네트워크에서 이런 공격을 시험하는 것은 불법이다.',
  ],
  terms: [
    ['중간자 공격(MITM)', 'Man-in-the-Middle. 두 당사자 사이에 몰래 끼어들어 통신을 엿보거나 바꾸는 공격'],
    ['악성 AP(이블 트윈)', '진짜 와이파이와 같은 이름(SSID)으로 켜 둔 공격자의 무선 공유기'],
    ['ARP 스푸핑', '같은 네트워크 안에서 "공유기 주소는 나"라고 거짓 응답해 다른 기기의 통신을 자기 쪽으로 돌리는 수법'],
    ['DNS 스푸핑', '도메인 이름을 물었을 때 가짜 IP 주소를 먼저 답해 엉뚱한 서버로 접속하게 만드는 수법'],
    ['인증서', '"이 공개키는 bank.example의 것"이라고 믿을 수 있는 인증기관(CA)이 서명한 전자 신분증'],
    ['SSL 스트리핑', '사용자 쪽 연결을 https가 아닌 http로 붙잡아 두고, 서버와는 공격자가 대신 https로 통신하는 수법'],
    ['HSTS', 'HTTP Strict Transport Security. "이 사이트는 앞으로 https로만 접속하라"고 브라우저에 기억시키는 응답 헤더'],
    ['VPN', '내 기기와 VPN 서버 사이를 암호화된 터널로 묶는 기술. 터널 밖 구간은 보호하지 않는다'],
  ],
  quiz: [
    { q: '카페에서 같은 이름의 와이파이가 두 개 보일 때 조심해야 하는 이유는?', c: ['와이파이가 두 개면 속도가 절반으로 느려져서', '휴대폰 배터리가 빨리 닳아서', '하나는 공격자가 켠 가짜일 수 있고, 거기 붙으면 모든 통신이 공격자를 거치기 때문에', '같은 이름이면 비밀번호가 자동으로 공개되기 때문에'], a: 2, why: '와이파이 이름(SSID)은 누구나 똑같이 정할 수 있습니다. 휴대폰은 이름만 보고 신호가 센 쪽에 붙을 수 있어서, 가짜 공유기에 접속하면 모든 통신이 공격자를 지나갑니다.', step: 0 },
    { q: '공격자가 길목에 끼어 있어도 HTTPS 사이트의 내용을 읽거나 사칭하기 어려운 이유는?', c: ['내용은 암호화되고, 인증서로 진짜 서버인지 확인하기 때문에', 'HTTPS는 와이파이를 거치지 않고 따로 전송되기 때문에', '공격자의 컴퓨터는 HTTPS 패킷을 받을 수 없기 때문에', 'HTTPS 사이트는 IP 주소가 숨겨져 있기 때문에'], a: 0, why: '패킷 자체는 공격자를 지나가지만 세션 키 없이는 읽을 수 없습니다. 은행인 척하려면 bank.example 인증서의 개인키가 필요한데, 공격자는 그 키가 없어 브라우저가 경고를 띄웁니다.', step: 3 },
    { q: 'HSTS(Strict-Transport-Security) 헤더가 막아 주는 것으로 가장 알맞은 것은?', c: ['공용 와이파이에서 기기끼리 서로 보이는 것', '서버의 개인키가 유출되는 것', '피싱 메일 속 가짜 링크를 누르는 것', 'http://로 시작한 접속을 공격자가 붙잡아 두는 것(SSL 스트리핑)과, 인증서 경고를 무시하고 넘어가는 것'], a: 3, why: 'HSTS를 기억한 브라우저는 처음부터 https로만 접속하고, 인증서 오류가 나면 "계속" 버튼 없이 차단합니다. 첫 방문까지 지키려면 preload 목록에 등록합니다. 피싱 도메인이나 키 유출은 다른 대책이 필요합니다.', step: 4 },
  ],
  setup(a) {
    title(a, '카페 와이파이 — 이름이 똑같은 공유기 두 대');
  },
  steps: [
    {
      t: '카페 와이파이 — 같은 이름의 가짜 공유기',
      easy: '카페에 "Cafe_Free"라는 와이파이가 두 개 보입니다. 하나는 진짜, 하나는 옆자리 공격자가 노트북으로 켠 가짜예요. 휴대폰은 이름만 보고 신호가 센 쪽에 붙기 때문에, 가짜에 붙으면 내 통신이 모두 공격자를 거쳐 갑니다.',
      deep: '와이파이 이름(SSID)은 누구나 같은 값으로 정할 수 있고, 휴대폰은 저장된 SSID를 보면 자동으로 다시 접속합니다. 비밀번호 없는 열린 네트워크는 AP가 진짜인지 확인할 방법이 없고, 비밀번호가 벽에 붙은 WPA2/WPA3-Personal도 비밀번호를 아는 사람이면 같은 이름의 AP를 만들 수 있습니다. 이런 가짜 AP를 이블 트윈(evil twin)이라 부릅니다.',
      async run(a) {
        wipe(a);
        title(a, '카페 와이파이 — 이름이 똑같은 공유기 두 대');
        a.node('me', 100, 200, { label: '내 휴대폰', icon: '📱', color: 'blue', w: 116, h: 66 });
        a.node('ap', 360, 100, { label: '카페 공유기', sub: 'Cafe_Free', icon: '📶', color: 'green', w: 140, h: 70 });
        a.node('evil', 360, 300, { label: '가짜 공유기', sub: 'Cafe_Free', icon: '📶', color: 'red', w: 140, h: 70, hidden: true });
        a.node('net', 620, 200, { label: '인터넷', icon: '🌐', color: 'gray', w: 112, h: 60 });
        a.edge('ap', 'net');
        a.edge('evil', 'net', { id: 'e-en', dashed: true, color: 'red', hidden: true });
        a.edge('me', 'ap', { id: 'e-ma', dashed: true, arrow: false });
        a.edge('me', 'evil', { id: 'e-me', color: 'red', hidden: true, label: '자동 접속', lx: -26, ly: 14 });
        a.caption('공격자가 카페와 똑같은 이름의 공유기를 켭니다');
        await a.wait(300);
        await a.show('evil', 500);
        a.badge('evil', '신호 더 셈', 'red');
        a.note('n-list', 100, 330, '와이파이 목록\nCafe_Free  ▂▄▆\nCafe_Free  ▂▄▆█', { color: 'blue' });
        await a.wait(900);
        a.caption('휴대폰은 이름만 보고 신호가 센 쪽에 붙어요');
        await a.hide('e-ma', 300);
        await a.par(a.show('e-me', 400), a.show('e-en', 400));
        await hop(a, 'me', 'evil', '검색·로그인…', 'blue', { dur: 700 });
        a.hl('evil', true, 'red');
        await hop(a, 'evil', 'net', '검색·로그인…', 'blue', { dur: 700 });
        a.note('n-all', 600, 360, '이제 모든 통신이\n공격자를 거쳐 가요', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '끼어들면 — 엿보기와 바꿔치기',
      easy: '자물쇠 없는 http:// 사이트라면 공격자는 지나가는 비밀번호를 그대로 읽을 수 있어요. 더 나쁘게는 "111 계좌로 보내기"를 "999 계좌로 보내기"로 바꿔 은행에 넘기고, 내 화면에는 원래대로 보이게 할 수도 있습니다.',
      deep: '평문 HTTP는 기밀성도 무결성도 없습니다. 경로 위의 공격자는 요청·응답을 읽는 수동 공격(쿠키·비밀번호 탈취)과, 내용을 고쳐 전달하는 능동 공격(계좌·다운로드 링크 바꿔치기, 페이지에 스크립트 끼워 넣기)을 모두 할 수 있습니다. 양쪽 다 정상 응답을 받으므로 눈치채기 어렵습니다.',
      async run(a) {
        wipe(a);
        title(a, '중간에 끼면 — 엿보기와 바꿔치기');
        a.node('me', 90, 140, { label: '내 휴대폰', icon: '📱', color: 'blue', w: 116, h: 66 });
        a.node('evil', 360, 140, { label: '공격자', sub: '가짜 공유기', icon: '🕵️', color: 'red', w: 130, h: 70 });
        a.node('bank', 620, 140, { label: '은행 서버', sub: 'bank.example', icon: '🏦', color: 'green', w: 130, h: 70 });
        a.edge('me', 'evil', { label: 'http:// 평문', ly: -16 });
        a.edge('evil', 'bank', { label: 'http:// 평문', ly: -16 });
        a.caption('비밀번호가 그대로 지나갑니다');
        await hop(a, 'me', 'evil', 'pw=1234', 'blue', { dur: 700 });
        a.hl('evil', true, 'red');
        a.note('n-see', 200, 262, '엿보기\n비밀번호·쿠키를 그대로 읽음', { color: 'red' });
        await hop(a, 'evil', 'bank', 'pw=1234', 'blue', { dur: 700 });
        a.hl('evil', false);
        await a.wait(300);
        a.caption('송금 요청의 받는 계좌를 몰래 바꿉니다');
        const p = chip(a, '보낼 계좌 111', ...rim(a.get('me'), 360, 140), 'blue');
        await a.move(p, rim(a.get('evil'), 90, 140), 800);
        await a.flash('evil');
        p.set('보낼 계좌 999', 'red');
        await a.move(p, rim(a.get('evil'), 620, 140), 0);
        await a.move(p, rim(a.get('bank'), 360, 140), 800);
        await a.fadeOut(p, 180);
        a.badge('bank', '변조됨', 'red');
        a.note('n-chg', 520, 262, '바꿔치기\n받는 계좌를 몰래 바꿈', { color: 'red' });
        await a.wait(400);
        a.note('n-hide', 360, 370, '응답도 고쳐서 내 화면엔 "111로 보냄" — 양쪽 다 눈치 못 챔', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '다른 길목 — 길 속이기(ARP)와 가짜 DNS',
      easy: '가짜 와이파이만 있는 게 아니에요. 같은 와이파이 안에서 "내가 공유기야"라고 거짓말해 길을 가로채거나, "bank.example 주소가 어디야?"라는 질문에 가짜 주소를 먼저 답해 엉뚱한 곳으로 보내기도 합니다.',
      deep: 'ARP는 같은 LAN에서 IP를 MAC 주소로 바꾸는 프로토콜인데 인증이 없어, 위조한 ARP 응답으로 게이트웨이 행 트래픽을 가로챌 수 있습니다(스위치의 Dynamic ARP Inspection, 공용 Wi-Fi의 클라이언트 격리로 완화). DNS 스푸핑·캐시 포이즈닝은 가짜 IP를 돌려줍니다(DNSSEC 검증, 믿을 만한 리졸버와 DoH/DoT로 완화). 어느 쪽이든 마지막 방어선은 HTTPS의 인증서 확인입니다.',
      async run(a) {
        wipe(a);
        title(a, '다른 길목 — 같은 망에서 길 속이기 · 가짜 주소 알려 주기');
        a.zone('zl', 16, 52, 336, 348, { label: 'ARP 스푸핑 — "내가 공유기야"', color: 'red' });
        a.zone('zr', 368, 52, 336, 348, { label: '가짜 DNS 응답 — 주소록 속이기', color: 'violet' });
        // 왼쪽: ARP
        a.node('me', 82, 150, { label: '내 노트북', icon: '💻', color: 'blue', w: 104, h: 60 });
        a.node('gw', 286, 150, { label: '공유기', icon: '📶', color: 'green', w: 96, h: 60 });
        a.node('atk', 184, 280, { label: '공격자', icon: '🕵️', color: 'red', w: 104, h: 60 });
        a.edge('me', 'gw', { id: 'l-norm', dashed: true });
        a.edge('me', 'atk', { id: 'l-a1', color: 'red', hidden: true });
        a.edge('atk', 'gw', { id: 'l-a2', color: 'red', hidden: true });
        // 오른쪽: DNS
        a.node('me2', 434, 150, { label: '내 노트북', icon: '💻', color: 'blue', w: 104, h: 60 });
        a.node('dns', 640, 150, { label: 'DNS 서버', icon: '📖', color: 'green', w: 104, h: 60 });
        a.node('atk2', 536, 280, { label: '공격자', icon: '🕵️', color: 'red', w: 104, h: 60 });
        a.caption('같은 와이파이 안: "공유기는 나야"라는 거짓 답');
        await hop(a, 'atk', 'me', '공유기=나', 'red', { dur: 700 });
        a.badge('me', '속음', 'red');
        await a.par(a.hide('l-norm', 300), a.show('l-a1', 300), a.show('l-a2', 300));
        await hop(a, 'me', 'atk', '내 데이터', 'blue', { dur: 600 });
        await hop(a, 'atk', 'gw', '내 데이터', 'blue', { dur: 600 });
        a.note('n-l', 184, 362, '내 통신이 공격자를\n거쳐서 공유기로 감', { color: 'red' });
        a.caption('"bank.example 주소가 뭐야?" — 가짜 답이 먼저 도착');
        await hop(a, 'me2', 'dns', '주소?', 'blue', { dur: 600 });
        await hop(a, 'atk2', 'me2', '203.0.113.66', 'red', { dur: 600 });
        a.badge('me2', '가짜 주소', 'red');
        await hop(a, 'dns', 'me2', '진짜 답(늦음)', 'gray', { dur: 700 });
        a.note('n-r', 536, 362, '가짜 서버로 접속하게 만듦\n→ 마지막 방어선은 HTTPS', { color: 'violet' });
        await a.wait(800);
      },
    },
    {
      t: 'HTTPS가 막는 이유 — 암호화 + 인증서',
      easy: 'HTTPS면 길목에 공격자가 있어도 내용이 잠긴 금고처럼 보여서 읽을 수 없어요. 공격자가 "내가 은행이야"라며 가짜 신분증(인증서)을 내밀면, 브라우저가 믿을 수 있는 기관의 도장이 없다는 걸 알아채고 경고합니다.',
      deep: 'TLS는 세션 키로 암호화(AEAD)해 도청과 변조를 막고, 서버 인증서의 서명 사슬·도메인 이름(SAN)·유효 기간을 검증해 상대를 인증합니다. 공격자가 진짜 인증서를 그대로 내밀어도 그에 짝이 되는 개인키가 없으니 핸드셰이크의 CertificateVerify 서명을 만들 수 없고, 자기가 만든 인증서는 신뢰하는 CA의 서명이 없어 검증에 실패합니다.',
      async run(a) {
        wipe(a);
        title(a, 'HTTPS — 엿봐도 못 읽고, 사칭하면 경고');
        a.node('me', 90, 130, { label: '내 브라우저', icon: '💻', color: 'blue', w: 120, h: 66 });
        a.node('evil', 360, 130, { label: '공격자', sub: '길목', icon: '🕵️', color: 'red', w: 120, h: 66 });
        a.node('bank', 630, 130, { label: '은행 서버', sub: 'bank.example', icon: '🏦', color: 'green', w: 130, h: 70 });
        a.edge('me', 'evil', { label: 'HTTPS 🔒', ly: -16, color: 'green' });
        a.edge('evil', 'bank', { label: 'HTTPS 🔒', ly: -16, color: 'green' });
        a.caption('내용은 세션 키로 잠겨서 지나갑니다');
        const p = chip(a, 'pw=1234', ...rim(a.get('me'), 360, 130), 'blue');
        await a.wait(250);
        p.set('🔒 x8#Qf…', 'gray');
        await a.move(p, rim(a.get('evil'), 90, 130), 700);
        await a.move(p, rim(a.get('evil'), 630, 130), 0);
        a.note('n-eve', 360, 222, '공격자 화면: x8#Qf9zL@… 읽을 수 없음', { color: 'red' });
        await a.move(p, rim(a.get('bank'), 360, 130), 700);
        p.set('pw=1234', 'green');
        await a.wait(250);
        await a.fadeOut(p, 180);
        await a.wait(300);
        a.caption('공격자가 은행인 척 가짜 인증서를 내밀면?');
        const c = await hop(a, 'evil', 'me', '가짜 인증서', 'red', { dur: 800, keep: true });
        a.note('n-chk', 170, 318, '인증서 검사\n· 이름: bank.example?\n· 믿는 기관(CA)의 서명 ✗', { color: 'blue' });
        await a.flash('me');
        await a.fadeOut(c, 200);
        a.badge('me', '⚠ 경고', 'red');
        a.hl('me', true, 'red');
        a.note('n-key', 520, 318, '진짜 인증서를 복사해 와도\n짝이 되는 개인키가 없어서\n은행인 척할 수 없음', { color: 'violet' });
        await a.wait(900);
      },
    },
    {
      t: '그래도 위험한 순간 — 경고 무시와 http:// 첫 접속',
      easy: 'HTTPS가 있어도 사람이 경고를 무시하고 "계속"을 누르면 소용없어요. 또 주소를 http://로 처음 열면, 공격자가 그 연결을 계속 자물쇠 없는 상태로 붙잡아 둘 수 있습니다. HSTS를 쓰는 사이트는 브라우저가 처음부터 https로만 접속해서 이 틈을 막아요.',
      deep: 'SSL 스트리핑은 사용자와는 HTTP로, 서버와는 HTTPS로 통신하며 리디렉션과 링크를 http로 바꿔치기합니다. Strict-Transport-Security: max-age=31536000; includeSubDomains 헤더를 받은 브라우저는 그 기간 동안 http 요청을 내부에서 https로 바꾸고, 인증서 오류 시 "계속" 버튼 없이 차단합니다. 첫 방문 틈은 HSTS preload 목록으로 막습니다. 요즘 브라우저는 주소창 입력을 https로 먼저 시도하기도 하지만, 실패하면 http로 물러설 수 있어 HSTS가 확실한 방법입니다.',
      async run(a) {
        wipe(a);
        title(a, '그래도 위험한 순간 두 가지');
        a.zone('zl', 16, 52, 336, 360, { label: '① 경고를 무시하고 "계속"', color: 'red' });
        a.zone('zr', 368, 52, 336, 360, { label: '② 첫 접속이 http:// 라면 (SSL 스트리핑)', color: 'amber' });
        // 왼쪽: 경고 창
        box(a, 46, 88, 276, 150, 'red');
        a.text(184, 114, '⚠ 안전하지 않은 연결', { size: 14, weight: 800, color: 'red' });
        a.text(184, 142, 'bank.example 인증서를', { size: 12, cls: 'muted' });
        a.text(184, 160, '확인할 수 없습니다', { size: 12, cls: 'muted' });
        chip(a, '돌아가기', 120, 204, 'green', { w: 100, h: 30 });
        const go = chip(a, '계속(위험)', 252, 204, 'red', { w: 108, h: 30 });
        // 오른쪽: 스트리핑
        a.node('me', 428, 130, { label: '브라우저', icon: '💻', color: 'blue', w: 92, h: 60 });
        a.node('bank', 650, 130, { label: '은행', sub: 'bank.example', icon: '🏦', color: 'green', w: 100, h: 70 });
        a.node('atk', 538, 246, { label: '공격자', icon: '🕵️', color: 'red', w: 96, h: 56 });
        a.edge('me', 'atk', { arrow: false });
        a.edge('atk', 'bank', { arrow: false });
        a.caption('경고 창에서 "계속"을 누르면…');
        const cur = chip(a, '👆', 184, 290, 'gray', { w: 36, h: 30 });
        await a.move(cur, [262, 226], 600);
        await a.flash(go);
        await a.fadeOut(cur, 200);
        a.note('n-l1', 184, 300, '공격자의 가짜 인증서를\n내가 직접 승인한 셈', { color: 'red' });
        await a.wait(200);
        a.caption('주소를 http://로 열면 공격자가 자물쇠를 벗겨 냅니다');
        await hop(a, 'me', 'atk', 'http://', 'amber', { dur: 420 });
        await hop(a, 'atk', 'bank', '🔒 https', 'green', { dur: 420 });
        await hop(a, 'bank', 'atk', '🔒 응답', 'green', { dur: 420 });
        await hop(a, 'atk', 'me', '평문 응답', 'red', { dur: 420 });
        a.badge('atk', '다 보임', 'red');
        a.note('n-r1', 536, 330, '서버와는 https, 내 쪽은 http\n→ 공격자가 내용을 다 봄', { color: 'red' });
        await a.wait(500);
        a.caption('HSTS: "이 사이트는 앞으로 https로만" — 브라우저가 기억해요');
        await a.fadeOut('n-r1', 200);
        a.badge('atk', null);
        a.badge('me', 'HSTS', 'green');
        await hop(a, 'me', 'atk', '🔒 https', 'green', { dur: 420 });
        await hop(a, 'atk', 'bank', '🔒 https', 'green', { dur: 420 });
        a.badge('atk', '못 읽음', 'gray');
        a.note('n-r2', 536, 330, '처음부터 https로 접속\n→ 벗겨 낼 틈이 없음', { color: 'green' });
        a.note('n-l2', 184, 376, 'HSTS 사이트는 "계속" 버튼도 없음', { color: 'green' });
        await a.wait(500);
      },
    },
    {
      t: '막는 법 — VPN의 범위와 운영 쪽 방어',
      easy: '공용 와이파이에서 꼭 중요한 일을 해야 한다면 휴대폰 데이터(LTE·5G)나 믿을 만한 VPN을 쓰세요. VPN은 카페 와이파이 구간을 터널로 감싸 주지만, 가짜 사이트나 악성 앱까지 막아 주진 않아요. 서비스를 만드는 쪽은 HTTPS·HSTS를 기본으로 깔고, 앱에서 인증서 검증을 끄지 말아야 합니다.',
      deep: 'VPN은 기기–VPN 서버 구간만 암호화하므로 그 뒤는 일반 인터넷이고, VPN 사업자도 신뢰해야 합니다. 운영자는 모든 페이지 HTTPS + HSTS(includeSubDomains, preload), 쿠키 Secure·HttpOnly·SameSite를 적용합니다. 모바일·서버 코드에서 개발용으로 끈 인증서 검증(verify=False 등)이 배포되는 사고가 흔하니 막아야 하고, 인증서 고정(pinning)은 운영 부담을 따져 선택합니다. 사내 무선망은 WPA3-Enterprise/802.1X(EAP-TLS 등, 서버 인증서 검증 포함)로 AP와 사용자를 서로 확인하고, 공용 Wi-Fi는 클라이언트 격리를 켭니다.',
      async run(a) {
        wipe(a);
        title(a, 'VPN은 와이파이 구간을 지키는 터널 — 만능은 아님');
        a.raw('rect', { x: 70, y: 96, width: 390, height: 48, rx: 24, style: 'fill: color-mix(in srgb, var(--teal) 14%, transparent); stroke: var(--teal); stroke-width: 2; stroke-dasharray: 7 5' }, 'zone');
        a.node('me', 80, 120, { label: '내 휴대폰', icon: '📱', color: 'blue', w: 104, h: 60 });
        a.node('ap', 250, 120, { label: '카페 와이파이', icon: '📶', color: 'gray', w: 130, h: 60 });
        a.node('vpn', 450, 120, { label: 'VPN 서버', icon: '🛡️', color: 'teal', w: 112, h: 60 });
        a.node('site', 630, 120, { label: '웹사이트', sub: 'bank.example', icon: '🌐', color: 'green', w: 120, h: 66 });
        a.node('evil', 250, 222, { label: '공격자', icon: '🕵️', color: 'red', w: 100, h: 48 });
        a.edge('vpn', 'site');
        a.edge('ap', 'evil', { dashed: true, color: 'red', arrow: false });
        a.text(162, 166, '🔒 VPN 터널', { size: 12, weight: 700, color: 'teal' });
        a.text(540, 170, '여기부터는 보통 인터넷', { size: 11.5, cls: 'muted', weight: 700 });
        a.caption('카페 와이파이를 지나는 동안은 터널 안에서 잠겨 있어요');
        const p = chip(a, '🔒', 134, 120, 'teal', { w: 34 });
        const spy = chip(a, '🔒 ???', 250, 152, 'gray', { hidden: true });
        await a.move(p, [250, 120], 600);
        await a.par(a.move(p, [392, 120], 600), a.show(spy, 200).then(() => a.move(spy, [250, 194], 500)));
        await a.fadeOut(p, 150);
        await a.fadeOut(spy, 150);
        a.badge('evil', '못 읽음', 'gray');
        await hop(a, 'vpn', 'site', 'https 🔒', 'green', { dur: 600 });
        await a.wait(200);
        a.caption('VPN 말고도 — 서비스를 만드는 쪽의 방어');
        const cards = [
          [16, 'teal', 'VPN이 막는 것 · 못 막는 것', ['✓ 와이파이 구간 엿보기', '✗ 가짜 사이트 · 악성 앱', '✗ VPN 회사도 믿어야 함']],
          [250, 'green', 'HTTPS + HSTS (운영자)', ['모든 페이지 HTTPS', 'HSTS 헤더 + preload', '쿠키에 Secure 속성']],
          [484, 'violet', '앱 · 사내망 (개발 · IT팀)', ['앱: 인증서 검증 끄지 않기', '사내 WPA3 · 802.1X', '공용 와이파이: 기기 간 격리']],
        ];
        for (const [x, c, h, lines] of cards) {
          const els = [box(a, x, 262, 220, 140, c)];
          els.push(a.text(x + 110, 286, h, { size: 12.5, weight: 800, color: c }));
          lines.forEach((s, i) => els.push(a.text(x + 110, 318 + i * 26, s, { size: 12, weight: 600 })));
          els.forEach((e) => (e.style.opacity = 0));
          await appear(a, els, 300);
          await a.wait(250);
        }
        await a.wait(500);
      },
    },
    {
      t: '체크리스트 — 중간자 공격 막기',
      easy: '정리해 볼게요. 경고가 뜨면 멈추고, 주소창을 확인하고, 공용 와이파이에서는 중요한 일을 미루세요. 서비스를 만드는 쪽은 HTTPS와 HSTS를 기본으로 합니다. 그리고 허락받지 않은 네트워크에서 이런 공격을 시험해 보는 것은 불법이에요.',
      deep: '요즘은 대부분의 사이트가 HTTPS라 공용 Wi-Fi의 위험이 예전보다 줄었지만, 경고 무시·http 사이트·검증을 끈 앱·악성 프로필이나 루트 인증서 설치 같은 틈은 여전합니다. "설정 → 신뢰할 인증서 설치"를 요구하는 와이파이나 앱은 특히 의심하세요. 운영 쪽은 Mozilla Observatory 같은 도구로 HTTPS·HSTS·쿠키 설정을 점검할 수 있습니다.',
      async run(a) {
        wipe(a);
        title(a, '체크리스트 — 중간자 공격 막기');
        box(a, 16, 50, 336, 318, 'blue');
        box(a, 368, 50, 336, 318, 'green');
        a.text(184, 74, '🙋 나(사용자)', { size: 14, weight: 800, color: 'blue' });
        a.text(536, 74, '🛠️ 개발 · 운영', { size: 14, weight: 800, color: 'green' });
        const L = ['인증서 경고가 뜨면 멈추고 나가기', '주소창의 도메인 철자 확인하기', '공용 와이파이에선 금융·결제 미루기', '꼭 써야 하면 LTE나 믿을 만한 VPN', '열린 와이파이 자동 연결 끄기', 'OS · 브라우저 · 앱은 최신으로'];
        const R = ['모든 페이지 HTTPS, http는 https로', 'HSTS 헤더 + preload 목록 등록', '쿠키에 Secure · HttpOnly', '앱: 인증서 검증 끈 채 배포 금지', '사내 와이파이는 WPA3 · 802.1X', '공용 와이파이는 기기 간 격리'];
        const li = L.map((s, i) => item(a, 34, 112 + i * 42, s));
        const ri = R.map((s, i) => item(a, 386, 112 + i * 42, s));
        for (let i = 0; i < 6; i++) {
          await appear(a, [...li[i], ...ri[i]], 220);
          await a.wait(160);
        }
        a.note('n-law', 360, 398, '⚖️ 허락받지 않은 네트워크에서 이런 공격을 시험하면 불법이에요', { color: 'amber' });
        await a.wait(800);
      },
    },
  ],
};

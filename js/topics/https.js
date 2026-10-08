// HTTPS: 도청자 앞에서 TLS 1.3 핸드셰이크로 비밀 통로를 만드는 과정
const PC = [90, 110], SV = [630, 110], MID = [360, 110];

/** 물감 방울(ECDHE 비유용). move/fade로 움직일 수 있는 {g,x,y} 객체 */
function blob(a, x, y, hex, label, hidden = false) {
  const g = a.raw('g', { transform: `translate(${x} ${y})` }, 'top');
  a.raw('circle', { r: 15, fill: hex, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1.5 }, g);
  if (label) a.text(0, 27, label, { size: 11, weight: 700, par: g });
  if (hidden) g.style.opacity = 0;
  return { g, x, y };
}
const PAINT = { pub: '#f2c94c', a: '#e5534b', b: '#4c8df5', A: '#f0883e', B: '#5bbf6a', K: '#8b5a3c' };

/** 두 방울을 한 점으로 모아 새 색 방울로 바꾼다 */
async function mix(a, p, q, x, y, hex, label) {
  const c1 = blob(a, p.x, p.y, p.hex), c2 = blob(a, q.x, q.y, q.hex);
  await a.par(a.move(c1, [x, y], 600), a.move(c2, [x, y], 600));
  const r = blob(a, x, y, hex, label, true);
  await a.par(a.fadeOut(c1, 200), a.fadeOut(c2, 200), a.show(r, 250));
  r.hex = hex;
  return r;
}

export default {
  id: 'https',
  level: 2,
  cat: '보안',
  title: 'HTTPS — 자물쇠의 비밀',
  sub: '주소창의 자물쇠는 누가 엿들어도 내용을 못 읽게 만드는 장치다.',
  analogy: 'HTTP는 엽서와 같아서 배달하는 사람 누구나 내용을 읽을 수 있습니다. HTTPS는 처음 만난 두 사람이 남들이 보는 앞에서도 둘만 아는 금고 비밀번호를 정하고, 그다음부터는 모든 편지를 금고에 넣어 보내는 방법입니다.',
  keys: [
    'HTTP는 내용이 그대로(평문) 흘러가서, 중간에 있는 누구나 비밀번호까지 읽을 수 있다.',
    'TLS 1.3 핸드셰이크는 한 번 왕복(1-RTT)으로 "상대가 진짜인지 확인"과 "둘만의 키 만들기"를 끝낸다.',
    '서버 인증서는 CA(인증기관)의 서명 사슬로 검증한다. 브라우저에 내장된 루트 CA까지 거슬러 올라가 확인한다.',
    'ECDHE 키 교환 덕분에 공개된 조각만 주고받아도 양쪽이 같은 세션 키를 얻고, 도청자는 못 얻는다.',
    '느린 비대칭(공개키) 암호는 인증·키 교환에만, 실제 데이터는 빠른 대칭키(AES 등)로 암호화한다.',
  ],
  terms: [
    ['TLS', 'Transport Layer Security. HTTP 아래에서 암호화·인증을 맡는 규약. HTTPS = HTTP + TLS'],
    ['인증서', '"이 공개키는 bank.com의 것"이라고 CA가 서명해 준 전자 신분증'],
    ['CA', 'Certificate Authority. 인증서를 발급·서명하는 기관. 루트 CA 목록은 OS·브라우저에 내장'],
    ['대칭키 암호', '암호화·복호화에 같은 키를 쓰는 방식. 빠르다. 예: AES-GCM, ChaCha20'],
    ['비대칭키 암호', '공개키·개인키 한 쌍을 쓰는 방식. 서명·키 교환에 쓰며 느리다. 예: RSA, ECDSA'],
    ['ECDHE', '타원곡선 디피-헬만 키 교환. 매번 새 키를 만들어 나중에 개인키가 털려도 과거 대화는 안전(전방 비밀성)'],
    ['1-RTT', '왕복 한 번. TLS 1.3은 1번 왕복 뒤 바로 데이터를 보낼 수 있다(TLS 1.2는 2번)'],
  ],
  quiz: [
    { q: '자물쇠가 없는 HTTP 사이트에서 로그인하면 어떤 위험이 있을까요?', c: ['서버가 비밀번호를 저장하지 못한다', '같은 와이파이나 중간 장비에서 비밀번호를 그대로 읽을 수 있다', '페이지가 느리게 열릴 뿐 보안 문제는 없다', '브라우저가 알아서 암호화하므로 위험은 없다'], a: 1, why: 'HTTP는 엽서처럼 평문으로 흘러가서, 경로 위의 누구나 패킷을 캡처해 읽거나 바꿀 수 있습니다.', step: 0 },
    { q: 'TLS 연결이 맺어진 뒤 실제 데이터(비밀번호 등)를 암호화하는 데 주로 쓰는 것은?', c: ['서버 인증서의 RSA 공개키', 'CA(인증기관)의 개인키', '세션 키를 쓰는 대칭 암호(AES-GCM 등)', '도메인 이름을 해시한 값'], a: 2, why: '느린 비대칭(공개키) 암호는 인증과 키 교환에만 쓰고, 실제 데이터는 핸드셰이크로 만든 세션 키로 빠른 대칭 암호를 씁니다.', step: 6 },
    { q: 'ECDHE 키 교환이 주는 전방 비밀성(PFS)의 의미로 옳은 것은?', c: ['ClientHello부터 모든 핸드셰이크 메시지가 암호화된다', '인증서가 만료되기 전까지는 세션 키가 바뀌지 않는다', '서버 개인키만 있으면 녹화해 둔 과거 대화도 풀 수 있다', '나중에 서버 개인키가 유출돼도 녹화해 둔 과거 대화는 풀 수 없다'], a: 3, why: '연결마다 임시 키(a, b)를 새로 만들고 버리므로, 장기 개인키가 털려도 과거 세션 키를 다시 계산할 수 없습니다. ClientHello는 평문입니다.', step: 4 },
  ],
  setup(a) {
    a.node('pc', PC[0], PC[1], { label: '내 브라우저', icon: '💻', color: 'blue', h: 70 });
    a.node('srv', SV[0], SV[1], { label: '은행 서버', sub: 'bank.com', icon: '🏦', color: 'green', w: 128, h: 70 });
    a.edge('pc', 'srv', { id: 'wire', both: true, label: 'HTTP — 평문', ly: -14 });
    a.node('eve', 360, 205, { label: '도청자', icon: '🕵️', color: 'red', shape: 'person', w: 116, h: 52 });
    a.edge('eve', [MID[0], MID[1] + 4], { id: 'tap', dashed: true, color: 'red', arrow: false });
  },
  steps: [
    {
      t: 'HTTP — 비밀번호가 그대로 보인다',
      easy: '로그인할 때 비밀번호가 엽서처럼 그대로 날아갑니다. 같은 와이파이에 있는 사람이나 중간 장비가 슬쩍 보면 다 읽혀요.',
      deep: 'HTTP 요청은 평문 바이트 그대로 TCP에 실립니다. 공용 Wi-Fi의 ARP 스푸핑, 악성 공유기, ISP 등 경로 위 누구나 패킷을 캡처(예: Wireshark)해 읽거나 변조(MITM)할 수 있습니다.',
      async run(a) {
        a.caption('POST /login … 비밀번호를 그대로 보냄');
        const p = a.packet('pw=1234', { at: 'pc', color: 'blue' });
        await a.move(p, MID, 700);
        const copy = a.packet('pw=1234', { at: MID, color: 'red' });
        await a.par(a.move(p, 'srv', 700), a.move(copy, [360, 160], 500));
        await a.par(a.fadeOut(p, 200), a.fadeOut(copy, 200));
        a.hl('eve', true, 'red');
        a.badge('eve', '다 보임', 'red');
        a.note('n-see', 360, 300, '도청자 화면\nPOST /login\nid=minji & pw=1234', { color: 'red' });
        await a.wait(900);
      },
    },
    {
      t: 'ClientHello — "이런 암호를 쓸 수 있어요"',
      easy: '이번엔 HTTPS로 접속합니다. 브라우저가 먼저 "나는 이런 잠금 방식을 쓸 줄 알아요"라고 인사하면서, 키를 만들 재료 한 조각을 같이 보냅니다.',
      deep: 'TLS 1.3 ClientHello에는 지원 버전(supported_versions), 암호 스위트(TLS_AES_128_GCM_SHA256 등), 접속할 도메인(SNI), 그리고 ECDHE 공개값(key_share, 보통 X25519)이 들어 있습니다. 이 메시지 자체는 평문이라 도청자도 볼 수 있지만, 비밀은 하나도 없습니다.',
      async run(a) {
        a.clear();
        a.hl('eve', false);
        a.badge('eve', null);
        a.get('wire').lab.textContent = 'HTTPS 연결 시작';
        a.caption('브라우저 → 서버: 안녕하세요(ClientHello)');
        await a.send('pc', 'srv', 'ClientHello', { color: 'blue', dur: 1100 });
        a.note('n-ch', 160, 320, 'ClientHello\n· TLS 1.3 가능\n· 암호: AES-GCM …\n· 키 조각 🔑A', { color: 'blue' });
        await a.wait(800);
      },
    },
    {
      t: 'ServerHello + 인증서 + Finished',
      easy: '서버는 "좋아요, 이 방식으로 해요"라고 답하면서 자기 키 조각과 신분증(인증서)을 함께 보냅니다. 한 번 갔다 오는 것으로 준비가 거의 끝나요.',
      deep: '서버는 ServerHello(선택한 스위트 + key_share)를 보내고, 이 시점부터 핸드셰이크 키로 암호화된 EncryptedExtensions·Certificate·CertificateVerify(개인키 서명)·Finished를 이어 보냅니다. 클라이언트가 Finished를 보내면 곧바로 애플리케이션 데이터 전송 — 1-RTT입니다(TLS 1.2는 2-RTT).',
      async run(a) {
        a.clear();
        a.caption('서버 → 브라우저: 키 조각 + 신분증 + 완료');
        const items = [['ServerHello 🔑B', 'green'], ['인증서 📜', 'amber'], ['Finished ✓', 'teal']];
        await a.par(...items.map(([l, c], i) => a.wait(i * 330).then(() => a.send('srv', 'pc', l, { color: c, dur: 1100 }))));
        a.note('n-sh', 560, 320, 'ServerHello: 키 조각 🔑B\n인증서: "나는 bank.com"\nFinished: 준비 끝', { color: 'green' });
        a.note('n-rtt', 180, 320, '왕복 1번 = 1-RTT\n(TLS 1.2는 2번)', { color: 'teal' });
        await a.wait(900);
      },
    },
    {
      t: '인증서 확인 — 믿을 만한 기관의 도장인가',
      easy: '신분증은 누구나 위조할 수 있으니, 브라우저는 "이 신분증에 찍힌 도장이 내가 원래 믿는 기관(CA)의 것인가?"를 거슬러 올라가며 확인합니다.',
      deep: '리프 인증서(bank.com)는 중간 CA가, 중간 CA 인증서는 루트 CA가 서명합니다. 브라우저는 각 서명을 상위 공개키로 검증하고, 루트가 OS/브라우저 신뢰 저장소에 있는지, 유효 기간, 도메인(SAN) 일치, 폐기 여부(브라우저가 미리 받아 둔 폐기 목록 — Chrome CRLSets, Firefox CRLite 등)를 확인합니다. CertificateVerify로 서버가 그 인증서의 개인키를 실제로 가졌는지도 증명됩니다.',
      async run(a) {
        a.clear('pkt', 'top', 'zone');
        a.zone('z-trust', 34, 262, 196, 134, { label: '브라우저 신뢰 목록', color: 'amber' });
        a.node('root', 130, 340, { label: '루트 CA', sub: '처음부터 내장', icon: '🏛️', color: 'amber', w: 128, h: 66, layer: 'top' });
        a.node('mid', 360, 340, { label: '중간 CA', sub: '루트가 서명', icon: '🏢', color: 'violet', w: 120, h: 66, layer: 'top' });
        a.node('leaf', 590, 340, { label: 'bank.com', sub: '중간 CA가 서명', icon: '📜', color: 'gray', w: 132, h: 66, layer: 'top' });
        a.text(245, 340, '◀ 서명', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(475, 340, '◀ 서명', { size: 11.5, cls: 'muted', weight: 700 });
        a.caption('도장을 따라 거꾸로 올라가며 확인');
        const chk = a.packet('확인 🔍', { at: 'pc', color: 'blue' });
        await a.move(chk, [[90, 250], [590, 250], [590, 296]], 1300);
        a.hl('leaf', true, 'green'); a.badge('leaf', '✓', 'green');
        await a.move(chk, [[590, 250], [360, 250], [360, 296]], 800);
        a.hl('mid', true, 'green'); a.badge('mid', '✓', 'green');
        await a.move(chk, [[360, 250], [130, 250], [130, 296]], 800);
        a.hl('root', true, 'green'); a.badge('root', '신뢰 ✓', 'green');
        await a.fadeOut(chk, 200);
        a.badge('pc', '진짜 bank.com ✓', 'green');
        await a.flash('pc');
      },
    },
    {
      t: '같은 세션 키 만들기 — 물감 섞기',
      easy: '공통 노란 물감에 각자 비밀 물감을 섞어 주고받습니다. 받은 색에 내 비밀 물감을 한 번 더 섞으면 양쪽 모두 똑같은 갈색이 나와요. 도청자는 섞인 색만 봐서 갈색을 만들 수 없습니다.',
      deep: 'ECDHE: 각자 임시 개인키 a, b를 만들고 공개값 aG, bG(key_share)만 교환합니다. 브라우저는 a·(bG), 서버는 b·(aG)로 같은 비밀 abG를 얻고, HKDF로 세션 키들을 유도합니다. aG·bG만으로 abG를 구하는 건 계산상 불가능(ECDLP)하고, 키가 매 연결마다 새로 만들어져 전방 비밀성(PFS)이 보장됩니다.',
      async run(a) {
        a.clear('pkt', 'top', 'zone');
        a.badge('pc', null);
        a.caption('공개된 재료만 주고받아 같은 비밀을 만든다');
        const pa = blob(a, 50, 290, PAINT.pub, '공통'); pa.hex = PAINT.pub;
        const sa = blob(a, 120, 290, PAINT.a, '내 비밀'); sa.hex = PAINT.a;
        const pb = blob(a, 600, 290, PAINT.pub, '공통'); pb.hex = PAINT.pub;
        const sb = blob(a, 670, 290, PAINT.b, '서버 비밀'); sb.hex = PAINT.b;
        await a.wait(400);
        const [A, B] = await a.par(
          mix(a, pa, sa, 85, 365, PAINT.A, '공개 A'),
          mix(a, pb, sb, 635, 365, PAINT.B, '공개 B'),
        );
        // 교환 — 도청자도 복사본을 본다
        const toS = blob(a, A.x, A.y, PAINT.A), toC = blob(a, B.x, B.y, PAINT.B);
        const spyA = blob(a, A.x, A.y, PAINT.A), spyB = blob(a, B.x, B.y, PAINT.B);
        await a.par(
          a.move(toS, [[A.x, 250], [520, 250], [520, 365]], 1200),
          a.move(toC, [[B.x, 250], [200, 250], [200, 365]], 1200),
          a.move(spyA, [[A.x, 250], [320, 250], [320, 290]], 1000),
          a.move(spyB, [[B.x, 250], [400, 250], [400, 290]], 1000),
        );
        toS.hex = PAINT.A; toC.hex = PAINT.B;
        a.text(360, 316, '도청자가 본 것', { size: 11, cls: 'muted', weight: 700 });
        // 받은 색 + 내 비밀 → 같은 갈색
        await a.par(
          mix(a, toC, sa, 200, 365, PAINT.K, '🔑 세션 키'),
          mix(a, toS, sb, 520, 365, PAINT.K, '🔑 세션 키'),
        );
        a.note('n-eve', 360, 360, '섞인 색만으론\n갈색을 못 만듦 ❓', { color: 'red' });
        a.badge('pc', '🔑', 'green');
        a.badge('srv', '🔑', 'green');
        await a.wait(900);
      },
    },
    {
      t: '암호화된 데이터 — 도청자는 외계어만',
      easy: '이제 비밀번호를 둘만 아는 키로 잠가서 보냅니다. 도청자는 "x8#Qf…" 같은 의미 없는 글자만 보고, 서버는 같은 키로 열어 원래 내용을 읽어요.',
      deep: '세션 키로 AES-GCM 같은 AEAD 대칭 암호를 적용해 TLS 레코드로 보냅니다. 기밀성뿐 아니라 무결성(태그 검증)도 보장되어, 중간에서 한 비트만 바꿔도 복호화가 실패합니다. 도청자가 볼 수 있는 건 IP·포트·대략적인 크기·SNI(ECH 미사용 시) 정도입니다.',
      async run(a) {
        a.clear('pkt', 'top', 'zone');
        a.get('wire').lab.textContent = 'HTTPS — TLS 1.3 🔒';
        a.hl('wire');
        a.caption('같은 비밀번호, 이번엔 잠가서 보냄');
        const p = a.packet('pw=1234', { at: 'pc', color: 'blue', w: 104 });
        await a.move(p, [190, 110], 400);
        p.set('🔒 x8#Qf…', 'gray');
        await a.flash('pc');
        await a.move(p, MID, 500);
        const copy = a.packet('x8#Qf9z…', { at: MID, color: 'gray' });
        await a.par(a.move(p, [530, 110], 600), a.move(copy, [360, 160], 500));
        await a.fadeOut(copy, 200);
        a.note('n-eve', 360, 290, '도청자 화면\nx8#Qf9zL@!r2…\n??? 읽을 수 없음', { color: 'red' });
        p.set('pw=1234', 'green');
        await a.move(p, 'srv', 300);
        await a.fadeOut(p, 250);
        a.hl('srv', true, 'green');
        a.note('n-ok', 600, 205, '열쇠로 열면 pw=1234', { color: 'green' });
        await a.wait(800);
        a.hl('srv', false);
      },
    },
    {
      t: '왜 두 종류의 암호를 섞어 쓸까',
      easy: '자물쇠 두 종류를 나눠 씁니다. 느리지만 처음 만난 사이에도 쓸 수 있는 "공개키"는 신분 확인과 키 만들기에만, 빠른 "대칭키"는 실제 대화 전부에 씁니다.',
      deep: '비대칭 연산(RSA-2048 서명, ECDHE)은 대칭 암호보다 수천 배 느려 핸드셰이크에서 한 번만 씁니다. 이후 데이터는 AES-GCM/ChaCha20-Poly1305로 처리하며, 최신 CPU의 AES-NI 덕분에 GB/s 수준이라 HTTPS 오버헤드는 거의 무시할 만합니다. 재방문 시에는 세션 재개(PSK)·0-RTT로 핸드셰이크도 줄입니다.',
      async run(a) {
        a.clear('pkt', 'top', 'zone');
        a.node('asym', 200, 330, { label: '비대칭키', sub: '느림 · 인증/키 교환', icon: '🗝️', color: 'violet', w: 170, h: 70, layer: 'top' });
        a.node('sym', 520, 330, { label: '대칭키 (AES)', sub: '빠름 · 모든 데이터', icon: '🔑', color: 'green', w: 170, h: 70, layer: 'top' });
        a.text(360, 395, '핸드셰이크 1번 → 그다음은 전부 대칭키', { size: 12.5, cls: 'muted' });
        await a.flash('asym');
        a.caption('대칭키로 데이터가 빠르게 오간다');
        const fl = [];
        for (let i = 0; i < 6; i++) {
          const fwd = i % 2 === 0;
          fl.push(a.wait(i * 220).then(() => a.send(fwd ? 'pc' : 'srv', fwd ? 'srv' : 'pc', '🔒 ···', { color: fwd ? 'blue' : 'green', dur: 700 })));
        }
        fl.push(a.flash('sym', 2));
        await a.par(...fl);
      },
    },
  ],
};

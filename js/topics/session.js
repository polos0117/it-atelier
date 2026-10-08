// 로그인 상태 유지: 쿠키 + 세션 저장소 vs 토큰(JWT)
const TOK = [
  ['header', 'red', 130, 150, '{"alg":"HS256"}'],
  ['payload', 'violet', 352, 190, '{"sub":"minji","exp":…}'],
  ['signature', 'teal', 580, 170, 'HMAC(서버 비밀키)'],
];

export default {
  id: 'session',
  level: 2,
  cat: '보안',
  title: '로그인 — 쿠키·세션·토큰',
  sub: '한 번 로그인하면 페이지를 옮겨도 왜 계속 로그인 상태일까?',
  analogy: '세션은 놀이공원 손목 밴드 번호와 같습니다. 번호만 차고 다니고, 진짜 정보는 매표소 장부에 있죠. 토큰(JWT)은 위조 방지 도장이 찍힌 자유이용권입니다. 장부를 볼 필요 없이 도장만 확인하면 어느 입구에서든 통과합니다.',
  keys: [
    'HTTP는 요청마다 서로를 기억하지 못한다(무상태). 그래서 "나 아까 그 사람이야"라는 증표를 매번 보낸다.',
    '세션 방식: 서버가 저장소에 로그인 정보를 두고, 브라우저에는 번호(세션 ID)만 쿠키로 준다.',
    '서버가 여러 대면 모두 같은 세션 저장소(예: Redis)를 봐야 한다 → 저장소가 병목·장애점이 될 수 있다.',
    '토큰(JWT) 방식: 서버가 서명한 토큰 자체에 정보가 들어 있어, 어떤 서버든 저장소 없이 서명만 확인한다.',
    '토큰은 탈취되면 만료 전까지 막기 어렵다 → 짧은 만료·리프레시 토큰·HttpOnly/Secure/SameSite 쿠키로 방어한다.',
  ],
  terms: [
    ['쿠키', '서버가 Set-Cookie로 주면 브라우저가 저장했다가 같은 사이트 요청마다 자동으로 붙여 보내는 작은 값'],
    ['세션', '서버 쪽에 저장된 로그인 상태. 브라우저는 그 열쇠 번호(세션 ID)만 가진다'],
    ['JWT', 'JSON Web Token. header.payload.signature 세 부분을 점으로 이은 서명된 토큰'],
    ['Bearer', 'Authorization: Bearer <토큰> — "이 토큰을 가진 사람"이라는 뜻의 인증 헤더 형식'],
    ['무상태(stateless)', '서버가 요청 사이의 상태를 기억하지 않는 것. 서버를 늘리기 쉽다'],
    ['HttpOnly / Secure / SameSite', '쿠키 보호 옵션: JS 접근 차단 / HTTPS에서만 전송 / 다른 사이트발 요청에 안 붙음'],
  ],
  quiz: [
    { q: '세션 방식 로그인에서 서버가 쿠키로 브라우저에 주는 것은?', c: ['서버 장부를 찾는 번호표(세션 ID)', '아이디와 비밀번호', '로그인한 사람의 모든 개인 정보', '서버가 서명에 쓰는 비밀키'], a: 0, why: '진짜 로그인 정보는 서버의 세션 저장소(장부)에 두고, 브라우저에는 추측할 수 없는 번호(세션 ID)만 쿠키로 줍니다.', step: 1 },
    { q: '세션을 각 서버의 메모리에만 저장한 채 서버를 2대로 늘리면 어떤 문제가 생길까요?', c: ['아무 문제 없다 — 쿠키가 알아서 세션이 있는 서버를 찾아간다', '쿠키 크기가 서버 수만큼 커진다', '다른 서버로 간 요청은 로그인하지 않은 상태로 보인다', '모든 사용자가 비밀번호를 다시 설정해야 한다'], a: 2, why: '다른 서버의 메모리에는 그 세션이 없으니 로그아웃 상태가 됩니다. 스티키 세션이나 Redis 같은 공유 세션 저장소로 해결합니다.', step: 3 },
    { q: 'JWT의 payload에 대한 설명으로 옳은 것은?', c: ['서명 키로 암호화되어 있어 서버만 읽을 수 있다', 'base64url 인코딩일 뿐이라 누구나 읽을 수 있으므로 비밀 정보를 넣으면 안 된다', '서버 세션 저장소에 저장되고 토큰에는 번호만 들어 있다', '한 번 검증하면 자동으로 만료되어 재사용할 수 없다'], a: 1, why: '서명은 위조를 막을 뿐 내용을 숨기지 않습니다. payload는 인코딩이라 누구나 디코딩해 읽을 수 있습니다.', step: 4 },
  ],
  setup(a) {
    a.node('pc', 80, 200, { label: '내 브라우저', icon: '💻', color: 'blue', h: 70 });
    a.node('sa', 340, 120, { label: '서버 A', sub: '', icon: '🖥️', color: 'green', w: 120, h: 66 });
    a.node('sb', 340, 290, { label: '서버 B', sub: '', icon: '🖥️', color: 'green', w: 120, h: 66, hidden: true });
    a.node('store', 610, 120, { label: '세션 저장소', sub: '(비어 있음)', icon: '🗄️', color: 'amber', shape: 'db', w: 150, h: 84 });
    a.edge('pc', 'sa', { id: 'e-pa', both: true });
    a.edge('pc', 'sb', { id: 'e-pb', both: true, hidden: true });
    a.edge('sa', 'store', { id: 'e-as', both: true, dashed: true });
    a.edge('sb', 'store', { id: 'e-bs', both: true, dashed: true, hidden: true });
  },
  steps: [
    {
      t: '로그인 — 아이디와 비밀번호 보내기',
      easy: '로그인 버튼을 누르면 아이디와 비밀번호가 서버로 갑니다. 서버는 맞는지 확인한 뒤, "민지 로그인함"이라는 기록을 장부(세션 저장소)에 적고 번호표를 하나 만듭니다.',
      deep: 'POST /login 본문에 자격 증명을 보냅니다(반드시 HTTPS). 서버는 저장된 비밀번호 해시(bcrypt/argon2)와 비교한 뒤, 추측 불가능한 난수 세션 ID를 생성해 {sid → userId, 만료 시각}을 저장소에 넣습니다.',
      async run(a) {
        a.caption('아이디·비밀번호를 서버로');
        await a.send('pc', 'sa', 'POST /login', { color: 'blue', dur: 900 });
        a.hl('sa');
        a.note('n-chk', 340, 46, 'minji / ●●●● 확인 ✓', { color: 'green' });
        await a.flash('sa');
        await a.send('sa', 'store', 'sid=7f3a 저장', { color: 'amber', dur: 800 });
        a.setNode('store', { sub: '7f3a → 민지' });
        a.hl('store', true, 'amber');
        await a.flash('store');
        a.hl('sa', false);
        a.hl('store', false);
      },
    },
    {
      t: 'Set-Cookie — 번호표를 쿠키로',
      easy: '서버는 비밀번호 대신 "7f3a"라는 번호표만 브라우저에게 줍니다. 브라우저는 이걸 쿠키라는 작은 메모로 저장해 둡니다.',
      deep: '응답 헤더 Set-Cookie: sid=7f3a; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600. 브라우저는 도메인별 쿠키 저장소에 보관하고, 이후 같은 사이트로 가는 요청에 Cookie 헤더로 자동 첨부합니다.',
      async run(a) {
        a.clear();
        a.caption('서버 → 브라우저: 번호표(세션 ID)');
        await a.send('sa', 'pc', 'Set-Cookie 🍪', { color: 'amber', dur: 900 });
        a.badge('pc', '🍪 sid=7f3a', 'amber');
        await a.flash('pc');
        a.note('n-c', 110, 300, '쿠키에는 번호만!\n정보는 서버 장부에', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '다음 요청 — 쿠키를 자동으로 붙여서',
      easy: '"내 주문 내역" 페이지를 열면 브라우저가 쿠키를 알아서 붙여 보냅니다. 서버는 번호로 장부를 찾아 "아, 민지 님이구나" 하고 알아봅니다.',
      deep: '요청마다 Cookie: sid=7f3a가 붙고, 서버는 저장소를 조회(Redis GET 등, 보통 1ms 미만)해 사용자를 식별합니다. 세션 만료는 저장소의 TTL로 처리하고, 로그아웃은 저장소에서 키를 지우면 즉시 반영됩니다.',
      async run(a) {
        a.clear();
        await a.send('pc', 'sa', 'GET /my 🍪7f3a', { color: 'blue', dur: 900 });
        a.hl('sa');
        await a.send('sa', 'store', '7f3a 누구?', { color: 'amber', dur: 700 });
        a.hl('store', true, 'amber');
        await a.send('store', 'sa', '민지', { color: 'green', dur: 700 });
        a.hl('store', false);
        await a.send('sa', 'pc', '민지님 주문내역', { color: 'green', dur: 900 });
        a.hl('sa', false);
        a.note('n-look', 470, 250, '요청마다: 쿠키 번호 → 장부 조회 → "민지"', { color: 'amber' });
        await a.wait(500);
      },
    },
    {
      t: '서버가 여러 대라면?',
      easy: '사용자가 많아져 서버를 2대로 늘렸습니다. 이번 요청은 서버 B로 갔는데, 서버 B도 같은 장부를 볼 수 있어야 민지 님을 알아봅니다. 장부가 하나라 모든 서버가 거기에 물어봐요.',
      deep: '세션을 서버 메모리에 두면 다른 서버로 간 요청은 로그아웃 상태가 됩니다. 해결책은 스티키 세션(같은 서버로만 보내기) 또는 Redis 같은 공유 세션 저장소입니다. 공유 저장소는 모든 요청에 네트워크 홉을 추가하고, 저장소 장애가 곧 전체 로그인 장애가 되므로 복제·클러스터링이 필요합니다.',
      async run(a) {
        a.clear();
        a.caption('서버 B도 같은 장부를 봐야 한다');
        await a.par(a.show('sb'), a.show('e-pb'), a.show('e-bs'));
        await a.send('pc', 'sb', 'GET /my 🍪7f3a', { color: 'blue', dur: 900 });
        a.hl('sb');
        await a.send('sb', 'store', '7f3a 누구?', { color: 'amber', dur: 800 });
        a.hl('store', true, 'amber');
        await a.send('store', 'sb', '민지', { color: 'green', dur: 800 });
        a.hl('store', false);
        a.hl('sb', false);
        a.badge('store', '모두가 조회', 'red');
        a.note('n-spof', 590, 250, '저장소가 느리거나 멈추면\n모든 서버의 로그인이 끊김', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '토큰(JWT) — 도장 찍힌 자유이용권',
      easy: '다른 방법도 있습니다. 서버가 "민지, 1시간 유효"라고 적은 표에 위조할 수 없는 도장(서명)을 찍어 줍니다. 장부에 적을 필요가 없어요.',
      deep: 'JWT = base64url(header).base64url(payload).signature. payload에는 sub·exp 같은 클레임이 담기고, signature는 HMAC-SHA256(공유 비밀키) 또는 RS256/ES256(개인키 서명)으로 만듭니다. payload는 암호화가 아니라 인코딩일 뿐이라 누구나 읽을 수 있으므로 비밀 정보를 넣으면 안 됩니다.',
      async run(a) {
        a.clear();
        a.badge('store', null);
        a.badge('pc', null);
        await a.par(a.fade('store', 0.3), a.fade('e-as', 0.2), a.fade('e-bs', 0.2));
        a.setNode('store', { sub: '필요 없음' });
        a.caption('서버가 비밀키로 서명한 토큰을 만든다');
        a.hl('sa');
        a.badge('sa', '🔏 서명', 'teal');
        for (const [k, c, x, w, desc] of TOK) {
          a.text(x, 368, desc, { size: 11, cls: 'muted', mono: true });
          const p = a.packet(k, { at: [x, 400], color: c, w, round: 6, layer: 'top', hidden: true });
          await a.show(p, 300);
        }
        a.text(231, 398, '.', { size: 22, weight: 800 });
        a.text(471, 398, '.', { size: 22, weight: 800 });
        await a.send('sa', 'pc', 'JWT 🎫', { color: 'teal', dur: 900 });
        a.badge('pc', '🎫 JWT', 'teal');
        a.badge('sa', null);
        a.hl('sa', false);
      },
    },
    {
      t: 'Authorization: Bearer — 어떤 서버든 바로 확인',
      easy: '이제 요청마다 이 표를 보여 줍니다. 서버 A든 B든 장부를 볼 필요 없이 도장만 확인하면 진짜인지 알 수 있어요.',
      deep: '클라이언트는 Authorization: Bearer <JWT> 헤더(또는 쿠키)로 보냅니다. 각 서버는 같은 비밀키/공개키로 서명과 exp를 검증만 하므로 저장소 조회가 없고(무상태), 서버를 늘리기 쉽습니다. 마이크로서비스 간 인증 전달에도 많이 씁니다.',
      async run(a) {
        a.clear('pkt');
        await a.send('pc', 'sb', 'Bearer 🎫', { color: 'teal', dur: 900 });
        a.hl('sb', true, 'green');
        a.badge('sb', '서명 ✓', 'green');
        await a.flash('sb');
        await a.send('sb', 'pc', '민지님 주문내역', { color: 'green', dur: 800 });
        a.hl('sb', false);
        await a.send('pc', 'sa', 'Bearer 🎫', { color: 'teal', dur: 800 });
        a.badge('sa', '서명 ✓', 'green');
        await a.flash('sa');
        a.note('n-sl', 560, 250, '장부 조회 없이 서명만 확인\n→ 서버를 늘리기 쉬움', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '조심할 점 — 탈취, 만료, 로그아웃',
      easy: '자유이용권은 누가 훔쳐 가면 유효 시간이 끝날 때까지 그 사람도 쓸 수 있습니다. 그래서 유효 시간을 짧게 하고, 쿠키에는 "자바스크립트가 못 읽게, HTTPS로만, 다른 사이트에서는 안 붙게" 같은 보호 옵션을 겁니다.',
      deep: 'JWT는 서버가 상태를 안 가지므로 강제 로그아웃·즉시 폐기가 어렵습니다 → 짧은 access token(5~15분) + 회전하는 refresh token, 필요 시 jti 차단 목록을 둡니다. 저장 위치가 localStorage면 XSS에 노출되므로 HttpOnly 쿠키가 안전하고, Secure는 평문 전송을, SameSite는 CSRF를 막습니다. 세션 방식은 즉시 폐기가 쉬운 대신 저장소 비용이 듭니다.',
      async run(a) {
        a.clear();
        a.badge('sa', null);
        a.badge('sb', null);
        a.node('thief', 80, 370, { label: '탈취자', icon: '🦹', color: 'red', shape: 'person', w: 110, h: 50, layer: 'top' });
        a.caption('토큰이 새어 나가면?');
        await a.send('pc', 'thief', '🎫 복사', { color: 'red', dur: 700 });
        a.badge('thief', '🎫', 'red');
        await a.send('thief', 'sb', 'Bearer 🎫', { color: 'red', dur: 800 });
        a.hl('sb', true, 'red');
        await a.send('sb', 'thief', '200 OK 😱', { color: 'red', dur: 700 });
        a.note('n-x', 272, 404, '만료(exp)까지는 진짜로 통과', { color: 'red' });
        await a.wait(500);
        a.note('n-fix', 568, 378, '대책\n· 짧은 만료 + 리프레시\n· HttpOnly·Secure 쿠키\n· SameSite로 CSRF 차단', { color: 'green' });
        a.hl('sb', false);
        await a.wait(800);
      },
    },
  ],
};

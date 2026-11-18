// 피싱: 급한 미끼 문자 → 가짜 링크(주소 읽는 법) → 가짜 로그인 화면 → 중간 전달형(2단계 코드까지 실시간 전달)
// → 여러 형태(스미싱·보이스피싱·스피어피싱·QR) → 사용자 방어(직접 접속·비번 관리자·패스키) → 조직 방어와 당했을 때
// 모든 주소는 예약된 .example 도메인을 쓴 설명용 예시이며, 실제 기관·브랜드와 무관하다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, hidden: o.hidden, id: o.id });
}
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
const tint = (c, p = 16) => `fill:color-mix(in srgb, var(--${c}) ${p}%, var(--panel));stroke:color-mix(in srgb, var(--${c}) 60%, transparent);stroke-width:1.5`;

/** 말풍선(문자·메일 한 통). lines: 글줄 배열 */
function bubble(a, x, y, w, lines, color) {
  const g = a.raw('g', {}, 'node');
  const h = lines.length * 19 + 14;
  a.raw('rect', { x, y: y - h / 2, width: w, height: h, rx: 12, style: tint(color) }, g);
  lines.forEach((l, i) => a.text(x + 12, y - h / 2 + 16 + i * 19, l, { size: 12.5, anchor: 'start', weight: i ? 600 : 800, par: g }));
  g.style.opacity = 0;
  return g;
}
/** 체크리스트 한 줄 */
async function item(a, x, y, mark, s, color, o = {}) {
  const m = a.text(x, y, mark, { size: o.msize || 15, weight: 800, color, hidden: true });
  const t = a.text(x + 20, y, s, { size: o.size || 13, anchor: 'start', weight: 700, hidden: true });
  await appear(a, [m, t], 220);
  await a.wait(o.gap ?? 200);
}
/** 주소 한 줄: segs = [[글자, 주인 부분이면 색]] */
function url(a, x, y, segs) {
  const t = a.text(x, y, '', { size: 14, mono: true, anchor: 'start', weight: 600, cls: 'muted' });
  const sp = segs.map(([s]) => { const e = a.raw('tspan', {}, t); e.textContent = s; return e; });
  return { t, mark: () => segs.forEach(([, c], i) => { if (c) { sp[i].setAttribute('class', 'tc-' + c); sp[i].setAttribute('font-weight', 800); } }) };
}

export default {
  id: 'phishing',
  level: 1,
  cat: '보안',
  title: '피싱 — 미끼를 문 순간 생기는 일',
  sub: '진짜처럼 꾸민 문자·메일·화면으로 비밀번호와 인증 코드를 스스로 내주게 만드는 공격',
  analogy: '은행 직원 옷을 입은 사람이 길에서 "통장이 정지될 뻔했어요, 비밀번호만 확인할게요"라고 말을 거는 것과 같아요. 문을 부수는 대신 주인이 스스로 열쇠를 건네게 만드는 거죠. 그래서 가장 좋은 방어는 "그 사람이 아니라 은행 창구로 직접 가서 확인하기"입니다.',
  keys: [
    '피싱은 기술보다 사람의 감정(급함·두려움·이득)을 노린다. 재촉할수록 의심해야 한다.',
    '링크 주소의 주인은 맨 끝의 도메인이 정한다. 앞부분에 그럴듯한 이름이 있어도, 글자 하나만 바뀌어도 전혀 다른 곳이다.',
    '가짜 로그인 화면에 넣은 아이디·비밀번호는 곧장 공격자에게 가고, 중간 전달형 피싱은 문자·OTP 코드까지 실시간으로 넘겨 써서 로그인 상태를 빼앗는다.',
    '링크 대신 앱·즐겨찾기로 직접 접속하고, 비밀번호 관리자와 도메인에 묶인 패스키(FIDO2)를 쓰면 가짜 주소에서는 자동 입력도 인증도 일어나지 않는다.',
    '조직은 메일 인증(SPF·DKIM·DMARC)·신고 체계·교육으로 막고, 당했다면 비밀번호 변경·세션 끊기·금융사 연락·118 상담을 바로 한다. 허락 없이 남의 시스템에 이런 기법을 시험하는 것은 불법이다.',
  ],
  terms: [
    ['피싱(phishing)', '믿을 만한 곳인 척 속여 비밀번호·카드 정보·인증 코드 등을 빼내는 사회공학 공격'],
    ['도메인', '인터넷 주소에서 주인을 나타내는 부분. https:// 다음부터 첫 "/" 앞까지 중 맨 오른쪽 이름(예: bank.example)'],
    ['스미싱 · 보이스피싱', '문자(SMS)로 하는 피싱과 전화(목소리)로 하는 피싱'],
    ['스피어피싱', '특정 사람·조직을 미리 조사해 그 사람만을 위해 맞춤으로 만든 피싱'],
    ['중간 전달형 피싱(AitM)', '가짜 사이트가 사용자와 진짜 사이트 사이에서 입력을 실시간으로 주고받아, 2단계 인증 뒤 발급되는 로그인 쿠키까지 가로채는 방식'],
    ['패스키(FIDO2)', '비밀번호 대신 기기 안의 비밀 키로 서명하는 로그인. 키가 사이트 도메인에 묶여 있어 가짜 주소에는 응답하지 않는다'],
    ['SPF · DKIM · DMARC', '보낸 서버가 허락된 곳인지(SPF), 메일에 도메인의 전자서명이 있는지(DKIM), 둘 다 실패하면 어떻게 할지(DMARC)를 정하는 메일 인증 규칙'],
  ],
  quiz: [
    { q: '"계정이 잠겼어요. 1시간 안에 확인하세요"라는 문자를 받았을 때 가장 안전한 행동은?', c: ['문자 속 링크를 눌러 빨리 확인한다', '답장으로 아이디를 보내 확인해 달라고 한다', '링크는 누르지 않고, 평소 쓰던 앱이나 즐겨찾기로 직접 들어가 확인한다'], a: 2, why: '급하게 재촉하는 것 자체가 피싱의 신호입니다. 링크를 따라가지 말고 내가 아는 경로(공식 앱·즐겨찾기·직접 입력)로 들어가면 가짜 화면을 만날 일이 없습니다.', step: 5 },
    { q: '다음 주소 중 bank.example이 운영하는 곳은?', c: ['https://login.bank.example/', 'https://bank.example.bad.example/login', 'https://bank-example.co.example/login', 'https://bamk.example/login'], a: 0, why: '주소의 주인은 https:// 다음, 첫 "/" 앞의 맨 오른쪽 부분이 정합니다. login.bank.example은 bank.example 아래 주소지만, 나머지는 각각 bad.example, co.example, bamk.example의 주소입니다.', step: 1 },
    { q: '중간 전달형(AitM) 피싱이 문자·OTP 코드까지 넘겨받아 진짜 사이트에 로그인한 뒤 최종적으로 가로채는 것은?', c: ['사용자 휴대폰의 유심', '로그인 후 발급되는 세션 쿠키', '은행 서버의 데이터베이스', '사용자 공유기의 관리자 비밀번호'], a: 1, why: '가짜 사이트가 사용자와 진짜 사이트 사이에서 입력을 그대로 전달하면, 2단계 인증을 통과한 뒤 진짜 사이트가 내준 세션 쿠키를 공격자가 손에 넣어 로그인 상태를 그대로 씁니다. 패스키는 도메인이 달라 서명 자체를 하지 않아 이 방식에 강합니다.', step: 3 },
  ],
  setup(a) {
    a.text(360, 36, '어느 날 도착한 문자와 메일', { size: 13.5, weight: 800 });
  },
  steps: [
    {
      t: '미끼 — 급하게 만드는 문자와 메일',
      easy: '"택배 주소가 틀렸어요", "계정이 잠겼어요", "경품에 당첨됐어요" 같은 문자가 와요. 공통점은 지금 당장 뭔가를 하라고 재촉한다는 거예요. 급하거나 무섭거나 이득이 될 것 같으면 사람은 확인할 생각을 잘 못 하거든요.',
      deep: '피싱은 기술적 취약점보다 사회공학, 즉 긴급성·권위·두려움·보상 같은 심리적 압박을 이용합니다. 택배·금융·공공기관·결제 알림처럼 누구나 받을 법한 주제를 고르고, 발신 번호·보낸 사람 이름은 쉽게 꾸밀 수 있어 그 자체로는 믿을 근거가 되지 않습니다. 대량 발송형은 소수만 속아도 이득이라 문구가 어색해도 계속 보내지며, 요즘은 문장이 자연스러워져 맞춤법만으로 가려내기 어렵습니다.',
      async run(a) {
        wipe(a);
        a.text(360, 36, '어느 날 도착한 문자와 메일', { size: 13.5, weight: 800 });
        a.raw('rect', { x: 36, y: 56, width: 312, height: 338, rx: 26, style: 'fill:var(--panel2);stroke:var(--line2);stroke-width:1.5' }, 'zone');
        a.text(192, 78, '📱 받은 메시지', { size: 12, weight: 700, cls: 'muted' });
        const MSG = [
          [['[택배] 주소 불일치로 배송 보류', '확인: short.example/a8Kz'], 'amber', 140],
          [['[bank.example] 계정이 잠겼어요', '24시간 안에 확인 안 하면 정지'], 'red', 230],
          [['축하합니다! 경품 당첨', '오늘 자정까지 링크에서 수령'], 'green', 320],
        ];
        const EMO = [['⏰ 급함', '“지금 안 하면 늦어요”'], ['😨 두려움', '“잠긴다 · 정지된다”'], ['🎁 이득', '“공짜 · 당첨 · 환급”']];
        for (let i = 0; i < MSG.length; i++) {
          const [lines, c, y] = MSG[i];
          const g = bubble(a, 56, y, 272, lines, c);
          await appear(a, g, 300);
          await a.wait(250);
        }
        a.caption('세 문자 모두 "지금 당장"을 요구해요');
        for (let i = 0; i < MSG.length; i++) {
          const [, c, y] = MSG[i];
          a.edge([336, y], [418, y], { color: c, id: 'e' + i, hidden: true });
          await a.show('e' + i, 200);
          const p = chip(a, EMO[i][0], 478, y, c, { w: 112, h: 32, size: 13.5, hidden: true });
          await appear(a, p.g, 220);
          const t = a.text(546, y, EMO[i][1], { size: 12, anchor: 'start', weight: 700, cls: 'muted', hidden: true });
          await appear(a, t, 200);
          await a.wait(200);
        }
        a.note('n0', 548, 376, '생각할 틈을 주지 않는 것이\n피싱의 첫 번째 기술', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '가짜 링크 — 주소는 끝에서부터 읽기',
      easy: '링크 주소는 앞부분이 아니라 끝부분(도메인)이 주인을 알려 줘요. "bank.example"이 앞에 들어 있어도 끝이 "bad.example"이면 bad.example의 주소예요. 글자 하나만 슬쩍 바꾼 주소, 어디로 가는지 숨긴 짧은 주소도 조심해야 해요.',
      deep: 'URL의 호스트 부분은 오른쪽에서 왼쪽으로 읽으며, 등록 가능한 도메인(eTLD+1)이 실제 소유자를 결정합니다. 공격자는 서브도메인에 진짜 이름을 넣거나(bank.example.bad.example), 하이픈으로 붙이거나, 비슷한 글자(rn↔m, l↔1, 다른 문자 체계의 닮은 글자)로 바꿔치기한 도메인을 씁니다. 단축 URL·QR은 목적지를 가리므로 미리보기 기능으로 확인하고, 주소창의 자물쇠(HTTPS)는 "암호화된 연결"일 뿐 "믿을 만한 사이트"라는 뜻이 아님에 주의합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 36, '이 링크들의 진짜 주인은 누구일까?', { size: 13.5, weight: 800 });
        a.text(360, 64, '주인은 https:// 다음, 첫 “/” 바로 앞의 맨 오른쪽 부분이에요', { size: 12, weight: 700, cls: 'muted' });
        const ROWS = [
          [[['https://'], ['bank.example', 'green'], ['/login']], '진짜 ✓ 주인: bank.example', 'green'],
          [[['https://bank-example.'], ['co.example', 'red'], ['/login']], '가짜 ✕ 주인: co.example', 'red'],
          [[['https://bank.example.'], ['bad.example', 'red'], ['/login']], '가짜 ✕ 주인: bad.example', 'red'],
          [[['https://ba'], ['m', 'red'], ['k.example/login']], '가짜 ✕ n → m 한 글자 바뀜', 'red'],
          [[['https://'], ['short.example', 'amber'], ['/a8Kz']], '단축 주소: 목적지가 숨겨짐', 'amber'],
        ];
        for (let i = 0; i < ROWS.length; i++) {
          const [segs, verdict, c] = ROWS[i];
          const y = 112 + i * 50;
          const u = url(a, 40, y, segs);
          u.t.style.opacity = 0;
          await appear(a, u.t, 220);
          await a.wait(250);
          u.mark();
          const v = a.text(404, y, verdict, { size: 12.5, anchor: 'start', weight: 800, color: c, hidden: true });
          await appear(a, v, 220);
          await a.wait(250);
        }
        a.note('n1', 360, 386, '앞에 그럴듯한 이름이 있어도, 주인은 끝부분이에요\n자물쇠(HTTPS)는 “암호화됨”이지 “믿을 만함”이 아니에요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '가짜 로그인 화면 — 입력하는 순간 넘어감',
      easy: '링크를 누르면 진짜와 똑같이 생긴 로그인 화면이 나와요. 여기에 아이디와 비밀번호를 넣는 순간 공격자에게 그대로 전달되고, 공격자는 그걸로 진짜 사이트에 내 이름으로 로그인해요. 나는 "오류가 났나?" 하고 넘어가기 쉬워요.',
      deep: '가짜 페이지는 진짜 사이트의 HTML·이미지를 복제해 몇 분 만에 만들 수 있고, 무료 인증서로 HTTPS 자물쇠도 붙습니다. 입력값을 받은 뒤 "일시적 오류" 메시지를 띄우거나 진짜 사이트로 넘겨 의심을 줄이고, 훔친 계정은 바로 쓰이거나 다른 서비스에 대입하는 크리덴셜 스터핑에 재활용됩니다. 그래서 같은 비밀번호를 여러 곳에 쓰면 피해가 번집니다.',
      async run(a) {
        wipe(a);
        a.node('u', 82, 210, { label: '나', icon: '🙂', color: 'blue', w: 104, h: 68 });
        // 가짜 로그인 화면(브라우저 모양)
        const fx = 210, fy = 128, fw = 196, fh = 168;
        a.raw('rect', { x: fx, y: fy, width: fw, height: fh, rx: 12, style: tint('red', 10) }, 'node');
        a.raw('rect', { x: fx + 10, y: fy + 10, width: fw - 20, height: 24, rx: 6, style: 'fill:var(--panel2);stroke:var(--line2)' }, 'node');
        a.text(fx + fw / 2, fy + 22, 'bank-example.co.example', { size: 11, mono: true, weight: 700, color: 'red' });
        a.text(fx + fw / 2, fy + 52, '🏦 bank 로그인', { size: 13, weight: 800 });
        for (const [k, yy] of [['ID', 78], ['PW', 108]]) {
          a.raw('rect', { x: fx + 44, y: fy + yy - 11, width: 136, height: 22, rx: 5, style: 'fill:var(--panel);stroke:var(--line2)' }, 'node');
          a.text(fx + 22, fy + yy, k, { size: 11.5, weight: 700, cls: 'muted' });
        }
        a.raw('rect', { x: fx + 58, y: fy + 128, width: 80, height: 26, rx: 13, style: 'fill:color-mix(in srgb, var(--blue) 30%, var(--panel))' }, 'node');
        a.text(fx + 98, fy + 141, '로그인', { size: 12, weight: 800 });
        a.text(fx + fw / 2, fy + fh + 18, '진짜와 똑같이 꾸민 가짜 화면', { size: 11.5, weight: 700, color: 'red' });
        a.node('atk', 590, 92, { label: '공격자', icon: '🕵️', color: 'red', w: 120, h: 68 });
        a.node('bank', 590, 320, { label: '진짜 은행', sub: 'bank.example', color: 'green', w: 150, h: 62 });
        a.edge([fx + fw + 4, fy + 40], 'atk', { color: 'red', dashed: true, id: 'ea', hidden: true });
        a.edge('atk', 'bank', { color: 'red', dashed: true, id: 'eb', hidden: true });
        await a.wait(300);
        a.caption('가짜 화면에 아이디와 비밀번호를 입력하면…');
        await a.send([136, 210], [fx - 4, 210], 'ID·비번', { color: 'blue', dur: 700 });
        const id1 = a.text(fx + 54, fy + 78, 'minji', { size: 12, mono: true, anchor: 'start', weight: 700 });
        const pw1 = a.text(fx + 54, fy + 108, '••••••••', { size: 12, mono: true, anchor: 'start', weight: 700 });
        await a.wait(300);
        await a.show('ea', 250);
        await a.send([fx + fw + 4, fy + 40], [528, 104], 'ID·비번', { color: 'red', dur: 800 });
        await a.flash('atk');
        a.badge('atk', '비번 손에 넣음', 'red');
        await a.wait(300);
        await a.show('eb', 250);
        await a.send([590, 128], [590, 287], '내 이름으로 로그인', { color: 'red', dur: 800 });
        a.hl('bank', true, 'red');
        a.text(590, 366, '진짜 사이트는 구별 못 해요', { size: 12, weight: 700, color: 'red' });
        await a.wait(300);
        id1.remove(); pw1.remove();
        a.text(fx + fw / 2, fy + fh + 40, '“일시적 오류, 다시 시도하세요”', { size: 12, weight: 700, cls: 'muted' });
        a.note('n2', 300, 404, '나는 오류인 줄 알지만, 공격자는 이미 내 계정 안에 있어요', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '중간 전달형 — 인증 코드도 실시간으로',
      easy: '"문자로 받은 인증 코드까지 있으니 안전하겠지?" 하지만 가짜 사이트가 내가 넣은 코드를 받자마자 진짜 사이트에 그대로 넣으면 통과돼요. 코드는 30초쯤 유효하니 시간은 충분해요. 결국 로그인된 상태를 통째로 빼앗겨요.',
      deep: '중간자형(AitM) 피싱 키트는 리버스 프록시처럼 동작해 사용자와 진짜 사이트 사이의 요청·응답을 실시간으로 중계합니다. 비밀번호와 SMS·TOTP 코드, 푸시 승인까지 그대로 통과시킨 뒤, 진짜 사이트가 발급한 세션 쿠키를 가로채 이후에는 인증 없이 그 세션을 씁니다. 사람이 옮겨 적는 코드는 "어느 사이트에 넣는지"를 확인하지 못하므로 피싱에 약하고, 이를 막으려면 도메인을 확인하는 패스키·보안 키 같은 피싱 저항형 인증이 필요합니다.',
      async run(a) {
        wipe(a);
        a.node('u', 82, 230, { label: '나', icon: '🙂', color: 'blue', w: 104, h: 66 });
        a.node('fake', 360, 230, { label: '가짜 사이트', sub: '중간에서 전달', color: 'red', w: 150, h: 66 });
        a.node('bank', 638, 230, { label: '진짜 은행', sub: 'bank.example', color: 'green', w: 136, h: 66 });
        a.node('atk', 360, 84, { label: '공격자', icon: '🕵️', color: 'red', w: 120, h: 64 });
        a.edge('fake', 'atk', { dashed: true, color: 'red', arrow: false });
        a.raw('path', { d: 'M638 266 V346 H82 V266', class: 'edge dashed', 'marker-end': 'url(#ah)' }, 'edge');
        a.text(360, 334, '📱 휴대폰 문자', { size: 11.5, weight: 700, cls: 'muted' });
        const L1 = 214, L2 = 246;
        a.caption('① 비밀번호를 그대로 전달');
        await a.send([136, L1], [282, L1], '비번', { color: 'blue', dur: 450 });
        await a.send([438, L1], [568, L1], '비번', { color: 'red', dur: 450 });
        a.caption('② 진짜 은행이 내 폰으로 인증 코드를 보냄');
        await a.send([638, 268], [82, 268], '코드 482913', { color: 'amber', dur: 1050, via: [[638, 346], [82, 346]] });
        a.caption('③ 코드도 받자마자 그대로 전달');
        await a.send([136, L2], [282, L2], '482913', { color: 'amber', dur: 450 });
        await a.send([438, L2], [568, L2], '482913', { color: 'red', dur: 450 });
        a.text(638, 178, '코드 확인 ✓', { size: 12, weight: 800, color: 'green' });
        await a.wait(200);
        a.caption('④ 로그인 쿠키(출입증)를 가로챔');
        const ck = await a.send([568, 230], [438, 230], '로그인 쿠키', { color: 'teal', dur: 550, keep: true });
        await a.move(ck, [360, 140], 450);
        await a.fadeOut(ck, 200);
        await a.flash('atk');
        a.badge('atk', '로그인 상태 탈취', 'red');
        a.note('n3', 360, 398, '문자·OTP 코드는 “어느 사이트에 넣는지”를 확인 못 해요\n그래서 그 자리에서 넘겨주면 그대로 쓰여요', { color: 'red' });
        await a.wait(600);
      },
    },
    {
      t: '여러 얼굴 — 문자, 전화, 맞춤 메일, QR',
      easy: '피싱은 메일만이 아니에요. 문자(스미싱), 전화(보이스피싱), 나만을 노린 맞춤 메일(스피어피싱), 가짜 QR 코드나 결제 화면까지 모양이 다양해요. 그래도 "급하게 만들고, 다른 곳으로 이끌어, 정보나 돈을 받아 간다"는 공식은 같아요.',
      deep: '스미싱은 링크나 앱 설치 파일을 보내 기기를 원격 조종하거나 정보를 빼내고, 보이스피싱은 기관·가족을 사칭해 이체나 앱 설치를 유도하며 요즘은 합성 음성이 쓰이기도 합니다. 스피어피싱은 SNS·회사 공개 정보로 상대를 조사해 거래처·상사인 척하고, 송금 계좌 변경을 요청하는 기업 메일 사기(BEC)로 이어지기도 합니다. 큐싱(QR 피싱)은 주차·결제용 QR 위에 가짜 스티커를 붙이는 식이어서, QR을 찍은 뒤 열리는 주소를 확인해야 합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 36, '모양은 달라도 같은 수법', { size: 13.5, weight: 800 });
        const CARD = [
          ['sm', 190, 110, '스미싱', '문자 속 링크 · 앱 설치', '💬', 'amber', '“엄마, 폰 고장 나서 이 번호로 연락해”'],
          ['vp', 530, 110, '보이스피싱', '기관 · 가족 사칭 전화', '📞', 'red', '“검찰입니다. 계좌가 범죄에 연루됐어요”'],
          ['sp', 190, 250, '스피어피싱', '나만 노린 맞춤 메일', '🎯', 'violet', '“팀장님, 요청하신 견적서 보내드려요”'],
          ['qr', 530, 250, 'QR · 결제 피싱', '가짜 QR · 결제 화면', '🔳', 'teal', '주차장 QR 위에 덧붙인 가짜 스티커'],
        ];
        for (const [id, x, y, l, s, ic, c, ex] of CARD) {
          a.node(id, x, y, { label: l, sub: s, icon: ic, color: c, w: 300, h: 76, hidden: true });
          await a.show(id, 300);
          const t = a.text(x, y + 56, ex, { size: 12, weight: 700, cls: 'muted', hidden: true });
          await appear(a, t, 220);
          await a.wait(300);
        }
        a.note('n4', 360, 382, '공식은 하나: 급하게 만들고 → 다른 곳으로 이끌어 → 정보·돈을 받아 감', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ① 나 — 직접 접속, 관리자, 패스키',
      easy: '링크를 누르지 말고 평소 쓰던 앱이나 즐겨찾기로 직접 들어가 확인하세요. 비밀번호 관리자는 주소가 조금만 달라도 자동 입력을 안 해 주니, 자동 입력이 안 뜨면 그 자체가 경고예요. 패스키는 진짜 사이트 주소에만 반응해서 가짜 사이트에는 아예 로그인이 안 돼요.',
      deep: '비밀번호 관리자는 저장한 도메인과 현재 도메인이 일치할 때만 채워 주므로 비슷한 주소를 사람보다 정확히 걸러 냅니다. WebAuthn/FIDO2 패스키는 등록할 때 사이트의 RP ID(도메인)에 키를 묶고, 브라우저가 실제 접속한 출처를 서명에 포함하므로 가짜 도메인에서는 쓸 수 있는 서명이 나오지 않습니다. 피싱 저항성은 대략 SMS 코드 < 인증 앱(TOTP)·푸시 < 패스키·보안 키 순이며, 문자·OTP·푸시는 사람이 넘겨줄 수 있어 중간 전달형에 뚫릴 수 있습니다.',
      async run(a) {
        wipe(a);
        a.text(32, 50, '내가 지키는 법', { size: 13.5, anchor: 'start', weight: 800 });
        const CK = [
          '링크 대신 앱 · 즐겨찾기로 직접 접속',
          '주소는 끝부분(도메인)부터 확인',
          '급하다고 재촉할수록 한 번 더 의심',
          '비번 관리자: 가짜 주소엔 자동 입력 X',
          '패스키(FIDO2): 진짜 도메인에만 응답',
        ];
        for (let i = 0; i < CK.length; i++) await item(a, 42, 92 + i * 40, '✓', CK[i], 'green');
        a.zone('pz', 392, 40, 308, 266, { label: '패스키는 주소를 확인해요', color: 'violet' });
        a.node('key', 546, 108, { label: '패스키', icon: '🔑', color: 'violet', w: 116, h: 62 });
        a.node('real', 470, 236, { label: '진짜 은행', sub: 'bank.example', color: 'green', w: 132, h: 60 });
        a.node('fk', 622, 236, { label: '가짜 주소', sub: 'co.example', color: 'red', w: 132, h: 60 });
        a.edge('key', 'real', { color: 'green' });
        a.edge('key', 'fk', { color: 'red', dashed: true });
        await a.wait(200);
        a.caption('진짜 도메인에서는 서명해 주고…');
        await a.send([520, 141], [482, 204], '서명 ✓', { color: 'green', dur: 600 });
        a.badge('real', '로그인', 'green');
        await a.wait(250);
        a.caption('가짜 도메인에는 아예 응답하지 않아요');
        const p = chip(a, '?', 572, 141, 'red', { w: 30 });
        await a.move(p, [592, 172], 500);
        await a.fadeOut(p, 250);
        a.badge('fk', '무응답', 'red');
        await a.wait(250);
        a.note('n5', 360, 352, '자동 입력이 안 뜬다면 → 주소부터 의심!\n문자·OTP 코드는 넘겨줄 수 있지만, 패스키는 넘겨줄 수 없어요', { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ② 조직 — 메일 인증, 신고, 그리고 당했을 때',
      easy: '회사나 기관은 "이 메일이 진짜 우리 서버에서 왔는지" 확인하는 메일 인증을 켜서 사칭 메일을 걸러요. 이상한 메일을 쉽게 신고하는 버튼과 정기 교육도 중요해요. 만약 속았다면 부끄러워하지 말고 바로 비밀번호를 바꾸고, 금융사와 118에 연락하세요.',
      deep: 'SPF는 도메인이 허용한 발송 서버 목록, DKIM은 메일 헤더·본문에 대한 도메인의 전자서명, DMARC는 둘의 결과가 보이는 발신자(From) 도메인과 맞는지 확인해 실패 시 none·quarantine·reject 중 정책을 적용하고 보고서를 받게 합니다. 다만 비슷한 다른 도메인(bank-example.co.example)은 그 도메인 주인이 인증을 제대로 해 두면 통과하므로, 신고 버튼·훈련·외부 메일 표시를 함께 씁니다. 당했다면 비밀번호 변경(재사용한 곳 포함), 모든 세션 로그아웃·MFA 재등록, 금융사 지급정지 요청, 118(KISA 상담)·112 신고를 최대한 빨리 하고, 조직은 해당 계정의 로그인 기록과 메일 규칙 변경을 점검합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 30, '조직이 지키는 법 — 메일 인증 + 신고 + 교육', { size: 13.5, weight: 800 });
        a.node('rs', 92, 86, { label: '진짜 서버', sub: 'bank.example', color: 'green', w: 132, h: 54 });
        a.node('bs', 92, 168, { label: '가짜 서버', sub: 'bad.example', color: 'red', w: 132, h: 54 });
        a.text(92, 124, 'From: bank.example', { size: 11, mono: true, weight: 700, cls: 'muted' });
        a.text(92, 206, 'From: bank.example', { size: 11, mono: true, weight: 700, color: 'red' });
        a.node('chk', 360, 127, { label: '받는 서버', sub: 'SPF · DKIM · DMARC', icon: '🛡️', color: 'violet', w: 176, h: 76 });
        a.node('inb', 612, 86, { label: '받은편지함', color: 'green', w: 132, h: 50 });
        a.node('qr', 612, 168, { label: '차단 · 격리', color: 'red', w: 132, h: 50 });
        a.edge('rs', 'chk', {}); a.edge('bs', 'chk', {});
        a.edge('chk', 'inb', { color: 'green' }); a.edge('chk', 'qr', { color: 'red' });
        await a.send([160, 94], [270, 112], '메일', { color: 'teal', dur: 450 });
        await a.flash('chk');
        await a.send([450, 112], [544, 88], '서명 일치 ✓', { color: 'green', dur: 450 });
        await a.send([160, 160], [270, 142], '사칭 메일', { color: 'red', dur: 450 });
        await a.flash('chk');
        await a.send([450, 142], [544, 166], '불일치 ✕', { color: 'red', dur: 450 });
        a.text(360, 232, '+ “피싱 신고” 버튼과 정기 훈련 — 한 사람의 신고가 모두를 지켜요', { size: 12, weight: 700, cls: 'muted' });
        a.zone('rz', 28, 254, 664, 146, { label: '속았다면 바로 — 몇 분 차이로 피해가 달라져요', color: 'amber' });
        const DO = [
          [48, 292, '①', '비밀번호 변경 (같은 비번 쓴 곳까지)'],
          [376, 292, '②', '모든 기기 로그아웃 · 세션 끊기'],
          [48, 328, '③', '카드사 · 은행에 연락해 결제·이체 정지'],
          [376, 328, '④', '118(KISA) 상담 · 112 경찰 신고'],
          [48, 364, '⑤', '회사 계정이라면 보안 담당자에게 바로 알리기'],
        ];
        for (const [x, y, m, s] of DO) await item(a, x, y, m, s, 'amber', { size: 12.5, msize: 14, gap: 120 });
        a.text(360, 418, '※ 허락받지 않은 시스템에 이런 기법을 시험하는 것은 불법이에요', { size: 11.5, weight: 700, cls: 'muted' });
        await a.wait(600);
      },
    },
  ],
};

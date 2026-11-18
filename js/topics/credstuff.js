// 계정 탈취: 유출 목록 → 크리덴셜 스터핑 → 무차별 대입·스프레이 → 뚫린 뒤(이메일 연쇄)
// → 막는 법(사용자) → 막는 법(서비스, 잠금의 trade-off) → 체크리스트
// 이메일·비밀번호·도메인은 모두 지어낸 예시(.example)다. 단계마다 무대를 새로 그린다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, hidden: o.hidden, id: o.id });
}
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
const vis = (x) => x.g || x;

const FILL = {
  base: 'var(--panel2)',
  head: 'color-mix(in srgb, var(--red) 20%, var(--panel2))',
};
const RH = 30;
/** 작은 표. cols = [[제목, 너비, mono?], ...] */
function table(a, x, y, cols, rows) {
  const W = cols.reduce((s, c) => s + c[1], 0);
  const mk = (yy, cells, head) => {
    const g = a.raw('g', {}, 'node');
    a.raw('rect', { x, y: yy - RH / 2, width: W, height: RH, rx: head ? 5 : 0, style: `fill:${head ? FILL.head : FILL.base};stroke:var(--line2);stroke-width:1` }, g);
    let cx = x;
    cells.forEach((s, k) => {
      a.text(cx + 10, yy, s, { size: head ? 11.5 : 12.5, anchor: 'start', par: g, weight: head ? 800 : 600, mono: !head && cols[k][2] });
      cx += cols[k][1];
    });
    if (!head) g.style.opacity = 0;
    return g;
  };
  mk(y, cols.map((c) => c[0]), true);
  return rows.map((cells, i) => mk(y + RH * (i + 1), cells, false));
}

// 2단계: 사이트 3곳 × 사용자 4명. true = 유출된 비번을 그 사이트에도 재사용
const SITES = [['은행', 'bank.example'], ['메일', 'mail.example'], ['게임', 'game.example']];
const SX = [340, 480, 620];
const PEOPLE = [['민지', [true, true, false]], ['서준', [false, false, true]], ['하은', [false, false, false]], ['도윤', [false, false, false]]];

export default {
  id: 'credstuff',
  level: 2,
  cat: '보안',
  title: '계정 탈취 — 남의 비밀번호로 문 두드리기',
  sub: '한 사이트에서 새어 나간 아이디·비밀번호가 다른 사이트의 문까지 여는 과정과, 그걸 막는 방법',
  analogy: '집·사무실·자동차를 모두 같은 열쇠 하나로 쓴다고 생각해 보세요. 그 열쇠를 한 곳에서 잃어버리면, 주운 사람은 주소만 알면 다른 문에도 하나씩 꽂아 볼 수 있습니다. 문마다 다른 열쇠를 쓰고, 열쇠 말고 지문까지 확인하는 문이라면 잃어버린 열쇠 하나로는 들어갈 수 없습니다.',
  keys: [
    '사이트가 해킹되면 아이디·비밀번호 목록이 새어 나가고, 이런 목록은 모이고 거래된다.',
    '크리덴셜 스터핑은 그 목록을 봇으로 다른 사이트에 자동 대입하는 공격이라, 비밀번호를 재사용한 계정만 뚫린다. 비번이 약하지 않아도 재사용이면 뚫린다.',
    '무차별 대입은 한 계정에 많은 비번을, 비밀번호 스프레이는 흔한 비번 몇 개를 많은 계정에 넣어 본다. 스프레이는 계정마다 실패가 적어 단순 잠금을 피한다.',
    '사용자는 사이트마다 다른 비번(비밀번호 관리자)과 2단계 인증(SMS보다 인증 앱, 그보다 패스키)으로 막는다. 이메일 계정이 다른 계정의 열쇠이니 가장 단단히 지킨다.',
    '서비스는 시도 제한·점점 길어지는 대기, 봇 탐지, 유출 비번 차단, 새 기기 알림, 다단계 인증을 겹쳐 쓴다. 계정 잠금은 정상 사용자까지 잠글 수 있는 trade-off가 있다.',
  ],
  terms: [
    ['크리덴셜 스터핑', '유출된 아이디·비밀번호 쌍을 다른 서비스 로그인에 자동으로 대입해 보는 공격'],
    ['무차별 대입', '한 계정에 가능한 비밀번호를 하나씩 계속 넣어 보는 공격(brute force)'],
    ['비밀번호 스프레이', '흔한 비밀번호 몇 개를 아주 많은 계정에 한두 번씩만 넣어 보는 공격'],
    ['계정 탈취(ATO)', 'Account Takeover. 남의 계정에 로그인해 그 사람인 척 쓰는 것'],
    ['2단계 인증(MFA)', '비밀번호(아는 것)에 휴대폰·보안 키(가진 것)나 생체 정보를 더해 확인하는 방식'],
    ['패스키', 'FIDO2/WebAuthn 기반 로그인. 기기 안의 개인 키로 서명하고, 서명이 사이트 도메인에 묶여 피싱에 강하다'],
    ['비밀번호 관리자', '사이트마다 길고 다른 비밀번호를 만들어 암호화해 보관하고 자동으로 채워 주는 프로그램'],
  ],
  quiz: [
    { q: '크리덴셜 스터핑으로 뚫리는 계정은 주로 어떤 계정일까요?', c: ['비밀번호가 짧은 모든 계정', '다른 사이트와 같은 비밀번호를 쓰는 계정', '2단계 인증을 켜 둔 계정', '최근에 가입한 계정'], a: 1, why: '봇은 다른 곳에서 유출된 아이디·비밀번호 쌍을 그대로 넣어 봅니다. 그 쌍이 이 사이트에서도 똑같은, 즉 비밀번호를 재사용한 계정만 열립니다. 비번이 길고 복잡해도 재사용이면 뚫립니다.', step: 1 },
    { q: '비밀번호 스프레이가 "5번 틀리면 계정 잠금"에 잘 걸리지 않는 이유는?', c: ['계정마다 한두 번만 시도해서 잠금 한도에 닿지 않기 때문에', '잠금 기능을 원격으로 꺼 버리기 때문에', '비밀번호 대신 해시를 보내기 때문에', '로그인 화면을 거치지 않고 DB에 바로 들어가기 때문에'], a: 0, why: '스프레이는 흔한 비번 하나를 수많은 계정에 한 번씩만 넣어 봅니다. 계정 하나만 보면 실패가 1~2번이라 계정별 잠금은 반응하지 않습니다. 그래서 서비스 전체의 실패율·IP 같은 넓은 신호를 함께 봐야 합니다.', step: 2 },
    { q: '가짜 로그인 페이지(피싱)에 속아 로그인하더라도 계정을 지켜 줄 가능성이 가장 큰 2단계 인증은?', c: ['문자(SMS)로 받는 인증 코드', '인증 앱의 6자리 코드(OTP)', '이메일로 받는 인증 코드', '패스키(FIDO2/WebAuthn)'], a: 3, why: '코드 방식은 사람이 가짜 사이트에 코드를 직접 입력하면 공격자가 그 코드를 곧바로 진짜 사이트에 넣을 수 있습니다. 패스키는 서명이 실제 사이트 도메인에 묶여 있어 가짜 도메인에서는 쓸 수 없어서, 피싱에 강한 방식으로 권장됩니다.', step: 4 },
  ],
  setup(a) {
    a.text(360, 40, '어딘가에서 새어 나간 아이디·비밀번호 목록', { size: 13.5, weight: 800 });
  },
  steps: [
    {
      t: '어딘가에서 새어 나간 목록',
      easy: '어느 작은 쇼핑몰이 해킹당해 회원들의 이메일과 비밀번호가 통째로 새어 나갔다고 해 봐요. 이런 목록은 인터넷 뒷골목에서 모이고 사고팔립니다. 문제는 이 목록이 그 쇼핑몰 하나로 끝나지 않는다는 거예요.',
      deep: '목록은 평문으로 저장했거나 약한 해시를 풀어낸 DB 유출, 피싱, 기기에 심긴 정보 탈취 악성코드 등에서 나옵니다. 여러 유출을 합쳐 중복을 없앤 "콤보 리스트"는 아주 큰 규모로 돌아다닙니다. 이 쌍들은 그 자체보다 다른 서비스에 넣어 보는 재료로 더 가치가 있습니다.',
      async run(a) {
        wipe(a);
        a.text(360, 40, '어딘가에서 새어 나간 아이디·비밀번호 목록', { size: 13.5, weight: 800 });
        a.node('shop', 124, 140, { label: '작은 쇼핑몰', sub: 'shop.example', icon: '🛒', color: 'gray', w: 152, h: 78 });
        const rows = table(a, 300, 96, [['이메일', 196], ['비밀번호', 132, true]],
          [['minji@mail.example', 'sunny2024!'], ['seojun@mail.example', 'qwerty123'], ['haeun@mail.example', 'hello1234'], ['doyun@mail.example', 'Tr8#kq2!x']]);
        await a.wait(300);
        a.caption('쇼핑몰 DB가 해킹당하면…');
        a.badge('shop', '유출', 'red');
        await a.flash('shop');
        await a.send([206, 140], [296, 140], '복사', { color: 'red', dur: 600 });
        for (const r of rows) { await appear(a, r, 200); await a.wait(90); }
        a.node('hk', 124, 318, { label: '공격자', icon: '🕵️', color: 'red', w: 130, h: 70 });
        a.edge([300, 236], 'hk', { color: 'red', dashed: true });
        await a.send([300, 236], 'hk', '목록 입수', { color: 'red', dur: 700 });
        await a.flash('hk');
        a.note('n0', 470, 300, '여러 유출 목록이 합쳐져 사고팔려요\n이 목록으로 무엇을 할까요?', { color: 'red' });
        a.text(470, 368, '목록 자체는 쇼핑몰 계정뿐이지만,', { size: 12, cls: 'muted', weight: 700 });
        a.text(470, 388, '같은 비번을 다른 곳에도 썼다면 이야기가 달라져요', { size: 12, cls: 'muted', weight: 700 });
        await a.wait(700);
      },
    },
    {
      t: '크리덴셜 스터핑 — 목록을 다른 문에 대입',
      easy: '공격자는 이 목록을 프로그램(봇)에 넣고 은행·메일·게임 같은 다른 사이트에 자동으로 하나씩 로그인해 봐요. 다른 비번을 쓴 사람은 실패하지만, 같은 비번을 재사용한 사람의 계정은 그대로 열립니다.',
      deep: '봇은 사람처럼 로그인 요청을 보내므로 각 시도는 정상 로그인과 겉보기에 같습니다. 쌍 하나당 성공 확률은 낮지만 목록이 매우 길어 성공 계정 수가 적지 않고, 비밀번호 강도와 무관하게 "재사용 여부"가 성패를 가릅니다. 성공한 계정은 바로 쓰이거나 따로 모아 다시 팔립니다.',
      async run(a) {
        wipe(a);
        a.node('bot', 92, 232, { label: '봇', sub: '목록 자동 대입', icon: '🤖', color: 'red', w: 124, h: 80 });
        SITES.forEach(([l, d], j) => a.node('s' + j, SX[j], 66, { label: l, sub: d, color: 'blue', w: 128, h: 54 }));
        PEOPLE.forEach(([n], i) => a.text(232, 132 + i * 54, n, { size: 13.5, weight: 800, anchor: 'end' }));
        a.text(196, 104, '유출 목록', { size: 11.5, cls: 'muted', weight: 700 });
        await a.wait(250);
        let broke = 0;
        for (let i = 0; i < PEOPLE.length; i++) {
          const [n, reuse] = PEOPLE[i];
          const y = 132 + i * 54;
          a.caption(`${n}의 유출 비번을 세 사이트에 넣어 보는 중`);
          const ps = SX.map((x) => chip(a, '대입', 156, 232, 'gray', { w: 104, h: 30 }));
          await a.par(...ps.map((p, j) => a.move(p, [SX[j], y], 650)));
          ps.forEach((p, j) => p.set(reuse[j] ? '✓ 뚫림' : '✕ 실패', reuse[j] ? 'red' : 'gray'));
          reuse.forEach((r, j) => { if (r) { broke++; a.hl('s' + j, true, 'red'); } });
          await a.wait(330);
        }
        a.note('n1', 400, 368, `재사용한 칸만 뚫렸어요 (${broke}곳)\n비번이 강해도 재사용이면 소용없어요`, { color: 'red' });
        a.text(400, 418, '하은·도윤처럼 사이트마다 다른 비번이면 목록이 쓸모없어요', { size: 12, cls: 'muted', weight: 700 });
        await a.wait(700);
      },
    },
    {
      t: '무차별 대입과 비밀번호 스프레이',
      easy: '목록이 없어도 비밀번호를 짐작해서 넣어 볼 수 있어요. 한 계정에 수없이 넣어 보면(무차별 대입) 금방 잠금에 걸리지만, 흔한 비번 하나를 수많은 계정에 한 번씩만 넣어 보면(스프레이) 각 계정은 실패가 한 번뿐이라 잘 티가 나지 않아요.',
      deep: '무차별 대입은 계정별 실패 횟수 제한에 쉽게 걸리지만, 스프레이는 계정당 시도를 잠금 한도보다 적게 유지해 이를 피하고, 흔한 비번을 쓰는 소수 계정을 노립니다. 그래서 계정별 카운터만이 아니라 IP·네트워크 단위, 서비스 전체의 실패율 급증 같은 넓은 신호를 함께 봐야 합니다. 흔한 비번 자체를 가입 때 막는 것도 효과적입니다.',
      async run(a) {
        wipe(a);
        a.zone('zl', 24, 52, 330, 300, { label: '무차별 대입 — 한 계정에 많은 비번', color: 'amber' });
        a.zone('zr', 366, 52, 330, 300, { label: '스프레이 — 흔한 비번 하나를 많은 계정에', color: 'red' });
        a.node('acc', 189, 116, { label: '민지 계정', icon: '🔐', color: 'blue', w: 132, h: 66 });
        const cnt = a.text(189, 174, '실패 0번', { size: 12.5, weight: 800, color: 'amber' });
        a.node('hkl', 189, 300, { label: '공격자', icon: '🕵️', color: 'red', w: 110, h: 52 });
        const NAMES = ['지우', '시우', '서연', '하준', '수아', '지호', '예린', '은우'];
        NAMES.forEach((n, i) => a.node('t' + i, 426 + (i % 4) * 70, 106 + Math.floor(i / 4) * 68, { label: n, sub: '', color: 'blue', w: 58, h: 50, size: 13 }));
        a.node('hkr', 531, 300, { label: '공격자', icon: '🕵️', color: 'red', w: 110, h: 52 });
        const GUESS = ['aaaa11', '123456', 'qwerty', 'iloveyou', 'abc123', 'dragon'];
        a.caption('왼쪽: 한 계정에 연달아 · 오른쪽: 계정마다 한 번씩');
        for (let k = 0; k < 6; k++) {
          const L = (async () => {
            const p = chip(a, GUESS[k], 189, 270, 'amber', { h: 26 });
            await a.move(p, [189, 196], 380);
            if (k < 5) {
              cnt.textContent = `실패 ${k + 1}번`;
              p.set('✕', 'gray');
              if (k === 4) { a.setNode('acc', { color: 'amber', sub: '잠김' }); a.badge('acc', '5회', 'amber'); }
            } else {
              p.set('잠김 — 거절', 'amber');
              await a.wait(250);
            }
            await a.fadeOut(p, 200);
          })();
          const R = [];
          for (const i of [k, k + 6].filter((x) => x < 8)) {
            R.push((async () => {
              const n = a.get('t' + i);
              const p = chip(a, '', 531, 270, 'red', { w: 16, h: 16 });
              await a.move(p, [n.x, n.y + 33], 380);
              const weak = i === 5;
              a.setNode('t' + i, { sub: weak ? '뚫림' : '1회', color: weak ? 'red' : 'blue' });
              await a.fadeOut(p, 160);
            })());
          }
          await a.par(L, ...R);
          await a.wait(80);
        }
        a.text(189, 236, '금방 잠금에 걸려요', { size: 12.5, weight: 800, color: 'amber' });
        a.text(531, 236, '계정마다 실패 1번 → 잠금 없이 1명 뚫림', { size: 12, weight: 800, color: 'red' });
        a.note('n2', 360, 396, '계정별 횟수만 세면 스프레이를 못 봐요 → IP·전체 실패율도 함께 감시', { color: 'violet' });
        await a.wait(700);
      },
    },
    {
      t: '뚫린 뒤 — 이메일이 다른 계정의 열쇠',
      easy: '계정이 뚫리면 쌓아 둔 포인트를 쓰거나, 저장된 카드로 결제하거나, 주소·전화번호를 가져갈 수 있어요. 특히 이메일 계정이 뚫리면 위험해요. 다른 사이트의 "비밀번호 찾기" 메일이 모두 거기로 오니까, 줄줄이 다른 계정까지 넘어갑니다.',
      deep: '탈취 계정은 포인트·기프트카드 현금화, 저장된 결제수단 악용, 개인정보 수집, 그 계정 이름으로 지인에게 보내는 사기 메시지에 쓰입니다. 이메일은 대부분 서비스의 비밀번호 재설정 경로이므로 이메일 하나를 잃으면 연결된 계정들을 재설정해 연쇄로 빼앗길 수 있습니다. 공격자가 복구 이메일·전화번호를 바꿔 주인이 되찾기 어렵게 만들기도 합니다.',
      async run(a) {
        wipe(a);
        a.text(24, 50, '① 뚫린 계정 안의 것', { size: 12.5, anchor: 'start', weight: 800 });
        a.node('shop', 124, 122, { label: '쇼핑몰 계정', sub: '탈취됨', icon: '🛒', color: 'red', w: 150, h: 72 });
        const LOOT = [['포인트·기프트카드', 84], ['저장된 카드로 결제', 122], ['주소·전화번호', 160]];
        for (const [l, y] of LOOT) {
          await a.send([202, 122], [360, y], l, { color: 'red', dur: 500, keep: true, h: 28 });
          await a.wait(80);
        }
        a.text(560, 122, '→ 현금화 · 사기 · 신상 수집', { size: 12.5, weight: 800, color: 'red' });
        await a.wait(300);
        a.text(24, 214, '② 이메일이 뚫리면 — 연쇄 탈취', { size: 12.5, anchor: 'start', weight: 800 });
        a.node('mail', 124, 318, { label: '이메일 계정', sub: '탈취됨', icon: '📧', color: 'red', w: 150, h: 72 });
        const SV = [['은행', 252], ['SNS', 318], ['클라우드', 384]];
        SV.forEach(([l, y], i) => { a.node('v' + i, 400, y, { label: l, color: 'blue', w: 128, h: 46, size: 14 }); a.edge('mail', 'v' + i, { dashed: true, arrow: false }); });
        a.caption('다른 사이트에서 "비밀번호 찾기"를 누르면…');
        for (let i = 0; i < SV.length; i++) {
          await a.send([334, SV[i][1]], [202, 318], '재설정 링크', { color: 'amber', dur: 520 });
          a.setNode('v' + i, { color: 'red', sub: '' });
          a.badge('v' + i, '넘어감', 'red');
          await a.wait(120);
        }
        a.note('n3', 594, 318, '메일을 쥔 사람이\n나머지 계정의 비번을\n바꿀 수 있어요', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ① 사용자 — 다른 비번과 2단계 인증',
      easy: '가장 확실한 건 사이트마다 다른 비밀번호예요. 다 외울 수 없으니 비밀번호 관리자가 대신 만들고 기억하게 하세요. 여기에 2단계 인증을 켜면 비번이 새도 한 겹 더 막아 줍니다. 문자(SMS)보다 인증 앱, 그보다 패스키가 더 튼튼해요.',
      deep: '재사용을 없애면 크리덴셜 스터핑은 원리적으로 실패합니다. 2단계 인증은 어떤 방식이든 없는 것보다 훨씬 낫지만, SMS는 유심 바꿔치기·피싱에 약하고 TOTP 코드도 가짜 사이트에 입력하면 실시간으로 중계될 수 있습니다. 패스키(FIDO2/WebAuthn)는 서명이 사이트 도메인(RP ID)에 묶여 피싱에 강합니다. 유출 확인 서비스(예: Have I Been Pwned)로 내 이메일이 포함된 유출을 확인하고, 해당 비번을 쓰던 곳을 모두 바꿉니다.',
      async run(a) {
        wipe(a);
        a.node('vault', 124, 116, { label: '비번 관리자', sub: '기억은 한 곳에', icon: '🗝️', color: 'green', w: 160, h: 74 });
        const PW = [['bank', 'h7#qLm2…'], ['mail', 'Vz9!eR4…'], ['game', 'p4@RwX8…']];
        for (let i = 0; i < PW.length; i++) {
          const y = 76 + i * 40;
          const p = await a.send([206, 116], [330, y], '', { color: 'green', dur: 420, keep: true, w: 16, h: 16 });
          a.remove(p);
          a.text(300, y, PW[i][0] + '.example', { size: 12.5, anchor: 'start', weight: 700 });
          a.text(440, y, PW[i][1], { size: 12.5, anchor: 'start', weight: 700, mono: true, color: 'green' });
        }
        a.text(610, 106, '사이트마다 전부 달라서', { size: 12.5, weight: 800, color: 'green' });
        a.text(610, 128, '하나가 새도 나머지는 안전', { size: 12, cls: 'muted', weight: 700 });
        await a.wait(300);
        a.text(24, 214, '2단계 인증 — 없는 것보단 무엇이든 낫고, 강도는 이렇게 달라요', { size: 12.5, anchor: 'start', weight: 800 });
        const MF = [['문자(SMS)', 0.34, 'amber', '유심 바꿔치기·피싱에 약함'], ['인증 앱(OTP)', 0.64, 'teal', '가짜 사이트에 코드를 넣으면 위험'], ['패스키', 1, 'green', '도메인에 묶여 피싱에도 강함']];
        const bars = MF.map(([l, , c, d], i) => {
          const y = 252 + i * 38;
          a.text(24, y, l, { size: 12.5, anchor: 'start', weight: 800 });
          a.text(400, y, d, { size: 12, anchor: 'start', weight: 700, color: c });
          return a.bar('mb' + i, 140, y, 240, { color: c });
        });
        await a.par(...bars.map((b, i) => b.set(MF[i][1], 700 + i * 200)));
        a.note('n4', 360, 386, '유출 확인 서비스로 내 이메일이 새었는지 확인 → 새었다면 그 비번 쓰던 곳 모두 변경', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ② 서비스 — 여러 겹으로, 잠금은 신중하게',
      easy: '서비스는 한 가지가 아니라 여러 겹으로 막아요. 너무 빠른 시도는 늦추고, 사람이 아닌 봇을 가려내고, 이미 유출된 비번은 못 쓰게 하고, 처음 보는 기기면 2단계 인증과 알림을 보내요. 다만 "5번 틀리면 잠금"은 봇이 남의 계정을 일부러 잠가 진짜 주인이 못 들어오게 만들 수도 있어요.',
      deep: 'OWASP는 다단계 인증을 가장 효과적인 방어로 꼽고, 기기·행동 신호 기반 봇 탐지, 유출 비밀번호 차단, 비정상 로그인 알림을 함께 권합니다. 공격자는 많은 IP로 시도를 나누기도 하므로 IP별 한도만으로는 부족합니다. NIST SP 800-63B는 유출·흔한 비번 목록과 대조해 거부하고 한 계정의 연속 실패를 100회 이하로 제한하라고 하며, 영구 잠금보다 점점 길어지는 대기나 추가 확인이 정상 사용자 피해가 적습니다. 유출 대조는 해시 앞 몇 글자만 보내는 k-익명성 방식으로 비번을 노출하지 않고 할 수 있습니다.',
      async run(a) {
        wipe(a);
        const Y = 128;
        a.node('bot', 62, Y, { label: '봇', icon: '🤖', color: 'red', w: 88, h: 62 });
        const F = [['시도 제한', '점점 긴 대기', 'teal'], ['봇 탐지', '기기·행동', 'violet'], ['유출 비번', '사용 막기', 'amber'], ['2단계', '새 기기면', 'green']];
        const FX = [184, 294, 404, 514];
        F.forEach(([l, sub, c], i) => a.node('f' + i, FX[i], Y, { label: l, sub, color: c, w: 98, h: 64, size: 13.5 }));
        a.node('acc', 650, Y, { label: '계정', icon: '🔐', color: 'blue', w: 86, h: 62 });
        a.text(360, 50, '봇 시도 10번이 겹겹의 방어를 지나가면', { size: 12.5, weight: 800 });
        // 각 시도가 몇 번째 겹에서 막히는지(0~3), 4 = 통과
        const STOP = [0, 1, 0, 2, 0, 1, 0, 3, 1, 0];
        const blocked = [0, 0, 0, 0];
        const runOne = async (k) => {
          await a.wait(k * 150);
          const p = chip(a, '', 106, Y, 'red', { w: 16, h: 16 });
          let x = 106;
          for (let i = 0; i < 4; i++) {
            await a.move(p, [FX[i] - 57, Y], Math.max(120, (FX[i] - 57 - x) * 2.2));
            if (STOP[k] === i) {
              blocked[i]++;
              a.badge('f' + i, `${blocked[i]}`, 'green');
              p.set(null, 'gray');
              await a.move(p, [FX[i] - 57, Y + 50 + (blocked[i] - 1) * 12], 240);
              await a.fadeOut(p, 200);
              return;
            }
            await a.move(p, [FX[i] + 57, Y], 0);
            x = FX[i] + 57;
          }
        };
        await a.par(...STOP.map((_, k) => runOne(k)));
        a.text(349, Y + 52, '초록 숫자 = 그 겹에서 막은 시도', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(650, Y + 50, '도착 0', { size: 12.5, weight: 800, color: 'green' });
        a.text(650, Y + 70, '새 기기 알림 📱', { size: 11.5, cls: 'muted', weight: 700 });
        await a.wait(250);
        a.zone('tz', 24, 236, 672, 178, { label: 'trade-off — 실패가 쌓이면 어떻게 할까?', color: 'gray' });
        a.text(190, 280, '5번 틀리면 계정 잠금', { size: 13, weight: 800, color: 'red' });
        a.text(530, 280, '실패할수록 점점 긴 대기', { size: 13, weight: 800, color: 'green' });
        const lk = chip(a, '🔒 30분 잠김', 190, 320, 'red', { h: 30 });
        const D = ['1초', '2초', '4초', '8초'].map((s, i) => chip(a, s, 446 + i * 56, 320, 'green', { w: 48, h: 28, hidden: true }));
        lk.g.style.opacity = 0;
        await appear(a, lk.g, 250);
        for (const d of D) { await appear(a, d.g, 180); }
        a.text(190, 362, '봇이 남의 계정을 일부러 잠글 수 있고', { size: 12, weight: 700 });
        a.text(190, 384, '진짜 주인도 못 들어와요', { size: 12, weight: 700, color: 'red' });
        a.text(530, 362, '사람은 거의 못 느끼고', { size: 12, weight: 700 });
        a.text(530, 384, '대량 대입은 크게 느려져요', { size: 12, weight: 700, color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '정리 — 체크리스트',
      easy: '사용자는 "다른 비번 + 2단계 인증", 서비스는 "여러 겹의 방어"가 핵심이에요. 그리고 꼭 기억할 것: 내 것이 아니거나 허락받지 않은 사이트에 이런 대입을 시험해 보는 것만으로도 불법이에요.',
      deep: '사용자 쪽에서는 재사용 제거와 피싱에 강한 인증(패스키)이, 서비스 쪽에서는 MFA·봇 탐지·유출 비번 차단·이상 로그인 알림의 조합이 효과가 큽니다. 로그인 실패율, 존재하지 않는 계정에 대한 시도 비율, 한 IP·기기에서 여러 계정 시도 같은 지표를 모니터링해 공격을 조기에 알아챕니다. 이런 테스트는 자기 시스템이나 서면으로 허락받은 범위에서만 해야 합니다.',
      async run(a) {
        wipe(a);
        a.zone('zu', 24, 44, 328, 318, { label: '사용자', color: 'blue' });
        a.zone('zs', 368, 44, 328, 318, { label: '서비스 운영자', color: 'teal' });
        const U = ['사이트마다 다른 비밀번호', '비밀번호 관리자로 만들고 보관', '2단계 인증: 패스키 > 앱 > 문자', '이메일 계정을 가장 단단히', '유출 알림 받으면 바로 변경', '낯선 로그인 알림은 바로 확인'];
        const S = ['시도 제한 · 점점 긴 대기', '봇 탐지 · 실패율 감시', '유출된 비밀번호 사용 막기', '새 기기 로그인 알림', '2단계 인증 · 패스키 지원', '잠금은 신중하게(정상 사용자)'];
        for (let i = 0; i < U.length; i++) {
          const y = 88 + i * 44;
          a.text(46, y, '✓', { size: 15, weight: 800, color: 'green' });
          a.text(64, y, U[i], { size: 13, anchor: 'start', weight: 700 });
          a.text(390, y, '✓', { size: 15, weight: 800, color: 'green' });
          a.text(408, y, S[i], { size: 13, anchor: 'start', weight: 700 });
          await a.wait(200);
        }
        a.note('n6', 360, 400, '⚠ 내 것이 아니거나 허락받지 않은 시스템에 대입을 시험하는 것은 불법이에요', { color: 'red' });
        await a.wait(700);
      },
    },
  ],
};

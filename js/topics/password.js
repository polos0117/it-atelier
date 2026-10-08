// 비밀번호 저장: 평문 저장의 위험 → 해시 함수(결정적·눈사태·단방향) → 해시 비교 로그인
// → 같은 비번 = 같은 해시(미리 계산한 표) → 솔트 → 느린 해시(work factor) → 정리(검증된 라이브러리, 2단계 인증)
// 해시값은 모두 실제 SHA-256 / bcrypt 결과(고정값)이다. 공격 속도는 GPU 1대 기준 어림값.

const H = {
  hello: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  hellp: 'fdd7585e08c4e2afd71dcabdb4636c89d557a3f42db9e2040c8bbd1708aa4ce7',
  'hello1234': 'd53d8d0632cd64e595b2cc9709bd580e4d323cd65ebbfaa778b3252c761ba1b8',
  'hello123': '27cc6994fc1c01ce6659c6bddca9b69c4c6a9418065e612c69d110b3f7b11f8a',
  qwerty: '65e84be33532fb784c48129675f9eff3a682b27168c0ea744b2cf58ee02337c5',
  '123456': '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  'sunny2024!': '6cb411ad3c1a4e9ceff260da9c3e657321361a92972a5bf4f1049482ff052c22',
  'a3f9hello1234': '6f8432a7055c443a95c89d0ef23b5cecb19571f785c061279ef83c01a8b68b15',
  '7c21hello1234': 'c5de29e66e98530bdd6326713ac69c47330f89a8e68d07eaf75368992a4752cc',
};
// bcrypt('hello1234', cost 12, salt R9h/cIPz0gi.URNNX3kh2O) 실제 값
const BCRYPT = [['$2b$', 'violet', '알고리즘'], ['12$', 'amber', 'cost'], ['R9h/cIPz0gi.URNNX3kh2O', 'blue', '솔트 22자'], ['zAFipB9u4jLTKEsgbpzAz9rmauN7xkC', 'green', '해시 31자']];
const hx = (s, n = 12) => H[s].slice(0, n) + '…';

const FILL = {
  base: 'var(--panel2)',
  head: 'color-mix(in srgb, var(--blue) 22%, var(--panel2))',
  read: 'color-mix(in srgb, var(--amber) 34%, var(--panel2))',
  bad: 'color-mix(in srgb, var(--red) 30%, var(--panel2))',
  ok: 'color-mix(in srgb, var(--green) 30%, var(--panel2))',
};
const RH = 30;

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, hidden: o.hidden });
}
/** 표 그리기. cols = [[제목, 너비, mono?], ...] → 행마다 { r(배경), c(칸 글자들), y } */
function table(a, x, y, cols, rows, o = {}) {
  const W = cols.reduce((s, c) => s + c[1], 0);
  const mk = (yy, cells, head) => {
    const g = a.raw('g', {}, 'node');
    const r = a.raw('rect', { x, y: yy - RH / 2, width: W, height: RH, rx: head ? 5 : 0, style: `fill:${head ? FILL.head : FILL.base};stroke:var(--line2);stroke-width:1` }, g);
    let cx = x;
    const c = cells.map((s, k) => {
      const t = a.text(cx + 10, yy, s, { size: head ? 11.5 : 12.5, anchor: 'start', par: g, weight: head ? 800 : 600, mono: !head && cols[k][2] });
      cx += cols[k][1];
      return t;
    });
    if (o.hidden && !head) g.style.opacity = 0;
    return { g, r, c, y: yy };
  };
  mk(y, cols.map((c) => c[0]), true);
  return rows.map((cells, i) => mk(y + RH * (i + 1), cells, false));
}
const paint = (row, k) => row.r.style.setProperty('fill', FILL[k]);
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
/** 기계(해시 함수) 노드 */
const machine = (a, x, y, o = {}) => a.node('mx', x, y, { label: o.label || 'SHA-256', sub: o.sub ?? '해시 함수', icon: '⚙️', color: 'violet', w: o.w || 150, h: o.h || 70 });
/** 입력 칩이 기계로 들어갔다가 사라진다 */
async function feed(a, chips, to = 'mx', dur = 650) {
  await a.par(...chips.map((c) => a.move(c, to, dur)));
  await a.par(...chips.map((c) => a.fadeOut(c, 160)));
}

export default {
  id: 'password',
  level: 2,
  cat: '보안',
  title: '비밀번호 저장 — 해시와 솔트',
  sub: '서버가 털려도 비밀번호는 지켜야 한다. 그래서 서버는 비밀번호를 "모르는 채로" 확인한다.',
  analogy: '비밀번호를 믹서기에 갈아서 그 즙만 보관한다고 생각해 보세요. 즙에서 원래 과일을 되살릴 수는 없지만, 로그인할 때 같은 과일을 다시 갈아 즙을 비교하면 맞는지 알 수 있습니다. 여기에 사람마다 다른 양념(솔트)을 넣고, 믹서기를 일부러 천천히 돌리면 도둑이 즙을 손에 넣어도 원래 과일을 알아내기가 훨씬 어려워집니다.',
  keys: [
    '비밀번호를 그대로(평문) 저장하면 DB가 한 번 유출될 때 모든 계정이, 비번을 재사용한 다른 사이트까지 위험해진다.',
    '해시 함수는 같은 입력엔 늘 같은 값, 한 글자만 달라도 완전히 다른 값을 내고, 결과에서 입력을 거꾸로 계산할 수 없다.',
    '서버는 해시만 저장하고, 로그인 때 입력값을 같은 방식으로 해시해 저장된 값과 비교한다.',
    '같은 비번은 같은 해시가 되므로 미리 계산한 표(레인보우 테이블)로 뚫린다. 사용자마다 다른 랜덤 솔트를 섞어 이를 막는다.',
    '빠른 해시 대신 bcrypt·scrypt·Argon2id처럼 일부러 느린 해시를 검증된 라이브러리로 쓰고, 2단계 인증으로 한 겹 더 지킨다.',
  ],
  terms: [
    ['평문', '암호화나 해시를 거치지 않은, 사람이 그대로 읽을 수 있는 원래 글자'],
    ['해시 함수', '어떤 길이의 입력이든 고정 길이 값으로 바꾸는 단방향 함수. SHA-256은 64자리 16진수(256비트)를 낸다'],
    ['눈사태 효과', '입력이 조금만 바뀌어도 출력의 절반 가까운 비트가 바뀌는 성질'],
    ['레인보우 테이블', '흔한 비밀번호들의 해시를 미리 계산해(해시 체인으로 압축해) 저장해 둔 역조회용 표'],
    ['솔트(salt)', '사용자마다 새로 만든 랜덤 값. 비밀번호와 섞어 해시하고, 해시 옆에 함께 저장한다'],
    ['work factor(cost)', '느린 해시의 반복·메모리 비용 설정값. bcrypt는 cost가 1 오를 때마다 계산 시간이 2배'],
    ['2단계 인증', '비밀번호(아는 것)에 휴대폰 코드·보안 키(가진 것)를 더해 확인하는 방식'],
  ],
  quiz: [
    { q: '해시 함수의 성질로 옳은 것은?', c: ['해시값을 거꾸로 계산하면 원래 비밀번호가 나온다', '한 글자만 바꿔도 결과가 완전히 달라진다', '같은 입력을 넣어도 매번 다른 결과가 나온다', '비밀번호가 길수록 해시값도 길어진다'], a: 1, why: '해시는 같은 입력엔 같은 값을 내고(결정적), 조금만 달라도 전혀 다른 값이 되며(눈사태 효과), 거꾸로 되돌릴 수 없습니다. 길이는 입력과 상관없이 고정입니다.', step: 1 },
    { q: '비밀번호를 해시할 때 솔트를 섞는 가장 큰 이유는?', c: ['해시 계산을 더 빠르게 하려고', '솔트를 비밀로 숨겨 두면 해시를 풀 수 없어서', '같은 비밀번호라도 사람마다 다른 해시가 되어 미리 계산한 표가 쓸모없어지게 하려고', '나중에 솔트로 비밀번호를 복호화하려고'], a: 2, why: '솔트는 비밀이 아니라 해시 옆에 함께 저장합니다. 사용자마다 달라서 같은 비번도 다른 해시가 되고, 미리 계산한 표를 재사용할 수 없게 됩니다.', step: 4 },
    { q: '비밀번호 저장에 SHA-256 한 번보다 bcrypt·Argon2id가 권장되는 이유는?', c: ['일부러 느리게(Argon2id는 메모리도 많이) 만들어 무차별 대입 비용을 크게 높이기 때문에', '출력이 더 길어서 충돌이 절대 생기지 않기 때문에', '복호화 키가 있어 잊어버린 비밀번호를 되찾을 수 있기 때문에', 'SHA-256은 이미 거꾸로 풀 수 있게 되었기 때문에'], a: 0, why: 'SHA-256 자체가 뚫린 건 아니지만 너무 빨라서 GPU로 초당 수백억 개를 시도할 수 있습니다. 느린 해시는 cost(와 메모리)로 시도 한 번의 비용을 올려 공격을 수백만 배 느리게 합니다.', step: 5 },
  ],
  setup(a) {
    a.text(360, 44, 'users 테이블 — 비밀번호를 그대로 저장', { size: 13.5, weight: 800 });
  },
  steps: [
    {
      t: '그대로 저장하면 — 유출 한 번에 전부',
      easy: '회원 비밀번호를 적힌 그대로 DB에 저장했다고 해 봐요. 해커가 DB를 한 번만 빼내면 모든 사람의 비밀번호가 그대로 보입니다. 같은 비밀번호를 다른 사이트에도 쓰는 사람이라면 거기까지 털려요.',
      deep: '평문(또는 키로 되돌릴 수 있는 암호화) 저장은 SQL 인젝션, 백업 파일·로그 유출, 내부자 접근 중 하나만 일어나도 전 계정이 노출됩니다. 유출된 아이디·비밀번호 쌍은 다른 서비스에 자동으로 대입하는 크리덴셜 스터핑에 쓰입니다. 그래서 "서버조차 원래 비밀번호를 모르게" 저장하는 것이 원칙입니다.',
      async run(a) {
        wipe(a);
        a.text(360, 44, 'users 테이블 — 비밀번호를 그대로 저장', { size: 13.5, weight: 800 });
        a.zone('db', 40, 68, 320, 196, { label: 'DB 서버', color: 'gray' });
        const rows = table(a, 70, 110, [['user', 90], ['password', 170, true]],
          [['민지', 'hello1234'], ['서준', 'qwerty'], ['하은', 'hello1234'], ['도윤', 'sunny2024!']], { hidden: true });
        for (const r of rows) { await appear(a, r.g, 200); await a.wait(80); }
        a.node('hk', 590, 150, { label: '해커', icon: '🕵️', color: 'red', w: 120, h: 76 });
        await a.wait(300);
        a.caption('DB 파일 하나만 빼내면…');
        await a.send([330, 170], 'hk', 'DB 통째로 복사', { color: 'red', dur: 1000 });
        rows.forEach((r) => { paint(r, 'bad'); });
        await a.flash('hk');
        const L = ['민지 hello1234', '서준 qwerty', '하은 hello1234', '도윤 sunny2024!'].map((s, i) =>
          a.text(590, 214 + i * 20, s, { size: 12, mono: true, weight: 700, color: 'red', hidden: true }));
        await appear(a, L, 300);
        a.note('n0', 360, 350, '유출 한 번에 모든 비밀번호가 그대로 보여요\n같은 비번을 쓰는 다른 사이트도 위험!', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '해시 함수 — 되돌릴 수 없는 믹서기',
      easy: '해시 함수는 글자를 넣으면 늘 같은 길이의 "지문"을 만들어 주는 믹서기예요. 같은 글자는 언제나 같은 지문, 한 글자만 달라도 완전히 다른 지문이 나와요. 지문에서 원래 글자를 거꾸로 알아낼 수는 없어요.',
      deep: 'SHA-256은 입력 길이와 상관없이 256비트(16진수 64자리)를 출력하는 결정적 함수입니다. 아래 값은 실제 SHA-256 결과로, \'hello\'와 \'hellp\'는 마지막 글자 하나만 다르지만 64자리 중 63자리가 다릅니다(눈사태 효과). 역상 저항성 때문에 출력에서 입력을 계산할 방법이 없어 "추측해서 해시해 보고 맞는지 비교"하는 것이 유일한 공격법입니다.',
      async run(a) {
        wipe(a);
        machine(a, 360, 92);
        a.text(360, 146, '어떤 글자를 넣어도 64자리(256비트) 값', { size: 11.5, cls: 'muted' });
        const IN = [['hello', 'blue'], ['hello', 'blue'], ['hellp', 'amber']];
        for (let i = 0; i < IN.length; i++) {
          const [s, c] = IN[i];
          const y = 196 + i * 44;
          const p = chip(a, s, 110, 92, c);
          await feed(a, [p]);
          await a.flash('mx');
          a.packet(s, { at: [56, y], color: c, round: 8, h: 26, w: 62, size: 12.5 });
          const t = a.text(98, y, '', { size: 12, mono: true, anchor: 'start', weight: 700 });
          const ref = H.hello, v = H[s];
          [...v].forEach((ch, k) => {
            const sp = a.raw('tspan', ch !== ref[k] ? { class: 'tc-red' } : {}, t);
            sp.textContent = ch;
          });
          t.style.opacity = 0;
          await appear(a, t, 300);
          if (i === 1) a.text(650, y, '똑같다', { size: 12.5, weight: 800, color: 'green' });
          if (i === 2) a.text(650, y, '전혀 다름', { size: 12.5, weight: 800, color: 'red' });
          await a.wait(200);
        }
        a.text(360, 328, '한 글자만 바꿨는데 64자리 중 63자리가 달라져요 (눈사태 효과)', { size: 12.5, weight: 700, color: 'amber' });
        await a.wait(300);
        a.note('n1', 360, 386, '거꾸로는 불가: 2cf24dba… → ??? (단방향)', { color: 'violet' });
        await a.wait(700);
      },
    },
    {
      t: '로그인 — 해시끼리 비교',
      easy: '서버는 비밀번호 대신 그 지문(해시)만 저장해 둬요. 로그인할 때 입력한 비밀번호를 같은 믹서기에 넣어 지문을 만들고, 저장된 지문과 같은지만 봅니다. 서버조차 원래 비밀번호를 몰라요.',
      deep: '가입 시 hash(password)만 저장하고, 로그인 시 hash(입력)을 계산해 저장값과 비교합니다. 비교는 처음 다른 글자에서 멈추지 않는 상수 시간 비교(constant-time compare)로 해야 타이밍 차이로 정보가 새지 않습니다. 비밀번호 찾기에서 "원래 비밀번호를 메일로 보내 주는" 서비스라면 되돌릴 수 있게 저장하고 있다는 뜻이므로 위험 신호입니다.',
      async run(a) {
        wipe(a);
        a.node('u', 80, 96, { label: '민지', icon: '🙂', color: 'blue', w: 100, h: 66 });
        machine(a, 340, 96, { w: 140, h: 66 });
        a.node('db', 610, 96, { label: 'DB', sub: '민지: d53d8d06…', shape: 'db', color: 'teal', w: 150, h: 76 });
        a.edge('u', 'mx', {});
        const TRY = [['hello1234', 'blue', true], ['hello123', 'amber', false]];
        for (let i = 0; i < TRY.length; i++) {
          const [s, c, ok] = TRY[i];
          const y = 196 + i * 96;
          await a.send('u', 'mx', s, { color: c, dur: 750 });
          await a.flash('mx');
          a.text(196, y, '방금 계산', { size: 12, anchor: 'end', cls: 'muted', weight: 700 });
          const t1 = a.text(210, y, H[s].slice(0, 16) + '…', { size: 13, mono: true, anchor: 'start', weight: 700, color: ok ? null : 'red', hidden: true });
          await appear(a, t1, 250);
          await a.send('db', [330, y + 26], 'd53d8d06…', { color: 'teal', dur: 650 });
          a.text(196, y + 26, 'DB에 저장', { size: 12, anchor: 'end', cls: 'muted', weight: 700 });
          a.text(210, y + 26, H['hello1234'].slice(0, 16) + '…', { size: 13, mono: true, anchor: 'start', weight: 700 });
          await a.wait(200);
          a.text(470, y + 13, ok ? '같음 → 로그인 ✓' : '다름 → 거절 ✕', { size: 13.5, anchor: 'start', weight: 800, color: ok ? 'green' : 'red' });
          a.hl('u', true, ok ? 'green' : 'red');
          await a.wait(450);
        }
        a.note('n2', 360, 404, 'DB에는 해시만 — 서버조차 원래 비밀번호를 몰라요', { color: 'teal' });
        await a.wait(600);
      },
    },
    {
      t: '같은 비번은 같은 해시 — 미리 계산한 표',
      easy: '해시는 같은 입력엔 늘 같은 값이라는 게 약점이 돼요. 해커는 흔한 비밀번호들의 해시를 미리 잔뜩 계산해 두고, 훔친 해시와 같은 줄을 찾기만 하면 됩니다. 민지와 하은이 같은 비번이라는 것까지 드러나요.',
      deep: '공격자는 유출 사전·흔한 패턴의 해시를 미리 계산해 둔 조회표로 솔트 없는 해시를 즉시 역조회합니다. 레인보우 테이블은 해시와 축약 함수를 번갈아 적용한 체인의 시작·끝만 저장해 시간-공간을 맞바꾼 형태입니다. 같은 해시를 가진 행이 곧 같은 비밀번호이므로, 한 명만 풀어도 같은 해시를 가진 모든 계정이 함께 풀립니다.',
      async run(a) {
        wipe(a);
        a.text(24, 56, '유출된 DB (해시만 있음)', { size: 12.5, anchor: 'start', weight: 800 });
        a.text(436, 56, '해커가 미리 계산한 표', { size: 12.5, anchor: 'start', weight: 800, color: 'red' });
        const L = table(a, 24, 96, [['user', 62], ['SHA-256 (앞 12자)', 156, true], ['알아낸 비번', 100, true]],
          [['민지', hx('hello1234'), ''], ['서준', hx('qwerty'), ''], ['하은', hx('hello1234'), ''], ['도윤', hx('sunny2024!'), '']]);
        const DICT = ['123456', 'password', 'qwerty', 'hello1234'];
        const R = table(a, 436, 96, [['비번 후보', 104], ['SHA-256 (앞 12자)', 156, true]], DICT.map((d) => [d, hx(d)]));
        a.text(566, 256, '⋮ 수십억 줄', { size: 12, cls: 'muted', weight: 700 });
        const PW = ['hello1234', 'qwerty', 'hello1234', 'sunny2024!'];
        await a.wait(300);
        for (let i = 0; i < L.length; i++) {
          paint(L[i], 'read');
          await a.wait(260);
          const j = DICT.indexOf(PW[i]);
          if (j >= 0) {
            paint(R[j], 'bad');
            a.raw('line', { x1: 342, y1: L[i].y, x2: 436, y2: R[j].y, class: 'edge ec-red', style: 'stroke-width:1.5' }, 'top');
            L[i].c[2].textContent = PW[i];
            L[i].c[2].classList.add('tc-red');
            paint(L[i], 'bad');
          } else {
            L[i].c[2].textContent = '?';
            L[i].c[2].classList.add('muted');
            paint(L[i], 'base');
          }
          await a.wait(320);
        }
        a.note('n3', 360, 330, '같은 비번 = 같은 해시 → 미리 계산한 표로 한 번에 들통\n민지와 하은이 같은 비번이라는 것도 드러나요', { color: 'red' });
        a.text(360, 398, '도윤처럼 흔하지 않은 비번만 겨우 버텨요', { size: 12, cls: 'muted', weight: 700 });
        await a.wait(700);
      },
    },
    {
      t: '솔트 — 사람마다 다른 양념',
      easy: '가입할 때 사람마다 랜덤한 글자(솔트)를 하나씩 만들어, 비밀번호에 붙인 뒤 해시해요. 민지와 하은이 똑같이 hello1234를 써도 해시가 완전히 달라지고, 해커가 미리 만든 표는 쓸모가 없어집니다.',
      deep: '솔트는 사용자마다 CSPRNG로 새로 만든 16바이트 이상의 랜덤 값이며 비밀이 아니므로 해시 옆에 함께 저장합니다. 공격자는 솔트별로 표를 새로 만들어야 해서 사전 계산이 무의미해지고, 같은 비밀번호를 쓰는 사용자도 드러나지 않습니다. 다만 솔트는 한 계정을 집중 공략하는 무차별 대입 자체를 느리게 하지는 못하므로 느린 해시가 함께 필요합니다(그림은 짧게 줄인 예시 솔트이며, 해시는 실제 SHA-256(솔트+비번) 값).',
      async run(a) {
        wipe(a);
        machine(a, 400, 92, { w: 140, h: 66 });
        const T = table(a, 40, 186, [['user', 70], ['salt', 70, true], ['SHA-256(salt+비번) 앞 12자', 186, true]],
          [['민지', 'a3f9', hx('a3f9hello1234')], ['하은', '7c21', hx('7c21hello1234')]], { hidden: true });
        const US = [['a3f9', 'a3f9hello1234'], ['7c21', '7c21hello1234']];
        for (let i = 0; i < US.length; i++) {
          const [salt, key] = US[i];
          const s = chip(a, salt, 70, 92, 'amber', { w: 56 });
          const plus = a.text(112, 92, '+', { size: 18, weight: 800, cls: 'muted' });
          const p = chip(a, 'hello1234', 180, 92, 'blue');
          await a.wait(250);
          a.remove(plus);
          await feed(a, [s, p]);
          await a.flash('mx');
          await a.send('mx', [260, T[i].y], H[key].slice(0, 8) + '…', { color: 'violet', dur: 600 });
          await appear(a, T[i].g, 250);
          await a.wait(150);
        }
        a.text(220, 92, '솔트 + 비번 →', { size: 12.5, weight: 700, cls: 'muted' });
        a.text(440, 186, '해커의 표', { size: 12.5, anchor: 'start', weight: 800, color: 'red' });
        a.text(440, 216, 'hello1234 → ' + hx('hello1234'), { size: 12, mono: true, anchor: 'start', weight: 700 });
        await a.wait(300);
        a.text(440, 246, '일치하는 줄 없음 ✕', { size: 13, anchor: 'start', weight: 800, color: 'red' });
        a.note('n4', 360, 316, '민지와 하은은 같은 비번 hello1234인데\n해시는 완전히 달라요', { color: 'green' });
        a.text(360, 396, '솔트는 비밀이 아니라서 해시 옆에 그대로 저장해요', { size: 12, cls: 'muted', weight: 700 });
        await a.wait(700);
      },
    },
    {
      t: '느린 해시 — 일부러 천천히',
      easy: 'SHA-256 같은 보통 해시는 너무 빨라서, 해커가 컴퓨터로 1초에 수백억 개를 넣어 볼 수 있어요. 비밀번호용 해시(bcrypt 등)는 일부러 천천히 돌아서 같은 컴퓨터로도 1초에 겨우 천 번 남짓이에요. 로그인 한 번엔 티가 안 나지만, 하나하나 넣어 보는 해커에겐 엄청난 차이죠.',
      deep: 'GPU 1대(최신 고급형) 기준 어림값으로 SHA-256은 초당 약 200억 회, bcrypt cost 12는 초당 약 1,400회라 1천만 배 이상 차이가 납니다. bcrypt는 cost가 1 오를 때마다 2배 느려지고, scrypt·Argon2id는 메모리도 많이 요구해 GPU·ASIC 병렬화를 더 어렵게 합니다. 서버에서 검증 1회가 수백 ms 이내가 되도록 조정하며, OWASP는 Argon2id(예: 메모리 19MiB, 반복 2) 또는 bcrypt cost 10 이상을 권장합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 44, '1초에 몇 번 넣어 볼 수 있을까? (GPU 1대, 어림값)', { size: 13.5, weight: 800 });
        a.node('f', 110, 106, { label: 'SHA-256', sub: '빠른 해시', color: 'red', w: 130, h: 60 });
        a.node('s', 110, 196, { label: 'bcrypt', sub: 'cost 12', color: 'green', w: 130, h: 60 });
        const c1 = a.text(430, 98, '0 번/초', { size: 22, weight: 800, color: 'red' });
        const c2 = a.text(430, 188, '0 번/초', { size: 22, weight: 800, color: 'green' });
        a.text(430, 126, '시도 한 번이 눈 깜짝할 새보다 훨씬 짧음', { size: 11.5, cls: 'muted' });
        a.text(430, 216, '일부러 느리게: cost 1 올릴 때마다 2배', { size: 11.5, cls: 'muted' });
        const fmt = (n) => (n >= 1e8 ? Math.round(n / 1e8) + '억' : n >= 1e4 ? Math.round(n / 1e4) + '만' : Math.round(n).toLocaleString('ko-KR'));
        await a.tween(2200, (k) => {
          c1.textContent = fmt(2e10 * k) + ' 번/초';
          c2.textContent = '약 ' + fmt(1400 * k) + ' 번/초';
        }, { linear: true });
        await a.wait(300);
        a.text(360, 266, '8자리 비번(소문자+숫자, 약 2.8조 가지)을 전부 넣어 보면', { size: 12.5, weight: 800 });
        a.text(40, 304, 'SHA-256', { size: 12.5, anchor: 'start', weight: 700, color: 'red' });
        a.text(40, 340, 'bcrypt', { size: 12.5, anchor: 'start', weight: 700, color: 'green' });
        const b1 = a.bar('b1', 130, 304, 420, { color: 'red' });
        const b2 = a.bar('b2', 130, 340, 420, { color: 'green' });
        await a.par(b1.set(0.012, 300), b2.set(1, 1400));
        a.text(564, 304, '약 2분', { size: 13.5, anchor: 'start', weight: 800, color: 'red' });
        a.text(564, 340, '약 60년', { size: 13.5, anchor: 'start', weight: 800, color: 'green' });
        a.note('n5', 360, 400, '로그인 확인은 0.2초쯤이라 사람은 못 느끼지만, 해커는 1천만 배 느려져요', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '정리 — 직접 만들지 말고, 한 겹 더',
      easy: '비밀번호 저장은 직접 만들지 말고 bcrypt·Argon2 같은 검증된 도구를 그대로 쓰는 게 정답이에요. 그리고 비밀번호가 털려도 막을 수 있게, 휴대폰 코드까지 확인하는 2단계 인증을 켜 두세요.',
      deep: 'bcrypt 결과 문자열 하나에 알고리즘($2b$)·cost·솔트·해시가 모두 들어 있어 별도 솔트 열이 필요 없고, 라이브러리의 verify 함수가 이를 읽어 비교합니다(위 값은 hello1234의 실제 bcrypt 결과). bcrypt는 입력을 72바이트까지만 쓰므로 긴 비밀번호를 허용하면 Argon2id가 낫고, cost를 올릴 땐 로그인 성공 시 새 설정으로 다시 해시해 점진적으로 바꿉니다. 그래도 피싱·재사용으로 비밀번호 자체가 새는 것은 못 막으니 TOTP·패스키 같은 2단계 인증을 함께 씁니다.',
      async run(a) {
        wipe(a);
        a.text(360, 40, '실제로 DB에 저장되는 bcrypt 값 (hello1234)', { size: 12.5, weight: 800, cls: 'muted' });
        const t = a.text(0, 76, '', { size: 14, mono: true, anchor: 'start', weight: 700 });
        const sps = BCRYPT.map(([s, c]) => { const sp = a.raw('tspan', { class: 'tc-' + c }, t); sp.textContent = s; return sp; });
        const total = t.getComputedTextLength();
        let x = 360 - total / 2;
        t.setAttribute('x', x);
        const LAB = [];
        sps.forEach((sp, i) => {
          const w = sp.getComputedTextLength();
          const lab = a.text(x + w / 2, i === 1 ? 122 : 102, BCRYPT[i][2], { size: 11.5, weight: 700, color: BCRYPT[i][1], hidden: true });
          LAB.push(lab);
          x += w;
        });
        for (const l of LAB) { await appear(a, l, 220); await a.wait(120); }
        const CK = [['✓', '검증된 라이브러리: bcrypt · scrypt · Argon2id', 'green'], ['✕', '직접 만든 방식, MD5·SHA-1·SHA-256 한 번만 쓰기', 'red'], ['✕', '되돌릴 수 있게(암호화로) 저장하기', 'red']];
        for (let i = 0; i < CK.length; i++) {
          const [m, s, c] = CK[i];
          const y = 170 + i * 30;
          a.text(70, y, m, { size: 15, weight: 800, color: c });
          a.text(92, y, s, { size: 13, anchor: 'start', weight: 700 });
          await a.wait(260);
        }
        a.zone('fa', 40, 274, 640, 132, { label: '2단계 인증 — 비번이 털려도 한 겹 더', color: 'green' });
        a.node('ok', 580, 344, { label: '로그인', icon: '🔓', color: 'green', w: 120, h: 66 });
        const p1 = chip(a, '비밀번호', 140, 344, 'blue', { h: 32 });
        a.text(232, 344, '+', { size: 18, weight: 800, cls: 'muted' });
        const p2 = chip(a, '폰 코드 482 913', 340, 344, 'amber', { h: 32 });
        p1.g.style.opacity = 0; p2.g.style.opacity = 0;
        await appear(a, p1.g, 250);
        await appear(a, p2.g, 250);
        a.text(450, 344, '→', { size: 20, weight: 800, cls: 'muted' });
        await a.send([450, 344], 'ok', '둘 다 확인', { color: 'green', dur: 600 });
        await a.flash('ok');
        a.text(340, 388, '아는 것 + 가진 것', { size: 11.5, cls: 'muted', weight: 700 });
        await a.wait(600);
      },
    },
  ],
};

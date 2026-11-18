// SQL 인젝션: 로그인 폼 → 문자열 이어 붙이기 → 정상 입력 → ' OR '1'='1 (데이터가 명령으로) → 피해
// → 매개변수화 쿼리 → 겹겹이 지키기 → 같은 원리의 다른 인젝션 + 점검표
// 단계마다 무대를 새로 그린다. 표·입력은 설명용 예시(고정)이며, 공격 입력은 교과서에 나오는 무해한 예시만 쓴다.

const USERS = [[1, 'admin', '관리자'], [2, '민지', '회원'], [3, '서준', '회원'], [4, '하은', '회원'], [5, '도윤', '회원']];
const MASK = '●●●●';
const OR1 = "' OR '1'='1";
const PRE = 'SELECT * FROM users WHERE name = \'';
const MID = '\' AND pw = \'';
const tint = (c, p = 30) => `color-mix(in srgb, var(--${c}) ${p}%, var(--panel2))`;

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }

/** 이어 붙인 문장을 한 글자씩 읽어, 입력 글자가 "값(문자열 안)"에 머무는지 "명령"으로 빠져나갔는지 나눈다.
 *  parts: [[글자, 입력인가]] → [[글자, 종류]] (code | data | esc | dead) */
function analyze(parts) {
  const ch = [];
  parts.forEach(([s, inp], pi) => [...s].forEach((c) => ch.push({ c, inp, pi })));
  let st = 'code';
  const broken = new Set();
  for (let i = 0; i < ch.length; i++) {
    const x = ch[i], n = ch[i + 1] && ch[i + 1].c;
    let cmt = st === 'cmt';
    if (st === 'str') {
      if (x.c === "'" && n === "'") { x.cmt = false; ch[i + 1].cmt = false; i++; continue; } // '' = 글자 ' 하나
      if (x.c === "'") { st = 'code'; if (x.inp) broken.add(x.pi); }
    } else if (st === 'code') {
      if (x.c === "'") st = 'str';
      else if (x.c === '-' && n === '-') { st = 'cmt'; cmt = true; }
    }
    x.cmt = cmt;
    x.kind = x.inp ? (broken.has(x.pi) ? 'esc' : cmt ? 'dead' : 'data') : cmt ? 'dead' : 'code';
  }
  const out = [];
  for (const x of ch) {
    const k = x.kind || 'data';
    if (out.length && out[out.length - 1][1] === k) out[out.length - 1][0] += x.c;
    else out.push([x.c, k]);
  }
  return out;
}
const loginParts = (name, pw) => [[PRE, false], [name, true], [MID, false], [pw, true], ["'", false]];

const KIND = { code: '', data: 'tc-blue', esc: 'tc-red', dead: 'muted', ph: 'tc-violet' };
/** 색을 나눠 칠한 한 줄짜리 코드. segs: [[글자, 종류]] */
function qline(a, x, y, segs, o = {}) {
  const t = a.text(x, y, '', { size: o.size || 13, mono: true, anchor: 'start', weight: 600, id: o.id, hidden: o.hidden });
  t.style.whiteSpace = 'pre';
  paintLine(a, t, segs);
  return t;
}
function paintLine(a, t, segs) {
  t.replaceChildren();
  for (const [s, k] of segs) {
    const sp = a.raw('tspan', { class: KIND[k] || '', 'font-weight': k && k !== 'code' && k !== 'dead' ? 800 : null }, t);
    sp.textContent = s;
  }
}
function legend(a, x, y) {
  const t = a.text(x, y, '', { size: 11, anchor: 'end', weight: 700 });
  t.style.whiteSpace = 'pre';
  [['■ ', 'tc-blue'], ['값(데이터)   ', ''], ['■ ', 'tc-red'], ['명령이 된 입력   ', ''], ['■ ', 'muted'], ['주석 처리', '']]
    .forEach(([s, c]) => { const sp = a.raw('tspan', { class: c }, t); sp.textContent = s; });
  return t;
}
function panel(a, x, y, w, h) {
  return a.raw('rect', { x, y, width: w, height: h, rx: 10, style: 'fill:var(--panel2);stroke:var(--line2)' }, 'edge');
}

/* ---------- users 표 ---------- */
const COLS = [['id', 44], ['name', 86], ['pw', 84], ['role', 80]];
const TW = COLS.reduce((s, c) => s + c[1], 0);
const RH = 28;
function table(a, x, y, o = {}) {
  const mk = (yy, cells, head) => {
    const g = a.raw('g', {}, 'node');
    const r = a.raw('rect', { x, y: yy - RH / 2, width: TW, height: RH, rx: head ? 5 : 0, style: `fill:${head ? tint('blue', 22) : 'var(--panel2)'};stroke:var(--line2);stroke-width:1` }, g);
    let cx = x;
    cells.forEach((s, k) => {
      a.text(cx + COLS[k][1] / 2, yy, String(s), { size: head ? 12 : 12.5, par: g, weight: head ? 800 : k === 1 ? 700 : 400, mono: head || k === 0, cls: !head && k === 2 ? 'muted' : '' });
      cx += COLS[k][1];
    });
    if (o.hidden && !head) g.style.opacity = 0;
    return { g, r, y: yy };
  };
  a.text(x, y - 28, 'users 표', { size: 12, weight: 800, anchor: 'start', cls: 'muted' });
  mk(y, COLS.map((c) => c[0]), true);
  return USERS.map(([id, n, role], i) => mk(y + RH * (i + 1), [id, n, MASK, role], false));
}
const paint = (R, c, p = 34) => R.r.style.setProperty('fill', c ? tint(c, p) : 'var(--panel2)');
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));

/* ---------- 2·3단계 공통 무대 ---------- */
const QY = 82, TX = 24, TY = 212;
function scene(a, pw) {
  wipe(a);
  a.text(24, 34, '이름', { size: 12.5, anchor: 'start', weight: 700, cls: 'muted' });
  a.packet('민지', { at: [88, 34], color: 'blue', round: 8, h: 26, size: 12.5 });
  a.text(150, 34, '비밀번호', { size: 12.5, anchor: 'start', weight: 700, cls: 'muted' });
  a.packet(pw, { at: [pw === MASK ? 250 : 270, 34], color: pw === MASK ? 'blue' : 'red', round: 8, h: 26, size: 12.5 });
  a.text(704, 34, '앱 서버가 만든 SQL ↓', { size: 11.5, anchor: 'end', weight: 700, cls: 'muted' });
  panel(a, 16, QY - 22, 688, 44);
  const rows = table(a, TX, TY);
  const res = a.node('res', 540, 288, { label: '결과 대기', sub: '', icon: '⏳', color: 'gray', w: 300, h: 112 });
  return { rows, res };
}
async function scan(a, rows, hits, color) {
  for (let i = 0; i < rows.length; i++) {
    paint(rows[i], 'amber', 30);
    await a.wait(140);
    paint(rows[i], hits.includes(i) ? color : null);
  }
}

export default {
  id: 'sqli',
  level: 2,
  cat: '보안',
  title: 'SQL 인젝션 — 입력이 명령으로 둔갑할 때',
  sub: '사용자가 친 글자를 SQL 문장에 그대로 이어 붙이면, 그 글자가 DB에게 내리는 명령이 되어 버린다.',
  analogy: '은행 창구 직원이 손님이 쓴 메모를 읽지 않고 업무 지시서 빈칸에 그대로 오려 붙인다고 생각해 보세요. 손님이 "민지, 그리고 금고도 열어 줄 것"이라고 쓰면 지시서 전체가 바뀌어 버립니다. 안전한 직원은 지시서 양식은 그대로 두고, 손님 메모는 "이름 칸에 들어갈 값"으로만 봅니다.',
  keys: [
    'SQL 인젝션은 사용자 입력을 SQL 문장에 문자열로 이어 붙일 때, 입력 속 따옴표·키워드가 문장의 구조를 바꿔 버리는 공격이다.',
    '\' OR \'1\'=\'1 같은 입력은 조건을 항상 참으로 만들어 로그인을 우회하거나 모든 행을 꺼내고, 주석(--)은 뒤의 비밀번호 확인을 지워 버린다.',
    '가장 확실한 방어는 매개변수화 쿼리(prepared statement)다. 문장 틀을 먼저 정하고 입력은 따로 보내, 입력은 끝까지 "값"으로만 쓰인다.',
    'ORM·쿼리 빌더, 허용 목록 입력 검증, DB 계정 최소 권한, 자세한 오류 숨기기를 겹쳐 쓰고, WAF는 보조로만 둔다.',
    '명령어·로그·프롬프트 인젝션도 원리가 같다: 데이터와 명령을 한 줄에 섞지 않는다. 허락받지 않은 시스템에 시험해 보는 것은 불법이다.',
  ],
  terms: [
    ['SQL', '데이터베이스에 "이 조건의 행을 꺼내 줘" 같은 명령을 내리는 언어'],
    ['인젝션(injection)', '데이터로 들어간 입력이 명령의 일부로 해석되도록 끼워 넣는 공격의 총칭'],
    ['문자열 이어 붙이기', '"... name = \'" + 입력 + "\'"처럼 코드에서 글자를 합쳐 문장을 만드는 방식. 인젝션의 원인'],
    ['매개변수화 쿼리', '? 같은 자리표시자로 문장 틀을 정하고 값은 따로 넘기는 방식. prepared statement라고도 한다'],
    ['ORM', '표를 코드의 객체처럼 다루게 해 주는 도구. 기본 기능은 내부에서 매개변수화를 쓴다'],
    ['최소 권한', '앱이 쓰는 DB 계정에 꼭 필요한 표·동작(예: SELECT, INSERT)만 허락하는 원칙'],
    ['WAF', '웹 방화벽. 알려진 공격 모양의 요청을 걸러 주지만 우회될 수 있어 보조 수단이다'],
  ],
  quiz: [
    { q: '로그인 비밀번호 칸에 \' OR \'1\'=\'1 을 넣었더니 모든 회원 행이 나왔습니다. 가장 정확한 이유는?', c: ['DB의 비밀번호가 모두 1로 바뀌어서', '입력 속 따옴표가 문자열을 닫고, 뒤의 OR \'1\'=\'1\'이 조건(명령)으로 읽혀 WHERE가 항상 참이 되어서', '서버가 관리자 권한을 공격자에게 넘겨줘서', 'DB가 한글 이름을 처리하지 못해서'], a: 1, why: '앱이 입력을 문장에 그대로 이어 붙였기 때문에, 첫 따옴표가 pw 문자열을 끝내고 OR \'1\'=\'1\'이 새 조건이 됩니다. AND가 먼저 계산된 뒤 OR 참이 붙어 WHERE 전체가 모든 행에서 참이 됩니다.', step: 2 },
    { q: '매개변수화 쿼리(prepared statement)가 SQL 인젝션을 막는 원리는?', c: ['입력에서 SELECT·DROP 같은 위험한 단어를 지워서', '입력을 암호화해서 DB로 보내서', '문장 틀(구조)을 먼저 정하고 입력은 따로 보내, 입력이 끝까지 값으로만 쓰이게 해서', '공격자의 IP 주소를 DB가 기억해 막아서'], a: 2, why: '틀의 ? 자리에는 값만 들어갈 수 있습니다. 같은 \' OR \'1\'=\'1 도 "그런 비밀번호를 가진 사람"을 찾는 값일 뿐이라 0행이 나옵니다. 단어 지우기 같은 블랙리스트는 우회되기 쉽습니다.', step: 4 },
    { q: '사용자가 고른 정렬 기준(이름순·가입일순)을 ORDER BY 뒤에 넣어야 합니다. 안전한 방법은?', c: ['코드에 정해 둔 열 이름 목록(허용 목록)에서 고르게 하고, 목록에 있는 값만 쓴다', '? 자리표시자에 열 이름을 넣는다 — 값처럼 안전하게 처리된다', '입력의 따옴표를 두 번 써서(\'\') 이스케이프한 뒤 이어 붙인다', 'WAF가 있으니 그대로 이어 붙여도 된다'], a: 0, why: '자리표시자는 "값"만 묶을 수 있고 표·열 이름 같은 식별자는 묶을 수 없습니다(열 이름을 넣으면 그냥 글자 상수가 됩니다). 이런 자리는 허용 목록으로 골라 넣는 것이 정석이고, 손으로 하는 이스케이프나 WAF는 빈틈이 생기기 쉽습니다.', step: 5 },
  ],
  setup(a) {
    a.text(360, 30, '로그인 폼 → 앱 서버가 SQL 문장을 만든다', { size: 14, weight: 800 });
  },
  steps: [
    {
      t: '로그인 폼 — 입력을 문장에 이어 붙이면',
      easy: '로그인 버튼을 누르면 앱 서버는 DB에게 "이름이 민지이고 비밀번호가 이것인 사람을 찾아 줘"라는 SQL 문장을 보냅니다. 이때 많은 초보 코드가 문장 틀에 사용자가 친 글자를 그대로 이어 붙여요. 지금은 아무 문제 없어 보입니다.',
      deep: '"SELECT … WHERE name = \'" + name + "\' AND pw = \'" + pw + "\'"처럼 문자열을 합치면, DB는 합쳐진 한 줄을 처음부터 파싱합니다. 어디까지가 개발자가 쓴 코드이고 어디부터가 사용자 입력인지 DB는 알 방법이 없습니다. (설명을 단순하게 하려고 비밀번호를 그대로 비교하지만, 실제 서비스는 해시를 비교해야 합니다 — "비밀번호 저장" 주제 참고)',
      async run(a) {
        wipe(a);
        a.text(360, 30, '로그인 폼 → 앱 서버가 SQL 문장을 만든다', { size: 14, weight: 800 });
        // 로그인 폼
        const f = a.raw('g', {}, 'node');
        a.raw('rect', { x: 24, y: 58, width: 184, height: 140, rx: 12, style: 'fill:var(--panel2);stroke:var(--line2)' }, f);
        a.text(116, 78, '🔑 로그인', { size: 13, weight: 800, par: f });
        a.text(38, 106, '이름', { size: 11.5, anchor: 'start', cls: 'muted', par: f, weight: 700 });
        a.text(38, 140, '비밀번호', { size: 11.5, anchor: 'start', cls: 'muted', par: f, weight: 700 });
        a.raw('rect', { x: 96, y: 94, width: 100, height: 24, rx: 5, style: 'fill:var(--panel);stroke:var(--line2)' }, f);
        a.raw('rect', { x: 96, y: 128, width: 100, height: 24, rx: 5, style: 'fill:var(--panel);stroke:var(--line2)' }, f);
        const nm = a.text(104, 106, '', { size: 12.5, anchor: 'start', par: f, weight: 700 });
        const pw = a.text(104, 140, '', { size: 12.5, anchor: 'start', par: f, weight: 700 });
        a.raw('rect', { x: 66, y: 164, width: 100, height: 24, rx: 12, style: `fill:${tint('blue', 40)};stroke:var(--blue)` }, f);
        a.text(116, 176, '로그인', { size: 12, weight: 800, par: f });
        a.node('app', 384, 128, { label: '앱 서버', icon: '🖥️', color: 'violet', w: 130, h: 70 });
        a.node('db', 616, 128, { label: 'DB', sub: 'users 표', icon: '🗄️', color: 'teal', w: 120, h: 76, shape: 'db' });
        a.edge([212, 128], 'app');
        a.edge('app', 'db', { label: 'SQL 한 줄' });
        a.caption('사용자가 이름과 비밀번호를 입력해요');
        for (let k = 1; k <= 2; k++) { nm.textContent = '민지'.slice(0, k); await a.wait(160); }
        for (let k = 1; k <= 4; k++) { pw.textContent = MASK.slice(0, k); await a.wait(120); }
        await a.wait(250);
        // 서버 코드
        panel(a, 16, 224, 688, 108);
        a.text(30, 242, '// 서버 코드 — 입력을 문자열로 이어 붙이는 위험한 방식', { size: 11.5, anchor: 'start', cls: 'muted', mono: true });
        qline(a, 30, 270, [['sql = "' + PRE + '" + ', 'code'], ['이름', 'data']], { size: 12.5 });
        qline(a, 30, 296, [['    + "' + MID + '" + ', 'code'], ['비번', 'data'], [' + "\'"', 'code']], { size: 12.5 });
        a.caption('앱 서버가 입력을 문장 틀에 이어 붙여요');
        await a.par(a.send([150, 106], 'app', '민지', { color: 'blue', dur: 700 }), a.send([150, 140], 'app', MASK, { color: 'blue', dur: 700 }));
        await a.flash('app');
        const out = qline(a, 30, 318, [['→ ', 'code'], ...analyze(loginParts('민지', MASK))], { size: 12.5, hidden: true });
        await appear(a, out, 300);
        await a.send('app', 'db', 'SQL', { color: 'violet', dur: 700 });
        await a.flash('db');
        a.note('n1', 360, 386, '입력이 문장의 일부가 된 채로 DB에 갑니다\nDB는 어디까지가 입력인지 구별할 수 없어요', { color: 'amber' });
        await a.wait(700);
      },
    },
    {
      t: '정상 입력 — 값은 값으로',
      easy: '"민지"라고 입력하면 문장은 "이름이 \'민지\'이고 비밀번호가 \'●●●●\'인 사람"이 됩니다. 입력은 따옴표 안에 얌전히 들어가 있어 "값"으로만 쓰이고, DB는 민지 한 사람만 찾아 줘요.',
      deep: 'SQL에서 작은따옴표(\')는 문자열 값의 시작과 끝을 표시합니다. 입력에 따옴표가 없으면 이어 붙인 문장도 개발자가 의도한 구조(WHERE 조건 2개를 AND로 연결) 그대로 파싱됩니다. 문제는 이 "안전"이 입력 내용에 달려 있다는 점입니다. 코드가 구조를 지키는 게 아니라 사용자가 착하게 입력해 주기를 바라는 셈입니다.',
      async run(a) {
        const { rows } = scene(a, MASK);
        legend(a, 704, 118);
        const q = qline(a, 30, QY, analyze(loginParts('민지', MASK)), { hidden: true });
        a.caption('입력은 따옴표 안의 "값" 자리에 들어가요');
        await appear(a, q, 400);
        await a.wait(400);
        a.text(30, 146, 'name = \'민지\'  AND  pw = \'●●●●\'  → 두 조건을 모두 만족하는 행만', { size: 12.5, anchor: 'start', weight: 700, color: 'green', id: 'ev' });
        await a.wait(300);
        await scan(a, rows, [1], 'green');
        a.setNode('res', { label: '✓ 민지로 로그인', sub: '찾은 행 1개 — 의도대로', icon: '🙂', color: 'green' });
        await a.flash('res');
        a.note('n1', 360, 400, '입력이 따옴표 안에 머물면 문장의 구조는 그대로예요', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '따옴표 하나로 — 입력이 명령이 되다',
      easy: '이번엔 비밀번호 칸에 \' OR \'1\'=\'1 을 넣었어요. 맨 앞 따옴표가 비밀번호 칸을 일찍 닫아 버리고, 뒤의 OR \'1\'=\'1\'은 "또는 1이 1과 같으면"이라는 새 조건이 됩니다. 1은 언제나 1이니 모든 회원이 조건을 만족하고, 첫 줄의 관리자로 로그인돼요.',
      deep: '합쳐진 WHERE는 name = \'민지\' AND pw = \'\' OR \'1\'=\'1\'입니다. AND가 OR보다 먼저 계산되므로 (name = \'민지\' AND pw = \'\') OR \'1\'=\'1\'이 되고, 뒤쪽이 항상 참이라 모든 행이 반환됩니다. 많은 로그인 코드가 "결과 첫 행 = 로그인한 사용자"로 처리하기 때문에 보통 맨 앞에 있는 관리자 계정으로 들어가게 됩니다. 이 입력은 교과서에 나오는 설명용 예시입니다.',
      async run(a) {
        const { rows } = scene(a, OR1);
        legend(a, 704, 118);
        const full = analyze(loginParts('민지', OR1));
        const naive = full.map(([s, k]) => [s, k === 'esc' ? 'data' : k]);
        const q = qline(a, 30, QY, naive, { hidden: true });
        a.caption('개발자는 비밀번호 칸 전체가 "값"이라고 기대했지만…');
        await appear(a, q, 400);
        await a.wait(700);
        // 첫 따옴표만 빨갛게
        const quoteFirst = naive.map(([s, k]) => [s, k]);
        const ix = quoteFirst.findIndex(([s]) => s === OR1);
        quoteFirst.splice(ix, 1, ["'", 'esc'], [OR1.slice(1), 'data']);
        paintLine(a, q, quoteFirst);
        a.caption('첫 따옴표가 비밀번호 문자열을 닫아 버려요');
        a.text(30, 120, "↑ 이 ' 에서 pw 값이 끝남", { size: 11.5, anchor: 'start', weight: 800, color: 'red', id: 'qt' });
        await a.wait(900);
        paintLine(a, q, full);
        a.remove('qt');
        a.caption('나머지 OR \'1\'=\'1 은 SQL 조건(명령)이 됩니다');
        await a.wait(500);
        const c1 = a.packet("name='민지' AND pw=''", { at: [112, 150], color: 'gray', round: 8, h: 26, size: 12, w: 172, hidden: true });
        const c2 = a.packet("OR '1'='1'", { at: [304, 150], color: 'red', round: 8, h: 26, size: 12, w: 96, hidden: true });
        await appear(a, c1.g, 250);
        a.text(226, 150, '거짓', { size: 12.5, weight: 800, cls: 'muted' });
        await a.wait(300);
        await appear(a, c2.g, 250);
        a.text(390, 150, '항상 참', { size: 12.5, weight: 800, color: 'red' });
        await a.wait(300);
        a.text(530, 150, '⇒ 모든 행이 참', { size: 13, weight: 800, color: 'red' });
        await scan(a, rows, [0, 1, 2, 3, 4], 'red');
        a.setNode('res', { label: '✗ 로그인 우회', sub: '첫 행 admin으로 로그인 · 5행 노출', icon: '🚨', color: 'red' });
        await a.flash('res');
        a.note('n1', 360, 400, 'AND가 먼저 계산되고, 마지막 OR가 항상 참 → 비밀번호 확인이 무력화', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '피해 — 무엇을 잃을 수 있나',
      easy: '로그인만 뚫리는 게 아닙니다. 다른 사람의 개인정보를 꺼내 보거나, 값을 바꾸고 지우는 명령을 끼워 넣을 수도 있어요. 그래서 SQL 인젝션은 오래전부터 알려졌는데도 지금까지 큰 유출 사고의 원인으로 꼽힙니다. 허락받지 않은 남의 시스템에 이런 입력을 시험해 보는 것은 그 자체로 불법이에요.',
      deep: '피해 범위는 앱의 DB 계정이 가진 권한만큼입니다. 조회 권한만 있어도 다른 표의 데이터를 꺼낼 수 있고, 쓰기·삭제 권한이 있으면 변조·파괴로 이어지며, 자세한 오류 메시지는 표·열 이름 같은 내부 구조를 알려 줍니다. 인젝션은 OWASP Top 10에 꾸준히 들어 있는 항목입니다. 국내에서는 정보통신망법 등에 따라 권한 없는 침입·시도 자체가 처벌 대상이니, 연습은 직접 만든 실습 환경에서만 해야 합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 36, '앱의 DB 권한이 닿는 곳까지 모두 위험해져요', { size: 15, weight: 800 });
        const C = [
          ['h1', 190, 112, '로그인 우회', '관리자·다른 사람 계정으로 들어감', '🔓', 'red'],
          ['h2', 530, 112, '정보 유출', '다른 회원의 개인정보·주문 조회', '📄', 'amber'],
          ['h3', 190, 222, '변경 · 삭제', '값을 고치거나 표를 지우는 명령', '✏️', 'pink'],
          ['h4', 530, 222, '내부 구조 노출', '자세한 오류로 표·열 이름이 드러남', '🔎', 'violet'],
        ];
        for (const [id, x, y, l, s, ic, c] of C) {
          a.node(id, x, y, { label: l, sub: s, icon: ic, color: c, w: 312, h: 90, hidden: true });
          await a.show(id, 300);
          await a.flash(id);
          await a.wait(250);
        }
        a.caption('피해 범위 = 앱 DB 계정의 권한');
        a.text(360, 300, '모두 "입력이 명령이 된다"는 한 가지 실수에서 시작해요', { size: 13, weight: 700, cls: 'muted' });
        await a.wait(400);
        a.note('law', 360, 366, '⚖ 허락받지 않은 시스템에 이런 입력을 시험하는 것은 불법이에요\n연습은 직접 만든 실습 환경에서만!', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ① — 매개변수화 쿼리',
      easy: '안전한 방법은 문장 틀과 입력을 따로 보내는 것입니다. 먼저 "이름은 ?, 비밀번호는 ?인 사람"이라는 틀을 DB에 보내 구조를 확정하고, 그다음 ? 자리에 넣을 값을 보내요. 같은 \' OR \'1\'=\'1 도 이제는 "그런 이상한 비밀번호"일 뿐이라 아무도 찾지 못합니다.',
      deep: 'prepared statement는 자리표시자(?, $1, :name 등)가 있는 문장을 먼저 파싱하고, 바인딩된 값은 구조에 영향을 줄 수 없는 리터럴로만 다룹니다. 서버 측 prepare를 쓰는 드라이버도, 클라이언트에서 안전하게 치환하는 드라이버도 있지만 어느 쪽이든 개발자가 직접 이스케이프할 필요가 없습니다. 예: Java PreparedStatement.setString, Python cursor.execute(sql, (name, pw)), Node pg의 query(text, values). 문자열 이어 붙이기 + 직접 이스케이프는 문자셋·DB 방언 차이로 빈틈이 생기기 쉬워 권장하지 않습니다.',
      async run(a) {
        wipe(a);
        panel(a, 16, 30, 688, 92);
        a.text(30, 46, '// 안전한 방식 — 틀과 값을 따로', { size: 11.5, anchor: 'start', cls: 'muted', mono: true });
        const tq = qline(a, 30, 72, [['SELECT * FROM users WHERE name = ', 'code'], ['?', 'ph'], [' AND pw = ', 'code'], ['?', 'ph']], { hidden: true });
        const vq = qline(a, 30, 100, [['값 1 = ', 'code'], ['"민지"', 'data'], ['   값 2 = ', 'code'], ['"' + OR1 + '"', 'data']], { hidden: true });
        a.node('app', 110, 178, { label: '앱 서버', icon: '🖥️', color: 'violet', w: 130, h: 64 });
        a.node('db', 610, 178, { label: 'DB', sub: '', icon: '🗄️', color: 'teal', w: 130, h: 72, shape: 'db' });
        a.edge('app', 'db');
        a.caption('① 문장 틀을 먼저 보내요');
        await appear(a, tq, 300);
        await a.send('app', 'db', '① 문장 틀', { color: 'violet', dur: 900 });
        a.setNode('db', { sub: '구조 확정' });
        a.badge('db', '틀 고정', 'violet');
        await a.flash('db');
        a.caption('② 값은 따로, 값으로만');
        await appear(a, vq, 300);
        await a.send('app', 'db', '② 값 2개', { color: 'blue', dur: 900 });
        const rows = table(a, 24, 270);
        a.text(410, 234, 'pw가 글자 그대로 "\' OR \'1\'=\'1"인 사람?', { size: 12.5, weight: 700, anchor: 'start', color: 'blue' });
        await scan(a, rows, [], 'green');
        rows.forEach((R) => (R.g.style.opacity = 0.45));
        a.node('res', 540, 320, { label: '로그인 실패 · 0행', sub: '공격 입력이 그냥 이상한 값이 됨', icon: '🛡️', color: 'green', w: 300, h: 92, hidden: true });
        await a.show('res', 300);
        await a.flash('res');
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ② — 겹겹이 지키기',
      easy: '매개변수화가 핵심이고, 그 위에 여러 겹을 더합니다. 들어오는 값이 정해진 모양인지 확인하고, 앱이 쓰는 DB 계정에는 꼭 필요한 권한만 주고, 오류가 나도 내부 사정을 화면에 보여 주지 않아요. 한 겹이 뚫려도 다음 겹이 막아 줍니다.',
      deep: 'ORM·쿼리 빌더의 기본 API는 내부에서 매개변수화를 쓰지만, raw()·문자열 보간 기능을 쓰면 다시 위험해집니다. 표·열 이름이나 ORDER BY 방향처럼 자리표시자로 묶을 수 없는 부분은 코드에 정한 허용 목록에서만 고릅니다. 앱 계정은 SELECT·INSERT 등 필요한 권한만 두고 DROP·관리 권한은 빼며, 사용자에게는 일반 오류 메시지와 추적 번호만, 자세한 내용은 서버 로그에만 남깁니다. WAF는 알려진 패턴을 걸러 시간을 벌어 주지만 우회 사례가 많아 주 방어가 될 수 없습니다.',
      async run(a) {
        wipe(a);
        a.text(250, 34, '겹겹이 지키기 (심층 방어)', { size: 15, weight: 800 });
        const L = [
          ['w', 'WAF (보조)', '알려진 공격 모양을 걸러요 · 우회될 수 있음', '🧱', 'gray'],
          ['v', '입력 검증', '허용 목록: 숫자만, 정해 둔 정렬 열만', '📏', 'teal'],
          ['p', '매개변수화 · ORM', '입력은 끝까지 값 — 핵심 방어', '🛡️', 'green'],
          ['l', 'DB 최소 권한', '앱 계정은 필요한 표·동작만 (DROP 불가)', '🔐', 'blue'],
          ['e', '오류 숨기기', '화면엔 일반 메시지, 자세한 건 서버 로그', '🙈', 'violet'],
        ];
        for (let i = 0; i < L.length; i++) {
          const [id, l, s, ic, c] = L[i];
          a.node(id, 250, 84 + i * 62, { label: `${ic} ${l}`, sub: s, color: c, w: 440, h: 50, hidden: true, size: 14 });
          await a.show(id, 250);
          await a.wait(150);
        }
        // 공격 입력이 오른쪽 길을 따라 내려온다
        a.raw('line', { x1: 600, y1: 60, x2: 600, y2: 360, class: 'edge dashed' }, 'edge');
        a.text(600, 46, '공격 입력', { size: 11.5, weight: 800, color: 'red' });
        const atk = a.packet(OR1, { at: [600, 84], color: 'red', round: 8, h: 26, size: 12 });
        a.caption('WAF가 놓쳐도, 검증을 통과해도…');
        a.badge('w', '통과?', 'amber');
        await a.wait(400);
        await a.move(atk, [600, 146], 500);
        a.badge('v', '통과?', 'amber');
        await a.wait(400);
        await a.move(atk, [600, 208], 500);
        atk.set('✓ 그냥 값', 'green');
        a.badge('p', '여기서 무력화', 'green');
        a.caption('매개변수화에서 그냥 "값"이 되어 무력화돼요');
        await a.flash('p');
        await a.wait(300);
        a.badge('l', '피해 한도', 'blue');
        a.badge('e', '단서 차단', 'violet');
        a.note('n1', 360, 400, '한 겹이 뚫려도 다음 겹이 막도록 — 핵심은 매개변수화, WAF는 보조', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '같은 원리, 다른 인젝션 — 점검표',
      easy: '"데이터를 명령에 섞으면 데이터가 명령이 된다"는 원리는 SQL에만 있지 않아요. 셸 명령, 로그 파일, AI에게 주는 지시문에서도 똑같이 일어납니다. 해결책도 같아요: 데이터와 명령을 섞지 말고, 따로 전달하세요.',
      deep: '명령어 인젝션은 셸을 거치지 않고 인자 배열로 프로그램을 실행(execFile, subprocess.run([...]) 등)해 막습니다. 로그 인젝션은 입력의 줄바꿈·제어 문자를 이스케이프하거나 JSON 같은 구조화 로그를 써서 가짜 로그 줄을 막습니다. 프롬프트 인젝션은 LLM이 지시와 데이터를 구조적으로 구분하지 못해 생기며 아직 완벽한 해법이 없어, 외부 문서를 데이터로 표시하고 모델이 쓸 수 있는 도구·권한을 줄이고 위험한 동작은 사람이 승인하게 합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 34, '공통 원인: 데이터와 명령을 한 줄에 섞는다', { size: 15, weight: 800 });
        const C = [
          ['k1', 126, '명령어 인젝션', '💻', 'amber', 'ping 입력 + "; 다른 명령"', '셸 대신 인자 배열로 실행'],
          ['k2', 360, '로그 인젝션', '📜', 'teal', '입력 속 줄바꿈 → 가짜 로그 줄', '줄바꿈 이스케이프 · JSON 로그'],
          ['k3', 594, '프롬프트 인젝션', '🤖', 'violet', '문서 속 "앞 지시는 무시해"', '지시·데이터 분리 · 권한 축소'],
        ];
        for (const [id, x, l, ic, c, ex, fix] of C) {
          const n = a.node(id, x, 152, { label: '', color: c, w: 220, h: 172, hidden: true });
          a.text(0, -62, ic, { size: 22, par: n.g });
          a.text(0, -34, l, { size: 15, weight: 800, par: n.g });
          a.text(0, -6, '예', { size: 11, weight: 800, cls: 'muted', par: n.g });
          a.text(0, 14, ex, { size: 11.5, weight: 600, par: n.g });
          a.raw('line', { x1: -84, y1: 34, x2: 84, y2: 34, style: 'stroke:var(--line2)' }, n.g);
          a.text(0, 52, '막기', { size: 11, weight: 800, cls: 'muted', par: n.g });
          a.text(0, 70, fix, { size: 11.5, weight: 700, color: 'green', par: n.g });
          await a.show(id, 300);
          await a.wait(300);
        }
        a.text(594, 252, '※ 프롬프트 인젝션은 아직 완벽한 해법 없음', { size: 11, weight: 700, cls: 'muted' });
        await a.wait(300);
        a.caption('마지막으로 점검표');
        a.note('chk', 360, 340, '✔ 매개변수화 쿼리(ORM 기본 기능) · ✔ 식별자는 허용 목록\n✔ DB 계정 최소 권한 · ✔ 오류는 숨기고 로그로 · ✔ WAF는 보조\n✔ 허락 없이 남의 시스템에 시험하지 않기 (불법)', { color: 'green', w: 560 });
        await a.wait(900);
      },
    },
  ],
};

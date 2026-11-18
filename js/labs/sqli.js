// SQL 인젝션 실험실: 입력값 · 쿼리 방식 · DB 최소 권한 · 자세한 오류를 바꿔 가며 같은 로그인 요청을 보내 본다.
// 결과는 입력과 설정으로 정해진다(무작위 없음). 공격 입력은 교과서 예시만 쓰고, 표는 가상의 실습용 데이터다.
const USERS = [[1, 'admin', '관리자'], [2, '민지', '회원'], [3, '서준', '회원'], [4, '하은', '회원'], [5, '도윤', '회원'], [6, '지우', '회원']];
const MASK = '●●●●';
const PRE = "SELECT * FROM users WHERE name = '";
const MID = "' AND pw = '";
// 입력 종류: 폼에 들어가는 이름·비밀번호, 이어 붙였을 때 돌려받는 행
const INPUTS = {
  ok: { name: '민지', pw: MASK, rows: [1], short: '민지 / ●●●●' },
  none: { name: '철수', pw: MASK, rows: [], short: '철수 / ●●●●' },
  or: { name: '민지', pw: "' OR '1'='1", rows: [0, 1, 2, 3, 4, 5], short: "비번에 ' OR …", attack: true },
  cmt: { name: "민지' --", pw: MASK, rows: [1], short: "이름에 민지' --", attack: true },
  drop: { name: "'; DROP TABLE users; --", pw: MASK, rows: [], short: '이름에 DROP …', attack: true },
};
const ATTACKS = ['or', 'cmt', 'drop'];
const tint = (c, p = 30) => `color-mix(in srgb, var(--${c}) ${p}%, var(--panel2))`;

/** 이어 붙인 문장을 한 글자씩 읽어 입력이 값(문자열 안)에 머무는지, 명령으로 빠져나갔는지 나눈다 */
function analyze(parts) {
  const ch = [];
  parts.forEach(([s, inp], pi) => [...s].forEach((c) => ch.push({ c, inp, pi })));
  let st = 'code';
  const broken = new Set();
  for (let i = 0; i < ch.length; i++) {
    const x = ch[i], n = ch[i + 1] && ch[i + 1].c;
    let cmt = st === 'cmt';
    if (st === 'str') {
      if (x.c === "'" && n === "'") { x.kind = ch[i + 1].kind = x.inp ? 'data' : 'code'; i++; continue; }
      if (x.c === "'") { st = 'code'; if (x.inp) broken.add(x.pi); }
    } else if (st === 'code') {
      if (x.c === "'") st = 'str';
      else if (x.c === '-' && n === '-') { st = 'cmt'; cmt = true; }
    }
    x.kind = x.inp ? (broken.has(x.pi) ? 'esc' : cmt ? 'dead' : 'data') : cmt ? 'dead' : 'code';
  }
  const out = [];
  for (const x of ch) {
    if (out.length && out[out.length - 1][1] === x.kind) out[out.length - 1][0] += x.c;
    else out.push([x.c, x.kind]);
  }
  return { segs: out, escaped: broken.size > 0 };
}
const KIND = { code: '', data: 'tc-blue', esc: 'tc-red', dead: 'muted', ph: 'tc-violet' };

// 배치
const NY = 54;
const FORM_OUT = [167, NY], APP_IN = [293, NY], APP_OUT = [427, NY], DB_IN = [547, NY];
const TX = 16, TY = 222, RH = 26;
const COLS = [['id', 40], ['name', 84], ['pw', 80], ['role', 80]];
const TW = COLS.reduce((s, c) => s + c[1], 0);

/** 지금 설정(스냅숏)으로 무엇이 일어나는지 계산한다 */
function outcome(c) {
  const I = INPUTS[c.inp];
  if (c.mode === 'param') {
    const rows = c.inp === 'ok' ? [1] : [];
    if (I.attack) return { kind: 'blockP', rows, color: 'green' };
    return { kind: rows.length ? 'ok' : 'fail', rows, color: 'green' };
  }
  const { escaped } = analyze([[PRE, false], [I.name, true], [MID, false], [I.pw, true], ["'", false]]);
  if (c.inp === 'drop') return { kind: c.lp ? 'blockL' : 'drop', rows: [], color: c.lp ? 'green' : 'red', escaped };
  if (c.inp === 'or') return { kind: 'leak', rows: I.rows, color: 'red', escaped };
  if (c.inp === 'cmt') return { kind: 'bypass', rows: I.rows, color: 'red', escaped };
  return { kind: I.rows.length ? 'ok' : 'fail', rows: I.rows, color: 'green', escaped };
}

export default {
  id: 'sqli',
  title: 'SQL 인젝션 실험실',
  intro: '가상의 로그인 화면에 여러 입력을 넣어 보내 봅니다. 문자열 이어 붙이기에서는 따옴표·주석이 문장의 구조를 바꾸고(빨간 글자), 매개변수화 쿼리에서는 같은 입력이 끝까지 값(파란 글자)으로만 쓰입니다. DB 최소 권한은 피해를 줄일 뿐 인젝션 자체를 막지는 못한다는 점도 확인해 보세요. 여기 입력은 교과서 예시이며, 허락받지 않은 실제 시스템에 시험하는 것은 불법입니다.',
  controls: [
    { type: 'radio', key: 'inp', label: '입력값', options: [['ok', '정상 (민지)'], ['none', '없는 이름'], ['or', "' OR '1'='1"], ['cmt', "민지' --"], ['drop', "'; DROP TABLE users; --"]] },
    { type: 'radio', key: 'mode', label: '쿼리 방식', options: [['concat', '문자열 이어 붙이기'], ['param', '매개변수화 쿼리']] },
    { type: 'toggle', key: 'lp', label: 'DB 계정 최소 권한' },
    { type: 'toggle', key: 'err', label: '자세한 오류 메시지 보여 주기' },
    { type: 'button', label: '보내기', run: (s) => { s.want = true; } },
  ],
  init: () => ({
    inp: 'ok', mode: 'concat', lp: false, err: true,
    sent: 0, bypass: 0, exposed: 0, blocked: 0,
    gen: 0, want: true, busy: false, lastEnd: -1e9,
    orAll: 0, orParam0: 0, cmtBypass: 0, paramBlocked: [],
  }),
  onChange(key, s) {
    s.gen++;
    s.orAll = 0; s.orParam0 = 0; s.cmtBypass = 0;
    if (key === 'mode' && s.mode === 'concat') s.paramBlocked = [];
    s.want = true;
    if (s.preview) s.preview();
  },
  setup(a, s) {
    a.node('form', 92, NY, { label: '로그인 폼', sub: '', icon: '📝', color: 'blue', w: 150, h: 64 });
    a.node('app', 360, NY, { label: '앱 서버', sub: '', icon: '🖥️', color: 'violet', w: 128, h: 64 });
    a.node('db', 610, NY, { label: 'DB', sub: '', icon: '🗄️', color: 'teal', w: 120, h: 70, shape: 'db' });
    a.edge('form', 'app');
    a.edge('app', 'db');
    // 문장 패널
    a.raw('rect', { x: 16, y: 102, width: 688, height: 64, rx: 10, style: 'fill:var(--panel2);stroke:var(--line2)' }, 'edge');
    const line = (y) => { const t = a.text(30, y, '', { size: 12.5, mono: true, anchor: 'start', weight: 600 }); t.style.whiteSpace = 'pre'; return t; };
    const L1 = line(123), L2 = line(148);
    const lg = a.text(704, 184, '', { size: 11, anchor: 'end', weight: 700 });
    lg.style.whiteSpace = 'pre';
    [['■ ', 'tc-blue'], ['값(데이터)   ', ''], ['■ ', 'tc-red'], ['명령이 된 입력   ', ''], ['■ ', 'muted'], ['주석 처리   ', ''], ['■ ', 'tc-violet'], ['자리표시자', '']]
      .forEach(([t, c]) => { const sp = a.raw('tspan', { class: c }, lg); sp.textContent = t; });
    const fill = (t, segs) => {
      t.replaceChildren();
      for (const [str, k] of segs) {
        const sp = a.raw('tspan', { class: KIND[k] || '', 'font-weight': k === 'data' || k === 'esc' || k === 'ph' ? 800 : null }, t);
        sp.textContent = str;
      }
    };
    // users 표
    const tTitle = a.text(TX, TY - 26, 'users 표', { size: 12, weight: 800, anchor: 'start', cls: 'muted' });
    const mkRow = (y, cells, head) => {
      const g = a.raw('g', {}, 'node');
      const r = a.raw('rect', { x: TX, y: y - RH / 2, width: TW, height: RH, rx: head ? 5 : 0, style: `fill:${head ? tint('blue', 22) : 'var(--panel2)'};stroke:var(--line2);stroke-width:1` }, g);
      let cx = TX;
      cells.forEach((v, k) => { a.text(cx + COLS[k][1] / 2, y, String(v), { size: head ? 11.5 : 12, par: g, weight: head ? 800 : k === 1 ? 700 : 400, mono: head || k === 0, cls: !head && k === 2 ? 'muted' : '' }); cx += COLS[k][1]; });
      return { g, r };
    };
    mkRow(TY, COLS.map((c) => c[0]), true);
    const rows = USERS.map(([id, n, role], i) => mkRow(TY + RH * (i + 1), [id, n, MASK, role], false));
    const paintRows = (hits = [], color) => rows.forEach((R, i) => R.r.style.setProperty('fill', hits.includes(i) ? tint(color, 36) : 'var(--panel2)'));
    // 결과 카드
    a.node('res', 524, 290, { label: '보내기 전', sub: '', icon: '⏳', color: 'gray', w: 320, h: 104 });
    const resx = a.text(524, 366, '', { size: 11.5, weight: 700, mono: true });

    const cfg = () => ({ inp: s.inp, mode: s.mode, lp: s.lp, err: s.err });
    const draw = (c) => {
      const I = INPUTS[c.inp];
      a.setNode('form', { sub: I.short });
      a.setNode('app', { sub: c.mode === 'param' ? '매개변수화' : '이어 붙이기' });
      a.setNode('db', { sub: c.lp ? '최소 권한 계정' : '모든 권한 계정' });
      if (c.mode === 'param') {
        fill(L1, [['SELECT * FROM users WHERE name = ', 'code'], ['?', 'ph'], [' AND pw = ', 'code'], ['?', 'ph']]);
        fill(L2, [['값 → ', 'dead'], ['"' + I.name + '"', 'data'], [' , ', 'code'], ['"' + I.pw + '"', 'data'], ['   (따로 전송)', 'dead']]);
      } else {
        fill(L1, analyze([[PRE, false], [I.name, true], [MID, false], [I.pw, true], ["'", false]]).segs);
        fill(L2, [['↳ 입력을 그대로 이어 붙인 한 문장으로 전송', 'dead']]);
      }
    };
    s.preview = () => draw(cfg());
    s.preview();

    const setRes = (o) => {
      a.setNode('res', { label: o.label, sub: o.sub, icon: o.icon, color: o.color });
      resx.textContent = o.x || '';
      resx.setAttribute('class', 'tx mono ' + (o.xc || 'muted'));
    };

    s.fire = async () => {
      s.busy = true;
      s.want = false;
      const c = cfg(), gen = s.gen;
      draw(c);
      paintRows();
      a.badge('db', '');
      tTitle.textContent = 'users 표';
      tTitle.setAttribute('class', 'tx muted');
      setRes({ label: '요청 처리 중…', sub: '', icon: '⏳', color: 'gray' });
      s.sent++;
      // 폼 → 앱 서버
      const p = await a.send(FORM_OUT, APP_IN, '', { color: 'blue', dur: 450, keep: true, w: 16, h: 16 });
      a.remove(p);
      await a.flash('app');
      // 앱 서버 → DB
      if (c.mode === 'param') {
        await a.send(APP_OUT, DB_IN, '① 틀', { color: 'violet', dur: 420, h: 22 });
        await a.send(APP_OUT, DB_IN, '② 값', { color: 'blue', dur: 420, h: 22 });
      } else {
        await a.send(APP_OUT, DB_IN, 'SQL', { color: c.inp === 'ok' || c.inp === 'none' ? 'violet' : 'red', dur: 600, h: 22 });
      }
      await a.flash('db');
      const o = outcome(c);
      // DB가 행을 고른다
      const hits = [];
      for (let i = 0; i < rows.length; i++) {
        rows[i].r.style.setProperty('fill', tint('amber', 28));
        await a.wait(70);
        if (o.rows.includes(i)) hits.push(i);
        paintRows(hits, o.color);
      }
      let dropped = false;
      if (o.kind === 'drop') {
        dropped = true;
        a.badge('db', 'DROP 실행', 'red');
        tTitle.textContent = 'users 표 — 삭제됨!';
        tTitle.setAttribute('class', 'tx tc-red');
        await a.par(...rows.map((R) => a.tween(400, (k) => (R.g.style.opacity = 1 - 0.85 * k))));
      } else if (o.kind === 'blockL') {
        a.badge('db', '권한 없음', 'green');
      }
      await a.wait(150);
      // 응답 DB → 앱 → 폼
      const r = await a.send(DB_IN, APP_OUT, '', { color: o.color === 'red' ? 'red' : 'green', dur: 380, keep: true, w: 14, h: 14 });
      await a.move(r, APP_IN, 0);
      await a.move(r, FORM_OUT, 380);
      await a.fadeOut(r, 150);
      // 결과
      const n = o.rows.length;
      const fresh = gen === s.gen;
      if (o.kind === 'ok') setRes({ label: '✓ 정상 로그인', sub: '민지 한 사람만 찾음 (1행)', icon: '🙂', color: 'green' });
      else if (o.kind === 'fail') setRes({ label: '✓ 정상 — 로그인 실패', sub: '그런 사용자가 없음 (0행)', icon: '🙂', color: 'teal' });
      else if (o.kind === 'leak') {
        setRes({ label: '✗ 로그인 우회 · 정보 노출', sub: `admin(첫 행)으로 로그인 · ${n}행 노출`, icon: '🚨', color: 'red', x: c.lp ? '최소 권한도 같은 표 읽기는 못 막아요' : '' });
        s.bypass++; s.exposed += n;
        if (fresh) s.orAll++;
      } else if (o.kind === 'bypass') {
        setRes({ label: '✗ 로그인 우회', sub: '-- 뒤 비밀번호 확인이 주석이 됨', icon: '🚨', color: 'red', x: '민지 계정으로 로그인 (1행 노출)' , xc: 'tc-red' });
        s.bypass++; s.exposed += n;
        if (fresh) s.cmtBypass++;
      } else if (o.kind === 'drop') {
        setRes({ label: '✗ 데이터 삭제', sub: '두 번째 문장 DROP TABLE이 실행됨', icon: '💥', color: 'red', x: '실험용이라 잠시 뒤 백업에서 복구해요', xc: 'tc-red' });
        s.bypass++;
      } else if (o.kind === 'blockL') {
        s.blocked++;
        if (c.err) setRes({ label: '삭제는 막음 · 오류는 노출', sub: '최소 권한 덕분에 DROP 거부', icon: '⚠️', color: 'amber', x: 'ERROR: permission denied for table users', xc: 'tc-amber' });
        else setRes({ label: '차단 (최소 권한)', sub: 'DROP 거부 · 화면엔 일반 오류만', icon: '🛡️', color: 'green', x: '오류가 났어요 (요청 번호 #' + (1000 + s.sent) + ')' });
      } else if (o.kind === 'blockP') {
        s.blocked++;
        setRes({ label: '차단 — 그냥 이상한 값', sub: '입력이 값으로만 쓰여 0행 · 로그인 실패', icon: '🛡️', color: 'green' });
        if (fresh) {
          if (c.inp === 'or' && n === 0) s.orParam0++;
          if (!s.paramBlocked.includes(c.inp)) s.paramBlocked.push(c.inp);
        }
      }
      await a.flash('res');
      if (dropped) {
        await a.wait(1400);
        await a.par(...rows.map((R) => a.tween(400, (k) => (R.g.style.opacity = 0.15 + 0.85 * k))));
        tTitle.textContent = 'users 표 (백업에서 복구)';
        tTitle.setAttribute('class', 'tx muted');
        a.badge('db', '');
      }
      s.busy = false;
      s.lastEnd = a.now();
    };

    // 보내기 버튼·조작 변경이면 바로, 아니면 잠시 쉬었다가 같은 요청을 다시 보낸다
    a.every(200, () => {
      if (s.busy) return;
      if (s.want || a.now() - s.lastEnd > 1800) s.fire();
    });
  },
  stats: (s) => [
    ['보낸 요청', s.sent],
    ['우회 성공', s.bypass, s.bypass ? 'red' : ''],
    ['노출된 행', s.exposed, s.exposed ? 'amber' : ''],
    ['막은 공격', s.blocked, s.blocked ? 'green' : ''],
  ],
  tasks: [
    { t: "문자열 이어 붙이기로 ' OR '1'='1 을 보내 전체 행이 노출되는 것 보기", check: (s) => s.mode === 'concat' && s.inp === 'or' && s.orAll >= 1 },
    { t: '매개변수화 쿼리로 바꾸면 같은 입력이 0행이 되는지 확인하기', check: (s) => s.mode === 'param' && s.inp === 'or' && s.orParam0 >= 1 },
    { t: "민지' -- 로 비밀번호 확인을 주석으로 지워 로그인 우회 보기", check: (s) => s.mode === 'concat' && s.inp === 'cmt' && s.cmtBypass >= 1 },
    { t: '공격 입력 3종(OR · 주석 · DROP)을 모두 매개변수화 쿼리로 막기', check: (s) => ATTACKS.every((k) => s.paramBlocked.includes(k)) },
  ],
};

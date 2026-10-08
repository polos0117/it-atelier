// SQL 조인과 트랜잭션: 두 표 → INNER JOIN → LEFT JOIN → 송금 중 장애 → BEGIN/COMMIT/ROLLBACK → ACID → 동시 구매(갱신 분실) → 행 잠금
// 단계마다 무대를 새로 그린다. 표의 값은 설명용 예시(고정)이다.
const USERS = [[1, '민지', 'blue'], [2, '서준', 'green'], [3, '하은', 'violet'], [4, '도윤', 'amber']];
const ORDERS = [[101, 1, '커피'], [102, 3, '책'], [103, 1, '케이크'], [104, 2, '펜']];
const RH = 30, HY = 120;
const UT = { x: 24, cols: [48, 84] };
const OT = { x: 196, cols: [64, 84, 84] };
const RT = { x: 476, cols: [108, 112] };
const colorOf = (uid) => USERS[uid - 1][2];
const tint = (c, p = 28) => `color-mix(in srgb, var(--${c}) ${p}%, var(--panel2))`;

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }

/** 표 머리줄을 그리고 표 정보를 돌려준다. 행은 addRow로 붙인다 */
function table(a, spec, title, head) {
  const T = { x: spec.x, cols: spec.cols, w: spec.cols.reduce((s, v) => s + v, 0), rows: [] };
  T.cx = (k) => T.x + T.cols.slice(0, k).reduce((s, v) => s + v, 0) + T.cols[k] / 2;
  a.text(T.x, HY - 32, title, { size: 13, weight: 800, anchor: 'start', mono: true });
  const hg = a.raw('g', {}, 'node');
  a.raw('rect', { x: T.x, y: HY - RH / 2, width: T.w, height: RH, rx: 4, style: `fill:${tint('blue', 22)};stroke:var(--line2)` }, hg);
  head.forEach((h, k) => a.text(T.cx(k), HY, h, { size: 12.5, weight: 800, par: hg, mono: true }));
  return T;
}
/** cells: 값 또는 [값, 색] */
function addRow(a, T, cells, o = {}) {
  const i = T.rows.length, y = HY + RH * (i + 1);
  const g = a.raw('g', {}, 'node');
  const r = a.raw('rect', { x: T.x, y: y - RH / 2, width: T.w, height: RH, style: 'fill:var(--panel2);stroke:var(--line2);stroke-width:1' }, g);
  const ts = cells.map((c, k) => {
    const [s, color] = Array.isArray(c) ? c : [c];
    return a.text(T.cx(k), y, String(s), { size: 13, par: g, weight: color || k === o.bold ? 700 : 400, color, mono: typeof s === 'number' || s === 'NULL' });
  });
  if (o.hidden) g.style.opacity = 0;
  const R = { g, r, ts, y };
  T.rows.push(R);
  return R;
}
const paint = (R, c, p) => R.r.style.setProperty('fill', c ? tint(c, p) : 'var(--panel2)');

function joinTables(a) {
  const U = table(a, UT, 'users', ['id', 'name']);
  USERS.forEach(([id, n, c]) => addRow(a, U, [[id, c], n], { bold: 1 }));
  const O = table(a, OT, 'orders', ['id', 'user_id', 'item']);
  ORDERS.forEach(([id, uid, it]) => addRow(a, O, [id, [uid, colorOf(uid)], it]));
  return { U, O };
}
function chipAt(a, label, x, y, color) { return a.packet(label, { at: [x, y], color, h: 22, size: 11.5, w: label.length * 13 + 16 }); }

/* ---------- 송금 ---------- */
function code(a, lines, tag) {
  const h = 16 + 26 * lines.length;
  a.raw('rect', { x: 24, y: 40, width: 672, height: h, rx: 10, style: 'fill:var(--panel2);stroke:var(--line2)' }, 'edge');
  const ts = lines.map((s, i) => a.text(56, 61 + 26 * i, s, { size: 12.5, mono: true, anchor: 'start', weight: 600 }));
  a.text(38, 61, '▶', { id: 'mk', size: 12, color: 'amber', hidden: true });
  if (tag) a.text(684, 61, tag, { id: 'tag', size: 11.5, anchor: 'end', cls: 'muted', weight: 700 });
  return ts;
}
function mark(a, ts, i, color = 'amber') {
  const mk = a.get('mk');
  mk.style.opacity = 1;
  mk.setAttribute('y', 61 + 26 * i);
  mk.setAttribute('class', `tx tc-${color}`);
  ts.forEach((t, k) => t.setAttribute('class', 'tx mono' + (k < i ? ' tc-green' : k === i ? ` tc-${color}` : '')));
}
const AY = 262;
function accounts(a, y = AY) {
  a.node('A', 190, y, { label: 'A 계좌', sub: '50만 원', icon: '🏦', color: 'blue', w: 168, h: 78 });
  a.node('B', 530, y, { label: 'B 계좌', sub: '20만 원', icon: '🏦', color: 'green', w: 168, h: 78 });
  a.edge('A', 'B', { dashed: true, label: '민지 → 서준 10만 원', ly: -14 });
  a.text(360, 356, '두 계좌 합계 70만 원', { id: 'tot', size: 15, weight: 800 });
}
const SQL_A = "UPDATE accounts SET balance = balance - 100000 WHERE id = 'A';";
const SQL_B = "UPDATE accounts SET balance = balance + 100000 WHERE id = 'B';";
const money = (a, id, from, to, dur = 500) => a.tween(dur, (k) => a.setNode(id, { sub: `${Math.round(from + (to - from) * k)}만 원` }));

/* ---------- 동시성 타임라인 ---------- */
const LY = { t1: 150, row: 250, t2: 350 };
function lanes(a, title) {
  wipe(a);
  a.text(360, 40, title, { size: 15, weight: 800 });
  a.node('L1', 62, LY.t1, { label: '민지', sub: 'T1', color: 'blue', w: 92, h: 48, shape: 'person' });
  a.node('Lr', 62, LY.row, { label: '재고 행', sub: 'products', color: 'gray', w: 92, h: 48 });
  a.node('L2', 62, LY.t2, { label: '서준', sub: 'T2', color: 'green', w: 92, h: 48, shape: 'person' });
  for (const y of Object.values(LY)) a.raw('line', { x1: 122, y1: y, x2: 704, y2: y, class: 'edge dashed' }, 'zone');
  a.text(704, 96, '시간 →', { size: 11.5, anchor: 'end', cls: 'muted', weight: 700 });
  const now = a.raw('line', { x1: 130, y1: 108, x2: 130, y2: 388, style: 'stroke:var(--accent);stroke-width:1.5;opacity:.55' }, 'zone');
  a.packet('1개', { at: [150, LY.row], color: 'gray', w: 40, h: 24, size: 12 });
  return { x: 130, now, lock: null, wait: null };
}
/** 시간 막대(now)를 x까지 옮기며, 잠금·대기 막대도 함께 늘린다 */
function adv(a, T, x, dur = 420) {
  const x0 = T.x;
  return a.tween(dur, (k) => {
    const cx = x0 + (x - x0) * k;
    T.x = cx;
    T.now.setAttribute('x1', cx); T.now.setAttribute('x2', cx);
    for (const b of [T.lock, T.wait]) if (b && b.on) b.r.setAttribute('width', Math.max(0, cx - b.x0));
  });
}
/** 한 트랜잭션의 사건: 레인 위 칩 + 행과의 화살표(read: 행→레인, write: 레인→행) */
async function ev(a, lane, x, label, color, o = {}) {
  const ly = LY[lane], up = ly < LY.row;
  const yl = ly + (up ? 15 : -15), yr = LY.row + (up ? -15 : 15);
  if (o.dir) {
    const [y1, y2] = o.dir === 'read' ? [yr, yl] : [yl, yr];
    a.raw('line', { x1: x, y1, x2: x, y2, class: `edge ec-${o.arrow || color}` + (o.dashed ? ' dashed' : ''), 'marker-end': 'url(#ah)' }, 'edge');
  }
  const p = a.packet(label, { at: [x, ly], color, w: o.w, h: 26, size: 12 });
  p.g.style.opacity = 0;
  await a.tween(220, (k) => (p.g.style.opacity = k));
  if (o.val != null) {
    const v = a.packet(o.val, { at: [x, LY.row], color: o.vcolor || 'gray', w: 40, h: 24, size: 12 });
    v.g.style.opacity = 0;
    await a.tween(220, (k) => (v.g.style.opacity = k));
  }
  return p;
}
function bandRect(a, x0, y, color) {
  const r = a.raw('rect', { x: x0, y: y - 15, width: 0, height: 30, rx: 6, style: `fill:${tint(color, 22)};stroke:var(--${color});stroke-width:1.5;stroke-dasharray:4 3` }, 'edge');
  return { r, x0, on: true };
}

export default {
  id: 'sqltx',
  level: 3,
  cat: '데이터베이스',
  title: 'SQL 조인과 트랜잭션 — 표를 잇고, 한 번에 처리하기',
  sub: '흩어진 표를 번호로 이어 붙이고, 여러 변경을 "전부 아니면 전무"로 묶는 방법',
  analogy: '표 잇기는 회원 명부와 주문 장부를 회원 번호로 맞춰 보는 일과 같습니다. 트랜잭션은 은행의 이체 전표처럼, 출금과 입금이 둘 다 처리돼야 확정되고 중간에 문제가 생기면 전표째 없던 일이 됩니다. 마지막 남은 물건을 두 사람이 동시에 집으면, 먼저 집은 사람이 계산을 끝낼 때까지 다른 사람은 기다려야 하죠.',
  keys: [
    '관계형 DB는 데이터를 여러 표로 나눠 저장하고, 외래 키(예: orders.user_id → users.id)로 서로 연결한다.',
    'JOIN은 ON 조건으로 두 표의 행을 짝지어 하나의 결과 표를 만든다. INNER JOIN은 짝이 있는 행만, LEFT JOIN은 왼쪽 표의 모든 행을 남기고 짝이 없으면 NULL로 채운다.',
    '트랜잭션(BEGIN … COMMIT)으로 묶은 문장들은 전부 반영되거나 하나도 반영되지 않는다. 실패하면 ROLLBACK으로 시작 전 상태로 돌아간다.',
    'ACID는 원자성·일관성·격리성·지속성이다. 지속성은 WAL(로그를 먼저 디스크에 쓰기)로, 격리성은 잠금·MVCC로 구현한다.',
    '동시에 같은 행을 읽고 고치면 갱신 분실이 생길 수 있다. SELECT … FOR UPDATE 같은 행 잠금이나 더 높은 격리 수준으로 막는다.',
  ],
  terms: [
    ['JOIN', '두 표의 행을 조건(ON)에 맞춰 짝지어 하나의 결과로 합치는 SQL'],
    ['외래 키(FK)', '다른 표의 기본 키를 가리키는 열. 예: orders.user_id → users.id'],
    ['NULL', '"값이 없음"을 뜻하는 특별한 표시. 0이나 빈 글자와는 다르다'],
    ['트랜잭션', '여러 SQL 문장을 하나의 작업 단위로 묶은 것 (BEGIN … COMMIT / ROLLBACK)'],
    ['ROLLBACK', '트랜잭션 안에서 한 변경을 모두 취소하고 시작 전 상태로 되돌리기'],
    ['격리 수준', '동시에 실행되는 트랜잭션끼리 서로의 변경을 얼마나 볼 수 있는지 정한 단계'],
    ['행 잠금', '한 트랜잭션이 쓰는 행을, 다른 트랜잭션이 끝날 때까지 고치지 못하게 막는 것'],
  ],
  quiz: [
    { q: '송금 두 문장을 BEGIN … COMMIT으로 묶었는데 중간에 서버가 꺼졌습니다. 다시 켜졌을 때 계좌는?', c: ['A에서 뺀 돈은 그대로 두고, B에는 나중에 자동으로 더해 준다', '두 변경 모두 취소되어 송금 전 상태로 돌아간다', '꺼지기 직전까지 실행된 첫 문장만 확정된다', '서버가 꺼지는 일 자체를 트랜잭션이 막아 준다'], a: 1, why: '트랜잭션은 "전부 아니면 전무"입니다. COMMIT까지 가지 못한 트랜잭션은 복구 과정에서 ROLLBACK되어 시작 전 상태가 됩니다.', step: 4 },
    { q: '주문이 하나도 없는 사용자 "도윤"은 users LEFT JOIN orders 결과에서 어떻게 나올까요?', c: ['결과에서 빠진다', '다른 사용자의 주문과 짝지어진다', 'item 칸이 NULL인 행으로 한 번 나온다', '짝이 없어서 쿼리 전체가 오류로 끝난다'], a: 2, why: 'LEFT JOIN은 왼쪽 표(users)의 모든 행을 남기고, 짝이 없으면 오른쪽 열을 NULL로 채웁니다. INNER JOIN이라면 빠집니다.', step: 2 },
    { q: '재고를 읽고 나서 1을 빼는 두 트랜잭션이 동시에 실행될 때, 마지막 1개가 한 번만 팔리게 하는 방법은?', c: ['SELECT … FOR UPDATE로 행을 잠그고 읽은 뒤 확인하고 줄인다', '격리 수준을 READ UNCOMMITTED로 낮춘다', '일반 SELECT를 두 번 실행해 값이 같은지 확인한다', 'COMMIT을 늦게 해서 다른 트랜잭션이 못 보게 한다'], a: 0, why: 'FOR UPDATE는 읽는 순간 행에 배타 잠금을 걸어, 다른 트랜잭션은 잠금이 풀린 뒤 바뀐 재고(0)를 보게 됩니다. 격리 수준을 낮추면 이상 현상이 오히려 늘어납니다.', step: 7 },
  ],
  setup(a) {
    joinTables(a);
  },
  steps: [
    {
      t: '두 개의 표 — users와 orders',
      easy: '회원 정보는 users 표에, 주문은 orders 표에 따로 적습니다. 주문 표에는 이름 대신 회원 번호(user_id)만 적어 두는데, 이 번호가 "누구의 주문인지"를 알려 주는 연결 고리예요. 같은 색끼리 같은 사람입니다.',
      deep: '관계형 DB는 같은 정보를 여러 곳에 복사하지 않도록 표를 나눕니다(정규화). users.id는 각 행을 구별하는 기본 키(PK)이고, orders.user_id는 그 값을 가리키는 외래 키(FK)입니다. FOREIGN KEY 제약을 걸면 없는 사용자 번호로 주문이 들어가는 것을 DB가 막아 주고(참조 무결성), 이름이 바뀌어도 users 한 곳만 고치면 됩니다.',
      async run(a) {
        wipe(a);
        const { U, O } = joinTables(a);
        [...U.rows, ...O.rows].forEach((R) => (R.g.style.opacity = 0));
        a.caption('회원은 users에, 주문은 orders에 따로 저장해요');
        for (let i = 0; i < 4; i++) await a.par(a.show(U.rows[i].g, 180), a.show(O.rows[i].g, 180));
        a.node('pk', 120, 338, { label: 'users.id', sub: '기본 키 (PK)', color: 'blue', w: 150, h: 54, size: 13.5 });
        a.node('fk', 330, 338, { label: 'orders.user_id', sub: '외래 키 (FK)', color: 'violet', w: 160, h: 54, size: 13.5 });
        a.edge('fk', 'pk', { label: '가리킴' });
        for (const [uid, , c] of USERS) {
          paint(U.rows[uid - 1], c);
          O.rows.forEach((R, i) => { if (ORDERS[i][1] === uid) paint(R, c); });
          await a.wait(420);
          paint(U.rows[uid - 1]);
          O.rows.forEach((R) => paint(R));
        }
        a.note('n1', 586, 200, 'user_id = 누구의 주문?\n같은 색 = 같은 사람', { color: 'blue' });
        await a.wait(500);
      },
    },
    {
      t: 'INNER JOIN — 번호로 짝짓기',
      easy: '"주문마다 주인의 이름을 붙여 보여 줘"라고 하면, DB는 주문의 회원 번호를 들고 users 표에서 같은 번호를 찾아 이름을 붙입니다. 짝이 맞는 것만 결과 표에 들어가서, 주문이 없는 도윤은 빠져요.',
      deep: 'INNER JOIN은 ON 조건(u.id = o.user_id)을 만족하는 행 쌍만 결과로 냅니다. 한 사용자가 주문이 둘이면 그 사용자 이름이 두 번 나오는 것(1:N)이 정상입니다. DB는 표 크기와 인덱스를 보고 중첩 루프(Nested Loop)·해시 조인·병합 조인 중 하나를 고르며, 조인 열(orders.user_id)에 인덱스가 있으면 짝을 빠르게 찾습니다.',
      async run(a) {
        wipe(a);
        const { U, O } = joinTables(a);
        a.text(360, 30, 'SELECT u.name, o.item FROM users u JOIN orders o ON u.id = o.user_id', { size: 12, mono: true, weight: 700 });
        const R = table(a, RT, '결과', ['name', 'item']);
        for (let i = 0; i < ORDERS.length; i++) {
          const [, uid, item] = ORDERS[i], c = colorOf(uid), name = USERS[uid - 1][1];
          paint(O.rows[i], 'amber');
          const k = chipAt(a, String(uid), O.cx(1), O.rows[i].y, c);
          await a.move(k, [U.cx(0), U.rows[uid - 1].y], 450);
          await a.fadeOut(k, 120);
          paint(U.rows[uid - 1], c);
          const row = addRow(a, R, [[name, c], item], { hidden: true });
          const n = chipAt(a, name, U.cx(1), U.rows[uid - 1].y, c);
          const it = chipAt(a, item, O.cx(2), O.rows[i].y, 'amber');
          await a.par(a.move(n, [R.cx(0), row.y], 520), a.move(it, [R.cx(1), row.y], 520));
          a.remove(n); a.remove(it);
          row.g.style.opacity = 1;
          paint(row, c, 14);
          paint(O.rows[i]); paint(U.rows[uid - 1]);
        }
        U.rows[3].g.style.opacity = 0.4;
        a.note('n1', 360, 370, '도윤(4)은 주문이 없어 결과에 없어요\nINNER JOIN = 짝이 있는 행만', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: 'LEFT JOIN — 짝이 없어도 왼쪽은 모두',
      easy: 'LEFT JOIN은 "왼쪽 표(users)의 사람은 한 명도 빠뜨리지 마"라는 뜻입니다. 주문이 없는 도윤도 결과에 나오고, 주문 칸은 "값 없음"을 뜻하는 NULL로 채워져요.',
      deep: 'LEFT (OUTER) JOIN은 왼쪽 표의 모든 행을 남기고, 짝이 없으면 오른쪽 열을 NULL로 채웁니다. 여기에 WHERE o.id IS NULL을 붙이면 "주문이 한 번도 없는 사용자"만 찾을 수 있습니다(안티 조인). 주의: 오른쪽 표 조건을 WHERE에 쓰면(WHERE o.item = \'펜\') NULL 행이 걸러져 사실상 INNER JOIN이 되므로, 그런 조건은 ON 절에 넣어야 합니다.',
      async run(a) {
        wipe(a);
        const { U, O } = joinTables(a);
        a.text(360, 30, 'SELECT u.name, o.item FROM users u LEFT JOIN orders o ON u.id = o.user_id', { size: 12, mono: true, weight: 700 });
        const R = table(a, RT, '결과', ['name', 'item']);
        a.caption('users를 한 명씩 보며 주문을 찾아요');
        for (const [uid, name, c] of USERS) {
          paint(U.rows[uid - 1], c);
          const hits = ORDERS.map((o, i) => (o[1] === uid ? i : -1)).filter((i) => i >= 0);
          hits.forEach((i) => paint(O.rows[i], c));
          await a.wait(350);
          if (!hits.length) {
            const row = addRow(a, R, [[name, c], ['NULL', 'amber']], { hidden: true });
            paint(row, 'amber', 18);
            await a.show(row.g, 300);
          }
          for (const i of hits) {
            const row = addRow(a, R, [[name, c], ORDERS[i][2]], { hidden: true });
            paint(row, c, 14);
            await a.show(row.g, 260);
          }
          await a.wait(200);
          paint(U.rows[uid - 1]);
          hits.forEach((i) => paint(O.rows[i]));
        }
        a.note('n1', 360, 370, '왼쪽(users)은 전부 남기고, 짝이 없으면 NULL', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '송금 — 두 문장 사이에 서버가 죽으면',
      easy: '민지(A)가 서준(B)에게 10만 원을 보내려면 "A에서 10만 원 빼기", "B에 10만 원 더하기" 두 가지 일을 해야 합니다. 첫 번째만 하고 서버가 꺼지면, A의 돈은 빠졌는데 B는 받지 못해 10만 원이 사라져요.',
      deep: '트랜잭션 없이(autocommit 모드) 실행하면 UPDATE 하나하나가 실행 즉시 확정됩니다. 첫 문장이 확정된 뒤 프로세스 장애·네트워크 단절·제약 위반이 일어나면 두 번째 문장은 실행되지 않아, 합계가 맞지 않는 상태가 DB에 그대로 남습니다. 애플리케이션에서 "실패하면 다시 더해 주기"로 보정하려 해도 그 보정 코드 역시 실패할 수 있습니다.',
      async run(a) {
        wipe(a);
        const ts = code(a, [SQL_A, SQL_B]);
        accounts(a);
        a.caption('두 문장을 하나씩 실행해요');
        mark(a, ts, 0);
        await a.flash('A');
        const pk = a.packet('10만 원', { at: 'A', color: 'amber' });
        await a.par(money(a, 'A', 50, 40), a.move(pk, [330, AY], 700));
        mark(a, ts, 1, 'red');
        a.note('crash', 360, 196, '💥 서버 다운', { color: 'red' });
        pk.set('✕', 'red');
        await a.wait(400);
        await a.fadeOut(pk, 400);
        a.hl('A', true, 'red');
        a.setText('tot', '두 계좌 합계 60만 원');
        a.get('tot').setAttribute('class', 'tx tc-red');
        a.note('n1', 360, 400, 'A에서는 빠졌는데 B는 못 받음 → 10만 원 증발!', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '트랜잭션 — 전부 아니면 전무',
      easy: '두 문장을 BEGIN과 COMMIT 사이에 묶으면 "둘 다 되거나, 둘 다 안 되거나" 중 하나만 일어납니다. 중간에 꺼지면 다시 켜질 때 하던 일을 모두 취소(ROLLBACK)해 처음 상태로 돌아가고, 끝까지 가면 COMMIT으로 한꺼번에 확정해요.',
      deep: 'BEGIN 이후의 변경은 COMMIT 전까지 확정되지 않고, 다른 트랜잭션에도 보이지 않습니다. InnoDB는 바꾸기 전 값을 undo 로그에 남겨 ROLLBACK 때 되돌리고, PostgreSQL은 새 행 버전을 만들어 두고 트랜잭션이 중단되면 그 버전을 보이지 않게 처리합니다(MVCC). 서버가 죽었다 살아나면 복구 과정에서 커밋되지 않은 트랜잭션은 자동으로 취소됩니다.',
      async run(a) {
        wipe(a);
        const ts = code(a, ['BEGIN;', SQL_A, SQL_B, 'COMMIT;'], '1차 시도');
        accounts(a, 268);
        a.get('tot').setAttribute('y', 372);
        // 1차: 중간에 장애 → ROLLBACK
        mark(a, ts, 0);
        a.zone('tx', 70, 206, 580, 126, { label: '트랜잭션 진행 중', color: 'amber' });
        await a.wait(400);
        mark(a, ts, 1);
        const pk = a.packet('10만 원', { at: 'A', color: 'amber' });
        a.setNode('A', { color: 'amber' });
        await a.par(a.tween(500, (k) => a.setNode('A', { sub: `${Math.round(50 - 10 * k)}만 (임시)` })), a.move(pk, [330, 268], 600));
        mark(a, ts, 2, 'red');
        a.note('crash', 360, 184, '💥 서버 다운', { color: 'red' });
        pk.set('✕', 'red');
        await a.wait(600);
        a.remove('crash');
        a.caption('다시 켜지면: 커밋 안 된 트랜잭션은 취소');
        a.note('rb', 360, 184, '↩ ROLLBACK', { color: 'blue' });
        pk.set('↩', 'blue');
        await a.move(pk, 'A', 500);
        await a.fadeOut(pk, 150);
        await money(a, 'A', 40, 50, 400);
        a.setNode('A', { color: 'blue' });
        a.remove('tx');
        a.setText('tot', '두 계좌 합계 70만 원 — 처음 그대로');
        await a.wait(700);
        // 2차: 끝까지 → COMMIT
        a.remove('rb');
        a.setText('tag', '2차 시도');
        a.setText('tot', '두 계좌 합계 70만 원');
        mark(a, ts, 0);
        a.zone('tx', 70, 206, 580, 126, { label: '트랜잭션 진행 중', color: 'amber' });
        await a.wait(300);
        mark(a, ts, 1);
        a.setNode('A', { color: 'amber', sub: '40만 (임시)' });
        const p2 = a.packet('10만 원', { at: 'A', color: 'amber' });
        await a.move(p2, 'B', 700);
        await a.fadeOut(p2, 120);
        mark(a, ts, 2);
        a.setNode('B', { color: 'amber', sub: '30만 (임시)' });
        await a.wait(350);
        mark(a, ts, 3, 'green');
        a.remove('tx');
        a.zone('tx2', 70, 206, 580, 126, { label: 'COMMIT — 한꺼번에 확정', color: 'green' });
        a.setNode('A', { color: 'blue', sub: '40만 원' });
        a.setNode('B', { color: 'green', sub: '30만 원' });
        a.badge('A', '확정', 'green');
        a.badge('B', '확정', 'green');
        a.setText('tot', '두 계좌 합계 70만 원 ✓');
        a.get('tot').setAttribute('class', 'tx tc-green');
        await a.par(a.flash('A'), a.flash('B'));
        await a.wait(500);
      },
    },
    {
      t: 'ACID — 트랜잭션의 네 가지 약속',
      easy: '트랜잭션이 지키는 네 가지 약속을 앞 글자를 따서 ACID라고 불러요. 전부 아니면 전무(원자성), 규칙은 늘 지킴(일관성), 동시에 해도 서로 섞이지 않음(격리성), 확정하면 정전이 나도 남음(지속성)입니다.',
      deep: '원자성은 undo 로그나 MVCC 버전으로, 지속성은 WAL(Write-Ahead Log)로 구현됩니다. COMMIT 때 변경 기록을 로그 파일에 먼저 순서대로 쓰고 fsync한 뒤에야 성공을 돌려주며, 실제 데이터 페이지는 나중에 천천히 디스크에 씁니다. 장애 후에는 WAL을 다시 재생(redo)해 커밋된 변경을 복원합니다. 일관성은 제약 조건(CHECK·FK·UNIQUE)과 애플리케이션 규칙이 함께 지키고, 격리성은 잠금이나 MVCC로 구현합니다.',
      async run(a) {
        wipe(a);
        a.text(360, 44, 'ACID — 트랜잭션이 지키는 네 가지 약속', { size: 16, weight: 800 });
        const CARDS = [
          ['A', '원자성', 'Atomicity', 'blue', ['전부 하거나', '전혀 안 하거나'], '송금 중 고장 → 원래대로'],
          ['C', '일관성', 'Consistency', 'green', ['규칙은 언제나', '지켜진다'], '잔액 ≥ 0, 합계 유지'],
          ['I', '격리성', 'Isolation', 'violet', ['동시에 해도', '따로 한 것처럼'], '같은 재고를 동시에?'],
          ['D', '지속성', 'Durability', 'amber', ['COMMIT 후엔', '꺼져도 남는다'], 'WAL을 먼저 디스크에'],
        ];
        CARDS.forEach(([L, ko, en, c, d, ex], i) => {
          const n = a.node('c' + L, 99 + i * 174, 232, { label: '', color: c, w: 160, h: 272, hidden: true });
          a.text(0, -96, L, { size: 44, weight: 800, color: c, par: n.g });
          a.text(0, -50, ko, { size: 17, weight: 800, par: n.g });
          a.text(0, -28, en, { size: 11.5, cls: 'muted', par: n.g, mono: true });
          d.forEach((s, k) => a.text(0, 10 + k * 21, s, { size: 13, weight: 600, par: n.g }));
          a.raw('line', { x1: -60, y1: 70, x2: 60, y2: 70, style: 'stroke:var(--line2)' }, n.g);
          a.text(0, 96, ex, { size: 11, cls: 'muted', par: n.g, weight: 600 });
        });
        for (const [L] of CARDS) {
          await a.show('c' + L, 300);
          await a.flash('c' + L);
          await a.wait(350);
        }
        a.caption('격리성(I)은 다음 단계에서 직접 봐요');
        a.hl('cI', true);
        await a.wait(600);
      },
    },
    {
      t: '동시에 마지막 1개를 사면 — 갱신 분실',
      easy: '재고가 딱 1개 남았는데 민지와 서준이 거의 동시에 "구매"를 눌렀어요. 둘 다 "1개 남았네"를 읽고 각자 0으로 고쳐서, 1개짜리 물건이 두 명에게 팔려 버렸습니다.',
      deep: '두 트랜잭션이 같은 값(1)을 읽고 각자 계산한 결과(0)를 쓰면서 한쪽 변경이 덮어써지는 갱신 분실(lost update)입니다. 격리 수준이 낮을수록 이상 현상이 늘어납니다: READ COMMITTED는 커밋 안 된 값 읽기(dirty read)만 막고, REPEATABLE READ는 같은 행을 다시 읽을 때 값이 바뀌는 non-repeatable read까지, SERIALIZABLE은 범위 조회에 새 행이 끼어드는 phantom read까지 막습니다. 기본값은 PostgreSQL이 READ COMMITTED, MySQL InnoDB가 REPEATABLE READ인데, "읽고 나서 쓰기" 패턴의 갱신 분실은 어느 쪽 기본값으로도 온전히 막지 못합니다.',
      async run(a) {
        const T = lanes(a, '재고 1개 · 두 사람이 동시에 구매 (잠금 없음)');
        a.caption('둘 다 재고를 먼저 읽어요');
        await adv(a, T, 200);
        await ev(a, 't1', 200, '읽기: 1', 'blue', { dir: 'read' });
        await adv(a, T, 300);
        await ev(a, 't2', 300, '읽기: 1', 'green', { dir: 'read' });
        a.caption('"1개 남았네" → 각자 0으로 고쳐요');
        await adv(a, T, 410);
        await ev(a, 't1', 410, '쓰기: 0', 'blue', { dir: 'write', val: '0개' });
        await adv(a, T, 520);
        await ev(a, 't2', 520, '쓰기: 0', 'green', { dir: 'write', val: '0개', vcolor: 'red' });
        await adv(a, T, 630);
        await a.par(ev(a, 't1', 630, '구매 ✓', 'amber'), ev(a, 't2', 630, '구매 ✓', 'amber'));
        T.now.style.opacity = 0.15;
        a.note('n1', 400, 414, '재고는 1개인데 2명에게 판매! (갱신 분실)', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '행 잠금 — 한 명은 기다린다',
      easy: '이번엔 민지가 재고를 읽을 때 "내가 쓰는 중"이라는 자물쇠를 겁니다. 서준은 자물쇠가 풀릴 때까지 기다렸다가 재고를 읽는데, 이미 0이라서 구매를 취소해요. 물건은 정확히 한 번만 팔립니다.',
      deep: 'SELECT … FOR UPDATE는 읽은 행에 배타적 행 잠금을 걸어, 다른 트랜잭션의 UPDATE·FOR UPDATE를 COMMIT/ROLLBACK 때까지 기다리게 합니다(MVCC 덕분에 잠금 없는 일반 SELECT는 막지 않음). 두 트랜잭션이 서로의 잠금을 기다리면 교착 상태(deadlock)가 되어 DB가 한쪽을 강제로 롤백하고, 대기 시간 한도(lock_wait_timeout 등)를 넘으면 오류가 납니다. 간단한 경우에는 UPDATE products SET stock = stock - 1 WHERE id = 1 AND stock > 0 한 문장으로 확인과 차감을 원자적으로 하거나, version 열로 낙관적 잠금을 쓰기도 합니다.',
      async run(a) {
        const T = lanes(a, '같은 상황 + SELECT … FOR UPDATE (행 잠금)');
        await adv(a, T, 190);
        T.lock = bandRect(a, 190, LY.row, 'amber');
        await ev(a, 't1', 190, '🔒 읽기: 1', 'blue', { dir: 'read', w: 96 });
        a.text(300, 224, '🔒 민지가 잠금', { id: 'lk', size: 11.5, weight: 800, color: 'amber' });
        await adv(a, T, 300);
        await ev(a, 't2', 300, '🔒 요청', 'green', { dir: 'write', arrow: 'red', dashed: true, w: 80 });
        a.caption('서준은 잠금이 풀릴 때까지 기다려요');
        T.wait = bandRect(a, 344, LY.t2, 'red');
        a.text(420, 378, '⏳ 기다리는 중', { id: 'wt', size: 11.5, weight: 800, color: 'red' });
        await adv(a, T, 400);
        await ev(a, 't1', 400, '쓰기: 0', 'blue', { dir: 'write', val: '0개' });
        await adv(a, T, 490);
        await ev(a, 't1', 490, 'COMMIT', 'teal', { w: 76 });
        T.lock.on = false;
        T.wait.on = false;
        a.setText('lk', '🔓 COMMIT → 잠금 풀림');
        a.get('lk').setAttribute('x', 340);
        a.setText('wt', '⏳ 기다림 끝');
        a.caption('잠금이 풀리자 서준이 최신 값(0)을 읽어요');
        await adv(a, T, 575);
        await ev(a, 't2', 575, '🔒 읽기: 0', 'green', { dir: 'read', w: 96 });
        await adv(a, T, 668);
        await ev(a, 't2', 668, '품절·취소', 'red', { w: 74 });
        T.now.style.opacity = 0.15;
        a.note('n1', 400, 414, '서준은 기다렸다가 재고 0 확인 → 1개만 판매 ✓', { color: 'green' });
        await a.wait(700);
      },
    },
  ],
};

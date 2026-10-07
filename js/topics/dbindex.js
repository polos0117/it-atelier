// DB 인덱스: 풀 테이블 스캔 vs B-Tree 인덱스 탐색, 범위 검색, 쓰기 비용
const ROWS = [
  [1, '서준', '서울'], [2, '하은', '부산'], [3, '도윤', '인천'], [4, '지우', '대구'],
  [5, '예린', '광주'], [6, '시우', '서울'], [7, '수아', '수원'], [8, '건우', '울산'],
  [9, '민지', '서울'], [10, '유나', '부산'], [11, '하준', '제주'], [12, '다인', '청주'],
];
// 표 배치
const TX = 16, COLS = [44, 100, 116], RH = 24, HY = 74;
const rowY = (i) => HY + RH * (i + 1);
const TW = COLS.reduce((s, w) => s + w, 0); // 260
// B-Tree 배치 (잎 4개 × 키 3개, 이름 가나다순)
const LEAVES = [['건우', '다인', '도윤'], ['민지', '서준', '수아'], ['시우', '예린', '유나'], ['지우', '하은', '하준']];
const LX = [378, 473, 568, 663], LY = 325, LH = 76;
const ROOT = [520, 120], INT = [[425, 215], [615, 215]];

const FILL = {
  base: 'var(--panel2)',
  read: 'color-mix(in srgb, var(--amber) 38%, var(--panel2))',
  done: 'color-mix(in srgb, var(--gray) 22%, var(--panel2))',
  hit: 'color-mix(in srgb, var(--green) 45%, var(--panel2))',
};

function drawRow(a, i, cells, hidden = false) {
  const y = rowY(i);
  const g = a.raw('g', {}, 'node');
  const r = a.raw('rect', { x: TX, y: y - RH / 2, width: TW, height: RH, style: `fill:${FILL.base};stroke:var(--line2);stroke-width:1` }, g);
  let x = TX;
  cells.forEach((c, k) => {
    a.text(x + COLS[k] / 2, y, String(c), { size: 12, par: g, weight: k === 1 ? 700 : 400, mono: k === 0 });
    x += COLS[k];
  });
  if (hidden) g.style.opacity = 0;
  return { g, r, x: TX + TW / 2, y };
}
// 표 행 요소(엔진 id 레지스트리는 노드·패킷용이라 여기서 보관; setup마다 새로 채운다)
const ROW_EL = [];
const paint = (a, i, k) => ROW_EL[i].r.style.setProperty('fill', FILL[k]);
const leafOf = (name) => LEAVES.findIndex((l) => l.includes(name));
const keyPos = (name) => { const li = leafOf(name), k = LEAVES[li].indexOf(name); return [LX[li], LY - 17 + k * 17]; };
const rowOf = (name) => ROWS.findIndex((r) => r[1] === name);
function keyMark(a, name, color) {
  const t = a.get('k-' + name);
  t.setAttribute('class', 'tx' + (color ? ' tc-' + color : ''));
}
/** 잎의 키에서 표의 행으로 가는 포인터 선 — 잎 아래로 돌아 표 오른쪽 빈 틈으로 올라간다 */
function pointer(a, name, k = 0, color = 'green') {
  const [kx, ky] = keyPos(name), ry = rowY(rowOf(name));
  const sx = kx - 8 * (1 - k), sy = LY + LH / 2 + 2;
  const hy = 382 + k * 9, vx = 288 + (2 - k) * 9, e = TX + TW + 2;
  a.raw('path', {
    d: `M${sx} ${sy} V${hy - 6} Q${sx} ${hy} ${sx - 6} ${hy} H${vx + 6} Q${vx} ${hy} ${vx} ${hy - 6} V${ry + 6} Q${vx} ${ry} ${vx - 6} ${ry} H${e}`,
    class: `edge ec-${color}`, 'marker-end': 'url(#ah)', style: 'stroke-dasharray:4 4',
  }, 'top');
  a.raw('circle', { cx: kx - 30, cy: ky, r: 3, fill: `var(--${color})` }, 'top');
}
function resetRows(a) { ROWS.forEach((_, i) => paint(a, i, 'base')); }
function resetKeys(a) { LEAVES.flat().forEach((n) => keyMark(a, n, null)); }

export default {
  id: 'dbindex',
  level: 3,
  cat: '데이터베이스',
  title: 'DB 인덱스 — 책의 찾아보기',
  sub: '행이 수백만 개여도 원하는 한 줄을 몇 번 만에 찾는 비결',
  analogy: '두꺼운 책에서 "민지"가 나오는 쪽을 찾을 때, 첫 장부터 넘기면(풀 스캔) 오래 걸립니다. 책 뒤의 "찾아보기"는 가나다순으로 정리돼 있어 금방 찾고, 옆에 적힌 쪽 번호로 바로 갑니다. 대신 책 내용을 고칠 때마다 찾아보기도 고쳐야 하죠.',
  keys: [
    '테이블의 행은 보통 들어온 순서대로 저장되어, 인덱스가 없으면 조건에 맞는 행을 찾으려고 전부 읽는다(풀 테이블 스캔).',
    '인덱스는 특정 열 값을 정렬해 둔 별도의 자료 구조(주로 B-Tree)이고, 각 값은 실제 행 위치를 가리킨다.',
    'B-Tree는 위에서부터 비교하며 내려가므로 몇 단계(보통 3~4번)만에 값을 찾는다. 100만 행도 마찬가지다.',
    '잎 노드끼리 연결되어 있어 범위 검색(BETWEEN, >, ORDER BY)도 옆으로 훑기만 하면 된다.',
    '인덱스는 공짜가 아니다: INSERT·UPDATE·DELETE마다 인덱스도 고쳐야 해서 쓰기가 느려지고 저장 공간을 쓴다.',
  ],
  terms: [
    ['풀 테이블 스캔', '인덱스 없이 테이블의 모든 행을 처음부터 끝까지 읽는 것'],
    ['인덱스', '열 값을 정렬해 저장하고 행 위치를 가리키는 보조 구조. CREATE INDEX로 만든다'],
    ['B-Tree', '여러 갈래로 뻗는 균형 트리. 모든 잎의 깊이가 같아 검색이 항상 일정하게 빠르다'],
    ['잎(leaf) 노드', '트리 맨 아래 칸. 실제 키와 행 위치(포인터)가 들어 있고 옆 잎과 연결돼 있다'],
    ['EXPLAIN', '쿼리가 인덱스를 쓰는지, 몇 행을 읽는지 보여 주는 명령'],
    ['페이지 분할', '잎(페이지)이 가득 찼을 때 둘로 나누는 작업. 쓰기 비용이 커진다'],
  ],
  setup(a) {
    a.text(TX, 44, 'users 테이블', { size: 13, weight: 800, anchor: 'start', layer: 'edge' });
    a.text(TX + TW, 44, '', { id: 'cnt', size: 12.5, weight: 700, anchor: 'end', layer: 'edge', cls: 'tc-amber' });
    a.text(520, 40, "WHERE name = '민지'", { id: 'q', size: 13.5, weight: 700, mono: true, layer: 'edge' });
    // 머리줄
    const hg = a.raw('g', {}, 'node');
    a.raw('rect', { x: TX, y: HY - RH / 2, width: TW, height: RH, rx: 4, style: 'fill:color-mix(in srgb, var(--blue) 22%, var(--panel2));stroke:var(--line2)' }, hg);
    let x = TX;
    ['id', 'name', 'city'].forEach((h, k) => { a.text(x + COLS[k] / 2, HY, h, { size: 12, weight: 800, par: hg, mono: true }); x += COLS[k]; });
    ROWS.forEach((r, i) => { ROW_EL[i] = drawRow(a, i, r); });
    // B-Tree (처음엔 숨김)
    a.node('root', ROOT[0], ROOT[1], { label: '시우', sub: '', color: 'violet', w: 96, h: 44, hidden: true });
    INT.forEach(([ix, iy], k) => a.node('i' + k, ix, iy, { label: k ? '지우' : '민지', color: 'violet', w: 80, h: 44, hidden: true }));
    LEAVES.forEach((keys, li) => {
      const n = a.node('L' + li, LX[li], LY, { label: '', color: 'teal', w: 86, h: LH, hidden: true });
      keys.forEach((k, j) => a.text(0, -17 + j * 17, k, { id: 'k-' + k, size: 12.5, weight: 700, par: n.g }));
    });
    a.edge('root', 'i0', { id: 'e-r0', hidden: true });
    a.edge('root', 'i1', { id: 'e-r1', hidden: true });
    a.edge('i0', 'L0', { id: 'e-00', hidden: true });
    a.edge('i0', 'L1', { id: 'e-01', hidden: true });
    a.edge('i1', 'L2', { id: 'e-12', hidden: true });
    a.edge('i1', 'L3', { id: 'e-13', hidden: true });
    for (let i = 0; i < 3; i++) a.edge('L' + i, 'L' + (i + 1), { id: 'e-l' + i, dashed: true, color: 'teal', hidden: true });
  },
  steps: [
    {
      t: '테이블 — 들어온 순서대로 쌓인 행',
      easy: '회원 12명의 정보가 표에 들어 있습니다. 가입한 순서대로 적혀 있어서 이름은 가나다순이 아니라 뒤죽박죽이에요. 이제 "민지"를 찾아봅시다.',
      deep: '대부분의 테이블은 삽입 순서(또는 기본 키 순서)로 페이지에 저장됩니다. name 열에는 정렬 정보가 없으므로, DB는 WHERE name = \'민지\' 조건을 만족하는 행이 어디 있는지 미리 알 수 없습니다.',
      async run(a) {
        a.caption('SELECT * FROM users WHERE name = \'민지\'');
        a.note('n-1', 500, 190, '행은 가입한 순서대로 저장\n이름은 정렬돼 있지 않음', { color: 'blue' });
        for (let i = 0; i < ROWS.length; i += 1) {
          paint(a, i, 'read');
          await a.wait(60);
          paint(a, i, 'base');
        }
        await a.wait(600);
      },
    },
    {
      t: '풀 테이블 스캔 — 한 줄씩 전부 읽기',
      easy: '찾아보기가 없으니 첫 줄부터 마지막 줄까지 하나하나 읽습니다. 9번째에서 민지를 찾았지만, 다른 민지가 또 있을 수 있어서 끝까지 읽어야 해요.',
      deep: '인덱스가 없으면 옵티마이저는 Full Table Scan(EXPLAIN의 type=ALL / Seq Scan)을 선택합니다. 비용은 행 수 N에 비례(O(N))하고, 100만 행이면 디스크 페이지 수천 개를 읽어야 합니다. name이 UNIQUE가 아니므로 첫 일치 후에도 멈출 수 없습니다.',
      async run(a) {
        a.clear();
        for (let i = 0; i < ROWS.length; i++) {
          paint(a, i, 'read');
          a.setText('cnt', `읽은 행 ${i + 1} / 12`);
          await a.wait(230);
          paint(a, i, ROWS[i][1] === '민지' ? 'hit' : 'done');
        }
        a.note('n-2', 500, 200, '12행을 전부 읽고서야 끝\n100만 행이면 100만 번!', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '인덱스 만들기 — 이름을 가나다순으로',
      easy: '책 뒤의 "찾아보기"처럼, 이름만 뽑아 가나다순으로 정리한 목록을 따로 만듭니다. 각 이름 옆에는 "표의 몇 번째 줄"인지 적어 둡니다. 맨 위에는 "시우보다 앞이면 왼쪽" 같은 안내판을 세워요.',
      deep: 'CREATE INDEX idx_name ON users(name)는 name 값과 행 위치(RID/기본 키)를 정렬해 B+Tree로 저장합니다. 잎 노드에 모든 키가 순서대로 있고, 위쪽 노드는 갈림길 키만 가집니다. 실제 DB에서는 한 노드(페이지, 보통 8~16KB)에 수백 개 키가 들어가 3~4단계로 수억 행을 커버합니다.',
      async run(a) {
        a.clear();
        resetRows(a);
        a.setText('cnt', '');
        a.setText('q', 'CREATE INDEX ON users(name)');
        LEAVES.flat().forEach((n) => (a.get('k-' + n).style.opacity = 0));
        await a.par(...LEAVES.map((_, i) => a.show('L' + i, 300)));
        await a.par(...ROWS.map((r, i) => a.wait(i * 110).then(async () => {
          const p = a.packet(r[1], { at: [TX + COLS[0] + COLS[1] / 2, rowY(i)], color: 'teal', w: 46, h: 20, size: 11.5 });
          await a.move(p, keyPos(r[1]), 700);
          a.get('k-' + r[1]).style.opacity = 1;
          a.remove(p);
        })));
        await a.par(...[0, 1, 2].map((i) => a.show('e-l' + i, 300)));
        await a.par(a.show('i0'), a.show('i1'), a.show('e-00'), a.show('e-01'), a.show('e-12'), a.show('e-13'));
        await a.par(a.show('root'), a.show('e-r0'), a.show('e-r1'));
        a.setText('cnt', 'B-Tree 3단계 완성');
        await a.wait(500);
      },
    },
    {
      t: '인덱스로 찾기 — 세 번 만에',
      easy: '맨 위 안내판: "민지는 시우보다 앞이니 왼쪽". 다음 안내판: "민지 이상이면 오른쪽". 세 번째 칸에서 민지를 찾고, 적힌 줄 번호로 표에 바로 갑니다. 12줄을 다 읽지 않아도 돼요.',
      deep: '루트 → 내부 노드 → 잎으로 키를 비교하며 내려가는 Index Seek입니다. 트리 높이 h만큼만 페이지를 읽으므로 O(log N)이고, 잎의 RID로 테이블 행을 한 번 더 읽습니다(테이블 접근). 조회 열이 모두 인덱스에 있으면 이 단계도 생략되는 커버링 인덱스가 됩니다.',
      async run(a) {
        a.clear();
        resetRows(a);
        a.setText('q', "WHERE name = '민지'");
        const p = a.packet('민지?', { at: [520, 72], color: 'blue' });
        a.hl('root'); a.setText('cnt', '인덱스 1칸');
        a.text(580, 120, '민지 < 시우 → 왼쪽', { size: 11.5, weight: 700, anchor: 'start', color: 'amber' });
        await a.wait(500);
        await a.move(p, [425, 172], 550);
        a.hl('i0'); a.setText('cnt', '인덱스 2칸');
        a.text(520, 215, '≥ 민지 → 오른쪽', { size: 11.5, weight: 700, color: 'amber' });
        await a.wait(500);
        await a.move(p, [473, 268], 550);
        a.hl('L1', true, 'green'); keyMark(a, '민지', 'green');
        a.setText('cnt', '인덱스 3칸 + 행 1개');
        await a.fadeOut(p, 200);
        pointer(a, '민지');
        paint(a, rowOf('민지'), 'hit');
        await a.wait(700);
      },
    },
    {
      t: '범위 검색 — 잎을 따라 옆으로',
      easy: '"서준부터 시우까지"처럼 범위를 찾을 때도 첫 이름만 위에서 찾고, 그다음은 정렬된 칸을 따라 옆으로 읽기만 하면 됩니다. 시우를 지나는 순간 멈춰요.',
      deep: 'B+Tree 잎은 연결 리스트로 이어져 있어 Index Range Scan은 시작 키를 Seek한 뒤 잎을 순차로 읽고, 범위를 벗어나는 키에서 멈춥니다. BETWEEN, <, >, LIKE \'서%\'(접두사), ORDER BY name도 정렬 없이 처리됩니다. 반면 LIKE \'%준\'처럼 앞이 열린 패턴은 인덱스를 못 탑니다.',
      async run(a) {
        a.clear();
        resetRows(a);
        ['root', 'i0', 'i1', 'L0', 'L1', 'L2', 'L3'].forEach((n) => a.hl(n, false));
        keyMark(a, '민지', null);
        a.setText('q', "BETWEEN '서준' AND '시우'");
        const p = a.packet('서준~', { at: [520, 72], color: 'blue' });
        a.hl('root');
        await a.wait(300);
        await a.move(p, [425, 172], 500);
        a.hl('i0');
        await a.move(p, [473, 268], 500);
        a.hl('L1', true, 'green');
        for (const n of ['서준', '수아']) {
          keyMark(a, n, 'green'); pointer(a, n, n === '서준' ? 0 : 1); paint(a, rowOf(n), 'hit');
          await a.wait(350);
        }
        await a.move(p, [568, 268], 500);
        a.hl('L2', true, 'green');
        keyMark(a, '시우', 'green'); pointer(a, '시우', 2); paint(a, rowOf('시우'), 'hit');
        await a.wait(350);
        keyMark(a, '예린', 'red');
        a.text(648, 398, '예린 > 시우 → 멈춤', { size: 11.5, weight: 700, color: 'red' });
        await a.fadeOut(p, 200);
        a.setText('cnt', '잎 2칸만 읽고 3행 찾음');
        await a.wait(600);
      },
    },
    {
      t: '대가 — 쓸 때마다 인덱스도 고친다',
      easy: '새 회원 "나연"이 가입하면 표 맨 끝에 한 줄 추가하는 것으로 끝나지 않습니다. 찾아보기에도 가나다 자리를 찾아 끼워 넣어야 해요. 칸이 꽉 차면 칸을 둘로 쪼개는 일까지 생깁니다.',
      deep: 'INSERT 1건은 테이블 쓰기 + 인덱스 개수만큼의 B-Tree 삽입을 일으킵니다. 잎 페이지가 가득 차면 페이지 분할(page split)로 추가 I/O와 단편화가 생깁니다. 그래서 인덱스는 자주 조회하는 WHERE·JOIN·ORDER BY 열에, 선택도(값의 다양성)가 높은 열 위주로 골라서 만듭니다.',
      async run(a) {
        a.clear();
        resetRows(a);
        resetKeys(a);
        ['root', 'i0', 'i1', 'L0', 'L1', 'L2', 'L3'].forEach((n) => a.hl(n, false));
        a.setText('q', "INSERT (13, '나연', '대전')");
        a.setText('cnt', '쓰기 1: 테이블');
        const row = drawRow(a, 12, [13, '나연', '대전'], true);
        row.r.style.setProperty('fill', FILL.read);
        const p1 = a.packet('+ 나연', { at: [520, 72], color: 'amber' });
        await a.move(p1, [TX + TW / 2, rowY(12)], 800);
        await a.par(a.fadeOut(p1, 200), a.show(row, 300));
        a.setText('cnt', '쓰기 2: 인덱스도');
        const p2 = a.packet('+ 나연', { at: [520, 72], color: 'amber' });
        a.hl('root');
        await a.wait(250);
        await a.move(p2, [425, 172], 500);
        a.hl('i0');
        await a.move(p2, [378, 268], 500);
        await a.fadeOut(p2, 150);
        // 잎 L0에 끼워 넣기: 건우 · 나연 · 다인 · 도윤
        const n = a.get('L0');
        n.h = 92;
        n.body.setAttribute('y', -46);
        n.body.setAttribute('height', 92);
        a.text(0, 0, '나연', { id: 'k-나연', size: 12.5, weight: 700, par: n.g, color: 'amber' });
        ['건우', '나연', '다인', '도윤'].forEach((k, j) => a.get('k-' + k).setAttribute('y', -25.5 + j * 17));
        a.get('e-00').update(); a.get('e-l0').update();
        a.hl('L0', true, 'red');
        a.badge('L0', '꽉 참', 'red');
        await a.flash('L0');
        a.note('n-6', 520, 408, '인덱스가 많을수록 쓰기가 느려져요', { color: 'red' });
        await a.wait(700);
      },
    },
  ],
};


// 방화벽: 포트(문 번호) → 규칙표(위에서부터 첫 일치) → 기본 정책(기본 차단 vs 기본 허용)
// → 상태 기반(답장 자동 통과) → 아웃바운드(감염 PC 막기) → 종류 비교(어디까지 보나) → 실무 팁
// 주소는 설명용 예시(203.0.113.x 문서용 대역, 10.x 사설 대역, .example 도메인)다.
const Y = [60, 124, 188, 252]; // 줄(행) y — 왼쪽(인터넷)·오른쪽(회사 안) 공통
const OUT = { guest: 0, bot: 1, admin: 2, site: 3 };
const IN = { web: 0, ssh: 1, db: 2, pc: 3 };
const FW = { x: 360, y: 156, w: 96, h: 256 };
// 점이 멈추는 곳 — 노드·방화벽 테두리 바깥(글자를 가리지 않게)
const L_START = (r) => [190, Y[r]];
const L_STOP = (r) => [258, Y[r]];
const R_STOP = (r) => [462, Y[r]];
const R_END = (r) => [520, Y[r]];

// 규칙표 — setup마다 새로 만든다
const TY = [356, 376, 396, 416];
const TC = [34, 60, 184, 312, 380, 456, 528];
const T = { g: null, title: null, rows: [] };

const RULES_IN = [
  ['1', '아무나', '웹 서버', '443', 'TCP', '허용', ''],
  ['2', '관리자 집 IP', '원격 관리', '22', 'TCP', '허용', ''],
  ['3', '아무나', '모두', '모두', '모두', '차단', '기본 정책'],
];
const RULES_OPEN = [
  ['1', '아무나', '원격 관리', '22', 'TCP', '차단', ''],
  ['2', '아무나', '모두', '모두', '모두', '허용', '기본 정책 ⚠'],
];
const RULES_OUT0 = [['1', '회사 안', '모두', '모두', '모두', '허용', '제한 없음']];
const RULES_OUT = [
  ['1', '회사 안', 'www.example 등', '443', 'TCP', '허용', '허용 목록'],
  ['2', '회사 안', '그 밖 모두', '모두', '모두', '차단', '기록 남김'],
];
const RULES_TEMP = [
  ['1', '아무나', '웹 서버', '443', 'TCP', '허용', ''],
  ['2', '관리자 집 IP', '원격 관리', '22', 'TCP', '허용', ''],
  ['3', '아무나', '데이터베이스', '3306', 'TCP', '허용', '임시(작년 테스트)'],
  ['4', '아무나', '모두', '모두', '모두', '차단', '기본 정책'],
];

const fill = (c, k) => `fill: color-mix(in srgb, var(--${c}) ${k}%, transparent)`;

/** 표의 한 줄. cells가 문자열이면 한 칸짜리 메모 줄 */
function row(a, i, cells, o = {}) {
  if (T.rows[i]) T.rows[i].g.remove();
  const g = a.raw('g', {}, T.g);
  const bg = a.raw('rect', { x: 22, y: TY[i] - 10, width: 676, height: 20, rx: 6, style: fill(o.bg || 'gray', 0) }, g);
  if (typeof cells === 'string') {
    a.text(TC[0], TY[i], cells, { par: g, size: 12, anchor: 'start', weight: 700, color: o.color });
  } else {
    cells.forEach((c, k) => {
      const act = k === 5;
      a.text(TC[k], TY[i], c, { par: g, size: 12, anchor: 'start', weight: act || k === 0 ? 800 : 600, mono: k === 3 || k === 4,
        color: act ? (c === '허용' ? 'green' : 'red') : k === 6 ? (o.memo || 'amber') : k === 0 ? 'gray' : null });
    });
  }
  T.rows[i] = { g, bg };
  if (o.fade === false) return Promise.resolve();
  g.style.opacity = 0;
  return a.tween(260, (k) => (g.style.opacity = k));
}
function dropRow(i) { if (T.rows[i]) { T.rows[i].g.remove(); T.rows[i] = null; } }
async function setRules(a, list, o = {}) {
  for (let i = 0; i < TY.length; i++) dropRow(i);
  for (let i = 0; i < list.length; i++) {
    const memo = list[i][6] && list[i][6].startsWith('임시') ? 'red' : list[i][6].includes('⚠') ? 'red' : 'amber';
    if (o.slow) await row(a, i, list[i], { memo }); else row(a, i, list[i], { memo, fade: false });
  }
}
function rowBg(a, i, c, on, dur = 160) {
  const r = T.rows[i];
  if (!r) return Promise.resolve();
  r.bg.setAttribute('style', fill(c, 0));
  return a.tween(dur, (k) => r.bg.setAttribute('style', fill(c, (on ? k : 1 - k) * 30)));
}
/** 위에서부터 한 줄씩 비교하다가 hit 줄에서 멈춘다 */
async function scan(a, order, hit, ok) {
  for (const i of order) {
    if (i === hit) break;
    await rowBg(a, i, 'amber', true, 120);
    await rowBg(a, i, 'amber', false, 120);
  }
  await rowBg(a, hit, ok ? 'green' : 'red', true, 180);
}
const verdict = (a, side, r, s, ok) => {
  const t = a.text(side === 'L' ? 300 : 420, Y[r] - 22, s, { size: 11.5, weight: 800, anchor: side === 'L' ? 'end' : 'start', color: ok ? 'green' : 'red' });
  return t;
};

/** 밖 → 안: 방화벽에서 규칙표를 훑고 통과/차단 */
async function inbound(a, from, to, label, color, rule) {
  const p = a.packet(label, { at: L_START(from), color });
  await a.move(p, L_STOP(from), 520);
  a.hl('fw', true, 'amber');
  await scan(a, rule.order ?? [0, 1, 2, 3], rule.hit, rule.ok);
  const t = verdict(a, 'L', from, rule.say, rule.ok);
  p.set(label + (rule.ok ? ' ✓' : ' ✗'), rule.ok ? null : 'gray');
  await a.wait(450);
  a.hl('fw', false);
  rowBg(a, rule.hit, rule.ok ? 'green' : 'red', false, 300).catch(() => {});
  a.fadeOut(t, 300).catch(() => {});
  if (!rule.ok) { await a.fadeOut(p, 300); return; }
  await a.move(p, R_STOP(to), 0);
  await a.move(p, R_END(to), 420);
  await a.fadeOut(p, 180);
}
/** 안 → 밖 */
async function outbound(a, from, to, label, color, rule) {
  const p = a.packet(label, { at: R_END(from), color });
  await a.move(p, R_STOP(from), 520);
  a.hl('fw', true, 'amber');
  if (rule) {
    await scan(a, [0, 1, 2], rule.hit, rule.ok);
    const t = verdict(a, 'R', from, rule.say, rule.ok);
    p.set(label + (rule.ok ? ' ✓' : ' ✗'), rule.ok ? null : 'gray');
    await a.wait(450);
    rowBg(a, rule.hit, rule.ok ? 'green' : 'red', false, 300).catch(() => {});
    a.fadeOut(t, 300).catch(() => {});
    if (!rule.ok) { a.hl('fw', false); await a.fadeOut(p, 300); return false; }
  }
  a.hl('fw', false);
  await a.move(p, L_STOP(to), 0);
  await a.move(p, L_START(to), 420);
  await a.fadeOut(p, 180);
  return true;
}

const DIAGRAM = ['zi', 'zil', 'zn', 'fw', 'guest', 'bot', 'admin', 'site', 'web', 'ssh', 'db', 'pc',
  ...Object.values(OUT).map((r) => 'el' + r), ...Object.values(IN).map((r) => 'er' + r)];

// 종류 비교표
const KINDS = [
  ['네트워크 방화벽', 'L3·L4 · 망 경계', '주소·포트·연결 상태', 2, '밖 → DB 3306 접속', 'blue'],
  ['차세대 방화벽 (NGFW)', 'L3~L7 · 망 경계', '+ 어떤 앱인지 · 누가 쓰는지', 3, '443으로 위장한 앱', 'violet'],
  ['웹 방화벽 (WAF)', 'L7 · 웹 서버 바로 앞', '웹 요청 내용(주소·입력값)', 4, 'SQL 인젝션 · XSS', 'teal'],
  ['IDS / IPS', '길목 · 알림(IDS) / 차단(IPS)', '알려진 공격 패턴 · 이상 징후', 4, '취약점 공격 시도', 'amber'],
  ['호스트 방화벽', 'L3·L4 · PC·서버 안', '그 기기의 포트 · 프로그램', 2, '옆 PC에서 번지는 감염', 'green'],
];
const KX = { name: 30, see: 222, gauge: 446, ex: 566 };
const KY = (i) => 112 + i * 62;

export default {
  id: 'firewall',
  level: 2,
  cat: '네트워크',
  title: '방화벽 — 무엇을 들이고 무엇을 막을지 정하는 경비실',
  sub: '포트(문 번호)와 규칙표로 들어오고 나가는 통신을 골라내는 장치, 방화벽의 원리와 종류',
  analogy: '방화벽은 회사 건물 1층의 경비실과 같습니다. 경비실 책상에는 "누가 · 어느 사무실로 · 몇 번 문으로 오면 → 들여보냄/돌려보냄"이 적힌 출입 규칙표가 있어요. 방문객이 오면 표를 위에서부터 읽어 처음 맞는 줄대로 처리하고, 표에 없는 사람은 돌려보냅니다.',
  keys: [
    '포트는 한 서버 안에서 서비스를 구분하는 문 번호다. 웹은 443(예전 80), 원격 관리 SSH는 22, MySQL DB는 3306을 쓴다.',
    '방화벽 규칙은 출발지·목적지·포트·프로토콜과 동작(허용/차단)으로 이루어지고, 위에서부터 처음 맞는 줄의 동작을 따른다.',
    '기본 정책은 "허용한 것 말고는 모두 차단(기본 차단)"이 원칙이다. 기본 허용은 깜빡한 문을 그대로 열어 둔다.',
    '상태 기반 방화벽은 안에서 나간 요청의 답장을 기억해 자동으로 통과시키고, 밖에서 먼저 오는 연결만 규칙으로 따진다.',
    '나가는 방향(아웃바운드)도 제한해야 감염 PC의 몰래 연락을 막는다. 주소·포트만 보는 방화벽은 내용을 모르므로 WAF·IPS·호스트 방화벽과 겹겹이 쓴다.',
  ],
  terms: [
    ['포트', '한 주소(서버) 안에서 서비스를 구분하는 문 번호(0~65535). 웹 443, SSH 22, MySQL 3306'],
    ['방화벽 규칙(ACL)', '출발지·목적지·포트·프로토콜 → 허용/차단을 적은 한 줄. 위에서부터 처음 맞는 줄을 적용'],
    ['기본 차단', 'default deny. 명시적으로 허용한 것 말고는 모두 막는 기본 정책'],
    ['상태 기반(stateful)', '연결을 기록해 두고, 안에서 나간 요청의 답장은 자동으로 들여보내는 방식'],
    ['인바운드 / 아웃바운드', '밖 → 안으로 들어오는 방향 / 안 → 밖으로 나가는 방향'],
    ['NGFW', '차세대 방화벽. 포트뿐 아니라 어떤 앱·어떤 사용자의 통신인지까지 구분'],
    ['WAF', '웹 방화벽. 웹 요청 내용을 읽어 SQL 인젝션·XSS 같은 웹 공격을 막음'],
    ['IDS / IPS', '침입 탐지(수상하면 알림) / 침입 방지(길목에서 직접 차단) 시스템'],
  ],
  quiz: [
    { q: '방화벽 규칙에 적힌 "포트 22"는 무엇을 뜻할까요?', c: ['서버가 놓인 건물의 층수', '규칙표의 22번째 줄', '원격 관리(SSH) 서비스가 손님을 받는 문 번호', '하루에 들어올 수 있는 손님 수'], a: 2, why: '포트는 한 서버 안에서 서비스를 구분하는 문 번호예요. 22번은 보통 SSH(원격 관리)가 쓰고, 웹은 443번, MySQL DB는 3306번을 씁니다.', step: 0 },
    { q: '규칙표가 위에서부터 "1) 아무나 → 모두: 차단", "2) 아무나 → 웹 서버 443: 허용" 순서입니다. 손님의 443 요청은 어떻게 될까요?', c: ['1번 줄에 먼저 걸려 차단된다', '2번 줄이 더 구체적이라 허용된다', '두 줄이 부딪혀 방화벽이 관리자에게 물어본다', '허용과 차단을 번갈아 적용한다'], a: 0, why: '방화벽은 위에서부터 읽다가 처음 맞는 줄의 동작을 따릅니다. 넓은 차단 줄이 위에 있으면 아래 허용 줄은 영영 쓰이지 않아요(가려진 규칙). 그래서 "그 밖 모두 차단"은 맨 아래에 둡니다.', step: 1 },
    { q: '443만 열어 둔 상태 기반 네트워크 방화벽 뒤의 웹 서버로, 로그인 칸에 SQL 인젝션 문자열을 넣은 HTTPS 요청이 들어오면 어떻게 될까요?', c: ['방화벽이 요청 내용을 읽고 공격 문자열을 지운다', '포트가 443이 아니라서 차단된다', '상태표에 없는 새 연결이라 무조건 차단된다', '주소·포트만 보는 방화벽은 평범한 웹 요청으로 보고 통과시킨다 — 내용 검사는 WAF 같은 L7 장비의 몫이다'], a: 3, why: 'L3/L4 방화벽은 출발지·목적지·포트·연결 상태만 봅니다. 443으로 오는 새 연결은 규칙대로 허용되고, 요청 안에 담긴 공격 문자열은 HTTP를 해석하는 WAF와 앱 자체의 안전한 쿼리 처리가 막아야 해요.', step: 5 },
  ],
  setup(a) {
    T.g = null;
    T.rows = [];
    // 왼쪽 위 구석은 단계 번호가 덮으므로 바깥 영역 이름은 오른쪽에 붙인다
    a.zone('zi', 12, 12, 148, 278, { color: 'gray' });
    a.text(150, 26, '인터넷 · 바깥', { size: 11.5, weight: 700, anchor: 'end', color: 'gray', layer: 'zone', id: 'zil' });
    a.zone('zn', 552, 12, 156, 278, { label: '회사 안 · 내부망', color: 'blue' });
    const L = [['guest', '🙂 손님', '203.0.113.25', 'blue'], ['bot', '🤖 공격 봇', 'bad.example', 'red'],
      ['admin', '🏠 관리자 집', '203.0.113.7', 'teal'], ['site', '🌍 외부 사이트', 'www.example', 'gray']];
    const R = [['web', '🌐 웹 서버', '문 443 · HTTPS', 'green'], ['ssh', '🔧 원격 관리', '문 22 · SSH', 'violet'],
      ['db', '🗄️ 데이터베이스', '문 3306 · MySQL', 'amber'], ['pc', '💻 직원 PC', '10.0.0.50', 'blue']];
    L.forEach(([id, label, sub, color], r) => {
      a.node(id, 82, Y[r], { label, sub, color, w: 128, h: 48, size: 14 });
      a.edge([148, Y[r]], [FW.x - FW.w / 2 - 3, Y[r]], { id: 'el' + r, arrow: false, hidden: true });
    });
    R.forEach(([id, label, sub, color], r) => {
      a.node(id, 630, Y[r], { label, sub, color, w: 136, h: 48, size: 14 });
      a.edge([FW.x + FW.w / 2 + 3, Y[r]], [558, Y[r]], { id: 'er' + r, arrow: false, hidden: true });
    });
    a.node('fw', FW.x, FW.y, { label: '방화벽', icon: '🛡️', sub: '경비실', color: 'red', w: FW.w, h: FW.h, hidden: true });
    // 규칙표(처음엔 숨김)
    T.g = a.raw('g', { style: 'opacity: 0' }, 'edge');
    a.raw('rect', { x: 16, y: 300, width: 688, height: 128, rx: 12, style: 'fill: color-mix(in srgb, var(--red) 5%, transparent); stroke: color-mix(in srgb, var(--red) 50%, transparent); stroke-width: 1.5' }, T.g);
    T.title = a.text(30, 316, '방화벽 규칙표 · 들어오는 방향 — 위에서부터 차례로 확인', { par: T.g, size: 12.5, weight: 800, anchor: 'start', color: 'red' });
    ['#', '출발지(누가)', '목적지(어디로)', '포트', '프로토콜', '동작', '메모'].forEach((s, k) => a.text(TC[k], 336, s, { par: T.g, size: 11, anchor: 'start', cls: 'muted' }));
  },
  steps: [
    {
      t: '포트 — 서비스마다 다른 문 번호',
      easy: '주소(IP)가 건물 주소라면, 포트는 그 건물의 "몇 번 문"이에요. 서버 한 대에도 여러 서비스가 있고 서비스마다 손님 받는 문 번호가 다릅니다. 웹사이트는 443번(예전엔 80번), 원격 관리(SSH)는 22번, 데이터베이스(DB)는 3306번. 지금은 경비실이 없어서 공격 봇도 DB 문까지 그냥 들어와요.',
      deep: '포트는 TCP·UDP 헤더의 16비트 번호(0~65535)이고 0~1023은 잘 알려진 포트(well-known)입니다. 80 HTTP, 443 HTTPS(HTTP/3는 UDP 443), 22 SSH, 3389 RDP, 3306 MySQL·MariaDB, 5432 PostgreSQL이 대표적이에요. 방화벽은 주로 출발지·목적지 IP, 출발지·목적지 포트, 프로토콜의 5-튜플로 패킷을 구분합니다.',
      async run(a) {
        a.caption('서비스마다 문 번호(포트)가 달라요');
        for (const id of ['web', 'ssh', 'db']) a.hl(id);
        await a.par(a.flash('web'), a.flash('ssh'), a.flash('db'));
        for (const id of ['web', 'ssh', 'db']) a.hl(id, false);
        const go = async (from, to, label, color, dur) => {
          const p = a.packet(label, { at: L_START(from), color });
          await a.move(p, R_END(to), dur);
          await a.fadeOut(p, 200);
        };
        await a.par(go(OUT.guest, IN.web, ':443', 'blue', 1100), a.wait(300).then(() => go(OUT.admin, IN.ssh, ':22', 'teal', 1100)));
        a.caption('지키는 사람이 없다면…');
        await go(OUT.bot, IN.db, ':3306', 'red', 1200);
        a.hl('db', true, 'red');
        a.badge('db', '침입!', 'red');
        await a.flash('db');
        a.note('n1', 360, 356, '문이 다 열려 있으면 공격 봇도 DB까지 그대로 들어와요\n→ 입구에 경비실(방화벽)이 필요합니다', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '규칙표 — 위에서부터 첫 번째로 맞는 줄',
      easy: '그래서 입구에 경비실(방화벽)을 둡니다. 경비실에는 "누가(출발지) · 어디로(목적지) · 몇 번 문(포트) · 어떤 방식(프로토콜) → 들여보냄(허용)/돌려보냄(차단)"이 적힌 규칙표가 있어요. 손님이 오면 표를 위에서부터 읽다가 처음 맞는 줄대로 처리하고, 그 아래 줄은 더 보지 않습니다.',
      deep: '대부분의 네트워크 방화벽·라우터 ACL·리눅스 iptables/nftables 체인은 위에서부터 평가해 첫 일치(first match) 규칙의 동작(allow, 또는 drop/reject)을 적용합니다. 그래서 넓은 규칙이 위에 있으면 아래의 좁은 규칙은 쓰이지 않는 "가려진 규칙(shadowed rule)"이 돼요. 다만 클라우드 보안 그룹처럼 허용 규칙만 모아 순서 없이 합쳐 보는 방식도 있습니다.',
      async run(a) {
        a.clear();
        a.badge('db', null);
        a.hl('db', false);
        await a.par(a.show('fw'), ...[0, 1, 2, 3].flatMap((r) => [a.show('el' + r), a.show('er' + r)]), a.fade(T.g, 1, 400));
        a.caption('경비실 규칙표: 누가 · 어디로 · 몇 번 문 → 허용/차단');
        await setRules(a, RULES_IN, { slow: true });
        await a.wait(200);
        a.caption('손님 :443 — 1번 줄부터 확인');
        await inbound(a, OUT.guest, IN.web, ':443', 'blue', { hit: 0, ok: true, say: '규칙 1 일치 → 허용' });
        a.caption('공격 봇 :22 — 2번 줄은 관리자 집 IP만이라 안 맞음');
        await inbound(a, OUT.bot, IN.ssh, ':22', 'red', { hit: 2, ok: false, say: '규칙 3 일치 → 차단' });
        a.caption('관리자 집 :22 — 2번 줄에서 일치');
        await inbound(a, OUT.admin, IN.ssh, ':22', 'teal', { hit: 1, ok: true, say: '규칙 2 일치 → 허용' });
        await a.wait(300);
      },
    },
    {
      t: '기본 정책 — 적지 않은 건 모두 막기',
      easy: '규칙표 맨 아래 줄은 "어느 줄에도 안 맞으면 어떻게 할까"를 정하는 기본 정책이에요. 안전한 쪽은 "허락한 것 말고는 전부 돌려보냄(기본 차단)"입니다. 반대로 "다 들여보내고 나쁜 것만 골라 막기(기본 허용)"로 하면, 막을 목록에 깜빡 빠뜨린 문(3306)으로 공격이 그대로 들어와요.',
      deep: '기본 차단(default deny, 허용 목록 방식)은 필요한 서비스만 명시적으로 열고 마지막에 암묵적 거부(implicit deny)를 둡니다. 기본 허용(차단 목록 방식)은 새 서비스나 테스트 포트가 생길 때마다 자동으로 노출되므로 경계 방화벽에서는 쓰지 않는 것이 원칙이에요. 차단 방식은 drop(조용히 버림)과 reject(거부 응답)가 있고, 외부 쪽에는 drop을 쓰는 경우가 많습니다.',
      async run(a) {
        a.clear();
        a.caption('맨 아래 줄 = 기본 정책: 그 밖은 모두 차단');
        await rowBg(a, 2, 'red', true, 300);
        await a.wait(400);
        await rowBg(a, 2, 'red', false, 200);
        await inbound(a, OUT.bot, IN.db, ':3306', 'red', { hit: 2, ok: false, say: '규칙 3 일치 → 차단' });
        a.caption('반대로 "기본 허용"이라면?');
        a.setText(T.title, '방화벽 규칙표 · 기본 허용 방식 — 나쁜 것만 골라 막기');
        await setRules(a, RULES_OPEN, { slow: true });
        await inbound(a, OUT.bot, IN.db, ':3306', 'red', { hit: 1, ok: true, say: '규칙 2 일치 → 허용' });
        a.hl('db', true, 'red');
        a.badge('db', '침입!', 'red');
        await row(a, 3, '⚠ 막을 목록에 빠뜨린 문(3306)은 그대로 열려 있어요', { color: 'red' });
        a.caption('막을 목록에 없는 문은 활짝 열림');
        await a.flash('db');
        await a.wait(900);
        a.caption('그래서 원칙은 기본 차단 — 다시 되돌려요');
        a.hl('db', false);
        a.badge('db', null);
        a.setText(T.title, '방화벽 규칙표 · 들어오는 방향 — 위에서부터 차례로 확인');
        await setRules(a, RULES_IN);
        await a.wait(400);
      },
    },
    {
      t: '상태 기반 — 나간 요청의 답장은 자동 통과',
      easy: '직원 PC가 바깥 사이트에 요청하면, 경비실은 "이 PC가 www.example에 물어봤음"을 장부(상태표)에 적어 둡니다. 답장이 오면 장부와 맞춰 보고, 따로 규칙이 없어도 들여보내요. 장부에 없는데 답장인 척 먼저 들어오는 건 규칙표대로 막힙니다. 공유기·NAT 주제에서 본 변환표와 같은 원리예요.',
      deep: '상태 기반(stateful) 방화벽은 연결 추적 테이블(conntrack)에 5-튜플과 TCP 상태(SYN_SENT, ESTABLISHED 등)를 기록해 돌아오는 패킷을 자동 허용합니다. 상태 없는(stateless) ACL(일부 라우터 ACL, 클라우드 네트워크 ACL)은 답장이 들어오는 임시 포트(ephemeral port, 리눅스 기본 32768~60999)까지 직접 열어야 해서 규칙이 넓어지기 쉬워요. 가정용 공유기도 NAT와 함께 상태 기반 필터링을 해서 밖에서 먼저 오는 연결을 막습니다.',
      async run(a) {
        a.clear();
        a.caption('직원 PC가 바깥 사이트에 요청');
        a.hl('pc');
        await outbound(a, IN.pc, OUT.site, ':443', 'blue', null);
        await row(a, 3, '📒 상태표: 직원 PC 10.0.0.50:50123 ↔ www.example:443 — 연결 중', { color: 'teal' });
        a.caption('경비실 장부(상태표)에 적어 둠');
        await a.flash('site');
        a.hl('pc', false);
        a.caption('답장 도착 — 장부에 있는 연결이면 통과');
        await inbound(a, OUT.site, IN.pc, '답장', 'green', { order: [3], hit: 3, ok: true, say: '상태표 일치 → 통과' });
        a.badge('pc', '받음 ✓', 'green');
        await a.flash('pc');
        a.caption('답장인 척 먼저 들어오면? 장부에 없음 → 규칙대로');
        await inbound(a, OUT.bot, IN.pc, '가짜답장', 'red', { order: [3, 0, 1, 2], hit: 2, ok: false, say: '규칙 3 일치 → 차단' });
        await a.wait(300);
      },
    },
    {
      t: '나가는 방향도 — 감염 PC의 몰래 연락 막기',
      easy: '규칙은 들어오는 쪽(인바운드)만 있는 게 아니에요. 악성코드에 걸린 PC는 밖의 공격자 서버(bad.example)에 몰래 연락해 명령을 받고 자료를 내보내려 합니다. 나가는 쪽(아웃바운드)도 "업무에 필요한 곳만 나가기"로 묶어 두면 이 연락이 막히고, 막힌 기록은 감염을 알아채는 단서가 돼요.',
      deep: '이그레스(egress) 필터링은 C2(명령·제어) 통신과 데이터 유출을 줄이는 기본 통제입니다. 요즘 악성코드는 443·DNS처럼 원래 열려 있는 길로 나가는 경우가 많아 포트만 막아서는 부족하고, 목적지 허용 목록·프록시 경유·DNS 필터링·평판(위협 인텔리전스) 차단을 함께 씁니다. 차단된 아웃바운드 로그는 감염 PC를 찾는 중요한 침해 지표(IoC)예요.',
      async run(a) {
        a.clear();
        a.badge('pc', null);
        dropRow(3);
        a.setNode('pc', { label: '💻 감염 PC', color: 'red' });
        a.badge('pc', '악성코드', 'red');
        a.setText(T.title, '방화벽 규칙표 · 나가는 방향(아웃바운드)');
        await setRules(a, RULES_OUT0, { slow: true });
        a.caption('감염 PC가 공격자 서버에 몰래 연락 — 나가는 건 모두 허용 중');
        await outbound(a, IN.pc, OUT.bot, ':443', 'pink', { hit: 0, ok: true, say: '규칙 1 일치 → 허용' });
        a.hl('bot', true, 'red');
        await a.flash('bot');
        a.caption('연락 성공… 명령을 받고 자료가 샐 수 있어요');
        await a.wait(600);
        a.hl('bot', false);
        a.caption('나가는 것도 "필요한 곳만"으로 묶으면');
        await setRules(a, RULES_OUT, { slow: true });
        await outbound(a, IN.pc, OUT.bot, ':443', 'pink', { hit: 1, ok: false, say: '규칙 2 일치 → 차단' });
        await row(a, 2, '📝 로그: 10.0.0.50 → bad.example:443 차단 — 감염 의심 PC!', { color: 'red' });
        a.caption('막히고, 기록이 남아 감염 PC를 찾아낼 수 있어요');
        await a.wait(700);
      },
    },
    {
      t: '종류 비교 — 어디까지 들여다보나',
      easy: '경비실도 하는 일에 따라 종류가 있어요. 기본 방화벽은 봉투 겉(주소·문 번호)만 보고, 차세대 방화벽은 어떤 앱인지까지, 웹 방화벽은 웹 요청에 적힌 내용까지 읽습니다. IDS는 수상하면 알리는 CCTV, IPS는 길목에서 직접 막는 경비원, 호스트 방화벽은 집집마다 현관에 단 잠금장치예요.',
      deep: '네트워크 방화벽은 L3/L4(IP·포트·상태)만 봐서 443으로 오는 SQL 인젝션은 그대로 통과시키고, 그건 HTTP를 해석하는 WAF의 몫입니다. NGFW는 앱 식별·사용자 연동·IPS를 묶었지만 암호화된 내용까지 보려면 TLS 복호화 검사가 필요해요. IDS는 미러링한 복사본을 보고 알리고, IPS는 인라인에서 막는 대신 오탐하면 정상 트래픽도 끊습니다. 실무에선 이들을 경계에 겹겹이 두고, 서버마다 호스트 방화벽(윈도우 방화벽, 리눅스 nftables 등)도 켜요.',
      async run(a) {
        a.clear();
        a.badge('pc', null);
        a.caption('같은 "방화벽"이라도 보는 깊이가 달라요');
        await a.par(...DIAGRAM.map((id) => a.hide(id, 350)), a.fade(T.g, 0, 350));
        a.text(30, 34, '어디까지 들여다보나 — 방화벽 계열 장비 비교', { size: 14, weight: 800, anchor: 'start', color: 'red' });
        a.text(KX.name, 70, '종류 · 자리', { size: 11.5, anchor: 'start', cls: 'muted' });
        a.text(KX.see, 70, '무엇을 보나', { size: 11.5, anchor: 'start', cls: 'muted' });
        ['IP', '포트', '앱', '내용'].forEach((s, k) => a.text(KX.gauge + 14 + k * 27, 70, s, { size: 10.5, cls: 'muted' }));
        a.text(KX.ex, 70, '이런 걸 막아요', { size: 11.5, anchor: 'start', cls: 'muted' });
        a.raw('line', { x1: 22, y1: 84, x2: 698, y2: 84, class: 'edge', style: 'stroke-width: 1' }, 'top');
        for (let i = 0; i < KINDS.length; i++) {
          const [name, where, see, depth, ex, c] = KINDS[i];
          const y = KY(i);
          const g = a.raw('g', { style: 'opacity: 0' }, 'top');
          a.raw('rect', { x: 20, y: y - 26, width: 680, height: 52, rx: 10, style: `fill: color-mix(in srgb, var(--${c}) 9%, transparent); stroke: color-mix(in srgb, var(--${c}) 45%, transparent)` }, g);
          a.text(KX.name, y - 9, name, { par: g, size: 13.5, weight: 800, anchor: 'start', color: c });
          a.text(KX.name, y + 11, where, { par: g, size: 11, anchor: 'start', cls: 'muted' });
          a.text(KX.see, y, see, { par: g, size: 12.5, weight: 600, anchor: 'start' });
          for (let k = 0; k < 4; k++) {
            a.raw('rect', { x: KX.gauge + k * 27, y: y - 7, width: 24, height: 14, rx: 4,
              style: k < depth ? `fill: var(--${c})` : 'fill: none; stroke: var(--line2); stroke-dasharray: 3 3' }, g);
          }
          a.text(KX.ex, y, ex, { par: g, size: 12, weight: 600, anchor: 'start' });
          await a.tween(380, (k) => (g.style.opacity = k));
          await a.wait(260);
        }
        a.caption('하나로 다 막을 수 없어 겹겹이 씁니다');
        await a.wait(800);
      },
    },
    {
      t: '실무 팁 — 규칙은 적게, 자주 점검',
      easy: '"잠깐 테스트만 하고 닫을게요" 하고 열어 둔 문이 잊힌 채 남아 있으면, 그게 바로 공격자가 찾는 빈틈이에요. 규칙은 꼭 필요한 만큼만 두고, 정기적으로 "이 줄 아직 쓰나?"를 점검해 지우고, 막히고 통과한 기록(로그)을 남겨 살펴봐야 합니다.',
      deep: '규칙마다 사유·담당자·만료일을 적어 변경 절차로 관리하고, 적중 횟수(hit count)가 0인 규칙과 any-any처럼 넓은 규칙을 정기 점검(예: 분기마다)에서 정리합니다. 클라우드 보안 그룹에서 22·3389·DB 포트를 0.0.0.0/0(모든 곳)에 열어 둔 설정은 흔한 사고 원인으로 꼽혀요. 로그는 중앙 수집(SIEM)으로 모아 차단 추세와 이상한 아웃바운드를 함께 봅니다.',
      async run(a) {
        a.clear();
        a.setNode('pc', { label: '💻 직원 PC', color: 'blue' });
        a.badge('pc', null);
        a.setText(T.title, '방화벽 규칙표 · 들어오는 방향 — 1년 뒤');
        await setRules(a, RULES_TEMP);
        await a.par(...DIAGRAM.map((id) => a.show(id, 350)), a.fade(T.g, 1, 350));
        a.caption('작년에 "잠깐만" 열어 둔 3번 줄이 아직 남아 있어요');
        await inbound(a, OUT.bot, IN.db, ':3306', 'red', { hit: 2, ok: true, say: '규칙 3 일치 → 허용' });
        a.hl('db', true, 'red');
        a.badge('db', '침입!', 'red');
        await a.flash('db');
        a.caption('점검: 아무도 안 쓰는 임시 규칙을 지워요');
        const r3 = T.rows[2];
        a.raw('line', { x1: 28, y1: TY[2], x2: 692, y2: TY[2], style: 'stroke: var(--red); stroke-width: 2' }, r3.g);
        await a.wait(350);
        await a.tween(300, (k) => (r3.g.style.opacity = 1 - k));
        a.hl('db', false);
        a.badge('db', null);
        await setRules(a, RULES_IN);
        await inbound(a, OUT.bot, IN.db, ':3306', 'red', { hit: 2, ok: false, say: '규칙 3 일치 → 차단' });
        await row(a, 3, '📝 로그: 198.51.100.66(공격 봇) → 데이터베이스:3306 차단', { color: 'amber' });
        a.caption('규칙은 적게 · 주기 점검 · 로그 남기기');
        await a.wait(300);
        await a.fade(T.g, 0, 300);
        a.note('t1', 130, 364, '① 규칙은\n꼭 필요한 만큼만', { color: 'green', w: 200 });
        await a.wait(250);
        a.note('t2', 360, 364, '② 주기적으로 점검\n임시 규칙엔 만료일', { color: 'amber', w: 200 });
        await a.wait(250);
        a.note('t3', 590, 364, '③ 막힘·통과 기록(로그)을\n남기고 살펴보기', { color: 'blue', w: 200 });
        await a.wait(400);
      },
    },
  ],
};

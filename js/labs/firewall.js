// 방화벽 실험실: 규칙(웹·SSH·DB)·기본 정책·상태 기반·아웃바운드 제한을 바꿔 가며
// 정해진 순서로 계속 오는 손님·공격 봇·관리자·직원 PC·감염 PC의 통신이 어떻게 걸러지는지 본다.
// 주소는 설명용 예시(203.0.113.x 문서용 대역, 10.x 사설 대역, .example 도메인)다.
const LY = { guest: 62, bot: 122, admin: 182, site: 242 }; // 바깥(왼쪽)
const RY = { web: 52, ssh: 102, db: 152, pc: 202, inf: 252 }; // 회사 안(오른쪽)
const FW = { x: 360, y: 150, w: 96, h: 260 };
// 점은 노드·방화벽 테두리 바깥에서 멈춘다 — 글자를 가리지 않게
const L_START = (id) => [190, LY[id]];
const L_STOP = (id) => [258, LY[id]];
const R_STOP = (id) => [462, RY[id]];
const R_END = (id) => [520, RY[id]];

// 정해진 순서로 되풀이되는 통신(무작위 없음)
const KIND = {
  G: { from: 'guest', to: 'web', port: 443, label: ':443', who: 'good', color: 'blue' },
  A: { from: 'admin', to: 'ssh', port: 22, label: ':22', who: 'good', color: 'teal' },
  B22: { from: 'bot', to: 'ssh', port: 22, label: ':22', who: 'atk', color: 'red' },
  B3306: { from: 'bot', to: 'db', port: 3306, label: ':3306', who: 'atk', color: 'red' },
  B445: { from: 'bot', to: 'pc', port: 445, label: ':445', who: 'atk', color: 'red' },
  P: { from: 'pc', to: 'site', port: 443, label: ':443', who: 'good', color: 'blue', out: true },
  C: { from: 'inf', to: 'bot', port: 443, label: ':443', who: 'c2', color: 'pink', out: true },
};
const SEQ = ['G', 'B3306', 'P', 'A', 'B22', 'G', 'C', 'B445', 'G', 'P', 'B22', 'C'];
const GAP = 650; // ms(1배속)마다 하나
const MAX_FLY = 16;

// 규칙표 칸 위치
const TIN = { x: 16, w: 436, col: [28, 50, 140, 232, 284, 334] };
const TOUT = { x: 460, w: 244, col: [472, 492, 604, 652] };
const TROW = (i) => 338 + i * 15;

const ZERO = () => ({ goodPass: 0, goodBlock: 0, atkPass: 0, atkBlock: 0, leak: 0,
  gOk: 0, adminOk: 0, sshBotPass: 0, sshBotBlock: 0, dbAtk: 0, pcHit: 0, c2Block: 0, pcOk: 0 });

export default {
  id: 'firewall',
  title: '방화벽 실험실',
  intro: '손님·공격 봇·관리자가 밖에서 들어오고, 회사 안의 직원 PC와 악성코드에 걸린 감염 PC는 밖으로 나갑니다. 규칙을 켜고 끄며 방화벽에서 어느 규칙이 일치해 ✓(허용) 또는 ✗(차단)되는지 보세요. 오른쪽 숫자는 설정을 바꿀 때마다 0부터 다시 셉니다.',
  controls: [
    { type: 'radio', key: 'def', label: '기본 정책', options: [['deny', '기본 차단'], ['allow', '기본 허용']] },
    { type: 'toggle', key: 'web', label: '웹(443) 허용' },
    { type: 'radio', key: 'ssh', label: 'SSH(22)', options: [['block', '막기'], ['admin', '관리자만'], ['all', '모두']] },
    { type: 'toggle', key: 'db', label: 'DB(3306) 외부 허용(실수)' },
    { type: 'toggle', key: 'st', label: '상태 기반(답장 자동 허용)' },
    { type: 'toggle', key: 'out', label: '아웃바운드 제한' },
  ],
  init: () => ({ def: 'deny', web: true, ssh: 'all', db: false, st: true, out: false, t0: 0, c: ZERO() }),
  onChange(key, s) {
    s.c = ZERO();
    s.t0 = s.clock ? s.clock() : 0;
    s.paint?.();
  },
  setup(a, s) {
    s.clock = () => a.now();
    s.t0 = a.now();
    let fly = 0, seq = 0, conn = 0;
    const states = new Map(); // 상태표: 연결 번호 → 기록 시각

    a.zone('zi', 12, 10, 148, 272, { label: '인터넷 · 바깥', color: 'gray' });
    a.zone('zn', 552, 10, 156, 272, { label: '회사 안 · 내부망', color: 'blue' });
    const LN = [['guest', '🙂 손님', '203.0.113.25', 'blue'], ['bot', '🤖 공격 봇', 'bad.example', 'red'],
      ['admin', '🏠 관리자 집', '203.0.113.7', 'teal'], ['site', '🌍 외부 사이트', 'www.example', 'gray']];
    const RN = [['web', '🌐 웹 서버', ':443', 'green'], ['ssh', '🔧 SSH 서버', ':22', 'violet'], ['db', '🗄️ DB', ':3306', 'amber'],
      ['pc', '💻 직원 PC', '10.0.0.50', 'blue'], ['inf', '💻 감염 PC', '10.0.0.66', 'pink']];
    for (const [id, label, sub, color] of LN) {
      a.node(id, 82, LY[id], { label, sub, color, w: 128, h: 42, size: 13.5 });
      a.edge([148, LY[id]], [FW.x - FW.w / 2 - 3, LY[id]], { arrow: false });
    }
    for (const [id, label, sub, color] of RN) {
      a.node(id, 630, RY[id], { label, sub, color, w: 136, h: 42, size: 13.5 });
      a.edge([FW.x + FW.w / 2 + 3, RY[id]], [560, RY[id]], { arrow: false });
    }
    a.node('fw', FW.x, FW.y, { label: '방화벽', icon: '🛡️', sub: '', color: 'red', w: FW.w, h: FW.h });

    // 규칙표 두 개(들어오는 · 나가는)
    const box = (T, title, heads) => {
      a.raw('rect', { x: T.x, y: 290, width: T.w, height: 138, rx: 10, style: 'fill: color-mix(in srgb, var(--red) 5%, transparent); stroke: color-mix(in srgb, var(--red) 45%, transparent); stroke-width: 1.5' }, 'edge');
      a.text(T.x + 12, 305, title, { size: 12, weight: 800, anchor: 'start', color: 'red', layer: 'edge' });
      heads.forEach((h, k) => a.text(T.col[k], 322, h, { size: 10.5, anchor: 'start', cls: 'muted', layer: 'edge' }));
      return a.raw('g', {}, 'edge');
    };
    const gin = box(TIN, '들어오는 규칙 — 위에서부터 첫 일치', ['#', '출발지', '목적지', '포트', '동작', '메모']);
    const gout = box(TOUT, '나가는 규칙(아웃바운드)', ['#', '목적지', '포트', '동작']);
    let rowsIn = [], rowsOut = [];

    const inRules = () => {
      const r = [];
      if (s.st) r.push({ n: '·', tag: '상태표', c: ['상태표', '기록된 연결', '답장'], act: 'allow', memo: '답장 자동', m: (p) => p.reply && states.has(p.conn) });
      if (s.web) r.push({ c: ['아무나', '웹 서버', '443'], act: 'allow', m: (p) => p.to === 'web' && p.port === 443 });
      if (s.ssh === 'admin') r.push({ c: ['관리자 IP', 'SSH 서버', '22'], act: 'allow', memo: '관리자만', m: (p) => p.from === 'admin' && p.to === 'ssh' && p.port === 22 });
      if (s.ssh === 'all') r.push({ c: ['아무나', 'SSH 서버', '22'], act: 'allow', m: (p) => p.to === 'ssh' && p.port === 22 });
      if (s.ssh !== 'all' && s.def === 'allow') r.push({ c: ['아무나', 'SSH 서버', '22'], act: 'deny', m: (p) => p.to === 'ssh' && p.port === 22 });
      if (s.db) r.push({ c: ['아무나', 'DB', '3306'], act: 'allow', memo: '실수!', bad: true, m: (p) => p.to === 'db' && p.port === 3306 });
      r.push({ c: ['그 밖', '모두', '*'], act: s.def === 'deny' ? 'deny' : 'allow', memo: '기본 정책', bad: s.def === 'allow', m: () => true });
      let k = 0;
      for (const x of r) if (!x.tag) x.n = String(++k);
      return r;
    };
    const outRules = () => (s.out
      ? [{ n: '1', c: ['www.example', '443'], act: 'allow', m: (p) => p.to === 'site' && p.port === 443 },
        { n: '2', c: ['그 밖 모두', '*'], act: 'deny', m: () => true }]
      : [{ n: '1', c: ['어디든', '*'], act: 'allow', m: () => true }]);

    const drawRows = (g, T, rules) => {
      g.replaceChildren();
      return rules.map((r, i) => {
        const y = TROW(i);
        const rg = a.raw('g', {}, g);
        const bg = a.raw('rect', { x: T.x + 6, y: y - 7.5, width: T.w - 12, height: 15, rx: 5, style: 'fill: transparent' }, rg);
        const cells = [r.n, ...r.c, r.act === 'allow' ? '허용' : '차단'];
        if (T === TIN) cells.push(r.memo || '');
        cells.forEach((v, k) => {
          const isAct = k === r.c.length + 1, isMemo = k === r.c.length + 2;
          a.text(T.col[k], y, v, { par: rg, size: 11, anchor: 'start', weight: isAct || k === 0 ? 800 : 600, mono: k === 3 && T === TIN,
            color: isAct ? (r.act === 'allow' ? 'green' : 'red') : isMemo ? (r.bad ? 'red' : 'amber') : k === 0 ? 'gray' : null });
        });
        return { ...r, bg };
      });
    };
    const mark = () => {
      const c = s.c;
      // 숫자는 노드 아래 줄에 — 배지는 무대 밖으로 삐져나가므로 쓰지 않는다(봇만 위쪽 가운데)
      a.setNode('ssh', { sub: c.sshBotPass ? `:22 · 봇 침입 ${c.sshBotPass}` : ':22', color: c.sshBotPass ? 'red' : 'violet' });
      a.setNode('db', { sub: c.dbAtk ? `:3306 · 봇 침입 ${c.dbAtk}` : ':3306', color: c.dbAtk ? 'red' : 'amber' });
      a.setNode('pc', { sub: c.pcHit ? `10.0.0.50 · 침입 ${c.pcHit}` : '10.0.0.50', color: c.pcHit ? 'red' : 'blue' });
      a.badge('bot', c.leak ? `감염 PC 연락 ${c.leak}` : '', 'pink');
      const b = a.get('bot').badgeEl;
      if (b) b.setAttribute('transform', 'translate(0 -27)');
    };
    s.paint = () => {
      rowsIn = drawRows(gin, TIN, inRules());
      rowsOut = drawRows(gout, TOUT, outRules());
      a.setNode('fw', { sub: s.def === 'deny' ? '기본 차단' : '기본 허용' });
      mark();
    };
    s.paint();

    const flashRow = (r, ok) => {
      const bg = r.bg;
      const c = ok ? 'green' : 'red';
      a.tween(700, (k) => bg.setAttribute('style', `fill: color-mix(in srgb, var(--${c}) ${Math.round(32 * (1 - k))}%, transparent)`)).catch(() => {});
    };
    const judge = (p) => {
      const rules = p.out ? rowsOut : rowsIn;
      const i = rules.findIndex((r) => r.m(p));
      const r = rules[i];
      const ok = r.act === 'allow';
      flashRow(r, ok);
      const name = r.tag ? r.tag : p.out ? `나감 ${r.n}` : `규칙 ${r.n}`;
      return { ok, say: `${name} 일치 → ${ok ? '허용' : '차단'}` };
    };
    const say = (left, y, txt, ok) => {
      const t = a.text(left ? 300 : 420, y - 20, txt, { size: 11, weight: 800, anchor: left ? 'end' : 'start', color: ok ? 'green' : 'red' });
      a.spawn(() => a.wait(700).then(() => a.fadeOut(t, 250)));
    };
    const count = (p, ok) => {
      const c = s.c;
      if (p.who === 'atk') {
        if (ok) c.atkPass++; else c.atkBlock++;
        if (p.to === 'ssh') { if (ok) c.sshBotPass++; else c.sshBotBlock++; }
        if (p.to === 'db' && ok) c.dbAtk++;
        if (p.to === 'pc' && ok) c.pcHit++;
      } else if (p.who === 'c2') {
        if (ok) c.leak++; else c.c2Block++;
      } else if (p.reply || p.to === 'site') {
        // 직원 PC의 웹 이용은 답장까지 받아야 성공
        if (p.reply && ok) { c.goodPass++; c.pcOk++; } else if (!ok) c.goodBlock++;
      } else {
        if (ok) c.goodPass++; else c.goodBlock++;
        if (ok && p.from === 'guest') c.gOk++;
        if (ok && p.from === 'admin') c.adminOk++;
      }
      mark();
    };

    /** 밖 → 안 */
    const inbound = async (p) => {
      const pk = a.packet(p.label, { at: L_START(p.from), color: p.color });
      await a.move(pk, L_STOP(p.from), 480);
      const v = judge(p);
      count(p, v.ok);
      say(true, LY[p.from], v.say, v.ok);
      pk.set(p.label + (v.ok ? ' ✓' : ' ✗'), v.ok ? null : 'gray');
      if (p.reply) states.delete(p.conn);
      await a.wait(280);
      if (!v.ok) { await a.fadeOut(pk, 320); return; }
      await a.move(pk, R_STOP(p.to), 0); // 방화벽 안은 건너뛴다
      await a.move(pk, R_END(p.to), 420);
      await a.fadeOut(pk, 160);
    };
    /** 안 → 밖 */
    const outbound = async (p) => {
      const pk = a.packet(p.label, { at: R_END(p.from), color: p.color });
      await a.move(pk, R_STOP(p.from), 480);
      const v = judge(p);
      if (!v.ok || p.who === 'c2') count(p, v.ok);
      say(false, RY[p.from], v.say, v.ok);
      pk.set(p.label + (v.ok ? ' ✓' : ' ✗'), v.ok ? null : 'gray');
      await a.wait(280);
      if (!v.ok) { await a.fadeOut(pk, 320); return; }
      let id = 0;
      if (p.to === 'site') { // 상태표에 기록
        id = ++conn;
        states.set(id, a.now());
        if (states.size > 24) states.delete(states.keys().next().value);
      }
      await a.move(pk, L_STOP(p.to), 0);
      await a.move(pk, L_START(p.to), 420);
      await a.fadeOut(pk, 160);
      if (p.to === 'site') {
        await a.wait(250);
        await inbound({ from: 'site', to: 'pc', port: 50000 + (id % 1000), label: '답장', who: 'good', color: 'green', reply: true, conn: id });
      }
    };

    a.every(GAP, () => {
      if (fly >= MAX_FLY) return;
      const p = KIND[SEQ[seq++ % SEQ.length]];
      fly++;
      return (p.out ? outbound(p) : inbound(p)).finally(() => { fly--; });
    });
  },
  stats: (s) => [
    ['통과한 정상 요청', s.c.goodPass, 'green'],
    ['막힌 정상 요청(불편)', s.c.goodBlock, s.c.goodBlock ? 'amber' : ''],
    ['통과한 공격', s.c.atkPass, s.c.atkPass ? 'red' : 'green'],
    ['막힌 공격', s.c.atkBlock, 'blue'],
    ['밖으로 샌 감염 통신', s.c.leak, s.c.leak ? 'red' : 'green'],
  ],
  tasks: [
    { t: '기본 정책을 "기본 허용"으로 바꿔, 공격 봇이 DB(3306)까지 들어오는 것 보기', check: (s) => s.def === 'allow' && s.c.dbAtk >= 1 },
    { t: '기본 차단 + 웹만 허용으로 20초 — 손님은 들어오고, 통과한 공격은 0', check: (s) => s.def === 'deny' && s.web && !s.db && s.ssh === 'block' && s.clock && s.clock() - s.t0 >= 20000 && s.c.atkPass === 0 && s.c.gOk >= 3 },
    { t: 'SSH를 "관리자만"으로 — 관리자는 들어오고 봇의 SSH 시도는 막히기', check: (s) => s.ssh === 'admin' && s.c.adminOk >= 1 && s.c.sshBotBlock >= 1 && s.c.sshBotPass === 0 },
    { t: '아웃바운드 제한으로 감염 PC의 바깥 통신 0 — 직원 PC 웹은 그대로', check: (s) => s.out && s.c.c2Block >= 2 && s.c.leak === 0 && s.c.pcOk >= 1 },
  ],
};

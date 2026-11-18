// DMZ 실험실: 망 구성(평평한 망 / DMZ)과 내부 방화벽 규칙, DB 계정 권한을 바꿔 가며
// "웹 서버가 뚫린 뒤" 공격자가 어디까지 번지는지 본다. 공격 순서는 정해져 있다(무작위 없음).
const TOTAL = 50000; // DB 전체 레코드
const APP_ROWS = 20000; // 웹 앱이 쓰는 표(최소 권한일 때 웹 앱 계정이 읽을 수 있는 몫)
const LEAK = 10000; // 3306 조회 한 번에 빼내는 양
const INTERNAL = ['pc1', 'pc2', 'files', 'db'];
const NAME = { web: '웹 서버', pc1: 'PC 1', pc2: 'PC 2', files: '파일 서버', db: '고객 DB' };
const BASE = { web: 'green', pc1: 'blue', pc2: 'blue', files: 'teal', db: 'violet' };
// 공격자의 내부 이동 시도 — 이 순서대로 돈다. lane: 내부 방화벽을 지나는 높이
const ATT = [
  { kind: 'query', target: 'db', label: '3306', lane: 226 },
  { kind: 'host', target: 'pc1', label: 'RDP', lane: 160 },
  { kind: 'host', target: 'files', label: 'SMB', lane: 266 },
  { kind: 'host', target: 'db', label: 'SSH', lane: 244 },
  { kind: 'host', target: 'pc2', label: 'SMB', lane: 142 },
];
const VIA_PC2 = [590, 150]; // PC 2로 갈 때 PC 1 아래로 돌아가는 점
// 방화벽 앞·뒤 면의 x
const FWE_L = 119, FWE_R = 161, FWI_L = 419, FWI_R = 461;
const fmt = (n) => n.toLocaleString('ko-KR');
const internal = (s) => INTERNAL.filter((k) => s.own[k]).length;
const owned = (s) => (s.own.web ? 1 : 0) + internal(s);

/** 노드 테두리에서 (tx,ty) 쪽 점 */
function rim(a, id, tx, ty) {
  const n = a.get(id), dx = tx - n.x, dy = ty - n.y;
  const k = Math.min((n.w / 2 + 3) / Math.abs(dx || 1e-9), (n.h / 2 + 3) / Math.abs(dy || 1e-9));
  return [n.x + dx * k, n.y + dy * k];
}
/** p에서 q 쪽으로 d만큼 */
const step = (p, q, d) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dx / L) * d, p[1] + (dy / L) * d]; };

const resetSince = (s) => { s.okSince = 0; s.blockedSince = 0; s.ownSince = 0; s.dbOwnSince = false; s.leakSince = 0; s.holdMs = 0; };

export default {
  id: 'dmz',
  title: 'DMZ 실험실',
  intro: '손님들은 계속 웹사이트를 이용하고 있어요(손님 → 웹 서버 → DB). "웹 서버 해킹당함"을 눌러 공격자가 웹 서버를 장악했다고 가정하고, 망 구성과 내부 방화벽 규칙에 따라 공격자가 어디까지 번지는지(빨간색) 보세요. 막힌 시도는 내부 방화벽 앞에서 ✗로 표시돼요. 공격 중에도 손님 요청은 멀쩡히 성공해서 겉으로는 침해를 알아채기 어렵다는 점도 눈여겨보세요. 그리고 DMZ로 나눠도 웹 → DB 길(3306)은 열려 있어야 하므로, 웹 앱의 DB 계정이 읽을 수 있는 데이터는 여전히 새어 나갈 수 있어요. 그래서 앱 보안과 DB 계정 최소 권한도 함께 필요합니다.',
  controls: [
    { type: 'radio', key: 'mode', label: '망 구성', options: [['flat', '평평한 망'], ['dmz', 'DMZ 구성']] },
    { type: 'button', label: '웹 서버 해킹당함', run: (s) => s.hack?.() },
    { type: 'toggle', key: 'narrow', label: '내부 방화벽: 웹→DB는 3306만' },
    { type: 'toggle', key: 'lp', label: 'DB 계정 최소 권한' },
    { type: 'button', label: '복구(초기화)', run: (s) => s.recover?.() },
  ],
  init: () => ({
    mode: 'dmz', narrow: true, lp: false,
    hacked: false, own: { web: false, pc1: false, pc2: false, files: false, db: false }, exposed: 0,
    ok: 0, blocked: 0, ai: 0, gen: 0, inflight: 0, atkBusy: false,
    okSince: 0, blockedSince: 0, ownSince: 0, dbOwnSince: false, leakSince: 0, holdMs: 0,
  }),
  onChange(key, s) {
    if (key === 'mode') s.recover?.(true);
    resetSince(s);
    s.paint?.();
  },
  setup(a, s) {
    // 구역
    a.zone('z-net', 16, 36, 104, 388, { label: '인터넷', color: 'gray' });
    a.zone('z-flat', 168, 36, 536, 388, { label: '사내망 — 평평한 망 (모두 한 방)', color: 'gray' });
    a.zone('z-dmz', 168, 36, 236, 388, { label: 'DMZ · 로비', color: 'teal' });
    a.zone('z-in', 476, 36, 228, 388, { label: '내부망 · 사무실', color: 'blue' });
    // 기기
    a.node('guest', 68, 104, { label: '손님', icon: '🙂', color: 'blue', w: 88, h: 52, size: 14 });
    a.node('att', 68, 330, { label: '공격자', icon: '🦹', sub: '대기', color: 'red', w: 88, h: 66, size: 14 });
    a.node('fwe', 140, 215, { label: '외부', sub: '방화벽', icon: '🧱', color: 'amber', w: 36, h: 170, size: 13 });
    a.node('web', 274, 215, { label: '웹 서버', icon: '🌐', sub: '정상', color: 'green', w: 96, h: 66, size: 14 });
    a.node('fwi', 440, 215, { label: '내부', sub: '방화벽', icon: '🧱', color: 'amber', w: 36, h: 170, size: 13 });
    a.node('pc1', 524, 104, { label: 'PC 1', icon: '💻', color: 'blue', w: 88, h: 50, size: 14 });
    a.node('pc2', 640, 104, { label: 'PC 2', icon: '💻', color: 'blue', w: 88, h: 50, size: 14 });
    a.node('db', 590, 222, { label: '고객 DB', sub: `${fmt(TOTAL)}건`, shape: 'db', color: 'violet', w: 120, h: 70, size: 14 });
    a.node('files', 590, 352, { label: '파일 서버', icon: '🗂️', color: 'teal', w: 120, h: 54, size: 14 });
    // 선
    a.edge('guest', 'fwe', { arrow: false });
    a.edge('att', 'fwe', { arrow: false, dashed: true });
    a.edge('fwe', 'web', { arrow: false });
    const DMZ_E = ['web', 'db', 'pc1', 'pc2', 'files'].map((t, i) => (i === 0 ? a.edge('web', 'fwi', { id: 'd-web', arrow: false }) : a.edge('fwi', t, { id: 'd-' + t, arrow: false })));
    const FLAT_E = ['db', 'pc1', 'pc2', 'files'].map((t) => a.edge('web', t, { id: 'f-' + t, arrow: false, dashed: true }));
    const st1 = a.text(286, 82, '', { size: 12, weight: 700, layer: 'edge' });
    const st2 = a.text(286, 101, '', { size: 11.5, cls: 'muted', layer: 'edge' });

    s.paint = () => {
      const flat = s.mode === 'flat';
      a.get('z-flat').g.style.opacity = flat ? 1 : 0;
      a.get('z-dmz').g.style.opacity = flat ? 0 : 1;
      a.get('z-in').g.style.opacity = flat ? 0 : 1;
      a.get('fwi').g.style.opacity = flat ? 0 : 1;
      DMZ_E.forEach((e) => (e.path.style.opacity = flat ? 0 : 1));
      FLAT_E.forEach((e) => (e.path.style.opacity = flat ? 1 : 0));
      a.badge('fwi', flat ? '' : s.narrow ? '3306만' : '전부 허용', s.narrow ? 'green' : 'red');
      a.setNode('att', { sub: s.own.web ? '웹 서버 장악' : s.hacked ? '침투 중' : '대기' });
      for (const k of Object.keys(BASE)) {
        const on = s.own[k];
        a.setNode(k, { color: on ? 'red' : BASE[k] });
        a.hl(k, on, 'red');
        if (k === 'web') a.setNode('web', { sub: on ? '장악됨' : '정상' });
        else if (k !== 'db') a.badge(k, on ? '장악' : '', 'red');
      }
      a.badge('db', s.own.db ? '통째로 장악' : s.exposed ? '유출' : '', 'red');
      a.setNode('db', { sub: s.exposed ? `유출 ${fmt(s.exposed)}건` : `${fmt(TOTAL)}건` });
      if (flat) { st1.textContent = '평평한 망: 웹 서버 바로 옆에'; st2.textContent = 'PC·파일 서버·DB가 있어요'; }
      else if (s.narrow) { st1.textContent = '내부 방화벽: 웹 → DB 3306만'; st2.textContent = '나머지 내부 이동은 차단'; }
      else { st1.textContent = '내부 방화벽: 전부 허용'; st2.textContent = '구역은 나눴지만 규칙이 넓음'; }
      st1.setAttribute('class', 'tx ' + (flat || !s.narrow ? 'tc-red' : 'tc-green'));
    };

    /** 공격 흔적을 모두 지우고 처음 상태로(진행 중인 공격 점은 gen으로 무효화) */
    s.recover = (quiet) => {
      s.gen++;
      s.hacked = false;
      for (const k of Object.keys(s.own)) s.own[k] = false;
      s.exposed = 0; s.ai = 0; s.blocked = 0;
      resetSince(s);
      s.paint();
      if (!quiet) a.caption('모든 기기를 깨끗하게 다시 설치했어요');
      else a.caption('망 구성을 바꿔 기기를 새로 설치했어요');
    };

    s.hack = () => {
      if (s.hacked) return;
      s.hacked = true;
      resetSince(s);
      s.paint();
      a.caption('공격자가 열려 있는 443번 문으로 웹 서버의 약점을 찔렀어요');
      const g = s.gen;
      a.spawn(async () => {
        const L = [FWE_L, 250], R = [FWE_R, 250];
        const p = a.packet('', { color: 'red', w: 16, h: 16, at: rim(a, 'att', ...L) });
        await a.move(p, L, 500);
        await a.move(p, R, 0);
        await a.move(p, rim(a, 'web', ...R), 400);
        a.remove(p);
        if (g !== s.gen) return;
        s.own.web = true;
        resetSince(s);
        s.paint();
        a.caption('웹 서버 장악 — 이제 옆 기기로 옮겨 가려고 해요');
        await a.flash('web');
      });
    };

    // 정상 손님: 손님 → 웹 서버 → (내부 방화벽) → DB → 웹 서버 → 손님
    const serve = async () => {
      if (s.inflight >= 6) return;
      s.inflight++;
      try {
        const viaFw = s.mode === 'dmz';
        const p = a.packet('', { color: 'blue', w: 14, h: 14, at: rim(a, 'guest', FWE_L, 180) });
        await a.move(p, [FWE_L, 180], 380);
        await a.move(p, [FWE_R, 200], 0);
        await a.move(p, rim(a, 'web', FWE_R, 200), 260);
        a.remove(p);
        // DB 조회(3306)
        const q = a.packet('', { color: 'teal', w: 12, h: 12, at: rim(a, 'web', FWI_L, 190) });
        if (viaFw) {
          await a.move(q, [FWI_L, 190], 300);
          await a.move(q, [FWI_R, 190], 0);
          await a.move(q, rim(a, 'db', FWI_R, 190), 260);
          await a.move(q, rim(a, 'db', FWI_R, 204), 0);
          await a.move(q, [FWI_R, 204], 260);
          await a.move(q, [FWI_L, 204], 0);
          await a.move(q, rim(a, 'web', FWI_L, 204), 300);
        } else {
          await a.move(q, rim(a, 'db', FWI_L, 190), 520);
          await a.move(q, rim(a, 'db', FWI_L, 204), 0);
          await a.move(q, rim(a, 'web', FWI_R, 204), 520);
        }
        a.remove(q);
        const r = a.packet('', { color: 'green', w: 14, h: 14, at: rim(a, 'web', FWE_R, 226) });
        await a.move(r, [FWE_R, 226], 260);
        await a.move(r, [FWE_L, 226], 0);
        await a.move(r, rim(a, 'guest', FWE_L, 226), 380);
        await a.fadeOut(r, 120);
        s.ok++; s.okSince++;
      } finally { s.inflight--; }
    };
    a.every(1000, serve);

    // 공격자의 내부 이동: 1.3초마다 한 번, 정해진 순서대로
    const cap = () => (s.lp ? APP_ROWS : TOTAL);
    const useful = (t) => (t.kind === 'host' ? !s.own[t.target] : !s.own.db && s.exposed < cap());
    const attempt = async (t) => {
      const g = s.gen;
      const w = t.label.length * 7 + 14;
      const half = w / 2;
      const p = a.packet(t.label, { color: 'red', w, h: 18, size: 10.5 });
      const put = (pt) => { p.x = pt[0]; p.y = pt[1]; p.g.setAttribute('transform', `translate(${pt[0]} ${pt[1]})`); };
      const dest = (from) => (t.target === 'pc2' ? [VIA_PC2, step(rim(a, 'pc2', ...VIA_PC2), VIA_PC2, half)] : [step(rim(a, t.target, ...from), from, half)]);
      if (s.mode === 'flat') {
        const tg = a.get(t.target), web = a.get('web');
        const aim = t.target === 'pc2' ? VIA_PC2 : [tg.x, tg.y];
        put(step(rim(a, 'web', ...aim), aim, half));
        await a.move(p, dest([web.x, web.y]), 800);
      } else {
        const L = [FWI_L, t.lane], R = [FWI_R, t.lane];
        put(step(rim(a, 'web', ...L), L, half));
        await a.move(p, step(L, [p.x, p.y], half), 520);
        if (s.narrow && t.kind === 'host') {
          p.set('✗', 'red');
          if (g === s.gen) { s.blocked++; s.blockedSince++; }
          await a.fadeOut(p, 600);
          return;
        }
        put(step(R, rim(a, t.target, ...R), half));
        await a.move(p, dest(R), 520);
      }
      if (g !== s.gen) { await a.fadeOut(p, 200); return; }
      if (t.kind === 'host') {
        s.own[t.target] = true;
        s.ownSince++;
        if (t.target === 'db') { s.exposed = TOTAL; s.dbOwnSince = true; }
      } else {
        s.exposed = Math.min(cap(), s.exposed + LEAK);
        s.leakSince++;
      }
      s.paint();
      await a.fadeOut(p, 300);
    };
    a.every(1300, async () => {
      if (!s.own.web || s.atkBusy) return;
      for (let k = 0; k < ATT.length; k++) {
        const i = (s.ai + k) % ATT.length;
        if (!useful(ATT[i])) continue;
        s.ai = (i + 1) % ATT.length;
        s.atkBusy = true;
        try { await attempt(ATT[i]); } finally { s.atkBusy = false; }
        return;
      }
    });
    // 'DMZ에서 버틴 시간' — 웹 서버는 뚫렸지만 내부는 0대인 상태가 이어진 시간
    a.every(250, () => {
      if (s.mode === 'dmz' && s.narrow && s.own.web && internal(s) === 0) s.holdMs += 250;
      else s.holdMs = 0;
    });
    s.paint();
  },
  stats: (s) => {
    const n = owned(s);
    return [
      ['정상 요청 성공', `${s.ok}건`, 'green'],
      ['공격자가 장악한 기기', `${n}대 / 5대`, n > 1 ? 'red' : n ? 'amber' : ''],
      ['막힌 내부 이동 시도', `${s.blocked}번`, s.blocked ? 'green' : ''],
      ['노출된 DB 레코드', `${fmt(s.exposed)}건`, s.exposed ? 'red' : ''],
      ['내부 장악 없이 버틴 시간', s.holdMs ? `${Math.floor(s.holdMs / 1000)}초` : '-', s.holdMs >= 20000 ? 'green' : ''],
    ];
  },
  tasks: [
    { t: '평평한 망에서 웹 서버가 뚫리면 — DB까지 장악되는 것 보기', check: (s) => s.mode === 'flat' && s.dbOwnSince },
    { t: 'DMZ 구성(내부 방화벽 3306만)에서 웹 서버만 뚫리고 내부 장악 0대로 20초 버티기', check: (s) => s.mode === 'dmz' && s.narrow && s.holdMs >= 20000 },
    { t: 'DMZ인데 내부 방화벽 규칙을 넓게 열면? 구역만 나누는 걸로는 안 되는 것 보기', check: (s) => s.mode === 'dmz' && !s.narrow && s.ownSince >= 1 },
    { t: 'DMZ + 3306만 + DB 최소 권한: 공격 중에도 손님 요청 10건 성공 — 그래도 앱이 읽는 데이터는 새는 것 확인', check: (s) => s.mode === 'dmz' && s.narrow && s.lp && s.own.web && internal(s) === 0 && s.okSince >= 10 && s.leakSince >= 1 && s.exposed <= APP_ROWS },
  ],
};

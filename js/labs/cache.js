// 캐시 실험실: 사용자 → 앱 서버(+Redis) → DB. 캐시·TTL·트래픽·원본 변경·무효화를 바꿔 본다
const Y = 170;
const KEYS = 8;
const NET = 20, RTT_REDIS = 1; // ms (응답 시간 계산용 모형)
const dbLat = (q) => 50 + Math.max(0, q - 6) * 20; // 초당 6건을 넘으면 DB가 밀리기 시작
// 점들은 노드 가장자리에서 멈추고, 노드 안은 건너뛴다(글자를 가리지 않게). 요청은 위·왼쪽, 응답은 아래·오른쪽 줄로.
const REQ = { usr: [138, Y - 8], appIn: [265, Y - 8], appOut: [395, Y - 8], db: [549, Y - 8], down: [322, 210], redis: [322, 256] };
const RES = { usr: [138, Y + 8], appIn: [265, Y + 8], appOut: [395, Y + 8], db: [549, Y + 8], down: [338, 210], redis: [338, 256] };
const SX = (i) => 330 + (i - 3.5) * 44, SY = 372;
const MAXFLY = 70;

/** 초당 r번 fn 실행 — 화면 프레임이 느려도 평균 속도가 맞도록 밀린 만큼 한꺼번에 실행 */
const pace = (a, rate, fn) => {
  let due = a.now();
  a.every(40, () => {
    const r = rate(), now = a.now();
    if (r <= 0 || now - due > 1500) { due = now; if (r <= 0) return; }
    while (due <= now) { due += 1000 / r; fn(); }
  });
};
const hitRate = (s) => { const n = s.hitSince + s.missSince; return n ? s.hitSince / n : 0; };

export default {
  id: 'cache',
  title: '캐시 실험실',
  intro: '사용자들이 상품 8개의 가격을 계속 물어봐요. 앱 서버는 먼저 Redis를 보고(HIT), 없으면 DB에서 읽어 Redis에 넣어 둬요(MISS). 캐시를 끄거나 TTL을 바꾸고, 원본 가격을 바꿔 옛 값이 나가는지 살펴보세요.',
  controls: [
    { type: 'toggle', key: 'on', label: '캐시 켜기' },
    { type: 'toggle', key: 'inv', label: '변경 시 캐시 삭제(무효화)' },
    { type: 'toggle', key: 'hot', label: '인기 상품 쏠림' },
    { type: 'range', key: 'ttl', label: 'TTL', min: 1, max: 30, step: 1, unit: '초' },
    { type: 'range', key: 'traffic', label: '트래픽', min: 2, max: 20, step: 1, unit: '건/초' },
    { type: 'button', label: '원본 가격 변경', run: (s) => s.change() },
  ],
  init: () => ({ on: true, inv: false, hot: false, ttl: 2, traffic: 8,
    ver: 1, cache: Array(KEYS).fill(null), fly: 0, dbT: [], dbq: 0,
    done: 0, hitSince: 0, missSince: 0, staleSince: 0, lat: [], chg: null }),
  onChange(key, s) {
    s.hitSince = 0; s.missSince = 0; s.staleSince = 0; s.lat = [];
    if (key === 'on' || key === 'inv') s.chg = null;
    s.paint?.();
  },
  setup(a, s) {
    a.node('users', 80, Y, { label: '사용자들', icon: '👥', color: 'blue', w: 110, h: 64 });
    a.node('app', 330, Y, { label: '앱 서버', sub: '', icon: '🖥️', color: 'green', w: 124, h: 66 });
    a.node('db', 610, Y, { label: 'DB', sub: '', icon: '🗄️', color: 'violet', shape: 'db', w: 116, h: 90 });
    a.zone('rz', 146, 238, 368, 172, { label: 'Redis 캐시 · 상품 8개', color: 'red' });
    a.node('redis', 330, 290, { label: 'Redis', sub: '메모리 캐시', icon: '⚡', color: 'red', w: 116, h: 54 });
    a.edge('users', 'app', { both: true, label: '20ms', ly: -22 });
    a.edge('app', 'db', { both: true, label: '50ms+', ly: -22 });
    a.edge('app', 'redis', { id: 'e-r', both: true, label: '1ms', lx: 30, ly: 0 });
    a.text(610, 236, 'DB 부하', { size: 11.5, cls: 'muted', layer: 'edge' });
    const load = a.bar('dbload', 554, 252, 112, { color: 'violet' });
    // 범례
    [['새 값', 'green'], ['옛 값(낡음)', 'amber'], ['비어 있음', 'gray']].forEach(([t, c], i) => {
      a.raw('rect', { x: 556, y: 304 + i * 24, width: 14, height: 14, rx: 4, style: `fill: color-mix(in srgb, var(--${c}) 35%, transparent); stroke: var(--${c}); stroke-width: 1.5` }, 'edge');
      a.text(578, 311 + i * 24, t, { size: 12, anchor: 'start', layer: 'edge' });
    });
    // 키 칸: 상품마다 하나
    const slots = Array.from({ length: KEYS }, (_, i) => {
      const g = a.raw('g', { transform: `translate(${SX(i)} ${SY})` }, 'edge');
      const box = a.raw('rect', { x: -19, y: -24, width: 38, height: 48, rx: 7 }, g);
      a.text(0, -10, '#' + (i + 1), { size: 12, weight: 700, par: g });
      const st = a.text(0, 6, '', { size: 10, par: g, cls: 'muted' });
      a.raw('rect', { x: -14, y: 15, width: 28, height: 4, rx: 2, style: 'fill: var(--line2)' }, g);
      const fill = a.raw('rect', { x: -14, y: 15, width: 0, height: 4, rx: 2 }, g);
      return { g, box, st, fill };
    });

    const live = (k) => { const e = s.cache[k]; if (e && e.exp <= a.now()) s.cache[k] = null; return s.cache[k]; };
    const dbq = () => { const t = a.now() - 2000; return s.dbT.filter((x) => x > t).length / 2; };

    s.paint = () => {
      s.dbq = dbq();
      slots.forEach((sl, k) => {
        const e = live(k);
        const c = !e ? 'gray' : e.ver < s.ver ? 'amber' : 'green';
        sl.box.setAttribute('style', `fill: color-mix(in srgb, var(--${c}) ${e ? 30 : 8}%, transparent); stroke: var(--${c}); stroke-width: 1.5`);
        sl.st.textContent = !e ? '비어' : e.ver < s.ver ? '옛 값' : '새 값';
        sl.fill.setAttribute('width', e ? Math.max(0, Math.min(1, (e.exp - a.now()) / e.ttl)) * 28 : 0);
        sl.fill.setAttribute('style', `fill: var(--${c})`);
        sl.g.style.opacity = s.on ? 1 : 0.35;
      });
      a.get('redis').g.style.opacity = s.on ? 1 : 0.4;
      a.setNode('redis', { sub: s.on ? `TTL ${s.ttl}초` : '꺼짐' });
      a.get('e-r').path.style.opacity = s.on ? 1 : 0.2;
      a.setNode('app', { sub: s.on ? 'Redis 먼저 확인' : '매번 DB로' });
      a.setNode('db', { sub: `가격표 v${s.ver} · ${s.dbq.toFixed(1)}건/초`, color: s.dbq >= 10 ? 'red' : s.dbq >= 6 ? 'amber' : 'violet' });
      load.set(Math.min(1, s.dbq / 16), 0);
    };
    s.paint();

    const answer = (ms, stale, hit) => {
      s.done++;
      s.lat.push(ms); if (s.lat.length > 40) s.lat.shift();
      if (stale) s.staleSince++;
      if (s.chg) { s.chg.n++; if (stale) s.chg.stale++; if (hit) s.chg.hit++; }
    };
    const readDb = (k) => {
      const q = dbq();
      s.dbT.push(a.now()); if (s.dbT.length > 120) s.dbT.shift();
      return { ver: s.ver, ms: dbLat(q) };
    };
    const back = async (p, from) => { // 앱 서버에서 사용자에게
      await a.move(p, from === 'redis' ? RES.down : RES.appOut, from === 'redis' ? 200 : 360);
      await a.move(p, RES.appIn, 0);
      await a.move(p, RES.usr, 380);
      await a.fadeOut(p, 150);
    };

    s.fire = async () => {
      if (s.fly >= MAXFLY) return;
      s.fly++;
      try {
        const k = s.hot && Math.random() < 0.8 ? 0 : s.hot ? 1 + Math.floor(Math.random() * (KEYS - 1)) : Math.floor(Math.random() * KEYS);
        const p = a.packet('', { at: REQ.usr, color: 'blue', w: 16, h: 16 });
        await a.move(p, REQ.appIn, 380);
        if (s.on) {
          await a.move(p, REQ.down, 0);
          await a.move(p, REQ.redis, 200);
          const e = live(k);
          if (e) { // HIT
            const stale = e.ver < s.ver;
            answer(NET + RTT_REDIS, stale, true);
            s.hitSince++;
            a.remove(p);
            const r = a.packet('', { at: RES.redis, color: stale ? 'amber' : 'green', w: 16, h: 16 });
            s.paint();
            await back(r, 'redis');
            return;
          }
          s.missSince++;
          p.set(null, 'gray');
          await a.move(p, REQ.down, 200);
        }
        await a.move(p, REQ.appOut, 0);
        await a.move(p, REQ.db, 360);
        const d = readDb(k);
        if (s.on) s.cache[k] = { ver: d.ver, exp: a.now() + s.ttl * 1000, ttl: s.ttl * 1000 }; // 읽은 값을 바로 SET
        answer(s.on ? NET + RTT_REDIS * 2 + d.ms : NET + d.ms, false, false);
        a.remove(p);
        const r = a.packet('', { at: RES.db, color: 'green', w: 16, h: 16 });
        s.paint();
        await back(r, 'db');
      } finally { s.fly--; }
    };

    s.change = () => {
      s.ver++;
      s.chg = { on: s.on, inv: s.inv, n: 0, stale: 0, hit: 0 };
      a.spawn(() => a.flash('db'));
      if (s.inv) {
        s.cache.fill(null); // 쓰기와 함께 DEL
        a.spawn(() => a.send(REQ.down, REQ.redis, 'DEL', { color: 'red', dur: 300 }));
      }
      s.paint();
      a.spawn(async () => {
        a.remove('chgnote');
        a.note('chgnote', 470, 76, s.inv ? `가격표 v${s.ver} · 캐시 사본 삭제` : `가격표 v${s.ver} · 캐시엔 옛 값이 남아요`, { color: s.inv ? 'green' : 'amber' });
        await a.wait(1800);
        a.remove('chgnote');
      });
    };

    pace(a, () => s.traffic, () => a.spawn(() => s.fire()));
    a.every(100, () => s.paint());
  },
  stats: (s) => {
    const n = s.hitSince + s.missSince, hr = hitRate(s);
    const avg = s.lat.length ? s.lat.reduce((x, y) => x + y, 0) / s.lat.length : 0;
    return [
      ['적중률', s.on ? (n ? Math.round(hr * 100) + '%' : '-') : '캐시 꺼짐', s.on && n && hr >= 0.8 ? 'green' : ''],
      ['평균 응답', avg ? Math.round(avg) + 'ms' : '-', avg > 80 ? 'red' : avg && avg < 40 ? 'green' : ''],
      ['DB 부하', s.dbq.toFixed(1) + '건/초', s.dbq >= 6 ? 'red' : ''],
      ['옛 값 응답', s.staleSince, s.staleSince ? 'amber' : ''],
      ['처리한 요청', s.done, ''],
    ];
  },
  tasks: [
    { t: '캐시를 끄고 DB 부하가 치솟는 것 보기 — DB 쿼리 초당 7건 이상', check: (s) => !s.on && s.dbq >= 7 },
    { t: '적중률 80% 이상 만들기 (요청 50건 이상에서)', check: (s) => s.on && s.hitSince + s.missSince >= 50 && hitRate(s) >= 0.8 },
    { t: '무효화를 끈 채 원본 가격을 바꾸면? — 옛 값 응답이 나가는 것 확인하기', check: (s) => !!s.chg && s.chg.on && !s.chg.inv && s.chg.stale >= 3 },
    { t: '무효화를 켜고 원본 가격을 바꾼 뒤, 옛 값 0건으로 30건 응답하기', check: (s) => !!s.chg && s.chg.on && s.chg.inv && s.chg.n >= 30 && s.chg.stale === 0 && s.chg.hit >= 10 },
  ],
};

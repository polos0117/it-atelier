// 스위치 실험실: PC 8대가 가운데 장비(허브/스위치)에 꽂혀 있다. MAC 표 학습·플러딩·엿보기·VLAN·루프(브로드캐스트 폭풍)를 바꿔 본다
// PC n은 n번 포트. 왼쪽 넷(1·2·5·6)은 영업팀, 오른쪽 넷(3·4·7·8)은 개발팀. MAC은 문서용 예시 대역(00:00:5E:00:53:xx).
const N = 8;
const XS = [62, 176, 290, 404];
const PC = Array.from({ length: N }, (_, i) => ({ id: 'p' + i, x: XS[i % 4], y: i < 4 ? 62 : 378, w: 96, h: 50 }));
const DEV = { x: 233, y: 220, w: 140, h: 70 };
const team = (i) => (i % 4 < 2 ? 0 : 1); // 0 영업, 1 개발
const SNOOP = 7; // 엿보는 PC = PC 8
const mac = (i) => `00:00:5E:00:53:${String(i + 1).padStart(2, '0')}`;
const HOP = 450; // 한 구간 이동 시간(ms)
const MAXFLY = 110; // 화면에 동시에 떠 있는 점 상한
const SMAX = 60; // 폭풍 세기 상한
const WIN = 10000; // "최근 10초" 창
const TX = 488, TW = 216; // 오른쪽 표 자리
const ROWY = (k) => 72 + k * 19;
// 루프 케이블(장치 오른쪽에서 나가 다시 들어오는 고리)
const LOOP = [[303, 206], [385, 166], [385, 274], [303, 234]];
const bez = (t) => {
  const [p0, p1, p2, p3] = LOOP, u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
};
const RING = [0, 0.2, 0.4, 0.6, 0.8, 1].map(bez);

/** 노드 테두리 바로 바깥 점 — 점이 글자를 가리지 않게 */
const bd = (n, tx, ty, pad = 10) => {
  const dx = tx - n.x, dy = ty - n.y;
  const k = Math.min((n.w / 2 + pad) / Math.abs(dx || 1e-9), (n.h / 2 + pad) / Math.abs(dy || 1e-9));
  return [n.x + dx * k, n.y + dy * k];
};
const pcPt = (i) => bd(PC[i], DEV.x, DEV.y);
const devPt = (i) => bd(DEV, PC[i].x, PC[i].y);

/** 고정 씨앗 난수(mulberry32) — 처음부터 하면 늘 같은 흐름 */
function rng32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default {
  id: 'switch',
  title: '스위치 실험실',
  intro: '사무실 한 층의 PC 8대가 가운데 장비에 꽂혀 있어요(PC 1은 1번 포트, PC 2는 2번 포트…). 왼쪽 넷은 영업팀, 오른쪽 넷은 개발팀이고, 가끔 "모두에게" 묻는 브로드캐스트(ARP 같은)도 섞여요. 허브와 스위치를 바꿔 보며 불필요한 복사(빨간 점)와 엿보는 PC가 가로채는 양을 비교하고, 스위치의 MAC 표가 채워지는 모습을 지켜보세요. VLAN을 켜면 두 팀이 서로 다른 네트워크가 되어(다른 팀과는 라우터를 거쳐야 하므로 이 실험에선 같은 팀끼리만 주고받아요), 케이블 루프를 만들면 브로드캐스트 폭풍이 어떻게 번지는지 볼 수 있어요.',
  controls: [
    { type: 'radio', key: 'dev', label: '장치', options: [['hub', '허브'], ['switch', '스위치']] },
    { type: 'toggle', key: 'vlan', label: 'VLAN 나누기 (영업 · 개발)' },
    { type: 'toggle', key: 'snoop', label: '엿보는 PC (PC 8)' },
    { type: 'toggle', key: 'loop', label: '케이블 루프 (STP 꺼짐)' },
    { type: 'range', key: 'rate', label: '트래픽', min: 1, max: 10, step: 1, unit: '프레임/초' },
    { type: 'button', label: 'MAC 표 비우기', run: (s) => s.clearTable?.() },
  ],
  init: () => ({ dev: 'hub', vlan: false, snoop: false, loop: false, rate: 3,
    table: [], ok: 0, floodT: [], leakT: [], storm: 0, lost: 0,
    okSince: 0, snoopSince: 0, bcSince: 0, leakSince: 0, full: null, relearn: null, epoch: 0 }),
  onChange(key, s) {
    // 바꾸기 전에 출발한 프레임은 새 숫자에 넣지 않는다(epoch)
    s.epoch++; s.okSince = 0; s.snoopSince = 0; s.bcSince = 0; s.leakSince = 0;
    // 장치를 바꾸거나 VLAN 구성을 바꾸면 표를 새로 배운다(실제 스위치도 포트의 VLAN이 바뀌면 그 항목을 지운다)
    if (key === 'dev' || key === 'vlan') { s.table = []; s.relearn = null; }
    s.full = s.dev === 'switch' && s.table.length === N ? { ok: 0, flood: 0 } : null;
    if (key === 'loop' && !s.loop) { s.storm = 0; s.lost = 0; }
    s.paint?.();
  },
  setup(a, s) {
    const rnd = rng32(20261118);
    const fly = { n: 0 };
    const seen = Array(N).fill(-1e9); // 표 줄을 마지막으로 배우거나 찾아본 때
    let stormTurn = 0;

    /* ----- 무대 ----- */
    a.node('dev', DEV.x, DEV.y, { label: '허브', icon: '📢', sub: '', w: DEV.w, h: DEV.h, color: 'gray' });
    PC.forEach((p, i) => {
      a.node(p.id, p.x, p.y, { label: `PC ${i + 1}`, icon: '💻', sub: '', w: p.w, h: p.h, size: 14, color: 'blue' });
      a.edge('dev', p.id, { id: 'e' + i, arrow: false });
    });
    const loopPath = a.raw('path', { d: `M${LOOP[0]} C ${LOOP[1]}, ${LOOP[2]}, ${LOOP[3]}`, class: 'edge dashed ec-red', fill: 'none', style: 'stroke-width: 3; opacity: 0' }, 'edge');
    const loopLab = a.text(378, 220, '루프', { size: 12, weight: 800, color: 'red', layer: 'edge', anchor: 'start' });
    loopLab.style.opacity = 0;

    // MAC 표
    const tg = a.raw('g', {}, 'edge');
    a.raw('rect', { x: TX, y: 14, width: TW, height: 208, rx: 12, style: 'fill: color-mix(in srgb, var(--teal) 6%, transparent); stroke: color-mix(in srgb, var(--teal) 55%, transparent); stroke-width: 1.5' }, tg);
    const title = a.text(TX + 12, 31, '', { par: tg, size: 12.5, weight: 800, anchor: 'start', color: 'teal' });
    const head = a.raw('g', {}, tg);
    a.text(TX + 14, 51, 'MAC 주소', { par: head, size: 11, anchor: 'start', cls: 'muted' });
    a.text(TX + 160, 51, '포트', { par: head, size: 11, cls: 'muted' });
    a.text(TX + 194, 51, 'VLAN', { par: head, size: 11, cls: 'muted' });
    const rows = Array.from({ length: N }, (_, k) => {
      const g = a.raw('g', {}, tg);
      const bg = a.raw('rect', { x: TX + 6, y: ROWY(k) - 9, width: TW - 12, height: 18, rx: 5, style: 'fill: color-mix(in srgb, var(--teal) 30%, transparent); opacity: 0' }, g);
      const m = a.text(TX + 14, ROWY(k), '', { par: g, size: 11.5, mono: true, anchor: 'start', weight: 600 });
      const pt = a.text(TX + 160, ROWY(k), '', { par: g, size: 12, weight: 800 });
      const vl = a.text(TX + 194, ROWY(k), '', { par: g, size: 11.5, mono: true });
      return { g, bg, m, pt, vl };
    });
    const msg = [0, 1, 2].map((k) => a.text(TX + TW / 2, 96 + k * 24, '', { par: tg, size: 12.5, weight: k ? 600 : 800 }));

    // 범례
    [['blue', '받는 사람에게 가는 프레임'], ['amber', '모두에게 (브로드캐스트)'], ['red', '불필요한 복사 (플러딩)']].forEach(([c, t], k) => {
      a.raw('circle', { cx: TX + 12, cy: 244 + k * 22, r: 6, style: `fill: var(--${c})` }, 'edge');
      a.text(TX + 26, 244 + k * 22, t, { size: 12, anchor: 'start', layer: 'edge' });
    });
    const snoopNote = a.text(TX + 6, 312, '👀 PC 8은 받은 건 다 저장해요', { size: 12, anchor: 'start', layer: 'edge', color: 'red', weight: 700 });
    // 루프 폭풍 계기
    const sg = a.raw('g', { style: 'opacity: 0' }, 'edge');
    a.text(TX + 6, 344, '루프 · 회선 사용률', { par: sg, size: 12, anchor: 'start', weight: 700, color: 'red' });
    const meter = a.bar('meter', TX + 6, 366, TW - 12, { color: 'red' });
    sg.append(meter.g);
    const lostTx = a.text(TX + 6, 390, '', { par: sg, size: 12, anchor: 'start' });
    const stormTx = a.text(TX + 6, 410, '', { par: sg, size: 11.5, anchor: 'start', cls: 'muted' });

    /* ----- 그리기 ----- */
    const paintTable = () => {
      const hub = s.dev === 'hub';
      title.textContent = hub ? '허브 — 표가 없어요' : `스위치의 MAC 표 · ${s.table.length}/${N}칸`;
      head.style.opacity = hub ? 0 : 1;
      rows.forEach((r, k) => {
        const i = s.table[k];
        if (hub || i == null) { r.g.style.opacity = 0; return; }
        r.g.style.opacity = 1;
        r.m.textContent = mac(i);
        r.pt.textContent = String(i + 1);
        r.pt.setAttribute('class', 'tx tc-' + (team(i) ? 'green' : 'blue'));
        r.vl.textContent = s.vlan ? (team(i) ? '20' : '10') : '1';
      });
      const lines = hub ? ['주소를 보지 않고', '받은 걸 모든 포트로', s.vlan ? '복사해요 (VLAN도 몰라요)' : '복사해요']
        : s.table.length ? ['', '', ''] : ['(비어 있음)', '프레임이 들어오면', '보낸 MAC을 적어요'];
      msg.forEach((t, k) => { t.textContent = lines[k]; t.setAttribute('class', 'tx' + (hub && s.vlan && k === 2 ? ' tc-red' : k ? ' muted' : '')); });
    };
    const paintSnoop = () => a.badge(PC[SNOOP].id, s.snoop ? `엿봄 ${s.snoopSince}` : '', 'red');
    s.paint = () => {
      const hub = s.dev === 'hub';
      const storming = s.loop && s.storm >= SMAX * 0.5;
      a.setNode('dev', { label: hub ? '허브' : '스위치', icon: hub ? '📢' : '🎯',
        sub: storming ? '⚠ 브로드캐스트 폭풍' : hub ? '모두에게 복사' : s.vlan ? 'VLAN 10 · 20' : '외워서 그 자리로',
        color: storming ? 'red' : hub ? 'gray' : 'teal' });
      PC.forEach((p, i) => {
        const sn = s.snoop && i === SNOOP;
        a.setNode(p.id, { label: `PC ${i + 1}${sn ? ' 👀' : ''}`, sub: s.vlan ? (team(i) ? 'VLAN 20 개발' : 'VLAN 10 영업') : team(i) ? '개발팀' : '영업팀',
          color: sn ? 'red' : team(i) ? 'green' : 'blue' });
        const e = a.get('e' + i).path.classList;
        e.toggle('ec-blue', s.vlan && !team(i));
        e.toggle('ec-green', s.vlan && !!team(i));
      });
      loopPath.style.opacity = s.loop ? 1 : 0;
      loopLab.style.opacity = s.loop ? 1 : 0;
      sg.style.opacity = s.loop ? 1 : 0;
      snoopNote.style.opacity = s.snoop ? 1 : 0;
      paintTable();
      paintSnoop();
    };
    s.paint();

    s.clearTable = () => {
      if (s.dev !== 'switch') return;
      s.table = [];
      s.relearn = { flood: 0 };
      s.full = null;
      seen.fill(-1e9);
      s.paint();
    };

    /* ----- 프레임 ----- */
    const travel = async (from, to, color, w = 16) => {
      if (fly.n >= MAXFLY) { await a.wait(HOP); return; }
      fly.n++;
      const p = a.packet('', { at: from, color, w, h: w });
      try {
        await a.move(p, to, HOP);
        await a.fadeOut(p, 100);
      } finally { fly.n--; }
    };
    const leak = (ep) => { s.leakT.push(a.now()); if (ep === s.epoch) s.leakSince++; };
    const learn = (i) => {
      seen[i] = a.now();
      if (s.table.includes(i)) return;
      s.table.push(i);
      if (s.table.length === N && !s.full) s.full = { ok: 0, flood: 0 };
      paintTable();
    };
    const arrive = (src, dst, j, ep) => {
      const cur = ep === s.epoch;
      if (dst < 0) { if (team(j) !== team(src)) leak(ep); return; } // 브로드캐스트는 모두가 받는 게 정상
      if (j === dst) { s.ok++; if (cur) s.okSince++; if (s.full) s.full.ok++; return; }
      s.floodT.push(a.now()); // 받는 사람이 아닌데 받은 복사본
      if (team(j) !== team(src)) leak(ep);
      if (cur && s.snoop && j === SNOOP) { s.snoopSince++; paintSnoop(); }
    };
    const fire = async () => {
      const ep = s.epoch;
      const src = Math.floor(rnd() * N);
      const bc = rnd() < 0.2;
      let dst = -1;
      if (!bc) {
        const pool = [...Array(N).keys()].filter((j) => j !== src && (!s.vlan || team(j) === team(src)));
        dst = pool[Math.floor(rnd() * pool.length)];
      }
      await travel(pcPt(src), devPt(src), bc ? 'amber' : 'blue');
      const hub = s.dev === 'hub';
      if (!hub) learn(src);
      const known = !hub && !bc && s.table.includes(dst);
      const outs = known ? [dst] : [...Array(N).keys()].filter((j) => j !== src && (hub || !s.vlan || team(j) === team(src)));
      if (known) seen[dst] = a.now();
      if (!known) {
        if (s.loop) s.storm = Math.min(SMAX, s.storm + 3); // 모두에게 가는 프레임은 루프 케이블로도 나가 계속 돈다
        if (!bc && s.relearn) s.relearn.flood++;
        if (!bc && s.full) s.full.flood++; // 표가 다 찼는데도 모르는 목적지(허브는 표가 없어 해당 없음)
      }
      if (s.loop && s.storm >= SMAX * 0.5 && rnd() < (s.storm / SMAX) * 0.9) { s.lost++; return; } // 폭풍에 묻혀 사라짐
      await a.par(...outs.map(async (j) => {
        await travel(devPt(j), pcPt(j), bc ? 'amber' : j === dst ? 'blue' : 'red');
        arrive(src, dst, j, ep);
      }));
      if (bc) { s.ok++; if (s.full) s.full.ok++; if (ep === s.epoch) { s.okSince++; s.bcSince++; } }
    };
    a.every(() => 1000 / s.rate, fire);

    // 루프: 모두에게 가는 프레임이 고리를 돌며 불어난다(L2 프레임엔 수명이 없다). 루프를 끄면(=STP가 막으면) 바로 멈춘다
    const stormDot = async () => {
      if (fly.n >= MAXFLY) return;
      fly.n++;
      const p = a.packet('', { at: RING[0], color: 'amber', w: 12, h: 12 });
      try { await a.move(p, RING.slice(1), 500); a.remove(p); } finally { fly.n--; }
    };
    a.every(150, () => {
      if (!s.loop) { s.storm = 0; return; }
      if (s.storm > 0) s.storm = Math.min(SMAX, s.storm * 1.3 + 0.5);
      if (s.storm <= 0) return;
      const k = Math.min(4, Math.ceil((s.storm / SMAX) * 4));
      for (let i = 0; i < k; i++) {
        a.spawn(() => a.wait(i * 35).then(stormDot));
        const j = stormTurn++ % N;
        a.spawn(() => a.wait(i * 35).then(() => travel(devPt(j), pcPt(j), 'amber', 12)));
      }
    });

    // 표 줄 강조·10초 창 정리·폭풍 계기
    let lastStorming = false;
    a.every(100, () => {
      const now = a.now();
      for (const arr of [s.floodT, s.leakT]) {
        while (arr.length && arr[0] < now - WIN) arr.shift();
        if (arr.length > 4000) arr.splice(0, arr.length - 4000);
      }
      rows.forEach((r, k) => {
        const i = s.table[k];
        r.bg.style.opacity = i == null ? 0 : Math.max(0, 1 - (now - seen[i]) / 600);
      });
      meter.f.setAttribute('width', (s.storm / SMAX) * meter.w);
      lostTx.textContent = `폭풍에 묻혀 잃은 프레임 ${s.lost}개`;
      stormTx.textContent = s.storm >= SMAX * 0.5 ? '정상 프레임이 거의 못 지나가요' : s.storm > 0 ? '고리를 돌며 불어나는 중…' : '브로드캐스트가 오면 시작돼요';
      const storming = s.loop && s.storm >= SMAX * 0.5;
      if (storming !== lastStorming) { lastStorming = storming; s.paint(); }
    });
  },
  stats: (s) => [
    ['전달된 프레임', s.ok, 'green'],
    ['불필요한 복사 (최근 10초)', s.floodT.length, s.floodT.length ? 'red' : ''],
    ['엿보인 프레임', s.snoop ? s.snoopSince : '엿보는 PC 꺼짐', s.snoop && s.snoopSince ? 'red' : ''],
    ['다른 팀에 닿은 복사 (최근 10초)', s.leakT.length, s.leakT.length ? 'amber' : ''],
    ['MAC 표', s.dev === 'hub' ? '없음 (허브)' : `${s.table.length} / ${N}칸`, s.dev === 'switch' && s.table.length === N ? 'teal' : ''],
  ],
  tasks: [
    { t: '허브에서 엿보는 PC를 켜고, 남의 프레임 10개 이상 가로채기', check: (s) => s.dev === 'hub' && s.snoop && s.snoopSince >= 10 },
    { t: '스위치로 바꿔 MAC 표 8칸이 다 찬 뒤, 프레임 20개 동안 불필요한 복사 0 유지', check: (s) => s.dev === 'switch' && !s.loop && !!s.full && s.full.ok >= 20 && s.full.flood === 0 },
    { t: '스위치에서 "MAC 표 비우기" — 다시 플러딩하다가 8칸을 새로 배우는 과정 보기', check: (s) => s.dev === 'switch' && !!s.relearn && s.relearn.flood >= 1 && s.table.length === N },
    { t: '스위치에서 VLAN을 켜고, 브로드캐스트 5개가 지나는 동안 다른 팀에 닿은 복사 0 확인', check: (s) => s.dev === 'switch' && s.vlan && !s.loop && s.bcSince >= 5 && s.leakSince === 0 },
  ],
};

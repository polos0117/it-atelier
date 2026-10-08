// 메시지 큐 실험실: 주문 속도·워커 수·처리 시간·워커 장애·직접 호출을 바꿔 가며 큐가 완충하는 모습을 본다
const UX = 52, PX = 176, QL = 250, QR = 498, QY = 230, CY = 240;
const WX = 638, WY = [62, 144, 226, 308, 390];
const SLOT = (i) => QR - 24 - i * 40; // 0 = 맨 앞(워커 쪽)
const MAXS = 6; // 큐 안에 보이는 칸 수
const QCAP = 40; // 큐 최대 길이 — 넘치면 거절
const PROC = { fast: 400, mid: 800, slow: 1600 }; // 처리 시간(ms)
const TAKE = 350; // 큐에서 워커까지 가는 시간
const VT = 2500; // ACK 기다리는 시간(가시성 타임아웃)
const WAITMAX = 1500; // 직접 호출 모드: 빈 워커를 기다리는 최대 시간
const POOL = 4; // 직접 호출 모드: 주문 서버가 한꺼번에 붙잡고 기다릴 수 있는 요청 수

export default {
  id: 'mq',
  title: '메시지 큐 실험실',
  intro: '주문이 계속 큐로 들어오고 워커들이 하나씩 꺼내 처리해요. 주문을 몰아 보내고, 워커 수와 처리 시간을 바꾸고, 워커를 고장 내거나 큐를 아예 빼 보며 큐 길이와 실패가 어떻게 달라지는지 보세요.',
  controls: [
    { type: 'range', key: 'rate', label: '초당 주문', min: 1, max: 8, step: 1, unit: '개' },
    { type: 'range', key: 'workers', label: '워커 수', min: 1, max: 5, step: 1, unit: '명' },
    { type: 'radio', key: 'proc', label: '처리 시간', options: [['fast', '빠름'], ['mid', '보통'], ['slow', '느림']] },
    { type: 'toggle', key: 'down', label: '워커 1 장애' },
    { type: 'toggle', key: 'direct', label: '큐 없이 직접 호출' },
    { type: 'button', label: '주문 폭주 20개', run: (s, a) => { for (let i = 0; i < 20; i++) a.spawn(() => a.wait(i * 50).then(() => s.order())); } },
  ],
  init: () => ({ rate: 2, workers: 3, proc: 'mid', down: false, direct: false,
    qlen: 0, done: 0, redeliv: 0, fail: 0, waits: [],
    doneSince: 0, failSince: 0, redelivSince: 0, redoneSince: 0, piled: false, drained: false, calm: 0 }),
  onChange(key, s) {
    s.doneSince = 0; s.failSince = 0; s.redelivSince = 0; s.redoneSince = 0; s.waits = [];
    s.calm = s.now();
    if (key === 'direct') { s.piled = false; s.drained = false; }
    s.paint();
  },
  setup(a, s) {
    const W = WY.map(() => ({ busy: false, crashed: false, sub: '대기', color: 'green' }));
    const q = []; // 큐에 보이는(아직 안 꺼낸) 메시지
    let seq = 0, waiting = 0, rr = 0;
    s.now = a.now;
    s.calm = a.now();

    a.node('u', UX, QY, { label: '손님들', icon: '👥', color: 'blue', w: 84, h: 58 });
    a.node('p', PX, QY, { label: '주문 서버', sub: '', icon: '🛒', color: 'amber', w: 108, h: 70 });
    a.zone('qz', QL, QY - 34, QR - QL, 68, { label: '메시지 큐', color: 'violet' });
    a.text(QR - 10, QY - 20, '', { id: 'qmore', size: 11, anchor: 'end', weight: 700, cls: 'muted' });
    a.text((QL + QR) / 2, CY, '큐 없음 — 워커를 바로 불러요', { id: 'qoff', size: 12, weight: 700, color: 'red' });
    a.edge('u', 'p');
    a.edge('p', [QL - 2, QY]);
    WY.forEach((y, i) => {
      a.node('w' + i, WX, y, { label: `워커 ${i + 1}`, sub: '대기', icon: '⚙️', color: 'green', w: 124, h: 58 });
      a.edge([QR + 2, QY], 'w' + i, { id: 'e' + i });
    });
    // 큐 길이 게이지
    a.text(QL, 168, '큐 길이', { size: 12, anchor: 'start', weight: 700, cls: 'muted' });
    const gb = a.bar('qb', QL + 54, 168, 140, { color: 'violet' });
    a.text(QR, 168, '0개', { id: 'qn', size: 13, anchor: 'end', weight: 800, mono: true });
    // ACK 타이머(워커 1이 죽었을 때만 보임)
    a.text((QL + QR) / 2, 318, '', { id: 'tl', size: 11.5, weight: 700, color: 'amber' });
    const tb = a.bar('tb', QL + 44, 298, QR - QL - 88, { color: 'amber' });
    tb.g.style.opacity = 0;

    const glide = (c, x) => {
      if (c.tx === x) return;
      c.tx = x;
      const tok = (c.tok = (c.tok || 0) + 1), x0 = c.x;
      a.tween(220, (k) => {
        if (c.tok !== tok) return;
        c.x = x0 + (x - x0) * k;
        c.g.setAttribute('transform', `translate(${c.x} ${c.y})`);
      }).catch(() => {});
    };
    const render = () => {
      q.forEach((m, i) => {
        m.chip.g.style.opacity = i < MAXS ? 1 : 0;
        glide(m.chip, SLOT(Math.min(i, MAXS - 1)));
      });
      const n = q.length;
      s.qlen = n;
      a.setText('qmore', n > MAXS ? `+${n - MAXS}개 더` : '');
      a.setText('qn', `${n}개`);
      a.get('qn').setAttribute('class', `tx mono tc-${n >= 10 ? 'red' : n >= 3 ? 'amber' : 'green'}`);
      gb.set(Math.min(1, n / 20), 150).catch(() => {});
    };
    const chip = (label, at, color = 'violet') => a.packet(label, { at, color, w: 40, h: 24, size: 11 });

    const paintW = (i) => {
      const w = W[i], on = i < s.workers;
      const off = !on && !w.busy && !w.crashed;
      a.setNode('w' + i, off ? { sub: '꺼짐', color: 'gray' } : { sub: w.sub, color: w.color });
      a.get('w' + i).g.style.opacity = off ? 0.3 : 1;
      a.get('e' + i).path.style.opacity = off ? 0.15 : 1;
      a.hl('w' + i, w.busy && !w.crashed);
      a.badge('w' + i, w.crashed ? '✕' : i === 0 && s.down && !off ? '불안정' : '', 'red');
    };
    const setW = (i, sub, color) => { W[i].sub = sub; W[i].color = color; paintW(i); };
    s.paint = () => {
      W.forEach((_, i) => paintW(i));
      a.setNode('p', { sub: s.direct ? (waiting ? `기다리는 중 ${waiting}` : '직접 호출') : '넣고 바로 응답' });
      a.get('qz').g.style.opacity = s.direct ? 0.35 : 1;
      a.get('qoff').style.opacity = s.direct ? 1 : 0;
    };
    s.paint();
    render();

    const pushWait = (ms) => { s.waits.push(ms / 1000); if (s.waits.length > 20) s.waits.shift(); };
    const failAt = async (label) => {
      s.fail++; s.failSince++;
      const p = a.packet(label, { at: 'p', color: 'red' });
      await a.move(p, [PX, QY - 58], 500);
      await a.fadeOut(p, 400);
    };
    const pickIdle = () => {
      for (let k = 0; k < s.workers; k++) {
        const i = (rr + k) % s.workers;
        if (!W[i].busy && !W[i].crashed) { rr = i + 1; return i; }
      }
      return -1;
    };

    /** 워커 1이 ACK 전에 죽는다. 큐 모드면 시간 초과 뒤 다시 전달, 직접 호출이면 그 주문은 실패 */
    const crash = async (m, direct) => {
      const w = W[0];
      w.busy = false; w.crashed = true;
      setW(0, '다운! ACK 없음', 'red');
      a.flash('w0').catch(() => {});
      a.setText('tl', direct ? `${m.label} 응답 기다리는 중…` : `${m.label} ACK 기다리는 중…`);
      a.get('tl').style.opacity = 1;
      tb.g.style.opacity = 1;
      await tb.set(0, 0);
      await tb.set(1, direct ? WAITMAX : VT);
      if (direct) {
        a.setText('tl', '응답이 없어요 → 주문 실패');
        failAt('✕ 실패');
      } else {
        a.setText('tl', '시간 초과 → 다시 전달!');
        m.redo = true;
        s.redeliv++; s.redelivSince++;
        m.chip = chip(m.label, [SLOT(0), CY], 'amber');
        q.unshift(m);
        render();
      }
      await a.wait(800);
      tb.g.style.opacity = 0;
      a.get('tl').style.opacity = 0;
      w.crashed = false;
      setW(0, '재시작 · 대기', 'green');
    };

    /** 워커 i가 메시지 m을 처리. 직접 호출이면 주문 서버에서 바로 날아온다 */
    const work = async (i, m, direct) => {
      const w = W[i];
      w.busy = true;
      setW(i, `${m.label} 받는 중`, 'amber');
      const c = m.chip;
      c.tok = (c.tok || 0) + 1; // 큐 안 미끄러짐 멈춤
      c.g.style.opacity = 1;
      await a.move(c, direct ? [[QR + 2, QY], 'w' + i] : 'w' + i, direct ? 520 : TAKE);
      a.remove(c);
      setW(i, `${m.label} 처리 중`, 'amber');
      const ms = PROC[s.proc];
      await a.wait(ms / 2);
      if (i === 0 && s.down) return crash(m, direct);
      await a.wait(ms / 2);
      if (i === 0 && s.down) return crash(m, direct); // 다 하고 ACK 직전에 죽음
      w.busy = false;
      setW(i, `${m.label} 완료 ✓`, 'green');
      s.done++; s.doneSince++;
      if (m.redo) s.redoneSince++;
      if (i >= s.workers) paintW(i);
      if (direct) await a.send('w' + i, 'p', '', { color: 'green', dur: 420, w: 12, via: [[QR + 2, QY]] });
      else await a.send('w' + i, [QR + 2, CY], '', { color: 'green', dur: 300, w: 12 }); // ACK
    };

    /** 직접 호출: 빈 워커가 없으면 주문 서버가 붙잡고 기다리다 시간 초과 */
    const direct = async (label) => {
      const t0 = a.now();
      let i = pickIdle();
      if (i < 0) {
        if (waiting >= POOL) return failAt('503');
        waiting++; s.paint();
        while (i < 0 && a.now() - t0 < WAITMAX) { await a.wait(80); i = pickIdle(); }
        waiting--; s.paint();
        if (i < 0) return failAt('시간 초과');
      }
      pushWait(a.now() - t0);
      W[i].busy = true;
      await work(i, { label, chip: chip(label, 'p', 'blue') }, true);
    };

    s.order = async () => {
      const label = '#' + (++seq % 1000);
      await a.send('u', 'p', '', { color: 'blue', dur: 300, w: 14 });
      if (s.direct) return direct(label);
      const c = chip(label, 'p');
      await a.move(c, [QL + 18, CY], 300);
      if (q.length >= QCAP) { a.remove(c); return failAt('큐 가득'); }
      c.tx = null;
      q.push({ label, t0: a.now(), chip: c, redo: false });
      render();
    };

    // 계속 들어오는 주문
    a.every(() => 1000 / s.rate, () => s.order());
    // 쉬는 워커가 큐 맨 앞 메시지를 꺼내 간다(경쟁 소비)
    a.every(60, () => {
      for (let k = 0; k < s.workers && q.length; k++) {
        const i = pickIdle();
        if (i < 0) break;
        const m = q.shift();
        if (!m.redo) pushWait(a.now() - m.t0);
        W[i].busy = true;
        render();
        a.spawn(() => work(i, m, false));
      }
    });
    // 과제용 관찰: 큐가 쌓였다 비었나, 얼마나 오래 짧게 유지됐나
    a.every(100, () => {
      if (q.length > 2 || s.direct) s.calm = a.now();
      if (!s.direct) {
        if (q.length >= 10) s.piled = true;
        if (s.piled && q.length === 0) s.drained = true;
      }
    });
  },
  stats: (s) => {
    const avg = s.waits.length ? s.waits.reduce((x, y) => x + y, 0) / s.waits.length : 0;
    return [
      ['큐 길이', s.direct ? '큐 없음' : s.qlen + '개', s.direct ? '' : s.qlen >= 10 ? 'red' : s.qlen >= 3 ? 'amber' : 'green'],
      ['처리 완료', s.done, 'green'],
      ['재전달', s.redeliv, s.redeliv ? 'amber' : ''],
      ['실패', s.fail, s.fail ? 'red' : ''],
      ['평균 대기', s.waits.length ? avg.toFixed(1) + '초' : '-', avg > 3 ? 'red' : avg > 1 ? 'amber' : ''],
    ];
  },
  tasks: [
    { t: '주문 폭주를 보내 큐가 10개 이상 쌓였다가 다시 0개로 줄어드는 것 보기', check: (s) => s.piled && s.drained },
    { t: '초당 주문을 4개 이상으로 올린 뒤 워커를 늘려, 큐 길이를 15초 동안 2개 이하로 유지하기', check: (s) => !s.direct && s.rate >= 4 && s.doneSince >= 20 && s.now() - s.calm >= 15000 },
    { t: '워커 1 장애를 켜고, ACK를 못 받은 주문이 재전달돼 다른 워커에서 처리되는 것 보기 (실패 0)', check: (s) => s.down && !s.direct && s.redoneSince >= 1 && s.failSince === 0 },
    { t: '큐 없이 직접 호출로 바꾸고 주문 폭주를 보내 보기 — 실패가 생기나요?', check: (s) => s.direct && s.failSince >= 3 },
  ],
};

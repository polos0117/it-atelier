// 메시지 큐: 발행 → 대기 → 경쟁 소비 → ACK / 재전달
export default {
  id: 'mq',
  tab: '메시지 큐',
  title: 'HOW MESSAGE QUEUES WORK',
  sub: 'produce → queue → consume → ack',
  tblTitle: 'MESSAGES',
  flow: [
    { t: '발행', d: '주문 서비스는 큐에 넣고 바로 응답한다' },
    { t: '대기', d: '처리 못 한 메시지는 큐에 쌓여 순서를 기다린다' },
    { t: '소비', d: '놀고 있는 작업자가 하나씩 가져간다' },
    { t: 'ACK', d: '처리를 마치면 확인을 보내고 그때 큐에서 삭제' },
    { t: '재전달', d: '작업자가 죽어 ACK가 안 오면 다시 큐로 돌아간다' },
  ],
  cols: [{ k: 'n', l: '#' }, { k: 'w', l: '작업자' }, { k: 'r', l: '결과' }],
  keys: [
    '큐가 생산자와 소비자 사이의 완충 역할을 해서 갑자기 몰려도 서비스가 버틴다.',
    '작업자를 늘리면 처리량이 늘어난다(수평 확장).',
    'ACK를 받기 전에는 지우지 않으므로 작업자가 죽어도 메시지는 사라지지 않는다.',
    '같은 메시지가 두 번 처리될 수 있으니 작업은 멱등하게 만든다.',
  ],
  actions: [
    { type: 'button', label: '주문 몰림 +10', run: (s) => s.burst(10) },
    { type: 'toggle', key: 'down2', label: '작업자 2 장애' },
  ],

  build(k) {
    const { C, station, belt, hazardLine, box, pkg, recolor, setLabel, fadeOut,
      run, move, wait, until, every, later, ping, cap, hl, addRow, touch, rnd, V } = k;
    const s = { k, n: 0, q: [], down2: false, done: 0, redo: 0 };
    const QX = -3;

    const pr = station('주문 서비스', -11, 0, { accent: C.amber, w: 2.6, h: 1.8 });
    const qs = station('메시지 큐', QX, 0, { accent: C.violet, w: 3, d: 3, h: 0.4, lh: 5.2, badge: '대기 0' });
    for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) box(0.12, 4, 0.12, 0x4a505c, a, 2.2, b, qs.g);
    const workers = [[6, -5], [6, 0], [6, 5]].map((p, i) => station('작업자 ' + (i + 1), p[0], p[1], { accent: C.teal, w: 2.4, h: 1.6, badge: '대기' }));
    belt(-9.6, 0, QX - 1.5, 0);
    workers.forEach((w) => belt(QX + 1.5, 0, w.x, w.z, 0.9));
    hazardLine(-13, 7, 9, 7);
    hazardLine(-13, -7, 9, -7);

    // 큐 안의 박스를 2×2 칸으로 층층이 쌓아 보여 준다
    const layout = () => {
      s.q.forEach((p, i) => {
        const col = i % 4, lvl = Math.floor(i / 4);
        p.position.set(QX - 0.6 + (col % 2) * 1.2, 0.85 + lvl * 0.75, -0.6 + Math.floor(col / 2) * 1.2);
      });
      setLabel(qs.badge, '대기 ' + s.q.length);
    };
    const colors = [C.amber, C.blue, C.red, C.green, C.violet, C.teal];

    s.produce = () => {
      const n = ++s.n;
      run((function* () {
        const p = pkg(colors[n % 6], '#' + n, 0.62);
        p.userData.n = n;
        hl(0); pr.pulse();
        yield move(p, [V(-11, 0, 1.9), V(-9.6, 0), V(QX - 1.5, 0)], 7);
        hl(1);
        s.q.push(p);
        layout();
      })());
    };
    s.burst = (cnt) => {
      cap(`주문 ${cnt}건이 한꺼번에 들어옴. 큐가 받아 두고 작업자가 차례로 처리`);
      for (let i = 0; i < cnt; i++) later(i * 0.12, s.produce);
    };
    every(1.5, s.produce, 1);

    workers.forEach((w, i) => {
      const isDown = () => i === 1 && s.down2;
      run((function* () {
        while (true) {
          setLabel(w.badge, isDown() ? '다운' : '대기');
          w.setLamp(isDown() ? C.red : null);
          yield until(() => s.q.length > 0 && !isDown());
          const p = s.q.shift();
          layout(); hl(2);
          const n = p.userData.n;
          const row = addRow({ n: '#' + n, w: '작업자 ' + (i + 1), r: '처리 중' });
          yield move(p, [p.position.clone(), V(QX + 1.5, 0), V(w.x, w.z, 1.95)], 6);
          w.setLamp(C.amber); setLabel(w.badge, '처리 중 #' + n); w.pulse();
          yield wait(rnd(2.2, 3.4));
          if (isDown()) {
            recolor(p, C.red); row.r = '재전달'; s.redo++; touch(); hl(4);
            cap(`작업자 2 다운: #${n} ACK 없음 → 타임아웃 후 큐로 되돌림`);
            w.setLamp(C.red);
            yield wait(1);
            yield move(p, [p.position.clone(), V(QX + 1.5, 0), V(QX, 0, 2)], 5);
            s.q.unshift(p);
            layout();
            continue;
          }
          w.setLamp(C.green);
          ping([w.x, w.z], [QX, 0], C.green, 10, 2.8);
          hl(3); row.r = 'ACK 완료'; s.done++; touch();
          fadeOut(p);
          yield wait(0.3);
        }
      })());
    });
    return s;
  },

  onToggle(s, key, val) {
    s.k.cap(val ? '작업자 2 장애: 처리 중이던 메시지는 ACK가 오지 않습니다' : '작업자 2 복구: 다시 메시지를 가져갑니다');
  },
  stats: (s) => [['대기', s.q.length], ['처리', s.done], ['재전달', s.redo]],
};

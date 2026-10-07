// 로드밸런서: 라운드 로빈 / 최소 연결, 헬스 체크와 장애 제외
export default {
  id: 'lb',
  tab: '로드밸런서',
  title: 'HOW LOAD BALANCING WORKS',
  sub: 'request → balancer → healthy server',
  tblTitle: 'REQUESTS',
  flow: [
    { t: '요청 도착', d: '모든 요청은 먼저 로드밸런서로 들어온다' },
    { t: '서버 선택', d: '라운드 로빈은 순서대로, 최소 연결은 가장 한가한 곳으로' },
    { t: '처리', d: '선택된 서버가 요청을 처리한다' },
    { t: '헬스 체크', d: '2초마다 각 서버에 상태 확인 신호를 보낸다' },
    { t: '장애 제외', d: '응답 없는 서버는 빼고, 회복하면 다시 넣는다' },
  ],
  cols: [{ k: 'n', l: '#' }, { k: 'u', l: '사용자' }, { k: 's', l: '서버' }, { k: 'r', l: '결과' }],
  keys: [
    '로드밸런서 하나가 여러 서버 앞에서 요청을 나눠 준다.',
    '라운드 로빈은 단순하지만 요청마다 무게가 다르면 한쪽이 밀릴 수 있다.',
    '최소 연결은 처리 중인 요청 수를 보고 분배해 쏠림이 적다.',
    '헬스 체크 주기 사이에 서버가 죽으면 그 사이 요청은 실패할 수 있다(502).',
  ],
  actions: [
    { type: 'radio', key: 'algo', value: 'rr', label: '라운드 로빈' },
    { type: 'radio', key: 'algo', value: 'lc', label: '최소 연결' },
    { type: 'toggle', key: 'down2', label: '서버 2 장애' },
  ],

  build(k) {
    const { C, station, belt, hazardLine, person, label, rack, pkg, recolor, setLabel, fadeOut, remove,
      run, move, wait, every, ping, cap, hl, addRow, touch, rnd, V } = k;
    const s = { k, algo: 'rr', down2: false, n: 0, rr: 0, known: [false, false, false], load: [0, 0, 0], done: 0, err: 0 };

    const users = [['사용자 A', -11, -4.5, 0xe07a5f], ['사용자 B', -11, 0, 0x3b6fd8], ['사용자 C', -11, 4.5, 0x2ec4b6]];
    users.forEach((u) => { person(u[1], u[2], u[3]); label(u[0], u[1], 2.6, u[2], { fs: 36, h: 0.7 }); });
    const lb = station('로드밸런서', -3, 0, { accent: C.hazard, w: 2.4, d: 2.4, h: 3, badge: '라운드 로빈' });
    const sv = [[6, -5], [6, 0], [6, 5]].map((p, i) => {
      const st = station('서버 ' + (i + 1), p[0], p[1], { accent: C.blue, w: 2.4, h: 0.4, lh: 4, badge: '처리 중 0' });
      st.rk = rack(0, 0, st.g);
      st.rk.g.position.y = 0.4;
      return st;
    });
    users.forEach((u) => belt(u[1] + 0.8, u[2], -3, 0, 0.9));
    sv.forEach((v) => belt(-3, 0, v.x, v.z, 0.9));
    hazardLine(-13, 7, 9, 7);
    hazardLine(-13, -7, 9, -7);

    s.upd = () => {
      sv.forEach((v, i) => {
        const dead = s.down2 && i === 1;
        setLabel(v.badge, dead ? '응답 없음' : '처리 중 ' + s.load[i]);
        v.rk.leds.forEach((l, j) => l.material.emissive.setHex(dead ? (j === 4 ? C.red : 0) : j < s.load[i] ? C.amber : 0x0f3a24));
      });
      setLabel(lb.badge, (s.algo === 'rr' ? '라운드 로빈' : '최소 연결') + (s.known[1] ? ' · 2번 제외' : ''));
    };
    s.upd();

    // 헬스 체크
    every(2, () => {
      hl(3);
      [0, 1, 2].forEach((i) => {
        ping([-3, 0], [sv[i].x, sv[i].z], 0x9fb4d8, 10, 3.4);
        run((function* () {
          yield wait(0.8);
          const down = i === 1 && s.down2;
          if (down) {
            if (!s.known[1]) { s.known[1] = true; hl(4); lb.setLamp(C.red); cap('헬스 체크 실패: 서버 2를 분배 대상에서 제외'); s.upd(); }
          } else {
            ping([sv[i].x, sv[i].z], [-3, 0], C.green, 10, 3.4);
            if (i === 1 && s.known[1]) { s.known[1] = false; hl(4); lb.setLamp(null); cap('서버 2 회복: 다시 분배 대상에 포함'); s.upd(); }
          }
        })());
      });
    }, 1.5);

    // 요청
    every(0.75, () => {
      const u = users[Math.floor(Math.random() * 3)], n = ++s.n;
      run((function* () {
        const p = pkg(u[3], '#' + n, 0.6);
        hl(0);
        yield move(p, [V(u[1] + 0.8, u[2]), V(-3, 0)], 5);
        const cand = [0, 1, 2].filter((i) => !s.known[i]);
        let i;
        if (s.algo === 'rr') { do { i = s.rr++ % 3; } while (!cand.includes(i)); }
        else i = cand.reduce((a, b) => (s.load[b] < s.load[a] ? b : a), cand[0]);
        lb.pulse(); hl(1);
        const row = addRow({ n: '#' + n, u: u[0], s: '서버 ' + (i + 1), r: '처리 중' });
        yield move(p, [V(-3, 0), V(sv[i].x, sv[i].z, 1.2)], 5);
        if (i === 1 && s.down2) {
          recolor(p, C.red); row.r = '실패 (502)'; s.err++; touch();
          cap(`#${n} 서버 2가 죽었는데 로드밸런서는 아직 모름 → 502 오류`);
          fadeOut(p, 0.3);
          return;
        }
        s.load[i]++; s.upd(); hl(2); sv[i].pulse();
        p.visible = false;
        yield wait(rnd(1.8, 4.2));
        s.load[i]--; s.upd();
        row.r = '완료'; s.done++; touch();
        remove(p);
      })());
    });
    return s;
  },

  onRadio(s, key, val) {
    s.upd();
    s.k.cap(val === 'rr' ? '라운드 로빈: 1 → 2 → 3 순서로 분배' : '최소 연결: 처리 중인 요청이 가장 적은 서버로');
  },
  onToggle(s, key, val) {
    s.upd();
    s.k.cap(val ? '서버 2 장애 발생. 다음 헬스 체크까지는 로드밸런서가 모릅니다' : '서버 2 복구. 다음 헬스 체크에서 다시 포함됩니다');
  },
  stats: (s) => [['완료', s.done], ['오류', s.err], ['부하', s.load.join(' / ')]],
};

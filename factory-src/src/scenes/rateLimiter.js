// 레이트 리미터: 토큰 버킷
export default {
  id: 'rate',
  tab: '레이트 리미터',
  title: 'HOW RATE LIMITING WORKS',
  sub: 'token bucket: 1 request = 1 token',
  tblTitle: 'REQUESTS',
  flow: [
    { t: '요청 도착', d: '모든 요청은 리미터 문 앞에서 멈춘다' },
    { t: '토큰 확인', d: '버킷에 토큰이 있으면 하나 꺼낸다' },
    { t: '통과', d: '토큰을 낸 요청만 API 서버로 간다' },
    { t: '429 거절', d: '토큰이 없으면 Too Many Requests로 돌려보낸다' },
    { t: '충전', d: '토큰은 정해진 속도로 다시 채워진다 (초당 1개)' },
  ],
  cols: [{ k: 'n', l: '#' }, { k: 'r', l: '결과' }, { k: 'tk', l: '남은 토큰' }],
  keys: [
    '버킷 크기(5)만큼은 순간적인 몰림을 받아 준다.',
    '평균적으로는 충전 속도(초당 1개)보다 빠르게 보낼 수 없다.',
    '거절은 서버 앞에서 일어나서 API 서버는 과부하에서 보호된다.',
    '클라이언트는 Retry-After를 보고 잠시 뒤 다시 시도한다.',
  ],
  actions: [
    { type: 'button', label: '버스트 8개', run: (s) => s.burst(8) },
    { type: 'range', key: 'rate', label: '초당 요청', min: 0.3, max: 3, step: 0.1 },
  ],

  build(k) {
    const { C, station, belt, hazardLine, sphere, pkg, recolor, setLabel, fadeOut,
      run, move, wait, later, cap, hl, addRow, world, THREE, V } = k;
    const s = { k, tokens: 5, max: 5, n: 0, pass: 0, rej: 0, rate: 0.8, acc: 0 };

    station('클라이언트', -11, 0, { accent: C.blue, w: 2.4, h: 1.4 });
    const lim = station('레이트 리미터', -2, 0, { accent: C.hazard, w: 2.6, d: 2.6, h: 1, lh: 4.4, badge: '토큰 5 / 5' });
    const api = station('API 서버', 8, 0, { accent: C.green, w: 2.6, h: 2.2 });

    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 0.85, 1.4, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x8a93a6, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0.55 }),
    );
    bucket.position.set(0, 1.75, 0);
    lim.g.add(bucket);
    const toks = [];
    for (let i = 0; i < 5; i++) {
      const t = sphere(0.26, C.hazard, lim.g, { emissive: C.hazard, emissiveIntensity: 0.5 });
      const a = (i / 5) * Math.PI * 2;
      t.position.set(Math.cos(a) * 0.48, 1.35 + (i % 2) * 0.3, Math.sin(a) * 0.48);
      toks.push(t);
    }
    belt(-9.8, -0.6, -3.3, -0.6, 0.8);
    belt(-9.8, 0.6, -3.3, 0.6, 0.8);
    belt(-0.7, 0, 6.7, 0, 0.9);
    hazardLine(-13, 3, 11, 3);
    hazardLine(-13, -3, 11, -3);

    const upd = () => {
      toks.forEach((t, i) => { t.visible = i < Math.floor(s.tokens); });
      setLabel(lim.badge, `토큰 ${Math.floor(s.tokens)} / ${s.max}`);
    };
    upd();

    s.send = () => {
      const n = ++s.n;
      run((function* () {
        const p = pkg(C.blue, '#' + n, 0.58);
        hl(0);
        yield move(p, [V(-9.8, -0.6), V(-3.3, -0.6)], 6);
        hl(1);
        if (s.tokens >= 1) {
          s.tokens -= 1; upd(); lim.setLamp(C.green); hl(2); s.pass++;
          addRow({ n: '#' + n, r: '통과', tk: Math.floor(s.tokens) });
          yield move(p, [V(-3.3, -0.6), V(-0.7, 0), V(6.7, 0)], 6);
          api.pulse(); lim.setLamp(null); fadeOut(p);
        } else {
          lim.setLamp(C.red); lim.pulse(); hl(3); s.rej++;
          recolor(p, C.red); setLabel(p.userData.lb, '429');
          addRow({ n: '#' + n, r: '429 거절', tk: 0 });
          cap(`#${n} 토큰 없음 → 429 Too Many Requests`);
          yield wait(0.25);
          yield move(p, [V(-3.3, 0.6), V(-9.8, 0.6)], 6);
          lim.setLamp(null); fadeOut(p);
        }
      })());
    };
    s.burst = (cnt) => {
      cap(`요청 ${cnt}개가 한꺼번에 몰림: 토큰 수만큼만 통과`);
      for (let i = 0; i < cnt; i++) later(i * 0.11, s.send);
    };

    world.ticks.push((dt) => {
      const before = Math.floor(s.tokens);
      s.tokens = Math.min(s.max, s.tokens + dt);
      if (Math.floor(s.tokens) > before) { upd(); hl(4); }
      s.acc += dt * s.rate;
      if (s.acc >= 1) { s.acc = 0; s.send(); }
      return true;
    });
    return s;
  },

  stats: (s) => [['토큰', Math.floor(s.tokens) + '/' + s.max], ['통과', s.pass], ['429', s.rej]],
};

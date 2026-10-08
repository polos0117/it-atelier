// 로드밸런서 실험실: 분배 방식·헬스 체크·장애·느린 서버·트래픽을 직접 바꿔 본다
const SY = [100, 220, 340];
const CAP = 8; // 서버 한 대가 동시에 받을 수 있는 요청 수
const share = (s) => { const n = s.cnt[0] + s.cnt[1] + s.cnt[2]; return n ? s.cnt.map((c) => c / n) : [0, 0, 0]; };

export default {
  id: 'lb',
  title: '로드밸런서 실험실',
  intro: '요청이 계속 들어옵니다. 서버를 끄거나 느리게 만들고, 분배 방식과 헬스 체크를 바꿔 가며 실패와 응답 시간이 어떻게 달라지는지 보세요.',
  controls: [
    { type: 'radio', key: 'algo', label: '분배 방식', options: [['rr', '라운드 로빈'], ['lc', '최소 연결']] },
    { type: 'toggle', key: 'hc', label: '헬스 체크' },
    { type: 'toggle', key: 'down0', label: '서버 1 장애' },
    { type: 'toggle', key: 'down1', label: '서버 2 장애' },
    { type: 'toggle', key: 'down2', label: '서버 3 장애' },
    { type: 'toggle', key: 'slow2', label: '서버 3 느려짐' },
    { type: 'range', key: 'rate', label: '초당 요청', min: 1, max: 10, step: 1, unit: '개' },
    { type: 'button', label: '한꺼번에 10개', run: (s, a) => { for (let i = 0; i < 10; i++) a.spawn(() => a.wait(i * 60).then(() => s.fire())); } },
  ],
  init: () => ({ algo: 'rr', hc: true, down0: false, down1: false, down2: false, slow2: false, rate: 3,
    ok: 0, fail: 0, over: 0, lat: [], okSince: 0, failSince: 0, overSince: 0, cnt: [0, 0, 0] }),
  onChange(key, s) {
    s.okSince = 0; s.failSince = 0; s.overSince = 0; s.lat = []; s.cnt = [0, 0, 0];
    if (key.startsWith('down')) s.paint();
  },
  setup(a, s) {
    const active = [0, 0, 0];
    const known = [false, false, false]; // 헬스 체크로 알아낸 장애
    let rr = 0;
    const down = (i) => s['down' + i];

    a.node('users', 80, 220, { label: '사용자들', icon: '👥', color: 'blue', w: 110, h: 64 });
    a.node('lb', 300, 220, { label: '로드밸런서', sub: '', icon: '⚖️', color: 'amber', w: 132, h: 76 });
    a.edge('users', 'lb');
    SY.forEach((y, i) => {
      a.node('s' + i, 590, y, { label: `서버 ${i + 1}`, sub: '처리 중 0', icon: '🖥️', color: 'green', w: 132, h: 66 });
      a.edge('lb', 's' + i, { id: 'e' + i });
    });

    s.paint = () => {
      a.setNode('lb', { sub: s.algo === 'rr' ? '라운드 로빈' : '최소 연결' });
      SY.forEach((_, i) => {
        const n = active[i];
        const color = down(i) ? 'red' : n >= 6 ? 'red' : n >= 4 ? 'amber' : 'green';
        a.setNode('s' + i, { sub: down(i) ? '응답 없음' : `처리 중 ${n}${s.slow2 && i === 2 ? ' · 느림' : ''}`, color });
        a.get('s' + i).g.style.opacity = down(i) ? 0.55 : 1;
        a.get('e' + i).path.style.opacity = s.hc && known[i] ? 0.15 : 1;
        a.badge('s' + i, s.hc && known[i] ? '제외' : '', 'red');
      });
    };
    s.paint();

    const pick = () => {
      const cand = [0, 1, 2].filter((i) => !(s.hc && known[i]));
      if (!cand.length) return -1;
      if (s.algo === 'lc') return cand.reduce((b, i) => (active[i] < active[b] ? i : b), cand[0]);
      for (let k = 0; k < 3; k++) { const i = (rr + k) % 3; if (cand.includes(i)) { rr = i + 1; return i; } }
      return cand[0];
    };

    s.fire = async () => {
      const t0 = a.now();
      const p = await a.send('users', 'lb', '', { color: 'blue', dur: 420, keep: true, w: 16 });
      const i = pick();
      if (i < 0) { p.set('503', 'red'); s.fail++; s.failSince++; await a.fadeOut(p, 400); return; }
      await a.move(p, 's' + i, 420);
      if (down(i)) { // 꺼진 서버로 보냄 → 시간 초과
        p.set('✕ 시간 초과', 'red');
        s.fail++; s.failSince++;
        await a.fadeOut(p, 600);
        return;
      }
      if (active[i] >= CAP) { // 과부하
        p.set('503 과부하', 'red');
        s.fail++; s.failSince++; s.over++; s.overSince++;
        await a.fadeOut(p, 600);
        return;
      }
      a.remove(p);
      active[i]++; s.cnt[i]++; s.paint();
      await a.wait(s.slow2 && i === 2 ? 4200 : 1200);
      active[i]--; s.paint();
      if (down(i)) { s.fail++; s.failSince++; return; } // 처리 중에 꺼짐
      await a.send('s' + i, 'users', '✓', { color: 'green', dur: 700, w: 30, via: ['lb'] });
      s.ok++; s.okSince++;
      s.lat.push((a.now() - t0) / 1000);
      if (s.lat.length > 20) s.lat.shift();
    };

    // 계속 들어오는 요청
    a.every(() => 1000 / s.rate, () => s.fire());
    // 헬스 체크 — 1초마다 묻고, 결과로 풀을 고친다
    a.every(1000, async () => {
      if (!s.hc) { if (known.some(Boolean)) { known.fill(false); s.paint(); } return; }
      await a.par(...[0, 1, 2].map((i) => a.send('lb', 's' + i, '', { color: 'teal', dur: 300, w: 12 })));
      [0, 1, 2].forEach((i) => (known[i] = down(i)));
      s.paint();
    });
  },
  stats: (s) => {
    const avg = s.lat.length ? s.lat.reduce((x, y) => x + y, 0) / s.lat.length : 0;
    return [
      ['처리 완료', s.ok, 'green'],
      ['실패', s.fail, s.fail ? 'red' : ''],
      ['평균 응답', avg ? avg.toFixed(1) + '초' : '-', avg > 4 ? 'red' : ''],
      ['서버별 몫', share(s).map((x) => Math.round(x * 100) + '%').join(' · '), ''],
    ];
  },
  tasks: [
    { t: '헬스 체크를 켠 채 서버 1을 끄고, 실패 없이 요청 10개 처리하기', check: (s) => s.hc && s.down0 && s.okSince >= 10 && s.failSince === 0 },
    { t: '헬스 체크를 끄고 서버 하나를 꺼 보기 — 무슨 일이 생기나요?', check: (s) => !s.hc && (s.down0 || s.down1 || s.down2) && s.failSince >= 3 },
    { t: '서버 3을 느리게 한 뒤 최소 연결로 — 느린 서버가 받는 몫이 20% 아래로 줄어드나요?', check: (s) => s.slow2 && s.algo === 'lc' && s.okSince >= 15 && share(s)[2] < 0.2 },
    { t: '서버 2대를 끄고 초당 요청을 8 이상으로 — 남은 한 대가 버틸까요?', check: (s) => [s.down0, s.down1, s.down2].filter(Boolean).length >= 2 && s.rate >= 8 && s.overSince >= 1 },
  ],
};

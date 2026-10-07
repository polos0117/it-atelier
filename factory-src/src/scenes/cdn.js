// CDN 캐시: 엣지 HIT / 오리진 MISS, TTL 만료, 퍼지
export default {
  id: 'cdn',
  tab: 'CDN 캐시',
  title: 'HOW A CDN WORKS',
  sub: 'user → edge (HIT) / origin (MISS)',
  tblTitle: 'REQUESTS',
  flow: [
    { t: '요청', d: '사용자 요청은 가장 가까운 엣지 서버로 간다' },
    { t: '캐시 확인', d: '엣지 선반에 신선한 사본이 있는지 본다' },
    { t: 'HIT', d: '있으면 바로 응답. 오리진은 모른다' },
    { t: 'MISS', d: '없으면 멀리 있는 오리진까지 다녀온다' },
    { t: '저장 · 만료', d: '받아 온 파일은 TTL 동안 선반에 보관 후 만료' },
  ],
  cols: [{ k: 'f', l: '파일' }, { k: 'r', l: '결과' }, { k: 'ms', l: '지연' }],
  keys: [
    '오리진이 멀수록 MISS 비용이 크다. 벨트 길이가 곧 거리다.',
    '같은 파일을 여러 사람이 받을수록 HIT율이 올라가고 오리진 부하는 줄어든다.',
    'TTL이 지나면 사본을 버리고 다시 받아 온다(실제로는 304로 재검증하기도 한다).',
    '배포 직후에는 퍼지로 엣지 캐시를 비워 옛 파일이 나가지 않게 한다.',
  ],
  actions: [{ type: 'button', label: '캐시 퍼지', run: (s) => s.purge() }],

  build(k) {
    const { C, station, belt, hazardLine, person, label, box, pkg, setLabel, fadeOut,
      run, move, wait, every, later, cap, hl, addRow, touch, world, THREE, V } = k;
    const s = { k, hit: 0, miss: 0 };
    const TTL = 14;
    const files = [['logo.png', C.amber, 0.35], ['app.js', C.blue, 0.3], ['style.css', C.violet, 0.2], ['hero.jpg', C.teal, 0.15]];

    person(-12, 0, 0x3b6fd8);
    label('사용자 (서울)', -12, 2.6, 0, { fs: 36, h: 0.7 });
    const EX = -4, OX = 11;
    const edge = station('엣지 서버 (서울)', EX, 0, { accent: C.hazard, w: 3, d: 3, h: 1.2, lh: 4.6 });
    const org = station('오리진 (미국)', OX, 0, { accent: C.green, w: 2.6, h: 2.4 });
    belt(-11.2, -0.6, EX, -0.6, 0.8);
    belt(-11.2, 0.6, EX, 0.6, 0.8);
    belt(EX, -0.6, OX, -0.6, 0.8);
    belt(EX, 0.6, OX, 0.6, 0.8);
    label('약 1만 km', (EX + OX) / 2, 0.9, -2, { fs: 30, bold: false, color: '#8C94A4', bg: null, h: 0.6 });
    hazardLine(-14, 3, 14, 3);
    hazardLine(-14, -3, 14, -3);

    // 엣지 위 선반: 파일별 칸에 캐시된 사본이 놓이고, 남은 TTL만큼 높이가 줄어든다
    const shelf = new THREE.Group();
    shelf.position.set(EX, 1.2, 0);
    world.root.add(shelf);
    box(2.6, 0.08, 2.4, 0x4a505c, 0, 1.6, 0, shelf);
    s.slots = files.map((f, i) => {
      const x = -0.65 + (i % 2) * 1.3, z = -0.6 + Math.floor(i / 2) * 1.2;
      const m = box(0.75, 0.75, 0.75, f[1], x, 0.4, z, shelf, { emissive: f[1], emissiveIntensity: 0.2 });
      const lb = label(f[0], x, 1.1, z, { fs: 26, h: 0.42, bold: false }, shelf);
      m.visible = lb.visible = false;
      return { f, m, lb, ttl: 0 };
    });
    world.ticks.push((dt) => {
      for (const sl of s.slots) {
        if (sl.ttl <= 0) continue;
        sl.ttl -= dt;
        const r = Math.max(0.15, sl.ttl / TTL);
        sl.m.scale.set(1, r, 1);
        sl.m.position.y = 0.4 * r;
        setLabel(sl.lb, `${sl.f[0]} ${Math.max(0, Math.ceil(sl.ttl))}s`);
        if (sl.ttl <= 0) {
          sl.m.visible = sl.lb.visible = false;
          hl(4);
          cap(`${sl.f[0]} TTL 만료 → 다음 요청은 오리진에서 새로 받음`);
        }
      }
      return true;
    });

    s.purge = () => {
      s.slots.forEach((sl) => { sl.ttl = 0; sl.m.visible = sl.lb.visible = false; });
      edge.pulse(); edge.setLamp(C.red);
      later(0.9, () => edge.setLamp(null));
      cap('퍼지: 엣지 캐시를 모두 비웠습니다. 당분간 MISS가 늘어납니다');
    };

    const request = () => {
      let r = Math.random(), fi = 0;
      for (; fi < files.length - 1; fi++) { r -= files[fi][2]; if (r < 0) break; }
      const f = files[fi], sl = s.slots[fi], t0 = world.t;
      run((function* () {
        const p = pkg(f[1], f[0], 0.6);
        hl(0);
        yield move(p, [V(-11.2, -0.6), V(EX - 1.2, -0.6)], 6);
        hl(1); edge.pulse();
        if (sl.ttl > 0) {
          hl(2); s.hit++; edge.setLamp(C.green);
          const row = addRow({ f: f[0], r: 'HIT', ms: '…' });
          cap(`${f[0]} HIT: 엣지에서 바로 응답`);
          yield wait(0.15);
          yield move(p, [V(EX - 1.2, 0.6), V(-11.2, 0.6)], 6);
          row.ms = Math.round((world.t - t0) * 9) + 'ms'; touch();
          edge.setLamp(null); fadeOut(p);
          return;
        }
        hl(3); s.miss++; edge.setLamp(C.red);
        const row = addRow({ f: f[0], r: 'MISS', ms: '…' });
        cap(`${f[0]} MISS: 미국 오리진까지 다녀옵니다`);
        yield move(p, [V(EX + 1.4, -0.6), V(OX - 1.3, -0.6)], 3.2);
        org.pulse();
        yield wait(0.35);
        yield move(p, [V(OX - 1.3, 0.6), V(EX + 1.4, 0.6)], 3.2);
        edge.setLamp(null);
        sl.ttl = TTL; sl.m.visible = sl.lb.visible = true; hl(4);
        yield move(p, [V(EX - 1.2, 0.6), V(-11.2, 0.6)], 6);
        row.ms = Math.round((world.t - t0) * 9) + 'ms'; touch();
        fadeOut(p);
      })());
    };
    every(1.4, request, 0.5);
    return s;
  },

  stats(s) {
    const t = s.hit + s.miss;
    return [['HIT율', t ? Math.round((s.hit / t) * 100) + '%' : '–'], ['HIT', s.hit], ['MISS', s.miss]];
  },
};

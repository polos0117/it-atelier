// CI/CD 파이프라인: 커밋 → 저장소 → 빌드 → 테스트 → 배포
export default {
  id: 'cicd',
  tab: 'CI/CD 파이프라인',
  title: 'HOW CI/CD WORKS',
  sub: 'push → build → test → deploy',
  tblTitle: 'PIPELINE RUNS',
  flow: [
    { t: '푸시', d: '개발자가 코드를 커밋하고 저장소에 올린다' },
    { t: '트리거', d: '저장소가 웹훅으로 파이프라인을 깨운다' },
    { t: '빌드', d: '의존성 설치, 컴파일, 배포용 묶음(아티팩트) 생성' },
    { t: '테스트', d: '자동 테스트. 하나라도 실패하면 여기서 멈춘다' },
    { t: '배포', d: '테스트를 통과한 아티팩트만 운영 서버에 자동 반영' },
  ],
  cols: [
    { k: 'n', l: '#' },
    { k: 'msg', l: '커밋', wrap: true },
    { k: 'b', l: '빌드' },
    { k: 't', l: '테스트' },
    { k: 'd', l: '배포' },
  ],
  keys: [
    'CI(지속적 통합): 커밋할 때마다 자동으로 빌드하고 테스트해서 문제를 일찍 찾는다.',
    'CD(지속적 배포): 테스트를 통과한 결과물을 사람 손 없이 운영까지 내보낸다.',
    '실패한 커밋은 다음 단계로 못 넘어가서 운영 서버는 항상 검증된 버전만 받는다.',
    '빌드는 한 번만 하고, 같은 아티팩트를 테스트와 배포에 그대로 쓴다.',
  ],
  actions: [
    { type: 'button', label: '커밋 푸시', run: (s) => s.spawn() },
    { type: 'toggle', key: 'forceFail', label: '다음 커밋 실패시키기' },
  ],

  build(k) {
    const { C, station, belt, hazardLine, desk, person, label, rack, pkg, recolor, setLabel, fadeOut,
      run, move, wait, every, ping, cap, hl, addRow, touch, pick, box, world, THREE, V, mat } = k;
    const s = { k, n: 0, ver: 0, ok: 0, fail: 0, forceFail: false };

    hazardLine(-13, 2.2, 13, 2.2);
    hazardLine(-13, -2.2, 13, -2.2);
    const dk = desk(-11, 0);
    person(-11, 1.4, 0x3b6fd8);
    label('개발자', -11, 3, 0, { fs: 42 });

    const repo = station('Git 저장소', -6, 0, { accent: C.violet, w: 2.2 });
    const bld = station('빌드', -1, 0, { accent: C.blue, w: 2.8, h: 2 });
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.16, 8, 12), mat(0x8a93a6));
    gear.position.set(0, 1.1, 1.25);
    bld.g.add(gear);
    const tst = station('테스트', 4.2, 0, { accent: C.teal, w: 2.8, h: 2 });
    const scan = box(2.4, 0.08, 0.08, C.teal, 0, 1, 1.25, tst.g, { emissive: C.teal, emissiveIntensity: 1 });
    const dep = station('운영 서버', 10, 0, { accent: C.green, w: 3.2, h: 0.5, lh: 4, badge: 'v1.0.0' });
    const r1 = rack(-0.8, 0, dep.g), r2 = rack(0.8, 0, dep.g);
    r1.g.position.y = r2.g.position.y = 0.5;
    const leds = [...r1.leds, ...r2.leds];
    const bin = station('실패함', 4.2, 5.2, { accent: C.red, w: 2.2, h: 0.6, d: 2 });

    belt(-9.6, 0, -6, 0);
    belt(-6, 0, -1, 0);
    belt(-1, 0, 4.2, 0);
    belt(4.2, 0, 10, 0);
    belt(4.2, 0, 4.2, 5.2);

    let busyB = 0, busyT = 0;
    world.ticks.push((dt) => {
      if (busyB) gear.rotation.z -= dt * 6;
      scan.visible = !!busyT;
      if (busyT) scan.position.y = 1 + Math.sin(world.t * 6) * 0.7;
      dk.screen.material.emissiveIntensity = 0.4 + Math.sin(world.t * 3) * 0.2;
      return true;
    });

    const msgs = ['로그인 버튼 수정', '결제 API 타임아웃 처리', '회원가입 검증 추가', '캐시 키 변경',
      '검색 정렬 버그 수정', 'README 업데이트', '알림 배지 추가', 'N+1 쿼리 개선'];

    s.spawn = () => {
      const n = ++s.n, msg = pick(msgs), forced = s.forceFail;
      if (forced) { s.forceFail = false; world.emit('state'); }
      const row = addRow({ n: '#' + n, msg, b: '–', t: '–', d: '–' });
      run((function* () {
        const p = pkg(C.amber, '#' + n);
        hl(0); cap(`#${n} git push: "${msg}"`);
        yield move(p, [V(-11, 0, 1.25), V(-11, 0), V(-6, 0)], 4);

        repo.pulse(); repo.setLamp(C.violet); hl(1);
        cap('저장소가 웹훅으로 파이프라인 시작을 알림');
        yield wait(0.5);
        repo.setLamp(null);
        yield move(p, [V(-6, 0), V(-1, 0)], 4);

        busyB++; bld.setLamp(C.amber); row.b = '…'; touch(); hl(2);
        cap(`#${n} 빌드 중: 의존성 설치 → 컴파일 → 패키징`);
        yield wait(1.8);
        busyB--; recolor(p, C.blue); setLabel(p.userData.lb, `app-${n}.jar`);
        bld.setLamp(C.green); row.b = '✓'; touch();
        yield move(p, [V(-1, 0), V(4.2, 0)], 4);
        bld.setLamp(null);

        busyT++; tst.setLamp(C.amber); row.t = '…'; touch(); hl(3);
        cap(`#${n} 테스트 실행 중 (단위 · 통합)`);
        yield wait(1.8);
        busyT--;
        const pass = !forced && Math.random() > 0.2;
        if (!pass) {
          s.fail++; tst.setLamp(C.red); recolor(p, C.red);
          row.t = '✗'; row.d = '중단'; touch();
          cap(`#${n} 테스트 실패 → 배포 중단, 개발자에게 알림`);
          ping([4.2, 0], [-11, 0], C.red, 7);
          yield move(p, [V(4.2, 0), V(4.2, 5.2, 1.3)], 3.5);
          bin.pulse(); fadeOut(p, 1.2);
          yield wait(0.6);
          tst.setLamp(null);
          return;
        }
        tst.setLamp(C.green); row.t = '✓'; touch();
        yield move(p, [V(4.2, 0), V(10, 0, 1.3)], 4);
        tst.setLamp(null);

        hl(4); dep.pulse(); s.ver++; s.ok++;
        setLabel(dep.badge, 'v1.0.' + s.ver);
        row.d = '✓'; touch();
        cap(`v1.0.${s.ver} 운영 배포 완료 (#${n})`);
        for (let i = 0; i < 6; i++) {
          leds.forEach((l, j) => l.material.emissive.setHex((j + i) % 2 ? C.green : 0x000000));
          yield wait(0.12);
        }
        leds.forEach((l) => l.material.emissive.setHex(0x0f3a24));
        fadeOut(p);
      })());
    };
    every(4.4, s.spawn, 4.0);
    return s;
  },

  onToggle(s, key, val) {
    if (val) s.k.cap('다음 커밋은 테스트에서 실패합니다');
  },

  stats(s) {
    const tot = s.ok + s.fail;
    return [['배포', `v1.0.${s.ver}`], ['성공률', tot ? Math.round((s.ok / tot) * 100) + '%' : '–'], ['실패', s.fail]];
  },
};

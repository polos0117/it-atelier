// 복제(Primary-Replica)와 샤딩: 데이터를 여러 DB에 나눠 담기
const SH = ['sh0', 'sh1', 'sh2'];
const SHY = [92, 220, 348];

/** 샤딩 무대를 새로 그린다 (6단계부터) */
function shardStage(a) {
  a.clear('zone', 'edge', 'node', 'pkt', 'top');
  a.node('app', 84, 220, { label: '앱 서버', icon: '🖥️', color: 'blue', w: 104, h: 70 });
  a.node('router', 300, 220, { label: '라우터', sub: 'user_id % 3', icon: '🧭', color: 'amber', w: 132, h: 76 });
  SH.forEach((s, i) => {
    a.node(s, 584, SHY[i], { shape: 'db', label: `Shard ${i}`, sub: `user ${i}, ${i + 3}, ${i + 6}…`, color: 'teal', w: 150, h: 70 });
    a.edge('router', s, { id: 'e-' + s });
  });
  a.edge('app', 'router', { id: 'e-ar' });
}

export default {
  id: 'replication',
  level: 4,
  cat: '데이터베이스',
  title: '복제와 샤딩 — 데이터를 여러 곳에',
  sub: 'DB 한 대로 버티기 어려울 때, 복사본을 만들고(복제) 데이터를 나눠 담는(샤딩) 방법',
  analogy: '복제는 인기 있는 책을 여러 권 복사해 여러 창구에서 빌려주는 것입니다. 원본(Primary)에만 고쳐 쓰고, 복사본(Replica)은 나중에 따라 고칩니다. 샤딩은 책이 너무 많아 도서관을 "ㄱ~ㅅ관", "ㅇ~ㅎ관"처럼 여러 건물로 나누는 것입니다.',
  keys: [
    '복제: 쓰기는 Primary 한 곳에서만 받고, 변경 기록(복제 로그)을 Replica들이 받아 따라 적용한다.',
    '읽기를 Replica로 나누면 읽기 처리량이 늘지만, 비동기 복제라 잠깐 옛 데이터가 보일 수 있다(복제 지연).',
    'Primary가 죽으면 Replica 하나를 새 Primary로 승격(페일오버)해 서비스를 이어 간다.',
    '샤딩: 데이터 자체를 키(user_id 등) 기준으로 여러 DB에 나눠 담아 쓰기와 저장 용량까지 확장한다.',
    '샤딩의 대가: 특정 키에 몰리는 핫스팟, 여러 샤드를 거쳐야 하는 쿼리, 재분배(리샤딩)의 어려움.',
  ],
  terms: [
    ['Primary / Replica', '쓰기를 받는 원본 DB / 원본을 복사해 따라가는 읽기 전용 DB (예전 용어: Master/Slave)'],
    ['복제 로그', '데이터 변경 내역을 순서대로 적은 기록. MySQL은 binlog, PostgreSQL은 WAL'],
    ['복제 지연', 'Primary에 쓴 내용이 Replica에 반영되기까지 걸리는 시간(replication lag)'],
    ['페일오버', '장애가 난 Primary 대신 Replica를 새 Primary로 바꾸는 것'],
    ['샤드', '나눠 담은 데이터 조각과 그것을 저장하는 DB 하나'],
    ['샤드 키', '어느 샤드로 보낼지 정하는 기준 값. 예: user_id'],
    ['핫스팟', '요청이 특정 샤드 하나에만 몰리는 현상'],
  ],
  quiz: [
    { q: 'Primary–Replica 복제 구조에서 "새 글 쓰기"를 받는 곳은?', c: ['아무 Replica나', 'Primary(원본) 한 곳', '모든 DB에 동시에', '가장 한가한 Replica'], a: 1, why: '쓰기는 Primary만 받고, Replica들은 복제 로그를 받아 따라 적용합니다. Replica는 읽기를 나눠 맡습니다.', step: 2 },
    { q: '글을 올리자마자 목록을 새로 고쳤더니 내 글이 보이지 않습니다. 가장 가능성 높은 원인은?', c: ['Primary가 쓰기를 거절했다', '샤드 하나에 요청이 몰리는 핫스팟이 생겼다', '아직 변경을 따라오지 못한 Replica에서 읽었다(복제 지연)', 'Replica가 Primary로 승격되었다'], a: 2, why: '비동기 복제라 Replica는 조금 늦게 따라옵니다. 쓴 직후 읽기를 Primary로 보내는 식으로 read-your-writes를 보장합니다.', step: 3 },
    { q: '비동기 복제에서 Primary 장애로 페일오버할 때 생길 수 있는 문제는?', c: ['승격된 Replica는 이후에도 읽기만 받을 수 있다', '옛 Primary가 돌아오면 새 Primary와 데이터가 자동으로 합쳐진다', '모든 Replica가 동시에 Primary로 승격된다', 'Primary가 커밋했지만 아직 전달되지 않은 마지막 쓰기가 사라질 수 있다'], a: 3, why: '비동기 복제는 Replica 적용을 기다리지 않고 커밋하므로 마지막 쓰기가 유실될 수 있습니다. 옛 Primary가 쓰기를 받는 split-brain은 펜싱으로 막아야 합니다.', step: 4 },
  ],
  setup(a) {
    a.node('app', 90, 220, { label: '앱 서버', icon: '🖥️', color: 'blue', w: 108, h: 70 });
    a.node('pri', 330, 220, { shape: 'db', label: 'Primary', sub: '글 10개', icon: '✍️', color: 'amber', w: 132, h: 84 });
    a.node('r1', 600, 90, { shape: 'db', label: 'Replica 1', sub: '글 10개', icon: '📖', color: 'green', w: 132, h: 84, hidden: true });
    a.node('r2', 600, 350, { shape: 'db', label: 'Replica 2', sub: '글 10개', icon: '📖', color: 'green', w: 132, h: 84, hidden: true });
    a.edge('app', 'pri', { id: 'e-ap', label: '읽기·쓰기', ly: -12 });
    a.edge('pri', 'r1', { id: 'e-p1', dashed: true, color: 'violet', hidden: true, label: '복제 로그', lx: 30, ly: 4 });
    a.edge('pri', 'r2', { id: 'e-p2', dashed: true, color: 'violet', hidden: true, label: '복제 로그', lx: 30, ly: -4 });
    a.edge('app', 'r1', { id: 'e-a1', hidden: true, color: 'green' });
    a.edge('app', 'r2', { id: 'e-a2', hidden: true, color: 'green' });
    a.bar('load', 270, 282, 120, { color: 'amber' });
  },
  steps: [
    {
      t: 'DB 한 대에 모든 요청이',
      easy: '처음엔 데이터베이스(DB)가 한 대뿐이라 글 쓰기와 글 읽기를 모두 혼자 처리합니다. 대부분은 "읽기"인데도, 사용자가 늘면 이 한 대가 금방 지칩니다.',
      deep: '일반적인 웹 서비스는 읽기:쓰기 비율이 10:1 이상입니다. 단일 DB는 CPU·디스크 I/O·커넥션 수가 한계이고, 그 자체가 단일 장애점(SPOF)입니다. 수직 확장(더 큰 인스턴스)은 비용이 급격히 오르고 상한이 있습니다.',
      async run(a) {
        a.caption('읽기, 읽기, 읽기… 거의 다 읽기 요청');
        const load = a.get('load');
        const flights = [0, 1, 2, 3, 4, 5].map((i) =>
          a.wait(i * 230).then(() => a.send('app', 'pri', 'SELECT', { color: 'blue', dur: 700 })).then(() => load.set(Math.min(1, load.v + 0.16), 200)));
        await a.par(...flights);
        a.hl('pri', true, 'red');
        a.badge('pri', 'CPU 96%', 'red');
        a.note('n1', 330, 340, '혼자서 다 처리하느라 벅참', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '복제본(Replica)을 만들고 로그로 따라가기',
      easy: '원본 DB(Primary)의 복사본(Replica)을 두 대 만듭니다. 원본에 새 글이 쓰이면, 원본은 "무엇이 바뀌었는지" 적은 기록(복제 로그)을 복사본들에게 보내 똑같이 따라 적게 합니다.',
      deep: 'Primary는 변경을 binlog(MySQL)나 WAL(PostgreSQL)에 기록하고, Replica가 이를 스트리밍으로 받아 재생(replay)합니다. 기본은 비동기 복제라 Primary는 Replica의 적용을 기다리지 않고 커밋 응답을 보냅니다.',
      async run(a) {
        a.remove('n1');
        a.hl('pri', false);
        a.badge('pri', null);
        await a.get('load').set(0, 300);
        a.remove('load');
        await a.par(a.show('r1'), a.show('r2'), a.show('e-p1'), a.show('e-p2'));
        await a.send('app', 'pri', 'INSERT 글', { color: 'amber', dur: 800 });
        a.setNode('pri', { sub: '글 11개' });
        await a.flash('pri');
        a.caption('Primary가 변경 기록(로그 #11)을 Replica에 보냅니다');
        await a.par(
          a.send('pri', 'r1', 'log #11', { color: 'violet', dur: 900 }).then(() => a.setNode('r1', { sub: '글 11개' })),
          a.wait(250).then(() => a.send('pri', 'r2', 'log #11', { color: 'violet', dur: 900 })).then(() => a.setNode('r2', { sub: '글 11개' })),
        );
        await a.wait(300);
      },
    },
    {
      t: '읽기는 Replica로 나눠서',
      easy: '이제 "읽기"는 복사본들이 나눠 맡고, "쓰기"만 원본이 받습니다. 원본 한 대에 몰리던 일이 셋으로 흩어집니다.',
      deep: '애플리케이션(또는 ProxySQL·pgpool 같은 프록시)이 SELECT는 Replica로, INSERT/UPDATE/DELETE는 Primary로 라우팅합니다(read/write splitting). Replica를 늘리면 읽기 처리량이 거의 선형으로 늘지만 쓰기 처리량은 그대로입니다.',
      async run(a) {
        a.setText(a.get('e-ap').lab, '쓰기만');
        await a.par(a.show('e-a1'), a.show('e-a2'));
        a.badge('r1', '읽기', 'green');
        a.badge('r2', '읽기', 'green');
        const plan = ['r1', 'r2', 'pri', 'r1', 'r2'];
        await a.par(...plan.map((t, i) => a.wait(i * 300).then(() =>
          a.send('app', t, t === 'pri' ? 'UPDATE' : 'SELECT', { color: t === 'pri' ? 'amber' : 'green', dur: 800 }))));
        a.note('n3', 330, 400, '읽기는 Replica가 분담 → Primary 여유', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '복제 지연 — 방금 쓴 글이 안 보여요',
      easy: '복사본은 원본을 "조금 늦게" 따라갑니다. 글을 올리자마자 목록을 보면, 아직 따라오지 못한 복사본에서 읽어 내 글이 없는 것처럼 보일 수 있습니다.',
      deep: '비동기 복제의 지연(보통 수 ms~수 초, 부하가 크면 더 큼) 때문에 read-your-writes 일관성이 깨집니다. 해결책: 쓴 직후 일정 시간은 해당 사용자의 읽기를 Primary로 보내기, 세션이 본 로그 위치(GTID/LSN)까지 따라온 Replica에서만 읽기, 또는 동기·반동기 복제(지연 대신 쓰기 지연 증가).',
      async run(a) {
        a.remove('n3');
        await a.send('app', 'pri', 'INSERT 내 글', { color: 'amber', dur: 800 });
        a.setNode('pri', { sub: '글 12개' });
        const l1 = a.packet('log #12', { at: 'pri', color: 'violet' });
        const l2 = a.packet('log #12', { at: 'pri', color: 'violet' });
        await a.par(a.move(l1, [430, 172], 600), a.move(l2, [430, 268], 600));
        a.caption('로그가 아직 가는 중인데… 바로 목록을 읽으면?');
        await a.send('app', 'r1', 'SELECT 목록', { color: 'green', dur: 750, via: [[200, 40]] });
        a.hl('r1', true, 'red');
        await a.send('r1', 'app', '글 11개', { color: 'red', dur: 750, via: [[200, 40]] });
        a.note('n4', 92, 300, '내 글이 없어요?!', { color: 'red' });
        await a.wait(500);
        await a.par(
          a.move(l1, 'r1', 600).then(() => a.fadeOut(l1, 200)).then(() => a.setNode('r1', { sub: '글 12개' })),
          a.move(l2, 'r2', 600).then(() => a.fadeOut(l2, 200)).then(() => a.setNode('r2', { sub: '글 12개' })),
        );
        a.hl('r1', false);
        a.note('n5', 330, 400, '해결: 내가 쓴 직후엔 Primary에서 읽기', { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '장애 조치 — Replica를 Primary로 승격',
      easy: '원본 DB가 고장 나면 쓰기를 받을 곳이 사라집니다. 이때 가장 최신인 복사본 하나를 새 원본으로 "승진"시키고, 앱과 나머지 복사본이 새 원본을 따르게 합니다.',
      deep: '헬스 체크로 장애를 감지하면 Orchestrator·Patroni·RDS Multi-AZ 등이 가장 앞선 Replica를 승격하고 다른 Replica의 복제 원본을 바꿉니다(보통 수십 초). 비동기 복제라면 아직 전달되지 않은 마지막 쓰기가 유실될 수 있고, 옛 Primary가 살아 돌아와 쓰기를 받는 split-brain을 막기 위해 펜싱이 필요합니다.',
      async run(a) {
        a.remove('n4');
        a.remove('n5');
        a.badge('r1', null);
        a.badge('r2', null);
        a.setNode('pri', { color: 'red', sub: '응답 없음' });
        a.hl('pri', true, 'red');
        a.badge('pri', '장애 ✕', 'red');
        await a.flash('pri');
        a.caption('Primary 장애! 가장 최신인 Replica 1을 승격합니다');
        await a.par(a.fade('pri', 0.35, 400), a.fade('e-ap', 0, 300), a.fade('e-p1', 0, 300), a.fade('e-p2', 0, 300));
        a.remove('e-ap'); a.remove('e-p1'); a.remove('e-p2'); a.remove('pri');
        await a.moveNode('r1', 330, 220, 900);
        a.setNode('r1', { label: 'Primary', sub: '글 12개 · 승격', color: 'amber', icon: '✍️' });
        a.badge('r1', '새 원본', 'amber');
        await a.flash('r1');
        a.edge('r1', 'r2', { id: 'e-n2', dashed: true, color: 'violet', label: '복제 로그', lx: 30, ly: -4 });
        await a.send('app', 'r1', 'INSERT 글', { color: 'amber', dur: 700 });
        a.setNode('r1', { sub: '글 13개 · 승격' });
        await a.send('r1', 'r2', 'log #13', { color: 'violet', dur: 800 });
        a.setNode('r2', { sub: '글 13개' });
        a.note('n5b', 330, 80, '페일오버 완료: Replica 1 → Primary', { color: 'amber' });
        await a.wait(300);
      },
    },
    {
      t: '샤딩 — 데이터를 나눠 담기',
      easy: '복제는 같은 데이터를 "복사"할 뿐이라, 글 쓰기가 아주 많거나 데이터가 너무 크면 원본 한 대가 여전히 한계입니다. 그래서 데이터를 사용자 번호에 따라 여러 DB에 "나눠" 담습니다. 이 조각 하나하나를 샤드라고 부릅니다.',
      deep: '샤드 키로 범위 분할(range: id 1~1만 → 샤드0)이나 해시 분할(hash(key) % N)을 씁니다. 범위는 범위 조회에 유리하지만 쏠리기 쉽고, 해시는 고르게 퍼지지만 범위 조회가 어렵습니다. 라우팅은 애플리케이션, 프록시(Vitess·Citus), 또는 DB 자체가 맡습니다. 각 샤드는 보통 다시 Primary-Replica로 복제합니다.',
      async run(a) {
        a.remove('n5b');
        shardStage(a);
        a.text(360, 26, '샤드 번호 = user_id % 3', { id: 'calc', size: 15, weight: 700, layer: 'edge' });
        const reqs = [[7, 1], [42, 0], [8, 2]];
        for (const [u, s] of reqs) {
          a.setText('calc', `user ${u} → ${u} % 3 = ${s} → Shard ${s}`);
          const p = await a.send('app', 'router', `user ${u}`, { color: 'blue', dur: 600, keep: true });
          a.hl('router');
          a.hl(SH[s], true, 'green');
          await a.move(p, SH[s], 650);
          await a.fadeOut(p, 180);
          a.hl('router', false);
          a.hl(SH[s], false);
        }
        a.setText('calc', '샤드 번호 = user_id % 3');
        a.note('n6', 300, 330, '각 샤드는 전체의 1/3만\n저장·처리', { color: 'teal' });
        await a.wait(600);
      },
    },
    {
      t: '샤딩의 숙제 ① — 핫스팟',
      easy: '유명인 한 명(user 7)에게 요청이 쏟아지면, 그 사람이 들어 있는 샤드 하나만 바빠집니다. 나눠 담아도 일이 고르게 나뉘지 않을 수 있습니다.',
      deep: '키 분포나 접근 패턴이 치우치면 특정 샤드에 부하가 몰립니다(hot partition). 대응: 샤드 키 재설계(복합 키, 키에 접미사를 붙이는 salting), 뜨거운 키 캐싱, 샤드 분할. N을 바꾸면 % N 결과가 대부분 바뀌어 대량 데이터 이동이 생기므로 일관된 해싱이나 가상 샤드를 씁니다.',
      async run(a) {
        a.remove('n6');
        SH.forEach((s, i) => a.bar('b' + i, 509, SHY[i] + 47, 150, { color: i === 1 ? 'red' : 'green', value: 0.15 }));
        a.setText('calc', '인기 user 7 → 항상 Shard 1');
        const b1 = a.get('b1');
        let hits = 0;
        await a.par(...[0, 1, 2, 3, 4, 5, 6].map((i) => a.wait(i * 170).then(async () => {
          const p = await a.send('app', 'router', 'user 7', { color: 'pink', dur: 450, keep: true });
          await a.move(p, 'sh1', 450);
          await a.fadeOut(p, 120);
          hits++;
          await b1.set(Math.min(1, 0.15 + hits * 0.12), 150);
        })));
        a.setNode('sh1', { color: 'red' });
        a.hl('sh1', true, 'red');
        a.badge('sh1', '과부하', 'red');
        await a.flash('sh1');
        await a.wait(500);
      },
    },
    {
      t: '샤딩의 숙제 ② — 여러 샤드에 걸친 질문',
      easy: '"전체 사용자 중 인기 글 TOP 10"처럼 모든 샤드에 흩어진 데이터를 봐야 하는 질문은, 세 곳에 다 물어보고 답을 모아 합쳐야 해서 느리고 복잡합니다.',
      deep: '샤드 키가 없는 쿼리는 scatter-gather(모든 샤드에 질의 후 병합)가 필요해 가장 느린 샤드에 응답 시간이 묶입니다. 샤드를 넘는 JOIN·트랜잭션은 2PC나 사가 패턴이 필요합니다. 그래서 자주 함께 조회되는 데이터는 같은 샤드에 오도록 샤드 키를 고르는 것이 핵심입니다.',
      async run(a) {
        a.setNode('sh1', { color: 'teal' });
        a.hl('sh1', false);
        a.badge('sh1', null);
        SH.forEach((s, i) => a.remove('b' + i));
        a.setText('calc', '전체 인기글 TOP 10? → 모든 샤드에 질문');
        await a.send('app', 'router', 'TOP 10?', { color: 'blue', dur: 600 });
        a.hl('router');
        await a.par(...SH.map((s) => a.send('router', s, 'TOP 10?', { color: 'amber', dur: 700 })));
        await a.par(...SH.map((s, i) => a.wait(i * 250).then(() => a.send(s, 'router', `부분 ${i}`, { color: 'teal', dur: 700 }))));
        await a.flash('router');
        a.note('n8', 300, 128, '3곳 답을 모아 정렬·병합', { color: 'amber' });
        await a.send('router', 'app', 'TOP 10', { color: 'green', dur: 600 });
        a.hl('router', false);
        a.note('n9', 300, 330, '가장 느린 샤드만큼 느려짐', { color: 'red' });
        await a.wait(700);
      },
    },
  ],
};

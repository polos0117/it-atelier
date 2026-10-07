// 로드밸런서: 라운드 로빈, 최소 연결, 헬스 체크
const SRV = ['s1', 's2', 's3'];
const SY = [100, 220, 340];

export default {
  id: 'lb',
  level: 3,
  cat: '서버·인프라',
  title: '로드밸런서 — 손님을 여러 계산대로',
  sub: '사용자가 몰려도 서버 여러 대가 나눠서 처리하게 만드는 장치',
  factory: 'lb',
  analogy: '은행 번호표 안내원과 같습니다. 손님(요청)이 오면 비어 있는 창구(서버)로 안내하고, 쉬는 창구에는 손님을 보내지 않습니다.',
  keys: [
    '서버 한 대로는 처리량과 가용성에 한계가 있다 → 여러 대로 늘리는 것을 수평 확장(scale-out)이라 한다.',
    '라운드 로빈은 차례대로, 최소 연결은 지금 가장 한가한 서버로 보낸다.',
    '헬스 체크로 죽은 서버를 자동으로 빼고, 살아나면 다시 넣는다.',
    '사용자는 로드밸런서 주소 하나만 알면 되고, 뒤의 서버 수는 몰라도 된다.',
  ],
  terms: [
    ['수평 확장', '서버를 더 좋은 것으로 바꾸는(수직) 대신, 같은 서버를 여러 대 늘리는 것'],
    ['라운드 로빈', '1→2→3→1… 순서대로 돌아가며 배분'],
    ['최소 연결', '현재 처리 중인 요청(연결)이 가장 적은 서버로 배분'],
    ['헬스 체크', '서버가 살아 있는지 주기적으로 확인하는 요청 (예: GET /health)'],
    ['L4 / L7', 'L4는 IP·포트만 보고 분배, L7은 URL·헤더·쿠키까지 보고 분배'],
    ['스티키 세션', '같은 사용자를 계속 같은 서버로 보내는 방식'],
  ],
  setup(a) {
    a.node('u1', 70, 120, { label: '사용자 A', icon: '🙂', color: 'blue', w: 96, h: 50 });
    a.node('u2', 70, 220, { label: '사용자 B', icon: '🙂', color: 'blue', w: 96, h: 50 });
    a.node('u3', 70, 320, { label: '사용자 C', icon: '🙂', color: 'blue', w: 96, h: 50 });
    a.node('lb', 310, 220, { label: '로드밸런서', sub: '', icon: '⚖️', color: 'amber', w: 128, h: 76, hidden: true });
    SRV.forEach((s, i) => a.node(s, 590, SY[i], { label: `서버 ${i + 1}`, sub: '처리 중 0', icon: '🖥️', color: 'green', w: 128, h: 66, hidden: i > 0 }));
    for (const u of ['u1', 'u2', 'u3']) a.edge(u, 'lb', { id: 'e-' + u, hidden: true });
    SRV.forEach((s) => a.edge('lb', s, { id: 'e-' + s, hidden: true }));
    for (const u of ['u1', 'u2', 'u3']) a.edge(u, 's1', { id: 'd-' + u, dashed: true });
    a.bar('load1', 530, 146, 120, { color: 'green' });
  },
  steps: [
    {
      t: '서버 한 대에 모두 몰리면',
      easy: '처음엔 서버가 한 대뿐입니다. 사용자가 많아지면 이 서버 혼자 모든 요청을 받느라 느려지고, 고장 나면 서비스 전체가 멈춥니다.',
      deep: '단일 서버는 CPU·메모리·커넥션 수에 상한이 있고, 그 자체가 단일 장애점(SPOF)입니다. 수직 확장(더 큰 서버)은 비용이 급격히 늘고 한계가 있습니다.',
      async run(a) {
        const load = a.get('load1');
        const reqs = ['u1', 'u2', 'u3', 'u1', 'u2', 'u3'].map((u, i) =>
          a.wait(i * 220).then(() => a.send(u, 's1', '요청', { color: 'blue', dur: 800 })).then(() => load.set(Math.min(1, load.v + 0.17), 200)));
        await a.par(...reqs);
        a.setNode('s1', { sub: '처리 중 6', color: 'red' });
        a.hl('s1', true, 'red');
        a.note('n-hot', 590, 30, 'CPU 100% 🔥 응답 지연', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '서버를 늘리고 앞에 로드밸런서를 둔다',
      easy: '서버를 3대로 늘리고, 그 앞에 "안내원" 로드밸런서를 둡니다. 사용자는 안내원 주소만 알면 됩니다.',
      deep: '클라이언트는 LB의 IP(또는 DNS 이름)로만 접속합니다. 서버들은 내부 네트워크에 두어 직접 노출하지 않으므로 보안상으로도 유리합니다.',
      async run(a) {
        a.remove('n-hot');
        a.hl('s1', false);
        a.setNode('s1', { sub: '처리 중 0', color: 'green' });
        await a.get('load1').set(0, 300);
        a.remove('load1');
        await a.par(...['u1', 'u2', 'u3'].map((u) => a.hide('d-' + u)));
        await a.par(a.show('lb'), a.show('s2'), a.show('s3'));
        await a.par(...['u1', 'u2', 'u3'].map((u) => a.show('e-' + u)), ...SRV.map((s) => a.show('e-' + s)));
        await a.flash('lb');
      },
    },
    {
      t: '라운드 로빈 — 차례대로',
      easy: '가장 간단한 방법: 1번, 2번, 3번, 다시 1번… 순서대로 돌아가며 보냅니다.',
      deep: '구현이 단순하고 서버 성능이 같을 때 고르게 분산됩니다. 서버 성능이 다르면 가중치 라운드 로빈(weighted RR)을 씁니다. 요청마다 처리 시간이 크게 다르면 쏠림이 생길 수 있습니다.',
      async run(a) {
        a.setNode('lb', { sub: '라운드 로빈' });
        const users = ['u1', 'u2', 'u3', 'u1', 'u2', 'u3'];
        for (let i = 0; i < users.length; i++) {
          const s = SRV[i % 3];
          const p = await a.send(users[i], 'lb', `#${i + 1}`, { color: 'blue', dur: 520, keep: true });
          a.hl(s);
          await a.move(p, s, 520);
          await a.fadeOut(p, 150);
          a.hl(s, false);
        }
      },
    },
    {
      t: '최소 연결 — 가장 한가한 곳으로',
      easy: '서버 1이 오래 걸리는 일을 붙잡고 있으면, 안내원은 지금 덜 바쁜 서버 2·3으로 보냅니다.',
      deep: 'Least Connections는 LB가 서버별 활성 연결 수를 추적해 최소인 곳을 고릅니다. 처리 시간이 들쭉날쭉한 API나 WebSocket처럼 연결이 긴 경우에 유리합니다.',
      async run(a) {
        a.setNode('lb', { sub: '최소 연결' });
        a.setNode('s1', { sub: '처리 중 4', color: 'amber' });
        a.setNode('s2', { sub: '처리 중 1' });
        a.setNode('s3', { sub: '처리 중 2' });
        await a.flash('s1');
        const plan = [['s2', 2, 2], ['s2', 3, 2], ['s3', 3, 3]];
        for (const [s, c2, c3] of plan) {
          const p = await a.send('u2', 'lb', '요청', { color: 'blue', dur: 520, keep: true });
          a.hl(s);
          await a.move(p, s, 520);
          await a.fadeOut(p, 150);
          a.hl(s, false);
          a.setNode('s2', { sub: `처리 중 ${c2}` });
          a.setNode('s3', { sub: `처리 중 ${c3}` });
        }
      },
    },
    {
      t: '헬스 체크 — 아픈 서버는 빼기',
      easy: '안내원은 수시로 "괜찮아요?" 하고 서버들에게 물어봅니다. 서버 2가 대답이 없으면 고장으로 보고 손님을 보내지 않습니다.',
      deep: 'LB가 주기적으로 GET /health 같은 요청을 보내 연속 N회 실패하면 unhealthy로 표시해 풀에서 제외합니다. 이미 연결된 요청은 connection draining으로 마무리하게 하기도 합니다.',
      async run(a) {
        for (const s of SRV) a.setNode(s, { sub: '정상', color: 'green' });
        await a.par(...SRV.map((s) => a.send('lb', s, '괜찮아?', { color: 'teal', dur: 600 })));
        a.setNode('s2', { sub: '응답 없음', color: 'red' });
        a.hl('s2', true, 'red');
        await a.par(a.send('s1', 'lb', 'OK', { color: 'green', dur: 600 }), a.send('s3', 'lb', 'OK', { color: 'green', dur: 600 }));
        await a.fade('e-s2', 0.15, 300);
        await a.fade('s2', 0.45, 300);
        a.badge('lb', '풀: 1, 3', 'amber');
        for (const [i, s] of [[0, 's1'], [1, 's3'], [2, 's1'], [3, 's3']]) {
          const p = await a.send(['u1', 'u2', 'u3', 'u1'][i], 'lb', '요청', { color: 'blue', dur: 450, keep: true });
          await a.move(p, s, 450);
          await a.fadeOut(p, 120);
        }
      },
    },
    {
      t: '복구되면 다시 투입',
      easy: '서버 2가 다시 대답하면 안내원은 다시 손님을 보내기 시작합니다. 사용자는 이 모든 과정을 눈치채지 못합니다.',
      deep: '연속 M회 성공하면 healthy로 복귀합니다. 클라우드에서는 오토스케일링 그룹이 실패한 인스턴스를 새로 띄우고 LB 대상 그룹에 자동 등록합니다. LB 자체도 이중화(액티브-스탠바이, 애니캐스트)해야 SPOF가 되지 않습니다.',
      async run(a) {
        await a.send('lb', 's2', '괜찮아?', { color: 'teal', dur: 600 });
        await a.par(a.fade('s2', 1, 300), a.fade('e-s2', 1, 300));
        a.hl('s2', false);
        a.setNode('s2', { sub: '정상', color: 'green' });
        await a.send('s2', 'lb', 'OK', { color: 'green', dur: 600 });
        a.badge('lb', '풀: 1, 2, 3', 'green');
        await a.flash('s2');
      },
    },
  ],
};

// 쿠버네티스: 컨테이너, 컨트롤 플레인, 디플로이먼트, 자가 치유, 스케일 아웃, 롤링 업데이트
const ZX = [30, 255, 480]; // 워커 노드 영역 왼쪽 x
const ZY = 196, ZW = 210, ZH = 206;
const SLOT = [[58, 250], [152, 250], [58, 304], [152, 304]];
let PODS = []; // {id, n, s, ver}
let DOWN = new Set();
let SEQ = 0;

const slotXY = (n, s) => [ZX[n] + SLOT[s][0], SLOT[s][1]];
const podColor = (ver) => (ver === 'v2' ? 'violet' : 'blue');

function setState(a, want, color) {
  const have = PODS.length;
  a.setText('state', `Deployment web — 원하는 ${want}개 · 실제 ${have}개`);
  const t = a.get('state');
  t.setAttribute('class', t.getAttribute('class').replace(/ ?tc-\w+/, '') + ' tc-' + (color || (want === have ? 'green' : 'red')));
}
/** 워커 노드 3개(영역) + 그 안의 파드를 그린다 */
function workers(a) {
  ZX.forEach((x, i) => {
    a.zone('z' + i, x, ZY, ZW, ZH, { label: `워커 노드 ${i + 1}`, color: DOWN.has(i) ? 'red' : 'gray' });
    a.text(x + ZW / 2, ZY + ZH - 22, DOWN.has(i) ? '✕ 연결 끊김' : '🤖 kubelet', { id: 'kl' + i, size: 11.5, cls: 'muted', layer: 'edge' });
  });
  for (const p of PODS) a.packet(`web ${p.ver}`, { id: p.id, at: slotXY(p.n, p.s), w: 84, h: 34, round: 9, color: podColor(p.ver) });
  a.text(360, 424, '', { id: 'state', size: 14, weight: 700, layer: 'edge' });
}
function freeSlot(n) {
  for (let s = 0; s < SLOT.length; s++) if (!PODS.some((p) => p.n === n && p.s === s)) return s;
  return -1;
}
/** 스케줄러가 노드 n에 새 파드를 배치 → 컨테이너 시작 → Running */
async function place(a, n, ver = 'v1', from = 'sched', label = '배치') {
  const s = freeSlot(n);
  const id = 'pod' + ++SEQ;
  PODS.push({ id, n, s, ver });
  const [x, y] = slotXY(n, s);
  if (from) await a.send(from, [x, y - 30], label, { color: 'amber', dur: 600 });
  const p = a.packet(`web ${ver}`, { id, at: [x, y], w: 84, h: 34, round: 9, color: 'gray', hidden: true });
  await a.show(p, 250);
  p.set('시작 중…');
  await a.wait(300);
  p.set(`web ${ver}`, podColor(ver));
  return id;
}
async function kill(a, id, dur = 300) {
  PODS = PODS.filter((p) => p.id !== id);
  const p = a.get(id);
  p.set('종료', 'gray');
  await a.fadeOut(p, dur);
}

/** 컨트롤 플레인 + 워커 무대 */
function cluster(a) {
  a.clear('zone', 'edge', 'node', 'pkt', 'top');
  a.zone('cp', 186, 22, 512, 112, { label: '컨트롤 플레인', color: 'violet' });
  a.node('dev', 82, 78, { shape: 'person', label: '개발자', sub: 'kubectl', color: 'blue', w: 108, h: 56 });
  a.node('api', 290, 82, { label: 'API 서버', icon: '🛎️', color: 'violet', w: 118, h: 62 });
  a.node('sched', 442, 82, { label: '스케줄러', icon: '🧩', color: 'violet', w: 118, h: 62 });
  a.node('ctrl', 594, 82, { label: '컨트롤러', icon: '🔁', color: 'violet', w: 118, h: 62 });
  a.edge('dev', 'api');
  a.edge('api', 'sched', { both: true });
  a.edge('sched', 'ctrl', { both: true, dashed: true, arrow: false });
  workers(a);
}

export default {
  id: 'k8s',
  level: 4,
  cat: '서버·인프라',
  title: '쿠버네티스 — 컨테이너를 돌보는 선장',
  sub: '"이 앱을 3개 띄워 둬"라고 말해 두면, 고장·부하·배포를 알아서 챙기는 시스템',
  analogy: '쿠버네티스는 화물선의 선장입니다. 화물(앱)은 규격 컨테이너에 담겨 어느 배에나 똑같이 실리고, 선장은 "컨테이너 3개를 늘 실어 둔다"는 지시서를 보며 배(노드)가 고장 나면 다른 배로 옮겨 싣습니다. 사람은 지시서만 고치면 됩니다.',
  keys: [
    '컨테이너는 앱과 필요한 라이브러리·설정을 한 상자(이미지)에 담아 어디서나 똑같이 실행되게 한다.',
    '쿠버네티스 클러스터는 컨트롤 플레인(API 서버·스케줄러·컨트롤러·etcd)과 실제로 파드를 돌리는 워커 노드로 이뤄진다.',
    '사용자는 "원하는 상태"(replicas: 3)를 선언하고, 컨트롤러가 실제 상태를 계속 비교해 차이를 메운다(조정 루프).',
    '노드가 죽으면 파드를 다른 노드에 다시 띄우고(자가 치유), 부하가 늘면 HPA가 파드 수를 늘린다.',
    '롤링 업데이트는 새 버전 파드를 하나씩 띄워 준비(readiness)가 끝난 것만 Service에 연결해 무중단으로 교체한다.',
  ],
  terms: [
    ['컨테이너', '앱과 실행 환경을 함께 묶어 격리해 실행하는 단위 (Docker 이미지로 만든다)'],
    ['파드(Pod)', '쿠버네티스가 배치하는 최소 단위. 컨테이너 1개 이상과 네트워크를 공유'],
    ['노드', '파드가 실제로 실행되는 서버(가상 머신). kubelet이 관리'],
    ['디플로이먼트', '"이 이미지로 파드 N개"를 선언하는 오브젝트. 개수 유지와 업데이트를 담당'],
    ['HPA', 'Horizontal Pod Autoscaler. CPU 등 지표를 보고 파드 수를 자동 조절'],
    ['Service', '파드들 앞의 고정 주소. 준비된 파드로만 트래픽을 나눠 준다'],
    ['readiness probe', '파드가 요청을 받을 준비가 됐는지 확인하는 검사'],
  ],
  quiz: [
    { q: '워커 노드 하나가 꺼져 web 파드가 3개에서 2개로 줄었습니다. 쿠버네티스는 어떻게 할까요?', c: ['원하는 수(3)와 실제(2)가 다르니 다른 노드에 파드를 하나 더 띄운다', '담당자가 다시 띄울 때까지 2개로 둔다', '클러스터 전체를 재시작한다', '남은 2개 파드에 CPU를 더 나눠 준다'], a: 0, why: '컨트롤러가 원하는 상태와 실제 상태를 계속 비교해 차이를 메웁니다(조정 루프). 사람이 개입할 필요가 없어요.', step: 3 },
    { q: '롤링 업데이트 중 새 v2 파드에는 언제부터 손님(트래픽)이 갈까요?', c: ['컨테이너 프로세스가 시작되자마자', 'v1 파드가 모두 내려간 뒤에 한꺼번에', 'HPA가 파드 수를 다시 계산한 뒤', 'readiness probe를 통과해 준비 완료가 확인된 뒤'], a: 3, why: 'Service는 readiness probe를 통과한 파드만 Endpoints에 넣으므로, 준비 안 된 파드로는 트래픽이 가지 않습니다.', step: 5 },
    { q: 'HPA의 목표 CPU 사용률이 60%이고, 파드 3개의 평균 CPU가 85%라면 원하는 파드 수는?', c: ['3개', '4개', '5개', '6개'], a: 2, why: '원하는 수 = ceil(현재 수 × 현재값 / 목표값) = ceil(3 × 85 / 60) = ceil(4.25) = 5입니다.', step: 4 },
  ],
  setup(a) {
    PODS = [];
    DOWN = new Set();
    SEQ = 0;
    a.zone('img', 46, 110, 220, 230, { label: '📦 컨테이너 이미지', color: 'teal' });
    a.packet('내 앱 코드', { id: 'l1', at: [156, 170], w: 160, h: 38, round: 8, color: 'teal', hidden: true });
    a.packet('Node.js 20', { id: 'l2', at: [156, 222], w: 160, h: 38, round: 8, color: 'blue', hidden: true });
    a.packet('라이브러리·설정', { id: 'l3', at: [156, 274], w: 160, h: 38, round: 8, color: 'amber', hidden: true });
    a.node('e1', 578, 90, { label: '내 노트북', icon: '💻', color: 'gray', w: 150, h: 64 });
    a.node('e2', 578, 220, { label: '테스트 서버', icon: '🧪', color: 'gray', w: 150, h: 64 });
    a.node('e3', 578, 350, { label: '클라우드', icon: '☁️', color: 'gray', w: 150, h: 64 });
  },
  steps: [
    {
      t: '컨테이너 — 앱을 상자에 통째로',
      easy: '"제 컴퓨터에선 되는데요?" 문제를 없애려고, 앱과 앱이 필요로 하는 모든 것을 한 상자(컨테이너)에 담습니다. 이 상자는 노트북이든 서버든 클라우드든 똑같이 실행됩니다.',
      deep: '컨테이너 이미지는 앱·런타임·라이브러리를 계층(layer)으로 쌓은 읽기 전용 파일 묶음(OCI 이미지)입니다. 실행 시 리눅스 커널의 namespace(격리)와 cgroup(자원 제한)으로 프로세스를 가둡니다. VM과 달리 커널을 공유하므로 수백 ms 안에 뜨고 가볍습니다.',
      async run(a) {
        a.caption('앱 + 런타임 + 라이브러리를 한 상자에');
        for (const id of ['l3', 'l2', 'l1']) {
          const p = a.get(id), y = p.y;
          p.y = y - 40;
          await a.par(a.show(p, 250), a.move(p, [p.x, y], 350));
        }
        for (const e of ['e1', 'e2', 'e3']) {
          await a.send([266, 222], e, '📦 같은 이미지', { color: 'teal', dur: 650 });
          a.setNode(e, { sub: '✓ 똑같이 실행', color: 'green' });
        }
        a.note('n1', 400, 404, '어디서나 같은 결과', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '클러스터 — 선장실과 일꾼 노드',
      easy: '컨테이너가 수백 개가 되면 사람이 일일이 돌볼 수 없습니다. 쿠버네티스는 위쪽 "선장실"(컨트롤 플레인)이 계획을 세우고, 아래 "일꾼"(워커 노드)들이 실제로 컨테이너를 돌리는 구조입니다.',
      deep: 'API 서버는 모든 요청의 관문이고 상태는 etcd(분산 키-값 저장소, Raft 합의)에 저장됩니다. 스케줄러는 새 파드를 놓을 노드를 고르고, 컨트롤러 매니저는 각종 조정 루프를 돌립니다. 각 노드의 kubelet은 API 서버를 지켜보며 자기 노드에 배정된 파드를 컨테이너 런타임(containerd)으로 실행합니다.',
      async run(a) {
        cluster(a);
        a.setText('state', '아직 실행 중인 앱 없음');
        for (const [id, cap, sub] of [['api', '모든 요청이 거치는 관문', '관문'], ['sched', '새 파드를 어느 노드에 둘지 결정', '자리 배치'], ['ctrl', '원하는 상태와 실제 상태를 계속 비교', '상태 유지']]) {
          a.hl(id);
          a.caption(cap);
          a.setNode(id, { sub });
          await a.flash(id);
          a.hl(id, false);
        }
        a.note('n2', 360, 166, '각 노드의 kubelet이 실제로 컨테이너를 실행', { color: 'gray' });
        await a.wait(600);
      },
    },
    {
      t: '디플로이먼트 — "3개 띄워 줘"',
      easy: '개발자는 "web 앱을 3개 띄워 둬"라는 지시서만 제출합니다. 스케줄러가 여유 있는 노드를 골라 하나씩 배치하고, 각 노드가 컨테이너를 실행합니다.',
      deep: 'kubectl apply로 Deployment(replicas: 3) 매니페스트를 보내면 API 서버가 etcd에 저장하고, Deployment 컨트롤러가 ReplicaSet을, ReplicaSet 컨트롤러가 파드 3개를 만듭니다. 스케줄러는 자원 요청(requests)·어피니티·테인트를 따져 노드를 고르고(바인딩), kubelet이 이미지를 받아 실행합니다.',
      async run(a) {
        a.remove('n2');
        await a.send('dev', 'api', 'replicas: 3', { color: 'blue', dur: 700 });
        a.badge('api', '원하는 3', 'blue');
        setState(a, 3, 'amber');
        await a.send('api', 'sched', '파드 3개', { color: 'violet', dur: 500 });
        for (const n of [0, 1, 2]) {
          await place(a, n);
          setState(a, 3, PODS.length === 3 ? 'green' : 'amber');
        }
        await a.wait(500);
      },
    },
    {
      t: '노드가 죽으면 — 스스로 복구',
      easy: '워커 노드 2가 갑자기 꺼졌습니다. 컨트롤러는 "원하는 건 3개인데 실제는 2개네?" 하고 알아채, 다른 노드에 새 파드를 하나 더 띄웁니다. 사람이 밤에 일어날 필요가 없습니다.',
      deep: 'kubelet의 하트비트(Lease)가 끊기면 노드 컨트롤러가 노드를 NotReady로 표시하고, 기본 약 5분(tolerationSeconds) 뒤 그 노드의 파드를 축출합니다. ReplicaSet 컨트롤러는 desired(3) ≠ actual(2)을 보고 새 파드를 만들고, 스케줄러가 건강한 노드에 배치합니다. 이것이 선언형 조정 루프(reconciliation loop)입니다.',
      async run(a) {
        DOWN.add(1);
        a.get('z1').g.setAttribute('class', 'zone zc-red');
        a.setText('kl1', '✕ 연결 끊김');
        const dead = PODS.find((p) => p.n === 1);
        const dp = a.get(dead.id);
        dp.set('✕ 중단', 'red');
        await a.flash('ctrl');
        await a.fade(dp, 0.35, 400);
        PODS = PODS.filter((p) => p !== dead);
        setState(a, 3);
        a.hl('ctrl', true, 'red');
        a.note('n3', 360, 166, '원하는 3 ≠ 실제 2 → 하나 더!', { color: 'red' });
        await a.wait(700);
        await a.send('ctrl', 'sched', '1개 부족', { color: 'red', dur: 500 });
        a.hl('ctrl', false);
        a.remove(dp);
        await place(a, 2);
        setState(a, 3);
        a.remove('n3');
        a.note('n3b', 360, 166, '자가 치유 완료: 다시 3개', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '부하가 늘면 — 5개로 스케일 아웃',
      easy: '손님이 몰려 파드들이 바빠지면, 자동 조절기(HPA)가 "3개로는 부족해, 5개로!"라고 지시서를 고칩니다. 그러면 같은 방식으로 파드 2개가 더 뜹니다.',
      deep: 'HPA는 metrics-server에서 CPU 사용률을 주기적으로(기본 15초) 읽어 원하는 수 = ceil(현재 수 × 현재값 / 목표값)으로 계산합니다(3 × 85% / 60% ≈ 5). 노드 자원이 모자라면 Cluster Autoscaler가 노드 자체를 추가합니다.',
      async run(a) {
        a.remove('n3b');
        for (const p of PODS) a.get(p.id).set('CPU 85%', 'red');
        a.note('n4', 360, 166, 'HPA: CPU 85% > 목표 60% → 5개로', { color: 'amber' });
        await a.wait(800);
        await a.send('ctrl', 'api', 'replicas: 5', { color: 'amber', dur: 700, via: [[594, 142], [290, 142]] });
        a.badge('api', '원하는 5', 'blue');
        setState(a, 5);
        await a.send('api', 'sched', '파드 2개', { color: 'violet', dur: 500 });
        await a.par(place(a, 0), a.wait(250).then(() => place(a, 2)));
        for (const p of PODS) a.get(p.id).set(`web ${p.ver}`, podColor(p.ver));
        setState(a, 5);
        a.remove('n4');
        a.note('n4b', 360, 166, '부하가 5개로 나뉘어 CPU 50%대', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '롤링 업데이트 — 새 버전을 하나씩',
      easy: '새 버전(v2)을 내보낼 때 한꺼번에 바꾸면 그 순간 서비스가 멈춥니다. 그래서 v2를 하나 띄우고, "준비 완료"가 확인된 뒤에야 손님을 보내고, 그다음 v1 하나를 내립니다.',
      deep: 'Deployment의 이미지를 바꾸면 새 ReplicaSet이 생기고 maxSurge(기본 25%)만큼 v2를 먼저 띄우고 maxUnavailable(기본 25%)만큼 v1을 내립니다. Service는 readiness probe를 통과한 파드만 Endpoints(EndpointSlice)에 넣으므로, 아직 준비 안 된 파드로는 트래픽이 가지 않습니다.',
      async run(a) {
        a.clear('zone', 'edge', 'node', 'pkt', 'top');
        a.node('user', 82, 82, { shape: 'person', label: '사용자들', icon: '👥', color: 'blue', w: 112, h: 56 });
        a.node('svc', 360, 82, { label: 'Service', sub: '준비된 파드로만', icon: '🔀', color: 'teal', w: 156, h: 66 });
        a.node('dev', 620, 82, { shape: 'person', label: '개발자', sub: 'image: v2', color: 'violet', w: 120, h: 56 });
        a.edge('user', 'svc');
        workers(a);
        setState(a, 5);
        a.get('z1').g.setAttribute('class', 'zone zc-gray');
        a.setText('kl1', '🤖 kubelet (새 노드)');
        DOWN.delete(1);
        a.setText('state', '롤링 업데이트: v1 5개 → v2');
        a.caption('고장 난 노드 2는 새 서버로 교체됐어요. 이제 v2를 배포합니다');
        const traffic = (targets) => a.par(...targets.map((id, i) => a.wait(i * 120).then(() => {
          const p = a.get(id);
          return a.send('svc', [p.x, p.y - 4], '요청', { color: 'teal', dur: 550 });
        })));
        await traffic(PODS.slice(0, 3).map((p) => p.id));
        // v2 하나 생성 → 준비 확인 전엔 트래픽 없음
        const nid = await place(a, 1, 'v2', 'dev', 'v2 배포');
        const np = a.get(nid);
        np.set('v2 준비 중', 'gray');
        a.note('n5', 360, 166, '준비(readiness) 확인 전 → 트래픽 안 보냄', { color: 'amber' });
        await traffic(PODS.filter((p) => p.ver === 'v1').slice(0, 3).map((p) => p.id));
        np.set('web v2', 'violet');
        a.remove('n5');
        a.note('n5b', 360, 166, 'v2 준비 완료 → 트래픽 받기 시작, v1 하나 종료', { color: 'green' });
        await traffic([nid]);
        await kill(a, PODS.find((p) => p.ver === 'v1').id);
        a.setText('state', `v1 ${PODS.filter((p) => p.ver === 'v1').length}개 · v2 ${PODS.filter((p) => p.ver === 'v2').length}개`);
        await a.wait(500);
      },
    },
    {
      t: '끝까지 반복 — 멈춤 없는 배포',
      easy: '같은 일을 반복해 v1이 모두 v2로 바뀝니다. 바꾸는 내내 손님은 늘 준비된 파드에게 응답을 받으므로 서비스가 한 번도 멈추지 않습니다. 문제가 생기면 이전 버전으로 되돌릴 수도 있습니다.',
      deep: '진행 중 새 파드가 readiness를 통과하지 못하면 롤아웃이 멈춰 장애가 번지지 않고(progressDeadlineSeconds), kubectl rollout undo로 이전 ReplicaSet으로 되돌립니다. 종료되는 파드는 SIGTERM 후 terminationGracePeriodSeconds(기본 30초) 동안 처리 중인 요청을 마무리합니다.',
      async run(a) {
        a.remove('n5b');
        const order = [0, 2, 1, 0];
        for (const n of order) {
          const nid = await place(a, n === 1 && freeSlot(1) < 0 ? 0 : n, 'v2', null);
          a.get(nid).set('web v2', 'violet');
          const old = PODS.find((p) => p.ver === 'v1');
          const tgt = PODS.find((p) => p.ver === 'v2' && p.id !== nid) || PODS.find((p) => p.id === nid);
          const tp = a.get(tgt.id);
          await a.par(kill(a, old.id, 250), a.send('svc', [tp.x, tp.y - 4], '요청', { color: 'teal', dur: 450 }));
          a.setText('state', `v1 ${PODS.filter((p) => p.ver === 'v1').length}개 · v2 ${PODS.filter((p) => p.ver === 'v2').length}개`);
        }
        await a.par(...PODS.map((p, i) => a.wait(i * 110).then(() => {
          const q = a.get(p.id);
          return a.send('svc', [q.x, q.y - 4], '요청', { color: 'teal', dur: 550 });
        })));
        a.setText('state', '완료: v2 5개 · 중단 시간 0초');
        a.note('n6', 360, 166, '언제나 준비된 파드가 응답 → 무중단', { color: 'green' });
        await a.wait(600);
      },
    },
  ],
};

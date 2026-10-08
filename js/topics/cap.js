// CAP 정리: 두 지역 복제 → 정상 복제 → 네트워크 분할 → C를 고르면 거절 / A를 고르면 갈라짐 → 회복 후 충돌 해결 → PACELC → CP·AP 예와 쿼럼
// 단계마다 무대를 새로 그린다. 시각·지연·재고 값은 설명용 예시 값(고정)이다.

const SX = 175, TX = 545, SY = 140, MID = 360;

/** 서울·도쿄 무대를 새로 그린다. o: { title, s, t, link: 'ok'|'cut', clients, cs, ct } */
function base(a, o = {}) {
  a.clear('zone', 'edge', 'node', 'pkt', 'top');
  a.text(360, 24, o.title || '', { size: 14.5, weight: 800 });
  const withC = o.clients !== false;
  const zh = withC ? 248 : 166;
  a.zone('zs', 30, 48, 290, zh, { label: '서울 데이터센터', color: 'blue' });
  a.zone('zt', 400, 48, 290, zh, { label: '도쿄 데이터센터', color: 'violet' });
  a.node('S', SX, SY, { shape: 'db', label: '서울 서버', sub: o.s ?? '재고 1', color: 'blue', w: 150, h: 84 });
  a.node('T', TX, SY, { shape: 'db', label: '도쿄 서버', sub: o.t ?? '재고 1', color: 'violet', w: 150, h: 84 });
  a.edge('S', 'T', { id: 'link', both: true, label: '복제', color: 'teal', ly: -14 });
  if (o.link === 'cut') cut(a);
  if (withC) {
    a.node('cS', SX, 250, { shape: 'person', label: o.cs || '민지', sub: '서울 손님', color: 'gray', w: 118, h: 50 });
    a.node('cT', TX, 250, { shape: 'person', label: o.ct || '켄', sub: '도쿄 손님', color: 'gray', w: 118, h: 50 });
    a.edge('cS', 'S', { arrow: false });
    a.edge('cT', 'T', { arrow: false });
  }
}
/** 복제 연결을 끊긴 모양으로 */
function cut(a) {
  const e = a.get('link');
  e.path.classList.replace('ec-teal', 'ec-red');
  e.path.classList.add('dashed');
  e.lab.textContent = '연결 끊김';
  e.lab.classList.add('tc-red');
  return a.text(MID, SY, '✕', { id: 'cutx', size: 30, weight: 800, color: 'red', layer: 'edge' });
}
function heal(a) {
  const e = a.get('link');
  e.path.classList.replace('ec-red', 'ec-teal');
  e.path.classList.remove('dashed');
  e.lab.textContent = '연결 복구';
  e.lab.classList.remove('tc-red');
  a.remove('cutx');
}
/** 끊긴 길로 보낸 메시지: 가운데에서 사라진다 */
async function lost(a, from, label, dy = 0) {
  const f = a.pt(from);
  const p = a.packet(label, { at: [f.x, f.y + dy], color: 'gray' });
  const tx = MID + (f.x < MID ? -26 : 26);
  await a.move(p, [tx, SY + dy], 650);
  p.set('✕', 'red');
  await a.wait(150);
  await a.fadeOut(p, 300);
}
const resp = (a, from, to, s, color) => a.send(from, to, s, { color, dur: 650 });

export default {
  id: 'cap',
  level: 4,
  cat: '분산 시스템',
  title: 'CAP 정리 — 셋 다 가질 순 없다',
  sub: '데이터를 여러 곳에 복제했을 때 네트워크가 끊기면, "정확한 답"과 "언제나 답하기" 중 하나는 포기해야 한다',
  analogy: '서울과 도쿄에 지점이 있는 가게가 장부 하나를 함께 쓰며, 거래할 때마다 전화로 서로 장부를 맞춘다고 해 봐요. 그런데 전화가 끊기면? 상대에게 확인할 수 있을 때까지 판매를 멈추거나(일관성), 일단 각자 팔고 나중에 장부를 맞추거나(가용성) 둘 중 하나를 골라야 합니다.',
  keys: [
    'CAP 정리: 데이터를 여러 서버에 복제한 시스템에서 네트워크 분할(P)이 생기면, 일관성(C)과 가용성(A)을 동시에 완벽하게 지킬 수는 없다.',
    'C(일관성)는 어느 서버에 물어도 가장 최근에 완료된 쓰기를 보는 것(선형화 가능성), A(가용성)는 고장 나지 않은 모든 서버가 모든 요청에 에러 없이 응답하는 것이다.',
    '분할은 고르는 옵션이 아니라 언젠가 반드시 일어나는 사건이다. 그래서 "셋 중 아무거나 둘"이 아니라 "분할이 났을 때 C냐 A냐"가 진짜 선택이다.',
    'C를 고르면 분할 동안 일부 요청을 거절하고, A를 고르면 값이 갈라지므로 회복 후 LWW·벡터 시계·CRDT 같은 방법으로 충돌을 합쳐야 한다.',
    'PACELC: 분할이 없을 때도 복제를 기다릴지(일관성) 바로 답할지(지연)를 골라야 한다. 실제 시스템은 데이터마다 CP·AP 성향을 고르고, 쿼럼(R+W>N) 같은 설정으로 조절한다.',
  ],
  terms: [
    ['일관성(C)', '모든 읽기가 가장 최근에 완료된 쓰기를 보는 성질. 여러 복제본이 마치 하나처럼 보인다(선형화 가능성)'],
    ['가용성(A)', '고장 나지 않은 서버라면 받은 요청에 반드시 (에러가 아닌) 응답을 돌려주는 성질'],
    ['분할 내성(P)', '서버 사이 메시지가 끊기거나 사라져도 시스템이 계속 동작하는 성질'],
    ['LWW', 'Last Write Wins. 충돌하면 타임스탬프가 가장 늦은 쓰기만 남기고 나머지는 버리는 방식'],
    ['벡터 시계', '서버별 카운터 묶음으로 두 쓰기의 선후 관계를 따져, "동시에 일어난 충돌"을 알아내는 방법'],
    ['CRDT', '어떤 순서로 합쳐도 같은 결과로 모이도록 설계된 자료형. 예: 좋아요 카운터, 장바구니 집합'],
    ['쿼럼(R+W>N)', 'N개 복제 중 쓰기는 W곳, 읽기는 R곳의 응답을 받으면 성공으로 치는 규칙. R+W>N이면 읽기와 쓰기가 적어도 한 곳 겹친다'],
  ],
  quiz: [
    { q: '네트워크 분할(P)이란 어떤 상황일까요?', c: ['서버 한 대가 고장 나서 꺼진 상황', '손님의 휴대폰 인터넷이 끊긴 상황', '서버들은 켜져 있지만 서로 연결이 끊겨 메시지를 주고받지 못하는 상황', '데이터를 여러 서버에 나눠 담는 것(샤딩)'], a: 2, why: '분할은 서버가 죽은 게 아니라 서버 사이의 길이 끊긴 상황입니다. 양쪽 다 살아서 요청을 받지만 서로의 소식을 모릅니다.', step: 2 },
    { q: '분할 중에도 가용성(A)을 택해 각 서버가 주문을 받는 쇼핑몰에서 생길 수 있는 일은?', c: ['모든 주문이 에러로 거절된다', '분할이 끝날 때까지 두 서버가 자동으로 꺼진다', '두 서버가 언제나 같은 재고 값을 보여 준다', '두 서버의 기록이 갈라져 1개 남은 상품이 두 번 팔릴 수 있다'], a: 3, why: '서로 확인하지 않고 각자 받아 주니 값이 갈라집니다. 응답은 계속하지만, 분할이 끝난 뒤 충돌을 해결해야 합니다.', step: 4 },
    { q: 'N=3으로 복제하고 쓰기는 W=2곳의 확인을 받습니다. 읽기가 최신 쓰기를 받은 복제본을 반드시 한 곳 이상 포함하려면 R은 최소 얼마여야 할까요?', c: ['1', '2', '3', '쿼럼만 쓰면 R과 상관없이 항상 최신이다'], a: 1, why: 'R+W>N, 즉 R+2>3이어야 하므로 R=2입니다. R=1이면 아직 옛 값인 복제본 하나만 읽을 수 있습니다.', step: 7 },
  ],
  setup(a) {
    base(a, { title: '같은 데이터를 두 지역에 복제', s: '재고 —', t: '재고 —', clients: false });
  },
  steps: [
    {
      t: '데이터를 두 지역에 복제하기',
      easy: '중요한 데이터를 서버 한 대에만 두면 그 서버가 고장 날 때 끝이에요. 그래서 서울과 도쿄처럼 멀리 떨어진 두 곳에 똑같이 복사(복제)해 둡니다. 판매자가 서울에 "재고 2개"를 등록하면 도쿄 서버에도 그대로 전달돼요.',
      deep: '복제의 목적은 장애 대비(한 리전이 통째로 죽어도 서비스), 지연 단축(가까운 리전에서 읽기), 읽기 처리량 확장입니다. 서울–도쿄 왕복 지연(RTT)은 약 30ms로, 같은 데이터센터 안(1ms 미만)보다 훨씬 깁니다. 복제 방식은 단일 리더·멀티 리더·리더리스, 그리고 동기·비동기로 나뉩니다.',
      async run(a) {
        base(a, { title: '같은 데이터를 두 지역에 복제', s: '재고 —', t: '재고 —', clients: false });
        a.text(MID, SY + 22, '왕복 약 30ms', { size: 11, cls: 'muted', weight: 600 });
        a.node('seller', SX, 280, { shape: 'person', label: '판매자', color: 'amber', w: 110, h: 44 });
        a.edge('seller', 'S', { arrow: false });
        await a.send('seller', 'S', '재고 2 등록', { color: 'amber', dur: 800 });
        a.setNode('S', { sub: '재고 2' });
        await a.flash('S');
        await a.send('S', 'T', '복제: 재고 2', { color: 'teal', dur: 900 });
        a.setNode('T', { sub: '재고 2' });
        await a.flash('T');
        a.note('n0', 450, 352, '한 곳이 고장 나도 버티고,\n손님은 가까운 서버에서 빠르게 읽어요', { color: 'teal' });
        await a.wait(600);
      },
    },
    {
      t: '정상일 때 — 쓰기가 양쪽에 복제된다',
      easy: '도쿄 손님 유키가 1개를 사면, 도쿄 서버는 서울 서버에도 "재고 1"을 알리고 "확인했어요"라는 답을 받은 뒤에 "구매 완료"라고 말해요. 그래서 이제 서울 손님 민지가 어느 서버에 물어도 똑같이 "1개 남음"을 봅니다.',
      deep: 'CAP의 C는 선형화 가능성(linearizability)입니다. 모든 연산이 하나의 복사본에서 어느 한순간에 일어난 것처럼 보여야 하며, 쓰기가 완료된 뒤 시작한 읽기는 반드시 그 값(또는 더 새 값)을 봐야 합니다. ACID의 C(제약 조건 유지)와는 다른 뜻입니다. 여기서는 동기 복제로 이를 지키는데, 그 대가로 쓰기마다 RTT(약 30ms)만큼 느려집니다.',
      async run(a) {
        base(a, { title: '정상일 때: 복제가 끝난 뒤에 "완료"', s: '재고 2', t: '재고 2', ct: '유키' });
        await a.send('cT', 'T', '1개 구매', { color: 'amber', dur: 650 });
        await a.send('T', 'S', '재고 1로', { color: 'teal', dur: 800, dy: -14 });
        a.setNode('S', { sub: '재고 1' });
        await a.send('S', 'T', '확인', { color: 'green', dur: 700, dy: 14 });
        a.setNode('T', { sub: '재고 1' });
        await resp(a, 'T', 'cT', '구매 완료 ✓', 'green');
        a.caption('이제 서울 손님 민지가 재고를 물어보면?');
        await a.send('cS', 'S', '재고?', { color: 'blue', dur: 600 });
        await resp(a, 'S', 'cS', '1개 남음', 'blue');
        a.badge('cS', '최신 ✓', 'green');
        a.note('n1', 360, 352, '어느 서버에 물어도 가장 최근 값 → 일관성(C)', { color: 'blue' });
        a.text(360, 392, '대신 쓰기마다 서울–도쿄 왕복(약 30ms)을 기다려요', { size: 11.5, cls: 'muted', weight: 600 });
        await a.wait(500);
      },
    },
    {
      t: '네트워크 분할(P) — 서로를 볼 수 없다',
      easy: '어느 날 서울과 도쿄를 잇는 길(네트워크)이 끊겼어요. 두 서버는 멀쩡히 켜져 있고 손님 요청도 받을 수 있지만, 서로에게 보내는 소식은 중간에서 사라집니다. 이런 상태를 "네트워크 분할"이라고 해요.',
      deep: 'Gilbert·Lynch의 증명(2002)에서 분할 내성(P)은 노드 사이 메시지가 임의로 유실돼도 동작하는 것을 뜻합니다. 분할은 케이블·스위치 장애, 설정 실수, 한쪽만 끊기는 비대칭 장애, 긴 GC 멈춤 등으로 실제로 자주 생깁니다. 노드는 타임아웃만 볼 수 있어서 "상대가 죽었는지, 길만 끊겼는지" 구별할 수 없습니다.',
      async run(a) {
        base(a, { title: '네트워크 분할(P): 서로를 볼 수 없다', s: '재고 1', t: '재고 1' });
        await a.send('S', 'T', '살아 있니?', { color: 'teal', dur: 700, dy: -14 });
        await a.send('T', 'S', '응!', { color: 'teal', dur: 600, dy: 14 });
        a.caption('그런데 서울–도쿄 사이 네트워크에 장애가!');
        await a.wait(300);
        const x = cut(a);
        x.style.opacity = 0;
        await a.show(x, 300);
        await a.par(lost(a, 'S', '살아 있니?', -14), a.wait(250).then(() => lost(a, 'T', '살아 있니?', 14)));
        a.badge('S', '켜져 있음', 'green');
        a.badge('T', '켜져 있음', 'green');
        a.note('n2', 360, 330, '두 서버 모두 멀쩡하지만, 서로의 소식을 모릅니다', { color: 'red' });
        a.note('n3', 360, 388, '"상대가 죽었나? 길이 끊겼나?" 구별할 수 없어요\n분할은 언젠가 반드시 생깁니다 — 이때 손님이 오면?', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '선택 ① 일관성(C) — 확인 못 하면 거절',
      easy: '첫 번째 선택은 "틀린 답을 주느니 답하지 않기"예요. 도쿄 서버는 서울에 확인할 수 없으니 켄의 주문을 거절하고, 서울 서버도 지금 값이 최신인지 장담할 수 없어 민지의 질문에 "잠시 후 다시"라고 답합니다.',
      deep: 'CP 시스템은 쿼럼·합의(Raft, Paxos)로 과반의 확인을 받아야 쓰기(경우에 따라 읽기도)를 처리합니다. 3·5대처럼 홀수로 두면 분할 때 과반을 가진 쪽은 계속 일하고 소수 쪽만 거절하지만, 이 그림처럼 2대라면 어느 쪽도 과반(2)을 못 얻어 둘 다 멈춥니다. CAP의 정의로는 소수 쪽이 거절하는 것만으로도 A를 잃은 것입니다. etcd·ZooKeeper·Spanner가 이쪽입니다.',
      async run(a) {
        base(a, { title: '선택 ① 일관성(C): 확인 못 하면 거절', link: 'cut' });
        const tokyo = async () => {
          await a.send('cT', 'T', '1개 구매', { color: 'amber', dur: 650 });
          await lost(a, 'T', '확인해 줘', 14);
          a.setNode('T', { color: 'red' });
          await resp(a, 'T', 'cT', '⚠ 주문 불가', 'red');
          a.badge('T', '거절', 'red');
        };
        const seoul = async () => {
          await a.wait(500);
          await a.send('cS', 'S', '재고?', { color: 'blue', dur: 650 });
          await lost(a, 'S', '최신 맞아?', -14);
          a.setNode('S', { color: 'red' });
          await resp(a, 'S', 'cS', '⚠ 잠시 후 다시', 'red');
          a.badge('S', '거절', 'red');
        };
        a.caption('상대에게 확인할 수 없으니… 정확함을 지키려면 거절');
        await a.par(tokyo(), seoul());
        a.note('n4', 360, 340, '틀린 답보다 "지금은 안 돼요" → C를 지키고 A를 포기', { color: 'red' });
        a.text(360, 390, '서버가 3대 이상이면 과반을 가진 쪽은 계속 일할 수 있어요 (Raft·etcd)', { size: 11.5, cls: 'muted', weight: 600 });
        await a.wait(500);
      },
    },
    {
      t: '선택 ② 가용성(A) — 각자 받아 준다',
      easy: '두 번째 선택은 "일단 각자 받아 주기"예요. 민지는 서울에서, 켄은 도쿄에서 마지막 1개를 샀고 둘 다 "구매 완료"를 받았어요. 손님은 기다리지 않았지만, 두 서버의 기록이 서로 달라졌고 1개뿐인 상품이 두 번 팔렸습니다.',
      deep: 'CAP의 A는 "장애가 나지 않은 모든 노드가 받은 모든 요청에 (에러가 아닌) 응답한다"입니다. 이를 지키려면 상대 확인 없이 로컬에서 쓰기를 받아야 하므로 복제본이 갈라집니다(divergence). 멀티 리더·리더리스(Dynamo 계열) 시스템이 이쪽이며, "재고 ≥ 0" 같은 전역 불변식은 AP 방식으로는 지킬 수 없습니다.',
      async run(a) {
        base(a, { title: '선택 ② 가용성(A): 각자 받아 준다', link: 'cut' });
        a.caption('두 손님이 거의 동시에 마지막 1개를 주문');
        await a.par(a.send('cS', 'S', '1개 구매', { color: 'amber', dur: 650 }), a.wait(150).then(() => a.send('cT', 'T', '1개 구매', { color: 'amber', dur: 650 })));
        a.setNode('S', { sub: '재고 0 · 민지' });
        a.setNode('T', { sub: '재고 0 · 켄' });
        await a.par(resp(a, 'S', 'cS', '구매 완료 ✓', 'green'), resp(a, 'T', 'cT', '구매 완료 ✓', 'green'));
        a.badge('cS', '샀다!', 'green');
        a.badge('cT', '샀다!', 'green');
        await a.par(lost(a, 'S', '민지 구매', -14), a.wait(200).then(() => lost(a, 'T', '켄 구매', 14)));
        a.setNode('S', { color: 'amber' });
        a.setNode('T', { color: 'amber' });
        a.note('n5', 360, 340, '재고는 1개뿐인데 두 명 모두 "구매 완료"!', { color: 'red' });
        a.text(360, 390, '두 서버의 기록이 갈라졌어요 — 서울: 민지 / 도쿄: 켄', { size: 12, weight: 700, color: 'amber' });
        await a.wait(500);
      },
    },
    {
      t: '분할 회복 — 갈라진 값 합치기',
      easy: '길이 다시 이어지면 두 서버는 서로의 기록을 주고받다가 충돌을 발견해요. 가장 쉬운 방법은 "시각이 더 늦은 기록만 남기기"인데, 그러면 먼저 산 민지의 기록이 조용히 사라집니다. 그래서 충돌을 알아채고 제대로 합치는 방법들이 따로 있어요.',
      deep: 'LWW는 타임스탬프가 큰 쓰기만 남기는 단순한 방식(Cassandra 기본)이지만 동시 쓰기를 소리 없이 버리고, 서버 간 시계 오차 때문에 "나중"이 실제와 다를 수도 있습니다. 벡터 시계는 노드별 카운터로 인과 관계를 추적해 동시 쓰기를 감지하고, 두 값(형제)을 모두 남겨 앱이 병합하게 합니다(Dynamo·Riak). CRDT는 병합이 교환·결합·멱등 법칙을 만족해 어떤 순서로 합쳐도 같은 상태로 수렴합니다(G-Counter, OR-Set).',
      async run(a) {
        base(a, { title: '분할 회복 → 충돌을 어떻게 합칠까', link: 'cut', s: '재고 0 · 민지', t: '재고 0 · 켄', clients: false });
        a.setNode('S', { color: 'amber' });
        a.setNode('T', { color: 'amber' });
        a.caption('네트워크가 다시 이어졌어요');
        await a.wait(400);
        heal(a);
        await a.par(
          a.send('S', 'T', '민지 10:00:01', { color: 'blue', dur: 1000, dy: -14 }),
          a.send('T', 'S', '켄 10:00:02', { color: 'violet', dur: 1000, dy: 14 }),
        );
        a.text(MID, 238, '⚡ 충돌! 1개를 두 명이 샀다', { size: 14, weight: 800, color: 'red' });
        await a.wait(400);
        a.note('n6', 190, 300, 'LWW (마지막 쓰기 우선)\n더 늦은 10:00:02만 남김\n→ 민지 기록이 조용히 사라짐', { color: 'red' });
        a.setNode('S', { sub: '재고 0 · 켄', color: 'blue' });
        a.setNode('T', { sub: '재고 0 · 켄', color: 'violet' });
        await a.par(a.flash('S'), a.flash('T'));
        await a.wait(500);
        a.note('n7', 530, 300, '벡터 시계\n"동시에 일어난 충돌"임을 감지\n두 값 모두 보관 → 앱이 해결', { color: 'blue' });
        await a.wait(500);
        a.note('n8', 360, 394, 'CRDT: 좋아요 수처럼 어떤 순서로 합쳐도 같은 결과가 나오는 자료형', { color: 'teal' });
        await a.wait(500);
      },
    },
    {
      t: '진짜 선택은 C냐 A냐 — 그리고 PACELC',
      easy: '"셋 중 둘을 고른다"는 말은 오해를 부르기 쉬워요. 여러 곳에 나눠 둔 이상 길이 끊기는 일(P)은 피할 수 없으니, 진짜 질문은 "끊겼을 때 정확함(C)과 응답(A) 중 무엇을 지킬까"입니다. 길이 멀쩡할 때도 "복제를 기다려 정확하게"와 "기다리지 않고 빠르게" 사이에서 골라야 해요.',
      deep: 'CAP는 분할이 일어난 동안만의 이야기이고, 분할 내성이 없는 "CA"는 사실상 단일 노드에서나 성립합니다. Abadi의 PACELC는 이를 넓혀 "분할(P)이면 A vs C, 그렇지 않으면(E) 지연(L) vs C"로 정리합니다. 예를 들어 Cassandra·DynamoDB의 기본 설정은 PA/EL, Spanner·etcd는 PC/EC에 가깝고, 많은 DB는 일관성 수준 설정으로 요청마다 이 선택을 바꿀 수 있습니다.',
      async run(a) {
        a.clear('zone', 'edge', 'node', 'pkt', 'top');
        a.text(360, 24, 'P는 고르는 게 아니다 — 남은 선택은 C냐 A냐', { size: 14.5, weight: 800 });
        a.node('q', 360, 84, { label: '네트워크 분할?', color: 'amber', w: 180, h: 46, hidden: true });
        a.node('mp', 190, 182, { label: '분할 중 (P)', sub: '가용성 vs 일관성', color: 'red', w: 164, h: 54, hidden: true });
        a.node('me', 530, 182, { label: '평소 (Else)', sub: '지연 vs 일관성', color: 'teal', w: 164, h: 54, hidden: true });
        a.edge('q', 'mp', { id: 'eqp', label: '예', hidden: true, lx: -12 });
        a.edge('q', 'me', { id: 'eqe', label: '아니오', hidden: true, lx: 14 });
        const LV = [
          ['l1', 110, 'mp', 'A 택함', '갈라져도 응답', 'green', 'PA', '나중에 충돌 해결'],
          ['l2', 270, 'mp', 'C 택함', '모르면 거절', 'blue', 'PC', '일부 요청 에러'],
          ['l3', 450, 'me', 'L 택함', '복제 안 기다림', 'amber', 'EL', '잠깐 옛 값 가능'],
          ['l4', 610, 'me', 'C 택함', '복제 확인 후 응답', 'violet', 'EC', '+30ms (서울↔도쿄)'],
        ];
        for (const [id, x, p, l, s, c] of LV) {
          a.node(id, x, 290, { label: l, sub: s, color: c, w: 144, h: 56, hidden: true });
          a.edge(p, id, { id: 'e' + id, hidden: true });
        }
        await a.show('q', 350);
        await a.par(a.show('eqp'), a.show('mp'));
        a.caption('여러 곳에 복제한 이상, 분할은 "언젠가 반드시" 일어나요');
        await a.wait(500);
        for (const [id, x, , , , c, tag, note] of LV.slice(0, 2)) {
          await a.par(a.show('e' + id, 300), a.show(id, 300));
          a.badge(id, tag, c);
          a.text(x, 336, note, { size: 11, cls: 'muted', weight: 600 });
        }
        await a.wait(400);
        await a.par(a.show('eqe'), a.show('me'));
        a.caption('분할이 없을 때도 선택은 남아요: 빠르게? 정확하게?');
        await a.wait(400);
        for (const [id, x, , , , c, tag, note] of LV.slice(2)) {
          await a.par(a.show('e' + id, 300), a.show(id, 300));
          a.badge(id, tag, c);
          a.text(x, 336, note, { size: 11, cls: 'muted', weight: 600 });
        }
        a.note('n9', 360, 396, '"셋 중 아무거나 둘"이 아니라 — 분할 땐 C냐 A냐(CAP),\n평소엔 지연이냐 일관성이냐(PACELC)', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '실제로는 데이터마다 고른다 — CP·AP와 쿼럼',
      easy: '돈이나 좌석 예약처럼 틀리면 큰일 나는 데이터는 잠깐 멈추더라도 정확함(C)을 택하고, 장바구니나 좋아요 수처럼 잠깐 틀려도 괜찮은 데이터는 항상 응답(A)을 택해요. 몇 곳에 쓰고 몇 곳에서 읽을지(쿼럼)를 정해 그 사이를 조절하기도 합니다.',
      deep: 'Dynamo 계열에서는 N개 복제 중 W곳 쓰기 확인, R곳 읽기 응답을 요구하고, R+W>N이면 읽기 집합이 최신 쓰기를 받은 복제본과 겹칩니다. 읽은 값 중 옛 복제본은 읽기 복구(read repair)로 고칩니다. 다만 느슨한 쿼럼(sloppy quorum)·동시 쓰기·LWW 때문에 이것만으로 선형화가 보장되지는 않습니다. 현실은 더 섞여 있어서, 은행 ATM도 분할 중 소액 출금을 허용하고 나중에 정산하는 식으로 연산마다 다르게 고릅니다.',
      async run(a) {
        a.clear('zone', 'edge', 'node', 'pkt', 'top');
        a.text(360, 24, '실제 시스템은 데이터마다 고른다', { size: 14.5, weight: 800 });
        a.zone('zcp', 24, 44, 328, 140, { label: 'CP 성향 — 틀리느니 거절', color: 'blue' });
        a.zone('zap', 368, 44, 328, 140, { label: 'AP 성향 — 일단 응답, 나중에 맞춤', color: 'green' });
        const CP = ['🏦 계좌 잔액·이체', '🎫 좌석 예약·재고 차감', '🔒 분산 잠금·설정 (etcd)'];
        const AP = ['🛒 장바구니', '❤️ 좋아요·조회수', '📰 SNS 피드 (Cassandra)'];
        for (let i = 0; i < 3; i++) {
          await a.wait(180);
          a.text(46, 86 + i * 30, CP[i], { size: 12.5, anchor: 'start', weight: 600 });
          a.text(390, 86 + i * 30, AP[i], { size: 12.5, anchor: 'start', weight: 600 });
        }
        a.text(360, 214, '쿼럼: 복제 N=3, 쓰기 W=2, 읽기 R=2 → R + W > N', { size: 13, weight: 800, color: 'amber' });
        a.node('qw', 80, 300, { label: '쓰기', sub: 'W=2', color: 'amber', w: 100, h: 54 });
        a.node('qr', 640, 300, { label: '읽기', sub: 'R=2', color: 'teal', w: 100, h: 54 });
        a.node('r1', 250, 268, { shape: 'db', label: '복제 A', sub: 'v1', color: 'gray', w: 96, h: 62 });
        a.node('r2', 360, 332, { shape: 'db', label: '복제 B', sub: 'v1', color: 'gray', w: 96, h: 62 });
        a.node('r3', 470, 268, { shape: 'db', label: '복제 C', sub: 'v1', color: 'gray', w: 96, h: 62 });
        await a.par(a.send('qw', 'r1', 'v2', { color: 'amber', dur: 700 }), a.send('qw', 'r2', 'v2', { color: 'amber', dur: 800 }));
        a.setNode('r1', { sub: 'v2', color: 'green' });
        a.setNode('r2', { sub: 'v2', color: 'green' });
        a.badge('qw', '2곳 OK', 'green');
        a.caption('2곳이 확인하면 쓰기 성공 — C는 아직 v1');
        await a.wait(400);
        await a.par(a.send('qr', 'r3', '읽기', { color: 'teal', dur: 650 }), a.send('qr', 'r2', '읽기', { color: 'teal', dur: 750 }));
        await a.par(a.send('r3', 'qr', 'v1', { color: 'gray', dur: 650 }), a.send('r2', 'qr', 'v2', { color: 'green', dur: 750 }));
        a.badge('qr', 'v2 ✓', 'green');
        a.caption('B가 겹치니 최신 v2를 고름 → 옛 값인 C는 읽기 복구');
        await a.send('qr', 'r3', 'v2', { color: 'green', dur: 650 });
        a.setNode('r3', { sub: 'v2', color: 'green' });
        a.note('n10', 360, 406, '쓰기 2곳 + 읽기 2곳 > 3곳 → 적어도 한 곳(B)이 겹쳐 최신 값을 봐요', { color: 'amber' });
        await a.wait(600);
      },
    },
  ],
};

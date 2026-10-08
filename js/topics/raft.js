// Raft 합의: 리더 선출, 로그 복제와 커밋, 리더 장애, 네트워크 분할
const CX = 300, CY = 220, RAD = 150;
const POS = [0, 1, 2, 3, 4].map((i) => {
  const t = (-90 + i * 72) * (Math.PI / 180);
  return [Math.round(CX + RAD * Math.cos(t)), Math.round(CY + RAD * Math.sin(t))];
});
const ID = ['s1', 's2', 's3', 's4', 's5'];
const CUT_Y = 270;
let LOG = [[], [], [], [], []]; // 각 노드 로그: [{v, ok}]

const ROLE = {
  f: { sub: 'Follower', color: 'gray' },
  c: { sub: 'Candidate', color: 'amber' },
  l: { sub: 'Leader', color: 'green' },
  x: { sub: '✕ 다운', color: 'red' },
};
const role = (a, i, r) => a.setNode(ID[i], ROLE[r]);
const setTerm = (a, n) => a.setText('term', `term ${n}`);

function logXY(i, k) { return [POS[i][0] - 21 + k * 42, POS[i][1] + 44]; }
/** 노드 i 로그 k번째 칸에 항목을 쓴다(있으면 덮어씀) */
function putLog(a, i, k, v, ok = false) {
  const id = `lg${i}_${k}`;
  if (LOG[i][k]) a.remove(id);
  LOG[i][k] = { v, ok };
  const p = a.packet(v, { id, at: logXY(i, k), w: 38, h: 22, round: 5, size: 11, color: ok ? 'green' : 'gray', hidden: !a.fast });
  if (!a.fast) a.show(p, 250).catch(() => {});
  return p;
}
function commitLog(a, i, k) {
  LOG[i][k].ok = true;
  a.get(`lg${i}_${k}`).set(null, 'green');
}
const bar = (a, i) => a.get('tm' + i);
/** from → 여러 노드로 동시에 메시지. onArrive(i) 콜백 */
function fanout(a, from, targets, label, color, onArrive, dur = 650) {
  return a.par(...targets.map((i) => a.send(ID[from], ID[i], label, { color, dur }).then(() => onArrive && onArrive(i))));
}
/** 분할선에 막히는 메시지 */
async function blocked(a, from, to, label) {
  const [x1, y1] = POS[from], [x2, y2] = POS[to];
  const t = (CUT_Y - y1) / (y2 - y1);
  const p = a.packet(label, { at: [x1, y1], color: 'amber' });
  await a.move(p, [x1 + (x2 - x1) * t, CUT_Y], 500);
  p.set('✕', 'red');
  await a.fadeOut(p, 350);
}
async function heartbeat(a, from, targets) {
  await fanout(a, from, targets, '♥', 'green', (i) => bar(a, i).set(1, 200), 550);
}

export default {
  id: 'raft',
  level: 4,
  cat: '분산 시스템',
  title: 'Raft 합의 — 여럿이 하나의 결정을',
  sub: '서버 몇 대가 고장 나도, 남은 서버들이 같은 순서로 같은 데이터를 갖게 하는 약속',
  analogy: '다섯 명이 한 권의 회의록을 나눠 쓰는 모임과 같습니다. 반장(리더) 한 명만 회의록에 받아 적고 나머지에게 불러 줍니다. 과반수(3명)가 "적었다"고 하면 확정입니다. 반장이 연락이 끊기면 가장 먼저 기다리다 지친 사람이 "내가 반장 할게, 찬성?" 하고 과반수 표를 얻으면 새 반장이 됩니다.',
  keys: [
    'Raft 노드는 Follower · Candidate · Leader 중 하나이고, 한 term(임기)에 리더는 최대 한 명이다.',
    '리더의 하트비트가 끊겨 선거 타이머가 끝난 노드가 후보가 되어 RequestVote를 보내고, 과반수 표를 얻으면 리더가 된다.',
    '쓰기는 리더만 받는다: 리더 로그에 추가 → AppendEntries로 복제 → 과반수가 저장하면 커밋 → 상태 머신에 적용.',
    '노드 5대는 2대까지 고장 나도 동작한다(과반수 3). 과반수가 없는 쪽은 아무것도 커밋할 수 없다.',
    '더 높은 term을 본 리더는 즉시 물러나고, 커밋되지 않은 로그는 새 리더의 로그로 덮어쓰인다.',
  ],
  terms: [
    ['합의(Consensus)', '여러 서버가 하나의 값(순서)에 동의하는 것'],
    ['term', '선거마다 1씩 늘어나는 임기 번호. 논리적 시계 역할'],
    ['선거 타이머', '리더 소식이 없으면 끝나는 타이머. 노드마다 무작위 길이(예: 150~300ms)'],
    ['RequestVote', '후보가 표를 요청하는 메시지'],
    ['AppendEntries', '리더가 로그 항목을 복제하는 메시지. 빈 것은 하트비트'],
    ['커밋', '과반수 노드에 저장되어 절대 사라지지 않는 상태가 된 것'],
    ['쿼럼(과반수)', 'N대 중 ⌊N/2⌋+1대. 5대면 3대'],
  ],
  quiz: [
    { q: '리더가 보내는 "나 아직 살아 있어" 신호(하트비트)를 받으면 팔로워는 어떻게 할까요?', c: ['곧바로 후보가 되어 선거를 연다', '기다림 막대(선거 타이머)를 다시 가득 채운다', '리더에게 표를 한 번 더 보낸다', '자기 로그를 모두 지우고 새로 받는다'], a: 1, why: '하트비트를 받으면 선거 타이머가 초기화되어 새 선거가 열리지 않습니다. 하트비트는 빈 AppendEntries입니다.', step: 2 },
    { q: '5대 중 리더 S3가 S4와 단둘이 끊겨 남았을 때, S3가 받은 새 쓰기는 어떻게 될까요?', c: ['과반수(3대)의 저장을 받지 못해 커밋되지 않는다', '2대가 저장했으니 커밋된다', '다수 쪽 리더에게 자동으로 전달돼 커밋된다', 'S3가 혼자 커밋해 두었다가 나중에 다수 쪽과 합친다'], a: 0, why: '커밋에는 과반수 저장이 필요하므로 소수 쪽은 아무것도 확정할 수 없습니다. 그래서 split-brain이 생기지 않습니다.', step: 5 },
    { q: '새로 당선된 리더가 항상 모든 커밋된 항목을 갖고 있다고 보장되는 이유는?', c: ['당선 직후 리더가 모든 노드의 로그를 모아 합치기 때문', '선거 타이머가 가장 먼저 끝난 노드가 항상 가장 최신 로그를 갖기 때문', 'term 번호가 가장 높은 노드가 늘 리더가 되기 때문', '투표자는 자기보다 로그가 뒤처진 후보를 거절하고, 어떤 두 과반수도 최소 한 대가 겹치기 때문'], a: 3, why: '커밋된 항목은 과반수에 있고 당선에도 과반수 표가 필요하므로, 겹치는 한 대가 뒤처진 후보를 거절합니다(Leader Completeness).', step: 4 },
  ],
  setup(a) {
    LOG = [[], [], [], [], []];
    a.text(620, 28, 'term 0', { id: 'term', size: 16, weight: 800, layer: 'edge', mono: true, color: 'violet' });
    POS.forEach(([x, y], i) => {
      a.node(ID[i], x, y, { label: `S${i + 1}`, sub: 'Follower', color: 'gray', w: 96, h: 50 });
      a.bar('tm' + i, x - 40, y - 50, 80, { color: 'teal', value: [0.45, 0.8, 0.65, 0.9, 0.7][i] });
    });
    a.text(506, 412, '로그', { size: 12, weight: 700, cls: 'muted', layer: 'edge' });
    a.packet('미확정', { at: [568, 412], color: 'gray', h: 22, round: 5, size: 11, layer: 'edge' });
    a.packet('커밋됨', { at: [652, 412], color: 'green', h: 22, round: 5, size: 11, layer: 'edge' });
    a.node('cli', 622, 96, { label: '클라이언트', icon: '💻', color: 'blue', w: 120, h: 58, hidden: true });
  },
  steps: [
    {
      t: '처음엔 모두 팔로워 — 각자 선거 타이머',
      easy: '서버 5대가 있고 아직 반장(리더)이 없습니다. 모두 "반장 소식 오기를 기다리는" 팔로워이고, 각자 기다리는 시간(막대)이 조금씩 다릅니다. 가장 먼저 막대가 바닥난 S1이 행동에 나섭니다.',
      deep: '선거 타임아웃은 노드마다 무작위(논문 예시 150~300ms)로 정해 여러 노드가 동시에 후보가 되는 split vote를 줄입니다. 팔로워는 리더의 AppendEntries나 후보의 RequestVote를 받으면 타이머를 다시 시작합니다.',
      async run(a) {
        a.caption('막대 = 리더 소식을 기다릴 남은 시간');
        await a.par(...[0, 1, 2, 3, 4].map((i) => bar(a, i).set(i === 0 ? 0 : bar(a, i).v - 0.42, 1600)));
        a.hl('s1', true, 'amber');
        a.note('n1', 612, 220, 'S1의 타이머가\n가장 먼저 끝남', { color: 'amber' });
        await a.wait(500);
      },
    },
    {
      t: '후보가 되어 표를 요청 (RequestVote)',
      easy: 'S1은 임기 번호(term)를 1로 올리고 스스로 후보가 되어 자기에게 한 표를 던진 뒤, 다른 서버들에게 "나 뽑아 줄래?"라고 묻습니다. 아직 아무에게도 투표하지 않은 서버들은 찬성합니다.',
      deep: '후보는 currentTerm을 증가시키고 자신에게 투표한 뒤 RequestVote(term, lastLogIndex, lastLogTerm)를 병렬로 보냅니다. 각 노드는 term당 한 표만 주며(선착순), 후보의 로그가 자기보다 최신이 아니면 거절합니다. 과반수를 얻으면 리더, 더 높은 term의 리더를 만나면 팔로워로 돌아가고, 시간 안에 결판이 안 나면 term을 올려 재선거합니다.',
      async run(a) {
        a.remove('n1');
        a.hl('s1', false);
        role(a, 0, 'c');
        setTerm(a, 1);
        let votes = 1;
        a.badge('s1', '표 1/5', 'amber');
        await fanout(a, 0, [1, 2, 3, 4], '투표? t1', 'amber', (i) => bar(a, i).set(1, 200));
        await a.par(...[1, 4, 2, 3].map((i, k) => a.wait(k * 220).then(() => a.send(ID[i], 's1', '찬성', { color: 'green', dur: 600 })).then(() => {
          votes++;
          a.badge('s1', `표 ${votes}/5`, votes >= 3 ? 'green' : 'amber');
          if (votes === 3) a.caption('3표 — 과반수 달성!');
        })));
        a.note('n2', 612, 220, '과반수(3/5) 이상\n득표 → 당선', { color: 'green' });
        await a.wait(500);
      },
    },
    {
      t: '리더 선출 — 하트비트로 자리 지키기',
      easy: 'S1이 리더가 되었습니다. 리더는 짧은 간격으로 "나 아직 살아 있어"라는 신호(하트비트)를 보내고, 이 신호를 받은 서버들은 기다림 막대를 다시 가득 채웁니다. 그래서 다른 선거가 열리지 않습니다.',
      deep: '리더는 빈 AppendEntries를 선거 타임아웃보다 충분히 짧은 주기로 보내 팔로워의 타이머를 계속 초기화합니다. 안정성 조건: broadcastTime ≪ electionTimeout ≪ MTBF (예: 0.5~20ms ≪ 10~500ms ≪ 수개월).',
      async run(a) {
        a.remove('n2');
        role(a, 0, 'l');
        a.badge('s1', '리더 t1', 'green');
        bar(a, 0).set(1, 300);
        for (let r = 0; r < 2; r++) {
          await a.par(...[1, 2, 3, 4].map((i) => bar(a, i).set(0.55, 600)));
          await heartbeat(a, 0, [1, 2, 3, 4]);
        }
        a.note('n3', 612, 220, '하트비트를 받으면\n타이머 초기화', { color: 'green' });
        await a.wait(400);
      },
    },
    {
      t: '쓰기 — 로그 추가, 과반수 저장 후 커밋',
      easy: '클라이언트가 "x=5로 바꿔 줘"라고 리더에게 보냅니다. 리더는 회의록에 적고(회색=아직 미확정) 모두에게 복사를 보냅니다. 자신을 포함해 3대가 저장했다고 답하면 확정(초록)하고 클라이언트에게 "완료"라고 답합니다.',
      deep: '리더는 항목을 로그 끝에 추가하고 AppendEntries(prevLogIndex, prevLogTerm, entries, leaderCommit)를 보냅니다. 과반수의 matchIndex가 그 인덱스에 도달하면 commitIndex를 올리고 상태 머신에 적용(apply)한 뒤 응답합니다. 팔로워는 다음 AppendEntries의 leaderCommit을 보고 자기 쪽도 커밋합니다. 느린 S3·S4를 기다리지 않는 것이 핵심입니다.',
      async run(a) {
        a.remove('n3');
        await a.show('cli');
        await a.send('cli', 's1', 'x=5', { color: 'blue', dur: 650 });
        putLog(a, 0, 0, 'x=5');
        await a.wait(250);
        await fanout(a, 0, [1, 2, 3, 4], 'x=5 복제', 'violet', (i) => { putLog(a, i, 0, 'x=5'); bar(a, i).set(1, 150); });
        let acks = 1;
        a.badge('s1', '저장 1/5', 'amber');
        await a.par(...[1, 4].map((i, k) => a.wait(k * 200).then(() => a.send(ID[i], 's1', '저장함', { color: 'teal', dur: 550 })).then(() => {
          acks++;
          a.badge('s1', `저장 ${acks}/5`, acks >= 3 ? 'green' : 'amber');
        })));
        commitLog(a, 0, 0);
        a.caption('3/5 저장 → 커밋! 상태 머신에 x=5 적용');
        const late = a.par(...[2, 3].map((i) => a.send(ID[i], 's1', '저장함', { color: 'teal', dur: 900 })));
        await a.send('s1', 'cli', '완료', { color: 'green', dur: 600 });
        await late;
        a.badge('s1', '리더 t1', 'green');
        await fanout(a, 0, [1, 2, 3, 4], '커밋 ♥', 'green', (i) => commitLog(a, i, 0), 600);
        a.note('n4', 612, 260, '과반수에 저장된\n항목만 커밋', { color: 'green' });
        await a.wait(400);
      },
    },
    {
      t: '리더가 죽으면 — term 2 새 선거',
      easy: '리더 S1이 갑자기 꺼졌습니다. 하트비트가 끊기자 막대가 줄어들고, 가장 먼저 바닥난 S3가 term 2 후보로 나섭니다. S1 없이도 4대 중 3표 이상을 얻으면 새 리더가 됩니다.',
      deep: '새 리더는 반드시 과반수의 표를 받아야 하고, 투표자는 자기보다 로그가 뒤처진 후보를 거절합니다. 커밋된 항목은 과반수에 있으므로 어떤 과반수와도 최소 한 대가 겹쳐, 당선된 리더는 항상 모든 커밋된 항목을 갖습니다(Leader Completeness). 장애 감지에서 새 리더까지 보통 타임아웃 한두 번이면 끝납니다.',
      async run(a) {
        a.remove('n4');
        role(a, 0, 'x');
        a.badge('s1', null);
        a.hl('s1', true, 'red');
        await a.flash('s1');
        await a.par(a.fade('s1', 0.4, 300), bar(a, 0).set(0, 300));
        a.hl('s1', false);
        await a.par(...[1, 2, 3, 4].map((i) => bar(a, i).set(i === 2 ? 0 : [0, 0.35, 0, 0.5, 0.25][i], 1300)));
        role(a, 2, 'c');
        setTerm(a, 2);
        let votes = 1;
        a.badge('s3', '표 1/5', 'amber');
        await fanout(a, 2, [1, 3, 4], '투표? t2', 'amber', (i) => bar(a, i).set(1, 200));
        await a.par(...[3, 1, 4].map((i, k) => a.wait(k * 200).then(() => a.send(ID[i], 's3', '찬성', { color: 'green', dur: 550 })).then(() => {
          votes++;
          a.badge('s3', `표 ${votes}/5`, votes >= 3 ? 'green' : 'amber');
        })));
        role(a, 2, 'l');
        a.badge('s3', '리더 t2', 'green');
        bar(a, 2).set(1, 300);
        await heartbeat(a, 2, [1, 3, 4]);
        a.note('n5', 612, 260, 'S1 없이도\n4대 중 과반수 득표', { color: 'green' });
        await a.wait(400);
      },
    },
    {
      t: '네트워크 분할 — 소수 쪽은 커밋 못 함',
      easy: 'S1이 다시 켜져 팔로워로 합류했는데, 이번엔 네트워크가 둘로 끊겼습니다. 리더 S3는 S4와 단둘이 남았습니다. 새 쓰기 y=7을 받아도 2대만 저장할 수 있어 과반수(3)가 안 되므로 영원히 확정되지 않습니다.',
      deep: '분할된 소수 쪽 리더는 자신이 여전히 리더라고 믿지만 과반수 ack를 받지 못해 commitIndex를 올릴 수 없고, 클라이언트 요청은 타임아웃됩니다. 이 덕분에 양쪽이 서로 다른 값을 확정하는 split-brain이 생기지 않습니다. 오래된 리더가 읽기를 잘못 응답하지 않도록 ReadIndex나 리스(lease) 기법을 씁니다.',
      async run(a) {
        a.remove('n5');
        await a.fade('s1', 1, 300);
        role(a, 0, 'f');
        await heartbeat(a, 2, [0, 1, 3, 4]);
        a.edge([108, CUT_Y], [492, CUT_Y], { id: 'cut', dashed: true, arrow: false, color: 'red', hidden: true });
        a.text(502, CUT_Y - 12, '다수 쪽 (3대)', { id: 'tMaj', size: 12, weight: 700, color: 'green', anchor: 'start', layer: 'edge' });
        a.text(502, CUT_Y + 12, '소수 쪽 (2대)', { id: 'tMin', size: 12, weight: 700, color: 'red', anchor: 'start', layer: 'edge' });
        await a.show('cut', 400);
        a.caption('네트워크가 끊겼습니다!');
        await a.send('cli', 's3', 'y=7', { color: 'blue', dur: 700 });
        putLog(a, 2, 1, 'y=7');
        await a.par(
          a.send('s3', 's4', 'y=7 복제', { color: 'violet', dur: 600 }).then(() => putLog(a, 3, 1, 'y=7')),
          blocked(a, 2, 0, 'y=7'), blocked(a, 2, 1, 'y=7'), blocked(a, 2, 4, 'y=7'),
        );
        await a.send('s4', 's3', '저장함', { color: 'teal', dur: 500 });
        a.badge('s3', '저장 2/5', 'red');
        a.note('n6', 612, 336, '2/5 → 과반수 아님\ny=7 커밋 불가', { color: 'red' });
        await a.wait(500);
      },
    },
    {
      t: '다수 쪽은 새 리더로 계속',
      easy: '끊긴 건너편 3대는 리더 소식이 끊기자 선거를 엽니다. S2가 term 3 리더가 되고, 3대가 과반수이므로 새 쓰기 z=9를 정상적으로 확정할 수 있습니다.',
      deep: '다수 쪽은 정상 선거로 더 높은 term(3)의 리더를 뽑고 계속 서비스합니다. 같은 순간 리더가 둘(S3: term 2, S2: term 3)처럼 보이지만, 커밋할 수 있는 것은 과반수를 가진 쪽뿐이라 안전합니다. 이것이 CAP에서 Raft가 분할 시 일관성(C)을 택하고 소수 쪽 가용성(A)을 포기하는 모습입니다.',
      async run(a) {
        a.remove('n6');
        await a.par(...[0, 1, 4].map((i) => bar(a, i).set(i === 1 ? 0 : 0.3, 1200)));
        role(a, 1, 'c');
        setTerm(a, 3);
        a.badge('s2', '표 1/5', 'amber');
        await fanout(a, 1, [0, 4], '투표? t3', 'amber', (i) => bar(a, i).set(1, 200));
        let votes = 1;
        await a.par(...[0, 4].map((i, k) => a.wait(k * 200).then(() => a.send(ID[i], 's2', '찬성', { color: 'green', dur: 550 })).then(() => {
          votes++;
          a.badge('s2', `표 ${votes}/5`, votes >= 3 ? 'green' : 'amber');
        })));
        role(a, 1, 'l');
        a.badge('s2', '리더 t3', 'green');
        bar(a, 1).set(1, 300);
        await a.send('cli', 's2', 'z=9', { color: 'blue', dur: 600 });
        putLog(a, 1, 1, 'z=9');
        await fanout(a, 1, [0, 4], 'z=9 복제', 'violet', (i) => putLog(a, i, 1, 'z=9'), 600);
        await a.par(...[0, 4].map((i) => a.send(ID[i], 's2', '저장함', { color: 'teal', dur: 500 })));
        [1, 0, 4].forEach((i) => commitLog(a, i, 1));
        await a.send('s2', 'cli', '완료', { color: 'green', dur: 550 });
        a.note('n7', 612, 220, '3/5 → z=9 커밋', { color: 'green' });
        await a.wait(400);
      },
    },
    {
      t: '분할 회복 — 낮은 term은 물러난다',
      easy: '네트워크가 다시 이어지면, S3는 자기보다 높은 term 3의 리더가 있다는 걸 알고 곧장 팔로워로 내려옵니다. 확정되지 못했던 y=7은 지워지고, 확정된 z=9로 맞춰집니다. 다섯 대의 회의록이 다시 똑같아졌습니다.',
      deep: '더 높은 term이 담긴 메시지를 받은 노드는 즉시 term을 갱신하고 팔로워가 됩니다. 리더의 AppendEntries는 prevLogIndex/prevLogTerm 일관성 검사로 어긋난 지점을 찾고, 팔로워의 충돌하는 미커밋 항목을 잘라 리더 로그로 덮어씁니다. 커밋된 항목은 절대 덮어써지지 않습니다(Log Matching, State Machine Safety).',
      async run(a) {
        a.remove('n7');
        await a.par(a.fadeOut('cut', 400), a.fadeOut('tMaj', 400), a.fadeOut('tMin', 400));
        await fanout(a, 1, [2, 3], '♥ t3', 'green', (i) => bar(a, i).set(1, 200), 650);
        role(a, 2, 'f');
        a.badge('s3', null);
        a.hl('s3', true, 'amber');
        a.caption('term 3 > 2 → S3는 리더에서 물러남');
        await a.flash('s3');
        a.hl('s3', false);
        for (const i of [2, 3]) a.get(`lg${i}_1`).set('y=7 ✕', 'red');
        await a.wait(500);
        await fanout(a, 1, [2, 3], 'z=9 복제', 'violet', (i) => putLog(a, i, 1, 'z=9', true), 650);
        a.note('n8', 612, 220, '5대 로그 일치\nx=5, z=9', { color: 'green' });
        await a.wait(500);
      },
    },
  ],
};

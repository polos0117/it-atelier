// 메시지 큐: 동기 호출 체인의 문제 → 큐에 넣고 바로 응답 → 경쟁 소비 → ACK·재전달 → 완충 → 멱등·DLQ → 발행/구독
// 단계마다 무대를 새로 그린다. 메시지 번호·시간은 설명용 예시 값(고정)이다.
const UX = 60, PX = 190, QL = 258, QR = 506, QY = 222, CY = 232;
const WX = 632, WY3 = [110, 222, 334];
const SLOT = (i) => 482 - i * 40; // 0 = 맨 앞(워커 쪽), 왼쪽으로 갈수록 뒤
const MAXS = 6; // 큐 안에 보이는 칸 수

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }

function chip(a, label, x, y, color = 'violet') {
  return a.packet(label, { at: [x, y], color, w: 40, h: 24, size: 11 });
}

/** 주문 서버 → 큐 → 워커 기본 배치 */
function base(a, wy = WY3, o = {}) {
  wipe(a);
  a.node('u', UX, QY, { label: o.user || '사용자', icon: o.uicon || '🙂', color: 'blue', w: 88, h: 58 });
  a.node('p', PX, QY, { label: '주문 서버', icon: '🛒', color: 'amber', w: 104, h: 64 });
  a.zone('qz', QL, QY - 34, QR - QL, 68, { label: '메시지 큐', color: 'violet' });
  a.text(QR - 10, QY - 20, '', { id: 'qmore', size: 11, anchor: 'end', weight: 700, cls: 'muted' });
  a.edge('u', 'p', { both: true });
  a.edge('p', [QL - 2, QY]);
  wy.forEach((y, i) => {
    a.node('w' + i, WX, y, { label: `워커 ${i + 1}`, sub: '대기', icon: '⚙️', color: 'green', w: 124, h: 64 });
    a.edge([QR + 2, QY], 'w' + i);
  });
}

/** 큐 모형: 목록(list)이 바뀌면 render()가 칩을 제자리로 옮긴다 */
function makeQ(a) {
  const q = { list: [], chips: new Map(), bg: [], inflight: 0, n: 0 };
  q.fire = (p) => { p.catch(() => {}); q.bg.push(p); return p; };
  q.push = (label, c, color = 'violet') => {
    const m = { id: ++q.n, label, color, dim: false };
    q.list.push(m);
    if (c) q.chips.set(m.id, c);
    return m;
  };
  q.render = (dur = 260) => {
    const live = new Set(q.list.map((m) => m.id));
    for (const [id, c] of q.chips) if (!live.has(id)) { a.remove(c); q.chips.delete(id); }
    q.list.forEach((m, i) => {
      const x = SLOT(Math.min(i, MAXS - 1));
      let c = q.chips.get(m.id);
      if (!c) { c = chip(a, m.label, x, CY, m.color); q.chips.set(m.id, c); }
      c.g.style.opacity = i < MAXS ? (m.dim ? 0.3 : 1) : 0;
      q.fire(a.move(c, [x, CY], dur));
    });
    const more = a.get('qmore');
    if (more) more.textContent = q.list.length > MAXS ? `+${q.list.length - MAXS}개 더` : '';
  };
  /** 맨 앞(또는 m) 메시지를 목록에서 빼고 그 칩을 돌려준다 */
  q.take = (m = q.list[0]) => {
    q.list.splice(q.list.indexOf(m), 1);
    const c = q.chips.get(m.id);
    q.chips.delete(m.id);
    return { m, c };
  };
  q.tailX = () => SLOT(Math.min(q.list.length + q.inflight, MAXS - 1));
  q.done = () => Promise.all(q.bg);
  return q;
}

/** 시간표 재생: 하나의 선형 tween 위에서 사건을 시간 순서대로 실행(프레임 속도와 무관하게 순서 고정) */
function timeline(a, total, events) {
  const ev = [...events].sort((x, y) => x.t - y.t);
  let i = 0;
  return a.tween(total, (k) => {
    const now = k * total;
    while (i < ev.length && ev[i].t <= now) ev[i++].fn();
  }, { linear: true });
}

function clock(a, id, from, to, dur) {
  return a.tween(dur, (k) => a.setText(id, `${(from + (to - from) * k).toFixed(1)}초`));
}

export default {
  id: 'mq',
  level: 3,
  cat: '서버·인프라',
  title: '메시지 큐 — 바쁠 땐 줄 세워 두기',
  sub: '일을 바로 처리하지 않고 줄(큐)에 넣어 두면, 빠르게 응답하고 몰려도 버티며 고장에도 일을 잃지 않는다',
  factory: 'mq',
  analogy: '식당의 주문서 꽂이와 같습니다. 카운터 직원이 요리까지 직접 하면 손님 줄이 끝없이 길어지죠. 대신 주문서를 꽂이(큐)에 꽂고 바로 다음 손님을 받으면, 주방의 요리사들(워커)이 주문서를 하나씩 빼 가서 자기 속도로 요리합니다.',
  keys: [
    '동기 호출로 여러 서비스를 차례로 부르면 응답 시간이 모두 더해지고, 하나만 고장 나도 요청 전체가 실패한다.',
    '메시지 큐를 두면 생산자는 메시지를 넣고 바로 응답하고, 소비자(워커)가 자기 속도로 꺼내 처리한다(비동기·느슨한 결합).',
    '여러 워커가 한 큐를 나눠 읽으면 메시지 하나는 워커 하나만 처리한다(경쟁 소비). 워커를 늘리면 처리량이 늘고, 몰릴 때는 큐가 쌓여 완충한다.',
    '워커는 처리를 마친 뒤 ACK를 보내고, ACK가 없으면 큐가 다시 전달한다. 그래서 같은 메시지가 두 번 올 수 있어 소비자를 멱등하게 만들고, 계속 실패하는 메시지는 DLQ로 뺀다.',
    '발행/구독(Pub/Sub)은 한 이벤트를 구독한 여러 서비스가 각자 받는 방식이다. Kafka는 토픽을 파티션으로 나누고 소비자 그룹마다 오프셋을 따로 관리한다.',
  ],
  terms: [
    ['생산자 / 소비자', '메시지를 큐에 넣는 쪽 / 꺼내서 처리하는 쪽(워커)'],
    ['비동기 처리', '일을 맡겨 두고, 끝날 때까지 기다리지 않고 다음 일을 하는 방식'],
    ['ACK', '"처리 끝났어요"라는 확인. 큐는 ACK를 받아야 메시지를 지운다'],
    ['적어도 한 번 전달', '메시지가 사라지지 않는 대신 중복될 수 있는 전달 보장(at-least-once)'],
    ['멱등성', '같은 요청을 여러 번 처리해도 결과가 한 번 처리한 것과 같은 성질'],
    ['DLQ', 'Dead Letter Queue. 여러 번 실패한 메시지를 따로 모아 두는 큐'],
    ['발행/구독', '토픽에 올린 이벤트를 구독한 모든 서비스가 각자 한 부씩 받는 방식(Pub/Sub)'],
  ],
  quiz: [
    { q: '메시지 큐를 쓰면 주문 서버가 사용자에게 훨씬 빨리 응답할 수 있는 이유는?', c: ['큐가 메일 서버보다 계산을 더 빨리 해 줘서', '메일·영수증 같은 일은 아예 하지 않기로 해서', '사용자의 인터넷 속도가 빨라져서', '메일·영수증 같은 일을 큐에 맡기고, 끝나기를 기다리지 않아서'], a: 3, why: '주문 서버는 메시지를 큐에 넣기만 하고 바로 "접수됐어요"라고 답합니다. 실제 일은 워커가 나중에 처리합니다(비동기).', step: 1 },
    { q: '워커가 메시지를 꺼내 처리하던 중, ACK를 보내기 전에 죽으면 어떻게 될까요?', c: ['이미 꺼낸 메시지라서 영영 사라진다', '큐가 주문 서버에 메시지를 다시 만들어 달라고 요청한다', '정해진 시간 안에 ACK가 없으니 큐가 그 메시지를 다시 전달한다', '다른 워커들도 모두 멈추고 그 워커가 살아나기를 기다린다'], a: 2, why: '큐는 ACK를 받기 전까지 메시지를 지우지 않습니다. 시간 초과(또는 연결 끊김)가 되면 다시 보이게 해서 다른 워커가 처리합니다.', step: 3 },
    { q: 'at-least-once로 전달되는 큐에서 "결제 완료" 메시지를 처리할 때 가장 알맞은 대책은?', c: ['처리를 시작하기 전에 ACK부터 보내 중복을 막는다', '주문번호 같은 고유 키로 처리 여부를 기록해, 이미 처리한 메시지는 건너뛴다', '워커를 하나만 두면 중복이 생기지 않는다', '실패한 메시지는 성공할 때까지 끝없이 재시도한다'], a: 1, why: 'ACK를 먼저 보내면 처리 중 장애 시 메시지를 잃고(at-most-once), 워커가 하나여도 재전달은 일어납니다. 고유 키로 멱등하게 만들고, 계속 실패하는 메시지는 DLQ로 뺍니다.', step: 5 },
  ],
  setup(a) {
    base(a);
  },
  steps: [
    {
      t: '직접 다 하면 — 느리고 같이 쓰러진다',
      easy: '주문이 들어오면 주문 서버가 메일 보내기, 영수증 만들기, 재고 줄이기를 하나씩 직접 부르고 답을 기다립니다. 다 끝나야 "완료"라고 알려 주니 느리고, 메일 서버 하나만 고장 나도 주문 전체가 실패해요.',
      deep: '동기(synchronous) 호출 체인에서는 응답 시간이 각 호출 시간의 합이 되고, 가용성은 곱해집니다: 99.9%짜리 서비스 세 개에 의존하면 약 99.7%. 느린 서비스 하나가 주문 서버의 스레드·커넥션을 붙잡아 장애가 번지기도 합니다(연쇄 장애). 타임아웃·서킷 브레이커로 완화할 수 있지만, 서비스끼리 강하게 묶여 있다는 근본 문제는 남습니다.',
      async run(a) {
        wipe(a);
        const SV = [['mail', '메일 서버', '📧', 100, '메일 발송', 0.8], ['rcpt', '영수증 서버', '🧾', 222, '영수증', 0.5], ['stock', '재고 서버', '📦', 344, '재고 차감', 0.6]];
        a.node('u', UX, QY, { label: '사용자', icon: '🙂', color: 'blue', w: 88, h: 58 });
        a.node('p', 220, QY, { label: '주문 서버', icon: '🛒', color: 'amber', w: 116, h: 64 });
        a.edge('u', 'p', { both: true });
        for (const [id, lab, ic, y] of SV) {
          a.node(id, 580, y, { label: lab, icon: ic, color: 'teal', w: 136, h: 60 });
          a.edge('p', id, { both: true });
        }
        a.text(220, 288, '응답까지', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(220, 310, '0.0초', { id: 'clk', size: 16, weight: 800, mono: true });
        a.caption('주문 서버가 모든 일을 직접 부르고, 끝날 때까지 기다려요');
        await a.send('u', 'p', '주문', { dur: 450 });
        a.setNode('p', { sub: '기다리는 중…' });
        let t = 0.1;
        for (const [id, , , , lab, sec] of SV) {
          await a.par(clock(a, 'clk', t, t + sec, 1010), (async () => {
            await a.send('p', id, lab, { color: 'amber', dur: 380 });
            a.hl(id);
            await a.wait(250);
            a.hl(id, false);
            await a.send(id, 'p', 'OK', { color: 'green', dur: 380 });
          })());
          t += sec;
        }
        a.setNode('p', { sub: '' });
        await a.send('p', 'u', '완료', { color: 'green', dur: 450 });
        a.note('n1', 360, 40, `응답 시간 = 모든 호출의 합 (${t.toFixed(1)}초)`, { color: 'amber' });
        await a.wait(500);
        // 메일 서버 고장
        a.caption('이번엔 메일 서버가 고장 났다면?');
        a.setNode('mail', { color: 'red', sub: '고장' });
        a.badge('mail', '✕', 'red');
        a.setText('clk', '0.0초');
        await a.send('u', 'p', '주문', { dur: 400 });
        a.setNode('p', { sub: '기다리는 중…' });
        const pk = a.packet('메일 발송', { at: 'p', color: 'amber' });
        await a.par(a.move(pk, 'mail', 380), clock(a, 'clk', 0.1, 3.0, 1100));
        pk.set('✕ 시간 초과', 'red');
        await a.fadeOut(pk, 300);
        a.setNode('p', { sub: '' });
        a.hl('p', true, 'red');
        await a.send('p', 'u', '주문 실패', { color: 'red', dur: 450 });
        a.note('n2', 360, 410, '메일 하나 때문에 주문 전체가 실패!', { color: 'red' });
        await a.wait(600);
      },
    },
    {
      t: '큐에 넣고 바로 응답 — 비동기 처리',
      easy: '주문 서버와 일꾼(워커) 사이에 "메시지 큐"라는 대기 줄을 둡니다. 주문 서버는 "메일 보내 줘" 같은 쪽지(메시지)를 줄에 넣기만 하고, 사용자에게 바로 "접수됐어요"라고 답해요. 실제 일은 워커가 줄에서 쪽지를 꺼내 나중에 처리합니다.',
      deep: '생산자는 브로커(RabbitMQ, Amazon SQS, Kafka 등)에 메시지를 보내고, 브로커가 디스크·복제로 안전하게 보관했다는 확인(publisher confirm)만 받으면 응답합니다. 메일 서버가 잠시 죽어 있어도 메시지는 큐에 남았다가 복구 후 처리되므로 시간적으로도 분리됩니다(temporal decoupling). 대신 사용자는 "접수됨"만 알게 되므로, 최종 결과는 알림·상태 조회로 따로 알려야 합니다(최종 일관성).',
      async run(a) {
        base(a, [222]);
        const q = makeQ(a);
        a.text(PX, 282, '응답까지', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(PX, 304, '–', { id: 'clk', size: 16, weight: 800, mono: true });
        a.caption('주문 서버는 쪽지를 큐에 넣고 바로 답해요');
        for (const lab of ['#101', '#102']) {
          await a.send('u', 'p', '주문', { dur: 400 });
          const c = chip(a, lab, PX + 40, CY);
          await a.par(a.move(c, [q.tailX(), CY], 450), a.send('p', 'u', '접수 ✓', { color: 'green', dur: 450 }));
          q.push(lab, c);
          q.render();
          a.setText('clk', '0.05초');
          a.get('clk').setAttribute('class', 'tx mono tc-green');
        }
        a.note('n1', 330, 62, '사용자는 메일이 갈 때까지 기다리지 않아요', { color: 'green' });
        // 워커가 꺼내 처리
        for (const [k, wt] of [[0, 700], [1, 500]]) {
          const { m, c } = q.take();
          q.render();
          await a.move(c, 'w0', 450);
          await a.fadeOut(c, 150);
          a.setNode('w0', { sub: `${m.label} 메일 발송` });
          a.hl('w0');
          await a.wait(wt);
          a.hl('w0', false);
          a.setNode('w0', { sub: `${m.label} 완료 ✓` });
          if (!k) await a.wait(200);
        }
        a.note('n2', 360, 410, '일은 워커가 나중에 — 생산자와 소비자가 분리돼요', { color: 'violet' });
        await q.done();
        await a.wait(500);
      },
    },
    {
      t: '워커 여럿이 나눠서 — 경쟁 소비',
      easy: '워커를 여러 명 두면 줄에서 쪽지를 하나씩 나눠 가져가 동시에 처리합니다. 쪽지 하나는 워커 한 명만 가져가서 같은 일을 두 번 하지 않아요. 일이 많아지면 워커만 더 늘리면 됩니다.',
      deep: '경쟁 소비자(competing consumers) 패턴입니다. 브로커는 한 메시지를 한 소비자에게만 배달하고, RabbitMQ는 prefetch(basic.qos)로 워커당 미확인 메시지 수를 제한해 느린 워커에 일이 몰리지 않게 합니다. 큐 길이에 맞춰 워커 수를 자동으로 늘리고 줄이기도 합니다(KEDA 등). 여러 워커가 병렬로 처리하므로 전체 처리 순서는 보장되지 않습니다.',
      async run(a) {
        base(a);
        const q = makeQ(a);
        const ev = [];
        const done = [0, 0, 0];
        a.caption('주문 6건이 들어와요');
        ['#101', '#102', '#103', '#104', '#105', '#106'].forEach((lab, i) => {
          let fly;
          ev.push({ t: i * 220, fn: () => { fly = chip(a, lab, PX + 40, CY); q.fire(a.move(fly, [q.tailX(), CY], 450)); q.inflight++; } });
          ev.push({ t: i * 220 + 450, fn: () => { q.inflight--; q.push(lab, fly); q.render(); } });
        });
        [[0, 1700], [1, 1900], [2, 2100], [0, 2900], [1, 3100], [2, 3300]].forEach(([w, t]) => {
          let m;
          ev.push({ t, fn: () => {
            const r = q.take();
            m = r.m;
            q.render();
            q.fire(a.move(r.c, 'w' + w, 400).then(() => a.fadeOut(r.c, 150)));
            a.setNode('w' + w, { sub: `${m.label} 처리 중` });
            a.hl('w' + w);
          } });
          ev.push({ t: t + 1000, fn: () => {
            a.hl('w' + w, false);
            done[w]++;
            a.setNode('w' + w, { sub: `${m.label} 완료 ✓` });
            a.badge('w' + w, `${done[w]}건`, 'green');
          } });
        });
        ev.push({ t: 1600, fn: () => a.caption('워커 셋이 하나씩 나눠 가져가요') });
        await timeline(a, 4400, ev);
        await q.done();
        a.note('n1', 360, 410, '쪽지 하나는 워커 한 명만 · 워커를 늘리면 처리량 ↑', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: 'ACK와 재전달 — 일을 잃어버리지 않기',
      easy: '큐는 쪽지를 건네준 즉시 지우지 않고, 워커가 "다 했어요(ACK)"라고 알려 줄 때 비로소 지웁니다. 일하던 워커가 갑자기 죽어 ACK가 오지 않으면, 큐는 잠시 기다렸다가 그 쪽지를 다른 워커에게 다시 줘요.',
      deep: 'SQS는 메시지를 가져간 소비자에게만 일정 시간(visibility timeout, 기본 30초) 숨겨 두고, 그 안에 DeleteMessage(ACK)가 없으면 다시 보이게 합니다. RabbitMQ는 소비자의 채널이 끊기면 미확인(unacked) 메시지를 다시 큐에 넣습니다. ACK를 처리 "후"에 보내므로 유실은 막지만, 처리를 끝내고 ACK 직전에 죽으면 같은 일이 두 번 실행됩니다 — 이것이 at-least-once 전달입니다.',
      async run(a) {
        base(a);
        const q = makeQ(a);
        const m7 = q.push('#107');
        const m8 = q.push('#108');
        q.render(0);
        async function give(m, w) {
          m.dim = true;
          q.render(150);
          const cp = chip(a, m.label, SLOT(q.list.indexOf(m)), CY, m.color);
          await a.move(cp, w, 450);
          await a.fadeOut(cp, 150);
          a.setNode(w, { sub: `${m.label} 처리 중` });
          a.hl(w);
        }
        async function ack(m, w) {
          a.hl(w, false);
          a.setNode(w, { sub: `${m.label} 완료 ✓` });
          await a.send(w, [QR - 4, CY], 'ACK', { color: 'green', dur: 450 });
          const { c } = q.take(m);
          q.render();
          await a.fadeOut(c, 200);
        }
        a.caption('건네준 쪽지는 흐리게 남겨 둬요 (아직 안 지움)');
        await give(m7, 'w0');
        await a.wait(600);
        await ack(m7, 'w0');
        a.caption('ACK를 받고 나서야 지워요');
        await a.wait(300);
        await give(m8, 'w1');
        await a.wait(400);
        a.hl('w1', true, 'red');
        a.setNode('w1', { color: 'red', sub: '다운!' });
        a.badge('w1', '✕', 'red');
        await a.flash('w1');
        a.caption('ACK가 오지 않아요…');
        a.text(382, 306, '#108 ACK 기다리는 중', { id: 'tl', size: 11.5, weight: 700, color: 'amber' });
        const b = a.bar('tb', 302, 284, 160, { color: 'amber' });
        await b.set(1, 1300);
        a.setText('tl', '시간 초과 → 다시 전달!');
        m8.dim = false;
        q.chips.get(m8.id).set(null, 'amber');
        m8.color = 'amber';
        q.render(150);
        await a.wait(300);
        await give(m8, 'w2');
        await a.wait(500);
        await ack(m8, 'w2');
        a.remove('tl');
        a.remove('tb');
        a.note('n1', 360, 410, 'ACK 전에는 지우지 않아요 → 워커가 죽어도 일은 그대로', { color: 'green' });
        await q.done();
        await a.wait(500);
      },
    },
    {
      t: '주문 폭주 — 큐가 완충한다',
      easy: '세일이 시작되어 주문이 한꺼번에 몰려와도 워커는 자기 속도대로 일합니다. 미처 처리하지 못한 쪽지는 큐에 차곡차곡 쌓였다가(완충), 주문이 잦아들면 줄어들어요. 덕분에 워커가 과부하로 쓰러지지 않습니다.',
      deep: '큐는 유입 속도와 처리 속도의 차이를 흡수하는 버퍼입니다(부하 평준화, load leveling). 다만 평균 처리량이 평균 유입량보다 작으면 큐는 끝없이 자라므로, 큐 길이와 가장 오래된 메시지의 나이(lag)를 지켜보며 워커를 늘리거나, 최대 길이·TTL을 두고 생산자 쪽에 속도 제한(백프레셔)을 걸어야 합니다.',
      async run(a) {
        base(a, WY3, { user: '손님들', uicon: '👥' });
        const q = makeQ(a);
        a.text(QL, 160, '큐 길이', { size: 12, anchor: 'start', weight: 700, cls: 'muted' });
        const gb = a.bar('qb', QL + 54, 160, 150, { color: 'violet' });
        a.text(QR, 160, '0개', { id: 'qn', size: 13, anchor: 'end', weight: 800, mono: true });
        const gauge = () => {
          const n = q.list.length;
          q.fire(gb.set(n / 7, 150));
          a.setText('qn', `${n}개`);
          a.get('qn').setAttribute('class', `tx mono tc-${n >= 5 ? 'red' : n >= 3 ? 'amber' : 'green'}`);
        };
        a.note('n0', 330, 62, '세일 시작! 들어오는 속도 > 처리 속도', { color: 'red' });
        const ev = [];
        for (let i = 0; i < 12; i++) {
          const lab = '#' + (201 + i);
          let fly;
          ev.push({ t: i * 200, fn: () => { fly = chip(a, lab, PX + 40, CY); q.fire(a.move(fly, [q.tailX(), CY], 450)); q.inflight++; } });
          ev.push({ t: i * 200 + 450, fn: () => { q.inflight--; q.push(lab, fly); q.render(200); gauge(); } });
        }
        [600, 900, 1200, 1800, 2100, 2400, 3000, 3300, 3600, 4200, 4500, 4800].forEach((t, k) => {
          const w = 'w' + (k % 3);
          ev.push({ t, fn: () => {
            if (!q.list.length) return;
            const r = q.take();
            q.render(200);
            gauge();
            q.fire(a.move(r.c, w, 380).then(() => a.fadeOut(r.c, 120)));
            a.setNode(w, { sub: `${r.m.label} 처리 중` });
            a.hl(w);
          } });
          ev.push({ t: t + 1000, fn: () => { a.hl(w, false); a.setNode(w, { sub: '대기' }); } });
        });
        ev.push({ t: 3000, fn: () => a.caption('주문이 멈추자 큐가 천천히 줄어요') });
        await timeline(a, 5900, ev);
        await q.done();
        a.note('n1', 360, 410, '몰릴 땐 큐에 쌓아 두고 → 워커는 제 속도로 비워요', { color: 'violet' });
        await a.wait(600);
      },
    },
    {
      t: '두 번 와도 괜찮게 — 멱등 처리와 DLQ',
      easy: '다시 전달하는 방식 때문에 같은 쪽지가 두 번 올 수도 있어요. 그래서 워커는 주문번호로 "이미 처리했나?"를 확인하고, 했으면 건너뜁니다(멱등 처리). 몇 번을 해도 계속 실패하는 쪽지는 "실패 보관함(DLQ)"으로 옮겨 사람이 살펴봐요.',
      deep: '정확히 한 번(exactly-once) 전달은 분산 환경에서 일반적으로 보장하기 어려워, 실무에서는 at-least-once + 멱등 소비자로 "효과상 한 번"을 만듭니다. 처리 기록 테이블의 메시지 ID에 UNIQUE 제약을 걸고, 비즈니스 처리와 기록을 같은 DB 트랜잭션으로 묶는 방식이 흔합니다. 최대 수신 횟수(SQS maxReceiveCount)를 넘긴 독 메시지(poison message)는 DLQ로 옮겨 뒤의 메시지가 막히지 않게 하고, 원인을 고친 뒤 다시 넣습니다(redrive).',
      async run(a) {
        base(a, [222]);
        const q = makeQ(a);
        a.node('db', WX, 356, { label: '처리 기록', sub: '#107 · #108', color: 'teal', shape: 'db', w: 124, h: 62 });
        a.edge('w0', 'db', { both: true, dashed: true });
        a.node('dlq', 382, 358, { label: 'DLQ', sub: '실패 보관함', color: 'red', shape: 'db', w: 128, h: 62 });
        a.edge([382, QY + 36], 'dlq', { dashed: true, color: 'red' });
        a.text(SLOT(0), 168, '', { id: 'rt', size: 11.5, weight: 800, color: 'red' });
        // 중복 메시지
        const m8 = q.push('#108', null, 'amber');
        q.render(0);
        a.note('n1', 330, 62, 'ACK가 유실되어 #108이 한 번 더 왔어요', { color: 'amber' });
        const { c: c8 } = q.take(m8);
        await a.move(c8, 'w0', 450);
        await a.fadeOut(c8, 150);
        a.setNode('w0', { sub: '#108 확인 중' });
        await a.send('w0', 'db', '#108?', { color: 'teal', dur: 400 });
        a.hl('db');
        await a.wait(250);
        a.hl('db', false);
        await a.send('db', 'w0', '이미 처리', { color: 'amber', dur: 400 });
        a.setNode('w0', { sub: '건너뜀 ✓' });
        await a.send('w0', [QR - 4, CY], 'ACK', { color: 'green', dur: 400 });
        a.remove('n1');
        a.note('n2', 330, 62, '주문번호로 확인 → 두 번 처리하지 않아요 (멱등)', { color: 'green' });
        await a.wait(700);
        // 독 메시지 → DLQ
        a.remove('n2');
        a.note('n3', 330, 62, '#109는 내용이 잘못돼 계속 실패해요', { color: 'red' });
        a.setNode('w0', { sub: '대기' });
        const c9 = chip(a, '#109', PX + 40, CY, 'red');
        await a.move(c9, [SLOT(0), CY], 450);
        const m9 = q.push('#109', c9, 'red');
        for (let r = 1; r <= 3; r++) {
          m9.dim = true;
          q.render(100);
          const cp = chip(a, '#109', SLOT(0), CY, 'red');
          await a.move(cp, 'w0', 380);
          a.setNode('w0', { sub: '#109 처리 중' });
          await a.wait(200);
          a.hl('w0', true, 'red');
          a.setNode('w0', { sub: '실패 ✕' });
          cp.set('✕', 'red');
          await a.fadeOut(cp, 200);
          m9.dim = false;
          q.render(100);
          a.setText('rt', `실패 ${r}/3`);
          a.hl('w0', false);
          await a.wait(200);
        }
        a.caption('3번 실패 → DLQ로 옮겨요');
        const { c } = q.take(m9);
        q.render();
        await a.move(c, 'dlq', 600);
        await a.fadeOut(c, 150);
        a.setText('rt', '');
        a.setNode('dlq', { sub: '#109 보관' });
        a.setNode('w0', { sub: '대기' });
        await a.flash('dlq');
        a.remove('n3');
        a.note('n4', 330, 62, '계속 실패 → DLQ로 빼서 뒤의 메시지가 막히지 않게', { color: 'red' });
        await q.done();
        await a.wait(500);
      },
    },
    {
      t: '발행/구독 — 한 소식을 모두에게',
      easy: '"주문 완료" 같은 소식 하나를 메일·영수증·재고 서비스가 모두 알아야 할 때는 발행/구독을 씁니다. 주문 서버는 "주문 완료" 게시판(토픽)에 한 번만 올리고, 구독한 서비스들이 각자 한 부씩 받아요. 새 서비스가 생겨도 구독만 추가하면 됩니다.',
      deep: 'RabbitMQ는 fanout 익스체인지가 구독자마다 별도 큐에 복사해 주고, Kafka는 이벤트를 토픽의 로그 끝에 덧붙이기만 하고 읽어도 지우지 않습니다. 토픽은 파티션으로 나뉘어 병렬 처리되고, 순서는 같은 파티션(같은 키, 예: 주문번호) 안에서만 보장됩니다. 소비자 그룹마다 읽은 위치(오프셋)를 따로 저장하므로 그룹 안에서는 파티션을 나눠 갖고(경쟁 소비), 그룹끼리는 같은 이벤트를 각자 받습니다. 보존 기간 동안은 오프셋을 되돌려 다시 읽을 수도 있습니다.',
      async run(a) {
        wipe(a);
        const SUB = [['s0', '메일', '📧', 76], ['s1', '영수증', '🧾', 176], ['s2', '재고', '📦', 276], ['s3', '포인트', '🎁', 376]];
        a.node('p', 100, 226, { label: '주문 서버', icon: '🛒', color: 'amber', w: 112, h: 64 });
        a.node('topic', 310, 226, { label: '토픽', sub: '주문완료', icon: '📢', color: 'violet', w: 128, h: 80 });
        a.edge('p', 'topic');
        for (const [id, lab, ic, y] of SUB) {
          const nw = id === 's3';
          a.node(id, 590, y, { label: lab, sub: nw ? '새 서비스' : '구독 중', icon: ic, color: nw ? 'pink' : 'teal', w: 150, h: 56, hidden: nw });
          a.edge('topic', id, { id: 'e-' + id, dashed: nw, hidden: nw });
        }
        async function publish(lab, subs) {
          await a.send('p', 'topic', lab, { color: 'amber', dur: 500 });
          await a.flash('topic');
          await a.par(...subs.map((s) => a.send('topic', s, lab, { color: 'violet', dur: 600 }).then(() => {
            a.setNode(s, { sub: `${lab} 받음` });
            return a.flash(s);
          })));
        }
        a.caption('한 번 발행하면, 구독한 서비스가 모두 받아요');
        await publish('#110', ['s0', 's1', 's2']);
        a.note('n1', 190, 372, '큐: 메시지 하나 → 워커 한 명\n토픽: 이벤트 하나 → 구독자 모두', { color: 'violet' });
        await a.wait(500);
        a.caption('새 서비스는 구독만 추가 — 주문 서버는 그대로');
        await a.par(a.show('s3'), a.show('e-s3'));
        await a.wait(300);
        await publish('#111', ['s0', 's1', 's2', 's3']);
        await a.wait(600);
      },
    },
  ],
};

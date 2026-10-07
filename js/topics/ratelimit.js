// 레이트 리미터: 토큰 버킷, 429, 고정/슬라이딩 윈도, Redis 분산 카운터
const SL = [[325, 312], [360, 312], [395, 312], [342, 286], [378, 286]]; // 버킷 안 토큰 자리
const CAP = 5;
let T = CAP; // 남은 토큰 수 (setup에서 초기화)

const setCnt = (a) => a.setText('cnt', `토큰 ${T} / ${CAP}`);
const setClock = (a, s) => a.setText('clock', `t = ${s}초`);

/** 토큰 하나를 버킷에 채운다. 가득 차 있으면 넘쳐서 버려진다. */
async function refill(a, dur = 650) {
  if (T >= CAP) {
    const p = a.packet('', { at: [222, 266], w: 22, h: 22, color: 'amber' });
    await a.move(p, [300, 210], dur);
    p.set(null, 'gray');
    await a.par(a.move(p, [270, 190], 300), a.fadeOut(p, 300));
    return false;
  }
  const i = T++;
  const p = a.packet('', { id: 'tk' + i, at: [222, 266], w: 22, h: 22, color: 'amber' });
  await a.move(p, [316, 214], dur * 0.6);
  await a.move(p, SL[i], dur * 0.4);
  setCnt(a);
  return true;
}
/** 요청 하나: 토큰이 있으면 통과(200), 없으면 429 */
async function request(a, label = 'GET /api', dur = 520) {
  const p = a.packet(label, { at: 'cli', color: 'blue' });
  await a.move(p, [276, 150], dur);
  if (T > 0) {
    const i = --T;
    setCnt(a);
    const tk = a.get('tk' + i);
    await a.move(tk, [360, 186], dur * 0.6);
    a.remove(tk);
    a.hl('lim', true, 'green');
    p.set(null, 'green');
    await a.move(p, 'srv', dur * 1.1);
    a.hl('lim', false);
    await a.fadeOut(p, 120);
    await a.send('srv', 'cli', '200 OK', { color: 'green', dur: dur * 1.3, via: [[360, 78]] });
    return true;
  }
  a.hl('lim', true, 'red');
  p.set('토큰 없음', 'red');
  await a.wait(dur * 0.4);
  await a.fadeOut(p, 120);
  await a.send('lim', 'cli', '429', { color: 'red', dur: dur * 0.9, dy: -34, fromAt: [276, 150] });
  a.hl('lim', false);
  return false;
}

/* ----- 타임라인(고정/슬라이딩 윈도) ----- */
const TX = (t) => 60 + (t - 30) * 10; // 30초 → x=60, 90초 → x=660
const AY = 290;
function timeline(a) {
  a.clear('zone', 'edge', 'node', 'pkt', 'top');
  a.text(360, 30, '', { id: 'title', size: 18, weight: 800, layer: 'edge' });
  a.raw('line', { x1: 40, y1: AY, x2: 680, y2: AY, class: 'edge', 'marker-end': 'url(#ah)' }, 'edge');
  for (let t = 30; t <= 90; t += 10) {
    a.raw('line', { x1: TX(t), y1: AY - 5, x2: TX(t), y2: AY + 5, class: 'edge' }, 'edge');
    a.text(TX(t), AY + 20, `${t}s`, { size: 11.5, cls: 'muted', layer: 'edge', mono: true });
  }
}
const BURST1 = [55, 56, 57, 58, 59], BURST2 = [61, 62, 63, 64, 65];
function tick(a, id, t, color, hidden) {
  return a.packet('', { id, at: [TX(t), AY - 26], w: 8, h: 34, round: 3, color, hidden });
}

export default {
  id: 'ratelimit',
  level: 4,
  cat: '서버·인프라',
  title: '레이트 리미터 — 과속 방지턱',
  sub: '한 사용자가 너무 많은 요청을 보내지 못하게, 정해진 속도 이상은 정중히 거절하는 장치',
  factory: 'rate',
  analogy: '놀이공원 입장권과 같습니다. 매표소가 1초에 한 장씩 표를 찍어 상자에 넣어 두고(최대 5장), 손님은 표가 있어야 들어갑니다. 한꺼번에 몰려오면 상자에 있던 표만큼은 바로 들어가지만, 표가 떨어지면 "잠시 후 다시 오세요"라는 안내를 받습니다.',
  keys: [
    '레이트 리미터는 사용자(API 키, IP)별로 일정 시간 안의 요청 수를 제한해 서버를 과부하와 남용으로부터 보호한다.',
    '토큰 버킷: 토큰이 일정 속도로 차고, 요청마다 1개씩 쓴다. 용량만큼의 순간 몰림(버스트)은 허용한다.',
    '한도를 넘으면 HTTP 429 Too Many Requests와 Retry-After 헤더로 "언제 다시 오라"고 알려 준다.',
    '고정 윈도 카운터는 단순하지만 경계 직전·직후에 한도의 2배가 통과할 수 있다 → 슬라이딩 윈도로 보완.',
    '서버가 여러 대면 카운터를 Redis 같은 공유 저장소에 두고 원자적으로 증가시켜야 전체 한도가 지켜진다.',
  ],
  terms: [
    ['429 Too Many Requests', '요청이 너무 많다는 HTTP 상태 코드'],
    ['Retry-After', '몇 초 뒤에 다시 시도하라고 알려 주는 응답 헤더'],
    ['토큰 버킷', '토큰이 일정 속도로 채워지고 요청이 토큰을 소비하는 알고리즘'],
    ['버스트', '짧은 순간에 요청이 한꺼번에 몰리는 것'],
    ['고정 윈도', '1분 단위처럼 시간을 칸으로 잘라 칸마다 요청 수를 세는 방식'],
    ['슬라이딩 윈도', '"지금부터 거꾸로 60초" 안의 요청 수를 세는 방식'],
    ['INCR', 'Redis에서 숫자를 원자적으로 1 증가시키는 명령'],
  ],
  setup(a) {
    T = CAP;
    a.text(360, 30, '', { id: 'title', size: 18, weight: 800, layer: 'edge' });
    a.text(660, 30, 't = 0초', { id: 'clock', size: 14, weight: 700, layer: 'edge', mono: true, color: 'teal' });
    a.node('cli', 82, 150, { shape: 'person', label: '사용자', icon: '🙂', color: 'blue', w: 104, h: 56 });
    a.node('lim', 360, 150, { label: '레이트 리미터', sub: '토큰 1개 = 요청 1개', icon: '🚦', color: 'teal', w: 150, h: 70 });
    a.node('srv', 636, 150, { label: 'API 서버', icon: '🖥️', color: 'green', w: 116, h: 60 });
    a.edge('cli', 'lim');
    a.edge('lim', 'srv');
    a.raw('path', { d: 'M300 226 L300 316 Q300 332 316 332 L404 332 Q420 332 420 316 L420 226', style: 'fill: color-mix(in srgb, var(--teal) 8%, transparent); stroke: var(--teal); stroke-width: 3; stroke-linecap: round' }, 'zone');
    a.edge('lim', [360, 224], { dashed: true, arrow: false });
    a.text(360, 356, '', { id: 'cnt', size: 13, weight: 700, layer: 'edge' });
    a.node('fac', 160, 300, { label: '토큰 공장', sub: '+1개 / 초', icon: '🏭', color: 'amber', w: 116, h: 70 });
    a.edge('fac', [290, 222], { dashed: true, color: 'amber' });
    SL.forEach((p, i) => a.packet('', { id: 'tk' + i, at: p, w: 22, h: 22, color: 'amber' }));
    setCnt(a);
  },
  steps: [
    {
      t: '토큰 버킷 — 요청마다 토큰 1개',
      easy: '리미터 아래에는 표(토큰)를 담는 상자가 있고, 지금 5개가 들어 있습니다. 요청이 올 때마다 토큰을 1개씩 꺼내 쓰고, 토큰을 낸 요청만 서버로 보냅니다.',
      deep: '토큰 버킷은 용량(capacity, burst) b와 충전 속도 r(초당 토큰) 두 값으로 정의됩니다. 구현은 실제 타이머 대신 "마지막 갱신 시각"과 "남은 토큰"만 저장하고, 요청이 올 때 경과 시간 × r만큼 더해(최대 b) 계산하는 지연 계산(lazy refill)을 씁니다.',
      async run(a) {
        a.setText('title', '토큰 버킷 (용량 5, 초당 1개)');
        a.caption('요청 1개 = 토큰 1개');
        await request(a);
        await request(a);
        a.note('n1', 560, 290, '토큰을 낸 요청만 통과', { color: 'teal' });
        await a.wait(500);
      },
    },
    {
      t: '토큰은 1초에 1개씩 다시 찬다',
      easy: '토큰 공장이 1초마다 토큰을 1개씩 상자에 넣어 줍니다. 상자는 5개까지만 담을 수 있어서, 가득 차면 새로 온 토큰은 버려집니다.',
      deep: '충전 속도가 장기 평균 처리율(여기선 1 req/s)을, 용량이 순간 허용량을 결정합니다. 오래 쉬어도 토큰은 b개를 넘지 않으므로 "아껴 둔 요청"이 무한히 쌓이지 않습니다.',
      async run(a) {
        a.remove('n1');
        for (const s of [1, 2, 3]) {
          setClock(a, s);
          const ok = await refill(a);
          if (!ok) a.note('n2', 160, 380, '가득 참 → 버림', { color: 'gray' });
          await a.wait(250);
        }
        await a.wait(500);
      },
    },
    {
      t: '한꺼번에 몰려도 5개까지는 통과 (버스트)',
      easy: '요청이 한꺼번에 몰려와도 상자에 토큰이 5개 있으니 5개까지는 바로바로 통과합니다. 대신 상자는 텅 비게 됩니다.',
      deep: '버스트 허용은 토큰 버킷의 장점입니다. 페이지 하나를 열 때 API 몇 개를 동시에 부르는 정상 패턴을 막지 않으면서 장기 속도는 r로 제한합니다. 버스트 없이 일정 간격으로만 내보내려면 리키 버킷(leaky bucket, 큐+고정 배출)을 씁니다.',
      async run(a) {
        a.remove('n2');
        a.caption('5개가 연달아 도착!');
        for (let i = 0; i < 5; i++) await request(a, `요청 ${i + 1}`, 300);
        a.note('n3', 560, 290, '버스트 5개 모두 통과', { color: 'green' });
        await a.wait(500);
      },
    },
    {
      t: '토큰이 없으면 — 429 Too Many Requests',
      easy: '상자가 비었는데 또 요청이 오면, 서버까지 보내지 않고 바로 "너무 많아요, 1초 뒤에 다시 오세요"라고 돌려보냅니다. 1초가 지나 토큰이 하나 생기면 다시 하나가 통과합니다.',
      deep: '거절 응답은 HTTP 429와 Retry-After(초 또는 HTTP 날짜), 흔히 X-RateLimit-Limit / Remaining / Reset(또는 표준 초안의 RateLimit-*) 헤더를 함께 보냅니다. 서버 자원을 쓰기 전에 끊는 것이 핵심이며, 클라이언트는 지수 백오프+지터로 재시도해야 합니다.',
      async run(a) {
        a.remove('n3');
        await request(a, '요청 6', 450);
        a.note('n4', 210, 64, '429 · Retry-After: 1', { color: 'red' });
        await request(a, '요청 7', 450);
        await a.wait(300);
        setClock(a, 4);
        await refill(a);
        a.remove('n4');
        await request(a, '요청 8', 450);
        a.note('n4b', 560, 290, '1초 뒤 토큰 1개 → 1개 통과', { color: 'green' });
        await a.wait(500);
      },
    },
    {
      t: '고정 윈도 카운터 — 경계의 함정',
      easy: '더 단순한 방법은 "1분에 5번까지"처럼 시간을 1분 칸으로 잘라 세는 것입니다. 그런데 59초에 5번, 61초에 5번 보내면 칸이 달라서 모두 통과해, 2초 사이에 10번이 들어옵니다.',
      deep: 'Fixed window는 키 하나에 카운터 하나(INCR + EXPIRE)라 메모리와 연산이 가장 싸지만, 윈도 경계 양쪽에 요청을 몰면 짧은 구간에 한도의 최대 2배가 허용됩니다. 또 윈도가 바뀌는 순간 모든 사용자가 동시에 풀려나 트래픽이 출렁입니다.',
      async run(a) {
        timeline(a);
        a.setText('title', '고정 윈도: 1분 칸마다 5개');
        a.zone('w1', TX(30) - 18, 110, TX(60) - TX(30) + 16, 220, { label: '0:00 ~ 0:59 칸', color: 'blue' });
        a.zone('w2', TX(60) + 2, 110, TX(90) - TX(60) + 16, 220, { label: '1:00 ~ 1:59 칸', color: 'violet' });
        a.text(TX(45), 160, '0 / 5', { id: 'c1', size: 18, weight: 800, color: 'blue', mono: true });
        a.text(TX(75), 160, '0 / 5', { id: 'c2', size: 18, weight: 800, color: 'violet', mono: true });
        for (let i = 0; i < 5; i++) {
          const p = tick(a, 'b1' + i, BURST1[i], 'green', true);
          await a.show(p, 180);
          a.setText('c1', `${i + 1} / 5`);
        }
        for (let i = 0; i < 5; i++) {
          const p = tick(a, 'b2' + i, BURST2[i], 'green', true);
          await a.show(p, 180);
          a.setText('c2', `${i + 1} / 5`);
        }
        a.raw('path', { d: `M${TX(55) - 6} 236 L${TX(55) - 6} 228 L${TX(65) + 6} 228 L${TX(65) + 6} 236`, fill: 'none', style: 'stroke: var(--red); stroke-width: 2' }, 'top');
        a.note('n5', 360, 380, '10초 사이에 10개 통과 — 한도의 2배!', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '슬라이딩 윈도 — 언제나 "최근 60초"',
      easy: '칸을 고정하지 않고, 요청이 올 때마다 "지금부터 거꾸로 60초" 안에 몇 번 왔는지 셉니다. 그러면 61초에 온 요청은 59초의 5번이 아직 범위 안에 있으니 거절됩니다.',
      deep: 'Sliding window log는 요청 시각을 모두 저장(Redis Sorted Set: ZADD + ZREMRANGEBYSCORE + ZCARD)해 정확하지만 메모리가 요청 수에 비례합니다. Sliding window counter는 이전 칸 카운트 × 겹친 비율 + 현재 칸 카운트로 근사해 O(1) 메모리로 경계 문제를 대부분 없앱니다.',
      async run(a) {
        timeline(a);
        a.setText('title', '슬라이딩 윈도: 최근 60초에 5개');
        BURST1.forEach((t, i) => tick(a, 'b1' + i, t, 'green'));
        const win = a.raw('rect', { x: 20, y: 110, width: TX(59) - 20 + 8, height: 216, rx: 12, style: 'fill: color-mix(in srgb, var(--teal) 10%, transparent); stroke: var(--teal); stroke-width: 2; stroke-dasharray: 6 5' }, 'zone');
        a.text(TX(45), 130, '최근 60초', { id: 'wl', size: 12, weight: 700, color: 'teal' });
        a.text(TX(45), 160, '5 / 5', { id: 'cw', size: 18, weight: 800, color: 'teal', mono: true });
        for (let i = 0; i < 5; i++) {
          const t = BURST2[i];
          const x0 = parseFloat(win.getAttribute('width'));
          await a.tween(300, (k) => win.setAttribute('width', x0 + (TX(t) + 8 - 20 - x0) * k));
          const p = tick(a, 'b2' + i, t, 'red', true);
          await a.show(p, 160);
          a.setText('cw', '5 / 5 → 거절');
        }
        a.note('n6', 360, 380, '경계가 없으니 몰아서 보내도 5개뿐', { color: 'green' });
        await a.wait(700);
      },
    },
    {
      t: '서버가 여러 대라면 — Redis 공유 카운터',
      easy: '서버가 3대인데 각자 따로 세면, 한 사용자가 3대에 골고루 보내 한도의 3배를 쓸 수 있습니다. 그래서 모든 서버가 같은 계산대(Redis)에 "이 사용자 몇 번째?"를 물어 함께 셉니다.',
      deep: '각 API 서버가 Redis에서 키 rate:{user}:{window}를 INCR(원자적)하고 첫 증가 때 EXPIRE를 겁니다. 토큰 버킷처럼 읽고-계산하고-쓰는 로직은 경쟁 조건을 피하려고 Lua 스크립트로 한 번에 실행합니다. Redis 왕복 지연(~1ms)이 매 요청에 더해지므로 로컬 캐시와 섞거나, API 게이트웨이(Envoy, Kong, NGINX limit_req)에서 처리하기도 합니다.',
      async run(a) {
        a.clear('zone', 'edge', 'node', 'pkt', 'top');
        a.text(360, 30, '분산 레이트 리밋: 한 사용자 1분 5개', { size: 18, weight: 800, layer: 'edge' });
        a.node('u', 70, 220, { shape: 'person', label: 'user 42', icon: '🙂', color: 'blue', w: 104, h: 56 });
        a.node('lb', 214, 220, { label: 'LB', icon: '⚖️', color: 'gray', w: 80, h: 56 });
        const SY = [110, 220, 330];
        SY.forEach((y, i) => {
          a.node('api' + i, 390, y, { label: `API ${i + 1}`, color: 'green', w: 110, h: 50 });
          a.edge('lb', 'api' + i);
        });
        a.node('rd', 612, 220, { shape: 'db', label: 'Redis', sub: 'rate:u42 = 0', icon: '🧮', color: 'red', w: 150, h: 84 });
        SY.forEach((y, i) => a.edge('api' + i, 'rd', { dashed: true }));
        a.edge('u', 'lb');
        a.note('n7', 612, 330, 'INCR rate:u42\n(원자적 +1)', { color: 'red' });
        for (let i = 0; i < 7; i++) {
          const s = 'api' + (i % 3), ok = i < 5;
          const p = await a.send('u', 'lb', `#${i + 1}`, { color: 'blue', dur: 280, keep: true });
          await a.move(p, s, 280);
          await a.fadeOut(p, 80);
          await a.send(s, 'rd', 'INCR', { color: 'amber', dur: 300 });
          a.setNode('rd', { sub: `rate:u42 = ${i + 1}` });
          if (!ok) a.hl('rd', true, 'red');
          await a.send(s, 'u', ok ? '200' : '429', { color: ok ? 'green' : 'red', dur: 380, via: ['lb'] });
        }
        a.badge('u', '429 ×2', 'red');
        a.note('n7b', 214, 380, '어느 서버로 가도 같은 카운터 → 6번째부터 429', { color: 'amber' });
        await a.wait(600);
      },
    },
  ],
};

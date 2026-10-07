// 캐시: 브라우저 → CDN → 앱 서버(+Redis) → DB, 적중/미스/TTL/무효화
const Y = 150;
const D = 420; // 한 구간 이동 시간(ms)

function lat(a, s, color = 'gray') {
  const t = a.get('lat');
  t.textContent = s;
  t.setAttribute('class', 'tx tc-' + color);
}
function hitRate(a, h, n) {
  a.setText('hitv', `${h}/${n} = ${Math.round((100 * h) / n)}%`);
  return a.get('hitbar').set(h / n, 400);
}
/** 단계 시작 시 캐시 배지를 정해진 상태로 맞춘다 */
function badges(a, s) {
  for (const [id, v] of Object.entries(s)) {
    if (!v) a.badge(id, null);
    else a.badge(id, v[0], v[1]);
  }
}

export default {
  id: 'cache',
  level: 3,
  cat: '서버·인프라',
  title: '캐시 — 가까운 곳에 복사본을',
  sub: '멀리 있는 원본 대신 가까운 복사본을 쓰면 빨라진다. 대신 복사본이 낡을 수 있다.',
  factory: 'cdn',
  analogy: '자주 보는 책은 도서관(DB)까지 가지 않고 책상 위(브라우저), 동네 서점(CDN), 사무실 책장(Redis)에 한 권씩 둡니다. 가까울수록 빨리 꺼내지만, 새 개정판이 나오면 여기저기 있는 옛 책을 바꿔 줘야 합니다.',
  keys: [
    '캐시는 계층으로 쌓인다: 브라우저 캐시 → CDN 엣지 → 앱 서버 메모리 캐시(Redis) → DB. 가까울수록 빠르다.',
    '캐시에 없으면(miss) 원본까지 가서 가져오고, 돌아오는 길에 각 계층이 복사본을 저장한다.',
    'TTL(유효 시간)이 지나면 복사본을 버리고 다시 원본에서 가져온다.',
    '원본이 바뀌어도 캐시는 옛 값(stale)을 줄 수 있다 → 무효화(삭제·purge)나 짧은 TTL로 해결한다.',
    '적중률(hit rate)이 높을수록 응답이 빠르고 DB 부하가 줄어든다.',
  ],
  terms: [
    ['캐시 HIT / MISS', '찾는 값이 캐시에 있으면 HIT(바로 응답), 없으면 MISS(원본까지 감)'],
    ['CDN', 'Content Delivery Network. 전 세계 엣지 서버에 콘텐츠 사본을 두어 사용자 가까이에서 응답'],
    ['Redis', '메모리에 키-값을 저장하는 초고속 저장소. 앱 서버의 캐시로 많이 쓴다'],
    ['TTL', 'Time To Live. 복사본을 믿고 써도 되는 시간'],
    ['Cache-aside', '앱이 캐시를 먼저 보고, 없으면 DB에서 읽어 캐시에 넣는 가장 흔한 패턴'],
    ['무효화', '원본이 바뀌었을 때 캐시의 옛 사본을 지우는 것 (CDN에서는 purge)'],
  ],
  setup(a) {
    a.node('pc', 80, Y, { label: '브라우저', sub: '브라우저 캐시', icon: '💻', color: 'blue', w: 120, h: 70 });
    a.node('cdn', 265, Y, { label: 'CDN 엣지', sub: '서울', icon: '🌐', color: 'teal', w: 120, h: 70 });
    a.node('app', 450, Y, { label: '앱 서버', sub: '도쿄 리전', icon: '🖥️', color: 'green', w: 120, h: 70 });
    a.node('db', 640, Y, { label: 'DB', sub: '₩10,000', icon: '🗄️', color: 'violet', shape: 'db', w: 110, h: 84 });
    a.node('redis', 450, 290, { label: 'Redis', sub: '메모리 캐시', icon: '⚡', color: 'red', w: 120, h: 62 });
    a.node('u2', 80, 290, { label: '다른 사용자', icon: '🙂', color: 'blue', w: 120, h: 58, hidden: true });
    a.edge('pc', 'cdn', { both: true, label: '20ms' });
    a.edge('cdn', 'app', { both: true, label: '120ms' });
    a.edge('app', 'db', { both: true, label: '50ms' });
    a.edge('app', 'redis', { both: true, label: '1ms', lx: 18, ly: 0 });
    a.edge('u2', 'cdn', { id: 'e-u2', both: true, hidden: true });
    a.text(360, 36, '', { id: 'lat', size: 17, weight: 800, layer: 'edge' });
    a.text(40, 404, '적중률', { size: 12.5, weight: 700, anchor: 'start', cls: 'muted', layer: 'edge' });
    const b = a.bar('hitbar', 100, 404, 440, { color: 'green' });
    a.raw('g', {}, 'edge').append(b.g);
    a.text(560, 404, '0/0', { id: 'hitv', size: 12.5, weight: 700, anchor: 'start', layer: 'edge' });
  },
  steps: [
    {
      t: '첫 요청 — DB까지 끝까지 간다 (MISS)',
      easy: '처음 보는 상품 페이지라 어디에도 복사본이 없습니다. 요청이 가장 멀리 있는 DB까지 가서 가격을 가져오고, 돌아오면서 각 단계가 복사본을 하나씩 챙겨 둡니다.',
      deep: '모든 계층에서 miss → 오리진 왕복(20 + 120ms) + Redis 조회(1ms) + DB 쿼리(50ms)로 약 191ms. 응답 경로에서 앱은 Redis에 SET(TTL 60s), CDN은 Cache-Control: s-maxage=300에 따라, 브라우저는 max-age=60에 따라 저장합니다.',
      async run(a) {
        lat(a, '');
        const p = a.packet('GET /item/7', { at: 'pc', color: 'blue' });
        a.badge('pc', 'MISS', 'red');
        await a.move(p, 'cdn', D);
        a.badge('cdn', 'MISS', 'red');
        await a.move(p, 'app', D);
        await a.move(p, 'redis', D * 0.7);
        a.badge('redis', 'MISS', 'red');
        await a.move(p, 'app', D * 0.7);
        await a.move(p, 'db', D);
        a.hl('db', true, 'green');
        await a.flash('db');
        a.hl('db', false);
        p.set('₩10,000', 'green');
        await a.move(p, 'app', D);
        a.badge('redis', '📦 60s', 'green');
        await a.flash('redis');
        await a.move(p, 'cdn', D);
        a.badge('cdn', '📦 300s', 'green');
        await a.move(p, 'pc', D);
        a.badge('pc', '📦 60s', 'green');
        await a.fadeOut(p, 200);
        lat(a, '응답 191ms — 전부 MISS', 'red');
        await hitRate(a, 0, 1);
      },
    },
    {
      t: '다시 보면 — 브라우저 캐시 HIT',
      easy: '같은 페이지를 다시 열면 내 컴퓨터에 이미 복사본이 있어서 네트워크를 전혀 쓰지 않습니다. 기다리는 시간이 거의 0이에요.',
      deep: 'max-age가 남아 있으면 브라우저는 요청을 아예 보내지 않고 메모리/디스크 캐시에서 응답합니다(DevTools의 "from disk cache"). 만료 후에는 ETag로 If-None-Match 조건부 요청을 보내 304 Not Modified를 받을 수도 있습니다.',
      async run(a) {
        badges(a, { pc: ['📦 60s', 'green'], cdn: ['📦 300s', 'green'], redis: ['📦 60s', 'green'] });
        const p = a.packet('GET /item/7', { at: 'pc', color: 'blue' });
        await a.move(p, [80, 92], 350);
        a.badge('pc', 'HIT ✓', 'green');
        p.set('₩10,000', 'green');
        await a.flash('pc');
        await a.move(p, 'pc', 300);
        await a.fadeOut(p, 200);
        lat(a, '응답 0ms — 브라우저 캐시', 'green');
        await hitRate(a, 1, 2);
      },
    },
    {
      t: '다른 사용자 — CDN 엣지 HIT',
      easy: '다른 사람이 같은 상품을 보면, 그 사람 컴퓨터엔 복사본이 없지만 가까운 동네 서버(CDN)에 있으니 거기서 바로 받아 갑니다.',
      deep: 'CDN 엣지는 여러 사용자가 공유하는 캐시(shared cache)입니다. 오리진까지 120ms 왕복 없이 엣지 RTT(약 20ms)만에 응답하고, 응답에 X-Cache: HIT, Age 헤더가 붙습니다. 개인화된 응답은 Cache-Control: private으로 공유 캐시 저장을 막아야 합니다.',
      async run(a) {
        badges(a, { pc: ['📦 60s', 'green'], cdn: ['📦 300s', 'green'], redis: ['📦 60s', 'green'] });
        await a.par(a.show('u2'), a.show('e-u2'));
        const p = a.packet('GET /item/7', { at: 'u2', color: 'blue' });
        await a.move(p, 'cdn', D);
        a.badge('cdn', 'HIT ✓', 'green');
        p.set('₩10,000', 'green');
        await a.flash('cdn');
        await a.move(p, 'u2', D);
        await a.fadeOut(p, 200);
        lat(a, '응답 20ms — CDN 엣지', 'teal');
        await hitRate(a, 2, 3);
      },
    },
    {
      t: 'TTL 만료 — 앱 서버의 Redis HIT',
      easy: '동네 서버의 복사본은 유효 시간이 지나 버려졌습니다. 그래서 앱 서버까지 가는데, 앱 서버는 DB 대신 바로 옆 Redis에 있는 복사본을 먼저 꺼내 줍니다.',
      deep: 'Cache-aside 패턴: 앱은 ① Redis GET → hit면 바로 반환, ② miss면 DB 조회 후 ③ Redis SET(TTL). 여기서는 Redis hit라 DB 쿼리(50ms)를 건너뜁니다. TTL이 동시에 만료돼 요청이 한꺼번에 DB로 몰리는 cache stampede는 TTL 지터·요청 병합(single flight)으로 막습니다.',
      async run(a) {
        badges(a, { pc: ['📦 60s', 'green'], cdn: ['⌛ 만료', 'gray'], redis: ['📦 60s', 'green'] });
        a.show('u2', 0); a.show('e-u2', 0);
        await a.flash('cdn');
        const p = a.packet('GET /item/7', { at: 'u2', color: 'blue' });
        await a.move(p, 'cdn', D);
        a.badge('cdn', 'MISS', 'red');
        await a.move(p, 'app', D);
        await a.move(p, 'redis', D * 0.7);
        a.badge('redis', 'HIT ✓', 'green');
        p.set('₩10,000', 'green');
        await a.flash('redis');
        a.note('n-ca', 626, 300, 'cache-aside\n① Redis 확인\n② 없으면 DB\n③ Redis에 저장', { color: 'red' });
        await a.move(p, ['app', 'cdn'], D * 1.6);
        a.badge('cdn', '📦 300s', 'green');
        await a.move(p, 'u2', D);
        await a.fadeOut(p, 200);
        lat(a, '응답 141ms — Redis (DB 생략)', 'amber');
        await hitRate(a, 3, 4);
      },
    },
    {
      t: '원본이 바뀌면 — 낡은 복사본 문제',
      easy: '가격이 8,000원으로 내렸습니다. DB는 바뀌었는데, 여기저기 있던 복사본은 여전히 10,000원이에요. 손님은 틀린 가격을 보게 됩니다.',
      deep: 'DB만 UPDATE하면 캐시 계층은 TTL이 끝날 때까지 옛 값(stale)을 응답합니다. "컴퓨터 과학에서 어려운 두 가지는 캐시 무효화와 이름 짓기"라는 말이 있을 만큼 흔한 버그입니다. 허용 가능한 지연(최종 일관성)에 따라 TTL을 정해야 합니다.',
      async run(a) {
        a.clear();
        badges(a, { pc: ['📦 60s', 'green'], cdn: ['📦 300s', 'green'], redis: ['📦 60s', 'green'] });
        a.show('u2', 0); a.show('e-u2', 0);
        a.caption('관리자가 가격을 8,000원으로 수정');
        await a.send([640, 40], 'db', 'UPDATE ₩8,000', { color: 'amber', dur: 600 });
        a.setNode('db', { sub: '₩8,000' });
        a.hl('db', true, 'amber');
        await a.flash('db');
        const p = a.packet('GET /item/7', { at: 'u2', color: 'blue' });
        await a.move(p, 'cdn', D);
        a.badge('cdn', 'HIT', 'amber');
        p.set('₩10,000 ✗', 'red');
        await a.move(p, 'u2', D);
        a.badge('u2', '옛 가격!', 'red');
        await a.fadeOut(p, 200);
        a.note('n-stale', 265, 350, 'DB는 8,000원인데\n캐시는 아직 10,000원', { color: 'red' });
        a.hl('db', false);
        lat(a, '빠르지만 틀린 답 (stale)', 'red');
        await hitRate(a, 4, 5);
      },
    },
    {
      t: '무효화 — 옛 복사본 지우기',
      easy: '가격을 바꿀 때 앱 서버가 "그 복사본 버려!"라고 Redis와 CDN에 알려 줍니다. 그러면 다음 요청은 DB에서 새 가격을 가져와 다시 복사본을 만듭니다.',
      deep: '쓰기 후 Redis DEL item:7, CDN에는 purge API(또는 URL에 버전 해시를 붙이는 cache busting)를 호출합니다. "DB 갱신 → 캐시 삭제" 순서가 일반적이지만, 삭제 직후 다른 요청이 옛 값을 다시 채우는 경쟁 조건이 있어 지연 이중 삭제나 짧은 TTL을 함께 씁니다. 브라우저 캐시는 서버가 지울 수 없으므로 max-age를 짧게 둡니다.',
      async run(a) {
        a.clear();
        badges(a, { pc: ['📦 60s', 'green'], cdn: ['📦 300s', 'green'], redis: ['📦 60s', 'green'], u2: null });
        a.show('u2', 0); a.show('e-u2', 0);
        a.caption('앱 서버가 캐시에 "지워!"');
        await a.par(
          a.send('app', 'redis', 'DEL item:7', { color: 'red', dur: 500 }),
          a.send('app', 'cdn', 'PURGE', { color: 'red', dur: 700 }),
        );
        badges(a, { redis: ['비움', 'gray'], cdn: ['비움', 'gray'], pc: ['옛 값 ⚠', 'amber'] });
        const p = a.packet('GET /item/7', { at: 'u2', color: 'blue' });
        await a.move(p, 'cdn', D);
        a.badge('cdn', 'MISS', 'red');
        await a.move(p, 'app', D);
        await a.move(p, 'redis', D * 0.6);
        a.badge('redis', 'MISS', 'red');
        await a.move(p, 'app', D * 0.6);
        await a.move(p, 'db', D);
        p.set('₩8,000', 'green');
        await a.move(p, 'app', D);
        a.badge('redis', '📦 ₩8,000', 'green');
        await a.move(p, 'cdn', D);
        a.badge('cdn', '📦 ₩8,000', 'green');
        await a.move(p, 'u2', D);
        a.badge('u2', '₩8,000 ✓', 'green');
        await a.fadeOut(p, 200);
        lat(a, '응답 191ms — 새 값으로 다시 채움', 'green');
        await hitRate(a, 4, 6);
      },
    },
    {
      t: '적중률 — 캐시가 얼마나 일하나',
      easy: '요청 10개 중 9개는 가까운 CDN에서 바로 끝나고, 1개만 안쪽까지 들어갑니다. 이 비율(적중률)이 높을수록 빠르고, DB는 한가해집니다.',
      deep: '평균 지연 ≈ hit율×hit 지연 + miss율×miss 지연. 적중률 90%면 0.9×20 + 0.1×191 ≈ 37ms로, 캐시가 없을 때(191ms)보다 5배 빠르고 오리진 트래픽은 1/10이 됩니다. 롱테일 콘텐츠가 많거나 TTL이 짧으면 적중률이 떨어지므로 키 설계와 TTL이 중요합니다.',
      async run(a) {
        a.clear();
        badges(a, { pc: null, cdn: ['📦 ₩8,000', 'green'], redis: ['📦 ₩8,000', 'green'], u2: null });
        a.show('u2', 0); a.show('e-u2', 0);
        const seq = 'HHHHMHHHHH';
        const runs = [...seq].map((c, i) => a.wait(i * 260).then(async () => {
          const from = i % 2 ? 'u2' : 'pc';
          const p = a.packet(c === 'H' ? 'HIT' : 'MISS', { at: from, color: c === 'H' ? 'green' : 'gray', w: 46 });
          await a.move(p, 'cdn', 380);
          if (c === 'M') await a.move(p, 'app', 380);
          await a.fadeOut(p, 150);
        }));
        await a.par(...runs);
        await hitRate(a, 13, 16);
        lat(a, '최근 10건: HIT 9 · MISS 1 → 평균 ≈ 37ms', 'green');
        a.note('n-hr', 265, 350, '적중률 ↑ → 더 빠르고, DB는 한가', { color: 'green' });
        await a.wait(600);
      },
    },
  ],
};

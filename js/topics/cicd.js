// CI/CD: 수동 배포 → push가 파이프라인을 깨움 → 빌드 → 테스트(실패하면 멈춤) → 결과물·스테이징 → 카나리 배포 → 롤백 → CI vs CD
// 위쪽 줄은 늘 보이는 파이프라인(단계 상태를 색으로), 아래쪽은 단계마다 새로 그리는 작업대다.
// 커밋 해시·버전·퍼센트는 모두 설명용 예시 값(고정)이다.

const PX = (i) => 66 + i * 118;
const PY = 72;
const STAGES = [['푸시', '⬆️'], ['빌드', '🔨'], ['테스트', '🧪'], ['아티팩트', '📦'], ['스테이징', '🧭'], ['운영 배포', '🚀']];
const COL = { '.': 'gray', r: 'amber', g: 'green', x: 'red', b: 'blue' };

/** 아래 작업대(+ 메모·패킷)를 비운다. 파이프라인 줄(node/edge 층)은 남는다. */
function wipe(a) { a.clear('pkt', 'top'); }
/** 파이프라인 줄을 즉시 보이게 한다(1단계 이후). */
function pipeOn(a) {
  STAGES.forEach((_, i) => { a.show('st' + i, 0); if (i) a.show('pe' + i, 0); });
}
/** 단계 상태: '.' 대기 · r 실행 중 · g 통과 · x 실패. badges: {번호: 글자} */
function pipe(a, s, badges = {}) {
  STAGES.forEach((_, i) => {
    const c = s[i] || '.';
    a.setNode('st' + i, { color: COL[c] });
    a.hl('st' + i, c === 'r');
    const b = badges[i];
    a.badge('st' + i, b ?? null, c === 'x' ? 'red' : c === 'g' ? 'green' : 'amber');
  });
}
function head(a, s, y = 136) { return a.text(360, y, s, { size: 13.5, weight: 800 }); }
function line(a, x1, y1, x2, y2, o = {}) {
  return a.raw('line', { x1, y1, x2, y2, class: 'edge' + (o.color ? ' ec-' + o.color : '') + (o.dashed ? ' dashed' : ''), 'marker-end': o.arrow === false ? null : 'url(#ah)' }, 'pkt');
}
/** 작은 점(요청) 하나를 경로로 보낸다 */
async function dot(a, path, color, dur = 1000, o = {}) {
  const p = a.packet('', { at: path[0], w: 14, h: 14, color });
  await a.move(p, path.slice(1), dur);
  if (o.onArrive) o.onArrive(p);
  await a.fadeOut(p, o.fade ?? 160);
}

/* ----- 카나리/롤백 무대 ----- */
const U = [80, 286], LB = [250, 286], V1 = [520, 206], V2 = [520, 362];
function canaryStage(a) {
  a.node('users', U[0], U[1], { label: '사용자', icon: '👥', color: 'gray', w: 104, h: 66, layer: 'top' });
  a.node('lb', LB[0], LB[1], { label: '로드밸런서', sub: '트래픽 나누기', color: 'violet', w: 128, h: 58, layer: 'top' });
  a.node('v1', V1[0], V1[1], { label: 'v1 (기존)', sub: 'app:a1b2c3', color: 'blue', w: 150, h: 58, layer: 'top' });
  a.node('v2', V2[0], V2[1], { label: 'v2 (새 버전)', sub: 'app:d4e5f6', color: 'green', w: 150, h: 58, layer: 'top' });
  line(a, 134, 286, 184, 286, { arrow: false });
  line(a, 314, 270, 444, 220, { arrow: false });
  line(a, 314, 302, 444, 348, { arrow: false });
  const pt = a.text(LB[0], 340, 'v2 비율 0%', { size: 12.5, weight: 800, color: 'green' });
  const b = a.bar('share', LB[0] - 60, 362, 120, { color: 'green' });
  return { pt, b };
}
/** 비율(pct%)대로 요청 n개를 흘린다. 누적 방식이라 결과가 항상 같다. */
function flow(a, n, pct, gap, o = {}) {
  let acc = 0;
  const jobs = [];
  for (let k = 0; k < n; k++) {
    acc += pct;
    const toV2 = acc >= 100 - 1e-9;
    if (toV2) acc -= 100;
    const tgt = toV2 ? V2 : V1;
    jobs.push(a.wait(k * gap).then(() => dot(a, [U, LB, tgt], toV2 ? 'green' : 'blue', 900, {
      onArrive: toV2 && o.bad ? (p) => { p.set(null, 'red'); o.bad(); } : null,
      fade: toV2 && o.bad ? 320 : 160,
    })));
  }
  return a.par(...jobs);
}

export default {
  id: 'cicd',
  level: 3,
  cat: '개발 도구',
  factory: 'cicd',
  title: 'CI/CD — 코드가 사용자에게 가는 자동 컨베이어',
  sub: 'git push 한 번이면 빌드·테스트·배포가 정해진 순서대로 자동으로 흘러가는 과정',
  analogy: '공장의 컨베이어 벨트를 떠올려 보세요. 재료(코드)를 벨트에 올리면 조립(빌드), 검사(테스트), 포장(결과물), 출하(배포)가 차례로 자동 진행됩니다. 검사에서 불량이 나오면 벨트가 멈추고 경보가 울려서, 불량품이 손님에게 가지 않습니다.',
  keys: [
    'CI/CD는 코드를 올리는 순간(git push) 빌드 → 테스트 → 배포가 자동으로 이어지는 파이프라인이다. 사람이 손으로 복사하던 배포의 실수와 밤샘을 없앤다.',
    'CI(지속적 통합): 여러 사람의 코드를 자주 합치고, 합칠 때마다 자동으로 빌드·테스트해 문제를 빨리 찾는다.',
    '테스트가 하나라도 실패하면 파이프라인은 그 자리에서 멈추고(빨간불) 개발자에게 알린다. 실패한 코드는 운영에 나가지 않는다.',
    '한 번 빌드한 결과물(아티팩트)을 그대로 스테이징과 운영에 쓰고, 운영에는 카나리·블루-그린처럼 조금씩 또는 한 번에 바꿔 끼운 뒤 문제가 보이면 바로 롤백한다.',
    'CD는 지속적 전달(운영 반영은 사람이 버튼으로)과 지속적 배포(통과하면 운영까지 자동) 두 뜻으로 쓰인다.',
  ],
  terms: [
    ['파이프라인', 'push 같은 사건이 일어나면 빌드·테스트·배포 단계를 정해진 순서로 자동 실행하는 흐름'],
    ['러너(Runner)', '파이프라인 작업을 실제로 실행하는 깨끗한 서버나 컨테이너'],
    ['아티팩트', '빌드로 만든 배포용 결과물. 실행 파일, 압축 파일, 도커 이미지 등'],
    ['스테이징', '운영과 최대한 똑같이 꾸민 리허설 환경. 운영 직전 마지막 확인 장소'],
    ['카나리 배포', '새 버전을 일부 사용자(예: 5%)에게만 먼저 내보내고, 지표가 괜찮으면 비율을 늘리는 방식'],
    ['블루-그린 배포', '새 버전 환경(그린)을 통째로 띄워 두고, 트래픽을 한 번에 옮기는 방식. 되돌리기도 한 번에'],
    ['롤백', '문제가 생긴 배포를 이전 버전으로 되돌리는 것'],
  ],
  quiz: [
    { q: '파이프라인에서 자동 테스트 하나가 실패하면 보통 어떻게 될까요?', c: ['실패한 테스트만 건너뛰고 나머지 단계를 계속 진행한다', '일단 운영에 배포하고 사용자 신고를 기다린다', '파이프라인이 그 자리에서 멈추고 개발자에게 실패를 알린다', 'CI 서버가 코드를 자동으로 고친 뒤 다시 배포한다'], a: 2, why: '테스트 단계는 문지기입니다. 하나라도 실패하면 빨간불로 멈추고 알림을 보내서, 고장 난 코드가 사용자에게 가지 않게 합니다.', step: 3 },
    { q: '카나리 배포를 가장 잘 설명한 것은?', c: ['새 버전을 일부 사용자에게만 먼저 보내고, 지표가 괜찮으면 비율을 점점 늘린다', '새 버전을 스테이징에만 올리고 운영에는 올리지 않는다', '모든 서버를 한꺼번에 새 버전으로 바꾸고 문제가 생기면 그때 롤백한다', '새 버전을 개발자 컴퓨터에서만 실행해 본다'], a: 0, why: '탄광의 카나리아처럼 소수에게 먼저 보내 위험을 일찍 감지합니다. 문제가 생겨도 영향은 그 일부 사용자에게만 미칩니다.', step: 5 },
    { q: '새 버전에서 DB 컬럼 이름을 바꿔야 합니다. 문제가 생기면 코드를 바로 이전 버전으로 되돌릴 수 있게 하려면?', c: ['한 번의 배포에서 컬럼 이름을 바로 바꾸고, 롤백할 때 DB 백업을 복원한다', '새 컬럼을 추가해 옛 버전과 새 버전이 모두 동작하게 하고, 옛 컬럼은 나중 배포에서 지운다', '롤백은 코드만 되돌리는 일이라 DB 변경은 신경 쓰지 않아도 된다', 'DB 변경도 카나리처럼 5%의 행에만 먼저 적용한다'], a: 1, why: '확장-축소(expand/contract) 방식으로 두 버전이 같은 스키마에서 함께 돌 수 있어야 코드 롤백이 안전합니다. 백업 복원은 그사이 들어온 데이터를 잃습니다.', step: 6 },
  ],
  setup(a) {
    STAGES.forEach(([l, ic], i) => {
      a.node('st' + i, PX(i), PY, { label: l, icon: ic, color: 'gray', w: 96, h: 58, size: 13.5, hidden: true });
      if (i) a.edge('st' + (i - 1), 'st' + i, { id: 'pe' + i, hidden: true });
    });
  },
  steps: [
    {
      t: '예전 방식 — 손으로 하는 배포',
      easy: '예전에는 개발자가 프로그램을 직접 만들어서 서버마다 하나씩 파일을 복사했어요. 사람이 하니 한 대를 빠뜨리거나 순서를 틀리기 쉽고, 사용자가 적은 밤늦게 작업하느라 밤을 새우기 일쑤였습니다.',
      deep: '수동 배포는 "내 컴퓨터에선 되는데"(환경 차이), 절차 누락, 서버 간 버전 불일치(configuration drift)를 낳습니다. 배포가 무섭고 비싸니 몇 주치 변경을 모아 한 번에 내보내게 되고, 변경이 클수록 실패 확률과 원인 찾기 난도가 함께 올라가는 악순환이 생깁니다.',
      async run(a) {
        wipe(a);
        head(a, '예전: 사람이 직접 서버에 올리던 시절', 34);
        a.text(120, 128, '🕚 밤 11시 30분', { size: 13, weight: 700, color: 'amber' });
        a.node('dev', 120, 214, { label: '개발자', icon: '💻', color: 'blue', w: 120, h: 70, layer: 'top' });
        const SY = [124, 224, 324];
        SY.forEach((y, i) => {
          a.node('s' + i, 560, y, { label: `서버 ${i + 1}`, sub: 'v1', color: 'gray', w: 130, h: 58, layer: 'top' });
          line(a, 182, 214, 493, y, { dashed: true, arrow: false });
        });
        [['☑ 내 노트북에서 빌드', ''], ['☐ 테스트 (시간 없어 생략…)', 'red'], ['☑ 서버마다 파일 복사', '']].forEach(([s, c], i) =>
          a.text(46, 282 + i * 24, s, { size: 12, anchor: 'start', weight: 600, color: c || undefined, cls: c ? '' : 'muted' }));
        for (let i = 0; i < 2; i++) {
          await a.send('dev', 's' + i, 'app.zip', { color: 'amber', dur: 800 });
          a.setNode('s' + i, { sub: 'v2', color: 'green' });
        }
        a.caption('서버 3은… 깜빡했다');
        await a.wait(500);
        a.setNode('s2', { color: 'red' });
        a.badge('s2', '옛 버전!', 'red');
        await a.flash('s2');
        a.note('n0', 360, 404, '손으로 하면 빠뜨리고, 틀리고, 밤을 샌다 → 서버마다 다른 버전', { color: 'red' });
        await a.wait(600);
      },
    },
    {
      t: 'git push가 파이프라인을 깨운다',
      easy: '이제 개발자가 하는 일은 코드를 저장소에 올리는 것(git push)까지예요. 저장소가 "새 코드 왔어요!"라고 CI 서버를 깨우면, 미리 적어 둔 순서대로 나머지 일이 자동으로 시작됩니다.',
      deep: '저장소의 push·PR 이벤트가 웹훅으로 CI에 전달되고, 저장소 안의 설정 파일(예: GitHub Actions의 .github/workflows/*.yml)에 적힌 workflow가 실행됩니다. workflow는 여러 job으로, job은 순서대로 도는 step(셸 명령이나 재사용 action)으로 이루어지며, 각 job은 매번 새로 준비된 러너(VM·컨테이너)에서 돌아 "깨끗한 환경"이 보장됩니다.',
      async run(a) {
        wipe(a);
        await a.par(...STAGES.map((_, i) => a.wait(i * 110).then(() => a.par(a.show('st' + i, 300), i ? a.show('pe' + i, 300) : null))));
        pipe(a, '');
        head(a, 'git push 한 번이면 나머지는 자동');
        a.node('dev', 110, 262, { label: '개발자', icon: '💻', color: 'blue', w: 120, h: 70, layer: 'top' });
        a.node('repo', 360, 262, { shape: 'db', label: '코드 저장소', sub: 'main 브랜치', color: 'violet', w: 140, h: 76, layer: 'top' });
        a.node('runner', 610, 262, { label: 'CI 러너', sub: '깨끗한 새 서버', icon: '⚙️', color: 'teal', w: 132, h: 76, layer: 'top' });
        line(a, 172, 262, 288, 262);
        line(a, 432, 262, 542, 262);
        await a.send('dev', 'repo', 'git push', { color: 'blue', dur: 900 });
        a.setNode('repo', { sub: '커밋 a1b2c3' });
        a.caption('저장소가 CI에게 "새 커밋 왔어요"(웹훅)');
        await a.send('repo', 'runner', '웹훅', { color: 'violet', dur: 800 });
        await a.flash('runner');
        await a.send('runner', 'st0', 'a1b2c3', { color: 'teal', dur: 800 });
        pipe(a, 'g', { 0: 'a1b2c3' });
        await a.flash('st0');
        pipe(a, 'gr', { 0: 'a1b2c3' });
        a.note('n1', 360, 376, '설정 파일(.yml)에 적힌 순서대로:\n빌드 → 테스트 → 배포가 자동 실행', { color: 'teal' });
        await a.wait(500);
      },
    },
    {
      t: '빌드 — 실행할 수 있는 형태로',
      easy: '사람이 쓴 코드를 바로 서버에 올릴 수는 없어요. 필요한 부품(라이브러리)을 내려받고, 컴퓨터가 실행할 수 있게 바꾸고(컴파일), 어디서나 똑같이 돌도록 상자(도커 이미지)에 담습니다.',
      deep: '의존성은 잠금 파일(package-lock.json 등)로 버전을 고정해 매번 같은 결과가 나오게 하고(재현 가능한 빌드), 의존성·빌드 결과를 캐시해 시간을 크게 줄입니다(예: actions/cache, 도커 레이어 캐시). 결과물에는 커밋 해시를 태그로 붙여 "어떤 코드로 만든 것인지" 추적합니다.',
      async run(a) {
        wipe(a);
        pipeOn(a);
        pipe(a, 'gr', { 0: 'a1b2c3' });
        head(a, '빌드 — 코드를 실행할 수 있는 형태로');
        const ROWS = [['📥 의존성 설치', 'npm ci', '18초'], ['⚙️ 컴파일·묶기', 'npm run build', '25초'], ['🐳 이미지 만들기', 'docker build', '40초']];
        const bars = ROWS.map(([l, cmd], i) => {
          const y = 186 + i * 58;
          a.text(48, y - 8, l, { size: 13, anchor: 'start', weight: 700 });
          a.text(48, y + 12, cmd, { size: 11, anchor: 'start', mono: true, cls: 'muted' });
          return a.bar('bb' + i, 250, y, 280, { color: 'amber' });
        });
        for (let i = 0; i < ROWS.length; i++) {
          await bars[i].set(1, 650);
          a.text(552, 186 + i * 58, '✓ ' + ROWS[i][2], { size: 12, anchor: 'start', weight: 700, color: 'green' });
        }
        a.text(250, 382, '결과물 →', { size: 12.5, weight: 700, cls: 'muted' });
        const img = a.packet('🐳 app:a1b2c3', { at: [400, 382], color: 'teal', round: 8, h: 32, size: 13 });
        img.g.style.opacity = 0;
        await a.show(img, 300);
        pipe(a, 'gg', { 0: 'a1b2c3' });
        a.caption('같은 커밋이면 언제 빌드해도 같은 결과물');
        await a.wait(600);
      },
    },
    {
      t: '자동 테스트 — 실패하면 빨간불',
      easy: '만든 결과물이 제대로 동작하는지 수백 개의 검사(테스트)를 자동으로 돌려요. 하나라도 실패하면 파이프라인은 그 자리에서 멈추고(빨간불) 개발자에게 알림이 갑니다. 고쳐서 다시 올리면 처음부터 다시 검사해요.',
      deep: '단위 테스트(함수 하나, 빠름·많음)와 통합 테스트(DB·API를 함께, 느림·적음)를 나누고, 실패가 빨리 드러나도록 빠른 것부터 돌리며 job을 병렬화합니다. 같은 코드인데 통과·실패가 번갈아 나는 "불안정한 테스트(flaky test)"는 신뢰를 무너뜨리므로, 무작정 재시도로 덮지 말고 격리해서 원인을 고쳐야 합니다. 보통 main 브랜치는 테스트 통과를 병합 조건으로 걸어 보호합니다.',
      async run(a) {
        wipe(a);
        pipeOn(a);
        pipe(a, 'ggr', { 0: 'a1b2c3' });
        head(a, '자동 테스트 — 하나라도 실패하면 멈춤');
        a.text(48, 188, '단위 테스트', { size: 12.5, anchor: 'start', weight: 700 });
        a.text(48, 240, '통합 테스트', { size: 12.5, anchor: 'start', weight: 700 });
        const SQ = (row, i) => [170 + i * 26, row ? 240 : 188];
        const sq = [];
        for (let i = 0; i < 16; i++) sq.push(a.packet('', { at: SQ(0, i), w: 18, h: 18, round: 4, color: 'gray' }));
        for (let i = 0; i < 8; i++) sq.push(a.packet('', { at: SQ(1, i), w: 18, h: 18, round: 4, color: 'gray' }));
        a.node('dev', 640, 214, { label: '개발자', icon: '💻', color: 'blue', w: 110, h: 66, layer: 'top' });
        const FAIL = 16 + 5;
        // 1회차: 통합 테스트 6번째에서 실패
        for (let i = 0; i <= FAIL; i++) {
          await a.wait(i < 16 ? 55 : 110);
          sq[i].set(null, i === FAIL ? 'red' : 'green');
        }
        const ft = a.text(360, 284, '✕ 결제 통합 테스트 실패 — 기대 10,000원, 실제 0원', { size: 12, weight: 700, color: 'red' });
        pipe(a, 'ggx', { 0: 'a1b2c3', 2: '✕' });
        a.caption('빨간불! 다음 단계는 실행되지 않아요');
        await a.flash('st2');
        await a.send('st2', 'dev', '❌ 실패 알림', { color: 'red', dur: 900 });
        a.badge('dev', '!', 'red');
        await a.wait(500);
        // 고쳐서 다시 push → 처음부터 다시
        a.caption('버그를 고쳐서 다시 push (커밋 d4e5f6)');
        a.badge('dev', null);
        ft.remove();
        sq.forEach((p) => p.set(null, 'gray'));
        pipe(a, 'g', { 0: 'd4e5f6' });
        await a.wait(300);
        pipe(a, 'gr', { 0: 'd4e5f6' });
        await a.wait(300);
        pipe(a, 'ggr', { 0: 'd4e5f6' });
        for (let i = 0; i < sq.length; i++) { await a.wait(30); sq[i].set(null, 'green'); }
        pipe(a, 'ggg', { 0: 'd4e5f6', 2: '24 ✓' });
        a.text(360, 284, '✓ 24개 모두 통과', { size: 12.5, weight: 700, color: 'green' });
        a.note('n3', 360, 376, '모두 통과해야 다음 단계로 →\n실수가 사용자에게 가기 전에 걸러져요', { color: 'green' });
        await a.wait(500);
      },
    },
    {
      t: '결과물 보관 → 스테이징에서 리허설',
      easy: '테스트를 통과한 결과물에 이름표(버전)를 붙여 창고(저장소)에 보관해요. 그다음 운영과 똑같이 꾸민 연습 무대(스테이징)에 먼저 올려, 진짜 사용자 앞에 서기 전에 리허설을 합니다.',
      deep: '"한 번 빌드해서 여러 번 배포(build once, deploy many)"가 원칙입니다. 환경마다 다시 빌드하면 스테이징에서 확인한 것과 운영에 나가는 것이 달라질 수 있으니, 레지스트리의 같은 이미지(가능하면 다이제스트로 고정)를 쓰고 환경 차이는 설정·비밀 값으로만 줍니다. 스테이징에서는 스모크 테스트·E2E 테스트로 핵심 흐름을 확인합니다.',
      async run(a) {
        wipe(a);
        pipeOn(a);
        pipe(a, 'gggr', { 0: 'd4e5f6' });
        head(a, '결과물을 창고에 보관 → 스테이징에서 리허설');
        a.node('reg', 340, 250, { shape: 'db', label: '레지스트리', sub: '결과물 창고', color: 'violet', w: 140, h: 80, layer: 'top' });
        a.node('stg', 590, 250, { label: '스테이징', sub: '운영과 같은 구성', icon: '🧭', color: 'teal', w: 150, h: 76, layer: 'top' });
        line(a, 150, 250, 266, 250);
        line(a, 412, 250, 512, 250);
        a.text(90, 284, '테스트 통과한 결과물', { size: 11, cls: 'muted', weight: 600 });
        const img = a.packet('🐳 app:d4e5f6', { at: [90, 250], color: 'teal', round: 8, h: 32, size: 12.5 });
        await a.wait(250);
        await a.move(img, [340, 250], 900);
        a.remove(img);
        a.setNode('reg', { sub: 'app:d4e5f6 보관' });
        pipe(a, 'ggggr', { 0: 'd4e5f6' });
        await a.flash('reg');
        await a.send('reg', 'stg', '🐳 app:d4e5f6', { color: 'teal', dur: 850 });
        a.setNode('stg', { sub: 'app:d4e5f6' });
        const CK = ['✓ 로그인', '✓ 장바구니·결제', '✓ 응답 0.2초'];
        for (let i = 0; i < CK.length; i++) {
          await a.wait(300);
          a.text(530, 314 + i * 22, CK[i], { size: 12, anchor: 'start', weight: 700, color: 'green' });
        }
        pipe(a, 'ggggg', { 0: 'd4e5f6' });
        a.note('n4', 300, 398, '같은 결과물을 그대로 씁니다 — 스테이징에서 본 것 = 운영에 나갈 것', { color: 'teal' });
        await a.wait(600);
      },
    },
    {
      t: '운영 배포 — 카나리로 조금씩',
      easy: '새 버전을 모든 사용자에게 한꺼번에 내보내지 않아요. 먼저 5%의 사용자에게만 보내 보고, 오류가 늘지 않으면 25%, 100%로 점점 늘립니다. 탄광에서 카나리아로 위험을 먼저 알아차리던 것에서 따온 이름이에요.',
      deep: '로드밸런서·서비스 메시의 가중치로 트래픽을 나누고, 단계마다 에러율·지연(p99)·핵심 지표를 자동 분석해 다음 단계로 갈지 정합니다. 블루-그린은 새 환경 전체를 띄운 뒤 한 번에 전환해 되돌리기가 빠르지만 자원이 두 배 들고, 롤링은 서버를 몇 대씩 차례로 교체합니다. 기능 플래그(feature flag)를 쓰면 배포(코드 설치)와 출시(기능 켜기)를 분리해, 코드를 내보낸 뒤 설정만으로 기능을 켜고 끌 수 있습니다.',
      async run(a) {
        wipe(a);
        pipeOn(a);
        pipe(a, 'gggggr', { 0: 'd4e5f6' });
        head(a, '운영 배포 — 카나리: 조금씩 늘리기');
        const { pt, b } = canaryStage(a);
        for (const [pct, n, gap] of [[5, 20, 80], [25, 12, 100], [100, 6, 120]]) {
          pt.textContent = `v2 비율 ${pct}%`;
          a.badge('st5', pct + '%', 'amber');
          await b.set(pct / 100, 350);
          await flow(a, n, pct, gap);
          await a.wait(150);
        }
        a.setNode('v1', { color: 'gray', sub: '대기 (롤백용)' });
        pipe(a, 'gggggg', { 0: 'd4e5f6', 5: '100%' });
        a.note('n5', 360, 414, '블루-그린: 새 환경을 통째로 띄워 두고 스위치 한 번에 전환', { color: 'violet' });
        await a.wait(500);
      },
    },
    {
      t: '문제가 보이면 — 롤백',
      easy: '만약 새 버전을 받은 5%의 사용자에게서 오류가 쏟아지면? 지켜보던 지표가 경보를 울리고, 트래픽을 즉시 옛 버전으로 되돌립니다(롤백). 피해는 일부 사용자, 몇 분으로 끝나요.',
      deep: '롤백은 "직전 아티팩트를 다시 배포"하는 것이라 빌드할 필요 없이 빠릅니다. 단, DB 스키마 변경이 섞이면 옛 코드가 새 스키마에서 안 돌 수 있으니, 컬럼 추가 → 양쪽 호환 → 옛 컬럼 삭제처럼 확장-축소(expand/contract)로 나눠 배포합니다. 카나리 분석 도구(Argo Rollouts, Flagger 등)는 에러율이 기준을 넘으면 사람 없이 자동으로 롤백합니다.',
      async run(a) {
        wipe(a);
        pipeOn(a);
        pipe(a, 'gggggr', { 0: 'd4e5f6', 5: '5%' });
        head(a, '만약 새 버전에 문제가 있었다면? → 롤백');
        const { pt, b } = canaryStage(a);
        a.setNode('v1', { color: 'blue', sub: 'app:a1b2c3' });
        pt.textContent = 'v2 비율 5%';
        await b.set(0.05, 0);
        const e1 = a.text(608, 206, '에러 0.1%', { size: 12, anchor: 'start', weight: 700, color: 'green' });
        const e2 = a.text(608, 362, '에러 0%', { size: 12, anchor: 'start', weight: 700, color: 'green' });
        let bad = 0;
        const ERR = ['에러 8%', '에러 12%', '에러 15%'];
        await flow(a, 60, 5, 45, { bad: () => { e2.textContent = ERR[Math.min(bad++, 2)]; e2.classList.replace('tc-green', 'tc-red'); } });
        a.setNode('v2', { color: 'red' });
        a.badge('v2', '🚨 경보', 'red');
        a.caption('에러율이 기준(1%)을 넘음 → 자동 롤백');
        await a.flash('v2');
        pt.textContent = 'v2 비율 0%';
        await b.set(0, 400);
        pipe(a, 'gggggx', { 0: 'd4e5f6', 5: '↩ v1' });
        a.setNode('v2', { color: 'gray', sub: '내림' });
        a.badge('v2', null);
        e2.textContent = '트래픽 없음';
        e2.classList.replace('tc-red', 'tc-gray');
        await flow(a, 6, 0, 110);
        e1.textContent = '에러 0.1% ✓';
        a.note('n6', 360, 414, '이전 결과물(v1)로 즉시 되돌림 → 영향은 5% 사용자, 몇 분', { color: 'amber' });
        await a.wait(500);
      },
    },
    {
      t: 'CI와 CD는 무엇이 다를까',
      easy: 'CI(지속적 통합)는 "코드를 자주 합치고 그때마다 자동으로 빌드·테스트"하는 앞부분이에요. CD는 그 뒤를 자동으로 이어 주는 부분인데, 운영 반영 버튼만 사람이 누르면 "지속적 전달", 그 버튼까지 없애면 "지속적 배포"라고 합니다.',
      deep: '지속적 전달은 main이 언제나 배포 가능한 상태임을 보장하고 운영 반영 시점은 사업적 판단(승인 게이트)으로 남깁니다. 지속적 배포는 그 게이트까지 자동화하므로 테스트·카나리 분석·기능 플래그에 대한 신뢰가 전제입니다. 팀의 배포 역량은 흔히 DORA 지표 네 가지 — 배포 빈도, 변경 리드 타임, 변경 실패율, 장애 복구 시간 — 로 잽니다.',
      async run(a) {
        wipe(a);
        pipeOn(a);
        pipe(a, 'gggggg', { 0: 'd4e5f6' });
        const br = (x1, x2, color) => a.raw('path', { d: `M${x1} 106 v7 H${x2} v-7`, fill: 'none', style: `stroke: var(--${color}); stroke-width: 2` }, 'top');
        br(PX(0) - 48, PX(2) + 48, 'blue');
        br(PX(3) - 48, PX(5) + 48, 'green');
        a.text((PX(0) + PX(2)) / 2, 128, 'CI · 지속적 통합 (자주 합치고 자동 검증)', { size: 12, weight: 800, color: 'blue' });
        a.text((PX(3) + PX(5)) / 2, 128, 'CD · 지속적 전달 / 배포', { size: 12, weight: 800, color: 'green' });
        const CX = [252, 372, 492, 612];
        const row = (y, name, en, chips, color) => {
          a.text(24, y - 9, name, { size: 13, anchor: 'start', weight: 800, color });
          a.text(24, y + 11, en, { size: 10.5, anchor: 'start', mono: true, cls: 'muted' });
          const ps = chips.map(([s, c], i) => a.packet(s, { at: [CX[i], y], color: c, w: 104, h: 34, round: 8, size: 12.5 }));
          for (let i = 0; i < 3; i++) line(a, CX[i] + 54, y, CX[i + 1] - 54, y);
          return ps;
        };
        const A = row(196, '지속적 전달', 'Continuous Delivery', [['테스트 ✓', 'gray'], ['스테이징 ✓', 'gray'], ['👤 승인', 'amber'], ['🚀 운영', 'gray']], 'green');
        const B = row(306, '지속적 배포', 'Continuous Deployment', [['테스트 ✓', 'gray'], ['스테이징 ✓', 'gray'], ['⚡ 자동', 'teal'], ['🚀 운영', 'gray']], 'teal');
        const ta = a.text(432, 236, '언제든 배포할 준비 완료 — 운영 반영은 사람이 버튼으로', { size: 11.5, cls: 'muted', weight: 600 });
        const tb = a.text(432, 346, '테스트를 통과하면 사람 손 없이 운영까지', { size: 11.5, cls: 'muted', weight: 600 });
        ta.style.opacity = 0; tb.style.opacity = 0;
        const go = async (ps, y, gate) => {
          const tok = a.packet('', { at: [CX[0] - 70, y], w: 14, h: 14, color: 'amber' });
          for (let i = 0; i < 4; i++) {
            await a.move(tok, [CX[i] - 60, y], i ? 380 : 250);
            if (i === 2 && gate) {
              a.caption('사람이 "배포" 버튼을 누를 때까지 대기…');
              await a.wait(1100);
              await a.flash(ps[2]);
            }
            ps[i].set(null, 'green');
          }
          await a.fadeOut(tok, 200);
        };
        await a.par(go(A, 196, true), go(B, 306, false).then(() => a.show(tb, 300)));
        await a.show(ta, 300);
        a.note('n7', 360, 404, 'CI = 자주 합치고 자동 검증 · CD = 검증된 결과물을 운영까지 이어 줌', { color: 'blue' });
        await a.wait(600);
      },
    },
  ],
};

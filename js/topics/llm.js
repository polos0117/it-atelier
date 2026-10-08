// 대형 언어 모델(LLM): 토큰화 → 임베딩 → 어텐션 → 트랜스포머 층 → 다음 토큰 확률 → 자기회귀 생성 → 온도 → 학습과 한계
// 단계마다 무대를 새로 그린다. 토큰 번호·확률·좌표는 모두 설명용 예시 값(고정)이다.

// [글자, 예시 토큰 번호, 색]
const TOK = [
  ['하늘', 21734, 'blue'], ['이', 12, 'green'], ['파란', 48211, 'amber'],
  ['이유', 30562, 'violet'], ['는', 16, 'teal'], ['?', 30, 'pink'],
];
const RX = (i) => 155 + i * 82; // 토큰 한 줄 배치(가로)
// 다음 토큰 후보와 확률(합 1)
const CAND = [['햇빛', 0.41], ['공기', 0.22], ['빛', 0.15], ['대기', 0.08], ['하늘', 0.07], ['기타 수만 개', 0.07]];
// 이어 쓰는 답(토큰 단위)
const ANS = ['햇빛', '이', '공기', '에', '흩어', '지는데', '파란', '빛'];

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 30, w: o.w, size: o.size || 13, id: o.id, hidden: o.hidden, layer: o.layer });
}
function setPos(p, x, y) { p.x = x; p.y = y; p.g.setAttribute('transform', `translate(${x} ${y})`); }
function ellipse(a, cx, cy, rx, ry, color) {
  return a.raw('ellipse', { cx, cy, rx, ry, style: `fill: color-mix(in srgb, var(--${color}) 7%, transparent); stroke: color-mix(in srgb, var(--${color}) 60%, transparent); stroke-width: 1.5; stroke-dasharray: 5 5` }, 'zone');
}
/** 확률 막대 한 줄(raw rect). 반환: { set(v) } */
function probBar(a, x, y, h, color, scale) {
  a.raw('rect', { x, y: y - h / 2, width: scale, height: h, rx: 4, style: 'fill: var(--panel2); opacity: .7' }, 'edge');
  const r = a.raw('rect', { x, y: y - h / 2, width: 0, height: h, rx: 4, style: `fill: var(--${color})` }, 'node');
  return { r, set: (v) => r.setAttribute('width', Math.max(0, v * scale)) };
}
/** 온도 T를 적용한 확률 (후보만 다시 정규화) */
function temp(ps, T) {
  const e = ps.map((p) => Math.pow(p, 1 / T));
  const s = e.reduce((x, y) => x + y, 0);
  return e.map((x) => x / s);
}
const pct = (v) => (v > 0 && v < 0.01 ? '<0.01' : v.toFixed(2));

export default {
  id: 'llm',
  level: 3,
  cat: 'AI',
  title: 'AI는 어떻게 답할까 — 대형 언어 모델(LLM)',
  sub: '질문을 토큰으로 쪼개고, "다음에 올 토큰"을 하나씩 예측해 답을 이어 쓰는 과정',
  analogy: '엄청나게 많은 글을 읽은 "문장 이어 쓰기 달인"을 떠올려 보세요. 앞에 적힌 글을 보고 다음에 올 가장 그럴듯한 말을 한 조각씩 적어 나갑니다. 사전을 찾아보는 게 아니라 읽으며 익힌 패턴으로 쓰기 때문에, 대부분은 맞지만 가끔은 자신 있게 틀리기도 합니다.',
  keys: [
    'LLM은 글자를 직접 읽지 않는다. 문장을 토큰(낱말 조각)으로 자르고, 각 토큰 번호를 숫자 벡터(임베딩)로 바꿔 계산한다.',
    '어텐션은 각 토큰이 앞쪽의 어떤 토큰을 얼마나 참고할지 정하는 장치이고, 이를 담은 트랜스포머 블록을 수십 층 쌓는다.',
    '모델의 출력은 "다음 토큰"에 대한 확률 분포다. 하나를 고르고, 그 토큰을 입력에 붙여 다시 예측하기를 반복해 답을 만든다(자기회귀).',
    '온도(temperature)는 확률 분포를 뾰족하게(낮음) 또는 평평하게(높음) 만들어, 답의 일관성과 다양성 사이를 조절한다.',
    '대량의 글로 다음 토큰 맞히기를 배운 뒤 지시 학습·사람 피드백으로 다듬는다. 그럴듯한 오답(환각), 컨텍스트 창 한계, 학습 이후 정보 부족이 대표적 한계다.',
  ],
  terms: [
    ['토큰', '모델이 다루는 글의 최소 단위. 낱말 하나일 수도, 낱말의 일부나 문장부호일 수도 있다'],
    ['임베딩', '토큰 번호를 수백~수천 개의 숫자 묶음(벡터)으로 바꾼 것. 비슷한 쓰임의 토큰은 가까운 벡터가 된다'],
    ['어텐션', '각 위치가 다른 위치들을 얼마나 참고할지 가중치를 계산해 정보를 섞는 연산'],
    ['트랜스포머', '어텐션과 MLP(작은 신경망)를 묶은 블록을 여러 층 쌓은 신경망 구조'],
    ['파라미터(가중치)', '학습으로 정해지는 모델 내부의 숫자들. 큰 모델은 수십억~수천억 개'],
    ['컨텍스트 창', '모델이 한 번에 읽을 수 있는 최대 토큰 수(질문 + 지금까지의 답 포함)'],
    ['환각', '사실이 아닌 내용을 그럴듯하게 만들어 내는 현상'],
  ],
  setup(a) {
    a.node('q', 360, 76, { label: '하늘이 파란 이유는?', sub: '사용자의 질문', color: 'gray', w: 300, h: 54, size: 17 });
  },
  steps: [
    {
      t: '질문을 조각으로 — 토큰화',
      easy: 'AI는 글자를 그대로 읽지 못해요. 먼저 문장을 "토큰"이라는 작은 조각으로 자르고, 조각마다 정해진 번호를 붙입니다. 모델이 실제로 받는 건 이 번호 목록이에요.',
      deep: 'BPE·SentencePiece 같은 서브워드 토크나이저가 자주 나오는 글자 조합을 하나의 토큰으로 묶어 어휘(보통 수만~수십만 개)를 만듭니다. 영어는 대략 단어 하나가 1~2토큰이지만, 한국어는 조사·어미가 붙어 더 잘게 쪼개지는 경우가 많아 같은 뜻에 토큰이 더 듭니다. 띄어쓰기도 토큰의 일부로 들어가며, 그림 속 번호는 설명용 예시입니다.',
      async run(a) {
        wipe(a);
        a.node('q', 360, 76, { label: '하늘이 파란 이유는?', sub: '사용자의 질문', color: 'gray', w: 300, h: 54, size: 17 });
        a.text(360, 134, '✂ 토크나이저가 조각내기', { size: 12, cls: 'muted', weight: 700 });
        a.caption('토큰 번호는 설명용 예시예요');
        const ps = TOK.map(([s, , c], i) => chip(a, s, 360, 76, c, { w: 64, h: 34, size: 14, id: 'c' + i, hidden: true }));
        await a.par(...ps.map((p, i) => a.wait(i * 150).then(async () => {
          p.g.style.opacity = 1;
          await a.move(p, [RX(i), 186], 650);
        })));
        TOK.forEach(([, id], i) => {
          a.text(RX(i), 218, '↓', { size: 13, cls: 'muted' });
          a.text(RX(i), 244, String(id), { size: 13, mono: true, weight: 700, color: TOK[i][2] });
        });
        await a.wait(500);
        a.text(360, 288, '모델에 들어가는 건 이 숫자 목록', { size: 12, cls: 'muted' });
        a.text(360, 312, '[21734, 12, 48211, 30562, 16, 30]', { size: 15, mono: true, weight: 700 });
        await a.wait(400);
        a.note('n1', 360, 384, '한국어는 낱말이 더 잘게 쪼개지기도 해요\n예) 하늘이 → 하늘 + 이', { color: 'blue' });
        await a.wait(700);
      },
    },
    {
      t: '숫자의 좌표로 — 임베딩',
      easy: '번호만으로는 "하늘"과 "구름"이 비슷하다는 걸 알 수 없어요. 그래서 토큰마다 숫자 여러 개로 된 좌표를 줍니다. 비슷하게 쓰이는 말은 이 "의미 지도"에서 서로 가까이 모여요.',
      deep: '임베딩은 어휘 크기 × d 행렬에서 토큰 번호에 해당하는 행을 꺼내는 조회(lookup)이고, d는 모델에 따라 수천 차원입니다. 이 값은 사람이 정한 게 아니라 학습으로 정해지며, 위치 정보(RoPE 같은 위치 인코딩)도 더해져 순서를 구분합니다. 그림은 고차원 공간을 2차원으로 아주 단순화한 것입니다.',
      async run(a) {
        wipe(a);
        a.zone('map', 244, 46, 460, 378, { label: '의미 지도 (2차원으로 단순화)', color: 'gray' });
        a.text(70, 60, '토큰', { size: 12, cls: 'muted', weight: 700 });
        // 군집 영역
        ellipse(a, 345, 168, 66, 60, 'teal');
        ellipse(a, 588, 140, 92, 58, 'blue');
        ellipse(a, 478, 252, 64, 46, 'violet');
        ellipse(a, 328, 352, 62, 48, 'green');
        ellipse(a, 638, 366, 56, 36, 'gray');
        a.text(345, 98, '조사·기호', { size: 11, weight: 700, color: 'teal', layer: 'edge' });
        a.text(640, 72, '하늘·색·자연', { size: 11, weight: 700, color: 'blue', layer: 'edge' });
        a.text(540, 214, '까닭 묻기', { size: 11, weight: 700, color: 'violet', layer: 'edge' });
        a.text(328, 294, '동물', { size: 11, weight: 700, color: 'green', layer: 'edge' });
        a.text(638, 320, '탈것', { size: 11, weight: 700, cls: 'muted', layer: 'edge' });
        const REF = [['강아지', 300, 322], ['고양이', 360, 342], ['토끼', 306, 372], ['자동차', 612, 352], ['버스', 664, 376],
          ['구름', 530, 100], ['바다', 652, 112], ['왜', 512, 236], ['원인', 462, 274], ['가', 372, 122]];
        for (const [s, x, y] of REF) {
          a.raw('circle', { cx: x, cy: y, r: 4, style: 'fill: var(--muted)' }, 'node');
          a.text(x, y + 14, s, { size: 11, cls: 'muted', layer: 'node' });
        }
        const POS = [[570, 128], [322, 142], [620, 176], [440, 226], [384, 172], [310, 206]];
        TOK.forEach(([s, , c], i) => { chip(a, s, 70, 92 + i * 42, c, { h: 28 }).g.style.opacity = 0.28; });
        const ps = TOK.map(([s, , c], i) => chip(a, s, 70, 92 + i * 42, c, { h: 28 }));
        a.text(20, 352, '하늘 →', { size: 12, anchor: 'start', weight: 700, color: 'blue' });
        a.text(20, 376, '[0.21, −0.73, 0.05, …]', { size: 12.5, anchor: 'start', mono: true, weight: 700 });
        a.text(20, 398, '실제로는 수천 개의 숫자', { size: 11, anchor: 'start', cls: 'muted' });
        await a.wait(300);
        await a.par(...ps.map((p, i) => a.wait(i * 160).then(() => a.move(p, POS[i], 800))));
        a.caption('가까이 있을수록 뜻이나 쓰임이 비슷해요');
        await a.wait(900);
      },
    },
    {
      t: '서로를 바라보기 — 어텐션',
      easy: '같은 낱말도 앞뒤 말에 따라 뜻이 달라져요. 그래서 각 토큰은 앞에 나온 토큰들을 둘러보며 "누구를 얼마나 참고할지" 정합니다. "이유"는 무엇의 이유인지 알려고 "하늘"과 "파란"을 가장 많이 봐요.',
      deep: '각 토큰 벡터에서 질의(Q)·키(K)·값(V)을 만들고, softmax(Q·Kᵀ/√d)로 가중치(합 1)를 구해 V를 가중합합니다. 답을 생성하는 디코더 모델은 인과 마스크를 써서 자기보다 뒤의 토큰은 볼 수 없습니다. 실제로는 여러 개의 어텐션 헤드가 병렬로 서로 다른 관계를 보고, 모든 위치가 동시에 계산됩니다.',
      async run(a) {
        wipe(a);
        const Y = 330;
        const ps = TOK.map(([s, , c], i) => chip(a, s, RX(i), Y, c, { w: 64, h: 34, size: 14 }));
        ps[4].g.style.opacity = 0.32;
        ps[5].g.style.opacity = 0.32;
        a.note('n0', 360, 56, "'이유'를 이해하려면 어느 말을 봐야 할까?", { color: 'violet' });
        a.text(524, 368, '뒤에 올 말 → 아직 못 봄', { size: 11, cls: 'muted' });
        await a.flash(ps[3]);
        const W = [0.36, 0.05, 0.41];
        const x0 = RX(3), y0 = Y - 19;
        const arcs = [];
        W.forEach((w, j) => {
          const xs = x0 - 22 + j * 10, x1 = RX(j), dx = xs - x1, cy = y0 - dx * 0.9 - 30;
          const d = `M${xs} ${y0} Q${(xs + x1) / 2} ${cy} ${x1} ${y0}`;
          const p = a.raw('path', { d, fill: 'none', 'stroke-linecap': 'round', style: `stroke: var(--violet); stroke-width: ${1.5 + w * 20}; opacity: 0` }, 'edge');
          const t = a.text(x1, 368, pct(w), { size: 13, mono: true, weight: 800, color: 'violet' });
          t.style.opacity = 0;
          arcs.push({ p, t, x1, xs, cy });
        });
        // 자기 자신
        const self = a.raw('path', { d: `M${x0 + 8} ${y0} C${x0 - 4} ${y0 - 56} ${x0 + 40} ${y0 - 56} ${x0 + 24} ${y0}`, fill: 'none', style: 'stroke: var(--violet); stroke-width: 5.1; opacity: 0' }, 'edge');
        const st = a.text(x0, 368, '0.18', { size: 13, mono: true, weight: 800, color: 'violet' });
        st.style.opacity = 0;
        a.caption('선이 굵을수록 더 많이 참고합니다 (가중치 합 = 1)');
        for (const r of [arcs[2], arcs[0], arcs[1]]) {
          await a.tween(450, (k) => { r.p.style.opacity = 0.25 + 0.65 * k; r.t.style.opacity = k; });
        }
        await a.tween(350, (k) => { self.style.opacity = 0.25 + 0.65 * k; st.style.opacity = k; });
        // 정보가 '이유'로 모여드는 점
        const dots = arcs.map((r, j) => chip(a, '', r.x1, y0, TOK[j][2], { w: 12, h: 12 }));
        await a.tween(900, (k) => {
          arcs.forEach((r, j) => {
            const u = 1 - k, x = u * u * r.x1 + 2 * u * k * ((r.xs + r.x1) / 2) + k * k * r.xs;
            const y = u * u * y0 + 2 * u * k * r.cy + k * k * y0;
            setPos(dots[j], x, y);
          });
        }, { linear: true });
        dots.forEach((d) => a.remove(d));
        ps[3].set('이유*');
        await a.flash(ps[3]);
        a.note('n1', 360, 412, "가중치만큼 섞어 문맥이 담긴 새 '이유'를 만듭니다", { color: 'blue' });
        await a.wait(700);
      },
    },
    {
      t: '층을 거듭하며 — 트랜스포머 블록',
      easy: '어텐션으로 서로 참고하고, 작은 신경망(MLP)으로 한 번 더 다듬는 과정을 "블록"이라 불러요. 이런 블록을 수십 층 쌓아, 층을 지날 때마다 토큰의 표현이 문맥을 더 많이 담게 됩니다.',
      deep: '각 블록은 (정규화 → 멀티헤드 어텐션 → 잔차 덧셈) 다음 (정규화 → MLP → 잔차 덧셈)으로 이루어집니다. 잔차 연결 덕분에 입력이 그대로 다음 층으로 흐르고 각 층은 "고칠 부분"만 더하므로 깊게 쌓아도 학습이 됩니다. 큰 모델은 수십~100여 층, 수십억~수천억 개의 파라미터를 가지며, 마지막 층 출력은 어휘 크기의 점수(logits)로 바뀝니다.',
      async run(a) {
        wipe(a);
        const TX = 170;
        a.node('emb', TX, 394, { label: '토큰 임베딩', color: 'gray', w: 220, h: 36, size: 13 });
        const BL = [['b1', 330, '블록 1'], ['b2', 270, '블록 2'], ['b3', 210, '블록 3'], ['bN', 116, '블록 N']];
        for (const [id, y, s] of BL) a.node(id, TX, y, { label: s, sub: '어텐션 + MLP', color: 'violet', w: 220, h: 44, size: 13 });
        a.text(TX, 164, '⋮', { size: 22, weight: 800, cls: 'muted' });
        a.text(TX, 40, '마지막 표현 → 다음 토큰 예측', { size: 12, weight: 700, cls: 'muted' });
        a.badge('bN', '수십 층', 'amber');
        // 오른쪽: 블록 하나 안쪽
        a.zone('zd', 392, 48, 310, 374, { label: '블록 하나의 안쪽', color: 'violet' });
        const BX = 500;
        a.text(BX, 400, '입력', { size: 12, weight: 700, cls: 'muted' });
        a.node('att', BX, 320, { label: '어텐션', sub: '서로 참고', color: 'violet', w: 140, h: 44, size: 13 });
        a.node('p1', BX, 262, { label: '+', color: 'gray', shape: 'circle', w: 26, h: 26, size: 15 });
        a.node('mlp', BX, 204, { label: 'MLP', sub: '각자 다듬기', color: 'blue', w: 140, h: 44, size: 13 });
        a.node('p2', BX, 146, { label: '+', color: 'gray', shape: 'circle', w: 26, h: 26, size: 15 });
        a.text(BX, 92, '다음 층으로', { size: 12, weight: 700, cls: 'muted' });
        a.edge([BX, 388], 'att');
        a.edge('att', 'p1');
        a.edge('p1', 'mlp');
        a.edge('mlp', 'p2');
        a.edge('p2', [BX, 104]);
        a.raw('path', { d: `M${BX} 364 H600 Q610 364 610 354 V272 Q610 262 600 262 H${BX + 16}`, class: 'edge ec-teal dashed', 'marker-end': 'url(#ah)' }, 'edge');
        a.raw('path', { d: `M${BX} 236 H600 Q610 236 610 226 V156 Q610 146 600 146 H${BX + 16}`, class: 'edge ec-teal dashed', 'marker-end': 'url(#ah)' }, 'edge');
        a.text(618, 312, '잔차 연결', { size: 11, weight: 700, color: 'teal', anchor: 'start' });
        a.text(618, 192, '잔차 연결', { size: 11, weight: 700, color: 'teal', anchor: 'start' });
        // 탑을 오르는 벡터
        const v = chip(a, '이유', TX, 394, 'violet', { h: 26 });
        const cols = ['violet', 'blue', 'teal', 'green'];
        let k = 0;
        for (const [id, y] of BL) {
          await a.move(v, [TX, y], k === 3 ? 700 : 420);
          a.hl(id, true);
          v.set(null, cols[k]);
          if (k === 0) {
            // 첫 블록에서 안쪽 흐름 보여 주기
            const w = chip(a, '', BX, 388, 'violet', { w: 14, h: 14 });
            const s = chip(a, '', BX, 364, 'teal', { w: 10, h: 10 });
            await a.par(a.move(w, ['att', 'p1'], 700), a.move(s, [[610, 364], [610, 262], [BX, 262]], 700));
            a.remove(s);
            const s2 = chip(a, '', BX, 236, 'teal', { w: 10, h: 10 });
            await a.par(a.move(w, ['mlp', 'p2', [BX, 104]], 800), a.move(s2, [[610, 236], [610, 146], [BX, 146]], 650));
            a.remove(s2);
            await a.fadeOut(w, 200);
          }
          await a.wait(150);
          a.hl(id, false);
          k++;
        }
        await a.move(v, [TX, 72], 400);
        a.caption('층을 지날수록 표현에 문맥이 더 많이 섞입니다');
        await a.wait(600);
      },
    },
    {
      t: '다음 단어 맞히기 — 확률',
      easy: '마지막 층을 거치면 모델은 "다음에 올 토큰"으로 어휘 전체의 후보마다 확률을 매겨요. 여기서는 "햇빛"이 41%로 가장 그럴듯하다고 봅니다. 모델이 하는 일은 결국 이 확률 표를 만드는 것이에요.',
      deep: '마지막 위치의 은닉 벡터에 출력 행렬을 곱해 어휘 크기만큼의 점수(logits)를 얻고, softmax로 확률(합 1)로 바꿉니다. 가장 높은 것을 고르면 그리디 디코딩, 확률에 따라 뽑으면 샘플링이며, 보통 top-k·top-p(누적 확률 p까지의 후보만 남김)로 꼬리의 엉뚱한 후보를 잘라 냅니다. 확률이 높다는 건 "학습한 글에서 그렇게 이어지는 경우가 많았다"는 뜻이지, 사실이 검증됐다는 뜻은 아닙니다.',
      async run(a) {
        wipe(a);
        const XS = [130, 194, 258, 322, 386, 450].map((x) => x - 30);
        TOK.forEach(([s, , c], i) => chip(a, s, XS[i] + 100, 46, c, { w: 52, h: 26, size: 12 }));
        a.node('m', 360, 116, { label: '언어 모델', sub: '다음 토큰의 확률 계산', color: 'violet', w: 220, h: 50, size: 14 });
        a.edge([360, 62], 'm');
        a.text(30, 172, '다음 토큰 후보', { size: 12, weight: 700, cls: 'muted', anchor: 'start' });
        const X0 = 150, SC = 500;
        const bars = CAND.map(([s, p], i) => {
          const y = 204 + i * 36;
          a.text(X0 - 12, y, s, { size: s.length > 3 ? 11.5 : 14, weight: 700, anchor: 'end', cls: i === 5 ? 'muted' : '' });
          const b = probBar(a, X0, y, 20, i === 5 ? 'gray' : 'blue', SC);
          const t = a.text(X0 + 8, y, '', { size: 12.5, mono: true, weight: 700, anchor: 'start' });
          return { b, t, p, y };
        });
        await a.tween(1100, (k) => bars.forEach((r) => {
          r.b.set(r.p * k);
          r.t.setAttribute('x', X0 + r.p * SC * k + 8);
          r.t.textContent = pct(r.p * k);
        }));
        await a.wait(300);
        bars[0].b.r.style.fill = 'var(--green)';
        const pick = chip(a, '햇빛', X0 + 0.41 * SC + 84, 204, 'green', { h: 30, size: 14 });
        await a.flash(pick);
        a.note('n1', 560, 312, '확률을 모두 더하면 1\n후보는 어휘 전체\n(수만~수십만 개)', { color: 'blue' });
        a.caption("가장 그럴듯한 '햇빛'을 고릅니다");
        await a.wait(800);
      },
    },
    {
      t: '한 조각씩 이어 쓰기 — 자기회귀 생성',
      easy: '고른 토큰 "햇빛"을 질문 뒤에 붙이고, 늘어난 글 전체를 다시 넣어 그다음 토큰을 예측해요. 이 과정을 반복하며 답이 한 조각씩 자라납니다. 답 전체를 미리 정해 두고 쓰는 게 아니에요.',
      deep: '자기회귀(autoregressive) 생성은 토큰 1개당 모델을 한 번 실행합니다. 이미 계산한 앞쪽 토큰의 K·V를 KV 캐시에 보관해 재사용하므로 새 토큰만 계산하지만, 답이 길수록 시간과 메모리가 늘어납니다. 특별한 종료 토큰(EOS)이 나오거나 최대 길이에 닿으면 멈추며, 응답이 글자 단위로 흘러나오는 스트리밍이 바로 이 구조 덕분입니다.',
      async run(a) {
        wipe(a);
        a.zone('ctx', 20, 34, 680, 136, { label: '지금까지의 글 (컨텍스트)', color: 'gray' });
        a.text(40, 78, '질문', { size: 12, weight: 700, cls: 'muted', anchor: 'start' });
        a.text(40, 128, '답', { size: 12, weight: 700, color: 'green', anchor: 'start' });
        TOK.forEach(([s, , c], i) => chip(a, s, 104 + i * 58, 78, c, { w: 50, h: 28, size: 12.5 }));
        a.node('m', 360, 286, { label: '언어 모델', sub: '다음 토큰 1개 예측', color: 'violet', w: 210, h: 56, size: 15 });
        a.edge([200, 176], 'm', { bend: 0.12, label: '전체를 다시 읽기', lx: -64, ly: 0 });
        a.edge('m', [560, 176], { bend: 0.12, color: 'green', label: '붙이기', lx: 40, ly: 0 });
        a.text(360, 222, '', { id: 'cnt', size: 12, mono: true, weight: 700, cls: 'muted' });
        let x = 78;
        for (let i = 0; i < ANS.length; i++) {
          const fast = i >= 2 ? 0.55 : 1;
          a.setText('cnt', `반복 ${i + 1}회차`);
          const c = chip(a, '', 200, 176, 'gray', { w: 14, h: 14 });
          await a.move(c, 'm', 380 * fast);
          a.remove(c);
          const s = ANS[i];
          const w = Math.max(30, s.length * 13 + 18);
          const tx = x + w / 2;
          x += w + 6;
          const p = chip(a, s, 360, 286, 'green', { h: 28, size: 12.5 });
          await a.move(p, [[560, 176], [tx, 128]], 520 * fast);
          await a.wait(80 * fast);
        }
        a.text(x + 8, 128, '…', { size: 16, weight: 800, color: 'green', anchor: 'start' });
        a.note('n1', 360, 394, "토큰 하나 예측 → 붙이기 → 다시 예측 …\n'끝' 토큰이 나오면 멈춥니다", { color: 'green' });
        await a.wait(800);
      },
    },
    {
      t: '온도 — 얼마나 모험할까',
      easy: '항상 1등만 고르면 답이 안정적이지만 늘 똑같아요. "온도"를 낮추면 1등 후보에 확률이 몰리고, 높이면 다른 후보에도 기회가 고르게 돌아가 답이 다양해지는 대신 엉뚱해질 위험도 커집니다.',
      deep: '온도 T는 softmax 전에 logits를 T로 나눕니다(p ∝ exp(zᵢ/T)). T→0이면 그리디에 가까워지고, T>1이면 분포가 평평해집니다. 같은 질문에 답이 매번 달라지는 이유가 이 샘플링이며, 정확성이 중요한 추출·코드 작업엔 낮은 온도, 브레인스토밍엔 높은 온도를 씁니다. 그림의 확률은 상위 5개 후보만 다시 정규화한 예시입니다.',
      async run(a) {
        wipe(a);
        const names = CAND.slice(0, 5).map((c) => c[0]);
        const base = temp(CAND.slice(0, 5).map((c) => c[1]), 1);
        const P = [
          { x: 22, T: 0.3, title: '낮은 온도 (T = 0.3)', color: 'blue', samp: ['햇빛', '햇빛', '햇빛', '햇빛', '햇빛'] },
          { x: 372, T: 1.6, title: '높은 온도 (T = 1.6)', color: 'red', samp: ['햇빛', '공기', '빛', '햇빛', '대기'] },
        ];
        const SC = 200;
        const panels = P.map((pn) => {
          a.zone('z' + pn.T, pn.x, 34, 326, 312, { label: pn.title, color: pn.color });
          const rows = names.map((s, i) => {
            const y = 82 + i * 34;
            a.text(pn.x + 58, y, s, { size: 13, weight: 700, anchor: 'end' });
            const b = probBar(a, pn.x + 68, y, 18, pn.color, SC);
            b.set(base[i]);
            const t = a.text(pn.x + 76 + base[i] * SC, y, pct(base[i]), { size: 12, mono: true, weight: 700, anchor: 'start' });
            return { b, t };
          });
          a.text(pn.x + 163, 268, '5번 뽑아 보면', { size: 11.5, cls: 'muted', weight: 700 });
          return { ...pn, rows, to: temp(base, pn.T) };
        });
        a.caption('처음엔 둘 다 같은 분포(T = 1)에서 시작합니다');
        await a.wait(700);
        await a.tween(1300, (k) => panels.forEach((pn) => pn.rows.forEach((r, i) => {
          const v = base[i] + (pn.to[i] - base[i]) * k;
          r.b.set(v);
          r.t.setAttribute('x', pn.x + 76 + v * SC);
          r.t.textContent = pct(v);
        })));
        a.caption('');
        for (let j = 0; j < 5; j++) {
          await a.par(...panels.map((pn) => {
            const s = pn.samp[j];
            const p = chip(a, s, pn.x + 163, 300, s === '햇빛' ? 'green' : 'amber', { h: 26, size: 12, hidden: true });
            return a.par(a.show(p, 200), a.move(p, [pn.x + 43 + j * 60, 300], 260));
          }));
        }
        a.note('n1', 360, 396, '정확해야 하는 일엔 낮게, 새 아이디어가 필요할 땐 높게', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '어떻게 배웠나 & 한계',
      easy: '모델은 책·웹 글 같은 엄청난 양의 글에서 "다음 토큰 맞히기"를 수없이 연습해 배웠고, 이후 질문에 도움이 되게 답하는 법을 따로 더 배웠어요. 그래서 그럴듯하지만 틀린 말을 할 수 있고, 한 번에 읽을 수 있는 양에 한계가 있으며, 배운 뒤의 새 소식은 검색 같은 도구를 붙여야 알 수 있어요.',
      deep: '사전학습은 수조 개 토큰 규모의 글에서 다음 토큰의 교차 엔트로피 손실을 줄이도록 경사 하강법으로 파라미터를 조정하는 과정입니다. 이어서 지시-응답 예시로 미세조정(SFT)하고, 사람이나 AI의 선호 피드백(RLHF, DPO 등)으로 더 도움 되고 안전한 답을 고르도록 다듬습니다. 모델은 질문받을 때 무언가를 "찾아보는" 게 아니라 가중치에 압축된 패턴으로 생성하므로, 최신·정확한 정보가 필요하면 검색 결과를 컨텍스트에 넣는 RAG나 도구 호출로 보완합니다.',
      async run(a) {
        wipe(a);
        a.text(130, 40, '책·웹 등 방대한 글', { size: 12, weight: 700, cls: 'muted' });
        a.node('pt', 130, 112, { label: '사전학습', sub: '다음 토큰 맞히기', color: 'blue', w: 190, h: 56, size: 14 });
        a.node('sft', 360, 112, { label: '지시 학습', sub: '질문-답 예시로', color: 'violet', w: 190, h: 56, size: 14 });
        a.node('rl', 590, 112, { label: '피드백 학습', sub: 'RLHF 등 선호 반영', color: 'green', w: 190, h: 56, size: 14 });
        a.edge('pt', 'sft');
        a.edge('sft', 'rl');
        // 사전학습 연습 한 번
        const q = chip(a, '하늘이 파란 이유는 ___', 130, 40, 'gray', { h: 24, size: 11.5, hidden: true });
        q.g.style.opacity = 1;
        await a.move(q, 'pt', 600);
        q.set('정답: 햇빛 → 가중치 조정', 'blue');
        await a.wait(500);
        await a.fadeOut(q, 250);
        a.badge('pt', '수조 토큰', 'amber');
        a.hl('pt', true);
        await a.send('pt', 'sft', '', { color: 'violet', w: 16, dur: 500 });
        a.hl('sft', true);
        await a.send('sft', 'rl', '', { color: 'green', w: 16, dur: 500 });
        a.hl('rl', true);
        await a.wait(300);
        a.zone('lim', 20, 186, 680, 238, { label: '한계와 보완', color: 'red' });
        const LIM = [
          ['h1', 130, '환각', '그럴듯하지만 틀린 말', 'red', '출처 확인·검증'],
          ['h2', 360, '컨텍스트 창', '한 번에 읽는 양 제한', 'amber', '넘치면 못 읽음'],
          ['h3', 590, '지식 시점', '학습 뒤 소식은 모름', 'gray', '검색·도구로 보완'],
        ];
        for (const [id, x, l, s, c, fix] of LIM) {
          a.node(id, x, 268, { label: l, sub: s, color: c, w: 196, h: 60, size: 14, hidden: true });
          await a.show(id, 300);
          a.edge(id, [x, 342], { color: id === 'h3' ? 'green' : c });
          a.note('f' + id, x, 362, fix, { color: id === 'h3' ? 'green' : c });
          await a.wait(250);
        }
        a.caption('모델은 "찾아보지" 않아요 — 배운 패턴으로 그럴듯한 다음 토큰을 생성합니다');
        await a.wait(800);
      },
    },
  ],
  quiz: [
    {
      q: 'LLM이 질문 문장을 처리하기 전에 가장 먼저 하는 일은 무엇일까요?',
      c: ['인터넷에서 비슷한 질문을 검색한다', '문장을 토큰으로 자르고 번호로 바꾼다', '문장 전체를 그림으로 바꾼다', '정답이 저장된 표에서 찾아본다'],
      a: 1,
      why: '모델은 글자를 직접 다루지 못해서, 먼저 토크나이저가 문장을 토큰으로 자르고 각 토큰을 번호로 바꿉니다.',
      step: 0,
    },
    {
      q: '온도(temperature)를 낮추면 어떻게 될까요?',
      c: ['모델이 더 많은 정보를 기억한다', '후보들의 확률이 고르게 평평해진다', '1등 후보에 확률이 몰려 답이 더 일관된다', '답을 만드는 속도가 크게 빨라진다'],
      a: 2,
      why: '낮은 온도는 분포를 뾰족하게 만들어 가장 그럴듯한 후보가 거의 매번 뽑힙니다. 평평해지는 건 온도를 높였을 때입니다.',
      step: 6,
    },
    {
      q: '답을 생성하는 디코더 모델의 어텐션에 대한 설명으로 옳은 것은?',
      c: ['각 토큰은 자기와 그 앞의 토큰만 참고할 수 있다(인과 마스크)', '각 토큰은 문장 뒤쪽 토큰만 참고한다', '가중치는 사람이 토큰마다 직접 정해 준다', '한 번에 토큰 하나만 다른 토큰 하나를 볼 수 있다'],
      a: 0,
      why: '디코더는 인과 마스크로 미래 토큰을 가립니다. 가중치는 Q·K로 계산되어 합이 1이 되고, 여러 헤드가 모든 위치를 동시에 계산합니다.',
      step: 2,
    },
  ],
};

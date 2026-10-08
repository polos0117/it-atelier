// 0과 1: 전구 스위치(비트) → 바이트와 2진수 → 글자(ASCII·UTF-8) → 색(RGB 픽셀) → 소리(샘플링) → 단위(KB·MB·GB)
// 단계마다 무대를 새로 그린다. 그림·파형·값은 모두 고정된 예시다.
const PV = [128, 64, 32, 16, 8, 4, 2, 1];
const mix = (c, p) => `color-mix(in srgb, var(--${c}) ${p}%, var(--stage))`;

function wipe(a, title) {
  a.clear('pkt', 'top', 'node', 'zone');
  a.setText('title', title);
}
function fadeIn(a, el, dur = 300) {
  el.style.opacity = 0;
  return a.tween(dur, (t) => (el.style.opacity = t));
}

/** 전구 칸 하나(비트 하나). s = 크기 배율. 반환: { set(on) } */
function bit(a, x, y, o = {}) {
  const s = o.s || 1;
  const g = a.raw('g', { transform: `translate(${x} ${y}) scale(${s})` }, 'pkt');
  const box = a.raw('rect', { x: -27, y: -34, width: 54, height: 68, rx: 10 }, g);
  const bulb = a.raw('circle', { cx: 0, cy: -10, r: 13 }, g);
  const dig = a.text(0, 19, '0', { par: g, size: 19, weight: 800 });
  const b = { g, x, y, on: false };
  b.set = (on) => {
    b.on = on;
    box.style.fill = on ? mix('amber', 22) : 'var(--stage)';
    box.style.stroke = on ? 'var(--amber)' : 'var(--line2)';
    box.style.strokeWidth = 2;
    bulb.style.fill = on ? 'var(--amber)' : 'var(--line2)';
    if (on) bulb.setAttribute('filter', 'url(#glow)'); else bulb.removeAttribute('filter');
    dig.textContent = on ? '1' : '0';
    dig.setAttribute('class', 'tx mono ' + (on ? 'tc-amber' : 'muted'));
  };
  b.set(!!o.on);
  return b;
}
/** 8칸 한 줄. 반환: 칸 배열 + setVal(v) */
function byteRow(a, cx, y, o = {}) {
  const pitch = o.pitch || 70, s = o.s || 1;
  const cells = PV.map((_, i) => bit(a, cx + (i - 3.5) * pitch, y, { s }));
  if (o.pv) PV.forEach((v, i) => a.text(cx + (i - 3.5) * pitch, y - 34 * s - 14, String(v), { size: o.pvSize || 12.5, mono: true, cls: 'muted', layer: 'pkt' }));
  cells.setVal = (v) => PV.forEach((p, i) => cells[i].set((v & p) !== 0));
  return cells;
}
const bin8 = (v) => v.toString(2).padStart(8, '0');

// 픽셀 그림(10×8): S 하늘, Y 해(255,200,0), G 땅
const PIX = ['SSSSSSSSSS', 'SSSSSSYYSS', 'SSSSSYYYYS', 'SSSSSYYYYS', 'SSSSSSYYSS', 'SSSSSSSSSS', 'GGGGGGGGGG', 'GGGGGGGGGG'];
const PCOL = { S: 'rgb(100,170,250)', Y: 'rgb(255,200,0)', G: 'rgb(60,170,90)' };
const PX0 = 40, PY0 = 96, PC = 26;

// 소리 파형(고정)과 표본
const TAU = 2 * Math.PI;
const WAVE = (x) => 0.62 * Math.sin((TAU * (x - 50)) / 290) + 0.3 * Math.sin((TAU * (x - 50)) / 118 + 1) + 0.08 * Math.sin((TAU * (x - 50)) / 47);
const BASE = 190, AMP = 100;
const SX = Array.from({ length: 15 }, (_, i) => 70 + i * 40);

export default {
  id: 'bits',
  level: 1,
  cat: '컴퓨터 기초',
  title: '0과 1 — 글자·색·소리가 비트가 되기까지',
  sub: '컴퓨터는 켜짐과 꺼짐, 두 가지밖에 모른다. 그런데 어떻게 글자와 사진과 노래를 담을까?',
  analogy: '컴퓨터 속은 전구 스위치가 끝없이 늘어선 방과 같습니다. 스위치 하나로는 "켜짐/꺼짐" 두 가지만 말할 수 있지만, 여러 개를 줄 세우고 "이 무늬는 A, 저 무늬는 노란색"처럼 약속을 정하면 무엇이든 적을 수 있어요. 점과 선 두 가지로 모든 글자를 보내는 모스 부호와 같은 원리입니다.',
  keys: [
    '비트는 0 또는 1 하나를 담는 가장 작은 단위다. 비트 n개로는 2ⁿ가지를 구분할 수 있다.',
    '비트 8개를 묶은 것이 1바이트다. 자릿값 128·64·32·16·8·4·2·1을 더해 0~255를 나타낸다.',
    '글자는 약속된 번호로 저장된다. 영어 A는 65(01000001)이고, 한글 "가"는 UTF-8에서 3바이트(EA B0 80)다.',
    '사진은 픽셀의 모음이고, 픽셀 하나는 빨강·초록·파랑 세 값(각 1바이트)으로 색을 낸다. 소리는 파형을 1초에 수만 번 재서 숫자로 바꾼다.',
    'KB·MB·GB는 대략 1,000배씩 커진다. 사진 한 장은 3~6MB, 노래 한 곡은 약 4MB, 1GB면 노래 약 250곡이다.',
  ],
  terms: [
    ['비트(bit)', '0 또는 1 하나. 컴퓨터가 다루는 정보의 가장 작은 단위'],
    ['바이트(byte)', '비트 8개 묶음. 0~255(256가지)를 나타낼 수 있다'],
    ['2진수', '0과 1 두 숫자만 쓰는 수. 자릿값이 오른쪽부터 1·2·4·8…로 두 배씩 커진다'],
    ['16진수', '0~9와 A~F를 쓰는 수. 한 자리가 비트 4개라 1바이트를 두 자리(예: FF)로 짧게 적는다'],
    ['유니코드·UTF-8', '세상 모든 글자에 번호를 붙인 표(유니코드)와, 그 번호를 1~4바이트로 저장하는 방법(UTF-8)'],
    ['픽셀·RGB', '화면을 이루는 작은 점과, 그 점의 색을 정하는 빨강·초록·파랑 세 값'],
    ['샘플링', '연속된 소리 파형을 일정한 간격으로 재서 숫자 목록으로 바꾸는 일'],
  ],
  quiz: [
    { q: '비트 8개를 한 묶음으로 부르는 이름은 무엇일까요?', c: ['1바이트', '1킬로바이트', '1픽셀', '1헤르츠'], a: 0, why: '비트 8개가 1바이트입니다. 1바이트로 0~255, 모두 256가지를 나타낼 수 있어요.', step: 1 },
    { q: '영어 A는 1바이트(65)로 저장됩니다. 한글 "가"는 UTF-8에서 몇 바이트일까요?', c: ['1바이트', '2바이트', '3바이트', '4바이트'], a: 2, why: '"가"(U+AC00)는 UTF-8에서 EA B0 80, 3바이트로 저장됩니다. UTF-8은 글자에 따라 1~4바이트를 쓰는 가변 길이 방식입니다.', step: 2 },
    { q: 'CD 음질(44.1kHz, 16비트, 스테레오) 소리 1초를 압축 없이 저장하면 대략 몇 바이트일까요?', c: ['약 44KB', '약 176KB', '약 1.4MB', '약 16KB'], a: 1, why: '44,100번 × 2바이트(16비트) × 2채널 = 176,400바이트입니다. 비트로는 약 1.4Mbps라서, MP3·AAC는 이를 128~320kbps로 줄여 저장합니다.', step: 4 },
  ],
  setup(a) {
    a.text(360, 28, '', { id: 'title', size: 16, weight: 800, layer: 'edge' });
  },
  steps: [
    {
      t: '전구 하나 = 비트 하나',
      easy: '컴퓨터 안의 아주 작은 스위치는 켜지거나 꺼지는 두 가지 상태만 가집니다. 꺼짐을 0, 켜짐을 1이라고 약속하면 스위치 하나가 "비트" 하나예요. 스위치를 여러 개 모으면 나타낼 수 있는 경우가 두 배씩 늘어납니다.',
      deep: '디지털 회로는 전압이 기준보다 높으면 1, 낮으면 0으로 읽습니다(트랜지스터의 on/off). 두 상태만 쓰기 때문에 잡음에 강하고 복사해도 값이 변하지 않습니다. 비트 n개로 구분할 수 있는 경우의 수는 2ⁿ이라, 1개 2가지 → 2개 4가지 → 8개 256가지가 됩니다.',
      async run(a) {
        wipe(a, '스위치 하나 = 비트 하나');
        const b = bit(a, 190, 186, { s: 2 });
        a.text(190, 282, '전구(스위치) 1개', { size: 13, cls: 'muted', layer: 'pkt' });
        const off = a.text(440, 154, '꺼짐 → 0', { size: 24, weight: 800, layer: 'pkt' });
        const on = a.text(440, 214, '켜짐 → 1', { size: 24, weight: 800, layer: 'pkt' });
        const mark = (v) => {
          off.setAttribute('class', 'tx ' + (v ? 'muted' : 'tc-blue'));
          on.setAttribute('class', 'tx ' + (v ? 'tc-amber' : 'muted'));
        };
        mark(0);
        a.caption('딸깍! 켜면 1, 끄면 0');
        for (const v of [1, 0, 1, 0, 1]) {
          await a.wait(420);
          b.set(!!v);
          mark(v);
        }
        const lines = ['1개 → 2가지 (0, 1)', '2개 → 4가지 (00, 01, 10, 11)', '8개 → 256가지!'];
        for (let i = 0; i < lines.length; i++) {
          const t = a.text(360, 332 + i * 30, lines[i], { size: 15, weight: i === 2 ? 800 : 600, color: i === 2 ? 'amber' : null, layer: 'pkt' });
          await fadeIn(a, t, 320);
          await a.wait(220);
        }
        a.caption('스위치가 하나 늘 때마다 경우의 수가 두 배');
        await a.wait(400);
      },
    },
    {
      t: '8개를 모으면 1바이트 — 2진수로 세기',
      easy: '비트 8개를 한 줄로 세운 묶음을 "바이트"라고 불러요. 칸마다 자릿값(128, 64 … 2, 1)이 있어서, 켜진 칸의 값을 더하면 숫자가 됩니다. 예를 들어 4와 1만 켜면 00000101 = 5예요.',
      deep: '2진수의 자릿값은 2⁷…2⁰입니다. 부호 있는 정수는 보통 2의 보수로 저장합니다. 맨 앞 비트에 −128의 가중치를 주는 방식으로, −5는 5(00000101)를 뒤집고 1을 더한 11111011이고 범위는 −128~127입니다. 덕분에 덧셈 회로 하나로 뺄셈까지 할 수 있지만, 127에 1을 더하면 −128이 되는 오버플로가 생깁니다.',
      async run(a) {
        wipe(a, '비트 8개 = 1바이트');
        const row = byteRow(a, 360, 168, { pv: true });
        a.text(360, 96, '자릿값', { size: 11.5, cls: 'muted', layer: 'pkt' });
        const dec = a.text(360, 268, '= 0', { size: 34, weight: 800, mono: true, layer: 'pkt' });
        a.caption('0부터 하나씩 세어 볼게요');
        for (let v = 0; v <= 5; v++) {
          row.setVal(v);
          a.setText(dec, '= ' + v);
          await a.wait(520);
        }
        const p4 = a.text(row[5].x, 224, '4', { size: 15, weight: 800, color: 'amber', layer: 'pkt' });
        const p1 = a.text(row[7].x, 224, '1', { size: 15, weight: 800, color: 'amber', layer: 'pkt' });
        await a.par(fadeIn(a, p4), fadeIn(a, p1));
        a.setText(dec, '4 + 1 = 5');
        dec.setAttribute('class', 'tx mono tc-amber');
        a.caption('켜진 칸의 자릿값을 더하면 끝');
        await a.wait(500);
        a.note('n255', 360, 362, '8칸을 모두 켜면 128+64+…+1 = 255\n→ 1바이트로 0~255, 256가지를 나타내요', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '글자 — 글자마다 번호가 있다',
      easy: '컴퓨터는 글자를 그림이 아니라 번호로 기억해요. 약속된 표에서 A는 65번이라서 01000001로 저장됩니다. 한글 "가"는 글자 수가 훨씬 많은 표(유니코드)를 쓰기 때문에 바이트 3개가 필요해요.',
      deep: 'ASCII는 7비트(0~127)로 영문·숫자·기호를 정의하며 A=65=0x41입니다. 16진수 한 자리가 4비트라 1바이트는 두 자리로 적습니다. 유니코드는 글자마다 번호(코드 포인트)를 주고, UTF-8은 이를 1~4바이트 가변 길이로 저장합니다. ASCII는 1바이트 그대로, "가"(U+AC00)는 1110xxxx 10xxxxxx 10xxxxxx 틀에 넣어 EA B0 80, 이모지는 4바이트입니다. 옛 EUC-KR(CP949)은 한글을 2바이트로 저장해서, 인코딩을 잘못 고르면 글자가 깨집니다.',
      async run(a) {
        wipe(a, '글자는 번호로 저장된다');
        a.text(24, 66, '영어 — ASCII, 1바이트', { size: 13, weight: 700, anchor: 'start', color: 'blue', layer: 'pkt' });
        a.node('gA', 70, 128, { label: 'A', w: 68, h: 68, size: 34, color: 'blue' });
        a.text(70, 180, 'B=66 · a=97', { size: 11.5, mono: true, cls: 'muted', layer: 'pkt' });
        await a.flash('gA');
        const ar1 = a.text(128, 128, '→', { size: 22, cls: 'muted', layer: 'pkt' });
        const n65 = a.text(176, 128, '65번', { size: 22, weight: 800, mono: true, color: 'blue', layer: 'pkt' });
        await a.par(fadeIn(a, ar1), fadeIn(a, n65));
        a.text(226, 128, '→', { size: 22, cls: 'muted', layer: 'pkt' });
        const row = byteRow(a, 412, 128, { pitch: 40, s: 0.62, pv: true, pvSize: 10.5 });
        a.caption('65 = 64 + 1 → 01000001');
        await a.wait(300);
        row[1].set(true);
        await a.wait(300);
        row[7].set(true);
        const hx = a.text(640, 128, '16진수 41', { size: 13, mono: true, cls: 'muted', layer: 'pkt' });
        await fadeIn(a, hx);
        await a.wait(400);

        a.text(24, 236, '한글 — 유니코드(UTF-8), 3바이트', { size: 13, weight: 700, anchor: 'start', color: 'green', layer: 'pkt' });
        a.node('gGa', 70, 300, { label: '가', w: 68, h: 68, size: 30, color: 'green' });
        await a.flash('gGa');
        a.text(128, 300, '→', { size: 22, cls: 'muted', layer: 'pkt' });
        const u = a.text(186, 300, 'U+AC00', { size: 17, weight: 800, mono: true, color: 'green', layer: 'pkt' });
        a.text(186, 322, '유니코드 번호', { size: 11, cls: 'muted', layer: 'pkt' });
        await fadeIn(a, u);
        a.text(244, 300, '→', { size: 22, cls: 'muted', layer: 'pkt' });
        a.caption('"가"는 바이트 3개로 나눠 저장해요');
        const B3 = [['EA', '11101010'], ['B0', '10110000'], ['80', '10000000']];
        for (let i = 0; i < 3; i++) {
          a.node('b' + i, 328 + i * 110, 300, { label: B3[i][0], sub: B3[i][1], w: 100, h: 58, size: 20, color: 'green', hidden: true });
          await a.show('b' + i, 300);
          await a.wait(150);
        }
        a.note('nu', 360, 396, '글자마다 길이가 달라요: 영어 1바이트 · 한글 3바이트 · 이모지 4바이트', { color: 'green' });
        await a.wait(600);
      },
    },
    {
      t: '색 — 픽셀 하나는 3바이트',
      easy: '사진을 아주 크게 확대하면 작은 네모 점(픽셀)들이 보여요. 점 하나의 색은 빨강·초록·파랑을 얼마나 섞을지 세 숫자(0~255)로 정합니다. 빨강 255, 초록 200, 파랑 0이면 노란색이에요. 숫자 하나가 1바이트니까 점 하나에 3바이트가 듭니다.',
      deep: '채널당 8비트, 픽셀당 24비트(트루컬러)라 2²⁴ ≈ 1,677만 가지 색을 냅니다. 웹에서는 16진수로 #FFC800처럼 적고, 투명도(알파)를 더하면 RGBA 32비트입니다. 1920×1080 화면 한 장은 6,220,800바이트 ≈ 6.2MB인데, JPEG는 눈이 덜 민감한 미세한 무늬·색 차이를 버리는 손실 압축(DCT)으로 약 1/10까지 줄이고, PNG는 하나도 버리지 않는 무손실 압축을 씁니다.',
      async run(a) {
        wipe(a, '사진은 픽셀, 픽셀은 숫자 3개');
        a.text(PX0 + 130, 74, '확대한 사진 (10×8 픽셀)', { size: 12, cls: 'muted', layer: 'pkt' });
        const cells = [];
        PIX.forEach((row, r) => [...row].forEach((ch, c) => {
          const e = a.raw('rect', { x: PX0 + c * PC, y: PY0 + r * PC, width: PC - 2, height: PC - 2, rx: 3, style: `fill:${PCOL[ch]}; opacity:0` }, 'pkt');
          cells.push([r, e]);
        }));
        await a.tween(1100, (t) => cells.forEach(([r, e]) => (e.style.opacity = Math.max(0, Math.min(1, t * 9 - r)))), { linear: true });
        const pr = 2, pc = 6;
        const px = PX0 + pc * PC + (PC - 2) / 2, py = PY0 + pr * PC + (PC - 2) / 2;
        const sel = a.raw('rect', { x: px - 15, y: py - 15, width: 30, height: 30, rx: 4, style: 'fill:none; stroke: var(--node-ink); stroke-width: 3' }, 'pkt');
        await fadeIn(a, sel, 300);
        a.caption('이 점 하나를 확대해 보면…');
        const ln = a.raw('line', { x1: px + 15, y1: py, x2: 352, y2: 168, class: 'edge dashed' }, 'pkt');
        await fadeIn(a, ln, 300);
        const sw = a.raw('rect', { x: 352, y: 126, width: 84, height: 84, rx: 10, style: `fill:${PCOL.Y}; stroke: var(--node-ink); stroke-width: 2` }, 'pkt');
        await fadeIn(a, sw, 300);
        a.text(394, 112, '픽셀 하나', { size: 12, cls: 'muted', layer: 'pkt' });
        a.text(394, 228, '#FFC800', { size: 13, mono: true, cls: 'muted', layer: 'pkt' });
        a.text(462, 112, '빨강·초록·파랑 = 3바이트', { size: 12.5, weight: 700, anchor: 'start', layer: 'pkt' });
        const RGB = [['R', '255', '11111111', 'red'], ['G', '200', '11001000', 'green'], ['B', '0', '00000000', 'blue']];
        for (let i = 0; i < 3; i++) {
          const y = 142 + i * 30;
          const parts = [
            a.text(466, y, RGB[i][0], { size: 16, weight: 800, color: RGB[i][3], layer: 'pkt' }),
            a.text(522, y, RGB[i][1], { size: 16, weight: 800, mono: true, anchor: 'end', layer: 'pkt' }),
            a.text(540, y, RGB[i][2], { size: 14, mono: true, cls: 'muted', anchor: 'start', layer: 'pkt' }),
          ];
          await a.par(...parts.map((p) => fadeIn(a, p, 280)));
          await a.wait(200);
        }
        a.caption('빨강 255 + 초록 200 + 파랑 0 = 노랑');
        await a.wait(300);
        a.note('npx', 360, 364, '화면 한 장(1920×1080) = 픽셀 약 207만 개 × 3바이트 ≈ 6MB', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '소리 — 파형을 잘게 재서 숫자로',
      easy: '소리는 공기의 떨림이고, 그림으로 그리면 구불구불한 물결(파형)이에요. 컴퓨터는 이 물결의 높이를 아주 짧은 간격으로 재서 숫자 목록으로 적어 둡니다. 다시 틀 때는 숫자대로 스피커를 떨게 하면 소리가 돌아와요.',
      deep: '샘플링 주파수 44.1kHz는 1초에 44,100번 잰다는 뜻입니다. 나이퀴스트 정리에 따라 사람이 듣는 최고 약 20kHz의 두 배 넘게 재야 원래 소리를 되살릴 수 있습니다. 16비트 깊이는 높이를 65,536단계로 나누고, 스테레오 1초는 44,100 × 2바이트 × 2채널 = 176,400바이트(≈1.4Mbps)입니다. MP3·AAC는 사람이 잘 못 듣는 소리를 덜어 내는 손실 압축으로 이를 128~320kbps까지 줄입니다.',
      async run(a) {
        wipe(a, '소리를 숫자로 — 샘플링');
        a.text(50, 76, '소리 = 공기의 떨림(파형)', { size: 12.5, cls: 'muted', anchor: 'start', layer: 'pkt' });
        a.raw('line', { x1: 50, y1: BASE, x2: 670, y2: BASE, class: 'edge' }, 'pkt');
        a.text(670, 76, '시간 →', { size: 12.5, cls: 'muted', anchor: 'end', layer: 'pkt' });
        const wave = a.raw('path', { class: 'edge ec-blue', style: 'stroke-width: 3' }, 'pkt');
        const pts = [];
        for (let x = 50; x <= 660; x += 4) pts.push([x, BASE - WAVE(x) * AMP]);
        await a.tween(1300, (t) => {
          const n = Math.max(2, Math.round(pts.length * t));
          wave.setAttribute('d', 'M' + pts.slice(0, n).map((p) => p.join(' ')).join(' L'));
        }, { linear: true });
        a.caption('일정한 간격으로 높이를 재요');
        const vals = SX.map((x) => Math.round(WAVE(x) * 9));
        for (let i = 0; i < SX.length; i++) {
          const x = SX[i], y = BASE - WAVE(x) * AMP;
          a.raw('line', { x1: x, y1: BASE, x2: x, y2: y, class: 'edge dashed ec-amber' }, 'pkt');
          a.raw('circle', { cx: x, cy: y, r: 5, style: 'fill: var(--amber)' }, 'pkt');
          a.text(x, 318, String(vals[i]), { size: 13.5, weight: 700, mono: true, color: 'amber', layer: 'pkt' });
          await a.wait(90);
        }
        a.text(360, 296, '↓ 잰 값', { size: 11.5, cls: 'muted', layer: 'pkt' });
        let d = `M${SX[0]} ${BASE - vals[0] * (AMP / 9)}`;
        for (let i = 1; i < SX.length; i++) d += ` H${SX[i]} V${BASE - vals[i] * (AMP / 9)}`;
        d += ` H${SX[SX.length - 1] + 40}`;
        const stair = a.raw('path', { d, class: 'edge ec-amber', style: 'stroke-width: 2; opacity: 0' }, 'pkt');
        await a.tween(500, (t) => (stair.style.opacity = t * 0.85));
        a.caption('숫자만 있으면 소리를 다시 만들 수 있어요');
        a.note('nhz', 360, 376, 'CD 음질은 1초에 44,100번 재요 (44.1kHz)', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '단위 — KB·MB·GB 감 잡기',
      easy: '바이트가 1,000개 모이면 1KB(킬로바이트), 다시 1,000배마다 MB(메가), GB(기가), TB(테라)가 됩니다. 스마트폰 사진 한 장이 3~6MB, 노래 한 곡이 약 4MB라서, 1GB면 노래를 약 250곡 담을 수 있어요.',
      deep: '저장장치 회사는 SI 단위(1KB = 1,000B)를 쓰지만, 운영체제는 1,024배(KiB·MiB·GiB)로 계산하면서도 KB·GB라고 표시하는 경우가 많아, 1TB 디스크가 약 931GB로 보입니다. 통신 속도는 비트 단위라 100Mbps는 초당 12.5MB입니다. 노래 4MB는 128kbps MP3 약 4분 분량이고, 사진이 수 MB인 것은 원본(약 36MB, 1,200만 화소 × 3바이트)을 JPEG로 압축한 덕분입니다.',
      async run(a) {
        wipe(a, '얼마나 클까? — 단위의 감');
        const U = [['1 B', '글자 A 하나', 'gray'], ['1 KB', '영문 약 1,000자', 'blue'], ['1 MB', '사진 한 장 ≈ 3~6MB', 'teal'], ['1 GB', '노래 약 250곡', 'amber'], ['1 TB', '고화질 영화 수백 편', 'pink']];
        for (let i = 0; i < U.length; i++) {
          const y = 84 + i * 66;
          const parts = [
            a.text(30, y, U[i][0], { size: 20, weight: 800, mono: true, anchor: 'start', color: U[i][2], layer: 'pkt' }),
            a.text(116, y, U[i][1], { size: 13.5, anchor: 'start', layer: 'pkt' }),
          ];
          if (i) parts.push(a.text(40, y - 33, '↓ ×1,000', { size: 10.5, mono: true, cls: 'muted', anchor: 'start', layer: 'pkt' }));
          await a.par(...parts.map((p) => fadeIn(a, p, 260)));
          await a.wait(140);
        }
        // 오른쪽: 노래 250곡 = 1GB
        const GX = 404, GY = 140, GP = 12;
        a.text(GX + 150, 112, '한 칸 = 노래 한 곡(약 4MB)', { size: 13, weight: 700, layer: 'pkt' });
        const sq = [];
        for (let i = 0; i < 250; i++) {
          sq.push(a.raw('rect', { x: GX + (i % 25) * GP, y: GY + Math.floor(i / 25) * GP, width: GP - 2.5, height: GP - 2.5, rx: 2, style: 'fill: none; stroke: var(--line2); stroke-width: 1' }, 'pkt'));
        }
        a.caption('노래를 하나씩 채워 볼게요…');
        let filled = 0;
        await a.tween(1700, (t) => {
          const n = Math.round(t * 250);
          for (; filled < n; filled++) { sq[filled].style.fill = 'var(--amber)'; sq[filled].style.stroke = 'var(--amber)'; }
        }, { linear: true });
        const sum = a.text(GX + 150, 280, '250곡 × 4MB = 1,000MB ≈ 1GB', { size: 15, weight: 800, color: 'amber', layer: 'pkt' });
        await fadeIn(a, sum);
        a.text(GX + 150, 306, '사진(약 4MB)으로 쳐도 약 250장', { size: 12, cls: 'muted', layer: 'pkt' });
        a.caption('1GB = 노래 약 250곡');
        await a.wait(700);
      },
    },
  ],
};

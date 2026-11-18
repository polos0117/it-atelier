// IP 주소와 서브넷: 주소의 생김새 → 마스크로 같은 동 판단 → 게이트웨이 → /16 /24 /28 크기
// → 사설·공인 IP → DHCP 자동 설정 → IPv6와 정리
// 단계마다 무대를 새로 그린다. 주소는 모두 사설 대역·문서용 대역 예시다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: o.round ?? 7, h: o.h || 28, w: o.w, size: o.size || 12.5, id: o.id, hidden: o.hidden });
}
/** 비트 칸 하나(raw rect + 글자) */
function bitCell(a, x, y, w, h, color, s, o = {}) {
  const g = a.raw('g', { transform: `translate(${x} ${y})`, class: `c-${color}` }, o.layer || 'node');
  const r = a.raw('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 3, style: `fill: color-mix(in srgb, var(--c) ${o.tint ?? 22}%, var(--stage)); stroke: var(--c); stroke-width: 1` }, g);
  if (s != null) a.text(0, 0, s, { par: g, size: o.size || 10.5, mono: true, weight: 700 });
  if (o.hidden) g.style.opacity = 0;
  return { g, r, x, y };
}
const bin8 = (n) => n.toString(2).padStart(8, '0');

// 마스크 비트 칸 배치(2단계): 칸 간격 14, 옥텟 사이 6 더
const BX0 = 140;
const bx = (i) => BX0 + 6 + i * 14 + Math.floor(i / 8) * 6;
const oct = (k) => BX0 + 6 + (k * 8 + 3.5) * 14 + k * 6; // 옥텟 k의 가운데
const ROWS = [
  ['노트북', '내 기기', [192, 168, 0, 10], 'same'],
  ['프린터', '', [192, 168, 0, 25], 'same'],
  ['다른 PC', '', [192, 168, 1, 5], 'diff'],
];

// 크기 비교(4단계)
const SIZES = [
  ['/16', '255.255.0.0', 16, '주소 65,536개', '기기 65,534대'],
  ['/24', '255.255.255.0', 24, '주소 256개', '기기 254대'],
  ['/28', '255.255.255.240', 28, '주소 16개', '기기 14대'],
];
const sx = (i) => 140 + i * 11 + Math.floor(i / 8) * 4;

export default {
  id: 'subnet',
  level: 2,
  cat: '네트워크',
  title: 'IP 주소와 서브넷 — 네트워크의 동·호수',
  sub: 'IP 주소의 앞부분은 "어느 동", 뒷부분은 "몇 호"다. 서브넷 마스크가 그 경계를 정한다.',
  analogy: '아파트 주소 "101동 1004호"와 같습니다. 같은 동 안에서는 복도로 바로 찾아가지만, 다른 동에 가려면 동 출입구로 나가야 하죠. IP 주소도 앞부분(네트워크 = 동)과 뒷부분(호스트 = 호수)으로 나뉘고, 다른 동으로 갈 때는 출입구 역할의 게이트웨이(공유기·라우터)를 거칩니다.',
  keys: [
    'IPv4 주소는 0~255 숫자 4칸(각 8비트, 모두 32비트)으로 된 기기 주소다.',
    '서브넷 마스크(/24 등)는 주소 중 앞 몇 비트가 "동 번호(네트워크)"인지 정한다. 동 번호가 같으면 같은 네트워크라 바로 통신한다.',
    '다른 네트워크로 갈 때는 기본 게이트웨이(공유기·라우터)에게 먼저 보낸다.',
    '/24는 주소 256개 중 네트워크 주소와 브로드캐스트 주소를 뺀 254개를 기기에 줄 수 있다. 숫자가 커질수록 동이 작아진다.',
    '집·회사 안은 사설 IP를 쓰고 공유기가 NAT로 공인 IP로 바꿔 내보내며, 주소·마스크·게이트웨이·DNS는 보통 DHCP가 자동으로 나눠 준다.',
  ],
  terms: [
    ['IP 주소', '네트워크에서 기기(정확히는 네트워크 카드)를 찾아가는 주소. 예: 192.168.0.10'],
    ['서브넷 마스크', '주소 중 네트워크(동) 부분이 어디까지인지 표시하는 값. 255.255.255.0 = /24'],
    ['CIDR 표기', '/24처럼 앞에서부터 네트워크 부분의 비트 수를 적는 방식'],
    ['기본 게이트웨이', '다른 네트워크로 나갈 때 거치는 출입구. 집에서는 공유기'],
    ['브로드캐스트 주소', '같은 네트워크 전체에 한 번에 보내는 주소. /24에서는 끝이 .255'],
    ['사설 IP', '집·회사 안에서만 쓰는 주소(10.x, 172.16~31.x, 192.168.x). 인터넷에서 직접 통하지 않는다'],
    ['DHCP', '기기가 네트워크에 붙으면 주소·마스크·게이트웨이·DNS를 자동으로 빌려주는 방식'],
    ['IPv6', '128비트 주소 체계. 주소가 사실상 무한에 가깝게 많다. 예: 2001:db8::10'],
  ],
  quiz: [
    {
      q: '서브넷 마스크가 /24(255.255.255.0)일 때, 192.168.0.10과 같은 네트워크(같은 동)에 있는 주소는?',
      c: ['192.168.1.10', '192.168.0.200', '192.169.0.10', '10.168.0.10'],
      a: 1,
      why: '/24는 앞 세 칸(192.168.0)이 동 번호입니다. 192.168.0.200은 앞 세 칸이 같으니 같은 동이고, 나머지는 셋째 칸이나 앞칸이 달라 다른 동입니다.',
      step: 1,
    },
    {
      q: '내 PC(192.168.0.10/24)가 192.168.1.5로 데이터를 보낼 때, 먼저 보내는 곳은?',
      c: ['DNS 서버', '192.168.1.5에게 직접', '브로드캐스트 주소 192.168.0.255', '기본 게이트웨이(공유기·라우터)'],
      a: 3,
      why: '192.168.1.5는 동 번호(192.168.1)가 달라 다른 네트워크입니다. 다른 동으로 가는 데이터는 출입구인 기본 게이트웨이에게 맡깁니다.',
      step: 2,
    },
    {
      q: '/26(255.255.255.192) 서브넷 하나에서 기기에 줄 수 있는 주소는 몇 개일까요?',
      c: ['62개', '64개', '126개', '254개'],
      a: 0,
      why: '호스트 비트가 32 − 26 = 6개라 주소는 2⁶ = 64개이고, 네트워크 주소와 브로드캐스트 주소 2개를 빼면 62개입니다.',
      step: 3,
    },
  ],
  setup(a) {
    a.text(360, 34, '아파트처럼 — 동 번호 + 호수', { size: 14, weight: 800 });
    a.zone('c0', 40, 70, 300, 300, { label: '0동 · 192.168.0.x', color: 'blue' });
    a.zone('c1', 380, 70, 300, 300, { label: '1동 · 192.168.1.x', color: 'green' });
    [[10, 25], [30, 77]].forEach(([p, q], r) => {
      a.node('h0' + r, 130, 160 + r * 120, { label: `.${p}호`, color: 'blue', w: 100, h: 48 });
      a.node('h1' + r, 250, 160 + r * 120, { label: `.${q}호`, color: 'blue', w: 100, h: 48 });
    });
    [[5, 6], [40, 99]].forEach(([p, q], r) => {
      a.node('g0' + r, 470, 160 + r * 120, { label: `.${p}호`, color: 'green', w: 100, h: 48 });
      a.node('g1' + r, 590, 160 + r * 120, { label: `.${q}호`, color: 'green', w: 100, h: 48 });
    });
  },
  steps: [
    {
      t: 'IP 주소 = 기기의 주소',
      easy: '인터넷이나 집 와이파이에 붙은 기기는 저마다 주소를 하나씩 받아요. 이것이 IP 주소이고, 192.168.0.10처럼 점으로 나눈 숫자 4칸으로 씁니다. 각 칸은 0부터 255까지인데, 컴퓨터 안에서는 0과 1이 8개(8비트)씩 들어 있는 칸이에요.',
      deep: 'IPv4 주소는 32비트 정수를 8비트씩 끊어 십진수로 적은 것(dotted decimal)입니다. 이론상 2³² ≈ 43억 개뿐이라 새로 나눠 줄 공용 주소는 2011년 무렵 최상위 배정 기관(IANA)에서 바닥났고, 사설 IP·NAT와 IPv6가 그 부족을 메웁니다. 주소는 엄밀히 기기가 아니라 네트워크 인터페이스에 붙어서, 와이파이와 유선을 함께 쓰는 노트북은 주소가 둘일 수 있습니다.',
      async run(a) {
        wipe(a);
        a.node('pc', 360, 64, { label: '내 노트북', sub: 'IP 192.168.0.10', icon: '💻', color: 'blue', w: 150, h: 72 });
        const O = [192, 168, 0, 10];
        const X = [165, 295, 425, 555];
        a.edge('pc', [360, 162], { dashed: true });
        const cs = O.map((n, i) => chip(a, String(n), 360, 188, 'blue', { w: 100, h: 44, size: 20, hidden: true }));
        for (let i = 0; i < 4; i++) {
          cs[i].g.style.opacity = 1;
          await a.move(cs[i], [X[i], 188], 380);
        }
        for (let i = 0; i < 3; i++) a.text((X[i] + X[i + 1]) / 2, 192, '.', { size: 30, weight: 800 });
        a.caption('숫자 4칸, 칸마다 0~255');
        for (let i = 0; i < 4; i++) {
          const t = a.text(X[i], 240, bin8(O[i]), { size: 14, mono: true, weight: 700, color: 'teal', hidden: true });
          a.text(X[i], 264, '8비트 (0~255)', { size: 11.5, cls: 'muted' });
          await a.show(t, 220);
        }
        await a.wait(300);
        a.note('n-32', 360, 334, '숫자 4칸 × 8비트 = 32비트\n→ 만들 수 있는 주소는 약 43억 개', { color: 'amber', w: 290 });
        a.caption('컴퓨터 안에서는 0과 1이 32개');
        await a.wait(1000);
      },
    },
    {
      t: '같은 동인지 판단 — 서브넷 마스크',
      easy: '주소의 어디까지가 "동 번호"이고 어디부터가 "호수"인지는 서브넷 마스크가 정해요. 집에서 흔한 /24(255.255.255.0)는 "앞 24비트, 즉 앞 세 칸이 동 번호"라는 뜻입니다. 그래서 192.168.0.10과 192.168.0.25는 같은 0동이고, 192.168.1.5는 1동이에요.',
      deep: '기기는 주소와 마스크를 비트 AND 해서 네트워크 주소를 구합니다(192.168.0.10 AND 255.255.255.0 = 192.168.0.0). 목적지에도 같은 계산을 해 결과가 같으면 같은 서브넷입니다. /24 같은 표기를 CIDR라 하며, 1993년 이전의 A·B·C 클래스 고정 구분을 대신해 지금은 /23, /27처럼 옥텟 경계가 아닌 길이도 자유롭게 씁니다.',
      async run(a) {
        wipe(a);
        a.text(360, 26, '서브넷 마스크 255.255.255.0 = /24 (앞 24비트가 1)', { size: 14, weight: 800 });
        const cells = [];
        for (let i = 0; i < 32; i++) cells.push(bitCell(a, bx(i), 64, 12, 20, i < 24 ? 'blue' : 'amber', i < 24 ? '1' : '0', { hidden: true }));
        await a.tween(1200, (t) => { const n = Math.round(t * 32); cells.forEach((c, i) => (c.g.style.opacity = i < n ? 1 : 0)); }, {});
        const netMid = (bx(0) + bx(23)) / 2, hostMid = (bx(24) + bx(31)) / 2;
        a.text(netMid, 96, '동 번호(네트워크) — 앞 24비트', { size: 12.5, weight: 800, color: 'blue' });
        a.text(hostMid, 96, '호수 — 뒤 8비트', { size: 12.5, weight: 800, color: 'amber' });
        const div = (bx(23) + bx(24)) / 2;
        a.edge([div, 50], [div, 366], { id: 'div', dashed: true, arrow: false, color: 'red', hidden: true });
        a.caption('/24 = 앞 세 칸이 동 번호');
        const RY = [160, 236, 312];
        for (let r = 0; r < ROWS.length; r++) {
          const [name, sub, ip, kind] = ROWS[r];
          a.node('dv' + r, 70, RY[r], { label: name, sub, color: 'gray', w: 104, h: 46, size: 14, hidden: true });
          await a.show('dv' + r, 200);
          const cs = ip.map((n, k) => chip(a, String(n), oct(k), RY[r], k < 3 ? (kind === 'diff' && k === 2 ? 'red' : 'blue') : 'amber', { w: 96, h: 36, size: 16, hidden: true }));
          await a.par(...cs.map((c) => a.show(c, 250)));
        }
        await a.show('div', 300);
        a.caption('앞 세 칸(192.168.0)이 같은가?');
        await a.wait(300);
        const RES = [['기준', 'gray'], ['같은 동 ✓', 'green'], ['다른 동 ✗', 'red']];
        for (let r = 0; r < 3; r++) {
          const [l, c] = RES[r];
          const p = chip(a, l, 656, RY[r], c, { w: 92, h: 30, hidden: true });
          await a.show(p, 250);
          if (r) { a.setNode('dv' + r, { color: c }); await a.flash('dv' + r); }
        }
        a.text(360, 400, '앞 세 칸이 같으면 같은 동 → 직접 대화할 수 있어요', { size: 13, weight: 700, cls: 'muted' });
        await a.wait(800);
      },
    },
    {
      t: '같은 동은 바로, 다른 동은 게이트웨이로',
      easy: '같은 동(같은 네트워크) 안에서는 복도로 바로 찾아가듯 직접 보내요. 다른 동으로 보낼 때는 동 출입구인 "기본 게이트웨이"에 맡깁니다. 집에서는 공유기, 회사에서는 라우터가 이 출입구예요.',
      deep: '같은 서브넷이면 ARP로 목적지의 MAC 주소를 알아내 바로 프레임을 보냅니다. 다른 서브넷이면 게이트웨이의 MAC으로 프레임을 보내되 IP 헤더의 목적지는 그대로 두고, 라우터가 라우팅 테이블을 보고 다음으로 넘깁니다. 기본 게이트웨이는 "그 밖의 모든 곳"을 뜻하는 기본 경로(0.0.0.0/0)이고, 마스크를 잘못 넣으면 같은 동끼리도 게이트웨이로 돌거나 다른 동에 직접 보내려다 실패하는 이상한 증상이 생깁니다.',
      async run(a) {
        wipe(a);
        a.zone('z0', 16, 56, 282, 340, { label: '0동 · 192.168.0.0/24', color: 'blue' });
        a.zone('z1', 422, 56, 282, 340, { label: '1동 · 192.168.1.0/24', color: 'green' });
        a.node('lap', 130, 130, { label: '노트북', sub: '192.168.0.10', color: 'blue', w: 130, h: 50 });
        a.node('prn', 130, 320, { label: '프린터', sub: '192.168.0.25', color: 'blue', w: 130, h: 50 });
        a.node('pc', 576, 226, { label: 'PC', sub: '192.168.1.5', color: 'green', w: 130, h: 50 });
        a.node('gw', 360, 226, { label: '게이트웨이', sub: '공유기·라우터', color: 'amber', w: 104, h: 56, size: 14 });
        a.text(360, 272, '0동 쪽 192.168.0.1', { size: 11, weight: 700, color: 'blue' });
        a.text(360, 288, '1동 쪽 192.168.1.1', { size: 11, weight: 700, color: 'green' });
        a.edge('lap', 'prn', { arrow: false });
        a.edge('lap', 'gw', { arrow: false });
        a.edge('gw', 'pc', { arrow: false });
        a.caption('같은 0동의 프린터에게: 바로 보내요');
        a.note('n1', 360, 28, '노트북: "192.168.0.25는 같은 동이네 → 직접!"', { color: 'blue', w: 330 });
        a.hl('lap');
        await a.send([130, 158], [130, 292], '인쇄', { color: 'blue', dur: 900 });
        a.hl('lap', false);
        await a.flash('prn');
        a.remove('n1');
        a.note('n2', 360, 28, '노트북: "192.168.1.5는 다른 동 → 게이트웨이로!"', { color: 'amber', w: 340 });
        a.caption('다른 1동의 PC에게: 출입구(게이트웨이)를 거쳐요');
        a.hl('lap');
        await a.send([196, 148], [306, 208], '사진', { color: 'teal', dur: 800 });
        a.hl('lap', false);
        a.hl('gw');
        await a.flash('gw');
        await a.send([414, 226], [508, 226], '사진', { color: 'teal', dur: 700 });
        a.hl('gw', false);
        await a.flash('pc');
        await a.wait(600);
      },
    },
    {
      t: '동의 크기 — /16, /24, /28',
      easy: '/ 뒤의 숫자가 클수록 동 번호가 길어지고, 그만큼 호수 자리가 줄어 동이 작아져요. /24 동에는 주소가 256개 있지만, 첫 번호(.0)는 동 이름표, 끝 번호(.255)는 "동 전체 방송"용이라 기기에는 254개를 줄 수 있습니다.',
      deep: '주소 수는 2^(32−n), 기기에 줄 수 있는 수는 보통 2^(32−n) − 2입니다(네트워크 주소·브로드캐스트 주소 제외). 회사에서는 10.0.0.0/16 같은 큰 블록을 /24 여러 개로 쪼개 사용자망·서버망·DMZ처럼 VLAN·구역별로 나누고, 두 장비만 잇는 구간에는 /31(양쪽 다 사용), 장비 하나를 가리킬 때는 /32를 씁니다. 클라우드의 서브넷은 업체마다 몇 개 주소를 더 예약하기도 하니 실제 쓸 수 있는 수를 확인해야 합니다.',
      async run(a) {
        wipe(a);
        a.text(140, 28, '동(네트워크) 비트', { size: 12, weight: 800, color: 'blue', anchor: 'start' });
        a.text(270, 28, '호수(호스트) 비트', { size: 12, weight: 800, color: 'amber', anchor: 'start' });
        const RY = [76, 140, 204];
        for (let r = 0; r < SIZES.length; r++) {
          const [pre, mask, n, cnt, use] = SIZES[r];
          const y = RY[r];
          a.text(70, y - 9, pre, { size: 22, mono: true, weight: 800, color: r === 1 ? 'blue' : null });
          a.text(70, y + 15, mask, { size: 10.5, mono: true, cls: 'muted' });
          const cells = [];
          for (let i = 0; i < 32; i++) cells.push(bitCell(a, sx(i), y, 9, 22, i < n ? 'blue' : 'amber', null, { hidden: true }));
          await a.tween(600, (t) => { const k = Math.round(t * 32); cells.forEach((c, i) => (c.g.style.opacity = i < k ? 1 : 0)); });
          const t1 = a.text(530, y - 9, cnt, { size: 13, weight: 800, anchor: 'start', hidden: true });
          const t2 = a.text(530, y + 11, use, { size: 12.5, weight: 700, anchor: 'start', color: 'green', hidden: true });
          await a.par(a.show(t1, 200), a.show(t2, 200));
          await a.wait(250);
        }
        a.caption('숫자가 클수록 동이 작아져요');
        // /24 동 하나 자세히
        a.text(360, 262, '/24 동 하나 = 주소 256개 (끝자리 0~255)', { size: 13.5, weight: 800 });
        const s0 = chip(a, '.0', 90, 312, 'red', { w: 60, h: 36, size: 14, hidden: true });
        const s1 = chip(a, '.1 ~ .254 → 기기 254대', 360, 312, 'green', { w: 470, h: 36, size: 14, hidden: true });
        const s2 = chip(a, '.255', 630, 312, 'red', { w: 60, h: 36, size: 14, hidden: true });
        await a.show(s1, 300);
        await a.par(a.show(s0, 300), a.show(s2, 300));
        a.text(90, 352, '동 이름표', { size: 12, weight: 700, color: 'red' });
        a.text(90, 370, '(네트워크 주소)', { size: 11, cls: 'muted' });
        a.text(630, 352, '동 전체 방송', { size: 12, weight: 700, color: 'red' });
        a.text(630, 370, '(브로드캐스트)', { size: 11, cls: 'muted' });
        await a.par(a.flash(s0), a.flash(s2));
        a.text(360, 408, '기기에 줄 수 있는 수 = 전체 주소 − 2', { size: 12.5, weight: 700, color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '사설 IP와 공인 IP',
      easy: '집·회사 안에서만 쓰는 주소를 사설 IP라고 해요(10.x, 172.16~31.x, 192.168.x). 아파트 호수처럼 다른 집에도 똑같은 번호가 있을 수 있죠. 인터넷에 나갈 때는 공유기가 우리 집 대표 주소인 공인 IP로 바꿔서 내보냅니다(공유기·NAT 주제).',
      deep: '사설 대역은 RFC 1918의 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16이고 인터넷에서 라우팅되지 않습니다. 이 밖에도 통신사 CGNAT용 100.64.0.0/10, 루프백 127.0.0.0/8, DHCP 실패 시 스스로 붙는 링크 로컬 169.254.0.0/16, 문서 예시용 192.0.2.0/24 · 198.51.100.0/24 · 203.0.113.0/24 같은 예약 대역이 있습니다. 회사끼리 VPN으로 이을 때 양쪽이 같은 사설 대역을 쓰면 충돌하므로 처음부터 대역을 겹치지 않게 설계합니다.',
      async run(a) {
        wipe(a);
        a.zone('ha', 16, 40, 236, 172, { label: 'A네 집', color: 'blue' });
        a.zone('hb', 16, 236, 236, 172, { label: 'B네 집', color: 'violet' });
        a.node('a1', 110, 100, { label: '노트북', sub: '192.168.0.10', color: 'blue', w: 124, h: 46 });
        a.node('a2', 110, 168, { label: '폰', sub: '192.168.0.11', color: 'blue', w: 124, h: 46 });
        a.node('b1', 110, 296, { label: '노트북', sub: '192.168.0.10', color: 'violet', w: 124, h: 46 });
        a.node('b2', 110, 364, { label: 'TV', sub: '192.168.0.12', color: 'violet', w: 124, h: 46 });
        a.node('ra', 334, 134, { label: '공유기', sub: '203.0.113.7', color: 'amber', w: 112, h: 50 });
        a.node('rb', 334, 330, { label: '공유기', sub: '203.0.113.8', color: 'amber', w: 112, h: 50 });
        a.node('net', 480, 232, { label: '인터넷', color: 'gray', shape: 'circle', w: 86 });
        a.node('srv', 632, 232, { label: '웹 서버', sub: '192.0.2.20', color: 'green', w: 112, h: 50 });
        for (const [p, q] of [['a1', 'ra'], ['a2', 'ra'], ['b1', 'rb'], ['b2', 'rb'], ['ra', 'net'], ['rb', 'net'], ['net', 'srv']]) a.edge(p, q, { arrow: false });
        const card = a.raw('g', { class: 'c-teal', transform: 'translate(570 84)' }, 'node');
        a.raw('rect', { x: -130, y: -46, width: 260, height: 92, rx: 10, style: 'fill: color-mix(in srgb, var(--c) 10%, var(--stage)); stroke: var(--c); stroke-width: 1.5' }, card);
        a.text(0, -28, '사설 IP (집·회사 안에서만)', { par: card, size: 12.5, weight: 800, color: 'teal' });
        a.text(0, -6, '10.x.x.x', { par: card, size: 12.5, mono: true });
        a.text(0, 12, '172.16.x.x ~ 172.31.x.x', { par: card, size: 12.5, mono: true });
        a.text(0, 30, '192.168.x.x', { par: card, size: 12.5, mono: true });
        card.style.opacity = 0;
        await a.tween(400, (t) => (card.style.opacity = t));
        a.badge('a1', '같음', 'red');
        a.badge('b1', '같음', 'red');
        a.caption('두 집 모두 192.168.0.10 — 집 안에서만 쓰니 괜찮아요');
        await a.par(a.flash('a1'), a.flash('b1'));
        await a.wait(400);
        const tag = chip(a, '보낸 곳 192.168.0.10', 334, 80, 'blue', { w: 150, hidden: true });
        a.hl('a1');
        await a.send([174, 104], [276, 128], '', { color: 'blue', w: 16, h: 16, dur: 600 });
        a.hl('a1', false);
        a.hl('ra');
        await a.show(tag, 200);
        await a.wait(400);
        tag.set('보낸 곳 203.0.113.7', 'green');
        await a.flash(tag);
        a.caption('공유기가 보낸 곳을 공인 IP로 바꿔요 (NAT)');
        await a.wait(300);
        a.hl('ra', false);
        await a.send([392, 152], [442, 214], '', { color: 'green', w: 16, h: 16, dur: 450 });
        await a.send([524, 232], [574, 232], '', { color: 'green', w: 16, h: 16, dur: 400 });
        a.text(632, 280, '"203.0.113.7에서 왔네"', { size: 12, weight: 700, color: 'green' });
        await a.flash('srv');
        await a.wait(700);
      },
    },
    {
      t: 'DHCP — 주소를 자동으로 받기',
      easy: '와이파이에 처음 붙은 노트북은 아직 주소가 없어요. 그래서 "주소 주실 분?" 하고 동네 전체에 외치면, 공유기 안의 DHCP 서버가 "이 주소 쓰세요"라며 주소·마스크·게이트웨이·DNS 서버를 한꺼번에 빌려줍니다. 내 PC 네트워크 설정에서 "자동으로 받기"가 바로 이것이에요.',
      deep: 'DHCP는 UDP 67(서버)·68(클라이언트) 포트로 Discover → Offer → Request → Ack 4단계(DORA)를 거치며, 처음에는 주소가 없으니 브로드캐스트로 시작합니다. 주소는 임대 기간(lease) 동안 빌리는 것이라 기간의 절반쯤 지나면 갱신을 요청하고, 서버·프린터처럼 주소가 바뀌면 곤란한 기기는 MAC 기준 예약(고정 할당)을 씁니다. 다른 서브넷에 있는 DHCP 서버를 쓰려면 라우터에 DHCP 릴레이를 설정하고, 응답을 못 받은 기기는 169.254.x.x 주소를 스스로 붙입니다.',
      async run(a) {
        wipe(a);
        a.node('nb', 130, 96, { label: '새 노트북', sub: '주소 없음', icon: '💻', color: 'blue', w: 140, h: 70 });
        a.node('dh', 130, 336, { label: '공유기', sub: 'DHCP 서버', icon: '📡', color: 'amber', w: 140, h: 70 });
        a.edge('nb', 'dh', { arrow: false, dashed: true });
        // 설정 창
        const win = a.raw('g', { class: 'c-gray', transform: 'translate(496 228)' }, 'node');
        a.raw('rect', { x: -196, y: -170, width: 392, height: 340, rx: 12, style: 'fill: var(--panel, var(--stage)); stroke: var(--line2); stroke-width: 1.5' }, win);
        a.raw('rect', { x: -196, y: -170, width: 392, height: 40, rx: 12, style: 'fill: color-mix(in srgb, var(--gray) 14%, var(--stage))' }, win);
        a.text(-178, -150, '네트워크 설정', { par: win, size: 13.5, weight: 800, anchor: 'start' });
        a.text(178, -150, '◉ 자동으로 받기(DHCP)', { par: win, size: 12, weight: 700, anchor: 'end', color: 'teal' });
        const F = [['IP 주소', '192.168.0.23'], ['서브넷 마스크', '255.255.255.0'], ['기본 게이트웨이', '192.168.0.1'], ['DNS 서버', '192.168.0.1'], ['임대 기간', '24시간']];
        const vals = F.map(([k], i) => {
          const y = -88 + i * 54;
          a.text(-176, y, k, { par: win, size: 12.5, weight: 700, anchor: 'start', cls: 'muted' });
          a.raw('rect', { x: -40, y: y - 15, width: 214, height: 30, rx: 6, style: 'fill: var(--stage); stroke: var(--line2); stroke-width: 1' }, win);
          return a.text(-28, y, '', { par: win, size: 13, mono: true, weight: 700, anchor: 'start', color: 'teal' });
        });
        const MSG = [
          ['① 주소 주실 분?', 'down', 'blue', '모두에게 외치기 (Discover)'],
          ['② 이 주소 어때요', 'up', 'amber', '제안 (Offer)'],
          ['③ 그걸로 할게요', 'down', 'blue', '요청 (Request)'],
          ['④ 확정! 24시간', 'up', 'amber', '승인 (Ack)'],
        ];
        for (const [l, dir, c, cap] of MSG) {
          a.caption(cap);
          const from = dir === 'down' ? [130, 146] : [130, 286];
          const to = dir === 'down' ? [130, 286] : [130, 146];
          a.hl(dir === 'down' ? 'nb' : 'dh');
          await a.send(from, to, l, { color: c, w: 136, dur: 650 });
          a.hl(dir === 'down' ? 'nb' : 'dh', false);
        }
        a.setNode('nb', { sub: '192.168.0.23', color: 'green' });
        await a.flash('nb');
        a.caption('설정 칸이 자동으로 채워져요');
        for (let i = 0; i < F.length; i++) {
          const s = F[i][1];
          await a.tween(260, (t) => { vals[i].textContent = s.slice(0, Math.round(t * s.length)); });
        }
        await a.wait(900);
      },
    },
    {
      t: 'IPv6 한눈에, 그리고 정리',
      easy: 'IPv4 주소(약 43억 개)가 모자라서 만든 새 주소가 IPv6예요. 2001:db8::10처럼 16진수로 쓰고, 개수가 거의 무한에 가까울 만큼 많습니다. 요즘 휴대폰은 IPv4와 IPv6를 함께 쓰는 경우가 많아요.',
      deep: 'IPv6는 128비트를 16비트씩 8칸의 16진수로 쓰며, 칸 앞의 0은 생략하고 0만 이어진 구간은 한 번만 ::로 줄입니다(2001:db8::/32는 문서 예시용 대역). LAN 서브넷은 보통 /64로 고정해 쓰고, 기기가 스스로 주소를 만드는 SLAAC나 DHCPv6로 주소를 받습니다. 주소가 넉넉해 NAT 없이 기기마다 공인 주소를 줄 수 있지만, 그만큼 방화벽으로 들어오는 연결을 막는 설정이 중요합니다. 보급률은 나라·통신사마다 크게 달라 IPv4와 함께 쓰는 듀얼 스택이 일반적입니다.',
      async run(a) {
        wipe(a);
        a.text(40, 30, 'IPv4 · 32비트 → 약 43억 개', { size: 13, weight: 800, anchor: 'start', color: 'blue' });
        a.text(40, 92, 'IPv6 · 128비트 → 약 3.4 × 10³⁸ 개', { size: 13, weight: 800, anchor: 'start', color: 'violet' });
        const c4 = [], c6 = [];
        for (let i = 0; i < 32; i++) c4.push(bitCell(a, 43 + i * 5, 56, 4, 18, 'blue', null, { hidden: true, tint: 70 }));
        for (let i = 0; i < 128; i++) c6.push(bitCell(a, 43 + i * 5, 118, 4, 18, 'violet', null, { hidden: true, tint: 70 }));
        await a.tween(500, (t) => { const k = Math.round(t * 32); c4.forEach((c, i) => (c.g.style.opacity = i < k ? 1 : 0)); });
        await a.tween(1300, (t) => { const k = Math.round(t * 128); c6.forEach((c, i) => (c.g.style.opacity = i < k ? 1 : 0)); });
        a.caption('IPv6는 비트가 4배, 주소 수는 상상할 수 없을 만큼');
        const ex = a.text(360, 172, '2001:db8::10', { size: 26, mono: true, weight: 800, color: 'violet', hidden: true });
        await a.show(ex, 300);
        a.text(360, 202, '= 2001:0db8:0000:0000:0000:0000:0000:0010', { size: 12, mono: true, cls: 'muted' });
        a.text(360, 222, '16진수 8칸 · 0만 이어진 칸은 :: 로 한 번 줄여 씀', { size: 12, cls: 'muted' });
        await a.wait(500);
        const g = a.raw('g', { class: 'c-amber', transform: 'translate(360 334)' }, 'node');
        a.raw('rect', { x: -290, y: -80, width: 580, height: 160, rx: 12, style: 'fill: color-mix(in srgb, var(--c) 10%, var(--stage)); stroke: var(--c); stroke-width: 1.5' }, g);
        g.style.opacity = 0;
        a.text(0, -58, '정리', { par: g, size: 14, weight: 800, color: 'amber' });
        const L = [
          '① IP 주소 = 동 번호(네트워크) + 호수(호스트)',
          '② 서브넷 마스크(/24 등)가 동과 호수의 경계',
          '③ 같은 동은 바로, 다른 동은 게이트웨이로',
          '④ 집 안은 사설 IP, 나갈 땐 공유기가 공인 IP로',
          '⑤ 주소·마스크·게이트웨이·DNS는 DHCP가 자동으로',
        ];
        const ts = L.map((s, i) => a.text(-262, -32 + i * 24, s, { par: g, size: 13, weight: 600, anchor: 'start', hidden: true }));
        await a.tween(250, (t) => (g.style.opacity = t));
        for (const t of ts) await a.show(t, 220);
        await a.wait(800);
      },
    },
  ],
};

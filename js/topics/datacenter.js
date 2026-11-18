// 서버와 데이터센터: 서버는 어떻게 다른가 → 랙과 배선 → RAID → 스토리지(DAS·NAS·SAN) → 전원(UPS·발전기·A/B)
// → 냉각(핫/콜드 아일·PUE) → 센터 하나로 부족할 때(가용 영역·DR·클라우드)
// 비유는 병원(고장 나도 진료가 멈추지 않게 예비를 둔다). 단계마다 무대를 새로 그린다. 숫자는 설명용 예시 값이다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
/** 글자 폭 대략 계산(한글·이모지 13, 나머지 7.4) */
const textW = (s) => [...String(s)].reduce((w, ch) => w + (/[\u0000-ɏ•·]/.test(ch) ? 7.4 : 13), 0);
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w || Math.round(textW(label) + 26), size: o.size || 12.5, hidden: o.hidden, id: o.id, layer: o.layer });
}
const vis = (x) => x.g || x;
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (vis(e).style.opacity = k))));
const soft = (c, p = 14) => `fill: color-mix(in srgb, var(--${c}) ${p}%, transparent); stroke: color-mix(in srgb, var(--${c}) 55%, transparent); stroke-width: 1.2`;
/** 작은 둥근 점(전기·공기 흐름) */
const dot = (a, at, color) => a.packet('', { at, color, w: 14, h: 14 });
/** 점 하나를 경로를 따라 흘려보내고 지운다 */
async function flow(a, path, color, dur) {
  const p = dot(a, path[0], color);
  await a.move(p, path.slice(1), dur);
  await a.fadeOut(p, 120);
}

// 2단계 랙 안 장비: [id, 이름, 가운데 y, 높이, 색]
const RACK = [
  ['tor1', 'ToR 스위치 A', 76, 22, 'teal'], ['tor2', 'ToR 스위치 B', 102, 22, 'teal'], ['patch', '패치 패널', 126, 16, 'gray'],
  ['r1', '서버 1U', 152, 22, 'green'], ['r2', '서버 1U', 178, 22, 'green'], ['r3', '서버 1U', 204, 22, 'green'], ['r4', '서버 1U', 230, 22, 'green'],
  ['r5', '서버 2U', 270, 44, 'green'], ['r6', '서버 2U', 320, 44, 'green'], ['st', '스토리지 2U', 370, 44, 'violet'],
];
const RACK_SRV = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'st'];

export default {
  id: 'datacenter',
  level: 2,
  cat: '서버·인프라',
  title: '서버와 데이터센터 — 멈추지 않게 겹겹이',
  sub: '서버가 사는 집, 데이터센터가 고장·정전·재해에도 서비스를 멈추지 않는 방법',
  analogy: '데이터센터는 큰 병원과 같습니다. 병원은 정전이 나도 수술이 멈추지 않게 비상 배터리와 발전기를 두고, 중요한 장비는 예비를 한 대 더 둡니다. 큰 재난에 대비해 다른 지역 병원과도 협력하죠. 데이터센터도 서버·디스크·전원·냉각·건물까지 겹겹이 "예비"를 둡니다.',
  keys: [
    '서버도 CPU·메모리·저장장치를 가진 컴퓨터지만, 24시간 돌고, 꺼져 있어도 원격 관리가 되며, 메모리 오류 정정(ECC)과 전원 장치 2개를 갖춘다.',
    '서버는 랙에 층층이 꽂히고, 랙 맨 위 스위치(ToR)를 거쳐 상위 스위치로 이어진다. 선과 스위치도 두 갈래로 둔다.',
    'RAID는 디스크 한두 개가 고장 나도 데이터를 지키지만 백업은 아니다. 삭제나 랜섬웨어 암호화도 그대로 복제된다.',
    '전원은 한전 → UPS(배터리, 순간 정전) → 발전기(장시간)로 버티고, A/B 두 경로로 서버의 전원 장치 2개에 각각 들어간다. 냉각은 찬 통로·더운 통로를 나눠 효율을 높이고 PUE로 잰다.',
    '센터 하나가 통째로 멈출 때를 대비해 가까운 여러 센터(가용 영역)와 멀리 떨어진 재해복구(DR) 센터를 둔다. 클라우드는 이 모든 것을 빌려 쓰는 것이다.',
  ],
  terms: [
    ['랙 · U', '서버를 층층이 꽂는 표준 선반(19인치). 1U는 높이 약 4.45cm, 보통 42U 안팎'],
    ['ToR 스위치', 'Top of Rack. 랙 맨 위에서 그 랙 서버들을 묶어 상위 네트워크로 잇는 스위치'],
    ['BMC · IPMI', '서버 본체가 꺼져 있어도 따로 살아 있는 관리용 작은 컴퓨터와 그 관리 규격. 원격으로 전원·화면·센서를 다룬다'],
    ['ECC 메모리', '메모리에서 비트가 뒤집히는 오류를 스스로 찾아 고치는(1비트) 메모리'],
    ['RAID', '디스크 여러 개를 묶어 하나처럼 쓰며, 일부가 고장 나도 데이터를 유지하는 기술. 백업과는 다르다'],
    ['NAS · SAN', 'NAS는 네트워크로 파일을 나눠 주는 저장장치, SAN은 서버에 디스크(블록)를 빌려주는 전용 저장망'],
    ['UPS', '무정전 전원 장치. 정전 순간 배터리로 끊김 없이 전기를 이어 준다'],
    ['PUE', '데이터센터 전체 전력 ÷ IT 장비 전력. 1.0에 가까울수록 냉각 등 부대 전력이 적다'],
  ],
  quiz: [
    { q: '디스크 2개를 RAID 1(거울 복사)로 묶어 두었는데, 실수로 중요한 파일을 지웠습니다. 어떻게 될까요?', c: ['다른 디스크에 복사본이 남아 있어 바로 되살릴 수 있다', '지운 것도 양쪽 디스크에 똑같이 반영되므로, 따로 둔 백업이 있어야 되살릴 수 있다', 'RAID가 삭제를 막아 주므로 지워지지 않는다', '디스크 하나를 빼면 지우기 전 상태로 돌아간다'], a: 1, why: 'RAID는 디스크 "고장"에 대비하는 기술이라, 사람이 지우거나 랜섬웨어가 암호화한 것도 즉시 모든 디스크에 똑같이 반영됩니다. 그래서 RAID와 별도로, 떨어진 곳에 버전별 백업을 둬야 합니다.', step: 2 },
    { q: '정전이 났을 때, 발전기가 켜질 때까지 서버가 꺼지지 않게 전기를 끊김 없이 이어 주는 장치는?', c: ['발전기', '랙 전원 분배기(PDU)', 'UPS(무정전 전원 장치)', '냉각기'], a: 2, why: 'UPS는 배터리로 정전 순간을 끊김 없이 이어 줍니다. 발전기는 켜지고 안정되기까지 시간이 걸리므로, 그 사이와 전환 순간을 UPS가 버티고 이후 장시간 전력은 발전기가 맡습니다.', step: 4 },
    { q: '대용량 하드디스크 여러 개를 RAID 5로 묶을 때, 현장에서 RAID 6이나 RAID 10을 더 권하는 주된 이유는?', c: ['고장 난 디스크를 재구축하는 데 오래 걸리고, 그동안 디스크가 하나 더 고장 나거나 읽기 오류가 나면 데이터를 잃을 수 있어서', 'RAID 5는 디스크가 하나만 고장 나도 바로 데이터를 잃어서', 'RAID 5는 패리티 때문에 쓸 수 있는 용량이 절반으로 줄어서', 'RAID 5는 SSD에서만 동작해서'], a: 0, why: 'RAID 5는 디스크 1개 고장까지 견디지만, 재구축 중에는 보호가 없습니다. 디스크가 클수록 재구축이 길어지고 남은 디스크를 전부 읽어야 해서 추가 고장·읽기 오류 위험이 커집니다. 그래서 2개 고장을 견디는 RAID 6이나 RAID 10을 많이 씁니다.', step: 2 },
  ],
  setup() {},
  steps: [
    {
      t: '서버도 컴퓨터 — 하지만 쉬지 않는 컴퓨터',
      easy: '서버도 컴퓨터 속 여행에서 본 CPU·메모리·저장장치를 가진 컴퓨터입니다. 다른 점은 24시간 쉬지 않고, 꺼져 있어도 멀리서 켜고 살펴볼 수 있는 관리 포트가 따로 있고, 메모리 오류를 스스로 고치며(ECC), 전원 장치가 2개라 하나가 고장 나도 계속 돈다는 거예요. 모양도 선반(랙)에 꽂기 좋게 납작합니다.',
      deep: '서버 보드에는 BMC(Baseboard Management Controller)가 따로 있어 IPMI나 Redfish 규격으로 원격 전원 제어·콘솔(KVM)·센서·이벤트 로그를 다루며, 보통 별도 관리망에 연결합니다. ECC 메모리는 1비트 오류를 고치고 2비트 오류를 감지하며, 전원 장치(PSU)는 이중화·핫스왑이 일반적입니다. 폼팩터는 1U(약 4.45cm)·2U 랙형이 주류이고, 고밀도로는 블레이드·멀티노드 섀시도 씁니다.',
      async run(a) {
        wipe(a);
        a.text(360, 34, '서버 = 쉬지 않고 일하는 컴퓨터', { size: 14, weight: 800, layer: 'edge' });
        a.node('pc', 90, 200, { label: '내 PC', sub: '켜고 끄며 씀', icon: '💻', color: 'blue', w: 120, h: 74 });
        a.node('srv', 380, 200, { label: '서버 (1U 랙형)', sub: '전원 꺼짐', icon: '🗄️', color: 'gray', w: 250, h: 74 });
        a.node('ecc', 296, 96, { label: 'ECC 메모리', sub: '오류 자동 정정', color: 'teal', w: 132, h: 52, size: 13.5 });
        a.node('bmc', 466, 96, { label: '관리 포트', sub: 'BMC · 늘 깨어 있음', color: 'violet', w: 140, h: 52, size: 13.5 });
        a.node('psuA', 316, 310, { label: '전원 장치 A', color: 'green', w: 120, h: 44, size: 13.5 });
        a.node('psuB', 446, 310, { label: '전원 장치 B', color: 'green', w: 120, h: 44, size: 13.5 });
        a.node('adm', 640, 96, { label: '관리자', sub: '원격', icon: '🧑‍💻', color: 'blue', w: 100, h: 62 });
        a.edge('adm', 'bmc', { dashed: true, label: '관리망', ly: -10 });
        a.edge('ecc', 'srv', { arrow: false });
        a.edge('bmc', 'srv', { arrow: false });
        a.edge('psuA', 'srv', { id: 'eA' });
        a.edge('psuB', 'srv', { id: 'eB' });
        a.caption('서버도 CPU·메모리·저장장치를 가진 컴퓨터예요 (컴퓨터 주제)');
        await a.flash('pc');
        // 꺼진 서버를 원격으로 켠다
        a.caption('서버가 꺼져 있어도 관리 포트(BMC)는 깨어 있어 멀리서 켤 수 있어요');
        await a.send('adm', 'bmc', '전원 켜기', { color: 'violet', dur: 700 });
        await a.flash('bmc');
        a.setNode('srv', { sub: '24시간 가동 중', color: 'green' });
        await a.flash('srv');
        // 메모리 비트 오류를 ECC가 고친다
        a.caption('메모리 속 0과 1이 뒤집혀도 ECC가 찾아서 고칩니다');
        const e = chip(a, '1 → 0 ⚡', 296, 40, 'red');
        await a.move(e, [296, 62], 400);
        e.set('0 → 1 ✓', 'green');
        await a.flash('ecc');
        await a.fadeOut(e, 200);
        a.badge('ecc', '정정 ✓', 'green');
        // 전원 장치 하나가 고장
        a.caption('전원 장치 A가 고장 나도 B가 있어 꺼지지 않아요');
        a.setNode('psuA', { label: 'A 고장 ✕', color: 'red' });
        a.hl('psuA', true, 'red');
        await a.fade('eA', 0.15, 300);
        await flow(a, [[446, 286], [420, 240]], 'amber', 500);
        a.badge('srv', '계속 가동 ✓', 'green');
        a.note('n0', 360, 392, '24시간 가동 · 꺼져도 원격 관리 · 메모리 오류 정정 · 전원 2개', { color: 'green', size: 12 });
        await a.wait(500);
      },
    },
    {
      t: '랙과 배선 — 층층이 꽂고 두 갈래로 잇기',
      easy: '데이터센터에서는 서버를 "랙"이라는 큰 철제 선반에 책처럼 층층이 꽂습니다. 랙 맨 위에는 그 랙 서버들을 모아 주는 스위치(ToR)가 있고, 여기서 건물 전체 네트워크로 이어져요. 스위치와 선을 두 갈래로 둬서 하나가 끊겨도 다른 길로 통신합니다.',
      deep: '표준 19인치 랙은 보통 42U 안팎(48U도 흔함)이고, ToR 스위치가 랙 안 서버를 25/100GbE로 묶어 상위 스파인(집계) 스위치로 여러 개의 업링크를 둡니다. 서버는 NIC 두 개를 서로 다른 ToR에 연결해 본딩(LACP 등)으로 링크를 이중화하고, BMC용 관리망은 별도 스위치로 분리하는 경우가 많습니다. 케이블 정리와 라벨링은 오배선·장애 대응 시간을 줄이고 공기 흐름을 막지 않기 위해서입니다.',
      async run(a) {
        wipe(a);
        a.text(290, 36, '랙 하나 (앞에서 본 모습)', { size: 13, weight: 800, layer: 'edge' });
        a.raw('rect', { x: 200, y: 54, width: 180, height: 352, rx: 6, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 2' }, 'zone');
        a.raw('rect', { x: 184, y: 62, width: 8, height: 336, rx: 4, style: soft('red', 40) }, 'zone');
        a.raw('rect', { x: 388, y: 62, width: 8, height: 336, rx: 4, style: soft('blue', 40) }, 'zone');
        a.text(188, 418, '전원 A', { size: 11, color: 'red', weight: 700, layer: 'edge' });
        a.text(392, 418, '전원 B', { size: 11, color: 'blue', weight: 700, layer: 'edge' });
        for (const [id, l, y, h, c] of RACK) a.node(id, 290, y, { label: l, color: c, w: 156, h, size: h > 20 ? 12 : 11, r: 4, hidden: true });
        a.node('sp1', 600, 110, { label: '상위 스위치 1', color: 'teal', w: 132, h: 50, size: 13.5 });
        a.node('sp2', 600, 220, { label: '상위 스위치 2', color: 'teal', w: 132, h: 50, size: 13.5 });
        a.node('net', 584, 340, { label: '다른 랙 · 인터넷', icon: '🌐', color: 'gray', w: 144, h: 58, size: 13.5 });
        for (const [t, s, y] of [['tor1', 'sp1', 76], ['tor1', 'sp2', 76], ['tor2', 'sp1', 102], ['tor2', 'sp2', 102]]) a.edge([371, y], s, { id: `u-${t}-${s}`, hidden: true });
        a.edge('sp1', 'net', { bend: 0.25 });
        a.edge('sp2', 'net');
        a.text(96, 150, '1U = 높이 약 4.45cm', { size: 12, weight: 700, layer: 'edge' });
        a.text(96, 172, '보통 42U 안팎', { size: 12, cls: 'muted', layer: 'edge' });
        a.text(96, 296, '2U = 디스크·카드', { size: 12, weight: 700, layer: 'edge' });
        a.text(96, 318, '더 많이 들어감', { size: 12, cls: 'muted', layer: 'edge' });
        a.caption('랙에 장비를 위에서부터 꽂습니다');
        for (const r of RACK) await appear(a, a.get(r[0]), 120);
        // 서버 → ToR 배선(왼쪽 묶음)
        a.caption('서버마다 선을 랙 맨 위 스위치(ToR)로 — 가지런히 묶어서');
        const cables = RACK_SRV.map((id, i) => {
          const y = a.get(id).y, x = 205 + (i % 3) * 1.6;
          return a.raw('path', { d: `M212 ${y} H${x} V${76 + (i % 2) * 26} H212`, class: 'edge ec-teal', style: 'opacity: 0; stroke-width: 1.4' }, 'edge');
        });
        await appear(a, cables, 400);
        await a.par(...['tor1', 'tor2'].flatMap((t) => ['sp1', 'sp2'].map((s) => a.show(`u-${t}-${s}`, 300))));
        a.caption('서버 → ToR → 상위 스위치 → 다른 랙과 인터넷');
        const p = chip(a, '데이터', 206, 204, 'blue', { h: 24 });
        await a.move(p, [[206, 76], [372, 76], [534, 110]], 1000);
        await a.move(p, [[600, 136], [584, 311]], 600);
        await a.fadeOut(p, 120);
        // ToR A 고장 → B로 우회
        a.caption('ToR 스위치 A가 고장 나도, 두 번째 선으로 ToR B를 거쳐 갑니다');
        a.setNode('tor1', { label: 'ToR A 고장 ✕', color: 'red' });
        a.hl('tor1', true, 'red');
        await a.par(a.fade('u-tor1-sp1', 0.15, 250), a.fade('u-tor1-sp2', 0.15, 250));
        const q = chip(a, '데이터', 207, 204, 'blue', { h: 24 });
        await a.move(q, [[207, 102], [372, 102], [534, 220]], 1000);
        await a.move(q, [[600, 246], [584, 311]], 500);
        await a.fadeOut(q, 120);
        a.badge('net', '통신 계속', 'green');
        await a.wait(400);
      },
    },
    {
      t: 'RAID — 디스크가 고장 나도 데이터는 그대로',
      easy: '디스크(저장장치)는 언젠가 고장 납니다. RAID는 디스크 여러 개를 묶어 하나가 고장 나도 데이터가 남게 하는 방법이에요. RAID 1은 두 디스크에 똑같이 쓰는 "거울 복사", RAID 5는 "검산 값(패리티)"을 함께 써 두어 하나가 없어져도 계산으로 되살리고, RAID 10은 거울 복사한 묶음 여러 개에 나눠 씁니다. 하지만 지우기나 랜섬웨어 암호화도 모든 디스크에 똑같이 반영되니 RAID는 백업이 아닙니다(랜섬웨어 주제).',
      deep: 'RAID 1은 용량 50%·읽기 분산, RAID 5는 패리티(XOR)를 디스크마다 돌려 저장해 n−1개 용량을 쓰고 1개 고장을 견디지만 쓰기마다 패리티 갱신 비용(write penalty)이 있습니다. 대용량 HDD에서는 재구축이 수 시간~수일 걸리고 그동안 추가 고장·읽기 오류(URE) 위험이 있어 2개를 견디는 RAID 6이나 RAID 10을 많이 씁니다. 하드웨어 RAID 카드, OS 소프트웨어 RAID, ZFS 같은 파일 시스템 수준 방식이 있으며, 어느 것이든 백업(3-2-1, 오프라인·불변 사본)을 대신하지 못합니다.',
      async run(a) {
        wipe(a);
        a.zone('z1', 16, 34, 210, 236, { label: 'RAID 1 — 거울 복사', color: 'teal' });
        a.zone('z5', 238, 34, 250, 236, { label: 'RAID 5 — 검산 값(패리티)', color: 'violet' });
        a.zone('z10', 500, 34, 204, 236, { label: 'RAID 10 — 거울 + 나눠 쓰기', color: 'blue' });
        const D = [
          ['d1a', 82, 'A', 'B', 'teal'], ['d1b', 160, 'A', 'B', 'teal'],
          ['d5a', 300, 'A1', 'B1', 'violet'], ['d5b', 363, 'A2', 'Pb', 'violet'], ['d5c', 426, 'Pa', 'B2', 'violet'],
          ['d10a', 532, 'A1', 'B1', 'blue'], ['d10b', 578, 'A1', 'B1', 'blue'], ['d10c', 626, 'A2', 'B2', 'blue'], ['d10d', 672, 'A2', 'B2', 'blue'],
        ];
        for (const [id, x, , , c] of D) a.node(id, x, 140, { label: '', shape: 'db', color: c, w: id.startsWith('d10') ? 40 : 50, h: 70, size: 13.5 });
        a.text(121, 252, '쓸 수 있는 용량 50%', { size: 11.5, cls: 'muted', layer: 'edge' });
        a.text(363, 252, '용량 67% (3개 중 2개)', { size: 11.5, cls: 'muted', layer: 'edge' });
        a.text(602, 252, '용량 50%', { size: 11.5, cls: 'muted', layer: 'edge' });
        a.raw('line', { x1: 601, y1: 108, x2: 601, y2: 176, class: 'edge dashed', style: 'opacity: .5' }, 'edge');
        // 쓰기
        a.caption('사진 파일(A·B 조각)을 쓰면 — 방식마다 다르게 나눠 저장');
        await a.par(...D.map(([id, x, l, s], i) => a.wait(i * 60).then(async () => {
          const p = chip(a, l, x, 70, 'amber', { h: 22, w: 30, size: 12 });
          await a.move(p, [x, 104], 380);
          await a.fadeOut(p, 100);
          a.setNode(id, { label: l, sub: s });
        })));
        // 고장
        a.caption('디스크 하나씩 고장! — 그래도 데이터는 남아 있어요');
        for (const id of ['d1a', 'd5b', 'd10a']) { a.setNode(id, { label: '✕', sub: '고장', color: 'red' }); a.hl(id, true, 'red'); }
        await a.par(a.flash('d1a'), a.flash('d5b'), a.flash('d10a'));
        chip(a, '거울로 계속 ✓', 121, 212, 'green', { h: 26, size: 12 });
        chip(a, '짝이 대신 ✓', 602, 212, 'green', { h: 26, size: 12 });
        const r = chip(a, 'A2 = A1 ⊕ Pa', 363, 212, 'violet', { h: 26, size: 12 });
        await a.par(a.send('d5a', [363, 212], 'A1', { color: 'violet', dur: 500, w: 34, h: 22 }), a.send('d5c', [363, 212], 'Pa', { color: 'violet', dur: 500, w: 34, h: 22 }));
        r.set('A2 계산해 복원 ✓', 'green');
        await a.wait(500);
        // RAID는 백업이 아니다
        a.zone('zb', 16, 286, 688, 136, { label: 'RAID는 백업이 아니다', color: 'red' });
        a.node('rw', 100, 362, { label: '랜섬웨어', sub: '또는 실수로 삭제', icon: '🦠', color: 'red', w: 132, h: 62 });
        a.node('m1', 300, 362, { label: '파일', shape: 'db', color: 'teal', w: 54, h: 60, size: 13 });
        a.node('m2', 372, 362, { label: '파일', shape: 'db', color: 'teal', w: 54, h: 60, size: 13 });
        a.text(336, 404, 'RAID 1', { size: 11, cls: 'muted', layer: 'edge' });
        a.node('bk', 590, 362, { label: '따로 둔 백업', sub: '떨어진 곳 · 오프라인', icon: '💾', color: 'green', w: 160, h: 62 });
        a.edge('rw', 'm1', { id: 'e-rw' });
        a.edge('m2', 'bk', { dashed: true, label: '매일 사본', id: 'e-bk' });
        a.caption('랜섬웨어가 암호화하면 — 거울 디스크에도 즉시 똑같이 복사됩니다');
        await a.send('rw', 'm1', '암호화!', { color: 'red', dur: 600 });
        for (const id of ['m1', 'm2']) { a.setNode(id, { label: '🔒', color: 'red' }); a.hl(id, true, 'red'); }
        await a.par(a.flash('m1'), a.flash('m2'));
        a.badge('bk', '안전 ✓', 'green');
        a.hl('bk', true, 'green');
        a.caption('되살릴 수 있는 건 떨어진 곳에 따로 둔 백업뿐');
        await a.wait(700);
      },
    },
    {
      t: '저장장치 종류 — DAS · NAS · SAN',
      easy: '서버가 데이터를 두는 방법은 크게 셋입니다. DAS는 서버에 직접 붙인 디스크(진료실 책상 서랍), NAS는 여러 컴퓨터가 네트워크로 함께 쓰는 파일 보관함(공용 기록실 — "김OO 차트 주세요"처럼 파일 이름으로 요청), SAN은 저장 전용 길로 연결된 중앙 창고인데 서버에게는 자기 디스크처럼 보이는(칸 번호로 요청) 방식이에요.',
      deep: 'DAS는 내장·직결(SAS/NVMe) 디스크로 단순·저지연이지만 공유가 어렵습니다. NAS는 파일 단위로 NFS·SMB 프로토콜을 써서 일반 LAN에서 공유하고, SAN은 블록 단위로 FC(파이버 채널) 또는 iSCSI·NVMe-oF로 LUN(볼륨)을 서버에 붙여 DB·가상화 클러스터에 많이 씁니다. 요즘은 서버 여러 대의 로컬 디스크를 소프트웨어로 묶는 분산 스토리지(HCI)와 클라우드의 블록·파일·오브젝트 스토리지 구분도 같은 개념의 연장입니다.',
      async run(a) {
        wipe(a);
        a.zone('zd', 16, 34, 218, 300, { label: 'DAS — 책상 서랍', color: 'green' });
        a.zone('zn', 250, 34, 220, 300, { label: 'NAS — 공용 기록실', color: 'blue' });
        a.zone('zs', 486, 34, 218, 300, { label: 'SAN — 전용 길로 잇는 창고', color: 'violet' });
        a.node('ds', 125, 110, { label: '서버', icon: '🖥️', color: 'green', w: 100, h: 58 });
        a.node('dd', 125, 262, { label: '디스크', sub: '서버에 직접', shape: 'db', color: 'green', w: 100, h: 70 });
        a.edge('ds', 'dd', { both: true, label: '케이블 직결', lx: 44, ly: 0 });
        a.node('n1', 308, 100, { label: '서버 1', color: 'blue', w: 90, h: 46, size: 13.5 });
        a.node('n2', 414, 100, { label: '서버 2', color: 'blue', w: 90, h: 46, size: 13.5 });
        a.node('nsw', 360, 186, { label: '사내망 (LAN)', color: 'gray', w: 124, h: 38, size: 13 });
        a.node('nas', 360, 276, { label: 'NAS', sub: '파일 단위', icon: '🗂️', color: 'blue', w: 124, h: 70 });
        a.node('s1', 540, 100, { label: '서버 1', color: 'violet', w: 90, h: 46, size: 13.5 });
        a.node('s2', 648, 100, { label: '서버 2', color: 'violet', w: 90, h: 46, size: 13.5 });
        a.node('ssw', 595, 186, { label: '저장 전용망', color: 'amber', w: 124, h: 38, size: 13 });
        a.node('arr', 595, 276, { label: '스토리지', sub: '블록 단위', icon: '🗄️', color: 'violet', w: 124, h: 70 });
        for (const [x, y] of [['n1', 'nsw'], ['n2', 'nsw'], ['nsw', 'nas'], ['s1', 'ssw'], ['s2', 'ssw'], ['ssw', 'arr']]) a.edge(x, y, { both: true });
        // DAS
        a.caption('DAS: 서버에 바로 붙은 디스크 — 단순하고 빠르지만 그 서버만 씀');
        await a.send('ds', 'dd', '읽기', { color: 'green', dur: 600 });
        // NAS
        a.caption('NAS: 여러 서버가 같은 파일을 "이름"으로 요청해 함께 씁니다');
        await a.par(
          a.send('n1', 'nas', '보고서.pdf', { color: 'blue', via: ['nsw'], dur: 900 }),
          a.wait(250).then(() => a.send('n2', 'nas', '보고서.pdf', { color: 'blue', via: ['nsw'], dur: 900 })),
        );
        a.badge('nas', '같은 파일 공유', 'blue');
        // SAN
        a.caption('SAN: 전용 길로 연결된 창고의 "칸 번호(블록)"를 자기 디스크처럼 씁니다');
        await a.par(
          a.send('s1', 'arr', '블록 #1024', { color: 'violet', via: ['ssw'], dur: 900 }),
          a.wait(250).then(() => a.send('s2', 'arr', '블록 #2048', { color: 'violet', via: ['ssw'], dur: 900 })),
        );
        a.badge('arr', '서버마다 내 칸', 'violet');
        a.note('sd', 125, 384, '서버 1대 전용\n단순 · 빠름', { color: 'green', size: 12 });
        a.note('sn', 360, 384, '여러 대가 파일 공유\nNFS · SMB', { color: 'blue', size: 12 });
        a.note('ss', 595, 384, '디스크처럼 붙여 씀\nFC · iSCSI · DB용', { color: 'violet', size: 12 });
        await a.wait(600);
      },
    },
    {
      t: '전원 — 정전이 나도 꺼지지 않게',
      easy: '병원처럼 데이터센터도 정전에 대비합니다. 평소엔 한전 전기를 쓰다가, 정전이 나면 UPS(큰 배터리)가 그 순간 끊김 없이 이어 주고, 몇십 초 안에 발전기가 켜져 오래 버팁니다. 게다가 전기가 들어오는 길을 A·B 두 갈래로 만들어 서버의 전원 장치 2개에 하나씩 꽂아 두니, 한쪽 길을 고치는 중에도 서버는 꺼지지 않아요.',
      deep: '일반적인 경로는 수전(가능하면 2회선) → ATS(자동 절체 스위치) → UPS → PDU → 서버 PSU이고, UPS는 발전기 기동·절체(보통 10초~수십 초)를 넘길 만큼(수 분~십수 분) 용량을 잡으며, 발전기 연료는 수십 시간 이상 운전을 목표로 비축하는 경우가 많습니다. A/B 이중 경로(2N)는 한쪽 전체를 멈추고 점검해도 서비스가 유지되는 "동시 유지보수"를 가능하게 하며, 이런 수준은 업계의 Tier(I~IV) 같은 등급으로 표현하기도 합니다.',
      async run(a) {
        wipe(a);
        a.node('grid', 76, 110, { label: '한전 전기', icon: '⚡', color: 'amber', w: 116, h: 62 });
        a.node('gen', 76, 300, { label: '발전기', sub: '대기 중', icon: '⛽', color: 'gray', w: 116, h: 62 });
        a.node('ats', 208, 205, { label: '자동 절체', sub: 'ATS', color: 'gray', w: 100, h: 54, size: 13.5 });
        a.node('upsA', 342, 115, { label: 'UPS A', sub: '배터리', icon: '🔋', color: 'teal', w: 104, h: 62 });
        a.node('upsB', 342, 295, { label: 'UPS B', sub: '배터리', icon: '🔋', color: 'teal', w: 104, h: 62 });
        a.node('pduA', 476, 115, { label: '랙 전원 A', color: 'red', w: 96, h: 46, size: 13.5 });
        a.node('pduB', 476, 295, { label: '랙 전원 B', color: 'blue', w: 96, h: 46, size: 13.5 });
        a.node('srv', 610, 205, { label: '서버', sub: '전원 장치 2개', icon: '🖥️', color: 'green', w: 104, h: 70 });
        a.edge('grid', 'ats', { id: 'eg' });
        a.edge('gen', 'ats', { id: 'egen', dashed: true });
        a.edge('ats', 'upsA');
        a.edge('ats', 'upsB');
        a.edge('upsA', 'pduA', { id: 'eua' });
        a.edge('upsB', 'pduB');
        a.edge('pduA', 'srv', { id: 'epa' });
        a.edge('pduB', 'srv');
        const bA = a.bar('batA', 297, 160, 90, { color: 'teal', value: 1 });
        const bB = a.bar('batB', 297, 340, 90, { color: 'teal', value: 1 });
        const PA = [null, [342, 115], [476, 115], [610, 205]];
        const PB = [null, [342, 295], [476, 295], [610, 205]];
        const wave = (src, useA = true) => a.par(
          ...(useA ? [flow(a, [...src, ...PA.slice(1)], 'amber', 1200)] : []),
          flow(a, [...src, ...PB.slice(1)], 'amber', 1200),
        );
        // 평소
        a.caption('평소: 한전 → 자동 절체 → UPS → 랙 전원 A·B → 서버의 전원 장치 2개');
        await wave([[76, 110], [208, 205]]);
        // 정전
        a.setNode('grid', { label: '정전!', color: 'red' });
        a.hl('grid', true, 'red');
        await a.fade('eg', 0.15, 250);
        a.caption('정전! — UPS 배터리가 그 순간 끊김 없이 이어받아요');
        a.setNode('upsA', { sub: '배터리로 공급' });
        a.setNode('upsB', { sub: '배터리로 공급' });
        await a.par(flow(a, PA.slice(1), 'teal', 900), flow(a, PB.slice(1), 'teal', 900), bA.set(0.7, 1200), bB.set(0.7, 1200));
        a.note('ng', 76, 380, '발전기 시동 중…\n보통 수십 초 안', { color: 'amber', size: 12 });
        await a.flash('gen');
        // 발전기
        a.remove('ng');
        a.setNode('gen', { sub: '가동 중', color: 'green' });
        a.setNode('ats', { sub: '발전기로 전환', color: 'amber' });
        a.setNode('upsA', { sub: '충전 중' });
        a.setNode('upsB', { sub: '충전 중' });
        a.caption('발전기가 켜지면 절체 스위치가 발전기로 전환 — 몇 시간이고 버팁니다');
        await a.par(wave([[76, 300], [208, 205]]), bA.set(1, 1200), bB.set(1, 1200));
        // A 경로 점검
        a.setNode('upsA', { label: 'UPS A', sub: '점검 중', color: 'gray' });
        a.setNode('pduA', { color: 'gray' });
        await a.par(a.fade('eua', 0.15, 250), a.fade('epa', 0.15, 250));
        a.caption('A 경로를 통째로 멈추고 점검해도 — B 경로로 서버는 계속 켜져 있어요');
        await wave([[76, 300], [208, 205]], false);
        a.badge('srv', '켜져 있음', 'green');
        await a.flash('srv');
        await a.wait(400);
      },
    },
    {
      t: '냉각 — 찬 통로와 더운 통로, 그리고 PUE',
      easy: '서버는 전기를 쓰는 만큼 열을 냅니다. 그래서 랙의 앞면끼리 마주 보게 줄을 세워 앞쪽 통로로는 찬 공기만 넣고, 서버를 지나며 데워진 공기는 뒤쪽 통로로 모아 냉각기로 돌려보내요. 찬 공기와 더운 공기가 섞이지 않을수록 냉각 전기가 덜 듭니다. 이 효율을 재는 숫자가 PUE인데, "전체 전기 ÷ 서버 등 IT 장비 전기"라서 1.0에 가까울수록 좋습니다.',
      deep: '핫/콜드 아일 배치에 통로 차폐(containment)를 더하면 혼합 손실이 줄어 공급 온도를 올릴 수 있고(권고 흡기 온도 대략 18~27°C 범위), 외기 냉방(free cooling)과 고밀도 랙의 액체 냉각(후면 도어·칩 직접 냉각)이 늘고 있습니다. PUE는 전체 시설 전력 ÷ IT 장비 전력으로, 업계 조사상 평균이 대략 1.5 안팎이고 대형 최신 시설은 1.1~1.2 수준을 공개하기도 합니다(측정 범위·기후에 따라 차이가 커 단순 비교는 조심). 물 사용량(WUE) 같은 다른 지표도 함께 봅니다.',
      async run(a) {
        wipe(a);
        const RX = [232, 352, 472, 592];
        a.raw('rect', { x: 128, y: 70, width: 87, height: 190, style: soft('red') }, 'zone');
        a.raw('rect', { x: 249, y: 70, width: 86, height: 190, style: soft('blue') }, 'zone');
        a.raw('rect', { x: 369, y: 70, width: 86, height: 190, style: soft('red') }, 'zone');
        a.raw('rect', { x: 489, y: 70, width: 86, height: 190, style: soft('blue') }, 'zone');
        a.raw('rect', { x: 609, y: 70, width: 95, height: 190, style: soft('red') }, 'zone');
        for (const [x, l, c] of [[171, '더운 통로', 'red'], [292, '찬 통로', 'blue'], [412, '더운 통로', 'red'], [532, '찬 통로', 'blue'], [656, '더운 통로', 'red']]) a.text(x, 82, l, { size: 11.5, color: c, weight: 800, layer: 'edge' });
        a.node('crah', 66, 165, { label: '냉각기', icon: '❄️', color: 'blue', w: 88, h: 190 });
        RX.forEach((x, i) => a.node('k' + i, x, 170, { label: '랙', sub: '줄', color: 'gray', w: 34, h: 170, size: 13 }));
        a.raw('path', { d: 'M656 58 V48 H66 V62', class: 'edge dashed ec-red', 'marker-end': 'url(#ah)', style: 'fill: none' }, 'edge');
        a.text(360, 35, '더운 공기는 위로 모아 냉각기로', { size: 11.5, color: 'red', weight: 700, layer: 'edge' });
        a.raw('path', { d: 'M110 268 V276 H532 V262', class: 'edge dashed ec-blue', 'marker-end': 'url(#ah)', style: 'fill: none' }, 'edge');
        a.text(400, 288, '찬 공기는 바닥 아래로 찬 통로에', { size: 11.5, color: 'blue', weight: 700, layer: 'edge' });
        // 공기 흐름: 찬 통로 → 랙 통과 → 더운 통로
        a.caption('찬 공기는 랙 앞면으로 들어가, 서버를 식히고 뒷면으로 더워져 나옵니다');
        const lanes = [[292, 171], [292, 412], [532, 412], [532, 656]];
        for (const y of [120, 175, 230]) {
          await a.par(...lanes.map(async ([from, to]) => {
            const p = dot(a, [from, y], 'blue');
            const rackX = (from + to) / 2;
            await a.move(p, [rackX + (from < to ? -24 : 24), y], 350);
            p.set(null, 'red');
            await a.move(p, [to, y], 350);
            await a.fadeOut(p, 120);
          }));
        }
        // PUE
        a.text(360, 316, 'PUE = 데이터센터 전체 전기 ÷ IT 장비 전기', { size: 13.5, weight: 800, layer: 'edge' });
        const X0 = 80, U = 3.7; // 1단위당 px
        const it = a.raw('rect', { x: X0, y: 332, width: 100 * U, height: 30, rx: 6, style: 'fill: color-mix(in srgb, var(--green) 45%, var(--panel2))' }, 'node');
        const ov = a.raw('rect', { x: X0 + 100 * U, y: 332, width: 50 * U, height: 30, rx: 6, style: 'fill: color-mix(in srgb, var(--amber) 45%, var(--panel2))' }, 'node');
        a.text(X0 + 50 * U, 347, 'IT 장비(서버·스위치) 100', { size: 12.5, weight: 700, layer: 'top' });
        const ovT = a.text(X0 + 125 * U, 347, '냉각 등 50', { size: 12.5, weight: 700, layer: 'top' });
        const res = a.text(360, 384, 'PUE = 150 ÷ 100 = 1.5', { size: 15, weight: 800, color: 'amber', layer: 'top' });
        a.caption('예: 서버에 100을 쓰는데 냉각·조명 등에 50을 더 쓰면 PUE 1.5');
        await appear(a, [it, ov], 300);
        await a.wait(900);
        a.caption('통로를 막아 공기가 섞이지 않게 하고 바깥 찬 공기를 쓰면 부대 전기가 줄어요');
        await a.tween(900, (k) => {
          const v = 50 - 30 * k;
          ov.setAttribute('width', v * U);
          ovT.setAttribute('x', X0 + (100 + v / 2) * U);
        });
        ovT.textContent = '20';
        res.textContent = 'PUE = 120 ÷ 100 = 1.2';
        res.setAttribute('class', 'tx tc-green');
        a.text(360, 410, '1.0에 가까울수록 전기가 거의 다 IT 장비에 쓰인다는 뜻', { size: 11.5, cls: 'muted', layer: 'top' });
        await a.wait(600);
      },
    },
    {
      t: '센터 하나로 부족할 때 — 가용 영역 · 재해복구, 그리고 클라우드',
      easy: '건물 전체가 정전·화재·홍수를 겪으면 그 안의 예비 장비도 소용없습니다. 그래서 가까운 도시 안에 따로 떨어진 센터 여러 곳(가용 영역)에 똑같이 나눠 두고, 아주 큰 재난에 대비해 멀리 떨어진 재해복구(DR) 센터에도 데이터를 보내 둡니다. 병원이 다른 지역 병원과 협력하는 것처럼요. 클라우드는 이런 건물·전원·냉각·예비 장비를 직접 짓지 않고 빌려 쓰는 것입니다.',
      deep: '가용 영역(AZ)은 전원·냉각·네트워크가 독립된 센터(군)로, 보통 수 km~수십 km 떨어져 왕복 지연이 수 ms 이하라 동기 복제가 가능합니다. DR 센터는 수백 km 떨어진 곳에 비동기 복제로 두며, 목표는 RPO(잃어도 되는 데이터 시간)와 RTO(복구까지 걸리는 시간)로 정하고 액티브-스탠바이·액티브-액티브 등으로 설계합니다. 클라우드도 리전·AZ 장애는 실제로 일어나므로 멀티 AZ 배치와 정기적인 DR 훈련은 사용자 몫입니다(공동 책임 모델).',
      async run(a) {
        wipe(a);
        a.zone('zr', 16, 34, 440, 236, { label: '지역(리전) — 같은 도시권', color: 'blue' });
        a.zone('zd', 472, 34, 232, 236, { label: '멀리 떨어진 곳 (수백 km)', color: 'violet' });
        const AZ = [['az1', 100, '센터 A'], ['az2', 236, '센터 B'], ['az3', 372, '센터 C']];
        for (const [id, x, l] of AZ) a.node(id, x, 140, { label: l, sub: '가용 영역', icon: '🏢', color: 'green', w: 112, h: 74 });
        a.node('dr', 588, 140, { label: '재해복구 센터', sub: 'DR', icon: '🏢', color: 'violet', w: 150, h: 74 });
        a.edge('az1', 'az2', { both: true, id: 'e12' });
        a.edge('az2', 'az3', { both: true, id: 'e23' });
        a.edge('az3', 'dr', { dashed: true, label: '비동기 복제', ly: -16, id: 'e3d' });
        a.text(236, 214, '서로 수 km~수십 km · 동기 복제', { size: 11.5, cls: 'muted', layer: 'edge' });
        a.node('u', 236, 340, { label: '사용자', icon: '🙂', color: 'blue', w: 96, h: 54 });
        for (const [id] of AZ) a.edge('u', id, { id: 'eu-' + id });
        a.edge('u', 'dr', { id: 'eu-dr', dashed: true, hidden: true });
        // 복제
        a.caption('데이터를 가까운 센터들에 똑같이, 먼 DR 센터에도 조금 늦게 복사해 둡니다');
        await a.par(
          a.send('az1', 'az2', '복제', { color: 'teal', dur: 600 }),
          a.wait(200).then(() => a.send('az2', 'az3', '복제', { color: 'teal', dur: 600 })),
        );
        await a.send('az3', 'dr', '복제(조금 늦게)', { color: 'violet', dur: 800 });
        // 평소 요청
        await a.par(...AZ.map(([id], i) => a.wait(i * 120).then(() => a.send('u', id, '요청', { color: 'blue', dur: 600 }))));
        // 센터 A 장애
        a.setNode('az1', { sub: '정전·화재', color: 'red' });
        a.hl('az1', true, 'red');
        await a.par(a.fade('eu-az1', 0.12, 300), a.fade('e12', 0.12, 300));
        a.caption('센터 A가 통째로 멈춰도 — B·C가 이어받아 서비스는 계속');
        await a.par(a.send('u', 'az2', '요청', { color: 'blue', dur: 600 }), a.send('u', 'az3', '요청', { color: 'blue', dur: 600 }));
        // 지역 전체 재해
        a.caption('지역 전체가 큰 재난을 겪으면 — 멀리 있는 DR 센터로 전환');
        for (const [id] of AZ.slice(1)) { a.setNode(id, { sub: '지역 재난', color: 'red' }); a.hl(id, true, 'red'); }
        await a.par(a.fade('eu-az2', 0.12, 300), a.fade('eu-az3', 0.12, 300), a.fade('e23', 0.12, 300));
        a.hl('dr', true, 'green');
        a.setNode('dr', { sub: '가동 전환', color: 'green' });
        await a.show('eu-dr', 300);
        await a.send('u', 'dr', '요청', { color: 'blue', dur: 800 });
        a.text(588, 210, 'RPO: 잃어도 되는 데이터 양', { size: 11.5, weight: 700, layer: 'edge' });
        a.text(588, 230, 'RTO: 다시 열기까지 시간', { size: 11.5, weight: 700, layer: 'edge' });
        a.note('cloud', 560, 350, '클라우드 = 건물·전원·냉각·예비 장비를\n직접 짓지 않고 빌려 쓰는 것', { color: 'amber', size: 12 });
        await a.wait(600);
      },
    },
  ],
};

// 컴퓨터 속 여행: 저장장치(SSD) → 메모리(RAM) → CPU → GPU·모니터
const ROW = 150;
const X = { ssd: 76, ram: 216, cpu: 360, gpu: 504, mon: 644 };

/** 인출·해독·실행 단계 표시(맨 위 글자) */
function stage(a, k) {
  ['fde0', 'fde1', 'fde2'].forEach((id, i) => {
    const t = a.get(id);
    if (t) t.setAttribute('class', 'tx ' + (i === k ? 'tc-amber' : 'muted'));
  });
}

export default {
  id: 'computer',
  level: 1,
  cat: '컴퓨터 기초',
  title: '컴퓨터 속 여행 — CPU·메모리·저장장치',
  sub: '사진 앱을 더블클릭하면 컴퓨터 안에서는 무슨 일이 벌어질까?',
  analogy: '컴퓨터는 식당 주방과 같습니다. SSD는 재료가 잔뜩 쌓인 창고, RAM은 지금 요리할 재료만 올려 두는 작업대, CPU는 요리사입니다. 요리사는 창고까지 뛰어가지 않고, 작업대와 손 닿는 양념통(캐시)에서 재료를 집어 빠르게 요리합니다.',
  keys: [
    '프로그램과 파일은 평소 SSD(저장장치)에 보관된다. 전원이 꺼져도 지워지지 않는다.',
    '실행하려면 먼저 RAM(메모리)으로 불러와야 한다. CPU는 RAM에 있는 것만 다룰 수 있다.',
    'CPU는 명령어를 인출 → 해독 → 실행하는 일을 1초에 수십억 번 반복한다.',
    'CPU에 가까울수록(레지스터 > 캐시 > RAM > SSD) 빠르지만 작고 비싸다.',
    'RAM은 전원이 꺼지면 내용이 사라진다. 그래서 저장하지 않은 작업은 날아간다.',
  ],
  terms: [
    ['CPU', '중앙처리장치. 명령어를 읽고 계산하는 컴퓨터의 두뇌(요리사)'],
    ['RAM', '주기억장치. 지금 실행 중인 프로그램과 데이터를 올려 두는 빠른 임시 공간'],
    ['SSD', '저장장치. 전원이 꺼져도 파일이 남는 창고. HDD보다 훨씬 빠르다'],
    ['캐시', 'CPU 안의 아주 작고 빠른 메모리(L1·L2·L3). 자주 쓰는 데이터를 가까이 둔다'],
    ['레지스터', 'CPU가 계산할 때 직접 쥐고 있는 몇 개의 값. 가장 빠른 저장 공간'],
    ['GPU', '그래픽 처리 장치. 화면에 그릴 픽셀을 한꺼번에 계산한다'],
  ],
  quiz: [
    { q: '전원을 끄면 안에 있던 내용이 모두 사라지는 곳은 어디일까요?', c: ['SSD(저장장치)', 'RAM(메모리)', 'USB 메모리', 'HDD(하드디스크)'], a: 1, why: 'RAM은 휘발성이라 전원이 끊기면 내용이 지워집니다. SSD·HDD·USB 메모리는 비휘발성이라 전원 없이도 남아 있어요.', step: 6 },
    { q: 'CPU에서 가까운 순서(= 빠른 순서)로 바르게 나열한 것은?', c: ['레지스터 → 캐시 → RAM → SSD', '캐시 → 레지스터 → SSD → RAM', 'RAM → 캐시 → 레지스터 → SSD', '레지스터 → RAM → 캐시 → SSD'], a: 0, why: '레지스터(<1ns) → 캐시(~1–10ns) → RAM(~100ns) → SSD(수십 µs) 순입니다. 가까울수록 빠르지만 작고 비쌉니다.', step: 3 },
    { q: '앱을 실행할 때 OS 로더는 실행 파일을 어떻게 RAM에 올릴까요?', c: ['실행 전에 파일 전체를 한 번에 RAM으로 복사한다', '실행 파일을 CPU 캐시에 통째로 올려 둔다', 'SSD에서 바로 실행하므로 RAM에는 올리지 않는다', '가상 메모리에 매핑해 두고, 실제로 접근하는 페이지만 그때 읽어 온다'], a: 3, why: 'demand paging입니다. 로더는 실행 파일을 가상 메모리에 매핑만 하고, 접근한 페이지에서 페이지 폴트가 나면 그 부분만 디스크에서 RAM으로 읽어 옵니다.', step: 1 },
  ],
  setup(a) {
    a.node('app', 76, 52, { label: '사진 앱', icon: '🖼️', color: 'pink', w: 100, h: 54 });
    a.node('ssd', X.ssd, ROW, { label: 'SSD', sub: '창고', icon: '📦', color: 'violet', w: 112, h: 74 });
    a.node('ram', X.ram, ROW, { label: 'RAM', sub: '작업대 · 비어 있음', icon: '🧾', color: 'teal', w: 124, h: 74 });
    a.node('cpu', X.cpu, ROW, { label: 'CPU', sub: '요리사', icon: '🧑‍🍳', color: 'amber', w: 112, h: 74 });
    a.node('gpu', X.gpu, ROW, { label: 'GPU', sub: '그림 담당', icon: '🎨', color: 'green', w: 112, h: 74 });
    a.node('mon', X.mon, ROW, { label: '모니터', sub: '꺼진 화면', icon: '⬛', color: 'blue', w: 112, h: 74 });
    a.node('cache', 330, 258, { label: '캐시', sub: 'L1·L2·L3', icon: '🧂', color: 'amber', w: 100, h: 62, hidden: true });
    a.node('reg', 470, 258, { label: '레지스터', sub: '손에 쥔 값', icon: '✋', color: 'amber', w: 104, h: 62, hidden: true });
    a.edge('ssd', 'ram', { both: true });
    a.edge('ram', 'cpu', { both: true });
    a.edge('cpu', 'gpu');
    a.edge('gpu', 'mon');
    a.edge('ram', 'cache', { id: 'e-cache', both: true, dashed: true, hidden: true });
    a.edge('cache', 'cpu', { id: 'e-cc', both: true, hidden: true });
    a.edge('cpu', 'reg', { id: 'e-reg', both: true, hidden: true });
    a.bar('ramBar', X.ram - 55, 204, 110, { color: 'teal' });
    a.text(X.ram, 223, '사용 0%', { id: 'ramPct', size: 11.5, cls: 'muted', layer: 'edge' });
  },
  steps: [
    {
      t: '더블클릭 — 프로그램은 창고(SSD)에 있다',
      easy: '사진 앱 아이콘을 더블클릭합니다. 이 앱의 실제 내용(프로그램 파일)은 SSD라는 창고에 보관되어 있어요. 창고는 전원이 꺼져도 내용을 잊지 않습니다.',
      deep: '셸(탐색기·Finder)이 OS에 프로세스 생성을 요청합니다(Windows CreateProcess, Linux fork+exec). 실행 파일(PE/ELF/Mach-O)은 SSD의 파일 시스템에 있고, NAND 플래시는 비휘발성이라 전원 없이도 데이터를 유지합니다.',
      async run(a) {
        a.caption('딸깍딸깍! 사진 앱 실행');
        await a.flash('app', 2);
        a.hl('app');
        await a.send('app', 'cpu', '실행해 줘', { color: 'pink', via: [[X.cpu, 52]], dur: 900 });
        a.hl('cpu');
        await a.send('cpu', 'ssd', '앱 어디 있지?', { color: 'amber', dy: -56, dur: 800 });
        a.hl('ssd', true, 'green');
        a.badge('ssd', '사진앱 200MB', 'violet');
        await a.flash('ssd');
        a.hl('app', false);
        a.hl('cpu', false);
      },
    },
    {
      t: '작업대(RAM)로 불러오기 — 로딩',
      easy: '요리사(CPU)는 창고에서 바로 요리하지 않습니다. 필요한 재료를 작업대(RAM)로 먼저 옮겨 와요. 앱을 켤 때 잠깐 기다리는 "로딩"이 바로 이 시간입니다.',
      deep: 'OS 로더가 실행 파일을 가상 메모리에 매핑하고, 실제로 접근하는 페이지만 디스크에서 RAM으로 읽어 옵니다(demand paging, 페이지 폴트). 필요한 공유 라이브러리(DLL/.so)도 함께 로드됩니다.',
      async run(a) {
        a.caption('창고 → 작업대로 옮기는 중…');
        a.hl('ssd', false);
        a.hl('ram');
        const chunks = [['코드', 'violet'], ['이미지', 'pink'], ['설정', 'gray']];
        const bar = a.get('ramBar');
        await a.par(...chunks.map(([l, c], i) =>
          a.wait(i * 380).then(() => a.send('ssd', 'ram', l, { color: c, dur: 800 })).then(() => bar.set(0.12 * (i + 1), 250))));
        a.setNode('ram', { sub: '작업대 · 사진 앱' });
        a.badge('ssd', null);
        a.setText('ramPct', '사용 36%');
        a.hl('ram', false);
        await a.wait(400);
      },
    },
    {
      t: 'CPU가 명령어를 하나씩 — 인출·해독·실행',
      easy: '이제 요리사가 레시피(명령어)를 한 줄씩 읽습니다. ① 가져오고(인출) ② 무슨 뜻인지 읽고(해독) ③ 실행합니다. 자주 쓰는 것은 손 닿는 양념통(캐시)과 손바닥(레지스터)에 둡니다.',
      deep: '명령어 사이클: PC(프로그램 카운터)가 가리키는 주소에서 명령어를 인출(캐시 미스면 RAM까지) → 디코더가 해독 → ALU가 레지스터 값으로 실행 → 결과를 레지스터/메모리에 기록. 실제 CPU는 파이프라이닝·비순차 실행으로 여러 명령을 겹쳐 처리하며, 3GHz면 1클럭이 약 0.33ns입니다.',
      async run(a) {
        await a.par(a.show('cache'), a.show('reg'), a.show('e-cache'), a.show('e-cc'), a.show('e-reg'));
        a.text(270, 30, '① 인출', { id: 'fde0', size: 15, weight: 800, cls: 'muted', layer: 'pkt' });
        a.text(360, 30, '② 해독', { id: 'fde1', size: 15, weight: 800, cls: 'muted', layer: 'pkt' });
        a.text(450, 30, '③ 실행', { id: 'fde2', size: 15, weight: 800, cls: 'muted', layer: 'pkt' });
        const ins = [['LOAD 픽셀', '값 120'], ['ADD 밝기+10', '값 130'], ['STORE 결과', '저장 ✓']];
        for (let i = 0; i < ins.length; i++) {
          stage(a, 0);
          a.caption(`명령어 ${i + 1}: ${ins[i][0]}`);
          const p = a.packet(ins[i][0], { at: 'ram', color: 'teal', id: 'ins' });
          await a.move(p, i === 0 ? ['cache', 'cpu'] : ['cpu'], i === 0 ? 900 : 500);
          a.hl('cpu');
          stage(a, 1);
          p.set('해독 중…', 'amber');
          await a.flash('cpu');
          stage(a, 2);
          await a.fadeOut(p, 150);
          a.badge('reg', ins[i][1], 'amber');
          await a.flash('reg');
          a.hl('cpu', false);
        }
        stage(a, -1);
        a.badge('cache', '자주 쓰는 것', 'amber');
        await a.wait(300);
      },
    },
    {
      t: '속도 차이 — 가까울수록 빠르다',
      easy: '같은 재료를 가져와도 어디서 가져오느냐에 따라 시간이 엄청 다릅니다. 캐시를 1초라고 치면, RAM은 약 1분 40초, SSD는 하루가 넘게 걸리는 셈이에요!',
      deep: '대략적인 접근 지연: 레지스터 <1ns, L1 캐시 ~1ns, L3 ~10ns, DRAM ~80–100ns, NVMe SSD 랜덤 읽기 ~20–100µs, HDD ~5–10ms. 그래서 CPU는 계층형 메모리와 캐시 지역성(locality)에 크게 의존합니다.',
      async run(a) {
        a.clear('pkt');
        a.badge('cache', null);
        a.badge('reg', null);
        a.text(360, 312, '같은 데이터 하나를 가져오는 경주 (캐시 = 1초로 환산)', { size: 12.5, cls: 'muted', layer: 'pkt' });
        const lanes = [['캐시', '~1ns · 1초', 'amber', 344], ['RAM', '~100ns · 1분 40초', 'teal', 378], ['SSD', '~100µs · 약 1.2일', 'violet', 412]];
        for (const [lab, t, c, y] of lanes) {
          a.text(24, y, lab, { size: 13, weight: 700, anchor: 'start', layer: 'pkt' });
          a.raw('line', { x1: 78, y1: y, x2: 520, y2: y, class: 'edge dashed' }, 'pkt');
          a.raw('line', { x1: 520, y1: y - 12, x2: 520, y2: y + 12, class: 'edge' }, 'pkt');
          a.text(532, y, t, { size: 12, anchor: 'start', color: c, weight: 700, layer: 'pkt', id: 'lt-' + lab });
          a.get('lt-' + lab).style.opacity = 0;
        }
        const pc = a.packet('📦', { at: [92, 344], color: 'amber', w: 30, h: 22, layer: 'pkt' });
        const pr = a.packet('📦', { at: [92, 378], color: 'teal', w: 30, h: 22, layer: 'pkt' });
        const ps = a.packet('📦', { at: [92, 412], color: 'violet', w: 30, h: 22, layer: 'pkt' });
        a.caption('출발!');
        await a.par(
          a.move(pc, [500, 344], 350).then(() => a.show('lt-캐시', 200)),
          a.move(pr, [500, 378], 2600).then(() => a.show('lt-RAM', 200)),
          a.move(ps, [118, 412], 2600),
        );
        await a.show('lt-SSD', 300);
        a.text(300, 412, 'SSD는 아직 출발선 근처…', { size: 12, color: 'violet', layer: 'pkt' });
        a.caption('그래서 CPU는 자주 쓰는 데이터를 캐시에 둡니다');
        await a.wait(900);
      },
    },
    {
      t: '결과를 화면으로 — GPU와 모니터',
      easy: 'CPU가 계산을 마치면 "이 사진을 그려 줘"라고 GPU에 넘깁니다. 그림 전문가인 GPU는 수백만 개의 점(픽셀)을 한꺼번에 칠해 모니터로 보내요.',
      deep: 'CPU는 그래픽 API(DirectX/Metal/Vulkan/OpenGL)로 GPU에 그리기 명령과 텍스처를 넘깁니다. GPU는 수천 개의 코어로 픽셀을 병렬 계산해 프레임 버퍼에 쓰고, 디스플레이 컨트롤러가 이를 60Hz(16.7ms마다) 등으로 HDMI/DP를 통해 모니터에 내보냅니다.',
      async run(a) {
        a.clear('pkt');
        a.hl('cpu');
        await a.send('cpu', 'gpu', '이 사진 그려 줘', { color: 'amber', dy: -50, dur: 900 });
        a.hl('cpu', false);
        a.hl('gpu');
        a.badge('gpu', '픽셀 830만 개', 'green');
        await a.flash('gpu');
        await a.send('gpu', 'mon', '화면 한 장', { color: 'green', dy: -50, dur: 700 });
        a.setNode('mon', { icon: '🏞️', sub: '사진 표시 중' });
        a.hl('mon', true, 'green');
        await a.flash('mon');
        a.hl('gpu', false);
        a.badge('gpu', null);
        a.caption('사진이 화면에 나타났어요');
        a.note('n-fps', 612, 330, '1초에 60번\n다시 그려요 (60Hz)', { color: 'green' });
        await a.wait(500);
      },
    },
    {
      t: '앱을 여러 개 켜면 — 작업대가 꽉 찬다',
      easy: '브라우저와 게임까지 켜면 작업대(RAM)가 꽉 찹니다. 자리가 모자라면 컴퓨터는 창고(SSD)를 임시 작업대로 쓰는데, 창고는 멀어서 컴퓨터가 확 느려져요. 앱을 닫으면 그 자리가 다시 비워집니다.',
      deep: '물리 메모리가 부족하면 OS는 덜 쓰는 페이지를 스왑/페이지 파일(SSD)로 내보냅니다(paging). SSD는 RAM보다 수백~수천 배 느려 스래싱이 생깁니다. 프로세스가 종료되면 OS가 그 프로세스의 페이지를 모두 회수해 다른 프로그램에 줍니다.',
      async run(a) {
        a.hl('mon', false);
        a.remove('n-fps');
        const bar = a.get('ramBar');
        a.hl('ram');
        await a.par(
          a.send('ssd', 'ram', '브라우저', { color: 'blue', dur: 700 }).then(() => bar.set(0.62, 250)),
          a.wait(350).then(() => a.send('ssd', 'ram', '게임', { color: 'red', dur: 700 })).then(() => bar.set(0.95, 250)),
        );
        a.setNode('ram', { sub: '사진·브라우저·게임', color: 'red' });
        a.setText('ramPct', '사용 95%');
        a.badge('ram', '꽉 참!', 'red');
        a.note('n-full', X.ram + 10, 350, '작업대 꽉 참 →\n창고까지 왔다 갔다 → 느려짐 🐢', { color: 'red' });
        await a.par(a.send('ram', 'ssd', '임시 보관', { color: 'gray', dy: 48, dur: 600 }), a.flash('ram'));
        await a.wait(500);
        a.remove('n-full');
        a.caption('게임을 닫으면…');
        const out = a.packet('게임 ✕', { at: 'ram', color: 'red', id: 'bye' });
        await a.par(a.move(out, [X.ram, 250], 500), a.fade(out, 0, 500));
        a.remove('bye');
        await bar.set(0.62, 400);
        a.setNode('ram', { sub: '사진·브라우저', color: 'teal' });
        a.setText('ramPct', '사용 62%');
        a.badge('ram', null);
        a.note('n-free', X.ram, 350, '자리가 비워져 다시 쾌적 ✓', { color: 'green' });
        a.hl('ram', false);
        await a.wait(600);
      },
    },
    {
      t: '전원을 끄면 — RAM은 지워지고 SSD는 남는다',
      easy: '전원을 끄면 작업대(RAM)의 모든 내용이 싹 사라집니다. 그래서 "저장"을 눌러 창고(SSD)에 넣어 둬야 해요. 창고에 있는 앱과 사진은 다음에 켜도 그대로 있습니다.',
      deep: 'DRAM은 축전기에 전하로 비트를 저장해 수십 ms마다 리프레시가 필요하고, 전원이 끊기면 내용이 사라집니다(휘발성). NAND 플래시는 플로팅 게이트/차지 트랩에 전자를 가둬 전원 없이 유지됩니다(비휘발성). 그래서 앱은 저장 시 fsync 등으로 디스크에 확실히 기록합니다.',
      async run(a) {
        a.remove('n-free');
        await a.send('ram', 'ssd', '사진 저장 💾', { color: 'pink', dy: -50, dur: 800 });
        a.badge('ssd', '사진 저장됨', 'violet');
        a.caption('전원 끄기…');
        await a.wait(300);
        await a.par(...['app', 'cpu', 'gpu', 'mon', 'cache', 'reg'].map((n) => a.fade(n, 0.3, 500)));
        a.setNode('mon', { icon: '⬛', sub: '꺼진 화면' });
        await a.get('ramBar').set(0, 700);
        a.setNode('ram', { sub: '텅 빔', color: 'gray' });
        a.setText('ramPct', '사용 0%');
        a.badge('ram', '지워짐', 'red');
        a.hl('ssd', true, 'green');
        a.badge('ssd', '그대로 ✓', 'green');
        a.note('n-off', 200, 360, 'RAM: 전원 꺼지면 사라짐 (휘발성)\nSSD: 전원 없어도 남음 (비휘발성)', { color: 'violet' });
        await a.flash('ssd');
        await a.wait(500);
      },
    },
  ],
};

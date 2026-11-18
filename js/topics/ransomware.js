// 랜섬웨어: 들어오는 길(피싱 첨부·패치 안 된 구멍·약한 원격 접속) → 안에서 퍼지기 → 파일 암호화와 몸값 요구
// → 이중 협박(먼저 빼내기) → 3-2-1 백업 → 여러 겹 방어 → 당했을 때 대응
// 회사·파일 이름은 모두 설명용 예시이며 실제 조직·악성코드와 무관하다. 시간·숫자도 예시 값.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 28, w: o.w, size: o.size || 12.5, hidden: o.hidden, id: o.id });
}
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
const tint = (c, p = 16) => `fill:color-mix(in srgb, var(--${c}) ${p}%, var(--panel));stroke:color-mix(in srgb, var(--${c}) 60%, transparent);stroke-width:1.5`;

async function item(a, x, y, mark, s, color, o = {}) {
  const m = a.text(x, y, mark, { size: o.msize || 15, weight: 800, color, hidden: true });
  const t = a.text(x + 22, y, s, { size: o.size || 13, anchor: 'start', weight: 700, hidden: true });
  await appear(a, [m, t], 220);
  await a.wait(o.gap ?? 220);
}

/** 회사 네트워크(0·1단계 공통 무대) */
function office(a) {
  a.node('atk', 92, 220, { label: '공격자', icon: '🕵️', color: 'red', w: 112, h: 70 });
  a.zone('co', 366, 52, 334, 340, { label: '회사 네트워크', color: 'blue' });
  a.node('pc1', 452, 122, { label: '직원 PC', icon: '💻', color: 'blue', w: 132, h: 64 });
  a.node('web', 452, 222, { label: '공개 서버', sub: '업데이트 안 됨', icon: '🖥️', color: 'blue', w: 132, h: 70 });
  a.node('rdp', 452, 322, { label: '원격 접속', sub: '약한 비밀번호', icon: '🔑', color: 'blue', w: 132, h: 70 });
  a.node('pc2', 626, 122, { label: '다른 PC', icon: '💻', color: 'blue', w: 112, h: 64 });
  a.node('fs', 626, 222, { label: '파일 서버', shape: 'db', color: 'teal', w: 112, h: 70 });
  a.node('bk', 626, 322, { label: '백업', sub: '늘 연결됨', shape: 'db', color: 'teal', w: 112, h: 70 });
}
const ENTRY = [['pc1', 122, '📎 피싱 첨부파일', 'amber'], ['web', 222, '⚠️ 프로그램의 구멍', 'violet'], ['rdp', 322, '🔑 비번 대입', 'teal']];

/** 파일 타일 */
function tile(a, x, y, icon, name) {
  const g = a.raw('g', { transform: `translate(${x} ${y})` }, 'node');
  const r = a.raw('rect', { x: -48, y: -38, width: 96, height: 76, rx: 10, style: tint('blue', 12) }, g);
  const ic = a.text(0, -14, icon, { size: 20, par: g });
  const nm = a.text(0, 10, name, { size: 11.5, weight: 700, par: g });
  const ex = a.text(0, 26, '.locked', { size: 11, weight: 800, mono: true, color: 'red', par: g });
  ex.style.opacity = 0;
  return { g, r, ic, nm, ex };
}
const FILES = [
  ['📄', '보고서.docx'], ['📊', '매출.xlsx'], ['🖼️', '사진01.jpg'], ['📑', '계약서.pdf'],
  ['📇', '고객.csv'], ['📽️', '발표.pptx'], ['📐', '설계.dwg'], ['🖼️', '사진02.jpg'],
  ['🗄️', '회계.db'], ['📝', '메모.txt'], ['🎨', '로고.png'], ['📦', '자료.zip'],
];

export default {
  id: 'ransomware',
  level: 2,
  cat: '보안',
  title: '랜섬웨어 — 파일을 인질로 잡는 공격',
  sub: '회사 안으로 숨어 들어와 퍼진 뒤, 파일을 암호화하고 자료를 빼내 몸값을 요구하는 공격과 그 대비법',
  analogy: '도둑이 집에 몰래 들어와 모든 서랍에 자기만 열쇠를 가진 자물쇠를 채우고 "열쇠를 원하면 돈을 내라"는 쪽지를 남기는 것과 같아요. 요즘 도둑은 자물쇠를 채우기 전에 중요한 서류를 복사해 가서 "안 내면 공개하겠다"고까지 합니다. 그래서 문단속과 함께, 도둑 손이 닿지 않는 곳에 둔 복사본이 가장 든든한 대비예요.',
  keys: [
    '랜섬웨어는 주로 피싱 메일 첨부파일, 업데이트하지 않은 프로그램의 구멍(취약점), 약한 비밀번호의 원격 접속으로 들어온다.',
    '들어온 공격자는 바로 터뜨리지 않고 권한을 넓히며 다른 PC·서버·백업까지 퍼진 뒤 한꺼번에 암호화한다.',
    '암호화 전에 자료를 빼내 "공개하겠다"고 협박하는 이중 협박이 흔해, 백업만으로는 피해를 다 막을 수 없다.',
    '3-2-1 백업(복사본 3개·매체 2종·1개는 오프라인/변경 불가로 밖에), 패치·최소 권한·다단계 인증·네트워크 분리·탐지(EDR)를 여러 겹으로 쌓는다.',
    '당했다면 감염 기기를 네트워크에서 분리하고 신고(KISA 118 등)하며, 몸값 지불은 복구를 보장하지 않아 권장되지 않는다. 평소 복구 연습이 핵심이다. 허락 없이 남의 시스템에 공격 기법을 시험하는 것은 불법이다.',
  ],
  terms: [
    ['랜섬웨어', '몸값(ransom)과 소프트웨어의 합성어. 파일을 암호화하거나 자료를 빼내 돈을 요구하는 악성 프로그램'],
    ['취약점 · 패치', '프로그램의 보안 구멍과, 그 구멍을 막는 업데이트'],
    ['측면 이동', '처음 들어온 기기에서 같은 네트워크의 다른 기기·서버로 옮겨 가며 장악 범위를 넓히는 것'],
    ['이중 협박', '파일을 암호화하는 것에 더해, 미리 빼낸 자료를 공개하겠다고 협박하는 방식'],
    ['3-2-1 백업', '데이터 복사본 3개를 2종류 매체에 두고, 그중 1개는 다른 장소(오프라인·변경 불가)에 두는 원칙'],
    ['변경 불가(immutable) 백업', '정해진 기간 동안 누구도(관리자 계정으로도) 지우거나 고칠 수 없게 잠근 백업'],
    ['EDR', '단말 탐지·대응. PC·서버의 행동을 지켜보다 대량 암호화 같은 이상 행동을 탐지하고 격리하는 보안 도구'],
    ['RaaS', '서비스형 랜섬웨어. 개발 조직이 도구를 만들고 실행 조직(제휴자)이 침투해 몸값을 나눠 갖는 분업 구조'],
  ],
  quiz: [
    { q: '랜섬웨어에 대비한 백업으로 가장 알맞은 것은?', c: ['복사본 여러 개 중 하나는 분리된 곳(오프라인·변경 불가)에 둔다', 'PC에 늘 꽂아 둔 외장 하드 하나에 복사한다', '같은 서버의 다른 폴더에 복사해 둔다'], a: 0, why: '늘 연결된 백업은 공격자가 함께 암호화하거나 지울 수 있습니다. 3-2-1 원칙처럼 하나는 네트워크에서 떨어져 있거나 바꿀 수 없게 잠가 둬야 마지막까지 남습니다.', step: 4 },
    { q: '랜섬웨어의 "이중 협박"에 대한 설명으로 옳은 것은?', c: ['파일을 두 번 암호화해 복구를 더 어렵게 한다', '두 공격 조직이 같은 회사에 동시에 돈을 요구한다', '암호화 전에 자료를 빼내, 백업으로 복구해도 공개하겠다고 협박한다', '몸값을 두 번에 나눠 받는다'], a: 2, why: '자료를 먼저 빼낸 뒤 암호화하므로, 백업으로 파일을 되살려도 "유출 자료 공개" 협박은 남습니다. 그래서 백업뿐 아니라 침투와 유출을 막는 방어가 함께 필요합니다.', step: 3 },
    { q: '감염 직후, 원인을 확인하기 전에 백업 저장소를 회사 망에 바로 연결해 복구를 시작하면 위험한 이유는?', c: ['백업 파일은 원래 암호화되어 있어 열 수 없기 때문에', '공격자나 악성 프로그램이 아직 망 안에 남아 있어 백업까지 암호화·삭제할 수 있기 때문에', '법적으로 신고 전 복구가 금지되어 있기 때문에', '백업은 항상 최신이라 이미 감염되어 있기 때문에'], a: 1, why: '공격자는 백업을 일부러 노리고, 침투 경로와 남겨 둔 뒷문을 없애기 전에는 다시 들어올 수 있습니다. 격리·조사로 원인을 막고 깨끗한 환경에서 검증된 백업으로 복구해야 합니다.', step: 6 },
  ],
  setup(a) {
    office(a);
  },
  steps: [
    {
      t: '들어오는 길 — 메일, 구멍, 약한 비번',
      easy: '랜섬웨어는 보통 세 가지 길로 들어와요. 직원이 피싱 메일의 첨부파일을 여는 것, 업데이트하지 않은 프로그램의 보안 구멍, 그리고 쉬운 비밀번호로 열려 있는 원격 접속이에요. 셋 중 하나만 뚫려도 안으로 들어올 수 있어요.',
      deep: '대표적인 초기 침투 경로는 피싱(악성 첨부·링크), 인터넷에 노출된 VPN·방화벽·원격 관리 장비 등의 알려진 취약점 악용, 약하거나 유출된 자격 증명으로 RDP·VPN에 로그인하는 것입니다. 침투만 전문으로 해 접근 권한을 파는 초기 접근 브로커(IAB)와, 도구를 빌려주고 수익을 나누는 서비스형 랜섬웨어(RaaS) 분업 구조가 공격을 산업화했습니다. 그래서 "우리 같은 작은 곳을 누가 노리나"가 아니라 자동 스캔에 걸리는 모든 곳이 대상입니다.',
      async run(a) {
        a.clear('pkt', 'top');
        for (const [id, y, l, c] of ENTRY) a.edge('atk', id, { dashed: true, color: c, id: 'en-' + id, hidden: true });
        a.caption('공격자는 열린 문 하나를 찾아요');
        for (const [id, y, l, c] of ENTRY) {
          await a.show('en-' + id, 200);
          const lab = a.text(250, y === 222 ? 206 : y < 222 ? 150 : 294, l, { size: 12, weight: 800, color: c, hidden: true });
          await appear(a, lab, 200);
          const sx = 148, sy = 220 + (y - 220) * 0.15;
          await a.send([sx, sy], [380, y - (y - 220) * 0.05], '침입', { color: 'red', dur: 800, w: 50 });
          a.hl(id, true, 'red');
          a.badge(id, '뚫림', 'red');
          await a.wait(200);
        }
        a.note('n0', 196, 374, '셋 중 하나만 뚫려도\n안으로 들어와요', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '안에서 퍼지기 — 조용히 권한을 넓혀요',
      easy: '안으로 들어온 공격자는 바로 일을 벌이지 않아요. 며칠에서 몇 주 동안 조용히 관리자 권한을 손에 넣고, 다른 PC와 파일 서버, 백업까지 찾아다니며 퍼집니다. 그래야 한 번에 최대한 많이 잠글 수 있으니까요.',
      deep: '공격자는 탈취한 자격 증명과 권한 상승으로 도메인 관리자 수준의 권한을 노리고, 원격 관리 도구나 정상 관리 기능을 악용해(living off the land) 탐지를 피하며 측면 이동합니다. 이 과정에서 백업 서버·백업 콘솔을 찾아 삭제하거나 암호화 대상에 넣고, 보안 도구를 끄려 시도합니다. 침투부터 암호화까지의 체류 기간은 사례마다 크게 다르지만, 이 구간에서 이상 징후를 잡으면 피해를 막을 수 있습니다.',
      async run(a) {
        a.clear('pkt', 'top');
        for (const [id] of ENTRY) { a.badge(id, null); a.hl(id, false); }
        a.hl('pc1', true, 'red');
        a.badge('pc1', '감염', 'red');
        a.caption('관리자 권한을 손에 넣고…');
        const P = await a.send([452, 158], [452, 184], '관리자 권한', { color: 'amber', dur: 500, keep: true, w: 96 });
        await a.wait(300);
        await a.fadeOut(P, 200);
        const T = [['pc2', [518, 122], [570, 122]], ['fs', [518, 160], [570, 204]], ['bk', [518, 170], [570, 306]]];
        for (const [id, from, to] of T) {
          a.edge('pc1', id, { color: 'red', dashed: true, arrow: false });
          await a.send(from, to, '퍼짐', { color: 'red', dur: 600, w: 46 });
          a.hl(id, true, 'red');
          a.badge(id, '장악', 'red');
          await a.wait(150);
        }
        a.note('n1', 196, 360, '며칠~몇 주 조용히 머물며\n권한을 넓히고 백업까지 찾아요', { color: 'red' });
        await a.wait(800);
      },
    },
    {
      t: '파일 암호화 — 열 수 없는 파일과 몸값 요구',
      easy: '준비가 끝나면 한꺼번에 파일을 암호화해요. 파일은 그대로 있지만 내용이 공격자만 아는 열쇠로 뒤섞여서 열리지 않아요. 그리고 "열쇠를 받고 싶으면 돈을 내라"는 화면이 뜹니다.',
      deep: '보통 파일마다 빠른 대칭키(예: AES·ChaCha20)로 암호화하고, 그 키를 공격자의 공개키로 다시 암호화해 두므로 공격자의 개인키 없이는 되돌릴 수 없습니다. 속도를 위해 파일 일부만 암호화하기도 하며, 윈도우 볼륨 섀도 복사본 같은 로컬 복구 지점을 먼저 지우는 경우가 많습니다. 일부 구버전은 구현 실수로 무료 복호화 도구가 공개되기도 하므로, 신고·상담 시 확인해 볼 가치가 있습니다.',
      async run(a) {
        wipe(a);
        a.text(260, 34, '파일 서버의 파일들', { size: 13.5, weight: 800 });
        const T = FILES.map(([ic, nm], i) => tile(a, 92 + (i % 4) * 112, 102 + Math.floor(i / 4) * 96, ic, nm));
        await a.wait(300);
        a.caption('공격자만 아는 열쇠로 하나씩 뒤섞어요');
        for (const t of T) {
          t.r.setAttribute('style', tint('red', 22));
          t.ic.textContent = '🔒';
          t.nm.classList.add('muted');
          t.nm.setAttribute('y', 6);
          await a.tween(160, (k) => (t.ex.style.opacity = k));
        }
        const g = a.raw('g', {}, 'node');
        a.raw('rect', { x: 504, y: 70, width: 196, height: 250, rx: 14, style: tint('red', 24) }, g);
        a.text(602, 100, '🔒 파일이 잠겼습니다', { size: 14, weight: 800, par: g });
        a.text(602, 136, '복구 열쇠를 원하면', { size: 12.5, weight: 700, par: g });
        a.text(602, 156, '기한 안에 몸값을 내라', { size: 12.5, weight: 700, par: g });
        a.text(602, 196, '남은 시간', { size: 11.5, weight: 700, cls: 'muted', par: g });
        const clk = a.text(602, 222, '72:00:00', { size: 22, mono: true, weight: 800, color: 'red', par: g });
        a.text(602, 260, '“기한이 지나면', { size: 12, weight: 700, cls: 'muted', par: g });
        a.text(602, 280, '열쇠를 지운다”', { size: 12, weight: 700, cls: 'muted', par: g });
        g.style.opacity = 0;
        await appear(a, g, 300);
        await a.tween(1600, (k) => {
          const s = 72 * 3600 - Math.round(k * 4);
          const f = (n) => String(n).padStart(2, '0');
          clk.textContent = `${f(Math.floor(s / 3600))}:${f(Math.floor((s % 3600) / 60))}:${f(s % 60)}`;
        }, { linear: true });
        a.note('n2', 360, 396, '파일은 그대로 있지만, 열쇠 없이는 열 수 없어요', { color: 'red' });
        await a.wait(700);
      },
    },
    {
      t: '이중 협박 — 잠그기 전에 먼저 빼내요',
      easy: '요즘 랜섬웨어는 파일을 잠그기 전에 중요한 자료를 몰래 빼내요. 그래서 백업으로 파일을 되살려도 "돈을 안 내면 고객 정보를 인터넷에 공개하겠다"고 또 협박해요. 파일 복구만으로는 끝나지 않는 거죠.',
      deep: '공격자는 암호화 전에 압축·클라우드 동기화 도구 등으로 대량의 자료를 외부로 빼내고, 공개 예고용 유출 사이트에 피해 기관을 올려 압박합니다. 고객·임직원 개인정보가 포함되면 개인정보 유출 신고 의무와 법적 책임, 신뢰 손실이 따르며, 몸값을 내도 자료가 실제로 지워진다는 보장은 없습니다. 그래서 백업 외에도 외부로 나가는 대량 전송 탐지, 데이터 최소 보관·암호화 저장이 함께 필요합니다.',
      async run(a) {
        wipe(a);
        a.zone('cz', 28, 60, 300, 250, { label: '회사', color: 'blue' });
        a.zone('az', 404, 60, 288, 250, { label: '공격자 쪽', color: 'red' });
        a.node('fs', 178, 150, { label: '파일 서버', shape: 'db', color: 'teal', w: 130, h: 76 });
        a.node('leak', 548, 150, { label: '유출 사이트', icon: '📢', color: 'red', w: 150, h: 70 });
        a.text(366, 42, '① 먼저 몰래 빼내기', { size: 12.5, weight: 800, color: 'amber' });
        await a.wait(200);
        a.caption('잠그기 전에, 중요한 자료부터 복사해 가요');
        for (const [s, dy] of [['고객 명단', -16], ['계약서', 0], ['인사 자료', 16]]) {
          await a.send([248, 150 + dy], [468, 150 + dy], s, { color: 'amber', dur: 700 });
        }
        a.badge('leak', '자료 확보', 'red');
        await a.wait(200);
        a.text(178, 216, '② 그다음 암호화', { size: 12.5, weight: 800, color: 'red' });
        a.setNode('fs', { color: 'red', sub: '🔒 잠김' });
        await a.flash('fs');
        await a.wait(200);
        a.note('n3a', 548, 242, '“돈을 안 내면\n자료를 공개한다”', { color: 'red' });
        a.badge('leak', 'D-7 공개 예고', 'red');
        await a.wait(400);
        a.note('n3', 360, 370, '백업으로 파일을 되살려도, 빼낸 자료로 하는 협박은 남아요\n→ 들어오고 빼내는 단계에서 막는 게 중요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ① 백업 3-2-1 — 백업도 지켜야 백업',
      easy: '복사본을 3개 만들고, 2가지 다른 저장 매체에 두고, 그중 1개는 네트워크에서 떨어진 곳이나 지울 수 없는 저장소에 두세요. 늘 연결된 백업은 원본과 같이 잠겨 버려서 소용이 없어요.',
      deep: '3-2-1은 운영 데이터를 포함한 복사본 3개, 서로 다른 매체 2종, 그중 1개는 다른 장소에 두는 원칙이고, 랜섬웨어 대비로는 1개를 오프라인(에어갭)이나 변경 불가(객체 잠금·WORM)로 두고 복구 검증 오류 0을 더한 3-2-1-1-0이 자주 권장됩니다. 백업 시스템은 별도 계정·다단계 인증으로 운영 도메인과 분리해야 관리자 계정이 털려도 지울 수 없습니다. 복구 목표 시간(RTO)과 데이터 손실 허용 범위(RPO)를 정하고 실제 복구 훈련으로 확인합니다.',
      async run(a) {
        wipe(a);
        a.zone('bz', 28, 46, 664, 110, { label: '✕ 나쁜 예: 백업이 늘 연결돼 있으면', color: 'red' });
        a.node('s0', 220, 108, { label: '서버', shape: 'db', color: 'teal', w: 110, h: 72 });
        a.node('b0', 500, 108, { label: '백업 디스크', shape: 'db', color: 'teal', w: 124, h: 72 });
        a.edge('s0', 'b0', { arrow: false, label: '항상 연결' });
        await a.wait(200);
        await a.send([60, 108], [158, 108], '암호화', { color: 'red', dur: 500 });
        a.setNode('s0', { color: 'red', sub: '🔒' });
        await a.send([282, 108], [432, 108], '암호화', { color: 'red', dur: 700 });
        a.setNode('b0', { color: 'red', sub: '🔒' });
        a.badge('b0', '같이 잠김', 'red');
        await a.wait(300);
        a.zone('gz', 28, 172, 664, 214, { label: '✓ 3-2-1: 복사본 3개 · 매체 2종 · 1개는 밖에(오프라인 · 변경 불가)', color: 'green' });
        a.node('c1', 124, 268, { label: '① 원본', sub: '서버 디스크', shape: 'db', color: 'teal', w: 132, h: 76 });
        a.node('c2', 314, 268, { label: '② 복사본', sub: 'NAS(다른 매체)', shape: 'db', color: 'teal', w: 132, h: 76 });
        a.node('c3', 590, 268, { label: '③ 복사본', sub: '밖 · 변경 불가', shape: 'db', color: 'green', w: 132, h: 76 });
        a.raw('line', { x1: 452, y1: 216, x2: 452, y2: 336, class: 'edge dashed ec-green', style: 'stroke-width:3' }, 'edge');
        a.text(452, 352, '분리(에어갭)', { size: 11.5, weight: 800, color: 'green' });
        await a.wait(200);
        a.caption('공격이 연결된 곳까지는 퍼지지만…');
        const p = chip(a, '암호화', 60, 220, 'red', { w: 64 });
        await a.move(p, [124, 222], 400);
        a.setNode('c1', { color: 'red', sub: '🔒 잠김' });
        await a.move(p, [314, 222], 600);
        a.setNode('c2', { color: 'red', sub: '🔒 잠김' });
        await a.move(p, [414, 222], 500);
        a.text(452, 202, '✕ 닿지 않음', { size: 12.5, weight: 800, color: 'red' });
        await a.fadeOut(p, 300);
        a.caption('떨어져 있던 복사본으로 되살려요');
        await a.send([524, 290], [190, 290], '복구', { color: 'green', dur: 900 });
        a.setNode('c1', { color: 'green', sub: '복구됨 ✓' });
        await a.flash('c1');
        a.text(360, 408, '오프라인이거나 변경 불가라서, 관리자 권한을 뺏겨도 못 지워요', { size: 12, weight: 700, cls: 'muted' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ② 여러 겹으로 — 패치, 권한, 인증, 분리, 탐지',
      easy: '문 하나만 잠그지 말고 여러 겹으로 막아요. 프로그램을 늘 최신으로 업데이트하고, 비밀번호에 휴대폰 인증을 더하고, 직원마다 꼭 필요한 권한만 주고, 네트워크를 칸칸이 나누고, 이상한 움직임을 잡는 탐지 도구를 써요. 한 겹이 뚫려도 다음 겹이 막아 줍니다.',
      deep: '입구 단계에서는 인터넷 노출 장비의 패치 우선 적용, 원격 접속(VPN·RDP)에 피싱 저항형 MFA, 메일 첨부 필터링과 매크로 차단이 핵심입니다. 확산 단계에서는 최소 권한과 관리자 계정 분리, 네트워크 세분화로 측면 이동을 어렵게 하고, 실행 단계에서는 EDR이 대량 파일 변경·섀도 복사본 삭제 같은 행동을 탐지해 격리합니다. 어느 한 통제도 완벽하지 않다는 전제의 심층 방어이며, 로그를 모아 이상 징후를 실제로 보는 사람이 있어야 효과가 납니다.',
      async run(a) {
        wipe(a);
        a.text(360, 34, '공격의 세 단계마다 막는 겹을 둬요', { size: 13.5, weight: 800 });
        const COL = [
          ['s1', 170, '들어오기', ['패치 · 업데이트', '다단계 인증(MFA)', '메일 첨부 걸러내기']],
          ['s2', 400, '퍼지기', ['최소 권한', '네트워크 나누기', '관리자 계정 분리']],
          ['s3', 612, '잠그기', ['EDR 탐지 · 격리', '이상 행동 경보']],
        ];
        for (const [id, x, l] of COL) a.node(id, x, 100, { label: l, color: 'gray', w: 126, h: 52 });
        a.edge('s1', 's2', {}); a.edge('s2', 's3', {});
        for (const [, x, , sh] of COL) {
          for (let i = 0; i < sh.length; i++) {
            const c = chip(a, '🛡 ' + sh[i], x, 168 + i * 42, 'green', { w: 176, h: 32, hidden: true });
            await appear(a, c.g, 180);
          }
          await a.wait(150);
        }
        a.caption('공격 1: 첫 번째 겹에서 막힘');
        const p1 = chip(a, '공격', 36, 100, 'red', { w: 46 });
        await a.move(p1, [80, 100], 600);
        a.text(170, 60, '✕ 패치로 막힘', { size: 12, weight: 800, color: 'green' });
        await a.fadeOut(p1, 300);
        a.caption('공격 2: 새 구멍으로 들어와도 다음 겹에서 막힘');
        const p2 = chip(a, '새 구멍', 36, 100, 'red', { w: 62 });
        await a.move(p2, [[80, 62], [250, 62], [300, 100]], 1200);
        a.text(400, 60, '✕ 권한이 없어 못 퍼짐', { size: 12, weight: 800, color: 'green' });
        await a.fadeOut(p2, 300);
        a.note('n5', 360, 336, '한 겹이 뚫려도 다음 겹이 막아요 — 심층 방어', { color: 'green' });
        a.text(360, 392, '가장 흔한 입구(피싱 · 패치 안 된 구멍 · 약한 원격 접속)부터 닫으세요', { size: 12, weight: 700, cls: 'muted' });
        await a.wait(800);
      },
    },
    {
      t: '당했을 때 — 분리하고, 신고하고, 백업으로',
      easy: '감염이 의심되면 먼저 그 PC의 랜선과 와이파이를 끊어 더 퍼지지 않게 해요. 그리고 혼자 해결하려 하지 말고 KISA(118)나 경찰에 신고해 도움을 받으세요. 돈을 내도 파일이 돌아온다는 보장이 없어서 권장되지 않고, 깨끗한 백업으로 되살리는 게 정답이에요.',
      deep: '대응 순서는 격리(네트워크 분리, 계정 비활성화) → 범위 파악과 증거 보존(가능하면 전원보다 네트워크를 먼저 끊어 메모리 증거 유지) → 신고와 전문 대응 지원 → 침투 경로·뒷문 제거 → 검증된 백업으로 깨끗한 환경에 복구 순입니다. 몸값을 내도 복호화 도구가 불완전하거나 자료 삭제가 지켜지지 않을 수 있고, 다시 표적이 되기 쉬우며 범죄 자금이 되므로 정부·보안 기관은 지불을 권장하지 않습니다. 이 모든 과정은 평소 사고 대응 계획과 복구 훈련이 있어야 몇 시간 안에 움직일 수 있습니다.',
      async run(a) {
        wipe(a);
        a.text(360, 30, '당했다면 — 침착하게, 이 순서로', { size: 13.5, weight: 800 });
        a.node('pc', 120, 100, { label: '감염 PC', icon: '💻', color: 'red', w: 120, h: 64 });
        a.node('net', 360, 100, { label: '회사 망', icon: '🌐', color: 'blue', w: 120, h: 64 });
        a.node('rn', 596, 100, { label: '몸값 요구', icon: '💰', color: 'amber', w: 140, h: 64 });
        a.edge('pc', 'net', { both: true, id: 'cable', label: '연결' });
        await a.wait(300);
        a.caption('먼저 끊어서 더 퍼지지 않게');
        const cut = a.text(240, 100, '✂', { size: 22, weight: 800, color: 'red', hidden: true });
        await appear(a, cut, 200);
        await a.fade('cable', 0.15, 400);
        a.badge('pc', '격리', 'green');
        a.hl('pc', true, 'green');
        a.text(596, 150, '지불해도 복구 보장 없음', { size: 12, weight: 800, color: 'red' });
        await a.wait(300);
        const DO = [
          ['①', '네트워크에서 분리 — 랜선 · 와이파이 끊어 퍼짐 막기'],
          ['②', '신고 · 도움 요청 — KISA(118), 경찰 사이버수사'],
          ['③', '몸값은 권장 안 함 — 복구 보장이 없고, 다시 노려져요'],
          ['④', '들어온 길 막고, 깨끗한 백업으로 복구'],
          ['⑤', '평소에 복구 연습 — 되살려 봐야 진짜 백업'],
        ];
        for (let i = 0; i < DO.length; i++) await item(a, 70, 192 + i * 38, DO[i][0], DO[i][1], 'amber', { msize: 14 });
        a.text(360, 404, '※ 허락받지 않은 시스템에 공격 기법을 시험하는 것은 불법이에요', { size: 11.5, weight: 700, cls: 'muted' });
        await a.wait(800);
      },
    },
  ],
};

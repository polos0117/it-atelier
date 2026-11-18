// DDoS: DoS(줄이 꽉 참) → 봇넷이 한꺼번에 → 공격 종류 3가지 + 증폭 → 막는 법(CDN·애니캐스트 / 정화·레이트 리밋·봇 판별
// / 자동 확장·캐시·큐·대응 계획) → 내 기기가 봇넷이 되지 않게 + 체크리스트
// 모든 움직임은 고정 순서(난수 없음). 규모·배수 같은 수치는 어림으로만 말한다.

function wipe(a) { a.clear('zone', 'edge', 'node', 'pkt', 'top'); }
const title = (a, s) => a.text(360, 26, s, { size: 15, weight: 800 });
function box(a, x, y, w, h, color) {
  return a.raw('rect', { x, y, width: w, height: h, rx: 12, style: `fill: color-mix(in srgb, var(--${color}) 8%, var(--panel2)); stroke: color-mix(in srgb, var(--${color}) 55%, transparent); stroke-width: 1.5` }, 'zone');
}
const dot = (a, x, y, color, o = {}) => a.packet(o.label || '', { at: [x, y], color, w: o.w || 18, h: o.h || 18, size: 11, hidden: o.hidden });
function chip(a, label, x, y, color, o = {}) {
  return a.packet(label, { at: [x, y], color, round: 8, h: o.h || 26, w: o.w, size: o.size || 12, hidden: o.hidden });
}
const appear = (a, els, dur = 250) => a.par(...[].concat(els).map((e) => a.tween(dur, (k) => (e.style.opacity = k))));
function rim(n, tx, ty) {
  const dx = tx - n.x, dy = ty - n.y;
  const s = Math.min((n.w / 2 + 4) / Math.abs(dx || 1e-9), (n.h / 2 + 4) / Math.abs(dy || 1e-9));
  return [n.x + dx * s, n.y + dy * s];
}
async function hop(a, from, to, label, color, o = {}) {
  const A = a.get(from), B = a.get(to);
  const p = chip(a, label, ...rim(A, B.x, B.y), color, { w: o.w });
  await a.move(p, rim(B, A.x, A.y), o.dur || 800);
  if (o.keep) return p;
  await a.fadeOut(p, 180);
  return p;
}
function item(a, x, y, s) {
  const c = a.text(x, y, '✓', { size: 14, weight: 800, color: 'green', anchor: 'start', hidden: true });
  const t = a.text(x + 18, y, s, { size: 12, weight: 600, anchor: 'start', hidden: true });
  return [c, t];
}

/* 봇넷 격자(2단계) */
const COLS = [230, 345, 460], ROWS = [150, 250, 350];
const LANE_UP = [100, 200, 300], LANE_DN = [200, 300, 400];
const DEV = [['PC', '💻'], ['공유기', '📶'], ['IP카메라', '📷']];

export default {
  id: 'ddos',
  level: 3,
  cat: '보안',
  title: 'DDoS — 가짜 손님이 가게를 막아 버리면',
  sub: '수많은 감염 기기가 한꺼번에 몰려와 진짜 손님이 들어오지 못하게 만드는 공격과, 그걸 버티는 방법',
  analogy: '작은 가게 앞에 누군가 아르바이트생 수천 명을 보내 줄을 서게 했다고 생각해 보세요. 아무것도 사지 않고 줄만 차지하니, 진짜 손님은 가게에 들어가지도 못합니다. DDoS 방어는 입구를 여러 곳으로 넓히고, 문 앞에서 가짜 손님을 걸러 내고, 붐빌 때를 대비해 일하는 방식을 미리 바꿔 두는 일입니다.',
  keys: [
    'DoS(서비스 거부)는 처리할 수 있는 양보다 많은 요청을 보내 진짜 사용자가 서비스를 못 쓰게 만드는 공격이다. 데이터를 훔치기보다 "멈추게" 하는 것이 목적이다.',
    'DDoS는 감염된 수많은 기기(봇넷: PC, 공유기, IP카메라 등)가 동시에 공격해서, IP 몇 개를 막는 것으로는 막을 수 없다.',
    '종류는 크게 회선을 채우는 볼륨형, 연결 자원을 바닥내는 프로토콜형(SYN 플러드 등), 무거운 요청을 반복하는 애플리케이션 계층 공격으로 나뉜다.',
    '방어는 여러 겹이다: CDN·애니캐스트로 나눠 흡수하고, 정화(스크러빙)·레이트 리밋·봇 판별로 걸러 내고, 자동 확장·캐시·큐로 버티며, 대응 계획을 미리 세운다.',
    '내 공유기·IoT 기기의 기본 비밀번호를 바꾸고 업데이트하면 봇넷의 일부가 되는 것을 막을 수 있다. 허락 없이 남의 서비스에 부하를 거는 것은 불법이다.',
  ],
  terms: [
    ['DoS', 'Denial of Service. 서비스 거부 공격. 자원을 고갈시켜 정상 사용자가 쓰지 못하게 만든다'],
    ['DDoS', 'Distributed DoS. 여러 곳(대개 봇넷)에서 동시에 퍼붓는 서비스 거부 공격'],
    ['봇넷', '악성 코드에 감염돼 공격자의 명령을 받는 기기들의 무리. 주인은 감염 사실을 모르는 경우가 많다'],
    ['SYN 플러드', 'TCP 연결을 시작만 하고(SYN) 끝내지 않아 서버의 "반쯤 열린 연결" 자리를 채우는 공격'],
    ['증폭 공격', '보낸 사람 주소를 피해자로 위조해 작은 질문을 보내고, 공개 서버가 큰 답을 피해자에게 보내게 하는 공격'],
    ['애니캐스트', '같은 IP 주소를 여러 지역의 서버가 함께 알려, 요청이 가장 가까운 곳으로 가게 하는 방식'],
    ['스크러빙', '트래픽을 정화 센터로 돌려 공격 패킷을 걸러 내고 정상 트래픽만 원래 서버로 보내는 것'],
    ['레이트 리밋', '한 주소·사용자가 일정 시간에 보낼 수 있는 요청 수를 제한하는 장치'],
  ],
  quiz: [
    { q: 'DoS와 DDoS의 가장 큰 차이는 무엇일까요?', c: ['DoS는 데이터를 훔치고, DDoS는 서버를 멈춘다', 'DDoS는 수많은 기기가 여러 곳에서 동시에 공격해서, 주소 몇 개를 막는 것으로는 막기 어렵다', 'DDoS는 HTTPS 사이트에만 통한다', 'DoS는 불법이지만 DDoS는 합법이다'], a: 1, why: '둘 다 서비스를 못 쓰게 만드는 공격입니다. DDoS는 봇넷처럼 수많은 출발지에서 오기 때문에, 한 곳에서 오는 DoS처럼 IP 하나를 막아서는 해결되지 않습니다.', step: 1 },
    { q: 'CDN·애니캐스트가 DDoS 방어에 도움이 되는 이유로 알맞은 것은?', c: ['공격자의 컴퓨터를 찾아가 꺼 버리기 때문에', '모든 요청을 암호화해서 공격 패킷이 사라지기 때문에', '원래 서버의 처리 속도가 빨라지기 때문에', '같은 주소를 여러 곳의 엣지가 나눠 받아 공격을 분산·흡수하고, 원래 서버 주소를 숨기기 때문에'], a: 3, why: '애니캐스트로 공격 트래픽이 전 세계 여러 엣지에 흩어져 각자 감당할 만한 양이 되고, 원래 서버(오리진)는 엣지 뒤에 숨어 직접 공격받기 어려워집니다.', step: 3 },
    { q: '증폭(amplification) 공격에서 공격자가 이용하는 것은?', c: ['보낸 사람 주소를 피해자로 위조한 작은 요청과, 그 요청에 훨씬 큰 답을 돌려주는 공개 서버', '피해자 서버의 관리자 비밀번호', '피해자 사이트의 HTTPS 인증서', '피해자 쪽 CDN의 캐시'], a: 0, why: 'UDP 기반 서비스(DNS·NTP 등)는 출발지 주소를 확인하지 않아, 위조된 주소(피해자)로 큰 답이 쏟아집니다. 통신사의 출발지 주소 검증(BCP 38)과 열린 리졸버 정리가 근본 대책입니다.', step: 2 },
  ],
  setup(a) {
    title(a, 'DoS — 줄이 꽉 차면 진짜 손님이 못 들어와요');
  },
  steps: [
    {
      t: 'DoS — 처리할 수 있는 양보다 많은 요청',
      easy: '쇼핑몰 서버는 1초에 처리할 수 있는 양이 정해져 있고, 기다리는 줄도 길이가 있어요. 누군가 의미 없는 요청을 계속 보내 줄을 꽉 채우면, 진짜 손님은 줄에 서지도 못하고 "접속이 안 돼요"를 겪습니다.',
      deep: '서비스 거부(DoS)는 CPU·메모리·연결 수·대역폭 같은 유한한 자원을 고갈시켜 가용성을 깨뜨리는 공격입니다. 데이터 유출 없이도 매출 손실·장애 대응 비용이 생기고, 다른 공격의 연막으로 쓰이기도 합니다. 출발지가 하나라면 방화벽·레이트 리밋으로 그 주소를 막으면 되지만, 문제는 출발지가 많아질 때입니다.',
      async run(a) {
        wipe(a);
        title(a, 'DoS — 줄이 꽉 차면 진짜 손님이 못 들어와요');
        a.node('c1', 90, 100, { label: '손님 A', icon: '🙂', color: 'blue', w: 100, h: 56 });
        a.node('atk', 90, 200, { label: '공격자', icon: '🕵️', color: 'red', w: 100, h: 56, hidden: true });
        a.node('c2', 90, 300, { label: '손님 B', icon: '🙂', color: 'blue', w: 100, h: 56 });
        a.node('srv', 585, 200, { label: '쇼핑몰 서버', sub: '1초에 4건 처리', icon: '🏪', color: 'green', w: 150, h: 76 });
        a.raw('rect', { x: 300, y: 184, width: 182, height: 32, rx: 8, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5' }, 'zone');
        a.text(391, 166, '기다리는 줄 (6자리)', { size: 11.5, cls: 'muted', weight: 700 });
        a.edge('c1', [298, 194]);
        a.edge('c2', [298, 206]);
        a.edge('atk', [298, 200], { id: 'e-atk', color: 'red', hidden: true });
        a.edge([484, 200], 'srv');
        const SX = (i) => 466 - i * 30; // 줄 앞(서버 쪽)부터 채운다
        a.caption('평소: 손님이 줄을 서고 차례대로 처리돼요');
        for (const c of ['c1', 'c2']) {
          const n = a.get(c);
          const p = dot(a, ...rim(n, 298, 200), 'blue');
          await a.move(p, [[298, 200], [466, 200], [508, 200]], 900);
          await a.fadeOut(p, 150);
          a.badge('srv', '처리 ✓', 'green');
        }
        await a.wait(250);
        a.badge('srv', null);
        a.caption('공격자가 의미 없는 요청을 쉬지 않고 보내면…');
        await a.par(a.show('atk', 300), a.show('e-atk', 300));
        const fl = [];
        for (let i = 0; i < 6; i++) {
          fl.push(a.wait(i * 160).then(async () => {
            const p = dot(a, 144, 200, 'red');
            await a.move(p, [[298, 200], [SX(i), 200]], 700);
          }));
        }
        for (let i = 0; i < 3; i++) {
          fl.push(a.wait(1000 + i * 160).then(async () => {
            const p = dot(a, 144, 200, 'red');
            await a.move(p, [282, 200], 500);
            await a.fadeOut(p, 150);
          }));
        }
        await a.par(...fl);
        a.hl('srv', true, 'red');
        a.badge('srv', '꽉 참', 'red');
        a.caption('진짜 손님 B는 줄에 서지도 못해요');
        const b = dot(a, ...rim(a.get('c2'), 298, 200), 'blue');
        await a.move(b, [282, 204], 600);
        b.set(null, 'gray');
        await a.fadeOut(b, 250);
        a.badge('c2', '접속 안 됨', 'red');
        a.note('n1', 400, 290, '진짜 손님이 줄을 못 서요', { color: 'red' });
        a.note('n2', 400, 370, '공격자가 한 명이면? 그 주소만 막으면 끝 — 문제는 수천 명일 때', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: 'DDoS — 감염된 수많은 기기가 한꺼번에',
      easy: '이번엔 공격자 혼자가 아니에요. 평범한 집의 PC, 공유기, IP카메라가 몰래 감염돼 공격자의 명령을 기다립니다(봇넷). 신호가 떨어지면 모두 동시에 요청을 보내서, 주소 몇 개를 막아서는 소용이 없어요.',
      deep: '봇넷은 약한 기본 비밀번호나 패치하지 않은 취약점으로 감염된 기기들이 명령 서버(C2)의 지시를 받는 구조입니다. 2016년 Mirai처럼 기본 비밀번호의 IoT 기기를 대량으로 엮은 사례가 유명합니다. 출발지가 가정용 회선 등 수많은 정상처럼 보이는 IP로 흩어져 있어 IP 차단만으로는 막기 어렵고, 기록적인 공격은 초당 테라비트(Tbps) 규모까지 보고됩니다.',
      async run(a) {
        wipe(a);
        title(a, 'DDoS — 감염된 기기 무리(봇넷)가 한꺼번에');
        a.node('boss', 80, 250, { label: '공격자', sub: '명령 서버', icon: '🕵️', color: 'red', w: 110, h: 66 });
        a.node('srv', 630, 250, { label: '쇼핑몰 서버', icon: '🏪', color: 'green', w: 130, h: 76 });
        const bots = [];
        ROWS.forEach((y, r) => COLS.forEach((x, c) => {
          const [lab, ic] = DEV[(r + c) % 3];
          bots.push({ id: `b${r}${c}`, x, y, r });
          a.node(`b${r}${c}`, x, y, { label: lab, icon: ic, color: 'blue', w: 96, h: 52, size: 13 });
        }));
        a.caption('평범한 집 기기들이 몰래 감염돼 명령을 기다려요');
        await a.wait(400);
        await a.par(...bots.map((b, i) => a.wait(i * 70).then(async () => {
          const p = dot(a, 137, 250, 'amber', { w: 14, h: 14 });
          await a.move(p, [[160, 250], [160, LANE_UP[b.r]], [b.x, LANE_UP[b.r]], [b.x, b.y - 30]], 900);
          await a.fadeOut(p, 100);
          a.setNode(b.id, { color: 'red' });
        })));
        a.note('n-cmd', 80, 340, '"지금 공격!"', { color: 'red' });
        a.caption('신호 하나에 모두 동시에 요청을 보냅니다');
        const shots = [];
        for (let w = 0; w < 2; w++) {
          bots.forEach((b, i) => shots.push(a.wait(w * 420 + (i % 3) * 60).then(async () => {
            const p = dot(a, b.x, b.y + 30, 'red', { w: 14, h: 14 });
            await a.move(p, [[b.x, LANE_DN[b.r]], [520, LANE_DN[b.r]], [563, 230 + b.r * 20]], 1000);
            await a.fadeOut(p, 100);
          })));
        }
        await a.par(...shots);
        a.hl('srv', true, 'red');
        a.badge('srv', '마비', 'red');
        await a.flash('srv');
        a.note('n-many', 630, 360, '출발지가 너무 많아\nIP 몇 개 막아선\n소용없어요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '공격의 종류 — 길 막기 · 자리 채우기 · 무거운 요청',
      easy: 'DDoS는 막히는 곳에 따라 세 가지로 나눠요. ① 들어오는 길(회선) 자체를 꽉 채우기 ② 연결 자리를 반쯤 열어 둔 채로 다 차지하기 ③ 검색처럼 서버가 힘들게 일해야 하는 요청을 반복하기. 또 보낸 사람 주소를 피해자로 속여, 작은 질문에 큰 답이 피해자에게 쏟아지게 하는 "증폭"도 있어요.',
      deep: '볼륨형(L3/4)은 UDP 홍수·증폭 반사로 회선 대역폭(bps)을 채우고, 프로토콜형은 SYN 플러드처럼 TCP 연결 상태 테이블·방화벽 세션을 고갈시킵니다(SYN 쿠키로 완화). 애플리케이션 계층(L7)은 정상처럼 보이는 HTTP 요청을 초당 요청 수(rps)로 퍼부어 DB·CPU를 소모해 가장 구별하기 어렵습니다. 증폭 공격은 출발지 IP를 위조할 수 있는 UDP 서비스(열린 DNS 리졸버, NTP, memcached 등)에서 응답이 요청보다 수십~수백 배 이상 커지는 점을 악용하며, 통신사의 출발지 주소 검증(BCP 38)이 근본 대책입니다.',
      async run(a) {
        wipe(a);
        title(a, 'DDoS의 세 가지 종류와 증폭');
        a.zone('z1', 16, 46, 224, 244, { label: '① 볼륨형 — 길 막기', color: 'red' });
        a.zone('z2', 248, 46, 224, 244, { label: '② 프로토콜형 — 자리 채우기', color: 'amber' });
        a.zone('z3', 480, 46, 224, 244, { label: '③ 앱 계층 — 무거운 요청', color: 'violet' });
        a.zone('z4', 16, 300, 688, 124, { label: '증폭 — 보낸 사람 주소를 피해자로 속여, 작은 질문 → 큰 답', color: 'pink' });
        // ① 회선
        a.raw('rect', { x: 36, y: 120, width: 184, height: 36, rx: 18, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5' }, 'zone');
        const pipe = a.raw('rect', { x: 36, y: 120, width: 0, height: 36, rx: 18, style: 'fill: color-mix(in srgb, var(--red) 55%, transparent)' }, 'edge');
        a.text(128, 100, '들어오는 회선(대역폭)', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(128, 196, '회선이 꽉 차서', { size: 12, weight: 600 });
        a.text(128, 216, '진짜 손님이 못 지나감', { size: 12, weight: 600 });
        a.text(128, 256, '예: UDP 홍수', { size: 11.5, cls: 'muted' });
        // ② 연결 표
        const slots = [];
        for (let i = 0; i < 5; i++) {
          a.raw('rect', { x: 300, y: 84 + i * 28, width: 120, height: 24, rx: 6, style: 'fill: var(--panel2); stroke: var(--line2); stroke-width: 1' }, 'zone');
          slots.push(a.text(360, 96 + i * 28, '', { size: 11.5, weight: 700, color: 'amber' }));
        }
        a.text(360, 244, '연결 자리가 바닥남', { size: 12, weight: 600 });
        a.text(360, 266, '예: SYN 플러드', { size: 11.5, cls: 'muted' });
        // ③ 무거운 요청
        a.node('db', 620, 120, { label: '서버·DB', icon: '🗄️', color: 'violet', w: 104, h: 56 });
        a.text(526, 184, 'CPU', { size: 11.5, cls: 'muted', weight: 700, anchor: 'start' });
        a.raw('rect', { x: 560, y: 178, width: 124, height: 12, rx: 6, style: 'fill: var(--panel2); stroke: var(--line2)' }, 'zone');
        const cpu = a.raw('rect', { x: 560, y: 178, width: 0, height: 12, rx: 6, style: 'fill: var(--violet)' }, 'edge');
        a.text(592, 222, '요청 수는 적어도', { size: 12, weight: 600 });
        a.text(592, 242, '한 건 한 건이 무거움', { size: 12, weight: 600 });
        a.text(592, 266, '예: 검색·로그인 반복', { size: 11.5, cls: 'muted' });
        a.caption('세 곳이 동시에 막혀 가요');
        const work = [];
        work.push(a.tween(1600, (k) => pipe.setAttribute('width', 184 * k)));
        for (let i = 0; i < 4; i++) work.push(a.wait(i * 260).then(async () => { const p = dot(a, 30, 138, 'red', { w: 14, h: 14 }); await a.move(p, [214, 138], 700); await a.fadeOut(p, 100); }));
        slots.forEach((t, i) => work.push(a.wait(i * 300).then(() => { t.textContent = 'SYN… 대기 중'; })));
        for (let i = 0; i < 3; i++) work.push(a.wait(i * 420).then(async () => { const p = chip(a, '검색', 524, 120, 'violet'); await a.move(p, rim(a.get('db'), 0, 120), 380); await a.fadeOut(p, 100); }));
        work.push(a.tween(1500, (k) => cpu.setAttribute('width', 124 * k)));
        await a.par(...work);
        a.text(684, 204, '100%', { size: 11.5, weight: 800, color: 'red', anchor: 'end' });
        await a.wait(300);
        // 증폭
        a.caption('증폭: 피해자 주소로 위조한 작은 질문 → 큰 답이 피해자에게');
        a.node('bot', 90, 372, { label: '봇', icon: '🤖', color: 'red', w: 84, h: 52 });
        a.node('open', 360, 372, { label: '열린 서버', sub: 'DNS·NTP 등', icon: '🗃️', color: 'gray', w: 132, h: 62 });
        a.node('vic', 630, 372, { label: '피해자', icon: '🏪', color: 'green', w: 110, h: 52 });
        a.text(214, 342, '작은 질문', { size: 11.5, cls: 'muted', weight: 700 });
        a.text(495, 342, '훨씬 큰 답', { size: 11.5, cls: 'muted', weight: 700 });
        await hop(a, 'bot', 'open', '보낸이=피해자', 'amber', { dur: 700 });
        await a.flash('open');
        await hop(a, 'open', 'vic', '■■■■ 큰 답 ■■■■', 'red', { dur: 800 });
        a.hl('vic', true, 'red');
        a.badge('vic', '폭주', 'red');
        await a.wait(700);
      },
    },
    {
      t: '막는 법 ① — CDN · 애니캐스트로 나눠 받기',
      easy: '입구가 하나면 금방 막히니, 전 세계 여러 곳에 "앞문"(엣지)을 두고 같은 주소로 받습니다. 공격이 여러 곳으로 흩어지니 각 앞문은 감당할 만한 양만 받고, 진짜 손님 요청만 안쪽 서버로 보내요. 안쪽 서버 주소는 숨겨 둡니다.',
      deep: '애니캐스트는 같은 IP 대역을 여러 PoP에서 BGP로 알려, 각 출발지의 트래픽이 라우팅상 가까운 PoP로 가게 합니다. 수십~수백 곳에 분산된 대형 CDN·DDoS 방어망의 총용량이 공격 규모보다 커서 볼륨형 공격을 흡수할 수 있습니다. 오리진 IP가 노출되면 우회 공격을 받으므로, 오리진 방화벽은 CDN 대역에서 온 트래픽만 허용하고 과거 DNS 기록 등으로 주소가 새지 않게 합니다.',
      async run(a) {
        wipe(a);
        title(a, '막는 법 ① — 여러 앞문(엣지)이 나눠서 받기');
        a.node('bots', 90, 150, { label: '봇넷', sub: '공격 트래픽', icon: '🤖', color: 'red', w: 120, h: 66 });
        a.node('users', 90, 320, { label: '진짜 손님', icon: '🙂', color: 'blue', w: 120, h: 60 });
        const EY = [80, 175, 270, 365];
        EY.forEach((y, i) => {
          a.node('e' + i, 340, y, { label: `엣지 ${i + 1}`, sub: '가까운 곳', icon: '🛰️', color: 'teal', w: 124, h: 60 });
        });
        a.node('org', 610, 222, { label: '원래 서버', icon: '🏪', color: 'green', w: 130, h: 70 });
        a.text(610, 276, '주소는 숨김 🙈', { size: 11.5, cls: 'muted', weight: 700 });
        EY.forEach((y, i) => a.edge('e' + i, 'org', { dashed: true }));
        a.caption('같은 주소를 여러 엣지가 함께 받아요(애니캐스트)');
        const cnt = [0, 0, 0, 0];
        const bn = a.get('bots');
        const jobs = [];
        for (let i = 0; i < 16; i++) {
          const k = i % 4;
          jobs.push(a.wait(i * 110).then(async () => {
            const e = a.get('e' + k);
            const p = dot(a, ...rim(bn, e.x, e.y), 'red', { w: 14, h: 14 });
            await a.move(p, rim(e, bn.x, bn.y), 800);
            await a.fadeOut(p, 100);
            cnt[k]++;
            a.badge('e' + k, `막음 ${cnt[k]}`, 'red');
          }));
        }
        const un = a.get('users');
        [3, 2].forEach((k, j) => jobs.push(a.wait(600 + j * 500).then(async () => {
          const e = a.get('e' + k), o = a.get('org');
          const p = dot(a, ...rim(un, e.x, e.y), 'blue');
          await a.move(p, rim(e, un.x, un.y), 700);
          await a.move(p, rim(e, o.x, o.y), 0);
          await a.move(p, rim(o, e.x, e.y), 700);
          await a.fadeOut(p, 120);
        })));
        await a.par(...jobs);
        a.badge('org', '정상 손님만', 'green');
        a.note('n-any', 600, 372, '공격이 흩어져서\n엣지마다 감당할 만한 양', { color: 'teal' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ② — 정화(스크러빙) · 레이트 리밋 · 봇 판별',
      easy: '공격이 섞인 트래픽을 먼저 "정화 센터"로 돌려서 걸러 냅니다. 이상한 패턴은 버리고, 한 주소가 너무 많이 보내면 속도를 제한하고, 사람인지 의심스러우면 확인을 거쳐요. 통과한 정상 손님만 서버로 갑니다.',
      deep: '스크러빙 센터는 BGP 경로 변경이나 DNS로 트래픽을 끌어와 시그니처·이상 탐지(비정상 패킷, 증폭 포트, 급증한 출발지)로 걸러 내고 정상 트래픽을 터널(GRE 등)로 오리진에 돌려줍니다. L7에서는 WAF 규칙, IP·세션별 레이트 리밋(429), 요청 지문·행동 기반 봇 판별과 챌린지를 함께 씁니다. 지나치게 엄격하면 정상 사용자도 막히므로(오탐) 평소 트래픽 기준선이 중요합니다.',
      async run(a) {
        wipe(a);
        title(a, '막는 법 ② — 문 앞에서 걸러 내기');
        a.node('mix', 80, 220, { label: '섞인 트래픽', icon: '🌊', color: 'amber', w: 124, h: 66 });
        a.node('scrub', 340, 220, { label: '정화 센터', sub: '스크러빙', icon: '🧹', color: 'teal', w: 150, h: 84 });
        a.node('srv', 620, 220, { label: '서버', icon: '🏪', color: 'green', w: 120, h: 66 });
        a.node('drop', 340, 362, { label: '버림', icon: '🗑️', color: 'gray', w: 100, h: 52 });
        a.edge('mix', 'scrub');
        a.edge('scrub', 'srv');
        a.edge('scrub', 'drop', { dashed: true });
        const RX = [200, 340, 480];
        const rules = [['패턴 검사', 'amber'], ['레이트 리밋', 'violet'], ['봇 판별', 'pink']].map(([s, c], i) => {
          a.raw('line', { x1: RX[i], y1: 106, x2: 340 + (RX[i] - 340) * 0.35, y2: 176, class: 'edge dashed' }, 'edge');
          return chip(a, s, RX[i], 92, c, { w: 104, h: 28 });
        });
        a.text(620, 300, '통과 0 · 차단 0', { id: 'cnt', size: 13, weight: 800, mono: true });
        const SEQ = 'RRBRRRBRRBRB';
        let pass = 0, drop = 0, red = 0;
        const sc = a.get('scrub');
        a.caption('나쁜 트래픽은 버리고, 정상만 통과');
        await a.par(...[...SEQ].map((ch, i) => a.wait(i * 300).then(async () => {
          const bad = ch === 'R';
          const p = dot(a, 146, 220, bad ? 'red' : 'blue');
          await a.move(p, [262, 220], 600);
          if (bad) {
            const r = rules[red++ % 3];
            a.flash(r).catch(() => {});
            await a.move(p, [340, 266], 0);
            await a.move(p, [340, 332], 350);
            await a.fadeOut(p, 100);
            drop++;
          } else {
            await a.move(p, [sc.x + sc.w / 2 + 4, 220], 0);
            await a.move(p, [556, 220], 450);
            await a.fadeOut(p, 100);
            pass++;
          }
          a.setText('cnt', `통과 ${pass} · 차단 ${drop}`);
        })));
        a.badge('srv', '정상만 도착', 'green');
        a.note('n-fp', 580, 372, '너무 엄격하면 진짜 손님도\n막혀요(오탐) — 평소 기준선 필요', { color: 'amber' });
        await a.wait(800);
      },
    },
    {
      t: '막는 법 ③ — 버티는 구조와 대응 계획',
      easy: '걸러 낸 뒤에도 남는 몰림은 구조로 버팁니다. 자주 찾는 페이지는 캐시가 바로 답하고, 몰리면 서버를 자동으로 늘리고, 보고서 만들기처럼 무거운 일은 큐에 넣어 차례로 처리해요. 그리고 공격이 왔을 때 누구에게 연락하고 무엇을 할지 미리 정해 둡니다.',
      deep: '정적 콘텐츠와 캐시 가능한 API는 CDN 캐시로 오리진 부하를 줄이고, 오토스케일링으로 용량을 늘립니다(비용 폭증에 대비해 상한·예산 경보 설정). 무거운 작업은 메시지 큐로 비동기 처리하고 202 Accepted로 응답하며, 타임아웃·연결 수 제한·서킷 브레이커로 한 구성 요소의 고장이 전체로 번지지 않게 합니다. 통신사·클라우드의 DDoS 방어 서비스(상시 또는 요청 시 활성화) 계약, 연락처, 런북과 훈련을 미리 준비해 둡니다.',
      async run(a) {
        wipe(a);
        title(a, '막는 법 ③ — 버티는 구조 + 미리 세운 계획');
        a.node('u', 70, 210, { label: '트래픽', sub: '정화 후', icon: '🙂', color: 'blue', w: 104, h: 66 });
        a.node('cache', 250, 96, { label: '캐시 · CDN', sub: '같은 답은 바로', icon: '📦', color: 'teal', w: 140, h: 66 });
        const SY = [130, 215, 300];
        SY.forEach((y, i) => a.node('s' + i, 430, y, { label: `서버 ${i + 1}`, icon: '🖥️', color: 'green', w: 110, h: 52, hidden: i > 0 }));
        a.node('q', 615, 215, { label: '작업 큐', sub: '차례로 처리', icon: '📥', color: 'violet', w: 130, h: 66 });
        a.edge('u', 'cache');
        SY.forEach((y, i) => a.edge('u', 's' + i, { id: 'eu' + i, hidden: i > 0 }));
        SY.forEach((y, i) => a.edge('s' + i, 'q', { id: 'eq' + i, dashed: true, hidden: i > 0 }));
        a.caption('자주 찾는 페이지는 캐시가 바로 답해요');
        await hop(a, 'u', 'cache', 'GET /', 'blue', { dur: 450 });
        a.badge('cache', 'HIT', 'green');
        await hop(a, 'cache', 'u', '바로 응답', 'green', { dur: 450 });
        a.caption('몰리면 서버를 자동으로 늘려요');
        await a.par(...[0, 1, 2].map((i) => a.wait(i * 180).then(() => hop(a, 'u', 's0', '', 'blue', { dur: 500, w: 18 }))));
        a.badge('s0', '부하 90%', 'red');
        await a.flash('s0');
        await a.par(...[1, 2].map((i) => a.par(a.show('s' + i, 400), a.show('eu' + i, 400), a.show('eq' + i, 400))));
        a.badge('s1', '추가', 'teal');
        a.badge('s2', '추가', 'teal');
        a.badge('s0', '부하 30%', 'green');
        await a.wait(200);
        a.caption('무거운 일은 큐에 넣고 바로 "접수됨"');
        await hop(a, 'u', 's1', '보고서 만들기', 'amber', { dur: 525 });
        await hop(a, 's1', 'q', '작업', 'violet', { dur: 375 });
        a.badge('q', '대기 1', 'violet');
        await hop(a, 's1', 'u', '202 접수됨', 'green', { dur: 525 });
        a.note('n-plan', 360, 384, '대응 계획: 통신사·클라우드 DDoS 방어 연락처 · 평소 트래픽 기준선\n긴급 차단 규칙 · 누가 무엇을 할지 미리 정하고 훈련', { color: 'amber' });
        await a.wait(600);
      },
    },
    {
      t: '내 기기가 봇넷이 되지 않게 + 체크리스트',
      easy: '봇넷의 상당수는 기본 비밀번호 그대로인 공유기·카메라예요. 비밀번호를 바꾸고 자동 업데이트를 켜면 내 기기가 공격에 동원되는 걸 막을 수 있어요. 그리고 허락 없이 남의 서비스에 부하를 걸어 보는 것은 "시험"이라도 불법입니다.',
      deep: 'IoT 감염은 대부분 인터넷에 노출된 관리 포트(Telnet·SSH·웹 관리)에 기본·약한 비밀번호를 자동 대입하거나 알려진 취약점을 노립니다. 기본 비밀번호 변경, 펌웨어 업데이트, 원격 관리·UPnP 비활성화, 지원 종료(EoL) 기기 교체가 기본입니다. 서비스 운영자는 DDoS 방어 서비스를 평시에 연결해 두고, 오리진 주소 비공개, 레이트 리밋·캐시·큐, 트래픽 기준선과 경보, 대응 런북을 준비합니다. 부하 테스트는 자기 시스템에서, 클라우드 사업자 정책에 맞게 허가를 받고 합니다.',
      async run(a) {
        wipe(a);
        title(a, '내 기기 지키기 + 체크리스트');
        a.node('rt', 118, 110, { label: '공유기', sub: 'admin / admin', icon: '📶', color: 'red', w: 140, h: 70 });
        a.node('cam', 118, 240, { label: 'IP카메라', sub: '기본 비번', icon: '📷', color: 'red', w: 140, h: 70 });
        a.caption('기본 비밀번호 그대로면 자동 스캐너에 바로 뚫려요');
        const probe = async (id, y0, ok) => {
          const n = a.get(id);
          const p = chip(a, ok ? '기본 비번?' : '기본 비번?', n.x, y0, 'red', { w: 96 });
          await a.move(p, [n.x, n.y + n.h / 2 + 16], 500);
          if (ok) { a.badge(id, '감염', 'red'); p.set(null, 'red'); } else { p.set('✗ 실패', 'gray'); }
          await a.wait(250);
          await a.fadeOut(p, 200);
        };
        await a.par(probe('rt', 176, true), probe('cam', 330, true));
        a.caption('비밀번호를 바꾸고 업데이트하면');
        a.setNode('rt', { sub: '긴 새 비밀번호', color: 'green' });
        a.setNode('cam', { sub: '새 비번 · 최신', color: 'green' });
        a.badge('rt', '업데이트 ✓', 'green');
        a.badge('cam', '업데이트 ✓', 'green');
        await a.par(a.flash('rt'), a.flash('cam'));
        await a.par(probe('rt', 176, false), probe('cam', 330, false));
        box(a, 236, 50, 228, 304, 'teal');
        box(a, 476, 50, 228, 304, 'green');
        a.text(350, 74, '🏠 내 기기', { size: 13.5, weight: 800, color: 'teal' });
        a.text(590, 74, '🛠️ 서비스 운영', { size: 13.5, weight: 800, color: 'green' });
        const L = ['기본 비밀번호 바꾸기', '펌웨어 자동 업데이트', '안 쓰는 원격 관리 끄기', 'UPnP·포트 개방 점검', '지원 끝난 기기 교체'];
        const R = ['DDoS 방어 미리 연결', '원래 서버 주소 숨기기', '레이트 리밋·캐시·큐', '평소 트래픽 기준·경보', '대응 계획·연락처·훈련'];
        const li = L.map((s, i) => item(a, 252, 116 + i * 50, s));
        const ri = R.map((s, i) => item(a, 492, 116 + i * 50, s));
        for (let i = 0; i < 5; i++) {
          await appear(a, [...li[i], ...ri[i]], 220);
          await a.wait(150);
        }
        a.note('n-law', 360, 394, '⚖️ 허락 없이 남의 서비스에 부하를 거는 것은 "시험"이라도 불법이에요', { color: 'amber' });
        await a.wait(800);
      },
    },
  ],
};

// DMZ: 공개 서버를 사내망에 두면 위험 → 로비(DMZ)·사무실(내부망)·금고실(DB)로 나누기 → 경계마다 규칙
// → 뚫렸을 때 비교(평평한 망 vs DMZ) → 방화벽 1대(3다리) vs 2대(이중) → 클라우드·망분리 → 더 잘게(제로 트러스트)
// 주소·포트는 설명용 예시다. 단계마다 무대를 새로 그린다(0단계 무대는 setup이 그린다).
const clearAll = (a) => a.clear('zone', 'edge', 'node', 'pkt', 'top');

/** 노드 테두리에서 (tx,ty) 쪽 점 — 패킷이 글자를 덮지 않게 */
function rim(a, id, tx, ty) {
  const n = a.get(id), dx = tx - n.x, dy = ty - n.y;
  const s = Math.min((n.w / 2 + 3) / Math.abs(dx || 1e-9), (n.h / 2 + 3) / Math.abs(dy || 1e-9));
  return [n.x + dx * s, n.y + dy * s];
}
/** from에서 출발해 방화벽 테두리에서 막힌다 */
async function blocked(a, from, fw, label, o = {}) {
  const f = a.get(from);
  const p = await a.send(from, rim(a, fw, f.x, f.y), label, { color: o.color || 'red', dur: o.dur || 800, keep: true });
  p.set('✗ 차단', 'red');
  await a.flash(fw);
  await a.fadeOut(p, 400);
}

/** 1~2단계 무대: 인터넷 | 외부 방화벽 | DMZ(로비) | 내부 방화벽 | 내부망(사무실) ⊃ 금고실 */
function building(a, hidden) {
  const h = { hidden };
  a.zone('z-net', 16, 40, 136, 300, { label: '인터넷', color: 'gray', ...h });
  a.zone('z-bld', 172, 16, 532, 336, { label: '회사 건물', color: 'gray', ...h });
  a.zone('z-dmz', 214, 44, 168, 296, { label: 'DMZ · 로비', color: 'teal', ...h });
  a.zone('z-in', 454, 44, 238, 296, { label: '내부망 · 사무실 층', color: 'blue', ...h });
  a.zone('z-vault', 468, 150, 210, 176, { label: '금고실', color: 'violet', ...h });
  a.node('guest', 84, 120, { label: '손님', icon: '🙂', color: 'blue', w: 100, h: 50, ...h });
  a.node('att', 84, 260, { label: '공격자', icon: '🦹', color: 'red', w: 100, h: 50, ...h });
  a.node('fw1', 172, 190, { label: '외부', sub: '방화벽', icon: '🧱', color: 'amber', w: 52, h: 130, size: 14, ...h });
  a.node('web', 298, 110, { label: '웹 서버', icon: '🌐', color: 'green', w: 120, h: 50, size: 14, ...h });
  a.node('mail', 298, 190, { label: '메일 서버', icon: '✉️', color: 'green', w: 120, h: 50, size: 14, ...h });
  a.node('dns', 298, 270, { label: 'DNS 서버', icon: '📖', color: 'green', w: 120, h: 50, size: 14, ...h });
  a.node('fw2', 420, 190, { label: '내부', sub: '방화벽', icon: '🧱', color: 'amber', w: 52, h: 130, size: 14, ...h });
  a.node('pc', 520, 100, { label: '직원 PC', icon: '💻', color: 'blue', w: 96, h: 46, size: 14, ...h });
  a.node('adm', 630, 100, { label: '관리 PC', icon: '🛠️', color: 'blue', w: 96, h: 46, size: 14, ...h });
  a.node('db', 573, 250, { label: '고객 DB', shape: 'db', color: 'violet', w: 130, h: 70, size: 14, ...h });
  for (const [x, y, id] of [['guest', 'fw1', 'e1'], ['att', 'fw1', 'e2'], ['fw1', 'web', 'e3'], ['fw1', 'mail', 'e4'], ['fw1', 'dns', 'e5'], ['web', 'fw2', 'e6'], ['fw2', 'db', 'e7'], ['fw2', 'pc', 'e8']]) {
    a.edge(x, y, { id, arrow: false, ...h });
  }
}

/** 3단계 무대 한쪽: 평평한 망 / DMZ */
function panel(a, ox, dmz) {
  const P = dmz ? 'r' : 'l';
  a.zone('z' + P, ox, 40, 336, 300, { label: dmz ? 'DMZ로 나눈 망' : '평평한 망', color: dmz ? 'teal' : 'gray' });
  if (dmz) {
    a.zone('z' + P + 'd', ox + 12, 66, 312, 78, { label: 'DMZ', color: 'teal' });
    a.zone('z' + P + 'i', ox + 12, 196, 312, 134, { label: '내부망', color: 'blue' });
    a.node(P + 'fw', ox + 168, 168, { label: '🧱 내부 방화벽', color: 'amber', w: 250, h: 30, size: 13, r: 8 });
  } else {
    a.zone('z' + P + 'i', ox + 12, 66, 312, 264, { label: '사내망 · 한 방', color: 'gray' });
  }
  a.node(P + 'web', ox + 168, 108, { label: '웹 서버', icon: '🌐', color: 'green', w: 116, h: 50, size: 14 });
  a.node(P + 'pc', ox + 64, 272, { label: '직원 PC', icon: '💻', color: 'blue', w: 92, h: 50, size: 14 });
  a.node(P + 'fs', ox + 168, 272, { label: '파일 서버', icon: '🗂️', color: 'teal', w: 96, h: 50, size: 14 });
  a.node(P + 'db', ox + 272, 272, { label: 'DB', shape: 'db', color: 'violet', w: 88, h: 56, size: 14 });
}

/** 6단계 체크리스트 */
function checklist(a, lines) {
  const g = a.raw('g', {}, 'top');
  a.raw('rect', { x: 16, y: 250, width: 688, height: 174, rx: 12, style: 'fill: color-mix(in srgb, var(--green) 6%, transparent); stroke: color-mix(in srgb, var(--green) 55%, transparent); stroke-width: 1.5' }, g);
  a.text(34, 272, '정리 체크리스트', { par: g, size: 13, weight: 800, anchor: 'start', color: 'green' });
  return lines.map((s, i) => {
    const t = a.text(34, 300 + i * 25, '✓  ' + s, { par: g, size: 13, weight: 600, anchor: 'start' });
    t.style.opacity = 0;
    return t;
  });
}

export default {
  id: 'dmz',
  level: 3,
  cat: '네트워크',
  title: 'DMZ — 손님은 로비까지만',
  sub: '인터넷에 공개하는 서버를 따로 떼어 두어, 뚫려도 피해가 회사 안쪽으로 번지지 않게 하는 망 구성',
  analogy: '회사 건물과 같습니다. 1층 로비(DMZ)는 손님 누구나 들어와 안내 데스크(웹 서버)를 이용하지만, 사무실 층(내부망)은 직원 출입증이 있어야 하고, 금고실(DB)은 정해진 창구로만 드나듭니다. 로비에 수상한 사람이 들어와도 출입 게이트에서 멈추게 하는 것이 DMZ의 목적이에요.',
  keys: [
    '인터넷에 공개하는 서버(웹·메일·DNS)는 공격받기 가장 쉬우므로, 직원 PC·DB와 같은 망에 두지 않는다.',
    'DMZ는 바깥과 안쪽 사이의 별도 구간이다: 인터넷 — 외부 방화벽 — DMZ — 내부 방화벽 — 내부망.',
    '규칙은 기본 차단, 필요한 것만 허용: 인터넷→DMZ는 443 등 공개 서비스만, DMZ→내부는 웹→DB 3306처럼 아주 좁게, 인터넷→내부는 차단.',
    '목적은 "절대 안 뚫림"이 아니라 피해 범위 줄이기다. 허용된 길로 닿는 데이터는 여전히 위험하므로 앱 보안·DB 최소 권한이 함께 필요하다.',
    '클라우드에서는 퍼블릭/프라이빗 서브넷과 보안 그룹이 같은 역할을 하고, 요즘은 마이크로 세그멘테이션·제로 트러스트로 더 잘게 나눈다.',
  ],
  terms: [
    ['DMZ', '인터넷과 내부망 사이에 둔 완충 구역. 외부에 공개하는 서버만 두는 "로비". 군사 용어 비무장지대에서 온 말'],
    ['방화벽', '정해 둔 규칙(출발지·목적지·포트)에 따라 통신을 허용하거나 막는 장비·소프트웨어'],
    ['내부망', '직원 PC·사내 시스템·DB가 있는 안쪽 네트워크. 바깥에서 직접 들어올 수 없어야 한다'],
    ['측면 이동', '기기 하나를 장악한 공격자가 같은 망의 다른 기기로 옮겨 가는 것(lateral movement)'],
    ['3다리 구성', '방화벽 한 대에 연결 단자(인터페이스) 3개를 달아 인터넷·DMZ·내부망을 나누는 방식'],
    ['배스천 호스트', '서버 관리 접속을 한곳으로 모으는 관문 서버. 관리자는 여기를 거쳐서만 서버에 들어간다'],
    ['보안 그룹', '클라우드에서 서버마다 붙이는 허용 규칙 목록. 서버 하나하나에 붙는 작은 방화벽'],
    ['망분리', '업무망과 인터넷망을 물리적(PC 2대) 또는 논리적(가상 PC)으로 나누는 한국의 보안 정책'],
  ],
  quiz: [
    { q: 'DMZ(로비)에 두기에 가장 알맞은 서버는 무엇일까요?', c: ['직원 급여가 담긴 인사 DB', '누구나 접속하는 회사 홈페이지 웹 서버', '사내 문서를 모아 둔 파일 서버', '경리팀 직원의 PC'], a: 1, why: 'DMZ에는 인터넷에서 누구나 접속해야 하는 서버(웹·메일·외부용 DNS)만 둡니다. DB·파일 서버·직원 PC는 바깥에서 직접 닿지 않는 내부망에 둬요.', step: 1 },
    { q: 'DMZ의 웹 서버가 해킹당했을 때, 피해가 사내 PC·DB로 번지지 않게 막는 핵심은 무엇일까요?', c: ['외부 방화벽에서 443번 포트를 열어 두는 것', '웹 서버의 CPU와 메모리를 늘리는 것', '내부 방화벽이 DMZ→내부를 꼭 필요한 길(웹→DB 3306 등)만 허용하는 것', 'DNS 서버도 DMZ에 함께 두는 것'], a: 2, why: '웹 서버가 뚫린 뒤 공격자는 DMZ에서 안쪽으로 옮겨 가려고 합니다. 이때 내부 방화벽이 정해진 출발지·목적지·포트만 허용하면 나머지 이동 시도는 모두 막혀요.', step: 2 },
    { q: 'DMZ를 두고 내부 방화벽도 "웹 서버→DB 3306만" 허용했습니다. 그래도 남는 위험으로 옳은 것은?', c: ['DMZ가 있으면 웹 앱 취약점은 신경 쓰지 않아도 된다', '3306 규칙 때문에 인터넷에서 DB로 바로 접속할 수 있게 된다', '내부 방화벽이 있으니 웹 앱의 DB 계정은 관리자 권한이어도 괜찮다', '웹 서버를 장악한 공격자는 허용된 3306 길로, 웹 앱의 DB 계정이 읽을 수 있는 데이터를 빼낼 수 있다'], a: 3, why: '허용된 길은 공격자도 쓸 수 있습니다. 그래서 웹 앱의 DB 계정을 필요한 표·권한만 갖게(최소 권한) 하고, SQL 인젝션 방어·중요 데이터 암호화·이상 쿼리 감시를 함께 둡니다.', step: 3 },
  ],
  setup(a) {
    // 0단계 무대: 평평한 사내망
    a.zone('z-net', 16, 40, 136, 384, { label: '인터넷', color: 'gray' });
    a.node('guest', 84, 140, { label: '손님', icon: '🙂', color: 'blue', w: 100, h: 50 });
    a.node('att', 84, 320, { label: '공격자', icon: '🦹', color: 'red', w: 100, h: 50, hidden: true });
    a.node('fw', 206, 230, { label: '방화벽', sub: '443 허용', icon: '🧱', color: 'amber', w: 72, h: 120, size: 13 });
    a.zone('z-flat', 256, 40, 448, 384, { label: '회사 사내망 — 모두 한 방에', color: 'blue' });
    a.node('web', 360, 230, { label: '웹 서버', icon: '🌐', color: 'green', w: 112, h: 54 });
    a.node('pc1', 530, 110, { label: '직원 PC 1', icon: '💻', color: 'blue', w: 104, h: 50, size: 14 });
    a.node('pc2', 644, 110, { label: '직원 PC 2', icon: '💻', color: 'blue', w: 104, h: 50, size: 14 });
    a.node('db', 590, 250, { label: '고객 DB', shape: 'db', color: 'violet', w: 124, h: 66 });
    a.node('fs', 590, 366, { label: '파일 서버', icon: '🗂️', color: 'teal', w: 124, h: 50, size: 14 });
    a.edge('guest', 'fw', { arrow: false });
    a.edge('att', 'fw', { id: 'e-att', arrow: false, hidden: true });
    a.edge('fw', 'web', { arrow: false });
  },
  steps: [
    {
      t: '웹 서버를 사내망 안에 두면',
      easy: '회사 홈페이지(웹 서버)는 인터넷의 누구나 들어와야 해요. 그래서 방화벽(출입을 거르는 문지기)도 웹 접속용 문인 443번 포트(문 번호)는 열어 둡니다. 그런데 웹 서버를 직원 PC·고객 DB와 같은 방에 두면, 웹 서버가 해킹당하는 순간 공격자는 이미 회사 안 금고 바로 옆에 서 있게 돼요.',
      deep: '외부 공개 서비스는 공격 표면이 가장 넓은 자산입니다. 웹 앱 취약점(원격 코드 실행, 파일 업로드 등)이나 패치 안 된 미들웨어로 웹 서버가 장악되면, 평평한(flat) 망에서는 같은 대역의 PC·DB·파일 서버로 곧바로 측면 이동(lateral movement)할 수 있습니다. 경계 방화벽은 443을 허용했으므로 웹 앱을 노린 공격 자체는 막지 못합니다.',
      async run(a) {
        a.caption('홈페이지는 누구나 들어와야 해요');
        await a.send('guest', 'web', '접속 443', { color: 'blue', dur: 1000, via: ['fw'] });
        await a.flash('web');
        await a.send('web', 'guest', '홈페이지', { color: 'green', dur: 900, via: ['fw'] });
        a.caption('같은 443번 문으로 공격자도 들어와요');
        await a.par(a.show('att'), a.show('e-att'));
        await a.send('att', 'web', '공격', { color: 'red', dur: 1000, via: ['fw'] });
        a.setNode('web', { color: 'red' });
        a.hl('web', true, 'red');
        a.badge('web', '장악됨', 'red');
        await a.flash('web');
        a.caption('웹 서버를 뚫으면 바로 옆이 PC·DB');
        for (const t of ['pc1', 'pc2', 'db', 'fs']) a.edge('web', t, { id: 'r-' + t, color: 'red', dashed: true, hidden: true });
        await a.par(...['pc1', 'pc2', 'db', 'fs'].map((t) => a.show('r-' + t)));
        a.note('n0', 360, 330, '같은 방이라\n금고(DB)가 바로 옆!', { color: 'red' });
        await a.wait(900);
      },
    },
    {
      t: '망을 나눈다 — 로비·사무실·금고실',
      easy: '그래서 회사 건물처럼 공간을 나눕니다. 누구나 들어오는 로비가 DMZ(비무장지대)로, 웹·메일·DNS 서버처럼 바깥에 보여야 하는 서버만 둬요. 직원 PC가 있는 사무실 층(내부망)과 DB가 있는 금고실은 그 안쪽에 두고, 구역 경계마다 방화벽을 세웁니다.',
      deep: 'DMZ(screened subnet, perimeter network)는 외부 공개 서버만 모아 둔 별도 네트워크 구간입니다. 전형적인 구성은 인터넷 — 외부 방화벽 — DMZ — 내부 방화벽 — 내부망이고, 내부망도 사용자 대역·서버 대역·DB 대역으로 다시 나눕니다. 구간은 보통 VLAN과 서브넷(예: DMZ 172.16.10.0/24, 내부 10.10.0.0/16)으로 나누고, 구간 사이 통신은 반드시 방화벽을 거치게 합니다.',
      async run(a) {
        clearAll(a);
        building(a, true);
        a.caption('바깥: 인터넷');
        await a.par(...['z-net', 'guest', 'att'].map((x) => a.show(x)));
        await a.show('z-bld');
        a.caption('로비(DMZ): 손님도 들어오는 곳');
        await a.par(a.show('fw1'), a.show('e1'), a.show('e2'), a.show('z-dmz'));
        await a.par(...['web', 'mail', 'dns', 'e3', 'e4', 'e5'].map((x) => a.show(x)));
        a.note('n1', 360, 386, '로비 = DMZ — 바깥에 보여야 하는 서버만 (웹·메일·DNS)', { color: 'teal' });
        await a.flash('fw1');
        await a.wait(500);
        a.remove('n1');
        a.caption('사무실 층(내부망): 출입증이 있어야');
        await a.par(a.show('fw2'), a.show('e6'), a.show('z-in'));
        await a.par(a.show('pc'), a.show('adm'), a.show('e8'));
        a.note('n2', 360, 386, '사무실 층 = 내부망 — 직원 PC, 관리 PC', { color: 'blue' });
        await a.flash('fw2');
        await a.wait(500);
        a.remove('n2');
        a.caption('금고실: 고객 DB');
        await a.par(a.show('z-vault'), a.show('db'), a.show('e7'));
        a.note('n3', 360, 386, '인터넷 — [외부 방화벽] — DMZ — [내부 방화벽] — 내부망 ⊃ 금고실', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '경계마다 규칙 — 필요한 길만',
      easy: '문마다 "누가 어디로 갈 수 있는지" 규칙이 있어요. 바깥 손님은 로비의 웹 서버로만(443번 문) 갈 수 있고, 바깥에서 사무실·금고로 바로 가는 길은 전부 막힙니다. 로비의 웹 서버도 금고(DB)에는 정해진 창구(3306번) 하나로만 가고 직원 PC로는 못 가요. 서버 관리는 안쪽 관리 PC에서만 합니다.',
      deep: '기본 차단(default deny) 위에 필요한 흐름만 허용합니다. 인터넷→DMZ는 TCP 443(80은 443으로 리다이렉트), 메일 25, DNS 53 정도이고, DMZ→내부는 "웹 서버 → DB 3306(MySQL)"처럼 출발지·목적지·포트를 고정한 규칙만 두거나 웹→앱 서버만 열고 DB는 앱 서버만 접근하게 합니다. 관리(SSH 22·RDP 3389)는 관리망이나 배스천 호스트에서만 허용하고, 상태 기반(stateful) 방화벽이라 허용된 연결의 응답은 따로 열 필요가 없습니다. DMZ 서버가 인터넷으로 먼저 나가는 연결(egress)도 막아 두면 침해 후 외부 통신을 줄일 수 있습니다.',
      async run(a) {
        clearAll(a);
        building(a, false);
        a.caption('인터넷 → DMZ: 443(웹)처럼 필요한 것만');
        await a.send('guest', 'web', 'HTTPS 443', { color: 'blue', dur: 1100, via: ['fw1'] });
        a.badge('web', '✓', 'green');
        await a.flash('web');
        a.caption('인터넷 → 내부: 전부 차단');
        await blocked(a, 'att', 'fw1', 'DB 3306');
        a.caption('DMZ → 내부: 웹 서버 → DB 3306만');
        await a.send('web', 'db', '3306', { color: 'teal', dur: 1100, via: ['fw2'] });
        a.badge('db', '✓', 'green');
        await a.flash('db');
        a.caption('웹 서버 → 직원 PC는 차단');
        await blocked(a, 'web', 'fw2', 'SMB 445');
        a.caption('관리 접속은 안쪽 관리 PC에서만');
        await a.send('adm', 'web', 'SSH 22', { color: 'violet', dur: 1200, via: ['fw2'] });
        a.badge('web', '관리 ✓', 'violet');
        a.note('n-rule', 360, 390, '인터넷→DMZ: 443 등 필요한 것만 · 인터넷→내부: 전부 차단\nDMZ→내부: 웹→DB 3306만 · 내부→DMZ 관리: 관리 PC에서만', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '웹 서버가 뚫렸을 때 — 평평한 망 vs DMZ',
      easy: '같은 상황을 나란히 비교해 봐요. 평평한 망에서는 웹 서버를 뚫은 공격자가 바로 옆 PC·파일 서버·DB까지 차례로 장악합니다. DMZ 구성에서는 내부 방화벽이 막아서 로비에서 멈춰요. 다만 웹 서버가 원래 DB에서 읽던 데이터는 허용된 길로 여전히 꺼낼 수 있어서, 웹 프로그램 자체의 보안도 꼭 필요해요.',
      deep: '구간 분리의 목적은 침해를 0으로 만드는 것보다 피해 범위(blast radius)를 줄이는 것입니다. 내부 방화벽 로그에 DMZ발 차단 시도(SMB 445, RDP 3389, SSH 22 스캔)가 쌓이면 그 자체가 침해 신호가 됩니다. 하지만 허용된 3306 경로는 공격자도 쓸 수 있으므로 앱 DB 계정 최소 권한, SQL 인젝션 방어, 중요 컬럼 암호화, 이상 쿼리 감시를 함께 둬야 합니다.',
      async run(a) {
        clearAll(a);
        panel(a, 16, false);
        panel(a, 368, true);
        a.caption('두 망에서 똑같이 웹 서버가 뚫렸어요');
        for (const P of ['l', 'r']) { a.setNode(P + 'web', { color: 'red' }); a.hl(P + 'web', true, 'red'); a.badge(P + 'web', '장악됨', 'red'); }
        await a.par(a.flash('lweb'), a.flash('rweb'));
        a.caption('옆 기기로 옮겨 가 보려는 공격자');
        let n = 1;
        for (const [t, lab] of [['pc', 'RDP'], ['fs', 'SMB'], ['db', 'SSH']]) {
          await a.par(
            a.send('lweb', 'l' + t, lab, { color: 'red', dur: 800 }).then(() => {
              a.setNode('l' + t, { color: 'red' }); a.hl('l' + t, true, 'red'); a.badge('l' + t, '장악', 'red'); n++;
            }),
            (async () => {
              const to = a.get('r' + t);
              const p = await a.send('rweb', [to.x, 150], lab, { color: 'red', dur: 800, keep: true });
              p.set('✗', 'red');
              await a.fadeOut(p, 500);
            })(),
          );
        }
        a.note('nl', 184, 372, `장악 ${n}대 — DB까지 통째로`, { color: 'red' });
        a.note('nr', 536, 372, '장악 1대 — 로비에서 멈춤', { color: 'green' });
        await a.wait(500);
        a.caption('그래도 허용된 3306 길은 열려 있어요');
        await a.send('rweb', 'rdb', '3306', { color: 'amber', dur: 1100, via: ['rfw'] });
        a.badge('rdb', '조회 가능', 'amber');
        a.note('na', 360, 410, '단, 허용된 3306 길로 웹 앱이 읽던 데이터는 여전히 위험 → 앱 보안·DB 최소 권한도', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '방화벽 한 대(3다리) vs 두 대(이중)',
      easy: '방화벽 한 대에 문(연결 단자)을 세 개 달아 인터넷·DMZ·내부망을 모두 잇는 방법이 있어요. 싸고 간단하지만, 그 한 대가 고장 나거나 설정을 잘못하면 모든 구역이 한꺼번에 위험해집니다. 방화벽 두 대를 바깥·안쪽에 따로 두면 비용과 관리할 일은 늘지만, 한 겹이 뚫려도 다음 겹이 남아요.',
      deep: '3다리(three-legged) 구성은 인터페이스 3개(outside·DMZ·inside)와 구역(zone) 간 정책으로 구현하며 중소 규모에서 흔합니다. 이중(back-to-back) 구성은 외부·내부 방화벽을 따로 두는 심층 방어이고, 같은 취약점에 함께 뚫리지 않도록 두 장비를 서로 다른 제품으로 쓰기도 합니다(대신 운영 부담이 늘어남). 어느 쪽이든 장비 자체는 HA(액티브-스탠바이) 쌍으로 이중화하는 게 보통이고, 실무에서는 구조 못지않게 "임시로" 넓게 열어 둔 규칙(any 허용)이 문제가 되는 경우가 많습니다.',
      async run(a) {
        clearAll(a);
        a.zone('zl', 16, 40, 336, 310, { label: '방화벽 1대 · 3다리', color: 'gray' });
        a.node('lnet', 184, 92, { label: '🌐 인터넷', color: 'gray', w: 110, h: 40, size: 14 });
        a.node('lfw', 184, 180, { label: '🧱 방화벽', color: 'amber', w: 120, h: 48, size: 14 });
        a.node('ldmz', 92, 282, { label: 'DMZ', sub: '웹·메일', color: 'teal', w: 116, h: 50, size: 14 });
        a.node('lin', 276, 282, { label: '내부망', sub: 'PC·DB', color: 'blue', w: 116, h: 50, size: 14 });
        a.edge('lfw', 'lnet', { id: 'el1', arrow: false, label: '다리 1', lx: 30, ly: 0 });
        a.edge('lfw', 'ldmz', { id: 'el2', arrow: false, label: '다리 2', lx: -30, ly: -4 });
        a.edge('lfw', 'lin', { id: 'el3', arrow: false, label: '다리 3', lx: 30, ly: -4 });
        a.zone('zr', 368, 40, 336, 310, { label: '방화벽 2대 · 이중', color: 'teal' });
        const RX = 560;
        a.node('rnet', RX, 80, { label: '🌐 인터넷', color: 'gray', w: 110, h: 36, size: 14 });
        a.node('rfw1', RX, 140, { label: '🧱 외부 방화벽', color: 'amber', w: 140, h: 36, size: 14 });
        a.node('rdmz', RX, 200, { label: 'DMZ', color: 'teal', w: 140, h: 36, size: 14 });
        a.node('rfw2', RX, 260, { label: '🧱 내부 방화벽', color: 'amber', w: 140, h: 36, size: 14 });
        a.node('rin', RX, 320, { label: '내부망', color: 'blue', w: 140, h: 36, size: 14 });
        for (const [x, y] of [['rnet', 'rfw1'], ['rfw1', 'rdmz'], ['rdmz', 'rfw2'], ['rfw2', 'rin']]) a.edge(x, y, { arrow: false });
        a.caption('평소: 둘 다 인터넷 → DMZ 웹 접속을 통과시켜요');
        await a.par(
          a.send('lnet', 'ldmz', '443', { color: 'blue', dur: 1000, via: ['lfw'] }),
          a.send('rnet', 'rdmz', '443', { color: 'blue', dur: 1000, via: ['rfw1'] }),
        );
        a.caption('만약 방화벽 하나가 설정 실수로 뚫린다면?');
        a.setNode('lfw', { color: 'red' }); a.hl('lfw', true, 'red'); a.badge('lfw', '설정 실수', 'red');
        a.setNode('rfw1', { color: 'red' }); a.hl('rfw1', true, 'red'); a.badge('rfw1', '설정 실수', 'red');
        await a.par(a.flash('lfw'), a.flash('rfw1'));
        await a.par(
          a.send('lnet', 'lin', '공격', { color: 'red', dur: 1100, via: ['lfw'] }),
          (async () => {
            await a.send('rnet', 'rdmz', '공격', { color: 'red', dur: 900, via: ['rfw1'] });
            await blocked(a, 'rdmz', 'rfw2', '공격', { dur: 600 });
          })(),
        );
        for (const x of ['ldmz', 'lin']) { a.setNode(x, { color: 'red' }); a.hl(x, true, 'red'); }
        a.hl('el2', true); a.hl('el3', true);
        a.setNode('rdmz', { color: 'red' });
        a.badge('rfw2', '그대로', 'green');
        a.note('nl', 184, 392, '싸고 단순, 중소 규모에서 흔함\n한 대가 무너지면 모든 구역 노출', { color: 'red' });
        a.note('nr', 536, 392, '두 겹 방어 — 다음 겹이 남음\n비용·관리할 규칙은 늘어남', { color: 'green' });
        await a.wait(900);
      },
    },
    {
      t: '요즘 모습 — 클라우드와 망분리',
      easy: '클라우드에서도 생각은 같아요. 인터넷에서 닿는 "퍼블릭 서브넷"에는 손님을 맞는 로드밸런서만 두고, 앱 서버와 DB는 바깥에서 직접 닿지 않는 "프라이빗 서브넷"에 둡니다. 서버마다 붙이는 "보안 그룹"이 작은 방화벽 역할을 해요. 한국에는 업무용 PC와 인터넷용 PC(또는 화면)를 아예 나누는 "망분리"도 있습니다.',
      deep: '퍼블릭 서브넷은 라우팅 테이블에 인터넷 게이트웨이 경로가 있는 서브넷이고, 프라이빗 서브넷은 직접 경로가 없어 밖으로 나갈 때만 NAT 게이트웨이를 씁니다. 보안 그룹은 인스턴스 단위의 상태 기반 허용 목록(예: DB 보안 그룹은 앱 보안 그룹에서 오는 3306만 허용)이고, 서브넷 단위 네트워크 ACL을 더하기도 합니다(이름은 클라우드마다 조금씩 다름). 한국의 망분리는 공공·금융 분야를 중심으로 물리적(PC 2대)·논리적(VDI) 방식으로 도입돼 왔고, 자료는 망연계 솔루션으로 승인·검사 후 옮깁니다. 최근에는 클라우드·생성형 AI 활용을 위해 데이터 중요도에 따라 다르게 적용하는 방향으로 규제 완화·조정 논의가 이어지고 있어, 구체적인 의무는 소관 기관의 최신 기준을 확인해야 합니다.',
      async run(a) {
        clearAll(a);
        a.node('user', 60, 200, { label: '🙂 사용자', color: 'blue', w: 88, h: 46, size: 14 });
        a.zone('zv', 116, 40, 304, 300, { label: 'VPC · 클라우드 안의 사설망', color: 'gray' });
        a.zone('zpub', 128, 70, 120, 258, { label: '퍼블릭 서브넷', color: 'amber' });
        a.zone('zpri', 260, 70, 148, 258, { label: '프라이빗 서브넷', color: 'blue' });
        a.node('lb', 188, 200, { label: '로드밸런서', icon: '⚖️', color: 'amber', w: 104, h: 54, size: 13 });
        a.node('app', 334, 150, { label: '앱 서버', icon: '🖥️', color: 'green', w: 112, h: 54, size: 14 });
        a.node('cdb', 334, 262, { label: 'DB', shape: 'db', color: 'violet', w: 112, h: 60, size: 14 });
        a.edge('user', 'lb', { arrow: false });
        a.edge('lb', 'app', { arrow: false });
        a.edge('app', 'cdb', { arrow: false });
        a.zone('zk', 436, 40, 268, 300, { label: '한국의 망분리', color: 'amber' });
        a.zone('zw', 448, 70, 120, 176, { label: '업무망', color: 'blue' });
        a.zone('zi', 576, 70, 116, 176, { label: '인터넷망', color: 'gray' });
        a.node('wpc', 508, 130, { label: '💻 업무 PC', color: 'blue', w: 100, h: 44, size: 13 });
        a.node('wsys', 508, 200, { label: '사내 시스템', color: 'blue', w: 100, h: 44, size: 13 });
        a.node('ipc', 634, 130, { label: '인터넷 PC', color: 'gray', w: 100, h: 44, size: 13 });
        a.node('iweb', 634, 200, { label: '🌐 인터넷', color: 'gray', w: 100, h: 44, size: 13 });
        a.node('gw', 570, 294, { label: '자료 전송', sub: '승인·검사 후', color: 'violet', w: 140, h: 48, size: 13 });
        a.edge('wpc', 'wsys', { arrow: false });
        a.edge('ipc', 'iweb', { arrow: false });
        a.edge('gw', 'wsys', { arrow: false, dashed: true });
        a.edge('gw', 'iweb', { arrow: false, dashed: true });
        a.caption('바깥에 공개되는 건 로드밸런서뿐');
        await a.send('user', 'lb', '443', { color: 'blue', dur: 800 });
        await a.send('lb', 'app', '8080', { color: 'blue', dur: 700 });
        await a.send('app', 'cdb', '3306', { color: 'teal', dur: 700 });
        for (const x of ['lb', 'app', 'cdb']) a.badge(x, '보안 그룹', 'teal');
        a.caption('직접 들어오려 하면? 앱·DB는 공인 주소가 없어요');
        const p = await a.send('user', [252, 112], '직접', { color: 'red', dur: 800, keep: true });
        p.set('✗', 'red');
        await a.fadeOut(p, 400);
        a.note('nv', 218, 372, 'LB(리버스 프록시)만 공개, 앱·DB는 안쪽', { color: 'teal' });
        a.caption('망분리: 두 망 사이 자료는 정해진 통로로만');
        await a.send('ipc', 'gw', '파일', { color: 'amber', dur: 800, via: ['iweb'] });
        await a.flash('gw');
        await a.send('gw', 'wpc', '검사 ✓', { color: 'green', dur: 800, via: ['wsys'] });
        a.note('nk', 360, 408, '망분리: 공공·금융 중심 규제 — 최근 완화·조정 논의가 이어지는 중', { color: 'amber' });
        await a.wait(900);
      },
    },
    {
      t: '더 잘게 — 마이크로 세그멘테이션·제로 트러스트',
      easy: '요즘은 건물 안에서도 방마다 출입증을 확인하는 쪽으로 가고 있어요. 내부망을 프로그램·서버 단위로 잘게 나누는 것을 "마이크로 세그멘테이션", "안에 있다고 믿지 말고 매번 확인하자"는 생각을 "제로 트러스트"라고 해요. DMZ는 여전히 기본이지만, 그것만으로 끝이 아니라는 뜻이에요.',
      deep: '마이크로 세그멘테이션은 워크로드(서버·컨테이너) 단위 정책으로 내부의 동서(east-west) 트래픽을 제한합니다(호스트 방화벽, 쿠버네티스 NetworkPolicy, 클라우드 보안 그룹 등). 제로 트러스트(NIST SP 800-207)는 네트워크 위치를 신뢰 근거로 삼지 않고 요청마다 사용자·기기·맥락을 인증·인가합니다. 둘 다 DMZ를 대체하기보다 그 위에 겹쳐 쓰는 경우가 많고, 정책이 잘게 나뉠수록 흐름 파악과 정책 관리 자동화가 중요해집니다.',
      async run(a) {
        clearAll(a);
        a.zone('zm', 16, 40, 688, 196, { label: '내부망 — 방마다 출입증 확인', color: 'blue' });
        const CELLS = [['mpc', '직원 PC', '💻', 'blue'], ['mhr', '인사 앱', '🧾', 'green'], ['mdb', 'DB', '', 'violet'], ['mpay', '결제 앱', '💳', 'green'], ['mfs', '파일 서버', '🗂️', 'teal']];
        CELLS.forEach(([id, label, icon, color], i) => {
          const cx = 86 + i * 137.5;
          a.zone('c-' + id, cx - 62, 74, 124, 128, { label: '🔒', color });
          if (id === 'mdb') a.node(id, cx, 146, { label, shape: 'db', color, w: 96, h: 58, size: 14 });
          else a.node(id, cx, 146, { label, icon, color, w: 104, h: 50, size: 14 });
        });
        a.caption('같은 내부망이어도 요청마다 확인해요');
        await a.send('mpc', 'mhr', '요청', { color: 'blue', dur: 900 });
        a.badge('mhr', '신원·기기 ✓', 'green');
        await a.flash('mhr');
        await a.send('mhr', 'mdb', '조회', { color: 'teal', dur: 900 });
        a.badge('mdb', '허용 ✓', 'green');
        a.caption('결제 앱은 파일 서버에 갈 일이 없어요 → 차단');
        const fs = a.get('mfs');
        const p = await a.send('mpay', [fs.x - 66, fs.y], '접근', { color: 'red', dur: 800, keep: true });
        p.set('✗ 차단', 'red');
        await a.fadeOut(p, 500);
        const ts = checklist(a, [
          '인터넷에 꼭 보여야 하는 서버만 DMZ(로비)에 — 앱·DB는 안쪽',
          '경계마다 기본 차단, 필요한 포트만 허용 (인터넷→DMZ 443 등)',
          'DMZ→내부는 정해진 서버·포트만 (웹→DB 3306), 인터넷→내부는 차단',
          '관리 접속은 관리망·배스천에서만, DMZ 서버가 밖으로 나가는 것도 제한',
          '앱 보안·DB 최소 권한·로그 감시 — 나누기만으로는 끝이 아님',
        ]);
        a.caption('');
        for (const t of ts) await a.tween(320, (k) => (t.style.opacity = k));
        await a.wait(700);
      },
    },
  ],
};

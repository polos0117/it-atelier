// TCP 실험실: 손실이 있는 길로 파일 조각 20개를 계속 보내며 TCP(재전송·순서 맞춤)와 UDP(그냥 보내기)를 비교한다
const N = 20; // 파일 하나 = 조각 20개
const SX = 78, RX = 642, NY = 150;
const DY = 132, AY = 172; // 데이터 길 / ACK 길
const S_OUT = [156, DY], R_IN = [564, DY], R_OUT = [564, AY], S_IN = [156, AY]; // 점은 장치 테두리에서 멈춘다
const ROW_S = 290, ROW_R = 380;
const slotX = (i) => 56 + i * 32;
const GAP = 110; // 조각을 하나씩 내보내는 간격(ms) — 보내는 쪽 링크 속도

export default {
  id: 'tcp',
  title: 'TCP 실험실',
  intro: '파일 하나(조각 20개)를 손실이 있는 네트워크로 계속 보내요. 초록 점의 숫자는 ACK, 곧 "다음엔 이 번호를 보내 주세요"라는 뜻이에요. 손실률을 올리고 TCP와 UDP를 바꿔 가며 받는 쪽 칸이 어떻게 채워지는지, 윈도를 키우면 얼마나 빨라지는지 보세요.',
  controls: [
    { type: 'range', key: 'loss', label: '손실률', min: 0, max: 50, step: 5, unit: '%' },
    { type: 'radio', key: 'proto', label: '프로토콜', options: [['tcp', 'TCP'], ['udp', 'UDP']] },
    { type: 'range', key: 'delay', label: '지연(편도)', min: 200, max: 1500, step: 100, unit: 'ms' },
    { type: 'range', key: 'win', label: '윈도 크기', min: 1, max: 8, step: 1, unit: '개' },
    { type: 'button', label: '파일 다시 보내기', run: (s) => s.restart() },
  ],
  init: () => ({ loss: 10, proto: 'tcp', delay: 600, win: 4,
    sentSince: 0, lostSince: 0, retxSince: 0, got: 0, ok: 0, holey: 0, tw: {},
    tcpLossy: false, udpHole: false, tcpClean: false }),
  onChange(key, s) {
    s.sentSince = 0; s.lostSince = 0; s.retxSince = 0;
    if (key === 'proto' || key === 'win') s.restart(); // 윈도를 바꾸면 새 파일로 — 완성 시간을 공정하게 비교
    s.paint();
  },
  setup(a, s) {
    let seed = 20261008;
    const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296; // 늘 같은 순서로 나오는 의사 난수
    let f = null, fileNo = 0, evtTok = 0;

    a.text(360, 22, '', { id: 'tt', size: 15, weight: 800 });
    a.zone('net', 168, 100, 384, 100, { color: 'gray' });
    a.text(360, 112, '', { id: 'netl', size: 11.5, weight: 700, cls: 'muted' });
    a.node('snd', SX, NY, { label: '보내는 쪽', sub: '', icon: '📤', color: 'blue', w: 120, h: 70 });
    a.node('rcv', RX, NY, { label: '받는 쪽', sub: '', icon: '📥', color: 'green', w: 120, h: 70 });
    a.edge([142, DY], [578, DY], { id: 'ed' });
    a.edge([578, AY], [142, AY], { id: 'ea' });
    a.text(180, 112, '데이터 →', { size: 11, anchor: 'start', weight: 700, cls: 'muted' });
    a.text(540, 188, '← ACK (다음 번호)', { id: 'al', size: 11, anchor: 'end', weight: 700, cls: 'muted' });
    a.text(360, 222, '', { id: 'evt', size: 13, weight: 800 });

    a.text(40, 258, '보내는 쪽 — 보낼 조각', { size: 12, anchor: 'start', weight: 700, cls: 'muted' });
    a.text(40, 348, '받는 쪽 — 받은 조각', { size: 12, anchor: 'start', weight: 700, cls: 'muted' });
    for (let i = 0; i < N; i++) {
      a.node('s' + i, slotX(i), ROW_S, { label: String(i + 1), color: 'gray', w: 28, h: 28, size: 12, r: 6 });
      a.node('r' + i, slotX(i), ROW_R, { label: String(i + 1), color: 'gray', w: 28, h: 28, size: 12, r: 6 });
    }
    const brk = a.raw('rect', { y: ROW_S - 21, height: 42, rx: 8, class: 'edge ec-violet' });
    a.text(0, ROW_S + 32, '', { id: 'wl', size: 11.5, anchor: 'start', weight: 700, color: 'violet' });
    [['● 순서대로 앱에 전달', 'green', 150], ['● 먼저 와서 기다리는 중', 'amber', 360], ['● 구멍(끝내 못 받음)', 'red', 570]]
      .forEach(([t, c, x]) => a.text(x, 418, t, { size: 11.5, weight: 700, color: c }));

    const cs = {}, cr = {};
    const setS = (i, c) => { if (cs[i] !== c) { cs[i] = c; a.setNode('s' + i, { color: c }); } };
    const setR = (i, c) => { if (cr[i] !== c) { cr[i] = c; a.setNode('r' + i, { color: c }); } };
    const evt = async (t, color) => {
      const tok = ++evtTok, e = a.get('evt');
      a.setText('evt', t);
      e.setAttribute('class', 'tx tc-' + color);
      e.style.opacity = 1;
      await a.wait(1600);
      if (tok === evtTok) await a.tween(300, (k) => { if (tok === evtTok) e.style.opacity = 1 - k; });
    };
    const rto = () => 2 * s.delay + 500;

    s.paint = () => {
      const tcp = s.proto === 'tcp';
      a.setText('tt', `파일 ${fileNo} · ${tcp ? 'TCP' : 'UDP'}로 보내는 중`);
      a.setText('netl', `네트워크 · 손실 ${s.loss}%`);
      a.setNode('snd', { sub: tcp ? `윈도 ${s.win} · 기다림 ${f ? Math.min(f.base, N - 1) + 1 : 1}번` : '그냥 던지기' });
      a.setNode('rcv', { sub: tcp ? (f && f.expected >= N ? '전부 받음 ✓' : `다음 기다림 ${f ? f.expected + 1 : 1}번`) : '오는 대로 받기' });
      a.get('ea').path.style.opacity = tcp ? 1 : 0.15;
      a.get('al').style.opacity = tcp ? 1 : 0.3;
      const base = f ? Math.min(f.base, N - 1) : 0, w = Math.max(1, Math.min(s.win, N - base));
      brk.setAttribute('x', slotX(base) - 18);
      brk.setAttribute('width', w * 32 + 4);
      brk.style.opacity = tcp && f && !f.done ? 1 : 0;
      const wl = a.get('wl');
      wl.setAttribute('x', Math.min(slotX(base) - 16, 470));
      wl.textContent = `윈도 ${s.win}: ACK 없이 ${s.win}개까지 보내요`;
      wl.style.opacity = brk.style.opacity;
    };

    const newFile = () => {
      fileNo++;
      f = { id: fileNo, proto: s.proto, t0: a.now(), lossMin: s.loss, lossMax: s.loss, winMin: s.win, winMax: s.win,
        retx: 0, base: 0, next: 0, expected: 0, dup: 0, timer: 0, recv: [], done: false, ending: false };
      s.got = 0;
      for (let i = 0; i < N; i++) { setS(i, 'gray'); setR(i, 'gray'); }
      s.paint();
    };
    s.restart = newFile;

    const finish = async (my) => {
      my.done = true;
      const sec = (a.now() - my.t0) / 1000;
      const holes = [];
      for (let i = 0; i < N; i++) if (!my.recv[i]) holes.push(i);
      if (my.proto === 'tcp') {
        s.ok++;
        if (my.winMin === my.winMax) s.tw[my.winMin] = sec;
        if (my.lossMin >= 20) s.tcpLossy = true;
        if (my.lossMax === 0 && my.retx === 0) s.tcpClean = true;
        for (let i = 0; i < N; i++) setS(i, 'green');
        evt(`파일 완성! ${sec.toFixed(1)}초${my.winMin === my.winMax ? ` · 윈도 ${my.winMin}` : ''}${my.retx ? ` · 재전송 ${my.retx}번` : ''}`, 'green');
      } else if (holes.length) {
        s.holey++;
        if (my.lossMin >= 20) s.udpHole = true;
        holes.forEach((i) => setR(i, 'red'));
        evt(`구멍 ${holes.length}개 — UDP는 다시 보내지 않아요`, 'red');
      } else {
        s.ok++;
        evt('운 좋게 하나도 안 잃었어요', 'green');
      }
      s.paint();
      await a.wait(2200);
      if (f === my) newFile();
    };

    const sendAck = async (my, k) => {
      const p = a.packet(String(k + 1), { at: R_OUT, color: 'green', w: 26, h: 18, size: 10.5 });
      if (rnd() * 100 < s.loss) { // ACK도 잃을 수 있다(누적 ACK라 다음 ACK가 대신해 준다)
        const x = 520 - rnd() * 280;
        await a.move(p, [x, AY], s.delay * (564 - x) / 408);
        p.set('✕', 'red');
        s.lostSince++;
        await a.fadeOut(p, 350);
        return;
      }
      await a.move(p, S_IN, s.delay);
      a.remove(p);
      if (f !== my || my.done) return;
      if (k > my.base) { // 새로 확인됨 → 윈도가 앞으로
        for (let i = my.base; i < k; i++) setS(i, 'green');
        my.base = k; my.dup = 0; my.timer = a.now();
        s.paint();
      } else if (k === my.base && my.base < my.next && ++my.dup === 3) { // 같은 ACK 3번 더 → 빠른 재전송
        my.timer = a.now();
        sendSeg(my, my.base, true);
        evt(`같은 ACK ${k + 1}이 계속 와요 → ${k + 1}번 빠른 재전송`, 'amber');
      }
    };

    const onData = (my, n) => {
      if (my.proto === 'udp') {
        if (!my.recv[n]) { my.recv[n] = true; s.got++; setR(n, 'green'); }
        return;
      }
      if (!my.recv[n] && n >= my.expected) { my.recv[n] = true; s.got++; setR(n, 'amber'); }
      while (my.recv[my.expected]) { setR(my.expected, 'green'); my.expected++; }
      s.paint();
      a.spawn(() => sendAck(my, my.expected)); // 누적 ACK: 다음에 받을 번호
      if (my.expected >= N && !my.done) finish(my);
    };

    function sendSeg(my, n, re) {
      s.sentSince++;
      if (re) { s.retxSince++; my.retx++; }
      if (my.proto === 'tcp' || cs[n] === 'gray') setS(n, re ? 'amber' : 'blue');
      a.spawn(async () => {
        const p = a.packet(String(n + 1), { at: S_OUT, color: re ? 'amber' : 'blue', w: 26, h: 22, size: 11 });
        if (rnd() * 100 < s.loss) {
          const x = 200 + rnd() * 280;
          await a.move(p, [x, DY], s.delay * (x - 156) / 408);
          p.set('✕', 'red');
          s.lostSince++;
          await a.fadeOut(p, 350);
          return;
        }
        await a.move(p, R_IN, s.delay);
        a.remove(p);
        if (f === my && !my.done) onData(my, n);
      });
    }

    newFile();
    a.every(GAP, () => {
      const my = f;
      if (!my || my.done) return;
      my.lossMin = Math.min(my.lossMin, s.loss); my.lossMax = Math.max(my.lossMax, s.loss);
      my.winMin = Math.min(my.winMin, s.win); my.winMax = Math.max(my.winMax, s.win);
      if (my.proto === 'udp') {
        if (my.next < N) sendSeg(my, my.next++, false);
        else if (!my.ending) { my.ending = true; a.spawn(() => a.wait(s.delay + 500).then(() => { if (f === my) finish(my); })); }
        return;
      }
      if (my.base < my.next && a.now() - my.timer > rto()) { // 시간 초과 → 가장 오래된 조각 다시
        my.timer = a.now();
        sendSeg(my, my.base, true);
        evt(`시간 초과! ${my.base + 1}번 다시 보내기`, 'red');
        return;
      }
      if (my.next < Math.min(my.base + s.win, N)) {
        if (my.base === my.next) my.timer = a.now();
        sendSeg(my, my.next++, false);
      }
    });
  },
  stats: (s) => [
    ['전송 · 손실', `${s.sentSince} · ${s.lostSince}`, s.lostSince ? 'red' : ''],
    ['재전송', s.retxSince, s.retxSince ? 'amber' : ''],
    ['받은 조각', `${s.got}/${N}`, s.got === N ? 'green' : ''],
    ['파일 완성 · 구멍', `${s.ok} · ${s.holey}`, s.holey ? 'red' : 'green'],
    ['완성 시간 윈도 1 / 8', `${s.tw[1] ? s.tw[1].toFixed(1) + '초' : '-'} / ${s.tw[8] ? s.tw[8].toFixed(1) + '초' : '-'}`, 'violet'],
  ],
  tasks: [
    { t: '손실률을 20% 이상으로 올리고, TCP로 파일 하나를 끝까지 완성하기', check: (s) => s.tcpLossy },
    { t: '같은 손실(20% 이상)에서 UDP로 바꿔 보내기 — 구멍 난 파일이 생기나요?', check: (s) => s.udpHole },
    { t: '윈도를 1로 두고 파일 하나, 8로 두고 파일 하나를 완성해 걸린 시간 비교하기', check: (s) => !!(s.tw[1] && s.tw[8]) },
    { t: '손실률 0%에서 TCP로 파일을 재전송 없이 완성하기', check: (s) => s.tcpClean },
  ],
};

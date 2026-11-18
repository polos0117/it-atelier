// 계정 탈취 실험실: 봇이 유출 목록을 로그인 서버에 계속 대입하고, 정상 사용자도 가끔 로그인한다.
// 재사용 비율과 방어(시도 제한·2단계 인증·계정 잠금·유출 비번 차단)를 바꾸며 탈취·불편이 어떻게 달라지는지 본다.
// 모든 무작위는 시드 고정 PRNG — 같은 설정이면 같은 계정이 재사용자가 된다.

function rng(seed) { // mulberry32
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

const NAMES = ['민지', '서준', '하은', '도윤', '지우', '시우', '서연', '하준', '수아', '지호', '예린', '은우',
  '채원', '유준', '다은', '건우', '소율', '현우', '지안', '우진', '나연', '태윤', '하린', '주원'];
const N = NAMES.length;
const CAND = 3; // 목록에 계정마다 들어 있는 비번 후보 수(여러 유출에서 모인 것)
const GHOST = 6; // 이 사이트엔 없는 계정(목록엔 있음)
const COLS = 6, TX = (i) => 392 + (i % COLS) * 56, TY = (i) => 108 + Math.floor(i / COLS) * 66;
// 점은 노드 가장자리에서 멈춘다
const BOT_OUT = [144, 162], SRV_IN_B = [186, 206], BOUNCE_B = [160, 186];
const USR_OUT = [144, 300], SRV_IN_U = [186, 246], BOUNCE_U = [160, 276];
const LOCK_N = 5, LOCK_MS = 30000;
const IPS = 3, IP_CAP = 3, IP_REFILL = 0.25; // 봇이 쓰는 IP 3개, IP마다 3번 + 초당 0.25번 충전

// 고정 순열: 재사용 비율을 올릴수록 같은 순서로 재사용 계정이 늘어난다
const RANK = (() => { const p = shuffle([...Array(N).keys()], rng(7)); const r = []; p.forEach((acct, k) => (r[acct] = k)); return r; })();
const RIGHT = (() => { const r = rng(11); return NAMES.map(() => Math.floor(r() * CAND)); })();
// 봇의 목록: (계정, 후보 번호) 72개 + 없는 계정 6개, 섞은 순서 고정
const LIST = (() => {
  const L = [];
  for (let i = 0; i < N; i++) for (let k = 0; k < CAND; k++) L.push({ i, k });
  for (let g = 0; g < GHOST; g++) L.push({ i: -1, k: g });
  return shuffle(L, rng(23));
})();

export default {
  id: 'credstuff',
  title: '계정 탈취 실험실',
  intro: '왼쪽 위 봇이 다른 사이트에서 유출된 아이디·비밀번호 목록을 이 사이트에 계속 대입하고, 아래 정상 사용자들도 가끔 로그인해요(가끔 한 번 오타도 내요). ↺ 표시는 유출된 비번을 여기서도 재사용하는 계정이에요. 재사용 비율과 방어를 바꿔 보세요. 설정을 바꾸면 계정 상태와 숫자를 처음부터 다시 셉니다. 실제 서비스에 이런 대입을 해 보는 것은 불법이니 여기서만 실험하세요.',
  controls: [
    { type: 'range', key: 'reuse', label: '비밀번호 재사용 비율', min: 0, max: 80, step: 10, unit: '%' },
    { type: 'toggle', key: 'rl', label: '로그인 시도 제한(IP·계정별)' },
    { type: 'toggle', key: 'mfa', label: '2단계 인증' },
    { type: 'toggle', key: 'lock', label: '계정 잠금(5회 실패)' },
    { type: 'toggle', key: 'breach', label: '유출 비밀번호 차단' },
    { type: 'range', key: 'speed', label: '봇 속도', min: 1, max: 10, step: 1, unit: '번/초' },
  ],
  init: () => ({ reuse: 30, rl: true, mfa: false, lock: false, breach: false, speed: 4,
    gen: 0, acc: [], pos: 0, round: 1, ip: [], ipK: 0, fly: 0, t0: 0, clock: 0,
    nWrong: 0, nLim: 0, taken: 0, botTry: 0, blocked: 0, mfaBlk: 0, userOk: 0, userLocked: 0, log: [] }),
  onChange(key, s) { s.reset?.(); },
  setup(a, s) {
    /* ----- 무대 ----- */
    a.node('bot', 80, 128, { label: '봇', sub: '유출 목록 대입', icon: '🤖', color: 'red', w: 128, h: 70 });
    a.text(80, 184, '', { id: 'botinfo', size: 11.5, cls: 'muted', weight: 700, layer: 'edge' });
    a.text(80, 203, '', { id: 'botres', size: 11.5, cls: 'muted', weight: 700, layer: 'edge' });
    a.node('usr', 80, 318, { label: '정상 사용자', sub: '가끔 로그인', icon: '🙂', color: 'blue', w: 128, h: 66 });
    a.text(80, 366, '가끔 오타 한 번', { size: 11.5, cls: 'muted', weight: 700, layer: 'edge' });
    a.node('srv', 262, 226, { label: '로그인 서버', sub: '', icon: '🔐', color: 'teal', w: 148, h: 76 });
    a.edge('bot', 'srv');
    a.edge('usr', 'srv');
    a.edge('srv', [356, 226], { dashed: true, arrow: false });
    const DEF = [['rl', '시도 제한'], ['mfa', '2단계 인증'], ['lock', '계정 잠금'], ['breach', '유출 비번 차단']];
    const defT = DEF.map(([, l], i) => a.text(206, 288 + i * 20, '', { size: 12, anchor: 'start', weight: 700, layer: 'edge' }));
    a.zone('zg', 360, 48, 344, 294, { label: '이 사이트의 계정 24개', color: 'gray' });
    NAMES.forEach((n, i) => a.node('a' + i, TX(i), TY(i), { label: n, sub: '', color: 'blue', w: 50, h: 50, size: 13 }));
    // 범례
    const LG = [['blue', '정상'], ['red', '탈취'], ['amber', '잠김']];
    LG.forEach(([c, l], i) => {
      a.raw('rect', { x: 372 + i * 66, y: 354, width: 12, height: 12, rx: 3, style: `fill: var(--${c})` }, 'edge');
      a.text(390 + i * 66, 360, l, { size: 11.5, anchor: 'start', weight: 700, layer: 'edge' });
    });
    a.text(574, 360, '↺ 유출 비번 재사용', { size: 11.5, anchor: 'start', weight: 700, layer: 'edge', color: 'pink' });
    const logT = [0, 1, 2].map((i) => a.text(24, 386 + i * 19, '', { size: 12, anchor: 'start', weight: 700, layer: 'edge' }));

    /* ----- 상태 ----- */
    let rB = rng(101), rU = rng(202);
    const reuseOf = (i) => RANK[i] < Math.round((s.reuse / 100) * N);
    s.reset = () => {
      s.gen++;
      s.acc = NAMES.map((_, i) => ({ reuse: reuseOf(i), changed: false, taken: false, fails: 0, lastFail: 0, lockUntil: 0 }));
      s.pos = 0; s.round = 1;
      s.ip = Array.from({ length: IPS }, () => IP_CAP); s.ipK = 0;
      s.t0 = a.now();
      s.nWrong = 0; s.nLim = 0;
      s.taken = 0; s.botTry = 0; s.blocked = 0; s.mfaBlk = 0; s.userOk = 0; s.userLocked = 0; s.log = [];
      rB = rng(101); rU = rng(202);
      NAMES.forEach((_, i) => a.hl('a' + i, false));
      s.paint();
    };
    const reuseNow = (A) => A.reuse && !A.changed;
    const locked = (A) => s.lock && A.lockUntil > a.now();
    const say = (msg, color) => { s.log.push([msg, color]); if (s.log.length > 3) s.log.shift(); paintLog(); };
    const paintLog = () => logT.forEach((t, k) => {
      const e = s.log[s.log.length - 1 - k];
      t.textContent = e ? e[0] : '';
      t.setAttribute('class', 'tx' + (e && e[1] ? ' tc-' + e[1] : ' muted'));
      t.style.opacity = k === 0 ? 1 : k === 1 ? 0.75 : 0.5;
    });
    s.paint = () => {
      const on = DEF.filter(([k]) => s[k]).length;
      a.setNode('srv', { sub: on ? `방어 ${on}개 켜짐` : '방어 없음' });
      DEF.forEach(([k, l], i) => { defT[i].textContent = (s[k] ? '● ' : '○ ') + l; defT[i].setAttribute('class', 'tx ' + (s[k] ? 'tc-green' : 'muted')); });
      a.setText('botinfo', `목록 ${s.round}바퀴째 · ${s.speed}번/초`);
      a.setText('botres', `틀린 비번 ${s.nWrong} · 시도 제한 ${s.nLim}`);
      s.acc.forEach((A, i) => {
        const lk = locked(A);
        a.setNode('a' + i, { color: A.taken ? 'red' : lk ? 'amber' : 'blue', sub: A.taken ? '탈취' : lk ? '잠김' : A.changed ? '변경' : '' });
        a.badge('a' + i, reuseNow(A) ? '↺' : '', 'pink');
      });
      paintLog();
    };
    const flashTile = (i, color) => {
      const n = a.get('a' + i);
      const tok = (n.flashTok || 0) + 1;
      n.flashTok = tok;
      a.hl('a' + i, true, color);
      a.spawn(async () => { await a.wait(420); if (n.flashTok === tok) a.hl('a' + i, false); });
    };
    const fail = (A, i, who) => {
      A.fails++; A.lastFail = a.now();
      if (s.lock && A.fails >= LOCK_N) {
        A.lockUntil = a.now() + LOCK_MS; A.fails = 0;
        say(`${NAMES[i]} 계정: ${LOCK_N}번 연속 실패 → 30초 잠김`, 'amber');
      }
      if (who === 'bot') flashTile(i, 'amber');
    };
    // 시도 제한(계정별): 연속 3번째 실패부터 1·2·4·8초 대기
    const waitLeft = (A) => (s.rl && A.fails >= 3 ? A.lastFail + Math.min(8000, 1000 * 2 ** (A.fails - 3)) - a.now() : 0);

    /* ----- 봇 ----- */
    const judgeBot = (e) => {
      s.botTry++;
      if (s.rl) { // IP별 한도
        const k = s.ipK; s.ipK = (s.ipK + 1) % IPS;
        if (s.ip[k] < 1) { s.blocked++; s.nLim++; return ['', 'gray']; }
        s.ip[k]--;
      }
      if (e.i < 0) { s.nWrong++; return ['', 'gray']; }
      const A = s.acc[e.i];
      if (locked(A)) { s.blocked++; flashTile(e.i, 'amber'); return ['잠김', 'amber']; }
      if (waitLeft(A) > 0) { s.blocked++; s.nLim++; return ['', 'gray']; }
      const right = reuseNow(A) && e.k === RIGHT[e.i];
      if (!right) { fail(A, e.i, 'bot'); s.nWrong++; return ['', 'gray']; }
      A.fails = 0;
      if (s.breach) {
        s.blocked++; A.changed = true;
        say(`봇 → ${NAMES[e.i]}: 유출된 비번이라 거절, 주인에게 재설정 요청`, 'teal');
        flashTile(e.i, 'green');
        return ['유출', 'teal'];
      }
      if (s.mfa) {
        s.blocked++; s.mfaBlk++;
        say(`봇 → ${NAMES[e.i]}: 비번은 맞았지만 2단계 인증에서 막힘`, 'violet');
        flashTile(e.i, 'green');
        return ['2단계', 'violet'];
      }
      A.taken = true; s.taken++;
      say(`봇 → ${NAMES[e.i]}: 유출 비번 그대로 → 계정 탈취!`, 'red');
      flashTile(e.i, 'red');
      return ['탈취', 'red'];
    };
    const nextEntry = () => {
      for (let n = 0; n < LIST.length; n++) {
        const e = LIST[s.pos];
        s.pos++;
        if (s.pos >= LIST.length) { s.pos = 0; s.round++; }
        if (e.i < 0 || !s.acc[e.i].taken) return e;
      }
      return null;
    };
    const fireBot = async () => {
      const e = nextEntry();
      if (!e || s.fly >= 30) return;
      const g = s.gen;
      s.fly++;
      try {
        const p = a.packet('', { at: BOT_OUT, color: 'red', w: 16, h: 16 });
        await a.move(p, SRV_IN_B, 340);
        if (g !== s.gen) { await a.fadeOut(p, 150); return; }
        const [lbl, c] = judgeBot(e);
        s.paint();
        p.set(lbl, c);
        if (!lbl) { await a.fadeOut(p, 260); return; }
        await a.par(a.move(p, BOUNCE_B, 520), a.wait(260).then(() => a.fadeOut(p, 260)));
      } finally { s.fly--; }
    };

    /* ----- 정상 사용자 ----- */
    const userTry = async (i, typo, g) => {
      const A = s.acc[i];
      const p = a.packet('', { at: USR_OUT, color: 'blue', w: 16, h: 16 });
      await a.move(p, SRV_IN_U, 340);
      if (g !== s.gen) { await a.fadeOut(p, 150); return 'stop'; }
      let r;
      if (locked(A)) {
        s.userLocked++;
        say(`정상 사용자 ${NAMES[i]}: 계정이 잠겨 못 들어감`, 'amber');
        flashTile(i, 'amber');
        r = ['잠김', 'amber', 'stop'];
      } else {
        const w = waitLeft(A);
        if (w > 0) { p.set('대기', 'gray'); await a.wait(w); if (g !== s.gen) { await a.fadeOut(p, 150); return 'stop'; } }
        if (typo) { fail(A, i, 'user'); r = ['오타', 'gray', 'retry']; } else {
          A.fails = 0;
          if (s.mfa) { p.set('코드', 'violet'); await a.wait(300); if (g !== s.gen) { await a.fadeOut(p, 150); return 'stop'; } }
          s.userOk++;
          if (s.breach && reuseNow(A)) {
            A.changed = true;
            say(`정상 사용자 ${NAMES[i]}: 유출된 비번이라 새 비번으로 바꿈`, 'teal');
            r = ['새 비번', 'teal', 'ok'];
          } else r = ['✓', 'green', 'ok'];
          flashTile(i, 'green');
        }
      }
      s.paint();
      p.set(r[0], r[1]);
      await a.par(a.move(p, BOUNCE_U, 520), a.wait(260).then(() => a.fadeOut(p, 260)));
      return r[2];
    };
    const fireUser = async () => {
      if (s.fly >= 30) return;
      const g = s.gen;
      const i = Math.floor(rU() * N), typo = rU() < 0.2;
      s.fly++;
      try {
        const r = await userTry(i, typo, g);
        if (r === 'retry' && g === s.gen) { await a.wait(300); await userTry(i, false, g); }
      } finally { s.fly--; }
    };

    s.reset();
    /** 초당 r번 fn — 밀린 만큼 따라잡는다 */
    let due = a.now();
    a.every(40, () => {
      const r = s.speed, now = a.now();
      if (now - due > 1500) due = now;
      while (due <= now) { due += 1000 / r; a.spawn(fireBot); }
    });
    a.every(1500, () => a.spawn(fireUser));
    // IP 한도 충전, 시계, 잠금 해제 표시
    a.every(250, () => {
      for (let k = 0; k < IPS; k++) s.ip[k] = Math.min(IP_CAP, s.ip[k] + IP_REFILL / 4);
      s.clock = a.now();
      s.paint();
    });
  },
  stats: (s) => [
    ['탈취된 계정', `${s.taken} / ${N}`, s.taken ? 'red' : 'green'],
    ['봇 시도', s.botTry, ''],
    ['막힌 공격 시도', s.blocked, s.blocked ? 'green' : ''],
    ['잠겨서 못 들어간 사용자', s.userLocked, s.userLocked ? 'amber' : ''],
    ['정상 로그인 성공', s.userOk, 'green'],
  ],
  tasks: [
    { t: '방어를 모두 끄고 지켜보기 — 재사용한 계정이 줄줄이 넘어가 탈취 5개 이상이 되나요?', check: (s) => !s.rl && !s.mfa && !s.lock && !s.breach && s.taken >= 5 },
    { t: '2단계 인증을 켜고 20초 동안 탈취 0 유지하기 — 봇이 맞는 비번을 넣어도 막히나요?', check: (s) => s.mfa && s.taken === 0 && s.mfaBlk >= 1 && s.clock - s.t0 >= 20000 },
    { t: '시도 제한을 끄고 계정 잠금만 켜기 — 탈취는 계속되는데 정상 사용자 2명이 잠겨 못 들어가나요?', check: (s) => s.lock && !s.rl && !s.mfa && s.taken >= 1 && s.userLocked >= 2 },
    { t: '재사용 비율을 0%로 — 봇이 40번 넘게 대입해도 탈취 0', check: (s) => s.reuse === 0 && s.taken === 0 && s.botTry >= 40 },
  ],
};

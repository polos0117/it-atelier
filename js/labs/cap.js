// CAP 실험실: 서울·도쿄 두 복제본에서 같은 재고를 판다. 분할을 일으키고 CP(거절)·AP(각자 받기)를 골라 결과를 비교한다
const SX = 175, TX = 545, SY = 140, MID = 360, CY = 250;
const NAME = ['서울', '도쿄'];
const SV = ['S', 'T'], CL = ['cS', 'cT'];
const X = [SX, TX];
const DB_W = 150, DB_H = 84, P_W = 118, P_H = 50;
const FULL = 10; // '재고 채우기'로 맞추는 값
// 점은 노드 가운데가 아니라 테두리에서 멈춘다 — 글자를 가리지 않게
// 요청은 왼쪽 줄, 응답은 오른쪽 줄로 오가 서로 겹치지 않게
const CL_TOP = (i, dx = 0) => [X[i] + dx, CY - P_H / 2 - 4];
const SV_BOT = (i, dx = 0) => [X[i] + dx, SY + DB_H / 2 + 4];
const SV_SIDE = (i, dy = 0) => [X[i] + (i ? -1 : 1) * (DB_W / 2 + 4), SY + dy];
const DY = [-14, 14]; // 서울→도쿄는 위, 도쿄→서울은 아래 줄

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 지금 분할 동안의 초과 판매: 두 곳에서 판 개수 - 분할 시작 때 재고 */
const overNow = (s) => (s.part ? Math.max(0, s.R[0].w + s.R[1].w - s.partStock) : 0);
const avail = (s) => (s.hist.length ? s.hist.filter(Boolean).length / s.hist.length : 1);

export default {
  id: 'cap',
  title: 'CAP 실험실',
  intro: '서울과 도쿄 서버가 같은 재고를 복제해 팝니다. 네트워크를 끊고(분할), 그때 일관성(CP: 확인 못 하면 거절)과 가용성(AP: 각자 받기) 중 무엇을 고를지 바꿔 보세요. AP로 갈라진 뒤 연결을 되살리면 LWW(마지막 쓰기 우선)로 값을 맞춥니다.',
  controls: [
    { type: 'toggle', key: 'part', label: '네트워크 분할' },
    { type: 'radio', key: 'mode', label: '분할 시 선택', options: [['cp', 'CP: 거절'], ['ap', 'AP: 각자 받기']] },
    { type: 'button', label: '서울에서 구매', run: (s) => s.buy(0) },
    { type: 'button', label: '도쿄에서 구매', run: (s) => s.buy(1) },
    { type: 'range', key: 'auto', label: '자동 구매', min: 0, max: 3, step: 0.5, unit: '건/초' },
    { type: 'button', label: '재고 채우기', run: (s) => s.refill() },
  ],
  init: () => ({
    part: false, mode: 'cp', auto: 0.5,
    R: [{ v: 5, ts: 0, w: 0 }, { v: 5, ts: 0, w: 0 }], agreed: 5, partStock: 0,
    ok: 0, rej: 0, soldout: 0, oversell: 0, lost: 0, hist: [],
    okSince: 0, rejSince: 0, epoch: 0, fly: 0, healedDiverged: false,
  }),
  onChange(key, s) {
    if (key === 'part' || key === 'mode') { s.epoch++; s.okSince = 0; s.rejSince = 0; s.hist = []; }
    if (key === 'part') s.onPart?.();
    s.paint?.();
  },
  setup(a, s) {
    const R = rng(77);
    a.text(360, 24, '같은 재고를 서울·도쿄 두 곳에 복제', { id: 'title', size: 14.5, weight: 800 });
    a.zone('zs', 30, 48, 290, 248, { label: '서울 데이터센터', color: 'blue' });
    a.zone('zt', 400, 48, 290, 248, { label: '도쿄 데이터센터', color: 'violet' });
    a.node('S', SX, SY, { shape: 'db', label: '서울 서버', sub: '재고 5', color: 'blue', w: DB_W, h: DB_H });
    a.node('T', TX, SY, { shape: 'db', label: '도쿄 서버', sub: '재고 5', color: 'violet', w: DB_W, h: DB_H });
    a.edge('S', 'T', { id: 'link', both: true, label: '동기 복제', color: 'teal', ly: -32 });
    a.node('cS', SX, CY, { shape: 'person', label: '서울 손님들', color: 'gray', w: P_W, h: P_H });
    a.node('cT', TX, CY, { shape: 'person', label: '도쿄 손님들', color: 'gray', w: P_W, h: P_H });
    a.edge('cS', 'S', { arrow: false });
    a.edge('cT', 'T', { arrow: false });
    a.text(360, 322, '', { id: 'mode', size: 13, weight: 700 });
    a.text(360, 346, '', { id: 'mode2', size: 12, cls: 'muted', weight: 600 });
    let noteN = 0;

    /* ---------- 그리기 ---------- */
    s.paint = () => {
      const [A, B] = s.R;
      a.setNode('S', { sub: `재고 ${A.v}` });
      a.setNode('T', { sub: `재고 ${B.v}` });
      const e = a.get('link');
      e.path.classList.toggle('ec-teal', !s.part);
      e.path.classList.toggle('ec-red', s.part);
      e.path.classList.toggle('dashed', s.part);
      e.lab.textContent = s.part ? '연결 끊김' : '동기 복제';
      e.lab.style.fill = s.part ? 'var(--red)' : '';
      if (s.part && !a.get('cutx')) a.text(MID, SY, '✕', { id: 'cutx', size: 26, weight: 800, color: 'red', layer: 'edge' });
      if (!s.part && a.get('cutx')) a.remove('cutx');
      const tag = (i) => (!s.part ? '' : s.mode === 'cp' ? '쓰기 거절 중' : `각자 판매 ${s.R[i].w}`);
      [0, 1].forEach((i) => a.badge(SV[i], tag(i), s.mode === 'cp' ? 'red' : 'amber'));
      const m = a.get('mode');
      if (!s.part) {
        m.textContent = '정상: 상대 서버가 "확인"해야 구매 완료 — 두 값이 늘 같아요';
        a.get('mode2').textContent = A.v !== B.v ? '복제 중…' : `분할이 나면: ${s.mode === 'cp' ? 'CP — 확인 못 하면 거절' : 'AP — 각자 받아서 판매'}`;
      } else if (s.mode === 'cp') {
        m.textContent = '분할 + CP: 상대에게 확인할 수 없으니 거절 → 일관성 ✓ 가용성 ✗';
        a.get('mode2').textContent = `분할 시작 재고 ${s.partStock} · 거절된 요청이 쌓여요`;
      } else {
        m.textContent = '분할 + AP: 각자 받아서 판매 → 가용성 ✓ 일관성 ✗';
        const o = overNow(s);
        a.get('mode2').textContent = `분할 시작 재고 ${s.partStock} · 판매 서울 ${A.w} + 도쿄 ${B.w}${o ? ` → ${o}개 초과 판매!` : ''}`;
      }
      m.setAttribute('class', 'tx ' + (!s.part ? 'tc-teal' : s.mode === 'cp' ? 'tc-red' : 'tc-amber'));
    };
    const note = (msg, color) => {
      const id = 'nt' + ++noteN;
      a.remove('nt' + (noteN - 1));
      a.note(id, 360, 398, msg, { color });
      a.spawn(async () => { await a.wait(6000); a.remove(id); });
    };

    /* ---------- 메시지 ---------- */
    /** 끊긴 길로 보낸 메시지: 가운데에서 사라진다 */
    async function lost(i, label) {
      const p = a.packet(label, { at: SV_SIDE(i, DY[i]), color: 'gray' });
      await a.move(p, [MID + (i ? 26 : -26), SY + DY[i]], 420);
      p.set('✕', 'red');
      await a.fadeOut(p, 300);
    }
    /** 서버 i → 상대 서버로 보냄. 도착하면 true, 분할로 사라지면 false */
    async function toPeer(i, label, color) {
      if (s.part) { await lost(i, label); return false; }
      await a.send(SV_SIDE(i, DY[i]), SV_SIDE(1 - i, DY[i]), label, { color, dur: 420 });
      return !s.part;
    }
    function answer(i, kind, ep) {
      const L = { ok: ['✓ 완료', 'green'], rej: ['거절', 'red'], out: ['품절', 'gray'], tmo: ['시간 초과', 'red'] }[kind];
      if (kind === 'ok') { s.ok++; if (ep === s.epoch) s.okSince++; }
      else if (kind === 'out') s.soldout++;
      else { s.rej++; if (ep === s.epoch) s.rejSince++; }
      s.hist.push(kind === 'ok' || kind === 'out');
      if (s.hist.length > 20) s.hist.shift();
      s.paint();
      return a.send(SV_BOT(i, 26), CL_TOP(i, 26), L[0], { color: L[1], dur: 400 });
    }

    /* ---------- 구매 ---------- */
    s.buy = (i) => {
      if (s.fly >= 10) return; // 한꺼번에 오가는 요청 수 제한
      s.fly++;
      a.spawn(async () => {
        try {
          const ep = s.epoch, me = s.R[i], peer = s.R[1 - i];
          await a.send(CL_TOP(i, -26), SV_BOT(i, -26), '구매', { color: 'amber', dur: 400 });
          if (!s.part) {
            // 정상: 공유된 재고로 판단하고, 상대가 확인해야 완료
            if (s.agreed <= 0) { await answer(i, 'out', ep); return; }
            s.agreed--; me.v--; me.ts = a.now(); s.paint();
            if (await toPeer(i, '재고 -1', 'teal')) {
              peer.v--; peer.ts = a.now(); s.paint();
              if (await toPeer(1 - i, '확인', 'green')) await answer(i, 'ok', ep);
              else await answer(i, 'tmo', ep); // 확인이 끊김에 막힘
            } else if (s.mode === 'cp') {
              me.v++; s.partStock++; s.paint(); // 되돌리고 거절 (분할 시작 재고에도 되돌려 셈)
              await answer(i, 'rej', ep);
            } else {
              me.w++; s.partStock++; // 이미 뺀 몫이므로 분할 시작 재고에 되돌려 셈
              await answer(i, 'ok', ep);
            }
            return;
          }
          if (s.mode === 'cp') { // 분할 + CP: 확인 시도 → 끊김 → 거절
            await lost(i, '재고 -1');
            await answer(i, 'rej', ep);
            return;
          }
          // 분할 + AP: 내 값만 보고 판매
          if (me.v <= 0) { await answer(i, 'out', ep); return; }
          me.v--; me.ts = a.now(); me.w++;
          a.spawn(() => lost(i, '재고 -1'));
          await answer(i, 'ok', ep);
        } finally { s.fly--; }
      });
    };
    s.refill = () => {
      if (s.part) { note('분할 중엔 두 곳을 함께 채울 수 없어요 — 먼저 연결을 되살리세요', 'amber'); return; }
      s.agreed = FULL;
      s.R.forEach((r) => { r.v = FULL; r.ts = a.now(); });
      s.paint();
      a.spawn(() => a.send(SV_SIDE(0, DY[0]), SV_SIDE(1, DY[0]), `재고 ${FULL}`, { color: 'teal', dur: 420 }));
    };

    /* ---------- 분할 시작·회복 ---------- */
    s.onPart = () => {
      const [A, B] = s.R;
      if (s.part) {
        s.partStock = Math.min(A.v, B.v);
        A.w = 0; B.w = 0;
        note('서울–도쿄 연결이 끊겼어요. 두 서버는 멀쩡하지만 서로를 볼 수 없어요', 'red');
        return;
      }
      s.oversell += Math.max(0, A.w + B.w - s.partStock);
      if (A.v !== B.v || (A.w && B.w)) {
        const win = A.ts >= B.ts ? 0 : 1, lose = 1 - win;
        const W = s.R[win], Lr = s.R[lose];
        const lostN = A.w && B.w ? Lr.w : 0; // 양쪽이 다 썼으면 진 쪽 기록이 사라짐
        s.lost += lostN;
        Lr.v = W.v; Lr.ts = W.ts;
        s.healedDiverged = true;
        a.spawn(() => a.send(SV_SIDE(win, DY[win]), SV_SIDE(lose, DY[win]), `LWW: 재고 ${W.v}`, { color: 'violet', dur: 700 }));
        note(lostN
          ? `충돌! 더 늦게 쓴 ${NAME[win]} 값(재고 ${W.v})만 남겨요\n${NAME[lose]}에서 판 ${lostN}건의 기록은 사라졌어요`
          : `${NAME[win]}의 새 값(재고 ${W.v})을 ${NAME[lose]}에 복사해 다시 같아졌어요`, lostN ? 'red' : 'teal');
      } else {
        note('연결 복구 — 갈라진 값이 없어 맞출 것이 없어요', 'teal');
      }
      A.w = 0; B.w = 0;
      s.agreed = A.v;
    };
    s.paint();

    /* ---------- 흐름 ---------- */
    a.every(() => (s.auto > 0 ? 1000 / s.auto : 400), () => { if (s.auto > 0) s.buy(R() < 0.5 ? 0 : 1); });
    a.every(250, () => s.paint());
  },
  stats: (s) => {
    const o = s.oversell + overNow(s);
    const [A, B] = s.R;
    const av = avail(s);
    return [
      ['성공한 구매', s.ok, 'green'],
      ['거절된 요청', s.rej, s.rej ? 'red' : ''],
      ['가용성(최근 20건)', Math.round(av * 100) + '%', av < 1 ? 'red' : ''],
      ['초과 판매 · 잃은 쓰기', `${o} · ${s.lost}`, o || s.lost ? 'amber' : ''],
      ['두 복제본 값', `서울 ${A.v} · 도쿄 ${B.v}`, A.v !== B.v ? 'red' : ''],
    ];
  },
  tasks: [
    { t: '분할 + CP로 구매해 보기 — 요청 2건이 거절되나요?', check: (s) => s.part && s.mode === 'cp' && s.rejSince >= 2 },
    { t: '분할 + AP에서 남은 재고보다 많이 팔아 보기 (초과 판매 1개 이상)', check: (s) => s.part && s.mode === 'ap' && overNow(s) >= 1 },
    { t: 'AP로 값이 갈라진 뒤 분할을 풀어 두 값이 다시 같아지는 것 보기', check: (s) => !s.part && s.healedDiverged && s.R[0].v === s.R[1].v },
    { t: '정상 상태에서 거절 없이 구매 10건 성공하기 (재고가 떨어지면 채우세요)', check: (s) => !s.part && s.okSince >= 10 && s.rejSince === 0 },
  ],
};

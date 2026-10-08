// Raft 실험실: 선거 타이머·투표·하트비트·로그 복제·커밋을 직접 흔들어 본다 (리더 끄기, 노드 끄기, 네트워크 분할)
const CX = 300, CY = 220, RAD = 150;
const POS = [0, 1, 2, 3, 4].map((i) => {
  const t = (-90 + i * 72) * (Math.PI / 180);
  return [Math.round(CX + RAD * Math.cos(t)), Math.round(CY + RAD * Math.sin(t))];
});
const ID = ['s1', 's2', 's3', 's4', 's5'];
const NW = 96, NH = 50; // 노드 상자 크기
const DUR = 520; // 메시지 한 번 이동 시간(ms)
const SHOW = 6; // 노드 아래에 보여 줄 최근 로그 칸 수
const KEEP = 20; // 커밋된 앞부분은 이만큼만 남기고 스냅샷으로 접는다
const CLI = [630, 112], CLI_W = 120, CLI_H = 56;
const ROLE = { f: ['Follower', 'gray'], c: ['Candidate', 'amber'], l: ['Leader', 'green'] };
const MAJ = 3;

/** 시드가 있는 의사 난수(mulberry32) — 처음부터 누르면 같은 흐름이 다시 나온다 */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** (cx,cy) 중심, w×h 상자의 테두리 중 (tx,ty) 쪽 점 */
function rim(cx, cy, w, h, tx, ty, pad = 4) {
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const k = Math.min((w / 2 + pad) / Math.abs(dx || 1e-9), (h / 2 + pad) / Math.abs(dy || 1e-9));
  return [cx + dx * k, cy + dy * k];
}
const edgeOf = (i, to) => rim(POS[i][0], POS[i][1], NW, NH, to[0], to[1]);
const cliEdge = (to) => rim(CLI[0], CLI[1], CLI_W, CLI_H, to[0], to[1]);
const ups = (s) => (s.N ? s.N.filter((n) => n.up) : []);
const leaders = (s) => ups(s).filter((n) => n.role === 'l').sort((x, y) => y.term - x.term);
const downCount = (s) => (s.N ? s.N.filter((n) => !n.up).length : 0);

export default {
  id: 'raft',
  title: 'Raft 실험실',
  intro: '서버 5대가 스스로 리더를 뽑고, 쓰기를 과반수(3대)에 복제해 커밋합니다. 리더나 노드를 끄고 네트워크를 둘로 나눠 보면서, 언제 새 리더가 뽑히고 언제 커밋이 멈추는지 보세요. 분할 중에는 클라이언트가 자기가 리더라고 믿는 노드 모두에게 쓰기를 보내요.',
  controls: [
    { type: 'button', label: '쓰기 보내기', run: (s) => s.write() },
    { type: 'button', label: '리더 끄기', run: (s) => s.killLeader() },
    { type: 'button', label: '팔로워 1대 끄기', run: (s) => s.killFollower() },
    { type: 'button', label: '모두 다시 켜기', run: (s) => s.reviveAll() },
    { type: 'toggle', key: 'part', label: '네트워크 분할 (2 | 3)' },
    { type: 'range', key: 'auto', label: '자동 쓰기', min: 0, max: 2, step: 0.5, unit: '건/초' },
    { type: 'range', key: 'hb', label: '하트비트 간격', min: 0.4, max: 4, step: 0.2, unit: '초' },
  ],
  init: () => ({
    part: false, auto: 0.5, hb: 1,
    N: null, minor: [], seq: 0, pend: [], epoch: 0, cw: 0, flying: 0,
    ok: 0, lost: 0, okSince: 0, stallSince: 0, minorStuck: 0, majorOk: 0,
    killTerm: null, reelected: false,
  }),
  onChange(key, s) {
    if (key === 'part') { s.setPart?.(); s.mark?.(); }
    if (key === 'hb') for (const n of ups(s)) if (n.role === 'l') n.nextHb = Math.min(n.nextHb, s.now() + s.hb * 1000);
  },
  setup(a, s) {
    const R = rng(20261008);
    const tmo = () => 3000 + R() * 2000; // 선거 타임아웃 3~5초(무작위)
    const now = () => a.now();
    s.now = now;
    const N = POS.map((_, i) => {
      const span = 700 + R() * 2300; // 처음엔 조금 빨리 첫 선거가 열리게
      return { i, up: true, role: 'f', term: 0, voted: null, log: [], off: 0, offT: 0, commit: 0,
        deadline: now() + span, span, votes: new Set(), next: [0, 0, 0, 0, 0], match: [0, 0, 0, 0, 0], nextHb: 0, lastRep: -1e9 };
    });
    s.N = N;

    /* ---------- 로그 도우미 ---------- */
    const last = (n) => n.off + n.log.length;
    const entry = (n, k) => (k > n.off ? n.log[k - n.off - 1] : null);
    const termAt = (n, k) => (k <= 0 ? 0 : k === n.off ? n.offT : k < n.off ? -1 : entry(n, k)?.t ?? -1);
    const compact = (n) => {
      const k = n.commit - KEEP - n.off;
      if (k <= 5) return;
      n.offT = n.log[k - 1].t;
      n.log = n.log.slice(k);
      n.off += k;
    };
    const resetTimer = (n) => { n.span = tmo(); n.deadline = now() + n.span; };
    const stepDown = (n, term) => {
      if (term > n.term) { n.term = term; n.voted = null; }
      if (n.role !== 'f') { n.role = 'f'; resetTimer(n); }
      n.votes.clear();
    };
    const blocked = (i, j) => s.part && s.minor.includes(i) !== s.minor.includes(j);

    /* ---------- 무대 ---------- */
    a.text(CLI[0], 36, 'term 0', { id: 'term', size: 16, weight: 800, layer: 'edge', mono: true, color: 'violet' });
    POS.forEach(([x, y], i) => {
      a.node(ID[i], x, y, { label: `S${i + 1}`, sub: 'Follower · t0', color: 'gray', w: NW, h: NH });
      a.bar('tm' + i, x - 40, y - 46, 80, { color: 'teal', value: 1 });
      for (let k = 0; k < SHOW; k++) {
        const p = a.packet('', { id: `lg${i}_${k}`, at: [x + (k - (SHOW - 1) / 2) * 27, y + 44], w: 25, h: 20, round: 5, size: 10.5, color: 'gray', layer: 'edge' });
        p.g.style.opacity = 0;
      }
    });
    a.node('cli', CLI[0], CLI[1], { label: '클라이언트', icon: '💻', color: 'blue', w: CLI_W, h: CLI_H });
    a.text(628, 382, '막대 = 선거 타이머', { size: 11, cls: 'muted', weight: 600, layer: 'edge' });
    a.text(540, 412, '로그', { size: 12, weight: 700, cls: 'muted', layer: 'edge' });
    a.packet('미확정', { at: [598, 412], color: 'gray', h: 22, round: 5, size: 11, layer: 'edge' });
    a.packet('커밋됨', { at: [668, 412], color: 'green', h: 22, round: 5, size: 11, layer: 'edge' });

    /* ---------- 메시지 ---------- */
    let cut = null; // 분할선 {p, u, d}
    async function dropAtCut(from, to, label, color) {
      const A = edgeOf(from, POS[to]), B = edgeOf(to, POS[from]);
      const { u, d } = cut;
      const pa = (A[0] - CX) * u[0] + (A[1] - CY) * u[1], pb = (B[0] - CX) * u[0] + (B[1] - CY) * u[1];
      const t = Math.max(0, Math.min(1, (d - pa) / ((pb - pa) || 1e-9)));
      const p = a.packet(label, { at: A, color, w: label.length <= 1 ? 22 : undefined, h: label.length <= 1 ? 22 : undefined });
      await a.move(p, [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], DUR * t + 60);
      p.set('✕', 'red');
      await a.fadeOut(p, 300);
    }
    /** from → to 메시지. quiet면 움직임 없이 시간만 흐른다(하트비트 응답 등) */
    async function msg(from, to, kind, d, label, color, quiet = false) {
      if (!N[from].up) return;
      if (blocked(from, to)) { if (!quiet && s.flying < 40) { s.flying++; try { await dropAtCut(from, to, label, color); } finally { s.flying--; } } return; }
      if (quiet || s.flying >= 40) await a.wait(DUR);
      else {
        s.flying++;
        const small = label.length <= 1;
        try { await a.send(edgeOf(from, POS[to]), edgeOf(to, POS[from]), label, { color, dur: DUR, w: small ? 22 : undefined, h: small ? 22 : undefined }); } finally { s.flying--; }
      }
      if (!N[to].up || blocked(from, to)) return; // 꺼졌거나 그새 끊김 → 사라짐
      H[kind](N[to], N[from], d);
    }

    /* ---------- Raft 규칙 ---------- */
    function startElection(n) {
      n.term++;
      n.role = 'c';
      n.voted = n.i;
      n.votes = new Set([n.i]);
      resetTimer(n);
      a.caption(`S${n.i + 1} 타이머 만료 → term ${n.term} 후보로 투표 요청`);
      const d = { term: n.term, li: last(n), lt: termAt(n, last(n)) };
      for (const j of [0, 1, 2, 3, 4]) if (j !== n.i) a.spawn(() => msg(n.i, j, 'rv', d, '투표?', 'amber'));
    }
    function becomeLeader(n) {
      n.role = 'l';
      n.next = n.next.map(() => last(n) + 1);
      n.match = [0, 0, 0, 0, 0];
      n.match[n.i] = last(n);
      n.nextHb = now();
      a.caption(`S${n.i + 1} → term ${n.term} 리더 당선 (표 ${n.votes.size}/5)`);
      if (s.killTerm != null && n.term > s.killTerm) s.reelected = true;
    }
    function advance(n) {
      for (let k = last(n); k > n.commit; k--) {
        if (termAt(n, k) !== n.term) break; // 자기 term 항목만 개수로 커밋(이전 term 항목은 함께 딸려 커밋)
        if (n.match.filter((m, j) => (j === n.i ? last(n) : m) >= k).length >= MAJ) { n.commit = k; compact(n); break; }
      }
    }
    function replicate(n) {
      n.lastRep = now();
      for (const j of [0, 1, 2, 3, 4]) {
        if (j === n.i) continue;
        const prev = n.next[j] - 1;
        if (prev < n.off) {
          a.spawn(() => msg(n.i, j, 'snap', { term: n.term, off: n.off, offT: n.offT }, '스냅샷', 'violet'));
        } else {
          const ents = n.log.slice(prev - n.off, prev - n.off + 8);
          const d = { term: n.term, prev, prevT: termAt(n, prev), ents, commit: n.commit };
          a.spawn(() => msg(n.i, j, 'ae', d, ents.length ? '+' + ents.length : '♥', ents.length ? 'violet' : 'green'));
        }
      }
    }
    const H = {
      rv(n, c, d) { // 표 요청을 받음
        if (d.term > n.term) stepDown(n, d.term);
        const myT = termAt(n, last(n));
        const fresh = d.lt > myT || (d.lt === myT && d.li >= last(n));
        const grant = d.term === n.term && (n.voted == null || n.voted === c.i) && fresh;
        if (grant) { n.voted = c.i; resetTimer(n); }
        a.spawn(() => msg(n.i, c.i, 'vr', { term: n.term, grant }, grant ? '찬성' : '반대', grant ? 'green' : 'gray'));
      },
      vr(n, v, d) { // 표 응답
        if (d.term > n.term) { stepDown(n, d.term); return; }
        if (n.role !== 'c' || d.term !== n.term || !d.grant) return;
        n.votes.add(v.i);
        if (n.votes.size >= MAJ) becomeLeader(n);
      },
      ae(n, l, d) { // AppendEntries(빈 것은 하트비트)
        if (d.term < n.term) { a.spawn(() => msg(n.i, l.i, 'ar', { term: n.term, ok: false, len: last(n) }, '✕', 'red')); return; }
        if (d.term > n.term || n.role !== 'f') stepDown(n, d.term);
        resetTimer(n);
        let prev = d.prev, ents = d.ents;
        if (prev < n.off) { ents = ents.slice(n.off - prev); prev = n.off; } // 접힌 앞부분은 이미 커밋돼 같다
        else if (prev > last(n) || termAt(n, prev) !== d.prevT) {
          a.spawn(() => msg(n.i, l.i, 'ar', { term: n.term, ok: false, len: last(n) }, '✕', 'red'));
          return;
        }
        let k = prev;
        for (const e of ents) {
          k++;
          const cur = entry(n, k);
          if (cur && cur.t !== e.t) n.log.length = k - n.off - 1; // 어긋난 미커밋 항목부터 잘라 냄
          if (!entry(n, k)) n.log.push(e);
        }
        if (d.commit > n.commit) { n.commit = Math.min(d.commit, k); compact(n); }
        a.spawn(() => msg(n.i, l.i, 'ar', { term: n.term, ok: true, m: k }, '✓', 'teal', !d.ents.length));
      },
      ar(n, f, d) { // AppendEntries 응답
        if (d.term > n.term) { stepDown(n, d.term); return; }
        if (n.role !== 'l' || d.term !== n.term) return;
        if (d.ok) { n.match[f.i] = Math.max(n.match[f.i], d.m); n.next[f.i] = Math.max(n.next[f.i], d.m + 1); advance(n); }
        else { n.next[f.i] = Math.max(1, Math.min(n.next[f.i] - 1, d.len + 1)); n.nextHb = Math.min(n.nextHb, now() + 150); }
      },
      snap(n, l, d) { // 스냅샷 설치(오래 꺼져 있던 노드 따라잡기)
        if (d.term < n.term) { a.spawn(() => msg(n.i, l.i, 'ar', { term: n.term, ok: false, len: last(n) }, '✕', 'red')); return; }
        if (d.term > n.term || n.role !== 'f') stepDown(n, d.term);
        resetTimer(n);
        if (d.off > n.off) {
          if (last(n) >= d.off && termAt(n, d.off) === d.offT) n.log = n.log.slice(d.off - n.off);
          else n.log = [];
          n.off = d.off; n.offT = d.offT; n.commit = Math.max(n.commit, d.off);
        }
        a.spawn(() => msg(n.i, l.i, 'ar', { term: n.term, ok: true, m: d.off }, '✓', 'teal'));
      },
    };

    /* ---------- 클라이언트 쓰기 ---------- */
    const reply = (from, label, color) => a.spawn(async () => {
      if (s.flying >= 40) return;
      s.flying++;
      try {
        const p = await a.send(edgeOf(from, CLI), cliEdge(POS[from]), label, { color, dur: 450, keep: true });
        await a.fadeOut(p, 250);
      } finally { s.flying--; }
    });
    s.write = () => {
      if (s.cw >= 6) return; // 클라이언트가 한꺼번에 보내는 요청 수 제한
      const ls = leaders(s);
      if (!ls.length) {
        const ep = s.epoch;
        s.cw++;
        a.spawn(async () => {
          try {
            const p = await a.send(cliEdge([CX, CY]), [CX + 70, CY - 20], '쓰기', { color: 'blue', dur: 450, keep: true });
            p.set('리더 없음', 'red');
            if (ep === s.epoch) s.stallSince++;
            await a.fadeOut(p, 700);
          } finally { s.cw--; }
        });
        return;
      }
      for (const L of ls) {
        const v = ++s.seq, ep = s.epoch, minor = s.part && s.minor.includes(L.i);
        s.cw++;
        a.spawn(async () => {
          try { await a.send(cliEdge(POS[L.i]), edgeOf(L.i, CLI), 'w' + v, { color: 'blue', dur: 450 }); } finally { s.cw--; }
          if (!L.up || L.role !== 'l') { if (ep === s.epoch) s.stallSince++; return; }
          L.log.push({ t: L.term, v });
          L.match[L.i] = last(L);
          s.pend.push({ v, idx: last(L), t: L.term, L: L.i, at: now(), ep, minor, stuck: false });
          if (s.pend.length > 24) s.pend.shift();
          if (now() - L.lastRep > 350) { replicate(L); L.nextHb = now() + s.hb * 1000; }
        });
      }
    };
    function checkWrites() {
      for (const w of [...s.pend]) {
        let res = null, by = null;
        for (const n of N) { // 어느 노드든 커밋된 같은 항목이 있으면 확정
          if (n.commit >= w.idx && w.idx > n.off) { const e = entry(n, w.idx); if (e.t === w.t && e.v === w.v) { res = 'ok'; by = n; break; } }
        }
        const L = N[w.L];
        if (!res && L.commit >= w.idx && w.idx > L.off) res = 'lost'; // 받은 리더 자리에 다른 항목이 커밋됨 → 덮어써짐
        if (!res && now() - w.at > 15000) res = 'timeout';
        if (!res) {
          if (!w.stuck && now() - w.at > 3000) {
            w.stuck = true;
            if (w.ep === s.epoch) { s.stallSince++; if (w.minor) s.minorStuck++; }
          }
          continue;
        }
        s.pend.splice(s.pend.indexOf(w), 1);
        if (res === 'ok') {
          s.ok++;
          if (w.ep === s.epoch) { s.okSince++; if (s.part && !w.minor) s.majorOk++; }
          reply(L.up ? L.i : by.i, '완료', 'green');
        } else {
          s.lost++;
          a.caption(res === 'lost' ? `w${w.v}: 과반수에 저장되지 못해 새 리더의 로그로 덮어써졌어요` : `w${w.v}: 커밋되지 않아 클라이언트가 시간 초과로 포기했어요`);
        }
      }
    }

    /* ---------- 조작 ---------- */
    s.mark = () => { s.epoch++; s.okSince = 0; s.stallSince = 0; s.minorStuck = 0; s.majorOk = 0; };
    const kill = (n) => { n.up = false; n.role = 'f'; n.votes.clear(); a.caption(`S${n.i + 1} 꺼짐`); };
    s.killLeader = () => {
      const L = leaders(s)[0];
      if (!L) { a.caption('지금은 리더가 없어요 — 선거가 끝나길 기다려 보세요'); return; }
      s.killTerm = Math.max(...ups(s).map((n) => n.term));
      kill(L);
      s.mark();
    };
    s.killFollower = () => {
      const c = ups(s).filter((n) => n.role !== 'l');
      if (!c.length) { a.caption('끌 수 있는 팔로워가 없어요'); return; }
      kill(c[Math.floor(R() * c.length)]);
      s.mark();
    };
    s.reviveAll = () => {
      const d = N.filter((n) => !n.up);
      if (!d.length) return;
      for (const n of d) { n.up = true; n.role = 'f'; n.commit = n.off; resetTimer(n); } // term·투표·로그는 디스크에 남아 있음
      a.caption(`${d.map((n) => 'S' + (n.i + 1)).join(', ')} 다시 켜짐 — 팔로워로 합류`);
      s.mark();
    };
    s.setPart = () => {
      if (cut) { a.remove('cut'); a.remove('tMin'); a.remove('tMaj'); cut = null; }
      if (!s.part) { a.caption('네트워크 복구 — 더 높은 term을 본 리더는 물러나요'); return; }
      const L = leaders(s)[0];
      let pair = [2, 3];
      if (L) { const nb = [(L.i + 1) % 5, (L.i + 4) % 5]; pair = [L.i, N[nb[0]].up || !N[nb[1]].up ? nb[0] : nb[1]]; }
      s.minor = pair;
      const mx = (POS[pair[0]][0] + POS[pair[1]][0]) / 2 - CX, my = (POS[pair[0]][1] + POS[pair[1]][1]) / 2 - CY;
      const len = Math.hypot(mx, my), u = [mx / len, my / len], v = [-u[1], u[0]], d = 40;
      const c = [CX + u[0] * d, CY + u[1] * d];
      cut = { u, d };
      a.edge([c[0] - v[0] * 205, c[1] - v[1] * 205], [c[0] + v[0] * 205, c[1] + v[1] * 205], { id: 'cut', dashed: true, arrow: false, color: 'red' });
      const end = v[0] > 0 ? 1 : -1; // 오른쪽 끝에 이름표
      const ex = c[0] + v[0] * 205 * end, ey = c[1] + v[1] * 205 * end;
      a.text(ex + u[0] * 16, ey + u[1] * 16, '소수 쪽', { id: 'tMin', size: 11.5, weight: 700, color: 'red', layer: 'edge' });
      a.text(ex - u[0] * 16, ey - u[1] * 16, '다수 쪽', { id: 'tMaj', size: 11.5, weight: 700, color: 'green', layer: 'edge' });
      a.caption(`분할! S${pair[0] + 1}·S${pair[1] + 1}(2대)와 나머지 3대가 서로 닿지 않아요`);
    };

    /* ---------- 그리기 ---------- */
    const seen = N.map(() => ({}));
    function paint() {
      const t = Math.max(0, ...N.map((n) => n.term));
      a.setText('term', `term ${t}`);
      N.forEach((n, i) => {
        const c = seen[i];
        const sub = n.up ? `${ROLE[n.role][0]} · t${n.term}` : '✕ 꺼짐';
        const color = n.up ? ROLE[n.role][1] : 'red';
        if (c.sub !== sub || c.color !== color) { a.setNode(ID[i], { sub, color }); c.sub = sub; c.color = color; }
        const op = n.up ? 1 : 0.45;
        if (c.op !== op) { a.get(ID[i]).g.style.opacity = op; c.op = op; }
        const bd = n.up && n.role === 'c' ? `표 ${n.votes.size}/5` : '';
        if (c.bd !== bd) { a.badge(ID[i], bd, 'amber'); c.bd = bd; }
        const b = a.get('tm' + i);
        const v = !n.up ? 0 : n.role === 'l' ? 1 : Math.max(0, Math.min(1, (n.deadline - now()) / n.span));
        b.f.setAttribute('width', v * b.w);
        const L = last(n), from = Math.max(n.off + 1, L - SHOW + 1);
        for (let k = 0; k < SHOW; k++) {
          const p = a.get(`lg${i}_${k}`), idx = from + k, e = idx <= L ? entry(n, idx) : null;
          if (!e) { p.g.style.opacity = 0; continue; }
          p.g.style.opacity = n.up ? 1 : 0.4;
          p.t.textContent = e.v;
          p.set(null, idx <= n.commit ? 'green' : 'gray');
        }
      });
    }
    s.paint = paint;
    paint();

    /* ---------- 흐름 ---------- */
    a.every(100, () => {
      const t = now();
      for (const n of N) {
        if (!n.up) continue;
        if (n.role === 'l') { if (t >= n.nextHb) { n.nextHb = t + s.hb * 1000; replicate(n); } }
        else if (t >= n.deadline) startElection(n);
      }
      checkWrites();
      paint();
    });
    a.every(() => (s.auto > 0 ? 1000 / s.auto : 400), () => { if (s.auto > 0) s.write(); });
  },
  stats: (s) => {
    const ls = leaders(s);
    const t = s.N ? Math.max(0, ...s.N.map((n) => n.term)) : 0;
    const up = 5 - downCount(s);
    return [
      ['현재 리더', ls.length ? ls.map((n) => `S${n.i + 1}`).join(' · ') : '없음', ls.length === 1 ? 'green' : ls.length ? 'amber' : 'red'],
      ['term', t, 'violet'],
      ['커밋된 쓰기', s.ok, 'green'],
      ['미확정 쓰기', s.pend.length, s.pend.length ? 'amber' : ''],
      ['살아 있는 노드', `${up}/5`, up >= 3 ? '' : 'red'],
    ];
  },
  tasks: [
    { t: '리더를 끄고, 남은 노드들이 더 높은 term으로 새 리더를 뽑는 것 보기', check: (s) => s.reelected },
    { t: '노드 2대를 끈 채로 쓰기 3건 커밋하기 — 3대만 남아도 과반수예요', check: (s) => downCount(s) === 2 && !s.part && s.okSince >= 3 },
    { t: '노드 3대를 끄고 쓰기를 보내 보기 — 커밋이 멈추나요?', check: (s) => downCount(s) >= 3 && s.stallSince >= 2 && s.okSince === 0 },
    { t: '모두 켠 채 분할하기 — 소수 쪽 리더의 쓰기는 멈추고 다수 쪽 새 리더의 쓰기는 커밋되나요?', check: (s) => s.part && s.minorStuck >= 1 && s.majorOk >= 1 },
  ],
};

import { Player } from './engine.js';
import { loadTopics, LEVELS, FACTORY, COURSES } from './topics/index.js';
import { LAB_IDS, loadLab } from './labs/index.js';

const app = document.getElementById('app');
const store = {
  get(k, d) { try { const v = localStorage.getItem('mit-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mit-' + k, JSON.stringify(v)); } catch { /* 저장 불가 */ } },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lc = (lv) => `var(--${LEVELS[lv].color})`;

let TOPICS = [];
let player = null;
let heroPlayer = null;
let offKeys = null;
const done = new Set(store.get('done', []));
const markDone = (id) => { if (!done.has(id)) { done.add(id); store.set('done', [...done]); } };
const quizBest = store.get('quiz', {});
let curCourse = store.get('course', null);
const courseTopics = (c) => c.ids.map((id) => TOPICS.find((t) => t.id === id)).filter(Boolean);

const ICON = {
  first: '<svg viewBox="0 0 24 24"><path d="M5 5h2v14H5zM19 5v14L8 12z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M17 5v14L6 12z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M7 5v14l11-7z"/></svg>',
  big: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
};

/* ---------- 테마 ---------- */
document.getElementById('theme').addEventListener('click', () => {
  const root = document.documentElement;
  const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const nx = cur === 'light' ? 'dark' : 'light';
  root.dataset.theme = nx;
  try { localStorage.setItem('mit-theme', nx); } catch { /* 무시 */ }
});

/* ---------- 라우터 ---------- */
function cleanup() {
  player?.destroy(); player = null;
  heroPlayer?.destroy(); heroPlayer = null;
  offKeys?.(); offKeys = null;
}
function route() {
  cleanup();
  const m = location.hash.match(/^#\/t\/([\w-]+)(?:\/(\d+|lab))?/);
  const t = m && TOPICS.find((x) => x.id === m[1]);
  document.querySelectorAll('[data-nav]').forEach((a) => a.removeAttribute('aria-current'));
  const nav = (k) => document.querySelector(`[data-nav="${k}"]`)?.setAttribute('aria-current', 'page');
  if (t && m[2] === 'lab' && LAB_IDS.includes(t.id)) renderLab(t);
  else if (t) renderTopic(t, m[2] ? +m[2] : 0);
  else if (location.hash.startsWith('#/terms')) { renderTerms(); nav('terms'); }
  else { renderHome(); nav('home'); }
}

/* ---------- 처음 화면 ---------- */
let filter = store.get('filter', 0);
let query = '';

function renderHome() {
  document.title = '움직이는 IT — IT 개념을 움직이는 그림으로';
  const total = TOPICS.length, n = TOPICS.filter((t) => done.has(t.id)).length;
  const first = TOPICS.find((t) => !done.has(t.id)) || TOPICS[0];
  app.innerHTML = `
    <section class="hero">
      <div>
        <h1>IT를 <em>눈으로</em> 보면<br>훨씬 쉬워집니다</h1>
        <p>인터넷 주소가 어떻게 서버를 찾는지, 로그인은 어떻게 유지되는지, 큰 서비스는 어떻게 버티는지.
        글로만 읽던 개념을 움직이는 그림으로 한 단계씩 따라가 보세요. 처음이라면 쉬운 설명으로, 현업이라면 기술 설명으로.</p>
        <div class="cta">
          <a class="btn main" href="#/t/${first.id}">${n ? '이어서 배우기' : '처음부터 시작하기'} →</a>
          <a class="btn" href="factory/">3D 공장 구경하기</a>
        </div>
      </div>
      <div class="hero-stage" aria-label="DNS 조회 미리보기 애니메이션"><svg id="hero-svg" role="img" aria-label="DNS 조회 과정 애니메이션"></svg></div>
    </section>
    <section class="howto" aria-label="사용법">
      <div><b>① 주제를 고르고</b><span>입문부터 고급까지 난이도별로 정리돼 있어요.</span></div>
      <div><b>② 재생하거나 한 단계씩</b><span>▶ 자동 재생, ◀ ▶ 로 앞뒤 단계를 오가며 다시 볼 수 있어요.</span></div>
      <div><b>③ 쉽게 / 자세히</b><span>비유 중심 설명과 실무 기술 설명을 바꿔 가며 읽어요.</span></div>
    </section>
    <section class="courses" aria-labelledby="ch">
      <div class="sec-h"><h2 id="ch">학습 코스</h2><p>목적에 맞춰 주제를 순서대로 묶었어요. 코스를 고르면 주제 화면 위에 "다음 주제"가 안내돼요.</p></div>
      <div class="course-grid">${COURSES.map((c) => {
        const ts = courseTopics(c), k = ts.filter((x) => done.has(x.id)).length;
        const nx = ts.find((x) => !done.has(x.id)) || ts[0];
        return `<article class="course${curCourse === c.id ? ' cur' : ''}" style="--cc:var(--${c.color})">
          <h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>
          <div class="cbar" role="img" aria-label="${ts.length}개 중 ${k}개 완료"><i style="width:${ts.length ? (k / ts.length) * 100 : 0}%"></i></div>
          <ol>${ts.map((x) => `<li class="${done.has(x.id) ? 'ok' : ''}"><a href="#/t/${x.id}" data-course="${c.id}">${esc(x.title.split(' — ')[0])}</a></li>`).join('')}</ol>
          <a class="btn${k < ts.length ? ' main' : ''}" href="#/t/${nx.id}" data-course="${c.id}">${k === 0 ? '코스 시작' : k < ts.length ? `이어서 (${k}/${ts.length})` : '✓ 완주 · 다시 보기'}</a>
        </article>`;
      }).join('')}</div>
    </section>
    <div class="sec-h"><h2>모든 주제</h2></div>
    <div class="filters" role="group" aria-label="난이도 거르기">
      <button class="chip" data-f="0" aria-pressed="${filter === 0}">전체</button>
      ${Object.entries(LEVELS).map(([k, v]) => `<button class="chip" data-f="${k}" aria-pressed="${filter === +k}" style="--lc:${lc(k)}"><i class="dot"></i>${v.name}</button>`).join('')}
      <input class="search" type="search" placeholder="주제 검색 (예: DNS, 캐시, 로그인)" aria-label="주제 검색" value="${esc(query)}">
    </div>
    <p class="progress-line">${n ? `${total}개 중 ${n}개 끝까지 봤어요.` : `모두 ${total}개 주제 · 위에서부터 순서대로 보면 자연스럽게 이어집니다.`}</p>
    <div id="lists"></div>
    <section class="factory" aria-labelledby="fh">
      <div>
        <h2 id="fh">3D 공장</h2>
        <p>시스템을 공장 라인처럼 계속 돌려 보는 3D 장면입니다. 장애를 일으키거나 속도를 바꾸며 직접 실험해 보세요.</p>
        <a class="btn main" href="factory/">공장 들어가기 →</a>
      </div>
      <div class="list">${FACTORY.map((f) => `<a href="factory/#${f.id}">${esc(f.name)}<span>${esc(f.d)}</span></a>`).join('')}</div>
    </section>`;

  const lists = app.querySelector('#lists');
  const draw = () => {
    const q = query.trim().toLowerCase();
    const hit = (t) => !q || [t.title, t.sub, t.cat, ...(t.terms || []).map((x) => x[0])].join(' ').toLowerCase().includes(q);
    let html = '';
    for (const [k, v] of Object.entries(LEVELS)) {
      if (filter && filter !== +k) continue;
      const items = TOPICS.filter((t) => t.level === +k && hit(t));
      if (!items.length) continue;
      html += `<section class="lvl" style="--lc:${lc(k)}"><div class="lvl-h"><h2>${v.name} <small>Lv.${k}</small></h2><p>${v.desc}</p></div><div class="grid">
        ${items.map((t) => `<a class="card" href="#/t/${t.id}">
          <div class="meta"><span class="n">${String(TOPICS.indexOf(t) + 1).padStart(2, '0')}</span><span>${esc(t.cat)}</span></div>
          <h3>${esc(t.title)}</h3><p>${esc(t.sub)}</p>
          <div class="foot"><span>${t.steps.length}단계${LAB_IDS.includes(t.id) ? ' · 🧪 실험' : ''}${t.factory ? ' · 3D' : ''}</span><span>${quizBest[t.id] != null && t.quiz?.length ? `<span class="qs">퀴즈 ${quizBest[t.id]}/${t.quiz.length}</span>` : ''}${done.has(t.id) ? '<span class="done">✓ 완료</span>' : ''}</span></div>
        </a>`).join('')}</div></section>`;
    }
    lists.innerHTML = html || '<p class="empty">찾는 주제가 없어요. 다른 단어로 검색해 보세요.</p>';
  };
  draw();
  app.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    filter = +b.dataset.f; store.set('filter', filter);
    app.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
    draw();
  }));
  app.querySelector('.search').addEventListener('input', (e) => { query = e.target.value; draw(); });
  app.querySelectorAll('[data-course]').forEach((a) => a.addEventListener('click', () => { curCourse = a.dataset.course; store.set('course', curCourse); }));

  // 미리보기: DNS 주제를 조용히 반복 재생
  const demo = TOPICS.find((t) => t.id === 'dns') || TOPICS[0];
  if (demo && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const hp = new Player(document.getElementById('hero-svg'), {
      onState() {
        if (!hp.auto && hp.ready && hp.step === demo.steps.length - 1) setTimeout(() => { if (heroPlayer === hp) { hp.load(demo); hp.play(); } }, 2500);
      },
    });
    heroPlayer = hp;
    hp.speed = 1.15;
    hp.load(demo);
    hp.play();
  } else if (demo) {
    const hp = new Player(document.getElementById('hero-svg'));
    heroPlayer = hp;
    hp.load(demo);
    hp.goto(demo.steps.length - 1, { animate: false });
  }
}

/* ---------- 주제 화면 ---------- */
function renderTopic(t, startStep = 0) {
  const idx = TOPICS.indexOf(t), lv = LEVELS[t.level];
  const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  let mode = store.get('mode', 'easy');
  const speeds = [0.5, 1, 1.5, 2];
  let speed = store.get('speed', 1);
  document.title = `${t.title} — 움직이는 IT`;

  app.innerHTML = `
    ${courseBar(t)}
    <div class="crumb" style="--lc:${lc(t.level)}"><a href="#/">주제</a><span>›</span><span class="pill">${lv.name}</span><span>${esc(t.cat)}</span></div>
    <div class="t-head"><h1>${esc(t.title)}</h1><p>${esc(t.sub)}</p></div>
    ${modeTabs(t, 'steps')}
    <div class="learn">
      <div>
        <div class="stagebox">
          <div class="stagewrap">
            <svg id="stage" role="img" aria-label="${esc(t.title)} 애니메이션"></svg>
            <div class="stepno" id="stepno"></div>
            <div class="cap" id="cap" aria-live="polite"></div>
          </div>
          <div class="bigtext" id="bigtext" aria-hidden="true"></div>
          <div class="dotsbar" id="dots">${t.steps.map((s, i) => `<button type="button" aria-label="${i + 1}단계: ${esc(s.t)}"></button>`).join('')}</div>
          <div class="ctrl">
            <button type="button" id="b-first" aria-label="처음 단계" title="처음 단계">${ICON.first}</button>
            <button type="button" id="b-prev" aria-label="이전 단계" title="이전 단계 (←)">${ICON.prev}</button>
            <button type="button" id="b-play" class="play"></button>
            <button type="button" id="b-next" aria-label="다음 단계" title="다음 단계 (→)">${ICON.next}<span class="lbl">다음</span></button>
            <button type="button" id="b-replay" aria-label="이 단계 다시" title="이 단계 다시 (R)">${ICON.replay}</button>
            <button type="button" id="b-big" aria-label="크게 보기" title="크게 보기 (F)" aria-pressed="false">${ICON.big}<span class="lbl">크게</span></button>
            <div class="sp"><span class="seg" role="group" aria-label="재생 속도">${speeds.map((s) => `<button type="button" data-sp="${s}" aria-pressed="${s === speed}">${s}×</button>`).join('')}</span></div>
          </div>
        </div>
        <section class="explain" aria-live="polite">
          <div class="h"><span class="k" id="ex-k"></span><b id="ex-t"></b>
            <button type="button" class="linkbtn" id="b-link" title="이 단계 링크 복사">🔗 <span>링크</span></button>
            <span class="seg" role="group" aria-label="설명 수준">
              <button type="button" data-mode="easy" aria-pressed="${mode === 'easy'}">쉽게</button>
              <button type="button" data-mode="deep" aria-pressed="${mode === 'deep'}">자세히</button>
            </span></div>
          <p id="ex-easy"></p>
          <div class="deep" id="ex-deep" hidden></div>
          <a class="toquiz" id="ex-quiz" href="#quiz" hidden>다 봤다면 퀴즈 ${t.quiz?.length || 0}문제로 확인해 보세요 ↓</a>
        </section>
        <p class="kbd"><kbd>Space</kbd> 재생/멈춤 · <kbd>←</kbd> <kbd>→</kbd> 단계 이동 · <kbd>R</kbd> 다시 보기 · <kbd>F</kbd> 크게 보기</p>
      </div>
      <aside class="rail" aria-label="단계 목록">
        <h3>단계 ${t.steps.length}개</h3>
        <ol>${t.steps.map((s, i) => `<li><button type="button" data-i="${i}"><span class="i">${i + 1}</span><span>${esc(s.t)}</span></button></li>`).join('')}</ol>
      </aside>
    </div>
    ${t.quiz?.length ? `<section class="quiz" id="quiz" aria-labelledby="qh"><h2 id="qh">🧩 이해했는지 확인해 볼까요?</h2><div id="quiz-body"></div></section>` : ''}
    <div class="more">
      <div class="box analogy"><h3>💡 한 줄 비유</h3><p>${esc(t.analogy)}</p></div>
      <div class="box"><h3>📌 핵심 정리</h3><ul>${t.keys.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
      <div class="box"><h3>📖 용어 사전</h3><dl>${(t.terms || []).map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></div>
      ${t.factory ? `<div class="box factory-link"><div><h3>🏭 3D 공장에서 직접 돌려 보기</h3><p>같은 개념을 계속 돌아가는 3D 장면으로 보고, 장애·속도를 바꿔 실험할 수 있어요.</p></div><a class="btn main" href="factory/#${t.factory}">3D로 보기 →</a></div>` : ''}
    </div>
    <nav class="pager" aria-label="다른 주제">
      ${prev ? `<a href="#/t/${prev.id}"><span>← 이전 주제</span><b>${esc(prev.title)}</b></a>` : ''}
      ${next ? `<a class="nx" href="#/t/${next.id}"><span>다음 주제 →</span><b>${esc(next.title)}</b></a>` : ''}
    </nav>`;
  window.scrollTo(0, 0);

  const $ = (s) => app.querySelector(s);
  const dots = [...$('#dots').children];
  const railItems = [...app.querySelectorAll('.rail li')];
  const playBtn = $('#b-play');
  let capTimer;

  const showText = (n) => {
    const s = t.steps[n];
    $('#ex-k').textContent = `${n + 1} / ${t.steps.length}`;
    $('#ex-t').textContent = s.t;
    $('#ex-easy').textContent = s.easy;
    const deep = $('#ex-deep');
    deep.textContent = s.deep || '';
    deep.hidden = mode !== 'deep' || !s.deep;
    $('#ex-quiz').hidden = !(t.quiz?.length && n === t.steps.length - 1);
    $('#bigtext').innerHTML = `<b>${n + 1}. ${esc(s.t)}</b> ${esc(mode === 'deep' && s.deep ? s.deep : s.easy)}`;
  };

  const p = new Player($('#stage'), {
    onStep(n) {
      try { history.replaceState(null, '', `#/t/${t.id}${n ? '/' + (n + 1) : ''}`); } catch { /* 무시 */ }
      showText(n);
      $('#stepno').textContent = `STEP ${n + 1}/${t.steps.length}`;
      dots.forEach((d, i) => { d.classList.toggle('on', i === n); d.classList.toggle('done', i < n); });
      railItems.forEach((li, i) => { li.classList.toggle('on', i === n); li.classList.toggle('done', i < n); });
      railItems[n]?.querySelector('button').scrollIntoView({ block: 'nearest' });
    },
    onState() {
      const playing = p.auto && !p.paused;
      playBtn.innerHTML = playing ? `${ICON.pause}<span class="lbl">멈춤</span>` : `${ICON.play}<span class="lbl">${p.paused ? '계속' : '재생'}</span>`;
      playBtn.setAttribute('aria-label', playing ? '멈춤' : '재생');
      $('#b-prev').disabled = p.step <= 0;
      $('#b-first').disabled = p.step <= 0 && !p.started;
      if (p.ready && p.started && p.step === t.steps.length - 1) markDone(t.id);
    },
    onCaption(c) {
      const el = $('#cap');
      if (!el) return;
      el.textContent = c;
      el.classList.toggle('on', !!c);
      clearTimeout(capTimer);
      if (c) capTimer = setTimeout(() => el.classList.remove('on'), 3200 / p.speed);
    },
  });
  player = p;
  p.speed = speed;
  p.load(t);
  if (startStep > 1) p.goto(Math.min(startStep, t.steps.length) - 1, { animate: false });

  $('#b-link').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + `#/t/${t.id}/${p.step + 1}`;
    const lab = $('#b-link span');
    try { await navigator.clipboard.writeText(url); lab.textContent = '복사됨'; }
    catch { prompt('이 주소를 복사하세요', url); }
    setTimeout(() => { lab.textContent = '링크'; }, 1600);
  });
  $('.coursebar .x')?.addEventListener('click', () => { curCourse = null; store.set('course', null); $('.coursebar').remove(); });

  const togglePlay = () => {
    if (p.paused) { p.paused = false; p.auto = true; p.onState(); if (p.ready && !p.running) p.play(); return; }
    if (p.auto) { p.pause(); if (p.running) p.togglePause(); return; }
    p.play();
  };
  const manual = (fn) => () => { p.auto = false; p.paused = false; fn(); p.onState(); };
  playBtn.addEventListener('click', togglePlay);
  $('#b-next').addEventListener('click', manual(() => p.next()));
  $('#b-prev').addEventListener('click', manual(() => p.prev()));
  $('#b-first').addEventListener('click', manual(() => p.load(t)));
  $('#b-replay').addEventListener('click', manual(() => (p.started ? p.replay() : p.next())));
  dots.forEach((d, i) => d.addEventListener('click', manual(() => p.goto(i))));
  railItems.forEach((li, i) => li.querySelector('button').addEventListener('click', manual(() => p.goto(i))));
  const box = $('.stagebox');
  const setBig = (on) => {
    box.classList.toggle('big', on);
    document.body.classList.toggle('noscroll', on);
    $('#b-big').setAttribute('aria-pressed', on);
    $('#b-big').setAttribute('aria-label', on ? '작게 보기' : '크게 보기');
    $('#b-big .lbl').textContent = on ? '닫기' : '크게';
  };
  $('#b-big').addEventListener('click', () => setBig(!box.classList.contains('big')));
  app.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => {
    speed = +b.dataset.sp; p.speed = speed; store.set('speed', speed);
    app.querySelectorAll('[data-sp]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode; store.set('mode', mode);
    app.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    showText(p.step);
  }));

  if (t.quiz?.length) {
    $('#ex-quiz').addEventListener('click', (e) => { e.preventDefault(); $('#quiz').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    renderQuiz($('#quiz-body'), t, (step) => {
      p.auto = false; p.paused = false; p.goto(step); p.onState();
      $('.stagebox').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const onKey = (e) => {
    if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' && !e.target.closest('button, a')) { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); manual(() => p.next())(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); manual(() => p.prev())(); }
    else if (e.key === 'Escape' && box.classList.contains('big')) setBig(false);
    else if (e.key === 'f' || e.key === 'F') setBig(!box.classList.contains('big'));
    else if (e.key === 'r' || e.key === 'R') manual(() => (p.started ? p.replay() : p.next()))();
  };
  document.addEventListener('keydown', onKey);
  offKeys = () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('noscroll'); };
}

/* ---------- 직접 실험 ---------- */
function modeTabs(t, cur) {
  if (!LAB_IDS.includes(t.id)) return '';
  return `<nav class="modetabs" aria-label="보기 방식">
    <a href="#/t/${t.id}" ${cur === 'steps' ? 'aria-current="page"' : ''}>▶ 단계별 보기</a>
    <a href="#/t/${t.id}/lab" ${cur === 'lab' ? 'aria-current="page"' : ''}>🧪 직접 실험</a></nav>`;
}

async function renderLab(t) {
  const lv = LEVELS[t.level];
  document.title = `직접 실험: ${t.title} — 움직이는 IT`;
  app.innerHTML = `
    <div class="crumb" style="--lc:${lc(t.level)}"><a href="#/">주제</a><span>›</span><span class="pill">${lv.name}</span><span>${esc(t.cat)}</span></div>
    <div class="t-head"><h1>${esc(t.title)}</h1><p>${esc(t.sub)}</p></div>
    ${modeTabs(t, 'lab')}
    <p class="empty">실험실 준비 중…</p>`;
  window.scrollTo(0, 0);
  let lab;
  try { lab = await loadLab(t.id); } catch (err) { console.error('[lab]', err); app.querySelector('.empty').textContent = '실험실을 불러오지 못했어요.'; return; }
  if (!location.hash.startsWith(`#/t/${t.id}/lab`)) return; // 그새 다른 화면으로 감
  const doneTasks = new Set(store.get('labtasks', {})[t.id] || []);
  const speeds = [0.5, 1, 1.5, 2];
  let speed = store.get('speed', 1);
  const ctl = (c, i) => {
    if (c.type === 'radio') return `<div class="lc"><span class="ll">${esc(c.label)}</span><span class="seg" role="group" aria-label="${esc(c.label)}">${c.options.map(([v, l]) => `<button type="button" data-c="${i}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</span></div>`;
    if (c.type === 'toggle') return `<button type="button" class="tgl" data-c="${i}" aria-pressed="false"><i></i>${esc(c.label)}</button>`;
    if (c.type === 'range') return `<label class="lc rng"><span class="ll">${esc(c.label)} <b data-val="${i}"></b></span><input type="range" data-c="${i}" min="${c.min}" max="${c.max}" step="${c.step || 1}"></label>`;
    return `<button type="button" class="btn act" data-c="${i}">${esc(c.label)}</button>`;
  };
  app.querySelector('.empty').outerHTML = `
    <div class="learn lab">
      <div>
        <div class="stagebox">
          <div class="stagewrap">
            <svg id="stage" role="img" aria-label="${esc(lab.title)}"></svg>
            <div class="stepno">LIVE</div>
            <div class="cap" id="cap" aria-live="polite"></div>
          </div>
          <div class="labctl">${lab.controls.map(ctl).join('')}</div>
          <div class="ctrl">
            <button type="button" id="l-pause" class="play"></button>
            <button type="button" id="l-reset" title="처음 상태로">${ICON.replay}<span class="lbl">처음부터</span></button>
            <button type="button" id="b-big" aria-label="크게 보기" title="크게 보기 (F)" aria-pressed="false">${ICON.big}<span class="lbl">크게</span></button>
            <div class="sp"><span class="seg" role="group" aria-label="재생 속도">${speeds.map((x) => `<button type="button" data-sp="${x}" aria-pressed="${x === speed}">${x}×</button>`).join('')}</span></div>
          </div>
        </div>
        <section class="explain"><div class="h"><b>${esc(lab.title)}</b></div><p>${esc(lab.intro)}</p></section>
      </div>
      <aside class="rail labside" aria-label="실험 결과">
        <h3>실시간 숫자</h3><div class="stats" id="stats"></div>
        <h3>도전 과제</h3><ol class="tasks" id="tasks">${lab.tasks.map((x, i) => `<li data-i="${i}" class="${doneTasks.has(i) ? 'ok' : ''}"><span class="i">${doneTasks.has(i) ? '✓' : i + 1}</span><span>${esc(x.t)}</span></li>`).join('')}</ol>
        <p class="lhint">스위치·슬라이더를 바꾸면 바로 반영돼요. 과제를 달성하면 자동으로 체크됩니다.</p>
      </aside>
    </div>
    <div class="toast" id="toast" role="status"></div>`;

  const $ = (q) => app.querySelector(q);
  const p = new Player($('#stage'), {
    onCaption(c) { const el = $('#cap'); if (!el) return; el.textContent = c; el.classList.toggle('on', !!c); },
  });
  player = p;
  p.speed = speed;
  let s, a;
  const start = () => {
    s = lab.init();
    a = p.lab();
    lab.setup(a, s);
    syncCtl();
    window.__lab = { s, lab, player: p }; // 점검용
  };
  const syncCtl = () => {
    app.querySelectorAll('.labctl [data-c]').forEach((el) => {
      const c = lab.controls[+el.dataset.c];
      if (c.type === 'radio') el.setAttribute('aria-pressed', String(s[c.key]) === el.dataset.v);
      else if (c.type === 'toggle') el.setAttribute('aria-pressed', !!s[c.key]);
      else if (c.type === 'range') { el.value = s[c.key]; $(`[data-val="${el.dataset.c}"]`).textContent = s[c.key] + (c.unit || ''); }
    });
  };
  const changed = (key) => { lab.onChange?.(key, s, a); syncCtl(); };
  app.querySelectorAll('.labctl [data-c]').forEach((el) => {
    const c = lab.controls[+el.dataset.c];
    if (c.type === 'range') el.addEventListener('input', () => { s[c.key] = +el.value; changed(c.key); });
    else el.addEventListener('click', () => {
      if (c.type === 'radio') { const v = c.options.find(([x]) => String(x) === el.dataset.v)[0]; s[c.key] = v; changed(c.key); }
      else if (c.type === 'toggle') { s[c.key] = !s[c.key]; changed(c.key); }
      else c.run(s, a);
    });
  });
  const pauseBtn = $('#l-pause');
  const drawPause = () => { pauseBtn.innerHTML = p.paused ? `${ICON.play}<span class="lbl">계속</span>` : `${ICON.pause}<span class="lbl">멈춤</span>`; };
  pauseBtn.addEventListener('click', () => { p.paused = !p.paused; drawPause(); });
  $('#l-reset').addEventListener('click', () => { p.paused = false; drawPause(); start(); });
  app.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => {
    speed = +b.dataset.sp; p.speed = speed; store.set('speed', speed);
    app.querySelectorAll('[data-sp]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  const box = $('.stagebox');
  const setBig = (on) => { box.classList.toggle('big', on); document.body.classList.toggle('noscroll', on); $('#b-big').setAttribute('aria-pressed', on); $('#b-big .lbl').textContent = on ? '닫기' : '크게'; };
  $('#b-big').addEventListener('click', () => setBig(!box.classList.contains('big')));

  // 숫자와 도전 과제는 0.25초마다 갱신
  let toastTimer;
  const tick = () => {
    if (!s) return;
    let rows = [];
    try { rows = lab.stats(s); } catch (err) { console.error('[lab stats]', err); }
    $('#stats').innerHTML = rows.map(([k, v, c]) => `<div class="st${c ? ' c-' + c : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    lab.tasks.forEach((x, i) => {
      if (doneTasks.has(i)) return;
      let ok = false;
      try { ok = !!x.check(s); } catch { /* 무시 */ }
      if (!ok) return;
      doneTasks.add(i);
      const all = store.get('labtasks', {}); all[t.id] = [...doneTasks]; store.set('labtasks', all);
      const li = $(`#tasks li[data-i="${i}"]`); li.classList.add('ok', 'pop'); li.querySelector('.i').textContent = '✓';
      const toast = $('#toast'); toast.textContent = `🎉 도전 과제 달성: ${x.t}`; toast.classList.add('on');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 3200);
    });
  };
  const iv = setInterval(tick, 250);
  const onKey = (e) => {
    if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' && !e.target.closest('button, a')) { e.preventDefault(); pauseBtn.click(); }
    else if (e.key === 'Escape' && box.classList.contains('big')) setBig(false);
    else if (e.key === 'f' || e.key === 'F') setBig(!box.classList.contains('big'));
  };
  document.addEventListener('keydown', onKey);
  offKeys = () => { clearInterval(iv); clearTimeout(toastTimer); document.removeEventListener('keydown', onKey); document.body.classList.remove('noscroll'); };
  drawPause();
  start();
  tick();
}

/* ---------- 코스 띠 ---------- */
function courseBar(t) {
  const c = COURSES.find((x) => x.id === curCourse);
  if (!c) return '';
  const ts = courseTopics(c), i = ts.indexOf(t);
  if (i < 0) return '';
  const nx = ts[i + 1];
  return `<div class="coursebar" style="--cc:var(--${c.color})"><span class="cn">${esc(c.name)}</span>
    <span class="cp">${i + 1} / ${ts.length}</span>
    <span class="cd">${ts.map((x, j) => `<a href="#/t/${x.id}" class="${j === i ? 'on' : done.has(x.id) ? 'ok' : ''}" title="${esc(x.title)}" aria-label="${j + 1}. ${esc(x.title)}"></a>`).join('')}</span>
    ${nx ? `<a class="cnx" href="#/t/${nx.id}">다음: ${esc(nx.title.split(' — ')[0])} →</a>` : '<span class="cnx">코스 마지막 주제예요 🎉</span>'}
    <button type="button" class="x" aria-label="코스 안내 끄기" title="코스 안내 끄기">✕</button></div>`;
}

/* ---------- 용어 사전 ---------- */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const SIMPLE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
function initial(w) {
  const ch = w.trim()[0] || '#', code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) { const c = CHO[Math.floor((code - 0xac00) / 588)]; return SIMPLE[c] || c; }
  if (/[a-z]/i.test(ch)) return 'A–Z';
  return '#';
}
function renderTerms() {
  document.title = '용어 사전 — 움직이는 IT';
  const map = new Map();
  for (const t of TOPICS) for (const [w, d] of t.terms || []) {
    const k = w.trim().toLowerCase();
    if (!map.has(k)) map.set(k, { w: w.trim(), items: [] });
    map.get(k).items.push({ d, t });
  }
  const all = [...map.values()].sort((a, b) => a.w.localeCompare(b.w, 'ko'));
  const order = ['A–Z', ...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ', '#'];
  app.innerHTML = `
    <div class="crumb"><a href="#/">주제</a><span>›</span><span>용어 사전</span></div>
    <div class="t-head"><h1>용어 사전</h1><p>${TOPICS.length}개 주제에 나온 용어 ${all.length}개. 용어를 누르면 그 용어가 나오는 주제로 갈 수 있어요.</p></div>
    <input class="search wide" type="search" id="tq" placeholder="용어나 설명으로 찾기 (예: TTL, 해시, 리더)" aria-label="용어 검색" autofocus>
    <nav class="jump" id="jump" aria-label="첫 글자로 이동"></nav>
    <div id="terms"></div>`;
  const box = app.querySelector('#terms'), jump = app.querySelector('#jump');
  const draw = (q) => {
    q = q.trim().toLowerCase();
    const hit = all.filter((e) => !q || e.w.toLowerCase().includes(q) || e.items.some((x) => x.d.toLowerCase().includes(q)));
    const groups = new Map(order.map((g) => [g, []]));
    hit.forEach((e) => groups.get(initial(e.w))?.push(e));
    const used = order.filter((g) => groups.get(g).length);
    jump.innerHTML = used.map((g, i) => `<a href="#tg-${i}" data-g="${i}">${g}</a>`).join('');
    box.innerHTML = used.map((g, i) => `<section class="tgroup" id="tg-${i}"><h2>${g}</h2><dl>${groups.get(g).map((e) => `
      <div class="term"><dt>${esc(e.w)}</dt>${e.items.map((x) => `<dd>${esc(x.d)} <a class="tlink" href="#/t/${x.t.id}" style="--lc:${lc(x.t.level)}">${esc(x.t.title.split(' — ')[0])}</a></dd>`).join('')}</div>`).join('')}</dl></section>`).join('')
      || '<p class="empty">찾는 용어가 없어요.</p>';
    jump.querySelectorAll('a').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); app.querySelector('#tg-' + a.dataset.g).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  };
  draw('');
  app.querySelector('#tq').addEventListener('input', (e) => draw(e.target.value));
  window.scrollTo(0, 0);
}

/* ---------- 퀴즈 ---------- */
function renderQuiz(root, t, goStep) {
  const qs = t.quiz;
  let i = 0, score = 0;
  const L = 'ABCD';
  const draw = () => {
    if (i >= qs.length) {
      const best = Math.max(score, quizBest[t.id] ?? 0);
      quizBest[t.id] = best;
      store.set('quiz', quizBest);
      const msg = score === qs.length ? '모두 맞혔어요! 이 주제는 확실히 이해했네요 🎉' : score ? '좋아요. 틀린 문제는 해당 단계를 다시 보면 금방 이해돼요.' : '괜찮아요. 그림을 한 번 더 보고 다시 풀어 보세요.';
      root.innerHTML = `<div class="q-end"><b>${qs.length}문제 중 ${score}개 정답</b><p>${msg}</p><button type="button" class="btn" id="q-again">다시 풀기</button></div>`;
      root.querySelector('#q-again').addEventListener('click', () => { i = 0; score = 0; draw(); });
      return;
    }
    const q = qs[i];
    root.innerHTML = `
      <div class="q-n">문제 ${i + 1} / ${qs.length}</div>
      <p class="q-q">${esc(q.q)}</p>
      <div class="q-c" role="group" aria-label="보기">${q.c.map((c, k) => `<button type="button" data-k="${k}"><span class="l">${L[k]}</span><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="q-fb" aria-live="polite"></div>`;
    const btns = [...root.querySelectorAll('.q-c button')];
    btns.forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.k, ok = k === q.a;
      if (ok) score++;
      btns.forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add('ok'); else if (j === k) x.classList.add('no'); });
      const fb = root.querySelector('.q-fb');
      fb.innerHTML = `<p class="${ok ? 'ok' : 'no'}"><b>${ok ? '정답이에요!' : '아쉬워요.'}</b> ${esc(q.why)}</p>
        <div class="q-act">${!ok && q.step != null && t.steps[q.step] ? `<button type="button" class="btn" id="q-step">${q.step + 1}단계 다시 보기</button>` : ''}
        <button type="button" class="btn main" id="q-next">${i + 1 < qs.length ? '다음 문제 →' : '결과 보기'}</button></div>`;
      fb.querySelector('#q-step')?.addEventListener('click', () => goStep(q.step));
      fb.querySelector('#q-next').addEventListener('click', () => { i++; draw(); root.querySelector('.q-c button, .btn')?.focus({ preventScroll: true }); });
    }));
  };
  draw();
}

/* ---------- 시작 ---------- */
TOPICS = await loadTopics();
if (!TOPICS.length) app.innerHTML = '<p class="empty">주제를 불러오지 못했어요. 새로고침해 주세요.</p>';
else {
  addEventListener('hashchange', () => { route(); app.focus({ preventScroll: true }); });
  route();
}

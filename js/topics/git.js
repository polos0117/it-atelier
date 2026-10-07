// Git: 작업 폴더 → 스테이징 → 커밋, 브랜치·HEAD·병합·충돌, push/pull
const LANE = { remote: 70, main: 170, feature: 260 };
const WORK = [132, 378], STAGE = [360, 378], REPO = [588, 378];
const TAG_DY = 36; // 커밋 원과 브랜치 이름표 사이 거리

function cmd(a, s) { a.setText('cmd', s ? '$ ' + s : ''); }

/** 커밋 원 + 부모와 잇는 선 (setup에서 숨김 상태로 만든다) */
function commitNode(a, id, x, lane, hash, parents = [], color = 'blue') {
  a.node(id, x, LANE[lane], { shape: 'circle', w: 42, label: hash, size: 11.5, color, hidden: true });
  parents.forEach((p) => a.edge(p, id, { id: `e-${p}-${id}`, arrow: false, hidden: true }));
}
async function reveal(a, id, parents = []) {
  await a.par(a.show(id, 300), ...parents.map((p) => a.show(`e-${p}-${id}`, 300)));
}
/** 파일 하나를 add → commit 해서 커밋 원으로 만든다 */
async function commitFlow(a, file, msg, id, parents, quick = false) {
  const n = a.get(id);
  const p = a.packet(file, { at: WORK, color: 'gray' });
  cmd(a, `git add ${file.replace(' ✎', '')}`);
  await a.move(p, STAGE, quick ? 450 : 650);
  p.set(null, 'amber');
  cmd(a, `git commit -m "${msg}"`);
  await a.move(p, [n.x, n.y], quick ? 600 : 800);
  await a.par(a.fadeOut(p, 200), reveal(a, id, parents));
}
/** 브랜치 이름표(와 HEAD)를 커밋 위치로 옮긴다 */
function tagPos(a, branch, commitId) {
  const n = a.get(commitId);
  return branch === 'feature' ? [n.x, n.y + TAG_DY] : [n.x, n.y - TAG_DY];
}
async function moveTag(a, branch, commitId, withHead) {
  const [x, y] = tagPos(a, branch, commitId);
  const hy = branch === 'feature' ? y + 23 : y - 23;
  await a.par(a.move('t-' + branch, [x, y], 400), withHead ? a.move('t-head', [x, hy], 400) : Promise.resolve());
}

export default {
  id: 'git',
  level: 3,
  cat: '개발 도구',
  title: 'Git — 시간 여행하는 저장 버튼',
  sub: '코드의 모든 순간을 저장하고, 갈래를 나눠 실험하고, 다시 합치는 도구',
  analogy: 'Git은 게임의 세이브 포인트와 같습니다. 원하는 순간마다 저장(커밋)해 두면 언제든 그 시점으로 돌아갈 수 있고, "만약 이 길로 가면?" 하고 다른 세이브 파일(브랜치)을 만들어 실험한 뒤, 잘되면 원래 이야기와 합칠 수 있습니다.',
  keys: [
    '파일을 고친 뒤 git add로 스테이징에 담고, git commit으로 그 순간을 저장소에 기록한다.',
    '커밋은 전체 스냅샷 + 부모 커밋 + 메시지이며, 내용으로 만든 해시(a1f3…)로 구분된다.',
    '브랜치는 특정 커밋을 가리키는 이름표일 뿐이고, HEAD는 "지금 내가 있는 곳"을 가리킨다.',
    'merge는 두 갈래를 합쳐 부모가 둘인 병합 커밋을 만든다. 같은 줄을 서로 다르게 고쳤다면 충돌을 직접 해결해야 한다.',
    'push는 내 커밋을 원격 저장소(GitHub)로 올리고, pull은 남이 올린 커밋을 가져와 합친다.',
  ],
  terms: [
    ['커밋', '프로젝트 전체의 한 순간을 저장한 기록. 고유한 해시 ID를 가진다'],
    ['스테이징', '다음 커밋에 넣을 변경을 골라 담아 두는 대기 공간 (index)'],
    ['브랜치', '커밋 하나를 가리키는 움직이는 이름표. 새 커밋을 하면 따라 앞으로 간다'],
    ['HEAD', '지금 체크아웃된 브랜치(또는 커밋)를 가리키는 포인터'],
    ['병합 커밋', '부모가 2개인 커밋. 두 갈래의 변경을 하나로 합친 결과'],
    ['충돌', '두 갈래에서 같은 파일의 같은 부분을 다르게 고쳐 Git이 자동으로 합칠 수 없는 상태'],
    ['origin', '원격 저장소의 기본 이름. 보통 GitHub 같은 서버에 있다'],
  ],
  setup(a) {
    a.text(360, 18, '', { id: 'cmd', size: 13.5, weight: 700, mono: true, layer: 'edge', cls: 'tc-amber' });
    a.zone('z-work', 24, 336, 216, 90, { label: '① 작업 폴더', color: 'gray' });
    a.zone('z-stage', 252, 336, 216, 90, { label: '② 스테이징', color: 'amber' });
    a.zone('z-repo', 480, 336, 216, 90, { label: '③ 저장소 (.git)', color: 'blue' });
    a.text(WORK[0], 412, '파일을 고치는 곳', { size: 11, cls: 'muted', layer: 'edge' });
    a.text(STAGE[0], 412, 'git add로 담기', { size: 11, cls: 'muted', layer: 'edge' });
    a.text(REPO[0], 412, 'git commit = 위 그래프에 기록', { size: 11, cls: 'muted', layer: 'edge' });
    a.zone('z-remote', 24, 30, 672, 70, { label: 'GitHub (origin)', color: 'teal', hidden: true });

    commitNode(a, 'c1', 80, 'main', 'a1f3');
    commitNode(a, 'c2', 160, 'main', '9c2e', ['c1']);
    commitNode(a, 'f1', 240, 'feature', '3b7d', ['c2'], 'violet');
    commitNode(a, 'f2', 320, 'feature', 'e04a', ['f1'], 'violet');
    commitNode(a, 'm3', 280, 'main', '5d21', ['c2']);
    commitNode(a, 'mg', 430, 'main', 'c8f0', ['m3', 'f2'], 'green');
    commitNode(a, 'pl', 530, 'main', 'b6e9', ['mg']);
    for (const [id, x, h] of [['c1', 80, 'a1f3'], ['c2', 160, '9c2e'], ['f1', 240, '3b7d'], ['m3', 280, '5d21'], ['f2', 320, 'e04a'], ['mg', 430, 'c8f0'], ['pl', 530, 'b6e9']]) {
      a.node('r-' + id, x, LANE.remote, { shape: 'circle', w: 34, label: h, size: 10, color: 'teal', hidden: true });
    }
    a.packet('main', { id: 't-main', layer: 'node', color: 'blue', h: 20, size: 11, at: [80, LANE.main - TAG_DY], hidden: true });
    a.packet('feature', { id: 't-feature', layer: 'node', color: 'violet', h: 20, size: 11, at: [160, LANE.main + TAG_DY], hidden: true });
    a.packet('HEAD', { id: 't-head', layer: 'node', color: 'amber', h: 20, size: 11, at: [80, LANE.main - TAG_DY - 23], hidden: true });
    a.packet('origin/main', { id: 't-origin', layer: 'node', color: 'teal', h: 20, size: 11, at: [508, LANE.remote], hidden: true });
  },
  steps: [
    {
      t: '저장의 3단계 — 고치고, 담고, 기록하기',
      easy: '파일을 고친 다음 바로 저장되는 게 아닙니다. "이번에 저장할 것"을 장바구니(스테이징)에 담고(add), 메시지를 붙여 기록(commit)합니다. 기록된 순간은 동그라미 하나가 돼요.',
      deep: '작업 트리(working tree)의 변경을 git add가 인덱스(스테이징)에 올리고, git commit이 인덱스 내용을 트리 객체로 만들어 커밋 객체와 함께 .git/objects에 저장합니다. 스테이징 덕분에 고친 것 중 일부만 골라 의미 있는 단위로 커밋할 수 있습니다.',
      async run(a) {
        a.caption('login.js를 고쳤다 → 담고 → 기록');
        await commitFlow(a, 'login.js ✎', '로그인', 'c1', []);
        await a.par(a.show('t-main'), a.show('t-head'));
        await a.flash('c1');
        a.note('n-first', 300, 170, '첫 세이브 포인트 a1f3 ✓', { color: 'blue' });
        await a.wait(500);
      },
    },
    {
      t: '커밋이 쌓인다 — 해시로 구분되는 스냅샷',
      easy: '또 고치고 또 저장하면 동그라미가 하나씩 늘어납니다. 각 동그라미에는 "9c2e" 같은 고유 번호가 붙고, 바로 앞 동그라미를 기억해서 줄줄이 이어져요. main 이름표는 늘 가장 최신 동그라미를 가리킵니다.',
      deep: '커밋 ID는 내용(트리·부모·작성자·메시지)의 SHA-1(또는 SHA-256) 해시라서 내용이 같으면 ID도 같고, 조금이라도 바뀌면 완전히 달라집니다. 화면의 a1f3은 앞 4자리 축약입니다. 브랜치(main)는 .git/refs/heads/main 파일에 적힌 커밋 ID 하나일 뿐입니다.',
      async run(a) {
        a.clear();
        await commitFlow(a, 'style.css ✎', '디자인', 'c2', ['c1']);
        await moveTag(a, 'main', 'c2', true);
        a.note('n-snap', 540, 180, '커밋 = 스냅샷 + 부모 + 메시지\n이름은 해시 9c2e', { color: 'blue' });
        await a.wait(700);
      },
    },
    {
      t: '브랜치 — 갈래를 나눠 실험하기',
      easy: '새 기능을 만들어 보고 싶지만 원래 코드는 건드리고 싶지 않을 때, "feature"라는 새 이름표를 만들고 그쪽으로 옮겨 갑니다. 이제 새 저장은 아래 갈래에 쌓여요.',
      deep: 'git switch -c feature(= git checkout -b)는 현재 커밋(9c2e)을 가리키는 새 ref를 만들고 HEAD를 refs/heads/feature로 바꿉니다. 브랜치 생성은 파일 복사가 아니라 41바이트짜리 포인터 생성이라 즉시 끝납니다. 이후 커밋은 feature만 앞으로 옮깁니다.',
      async run(a) {
        a.clear();
        cmd(a, 'git switch -c feature');
        await a.show('t-feature');
        await a.move('t-head', [160, LANE.main + TAG_DY + 23], 500);
        await a.wait(300);
        await commitFlow(a, 'pay.js ✎', '결제 시작', 'f1', ['c2'], true);
        await moveTag(a, 'feature', 'f1', true);
        await commitFlow(a, 'pay.js ✎', '결제 완료', 'f2', ['f1'], true);
        await moveTag(a, 'feature', 'f2', true);
      },
    },
    {
      t: 'HEAD 전환 — main으로 돌아가 다른 작업',
      easy: 'main으로 돌아가면 작업 폴더의 파일들도 main 시점으로 바뀝니다. 결제 기능은 잠시 안 보여요. 여기서 급한 버그를 고쳐 저장하면, 두 갈래가 서로 다른 길로 나아갑니다.',
      deep: 'git switch main은 HEAD를 main으로 옮기고 작업 트리를 9c2e 스냅샷으로 바꿉니다(커밋 안 한 변경이 충돌하면 거부되거나 git stash가 필요). 이 상태에서 커밋하면 main과 feature가 갈라진(diverged) 히스토리가 됩니다.',
      async run(a) {
        a.clear();
        cmd(a, 'git switch main');
        await a.move('t-head', [160, LANE.main - TAG_DY - 23], 600);
        a.packet('pay.js 안 보임', { at: WORK, color: 'gray', layer: 'top' });
        await a.wait(600);
        a.clear();
        await commitFlow(a, 'bug.js ✎', '버그 수정', 'm3', ['c2'], true);
        await moveTag(a, 'main', 'm3', true);
        a.note('n-div', 560, 230, '두 갈래가 따로 자람\nmain ↔ feature', { color: 'violet' });
        await a.wait(600);
      },
    },
    {
      t: '병합 시도 — 같은 줄을 둘 다 고쳤다!',
      easy: '이제 feature를 main에 합칩니다. 대부분은 Git이 알아서 합치지만, 두 갈래에서 같은 파일의 같은 줄을 서로 다르게 고쳤다면 어느 쪽이 맞는지 Git도 모릅니다. 이게 충돌이에요.',
      deep: 'git merge feature는 공통 조상(9c2e)·main(5d21)·feature(e04a)를 비교하는 3-way merge를 합니다. 한쪽만 바꾼 부분은 자동 반영되고, 양쪽이 같은 hunk를 다르게 바꾸면 CONFLICT로 멈추고 파일에 <<<<<<< ======= >>>>>>> 표시를 남깁니다.',
      async run(a) {
        a.clear();
        a.remove('n-div');
        cmd(a, 'git merge feature');
        const q = a.node('q', 430, LANE.main, { shape: 'circle', w: 42, label: '?', color: 'red', layer: 'top', hidden: true });
        const p1 = a.packet('5d21', { at: 'm3', color: 'blue', h: 20, size: 11 });
        const p2 = a.packet('e04a', { at: 'f2', color: 'violet', h: 20, size: 11 });
        await a.par(a.move(p1, [430, LANE.main], 800), a.move(p2, [430, LANE.main], 800));
        await a.par(a.fadeOut(p1, 200), a.fadeOut(p2, 200), a.show(q, 250));
        a.hl('q', true, 'red');
        await a.flash('q');
        a.note('n-cf', 590, 250, 'CONFLICT: button.css\n<<<<<<< main\n색: 파랑\n=======\n색: 초록\n>>>>>>> feature', { color: 'red', w: 170 });
        a.packet('button.css ⚠', { at: WORK, color: 'red', layer: 'top' });
        await a.wait(800);
      },
    },
    {
      t: '충돌 해결 → 병합 커밋',
      easy: '사람이 파일을 열어 "초록으로 하자"라고 직접 골라 고친 뒤, 다시 담고 저장합니다. 그러면 부모가 둘인 특별한 동그라미(병합 커밋)가 생기고 두 갈래가 하나로 합쳐져요.',
      deep: '충돌 표시를 지우고 원하는 내용으로 편집 → git add로 해결 표시 → git commit으로 병합 커밋 c8f0(부모: 5d21, e04a)을 만듭니다. 히스토리를 일직선으로 유지하고 싶으면 rebase를 쓰기도 하지만, 이미 공유된 커밋을 rebase하면 안 됩니다.',
      async run(a) {
        a.clear();
        a.note('n-fix', 590, 250, '직접 고름 ✓\n색: 초록', { color: 'green', w: 170 });
        const p = a.packet('button.css ✓', { at: WORK, color: 'green' });
        cmd(a, 'git add button.css');
        await a.move(p, STAGE, 600);
        cmd(a, 'git commit');
        await a.move(p, [430, LANE.main], 800);
        await a.par(a.fadeOut(p, 200), reveal(a, 'mg', ['m3', 'f2']));
        await moveTag(a, 'main', 'mg', true);
        a.note('n-mg', 592, 218, '병합 커밋 c8f0\n부모 2개: 5d21 + e04a', { color: 'green' });
        await a.flash('mg');
        a.remove('n-fix');
        await a.wait(500);
      },
    },
    {
      t: 'push — GitHub에 올리기',
      easy: '지금까지의 저장은 내 컴퓨터에만 있습니다. git push를 하면 동그라미들이 GitHub(원격 저장소)로 복사되어 팀원도 볼 수 있고, 내 컴퓨터가 고장 나도 안전해요.',
      deep: 'git push origin main은 원격에 없는 커밋 객체들을 전송하고 원격의 main ref를 c8f0으로 갱신합니다. 원격 main이 그사이 다른 커밋으로 앞서 있으면 non-fast-forward로 거부되므로 먼저 pull해야 합니다. 로컬에는 origin/main 추적 브랜치가 원격 상태를 기억합니다.',
      async run(a) {
        a.clear();
        cmd(a, 'git push origin main');
        await a.show('z-remote');
        const ids = ['c1', 'c2', 'f1', 'm3', 'f2', 'mg'];
        await a.par(...ids.map((id, i) => a.wait(i * 120).then(async () => {
          const n = a.get(id);
          const p = a.packet('', { at: id, color: 'teal', w: 14, h: 14 });
          await a.move(p, [n.x, LANE.remote], 600);
          a.remove(p);
          await a.show('r-' + id, 200);
        })));
        await a.show('t-origin');
        a.note('n-push', 590, 150, '팀원도 볼 수 있음 ☁️', { color: 'teal' });
        await a.wait(600);
      },
    },
    {
      t: 'pull — 팀원의 커밋 가져오기',
      easy: '팀원이 GitHub에 새 저장(b6e9)을 올렸습니다. git pull을 하면 그 동그라미를 내 컴퓨터로 가져와 합칩니다. 이렇게 여러 사람이 같은 프로젝트를 함께 만들어요.',
      deep: 'git pull = git fetch(원격 객체·ref 다운로드) + git merge origin/main(또는 --rebase). 내 쪽에 새 커밋이 없으면 main 포인터만 앞으로 옮기는 fast-forward로 끝납니다. 양쪽 모두 새 커밋이 있으면 병합 커밋이나 충돌이 생길 수 있습니다.',
      async run(a) {
        a.clear();
        cmd(a, '(팀원이 push)');
        const mate = a.packet('팀원 🙂', { at: [680, LANE.main - 40], color: 'pink' });
        await a.move(mate, 'r-pl', 600);
        await a.par(a.fadeOut(mate, 200), a.show('r-pl', 300));
        await a.move('t-origin', [600, LANE.remote], 400);
        cmd(a, 'git pull');
        const n = a.get('pl');
        const p = a.packet('b6e9', { at: 'r-pl', color: 'teal', h: 20, size: 11 });
        await a.move(p, [n.x, n.y], 700);
        await a.par(a.fadeOut(p, 200), reveal(a, 'pl', ['mg']));
        await moveTag(a, 'main', 'pl', true);
        a.note('n-ff', 600, 250, 'fetch + merge\n(fast-forward)', { color: 'teal' });
        await a.wait(700);
      },
    },
  ],
};

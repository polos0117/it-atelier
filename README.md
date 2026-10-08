# 움직이는 IT

https://polos0117.github.io/it-atelier/ — IT 개념을 움직이는 그림과 단계별 설명으로 배우는 곳.
입문(컴퓨터·0과 1·인터넷)부터 고급(복제·샤딩, CAP, 일관된 해싱, 쿠버네티스, Raft)까지, 알고리즘과 AI(LLM)를 포함한 28개 주제.

- 빌드 없음. `index.html` + `css/style.css` + `js/*.js`(ES 모듈)를 그대로 올린다.
- 주제마다 **쉽게**(비유 중심) / **자세히**(실무 기술) 설명을 바꿔 볼 수 있다.
- 재생·멈춤, 한 단계씩 앞뒤 이동, 속도(0.5~2×), 크게 보기(폰 세로에서는 무대를 가로로 돌려 크게).
- 목적별 학습 코스 7개(첫 화면) — 코스를 고르면 주제 화면 위에 진행 띠와 다음 주제가 뜬다.
- `#/t/주제/단계` 주소로 특정 단계를 바로 연다(🔗 링크 복사). `#/terms`는 전체 용어 사전.
- 🧪 직접 실험: 주제 화면의 "직접 실험" 탭(`#/t/주제/lab`). 버튼·스위치·슬라이더로 장애·트래픽을 바꾸며 실시간 숫자를 보고, 도전 과제를 깬다.
- 주제마다 퀴즈 3문제 — 틀리면 그 내용을 가르친 단계로 바로 돌아간다.
- 끝까지 본 주제, 퀴즈 최고 점수, 설명 수준, 속도, 밝기는 브라우저(localStorage)에만 저장된다.

## 구조

```
  index.html          처음 화면 + 주제 화면 (해시 주소: #/  ·  #/t/dns)
  css/style.css       색은 모두 토큰(다크 기본, 라이트 지원)
  js/app.js           화면 그리기, 조작 바, 키보드(Space ← → R F)
  js/engine.js        단계별 SVG 애니메이션 엔진 (무대 720×440)
  js/topics/index.js  주제 순서(IDS)·난이도·학습 코스·3D 공장 목록
  js/topics/*.js      주제 하나 = 파일 하나
  js/labs/index.js    실험실 목록(LAB_IDS)
  js/labs/*.js        실험실 하나 = 파일 하나 (주제 id와 같은 이름). lb.js가 기준 예시
  factory/            3D 공장(packet-factory) 빌드 결과 — 직접 고치지 않는다
  factory-src/        3D 공장 원본 (Vite + React + Three.js)
  dev/harness.html    개발용: ?t=주제id 로 주제 하나만 띄워 점검
```

## 주제 추가하기

1. `js/topics/<id>.js`를 만든다. `dns.js`(입문), `lb.js`(중급), `httpver.js`(단계마다 다시 그리기)를 복사해 시작하면 편하다.
2. `js/topics/index.js`의 `IDS`에 id를 넣는다(배열 순서 = 추천 학습 순서).

```js
export default {
  id: 'dns', level: 1, cat: '네트워크',
  title: 'DNS — 이름을 주소로 바꾸기', sub: '한 문장 소개',
  analogy: '일상 비유', keys: ['핵심 정리'], terms: [['용어', '설명']],
  factory: 'lb',                         // (선택) 3D 공장 장면 id
  quiz: [{ q: '질문', c: ['보기1', '보기2', '보기3'], a: 1, why: '해설', step: 2 }],  // a·step은 0부터
  setup(a) {                             // 무대 꾸미기
    a.node('pc', 92, 150, { label: '브라우저', icon: '💻', color: 'blue' });
    a.node('srv', 600, 150, { label: '서버', color: 'green' });
    a.edge('pc', 'srv', { dashed: true });
  },
  steps: [
    { t: '단계 제목', easy: '쉬운 설명', deep: '기술 설명',
      async run(a) { await a.send('pc', 'srv', 'GET /', { color: 'blue' }); } },
  ],
};
```

단계로 돌아가거나 건너뛸 때는 무대를 다시 만들고 앞 단계를 즉시 재생해 같은 상태를 만든다.
그래서 단계는 **항상 같은 결과**를 내야 한다(무작위 금지). 지나간 패킷·메모는 단계 안에서 치우거나 다음 단계 시작에 `a.clear()`로 비운다.

엔진 도구: `node` `setNode` `moveNode` `edge` `zone` `text` `setText` `packet` `move` `send` `show` `hide` `fade` `fadeOut` `remove` `clear` `hl` `flash` `badge` `note` `bar` `caption` `wait` `tween` `par` `raw`.
색: `blue green red amber violet teal pink gray`.

## 실험실 추가하기

`js/labs/<주제id>.js`를 만들고 `js/labs/index.js`의 `LAB_IDS`에 넣는다. 모양은 `lb.js`를 따른다.

- `controls`: `radio`·`toggle`·`range`·`button` — 값은 상태 `s[key]`에 바로 들어가고 `onChange(key, s, a)`가 불린다.
- `setup(a, s)`: 무대를 꾸리고 `a.every(ms, fn)`·`a.spawn(fn)`으로 계속 도는 흐름을 띄운다(배속·멈춤·처음부터를 따른다). `setTimeout`은 쓰지 않는다.
- `stats(s)`: 실시간 숫자 `[[이름, 값, 색?]]`. `tasks`: `{ t, check(s) }` — 0.25초마다 검사해 달성하면 체크(브라우저에 저장).

## 3D 공장 다시 빌드하기

```bash
cd factory-src
npm install
npm run build
rm -rf ../factory && cp -r dist ../factory
```

## 로컬에서 보기

```bash
cd it-atelier
python3 -m http.server 8000   # http://localhost:8000/
```

# 패킷 공장

IT 개념을 3D 공장 라인처럼 계속 돌아가는 애니메이션으로 보여 주는 학습 사이트입니다.
Vite + React + Three.js로 만들었습니다.

| 장면 | 보여 주는 것 |
|---|---|
| CI/CD 파이프라인 | 푸시 → 빌드 → 테스트 → 배포, 테스트 실패 시 중단 |
| 로드밸런서 | 라운드 로빈 / 최소 연결, 헬스 체크, 장애 서버 제외 |
| 메시지 큐 | 발행, 경쟁 소비, ACK, 작업자 장애 시 재전달 |
| CDN 캐시 | 엣지 HIT / 오리진 MISS, TTL 만료, 퍼지 |
| 레이트 리미터 | 토큰 버킷, 버스트, 429 거절 |

## 실행

Node.js 18 이상이 필요합니다.

```bash
npm install
npm run dev       # http://localhost:5173
```

배포용 빌드:

```bash
npm run build     # dist/ 폴더 생성
npm run preview   # 빌드 결과 확인
```

`dist/`는 정적 파일이라 어디에 올려도 됩니다(GitHub Pages, Netlify, Nginx, 사내 웹서버 하위 경로 등).
`vite.config.js`의 `base: './'` 덕분에 하위 경로에 올려도 동작합니다.

## 구조

```
src/
  engine/
    World.js      렌더러·카메라·루프, 작업(코루틴) 실행, 자원 정리
    kit.js        장면에서 쓰는 도구: station, belt, pkg, label, run/move/wait ...
  scenes/
    index.js      장면 목록 (여기 추가하면 탭이 생김)
    cicd.js  loadBalancer.js  messageQueue.js  cdn.js  rateLimiter.js
  components/     Stage, Controls, FlowPanel, RunsTable
  App.jsx
```

## 새 장면 추가하기

1. `src/scenes/`에 파일을 하나 만듭니다. 기존 장면(`rateLimiter.js`가 가장 짧음)을 복사해서 시작하면 편합니다.
2. `src/scenes/index.js`의 `SCENES` 배열에 추가합니다.

장면 파일의 모양:

```js
export default {
  id: 'dns', tab: 'DNS 조회', title: 'HOW DNS WORKS', sub: 'browser → resolver → root → tld → auth',
  tblTitle: 'QUERIES',
  flow: [{ t: '단계 이름', d: '설명' }],          // 왼쪽 흐름 패널
  cols: [{ k: 'n', l: '#' }],                      // 기록 표 열
  keys: ['핵심 정리 문장'],
  actions: [                                       // 조작 바 버튼
    { type: 'button', label: '요청 보내기', run: (s) => s.send() },
    { type: 'toggle', key: 'down', label: '장애' },
    { type: 'radio', key: 'mode', value: 'a', label: '방식 A' },
    { type: 'range', key: 'rate', label: '속도', min: 0.5, max: 3, step: 0.1 },
  ],
  build(k) {
    const s = { k };                               // 장면 상태 (버튼이 여기 값을 바꿈)
    const a = k.station('리졸버', -3, 0, { accent: k.C.violet, badge: '캐시 0' });
    k.belt(-10, 0, -3, 0);
    s.send = () => k.run((function* () {
      const p = k.pkg(k.C.blue, '#1');
      k.hl(0); k.cap('요청 출발');
      yield k.move(p, [k.V(-10, 0), k.V(-3, 0)], 5);   // 경로를 따라 이동
      yield k.wait(1);                                 // 시뮬레이션 시간 1초 대기
      k.addRow({ n: '#1' });
      k.fadeOut(p);
    })());
    k.every(2, s.send);                            // 2초마다 반복
    return s;
  },
  stats: (s) => [['처리', 0]],                    // 무대 오른쪽 위 숫자
};
```

작업은 제너레이터 함수로 씁니다. `yield k.move(...)`, `yield k.wait(초)`, `yield k.until(() => 조건)`으로 순서대로 진행되고, 배속·일시정지가 자동으로 적용됩니다. 시간 지연이 필요하면 `setTimeout` 대신 `k.later(초, fn)`을 쓰세요(배속을 따라갑니다).

## 성능 메모

- 지오메트리와 기본 재질은 공유하고, 사라지는 물건(`fadeOut`, `remove`)은 텍스처·재질을 즉시 해제합니다. 오래 켜 둬도 GPU 메모리가 늘지 않습니다.
- 작업 하나에서 오류가 나도 그 작업만 제거되고 애니메이션은 계속 돕니다(콘솔에 `[job]` 오류로 표시).
- 모바일에서는 그림자 해상도와 픽셀 비율을 낮춥니다.
- 개발 서버(`npm run dev`)에서는 콘솔에서 `__world.renderer.info.memory`로 자원 수를 확인할 수 있습니다.

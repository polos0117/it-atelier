// 주제 목록. 새 주제는 topics/에 <id>.js 파일을 만들고 여기 IDS에 id를 넣으면 목록에 나타난다.
// 배열 순서 = 추천 학습 순서. 한 파일이 깨져도 나머지는 뜨도록 하나씩 불러온다.
export const IDS = [
  'computer', 'bits', 'web', 'dns', 'packet', 'nat',
  'http', 'rest', 'tcp', 'https', 'session', 'password', 'algo',
  'httpver', 'cache', 'lb', 'mq', 'dbindex', 'sqltx', 'git', 'cicd', 'llm',
  'replication', 'hashring', 'cap', 'ratelimit', 'k8s', 'raft',
];

export async function loadTopics() {
  const res = await Promise.allSettled(IDS.map((id) => import(`./${id}.js`)));
  const out = [];
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') out.push(r.value.default);
    else console.error(`[topic] ${IDS[i]} 불러오기 실패`, r.reason);
  });
  return out;
}

export const LEVELS = {
  1: { name: '입문', desc: 'IT가 처음이라면 — 컴퓨터와 인터넷의 기본', color: 'green' },
  2: { name: '기초', desc: '웹이 실제로 어떻게 대화하는지', color: 'blue' },
  3: { name: '중급', desc: '서비스를 빠르고 튼튼하게 만드는 기술', color: 'violet' },
  4: { name: '고급', desc: '대규모 분산 시스템의 핵심 원리', color: 'red' },
};

// 3D 공장(packet-factory) 장면 — factory/ 폴더, 주소 뒤 #id로 바로 연다
export const FACTORY = [
  { id: 'cicd', name: 'CI/CD 파이프라인', d: '푸시 → 빌드 → 테스트 → 배포' },
  { id: 'lb', name: '로드밸런서', d: '라운드 로빈 · 최소 연결 · 헬스 체크' },
  { id: 'mq', name: '메시지 큐', d: '발행 · 경쟁 소비 · ACK · 재전달' },
  { id: 'cdn', name: 'CDN 캐시', d: 'HIT / MISS · TTL · 퍼지' },
  { id: 'rate', name: '레이트 리미터', d: '토큰 버킷 · 버스트 · 429' },
];

// 학습 코스 — 목적별 추천 순서. 없는 id는 건너뛴다.
export const COURSES = [
  { id: 'starter', name: 'IT 첫걸음', color: 'green', desc: '컴퓨터와 인터넷이 처음이라면. 화면 뒤에서 무슨 일이 일어나는지부터.', ids: ['computer', 'bits', 'web', 'dns', 'packet', 'nat', 'http'] },
  { id: 'web', name: '웹 개발 기초', color: 'blue', desc: '웹 서비스를 만들기 전에 꼭 알아야 할 대화법과 보안.', ids: ['web', 'http', 'rest', 'tcp', 'https', 'session', 'password', 'cache'] },
  { id: 'backend', name: '백엔드 개발자', color: 'violet', desc: '데이터를 다루고, 느려지지 않고, 몰려도 버티는 서버.', ids: ['rest', 'sqltx', 'dbindex', 'cache', 'mq', 'lb', 'replication', 'ratelimit'] },
  { id: 'infra', name: '인프라·데브옵스', color: 'teal', desc: '코드가 서버에 올라가고 살아 있게 하는 일.', ids: ['nat', 'lb', 'cicd', 'k8s', 'cache', 'ratelimit', 'replication'] },
  { id: 'dist', name: '분산 시스템 심화', color: 'red', desc: '서버 여러 대가 하나처럼 움직이게 만드는 원리.', ids: ['replication', 'hashring', 'cap', 'raft', 'mq', 'k8s'] },
  { id: 'cs', name: '컴퓨터 과학 맛보기', color: 'amber', desc: '0과 1에서 알고리즘, 그리고 AI까지.', ids: ['bits', 'computer', 'algo', 'dbindex', 'llm'] },
  { id: 'interview', name: '면접 단골 10선', color: 'pink', desc: '개발자 면접에서 자주 나오는 질문만 골랐어요.', ids: ['web', 'dns', 'tcp', 'https', 'session', 'cache', 'dbindex', 'sqltx', 'lb', 'cap'] },
];

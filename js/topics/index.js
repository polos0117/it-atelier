// 주제 목록. 새 주제는 topics/에 <id>.js 파일을 만들고 여기 IDS에 id를 넣으면 목록에 나타난다.
// 배열 순서 = 추천 학습 순서. 한 파일이 깨져도 나머지는 뜨도록 하나씩 불러온다.
export const IDS = [
  'computer', 'web', 'dns', 'packet',
  'http', 'tcp', 'https', 'session', 'algo',
  'httpver', 'cache', 'lb', 'dbindex', 'git',
  'replication', 'hashring', 'ratelimit', 'k8s', 'raft', 'llm',
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

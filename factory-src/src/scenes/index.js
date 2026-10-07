// 새 장면을 추가하려면: scenes/ 에 파일을 만들고 여기 배열에 넣으면 탭이 자동으로 생깁니다.
import cicd from './cicd.js';
import loadBalancer from './loadBalancer.js';
import messageQueue from './messageQueue.js';
import cdn from './cdn.js';
import rateLimiter from './rateLimiter.js';

export const SCENES = [cicd, loadBalancer, messageQueue, cdn, rateLimiter];

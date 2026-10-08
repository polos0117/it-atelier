// 직접 실험(실험실) 목록. 주제 id와 같은 이름의 파일을 labs/에 두고 여기에 넣으면 주제 화면에 "직접 실험" 탭이 생긴다.
export const LAB_IDS = ['lb'];
export const loadLab = (id) => import(`./${id}.js`).then((m) => m.default);

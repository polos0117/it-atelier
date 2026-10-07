import { useCallback, useEffect, useState } from 'react';
import { SCENES } from './scenes/index.js';
import Stage from './components/Stage.jsx';
import Controls from './components/Controls.jsx';
import FlowPanel from './components/FlowPanel.jsx';
import RunsTable from './components/RunsTable.jsx';

const initialScene = () => {
  const h = location.hash.slice(1);
  if (SCENES.some((s) => s.id === h)) return h;
  try {
    const saved = localStorage.getItem('pf-scene');
    if (SCENES.some((s) => s.id === saved)) return saved;
  } catch { /* 저장소 사용 불가 */ }
  return SCENES[0].id;
};

export default function App() {
  const [world, setWorld] = useState(null);
  const [sceneId, setSceneId] = useState(initialScene);
  const [caption, setCaption] = useState('');
  const [flow, setFlow] = useState({ counts: [], active: null, seq: 0 });
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState([]);
  const [lost, setLost] = useState(false);
  const [, setUiTick] = useState(0);
  const refresh = useCallback(() => setUiTick((x) => x + 1), []);

  const scene = SCENES.find((s) => s.id === sceneId);

  // 장면 불러오기
  useEffect(() => {
    if (!world) return;
    world.load(scene);
    try { localStorage.setItem('pf-scene', scene.id); } catch { /* 무시 */ }
    try { history.replaceState(null, '', '#' + scene.id); } catch { /* 무시 */ }
  }, [world, scene, refresh]);

  // 엔진 → UI 이벤트 구독
  useEffect(() => {
    if (!world) return;
    let capTimer;
    const offs = [
      world.on('caption', (t) => {
        setCaption(t);
        clearTimeout(capTimer);
        if (t) capTimer = setTimeout(() => setCaption(''), 4200 / Math.max(0.5, world.speed));
      }),
      world.on('flow', (i) =>
        setFlow((f) => {
          const counts = [...f.counts];
          counts[i] = (counts[i] || 0) + 1;
          return { counts, active: i, seq: f.seq + 1 };
        }),
      ),
      world.on('rows', setRows),
      world.on('stats', setStats),
      world.on('state', refresh),
      world.on('context', (ok) => setLost(!ok)),
      world.on('loaded', () => {
        setFlow({ counts: [], active: null, seq: 0 });
        setStats([]);
        setCaption('');
        refresh();
      }),
    ];
    return () => { offs.forEach((off) => off()); clearTimeout(capTimer); };
  }, [world, refresh]);

  // 흐름 강조는 잠깐만
  useEffect(() => {
    if (flow.active == null) return;
    const t = setTimeout(() => setFlow((f) => ({ ...f, active: null })), 1100);
    return () => clearTimeout(t);
  }, [flow.seq, flow.active]);

  return (
    <div className="wrap">
      <header className="top">
        <div className="logo">패킷<b>공장</b></div>
        <span className="tagline">IT 개념을 공장 라인처럼 돌려 보며 이해하기</span>
        <a className="back" href="../">← 움직이는 IT</a>
      </header>

      <nav className="tabs" aria-label="장면 선택">
        {SCENES.map((s) => (
          <button key={s.id} className="tab" aria-current={s.id === sceneId} onClick={() => setSceneId(s.id)}>
            {s.tab}
          </button>
        ))}
      </nav>

      <div className="stagecard">
        <Stage onReady={setWorld} title={scene.title} sub={scene.sub} caption={caption} stats={stats} lost={lost} />
        {world && <Controls world={world} scene={scene} onChange={refresh} />}
      </div>

      <div className="below">
        <FlowPanel flow={scene.flow} counts={flow.counts} active={flow.active} />
        <RunsTable title={scene.tblTitle} cols={scene.cols} rows={rows} />
      </div>

      <section className="panel">
        <h3>핵심 정리</h3>
        <ul className="keys">
          {scene.keys.map((k) => <li key={k}>{k}</li>)}
        </ul>
      </section>
    </div>
  );
}

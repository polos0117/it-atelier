import { useEffect, useRef } from 'react';
import { World } from '../engine/World.js';

export default function Stage({ onReady, title, sub, caption, stats, lost }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const world = new World(hostRef.current);
    if (import.meta.env.DEV) window.__world = world; // 개발 중 콘솔에서 상태 확인용
    onReady(world);
    return () => { onReady(null); world.destroy(); };
  }, [onReady]);

  return (
    <div className="stage" ref={hostRef}>
      <div className="ov">
        <h1>{title}</h1>
        <div className="sub">{sub}</div>
      </div>
      <div className="hint">드래그로 회전 · 휠/핀치로 확대</div>
      <div className="stats">
        {stats.map(([k, v]) => (
          <div className="stat" key={k}>{k} <b>{v}</b></div>
        ))}
      </div>
      {caption && <div className="cap">{caption}</div>}
      {lost && <div className="lost">그래픽 메모리를 다시 확보하는 중입니다. 잠시 후 자동으로 이어집니다.</div>}
    </div>
  );
}

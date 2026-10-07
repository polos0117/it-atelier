import { useEffect, useState } from 'react';

const SPEEDS = [0.5, 1, 2, 3];

export default function Controls({ world, scene, onChange }) {
  const [paused, setPaused] = useState(world.paused);
  const [speed, setSpeed] = useState(world.speed);
  const s = world.state || {};

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { world.paused = true; setPaused(true); }
  }, [world]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); world.paused = !world.paused; setPaused(world.paused); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [world]);

  const act = (a, value) => {
    const st = world.state;
    if (a.type === 'button') a.run(st);
    else if (a.type === 'toggle') { st[a.key] = !st[a.key]; scene.onToggle?.(st, a.key, st[a.key]); }
    else if (a.type === 'radio') { st[a.key] = a.value; scene.onRadio?.(st, a.key, a.value); }
    else if (a.type === 'range') { st[a.key] = value; scene.onRange?.(st, a.key, value); }
    onChange();
  };

  return (
    <div className="bar">
      <button className="btn main" onClick={() => { world.paused = !world.paused; setPaused(world.paused); }}>
        {paused ? '재생' : '일시정지'}
      </button>
      <div className="seg" role="group" aria-label="속도">
        {SPEEDS.map((v) => (
          <button key={v} aria-pressed={speed === v} onClick={() => { world.speed = v; setSpeed(v); }}>{v}×</button>
        ))}
      </div>
      <button className="btn" onClick={() => { world.load(scene); onChange(); }}>처음부터</button>
      <span className="sep" />
      {scene.actions.map((a, i) => {
        if (a.type === 'range') {
          const v = s[a.key] ?? a.min;
          return (
            <label className="rng" key={i}>
              {a.label}
              <input type="range" min={a.min} max={a.max} step={a.step} value={v}
                onChange={(e) => act(a, +e.target.value)} />
              <span className="rv">{Number(v).toFixed(1)}</span>
            </label>
          );
        }
        const on = a.type === 'toggle' ? !!s[a.key] : a.type === 'radio' ? s[a.key] === a.value : false;
        return (
          <button key={i} className={`btn ${a.type}${on ? ' on' : ''}`} aria-pressed={a.type === 'button' ? undefined : on} onClick={() => act(a)}>
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

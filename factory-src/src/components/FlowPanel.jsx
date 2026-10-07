export default function FlowPanel({ flow, counts, active }) {
  return (
    <section className="panel">
      <h3>흐름</h3>
      <ol className="flow">
        {flow.map((f, i) => (
          <li key={f.t} className={active === i ? 'on' : ''}>
            <div>
              <b>{f.t}</b>
              <span>{f.d}</span>
            </div>
            <span className="cnt">{counts[i] || 0}회</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

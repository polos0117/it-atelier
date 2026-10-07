import { useRef } from 'react';

// 값에 따라 색을 입힌다 (성공·실패·진행 중)
const tone = (v) => {
  if (v === '✓' || /HIT|통과|완료|ACK/.test(v)) return 'ok';
  if (v === '✗' || /^(실패|429|502|중단)/.test(v)) return 'bad';
  if (v === '…' || /처리 중|MISS|재전달|대기/.test(v)) return 'run';
  if (v === '–' || v === '') return 'dim';
  return '';
};

export default function RunsTable({ title, cols, rows }) {
  const seen = useRef(new Set());
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="tblwrap">
        <table>
          <thead>
            <tr>{cols.map((c) => <th key={c.k}>{c.l}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={cols.length} className="empty">곧 첫 기록이 생깁니다.</td></tr>
            )}
            {rows.map((r) => {
              const isNew = !seen.current.has(r._id);
              seen.current.add(r._id);
              return (
                <tr key={r._id} className={isNew ? 'new' : ''}>
                  {cols.map((c, i) => {
                    const v = String(r[c.k] ?? '');
                    return <td key={c.k} className={`${c.wrap ? 'wrap ' : ''}${i ? tone(v) : ''}`}>{v}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Server-rendered SVG line chart — no client JS, renders at build time.

interface Series {
  label: string;
  color: string;
  points: { date: string; value: number }[];
}

export default function LineChart({ title, unit, series, sourceUrl, sourceLabel }: {
  title: string;
  unit: string;
  series: Series[];
  sourceUrl: string;
  sourceLabel: string;
}) {
  const W = 780, H = 260, PAD_L = 56, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return (
      <div className="chart-panel">
        <div className="chart-title">{title}</div>
        <p className="overview">No data yet — fills in as the daily pipeline runs.</p>
      </div>
    );
  }

  const dates = [...new Set(all.map((p) => p.date))].sort();
  const min = Math.min(...all.map((p) => p.value));
  const max = Math.max(...all.map((p) => p.value));
  const span = max - min || 1;
  const yLo = min - span * 0.08, yHi = max + span * 0.08;

  const x = (date: string) => PAD_L + (dates.indexOf(date) / Math.max(dates.length - 1, 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - yLo) / (yHi - yLo)) * (H - PAD_T - PAD_B);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => yLo + t * (yHi - yLo));
  const xTickIdx = dates.length <= 6 ? dates.map((_, i) => i)
    : [0, Math.floor(dates.length / 3), Math.floor((2 * dates.length) / 3), dates.length - 1];

  return (
    <div className="chart-panel">
      <div className="chart-title">{title} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({unit})</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 480, height: 'auto' }} role="img" aria-label={title}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v.toFixed(2)}</text>
          </g>
        ))}
        {xTickIdx.map((i) => (
          <text key={i} x={x(dates[i])} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{dates[i].slice(5)}</text>
        ))}
        {series.map((s) => {
          const pts = s.points.filter((p) => dates.includes(p.date)).sort((a, b) => a.date.localeCompare(b.date));
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
          return <path key={s.label} d={d} fill="none" stroke={s.color} strokeWidth="2" />;
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
        {series.map((s) => (
          <span key={s.label}><span style={{ color: s.color }}>●</span> {s.label}</span>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel} ↗</a>
        </span>
      </div>
    </div>
  );
}

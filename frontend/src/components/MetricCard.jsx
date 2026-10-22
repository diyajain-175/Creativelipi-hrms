export function MetricCard({ label, value, hint }) {
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className="metric">{value}</div>
      {hint ? <div className="metric-label">{hint}</div> : null}
    </div>
  );
}

export function StatusBadge({ value }) {
  const text = String(value || '').replaceAll('_', ' ');
  return <span className={`badge ${value || ''}`}>{text}</span>;
}

// A 0..1 value as a small bar plus its number. Shared by the landing preview and the dashboard.
export function ConfidenceBar({ value, title }: { value: number | null; title?: string }) {
  if (value == null) return <span className="muted">—</span>;
  return (
    <span className="confidence" title={title}>
      <span className="confidence__track">
        <span className="confidence__fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="mono">{value.toFixed(2)}</span>
    </span>
  );
}

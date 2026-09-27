// Two floating isometric records: a database. The pink top face is the newest log.
// Shapes are filled with the page background so the top record hides the lines behind it.
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="var(--color-mist)"
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Bottom record */}
      <path d="M5.25 27.63 24 16.8l18.75 10.83v6.38L24 44.84 5.25 34.01Z" fill="var(--color-void)" />
      <path d="M5.25 27.63 24 38.46l18.75-10.83M24 38.46v6.38" />
      {/* Top record */}
      <path d="M5.25 14 24 3.17 42.75 14v6.38L24 31.21 5.25 20.38Z" fill="var(--color-void)" />
      <path d="M24 3.17 42.75 14 24 24.83 5.25 14Z" fill="var(--color-accent)" />
      <path d="M5.25 14 24 24.83 42.75 14M24 24.83v6.38" />
    </svg>
  );
}

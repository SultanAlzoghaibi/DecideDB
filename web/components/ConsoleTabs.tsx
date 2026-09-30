// Tabs across the top of the logged-in console.
const TABS = [
  { href: "/console", label: "Overview" },
  { href: "/console/decisions", label: "Decisions" },
  { href: "/console/rag", label: "RAG" },
];

export function ConsoleTabs({ current }: { current: string }) {
  return (
    <nav className="console-tabs" aria-label="Console">
      {TABS.map((t) => (
        <a key={t.href} href={t.href} className={`console-tabs__tab${t.href === current ? " console-tabs__tab--on" : ""}`}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}

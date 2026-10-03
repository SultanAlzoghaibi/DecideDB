import { GITHUB_URL } from "@/lib/links";
import { Logo } from "./Logo";

export function Nav({ active }: { active?: "docs" | "console" }) {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <a href="/" className="nav__brand" aria-label="DecisionDB home">
          <Logo size={22} />
          <span>DecisionDB</span>
        </a>
        <nav className="nav__links">
          <a href="/docs" className={`nav__link${active === "docs" ? " nav__link--active" : ""}`}>
            Docs
          </a>
          {/* Logged-out visitors get sent to /login from here. */}
          <a href="/console" className={`nav__cta${active === "console" ? " nav__cta--active" : ""}`}>
            Console
            <span aria-hidden="true">→</span>
          </a>
          <a href={GITHUB_URL} className="btn btn--ghost">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

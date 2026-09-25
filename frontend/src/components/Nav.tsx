import { GITHUB_URL } from "../links";
import { Logo } from "./Logo";

export function Nav({ active }: { active?: "docs" }) {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <a href="/" className="nav__brand" aria-label="JevDB home">
          <Logo size={22} />
          <span>JevDB</span>
        </a>
        <nav className="nav__links">
          <a href="/docs" className={`nav__link${active === "docs" ? " nav__link--active" : ""}`}>
            Docs
          </a>
          <a href={GITHUB_URL} className="btn btn--ghost">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

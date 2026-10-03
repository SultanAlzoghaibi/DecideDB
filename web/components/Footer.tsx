import { GITHUB_URL } from "@/lib/links";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span className="footer__brand">
          <Logo size={16} />
          DecisionDB · open source · early preview
        </span>
        <span className="footer__links">
          <a href="/docs">Docs</a>
          <a href={GITHUB_URL}>GitHub</a>
        </span>
      </div>
    </footer>
  );
}

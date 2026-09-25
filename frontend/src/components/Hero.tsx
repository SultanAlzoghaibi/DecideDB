import { CopyCommand } from "./CopyCommand";
import { RequestsPreview } from "./RequestsPreview";

export function Hero() {
  return (
    <section className="hero container">
      <p className="pill">
        <span className="pill__dot" aria-hidden="true" />
        Open source · Early preview
      </p>

      <h1 className="hero__title">
        <span className="hero__title-muted">Jev forgets every call.</span>
        <br />
        JevDB doesn't.
      </h1>

      <p className="hero__sub">
        A self-hosted proxy between your app and the Jev API. Every request and
        response lands in Postgres. Browse them in a table, then grade each
        decision against what actually happened.
      </p>

      <div className="hero__actions">
        <a href="/docs#quickstart" className="btn btn--primary">
          Get started
        </a>
        <CopyCommand command="docker compose up" />
      </div>

      <RequestsPreview />
    </section>
  );
}

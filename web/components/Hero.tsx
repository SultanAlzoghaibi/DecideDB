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
        DecideDB doesn't.
      </h1>

      <p className="hero__sub">
        Call Jev through our SDK and every request and response is saved to your
        database. You make the calls, so your Jev API key never leaves your app.
        Grade each answer, and let those scores feed your best past decisions back
        into new calls with Jev RAG.
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

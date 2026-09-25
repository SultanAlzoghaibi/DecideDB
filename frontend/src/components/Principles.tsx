export function Principles() {
  return (
    <section className="section container" aria-labelledby="principles-title">
      <p className="eyebrow">Built to stay boring</p>
      <h2 id="principles-title" className="section__title">
        The plumbing, already assembled.
      </h2>

      <div className="principles">
        <div className="principles__item">
          <h3>Postgres, nothing else</h3>
          <p>
            Hot fields get real columns, the full payload is kept as JSONB. Query it with any tool
            you already know.
          </p>
        </div>
        <div className="principles__item">
          <h3>One command</h3>
          <p>
            Proxy, database and dashboard ship in one Docker Compose file. Self-host it on a laptop
            or a single small VM.
          </p>
        </div>
        <div className="principles__item">
          <h3>
            Retrieval <span className="tag tag--warn">Experimental</span>
          </h3>
          <p>
            Optionally feed graded past examples back into new requests. Off by default, because
            few-shot injection can help, hurt, or do nothing.
          </p>
        </div>
      </div>

      <div className="cta">
        <p className="cta__text">Start logging your Jev calls in a few minutes.</p>
        <a href="/docs#quickstart" className="btn btn--ghost">
          Read the quickstart
        </a>
      </div>
    </section>
  );
}

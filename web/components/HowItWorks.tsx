const STEPS = [
  {
    n: "01",
    title: "Point your app at JevDB",
    body: "Swap your Jev base URL for the JevDB proxy. Your API key and request shape stay exactly the same.",
  },
  {
    n: "02",
    title: "Every call is logged",
    body: "State, questions, answers and confidence are written to Postgres in the background, so the Jev round trip gets no slower.",
  },
  {
    n: "03",
    title: "Grade what happened",
    body: "When you learn the real outcome (a sale, a resolved ticket), tag the decision good or bad with one API call.",
  },
];

export function HowItWorks() {
  return (
    <section className="section container" aria-labelledby="how-title">
      <p className="eyebrow">How it works</p>
      <h2 id="how-title" className="section__title">
        One proxy. No schema to design.
      </h2>

      <div className="flow" role="img" aria-label="Your app calls JevDB, which forwards to the Jev API and writes a copy to Postgres in the background.">
        <div className="flow__node flow__node--app">your app</div>
        <div className="flow__link flow__link--a"><span>Jev call</span></div>
        <div className="flow__node flow__node--proxy">JevDB proxy</div>
        <div className="flow__link flow__link--b"><span>forward</span></div>
        <div className="flow__node flow__node--jev">Jev API</div>
        <div className="flow__link flow__link--down"><span>async write</span></div>
        <div className="flow__node flow__node--db">Postgres</div>
      </div>

      <ol className="steps">
        {STEPS.map((step) => (
          <li key={step.n} className="steps__item">
            <span className="steps__n">{step.n}</span>
            <h3 className="steps__title">{step.title}</h3>
            <p className="steps__body">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

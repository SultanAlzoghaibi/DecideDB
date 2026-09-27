import { JsonToTableFlowMeta } from "./JsonToTable";

// "What gets saved": the JSON → SQL tables morph, with user, group and tags on each call.
export function SavedSection() {
  return (
    <section className="section container" aria-labelledby="saved-title">
      <p className="eyebrow">What gets saved</p>
      <h2 id="saved-title" className="section__title">
        Your JSON, already in SQL.
      </h2>
      <p className="section__body">
        We split every call into clean Postgres tables for you, labeled with who made it: user ID, group and tags. Query
        it with any SQL tool.
      </p>

      <JsonToTableFlowMeta />
    </section>
  );
}

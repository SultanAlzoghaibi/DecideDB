"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Nav } from "../Nav";
import { Footer } from "../Footer";
import { CodeBlock } from "../CodeBlock";
import { DocTable, DocsNav, useActiveSection } from "../docsShared";
import { NAMES, SECTIONS, codeFor, type Lang, type Variant } from "./content";

// /docs/sdk/python and /docs/sdk/js. One component, so both pages always have the same
// sections and the same wording. Only code blocks and identifier names (NAMES) differ.

const SECTION_IDS = SECTIONS.map((s) => s.id);

const TOGGLES: Record<Lang, { key: string; options: { id: Variant; label: string }[] }> = {
  python: { key: "jevdb-docs-python", options: [{ id: "async", label: "Async" }, { id: "sync", label: "Sync" }] },
  js: { key: "jevdb-docs-js", options: [{ id: "ts", label: "TypeScript" }, { id: "js", label: "JavaScript" }] },
};

const SYNC_WARNED_KEY = "jevdb-docs-sync-warned-at";
const DAY_MS = 24 * 60 * 60 * 1000;

// localStorage can throw (private mode, blocked storage), so every access is guarded.
const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Not saved; the page still works.
    }
  },
};

export function SdkLangDocs({ lang }: { lang: Lang }) {
  const active = useActiveSection(SECTION_IDS);
  const toggle = TOGGLES[lang];
  const [variant, setVariant] = useState<Variant>(toggle.options[0]!.id);
  const [warn, setWarn] = useState(false);

  // Restore the last choice after the first render (localStorage only exists in the browser).
  useEffect(() => {
    const saved = store.get(toggle.key);
    if (saved && toggle.options.some((o) => o.id === saved)) setVariant(saved as Variant);
  }, [toggle]);

  const choose = (v: Variant) => {
    setVariant(v);
    store.set(toggle.key, v);
    if (v === "sync") {
      const last = Number(store.get(SYNC_WARNED_KEY) ?? 0);
      if (Date.now() - last > DAY_MS) {
        setWarn(true);
        store.set(SYNC_WARNED_KEY, String(Date.now()));
      }
    }
  };

  // Python sync uses JevDB instead of AsyncJevDB; everything else comes from NAMES.
  const n = lang === "python" && variant === "sync" ? { ...NAMES.python, client: "JevDB", flush: "flush()" } : NAMES[lang];
  const code = (section: string) => {
    const c = codeFor(lang, section, variant);
    return c ? <CodeBlock label={c.file} code={c.code} /> : null;
  };
  const title = lang === "python" ? "Python SDK" : "JS / TS SDK";

  return (
    <>
      <Nav active="docs" />
      <div className="container docs">
        <aside className="docs__sidebar">
          <DocsNav current={`/docs/sdk/${lang}`} />
          <p className="docs__group">On this page</p>
          <nav>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={`docs__link${active === s.id ? " docs__link--active" : ""}`}>
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="docs__content">
          <div className="sdk-head">
            <h1>{title}</h1>
            <div className="code-tabs__switch sdk-head__toggle" role="tablist" aria-label="Code style">
              {toggle.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={o.id === variant}
                  className={`code-tabs__tab${o.id === variant ? " code-tabs__tab--on" : ""}`}
                  onClick={() => choose(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <p className="doc__note">
            Not on {lang === "python" ? "PyPI" : "npm"} yet.{" "}
            {lang === "python" ? (
              <>
                For now: <code>uv add &quot;jevdb @ git+https://github.com/SultanAlzoghaibi/JevDB#subdirectory=sdk/python&quot;</code>
              </>
            ) : (
              <>For now, install it from the GitHub repo (<code>sdk/js</code>).</>
            )}
          </p>

          <Section id="install" title="Install" tldr="Add the package. That's the only dependency." copy={codeFor(lang, "install", variant)!.code.split("  ")[0]!}>
            {code("install")}
            <p>It wraps TypeSafe&apos;s official Jev client, so you get that too.</p>
          </Section>

          <Section id="env" title="Environment variables" tldr="Three variables: your Jev key, your JevDB key, and where JevDB runs." copy="JEVDB_API_KEY=jdb_live_…">
            {code("env")}
            <p>Your Jev key only goes to Jev. Your JevDB key only goes to JevDB.</p>
            <p>
              <code>JEVDB_URL</code> is the JevDB Cloud URL. Self-hosting? Use <code>http://localhost:3000</code>.
            </p>
            <p>An argument passed to the client always wins over its environment variable.</p>
          </Section>

          <Section id="quickstart" title="Quickstart" tldr={`Make one Jev call through ${n.client}. The answer comes back as usual, and JevDB keeps a copy.`}>
            {code("quickstart")}
            <p>
              <code>{n.call}</code> takes exactly TypeSafe&apos;s arguments and returns TypeSafe&apos;s response
              unchanged.
            </p>
            <p>The copy is sent in the background. Your call doesn&apos;t wait for it.</p>
            <p>
              Open the <a href="/console/decisions">console</a> to see the decision.
            </p>
          </Section>

          <Section id="client-file" title="Set it up once" tldr={`Create the client in one file. Import it everywhere you call Jev.`} copy={n.clientFile}>
            {code("client-file")}
            <p>Keys, group and tags then live in one place.</p>
            <p>Creating a client per request works, but wastes connections. Make one and reuse it.</p>
            <p>
              See the full project tree in <a href="/docs#project-layout">where it goes in your project</a>.
            </p>
          </Section>

          <Section id="per-call" title="Per-call options" tldr={`Set the group on the client. Pass the user on each call.`} copy={n.userId}>
            {code("per-call")}
            <DocTable
              head={["Option", "What it's for", "Usually set"]}
              rows={[
                [n.groupId, "The feature, team or app the call belongs to.", "On the client"],
                [n.userId, "Who triggered the call.", "Per call"],
                ["tags", "Free labels, e.g. prod or an experiment arm.", "On the client"],
              ]}
            />
            <p>A value passed on a call replaces the client&apos;s value for that call only.</p>
          </Section>

          <Section id="ids" title="Request IDs + grading" tldr={`Every call has an id. Keep it, so you can grade the decision later.`} copy={`${n.idOf}(response)`}>
            {code("ids")}
            <p>
              Get the id with <code>{n.idOf}</code>, or pass your own with <code>{n.decisionId}</code>.
            </p>
            <p>Your own id (a ticket or order id) is easiest: you already have it when the outcome is known.</p>
            <p>
              Grading tags a decision good or bad once you know the real outcome. It&apos;s coming soon; ids you
              keep now will work with it.
            </p>
          </Section>

          <Section id="errors" title="Errors, flush() and shutdown" tldr={`JevDB never breaks your app. Call ${n.flush} before your process exits.`} copy={n.flush}>
            {code("errors")}
            <ul>
              <li>
                <strong>Jev fails:</strong> the failure is logged, then the original error is raised again. Your code
                behaves exactly as without JevDB.
              </li>
              <li>
                <strong>JevDB is down:</strong> nothing breaks. The failed send calls <code>{n.onError}</code> (default:
                a warning).
              </li>
              <li>
                <strong>Shutdown:</strong> logs still in flight are lost if the process exits first. Flush before
                exiting.
              </li>
            </ul>
          </Section>

          <Section id="logged" title="What gets logged" tldr="One record per call: the exact request, the exact response, timing and your labels.">
            {code("logged")}
            <p>
              The JevDB key travels in the <code>Authorization</code> header. No key is ever in the body.
            </p>
          </Section>
        </article>
      </div>
      <Footer />

      {warn && (
        <div className="sdk-modal" role="dialog" aria-modal="true" aria-labelledby="sync-warn-title">
          <div className="sdk-modal__card">
            <h2 id="sync-warn-title">Use async if you can</h2>
            <p>We strongly recommend async: it never blocks your app while logs are sent.</p>
            <div className="sdk-modal__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  choose("async");
                  setWarn(false);
                }}
              >
                Use async
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setWarn(false)}>
                Keep sync
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ id, title, tldr, copy, children }: { id: string; title: string; tldr: string; copy?: string; children: ReactNode }) {
  return (
    <section id={id} className="doc">
      <h2>{title}</h2>
      <div className="tldr">
        <span className="tldr__label">TL;DR</span>
        <p>{tldr}</p>
        {copy && <code className="tldr__copy">{copy}</code>}
      </div>
      {children}
    </section>
  );
}

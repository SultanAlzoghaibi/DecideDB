"use client";

import { Nav } from "../Nav";
import { Footer } from "../Footer";
import { DocsNav } from "../docsShared";

// /docs/sdk: what the SDK does, in plain words, then pick a language.
export function SdkOverview() {
  return (
    <>
      <Nav active="docs" />
      <div className="container docs">
        <aside className="docs__sidebar">
          <DocsNav current="/docs/sdk" />
        </aside>

        <article className="docs__content">
          <section className="doc">
            <h1>SDK</h1>
            <div className="tldr">
              <span className="tldr__label">TL;DR</span>
              <p>Swap TypeSafe&apos;s Jev client for DecisionDB&apos;s. Same calls, same answers, and every call is saved.</p>
            </div>
            <p>The SDK wraps TypeSafe&apos;s Jev client. You call Jev the same way you do today.</p>
            <p>Your app still talks to Jev directly. There is no proxy in between, so no added latency.</p>
            <p>
              After each call, a copy of the request and response is sent to DecisionDB in the background. It&apos;s
              fire-and-forget: it never throws into your app. Call <code>flush()</code> on shutdown so the last
              copies get sent.
            </p>

            <ol className="sdk-steps">
              <li>
                <strong>Your app</strong> calls Jev through the SDK.
              </li>
              <li>
                <strong>Jev</strong> answers. Your app gets the response right away.
              </li>
              <li>
                <strong>DecisionDB</strong> logs it, in the background.
              </li>
            </ol>

            <div className="sdk-cards">
              <a href="/docs/sdk/python" className="sdk-card">
                <span className="sdk-card__title">Python</span>
                <span className="sdk-card__body">Async and sync clients. Wraps typesafe-sdk.</span>
                <code>uv add decisiondb</code>
              </a>
              <a href="/docs/sdk/js" className="sdk-card">
                <span className="sdk-card__title">JS / TS</span>
                <span className="sdk-card__body">Node, Bun and TypeScript. Wraps @typesafe-ai/sdk.</span>
                <code>bun add @decisiondb/sdk</code>
              </a>
            </div>
          </section>
        </article>
      </div>
      <Footer />
    </>
  );
}

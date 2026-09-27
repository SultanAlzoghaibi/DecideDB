import { SdkFlowOneDb } from "./SdkFlow";

export function HowItWorks() {
  return (
    <section className="section container" aria-labelledby="how-title">
      <p className="eyebrow">How it works</p>
      <h2 id="how-title" className="section__title">
        One SDK. No schema to design.
      </h2>

      <SdkFlowOneDb />
    </section>
  );
}

import { SdkFlowRagStack } from "./SdkFlowRagCache";

// "Advanced ML usage" section: version 2 of the product (see notes/roadmap.md).
export function LearningLoop() {
  return (
    <section className="section container" aria-labelledby="loop-title">
      <p className="eyebrow">
        Advanced <span className="tag tag--warn">Experimental</span>
      </p>
      <h2 id="loop-title" className="section__title">
        Gets better as you grade.
      </h2>
      <p className="section__body">
        Turn on retrieval and the SDK adds your best-graded past decisions to new Jev calls as examples. They're cached
        in the SDK, so most calls get them with no extra network trip. Off by default, and built to be A/B tested.
      </p>

      <SdkFlowRagStack />
    </section>
  );
}

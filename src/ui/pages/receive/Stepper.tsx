import { COPY } from "../../../copy.ts";

/** Where the user stands in receive: one bar for each step, lit up to the step now, and its name under them. */
export function Stepper({ current }: { current: number }) {
  const steps = COPY.receive.steps;
  const name = steps[current] ?? "";
  return (
    <div className="stepper" role="group" aria-label={COPY.receive.stepOf(current + 1, steps.length, name)}>
      <ol className="stepper__bars" aria-hidden="true">
        {steps.map((step, index) => (
          <li key={step} className={index <= current ? "stepper__bar stepper__bar--lit" : "stepper__bar"} />
        ))}
      </ol>
      <p className="t-small soft text-center">{COPY.receive.stepOf(current + 1, steps.length, name)}</p>
    </div>
  );
}

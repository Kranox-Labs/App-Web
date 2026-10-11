import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { Icon } from "./Icon.tsx";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string | undefined;
  error?: string | null | undefined;
  /** A note that confirms the value, such as a checked address: it shows with a check in the accent color. */
  good?: string | null | undefined;
  suffix?: string | undefined;
  mono?: boolean;
  /** A small button inside the field at its right, such as "Paste". */
  action?: ReactNode;
};

/** A field of a form with its label above it, in the shapes of the app (LabeledField). */
export function Field({
  label,
  hint,
  error = null,
  good = null,
  suffix,
  mono = false,
  action,
  className,
  ...rest
}: Props) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={error === null ? "field" : "field field--error"}>
      <label className="t-small-strong soft" htmlFor={id}>
        {label}
      </label>
      <div className="field__box">
        <input
          id={id}
          className={["field__input", mono ? "t-mono" : "t-body", className].filter(Boolean).join(" ")}
          aria-describedby={noteId}
          aria-invalid={error !== null}
          {...rest}
        />
        {suffix !== undefined && action === undefined && <span className="t-small-strong soft">{suffix}</span>}
        {action}
      </div>
      {error !== null ? (
        <p id={noteId} className="field__error t-small">
          {error}
        </p>
      ) : good !== null ? (
        <p id={noteId} className="field__good t-small">
          <Icon name="checkCircle" size={14} />
          {good}
        </p>
      ) : (
        hint !== undefined && (
          <p id={noteId} className="t-small faint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

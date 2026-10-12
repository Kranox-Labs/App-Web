import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { create as createQr } from "qrcode";

import { COPY } from "../../copy.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { Link } from "./Link.tsx";
import { showToast } from "./toast.tsx";

/**
 * A page, as PageFrame of the app: the title, a short line below it, and the content below. A centered page puts
 * all of it in one column in the middle, 540 pixels wide or 640 for a form ([wide]); a [full] page, such as the home,
 * takes the whole width with its title at the left. A page that another page opens has a [back] link above its
 * title. The chips of the app under the line (the network, the exchanger) stay out: the owner took them out on
 * 11 Oct 2026.
 */
export function PageFrame({
  title,
  lead,
  back,
  wide = false,
  full = false,
  children,
}: {
  title: string;
  lead?: string | undefined;
  back?: { href: string; label: string } | undefined;
  wide?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  const classes = ["frame", wide && "frame--wide", full && "frame--full"].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {back !== undefined && (
        <Link href={back.href} className="backlink t-small-strong">
          <Icon name="chevronLeft" size={16} />
          {back.label}
        </Link>
      )}
      <h1 className="frame__title t-page-title">{title}</h1>
      {lead !== undefined && <p className="frame__lead t-body-regular soft">{lead}</p>}
      <div className="frame__body">{children}</div>
    </div>
  );
}

/** A card of frosted glass that floats over the picture of the ground, as GlassCard of the app. */
export function Glass({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return <section className={className === undefined ? "glass" : `glass ${className}`}>{children}</section>;
}

/** A card of the look: frosted glass over the drawing of the ground, as Surface of the app. */
export function Surface({
  children,
  warn = false,
  className,
}: {
  children: ReactNode;
  warn?: boolean;
  className?: string | undefined;
}) {
  const classes = ["surface", warn && "surface--warn", className].filter(Boolean).join(" ");
  return <section className={classes}>{children}</section>;
}

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "accent" | "solid" | "quiet" | "heroMain" | "heroAlt";
  small?: boolean;
  expand?: boolean;
  busy?: boolean;
  busyLabel?: string | undefined;
  icon?: IconName | undefined;
};

/** A rounded button with a label, as PillButton of the app. While [busy], it shows a spinner and takes no click. */
export function PillButton({
  tone = "accent",
  small = false,
  expand = false,
  busy = false,
  busyLabel,
  icon,
  className,
  children,
  disabled,
  ...rest
}: PillProps) {
  const classes = ["pill", `pill--${tone}`, small && "pill--small", expand && "pill--expand", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} disabled={disabled || busy} {...rest}>
      {busy ? (
        <span className="spinner spinner--small" />
      ) : (
        icon !== undefined && <Icon name={icon} size={small ? 14 : 18} />
      )}
      {busy ? (busyLabel ?? children) : children}
    </button>
  );
}

/** A round button with an icon, as RoundButton of the app, such as a copy button. */
export function RoundButton({
  icon,
  label,
  small = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={small ? "round round--small" : "round"}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} size={small ? 13 : 19} />
    </button>
  );
}

/** A line of note: plain, a warning, or good news, each with its mark. */
export function Notice({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "warn" | "good" }) {
  return (
    <p className={`notice notice--${tone} t-body-regular`}>
      {tone === "good" && <Icon name="checkCircle" size={16} className="notice__icon" />}
      {tone === "warn" && <Icon name="error" size={16} className="notice__icon" />}
      <span>{children}</span>
    </p>
  );
}

/** A fact of a swap on one line: its name at the left, its value at the right, as SwapFact of the app. */
export function Fact({ label, children, stack = false }: { label: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={stack ? "fact fact--stack" : "fact"}>
      <dt className="fact__key t-body-regular soft">{label}</dt>
      <dd className="fact__value t-body">{children}</dd>
    </div>
  );
}

/** Copies [text] and says so in a toast. A browser without the clipboard leaves the text selectable. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast(COPY.swap.copied);
  } catch {
    // A long press or a drag copies it.
  }
}

/** An address or a hash in full, in the font for addresses, with a round copy button, as the address box of the app. */
export function AddressBox({ text, label }: { text: string; label?: string | undefined }) {
  return (
    <div className="addressbox-wrap">
      {label !== undefined && <p className="t-small-strong soft">{label}</p>}
      <div className="addressbox">
        <p className="addressbox__text t-mono">{text}</p>
        <RoundButton icon="copy" label={COPY.swap.copy} small onClick={() => void copyText(text)} />
      </div>
    </div>
  );
}

/** A QR code of [text] on the cream of the brand, as the app draws one. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, path } = useMemo(() => {
    const modules = createQr(text, { errorCorrectionLevel: "M" }).modules;
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let column = 0; column < modules.size; column++) {
        if (modules.get(row, column)) d += `M${column} ${row}h1v1h-1z`;
      }
    }
    return { size: modules.size, path: d };
  }, [text]);
  return (
    <figure className="qr">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <path d={path} fill="#0f0d0c" />
      </svg>
    </figure>
  );
}

/** The ring of the privacy check: one arc for each rule, lit when it passes, with the count inside, as the app. */
export function Ring({ parts }: { parts: readonly boolean[] }) {
  const box = 84;
  const stroke = 7;
  const gap = 5;
  const radius = (box - stroke) / 2;
  const center = box / 2;
  const step = (2 * Math.PI) / parts.length;
  // A round end reaches half the stroke past its arc, so the room between two arcs counts the stroke too.
  const room = (gap + stroke) / radius;
  const point = (angle: number) =>
    `${(center + radius * Math.cos(angle)).toFixed(2)} ${(center + radius * Math.sin(angle)).toFixed(2)}`;
  const lit = parts.filter(Boolean).length;
  return (
    <div className="ring" aria-hidden="true">
      <svg viewBox={`0 0 ${box} ${box}`}>
        {parts.map((on, index) => {
          const start = -Math.PI / 2 + step * index + room / 2;
          const end = start + step - room;
          const large = end - start > Math.PI ? 1 : 0;
          return (
            <path
              key={index}
              className={on ? "ring__arc ring__arc--lit" : "ring__arc"}
              d={`M ${point(start)} A ${radius} ${radius} 0 ${large} 1 ${point(end)}`}
            />
          );
        })}
      </svg>
      <div className="ring__inner">
        <span className="t-board-title">
          {lit}/{parts.length}
        </span>
        <span className="t-unit-label soft">{COPY.privacy.clear}</span>
      </div>
    </div>
  );
}

export interface Step {
  title: string;
  text?: string | undefined;
}

/** How the step now ends, when a swap stops before its last step. */
export type StepEnd = "failed" | "held" | "refunded" | "expired" | null;

/** The steps of a swap, one under the other, with the marks of the app: done, now, and to come. */
export function Steps({ steps, current, end = null }: { steps: readonly Step[]; current: number; end?: StepEnd }) {
  return (
    <ol className="steps">
      {steps.map((step, index) => {
        const done = index < current;
        const now = index === current;
        const state = done ? "step--done" : now ? "step--now" : "";
        return (
          <li key={step.title} className={`step ${state}`}>
            <span className="step__mark" aria-hidden="true">
              {done ? (
                <Icon name="check" size={14} />
              ) : now && end === null ? (
                <span className="spinner" />
              ) : now && end === "held" ? (
                <Icon name="pause" size={14} />
              ) : now && end === "refunded" ? (
                <Icon name="undo" size={14} />
              ) : now ? (
                <Icon name="priorityHigh" size={14} />
              ) : null}
            </span>
            {index < steps.length - 1 && <span className={done ? "step__line step__line--reached" : "step__line"} />}
            <div className="step__body">
              <p className="step__title t-card-title">{step.title}</p>
              {step.text !== undefined && <p className="t-small soft">{step.text}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One rule of the privacy check as a row: its mark, its name, and what it found, as the rows of the menu Privacy. */
export function RuleRow({ state, title, text }: { state: "pass" | "warn" | "off"; title: string; text: string }) {
  return (
    <li className="rule">
      <span className={`rule__mark rule__mark--${state}`} aria-hidden="true">
        {state === "pass" && <Icon name="check" size={18} />}
        {state === "warn" && <Icon name="priorityHigh" size={18} />}
      </span>
      <div className="rule__body">
        <p className="t-card-title">{title}</p>
        <p className="t-body-regular soft">{text}</p>
      </div>
    </li>
  );
}

/** A row of a list, as a transfer of the activity of the app: a round icon, two lines, and an amount at the right. */
export function ListRow({
  href,
  icon,
  tone,
  title,
  subtitle,
  amount,
  unit,
}: {
  href: string;
  icon: IconName;
  tone: "accent" | "solid" | "danger";
  title: string;
  subtitle: string;
  amount?: string | undefined;
  unit?: string | undefined;
}) {
  return (
    <Link href={href} className="listrow">
      <span className={`listrow__icon listrow__icon--${tone}`} aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <span className="listrow__body">
        <span className="t-card-title">{title}</span>
        <span className="t-small soft">{subtitle}</span>
      </span>
      {amount !== undefined && (
        <span className="listrow__amount">
          <span className="t-row-figure">{amount}</span>
          {unit !== undefined && <span className="t-unit-label soft">{unit}</span>}
        </span>
      )}
    </Link>
  );
}

/** A row to pick, such as a chain: a round mark, a name, a line, and a check when it is the one picked. */
export function Pick({
  on,
  soon = false,
  logo,
  title,
  text,
  onClick,
}: {
  on: boolean;
  soon?: boolean;
  logo: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={on ? "pick pick--on" : "pick"} aria-pressed={on} disabled={soon} onClick={onClick}>
      <span className="pick__mark" aria-hidden="true">
        <img className="pick__logo" src={logo} alt="" />
      </span>
      <span className="pick__body">
        <span className="t-card-title">{title}</span>
        <span className="t-small soft">{text}</span>
      </span>
      <span className="pick__end">
        {soon ? (
          <span className="tag">{COPY.receive.soon}</span>
        ) : (
          on && <Icon name="checkCircle" size={20} className="accent" />
        )}
      </span>
    </button>
  );
}

/** A card to choose, such as the rate of a swap, as the two cards of the rate of the app. */
export function ChoiceCard({
  on,
  icon,
  title,
  text,
  note,
  onClick,
}: {
  on: boolean;
  icon: IconName;
  title: string;
  text: string;
  note: string | null;
  onClick: () => void;
}) {
  return (
    <button type="button" className={on ? "choice choice--on" : "choice"} aria-pressed={on} onClick={onClick}>
      <span className="choice__head">
        <Icon name={icon} size={18} className={on ? "accent" : "soft"} />
        <span className="t-card-title">{title}</span>
        {on && <Icon name="checkCircle" size={18} className="accent choice__check" />}
      </span>
      <span className="t-body-regular soft">{text}</span>
      {note !== null && <span className="t-small-strong">{note}</span>}
    </button>
  );
}

/** A box of the form of a swap: its label, the figure, the coin at the right, and notes under it, as the app. */
export function SwapBox({
  label,
  coin,
  notes,
  children,
}: {
  label: string;
  coin: ReactNode;
  notes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="swapbox">
      <p className="t-label soft">{label}</p>
      <div className="swapbox__row">
        <div className="swapbox__figure">{children}</div>
        {coin}
      </div>
      {notes !== undefined && <div className="swapbox__notes">{notes}</div>}
    </div>
  );
}

/** The coin of a box of the form: its code and where it lives, and, with [menu], the choice of another coin. */
export function CoinPill<T extends string>({
  code,
  sub,
  menu,
}: {
  code: string;
  sub: string;
  menu?: { options: readonly T[]; value: T; onChange: (value: T) => void } | undefined;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (box.current !== null && !box.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);
  const body = (
    <>
      <span className="coin__code t-card-title">{code}</span>
      <span className="coin__sub t-small soft">{sub}</span>
    </>
  );
  if (menu === undefined) return <span className="coin">{body}</span>;
  return (
    <div className="coin-menu" ref={box}>
      <button
        type="button"
        className="coin coin--button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="coin__text">{body}</span>
        <Icon name="chevronDown" size={20} className="soft" />
      </button>
      {open && (
        <ul className="coin-menu__list" role="listbox">
          {menu.options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === menu.value}
                className="coin-menu__item"
                onClick={() => {
                  menu.onChange(option);
                  setOpen(false);
                }}
              >
                <span className="t-card-title">{option}</span>
                <span className="t-small soft">{sub}</span>
                {option === menu.value && <Icon name="check" size={16} className="accent coin-menu__check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

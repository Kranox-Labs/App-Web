import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { navigate } from "../../router.ts";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** A link inside the app: it changes the path without a load of the page. A click with a modifier key opens a tab. */
export function Link({ href, onClick, children, ...rest }: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

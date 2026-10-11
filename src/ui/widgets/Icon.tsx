// The icons of the app: the rounded Material icons that the Mac app draws, as SVG from the package, inlined so
// that they take the color of the text around them.
import accountBalanceWallet from "@material-design-icons/svg/round/account_balance_wallet.svg?raw";
import arrowDownward from "@material-design-icons/svg/round/arrow_downward.svg?raw";
import arrowOutward from "@material-design-icons/svg/round/arrow_outward.svg?raw";
import callReceived from "@material-design-icons/svg/round/call_received.svg?raw";
import check from "@material-design-icons/svg/round/check.svg?raw";
import checkCircle from "@material-design-icons/svg/round/check_circle.svg?raw";
import chevronLeft from "@material-design-icons/svg/round/chevron_left.svg?raw";
import close from "@material-design-icons/svg/round/close.svg?raw";
import contentCopy from "@material-design-icons/svg/round/content_copy.svg?raw";
import errorIcon from "@material-design-icons/svg/round/error.svg?raw";
import expandMore from "@material-design-icons/svg/round/expand_more.svg?raw";
import history from "@material-design-icons/svg/round/history.svg?raw";
import home from "@material-design-icons/svg/round/home.svg?raw";
import lock from "@material-design-icons/svg/round/lock.svg?raw";
import logout from "@material-design-icons/svg/round/logout.svg?raw";
import menu from "@material-design-icons/svg/round/menu.svg?raw";
import pause from "@material-design-icons/svg/round/pause.svg?raw";
import priorityHigh from "@material-design-icons/svg/round/priority_high.svg?raw";
import trendingUp from "@material-design-icons/svg/round/trending_up.svg?raw";
import undo from "@material-design-icons/svg/round/undo.svg?raw";
import visibilityOff from "@material-design-icons/svg/round/visibility_off.svg?raw";

const ICONS = {
  arrowDown: arrowDownward,
  arrowOutward,
  check,
  checkCircle,
  chevronDown: expandMore,
  chevronLeft,
  close,
  copy: contentCopy,
  error: errorIcon,
  history,
  home,
  lock,
  logout,
  menu,
  pause,
  priorityHigh,
  privacy: visibilityOff,
  receive: callReceived,
  trendingUp,
  undo,
  wallet: accountBalanceWallet,
} as const;

export type IconName = keyof typeof ICONS;

/** One icon at [size] pixels, in the color of the text around it. */
export function Icon({
  name,
  size = 15,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string | undefined;
}) {
  return (
    <span
      className={className === undefined ? "icon" : `icon ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

import type { ChainAsset, FromChain, ProviderId, SwapStatus } from "./door/types.ts";

/** Where the support of the exchanger answers. CHECKED 5 Oct 2026 for the app; the same address here. */
export const EXCHANGER_SUPPORT = "support@changenow.io";

/** The words of the app, in sentence case. Each page reads its words here. */
export const COPY = {
  appName: "Kranox",

  nav: {
    home: "Home",
    receive: "Receive",
    activity: "Activity",
    privacy: "Privacy",
    menu: "Menu",
    pages: "Pages",
    openMenu: "Open the menu",
    closeMenu: "Close the menu",
  },

  legal: {
    label: "Legal pages",
    privacy: "Privacy",
    disclosures: "Disclosures",
    terms: "Terms",
  },

  sidebar: {
    noWallet: "No wallet",
    connectToReceive: "Connect one to receive",
    anotherNetwork: "Another network",
    sampleTitle: "Sample data",
    sampleNote: "The relay is not connected yet. Every number and address here is made up, and nothing is sent.",
    relayTitle: "Relay",
  },

  wallet: {
    connect: "Connect wallet",
    connecting: "Connecting…",
    choose: "Choose a wallet",
    none: "No wallet found in this browser.",
    noneHint: (host: string) =>
      `On a phone, open ${host} inside the browser of your wallet app, such as MetaMask or Rabby. On a desktop, add a wallet extension to the browser and come back.`,
    sample: "Use a sample address",
    wrongChain: "Your wallet is on another network. The coins arrive on Robinhood Chain.",
    switchChain: "Switch to Robinhood Chain",
    forget: "Forget this wallet",
    address: "Your address on Robinhood Chain",
    checkedAddress: "Robinhood Chain address",
    through: (name: string) => `Through ${name}`,
  },

  home: {
    greeting: (hour: number) =>
      hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    lead: "Your keys stay in your wallet. Kranox holds none.",
    balance: "Balance",
    updating: "Reading the balance…",
    noWallet: "No wallet connected",
    noWalletText: "Connect one to see its balance and to receive into it.",
    receive: "Receive",
    send: "Send",
    soon: "Soon",
    address: "Your address",
    onChain: "On Robinhood Chain",
    privacyTitle: "Privacy",
    privacyGood: "No swap in the last day. A good time for the next one.",
    privacyWait: (ago: string) => `Your last swap was ${ago}. Leave a day between swaps when you can.`,
    privacyLink: "See the checks",
    recent: "Recent activity",
    all: "All activity",
    none: "No swaps yet. Receive into your wallet to see them here.",
  },

  receive: {
    title: "Receive",
    steps: ["Chain", "Amount", "Provider", "Privacy", "Transaction"],
    stepOf: (step: number, total: number, name: string) => `Step ${step} of ${total} · ${name}`,
    chainLead: "Where do the coins come from?",
    amountLead: "How much, and which coin arrives in your wallet.",
    providerLead: "Who turns your XMR into the coin on Robinhood Chain.",
    privacyLead: "What this swap gives away, checked in this browser before you open the door.",
    transactionLead: "Where a refund goes if the swap fails, then the review.",
    sampleLead: "Sample data: nothing is sent, and no swap is made anywhere.",
    continue: "Continue",
    soon: "Soon",
    youSend: "You send",
    youGet: "You get",
    onMonero: "On Monero",
    onChain: "On Robinhood Chain",
    amountHint: "0.00",
    rangeHint: (min: string, max: string) => `From ${min} to ${max} XMR`,
    belowMin: (min: string) => `The least that goes through is ${min} XMR.`,
    aboveMax: (max: string) => `The most that goes through is ${max} XMR.`,
    badAmount: "Digits and one point only.",
    tooManyDecimals: (max: number) => `At most ${max} decimals.`,
    sampleWalletRefused: "The sample wallet cannot open a real swap. Connect a wallet of yours.",
    quoteNext: "The provider shows what you get, on the next step.",
    quoting: "Getting the quote…",
    quoteFailed: "The quote did not come. Try again in a moment.",
    youGetLine: (amount: string, asset: ChainAsset) => `${amount} ${asset}`,
    rateLine: (rate: string, asset: ChainAsset) => `1 XMR ≈ ${rate} ${asset}`,
    fixedLine: (time: string) => `Fixed rate, good for ${time}`,
    feeLine: (fee: string, asset: ChainAsset) => `The network fee of ${fee} ${asset} is already taken off.`,
    speedLine: (minutes: string) => `About ${minutes} minutes after your XMR confirms.`,
    rangeFrom: (min: string) => `From ${min} XMR`,
    sees: "What it sees",
    rate: "Rate",
    fixedRate: "Fixed rate",
    fixedText: "Exact amount",
    floatingRate: "Floating rate",
    floatingText: "Can move a little",
    minLine: (min: string) => `Min ${min} XMR`,
    arrivesAt: "Arrives at",
    connectFirst: "Connect the wallet that receives to go on.",
    useAnother: "Use another wallet",
    refundField: "Your Monero address for a refund",
    refundHint: "A Monero mainnet address: 95 characters that start with 4 or 8",
    refundInvalid: "That is not a Monero mainnet address.",
    refundValid: "Monero address",
    paste: "Paste",
    refundTip:
      "Use a new subaddress of your Monero wallet, not one that took part in a swap before. A refund is rare: it comes only when the provider cannot complete the swap.",
    review: "Before you open the door",
    to: "To",
    provider: "Provider",
    rateLabel: "Rate",
    fixedFor: (time: string) => `Fixed, good for ${time}`,
    floating: "Floating",
    quoteRanOut: "The quote ran out. Getting a new one…",
    refundTo: "Refund to",
    open: "Open the door",
    opening: "Opening…",
    failed: "The swap could not start. Try again in a moment.",
  },

  chains: {
    XMR: { name: "Monero", coin: "XMR", text: "Private by default. The way in that works today." },
    ZEC: { name: "Zcash", coin: "ZEC", text: "Shielded coins. On the road ahead." },
    STRK: { name: "Starknet", coin: "STRK", text: "On the road ahead." },
    ALEO: { name: "Aleo", coin: "ALEO", text: "On the road ahead." },
  } satisfies Record<FromChain, { name: string; coin: string; text: string }>,

  providers: {
    changenow: {
      name: "ChangeNOW",
      text: "An exchange without an account.",
      sees: "The amount, the time, the deposit, and the address that receives. Never your keys, and never your IP address: Kranox asks it through its relay.",
    },
  } satisfies Record<ProviderId, { name: string; text: string; sees: string }>,

  connect: {
    title: "Connect",
    lead: "The coins arrive at the address of the wallet you connect. Kranox reads the address and asks the wallet to sign nothing.",
    checking: "Reading the public history of this address…",
    fresh: "A fresh address: no transfers on Robinhood Chain yet. A clean start.",
    unchecked: "Kranox could not read the history of this address. You can still go on.",
    continue: "Continue",
    backHome: "Back to home",
  },

  swap: {
    back: "Activity",
    sendExactly: (amount: string) => `Send exactly ${amount} XMR`,
    into: (xmr: string, amount: string, asset: ChainAsset) => `${xmr} XMR into ${amount} ${asset}`,
    lead: "From your own Monero wallet, to this address, in one payment. The rate holds until the time runs out.",
    depositAddress: "Deposit address",
    copy: "Copy",
    copied: "Copied",
    openWallet: "Open in your Monero wallet",
    timeLeft: (time: string) => `${time} left to send`,
    expired: "The time to send ran out. Do not send to this address now.",
    steps: {
      waiting: "Waiting for your deposit",
      confirming: "Confirming on Monero",
      exchanging: "Exchanging",
      sending: "Sending to your wallet",
      finished: "Done",
    },
    arrived: (amount: string, asset: ChainAsset) => `${amount} ${asset} arrived in your wallet.`,
    failed: "The swap failed. The provider sends the XMR back to your refund address.",
    refunded: (amount: string | null) =>
      amount === null
        ? "The provider sent the XMR back to your refund address."
        : `The provider sent ${amount} XMR back to your refund address.`,
    verifying: `ChangeNOW stopped this swap to check it. Write to ${EXCHANGER_SUPPORT} with the swap ID; Kranox cannot release it.`,
    expiredStep: `ChangeNOW stopped waiting before it took in the XMR. If you sent it after all, write to ${EXCHANGER_SUPPORT} with the swap ID.`,
    youGet: "You get",
    recipient: "Arrives at",
    refundTo: "Refund to",
    id: "Swap ID",
    started: "Started",
    checked: "Last checked",
    depositHash: "Your deposit on Monero",
    payoutHash: "The transaction on Robinhood Chain",
    refundHash: "The refund on Monero",
    unknown: "This browser holds no swap with this ID.",
  },

  relay: {
    down: "The relay did not answer. Check your connection and try again.",
    failed: "The relay answered in a way the app cannot use. Try again in a moment.",
  },

  activity: {
    title: "Activity",
    lead: "The swaps you made in this browser. Kranox keeps them here and nowhere else: clear the data of this site, and they are gone.",
    empty: "No swaps in this browser yet.",
    forget: "Forget all swaps",
    forgetSure: "Forget them all now",
  },

  privacy: {
    title: "Privacy",
    lead: "What the door can tell before you open it, worked out in this browser from your own swaps here and the public history of an address.",
    shows: "What the next swap shows",
    clear: "clear",
    allClear: "All clear",
    toImprove: (count: number) => (count === 1 ? "1 thing to improve" : `${count} things to improve`),
    inBrowser: "The check runs in this browser. It advises and blocks nothing.",
    address: "Address",
    amount: "Amount",
    timing: "Timing",
    addressClear: "It took part in none of your swaps here.",
    addressUnchecked: "Not read on Robinhood Chain yet.",
    addressNone: "Connect a wallet to check the address that receives.",
    amountClear: "It matches none of your swaps of the last week.",
    amountNone: "Start a receive to check the amount.",
    timingClear: "No swap of yours in the last day.",
    scanTitle: "Scan an address",
    scanLead: "Any address on Robinhood Chain: its public history, and its part in your swaps here.",
    scanField: "Address on Robinhood Chain",
    scanHint: "0x and 40 hex digits",
    scanNote:
      "Kranox asks the explorer through its relay, so the explorer never sees your IP address, and the relay keeps no record.",
    scanAction: "Scan",
    scanning: "Scanning…",
    scanInvalid: "That is not a Robinhood Chain address.",
    scanFailed: "The scan did not come. Try again in a moment.",
    scanShows: (short: string) => `What ${short} shows`,
    transfers: (count: number) =>
      count === 0 ? "No transfers yet" : count === 1 ? "1 transfer" : `${count} transfers`,
    firstSeen: (day: string) => `First seen ${day}`,
    inSwaps: (count: number) =>
      count === 0
        ? "In none of your swaps here"
        : count === 1
          ? "In 1 of your swaps here"
          : `In ${count} of your swaps here`,
  },
} as const;

/** The state of a swap in a list, in the words of its page. */
export function stageText(status: SwapStatus): string {
  switch (status) {
    case "new":
    case "waiting":
      return COPY.swap.steps.waiting;
    case "confirming":
      return COPY.swap.steps.confirming;
    case "exchanging":
      return COPY.swap.steps.exchanging;
    case "sending":
      return COPY.swap.steps.sending;
    case "finished":
      return COPY.swap.steps.finished;
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "verifying":
      return "Held for a check";
    case "expired":
      return "Ran out of time";
  }
}

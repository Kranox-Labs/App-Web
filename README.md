# Kranox web app

The web app of Kranox: the gate into Robinhood Chain from any private chain, and back out, in the shape of a wallet.
The user connects their wallet on Robinhood Chain. In walks through the chain the coins come from, the amount, the
provider, the privacy review, and the transaction: the user sends the coins from their own wallet of that chain, XMR
from a Monero wallet, STRK from a Starknet wallet, or ZEC from a Zcash wallet, and the coins arrive in the wallet they
connected. Out walks through the chain the coins go to, the amount of USDG or ETH to send, the provider, the address
on that chain with the privacy review, and the review: the connected wallet then sends the deposit, one transfer that
the user confirms in it, and the coins arrive at the address they gave. The app holds no keys, opens no account, and
keeps the swaps of the user in the browser only. It runs in the browser of a phone and of a desktop.

The app talks to the relay of Kranox ([Kranox-Labs/Relay](https://github.com/Kranox-Labs/Relay)), which holds the key
of the exchanger. Each request carries a nonce, and the app trusts an answer only with the signature of the relay over
that request and that answer. The balances of the wallet come through the wallet itself.

## Run

```sh
pnpm install
pnpm dev
```

The dev server talks to the live relay of Kranox (`.env.development`), so every quote, scan, and swap is real; the
relay answers the origin `http://localhost:5181`, the port of `vite.config.ts`. To talk to a relay on your machine, put `VITE_RELAY_URL` and
`VITE_RELAY_SIGNING_KEYS` into `.env.relay.local` and run `pnpm dev:relay`; `.env.example` explains each value. `pnpm build` checks the types and writes the static files
of the build for `app.kranox.cash` to `dist/`, with the values of `.env.production`. `pnpm test` runs the tests,
`pnpm lint` the linter, and `pnpm format` Prettier.

## Layout

- `src/config.ts`: the settings of the build, checked before the app starts.
- `src/gate/`: the shapes of the relay, the client of the relay, the check of the signatures, the chains the coins
  come from and their addresses, the catalog of providers, the swaps kept in the browser, the privacy check, and the
  swap under way.
- `src/wallet/`: the wallet of the user, found through EIP-6963 and connected through EIP-1193, its balances, and
  the one transfer of the way out, which the wallet signs and sends itself.
- `src/ui/`: the shell, the pages (the home, the steps of in and of out, connect, a swap, the activity, privacy), and
  the widgets.
- `src/assets/chains/`: the official marks of the chains the coins can come from, each file with its source; the marks
  belong to their projects.
- `src/styles/`: the design tokens and the base styles, after the dark look of the Kranox app.
- `test/`: the tests of the logic that touches money and trust: the signatures, the settings, the balances, the
  transfer of the way out, the amounts, the addresses of each chain, the catalog of the providers, the quotes and the
  ranges, the store, the router, the client of the relay, and the privacy check.

## License

The web app is free software under the GNU General Public License, version 3. `LICENSE` in this repository holds the
text. A copy that you share must come with its source under the same license.

# Kranox Door

The web app of Kranox: a private door into Robinhood Chain, in the shape of a wallet. The user connects the wallet
that receives, and receive walks through the chain the coins come from, the amount, the provider, the privacy review,
and the transaction: the user sends XMR from their own Monero wallet, and the coins arrive in the wallet they
connected. The app holds no keys, opens no account, and keeps the swaps of the user in the browser only. It runs in
the browser of a phone and of a desktop.

The app talks to the relay of Kranox ([Kranox-Labs/Relay](https://github.com/Kranox-Labs/Relay)), which holds the key
of the exchanger. Each request carries a nonce, and the app trusts an answer only with the signature of the relay over
that request and that answer. The balances of the wallet come through the wallet itself.

## Run

```sh
pnpm install
pnpm dev
```

The dev server runs on sample data (`.env.development`): no relay, no network, and no swap anywhere. To talk to a relay
on your machine, put `VITE_SAMPLE_DATA=false`, `VITE_RELAY_URL`, and `VITE_RELAY_SIGNING_KEYS` into
`.env.development.local`; `.env.example` explains each value. `pnpm build` checks the types and writes the static files
of the build for `app.kranox.cash` to `dist/`, with the values of `.env.production`. `pnpm test` runs the tests,
`pnpm lint` the linter, and `pnpm format` Prettier.

## Layout

- `src/config.ts`: the settings of the build, checked before the app starts.
- `src/door/`: the shapes of the relay, the client of the relay and the sample client, the check of the signatures,
  the swaps kept in the browser, the privacy check, and the swap under way.
- `src/wallet/`: the wallet of the user, found through EIP-6963 and connected through EIP-1193, and its balances.
- `src/ui/`: the shell, the pages (the home, the steps of receive, connect, a swap, the activity, privacy), and the
  widgets.
- `src/styles/`: the design tokens and the base styles, after the dark look of the Kranox app.
- `test/`: the tests of the logic that touches money and trust: the signatures, the settings, the balances, the
  amounts, and the privacy check.

## License

The door is free software under the GNU General Public License, version 3. `LICENSE` in this repository holds the
text. A copy that you share must come with its source under the same license.

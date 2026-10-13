# Crypto Opportunity Scout

A cloud-hosted public-source crypto opportunity research prototype. It collects ecosystem feeds and campaign-directory links, checks source pages for reward and cost evidence, and publishes only leads that pass its current strict economics gate.

## Current status

- Hosted on Cloudflare Workers, with report storage in Workers KV.
- Scheduled collection is configured for 08:15 UTC daily.
- The homepage loads the stored report; it does not automatically launch a new collection on every visit.
- The collector checks public RSS/Atom feeds and campaign directories. Sources may be unavailable, block automated requests, change format, or publish irrelevant items.
- The current publication rule is deliberately strict. An empty report means no candidate passed the current evidence threshold; it does not prove that no worthwhile opportunities exist.
- The assessment is a research filter, not financial advice, a guarantee of reward, or a statistically validated expected-return model. Payout probability, eligibility uncertainty and time cost may remain unquantified.
- The $1 detailed-report checkout remains locked to test mode and must not be switched to live payments without explicit approval and end-to-end verification.

## Safety and evidence policy

A campaign-directory listing is not proof that a campaign is open, legitimate, or pays a reward. A candidate should only be labelled worthwhile when its official source supports a fixed per-person fiat or stablecoin reward, open status, no required capital, and no uncovered fees. Reward claims remain unconfirmed until independently verified. Never share a seed phrase or private key, and never sign a transaction solely because this service lists a lead.

## Routes

- `GET /` — public digest page
- `GET /api/daily` — latest stored digest as JSON
- `GET /api/refresh` or `POST /api/refresh` — manually run collection; rate-limited by a five-minute lock
- `POST /admin/collect` — manual collection protected by `SCOUT_ADMIN_TOKEN`
- `POST /checkout` — test-only detailed-report checkout
- `POST /webhooks/shieldz` — signed payment webhook
- `GET /report?order=...&token=...` — access-controlled report after a matching paid event

## Development and tests

Requires Node.js 22 or later.

```sh
npm test
```

GitHub Actions runs the test suite on pushes and pull requests. The deployment workflow publishes changes to `src/**`, `wrangler.toml`, and its own workflow file to Cloudflare Workers.

## Deployment notes

The deployment workflow finds or creates the `SCOUT_KV` namespace and binds it to the Worker. It requires a GitHub Actions secret named `CLOUDFLARE_API_TOKEN` with the required Cloudflare account and Workers/KV permissions.

The checkout is intentionally guarded: use only a Shieldz `sk_test_` key, a test webhook secret, and the intended Base/USDC test settlement address. Do not enable real payments until provider requirements, webhook semantics, privacy, refunds/support and applicable legal/tax obligations have been reviewed. The paid report currently packages one selected public-source lead; it is not an independently guaranteed earning opportunity.

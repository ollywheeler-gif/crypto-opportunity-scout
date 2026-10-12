# Crypto Opportunity Scout MVP — cloud-only starter

## What's included
- Public digest page and JSON endpoint.
- Scheduled RSS/Atom collection from example public ecosystem feeds.
- Simple keyword categorization; it is not an LLM and does not verify rewards.
- Hosted invoice creation placeholder using the previously discussed Shieldz endpoint.
- Signed-webhook validation pattern, timestamp tolerance, invoice/order matching, delivery deduplication, and paid-report gate.
- Admin collection endpoint protected by a secret.

## Critical before live use
This is not deployed, audited, or provider-verified. The payment request intentionally does not guess a provider-specific Base/USDC settlement payload. Configure the accepted asset/network in the merchant dashboard if supported and confirm the API schema. Before production, validate the paid event's amount, asset, network, invoice status and confirmations against the provider's current docs. Verify signature header/algorithm exactly against the provider's docs. Do not accept real payments until end-to-end tests pass.

The product is priced at USD $1.00 (100 cents), not GBP £1. The current paid report is the latest feed digest, not independently verified earning opportunities. Don't advertise rewards as guaranteed.

## Deploy from Cloudflare dashboard
1. Create Worker and paste `src/worker.js` in its editor, then deploy.
2. Create KV namespace `SCOUT_KV` under Storage & databases > KV and bind it to this Worker as `SCOUT_KV`.
3. Add Worker secrets `SHIELDZ_API_KEY` (test key first), `SHIELDZ_WEBHOOK_SECRET`, and `SCOUT_ADMIN_TOKEN` (long random token).
4. Add a daily Cron Trigger, e.g. `15 8 * * *` UTC.
5. Configure Shieldz test checkout and webhook URL `https://YOUR-WORKER.workers.dev/webhooks/shieldz`.
6. Test signature rejection, stale timestamps, duplicate delivery, mismatched invoice, unpaid report access and successful test payment.
7. Only switch live after confirming provider details, privacy notice, support/refund policy and applicable legal/tax requirements.

## Routes
GET / public digest
GET /api/daily digest JSON
POST /checkout creates invoice
POST /webhooks/shieldz payment webhook
GET /report?order=...&token=... paid report
POST /admin/collect manually refreshes digest

## Free limits
Cloudflare free quotas apply. No paid AI API is used; categorization is rule-based. Source feeds can change or contain irrelevant items. The app has no email delivery yet; the checkout response returns a report URL. For a small MVP KV is used, not a transactional database.

# Broker feasibility research — no broker selected

Date reviewed: 2026-10-13
Status: Preliminary public-source comparison only. This is not a broker recommendation or proof that any symbol is feasible at £200.

## Why exact MT5 symbol specifications matter

A broker's marketing minimum, a platform's minimum volume and a symbol's tick-value/margin settings are not interchangeable. The final feasibility calculation must be populated from the exact MT5 symbol specification and confirmed tester/account settings: minimum volume, volume step, contract size, tick size, tick value in account currency, stops/freeze levels, margin, spread, commission, swaps and session hours. Public product pages cannot replace those fields.

## Public-source candidates to investigate

### Pepperstone UK — MT5 CFD account

Official MT5 page: https://pepperstone.com/en-gb/platforms/metatrader-5

- Pepperstone offers MT5 and lists FX, indices and commodities.
- Its UK account/pricing pages describe Standard CFD pricing with costs built into the spread and overnight funding, and Razor FX/spot-gold pricing with raw spreads plus commission. The published Razor commission starts at £2.25 per lot per side; the page also notes a small-lot commission rounding rule.
- Official account-cost details: https://pepperstone.com/en-gb/ways-to-trade/trading-accounts/
- Official CFD contract-size explanation: https://pepperstone.com/en-gb/insights/guides/cfds/what-is-cfd-trading

**Feasibility implications:** FX micro sizing may be available, but exact MT5 minimum volume, symbol suffix, tick value, margin and financing must be read from the specific account's symbol specification. A 0.01-lot marketing minimum does not make an ATR-stop strategy fit a £0.25–£0.50 loss budget.

### IG UK — MT5 CFD account

Official MT5 market availability: https://www.ig.com/uk/help-and-support/articles/682622-what-markets-can-i-trade-on-mt5

- IG's MT5 product set includes major FX pairs, key indices and selected commodities.
- The published general forex CFD product page describes standard and mini contract sizes, but platform-specific minimum sizes must be checked in the MT5 account; do not infer MT5 terms from IG's MT4 page.
- Official FX product details: https://www.ig.com/uk/help-and-support/articles/681874-forex-cfd-product-details
- Official spot-metals funding and minimum-size details: https://www.ig.com/uk/help-and-support/articles/681831-commodities-cfd-product-details

**Feasibility implications:** A market can be available on MT5 yet be too coarse for a £200 account. Verify the exact instrument's minimum size and margin before considering it for a bot.

## Provisional risk calculation — illustrative only

The current v1 strategy gates target 0.25% equity risk and reject if modeled minimum-volume loss exceeds 0.50% equity. At £200 equity, those amounts are £0.50 target and £1.00 hard modeled cap.

For FX, a 0.01-lot position commonly represents 1,000 units of base currency. A 10-pip stop can therefore be around £0.70–£1.00 before costs for a typical major pair, depending on the pair and conversion rate. That is already above the £0.50 hard cap. This is an illustration, not a substitute for exact broker tick-value calculations.

For spot gold and index CFDs, contract sizes and point values vary considerably by broker. No general lot-size assumption is acceptable.

## Decision and next action

No broker is selected and no account has been opened. Research can continue against public specifications, but a broker-specific feasibility PASS requires exact MT5 symbol metadata. If the public data are insufficient, the owner may eventually need to choose a demo broker; do not request credentials or fund an account in chat.

Do not alter stop distances, increase test equity, assume unrealistic leverage, or ignore minimum-volume limits to make a candidate appear feasible.

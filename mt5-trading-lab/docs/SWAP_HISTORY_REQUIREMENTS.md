# STRAT-010 historical swap / financing data requirements

STRAT-010 remains unimplemented until financing history can be defended. Current swap rates from a symbol specification must not be projected backward over a multi-year backtest.

## Minimum evidence
For each candidate FX symbol and every historical trading date in the proposed test period, record:
- Broker and exact MT5 symbol name/suffix.
- Historical long and short swap rates and their unit/mode (points, base currency, margin currency or account currency).
- Rollover weekday and any triple/holiday rollover multipliers.
- Conversion rates required to translate the financing charge to account currency.
- Effective dates for rate changes and the official source or archived statement supporting each observation.
- Broker server timezone and rollover timestamp conventions.

The blank `research/swap_history_template.csv` is a schema, not data. Do not fill missing dates with today's swap rates or smooth over rollover changes.

## Allowed alternatives
- A broker may provide an official historical financing schedule or downloadable statement data.
- If no defensible historical series exists, leave STRAT-010 blocked or redesign it as a prospective demo-only observation study. Do not present a backtest based on current swap rates as historical performance evidence.

## Required reconciliation
The MT5 tester's reported swap per trade must be reconciled against the source schedule and converted to account currency. Commission, spread, swap and slippage must each be included exactly once in the normalized ledger.

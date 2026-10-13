"""Broker-input feasibility check; never estimates missing contract economics."""
import argparse
import csv
import json
import math
from pathlib import Path

REQUIRED = {
    "broker", "symbol", "account_equity_gbp", "minimum_volume", "tick_size",
    "tick_value_account_ccy", "stop_distance_price", "spread_cost_at_minimum_volume_account_ccy",
    "commission_round_turn_at_minimum_volume_account_ccy", "slippage_allowance_at_minimum_volume_account_ccy",
    "gap_allowance_at_minimum_volume_account_ccy", "swap_expected_at_minimum_volume_account_ccy",
    "fx_conversion_rate",
}

def evaluate(row, risk_cap_pct=0.5):
    if not math.isfinite(risk_cap_pct) or risk_cap_pct <= 0:
        raise ValueError("risk_cap_pct must be finite and positive")
    missing = sorted(k for k in REQUIRED if not str(row.get(k, "")).strip())
    if missing:
        raise ValueError("Missing required broker inputs: " + ", ".join(missing))
    def num(key):
        try:
            value = float(row[key])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{key} must be numeric") from exc
        if not math.isfinite(value):
            raise ValueError(f"{key} must be finite")
        return value
    equity = num("account_equity_gbp")
    volume = num("minimum_volume")
    volume_step_text = str(row.get("volume_step", "")).strip()
    if volume_step_text:
        volume_step = num("volume_step")
        if volume_step <= 0 or abs(volume / volume_step - round(volume / volume_step)) > 1e-7:
            raise ValueError("minimum_volume must be a positive multiple of volume_step")
    tick_size = num("tick_size")
    tick_value = num("tick_value_account_ccy")
    stop_distance = num("stop_distance_price")
    fx = num("fx_conversion_rate")  # account-currency units per GBP
    if equity <= 0 or volume <= 0 or tick_size <= 0 or tick_value <= 0 or stop_distance < 0 or fx <= 0:
        raise ValueError("Equity, volume, tick size/value and FX rate must be positive; stop distance cannot be negative")
    costs = sum(num(k) for k in (
        "spread_cost_at_minimum_volume_account_ccy", "commission_round_turn_at_minimum_volume_account_ccy",
        "slippage_allowance_at_minimum_volume_account_ccy", "gap_allowance_at_minimum_volume_account_ccy",
        "swap_expected_at_minimum_volume_account_ccy",
    ))
    # Cost inputs are expected as non-negative loss allowances, including any
    # expected financing debit. Negative values would hide risk and are rejected.
    cost_keys = ("spread_cost_at_minimum_volume_account_ccy", "commission_round_turn_at_minimum_volume_account_ccy",
                 "slippage_allowance_at_minimum_volume_account_ccy", "gap_allowance_at_minimum_volume_account_ccy",
                 "swap_expected_at_minimum_volume_account_ccy")
    if any(num(k) < 0 for k in cost_keys):
        raise ValueError("Cost/risk allowances must be non-negative")
    price_loss = (stop_distance / tick_size) * tick_value * volume
    worst_loss_account_ccy = price_loss + costs
    worst_loss_gbp = worst_loss_account_ccy / fx
    loss_pct = worst_loss_gbp / equity * 100
    margin_text = str(row.get("margin_per_min_volume_account_ccy", "")).strip()
    margin_gbp = None
    if margin_text:
        try:
            margin = float(margin_text)
        except (TypeError, ValueError) as exc:
            raise ValueError("margin_per_min_volume_account_ccy must be numeric") from exc
        if not math.isfinite(margin) or margin < 0:
            raise ValueError("margin_per_min_volume_account_ccy must be finite and non-negative")
        margin_gbp = margin / fx
    return {
        "broker": row["broker"], "symbol": row["symbol"],
        "account_equity_gbp": equity, "minimum_volume": volume,
        "estimated_price_loss_account_ccy": round(price_loss, 8),
        "estimated_cost_allowances_account_ccy": round(costs, 8),
        "estimated_worst_case_loss_account_ccy": round(worst_loss_account_ccy, 8),
        "estimated_worst_case_loss_gbp": round(worst_loss_gbp, 8),
        "estimated_worst_case_loss_pct_equity": round(loss_pct, 6),
        "risk_cap_pct": risk_cap_pct,
        "feasible_under_risk_cap": loss_pct <= risk_cap_pct,
        "estimated_margin_gbp": round(margin_gbp, 8) if margin_gbp is not None else None,
        "margin_within_equity": margin_gbp <= equity if margin_gbp is not None else None,
        "status": "INPUT_ESTIMATE_ONLY_CONFIRM_WITH_BROKER_AND_MT5",
        "limitations": [
            "Does not account for all gap, liquidity or execution events",
            "Broker tick value, conversion and margin inputs must be verified",
            "Passing this check is not a guarantee of safety or profitability",
        ],
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--risk-cap-pct", type=float, default=0.5)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if not math.isfinite(args.risk_cap_pct) or args.risk_cap_pct <= 0:
        parser.error("--risk-cap-pct must be a finite positive number")
    with args.csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise SystemExit("Input CSV has no header")
        results = [evaluate(row, args.risk_cap_pct) for row in reader]
    output = json.dumps(results, indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output + "\n", encoding="utf-8")
    print(output)

if __name__ == "__main__":
    main()

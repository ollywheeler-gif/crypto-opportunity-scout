"""Turn an MT5 ExportSymbolContract CSV into one broker feasibility worksheet row.

All cost allowances and stop distance are explicit CLI inputs; this tool never
infers them from a current spread/swap snapshot. It also runs the feasibility
calculator before emitting the row.
"""
import argparse
import csv
import json
from pathlib import Path

from capital_feasibility import evaluate

OUTPUT_FIELDS = [
    "broker", "symbol", "instrument_type", "account_currency", "account_equity_gbp",
    "fx_conversion_rate", "minimum_volume", "volume_step", "contract_size", "tick_size",
    "tick_value_account_ccy", "margin_per_min_volume_account_ccy", "stop_distance_price",
    "spread_cost_at_minimum_volume_account_ccy", "commission_round_turn_at_minimum_volume_account_ccy",
    "slippage_allowance_at_minimum_volume_account_ccy", "gap_allowance_at_minimum_volume_account_ccy",
    "swap_expected_at_minimum_volume_account_ccy", "estimated_worst_case_loss_account_ccy",
    "estimated_worst_case_loss_pct_equity", "estimated_margin_gbp", "feasible_under_risk_cap", "notes",
]


def read_export(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not {"field", "value"}.issubset(reader.fieldnames):
            raise ValueError("Contract export must have field,value columns")
        result = {}
        for row in reader:
            key = (row.get("field") or "").strip()
            if not key:
                continue
            if key in result:
                raise ValueError(f"Duplicate contract field: {key}")
            result[key] = (row.get("value") or "").strip()
    for required in ("symbol", "account_currency", "volume_min", "volume_step", "contract_size",
                     "tick_size", "tick_value_loss", "min_volume_buy_margin_calculated",
                     "min_volume_buy_margin", "quote_available", "captured_server_time"):
        if not result.get(required):
            raise ValueError(f"Missing contract field: {required}")
    if result["min_volume_buy_margin_calculated"].lower() != "true":
        raise ValueError("Exporter did not calculate minimum-volume margin; no feasibility row produced")
    if result["quote_available"].lower() != "true":
        raise ValueError("Exporter had no current quote; no feasibility row produced")
    return result


def build_row(export, args):
    row = {
        "broker": args.broker,
        "symbol": export["symbol"],
        "instrument_type": args.instrument_type,
        "account_currency": export["account_currency"],
        "account_equity_gbp": str(args.account_equity_gbp),
        "fx_conversion_rate": str(args.fx_conversion_rate),
        "minimum_volume": export["volume_min"],
        "volume_step": export["volume_step"],
        "contract_size": export["contract_size"],
        "tick_size": export["tick_size"],
        "tick_value_account_ccy": export["tick_value_loss"],
        "margin_per_min_volume_account_ccy": export["min_volume_buy_margin"],
        "stop_distance_price": str(args.stop_distance_price),
        "spread_cost_at_minimum_volume_account_ccy": str(args.spread_cost),
        "commission_round_turn_at_minimum_volume_account_ccy": str(args.commission_round_turn),
        "slippage_allowance_at_minimum_volume_account_ccy": str(args.slippage_allowance),
        "gap_allowance_at_minimum_volume_account_ccy": str(args.gap_allowance),
        "swap_expected_at_minimum_volume_account_ccy": str(args.swap_expected),
        "notes": f"Imported from {args.contract_csv.name}; captured_server_time={export['captured_server_time']}; costs/stop distance owner-reviewed inputs; metadata snapshot only",
    }
    result = evaluate(row, args.risk_cap_pct)
    row["estimated_worst_case_loss_account_ccy"] = str(result["estimated_worst_case_loss_account_ccy"])
    row["estimated_worst_case_loss_pct_equity"] = str(result["estimated_worst_case_loss_pct_equity"])
    row["estimated_margin_gbp"] = "" if result["estimated_margin_gbp"] is None else str(result["estimated_margin_gbp"])
    row["feasible_under_risk_cap"] = str(result["feasible_under_risk_cap"]).lower()
    return row, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("contract_csv", type=Path)
    parser.add_argument("--broker", required=True)
    parser.add_argument("--instrument-type", required=True, choices=("forex", "metal", "index", "other"))
    parser.add_argument("--account-equity-gbp", type=float, required=True)
    parser.add_argument("--fx-conversion-rate", type=float, required=True,
                        help="account-currency units per GBP; enter 1 only for a GBP account")
    parser.add_argument("--stop-distance-price", type=float, required=True)
    parser.add_argument("--spread-cost", type=float, required=True, help="account currency loss allowance at minimum volume")
    parser.add_argument("--commission-round-turn", type=float, required=True, help="account currency round-turn commission at minimum volume")
    parser.add_argument("--slippage-allowance", type=float, required=True, help="account currency loss allowance at minimum volume")
    parser.add_argument("--gap-allowance", type=float, required=True, help="account currency loss allowance at minimum volume")
    parser.add_argument("--swap-expected", type=float, required=True, help="non-negative expected financing debit allowance at minimum volume")
    parser.add_argument("--risk-cap-pct", type=float, default=0.5)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    export = read_export(args.contract_csv)
    row, result = build_row(export, args)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerow(row)
    print(json.dumps({"worksheet_row": str(args.out), "feasibility": result}, indent=2))
    if not result["feasible_under_risk_cap"] or result["margin_within_equity"] is False:
        raise SystemExit(2)


if __name__ == "__main__":
    main()

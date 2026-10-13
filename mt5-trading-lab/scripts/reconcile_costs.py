"""Reconcile normalized MT5 closed-trade P/L with reported costs.

Input columns: trade_id,gross_profit,commission,swap,fees,net_profit.
MT5 exports differ by broker and report format, so normalize the raw export first,
preserve it unchanged, and document every mapping. This script never guesses columns.
"""
import argparse
import csv
import json
import math
from pathlib import Path

REQUIRED = {"trade_id", "gross_profit", "commission", "swap", "fees", "net_profit"}


def reconcile(path, tolerance=0.01):
    if not math.isfinite(tolerance) or tolerance < 0:
        raise ValueError("tolerance must be finite and non-negative")
    rows = []
    seen = set()
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not REQUIRED.issubset(reader.fieldnames):
            missing = sorted(REQUIRED - set(reader.fieldnames or []))
            raise ValueError("CSV missing required columns: " + ", ".join(missing))
        for line, row in enumerate(reader, start=2):
            trade_id = (row.get("trade_id") or "").strip()
            if not trade_id:
                raise ValueError(f"line {line}: trade_id must not be blank")
            if trade_id in seen:
                raise ValueError(f"line {line}: duplicate trade_id {trade_id!r}")
            seen.add(trade_id)
            values = {}
            for key in ("gross_profit", "commission", "swap", "fees", "net_profit"):
                try:
                    value = float(row[key])
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"line {line}: {key} must be numeric") from exc
                if not math.isfinite(value):
                    raise ValueError(f"line {line}: {key} must be finite")
                values[key] = value
            expected = values["gross_profit"] + values["commission"] + values["swap"] + values["fees"]
            delta = values["net_profit"] - expected
            rows.append({
                "trade_id": trade_id,
                "expected_net_profit": round(expected, 8),
                "reported_net_profit": round(values["net_profit"], 8),
                "difference": round(delta, 8),
                "within_tolerance": abs(delta) <= tolerance,
                **{k: round(values[k], 8) for k in ("gross_profit", "commission", "swap", "fees")},
            })

    failures = [row for row in rows if not row["within_tolerance"]]
    totals = {
        key: round(sum(row[key] for row in rows), 8)
        for key in ("gross_profit", "commission", "swap", "fees", "expected_net_profit", "reported_net_profit", "difference")
    }
    return {
        "status": "PASS_RECONCILED" if not failures else "FAIL_RECONCILIATION",
        "trade_count": len(rows),
        "tolerance_per_trade": tolerance,
        "failed_trade_count": len(failures),
        "totals": totals,
        "trades": rows,
        "limitations": [
            "Input must be normalized manually from the preserved raw broker/tester export.",
            "Confirm whether the source report includes commission, swap and fees before mapping.",
            "This checks arithmetic consistency, not broker execution realism or strategy performance.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--tolerance", type=float, default=0.01)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    result = reconcile(args.csv_path, args.tolerance)
    output = json.dumps(result, indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output + "\n", encoding="utf-8")
    print(output)
    if result["status"] != "PASS_RECONCILED":
        raise SystemExit(2)


if __name__ == "__main__":
    main()

import argparse
import csv
import json
import math
from pathlib import Path


def analyze(path, initial_balance=100.0):
    initial_balance = float(initial_balance)
    if not math.isfinite(initial_balance) or initial_balance <= 0:
        raise ValueError("initial_balance must be finite and greater than zero")

    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or not {"close_time", "net_profit"}.issubset(reader.fieldnames):
            raise ValueError("CSV must contain close_time and net_profit")
        for row in reader:
            try:
                profit = float(row["net_profit"])
            except (TypeError, ValueError) as exc:
                raise ValueError("net_profit must be numeric") from exc
            if not math.isfinite(profit):
                raise ValueError("net_profit must be finite")
            close_time = (row.get("close_time") or "").strip()
            if not close_time:
                raise ValueError("close_time must not be blank")
            rows.append((close_time, profit))

    rows.sort(key=lambda x: x[0])
    balance = initial_balance
    peak = balance
    max_drawdown = 0.0
    gross_profit = 0.0
    gross_loss = 0.0
    wins = 0

    for _, profit in rows:
        balance += profit
        peak = max(peak, balance)
        if peak > 0:
            max_drawdown = max(max_drawdown, (peak - balance) / peak)
        if profit > 0:
            gross_profit += profit
            wins += 1
        elif profit < 0:
            gross_loss += -profit

    count = len(rows)
    net_profit = balance - initial_balance
    return {
        "status": "ANALYSIS_ONLY_NOT_STRATEGY_VALIDATION",
        "trade_count": count,
        "initial_balance": initial_balance,
        "ending_balance": round(balance, 8),
        "net_profit": round(net_profit, 8),
        "return_pct": round(net_profit / initial_balance * 100, 4),
        "win_rate_pct": round(wins / count * 100, 4) if count else None,
        "gross_profit": round(gross_profit, 8),
        "gross_loss_abs": round(gross_loss, 8),
        "profit_factor": round(gross_profit / gross_loss, 6) if gross_loss else (
            None if gross_profit == 0 else "infinite_no_losses"
        ),
        "max_closed_trade_equity_drawdown_pct": round(max_drawdown * 100, 4),
        "cost_handling": "net_profit must already include all costs; costs are not subtracted again",
        "limitations": [
            "closed-trade equity only, not intratrade drawdown",
            "does not validate data quality or execution realism",
            "lexical close_time sorting requires a consistent sortable timestamp format",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", type=Path)
    parser.add_argument("--initial-balance", type=float, default=100.0)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    result = analyze(args.csv, args.initial_balance)
    output = json.dumps(result, indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()

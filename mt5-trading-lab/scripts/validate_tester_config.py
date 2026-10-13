"""Fail-closed validation for MT5 Strategy Tester INI files.

Validation is not execution. This tool never launches MT5, authenticates, or
claims a backtest occurred.
"""
from __future__ import annotations
import argparse
import configparser
import json
import re
from datetime import datetime
from pathlib import Path

REQUIRED = ("Expert", "Symbol", "Period", "FromDate", "ToDate", "Model", "Deposit", "Currency", "Leverage", "Report")
FORBIDDEN_KEYS = {"login", "password", "server", "proxylogin", "proxypassword"}
VALID_PERIODS = {"M1", "M2", "M3", "M4", "M5", "M6", "M10", "M12", "M15", "M20", "M30", "H1", "H2", "H3", "H4", "H6", "H8", "H12", "D1", "W1", "MN1"}
VALID_MODELS = {0, 1, 2, 3, 4}


def validate(path: Path) -> dict:
    if not path.is_file():
        raise ValueError(f"Tester config does not exist: {path}")
    text = path.read_text(encoding="utf-8-sig")
    parser = configparser.ConfigParser(interpolation=None, strict=True)
    parser.optionxform = str
    try:
        parser.read_string(text)
    except configparser.Error as exc:
        raise ValueError(f"Invalid INI syntax: {exc}") from exc
    if not parser.has_section("Tester"):
        raise ValueError("Missing [Tester] section")
    values = {k.lower(): v.strip() for k, v in parser.items("Tester")}
    forbidden = sorted(k for k in values if k in FORBIDDEN_KEYS)
    if forbidden:
        raise ValueError("Credential/server fields are forbidden in unattended tester config: " + ", ".join(forbidden))
    missing = sorted(k for k in REQUIRED if not values.get(k.lower()))
    if missing:
        raise ValueError("Missing required [Tester] fields: " + ", ".join(missing))
    start_text, end_text = values["fromdate"], values["todate"]
    try:
        start = datetime.strptime(start_text, "%Y.%m.%d").date()
        end = datetime.strptime(end_text, "%Y.%m.%d").date()
    except ValueError as exc:
        raise ValueError("FromDate and ToDate must use YYYY.MM.DD") from exc
    if start >= end:
        raise ValueError("FromDate must be earlier than ToDate")
    period = values["period"].upper()
    if period not in VALID_PERIODS:
        raise ValueError(f"Unsupported MT5 period: {period}")
    try:
        model = int(values["model"])
    except ValueError as exc:
        raise ValueError("Model must be an integer MT5 modelling mode") from exc
    if model not in VALID_MODELS:
        raise ValueError(f"Unsupported MT5 modelling mode: {model}")
    if model != 4:
        quality = "SMOKE_OR_COARSE_MODEL_ONLY"
    else:
        quality = "REAL_TICK_MODE_REQUESTED_HISTORY_STILL_UNVERIFIED"
    if not re.fullmatch(r"[A-Za-z0-9_\\.-]+", values["expert"]):
        raise ValueError("Expert must be a relative MQL5 Experts path without extension or unsafe characters")
    if not re.fullmatch(r"[A-Za-z0-9._-]+", values["symbol"]):
        raise ValueError("Symbol contains unsupported characters")
    if float(values["deposit"]) <= 0 or float(values["leverage"]) <= 0:
        raise ValueError("Deposit and leverage must be positive")
    if values.get("shutdownterminal", "0") != "1":
        raise ValueError("ShutdownTerminal=1 is required for unattended execution")
    if values.get("visual", "0") != "0":
        raise ValueError("Visual=0 is required for unattended execution")
    if values.get("optimization", "0") not in {"0", "false", "False"}:
        raise ValueError("Optimization must be disabled for pre-registered first-pass tests")
    report = values["report"].strip('"')
    if not Path(report).is_absolute():
        raise ValueError("Report must be an absolute path so artifact capture is deterministic")
    return {
        "status": "CONFIG_VALIDATION_PASS_NOT_EXECUTED",
        "config_path": str(path),
        "expert": values["expert"],
        "symbol": values["symbol"],
        "period": period,
        "from_date": start.isoformat(),
        "to_date": end.isoformat(),
        "model": model,
        "model_quality_label": quality,
        "deposit": float(values["deposit"]),
        "currency": values["currency"],
        "leverage": int(values["leverage"]),
        "report_path": report,
        "credentials_present": False,
        "mt5_launched": False,
        "backtest_executed": False,
        "performance_claim_allowed": False,
        "limitations": [
            "Configuration validation only; MT5 was not launched.",
            "Broker history, symbol contract, spread, commission, swaps and data coverage remain unverified.",
            "Model=4 requests real-tick modelling but does not prove real ticks are available.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = validate(args.config)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    rendered = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

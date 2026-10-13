from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
required = [
    "README.md", "docs/WORKFLOW.md", "docs/EXECUTION_REALITY.md",
    "docs/ACCEPTANCE_GATES.md", "docs/ARTIFACTS_AND_DATA.md",
    "docs/NEXT_STEPS.md", "docs/MT5_CLOUD_RUNNER.md", "docs/PROGRESS_LOG.md",
    "config/project_config.json",
    "agents/agent_1_researcher.md", "agents/agent_2_developer.md",
    "agents/agent_3_tester.md", "agents/agent_4_reviewer.md",
    "research/strategy_spec_template.md", "research/candidate_register.md",
    "research/specs/STRAT-002-donchian-breakout-v1.md",
    "research/capital_feasibility_template.csv",
    "scripts/analyze_trades.py", "scripts/capital_feasibility.py",
    "scripts/run_mt5_candidate.ps1", "scripts/install_mt5_candidate.ps1",
    "mql5/Experts/STRAT-002_DonchianBreakout.mq5",
    "tests/test_project_safety.py", "tests/test_analyze_trades.py", "tests/test_capital_feasibility.py",
]
missing = [p for p in required if not (ROOT / p).is_file()]
if missing:
    print("FAIL missing files:", ", ".join(missing))
    sys.exit(1)

try:
    cfg = json.loads((ROOT / "config/project_config.json").read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as exc:
    print(f"FAIL invalid project config: {exc}")
    sys.exit(1)

for key in ("live_trading_enabled", "live_deployment_allowed", "paid_services_auto_provision"):
    if cfg.get(key) is not False:
        print(f"FAIL: {key} must remain false")
        sys.exit(1)

if cfg.get("require_explicit_owner_approval_for_live") is not True:
    print("FAIL: explicit owner approval for live trading must remain required")
    sys.exit(1)

risk = cfg.get("risk", {})
if risk.get("martingale_allowed") is not False or risk.get("uncontrolled_grid_allowed") is not False:
    print("FAIL: martingale and uncontrolled grid must remain disabled")
    sys.exit(1)

print("PASS: required project files and config valid; live trading and paid auto-provisioning disabled.")

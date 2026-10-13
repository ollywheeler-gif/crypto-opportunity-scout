from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
required = [
    "README.md", "../.github/workflows/mt5-mql5-compile.yml", "docs/WORKFLOW.md", "docs/EXECUTION_REALITY.md",
    "docs/ACCEPTANCE_GATES.md", "docs/ARTIFACTS_AND_DATA.md", "docs/BROKER_FEASIBILITY_RESEARCH.md", "docs/BROKER_FEASIBILITY_RESEARCH.md", "docs/MULTI_AGENT_OPERATING_PROTOCOL.md", "docs/PRE_REGISTERED_TEST_PROTOCOL.md",
    "docs/NEXT_STEPS.md", "docs/MT5_CLOUD_RUNNER.md", "docs/PROGRESS_LOG.md", "docs/gate_register.csv", "docs/BACKGROUND_AGENT_RUNTIME_DECISION.md",
    "config/project_config.json",
    "agents/agent_0_project_director.md", "agents/agent_1_researcher.md", "agents/agent_2_developer.md",
    "agents/agent_3_tester.md", "agents/agent_4_reviewer.md",
    "agents/agent_5_broker_feasibility.md", "agents/agent_6_independent_test_analyst.md",
    "agents/agent_7_build_automation.md",
    "research/strategy_spec_template.md", "research/candidate_register.md",
    "research/specs/strat-001-timeseries-momentum-v1.md",
    "research/specs/STRAT-002-donchian-breakout-v1.md",
    "research/specs/strat-003-ema-trend-v1.md", "research/specs/strat-004-trend-pullback-v1.md",
    "research/specs/strat-005-london-breakout-v1.md", "research/specs/strat-006-index-opening-range-v1.md",
    "research/specs/strat-007-volatility-contraction-v1.md", "research/specs/strat-008-regime-mean-reversion-v1.md",
    "research/specs/strat-009-rsi-pullback-v1.md", "research/specs/strat-010-swap-aware-fx-momentum-v1.md",
    "research/capital_feasibility_template.csv", "research/normalized_cost_ledger_template.csv", "research/reviews/STRAT-002-code-review-v1.md",
    "scripts/analyze_trades.py", "scripts/contract_export_to_feasibility.py", "scripts/capital_feasibility.py", "scripts/reconcile_costs.py", "scripts/agent_coordinator.py",
    "scripts/run_mt5_candidate.ps1", "scripts/install_mt5_candidate.ps1",
    "mql5/Experts/STRAT-001_TimeSeriesMomentum.mq5", "mql5/Experts/STRAT-002_DonchianBreakout.mq5", "mql5/Experts/STRAT-003_EMATrend.mq5", "mql5/Experts/STRAT-004_TrendPullback.mq5", "mql5/Include/TradingLab/RiskGuard.mqh", "mql5/Experts/STRAT-005_LondonBreakout.mq5", "mql5/Experts/STRAT-007_VolatilityContraction.mq5", "mql5/Experts/STRAT-008_RegimeMeanReversion.mq5", "mql5/Experts/STRAT-009_RsiPullback.mq5", "mql5/Scripts/TradingLab/ExportSymbolContract.mq5",
    "tests/test_project_safety.py", "tests/test_analyze_trades.py", "tests/test_capital_feasibility.py", "tests/test_volatility_setup_reference.py", "tests/test_agent_coordinator.py",
    "tests/test_donchian_reference.py", "tests/test_contract_export_to_feasibility.py", "tests/test_reconcile_costs.py",
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

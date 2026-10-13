from pathlib import Path
import json, sys
ROOT = Path(__file__).resolve().parents[1]
required = ["README.md","docs/WORKFLOW.md","docs/EXECUTION_REALITY.md","config/project_config.json",
"agents/agent_1_researcher.md","agents/agent_2_developer.md","agents/agent_3_tester.md","agents/agent_4_reviewer.md","research/strategy_spec_template.md"]
missing = [p for p in required if not (ROOT/p).is_file()]
if missing:
    print("FAIL missing files:", ", ".join(missing)); sys.exit(1)
cfg = json.loads((ROOT/"config/project_config.json").read_text(encoding="utf-8"))
for key in ("live_trading_enabled","live_deployment_allowed","paid_services_auto_provision"):
    if cfg.get(key) is not False:
        print(f"FAIL: {key} must remain false"); sys.exit(1)
print("PASS: project structure valid; live deployment and paid auto-provisioning disabled.")

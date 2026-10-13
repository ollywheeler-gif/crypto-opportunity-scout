"""Credential-free dry-run coordinator for the bounded MT5 Trading Lab team.

This prepares auditable work assignments; it does not call an LLM or claim that
background agents ran. Model execution is a separate, approval-gated phase.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENTS = ROOT / "agents"
OUT = ROOT / "reports" / "agent_runs"

ROLE_TASKS = {
    0: ("Project director", "Sequence dependencies, identify blockers, and enforce acceptance gates."),
    1: ("Strategy researcher", "Review candidate hypotheses and specifications; identify falsifiable edge and failure modes."),
    2: ("MQL5 developer", "Implement only frozen, feasible specifications; preserve fail-closed execution controls."),
    3: ("MT5 tester", "Define and execute mechanics/backtest steps only when a verified MT5 runner and data are available."),
    4: ("Independent reviewer", "Adversarially review code and evidence; do not approve unsupported performance claims."),
    5: ("Broker and capital feasibility", "Check authoritative symbol constraints, costs, margin, and £100 account feasibility."),
    6: ("Independent test and data analyst", "Audit data integrity, leakage, metrics, cost reconciliation, and robustness protocol."),
    7: ("Build and automation engineer", "Maintain reproducible CI, artifacts, schemas, and fail-closed automation."),
}


def build_manifest() -> dict:
    assignments = []
    for agent_id, (role, objective) in ROLE_TASKS.items():
        path = AGENTS / f"agent_{agent_id}_{role.lower().replace(' ', '_').replace('-', '_')}.md"
        # Some filenames include extra role descriptors; resolve by prefix to avoid
        # coupling the coordinator to a single exact filename convention.
        matches = sorted(AGENTS.glob(f"agent_{agent_id}_*.md"))
        if len(matches) != 1:
            raise ValueError(f"Expected exactly one role file for Agent {agent_id}; found {len(matches)}")
        if not matches[0].read_text(encoding="utf-8").strip():
            raise ValueError(f"Empty role definition: {matches[0].relative_to(ROOT)}")
        assignments.append({
            "agent_id": agent_id,
            "role": role,
            "role_file": str(matches[0].relative_to(ROOT)),
            "objective": objective,
            "status": "prepared_not_executed",
            "evidence_required": True,
        })
    return {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "mode": "dry_run",
        "llm_calls_made": 0,
        "external_services_used": [],
        "live_trading_enabled": False,
        "paid_provisioning_enabled": False,
        "note": "Assignments prepared only. No AI agents ran and no strategy performance was tested.",
        "assignments": assignments,
    }


def render_report(manifest: dict) -> str:
    lines = [
        "# MT5 Trading Lab — agent dry-run report",
        "",
        f"- Generated (UTC): {manifest['generated_at_utc']}",
        f"- Mode: `{manifest['mode']}`",
        "- LLM/API calls: 0",
        "- Live trading: disabled",
        "- Paid provisioning: disabled",
        "",
        "> **Important:** this is a work-plan dry run, not evidence that autonomous agents executed,",
        "> not a compile result, and not a strategy backtest.",
        "",
        "## Prepared assignments",
        "",
        "| Agent | Role | Status |",
        "|---:|---|---|",
    ]
    for item in manifest["assignments"]:
        lines.append(f"| {item['agent_id']} | {item['role']} | Prepared, not executed |")
    lines += [
        "",
        "## Immediate blockers",
        "",
        "- LLM orchestration is not enabled; no API credentials are read by this script.",
        "- Real MT5 Strategy Tester evidence still requires a verified Windows runner, broker symbol specifications, and historical data.",
        "- Each strategy must pass capital-feasibility and cost checks before performance testing.",
        "- Independent review requires retained source, settings, raw reports, logs, and reconciled costs.",
        "",
        "## Next action",
        "",
        "Use this manifest to validate role wiring and reporting. Implement model execution only after explicit owner approval for API usage and after adding credentials as a repository secret.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=OUT)
    args = parser.parse_args()
    try:
        manifest = build_manifest()
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    stem = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = args.output_dir / f"dry_run_{stem}.json"
    md_path = args.output_dir / f"dry_run_{stem}.md"
    json_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_report(manifest), encoding="utf-8")
    print(f"Prepared {len(manifest['assignments'])} role assignments; no agents executed.")
    print(f"Manifest: {json_path.relative_to(ROOT) if json_path.is_relative_to(ROOT) else json_path}")
    print(f"Report: {md_path.relative_to(ROOT) if md_path.is_relative_to(ROOT) else md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/agent_coordinator.py"


class AgentCoordinatorDryRunTests(unittest.TestCase):
    def test_dry_run_generates_eight_truthful_assignments_without_api_calls(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--output-dir", tmp],
                check=False, capture_output=True, text=True, timeout=10,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            files = list(Path(tmp).iterdir())
            self.assertEqual(len(files), 2)
            manifest_file = next(p for p in files if p.suffix == ".json")
            report_file = next(p for p in files if p.suffix == ".md")
            manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
            report = report_file.read_text(encoding="utf-8")
            self.assertEqual(len(manifest["assignments"]), 8)
            self.assertEqual(manifest["llm_calls_made"], 0)
            self.assertFalse(manifest["live_trading_enabled"])
            self.assertFalse(manifest["paid_provisioning_enabled"])
            self.assertTrue(all(a["status"] == "prepared_not_executed" for a in manifest["assignments"]))
            self.assertIn("not a strategy backtest", report)
            self.assertIn("Prepared, not executed", report)

    def test_missing_role_definition_fails_closed(self):
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn("Expected exactly one role file", source)
        self.assertIn("No AI agents ran", source)


if __name__ == "__main__":
    unittest.main()

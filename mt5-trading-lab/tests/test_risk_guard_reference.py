import json
import sys
import unittest
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.risk_guard_reference import GuardState, update_state


class RiskGuardReferenceTests(unittest.TestCase):
    def test_daily_loss_halt_triggers_at_threshold_and_closes_strategy_positions(self):
        state = GuardState(server_day=20261013, day_start_equity=100.0, peak_equity=100.0)
        result = update_state(state, equity=99.0, server_day=20261013)
        self.assertTrue(result["halted"])
        self.assertTrue(result["close_strategy_positions"])
        self.assertAlmostEqual(result["daily_loss_pct"], 1.0)

    def test_daily_halt_resets_next_server_day_but_peak_halt_persists(self):
        state = GuardState(server_day=20261013, day_start_equity=100.0, peak_equity=100.0,
                           daily_halt=True, peak_halt=True, review_logged=True, halt_logged=True)
        result = update_state(state, equity=96.0, server_day=20261014)
        self.assertFalse(state.daily_halt)
        self.assertTrue(state.peak_halt)
        self.assertTrue(result["halted"])
        self.assertEqual(state.day_start_equity, 96.0)
        self.assertFalse(state.halt_logged)  # New day can log the persistent halt once again.

    def test_peak_drawdown_halt_survives_serialized_restart(self):
        state = GuardState(server_day=20261013, day_start_equity=100.0, peak_equity=100.0)
        update_state(state, equity=89.0, server_day=20261013)
        restored = GuardState(**json.loads(json.dumps(asdict(state))))
        result = update_state(restored, equity=90.0, server_day=20261014)
        self.assertTrue(result["halted"])
        self.assertTrue(restored.peak_halt)
        self.assertEqual(restored.peak_equity, 100.0)

    def test_review_threshold_logs_without_halt(self):
        state = GuardState(server_day=20261013, day_start_equity=100.0, peak_equity=100.0)
        result = update_state(state, equity=95.0, server_day=20261013)
        self.assertTrue(result["review_logged"])
        self.assertFalse(result["halted"])

    def test_invalid_thresholds_fail_closed(self):
        state = GuardState(server_day=20261013, day_start_equity=100.0, peak_equity=100.0)
        with self.assertRaisesRegex(ValueError, "thresholds"):
            update_state(state, equity=100.0, server_day=20261013, halt_pct=5.0)


if __name__ == "__main__":
    unittest.main()

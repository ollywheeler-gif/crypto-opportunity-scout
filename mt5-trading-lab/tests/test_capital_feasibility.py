import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.capital_feasibility import evaluate

ROW = {
    "broker": "Demo", "symbol": "TEST", "account_equity_gbp": "100",
    "minimum_volume": "0.1", "tick_size": "0.01",
    "tick_value_account_ccy": "1", "stop_distance_price": "1",
    "spread_cost_account_ccy": "1", "commission_round_turn_account_ccy": "0.5",
    "slippage_allowance_account_ccy": "0.5", "gap_allowance_account_ccy": "1",
    "swap_expected_account_ccy": "0", "fx_conversion_rate": "1",
    "margin_per_min_volume_account_ccy": "20",
}

class CapitalFeasibilityTests(unittest.TestCase):
    def test_loss_and_reject_over_cap(self):
        result = evaluate(ROW, 0.5)
        self.assertAlmostEqual(result["estimated_worst_case_loss_gbp"], 13.0)
        self.assertAlmostEqual(result["estimated_worst_case_loss_pct_equity"], 13.0)
        self.assertFalse(result["feasible_under_risk_cap"])
        self.assertTrue(result["margin_within_equity"])

    def test_missing_inputs_fail_closed(self):
        row = dict(ROW)
        del row["tick_value_account_ccy"]
        with self.assertRaisesRegex(ValueError, "Missing required"):
            evaluate(row)

    def test_negative_cost_cannot_hide_risk(self):
        row = dict(ROW)
        row["commission_round_turn_account_ccy"] = "-100"
        with self.assertRaisesRegex(ValueError, "non-negative"):
            evaluate(row)

if __name__ == "__main__":
    unittest.main()

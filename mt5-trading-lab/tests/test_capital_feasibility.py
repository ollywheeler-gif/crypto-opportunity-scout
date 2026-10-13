import csv
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.capital_feasibility import evaluate, REQUIRED

ROW = {
    "broker": "Demo", "symbol": "TEST", "account_equity_gbp": "100",
    "minimum_volume": "0.1", "volume_step": "0.1", "tick_size": "0.01",
    "tick_value_account_ccy": "1", "stop_distance_price": "1",
    "spread_cost_at_minimum_volume_account_ccy": "1", "commission_round_turn_at_minimum_volume_account_ccy": "0.5",
    "slippage_allowance_at_minimum_volume_account_ccy": "0.5", "gap_allowance_at_minimum_volume_account_ccy": "1",
    "swap_expected_at_minimum_volume_account_ccy": "0", "fx_conversion_rate": "1",
    "margin_per_min_volume_account_ccy": "20",
}

class CapitalFeasibilityTests(unittest.TestCase):
    def test_template_contains_every_required_input(self):
        template = Path(__file__).resolve().parents[1] / "research/capital_feasibility_template.csv"
        with template.open(newline="", encoding="utf-8") as handle:
            headers = set(next(csv.reader(handle)))
        self.assertTrue(REQUIRED.issubset(headers), f"Template missing: {sorted(REQUIRED - headers)}")

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

    def test_invalid_risk_cap_and_volume_step_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "risk_cap_pct"):
            evaluate(ROW, 0)
        row = dict(ROW)
        row["volume_step"] = "0.03"
        with self.assertRaisesRegex(ValueError, "volume_step"):
            evaluate(row)

    def test_negative_cost_cannot_hide_risk(self):
        row = dict(ROW)
        row["commission_round_turn_at_minimum_volume_account_ccy"] = "-100"
        with self.assertRaisesRegex(ValueError, "non-negative"):
            evaluate(row)


    def test_account_currency_conversion_is_applied_to_loss_and_margin(self):
        row = dict(ROW)
        row["fx_conversion_rate"] = "1.25"  # 1.25 account-currency units per GBP
        result = evaluate(row, 0.5)
        self.assertAlmostEqual(result["estimated_worst_case_loss_account_ccy"], 13.0)
        self.assertAlmostEqual(result["estimated_worst_case_loss_gbp"], 10.4)
        self.assertAlmostEqual(result["estimated_margin_gbp"], 16.0)
        self.assertFalse(result["feasible_under_risk_cap"])

    def test_non_finite_broker_inputs_fail_closed(self):
        for key, value in (("tick_value_account_ccy", "nan"),
                           ("stop_distance_price", "inf"),
                           ("fx_conversion_rate", "0")):
            with self.subTest(key=key):
                row = dict(ROW)
                row[key] = value
                with self.assertRaises(ValueError):
                    evaluate(row)

    def test_negative_margin_fails_closed(self):
        row = dict(ROW)
        row["margin_per_min_volume_account_ccy"] = "-1"
        with self.assertRaisesRegex(ValueError, "non-negative"):
            evaluate(row)

if __name__ == "__main__":
    unittest.main()

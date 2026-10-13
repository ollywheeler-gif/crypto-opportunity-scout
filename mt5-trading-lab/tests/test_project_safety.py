import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EA = (ROOT / "mql5/Experts/STRAT-002_DonchianBreakout.mq5").read_text(encoding="utf-8")
CONFIG = json.loads((ROOT / "config/project_config.json").read_text(encoding="utf-8"))

class ProjectSafetyTests(unittest.TestCase):
    def test_live_and_paid_provisioning_disabled(self):
        self.assertIs(CONFIG["live_trading_enabled"], False)
        self.assertIs(CONFIG["live_deployment_allowed"], False)
        self.assertIs(CONFIG["paid_services_auto_provision"], False)
        self.assertIs(CONFIG["require_explicit_owner_approval_for_live"], True)

    def test_ea_has_real_account_guard(self):
        self.assertIn("ACCOUNT_TRADE_MODE_REAL", EA)
        self.assertIn("INIT_FAILED", EA)
        self.assertIn("BLOCKED: STRAT-002 research EA refuses to initialize on a real account.", EA)

    def test_ea_defaults_to_disabled_and_cost_review_required(self):
        self.assertIn("input bool   EnableStrategy = false", EA)
        self.assertIn("input bool   ConfirmBrokerCostsReviewed = false", EA)
        self.assertIn("(EnableStrategy && !ConfirmBrokerCostsReviewed)", EA)

    def test_no_averaging_or_martingale_logic(self):
        self.assertNotIn("POSITION_TYPE_BUY) volume * 2", EA)
        self.assertNotIn("martingale", EA.lower())
        self.assertNotIn("grid", EA.lower())

    def test_minimum_lot_risk_gate_exists(self):
        self.assertIn("if(minLoss == DBL_MAX || minLoss > hardLimit)", EA)
        self.assertIn("Broker minimum lot is too risky: skip rather than distort risk.", EA)

if __name__ == "__main__":
    unittest.main()

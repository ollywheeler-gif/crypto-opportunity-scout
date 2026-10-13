import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EA = (ROOT / "mql5/Experts/STRAT-002_DonchianBreakout.mq5").read_text(encoding="utf-8")
EMA_EA = (ROOT / "mql5/Experts/STRAT-003_EMATrend.mq5").read_text(encoding="utf-8")
CONTRACT_EXPORTER = (ROOT / "mql5/Scripts/TradingLab/ExportSymbolContract.mq5").read_text(encoding="utf-8")
CONFIG = json.loads((ROOT / "config/project_config.json").read_text(encoding="utf-8"))
RUNNER = (ROOT / "scripts/run_mt5_candidate.ps1").read_text(encoding="utf-8")
INSTALLER = (ROOT / "scripts/install_mt5_candidate.ps1").read_text(encoding="utf-8")
PROJECT_DIRECTOR = (ROOT / "agents/agent_0_project_director.md").read_text(encoding="utf-8")
ORCHESTRATION = (ROOT / "docs/MULTI_AGENT_OPERATING_PROTOCOL.md").read_text(encoding="utf-8")
CODE_REVIEW = (ROOT / "research/reviews/STRAT-002-code-review-v1.md").read_text(encoding="utf-8")
COMPILE_WORKFLOW = (ROOT.parent / ".github/workflows/mt5-mql5-compile.yml").read_text(encoding="utf-8")

class ProjectSafetyTests(unittest.TestCase):
    def test_independent_review_remains_blocked_without_evidence(self):
        self.assertIn("Disposition: BLOCKED", CODE_REVIEW)
        self.assertIn("not a performance approval", CODE_REVIEW.lower())
        self.assertIn("CR-04", CODE_REVIEW)
        self.assertIn("no performance approval", CODE_REVIEW.lower())

    def test_project_director_and_agent_handoffs_exist(self):
        for required in ("Agent 1", "Agent 2", "Agent 3", "Agent 4", "owner approval", "BLOCKED", "£100"):
            self.assertIn(required.lower(), PROJECT_DIRECTOR.lower())
        for required in ("Agent 0", "Agent 1", "Agent 2", "Agent 3", "Agent 4", "raw report", "critical path"):
            self.assertIn(required.lower(), ORCHESTRATION.lower())

    def test_bounded_specialist_team_is_defined_and_not_misrepresented(self):
        for role_file in (
            "agent_5_broker_feasibility.md",
            "agent_6_independent_test_analyst.md",
            "agent_7_build_automation.md",
        ):
            self.assertTrue((ROOT / "agents" / role_file).is_file())
        for required in ("Agent 5", "Agent 6", "Agent 7", "eight roles", "one writer"):
            self.assertIn(required.lower(), ORCHESTRATION.lower())
        self.assertIn("not a deployed autonomous agent service", (ROOT / "README.md").read_text(encoding="utf-8").lower())

    def test_windows_compile_workflow_is_isolated_and_auditable(self):
        self.assertIn("Get-AuthenticodeSignature", COMPILE_WORKFLOW)
        self.assertIn("metaeditor64.exe", COMPILE_WORKFLOW)
        self.assertIn("produced warnings", COMPILE_WORKFLOW)
        self.assertIn("Start-Process -FilePath $metaEditor", COMPILE_WORKFLOW)
        self.assertIn("Result:", COMPILE_WORKFLOW)
        self.assertIn("summary.Groups[1].Value", COMPILE_WORKFLOW)
        self.assertIn("-Wait -PassThru", COMPILE_WORKFLOW)
        self.assertIn("Upload compiler evidence", COMPILE_WORKFLOW)
        self.assertNotIn("Password=", COMPILE_WORKFLOW)
        self.assertNotIn("Login=", COMPILE_WORKFLOW)

    def test_contract_exporter_is_read_only_and_exports_feasibility_fields(self):
        for field in ("SYMBOL_VOLUME_MIN", "SYMBOL_VOLUME_STEP", "SYMBOL_TRADE_TICK_SIZE", "SYMBOL_TRADE_TICK_VALUE_LOSS", "SYMBOL_TRADE_STOPS_LEVEL", "SYMBOL_TRADE_FREEZE_LEVEL", "SYMBOL_SWAP_LONG", "SYMBOL_SWAP_SHORT", "OrderCalcMargin"):
            self.assertIn(field, CONTRACT_EXPORTER)
        for forbidden in ("trade.Buy(", "trade.Sell(", "OrderSend(", "PositionClose("):
            self.assertNotIn(forbidden, CONTRACT_EXPORTER)

    def test_strat003_is_disabled_and_has_core_safety_gates(self):
        self.assertIn("input bool   EnableStrategy = false", EMA_EA)
        self.assertIn("ACCOUNT_TRADE_MODE_REAL", EMA_EA)
        self.assertIn("SYMBOL_TRADE_TICK_SIZE", EMA_EA)
        self.assertIn("EstimatedGapCostPerLot <= 0", EMA_EA)
        self.assertIn("MaxSpreadPoints <= 0", EMA_EA)
        self.assertIn("OrderCalcProfit", EMA_EA)
        self.assertIn("OrderCalcMargin", EMA_EA)
        self.assertNotIn("martingale", EMA_EA.lower())
        self.assertNotIn("grid", EMA_EA.lower())

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
        self.assertIn("EnableStrategy && (!ConfirmBrokerCostsReviewed || EstimatedSpreadCostPerLot <= 0 || EstimatedSlippageCostPerLot <= 0 || EstimatedGapCostPerLot <= 0 || MaxSpreadPoints <= 0)", EA)

    def test_spread_limit_and_tick_size_alignment_exist(self):
        self.assertIn("MaxSpreadPoints <= 0", EA)
        self.assertIn("SYMBOL_TRADE_TICK_SIZE", EA)
        self.assertIn("NormalizePriceToTick", EA)
        self.assertIn("Current spread exceeds reviewed maximum", EA)

    def test_gap_risk_reserve_is_required_and_sized(self):
        self.assertIn("EstimatedGapCostPerLot <= 0", EA)
        self.assertIn("EstimatedSlippageCostPerLot + EstimatedGapCostPerLot", EA)

    def test_no_averaging_or_martingale_logic(self):
        self.assertNotIn("POSITION_TYPE_BUY) volume * 2", EA)
        self.assertNotIn("martingale", EA.lower())
        self.assertNotIn("grid", EA.lower())

    def test_windows_runner_has_fail_closed_guards(self):
        self.assertIn("[Tester]", RUNNER)
        self.assertIn("Login|Password|Server", RUNNER)
        self.assertIn("ReportPath argument must exactly match", RUNNER)
        self.assertIn("Report was not freshly updated", RUNNER)
        self.assertIn("Compile failed or produced no fresh EX5", RUNNER)
        self.assertIn("Compile produced warnings", RUNNER)
        self.assertIn("Start-Process -FilePath $MetaEditorPath", RUNNER)
        self.assertIn("-Wait -PassThru", RUNNER)
        self.assertIn("A process named", RUNNER)
        self.assertIn("Close MT5 instances", RUNNER)

    def test_installer_only_copies_and_verifies_source(self):
        self.assertIn("Get-FileHash", INSTALLER)
        self.assertIn("Installed source hash does not match", INSTALLER)
        self.assertIn("No compile, terminal launch, account login or trading action was performed.", INSTALLER)

    def test_duplicate_instance_lock_exists(self):
        for source in (EA, EMA_EA):
            self.assertIn("GlobalVariableSetOnCondition", source)
            self.assertIn("Another instance with the same symbol/magic is active", source)
            self.assertIn("ReleaseInstanceLock();", source)

    def test_minimum_lot_risk_gate_exists(self):
        self.assertIn("if(minLoss == DBL_MAX || minLoss > hardLimit)", EA)
        self.assertIn("Broker minimum lot is too risky: skip rather than distort risk.", EA)
        self.assertIn("OrderCalcMargin", EA)
        self.assertIn("HasForeignPositionOnSymbol", EA)
        self.assertIn("Foreign position exists on this symbol", EA)
        self.assertIn("Insufficient free margin; trade skipped.", EA)

if __name__ == "__main__":
    unittest.main()

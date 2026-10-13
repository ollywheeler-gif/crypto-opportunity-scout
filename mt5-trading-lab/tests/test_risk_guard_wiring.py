"""Static contract checks for shared risk-guard wiring in research EAs."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPERTS = ROOT / "mql5" / "Experts"
CANDIDATES = [
    "STRAT-001_TimeSeriesMomentum.mq5",
    "STRAT-002_DonchianBreakout.mq5",
    "STRAT-003_EMATrend.mq5",
    "STRAT-004_TrendPullback.mq5",
    "STRAT-005_LondonBreakout.mq5",
    "STRAT-006_IndexOpeningRange.mq5",
    "STRAT-007_VolatilityContraction.mq5",
    "STRAT-008_RegimeMeanReversion.mq5",
    "STRAT-009_RsiPullback.mq5",
]


class RiskGuardWiringTests(unittest.TestCase):
    def test_candidates_fail_closed_on_risk_guard_halt(self):
        for name in CANDIDATES:
            with self.subTest(candidate=name):
                source = (EXPERTS / name).read_text(encoding="utf-8")
                self.assertIn('#include <TradingLab/RiskGuard.mqh>', source)
                self.assertIn('if(TLRG_CheckAndEnforce()) return;', source)
                self.assertNotIn('if(!TLRG_CheckAndEnforce())', source)

    def test_guard_is_checked_before_strategy_or_bar_gates(self):
        for name in CANDIDATES:
            with self.subTest(candidate=name):
                source = (EXPERTS / name).read_text(encoding="utf-8")
                on_tick = source.split('void OnTick()', 1)[1]
                guard_pos = on_tick.find('if(TLRG_CheckAndEnforce()) return;')
                self.assertGreaterEqual(guard_pos, 0)
                strategy_pos = on_tick.find('if(!EnableStrategy)')
                bar_pos = on_tick.find('if(!IsNewBar())')
                if strategy_pos >= 0:
                    self.assertLess(guard_pos, strategy_pos,
                                    'Risk guard must run even if entries are disabled')
                if bar_pos >= 0:
                    self.assertLess(guard_pos, bar_pos,
                                    'Risk guard must run on every tick, not only new bars')

    def test_candidates_fail_initialization_if_guard_cannot_initialize(self):
        for name in CANDIDATES:
            with self.subTest(candidate=name):
                source = (EXPERTS / name).read_text(encoding="utf-8")
                self.assertIn("if(!TLRG_Init()) return INIT_FAILED;", source)

    def test_research_eas_block_real_accounts(self):
        for name in CANDIDATES:
            with self.subTest(candidate=name):
                source = (EXPERTS / name).read_text(encoding="utf-8")
                self.assertIn('ACCOUNT_TRADE_MODE_REAL', source)
                self.assertIn('INIT_FAILED', source)


if __name__ == "__main__":
    unittest.main()

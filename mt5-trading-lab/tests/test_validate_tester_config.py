import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_tester_config import validate


BASE = """[Tester]
Expert=TradingLab\\STRAT-001_TimeSeriesMomentum
Symbol=EURUSD
Period=H1
FromDate=2010.01.01
ToDate=2017.12.31
Model=4
Deposit=100
Currency=GBP
Leverage=30
Report=C:\\MT5Artifacts\\report.html
ReplaceReport=1
ShutdownTerminal=1
Visual=0
Optimization=0
"""


class TesterConfigValidationTests(unittest.TestCase):
    def run_validation(self, content):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "tester.ini"
            path.write_text(content, encoding="utf-8")
            return validate(path)

    def test_valid_config_is_labelled_not_executed(self):
        result = self.run_validation(BASE)
        self.assertEqual(result["status"], "CONFIG_VALIDATION_PASS_NOT_EXECUTED")
        self.assertFalse(result["mt5_launched"])
        self.assertFalse(result["backtest_executed"])
        self.assertFalse(result["performance_claim_allowed"])
        self.assertEqual(result["model"], 4)

    def test_rejects_credentials_and_server(self):
        for field in ("Login=123456", "Password=secret", "Server=Broker-Demo"):
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, "forbidden"):
                    self.run_validation(BASE + field + "\\n")

    def test_rejects_missing_required_field(self):
        with self.assertRaisesRegex(ValueError, "Missing required"):
            self.run_validation(BASE.replace("Leverage=30\\n", ""))

    def test_rejects_bad_date_range_and_model(self):
        with self.assertRaisesRegex(ValueError, "earlier"):
            self.run_validation(BASE.replace("FromDate=2010.01.01", "FromDate=2018.01.01"))
        with self.assertRaisesRegex(ValueError, "Unsupported MT5 modelling"):
            self.run_validation(BASE.replace("Model=4", "Model=99"))

    def test_requires_safe_unattended_defaults(self):
        with self.assertRaisesRegex(ValueError, "ShutdownTerminal=1"):
            self.run_validation(BASE.replace("ShutdownTerminal=1", "ShutdownTerminal=0"))
        with self.assertRaisesRegex(ValueError, "Visual=0"):
            self.run_validation(BASE.replace("Visual=0", "Visual=1"))


if __name__ == "__main__":
    unittest.main()

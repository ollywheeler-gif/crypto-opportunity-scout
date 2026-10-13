import csv
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from contract_export_to_feasibility import read_export, build_row


def write_export(fields):
    temp = tempfile.NamedTemporaryFile("w", newline="", encoding="utf-8", suffix=".csv", delete=False)
    with temp:
        writer = csv.DictWriter(temp, fieldnames=["field", "value", "unit_or_note"])
        writer.writeheader()
        for key, value in fields.items():
            writer.writerow({"field": key, "value": value, "unit_or_note": ""})
    return Path(temp.name)


class ContractImportTests(unittest.TestCase):
    def fixture(self):
        return {
            "symbol": "EURUSD", "account_currency": "GBP", "volume_min": "0.01",
            "volume_step": "0.01", "contract_size": "100000", "tick_size": "0.00001",
            "tick_value_loss": "0.1", "min_volume_buy_margin_calculated": "true",
            "min_volume_buy_margin": "0.5", "quote_available": "true",
            "captured_server_time": "2026.10.13 10:00:00",
        }

    def args(self, path):
        return Namespace(
            broker="Test broker", instrument_type="forex", account_equity_gbp=100.0,
            fx_conversion_rate=1.0, stop_distance_price=0.004, spread_cost=0.05,
            commission_round_turn=0.02, slippage_allowance=0.03, gap_allowance=0.05,
            swap_expected=0.01, risk_cap_pct=0.5, contract_csv=path,
        )

    def test_export_converts_to_explicit_feasibility_row(self):
        path = write_export(self.fixture())
        try:
            export = read_export(path)
            row, result = build_row(export, self.args(path))
            self.assertEqual(row["symbol"], "EURUSD")
            self.assertEqual(row["minimum_volume"], "0.01")
            self.assertAlmostEqual(result["estimated_worst_case_loss_gbp"], 0.56, places=6)
            self.assertFalse(result["feasible_under_risk_cap"])
        finally:
            path.unlink(missing_ok=True)

    def test_no_margin_or_quote_fails_closed(self):
        for key, value in (("min_volume_buy_margin_calculated", "false"), ("quote_available", "false")):
            fields = self.fixture()
            fields[key] = value
            path = write_export(fields)
            try:
                with self.assertRaises(ValueError):
                    read_export(path)
            finally:
                path.unlink(missing_ok=True)

    def test_duplicate_fields_rejected(self):
        fields = self.fixture()
        path = write_export(fields)
        # Rewrite with a duplicated field row.
        with path.open("a", newline="", encoding="utf-8") as handle:
            csv.writer(handle).writerow(["symbol", "GBPUSD", ""])
        try:
            with self.assertRaisesRegex(ValueError, "Duplicate contract field"):
                read_export(path)
        finally:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()

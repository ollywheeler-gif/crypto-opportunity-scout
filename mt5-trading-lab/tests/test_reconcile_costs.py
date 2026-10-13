import csv
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.reconcile_costs import reconcile


FIELDS = ["trade_id", "gross_profit", "commission", "swap", "fees", "net_profit"]


def write_csv(rows):
    temp = tempfile.NamedTemporaryFile("w", newline="", encoding="utf-8", suffix=".csv", delete=False)
    with temp:
        writer = csv.DictWriter(temp, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return Path(temp.name)


class CostReconciliationTests(unittest.TestCase):
    def test_costs_reconcile_once(self):
        path = write_csv([
            dict(trade_id="T1", gross_profit="10", commission="-1", swap="-0.5", fees="0", net_profit="8.5"),
            dict(trade_id="T2", gross_profit="-3", commission="-1", swap="0", fees="-0.2", net_profit="-4.2"),
        ])
        try:
            result = reconcile(path)
            self.assertEqual(result["status"], "PASS_RECONCILED")
            self.assertEqual(result["totals"]["reported_net_profit"], 4.3)
            self.assertEqual(result["totals"]["difference"], 0.0)
        finally:
            path.unlink(missing_ok=True)

    def test_mismatch_fails_closed(self):
        path = write_csv([dict(trade_id="T1", gross_profit="10", commission="-1", swap="0", fees="0", net_profit="10")])
        try:
            result = reconcile(path)
            self.assertEqual(result["status"], "FAIL_RECONCILIATION")
            self.assertEqual(result["failed_trade_count"], 1)
        finally:
            path.unlink(missing_ok=True)

    def test_duplicate_trade_id_rejected(self):
        row = dict(trade_id="T1", gross_profit="1", commission="0", swap="0", fees="0", net_profit="1")
        path = write_csv([row, row])
        try:
            with self.assertRaisesRegex(ValueError, "duplicate trade_id"):
                reconcile(path)
        finally:
            path.unlink(missing_ok=True)

    def test_nan_and_missing_columns_rejected(self):
        path = write_csv([dict(trade_id="T1", gross_profit="nan", commission="0", swap="0", fees="0", net_profit="0")])
        try:
            with self.assertRaisesRegex(ValueError, "must be finite"):
                reconcile(path)
        finally:
            path.unlink(missing_ok=True)
        temp = tempfile.NamedTemporaryFile("w", newline="", encoding="utf-8", suffix=".csv", delete=False)
        with temp:
            writer = csv.DictWriter(temp, fieldnames=["trade_id", "gross_profit"])
            writer.writeheader()
            writer.writerow(dict(trade_id="T1", gross_profit="1"))
        path = Path(temp.name)
        try:
            with self.assertRaisesRegex(ValueError, "missing required columns"):
                reconcile(path)
        finally:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()

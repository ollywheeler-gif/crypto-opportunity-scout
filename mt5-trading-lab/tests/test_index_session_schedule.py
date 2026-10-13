import csv
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.index_session_schedule import load_schedule, validate_schedule

FIELDS = ["date", "open_hour", "open_minute", "end_hour", "end_minute"]


def write_schedule(rows, fields=FIELDS):
    handle = tempfile.NamedTemporaryFile("w", newline="", encoding="utf-8", delete=False)
    with handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return Path(handle.name)


class IndexSessionScheduleTests(unittest.TestCase):
    def test_valid_schedule_and_expected_dates(self):
        path = write_schedule([
            dict(date="2026-01-05", open_hour="9", open_minute="30", end_hour="16", end_minute="0"),
            dict(date="2026-01-06", open_hour="9", open_minute="30", end_hour="16", end_minute="0"),
        ])
        try:
            result = validate_schedule(path, ["2026-01-05", "2026-01-06"])
            self.assertEqual(result["rows"], 2)
            self.assertEqual(result["status"], "STRUCTURE_VALIDATION_ONLY")
        finally:
            path.unlink(missing_ok=True)

    def test_missing_date_fails_closed(self):
        path = write_schedule([dict(date="2026-01-05", open_hour="9", open_minute="30", end_hour="16", end_minute="0")])
        try:
            with self.assertRaisesRegex(ValueError, "missing session dates"):
                validate_schedule(path, ["2026-01-05", "2026-01-06"])
        finally:
            path.unlink(missing_ok=True)

    def test_duplicate_dates_rejected(self):
        row = dict(date="2026-01-05", open_hour="9", open_minute="30", end_hour="16", end_minute="0")
        path = write_schedule([row, row])
        try:
            with self.assertRaisesRegex(ValueError, "duplicate date"):
                load_schedule(path)
        finally:
            path.unlink(missing_ok=True)

    def test_end_must_follow_open(self):
        path = write_schedule([dict(date="2026-01-05", open_hour="16", open_minute="0", end_hour="9", end_minute="30")])
        try:
            with self.assertRaisesRegex(ValueError, "end time must follow"):
                load_schedule(path)
        finally:
            path.unlink(missing_ok=True)

    def test_missing_required_columns_rejected(self):
        path = write_schedule([dict(date="2026-01-05", open_hour="9")], fields=["date", "open_hour"])
        try:
            with self.assertRaisesRegex(ValueError, "missing required columns"):
                load_schedule(path)
        finally:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()

import sys
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.london_time_reference import last_sunday, is_london_summer_date, server_to_london


class LondonTimeReferenceTests(unittest.TestCase):
    def test_2026_european_dst_transition_dates(self):
        self.assertEqual(last_sunday(2026, 3), 29)
        self.assertEqual(last_sunday(2026, 10), 25)
        self.assertFalse(is_london_summer_date(2026, 3, 28))
        self.assertTrue(is_london_summer_date(2026, 3, 29))
        self.assertTrue(is_london_summer_date(2026, 10, 24))
        self.assertFalse(is_london_summer_date(2026, 10, 25))

    def test_eet_eest_server_mapping_keeps_london_open_constant(self):
        winter = server_to_london(datetime(2026, 1, 15, 9, 0), 2, 3)
        summer = server_to_london(datetime(2026, 6, 15, 9, 0), 2, 3)
        self.assertEqual(winter, datetime(2026, 1, 15, 7, 0))
        self.assertEqual(summer, datetime(2026, 6, 15, 7, 0))

    def test_non_european_or_fixed_offset_mapping_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "European-DST"):
            server_to_london(datetime(2026, 1, 15, 9, 0), 0, 0)

    def test_london_time_mapping_does_not_mutate_input(self):
        value = datetime(2026, 3, 29, 9, 0)
        result = server_to_london(value, 2, 3)
        self.assertEqual(value, datetime(2026, 3, 29, 9, 0))
        self.assertEqual(result, datetime(2026, 3, 29, 7, 0))


if __name__ == "__main__":
    unittest.main()

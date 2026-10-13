import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.volatility_setup_reference import advance_setup


class VolatilitySetupReferenceTests(unittest.TestCase):
    def test_contraction_bar_arms_without_entry(self):
        self.assertEqual(advance_setup(False, 0, 0.72, 0.69), (True, 0, False))

    def test_next_twelve_completed_bars_are_eligible(self):
        armed, age, can_trigger = True, 0, False
        for expected_age in range(1, 13):
            armed, age, can_trigger = advance_setup(armed, age, 0.69, 0.68)
            self.assertTrue(armed)
            self.assertEqual(age, expected_age)
            self.assertTrue(can_trigger)

    def test_thirteenth_bar_expires_setup(self):
        self.assertEqual(advance_setup(True, 12, 0.69, 0.68), (False, 0, False))

    def test_return_above_threshold_resets_setup(self):
        self.assertEqual(advance_setup(True, 5, 0.69, 0.70), (False, 0, False))

    def test_restart_during_existing_contraction_fails_closed(self):
        self.assertEqual(advance_setup(False, 0, 0.69, 0.68), (False, 0, False))

    def test_invalid_state_rejected(self):
        with self.assertRaisesRegex(ValueError, "invalid"):
            advance_setup(True, -1, 0.69, 0.68)


if __name__ == "__main__":
    unittest.main()

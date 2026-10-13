import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.donchian_reference import channel_before, entry_signal, exit_signal


def bar(high, low, close):
    return {"high": high, "low": low, "close": close}


class DonchianReferenceTests(unittest.TestCase):
    def test_signal_bar_is_excluded_from_entry_channel(self):
        bars = [bar(10, 8, 9), bar(11, 8, 10), bar(10.5, 8.5, 10), bar(12, 9, 11.5)]
        self.assertEqual(channel_before(bars, 3, 3), (11, 8))
        self.assertEqual(entry_signal(bars, 3, 3), "long")

    def test_breakout_requires_strict_close_beyond_channel(self):
        bars = [bar(10, 8, 9), bar(9.8, 8.2, 9), bar(10, 8, 10)]
        self.assertIsNone(entry_signal(bars, 2, 2))
        bars.append(bar(11, 8, 7.9))
        self.assertEqual(entry_signal(bars, 3, 2), "short")

    def test_insufficient_history_does_not_signal(self):
        bars = [bar(10, 8, 9), bar(11, 8, 10)]
        self.assertIsNone(entry_signal(bars, 1, 2))
        self.assertFalse(exit_signal(bars, 1, "long", 2))

    def test_exit_uses_prior_channel_not_signal_bar(self):
        bars = [bar(10, 8, 9), bar(11, 8, 10), bar(10.5, 8.5, 9), bar(12, 7, 7.5)]
        self.assertTrue(exit_signal(bars, 3, "long", 3))
        self.assertFalse(exit_signal(bars, 3, "short", 3))

    def test_invalid_bars_and_arguments_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "high is below low"):
            channel_before([bar(8, 10, 9)], 0, 1)
        with self.assertRaisesRegex(ValueError, "lookback"):
            channel_before([bar(10, 8, 9)], 0, 0)
        with self.assertRaisesRegex(ValueError, "position"):
            exit_signal([bar(10, 8, 9)], 0, "buy", 1)


if __name__ == "__main__":
    unittest.main()

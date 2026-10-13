import csv, tempfile, unittest
from pathlib import Path
from scripts.analyze_trades import analyze
class Tests(unittest.TestCase):
    def test_net_profit_and_drawdown(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"trades.csv"
            with p.open("w",newline="",encoding="utf-8") as f:
                w=csv.DictWriter(f,fieldnames=["close_time","net_profit","commission","swap"]); w.writeheader()
                w.writerows([{"close_time":"2025-01-01","net_profit":"5","commission":"-1","swap":"0"},
                             {"close_time":"2025-01-02","net_profit":"-3","commission":"-1","swap":"0"},
                             {"close_time":"2025-01-03","net_profit":"2","commission":"0","swap":"0"}])
            r=analyze(p,100); self.assertEqual(r["trade_count"],3); self.assertEqual(r["net_profit"],4)
            self.assertAlmostEqual(r["max_closed_trade_equity_drawdown_pct"],2.8571,places=3)
    def test_bad_schema(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"bad.csv"; p.write_text("time,pnl\nx,1\n")
            with self.assertRaises(ValueError): analyze(p,100)
if __name__=="__main__": unittest.main()

import argparse, csv, json, math
from pathlib import Path
def analyze(path, initial_balance=100.0):
    rows=[]
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader=csv.DictReader(f)
        if not reader.fieldnames or not {"close_time","net_profit"}.issubset(reader.fieldnames):
            raise ValueError("CSV must contain close_time and net_profit")
        for row in reader:
            p=float(row["net_profit"])
            if not math.isfinite(p): raise ValueError("net_profit must be finite")
            rows.append((row.get("close_time",""),p))
    rows.sort(key=lambda x:x[0]); balance=float(initial_balance); peak=balance; maxdd=0.0
    gp=gl=0.0; wins=0
    for _,p in rows:
        balance+=p; peak=max(peak,balance); maxdd=max(maxdd,(peak-balance)/peak if peak>0 else 0)
        if p>0: gp+=p; wins+=1
        elif p<0: gl+=-p
    n=len(rows); net=balance-initial_balance
    return {"status":"ANALYSIS_ONLY_NOT_STRATEGY_VALIDATION","trade_count":n,"initial_balance":initial_balance,"ending_balance":round(balance,8),
      "net_profit":round(net,8),"return_pct":round(net/initial_balance*100,4) if initial_balance else None,
      "win_rate_pct":round(wins/n*100,4) if n else None,"gross_profit":round(gp,8),"gross_loss_abs":round(gl,8),
      "profit_factor":round(gp/gl,6) if gl else (None if gp==0 else "infinite_no_losses"),
      "max_closed_trade_equity_drawdown_pct":round(maxdd*100,4),
      "cost_handling":"net_profit must already include all costs; costs are not subtracted again",
      "limitations":["closed-trade equity only, not intratrade drawdown","does not validate data quality or execution realism"]}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("csv",type=Path); ap.add_argument("--initial-balance",type=float,default=100.0); ap.add_argument("--out",type=Path); a=ap.parse_args()
    result=analyze(a.csv,a.initial_balance); output=json.dumps(result,indent=2)
    if a.out: a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(output+"\n",encoding="utf-8")
    print(output)
if __name__=="__main__": main()

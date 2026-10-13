#ifndef TRADING_LAB_RISK_GUARD_MQH
#define TRADING_LAB_RISK_GUARD_MQH

// Persistent per-account/symbol/strategy-magic risk circuit-breaker.
// Included only after CTrade trade; and input ulong MagicNumber are declared.
input double TLRG_DailyLossLimitPct = 1.0;   // Provisional daily equity-loss halt; review before demo
input double TLRG_DrawdownReviewPct = 5.0;  // Log once when peak-to-trough equity drawdown reaches this level
input double TLRG_DrawdownHaltPct = 10.0;   // Persistent halt until deliberate manual reset

string tlrgPrefix = "";
string tlrgDayKey = "";
string tlrgDayStartKey = "";
string tlrgPeakKey = "";
string tlrgDailyHaltKey = "";
string tlrgPeakHaltKey = "";
string tlrgReviewLoggedKey = "";
string tlrgHaltLoggedKey = "";
bool tlrgReady = false;

bool TLRG_TradeRequestAccepted()
{
   uint code = trade.ResultRetcode();
   return (code == TRADE_RETCODE_DONE ||
           code == TRADE_RETCODE_DONE_PARTIAL ||
           code == TRADE_RETCODE_PLACED);
}

int TLRG_ServerDay()
{
   datetime now = TimeTradeServer();
   if(now <= 0)
      now = TimeCurrent();
   MqlDateTime parts;
   if(!TimeToStruct(now, parts))
      return 0;
   return parts.year * 10000 + parts.mon * 100 + parts.day;
}

bool TLRG_SetIfMissing(const string key, const double value)
{
   if(GlobalVariableCheck(key))
      return true;
   return GlobalVariableSet(key, value) != 0;
}

void TLRG_DeleteState()
{
   GlobalVariableDel(tlrgDayKey);
   GlobalVariableDel(tlrgDayStartKey);
   GlobalVariableDel(tlrgPeakKey);
   GlobalVariableDel(tlrgDailyHaltKey);
   GlobalVariableDel(tlrgPeakHaltKey);
   GlobalVariableDel(tlrgReviewLoggedKey);
   GlobalVariableDel(tlrgHaltLoggedKey);
}

bool TLRG_Init()
{
   if(TLRG_DailyLossLimitPct <= 0.0 ||
      TLRG_DrawdownReviewPct <= 0.0 ||
      TLRG_DrawdownHaltPct <= TLRG_DrawdownReviewPct)
   {
      Print("Risk guard configuration invalid; initialization blocked.");
      return false;
   }

   string symbolPart = StringSubstr(_Symbol, 0, 18);
   StringReplace(symbolPart, ".", "_");
   StringReplace(symbolPart, "#", "_");
   StringReplace(symbolPart, " ", "_");
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   tlrgPrefix = "TLRG_" + (string)login + "_" + (string)MagicNumber + "_" + symbolPart;
   tlrgDayKey = tlrgPrefix + "_D";
   tlrgDayStartKey = tlrgPrefix + "_S";
   tlrgPeakKey = tlrgPrefix + "_P";
   tlrgDailyHaltKey = tlrgPrefix + "_DH";
   tlrgPeakHaltKey = tlrgPrefix + "_PH";
   tlrgReviewLoggedKey = tlrgPrefix + "_R";
   tlrgHaltLoggedKey = tlrgPrefix + "_HL";

   // Every isolated Strategy Tester run starts with a clean guard state.
   // Demo/terminal runs deliberately preserve state across EA and terminal restarts.
   if(MQLInfoInteger(MQL_TESTER) != 0 || MQLInfoInteger(MQL_OPTIMIZATION) != 0)
      TLRG_DeleteState();

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   int day = TLRG_ServerDay();
   if(equity <= 0.0 || day <= 0)
   {
      Print("Risk guard cannot read equity/server date; initialization blocked.");
      return false;
   }

   if(!TLRG_SetIfMissing(tlrgPeakKey, equity) ||
      !TLRG_SetIfMissing(tlrgDayKey, (double)day) ||
      !TLRG_SetIfMissing(tlrgDayStartKey, equity) ||
      !TLRG_SetIfMissing(tlrgDailyHaltKey, 0.0) ||
      !TLRG_SetIfMissing(tlrgPeakHaltKey, 0.0) ||
      !TLRG_SetIfMissing(tlrgReviewLoggedKey, 0.0) ||
      !TLRG_SetIfMissing(tlrgHaltLoggedKey, 0.0))
   {
      Print("Risk guard could not persist state; initialization blocked. Error=", GetLastError());
      return false;
   }

   if((int)GlobalVariableGet(tlrgDayKey) != day)
   {
      GlobalVariableSet(tlrgDayKey, (double)day);
      GlobalVariableSet(tlrgDayStartKey, equity);
      GlobalVariableSet(tlrgDailyHaltKey, 0.0);
      GlobalVariableSet(tlrgReviewLoggedKey, 0.0);
   }

   GlobalVariablesFlush();
   tlrgReady = true;
   Print("Risk guard initialized. Daily loss halt=", TLRG_DailyLossLimitPct,
         "%; drawdown review=", TLRG_DrawdownReviewPct,
         "%; persistent drawdown halt=", TLRG_DrawdownHaltPct,
         "%. State prefix=", tlrgPrefix);
   return true;
}

bool TLRG_CloseStrategyPositions()
{
   bool allClosed = true;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != MagicNumber)
         continue;

      if(!trade.PositionClose(ticket) || !TLRG_TradeRequestAccepted())
      {
         allClosed = false;
         Print("Risk guard close failed. Ticket=", ticket,
               " retcode=", trade.ResultRetcode(),
               " ", trade.ResultRetcodeDescription());
      }
   }
   return allClosed;
}

// Call on every tick, before strategy signal evaluation. Returns true when the
// strategy must not open/manage a new signal. Daily halt resets on next server
// day; peak-drawdown halt persists until the state is deliberately reset.
bool TLRG_CheckAndEnforce()
{
   if(!tlrgReady)
   {
      Print("Risk guard is not initialized; fail-closed.");
      return true;
   }

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   int day = TLRG_ServerDay();
   if(equity <= 0.0 || day <= 0)
   {
      Print("Risk guard cannot read equity/server date; trading blocked.");
      return true;
   }

   if((int)GlobalVariableGet(tlrgDayKey) != day)
   {
      GlobalVariableSet(tlrgDayKey, (double)day);
      GlobalVariableSet(tlrgDayStartKey, equity);
      GlobalVariableSet(tlrgDailyHaltKey, 0.0);
      GlobalVariableSet(tlrgReviewLoggedKey, 0.0);
      GlobalVariableSet(tlrgHaltLoggedKey, 0.0);
      GlobalVariablesFlush();
      Print("Risk guard daily reference reset at server-day boundary.");
   }

   double peak = GlobalVariableGet(tlrgPeakKey);
   if(peak <= 0.0)
   {
      Print("Risk guard peak-equity state invalid; trading blocked.");
      return true;
   }
   if(equity > peak)
   {
      peak = equity;
      GlobalVariableSet(tlrgPeakKey, peak);
      GlobalVariablesFlush();
   }

   double dayStart = GlobalVariableGet(tlrgDayStartKey);
   if(dayStart <= 0.0)
   {
      Print("Risk guard daily reference invalid; trading blocked.");
      return true;
   }

   double drawdownPct = MathMax(0.0, (peak - equity) / peak * 100.0);
   double dailyLossPct = MathMax(0.0, (dayStart - equity) / dayStart * 100.0);

   if(drawdownPct >= TLRG_DrawdownReviewPct &&
      GlobalVariableGet(tlrgReviewLoggedKey) < 0.5)
   {
      GlobalVariableSet(tlrgReviewLoggedKey, 1.0);
      GlobalVariablesFlush();
      Print("RISK REVIEW: peak-to-trough equity drawdown reached ",
            DoubleToString(drawdownPct, 2), "%.");
   }
   if(drawdownPct >= TLRG_DrawdownHaltPct && GlobalVariableGet(tlrgPeakHaltKey) < 0.5)
   {
      GlobalVariableSet(tlrgPeakHaltKey, 1.0);
      GlobalVariablesFlush();
   }
   if(dailyLossPct >= TLRG_DailyLossLimitPct && GlobalVariableGet(tlrgDailyHaltKey) < 0.5)
   {
      GlobalVariableSet(tlrgDailyHaltKey, 1.0);
      GlobalVariablesFlush();
   }

   bool halted = (GlobalVariableGet(tlrgDailyHaltKey) >= 0.5 ||
                  GlobalVariableGet(tlrgPeakHaltKey) >= 0.5);
   if(halted)
   {
      if(GlobalVariableGet(tlrgHaltLoggedKey) < 0.5)
      {
         GlobalVariableSet(tlrgHaltLoggedKey, 1.0);
         GlobalVariablesFlush();
         Print("RISK HALT: daily loss=", DoubleToString(dailyLossPct, 2),
               "%; peak drawdown=", DoubleToString(drawdownPct, 2),
               "%. New entries blocked; closing this strategy's positions.");
      }
      TLRG_CloseStrategyPositions();
      return true;
   }
   return false;
}

#endif // TRADING_LAB_RISK_GUARD_MQH

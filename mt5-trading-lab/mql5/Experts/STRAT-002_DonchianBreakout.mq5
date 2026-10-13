#property strict
#property version   "1.00"
#property description "Donchian breakout research EA. Real-account trading is blocked."

#include <Trade/Trade.mqh>

input bool   EnableStrategy = false;          // Must be deliberately enabled for tester/demo
input bool   ConfirmBrokerCostsReviewed = false; // Explicitly confirm sizing cost reserve and tester cost model
input ulong  MagicNumber = 26091502;
input int    EntryChannelBars = 20;
input int    ExitChannelBars = 10;
input int    AtrPeriod = 20;
input double AtrStopMultiplier = 2.0;
input double TargetRiskPct = 0.25;
input double HardMaxRiskPct = 0.50;
input double EstimatedSpreadCostPerLot = 0.0; // Account currency per lot; estimate round-trip spread cost for sizing
input double EstimatedRoundTurnCostPerLot = 0.0; // Account currency per lot: commission/financing reserve for sizing
input double EstimatedSlippageCostPerLot = 0.0;  // Account currency per lot; also configure realistic MT5 tester costs
input int    MaxDeviationPoints = 20;

CTrade trade;
bool TradeRequestAccepted()
{
   uint code = trade.ResultRetcode();
   return (code == TRADE_RETCODE_DONE ||
           code == TRADE_RETCODE_DONE_PARTIAL ||
           code == TRADE_RETCODE_PLACED);
}
int atrHandle = INVALID_HANDLE;
datetime lastBarTime = 0;

bool IsNewBar()
{
   datetime t = iTime(_Symbol, PERIOD_H1, 0);
   if(t == 0 || t == lastBarTime)
      return false;
   lastBarTime = t;
   return true;
}

bool GetChannel(const MqlRates &rates[], const int startShift, const int count,
                double &highest, double &lowest)
{
   if(count < 1 || ArraySize(rates) < startShift + count)
      return false;

   highest = -DBL_MAX;
   lowest = DBL_MAX;
   for(int i = startShift; i < startShift + count; i++)
   {
      if(rates[i].high > highest) highest = rates[i].high;
      if(rates[i].low < lowest) lowest = rates[i].low;
   }
   return (highest > -DBL_MAX && lowest < DBL_MAX);
}

bool FindOurPosition(ulong &ticket, ENUM_POSITION_TYPE &type, double &volume)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      ticket = t;
      type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      volume = PositionGetDouble(POSITION_VOLUME);
      return true;
   }
   return false;
}

double RoundVolumeDown(const double rawVolume)
{
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step <= 0 || minVolume <= 0 || maxVolume < minVolume || rawVolume < minVolume)
      return 0.0;

   double v = MathFloor((rawVolume + 1e-10) / step) * step;
   v = MathMin(v, maxVolume);
   int digits = 0;
   double s = step;
   while(digits < 8 && MathAbs(s - MathRound(s)) > 1e-8)
   {
      s *= 10.0;
      digits++;
   }
   v = NormalizeDouble(v, digits);
   if(v < minVolume) return 0.0;
   return v;
}

double LossForVolume(const ENUM_ORDER_TYPE orderType, const double volume,
                     const double entry, const double stop)
{
   double profit = 0.0;
   if(!OrderCalcProfit(orderType, _Symbol, volume, entry, stop, profit))
      return DBL_MAX;
   double priceLoss = MathMax(0.0, -profit);
   return priceLoss + (EstimatedSpreadCostPerLot + EstimatedRoundTurnCostPerLot + EstimatedSlippageCostPerLot) * volume;
}

double CalculateVolume(const ENUM_ORDER_TYPE orderType, const double entry, const double stop)
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   if(equity <= 0 || minVolume <= 0 || TargetRiskPct <= 0 || HardMaxRiskPct <= 0 ||
      TargetRiskPct > HardMaxRiskPct)
      return 0.0;

   double riskBudget = equity * TargetRiskPct / 100.0;
   double hardLimit = equity * HardMaxRiskPct / 100.0;
   double minLoss = LossForVolume(orderType, minVolume, entry, stop);
   if(minLoss == DBL_MAX || minLoss > hardLimit)
      return 0.0; // Broker minimum lot is too risky: skip rather than distort risk.

   double oneLotLoss = LossForVolume(orderType, 1.0, entry, stop);
   if(oneLotLoss == DBL_MAX || oneLotLoss <= 0)
      return 0.0;

   double volume = RoundVolumeDown(riskBudget / oneLotLoss);
   if(volume <= 0.0)
      return 0.0;

   double finalLoss = LossForVolume(orderType, volume, entry, stop);
   if(finalLoss == DBL_MAX || finalLoss > hardLimit)
      return 0.0;
   return volume;
}

int OnInit()
{
   if((EnableStrategy && !ConfirmBrokerCostsReviewed) ||
      EntryChannelBars < 2 || ExitChannelBars < 2 || AtrPeriod < 2 ||
      AtrStopMultiplier <= 0 || TargetRiskPct <= 0 || HardMaxRiskPct < TargetRiskPct ||
      EstimatedSpreadCostPerLot < 0 || EstimatedRoundTurnCostPerLot < 0 || EstimatedSlippageCostPerLot < 0)
      return INIT_PARAMETERS_INCORRECT;

   // Hard safety guard: this research EA must not trade on a real account.
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL)
   {
      Print("BLOCKED: STRAT-002 research EA refuses to initialize on a real account.");
      return INIT_FAILED;
   }

   atrHandle = iATR(_Symbol, PERIOD_H1, AtrPeriod);
   if(atrHandle == INVALID_HANDLE)
   {
      Print("Failed to create ATR handle. Error=", GetLastError());
      return INIT_FAILED;
   }

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(MaxDeviationPoints);
   trade.SetTypeFillingBySymbol(_Symbol);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(atrHandle != INVALID_HANDLE)
      IndicatorRelease(atrHandle);
}

void OnTick()
{
   if(!EnableStrategy)
      return;
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL)
      return;
   if(!IsNewBar())
      return;

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int required = MathMax(EntryChannelBars, ExitChannelBars) + 2;
   if(CopyRates(_Symbol, PERIOD_H1, 0, required, rates) < required)
   {
      Print("Insufficient H1 history; no action taken.");
      return;
   }

   double atrBuffer[];
   ArraySetAsSeries(atrBuffer, true);
   if(CopyBuffer(atrHandle, 0, 1, 1, atrBuffer) != 1 || atrBuffer[0] <= 0)
   {
      Print("ATR unavailable on completed bar; no action taken.");
      return;
   }

   // Channel windows begin at shift 2, excluding both the live bar and signal bar.
   double entryHigh, entryLow, exitHigh, exitLow;
   if(!GetChannel(rates, 2, EntryChannelBars, entryHigh, entryLow) ||
      !GetChannel(rates, 2, ExitChannelBars, exitHigh, exitLow))
   {
      Print("Invalid channel values; no action taken.");
      return;
   }

   ulong ticket = 0;
   ENUM_POSITION_TYPE positionType;
   double positionVolume = 0.0;
   bool hasPosition = FindOurPosition(ticket, positionType, positionVolume);

   // Exit checks first; never reverse and re-enter on the same bar.
   if(hasPosition)
   {
      bool exitLong = (positionType == POSITION_TYPE_BUY && rates[1].close < exitLow);
      bool exitShort = (positionType == POSITION_TYPE_SELL && rates[1].close > exitHigh);
      if(exitLong || exitShort)
      {
         if(!trade.PositionClose(ticket) || !TradeRequestAccepted())
            Print("Position close request failed. Retcode=", trade.ResultRetcode(),
                  " ", trade.ResultRetcodeDescription());
      }
      return;
   }

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(ask <= 0 || bid <= 0) return;

   double stopDistance = AtrStopMultiplier * atrBuffer[0];
   if(stopDistance <= 0) return;

   if(rates[1].close > entryHigh)
   {
      double entry = ask;
      double stop = NormalizeDouble(entry - stopDistance, _Digits);
      if(stop <= 0 || (entry - stop) < (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point)
         return;
      double volume = CalculateVolume(ORDER_TYPE_BUY, entry, stop);
      if(volume <= 0)
      {
         Print("Long skipped: minimum volume breaches risk cap or sizing inputs are invalid.");
         return;
      }
      if(!trade.Buy(volume, _Symbol, 0.0, stop, 0.0, "STRAT-002 Donchian long") || !TradeRequestAccepted())
         Print("Buy request failed. Retcode=", trade.ResultRetcode(),
               " ", trade.ResultRetcodeDescription());
   }
   else if(rates[1].close < entryLow)
   {
      double entry = bid;
      double stop = NormalizeDouble(entry + stopDistance, _Digits);
      if((stop - entry) < SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point)
         return;
      double volume = CalculateVolume(ORDER_TYPE_SELL, entry, stop);
      if(volume <= 0)
      {
         Print("Short skipped: minimum volume breaches risk cap or sizing inputs are invalid.");
         return;
      }
      if(!trade.Sell(volume, _Symbol, 0.0, stop, 0.0, "STRAT-002 Donchian short") || !TradeRequestAccepted())
         Print("Sell request failed. Retcode=", trade.ResultRetcode(),
               " ", trade.ResultRetcodeDescription());
   }
}

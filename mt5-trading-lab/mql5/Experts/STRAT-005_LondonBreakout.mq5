#property strict
#property version   "1.00"
#property description "Donchian breakout research EA. Real-account trading is blocked."

#include <Trade/Trade.mqh>

input bool   EnableStrategy = false;
input bool   ConfirmBrokerCostsReviewed = false;
input bool   ConfirmSessionRulesReviewed = false;
input bool   BrokerUsesEuropeanDST = false; // v1 supports only a broker server using European DST transitions
input ulong  MagicNumber = 26101305;
input int    BrokerServerUtcOffsetWinterHours = 2;
input int    BrokerServerUtcOffsetSummerHours = 3;
input int    AtrPeriod = 20;
input double TargetRiskPct = 0.25;
input double HardMaxRiskPct = 0.50;
input double EstimatedSpreadCostPerLot = 0.0;
input double EstimatedRoundTurnCostPerLot = 0.0;
input double EstimatedSlippageCostPerLot = 0.0;
input double EstimatedGapCostPerLot = 0.0;
input int    MaxDeviationPoints = 20;
input int    MaxSpreadPoints = 0;

CTrade trade;
#include <TradingLab/RiskGuard.mqh>
bool TradeRequestAccepted()
{
   uint code = trade.ResultRetcode();
   return (code == TRADE_RETCODE_DONE ||
           code == TRADE_RETCODE_DONE_PARTIAL ||
           code == TRADE_RETCODE_PLACED);
}
int atrHandle = INVALID_HANDLE;
datetime lastBarTime = 0;
int lastAttemptLondonDateKey = 0;
string attemptDateKeyName = "";

double NormalizePriceToTick(const double price)
{
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickSize <= 0.0 || price <= 0.0)
      return 0.0;
   double aligned = MathRound(price / tickSize) * tickSize;
   return NormalizeDouble(aligned, _Digits);
}

string instanceLockName = "";

bool AcquireInstanceLock()
{
   instanceLockName = "TL_" + StringSubstr(_Symbol, 0, 24) + "_" + (string)MagicNumber;
   if(!GlobalVariableCheck(instanceLockName) && !GlobalVariableTemp(instanceLockName))
   {
      Print("Could not create instance lock; initialization blocked.");
      return false;
   }
   if(!GlobalVariableSetOnCondition(instanceLockName, (double)ChartID(), 0.0))
   {
      Print("Another instance with the same symbol/magic is active; initialization blocked.");
      return false;
   }
   return true;
}

void ReleaseInstanceLock()
{
   if(instanceLockName == "" || !GlobalVariableCheck(instanceLockName))
      return;
   if(GlobalVariableGet(instanceLockName) == (double)ChartID())
      GlobalVariableDel(instanceLockName);
}

bool IsNewBar()
{
   datetime t = iTime(_Symbol, PERIOD_M15, 0);
   if(t == 0 || t == lastBarTime)
      return false;
   lastBarTime = t;
   return true;
}

int DaysInMonth(const int year, const int month)
{
   if(month == 2)
      return (((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) ? 29 : 28);
   if(month == 4 || month == 6 || month == 9 || month == 11) return 30;
   return 31;
}

int LastSundayOfMonth(const int year, const int month)
{
   MqlDateTime dt = {};
   dt.year = year;
   dt.mon = month;
   dt.day = DaysInMonth(year, month);
   dt.hour = 12;
   datetime lastDay = StructToTime(dt);
   TimeToStruct(lastDay, dt);
   return dt.day - dt.day_of_week;
}

bool IsLondonSummerDate(const int year, const int month, const int day)
{
   if(month < 3 || month > 10) return false;
   if(month > 3 && month < 10) return true;
   if(month == 3) return day >= LastSundayOfMonth(year, 3);
   return day < LastSundayOfMonth(year, 10);
}

datetime ToLondonCivilTime(const datetime serverTime)
{
   MqlDateTime dt = {};
   TimeToStruct(serverTime, dt);
   bool summer = IsLondonSummerDate(dt.year, dt.mon, dt.day);
   int serverOffset = summer ? BrokerServerUtcOffsetSummerHours : BrokerServerUtcOffsetWinterHours;
   int londonOffset = summer ? 1 : 0;
   return serverTime - (serverOffset - londonOffset) * 3600;
}

int LondonDateKey(const datetime londonTime)
{
   MqlDateTime dt = {};
   TimeToStruct(londonTime, dt);
   return dt.year * 10000 + dt.mon * 100 + dt.day;
}

bool GetLondonRange(const MqlRates &rates[], const int dateKey,
                    double &rangeHigh, double &rangeLow)
{
   rangeHigh = -DBL_MAX;
   rangeLow = DBL_MAX;
   int found = 0;
   for(int i = 0; i < ArraySize(rates); i++)
   {
      datetime londonTime = ToLondonCivilTime(rates[i].time);
      MqlDateTime dt = {};
      TimeToStruct(londonTime, dt);
      int key = dt.year * 10000 + dt.mon * 100 + dt.day;
      int minuteOfDay = dt.hour * 60 + dt.min;
      if(key != dateKey || minuteOfDay < 420 || minuteOfDay >= 465)
         continue;
      if(dt.min != 0 && dt.min != 15 && dt.min != 30)
         continue;
      rangeHigh = MathMax(rangeHigh, rates[i].high);
      rangeLow = MathMin(rangeLow, rates[i].low);
      found++;
   }
   return found == 3 && rangeHigh > rangeLow;
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

bool HasForeignPositionOnSymbol()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != MagicNumber)
         return true;
   }
   return false;
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
   return priceLoss + (EstimatedSpreadCostPerLot + EstimatedRoundTurnCostPerLot + EstimatedSlippageCostPerLot + EstimatedGapCostPerLot) * volume;
}

double CalculateVolume(const ENUM_ORDER_TYPE orderType, const double entry, const double stop)
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   if(equity <= 0 || minVolume <= 0 || TargetRiskPct <= 0 || HardMaxRiskPct > 0.50 || HardMaxRiskPct <= 0 ||
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

bool HasEnoughMargin(const ENUM_ORDER_TYPE orderType, const double volume, const double price)
{
   double requiredMargin = 0.0;
   if(!OrderCalcMargin(orderType, _Symbol, volume, price, requiredMargin) ||
      requiredMargin <= 0.0)
   {
      Print("Margin calculation failed; trade skipped. Error=", GetLastError());
      return false;
   }
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(freeMargin <= 0.0 || requiredMargin > freeMargin)
   {
      Print("Insufficient free margin; trade skipped. Required=", requiredMargin,
            " Free=", freeMargin);
      return false;
   }
   return true;
}

int OnInit()
{
   if((EnableStrategy && (!ConfirmBrokerCostsReviewed || !ConfirmSessionRulesReviewed ||
       !BrokerUsesEuropeanDST || BrokerServerUtcOffsetSummerHours != BrokerServerUtcOffsetWinterHours + 1 ||
       EstimatedSpreadCostPerLot <= 0 || EstimatedSlippageCostPerLot <= 0 ||
       EstimatedGapCostPerLot <= 0 || MaxSpreadPoints <= 0)) ||
      AtrPeriod < 2 || TargetRiskPct <= 0 || HardMaxRiskPct > 0.50 || HardMaxRiskPct < TargetRiskPct ||
      BrokerServerUtcOffsetWinterHours < -12 || BrokerServerUtcOffsetWinterHours > 14 ||
      BrokerServerUtcOffsetSummerHours < -12 || BrokerServerUtcOffsetSummerHours > 14 ||
      EstimatedSpreadCostPerLot < 0 || EstimatedRoundTurnCostPerLot < 0 ||
      EstimatedSlippageCostPerLot < 0 || EstimatedGapCostPerLot < 0 ||
      MaxDeviationPoints < 0 || MaxSpreadPoints < 0)
      return INIT_PARAMETERS_INCORRECT;

   // Hard safety guard: this research EA must not trade on a real account.
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL)
   {
      Print("BLOCKED: STRAT-005 research EA refuses to initialize on a real account.");
      return INIT_FAILED;
   }

   if(!TLRG_Init()) return INIT_FAILED;
   atrHandle = iATR(_Symbol, PERIOD_M15, AtrPeriod);
   if(atrHandle == INVALID_HANDLE)
   {
      Print("Failed to create ATR handle. Error=", GetLastError());
      return INIT_FAILED;
   }

   if(!AcquireInstanceLock())
   {
      IndicatorRelease(atrHandle);
      atrHandle = INVALID_HANDLE;
      return INIT_FAILED;
   }

   attemptDateKeyName = "TL5_LAST_" + StringSubstr(_Symbol, 0, 20) + "_" + (string)MagicNumber;
   if(GlobalVariableCheck(attemptDateKeyName))
      lastAttemptLondonDateKey = (int)GlobalVariableGet(attemptDateKeyName);

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(MaxDeviationPoints);
   trade.SetTypeFillingBySymbol(_Symbol);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   ReleaseInstanceLock();
   if(atrHandle != INVALID_HANDLE)
      IndicatorRelease(atrHandle);
}

void OnTick()
{
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL) return;
   if(TLRG_CheckAndEnforce()) return;
   if(!EnableStrategy) return;
   if(!IsNewBar()) return;

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   if(CopyRates(_Symbol, PERIOD_M15, 0, 300, rates) < 100)
   {
      Print("Insufficient M15 history; no action taken.");
      return;
   }

   double atrBuffer[];
   ArraySetAsSeries(atrBuffer, true);
   if(CopyBuffer(atrHandle, 0, 1, 1, atrBuffer) != 1 || atrBuffer[0] <= 0)
   {
      Print("ATR unavailable on completed bar; no action taken.");
      return;
   }

   datetime signalCloseServer = rates[1].time + PeriodSeconds(PERIOD_M15);
   datetime londonClose = ToLondonCivilTime(signalCloseServer);
   MqlDateTime london = {};
   TimeToStruct(londonClose, london);
   int londonDateKey = london.year * 10000 + london.mon * 100 + london.day;
   int londonMinute = london.hour * 60 + london.min;

   if(HasForeignPositionOnSymbol())
   {
      Print("Foreign position exists on this symbol; no action taken.");
      return;
   }

   ulong ticket = 0;
   ENUM_POSITION_TYPE positionType;
   double positionVolume = 0.0;
   bool hasPosition = FindOurPosition(ticket, positionType, positionVolume);
   if(hasPosition)
   {
      if(londonMinute >= 16 * 60)
      {
         if(!trade.PositionClose(ticket) || !TradeRequestAccepted())
            Print("Session close failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      }
      return;
   }

   // First eligible signal bar closes at/after 08:00 London; last closes at 15:45.
   if(londonMinute < 480 || londonMinute > 945 || londonDateKey == lastAttemptLondonDateKey)
      return;

   double rangeHigh, rangeLow;
   if(!GetLondonRange(rates, londonDateKey, rangeHigh, rangeLow))
      return;

   double rangeWidth = rangeHigh - rangeLow;
   if(rangeWidth <= 0 || rangeWidth > 2.0 * atrBuffer[0])
      return;

   bool longSignal = rates[1].close > rangeHigh;
   bool shortSignal = rates[1].close < rangeLow;
   if(!longSignal && !shortSignal)
      return;

   // Count a qualifying breakout as the one attempt for the London date, even if risk/cost gates reject it.
   lastAttemptLondonDateKey = londonDateKey;
   if(attemptDateKeyName != "") GlobalVariableSet(attemptDateKeyName, (double)lastAttemptLondonDateKey);

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(ask <= 0 || bid <= 0 || ((ask - bid) / _Point) > MaxSpreadPoints)
   {
      Print("Spread/quote gate rejected the session breakout.");
      return;
   }

   if(longSignal)
   {
      double entry = ask;
      double stop = NormalizePriceToTick(rangeLow);
      if(stop <= 0 || entry - stop < (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point)
         return;
      double volume = CalculateVolume(ORDER_TYPE_BUY, entry, stop);
      if(volume <= 0 || !HasEnoughMargin(ORDER_TYPE_BUY, volume, entry))
         return;
      if(!trade.Buy(volume, _Symbol, 0.0, stop, 0.0, "STRAT-005 London breakout long") || !TradeRequestAccepted())
         Print("Buy request failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
   }
   else if(shortSignal)
   {
      double entry = bid;
      double stop = NormalizePriceToTick(rangeHigh);
      if(stop <= entry || stop - entry < (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point)
         return;
      double volume = CalculateVolume(ORDER_TYPE_SELL, entry, stop);
      if(volume <= 0 || !HasEnoughMargin(ORDER_TYPE_SELL, volume, entry))
         return;
      if(!trade.Sell(volume, _Symbol, 0.0, stop, 0.0, "STRAT-005 London breakout short") || !TradeRequestAccepted())
         Print("Sell request failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
   }
}

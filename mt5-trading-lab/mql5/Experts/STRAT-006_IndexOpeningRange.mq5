#property strict
#property version   "1.00"
#property description "Donchian breakout research EA. Real-account trading is blocked."

#include <Trade/Trade.mqh>

input bool   EnableStrategy = false;
input bool   ConfirmBrokerCostsReviewed = false;
input bool   ConfirmSessionRulesReviewed = false;
input string SessionScheduleFile = "index_session_schedule.csv";
input ulong  MagicNumber = 26101306;
input int    RangeBars = 4;
input int    AtrPeriod = 20;
input double TargetRMultiple = 2.0;
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
int lastAttemptSessionDateKey = 0;
string attemptSessionKeyName = "";

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

int SessionDateKey(const datetime serverTime)
{
   MqlDateTime dt = {};
   TimeToStruct(serverTime, dt);
   return dt.year * 10000 + dt.mon * 100 + dt.day;
}

datetime SessionDateStart(const int dateKey)
{
   MqlDateTime dt = {};
   dt.year = dateKey / 10000;
   dt.mon = (dateKey / 100) % 100;
   dt.day = dateKey % 100;
   dt.hour = 0;
   dt.min = 0;
   dt.sec = 0;
   return StructToTime(dt);
}

bool LoadSessionSchedule(const int dateKey, int &openHour, int &openMinute,
                         int &endHour, int &endMinute)
{
   int file = FileOpen(SessionScheduleFile, FILE_READ | FILE_CSV | FILE_ANSI | FILE_COMMON, ',');
   if(file == INVALID_HANDLE)
      return false;

   bool found = false;
   while(!FileIsEnding(file))
   {
      string dateText = FileReadString(file);
      if(dateText == "" && FileIsEnding(file)) break;
      string ohText = FileReadString(file);
      string omText = FileReadString(file);
      string ehText = FileReadString(file);
      string emText = FileReadString(file);
      if(dateText == "" || dateText == "date") continue;
      int year = (int)StringToInteger(StringSubstr(dateText, 0, 4));
      int month = (int)StringToInteger(StringSubstr(dateText, 5, 2));
      int day = (int)StringToInteger(StringSubstr(dateText, 8, 2));
      int rowKey = year * 10000 + month * 100 + day;
      if(rowKey != dateKey) continue;

      openHour = (int)StringToInteger(ohText);
      openMinute = (int)StringToInteger(omText);
      endHour = (int)StringToInteger(ehText);
      endMinute = (int)StringToInteger(emText);
      int openTotal = openHour * 60 + openMinute;
      int endTotal = endHour * 60 + endMinute;
      found = (openHour >= 0 && openHour <= 23 && endHour >= 0 && endHour <= 23 &&
               openMinute >= 0 && openMinute <= 59 && endMinute >= 0 && endMinute <= 59 &&
               endTotal > openTotal);
      break;
   }
   FileClose(file);
   return found;
}

bool SessionScheduleFileAvailable()
{
   int file = FileOpen(SessionScheduleFile, FILE_READ | FILE_CSV | FILE_ANSI | FILE_COMMON, ',');
   if(file == INVALID_HANDLE) return false;
   FileClose(file);
   return true;
}

bool GetOpeningRange(const MqlRates &rates[], const datetime sessionOpen,
                     const int barsCount, double &rangeHigh, double &rangeLow)
{
   rangeHigh = -DBL_MAX;
   rangeLow = DBL_MAX;
   int found = 0;
   int rangeSeconds = barsCount * PeriodSeconds(PERIOD_M15);
   for(int i = 0; i < ArraySize(rates); i++)
   {
      if(rates[i].time < sessionOpen || rates[i].time >= sessionOpen + rangeSeconds)
         continue;
      rangeHigh = MathMax(rangeHigh, rates[i].high);
      rangeLow = MathMin(rangeLow, rates[i].low);
      found++;
   }
   return (found == barsCount && rangeHigh > rangeLow);
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
       !SessionScheduleFileAvailable() || EstimatedSpreadCostPerLot <= 0 ||
       EstimatedSlippageCostPerLot <= 0 || EstimatedGapCostPerLot <= 0 || MaxSpreadPoints <= 0)) ||
      RangeBars != 4 || AtrPeriod < 2 || TargetRMultiple <= 0 ||
      TargetRiskPct <= 0 || HardMaxRiskPct > 0.50 || HardMaxRiskPct < TargetRiskPct ||
      EstimatedSpreadCostPerLot < 0 || EstimatedRoundTurnCostPerLot < 0 ||
      EstimatedSlippageCostPerLot < 0 || EstimatedGapCostPerLot < 0 ||
      MaxDeviationPoints < 0 || MaxSpreadPoints < 0)
      return INIT_PARAMETERS_INCORRECT;

   // Hard safety guard: this research EA must not trade on a real account.
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL)
   {
      Print("BLOCKED: STRAT-006 research EA refuses to initialize on a real account.");
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

   attemptSessionKeyName = "TL6_LAST_" + StringSubstr(_Symbol, 0, 20) + "_" + (string)MagicNumber;
   if(GlobalVariableCheck(attemptSessionKeyName))
      lastAttemptSessionDateKey = (int)GlobalVariableGet(attemptSessionKeyName);

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
   if(!EnableStrategy) return;
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL) return;
   if(!IsNewBar()) return;
   if(TLRG_CheckAndEnforce()) return;

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   if(CopyRates(_Symbol, PERIOD_M15, 0, 500, rates) < 100)
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

   datetime signalCloseTime = rates[1].time + PeriodSeconds(PERIOD_M15);
   int dateKey = SessionDateKey(signalCloseTime);
   int openHour = 0, openMinute = 0, endHour = 0, endMinute = 0;
   bool hasSchedule = LoadSessionSchedule(dateKey, openHour, openMinute, endHour, endMinute);

   if(HasForeignPositionOnSymbol())
   {
      Print("Foreign position exists on this symbol; no action taken.");
      return;
   }

   ulong ticket = 0;
   ENUM_POSITION_TYPE positionType;
   double positionVolume = 0.0;
   bool hasPosition = FindOurPosition(ticket, positionType, positionVolume);
   if(!hasSchedule)
   {
      if(hasPosition && (!trade.PositionClose(ticket) || !TradeRequestAccepted()))
         Print("No session schedule for this date; emergency close failed. Retcode=", trade.ResultRetcode());
      return;
   }

   datetime dateStart = SessionDateStart(dateKey);
   datetime sessionOpen = dateStart + openHour * 3600 + openMinute * 60;
   datetime sessionEnd = dateStart + endHour * 3600 + endMinute * 60;
   datetime rangeEnd = sessionOpen + RangeBars * PeriodSeconds(PERIOD_M15);
   datetime forceCloseTime = sessionEnd - PeriodSeconds(PERIOD_M15);

   if(hasPosition)
   {
      if(signalCloseTime >= forceCloseTime)
      {
         if(!trade.PositionClose(ticket) || !TradeRequestAccepted())
            Print("Session-end close failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      }
      return;
   }

   if(signalCloseTime < rangeEnd || signalCloseTime >= forceCloseTime ||
      dateKey == lastAttemptSessionDateKey)
      return;

   double rangeHigh, rangeLow;
   if(!GetOpeningRange(rates, sessionOpen, RangeBars, rangeHigh, rangeLow))
      return;

   bool longSignal = rates[1].close > rangeHigh;
   bool shortSignal = rates[1].close < rangeLow;
   if(!longSignal && !shortSignal)
      return;

   lastAttemptSessionDateKey = dateKey;
   if(attemptSessionKeyName != "") GlobalVariableSet(attemptSessionKeyName, (double)lastAttemptSessionDateKey);

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(ask <= 0 || bid <= 0 || ((ask - bid) / _Point) > MaxSpreadPoints)
   {
      Print("Spread/quote gate rejected opening-range breakout.");
      return;
   }

   if(longSignal)
   {
      double entry = ask;
      double stop = NormalizePriceToTick(rangeLow);
      double riskDistance = entry - stop;
      double target = NormalizePriceToTick(entry + TargetRMultiple * riskDistance);
      double minStopDistance = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(stop <= 0 || riskDistance < minStopDistance || target <= entry ||
         target - entry < minStopDistance)
         return;
      double volume = CalculateVolume(ORDER_TYPE_BUY, entry, stop);
      if(volume <= 0 || !HasEnoughMargin(ORDER_TYPE_BUY, volume, entry)) return;
      if(!trade.Buy(volume, _Symbol, 0.0, stop, target, "STRAT-006 index ORB long") || !TradeRequestAccepted())
         Print("Buy request failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
   }
   else if(shortSignal)
   {
      double entry = bid;
      double stop = NormalizePriceToTick(rangeHigh);
      double riskDistance = stop - entry;
      double target = NormalizePriceToTick(entry - TargetRMultiple * riskDistance);
      double minStopDistance = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(stop <= entry || riskDistance < minStopDistance || target <= 0 ||
         entry - target < minStopDistance)
         return;
      double volume = CalculateVolume(ORDER_TYPE_SELL, entry, stop);
      if(volume <= 0 || !HasEnoughMargin(ORDER_TYPE_SELL, volume, entry)) return;
      if(!trade.Sell(volume, _Symbol, 0.0, stop, target, "STRAT-006 index ORB short") || !TradeRequestAccepted())
         Print("Sell request failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
   }
}

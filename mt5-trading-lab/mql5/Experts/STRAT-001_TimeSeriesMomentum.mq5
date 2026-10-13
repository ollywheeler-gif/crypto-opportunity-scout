#property strict
#property version   "1.00"
#property description "Time-series momentum research EA. Real-account trading is blocked."

#include <Trade/Trade.mqh>

input bool   EnableStrategy = false;
input bool   ConfirmBrokerCostsReviewed = false;
input ulong  MagicNumber = 26101301;
input int    MomentumLookback = 126;
input int    AtrPeriod = 20;
input double AtrStopMultiplier = 3.0;
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
int atrHandle = INVALID_HANDLE;
datetime lastBarTime = 0;

bool TradeRequestAccepted()
{
   uint code = trade.ResultRetcode();
   return (code == TRADE_RETCODE_DONE ||
           code == TRADE_RETCODE_DONE_PARTIAL ||
           code == TRADE_RETCODE_PLACED);
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
   datetime t = iTime(_Symbol, PERIOD_D1, 0);
   if(t == 0 || t == lastBarTime) return false;
   lastBarTime = t;
   return true;
}

double NormalizePriceToTick(const double price)
{
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickSize <= 0.0 || price <= 0.0) return 0.0;
   return NormalizeDouble(MathRound(price / tickSize) * tickSize, _Digits);
}

bool HasForeignPositionOnSymbol()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != MagicNumber) return true;
   }
   return false;
}

bool FindOurPosition(ulong &ticket, ENUM_POSITION_TYPE &type)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if(t == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      ticket = t;
      type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      return true;
   }
   return false;
}

double RoundVolumeDown(const double rawVolume)
{
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step <= 0 || minVolume <= 0 || maxVolume < minVolume || rawVolume < minVolume) return 0.0;
   double v = MathFloor((rawVolume + 1e-10) / step) * step;
   v = MathMin(v, maxVolume);
   int digits = 0;
   double s = step;
   while(digits < 8 && MathAbs(s - MathRound(s)) > 1e-8) { s *= 10.0; digits++; }
   v = NormalizeDouble(v, digits);
   return (v < minVolume ? 0.0 : v);
}

double LossForVolume(const ENUM_ORDER_TYPE orderType, const double volume,
                     const double entry, const double stop)
{
   double profit = 0.0;
   if(!OrderCalcProfit(orderType, _Symbol, volume, entry, stop, profit)) return DBL_MAX;
   double priceLoss = MathMax(0.0, -profit);
   double costs = EstimatedSpreadCostPerLot + EstimatedRoundTurnCostPerLot +
                  EstimatedSlippageCostPerLot + EstimatedGapCostPerLot;
   return priceLoss + costs * volume;
}

double CalculateVolume(const ENUM_ORDER_TYPE orderType, const double entry, const double stop)
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   if(equity <= 0 || minVolume <= 0 || TargetRiskPct <= 0 ||
      HardMaxRiskPct < TargetRiskPct) return 0.0;
   double riskBudget = equity * TargetRiskPct / 100.0;
   double hardLimit = equity * HardMaxRiskPct / 100.0;
   double minLoss = LossForVolume(orderType, minVolume, entry, stop);
   if(minLoss == DBL_MAX || minLoss > hardLimit) return 0.0;
   double oneLotLoss = LossForVolume(orderType, 1.0, entry, stop);
   if(oneLotLoss == DBL_MAX || oneLotLoss <= 0) return 0.0;
   double volume = RoundVolumeDown(riskBudget / oneLotLoss);
   if(volume <= 0) return 0.0;
   double finalLoss = LossForVolume(orderType, volume, entry, stop);
   if(finalLoss == DBL_MAX || finalLoss > hardLimit) return 0.0;
   return volume;
}

bool HasEnoughMargin(const ENUM_ORDER_TYPE orderType, const double volume, const double price)
{
   double requiredMargin = 0.0;
   if(!OrderCalcMargin(orderType, _Symbol, volume, price, requiredMargin) || requiredMargin <= 0.0)
   {
      Print("Margin calculation failed; trade skipped. Error=", GetLastError());
      return false;
   }
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(freeMargin <= 0.0 || requiredMargin > freeMargin)
   {
      Print("Insufficient free margin; trade skipped. Required=", requiredMargin, " Free=", freeMargin);
      return false;
   }
   return true;
}

int OnInit()
{
   if((EnableStrategy && (!ConfirmBrokerCostsReviewed || EstimatedSpreadCostPerLot <= 0 ||
       EstimatedSlippageCostPerLot <= 0 || EstimatedGapCostPerLot <= 0 || MaxSpreadPoints <= 0)) ||
      MomentumLookback < 2 || AtrPeriod < 2 ||
      AtrStopMultiplier <= 0 || TargetRiskPct <= 0 || HardMaxRiskPct < TargetRiskPct ||
      EstimatedSpreadCostPerLot < 0 || EstimatedRoundTurnCostPerLot < 0 ||
      EstimatedSlippageCostPerLot < 0 || EstimatedGapCostPerLot < 0 ||
      MaxDeviationPoints < 0 || MaxSpreadPoints < 0)
      return INIT_PARAMETERS_INCORRECT;

   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL)
   {
      Print("BLOCKED: STRAT-001 research EA refuses to initialize on a real account.");
      return INIT_FAILED;
   }

   if(!TLRG_Init()) return INIT_FAILED;
   atrHandle = iATR(_Symbol, PERIOD_D1, AtrPeriod);
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

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(MaxDeviationPoints);
   trade.SetTypeFillingBySymbol(_Symbol);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   ReleaseInstanceLock();
   if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);
}

void OnTick()
{
   if((ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_REAL) return;
   if(TLRG_CheckAndEnforce()) return;
   if(!EnableStrategy) return;
   if(!IsNewBar()) return;

   double atr[];
   ArraySetAsSeries(atr, true);
   if(CopyBuffer(atrHandle, 0, 1, 1, atr) != 1 || atr[0] <= 0)
   {
      Print("ATR history unavailable; no action taken.");
      return;
   }

   double closeNow = iClose(_Symbol, PERIOD_D1, 1);
   double closeLookback = iClose(_Symbol, PERIOD_D1, MomentumLookback + 1);
   double closePrevious = iClose(_Symbol, PERIOD_D1, 2);
   double closePreviousLookback = iClose(_Symbol, PERIOD_D1, MomentumLookback + 2);
   if(closeNow <= 0 || closeLookback <= 0 || closePrevious <= 0 || closePreviousLookback <= 0)
   {
      Print("Momentum history unavailable; no action taken.");
      return;
   }

   double momentum = closeNow / closeLookback - 1.0;
   double previousMomentum = closePrevious / closePreviousLookback - 1.0;
   bool longSignal = (momentum > 0.0);
   bool shortSignal = (momentum < 0.0);
   if(HasForeignPositionOnSymbol())
   {
      Print("Foreign position exists on this symbol; no action taken.");
      return;
   }

   ulong ticket = 0;
   ENUM_POSITION_TYPE positionType;
   bool hasPosition = FindOurPosition(ticket, positionType);
   if(hasPosition)
   {
      bool reverse = (positionType == POSITION_TYPE_BUY && shortSignal) ||
                     (positionType == POSITION_TYPE_SELL && longSignal);
      if(reverse && (!trade.PositionClose(ticket) || !TradeRequestAccepted()))
         Print("Close failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
      return;
   }

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(ask <= 0 || bid <= 0 || ((ask - bid) / _Point) > MaxSpreadPoints) return;
   double stopDistance = AtrStopMultiplier * atr[0];
   if(stopDistance <= 0) return;

   if(longSignal)
   {
      double entry = ask;
      double stop = NormalizePriceToTick(entry - stopDistance);
      if(stop <= 0 || entry - stop < SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point) return;
      double volume = CalculateVolume(ORDER_TYPE_BUY, entry, stop);
      if(volume <= 0 || !HasEnoughMargin(ORDER_TYPE_BUY, volume, entry)) return;
      if(!trade.Buy(volume, _Symbol, 0.0, stop, 0.0, "STRAT-001 momentum long") || !TradeRequestAccepted())
         Print("Buy failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
   }
   else if(shortSignal)
   {
      double entry = bid;
      double stop = NormalizePriceToTick(entry + stopDistance);
      if(stop <= entry || stop - entry < SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point) return;
      double volume = CalculateVolume(ORDER_TYPE_SELL, entry, stop);
      if(volume <= 0 || !HasEnoughMargin(ORDER_TYPE_SELL, volume, entry)) return;
      if(!trade.Sell(volume, _Symbol, 0.0, stop, 0.0, "STRAT-001 momentum short") || !TradeRequestAccepted())
         Print("Sell failed. Retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription());
   }
}

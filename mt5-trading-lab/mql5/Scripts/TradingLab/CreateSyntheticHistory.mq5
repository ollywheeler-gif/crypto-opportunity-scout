#property strict
#property script_show_inputs
#property version "1.00"
#property description "Creates deterministic synthetic M1 bars for mechanics-only MT5 Strategy Tester smoke tests."

input string CustomSymbolName = "TLTEST.EURUSD";
input string OriginSymbol = "EURUSD";
input datetime StartTime = D'2025.01.06 00:00';
input int BarsToCreate = 20000;
input double BasePrice = 1.10000;

void OnStart()
{
   if(BarsToCreate < 3000 || BarsToCreate > 100000)
   {
      Print("BarsToCreate must be between 3000 and 100000.");
      return;
   }

   if(!SymbolSelect(OriginSymbol, true))
   {
      Print("Cannot select origin symbol ", OriginSymbol, ". Error=", GetLastError());
      return;
   }

   if(SymbolInfoInteger(CustomSymbolName, SYMBOL_CUSTOM))
   {
      if(!CustomSymbolDelete(CustomSymbolName))
      {
         Print("Cannot delete previous synthetic symbol ", CustomSymbolName,
               ". Error=", GetLastError());
         return;
      }
   }

   if(!CustomSymbolCreate(CustomSymbolName, "TradingLab", OriginSymbol))
   {
      Print("CustomSymbolCreate failed. Error=", GetLastError());
      return;
   }

   // Keep origin contract metadata, but force full trade mode and a known description.
   CustomSymbolSetString(CustomSymbolName, SYMBOL_DESCRIPTION,
                         "Synthetic mechanics-only test data; not market prices");
   CustomSymbolSetInteger(CustomSymbolName, SYMBOL_TRADE_MODE, SYMBOL_TRADE_MODE_FULL);
   CustomSymbolSetInteger(CustomSymbolName, SYMBOL_SPREAD_FLOAT, true);

   MqlRates rates[];
   ArrayResize(rates, BarsToCreate);
   for(int i = 0; i < BarsToCreate; i++)
   {
      datetime barTime = StartTime + (datetime)(i * 60);
      double slow = 0.0025 * MathSin((double)i / 600.0);
      double medium = 0.0010 * MathSin((double)i / 37.0);
      double regime = 0.0000004 * (double)i;
      if((i / 3500) % 2 == 1)
         regime = -regime;
      double closePrice = BasePrice + slow + medium + regime;
      double openPrice = BasePrice
                         + 0.0025 * MathSin((double)(i - 1) / 600.0)
                         + 0.0010 * MathSin((double)(i - 1) / 37.0)
                         + regime;
      double wick = 0.00012 + 0.00003 * MathAbs(MathSin((double)i / 11.0));

      rates[i].time = barTime;
      rates[i].open = NormalizeDouble(openPrice, 5);
      rates[i].close = NormalizeDouble(closePrice, 5);
      rates[i].high = NormalizeDouble(MathMax(openPrice, closePrice) + wick, 5);
      rates[i].low = NormalizeDouble(MathMin(openPrice, closePrice) - wick, 5);
      rates[i].tick_volume = 100;
      rates[i].spread = 20;
      rates[i].real_volume = 0;
   }

   int updated = CustomRatesReplace(CustomSymbolName, StartTime,
                                    StartTime + (datetime)(BarsToCreate * 60), rates);
   if(updated < 1)
   {
      Print("CustomRatesReplace failed. Error=", GetLastError(),
            "; updated=", updated);
      return;
   }

   if(!SymbolSelect(CustomSymbolName, true))
   {
      Print("Cannot select custom symbol. Error=", GetLastError());
      return;
   }

   Print("SYNTHETIC_HISTORY_READY symbol=", CustomSymbolName,
         " bars=", updated,
         " start=", TimeToString(StartTime),
         " end=", TimeToString(StartTime + (datetime)((BarsToCreate - 1) * 60)),
         " origin=", OriginSymbol,
         " NOTE=synthetic mechanics-only data; not performance evidence");

   if(MQLInfoInteger(MQL_STARTED_FROM_CONFIG))
      TerminalClose(0);
}

#property strict
#property script_show_inputs
#property version "1.00"
#property description "Exports symbol contract metadata for capital-feasibility review; sends no orders."

input string ContractSymbolInput = "";
input string OutputFileName = "TradingLab_symbol_contract.csv";

string BoolText(const bool value) { return value ? "true" : "false"; }

void OnStart()
{
   string symbol = ContractSymbolInput;
   if(symbol == "")
      symbol = _Symbol;

   if(!SymbolSelect(symbol, true))
   {
      Print("CONTRACT_EXPORT_FAILED symbol selection error=", GetLastError(), " symbol=", symbol);
      return;
   }

   MqlTick tick;
   bool hasTick = SymbolInfoTick(symbol, tick);
   double minVolume = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double ask = hasTick ? tick.ask : 0.0;
   double minMargin = 0.0;
   bool marginCalculated = false;
   if(minVolume > 0.0 && ask > 0.0)
      marginCalculated = OrderCalcMargin(ORDER_TYPE_BUY, symbol, minVolume, ask, minMargin);

   int handle = FileOpen(OutputFileName, FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
   {
      Print("CONTRACT_EXPORT_FAILED file open error=", GetLastError(), " file=", OutputFileName);
      return;
   }

   FileWrite(handle, "field", "value", "unit_or_note");
   FileWrite(handle, "symbol", symbol, "");
   FileWrite(handle, "captured_server_time", TimeToString(TimeTradeServer(), TIME_DATE|TIME_SECONDS), "broker server time");
   FileWrite(handle, "terminal_build", (string)TerminalInfoInteger(TERMINAL_BUILD), "");
   FileWrite(handle, "account_currency", AccountInfoString(ACCOUNT_CURRENCY), "currency only; no account identifier exported");
   FileWrite(handle, "point", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_POINT), 10), "price units");
   FileWrite(handle, "digits", (string)SymbolInfoInteger(symbol, SYMBOL_DIGITS), "");
   FileWrite(handle, "tick_size", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE), 10), "price units");
   FileWrite(handle, "tick_value", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE), 8), "account currency per tick per lot");
   FileWrite(handle, "tick_value_profit", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE_PROFIT), 8), "account currency per tick per lot");
   FileWrite(handle, "tick_value_loss", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE_LOSS), 8), "account currency per tick per lot");
   FileWrite(handle, "contract_size", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE), 8), "units per lot; verify calculation mode");
   FileWrite(handle, "volume_min", DoubleToString(minVolume, 8), "lots/contracts");
   FileWrite(handle, "volume_max", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX), 8), "lots/contracts");
   FileWrite(handle, "volume_step", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP), 8), "lots/contracts");
   FileWrite(handle, "stops_level_points", (string)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL), "points");
   FileWrite(handle, "freeze_level_points", (string)SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL), "points");
   FileWrite(handle, "spread_points", (string)SymbolInfoInteger(symbol, SYMBOL_SPREAD), "current quote; not a spread distribution");
   FileWrite(handle, "spread_float", BoolText((bool)SymbolInfoInteger(symbol, SYMBOL_SPREAD_FLOAT)), "");
   FileWrite(handle, "trade_mode", (string)SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE), "see official MQL5 enum");
   FileWrite(handle, "calc_mode", (string)SymbolInfoInteger(symbol, SYMBOL_TRADE_CALC_MODE), "see official MQL5 enum");
   FileWrite(handle, "margin_initial", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_MARGIN_INITIAL), 8), "broker-reported; interpret by calculation mode");
   FileWrite(handle, "margin_maintenance", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_MARGIN_MAINTENANCE), 8), "broker-reported; interpret by calculation mode");
   FileWrite(handle, "currency_base", SymbolInfoString(symbol, SYMBOL_CURRENCY_BASE), "");
   FileWrite(handle, "currency_profit", SymbolInfoString(symbol, SYMBOL_CURRENCY_PROFIT), "");
   FileWrite(handle, "currency_margin", SymbolInfoString(symbol, SYMBOL_CURRENCY_MARGIN), "");
   FileWrite(handle, "swap_mode", (string)SymbolInfoInteger(symbol, SYMBOL_SWAP_MODE), "see official MQL5 enum");
   FileWrite(handle, "swap_long", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_SWAP_LONG), 8), "broker quote; historical swap schedule still required");
   FileWrite(handle, "swap_short", DoubleToString(SymbolInfoDouble(symbol, SYMBOL_SWAP_SHORT), 8), "broker quote; historical swap schedule still required");
   FileWrite(handle, "swap_rollover3days", (string)SymbolInfoInteger(symbol, SYMBOL_SWAP_ROLLOVER3DAYS), "day-of-week enum");
   FileWrite(handle, "quote_available", BoolText(hasTick), "");
   FileWrite(handle, "ask", DoubleToString(ask, 10), "snapshot only");
   FileWrite(handle, "bid", DoubleToString(hasTick ? tick.bid : 0.0, 10), "snapshot only");
   FileWrite(handle, "min_volume_buy_margin_calculated", BoolText(marginCalculated), "");
   FileWrite(handle, "min_volume_buy_margin", DoubleToString(minMargin, 8), "account currency; requires current quote and account context");
   FileWrite(handle, "account_equity_gbp", "", "enter only in private feasibility worksheet; not exported");
   FileWrite(handle, "fx_conversion_rate", "", "verify separately; account currency units per GBP");

   FileClose(handle);
   Print("CONTRACT_EXPORT_READY symbol=", symbol,
         " file=MQL5/Files/", OutputFileName,
         " margin_calculated=", BoolText(marginCalculated),
         " NOTE=metadata snapshot only; verify with broker and historical cost data");
}

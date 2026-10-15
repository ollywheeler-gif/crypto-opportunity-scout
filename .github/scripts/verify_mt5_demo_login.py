"""Verify an IC Markets MT5 demo login using MetaTrader's official Python API."""
import os
import sys
from pathlib import Path

import MetaTrader5 as mt5


def main() -> int:
    login_text = os.environ.get("MT5_DEMO_LOGIN", "").strip()
    password = os.environ.get("MT5_DEMO_PASSWORD", "")
    server = os.environ.get("MT5_DEMO_SERVER", "").strip()
    terminal_path = os.environ.get("MT5_TERMINAL_PATH", "").strip()

    if not login_text.isdigit() or not password or not server or not terminal_path:
        print("FAIL: one or more required settings are missing (values withheld).")
        return 2
    if server != "ICMarketsSC-Demo":
        print("FAIL: MT5_DEMO_SERVER must exactly equal ICMarketsSC-Demo.")
        return 2

    terminal = Path(terminal_path)
    if not terminal.is_file():
        print("FAIL: MetaTrader terminal executable was not found at the expected install path.")
        return 2

    login = int(login_text)
    print("Stage 1: initialize terminal without account credentials (isolates terminal IPC).")
    print(f"Terminal executable: {terminal}")
    print(f"MetaTrader5 Python package version: {mt5.__version__}")

    # First establish terminal IPC independently of broker credentials. This helps
    # distinguish terminal/Python communication failures from account login failures.
    if not mt5.initialize(str(terminal), timeout=60000, portable=True):
        print(f"FAIL: terminal initialize() failed before account login; last_error={mt5.last_error()!r}")
        mt5.shutdown()
        return 1

    try:
        version = mt5.version()
        print(f"Terminal version/build: {version!r}")
        terminal_info = mt5.terminal_info()
        if terminal_info is None:
            print(f"FAIL: terminal_info() returned None; last_error={mt5.last_error()!r}")
            return 1

        print("Stage 1 PASS: Python connected to the terminal.")
        print("Stage 2: authenticate the requested demo account using the official login() API.")
        if not mt5.login(login, password=password, server=server, timeout=60000):
            print(f"FAIL: login() returned False; last_error={mt5.last_error()!r}")
            return 1

        account = mt5.account_info()
        terminal_info = mt5.terminal_info()
        if account is None:
            print(f"FAIL: account_info() returned None; last_error={mt5.last_error()!r}")
            return 1
        if terminal_info is None:
            print(f"FAIL: terminal_info() returned None after login; last_error={mt5.last_error()!r}")
            return 1

        actual_login = int(account.login)
        actual_server = str(account.server)
        print(f"Authenticated account: {actual_login}")
        print(f"Authenticated server: {actual_server}")
        print(f"Terminal connected flag: {getattr(terminal_info, 'connected', 'unknown')}")

        if actual_login != login:
            print("FAIL: authenticated account number does not match the requested demo account.")
            return 1
        if actual_server != server:
            print("FAIL: authenticated server does not exactly match the requested IC Markets demo server.")
            return 1
        if not bool(getattr(terminal_info, "connected", False)):
            print("FAIL: terminal connected flag is false.")
            return 1

        print("PASS: official Python API confirmed the requested account and ICMarketsSC-Demo server are connected.")
        return 0
    finally:
        mt5.shutdown()
        print("MetaTrader Python session shut down.")


if __name__ == "__main__":
    sys.exit(main())

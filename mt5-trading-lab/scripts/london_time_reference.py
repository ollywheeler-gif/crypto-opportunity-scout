"""Reference date conversion for STRAT-005's supported European-DST server mapping.

This validates calendar math only; broker offsets must still be sourced and
verified against real MT5 server timestamps.
"""
from calendar import monthrange
from datetime import datetime, timedelta


def last_sunday(year: int, month: int) -> int:
    last_day = monthrange(year, month)[1]
    return last_day - (datetime(year, month, last_day).weekday() + 1) % 7


def is_london_summer_date(year: int, month: int, day: int) -> bool:
    if month < 3 or month > 10:
        return False
    if 3 < month < 10:
        return True
    if month == 3:
        return day >= last_sunday(year, 3)
    return day < last_sunday(year, 10)


def server_to_london(server_time: datetime, winter_offset: int, summer_offset: int) -> datetime:
    if summer_offset != winter_offset + 1:
        raise ValueError("v1 only supports European-DST broker offsets differing by one hour")
    summer = is_london_summer_date(server_time.year, server_time.month, server_time.day)
    server_offset = summer_offset if summer else winter_offset
    london_offset = 1 if summer else 0
    return server_time - timedelta(hours=server_offset - london_offset)

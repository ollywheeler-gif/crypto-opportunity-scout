"""Validate a broker-supplied per-date index session schedule.

This validates file structure only; it does not prove that hours match the
broker's official market session or server timezone.
"""
import csv
from datetime import date
from pathlib import Path

REQUIRED = {"date", "open_hour", "open_minute", "end_hour", "end_minute"}


def load_schedule(path):
    with Path(path).open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not REQUIRED.issubset(set(reader.fieldnames)):
            raise ValueError("session schedule missing required columns")
        schedule = {}
        for line_number, row in enumerate(reader, start=2):
            try:
                day = date.fromisoformat((row.get("date") or "").strip())
            except ValueError as exc:
                raise ValueError(f"line {line_number}: date must be YYYY-MM-DD") from exc
            values = {}
            for key in ("open_hour", "open_minute", "end_hour", "end_minute"):
                raw = (row.get(key) or "").strip()
                try:
                    values[key] = int(raw)
                except ValueError as exc:
                    raise ValueError(f"line {line_number}: {key} must be an integer") from exc
            oh, om, eh, em = (values["open_hour"], values["open_minute"],
                              values["end_hour"], values["end_minute"])
            if not (0 <= oh <= 23 and 0 <= eh <= 23 and 0 <= om <= 59 and 0 <= em <= 59):
                raise ValueError(f"line {line_number}: time fields out of range")
            if eh * 60 + em <= oh * 60 + om:
                raise ValueError(f"line {line_number}: end time must follow open time on the same date")
            key = day.isoformat()
            if key in schedule:
                raise ValueError(f"line {line_number}: duplicate date {key}")
            schedule[key] = values
    return schedule


def validate_schedule(path, expected_dates=None):
    schedule = load_schedule(path)
    if expected_dates is not None:
        missing = sorted(set(expected_dates) - set(schedule))
        if missing:
            raise ValueError("missing session dates: " + ", ".join(missing))
    return {"rows": len(schedule), "dates": sorted(schedule), "status": "STRUCTURE_VALIDATION_ONLY"}

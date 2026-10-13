# STRAT-006 broker session schedule

The STRAT-006 EA intentionally has no assumed market-open time. It reads `index_session_schedule.csv` from the MT5 Common Files directory (`Terminal\Common\Files`) and refuses to trade when no valid schedule exists for the current server date.

## Schedule format

Copy `research/index_session_schedule_template.csv` to the exact filename configured in the EA. Each row represents one trading date and gives the cash-session open and end in **broker server time**:

`date,open_hour,open_minute,end_hour,end_minute`

- Date format is `YYYY-MM-DD`.
- Hours are 0–23; minutes are 0–59.
- End time must be later than open time on the same server date.
- Include only confirmed trading sessions; omit holidays and shortened sessions unless the exact official hours are known.
- The EA builds the range from the first four completed M15 bars after the scheduled open, enters on a later completed-bar close beyond the range, allows one attempt per date, sets the stop at the opposite range edge and target at 2R, and closes any position at the scheduled session end minus 15 minutes.
- If no schedule exists for a date while a position is open, the EA attempts an emergency close rather than carry the position into an unknown session.

## Evidence needed before enabling

1. Select one cash-index CFD and record the exact broker symbol and contract specification.
2. Obtain official cash-session hours, holidays and shortened-session rules for the chosen market.
3. Convert those hours to broker server time for every date in the test range, including DST transitions. Do not assume broker time is UTC, London time or New York time.
4. Independently spot-check several dates at each DST transition against MT5 bar timestamps and broker documentation.
5. Hash the schedule file, commit the hash to the test manifest, and freeze the date range before inspecting results.
6. Keep `ConfirmSessionRulesReviewed=false` until the evidence is complete. Never use guessed or repeated session times to fill missing dates.

The template contains only a header. No broker or index session schedule has been selected.

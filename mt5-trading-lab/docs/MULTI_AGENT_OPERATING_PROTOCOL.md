# Multi-agent operating protocol

This document describes the operating procedure for the four specialist roles and Agent 0 project director. It is a controlled workflow, not a claim that an always-on autonomous agent service has been deployed.

## Responsibilities and handoffs
| Stage | Owner | Output | Gate |
|---|---|---|---|
| Discover candidates | Agent 1 Researcher | Candidate register and falsifiable strategy spec | Mechanism, data, costs and failure conditions explicit |
| Freeze one spec | Agent 0 + Agent 1 | Versioned, pre-registered rules | No parameter tuning on validation/locked data |
| Implement | Agent 2 Developer | Separate versioned MQL5 EA and source hash | Safety checks and spec/code correspondence |
| Compile and smoke-test | Agent 3 Tester | MetaEditor log, fresh EX5, raw smoke report | Real MT5 evidence; warnings reviewed |
| Broker feasibility | Agent 3 with Agent 2 inputs | Contract-spec record and minimum-lot risk calculation | £100 economics and margin feasible |
| Full testing | Agent 3 Tester | Raw/normalized results, costs, manifests, walk-forward and stress runs | Chronological splits and reconciled costs |
| Challenge | Agent 4 Reviewer | Independent findings and PASS/BLOCKED/REJECTED decision | No missing evidence; limitations explicit |
| Integrate and govern | Agent 0 Project Director | Gate register, dependency list, audit trail | Reviewer blocks remain blocks |
| Future deployment decision | Owner only | Explicit informed approval | Demo evidence and all acceptance gates complete |

## Work-in-parallel policy
Research can explore several hypotheses in parallel. Implementation starts only for frozen specs. Platform-specific testing waits for a verified compile and broker inputs. Independent review may begin early for design/code issues, but cannot approve untested performance. Do not spend compute on broad parameter searches before proving mechanics and £100 feasibility.

## Immutable artifacts
Every run must be written to a unique timestamped directory. Never overwrite the only copy of a raw report or failed run. Hash source, config and raw artifacts; preserve tester logs and record the exact terminal build. Derived CSVs must be reproducible from raw evidence and costs must be included exactly once.

## Current execution boundary
The repository currently contains agent instructions and starter automation. It does not by itself execute four persistent agents, provide Windows/MetaEditor, or create valid MT5 backtests. GitHub Actions can run repository/Python checks and attempt a no-account MetaEditor compile. It does not run the MT5 Strategy Tester or establish market performance. Do not infer a backtest pass from CI success.

## Critical path
1. Validate repository files and tests in CI.
2. Inspect the temporary Windows MetaEditor compile workflow and preserve its evidence; repair any installer, include-path, compiler or warning failures.
3. If automated compile cannot be made reliable, compile STRAT-002 in a dedicated Windows MT5/MetaEditor environment.
4. Reconcile warnings, then run a short mechanics-only test with no real account.
5. Obtain public or owner-supplied broker contract specs; calculate feasibility at £100 before large backtests.
6. If feasible, execute pre-registered chronological, cost-stressed tests.
7. Agent 4 reviews the evidence independently; Agent 0 records disposition.
8. Demo forward testing only after all prior gates pass; owner decision is required before live use.

## Blocker handling
For each blocker, record the exact missing item, impact, safe workarounds attempted, chosen workaround and whether the gate remains blocked. Escalate only when no safe, no-cost workaround can produce reliable evidence or a decision is genuinely owner-controlled.

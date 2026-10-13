# Multi-agent operating protocol

This is a **bounded eight-role team**: Agent 0 director plus seven specialist roles. Role definitions and handoffs are implemented in the repository; they are not a claim that eight independent, always-on AI processes are running. Use the roles as workstreams and invoke only the specialists needed for each task.

## Team and ownership
| Role | Primary responsibility | Required output |
|---|---|---|
| Agent 0 — Project Director | Scope, sequencing, dependency management, final integration and owner escalation | Gate register, decisions, concise blocker report |
| Agent 1 — Researcher | Strategy hypotheses and frozen deterministic specifications | Candidate spec, evidence, falsification criteria |
| Agent 2 — Developer | Separate auditable MQL5 EA per frozen specification | Source, source hash, spec/code mapping |
| Agent 3 — Tester | Actual MT5 compile/test execution and raw evidence | Logs, fresh EX5, raw reports, normalized results and run manifest |
| Agent 4 — Independent Reviewer | Adversarial independent review; may block candidates | Findings and PASS/BLOCKED/REJECTED decision |
| Agent 5 — Broker/Capital Feasibility | Public broker facts, contract economics, minimum-lot and margin feasibility | Sourced symbol contract record and £100 feasibility calculation |
| Agent 6 — Independent Test/Data Analyst | Independent fixtures, data/split/leakage audit, metric and cost arithmetic checks | Reproducible tests, counterexamples and audit report |
| Agent 7 — Build/Automation Engineer | CI, MetaEditor automation, artifact integrity and repeatability | Fail-closed workflows, test evidence and artifact index |

## Handoffs and acceptance gates
| Stage | Owner(s) | Gate |
|---|---|---|
| Discover and compare candidates | Agent 1; Agent 5 consults on economics | Falsifiable mechanism, data needs, costs and failure conditions explicit |
| Freeze specification | Agent 0 + Agent 1 | Versioned rules and test windows frozen before results are inspected |
| Feasibility before expensive testing | Agent 5; Agent 6 independently checks calculations | Actual symbol constraints and £100 economics pass; otherwise reject/block |
| Implement | Agent 2 | Separate versioned EA; safety controls and spec/code correspondence |
| Build and compile | Agent 7 operates automation; Agent 3 verifies evidence | MetaEditor log, fresh EX5, zero errors, warnings resolved |
| Mechanics and data checks | Agent 3 + Agent 6 | Reproducible mechanics evidence; synthetic evidence labelled synthetic |
| Full testing | Agent 3; Agent 6 audits | Raw/normalized results, costs reconciled, chronological and stress tests |
| Independent challenge | Agent 4 | No missing evidence; reviewer blocks cannot be overruled by Agent 0 |
| Integrate and govern | Agent 0 | Gate register, dependencies, audit trail and clear current state |
| Demo/live decision | Owner only for authorization; Agent 0 prepares evidence | All prior gates complete; explicit owner decision required before live use |

## Parallelism without sprawl
- Parallelise research across candidate hypotheses; Agent 5 can research instrument economics while Agent 6 builds generic data/ledger tests and Agent 7 maintains CI.
- Implement multiple EAs only when specifications are frozen and each has a separate owner, path, acceptance criteria and test record.
- Do not have multiple roles edit the same file simultaneously. Agent 0 assigns one writer and asks other roles for review comments.
- Agent 6 challenges tests independently; Agent 4 retains final independent review authority.
- Agent 7 keeps workflows small and reliable. Avoid duplicate agents, duplicate CI matrices, speculative cloud architecture and broad parameter searches before feasibility/mechanics pass.
- Agent 0 retires or merges a workstream if it duplicates another role or lacks a measurable deliverable. Eight roles is the current ceiling; add a role only when a recurring bottleneck is evidenced and it can be separated cleanly.

## Immutable artifacts
Every run gets a unique timestamped directory. Never overwrite the only copy of a raw report or failed run. Hash source, config and raw artifacts; preserve tester logs and terminal build. Derived CSVs must be reproducible from raw evidence and costs must be included exactly once.

## Current execution boundary
The repository contains role instructions and starter automation; it does not by itself execute eight persistent agents, provide an always-on Windows/MetaEditor host, or create valid MT5 backtests. GitHub Actions can run repository/Python checks and attempt a no-account MetaEditor compile. Compilation is not a Strategy Tester run and does not establish market performance. No paid infrastructure, broker account or live trading is authorized.

## Critical path
1. Keep repository validation, Python tests and compile workflow green on the latest source.
2. Obtain a short, reproducible MT5 mechanics run and retain logs/report; do not confuse synthetic data with market evidence.
3. Research public broker specifications and calculate minimum-lot feasibility at £100 before expensive tests.
4. Resolve Agent 4's blocking code review findings; recompile every source revision.
5. Run frozen chronological train/validation/locked tests, walk-forward and cost/stress tests only after data, mechanics and feasibility gates pass.
6. Agent 6 independently audits data and metrics; Agent 4 reviews the full evidence; Agent 0 records the disposition.
7. Demo forward testing only after prior gates pass. Owner decision is required before any live use.

## Blocker handling
Record the exact missing item, impact, safe workarounds attempted, chosen workaround and whether the gate remains blocked. Escalate only when no safe, no-cost workaround can produce reliable evidence or a decision is genuinely owner-controlled.

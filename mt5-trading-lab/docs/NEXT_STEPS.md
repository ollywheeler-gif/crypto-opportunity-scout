# Project execution plan

## Parallel workstreams
The bounded team is Agent 0 (director) plus seven specialist roles. Run these workstreams concurrently where independent:
- Agent 1: strategy research and specification drafts.
- Agent 5: public broker/instrument research and £100 feasibility.
- Agent 6: independent data, metric, leakage and cost-ledger tests.
- Agent 7: build/CI reliability and artifact capture.
- Agents 2 and 3: implement and test only frozen, feasible specifications.
- Agent 4: independent adversarial review; never overridden by the director.
Agent 0 sequences dependencies and assigns one writer per file. Do not create more roles unless a recurring bottleneck has a distinct measurable output.

## Work we can do without user setup
1. Maintain candidate register and written specifications.
2. Add reproducible Python checks for project structure, data integrity, metrics and risk rules.
3. Use GitHub Actions for static validation and unit tests.
4. Build Windows runner scripts and runbooks; review scripts for fail-closed behavior.
5. Create artifact formats, acceptance gates, and a transparent decision register.
6. Research public broker contracts and complete feasibility calculations where authoritative data are available.

## External dependencies (not yet available)
- A Windows PC/VM with MT5 and MetaEditor installed for full tester execution.
- A chosen broker and exact demo symbols/specifications; public research can shortlist but cannot prove account-specific settings.
- Real historical data and actual Strategy Tester reports.
- A permitted way to run the Windows tester and return logs/reports.
- No paid cloud runner or orchestration service is authorized or currently required.

## Critical path
1. Verify current main-branch Python tests and project validation.
2. Keep the MetaEditor compile workflow reliable and recompile every EA source change.
3. Resolve STRAT-002/003 source-review findings and run a non-live mechanics test.
4. Research and record public broker specs; reject £100-infeasible symbol/strategy combinations before extensive testing.
5. Only after mechanics and feasibility gates pass, execute pre-registered chronological tests, cost reconciliation, walk-forward and stress analysis.
6. Agent 6 audits data/metrics; Agent 4 independently reviews the complete evidence; Agent 0 updates the gate register.

## Owner interruption policy
Continue autonomously on reversible, low-cost work. Ask only for a genuine external dependency, a material risk/strategy decision, spending/privileged access, credential/account action, or approval that cannot safely be inferred. Never ask for secrets in chat.

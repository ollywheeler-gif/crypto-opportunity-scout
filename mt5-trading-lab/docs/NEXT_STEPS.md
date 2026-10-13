# Project execution plan

## Work we can do without user setup
1. Maintain candidate register and written specifications.
2. Add reproducible Python checks for project structure, data integrity, metrics and risk rules.
3. Use GitHub Actions for static validation and unit tests.
4. Build Windows runner scripts and runbooks; review scripts for fail-closed behavior.
5. Create artifact formats, acceptance gates and a transparent decision register.
6. Prepare broker-agnostic feasibility calculations and identify what must be confirmed from the selected broker.

## External dependencies (not yet available)
- A Windows PC/VM with MT5 and MetaEditor installed.
- A chosen broker and exact demo symbols/specifications.
- Real historical data and actual Strategy Tester reports.
- A permitted way to run the Windows job and return logs/reports.
- Optional Cloudflare orchestration only if a concrete requirement emerges; no direct Cloudflare access is currently connected.

## Next best sequence
1. Complete code and CI tests for validation/metrics.
2. Build one minimal, non-live end-to-end compile/test run using a demo/test profile.
3. Reconcile that run's raw report before evaluating the first strategy.
4. Do capital feasibility before spending time optimizing any strategy.
5. Only then implement candidates one by one; do not develop all ten EAs before evidence justifies them.

## User interruption policy
Continue autonomously on reversible, low-cost work. Ask the owner only for a genuine external dependency, broker-specific fact, spending decision, credential/access action, or approval that cannot safely be inferred. Never ask for secrets in chat.

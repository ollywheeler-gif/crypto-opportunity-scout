# Progress log

## 2026-10-13 — Research pipeline hardening

### Added or updated
- Added a deterministic H1 Donchian breakout specification and initial MQL5 EA source.
- EA remains disabled by default and refuses real-account initialization.
- Added explicit spread/slippage sizing allowances and a broker-cost-review switch.
- Added stop-distance, minimum-lot risk, free-margin, and trade-server-retcode checks.
- Added a guard that avoids acting when another position exists on the same symbol.
- Added a Windows source installer that verifies SHA-256 and backs up a differing existing source.
- Added a guarded Windows compile/test runner that checks required tester inputs, rejects credentials in the INI, refuses to launch alongside a running terminal process, removes stale EX5 before compile, and rejects stale reports.
- Added capital-feasibility calculator and unit tests.
- Expanded closed-trade analysis with expectancy, monthly trade-close totals and maximum consecutive losses.
- Added static safety tests for the EA, project configuration, installer and runner.
- Added acceptance gates, artifact conventions and setup instructions.

### Evidence status
- Source and documentation exist in GitHub.
- No MetaEditor compilation has been performed in this environment.
- No MT5 Strategy Tester run or real-market performance result has been produced.
- The current GitHub integration does not expose a verified status for the most recent push-triggered Actions run, so no claim is made that the latest revision passed CI.
- No Cloudflare connection, Windows runner, broker account or market-data feed is provisioned.

### Next work
1. Verify GitHub Actions on the latest commit and repair any test failures.
2. Compile the EA on a dedicated Windows MT5 installation; inspect compiler warnings as well as errors.
3. Confirm broker economics and calculate minimum-lot feasibility for candidate symbols.
4. Run a short mechanics-only tester smoke test and reconcile the raw report.
5. Only after the pipeline is proven, run pre-registered chronological tests and independent review.

### Safety boundaries
Research/testing only. No paid provisioning, broker credential collection in chat, real-account execution or live deployment is authorized.


## 2026-10-13 — Project governance and multi-agent integration

- Added Agent 0 project director with explicit authority boundaries, specialist handoffs, acceptance state machine and owner interruption policy.
- Added the multi-agent operating protocol, defining required artifacts, run immutability, critical path and blocker handling.
- Linked both documents from the README and added project validation/unit-test checks for the new governance files.
- Added a machine-readable gate register so the current state and real blockers are explicit rather than implied.
- Current external blockers remain: no Windows MetaEditor/MT5 environment for compile and Strategy Tester evidence; broker-specific minimum volume, costs and margin remain unverified; latest push-triggered CI result is not observable through the currently available GitHub connector methods. No paid resources or live trading have been enabled.


### Additional validation hardening — 2026-10-13
- Added Agent 0 and an explicit five-role handoff protocol; the project director cannot override independent review or owner-controlled live-trading decisions.
- Added a machine-readable gate register and included it in project-file validation.
- Clarified that capital-feasibility cost allowances are totals for the minimum-volume trade, preventing confusion with the EA's separate per-lot sizing inputs.
- Hardened the capital-feasibility calculator against invalid risk caps, malformed optional margin input and inconsistent minimum-volume/volume-step values; added unit coverage and a template-schema consistency test.
- CI status remains UNVERIFIED because the connected GitHub methods return no push-triggered workflow runs/statuses. This is not evidence of either success or failure.


### Platform compile workaround — 2026-10-13
- Added a GitHub-hosted Windows workflow that downloads the official MT5 installer, verifies its Authenticode signature, initializes an isolated MQL5 include tree, compiles STRAT-002 with MetaEditor, fails on compiler errors/warnings, and uploads compile logs/EX5 evidence.
- This is a no-account compile only. It does not run the Strategy Tester, connect a broker, or establish trading performance. The workflow itself and its first run remain unverified until a successful artifact is observed.
- Added static project checks requiring the Windows compile workflow and checking its signature verification, warning gate, evidence upload and absence of credential fields.
- Agent 2 code review identified that the EA's initial sizing reserve did not separately represent stop-gap losses. Added a per-lot gap-cost reserve, required it to be positive before enabling the EA, and added a static safety test. This remains uncompiled until the Windows workflow provides evidence.
- Expanded research coverage with nine deterministic v1 spec drafts for the remaining candidate hypotheses. Agent 0/Agent 1 review and freezing are still required; none is implemented or performance-tested yet.


### First verified MetaEditor compile — 2026-10-13
- GitHub Actions quality run [38390209713](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390209713) passed; repository validation and Python unit tests completed successfully on the then-current main revision.
- Windows compile run [38390155862](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390155862) completed successfully. MetaEditor version 5.0.0.6257 reported **0 errors, 0 warnings** for STRAT-002; a fresh EX5 and UTF-16 compiler log were retained in artifact [11808267275](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390155862/artifacts/11808267275).
- Compiler manifest commit: `e2e987c88e64c95e8ad1e4eb3efdc9de090fa0c1`. EX5 SHA-256: `fa968097e114fa2fbcdb29c1df1079248741d8c32c312e5e8c5656e76d447c84`. Source SHA-256: `858F5A1AE3AF6F77A34F3CBF0D56036CE0B8EB46E33D2912DA6810EB4500F6CE`.
- The first compile workflow attempts exposed two automation issues (installer argument handling and asynchronous compiler process/exit-code interpretation). These were corrected. MetaEditor may return process exit code 1 despite the compiler summary reporting zero errors/warnings, so acceptance now requires the compiler summary and fresh EX5, while retaining the process code diagnostically.
- This verifies source compilation only. It does not validate strategy mechanics, broker constraints, Strategy Tester results, costs or profitability.

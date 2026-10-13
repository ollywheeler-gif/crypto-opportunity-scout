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
- MetaEditor 5.0.0.6257 has compiled STRAT-002 and STRAT-003 with zero errors and zero warnings in GitHub-hosted Windows runs; see the later dated evidence entries.
- No MT5 Strategy Tester run or real-market performance result has been produced.
- GitHub Actions quality checks have passed on recent revisions; the latest verified run is linked in the dated evidence entries. Re-run after every code or workflow change.
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
- Expanded research coverage with deterministic v1 spec drafts for the remaining hypotheses. STRAT-003 is frozen and has an EA; the other candidates remain drafts or research-only.


### First verified MetaEditor compile — 2026-10-13
- GitHub Actions quality run [38390209713](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390209713) passed; repository validation and Python unit tests completed successfully on the then-current main revision.
- Windows compile run [38390155862](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390155862) completed successfully. MetaEditor version 5.0.0.6257 reported **0 errors, 0 warnings** for STRAT-002; a fresh EX5 and UTF-16 compiler log were retained in artifact [11808267275](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390155862/artifacts/11808267275).
- Compiler manifest commit: `e2e987c88e64c95e8ad1e4eb3efdc9de090fa0c1`. EX5 SHA-256: `fa968097e114fa2fbcdb29c1df1079248741d8c32c312e5e8c5656e76d447c84`. Source SHA-256: `858F5A1AE3AF6F77A34F3CBF0D56036CE0B8EB46E33D2912DA6810EB4500F6CE`.
- The first compile workflow attempts exposed two automation issues (installer argument handling and asynchronous compiler process/exit-code interpretation). These were corrected. MetaEditor may return process exit code 1 despite the compiler summary reporting zero errors/warnings, so acceptance now requires the compiler summary and fresh EX5, while retaining the process code diagnostically.
- This verifies source compilation only. It does not validate strategy mechanics, broker constraints, Strategy Tester results, costs or profitability.
- Added a deterministic Donchian reference model and unit tests for channel windows, strict breakout boundaries, insufficient history and invalid inputs. This checks signal semantics but is not an execution simulation or a substitute for MT5 Strategy Tester evidence.
- Expanded the gate register to include all nine additional research-spec drafts and their specific dependencies. They are drafts only; Agent 0/Agent 1 must freeze each specification before implementation, and broker-dependent candidates remain blocked where contract/session/financing data are missing.
- Re-ran the verified Windows compile on commit `0bff4101125e454cf99832263f53f3dd8245218b`: MetaEditor 5.0.0.6257 again reported 0 errors and 0 warnings. Artifact [11809150759](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390561997/artifacts/11809150759) includes the manifest, EX5 and UTF-16 compiler log. Source SHA-256 remains `858F5A1AE3AF6F77A34F3CBF0D56036CE0B8EB46E33D2912DA6810EB4500F6CE`; current EX5 SHA-256 is `887377FEC79B08C23B33559BF8EF7F1150F575635D4457672A19FA8137AB345F`.
- Latest repository validation and Python unit-test run [38390649941](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390649941) passed.
- A synthetic-history generator and preset have been drafted as a possible future mechanics-test aid, but they have not been executed and do not count as tester evidence. No MT5 Strategy Tester report exists yet.
- Agent 2 added STRAT-003 EMA trend with disabled default, real-account refusal, tick-aligned ATR stop, broker-reviewed maximum spread, modeled cost reserves, minimum-volume risk cap, margin/retcode checks and a duplicate-instance lock. STRAT-003 was compiled with zero errors/warnings in run 38390955133; Strategy Tester evidence remains pending.
- Agent 0/Agent 1 froze STRAT-003 EMA trend v1 after checking the completed-bar cross, ATR stop and exit rules against the EA implementation. The specification is frozen for first mechanics testing; no performance or broker-feasibility approval is implied.

- Updated Agent 4's code-only review to reflect implemented tick-size alignment and duplicate-instance guards while retaining the BLOCKED disposition until runtime and broker evidence exists.


### Additional quality gates — 2026-10-13
- Added `scripts/reconcile_costs.py`, a strict arithmetic check that normalized net trade P/L equals gross P/L plus commission, swap and fees exactly once. Duplicate trade IDs, missing columns, non-finite values and mismatches are rejected. A normalized ledger template and unit tests are included. This does not replace mapping/verification of the raw MT5 export.
- Added `docs/PRE_REGISTERED_TEST_PROTOCOL.md` with chronological train/validation/locked-out-of-sample windows, stress tests, evidence fields and rejection rules. The date windows are conditional on verified data coverage; replacement boundaries must be frozen before inspecting results.
- Both STRAT-002 and STRAT-003 were compiled by Windows MetaEditor 5.0.0.6257 in run [38390955133](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390955133), at commit `b26b5185e28356e18070247d6420cf06753eefe8`. Each compiler summary reports **0 errors, 0 warnings**. Evidence artifact [11807953266](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38390955133/artifacts/11807953266) contains both EX5 files, logs and manifests. MetaEditor returned process exit code 1 for STRAT-002 despite the clean summary; the workflow records that diagnostic separately and checks the fresh EX5 and compiler summary.
- STRAT-002 EX5 SHA-256: `9E43755AA8FEB9C504FFD9A2F004F6EC040DE576DE8FAF74EAA3256200B7EB8D`. STRAT-003 EX5 SHA-256: `5FC6CF4BB6F93EAFD45CAF00C05D83F74D406F637D373C4E95C1E22E72DB2EC7`.
- CI run [38391274628](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391274628) passed after the cost-reconciliation tool and its tests were added. Later runs are validating the pre-registration docs and final integration changes.
- Neither EA has been run in Strategy Tester; no broker feasibility, actual cost reconciliation, performance test or demo forward test exists. Both remain research-only.


### Bounded team expansion — 2026-10-13
- Expanded the documented operating model from five roles to eight: Agent 0 project director plus Agents 1–7.
- Added dedicated Agent 5 broker/capital feasibility, Agent 6 independent test/data analysis, and Agent 7 build/automation role definitions.
- Updated Agent 0, README and the multi-agent protocol with parallel-work boundaries, single-writer discipline, evidence handoffs, and an eight-role ceiling to prevent management sprawl.
- Added repository validation requirements and a safety test for the role files and truthful runtime description.
- These are explicit workstreams and instructions, not proof that eight independent persistent agents are running. No paid services, live accounts or trading permissions were enabled.

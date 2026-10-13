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


### Three-EA compile and broker feasibility pass — 2026-10-13
- STRAT-001 time-series momentum was added with a frozen D1 v1 spec, disabled default, real-account refusal, per-symbol/magic instance lock, ATR stop, spread/cost reserves and minimum-volume/margin gates.
- Windows compile run [38391338872](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391338872) compiled STRAT-001, STRAT-002 and STRAT-003 on MetaEditor 5.0.0.6257 with zero errors and zero warnings. Artifact [11809220524](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391338872/artifacts/11809220524) retains all three EX5 files, compiler logs and manifests.
- STRAT-001 source/EX5 SHA-256: `A878E0274C9422B5DB5545199AF6A75F9FD3BE72670BA9D2825A576B0ADD4F02` / `507A4D0B22FD2444C376DB2E6895EF2DF76EB10DA911CAF091B04504D6FB496A`.
- STRAT-002 and STRAT-003 source compile hashes are recorded in the gate register. Compilation is a source-quality gate only, not performance evidence.
- Added public-source broker feasibility research for Pepperstone and IG UK, without selecting a broker or inferring exact MT5 symbol terms. The next data step is to export symbol contract metadata from a selected demo terminal using the no-order `ExportSymbolContract.mq5` utility.
- The gate register now shows broker feasibility as BLOCKED for the first three candidates because no exact broker symbol specifications or account-specific margin data are available. No Strategy Tester report or real-market performance conclusion exists.


### Broker contract capture helper and expanded compile evidence — 2026-10-13
- Added `mql5/Scripts/TradingLab/ExportSymbolContract.mq5`, a read-only MQL5 script that exports symbol min/max/step, tick size/value, contract size, spread snapshot, stops/freeze levels, currencies, swap metadata and an optional minimum-volume margin calculation to a local CSV. It does not send orders and deliberately leaves account equity and GBP conversion rate blank.
- The first compile caught a real MQL5 issue: the input name `SymbolName` collided with a built-in identifier. Renamed it to `ContractSymbolInput`; subsequent Windows MetaEditor run [38391736678](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391736678) completed successfully and compiled the exporter with zero errors/warnings.
- That same run compiled STRAT-001, STRAT-002 and STRAT-003 with zero errors/warnings. Evidence artifact [11809281108](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38391736678/artifacts/11809281108) contains the EX5 files, logs and manifests. This is source compilation only; the exporter has not been executed against a broker and none of the EAs has been run in Strategy Tester.
- Added serialized compile workflow concurrency so rapid documentation/source commits do not leave many overlapping MT5 installer/MetaEditor jobs running simultaneously.
- The read-only exporter needs to be run only after a broker/demo symbol is selected. Its snapshot must be checked against broker documentation and cannot substitute for historical spreads, swaps or execution costs.


### Expanded compile coverage and contract-to-feasibility workflow — 2026-10-13
- Windows MetaEditor run [38392508850](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38392508850) completed successfully at source revision `63c88464af602353902e45a894a108ef9b1f385c`. STRAT-001, STRAT-002, STRAT-003, STRAT-004, STRAT-007, STRAT-008, STRAT-009 and the read-only symbol exporter all compiled with `Result: 0 errors, 0 warnings` on MetaEditor 5.0.0.6257. Artifact [11810845970](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38392508850/artifacts/11810845970) retains binaries, compiler logs and manifests.
- Added `scripts/contract_export_to_feasibility.py` and unit tests. It imports the exporter CSV into one worksheet row using explicit owner-reviewed stop distance, conversion rate, and cost allowances; it fails closed if quote/margin data are unavailable and never guesses historical costs.
- STRAT-007, STRAT-008 and STRAT-009 now have frozen v1 specs and compile evidence. The earlier static-test failure was a source/test timing mismatch: the test expected the setup-lifetime input before the source commit adding it. The corrected source and later compile run passed; no performance or tester claim follows from that.
- The latest completed Python CI run before the final doc-only edits passed. The current main revision's quality check is running; verify before treating that exact revision as green.
- Current total: seven EAs compile cleanly, but none has a broker-feasibility pass or a real-market Strategy Tester report. The read-only contract exporter also compiles but has not yet been run against a selected broker demo terminal.


### Immutable compile evidence manifest — 2026-10-13
The successful Windows run [38392508850](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38392508850) used MetaEditor 5.0.0.6257 and reported zero errors/zero warnings for all seven EAs and the read-only symbol exporter. Artifact [11810845970](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38392508850/artifacts/11810845970) retains the binaries and logs.

| EA | Source SHA-256 | EX5 SHA-256 |
|---|---|---|
| STRAT-001 | `21F4283A1FD03F0AC8A8AC7E51F02EE83F3C51DF6240BFA60535C18C80272DEA` | `F590ABE9A13BACA6745FA4A798F442C62602516B7973985AFDC2CD0F227F3BFE` |
| STRAT-002 | `2B1E3E48BBD7EDCE5B1C80EC25B98F1764468464BCD30B7351271F6269810CFB` | `7619ED2BA7904E83331C537E7F2F6E7627584683E4160264F48767623075656F` |
| STRAT-003 | `3CBCF9E92AE4FFB23C590A7836C548144445F322EF3C521AC662AF299ECCFE2F` | `65291F03C9F255279F517CCBF0F0E126DBEC5862A28898BC2FCC64FCB07B8BA8` |
| STRAT-004 | `DB5016E44319ECDEE3AEB649B03B842D1B6BAB6E97A2147A82CC32220809FD99` | `8E29790AAE0AFD1AC2C71278CCAB8C779EBBC7D671C7CFB1475F50FFEB5829FB` |
| STRAT-007 | `6EA3DFC2250691301D1F47F84BCA2559BC8D9E2C0F8EB34680D1C1FF254C518B` | `30E430EB68FBEC577476B4079A5B156EC4D8FCB2FC2D287372A9ADF575262ECB` |
| STRAT-008 | `0A53F9F05F7D186D9E17702987B45F17F6D0ED2700DABEF6B3C3FD729590B833` | `963A8399CDD53E3420C8DAD14FCA7DD79D8AC1B58EE5F4ACB5035F9B75D9392B` |
| STRAT-009 | `F7238D3DE10E19A9FA1A65BCD0E7CB4FD70FFD0F0A69B331C94971EFF0A2F306` | `C9A30C157E117332316A4AF20F2F21BA1FEA25CD1B788302D0BD8B90D54C2C87` |

These hashes apply only to the exact source revision in that run. Any source change requires a new compile and new hashes. Compilation does not imply Strategy Tester validity or profitability.


### Persistent account-level risk guard — 2026-10-13
- Added shared `mql5/Include/TradingLab/RiskGuard.mqh` and integrated it into every current EA (STRAT-001 through STRAT-005, plus STRAT-007 through STRAT-009). It uses terminal global variables keyed by account, symbol and magic number to preserve the daily-loss and peak-equity state across terminal/EA restarts.
- Provisional defaults: 1% daily equity-loss halt, 5% drawdown review log, 10% persistent peak-drawdown halt. The daily halt resets at the next broker-server day; the peak-drawdown halt requires deliberate reset after investigation. On a halt, the EA blocks new signals and attempts to close only positions matching its symbol/magic.
- The first compile after integration exposed one MetaEditor warning in the guard's boolean condition. The condition has been corrected to compare the integer status values explicitly. All earlier EA compile statuses are marked STALE until the current source/include compile rerun finishes; prior EX5 hashes must not be reused for the updated source.
- These are fail-safe defaults, not guarantees against gap losses. The guard still requires actual Strategy Tester threshold tests, terminal-restart persistence tests, and a review of reset behavior before any demo proposal. No live-account behavior is enabled; the EAs refuse real accounts.


### Eight-EA verified compile milestone — 2026-10-13
- Windows compile run [38393677219](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38393677219) succeeded using MetaEditor 5.0.0.6257. Eight EAs (STRAT-001/002/003/004/005/007/008/009) and the no-order symbol contract exporter compiled with **zero errors and zero warnings**. Artifact [11811217733](https://github.com/ollywheeler-gif/crypto-opportunity-scout/actions/runs/38393677219/artifacts/11811217733) contains EX5 files, compiler logs and manifests.

| Candidate | Source SHA-256 | EX5 SHA-256 |
|---|---|---|
| STRAT-001 | `31BC557AF73166118A2D1D36014C12EC99FA259ABB0D4798C9FE166719CE54A6` | `C5693652DF8A20196F361E3D3A38549940C90EAD10CF81D958DFBF6CE42A875F` |
| STRAT-002 | `FB878706B50D6A6265020C95B8E665CAE4EEE96418E4A9F3343A51892953B298` | `777159AFD7BEBC8DA07548DE12420AC8F36D14DA04C23DE43395EBB7957DADBA` |
| STRAT-003 | `2D422AEABC88372739706E98A0C74E387F36F7A6CF80EDEF7CBE1F17A1D84764` | `61C9CAADFFD37AB81950B4EEA3A61F628D18F4C8F22C0BB3D9FAF6BF74BBC74B` |
| STRAT-004 | `C4D11D81DC7F902D3C54AED6E23DCAA44E74CEF9DCA02B90173E431C7EEB60D6` | `18A68A6111DF14344F9E857105EC1C4EA17F7A1FFB01E6831AE72E45F5113E8D` |
| STRAT-005 | `594D9093C79059BED4B1F2ACD046A578F8584E5D32A690DC8C6184D154A96903` | `877987634F8B981082F43721861954CEBE6839FBAF46628D9F3A84D829F2BCC7` |
| STRAT-007 | `3646642BF44998F871F94BAD5B26BF106290BECCAFB82FB339566A4578F2EE40` | `474F0918A1A0873BFEDB6BB39164F5C24C922605108ABC1469C9254904EB8119` |
| STRAT-008 | `8BB56685474EC882F8CEDD55C51E3EDD846E6E5F62D41C038642A5E7F14807BA` | `E4263027145A010294ED1B87E77CACF049A0C34F3BC90C111424F22773893822` |
| STRAT-009 | `CA12B19BD1580147B26D2D6FA8C22568DC5BF1353F0B152D9C577E2F7B49C6E7` | `D8F3D9B2B1D59497EA3BEF7FB02A8C28D2228712605EA2563936BC20E79F2961` |
| ExportSymbolContract | `43747C4C240C70A5E4D426B757780B5473321F89A65D02B7965C8DCCF6CE1FE0` | `6921990FED4996395539A1E95670C8370E8C36E3B855400C98ADE1211A43F84A` |

- Shared `RiskGuard.mqh` was corrected to remove a compiler warning and now participates in the same zero-warning compile gate. It adds daily-loss and peak-drawdown circuit-breakers; threshold persistence and restart behavior still require tests.
- STRAT-005's source compiles but must remain disabled until the selected broker's server timezone and European-DST mapping are verified.
- This remains a compile milestone only. No EA has a verified Strategy Tester report, no broker-specific minimum-volume feasibility has passed, and no performance conclusion is justified.

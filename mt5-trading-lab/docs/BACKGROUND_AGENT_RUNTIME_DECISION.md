# Background agent runtime decision

## Decision
Use the existing GitHub repository as the source of truth and GitHub Actions as the first scheduler/runner. Implement the agent layer with the OpenAI Agents SDK in Python, with eight bounded role instructions from `mt5-trading-lab/agents/`. The workflow should create a timestamped report artifact and a concise Markdown report in the repository; do not claim it can post directly into this ChatGPT conversation.

This is the lowest-friction route for this project because the code, test evidence, review trail and automation already live in GitHub. It avoids introducing a separate orchestration vendor before there is evidence that one is needed. CrewAI or LangGraph can be reconsidered only if a concrete limitation appears.

## Delivery sequence
1. Keep existing static checks, Python unit tests and Windows MetaEditor compile workflow green.
2. Add a small, testable coordinator that reads the eight role files, validates role output against a strict schema, and produces one combined report with blockers, evidence links, decisions and next actions.
3. Add deterministic safety checks before model calls and before any write: no secrets in prompts/logs; no live orders; no account login; no paid provisioning; no unapproved repository changes; no fabricated backtest results.
4. Start with manual dispatch and a dry-run mode. Do not enable scheduled model calls until the owner has explicitly approved API usage and added the key as a GitHub Actions secret.
5. Run role tasks in bounded parallel batches only where dependencies permit; independent review must not be performed by the strategy author. Limit retries and token budgets, persist usage/cost metadata, and fail closed on schema or safety failures.
6. Produce reports as GitHub Actions artifacts and a committed report only when explicitly configured. The report can be brought back into the ChatGPT conversation, but direct delivery into this exact thread is not assumed.
7. Connect a Windows MT5 runner only after its machine, terminal installation, data source and broker symbol specifications are verified. Until then, agents must label MT5 runtime tests as blocked and may not call synthetic tests a backtest.

## Human input and spending gate
No service subscription, cloud VM, paid orchestration plan, broker account, trading account or API spend is authorized by this document. The first unavoidable owner action for live model orchestration is to approve an API budget and add the API key as a repository Actions secret; never put the key in source files, issues, logs or chat. If the owner does not approve API spend, continue with deterministic CI and human-invoked research without pretending the agents are running.

## Acceptance criteria
- All eight role prompts have explicit inputs, outputs and handoffs.
- Agent outputs are structured, validated, traceable to repo evidence, and marked as hypotheses when unsupported.
- CI tests cover missing key, malformed output, timeout, retry limits, secret redaction, live-trading denial, no-paid-provisioning default and report generation.
- A failed or blocked worker cannot be silently reported as successful.
- Scheduled execution is disabled until owner approval.
- No strategy is promoted based on compile success alone; actual MT5 tester reports, logs, costs and independent review remain required.
- Current quality checks and worker-integration tests pass before orchestration is enabled.

## Current status
This is an implementation decision and acceptance plan, not a deployed agent runtime. No persistent agents are currently running. The next engineering task is to implement and test the coordinator in dry-run mode without requiring credentials or spending money.

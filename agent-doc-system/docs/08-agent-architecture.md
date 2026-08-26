# Agent Architecture

## Agent Topology
TBD

## Agents
| Agent | Purpose | Inputs | Outputs | Tools | Permissions | Success | Failure |
|---|---|---|---|---|---|---|---|
| Analysis Agent (`src/agents/analysisAgent.ts`) | Classify a captured tx as an attack and produce a `ThreatReport` | `txHash`, `rpcUrl?` | `ThreatReportData` (`{summary, severity, vector}`) | `fetchTransaction` (web3 tool) | Read-only chain reads; no signing/deploy | Validated structured JSON | Throws on tool error or schema-invalid model output; bounded retries left to orchestrator (P6.01) |
| Deployment Agent (`src/agents/deployAgent.ts`) | Choose a honeypot template and deploy it via the P1.02 service | `type?`, `network?`, `rpcUrl?`, `approved?` | `DeployResult` (`{contractName, address, txHash, deployer, network}`) | `deployContract` (web3 deploy) | **Rejects non-local targets without approval** (`MAINNET_DEPLOY_APPROVED=true` or `approved:true`); never deploys to mainnet/testnet unapproved | Deployed contract + recorded network | Throws `DeploymentRejectedError` on unapproved remote; propagates tool errors |

## Tools
- `fetchTransaction(txHash, rpcUrl?)` — `src/agents/tools/web3Tools.ts`. Read-only: fetches tx + receipt + logs from an EVM RPC (defaults to `HARDHAT_RPC_URL`/localhost). No credentials, no state changes. Returns `FetchedTx` (from/to/value/calldata/methodId/logs/status).

## Planning
Define how agents decompose work and when they should stop planning.

## Memory
Distinguish short-lived task context, durable project knowledge, and user data.

## Tool Policy
Every tool must have an explicit purpose, schema, timeout, error behavior, and permission boundary.

## Handoffs
TBD

## Human Approval Points
Required before destructive operations, privilege escalation, production changes, or other high-impact actions defined by the project.

## Failure Recovery
Use bounded retries, fallback strategies, and explicit escalation rather than infinite loops.

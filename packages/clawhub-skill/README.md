# Eunomia OpenClaw / ClawHub Skill (`@eunomia/clawhub-skill`)

An **agent-facing** skill package for [OpenClaw](https://github.com/openclaw) and **ClawHub** built on top of [`eunomia-mcp`](../mcp/README.md).

While the repository root [`SKILL.md`](../../SKILL.md) is written for developers building or integrating Eunomia contracts, `packages/clawhub-skill/` is packaged for **runtime agents** so an OpenClaw agent can pick up a Stellar mainnet treasury conversationally, inspect its on-chain policy, pay approved payees, buy x402/MPP services through a bounded float, and ask the owner for task budgets or exceptions.

---

## Install

### Option A — ClawHub CLI
```bash
clawhub install eunomia-treasury
```
Or install directly from a local checkout:
```bash
mkdir -p ~/.openclaw/skills/eunomia-treasury
cp -r packages/clawhub-skill/* ~/.openclaw/skills/eunomia-treasury/
```

### Option B — Register `eunomia-mcp` with your agent's MCP bridge
Generate the agent's local Leash keypair and print the MCP server block:
```bash
export EUNOMIA_TREASURY="C..."          # 56-char treasury contract ID from https://eunomia.finance
export EUNOMIA_RPC_URL="https://..."    # Stellar mainnet Soroban RPC URL

npx -y eunomia-mcp init --treasury "$EUNOMIA_TREASURY"
```

---

## Usage (Conversational Flow)

Once installed, give your OpenClaw agent the treasury ID in chat:

1. **Pick up a treasury & request a task budget:**
   > *"Pick up my Eunomia treasury `CBM3...` and request a 5 USDC budget for 4 hours to pay the ROZO router `G...` for web search."*
   - The agent runs `check_budget` and `request_budget`, returning a signed `https://eunomia.finance/?budget=...` approval link.
   - You open the link and sign `set_task_budget` once with your passkey or wallet.

2. **Spend within policy or buy an x402 API:**
   > *"Search for a verified web-search API, fund a 0.5 USDC float, run the query for max 0.05 USDC, and sweep the rest back."*
   - The agent calls `find_services` -> `fund_float` -> `call_service` -> `sweep_float`, reporting every transaction hash and explorer link.

3. **Handle on-chain policy refusals gracefully:**
   > *"Pay `G...` 25 USDC for task #12."*
   - If `25 USDC` exceeds `perPaymentCap` (`#3 ExceedsTaskLimit`), the contract refuses in simulation with zero fee wasted, and the agent files `request_exception` (or a `request_budget` link) so you can approve it from the dashboard.

See [`demo/conversational-session.md`](./demo/conversational-session.md) for a complete recorded transcript against `eunomia-mcp`.

---

## Verification

```bash
cd packages/clawhub-skill
npm test
```

The test suite verifies that:
- `SKILL.md` frontmatter and `metadata.openclaw` match the OpenClaw / ClawHub specification.
- `clawhub.json` metadata and MCP server wiring are valid and consistent with `packages/mcp/package.json`.
- Every tool registered by `packages/mcp/src/tools.ts` and `packages/mcp/src/spendTools.ts` (all 12 MCP tools) is documented in `SKILL.md`.
- The recorded demo transcript in `demo/conversational-session.md` covers initialization, budget pre-flight, policy refusal handling, signed task-budget request generation, and x402 service float settlement.

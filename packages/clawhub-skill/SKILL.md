---
name: eunomia-treasury
description: >
  Connect an OpenClaw or ClawHub AI agent to a non-custodial Eunomia bounded treasury on Stellar
  mainnet via eunomia-mcp. Use when an operator gives the agent a treasury contract ID (C…), asks
  the agent to check its spending budget, pay a whitelisted or reputation-gated payee, buy paid
  x402/MPP services from a bounded task float, or request an on-chain exception or task budget.
homepage: https://eunomia.finance
license: Apache-2.0
metadata:
  author: Eunomia Finance
  version: "0.3.0"
  openclaw:
    emoji: "🏛️"
    primaryEnv: EUNOMIA_TREASURY
    requires:
      bins:
        - npx
      env:
        - EUNOMIA_TREASURY
        - EUNOMIA_RPC_URL
    mcp:
      eunomia:
        command: npx
        args:
          - -y
          - eunomia-mcp
        env:
          EUNOMIA_TREASURY: "${EUNOMIA_TREASURY}"
          EUNOMIA_RPC_URL: "${EUNOMIA_RPC_URL}"
          EUNOMIA_NETWORK: "pubnet"
---

# Eunomia Treasury Skill (`eunomia-mcp`)

This skill gives an OpenClaw / ClawHub runtime agent a **scoped, revocable spending credential** ("Leash") on a [Eunomia](https://eunomia.finance) Soroban treasury on **Stellar mainnet**.

The treasury contract — never the model prompt — enforces the owner's policy on-chain:
- **Per-payment cap** (`per_task_limit`)
- **Rolling 24-hour limit** (`daily_limit`)
- **Monthly budget & per-payee monthly caps** (`monthly_limit`, `payee_cap`)
- **Payee whitelist & reputation gate** (`is_payee` / `reputationPolicy`)
- **Time-bound, spend-capped session Leash or task budget** (`set_session` / `set_task_budget`)

The agent never holds the treasury's funds and never sees the owner's private key.

---

## 1. Conversational Treasury Pickup (First-Run Handshake)

When the operator says *"Pick up treasury `C…`"* or *"Connect to my Eunomia treasury"*:

1. **Verify required environment:**
   - `EUNOMIA_TREASURY`: 56-character Stellar contract address starting with `C`.
   - `EUNOMIA_RPC_URL`: HTTPS Stellar mainnet Soroban RPC endpoint (no public default; must not point to testnet/futurenet).
2. **Generate the agent's local Leash keypair (if not yet initialized):**
   ```bash
   EUNOMIA_RPC_URL="$EUNOMIA_RPC_URL" npx -y eunomia-mcp init --treasury "$EUNOMIA_TREASURY"
   ```
   - Stores the Ed25519 secret locally at `~/.eunomia/pubnet/<treasury>.json` (`0600`). Never read or print the secret key.
   - Tell the operator the printed **Agent public key (`G…`)** and ask them to:
     1. Send `~3 XLM` to that `G…` address (covers base account reserve, USDC trustline, and transaction fees), then run `npx -y eunomia-mcp trustline --treasury "$EUNOMIA_TREASURY"` if the agent will use the x402 service float.
     2. Open **https://eunomia.finance → Agent**, paste the `G…` public key, choose a session cap and duration, and click **Authorise agent** (or approve a signed `request_budget` link).
3. **Confirm readiness on-chain:**
   Call the `check_budget` MCP tool (or `npx -y eunomia-mcp status --treasury "$EUNOMIA_TREASURY"`).
   - Ready to spend when `canSpend: true` and `session.isThisAgent: true`.
   - Report `spendableNow`, `perPaymentCap`, `dailyRemaining`, `freeBalance`, and `unit` (`"USDC"` or `"XLM"`) back to the operator.

---

## 2. MCP Tool Reference (`eunomia-mcp` v0.3.0)

All 12 tools read Stellar mainnet state fresh on every call. Amounts are decimal strings in the treasury's token (`unit`, e.g. `"USDC"` or `"XLM"`).

### Read & Pre-Flight Tools
- **`check_budget`** (`{ amount?: string }`):
  Returns `perPaymentCap`, `dailyLimit`, `daySpent`, `dailyRemaining`, `freeBalance`, `monthly`, `session` (agent, cap, spent, remaining, expiry, `isThisAgent`), `canSpend`, `spendableNow`, and `blockers`. Pass `amount` (e.g. `"2.5"`) to pre-flight a payment and inspect `decision.allowed` and contract refusal `reasons` before signing.
- **`list_allowed_payees`** (`{}`):
  Lists owner-approved payees (re-verified on-chain via `is_payee`) plus any active `reputationPolicy`.
- **`check_payee`** (`{ address: string }`):
  Exact on-chain check (`is_payee`) for whether the treasury will pay `address` (`G…` or `C…`).

### Direct Treasury Payment & Policy Escalation Tools
- **`pay`** (`{ to?: string, amount?: string, taskId?: number, x402?: object }`):
  Signs and submits `pay(task_id, to, amount)` with the agent's Leash key, or settles an `exact`-scheme Stellar `x402` payment requirement directly from the treasury.
  - On success: `{ paid: true, txHash, ledger, links: { tx } }`.
  - On policy refusal: `{ paid: false, stage: "preflight" | "simulation" | "onchain", reasons: [{ code, name, detail }], nextStep }`. **Treat refusals as structured data, never as crashes.**
- **`request_exception`** (`{ to: string, amount: string, taskId?: number }`):
  When `pay` or `check_budget` refuses a payment on policy grounds, records an on-chain exception request (`manageData` entry `eunomia.x.<treasury>.<id>` on the agent's Stellar account). The owner sees it on the dashboard's Agent page and resolves it on-chain.
- **`check_exception`** (`{ id: string, close?: boolean }`):
  Checks whether the treasury would now accept the requested payment (`status: "approved" | "pending" | "closed"`). Once `"approved"`, call `pay`. Pass `close: true` to withdraw the entry and reclaim the 0.5 XLM reserve.
- **`request_budget`** (`{ amount: string, hours: number, payees: string[], task: string }`):
  Produces an Ed25519-signed dashboard URL (`https://eunomia.finance/...`) asking the owner to approve a scoped task budget (`set_task_budget`) for up to 16 named payees with one passkey/wallet signature.

### Paid API & x402/MPP Service Float Tools
Because Stellar x402 / MPP facilitators settle from a classic `G…` account, the agent buys paid APIs through a bounded float on its own account:
- **`find_services`** (`{ query?: string, category?: string, verifiedOnly?: boolean, limit?: number }`):
  Searches the ROZO MPP Router mainnet catalog for paid APIs (`url`, `method`, price, `payTo`, verification status). Free to call.
- **`fund_float`** (`{ amount: string, taskId?: number }`):
  Moves `amount` from the treasury to the agent's own `G…` account via the treasury's `pay()` (enforcing all on-chain limits and any monthly cap on the agent's address).
- **`call_service`** (`{ url: string, maxPrice: string, method?: string, body?: unknown, service?: string }`):
  Calls an x402/MPP HTTP endpoint and pays its `402 Payment Required` challenge from the float only if the price is within `maxPrice`, within `perPaymentCap`, and `payTo` is approved by the treasury (and inside `taskPayees` if a task budget is active).
- **`float_status`** (`{ last?: number }`):
  Returns the current float balance on the agent's account and the local log of recent `call_service` purchases (`service`, `url`, `amount`, `payTo`, `txHash`).
- **`sweep_float`** (`{ amount?: string }`):
  Returns unspent float funds from the agent's account back to the treasury contract.

---

## 3. Conversational Operating Rules for the Agent

1. **Always pre-flight before spending:** Call `check_budget` with `amount` and `check_payee` (unless the payee is already in `list_allowed_payees`) before calling `pay` or `fund_float`.
2. **Never retry a policy refusal blindly:** If `pay` returns `paid: false`:
   - Read `reasons[]` (e.g. `#2 PayeeNotWhitelisted`, `#3 ExceedsTaskLimit`, `#4 ExceedsDailyLimit`, `#10 ExceedsSessionLimit`, `#14 ExceedsPayeeCap`, `#15 ExceedsMonthlyLimit`, `#17 PayeeOutsideTaskBudget`).
   - Offer to file an on-chain exception (`request_exception`) or generate a signed task-budget link (`request_budget`) and share the resulting ID or link with the operator.
3. **Keep the task float short-lived:** When buying x402 services (`find_services` -> `fund_float` -> `call_service`), fund only what the current task requires and call `sweep_float` as soon as the task completes.
4. **Protect credentials:** Never cat, print, or transmit `~/.eunomia/pubnet/<treasury>.json` or `EUNOMIA_AGENT_SECRET`.

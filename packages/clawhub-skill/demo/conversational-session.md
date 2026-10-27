# Recorded Demo: Conversational Treasury Pickup & Bounded Spending (`eunomia-treasury`)

Recorded with `eunomia-mcp@0.3.0` (`packages/mcp`) and the `eunomia-treasury` OpenClaw skill (`packages/clawhub-skill/SKILL.md`).

---

## Turn 1 — Picking up a treasury & generating a signed Task Budget request

**Operator:**
> Pick up treasury `CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K` on mainnet. Check if my credential is set up, and prepare a 4-hour, 5 USDC task budget request for payee `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` so you can pay for market-data feeds.

**Agent (`eunomia-mcp init`):**
```text
$ EUNOMIA_RPC_URL=https://mainnet.sorobanrpc.com npx eunomia-mcp init --treasury CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
Credential saved: ~/.eunomia/pubnet/CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K.json
Agent public key: GD5T6IPRNCK7HQM3X4B7W2Z6V5C8N9M2L4K6J8H2G4F6D8S2A4Q6W8E0   (not funded yet — see below)
```

**Agent (`request_budget` tool call):**
```json
{
  "tool": "request_budget",
  "arguments": {
    "amount": "5",
    "hours": 4,
    "payees": [
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    ],
    "task": "Market-data feed collection"
  }
}
```

**Tool Output (`request_budget`):**
```json
{
  "treasury": "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
  "agent": "GD5T6IPRNCK7HQM3X4B7W2Z6V5C8N9M2L4K6J8H2G4F6D8S2A4Q6W8E0",
  "amount": "5",
  "hours": 4,
  "payees": [
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  ],
  "task": "Market-data feed collection",
  "approveUrl": "https://eunomia.finance/#budget=...",
  "note": "Send this link to the treasury owner. Opening it shows the request and approves it with one signature (set_task_budget). Signed with this agent's key — an edited link will not verify."
}
```

**Agent Reply:**
> I initialized a local Leash key (`GD5T6I…W8E0`) for treasury `CBQHNA…AO4K` and signed a 5 USDC / 4-hour task-budget request scoped to `GA5ZSE…KZVN`.
> 1. Fund `GD5T6I…W8E0` with ~3 XLM and run `npx eunomia-mcp trustline`.
> 2. Open the signed approval link above in the Eunomia dashboard to authorize `set_task_budget` with one signature.

---

## Turn 2 — Pre-flighting budget & handling an out-of-policy request

**Operator:**
> The task budget is approved. Before we run the market-data queries, also pay `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` 15 USDC for invoice #101.

**Agent (`check_budget` tool call with pre-flight amount `"15"`):**
```json
{
  "tool": "check_budget",
  "arguments": {
    "amount": "15"
  }
}
```

**Tool Output (`check_budget`):**
```json
{
  "treasury": "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
  "token": "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  "unit": "USDC",
  "paused": false,
  "perPaymentCap": "2",
  "perPaymentCapStroops": "20000000",
  "dailyLimit": "10",
  "daySpent": "0",
  "dailyRemaining": "10",
  "freeBalance": "25",
  "taskPayees": [
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  ],
  "session": {
    "agent": "GD5T6IPRNCK7HQM3X4B7W2Z6V5C8N9M2L4K6J8H2G4F6D8S2A4Q6W8E0",
    "isThisAgent": true,
    "active": true,
    "expiresInSec": 14340,
    "cap": "5",
    "spent": "0",
    "remaining": "5"
  },
  "canSpend": true,
  "spendableNow": "2",
  "spendableNowStroops": "20000000",
  "blockers": [],
  "decision": {
    "amount": "15",
    "allowed": false,
    "reasons": [
      {
        "code": 3,
        "name": "ExceedsTaskLimit",
        "detail": "Amount exceeds the treasury's per-payment limit."
      },
      {
        "code": 4,
        "name": "ExceedsDailyLimit",
        "detail": "Amount exceeds the remaining 24-hour rolling limit."
      },
      {
        "code": 10,
        "name": "ExceedsSessionLimit",
        "detail": "Amount exceeds the remaining agent session cap."
      }
    ]
  }
}
```

**Agent (`request_exception` tool call):**
```json
{
  "tool": "request_exception",
  "arguments": {
    "to": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "amount": "15",
    "taskId": 101
  }
}
```

**Agent Reply:**
> Pre-flight (`check_budget`) shows `spendableNow: 2 USDC` (`perPaymentCap: 2 USDC`, `dailyRemaining: 10 USDC`, `session.remaining: 5 USDC`). A 15 USDC payment would be rejected on-chain with codes `#3 ExceedsTaskLimit`, `#4 ExceedsDailyLimit`, and `#10 ExceedsSessionLimit`.
> No transaction fee was spent on a failed payment. I filed on-chain exception request `id` on the agent account so you can review and raise the limits from **Dashboard → Agent** if you want invoice #101 paid.

---

## Turn 3 — Buying a paid x402 API from the bounded float and sweeping the remainder

**Operator:**
> Skip invoice #101 for now. Search for a verified market-data service, fund a 0.5 USDC float, call the endpoint with `maxPrice: "0.05"`, and sweep the remaining float back to the treasury.

**Agent Tool Sequence (`find_services` -> `fund_float` -> `call_service` -> `sweep_float`):**
1. `find_services({ query: "market", verifiedOnly: true, limit: 3 })` -> finds verified route settling to approved router `GA5ZSE…KZVN` at `0.01 USDC`.
2. `fund_float({ amount: "0.5", taskId: 102 })` -> `{ float: true, paid: true, amount: "0.5", unit: "USDC", txHash: "8f3c...a91b" }`.
3. `call_service({ url: "https://...", maxPrice: "0.05", method: "POST", body: { symbol: "XLM-USD" } })` -> `{ status: 200, amount: "0.01", unit: "USDC", txHash: "4d2e...c012", body: { price: 0.391 } }`.
4. `sweep_float({})` -> `{ swept: true, amount: "0.49", unit: "USDC", txHash: "9a1d...77e4" }`.

**Agent Reply:**
> Completed:
> - Funded `0.5 USDC` float from the treasury (`tx: 8f3c…a91b`).
> - Paid `0.01 USDC` via x402 for the market-data call (`tx: 4d2e…c012`, within the `0.05 USDC` ceiling).
> - Swept the unused `0.49 USDC` float back into the treasury (`tx: 9a1d…77e4`).

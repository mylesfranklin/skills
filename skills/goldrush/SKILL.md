---
name: goldrush
description: "GoldRush (Covalent) blockchain data for wallet profiling, cross-chain analysis, token balances, transaction history, and streaming wallet surveillance. Use when researching onchain activity, wallet age, chain activity, token balances, or wallet profiling."
argument-hint: "[wallet address, chain name, or investigation query]"
allowed-tools:
  - Bash
  - Read
---

# GoldRush Blockchain Data Skill

Use this skill when working with GoldRush (Covalent) API for wallet profiling, cross-chain analysis, token balances, transaction history, or streaming wallet surveillance. Trigger on: "goldrush", "covalent", "cross-chain", "wallet age", "chain activity", "token balances", "wallet profiling", "onchain enrichment".

Task: $ARGUMENTS

## MCP Server Available

GoldRush MCP server is registered in this project. Use MCP tools directly for interactive queries:
- Tools prefixed with `mcp__goldrush__*` provide direct API access
- API key is pre-configured (Platinum tier, 650K credits/mo)

## Project Integration

Our codebase already has a Python GoldRush client at `src/integrations/goldrush.py` and streaming client at `src/streaming/goldrush_stream.py`. The MCP tools are for ad-hoc investigation during development. Production enrichment uses the Python clients.

### Key files
- `src/integrations/goldrush.py` — REST client (GoldRushClient)
- `src/streaming/goldrush_stream.py` — WebSocket streaming client (GoldRushStreamingClient)
- `src/streaming/goldrush_detector.py` — Event detector (bridge, approve alerts)
- `src/integrations/goldrush_pnl_validator.py` — PnL cross-validation
- `src/hunter/alloydb.py` — `wallet_goldrush_profiles` table methods

### Current enrichment pipeline
- Runs every 6h, 200 wallets/batch, 0.6s between calls
- Stores: `gr_wallet_age_days`, `gr_total_tx_count`, `gr_gas_spent_usd`, `gr_active_chains`, `gr_chain_list`
- Feeds into `SharpBettor.score()` (5% weight from wallet_age + active_chains)
- GoldRush surveillance loop monitors top 50 tier2 wallets hourly via WebSocket

## Credit budget
- Platinum tier: 650K credits/mo
- Current usage: ~5.5% (~36K credits)
- Budget headroom: ~614K credits available
- Most wallet profiling calls: 0.5-2.5 credits each
- Streaming: FREE during beta

## Polymarket-specific patterns

### Wallet deep-dive (recommended call sequence)
1. `getAddressActivity` (0.5 credits) — which chains, first/last seen
2. `getTransactionSummary` on matic-mainnet (1 credit) — wallet age, tx count, gas
3. `getTokenBalancesForWalletAddress` on matic-mainnet (1 credit) — current holdings
4. `getMultiChainBalances` (2.5 credits) — cross-chain wealth
5. `getApprovals` on matic-mainnet (2 credits) — DeFi exposure risk
Total: ~7 credits per wallet deep-dive

### Funding chain detection
- `getErc20TransfersForWalletAddress` with `contract-address` = USDC.e on matic-mainnet
- Look for large inbound transfers from exchanges/bridges before Polymarket positions
- Cross-reference with `getAddressActivity` to find source chains

### Whale identification
- `getMultiChainBalances` to find total cross-chain wealth
- `getHistoricalPortfolioForWalletAddress` to see wealth trajectory
- Correlate with Polymarket position sizes from our `wallet_tier1_profiles`

See [references/api_reference.md](references/api_reference.md) for full REST and Streaming API endpoint reference.

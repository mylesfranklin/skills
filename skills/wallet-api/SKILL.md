---
name: wallet-api
description: >-
  Query the Polymarket Wallet Hunter API and AlloyDB. Use when the user
  asks about bettors, wallets, anomalies, markets, pipelines, onchain
  data, whale activity, kyle lambda, or wants to run SQL queries.
argument-hint: "[health | wallet 0x... | anomalies | whales | sql ...]"
allowed-tools: Bash, Read
---

# Polymarket Wallet Hunter API

## Connection

**Base URL:** `https://polymarket-wallet-hunter-1070949384778.us-central1.run.app`

**API Key:** !`gcloud secrets versions access latest --secret=polymarket-api-key --project=gen-lang-client-0814665573 2>/dev/null`

**Curl template** (use for every request):
```
curl -s -H "X-API-Key: API_KEY" -H "Accept-Encoding: identity" "$BASE/endpoint?params" | python3 -m json.tool
```
`Accept-Encoding: identity` is required to bypass Cloud Run gzip. All 2xx responses are wrapped: `{"status":"ok","request_id":"...","...data..."}`. Errors use RFC 7807: `{"type":"about:blank","title":"...","status":4xx,"detail":"..."}`.

For the full OpenAPI spec with all parameter details: `curl -s $BASE/openapi.json`

Task: $ARGUMENTS

## Endpoint Cheat Sheet (53 endpoints)

### Health
```
GET /livez                                                             [no auth]
GET /health                                                            [no auth]
```

### Bettors
```
GET /bettors              ?archetype=&min_roi=&sort_by=composite_score&limit=50  -> bettors[]      [30/m]
GET /bettors/{addr}       single bettor (enriched from Data API)                                    [30/m]
GET /bettors/{addr}/history  ?limit=50                                                              [30/m]
GET /bettors/{addr}/signals                                                                         [30/m]
GET /similar/{addr}       ?limit=5  pgvector cosine similarity                                      [30/m]
GET /search/strategy      ?q=<min3>&limit=5  Vertex AI semantic search                              [30/m]
```

### Wallets
```
GET /wallets              ?tier=0|1|2&min_volume=&sort_by=total_volume&limit=50  -> wallets[]       [30/m]
GET /wallets/{addr}/summary                                                                         [30/m]
GET /wallets/{addr}/profile   Tier 1 behavioral profile + GoldRush enrichment                        [30/m]
GET /wallets/{addr}/positions open positions + PnL                                                   [30/m]
GET /wallets/{addr}/pnl                                                                              [30/m]
GET /wallets/{addr}/theses    thesis cluster participation                                           [30/m]
GET /wallets/tier1        ?strategy_type=&min_win_rate=&sort_by=total_volume     -> profiles[]      [30/m]
GET /wallets/watched/trades  ?addresses=&since_minutes=30                                            [20/m]
POST /wallets/{addr}/promote  body: {tier: 0|1|2}                                                   [10/m]
GET /tiers/stats                                                                 -> tiers[]         [30/m]
GET /tiers/history        ?days_back=30                                          -> history[]       [30/m]
GET /kyle-lambda/leaderboard  ?limit=50&min_fills=10                             -> wallets[]       [30/m]
```

### Markets
```
GET /hot-markets          ?min_bettors=2&limit=30                -> markets[]              [30/m]
GET /intel/markets        ?limit=20  Gemini-enriched             -> markets[]        [20/m, slow]
GET /intel/brief          daily intelligence brief               -> brief (string)   [20/m, slow]
GET /tokens/{token_id}/market  resolve token to market                                     [30/m]
```
Note: `/hot-markets` uses `total_hot_markets` instead of `total` for count.

### Anomalies
```
GET /anomalies            ?anomaly_type=&signal_strength=&acknowledged=&limit=50 -> anomalies[]    [30/m]
GET /anomalies/summary    counts by type+strength (7d)                           -> summary[]      [30/m]
GET /anomalies/persistence  ?anomaly_type=&persistence_class=&limit=50           -> cases[]        [30/m]
POST /anomalies/{id}/ack  acknowledge anomaly                                                      [30/m]
```

### Graph
```
GET /graph/clusters                                              -> clusters[]              [20/m]
GET /graph/suspicious                                            -> suspicious_patterns[]   [20/m]
GET /graph/connections/{addr}  ?depth=2(1-4)                                                [20/m]
GET /graph/bq/stats                                              -> edge_types[]            [30/m]
GET /graph/bq/neighbors/{addr}  ?edge_type=&limit=50                                        [20/m]
GET /graph/bq/hubs        ?limit=50                              -> hubs[]                  [20/m]
```

### Clusters & Strategies
```
GET /clusters                                                    -> clusters[]              [30/m]
GET /clusters/{id}/members  ?sort_by=total_volume&limit=50                                  [30/m]
GET /strategies           strategy type distribution             -> strategies[]            [30/m]
GET /thesis/clusters      ?limit=50                              -> clusters[]              [30/m]
```

### Onchain
```
GET /onchain/active       ?days=7(1-30)&limit=200               -> wallets[]               [20/m]
GET /onchain/profile/{addr}                                                          [20/m, slow]
GET /onchain/whales       ?days=7(1-30)                         -> whale_movements[]       [20/m]
GET /onchain/status       ingestion pipeline status                                        [30/m]
```

### Alerts
```
GET /alerts               ?limit=50&type=                        -> alerts[]               [30/m]
GET /alerts/history       ?limit=50&offset=0&type=               -> alerts[]               [30/m]
GET /position-changes     ?limit=50&address=                     -> changes[]              [30/m]
```

### Streaming
```
GET /stream/stats                                                                       [no limit]
GET /stream/signals                                              -> signals[]           [no limit]
POST /stream/start                                                                           [5/m]
POST /stream/stop                                                                            [5/m]
```

### System
```
GET /profiles/status      tier1, clustering, wallet graph, goldrush jobs         [30/m]
GET /pnl/status           backfill + incremental PnL                             [30/m]
POST /discover            trigger pipeline run                                    [5/m]
GET /history/compare      ?addresses=0x..,0x..&metric=composite_score&limit=50  [30/m]
```

## Workflows

**Deep-dive a wallet** — run in parallel:
`/bettors/{addr}`, `/wallets/{addr}/summary`, `/wallets/{addr}/profile`, `/wallets/{addr}/positions`, `/wallets/{addr}/pnl`, `/wallets/{addr}/theses`, `/similar/{addr}`, `/onchain/profile/{addr}`, `/graph/bq/neighbors/{addr}`

**Insider activity check:**
`/anomalies?anomaly_type=FRESH_WHALE`, `/anomalies?anomaly_type=COPY_TRADER`, `/anomalies/persistence?persistence_class=persistent`, then `/graph/bq/neighbors/{addr}` for flagged addresses

**System health:**
`/health`, `/profiles/status`, `/pnl/status`, `/onchain/status`

**Smart money flow:**
`/hot-markets?limit=30`, `/wallets/watched/trades`, `/kyle-lambda/leaderboard?limit=20`

**Find informed traders:**
`/kyle-lambda/leaderboard` cross-ref with `/wallets/tier1?sort_by=total_volume`

**Compare wallets:**
`/history/compare?addresses=0x...,0x...&metric=pnl_usd&days_back=90`
Metrics: composite_score, pnl_usd, roi, win_rate, total_bets, max_drawdown

## AlloyDB Direct Queries

For queries beyond API endpoints. Connection:
```bash
ALLOYDB_PW=!`gcloud secrets versions access latest --secret=alloydb-password --project=gen-lang-client-0814665573 2>/dev/null`
```

Use asyncpg with SSL (`check_hostname=False, verify_mode=CERT_NONE`) to `postgresql://postgres:${ALLOYDB_PW}@35.224.217.151:5432/polymarket`.

**Key tables:**
| Table | Key columns |
|---|---|
| `wallet_tier1_profiles` | address, pnl_usd, win_rate, total_volume, strategy_type, maker_ratio |
| `wallet_kyle_lambda` | address, kyle_lambda, lambda_percentile, avg_price_impact |
| `wallet_anomalies` | address, anomaly_type, signal_strength, trade_value_usd, detail |
| `wallet_anomaly_persistence` | address, anomaly_type, persistence_class, max_abs_move, price_at_detect |
| `wallet_clusters` | address, cluster_id, rule_based_strategy, pnl_usd, win_rate |
| `wallet_edges` | wallet_a, wallet_b, edge_type, shared_tokens, combined_volume |
| `onchain_fills` | block_timestamp, maker_address, taker_address, outcome_token_id, trade_value_usd |
| `sharp_bettors` | address, data (JSONB, double-encoded), last_updated |
| `wallet_index` | address, tier, total_volume, pnl_usd, last_active |

**Column gotchas:** Column is `address` not `wallet_address`. PnL is `pnl_usd` not `total_pnl_usd`. Volume is `total_volume` not `total_volume_usd`. `sharp_bettors.data` is JSONB but double-encoded — parse with `json.loads()` twice.

**Safety rules:**
1. Always partition-prune `onchain_fills`: `WHERE block_timestamp >= '2026-03-01'`
2. Never `LOWER()` on maker_address/taker_address — already lowercase, defeats indexes
3. Always add `LIMIT`
4. No DDL/DML without explicit user approval
5. Use `command_timeout=60` for ad-hoc queries

## Enums

**Anomaly types:** FRESH_WHALE, FRESH_CONCENTRATED, VOLUME_SPIKE, CLUSTER_BET, SYBIL_CANDIDATE, DORMANT_REACTIVATION, PRE_RESOLUTION_ENTRY, COPY_TRADER
**Signal strengths:** CRITICAL, HIGH, MEDIUM
**Strategy types:** market_maker, high_frequency, directional, concentrated, diversified, burst_trader, mixed, systematic, sniper
**Edge types:** SAME_TOKEN, COUNTERPARTY, SAME_CLUSTER, SIMILAR_BEHAVIOR
**Persistence classes:** persistent, transient, reverting
**Wallet tiers:** 0 (base), 1 (high-volume), 2 (sharp/scored)
**Archetypes:** sharp, sniper, hot_hand, concentrated, active, high_conviction, grinder, diversified, sports_bettor, politics_bettor, crypto_bettor, active_trader (all prefixed with whale_ for PnL>$500K or vol>$5M)

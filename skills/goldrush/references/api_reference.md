# GoldRush API Reference

## REST API

Base URL: `https://api.covalenthq.com`
Auth: `Authorization: Bearer {GOLDRUSH_API_KEY}` or Basic auth `(api_key, "")`
Chain names: kebab-case (`eth-mainnet`, `matic-mainnet`, `base-mainnet`, `bsc-mainnet`)

### Cross-chain (no chain param needed)
| Endpoint | Cost | What it does |
|----------|------|-------------|
| `GET /v1/address/{addr}/activity/` | 0.5 | Chains where address is active. Response items have `extends.label`, `first_seen_at`, `last_seen_at`. No `has_data` field. |
| `GET /v1/allchains/address/{addr}/balances/` | 2.5 | Token balances across ALL chains in one call. Supports `?chains=` filter, `?cutoff-timestamp=` for snapshots. |
| `GET /v1/allchains/transactions/` | 0.25/item | Multi-chain + multi-address transactions. `?addresses=` comma-separated. `?with-decoded-logs=true` for parsed events. |

### Per-chain (requires `{chainName}` = `matic-mainnet` for Polygon)
| Endpoint | Cost | What it does |
|----------|------|-------------|
| `GET /v1/{chain}/address/{addr}/balances_v2/` | 1 | All token balances with USD quotes. `?no-spam=true` to filter. |
| `GET /v1/{chain}/address/{addr}/balances_native/` | 0.5 | Native token (MATIC/POL) balance only. |
| `GET /v1/{chain}/address/{addr}/transfers_v2/?contract-address={token}` | 0.05/item | ERC20 transfer history. Paginated. |
| `GET /v1/{chain}/address/{addr}/transactions_summary/?with-gas=true` | 1 | Earliest tx date, total tx count, gas spent. |
| `GET /v1/{chain}/address/{addr}/portfolio_v2/?days=30` | 2/30d | Historical portfolio value over time. |
| `GET /v1/{chain}/address/{addr}/historical_balances/?date=YYYY-MM-DD` | 1 | Balance snapshot at specific date/block. |
| `GET /v1/{chain}/approvals/{addr}/` | 2 | Token approvals (spender contracts, amounts at risk). |
| `GET /v1/{chain}/tokens/{token}/token_holders_v2/` | 0.02/item | Who holds a token. Paginated, page-size 100 or 1000. |

### Critical rules
1. Token balances are STRINGS — divide by `10^contract_decimals` for display
2. Pagination is 0-indexed (`page-number=0` is first page)
3. Check `error` field before accessing `data` in responses
4. Chain names are case-sensitive: `eth-mainnet` not `Eth-Mainnet`
5. ENS/RNS/Lens handles resolve automatically in `walletAddress` params
6. `getAddressActivity` response items: `{ "extends": { "label": "...", "name": "...", "is_testnet": bool }, "first_seen_at": "...", "last_seen_at": "..." }` — NO `has_data` field
7. Domain names NOT supported on multichain endpoints (`/v1/allchains/...`)

## Streaming API (WebSocket)

URL: `wss://streaming.goldrushdata.com/graphql`
Protocol: `graphql-transport-ws`
Auth: `{"type": "connection_init", "payload": {"GOLDRUSH_API_KEY": "{key}"}}` — raw key, NO Bearer prefix
Chain names: SCREAMING_SNAKE_CASE (`POLYGON_MAINNET`, `ETH_MAINNET`, `BASE_MAINNET`)
Status: Beta (free, no credits charged)

### Auth behavior
- Server ALWAYS sends `connection_ack` regardless of auth validity
- Auth errors surface only when subscription/query starts (MISSING_TOKEN, INVALID_TOKEN)
- Use `GOLDRUSH_API_KEY` key name (not `Authorization`)

### Queries (one-shot)
| Operation | What it does |
|-----------|-------------|
| `searchToken(query, chain_name?)` | Token discovery by name/ticker/address |
| `upnlForToken(chain_name, token_address)` | Top trader wallets by PnL for a token (30d) |
| `upnlForWallet(chain_name, wallet_address)` | Per-token PnL breakdown for a wallet |

### Subscriptions (long-lived)
| Operation | What it does |
|-----------|-------------|
| `walletTxs(chain_name, wallet_addresses[])` | Real-time tx stream with decoded events (Transfer, Swap, Bridge, Deposit, Withdraw, Approve) |
| `newPairs(chain_name, protocols[])` | New DEX pair creation alerts |
| `ohlcvCandlesForPair(chain_name, pair_addresses[], interval, timeframe)` | Real-time OHLCV for pairs |
| `ohlcvCandlesForToken(chain_name, token_addresses[], interval, timeframe)` | Real-time OHLCV for tokens |
| `updatePairs(chain_name, pair_addresses[])` | Price/volume/liquidity updates with 5m/1h/6h/24h deltas |

### walletTxs decoded event types
- **Transfer**: from, to, amount, quote_rate_usd, quote_usd, contract_metadata
- **Swap**: token_in, token_out, amount_in, amount_out
- **Bridge**: type, typeString, from, to, amount, quote_rate_usd
- **Approve**: spender, amount, quote_rate_usd, contract_metadata
- **Deposit/Withdraw**: from, to, amount, quote_rate_usd

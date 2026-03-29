# Claude Code Skills — Handoff

## What This Is

A collection of Claude Code skills across three domains: music intelligence, blockchain/prediction markets, and programmatic video. Each skill wraps a live API, runs autonomously via `/skill-name <query>`, and produces actionable output. No shared infrastructure — skills call APIs directly.

**Repo**: `mylesfranklin/skills` (GitHub)
**Architecture**: Skills-on-live-APIs. The agent IS the product.

## Current State (2026-03-29)

### Music Intelligence (4 skills)

#### `/music-discover` (MusicBrainz)
- **Status**: Production-ready, fully tested
- **API**: MusicBrainz Web API (free, no auth, 1 req/sec rate limit)
- **SDK**: `musicbrainz-api` npm package at `/tmp/musicbrainz-api/`
- **Data**: 2.8M artists, 38M recordings, 333K labels, 5.4M releases
- **Capabilities**: Artist/label/release-group search, full catalog enumeration, streaming URL extraction, label history, collaborator graph, genre/tag analysis
- **Output**: Investment Scorecard (metrics table + bull/bear/verdict)
- **Tested on**: James Kaye, Longhaul Music Group, EMPIRE (2,289 releases mapped), Shaboozey

#### `/music-streams` (Spotify)
- **Status**: Production-ready, stripped to core metrics
- **API**: Spotify Web API via Client Credentials flow
- **SDK**: `@spotify/web-api-ts-sdk` at `~/spotify-api/`
- **Auth**: `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` in `~/.claude/settings.json` env
- **Capabilities**: Artist profile (followers, popularity, genres), top tracks (with ISRCs), full discography scan (paginated), album deep dive (label, copyrights, UPC)
- **NOT available** (Spotify Feb 2026 restrictions): Audio features, related artists, recommendations, batch endpoints. Popularity/followers deprecated but still returning.
- **Output**: Streaming Intelligence Scorecard (metrics table + top tracks + bull/bear/verdict)
- **Tested on**: Daddex (17.5K followers, indie emo rap), Brent Faiyaz (8.47M followers, independent R&B), Shaboozey

#### `/music-youtube` (YouTube Data API v3)
- **Status**: Production-ready, fully tested
- **API**: YouTube Data API v3 (API key, 10,000 units/day quota)
- **SDK**: Direct `fetch()` — zero dependencies. Runtime at `/tmp/youtube-api/` (tsx + typescript only)
- **Auth**: `YOUTUBE_API_KEY` in `~/.claude/settings.json` env (provisioned via `gcloud services api-keys create`, restricted to YouTube API)
- **Capabilities**: Channel profile (subscribers, total views, video count), full upload enumeration (paginated at 50), batch video stats (views, likes, comments, duration, licensed flag), Art Track detection + description parsing (extracts distributor, label, album, release date), Topic channel discovery, VEVO channel detection
- **Quota costs**: `search.list` = 100 units (expensive, skip when URL/ID available), everything else = 1 unit. Typical investigation ~109 units, or ~9 units if channel ID known.
- **Output**: YouTube Intelligence Scorecard (metrics table + top videos + Art Track analysis + bull/bear/verdict)
- **Tested on**: Shaboozey (3 channels: main 1.04M subs/991M views, VEVO 545M views/57 videos, Topic 412M views/126 Art Tracks)

#### `/music-market` (Discogs API v2)
- **Status**: Production-ready, fully tested
- **API**: Discogs API v2 (personal access token, 60 req/min)
- **SDK**: `@lionralfs/discogs-client` v4.1.4 (native TypeScript, ESM, built-in rate limit backoff). Runtime at `/tmp/discogs-api/`
- **Auth**: `DISCOGS_TOKEN` in `~/.claude/settings.json` env
- **Capabilities**: Artist search + profile, full discography scan, release deep dive (companies[] for ℗/©/publisher/distributor via entity_type codes, identifiers[] for barcodes/UPC, extraartists[] for credits), label chain traversal (parent_label walk to detect UMG/Sony/Warner), master version facets
- **Key entity_types**: 13=℗, 14=©, 21=Published By, 9=Distributed By
- **Output**: Market Intelligence Scorecard (metrics table + key releases + label chain + credits + bull/bear/verdict)
- **Tested on**: Shaboozey (25 releases, earliest 2018 Republic/UMG, current catalog American Dogwood/EMPIRE independent)
- **Important**: Dynamic `import()` required — `(async () => { const { DiscogsClient } = await import('@lionralfs/discogs-client'); ... })();`

#### Cross-Skill Bridge
- **MusicBrainz → Spotify**: Spotify URLs in `url-rels` + ISRCs
- **MusicBrainz → YouTube**: YouTube URLs in `url-rels` — saves 100 quota units
- **YouTube → Labels**: Art Track descriptions contain distributor/label/release date
- **Discogs → Spotify/MusicBrainz**: Barcodes (UPC/EAN) cross-reference
- **Discogs → Label Independence**: Label chain traversal definitively answers "is this a major?"
- **Usage**: Run all 4 skills on same artist, agent holds all scorecards in context

### Polymarket / Blockchain (2 skills)

#### `/wallet-api` (Polymarket Wallet Hunter)
- **Status**: Production — connected to live Cloud Run API (53 endpoints) + AlloyDB (500M+ rows)
- **Source project**: `~/Desktop/polymarket-wallet-hunter/`
- **API**: Custom FastAPI backend on Cloud Run (us-central1)
- **Auth**: API key from GCP Secret Manager (`polymarket-api-key`), auto-injected via `!backtick`
- **Capabilities**: Wallet deep-dive (9 parallel calls), anomaly detection (8 types), Kyle's Lambda leaderboard, thesis clustering, onchain whale tracking, wallet graph, direct AlloyDB SQL queries
- **Database**: AlloyDB 16-vCPU, 500M+ rows, pgvector similarity search
- **Endpoints**: 53 total across health, bettors, wallets, markets, anomalies, graph, clusters, onchain, alerts, streaming, system

#### `/goldrush` (GoldRush/Covalent)
- **Status**: Production — MCP server + Python REST/streaming clients
- **API**: GoldRush (Covalent) REST + GraphQL WebSocket streaming
- **Auth**: Platinum tier (650K credits/mo, ~5.5% utilized)
- **Capabilities**: Cross-chain wallet profiling, token balances, transaction history, ERC20 transfers, approvals, real-time wallet surveillance via WebSocket
- **Integration**: Enrichment pipeline runs every 6h (200 wallets/batch), feeds into SharpBettor scoring

### Remotion / Programmatic Video (4 skills)

#### `remotion-core` / `remotion-animations` / `remotion-rendering` (model-invocable)
- Core framework, animation patterns (spring/interpolate/transitions), rendering pipelines (local + Lambda)

#### `/remotion-reference` (user-invocable)
- Analyze YouTube videos as reference, create Remotion short-form content (reels, TikTok, shorts)

## Acquisition Pipeline Mapping

| Pipeline Stage | What It Needs | What We Have | Gap |
|---|---|---|---|
| **Stage 1: Revenue ($500K×5yr)** | Stream counts, payout rates | Spotify popularity (proxy), YouTube views | No actual stream counts — need Chartmetric ($320/mo) or Last.fm playcounts (free) |
| **Stage 2: Catalog Age (≥8yr)** | True original release date | MusicBrainz release-group dates, Discogs circle-P dates | **Covered** |
| **Stage 3: Independence** | No UMG/Sony/Warner | Discogs label chain, Spotify C&P line, YouTube distributor | **Covered** |
| **Stage 4: Rights (100% ownership)** | Publishing splits, master rights | Nothing | MLC (applied, waiting), Songview (scrape-only) |

## Pending API Access (2026-03-29)

- **Deezer deep API** — applied, waiting
- **MLC (Mechanical Licensing Collective)** — applied, waiting. #1 priority for Stage 4.

## What's Next — Priority Order

| # | Skill | API | Why |
|---|---|---|---|
| 1 | `music-social` | Last.fm | Only free source of actual playcount data. Best revenue proxy. |
| 2 | Label exclusion matrix | Wikidata SPARQL | Automates Stage 3 at scale. |
| 3 | `music-lyrics` | Genius | Songwriter metadata. Free. |
| 4 | `music-live` | Bandsintown | Tour dates, venue capacity. Free. |
| 5 | `music-rights` | MLC | Applied, waiting. Enables Stage 4. |
| 6 | `music-qualify` | Orchestrator | Chains all skills → unified pass/fail + valuation. |

## Research Documents (~/Downloads/)

| File | Focus |
|---|---|
| `Music Catalog Lead Generation Data Pipeline (1).md` | 4-stage pipeline, revenue model, MLC/Songview/SoundExchange |
| `Music Catalog Acquisition Data Pipeline Research Report.md` | Tools/SDKs, entity resolution, valuation multiples (10-15x NPS) |
| `INTERNATIONAL Music Catalog Data Pipeline Strategy.md` | Non-Western markets, KKBOX/Boomplay/Melon, territory payout rates |

## Spotify API Restrictions (Feb 2026)

- Removed: batch fetch, browse, /users/{id}, /markets
- Restricted: audio-features, related-artists, recommendations → Extended Quota Mode
- Deprecated but returning: popularity, followers, label
- Restored: `external_ids` (ISRC/UPC) — removed then restored March 2026

## Key Files

| File | Purpose |
|---|---|
| `~/.claude/skills/music-discover/SKILL.md` | MusicBrainz skill prompt |
| `~/.claude/skills/music-streams/SKILL.md` | Spotify skill prompt |
| `~/.claude/skills/music-youtube/SKILL.md` | YouTube skill prompt |
| `~/.claude/skills/music-market/SKILL.md` | Discogs skill prompt |
| `~/.claude/skills/wallet-api/SKILL.md` | Polymarket Wallet Hunter API |
| `~/.claude/skills/goldrush/SKILL.md` | GoldRush blockchain data |
| `~/.claude/skills/remotion-*/SKILL.md` | Remotion video skills |
| `/tmp/musicbrainz-api/` | MusicBrainz SDK |
| `~/spotify-api/` | Spotify SDK |
| `/tmp/youtube-api/` | YouTube runtime (fetch-based) |
| `/tmp/discogs-api/` | Discogs runtime (@lionralfs/discogs-client) |
| `~/.claude/settings.json` | All API credentials |
| `SCHEMA.md` | MusicBrainz database schema (22 tables) |

## Skill Architecture Pattern

1. **Skill dir**: `~/.claude/skills/{name}/SKILL.md` + `references/api_reference.md`
2. **Runtime**: `/tmp/{service}-api/` with `package.json` (type: "module") + tsx + SDK
3. **Auth**: Credentials in `~/.claude/settings.json` env block
4. **Execution**: `cd /tmp/{service}-api && npx tsx -e '(async () => { ... })();'`
5. **SKILL.md**: Frontmatter → Execution → Route Query → Pipeline → Output Scorecard → Rules
6. **api_reference.md**: Init → endpoint snippets → helpers → key fields table

## Shaboozey Cross-Skill Test Summary

| Signal | Source | Finding |
|---|---|---|
| Real name | Discogs | Collins Obinna Chibueze |
| Catalog age | Discogs | 7 years (first release 2018) |
| Early label | Discogs | Republic Records → Republic Corps → **UMG** (major) |
| Current label | All | American Dogwood / EMPIRE (**independent**) |
| YouTube subs | YouTube | 1.04M |
| Combined YT views | YouTube | ~1.95 billion across 3 channels |
| Art Tracks | YouTube | 126 on Topic channel, 412M views |
| Distribution | YouTube | EMPIRE (93 tracks, 405M views), UMG (25 tracks, 3.5M views) |
| Monster hit | YouTube | "A Bar Song (Tipsy)" — ~571M combined views |
| Physical market | Discogs | Vinyl LP sold out, 10 versions, 60 want/88 have |
| Key risk | Discogs | 2018 "Lady Wrangler" on Republic/UMG — different rights |

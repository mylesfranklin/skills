# Claude Code Skills — Handoff

## What This Is

A collection of Claude Code skills across three domains: music intelligence, blockchain/prediction markets, and programmatic video. Each skill wraps a live API, runs autonomously via `/skill-name <query>`, and produces actionable output. No shared infrastructure — skills call APIs directly.

**Repo**: `mylesfranklin/skills` (GitHub)
**Architecture**: Skills-on-live-APIs. The agent IS the product.

## Current State (2026-03-29)

### Music Intelligence (3 skills)

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
- **NOT available** (Spotify Feb 2026 restrictions): Audio features, related artists, recommendations, batch endpoints
- **Output**: Streaming Intelligence Scorecard (metrics table + top tracks + bull/bear/verdict)
- **Tested on**: Daddex (17.5K followers, indie emo rap), Brent Faiyaz (8.47M followers, independent R&B)

#### `/music-youtube` (YouTube Data API v3)
- **Status**: Production-ready
- **API**: YouTube Data API v3
- **SDK**: TypeScript at `/tmp/youtube-api/`
- **Capabilities**: Artist channel analysis, view counts, subscriber growth, video engagement, Art Track metadata, label/distributor signals
- **Output**: YouTube Assessment (engagement metrics + label signals)

#### Cross-Skill Bridge
- **Join key**: Spotify URLs stored in MusicBrainz `url-rels` (type "free streaming") + ISRCs on both sides
- **Usage**: Run `/music-discover <artist>` to get MBID + Spotify URL, then `/music-streams <spotify-url>` for streaming data
- **No infra needed**: Agent holds both scorecards in context

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

#### `remotion-core` (model-invocable)
- **Status**: Production-ready
- **Capabilities**: Core Remotion framework — compositions, hooks (`useCurrentFrame`, `useVideoConfig`), component patterns, project structure

#### `remotion-animations` (model-invocable)
- **Status**: Production-ready
- **Capabilities**: Spring physics, easing functions, `interpolate`, transitions, keyframe patterns, effects

#### `remotion-rendering` (model-invocable)
- **Status**: Production-ready
- **Capabilities**: Local rendering, Lambda deployment, CI/CD pipelines, bundling, production infrastructure

#### `/remotion-reference` (user-invocable)
- **Status**: Production-ready
- **Capabilities**: Analyze YouTube videos as reference material, create Remotion short-form content (reels, TikTok, shorts)

## Spotify API Restrictions (Feb 2026)

Critical context for any future Spotify work:
- **Development Mode**: Requires Premium account, max 5 test users, 1 Client ID per developer
- **Removed endpoints**: batch fetch (tracks/albums/artists), browse, top-tracks (officially), /users/{id}, /markets
- **Restricted endpoints**: audio-features, related-artists, recommendations → require Extended Quota Mode
- **Deprecated fields**: popularity, followers, label, available_markets (still returning but unreliable)
- **Restored**: `external_ids` (ISRC/UPC) was removed then restored in March 2026

## What's Next — Candidate Skills

### Music
| Skill Name | API | Data | Auth | Cost |
|---|---|---|---|---|
| `music-market` | Discogs | Collectible pricing, physical releases, label rosters | Free (token) | Free |
| `music-social` | Last.fm | Listening patterns, similar artists, tags, scrobble counts | Free (API key) | Free |
| `music-rights` | ASCAP/BMI/SESAC | Publishing ownership, songwriter credits | Web scraping | Free |
| `music-lyrics` | Genius | Lyrics, annotations, songwriter metadata | Free (token) | Free |
| `music-analytics` | Soundcharts/Chartmetric | Monthly listeners, chart positions, playlist adds | Paid | $$ |
| `music-live` | Bandsintown/Songkick | Tour dates, venue capacity, ticket data | Free | Free |

### Polymarket
- Lead-lag detection, funding chain analysis, cross-platform arb, farming classifier — all as new API endpoints in wallet-hunter, exposed via `/wallet-api`

## MusicBrainz Database Stats

Full DB available as weekly PostgreSQL dumps (free, CC0 license):
- 2.8M artists, 4.2M release groups, 5.4M releases, 38.3M recordings, 333K labels
- Dump URL: `https://data.metabrainz.org/pub/musicbrainz/data/fullexport/`
- ~15-20GB compressed, ~150GB uncompressed
- Full schema: see `SCHEMA.md` (22 tables, 10 sample queries, storage estimates)

## Key Files

| File | Purpose |
|---|---|
| `skills/music-discover/SKILL.md` | MusicBrainz skill prompt |
| `skills/music-discover/reference.md` | MusicBrainz API snippets |
| `skills/music-streams/SKILL.md` | Spotify skill prompt |
| `skills/music-streams/references/api_reference.md` | Spotify API snippets |
| `skills/music-youtube/SKILL.md` | YouTube skill prompt |
| `skills/music-youtube/references/api_reference.md` | YouTube API snippets |
| `skills/wallet-api/SKILL.md` | Polymarket Wallet Hunter API skill |
| `skills/goldrush/SKILL.md` | GoldRush blockchain data skill |
| `skills/goldrush/references/api_reference.md` | GoldRush REST + Streaming API reference |
| `skills/remotion-core/SKILL.md` | Remotion framework core |
| `skills/remotion-animations/SKILL.md` | Remotion animation patterns |
| `skills/remotion-rendering/SKILL.md` | Remotion rendering + deployment |
| `skills/remotion-reference/SKILL.md` | YouTube → Remotion short-form factory |
| `/tmp/musicbrainz-api/` | MusicBrainz SDK (npm) |
| `~/spotify-api/` | Spotify SDK (npm) |
| `/tmp/youtube-api/` | YouTube API SDK (TypeScript) |

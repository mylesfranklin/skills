# Claude Code Skills — Handoff

## What This Is

A collection of Claude Code skills across three domains: music intelligence, blockchain/prediction markets, and programmatic video. Each skill wraps a live API, runs autonomously via `/skill-name <query>`, and produces actionable output. No shared infrastructure — skills call APIs directly.

**Repo**: `mylesfranklin/skills` (GitHub)
**Architecture**: Skills-on-live-APIs. The agent IS the product.

## Current State (2026-04-02)

### Music Intelligence (5 skills)

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

#### `/music-social` (Last.fm)
- **Status**: Production-ready
- **API**: Last.fm API (free, API key only, 5 req/sec rate limit)
- **SDK**: Direct `fetch()` — zero dependencies. Runtime at `/tmp/lastfm-api/` (tsx + typescript only)
- **Auth**: `LASTFM_API_KEY` in `~/.claude/settings.json` env
- **Capabilities**: Artist scrobble counts (total plays + unique listeners), per-track playcounts, per-album playcounts, fanbase stickiness ratio (scrobbles/listener), top-5 concentration analysis, comparable artist benchmarking with match scores, user-applied tags (behavioral genre signal)
- **Investment signal**: Only free source of actual consumption volume data — closest proxy to streaming revenue. Stickiness ratio identifies dedicated vs casual fanbases.
- **Output**: Social Intelligence Scorecard (metrics table + top tracks + top albums + comp set + bull/bear/verdict)
- **Limitation**: Data skews rock/indie/electronic — hip-hop and Latin under-represented

#### Cross-Skill Bridge
- **MusicBrainz → Spotify**: Spotify URLs in `url-rels` + ISRCs
- **MusicBrainz → YouTube**: YouTube URLs in `url-rels` — saves 100 quota units
- **MusicBrainz → Last.fm**: MBIDs shared natively — Last.fm is built on MusicBrainz data
- **Last.fm → MusicBrainz**: `artist.getinfo` returns MBID directly, zero entity resolution needed
- **Last.fm → Spotify**: Top track names from Last.fm can be searched via `music-streams` ISRC lookup
- **YouTube → Labels**: Art Track descriptions contain distributor/label/release date
- **Discogs → Spotify/MusicBrainz**: Barcodes (UPC/EAN) cross-reference
- **Discogs → Label Independence**: Label chain traversal definitively answers "is this a major?"
- **Usage**: Run all 5 skills on same artist, agent holds all scorecards in context

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
| **Stage 1: Revenue ($500K×5yr)** | Stream counts, payout rates | Spotify popularity (proxy), YouTube views, **Last.fm scrobbles (actual playcounts)** | Scrobbles are relative signal (comp-set ranking), not absolute revenue. Still no payout rate data — Chartmetric ($320/mo) for that. |
| **Stage 2: Catalog Age (≥8yr)** | True original release date | MusicBrainz release-group dates, Discogs circle-P dates | **Covered** |
| **Stage 3: Independence** | No UMG/Sony/Warner | Discogs label chain, Spotify C&P line, YouTube distributor | **Covered** |
| **Stage 4: Rights (100% ownership)** | Publishing splits, master rights | Nothing | MLC (applied, waiting), Songview (scrape-only) |

## Pending API Access (2026-03-29)

- **Deezer deep API** — applied, waiting
- **MLC (Mechanical Licensing Collective)** — applied, waiting. #1 priority for Stage 4.

## What's Next — Priority Order

| # | Skill | API | Why |
|---|---|---|---|
| ~~1~~ | ~~`music-social`~~ | ~~Last.fm~~ | **DONE** — production-ready |
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
| `~/.claude/skills/music-social/SKILL.md` | Last.fm skill prompt |
| `~/.claude/skills/wallet-api/SKILL.md` | Polymarket Wallet Hunter API |
| `~/.claude/skills/goldrush/SKILL.md` | GoldRush blockchain data |
| `~/.claude/skills/remotion-*/SKILL.md` | Remotion video skills |
| `/tmp/musicbrainz-api/` | MusicBrainz SDK |
| `~/spotify-api/` | Spotify SDK |
| `/tmp/youtube-api/` | YouTube runtime (fetch-based) |
| `/tmp/discogs-api/` | Discogs runtime (@lionralfs/discogs-client) |
| `/tmp/lastfm-api/` | Last.fm runtime (fetch-based) |
| `~/.claude/settings.json` | All API credentials |
| `SCHEMA.md` | MusicBrainz database schema (22 tables) |

## First Screening Run (2026-03-29)

Ran a full 5-platform screening pipeline. Results exported to `~/Desktop/Catalog_Acquisition_Targets_2026-03-29.pdf`.

**Funnel**: 369 candidates (8 genre verticals via Last.fm `tag.gettopartists`) → 57 in listener sweet spot (50K-2M) → 23 pass catalog age (8+ yr, MusicBrainz) → 18 pass independence (Discogs label chain) → 10 final targets (composite ranking).

**Eliminated for major label**: The Durutti Column (London Records → Universal), Catherine Wheel (Columbia → Sony), Other Lives (PIAS → Universal).

### 10 Acquisition Targets

| # | Artist | Genre | Scrobbles | Stickiness | Spotify | Label | Key Signal |
|---|---|---|---|---|---|---|---|
| 1 | Still Corners | Dream Pop | 12.0M | 20.0x | 398K/pop60 | Wrecking Light (own) | Own label, growing remasters |
| 2 | Skinshape | Trip-Hop | 6.8M | 16.4x | 342K/pop57 | Lewis Recordings | 86M YouTube views (highest) |
| 3 | Dwele | Neo-Soul | 3.7M | 11.7x | 323K/pop69 | Planet E | Highest Spotify pop despite dormancy |
| 4 | Lucero | Alt-Country | 8.7M | 39.5x | 112K/pop41 | Liberty & Lament (own) | Highest stickiness, 9.1% concentration |
| 5 | Cowboy Junkies | Alt-Country | 7.7M | 15.3x | 234K/pop49 | Latent (own) | Largest catalog (346 tracks, 41yr) |
| 6 | Timber Timbre | Southern Gothic | 8.9M | 19.8x | 232K/pop46 | Arts & Crafts | High sync potential, FACTOR eligible |
| 7 | The Chameleons | Post-Punk | 12.2M | 24.6x | 186K/pop42 | Cherry Red / Metropolis | Genre revival tailwind, cult classic |
| 8 | Moonchild | Indie Soul | 3.1M | 13.7x | 291K/pop49 | Self / Tru Thoughts | Self-owned recent, new album Feb 2026 |
| 9 | Starflyer 59 | Shoegaze | 11.5M | 22.4x | 77K/pop47 | Velvet Blue / Tooth & Nail | Deepest shoegaze catalog (303 tracks) |
| 10 | 16 Horsepower | Gothic Americana | 9.1M | 32.9x | 80K/pop38 | Glitterhouse / Sargent House | Ended band = fixed catalog, no dilution |

### Due Diligence Flags
- **Dwele**: E1/eOne rights chain (eOne → Hasbro 2019 → Blackstone 2023). Verify who holds masters.
- **The Chameleons**: ISRC prefix USIR (Interscope/Universal). May have major-era masters.
- **16 Horsepower**: ISRC prefix USAM (A&M Records). Verify provenance.
- **Starflyer 59**: BEC/Capitol Christian copyright on some releases. Verify Velvet Blue vs corporate split.
- **Cowboy Junkies**: Pre-2000 catalog may have RCA/BMG-era rights. "Sweet Jane" is a Lou Reed cover (mechanicals owed).
- **Moonchild**: Split between Tru Thoughts (earlier) and self-released (recent). Mixed rights chain.

### Cleanest Targets for Immediate Outreach
1. **Still Corners** — own label (Wrecking Light), ℗/© both self-held
2. **Lucero** — own label (Liberty & Lament), ℗/© both self-held
3. **Cowboy Junkies** — own label (Latent), post-2000 catalog clean

## Alpha Ideas (from screening session)

Patterns discovered during the 369-candidate screening run. These could become automated screeners or new skills:

| # | Idea | Signal | Implementation |
|---|---|---|---|
| 1 | **Stickiness ratio screener** | Last.fm scrobbles/listeners ratio identifies catalog loyalty. Lucero 39.5x vs industry avg ~15x | Bulk `artist.getinfo` across genre pools, sort by ratio |
| 2 | **Scrobble-to-follower gap** | When Last.fm consumption >> Spotify followers (e.g. Starflyer 59: 11.5M/77K), catalog is undervalued by streaming-only analysts | Cross-platform divergence metric |
| 3 | **Dormant-but-streaming screener** | Dwele: no release since 2012, Spotify pop 69. Catalog discovering new listeners organically | Filter: last release 5+ yr ago AND Spotify pop > 50 |
| 4 | **ISRC prefix forensics** | ISRC registrant codes (USIR=Interscope, USAM=A&M) reveal historical major involvement even on currently-indie catalogs | Bulk parse `external_ids.isrc` from Spotify, flag major prefixes |
| 5 | **Copyright line parser** | Spotify `copyrights[]` field: when artist name appears in ℗/© holder, strong self-ownership signal | Automated screener across target list |
| 6 | **Genre revival arbitrage** | When a genre has modern breakout acts (Fontaines D.C. for post-punk), discovery flows to originals (The Chameleons) | Track genre momentum via Last.fm tag trends, acquire originals before wave |
| 7 | **Last.fm demographic correction** | Last.fm under-indexes hip-hop/R&B/Latin. Use Spotify as primary signal for those genres, Last.fm for rock/indie/electronic | Genre-aware weighting system across platforms |

## Second Screening Run — High-Revenue Tier (2026-04-01)

Screened for catalogs estimated at **$500K+/year revenue**, independent, 8+ year catalog age. Higher bar than first run.

**Funnel**: 443 candidates (10 revenue-dense genre verticals) → 20 top-tier by scrobbles → checked Spotify popularity/followers/label/copyright → Discogs label chain verification → MusicBrainz age confirmation → 5 final targets.

**Eliminated for major label**: Cults (IMPERIAL → Republic → Universal), The Magnetic Fields (Nonesuch → WEA → Warner).
**Eliminated gray area**: Beach House / Weyes Blood (Sub Pop, 30% Warner-owned).
**Eliminated age**: Caroline Polachek (solo catalog only 7yr; Chairlift was Columbia/Sony).

### 5 High-Revenue Acquisition Targets

| # | Artist | Genre | Est Revenue | Spotify | Pop | Scrobbles | YT Views | Age | Ownership |
|---|---|---|---|---|---|---|---|---|---|
| 1 | TV Girl | Indie Pop / Lo-Fi | $3-8M/yr | 14.1M foll | 82 | 289M | 843M | 16yr | Blissful Serenity Industries LLC (own) |
| 2 | Men I Trust | Dream Pop | $500K-1.5M/yr | 2.4M foll | 69 | 125M | 162M | 12yr | Fully self-released (℗/© "Independent") |
| 3 | Current Joys | Indie / Dream Pop | $500K-1.5M/yr | 1.9M foll | 69 | 66M | 90M | 13yr | Secretly Canadian (indie) |
| 4 | Sevdaliza | Art Pop / Trip-Hop | $500K-1.5M/yr | 964K foll | 68 | 31M | 975M | 11yr | Self-owned masters (℗ Sevdaliza) |
| 5 | FKJ | Nu Jazz / Electronic | $500K-1.5M/yr | 1.7M foll | 64 | 14.8M | 138M | 13yr | Secondtrack (own) + Mom+Pop (recent) |

### Due Diligence Flags (Run 2)
- **TV Girl**: At $3-8M/yr, acquisition price would be $20-50M at 10-15x. Verify no distribution equity deals.
- **Current Joys**: Secretly Canadian likely holds some rights. Clarify licensing vs ownership.
- **FKJ**: Mom+Pop distributed via Virgin Music (Universal). Verify masters ownership vs licensing. Earlier catalog (Secondtrack) is cleanly self-owned.
- **Sevdaliza**: "broke / Create Music Group" on © line. Clarify publishing split vs master ownership (℗ is clean).

### Revenue Estimation Methodology
- Spotify pop 80+ ≈ 15-30M monthly listeners ≈ $3-8M/yr (all platforms)
- Spotify pop 65-75 ≈ 3-7M monthly listeners ≈ $500K-1.5M/yr
- Assumes Spotify ≈ 60% of total streaming revenue
- $0.003-0.005/stream blended rate, does not include sync/merch/touring

### Cleanest Targets (Run 2)
1. **Men I Trust** — fully self-released, copyright literally reads "Independent", no label at all
2. **TV Girl** — own LLC (Blissful Serenity Industries), all ℗/© self-held
3. **Sevdaliza** — ℗ self-held, distributed via Create Music Group (indie)

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

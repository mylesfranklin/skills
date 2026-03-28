# Music Intelligence Skills — Handoff

## What This Is

A multi-API music catalog investment intelligence system built as Claude Code skills. Each skill wraps a different music data API, runs autonomously via `/skill-name <query>`, and produces a standardized scorecard. No infrastructure — skills call live APIs directly.

**Repo**: `mylesfranklin/skills` (GitHub)
**Architecture**: Skills-on-live-APIs. No databases, no Workers, no cron. The agent IS the product.

## Current State (2026-03-28)

### Skill 1: `/music-discover` (MusicBrainz)
- **Status**: Production-ready, fully tested
- **API**: MusicBrainz Web API (free, no auth, 1 req/sec rate limit)
- **SDK**: `musicbrainz-api` npm package at `/tmp/musicbrainz-api/`
- **Skill files**: `~/.claude/skills/music-discover/{SKILL.md, reference.md}`
- **Data**: 2.8M artists, 38M recordings, 333K labels, 5.4M releases
- **Capabilities**: Artist/label/release-group search, full catalog enumeration, streaming URL extraction, label history, collaborator graph, genre/tag analysis
- **Output**: Investment Scorecard (metrics table + bull/bear/verdict)
- **Tested on**: James Kaye, Longhaul Music Group, EMPIRE (2,289 releases mapped), Shaboozey (full deep dive)

### Skill 2: `/music-streams` (Spotify)
- **Status**: Production-ready, stripped to core metrics
- **API**: Spotify Web API via Client Credentials flow
- **SDK**: `@spotify/web-api-ts-sdk` at `~/spotify-api/`
- **Auth**: `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` in `~/.claude/settings.json` env
- **Skill files**: `~/.claude/skills/music-streams/{SKILL.md, references/api_reference.md}`
- **Capabilities**: Artist profile (followers, popularity, genres), top tracks (with ISRCs), full discography scan (paginated), album deep dive (label, copyrights, UPC)
- **NOT available** (Spotify Feb 2026 restrictions): Audio features, related artists, recommendations, batch endpoints. Popularity/followers fields are deprecated but still returning.
- **Output**: Streaming Intelligence Scorecard (metrics table + top tracks + bull/bear/verdict)
- **Tested on**: Daddex (17.5K followers, indie emo rap), Brent Faiyaz (8.47M followers, independent R&B)

### Cross-Skill Bridge
- **Join key**: Spotify URLs stored in MusicBrainz `url-rels` (type "free streaming") + ISRCs on both sides
- **Usage**: Run `/music-discover <artist>` to get MBID + Spotify URL, then `/music-streams <spotify-url>` for streaming data
- **No infra needed**: Agent holds both scorecards in context

### Blank Cloudflare Project
- **Location**: `~/Desktop/music-data/` — scaffolded Workers project (wrangler + TypeScript)
- **Status**: Empty shell. Decision was made to NOT build infrastructure — skills-on-live-APIs is the architecture
- **May be useful later**: If a public API, scheduled monitoring, or caching layer is needed

## Spotify API Restrictions (Feb 2026)

Critical context for any future Spotify work:
- **Development Mode**: Requires Premium account, max 5 test users, 1 Client ID per developer
- **Removed endpoints**: batch fetch (tracks/albums/artists), browse, top-tracks (officially), /users/{id}, /markets
- **Restricted endpoints**: audio-features, related-artists, recommendations → require Extended Quota Mode
- **Deprecated fields**: popularity, followers, label, available_markets (still returning but unreliable)
- **Restored**: `external_ids` (ISRC/UPC) was removed then restored in March 2026

## What's Next — Candidate Skills

From the Soundcharts "47 Music Data APIs" guide and our research:

| Skill Name | API | Data | Auth | Cost |
|---|---|---|---|---|
| `music-market` | Discogs | Collectible pricing, physical releases, label rosters | Free (token) | Free |
| `music-social` | Last.fm | Listening patterns, similar artists, tags, scrobble counts | Free (API key) | Free |
| `music-rights` | ASCAP/BMI/SESAC | Publishing ownership, songwriter credits | Web scraping | Free |
| `music-lyrics` | Genius | Lyrics, annotations, songwriter metadata | Free (token) | Free |
| `music-analytics` | Soundcharts/Chartmetric | Monthly listeners, chart positions, playlist adds | Paid | $$ |
| `music-live` | Bandsintown/Songkick | Tour dates, venue capacity, ticket data | Free | Free |

Free APIs first: Discogs, Last.fm, Genius are the obvious next three.

## MusicBrainz Database Stats

Full DB available as weekly PostgreSQL dumps (free, CC0 license):
- 2.8M artists, 4.2M release groups, 5.4M releases, 38.3M recordings, 333K labels
- Dump URL: `https://data.metabrainz.org/pub/musicbrainz/data/fullexport/`
- ~15-20GB compressed, ~150GB uncompressed
- Full schema designed: see `/tmp/skills/SCHEMA.md` (22 tables, 10 sample queries, storage estimates)

## Key Files

| File | Purpose |
|---|---|
| `~/.claude/skills/music-discover/SKILL.md` | MusicBrainz skill prompt |
| `~/.claude/skills/music-discover/reference.md` | MusicBrainz API snippets |
| `~/.claude/skills/music-streams/SKILL.md` | Spotify skill prompt |
| `~/.claude/skills/music-streams/references/api_reference.md` | Spotify API snippets |
| `/tmp/musicbrainz-api/` | MusicBrainz SDK (npm, cloned from mylesfranklin/musicbrainz-api) |
| `~/spotify-api/` | Spotify SDK (npm, @spotify/web-api-ts-sdk) |
| `~/.claude/settings.json` | Spotify credentials in env |
| `/tmp/skills/SCHEMA.md` | Full MusicBrainz database architecture (22 tables) |
| `/tmp/skills/README.md` | Skills repo README with install instructions |
| `~/Desktop/music-data/` | Empty Cloudflare Workers project (not in use) |

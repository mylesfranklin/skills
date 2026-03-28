# MusicBrainz Data Architecture

## Source Counts (live as of 2026-03-27)

| Entity | Records |
|---|---|
| Artists | 2,835,226 |
| Release Groups | 4,214,339 |
| Releases | 5,395,614 |
| Recordings | 38,321,902 |
| Labels | 332,796 |
| **Total** | **~51M entities + relationships** |

---

## Entity-Relationship Diagram

```
                                    ┌──────────────┐
                                    │    areas     │
                                    │──────────────│
                                    │ id           │
                                    │ name         │
                                    │ sort_name    │
                                    │ type         │
                                    │ iso_3166_1[] │
                                    └──────┬───────┘
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │ area_id                        │ area_id                        │ area_id
          ▼                                ▼                                ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│    artists      │              │     labels      │              │    releases     │
│─────────────────│              │─────────────────│              │─────────────────│
│ id (MBID)       │◄────────────►│ id (MBID)       │◄────────────►│ id (MBID)       │
│ name            │  artist_     │ name            │  label_      │ title           │
│ sort_name       │  label_rels  │ sort_name       │  info        │ date            │
│ type            │              │ type            │              │ country         │
│ gender          │              │ label_code      │              │ status          │
│ country         │              │ country         │              │ barcode         │
│ area_id         │              │ area_id         │              │ packaging       │
│ begin_area_id   │              │ begin           │              │ language        │
│ begin           │              │ end             │              │ script          │
│ end             │              │ ended           │              │ quality         │
│ ended           │              │ disambiguation  │              │ release_group_id│
│ disambiguation  │              │ annotation      │              │ disambiguation  │
│ annotation      │              └────────┬────────┘              │ asin            │
│ ipis[]          │                       │                       │ cover_art_front │
│ isnis[]         │                       │                       │ cover_art_back  │
│ rating_value    │              ┌────────┴────────┐              │ cover_art_count │
│ rating_votes    │              │  label_aliases  │              └────────┬────────┘
└────────┬────────┘              │─────────────────│                       │
         │                       │ label_id        │                       │
         │                       │ name            │              ┌────────┴────────┐
┌────────┴────────┐              │ sort_name       │              │     media       │
│ artist_aliases  │              │ locale          │              │─────────────────│
│─────────────────│              │ type            │              │ id              │
│ artist_id       │              │ primary         │              │ release_id      │
│ name            │              │ begin           │              │ position        │
│ sort_name       │              │ end             │              │ format          │
│ locale          │              └─────────────────┘              │ track_count     │
│ type            │                                               │ title           │
│ primary         │                                               └────────┬────────┘
│ begin           │                                                        │
│ end             │                                               ┌────────┴────────┐
└─────────────────┘                                               │     tracks      │
                                                                  │─────────────────│
         ┌────────────────────────────────────────────────────────►│ id              │
         │ artist_credit                                          │ media_id        │
         │                                                        │ position        │
┌────────┴────────┐              ┌─────────────────┐              │ number          │
│ release_groups  │              │   recordings    │◄─────────────│ recording_id    │
│─────────────────│              │─────────────────│  recording_  │ title           │
│ id (MBID)       │              │ id (MBID)       │  id          │ length_ms       │
│ title           │              │ title           │              │ artist_credit_id│
│ primary_type    │              │ length_ms       │              └─────────────────┘
│ secondary_types │              │ video           │
│ first_release   │              │ first_release   │
│ artist_credit_id│              │ disambiguation  │
│ rating_value    │              │ artist_credit_id│
│ rating_votes    │              │ isrcs[]         │
│ disambiguation  │              │ rating_value    │
└─────────────────┘              │ rating_votes    │
                                 └─────────────────┘
```

---

## Core Tables (6)

### `artists` — 2.8M rows
| Column | Type | Source |
|---|---|---|
| `id` | STRING (MBID) | PK |
| `name` | STRING | |
| `sort_name` | STRING | |
| `type` | STRING | Person, Group, Orchestra, Choir, Character, Other |
| `gender` | STRING | Male, Female, Other, null |
| `country` | STRING | ISO 3166-1 |
| `area_id` | STRING (MBID) | FK → areas |
| `begin_area_id` | STRING (MBID) | FK → areas |
| `end_area_id` | STRING (MBID) | FK → areas |
| `begin_date` | STRING | YYYY or YYYY-MM or YYYY-MM-DD |
| `end_date` | STRING | |
| `ended` | BOOL | |
| `disambiguation` | STRING | |
| `annotation` | STRING | |
| `ipis` | ARRAY<STRING> | Interested Parties Information codes |
| `isnis` | ARRAY<STRING> | International Standard Name Identifiers |
| `rating_value` | FLOAT | 0-5 scale |
| `rating_votes` | INT | |

### `labels` — 333K rows
| Column | Type | Source |
|---|---|---|
| `id` | STRING (MBID) | PK |
| `name` | STRING | |
| `sort_name` | STRING | |
| `type` | STRING | Distributor, Holding, Production, Original Production, Bootleg Production, Reissue Production, Publisher, Imprint |
| `label_code` | INT | LC-XXXX code |
| `country` | STRING | |
| `area_id` | STRING (MBID) | FK → areas |
| `begin_date` | STRING | |
| `end_date` | STRING | |
| `ended` | BOOL | |
| `disambiguation` | STRING | |
| `annotation` | STRING | |
| `ipis` | ARRAY<STRING> | |
| `isnis` | ARRAY<STRING> | |
| `rating_value` | FLOAT | |
| `rating_votes` | INT | |

### `release_groups` — 4.2M rows
| Column | Type | Source |
|---|---|---|
| `id` | STRING (MBID) | PK |
| `title` | STRING | |
| `primary_type` | STRING | Album, Single, EP, Broadcast, Other |
| `secondary_types` | ARRAY<STRING> | Compilation, Soundtrack, Spokenword, Interview, Audiobook, Audio drama, Live, Remix, DJ-mix, Mixtape/Street |
| `first_release_date` | STRING | |
| `disambiguation` | STRING | |
| `rating_value` | FLOAT | |
| `rating_votes` | INT | |

### `releases` — 5.4M rows
| Column | Type | Source |
|---|---|---|
| `id` | STRING (MBID) | PK |
| `title` | STRING | |
| `release_group_id` | STRING (MBID) | FK → release_groups |
| `date` | STRING | |
| `country` | STRING | |
| `status` | STRING | Official, Promotion, Bootleg, Pseudo-Release, Withdrawn, Cancelled |
| `barcode` | STRING | UPC/EAN |
| `packaging` | STRING | Jewel Case, Digipak, None, etc. |
| `language` | STRING | ISO 639-3 |
| `script` | STRING | ISO 15924 |
| `quality` | STRING | normal, high |
| `asin` | STRING | Amazon ASIN |
| `disambiguation` | STRING | |
| `cover_art_front` | BOOL | |
| `cover_art_back` | BOOL | |
| `cover_art_count` | INT | |

### `recordings` — 38.3M rows
| Column | Type | Source |
|---|---|---|
| `id` | STRING (MBID) | PK |
| `title` | STRING | |
| `length_ms` | INT | Duration in milliseconds |
| `video` | BOOL | Is this a video recording |
| `first_release_date` | STRING | |
| `disambiguation` | STRING | |
| `rating_value` | FLOAT | |
| `rating_votes` | INT | |

### `areas` — ~100K rows
| Column | Type | Source |
|---|---|---|
| `id` | STRING (MBID) | PK |
| `name` | STRING | |
| `sort_name` | STRING | |
| `type` | STRING | Country, Subdivision, City, etc. |
| `iso_3166_1` | ARRAY<STRING> | Country codes |

---

## Junction / Bridge Tables (12)

### `artist_credits` — Links artists to release_groups, releases, recordings, tracks
| Column | Type |
|---|---|
| `id` | STRING | PK (auto) |
| `entity_type` | STRING | "release_group", "release", "recording", "track" |
| `entity_id` | STRING (MBID) | FK to parent entity |
| `artist_id` | STRING (MBID) | FK → artists |
| `name` | STRING | Credited name (may differ from artist.name) |
| `join_phrase` | STRING | " feat. ", " & ", " x ", etc. |
| `position` | INT | Order in credit |

### `tags` — Community-applied tags (denormalized per entity)
| Column | Type |
|---|---|
| `entity_type` | STRING | "artist", "release_group", "release", "recording", "label" |
| `entity_id` | STRING (MBID) | |
| `tag` | STRING | |
| `vote_count` | INT | Community vote strength |

### `genres` — Curated genre assignments
| Column | Type |
|---|---|
| `entity_type` | STRING | |
| `entity_id` | STRING (MBID) | |
| `genre_id` | STRING (MBID) | |
| `genre_name` | STRING | |
| `vote_count` | INT | |

### `aliases`
| Column | Type |
|---|---|
| `entity_type` | STRING | "artist", "label", "release_group", "release", "recording" |
| `entity_id` | STRING (MBID) | |
| `name` | STRING | |
| `sort_name` | STRING | |
| `locale` | STRING | Language/region |
| `type` | STRING | Artist name, Legal name, Search hint |
| `primary` | BOOL | |
| `begin_date` | STRING | |
| `end_date` | STRING | |

### `isrcs` — International Standard Recording Codes
| Column | Type |
|---|---|
| `recording_id` | STRING (MBID) | FK → recordings |
| `isrc` | STRING | 12-char ISRC code |

### `media`
| Column | Type |
|---|---|
| `id` | STRING | PK |
| `release_id` | STRING (MBID) | FK → releases |
| `position` | INT | Disc number |
| `format` | STRING | CD, Digital Media, Vinyl, Cassette, etc. |
| `title` | STRING | Disc title (if any) |
| `track_count` | INT | |

### `tracks`
| Column | Type |
|---|---|
| `id` | STRING (MBID) | PK |
| `media_id` | STRING | FK → media |
| `recording_id` | STRING (MBID) | FK → recordings |
| `position` | INT | Track number |
| `number` | STRING | Display number ("A1", "1", etc.) |
| `title` | STRING | Track title (may differ from recording) |
| `length_ms` | INT | |

### `release_events`
| Column | Type |
|---|---|
| `release_id` | STRING (MBID) | FK → releases |
| `date` | STRING | |
| `area_id` | STRING (MBID) | FK → areas |

### `label_info` — Which labels released what
| Column | Type |
|---|---|
| `release_id` | STRING (MBID) | FK → releases |
| `label_id` | STRING (MBID) | FK → labels |
| `catalog_number` | STRING | |

### `urls` — External platform links
| Column | Type |
|---|---|
| `id` | STRING (MBID) | PK |
| `url` | STRING | Full URL |
| `entity_type` | STRING | "artist", "label", "release", "recording", "release_group" |
| `entity_id` | STRING (MBID) | |
| `link_type` | STRING | See URL Link Types below |

**URL Link Types** (25 types):
`allmusic`, `bandcamp`, `bandsintown`, `BBC Music page`, `discogs`, `free streaming`, `IMDb`, `image`, `last.fm`, `lyrics`, `myspace`, `official homepage`, `other databases`, `purchase for download`, `purevolume`, `secondhandsongs`, `setlistfm`, `social network`, `songkick`, `soundcloud`, `streaming`, `ticketing`, `VIAF`, `wikidata`, `youtube`, `youtube music`

### `relations` — The relationship graph (biggest table)
| Column | Type |
|---|---|
| `source_type` | STRING | "artist", "label", "recording", "release", "release_group" |
| `source_id` | STRING (MBID) | |
| `target_type` | STRING | "artist", "label", "recording", "release", "release_group", "url", "work", "event", "place" |
| `target_id` | STRING (MBID) | |
| `relation_type` | STRING | See Relation Types below |
| `direction` | STRING | "forward", "backward" |
| `begin_date` | STRING | |
| `end_date` | STRING | |
| `ended` | BOOL | |
| `attributes` | ARRAY<STRING> | Additional qualifiers |
| `source_credit` | STRING | |
| `target_credit` | STRING | |

**Relation Types by Target** (48 types):

| Target | Types |
|---|---|
| **artist→artist** | member of band, is person, founder, collaboration, named after artist, voice actor, instrumental supporting musician, vocal supporting musician, teacher, sibling, parent, married, involved with |
| **artist→label** | label founder, recording contract, personal publisher, producer position at, artists and repertoire position at |
| **artist→recording** | performer, vocal, instrument, producer, arranger, mix, recording, programming, conductor, chorus master, concertmaster, audio director, video appearance, vocal arranger |
| **artist→release** | producer, mix-DJ, liner notes, misc, compiler, art direction, design/illustration, photography |
| **artist→release_group** | tribute |
| **artist→work** | composer, lyricist, writer, arranger, orchestrator, librettist, translator, revised by |
| **artist→event** | main performer, support act, host, guest performer |
| **artist→place** | owner |
| **artist→url** | (25 URL link types above) |
| **label→label** | label ownership, label rename, business association |
| **label→url** | (subset of URL link types) |

### `works` — Compositions (songs as written works)
| Column | Type |
|---|---|
| `id` | STRING (MBID) | PK |
| `title` | STRING | |
| `type` | STRING | Song, Aria, Opera, Concerto, etc. |
| `language` | STRING | ISO 639-3 |
| `iswcs` | ARRAY<STRING> | International Standard Musical Work Codes |
| `disambiguation` | STRING | |

---

## AI Enrichment Tables (Gemini)

### `ai_artist_profiles` — Gemini-generated artist intelligence
| Column | Type | Source |
|---|---|---|
| `artist_id` | STRING (MBID) | FK → artists |
| `summary` | STRING | 2-3 sentence artist bio |
| `career_narrative` | STRING | Career arc analysis |
| `genre_description` | STRING | Natural language genre positioning |
| `cultural_significance` | FLOAT | 0-1 score |
| `commercial_potential` | FLOAT | 0-1 score |
| `catalog_sentiment` | STRING | "growing", "stable", "declining", "dormant" |
| `comparable_artists` | ARRAY<STRING> | Similar artist MBIDs |
| `investment_thesis` | STRING | 2-3 sentence bull/bear |
| `model_version` | STRING | Gemini model used |
| `generated_at` | TIMESTAMP | |

### `ai_recording_analysis` — Per-track enrichment
| Column | Type | Source |
|---|---|---|
| `recording_id` | STRING (MBID) | FK → recordings |
| `mood_tags` | ARRAY<STRING> | ["melancholic", "uplifting", "aggressive"] |
| `energy_score` | FLOAT | 0-1 |
| `playlist_fit` | ARRAY<STRING> | ["study", "workout", "chill", "party"] |
| `sync_potential` | FLOAT | 0-1 (film/TV/ad licensing) |
| `lyric_themes` | ARRAY<STRING> | ["love", "protest", "party"] |
| `era_classification` | STRING | Decade/movement |
| `model_version` | STRING | |
| `generated_at` | TIMESTAMP | |

### `ai_catalog_valuations` — Portfolio-level analysis
| Column | Type | Source |
|---|---|---|
| `entity_type` | STRING | "artist" or "label" |
| `entity_id` | STRING (MBID) | |
| `total_recordings` | INT | From browse count |
| `total_release_groups` | INT | |
| `catalog_depth_score` | FLOAT | 0-1 |
| `streaming_coverage` | FLOAT | 0-1 (% of platforms present) |
| `genre_diversity` | FLOAT | 0-1 (Shannon entropy of genres) |
| `collaboration_density` | FLOAT | 0-1 (artist-rels / recordings) |
| `geographic_reach` | FLOAT | 0-1 (unique release countries) |
| `longevity_score` | FLOAT | 0-1 (career span vs output consistency) |
| `estimated_annual_streams` | INT | Gemini estimate from signals |
| `estimated_catalog_value_usd` | FLOAT | |
| `confidence` | FLOAT | 0-1 |
| `bull_case` | STRING | |
| `bear_case` | STRING | |
| `verdict` | STRING | |
| `model_version` | STRING | |
| `generated_at` | TIMESTAMP | |

### `ai_genre_trends` — Market-level genre intelligence
| Column | Type | Source |
|---|---|---|
| `genre_name` | STRING | |
| `trend_direction` | STRING | "rising", "stable", "declining" |
| `growth_rate` | FLOAT | YoY streaming growth estimate |
| `playlist_penetration` | FLOAT | 0-1 |
| `sync_demand` | FLOAT | 0-1 |
| `geographic_hotspots` | ARRAY<STRING> | Country codes |
| `adjacent_genres` | ARRAY<STRING> | Crossover opportunities |
| `analysis` | STRING | Gemini narrative |
| `model_version` | STRING | |
| `generated_at` | TIMESTAMP | |

---

## Key Joins & Query Patterns

```sql
-- 1. Artist → Full catalog with labels
SELECT a.name, rg.title, rg.primary_type, rg.first_release_date,
       li.label_id, l.name as label_name
FROM artists a
JOIN artist_credits ac ON ac.artist_id = a.id AND ac.entity_type = 'release_group'
JOIN release_groups rg ON rg.id = ac.entity_id
JOIN releases r ON r.release_group_id = rg.id
JOIN label_info li ON li.release_id = r.id
JOIN labels l ON l.id = li.label_id
WHERE a.id = '<MBID>'

-- 2. Label → All artists signed (via recording contracts)
SELECT DISTINCT a.name, a.id, rel.begin_date, rel.end_date
FROM labels l
JOIN relations rel ON rel.target_id = l.id
  AND rel.relation_type = 'recording contract'
  AND rel.source_type = 'artist'
JOIN artists a ON a.id = rel.source_id
WHERE l.id = '<MBID>'

-- 3. Label → All artists via releases (broader than contracts)
SELECT DISTINCT a.name, a.id, COUNT(DISTINCT r.id) as release_count
FROM labels l
JOIN label_info li ON li.label_id = l.id
JOIN releases r ON r.id = li.release_id
JOIN artist_credits ac ON ac.entity_id = r.id AND ac.entity_type = 'release'
JOIN artists a ON a.id = ac.artist_id
WHERE l.id = '<MBID>'
GROUP BY a.name, a.id
ORDER BY release_count DESC

-- 4. Artist collaboration graph
SELECT a1.name as artist, a2.name as collaborator,
       rel.relation_type, COUNT(*) as collab_count
FROM artists a1
JOIN relations rel ON rel.source_id = a1.id
  AND rel.source_type = 'artist'
  AND rel.target_type = 'artist'
JOIN artists a2 ON a2.id = rel.target_id
WHERE a1.id = '<MBID>'
GROUP BY a1.name, a2.name, rel.relation_type

-- 5. Streaming platform coverage per artist
SELECT a.name,
  COUNTIF(u.link_type = 'free streaming' AND u.url LIKE '%spotify%') > 0 as spotify,
  COUNTIF(u.link_type IN ('streaming','purchase for download') AND u.url LIKE '%apple%') > 0 as apple,
  COUNTIF(u.link_type = 'free streaming' AND u.url LIKE '%deezer%') > 0 as deezer,
  COUNTIF(u.link_type = 'youtube' OR u.link_type = 'youtube music') > 0 as youtube,
  COUNTIF(u.link_type = 'soundcloud') > 0 as soundcloud,
  COUNTIF(u.link_type = 'bandcamp') > 0 as bandcamp
FROM artists a
JOIN urls u ON u.entity_id = a.id AND u.entity_type = 'artist'
GROUP BY a.name

-- 6. Hidden gem screener (catalog depth x streaming x age)
SELECT a.name, a.country, a.begin_date,
       cv.total_recordings, cv.total_release_groups,
       cv.streaming_coverage, cv.catalog_depth_score,
       cv.estimated_catalog_value_usd,
       cv.verdict
FROM artists a
JOIN ai_catalog_valuations cv ON cv.entity_id = a.id
WHERE cv.total_recordings > 100
  AND cv.streaming_coverage > 0.5
  AND DATE_DIFF(CURRENT_DATE(), PARSE_DATE('%Y', LEFT(a.begin_date, 4)), YEAR) >= 8
  AND cv.estimated_catalog_value_usd > 500000
ORDER BY cv.estimated_catalog_value_usd DESC

-- 7. Genre market analysis
SELECT g.genre_name, COUNT(DISTINCT g.entity_id) as artist_count,
       gt.trend_direction, gt.growth_rate,
       AVG(cv.estimated_catalog_value_usd) as avg_catalog_value
FROM genres g
JOIN ai_genre_trends gt ON gt.genre_name = g.genre_name
LEFT JOIN ai_catalog_valuations cv ON cv.entity_id = g.entity_id
WHERE g.entity_type = 'artist'
GROUP BY g.genre_name, gt.trend_direction, gt.growth_rate
ORDER BY gt.growth_rate DESC

-- 8. ISRC → Recording → Artist → Label chain (rights tracing)
SELECT i.isrc, rec.title as recording, a.name as artist,
       l.name as label, li.catalog_number,
       r.date as release_date, r.country
FROM isrcs i
JOIN recordings rec ON rec.id = i.recording_id
JOIN artist_credits ac ON ac.entity_id = rec.id AND ac.entity_type = 'recording'
JOIN artists a ON a.id = ac.artist_id
JOIN tracks t ON t.recording_id = rec.id
JOIN media m ON m.id = t.media_id
JOIN releases r ON r.id = m.release_id
JOIN label_info li ON li.release_id = r.id
JOIN labels l ON l.id = li.label_id
WHERE i.isrc = '<ISRC>'

-- 9. Songwriter/publisher lookup (work-level)
SELECT w.title as work, w.iswcs,
       a_writer.name as writer, rel_w.relation_type as role,
       a_pub.name as publisher
FROM works w
JOIN relations rel_w ON rel_w.target_id = w.id
  AND rel_w.target_type = 'work'
  AND rel_w.relation_type IN ('composer', 'lyricist', 'writer')
JOIN artists a_writer ON a_writer.id = rel_w.source_id
LEFT JOIN relations rel_pub ON rel_pub.source_id = a_writer.id
  AND rel_pub.relation_type = 'personal publisher'
LEFT JOIN labels a_pub ON a_pub.id = rel_pub.target_id
WHERE w.id = '<MBID>'

-- 10. Full investment scorecard materialized view
SELECT
  a.id, a.name, a.country, a.type, a.begin_date, a.ended,
  -- Catalog metrics
  cv.total_recordings, cv.total_release_groups,
  cv.catalog_depth_score, cv.longevity_score,
  -- Streaming
  cv.streaming_coverage,
  -- AI enrichment
  ap.career_narrative, ap.cultural_significance,
  ap.commercial_potential, ap.catalog_sentiment,
  cv.estimated_annual_streams, cv.estimated_catalog_value_usd,
  cv.bull_case, cv.bear_case, cv.verdict,
  -- Genre context
  ARRAY_AGG(DISTINCT g.genre_name) as genres,
  ARRAY_AGG(DISTINCT gt.trend_direction) as genre_trends
FROM artists a
JOIN ai_catalog_valuations cv ON cv.entity_id = a.id
JOIN ai_artist_profiles ap ON ap.artist_id = a.id
LEFT JOIN genres g ON g.entity_id = a.id AND g.entity_type = 'artist'
LEFT JOIN ai_genre_trends gt ON gt.genre_name = g.genre_name
GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19
ORDER BY cv.estimated_catalog_value_usd DESC
```

---

## Storage Estimates (BigQuery)

| Table | Rows | Est. Size |
|---|---|---|
| artists | 2.8M | ~2 GB |
| labels | 333K | ~200 MB |
| release_groups | 4.2M | ~2 GB |
| releases | 5.4M | ~3 GB |
| recordings | 38.3M | ~15 GB |
| areas | 100K | ~50 MB |
| artist_credits | ~150M | ~30 GB |
| tags | ~50M | ~8 GB |
| genres | ~20M | ~4 GB |
| aliases | ~5M | ~2 GB |
| isrcs | ~30M | ~5 GB |
| media | ~8M | ~2 GB |
| tracks | ~50M | ~12 GB |
| release_events | ~8M | ~2 GB |
| label_info | ~6M | ~1 GB |
| urls | ~10M | ~4 GB |
| relations | ~100M | ~25 GB |
| works | ~30M | ~8 GB |
| **Subtotal (MB data)** | | **~120 GB** |
| ai_artist_profiles | 2.8M | ~5 GB |
| ai_recording_analysis | 38.3M | ~30 GB |
| ai_catalog_valuations | 3.1M | ~2 GB |
| ai_genre_trends | ~2K | ~1 MB |
| **Subtotal (AI)** | | **~37 GB** |
| **TOTAL** | | **~157 GB** |

### BQ Cost Estimate (gen-lang-client-0814665573)
- **Storage**: ~157 GB × $0.02/GB/mo = **~$3.14/mo**
- **Queries**: On-demand pricing, $6.25/TB scanned
- **Gemini enrichment**: 2.8M artist profiles + 38M recording analyses
  - Flash: ~$0.075/1M tokens × ~500 tokens/entity = **~$1,500 one-time** (artists only)
  - Full 38M recordings: **~$15,000 one-time** (do selectively — top 1M recordings = ~$400)

---

## Recommended Build Order

| Phase | What | Effort |
|---|---|---|
| 1 | Download MB dump → load 6 core tables into BQ | 1 day |
| 2 | Parse + load 12 junction tables | 1 day |
| 3 | Gemini enrichment: `ai_artist_profiles` for top 100K artists | 2-3 hours |
| 4 | Gemini enrichment: `ai_catalog_valuations` for artists with 50+ recordings | 1-2 hours |
| 5 | Gemini enrichment: `ai_genre_trends` (~2K genres) | 10 min |
| 6 | Gemini enrichment: `ai_recording_analysis` for top 1M recordings | 4-6 hours |
| 7 | Weekly incremental sync via MB replication packs | Cron job |
| 8 | Materialized views for investment screener | 30 min |

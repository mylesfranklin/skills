# MusicBrainz API Reference — Music Discovery Skill

Copy-paste these blocks. Run from `/home/user/musicbrainz-api` via `npx tsx -e '(async () => { ...code... })();'`.

## Init (prefix every script)

```typescript
const { MusicBrainzApi } = await import('./lib/entry-node.js');
const mb = new MusicBrainzApi({ appName: 'music-discover', appVersion: '1.0.0', appContactInfo: 'catalog-research' });
```

## Search

```typescript
// Artist search
const r = await mb.search('artist', { query: 'QUERY_HERE' });
console.log(JSON.stringify(r.artists.map(a => ({ id: a.id, name: a.name, score: a.score, country: a.country, type: a.type, disambiguation: a.disambiguation })), null, 2));

// Label search
const r = await mb.search('label', { query: 'QUERY_HERE' });
console.log(JSON.stringify(r.labels.map(l => ({ id: l.id, name: l.name, score: l.score, country: l.country, type: l.type })), null, 2));

// Release-group search
const r = await mb.search('release-group', { query: 'QUERY_HERE' });
console.log(JSON.stringify(r['release-groups'].map(rg => ({ id: rg.id, title: rg.title, score: rg.score, type: rg['primary-type'] })), null, 2));

// Recording search
const r = await mb.search('recording', { query: { recording: 'TITLE', artist: 'ARTIST' } });
console.log(JSON.stringify(r.recordings.map(rec => ({ id: rec.id, title: rec.title, score: rec.score, artist: rec['artist-credit']?.[0]?.name })), null, 2));
```

**Lucene field names** — artist: `name, country, area, tag, type, gender, begin, end` | release: `arid, artist, label, barcode, date, status, type` | recording: `artist, rid, isrc, tnum` | label: `name, country, code, type, tag`

## Lookup (with investment-grade includes)

```typescript
// Artist — max includes
const a = await mb.lookup('artist', 'MBID', ['tags', 'genres', 'ratings', 'url-rels', 'artist-rels', 'label-rels', 'release-groups']);
console.log(JSON.stringify(a, null, 2));

// Label — max includes
const l = await mb.lookup('label', 'MBID', ['tags', 'genres', 'ratings', 'url-rels', 'artist-rels', 'releases']);
console.log(JSON.stringify(l, null, 2));

// Release — label + distribution info
const rel = await mb.lookup('release', 'MBID', ['labels', 'url-rels', 'media', 'artist-credits', 'recordings', 'release-groups']);
console.log(JSON.stringify(rel, null, 2));

// Release-group — overview
const rg = await mb.lookup('release-group', 'MBID', ['tags', 'genres', 'ratings', 'url-rels', 'artists', 'releases']);
console.log(JSON.stringify(rg, null, 2));

// Recording — with ISRCs
const rec = await mb.lookup('recording', 'MBID', ['tags', 'genres', 'ratings', 'url-rels', 'artist-credits', 'isrcs', 'releases']);
console.log(JSON.stringify(rec, null, 2));
```

**All valid includes by entity:**
- **artist**: aliases, annotation, tags, genres, ratings, recordings, releases, release-groups, works, area-rels, artist-rels, event-rels, label-rels, place-rels, recording-rels, release-rels, release-group-rels, url-rels, work-rels
- **label**: aliases, annotation, tags, genres, ratings, releases, area-rels, artist-rels, event-rels, label-rels, url-rels, work-rels
- **release**: aliases, tags, genres, ratings, media, artists, collections, labels, recordings, release-groups, artist-credits, isrcs, discids, area-rels, artist-rels, label-rels, recording-rels, release-rels, url-rels, recording-level-rels
- **release-group**: aliases, tags, genres, ratings, artists, releases, artist-credits, area-rels, artist-rels, label-rels, url-rels
- **recording**: aliases, tags, genres, ratings, artists, releases, isrcs, artist-credits, area-rels, artist-rels, label-rels, url-rels, work-rels
- **url**: artist-rels, release-rels, label-rels, event-rels, area-rels, recording-rels, release-group-rels

## Browse (catalog enumeration)

```typescript
// All release-groups by artist (paginated)
let offset = 0; const all = [];
while (true) {
  const r = await mb.browse('release-group', { artist: 'MBID', limit: 100, offset });
  all.push(...r['release-groups']);
  if (offset + 100 >= r['release-group-count']) break;
  offset += 100;
}
console.log(JSON.stringify({ total: all.length, byType: Object.groupBy(all, rg => rg['primary-type'] || 'Other') }, null, 2));

// All releases by label (paginated)
let offset = 0; const all = [];
while (true) {
  const r = await mb.browse('release', { label: 'MBID', limit: 100, offset });
  all.push(...r.releases);
  if (offset + 100 >= r['release-count']) break;
  offset += 100;
}
console.log(JSON.stringify({ total: all.length, titles: all.map(r => r.title) }, null, 2));

// Releases by artist with type/status filter
const r = await mb.browse('release', { artist: 'MBID', limit: 100, type: ['album'], status: ['official'] });
console.log(JSON.stringify(r, null, 2));
```

**Browse query params:** release `{artist, label, recording, release-group, track_artist}` | release-group `{artist}` | recording `{artist, release}` | artist `{area, recording, release, release-group, work}`

## URL Reverse Lookup

```typescript
// Resolve streaming URL to MusicBrainz entity
const u = await mb.lookupUrl('https://open.spotify.com/artist/...', ['artist-rels', 'release-rels', 'label-rels']);
console.log(JSON.stringify(u, null, 2));
```

## Key Entity Fields (what to extract)

| Entity | Investment Fields |
|---|---|
| **Artist** | `name, country, type, gender, area, life-span.begin/end/ended, genres[].name, tags[].name, rating.value/votes-count, relations[]` |
| **Release-Group** | `title, primary-type, secondary-types[], first-release-date` |
| **Release** | `title, status, date, country, barcode, label-info[].label.name, media[].track-count, cover-art-archive.front` |
| **Label** | `name, country, type, life-span, label-code, releases[]` |
| **Relation** | `type, direction, url.resource (for url-rels), artist.name/id (for artist-rels), label.name/id (for label-rels)` |
| **Recording** | `title, length, first-release-date, isrcs[], video` |

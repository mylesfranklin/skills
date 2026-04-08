# Last.fm API Reference — Music Social Skill

Copy-paste these blocks. Run from `/tmp/lastfm-api` via `cd /tmp/lastfm-api && npx tsx -e '(async () => { ...code... })();'`.

## Init (prefix every script)

```typescript
const API_KEY = process.env.LASTFM_API_KEY!;
const BASE = 'http://ws.audioscrobbler.com/2.0/';

async function lfm<T = any>(method: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  qs.set('method', method);
  qs.set('api_key', API_KEY);
  qs.set('format', 'json');
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Last.fm API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}
```

## Search

```typescript
// Artist search
const r = await lfm('artist.search', { artist: 'QUERY_HERE', limit: 10 });
console.log(JSON.stringify(r.results.artistmatches.artist.map((a: any) => ({
  name: a.name, listeners: Number(a.listeners), mbid: a.mbid, url: a.url
})), null, 2));
```

## Artist Info

```typescript
// By name
const r = await lfm('artist.getinfo', { artist: 'ARTIST_NAME', autocorrect: 1 });
const a = r.artist;
console.log(JSON.stringify({
  name: a.name, mbid: a.mbid, url: a.url,
  playcount: Number(a.stats.playcount), listeners: Number(a.stats.listeners),
  tags: a.tags.tag.map((t: any) => t.name),
  bio: a.bio?.summary?.replace(/<[^>]+>/g, '').trim().split('.')[0] + '.',
  similar: a.similar.artist.map((s: any) => ({ name: s.name, url: s.url })),
  ontour: a.ontour
}, null, 2));

// By MBID
const r = await lfm('artist.getinfo', { mbid: 'MBID_HERE' });
```

## Top Tracks (paginated)

```typescript
const allTracks: any[] = [];
for (let page = 1; page <= 2; page++) {
  const r = await lfm('artist.gettoptracks', { artist: 'ARTIST_NAME', limit: 50, page });
  const tracks = r.toptracks.track;
  if (!tracks.length) break;
  allTracks.push(...tracks.map((t: any) => ({
    name: t.name, playcount: Number(t.playcount), listeners: Number(t.listeners),
    mbid: t.mbid, rank: Number(t['@attr'].rank)
  })));
}
console.log(JSON.stringify(allTracks, null, 2));
```

## Top Albums

```typescript
const r = await lfm('artist.gettopalbums', { artist: 'ARTIST_NAME', limit: 50 });
const albums = r.topalbums.album.map((a: any) => ({
  name: a.name, playcount: Number(a.playcount), mbid: a.mbid, url: a.url
})).filter((a: any) => a.playcount > 0);
console.log(JSON.stringify(albums, null, 2));
```

## Similar Artists

```typescript
const r = await lfm('artist.getsimilar', { artist: 'ARTIST_NAME', limit: 10 });
console.log(JSON.stringify(r.similarartists.artist.map((a: any) => ({
  name: a.name, match: Number(a.match), url: a.url, mbid: a.mbid
})), null, 2));
```

## URL Parser

```typescript
function parseLastfmUrl(url: string): { type: string; name: string } | null {
  const m = url.match(/last\.fm\/music\/([^\/]+)/);
  return m ? { type: 'artist', name: decodeURIComponent(m[1].replace(/\+/g, ' ')) } : null;
}
```

## Full Pipeline (Parallel)

Use this after obtaining `artistName` for a complete investigation:

```typescript
// Parallel fetch: info + top tracks + top albums
const [infoRes, tracksRes, albumsRes] = await Promise.all([
  lfm('artist.getinfo', { artist: artistName, autocorrect: 1 }),
  lfm('artist.gettoptracks', { artist: artistName, limit: 50, page: 1 }),
  lfm('artist.gettopalbums', { artist: artistName, limit: 50 })
]);

const artist = infoRes.artist;
const topTracks = tracksRes.toptracks.track.map((t: any) => ({
  name: t.name, playcount: Number(t.playcount), listeners: Number(t.listeners), rank: Number(t['@attr'].rank)
}));
const topAlbums = albumsRes.topalbums.album.map((a: any) => ({
  name: a.name, playcount: Number(a.playcount)
})).filter((a: any) => a.playcount > 0);

// Page 2 of tracks if needed
if (topTracks.length === 50) {
  const p2 = await lfm('artist.gettoptracks', { artist: artistName, limit: 50, page: 2 });
  topTracks.push(...p2.toptracks.track.map((t: any) => ({
    name: t.name, playcount: Number(t.playcount), listeners: Number(t.listeners), rank: Number(t['@attr'].rank)
  })));
}

// Comp set
const similarRes = await lfm('artist.getsimilar', { artist: artistName, limit: 10 });
const similar = similarRes.similarartists.artist.map((a: any) => ({
  name: a.name, match: Number(a.match)
}));

// Compute investment metrics
const totalScrobbles = Number(artist.stats.playcount);
const listeners = Number(artist.stats.listeners);
const ratio = listeners > 0 ? (totalScrobbles / listeners).toFixed(1) : '0';
const top5Plays = topTracks.slice(0, 5).reduce((s: number, t: any) => s + t.playcount, 0);
const top5Pct = totalScrobbles > 0 ? (top5Plays / totalScrobbles * 100).toFixed(1) : '0';

console.log(JSON.stringify({
  artist: { name: artist.name, mbid: artist.mbid, url: artist.url,
    playcount: totalScrobbles, listeners, ratio,
    tags: artist.tags.tag.map((t: any) => t.name),
    bio: artist.bio?.summary?.replace(/<[^>]+>/g, '').trim().split('.')[0] + '.',
    ontour: artist.ontour },
  topTracks, topAlbums, similar,
  metrics: { top5Concentration: top5Pct + '%', albumsWithPlays: topAlbums.length }
}, null, 2));
```

## Key Entity Fields (what to extract)

| Entity | Intelligence Fields |
|---|---|
| **Artist** | `name, mbid, url, stats.playcount, stats.listeners, tags.tag[].name, bio.summary, similar.artist[], ontour` |
| **Track** | `name, playcount, listeners, @attr.rank, mbid, url` |
| **Album** | `name, playcount, mbid, url` |
| **Similar** | `name, match (0-1 float), url, mbid` |

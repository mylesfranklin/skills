# Spotify Web API Reference — Music Streams Skill

Copy-paste these blocks. Run from `~/spotify-api` via `cd ~/spotify-api && npx tsx -e '(async () => { ...code... })();'`.

## Init (prefix every script)

```typescript
const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
const sdk = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!
);
```

## Search

```typescript
// Artist search
const r = await sdk.search('QUERY_HERE', ['artist'], undefined, 5);
console.log(JSON.stringify(r.artists.items.map(a => ({ id: a.id, name: a.name, popularity: a.popularity, followers: a.followers.total, genres: a.genres })), null, 2));

// Track search
const r = await sdk.search('QUERY_HERE', ['track'], undefined, 10);
console.log(JSON.stringify(r.tracks.items.map(t => ({ id: t.id, name: t.name, popularity: t.popularity, artist: t.artists[0]?.name, album: t.album.name, isrc: t.external_ids?.isrc })), null, 2));

// ISRC lookup (resolves to track)
const r = await sdk.search('isrc:ISRC_HERE', ['track'], undefined, 1);
console.log(JSON.stringify(r.tracks.items[0], null, 2));
```

**Search query syntax** — `artist:NAME`, `track:TITLE`, `album:NAME`, `year:YYYY` or `year:YYYY-YYYY`, `genre:NAME`, `isrc:CODE`, `upc:CODE`

## Artist Profile

```typescript
// Get artist — followers, popularity, genres
const a = await sdk.artists.get('ARTIST_ID');
console.log(JSON.stringify({ id: a.id, name: a.name, followers: a.followers.total, popularity: a.popularity, genres: a.genres, image: a.images[0]?.url, url: a.external_urls.spotify }, null, 2));

// Top tracks — up to 10, requires market
const tt = await sdk.artists.topTracks('ARTIST_ID', 'US');
console.log(JSON.stringify(tt.tracks.map(t => ({ id: t.id, name: t.name, popularity: t.popularity, explicit: t.explicit, duration_ms: t.duration_ms, isrc: t.external_ids?.isrc, album: t.album.name, release_date: t.album.release_date })), null, 2));

// Albums — paginated at 50
let offset = 0; const allAlbums = [];
while (true) {
  const page = await sdk.artists.albums('ARTIST_ID', 'album,single,compilation', undefined, 50, offset);
  allAlbums.push(...page.items);
  if (offset + 50 >= page.total) break;
  offset += 50;
}
const byType = {};
for (const a of allAlbums) { byType[a.album_type] = (byType[a.album_type] || 0) + 1; }
const dates = allAlbums.map(a => a.release_date).filter(Boolean).sort();
console.log(JSON.stringify({ total: allAlbums.length, byType, earliest: dates[0], latest: dates[dates.length - 1], albums: allAlbums.map(a => ({ id: a.id, name: a.name, type: a.album_type, release_date: a.release_date, total_tracks: a.total_tracks })) }, null, 2));
```

## Album Deep Dive

```typescript
// Full album — label, copyrights, UPC, tracklist
const alb = await sdk.albums.get('ALBUM_ID');
console.log(JSON.stringify({ id: alb.id, name: alb.name, label: alb.label, release_date: alb.release_date, total_tracks: alb.total_tracks, popularity: alb.popularity, copyrights: alb.copyrights, upc: alb.external_ids?.upc, artists: alb.artists.map(a => a.name), tracks: alb.tracks.items.map(t => ({ pos: t.track_number, name: t.name, duration_ms: t.duration_ms, explicit: t.explicit })) }, null, 2));
```

## Single Track Lookup

```typescript
const t = await sdk.tracks.get('TRACK_ID');
console.log(JSON.stringify({ id: t.id, name: t.name, popularity: t.popularity, explicit: t.explicit, duration_ms: t.duration_ms, isrc: t.external_ids?.isrc, artists: t.artists.map(a => a.name), album: { name: t.album.name, id: t.album.id, release_date: t.album.release_date } }, null, 2));
```

## Helpers

### URL Parser

```typescript
const spotifyIdFromUrl = (url: string) => {
  const m = url.match(/open\.spotify\.com\/(artist|album|track)\/([a-zA-Z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
};
```

### Rate Limit Handler

```typescript
const safeCall = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (e?.status === 429 || e?.message?.includes('429')) {
        const wait = Math.pow(2, i + 1) * 1000;
        console.error(`Rate limited, waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else throw e;
    }
  }
  throw new Error('Max retries exceeded');
};
```

## Full Pipeline (Parallel)

Use this block after obtaining `artistId` to run the complete investigation in minimum API calls:

```typescript
// Parallel fetch: artist + top tracks + albums
const [artist, topTracksRes, albumsPage] = await Promise.all([
  sdk.artists.get(artistId),
  sdk.artists.topTracks(artistId, 'US'),
  sdk.artists.albums(artistId, 'album,single,compilation', undefined, 50, 0)
]);

const topTracks = topTracksRes.tracks;

// Paginate remaining albums if needed
const allAlbums = [...albumsPage.items];
let offset = 50;
while (offset < albumsPage.total) {
  const next = await sdk.artists.albums(artistId, 'album,single,compilation', undefined, 50, offset);
  allAlbums.push(...next.items);
  offset += 50;
}

// Deep dive on largest album
const albumsSorted = allAlbums.filter(a => a.album_type === 'album').sort((a, b) => (b.total_tracks || 0) - (a.total_tracks || 0));
let topAlbum = null;
if (albumsSorted.length > 0) {
  try { topAlbum = await sdk.albums.get(albumsSorted[0].id); } catch(e) {}
}

// Compute stats
const byType = {};
for (const a of allAlbums) { byType[a.album_type] = (byType[a.album_type] || 0) + 1; }
const dates = allAlbums.map(a => a.release_date).filter(Boolean).sort();
const totalTracks = allAlbums.reduce((s, a) => s + (a.total_tracks || 0), 0);

console.log(JSON.stringify({
  artist: { id: artist.id, name: artist.name, followers: artist.followers.total, popularity: artist.popularity, genres: artist.genres, url: artist.external_urls.spotify },
  topTracks: topTracks.map(t => ({ name: t.name, popularity: t.popularity, isrc: t.external_ids?.isrc, explicit: t.explicit, duration_ms: t.duration_ms, album: t.album.name, release_date: t.album.release_date })),
  catalog: { total: allAlbums.length, byType, totalTracks, earliest: dates[0], latest: dates[dates.length-1] },
  topAlbum: topAlbum ? { name: topAlbum.name, label: topAlbum.label, release_date: topAlbum.release_date, copyrights: topAlbum.copyrights, upc: topAlbum.external_ids?.upc } : null,
  explicitPct: topTracks.length > 0 ? Math.round(topTracks.filter(t => t.explicit).length / topTracks.length * 100) : 0
}, null, 2));
```

## Key Entity Fields (what to extract)

| Entity | Intelligence Fields |
|---|---|
| **Artist** | `name, id, followers.total, popularity, genres[], images[0].url, external_urls.spotify` |
| **Track** | `name, id, popularity, explicit, duration_ms, external_ids.isrc, album.name, album.release_date, artists[].name` |
| **SimplifiedAlbum** | `name, id, album_type, release_date, total_tracks, artists[].name` |
| **Album** | `name, id, label, copyrights[], popularity, external_ids.upc, total_tracks, release_date, tracks.items[]` |

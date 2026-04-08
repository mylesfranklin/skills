# Discogs API v2 Reference — Music Market Skill

Copy-paste these blocks. Run from `/tmp/discogs-api` via `cd /tmp/discogs-api && npx tsx -e '<code>'`.

## Init (prefix every script)

```typescript
const { DiscogsClient } = await import('@lionralfs/discogs-client');

const client = new DiscogsClient({
  userAgent: 'MusicCatalogInvest/1.0',
  auth: { userToken: process.env.DISCOGS_TOKEN! }
});
client.setConfig({ exponentialBackoffIntervalMs: 2000, exponentialBackoffMaxRetries: 5, exponentialBackoffRate: 2.7 });
const db = client.database();
const mkt = client.marketplace();
```

**All code must be wrapped in `(async () => { ... })();`** since top-level await is not supported. Use dynamic `import()` instead of static `import` statements.

## Search

```typescript
// Artist search
const { data } = await db.search({ q: 'QUERY_HERE', type: 'artist', per_page: 10 });
console.log(JSON.stringify(data.results.map(r => ({ id: r.id, title: r.title, type: r.type })), null, 2));

// Release search with filters
const { data } = await db.search({ artist: 'ARTIST', type: 'master', per_page: 50 });
console.log(JSON.stringify({ total: data.pagination.items, results: data.results.map(r => ({ id: r.id, title: r.title, year: r.year, genre: r.genre, style: r.style, label: r.label })) }, null, 2));

// Search by barcode (UPC cross-reference)
const { data } = await db.search({ barcode: 'UPC_HERE', type: 'release' });
```

**Search filter params:** `q`, `type`, `title`, `release_title`, `artist`, `label`, `genre`, `style`, `country`, `year`, `format`, `catno`, `barcode`, `track`, `credit`, `anv`, `page`, `per_page` (max 100)

## Artist Profile

```typescript
const { data: artist } = await db.getArtist(ARTIST_ID);
console.log(JSON.stringify({
  id: artist.id, name: artist.name, realname: artist.realname,
  profile: artist.profile?.substring(0, 300),
  urls: artist.urls, namevariations: artist.namevariations,
  members: artist.members?.map(m => ({ id: m.id, name: m.name, active: m.active })),
  aliases: artist.aliases?.map(a => ({ id: a.id, name: a.name }))
}, null, 2));
```

## Artist Releases (paginated)

```typescript
const allReleases: any[] = [];
let page = 1;
while (true) {
  const { data } = await db.getArtistReleases(ARTIST_ID, { sort: 'year', sort_order: 'asc', per_page: 100, page });
  allReleases.push(...data.releases.map(r => ({
    id: r.id, title: r.title, type: r.type, year: r.year, role: r.role,
    mainRelease: r.main_release, label: r.label, format: r.format,
    want: r.stats?.community?.in_wantlist, have: r.stats?.community?.in_collection
  })));
  if (page >= data.pagination.pages) break;
  page++;
}

const byRole = { Main: 0, Appearance: 0, TrackAppearance: 0, UnofficialRelease: 0 };
allReleases.forEach(r => { if (byRole[r.role] !== undefined) byRole[r.role]++; });
const years = allReleases.map(r => r.year).filter(Boolean).sort();

console.log(JSON.stringify({
  total: allReleases.length, byRole,
  earliest: years[0], latest: years[years.length - 1],
  releases: allReleases
}, null, 2));
```

## Release Deep Dive (investment-grade)

```typescript
const { data: rel } = await db.getRelease(RELEASE_ID, 'USD');

// Copyright holders
const phonoCopyright = rel.companies?.filter(c => c.entity_type === '13').map(c => c.name) || [];
const copyright = rel.companies?.filter(c => c.entity_type === '14').map(c => c.name) || [];
const publisher = rel.companies?.filter(c => c.entity_type === '21').map(c => c.name) || [];
const distributor = rel.companies?.filter(c => c.entity_type === '9').map(c => c.name) || [];

// Identifiers
const barcodes = rel.identifiers?.filter(i => i.type === 'Barcode').map(i => i.value) || [];
const rightsSociety = rel.identifiers?.filter(i => i.type === 'Rights Society').map(i => i.value) || [];

// Credits
const writers = rel.extraartists?.filter(ea => ea.role?.match(/Written|Composed|Songwriter/i)).map(ea => ({ name: ea.name, role: ea.role, tracks: ea.tracks })) || [];
const producers = rel.extraartists?.filter(ea => ea.role?.match(/Producer/i)).map(ea => ({ name: ea.name, role: ea.role })) || [];

console.log(JSON.stringify({
  id: rel.id, title: rel.title, year: rel.year, country: rel.country,
  released: rel.released, labels: rel.labels?.map(l => ({ id: l.id, name: l.name, catno: l.catno })),
  formats: rel.formats?.map(f => ({ name: f.name, qty: f.qty, descriptions: f.descriptions, text: f.text })),
  genres: rel.genres, styles: rel.styles,
  tracklist: rel.tracklist?.map(t => ({ position: t.position, title: t.title, duration: t.duration })),
  phonoCopyright, copyright, publisher, distributor, barcodes, rightsSociety, writers, producers,
  community: { have: rel.community?.have, want: rel.community?.want, rating: rel.community?.rating },
  numForSale: rel.num_for_sale, lowestPrice: rel.lowest_price,
  masterId: rel.master_id
}, null, 2));
```

## Label Chain Traversal

```typescript
async function getLabelChain(labelId: number, maxDepth = 5): Promise<{ chain: string[]; isMajor: boolean }> {
  const majors = ['Universal Music Group', 'Sony Music', 'Warner Music Group', 'Warner Records',
    'Sony Music Entertainment', 'UMG Recordings', 'Republic Records', 'Interscope Records',
    'Atlantic Records', 'Columbia Records', 'RCA Records', 'Capitol Records', 'Def Jam',
    'Epic Records', 'Island Records', 'Geffen Records', 'Parlophone', 'EMI'];
  const chain: string[] = [];
  let currentId: number | null = labelId;
  let depth = 0;
  while (currentId && depth < maxDepth) {
    const { data: label } = await db.getLabel(currentId);
    chain.push(label.name);
    if (majors.some(m => label.name.toLowerCase().includes(m.toLowerCase()))) {
      return { chain, isMajor: true };
    }
    currentId = label.parent_label?.id ?? null;
    depth++;
  }
  return { chain, isMajor: false };
}

const result = await getLabelChain(LABEL_ID);
console.log(JSON.stringify(result, null, 2));
```

## Master Versions (geographic reach + format diversity)

```typescript
const { data: versions } = await db.getMasterVersions(MASTER_ID, { per_page: 1, page: 1 });

// filter_facets gives counts without fetching all versions
const facets = {};
versions.filter_facets?.forEach(f => {
  facets[f.title] = f.values?.map(v => ({ title: v.title, count: v.count }));
});

console.log(JSON.stringify({
  totalVersions: versions.pagination?.items,
  facets
}, null, 2));
```

## Marketplace Pricing

```typescript
const { data: prices } = await mkt.getPriceSuggestions(RELEASE_ID);
console.log(JSON.stringify(prices, null, 2));
// { "Near Mint (NM or M-)": { currency: "USD", value: 15.00 }, "Very Good Plus (VG+)": { ... }, ... }
```

## URL Parser

```typescript
function parseDiscogsUrl(url: string): { type: string; id: number } | null {
  let m = url.match(/discogs\.com\/artist\/(\d+)/);
  if (m) return { type: 'artist', id: Number(m[1]) };
  m = url.match(/discogs\.com\/release\/(\d+)/);
  if (m) return { type: 'release', id: Number(m[1]) };
  m = url.match(/discogs\.com\/master\/(\d+)/);
  if (m) return { type: 'master', id: Number(m[1]) };
  m = url.match(/discogs\.com\/label\/(\d+)/);
  if (m) return { type: 'label', id: Number(m[1]) };
  return null;
}
```

## Company Entity Types (investment-relevant)

| entity_type | Name | Investment Use |
|---|---|---|
| 13 | Phonographic Copyright (℗) | **Master recording owner** |
| 14 | Copyright (©) | **Composition owner** |
| 21 | Published By | **Publishing rights holder** |
| 9 | Distributed By | Distribution infrastructure |
| 5 | Licensed To | Territorial licensing chain |
| 6 | Licensed From | Original rights holder |
| 7 | Licensed Through | Licensing intermediary |
| 4 | Record Company | Label entity |
| 8 | Marketed By | Marketing/promo partner |
| 10 | Manufactured By | Physical production |

## Key Entity Fields (what to extract)

| Entity | Intelligence Fields |
|---|---|
| **Artist** | `id, name, realname, profile, urls[], members[], aliases[], namevariations[]` |
| **Release** | `id, title, year, country, released, labels[].name/catno, companies[].entity_type/name, identifiers[].type/value, extraartists[].name/role, formats[].name/descriptions, tracklist[].title/duration, genres[], styles[], community.have/want/rating, num_for_sale, lowest_price, master_id` |
| **Master** | `id, title, year, main_release, most_recent_release, genres[], styles[], tracklist[], num_for_sale, lowest_price` |
| **Label** | `id, name, profile, parent_label.id/name, sublabels[].id/name, urls[], contact_info` |
| **Search Result** | `id, type, title, year, country, format[], label[], genre[], style[], catno, barcode[], community.want/have, master_id` |

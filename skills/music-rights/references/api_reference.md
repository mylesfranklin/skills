# music-rights API Reference

Runtime: `/tmp/browser-use-api`
SDK: `browser-use-sdk@^3.4.2` + `zod@^4.3.6`
Script: `music-rights.ts`

## Setup (one-time per machine / /tmp wipe)

```bash
mkdir -p /tmp/browser-use-api && cd /tmp/browser-use-api
npm init -y >/dev/null
npm pkg set type=module
npm install browser-use-sdk@latest tsx typescript zod

# Confirm canonical workspace id exists (created on first run if missing)
export BROWSER_USE_API_KEY=$(jq -r '.env.BROWSER_USE_API_KEY' ~/.claude/settings.json)
export MUSIC_RIGHTS_WORKSPACE_ID=1fe077d4-f7a2-4da2-8668-569d8f2ee731

# Re-copy the runtime script if /tmp was wiped
cp ~/.claude/skills/music-rights/music-rights.ts /tmp/browser-use-api/music-rights.ts
```

The skill's SKILL.md assumes `/tmp/browser-use-api/music-rights.ts` exists and is identical to `~/.claude/skills/music-rights/music-rights.ts`. Re-sync whenever /tmp is wiped or the script is updated.

## Invocation

```bash
cd /tmp/browser-use-api && npx tsx music-rights.ts \
  --title "A Bar Song (Tipsy)" \
  --writer "Shaboozey" \
  [--pro bmi|ascap|both]
```

Default `--pro` is `bmi`. Use `both` only if BMI returns zero hits — ASCAP ACE is behind enterprise reCAPTCHA v3 and usually fails with HTTP 400.

## Output Schema (Zod-validated)

```ts
{
  query: { title: string, writer: string | null, pro: "bmi" | "ascap" | "both" },
  total_elapsed_s: string,
  per_pro: {
    ASCAP: { status, elapsed_s, error, results_count, notes, source_url } | null,
    BMI:   { status, elapsed_s, error, results_count, notes, source_url } | null
  },
  merged: {
    iswcs: string[],              // de-duped T-XXXXXXXXX-X list
    work_ids: { BMI?: string, ASCAP?: string },
    alt_titles: string[],
    writers: Array<{
      name: string,
      ipi: string | null,         // IPI/CAE number
      role: string | null,        // CA / C / A / AR
      share_pct: number | null,
      pro_affiliation: string | null,  // ASCAP | BMI | SESAC | GMR | PRS | SOCAN
      sources: ("BMI" | "ASCAP")[]
    }>,
    publishers: Array<{
      name: string,
      ipi: string | null,
      share_pct: number | null,
      pro_affiliation: string | null,
      role: string | null,        // E / SE / AM
      sources: ("BMI" | "ASCAP")[]
    }>,
    total_writer_share: number | null,
    total_publisher_share: number | null,
    has_additional_non_bmi_publishers: boolean,
    writer_count: number,
    publisher_count: number,
    unique_pros_seen: string[]
  },
  raw: { ascap: LookupResult | null, bmi: LookupResult | null }
}
```

## Core SDK snippets

### Init client
```ts
import { BrowserUse } from "browser-use-sdk/v3";
import { z } from "zod";

const client = new BrowserUse({ apiKey: process.env.BROWSER_USE_API_KEY });
```

### Run task with structured output + cache script
```ts
const result = await client.run(
  `Open https://repertoire.bmi.com/ ... Search by Title for @{{${title}}} ...`,
  {
    schema: LookupResult,              // Zod schema — SDK auto-converts to JSON Schema
    workspaceId: MUSIC_RIGHTS_WORKSPACE_ID,
    cacheScript: true,                 // force-enable cached rerun
    autoHeal: false,                   // disable judge-based re-runs (saves $0.50/call)
    timeout: 600_000,                  // 10 min hard ceiling
  },
);
// result.output is the validated, typed z.infer<typeof LookupResult>
```

### Workspace management
```ts
// List
const list = await client.workspaces.list({ pageSize: 100 });
// SDK v3 returns { items: [...] } — not { workspaces: [...] }
for (const w of list.items) console.log(w.id, w.name, w.createdAt);

// Create
const ws = await client.workspaces.create({ name: "music-rights" });

// Delete
await client.workspaces.delete(id);

// List files in workspace
const files = await client.workspaces.files(id, { prefix: "scripts/" });
```

### Inspecting sessions (cost + status)
```ts
const sessions = await client.sessions.list({ pageSize: 10 });
for (const s of sessions.sessions ?? []) {
  console.log(s.id, s.status, s.llmCostUsd, s.workspaceId);
}
```

## Cache Script Contract (CRITICAL)

Browser Use Cloud caches the agent's actions on a workspace when:
1. The prompt contains `@{{value}}` parameter markers, AND
2. A `workspaceId` is attached, AND
3. (Optionally) `cacheScript: true` is forced.

The cache key is a hash of the **template** (prompt with `@{{value}}` stripped to `@{{}}`). For the cache to hit on subsequent calls:

- The static text of the prompt MUST be byte-identical across calls. Even a single extra space, different word order, or different punctuation creates a new cache entry.
- The `@{{}}` markers must appear in the same positions with the same surrounding structure.
- The Zod schema should also be stable (adding fields = new hash).
- The workspace id must be the SAME workspace (not a recreated one with the same name).

**Our script enforces this** by:
- Using a fixed-template `bmiTask(title, writer)` function with a single-return-string body
- Always wrapping both params in `@{{}}` (writer defaults to the literal string `"ANY"` when unspecified so the shape is stable)
- Pinning the workspace via `MUSIC_RIGHTS_WORKSPACE_ID` env var or auto-pick-oldest by name
- Forcing `cacheScript: true` and `autoHeal: false`

Inspect cached scripts for a workspace:
```bash
cd /tmp/browser-use-api && node -e '
const { BrowserUse } = require("browser-use-sdk/v3");
(async () => {
  const c = new BrowserUse({ apiKey: process.env.BROWSER_USE_API_KEY });
  const f = await c.workspaces.files(process.env.MUSIC_RIGHTS_WORKSPACE_ID, { prefix: "scripts/" });
  console.log(JSON.stringify(f.files, null, 2));
})();
'
```

## Cost & Latency Table

| Scenario | Cost | Time |
|---|---|---|
| BMI first call (cold) | ~$0.40–0.50 | ~60–180s |
| BMI cached script hit | ~$0 | ~5–15s |
| BMI auto-heal re-run (if cache fails validation) | ~$0.40–0.50 | ~60–180s |
| ASCAP first call | ~$0.40–$1.65 | ~180–440s (usually blocked by reCAPTCHA) |
| Parallel BMI+ASCAP both cold | ~$0.80–$2.15 | ~180–440s (bounded by ASCAP) |

## Known Issues

1. **ASCAP ACE is reCAPTCHA-locked.** `ace-api.ascap.com` returns HTTP 400 on most automated requests even through stealth + residential proxies. The agent will report `notes: "reCAPTCHA block"` and return empty results. This is a bot-detection false negative, NOT a real absence of the work.

2. **BMI individual share percentages are not displayed.** Songview only shows aggregate `Total % Controlled` (e.g. "BMI 23.34%"). Individual writer and publisher `share_pct` fields in the schema will usually be `null`. The `total_writer_share` and `total_publisher_share` fields come from the aggregate row.

3. **`has_additional_non_bmi_publishers: true` means the publisher list is incomplete.** Songview aggregates non-BMI publishers behind a single "Additional Non-BMI Publishers" row without showing individual entries. When this flag is true, note in the bear case that the publisher roster is partial.

4. **Cache hits are not guaranteed.** Browser Use's auto-heal validator may invalidate a cached script if it sees lots of `null` values in the output. We disable auto-heal (`autoHeal: false`) but even so, small template drift or backend changes can trigger re-runs. Budget assuming 2–3× cold cost if you run many distinct queries.

5. **Spotify/MusicBrainz title variants.** A song titled "A Bar Song (Tipsy)" on Spotify is indexed as "BAR SONG TIPSY" on BMI. Songview's fuzzy match handles this but you may need to fall back to searching by writer name if title returns zero hits.

## Testing Queries

Verified working on these titles (BMI Songview):
- `"A Bar Song (Tipsy)" --writer "Shaboozey"` → 6 writers (5 ASCAP + 1 BMI), ISWC T-325320993-3, has_additional_non_bmi_publishers=true

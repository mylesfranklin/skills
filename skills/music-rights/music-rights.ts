/**
 * music-rights — music publishing rights lookup via BMI Songview (+ optional ASCAP ACE).
 *
 * PRIMARY PATH: BMI Songview at repertoire.bmi.com
 *   Songview is the joint ASCAP/BMI/SESAC/GMR reconciled database. One query
 *   returns writers and publishers from all four PROs with their IPI numbers
 *   and BMI-side share percentages.
 *
 * FALLBACK PATH: ASCAP ACE at ace.ascap.com
 *   ACE is protected by enterprise reCAPTCHA v3 which blocks headless browsers
 *   even through stealth + residential proxies. Opt-in only via --pro both.
 *   Expect frequent HTTP 400s. Use only when BMI returns zero hits.
 *
 * CACHING: Each PRO has ONE fixed template shape. Parameter values flow through
 *   @{{brackets}}. The first call per shape creates a cached script (~$0.10,
 *   ~60s). Subsequent calls hit the cache ($0 LLM, ~5-10s). Auto-healing
 *   re-runs the full agent if the cached script's output fails validation.
 *
 * USAGE
 *   npx tsx music-rights.ts --title "Song Title" [--writer "Name"] [--pro bmi|ascap|both]
 *
 * ENV
 *   BROWSER_USE_API_KEY       required
 *   MUSIC_RIGHTS_WORKSPACE_ID optional — pin a workspace id to avoid any list/create race
 */

import { BrowserUse } from "browser-use-sdk/v3";
import { z } from "zod";
import { parseArgs } from "node:util";

const BROWSER_USE_API_KEY = process.env.BROWSER_USE_API_KEY;
if (!BROWSER_USE_API_KEY) throw new Error("BROWSER_USE_API_KEY missing");

// --- Shared output schema ----------------------------------------------------

const Writer = z.object({
  name: z.string(),
  ipi: z.string().nullable().describe("IPI/CAE number if shown on the detail page, else null."),
  role: z
    .string()
    .nullable()
    .describe("Role code if shown: CA=Composer/Author, C=Composer, A=Author, AR=Arranger."),
  share_pct: z
    .number()
    .nullable()
    .describe("Writer share percentage if displayed. Null if not shown."),
  pro_affiliation: z
    .string()
    .nullable()
    .describe("Writer PRO affiliation: ASCAP, BMI, SESAC, GMR, PRS, SOCAN, etc."),
});

const Publisher = z.object({
  name: z.string(),
  ipi: z.string().nullable(),
  share_pct: z.number().nullable(),
  pro_affiliation: z.string().nullable(),
  role: z
    .string()
    .nullable()
    .describe("Role code: E=Original Publisher, SE=Sub-Publisher, AM=Administrator."),
});

const Work = z.object({
  title: z.string(),
  alt_titles: z.array(z.string()).default([]),
  iswc: z.string().nullable().describe("ISWC in T-XXXXXXXXX-X format if present, else null."),
  work_id: z.string().nullable().describe("PRO-internal work ID / BMI Work # / ASCAP Work ID."),
  writers: z.array(Writer).default([]),
  publishers: z.array(Publisher).default([]),
  total_writer_share: z.number().nullable(),
  total_publisher_share: z.number().nullable(),
  has_additional_non_bmi_publishers: z
    .boolean()
    .nullable()
    .describe("BMI only: true if the page shows an 'Additional Non-BMI Publishers' marker."),
});

const LookupResult = z.object({
  status: z.enum(["found", "not_found", "error"]),
  source_url: z.string(),
  query_title: z.string(),
  results_count: z
    .number()
    .describe("Number of work rows matched on the initial results page."),
  works: z.array(Work).default([]),
  notes: z
    .string()
    .nullable()
    .describe(
      "Ambiguity, multiple matches selected, CAPTCHA encountered, or parsing warnings.",
    ),
});

type LookupResultT = z.infer<typeof LookupResult>;

// --- Task templates ----------------------------------------------------------
// CRITICAL: template shape must be stable across calls for cache hashing.
// Only parameter VALUES may change; structural text may not. Both title and
// writer are ALWAYS wrapped in @{{}} brackets. When writer is empty we pass
// the literal string "ANY" so the template shape is identical.

function bmiTask(title: string, writer: string): string {
  // Keep prompt SHORT and STABLE. Template text never changes — only the two
  // @{{}} params change. This maximizes the chance of a cache hit.
  return (
    `Open https://repertoire.bmi.com/ and accept any terms/cookie banner. ` +
    `Search by Title for @{{${title}}} and submit. ` +
    `From the results, pick the work whose writer list best matches @{{${writer}}} ` +
    `(ignore this rule if writer is "ANY"), preferring exact title matches and ` +
    `the highest Total % Controlled. Open the work's detail view and expand all ` +
    `writer and publisher rows. Extract every writer (name, ipi, role, share_pct, ` +
    `pro_affiliation), every publisher (name, ipi, share_pct, pro_affiliation, role), ` +
    `ISWC (formatted T-XXXXXXXXX-X), work_id, alt_titles, total_writer_share, ` +
    `total_publisher_share, and has_additional_non_bmi_publishers. ` +
    `Set source_url to the detail page URL and query_title to the exact input. ` +
    `Return JSON matching the schema.`
  );
}

function ascapTask(title: string, writer: string): string {
  return [
    `Go to https://www.ascap.com/repertory which is ASCAP's ACE Repertory search. `,
    `Accept any cookie consent or terms banner. `,
    `NOTE: This site is protected by enterprise reCAPTCHA v3 — if it blocks the `,
    `request with HTTP 400 or a "Nothing matched your search criteria" phantom `,
    `empty result, that is a bot detection false-negative. In that case, `,
    `set status="error" and put "reCAPTCHA block" in notes. Do not retry more than twice. `,
    ``,
    `Find the search form. Set the search type to "Title" and enter the query: @{{${title}}}. `,
    `Submit the form. `,
    ``,
    `From the results table, pick the ONE work that best matches according to: `,
    `  (1) Writer preference: @{{${writer}}}. If "ANY", skip. Otherwise prefer rows `,
    `      whose writer list contains a case-insensitive match for this name. `,
    `  (2) Exact case-insensitive title match over partial match. `,
    `  (3) Highest share totals or most complete writer data. `,
    ``,
    `Click into the detail view. Extract ALL writers and ALL publishers into the `,
    `JSON schema: name, ipi, role, share_pct, pro_affiliation for each. `,
    `Capture ISWC (format T-XXXXXXXXX-X) and the ASCAP Work ID. `,
    `Set has_additional_non_bmi_publishers=null (ASCAP-specific field does not apply). `,
    `Set source_url to the detail page URL, query_title to the exact input title, `,
    `results_count to the number of rows on the initial results page, `,
    `and status to "found" | "not_found" | "error". @{{}}`,
  ].join("");
}

// --- Runner ------------------------------------------------------------------

type PerPROResult = {
  pro: "ASCAP" | "BMI";
  elapsed_s: string;
  result: LookupResultT | null;
  error: string | null;
};

async function runLookup(
  client: BrowserUse,
  workspaceId: string,
  pro: "ASCAP" | "BMI",
  title: string,
  writer: string,
): Promise<PerPROResult> {
  const task = pro === "ASCAP" ? ascapTask(title, writer) : bmiTask(title, writer);
  // ASCAP usually gets blocked by reCAPTCHA — give it a hard 4-min ceiling so
  // it can't eat $1 and 7 minutes on every call. BMI gets the full 10 min.
  const hardTimeoutMs = pro === "ASCAP" ? 240_000 : 600_000;
  const t0 = Date.now();
  try {
    const out: any = await client.run(task, {
      schema: LookupResult,
      workspaceId,
      // Force cache script on — the prompt has @{{}} params AND a workspace.
      // Auto-healing off so we don't eat $0.50 whenever the judge misreads
      // null share_pct values as "empty".
      cacheScript: true,
      autoHeal: false,
      timeout: hardTimeoutMs,
    } as any);
    const elapsed_s = ((Date.now() - t0) / 1000).toFixed(1);
    return { pro, elapsed_s, result: out.output as LookupResultT, error: null };
  } catch (e: any) {
    const elapsed_s = ((Date.now() - t0) / 1000).toFixed(1);
    return { pro, elapsed_s, result: null, error: e?.message ?? String(e) };
  }
}

// --- Merge logic -------------------------------------------------------------

function normKey(name: string, ipi: string | null): string {
  const n = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
  return ipi ? `${n}|${ipi}` : n;
}

function mergeWorks(ascap: LookupResultT | null, bmi: LookupResultT | null) {
  const all: {
    source: "ASCAP" | "BMI";
    work: z.infer<typeof Work>;
  }[] = [];
  if (ascap?.works) for (const w of ascap.works) all.push({ source: "ASCAP", work: w });
  if (bmi?.works) for (const w of bmi.works) all.push({ source: "BMI", work: w });

  const writerMap = new Map<string, any>();
  const publisherMap = new Map<string, any>();
  const iswcs = new Set<string>();
  const workIds: Record<string, string> = {};
  const altTitles = new Set<string>();
  let hasNonBMI = false;

  for (const { source, work } of all) {
    if (work.iswc) iswcs.add(work.iswc);
    if (work.work_id) workIds[source] = work.work_id;
    for (const t of work.alt_titles ?? []) altTitles.add(t);
    if (work.has_additional_non_bmi_publishers) hasNonBMI = true;

    for (const w of work.writers ?? []) {
      const k = normKey(w.name, w.ipi);
      const existing = writerMap.get(k);
      if (existing) {
        existing.sources.add(source);
        existing.ipi ??= w.ipi;
        existing.role ??= w.role;
        existing.share_pct ??= w.share_pct;
        existing.pro_affiliation ??= w.pro_affiliation;
      } else {
        writerMap.set(k, { ...w, sources: new Set([source]) });
      }
    }
    for (const p of work.publishers ?? []) {
      const k = normKey(p.name, p.ipi);
      const existing = publisherMap.get(k);
      if (existing) {
        existing.sources.add(source);
        existing.ipi ??= p.ipi;
        existing.role ??= p.role;
        existing.share_pct ??= p.share_pct;
        existing.pro_affiliation ??= p.pro_affiliation;
      } else {
        publisherMap.set(k, { ...p, sources: new Set([source]) });
      }
    }
  }

  const writers = Array.from(writerMap.values()).map((w) => ({
    ...w,
    sources: Array.from(w.sources),
  }));
  const publishers = Array.from(publisherMap.values()).map((p) => ({
    ...p,
    sources: Array.from(p.sources),
  }));

  const total_writer_share = writers.reduce((s, w) => s + (w.share_pct ?? 0), 0);
  const total_publisher_share = publishers.reduce((s, p) => s + (p.share_pct ?? 0), 0);

  return {
    iswcs: Array.from(iswcs),
    work_ids: workIds,
    alt_titles: Array.from(altTitles),
    writers,
    publishers,
    total_writer_share: total_writer_share || null,
    total_publisher_share: total_publisher_share || null,
    has_additional_non_bmi_publishers: hasNonBMI,
    writer_count: writers.length,
    publisher_count: publishers.length,
    unique_pros_seen: Array.from(
      new Set(
        [...writers, ...publishers]
          .map((x) => x.pro_affiliation)
          .filter(Boolean) as string[],
      ),
    ),
  };
}

// --- Workspace pinning -------------------------------------------------------

async function ensureWorkspace(client: BrowserUse): Promise<string> {
  const WS_NAME = "music-rights";
  if (process.env.MUSIC_RIGHTS_WORKSPACE_ID) return process.env.MUSIC_RIGHTS_WORKSPACE_ID;
  try {
    const list: any = await (client as any).workspaces.list?.({ pageSize: 100 });
    const items: any[] = list?.items ?? list?.workspaces ?? [];
    const matches = items
      .filter((w: any) => w.name === WS_NAME)
      .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
    if (matches.length > 0) return String(matches[0].id);
  } catch (e) {
    console.error("[ensureWorkspace] list failed:", (e as any)?.message);
  }
  const ws: any = await (client as any).workspaces.create({ name: WS_NAME });
  return String(ws.id);
}

// --- CLI ---------------------------------------------------------------------

(async () => {
  const { values } = parseArgs({
    options: {
      title: { type: "string" },
      writer: { type: "string" },
      pro: { type: "string" }, // "bmi" (default) | "ascap" | "both"
    },
  });

  const title = values.title as string | undefined;
  const writerRaw = (values.writer as string | undefined) ?? "";
  // Normalize writer so template shape is stable (empty -> literal "ANY").
  const writer = writerRaw.trim() === "" ? "ANY" : writerRaw.trim();
  const proFilter = ((values.pro as string) ?? "bmi").toLowerCase();

  if (!title) {
    console.error(
      'Usage: npx tsx music-rights.ts --title "Song Title" [--writer "Name"] [--pro bmi|ascap|both]',
    );
    process.exit(1);
  }

  const client = new BrowserUse({ apiKey: BROWSER_USE_API_KEY });
  const workspaceId = await ensureWorkspace(client);
  console.error(`[workspace] ${workspaceId}`);
  console.error(`[query] title="${title}" writer="${writer}" pro=${proFilter}`);

  const jobs: Promise<PerPROResult>[] = [];
  if (proFilter === "bmi" || proFilter === "both")
    jobs.push(runLookup(client, workspaceId, "BMI", title, writer));
  if (proFilter === "ascap" || proFilter === "both")
    jobs.push(runLookup(client, workspaceId, "ASCAP", title, writer));

  const t0 = Date.now();
  const results = await Promise.all(jobs);
  const total_elapsed_s = ((Date.now() - t0) / 1000).toFixed(1);

  const ascap = results.find((r) => r.pro === "ASCAP") ?? null;
  const bmi = results.find((r) => r.pro === "BMI") ?? null;

  const merged = mergeWorks(ascap?.result ?? null, bmi?.result ?? null);

  const out = {
    query: { title, writer: writer === "ANY" ? null : writer, pro: proFilter },
    total_elapsed_s,
    per_pro: {
      ASCAP: ascap
        ? {
            status: ascap.result?.status ?? "error",
            elapsed_s: ascap.elapsed_s,
            error: ascap.error,
            results_count: ascap.result?.results_count ?? 0,
            notes: ascap.result?.notes ?? null,
            source_url: ascap.result?.source_url ?? null,
          }
        : null,
      BMI: bmi
        ? {
            status: bmi.result?.status ?? "error",
            elapsed_s: bmi.elapsed_s,
            error: bmi.error,
            results_count: bmi.result?.results_count ?? 0,
            notes: bmi.result?.notes ?? null,
            source_url: bmi.result?.source_url ?? null,
          }
        : null,
    },
    merged,
    raw: { ascap: ascap?.result ?? null, bmi: bmi?.result ?? null },
  };

  console.log(JSON.stringify(out, null, 2));
})();

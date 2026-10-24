// Closes active job offers that were taken down.
//  - Lever / Ashby offers: the board's public API lists only open postings, so an
//    offer missing from it is closed (Ashby pages answer 200 even when closed).
//  - Everything else: the apply link answers 404/410.
// Dry run by default: node --env-file=.env.local scripts/close-dead-job-links.mjs [--write]
// Only older offers are checked, and only a definite 404/410 closes one: timeouts,
// 403s and other answers leave the offer untouched.
import { createClient } from "@supabase/supabase-js";

const write = process.argv.includes("--write");
const sources = ["Lever", "Ashby", "Empresa"];
const olderThanDays = 30;
const concurrency = 10;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function loadCandidates() {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
  const rows = [];
  for (const source of sources) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("jobs")
        .select("id,source,external_id,company,title,metadata")
        .eq("source", source).eq("status", "active").lt("published_at", cutoff)
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return rows;
}

async function status(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "Landeo link checker", Accept: "text/html" },
        signal: AbortSignal.timeout(12_000),
      });
      await response.body?.cancel();
      return response.status;
    } catch {
      // retry once, then give up as unknown
    }
  }
  return 0;
}

async function boardIds(source, token) {
  const url = source === "Ashby"
    ? `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`
    : `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const payload = await response.json();
    const list = source === "Ashby" ? payload.jobs : payload;
    return Array.isArray(list) ? new Set(list.map((job) => String(job.id))) : null;
  } catch {
    return null;
  }
}

const allRows = await loadCandidates();
const dead = [];
const boardAnswers = {};
// Lever / Ashby rows written by the older scripts use "<board>:<id>".
const apiRows = allRows.filter((row) => (row.source === "Lever" || row.source === "Ashby") && /^[^:]+:[^:]+$/.test(row.external_id ?? ""));
const byBoard = new Map();
for (const row of apiRows) {
  const key = `${row.source}|${row.external_id.split(":")[0]}`;
  byBoard.set(key, [...(byBoard.get(key) ?? []), row]);
}
for (const [key, boardRows] of byBoard) {
  const [source, token] = key.split("|");
  const open = await boardIds(source, token);
  boardAnswers[key] = open ? `${open.size} open` : "unreachable (skipped)";
  if (!open) continue;
  for (const row of boardRows) {
    if (!open.has(row.external_id.split(":")[1])) dead.push(row);
  }
}
const apiChecked = new Set(apiRows.map((row) => row.id));
const rows = allRows.filter((row) => !apiChecked.has(row.id));
const targets = rows
  .map((row) => ({ row, url: row.metadata?.canonical_apply_url || row.metadata?.source_url }))
  .filter(({ url }) => typeof url === "string" && /^https:\/\//.test(url));

const tally = new Map();
let index = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (index < targets.length) {
    const { row, url } = targets[index++];
    const code = await status(url);
    tally.set(code, (tally.get(code) ?? 0) + 1);
    if (code === 404 || code === 410) dead.push(row);
  }
}));

console.log(JSON.stringify({
  mode: write ? "write" : "dry-run",
  checkedByApi: apiRows.length,
  boards: boardAnswers,
  checkedByLink: targets.length,
  answers: Object.fromEntries([...tally.entries()].sort((a, b) => b[1] - a[1])),
  dead: dead.length,
  deadBySource: dead.reduce((acc, row) => ({ ...acc, [row.source]: (acc[row.source] ?? 0) + 1 }), {}),
}, null, 2));

if (write && dead.length) {
  for (let start = 0; start < dead.length; start += 200) {
    const ids = dead.slice(start, start + 200).map((row) => row.id);
    const { error } = await db.from("jobs").update({ status: "closed" }).in("id", ids);
    if (error) throw error;
  }
  console.log(`closed ${dead.length} offers`);
}

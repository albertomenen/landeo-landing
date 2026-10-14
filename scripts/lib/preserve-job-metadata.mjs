import { createClient } from "@supabase/supabase-js";

const protectedPrefix = (key) => key.startsWith("company_office_") || key.startsWith("company_address_");

export function mergeProtectedJobMetadata(incoming = {}, existing = {}) {
  const protectedEntries = Object.entries(existing).filter(([key]) => protectedPrefix(key));
  return { ...incoming, ...Object.fromEntries(protectedEntries) };
}

const identityKey = (row, identity) => identity === "id"
  ? String(row.id ?? "")
  : `${row.source ?? ""}:${row.external_id ?? ""}`;

export async function preserveExistingJobMetadata(rows, { url, key, identity = "source_external_id" }) {
  if (!rows.length) return rows;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const existing = [];

  if (identity === "id") {
    const ids = rows.map((row) => row.id).filter(Boolean);
    if (ids.length) {
      const { data, error } = await client.from("jobs").select("id,metadata").in("id", ids);
      if (error) throw error;
      existing.push(...(data ?? []));
    }
  } else {
    const bySource = new Map();
    for (const row of rows) {
      if (!row.source || !row.external_id) continue;
      const ids = bySource.get(row.source) ?? [];
      ids.push(row.external_id);
      bySource.set(row.source, ids);
    }
    for (const [source, externalIds] of bySource) {
      const { data, error } = await client.from("jobs")
        .select("source,external_id,metadata")
        .eq("source", source)
        .in("external_id", externalIds);
      if (error) throw error;
      existing.push(...(data ?? []));
    }
  }

  const byIdentity = new Map(existing.map((row) => [identityKey(row, identity), row.metadata ?? {}]));
  return rows.map((row) => ({
    ...row,
    metadata: mergeProtectedJobMetadata(row.metadata ?? {}, byIdentity.get(identityKey(row, identity)) ?? {}),
  }));
}

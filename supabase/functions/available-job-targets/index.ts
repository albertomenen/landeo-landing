import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ message: "Método no permitido." }, 405);
  }
  try {
    const body = await request.json().catch(() => ({})) as { jobIds?: unknown };
    const jobIds = Array.isArray(body.jobIds)
      ? Array.from(new Set(body.jobIds.filter((id): id is string => typeof id === "string" && UUID.test(id)))).slice(0, 120)
      : [];
    if (!jobIds.length) return json({ jobIds: [] });
    const admin = createClient(
      required("SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
    const { data, error } = await admin.from("job_application_targets")
      .select("job_id").in("job_id", jobIds);
    if (error) throw error;
    return json({ jobIds: (data ?? []).map((row: { job_id: string }) => row.job_id) });
  } catch (error) {
    console.error("available-job-targets", error);
    return json({
      message: error instanceof Error ? error.message : "No se pudieron validar las ofertas.",
    }, 500);
  }
});

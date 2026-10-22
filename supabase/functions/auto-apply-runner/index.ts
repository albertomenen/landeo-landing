/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase Edge Function rows are runtime-shaped. */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { autoApplyGeographyCompatible } from "../_shared/auto-apply-geography.ts";
import { hasActiveStripeSubscription } from "../_shared/subscription.ts";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
};

function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function terms(values: unknown) {
  return Array.isArray(values)
    ? values.flatMap((value) => normalized(value).split(/\s+/)).filter((value) => value.length > 2)
    : [];
}

function containsAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function chunks<T>(values: T[], size = 80) {
  const result: T[][] = [];
  for (let start = 0; start < values.length; start += size) result.push(values.slice(start, start + size));
  return result;
}

function jobScore(job: any, profile: any, settings: any) {
  if (!autoApplyGeographyCompatible(job, profile)) return -1;
  const title = normalized(job.title);
  const description = normalized(job.summary);
  const company = normalized(job.company);
  const location = normalized(job.location);
  const industry = normalized(job.industry);
  const seniority = normalized(job.seniority);
  const workMode = normalized(job.work_mode);
  const roleTerms = terms(settings.roles?.length ? settings.roles : [profile.role]);
  const skillTerms = terms(profile.skills);
  const locationTerms = terms(settings.locations);
  const industryTerms = terms(settings.industries);
  const seniorityTerms = terms(settings.seniority_levels);
  const workModeTerms = terms(settings.work_modes);
  const excluded = (settings.excluded_companies ?? []).map(normalized);
  if (excluded.some((value: string) => value && company.includes(value))) return -1;
  if (!roleTerms.length || !containsAny(`${title} ${description}`, roleTerms)) return -1;
  if (locationTerms.length && !containsAny(location, locationTerms) && !workMode.includes("remot")) return -1;
  if (workModeTerms.length && !containsAny(workMode, workModeTerms)) return -1;
  if (industryTerms.length && !containsAny(industry, industryTerms)) return -1;
  if (seniorityTerms.length && !containsAny(`${seniority} ${title}`, seniorityTerms)) return -1;

  let score = 45;
  score += Math.min(25, skillTerms.filter((term) => description.includes(term) || title.includes(term)).length * 5);
  if (!locationTerms.length || containsAny(location, locationTerms) || workMode.includes("remot")) score += 15;
  if (!seniorityTerms.length || containsAny(`${seniority} ${title}`, seniorityTerms)) score += 10;
  if (!industryTerms.length || containsAny(industry, industryTerms)) score += 5;
  return Math.min(100, score);
}

// Stay well inside the Edge Function wall-clock limit: stop starting new
// submissions or users after this, and leave the rest for the next cron tick.
const RUN_BUDGET_MS = 110_000;
const SUBMIT_TIMEOUT_MS = 60_000;
// A run older than this that still says "running" was killed mid-way.
const STALE_RUN_MS = 15 * 60 * 1000;

async function processUser(admin: any, settings: any, deadline: number) {
  const now = new Date();
  // One run per user at a time: a manual "run now" and the cron, or two cron
  // ticks, would otherwise each spend the full daily allowance.
  const { data: activeRuns, error: activeRunsError } = await admin.from("auto_apply_runs")
    .select("id").eq("user_id", settings.user_id).eq("status", "running")
    .gte("started_at", new Date(now.getTime() - STALE_RUN_MS).toISOString()).limit(1);
  if (activeRunsError) throw activeRunsError;
  if (activeRuns?.length) {
    return { userId: settings.user_id, matched: 0, attempted: 0, sent: 0, actionRequired: 0, failed: 0, skipped: true, alreadyRunning: true };
  }
  const { data: run, error: runError } = await admin.from("auto_apply_runs").insert({
    user_id: settings.user_id,
    status: "running",
  }).select("id").single();
  if (runError) throw runError;

  let matched = 0;
  let attempted = 0;
  let sent = 0;
  let actionRequired = 0;
  let failed = 0;
  try {
    const [{ data: profile, error: profileError }, subscribed] = await Promise.all([
      admin.from("profiles").select("*").eq("id", settings.user_id).maybeSingle(),
      hasActiveStripeSubscription(admin, settings.user_id),
    ]);
    // A failed lookup must not look like "no profile" and switch Auto Apply off.
    if (profileError) throw profileError;
    if (!profile || !subscribed || !profile.cv_path || !profile.privacy_consent_at || !profile.automatic_application_consent_at) {
      await admin.from("auto_apply_settings").update({ enabled: false, updated_at: now.toISOString() }).eq("user_id", settings.user_id);
      await admin.from("auto_apply_runs").update({
        status: "skipped",
        error_message: !subscribed ? "Suscripción inactiva." : "Perfil, CV o consentimiento incompleto.",
        completed_at: now.toISOString(),
      }).eq("id", run.id);
      return { userId: settings.user_id, matched, attempted, sent, actionRequired, failed, skipped: true };
    }

    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await admin.from("applications").select("id", { count: "exact", head: true })
      .eq("user_id", settings.user_id)
      .contains("answers", { autoApply: true })
      .gte("applied_at", dayStart.toISOString())
      .in("status", ["queued", "processing", "sent"]);
    const remaining = Math.max(0, Number(settings.daily_limit ?? 3) - Number(sentToday ?? 0));
    if (!remaining) {
      const tomorrow = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      await Promise.all([
        admin.from("auto_apply_runs").update({ status: "skipped", error_message: "Límite diario alcanzado.", completed_at: now.toISOString() }).eq("id", run.id),
        // Nothing to do until the allowance resets.
        admin.from("auto_apply_settings").update({ next_run_at: tomorrow.toISOString() }).eq("user_id", settings.user_id),
      ]);
      return { userId: settings.user_id, matched, attempted, sent, actionRequired, failed, skipped: true };
    }

    const { data: existing } = await admin.from("applications").select("job_id").eq("user_id", settings.user_id);
    const existingIds = new Set((existing ?? []).map((row: any) => row.job_id));
    const { data: targets, error: targetError } = await admin.from("job_application_targets")
      .select("job_id")
      .eq("mode", "email")
      .eq("email_authorized", true)
      .not("apply_email", "is", null)
      .not("email_source_url", "is", null)
      .limit(500);
    if (targetError) throw targetError;
    const targetIds = (targets ?? []).map((row: any) => row.job_id).filter((id: string) => !existingIds.has(id)).slice(0, 320);
    if (!targetIds.length) {
      await admin.from("auto_apply_runs").update({ status: "completed", completed_at: now.toISOString() }).eq("id", run.id);
      return { userId: settings.user_id, matched, attempted, sent, actionRequired, failed };
    }

    const jobResults = await Promise.all(chunks(targetIds).map((ids) => admin.from("jobs")
      .select("id,company,title,summary,location,work_mode,seniority,industry,published_at,metadata")
      .in("id", ids)
      .eq("status", "active")
      .eq("application_capability", "automatic")
      .order("published_at", { ascending: false })));
    const jobsError = jobResults.find((result: any) => result.error)?.error;
    if (jobsError) throw jobsError;
    const jobs = jobResults.flatMap((result: any) => result.data ?? []);
    const candidates = jobs
      .map((job: any) => ({ job, score: jobScore(job, profile, settings) }))
      .filter(({ score }: any) => score >= Number(settings.minimum_match ?? 75))
      .sort((left: any, right: any) => right.score - left.score);
    matched = candidates.length;

    for (const { job, score } of candidates.slice(0, remaining)) {
      if (Date.now() > deadline) break;
      attempted += 1;
      await admin.from("swipes").upsert({ user_id: settings.user_id, job_id: job.id, direction: "right" }, { onConflict: "user_id,job_id" });
      const response = await fetch(`${required("SUPABASE_URL")}/functions/v1/submit-application`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${required("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
          "x-auto-apply-secret": required("AUTO_APPLY_CRON_SECRET"),
        },
        body: JSON.stringify({
          jobId: job.id,
          userId: settings.user_id,
          autoApply: true,
          platform: "web",
          answers: { autoApply: true, autoApplyRunId: run.id, autoApplyMatch: score },
        }),
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      }).catch((error) => {
        console.error("auto-apply submit", job.id, error);
        return null;
      });
      const outcome = response
        ? await response.json().catch(() => ({ status: "failed" }))
        : { status: "failed" };
      if (outcome.status === "sent") sent += 1;
      else if (outcome.status === "action_required") actionRequired += 1;
      else if (outcome.status === "queued") sent += 1;
      else failed += 1;
    }

    const completedAt = new Date().toISOString();
    await Promise.all([
      admin.from("auto_apply_runs").update({
        status: "completed",
        matched_count: matched,
        attempted_count: attempted,
        sent_count: sent,
        action_required_count: actionRequired,
        failed_count: failed,
        completed_at: completedAt,
      }).eq("id", run.id),
      admin.from("auto_apply_settings").update({
        last_run_at: completedAt,
        next_run_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        updated_at: completedAt,
      }).eq("user_id", settings.user_id),
    ]);
    return { userId: settings.user_id, matched, attempted, sent, actionRequired, failed };
  } catch (error) {
    await admin.from("auto_apply_runs").update({
      status: "failed",
      matched_count: matched,
      attempted_count: attempted,
      sent_count: sent,
      action_required_count: actionRequired,
      failed_count: failed,
      error_message: error instanceof Error ? error.message.slice(0, 500) : "Error inesperado.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405);
  try {
    const url = required("SUPABASE_URL");
    const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const authorization = request.headers.get("Authorization") ?? "";
    const suppliedSecret = request.headers.get("x-auto-apply-secret") ?? "";
    const isScheduler = suppliedSecret && secureEqual(suppliedSecret, required("AUTO_APPLY_CRON_SECRET"));
    let requestedUserId: string | null = null;
    if (!isScheduler) {
      if (!authorization) return json({ message: "Sesión no válida." }, 401);
      const userClient = createClient(url, required("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authorization } } });
      const { data, error } = await userClient.auth.getUser();
      if (error || !data.user) return json({ message: "Sesión no válida." }, 401);
      requestedUserId = data.user.id;
    }

    const deadline = Date.now() + RUN_BUDGET_MS;
    let query = admin.from("auto_apply_settings").select("*").eq("enabled", true);
    if (requestedUserId) query = query.eq("user_id", requestedUserId);
    else {
      // Oldest due first, so users who keep being skipped cannot starve the rest.
      query = query.or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`)
        .order("next_run_at", { ascending: true, nullsFirst: true }).limit(25);
    }
    const { data: settingsRows, error } = await query;
    if (error) throw error;
    const results = [];
    for (const settings of settingsRows ?? []) {
      if (requestedUserId) {
        results.push(await processUser(admin, settings, deadline));
        continue;
      }
      if (Date.now() > deadline) break;
      // Claim the user before processing: push next_run_at forward only if it
      // is still due, so overlapping cron ticks never pick the same user and a
      // user whose run fails is retried in an hour instead of every tick.
      const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      let claim = admin.from("auto_apply_settings").update({ next_run_at: retryAt })
        .eq("user_id", settings.user_id).eq("enabled", true);
      claim = settings.next_run_at ? claim.eq("next_run_at", settings.next_run_at) : claim.is("next_run_at", null);
      const { data: claimed, error: claimError } = await claim.select("user_id").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) continue;
      // One user's failure is recorded on their run; it must not stop the batch.
      try {
        results.push(await processUser(admin, settings, deadline));
      } catch (error) {
        console.error("auto-apply-runner user", settings.user_id, error);
        results.push({ userId: settings.user_id, error: error instanceof Error ? error.message : "Error inesperado." });
      }
    }
    return json({ processed: results.length, results });
  } catch (error) {
    console.error("auto-apply-runner", error);
    return json({ message: error instanceof Error ? error.message : "No se pudo ejecutar Auto Apply." }, 500);
  }
});

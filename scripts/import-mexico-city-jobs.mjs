// Official public boards only. Dry run by default; never changes existing jobs/targets.
// Run: node --env-file=.env.local scripts/import-mexico-city-jobs.mjs --write
import { randomUUID } from 'node:crypto';
const write = process.argv.includes('--write');
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('Supabase environment required');
async function api(table, params, method='GET', body) {
  const r = await fetch(`${base}/rest/v1/${table}?${new URLSearchParams(params)}`, {
    method, headers: {apikey:key, authorization:`Bearer ${key}`, 'content-type':'application/json', Prefer:'return=representation'},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return r.json();
}
const report = {verified:0, added:0, existing:0, targetsAdded:0, companies:{}};
for (const [board,company] of [['clara','Clara'],['opentable','OpenTable'],['appian','Appian']]) {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  if (!response.ok) throw new Error(`Board ${board}: ${response.status}`);
  const {jobs} = await response.json();
  for (const job of jobs.filter(j=>/mexico city|ciudad de m[eé]xico|cdmx/i.test(j.location.name))) {
    const applyUrl = new URL(job.absolute_url);
    if (applyUrl.protocol !== 'https:') throw new Error('Invalid official application URL');
    report.verified++; report.companies[company]=(report.companies[company]||0)+1;
    const [existing] = await api('jobs',{select:'id,status',source:'eq.Greenhouse',external_id:`eq.${board}:${job.id}`});
    if (existing) report.existing++;
    if (!write) continue;
    const id = existing?.id || randomUUID();
    if (!existing) {
      const description = job.content.replaceAll('&lt;','<').replaceAll('&gt;','>').replace(/<[^>]*>/g,' ').replaceAll('&amp;','&').replaceAll('&nbsp;',' ').replace(/\s+/g,' ').trim();
      await api('jobs',{},'POST',[{
        id,source:'Greenhouse',external_id:`${board}:${job.id}`,company,title:job.title,
        description,summary:description.slice(0,520),location:job.location.name,
        work_mode:/hybrid|h[ií]brido/i.test(job.title)?'Híbrido':null,
        contract_type:null,seniority:/junior|new grad|intern|entry|associate/i.test(job.title)?'Entry level':null,
        industry:job.departments?.[0]?.name||null,apply_mode:'external',status:'closed',published_at:null,
        application_capability:'external',application_provider:'external',
        metadata:{market_country:'MX',source_url:job.absolute_url,canonical_apply_url:job.absolute_url,
          official_company_board:true,job_board:board,verified_at:new Date().toISOString(),
          publication_date_unknown:true,source_updated_at:job.updated_at,import_batch:'mexico-city-2026-10-08'},
      }]);
      report.added++;
    }
    const targets=await api('job_application_targets',{select:'job_id',job_id:`eq.${id}`});
    if (!targets.length) {
      await api('job_application_targets',{},'POST',[{job_id:id,mode:'external',apply_url:job.absolute_url,metadata:{board_token:board,verified_at:new Date().toISOString()}}]);
      report.targetsAdded++;
    }
    if (!existing) await api('jobs',{id:`eq.${id}`},'PATCH',{status:'active'});
    // Do not reopen an existing record intentionally closed by another process.
  }
}
console.log(JSON.stringify({mode:write?'write':'dry-run',...report}));

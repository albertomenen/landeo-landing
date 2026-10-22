import type {Job} from "./fixtures";
import {remoteLocationEligibility} from "./job-location.ts";

export type SalaryRates={date:string;rates:Record<string,number>};
const MAX_RATE_AGE=7*86400000;
let pending:Promise<SalaryRates|null>|null=null;
let current:SalaryRates|null=null;
function validRates(value:unknown):value is SalaryRates{
  if(!value||typeof value!=="object")return false;
  const item=value as SalaryRates;
  return typeof item.date==="string"&&Number.isFinite(Date.parse(item.date))&&Date.now()-Date.parse(item.date)<MAX_RATE_AGE&&Date.parse(item.date)<Date.now()+86400000&&item.rates?.EUR===1;
}
export async function loadSalaryRates():Promise<SalaryRates|null>{
  if(current&&validRates(current))return current;
  if(pending)return pending;
  try{const saved=JSON.parse(window.localStorage.getItem("landeo-salary-rates-v1")||"null");if(validRates(saved)&&Date.now()-Date.parse(saved.date)<86400000){current=saved;return current}}catch{/* Optional public-rate cache. */}
  pending=(async()=>{
    try{
      const response=await fetch("https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,MXN,COP,CAD,BRL,INR,AUD,CHF,SEK,JPY,PLN,SGD,AED,ZAR,RON,HUF,DKK,NOK,NZD",{signal:AbortSignal.timeout(1200)});
      if(!response.ok)return null;
      const rows=await response.json() as Array<{date:string;quote:string;rate:number}>;
      if(!Array.isArray(rows)||!rows.length)return null;
      const result:SalaryRates={date:rows.map(row=>row.date).sort()[0],rates:{EUR:1}};
      for(const row of rows)if(Number.isFinite(row.rate)&&row.rate>0)result.rates[row.quote.toUpperCase()]=row.rate;
      if(!validRates(result))return null;
      current=result;try{window.localStorage.setItem("landeo-salary-rates-v1",JSON.stringify(result))}catch{/* Optional cache. */}
      return result;
    }catch{return null}finally{pending=null}
  })();
  return pending;
}

export function salaryAnnualEuros(job:Job,rates:SalaryRates|null):number|null{
  if(!rates||job.metadata?.salary_disclosed===false||job.metadata?.salary_estimated===true)return null;
  const minimum=job.salaryMin,maximum=job.salaryMax;
  if(!minimum||!Number.isFinite(minimum)||minimum<=0||(maximum!==null&&(!Number.isFinite(maximum)||maximum<minimum)))return null;
  const period=String(job.metadata?.salary_interval||"").toLowerCase();
  const multiplier=/^(year|yearly|annual|annually|per-year-salary|anual)$/.test(period)?1:
    /^(month|monthly|per-month-salary|mensual)$/.test(period)?12:
    /^(week|weekly|per-week-salary)$/.test(period)?52:0;
  const rate=rates.rates[String(job.salaryCurrency).toUpperCase()];
  if(!multiplier||!Number.isFinite(rate)||rate<=0)return null;
  return minimum*multiplier/rate;
}

export function prioritizeHighSalaryRemote(jobs:Job[],city:string,country:string,rates:SalaryRates|null){
  const bestMatch=Math.max(0,...jobs.map(job=>job.match));
  const highlights=jobs.filter(job=>job.workMode==="remote"&&job.match>=Math.max(75,bestMatch-15)&&remoteLocationEligibility(job,city,country)===true)
    .map(job=>({job,salary:salaryAnnualEuros(job,rates)}))
    .filter((item):item is {job:Job;salary:number}=>item.salary!==null)
    .sort((a,b)=>b.salary-a.salary||b.job.match-a.job.match).slice(0,3);
  const featured=new Set(highlights.map(item=>item.job.id));
  return [...highlights.map(({job})=>({...job,metadata:{...job.metadata,salary_featured:true}})),...jobs.filter(job=>!featured.has(job.id))];
}

import {BILLING_POLICY_VERSION} from "../supabase/functions/_shared/billing-policy.ts";

export type BillingAcceptance={version:string;termsAccepted:true;immediateStart:true};
export type BillingRequest={plan:"starter"|"pro"|"sprint";locale:"es"|"en";resolve:(value:BillingAcceptance|null)=>void};
let pending:Promise<BillingAcceptance|null>|null=null;
export function requestBillingAcceptance(plan:BillingRequest["plan"],locale:BillingRequest["locale"]){
  if(typeof window==="undefined")return Promise.resolve(null);
  if(pending)return pending;
  pending=new Promise<BillingAcceptance|null>((resolve,reject)=>{
    const event=new CustomEvent<BillingRequest>("landeo:billing-consent",{cancelable:true,detail:{plan,locale,resolve}});
    window.dispatchEvent(event);
    if(!event.defaultPrevented)reject(new Error(locale==="es"?"La confirmación de compra aún no está lista. Recarga la página e inténtalo de nuevo.":"Purchase confirmation is not ready yet. Reload the page and try again."));
  }).finally(()=>{pending=null});
  return pending;
}
export function acceptedBillingPolicy():BillingAcceptance{
  return {version:BILLING_POLICY_VERSION,termsAccepted:true,immediateStart:true};
}

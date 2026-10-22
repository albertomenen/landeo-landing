"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {acceptedBillingPolicy,type BillingRequest} from "../lib/billing-consent";
import {billingConsent,BILLING_POLICY_VERSION} from "../supabase/functions/_shared/billing-policy.ts";

export default function BillingConsent(){
  const [request,setRequest]=useState<BillingRequest|null>(null);
  const [terms,setTerms]=useState(false),[immediate,setImmediate]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const active=useRef<BillingRequest|null>(null);
  useEffect(()=>{
    const receive=(event:Event)=>{
      const detail=(event as CustomEvent<BillingRequest>).detail;
      if(!detail||typeof detail.resolve!=="function")return;
      event.preventDefault();
      active.current?.resolve(null);active.current=detail;
      setTerms(false);setImmediate(false);setRequest(detail);
    };
    window.addEventListener("landeo:billing-consent",receive);
    return ()=>{window.removeEventListener("landeo:billing-consent",receive);active.current?.resolve(null)};
  },[]);
  useEffect(()=>{if(request&&!dialog.current?.open)dialog.current?.showModal()},[request]);
  function close(accepted=false){active.current?.resolve(accepted?acceptedBillingPolicy():null);active.current=null;dialog.current?.close();setRequest(null)}
  if(!request)return null;
  const es=request.locale==="es",copy=billingConsent[request.locale];
  return createPortal(<dialog ref={dialog} className="billing-consent" aria-labelledby="billing-consent-title" onCancel={event=>{event.preventDefault();close()}}>
    <form onSubmit={event=>{event.preventDefault();if(terms&&immediate)close(true)}}>
      <button type="button" className="billing-consent-close" aria-label={es?"Cerrar":"Close"} onClick={()=>close()}>×</button>
      <span className="overline">LANDEO · {es?"ANTES DEL PAGO":"BEFORE PAYMENT"}</span>
      <h2 id="billing-consent-title">{es?"Tu suscripción, sin sorpresas":"Your subscription, clearly explained"}</h2>
      <p>{es?"Vas a continuar con el plan":"You’re continuing with the"} <strong>{request.plan.charAt(0).toUpperCase()+request.plan.slice(1)}</strong>{es?". Stripe te mostrará el importe final, los impuestos y la periodicidad antes de confirmar el pago.":" plan. Stripe will show the final amount, taxes and billing interval before you confirm payment."}</p>
      <div className="billing-consent-summary"><strong>{es?"Puedes cancelar la próxima renovación desde tu perfil.":"Cancel your next renewal from your profile."}</strong><p>{es?"Cancelar no solicita por sí solo un reembolso. Conservas tus derechos de desistimiento y por servicios defectuosos. No garantizamos entrevistas ni contratación.":"Cancellation alone does not request a refund. Your withdrawal and defective-service rights remain. Interviews and employment are not guaranteed."}</p></div>
      <nav aria-label={es?"Condiciones de compra":"Purchase conditions"}><a href={`/terms?lang=${request.locale}`} target="_blank" rel="noopener noreferrer">{es?"Términos":"Terms"} ↗</a><a href={`/refunds/${BILLING_POLICY_VERSION}?lang=${request.locale}`} target="_blank" rel="noopener noreferrer">{es?"Pagos y reembolsos":"Payments and refunds"} ↗</a></nav>
      <label><input type="checkbox" checked={terms} onChange={event=>setTerms(event.target.checked)} required/><span>{copy.terms}</span></label>
      <label><input type="checkbox" checked={immediate} onChange={event=>setImmediate(event.target.checked)} required/><span>{copy.immediate}</span></label>
      <small>{es?"Guardaremos la versión aceptada y la fecha para gestionar tu compra, independientemente de las cookies de analítica.":"We record the accepted version and date to administer your purchase, independently of analytics cookies."}</small>
      <div className="billing-consent-actions"><button type="button" className="button button-secondary" onClick={()=>close()}>{es?"Volver":"Back"}</button><button type="submit" className="button button-primary" disabled={!terms||!immediate}>{es?"Continuar a Stripe":"Continue to Stripe"} →</button></div>
    </form>
  </dialog>,document.body);
}

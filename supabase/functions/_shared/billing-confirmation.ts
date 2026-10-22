type Acceptance={id:string;user_id:string|null;locale:"es"|"en";plan:string;policy_version:string;consent_text:string;policy_snapshot:string;terms_snapshot:string;accepted_at:string;confirmation_sent_at:string|null};
export function confirmationText(acceptance:Acceptance,session:any,subscription:any,siteUrl:string){
  const es=acceptance.locale==="es";
  const price=subscription?.items?.data?.[0]?.price;
  function money(amount:number,currency:string){
    const format=new Intl.NumberFormat(es?"es-ES":"en-GB",{style:"currency",currency:currency.toUpperCase()});
    return format.format(amount/10**(format.resolvedOptions().maximumFractionDigits??2));
  }
  const first=typeof session.amount_total==="number"&&session.currency?money(session.amount_total,session.currency):(es?"Consulta el recibo de Stripe":"See your Stripe receipt");
  const recurring=price?.recurring;
  const interval=recurring?`${recurring.interval_count??1} ${recurring.interval}`:(es?"según el periodo contratado":"according to the purchased period");
  const regular=typeof price?.unit_amount==="number"&&price.currency?`${money(price.unit_amount,price.currency)} / ${interval}`:interval;
  const periodEnd=subscription?.current_period_end??subscription?.items?.data?.[0]?.current_period_end;
  const paid=session.payment_status==="paid"||session.payment_status==="no_payment_required";
  return [
    es?"Confirmación de tu suscripción Landeo":"Your Landeo subscription confirmation",
    `${es?"Plan":"Plan"}: ${acceptance.plan}`,
    `${es?"Referencia de compra":"Purchase reference"}: ${session.id}`,
    `${es?"Importe de este checkout":"This checkout amount"}: ${first}`,
    `${es?"Estado del pago":"Payment status"}: ${paid?(es?"Confirmado":"Confirmed"):(es?"Pendiente de confirmación; el acceso depende de su confirmación":"Awaiting confirmation; access depends on confirmation")}`,
    `${es?"Precio base recurrente (descuentos e impuestos según recibo)":"Recurring base price (discounts and taxes as shown on your receipt)"}: ${regular}`,
    ...(periodEnd?[`${es?"Fin del periodo actual":"Current period end"}: ${new Date(periodEnd*1000).toISOString()}`]:[]),
    es?"La renovación es automática hasta que la canceles. Puedes gestionarla desde Perfil → Gestionar suscripción en Stripe. Cancelar la renovación no solicita por sí solo un reembolso.":"Renewal is automatic until cancelled. Manage it through Profile → Manage subscription in Stripe. Cancelling renewal alone does not request a refund.",
    `${siteUrl}/app/profile`,
    `${es?"Aceptación registrada":"Acceptance recorded"}: ${acceptance.accepted_at} · ${acceptance.policy_version}`,
    acceptance.consent_text,
    acceptance.policy_snapshot,
    acceptance.terms_snapshot,
    es?"Conserva este email como copia de las condiciones aceptadas. Para desistimiento, incidencias o cobros: alberto@haired.app.":"Keep this email as a copy of the accepted conditions. For withdrawal, service issues or billing: alberto@haired.app.",
  ].join("\n\n");
}

export async function sendBillingConfirmation(admin:any,session:any,subscription:any){
  const acceptanceId=session.metadata?.billing_acceptance_id;
  if(!acceptanceId)return; // Historical purchases have no retroactive consent.
  const {data:acceptance,error}=await admin.from("billing_acceptances").select("*").eq("id",acceptanceId).maybeSingle();
  if(error||!acceptance)throw new Error("Billing acceptance unavailable.");
  if(acceptance.stripe_checkout_id!==session.id||acceptance.user_id!==(session.client_reference_id||session.metadata?.supabase_user_id))throw new Error("Billing acceptance does not match checkout.");
  if(acceptance.confirmation_sent_at)return;
  const {error:completedError}=await admin.from("billing_acceptances").update({stripe_subscription_id:subscription?.id??null,completed_at:new Date().toISOString()}).eq("id",acceptanceId);
  if(completedError)throw completedError;
  const {data:user,error:userError}=await admin.auth.admin.getUserById(acceptance.user_id);
  if(userError||!user?.user?.email)throw new Error("Billing confirmation recipient unavailable.");
  const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("RESEND_FROM_EMAIL");
  if(!key||!from)throw new Error("Billing confirmation email is not configured.");
  const result=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`billing-confirmation/${session.id}`},body:JSON.stringify({from,to:[user.user.email],subject:acceptance.locale==="es"?"Tu suscripción Landeo: condiciones y cancelación":"Your Landeo subscription: conditions and cancellation",text:confirmationText(acceptance,session,subscription,(Deno.env.get("SITE_URL")||"https://getlandeo.com").replace(/\/$/,""))})});
  if(!result.ok)throw new Error(`Billing confirmation email failed (${result.status}).`);
  const sent=await result.json();
  const {error:sentError}=await admin.from("billing_acceptances").update({confirmation_sent_at:new Date().toISOString(),confirmation_message_id:sent.id??null}).eq("id",acceptanceId);
  if(sentError)throw sentError;
}

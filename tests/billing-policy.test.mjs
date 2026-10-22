import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BILLING_POLICY_VERSION,billingPolicyText,validBillingConsent} from '../supabase/functions/_shared/billing-policy.ts';
import {confirmationText,sendBillingConfirmation} from '../supabase/functions/_shared/billing-confirmation.ts';
test('requires current explicit consents, not strings, old versions or implied usage',()=>{
  for(const value of [null,{},true,{version:BILLING_POLICY_VERSION,termsAccepted:true},{version:'old',termsAccepted:true,immediateStart:true},{version:BILLING_POLICY_VERSION,termsAccepted:'true',immediateStart:true}])assert.equal(validBillingConsent(value),false);
  assert.equal(validBillingConsent({version:BILLING_POLICY_VERSION,termsAccepted:true,immediateStart:true}),true);
});
test('both policies preserve withdrawal, defect and bank dispute rights',()=>{
  for(const locale of ['es','en'])assert.ok(billingPolicyText(locale).length>4000);
  const es=billingPolicyText('es');assert.match(es,/14 días/);assert.match(es,/No se cobra automáticamente todo el plan/);assert.match(es,/No es un requisito/);assert.match(es,/retroactivamente/);
});
test('confirmation contains actual checkout totals, consent and immutable contract copies',()=>{
  const acceptance={locale:'es',plan:'pro',policy_version:BILLING_POLICY_VERSION,accepted_at:'2026-10-21T10:00:00Z',consent_text:'CONSENT SNAPSHOT',policy_snapshot:'REFUND SNAPSHOT',terms_snapshot:'TERMS SNAPSHOT'};
  const text=confirmationText(acceptance,{id:'cs_test',amount_total:3499,currency:'eur',payment_status:'paid'},{items:{data:[{price:{unit_amount:3499,currency:'eur',recurring:{interval:'month',interval_count:1}}}]}},'https://getlandeo.com');
  for(const expected of ['34,99','cs_test','CONSENT SNAPSHOT','REFUND SNAPSHOT','TERMS SNAPSHOT','Confirmado','/app/profile'])assert.ok(text.includes(expected));
  assert.match(confirmationText(acceptance,{payment_status:'unpaid'},null,'https://getlandeo.com'),/Pendiente de confirmación/);
});
test('legacy and already-confirmed checkouts do not send duplicate emails',async()=>{
  await sendBillingConfirmation({},{});
  await sendBillingConfirmation({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'user',stripe_checkout_id:'cs',confirmation_sent_at:'date'}})})})})},{id:'cs',client_reference_id:'user',metadata:{billing_acceptance_id:'acceptance'}},{});
});
test('checkout is fail-closed, portal remains separate and evidence is server-only',async()=>{
  const checkout=await readFile(new URL('../supabase/functions/create-stripe-checkout/index.ts',import.meta.url),'utf8');
  assert.ok(checkout.indexOf('!validBillingConsent')<checkout.indexOf('stripeRequest("/customers"'));
  assert.match(checkout,/body.action!=="portal"/);assert.match(checkout,/acceptanceError\)throw/);assert.match(checkout,/billing_acceptance_id/);
  const schema=await readFile(new URL('../supabase/migrations/20261021120000_add_billing_acceptances.sql',import.meta.url),'utf8');
  assert.match(schema,/enable row level security/);assert.match(schema,/revoke all.*anon,authenticated/);assert.match(schema,/default now\(\)/);
});
test('email failure remains retryable and successful delivery records provider acceptance once',async()=>{
  const acceptance={id:'acceptance',user_id:'user',stripe_checkout_id:'cs',confirmation_sent_at:null,locale:'es',plan:'pro',policy_version:BILLING_POLICY_VERSION,consent_text:'consent',policy_snapshot:'refunds',terms_snapshot:'terms',accepted_at:'2026-10-21T10:00:00Z'};
  const updates=[];
  const admin={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:acceptance})})}),update:value=>({eq:async()=>{updates.push(value);return {error:null}}})}),auth:{admin:{getUserById:async()=>({data:{user:{email:'test@example.invalid'}}})}}};
  const oldFetch=globalThis.fetch,oldDeno=globalThis.Deno;
  globalThis.Deno={env:{get:key=>({RESEND_API_KEY:'test-only',RESEND_FROM_EMAIL:'Landeo <no-reply@example.invalid>',SITE_URL:'https://getlandeo.com'}[key])}};
  try{
    const session={id:'cs',client_reference_id:'user',metadata:{billing_acceptance_id:'acceptance'},amount_total:3499,currency:'eur',payment_status:'paid'};
    globalThis.fetch=async()=>new Response('{}',{status:503});
    await assert.rejects(()=>sendBillingConfirmation(admin,session,{}),/failed \(503\)/);
    assert.equal(updates.some(item=>item.confirmation_sent_at),false);
    globalThis.fetch=async(_url,options)=>{assert.equal(options.headers['Idempotency-Key'],'billing-confirmation/cs');assert.ok(JSON.parse(options.body).text.includes('refunds'));return new Response(JSON.stringify({id:'provider-message'}),{status:200})};
    await sendBillingConfirmation(admin,session,{});
    assert.equal(updates.at(-1).confirmation_message_id,'provider-message');
    assert.ok(updates.at(-1).confirmation_sent_at);
  }finally{globalThis.fetch=oldFetch;globalThis.Deno=oldDeno}
});

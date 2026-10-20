"use client";

import Link from "./SafeLink";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Brand} from "./Brand";
import {createSupabaseBrowserClient,getOAuthProviderAvailability,type OAuthProviderAvailability} from "../lib/supabase/client";
import {AUTH_EMAIL_CODE_LENGTH,authDestination,authErrorCategory,readableAuthError,safeAuthNext} from "../lib/auth-flow";
import {trackProductEvent} from "../lib/analytics";

const OAUTH_REDIRECT_TIMEOUT_MS=10_000;

export default function AuthCard({mode}:{mode:"login"|"signup"}){
  const[email,setEmail]=useState("");const[requestedEmail,setRequestedEmail]=useState("");
  const[code,setCode]=useState("");const[sent,setSent]=useState(false);
  const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  const[resendIn,setResendIn]=useState(0);const[inAppBrowser,setInAppBrowser]=useState(false);
  const[oauthProviders,setOauthProviders]=useState<OAuthProviderAvailability>({google:false,apple:false});
  const redirectTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const operation=useRef(false);
  const nextPath=()=>safeAuthNext(new URLSearchParams(window.location.search).get("next"),mode==="signup"?"/onboarding":"/app/jobs");
  const callback=()=>`${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;
  async function finishAccess(userId:string){
    let completed:boolean|null=null;
    try{
      const{data,error:profileError}=await createSupabaseBrowserClient().from("profiles").select("onboarding_completed_at").eq("id",userId).maybeSingle();
      if(!profileError)completed=Boolean(data?.onboarding_completed_at);
    }catch{/* A profile outage must not invalidate a successful sign-in. */}
    window.location.replace(authDestination(nextPath(),completed));
  }
  useEffect(()=>{
    let active=true;
    const authError=new URLSearchParams(window.location.search).get("error");
    trackProductEvent("auth_viewed",{mode,has_error:Boolean(authError)});
    if(authError){setError(readableAuthError(authError));trackProductEvent("auth_error_shown",{mode,reason:authErrorCategory(authError)})}
    setInAppBrowser(/Instagram|FBAN|FBAV|MicroMessenger|TikTok|LinkedInApp|\bLine\//i.test(navigator.userAgent));
    try{
      void createSupabaseBrowserClient().auth.getSession().then(({data})=>{
        if(active&&data.session){trackProductEvent("auth_existing_session",{mode});void finishAccess(data.session.user.id)}
      }).catch(()=>{/* The form remains available for retry. */});
    }catch{/* Configuration errors surface when submitting. */}
    const onPageShow=()=>{if(redirectTimer.current)clearTimeout(redirectTimer.current);operation.current=false;setLoading(false)};
    window.addEventListener("pageshow",onPageShow);
    return()=>{active=false;window.removeEventListener("pageshow",onPageShow);if(redirectTimer.current)clearTimeout(redirectTimer.current)};
    // eslint-disable-next-line react-hooks/exhaustive-deps -- This effect only initializes each auth page.
  },[mode]);
  useEffect(()=>{let active=true;void getOAuthProviderAvailability().then(value=>{if(active)setOauthProviders(value)});return()=>{active=false}},[]);
  useEffect(()=>{if(resendIn<=0)return;const timer=window.setTimeout(()=>setResendIn(value=>Math.max(0,value-1)),1000);return()=>window.clearTimeout(timer)},[resendIn]);
  async function sendEmailCode(){
    if(operation.current||resendIn>0)return;
    operation.current=true;setLoading(true);setError("");
    const address=(sent?requestedEmail:email).trim().toLowerCase();
    trackProductEvent("auth_email_submitted",{mode});
    try{
      const{error:authError}=await createSupabaseBrowserClient().auth.signInWithOtp({email:address,options:{emailRedirectTo:callback(),shouldCreateUser:mode==="signup"}});
      if(authError)throw authError;
      setRequestedEmail(address);setSent(true);setCode("");setResendIn(60);
      trackProductEvent("auth_link_sent",{mode});trackProductEvent("auth_code_sent",{mode});
    }catch(authError){
      const reason=authErrorCategory(authError);if(reason==="rate_limited")setResendIn(60);
      trackProductEvent("auth_submit_failed",{mode,reason});setError(readableAuthError(authError));
    }finally{operation.current=false;setLoading(false)}
  }
  async function verifyEmailCode(event:FormEvent){
    event.preventDefault();if(operation.current)return;
    if(!new RegExp(`^\\d{${AUTH_EMAIL_CODE_LENGTH}}$`).test(code)){setError(`Introduce los ${AUTH_EMAIL_CODE_LENGTH} dígitos del último correo.`);return}
    operation.current=true;setLoading(true);setError("");trackProductEvent("auth_code_submitted",{mode});
    try{
      const{data,error:authError}=await createSupabaseBrowserClient().auth.verifyOtp({email:requestedEmail,token:code,type:"email"});
      if(authError)throw authError;
      if(!data.session||!data.user)throw new Error("No se pudo establecer la sesión.");
      trackProductEvent("auth_code_verified",{mode});await finishAccess(data.user.id);
    }catch(authError){trackProductEvent("auth_code_failed",{mode,reason:authErrorCategory(authError)});setError(readableAuthError(authError))}
    finally{operation.current=false;setLoading(false)}
  }
  async function emailLogin(event:FormEvent){event.preventDefault();await sendEmailCode()}
  async function oauth(provider:"google"|"apple"){
    if(operation.current)return;operation.current=true;setLoading(true);setError("");
    try{
      trackProductEvent("auth_oauth_started",{mode,provider});
      const{data,error:authError}=await createSupabaseBrowserClient().auth.signInWithOAuth({provider,options:{redirectTo:callback(),skipBrowserRedirect:true}});
      if(authError)throw authError;if(!data.url)throw new Error("No hemos podido abrir el proveedor de acceso.");
      redirectTimer.current=setTimeout(()=>{operation.current=false;setLoading(false);setError("El proveedor está tardando en abrirse. Prueba en Chrome o Safari, o continúa con un código por email.")},OAUTH_REDIRECT_TIMEOUT_MS);
      window.location.assign(data.url);
    }catch(authError){trackProductEvent("auth_oauth_failed",{mode,provider,reason:authErrorCategory(authError)});operation.current=false;setLoading(false);setError(readableAuthError(authError))}
  }
  const hasOAuth=oauthProviders.google||oauthProviders.apple;
  return <main className="auth-page"><header><Brand/><Link href="/">Volver a inicio</Link></header><section className="auth-card">
    <span className="auth-icon">{mode==="login"?"↗":"✦"}</span><p className="overline">{mode==="login"?"TE DAMOS LA BIENVENIDA":"EMPIEZA GRATIS"}</p>
    <h1>{mode==="login"?"Vuelve a tus oportunidades.":"Crea tu perfil universal."}</h1>
    <p>{mode==="login"?"Accede con Google o con un código por email, sin contraseña.":"Explora y guarda empleos gratis. Solo pagarás si decides postularte."}</p>
    {inAppBrowser&&<p className="auth-browser-hint">Estás dentro del navegador de otra aplicación. Para usar Google, abre Landeo en Chrome o Safari desde el menú ⋮. También puedes acceder aquí con tu código por email.</p>}
    {sent?<div className="magic-sent" data-clarity-mask="true"><h2>Revisa tu correo</h2>
      <p role="status">Introduce el código de {AUTH_EMAIL_CODE_LENGTH} dígitos enviado a <strong>{requestedEmail}</strong>. Puedes consultar el correo en otra aplicación y volver aquí.</p>
      <form onSubmit={verifyEmailCode} aria-busy={loading}>
        <label htmlFor="auth-email-code">Código de acceso</label>
        <input id="auth-email-code" className="auth-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern={`[0-9]{${AUTH_EMAIL_CODE_LENGTH}}`} maxLength={AUTH_EMAIL_CODE_LENGTH} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,"").slice(0,AUTH_EMAIL_CODE_LENGTH))} placeholder="00000000" required autoFocus disabled={loading} aria-describedby="auth-code-help"/>
        <button className="button button-primary" type="submit" disabled={loading||code.length!==AUTH_EMAIL_CODE_LENGTH}>{loading?"Verificando…":"Verificar y continuar →"}</button>
      </form>
      <p id="auth-code-help">Usa el código del último correo. Revisa también la carpeta de spam. Si prefieres el enlace del correo, ábrelo en el navegador donde lo solicitaste.</p>
      <button className="button button-ghost" type="button" disabled={loading||resendIn>0} onClick={sendEmailCode}>{resendIn>0?`Reenviar en ${resendIn}s`:"Reenviar código"}</button>
      <button className="text-button" type="button" disabled={loading} onClick={()=>{setSent(false);setCode("");setError("")}}>Usar otro email</button>
    </div>:<form onSubmit={emailLogin} aria-busy={loading}>
      <label htmlFor="auth-email">Email</label><input id="auth-email" type="email" required autoComplete="email" disabled={loading} value={email} onChange={event=>setEmail(event.target.value)} placeholder="tu@email.com"/>
      <button className="button button-primary" type="submit" disabled={loading||resendIn>0}>{loading?"Enviando…":resendIn>0?`Espera ${resendIn}s`:"Recibir código por email →"}</button>
    </form>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    {hasOAuth&&<><div className="or"><span/>o<span/></div>{oauthProviders.google&&<button className="social-button" type="button" disabled={loading} onClick={()=>oauth("google")}><b>G</b>Continuar con Google</button>}{oauthProviders.apple&&<button className="social-button" type="button" disabled={loading} onClick={()=>oauth("apple")}><b></b>Continuar con Apple</button>}</>}
    <small>Al continuar aceptas los <Link href="/terms">Términos</Link> y la <Link href="/privacy">Política de privacidad</Link>.</small>
    <p className="auth-switch">{mode==="login"?"¿Aún no tienes cuenta?":"¿Ya tienes cuenta?"} <Link href={mode==="login"?"/signup":"/login"}>{mode==="login"?"Crear perfil":"Entrar"}</Link></p>
  </section></main>;
}

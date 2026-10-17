"use client";

import Link from "./SafeLink";
import {useEffect,useRef,useState} from "react";
import {Brand} from "./Brand";
import {createSupabaseBrowserClient,getOAuthProviderAvailability,type OAuthProviderAvailability} from "../lib/supabase/client";
import {trackProductEvent} from "../lib/analytics";

const OAUTH_REDIRECT_TIMEOUT_MS=10_000;

function readableAuthError(code:string){
  const normalized=code.toLowerCase();
  if(normalized.includes("otp_expired")||normalized.includes("expired"))return "El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo para continuar.";
  if(normalized.includes("bad_code_verifier")||normalized.includes("pkce"))return "Este acceso se abrió en otro navegador o dispositivo. Solicita un enlace nuevo y ábrelo en este mismo navegador.";
  if(normalized.includes("flow_state")||normalized.includes("invalid_request"))return "La solicitud de acceso ya no es válida. Introduce tu email para recibir un enlace nuevo.";
  if(normalized.includes("access_denied"))return "El acceso fue cancelado. Puedes intentarlo de nuevo.";
  if(normalized.includes("missing_code"))return "No se pudo validar este enlace. Solicita uno nuevo para continuar.";
  if(normalized.includes("configuration"))return "El acceso no está disponible temporalmente. Inténtalo de nuevo en unos minutos.";
  return "No hemos podido completar el acceso. Solicita un enlace nuevo e inténtalo de nuevo.";
}

function authErrorCategory(value:unknown){
  const normalized=(value instanceof Error?value.message:String(value)).toLowerCase();
  if(normalized.includes("expired")||normalized.includes("otp_expired"))return "expired";
  if(normalized.includes("pkce")||normalized.includes("code_verifier"))return "pkce";
  if(normalized.includes("rate")||normalized.includes("limit"))return "rate_limited";
  if(normalized.includes("network")||normalized.includes("fetch"))return "network";
  return "other";
}

export default function AuthCard({mode}:{mode:"login"|"signup"}){
  const[email,setEmail]=useState("");const[sent,setSent]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState("");const[resendIn,setResendIn]=useState(0);
  const[oauthProviders,setOauthProviders]=useState<OAuthProviderAvailability>({google:false,apple:false});
  const redirectTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    let active=true;
    const authError=new URLSearchParams(window.location.search).get("error");
    trackProductEvent("auth_viewed",{mode,has_error:Boolean(authError)});
    if(authError){setError(readableAuthError(authError));trackProductEvent("auth_error_shown",{mode,reason:authErrorCategory(authError)})}
    try{
      void createSupabaseBrowserClient().auth.getSession().then(({data})=>{
        if(active&&data.session){trackProductEvent("auth_existing_session",{mode});window.location.replace("/app/jobs")}
      }).catch(()=>{/* The form below will surface any actionable auth error. */});
    }catch{/* Missing configuration is handled when the user submits. */}
    return()=>{active=false;if(redirectTimer.current)clearTimeout(redirectTimer.current)};
  },[mode]);
  useEffect(()=>{let active=true;void getOAuthProviderAvailability().then(value=>{if(active)setOauthProviders(value)});return()=>{active=false}},[]);
  useEffect(()=>{if(resendIn<=0)return;const timer=window.setInterval(()=>setResendIn(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[resendIn]);
  const nextPath=()=>{
    const requested=new URLSearchParams(window.location.search).get("next");
    if(requested?.startsWith("/")&&!requested.startsWith("//"))return requested;
    return mode==="signup"?"/onboarding":"/app/jobs";
  };
  const callback=()=>`${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;
  async function sendEmailLink(){
    if(loading)return;
    setLoading(true);setError("");
    trackProductEvent("auth_email_submitted",{mode});
    try{
      const{error:authError}=await createSupabaseBrowserClient().auth.signInWithOtp({email,options:{emailRedirectTo:callback(),shouldCreateUser:mode==="signup"}});
      if(authError)throw authError;
      setSent(true);setResendIn(30);trackProductEvent("auth_link_sent",{mode});
    }catch(authError){
      trackProductEvent("auth_submit_failed",{mode,reason:authErrorCategory(authError)});
      setError(readableAuthError(authError instanceof Error?authError.message:"other"));
    }finally{setLoading(false)}
  }
  async function emailLogin(event:React.FormEvent){event.preventDefault();await sendEmailLink()}
  async function oauth(provider:"google"|"apple"){
    if(loading)return;
    setLoading(true);setError("");
    try{
      trackProductEvent("auth_oauth_started",{mode,provider});
      const{data,error:authError}=await createSupabaseBrowserClient().auth.signInWithOAuth({provider,options:{redirectTo:callback(),skipBrowserRedirect:true}});
      if(authError)throw authError;
      if(!data.url)throw new Error("No hemos podido abrir el proveedor de acceso.");
      redirectTimer.current=setTimeout(()=>{
        setLoading(false);
        setError("El acceso está tardando demasiado. Comprueba tu conexión e inténtalo de nuevo.");
      },OAUTH_REDIRECT_TIMEOUT_MS);
      window.location.assign(data.url);
    }catch(authError){
      trackProductEvent("auth_oauth_failed",{mode,provider,reason:authErrorCategory(authError)});
      setLoading(false);
      setError(readableAuthError(authError instanceof Error?authError.message:"other"));
    }
  }
  const hasOAuth=oauthProviders.google||oauthProviders.apple;
  return <main className="auth-page"><header><Brand/><Link href="/">Volver a inicio</Link></header><section className="auth-card"><span className="auth-icon">{mode==="login"?"↗":"✦"}</span><p className="overline">{mode==="login"?"TE DAMOS LA BIENVENIDA":"EMPIEZA GRATIS"}</p><h1>{mode==="login"?"Vuelve a tus oportunidades.":"Crea tu perfil universal."}</h1><p>{mode==="login"?"Accede para continuar donde lo dejaste.":"Explora y guarda empleos gratis. Solo pagarás si decides postularte."}</p>{sent?<div className="magic-sent" role="status"><b>✓</b><h2>Revisa tu correo</h2><p>Te hemos enviado un enlace seguro. Déjalo abierto y usa el enlace en este mismo navegador y dispositivo.</p><button className="button button-ghost" type="button" disabled={loading||resendIn>0} onClick={sendEmailLink}>{loading?"Enviando…":resendIn>0?`Podrás reenviarlo en ${resendIn}s`:"Reenviar enlace"}</button><button className="text-button" type="button" onClick={()=>{setSent(false);setError("")}}>Usar otro email</button></div>:<form onSubmit={emailLogin}><label>Email<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="tu@email.com"/></label><button className="button button-primary" type="submit" disabled={loading}>{loading?"Conectando…":"Continuar con email →"}</button></form>}{error&&<p className="form-error" role="alert">{error}</p>}{hasOAuth&&<><div className="or"><span/>o<span/></div>{oauthProviders.google&&<button className="social-button" disabled={loading} onClick={()=>oauth("google")}><b>G</b>Continuar con Google</button>}{oauthProviders.apple&&<button className="social-button" disabled={loading} onClick={()=>oauth("apple")}><b></b>Continuar con Apple</button>}</>}<small>Al continuar aceptas los <Link href="/terms">Términos</Link> y la <Link href="/privacy">Política de privacidad</Link>.</small><p className="auth-switch">{mode==="login"?"¿Aún no tienes cuenta?":"¿Ya tienes cuenta?"} <Link href={mode==="login"?"/signup":"/login"}>{mode==="login"?"Crear perfil":"Entrar"}</Link></p></section></main>
}

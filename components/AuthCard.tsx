"use client";

import Link from "./SafeLink";
import {useEffect,useRef,useState} from "react";
import {Brand} from "./Brand";
import {createSupabaseBrowserClient} from "../lib/supabase/client";

const OAUTH_REDIRECT_TIMEOUT_MS=10_000;

export default function AuthCard({mode}:{mode:"login"|"signup"}){
  const[email,setEmail]=useState("");const[sent,setSent]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  const redirectTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    let active=true;
    try{
      void createSupabaseBrowserClient().auth.getSession().then(({data})=>{
        if(active&&data.session)window.location.replace("/app/jobs");
      }).catch(()=>{/* The form below will surface any actionable auth error. */});
    }catch{/* Missing configuration is handled when the user submits. */}
    return()=>{active=false;if(redirectTimer.current)clearTimeout(redirectTimer.current)};
  },[]);
  const nextPath=()=>{
    const requested=new URLSearchParams(window.location.search).get("next");
    if(requested?.startsWith("/")&&!requested.startsWith("//"))return requested;
    return mode==="signup"?"/onboarding":"/app/jobs";
  };
  const callback=()=>`${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;
  async function emailLogin(event:React.FormEvent){
    event.preventDefault();
    if(loading)return;
    setLoading(true);setError("");
    try{
      const{error:authError}=await createSupabaseBrowserClient().auth.signInWithOtp({email,options:{emailRedirectTo:callback(),shouldCreateUser:mode==="signup"}});
      if(authError)throw authError;
      setSent(true);
    }catch(authError){
      setError(authError instanceof Error?authError.message:"No hemos podido iniciar sesión. Inténtalo de nuevo.");
    }finally{setLoading(false)}
  }
  async function oauth(provider:"google"|"apple"){
    if(loading)return;
    setLoading(true);setError("");
    try{
      const{data,error:authError}=await createSupabaseBrowserClient().auth.signInWithOAuth({provider,options:{redirectTo:callback(),skipBrowserRedirect:true}});
      if(authError)throw authError;
      if(!data.url)throw new Error("No hemos podido abrir el proveedor de acceso.");
      redirectTimer.current=setTimeout(()=>{
        setLoading(false);
        setError("El acceso está tardando demasiado. Comprueba tu conexión e inténtalo de nuevo.");
      },OAUTH_REDIRECT_TIMEOUT_MS);
      window.location.assign(data.url);
    }catch(authError){
      setLoading(false);
      setError(authError instanceof Error?authError.message:"No hemos podido abrir el acceso seguro. Inténtalo de nuevo.");
    }
  }
  return <main className="auth-page"><header><Brand/><Link href="/">Volver a inicio</Link></header><section className="auth-card"><span className="auth-icon">{mode==="login"?"↗":"✦"}</span><p className="overline">{mode==="login"?"TE DAMOS LA BIENVENIDA":"EMPIEZA GRATIS"}</p><h1>{mode==="login"?"Vuelve a tus oportunidades.":"Crea tu perfil universal."}</h1><p>{mode==="login"?"Accede para continuar donde lo dejaste.":"Explora y guarda empleos gratis. Solo pagarás si decides postularte."}</p>{sent?<div className="magic-sent" role="status"><b>✓</b><h2>Revisa tu correo</h2><p>Te hemos enviado un enlace seguro. Ábrelo en este dispositivo para continuar.</p><button className="text-button" onClick={()=>setSent(false)}>Usar otro email</button></div>:<form onSubmit={emailLogin}><label>Email<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="tu@email.com"/></label><button className="button button-primary" type="submit" disabled={loading}>{loading?"Conectando…":"Continuar con email →"}</button></form>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="or"><span/>o<span/></div><button className="social-button" disabled={loading} onClick={()=>oauth("google")}><b>G</b>Continuar con Google</button><button className="social-button" disabled={loading} onClick={()=>oauth("apple")}><b></b>Continuar con Apple</button><small>Al continuar aceptas los <Link href="/terms">Términos</Link> y la <Link href="/privacy">Política de privacidad</Link>.</small><p className="auth-switch">{mode==="login"?"¿Aún no tienes cuenta?":"¿Ya tienes cuenta?"} <Link href={mode==="login"?"/signup":"/login"}>{mode==="login"?"Crear perfil":"Entrar"}</Link></p></section></main>
}

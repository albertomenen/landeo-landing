"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {Brand} from "./Brand";
import {createSupabaseBrowserClient} from "../lib/supabase/client";

export default function AuthCard({mode}:{mode:"login"|"signup"}){
  const router=useRouter();const[email,setEmail]=useState("");const[sent,setSent]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  useEffect(()=>{void(async()=>{const{data}=await createSupabaseBrowserClient().auth.getSession();if(data.session)router.replace("/app/jobs")})()},[router]);
  const callback=()=>`${window.location.origin}/auth/callback?next=${encodeURIComponent(mode==="signup"?"/onboarding":"/app/jobs")}`;
  async function emailLogin(event:React.FormEvent){event.preventDefault();setLoading(true);setError("");const{error:authError}=await createSupabaseBrowserClient().auth.signInWithOtp({email,options:{emailRedirectTo:callback(),shouldCreateUser:mode==="signup"}});setLoading(false);if(authError){setError(authError.message);return}setSent(true)}
  async function oauth(provider:"google"|"apple"){setLoading(true);setError("");const{error:authError}=await createSupabaseBrowserClient().auth.signInWithOAuth({provider,options:{redirectTo:callback()}});if(authError){setLoading(false);setError(authError.message)}}
  return <main className="auth-page"><header><Brand/><Link href="/">Volver a inicio</Link></header><section className="auth-card"><span className="auth-icon">{mode==="login"?"↗":"✦"}</span><p className="overline">{mode==="login"?"TE DAMOS LA BIENVENIDA":"EMPIEZA GRATIS"}</p><h1>{mode==="login"?"Vuelve a tus oportunidades.":"Crea tu perfil universal."}</h1><p>{mode==="login"?"Accede para continuar donde lo dejaste.":"Explora y guarda empleos gratis. Solo pagarás si decides postularte."}</p>{sent?<div className="magic-sent" role="status"><b>✓</b><h2>Revisa tu correo</h2><p>Te hemos enviado un enlace seguro. Ábrelo en este dispositivo para continuar.</p><button className="text-button" onClick={()=>setSent(false)}>Usar otro email</button></div>:<form onSubmit={emailLogin}><label>Email<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="tu@email.com"/></label><button className="button button-primary" type="submit" disabled={loading}>{loading?"Conectando…":"Continuar con email →"}</button></form>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="or"><span/>o<span/></div><button className="social-button" disabled={loading} onClick={()=>oauth("google")}><b>G</b>Continuar con Google</button><button className="social-button" disabled={loading} onClick={()=>oauth("apple")}><b></b>Continuar con Apple</button><small>Al continuar aceptas los <Link href="/terms">Términos</Link> y la <Link href="/privacy">Política de privacidad</Link>.</small><p className="auth-switch">{mode==="login"?"¿Aún no tienes cuenta?":"¿Ya tienes cuenta?"} <Link href={mode==="login"?"/signup":"/login"}>{mode==="login"?"Crear perfil":"Entrar"}</Link></p></section></main>
}

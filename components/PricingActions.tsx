"use client";

import Link from "./SafeLink";
import {useState} from "react";
import {currentUser,startStripe} from "../lib/landeo";

export function PricingActions({plan="pro",label="Empezar con Pro",loadingLabel="Abriendo Stripe…",locale="es"}:{plan?:"starter"|"pro"|"sprint";label?:string;loadingLabel?:string;locale?:"es"|"en"}){
  const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  async function checkout(){setLoading(true);setError("");try{window.localStorage.setItem("landeo-selected-plan",plan);const user=await currentUser();if(!user){window.location.assign(`/signup?plan=${plan}`);return}await startStripe("checkout",plan)}catch(value){setError(value instanceof Error?value.message:(locale==="es"?"No se pudo iniciar Stripe.":"Stripe could not be opened."));setLoading(false)}}
  return <><button className="button button-primary" type="button" onClick={checkout} disabled={loading}>{loading?loadingLabel:`${label} →`}</button>{error&&<p className="form-error" role="alert">{error}</p>}<small>{locale==="es"?"Se activa tras la confirmación segura de Stripe.":"Activates after secure confirmation from Stripe."}</small><Link className="pricing-login" href="/login">{locale==="es"?"¿Ya tienes cuenta? Entrar":"Already have an account? Log in"}</Link></>
}

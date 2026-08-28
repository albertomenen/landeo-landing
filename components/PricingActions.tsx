"use client";

import Link from "next/link";
import {useState} from "react";
import {currentUser,startStripe} from "../lib/landeo";

export function PricingActions(){
  const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  async function checkout(){setLoading(true);setError("");try{const user=await currentUser();if(!user){window.location.assign("/signup");return}await startStripe("checkout")}catch(value){setError(value instanceof Error?value.message:"No se pudo iniciar Stripe.");setLoading(false)}}
  return <><button className="button button-primary" type="button" onClick={checkout} disabled={loading}>{loading?"Abriendo Stripe…":"Empezar con Pro →"}</button>{error&&<p className="form-error" role="alert">{error}</p>}<small>El acceso se activa tras la confirmación segura de Stripe.</small><Link className="pricing-login" href="/login">¿Ya tienes cuenta? Entrar</Link></>
}

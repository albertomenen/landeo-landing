"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {loadStripe} from "@stripe/stripe-js";

type Detail={clientSecret:string;publishableKey:string;locale:"es"|"en";resolve:(opened:boolean)=>void};

// Stripe Embedded Checkout inside a popup: the customer never leaves Landeo.
export default function StripeCheckoutModal(){
  const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(""),[ready,setReady]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),mount=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const receive=(event:Event)=>{
      const next=(event as CustomEvent<Detail>).detail;
      if(!next?.clientSecret||!next.publishableKey)return;
      event.preventDefault();setError("");setReady(false);setDetail(next);next.resolve(true);
    };
    window.addEventListener("landeo:stripe-embedded",receive);
    return ()=>window.removeEventListener("landeo:stripe-embedded",receive);
  },[]);
  useEffect(()=>{
    if(!detail)return;
    if(!dialog.current?.open)dialog.current?.showModal();
    let checkout:{mount:(el:HTMLElement)=>void;destroy:()=>void}|null=null,cancelled=false;
    (async()=>{
      try{
        const stripe=await loadStripe(detail.publishableKey,{locale:detail.locale});
        if(!stripe)throw new Error("Stripe.js unavailable");
        const instance=await stripe.initEmbeddedCheckout({clientSecret:detail.clientSecret});
        if(cancelled){instance.destroy();return}
        checkout=instance;if(mount.current)instance.mount(mount.current);setReady(true);
      }catch{if(!cancelled)setError(detail.locale==="es"?"No pudimos cargar el pago. Cierra esta ventana e inténtalo de nuevo.":"We couldn’t load checkout. Close this window and try again.")}
    })();
    return ()=>{cancelled=true;checkout?.destroy()};
  },[detail]);
  function close(){dialog.current?.close();setDetail(null)}
  if(!detail)return null;
  const es=detail.locale==="es";
  return createPortal(<dialog ref={dialog} className="stripe-popup" aria-label={es?"Pago seguro con Stripe":"Secure checkout with Stripe"} onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===dialog.current)close()}}>
    <button type="button" className="stripe-popup-close" aria-label={es?"Cerrar":"Close"} onClick={close}>×</button>
    {!ready&&!error&&<p className="stripe-popup-status">{es?"Cargando pago seguro…":"Loading secure checkout…"}</p>}
    {error&&<p className="stripe-popup-status" role="alert">{error}</p>}
    <div ref={mount}/>
  </dialog>,document.body);
}

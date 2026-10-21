"use client";

import {useEffect,useState} from "react";

export default function JobsLoading({locale,onRetry}:{locale:"es"|"en";onRetry:()=>void}){
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{
    const started=Date.now();
    const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);
    return ()=>window.clearInterval(timer);
  },[]);
  const es=locale==="es";
  return <div className="jobs-wait-card" aria-busy="true">
    <div className="jobs-wait-visual" aria-hidden="true">
      <div className="jobs-wait-sheet jobs-wait-sheet-back" />
      <div className="jobs-wait-sheet">
        <div className="jobs-wait-company"><i /><span><b /><b /></span></div>
        <div className="jobs-wait-lines"><i /><i /><i /></div>
        <div className="jobs-wait-tags"><i /><i /></div>
      </div>
      <span className="jobs-wait-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></span>
    </div>
    <div role="status" aria-live="polite" aria-atomic="true">
      <span className="jobs-wait-eyebrow">{es?"TU PRÓXIMA OPORTUNIDAD":"YOUR NEXT OPPORTUNITY"}</span>
      <h2>{elapsed>=12?(es?"Está tardando un poco más":"Taking a little longer"):(es?"Cargando tus oportunidades":"Loading your opportunities")}</h2>
      <p>{elapsed>=12?(es?"La búsqueda sigue en curso. No necesitas volver a iniciar sesión; las ofertas aparecerán aquí cuando termine.":"Your search is still running. You don’t need to sign in again; jobs will appear here when it finishes."):(es?"Estamos buscando ofertas para ti. Puedes quedarte en esta pantalla mientras llegan las primeras.":"We’re finding jobs for you. Stay on this screen while the first opportunities arrive.")}</p>
    </div>
    <div className="jobs-wait-rail" aria-hidden="true"><i /></div>
    <small>{es?"Las primeras ofertas se mostrarán en cuanto estén disponibles.":"The first jobs will appear as soon as they’re available."}</small>
    {elapsed>=25&&<button type="button" className="button button-secondary" onClick={onRetry}>{es?"Volver a cargar":"Reload jobs"}</button>}
  </div>;
}
